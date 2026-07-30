/* ============ API & MODEL CONFIG ============ */
function createApiProfile(id, name, endpoint, key, model, apiFormat, temperature, stream){
  return {
    id:id,
    name:name || '新建配置',
    endpoint:endpoint || '',
    key:key || '',
    model:model || '',
    apiFormat:apiFormat || 'openai',
    temperature: typeof temperature==='number' ? temperature : 0.7,
    stream: stream === true,
    models:[]
  };
}
var apiConfig = {
  activeModel:'custom',
  activeProfileId:'default-openai',
  capabilities:{vision:true,audio:true,video:true,tools:true},
  ttsProvider:'elevenlabs',
  memoryWindow:65536, maxContext:307200,
  profiles:[
    createApiProfile('default-openai','默认 OpenAI 兼容','https://api.openai.com/v1','', 'gpt-4o','openai',0.7,false)
  ],
  models:{
    deepseek:{key:'',endpoint:'https://api.deepseek.com/v1/chat/completions',model:'deepseek-chat',apiFormat:'openai',temperature:0.7,stream:false},
    claude:{key:'',endpoint:'https://api.anthropic.com/v1/messages',model:'claude-sonnet-4-20250514',apiFormat:'claude',temperature:0.7,stream:false},
    gemini:{key:'',endpoint:'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',model:'gemini-2.5-pro',apiFormat:'gemini',temperature:0.7,stream:false},
    chatgpt:{key:'',endpoint:'https://api.openai.com/v1/chat/completions',model:'gpt-4o',apiFormat:'openai',temperature:0.7,stream:false},
    custom:{name:'默认 OpenAI 兼容',key:'',endpoint:'https://api.openai.com/v1',model:'gpt-4o',apiFormat:'openai',temperature:0.7,stream:false}
  },
  tts:{elevenlabs:{key:'',model:'eleven_multilingual_v2'},minimax:{key:'',groupId:'',model:'speech-01'},custom:{key:'',endpoint:'',voice:''}},
  imageGen:{enabled:false, provider:'pollinations', endpoint:'https://image.pollinations.ai', key:'', model:'flux', size:'portrait', style:'cinematic mobile illustration, soft green light, delicate details, clean composition, no text in image', negative:'low quality, blurry, watermark, extra text, distorted hands', lastPreview:''},
  voiceIds:{tester1:''},
  memoryBooks:{tester1:''},
  proxyUrl:'http://127.0.0.1:8080',
  webSearch:true
};
