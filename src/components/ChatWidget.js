import React, { useEffect, useMemo, useState, useRef } from 'react';
import { api, Resources } from '../services/api';

const sectores = [
  { key: 'cozinha', label: 'Cozinha' },
  { key: 'balcao', label: 'Balcão' },
  { key: 'gerente', label: 'Gerente' },
  { key: 'administrador', label: 'Admin' },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [toSector, setToSector] = useState('cozinha');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [filterMySector, setFilterMySector] = useState(true);
  const [unread, setUnread] = useState(0);
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('auth_user') || 'null'); } catch { return null; }
  }, []);
  const loggedIn = useMemo(() => {
    try { return localStorage.getItem('auth_logged_in') === 'true'; } catch { return false; }
  }, []);

  const fromName = user?.usuario || user?.nome || 'Usuário';
  const fromSector = (() => {
    const papel = user?.papel || '';
    if (papel === 'garcom') return 'balcao';
    if (papel) return papel;
    return 'geral';
  })();
  const mySector = fromSector;
  const lastSeenKey = `chat_last_seen_${user?.usuario || 'anon'}`;
  const outboxKey = `chat_outbox_${user?.usuario || 'anon'}`;
  const lastUnreadRef = useRef(0);
  const audioCtxRef = useRef(null);

  const readOutbox = () => {
    try { return JSON.parse(localStorage.getItem(outboxKey) || '[]'); } catch { return []; }
  };
  const writeOutbox = (items) => {
    try { localStorage.setItem(outboxKey, JSON.stringify(items)); } catch {}
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await api.list(Resources.Chat);
        if (mounted) setMessages(Array.isArray(list) ? list : []);
      } catch {
        // fallback silencioso
      }
    };
    const flushOutbox = async () => {
      const pending = readOutbox();
      if (!pending.length) return;
      const remaining = [];
      for (const item of pending) {
        try {
          const created = await api.create(Resources.Chat, item.payload);
          // Substituir mensagem pendente pelo registro criado
          setMessages(prev => prev.map(m => (m.id === item.tempId ? created : m)));
        } catch {
          remaining.push(item);
        }
      }
      writeOutbox(remaining);
    };

    load();
    flushOutbox();
    const id = setInterval(() => { load(); flushOutbox(); }, 4000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Atualiza contador de não lidas quando chegam novas mensagens
  useEffect(() => {
    try {
      const seenStr = localStorage.getItem(lastSeenKey);
      const seen = seenStr ? new Date(seenStr) : new Date(0);
      const count = messages.filter(m => {
        const ts = new Date(m.createdAt || 0);
        const isMine = (m.fromName === fromName);
        const relevant = (m.toSector === mySector || m.fromSector === mySector || m.toSector === 'geral');
        return relevant && !isMine && ts > seen;
      }).length;
      if (!open) setUnread(count);
      else setUnread(0);
      // Som para novas não lidas
      if (!open && count > lastUnreadRef.current) {
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          const ctx = audioCtxRef.current;
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(880, ctx.currentTime); // tom alto breve
          g.gain.setValueAtTime(0.001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.16);
        } catch {}
      }
      lastUnreadRef.current = count;
    } catch {}
  }, [messages, open, fromName, mySector, lastSeenKey]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!loggedIn || !user) {
      setFeedback({ type: 'error', message: 'Você precisa estar logado para enviar.' });
      setTimeout(() => setFeedback(null), 2500);
      return;
    }
    // Força base correta se houver problemas de auto-detecção em alguns ambientes
    try { localStorage.setItem('api_base', 'http://localhost:3020/api'); } catch {}
    const payload = {
      text: trimmed,
      fromName,
      fromSector,
      toSector,
      createdAt: new Date().toISOString(),
    };
    setText('');
    setSending(true);
    try {
      const created = await api.create(Resources.Chat, payload);
      setMessages(prev => [...prev, created]);
      setFeedback({ type: 'success', message: 'Mensagem enviada.' });
    } catch {
      // fallback local + fila offline
      const tempId = Date.now();
      setMessages(prev => [...prev, { id: tempId, pending: true, ...payload }]);
      const pending = readOutbox();
      pending.push({ tempId, payload });
      writeOutbox(pending);
      setFeedback({ type: 'warning', message: 'Envio offline. Vamos sincronizar quando a API voltar.' });
    }
    setTimeout(() => setFeedback(null), 2500);
    setSending(false);
  };

  const openChat = () => {
    setOpen(true);
    try { localStorage.setItem(lastSeenKey, new Date().toISOString()); } catch {}
    setUnread(0);
  };
  const closeChat = () => {
    setOpen(false);
    try { localStorage.setItem(lastSeenKey, new Date().toISOString()); } catch {}
    setUnread(0);
  };

  if (!user || !loggedIn) return null; // apenas logado

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1050 }}>
      {!open ? (
        <button className={`btn btn-outline-primary position-relative rounded-circle ${unread>0 ? 'chat-pulse' : ''}`} style={{ width: 48, height: 48, padding: 0 }} onClick={openChat} aria-label="Abrir chat">
          <span style={{ fontSize: 20, lineHeight: '48px', display: 'inline-block' }}>💬</span>
          {unread > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">{unread}</span>
          )}
        </button>
      ) : (
        <div className="card shadow" style={{ width: 320 }}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Chat</strong>
            <button className="btn btn-sm btn-outline-secondary" onClick={closeChat}>Fechar</button>
          </div>
          <div className="card-body" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {feedback && (
              <div className={`alert alert-${feedback.type} py-1 px-2 mb-2`}>{feedback.message}</div>
            )}
            {messages.length === 0 ? (
              <p className="text-muted small">Nenhuma mensagem</p>
            ) : (
              messages
                .slice()
                .sort((a,b) => new Date(a.createdAt||0) - new Date(b.createdAt||0))
                .filter(m => !filterMySector ? true : (m.toSector === mySector || m.fromSector === mySector || m.toSector === 'geral'))
                .map((m) => (
                  <div key={m.id || `${m.createdAt}-${m.fromName}-${m.text}`}
                       className="mb-2">
                    <div className="small text-muted">
                      [{m.fromSector} → {m.toSector}] {new Date(m.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} {m.pending ? '• pendente' : ''}
                    </div>
                    <div><strong>{m.fromName}:</strong> {m.text}</div>
                  </div>
                ))
            )}
          </div>
          <div className="card-footer">
            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" id="filterMySector" checked={filterMySector} onChange={()=>setFilterMySector(v=>!v)} />
              <label className="form-check-label" htmlFor="filterMySector">Mostrar apenas meu setor</label>
            </div>
            <div className="mb-2">
              <select className="form-select form-select-sm" value={toSector} onChange={(e)=>setToSector(e.target.value)}>
                {sectores.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group input-group-sm">
              <input type="text" className="form-control" placeholder="Digite uma mensagem"
                     value={text} onChange={(e)=>setText(e.target.value)}
                     onKeyDown={(e)=>{ if (e.key==='Enter' && !sending) send(); }} />
              <button className="btn btn-primary" onClick={send} disabled={sending}>Enviar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}