import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

const apiUi = read('js/main/core/02-api-config-ui.js');
const index = read('index.html');
const goVoice = read('js/games/go/05-voice-end.js');
const goLive = read('js/games/go/02-live-danmaku.js');

check('settings reads TTS form into global apiConfig.tts', /function\s+cfgReadTTSForm\s*\(/.test(apiUi) && /apiConfig\.tts\.elevenlabs\.key/.test(apiUi) && /apiConfig\.tts\.minimax\.groupId/.test(apiUi) && /apiConfig\.tts\.custom\.endpoint/.test(apiUi));
check('settings save applies TTS before saveState', /function\s+cfgSaveAll\s*\(\)\s*\{[\s\S]*cfgReadTTSForm\(\)[\s\S]*saveState\(\)/.test(apiUi));
check('settings renders saved TTS values', /function\s+cfgRenderTTSForm\s*\(/.test(apiUi) && /cfg-11l-key/.test(apiUi) && /cfg-mm-group/.test(apiUi) && /cfg-tts-custom-endpoint/.test(apiUi));
check('settings has TTS connection test button', /cfgTestTTS\(\)/.test(index) && /cfg-tts-test-status/.test(index));
check('TTS test function calls global speakWithTTS', /function\s+cfgTestTTS\s*\(/.test(apiUi) && /speakWithTTS/.test(apiUi));
check('TTS test uses strict connection result', /speakWithTTS\([^\n]+\{noFallback:true\}/.test(apiUi) && /function\s+speakWithTTS\s*\([^)]*opts/.test(read('js/main/chat/00-group-voice-api.js')));
check('GO live controls expose typed partner fallback', /go-partner-text/.test(goLive) && /goSendPartnerText\(\)/.test(goLive));
check('GO partner voice button has stable id', /id="go-partner-voice-btn"/.test(goLive));
check('GO voice fallback handles unavailable speech recognition', /function\s+goSendPartnerText\s*\(/.test(goVoice) && /goFocusPartnerText/.test(goVoice) && /SpeechRecognition/.test(goVoice));
check('GO reset handles partner voice button', /go-partner-voice-btn/.test(goVoice) && /goResetVoiceButtons/.test(goVoice));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) console.log((c.ok ? 'PASS' : 'FAIL') + ' ' + c.name);
if (failed.length) {
  console.error('\n' + failed.length + ' check(s) failed.');
  process.exit(1);
}
