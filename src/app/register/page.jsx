'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Box, Mail, Lock, User, Phone, Building2, AlertCircle, Loader2, ArrowRight, Check } from 'lucide-react';
import { loginViaProxy } from '@/lib/auth';

function RegisterForm(){
  const searchParams = useSearchParams();
  const requestedPlan = searchParams?.get('plan');
  const [form,setForm]=useState({ name:'', email:'', phone:'', password:'', plan:'un_mes_gratis' });
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  async function onSubmit(e){
    e.preventDefault();
    setError(''); setSuccess('');
    if(!form.name.trim()||!form.email.trim()||!form.password.trim()){
      setError('Completa nombre, email y contraseña.');
      return;
    }
    setLoading(true);
    try{
      const API_URL=process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001';
      const res=await fetch(`${API_URL.replace(/\/$/,'')}/api/auth`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, role:'empresa', plan: 'un_mes_gratis' })
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||data.message||`Error ${res.status}`);
      // Auto-login con las mismas credenciales
      const login=await loginViaProxy(form.email.trim(), form.password);
      setSuccess(`Empresa creada: ${login.user?.name||form.name}. Redirigiendo...`);
      setTimeout(()=> window.location.href='/dashboard', 800);
    }catch(err){
      setError(err.message||'Error creando empresa');
    }finally{ setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
        <div className="w-full max-w-md space-y-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-500 shadow-lg"><MapPin className="w-6 h-6 text-slate-950 absolute"/><Box className="w-4 h-4 text-slate-950 absolute translate-x-[4px] -translate-y-[4px]"/></div>
            <span className="text-xl font-extrabold text-white">Cobro<span className="text-emerald-400">Kits</span></span>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Crea tu empresa</h1>
            <p className="text-sm text-slate-400 mt-1">Un mes gratis • sin tarjeta • cancela cuando quieras</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {requestedPlan && requestedPlan !== 'un_mes_gratis' && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm px-4 py-3">Empiezas con <b>1 mes gratis</b>. El plan ({requestedPlan}) lo elegirás al terminar la prueba, no ahora.</div>}
            {error && <div className="flex gap-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3"><AlertCircle className="w-5 h-5 shrink-0"/>{error}</div>}
            {success && <div className="flex gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3"><Check className="w-5 h-5"/>{success}</div>}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Nombre de la empresa</label>
              <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Distribuidora La Esperanza" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm"/></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Email (será tu usuario)</label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="admin@miempresa.com" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm"/></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Teléfono (opcional)</label>
              <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="3000000000" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm"/></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Contraseña</label>
              <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="•••••••• (mín 6)" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm"/></div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Plan</label>
              <div className="w-full px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center justify-between">
                <span>Un mes gratis — luego eliges plan</span>
                <span className="text-xs bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black">FIJO</span>
              </div>
              <p className="text-xs text-slate-500">Primer mes gratis fijo. Al vencerse, al loguearte te llevamos a Planes para elegir obligatoriamente.</p>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              {loading?<Loader2 className="w-5 h-5 animate-spin"/>:<ArrowRight className="w-5 h-5"/>}{loading?'Creando...':'Crear mi empresa y entrar'}
            </button>

            <p className="text-center text-xs text-slate-500">¿Ya tienes cuenta? <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold">Inicia sesión</Link></p>
          </form>
        </div>
      </div>
      <div className="hidden lg:flex flex-1 bg-slate-900 border-l border-slate-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl"/>
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl"/>
        <div className="relative max-w-md space-y-4 text-sm text-slate-300">
          <div className="inline-flex px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">Empieza gratis</div>
          <h2 className="text-3xl font-black text-white leading-tight">Tu empresa en <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-400">5 minutos</span></h2>
          <ul className="space-y-2">
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5"/>Aislamiento total por empresa (schema dedicado)</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5"/>Crea vendedores y productos sin cruces</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 mt-0.5"/>Dashboard superadmin separado</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage(){
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando registro…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
