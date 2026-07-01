// ====================================================================
// RENDER: DASHBOARD & SESSIONS
// ====================================================================
function switchTab(tab, btn) {
  window._modalReturn = null;
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  if(btn) btn.classList.add('active');
  if (tab==='dashboard') renderDashboard();
  if (tab==='hands') renderHands();
  if (tab==='positions') renderPositions();
  if (tab==='mistakes') renderMistakes();
  if (tab==='upload') renderStoredSessions();
  if (tab==='starting') renderStartingHands();
  if (tab==='analysis') renderAnalysis();
  if (tab==='grid') renderGrid();
}

// ─── DASHBOARD ────────────────────────────────────────────────
function renderDashboard() {
  const tf = getEl('dash-filter');
  const hands = filterHands(allHands, tf, getEl('dash-stakes'), getEl('dash-type'), 'dash-date');
  const netBB = hands.reduce((s,h)=>s+h.netBB,0);
  const bb100 = hands.length ? (netBB/hands.length*100) : 0;
  const mistakes = hands.filter(h=>h.tagIssues.length>0);
  const compliance = hands.length ? Math.round((1-mistakes.length/hands.length)*100) : 0;
  const bigLosses = hands.filter(h=>h.netBB < -10).length;
  const wonHands = hands.filter(h=>h.netBB > 0 && h.vpip).length;
  const playedHands = hands.filter(h=>h.vpip).length;
  const winRate = playedHands ? Math.round(wonHands/playedHands*100) : 0;
  // Net USD and duration
  const stakesBBval = {'NL25':0.25,'NL10':0.10};
  const netUSDval = hands.reduce((s,h)=>s+(h.netBB*(stakesBBval[h.stakes]||0.25)),0);
  // Duration using filtered hands for current view
  const filtSessions = buildSessions(hands);
  let durHours = filtSessions.reduce((s,x)=>s+x.durMin/60, 0);
  const usdPerHour = durHours > 0 ? netUSDval/durHours : 0;
  const handsPerHour = durHours > 0 ? Math.round(hands.length/durHours) : 0;
  const durH = Math.floor(durHours);
  const durM = Math.round((durHours%1)*60);
  const durStr = durHours > 0 ? (durH > 0 ? durH+'h '+durM+'m' : durM+'m') : '—';
  const netUSDabs = Math.abs(netUSDval).toFixed(2);
  const usdHrAbs = Math.abs(usdPerHour).toFixed(2);

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat"><p class="stat-label">Total hands</p><p class="stat-value blue">${hands.length}</p></div>
    <div class="stat"><p class="stat-label">Net BB</p><p class="stat-value ${netBB>=0?'green':'red'}">${netBB>=0?'+':''}${netBB.toFixed(1)}</p></div>
    <div class="stat"><p class="stat-label">Net $</p><p class="stat-value ${netUSDval>=0?'green':'red'}">${netUSDval>=0?'+':'-'}$${netUSDabs}</p></div>
    <div class="stat"><p class="stat-label">BB / 100</p><p class="stat-value ${bb100>=0?'green':'red'}">${bb100>=0?'+':''}${bb100.toFixed(2)}</p></div>
    <div class="stat"><p class="stat-label">$ / hour</p><p class="stat-value ${usdPerHour>=0?'green':'red'}">${usdPerHour>=0?'+':'-'}$${usdHrAbs}</p></div>
    <div class="stat"><p class="stat-label">Duration</p><p class="stat-value blue" style="font-size:16px">${durStr}</p></div>
    <div class="stat"><p class="stat-label">Hands / hour</p><p class="stat-value blue">${handsPerHour > 0 ? handsPerHour : '—'}</p></div>
    <div class="stat"><p class="stat-label">TAG compliance</p><p class="stat-value ${compliance>=80?'green':compliance>=60?'amber':'red'}">${compliance}%</p></div>
    <div class="stat"><p class="stat-label">Big losses (&gt;10bb)</p><p class="stat-value ${bigLosses?'red':''}">${bigLosses}</p></div>
  `;
  // Positions
  const positions = ['BTN','CO','HJ','UTG','SB','BB'];
  const posData = positions.map(p=>({p, hands:hands.filter(h=>h.position===p), net:hands.filter(h=>h.position===p).reduce((s,h)=>s+h.netBB,0)}));
  const maxAbs = Math.max(...posData.map(d=>Math.abs(d.net)),1);
  document.getElementById('dash-positions').innerHTML = posData.map(d=>{
    const pct = Math.round(Math.abs(d.net)/maxAbs*100);
    const col = d.net>=0?'#6db87a':'#d96060';
    return `<div class="pos-row">
      <span class="pos-name">${d.p}</span>
      <div class="pos-bar-track"><div class="pos-bar-fill" style="width:${pct}%;background:${col}"></div></div>
      <span class="pos-bb" style="color:${col}">${d.net>=0?'+':''}${d.net.toFixed(1)}</span>
    </div>`;
  }).join('');
  // Violations: two clickable boxes (preflop + postflop), identical to Analysis tab
  const dashIssueCounts={}; const dashIssueBB={};
  hands.forEach(h=>h.tagIssues.forEach(i=>{dashIssueCounts[i]=(dashIssueCounts[i]||0)+1; dashIssueBB[i]=(dashIssueBB[i]||0)+h.netBB;}));
  document.getElementById('dash-violations').innerHTML =
    buildFlagCardHtml(pfFlagMeaning(),'Preflop violations',dashIssueCounts,dashIssueBB,'dash')
    + buildFlagCardHtml(postfFlagMeaning(),'Postflop mistakes',dashIssueCounts,dashIssueBB,'dash');
  // Sessions
  const sessions = buildSessions(allHands);
  const hdr=document.getElementById('total-hands-header');if(hdr)hdr.textContent=hands.length;
  function bb100of(arr){ return arr.length? arr.reduce(function(s,x){return s+x.netBB;},0)/arr.length*100 : 0; }
  var stakeRows = [
    {label:'R&C NL10', hs:hands.filter(function(x){return x.gameType==='Rush&Cash'&&x.stakes==='NL10';})},
    {label:'R&C NL25', hs:hands.filter(function(x){return x.gameType==='Rush&Cash'&&x.stakes==='NL25';})},
    {label:'Reg NL10', hs:hands.filter(function(x){return x.gameType==='Regular'&&x.stakes==='NL10';})},
    {label:'Reg NL25', hs:hands.filter(function(x){return x.gameType==='Regular'&&x.stakes==='NL25';})}
  ];
  const sbd=document.getElementById('dash-stakes-breakdown');
  document.getElementById('dash-sessions').innerHTML = sessions.length
    ? `<p style="font-size:13px;color:var(--text3);margin:0 0 10px">${sessions.length} session${sessions.length!==1?'s':''} · ${hands.length} hands shown · ${allHands.length} total in DB</p>`
    : '<p style="font-size:13px;color:var(--muted);margin:0">No sessions uploaded yet</p>';
  if(sbd) sbd.innerHTML = stakeRows.map(function(row){
    if(row.hs.length===0) return '';
    var bb = bb100of(row.hs);
    var col = bb>=0?'var(--green)':'var(--red)';
    return '<div style="display:flex;align-items:stretch;gap:8px;margin-bottom:8px">'
      +'<div style="flex:0 0 90px;display:flex;align-items:center;font-size:13px;font-weight:700;color:var(--text)">'+row.label+'</div>'
      +'<div class="stat" style="flex:1;text-align:center"><p class="stat-label">Hands</p><p class="stat-value blue" style="font-size:18px">'+row.hs.length+'</p></div>'
      +'<div class="stat" style="flex:1;text-align:center"><p class="stat-label">Win rate</p><p class="stat-value" style="font-size:18px;color:'+col+'">'+(bb>=0?'+':'')+bb.toFixed(1)+'<span style="font-size:10px;font-weight:400;color:var(--muted)"> bb/100</span></p></div>'
      +'</div>';
  }).join('') || '<p style="font-size:12px;color:var(--muted)">No hands in this filter</p>';

  // ─── POSTFLOP TIER SCORECARD (Hardin action-correctness) ───
  (function(){
    var pf = document.getElementById('dash-postflop');
    if(!pf) return;
    var flopped = hands.filter(function(h){ return h.sawFlop && h.holeCards && h.boardFlop; });
    if(flopped.length < 20){ pf.innerHTML = '<p style="font-size:12px;color:var(--muted)">Need 20+ flops in this filter ('+flopped.length+' so far)</p>'; return; }
    var tiers = {strong:[], medium:[], draw:[], weak:[]};
    var totBB=0;
    for(var i=0;i<flopped.length;i++){
      var h=flopped[i]; var ft=pfFinalTier(h); var tier=ft[1]; if(!tiers[tier]) continue;
      var v=pfVerdict(h,tier,ft[0]); h._tier=tier; h._verdict=v[0]; h._vreason=v[1]; h._desc=ft[0];
      tiers[tier].push(h); totBB+=h.netBB;
    }
    window._pfTiers = tiers;
    var overall100 = (totBB/flopped.length*100);
    var ovCol = overall100>=0?'var(--green)':'var(--red)';
    var out = '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:10px">'
      + '<p style="margin:0;font-size:11px;color:var(--text2)">Overall postflop ('+flopped.length+' hands that saw a flop)</p>'
      + '<p style="margin:2px 0 0;font-size:16px;font-weight:700;color:'+ovCol+'">'+(overall100>=0?'+':'')+overall100.toFixed(1)+'<span style="font-size:10px;color:var(--muted);font-weight:400"> bb/100  \u00b7  '+(totBB>=0?'+':'')+totBB.toFixed(0)+' BB</span></p></div>';

    var order=[['strong','Strong value'],['medium','Medium'],['draw','Draws'],['weak','Weak']];
    for(var t=0;t<order.length;t++){
      var key=order[t][0], label=order[t][1], arr=tiers[key];
      if(!arr.length) continue;
      var okH=[], wrH=[];
      for(var a=0;a<arr.length;a++){ if(arr[a]._verdict==='OK') okH.push(arr[a]); else wrH.push(arr[a]); }
      var pct=Math.round(okH.length/arr.length*100);
      var okBB=0; for(var o=0;o<okH.length;o++) okBB+=okH[o].netBB;
      var wrBB=0; for(var w=0;w<wrH.length;w++) wrBB+=wrH[w].netBB;
      var ok100 = okH.length? okBB/okH.length*100 : 0;
      var wr100 = wrH.length? wrBB/wrH.length*100 : 0;
      var pctCol = pct>=85?'var(--green)':(pct>=70?'var(--amber)':'var(--red)');
      function bbcol(x){ return x>=0?'var(--green)':'var(--red)'; }
      out += '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:8px">'
        + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
        + '<span onclick="showTierHands(\''+key+'\')" style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text)">'+label+' <span style="color:var(--muted);font-weight:400">'+arr.length+' hands</span></span>'
        + '<span style="font-size:14px;font-weight:700;color:'+pctCol+'">'+pct+'%<span style="font-size:9px;color:var(--muted);font-weight:400"> correct</span></span>'
        + '</div>'
        + '<div style="display:flex;gap:8px">'
        + '<div onclick="showTierHands(\''+key+'\',\'ok\')" style="flex:1;cursor:pointer;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px">'
        + '<p style="margin:0;font-size:9px;color:var(--muted)">Correct play ('+okH.length+')</p>'
        + '<p style="margin:1px 0 0;font-size:13px;font-weight:700;color:'+bbcol(ok100)+'">'+(ok100>=0?'+':'')+ok100.toFixed(0)+'<span style="font-size:8px;color:var(--muted);font-weight:400"> bb/100</span></p></div>'
        + '<div onclick="showTierHands(\''+key+'\',\'wrong\')" style="flex:1;cursor:pointer;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px">'
        + '<p style="margin:0;font-size:9px;color:var(--muted)">Mistakes ('+wrH.length+')</p>'
        + '<p style="margin:1px 0 0;font-size:13px;font-weight:700;color:'+(wrH.length?bbcol(wr100):'var(--muted)')+'">'+(wrH.length?((wr100>=0?'+':'')+wr100.toFixed(0)):'\u2014')+'<span style="font-size:8px;color:var(--muted);font-weight:400"> bb/100</span></p></div>'
        + '</div></div>';
    }
    out += '<p style="font-size:10px;color:var(--muted);margin:8px 0 0;line-height:1.5">vs a TAG villain (Hardin rules). The <b>Mistakes</b> bb/100 is your fixable leak \u2014 it bleeds far faster than correct play. Correct-play losses on weak hands are mostly just the preflop money on missed flops (unavoidable). Tap any box to review those hands. Heuristic \u2014 some flags are \u201creview,\u201d not certain errors.</p>';
    pf.innerHTML = out;
  })();

  // ─── COMMITMENT LEAK (stacking off behind) ───
  (function(){
    var el = document.getElementById('dash-commit');
    if(!el) return;
    // Big committed losses that reached showdown with villain shown a beating hand
    var leaks = hands.filter(function(h){
      return h.showdown && h.netBB <= -40 && h.villainShown && h.villainShown.length;
    });
    if(!leaks.length){ el.innerHTML='<p style="font-size:12px;color:var(--muted);margin:0">No big committed losses in this filter.</p>'; return; }
    leaks.sort(function(a,b){ return a.netBB-b.netBB; });
    var totalBB=0; for(var i=0;i<leaks.length;i++) totalBB+=leaks[i].netBB;
    window._commitLeaks = leaks;
    var out = '<p style="font-size:11px;color:var(--text2);margin:0 0 8px;line-height:1.5">'
      + leaks.length + ' big pots where you committed 40+ BB and lost at showdown. <b style="color:var(--red)">' + totalBB.toFixed(0) + ' BB</b>. '
      + 'These are your most expensive leak: getting strong-but-second-best hands all-in vs a range that beats you. '
      + 'Before stacking off, ask: <i>does my hand beat their VALUE range, or just look strong?</i></p>';
    out += '<div onclick="showCommitLeaks()" style="cursor:pointer;text-align:center;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:9px;font-size:12px;font-weight:700;color:var(--text)">Review all ' + leaks.length + ' \u2192</div>';
    el.innerHTML = out;
  })();
}

// ─── UPLOAD ───────────────────────────────────────────────────
async function handleFiles(files) {
  const status = document.getElementById('upload-status');
  status.innerHTML = '<p style="color:#d4a847;font-size:13px;margin:8px 0">⏳ Parsing files...</p>';
  let added = 0;
  const existingIds = new Set(allHands.map(h=>h.id));
  // The UPLOAD is the session boundary: every file uploaded together is one session,
  // regardless of time gaps between hands. Stamp this batch with one sessionId.
  const sessionId = 'S' + Date.now();
  for (const file of files) {
    const text = await file.text();
    const parsed = parseHands(text, file.name);
    const newHands = parsed.filter(h=>!existingIds.has(h.id));
    newHands.forEach(h=>{ h.sessionId = sessionId; existingIds.add(h.id); });
    allHands = [...allHands, ...newHands];
    added += newHands.length;
  }
  bumpDataVersion();
  status.innerHTML = `<p style="color:#6db87a;font-size:13px;margin:8px 0">✓ Added ${added} new hands · Saving to GitHub...</p>`;
  const saved = await saveToGitHub(allHands);
  status.innerHTML = saved
    ? `<p style="color:#6db87a;font-size:13px;margin:8px 0">✓ ${added} hands added · Saved to GitHub successfully</p>
       <p style="color:#d4a847;font-size:12px;margin:6px 0 0">📊 Reminder: log your Fish Buffet balance in your G-Sheet — our net figures exclude rakeback (~$7 per 500 hands).</p>`
    : `<p style="color:#d4a847;font-size:13px;margin:8px 0">⚠ ${added} hands added locally but GitHub save failed — check token</p>`;
  renderStoredSessions();
  renderDashboard();
}

function buildSessions(handsArr) {
  // A session = one upload batch (hands sharing a sessionId). The upload is the
  // authoritative boundary — you decide when a session ends by uploading.
  // Historic hands (pre-sessionId) fall back to gap-based grouping as an estimate.
  const sessions = [];

  // 1) New uploads: one session per sessionId.
  const byId = {};
  handsArr.forEach(h=>{ if(h.sessionId) (byId[h.sessionId]=byId[h.sessionId]||[]).push(h); });
  Object.keys(byId).forEach(id=>{
    const sh = byId[id];
    const times = sh.filter(h=>h.date&&h.time).map(h=>new Date((h.date+' '+h.time).split('/').join('-')).getTime());
    if(!times.length) return;
    sessions.push(_sessionStats(sh, Math.min.apply(null,times), Math.max.apply(null,times)));
  });

  // 2) Legacy hands (no sessionId): gap-based grouping, 60-min gap = new sitting.
  const legacy = handsArr.filter(h=>!h.sessionId && h.filename && h.date && h.time)
    .map(h=>({h, ts:new Date((h.date+' '+h.time).split('/').join('-')).getTime()}))
    .sort((a,b)=>a.ts-b.ts);
  const GAP = 60*60000;
  let cur=null;
  legacy.forEach(({h,ts})=>{
    if(!cur || ts-cur.end>GAP){ cur={start:ts,end:ts,hands:[h]}; }
    else { cur.end=ts; cur.hands.push(h); return; }
    sessions.push(cur);
  });
  // finalize legacy clusters into stat objects
  for(let i=0;i<sessions.length;i++){
    const s=sessions[i];
    if(s && s.hands && !('netBB' in s)) sessions[i]=_sessionStats(s.hands, s.start, s.end);
  }

  sessions.sort((a,b)=>a.start-b.start);
  return sessions;
}

function _sessionStats(sh, start, end){
  const netBB = sh.reduce((s,h)=>s+h.netBB,0);
  const netUSD = sh.reduce((s,h)=>s+h.netBB*(h.stakes==='NL10'?0.10:0.25),0);
  const durMin = (end-start)/60000;
  const d = new Date(start);
  const date = d.getFullYear()+'/'+(d.getMonth()+1+'').padStart(2,'0')+'/'+(''+d.getDate()).padStart(2,'0');
  const files = Array.from(new Set(sh.map(h=>h.filename)));
  return {date, durMin, hands:sh.length, netBB, netUSD, files:files.length, start, end, fileList:files};
}

function renderStoredSessions() {
  const el = document.getElementById('stored-sessions');
  if (!allHands.length) { el.innerHTML='<p style="color:var(--muted);font-size:13px">No sessions stored</p>'; return; }
  const sessions = buildSessions(allHands).slice().reverse();
  const totalMin = sessions.reduce((s,x)=>s+x.durMin,0);
  const totalH = Math.floor(totalMin/60); const totalM = Math.round(totalMin%60);
  el.innerHTML = '<p style="font-size:12px;color:var(--muted);margin:0 0 10px">'+sessions.length+' sessions \u00b7 '+totalH+'h '+totalM+'m total \u00b7 '+allHands.length+' hands</p>' +
  sessions.map(s=>{
    const col = s.netBB>=0?'var(--green)':'var(--red)';
    const h = Math.floor(s.durMin/60); const m = Math.round(s.durMin%60);
    const durStr = h>0 ? h+'h '+m+'m' : m+'m';
    const usdStr = (s.netUSD>=0?'+':'-')+'$'+Math.abs(s.netUSD).toFixed(2);
    const bbStr = (s.netBB>=0?'+':'')+s.netBB.toFixed(1)+' BB';
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">'
      +'<div><span style="font-size:13px;color:var(--text2);font-weight:600">'+s.date+'</span>'
      +'<span style="font-size:11px;color:var(--muted);margin-left:8px">'+durStr+' \u00b7 '+s.hands+' hands \u00b7 '+s.files+' file'+(s.files>1?'s':'')+'</span></div>'
      +'<div style="text-align:right"><span style="font-size:13px;font-weight:700;color:'+col+'">'+bbStr+'</span>'
      +'<span style="font-size:11px;color:'+col+';margin-left:6px">'+usdStr+'</span></div>'
      +'</div>';
  }).join('');
}

async function clearAllData() {
  if (!confirm('Delete ALL stored hands? This cannot be undone.')) return;
  allHands = [];
  bumpDataVersion();
  await saveToGitHub([]);
  renderStoredSessions();
  renderDashboard();
  showToast('All data cleared');
}

// ─── HANDS TABLE ──────────────────────────────────────────────
function buildFlagCardHtml(flagMap, title, counts, bbMap, source){
  source = source || 'analysis';
  var keys=[]; for(var k in flagMap){ if(counts[k]) keys.push(k); }
  keys.sort(function(a,b){ return counts[b]-counts[a]; });
  if(!keys.length) return '<div class="card"><div class="card-title">'+title+'</div><p style="font-size:12px;color:var(--muted);margin:0">No flags in this filter — clean.</p></div>';
  var rows=''; var total=0; var totbb=0;
  for(var i=0;i<keys.length;i++){
    var key=keys[i]; var c=counts[key]; var bb=bbMap[key]||0; total+=c; totbb+=bb;
    var bbcol=bb>=0?'var(--green)':'var(--red)';
    var sign=bb>=0?'+':'';
    rows+='<div onclick="showViolationHands(\''+key+'\',\''+source+'\')" style="padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer">'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">'
      +'<span style="font-size:12px;font-weight:700;color:var(--text)">'+key.split('_').join(' ')+'</span>'
      +'<span style="font-size:12px;font-weight:700;white-space:nowrap"><span style="color:var(--amber)">'+c+'x</span> <span style="color:'+bbcol+'">'+sign+bb.toFixed(0)+' BB</span> <span style="color:var(--muted)">\u203a</span></span>'
      +'</div>'
      +'<p style="margin:3px 0 0;font-size:11px;color:var(--text3);line-height:1.5">'+flagMap[key]+'</p>'
      +'</div>';
  }
  var tsign=totbb>=0?'+':'';
  return '<div class="card"><div class="card-title">'+title+' <span style="font-size:10px;color:var(--muted);font-weight:400">'+total+' flags · '+tsign+totbb.toFixed(0)+' BB</span></div>'+rows+'</div>';
}
