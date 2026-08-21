import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Leaderboard() {
  const [perfiles, setPerfiles] = useState([]);
  const [vales, setVales] = useState([]);

  async function cargar() {
    const { data: p } = await supabase.from('profiles').select('*').order('puntos_totales', { ascending: false });
    const { data: v } = await supabase.from('vales').select('*').eq('canjeado', false);
    setPerfiles(p || []);
    setVales(v || []);
  }

  useEffect(() => { cargar(); }, []);

  async function canjear(vale, perfil) {
    if (perfil.puntos_totales < vale.costo_puntos) {
      alert('No tienes suficientes puntos todavía.');
      return;
    }
    await supabase.rpc('sumar_puntos', { p_user_id: perfil.id, p_puntos: -vale.costo_puntos, p_motivo: `Canje: ${vale.titulo}` });
    await supabase.from('vales').update({ canjeado: true, canjeado_por: perfil.id, canjeado_en: new Date().toISOString() }).eq('id', vale.id);
    cargar();
  }

  return (
    <section className="bg-arcade-panel rounded-xl p-4">
      <h2 className="font-semibold mb-2">🏆 Marcador y Vales</h2>
      <div className="flex gap-4 mb-3">
        {perfiles.map((p) => (
          <div key={p.id} className="bg-black/30 rounded-lg p-2 flex-1 text-center">
            <div className="text-sm">{p.nombre}</div>
            <div className="text-xl font-bold text-arcade-accent">{p.puntos_totales}</div>
          </div>
        ))}
      </div>
      {vales.length > 0 && (
        <div className="space-y-1">
          {vales.map((v) => (
            <div key={v.id} className="flex justify-between items-center text-sm bg-black/20 rounded p-2">
              <span>{v.titulo} — {v.costo_puntos} pts</span>
              {perfiles.map((p) => (
                <button key={p.id} onClick={() => canjear(v, p)} className="text-arcade-accent2 text-xs ml-2">
                  Canjear ({p.nombre})
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
