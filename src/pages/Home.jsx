import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePresence } from '../hooks/usePresence';
import ChatGlobal from '../components/ChatGlobal';
import BuzonTiempo from '../components/BuzonTiempo';
import Leaderboard from '../components/Leaderboard';

const JUEGOS = [
  { tipo: 'tictactoe', nombre: '3 en Raya', emoji: '❌⭕' },
  { tipo: 'memory', nombre: 'Memoria', emoji: '🃏' },
  { tipo: 'battleship', nombre: 'Batalla Naval', emoji: '🚢' },
  { tipo: 'wordle', nombre: 'Wordle', emoji: '🔤' },
  { tipo: 'speedclicker', nombre: 'Speed Clicker', emoji: '⚡' },
  { tipo: 'trivia', nombre: 'Trivia', emoji: '🧠' },
  { tipo: 'tuttifrutti', nombre: 'Tutti Frutti / Stop', emoji: '🛑' },
  { tipo: 'canvas', nombre: 'Lienzo Compartido', emoji: '🎨' },
];

const ZONA_PICANTE = [
  { tipo: 'ruleta', nombre: 'Ruleta Quita Prenda', emoji: '🎡' },
  { tipo: 'dados', nombre: 'Dados del Deseo', emoji: '🎲' },
];

export default function Home() {
  const { profile, cerrarSesion } = useAuth();
  const enLinea = usePresence(profile?.id, profile?.nombre);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-arcade-accent">Nuestro Arcade Privado</h1>
          <p className="text-sm text-white/60">
            {enLinea.length > 1 ? '💕 Ambos en línea' : `Hola, ${profile?.nombre || ''}`}
          </p>
        </div>
        <button onClick={cerrarSesion} className="text-sm text-white/60 underline">Cerrar sesión</button>
      </header>

      <section>
        <h2 className="font-semibold mb-2">Juegos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {JUEGOS.map((j) => (
            <Link key={j.tipo} to={`/juego/${j.tipo}`}
              className="bg-arcade-panel rounded-xl p-4 text-center hover:bg-arcade-accent2/30 transition">
              <div className="text-3xl mb-1">{j.emoji}</div>
              <div className="text-sm">{j.nombre}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2 text-arcade-accent">🔥 Zona Picante</h2>
        <div className="grid grid-cols-2 gap-3">
          {ZONA_PICANTE.map((j) => (
            <Link key={j.tipo} to={`/juego/${j.tipo}`}
              className="bg-black/40 border border-arcade-accent/50 rounded-xl p-4 text-center hover:bg-arcade-accent/20 transition">
              <div className="text-3xl mb-1">{j.emoji}</div>
              <div className="text-sm">{j.nombre}</div>
            </Link>
          ))}
        </div>
      </section>

      <Leaderboard />
      <BuzonTiempo />
      <ChatGlobal />
    </div>
  );
}
