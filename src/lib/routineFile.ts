/**
 * Importar y exportar la **rutina** (los siete días y sus ejercicios) como un JSON legible.
 *
 * Es algo distinto de la copia de seguridad de `backup.ts`: aquélla reemplaza la libreta entera
 * (historial incluido); esto sólo toca el plan de la semana y nunca el historial. El formato es
 * sencillo a propósito, para que se pueda escribir a mano, editar en cualquier editor o pedírselo a
 * una IA. La importación es tolerante: acepta varios nombres de campo y tanto el número de día como
 * su nombre en español o inglés.
 *
 * Formato (todo lo que no sea `weekday` y `name` de ejercicio es opcional):
 *
 *   {
 *     "app": "gymtrack",
 *     "type": "routine",
 *     "version": 1,
 *     "days": [
 *       {
 *         "weekday": 1,                 // 1=Lunes … 7=Domingo. También vale "Lunes" o "monday".
 *         "name": "Pecho + Espalda",
 *         "rest": false,
 *         "exercises": [
 *           { "name": "Press banca", "sets": 4, "reps": "8-10", "notes": "Banco plano" },
 *           { "name": "Remo con barra", "sets": 4, "reps": "8-10" }
 *         ]
 *       },
 *       { "weekday": 2, "rest": true }
 *     ]
 *   }
 */

import {
  importRoutineDays,
  listDays,
  listExercises,
  type RoutineDayImport,
} from '../db/routine'
import { WEEKDAY_NAMES } from '../db/types'
import { todayISO } from './date'

const APP = 'gymtrack'
const TIPO = 'routine'
const VERSION = 1

export type EjercicioJSON = {
  name: string
  sets: number | null
  reps: string | null
  notes: string | null
}

export type DiaJSON = {
  weekday: number
  name: string
  rest: boolean
  exercises: EjercicioJSON[]
}

export type RutinaJSON = {
  app: typeof APP
  type: typeof TIPO
  version: typeof VERSION
  exportedAt: string
  days: DiaJSON[]
}

export type ResumenRutina = { dias: number; ejercicios: number }

/* ---------- Exportar ---------- */

