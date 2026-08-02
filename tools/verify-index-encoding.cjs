const fs = require('fs');
const text = fs.readFileSync('index.html', 'utf8');
const bad = ['鏇存崲','涓诲睆','鎴?','鍙戞秷','璁剧疆涓','鐧诲綍'];
const found = bad.filter(s => text.includes(s));
if(found.length){ throw new Error('index.html still contains mojibake markers: '+found.join(', ')); }
console.log('index.html encoding markers verified clean.');
