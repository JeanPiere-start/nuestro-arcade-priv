-- =========================================================
-- 0001_init.sql — Esquema completo de "Nuestro Arcade Privado"
-- Ejecutar en el SQL Editor de Supabase, EN ORDEN, después de
-- que las dos cuentas (tú y tu pareja) ya estén registradas.
-- =========================================================

-- ---------------------------------------------------------
-- 0) Configura aquí los dos UUID de la pareja (una sola vez)
-- ---------------------------------------------------------
-- Reemplaza estos dos valores por los user_id reales
-- (Authentication > Users en el dashboard de Supabase).
create table if not exists app_config (
  clave text primary key,
  valor text not null
);
insert into app_config (clave, valor) values
  ('uuid_persona_1', 'UUID-DE-PERSONA-1'),
  ('uuid_persona_2', 'UUID-DE-PERSONA-2')
on conflict (clave) do update set valor = excluded.valor;

create or replace function es_pareja()
returns boolean
language sql stable
as $$
  select auth.uid() in (
    (select valor::uuid from app_config where clave = 'uuid_persona_1'),
    (select valor::uuid from app_config where clave = 'uuid_persona_2')
  );
$$;

-- ---------------------------------------------------------
-- 1) Perfiles
-- ---------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  avatar_path text,
  puntos_totales integer not null default 0,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "pareja lee perfiles" on profiles
  for select to authenticated using (es_pareja());
create policy "pareja actualiza su propio perfil" on profiles
  for update to authenticated using (auth.uid() = id and es_pareja());
create policy "pareja inserta su propio perfil" on profiles
  for insert to authenticated with check (auth.uid() = id and es_pareja());

-- ---------------------------------------------------------
-- 2) Chat Global
-- ---------------------------------------------------------
create table if not exists mensajes_chat_global (
  id bigint generated always as identity primary key,
  autor_id uuid not null references profiles(id),
  contenido text not null,
  created_at timestamptz not null default now()
);

alter table mensajes_chat_global enable row level security;

create policy "pareja lee chat global" on mensajes_chat_global
  for select to authenticated using (es_pareja());
create policy "pareja escribe en chat global" on mensajes_chat_global
  for insert to authenticated with check (es_pareja() and auth.uid() = autor_id);

-- ---------------------------------------------------------
-- 3) Partidas (estado compartido de cualquier juego)
-- ---------------------------------------------------------
create table if not exists partidas (
  id uuid primary key default gen_random_uuid(),
  tipo_juego text not null, -- 'tictactoe' | 'memory' | 'battleship' | 'wordle' | ...
  estado text not null default 'esperando', -- esperando | en_curso | terminada
  jugador1_id uuid references profiles(id),
  jugador2_id uuid references profiles(id),
  turno_id uuid references profiles(id),
  tablero jsonb not null default '{}'::jsonb,
  ganador_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table partidas enable row level security;

create policy "pareja lee partidas" on partidas
  for select to authenticated using (es_pareja());
create policy "pareja crea partidas" on partidas
  for insert to authenticated with check (es_pareja());
create policy "pareja actualiza partidas" on partidas
  for update to authenticated using (es_pareja());

-- trigger para updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_partidas_updated_at on partidas;
create trigger trg_partidas_updated_at
  before update on partidas
  for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- 4) Chat de Partida
-- ---------------------------------------------------------
create table if not exists mensajes_chat_partida (
  id bigint generated always as identity primary key,
  partida_id uuid not null references partidas(id) on delete cascade,
  autor_id uuid not null references profiles(id),
  contenido text not null,
  created_at timestamptz not null default now()
);

alter table mensajes_chat_partida enable row level security;

create policy "pareja lee chat de partida" on mensajes_chat_partida
  for select to authenticated using (es_pareja());
create policy "pareja escribe en chat de partida" on mensajes_chat_partida
  for insert to authenticated with check (es_pareja() and auth.uid() = autor_id);

-- ---------------------------------------------------------
-- 5) Buzón de Tiempo (cápsulas)
-- ---------------------------------------------------------
create table if not exists capsulas_tiempo (
  id bigint generated always as identity primary key,
  autor_id uuid not null references profiles(id),
  destinatario_id uuid not null references profiles(id),
  contenido text not null,
  imagen_path text,
  fecha_desbloqueo timestamptz not null,
  abierta boolean not null default false,
  created_at timestamptz not null default now()
);

alter table capsulas_tiempo enable row level security;

create policy "pareja lee capsulas" on capsulas_tiempo
  for select to authenticated using (es_pareja());
create policy "pareja crea capsulas" on capsulas_tiempo
  for insert to authenticated with check (es_pareja() and auth.uid() = autor_id);
create policy "pareja marca capsulas abiertas" on capsulas_tiempo
  for update to authenticated using (es_pareja());

-- ---------------------------------------------------------
-- 6) Trivia — preguntas personalizadas de la relación
-- ---------------------------------------------------------
create table if not exists trivia_preguntas (
  id bigint generated always as identity primary key,
  pregunta text not null,
  opciones jsonb not null, -- ["op1","op2","op3","op4"]
  respuesta_correcta integer not null, -- índice 0-3
  categoria text default 'pareja',
  created_at timestamptz not null default now()
);

alter table trivia_preguntas enable row level security;

create policy "pareja lee trivia" on trivia_preguntas
  for select to authenticated using (es_pareja());
create policy "pareja escribe trivia" on trivia_preguntas
  for insert to authenticated with check (es_pareja());

-- ---------------------------------------------------------
-- 7) Puntos y Vales (leaderboard + tienda)
-- ---------------------------------------------------------
create table if not exists puntos_historial (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id),
  puntos integer not null,
  motivo text,
  created_at timestamptz not null default now()
);

alter table puntos_historial enable row level security;

create policy "pareja lee historial de puntos" on puntos_historial
  for select to authenticated using (es_pareja());
create policy "pareja inserta puntos" on puntos_historial
  for insert to authenticated with check (es_pareja());

create table if not exists vales (
  id bigint generated always as identity primary key,
  titulo text not null,
  descripcion text,
  costo_puntos integer not null,
  canjeado boolean not null default false,
  canjeado_por uuid references profiles(id),
  canjeado_en timestamptz
);

alter table vales enable row level security;

create policy "pareja lee vales" on vales
  for select to authenticated using (es_pareja());
create policy "pareja gestiona vales" on vales
  for all to authenticated using (es_pareja()) with check (es_pareja());

-- Función para sumar puntos y mantener puntos_totales sincronizado
create or replace function sumar_puntos(p_user_id uuid, p_puntos integer, p_motivo text)
returns void language plpgsql security definer as $$
begin
  insert into puntos_historial (user_id, puntos, motivo) values (p_user_id, p_puntos, p_motivo);
  update profiles set puntos_totales = puntos_totales + p_puntos where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------
-- 8) Habilitar Realtime en las tablas que lo necesitan
-- ---------------------------------------------------------
alter publication supabase_realtime add table mensajes_chat_global;
alter publication supabase_realtime add table mensajes_chat_partida;
alter publication supabase_realtime add table partidas;
alter publication supabase_realtime add table capsulas_tiempo;
