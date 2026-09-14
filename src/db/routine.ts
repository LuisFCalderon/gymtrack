import { sql, transaction } from './client'
import type { RoutineDay, RoutineExercise } from './types'

export async function listDays(): Promise<RoutineDay[]> {
  return sql<RoutineDay>`SELECT * FROM routine_days ORDER BY weekday`
}

export async function getDayByWeekday(weekday: number): Promise<RoutineDay | null> {
  const rows = await sql<RoutineDay>`SELECT * FROM routine_days WHERE weekday = ${weekday}`
  return rows[0] ?? null
}

export async function listExercises(dayId: number): Promise<RoutineExercise[]> {
  return sql<RoutineExercise>`
    SELECT * FROM routine_exercises WHERE day_id = ${dayId} ORDER BY order_index, id`
}

export async function countExercisesByDay(): Promise<Record<number, number>> {
  const rows = await sql<{ day_id: number; total: number }>`
    SELECT day_id, COUNT(*) AS total FROM routine_exercises GROUP BY day_id`
  return Object.fromEntries(rows.map((r) => [r.day_id, r.total]))
}

export async function updateDay(
  dayId: number,
  fields: { name: string; rest_day: boolean },
): Promise<void> {
  await sql`
    UPDATE routine_days SET name = ${fields.name}, rest_day = ${fields.rest_day ? 1 : 0}
    WHERE id = ${dayId}`
}

export type ExerciseInput = {
  name: string
  target_sets: number | null
  target_reps: string | null
  notes: string | null
}

export async function addExercise(dayId: number, input: ExerciseInput): Promise<void> {
  const [{ next }] = await sql<{ next: number }>`
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM routine_exercises WHERE day_id = ${dayId}`
  await sql`
    INSERT INTO routine_exercises (day_id, name, order_index, target_sets, target_reps, notes)
    VALUES (${dayId}, ${input.name}, ${next}, ${input.target_sets}, ${input.target_reps}, ${input.notes})`
}

export async function updateExercise(id: number, input: ExerciseInput): Promise<void> {
  await sql`
    UPDATE routine_exercises
    SET name = ${input.name}, target_sets = ${input.target_sets},
        target_reps = ${input.target_reps}, notes = ${input.notes}
    WHERE id = ${id}`
}

export async function deleteExercise(id: number): Promise<void> {
  await sql`DELETE FROM routine_exercises WHERE id = ${id}`
}

/** Persiste el nuevo orden completo del día tras un drag & drop. */
export async function reorderExercises(orderedIds: number[]): Promise<void> {
  await transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx.sql`UPDATE routine_exercises SET order_index = ${index} WHERE id = ${id}`
    }
  })
}

/** Sustitución permanente: el ejercicio nuevo ocupa el lugar del anterior en la rutina. */
export async function renameExercise(id: number, newName: string): Promise<void> {
  await sql`UPDATE routine_exercises SET name = ${newName} WHERE id = ${id}`
}

/** Nombres ya usados (rutina + historial) para autocompletar. */
export async function suggestExerciseNames(query: string): Promise<string[]> {
  const like = `%${query.trim()}%`
  const rows = await sql<{ name: string }>`
    SELECT name, MAX(last_used) AS last_used FROM (
      SELECT name, '' AS last_used FROM routine_exercises
      UNION ALL
      SELECT exercise_name AS name, MAX(created_at) AS last_used FROM workout_sets GROUP BY exercise_name
    )
    WHERE name LIKE ${like}
    GROUP BY name
    ORDER BY last_used DESC, name
    LIMIT 8`
  return rows.map((r) => r.name)
}
