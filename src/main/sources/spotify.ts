import type { SpotifyKind, SpotifyLookup, SpotifyTrackMeta } from '@shared/types'
import { getSpotifyCredentials } from '../secrets'

const HOST = 'https://api.spotify.com/v1'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const TRACK_CAP = 300

interface TokenCache {
  accessToken: string
  expiresAt: number
}

interface SpotifyImage {
  url: string
}

interface SpotifyArtist {
  name: string
}

interface SpotifyAlbumRef {
  name: string
  images?: SpotifyImage[]
}

interface SpotifyTrack {
  id?: string
  name?: string
  duration_ms?: number
  is_local?: boolean
  artists?: SpotifyArtist[]
  album?: SpotifyAlbumRef
  external_ids?: { isrc?: string }
}

interface SpotifyPaging {
  items: SpotifyTrack[]
  next: string | null
}

interface SpotifyPlaylistPage {
  items: Array<{ track: SpotifyTrack | null }>
  next: string | null
}

let tokenCache: TokenCache | null = null

export function clearSpotifyToken(): void {
  tokenCache = null
}

export function parseSpotifyTarget(url: URL): { kind: SpotifyKind; id: string } | null {
  const match = url.pathname.match(/\/(track|album|playlist)\/([A-Za-z0-9]+)/)
  if (!match) return null
  return { kind: match[1] as SpotifyKind, id: match[2] }
}

async function getToken(): Promise<string> {
  const { clientId, clientSecret } = getSpotifyCredentials()
  if (!clientId || !clientSecret) {
    throw new Error('Add a Spotify client id and secret in Settings. Spotify links only load metadata.')
  }
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  })
  if (!response.ok) throw new Error('Spotify refused the client id or secret. Check Settings.')
  const json = (await response.json()) as { access_token: string; expires_in: number }
  tokenCache = { accessToken: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return tokenCache.accessToken
}

async function apiGet<T>(pathname: string): Promise<T> {
  const token = await getToken()
  const response = await fetch(`${HOST}${pathname}`, { headers: { Authorization: `Bearer ${token}` } })
  if (response.status === 401) {
    tokenCache = null
    throw new Error('Spotify rejected the saved credentials.')
  }
  if (!response.ok) throw new Error(`Spotify could not load that link (${response.status}).`)
  return (await response.json()) as T
}

function artistName(artists: SpotifyArtist[] | undefined): string {
  const name = (artists ?? []).map((artist) => artist.name).filter(Boolean).join(', ')
  return name || 'Unknown artist'
}

function toMeta(track: SpotifyTrack, album: string, artworkUrl: string | null): SpotifyTrackMeta | null {
  if (!track.id || track.is_local) return null
  const title = track.name?.trim() || 'Untitled'
  const artist = artistName(track.artists)
  return {
    spotifyId: track.id,
    title,
    artist,
    album: album || 'Unknown album',
    durationMs: track.duration_ms ?? 0,
    isrc: track.external_ids?.isrc ?? null,
    artworkUrl,
    searchText: `${artist} - ${title}`
  }
}

function apiPath(next: string | null, fallback: string): string | null {
  if (!next) return fallback
  return next.replace(HOST, '')
}

export async function lookupSpotify(target: { kind: SpotifyKind; id: string }): Promise<SpotifyLookup> {
  if (target.kind === 'track') {
    const track = await apiGet<SpotifyTrack>(`/tracks/${target.id}`)
    const meta = toMeta(track, track.album?.name || 'Unknown album', track.album?.images?.[0]?.url ?? null)
    if (!meta) throw new Error('Spotify did not return a usable track.')
    return { kind: 'track', name: meta.title, tracks: [meta], truncated: false }
  }
  if (target.kind === 'album') {
    const album = await apiGet<{ name: string; images?: SpotifyImage[] }>(`/albums/${target.id}`)
    const artwork = album.images?.[0]?.url ?? null
    const tracks: SpotifyTrackMeta[] = []
    let nextPath: string | null = `/albums/${target.id}/tracks?limit=50`
    while (nextPath && tracks.length < TRACK_CAP) {
      const page: SpotifyPaging = await apiGet<SpotifyPaging>(nextPath)
      for (const item of page.items) {
        const meta = toMeta(item, album.name, artwork)
        if (meta) tracks.push(meta)
      }
      nextPath = page.next && tracks.length < TRACK_CAP ? apiPath(page.next, '') : null
    }
    return { kind: 'album', name: album.name, tracks, truncated: tracks.length >= TRACK_CAP }
  }
  const playlist = await apiGet<{ name: string }>(`/playlists/${target.id}`)
  const tracks: SpotifyTrackMeta[] = []
  let nextPath: string | null = `/playlists/${target.id}/tracks?limit=50`
  while (nextPath && tracks.length < TRACK_CAP) {
    const page: SpotifyPlaylistPage = await apiGet<SpotifyPlaylistPage>(nextPath)
    for (const item of page.items) {
      if (!item.track) continue
      const meta = toMeta(item.track, item.track.album?.name || 'Unknown album', item.track.album?.images?.[0]?.url ?? null)
      if (meta) tracks.push(meta)
    }
    nextPath = page.next && tracks.length < TRACK_CAP ? apiPath(page.next, '') : null
  }
  return { kind: 'playlist', name: playlist.name, tracks, truncated: tracks.length >= TRACK_CAP }
}
