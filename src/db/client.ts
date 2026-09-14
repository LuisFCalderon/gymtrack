import { SQLocal } from 'sqlocal'

const db = new SQLocal({
  databasePath: 'gymtrack.sqlite3',
  // Se ejecuta en cada conexión: SQLite desactiva las claves foráneas por defecto.
  onInit: (sql) => [sql`PRAGMA foreign_keys = ON`],
})

export const sql = db.sql
export const batch = db.batch
export const transaction = db.transaction
export const getDatabaseFile = db.getDatabaseFile
export const overwriteDatabaseFile = db.overwriteDatabaseFile
export const getDatabaseInfo = db.getDatabaseInfo
