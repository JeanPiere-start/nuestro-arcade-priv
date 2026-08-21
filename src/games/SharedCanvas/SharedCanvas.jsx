import { useEffect, useRef, useState } from 'react';
import { supabase, PRIVATE_BUCKET } from '../../lib/supabaseClient';
import ChatPartida from '../../components/ChatPartida';

export default function SharedCanvas({ partida, miId }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const canalRef = useRef(null);
  const [color, setColor] = useState('#ff4d8d');

  useEffect(() => {
    const canal = supabase.channel(`canvas-${partida.id}`);
    canal.on('broadcast', { event: 'trazo' }, ({ payload }) => {
      dibujarLinea(payload.x0, payload.y0, payload.x1, payload.y1, payload.color, false);
    }).subscribe();
    canalRef.current = canal;
    return () => supabase.removeChannel(canal);
  }, [partida.id]);

  function coordenadas(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const punto = e.touches ? e.touches[0] : e;
    return {
      x: ((punto.clientX - rect.left) / rect.width) * canvasRef.current.width,
      y: ((punto.clientY - rect.top) / rect.height) * canvasRef.current.height,
    };
  }

  function dibujarLinea(x0, y0, x1, y1, colorLinea) {
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = colorLinea;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  let ultimoPunto = null;

  function iniciarTrazo(e) {
    dibujando.current = true;
    ultimoPunto = coordenadas(e);
  }

  function moverTrazo(e) {
    if (!dibujando.current) return;
    const punto = coordenadas(e);
    dibujarLinea(ultimoPunto.x, ultimoPunto.y, punto.x, punto.y, color);
    canalRef.current?.send({
      type: 'broadcast', event: 'trazo',
      payload: { x0: ultimoPunto.x, y0: ultimoPunto.y, x1: punto.x, y1: punto.y, color },
    });
    ultimoPunto = punto;
  }

  function terminarTrazo() { dibujando.current = false; }

  function limpiar() {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }

  async function guardarEnStorage() {
    canvasRef.current.toBlob(async (blob) => {
      const path = `canvas/dibujo-${Date.now()}.png`;
      await supabase.storage.from(PRIVATE_BUCKET).upload(path, blob);
      alert('Dibujo guardado de forma privada ✅');
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">
        {['#ff4d8d', '#7c5cff', '#ffffff', '#ffd166', '#06d6a0'].map((c) => (
          <button key={c} onClick={() => setColor(c)}
            className="w-7 h-7 rounded-full border-2 border-white/30"
            style={{ background: c, outline: color === c ? '2px solid white' : 'none' }} />
        ))}
      </div>
      <canvas ref={canvasRef} width={360} height={480}
        className="bg-white/5 rounded-xl mx-auto touch-none w-full max-w-sm"
        onMouseDown={iniciarTrazo} onMouseMove={moverTrazo} onMouseUp={terminarTrazo} onMouseLeave={terminarTrazo}
        onTouchStart={iniciarTrazo} onTouchMove={moverTrazo} onTouchEnd={terminarTrazo} />
      <div className="flex justify-center gap-2">
        <button onClick={limpiar} className="bg-black/30 px-3 py-1 rounded text-sm">Limpiar</button>
        <button onClick={guardarEnStorage} className="bg-arcade-accent px-3 py-1 rounded text-sm">Guardar</button>
      </div>
      <ChatPartida partidaId={partida.id} miId={miId} />
    </div>
  );
}
