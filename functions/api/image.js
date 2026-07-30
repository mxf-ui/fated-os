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
function imageSizeValue(size) {
  if (size === 'landscape') return { width: 1280, height: 768, openai: '1536x1024' };
  if (size === 'portrait') return { width: 768, height: 1280, openai: '1024x1536' };
  return { width: 1024, height: 1024, openai: '1024x1024' };
}
function imageGenEndpoint(endpoint) {
  let ep = cleanEndpoint(endpoint || 'https://api.openai.com/v1');
  ep = ep.replace(/\/images\/generations$/i, '').replace(/\/v1$/i, '');
  return ep.replace(/\/+$/, '') + '/v1/images/generations';
}
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
}
export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); }
  catch (e) { return jsonResponse({ error: 'Invalid JSON body' }, 400); }
  const provider = String(body.provider || 'pollinations').toLowerCase();
  const prompt = String(body.prompt || '').trim();
  const negative = String(body.negative || '').trim();
  const model = String(body.model || (provider === 'pollinations' ? 'flux' : 'gpt-image-1')).trim();
  const size = imageSizeValue(body.size || 'portrait');
  if (!prompt) return jsonResponse({ error: 'Missing prompt' }, 400);
  if (provider === 'pollinations') {
    const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const fullPrompt = negative ? prompt + '. Avoid: ' + negative : prompt;
    const url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(fullPrompt) + '?width=' + size.width + '&height=' + size.height + '&nologo=true&private=true&model=' + encodeURIComponent(model || 'flux') + '&seed=' + encodeURIComponent(seed);
    return jsonResponse({ url, provider: 'pollinations', model: model || 'flux' });
  }
  const endpoint = imageGenEndpoint(body.endpoint);
  const key = String(body.key || '').trim();
  if (!endpoint || !key) return jsonResponse({ error: 'Missing image API endpoint or key' }, 400);
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, prompt: negative ? prompt + '\nNegative prompt: ' + negative : prompt, size: size.openai, n: 1, response_format: 'b64_json' })
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return jsonResponse({ error: data.error && (data.error.message || data.error) || ('Image API HTTP ' + upstream.status), detail: data }, upstream.status);
  const first = data.data && data.data[0] || {};
  const image_url = first.url || (first.image_url && (first.image_url.url || first.image_url)) || '';
  const b64_json = first.b64_json || '';
  const url = image_url || (b64_json ? 'data:image/png;base64,' + b64_json : '');
  if (!url) return jsonResponse({ error: 'Image API returned no image_url or b64_json', detail: data }, 502);
  return jsonResponse({ url, provider, model });
}
