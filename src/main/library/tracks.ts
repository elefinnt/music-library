import type { AudioFormat, AudioSource, TrackRecord } from '@shared/types'
import { allRows, oneRow, runSql } from './db'

interface TrackRow {
  id: number
  source: AudioSource
  source_id: string
  source_url: string
  title: string
  artist: string
  album: string
  duration: number | null
  format: AudioFormat
  bitrate: number | null
  file_path: string
  artwork_path: string | null
  added_at: string
}

export function mapTrack(row: TrackRow): TrackRecord {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    title: row.title,
    artist: row.artist,
    album: row.album,
    duration: row.duration,
    format: row.format,
    bitrate: row.bitrate,
    filePath: row.file_path,
    artworkPath: row.artwork_path,
    addedAt: row.added_at
  }
}

function likeTerm(query: string): string {
  const escaped = query.replace(/[\\%_]/g, (char) => `\\${char}`)
  return `%${escaped}%`
}

export function listTracks(query = ''): TrackRecord[] {
  const term = query.trim()
  if (!term) {
    return allRows<TrackRow>('SELECT * FROM tracks ORDER BY added_at DESC LIMIT 400').map(mapTrack)
  }
  const pattern = likeTerm(term)
  return allRows<TrackRow>(
    `SELECT * FROM tracks
     WHERE title LIKE ? ESCAPE '\\' OR artist LIKE ? ESCAPE '\\' OR album LIKE ? ESCAPE '\\'
     ORDER BY added_at DESC LIMIT 400`,
    pattern,
    pattern,
    pattern
  ).map(mapTrack)
}

export function getTrack(id: number): TrackRecord | null {
  const row = oneRow<TrackRow>('SELECT * FROM tracks WHERE id = ?', id)
  return row ? mapTrack(row) : null
}

export function findDuplicate(input: {
  sourceUrl: string
  source?: AudioSource | null
  sourceId?: string | null
  title?: string | null
  artist?: string | null
  duration?: number | null
}): TrackRecord | null {
  const byUrl = oneRow<TrackRow>('SELECT * FROM tracks WHERE source_url = ? LIMIT 1', input.sourceUrl)
  if (byUrl) return mapTrack(byUrl)
  if (input.source && input.sourceId) {
    const byIdentity = oneRow<TrackRow>(
      'SELECT * FROM tracks WHERE source = ? AND source_id = ? LIMIT 1',
      input.source,
      input.sourceId
    )
    if (byIdentity) return mapTrack(byIdentity)
  }
  if (input.title && input.artist && input.duration != null) {
    const byTags = oneRow<TrackRow>(
      `SELECT * FROM tracks
       WHERE lower(title) = lower(?) AND lower(artist) = lower(?)
         AND duration IS NOT NULL AND abs(duration - ?) <= 2
       LIMIT 1`,
      input.title,
      input.artist,
      input.duration
    )
    if (byTags) return mapTrack(byTags)
  }
  return null
}

export interface TrackWrite {
  source: AudioSource
  sourceId: string
  sourceUrl: string
  title: string
  artist: string
  album: string
  duration: number | null
  format: AudioFormat
  bitrate: number | null
  filePath: string
  artworkPath: string | null
}

export function insertTrack(input: TrackWrite): TrackRecord {
  const result = runSql(
    `INSERT INTO tracks (
      source, source_id, source_url, title, artist, album, duration, format, bitrate, file_path, artwork_path
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.source,
    input.sourceId,
    input.sourceUrl,
    input.title,
    input.artist,
    input.album,
    input.duration,
    input.format,
    input.bitrate,
    input.filePath,
    input.artworkPath
  )
  const track = getTrack(result.lastInsertRowid)
  if (!track) throw new Error('The track was saved but could not be read back.')
  return track
}

export function updateTrack(id: number, input: TrackWrite): TrackRecord {
  runSql(
    `UPDATE tracks SET
      source = ?, source_id = ?, source_url = ?, title = ?, artist = ?, album = ?,
      duration = ?, format = ?, bitrate = ?, file_path = ?, artwork_path = ?
     WHERE id = ?`,
    input.source,
    input.sourceId,
    input.sourceUrl,
    input.title,
    input.artist,
    input.album,
    input.duration,
    input.format,
    input.bitrate,
    input.filePath,
    input.artworkPath,
    id
  )
  const track = getTrack(id)
  if (!track) throw new Error('The existing track could not be updated.')
  return track
}
