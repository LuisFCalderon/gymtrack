# Gym Track V2

Libreta digital personal de entrenamiento. Local-first, sin cuentas, sin backend y sin
sincronización: los datos viven en SQLite dentro del dispositivo.

El alcance funcional está definido en [`Gym_Track_V2_Alcance_Simplificado.md`](./Gym_Track_V2_Alcance_Simplificado.md).

## Arranque

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (PWA lista para publicar)
npm run preview    # sirve el build
npm run lint       # chequeo de tipos
```

Los iconos de la PWA se regeneran con `node scripts/generate-icons.mjs` (no requiere dependencias).

## Stack

| Pieza | Elección | Por qué |
| --- | --- | --- |
| UI | React 19 + Vite + TypeScript | Camino directo a Capacitor y tipado sobre el modelo de datos |
| Datos | SQLite real vía [SQLocal](https://sqlocal.dev) (WASM + OPFS) | El mismo SQL se reutiliza tal cual con el plugin nativo al empaquetar el APK |
| PWA | `vite-plugin-pwa` (Workbox, `autoUpdate`) | Precarga el bundle **y el `.wasm`**, así que la app abre sin conexión |
| Reordenar | `@dnd-kit` | Arrastre que funciona con el dedo en el gimnasio |
| Estilos | CSS propio con tokens | ~8 KB, sin framework, tema oscuro y claro |

No hay router externo: `src/lib/router.tsx` es un router sobre el hash, que además es lo que
funciona cuando la app se sirve desde el sistema de archivos dentro del APK.

## Estructura

```
src/
  db/          client.ts (conexión) · schema.ts (migraciones) · un repositorio por dominio
  lib/         router, fechas, formato numérico es-ES, useQuery, tema
  components/  UI compartida (TopBar, Sheet, Confirm, métricas, gráfica)
  screens/     una pantalla por ruta
scripts/       generador de iconos PNG sin dependencias
```

### Rutas

| Ruta | Pantalla |
| --- | --- |
| `#/` | Hoy: entrenamiento del día, agua, cardio, peso |
| `#/rutina` · `#/rutina/:weekday` | Los siete días y su configuración |
| `#/entrenar/:sessionId` | Registro de series en vivo |
| `#/historial` · `#/historial/sesion/:id` | Sesiones anteriores |
| `#/ejercicio/:nombre` | Historial y evolución de un ejercicio |
| `#/cardio` · `#/cardio/:id` | Cardio e intervalos |
| `#/agua` · `#/peso` · `#/progreso` · `#/ajustes` | Resto de módulos |

## Modelo de datos

Las migraciones son incrementales y viven en `src/db/schema.ts`; una migración publicada no se
edita, se agrega otra al final.

Tablas: `routine_days`, `routine_exercises`, `workout_sessions`, **`session_exercises`**,
`workout_sets`, `cardio_sessions`, `cardio_intervals`, `water_records`, `body_measurements`,
`settings`.

`session_exercises` es la única adición al modelo del documento y existe para resolver la
sustitución de ejercicios: al iniciar una sesión se **copia** el plan del día. Sobre esa copia:

- **Solo hoy** → cambia el nombre en `session_exercises`; la rutina no se toca.
- **Actualizar rutina** → cambia además `routine_exercises`.

En ambos casos `workout_sets.exercise_name` guarda el ejercicio realmente realizado, así que el
historial no se reescribe cuando la rutina cambia más adelante.

## Offline y almacenamiento

El Service Worker precarga el shell y el runtime de SQLite (~1,8 MB), de modo que la app abre sin
red desde la segunda visita. La base vive en OPFS (almacenamiento privado del origen) y **no
requiere cabeceras de aislamiento cross-origin**: se verificó el build servido por un servidor
estático simple.

Como no hay nube, la copia de seguridad es responsabilidad del usuario: **Ajustes → Exportar
copia** descarga el `.sqlite3` y **Importar copia** lo restaura.

## Siguiente etapa: APK

La PWA está preparada para empaquetarse con Capacitor sin reescribir la capa de datos:

```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android
npx cap init "Gym Track" co.datasketch.gymtrack --web-dir=dist
npx cap add android
```

Lo único que cambia es el driver de SQLite: `@capacitor-community/sqlite` en lugar de OPFS,
detrás de `src/db/client.ts`. El SQL de los repositorios se mantiene igual.

## Fuera de alcance (V2)

Sin login, backend, cloud, red social, nutrición, IA, GPS, wearables ni biblioteca multimedia.
Antes de agregar una función: *¿mejora directamente la experiencia de una libreta de
entrenamiento?* Si no, queda fuera.
