import { sql } from './client'

/**
 * Migraciones incrementales. Cada entrada se aplica una sola vez y en orden.
 * Nunca se edita una migración ya publicada: se agrega una nueva al final.
 */
const MIGRATIONS: { id: number; up: string[] }[] = [
  {
    id: 1,
    up: [
      `CREATE TABLE routine_days (
        id INTEGER PRIMARY KEY,
        weekday INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL DEFAULT '',
        rest_day INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE routine_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        target_sets INTEGER,
        target_reps TEXT,
        notes TEXT
      )`,
      `CREATE INDEX idx_routine_exercises_day ON routine_exercises(day_id, order_index)`,
      `CREATE TABLE workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        day_id INTEGER REFERENCES routine_days(id) ON DELETE SET NULL,
        started_at TEXT,
        ended_at TEXT,
        notes TEXT
      )`,
      `CREATE INDEX idx_workout_sessions_date ON workout_sessions(date DESC)`,
      // Copia del plan del día al iniciar la sesión. Permite sustituir un ejercicio
      // "solo hoy" sin tocar la rutina, y conserva lo realmente hecho en el historial.
      `CREATE TABLE session_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        routine_exercise_id INTEGER,
        name TEXT NOT NULL,
        substituted_from TEXT,
        order_index INTEGER NOT NULL DEFAULT 0,
        target_sets INTEGER,
        target_reps TEXT,
        notes TEXT
      )`,
      `CREATE INDEX idx_session_exercises_session ON session_exercises(session_id, order_index)`,
      `CREATE TABLE workout_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        session_exercise_id INTEGER REFERENCES session_exercises(id) ON DELETE CASCADE,
        exercise_name TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        weight_kg REAL,
        reps INTEGER,
        rir INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX idx_workout_sets_session ON workout_sets(session_id, session_exercise_id, set_number)`,
      `CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_name)`,
      `CREATE TABLE cardio_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        duration_seconds INTEGER,
        distance_km REAL,
        steps INTEGER,
        pace TEXT,
        speed_kmh REAL,
        incline_percent REAL,
        average_heart_rate INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX idx_cardio_sessions_date ON cardio_sessions(date DESC)`,
      `CREATE TABLE cardio_intervals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cardio_session_id INTEGER NOT NULL REFERENCES cardio_sessions(id) ON DELETE CASCADE,
        interval_number INTEGER NOT NULL,
        duration_seconds INTEGER,
        distance_km REAL,
        pace TEXT,
        speed_kmh REAL,
        incline_percent REAL,
        notes TEXT
      )`,
      `CREATE INDEX idx_cardio_intervals_session ON cardio_intervals(cardio_session_id, interval_number)`,
      `CREATE TABLE water_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        liters REAL NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX idx_water_records_date ON water_records(date DESC)`,
      `CREATE TABLE body_measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        weight_kg REAL,
        height_cm REAL,
        bmi REAL,
        notes TEXT
      )`,
      `CREATE INDEX idx_body_measurements_date ON body_measurements(date DESC)`,
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
    ],
  },
]

const DEFAULT_DAYS = [
  [1, 'Lunes'],
  [2, 'Martes'],
  [3, 'Miércoles'],
  [4, 'Jueves'],
  [5, 'Viernes'],
  [6, 'Sábado'],
  [7, 'Domingo'],
] as const

let ready: Promise<void> | null = null

export function initDatabase(): Promise<void> {
  if (!ready) ready = migrate()
  return ready
}

async function migrate(): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`
  const applied = await sql<{ id: number }>`SELECT id FROM schema_migrations`
  const done = new Set(applied.map((row) => row.id))

  for (const migration of MIGRATIONS) {
    if (done.has(migration.id)) continue
    for (const statement of migration.up) await sql(statement)
    await sql`INSERT INTO schema_migrations (id, applied_at) VALUES (${migration.id}, datetime('now'))`
  }

  // Los siete días existen siempre: la rutina se configura, no se crea.
  for (const [weekday, name] of DEFAULT_DAYS) {
    await sql`INSERT OR IGNORE INTO routine_days (weekday, name, rest_day) VALUES (${weekday}, ${name}, 0)`
  }
}
