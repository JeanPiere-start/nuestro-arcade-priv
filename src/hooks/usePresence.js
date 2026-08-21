import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Muestra quién de la pareja está "En línea" ahora mismo,
 * usando el canal de Presence de Supabase Realtime.
 */
export function usePresence(userId, nombre) {
  const [enLinea, setEnLinea] = useState([]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel('presencia-global', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const estado = channel.presenceState();
        setEnLinea(Object.values(estado).flat());
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, nombre, en_linea_desde: new Date().toISOString() });
        }
      });

    return () => supabase.removeChannel(channel);
  }, [userId, nombre]);

  return enLinea;
}
