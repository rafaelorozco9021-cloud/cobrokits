'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Box, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setOpen(false)}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-500 text-slate-900 font-bold shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <MapPin className="w-6 h-6 text-slate-950 absolute" />
            <Box className="w-4 h-4 text-slate-950 absolute translate-x-[4px] -translate-y-[4px]" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">
            Cobro<span className="text-emerald-400">Kits</span>{' '}
            <span className="text-amber-500 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 align-middle">
              SaaS
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-emerald-400 transition-colors">
            Funcionalidades
          </a>
          <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
            ¿Cómo Funciona?
          </a>
          <a href="#pricing" className="hover:text-emerald-400 transition-colors">
            Planes y Precios
          </a>
          <a href="#faq" className="hover:text-emerald-400 transition-colors">
            FAQ
          </a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Iniciar Sesión
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
          >
            Crear Mi Empresa
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-md">
          <div className="px-4 py-6 space-y-4">
            <a
              href="#features"
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              Funcionalidades
            </a>
            <a
              href="#how-it-works"
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              ¿Cómo Funciona?
            </a>
            <a
              href="#pricing"
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              Planes y Precios
            </a>
            <a
              href="#faq"
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-slate-300 hover:text-white py-2"
            >
              Preguntas Frecuentes
            </a>
            <div className="pt-4 flex flex-col gap-3 border-t border-slate-800">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full text-center px-4 py-3 rounded-xl text-sm font-semibold bg-slate-800 border border-slate-700 text-slate-200"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="w-full text-center px-4 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-slate-950"
              >
                Crear Mi Empresa
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
