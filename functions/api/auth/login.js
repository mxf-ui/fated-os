import { createSession, dbMissingResponse, hashPassword, isValidEmail, jsonResponse, normalizeEmail, optionsResponse, publicUser, sessionCookie, validatePassword } from '../_lib/auth.js';

export async function onRequestOptions() { return optionsResponse(); }

function validateInviteCode(context, code) {
  const expected = String((context.env && context.env.INVITE_CODE) || '123456').trim();
  return String(code || '').trim() === expected;
}

export async function onRequestPost(context) {
  const db = context.env && context.env.DB;
  if (!db) return dbMissingResponse();
  let body;
  try { body = await context.request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  if (!validateInviteCode(context, body.inviteCode)) return jsonResponse({ error: 'Invalid invite code' }, 403);
  if (!isValidEmail(email) || !validatePassword(password)) return jsonResponse({ error: 'Invalid email or password' }, 400);

  const row = await db.prepare('SELECT id, email, password_salt, password_hash, encryption_salt FROM users WHERE email = ?').bind(email).first();
  if (!row) return jsonResponse({ error: 'Invalid email or password' }, 401);
  const passwordHash = await hashPassword(password, row.password_salt);
  if (passwordHash !== row.password_hash) return jsonResponse({ error: 'Invalid email or password' }, 401);

  const now = Date.now();
  const session = await createSession(db, row.id);
  return jsonResponse({ ok: true, user: publicUser(row) }, 200, {
    'Set-Cookie': sessionCookie(session.token, now),
  });
}
