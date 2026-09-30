import { useEffect, useState } from 'react'
import type { SchemaStatus } from '@shared/types'
import { unwrap } from './api'
import { HistoryView } from './history/HistoryView'
import { LibraryView } from './library/LibraryView'
import { PlaylistView } from './playlists/PlaylistView'
import { QueueView } from './queue/QueueView'
import { SettingsView } from './settings/SettingsView'
import { SchemaBanner } from './shell/SchemaBanner'
import { Sidebar, type View } from './shell/Sidebar'

export function App() {
  const [view, setView] = useState<View>('queue')
  const [schema, setSchema] = useState<SchemaStatus | null>(null)
  const [draftUrl, setDraftUrl] = useState('')
  const [checking, setChecking] = useState(false)

  async function refreshSchema() {
    setChecking(true)
    try {
      setSchema(await unwrap(window.music.recheckSchema()))
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (!window.music) return
    void unwrap(window.music.schema()).then(setSchema)
  }, [])

  if (!window.music) {
    return <p className="empty">Open this screen from the Music Library desktop window.</p>
  }

  const ready = Boolean(schema?.ready)

  return (
    <div className="app">
      <Sidebar view={view} onChange={setView} />
      <main>
        {schema && !schema.ready ? <SchemaBanner schema={schema} onRecheck={() => void refreshSchema()} busy={checking} /> : null}
        {view === 'queue' ? <QueueView draftUrl={draftUrl} onDraftUrl={setDraftUrl} disabled={!ready} /> : null}
        {view === 'library' ? <LibraryView disabled={!ready} /> : null}
        {view === 'playlists' ? <PlaylistView disabled={!ready} /> : null}
        {view === 'history' ? (
          <HistoryView
            disabled={!ready}
            onUse={(value) => {
              setDraftUrl(value)
              setView('queue')
            }}
          />
        ) : null}
        {view === 'settings' ? <SettingsView /> : null}
      </main>
    </div>
  )
}
