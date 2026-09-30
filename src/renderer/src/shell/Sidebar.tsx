export type View = 'queue' | 'library' | 'playlists' | 'history' | 'settings'

const ITEMS: Array<{ id: View; label: string }> = [
  { id: 'queue', label: 'Queue' },
  { id: 'library', label: 'Library' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' }
]

export function Sidebar(props: { view: View; onChange: (view: View) => void }) {
  return (
    <aside className="rail">
      <p className="mark">Music Library</p>
      <p className="mark-note">Local shelves for the tracks you save.</p>
      <nav>
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={props.view === item.id ? 'nav active' : 'nav'}
            onClick={() => props.onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
