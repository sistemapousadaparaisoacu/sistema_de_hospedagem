import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api, Resources } from '../services/api';
import { Card, Badge, Button, ListGroup, Form, InputGroup, FormControl, Row, Col, Modal, Alert } from 'react-bootstrap';
import { limparNumero, gerarLinkWhatsApp } from '../utils/whatsapp';

const Cozinha = () => {
  const [pedidos, setPedidos] = useState([]);
  const [consulta, setConsulta] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroLocal, setFiltroLocal] = useState('todos');
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [pedidoParaAceitar, setPedidoParaAceitar] = useState(null);
  const [alertaPendente, setAlertaPendente] = useState(false);
  const prevIdsRef = useRef(new Set());
  const audioCtxRef = useRef(null);
  
  // Carregar pedidos e ouvir mudanças em tempo real (BroadcastChannel + storage)
  const broadcastRef = useRef(null);
  useEffect(() => {
    const carregarPedidos = () => {
      const pedidosDoStorage = JSON.parse(localStorage.getItem('pedidos_cozinha') || '[]');
      setPedidos(pedidosDoStorage);
      // Atualiza referência de IDs conhecida
      prevIdsRef.current = new Set(pedidosDoStorage.map(p => p.id));
    };

    // Inicialização
    carregarPedidos();

    // Carregar também do backend e sincronizar
    (async () => {
      try {
        const serverOrders = await api.list(Resources.Orders);
        if (Array.isArray(serverOrders)) {
          setPedidos(serverOrders);
          prevIdsRef.current = new Set(serverOrders.map(p => p.id));
          try {
            localStorage.setItem('pedidos_cozinha', JSON.stringify(serverOrders));
            broadcastRef.current?.postMessage({ type: 'SYNC_PEDIDOS', payload: serverOrders });
          } catch {}
        }
      } catch {
        // silencioso: mantém localStorage
      }
    })();

    // BroadcastChannel
    try {
      broadcastRef.current = new window.BroadcastChannel('pedidos_cozinha');
      broadcastRef.current.onmessage = (event) => {
        if (event?.data?.type === 'SYNC_PEDIDOS' && Array.isArray(event.data.payload)) {
          const payload = event.data.payload;
          // Detecta novos pendentes
          const novosPendentes = payload.filter(p => p.status === 'pendente' && !prevIdsRef.current.has(p.id));
          if (novosPendentes.length > 0) {
            try { emitirAlertaSonora(); } catch {}
            setAlertaPendente(true);
            setTimeout(() => setAlertaPendente(false), 3000);
          }
          setPedidos(payload);
          prevIdsRef.current = new Set(payload.map(p => p.id));
        }
      };
    } catch (e) {
      // fallback silencioso
    }

    // Listener de storage
    const onStorage = (e) => {
      if (e.key === 'pedidos_cozinha') {
        try {
          const data = JSON.parse(e.newValue || '[]');
          if (Array.isArray(data)) {
            // Detecta novos pendentes
            const novosPendentes = data.filter(p => p.status === 'pendente' && !prevIdsRef.current.has(p.id));
            if (novosPendentes.length > 0) {
              try { emitirAlertaSonora(); } catch {}
              setAlertaPendente(true);
              setTimeout(() => setAlertaPendente(false), 3000);
            }
            setPedidos(data);
            prevIdsRef.current = new Set(data.map(p => p.id));
          } else {
            setPedidos([]);
            prevIdsRef.current = new Set();
          }
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('storage', onStorage);
      if (broadcastRef.current) {
        try { broadcastRef.current.close(); } catch {}
      }
    };
  }, []);

  // SSE: escuta eventos do backend para manter pedidos sincronizados em tempo real
  useEffect(() => {
    let es;
    try {
      const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
      es = new EventSource(`${base}/stream`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg && msg.resource === 'orders') {
            if (msg.action === 'create' && msg.item) {
              setPedidos(prev => {
                const exists = prev.some(p => String(p.id) === String(msg.item.id));
                const next = exists ? prev.map(p => (String(p.id) === String(msg.item.id) ? msg.item : p)) : [...prev, msg.item];
                // alerta para novos pendentes
                const isNewPending = msg.item.status === 'pendente' && !prevIdsRef.current.has(msg.item.id);
                if (isNewPending) {
                  try { emitirAlertaSonora(); } catch {}
                  setAlertaPendente(true);
                  setTimeout(() => setAlertaPendente(false), 3000);
                }
                // sincroniza caches locais
                try {
                  localStorage.setItem('pedidos_cozinha', JSON.stringify(next));
                  broadcastRef.current?.postMessage({ type: 'SYNC_PEDIDOS', payload: next });
                } catch {}
                prevIdsRef.current = new Set(next.map(p => p.id));
                return next;
              });
            } else if (msg.action === 'update' && msg.item) {
              setPedidos(prev => {
                const next = prev.map(p => (String(p.id) === String(msg.item.id) ? msg.item : p));
                try {
                  localStorage.setItem('pedidos_cozinha', JSON.stringify(next));
                  broadcastRef.current?.postMessage({ type: 'SYNC_PEDIDOS', payload: next });
                } catch {}
                prevIdsRef.current = new Set(next.map(p => p.id));
                return next;
              });
            } else if (msg.action === 'delete' && msg.id) {
              setPedidos(prev => {
                const next = prev.filter(p => String(p.id) !== String(msg.id));
                try {
                  localStorage.setItem('pedidos_cozinha', JSON.stringify(next));
                  broadcastRef.current?.postMessage({ type: 'SYNC_PEDIDOS', payload: next });
                } catch {}
                prevIdsRef.current = new Set(next.map(p => p.id));
                return next;
              });
            }
          }
        } catch {}
      };
    } catch {}
    return () => { try { es && es.close(); } catch {} };
  }, []);
  
  // Função para atualizar o status de um pedido
  const atualizarStatus = (id, novoStatus) => {
    // Atualizar no estado local
    setPedidos(pedidos.map(pedido => 
      pedido.id === id ? { ...pedido, status: novoStatus } : pedido
    ));
    
    // Atualizar também no localStorage para sincronizar com o Restaurante
    const pedidosDoStorage = JSON.parse(localStorage.getItem('pedidos_cozinha') || '[]');
    const pedidosAtualizados = pedidosDoStorage.map(pedido => 
      pedido.id === id ? { ...pedido, status: novoStatus } : pedido
    );
    localStorage.setItem('pedidos_cozinha', JSON.stringify(pedidosAtualizados));
    try {
      broadcastRef.current?.postMessage({ type: 'SYNC_PEDIDOS', payload: pedidosAtualizados });
    } catch {}
    // Atualizar no backend
    try {
      const atual = pedidosAtualizados.find(p => p.id === id);
      if (atual) api.update(Resources.Orders, id, { ...atual, status: novoStatus }).catch(() => {});
    } catch {}
    // Notificar WhatsApp para status que não usam confirmação/modal
    try {
      const atual = pedidosAtualizados.find(p => p.id === id);
      if (atual) enviarWhatsAppStatus(atual, novoStatus);
    } catch {}
  };

  // Número de WhatsApp manual (override opcional)
  const [numeroWhatsApp, setNumeroWhatsApp] = useState('');

  // Fechar/Finalizar pedido: marca como finalizado e oculta das listas
  const finalizarPedido = (id) => {
    // Atualiza no estado local
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, finalizado: true } : p));

    // Atualiza também no localStorage
    const pedidosDoStorage = JSON.parse(localStorage.getItem('pedidos_cozinha') || '[]');
    const pedidosAtualizados = pedidosDoStorage.map(p => p.id === id ? { ...p, finalizado: true } : p);
    localStorage.setItem('pedidos_cozinha', JSON.stringify(pedidosAtualizados));
    try { broadcastRef.current?.postMessage({ type: 'SYNC_PEDIDOS', payload: pedidosAtualizados }); } catch {}
    // Atualiza backend
    try {
      const atual = pedidosAtualizados.find(p => p.id === id);
      if (atual) api.update(Resources.Orders, id, atual).catch(() => {});
    } catch {}
  };

  const obterUsuarioAtual = () => {
    try {
      const u = JSON.parse(localStorage.getItem('auth_user') || 'null');
      return u;
    } catch {
      return null;
    }
  };

  const registrarStatus = (id, novoStatus) => {
    const usuario = obterUsuarioAtual();
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const pedidosDoStorage = JSON.parse(localStorage.getItem('pedidos_cozinha') || '[]');
    const pedidosAtualizados = pedidosDoStorage.map(pedido => {
      if (pedido.id === id) {
        const atualizado = { ...pedido, status: novoStatus };
        if (novoStatus === 'aceito') {
          atualizado.aceitoPor = usuario?.usuario || usuario?.nome || 'cozinha';
          atualizado.aceitoEm = agora;
        }
        if (novoStatus === 'preparando') {
          atualizado.preparandoPor = usuario?.usuario || usuario?.nome || 'cozinha';
          atualizado.preparandoEm = agora;
        }
        return atualizado;
      }
      return pedido;
    });
    localStorage.setItem('pedidos_cozinha', JSON.stringify(pedidosAtualizados));
    try {
      broadcastRef.current?.postMessage({ type: 'SYNC_PEDIDOS', payload: pedidosAtualizados });
    } catch {}
    // Atualizar no backend com campos de auditoria
    try {
      const atual = pedidosAtualizados.find(p => p.id === id);
      if (atual) api.update(Resources.Orders, id, atual).catch(() => {});
    } catch {}
    // Notificar WhatsApp
    try {
      const atual = pedidosAtualizados.find(p => p.id === id);
      if (atual) enviarWhatsAppStatus(atual, novoStatus);
    } catch {}
    setPedidos(prev => prev.map(p => {
      if (p.id === id) {
        const atualizado = { ...p, status: novoStatus };
        if (novoStatus === 'aceito') {
          atualizado.aceitoPor = usuario?.usuario || usuario?.nome || 'cozinha';
          atualizado.aceitoEm = agora;
        }
        if (novoStatus === 'preparando') {
          atualizado.preparandoPor = usuario?.usuario || usuario?.nome || 'cozinha';
          atualizado.preparandoEm = agora;
        }
        return atualizado;
      }
      return p;
    }));
  };

  const abrirConfirmacaoAceite = (pedido) => {
    setPedidoParaAceitar(pedido);
    setMostrarConfirmacao(true);
  };

  const confirmarAceite = () => {
    if (!pedidoParaAceitar) return;
    registrarStatus(pedidoParaAceitar.id, 'aceito');
    setMostrarConfirmacao(false);
    setPedidoParaAceitar(null);
  };

  const cancelarAceite = () => {
    setMostrarConfirmacao(false);
    setPedidoParaAceitar(null);
  };

  const emitirAlertaSonora = () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      o.start(now);
      o.stop(now + 0.25);
      setTimeout(() => {
        try { g.disconnect(); o.disconnect(); } catch {}
      }, 300);
    } catch {}
  };

  // WhatsApp: obter principal e enviar mensagem
  const obterWhatsAppPrincipalDoQuarto = (quartoNome) => {
    try {
      const quartosLS = JSON.parse(localStorage.getItem('pms_quartos') || '[]');
      const q = quartosLS.find((x) => x && x.nome === quartoNome);
      const numero = q?.whatsappPrincipal || (q?.hospedes || []).find(h => h && h.whatsapp)?.whatsapp || '';
      return numero;
    } catch {
      return '';
    }
  };

  // Máscara visual para WhatsApp
  const formatWhatsAppMask = (raw) => {
    const d = limparNumero(raw);
    if (!d) return '';
    if (d.startsWith('55')) {
      const rest = d.slice(2);
      const ddd = rest.slice(0, 2);
      const num = rest.slice(2);
      if (!ddd) return '55';
      if (!num) return `55 ${ddd}`;
      if (num.length <= 4) return `55 ${ddd} ${num}`;
      if (num.length <= 8) return `55 ${ddd} ${num.slice(0, num.length - 4)}-${num.slice(-4)}`;
      return `55 ${ddd} ${num.slice(0, 5)}-${num.slice(5, 9)}`;
    }
    const ddd = d.slice(0, 2);
    const num = d.slice(2);
    if (!ddd) return d;
    if (!num) return ddd;
    if (num.length <= 4) return `${ddd} ${num}`;
    if (num.length <= 8) return `${ddd} ${num.slice(0, num.length - 4)}-${num.slice(-4)}`;
    return `${ddd} ${num.slice(0, 5)}-${num.slice(5, 9)}`;
  };

  const enviarWhatsAppStatus = async (pedido, novoStatus) => {
    try {
      const override = limparNumero(numeroWhatsApp);
      if (numeroWhatsApp && (!override.startsWith('55') || override.length < 12)) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: 'Número de WhatsApp inválido. Use 55 + DDD + número.' } }));
        return;
      }
      const numero = override || (pedido?.whatsappPrincipal) || obterWhatsAppPrincipalDoQuarto(pedido?.quarto);
      const limpo = limparNumero(numero);
      const titulo = `Pedido #${pedido.id} • ${pedido.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} ${pedido.quarto}`;
      const itens = (pedido.itens || []).join(', ');
      const cfg = (() => { try { return JSON.parse(localStorage.getItem('cliente_config') || '{}'); } catch { return {}; } })();
      const base = Number(cfg?.kitchenAvgMinutes) || 25;
      const extra = Math.min(20, (pedido?.itens || []).length * 4);
      const totalPrev = base + extra;
      // calcular restante se preparando
      let restanteMin = null;
      if (novoStatus === 'preparando') {
        const startedStr = pedido?.preparandoEm || pedido?.aceitoEm;
        let restante = totalPrev;
        if (startedStr) {
          const [hh, mm] = String(startedStr).split(':').map(x => parseInt(x, 10));
          const start = new Date(); start.setHours(hh || 0, mm || 0, 0, 0);
          const now = new Date();
          const diffMin = Math.max(0, Math.round((now - start) / 60000));
          restante = Math.max(5, totalPrev - diffMin);
        }
        restanteMin = restante;
      }
      let publicUrl = null;
      try {
        const host = await api.getHost();
        if (host?.ip) {
          const originObj = new URL(window.location.origin);
          const port = originObj.port || host?.frontendPort || '';
          publicUrl = `http://${host.ip}${port ? `:${port}` : ''}`;
        } else {
          publicUrl = host?.url || null;
        }
        if (publicUrl) { try { localStorage.setItem('public_app_url', publicUrl); } catch {} }
      } catch {}
      if (!publicUrl) { try { publicUrl = localStorage.getItem('public_app_url') || null; } catch {} }
      const baseUrl = (publicUrl || window.location.origin).replace(/\/+$/, '');
      const pedidoIdLink = pedido?.id ?? pedido?.pedidoId;
      const linkTracking = `${baseUrl}/track?pedido=${encodeURIComponent(pedidoIdLink || '')}`;
      const tplAcceptedBase = cfg?.msgAccepted || 'Pedido aceito ✅\nPrevisão: ~ {previsao} min\nAcompanhe: {link}';
      const tplPreparingBase = cfg?.msgPreparing || 'Pedido em preparo 🍳\nRestante: ~ {restante} min\nAcompanhe: {link}';
      const tplDeliveredBase = cfg?.msgDelivered || 'Pedido entregue ✅\nBom apetite!';
      const isQuarto = pedido?.localEntrega === 'quarto';
      const tpl = (novoStatus === 'aceito') ? (isQuarto ? (cfg?.msgAcceptedQuarto || tplAcceptedBase) : (cfg?.msgAcceptedMesa || tplAcceptedBase))
        : (novoStatus === 'preparando') ? (isQuarto ? (cfg?.msgPreparingQuarto || tplPreparingBase) : (cfg?.msgPreparingMesa || tplPreparingBase))
        : (novoStatus === 'entregue') ? (isQuarto ? (cfg?.msgDeliveredQuarto || tplDeliveredBase) : (cfg?.msgDeliveredMesa || tplDeliveredBase))
        : `Status: ${novoStatus}`;
      const formatTemplate = (template, data) => {
        try {
          const tpl = String(template || '');
          return tpl.replace(/\{(\w+)\}/g, (_, key) => {
            const val = data[key];
            return typeof val === 'undefined' || val === null ? '' : String(val);
          });
        } catch { return String(template || ''); }
      };
      const responsavel = (novoStatus === 'aceito') ? (pedido?.aceitoPor)
        : (novoStatus === 'preparando') ? (pedido?.preparandoPor)
        : (novoStatus === 'entregue') ? (obterUsuarioAtual()?.usuario || obterUsuarioAtual()?.nome || 'cozinha')
        : '';
      const body = formatTemplate(tpl, {
        previsao: totalPrev,
        restante: restanteMin,
        link: linkTracking,
        numeroPedido: pedido?.id || pedido?.pedidoId,
        responsavel
      });
      const msg = `${titulo}\n${body}\nItens: ${itens}\nTotal: R$ ${pedido.total}\nHorário: ${pedido.horario}`;
      const url = gerarLinkWhatsApp(limpo, msg);
      if (url) window.open(url, '_blank');
    } catch {}
  };

  const obterDadosQuartoPorNome = (nomeQuarto) => {
    try {
      const dados = JSON.parse(localStorage.getItem('pms_quartos') || '[]');
      return dados.find(q => q.nome === nomeQuarto) || null;
    } catch (e) {
      return null;
    }
  };
  
  // Função para obter a classe de cor do status
  const getStatusClass = (status) => {
    switch(status) {
      case 'pendente': return 'secondary';
      case 'aceito': return 'info';
      case 'preparando': return 'warning';
      case 'entregue': return 'success';
      default: return 'secondary';
    }
  };

  // Filtros de pesquisa
  const aplicaFiltros = (pedido) => {
    // Oculta pedidos finalizados (fechados)
    if (pedido.finalizado) return false;
    const texto = consulta.trim().toLowerCase();

    const passaStatus = filtroStatus === 'todos' || pedido.status === filtroStatus;
    const passaLocal = filtroLocal === 'todos' || pedido.localEntrega === filtroLocal;
    const passaBusca =
      texto === '' ||
      String(pedido.id).includes(texto) ||
      (pedido.quarto && pedido.quarto.toLowerCase().includes(texto)) ||
      pedido.itens.join(' ').toLowerCase().includes(texto);

    return passaStatus && passaLocal && passaBusca;
  };

  const pedidosFiltrados = useMemo(() => pedidos.filter(aplicaFiltros), [pedidos, consulta, filtroStatus, filtroLocal]);

  const contagem = useMemo(() => ({
    total: pedidosFiltrados.length,
    pendentes: pedidosFiltrados.filter(p => p.status === 'pendente').length,
    aceitos: pedidosFiltrados.filter(p => p.status === 'aceito').length,
    preparando: pedidosFiltrados.filter(p => p.status === 'preparando').length,
    entregues: pedidosFiltrados.filter(p => p.status === 'entregue').length,
  }), [pedidosFiltrados]);
  
  return (
    <div className="container-fluid mt-4 cozinha-dashboard">
      {alertaPendente && (
        <Alert variant="warning" className="mb-2">
          Novo pedido pendente recebido!
        </Alert>
      )}
      <div className="d-flex justify-content-between align-items-center mb-3 dashboard-header">
        <h2 className="mb-0">Cozinha • Painel de Pedidos</h2>
        <Badge bg="secondary">{contagem.total} pedidos</Badge>
      </div>

      {/* Métricas no estilo do layout solicitado */}
      {(() => {
        const metricas = {
          pedidosHoje: contagem.total,
          quartosAtendidos: new Set(pedidosFiltrados.map(p => p.quarto)).size,
          tempoMedio: 25,
          avaliacao: 4.8,
        };
        return (
          <Row className="mb-4 g-3 stats-row">
            <Col md={3} sm={6} xs={12}>
              <Card className="shadow-sm stats-card metric-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Pedidos Hoje</span>
                    <Badge bg="secondary">{metricas.pedidosHoje}</Badge>
                  </div>
                  <h4 className="mt-2 mb-0">Total</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Card className="shadow-sm stats-card metric-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Quartos Atendidos</span>
                    <Badge bg="info">{metricas.quartosAtendidos}</Badge>
                  </div>
                  <h4 className="mt-2 mb-0">Hoje</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Card className="shadow-sm stats-card metric-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Tempo Médio</span>
                    <Badge bg="warning">{metricas.tempoMedio} min</Badge>
                  </div>
                  <h4 className="mt-2 mb-0">Preparo</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3} sm={6} xs={12}>
              <Card className="shadow-sm stats-card metric-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Avaliação</span>
                    <Badge bg="success">{metricas.avaliacao}</Badge>
                  </div>
                  <h4 className="mt-2 mb-0">Média</h4>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        );
      })()}

      {/* Filtros e busca */}
      <Row className="mb-4 g-3">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>Buscar</InputGroup.Text>
            <FormControl
              placeholder="Por #id, quarto/mesa ou item"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="todos">Status: Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="aceito">Aceitos</option>
            <option value="preparando">Preparando</option>
            <option value="entregue">Entregues</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select value={filtroLocal} onChange={(e) => setFiltroLocal(e.target.value)}>
            <option value="todos">Entrega: Todos</option>
            <option value="quarto">Quarto</option>
            <option value="mesa">Mesa</option>
          </Form.Select>
        </Col>
      </Row>

      <div className="row mb-4">
        <div className="col-md-3">
          <Card className="shadow-sm">
            <Card.Header className="bg-secondary text-white">
              <h5 className="mb-0">Pedidos Pendentes</h5>
            </Card.Header>
            <Card.Body>
              {pedidosFiltrados.filter(p => p.status === 'pendente').length === 0 ? (
                <p className="text-muted text-center">Nenhum pedido pendente</p>
              ) : (
                pedidosFiltrados
                  .filter(p => p.status === 'pendente')
                  .map(pedido => (
                    <Card key={pedido.id} className="mb-3">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>Pedido #{pedido.id}</span>
                        <Badge bg={getStatusClass(pedido.status)}>
                          {pedido.status === 'pendente' ? 'Pendente' : ''}
                        </Badge>
                      </Card.Header>
                      <Card.Body>
                        <p><strong>Local:</strong> {pedido.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {pedido.quarto}</p>
                        <p><strong>Horário:</strong> {pedido.horario}</p>
                        {(() => { const dq = obterDadosQuartoPorNome(pedido.quarto); return dq ? (
                          <>
                            {(dq.checkIn || dq.checkInHora) && (<p className="text-muted small mb-1">Check-in: {dq.checkIn || '-'} {dq.checkInHora || ''}</p>)}
                            {(dq.checkOut || dq.checkOutHora) && (<p className="text-muted small mb-1">Check-out: {dq.checkOut || '-'} {dq.checkOutHora || ''}</p>)}
                            {dq.formaPagamento && (<p className="text-muted small">Pagamento: {dq.formaPagamento}</p>)}
                          </>
                        ) : null; })()}
                        <ListGroup variant="flush" className="mb-3">
                          {pedido.itens.map((item, idx) => (
                            <ListGroup.Item key={idx}>{item}</ListGroup.Item>
                          ))}
                        </ListGroup>
                        {pedido.observacoes && (
                          <p><strong>Obs:</strong> {pedido.observacoes}</p>
                        )}
                        <div className="d-flex gap-2 mb-2">
                          <input
                            type="tel"
                            className="form-control"
                            placeholder="Ex.: 55 22 99999-0000"
                            value={numeroWhatsApp}
                            onChange={(e) => setNumeroWhatsApp(formatWhatsAppMask(e.target.value))}
                          />
                          
                          <Button
                            variant="outline-success"
                            className="w-100"
                            onClick={() => enviarWhatsAppStatus(pedido, pedido.status)}
                          >
                            WhatsApp
                          </Button>
                        </div>
                        <small className="text-muted d-block mt-1">Use 55 + DDD + número. Ex.: 55 22 99999-0000.</small>
                        <Button 
                          variant="info" 
                          className="w-100"
                          onClick={() => abrirConfirmacaoAceite(pedido)}
                        >
                          Aceitar Pedido
                        </Button>
                      </Card.Body>
                    </Card>
                  ))
              )}
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card className="shadow-sm">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">Pedidos Aceitos</h5>
            </Card.Header>
            <Card.Body>
              {pedidosFiltrados.filter(p => p.status === 'aceito').length === 0 ? (
                <p className="text-muted text-center">Nenhum pedido aceito</p>
              ) : (
                pedidosFiltrados
                  .filter(p => p.status === 'aceito')
                  .map(pedido => (
                    <Card key={pedido.id} className="mb-3">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>Pedido #{pedido.id}</span>
                        <Badge bg={getStatusClass(pedido.status)}>
                          {pedido.status === 'aceito' ? 'Aceito' : ''}
                        </Badge>
                      </Card.Header>
                      <Card.Body>
                        <p><strong>Local:</strong> {pedido.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {pedido.quarto}</p>
                        <p><strong>Horário:</strong> {pedido.horario}</p>
                        {(() => { const dq = obterDadosQuartoPorNome(pedido.quarto); return dq ? (
                          <>
                            {(dq.checkIn || dq.checkInHora) && (<p className="text-muted small mb-1">Check-in: {dq.checkIn || '-'} {dq.checkInHora || ''}</p>)}
                            {(dq.checkOut || dq.checkOutHora) && (<p className="text-muted small mb-1">Check-out: {dq.checkOut || '-'} {dq.checkOutHora || ''}</p>)}
                            {dq.formaPagamento && (<p className="text-muted small">Pagamento: {dq.formaPagamento}</p>)}
                          </>
                        ) : null; })()}
                        <ListGroup variant="flush" className="mb-3">
                          {pedido.itens.map((item, idx) => (
                            <ListGroup.Item key={idx}>{item}</ListGroup.Item>
                          ))}
                        </ListGroup>
                        {pedido.observacoes && (
                          <p><strong>Obs:</strong> {pedido.observacoes}</p>
                        )}
                        <div className="d-flex gap-2 mb-2">
                          <input
                            type="tel"
                            className="form-control"
                            placeholder="Ex.: 55 22 99999-0000"
                            value={numeroWhatsApp}
                            onChange={(e) => setNumeroWhatsApp(formatWhatsAppMask(e.target.value))}
                          />
                          <Button
                            variant="outline-success"
                            className="w-100"
                            onClick={() => enviarWhatsAppStatus(pedido, pedido.status)}
                          >
                            WhatsApp
                          </Button>
                        </div>
                        <small className="text-muted d-block mt-1">Use 55 + DDD + número. Ex.: 55 22 99999-0000.</small>
                        <Button 
                          variant="warning" 
                          className="w-100"
                          onClick={() => registrarStatus(pedido.id, 'preparando')}
                        >
                          Iniciar Preparo
                        </Button>
                      </Card.Body>
                    </Card>
                  ))
              )}
            </Card.Body>
          </Card>
        </div>
        
        <div className="col-md-3">
          <Card className="shadow-sm">
            <Card.Header className="bg-warning text-white">
              <h5 className="mb-0">Pedidos em Preparo</h5>
            </Card.Header>
            <Card.Body>
              {pedidosFiltrados.filter(p => p.status === 'preparando').length === 0 ? (
                <p className="text-muted text-center">Nenhum pedido em preparo</p>
              ) : (
                pedidosFiltrados
                  .filter(p => p.status === 'preparando')
                  .map(pedido => (
                    <Card key={pedido.id} className="mb-3">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>Pedido #{pedido.id}</span>
                        <Badge bg={getStatusClass(pedido.status)}>
                          {pedido.status === 'preparando' ? 'Preparando' : ''}
                        </Badge>
                      </Card.Header>
                      <Card.Body>
                        <p><strong>Local:</strong> {pedido.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {pedido.quarto}</p>
                        <p><strong>Horário:</strong> {pedido.horario}</p>
                        {(() => { const dq = obterDadosQuartoPorNome(pedido.quarto); return dq ? (
                          <>
                            {(dq.checkIn || dq.checkInHora) && (<p className="text-muted small mb-1">Check-in: {dq.checkIn || '-'} {dq.checkInHora || ''}</p>)}
                            {(dq.checkOut || dq.checkOutHora) && (<p className="text-muted small mb-1">Check-out: {dq.checkOut || '-'} {dq.checkOut || ''}</p>)}
                            {dq.formaPagamento && (<p className="text-muted small">Pagamento: {dq.formaPagamento}</p>)}
                          </>
                        ) : null; })()}
                        <ListGroup variant="flush" className="mb-3">
                          {pedido.itens.map((item, idx) => (
                            <ListGroup.Item key={idx}>{item}</ListGroup.Item>
                          ))}
                        </ListGroup>
                        {pedido.observacoes && (
                          <p><strong>Obs:</strong> {pedido.observacoes}</p>
                        )}
                        <div className="d-flex gap-2 mb-2">
                          <input
                            type="tel"
                            className="form-control"
                            placeholder="Ex.: 55 22 99999-0000"
                            value={numeroWhatsApp}
                            onChange={(e) => setNumeroWhatsApp(formatWhatsAppMask(e.target.value))}
                          />
                          <Button
                            variant="outline-success"
                            className="w-100"
                            onClick={() => enviarWhatsAppStatus(pedido, pedido.status)}
                          >
                            WhatsApp
                          </Button>
                        </div>
                        <small className="text-muted d-block mt-1">Use 55 + DDD + número. Ex.: 55 22 99999-0000.</small>
                        <Button 
                          variant="success" 
                          className="w-100"
                          onClick={() => atualizarStatus(pedido.id, 'entregue')}
                        >
                          Marcar como Entregue
                        </Button>
                      </Card.Body>
                    </Card>
                  ))
              )}
            </Card.Body>
          </Card>
        </div>
        
        <div className="col-md-3">
          <Card className="shadow-sm">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">Pedidos Entregues</h5>
            </Card.Header>
            <Card.Body>
              {pedidosFiltrados.filter(p => p.status === 'entregue').length === 0 ? (
                <p className="text-muted text-center">Nenhum pedido entregue</p>
              ) : (
                pedidosFiltrados
                  .filter(p => p.status === 'entregue')
                  .map(pedido => (
                    <Card key={pedido.id} className="mb-3">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>Pedido #{pedido.id}</span>
                        <Badge bg={getStatusClass(pedido.status)}>
                          {pedido.status === 'entregue' ? 'Entregue' : ''}
                        </Badge>
                      </Card.Header>
                      <Card.Body>
                        <p><strong>Local:</strong> {pedido.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {pedido.quarto}</p>
                        <p><strong>Horário:</strong> {pedido.horario}</p>
                        {(() => { const dq = obterDadosQuartoPorNome(pedido.quarto); return dq ? (
                          <>
                            {(dq.checkIn || dq.checkInHora) && (<p className="text-muted small mb-1">Check-in: {dq.checkIn || '-'} {dq.checkInHora || ''}</p>)}
                            {(dq.checkOut || dq.checkOutHora) && (<p className="text-muted small mb-1">Check-out: {dq.checkOut || '-'} {dq.checkOutHora || ''}</p>)}
                            {dq.formaPagamento && (<p className="text-muted small">Pagamento: {dq.formaPagamento}</p>)}
                          </>
                        ) : null; })()}
                        <ListGroup variant="flush" className="mb-3">
                          {pedido.itens.map((item, idx) => (
                            <ListGroup.Item key={idx}>{item}</ListGroup.Item>
                          ))}
                        </ListGroup>
                        {pedido.observacoes && (
                          <p><strong>Obs:</strong> {pedido.observacoes}</p>
                        )}
                        <div className="d-flex gap-2 mb-2">
                          <Button
                            variant="outline-success"
                            className="w-100"
                            onClick={() => enviarWhatsAppStatus(pedido, pedido.status)}
                          >
                            WhatsApp
                          </Button>
                        </div>
                        <Button 
                          variant="danger" 
                          className="w-100"
                          onClick={() => finalizarPedido(pedido.id)}
                        >
                          Pedido finalizado
                        </Button>
                      </Card.Body>
                    </Card>
                  ))
              )}
            </Card.Body>
          </Card>
        </div>
      </div>
      <Modal show={mostrarConfirmacao} onHide={cancelarAceite} centered>
      <Modal.Header closeButton>
        <Modal.Title>Confirmar Aceite</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {pedidoParaAceitar ? (
          <div>
            <p>Deseja aceitar o pedido #{pedidoParaAceitar.id}?</p>
            <p><strong>Local:</strong> {pedidoParaAceitar.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {pedidoParaAceitar.quarto}</p>
          </div>
        ) : (
          <p>Carregando pedido...</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={cancelarAceite}>Cancelar</Button>
        <Button variant="info" onClick={confirmarAceite}>Aceitar</Button>
      </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Cozinha;