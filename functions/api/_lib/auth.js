export function disabledCloudflareD1AuthResponse() {
  return new Response(JSON.stringify({
    error: 'Cloudflare D1 auth helpers disabled. Supabase Auth is the only account path.'
  }), {
    status: 410,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
