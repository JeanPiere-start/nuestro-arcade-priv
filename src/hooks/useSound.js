const cache = {};

/**
 * Reproduce un efecto de sonido desde public/sounds/.
 * Uso: playSound('win') -> reproduce /sounds/win.mp3
 */
export function playSound(nombre) {
  try {
    if (!cache[nombre]) {
      cache[nombre] = new Audio(`/sounds/${nombre}.mp3`);
    }
    const audio = cache[nombre];
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) {
    // silencioso si el navegador bloquea autoplay
  }
}

export function vibrar(ms = 100) {
  if (navigator.vibrate) navigator.vibrate(ms);
}
