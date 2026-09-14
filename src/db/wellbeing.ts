import { sql } from './client'
import { nowISO, shiftDays, todayISO } from '../lib/date'
import type { BodyMeasurement, WaterRecord } from './types'
import { bmi } from '../lib/format'

/* ---------- Agua ---------- */

export async function addWater(date: string, liters: number): Promise<void> {
  await sql`
    INSERT INTO water_records (date, liters, timestamp) VALUES (${date}, ${liters}, ${nowISO()})`
}

export async function deleteWater(id: number): Promise<void> {
  await sql`DELETE FROM water_records WHERE id = ${id}`
}

export async function listWaterByDate(date: string): Promise<WaterRecord[]> {
  return sql<WaterRecord>`
    SELECT * FROM water_records WHERE date = ${date} ORDER BY timestamp DESC`
}

export async function waterTotal(date: string): Promise<number> {
  const [row] = await sql<{ total: number | null }>`
    SELECT SUM(liters) AS total FROM water_records WHERE date = ${date}`
  return row?.total ?? 0
}

export async function waterHistory(days = 14): Promise<{ date: string; total: number }[]> {
  return sql<{ date: string; total: number }>`
    SELECT date, SUM(liters) AS total FROM water_records
    GROUP BY date ORDER BY date DESC LIMIT ${days}`
}

/** Litros por día de los últimos N días, con los días sin registro en cero. */
export async function waterDailySeries(days = 14): Promise<{ date: string; total: number }[]> {
  const since = shiftDays(todayISO(), -(days - 1))
  const rows = await sql<{ date: string; total: number | null }>`
    SELECT date, SUM(liters) AS total FROM water_records
    WHERE date >= ${since}
    GROUP BY date ORDER BY date`

  const byDate = new Map(rows.map((row) => [row.date, row.total ?? 0]))
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDays(since, i)
    return { date, total: byDate.get(date) ?? 0 }
  })
}

/* ---------- Peso corporal ---------- */

export async function addMeasurement(input: {
  date: string
  weight_kg: number | null
  height_cm: number | null
  notes: string | null
}): Promise<void> {
  const computed =
    input.weight_kg != null && input.height_cm != null ? bmi(input.weight_kg, input.height_cm) : null
  await sql`
    INSERT INTO body_measurements (date, weight_kg, height_cm, bmi, notes)
    VALUES (${input.date}, ${input.weight_kg}, ${input.height_cm}, ${computed}, ${input.notes})`
}

export async function deleteMeasurement(id: number): Promise<void> {
  await sql`DELETE FROM body_measurements WHERE id = ${id}`
}

export async function listMeasurements(limit = 60): Promise<BodyMeasurement[]> {
  return sql<BodyMeasurement>`
    SELECT * FROM body_measurements ORDER BY date DESC, id DESC LIMIT ${limit}`
}

export async function lastMeasurement(): Promise<BodyMeasurement | null> {
  const rows = await sql<BodyMeasurement>`
    SELECT * FROM body_measurements ORDER BY date DESC, id DESC LIMIT 1`
  return rows[0] ?? null
}

/* ---------- Ajustes ---------- */

export async function getSetting(key: string): Promise<string | null> {
  const rows = await sql<{ value: string | null }>`SELECT value FROM settings WHERE key = ${key}`
  return rows[0]?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${value})
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`
}

export const SETTINGS = {
  waterGoal: 'water_goal_liters',
  heightCm: 'height_cm',
  theme: 'theme',
  restSeconds: 'rest_seconds',
  restAlert: 'rest_alert',
} as const

export async function getWaterGoal(): Promise<number> {
  const raw = await getSetting(SETTINGS.waterGoal)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2.5
}

/** Duración por defecto del descanso entre series, en segundos. */
export const REST_SECONDS_DEFAULT = 90

export async function getRestSeconds(): Promise<number> {
  const raw = await getSetting(SETTINGS.restSeconds)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : REST_SECONDS_DEFAULT
}

/** Aviso (pitido y vibración) al terminar el descanso; activo salvo que se apague. */
export async function getRestAlert(): Promise<boolean> {
  return (await getSetting(SETTINGS.restAlert)) !== '0'
}
