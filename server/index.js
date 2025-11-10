const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
let mysql;
try { mysql = require('mysql2/promise'); } catch {}

const app = express();
const PORT = process.env.PORT || 3020;
const DATA_FILE = path.join(__dirname, 'data.json');
// Clientes conectados via SSE
const sseClients = new Set();
// Pool MySQL (opcional)
const dbEnabled = Boolean(process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER && mysql);
let pool = null;
if (dbEnabled) {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
}

// CORS: aceitar qualquer porta localhost em desenvolvimento
// Em desenvolvimento, permita acesso de qualquer origem (navegadores na mesma rede)
app.use(cors({
  origin: (origin, callback) => callback(null, true)
}));
app.use(express.json({ limit: '8mb' }));

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(payload);
    } catch (e) {
      // Ignora erros de escrita em clientes desconectados
    }
  });
}

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Garante estrutura e semeadura do admin padrão em "users"
    if (!Array.isArray(parsed.users)) parsed.users = [];
    const hasAdmin = parsed.users.some(u => (u.usuario === 'admin' || u.username === 'admin') && u.papel === 'administrador');
    if (!hasAdmin) {
      const nextId = parsed.users.length ? Math.max(...parsed.users.map(x => Number(x.id) || 0)) + 1 : 1;
      parsed.users.push({ id: nextId, nome: 'Administrador', usuario: 'admin', senha: 'admin', papel: 'administrador', createdAt: new Date().toISOString() });
      // Persiste imediatamente para evitar inconsistência
      writeData(parsed);
    }
    return parsed;
  } catch (e) {
    return {
      config: { logoDataUrl: null, calendarSummary: 'Eventos', kitchenAvgMinutes: 25 },
      modules: {
        pms: true,
        pdv: true,
        estoque: true,
        eventos: true,
        financeiro: true,
        restaurante: true,
      },
      chat: [],
      orders: [],
      sales: [],
      inventory: [],
      events: [],
      transactions: [],
      rooms: [],
      users: [
        { id: 1, nome: 'Administrador', usuario: 'admin', senha: 'admin', papel: 'administrador', createdAt: new Date().toISOString() }
      ]
    };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/health', async (req, res) => {
  const health = { status: 'ok', db: { enabled: dbEnabled, connected: false } };
  if (dbEnabled && pool) {
    try {
      const [rows] = await pool.query('SELECT 1 AS ok');
      health.db.connected = Array.isArray(rows);
    } catch (e) {
      health.db.error = e.message;
    }
  }
  res.json(health);
});

// Redireciona a raiz para o endpoint de saúde da API
app.get('/', (req, res) => {
  res.redirect('/api/health');
});

// Stream de eventos (SSE) para atualizações em tempo real
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  // abre a conexão
  res.write(':ok\n\n');
  sseClients.add(res);
  const hb = setInterval(() => {
    try { res.write(':keepalive\n\n'); } catch (e) {}
  }, 20000);
  req.on('close', () => {
    clearInterval(hb);
    sseClients.delete(res);
  });
});

// Retorna o IP local da máquina (IPv4 não interno)
app.get('/api/host', (req, res) => {
  // Se PUBLIC_APP_URL estiver configurada, usa ela diretamente (ideal para produção)
  const publicUrl = process.env.PUBLIC_APP_URL && String(process.env.PUBLIC_APP_URL).trim();
  if (publicUrl) {
    return res.json({ ip: null, frontendPort: null, url: publicUrl });
  }

  // Caso contrário, tenta deduzir a URL pública a partir do request
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString();
  const host = (req.headers['x-forwarded-host'] || req.headers['host'] || '').toString();
  const derivedUrl = host ? `${proto}://${host}/` : null;

  // Também tenta detectar IP local para ambientes de desenvolvimento
  const nets = os.networkInterfaces();
  let ip = null;
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (
        isIPv4 &&
        !net.internal &&
        net.address !== '127.0.0.1' &&
        !/^169\./.test(net.address)
      ) {
        ip = net.address;
        break;
      }
    }
    if (ip) break;
  }

  res.json({ ip, frontendPort: 3070, url: derivedUrl || (ip ? `http://${ip}:3070/` : null) });
});

