// ====================================================================
// RENDER: ANALYSIS, POSITIONS, VIOLATION DRILL-DOWNS
// ====================================================================
function showCommitLeaks(){
  var arr = (window._commitLeaks||[]).slice();
  var rows='';
  for(var i=0;i<arr.length;i++){
    var h=arr[i];
    var vill = h.villainShown && h.villainShown.length ? h.villainShown.map(function(v){return v.cards;}).join(', ') : '';
    var board=(h.boardFlop||'')+(h.boardTurn?' '+h.boardTurn:'')+(h.boardRiver?' '+h.boardRiver:'');
    rows += '<div onclick="showHandDetail(\''+h.id+'\')" style="cursor:pointer;padding:9px 10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px">'
      + '<div style="min-width:0;flex:1">'
      + '<p style="margin:0;font-size:13px;font-weight:700;color:var(--text)">'+h.handNotation+' <span style="font-size:10px;color:var(--muted);font-weight:400">vs '+vill+'</span></p>'
      + '<p style="margin:2px 0 0;font-size:9px;color:var(--muted)">'+board+'</p>'
      + '</div>'
      + '<span style="font-size:13px;font-weight:700;color:var(--red)">'+h.netBB.toFixed(0)+'</span>'
      + '</div>';
  }
  window._modalReturn = null;
  var bodyHtml='<div style="padding:4px 0"><p style="font-size:13px;color:var(--text2);margin:0 0 10px;line-height:1.5">Each of these is a big pot you committed and lost at showdown. Tap any hand to study the line. The question to internalize: <i>before getting it in, did my hand beat their value range?</i></p>'+rows+'</div>';
  showModal('Commitment leak \u2014 '+arr.length+' hands', bodyHtml);
}

function showTierHands(tier, filter){
  var arr = (window._pfTiers && window._pfTiers[tier]) ? window._pfTiers[tier].slice() : [];
  if(filter==='ok') arr = arr.filter(function(h){ return h._verdict==='OK'; });
  else if(filter==='wrong') arr = arr.filter(function(h){ return h._verdict!=='OK'; });
  arr.sort(function(a,b){ return a.netBB-b.netBB; });
  var labels={strong:'Strong value',medium:'Medium',draw:'Draws',weak:'Weak'};
  var titleStr = labels[tier] + (filter==='ok'?' \u00b7 correct plays':(filter==='wrong'?' \u00b7 mistakes':'')) + ' (' + arr.length + ' hands)';

  // ── Synthesis header: group mistakes by pattern with the Hardin fix ──
  var synth='';
  if(filter==='wrong' && arr.length){
    var patterns={};
    for(var p=0;p<arr.length;p++){
      var rsn = arr[p]._vreason || 'other';
      if(!patterns[rsn]) patterns[rsn]={count:0, bb:0};
      patterns[rsn].count++; patterns[rsn].bb+=arr[p].netBB;
    }
    var FIX = {
      'Medium hand raised \u2014 Hardin: pot-control, do not build the pot':'FIX: With a medium hand, check and pot-control. Do not raise \u2014 you only get called by better and fold out worse.',
      'Medium called 2+ barrels vs TAG \u2014 fold to multiple bets':'FIX: When a tight player fires 2+ streets, your medium hand is beaten. Get to showdown cheap or fold \u2014 do not call multiple barrels.',
      'Medium barreled multiple streets \u2014 vs TAG only better calls':'FIX: Stop barreling medium hands vs a TAG \u2014 only better hands continue. Check for showdown value instead.',
      'Weak hand called to showdown & lost \u2014 check/fold weak hands':'FIX: Weak hands check/fold to aggression. No showdown value = no call.',
      'Called a bet/raise with a whiff \u2014 give up as aggressor':'FIX: As the aggressor with air, give up when raised/called. Do not pay off with no pair, no draw.',
      '3rd-barrel bluff into a caller \u2014 Hardin: give up, micro players call a third':'FIX: At micro, if they called two streets they call a third. Give up rather than fire a 3rd-barrel bluff.',
      'Strong value checked down \u2014 extract value (bet/raise)':'FIX: Bet your strong hands. Checking down strong value leaves money on the table.'
    };
    var pkeys = Object.keys(patterns).sort(function(a,b){ return patterns[b].count-patterns[a].count; });
    synth = '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:12px">'
      + '<p style="margin:0 0 8px;font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">Your leak patterns here</p>';
    for(var k=0;k<pkeys.length;k++){
      var rk=pkeys[k]; var pd=patterns[rk]; var fix=FIX[rk]||'';
      synth += '<div style="margin-bottom:'+(k<pkeys.length-1?'10px':'0')+';padding-bottom:'+(k<pkeys.length-1?'10px':'0')+';'+(k<pkeys.length-1?'border-bottom:1px solid var(--border)':'')+'">'
        + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">'
        + '<span style="font-size:12px;font-weight:700;color:var(--text)">'+rk+'</span>'
        + '<span style="font-size:11px;font-weight:700;color:var(--red);white-space:nowrap">'+pd.count+'x \u00b7 '+pd.bb.toFixed(0)+' BB</span>'
        + '</div>'
        + (fix?'<p style="margin:4px 0 0;font-size:11px;color:var(--green);line-height:1.5">'+fix+'</p>':'')
        + '</div>';
    }
    synth += '</div>';
  }

  var rows='';
  for(var i=0;i<arr.length;i++){
    var h=arr[i];
    var vCol = h._verdict==='OK'?'var(--green)':(h._verdict==='WRONG'?'var(--red)':'var(--amber)');
    var board=(h.boardFlop||'')+(h.boardTurn?' '+h.boardTurn:'')+(h.boardRiver?' '+h.boardRiver:'');
    rows += '<div onclick="showHandDetail(\''+h.id+'\')" style="cursor:pointer;padding:9px 10px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;gap:8px">'
      + '<div style="min-width:0;flex:1">'
      + '<p style="margin:0;font-size:13px;font-weight:700;color:var(--text)">'+h.handNotation+' <span style="font-size:10px;color:var(--muted);font-weight:400">'+(h._desc||'')+'</span></p>'
      + '<p style="margin:2px 0 0;font-size:10px;color:'+vCol+'">'+h._verdict+' \u00b7 <span style="color:var(--text3)">'+(h._vreason||'')+'</span></p>'
      + '<p style="margin:2px 0 0;font-size:9px;color:var(--muted)">'+board+'</p>'
      + '</div>'
      + '<span style="font-size:13px;font-weight:700;color:'+(h.netBB>=0?'var(--green)':'var(--red)')+'">'+(h.netBB>=0?'+':'')+h.netBB.toFixed(0)+'</span>'
      + '</div>';
  }
  if(!rows) rows='<p style="font-size:12px;color:var(--muted);padding:10px">No hands</p>';
  var bodyHtml = synth + rows;
  window._modalReturn = {tier:tier, filter:filter};
  showModal(titleStr, bodyHtml);
}

