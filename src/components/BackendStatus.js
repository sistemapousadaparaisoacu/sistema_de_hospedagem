import React, { useEffect, useState, useCallback, useRef } from 'react';
import { resolveBase, ping } from '../services/api';

function BackendStatus() {
  const [status, setStatus] = useState('checking');
  const [base, setBase] = useState(null);
  const prevStatusRef = useRef('checking');
  const toastStateRef = useRef({ lastToastAt: 0, stableStatus: null, stableCount: 0 });

  const getPollMs = () => {
    try {
      const raw = localStorage.getItem('api_status_poll_ms');
      const val = Number(raw);
      if (Number.isFinite(val) && val >= 1000) return val;
    } catch {}
    return 15000; // padrão 15s
  };

  const getToastMessages = () => {
    const online = localStorage.getItem('api_status_msg_online') || 'API conectada: {base}';
    const offline = localStorage.getItem('api_status_msg_offline') || 'API offline: {base}';
    return { online, offline };
  };

  const formatMsg = (tpl, b) => {
    try {
      return (tpl || '').replace('{base}', b || base || '');
    } catch {
      return tpl;
    }
  };

  const getToastCooldownMs = () => {
    try {
      const raw = localStorage.getItem('api_status_toast_cooldown_ms');
      const val = Number(raw);
      if (Number.isFinite(val) && val >= 0) return val;
    } catch {}
    return 45000; // 45s de cooldown por padrão
  };

  const candidates = [
    process.env.REACT_APP_API_BASE || null,
    (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('api_base') : null),
    (typeof window !== 'undefined' ? `http://${window.location.hostname}:3020/api` : null),
    (typeof window !== 'undefined' ? `http://${window.location.hostname}:5000/api` : null),
    'http://localhost:3020/api',
    'http://localhost:5000/api',
  ].filter(Boolean);

  // usa ping exportado do serviço; aumentamos tolerância ajustando timeout via wrapper
  const pingWithTimeout = async (b, timeoutMs = 7000) => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${b}/health`, { signal: controller.signal });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  };

  const detect = useCallback(async () => {
    setStatus('checking');
    try {
      const b = await resolveBase();
      const ok = await pingWithTimeout(b, 7000);
      setBase(b);
      const next = ok ? 'online' : 'offline';
      const prev = prevStatusRef.current;
      setStatus(next);
      // atualiza contagem de estabilidade
      const ts = toastStateRef.current;
      if (ts.stableStatus === next) {
        ts.stableCount += 1;
      } else {
        ts.stableStatus = next;
        ts.stableCount = 1;
      }
      const shouldToast = prev !== 'checking' && prev !== next && next === 'offline' && ts.stableCount >= 3 && (Date.now() - ts.lastToastAt >= getToastCooldownMs());
      // dispara toast quando houver mudança de estado
      if (shouldToast) {
        try {
          const msgs = getToastMessages();
          const detail = { type: 'error', message: formatMsg(msgs.offline, b) };
          window.dispatchEvent(new CustomEvent('toast', { detail }));
          ts.lastToastAt = Date.now();
        } catch {}
      }
      prevStatusRef.current = next;
    } catch {
      const fallback = candidates[0] || 'http://localhost:3020/api';
      setBase(fallback);
      const next = 'offline';
      const prev = prevStatusRef.current;
      setStatus(next);
      const ts = toastStateRef.current;
      if (ts.stableStatus === next) {
        ts.stableCount += 1;
      } else {
        ts.stableStatus = next;
        ts.stableCount = 1;
      }
      const shouldToast = prev !== 'checking' && prev !== next && next === 'offline' && ts.stableCount >= 3 && (Date.now() - ts.lastToastAt >= getToastCooldownMs());
      if (shouldToast) {
        try {
          const msgs = getToastMessages();
          window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: formatMsg(msgs.offline, fallback) } }));
          ts.lastToastAt = Date.now();
        } catch {}
      }
      prevStatusRef.current = next;
    }
  }, [candidates]);

  useEffect(() => {
    detect();
    const id = setInterval(detect, getPollMs());
    return () => clearInterval(id);
  }, [detect]);

  const label = status === 'online' ? 'Online' : (status === 'offline' ? 'Offline' : 'Verificando');
  const color = status === 'online' ? '#28a745' : (status === 'offline' ? '#dc3545' : '#ffc107');

  return (
    <div className="d-flex align-items-center" title={base || ''}>
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 8, backgroundColor: color, marginRight: 6 }}></span>
      <small className="text-light me-2">API: {label}</small>
      <button type="button" className="btn btn-sm btn-outline-light" onClick={detect}>Atualizar</button>
    </div>
  );
}

export default BackendStatus;