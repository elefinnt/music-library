import { dialog, ipcMain, shell } from 'electron'
import fs from 'fs'
import { channels } from '@shared/channels'
import type { EnqueueInput, MoveDirection, Settings } from '@shared/types'
import { SchemaMissingError, recheckSchema, schemaStatus } from './library/db'
import { listHistory } from './library/history'
import { listJobs } from './library/jobs'
import {
  addToPlaylist,
  createPlaylist,
  deletePlaylist,
  listPlaylists,
  movePlaylistTrack,
  playlistTracks,
  removeFromPlaylist,
  renamePlaylist
} from './library/playlists'
import { getTrack, listTracks } from './library/tracks'
import { enqueue } from './queue/enqueue'
import { cancelJob, resolveDuplicate, retryJob } from './queue/runner'
import { getSpotifyPublic, setSpotifyCredentials } from './secrets'
import { getSettings, saveSettings } from './settings'
import { clearSpotifyToken } from './sources/spotify'

function handle<T>(channel: string, fn: (args: unknown) => Promise<T> | T): void {
  ipcMain.handle(channel, async (_event, args: unknown) => {
    try {
      return { ok: true as const, data: await fn(args) }
    } catch (error) {
      const schema = error instanceof SchemaMissingError ? error.status : undefined
      const message = error instanceof Error ? error.message : 'Something went wrong.'
      return { ok: false as const, error: message, schema }
    }
  })
}

function asNumber(value: unknown, label: string): number {
  const number = Number(value)
  if (!Number.isInteger(number)) throw new Error(`${label} is not valid.`)
  return number
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) throw new Error('That request was not valid.')
  return value as Record<string, unknown>
}

export function registerIpc(): void {
  handle(channels.schema, () => schemaStatus())
  handle(channels.recheckSchema, () => recheckSchema())
  handle(channels.enqueue, (args) => {
    const record = asRecord(args)
    if (typeof record.url !== 'string') throw new Error('Paste a link first.')
    return enqueue(record as unknown as EnqueueInput)
  })
  handle(channels.cancel, (id) => cancelJob(asNumber(id, 'Download')))
  handle(channels.retry, (id) => retryJob(asNumber(id, 'Download')))
  handle(channels.resolveDuplicate, (args) => {
    const record = asRecord(args)
    const choice = record.choice === 'replace' ? 'replace' : 'skip'
    return resolveDuplicate(asNumber(record.jobId, 'Download'), choice)
  })
  handle(channels.listJobs, () => listJobs())
  handle(channels.listTracks, () => listTracks())
  handle(channels.search, (query) => listTracks(typeof query === 'string' ? query : ''))
  handle(channels.createPlaylist, (name) => createPlaylist(typeof name === 'string' ? name : ''))
  handle(channels.renamePlaylist, (args) => {
    const record = asRecord(args)
    return renamePlaylist(asNumber(record.id, 'Playlist'), typeof record.name === 'string' ? record.name : '')
  })
  handle(channels.deletePlaylist, (id) => {
    deletePlaylist(asNumber(id, 'Playlist'))
    return true
  })
  handle(channels.listPlaylists, () => listPlaylists())
  handle(channels.playlistTracks, (id) => playlistTracks(asNumber(id, 'Playlist')))
  handle(channels.addToPlaylist, (args) => {
    const record = asRecord(args)
    addToPlaylist(asNumber(record.playlistId, 'Playlist'), asNumber(record.trackId, 'Track'))
    return true
  })
  handle(channels.removeFromPlaylist, (args) => {
    const record = asRecord(args)
    removeFromPlaylist(asNumber(record.playlistId, 'Playlist'), asNumber(record.trackId, 'Track'))
    return true
  })
  handle(channels.movePlaylistTrack, (args) => {
    const record = asRecord(args)
    const direction: MoveDirection = record.direction === 'up' ? 'up' : 'down'
    movePlaylistTrack(asNumber(record.playlistId, 'Playlist'), asNumber(record.trackId, 'Track'), direction)
    return true
  })
  handle(channels.history, () => listHistory())
  handle(channels.getSettings, () => getSettings())
  handle(channels.saveSettings, (args) => saveSettings(asRecord(args) as unknown as Settings))
  handle(channels.getSpotifyCredentials, () => getSpotifyPublic())
  handle(channels.setSpotifyCredentials, (args) => {
    const record = asRecord(args)
    const saved = setSpotifyCredentials(
      typeof record.clientId === 'string' ? record.clientId : '',
      typeof record.clientSecret === 'string' ? record.clientSecret : ''
    )
    clearSpotifyToken()
    return saved
  })
  handle(channels.browseDirectory, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  handle(channels.browseFile, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'] })
    return result.canceled ? null : result.filePaths[0] ?? null
  })
  handle(channels.revealTrack, (id) => {
    const track = getTrack(asNumber(id, 'Track'))
    if (!track) throw new Error('That track is not in the library.')
    shell.showItemInFolder(track.filePath)
    return true
  })
  handle(channels.openMusicFolder, async () => {
    const root = getSettings().musicRoot
    fs.mkdirSync(root, { recursive: true })
    await shell.openPath(root)
    return true
  })
}
