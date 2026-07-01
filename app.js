// === HÄR KAN DU TWEAKA APPEN ===
// Ändra challenges, shop, special events och medaljkrav i listorna nedan.

const DEFAULT_INTERVAL = 30 * 60;
let state = JSON.parse(localStorage.getItem('joelSurvivalPWA') || 'null') || {
  score:0, remaining:DEFAULT_INTERVAL, interval:DEFAULT_INTERVAL, running:false,
  currentEvent:'Ingen ännu', done:{}, medals:{}, custom:[], bought:{}, timerEndsAt:null, usedEvents:{}
};
state.done ||= {}; state.medals ||= {}; state.custom ||= []; state.bought ||= {}; state.usedEvents ||= {};
if(typeof state.interval !== 'number' || state.interval <= 0) state.interval = DEFAULT_INTERVAL;
if(typeof state.remaining !== 'number' || state.remaining < 0) state.remaining = state.interval;
state.running = !!state.running;
state.timerEndsAt = typeof state.timerEndsAt === 'number' ? state.timerEndsAt : null;
if(state.running && !state.timerEndsAt) state.timerEndsAt = Date.now() + (state.remaining * 1000);
if(!state.running) state.timerEndsAt = null;

const EVENT_FANFARE_SRC = './fanfare.wav';
const CHALLENGE_COMPLETE_SRC = './klar.wav';
const TRANSACTION_SOUND_SRC = './transaction.mp3';
function createAudioTemplate(src){
  if(typeof Audio === 'undefined') return null;
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.playsInline = true;
  audio.load();
  return audio;
}
const eventFanfareTemplate = createAudioTemplate(EVENT_FANFARE_SRC);
const challengeCompleteTemplate = createAudioTemplate(CHALLENGE_COMPLETE_SRC);
const transactionSoundTemplate = createAudioTemplate(TRANSACTION_SOUND_SRC);
const audioTemplates = [eventFanfareTemplate, challengeCompleteTemplate, transactionSoundTemplate].filter(Boolean);
let fanfareTimeoutId = null;
let activeFanfareAudios = [];
let activeEffectAudios = [];
let audioPlaybackUnlocked = false;

const medalInfo = {
  eld: ['🔥 Eldmästare','Du tämjde elden.'],
  djup: ['🎣 Djupets Konung','Även de största av fiskar ger vika för dig.'],
  våg: ['🛶 Våghärskare','Du behärskar sjön. Båten lyder. Vinden respekt.'],
  borg: ['🏕️ Borgmästare','Du bygger mer än skydd. Du bygger trygghet.'],
  skytt: ['🎯 Prickskytten','Ditt sikte är klart. Ditt skott är säkert. Målets dagar är räknade.']
};

