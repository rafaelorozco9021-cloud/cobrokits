/**
 * Cliente HTTP para consumir backendkit (NestJS)
 * Usa NEXT_PUBLIC_API_URL (default http://localhost:3001)
 * Maneja cookies HttpOnly (credentials: include) y Bearer fallback
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function buildUrl(path) {
  const base = API_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

async function request(path, { method = 'GET', body, headers = {}, token } = {}) {
  const url = buildUrl(path);
  const h = { 'Content-Type': 'application/json', ...headers };
  if (token) h['Authorization'] = `Bearer ${token}`;
  // Tenant header (schema-per-tenant preparation) — derived from JWT/user
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('cobrokits_user') : null;
    if (raw) {
      const u = JSON.parse(raw);
      const tid = u?.empresa_id || u?.id;
      if (tid) h['X-Tenant-Id'] = tid;
    }
  } catch {}

  const res = await fetch(url, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Error ${res.status}`);
  }
  return data;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

// Helpers tipados para migrar las viejas rutas Next (/api/auth, /api/dashboard)
export const authApi = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  listSellers: (token) => api.get('/api/auth', { token }),
};

export const dashboardApi = {
  overview: (token) => api.get('/api/dashboard?action=overview', { token }),
  sellers: (token) => api.get('/api/dashboard?action=sellers', { token }),
};

export { API_URL };
