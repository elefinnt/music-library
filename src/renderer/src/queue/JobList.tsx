import type { JobRecord } from '@shared/types'
import { unwrap } from '../api'
import { formatDuration, statusLabel } from '../format'

export function JobList(props: { jobs: JobRecord[]; onChange: () => void }) {
  async function run(action: () => Promise<unknown>) {
    try {
      await action()
      props.onChange()
    } catch (error) {
      console.error(error)
    }
  }

  if (!props.jobs.length) {
    return <p className="empty">Nothing queued yet. Paste a link to start.</p>
  }

  return (
    <ul className="list">
      {props.jobs.map((job) => (
        <li key={job.id} className="job">
          <div>
            <strong>{job.title || job.url}</strong>
            <p>
              {job.artist ? `${job.artist} · ` : ''}
              {statusLabel(job.status)}
              {job.duration ? ` · ${formatDuration(job.duration)}` : ''}
              {` · ${job.format.toUpperCase()}`}
            </p>
            {job.status === 'running' || job.status === 'queued' ? (
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, job.progress)}%` }} />
              </div>
            ) : null}
            {job.error ? <p className="error">{job.error}</p> : null}
          </div>
          <div className="actions">
            {job.status === 'queued' || job.status === 'running' ? (
              <button type="button" onClick={() => void run(() => unwrap(window.music.cancel(job.id)))}>
                Cancel
              </button>
            ) : null}
            {job.status === 'failed' || job.status === 'cancelled' ? (
              <button type="button" onClick={() => void run(() => unwrap(window.music.retry(job.id)))}>
                Retry
              </button>
            ) : null}
            {job.status === 'duplicate' ? (
              <>
                <button type="button" onClick={() => void run(() => unwrap(window.music.resolveDuplicate(job.id, 'skip')))}>
                  Skip
                </button>
                <button type="button" onClick={() => void run(() => unwrap(window.music.resolveDuplicate(job.id, 'replace')))}>
                  Replace
                </button>
              </>
            ) : null}
            {job.trackId ? (
              <button type="button" onClick={() => void run(() => unwrap(window.music.revealTrack(job.trackId!)))}>
                Show file
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
