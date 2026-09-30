import type { SchemaStatus } from '@shared/types'

export function SchemaBanner(props: { schema: SchemaStatus; onRecheck: () => void; busy: boolean }) {
  return (
    <section className="banner">
      <h2>Apply the library schema</h2>
      <p>{props.schema.message}</p>
      <p>
        Database file
        <code>{props.schema.databaseFile}</code>
      </p>
      <p>
        SQL file
        <code>{props.schema.sqlFile}</code>
      </p>
      <p className="hint">Open the database in DB Browser for SQLite, or run the file with the sqlite3 command. Then check again.</p>
      <button type="button" onClick={props.onRecheck} disabled={props.busy}>
        {props.busy ? 'Checking…' : 'Check again'}
      </button>
    </section>
  )
}