// Config (branding, logo etc.)
app.get('/api/config', (req, res) => {
  const data = readData();
  const defaults = {
    calendarSummary: 'Eventos',
    kitchenAvgMinutes: 25,
    msgNew: 'Recebemos seu pedido!\n{local}\nItens: {itens}\nTotal: R$ {total}\nHorário: {horario}\nPrevisão: ~ {previsao} min\nAcompanhe: {link}',
    msgAccepted: 'Pedido aceito ✅\nPrevisão: ~ {previsao} min\nAcompanhe: {link}',
    msgPreparing: 'Pedido em preparo 🍳\nRestante: ~ {restante} min\nAcompanhe: {link}',
    msgDelivered: 'Pedido entregue ✅\nBom apetite!'
  };
  const cfg = { ...defaults, ...(data.config || {}) };
  res.json(cfg);
});

app.put('/api/config', (req, res) => {
  const { logoDataUrl, calendarSummary, kitchenAvgMinutes, msgNew, msgAccepted, msgPreparing, msgDelivered, msgNewQuarto, msgNewMesa, msgAcceptedQuarto, msgAcceptedMesa, msgPreparingQuarto, msgPreparingMesa, msgDeliveredQuarto, msgDeliveredMesa } = req.body || {};
  const data = readData();
  data.config = {
    ...data.config,
    logoDataUrl: typeof logoDataUrl !== 'undefined' ? (logoDataUrl || null) : (data.config?.logoDataUrl || null),
    calendarSummary: typeof calendarSummary !== 'undefined' ? (String(calendarSummary || '').trim() || 'Eventos') : (data.config?.calendarSummary || 'Eventos'),
    kitchenAvgMinutes: typeof kitchenAvgMinutes !== 'undefined' ? (Number.isFinite(Number(kitchenAvgMinutes)) ? Math.max(5, Math.min(120, Number(kitchenAvgMinutes))) : (data.config?.kitchenAvgMinutes || 25)) : (data.config?.kitchenAvgMinutes || 25),
    msgNew: typeof msgNew !== 'undefined' ? String(msgNew || '') : (data.config?.msgNew),
    msgAccepted: typeof msgAccepted !== 'undefined' ? String(msgAccepted || '') : (data.config?.msgAccepted),
    msgPreparing: typeof msgPreparing !== 'undefined' ? String(msgPreparing || '') : (data.config?.msgPreparing),
    msgDelivered: typeof msgDelivered !== 'undefined' ? String(msgDelivered || '') : (data.config?.msgDelivered),
    msgNewQuarto: typeof msgNewQuarto !== 'undefined' ? String(msgNewQuarto || '') : (data.config?.msgNewQuarto),
    msgNewMesa: typeof msgNewMesa !== 'undefined' ? String(msgNewMesa || '') : (data.config?.msgNewMesa),
    msgAcceptedQuarto: typeof msgAcceptedQuarto !== 'undefined' ? String(msgAcceptedQuarto || '') : (data.config?.msgAcceptedQuarto),
    msgAcceptedMesa: typeof msgAcceptedMesa !== 'undefined' ? String(msgAcceptedMesa || '') : (data.config?.msgAcceptedMesa),
    msgPreparingQuarto: typeof msgPreparingQuarto !== 'undefined' ? String(msgPreparingQuarto || '') : (data.config?.msgPreparingQuarto),
    msgPreparingMesa: typeof msgPreparingMesa !== 'undefined' ? String(msgPreparingMesa || '') : (data.config?.msgPreparingMesa),
    msgDeliveredQuarto: typeof msgDeliveredQuarto !== 'undefined' ? String(msgDeliveredQuarto || '') : (data.config?.msgDeliveredQuarto),
    msgDeliveredMesa: typeof msgDeliveredMesa !== 'undefined' ? String(msgDeliveredMesa || '') : (data.config?.msgDeliveredMesa),
  };
  writeData(data);
  res.json({ ok: true, config: data.config });
});

// Módulos habilitados no dashboard
app.get('/api/modules', (req, res) => {
  const data = readData();
  res.json(data.modules || {});
});

app.put('/api/modules', (req, res) => {
  const payload = req.body || {};
  const allowed = ['pms', 'pdv', 'estoque', 'eventos', 'financeiro', 'restaurante'];
  const normalized = {};
  allowed.forEach(k => { normalized[k] = Boolean(payload[k]); });
  const data = readData();
  data.modules = { ...data.modules, ...normalized };
  writeData(data);
  res.json({ ok: true, modules: data.modules });
});

