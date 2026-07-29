import { clearSessionCookie, jsonResponse, optionsResponse, readCookie, sha256Base64 } from '../_lib/auth.js';

export async function onRequestOptions() { return optionsResponse(); }

export async function onRequestPost(context) {
  const db = context.env && context.env.DB;
  const token = readCookie(context.request, 'fated_session');
  if (db && token) {
    const tokenHash = await sha256Base64(token);
    await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}
