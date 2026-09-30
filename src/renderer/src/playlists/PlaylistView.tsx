import { useEffect, useState, type FormEvent } from 'react'
import type { PlaylistRecord, TrackRecord } from '@shared/types'
import { unwrap } from '../api'
import { formatDuration } from '../format'

export function PlaylistView(props: { disabled: boolean }) {
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [tracks, setTracks] = useState<TrackRecord[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function loadLists(preferred?: number) {
    const next = await unwrap(window.music.listPlaylists())
    setPlaylists(next)
    const id = preferred ?? selected ?? next[0]?.id ?? null
    setSelected(id)
    if (id) setTracks(await unwrap(window.music.playlistTracks(id)))
    else setTracks([])
  }

  useEffect(() => {
    if (props.disabled) return
    void loadLists().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Playlists could not be read.'))
  }, [props.disabled])

  async function create(event: FormEvent) {
    event.preventDefault()
    const created = await unwrap(window.music.createPlaylist(name))
    setName('')
    await loadLists(created.id)
  }

  const current = playlists.find((playlist) => playlist.id === selected)

  return (
    <div className="stack">
      <header>
        <h1>Playlists</h1>
        <p>Local lists only. They are not copies of Spotify playlists.</p>
      </header>
      <form className="row" onSubmit={(event) => void create(event)}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New playlist name" aria-label="New playlist name" />
        <button type="submit" disabled={props.disabled || !name.trim()}>Create playlist</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <div className="split">
        <ul className="list">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <button type="button" className={playlist.id === selected ? 'nav active' : 'nav'} onClick={() => void loadLists(playlist.id)}>
                {playlist.name}
                <span>{playlist.trackCount}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="stack">
          {current ? (
            <div className="row">
              <button
                type="button"
                onClick={() => {
                  const next = window.prompt('Rename playlist', current.name)
                  if (!next) return
                  void unwrap(window.music.renamePlaylist(current.id, next)).then(() => loadLists(current.id))
                }}
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  void unwrap(window.music.deletePlaylist(current.id)).then(() => loadLists())
                }}
              >
                Delete
              </button>
            </div>
          ) : <p className="empty">Create a playlist to start a shelf.</p>}
          <ul className="list">
            {tracks.map((track) => (
              <li key={track.id} className="track">
                <div>
                  <strong>{track.title}</strong>
                  <p>{track.artist}{track.duration ? ` · ${formatDuration(track.duration)}` : ''}</p>
                </div>
                {current ? (
                  <div className="actions">
                    <button type="button" onClick={() => void unwrap(window.music.movePlaylistTrack(current.id, track.id, 'up')).then(() => loadLists(current.id))}>Up</button>
                    <button type="button" onClick={() => void unwrap(window.music.movePlaylistTrack(current.id, track.id, 'down')).then(() => loadLists(current.id))}>Down</button>
                    <button type="button" onClick={() => void unwrap(window.music.removeFromPlaylist(current.id, track.id)).then(() => loadLists(current.id))}>Remove</button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
