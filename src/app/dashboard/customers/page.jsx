'use client';
import Link from 'next/link';
export default function Page() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-black text-white capitalize">Clientes</h1>
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3">
        <p className="text-slate-400 text-sm">
          Módulo clientes en construcción. Backend: <code className="text-emerald-400">/api/customers</code>
        </p>
        <Link href="/dashboard" className="inline-flex px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-bold">
          Volver al Overview
        </Link>
      </div>
    </div>
  );
}
