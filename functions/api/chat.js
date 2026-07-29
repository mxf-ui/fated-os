// Cloudflare Pages Function: /api/chat
// Proxies AI chat requests to DeepSeek / OpenAI / Claude / Gemini / Custom endpoints
// Solves CORS: browser → same-origin /api/chat → Cloudflare edge → AI API / 中转站

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

// 端点地址智能补全（与前端 normEp 一致，做防御性二次补全，避免旧存档地址不完整）
function normEp(endpoint, fmt) {
  if (!endpoint) return '';
  var ep = String(endpoint).trim();
  if (!ep) return '';
  // 防御性清理：修复重复协议前缀（如 https://https://...）
  var m = ep.match(/^(https?:\/\/)(.*)/);
  if (m) ep = m[1] + m[2].replace(/^(https?:\/\/)+/, '');
  if (ep.indexOf('http://') !== 0 && ep.indexOf('https://') !== 0) ep = 'https://' + ep;
  ep = ep.replace(/\/+$/, '');
  fmt = fmt || 'openai';
  if (fmt === 'gemini') {
    if (/:generateContent$/i.test(ep)) return ep;
    if (/\/models\/[^/]+$/i.test(ep)) return ep + ':generateContent';
    return ep;
  }
  if (fmt === 'claude') {
    if (/\/messages$/i.test(ep)) return ep;
    if (/\/v1$/i.test(ep)) return ep + '/messages';
    return ep + '/v1/messages';
  }
  // openai 兼容（默认）
  if (/\/chat\/completions$/i.test(ep)) return ep;
  if (/\/v1\/chat$/i.test(ep)) return ep + '/completions';
  if (/\/v1$/i.test(ep)) return ep + '/chat/completions';
  return ep + '/v1/chat/completions';
}

// CORS preflight handler
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

// GET — 诊断端点：浏览器直接访问 /api/chat 即可检查代理是否在线
export async function onRequestGet() {
  return jsonResponse({ ok: true, service: 'chat-proxy', msg: 'Proxy is running. Use POST to send chat requests.', time: Date.now() });
}

export async function onRequestPost(context) {
  const { request } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { messages, provider, key, endpoint, dataModel, apiFormat, max_tokens } = body;

  if (!key) return jsonResponse({ error: 'Missing API key — 请在设置中填写 API Key' }, 400);
  if (!endpoint) return jsonResponse({ error: 'Missing endpoint — 请在设置中填写 API 地址（填域名即可）' }, 400);

  const providerType = provider || 'deepseek';
  const format = apiFormat || 'openai';
  const model = dataModel || body.model || 'deepseek-chat';
  const maxTokens = max_tokens || 1024;

  let url, headers, reqBody;

  try {
    if (providerType === 'claude' || (providerType === 'custom' && format === 'claude')) {
      const fmt = 'claude';
      const sysMsgs = (messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n\n');
      const chatMsgs = (messages || []).filter(m => m.role !== 'system');
      url = normEp(endpoint, fmt);
      headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' };
      reqBody = JSON.stringify({ model, system: sysMsgs, messages: chatMsgs, max_tokens: maxTokens });
    } else if (providerType === 'gemini' || (providerType === 'custom' && format === 'gemini')) {
      const fmt = 'gemini';
      url = normEp(endpoint, fmt);
      url = url + (url.includes('?') ? '&' : '?') + 'key=' + key;
      headers = { 'Content-Type': 'application/json' };
      reqBody = JSON.stringify({
        contents: (messages || []).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
      });
    } else {
      // OpenAI-compatible (DeepSeek, OpenAI, most relay stations / 中转站)
      const fmt = 'openai';
      url = normEp(endpoint, fmt);
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
      reqBody = JSON.stringify({ model, messages: messages || [], max_tokens: maxTokens, temperature: 0.8 });
    }

    console.log('[chat-proxy] format:', format, 'endpoint:', endpoint, 'finalUrl:', url, 'provider:', providerType);

    // 超时保护：中转站无响应时 25s 后主动中断，避免前端长时间挂起
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let apiResp;
    try {
      apiResp = await fetch(url, { method: 'POST', headers, body: reqBody, signal: controller.signal });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const baseMsg = (fetchErr && fetchErr.name === 'AbortError')
        ? '请求超时（中转站 25s 内无响应）'
        : '无法访问目标地址：' + (fetchErr.message || '网络错误') + '。请检查地址是否正确、是否需要科学上网。';
      return jsonResponse({ error: baseMsg + ' (finalUrl: ' + url + ')' }, 502);
    }
    clearTimeout(timeout);

    const respText = await apiResp.text();
    let data;
    try { data = JSON.parse(respText); } catch (e) {
      return jsonResponse({ error: 'API 返回非 JSON (HTTP ' + apiResp.status + ')：' + respText.substring(0, 300) }, 502);
    }

    // Parse reply based on provider
    let reply = '';
    if (providerType === 'claude' || (providerType === 'custom' && format === 'claude')) {
      reply = (data.content && data.content[0]) ? data.content[0].text : '';
    } else if (providerType === 'gemini' || (providerType === 'custom' && format === 'gemini')) {
      reply = (data.candidates && data.candidates[0]) ? data.candidates[0].content.parts[0].text : '';
    } else {
      reply = (data.choices && data.choices[0]) ? data.choices[0].message.content : '';
    }

    if (!reply && data.error) {
      const errMsg = data.error.message || data.error.type || JSON.stringify(data.error);
      return jsonResponse({ error: 'API Error (HTTP ' + apiResp.status + '): ' + errMsg }, apiResp.status >= 400 ? apiResp.status : 502);
    }

    if (!reply) {
      return jsonResponse({ error: 'Empty response from API (HTTP ' + apiResp.status + ')' }, 502);
    }

    return jsonResponse({ content: reply });

  } catch (err) {
    return jsonResponse({ error: 'Proxy error: ' + (err.message || 'Unknown error') }, 502);
  }
}
