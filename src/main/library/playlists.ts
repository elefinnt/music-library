import type { MoveDirection, PlaylistRecord, TrackRecord } from '@shared/types'
import { allRows, oneRow, runSql } from './db'
import { getTrack, mapTrack } from './tracks'

interface PlaylistRow {
  id: number
  name: string
  created_at: string
  track_count: number
}

interface TrackRow {
  id: number
  source: TrackRecord['source']
  source_id: string
  source_url: string
  title: string
  artist: string
  album: string
  duration: number | null
  format: TrackRecord['format']
  bitrate: number | null
  file_path: string
  artwork_path: string | null
  added_at: string
}

function mapPlaylist(row: PlaylistRow): PlaylistRecord {
  return { id: row.id, name: row.name, createdAt: row.created_at, trackCount: row.track_count }
}

function cleanName(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  if (!trimmed) throw new Error('Give the playlist a name.')
  return trimmed.slice(0, 120)
}

export function createPlaylist(name: string): PlaylistRecord {
  const result = runSql('INSERT INTO playlists (name) VALUES (?)', cleanName(name))
  const row = oneRow<PlaylistRow>(
    `SELECT playlists.*, 0 AS track_count FROM playlists WHERE id = ?`,
    result.lastInsertRowid
  )
  if (!row) throw new Error('The playlist was created but could not be read back.')
  return mapPlaylist(row)
}

export function listPlaylists(): PlaylistRecord[] {
  return allRows<PlaylistRow>(
    `SELECT playlists.*, COUNT(playlist_tracks.track_id) AS track_count
     FROM playlists
     LEFT JOIN playlist_tracks ON playlist_tracks.playlist_id = playlists.id
     GROUP BY playlists.id
     ORDER BY playlists.name COLLATE NOCASE`
  ).map(mapPlaylist)
}

export function renamePlaylist(id: number, name: string): PlaylistRecord {
  runSql('UPDATE playlists SET name = ? WHERE id = ?', cleanName(name), id)
  const match = listPlaylists().find((playlist) => playlist.id === id)
  if (!match) throw new Error('That playlist no longer exists.')
  return match
}

export function deletePlaylist(id: number): void {
  const result = runSql('DELETE FROM playlists WHERE id = ?', id)
  if (result.changes !== 1) throw new Error('That playlist no longer exists.')
}

export function playlistTracks(id: number): TrackRecord[] {
  return allRows<TrackRow>(
    `SELECT tracks.* FROM tracks
     INNER JOIN playlist_tracks ON playlist_tracks.track_id = tracks.id
     WHERE playlist_tracks.playlist_id = ?
     ORDER BY playlist_tracks.position ASC`,
    id
  ).map(mapTrack)
}

export function addToPlaylist(playlistId: number, trackId: number): void {
  if (!getTrack(trackId)) throw new Error('That track is not in the library.')
  const existing = oneRow<{ position: number }>(
    'SELECT position FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?',
    playlistId,
    trackId
  )
  if (existing) return
  const max = oneRow<{ max_position: number | null }>(
    'SELECT MAX(position) AS max_position FROM playlist_tracks WHERE playlist_id = ?',
    playlistId
  )
  runSql(
    'INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)',
    playlistId,
    trackId,
    (max?.max_position ?? 0) + 1
  )
}

export function removeFromPlaylist(playlistId: number, trackId: number): void {
  runSql('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', playlistId, trackId)
}

export function movePlaylistTrack(playlistId: number, trackId: number, direction: MoveDirection): void {
  const rows = allRows<{ track_id: number; position: number }>(
    'SELECT track_id, position FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
    playlistId
  )
  const index = rows.findIndex((row) => row.track_id === trackId)
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return
  const current = rows[index]
  const other = rows[swapWith]
  runSql(
    'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?',
    other.position,
    playlistId,
    current.track_id
  )
  runSql(
    'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?',
    current.position,
    playlistId,
    other.track_id
  )
}