// Utilitário para registrar CRUD
function registerCrud(key) {
  // Listar todos
  app.get(`/api/${key}`, (req, res) => {
    const data = readData();
    res.json(data[key] || []);
  });

  // Obter por id
  app.get(`/api/${key}/:id`, (req, res) => {
    const data = readData();
    const id = String(req.params.id);
    const list = data[key] || [];
    const item = list.find(x => String(x.id) === id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    res.json(item);
  });

  // Criar
  app.post(`/api/${key}`, (req, res) => {
    const payload = req.body || {};
    const data = readData();
    const list = Array.isArray(data[key]) ? data[key] : [];
    const nextId = list.length ? Math.max(...list.map(x => Number(x.id) || 0)) + 1 : 1;
    const item = { id: nextId, ...payload, createdAt: new Date().toISOString() };
    list.push(item);
    data[key] = list;
    writeData(data);
    res.status(201).json(item);
    // Notifica clientes conectados
    broadcast({ resource: key, action: 'create', item });
  });

  // Atualizar
  app.put(`/api/${key}/:id`, (req, res) => {
    const payload = req.body || {};
    const data = readData();
    const id = String(req.params.id);
    const list = Array.isArray(data[key]) ? data[key] : [];
    const idx = list.findIndex(x => String(x.id) === id);
    if (idx === -1) return res.status(404).json({ error: 'not_found' });
    const updated = { ...list[idx], ...payload, updatedAt: new Date().toISOString() };
    list[idx] = updated;
    data[key] = list;
    writeData(data);
    res.json(updated);
    broadcast({ resource: key, action: 'update', item: updated });
  });

  // Remover
  app.delete(`/api/${key}/:id`, (req, res) => {
    const data = readData();
    const id = String(req.params.id);
    const list = Array.isArray(data[key]) ? data[key] : [];
    const next = list.filter(x => String(x.id) !== id);
    const removed = list.length - next.length;
    data[key] = next;
    writeData(data);
    res.json({ ok: true, removed });
    broadcast({ resource: key, action: 'delete', id });
  });
}

// Rotas MySQL para orders
if (dbEnabled && pool) {
  // LIST
  app.get('/api/orders', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT id, quarto, localEntrega, status, itens_json, horario, finalizado, total, createdAt, updatedAt FROM orders ORDER BY id ASC');
      const list = rows.map(r => ({
        id: r.id,
        pedidoId: r.id,
        quarto: r.quarto || '',
        localEntrega: r.localEntrega || '',
        status: r.status || 'pendente',
        itens: (() => { try { return JSON.parse(r.itens_json || '[]'); } catch { return []; } })(),
        horario: r.horario ? new Date(r.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date(r.createdAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        finalizado: Boolean(r.finalizado),
        total: Number(r.total || 0).toFixed(2),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  // GET BY ID
  app.get('/api/orders/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await pool.query('SELECT id, quarto, localEntrega, status, itens_json, horario, finalizado, total, createdAt, updatedAt FROM orders WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      const r = rows[0];
      const item = {
        id: r.id,
        pedidoId: r.id,
        quarto: r.quarto || '',
        localEntrega: r.localEntrega || '',
        status: r.status || 'pendente',
        itens: (() => { try { return JSON.parse(r.itens_json || '[]'); } catch { return []; } })(),
        horario: r.horario ? new Date(r.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date(r.createdAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        finalizado: Boolean(r.finalizado),
        total: Number(r.total || 0).toFixed(2),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  // CREATE
  app.post('/api/orders', async (req, res) => {
    try {
      const p = req.body || {};
      const itensJson = JSON.stringify(p.itens || []);
      const totalNum = Number(p.total || 0);
      // Tenta construir um DATETIME baseado no horário informado (HH:MM)
      let horarioDt = null;
      try {
        const now = new Date();
        const [hh, mm] = String(p.horario || '').split(':').map(x => Number(x));
        if (Number.isFinite(hh) && Number.isFinite(mm)) {
          now.setHours(hh, mm, 0, 0);
          horarioDt = now;
        }
      } catch {}
      const [result] = await pool.query(
        'INSERT INTO orders (quarto, localEntrega, status, itens_json, horario, finalizado, total, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [p.quarto || '', p.localEntrega || '', p.status || 'pendente', itensJson, horarioDt, Boolean(p.finalizado) ? 1 : 0, totalNum]
      );
      const id = result.insertId;
      const item = {
        id,
        pedidoId: id,
        quarto: p.quarto || '',
        localEntrega: p.localEntrega || '',
        status: p.status || 'pendente',
        itens: p.itens || [],
        horario: p.horario || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        finalizado: Boolean(p.finalizado),
        total: Number(totalNum || 0).toFixed(2),
      };
      res.status(201).json(item);
      broadcast({ resource: 'orders', action: 'create', item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  // UPDATE
  app.put('/api/orders/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const p = req.body || {};
      const fields = [];
      const values = [];
      if (typeof p.quarto !== 'undefined') { fields.push('quarto = ?'); values.push(p.quarto || ''); }
      if (typeof p.localEntrega !== 'undefined') { fields.push('localEntrega = ?'); values.push(p.localEntrega || ''); }
      if (typeof p.status !== 'undefined') { fields.push('status = ?'); values.push(p.status || 'pendente'); }
      if (typeof p.itens !== 'undefined') { fields.push('itens_json = ?'); values.push(JSON.stringify(p.itens || [])); }
      if (typeof p.finalizado !== 'undefined') { fields.push('finalizado = ?'); values.push(Boolean(p.finalizado) ? 1 : 0); }
      if (typeof p.total !== 'undefined') { fields.push('total = ?'); values.push(Number(p.total || 0)); }
      // horário opcional: converte HH:MM
      if (typeof p.horario !== 'undefined') {
        let horarioDt = null;
        try {
          const now = new Date();
          const [hh, mm] = String(p.horario || '').split(':').map(x => Number(x));
          if (Number.isFinite(hh) && Number.isFinite(mm)) { now.setHours(hh, mm, 0, 0); horarioDt = now; }
        } catch {}
        fields.push('horario = ?'); values.push(horarioDt);
      }
      fields.push('updatedAt = NOW()');
      if (!fields.length) return res.status(400).json({ error: 'no_fields' });
      const sql = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
      values.push(id);
      await pool.query(sql, values);
      // Retorna o registro atualizado
      const [rows] = await pool.query('SELECT id, quarto, localEntrega, status, itens_json, horario, finalizado, total, createdAt, updatedAt FROM orders WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      const r = rows[0];
      const item = {
        id: r.id,
        pedidoId: r.id,
        quarto: r.quarto || '',
        localEntrega: r.localEntrega || '',
        status: r.status || 'pendente',
        itens: (() => { try { return JSON.parse(r.itens_json || '[]'); } catch { return []; } })(),
        horario: r.horario ? new Date(r.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : new Date(r.createdAt || Date.now()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        finalizado: Boolean(r.finalizado),
        total: Number(r.total || 0).toFixed(2),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
      res.json(item);
      broadcast({ resource: 'orders', action: 'update', item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  // DELETE
  app.delete('/api/orders/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await pool.query('DELETE FROM orders WHERE id = ?', [id]);
      res.json({ ok: true, removed: 1 });
      broadcast({ resource: 'orders', action: 'delete', id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Rotas MySQL para sales
  // LIST
  app.get('/api/sales', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT id, itens_json, total, formaPagamento, quarto, comprador_nome, comprador_whatsapp, origem, data, createdAt, updatedAt FROM sales ORDER BY id DESC');
      const list = rows.map(r => ({
        id: r.id,
        itens: (() => { try { return JSON.parse(r.itens_json || '[]'); } catch { return []; } })(),
        total: Number(r.total || 0),
        formaPagamento: r.formaPagamento || '',
        quarto: r.quarto || null,
        comprador: { nome: r.comprador_nome || null, whatsapp: r.comprador_whatsapp || null },
        origem: r.origem || 'PDV',
        data: r.data || new Date().toISOString(),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
      res.json(list);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // GET BY ID
  app.get('/api/sales/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await pool.query('SELECT id, itens_json, total, formaPagamento, quarto, comprador_nome, comprador_whatsapp, origem, data, createdAt, updatedAt FROM sales WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      const r = rows[0];
      const item = {
        id: r.id,
        itens: (() => { try { return JSON.parse(r.itens_json || '[]'); } catch { return []; } })(),
        total: Number(r.total || 0),
        formaPagamento: r.formaPagamento || '',
        quarto: r.quarto || null,
        comprador: { nome: r.comprador_nome || null, whatsapp: r.comprador_whatsapp || null },
        origem: r.origem || 'PDV',
        data: r.data || new Date().toISOString(),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
      res.json(item);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // CREATE
  app.post('/api/sales', async (req, res) => {
    try {
      const p = req.body || {};
      const itensJson = JSON.stringify(p.itens || []);
      const totalNum = Number(p.total || 0);
      const comprador = p.comprador || {};
      const [result] = await pool.query(
        'INSERT INTO sales (itens_json, total, formaPagamento, quarto, comprador_nome, comprador_whatsapp, origem, data, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [itensJson, totalNum, p.formaPagamento || '', p.quarto || null, comprador.nome || null, comprador.whatsapp || null, p.origem || 'PDV', p.data || new Date().toISOString()]
      );
      const id = result.insertId;
      const item = {
        id,
        itens: p.itens || [],
        total: totalNum,
        formaPagamento: p.formaPagamento || '',
        quarto: p.quarto || null,
        comprador: { nome: comprador.nome || null, whatsapp: comprador.whatsapp || null },
        origem: p.origem || 'PDV',
        data: p.data || new Date().toISOString(),
      };
      res.status(201).json(item);
      broadcast({ resource: 'sales', action: 'create', item });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // UPDATE
  app.put('/api/sales/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const p = req.body || {};
      const fields = [];
      const values = [];
      if (typeof p.itens !== 'undefined') { fields.push('itens_json = ?'); values.push(JSON.stringify(p.itens || [])); }
      if (typeof p.total !== 'undefined') { fields.push('total = ?'); values.push(Number(p.total || 0)); }
      if (typeof p.formaPagamento !== 'undefined') { fields.push('formaPagamento = ?'); values.push(p.formaPagamento || ''); }
      if (typeof p.quarto !== 'undefined') { fields.push('quarto = ?'); values.push(p.quarto || null); }
      if (typeof p.comprador !== 'undefined') {
        const c = p.comprador || {};
        fields.push('comprador_nome = ?'); values.push(c.nome || null);
        fields.push('comprador_whatsapp = ?'); values.push(c.whatsapp || null);
      }
      if (typeof p.origem !== 'undefined') { fields.push('origem = ?'); values.push(p.origem || 'PDV'); }
      if (typeof p.data !== 'undefined') { fields.push('data = ?'); values.push(p.data || new Date().toISOString()); }
      fields.push('updatedAt = NOW()');
      if (!fields.length) return res.status(400).json({ error: 'no_fields' });
      const sql = `UPDATE sales SET ${fields.join(', ')} WHERE id = ?`;
      values.push(id);
      await pool.query(sql, values);
      const [rows] = await pool.query('SELECT id, itens_json, total, formaPagamento, quarto, comprador_nome, comprador_whatsapp, origem, data, createdAt, updatedAt FROM sales WHERE id = ?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      const r = rows[0];
      const item = {
        id: r.id,
        itens: (() => { try { return JSON.parse(r.itens_json || '[]'); } catch { return []; } })(),
        total: Number(r.total || 0),
        formaPagamento: r.formaPagamento || '',
        quarto: r.quarto || null,
        comprador: { nome: r.comprador_nome || null, whatsapp: r.comprador_whatsapp || null },
        origem: r.origem || 'PDV',
        data: r.data || new Date().toISOString(),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
      res.json(item);
      broadcast({ resource: 'sales', action: 'update', item });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
  // DELETE
  app.delete('/api/sales/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      await pool.query('DELETE FROM sales WHERE id = ?', [id]);
      res.json({ ok: true, removed: 1 });
      broadcast({ resource: 'sales', action: 'delete', id });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

// Registra CRUD para demais recursos (ou todos, se DB não habilitado)
const crudResources = dbEnabled ? ['inventory', 'events', 'transactions', 'rooms', 'chat', 'users'] : ['orders', 'sales', 'inventory', 'events', 'transactions', 'rooms', 'chat', 'users'];
crudResources.forEach(registerCrud);

app.listen(PORT, () => {
  console.log(`TechBox API server listening on http://localhost:${PORT}`);
});