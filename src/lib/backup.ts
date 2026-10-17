/**
 * Copia de seguridad: exportar la libreta entera como JSON e importarla de vuelta.
 *
 * Al no haber nube, la copia es la única forma de recuperar la libreta si se desinstala la app o
 * se borran los datos del navegador. El formato es JSON y no el `.sqlite3` crudo para que la copia
 * se pueda abrir, leer y aprovechar fuera de la app. Las copias `.sqlite3` de versiones anteriores
 * se siguen aceptando al importar.
 *
 * La importación se defiende: valida el archivo entero antes de tocar nada y aplica el cambio de
 * forma atómica, así que una copia que no sirve deja la base actual tal como estaba. Una copia de
 * una versión vieja se acepta: las columnas que no traiga toman su valor por defecto y las
 * migraciones pendientes se aplican al recargar.
 */

import { batch, getDatabaseFile, overwriteDatabaseFile, sql } from '../db/client'
import { ULTIMA_MIGRACION } from '../db/schema'
import { getSetting, setSetting } from '../db/wellbeing'
import { todayISO } from './date'

/** Marca que identifica un JSON como copia de Gym Track. */
const APP = 'gymtrack'
/** Versión del formato del archivo (no del esquema): sube sólo si cambia la envoltura. */
const FORMATO = 1

/**
 * Tablas que viajan en la copia, en orden de dependencia: cada una sólo referencia a las
 * anteriores. Se insertan en este orden y se vacían en el inverso.
 */
const TABLAS = [
  'settings',
  'routine_days',
  'routine_exercises',
  'workout_sessions',
  'session_exercises',
  'workout_sets',
  'cardio_sessions',
  'cardio_intervals',
  'water_records',
  'body_measurements',
] as const

/** Las que tienen `id`: sirven para notar si hay datos nuevos desde la última copia. */
const TABLAS_CON_ID = TABLAS.filter((t) => t !== 'settings')

/** Claves de `settings` que lleva la copia diaria. */
const CLAVES = {
  ultimaCopia: 'backup_last_date',
  huella: 'backup_fingerprint',
  omitida: 'backup_skipped_date',
} as const

const CABECERA_SQLITE = 'SQLite format 3\0'
const TABLAS_REQUERIDAS_SQLITE = ['schema_migrations', 'routine_days', 'workout_sessions', 'workout_sets']

type Valor = string | number | null
type Fila = Record<string, Valor>

export type CopiaJSON = {
  app: typeof APP
  format: typeof FORMATO
  /** Última migración aplicada en la base que se exportó. */
  schema: number
  exportedAt: string
  tables: Record<string, Fila[]>
}

export type ResumenCopia = {
  entrenamientos: number
  series: number
  cardio: number
  /** Primera y última fecha con entrenamiento, `YYYY-MM-DD`. */
  desde: string | null
  hasta: string | null
}

/* ---------- Exportar ---------- */

/**
 * Descarga la copia como `gymtrack-AAAA-MM-DD.json` y la anota como la copia del día.
 *
 * La marca se guarda **antes** de volcar: así la copia ya lleva su propia fecha y huella, y al
 * restaurarla la app no pide otra copia de unos datos que acaban de llegar de una.
 */
export async function exportarCopia(): Promise<void> {
  await setSetting(CLAVES.ultimaCopia, todayISO())
  await setSetting(CLAVES.huella, await huellaDatos())
  const copia = await volcar()
  const blob = new Blob([JSON.stringify(copia)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `gymtrack-${todayISO()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function volcar(): Promise<CopiaJSON> {
  const tables: Record<string, Fila[]> = {}
  for (const tabla of TABLAS) tables[tabla] = await sql<Fila>(`SELECT * FROM ${tabla}`)
  return {
    app: APP,
    format: FORMATO,
    schema: await versionEsquema(),
    exportedAt: new Date().toISOString(),
    tables,
  }
}

/* ---------- Importar ---------- */

/**
 * Reemplaza la libreta por la del archivo (JSON o un `.sqlite3` antiguo). Lanza un `Error` con un
 * mensaje para el usuario si el archivo no sirve; en ese caso la base actual no cambia. Tras
 * resolver hay que recargar la app.
 */
export async function importarCopia(file: File): Promise<ResumenCopia> {
  const cabecera = new TextDecoder().decode(await file.slice(0, 16).arrayBuffer())
  if (cabecera === CABECERA_SQLITE) await importarSqlite(file)
  else await importarJSON(file)
  return resumir()
}

async function importarJSON(file: File): Promise<void> {
  let datos: unknown
  try {
    datos = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no es una copia de Gym Track.')
  }
  const copia = validarCopia(datos)

  const statements: { sql: string; params: unknown[] }[] = []
  for (const tabla of [...TABLAS].reverse()) statements.push({ sql: `DELETE FROM ${tabla}`, params: [] })

  for (const tabla of TABLAS) {
    const filas = copia.tables[tabla] ?? []
    if (filas.length === 0) continue
    // Sólo las columnas que existen hoy: una copia vieja deja el resto con su valor por defecto.
    const actuales = new Set(
      (await sql<{ name: string }>`SELECT name FROM pragma_table_info(${tabla})`).map((c) => c.name),
    )
    for (const fila of filas) {
      const columnas = Object.keys(fila).filter((c) => actuales.has(c))
      if (columnas.length === 0) continue
      statements.push({
        sql: `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
        params: columnas.map((c) => fila[c]),
      })
    }
  }

  // Atómico: si falla una sola fila (p. ej. una referencia rota), no cambia nada.
  try {
    await batch(() => statements)
  } catch (err) {
    throw new Error(
      `La copia está dañada y no se aplicó (${err instanceof Error ? err.message : String(err)}).`,
    )
  }
}

