const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
let mysql;
try { mysql = require('mysql2/promise'); } catch {}
const supabase = require('./supabaseClient');

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

// Helper para ler dados locais
function readDataLocal() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.users)) parsed.users = [];
    return parsed;
  } catch (e) {
    return { config: {}, modules: {}, users: [] };
  }
}

function writeDataLocal(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Helpers Supabase
async function sbList(table) {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('*').order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function sbGet(table, id) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

async function sbCreate(table, payload) {
  if (!supabase) return null;
  // Ajuste para snake_case se necessário, mas assumindo compatibilidade básica ou JSONB
  const { data, error } = await supabase.from(table).insert([payload]).select().single();
  if (error) throw error;
  return data;
}

async function sbUpdate(table, id, payload) {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function sbDelete(table, id) {
  if (!supabase) return null;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Config/Modules no Supabase (armazenados como chave-valor em app_settings)
async function sbGetSettings(category) {
  if (!supabase) return null;
  const { data } = await supabase.from('app_settings').select('data').eq('category', category).single();
  return data ? data.data : null;
}

async function sbUpdateSettings(category, newData) {
  if (!supabase) return null;
  // Upsert
  const { data, error } = await supabase.from('app_settings').upsert({ category, data: newData }, { onConflict: 'category' }).select();
  if (error) throw error;
  return newData;
}


// --- ROTAS ---

app.get('/api/health', async (req, res) => {
  const health = { status: 'ok', db: { enabled: dbEnabled, connected: false }, supabase: { enabled: !!supabase } };
  if (dbEnabled && pool) {
    try {
      const [rows] = await pool.query('SELECT 1 AS ok');
      health.db.connected = Array.isArray(rows);
    } catch (e) { health.db.error = e.message; }
  }
  res.json(health);
});

app.get('/', (req, res) => res.redirect('/api/health'));

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.write(':ok\n\n');
  sseClients.add(res);
  const hb = setInterval(() => { try { res.write(':keepalive\n\n'); } catch (e) {} }, 20000);
  req.on('close', () => { clearInterval(hb); sseClients.delete(res); });
});

app.get('/api/host', (req, res) => {
  const publicUrl = process.env.PUBLIC_APP_URL && String(process.env.PUBLIC_APP_URL).trim();
  if (publicUrl) return res.json({ ip: null, frontendPort: null, url: publicUrl });
  
  const nets = os.networkInterfaces();
  let ip = null;
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && net.address !== '127.0.0.1' && !/^169\./.test(net.address)) {
        ip = net.address;
        break;
      }
    }
    if (ip) break;
  }
  res.json({ ip, frontendPort: 3070, url: ip ? `http://${ip}:3070/` : null });
});

// --- Config ---
app.get('/api/config', async (req, res) => {
  if (supabase) {
    try {
      const data = await sbGetSettings('config');
      res.json(data || {});
    } catch { res.json({}); }
  } else {
    const data = readDataLocal();
    res.json(data.config || {});
  }
});

app.put('/api/config', async (req, res) => {
  const payload = req.body || {};
  if (supabase) {
    try {
      const current = await sbGetSettings('config') || {};
      const next = { ...current, ...payload };
      await sbUpdateSettings('config', next);
      res.json({ ok: true, config: next });
    } catch (e) { res.status(500).json({ error: e.message }); }
  } else {
    const data = readDataLocal();
    data.config = { ...(data.config || {}), ...payload };
    writeDataLocal(data);
    res.json({ ok: true, config: data.config });
  }
});

// --- Modules ---
app.get('/api/modules', async (req, res) => {
  if (supabase) {
    try {
      const data = await sbGetSettings('modules');
      res.json(data || {});
    } catch { res.json({}); }
  } else {
    const data = readDataLocal();
    res.json(data.modules || {});
  }
});

app.put('/api/modules', async (req, res) => {
  const payload = req.body || {};
  if (supabase) {
    try {
      const current = await sbGetSettings('modules') || {};
      const next = { ...current, ...payload };
      await sbUpdateSettings('modules', next);
      res.json({ ok: true, modules: next });
    } catch (e) { res.status(500).json({ error: e.message }); }
  } else {
    const data = readDataLocal();
    data.modules = { ...(data.modules || {}), ...payload };
    writeDataLocal(data);
    res.json({ ok: true, modules: data.modules });
  }
});

