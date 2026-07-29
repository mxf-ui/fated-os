// Cloudflare Pages Function: /api/models
// Fetches model lists through same-origin proxy so browser CORS does not block API setup.
// Supports Gemini model listing through generativelanguage.googleapis.com.
function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function cleanEndpoint(endpoint) {
  let ep = String(endpoint || '').trim();
  if (!ep) return '';
  const m = ep.match(/^(https?:\/\/)(.*)/);
  if (m) ep = m[1] + m[2].replace(/^(https?:\/\/)+/, '');
  if (!/^https?:\/\//i.test(ep)) ep = 'https://' + ep;
  return ep.replace(/\/+$/, '');
}

function modelListUrl(endpoint, apiFormat) {
  const fmt = apiFormat || 'openai';
  let ep = cleanEndpoint(endpoint);
  if (!ep) return '';
  if (fmt === 'gemini' || /generativelanguage\.googleapis\.com/i.test(ep)) {
    ep = ep.replace(/\/models\/[^/]+(?::generateContent)?$/i, '');
    return ep.replace(/\/+$/, '') + '/models';
  }
  if (fmt === 'claude' || /anthropic\.com/i.test(ep)) {
    return ep.replace(/\/v1\/messages$/i, '/v1/models').replace(/\/messages$/i, '/v1/models').replace(/\/v1$/i, '/v1/models');
  }
  // OpenAI-compatible: OpenAI, DeepSeek, and most relay stations.
  return ep
    .replace(/\/v1\/chat\/completions$/i, '/v1/models')
    .replace(/\/chat\/completions$/i, '/v1/models')
    .replace(/\/v1\/chat$/i, '/v1/models')
    .replace(/\/v1$/i, '/v1/models');
}

function parseModels(data, apiFormat) {
  const fmt = apiFormat || 'openai';
  let rows = [];
  if (fmt === 'gemini' && Array.isArray(data && data.models)) rows = data.models.map(item => String(item.name || '').split('/').pop()).filter(Boolean);
  else if (Array.isArray(data && data.data)) rows = data.data.map(item => item && (item.id || item.name)).filter(Boolean);
  else if (Array.isArray(data && data.models)) rows = data.models.map(item => item && (item.id || item.name || item.model)).filter(Boolean);
  return Array.from(new Set(rows)).sort();
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

  const { endpoint, key, apiFormat } = body;
  if (!endpoint) return jsonResponse({ error: 'Missing endpoint' }, 400);
  if (!key) return jsonResponse({ error: 'Missing API key' }, 400);

  const fmt = apiFormat || 'openai';
  const url = modelListUrl(endpoint, fmt);
  const headers = {};
  if (fmt === 'gemini' || /generativelanguage\.googleapis\.com/i.test(url)) {
    // Gemini accepts the key as query parameter for model listing.
  } else if (fmt === 'claude' || /anthropic\.com/i.test(url)) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
  } else {
    headers.Authorization = 'Bearer ' + key;
  }

  const finalUrl = (fmt === 'gemini' || /generativelanguage\.googleapis\.com/i.test(url))
    ? url + (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(key)
    : url;

  try {
    const resp = await fetch(finalUrl, { method: 'GET', headers });
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { return jsonResponse({ error: 'Model API returned non-JSON HTTP ' + resp.status, detail: text.substring(0, 240), url }, 502); }
    if (!resp.ok) {
      const msg = data && data.error ? (data.error.message || JSON.stringify(data.error)) : ('HTTP ' + resp.status);
      return jsonResponse({ error: msg, url }, resp.status >= 400 ? resp.status : 502);
    }
    const models = parseModels(data, fmt);
    return jsonResponse({ models, url, format: fmt });
  } catch (err) {
    return jsonResponse({ error: 'Unable to fetch model list: ' + (err.message || 'network error'), url }, 502);
  }
}
