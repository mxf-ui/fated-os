CREATE TABLE IF NOT EXISTS asset_objects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  storage_type TEXT NOT NULL DEFAULT 'r2',
  asset_data TEXT,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE asset_objects ADD COLUMN storage_type TEXT NOT NULL DEFAULT 'r2';
ALTER TABLE asset_objects ADD COLUMN asset_data TEXT;

CREATE INDEX IF NOT EXISTS idx_asset_objects_user_id ON asset_objects(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_objects_user_hash ON asset_objects(user_id, sha256);
