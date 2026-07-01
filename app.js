// === HÄR KAN DU TWEAKA APPEN ===
// Ändra challenges, shop, special events och medaljkrav i listorna nedan.

const DEFAULT_INTERVAL = 30 * 60;
let state = JSON.parse(localStorage.getItem('joelSurvivalPWA') || 'null') || {
  score:0, remaining:DEFAULT_INTERVAL, interval:DEFAULT_INTERVAL, running:false,
  currentEvent:'Ingen ännu', done:{}, medals:{}, custom:[], bought:{}, timerEndsAt:null
};
state.done ||= {}; state.medals ||= {}; state.custom ||= []; state.bought ||= {};
if(typeof state.interval !== 'number' || state.interval <= 0) state.interval = DEFAULT_INTERVAL;
if(typeof state.remaining !== 'number' || state.remaining < 0) state.remaining = state.interval;
state.running = !!state.running;
state.timerEndsAt = typeof state.timerEndsAt === 'number' ? state.timerEndsAt : null;
if(state.running && !state.timerEndsAt) state.timerEndsAt = Date.now() + (state.remaining * 1000);
if(!state.running) state.timerEndsAt = null;

const EVENT_FANFARE_SRC = './fanfare.wav';
const eventFanfare = typeof Audio !== 'undefined' ? new Audio(EVENT_FANFARE_SRC) : null;
let fanfareTimeoutId = null;

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

  {id:'bär', medal:'misc', pts:1, name:'Plocka 20 bär'},
  {id:'skor', medal:'misc', pts:1, name:'Gå 10 min med skor på fel fot'},
  {id:'kalsong', medal:'misc', pts:1, name:'En hand innanför kallingarna tills nästa poäng'},
  {id:'fjäder', medal:'misc', pts:1, name:'Hitta en fjäder'},
  {id:'pirat', medal:'misc', pts:1, name:'Prata som en pirat i 10 minuter'},
  {id:'baklänges', medal:'misc', pts:1, name:'Gå baklänges i 100 meter'},
  {id:'pinnegevär', medal:'misc', pts:1, name:'Håll en pinne som gevär i 10 minuter'},
  {id:'huk', medal:'misc', pts:1, name:'Sitt på huk i 2 minuter'},
  {id:'kapten', medal:'misc', pts:1, name:'Byt namn till Kapten Joel tills nästa poäng'},
  {id:'kottar', medal:'misc', pts:1, name:'Samla 10 kottar'},
  {id:'blad', medal:'misc', pts:1, name:'Hitta tre olika sorters blad'},
  {id:'barkbåt', medal:'misc', pts:1, name:'Gör en barkbåt som flyter i minst 30 sekunder'},
  {id:'knopar', medal:'misc', pts:3, name:'Knyt tre olika knopar'},
  {id:'träsked', medal:'misc', pts:3, name:'Tillverka en träsked eller smörkniv'},
  {id:'djurspår', medal:'misc', pts:3, name:'Hitta ett djurspår'},
  {id:'halsband', medal:'misc', pts:3, name:'Gör ett halsband av naturmaterial'},
  {id:'stenröse', medal:'misc', pts:3, name:'Bygg ett litet stenröse'},
  {id:'ätbart', medal:'misc', pts:3, name:'Hitta något ätbart i naturen, måste godkännas'},
  {id:'kantareller', medal:'misc', pts:5, name:'Samla 10 kantareller, 1 gång'},
  {id:'sommarbanger', medal:'misc', pts:5, name:'Skriv och uppträd en sommarbanger'},
  {id:'rap', medal:'misc', pts:5, name:'Freestyla en rap om hur du och Alex träffades'},
  {id:'visselpipa', medal:'misc', pts:5, name:'Gör en visselpipa av ett blad'},
  {id:'högsta', medal:'misc', pts:5, name:'Hitta den högsta punkten i området'}
];

const events = [
  'Kasta macka – 1 poäng per studs',
  'Drick en öl på 30 sekunder',
  'Bygg pilbåge och träffa target',
  'Yxkast mot stubbe – träffa markerad zon',
  'Survivor Quiz – svara rätt på 5 överlevnadsfrågor',
  'Lucky Shot – kasta en kotte genom en ring eller hink'
];

