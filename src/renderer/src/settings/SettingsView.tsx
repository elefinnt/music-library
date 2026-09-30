import { useEffect, useState, type FormEvent } from 'react'
import type { AudioFormat, Bitrate, Settings, SpotifyPublic } from '@shared/types'
import { unwrap } from '../api'

const EMPTY: Settings = {
  musicRoot: '',
  format: 'mp3',
  bitrate: 320,
  parallelDownloads: 2,
  filenameTemplate: '{artist}/{album}/{title}.{ext}',
  cookiesPath: '',
  ytdlpPath: '',
  ffmpegPath: '',
  ffprobePath: ''
}

export function SettingsView() {
  const [settings, setSettings] = useState<Settings>(EMPTY)
  const [spotify, setSpotify] = useState<SpotifyPublic>({ clientId: '', hasSecret: false })
  const [secret, setSecret] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void unwrap(window.music.getSettings()).then(setSettings).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Settings could not be read.')
    })
    void unwrap(window.music.getSpotifyCredentials()).then(setSpotify).catch(() => undefined)
  }, [])

  function patch(partial: Partial<Settings>) {
    setSettings((current) => ({ ...current, ...partial }))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      setSettings(await unwrap(window.music.saveSettings(settings)))
      setMessage('Settings saved.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Settings could not be saved.')
    }
  }

  async function saveSpotify(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const saved = await unwrap(window.music.setSpotifyCredentials(spotify.clientId, secret))
      setSpotify(saved)
      setSecret('')
      setMessage('Spotify credentials saved in the Windows credential store.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Spotify credentials could not be saved.')
    }
  }

  return (
    <div className="stack">
      <header>
        <h1>Settings</h1>
        <p>Files are organised from the template. The default is Artist / Album / Title.</p>
      </header>
      <form className="card stack" onSubmit={(event) => void save(event)}>
        <label>
          Music folder
          <span className="row">
            <input value={settings.musicRoot} onChange={(event) => patch({ musicRoot: event.target.value })} />
            <button type="button" onClick={() => void unwrap(window.music.browseDirectory()).then((folder) => folder && patch({ musicRoot: folder }))}>Browse</button>
          </span>
        </label>
        <div className="row">
          <label>
            Default format
            <select value={settings.format} onChange={(event) => patch({ format: event.target.value as AudioFormat })}>
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
            </select>
          </label>
          <label>
            MP3 bitrate
            <select value={settings.bitrate} onChange={(event) => patch({ bitrate: Number(event.target.value) as Bitrate })}>
              <option value={320}>320 kbps</option>
              <option value={256}>256 kbps</option>
              <option value={128}>128 kbps</option>
            </select>
          </label>
          <label>
            Parallel downloads
            <input
              type="number"
              min={1}
              max={4}
              value={settings.parallelDownloads}
              onChange={(event) => patch({ parallelDownloads: Number(event.target.value) })}
            />
          </label>
        </div>
        <label>
          File name template
          <input value={settings.filenameTemplate} onChange={(event) => patch({ filenameTemplate: event.target.value })} />
        </label>
        <p className="hint">Tokens: {'{artist}'} {'{album}'} {'{title}'} {'{ext}'} {'{source}'}. A missing title or extension is added for you.</p>
        <label>
          Cookies file
          <span className="row">
            <input value={settings.cookiesPath} onChange={(event) => patch({ cookiesPath: event.target.value })} />
            <button type="button" onClick={() => void unwrap(window.music.browseFile()).then((file) => file && patch({ cookiesPath: file }))}>Browse</button>
          </span>
        </label>
        <p className="hint">Optional cookies.txt for videos you can already watch while logged in. The app does not log in for you.</p>
        <label>
          yt-dlp path
          <input value={settings.ytdlpPath} onChange={(event) => patch({ ytdlpPath: event.target.value })} placeholder="Leave blank to use the bundled tool" />
        </label>
        <label>
          ffmpeg path
          <input value={settings.ffmpegPath} onChange={(event) => patch({ ffmpegPath: event.target.value })} placeholder="Leave blank to use the bundled tool" />
        </label>
        <label>
          ffprobe path
          <input value={settings.ffprobePath} onChange={(event) => patch({ ffprobePath: event.target.value })} placeholder="Leave blank to use the bundled tool" />
        </label>
        <div className="row">
          <button type="submit">Save settings</button>
          <button type="button" onClick={() => void unwrap(window.music.openMusicFolder())}>Open music folder</button>
        </div>
      </form>
      <form className="card stack" onSubmit={(event) => void saveSpotify(event)}>
        <h2>Spotify metadata</h2>
        <p className="hint">Stored with Windows credential protection, not in the project. Used only to read titles, artists, albums, and artwork.</p>
        <label>
          Client id
          <input value={spotify.clientId} onChange={(event) => setSpotify({ ...spotify, clientId: event.target.value })} />
        </label>
        <label>
          Client secret
          <input
            type="password"
            value={secret}
            placeholder={spotify.hasSecret ? 'A secret is already stored' : ''}
            onChange={(event) => setSecret(event.target.value)}
          />
        </label>
        <div className="row">
          <button type="submit">Save Spotify credentials</button>
          <button
            type="button"
            onClick={() => void unwrap(window.music.setSpotifyCredentials('', '')).then((saved) => {
              setSpotify(saved)
              setSecret('')
              setMessage('Spotify credentials removed.')
            })}
          >
            Remove credentials
          </button>
        </div>
      </form>
      {message ? <p className="notice">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
