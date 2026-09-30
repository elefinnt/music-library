import type { AudioFormat, Bitrate } from '@shared/types'
import { resolveTool } from './binaries'
import { runProcess } from './process'

export function ffmpegFraction(line: string, durationSeconds: number | null): number | null {
  const match = line.match(/^out_time_ms=(\d+)/)
  if (!match || !durationSeconds) return null
  const seconds = Number(match[1]) / 1_000_000
  if (!Number.isFinite(seconds)) return null
  return Math.max(0, Math.min(1, seconds / durationSeconds))
}

function cleanTag(value: string): string {
  return value.replace(/[\r\n]/g, ' ').trim()
}

export function jpegArgs(source: string, dest: string): string[] {
  return ['-y', '-i', source, '-frames:v', '1', dest]
}

export function transcodeArgs(input: {
  source: string
  artwork: string | null
  output: string
  format: AudioFormat
  bitrate: Bitrate
  tags: { title: string; artist: string; album: string }
}): string[] {
  const embedArt = input.format === 'mp3' && Boolean(input.artwork)
  const args = ['-y', '-i', input.source]
  if (embedArt && input.artwork) args.push('-i', input.artwork)
  args.push('-map', '0:a:0')
  if (embedArt) args.push('-map', '1:0', '-c:v', 'mjpeg', '-disposition:v:0', 'attached_pic')
  if (input.format === 'mp3') args.push('-c:a', 'libmp3lame', '-b:a', `${input.bitrate}k`)
  else args.push('-vn', '-c:a', 'pcm_s16le')
  args.push(
    '-id3v2_version',
    '3',
    '-metadata',
    `title=${cleanTag(input.tags.title)}`,
    '-metadata',
    `artist=${cleanTag(input.tags.artist)}`,
    '-metadata',
    `album=${cleanTag(input.tags.album)}`,
    '-progress',
    'pipe:1',
    '-nostats',
    input.output
  )
  return args
}

export async function runFfmpeg(
  args: string[],
  signal?: AbortSignal,
  onFraction?: (fraction: number) => void,
  duration?: number | null
): Promise<void> {
  await runProcess({
    bin: resolveTool('ffmpeg'),
    args,
    signal,
    onLine: (line) => {
      if (!onFraction) return
      const fraction = ffmpegFraction(line, duration ?? null)
      if (fraction !== null) onFraction(fraction)
    }
  })
}
