const fs = require('fs');
const text = fs.readFileSync('index.html', 'utf8');
const failures = [];

if ([...text].some(ch => ch.codePointAt(0) === 0xfffd)) {
  failures.push('index.html contains U+FFFD replacement characters');
}

const malformedPatterns = [
  [/placeholder="[^"]*$/m, 'unterminated placeholder attribute'],
  [/title="[^"]*$/m, 'unterminated title attribute'],
  [/<\/?[a-z0-9-]+[^>]*$/im, 'unterminated html tag at line end'],
  [/>\?+<\/(div|span|small|button|option)>/, 'question-mark placeholder visible in UI text']
];
for (const [pattern, message] of malformedPatterns) {
  if (pattern.test(text)) failures.push(message);
}

const mojibakeSubstrings = [
  '\u93c7\u5b58\u5d32',
  '\u93c7',
  '\u93bb',
  '\u9225',
  '\u9983',
  '\u951b',
  '\u91d4'
];
for (const marker of mojibakeSubstrings) {
  if (text.includes(marker)) failures.push(`index.html contains mojibake marker ${marker}`);
}

if (failures.length) {
  throw new Error(failures.join('; '));
}
console.log('index.html encoding and structural markers verified clean.');
