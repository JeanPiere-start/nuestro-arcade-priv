import { useEffect, useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { supabase } from '../../lib/supabaseClient';
import ChatPartida from '../../components/ChatPartida';

const TOTAL_PREGUNTAS = 5;

async function traerPreguntaExterna() {
  try {
    const res = await fetch('https://the-trivia-api.com/v2/questions?limit=1');
    const [q] = await res.json();
    const opciones = [...q.incorrectAnswers, q.correctAnswer].sort(() => Math.random() - 0.5);
    return {
      pregunta: q.question.text,
      opciones,
      respuesta_correcta: opciones.indexOf(q.correctAnswer),
    };
  } catch {
    return null;
  }
}

export default function Trivia({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;
  const rivalId = p.jugador1_id === miId ? p.jugador2_id : p.jugador1_id;

  const ronda = p.tablero?.ronda || 0;
  const preguntaActual = p.tablero?.preguntaActual;
  const respuestas = p.tablero?.respuestas || {};
  const puntos = p.tablero?.puntos || {};
  const [inicioRonda, setInicioRonda] = useState(Date.now());

  useEffect(() => { setInicioRonda(Date.now()); }, [ronda]);

  async function siguientePregunta() {
    // Alterna: pares del banco personalizado de Supabase, impares de la API externa
    let pregunta;
    if (ronda % 2 === 0) {
      const { data } = await supabase.from('trivia_preguntas').select('*').order('id').limit(1).range(ronda, ronda);
      if (data?.[0]) pregunta = { pregunta: data[0].pregunta, opciones: data[0].opciones, respuesta_correcta: data[0].respuesta_correcta };
    }
    if (!pregunta) pregunta = await traerPreguntaExterna();
    if (!pregunta) return;

    await actualizarTablero({ ronda: ronda + 1, preguntaActual: pregunta, respuestas: {}, puntos });
  }

  async function responder(indice) {
    if (respuestas[miId] != null) return;
    const tiempoMs = Date.now() - inicioRonda;
    const nuevasRespuestas = { ...respuestas, [miId]: { indice, tiempoMs } };

    const ambosRespondieron = nuevasRespuestas[miId] && nuevasRespuestas[rivalId];
    let nuevosPuntos = puntos;

    if (indice === preguntaActual.respuesta_correcta) {
      const rivalCorrectoMasRapido = nuevasRespuestas[rivalId]?.indice === preguntaActual.respuesta_correcta
        && nuevasRespuestas[rivalId].tiempoMs < tiempoMs;
      const puntosGanados = rivalCorrectoMasRapido ? 5 : 10;
      nuevosPuntos = { ...puntos, [miId]: (puntos[miId] || 0) + puntosGanados };
      await supabase.rpc('sumar_puntos', { p_user_id: miId, p_puntos: puntosGanados, p_motivo: 'Trivia' });
    }

    const terminado = ronda >= TOTAL_PREGUNTAS;
    await actualizarTablero(
      { ronda, preguntaActual, respuestas: nuevasRespuestas, puntos: nuevosPuntos },
      terminado && ambosRespondieron ? { estado: 'terminada' } : {}
    );
  }

  if (!preguntaActual) {
    return (
      <div className="text-center space-y-3">
        <button onClick={siguientePregunta} className="bg-arcade-accent px-4 py-2 rounded">Empezar Trivia</button>
        <ChatPartida partidaId={p.id} miId={miId} />
      </div>
    );
  }

  const yaRespondi = respuestas[miId] != null;
  const ambosRespondieron = respuestas[miId] && respuestas[rivalId];

  return (
    <div className="space-y-3">
      <p className="text-center text-sm">Pregunta {ronda}/{TOTAL_PREGUNTAS} · Puntos: {puntos[miId] || 0} vs {puntos[rivalId] || 0}</p>
      <p className="text-center font-semibold">{preguntaActual.pregunta}</p>
      <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
        {preguntaActual.opciones.map((op, i) => (
          <button key={i} onClick={() => responder(i)} disabled={yaRespondi}
            className={`p-2 rounded text-left ${yaRespondi && i === preguntaActual.respuesta_correcta ? 'bg-green-600' : 'bg-arcade-panel'}`}>
            {op}
          </button>
        ))}
      </div>
      {ambosRespondieron && ronda < TOTAL_PREGUNTAS && (
        <button onClick={siguientePregunta} className="bg-arcade-accent2 px-3 py-1 rounded block mx-auto text-sm">Siguiente →</button>
      )}
      {p.estado === 'terminada' && <p className="text-center text-arcade-accent font-bold">¡Trivia terminada! 🎉</p>}
      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
