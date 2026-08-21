import { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { supabase } from '../../lib/supabaseClient';
import { playSound, vibrar } from '../../hooks/useSound';
import PhotoUploader from './PhotoUploader';
import ChatPartida from '../../components/ChatPartida';

const LINEAS_GANADORAS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function revisarGanador(casillas) {
  for (const [a, b, c] of LINEAS_GANADORAS) {
    if (casillas[a] && casillas[a] === casillas[b] && casillas[a] === casillas[c]) {
      return casillas[a];
    }
  }
  return null;
}

export default function TicTacToe({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;
  const [miFotoUrl, setMiFotoUrl] = useState(null);

  const casillas = p.tablero?.casillas || Array(9).fill(null);
  const fotos = p.tablero?.fotos || {}; // { userId: signedUrl }
  const esMiTurno = p.turno_id === miId;
  const rivalId = p.jugador1_id === miId ? p.jugador2_id : p.jugador1_id;

  async function jugar(indice) {
    if (!esMiTurno || casillas[indice] || p.ganador_id) return;

    const nuevasCasillas = [...casillas];
    nuevasCasillas[indice] = miId;

    const ganador = revisarGanador(nuevasCasillas);
    const nuevoTablero = { casillas: nuevasCasillas, fotos: { ...fotos, [miId]: miFotoUrl || fotos[miId] } };

    if (ganador) {
      playSound('victoria');
      await supabase.rpc('sumar_puntos', { p_user_id: ganador, p_puntos: 10, p_motivo: '3 en raya' });
    } else {
      vibrar(50);
    }

    await actualizarTablero(nuevoTablero, {
      turno_id: rivalId,
      ganador_id: ganador || null,
      estado: ganador || nuevasCasillas.every(Boolean) ? 'terminada' : 'en_curso',
    });
  }

  function avatarPara(userId) {
    const url = userId === miId ? (miFotoUrl || fotos[miId]) : fotos[userId];
    return url ? (
      <img src={url} alt="" className="w-10 h-10 rounded-full object-cover mx-auto" />
    ) : (
      <div className="w-10 h-10 rounded-full bg-arcade-accent2/40 mx-auto" />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <PhotoUploader userId={miId} onUploaded={(url) => setMiFotoUrl(url)} />
        <span className="text-sm">{esMiTurno ? '👉 Tu turno' : 'Turno del rival…'}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {casillas.map((valor, i) => (
          <button key={i} onClick={() => jugar(i)}
            className="aspect-square bg-arcade-panel rounded-lg flex items-center justify-center">
            {valor && avatarPara(valor)}
          </button>
        ))}
      </div>

      {p.ganador_id && (
        <p className="text-center text-arcade-accent font-bold">
          {p.ganador_id === miId ? '¡Ganaste! 🎉' : 'Ganó tu pareja 💕'}
        </p>
      )}

      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
