-- Music Library schema
-- Apply this file yourself to the database path shown in the app.
-- The app will not run this script or change the schema later.
--
-- Example, if sqlite3 is on your PATH:
--   sqlite3 "C:\path\to\library.sqlite" ".read sql/001_create.sql"
--
-- You can also open the database in DB Browser for SQLite and run this file.

PRAGMA foreign_keys = ON;

CREATE TABLE tracks (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('youtube', 'soundcloud')),
  source_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'Unknown artist',
  album TEXT NOT NULL DEFAULT 'Unknown album',
  duration REAL,
  format TEXT NOT NULL CHECK (format IN ('mp3', 'wav')),
  bitrate INTEGER,
  file_path TEXT NOT NULL,
  artwork_path TEXT,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX tracks_source_identity ON tracks (source, source_id);
CREATE INDEX tracks_source_url ON tracks (source_url);
CREATE INDEX tracks_title_artist ON tracks (title, artist);

CREATE TABLE playlists (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE playlist_tracks (
  playlist_id INTEGER NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);

CREATE TABLE jobs (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  source TEXT,
  status TEXT NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  error TEXT,
  title TEXT,
  artist TEXT,
  album TEXT,
  duration REAL,
  format TEXT NOT NULL,
  bitrate INTEGER,
  track_id INTEGER REFERENCES tracks (id) ON DELETE SET NULL,
  duplicate_track_id INTEGER REFERENCES tracks (id) ON DELETE SET NULL,
  playlist_id INTEGER REFERENCES playlists (id) ON DELETE SET NULL,
  replace_existing INTEGER NOT NULL DEFAULT 0,
  tag_hints TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX jobs_status ON jobs (status, id);

CREATE TABLE history (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('url', 'spotify')),
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX history_created ON history (id DESC);
