import fs from 'fs'
import { parseFile } from 'music-metadata'
import { resolveTool } from './binaries'
import { runProcess } from './process'

async function probeDuration(filePath: string): Promise<number | null> {
  try {
    const result = await runProcess({
      bin: resolveTool('ffprobe'),
      args: ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', filePath]
    })
    const json = JSON.parse(result.stdout) as { format?: { duration?: string } }
    const duration = Number(json.format?.duration)
    return Number.isFinite(duration) && duration > 0 ? duration : null
  } catch {
    return null
  }
}

export async function assertAudioReadable(filePath: string): Promise<number | null> {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1024) {
    throw new Error('The audio file is missing or empty.')
  }
  try {
    const metadata = await parseFile(filePath)
    const duration = metadata.format.duration ?? null
    if (!metadata.format.container && !metadata.format.codec && !duration) {
      throw new Error('unread')
    }
    return duration
  } catch (error) {
    if (error instanceof Error && error.message === 'The audio file is missing or empty.') throw error
    const duration = await probeDuration(filePath)
    if (!duration) throw new Error('The audio file could not be read back.')
    return duration
  }
}
