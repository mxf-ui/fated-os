
/* ============ 安全存储层（防止 file:// / 微信内置浏览器 / 隐私模式下 localStorage 抛错导致整页空白）============ */
var __memStore = {};
var safeLS = {
  getItem:function(k){ try{ return window.localStorage.getItem(k); }catch(e){ return (k in __memStore)? __memStore[k] : null; } },
  setItem:function(k,v){ try{ window.localStorage.setItem(k,v); }catch(e){ __memStore[k]=String(v); } },
  removeItem:function(k){ try{ window.localStorage.removeItem(k); }catch(e){ delete __memStore[k]; } }
};

/* ============ CLOUD ENTRY GATE ============ */
var INVITE_CODE = '123456';
(function(){
  try{
    window._apiBase = '/api';
    var scr = document.getElementById('invite-screen');
    if(scr) scr.style.display = 'flex';
    if(typeof window.cloudShowEntryGate === 'function') window.cloudShowEntryGate();
  }catch(e){ /* keep boot non-blocking */ }
})();

function grantInvite(){
  if(typeof cloudHasSession === 'function' && cloudHasSession()){
    var s=document.getElementById('invite-screen'); if(s) s.style.display='none';
  }
}
function denyInvite(msg){
  var m=document.getElementById('invite-msg'); if(m) m.textContent=msg;
}
function verifyInvite(){
  if(typeof cloudEntryLogin === 'function') return cloudEntryLogin();
  denyInvite('Please sign in after the app finishes loading.');
}

function pad(n){ return n.toString().padStart(2,'0'); }

/* ============ GLOBAL USER STATE ============ */
let userName = 'user';
let userWxid = 'fated_2026';
let userBio = '';
let userCover = null;
let userPrefs = '';
let userAvatar = null;
let chatBg = '#FBF8F6';
let momentsBg = null;
let personaSeq = 1;
let walletBalance = 9960.00;
let walletTx = [];
let viewAs = 'me';
let mediaRec = null, mediaChunks = [], recordingTimer = null, recStart = 0, isRecording = false;
let moments = [];
let composeHidden = [];
/* 当前正在编辑/查看的联系人朋友圈 ID（用于发朋友圈时定位） */
let _cpmTarget = null;
let _cpmComposerScope = 'me';   /* 'me' = 自己发, 'contact' = 帮联系人发 */
let _postComposeImage = null;   /* dataURL */
let _cpmCoverTarget = null;     /* 'me' | contactId */
function nowTime(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function nowStamp(){ return Date.now(); }

/* ============ COMPACT LUNAR CALENDAR (1900-2050) ============ */
const lunarInfo = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0
];
const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const Animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const lunarMonthCN = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const lunarDayCN = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
function lYearDays(y){ let i, sum=348; for(i=0x8000; i>0x8; i>>=1) sum += (lunarInfo[y-1900] & i)? 1: 0; return sum + leapDays(y); }
function leapDays(y){ if(leapMonth(y)) return (lunarInfo[y-1900] & 0x10000)? 30: 29; return 0; }
function leapMonth(y){ return lunarInfo[y-1900] & 0xf; }
function monthDays(y,m){ return (lunarInfo[y-1900] & (0x10000>>m))? 30: 29; }
function solarToLunar(y,m,d){
  let baseDate = new Date(1900,0,31);
  let objDate = new Date(y,m-1,d);
  let offset = Math.floor((objDate - baseDate) / 86400000);
  let i, leap=0, temp=0;
  for(i=1900; i<2050 && offset>0; i++){ temp = lYearDays(i); offset -= temp; }
  if(offset < 0){ offset += temp; i--; }
  let year = i;
  leap = leapMonth(year);
  let isLeap = false;
  for(i=1; i<13 && offset>0; i++){
    if(leap>0 && i==(leap+1) && !isLeap){ --i; isLeap = true; temp = leapDays(year); }
    else { temp = monthDays(year, i); }
    if(isLeap && i==leap+1) isLeap = false;
    offset -= temp;
  }
  if(offset===0 && leap>0 && i==leap+1){ if(isLeap){ isLeap=false; } else { isLeap=true; --i; } }
  if(offset<0){ offset += temp; --i; }
  let month = i;
  let day = offset + 1;
  return {
    ganzhi: Gan[(year-4)%10] + Zhi[(year-4)%12],
    zodiac: Animals[(year-4)%12],
    monthStr: lunarMonthCN[month-1] + '月',
    dayStr: lunarDayCN[day-1],
    full: Gan[(year-4)%10] + Zhi[(year-4)%12] + '年' + (isLeap?'闰':'') + lunarMonthCN[month-1] + '月' + lunarDayCN[day-1]
  };
}

function formatLockDate(d){
  const weeks = ['周日','周一','周二','周三','周四','周五','周六'];
  const solar = (d.getMonth()+1) + '月' + d.getDate() + '日' + weeks[d.getDay()];
  const lunar = solarToLunar(d.getFullYear(), d.getMonth()+1, d.getDate());
  return solar + ' · ' + lunar.full;
}

var _bat=100;try{navigator.getBattery().then(function(b){_bat=Math.round(b.level*100);upBat();b.onlevelchange=function(){_bat=Math.round(b.level*100);upBat()}})}catch(e){} function upBat(){var f=document.getElementById('bat-fill');var p=document.getElementById('bat-pct');if(f)f.style.width=_bat+'%';if(p)p.textContent=_bat+'%'}
function tick(){
  const d = new Date();
  const t = pad(d.getHours()) + ':' + pad(d.getMinutes());
  document.getElementById('clock-top').textContent = t;
  const big = document.getElementById('clock-big'); if(big) big.textContent = t;
  const home = document.getElementById('clock-home'); if(home) home.textContent = t;
  const dateStr = formatLockDate(d);
  const dl = document.getElementById('lock-date-line'); if(dl) dl.textContent = dateStr;
  const hdl = document.getElementById('home-date-line'); if(hdl) hdl.textContent = dateStr;
}
tick(); setInterval(tick,10000); upBat();

