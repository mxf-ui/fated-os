import { jsonResponse, optionsResponse, requireUser } from './_lib/auth.js';

const MAX_SNAPSHOT_CHARS = 48 * 1024 * 1024;
const CHUNK_CHARS = 240 * 1024;

function cleanString(value, max) {
  const text = String(value || '');
  if (!text || text.length > max) return '';
  return text;
}

function parseJson(value) {
  try { return JSON.parse(value || '{}'); }
  catch (e) { return {}; }
}

async function ensureSnapshotChunksTable(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS snapshot_chunks (user_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, chunk_text TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (user_id, chunk_index), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_snapshot_chunks_user_id ON snapshot_chunks(user_id)').run();
}

async function loadSnapshotCiphertext(db, userId, row) {
  if (!row) return '';
  await ensureSnapshotChunksTable(db);
  const chunkRows = await db.prepare('SELECT chunk_text FROM snapshot_chunks WHERE user_id = ? ORDER BY chunk_index ASC')
    .bind(userId)
    .all();
  const chunks = chunkRows && Array.isArray(chunkRows.results) ? chunkRows.results : [];
  if (chunks.length) return chunks.map(item => item.chunk_text || '').join('');
  return row.cipher_blob || '';
}

async function saveSnapshotChunks(db, userId, ciphertext, now) {
  await ensureSnapshotChunksTable(db);
  await db.prepare('DELETE FROM snapshot_chunks WHERE user_id = ?').bind(userId).run();
  const total = Math.ceil(ciphertext.length / CHUNK_CHARS) || 1;
  const statements = [];
  for (let i = 0; i < total; i++) {
    statements.push(
      db.prepare('INSERT INTO snapshot_chunks (user_id, chunk_index, chunk_text, created_at) VALUES (?, ?, ?, ?)')
        .bind(userId, i, ciphertext.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS), now)
    );
  }
  if (statements.length) await db.batch(statements);
  return total;
}

export async function onRequestOptions() { return optionsResponse(); }

export async function onRequestGet(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;
  const row = await auth.db.prepare('SELECT cipher_blob, iv, schema_version, client_updated_at, updated_at, meta_json FROM snapshots WHERE user_id = ?')
    .bind(auth.user.id)
    .first();
  const ciphertext = await loadSnapshotCiphertext(auth.db, auth.user.id, row);
  return jsonResponse({
    ok: true,
    user: { id: auth.user.id, email: auth.user.email, encryptionSalt: auth.user.encryptionSalt },
    snapshot: row && ciphertext ? {
      ciphertext,
      iv: row.iv,
      schemaVersion: row.schema_version,
      clientUpdatedAt: row.client_updated_at,
      updatedAt: row.updated_at,
      meta: parseJson(row.meta_json),
    } : null,
  });
}

export async function onRequestPut(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;
  let body;
  try { body = await context.request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

  const ciphertext = cleanString(body.ciphertext, MAX_SNAPSHOT_CHARS);
  const iv = cleanString(body.iv, 256);
  if (!ciphertext || !iv) return jsonResponse({ error: 'Missing encrypted snapshot' }, 400);

  const schemaVersion = Number.isFinite(Number(body.schemaVersion)) ? Number(body.schemaVersion) : 1;
  const clientUpdatedAt = Number.isFinite(Number(body.clientUpdatedAt)) ? Number(body.clientUpdatedAt) : Date.now();
  const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
  const now = Date.now();
  const chunkCount = await saveSnapshotChunks(auth.db, auth.user.id, ciphertext, now);
  const metaJson = JSON.stringify({
    device: String(meta.device || '').slice(0, 120),
    appVersion: String(meta.appVersion || 'fated-os').slice(0, 60),
    savedAt: clientUpdatedAt,
    chunkCount,
    size: ciphertext.length,
  });

  await auth.db.prepare(
    'INSERT INTO snapshots (user_id, cipher_blob, iv, schema_version, client_updated_at, updated_at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET cipher_blob = excluded.cipher_blob, iv = excluded.iv, schema_version = excluded.schema_version, client_updated_at = excluded.client_updated_at, updated_at = excluded.updated_at, meta_json = excluded.meta_json'
  ).bind(auth.user.id, '', iv, schemaVersion, clientUpdatedAt, now, metaJson).run();

  return jsonResponse({ ok: true, updatedAt: now, clientUpdatedAt, chunkCount, size: ciphertext.length });
}

