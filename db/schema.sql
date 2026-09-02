-- The reader database. Run once against D1 to create these tables.
--
-- Deliberately small. A Trial record is a psychological reading, so the only
-- personal details kept are the ones Google hands over at sign in, and the
-- answers themselves. Nothing else about a reader is stored.

-- A person, identified by their Google account.
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,          -- our own id, never Google's
  google_sub  TEXT UNIQUE NOT NULL,      -- Google's stable id for this person
  email       TEXT,
  name        TEXT,
  created_at  INTEGER NOT NULL
);

-- A signed in session.
-- The token is stored hashed. If this table ever leaked, the rows in it
-- would not let anyone sign in as a reader.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

-- A saved Trial record. The answers are kept so the record can be rebuilt
-- exactly, rather than storing the finished prose.
CREATE TABLE IF NOT EXISTS records (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  archetype   TEXT NOT NULL,
  tier        TEXT NOT NULL,
  mask        INTEGER NOT NULL,
  clarity     INTEGER,
  answers     TEXT NOT NULL,             -- JSON: mirror, trial, tradeoff, crucible
  taken_at    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS records_user ON records(user_id, taken_at DESC);
