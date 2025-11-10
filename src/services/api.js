// Auto-detect API base: env var → localStorage → common localhost ports
let ACTIVE_BASE = null;
const CANDIDATES = [
  process.env.REACT_APP_API_BASE,
  (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('api_base') : null),
  // Produção: alias público /api da SPA
  (typeof window !== 'undefined' ? `${window.location.origin}/repositories/sistema_de_hotelaria/api` : null),
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:3020/api` : null),
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:5000/api` : null),
  'http://localhost:3020/api',
  'http://localhost:5000/api',
].filter(Boolean);

export async function ping(base) {
  try {
    const url = `${base}/health`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

export async function resolveBase() {
  if (ACTIVE_BASE) return ACTIVE_BASE;
  for (const base of CANDIDATES) {
    const ok = await ping(base);
    if (ok) {
      ACTIVE_BASE = base;
      try { localStorage.setItem('api_base', base); } catch {}
      return ACTIVE_BASE;
    }
  }
  // Fallback to first candidate even se ping falhar (permite ambientes sem /health)
  ACTIVE_BASE = CANDIDATES[0] || 'http://localhost:3020/api';
  try { localStorage.setItem('api_base', ACTIVE_BASE); } catch {}
  return ACTIVE_BASE;
}

async function req(path, options = {}) {
  const base = await resolveBase();
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  // Config / Branding
  getConfig: () => req('/config'),
  updateConfig: (payload) => req('/config', { method: 'PUT', body: JSON.stringify(payload) }),

  // Host público (URL acessível externamente)
  getHost: () => req('/host'),

  // Dashboard modules visibility
  getModules: () => req('/modules'),
  updateModules: (payload) => req('/modules', { method: 'PUT', body: JSON.stringify(payload) }),

  // Generic CRUD for resources
  list: (resource) => req(`/${resource}`),
  get: (resource, id) => req(`/${resource}/${id}`),
  create: (resource, payload) => req(`/${resource}`, { method: 'POST', body: JSON.stringify(payload) }),
  update: (resource, id, payload) => req(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (resource, id) => req(`/${resource}/${id}`, { method: 'DELETE' }),
};

export const Resources = {
  Orders: 'orders',
  Sales: 'sales',
  Inventory: 'inventory',
  Events: 'events',
  Transactions: 'transactions',
  Rooms: 'rooms',
  Chat: 'chat',
  Users: 'users',
};