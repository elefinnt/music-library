import { useEffect, useState } from 'react'
import type { PlaylistRecord, TrackRecord } from '@shared/types'
import { unwrap } from '../api'
import { artworkSrc, formatDuration } from '../format'

export function LibraryView(props: { disabled: boolean }) {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<TrackRecord[]>([])
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  async function load(nextQuery = query) {
    setTracks(await unwrap(window.music.search(nextQuery)))
    setPlaylists(await unwrap(window.music.listPlaylists()))
  }

  useEffect(() => {
    if (props.disabled) return
    void load('').catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'The library could not be read.'))
  }, [props.disabled])

  async function add(trackId: number, playlistId: string) {
    if (!playlistId) return
    await unwrap(window.music.addToPlaylist(Number(playlistId), trackId))
  }

  return (
    <div className="stack">
      <header>
        <h1>Library</h1>
        <p>Search the tracks already saved on this computer.</p>
      </header>
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault()
          void load().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Search failed.'))
        }}
      >
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, artist, or album" aria-label="Search the library" />
        <button type="submit" disabled={props.disabled}>Search</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {!tracks.length ? <p className="empty">No tracks yet.</p> : null}
      <ul className="list">
        {tracks.map((track) => (
          <li key={track.id} className="track">
            {artworkSrc(track.artworkPath) ? <img src={artworkSrc(track.artworkPath) ?? ''} alt="" /> : <span className="art">{track.title.slice(0, 1)}</span>}
            <div>
              <strong>{track.title}</strong>
              <p>
                {track.artist} · {track.album} · {track.format.toUpperCase()}
                {track.duration ? ` · ${formatDuration(track.duration)}` : ''}
              </p>
            </div>
            <div className="actions">
              <button type="button" onClick={() => void unwrap(window.music.revealTrack(track.id))}>Show file</button>
              {playlists.length ? (
                <select aria-label={`Add ${track.title} to playlist`} defaultValue="" onChange={(event) => void add(track.id, event.target.value)}>
                  <option value="">Add to playlist</option>
                  {playlists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
                  ))}
                </select>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
