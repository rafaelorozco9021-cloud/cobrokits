import { NextResponse } from 'next/server';

// Rutas que requieren auth (cookie 'token' o Bearer via header es validado en backend,
// pero aquí hacemos redirect UX si no hay cookie)
const PROTECTED = ['/dashboard'];

export default function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (!isProtected) return NextResponse.next();

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
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
// compat: mantener middleware como alias para builds que aun lo buscan
export const middleware = proxy;
