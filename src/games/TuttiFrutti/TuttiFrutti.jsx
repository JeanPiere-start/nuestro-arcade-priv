import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useGameState } from '../../hooks/useGameState';
import ChatPartida from '../../components/ChatPartida';

const CATEGORIAS = ['Nombre', 'Animal', 'Fruta', 'País', 'Color', 'Comida'];
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function TuttiFrutti({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;
  const rivalId = p.jugador1_id === miId ? p.jugador2_id : p.jugador1_id;

  const letra = p.tablero?.letra;
  const bloqueado = p.tablero?.bloqueado; // true tras el STOP
  const resultados = p.tablero?.resultados || {};
  const [respuestas, setRespuestas] = useState({});
  const [canal, setCanal] = useState(null);

  useEffect(() => {
    const ch = supabase.channel(`tuttifrutti-${p.id}`);
    ch.on('broadcast', { event: 'stop' }, async () => {
      // el rival presionó STOP: bloquear mis campos también
      setCanal((c) => c); // noop, el estado real de bloqueo viene de la DB
    }).subscribe();
    setCanal(ch);
    return () => supabase.removeChannel(ch);
  }, [p.id]);

  async function nuevaRonda() {
    const nuevaLetra = LETRAS[Math.floor(Math.random() * LETRAS.length)];
    setRespuestas({});
    await actualizarTablero({ letra: nuevaLetra, bloqueado: false, resultados: {} });
  }

  async function presionarStop() {
    await canal?.send({ type: 'broadcast', event: 'stop', payload: { por: miId } });
    await calificarYEnviar();
  }

  function calcularPuntaje(misRespuestas, respuestasRival) {
    let total = 0;
    for (const cat of CATEGORIAS) {
      const mia = (misRespuestas[cat] || '').trim().toLowerCase();
      if (!mia || mia[0] !== letra.toLowerCase()) continue;
      const rival = (respuestasRival?.[cat] || '').trim().toLowerCase();
      total += mia === rival ? 50 : 100;
    }
    return total;
  }

  async function calificarYEnviar() {
    const puntaje = calcularPuntaje(respuestas, resultados[rivalId]?.respuestas);
    const nuevosResultados = { ...resultados, [miId]: { respuestas, puntaje } };
    await actualizarTablero({ letra, bloqueado: true, resultados: nuevosResultados });
  }

  // Cuando el rival presiona STOP, a mí también se me bloquean los
  // campos: en cuanto detecto bloqueado=true, envío mi puntaje con
  // lo que ya llevaba escrito.
  useEffect(() => {
    if (bloqueado && !resultados[miId]) {
      calificarYEnviar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloqueado]);

  if (!letra) {
    return (
      <div className="text-center space-y-3">
        <button onClick={nuevaRonda} className="bg-arcade-accent px-4 py-2 rounded">Sortear letra</button>
        <ChatPartida partidaId={p.id} miId={miId} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-2xl font-bold text-arcade-accent">Letra: {letra}</p>
      <div className="space-y-2 max-w-sm mx-auto">
        {CATEGORIAS.map((cat) => (
          <input key={cat} disabled={bloqueado} placeholder={cat}
            value={respuestas[cat] || ''}
            onChange={(e) => setRespuestas((r) => ({ ...r, [cat]: e.target.value }))}
            className="w-full p-2 rounded bg-black/30 text-sm" />
        ))}
      </div>
      {!bloqueado && (
        <button onClick={presionarStop} className="bg-red-600 px-6 py-2 rounded-full block mx-auto font-bold">🛑 STOP</button>
      )}
      {bloqueado && resultados[miId] && !resultados[rivalId] && <p className="text-center text-sm">Esperando a tu pareja…</p>}
      {resultados[miId] && resultados[rivalId] && (
        <div className="text-center space-y-1">
          <p>Tú: {resultados[miId].puntaje} pts · Pareja: {resultados[rivalId].puntaje} pts</p>
          <button onClick={nuevaRonda} className="bg-arcade-accent2 px-3 py-1 rounded text-sm">Otra ronda →</button>
        </div>
      )}
      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
