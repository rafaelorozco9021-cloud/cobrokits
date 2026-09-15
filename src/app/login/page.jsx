'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Box, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { loginViaProxy, clearAuthCookies } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // Limpiar tokens viejos (ej: de antes del wipe) que rebotan como 401
  useEffect(() => { clearAuthCookies(); }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    if (!email.trim() || !password.trim()) {
      setError('Completa email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginViaProxy(email.trim(), password, (msg) => setStatus(msg));
      console.log('[login] ok', res.user);
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirect');
      if (res.user?.role === 'empresa' && res.user?.slug) {
        window.location.href = `https://${res.user.slug}.cobrokits.online/dashboard`;
      } else if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('[login] error', err);
      const msg = err.message || 'Credenciales inválidas. Verifica backend en ' + (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
      if (msg.includes('TRIAL_EXPIRED')) {
        setError('Tu mes gratis ha terminado. Elige un plan para continuar — te llevamos a Planes.');
        setTimeout(()=> window.location.href='/#pricing', 1500);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left - form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Brand */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-500 shadow-lg shadow-emerald-500/20">
                <MapPin className="w-6 h-6 text-slate-950 absolute" />
                <Box className="w-4 h-4 text-slate-950 absolute translate-x-[4px] -translate-y-[4px]" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">
                Cobro<span className="text-emerald-400">Kits</span>
              </span>
            </Link>
            <h1 className="mt-6 text-2xl font-black text-white tracking-tight">Bienvenido de vuelta</h1>
            <p className="mt-2 text-sm text-slate-400">Ingresa a tu panel de control operativo</p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            {error && (
              <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {status && !error && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm px-4 py-3">
                <Loader2 className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />
                <span>{status}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-slate-200">
                Email o teléfono
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="email"
                  type="text"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cobrokits.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-colors text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-200">
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300"
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-60 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>

            <div className="text-center text-xs text-slate-500 space-y-2">
              <p>
                ¿No tienes cuenta?{' '}
                <a href="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                  Crea tu empresa — un mes gratis
                </a>
              </p>
              <Link href="/" className="block hover:text-slate-300">
                ← Volver a la landing
              </Link>
            </div>
          </form>

          <p className="text-center text-xs text-slate-600">
            Al ingresar aceptas Términos y Política de Privacidad • Soporte vía WhatsApp
          </p>
        </div>
      </div>

      {/* Right - branding panel */}
      <div className="hidden lg:flex flex-1 bg-slate-900 border-l border-slate-800 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
            CobroKits Cloud
          </div>
          <h2 className="text-3xl font-black text-white leading-tight">
            Tu caja, tu inventario y tus rutas{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">
              bajo control
            </span>
          </h2>
          <ul className="space-y-3 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                ✓
              </span>{' '}
              Offline-first: vende sin señal
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                ✓
              </span>{' '}
              Cuadre de caja automático diario
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                ✓
              </span>{' '}
              GPS y auditoría de cobranza
            </li>
          </ul>
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
            <p className="text-xs text-slate-400">Endpoint backend</p>
            <code className="text-xs text-emerald-400 break-all">
              {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
