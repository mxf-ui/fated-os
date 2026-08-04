CREATE TABLE IF NOT EXISTS snapshot_chunks (
  user_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, chunk_index),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshot_chunks_user_id ON snapshot_chunks(user_id);
