'use client';

import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

const grupos = ['Todos', 'Grupo Domingo', 'Grupo Lunes', 'Grupo Martes', 'Grupo Miercoles', 'Grupo Jueves', 'Grupo Viernes', 'Grupo Sabado'];

const dias = [
  { dia: 0, nombre: 'domingo' },
  { dia: 1, nombre: 'lunes' },
  { dia: 2, nombre: 'martes' },
  { dia: 3, nombre: 'miércoles' },
  { dia: 4, nombre: 'jueves' },
  { dia: 5, nombre: 'viernes' },
  { dia: 6, nombre: 'sábado' },
];

function diaNombre(dia) {
  return dias.find((d) => d.dia === Number(dia))?.nombre || '';
}

// El día SÍ se guarda (dia 0-6 + dia_nombre). Esta función lo muestra aunque
// vengan filas viejas con dia_nombre vacío o en mayúsculas.
function labelDia(c) {
  const nombre = (c.dia_nombre || diaNombre(c.dia) || '').toString().toLowerCase();
  const num = c.dia !== undefined && c.dia !== null && c.dia !== '' ? ` · día ${c.dia}` : '';
  return nombre ? `${nombre}${num}` : `día ${c.dia ?? '—'}`;
}

export default function Page() {
  const [cobros, setCobros] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [grupo, setGrupo] = useState('Grupo Martes');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'crear' | 'editar'
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [f, setF] = useState({ name: '', grupo: 'Grupo Martes', dia: 2, recorrido: '', observacion: '', seller_id: '', activo: true });

  const load = async (g) => {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const gg = g ?? grupo;
      const q = gg && gg !== 'Todos' ? `?grupo=${encodeURIComponent(gg)}` : '';
      const res = await fetch(`/api/cobros${q}`, { credentials: 'include', headers });
      const data = await res.json();
      setCobros(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load(grupo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo]);

  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const r = await fetch('/api/sellers', { credentials: 'include', headers }).then((x) => x.json().catch(() => []));
        const list = Array.isArray(r) ? r.filter((s) => (s.role || 'seller') === 'seller') : [];
        setSellers(list);
      } catch {}
    })();
  }, []);

  function openCreate() {
    setErr('');
    setMsg('');
    setEditing(null);
    setF({ name: '', grupo: grupo === 'Todos' ? 'Grupo Martes' : grupo, dia: 2, recorrido: '', observacion: '', seller_id: '', activo: true });
    setModal('crear');
  }

  function openEdit(c) {
    setErr('');
    setMsg('');
    setEditing(c);
    setF({
      name: c.name || '',
      grupo: c.grupo || grupo,
      dia: c.dia ?? 2,
      recorrido: c.recorrido || '',
      observacion: c.observacion || '',
      seller_id: c.seller_id || '',
      activo: c.activo !== false,
    });
    setModal('editar');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!f.name.trim()) {
      setErr('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const token = getToken();
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      if (modal === 'editar' && editing?.id) {
        const payload = {
          id: editing.id,
          name: f.name.trim(),
          grupo: f.grupo,
          dia: Number(f.dia),
          dia_nombre: diaNombre(f.dia),
          recorrido: f.recorrido.trim() || null,
          observacion: f.observacion.trim() || null,
          seller_id: f.seller_id || null,
          activo: !!f.activo,
        };
        const res = await fetch('/api/cobros', { method: 'PATCH', credentials: 'include', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.error || `Error ${res.status}`);
        setMsg(`Cobro actualizado (grupo ${payload.grupo})`);
        setModal(null);
        setEditing(null);
        if (payload.grupo !== grupo) setGrupo(payload.grupo);
        else load(payload.grupo);
      } else {
        const payload = {
          name: f.name.trim(),
          grupo: f.grupo,
          dia: Number(f.dia),
          dia_nombre: diaNombre(f.dia),
          recorrido: f.recorrido.trim() || null,
          observacion: f.observacion.trim() || null,
          seller_id: f.seller_id || null,
        };
        const res = await fetch('/api/cobros', { method: 'POST', credentials: 'include', headers, body: JSON.stringify(payload) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error(data.error || `Error ${res.status}`);
        setMsg(`Cobro creado en ${payload.grupo}`);
        setModal(null);
        if (payload.grupo !== grupo) setGrupo(payload.grupo);
        else load(payload.grupo);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c) {
    if (!confirm(`¿Eliminar el cobro "${c.name}"?`)) return;
    setErr('');
    setMsg('');
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/cobros?id=${encodeURIComponent(c.id)}`, { method: 'DELETE', credentials: 'include', headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || `Error ${res.status}`);
      setMsg('Cobro eliminado');
      load(grupo);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <div>
        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Inventario, Credito y Recaudo</p>
        <h1 className="text-2xl font-black text-slate-900">Configuración de Cobros</h1>
        {(msg || err) && (
          <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-bold ${err ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
            {err || msg}
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className="border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 focus:ring-2 focus:ring-amber-200">
            {grupos.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <button onClick={openCreate} className="px-3 py-2 rounded-lg bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700">+ Agregar Cobro</button>
          <span className="text-xs text-slate-500 ml-auto">{cobros.length} cobros</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] text-slate-600 border-b border-slate-200">
                <th className="text-left py-2">Nombre</th>
                <th>Día</th>
                <th>Vendedor</th>
                <th>Recorrido</th>
                <th>Observación</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-xs text-slate-400">
                    Cargando...
                  </td>
                </tr>
              ) : cobros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-xs text-slate-400">
                    No hay cobros registrados para el grupo {grupo}
                  </td>
                </tr>
              ) : (
                cobros.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="py-2 font-bold text-slate-900">{c.name}</td>
                    <td className="text-center capitalize font-semibold text-slate-700">{labelDia(c)}</td>
                    <td className="text-center text-slate-600">{c.seller_name || '—'}</td>
                    <td className="text-center text-slate-600">{c.recorrido || '—'}</td>
                    <td className="text-center text-slate-600 truncate max-w-[200px]">{c.observacion || '—'}</td>
                    <td className="text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${c.activo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{c.activo !== false ? 'Sí' : 'No'}</span>
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <button onClick={() => openEdit(c)} title="Editar" className="px-2 py-1 rounded-lg hover:bg-blue-50 text-[#2563eb] font-bold">✎</button>
                      <button onClick={() => handleDelete(c)} title="Eliminar" className="px-2 py-1 rounded-lg hover:bg-red-50 text-red-600 font-bold">🗑</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="font-black text-slate-900">{modal === 'editar' ? 'Editar Cobro' : 'Agregar Cobro'}</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Nombre *</label>
                <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ej: Cobro Centro" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Grupo</label>
                  <select value={f.grupo} onChange={(e) => setF({ ...f, grupo: e.target.value })} className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-bold bg-amber-50 text-slate-900 mt-1">
                    {grupos.filter((g) => g !== 'Todos').map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Día *</label>
                  <select value={f.dia} onChange={(e) => setF({ ...f, dia: Number(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1">
                    {dias.map((d) => (
                      <option key={d.dia} value={d.dia} className="capitalize">{d.nombre} ({d.dia})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Vendedor (opcional)</label>
                <select value={f.seller_id} onChange={(e) => setF({ ...f, seller_id: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1">
                  <option value="">Sin asignar</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.phone ? ` — ${s.phone}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Recorrido</label>
                <input value={f.recorrido} onChange={(e) => setF({ ...f, recorrido: e.target.value })} placeholder="Ej: Centro - Plaza" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Observación</label>
                <input value={f.observacion} onChange={(e) => setF({ ...f, observacion: e.target.value })} placeholder="Nota opcional" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white mt-1" />
              </div>
              {modal === 'editar' && (
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <input type="checkbox" checked={!!f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} className="w-4 h-4" />
                  Activo
                </label>
              )}
              {err && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={() => setModal(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#2563eb] text-white text-sm font-bold disabled:opacity-60">{saving ? 'Guardando...' : modal === 'editar' ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