const baseChallenges = [
  {id:'brasa', medal:'eld', pts:10, name:'Gör en brasa, 1 gång'},
  {id:'glöd', medal:'eld', pts:10, name:'Håll glöd vid liv i 30 minuter utan att tända om'},
  {id:'koka', medal:'eld', pts:5, name:'Koka upp vatten över eld'},
  {id:'grillpinne', medal:'eld', pts:3, name:'Bygg en fungerande grillpinne'},

  {id:'fisk', medal:'djup', pts:5, name:'Fånga 1 fisk'},
  {id:'spöhållare', medal:'djup', pts:5, name:'Bygg en fungerande fiskespöshållare'},
  {id:'egenfisk', medal:'djup', pts:10, name:'Fånga en fisk med egentillverkat redskap'},

  {id:'ölro', medal:'våg', pts:5, name:'Åk eka med en öppnad öl till Sebbe utan att spilla'},
  {id:'stekspade', medal:'våg', pts:10, name:'Ro eka till ö med stekspade'},
  {id:'karta', medal:'våg', pts:5, name:'Rita en karta över området'},

  {id:'vindskydd', medal:'borg', pts:10, name:'Gör ett vindskydd'},
  {id:'trefot', medal:'borg', pts:10, name:'Bygg en trefot över elden'},
  {id:'stol', medal:'borg', pts:5, name:'Bygg en stol av naturmaterial'},
  {id:'gardin', medal:'borg', pts:10, name:'Fixa egna kläder från gardin'},

  {id:'pilbåge', medal:'skytt', pts:10, name:'Bygg en pilbåge och träffa en tavla'},
  {id:'spjut', medal:'skytt', pts:5, name:'Tillverka ett fungerande spjut'},
  {id:'majsburk', medal:'skytt', pts:10, name:'Träffa en majsburk med luftgevär från 20 meters avstånd'},
  {id:'mygga', medal:'skytt', pts:10, name:'Fånga en levande mygga med fingrarna, Zen Master Style'},

  {id:'bär', medal:'misc', pts:3, name:'Plocka 20 bär'},
  {id:'skor', medal:'misc', pts:3, name:'Gå 10 min med skor på fel fot'},
  {id:'kalsong', medal:'misc', pts:3, name:'En hand innanför kallingarna tills nästa poäng'},
  {id:'fjäder', medal:'misc', pts:3, name:'Hitta en fjäder'},
  {id:'pirat', medal:'misc', pts:3, name:'Prata som en pirat i 10 minuter'},
  {id:'baklänges', medal:'misc', pts:3, name:'Gå baklänges i 100 meter'},
  {id:'pinnegevär', medal:'misc', pts:3, name:'Håll en pinne som gevär i 10 minuter'},
  {id:'huk', medal:'misc', pts:3, name:'Sitt på huk i 2 minuter'},
  {id:'kapten', medal:'misc', pts:3, name:'Byt namn till Kapten Joel tills nästa poäng'},
  {id:'kottar', medal:'misc', pts:3, name:'Samla 10 kottar'},
  {id:'blad', medal:'misc', pts:3, name:'Hitta tre olika sorters blad'},
  {id:'barkbåt', medal:'misc', pts:3, name:'Gör en barkbåt som flyter i minst 30 sekunder'},
  {id:'knopar', medal:'misc', pts:4, name:'Knyt tre olika knopar'},
  {id:'träsked', medal:'misc', pts:4, name:'Tillverka en träsked eller smörkniv'},
  {id:'djurspår', medal:'misc', pts:4, name:'Hitta ett djurspår'},
  {id:'halsband', medal:'misc', pts:4, name:'Gör ett halsband av naturmaterial'},
  {id:'stenröse', medal:'misc', pts:4, name:'Bygg ett litet stenröse'},
  {id:'ätbart', medal:'misc', pts:4, name:'Hitta något ätbart i naturen, måste godkännas'},
  {id:'kantareller', medal:'misc', pts:5, name:'Samla 10 kantareller, 1 gång'},
  {id:'sommarbanger', medal:'misc', pts:5, name:'Skriv och uppträd en sommarbanger'},
  {id:'visselpipa', medal:'misc', pts:5, name:'Gör en visselpipa av ett blad'},
  {id:'högsta', medal:'misc', pts:3, name:'Hitta den högsta punkten i området'}
];

const events = [
  {id:'macka', label:'Kasta macka – 1 poäng per studs'},
  {id:'ol', label:'Drick en öl på 30 sekunder – 5 poäng'},
  {id:'yxkast', label:'Yxkast mot stubbe – 5 poäng vid träff, tre försök'},
  {id:'survivor-quiz', label:'Survivor Quiz – 1 poäng per rätt fråga', oneTime:true},
  {id:'alex-quiz', label:'Alex quiz – hur väl känner du din fru? 1 poäng per fråga', oneTime:true},
  {id:'lucky-shot', label:'Lucky Shot – kasta en kotte i en hink eller kastrull 10 meter bort, 3 poäng'},
  {id:'freestyle-rap', label:'Freestyle rap – 5 poäng', oneTime:true}
];

