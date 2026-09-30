import { useState } from 'react'
import type { AudioFormat, Bitrate, SpotifyLookup, SpotifyTrackMeta } from '@shared/types'
import { unwrap } from '../api'
import { formatDuration } from '../format'

export function MatchPanel(props: {
  lookup: SpotifyLookup
  format: AudioFormat
  bitrate: Bitrate
  onQueued: () => void
  onClose: () => void
}) {
  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>Match a public upload</h2>
          <p className="hint">
            {props.lookup.name} is metadata only. Paste a YouTube or SoundCloud link over the search text. Spotify audio
            is not downloaded.
          </p>
        </div>
        <button type="button" onClick={props.onClose}>
          Close
        </button>
      </div>
      <ul className="list">
        {props.lookup.tracks.map((track) => (
          <MatchRow key={track.spotifyId} track={track} format={props.format} bitrate={props.bitrate} onQueued={props.onQueued} />
        ))}
      </ul>
    </section>
  )
}

function MatchRow(props: {
  track: SpotifyTrackMeta
  format: AudioFormat
  bitrate: Bitrate
  onQueued: () => void
}) {
  const [value, setValue] = useState(props.track.searchText)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function useLink() {
    setBusy(true)
    setError(null)
    try {
      await unwrap(
        window.music.enqueue({
          url: value,
          format: props.format,
          bitrate: props.bitrate,
          tagHints: {
            title: props.track.title,
            artist: props.track.artist,
            album: props.track.album,
            artworkUrl: props.track.artworkUrl ?? undefined
          }
        })
      )
      props.onQueued()
      setValue('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That link could not be queued.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="match">
      {props.track.artworkUrl ? <img src={props.track.artworkUrl} alt="" /> : <span className="art">{props.track.title.slice(0, 1)}</span>}
      <div>
        <strong>{props.track.title}</strong>
        <p>
          {props.track.artist} · {props.track.album}
          {props.track.durationMs ? ` · ${formatDuration(props.track.durationMs / 1000)}` : ''}
        </p>
        <div className="row">
          <input value={value} onChange={(event) => setValue(event.target.value)} aria-label={`Matching link for ${props.track.title}`} />
          <button type="button" onClick={() => void useLink()} disabled={busy}>
            {busy ? 'Reading…' : 'Use this link'}
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </li>
  )
}
