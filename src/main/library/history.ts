import type { HistoryKind, HistoryRecord } from '@shared/types'
import { allRows, runSql } from './db'

interface HistoryRow {
  id: number
  kind: HistoryKind
  value: string
  created_at: string
}

export function addHistory(kind: HistoryKind, value: string): void {
  runSql('INSERT INTO history (kind, value) VALUES (?, ?)', kind, value)
}

export function listHistory(): HistoryRecord[] {
  return allRows<HistoryRow>('SELECT * FROM history ORDER BY id DESC LIMIT 100').map((row) => ({
    id: row.id,
    kind: row.kind,
    value: row.value,
    createdAt: row.created_at
  }))
}
