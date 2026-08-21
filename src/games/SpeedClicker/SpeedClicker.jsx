import { useEffect, useRef, useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { supabase } from '../../lib/supabaseClient';
import { playSound, vibrar } from '../../hooks/useSound';
import ChatPartida from '../../components/ChatPartida';

const DURACION = 15; // segundos

export default function SpeedClicker({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;
  const rivalId = p.jugador1_id === miId ? p.jugador2_id : p.jugador1_id;

  const puntajes = p.tablero?.puntajes || {};
  const enCurso = p.tablero?.enCurso;
  const [misClics, setMisClics] = useState(0);
  const [segundosRestantes, setSegundosRestantes] = useState(DURACION);
  const [objetivos, setObjetivos] = useState([]);
  const intervaloRef = useRef(null);

  useEffect(() => {
    if (!enCurso) return;
    setMisClics(0);
    setSegundosRestantes(DURACION);

    const spawner = setInterval(() => {
      setObjetivos((prev) => [
        ...prev.slice(-5),
        { id: Math.random(), x: Math.random() * 80 + 5, y: Math.random() * 70 + 10 },
      ]);
    }, 500);

    intervaloRef.current = setInterval(() => {
      setSegundosRestantes((s) => {
        if (s <= 1) {
          clearInterval(intervaloRef.current);
          clearInterval(spawner);
          terminarRonda();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => { clearInterval(intervaloRef.current); clearInterval(spawner); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enCurso]);

  async function terminarRonda() {
    setMisClics((actuales) => {
      guardarPuntaje(actuales);
      return actuales;
    });
  }

  async function guardarPuntaje(clicsFinal) {
    const nuevosPuntajes = { ...puntajes, [miId]: clicsFinal };
    const ambosListos = nuevosPuntajes[miId] != null && nuevosPuntajes[rivalId] != null;
    let ganador = null;
    if (ambosListos) {
      ganador = nuevosPuntajes[miId] > nuevosPuntajes[rivalId] ? miId
        : nuevosPuntajes[rivalId] > nuevosPuntajes[miId] ? rivalId : null;
      if (ganador) await supabase.rpc('sumar_puntos', { p_user_id: ganador, p_puntos: 10, p_motivo: 'Speed Clicker' });
    }
    await actualizarTablero(
      { ...p.tablero, puntajes: nuevosPuntajes, enCurso: false },
      ambosListos ? { estado: 'terminada', ganador_id: ganador } : {}
    );
  }

  async function iniciarRonda() {
    await actualizarTablero({ puntajes: {}, enCurso: true });
  }

  function clicObjetivo(id) {
    playSound('clic');
    vibrar(20);
    setObjetivos((prev) => prev.filter((o) => o.id !== id));
    setMisClics((c) => c + 1);
  }

  if (!enCurso && puntajes[miId] == null) {
    return (
      <div className="text-center space-y-3">
        <p>15 segundos, el que más corazones toque gana 💥</p>
        <button onClick={iniciarRonda} className="bg-arcade-accent px-4 py-2 rounded">¡Empezar!</button>
        <ChatPartida partidaId={p.id} miId={miId} />
      </div>
    );
  }

  if (enCurso) {
    return (
      <div className="relative h-96 bg-arcade-panel rounded-xl overflow-hidden">
        <div className="absolute top-2 left-2 text-sm">⏱ {segundosRestantes}s · Clics: {misClics}</div>
        {objetivos.map((o) => (
          <button key={o.id} onClick={() => clicObjetivo(o.id)}
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
            className="absolute text-3xl">❤️</button>
        ))}
      </div>
    );
  }

  return (
    <div className="text-center space-y-2">
      <p>Tu puntaje: <b>{puntajes[miId] ?? '-'}</b> · Pareja: <b>{puntajes[rivalId] ?? 'esperando…'}</b></p>
      {p.ganador_id !== undefined && p.estado === 'terminada' && (
        <p className="text-arcade-accent font-bold">
          {p.ganador_id === miId ? '¡Ganaste! 🎉' : p.ganador_id ? 'Ganó tu pareja 💕' : 'Empate 🤝'}
        </p>
      )}
      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
