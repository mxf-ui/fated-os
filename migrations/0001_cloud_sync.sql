CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  encryption_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS snapshots (
  user_id TEXT PRIMARY KEY,
  cipher_blob TEXT NOT NULL,
  iv TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  client_updated_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
