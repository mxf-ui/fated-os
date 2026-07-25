// Cloudflare Pages Function: /api/search
// Proxies web search requests to help AI get real-time information

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

  const { query } = body;
  if (!query) return jsonResponse({ error: 'Missing query' }, 400);

  try {
    const searchUrl = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1';
    const resp = await fetch(searchUrl);
    const data = await resp.json();

    let results = [];
    if (data.AbstractText) results.push(data.AbstractText);
    if (data.AbstractURL) results.push('Source: ' + data.AbstractURL);
    (data.RelatedTopics || []).slice(0, 8).forEach(t => {
      if (t.Text) results.push(t.Text);
    });

    if (results.length < 3) {
      try {
        const wikiUrl = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + encodeURIComponent(query) + '&format=json&srlimit=3';
        const wikiResp = await fetch(wikiUrl);
        const wikiData = await wikiResp.json();
        if (wikiData.query && wikiData.query.search) {
          wikiData.query.search.forEach(item => {
            const snippet = item.snippet.replace(/<[^>]+>/g, '');
            results.push(item.title + ': ' + snippet);
          });
        }
      } catch (e) {}
    }

    const output = results.length
      ? ('[Search: ' + query + ']\n' + results.join('\n').substring(0, 1200))
      : '';

    return jsonResponse({ results: output });

  } catch (err) {
    return jsonResponse({ error: 'Search failed: ' + (err.message || 'Unknown') }, 502);
  }
}

export async function onRequestGet() {
  return jsonResponse({ ok: true, service: 'search', time: Date.now() });
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
