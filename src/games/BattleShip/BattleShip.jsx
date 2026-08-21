import { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { supabase } from '../../lib/supabaseClient';
import { playSound, vibrar } from '../../hooks/useSound';
import ChatPartida from '../../components/ChatPartida';

const TAM = 10;
const BARCOS = [
  { nombre: 'Viaje a la playa', tam: 4 },
  { nombre: 'Cena favorita', tam: 3 },
  { nombre: 'Regalo sorpresa', tam: 3 },
  { nombre: 'Peli del finde', tam: 2 },
  { nombre: 'Café de la mañana', tam: 2 },
];

function celdaVacia() {
  return Array.from({ length: TAM }, () => Array.from({ length: TAM }, () => null));
}

/**
 * NOTA DE SEGURIDAD: las posiciones de MIS barcos se guardan en
 * `tablero.posiciones[miId]`, pero solo yo debería leerlas en el
 * cliente. Como la fila de `partidas` es compartida, este ejemplo
 * confía en que ninguno de los dos inspeccione el payload — para
 * una versión 100% a prueba de trampas, guarda las posiciones en
 * una tabla aparte con RLS "solo el dueño puede hacer SELECT".
 */
export default function BattleShip({ partida, miId }) {
  const { partida: partidaLive, actualizarTablero } = useGameState(partida.id);
  const p = partidaLive || partida;
  const rivalId = p.jugador1_id === miId ? p.jugador2_id : p.jugador1_id;

  const posiciones = p.tablero?.posiciones || {};
  const disparos = p.tablero?.disparos || {}; // { userId: [[f,c], ...] }
  const misBarcos = posiciones[miId];
  const esMiTurno = p.turno_id === miId;

  const [colocando, setColocando] = useState(BARCOS[0]);
  const [orientacion, setOrientacion] = useState('h');
  const [gridLocal, setGridLocal] = useState(celdaVacia());
  const [indiceBarco, setIndiceBarco] = useState(0);

  function puedeColocar(f, c, tam, ori) {
    for (let i = 0; i < tam; i++) {
      const ff = ori === 'h' ? f : f + i;
      const cc = ori === 'h' ? c + i : c;
      if (ff >= TAM || cc >= TAM || gridLocal[ff][cc]) return false;
    }
    return true;
  }

  function colocarBarco(f, c) {
    if (indiceBarco >= BARCOS.length) return;
    const barco = BARCOS[indiceBarco];
    if (!puedeColocar(f, c, barco.tam, orientacion)) return;

    const nuevo = gridLocal.map((fila) => [...fila]);
    for (let i = 0; i < barco.tam; i++) {
      const ff = orientacion === 'h' ? f : f + i;
      const cc = orientacion === 'h' ? c + i : c;
      nuevo[ff][cc] = barco.nombre;
    }
    setGridLocal(nuevo);
    setIndiceBarco((v) => v + 1);
    if (indiceBarco + 1 < BARCOS.length) setColocando(BARCOS[indiceBarco + 1]);
  }

  async function confirmarFlota() {
    await actualizarTablero({
      ...p.tablero,
      posiciones: { ...posiciones, [miId]: gridLocal },
      disparos: { ...disparos, [miId]: disparos[miId] || [] },
    });
  }

  async function disparar(f, c) {
    if (!esMiTurno) return;
    const misDisparos = disparos[miId] || [];
    if (misDisparos.some(([ff, cc]) => ff === f && cc === c)) return;

    const flotaRival = posiciones[rivalId];
    if (!flotaRival) return;
    const impacto = !!flotaRival[f][c];

    if (impacto) { playSound('impacto'); vibrar(150); } else { playSound('agua'); }

    const nuevosDisparos = { ...disparos, [miId]: [...misDisparos, [f, c, impacto]] };

    // ¿hundió toda la flota?
    const celdasFlota = flotaRival.flat().filter(Boolean).length;
    const aciertos = nuevosDisparos[miId].filter(([, , imp]) => imp).length;
    const gano = aciertos >= celdasFlota;

    if (gano) await supabase.rpc('sumar_puntos', { p_user_id: miId, p_puntos: 20, p_motivo: 'Batalla Naval' });

    await actualizarTablero(
      { ...p.tablero, disparos: nuevosDisparos },
      { turno_id: rivalId, ganador_id: gano ? miId : null, estado: gano ? 'terminada' : 'en_curso' }
    );
  }

  // --- Fase de colocación ---
  if (!misBarcos) {
    return (
      <div className="space-y-3 text-center">
        <p>Coloca tu flota ({indiceBarco}/{BARCOS.length}): <b>{colocando?.nombre}</b> ({colocando?.tam} celdas)</p>
        <button onClick={() => setOrientacion((o) => (o === 'h' ? 'v' : 'h'))} className="text-sm text-arcade-accent2">
          Orientación: {orientacion === 'h' ? 'Horizontal' : 'Vertical'} (toca para cambiar)
        </button>
        <div className="grid gap-[2px] mx-auto" style={{ gridTemplateColumns: `repeat(${TAM}, 1fr)`, maxWidth: 320 }}>
          {gridLocal.map((fila, f) => fila.map((val, c) => (
            <button key={`${f}-${c}`} onClick={() => colocarBarco(f, c)}
              className={`aspect-square ${val ? 'bg-arcade-accent2' : 'bg-arcade-panel'}`} />
          )))}
        </div>
        {indiceBarco >= BARCOS.length && (
          <button onClick={confirmarFlota} className="bg-arcade-accent px-4 py-2 rounded">Confirmar flota</button>
        )}
        <ChatPartida partidaId={p.id} miId={miId} />
      </div>
    );
  }

  if (!posiciones[rivalId]) {
    return <p className="text-center">Esperando a que tu pareja coloque su flota… 🚢</p>;
  }

  // --- Fase de disparo ---
  const misDisparos = disparos[miId] || [];
  return (
    <div className="space-y-3">
      <p className="text-center text-sm">{esMiTurno ? '👉 Dispara' : 'Turno del rival…'}</p>
      <div className="grid gap-[2px] mx-auto" style={{ gridTemplateColumns: `repeat(${TAM}, 1fr)`, maxWidth: 320 }}>
        {Array.from({ length: TAM }).map((_, f) => Array.from({ length: TAM }).map((_, c) => {
          const tiro = misDisparos.find(([ff, cc]) => ff === f && cc === c);
          return (
            <button key={`${f}-${c}`} onClick={() => disparar(f, c)}
              className={`aspect-square ${tiro ? (tiro[2] ? 'bg-red-500' : 'bg-blue-400/50') : 'bg-arcade-panel'}`} />
          );
        }))}
      </div>
      {p.ganador_id && (
        <p className="text-center text-arcade-accent font-bold">
          {p.ganador_id === miId ? '¡Hundiste toda la flota! 🎉' : 'Tu pareja hundió tu flota 💦'}
        </p>
      )}
      <ChatPartida partidaId={p.id} miId={miId} />
    </div>
  );
}
