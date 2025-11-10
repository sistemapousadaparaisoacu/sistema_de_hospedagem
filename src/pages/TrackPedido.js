import React, { useEffect, useMemo, useState } from 'react';
import { api, Resources } from '../services/api';

const TrackPedido = () => {
  const [pedido, setPedido] = useState(null);
  const [status, setStatus] = useState('');

  const pedidoId = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      const id = url.searchParams.get('pedido');
      return id ? (isNaN(Number(id)) ? String(id) : Number(id)) : null;
    } catch { return null; }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // tenta backend primeiro
        try {
          const serverItem = await api.get(Resources.Orders, String(pedidoId));
          if (serverItem && serverItem.id) {
            setPedido(serverItem);
            setStatus(serverItem.status || '');
          }
        } catch {
          const pedidos = JSON.parse(localStorage.getItem('pedidos_cozinha') || '[]');
          const p = pedidos.find(x => String(x.id) === String(pedidoId));
          setPedido(p || null);
          setStatus(p?.status || '');
        }
      } catch {}
    };
    load();
    const timer = setInterval(load, 5000);
    const onStorage = (e) => {
      if (e.key === 'pedidos_cozinha') load();
    };
    window.addEventListener('storage', onStorage);
    // SSE: atualiza status em tempo real do pedido
    let es;
    (async () => {
      try {
        const base = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('api_base')) || 'http://localhost:3020/api';
        es = new EventSource(`${base}/stream`);
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg && msg.resource === 'orders') {
              if (msg.action === 'update' && msg.item && String(msg.item.id) === String(pedidoId)) {
                setPedido(msg.item);
                setStatus(msg.item.status || '');
              } else if (msg.action === 'create' && msg.item && String(msg.item.id) === String(pedidoId)) {
                setPedido(msg.item);
                setStatus(msg.item.status || '');
              } else if (msg.action === 'delete' && String(msg.id) === String(pedidoId)) {
                setStatus('');
              }
            }
          } catch {}
        };
      } catch {}
    })();
    let bc = null;
    try {
      bc = new window.BroadcastChannel('pedidos_cozinha');
      bc.onmessage = (event) => {
        if (event?.data?.type === 'SYNC_PEDIDOS' && Array.isArray(event.data.payload)) {
          const p = event.data.payload.find(x => String(x.id) === String(pedidoId));
          setPedido(p || null);
          setStatus(p?.status || '');
        }
      };
    } catch {}
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(timer);
      try { bc && bc.close(); } catch {}
      if (es) { try { es.close(); } catch {} }
    };
  }, [pedidoId]);

  // Config: tempo médio da cozinha
  const [config, setConfig] = useState({ kitchenAvgMinutes: 25 });
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await api.getConfig();
        if (mounted) setConfig({ kitchenAvgMinutes: Number(cfg?.kitchenAvgMinutes) || 25 });
      } catch {
        try {
          const savedCfg = JSON.parse(localStorage.getItem('cliente_config') || '{}');
          if (mounted) setConfig({ kitchenAvgMinutes: Number(savedCfg?.kitchenAvgMinutes) || 25 });
        } catch {}
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!pedidoId) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">Link inválido. Falta parâmetro "pedido".</div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="container mt-4">
        <div className="card">
          <div className="card-header"><strong>Acompanhar Pedido</strong></div>
          <div className="card-body">
            <p className="mb-2">Buscando pedido #{String(pedidoId)}...</p>
            <p className="text-muted">Se você acabou de fazer o pedido, aguarde alguns segundos e atualize.</p>
          </div>
        </div>
      </div>
    );
  }

  const etapas = [
    { key: 'pendente', label: 'Pendente' },
    { key: 'aceito', label: 'Aceito' },
    { key: 'preparando', label: 'Em preparo' },
    { key: 'entregue', label: 'Entregue' },
  ];

  const etapaIndex = etapas.findIndex(e => e.key === status);

  // Estimativas e progresso
  const parseHHMM = (hhmm) => {
    try {
      const [hh, mm] = String(hhmm).split(':').map(x => parseInt(x, 10));
      const d = new Date(); d.setHours(hh || 0, mm || 0, 0, 0); return d;
    } catch { return null; }
  };
  const itensLen = (pedido?.itens || []).length;
  const extra = Math.min(20, itensLen * 4);
  const totalPrev = (Number(config.kitchenAvgMinutes) || 25) + extra;
  let restanteMin = null;
  if (status === 'preparando' || status === 'aceito') {
    const startStr = pedido?.preparandoEm || pedido?.aceitoEm;
    const start = parseHHMM(startStr);
    if (start) {
      const now = new Date();
      const diffMin = Math.max(0, Math.round((now - start) / 60000));
      restanteMin = Math.max(0, totalPrev - diffMin);
    } else {
      restanteMin = totalPrev;
    }
  }
  const progressPct = (() => {
    if (status === 'pendente') return 5;
    if (status === 'aceito') return 25;
    if (status === 'preparando') {
      const startStr = pedido?.preparandoEm || pedido?.aceitoEm;
      const start = parseHHMM(startStr);
      if (start) {
        const now = new Date();
        const diffMin = Math.max(0, Math.round((now - start) / 60000));
        return Math.min(95, Math.round((diffMin / Math.max(1, totalPrev)) * 100));
      }
      return 35;
    }
    if (status === 'entregue') return 100;
    return 0;
  })();

  return (
    <div className="container mt-4">
      <div className="page-header mb-3 text-center"><h2 className="m-0">Acompanhar Pedido #{pedido.id}</h2></div>
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-7 col-xl-6">
          <div className="card mb-3">
            <div className="card-header"><strong>Status</strong></div>
            <div className="card-body">
              <div className="progress" style={{ height: 10 }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${progressPct}%` }} aria-valuenow={progressPct} aria-valuemin="0" aria-valuemax="100"></div>
              </div>
              <div className="mt-2 small">
                <span className="me-3">Previsão total: ~ {totalPrev} min</span>
                {typeof restanteMin === 'number' && <span>Restante: ~ {Math.max(0, Math.round(restanteMin))} min</span>}
              </div>
              <div className="d-flex gap-2 flex-wrap justify-content-center">
                {etapas.map((e) => (
                  <span
                    key={e.key}
                    className={`badge status-badge status-${e.key} ${status === e.key ? '' : 'status-inactive'}`}
                  >
                    {e.label}
                  </span>
                ))}
              </div>
              {status === 'entregue' && (
                <div className="alert alert-success mt-3" role="status" aria-live="polite">
                  Pedido finalizado e entregue.
                </div>
              )}
              <div className="mt-2 text-muted small">
                {pedido.aceitoEm && <span className="me-3">Aceito: {pedido.aceitoEm} {pedido.aceitoPor ? `• por ${pedido.aceitoPor}` : ''}</span>}
                {pedido.preparandoEm && <span className="me-3">Início preparo: {pedido.preparandoEm} {pedido.preparandoPor ? `• por ${pedido.preparandoPor}` : ''}</span>}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><strong>Detalhes</strong></div>
            <div className="card-body">
              <p className="mb-1"><strong>Local:</strong> {pedido.localEntrega === 'quarto' ? 'Quarto' : 'Mesa'} {pedido.quarto}</p>
              <p className="mb-1"><strong>Itens:</strong> {(pedido.itens || []).join(', ')}</p>
              <p className="mb-1"><strong>Total:</strong> R$ {pedido.total}</p>
              <p className="mb-1"><strong>Horário:</strong> {pedido.horario}</p>
              {pedido.observacoes && <p className="mb-1"><strong>Obs:</strong> {pedido.observacoes}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackPedido;