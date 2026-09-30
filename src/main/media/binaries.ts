import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { projectRoot } from '../library/db'
import { getSettings } from '../settings'

export function bundledBinDir(): string {
  if (app.isPackaged) return path.join(process.resourcesPath, 'bin')
  return path.join(projectRoot(), 'resources', 'bin')
}

export function resolveTool(kind: 'yt-dlp' | 'ffmpeg' | 'ffprobe'): string {
  const settings = getSettings()
  const custom = kind === 'yt-dlp' ? settings.ytdlpPath : kind === 'ffmpeg' ? settings.ffmpegPath : settings.ffprobePath
  if (custom && fs.existsSync(custom)) return custom
  const file = process.platform === 'win32' ? `${kind}.exe` : kind
  const bundled = path.join(bundledBinDir(), file)
  if (fs.existsSync(bundled)) return bundled
  return file
}

export function cookieArgs(): string[] {
  const cookies = getSettings().cookiesPath.trim()
  if (!cookies) return []
  if (!fs.existsSync(cookies)) throw new Error('The cookies file in Settings does not exist.')
  return ['--cookies', cookies]
}
