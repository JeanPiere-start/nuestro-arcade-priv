import { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { supabase } from '../../lib/supabaseClient';
import { playSound } from '../../hooks/useSound';
import ChatPartida from '../../components/ChatPartida';

function evaluarIntento(intento, solucion) {
  const resultado = Array(5).fill('gris');
  const solucionArr = solucion.split('');
  const intentoArr = intento.split('');

  intentoArr.forEach((letra, i) => {
    if (solucionArr[i] === letra) { resultado[i] = 'verde'; solucionArr[i] = null; }
  });
  intentoArr.forEach((letra, i) => {
    if (resultado[i] === 'gris' && solucionArr.includes(letra)) {
      resultado[i] = 'amarillo';
      solucionArr[solucionArr.indexOf(letra)] = null;
    }
  });
  return resultado;
}

const COLORES = { verde: 'bg-green-500', amarillo: 'bg-yellow-500', gris: 'bg-gray-600' };

export default function Wordle({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;
  const rivalId = p.jugador1_id === miId ? p.jugador2_id : p.jugador1_id;

  const modo = p.tablero?.modo; // 'reto' | 'competitivo'
  const solucion = p.tablero?.solucion; // solo debería existir si es competitivo o ya la propuso el rival
  const intentosMios = p.tablero?.intentos?.[miId] || [];
  const [propuesta, setPropuesta] = useState('');
  const [intentoActual, setIntentoActual] = useState('');

  async function proponerReto(e) {
    e.preventDefault();
    const palabra = propuesta.trim().toLowerCase();
    if (palabra.length !== 5) return alert('La palabra debe tener 5 letras.');
    await actualizarTablero({ modo: 'reto', solucion: palabra, propuestaPor: miId, intentos: {} });
    setPropuesta('');
  }

  async function iniciarCompetitivo() {
    // En producción: trae una palabra aleatoria de una lista/API propia.
    const banco = ['playa', 'novia', 'abrazo', 'cariño', 'juntos'].filter((w) => w.length === 5);
    const palabra = banco[Math.floor(Math.random() * banco.length)] || 'novia';
    await actualizarTablero({ modo: 'competitivo', solucion: palabra, intentos: {} });
  }

  async function enviarIntento(e) {
    e.preventDefault();
    const intento = intentoActual.trim().toLowerCase();
    if (intento.length !== 5) return;

    const resultado = evaluarIntento(intento, solucion);
    const nuevosIntentos = { ...(p.tablero.intentos || {}) };
    nuevosIntentos[miId] = [...(nuevosIntentos[miId] || []), { intento, resultado }];

    const gane = intento === solucion;
    if (gane) {
      playSound('victoria');
      await supabase.rpc('sumar_puntos', { p_user_id: miId, p_puntos: 15, p_motivo: 'Wordle' });
    }

    await actualizarTablero(
      { ...p.tablero, intentos: nuevosIntentos },
      gane ? { ganador_id: miId, estado: 'terminada' } : {}
    );
    setIntentoActual('');
  }

  // Quien propone el reto no debe verse a sí mismo la solución mientras el otro juega.
  if (!modo) {
    return (
      <div className="text-center space-y-4">
        <p>¿Cómo quieren jugar?</p>
        <form onSubmit={proponerReto} className="space-y-2">
          <input value={propuesta} onChange={(e) => setPropuesta(e.target.value)} maxLength={5}
            className="p-2 rounded bg-black/30 text-center uppercase" placeholder="Palabra secreta (5 letras)" />
          <button className="bg-arcade-accent px-3 py-1 rounded block mx-auto text-sm">Retar con esta palabra</button>
        </form>
        <div className="text-white/50 text-sm">— o —</div>
        <button onClick={iniciarCompetitivo} className="bg-arcade-accent2 px-4 py-2 rounded">Modo competitivo (misma palabra al azar)</button>
        <ChatPartida partidaId={p.id} miId={miId} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm">
        {modo === 'reto' ? 'Adivina la palabra que te retaron 🔤' : 'Modo competitivo: ¡el más rápido gana!'}
      </p>
      <div className="space-y-1 max-w-xs mx-auto">
        {intentosMios.map((row, i) => (
          <div key={i} className="flex gap-1 justify-center">
            {row.intento.split('').map((letra, j) => (
              <div key={j} className={`w-9 h-9 flex items-center justify-center rounded font-bold uppercase ${COLORES[row.resultado[j]]}`}>
                {letra}
              </div>
            ))}
          </div>
        ))}
      </div>
      {!p.ganador_id && intentosMios.length < 6 && (
        <form onSubmit={enviarIntento} className="flex gap-2 justify-center">
          <input value={intentoActual} onChange={(e) => setIntentoActual(e.target.value)} maxLength={5}
            className="p-2 rounded bg-black/30 text-center uppercase w-32" />
          <button className="bg-arcade-accent px-3 rounded text-sm">Probar</button>
        </form>
      )}
      {p.ganador_id && (
        <p className="text-center text-arcade-accent font-bold">
          {p.ganador_id === miId ? '¡La adivinaste! 🎉' : `Tu pareja ganó. La palabra era: ${solucion}`}
        </p>
      )}
      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
