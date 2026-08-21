# Nuestro Arcade Privado — estructura del proyecto

## La idea clave: dos tipos de "media" muy distintos

| Tipo de archivo | ¿Dónde vive? | ¿Va a GitHub? |
|---|---|---|
| Fotos de perfil, fotos de viaje, imágenes de Memory Match | **Bucket privado de Supabase Storage** (`private-media`) | **Nunca**. No existen como archivos en tu proyecto. |
| Sonidos/efectos (clics, victoria, notificación) | `public/sounds/` dentro del repo | **Sí, sin problema**. Son genéricos, no personales. |

La regla mental es simple: **si el archivo identifica a una persona o un recuerdo personal → Supabase Storage privado. Si es un asset genérico y reutilizable del juego → carpeta del repo.**

## Por qué no basta con una carpeta "privada" en el repo

Aunque crees una carpeta y la pongas en `.gitignore`, eso solo evita que *tú* la subas por accidente. El código en sí (HTML/JS) que sirve el sitio sigue siendo público si despliegas en Render desde GitHub, así que cualquier imagen que estuviera físicamente en el repo sería descargable inspeccionando el bundle. Por eso las fotos deben subirse en tiempo de ejecución directamente a un **bucket privado** protegido por RLS (Row Level Security), nunca empaquetadas en el build.

## Estructura de carpetas

```
nuestro-arcade-privado/
├── .gitignore              # excluye .env y cualquier media local de prueba
├── .env.example             # plantilla de variables (sin claves reales)
├── README.md
├── public/
│   └── sounds/               # ✅ efectos de sonido — SÍ van a git
├── src/
│   ├── lib/
│   │   └── supabaseClient.js # cliente único de Supabase
│   ├── games/
│   │   ├── TicTacToe/
│   │   │   └── PhotoUploader.jsx  # ejemplo: sube foto privada + signed URL
│   │   ├── Memory/
│   │   ├── BattleShip/
│   │   ├── Wordle/
│   │   ├── SpeedClicker/
│   │   ├── Trivia/
│   │   ├── TuttiFrutti/
│   │   └── SharedCanvas/
│   ├── components/
│   ├── hooks/
│   └── pages/
└── supabase/
    ├── storage-setup.sql     # crea el bucket privado + políticas RLS
    └── migrations/            # tus migraciones de tablas (chat, partidas, etc.)
```

## Cómo guardar/subir las fotos privadas (paso a paso)

1. En el Dashboard de Supabase → **Storage** → crea un bucket llamado `private-media` y marca **Private** (no público).
2. Corre `supabase/storage-setup.sql` reemplazando los dos UUID de ejemplo por los `user_id` reales de sus dos cuentas.
3. En la app, el usuario elige una foto → `PhotoUploader.jsx` la sube directo al bucket (`supabase.storage.from('private-media').upload(...)`).
4. Para mostrarla en el tablero de 3 en raya, generas una **signed URL** temporal (`createSignedUrl`) — es una URL que expira sola y que nadie puede adivinar ni reutilizar después de vencer.
5. En la base de datos (tabla `partidas` o `perfiles`) solo guardas el **path** del archivo (ej. `userId/avatar.jpg`), no la URL pública, porque la URL pública no existe: el bucket es privado.

## Cómo guardar los sonidos (mucho más simple)

Simplemente colócalos en `public/sounds/click.mp3`, `public/sounds/win.mp3`, etc. y referencia con `new Audio('/sounds/win.mp3')`. Como no contienen información personal, no hay ningún problema en que estén versionados en GitHub junto con el resto del código.

## Deploy en Render

- Conecta el repo de GitHub a Render (Static Site o Web Service según tu build).
- En **Environment Variables** de Render, agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los mismos de tu `.env`, nunca los subas en el repo).
- La `anon key` de Supabase es segura de exponer en el frontend por diseño: la protección real está en las políticas RLS que limitan el acceso solo a sus dos `user_id`.

## Puesta en marcha completa (checklist)

1. `npm install`
2. Crea el proyecto en Supabase y copia `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` a tu `.env`.
3. Corre `supabase/migrations/0001_init.sql` en el SQL Editor — crea todas las tablas, RLS y funciones.
4. Corre `supabase/storage-setup.sql` — crea el bucket privado `private-media`.
5. Regístrense los dos desde `/registro` en la app.
6. En el dashboard, copia sus dos `user_id` (Authentication → Users) y actualiza:
   - la tabla `app_config` (`uuid_persona_1`, `uuid_persona_2`)
   - los policies de `supabase/storage-setup.sql` (reemplaza los UUID de ejemplo)
7. `npm run dev` para probar en local, luego deploy a Render.

## Qué está implementado y qué falta afinar

**Completo y funcional:**
- Auth (registro/login), perfiles, presencia "en línea"
- Chat Global, Chat de Partida (flotante por juego), Buzón de Tiempo con cuenta regresiva
- Sistema de puntos + Leaderboard + canje de vales
- Los 8 juegos del catálogo + Ruleta y Dados de la Zona Picante, todos con sincronización en tiempo real vía Supabase (postgres_changes / Broadcast / Presence)

**Pendiente de personalizar por ustedes (a propósito, son sus datos):**
- Subir fotos reales a la carpeta `memory/` del bucket privado para que funcione el Memory Match
- Llenar la tabla `trivia_preguntas` con preguntas de su relación
- Personalizar las listas de `PRENDAS` (Ruleta) y `ACCIONES`/`ZONAS` (Dados) en sus respectivos archivos
- Agregar vales reales en la tabla `vales`
- Conseguir/crear los `.mp3` para `public/sounds/` (clic, victoria, acierto, notificacion, impacto, agua)
- Íconos reales para `manifest.json` (PWA)

**Pendiente — Fase 2 (hardware IoT con ESP32):** no incluida en este scaffold; es un firmware aparte que llamaría a la API REST de Supabase, se puede abordar como siguiente entrega.