const shopItems = [
  {id:'kniv', medal:'skytt', name:'🗡️ Kniv', cost:10},
  {id:'yxa', medal:'borg', name:'🪓 Yxa', cost:10},
  {id:'snore', medal:'borg', name:'🪢 Rep', cost:5},
  {id:'tandstal', medal:'eld', name:'🔥 Tändstål', cost:5},
  {id:'ved', medal:'eld', name:'🪵 Ved', cost:5},
  {id:'fisketill', medal:'djup', name:'🪱 Fisketillbehör', cost:5},
  {id:'fiskelina', medal:'djup', name:'🧵 Fiskelina', unitCost:1, unitLabel:'meter', repeatable:true},
  {id:'metspo', medal:'djup', name:'🎣 Metspö + tillbehör', cost:15},
  {id:'kastspo', medal:'djup', name:'🎣 Kastspö', cost:20},
  {id:'stekspade-shop', medal:'våg', name:'🍳 Stekspade', cost:1},
  {id:'mystery', medal:'misc', name:'❓ Mystery lootbox', cost:20},
  {id:'mygg', medal:'misc', name:'🦟 Myggmedel', cost:20},
  {id:'gaffel', medal:'misc', name:'🍴 Gaffel', cost:20},
  {id:'a4', medal:'misc', name:'📜 Ett A4', cost:20},
  {id:'gardin-shop', medal:'misc', name:'🪟 Gardin', cost:10},
  {id:'poncho', medal:'misc', name:'🌧️ Poncho', cost:20}
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
    {label:'Byggt pilbåge och träffat tavla', ok:()=>!!state.done.pilbåge},
    {label:'Tillverkat ett fungerande spjut', ok:()=>!!state.done.spjut},
    {label:'Träffat en majsburk med luftgevär från 20 meters avstånd', ok:()=>!!state.done.majsburk},
    {label:'Fångat en levande mygga med fingrarna', ok:()=>!!state.done.mygga}
  ]
};

