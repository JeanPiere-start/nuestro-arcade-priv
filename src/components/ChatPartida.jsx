import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/** Chat flotante dentro de una partida, asociado a partida_id. */
export default function ChatPartida({ partidaId, miId }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const finRef = useRef(null);

  useEffect(() => {
    if (!partidaId) return;
    supabase.from('mensajes_chat_partida').select('*').eq('partida_id', partidaId)
      .order('created_at', { ascending: true }).then(({ data }) => setMensajes(data || []));

    const channel = supabase
      .channel(`chat-partida-${partidaId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_chat_partida', filter: `partida_id=eq.${partidaId}` },
        (payload) => setMensajes((prev) => [...prev, payload.new])
      ).subscribe();

    return () => supabase.removeChannel(channel);
  }, [partidaId]);

  useEffect(() => { if (abierto) finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes, abierto]);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    await supabase.from('mensajes_chat_partida').insert({ partida_id: partidaId, autor_id: miId, contenido: texto.trim() });
    setTexto('');
  }

  return (
    <div className="fixed bottom-4 right-4 z-20">
      {!abierto && (
        <button onClick={() => setAbierto(true)} className="bg-arcade-accent rounded-full w-12 h-12 shadow-lg">💬</button>
      )}
      {abierto && (
        <div className="bg-arcade-panel rounded-xl p-3 w-64 shadow-xl">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold">Chat de partida</span>
            <button onClick={() => setAbierto(false)} className="text-white/50">✕</button>
          </div>
          <div className="h-40 overflow-y-auto space-y-1 mb-2">
            {mensajes.map((m) => (
              <div key={m.id} className={`text-xs ${m.autor_id === miId ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block px-2 py-1 rounded ${m.autor_id === miId ? 'bg-arcade-accent2/60' : 'bg-black/30'}`}>{m.contenido}</span>
              </div>
            ))}
            <div ref={finRef} />
          </div>
          <form onSubmit={enviar} className="flex gap-1">
            <input value={texto} onChange={(e) => setTexto(e.target.value)}
              className="flex-1 p-1 rounded bg-black/30 text-xs" placeholder="Pícale…" />
            <button className="bg-arcade-accent px-2 rounded text-xs">➤</button>
          </form>
        </div>
      )}
    </div>
  );
}
