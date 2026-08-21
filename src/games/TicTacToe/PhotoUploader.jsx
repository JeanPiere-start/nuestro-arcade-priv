import { useState } from 'react';
import { supabase, PRIVATE_BUCKET } from '../../lib/supabaseClient';

/**
 * Sube una foto de perfil al bucket PRIVADO de Supabase Storage
 * (nunca toca el sistema de archivos del proyecto ni git) y
 * devuelve una URL firmada y temporal para mostrarla en el juego.
 */
export default function PhotoUploader({ userId, onUploaded }) {
  const [loading, setLoading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const path = `${userId}/tictactoe-avatar-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .upload(path, file, { upsert: true });

    if (uploadError) {
      console.error(uploadError);
      setLoading(false);
      return;
    }

    // URL firmada válida por 1 hora; se puede regenerar cuando haga falta.
    const { data: signed, error: signError } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(path, 60 * 60);

    setLoading(false);

    if (signError) {
      console.error(signError);
      return;
    }

    onUploaded?.(signed.signedUrl, path);
  }

  return (
    <label>
      {loading ? 'Subiendo...' : 'Elegir foto para el 3 en raya'}
      <input type="file" accept="image/*" onChange={handleFileChange} hidden />
    </label>
  );
}
