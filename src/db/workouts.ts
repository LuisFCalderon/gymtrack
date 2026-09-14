import { sql, transaction } from './client'
import { nowISO, todayISO, weekdayOf } from '../lib/date'
import type { SessionExercise, WorkoutSession, WorkoutSet } from './types'

export async function getSessionByDate(date: string): Promise<WorkoutSession | null> {
  const rows = await sql<WorkoutSession>`
    SELECT * FROM workout_sessions WHERE date = ${date} ORDER BY id DESC LIMIT 1`
  return rows[0] ?? null
}

export async function getSession(id: number): Promise<WorkoutSession | null> {
  const rows = await sql<WorkoutSession>`SELECT * FROM workout_sessions WHERE id = ${id}`
  return rows[0] ?? null
}

/**
 * Abre la sesión del día (o devuelve la existente) copiando el plan de la rutina.
 * La copia es lo que permite sustituir un ejercicio sólo por hoy.
 */
export async function startSession(date = todayISO()): Promise<number> {
  const existing = await getSessionByDate(date)
  if (existing) return existing.id

  const weekday = weekdayOf(new Date(`${date}T12:00:00`))
  return transaction(async (tx) => {
    const days = await tx.sql<{ id: number }>`SELECT id FROM routine_days WHERE weekday = ${weekday}`
    const dayId = days[0]?.id ?? null
    const [{ id }] = await tx.sql<{ id: number }>`
      INSERT INTO workout_sessions (date, day_id, started_at)
      VALUES (${date}, ${dayId}, ${nowISO()}) RETURNING id`

    if (dayId != null) {
      await tx.sql`
        INSERT INTO session_exercises
          (session_id, routine_exercise_id, name, order_index, target_sets, target_reps, notes)
        SELECT ${id}, id, name, order_index, target_sets, target_reps, notes
        FROM routine_exercises WHERE day_id = ${dayId} ORDER BY order_index, id`
    }
    return id
  })
}

export async function finishSession(sessionId: number): Promise<void> {
  await sql`UPDATE workout_sessions SET ended_at = ${nowISO()} WHERE id = ${sessionId}`
}

export async function reopenSession(sessionId: number): Promise<void> {
  await sql`UPDATE workout_sessions SET ended_at = NULL WHERE id = ${sessionId}`
}

export async function setSessionNotes(sessionId: number, notes: string): Promise<void> {
  await sql`UPDATE workout_sessions SET notes = ${notes || null} WHERE id = ${sessionId}`
}

export async function deleteSession(sessionId: number): Promise<void> {
  await sql`DELETE FROM workout_sessions WHERE id = ${sessionId}`
}

export async function listSessionExercises(sessionId: number): Promise<SessionExercise[]> {
  return sql<SessionExercise>`
    SELECT * FROM session_exercises WHERE session_id = ${sessionId} ORDER BY order_index, id`
}

export async function listSessionSets(sessionId: number): Promise<WorkoutSet[]> {
  return sql<WorkoutSet>`
    SELECT * FROM workout_sets WHERE session_id = ${sessionId} ORDER BY session_exercise_id, set_number`
}

/** Añade un ejercicio suelto a la sesión de hoy sin tocar la rutina. */
export async function addSessionExercise(sessionId: number, name: string): Promise<void> {
  const [{ next }] = await sql<{ next: number }>`
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM session_exercises WHERE session_id = ${sessionId}`
  await sql`
    INSERT INTO session_exercises (session_id, routine_exercise_id, name, order_index)
    VALUES (${sessionId}, NULL, ${name}, ${next})`
}

export async function removeSessionExercise(id: number): Promise<void> {
  await sql`DELETE FROM session_exercises WHERE id = ${id}`
}

export type SubstitutionScope = 'today' | 'routine'

/**
 * Sustituye un ejercicio de la sesión. En ambos casos la sesión (y por tanto el
 * historial) conserva el ejercicio realmente realizado; `routine` además actualiza
 * la rutina habitual.
 */
