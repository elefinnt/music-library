import { useEffect, useState } from 'react'
import type { HistoryRecord } from '@shared/types'
import { unwrap } from '../api'

export function HistoryView(props: { disabled: boolean; onUse: (value: string) => void }) {
  const [items, setItems] = useState<HistoryRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (props.disabled) return
    void unwrap(window.music.history())
      .then(setItems)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'History could not be read.'))
  }, [props.disabled])

  return (
    <div className="stack">
      <header>
        <h1>History</h1>
        <p>Recent links and Spotify searches, newest first.</p>
      </header>
      {error ? <p className="error">{error}</p> : null}
      {!items.length ? <p className="empty">No history yet.</p> : null}
      <ul className="list">
        {items.map((item) => (
          <li key={item.id} className="track">
            <div>
              <strong>{item.kind === 'spotify' ? 'Spotify metadata' : 'Link'}</strong>
              <p>{item.value}</p>
            </div>
            <button type="button" onClick={() => props.onUse(item.value)}>Use</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
