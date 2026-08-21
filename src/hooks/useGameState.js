import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Motor genérico de sincronización de partidas.
 * Todos los juegos por turnos (3 en raya, memory, batalla naval,
 * wordle reto) reutilizan este hook: leen/escriben en la columna
 * `tablero` (jsonb) de la fila `partidas` y reciben los cambios
 * del rival en tiempo real vía postgres_changes.
 */
export function useGameState(partidaId) {
  const [partida, setPartida] = useState(null);

  useEffect(() => {
    if (!partidaId) return;

    supabase.from('partidas').select('*').eq('id', partidaId).single()
      .then(({ data }) => setPartida(data));

    const channel = supabase
      .channel(`partida-${partidaId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'partidas', filter: `id=eq.${partidaId}` },
        (payload) => setPartida(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [partidaId]);

  const actualizarTablero = useCallback(async (nuevoTablero, extra = {}) => {
    const { error } = await supabase
      .from('partidas')
      .update({ tablero: nuevoTablero, ...extra })
      .eq('id', partidaId);
    if (error) console.error(error);
  }, [partidaId]);

  return { partida, actualizarTablero };
}

/** Crea una partida nueva de un tipo dado y la deja "esperando". */
export async function crearPartida(tipoJuego, jugador1Id, tableroInicial = {}) {
  const { data, error } = await supabase
    .from('partidas')
    .insert({ tipo_juego: tipoJuego, jugador1_id: jugador1Id, turno_id: jugador1Id, tablero: tableroInicial })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** El segundo jugador se une a una partida en espera. */
export async function unirseAPartida(partidaId, jugador2Id) {
  const { error } = await supabase
    .from('partidas')
    .update({ jugador2_id: jugador2Id, estado: 'en_curso' })
    .eq('id', partidaId);
  if (error) throw error;
}
