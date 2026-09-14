import { sql } from './client'
import type { WorkoutSet } from './types'

/** Ejercicios con historial, ordenados por uso reciente. */
export async function listTrackedExercises(query = ''): Promise<
  { name: string; sessions: number; last_date: string; best_weight: number | null }[]
> {
  const like = `%${query.trim()}%`
  return sql<{ name: string; sessions: number; last_date: string; best_weight: number | null }>`
    SELECT
      ws.exercise_name AS name,
      COUNT(DISTINCT ws.session_id) AS sessions,
      MAX(s.date) AS last_date,
      MAX(ws.weight_kg) AS best_weight
    FROM workout_sets ws
    JOIN workout_sessions s ON s.id = ws.session_id
    WHERE ws.exercise_name LIKE ${like}
    GROUP BY ws.exercise_name
    ORDER BY last_date DESC, name`
}

export type ExerciseDay = {
  date: string
  session_id: number
  sets: WorkoutSet[]
  volume: number
  bestWeight: number | null
}

/** Historial de un ejercicio agrupado por sesión: el "¿cómo se compara?" del producto. */
export async function exerciseHistory(name: string, limit = 30): Promise<ExerciseDay[]> {
  const rows = await sql<WorkoutSet & { date: string }>`
    SELECT ws.*, s.date
    FROM workout_sets ws
    JOIN workout_sessions s ON s.id = ws.session_id
    WHERE ws.exercise_name = ${name}
    ORDER BY s.date DESC, ws.session_id DESC, ws.set_number
    LIMIT ${limit * 12}`

  const bySession = new Map<number, ExerciseDay>()
  for (const row of rows) {
    let day = bySession.get(row.session_id)
    if (!day) {
      day = { date: row.date, session_id: row.session_id, sets: [], volume: 0, bestWeight: null }
      bySession.set(row.session_id, day)
    }
    day.sets.push(row)
    day.volume += (row.weight_kg ?? 0) * (row.reps ?? 0)
    if (row.weight_kg != null && (day.bestWeight == null || row.weight_kg > day.bestWeight)) {
      day.bestWeight = row.weight_kg
    }
  }
  return [...bySession.values()].slice(0, limit)
}

export type ExerciseStats = {
  totalSessions: number
  totalSets: number
  bestWeight: number | null
  bestVolumeDay: number | null
  lastVolume: number | null
}

export async function exerciseStats(name: string): Promise<ExerciseStats> {
  const [totals] = await sql<{ sessions: number; sets: number; best: number | null }>`
    SELECT COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS sets, MAX(weight_kg) AS best
    FROM workout_sets WHERE exercise_name = ${name}`
  const volumes = await sql<{ session_id: number; date: string; volume: number }>`
    SELECT ws.session_id, s.date, SUM(COALESCE(ws.weight_kg, 0) * COALESCE(ws.reps, 0)) AS volume
    FROM workout_sets ws
    JOIN workout_sessions s ON s.id = ws.session_id
    WHERE ws.exercise_name = ${name}
    GROUP BY ws.session_id, s.date
    ORDER BY s.date DESC`
  return {
    totalSessions: totals?.sessions ?? 0,
    totalSets: totals?.sets ?? 0,
    bestWeight: totals?.best ?? null,
    bestVolumeDay: volumes.length ? Math.max(...volumes.map((v) => v.volume)) : null,
    lastVolume: volumes[0]?.volume ?? null,
  }
}

/** Serie temporal del mejor peso por sesión, para la gráfica de evolución. */
export async function exerciseProgress(
  name: string,
  limit = 20,
): Promise<{ date: string; bestWeight: number | null; volume: number }[]> {
  const rows = await sql<{ date: string; best: number | null; volume: number }>`
    SELECT s.date AS date, MAX(ws.weight_kg) AS best,
           SUM(COALESCE(ws.weight_kg, 0) * COALESCE(ws.reps, 0)) AS volume
    FROM workout_sets ws
    JOIN workout_sessions s ON s.id = ws.session_id
    WHERE ws.exercise_name = ${name}
    GROUP BY s.date
    ORDER BY s.date DESC
    LIMIT ${limit}`
  return rows.reverse().map((r) => ({ date: r.date, bestWeight: r.best, volume: r.volume }))
}

export type WeeklyTotals = {
  sessions: number
  sets: number
  volume: number
  cardioSeconds: number
}

export async function weeklyTotals(sinceDate: string): Promise<WeeklyTotals> {
  const [strength] = await sql<{ sessions: number; sets: number; volume: number | null }>`
    SELECT COUNT(DISTINCT s.id) AS sessions, COUNT(ws.id) AS sets,
           SUM(COALESCE(ws.weight_kg, 0) * COALESCE(ws.reps, 0)) AS volume
    FROM workout_sessions s
    JOIN workout_sets ws ON ws.session_id = s.id
    WHERE s.date >= ${sinceDate}`
  const [cardio] = await sql<{ seconds: number | null }>`
    SELECT SUM(duration_seconds) AS seconds FROM cardio_sessions WHERE date >= ${sinceDate}`
  return {
    sessions: strength?.sessions ?? 0,
    sets: strength?.sets ?? 0,
    volume: strength?.volume ?? 0,
    cardioSeconds: cardio?.seconds ?? 0,
  }
}

/** Mejor peso registrado por ejercicio (PR simple). */
export async function personalRecords(
  limit = 12,
): Promise<{ name: string; weight: number; reps: number | null; date: string }[]> {
  return sql<{ name: string; weight: number; reps: number | null; date: string }>`
    SELECT ws.exercise_name AS name, ws.weight_kg AS weight, ws.reps AS reps, s.date AS date
    FROM workout_sets ws
    JOIN workout_sessions s ON s.id = ws.session_id
    JOIN (
      SELECT exercise_name, MAX(weight_kg) AS best
      FROM workout_sets WHERE weight_kg IS NOT NULL
      GROUP BY exercise_name
    ) top ON top.exercise_name = ws.exercise_name AND top.best = ws.weight_kg
    GROUP BY ws.exercise_name
    ORDER BY s.date DESC
    LIMIT ${limit}`
}