/** Descarga la rutina actual (los siete días) como `gymtrack-rutina-AAAA-MM-DD.json`. */
export async function exportarRutina(): Promise<void> {
  const contenido = JSON.stringify(await volcarRutina(), null, 2)
  const blob = new Blob([contenido], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `gymtrack-rutina-${todayISO()}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function volcarRutina(): Promise<RutinaJSON> {
  const dias = await listDays()
  const days: DiaJSON[] = []
  for (const dia of dias) {
    const ejercicios = await listExercises(dia.id)
    days.push({
      weekday: dia.weekday,
      name: dia.name,
      rest: dia.rest_day === 1,
      exercises: ejercicios.map((e) => ({
        name: e.name,
        sets: e.target_sets,
        reps: e.target_reps,
        notes: e.notes,
      })),
    })
  }
  return { app: APP, type: TIPO, version: VERSION, exportedAt: new Date().toISOString(), days }
}

/* ---------- Importar ---------- */

/**
 * Lee el archivo, valida su contenido y aplica la rutina. Lanza un `Error` con un mensaje para el
 * usuario si el archivo no sirve; en ese caso la rutina actual no cambia.
 */
export async function importarRutina(file: File): Promise<ResumenRutina> {
  let datos: unknown
  try {
    datos = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const dias = parsearRutina(datos)
  return importRoutineDays(dias)
}

/** Devuelve los días listos para insertar, o lanza un `Error` legible explicando qué falta. */
export function parsearRutina(datos: unknown): RoutineDayImport[] {
  // Una copia de seguridad completa también lleva `app: "gymtrack"`, pero trae `tables`. Se
  // distingue para mandar al usuario al sitio correcto en vez de dar un error confuso.
  if (datos && typeof datos === 'object' && 'tables' in datos) {
    throw new Error('Esto es una copia de seguridad completa, no una rutina. Impórtala desde Ajustes.')
  }

  const crudos = extraerDias(datos)
  if (crudos.length === 0) {
    throw new Error('El archivo no contiene ningún día de rutina.')
  }

  const dias = crudos.map(parsearDia)
  if (dias.every((d) => d.exercises.length === 0 && d.name === undefined && d.rest_day === undefined)) {
    throw new Error('El archivo no trae ejercicios ni cambios que importar.')
  }
  return dias
}

/** El array de días puede venir como `days`, `dias`, o ser el propio contenido del archivo. */
function extraerDias(datos: unknown): Record<string, unknown>[] {
  const lista = Array.isArray(datos)
    ? datos
    : datos && typeof datos === 'object'
      ? ((datos as Record<string, unknown>).days ?? (datos as Record<string, unknown>).dias)
      : null
  if (!Array.isArray(lista)) {
    throw new Error('El archivo no tiene la forma de una rutina (falta la lista de días).')
  }
  for (const dia of lista) {
    if (!dia || typeof dia !== 'object' || Array.isArray(dia)) {
      throw new Error('Alguno de los días del archivo está mal escrito.')
    }
  }
  return lista as Record<string, unknown>[]
}

function parsearDia(raw: Record<string, unknown>): RoutineDayImport {
  const weekday = parsearWeekday(raw.weekday ?? raw.dia ?? raw.day)

  const nombreRaw = raw.name ?? raw.nombre
  const name = nombreRaw === undefined ? undefined : textoOpcional(nombreRaw, weekday)

  const restRaw = raw.rest ?? raw.rest_day ?? raw.descanso
  const rest_day = restRaw === undefined ? undefined : Boolean(restRaw)

  const exercises = parsearEjercicios(raw.exercises ?? raw.ejercicios ?? [], weekday)

  return { weekday, name, rest_day, exercises }
}

/** Nombres de los días (español e inglés, sin tildes) → número 1..7. */
const NOMBRE_A_WEEKDAY: Record<string, number> = (() => {
  const mapa: Record<string, number> = {}
  for (const [n, nombre] of Object.entries(WEEKDAY_NAMES)) mapa[normalizar(nombre)] = Number(n)
  const ingles = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  ingles.forEach((nombre, i) => (mapa[nombre] = i + 1))
  return mapa
})()

function parsearWeekday(valor: unknown): number {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 7) return valor
  if (typeof valor === 'string') {
    const texto = valor.trim()
    const numero = Number(texto)
    if (Number.isInteger(numero) && numero >= 1 && numero <= 7) return numero
    const porNombre = NOMBRE_A_WEEKDAY[normalizar(texto)]
    if (porNombre) return porNombre
  }
  throw new Error(`Un día no indica de qué día de la semana es (usa 1–7, donde 1 es lunes).`)
}

function parsearEjercicios(valor: unknown, weekday: number): RoutineDayImport['exercises'] {
  if (!Array.isArray(valor)) {
    throw new Error(`Los ejercicios de ${WEEKDAY_NAMES[weekday]} no son una lista.`)
  }
  return valor.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`Un ejercicio de ${WEEKDAY_NAMES[weekday]} está mal escrito.`)
    }
    const e = raw as Record<string, unknown>
    const nombre = e.name ?? e.nombre
    if (typeof nombre !== 'string' || !nombre.trim()) {
      throw new Error(`Un ejercicio de ${WEEKDAY_NAMES[weekday]} no tiene nombre.`)
    }
    return {
      name: nombre.trim(),
      target_sets: enteroOpcional(e.sets ?? e.target_sets ?? e.series),
      target_reps: repsOpcional(e.reps ?? e.target_reps ?? e.repeticiones),
      notes: textoOpcional(e.notes ?? e.notas, weekday) || null,
    }
  })
}

/* ---------- Conversión de campos sueltos ---------- */

function enteroOpcional(valor: unknown): number | null {
  if (valor == null || valor === '') return null
  const n = typeof valor === 'number' ? valor : Number(String(valor).trim())
  return Number.isFinite(n) ? Math.round(n) : null
}

/** Las reps se guardan como texto ("8-10", "al fallo"); un número se acepta y se vuelve texto. */
function repsOpcional(valor: unknown): string | null {
  if (valor == null) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? String(valor) : null
  const texto = String(valor).trim()
  return texto || null
}

function textoOpcional(valor: unknown, weekday: number): string | undefined {
  if (valor == null) return undefined
  if (typeof valor !== 'string') {
    throw new Error(`Un texto de ${WEEKDAY_NAMES[weekday]} tiene un valor que no es texto.`)
  }
  return valor.trim()
}

function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}
