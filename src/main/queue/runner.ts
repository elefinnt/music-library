import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { Bitrate, JobRecord } from '@shared/types'
import { claimNextJob, getJob, updateJob } from '../library/jobs'
import { addToPlaylist } from '../library/playlists'
import { findDuplicate, getTrack, insertTrack, updateTrack, type TrackWrite } from '../library/tracks'
import { jpegArgs, runFfmpeg, transcodeArgs } from '../media/ffmpeg'
import { artworkCachePath, outputPath, wavArtworkPath } from '../media/paths'
import { assertAudioReadable } from '../media/tagger'
import { getSettings } from '../settings'
import { downloadAudio, probeMedia } from '../sources/ytdlp'
import { emitJob } from './events'

const active = new Map<number, AbortController>()
let pumping = false

function jobTemp(id: number): string {
  return path.join(app.getPath('temp'), 'music-library', String(id))
}

function asBitrate(value: number | null): Bitrate {
  if (value === 128 || value === 256 || value === 320) return value
  return 320
}

async function saveArtwork(url: string, tempDir: string, signal: AbortSignal): Promise<string | null> {
  try {
    const response = await fetch(url, { signal })
    if (!response.ok) return null
    const raw = path.join(tempDir, 'cover-source')
    fs.writeFileSync(raw, Buffer.from(await response.arrayBuffer()))
    const jpeg = path.join(tempDir, 'cover.jpg')
    await runFfmpeg(jpegArgs(raw, jpeg), signal)
    return jpeg
  } catch (error) {
    if (signal.aborted) throw error
    return null
  }
}

async function runJob(job: JobRecord, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw new Error('Cancelled.')
  if (!job.source) throw new Error('This download has no source.')
  const info = await probeMedia(job.url, job.source, signal)
  let current = updateJob(job.id, {
    url: info.sourceUrl,
    source: info.source,
    title: job.tagHints?.title || info.title,
    artist: job.tagHints?.artist || info.artist,
    album: job.tagHints?.album || info.album,
    duration: info.duration
  })
  emitJob(current)
  if (!current.replaceExisting) {
    const duplicate = findDuplicate({
      sourceUrl: info.sourceUrl,
      source: info.source,
      sourceId: info.sourceId,
      title: current.title,
      artist: current.artist,
      duration: info.duration
    })
    if (duplicate) {
      emitJob(updateJob(job.id, { status: 'duplicate', duplicateTrackId: duplicate.id, progress: 0 }))
      return
    }
  }
  const temp = jobTemp(job.id)
  fs.mkdirSync(temp, { recursive: true })
  let lastReport = 0
  const report = (progress: number) => {
    const time = Date.now()
    if (time - lastReport < 300 && progress < 99) return
    lastReport = time
    emitJob(updateJob(job.id, { progress: Math.round(progress) }))
  }
  const audio = await downloadAudio(job.url, temp, (fraction) => report(5 + fraction * 70), signal)
  const title = current.tagHints?.title || info.title
  const artist = current.tagHints?.artist || info.artist
  const album = current.tagHints?.album || info.album
  const jpeg = current.tagHints?.artworkUrl || info.thumbnail
    ? await saveArtwork(current.tagHints?.artworkUrl || info.thumbnail || '', temp, signal)
    : null
  const settings = getSettings()
  const cache = jpeg ? artworkCachePath(settings.musicRoot, info.source, info.sourceId) : null
  if (jpeg && cache) {
    fs.mkdirSync(path.dirname(cache), { recursive: true })
    fs.copyFileSync(jpeg, cache)
  }
  const existing = current.replaceExisting && current.duplicateTrackId ? getTrack(current.duplicateTrackId) : null
  const bitrate = asBitrate(current.bitrate)
  const dest = outputPath(
    settings.musicRoot,
    settings.filenameTemplate,
    { artist, album, title, ext: current.format, source: info.source },
    existing?.filePath
  )
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  await runFfmpeg(
    transcodeArgs({
      source: audio,
      artwork: jpeg,
      output: dest,
      format: current.format,
      bitrate,
      tags: { title, artist, album }
    }),
    signal,
    (fraction) => report(80 + fraction * 18),
    info.duration
  )
  if (current.format === 'wav' && jpeg) fs.copyFileSync(jpeg, wavArtworkPath(dest))
  const duration = (await assertAudioReadable(dest)) ?? info.duration
  const write: TrackWrite = {
    source: info.source,
    sourceId: info.sourceId,
    sourceUrl: info.sourceUrl,
    title,
    artist,
    album,
    duration,
    format: current.format,
    bitrate: current.format === 'wav' ? null : bitrate,
    filePath: dest,
    artworkPath: cache
  }
  if (existing && existing.filePath !== dest && fs.existsSync(existing.filePath)) fs.unlinkSync(existing.filePath)
  const track = existing ? updateTrack(existing.id, write) : insertTrack(write)
  if (current.playlistId) addToPlaylist(current.playlistId, track.id)
  emitJob(updateJob(job.id, { status: 'done', progress: 100, error: null, trackId: track.id }))
}

async function finish(job: JobRecord, controller: AbortController): Promise<void> {
  try {
    await runJob(job, controller.signal)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed.'
    const cancelled = controller.signal.aborted || message === 'Cancelled.'
    const latest = getJob(job.id)
    if (latest && latest.status !== 'done' && latest.status !== 'duplicate') {
      emitJob(updateJob(job.id, { status: cancelled ? 'cancelled' : 'failed', error: cancelled ? null : message }))
    }
  } finally {
    active.delete(job.id)
    fs.rmSync(jobTemp(job.id), { recursive: true, force: true })
    pump()
  }
}

export function pump(): void {
  if (pumping) return
  pumping = true
  try {
    const limit = getSettings().parallelDownloads
    while (active.size < limit) {
      const job = claimNextJob()
      if (!job) break
      const controller = new AbortController()
      active.set(job.id, controller)
      const current = getJob(job.id)
      if (current) emitJob(current)
      void finish(job, controller)
    }
  } finally {
    pumping = false
  }
}

export function cancelJob(id: number): JobRecord {
  const controller = active.get(id)
  const job = getJob(id)
  if (!job) throw new Error('That download is gone.')
  if (controller) {
    controller.abort()
    return job
  }
  if (job.status === 'queued' || job.status === 'duplicate') {
    const updated = updateJob(id, { status: 'cancelled', error: null })
    emitJob(updated)
    return updated
  }
  return job
}

export function retryJob(id: number): JobRecord {
  const job = getJob(id)
  if (!job || (job.status !== 'failed' && job.status !== 'cancelled')) {
    throw new Error('Only failed or cancelled downloads can be retried.')
  }
  const updated = updateJob(id, { status: 'queued', progress: 0, error: null })
  emitJob(updated)
  pump()
  return updated
}

export function resolveDuplicate(id: number, choice: 'skip' | 'replace'): JobRecord {
  const job = getJob(id)
  if (!job || job.status !== 'duplicate') throw new Error('That item is not waiting on a duplicate choice.')
  if (choice === 'skip') {
    const updated = updateJob(id, { status: 'skipped', error: null })
    emitJob(updated)
    return updated
  }
  const updated = updateJob(id, { status: 'queued', progress: 0, error: null, replaceExisting: true })
  emitJob(updated)
  pump()
  return updated
}
