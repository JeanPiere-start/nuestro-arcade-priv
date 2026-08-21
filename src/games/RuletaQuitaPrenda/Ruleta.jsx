import { useEffect, useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import ChatPartida from '../../components/ChatPartida';

// Personaliza esta lista como quieran — son solo placeholders.
const PRENDAS = ['Zapatos', 'Calcetines', 'Reloj/Accesorio', 'Camisa', 'Pantalón', 'Lo que sigue…'];
const DURACION_CASTIGO = 15;

export default function Ruleta({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;
  const rivalId = p.jugador1_id === miId ? p.jugador2_id : p.jugador1_id;

  const resultadoIndice = p.tablero?.resultadoIndice;
  const girando = p.tablero?.girando;
  const [temporizador, setTemporizador] = useState(null);

  useEffect(() => {
    if (resultadoIndice != null && girando) {
      const t = setTimeout(async () => {
        await actualizarTablero({ ...p.tablero, girando: false });
        setTemporizador(DURACION_CASTIGO);
      }, 3000); // duración de la animación de giro
      return () => clearTimeout(t);
    }
  }, [resultadoIndice, girando]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (temporizador === null) return;
    if (temporizador <= 0) { setTemporizador(null); return; }
    const t = setTimeout(() => setTemporizador((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [temporizador]);

  async function girar() {
    // El resultado se calcula "en servidor" (aquí, antes de sincronizar)
    // para que ambos celulares vean caer la ruleta en la misma prenda.
    const indice = Math.floor(Math.random() * PRENDAS.length);
    await actualizarTablero({ resultadoIndice: indice, girando: true, turnoDe: miId });
  }

  const anguloPorPrenda = 360 / PRENDAS.length;
  const anguloFinal = resultadoIndice != null ? -(resultadoIndice * anguloPorPrenda) - anguloPorPrenda / 2 : 0;

  return (
    <div className="space-y-4 text-center">
      <div className="relative w-64 h-64 mx-auto">
        <div
          className="w-64 h-64 rounded-full border-4 border-arcade-accent flex items-center justify-center transition-transform"
          style={{
            transform: `rotate(${girando ? anguloFinal + 1440 : anguloFinal}deg)`,
            transitionDuration: girando ? '3s' : '0s',
            transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            background: `conic-gradient(${PRENDAS.map((_, i) => `${i % 2 ? '#7c5cff' : '#1c1330'} ${i * anguloPorPrenda}deg ${(i + 1) * anguloPorPrenda}deg`).join(',')})`,
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-2xl">🔻</div>
      </div>

      {!girando && resultadoIndice == null && (
        <button onClick={girar} className="bg-arcade-accent px-6 py-2 rounded-full font-bold">Girar 🎡</button>
      )}

      {!girando && resultadoIndice != null && (
        <div className="space-y-2">
          <p className="text-xl font-bold text-arcade-accent">Cayó en: {PRENDAS[resultadoIndice]}</p>
          {temporizador != null ? (
            <p>⏳ {temporizador}s</p>
          ) : (
            <button onClick={girar} className="bg-arcade-accent2 px-4 py-2 rounded-full text-sm">Girar de nuevo</button>
          )}
        </div>
      )}

      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
