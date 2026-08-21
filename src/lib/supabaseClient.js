import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// La anon key es pública por diseño (así funciona Supabase): la
// privacidad real la dan las políticas RLS de la base de datos y
// del Storage, no el hecho de ocultar esta key.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const PRIVATE_BUCKET = import.meta.env.VITE_PRIVATE_BUCKET || 'private-media';
