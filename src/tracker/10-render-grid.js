// ====================================================================
// RENDER: GRID & STARTING-HAND CHARTS
// ====================================================================
function renderStartingHands() {
  const tf = getEl('starting-filter');
  const sort = getEl('starting-sort');
  const catFilter = getEl('starting-cat');
  const hands = filterHands(allHands, tf, getEl('starting-stakes'), 'all', 'starting-date');

  // Group by hand notation
  const groups = {};
  hands.forEach(h=>{
    if (!h.handNotation) return;
    if (!groups[h.handNotation]) groups[h.handNotation]={
      notation:h.handNotation, cat:h.handCat, quality:h.tagQuality,
      hands:[], netBB:0, mistakes:0, correct:0
    };
    groups[h.handNotation].hands.push(h);
    groups[h.handNotation].netBB += h.netBB;
    if (h.tagIssues.length) groups[h.handNotation].mistakes++;
    else groups[h.handNotation].correct++;
  });

  let rows = Object.values(groups);
  if (catFilter!=='all') rows = rows.filter(r=>r.cat===catFilter);

  // Sort
  if (sort==='hands') rows.sort((a,b)=>b.hands.length-a.hands.length);
  else if (sort==='bb100') rows.sort((a,b)=>(b.netBB/b.hands.length)-(a.netBB/a.hands.length));
  else if (sort==='worst') rows.sort((a,b)=>(a.netBB/a.hands.length)-(b.netBB/b.hands.length));
  else if (sort==='netloss') rows.sort((a,b)=>a.netBB-b.netBB);

  // Summary stats
  const totalPlayed = Object.values(groups).reduce((s,g)=>s+g.hands.filter(h=>h.vpip).length,0);
  const bestHand = rows.filter(r=>r.hands.length>=3).sort((a,b)=>(b.netBB/b.hands.length)-(a.netBB/a.hands.length))[0];
  const worstHand = rows.filter(r=>r.hands.length>=3).sort((a,b)=>(a.netBB/a.hands.length)-(b.netBB/b.hands.length))[0];
  document.getElementById('starting-summary').innerHTML = `
    <div class="stat"><p class="stat-label">Hand types seen</p><p class="stat-value blue">${rows.length}</p></div>
    <div class="stat"><p class="stat-label">Hands played</p><p class="stat-value amber">${totalPlayed}</p></div>
    <div class="stat"><p class="stat-label">Best hand (3+ dealt)</p><p class="stat-value green" style="font-size:15px">${bestHand?bestHand.notation:'—'}</p></div>
    <div class="stat"><p class="stat-label">Worst hand (3+ dealt)</p><p class="stat-value red" style="font-size:15px">${worstHand?worstHand.notation:'—'}</p></div>
  `;

  const el = document.getElementById('starting-list');
  if (!rows.length) {
    el.innerHTML='<div class="empty"><div class="empty-icon">🃏</div><p>No hand data yet — upload sessions first</p></div>';
    return;
  }

  el.innerHTML = rows.map(g=>{
    const n = g.hands.length;
    const bb100 = n ? g.netBB/n*100 : 0;
    const bbCol = g.netBB>=0?'var(--green)':g.netBB<-5?'var(--red)':'var(--amber)';
    const b100Col = bb100>=0?'var(--green)':bb100<-50?'var(--red)':'var(--amber)';
    const qualBadge = g.quality==='A-Range'?'ok':g.quality==='B-Range'?'warn':'err';
    const hardinRule = HARDIN_ACTION[g.notation];
    const sampleWarn = n < 5 ? '<span class="badge warn" style="font-size:10px">small sample</span>' : '';

    // Check if any hands had position/action deviation
    const deviations = g.hands.filter(hh=>{
      if (!hh.vpip && !hh.pfr) return false;
      const v = getHardinVerdict(g.notation, hh.position, hh.pfAction);
      return ['should-raise','should-raise-not-call','too-loose'].includes(v.verdict);
    });

    return `<div class="hand-card" onclick="showStartingDetail('${g.notation}')">
      <div class="hand-card-top">
        <div>
          <span style="font-size:19px;font-weight:800;color:var(--text)">${g.notation}</span>
          <span style="font-size:11px;color:var(--muted);margin-left:8px">${g.cat}</span>
        </div>
        <div style="text-align:right">
          <div style="font-size:17px;font-weight:700;color:${bbCol}">${g.netBB>=0?'+':''}${g.netBB.toFixed(1)} BB</div>
          <div style="font-size:11px;color:${b100Col};font-weight:600">${bb100>=0?'+':''}${bb100.toFixed(0)}/100</div>
        </div>
      </div>
      <div class="hand-card-mid">
        <span class="badge ${qualBadge}">${g.quality}</span>
        <span class="badge muted">${n} dealt</span>
        ${deviations.length?`<span class="badge err">${deviations.length} deviation${deviations.length>1?'s':''}</span>`:''}
        ${sampleWarn}
      </div>
      <div class="hand-card-bot">
        <span class="hand-meta">${hardinRule?'Hardin: '+hardinRule.rfi:'Outside primary ranges'}</span>
        <span class="hand-meta">${g.mistakes} mistake${g.mistakes!==1?'s':''}</span>
      </div>
    </div>`;
  }).join('');
}

