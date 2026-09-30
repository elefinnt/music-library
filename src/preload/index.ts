import { contextBridge, ipcRenderer } from 'electron'
import type { MusicBridge } from '@shared/bridge'
import { channels } from '@shared/channels'
import type { EnqueueInput, JobRecord, MoveDirection, Settings } from '@shared/types'

const api: MusicBridge = {
  schema: () => ipcRenderer.invoke(channels.schema),
  recheckSchema: () => ipcRenderer.invoke(channels.recheckSchema),
  enqueue: (input: EnqueueInput) => ipcRenderer.invoke(channels.enqueue, input),
  cancel: (jobId) => ipcRenderer.invoke(channels.cancel, jobId),
  retry: (jobId) => ipcRenderer.invoke(channels.retry, jobId),
  resolveDuplicate: (jobId, choice) => ipcRenderer.invoke(channels.resolveDuplicate, { jobId, choice }),
  listJobs: () => ipcRenderer.invoke(channels.listJobs),
  listTracks: () => ipcRenderer.invoke(channels.listTracks),
  search: (query) => ipcRenderer.invoke(channels.search, query),
  createPlaylist: (name) => ipcRenderer.invoke(channels.createPlaylist, name),
  renamePlaylist: (id, name) => ipcRenderer.invoke(channels.renamePlaylist, { id, name }),
  deletePlaylist: (id) => ipcRenderer.invoke(channels.deletePlaylist, id),
  listPlaylists: () => ipcRenderer.invoke(channels.listPlaylists),
  playlistTracks: (id) => ipcRenderer.invoke(channels.playlistTracks, id),
  addToPlaylist: (playlistId, trackId) => ipcRenderer.invoke(channels.addToPlaylist, { playlistId, trackId }),
  removeFromPlaylist: (playlistId, trackId) => ipcRenderer.invoke(channels.removeFromPlaylist, { playlistId, trackId }),
  movePlaylistTrack: (playlistId, trackId, direction: MoveDirection) =>
    ipcRenderer.invoke(channels.movePlaylistTrack, { playlistId, trackId, direction }),
  history: () => ipcRenderer.invoke(channels.history),
  getSettings: () => ipcRenderer.invoke(channels.getSettings),
  saveSettings: (settings: Settings) => ipcRenderer.invoke(channels.saveSettings, settings),
  getSpotifyCredentials: () => ipcRenderer.invoke(channels.getSpotifyCredentials),
  setSpotifyCredentials: (clientId, clientSecret) =>
    ipcRenderer.invoke(channels.setSpotifyCredentials, { clientId, clientSecret }),
  browseDirectory: () => ipcRenderer.invoke(channels.browseDirectory),
  browseFile: () => ipcRenderer.invoke(channels.browseFile),
  revealTrack: (trackId) => ipcRenderer.invoke(channels.revealTrack, trackId),
  openMusicFolder: () => ipcRenderer.invoke(channels.openMusicFolder),
  onJobProgress: (listener) => {
    const wrapped = (_event: unknown, job: JobRecord) => listener(job)
    ipcRenderer.on(channels.jobProgress, wrapped)
    return () => ipcRenderer.removeListener(channels.jobProgress, wrapped)
  }
}

contextBridge.exposeInMainWorld('music', api)
