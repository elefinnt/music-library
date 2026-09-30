import fs from 'fs'
import path from 'path'
import type { AudioSource } from '@shared/types'
import { cookieArgs, resolveTool } from '../media/binaries'
import { runProcess } from '../media/process'

export interface YtDlpEntry {
  id?: string
  url?: string
  title?: string
  webpage_url?: string
  duration?: number
}

export interface YtDlpDump {
  id?: string
  title?: string
  track?: string
  artist?: string
  album?: string
  uploader?: string
  creator?: string
  duration?: number
  thumbnail?: string
  webpage_url?: string
  entries?: Array<YtDlpEntry | null>
}

export interface MediaInfo {
  source: AudioSource
  sourceId: string
  sourceUrl: string
  title: string
  artist: string
  album: string
  duration: number | null
  thumbnail: string | null
}

function parseDump(stdout: string): YtDlpDump {
  const start = stdout.indexOf('{')
  if (start < 0) throw new Error('yt-dlp did not return track details.')
  return JSON.parse(stdout.slice(start)) as YtDlpDump
}

function clean(value: string | undefined, fallback: string): string {
  const text = (value ?? '').replace(/\s+/g, ' ').trim()
  return text || fallback
}

function ffmpegLocationArgs(): string[] {
  const ffmpeg = resolveTool('ffmpeg')
  if (!path.isAbsolute(ffmpeg)) return []
  return ['--ffmpeg-location', ffmpeg]
}

export function toMediaInfo(dump: YtDlpDump, source: AudioSource, fallbackUrl: string): MediaInfo {
  return {
    source,
    sourceId: dump.id || fallbackUrl,
    sourceUrl: dump.webpage_url || fallbackUrl,
    title: clean(dump.track || dump.title, 'Untitled'),
    artist: clean(dump.artist || dump.creator || dump.uploader, 'Unknown artist'),
    album: clean(dump.album, 'Unknown album'),
    duration: typeof dump.duration === 'number' ? dump.duration : null,
    thumbnail: dump.thumbnail || null
  }
}

export async function probeMedia(url: string, source: AudioSource, signal?: AbortSignal): Promise<MediaInfo> {
  const result = await runProcess({
    bin: resolveTool('yt-dlp'),
    args: ['-J', '--no-warnings', '--no-playlist', ...cookieArgs(), ...ffmpegLocationArgs(), url],
    signal
  })
  return toMediaInfo(parseDump(result.stdout), source, url)
}

export async function listPlaylist(url: string, signal?: AbortSignal): Promise<YtDlpDump> {
  const result = await runProcess({
    bin: resolveTool('yt-dlp'),
    args: ['-J', '--flat-playlist', '--no-warnings', ...cookieArgs(), url],
    signal
  })
  return parseDump(result.stdout)
}

function findAudio(directory: string): string {
  const files = fs.readdirSync(directory).filter((name) => {
    const lower = name.toLowerCase()
    return !lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.png') && !lower.endsWith('.webp') && !lower.endsWith('.part') && !lower.endsWith('.ytdl')
  })
  if (!files.length) throw new Error('yt-dlp finished without an audio file.')
  return path.join(directory, files[0])
}

export async function downloadAudio(
  url: string,
  directory: string,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const template = path.join(directory, 'audio.%(ext)s')
  await runProcess({
    bin: resolveTool('yt-dlp'),
    args: [
      '-f',
      'bestaudio/best',
      '--no-playlist',
      '--newline',
      '--no-warnings',
      ...cookieArgs(),
      ...ffmpegLocationArgs(),
      '-o',
      template,
      url
    ],
    signal,
    onLine: (line) => {
      const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/)
      if (match) onProgress(Number(match[1]) / 100)
    }
  })
  return findAudio(directory)
}

export function entryUrl(source: AudioSource, entry: YtDlpEntry): string | null {
  if (entry.webpage_url && entry.webpage_url.startsWith('http')) return entry.webpage_url
  if (entry.url && entry.url.startsWith('http')) return entry.url
  if (source === 'youtube' && entry.id) return `https://www.youtube.com/watch?v=${entry.id}`
  return null
}