// --- Generic CRUD ---
function registerCrud(key) {
  app.get(`/api/${key}`, async (req, res) => {
    if (supabase) {
      try {
        const list = await sbList(key);
        // Supabase retorna snake_case, frontend espera camelCase em alguns casos
        // Para simplificar, assumimos que o banco usa camelCase ou frontend tolera.
        // Se a tabela tiver colunas JSONB, o JS dentro é preservado.
        res.json(list);
      } catch (e) { res.status(500).json({ error: e.message }); }
    } else if (dbEnabled && pool && (key === 'orders' || key === 'sales')) {
      // Fallback MySQL legado (simplificado)
       res.json([]); 
    } else {
      const data = readDataLocal();
      res.json(data[key] || []);
    }
  });

  app.get(`/api/${key}/:id`, async (req, res) => {
    const id = req.params.id;
    if (supabase) {
      try {
        const item = await sbGet(key, id);
        if (!item) return res.status(404).json({ error: 'not_found' });
        res.json(item);
      } catch (e) { res.status(500).json({ error: e.message }); }
    } else {
      const data = readDataLocal();
      const list = data[key] || [];
      const item = list.find(x => String(x.id) === String(id));
      if (!item) return res.status(404).json({ error: 'not_found' });
      res.json(item);
    }
  });

  app.post(`/api/${key}`, async (req, res) => {
    const payload = req.body || {};
    if (supabase) {
      try {
        // Remover ID se vier no payload para deixar o banco gerar
        const { id, ...rest } = payload;
        const item = await sbCreate(key, rest);
        res.status(201).json(item);
        broadcast({ resource: key, action: 'create', item });
      } catch (e) { res.status(500).json({ error: e.message }); }
    } else {
      const data = readDataLocal();
      const list = Array.isArray(data[key]) ? data[key] : [];
      const nextId = list.length ? Math.max(...list.map(x => Number(x.id) || 0)) + 1 : 1;
      const item = { id: nextId, ...payload, createdAt: new Date().toISOString() };
      list.push(item);
      data[key] = list;
      writeDataLocal(data);
      res.status(201).json(item);
      broadcast({ resource: key, action: 'create', item });
    }
  });

  app.put(`/api/${key}/:id`, async (req, res) => {
    const id = req.params.id;
    const payload = req.body || {};
    if (supabase) {
      try {
        const updated = await sbUpdate(key, id, payload);
        res.json(updated);
        broadcast({ resource: key, action: 'update', item: updated });
      } catch (e) { res.status(500).json({ error: e.message }); }
    } else {
      const data = readDataLocal();
      const list = Array.isArray(data[key]) ? data[key] : [];
      const idx = list.findIndex(x => String(x.id) === String(id));
      if (idx === -1) return res.status(404).json({ error: 'not_found' });
      const updated = { ...list[idx], ...payload, updatedAt: new Date().toISOString() };
      list[idx] = updated;
      data[key] = list;
      writeDataLocal(data);
      res.json(updated);
      broadcast({ resource: key, action: 'update', item: updated });
    }
  });

  app.delete(`/api/${key}/:id`, async (req, res) => {
    const id = req.params.id;
    if (supabase) {
      try {
        await sbDelete(key, id);
        res.json({ ok: true, removed: 1 });
        broadcast({ resource: key, action: 'delete', id });
      } catch (e) { res.status(500).json({ error: e.message }); }
    } else {
      const data = readDataLocal();
      const list = Array.isArray(data[key]) ? data[key] : [];
      const next = list.filter(x => String(x.id) !== String(id));
      data[key] = next;
      writeDataLocal(data);
      res.json({ ok: true, removed: 1 });
      broadcast({ resource: key, action: 'delete', id });
    }
  });
}

// Resources
const resources = ['orders', 'sales', 'inventory', 'events', 'transactions', 'rooms', 'chat', 'users'];
resources.forEach(registerCrud);

// Exportar app para Vercel Serverless
module.exports = app;

// Iniciar servidor apenas se executado diretamente (não via require)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}