const shopItems = [
  {id:'kniv', medal:'skytt', name:'🗡️ Kniv', cost:10},
  {id:'luftgevar', medal:'skytt', name:'🔫 Luftgevär', cost:15},
  {id:'luftgevarsskott', medal:'skytt', name:'🎯 Luftgevärsskott (10 st)', unitCost:5, unitLabel:'omgångar', repeatable:true, buyLabel:'Köp omgång', quantityPrompt:'Ange antal omgångar'},
  {id:'yxa', medal:'borg', name:'🪓 Yxa', cost:10},
  {id:'snore', medal:'borg', name:'🪢 Rep', cost:5},
  {id:'tandstal', medal:'eld', name:'🔥 Tändstål', cost:5},
  {id:'ved', medal:'eld', name:'🪵 Ved', cost:10},
  {id:'fisketill', medal:'djup', name:'🪱 Fisketillbehör', cost:5},
  {id:'fiskelina', medal:'djup', name:'🧵 Fiskelina', unitCost:1, unitLabel:'meter', repeatable:true, buyLabel:'Köp meter', quantityPrompt:'Ange antal meter'},
  {id:'metspo', medal:'djup', name:'🎣 Metspö + tillbehör', cost:15},
  {id:'kastspo', medal:'djup', name:'🎣 Kastspö', cost:20},
  {id:'stekspade-shop', medal:'våg', name:'🍳 Stekspade', cost:1},
  {id:'mystery', medal:'misc', name:'❓ Mystery lootbox', cost:25},
  {id:'mygg', medal:'misc', name:'🦟 Myggmedel', cost:20},
  {id:'kompass', medal:'misc', name:'🧭 Kompass', cost:3},
  {id:'gaffel', medal:'misc', name:'🍴 Gaffel', cost:20},
  {id:'a4', medal:'misc', name:'📜 Ett A4', cost:5},
  {id:'gardin-shop', medal:'misc', name:'🪟 Gardin', cost:10},
  {id:'poncho', medal:'misc', name:'🌧️ Poncho', cost:5}
];

const medalRules = {
  eld: [
    {label:'Köpt tändstål', ok:()=>!!state.bought.tandstal},
    {label:'Köpt ved', ok:()=>!!state.bought.ved},
    {label:'Gjort en brasa', ok:()=>!!state.done.brasa},
    {label:'Hållit glöd vid liv i 30 minuter', ok:()=>!!state.done.glöd}
  ],
  djup: [
    {label:'Köpt fiskegrej: fisketillbehör, metspö eller kastspö', ok:()=>!!(state.bought.fisketill || state.bought.metspo || state.bought.kastspo)},
    {label:'Fångat en fisk', ok:()=>!!state.done.fisk},
    {label:'Byggt en fungerande fiskespöshållare', ok:()=>!!state.done.spöhållare}
  ],
  våg: [
    {label:'Åkt eka med öppnad öl till Sebbe utan spill', ok:()=>!!state.done.ölro},
    {label:'Rott eka till ö med stekspade', ok:()=>!!state.done.stekspade},
    {label:'Ritat karta över området', ok:()=>!!state.done.karta}
  ],
  borg: [
    {label:'Gjort ett vindskydd', ok:()=>!!state.done.vindskydd},
    {label:'Byggt trefot över elden', ok:()=>!!state.done.trefot},
    {label:'Byggt en stol av naturmaterial', ok:()=>!!state.done.stol}
  ],
  skytt: [
    {label:'Köpt luftgevär', ok:()=>!!state.bought.luftgevar},
    {label:'Köpt luftgevärsskott', ok:()=>!!state.bought.luftgevarsskott},
    {label:'Byggt pilbåge och träffat tavla', ok:()=>!!state.done.pilbåge},
    {label:'Tillverkat ett fungerande spjut', ok:()=>!!state.done.spjut},
    {label:'Träffat en majsburk med luftgevär från 20 meters avstånd', ok:()=>!!state.done.majsburk},
    {label:'Fångat en levande mygga med fingrarna', ok:()=>!!state.done.mygga}
  ]
};

