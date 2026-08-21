-- =========================================================
-- 1) Crear el bucket PRIVADO para fotos/imágenes de la pareja
-- =========================================================
-- Ejecuta esto en el SQL Editor de Supabase, o crea el bucket
-- desde el Dashboard (Storage > New bucket) marcándolo como
-- "Private" (public = false).

insert into storage.buckets (id, name, public)
values ('private-media', 'private-media', false)
on conflict (id) do nothing;

-- =========================================================
-- 2) Políticas RLS: solo ustedes dos pueden leer/escribir
-- =========================================================
-- Reemplaza los UUID de ejemplo por los user_id reales de sus
-- cuentas (los obtienes en Authentication > Users tras registrarse).

-- Ver auth.uid() actual de un usuario logueado (solo para depurar):
-- select auth.uid();

create policy "Solo la pareja puede subir a private-media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'private-media'
  and auth.uid() in (
    'UUID-DE-PERSONA-1',
    'UUID-DE-PERSONA-2'
  )
);

create policy "Solo la pareja puede ver private-media"
on storage.objects for select
to authenticated
using (
  bucket_id = 'private-media'
  and auth.uid() in (
    'UUID-DE-PERSONA-1',
    'UUID-DE-PERSONA-2'
  )
);

create policy "Solo la pareja puede borrar en private-media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'private-media'
  and auth.uid() in (
    'UUID-DE-PERSONA-1',
    'UUID-DE-PERSONA-2'
  )
);

-- =========================================================
-- Notas
-- =========================================================
-- * Como el bucket es "private", NADIE puede acceder a una URL
--   directa de un archivo, ni siquiera estando logueado, salvo
--   generando una "signed URL" temporal desde el backend/cliente
--   autenticado (ver ejemplo en src/games/TicTacToe/PhotoUploader.jsx).
-- * Aunque publiques este archivo .sql en GitHub, no expone ninguna
--   foto: solo son reglas. Las fotos reales viven en Supabase, no
--   en el repositorio.
