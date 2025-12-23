// Auto-detect API base: env var → localStorage → common localhost ports
let ACTIVE_BASE = null;

const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

const getSafeEnvBase = () => {
  const env = process.env.REACT_APP_API_BASE;
  // Se estiver em HTTPS, ignora localhost
  if (isHttps && env && env.includes('localhost')) return null;
  return env;
};

const getSafeLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const saved = window.localStorage.getItem('api_base');
  // Se estiver em HTTPS, ignora localhost salvo
  if (isHttps && saved && saved.includes('localhost')) return null;
  return saved;
};

const CANDIDATES = [
  getSafeEnvBase(),
  // Se estiver rodando na Vercel (https), prioriza rota relativa /api
  (isHttps ? '/api' : null),
  getSafeLocalStorage(),
  '/api', 
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:3020/api` : null),
  (typeof window !== 'undefined' ? `http://${window.location.hostname}:5000/api` : null),
  // Apenas inclui localhost nos candidatos se NÃO estiver em HTTPS
  (!isHttps ? 'http://localhost:3020/api' : null),
  (!isHttps ? 'http://localhost:5000/api' : null),
].filter(Boolean);

export async function ping(base) {
  try {
    const url = `${base}/health`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
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
  // Fallback seguro
  ACTIVE_BASE = CANDIDATES[0] || (isHttps ? '/api' : 'http://localhost:3020/api');
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
  clear: (resource) => req(`/${resource}`, { method: 'DELETE' }),
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
