import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/main/02-passcode-profile.js', 'utf8');

const legacySheets = ['game', 'couple', 'forum', 'music', 'novel'];

function extractOpenSheetBody(source){
  const start = source.indexOf('function openSheet(id)');
  if(start === -1) throw new Error('openSheet function is missing');
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for(let i = braceStart; i < source.length; i++){
    const ch = source[i];
    if(ch === '{') depth++;
    if(ch === '}') depth--;
    if(depth === 0) return source.slice(braceStart + 1, i);
  }
  throw new Error('openSheet body could not be parsed');
}

function sheetIsInsideContactProfile(id){
  const contactStart = html.indexOf('id="sheet-contact-profile"');
  const sheetStart = html.indexOf(`id="sheet-${id}"`);
  const firstTopLevelAfterLegacy = html.indexOf('id="sheet-suoha"');
  return contactStart !== -1 && sheetStart > contactStart && sheetStart < firstTopLevelAfterLegacy;
}

const nested = legacySheets.filter(sheetIsInsideContactProfile);
if(nested.length !== legacySheets.length){
  throw new Error(`Expected legacy sheets to be nested for this regression case; found nested: ${nested.join(', ')}`);
}

const openSheetBody = extractOpenSheetBody(js);
if(!js.includes('function fatedHoistSheetToScreen')){
  throw new Error('Missing fatedHoistSheetToScreen helper for nested legacy sheets');
}
if(!openSheetBody.includes('fatedHoistSheetToScreen(el)')){
  throw new Error('openSheet must hoist nested sheet elements before opening them');
}

console.log('Legacy nested sheet hoist check passed.');