function showStartingDetail(notation) {
  const tf = document.getElementById('starting-filter').value;
  const hands = filterByTime(allHands, tf).filter(h=>h.handNotation===notation);
  if (!hands.length) return;
  const netBB = hands.reduce((s,h)=>s+h.netBB,0);
  const n = hands.length;
  const bb100 = netBB/n*100;
  const rule = HARDIN_ACTION[notation];
  const bbCol = netBB>=0?'var(--green)':'var(--red)';

  // Per-position breakdown
  const positions = ['BTN','CO','HJ','UTG','SB','BB'];
  const posBreakdown = positions.map(p=>{
    const ph = hands.filter(h=>h.position===p);
    if (!ph.length) return null;
    const pNet = ph.reduce((s,h)=>s+h.netBB,0);
    return {p, count:ph.length, net:pNet, bb100:pNet/ph.length*100};
  }).filter(Boolean);

  // Deviations
  const deviations = hands.map(hh=>{
    const v = getHardinVerdict(notation, hh.position, hh.pfAction);
    return {...hh, verdict:v};
  }).filter(hh=>['should-raise','should-raise-not-call','too-loose'].includes(hh.verdict.verdict));

  document.getElementById('modal-title').textContent = `${notation} analysis`;
  let body = `
    <div class="stat-grid" style="margin-bottom:14px">
      <div class="stat"><p class="stat-label">Dealt</p><p class="stat-value blue">${n}</p></div>
      <div class="stat"><p class="stat-label">Net BB</p><p class="stat-value" style="color:${bbCol}">${netBB>=0?'+':''}${netBB.toFixed(1)}</p></div>
      <div class="stat"><p class="stat-label">BB/100</p><p class="stat-value" style="color:${bbCol}">${bb100>=0?'+':''}${bb100.toFixed(0)}</p></div>
      <div class="stat"><p class="stat-label">Mistakes</p><p class="stat-value ${hands.filter(h=>h.tagIssues.length).length?'red':''}">${hands.filter(h=>h.tagIssues.length).length}</p></div>
    </div>`;

  if (rule) {
    body += `<div style="background:var(--bg3);border-radius:10px;padding:12px 14px;margin-bottom:14px">
      <p style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 6px">Hardin framework</p>
      <p style="font-size:13px;color:var(--green2);margin:0 0 4px;font-weight:600">Raise from: ${rule.rfi}</p>
      <p style="font-size:13px;color:var(--text3);margin:0;line-height:1.6">${rule.note}</p>
    </div>`;
  } else {
    body += `<div style="background:#3d1e1e;border-radius:10px;padding:12px 14px;margin-bottom:14px">
      <p style="font-size:13px;color:var(--red);margin:0;font-weight:600">Outside Hardin primary ranges</p>
      <p style="font-size:12px;color:var(--text3);margin:4px 0 0">Playing this hand is likely a VPIP leak unless from BB defense.</p>
    </div>`;
  }

  if (posBreakdown.length) {
    body += `<p style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">By position</p>`;
    body += posBreakdown.map(p=>{
      const col = p.net>=0?'var(--green)':'var(--red)';
      return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge info">${p.p}</span>
          <span style="font-size:12px;color:var(--muted)">${p.count} hand${p.count>1?'s':''}</span>
        </div>
        <div style="text-align:right">
          <span style="font-size:13px;font-weight:700;color:${col}">${p.net>=0?'+':''}${p.net.toFixed(1)} BB</span>
          <span style="font-size:11px;color:var(--muted);margin-left:6px">${p.bb100>=0?'+':''}${p.bb100.toFixed(0)}/100</span>
        </div>
      </div>`;
    }).join('');
    body += '<div style="margin-bottom:14px"></div>';
  }

  if (deviations.length) {
    body += `<p style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">Hardin deviations</p>`;
    body += deviations.map(hh=>`
      <div style="background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <div><span class="badge info">${hh.position}</span> <span class="badge warn" style="margin-left:4px">${hh.pfAction}</span></div>
          <span style="font-size:13px;font-weight:700;color:${hh.netBB>=0?'var(--green)':'var(--red)'}">${hh.netBB>=0?'+':''}${hh.netBB.toFixed(1)} BB</span>
        </div>
        <p style="font-size:12px;color:var(--red);margin:0;font-weight:600">${hh.verdict.verdict.replace(/-/g,' ').toUpperCase()}</p>
        <p style="font-size:12px;color:var(--text3);margin:3px 0 0">${hh.verdict.note}</p>
      </div>`).join('');
  }

  if (n < 5) {
    body += `<div style="background:var(--bg3);border-radius:8px;padding:10px 12px;margin-top:10px">
      <p style="font-size:12px;color:var(--amber);margin:0">⚠ Small sample (${n} hands) — results are not statistically significant yet.</p>
    </div>`;
  }

  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal').style.display = 'flex';
}

// ─── ANALYSIS ─────────────────────────────────────────────────

function renderGrid() {
  const tf = getEl('grid-filter');
  const skEl = getEl('grid-stakes');
  const mtEl = getEl('grid-metric');
  let hands = filterHands(allHands, tf, skEl, 'all', 'grid-date');
  const metric = (mtEl && mtEl !== 'all') ? mtEl : 'net';
  const exBlindEl = document.getElementById('grid-exclude-blindfolds');
  if (exBlindEl && exBlindEl.checked) {
    hands = hands.filter(function(h){
      var blindFold = (h.position==='SB'||h.position==='BB') && (h.pfAction==='FOLD'||h.pfAction==='CHECK_BB');
      return !blindFold;
    });
  }
  const el = document.getElementById('grid-container');
  if (!hands.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">🃏</div><p>No data yet</p></div>';
    return;
  }

  var RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

  // Build lookup per notation
  var lookup = {};
  for (var hi = 0; hi < hands.length; hi++) {
    var h = hands[hi];
    var n = h.handNotation;
    if (!n) continue;
    if (!lookup[n]) lookup[n] = {net:0, netBB:0, count:0};
    var bbVal = h.stakes === 'NL10' ? 0.10 : 0.25;
    lookup[n].net += h.netBB * bbVal;
    lookup[n].netBB += h.netBB;
    lookup[n].count++;
  }

  var cellSize = Math.max(28, Math.min(42, Math.floor((Math.min(window.innerWidth, 560) - 20) / 14)));
  var fSize = Math.max(7, cellSize - 16);
  var vSize = Math.max(6, cellSize - 20);

  var rows = '';
  for (var i = 0; i < 13; i++) {
    var r1 = RANKS[i];
    var cols = '';
    for (var j = 0; j < 13; j++) {
      var r2 = RANKS[j];
      var notation;
      if (i === j) {
        notation = r1 + r1;
      } else if (i < j) {
        notation = r1 + r2 + 's';
      } else {
        notation = r2 + r1 + 'o';
      }
      var d = lookup[notation];
      var count = d ? d.count : 0;
      var bg, valStr;
      if (!count) {
        bg = '#1e2a1e';
        valStr = '';
      } else {
        var val = metric === 'bb100' ? d.netBB / count * 100 : metric === 'hands' ? count : d.net;
        var intensity;
        if (metric === 'hands') {
          bg = '#1a3a2a';
          valStr = count + 'x';
        } else if (val > 0) {
          intensity = Math.min(val / (metric === 'bb100' ? 80 : 3), 1);
          var g = Math.round(60 + intensity * 80);
          bg = 'rgb(20,' + g + ',20)';
          valStr = (metric === 'bb100' ? (val >= 0 ? '+' : '') + val.toFixed(0) : (val >= 0 ? '+' : '') + '$' + Math.abs(val).toFixed(2));
        } else if (val < 0) {
          intensity = Math.min(Math.abs(val) / (metric === 'bb100' ? 80 : 3), 1);
          var rr = Math.round(60 + intensity * 80);
          bg = 'rgb(' + rr + ',20,20)';
          valStr = (metric === 'bb100' ? val.toFixed(0) : '-$' + Math.abs(val).toFixed(2));
        } else {
          bg = '#2a2a2a';
          valStr = '0';
        }
      }
      cols += '<div onclick="showGridDetail(\'' + notation + '\')" style="width:' + cellSize + 'px;height:' + cellSize + 'px;background:' + bg + ';display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border-radius:2px;box-sizing:border-box">'
        + '<span style="font-size:' + fSize + 'px;font-weight:700;color:#e0ead8;line-height:1">' + notation + '</span>'
        + (valStr ? '<span style="font-size:' + vSize + 'px;color:#b0c8a8;line-height:1.2">' + valStr + '</span>' : '')
        + '</div>';
    }
    rows += '<div style="display:flex;gap:1px">' + cols + '</div>';
  }

  el.innerHTML = '<div style="display:flex;flex-direction:column;gap:1px">' + rows + '</div>';
}

function showGridDetail(notation) {
  var tf = getEl('grid-filter');
  var skEl = getEl('grid-stakes');
  var allFiltered = filterHands(allHands, tf, skEl, 'all', 'grid-date');
  var exB = document.getElementById('grid-exclude-blindfolds');
  if (exB && exB.checked) {
    allFiltered = allFiltered.filter(function(h){
      var bf = (h.position==='SB'||h.position==='BB') && (h.pfAction==='FOLD'||h.pfAction==='CHECK_BB');
      return !bf;
    });
  }
  var hands = [];
  for (var i = 0; i < allFiltered.length; i++) {
    if (allFiltered[i].handNotation === notation) hands.push(allFiltered[i]);
  }
  if (!hands.length) { showToast('No hands with ' + notation); return; }

  var net = 0; var netUSD = 0;
  for (var i = 0; i < hands.length; i++) {
    net += hands[i].netBB;
    netUSD += hands[i].netBB * (hands[i].stakes === 'NL10' ? 0.10 : 0.25);
  }
  var bb100v = net / hands.length * 100;
  var bbCol = net >= 0 ? 'var(--green)' : 'var(--red)';

  var positions = ['BTN','CO','HJ','UTG','SB','BB'];
  var posRows = '';
  for (var pi = 0; pi < positions.length; pi++) {
    var p = positions[pi];
    var ph = []; var pnet = 0;
    for (var i = 0; i < hands.length; i++) {
      if (hands[i].position === p) { ph.push(hands[i]); pnet += hands[i].netBB; }
    }
    if (!ph.length) continue;
    var pc = pnet >= 0 ? 'var(--green)' : 'var(--red)';
    var pbb = pnet / ph.length * 100;
    posRows += '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<span class="badge info">' + p + '</span>'
      + '<span style="font-size:12px;color:var(--muted)">' + ph.length + ' hand' + (ph.length > 1 ? 's' : '') + '</span>'
      + '</div>'
      + '<span style="font-size:13px;font-weight:700;color:' + pc + '">' + (pbb >= 0 ? '+' : '') + pbb.toFixed(0) + ' bb/100</span>'
      + '</div>';
  }

  var sorted = hands.slice().sort(function(a,b){return a.netBB-b.netBB;});
  var worst = sorted.slice(0, Math.min(5, sorted.length));
  var worstRows = '';
  for (var i = 0; i < worst.length; i++) {
    var wh = worst[i];
    var wc = wh.netBB >= 0 ? 'var(--green)' : 'var(--red)';
    worstRows += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;gap:6px;align-items:center">'
      + '<span class="badge info">' + wh.position + '</span>'
      + '<span style="font-size:12px;color:var(--muted)">' + wh.date.slice(5) + '</span>'
      + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      + '<span style="font-size:13px;font-weight:700;color:' + wc + '">' + (wh.netBB >= 0 ? '+' : '') + wh.netBB.toFixed(1) + ' BB</span>'
      + '<button onclick="closeModal();showHandDetail(\'' + wh.id + '\')" style="font-size:11px;background:var(--bg3);border:1px solid var(--border2);color:var(--text2);padding:3px 8px;border-radius:6px;cursor:pointer">Review</button>'
      + '</div>'
      + '</div>';
  }

  var body = '<div class="stat-grid" style="margin-bottom:14px">'
    + '<div class="stat"><p class="stat-label">Dealt</p><p class="stat-value blue">' + hands.length + '</p></div>'
    + '<div class="stat"><p class="stat-label">Net BB</p><p class="stat-value" style="color:' + bbCol + '">' + (net >= 0 ? '+' : '') + net.toFixed(1) + '</p></div>'
    + '<div class="stat"><p class="stat-label">Net $</p><p class="stat-value" style="color:' + bbCol + '">' + (netUSD >= 0 ? '+' : '-') + '$' + Math.abs(netUSD).toFixed(2) + '</p></div>'
    + '<div class="stat"><p class="stat-label">BB/100</p><p class="stat-value" style="color:' + bbCol + '">' + (bb100v >= 0 ? '+' : '') + bb100v.toFixed(0) + '</p></div>'
    + '</div>'
    + '<p style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">By position</p>'
    + posRows
    + '<p style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:12px 0 8px">Worst hands</p>'
    + worstRows;

  document.getElementById('modal-title').textContent = notation + ' — ' + hands.length + ' hands';
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal').style.display = 'flex';
}


// ─── DRAG DROP ────────────────────────────────────────────────