function validarCopia(datos: unknown): CopiaJSON {
  const copia = datos as Partial<CopiaJSON> | null
  if (!copia || typeof copia !== 'object' || copia.app !== APP) {
    throw new Error('El archivo no es una copia de Gym Track.')
  }
  if (copia.format !== FORMATO) {
    throw new Error('La copia usa un formato que esta versión no reconoce. Actualiza la app.')
  }
  if (typeof copia.schema !== 'number' || copia.schema > ULTIMA_MIGRACION) {
    throw new Error('La copia es de una versión más nueva de la app. Actualízala y vuelve a intentarlo.')
  }
  if (!copia.tables || typeof copia.tables !== 'object') {
    throw new Error('La copia está incompleta: no trae datos.')
  }
  for (const tabla of TABLAS) {
    const filas = copia.tables[tabla]
    if (filas === undefined) continue
    if (!Array.isArray(filas)) throw new Error(`La copia está dañada (${tabla}).`)
    for (const fila of filas) {
      if (!fila || typeof fila !== 'object') throw new Error(`La copia está dañada (${tabla}).`)
      for (const valor of Object.values(fila)) {
        if (valor !== null && typeof valor !== 'string' && typeof valor !== 'number') {
          throw new Error(`La copia está dañada (${tabla}).`)
        }
      }
    }
  }
  return copia as CopiaJSON
}

/** Copias de antes del cambio a JSON: reemplazan el archivo de la base entero. */
async function importarSqlite(file: File): Promise<void> {
  // Se lee a memoria: el `File` de OPFS deja de ser legible en cuanto se sobrescribe la base.
  const anterior = await (await getDatabaseFile()).arrayBuffer()
  await overwriteDatabaseFile(file)
  try {
    const tablas = await sql<{ name: string }>`SELECT name FROM sqlite_master WHERE type = 'table'`
    const nombres = new Set(tablas.map((t) => t.name))
    if (!TABLAS_REQUERIDAS_SQLITE.every((t) => nombres.has(t))) {
      throw new Error('El archivo es una base SQLite, pero no es una copia de Gym Track.')
    }
    if ((await versionEsquema()) > ULTIMA_MIGRACION) {
      throw new Error('La copia es de una versión más nueva de la app. Actualízala y vuelve a intentarlo.')
    }
  } catch (err) {
    await overwriteDatabaseFile(anterior)
    throw err
  }
}

async function versionEsquema(): Promise<number> {
  const [{ version }] = await sql<{ version: number | null }>`SELECT MAX(id) AS version FROM schema_migrations`
  return version ?? 0
}

async function resumir(): Promise<ResumenCopia> {
  const [sesiones] = await sql<{ total: number; desde: string | null; hasta: string | null }>`
    SELECT COUNT(*) AS total, MIN(date) AS desde, MAX(date) AS hasta FROM workout_sessions`
  const [series] = await sql<{ total: number }>`SELECT COUNT(*) AS total FROM workout_sets`
  const [cardio] = await sql<{ total: number }>`SELECT COUNT(*) AS total FROM cardio_sessions`
  return {
    entrenamientos: sesiones.total,
    series: series.total,
    cardio: cardio.total,
    desde: sesiones.desde,
    hasta: sesiones.hasta,
  }
}

/* ---------- Copia diaria ---------- */

/**
 * Una PWA no puede escribir archivos en el teléfono sin que el usuario toque algo, y lo que guarde
 * por dentro se borra con ella al desinstalarla. Así que la copia diaria no es automática: la app
 * la **propone** una vez al día, sólo si hay datos nuevos desde la última, y basta un toque.
 */
export async function copiaPendiente(): Promise<boolean> {
  const hoy = todayISO()
  const [ultima, omitida, huella] = await Promise.all([
    getSetting(CLAVES.ultimaCopia),
    getSetting(CLAVES.omitida),
    getSetting(CLAVES.huella),
  ])
  if (ultima === hoy || omitida === hoy) return false
  if (await libretaVacia()) return false
  return (await huellaDatos()) !== huella
}

/** "Hoy no": la propuesta vuelve mañana si sigue habiendo datos sin copiar. */
export async function omitirCopiaHoy(): Promise<void> {
  await setSetting(CLAVES.omitida, todayISO())
}

/** Fecha (`YYYY-MM-DD`) de la última copia exportada, si la hay. */
export function ultimaCopia(): Promise<string | null> {
  return getSetting(CLAVES.ultimaCopia)
}

/**
 * Resumen barato del contenido: filas e `id` máximo de cada tabla. Cambia al registrar o borrar
 * algo; una edición que no añade ni quita filas no lo mueve, y se recoge en la siguiente copia.
 */
async function huellaDatos(): Promise<string> {
  const partes = TABLAS_CON_ID.map((t) => `(SELECT COUNT(*) || ':' || IFNULL(MAX(id), 0) FROM ${t})`)
  const [fila] = await sql<{ huella: string }>(`SELECT ${partes.join(" || '|' || ")} AS huella`)
  return fila.huella
}

/** La libreta no tiene nada registrado: es una instalación nueva (o recién desinstalada). */
export async function libretaVacia(): Promise<boolean> {
  const [{ total }] = await sql<{ total: number }>`
    SELECT (SELECT COUNT(*) FROM routine_exercises)
         + (SELECT COUNT(*) FROM workout_sessions)
         + (SELECT COUNT(*) FROM cardio_sessions)
         + (SELECT COUNT(*) FROM water_records)
         + (SELECT COUNT(*) FROM body_measurements) AS total`
  return total === 0
}
