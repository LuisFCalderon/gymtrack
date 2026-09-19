# Gym Track V2

Libreta digital personal de entrenamiento. Local-first, sin cuentas, sin backend y sin
sincronización: los datos viven en SQLite dentro del dispositivo y la app funciona sin conexión.

**Pruébala: [gymtrack.luixcalderon12-cloudfare.workers.dev](https://gymtrack.luixcalderon12-cloudfare.workers.dev/)** —
se instala desde el navegador y, una vez instalada, abre sin conexión. Lo que registres se
queda en tu dispositivo: no viaja a ningún servidor porque no hay ninguno.

El alcance funcional está definido en [`Gym_Track_V2_Alcance_Simplificado.md`](./Gym_Track_V2_Alcance_Simplificado.md).
La regla para decidir qué entra: *¿mejora directamente la experiencia de una libreta de
entrenamiento?* Si no, queda fuera.

## Arranque

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (PWA lista para publicar)
npm run preview    # sirve el build
npm run lint       # chequeo de tipos
```

Los iconos de la PWA se regeneran con `node scripts/generate-icons.mjs` (sin dependencias).

## Qué hace, sección por sección

### Hoy (`#/`)

La pantalla de inicio. Muestra qué toca entrenar hoy según el día de la semana, y debajo el agua,
el cardio y el peso corporal del día. Un único botón grande abre o continúa el entrenamiento.

### Rutina (`#/rutina`, `#/rutina/:weekday`)

Los siete días de la semana, siempre presentes: la rutina se configura, no se crea. Cada día
admite **cualquier cantidad** de ejercicios, con nombre, series y repeticiones objetivo y notas.
Se editan, se eliminan y se reordenan arrastrando (`@dnd-kit`, pensado para el dedo). Un día puede
marcarse como descanso.

### Entrenamiento (`#/entrenar/:sessionId`)

El corazón de la app. Cada ejercicio muestra sus series registradas y una fila de entrada rápida
con peso, repeticiones y RIR:

- El botón `+` sin escribir nada **repite la serie anterior**, que es el caso más común.
- Los campos usan como marcador lo último que hiciste, así que rara vez hay que teclear.
- Debajo aparece **lo que hiciste el día anterior** en ese mismo ejercicio, para comparar sin salir.
- Tocar una serie ya registrada la abre para corregirla o borrarla.

### Sustitución de ejercicios

Desde el menú `⋯` de cada ejercicio, con dos opciones que hacen cosas distintas:

- **Solo hoy** — cambia el ejercicio en esta sesión. La rutina no se toca.
- **Actualizar rutina** — además lo reemplaza en la rutina habitual de ese día.

En ambos casos la sesión conserva el ejercicio **realmente realizado**, con una etiqueta que
recuerda a cuál sustituyó.

### Temporizador de descanso

Arranca solo al registrar una serie y se queda visible **en cualquier pantalla**, encima de la
navegación, para que puedas consultar el historial entre series sin perderlo de vista. Tiene
−30 s, +30 s, pausa y saltar. La duración por defecto y el aviso se configuran en Ajustes.

La cuenta atrás se calcula contra una marca absoluta (`Date.now()`), nunca acumulando ticks, así
que no se desfasa cuando el navegador ralentiza los temporizadores en segundo plano. El pitido se
**programa por adelantado en el reloj del `AudioContext`**, que sigue corriendo con la pantalla
apagada; con `setInterval` habría sonado tarde justo en el escenario real de uso. Se genera con la
Web Audio API, sin archivos de audio.

> **Limitación conocida:** iOS Safari suspende el `AudioContext` al pasar la app a segundo plano,
> así que allí el pitido suena al volver a la app. En Android (el objetivo del APK) llega puntual.
> Evitarlo requeriría notificaciones locales, fuera del alcance de V2.

### Historial (`#/historial`, `#/historial/sesion/:id`, `#/ejercicio/:nombre`)

Las sesiones anteriores con sus totales, y un buscador por ejercicio. La vista de un ejercicio
reúne todas sus series agrupadas por día — el *"¿cómo se compara con lo que hice antes?"* que
justifica el producto.

### Progreso (`#/progreso`)

Métricas de los últimos 7 días, mejores pesos por ejercicio y gráficas. El volumen es
`Σ (peso × repeticiones)` de cada serie.

### Cardio (`#/cardio`), Agua (`#/agua`), Peso (`#/peso`)

Independientes del entrenamiento de fuerza y registrables cualquier día, incluidos los de
descanso. Cardio admite seis tipos y sus métricas (tiempo, distancia, pasos, ritmo, velocidad,
inclinación, frecuencia cardíaca) más **intervalos** con totales acumulados. Agua tiene meta
diaria y accesos rápidos. Peso calcula el IMC como referencia.

### Ajustes (`#/ajustes`)

Empieza por **Perfil**: altura y meta de agua, las dos constantes personales que la app usa para
calcular (el IMC y el progreso de hidratación), con el IMC actual recalculado a partir del último
peso registrado. No es una cuenta —no las hay— sino los ajustes que antes estaban dispersos: la
altura sólo se podía tocar al registrar un peso y la meta de agua vivía en la pantalla de Agua.

Debajo: tema claro/oscuro, duración del descanso, estado de protección de los datos, **exportar e
importar** la copia de seguridad, instalar la app y relanzar la guía.

## Gráficas

Todas hechas a mano en SVG, **sin librerías de gráficas**: mantienen el bundle pequeño y la app
funcionando sin conexión.

| Dónde | Gráfica |
| --- | --- |
| `#/ejercicio/:nombre` | Línea del mejor peso por sesión, con selector a barras de volumen |
| `#/progreso` | Barras de volumen (o series) por semana, últimas 8 |
| `#/peso` | Línea de la evolución del peso corporal |
| `#/agua` | Barras de los últimos 14 días con la línea de meta |

Usan sólo variables del tema, así que funcionan en claro y oscuro. Los tooltips responden al
toque, no sólo al ratón, y cada gráfica lleva `role="img"` con un resumen de la tendencia **y**
una tabla equivalente oculta: el dato nunca depende únicamente del tooltip.

## Tour guiado

La primera vez que se abre la app se lanza una guía de 15 pasos que recorre cada sección y
explica cómo funciona. Usa [driver.js](https://driverjs.com), empaquetado en el bundle (nunca
desde un CDN) y cargado de forma perezosa: sólo se descarga al abrirla.

- Se marca como vista en `localStorage`, tanto si se completa como si se salta.
- Se relanza desde **Ajustes → Ver la guía otra vez**.
- Los pasos que cruzan pantallas navegan y **esperan al elemento con un `MutationObserver`**; si
  un elemento no existe —lo normal en una instalación vacía, que es justo cuando se lanza— la
  parada se salta con elegancia en lugar de romper la guía.
- Ninguna parada entra en `#/entrenar`: abrir esa ruta crearía una sesión vacía y la guía
  ensuciaría el historial en el primer arranque.

## Stack

| Pieza | Elección | Por qué |
| --- | --- | --- |
| UI | React 19 + Vite + TypeScript | Camino directo a Capacitor y tipado sobre el modelo de datos |
| Datos | SQLite real vía [SQLocal](https://sqlocal.dev) (WASM + OPFS) | El mismo SQL se reutiliza con el plugin nativo al empaquetar el APK |
| PWA | `vite-plugin-pwa` (Workbox, `autoUpdate`) | Precarga el bundle **y el `.wasm`**, así que la app abre sin conexión |
| Reordenar | `@dnd-kit` | Arrastre que funciona con el dedo en el gimnasio |
| Guía | `driver.js` | Ligero y empaquetable; carga perezosa |
| Gráficas | SVG propio | Sin dependencias, sin peso extra, coherente con el tema |
| Estilos | CSS propio con tokens | Tema oscuro y claro sin framework |

No hay router externo: `src/lib/router.tsx` es un router sobre el hash. Además de ser diminuto, es
lo que funciona sin configurar reescrituras en el servidor y dentro del WebView del APK.

## Estructura

```
src/
  db/          client.ts (conexión) · schema.ts (migraciones) · un repositorio por dominio
  lib/         router, fechas, formato es-ES, useQuery, tema, restTimer, install
  components/  UI compartida · charts/ (gráficas) · tour/ (guía)
  screens/     una pantalla por ruta
scripts/       generador de iconos PNG sin dependencias
```

## Modelo de datos

Las migraciones son incrementales y viven en `src/db/schema.ts`; una migración publicada no se
edita, se agrega otra al final.

Tablas: `routine_days`, `routine_exercises`, `workout_sessions`, **`session_exercises`**,
`workout_sets`, `cardio_sessions`, `cardio_intervals`, `water_records`, `body_measurements`,
`settings`.

`session_exercises` es la única adición al modelo del documento y existe para resolver la
sustitución: al iniciar una sesión se **copia** el plan del día. Sobre esa copia, *Solo hoy* cambia
el nombre únicamente ahí, y *Actualizar rutina* cambia además `routine_exercises`. En ambos casos
`workout_sets.exercise_name` guarda el ejercicio realmente realizado, así que el historial no se
reescribe cuando la rutina cambia más adelante.

## Offline y almacenamiento

El Service Worker precarga el shell y el runtime de SQLite (~1,9 MB en total), de modo que la app
abre sin red desde la segunda visita.

### El servidor DEBE enviar las cabeceras de aislamiento cross-origin

La base vive en OPFS, y el VFS de OPFS de SQLite **sólo existe si el documento es
`crossOriginIsolated`**. Eso exige dos cabeceras:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Sin ellas, SQLocal **cae en silencio a una base en memoria** (sólo deja un `console.warn`): la app
arranca, los datos parecen guardarse y **desaparecen enteros en la siguiente recarga**. En
desarrollo no se nota porque el plugin `sqlocal/vite` pone esas cabeceras en el servidor de Vite;
el fallo aparece únicamente en producción.

`public/_headers` las incluye. Si tu hosting no lee ese archivo, configúralas a mano. La app no
carga ningún recurso de otro origen, así que `require-corp` no rompe nada.

Como el fallo es silencioso y catastrófico, la app **se niega a arrancar** si detecta que la base
quedó en memoria (`getDatabaseInfo().storageType === 'memory'`) y explica qué falta, en vez de
dejarte anotar un entrenamiento que se va a perder.

Para comprobarlo en cualquier despliegue, desde la consola del navegador:

```js
self.crossOriginIsolated // debe ser true
// y debe existir el archivo:
for await (const [n] of (await navigator.storage.getDirectory()).entries()) console.log(n)
// → gymtrack.sqlite3
```

El navegador puede **desalojar** el almacenamiento de un sitio cuando al dispositivo le falta
espacio, y con él se iría la libreta entera. Por eso la app pide `navigator.storage.persist()` al
arrancar y muestra el estado en Ajustes (*Protegidos* / *Sin proteger*), con un botón para
reintentarlo. La decisión es del navegador: suele concederla si la app está instalada en la
pantalla de inicio o tras usarla varios días, y puede denegarla sin explicación — de ahí que el
estado se muestre en vez de darse por hecho.

Como no hay nube, **la copia de seguridad es responsabilidad del usuario**: Ajustes → *Exportar
copia* descarga el `.sqlite3` e *Importar copia* lo restaura. Si se desinstala la app o se borran
los datos del navegador, se pierden.

> Los datos están atados al origen: si cambias de dominio, no viajan solos. Exporta en el viejo e
> importa en el nuevo.

## Despliegue

El build es estático, así que sirve cualquier hosting. Recomendado: **Cloudflare Pages** o
**Netlify** — comando `npm run build`, carpeta `dist`.

- Al usar router sobre el hash **no hacen falta reglas de reescritura** para SPA; funciona
  también en GitHub Pages.
- `public/_headers` (que leen Netlify, Cloudflare Pages y Cloudflare Workers) hace dos cosas
  **imprescindibles**: envía las cabeceras de aislamiento cross-origin sin las cuales no hay
  persistencia (ver arriba), y evita que el Service Worker y el HTML se queden cacheados en una
  versión vieja mientras los assets con hash se cachean para siempre.
- **HTTPS es obligatorio**: sin él no hay Service Worker ni instalación de la PWA.
- Si publicas en un subdirectorio (`usuario.github.io/gymtrack/`), ajusta `base` en
  `vite.config.ts` y el `start_url`/`scope` del manifest.

## Instalación como app

`devOptions` está activado en `vite.config.ts` para que el Service Worker exista **también en
`npm run dev`**; sin él el navegador no ofrece instalar la app y la opción no aparece por ningún
lado durante el desarrollo.

En Ajustes hay un botón **Instalar app** que captura `beforeinstallprompt` (registrado en
`main.tsx`, antes de montar React, porque el evento llega muy pronto) y lanza el diálogo nativo.
Si el navegador no lo ofrece, la sección explica cómo hacerlo a mano; si la app ya está instalada,
no se muestra.

## Siguiente etapa: APK

La PWA está preparada para empaquetarse con Capacitor sin reescribir la capa de datos:

```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android
npx cap init "Gym Track" co.dominio.gymtrack --web-dir=dist
npx cap add android
```

Lo único que cambia es el driver de SQLite: `@capacitor-community/sqlite` en lugar de OPFS,
detrás de `src/db/client.ts`. El SQL de los repositorios se mantiene igual.

## Fuera de alcance (V2)

Sin login, backend, cloud, red social, nutrición, IA, GPS, wearables ni biblioteca multimedia.
