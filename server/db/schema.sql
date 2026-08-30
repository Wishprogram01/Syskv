-- Syskv Notes Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT DEFAULT '',
  body TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  notebook TEXT DEFAULT '',
  color TEXT DEFAULT '',
  due BIGINT,
  pinned BOOLEAN DEFAULT false,
  trashed BOOLEAN DEFAULT false,
  created BIGINT NOT NULL,
  updated BIGINT NOT NULL
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Notified reminders table
CREATE TABLE IF NOT EXISTS notified (
  note_id TEXT PRIMARY KEY,
  due BIGINT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_trashed ON notes(trashed);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned) WHERE trashed = false;
CREATE INDEX IF NOT EXISTS idx_notes_notebook ON notes(notebook) WHERE notebook != '' AND trashed = false;
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