function renderMistakes() {
  const tf = getEl('mistakes-filter');
  const type = getEl('mistakes-type');
  const hands = filterHands(allHands, tf, getEl('mistakes-stakes'), 'all', 'mistakes-date');
  const mistakeHands = hands.filter(h=>h.tagIssues.length>0);
  const pfMistakes = mistakeHands.filter(h=>h.isPreflop);
  const pfMistakes2 = mistakeHands.filter(h=>h.tagIssues.some(i=>['VPIP_TRASH','LIMP_OOP','CALL_WEAK','FOLD_STRONG_LP'].includes(i)));
  const postMistakes = mistakeHands.filter(h=>h.tagIssues.some(i=>['MISSED_CBET'].includes(i)));
  document.getElementById('mistakes-summary').innerHTML = `
    <div class="stat"><p class="stat-label">Total mistakes</p><p class="stat-value red">${mistakeHands.length}</p></div>
    <div class="stat"><p class="stat-label">Preflop</p><p class="stat-value amber">${pfMistakes2.length}</p></div>
    <div class="stat"><p class="stat-label">Postflop</p><p class="stat-value amber">${postMistakes.length}</p></div>
    <div class="stat"><p class="stat-label">BB lost (mistake hands)</p><p class="stat-value red">${mistakeHands.reduce((s,h)=>s+h.netBB,0).toFixed(1)}</p></div>
  `;
  // Group by issue type
  const issueGroups = {};
  let filtered = mistakeHands;
  if (type==='preflop') filtered = filtered.filter(h=>h.isPreflop);
  if (type==='postflop') filtered = filtered.filter(h=>h.isPostflop);
  filtered.forEach(h=>h.tagIssues.forEach(i=>{
    if (!issueGroups[i]) issueGroups[i]=[];
    issueGroups[i].push(h);
  }));
  const listEl = document.getElementById('mistakes-list');
  if (!Object.keys(issueGroups).length) {
    listEl.innerHTML = '<div class="empty"><div class="empty-icon">✓</div><p>No mistakes found for this filter</p></div>';
    return;
  }
  listEl.innerHTML = Object.entries(issueGroups)
    .sort((a,b)=>b[1].length-a[1].length)
    .map(([issue, iHands])=>{
      const ex = ISSUE_EXPLAIN[issue];
      const totalBB = iHands.reduce((s,h)=>s+h.netBB,0);
      const worst = [...iHands].sort((a,b)=>a.netBB-b.netBB).slice(0,5);
      return `<div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:15px;font-weight:700;color:#e8f0e4">${ex?.label||issue}</span>
              <span class="badge ${ex?.type==='preflop'?'warn':'err'}">${ex?.type||'unknown'}</span>
            </div>
            <p style="font-size:13px;color:#8fa882;margin:0">${ex?.short||''}</p>
          </div>
          <div style="text-align:right">
            <span class="badge err" style="font-size:13px">${iHands.length}x</span>
            <p style="font-size:12px;color:#d96060;margin:4px 0 0">${totalBB.toFixed(1)} BB</p>
          </div>
        </div>
        <div style="background:#162014;border-radius:6px;padding:10px 12px;margin-bottom:10px">
          <p style="font-size:12px;color:#8fa882;margin:0;line-height:1.6">${ex?.explain||''}</p>
        </div>
        <div class="card-title" style="margin-bottom:6px">Worst hands with this issue</div>
        ${worst.map(h=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #1a2218">
            <div style="display:flex;gap:10px;align-items:center">
              <span class="badge info">${h.position}</span>
              <span style="font-size:13px;font-weight:600;color:#e8f0e4">${h.holeCards}</span>
              <span style="font-size:12px;color:#6b7d62">${h.handCat}</span>
              <span style="font-size:12px;color:#6b7d62">${h.date.slice(5)}</span>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span style="font-size:13px;font-weight:600;color:${h.netBB>=0?'#6db87a':'#d96060'}">${h.netBB>=0?'+':''}${h.netBB.toFixed(1)} BB</span>
              <button class="btn small" onclick="showHandDetail('${h.id}')">Review</button>
            </div>
          </div>`).join('')}
      </div>`;
    }).join('');
}

// ─── STARTING HANDS ──────────────────────────────────────────
function renderAnalysis() {
  const tf = getEl('analysis-filter');
  const hands = filterHands(allHands, tf, getEl('analysis-stakes'), 'all', 'analysis-date');
  const el = document.getElementById('analysis-body');
  if (!hands.length) { el.innerHTML='<div class="empty"><div class="empty-icon">📊</div><p>No data yet</p></div>'; return; }

  const net = hands.reduce((s,h)=>s+h.netBB,0);
  const bb100 = net/hands.length*100;
  const played = hands.filter(h=>h.vpip);
  const pfr = hands.filter(h=>h.pfr);

  // Position data
  const positions = ['BTN','CO','HJ','UTG','SB','BB'];
  const posData = positions.map(p=>{
    const ph=hands.filter(h=>h.position===p);
    if(!ph.length) return null;
    const pnet=ph.reduce((s,h)=>s+h.netBB,0);
    return {p,n:ph.length,net:pnet,bb100:pnet/ph.length*100,
            vpip:ph.filter(h=>h.vpip).length/ph.length*100,
            issues:ph.filter(h=>h.tagIssues.length).length};
  }).filter(Boolean);

  // Blind analysis
  const sb=hands.filter(h=>h.position==='SB');
  const sbCall=sb.filter(h=>h.pfAction==='CALL');
  const sbRaise=sb.filter(h=>h.pfAction==='RAISE');
  const sbFold=sb.filter(h=>h.pfAction==='FOLD');
  const bb=hands.filter(h=>h.position==='BB');

  // C-bet
  const cbetOpp=hands.filter(h=>h.cbetOpp);
  const cbetMade=hands.filter(h=>h.cbetMade);
  const cbetMissed=hands.filter(h=>h.cbetOpp&&!h.cbetMade);
  const cbetPct=cbetOpp.length?Math.round(cbetMade.length/cbetOpp.length*100):0;

  // Non-blind net
  const epHands=hands.filter(h=>h.position==='UTG');
  const mpHands=hands.filter(h=>h.position==='HJ');
  const lpHands=hands.filter(h=>['CO','BTN'].includes(h.position));
  const nonBlind=hands.filter(h=>!['SB','BB'].includes(h.position));
  const nonBlindNet=lpHands.reduce((s,h)=>s+h.netBB,0);
  const blindNet=hands.filter(h=>['SB','BB'].includes(h.position)).reduce((s,h)=>s+h.netBB,0);
  const epNet=epHands.reduce((s,h)=>s+h.netBB,0);
  const mpNet=mpHands.reduce((s,h)=>s+h.netBB,0);

  // Issues summary (count + net BB per flag)
  const issueCounts={};
  const issueBB={};
  hands.forEach(h=>h.tagIssues.forEach(i=>{issueCounts[i]=(issueCounts[i]||0)+1; issueBB[i]=(issueBB[i]||0)+h.netBB;}));
  const preflopCard=buildFlagCardHtml(pfFlagMeaning(),'Preflop violations',issueCounts,issueBB,'analysis');
  const postflopCard=buildFlagCardHtml(postfFlagMeaning(),'Postflop mistakes',issueCounts,issueBB,'analysis');

  const colNet = net>=0?'var(--green)':'var(--red)';
  const colBB100 = bb100>=0?'var(--green)':'var(--red)';

  el.innerHTML = `
  <div class="card">
    <div class="card-title">Overall performance</div>
    <div class="stat-grid">
      <div class="stat"><p class="stat-label">Total hands</p><p class="stat-value blue">${hands.length}</p></div>
      <div class="stat"><p class="stat-label">Net BB</p><p class="stat-value" style="color:${colNet}">${net>=0?'+':''}${net.toFixed(1)}</p></div>
      <div class="stat"><p class="stat-label">BB / 100</p><p class="stat-value" style="color:${colBB100}">${bb100>=0?'+':''}${bb100.toFixed(2)}</p></div>
      <div class="stat"><p class="stat-label">VPIP / PFR</p><p class="stat-value amber" style="font-size:15px">${(played.length/hands.length*100).toFixed(1)}% / ${(pfr.length/hands.length*100).toFixed(1)}%</p></div>
    </div>
    <div style="background:var(--bg3);border-radius:8px;padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div>
        <p class="stat-label" style="margin:0 0 2px">EP · UTG</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:${epNet>=0?'var(--green)':'var(--red)'}">${epNet>=0?'+':''}${epNet.toFixed(1)} BB</p>
      </div>
      <div>
        <p class="stat-label" style="margin:0 0 2px">MP · HJ</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:${mpNet>=0?'var(--green)':'var(--red)'}">${mpNet>=0?'+':''}${mpNet.toFixed(1)} BB</p>
      </div>
      <div>
        <p class="stat-label" style="margin:0 0 2px">LP · CO + BTN</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:${nonBlindNet>=0?'var(--green)':'var(--red)'}">${nonBlindNet>=0?'+':''}${nonBlindNet.toFixed(1)} BB</p>
      </div>
      <div>
        <p class="stat-label" style="margin:0 0 2px">Blinds · SB + BB</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:${blindNet>=0?'var(--green)':'var(--red)'}">${blindNet>=0?'+':''}${blindNet.toFixed(1)} BB</p>
      </div>
    </div>
  </div>

  ${preflopCard}
  ${postflopCard}

  <div class="card">
    <div class="card-title">Position breakdown</div>
    ${posData.map(d=>{
      const col=d.bb100>=0?'var(--green)':d.bb100<-50?'var(--red)':'var(--amber)';
      const isBlind=['SB','BB'].includes(d.p);
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge ${d.p==='UTG'?'warn':['CO','BTN'].includes(d.p)?'ok':['SB','BB'].includes(d.p)?'err':'info'}" style="width:36px;text-align:center">${d.p}</span>
          <span style="font-size:12px;color:var(--muted)">${({'UTG':'EP','HJ':'MP','CO':'LP','BTN':'LP','SB':'Blind','BB':'Blind'}[d.p]||'')} · ${d.n} hands · VPIP ${d.vpip.toFixed(0)}%</span>
        </div>
        <div style="text-align:right">
          <span style="font-size:14px;font-weight:700;color:${col}">${d.bb100>=0?'+':''}${d.bb100.toFixed(1)}</span>
          <span style="font-size:10px;color:var(--muted)"> bb/100</span>
        </div>
      </div>`;
    }).join('')}
  </div>

  <div class="card">
    <div class="card-title">🚨 Priority leak — SB calling</div>
    <div style="background:#3d1e1e;border-radius:8px;padding:10px 12px;margin-bottom:10px">
      <p style="font-size:13px;color:var(--red);font-weight:700;margin:0 0 4px">SB Call: ${(sbCall.reduce((s,h)=>s+h.netBB,0)/Math.max(sbCall.length,1)*100).toFixed(0)} bb/100 on ${sbCall.length} hands</p>
      <p style="font-size:12px;color:var(--text3);margin:0">Hardin's rule: SB is raise or fold. Never call. Calling puts you OOP with a capped range for every street.</p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
      ${[['RAISE',sbRaise],['CALL',sbCall],['FOLD',sbFold]].map(([act,ah])=>{
        const n=ah.reduce((s,h)=>s+h.netBB,0);
        const col=act==='RAISE'?'var(--green)':act==='CALL'?'var(--red)':'var(--muted)';
        return `<div class="stat"><p class="stat-label">SB ${act}</p><p class="stat-value" style="color:${col};font-size:13px">${ah.length} hands</p><p style="font-size:11px;color:${col};margin:2px 0 0;font-weight:600">${n>=0?'+':''}${n.toFixed(1)} BB</p></div>`;
      }).join('')}
    </div>
  </div>

  <div class="card">
    <div class="card-title">C-bet frequency</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
      <div style="flex:1;background:var(--bg3);border-radius:8px;height:8px;overflow:hidden">
        <div style="height:100%;width:${cbetPct}%;background:${cbetPct>=60?'var(--green)':cbetPct>=40?'var(--amber)':'var(--red)'};border-radius:8px;transition:width .5s"></div>
      </div>
      <span style="font-size:18px;font-weight:800;color:${cbetPct>=60?'var(--green)':cbetPct>=40?'var(--amber)':'var(--red)'}">${cbetPct}%</span>
    </div>
    <p style="font-size:12px;color:var(--muted);margin:0 0 10px">Target: 60–70% · You: ${cbetPct}% (${cbetMade.length}/${cbetOpp.length} opportunities)</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="stat"><p class="stat-label">C-bet made</p><p class="stat-value green" style="font-size:14px">${cbetMade.reduce((s,h)=>s+h.netBB,0)>=0?'+':''}${cbetMade.reduce((s,h)=>s+h.netBB,0).toFixed(1)} BB</p></div>
      <div class="stat"><p class="stat-label">C-bet missed</p><p class="stat-value red" style="font-size:14px">${cbetMissed.reduce((s,h)=>s+h.netBB,0).toFixed(1)} BB</p></div>
    </div>
    ${cbetPct<60?`<div style="background:#3d2e0a;border-radius:8px;padding:10px 12px;margin-top:10px"><p style="font-size:12px;color:var(--amber);margin:0">When you raise preflop and see the flop, fire a c-bet ~65% of the time regardless of whether you hit. Your opponents miss the flop 2/3 of the time — they'll fold to pressure.</p></div>`:''}
  </div>

  <div class="card">
    <div class="card-title">TAG violations summary</div>
    ${Object.entries(issueCounts).sort((a,b)=>b[1]-a[1]).map(([issue,count])=>{
      const ex=ISSUE_EXPLAIN[issue];
      const aff=hands.filter(h=>h.tagIssues.includes(issue));
      const affNet=aff.reduce((s,h)=>s+h.netBB,0);
      const affNetCol = affNet>=0 ? 'var(--green)' : 'var(--red)';
      return `<div onclick="showViolationHands('${issue}')" style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px">
          <div>
            <p style="font-size:13px;color:var(--text2);margin:0;font-weight:500">${ex?.label||issue}</p>
            <p style="font-size:11px;color:var(--muted);margin:1px 0 0">${ex?.type||''}</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="text-align:right">
            <span class="badge err">${count}x</span>
            <p style="font-size:11px;color:${affNetCol};margin:2px 0 0">${affNet>=0?'+':''}${affNet.toFixed(1)} BB</p>
          </div>
          <span style="color:var(--muted);font-size:18px">›</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
// ─── HAND COMBO GRID ─────────────────────────────────────────
// ─── HAND COMBO GRID ─────────────────────────────────────────
function renderPositions() {
  var tf = getEl('pos-filter');
  var hands = filterHands(allHands, tf, getEl('pos-stakes'), 'all', 'pos-date');
  var dimKey = getEl('split-dim'); if(dimKey==='all'||!dimKey) dimKey='position';
  var grid = document.getElementById('pos-detail-grid');
  grid.style.display='flex';grid.style.flexDirection='column';grid.style.gap='12px';

  // Non-position dimensions: generic split-engine view (stake/format/hour/weekday)
  if (dimKey !== 'position') {
    var rows = splitBy(hands, dimKey);
    var dimLabel = splitDimension(dimKey).label;
    if (!rows.length) { grid.innerHTML='<div class="card"><p style="color:#6b7d62;font-size:13px;margin:0">No hands</p></div>'; return; }
    var metricsToShow = ['netbb','bb100','vpip','pfr','flagrate'];
    grid.innerHTML =
      '<div class="card"><div class="card-title">Split by '+dimLabel+' <span style="font-size:10px;color:var(--muted);font-weight:400">'+rows.length+' groups · '+hands.length+' hands</span></div>'
      + '<p style="font-size:11px;color:var(--text3);margin:0 0 4px;line-height:1.5">Tap a row to see its hands. Small groups are noisy — read bb/100 with the hand count in mind.</p></div>'
      + rows.map(function(r){
          var net=r.metrics.netbb, col=net>=0?'var(--green)':'var(--red)';
          var statCells = metricsToShow.map(function(mk){
            var m=splitMetric(mk); var v=r.metrics[mk]; var g=m.good?m.good(v):null;
            var c = g===null?'var(--text)':(g?'var(--green)':'var(--red)');
            return '<div class="stat"><p class="stat-label">'+m.label+'</p><p class="stat-value" style="font-size:15px;color:'+c+'">'+m.fmt(v)+'</p></div>';
          }).join('');
          return '<div class="card split-row" data-bucket="'+r.bucket+'" data-dim="'+dimKey+'" style="cursor:pointer">'
            +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
            +'<div class="card-title" style="margin:0">'+r.bucket+'</div>'
            +'<span style="font-size:13px;color:var(--muted)">'+r.metrics.hands+' hands <span style="font-size:16px">›</span></span></div>'
            +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+statCells+'</div>'
            +'</div>';
        }).join('');
    document.querySelectorAll('.split-row').forEach(function(el){
      el.addEventListener('click',function(){ showSplitHands(el.dataset.dim, el.dataset.bucket); });
    });
    return;
  }

  // Position dimension: keep the existing rich per-position view with issue breakdown + drill-down
  var positions = ['BTN','CO','HJ','UTG','SB','BB'];
  var ILABELS = {VPIP_TRASH:'VPIP Trash',LIMP_OOP:'Limp OOP',LIMP:'Limp',CALL_WEAK:'Weak Call',CALL_4BET:'Call 4-bet',CALL_3BET:'Call 3-bet (out of range)',MISSED_CBET:'Missed C-bet',FOLD_STRONG_LP:'Fold Strong'};
  grid.innerHTML = positions.map(function(pos) {
    var ph = hands.filter(function(h){return h.position===pos;});
    if (!ph.length) return '<div class="card"><div class="card-title">'+pos+'</div><p style="color:#6b7d62;font-size:13px;margin:0">No hands</p></div>';
    var net=ph.reduce(function(s,h){return s+h.netBB;},0);
    var vpip=ph.filter(function(h){return h.vpip;}).length;
    var pfr=ph.filter(function(h){return h.pfr;}).length;
    var mistakes=ph.filter(function(h){return h.tagIssues.length>0;}).length;
    var bb100=net/ph.length*100;
    var col=net>=0?'var(--green)':'var(--red)';
    var posIssues={};
    ph.forEach(function(h){h.tagIssues.forEach(function(iss){
      if(!posIssues[iss])posIssues[iss]={count:0,net:0};
      posIssues[iss].count++;posIssues[iss].net+=h.netBB;
    });});
    var issueHtml=Object.keys(posIssues).sort(function(a,b){return posIssues[b].count-posIssues[a].count;}).map(function(iss){
      var d=posIssues[iss];var nc=d.net>=0?'var(--green)':'var(--red)';var lbl=ILABELS[iss]||iss;
      return '<div class="pos-issue-row" data-pos="'+pos+'" data-issue="'+iss+'" style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--bg3);border-radius:7px;margin-bottom:5px;cursor:pointer;border:1px solid var(--border)">'
        +'<span style="font-size:12px;color:var(--text)">'+lbl+'</span>'
        +'<div style="display:flex;gap:8px;align-items:center">'
        +'<span style="font-size:11px;font-weight:700;background:var(--red);color:#fff;border-radius:4px;padding:2px 6px">'+d.count+'x</span>'
        +'<span style="font-size:12px;font-weight:700;color:'+nc+'">'+(d.net>=0?'+':'')+d.net.toFixed(1)+' BB</span>'
        +'<span style="color:var(--muted);font-size:14px">›</span>'
        +'</div></div>';
    }).join('');
    return '<div class="card pos-card" data-pos="'+pos+'" style="cursor:pointer">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      +'<div class="card-title" style="margin:0">'+pos+'</div>'
      +'<span style="font-size:18px;font-weight:700;color:'+col+'">'+(net>=0?'+':'')+net.toFixed(1)+' BB</span>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
      +'<div class="stat"><p class="stat-label">Hands</p><p class="stat-value blue" style="font-size:16px">'+ph.length+'</p></div>'
      +'<div class="stat"><p class="stat-label">BB/100</p><p class="stat-value '+(bb100>=0?'green':'red')+'" style="font-size:16px">'+bb100.toFixed(1)+'</p></div>'
      +'<div class="stat"><p class="stat-label">VPIP</p><p class="stat-value amber" style="font-size:16px">'+Math.round(vpip/ph.length*100)+'%</p></div>'
      +'<div class="stat"><p class="stat-label">TAG issues</p><p class="stat-value '+(mistakes?'red':'')+'" style="font-size:16px">'+mistakes+'</p></div>'
      +'</div>'
      +'<div class="progress-bar"><div class="progress-fill" style="width:'+Math.min(100,Math.round(pfr/ph.length*100))+'%;background:'+col+'"></div></div>'
      +'<p style="font-size:11px;color:#6b7d62;margin:4px 0 0">PFR: '+Math.round(pfr/ph.length*100)+'%</p>'
      +(issueHtml?'<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">'+issueHtml+'</div>':'')
      +'</div>';
  }).join('');
  document.querySelectorAll('.pos-card').forEach(function(el){
    el.addEventListener('click',function(){showPositionHands(el.dataset.pos);});
  });
  document.querySelectorAll('.pos-issue-row').forEach(function(el){
    el.addEventListener('click',function(e){e.stopPropagation();showPositionIssueHands(el.dataset.pos,el.dataset.issue);});
  });
}

function posHandRow(h) {
  var hc=h.netBB>=0?'var(--green)':'var(--red)';
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">'
    +'<div style="display:flex;gap:8px;align-items:center">'+formatCards(h.holeCards)
    +'<span style="font-size:11px;color:var(--muted)">'+h.date.slice(5)+'</span></div>'
    +'<div style="display:flex;gap:8px;align-items:center">'
    +'<span style="font-size:13px;font-weight:700;color:'+hc+'">'+(h.netBB>=0?'+':'')+h.netBB.toFixed(1)+' BB</span>'
    +'<button class="rev-btn" data-id="'+h.id+'" style="font-size:11px;padding:3px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:5px;color:var(--text);cursor:pointer">Review</button>'
    +'</div></div>';
}

function showPositionHands(pos) {
  var tf=getEl('pos-filter');var st=getEl('pos-stakes');
  var hands=filterHands(allHands,tf,st,'all','pos-date').filter(function(h){return h.position===pos;});
  hands.sort(function(a,b){return a.netBB-b.netBB;});
  var net=hands.reduce(function(s,h){return s+h.netBB;},0);
  var nc=net>=0?'var(--green)':'var(--red)';
  showModal(pos+' — '+hands.length+' hands',
    '<div style="display:flex;justify-content:space-between;margin-bottom:12px">'
    +'<span style="font-size:13px;color:var(--muted)">'+hands.length+' hands</span>'
    +'<span style="font-size:14px;font-weight:700;color:'+nc+'">'+(net>=0?'+':'')+net.toFixed(1)+' BB</span></div>'
    +hands.map(posHandRow).join(''));
  wireRevBtns();
}

// Drill-down for a split-engine group (stake/format/hour/weekday bucket)
function showSplitHands(dimKey, bucket) {
  var tf=getEl('pos-filter');var st=getEl('pos-stakes');
  var dim=splitDimension(dimKey);
  var hands=filterHands(allHands,tf,st,'all','pos-date').filter(function(h){return dim.of(h)===bucket;});
  hands.sort(function(a,b){return a.netBB-b.netBB;});
  var net=hands.reduce(function(s,h){return s+h.netBB;},0);
  var nc=net>=0?'var(--green)':'var(--red)';
  showModal(dim.label+': '+bucket+' — '+hands.length+' hands',
    '<div style="display:flex;justify-content:space-between;margin-bottom:12px">'
    +'<span style="font-size:13px;color:var(--muted)">'+hands.length+' hands</span>'
    +'<span style="font-size:14px;font-weight:700;color:'+nc+'">'+(net>=0?'+':'')+net.toFixed(1)+' BB</span></div>'
    +hands.map(posHandRow).join(''));
  wireRevBtns();
}

function showPositionIssueHands(pos, issue) {
  var tf=getEl('pos-filter');var st=getEl('pos-stakes');
  var hands=filterHands(allHands,tf,st,'all','pos-date')
    .filter(function(h){return h.position===pos&&h.tagIssues.indexOf(issue)>=0;});
  hands.sort(function(a,b){return a.netBB-b.netBB;});
  var ILABELS={VPIP_TRASH:'VPIP Trash',LIMP_OOP:'Limp OOP',LIMP:'Limp',CALL_WEAK:'Weak Call',CALL_4BET:'Call 4-bet',CALL_3BET:'Call 3-bet (out of range)',MISSED_CBET:'Missed C-bet',FOLD_STRONG_LP:'Fold Strong'};
  var IEXPLAIN={
    VPIP_TRASH:'Played a hand outside Hardin opening range. Over a large sample these lose money even when variance makes them positive short-term.',
    LIMP_OOP:'Called from SB without raising. SB is raise or fold — limping caps your range and plays OOP every street.',
    CALL_4BET:'Called a 4-bet with a hand outside the continue range (QQ+/AKs almost exclusively). Hardin: once you 3-bet and face a 4-bet, fold anything outside AA/KK/QQ/AKs.',CALL_3BET:'Called a 3-bet (villain re-raised your open) with a hand outside your continue range. Hardin: vs a 3-bet your range is tight — AA/KK/QQ/AKs from early positions, a few more from BTN/SB. Everything else is fold (or 4-bet bluff). Flatting in-between hands OOP is a common micro-stakes leak.',
    MISSED_CBET:'Had the opportunity to c-bet as PFR but checked. Hardin target: 60-70% c-bet frequency.',
    FOLD_STRONG_LP:'Folded a hand Hardin says must raise from this position.',
    LIMP:'Limped with a hand in range instead of raising.',
    CALL_WEAK:'Called a raise with a hand outside opening range.'
  };
  var net=hands.reduce(function(s,h){return s+h.netBB;},0);
  var winners=hands.filter(function(h){return h.netBB>0;});
  var losers=hands.filter(function(h){return h.netBB<0;});
  var nc=net>=0?'var(--green)':'var(--red)';
  showModal(pos+' · '+(ILABELS[issue]||issue)+' — '+hands.length+'x',
    '<div style="background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:12px">'
    +'<p style="font-size:12px;color:var(--text3);margin:0;line-height:1.6">'+(IEXPLAIN[issue]||'')+'</p></div>'
    +'<div style="display:flex;gap:8px;margin-bottom:10px">'
    +'<div style="flex:1;background:var(--bg3);border-radius:8px;padding:8px;text-align:center"><p style="font-size:10px;color:var(--muted);margin:0 0 2px;text-transform:uppercase">Net</p><p style="font-size:15px;font-weight:700;margin:0;color:'+nc+'">'+(net>=0?'+':'')+net.toFixed(1)+'</p></div>'
    +'<div style="flex:1;background:var(--bg3);border-radius:8px;padding:8px;text-align:center"><p style="font-size:10px;color:var(--muted);margin:0 0 2px;text-transform:uppercase">Won ('+winners.length+')</p><p style="font-size:15px;font-weight:700;margin:0;color:var(--green)">+'+winners.reduce(function(s,h){return s+h.netBB;},0).toFixed(1)+'</p></div>'
    +'<div style="flex:1;background:var(--bg3);border-radius:8px;padding:8px;text-align:center"><p style="font-size:10px;color:var(--muted);margin:0 0 2px;text-transform:uppercase">Lost ('+losers.length+')</p><p style="font-size:15px;font-weight:700;margin:0;color:var(--red)">'+losers.reduce(function(s,h){return s+h.netBB;},0).toFixed(1)+'</p></div>'
    +'</div>'+hands.map(posHandRow).join(''));
  wireRevBtns();
}

function showViolationHands(issue, source) {
  source = source || 'analysis';
  var fm = source==='dash' ? ['dash-filter','dash-stakes','dash-date'] : ['analysis-filter','analysis-stakes','analysis-date'];
  var tf = getEl(fm[0]);
  var hands = filterHands(allHands, tf, getEl(fm[1]), 'all', fm[2])
    .filter(function(h){ return h.tagIssues.indexOf(issue) !== -1; });
  if (!hands.length) { showToast('No hands'); return; }
  window._modalReturn = {kind:'violation', issue:issue, source:source};
  var ex = ISSUE_EXPLAIN[issue] || {};
  var net = hands.reduce(function(s,h){return s+h.netBB;},0);
  var bbCol = net>=0?'var(--green)':'var(--red)';
  var winners = hands.filter(function(h){return h.netBB>0;});
  var losers = hands.filter(function(h){return h.netBB<0;});
  var wonBB = winners.reduce(function(s,h){return s+h.netBB;},0);
  var lostBB = losers.reduce(function(s,h){return s+h.netBB;},0);

  hands.sort(function(a,b){return a.netBB-b.netBB;});

  var netNote = net>=0
    ? 'Net positive this sample — variance bailed you out. The flag still stands: by Hardin TAG rules these are -EV long-term.'
    : 'Net negative — these cost you money this sample.';

  var body = '<div style="background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:12px">'
    + '<p style="font-size:13px;color:var(--text);font-weight:700;margin:0 0 4px">' + (ex.better? '\u2192 '+ex.better : '') + '</p>'
    + '<p style="font-size:12px;color:var(--text3);margin:0;line-height:1.6">' + (ex.explain||'') + '</p>'
    + '</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:10px">'
    + '<div style="flex:1;background:var(--bg3);border-radius:8px;padding:8px 10px;text-align:center">'
    + '<p style="font-size:10px;color:var(--muted);margin:0 0 2px;text-transform:uppercase">Net</p>'
    + '<p style="font-size:15px;font-weight:700;margin:0;color:' + bbCol + '">' + (net>=0?'+':'') + net.toFixed(1) + '</p></div>'
    + '<div style="flex:1;background:var(--bg3);border-radius:8px;padding:8px 10px;text-align:center">'
    + '<p style="font-size:10px;color:var(--muted);margin:0 0 2px;text-transform:uppercase">Won (' + winners.length + ')</p>'
    + '<p style="font-size:15px;font-weight:700;margin:0;color:var(--green)">+' + wonBB.toFixed(1) + '</p></div>'
    + '<div style="flex:1;background:var(--bg3);border-radius:8px;padding:8px 10px;text-align:center">'
    + '<p style="font-size:10px;color:var(--muted);margin:0 0 2px;text-transform:uppercase">Lost (' + losers.length + ')</p>'
    + '<p style="font-size:15px;font-weight:700;margin:0;color:var(--red)">' + lostBB.toFixed(1) + '</p></div>'
    + '</div>'
    + '<p style="font-size:11px;color:var(--text3);margin:0 0 12px;line-height:1.5;font-style:italic">' + netNote + '</p>';

  for (var i=0;i<hands.length;i++){
    var h = hands[i];
    var c = h.netBB>=0?'var(--green)':'var(--red)';
    body += '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;gap:6px;align-items:center">'
      + '<span style="font-size:14px;font-weight:700;color:var(--text)">' + formatCards(h.holeCards) + '</span>'
      + '<span class="badge info">' + h.position + '</span>'
      + '<span style="font-size:11px;color:var(--muted)">' + h.date.slice(5) + '</span>'
      + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<span style="font-size:13px;font-weight:700;color:' + c + '">' + (h.netBB>=0?'+':'') + h.netBB.toFixed(1) + ' BB</span>'
      + '<button onclick="showHandDetail(\'' + h.id + '\')" style="font-size:11px;background:var(--bg3);border:1px solid var(--border2);color:var(--text2);padding:3px 8px;border-radius:6px;cursor:pointer">Review</button>'
      + '</div>'
      + '</div>';
  }

  document.getElementById('modal-title').textContent = (ex.label||issue) + ' — ' + hands.length + ' hands';
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal').style.display = 'flex';
}

