import { jsonResponse, optionsResponse, requireUser } from './_lib/auth.js';

function cleanString(value, max) {
  const text = String(value || '');
  if (!text || text.length > max) return '';
  return text;
}

export async function onRequestOptions() { return optionsResponse(); }

export async function onRequestGet(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;
  const row = await auth.db.prepare('SELECT cipher_blob, iv, schema_version, client_updated_at, updated_at, meta_json FROM snapshots WHERE user_id = ?')
    .bind(auth.user.id)
    .first();
  return jsonResponse({
    ok: true,
    user: { id: auth.user.id, email: auth.user.email, encryptionSalt: auth.user.encryptionSalt },
    snapshot: row ? {
      ciphertext: row.cipher_blob,
      iv: row.iv,
      schemaVersion: row.schema_version,
      clientUpdatedAt: row.client_updated_at,
      updatedAt: row.updated_at,
      meta: JSON.parse(row.meta_json || '{}'),
    } : null,
  });
}

export async function onRequestPut(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;
  let body;
  try { body = await context.request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

  const ciphertext = cleanString(body.ciphertext, 12 * 1024 * 1024);
  const iv = cleanString(body.iv, 256);
  if (!ciphertext || !iv) return jsonResponse({ error: 'Missing encrypted snapshot' }, 400);

  const schemaVersion = Number.isFinite(Number(body.schemaVersion)) ? Number(body.schemaVersion) : 1;
  const clientUpdatedAt = Number.isFinite(Number(body.clientUpdatedAt)) ? Number(body.clientUpdatedAt) : Date.now();
  const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
  const metaJson = JSON.stringify({
    device: String(meta.device || '').slice(0, 120),
    appVersion: String(meta.appVersion || 'fated-os').slice(0, 60),
    savedAt: clientUpdatedAt,
  });
  const now = Date.now();

  await auth.db.prepare(
    'INSERT INTO snapshots (user_id, cipher_blob, iv, schema_version, client_updated_at, updated_at, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET cipher_blob = excluded.cipher_blob, iv = excluded.iv, schema_version = excluded.schema_version, client_updated_at = excluded.client_updated_at, updated_at = excluded.updated_at, meta_json = excluded.meta_json'
  ).bind(auth.user.id, ciphertext, iv, schemaVersion, clientUpdatedAt, now, metaJson).run();

  return jsonResponse({ ok: true, updatedAt: now, clientUpdatedAt });
}
