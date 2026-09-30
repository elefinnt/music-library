export type AudioSource = 'youtube' | 'soundcloud'
export type AudioFormat = 'mp3' | 'wav'
export type Bitrate = 128 | 256 | 320
export type JobStatus =
  | 'queued'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'duplicate'
  | 'skipped'
export type HistoryKind = 'url' | 'spotify'
export type SpotifyKind = 'track' | 'album' | 'playlist'
export type MoveDirection = 'up' | 'down'

export interface Settings {
  musicRoot: string
  format: AudioFormat
  bitrate: Bitrate
  parallelDownloads: number
  filenameTemplate: string
  cookiesPath: string
  ytdlpPath: string
  ffmpegPath: string
  ffprobePath: string
}

export interface TagHints {
  title?: string
  artist?: string
  album?: string
  artworkUrl?: string
}

export interface TrackRecord {
  id: number
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
  addedAt: string
}

export interface JobRecord {
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
  trackId: number | null
  duplicateTrackId: number | null
  playlistId: number | null
  replaceExisting: boolean
  tagHints: TagHints | null
  createdAt: string
  updatedAt: string
}

export interface PlaylistRecord {
  id: number
  name: string
  createdAt: string
  trackCount: number
}

export interface HistoryRecord {
  id: number
  kind: HistoryKind
  value: string
  createdAt: string
}

export interface SpotifyTrackMeta {
  spotifyId: string
  title: string
  artist: string
  album: string
  durationMs: number
  isrc: string | null
  artworkUrl: string | null
  searchText: string
}

export interface SpotifyLookup {
  kind: SpotifyKind
  name: string
  tracks: SpotifyTrackMeta[]
  truncated: boolean
}

export interface SchemaStatus {
  ready: boolean
  message: string
  sqlFile: string
  databaseFile: string
}

export interface EnqueueInput {
  url: string
  format: AudioFormat
  bitrate: Bitrate
  tagHints?: TagHints | null
}

export interface EnqueueResult {
  jobs: JobRecord[]
  spotify: SpotifyLookup | null
  notice: string | null
}

export interface SpotifyPublic {
  clientId: string
  hasSecret: boolean
}

export interface Ok<T> {
  ok: true
  data: T
}

export interface Err {
  ok: false
  error: string
  schema?: SchemaStatus
}

export type Result<T> = Ok<T> | Err
