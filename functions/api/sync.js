function disabledResponse() {
  return new Response(JSON.stringify({
    error: 'D1 sync disabled. Supabase is the only cloud save path.'
  }), {
    status: 410,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS'
    }
  });
}

export async function onRequestOptions() { return disabledResponse(); }
export async function onRequestGet() { return disabledResponse(); }
export async function onRequestPut() { return disabledResponse(); }
export async function onRequestPost() { return disabledResponse(); }
