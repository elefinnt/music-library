import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import type { SchemaStatus } from '@shared/types'

const REQUIRED = ['tracks', 'jobs', 'playlists', 'playlist_tracks', 'history']

let database: DatabaseSync | null = null

export function projectRoot(): string {
  return path.resolve(__dirname, '../..')
}

export function databaseFile(): string {
  return path.join(app.getPath('userData'), 'library.sqlite')
}

export function sqlFilePath(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'sql', '001_create.sql')
  return path.join(projectRoot(), 'sql', '001_create.sql')
}

export function openDatabase(): DatabaseSync {
  if (database) return database
  const file = databaseFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  database = new DatabaseSync(file)
  database.exec('PRAGMA foreign_keys = ON')
  return database
}

export function reopenDatabase(): DatabaseSync {
  if (database) {
    database.close()
    database = null
  }
  return openDatabase()
}

export function schemaStatus(): SchemaStatus {
  const db = openDatabase()
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>
  const names = new Set(rows.map((row) => row.name))
  const missing = REQUIRED.filter((name) => !names.has(name))
  const ready = missing.length === 0
  return {
    ready,
    databaseFile: databaseFile(),
    sqlFile: sqlFilePath(),
    message: ready
      ? 'Library ready.'
      : `Missing tables: ${missing.join(', ')}. Apply sql/001_create.sql to the database file, then check again. This app will not change the schema.`
  }
}

export function recheckSchema(): SchemaStatus {
  reopenDatabase()
  return schemaStatus()
}

export class SchemaMissingError extends Error {
  status: SchemaStatus

  constructor(status: SchemaStatus) {
    super(status.message)
    this.name = 'SchemaMissingError'
    this.status = status
  }
}

export function requireDb(): DatabaseSync {
  const status = schemaStatus()
  if (!status.ready) throw new SchemaMissingError(status)
  return openDatabase()
}

export function allRows<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return requireDb().prepare(sql).all(...params) as T[]
}

export function oneRow<T>(sql: string, ...params: SQLInputValue[]): T | undefined {
  return requireDb().prepare(sql).get(...params) as T | undefined
}

export function runSql(sql: string, ...params: SQLInputValue[]): { changes: number; lastInsertRowid: number } {
  const result = requireDb().prepare(sql).run(...params)
  return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) }
}
