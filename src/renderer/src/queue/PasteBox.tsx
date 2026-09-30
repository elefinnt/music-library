import { useEffect, useState, type FormEvent } from 'react'
import type { AudioFormat, Bitrate, EnqueueResult, Settings } from '@shared/types'
import { unwrap } from '../api'

export function PasteBox(props: {
  draftUrl: string
  onDraftUrl: (url: string) => void
  settings: Settings | null
  disabled: boolean
  onResult: (result: EnqueueResult) => void
  onOptions: (format: AudioFormat, bitrate: Bitrate) => void
}) {
  const [format, setFormat] = useState<AudioFormat>(props.settings?.format ?? 'mp3')
  const [bitrate, setBitrate] = useState<Bitrate>(props.settings?.bitrate ?? 320)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.settings) return
    setFormat(props.settings.format)
    setBitrate(props.settings.bitrate)
    props.onOptions(props.settings.format, props.settings.bitrate)
  }, [props.settings])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await unwrap(window.music.enqueue({ url: props.draftUrl, format, bitrate }))
      props.onResult(result)
      if (!result.spotify) props.onDraftUrl('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The link could not be queued.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <label htmlFor="link">Paste a link</label>
      <input
        id="link"
        value={props.draftUrl}
        onChange={(event) => props.onDraftUrl(event.target.value)}
        placeholder="YouTube, SoundCloud, or Spotify"
        disabled={props.disabled || busy}
      />
      <div className="row">
        <label>
          Format
          <select value={format} onChange={(event) => {
            const next = event.target.value as AudioFormat
            setFormat(next)
            props.onOptions(next, bitrate)
          }} disabled={busy}>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
          </select>
        </label>
        <label>
          Bitrate
          <select
            value={bitrate}
            onChange={(event) => {
              const next = Number(event.target.value) as Bitrate
              setBitrate(next)
              props.onOptions(format, next)
            }}
            disabled={busy || format === 'wav'}
          >
            <option value={320}>320 kbps</option>
            <option value={256}>256 kbps</option>
            <option value={128}>128 kbps</option>
          </select>
        </label>
        <button type="submit" disabled={props.disabled || busy || !props.draftUrl.trim()}>
          {busy ? 'Reading link…' : 'Add'}
        </button>
      </div>
      <p className="hint">
        YouTube and SoundCloud audio is already compressed. WAV stores that same audio in a larger file. It is not a
        studio master. MP3 encodes it again, so it loses a little more quality.
      </p>
      {error ? <p className="error">{error}</p> : null}
    </form>
  )
}
