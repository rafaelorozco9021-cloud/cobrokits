'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  MapPin,
  Truck,
  Package,
  BarChart3,
  FileText,
  CalendarDays,
  Settings,
  Printer,
  Layers,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { getToken, getUser, saveUser, clearToken, clearAuthCookies } from '@/lib/auth';

const nav = [
  { href: '/dashboard', label: 'Inicio', icon: Home, exact: true },
  { href: '/dashboard/registrar-visita', label: 'Registrar Visita', icon: MapPin },
  { href: '/dashboard/entregar-inventario', label: 'Entregar Inventario', icon: Truck },
  { href: '/dashboard/inventario-general', label: 'Inventario General', icon: Package },
  { href: '/dashboard/reportes-semanales', label: 'Reportes Semanales', icon: BarChart3 },
  { href: '/dashboard/venta-diaria', label: 'Venta Diaria', icon: FileText },
  { href: '/dashboard/reporte-mensual', label: 'Reporte Mensual', icon: CalendarDays },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
  { href: '/dashboard/imprimir-cobros', label: 'Imprimir Cobros', icon: Printer },
  { href: '/dashboard/config-cobros', label: 'Config de Cobros', icon: Layers },
];

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [cobroHoy, setCobroHoy] = useState('Todos');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // localStorage no se comparte entre subdominios: la fuente real es /api/auth/me (cookie httpOnly o Bearer)
    (async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/auth/me', { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (res.status === 401) {
          window.location.href = 'https://www.cobrokits.online/login';
          return;
        }
        const me = await res.json().catch(() => null);
        if (me?.id) {
          setUser(me);
          saveUser(me);
        } else {
          setUser(getUser());
        }
      } catch {
        window.location.href = 'https://www.cobrokits.online/login';
        return;
      }
      setAuthChecked(true);
    })();
  }, []);

  async function logout() {
    try {
      // El backend borra la cookie HttpOnly (el frontend no puede: document.cookie no la alcanza)
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    clearToken();
    clearAuthCookies();
    router.push('/login');
  }

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  // Nombre de la empresa logueada (viene de /api/auth/me, no de localStorage)
  const empresaName = user?.empresa_name || (user?.role === 'empresa' ? user?.name : null) || 'Empresa';
  const subLabel = user?.role === 'empresa' ? (user?.email || 'Empresa') : (user?.name || user?.role || '');
  const avatarLetter = (empresaName || 'E').charAt(0).toUpperCase();

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-[240px] shrink-0 bg-white border-r border-slate-200 flex-col">
        <div className="h-[64px] flex items-center gap-3 px-4 border-b border-slate-200">
          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
            {avatarLetter}
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-sm font-black text-slate-900 truncate">{empresaName}</p>
            <p className="text-[11px] text-slate-500 -mt-0.5 truncate">{subLabel}</p>
          </div>
          <div className="ml-auto flex gap-1">
            <button className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <span className="text-xs">↗</span>
            </button>
            <button className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <span className="text-xs">▭</span>
            </button>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1 overflow-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  active ? 'bg-[#2563eb] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 pb-3 space-y-3 border-t border-slate-200 pt-3">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            Salir
          </button>

          <div className="space-y-2 px-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#2563eb] flex items-center justify-center text-white text-xs font-black">CK</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">CobroKits</p>
                <p className="text-[11px] text-slate-500 truncate">Consignacion semanal</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500">Cobro de hoy</label>
              <div className="relative">
                <select
                  value={cobroHoy}
                  onChange={(e) => setCobroHoy(e.target.value)}
                  className="w-full text-xs font-bold border border-amber-300 rounded-lg px-2 py-1.5 bg-amber-50 text-slate-900 focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                >
                  <option>Todos</option>
                  <option>Grupo Lunes</option>
                  <option>Grupo Martes</option>
                </select>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
              <p className="text-[11px] text-slate-500">Cartera</p>
              <p className="text-sm font-black text-[#2563eb]">$ 0</p>
              <p className="text-[11px] text-slate-500">Recaudo hoy</p>
              <p className="text-xs font-bold text-slate-900">$ 0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white border-r border-slate-200 p-3 flex flex-col overflow-auto">
            <div className="flex items-center justify-between h-12 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
                  {avatarLetter}
                </div>
                <span className="font-black text-slate-900 truncate">{empresaName}</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium ${active ? 'bg-[#2563eb] text-white' : 'text-slate-600'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button onClick={logout} className="mt-auto flex items-center gap-2 px-3 py-2 text-sm text-slate-600">
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <div className="lg:hidden h-12 bg-white border-b border-slate-200 flex items-center gap-3 px-3">
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg border border-slate-200">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
              {avatarLetter}
            </div>
            <span className="font-bold text-slate-900 text-sm truncate">{empresaName}</span>
          </div>
        </div>
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
