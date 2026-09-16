/**
 * Helpers de autenticación para CobroKits
 * - Login via proxy /api (Next rewrites) para que la cookie HttpOnly quede en el dominio del frontend
 * - Fallback Bearer en localStorage para desarrollo / API directa
 */

export function saveToken(token) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('cobrokits_token', token);
  } catch {}
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('cobrokits_token');
  } catch {
    return null;
  }
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('cobrokits_token');
    localStorage.removeItem('cobrokits_user');
  } catch {}
}

export function saveUser(user) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('cobrokits_user', JSON.stringify(user));
  } catch {}
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cobrokits_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Limpia tokens viejos (ej: de antes del wipe de empresas) que rebotan como 401.
// Borra tanto la cookie host-only como las de dominio padre.
export function clearAuthCookies() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    document.cookie = 'token=; Path=/; Max-Age=0';
    document.cookie = 'token=; Path=/; Max-Age=0; SameSite=Lax; Secure';
    const parts = window.location.hostname.split('.');
    for (let i = 1; i < parts.length - 1; i++) {
      const d = '.' + parts.slice(i).join('.');
      document.cookie = `token=; Path=/; Domain=${d}; Max-Age=0`;
      document.cookie = `token=; Path=/; Domain=${d}; Max-Age=0; SameSite=Lax; Secure`;
    }
  } catch {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Login usando el rewrite de Next (/api -> backend) para que la cookie HttpOnly se setee en localhost:3000
export async function loginViaProxy(email, password, onStatus) {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  // En producción NO se usa fallback directo: la cookie quedaría atada a
  // backend-cobrokits.onrender.com y no serviría en los subdominios (rebote al login).
  // En su lugar se reintenta por el proxy para despertar al backend (Render free).
  const maxAttempts = isLocalhost ? 1 : 3;
  let lastErr = new Error('No se pudo contactar el servidor');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.token) saveToken(data.token);
        if (data.user) saveUser(data.user);
        // Verificar que la sesión quedó usable (cookie) ANTES de redirigir al subdominio.
        // Si la cookie no quedó, redirigir sería un rebote seguro al login.
        try {
          const meRes = await fetch('/api/auth/me', { credentials: 'include' });
          if (meRes.status === 401) {
            const meBody = await meRes.json().catch(() => ({}));
            const detail = meBody.message ? ` (${meBody.message})` : '';
            throw new Error(`Sesión no establecida en este dominio${detail}. Limpia las cookies del sitio y reintenta.`);
          }
        } catch (e) {
          if (e.message && e.message.includes('Sesión no establecida')) throw e;
          // 404 (backend aún sin /me) o error de red: seguir igual, el dashboard validará.
        }
        return data;
      }
      // Rate limit (429): lanzar error directo, sin reintentos de "despertar servidor"
      if (res.status === 429) {
        throw new Error(data.message || 'Demasiados intentos. Espera un momento y vuelve a intentarlo.');
      }
      // si es 401/400, no reintentar con fallback, lanzar error directo
      if (res.status === 401 || res.status === 400) {
        throw new Error(data.error || data.message || `Credenciales inválidas (${res.status})`);
      }
      // para otros errores (502, 504, backend dormido) reintentar
      throw new Error(data.error || data.message || `Error proxy ${res.status}`);
    } catch (err) {
      // Si fue credenciales, sesión no establecida o rate limit, re-lanzar sin reintentos
      if (err.message && (err.message.includes('Credenciales inválidas') || err.message.includes('Sesión no establecida') || err.message.includes('Demasiados intentos'))) throw err;
      lastErr = err;
      if (attempt < maxAttempts) {
        if (onStatus) onStatus(`Despertando el servidor (intento ${attempt}/${maxAttempts})...`);
        await sleep(15000);
        continue;
      }
    }
  }
  // Solo en desarrollo local: fallback directo a NEXT_PUBLIC_API_URL
  if (isLocalhost) {
    console.warn('[auth] proxy falló, intentando directo:', lastErr.message);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res2 = await fetch(`${API_URL.replace(/\/$/, '')}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });
    const data2 = await res2.json().catch(() => ({}));
    if (!res2.ok) {
      throw new Error(data2.error || data2.message || `Error ${res2.status} (directo)`);
    }
    if (data2.token) saveToken(data2.token);
    if (data2.user) saveUser(data2.user);
    return data2;
  }
  throw lastErr;
}

export async function fetchDashboard(action = 'overview') {
  const token = getToken();
  const url = `/api/dashboard?action=${encodeURIComponent(action)}`;
  const headers = buildAuthHeaders(token ? { Authorization: `Bearer ${token}` } : {});
  const res = await fetch(url, {
    credentials: 'include',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Error ${res.status}`);
  }
  return data;
}

export function getTenantSlugFromHost() {
  try {
    if (typeof window === 'undefined') return null;
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === 'cobrokits.online' || host === 'www.cobrokits.online' || host.endsWith('.vercel.app')) return null;
    if (host.endsWith('.cobrokits.online')) {
      const sub = host.replace('.cobrokits.online', '').trim();
      if (sub && sub !== 'www' && !sub.includes('.')) return sub;
    }
  } catch {}
  return null;
}

// Headers multiempresa: Authorization + X-Tenant-Slug (subdominio) + X-Tenant-Id (empresa del JWT/user).
// Usar en TODAS las páginas de /dashboard para que el backend aisle por schema/empresa.
export function buildAuthHeaders(extra = {}) {
  const headers = { ...extra };
  try {
    const token = getToken();
    if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  try {
    const slug = getTenantSlugFromHost();
    if (slug) headers['X-Tenant-Slug'] = slug;
  } catch {}
  try {
    const u = getUser();
    const tid = u?.empresa_id || (u?.role === 'empresa' ? u?.id : null) || u?.id;
    if (tid) headers['X-Tenant-Id'] = tid;
  } catch {}
  return headers;
}

export async function logoutViaProxy() {
  clearToken();
  // No hay endpoint logout en backend; basta limpiar cookie local y token.
  // Si en el futuro existe /api/auth/logout, descomentar:
  // await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(()=>{});
  if (typeof window !== 'undefined') window.location.href = '/login';
}
