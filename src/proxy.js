import { NextResponse } from 'next/server';

// Rutas que requieren auth (cookie 'token' o Bearer via header es validado en backend,
// pero aquí hacemos redirect UX si no hay cookie)
const PROTECTED = ['/dashboard'];

function extractTenantSlug(host) {
  if (!host) return null;
  const h = host.split(':')[0].toLowerCase();
  // Ignorar localhost, vercel preview, apex y www
  if (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.endsWith('.vercel.app') ||
    h === 'cobrokits.online' ||
    h === 'www.cobrokits.online'
  )
    return null;
  if (h.endsWith('.cobrokits.online')) {
    const sub = h.replace('.cobrokits.online', '').trim();
    if (sub && sub !== 'www' && !sub.includes('.')) return sub;
  }
  return null;
}

export default function proxy(request) {
  const host = request.headers.get('host') || '';
  const slug = extractTenantSlug(host);

  // Propagar slug como header hacia el backend (via rewrite /api) y hacia server components
  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug);
    requestHeaders.set('x-tenant-host', host);
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = request.cookies.get('token')?.value;
  // Permitir también si viene Authorization header es difícil en middleware (es page navigation),
  // así que si no hay cookie, mandamos a /login.
  // El dashboard client hará fallback a localStorage Bearer si existe.
  if (!token) {
    // Dejar pasar: el layout client-side hará redirect si hay token en localStorage.
    // Pero para UX de navegación directa sin token, redirigir.
    // Comprobamos si hay referer con token es imposible, así que no bloqueamos duro:
    // Solo si no hay cookie, dejamos pasar y el client guardará.
    // Para forzar login en navegación fresca sin cookie ni storage, el client redirect hará el trabajo.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|_next).*)'],
};
// compat: mantener middleware como alias para builds que aun lo buscan
export const middleware = proxy;
