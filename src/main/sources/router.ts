import type { AudioSource, SpotifyKind } from '@shared/types'
import { isSoundCloudHost, isSoundCloudSet } from './soundcloud'
import { parseSpotifyTarget } from './spotify'
import { isYouTubeHost, isYouTubePlaylist } from './youtube'

const SPOTIFY_HOSTS = new Set(['open.spotify.com', 'www.open.spotify.com'])

export type AudioRoute = {
  kind: 'audio'
  source: AudioSource
  url: string
  playlist: boolean
}

export type SpotifyRoute = {
  kind: 'spotify'
  url: string
  spotify: { kind: SpotifyKind; id: string }
}

export type Route = AudioRoute | SpotifyRoute

export function routeUrl(raw: string): Route {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error('That is not a valid link.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http and https links are allowed.')
  }
  const host = url.hostname.toLowerCase()
  if (isYouTubeHost(host)) {
    return { kind: 'audio', source: 'youtube', url: url.toString(), playlist: isYouTubePlaylist(url) }
  }
  if (isSoundCloudHost(host)) {
    return { kind: 'audio', source: 'soundcloud', url: url.toString(), playlist: isSoundCloudSet(url) }
  }
  if (SPOTIFY_HOSTS.has(host)) {
    const spotify = parseSpotifyTarget(url)
    if (!spotify) throw new Error('That Spotify link needs to be a track, album, or playlist.')
    return { kind: 'spotify', url: url.toString(), spotify }
  }
  throw new Error('This app only accepts YouTube, SoundCloud, and Spotify links.')
}