function medalChallenges(id){
  return [...baseChallenges, ...state.custom].filter(c => !(id === 'djup' && c.id === 'egenfisk') && c.medal === id);
}
function isShopItemDone(item){
  return item.repeatable ? boughtAmount(item.id) > 0 : !!state.bought[item.id];
}
function medalChecklist(id){
  const rules = (medalRules[id] || []).map((rule, index) => ({
    key:`rule:${id}:${index}`,
    ok:rule.ok
  }));
  const shop = shopItems.filter(item => item.medal === id).map(item => ({
    key:`shop:${item.id}`,
    ok:() => isShopItemDone(item)
  }));
  const challenges = medalChallenges(id).map(challenge => ({
    key:`challenge:${challenge.id}`,
    ok:() => !!state.done[challenge.id]
  }));
  return [...rules, ...shop, ...challenges];
}
function directUnlocks(){
  return {
    djup: !!state.done.egenfisk || !!((state.bought.fisketill || state.bought.metspo || state.bought.kastspo) && boughtAmount('fiskelina') > 0 && state.done.fisk && state.done.spöhållare)
  };
}
function medalUnlocked(id){
  if(directUnlocks()[id]) return true;
  const checklist = medalChecklist(id);
  return checklist.length > 0 && checklist.every(entry => entry.ok());
}
function getPentagonVertices(size = 320, radius = 118){
  const center = size / 2;
  return Array.from({ length: 5 }, (_, index) => {
    const angle = (-90 + (index * 72)) * (Math.PI / 180);
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    };
  });
}
function renderMedalPentagon(ids){
  const size = 320;
  const center = size / 2;
  const vertices = getPentagonVertices(size, 118);
  const outline = vertices.map(point => `${point.x},${point.y}`).join(' ');
  const slices = ids.map((id, index) => {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const edgeMidX = (current.x + next.x) / 2;
    const edgeMidY = (current.y + next.y) / 2;
    const connectorStart = {
      x: center + ((edgeMidX - center) * 1.02),
      y: center + ((edgeMidY - center) * 1.02)
    };
    const labelPoint = {
      x: center + ((edgeMidX - center) * 1.22),
      y: center + ((edgeMidY - center) * 1.22)
    };
    const label = medalInfo[id][0].replace(/^[^\p{L}\p{N}]+\s*/u, '');
    const words = label.split(' ');
    const mid = Math.ceil(words.length / 2);
    const lineOne = escapeHtml(words.slice(0, mid).join(' '));
    const lineTwo = escapeHtml(words.slice(mid).join(' '));
    const textAnchor = Math.abs(labelPoint.x - center) < 18 ? 'middle' : (labelPoint.x < center ? 'end' : 'start');
    return `
      <g class="medalSliceGroup">
        <polygon class="medalSlice ${state.medals[id] ? 'on' : ''}" points="${center},${center} ${current.x},${current.y} ${next.x},${next.y}" />
        <line class="medalConnector ${state.medals[id] ? 'on' : ''}" x1="${connectorStart.x}" y1="${connectorStart.y}" x2="${labelPoint.x}" y2="${labelPoint.y}" />
        <text class="medalOuterLabel ${state.medals[id] ? 'on' : ''}" x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="${textAnchor}" dominant-baseline="middle">
          <tspan x="${labelPoint.x}" dy="${lineTwo ? '-0.55em' : '0'}">${lineOne}</tspan>
          ${lineTwo ? `<tspan x="${labelPoint.x}" dy="1.1em">${lineTwo}</tspan>` : ''}
        </text>
      </g>`;
  }).join('');

  return `
    <div class="medalPentagonCard">
      <div class="medalPentagonWrap">
        <svg class="medalPentagon" viewBox="0 0 ${size} ${size}" aria-label="Medaljöversikt">
          ${slices}
          <polygon class="medalOutline" points="${outline}" />
          <circle class="medalCore" cx="${center}" cy="${center}" r="38"></circle>
          <text class="medalCoreText" x="${center}" y="${center - 6}" text-anchor="middle">MEDALJER</text>
          <text class="medalCoreSub" x="${center}" y="${center + 16}" text-anchor="middle">${ids.filter(id => state.medals[id]).length}/${ids.length}</text>
        </svg>
      </div>
      <div class="medalLegend">
        ${ids.map(id => `
          <div class="medalLegendItem ${state.medals[id] ? 'on' : ''}">
            <div class="medalLegendTop">
              <span class="medalLegendName">${escapeHtml(medalInfo[id][0])}</span>
              <span class="questStatus ${state.medals[id] ? 'done' : ''}">${state.medals[id] ? 'Upplåst ✓' : questProgress(id)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}
function autoUpdateMedals(){
  Object.keys(medalInfo).forEach(id=>{
    const was = !!state.medals[id];
    const now = medalUnlocked(id);
    state.medals[id] = now;
    if(now && !was) setTimeout(()=>toast(medalInfo[id][0] + ' upplåst!'), 100);
  });
}
function save(){ localStorage.setItem('joelSurvivalPWA', JSON.stringify(state)); }
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  })[char]);
}
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),1200); }
function addPoints(n){ state.score=Math.max(0,state.score+n); save(); render(); if(n>0)toast('+'+n+' poäng'); }
function showTab(id, el){ document.querySelectorAll('section').forEach(s=>s.classList.remove('activeSec')); document.getElementById(id).classList.add('activeSec'); document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); if(el)el.classList.add('active'); }
function showTabById(id){ const tab=[...document.querySelectorAll('.tab')].find(t=>t.getAttribute('onclick')?.includes(id)); showTab(id, tab); }
function complete(id, pts){ if(state.done[id])return; state.done[id]=true; state.score+=pts; autoUpdateMedals(); save(); render(); playSoundEffect(CHALLENGE_COMPLETE_SRC, challengeCompleteTemplate); toast('+'+pts+' poäng'); }
function undo(id, pts){ if(!state.done[id])return; state.done[id]=false; state.score=Math.max(0,state.score-pts); autoUpdateMedals(); save(); render(); }
function boughtAmount(id){
  const value = state.bought[id];
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : (value ? 1 : 0);
}
function buy(id,cost){ if(state.bought[id])return; if(state.score<cost){ toast('Inte råd'); return; } state.score-=cost; state.bought[id]=true; autoUpdateMedals(); save(); render(); playSoundEffect(TRANSACTION_SOUND_SRC, transactionSoundTemplate); toast('Köpt'); }
function buyByUnit(id, unitCost, inputId = `${id}-qty`){
  const input = document.getElementById(inputId);
  const item = shopItems.find(shopItem => shopItem.id === id);
  const qty = parseInt(input?.value, 10);
  const quantityPrompt = item?.quantityPrompt || 'Ange antal';
  if(!Number.isInteger(qty) || qty <= 0){ toast(quantityPrompt); return; }
  const totalCost = qty * unitCost;
  if(state.score < totalCost){ toast('Inte råd'); return; }
  state.score -= totalCost;
  state.bought[id] = boughtAmount(id) + qty;
  autoUpdateMedals();
  save();
  render();
  playSoundEffect(TRANSACTION_SOUND_SRC, transactionSoundTemplate);
  toast(`Köpt ${qty} ${item?.unitLabel || ''}`.trim());
}
function fmt(s){ return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function stopEventFanfare(){
  if(fanfareTimeoutId){
    clearTimeout(fanfareTimeoutId);
    fanfareTimeoutId = null;
  }
  activeFanfareAudios.forEach(audio => {
    audio.pause();
    audio.currentTime = 0;
  });
  activeFanfareAudios = [];
}
function createAudioFromTemplate(template, src){
  const audio = template ? template.cloneNode(true) : new Audio(src);
  audio.preload = 'auto';
  audio.playsInline = true;
  return audio;
}
async function unlockAudioPlayback(){
  if(audioPlaybackUnlocked || typeof Audio === 'undefined') return;

  const unlockAttempts = audioTemplates.map(async template => {
    try {
      template.muted = true;
      template.currentTime = 0;
      await template.play();
      template.pause();
      template.currentTime = 0;
      template.muted = false;
      return true;
    } catch {
      template.muted = false;
      return false;
    }
  });

  const results = await Promise.allSettled(unlockAttempts);
  audioPlaybackUnlocked = results.some(result => result.status === 'fulfilled' && result.value);
}
function createEventFanfareAudio(){
  return createAudioFromTemplate(eventFanfareTemplate, EVENT_FANFARE_SRC);
}
function startAudioFromBeginning(audio){
  const playAudio = () => {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  };

  if(audio.readyState >= 2){
    playAudio();
    return;
  }

  audio.addEventListener('canplaythrough', playAudio, { once:true });
  audio.load();
}
function playSoundEffect(src, template){
  if(typeof Audio === 'undefined') return;
  const audio = createAudioFromTemplate(template, src);
  activeEffectAudios.push(audio);
  startAudioFromBeginning(audio);
  audio.addEventListener('ended', () => {
    activeEffectAudios = activeEffectAudios.filter(item => item !== audio);
  }, { once:true });
}
function playEventFanfare(remainingPlays = 3){
  if(typeof Audio === 'undefined' || remainingPlays <= 0) return;
  stopEventFanfare();

  const playOnce = (playsLeft) => {
    if(playsLeft <= 0) return;
    const audio = createEventFanfareAudio();
    activeFanfareAudios.push(audio);
    startAudioFromBeginning(audio);
    audio.addEventListener('ended', () => {
      activeFanfareAudios = activeFanfareAudios.filter(item => item !== audio);
    }, { once:true });
    if(playsLeft === 1) return;
    fanfareTimeoutId = setTimeout(() => playOnce(playsLeft - 1), 3000);
  };

  playOnce(remainingPlays);
}
function eventUsed(id){
  return !!state.usedEvents[id];
}
function availableEvents(){
  return events.filter(event => !event.oneTime || !eventUsed(event.id));
}
function syncTimer(){
  if(!state.running || !state.timerEndsAt) return false;
  const remainingMs = state.timerEndsAt - Date.now();
  if(remainingMs <= 0){
    triggerEvent();
    return true;
  }
  state.remaining = Math.ceil(remainingMs / 1000);
  return false;
}
function startTimer(){
  unlockAudioPlayback();
  syncTimer();
  state.running = true;
  state.timerEndsAt = Date.now() + (state.remaining * 1000);
  save();
  render();
}
function pauseTimer(){
  syncTimer();
  state.running = false;
  state.timerEndsAt = null;
  save();
  render();
}
function resetTimer(){
  state.remaining = state.interval;
  state.running = false;
  state.timerEndsAt = null;
  save();
  render();
}
function changeInterval(){
  state.interval = parseInt(document.getElementById('intervalSelect').value,10);
  state.remaining = state.interval;
  state.timerEndsAt = state.running ? Date.now() + (state.interval * 1000) : null;
  save();
  render();
}
function triggerEvent(isManual = false){
  const pool = availableEvents();
  const event = pool[Math.floor(Math.random()*pool.length)] || events[Math.floor(Math.random()*events.length)];
  if(event.oneTime) state.usedEvents[event.id] = true;
  state.currentEvent = event.label;
  state.remaining = state.interval;
  state.timerEndsAt = state.running ? Date.now() + (state.interval * 1000) : null;
  save();
  render();
  playEventFanfare(isManual ? 1 : 3);
  document.getElementById('modalEvent').textContent=event.label; document.getElementById('eventModal').classList.add('show');
  if(navigator.vibrate) navigator.vibrate([250,100,250]);
}
function closeModal(){ document.getElementById('eventModal').classList.remove('show'); }
function addCustomChallenge(){
  const name=document.getElementById('newName').value.trim();
  const pts=parseInt(document.getElementById('newPts').value,10);
  const medal=document.getElementById('newMedal').value;
  if(!name || !Number.isFinite(pts) || pts <= 0) return;
  state.custom.push({id:'custom'+Date.now(),name,pts,medal});
  document.getElementById('newName').value=''; document.getElementById('newPts').value='';
  save(); render(); showTabById('challenges');
}
function hardReset(){ if(confirm('Nollställa allt?')){ localStorage.removeItem('joelSurvivalPWA'); location.reload(); } }

function itemRequirementCard(item){
  const amount = boughtAmount(item.id);
  const ok = isShopItemDone(item);
  if(item.repeatable){
    const inputId = `quest-${item.id}-qty`;
    return `<div class="card challenge ${ok?'bought':''}">
      <div>
        <div class="name ${ok?'done':''}">${escapeHtml(item.name)}</div>
        <div class="small">${item.unitCost} poäng per ${item.unitLabel}${ok?` – köpt ${amount} ${item.unitLabel}`:''}</div>
      </div>
      <div style="display:grid;grid-template-columns:90px auto;gap:8px;align-items:center">
        <input id="${inputId}" type="number" min="1" step="1" value="1" aria-label="${escapeHtml(item.name)} antal ${item.unitLabel}" />
        <button onclick="buyByUnit('${item.id}',${item.unitCost},'${inputId}')">${escapeHtml(item.buyLabel || 'Köp')}</button>
      </div>
    </div>`;
  }
  return `<div class="card challenge ${ok?'bought':''}">
    <div>
      <div class="name ${ok?'done':''}">${escapeHtml(item.name)}</div>
      <div class="small">Shopkrav – ${item.cost} poäng ${ok?'– köpt':''}</div>
    </div>
    <div style="display:grid;gap:6px">
      <button ${ok?'disabled':''} onclick="buy('${item.id}',${item.cost})">${ok?'Köpt':'Köp'}</button>
    </div>
  </div>`;
}
function challengeCard(c){
  return `<div class="card challenge">
    <div>
      <div class="name ${state.done[c.id]?'done':''}">${escapeHtml(c.name)}</div>
      <div class="small">${c.pts} poäng</div>
    </div>
    <div style="display:grid;gap:6px">
      <button class="btnGold" onclick="complete('${c.id}',${c.pts})">Klar</button>
      ${state.done[c.id]?`<button onclick="undo('${c.id}',${c.pts})">Ångra</button>`:''}
    </div>
  </div>`;
}
function questProgress(id){
  if(directUnlocks()[id]) return 'Direkt upplåst';
  const checklist = medalChecklist(id);
  const done = checklist.filter(entry => entry.ok()).length;
  return `${done} / ${checklist.length}`;
}
function questBlock(id, allChallenges){
  const title = medalInfo[id][0];
  const isDone = !!state.medals[id];
  const rules = medalRules[id] || [];
  const direct = id === 'djup' && directUnlocks().djup;
  const altDjupUnlock = (state.bought.fisketill || state.bought.metspo || state.bought.kastspo) && boughtAmount('fiskelina') > 0 && state.done.fisk && state.done.spöhållare;
  const reqHtml = rules.map(r=>`<div class="req ${r.ok()?'ok':''}">${r.ok()?'✓':'○'} ${escapeHtml(r.label)}</div>`).join('')
    + (id==='djup' ? `<div class="req ${state.done.egenfisk?'ok':''}">${state.done.egenfisk?'✓':'○'} Direkt upplåsning: fånga fisk med egentillverkat redskap</div><div class="req ${altDjupUnlock?'ok':''}">${altDjupUnlock?'✓':'○'} Alternativ upplåsning: köpt en fiskegrej, köpt minst 1 meter fiskelina, fångat en fisk och byggt en fungerande fiskespöhållare</div>` : '');
  const shopHtml = shopItems.filter(i=>i.medal===id).map(itemRequirementCard).join('');
  const challengesHtml = allChallenges.filter(c=>c.medal===id).map(challengeCard).join('');
  return `<div class="questBlock">
    <div class="questHead">
      <div class="questTitle">${escapeHtml(title)}</div>
      <div class="questStatus ${isDone?'done':''}">${isDone?'Upplåst ✓':questProgress(id)}</div>
    </div>
    <div class="small">${escapeHtml(medalInfo[id][1])}</div>
    <div class="reqList">${reqHtml}</div>
    <h3>Shopkrav / relaterade köp</h3>
    ${shopHtml || '<div class="small">Inga shopkrav.</div>'}
    <h3>Challenges</h3>
    ${challengesHtml || '<div class="small">Inga challenges.</div>'}
  </div>`;
}
function renderChallenges(){
  autoUpdateMedals();
  let all=[...baseChallenges,...state.custom];
  const f=document.getElementById('medalFilter')?.value || 'all';
  const stateF=document.getElementById('stateFilter')?.value || 'all';
  if(stateF==='done') all=all.filter(c=>state.done[c.id]);
  if(stateF==='open') all=all.filter(c=>!state.done[c.id]);

  let html = '';
  if(f === 'all'){
    html = Object.keys(medalInfo).map(id=>questBlock(id, all)).join('');
    const misc = all.filter(c=>c.medal==='misc');
    if(misc.length){
      html += `<div class="questBlock"><div class="questHead"><div class="questTitle">Övriga challenges</div><div class="questStatus">${misc.length} st</div></div>${misc.map(challengeCard).join('')}</div>`;
    }
  } else if(f === 'misc'){
    const misc = all.filter(c=>c.medal==='misc');
    html = `<div class="questBlock"><div class="questHead"><div class="questTitle">Övriga challenges</div><div class="questStatus">${misc.length} st</div></div>${misc.map(challengeCard).join('') || '<div class="small">Inga challenges här.</div>'}</div>`;
  } else {
    html = questBlock(f, all);
  }
  document.getElementById('challengeList').innerHTML = html || '<div class="card small">Inga challenges här.</div>';
}
function render(){
  autoUpdateMedals();
  document.getElementById('score').textContent=state.score;
  document.getElementById('timer').textContent=fmt(state.remaining);
  document.getElementById('currentEvent').textContent=state.currentEvent;
  const ids=Object.keys(medalInfo);
  const unlocked=ids.filter(id=>state.medals[id]).length;
  document.getElementById('medalProgress').textContent=`${unlocked} / ${ids.length} medaljer`;
  document.getElementById('medalDots').innerHTML=ids.map(id=>`<span class="dot ${state.medals[id]?'on':''}">${medalInfo[id][0].split(' ')[0]}</span>`).join('');
  renderChallenges();
  document.getElementById('eventList').innerHTML='<h2>Eventpool</h2>'+events.map(event=>`<div class="card ${event.oneTime && eventUsed(event.id) ? 'usedEvent' : ''}"><div class="name">${escapeHtml(event.label)}</div><div class="small">${event.oneTime ? (eventUsed(event.id) ? 'Engångsevent – redan slumpat' : 'Engångsevent – kan bara slumpas 1 gång') : 'Kan slumpas flera gånger'}</div></div>`).join('');
  document.getElementById('shop').innerHTML='<h2>Överlevnadsshop</h2>'+shopItems.map(i=>{
    if(i.repeatable){
      const amount = boughtAmount(i.id);
      return `
    <div class="card shopItem repeatableItem ${amount > 0 ? 'stocked' : ''}">
      <div>
        <div class="name">${escapeHtml(i.name)}</div>
        <div class="small">${i.unitCost} poäng per ${i.unitLabel}${amount > 0 ? ` – köpt ${amount} ${i.unitLabel}` : ''}</div>
      </div>
      <div style="display:grid;grid-template-columns:90px auto;gap:8px;align-items:center">
        <input id="${i.id}-qty" type="number" min="1" step="1" value="1" aria-label="${escapeHtml(i.name)} antal ${i.unitLabel}" />
        <button onclick="buyByUnit('${i.id}',${i.unitCost})">${escapeHtml(i.buyLabel || 'Köp')}</button>
      </div>
    </div>`;
    }
    return `
    <div class="card shopItem ${state.bought[i.id]?'bought':''}">
      <div><div class="name">${escapeHtml(i.name)}</div><div class="small">${i.cost} poäng ${state.bought[i.id]?'– köpt':''}</div></div>
      <button ${state.bought[i.id]?'disabled':''} onclick="buy('${i.id}',${i.cost})">${state.bought[i.id]?'Köpt':'Köp'}</button>
    </div>`;
  }).join('');
  document.getElementById('medalList').innerHTML = renderMedalPentagon(ids);
  const sel=document.getElementById('intervalSelect'); if(sel) sel.value=String(state.interval);
  save();
}
setInterval(()=>{
  if(!state.running) return;
  const before = state.remaining;
  const triggered = syncTimer();
  if(triggered) return;
  if(state.remaining !== before){
    save();
    render();
  }
},1000);
document.addEventListener('visibilitychange', () => {
  if(document.hidden) return;
  if(syncTimer()) return;
  render();
});
window.addEventListener('focus', () => {
  if(syncTimer()) return;
  render();
});
syncTimer();
render();

['pointerdown','touchstart','keydown'].forEach(eventName => {
  window.addEventListener(eventName, unlockAudioPlayback, { passive:true });
});

if ('serviceWorker' in navigator) {
  let refreshingForUpdate = false;

  const reloadForUpdate = () => {
    if(refreshingForUpdate) return;
    refreshingForUpdate = true;
    window.location.reload();
  };

  const checkForAppUpdate = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if(registration) await registration.update();
    } catch {}
  };

  navigator.serviceWorker.addEventListener('controllerchange', reloadForUpdate);

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js', { updateViaCache:'none' });
      await checkForAppUpdate();
    } catch {}
  });

  window.addEventListener('focus', checkForAppUpdate);
  window.addEventListener('online', checkForAppUpdate);
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) return;
    checkForAppUpdate();
  });
  setInterval(checkForAppUpdate, 60 * 1000);
}
