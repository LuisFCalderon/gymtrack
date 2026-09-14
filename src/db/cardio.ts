import { sql } from './client'
import type { CardioInterval, CardioSession } from './types'

export type CardioInput = {
  date: string
  type: string
  duration_seconds: number | null
  distance_km: number | null
  steps: number | null
  pace: string | null
  speed_kmh: number | null
  incline_percent: number | null
  average_heart_rate: number | null
  notes: string | null
}

export async function createCardio(input: CardioInput): Promise<number> {
  const [{ id }] = await sql<{ id: number }>`
    INSERT INTO cardio_sessions
      (date, type, duration_seconds, distance_km, steps, pace, speed_kmh, incline_percent, average_heart_rate, notes)
    VALUES (${input.date}, ${input.type}, ${input.duration_seconds}, ${input.distance_km}, ${input.steps},
            ${input.pace}, ${input.speed_kmh}, ${input.incline_percent}, ${input.average_heart_rate}, ${input.notes})
    RETURNING id`
  return id
}

export async function updateCardio(id: number, input: CardioInput): Promise<void> {
  await sql`
    UPDATE cardio_sessions SET
      date = ${input.date}, type = ${input.type}, duration_seconds = ${input.duration_seconds},
      distance_km = ${input.distance_km}, steps = ${input.steps}, pace = ${input.pace},
      speed_kmh = ${input.speed_kmh}, incline_percent = ${input.incline_percent},
      average_heart_rate = ${input.average_heart_rate}, notes = ${input.notes}
    WHERE id = ${id}`
}

export async function deleteCardio(id: number): Promise<void> {
  await sql`DELETE FROM cardio_sessions WHERE id = ${id}`
}

export async function getCardio(id: number): Promise<CardioSession | null> {
  const rows = await sql<CardioSession>`SELECT * FROM cardio_sessions WHERE id = ${id}`
  return rows[0] ?? null
}

export async function listCardio(limit = 60): Promise<CardioSession[]> {
  return sql<CardioSession>`
    SELECT * FROM cardio_sessions ORDER BY date DESC, id DESC LIMIT ${limit}`
}

export async function listCardioByDate(date: string): Promise<CardioSession[]> {
  return sql<CardioSession>`SELECT * FROM cardio_sessions WHERE date = ${date} ORDER BY id`
}

export async function listIntervals(cardioSessionId: number): Promise<CardioInterval[]> {
  return sql<CardioInterval>`
    SELECT * FROM cardio_intervals WHERE cardio_session_id = ${cardioSessionId} ORDER BY interval_number`
}

export type IntervalInput = Omit<CardioInterval, 'id' | 'cardio_session_id' | 'interval_number'>

export async function addInterval(cardioSessionId: number, input: IntervalInput): Promise<void> {
  const [{ next }] = await sql<{ next: number }>`
    SELECT COALESCE(MAX(interval_number), 0) + 1 AS next
    FROM cardio_intervals WHERE cardio_session_id = ${cardioSessionId}`
  await sql`
    INSERT INTO cardio_intervals
      (cardio_session_id, interval_number, duration_seconds, distance_km, pace, speed_kmh, incline_percent, notes)
    VALUES (${cardioSessionId}, ${next}, ${input.duration_seconds}, ${input.distance_km}, ${input.pace},
            ${input.speed_kmh}, ${input.incline_percent}, ${input.notes})`
}

export async function deleteInterval(id: number): Promise<void> {
  await sql`DELETE FROM cardio_intervals WHERE id = ${id}`
}
