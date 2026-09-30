import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { Bitrate, Settings } from '@shared/types'

const DEFAULT_TEMPLATE = '{artist}/{album}/{title}.{ext}'

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function defaultSettings(): Settings {
  return {
    musicRoot: path.join(app.getPath('music'), 'Music Library'),
    format: 'mp3',
    bitrate: 320,
    parallelDownloads: 2,
    filenameTemplate: DEFAULT_TEMPLATE,
    cookiesPath: '',
    ytdlpPath: '',
    ffmpegPath: '',
    ffprobePath: ''
  }
}

function asBitrate(value: unknown): Bitrate {
  if (value === 128 || value === 256 || value === 320) return value
  return 320
}

export function normaliseSettings(input: Partial<Settings>): Settings {
  const defaults = defaultSettings()
  const parallel = Number(input.parallelDownloads)
  return {
    musicRoot: (input.musicRoot || defaults.musicRoot).trim() || defaults.musicRoot,
    format: input.format === 'wav' ? 'wav' : 'mp3',
    bitrate: asBitrate(input.bitrate),
    parallelDownloads: parallel >= 1 && parallel <= 4 ? Math.round(parallel) : 2,
    filenameTemplate: (input.filenameTemplate || DEFAULT_TEMPLATE).trim().slice(0, 180) || DEFAULT_TEMPLATE,
    cookiesPath: (input.cookiesPath || '').trim(),
    ytdlpPath: (input.ytdlpPath || '').trim(),
    ffmpegPath: (input.ffmpegPath || '').trim(),
    ffprobePath: (input.ffprobePath || '').trim()
  }
}

export function getSettings(): Settings {
  const file = settingsFile()
  if (!fs.existsSync(file)) return defaultSettings()
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Settings>
    return normaliseSettings(parsed)
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(input: Settings): Settings {
  const next = normaliseSettings(input)
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true })
  fs.writeFileSync(settingsFile(), JSON.stringify(next, null, 2))
  return next
}
