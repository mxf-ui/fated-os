import { createSession, dbMissingResponse, hashPassword, isValidEmail, jsonResponse, normalizeEmail, optionsResponse, publicUser, randomBase64, randomId, sessionCookie, validatePassword } from '../_lib/auth.js';

export async function onRequestOptions() { return optionsResponse(); }

export async function onRequestPost(context) {
  const db = context.env && context.env.DB;
  if (!db) return dbMissingResponse();
  let body;
  try { body = await context.request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!isValidEmail(email)) return jsonResponse({ error: 'Invalid email' }, 400);
  if (!validatePassword(password)) return jsonResponse({ error: 'Password must be 8-128 characters' }, 400);

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return jsonResponse({ error: 'Email already registered' }, 409);

  const now = Date.now();
  const passwordSalt = randomBase64(16);
  const passwordHash = await hashPassword(password, passwordSalt);
  const encryptionSalt = randomBase64(16);
  const userId = randomId('usr');

  await db.prepare('INSERT INTO users (id, email, password_salt, password_hash, encryption_salt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(userId, email, passwordSalt, passwordHash, encryptionSalt, now, now)
    .run();

  const session = await createSession(db, userId);
  return jsonResponse({ ok: true, user: publicUser({ id: userId, email, encryptionSalt }) }, 201, {
    'Set-Cookie': sessionCookie(session.token, now),
  });
}
