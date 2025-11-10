// Lightweight Google Identity Services (GIS) OAuth helper and Calendar REST calls
// Requires env var: REACT_APP_GOOGLE_CLIENT_ID

const GIS_SRC = 'https://accounts.google.com/gsi/client';

export const loadGoogleIdentityServices = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'));
    document.head.appendChild(script);
  });
};

export const initTokenClient = ({ clientId, scope }) => {
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    throw new Error('GIS não carregado');
  }
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope,
    callback: () => {},
  });
  return tokenClient;
};

export const requestAccessToken = (tokenClient, opts = { prompt: 'consent' }) => {
  return new Promise((resolve, reject) => {
    try {
      tokenClient.callback = (resp) => {
        if (resp && resp.access_token) {
          resolve(resp.access_token);
        } else {
          reject(new Error('Token ausente'));
        }
      };
      tokenClient.requestAccessToken(opts);
    } catch (e) {
      reject(e);
    }
  });
};

// Lista eventos de um calendário específico (default: 'primary')
export const listCalendarEvents = async (accessToken, calendarId = 'primary', { timeMin, timeMax, maxResults = 25 } = {}) => {
  const nowIso = new Date().toISOString();
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
    timeMin: timeMin || nowIso,
  });
  if (timeMax) params.set('timeMax', timeMax);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Erro API Google: ${resp.status}`);
  const json = await resp.json();
  return json.items || [];
};

const tzDetect = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

const toDateWithSeconds = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Cria evento em um calendário específico
export const createCalendarEvent = async (accessToken, calendarId = 'primary', ev) => {
  const tz = tzDetect();
  const start = new Date(`${ev.data}T${ev.horaInicio || '00:00'}:00`);
  const end = new Date(`${ev.data}T${ev.horaFim || ev.horaInicio || '01:00'}:00`);
  const body = {
    summary: ev.nome || 'Evento',
    description: ev.descricao || '',
    location: ev.local || '',
    start: { dateTime: toDateWithSeconds(start), timeZone: tz },
    end: { dateTime: toDateWithSeconds(end), timeZone: tz },
  };
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Erro ao criar evento: ${resp.status}`);
  return await resp.json();
};

// Atualiza evento em um calendário específico
export const updateCalendarEvent = async (accessToken, calendarId = 'primary', eventId, ev) => {
  const tz = tzDetect();
  const start = new Date(`${ev.data}T${ev.horaInicio || '00:00'}:00`);
  const end = new Date(`${ev.data}T${ev.horaFim || ev.horaInicio || '01:00'}:00`);
  const body = {
    summary: ev.nome || 'Evento',
    description: ev.descricao || '',
    location: ev.local || '',
    start: { dateTime: toDateWithSeconds(start), timeZone: tz },
    end: { dateTime: toDateWithSeconds(end), timeZone: tz },
  };
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Erro ao atualizar evento: ${resp.status}`);
  return await resp.json();
};

// Remove evento de um calendário específico
export const deleteCalendarEvent = async (accessToken, calendarId = 'primary', eventId) => {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Erro ao remover evento: ${resp.status}`);
  return true;
};

// Obtém o ID do calendário com nome (summary) fornecido
export const getCalendarIdBySummary = async (accessToken, summary = 'Eventos') => {
  const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer';
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) throw new Error(`Erro ao listar calendários: ${resp.status}`);
  const json = await resp.json();
  const item = (json.items || []).find((c) => c.summary === summary || c.summaryOverride === summary);
  if (!item) throw new Error(`Calendário "${summary}" não encontrado`);
  return item.id;
};

// Cria um calendário com o summary indicado caso não exista e retorna seu ID
export const ensureCalendarSummary = async (accessToken, summary = 'Eventos', timeZone) => {
  // Tenta localizar primeiro
  try {
    const existingId = await getCalendarIdBySummary(accessToken, summary);
    if (existingId) return existingId;
  } catch {}

  // Cria novo calendário (exige escopo completo: https://www.googleapis.com/auth/calendar)
  const body = { summary };
  if (timeZone) body.timeZone = timeZone;
  const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Erro ao criar calendário: ${text}`);
  }
  const created = await resp.json();
  return created.id;
};

export const revokeToken = async (token) => {
  try {
    if (window.google?.accounts?.oauth2?.revoke) {
      await new Promise((resolve) => window.google.accounts.oauth2.revoke(token, resolve));
      return true;
    }
  } catch {}
  try {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }).toString(),
    });
    return true;
  } catch {
    return false;
  }
};