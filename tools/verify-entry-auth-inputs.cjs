const fs = require('fs');
const src = fs.readFileSync('js/main/core/08-cloud-sync.js', 'utf8');
function assert(ok, msg){ if(!ok) throw new Error(msg); }
assert(/return cloudLogin\(\{fromEntry:true,\s*input:input\}\)/.test(src), 'entry login must pass the visible gate input directly into cloudLogin');
assert(/return cloudRegister\(\{fromEntry:true,\s*input:input\}\)/.test(src), 'entry register must pass the visible gate input directly into cloudRegister');
assert(/var input=opts\.input\|\|cloudReadInputs\(\)/.test(src), 'cloudLogin/cloudRegister must prefer supplied entry input over hidden settings inputs');
console.log('Entry auth input flow verified.');
