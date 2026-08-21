import { useGameState } from '../../hooks/useGameState';
import ChatPartida from '../../components/ChatPartida';

// Personaliza libremente estas listas. Están organizadas por
// "nivel de intensidad" (0 = suave, 2 = más atrevido) para que el
// algoritmo de temperatura vaya escalando con los turnos.
const ACCIONES = [
  ['Acariciar', 'Besar', 'Abrazar'],
  ['Susurrar al oído', 'Masajear', 'Morder suave'],
  ['Personaliza este nivel', 'Personaliza este nivel', 'Personaliza este nivel'],
];
const ZONAS = [
  ['Espalda', 'Manos', 'Cuello'],
  ['Cintura', 'Piernas', 'Orejas'],
  ['Personaliza este nivel', 'Personaliza este nivel', 'Personaliza este nivel'],
];

function nivelSegunTurno(turno) {
  if (turno < 3) return 0;
  if (turno < 6) return 1;
  return 2;
}

export default function Dados({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;

  const turno = p.tablero?.turno || 0;
  const resultado = p.tablero?.resultado;

  async function tirar() {
    const nivel = nivelSegunTurno(turno);
    const accion = ACCIONES[nivel][Math.floor(Math.random() * ACCIONES[nivel].length)];
    const zona = ZONAS[nivel][Math.floor(Math.random() * ZONAS[nivel].length)];
    await actualizarTablero({ turno: turno + 1, resultado: { accion, zona, nivel } });
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-white/60">Turno {turno} · Intensidad: {'🔥'.repeat((resultado?.nivel ?? 0) + 1)}</p>

      <div className="flex justify-center gap-4">
        <div className="w-20 h-20 bg-arcade-panel rounded-xl flex items-center justify-center text-sm font-bold px-2 text-center">
          {resultado?.accion || '🎲'}
        </div>
        <div className="w-20 h-20 bg-arcade-panel rounded-xl flex items-center justify-center text-sm font-bold px-2 text-center">
          {resultado?.zona || '🎲'}
        </div>
      </div>

      <button onClick={tirar} className="bg-arcade-accent px-6 py-2 rounded-full font-bold">Lanzar dados</button>

      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
