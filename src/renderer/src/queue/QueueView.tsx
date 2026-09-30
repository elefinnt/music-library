import { useEffect, useState } from 'react'
import type { Bitrate, EnqueueResult, JobRecord, Settings, SpotifyLookup } from '@shared/types'
import { unwrap } from '../api'
import { JobList } from './JobList'
import { MatchPanel } from './MatchPanel'
import { PasteBox } from './PasteBox'

export function QueueView(props: {
  draftUrl: string
  onDraftUrl: (url: string) => void
  disabled: boolean
}) {
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [spotify, setSpotify] = useState<SpotifyLookup | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [format, setFormat] = useState<'mp3' | 'wav'>('mp3')
  const [bitrate, setBitrate] = useState<Bitrate>(320)

  async function refresh() {
    setJobs(await unwrap(window.music.listJobs()))
  }

  useEffect(() => {
    void unwrap(window.music.getSettings()).then((next) => {
      setSettings(next)
      setFormat(next.format)
      setBitrate(next.bitrate)
    })
    if (!props.disabled) void refresh().catch(() => setJobs([]))
    return window.music.onJobProgress((job) => {
      setJobs((current) => {
        const index = current.findIndex((item) => item.id === job.id)
        if (index < 0) return [job, ...current]
        const next = current.slice()
        next[index] = job
        return next
      })
    })
  }, [props.disabled])

  function onResult(result: EnqueueResult) {
    setNotice(result.notice)
    setSpotify(result.spotify)
    if (result.jobs.length) {
      setJobs((current) => {
        const ids = new Set(result.jobs.map((job) => job.id))
        return [...result.jobs, ...current.filter((job) => !ids.has(job.id))]
      })
    }
  }

  return (
    <div className="stack">
      <header>
        <h1>Queue</h1>
        <p>Paste a link, pick MP3 or WAV, and save it into your music folder.</p>
      </header>
      <PasteBox
        draftUrl={props.draftUrl}
        onDraftUrl={props.onDraftUrl}
        settings={settings}
        disabled={props.disabled}
        onOptions={(nextFormat, nextBitrate) => {
          setFormat(nextFormat)
          setBitrate(nextBitrate)
        }}
        onResult={onResult}
      />
      {notice ? <p className="notice">{notice}</p> : null}
      {spotify ? (
        <MatchPanel
          lookup={spotify}
          format={format}
          bitrate={bitrate}
          onQueued={() => void refresh()}
          onClose={() => setSpotify(null)}
        />
      ) : null}
      <JobList jobs={jobs} onChange={() => void refresh()} />
    </div>
  )
}