export async function substituteExercise(
  sessionExercise: SessionExercise,
  newName: string,
  scope: SubstitutionScope,
): Promise<void> {
  const origin = sessionExercise.substituted_from ?? sessionExercise.name
  await transaction(async (tx) => {
    await tx.sql`
      UPDATE session_exercises
      SET name = ${newName}, substituted_from = ${origin === newName ? null : origin}
      WHERE id = ${sessionExercise.id}`
    await tx.sql`
      UPDATE workout_sets SET exercise_name = ${newName} WHERE session_exercise_id = ${sessionExercise.id}`
    if (scope === 'routine' && sessionExercise.routine_exercise_id != null) {
      await tx.sql`
        UPDATE routine_exercises SET name = ${newName} WHERE id = ${sessionExercise.routine_exercise_id}`
    }
  })
}

export type SetInput = {
  weight_kg: number | null
  reps: number | null
  rir: number | null
  notes: string | null
}

export async function addSet(
  sessionId: number,
  sessionExercise: SessionExercise,
  input: SetInput,
): Promise<void> {
  const [{ next }] = await sql<{ next: number }>`
    SELECT COALESCE(MAX(set_number), 0) + 1 AS next
    FROM workout_sets WHERE session_exercise_id = ${sessionExercise.id}`
  await sql`
    INSERT INTO workout_sets
      (session_id, session_exercise_id, exercise_name, set_number, weight_kg, reps, rir, notes)
    VALUES (${sessionId}, ${sessionExercise.id}, ${sessionExercise.name}, ${next},
            ${input.weight_kg}, ${input.reps}, ${input.rir}, ${input.notes})`
}

export async function updateSet(id: number, input: SetInput): Promise<void> {
  await sql`
    UPDATE workout_sets
    SET weight_kg = ${input.weight_kg}, reps = ${input.reps}, rir = ${input.rir}, notes = ${input.notes}
    WHERE id = ${id}`
}

/** Borra la serie y renumera las restantes del ejercicio para no dejar huecos. */
export async function deleteSet(set: WorkoutSet): Promise<void> {
  await transaction(async (tx) => {
    await tx.sql`DELETE FROM workout_sets WHERE id = ${set.id}`
    await tx.sql`
      UPDATE workout_sets SET set_number = set_number - 1
      WHERE session_exercise_id = ${set.session_exercise_id} AND set_number > ${set.set_number}`
  })
}

/** Última sesión anterior en la que se hizo este ejercicio, para comparar durante el entrenamiento. */
export async function lastPerformance(
  exerciseName: string,
  beforeSessionId: number,
): Promise<{ date: string; sets: WorkoutSet[] } | null> {
  const rows = await sql<{ session_id: number; date: string }>`
    SELECT ws.session_id, s.date
    FROM workout_sets ws
    JOIN workout_sessions s ON s.id = ws.session_id
    WHERE ws.exercise_name = ${exerciseName} AND ws.session_id != ${beforeSessionId}
    ORDER BY s.date DESC, ws.session_id DESC
    LIMIT 1`
  if (!rows[0]) return null
  const sets = await sql<WorkoutSet>`
    SELECT * FROM workout_sets
    WHERE session_id = ${rows[0].session_id} AND exercise_name = ${exerciseName}
    ORDER BY set_number`
  return { date: rows[0].date, sets }
}

export type SessionSummary = {
  id: number
  date: string
  day_name: string | null
  ended_at: string | null
  notes: string | null
  exercises: number
  sets: number
  volume: number | null
}

export async function listSessionSummaries(limit = 60, offset = 0): Promise<SessionSummary[]> {
  return sql<SessionSummary>`
    SELECT
      s.id, s.date, d.name AS day_name, s.ended_at, s.notes,
      (SELECT COUNT(DISTINCT ws.session_exercise_id) FROM workout_sets ws WHERE ws.session_id = s.id) AS exercises,
      (SELECT COUNT(*) FROM workout_sets ws WHERE ws.session_id = s.id) AS sets,
      (SELECT SUM(COALESCE(ws.weight_kg, 0) * COALESCE(ws.reps, 0)) FROM workout_sets ws WHERE ws.session_id = s.id) AS volume
    FROM workout_sessions s
    LEFT JOIN routine_days d ON d.id = s.day_id
    ORDER BY s.date DESC, s.id DESC
    LIMIT ${limit} OFFSET ${offset}`
}
