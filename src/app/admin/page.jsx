'use client';
import { useEffect, useState } from 'react';
import { Shield, Building2, Users, Package, CreditCard, Trash2, RefreshCw, LogOut, AlertCircle, Eye } from 'lucide-react';
import { getToken, getUser, clearToken } from '@/lib/auth';

export default function AdminDashboard(){
  const [data,setData]=useState(null);
  const [tenants,setTenants]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [deleting,setDeleting]=useState(null);

  async function load(){
    const token=getToken();
    if(!token){ window.location.href='/admin/login'; return; }
    try{
      setLoading(true);
      const h={ Authorization:`Bearer ${token}`};
      const o=await fetch('/api/admin/overview',{ headers:h, credentials:'include' }).then(r=>r.json());
      if(o.error) throw new Error(o.error);
      setData(o);
      const t=await fetch('/api/admin/tenants',{ headers:h, credentials:'include' }).then(r=>r.json());
      setTenants(Array.isArray(t)?t:[]);
    }catch(e){ setError(e.message); if(e.message.includes('No autorizado')) setTimeout(()=>window.location.href='/admin/login',1500); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); },[]);

  async function onDelete(id){
    if(!confirm('¿Borrar tenant y su schema? Irreversible.')) return;
    const token=getToken();
    setDeleting(id);
    try{
      const r=await fetch(`/api/admin/tenants?id=${id}`,{ method:'DELETE', headers:{ Authorization:`Bearer ${token}`}, credentials:'include' }).then(r=>r.json());
      if(r.error) throw new Error(r.error);
      await load();
    }catch(e){ alert(e.message); }
    finally{ setDeleting(null); }
  }

  const user=getUser();

  if(loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando superadmin…</div>;
  if(error) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl flex gap-3"><AlertCircle className="w-6 h-6"/>{error}</div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 bg-slate-900/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center"><Shield className="w-5 h-5 text-white"/></div>
            <div>
              <div className="font-black text-white">SuperAdmin</div>
              <div className="text-xs text-violet-400">Gestión global • {user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"><RefreshCw className="w-4 h-4"/></button>
            <button onClick={()=>{clearToken(); window.location.href='/admin/login'}} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm flex items-center gap-2"><LogOut className="w-4 h-4"/>Salir</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><div className="text-xs text-slate-400 flex items-center gap-2"><Building2 className="w-4 h-4 text-violet-400"/>Empresas</div><div className="text-2xl font-black text-white mt-1">{data?.totalEmpresas??0}</div></div>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><div className="text-xs text-slate-400 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400"/>Vendedores</div><div className="text-2xl font-black text-white mt-1">{data?.totalSellers??0}</div></div>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><div className="text-xs text-slate-400 flex items-center gap-2"><Package className="w-4 h-4 text-amber-400"/>Productos</div><div className="text-2xl font-black text-white mt-1">{data?.totalProducts??0}</div></div>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><div className="text-xs text-slate-400">Clientes</div><div className="text-2xl font-black text-white mt-1">{data?.totalCustomers??0}</div></div>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><div className="text-xs text-slate-400 flex items-center gap-2"><CreditCard className="w-4 h-4 text-sky-400"/>Visitas</div><div className="text-2xl font-black text-white mt-1">{data?.totalVisits??0}</div></div>
        </div>

        {data?.totalEmpresas===0 && <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-3 text-sm">Sistema limpio — 0 empresas. Crea la primera desde “Crear Mi Empresa” o via API.</div>}

        {/* Tenants table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-violet-400"/>Tenants (schemas por empresa)</h2>
            <span className="text-xs text-slate-500">{tenants.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase">
                <tr><th className="text-left px-4 py-3">Empresa</th><th className="text-left px-4 py-3">Schema</th><th className="text-center px-4 py-3">Vendedores</th><th className="text-center px-4 py-3">Productos</th><th className="text-center px-4 py-3">Ventas</th><th className="text-right px-4 py-3">Acción</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tenants.length===0? <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Sin tenants — sistema nuevo</td></tr> :
                  tenants.map(t=> (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3"><div className="font-semibold text-white">{t.name}</div><div className="text-xs text-slate-500 font-mono">{t.id.slice(0,8)}</div></td>
                    <td className="px-4 py-3 font-mono text-xs text-violet-400">{t.schema_name}</td>
                    <td className="px-4 py-3 text-center">{t.sellers??'-'}</td>
                    <td className="px-4 py-3 text-center">{t.products??'-'}</td>
                    <td className="px-4 py-3 text-center">{t.total_sales ?? '-'}</td>
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      <a href={`/dashboard?tenant=${t.id}`} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700"><Eye className="w-4 h-4"/></a>
                      <button disabled={deleting===t.id} onClick={()=>onDelete(t.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 disabled:opacity-50"><Trash2 className="w-4 h-4"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-tenant detail */}
        {data?.perTenant?.length>0 && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <h3 className="font-bold text-white mb-3">Detalle por tenant (ventas agregadas)</h3>
            <div className="grid gap-2 text-xs font-mono text-slate-400">{data.perTenant.map(p=> <div key={p.id} className="flex justify-between border-b border-slate-800 py-1"><span>{p.name} ({p.schema_name})</span><span>{p.products} prod • {p.sellers} vend • ${Number(p.total_sales).toLocaleString()}</span></div>)}</div>
          </div>
        )}
      </main>
    </div>
  );
}
