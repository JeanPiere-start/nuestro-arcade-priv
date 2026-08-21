import { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { supabase, PRIVATE_BUCKET } from '../../lib/supabaseClient';
import { playSound } from '../../hooks/useSound';
import ChatPartida from '../../components/ChatPartida';

/**
 * Antes de jugar, sube al menos 8 fotos al bucket privado en la
 * carpeta `memory/` (ej. memory/viaje1.jpg). Este componente las
 * lista y genera signed URLs automáticamente para armar el tablero.
 */
async function generarTableroDesdeStorage() {
  const { data: archivos } = await supabase.storage.from(PRIVATE_BUCKET).list('memory');
  const nombres = (archivos || []).slice(0, 8).map((f) => `memory/${f.name}`);

  const urls = await Promise.all(
    nombres.map((path) => supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(path, 60 * 60))
  );

  const pares = urls.flatMap((u, i) => [
    { id: `${i}-a`, path: nombres[i], url: u.data?.signedUrl, parejaDe: i },
    { id: `${i}-b`, path: nombres[i], url: u.data?.signedUrl, parejaDe: i },
  ]);

  // barajar
  for (let i = pares.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pares[i], pares[j]] = [pares[j], pares[i]];
  }

  return pares.map((c) => ({ ...c, volteada: false, encontrada: false }));
}

export default function Memory({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;
  const [cargando, setCargando] = useState(false);

  const cartas = p.tablero?.cartas || [];
  const puntos = p.tablero?.puntos || {};
  const esMiTurno = p.turno_id === miId;
  const rivalId = p.jugador1_id === miId ? p.jugador2_id : p.jugador1_id;

  async function iniciar() {
    setCargando(true);
    const cartasNuevas = await generarTableroDesdeStorage();
    setCargando(false);
    if (cartasNuevas.length === 0) {
      alert('Sube al menos 4 fotos a la carpeta "memory" del bucket privado antes de jugar.');
      return;
    }
    await actualizarTablero({ cartas: cartasNuevas, puntos: {}, volteadasAhora: [] });
  }

  async function voltear(indice) {
    if (!esMiTurno) return;
    const carta = cartas[indice];
    if (carta.encontrada || carta.volteada) return;

    const volteadasAhora = p.tablero.volteadasAhora || [];
    if (volteadasAhora.length >= 2) return;

    const nuevasCartas = cartas.map((c, i) => (i === indice ? { ...c, volteada: true } : c));
    const nuevasVolteadas = [...volteadasAhora, indice];

    if (nuevasVolteadas.length < 2) {
      await actualizarTablero({ ...p.tablero, cartas: nuevasCartas, volteadasAhora: nuevasVolteadas });
      return;
    }

    // segunda carta: revisar coincidencia
    const [i1, i2] = nuevasVolteadas;
    const coincide = nuevasCartas[i1].parejaDe === nuevasCartas[i2].parejaDe;

    if (coincide) {
      playSound('acierto');
      const cartasFinal = nuevasCartas.map((c, i) => (i === i1 || i === i2 ? { ...c, encontrada: true } : c));
      const puntosFinal = { ...puntos, [miId]: (puntos[miId] || 0) + 1 };
      const terminado = cartasFinal.every((c) => c.encontrada);
      if (terminado) await supabase.rpc('sumar_puntos', { p_user_id: miId, p_puntos: 15, p_motivo: 'Memory' });
      await actualizarTablero(
        { cartas: cartasFinal, puntos: puntosFinal, volteadasAhora: [] },
        { estado: terminado ? 'terminada' : 'en_curso', ganador_id: terminado ? miId : null }
      );
    } else {
      // pequeña espera visual antes de voltear boca abajo, y pasa el turno
      await actualizarTablero({ ...p.tablero, cartas: nuevasCartas, volteadasAhora: nuevasVolteadas });
      setTimeout(async () => {
        const cartasOcultas = nuevasCartas.map((c, i) => (i === i1 || i === i2 ? { ...c, volteada: false } : c));
        await actualizarTablero({ cartas: cartasOcultas, puntos, volteadasAhora: [] }, { turno_id: rivalId });
      }, 1200);
    }
  }

  if (cartas.length === 0) {
    return (
      <div className="text-center space-y-3">
        <p>Sube fotos a la carpeta <code>memory/</code> del bucket privado y comienza.</p>
        <button onClick={iniciar} disabled={cargando} className="bg-arcade-accent px-4 py-2 rounded">
          {cargando ? 'Cargando fotos…' : 'Generar tablero'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm">{esMiTurno ? '👉 Tu turno' : 'Turno del rival…'}</p>
      <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
        {cartas.map((c, i) => (
          <button key={c.id} onClick={() => voltear(i)}
            className="aspect-square bg-arcade-panel rounded-lg overflow-hidden">
            {(c.volteada || c.encontrada) ? (
              <img src={c.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-arcade-accent2/30" />
            )}
          </button>
        ))}
      </div>
      {p.ganador_id && <p className="text-center text-arcade-accent font-bold">¡Tablero completo! 🎉</p>}
      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
