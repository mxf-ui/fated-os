CREATE TABLE IF NOT EXISTS asset_objects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_asset_objects_user_id ON asset_objects(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_objects_user_hash ON asset_objects(user_id, sha256);
