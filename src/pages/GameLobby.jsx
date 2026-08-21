import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';
import { crearPartida, unirseAPartida } from '../hooks/useGameState';

import TicTacToe from '../games/TicTacToe/TicTacToe';
import Memory from '../games/Memory/Memory';
import BattleShip from '../games/BattleShip/BattleShip';
import Wordle from '../games/Wordle/Wordle';
import SpeedClicker from '../games/SpeedClicker/SpeedClicker';
import Trivia from '../games/Trivia/Trivia';
import TuttiFrutti from '../games/TuttiFrutti/TuttiFrutti';
import SharedCanvas from '../games/SharedCanvas/SharedCanvas';
import Ruleta from '../games/RuletaQuitaPrenda/Ruleta';
import Dados from '../games/DadosDeseo/Dados';

const COMPONENTES = {
  tictactoe: TicTacToe,
  memory: Memory,
  battleship: BattleShip,
  wordle: Wordle,
  speedclicker: SpeedClicker,
  trivia: Trivia,
  tuttifrutti: TuttiFrutti,
  canvas: SharedCanvas,
  ruleta: Ruleta,
  dados: Dados,
};

export default function GameLobby() {
  const { tipoJuego } = useParams();
  const { profile } = useAuth();
  const [partida, setPartida] = useState(null);
  const [buscando, setBuscando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!profile) return;
    let activo = true;

    async function buscarOCrear() {
      // ¿Hay una partida de este tipo esperando (creada por el otro)?
      const { data: existentes } = await supabase
        .from('partidas')
        .select('*')
        .eq('tipo_juego', tipoJuego)
        .eq('estado', 'esperando')
        .neq('jugador1_id', profile.id)
        .limit(1);

      if (!activo) return;

      if (existentes && existentes.length > 0) {
        await unirseAPartida(existentes[0].id, profile.id);
        setPartida({ ...existentes[0], jugador2_id: profile.id, estado: 'en_curso' });
      } else {
        // ¿Ya tengo yo una esperando? reutilízala en vez de crear otra.
        const { data: propia } = await supabase
          .from('partidas')
          .select('*')
          .eq('tipo_juego', tipoJuego)
          .eq('estado', 'esperando')
          .eq('jugador1_id', profile.id)
          .limit(1);

        if (propia && propia.length > 0) {
          setPartida(propia[0]);
        } else {
          const nueva = await crearPartida(tipoJuego, profile.id);
          setPartida(nueva);
        }
      }
      setBuscando(false);
    }

    buscarOCrear();
    return () => { activo = false; };
  }, [tipoJuego, profile]);

  // Escucha si alguien se une mientras esperamos
  useEffect(() => {
    if (!partida || partida.estado !== 'esperando') return;
    const channel = supabase
      .channel(`lobby-${partida.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'partidas', filter: `id=eq.${partida.id}` },
        (payload) => setPartida(payload.new)
      ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [partida]);

  const JuegoComponente = COMPONENTES[tipoJuego];

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <button onClick={() => navigate('/')} className="text-sm text-white/60 mb-4">← Volver</button>
      {buscando && <p>Buscando o creando partida…</p>}
      {!buscando && partida?.estado === 'esperando' && (
        <p className="text-center text-arcade-accent2">Esperando a mi pareja… 💌</p>
      )}
      {!buscando && partida?.estado !== 'esperando' && JuegoComponente && (
        <JuegoComponente partida={partida} miId={profile.id} />
      )}
      {!JuegoComponente && <p>Juego no encontrado.</p>}
    </div>
  );
}
