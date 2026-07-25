// Cloudflare Pages Function: /api/transcribe
// Proxies voice transcription requests to OpenAI Whisper API

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function onRequestPost(context) {
  const { request } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { audio, key, endpoint } = body;
  if (!key) return jsonResponse({ error: 'Missing API key' }, 400);
  if (!audio) return jsonResponse({ error: 'Missing audio data' }, 400);

  try {
    const base64Match = audio.match(/^data:audio\/\w+;base64,(.+)$/);
    if (!base64Match) return jsonResponse({ error: 'Invalid audio format' }, 400);

    const audioBytes = atob(base64Match[1]);
    const audioArray = new Uint8Array(audioBytes.length);
    for (let i = 0; i < audioBytes.length; i++) {
      audioArray[i] = audioBytes.charCodeAt(i);
    }

    const audioBlob = new Blob([audioArray], { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const transcribeUrl = endpoint || 'https://api.openai.com/v1/audio/transcriptions';
    const resp = await fetch(transcribeUrl, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key },
      body: formData
    });

    const data = await resp.json();
    return jsonResponse({ text: data.text || '' });

  } catch (err) {
    return jsonResponse({ error: 'Transcription failed: ' + (err.message || 'Unknown') }, 502);
  }
}

export async function onRequestGet() {
  return jsonResponse({ ok: true, service: 'transcribe', time: Date.now() });
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
