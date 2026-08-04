function disabledResponse() {
  return new Response(JSON.stringify({
    error: 'Cloudflare D1 auth disabled. Supabase Auth is the only account path.'
  }), {
    status: 410,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
  });
}

export async function onRequestOptions() { return disabledResponse(); }
export async function onRequestGet() { return disabledResponse(); }
export async function onRequestPost() { return disabledResponse(); }
