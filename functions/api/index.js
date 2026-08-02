// Cloudflare Pages Function: /api
// Health check endpoint 鈥?used by the frontend to detect if the proxy is available

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function onRequestGet() {
  return new Response(JSON.stringify({
    ok: true,
    service: 'fated-os-proxy',
    storage: 'supabase',
    endpoints: ['/api/chat', '/api/models', '/api/image', '/api/search', '/api/transcribe'],
    time: Date.now()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}


