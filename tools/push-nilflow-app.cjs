const { readFileSync } = require('fs');
const { request } = require('https');

const owner = 'mxf-ui';
const repo = 'fated-os';
const branch = 'main';
const token = process.env.GITHUB_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN is required');

const files = [
  'index.html',
  'css/style.css',
  'css/modules/11-nilflow.css',
  'js/main/01-system-shell.js',
  'js/main/core/05-persistence.js',
  'js/nilflow/00-nilflow.js',
  'tools/verify-nilflow-app.mjs',
  'tools/push-nilflow-app.cjs'
];

function gh(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'User-Agent': 'codex-fated-os-updater',
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? {'Content-Type':'application/json'} : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = data; }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error('GitHub API ' + res.statusCode + ': ' + (typeof parsed === 'string' ? parsed : JSON.stringify(parsed))));
          return;
        }
        resolve(parsed);
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const ref = await gh('GET', '/repos/' + owner + '/' + repo + '/git/ref/heads/' + branch);
  const baseSha = ref.object.sha;
  const baseCommit = await gh('GET', '/repos/' + owner + '/' + repo + '/git/commits/' + baseSha);
  const blobs = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const blob = await gh('POST', '/repos/' + owner + '/' + repo + '/git/blobs', { content, encoding: 'utf-8' });
    blobs.push({ path: file, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const tree = await gh('POST', '/repos/' + owner + '/' + repo + '/git/trees', {
    base_tree: baseCommit.tree.sha,
    tree: blobs
  });
  const commit = await gh('POST', '/repos/' + owner + '/' + repo + '/git/commits', {
    message: 'Upgrade NilFlow AI chat and post interactions',
    tree: tree.sha,
    parents: [baseSha]
  });
  await gh('PATCH', '/repos/' + owner + '/' + repo + '/git/refs/heads/' + branch, { sha: commit.sha, force: false });
  console.log('PUSHED ' + commit.sha);
  console.log('URL https://github.com/' + owner + '/' + repo + '/commit/' + commit.sha);
})();