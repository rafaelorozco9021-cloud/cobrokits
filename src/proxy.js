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
  const { pathname } = request.nextUrl;

  // Si está en un subdominio y NO está en /dashboard, redirigir al login principal
  if (slug && !pathname.startsWith('/dashboard') && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Propagar slug como header hacia el backend (via rewrite /api) y hacia server components
  const requestHeaders = new Headers(request.headers);
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug);
    requestHeaders.set('x-tenant-host', host);
  }

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = request.cookies.get('token')?.value;
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|_next).*)'],
};
// compat: mantener middleware como alias para builds que aun lo buscan
export const middleware = proxy;
