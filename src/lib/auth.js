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

// Login usando el rewrite de Next (/api -> backend) para que la cookie HttpOnly se setee en localhost:3000
export async function loginViaProxy(email, password) {
  // Intento 1: via proxy Next (recomendado para cookie HttpOnly)
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
      return data;
    }
    // si es 401/400, no reintentar con fallback, lanzar error directo
    if (res.status === 401 || res.status === 400) {
      throw new Error(data.error || data.message || `Credenciales inválidas (${res.status})`);
    }
    // para otros errores (502, 504) intentar fallback directo
    throw new Error(data.error || data.message || `Error proxy ${res.status}`);
  } catch (err) {
    // Si fue credenciales, re-lanzar sin fallback
    if (err.message && err.message.includes('Credenciales inválidas')) throw err;
    // Fallback directo a NEXT_PUBLIC_API_URL
    console.warn('[auth] proxy falló, intentando directo:', err.message);
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
}

export async function fetchDashboard(action = 'overview') {
  const token = getToken();
  const url = `/api/dashboard?action=${encodeURIComponent(action)}`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try { const u=getUser(); const tid=u?.empresa_id||u?.id; if(tid) headers['X-Tenant-Id']=tid; } catch {}
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

export async function logoutViaProxy() {
  clearToken();
  // No hay endpoint logout en backend; basta limpiar cookie local y token.
  // Si en el futuro existe /api/auth/logout, descomentar:
  // await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(()=>{});
  if (typeof window !== 'undefined') window.location.href = '/login';
}
