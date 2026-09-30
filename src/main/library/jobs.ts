import type { AudioFormat, AudioSource, JobRecord, JobStatus, TagHints } from '@shared/types'
import { allRows, oneRow, runSql } from './db'
import { now } from './time'

interface JobRow {
  id: number
  url: string
  source: AudioSource | null
  status: JobStatus
  progress: number
  error: string | null
  title: string | null
  artist: string | null
  album: string | null
  duration: number | null
  format: AudioFormat
  bitrate: number | null
  track_id: number | null
  duplicate_track_id: number | null
  playlist_id: number | null
  replace_existing: number
  tag_hints: string | null
  created_at: string
  updated_at: string
}

function parseHints(value: string | null): TagHints | null {
  if (!value) return null
  try {
    return JSON.parse(value) as TagHints
  } catch {
    return null
  }
}

export function mapJob(row: JobRow): JobRecord {
  return {
    id: row.id,
    url: row.url,
    source: row.source,
    status: row.status,
    progress: row.progress,
    error: row.error,
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    format: row.format,
    bitrate: row.bitrate,
    trackId: row.track_id,
    duplicateTrackId: row.duplicate_track_id,
    playlistId: row.playlist_id,
    replaceExisting: row.replace_existing === 1,
    tagHints: parseHints(row.tag_hints),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function getJob(id: number): JobRecord | null {
  const row = oneRow<JobRow>('SELECT * FROM jobs WHERE id = ?', id)
  return row ? mapJob(row) : null
}

export function listJobs(): JobRecord[] {
  return allRows<JobRow>('SELECT * FROM jobs ORDER BY id DESC LIMIT 200').map(mapJob)
}

export interface JobInsert {
  url: string
  source: AudioSource | null
  status: JobStatus
  title: string | null
  artist: string | null
  album: string | null
  duration: number | null
  format: AudioFormat
  bitrate: number | null
  duplicateTrackId: number | null
  playlistId: number | null
  replaceExisting: boolean
  tagHints: TagHints | null
}

export function insertJob(input: JobInsert): JobRecord {
  const result = runSql(
    `INSERT INTO jobs (
      url, source, status, title, artist, album, duration, format, bitrate,
      duplicate_track_id, playlist_id, replace_existing, tag_hints
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.url,
    input.source,
    input.status,
    input.title,
    input.artist,
    input.album,
    input.duration,
    input.format,
    input.bitrate,
    input.duplicateTrackId,
    input.playlistId,
    input.replaceExisting ? 1 : 0,
    input.tagHints ? JSON.stringify(input.tagHints) : null
  )
  const job = getJob(result.lastInsertRowid)
  if (!job) throw new Error('The download was queued but could not be read back.')
  return job
}

export interface JobPatch {
  url?: string
  source?: AudioSource | null
  status?: JobStatus
  progress?: number
  error?: string | null
  title?: string | null
  artist?: string | null
  album?: string | null
  duration?: number | null
  trackId?: number | null
  duplicateTrackId?: number | null
  replaceExisting?: boolean
  tagHints?: TagHints | null
}

export function updateJob(id: number, patch: JobPatch): JobRecord {
  const fields: Array<[string, string | number | null]> = []
  if (patch.url !== undefined) fields.push(['url', patch.url])
  if (patch.source !== undefined) fields.push(['source', patch.source])
  if (patch.status !== undefined) fields.push(['status', patch.status])
  if (patch.progress !== undefined) fields.push(['progress', patch.progress])
  if (patch.error !== undefined) fields.push(['error', patch.error])
  if (patch.title !== undefined) fields.push(['title', patch.title])
  if (patch.artist !== undefined) fields.push(['artist', patch.artist])
  if (patch.album !== undefined) fields.push(['album', patch.album])
  if (patch.duration !== undefined) fields.push(['duration', patch.duration])
  if (patch.trackId !== undefined) fields.push(['track_id', patch.trackId])
  if (patch.duplicateTrackId !== undefined) fields.push(['duplicate_track_id', patch.duplicateTrackId])
  if (patch.replaceExisting !== undefined) fields.push(['replace_existing', patch.replaceExisting ? 1 : 0])
  if (patch.tagHints !== undefined) fields.push(['tag_hints', patch.tagHints ? JSON.stringify(patch.tagHints) : null])
  fields.push(['updated_at', now()])
  const assignments = fields.map(([column]) => `${column} = ?`).join(', ')
  runSql(`UPDATE jobs SET ${assignments} WHERE id = ?`, ...fields.map(([, value]) => value), id)
  const job = getJob(id)
  if (!job) throw new Error('That download no longer exists.')
  return job
}

export function claimNextJob(): JobRecord | null {
  const row = oneRow<JobRow>("SELECT * FROM jobs WHERE status = 'queued' ORDER BY id ASC LIMIT 1")
  if (!row) return null
  const claimed = runSql(
    "UPDATE jobs SET status = 'running', progress = 0, error = NULL, updated_at = ? WHERE id = ? AND status = 'queued'",
    now(),
    row.id
  )
  if (claimed.changes !== 1) return null
  return getJob(row.id)
}

export function requeueRunning(): void {
  runSql("UPDATE jobs SET status = 'queued', progress = 0, error = NULL, updated_at = ? WHERE status = 'running'", now())
}
