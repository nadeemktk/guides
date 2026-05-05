import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

let db: Database.Database

export function getDatabase(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'cst_transport.db')
  const schemaPath = path.join(__dirname, 'schema.sql')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run schema if fresh
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    db.exec(schema)
  }

  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
  }
}

// Utility: run query returning all rows
export function all<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): T[] {
  return getDatabase().prepare(sql).all(...params) as T[]
}

// Utility: run query returning first row
export function get<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): T | undefined {
  return getDatabase().prepare(sql).get(...params) as T | undefined
}

// Utility: run INSERT/UPDATE/DELETE
export function run(
  sql: string,
  params: unknown[] = []
): Database.RunResult {
  return getDatabase().prepare(sql).run(...params)
}

// Utility: transaction wrapper
export function transaction<T>(fn: () => T): T {
  return getDatabase().transaction(fn)()
}
