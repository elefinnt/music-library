import type { AudioFormat, Bitrate, EnqueueInput, EnqueueResult, TagHints } from '@shared/types'
import { SchemaMissingError, schemaStatus } from '../library/db'
import { addHistory } from '../library/history'
import { insertJob } from '../library/jobs'
import { createPlaylist } from '../library/playlists'
import { findDuplicate } from '../library/tracks'
import { routeUrl, type AudioRoute } from '../sources/router'
import { lookupSpotify } from '../sources/spotify'
import { entryUrl, listPlaylist, probeMedia, type YtDlpEntry } from '../sources/ytdlp'
import { pump } from './runner'

const PLAYLIST_CAP = 300

function assertFormat(format: string): AudioFormat {
  if (format !== 'mp3' && format !== 'wav') throw new Error('Choose MP3 or WAV.')
  return format
}

function assertBitrate(bitrate: number): Bitrate {
  if (bitrate !== 128 && bitrate !== 256 && bitrate !== 320) throw new Error('Choose 128, 256, or 320 kbps.')
  return bitrate
}

function cleanHints(hints: TagHints | null | undefined): TagHints | null {
  if (!hints) return null
  const artworkUrl = hints.artworkUrl?.trim()
  if (artworkUrl && !artworkUrl.startsWith('https://') && !artworkUrl.startsWith('http://')) {
    throw new Error('Artwork links must be http or https.')
  }
  return {
    title: hints.title?.trim().slice(0, 200) || undefined,
    artist: hints.artist?.trim().slice(0, 200) || undefined,
    album: hints.album?.trim().slice(0, 200) || undefined,
    artworkUrl: artworkUrl || undefined
  }
}

export async function enqueue(input: EnqueueInput): Promise<EnqueueResult> {
  const schema = schemaStatus()
  if (!schema.ready) throw new SchemaMissingError(schema)
  const format = assertFormat(input.format)
  const bitrate = format === 'wav' ? null : assertBitrate(input.bitrate)
  const hints = cleanHints(input.tagHints)
  const route = routeUrl(input.url)
  if (route.kind === 'spotify') {
    addHistory('spotify', route.url)
    const spotify = await lookupSpotify(route.spotify)
    const notice = spotify.truncated ? 'Only the first 300 Spotify tracks are shown.' : null
    return { jobs: [], spotify, notice }
  }
  addHistory('url', route.url)
  if (route.playlist) return enqueuePlaylist(route, format, bitrate)
  return enqueueSingle(route, format, bitrate, hints)
}

async function enqueueSingle(
  route: AudioRoute,
  format: AudioFormat,
  bitrate: Bitrate | null,
  tagHints: TagHints | null
): Promise<EnqueueResult> {
  const info = await probeMedia(route.url, route.source)
  const duplicate = findDuplicate({
    sourceUrl: info.sourceUrl,
    source: info.source,
    sourceId: info.sourceId,
    title: info.title,
    artist: info.artist,
    duration: info.duration
  })
  const job = insertJob({
    url: info.sourceUrl,
    source: info.source,
    status: duplicate ? 'duplicate' : 'queued',
    title: tagHints?.title || info.title,
    artist: tagHints?.artist || info.artist,
    album: tagHints?.album || info.album,
    duration: info.duration,
    format,
    bitrate,
    duplicateTrackId: duplicate?.id ?? null,
    playlistId: null,
    replaceExisting: false,
    tagHints
  })
  if (!duplicate) pump()
  return { jobs: [job], spotify: null, notice: null }
}

async function enqueuePlaylist(route: AudioRoute, format: AudioFormat, bitrate: Bitrate | null): Promise<EnqueueResult> {
  const dump = await listPlaylist(route.url)
  const entries = (dump.entries ?? []).filter((entry): entry is YtDlpEntry => Boolean(entry))
  if (!entries.length) throw new Error('That playlist has no tracks.')
  const capped = entries.slice(0, PLAYLIST_CAP)
  const playlist = createPlaylist(dump.title || 'Imported playlist')
  const jobs = capped.flatMap((entry) => {
    const url = entryUrl(route.source, entry)
    if (!url) return []
    const duplicate = findDuplicate({ sourceUrl: url })
    return [
      insertJob({
        url,
        source: route.source,
        status: duplicate ? 'duplicate' : 'queued',
        title: entry.title ?? null,
        artist: null,
        album: null,
        duration: typeof entry.duration === 'number' ? entry.duration : null,
        format,
        bitrate,
        duplicateTrackId: duplicate?.id ?? null,
        playlistId: playlist.id,
        replaceExisting: false,
        tagHints: null
      })
    ]
  })
  if (!jobs.length) throw new Error('That playlist did not contain any downloadable tracks.')
  pump()
  return {
    jobs,
    spotify: null,
    notice: entries.length > PLAYLIST_CAP ? 'Only the first 300 tracks were queued.' : null
  }
}
