import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

function tiempoRestante(fecha) {
  const diff = new Date(fecha) - new Date();
  if (diff <= 0) return null;
  const dias = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  return dias > 0 ? `${dias}d ${horas}h` : `${horas}h`;
}

export default function BuzonTiempo() {
  const { profile } = useAuth();
  const [capsulas, setCapsulas] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [contenido, setContenido] = useState('');
  const [fecha, setFecha] = useState('');

  async function cargar() {
    const { data } = await supabase.from('capsulas_tiempo').select('*').order('fecha_desbloqueo', { ascending: true });
    setCapsulas(data || []);
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e) {
    e.preventDefault();
    // El destinatario es "el otro"; en la práctica cualquiera de los
    // dos puede abrirla igual gracias a la política RLS de pareja.
    await supabase.from('capsulas_tiempo').insert({
      autor_id: profile.id,
      destinatario_id: profile.id,
      contenido,
      fecha_desbloqueo: fecha,
    });
    setContenido(''); setFecha(''); setMostrarForm(false);
    cargar();
  }

  async function abrir(capsula) {
    const restante = tiempoRestante(capsula.fecha_desbloqueo);
    if (restante) {
      alert(`🔒 Caja fuerte cerrada. Se abre en: ${restante}`);
      return;
    }
    await supabase.from('capsulas_tiempo').update({ abierta: true }).eq('id', capsula.id);
    alert(`💌 ${capsula.contenido}`);
    cargar();
  }

  return (
    <section className="bg-arcade-panel rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">🔐 Buzón de Tiempo</h2>
        <button onClick={() => setMostrarForm((v) => !v)} className="text-arcade-accent2 text-sm">+ Nueva cápsula</button>
      </div>

      {mostrarForm && (
        <form onSubmit={crear} className="space-y-2 mb-3">
          <textarea value={contenido} onChange={(e) => setContenido(e.target.value)}
            className="w-full p-2 rounded bg-black/30 text-sm" placeholder="Tu mensaje sorpresa…" required />
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="w-full p-2 rounded bg-black/30 text-sm" required />
          <button className="bg-arcade-accent px-3 py-1 rounded text-sm">Guardar cápsula</button>
        </form>
      )}

      <div className="space-y-2">
        {capsulas.map((c) => {
          const restante = tiempoRestante(c.fecha_desbloqueo);
          return (
            <button key={c.id} onClick={() => abrir(c)}
              className="w-full text-left bg-black/30 rounded-lg p-3 flex justify-between items-center">
              <span>{restante ? '🔒 Caja fuerte' : '🎁 ¡Lista para abrir!'}</span>
              <span className="text-xs text-white/60">{restante ? `Se abre en: ${restante}` : ''}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
