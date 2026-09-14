export type RoutineDay = {
  id: number
  weekday: number
  name: string
  rest_day: number
}

export type RoutineExercise = {
  id: number
  day_id: number
  name: string
  order_index: number
  target_sets: number | null
  target_reps: string | null
  notes: string | null
}

export type WorkoutSession = {
  id: number
  date: string
  day_id: number | null
  started_at: string | null
  ended_at: string | null
  notes: string | null
}

export type SessionExercise = {
  id: number
  session_id: number
  routine_exercise_id: number | null
  name: string
  substituted_from: string | null
  order_index: number
  target_sets: number | null
  target_reps: string | null
  notes: string | null
}

export type WorkoutSet = {
  id: number
  session_id: number
  session_exercise_id: number | null
  exercise_name: string
  set_number: number
  weight_kg: number | null
  reps: number | null
  rir: number | null
  notes: string | null
  created_at: string
}

export const CARDIO_TYPES = [
  'Caminata',
  'Carrera',
  'Bicicleta',
  'Elíptica',
  'Escaladora',
  'Otro',
] as const

export type CardioType = (typeof CARDIO_TYPES)[number]

export type CardioSession = {
  id: number
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
  created_at: string
}

export type CardioInterval = {
  id: number
  cardio_session_id: number
  interval_number: number
  duration_seconds: number | null
  distance_km: number | null
  pace: string | null
  speed_kmh: number | null
  incline_percent: number | null
  notes: string | null
}

export type WaterRecord = {
  id: number
  date: string
  liters: number
  timestamp: string
}

export type BodyMeasurement = {
  id: number
  date: string
  weight_kg: number | null
  height_cm: number | null
  bmi: number | null
  notes: string | null
}

export const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}
