const SESSION_COOKIE = 'fated_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 120000;

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      ...extraHeaders,
    },
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function dbMissingResponse() {
  return jsonResponse({
    error: 'Cloud database is not configured',
    setupRequired: true,
    binding: 'DB',
  }, 503);
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBase64(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToBase64(bytes);
}

export function randomId(prefix = 'usr') {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return prefix + '_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Base64(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return bytesToBase64(new Uint8Array(digest));
}

export async function hashPassword(password, saltBase64) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: base64ToBytes(saltBase64),
    iterations: PASSWORD_ITERATIONS,
    hash: 'SHA-256',
  }, keyMaterial, 256);
  return bytesToBase64(new Uint8Array(bits));
}

export function sessionCookie(token, now = Date.now()) {
  const expires = new Date(now + SESSION_TTL_MS).toUTCString();
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`;
}

export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1));
  }
  return '';
}

export async function createSession(db, userId) {
  const token = randomBase64(32);
  const tokenHash = await sha256Base64(token);
  const now = Date.now();
  await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, userId, now + SESSION_TTL_MS, now)
    .run();
  return { token, tokenHash, expiresAt: now + SESSION_TTL_MS };
}

export async function requireUser(context) {
  const db = context.env && context.env.DB;
  if (!db) return { response: dbMissingResponse() };
  const token = readCookie(context.request, SESSION_COOKIE);
  if (!token) return { response: jsonResponse({ error: 'Not signed in' }, 401) };
  const tokenHash = await sha256Base64(token);
  const now = Date.now();
  const row = await db.prepare(
    'SELECT users.id, users.email, users.encryption_salt, sessions.expires_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ?'
  ).bind(tokenHash).first();
  if (!row || row.expires_at <= now) {
    if (row) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    return { response: jsonResponse({ error: 'Session expired' }, 401, { 'Set-Cookie': clearSessionCookie() }) };
  }
  return { db, tokenHash, user: { id: row.id, email: row.email, encryptionSalt: row.encryption_salt } };
}

export function publicUser(user) {
  return { id: user.id, email: user.email, encryptionSalt: user.encryptionSalt || user.encryption_salt };
}
