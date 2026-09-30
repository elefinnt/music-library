import type {
  EnqueueInput,
  EnqueueResult,
  HistoryRecord,
  JobRecord,
  MoveDirection,
  PlaylistRecord,
  Result,
  SchemaStatus,
  Settings,
  SpotifyPublic,
  TrackRecord
} from './types'

export interface MusicBridge {
  schema: () => Promise<Result<SchemaStatus>>
  recheckSchema: () => Promise<Result<SchemaStatus>>
  enqueue: (input: EnqueueInput) => Promise<Result<EnqueueResult>>
  cancel: (jobId: number) => Promise<Result<JobRecord>>
  retry: (jobId: number) => Promise<Result<JobRecord>>
  resolveDuplicate: (jobId: number, choice: 'skip' | 'replace') => Promise<Result<JobRecord>>
  listJobs: () => Promise<Result<JobRecord[]>>
  listTracks: () => Promise<Result<TrackRecord[]>>
  search: (query: string) => Promise<Result<TrackRecord[]>>
  createPlaylist: (name: string) => Promise<Result<PlaylistRecord>>
  renamePlaylist: (id: number, name: string) => Promise<Result<PlaylistRecord>>
  deletePlaylist: (id: number) => Promise<Result<boolean>>
  listPlaylists: () => Promise<Result<PlaylistRecord[]>>
  playlistTracks: (id: number) => Promise<Result<TrackRecord[]>>
  addToPlaylist: (playlistId: number, trackId: number) => Promise<Result<boolean>>
  removeFromPlaylist: (playlistId: number, trackId: number) => Promise<Result<boolean>>
  movePlaylistTrack: (playlistId: number, trackId: number, direction: MoveDirection) => Promise<Result<boolean>>
  history: () => Promise<Result<HistoryRecord[]>>
  getSettings: () => Promise<Result<Settings>>
  saveSettings: (settings: Settings) => Promise<Result<Settings>>
  getSpotifyCredentials: () => Promise<Result<SpotifyPublic>>
  setSpotifyCredentials: (clientId: string, clientSecret: string) => Promise<Result<SpotifyPublic>>
  browseDirectory: () => Promise<Result<string | null>>
  browseFile: () => Promise<Result<string | null>>
  revealTrack: (trackId: number) => Promise<Result<boolean>>
  openMusicFolder: () => Promise<Result<boolean>>
  onJobProgress: (listener: (job: JobRecord) => void) => () => void
}
