import { optionsResponse, publicUser, requireUser } from '../_lib/auth.js';

export async function onRequestOptions() { return optionsResponse(); }

export async function onRequestGet(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;
  return new Response(JSON.stringify({ ok: true, user: publicUser(auth.user) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