function directUnlocks(){ return { djup: !!state.done.egenfisk }; }
function medalUnlocked(id){
  if(directUnlocks()[id]) return true;
  const rules = medalRules[id] || [];
  return rules.length > 0 && rules.every(r => r.ok());
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
function complete(id, pts){ if(state.done[id])return; state.done[id]=true; state.score+=pts; autoUpdateMedals(); save(); render(); toast('+'+pts+' poäng'); }
function undo(id, pts){ if(!state.done[id])return; state.done[id]=false; state.score=Math.max(0,state.score-pts); autoUpdateMedals(); save(); render(); }
function boughtAmount(id){
  const value = state.bought[id];
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : (value ? 1 : 0);
}
function buy(id,cost){ if(state.bought[id])return; if(state.score<cost){ toast('Inte råd'); return; } state.score-=cost; state.bought[id]=true; autoUpdateMedals(); save(); render(); toast('Köpt'); }
function buyByUnit(id, unitCost){
  const input = document.getElementById(`${id}-qty`);
  const qty = parseInt(input?.value, 10);
  if(!Number.isInteger(qty) || qty <= 0){ toast('Ange antal meter'); return; }
  const totalCost = qty * unitCost;
  if(state.score < totalCost){ toast('Inte råd'); return; }
  state.score -= totalCost;
  state.bought[id] = boughtAmount(id) + qty;
  autoUpdateMedals();
  save();
  render();
  toast(`Köpt ${qty} m`);
}
function fmt(s){ return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function stopEventFanfare(){
  if(fanfareTimeoutId){
    clearTimeout(fanfareTimeoutId);
    fanfareTimeoutId = null;
  }
  if(eventFanfare){
    eventFanfare.pause();
    eventFanfare.currentTime = 0;
  }
}
function playEventFanfare(remainingPlays = 3){
  if(!eventFanfare || remainingPlays <= 0) return;
  stopEventFanfare();

  const playOnce = (playsLeft) => {
    if(playsLeft <= 0) return;
    eventFanfare.currentTime = 0;
    eventFanfare.play().catch(() => {});
    if(playsLeft === 1) return;
    fanfareTimeoutId = setTimeout(() => playOnce(playsLeft - 1), 3000);
  };

  playOnce(remainingPlays);
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
  const ev=events[Math.floor(Math.random()*events.length)];
  state.currentEvent = ev;
  state.remaining = state.interval;
  state.timerEndsAt = state.running ? Date.now() + (state.interval * 1000) : null;
  save();
  render();
  playEventFanfare(isManual ? 1 : 3);
  document.getElementById('modalEvent').textContent=ev; document.getElementById('eventModal').classList.add('show');
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
  const ok = item.repeatable ? amount > 0 : !!state.bought[item.id];
  if(item.repeatable){
    return `<div class="card challenge ${ok?'bought':''}">
      <div>
        <div class="name ${ok?'done':''}">${escapeHtml(item.name)}</div>
        <div class="small">${item.unitCost} poäng per ${item.unitLabel}${ok?` – köpt ${amount} ${item.unitLabel}`:''}</div>
      </div>
      <div style="display:grid;gap:6px">
        <div class="small">Meterpris</div>
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
  const rules = medalRules[id] || [];
  const done = rules.filter(r=>r.ok()).length;
  const direct = directUnlocks()[id];
  return direct ? 'Direkt upplåst' : `${done} / ${rules.length}`;
}
function questBlock(id, allChallenges){
  const title = medalInfo[id][0];
  const isDone = !!state.medals[id];
  const rules = medalRules[id] || [];
  const direct = id === 'djup' && state.done.egenfisk;
  const reqHtml = rules.map(r=>`<div class="req ${r.ok()?'ok':''}">${r.ok()?'✓':'○'} ${escapeHtml(r.label)}</div>`).join('')
    + (id==='djup' ? `<div class="req ${direct?'ok':''}">${direct?'✓':'○'} Direkt upplåsning: fånga fisk med egentillverkat redskap</div>` : '');
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
  const q=(document.getElementById('searchBox')?.value || '').toLowerCase();
  if(q) all=all.filter(c=>c.name.toLowerCase().includes(q));
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
  document.getElementById('eventList').innerHTML='<h2>Eventpool</h2>'+events.map(e=>`<div class="card">${escapeHtml(e)}</div>`).join('');
  document.getElementById('shop').innerHTML='<h2>Överlevnadsshop</h2>'+shopItems.map(i=>{
    if(i.repeatable){
      const amount = boughtAmount(i.id);
      return `
    <div class="card shopItem ${amount > 0 ? 'bought' : ''}">
      <div>
        <div class="name">${escapeHtml(i.name)}</div>
        <div class="small">${i.unitCost} poäng per ${i.unitLabel}${amount > 0 ? ` – köpt ${amount} ${i.unitLabel}` : ''}</div>
      </div>
      <div style="display:grid;grid-template-columns:90px auto;gap:8px;align-items:center">
        <input id="${i.id}-qty" type="number" min="1" step="1" value="1" aria-label="${escapeHtml(i.name)} antal ${i.unitLabel}" />
        <button onclick="buyByUnit('${i.id}',${i.unitCost})">Köp meter</button>
      </div>
    </div>`;
    }
    return `
    <div class="card shopItem ${state.bought[i.id]?'bought':''}">
      <div><div class="name">${escapeHtml(i.name)}</div><div class="small">${i.cost} poäng ${state.bought[i.id]?'– köpt':''}</div></div>
      <button ${state.bought[i.id]?'disabled':''} onclick="buy('${i.id}',${i.cost})">${state.bought[i.id]?'Köpt':'Köp'}</button>
    </div>`;
  }).join('');
  document.getElementById('medalList').innerHTML=ids.map(id=>{
    const reqs = (medalRules[id]||[]).map(r=>`<div class="req ${r.ok()?'ok':''}">${r.ok()?'✓':'○'} ${escapeHtml(r.label)}</div>`).join('')
      + (id==='djup'?`<div class="req ${state.done.egenfisk?'ok':''}">${state.done.egenfisk?'✓':'○'} Direkt upplåsning: fånga fisk med egentillverkat redskap</div>`:'');
    return `<div class="medal ${state.medals[id]?'unlocked':''}">
      <div class="name">${escapeHtml(medalInfo[id][0])}</div><div class="small">${escapeHtml(medalInfo[id][1])}</div>
      <div class="reqList">${reqs}</div>
      <br><div class="questStatus ${state.medals[id]?'done':''}">${state.medals[id]?'Automatiskt upplåst ✓':questProgress(id)}</div>
    </div>`;
  }).join('');
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
