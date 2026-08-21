import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { playSound } from '../hooks/useSound';

export default function ChatGlobal() {
  const { profile } = useAuth();
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const finRef = useRef(null);

  useEffect(() => {
    supabase.from('mensajes_chat_global').select('*').order('created_at', { ascending: true })
      .then(({ data }) => setMensajes(data || []));

    const channel = supabase
      .channel('chat-global')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_chat_global' },
        (payload) => {
          setMensajes((prev) => [...prev, payload.new]);
          if (payload.new.autor_id !== profile?.id) playSound('notificacion');
        }
      ).subscribe();

    return () => supabase.removeChannel(channel);
  }, [profile?.id]);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes]);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    await supabase.from('mensajes_chat_global').insert({ autor_id: profile.id, contenido: texto.trim() });
    setTexto('');
  }

  return (
    <section className="bg-arcade-panel rounded-xl p-4">
      <h2 className="font-semibold mb-2">💬 Chat</h2>
      <div className="h-56 overflow-y-auto space-y-1 mb-2 pr-1">
        {mensajes.map((m) => (
          <div key={m.id} className={`text-sm ${m.autor_id === profile?.id ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block px-2 py-1 rounded-lg ${m.autor_id === profile?.id ? 'bg-arcade-accent2/60' : 'bg-black/30'}`}>
              {m.contenido}
            </span>
          </div>
        ))}
        <div ref={finRef} />
      </div>
      <form onSubmit={enviar} className="flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)}
          className="flex-1 p-2 rounded bg-black/30 text-sm" placeholder="Escribe algo…" />
        <button className="bg-arcade-accent px-3 rounded text-sm font-semibold">Enviar</button>
      </form>
    </section>
  );
}
