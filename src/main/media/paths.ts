import fs from 'fs'
import path from 'path'

const INVALID = /[<>:"/\\|?*\u0000-\u001f]/g

export function safeSegment(value: string, fallback: string): string {
  const cleaned = value.replace(INVALID, ' ').replace(/\s+/g, ' ').replace(/[. ]+$/g, '').trim().slice(0, 80)
  return cleaned || fallback
}

function uniquePath(file: string): string {
  if (!fs.existsSync(file)) return file
  const dir = path.dirname(file)
  const ext = path.extname(file)
  const base = path.basename(file, ext)
  for (let index = 2; index < 100; index += 1) {
    const candidate = path.join(dir, `${base} (${index})${ext}`)
    if (!fs.existsSync(candidate)) return candidate
  }
  throw new Error('Too many files already use that name.')
}

export function outputPath(
  root: string,
  template: string,
  vars: { artist: string; album: string; title: string; ext: string; source: string },
  existingPath?: string | null
): string {
  if (existingPath) return existingPath
  let pattern = template.trim() || '{artist}/{album}/{title}.{ext}'
  if (!pattern.includes('{title}')) pattern += '-{title}'
  if (!pattern.includes('{ext}')) pattern += '.{ext}'
  const rendered = pattern.replace(/\{(artist|album|title|ext|source)\}/g, (_, key: string) => {
    if (key === 'ext') return vars.ext
    if (key === 'source') return safeSegment(vars.source, 'audio')
    const fallback = key === 'title' ? 'Untitled' : key === 'artist' ? 'Unknown artist' : 'Unknown album'
    return safeSegment(vars[key as 'artist' | 'album' | 'title'], fallback)
  })
  const absolute = path.resolve(root, rendered)
  const relative = path.relative(path.resolve(root), absolute)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('The file name template tried to leave the music folder.')
  }
  return uniquePath(absolute)
}

export function artworkCachePath(root: string, source: string, sourceId: string): string {
  return path.join(root, 'artwork', `${safeSegment(source, 'audio')}-${safeSegment(sourceId, 'track')}.jpg`)
}

export function wavArtworkPath(audioPath: string): string {
  const base = path.basename(audioPath, path.extname(audioPath))
  return path.join(path.dirname(audioPath), `${base}.jpg`)
}
