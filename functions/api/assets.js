import { jsonResponse, optionsResponse, requireUser, randomId } from './_lib/auth.js';

const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm']);

function cleanMime(value) {
  const mime = String(value || 'application/octet-stream').toLowerCase().split(';')[0].trim();
  return ALLOWED_MIME.has(mime) ? mime : '';
}

function extensionForMime(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'audio/wav') return 'wav';
  if (mime === 'audio/webm') return 'webm';
  return 'bin';
}

function base64ToBytes(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let out = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(out);
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getAssetBucket(env) {
  const bucket = env && env.ASSETS;
  return bucket && typeof bucket.put === 'function' && typeof bucket.get === 'function' ? bucket : null;
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

async function addColumnIfMissing(db, sql) {
  try { await db.prepare(sql).run(); }
  catch (e) {
    const msg = String(e && e.message || '');
    if (!msg.includes('duplicate column name')) throw e;
  }
}

async function ensureAssetTable(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS asset_objects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, object_key TEXT NOT NULL, storage_type TEXT NOT NULL DEFAULT 'r2', asset_data TEXT, mime_type TEXT NOT NULL, byte_size INTEGER NOT NULL, sha256 TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)").run();
  await addColumnIfMissing(db, "ALTER TABLE asset_objects ADD COLUMN storage_type TEXT NOT NULL DEFAULT 'r2'");
  await addColumnIfMissing(db, 'ALTER TABLE asset_objects ADD COLUMN asset_data TEXT');
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_asset_objects_user_id ON asset_objects(user_id)').run();
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_objects_user_hash ON asset_objects(user_id, sha256)').run();
}

export async function onRequestOptions() { return optionsResponse(); }

export async function onRequestPost(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;
  const bucket = getAssetBucket(context.env);

  let body;
  try { body = await context.request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

  const mime = cleanMime(body.mimeType);
  if (!mime) return jsonResponse({ error: 'Unsupported asset type' }, 400);
  let bytes;
  try { bytes = base64ToBytes(body.base64); }
  catch (e) { return jsonResponse({ error: 'Invalid asset data' }, 400); }
  if (!bytes.byteLength || bytes.byteLength > MAX_ASSET_BYTES) return jsonResponse({ error: 'Asset is empty or too large' }, 400);

  await ensureAssetTable(auth.db);
  const hash = await sha256Hex(bytes);
  const existing = await auth.db.prepare('SELECT id, object_key, storage_type, mime_type, byte_size FROM asset_objects WHERE user_id = ? AND sha256 = ?')
    .bind(auth.user.id, hash)
    .first();
  if (existing) {
    return jsonResponse({ ok: true, id: existing.id, url: '/api/assets?id=' + encodeURIComponent(existing.id), mimeType: existing.mime_type, byteSize: existing.byte_size, storageType: existing.storage_type || 'r2', reused: true });
  }

  const now = Date.now();
  const id = randomId('ast');
  const objectKey = auth.user.id + '/' + id + '.' + extensionForMime(mime);
  const storageType = bucket ? 'r2' : 'd1';
  const assetData = bucket ? null : bytesToBase64(bytes);
  if (bucket) await bucket.put(objectKey, bytes, { httpMetadata: { contentType: mime }, customMetadata: { userId: auth.user.id, assetId: id, sha256: hash } });

  await auth.db.prepare('INSERT INTO asset_objects (id, user_id, object_key, storage_type, asset_data, mime_type, byte_size, sha256, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, auth.user.id, objectKey, storageType, assetData, mime, bytes.byteLength, hash, now, now)
    .run();

  return jsonResponse({ ok: true, id, url: '/api/assets?id=' + encodeURIComponent(id), mimeType: mime, byteSize: bytes.byteLength, storageType, reused: false });
}

export async function onRequestGet(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;
  const bucket = getAssetBucket(context.env);
  await ensureAssetTable(auth.db);

  const url = new URL(context.request.url);
  const id = String(url.searchParams.get('id') || '').trim();
  if (!id) return jsonResponse({ error: 'Missing asset id' }, 400);
  const row = await auth.db.prepare('SELECT object_key, storage_type, asset_data, mime_type FROM asset_objects WHERE user_id = ? AND id = ?')
    .bind(auth.user.id, id)
    .first();
  if (!row) return jsonResponse({ error: 'Asset not found' }, 404);

  if ((row.storage_type || 'r2') === 'd1') {
    if (!row.asset_data) return jsonResponse({ error: 'Asset data missing' }, 404);
    return new Response(base64ToBytes(row.asset_data), {
      headers: {
        'Content-Type': row.mime_type,
        'Cache-Control': 'private, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (!bucket) return jsonResponse({ error: 'Cloud asset bucket is not configured and this file was stored in R2', setupRequired: true, binding: 'ASSETS' }, 503);
  const object = await bucket.get(row.object_key);
  if (!object) return jsonResponse({ error: 'Asset object missing' }, 404);
  return new Response(object.body, {
    headers: {
      'Content-Type': row.mime_type,
      'Cache-Control': 'private, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

