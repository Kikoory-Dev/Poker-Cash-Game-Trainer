// ====================================================================
// RENDER: HANDS LIST & HAND DETAIL
// ====================================================================
function renderHands() {
  currentPage = 1;
  const tf = getEl('hands-filter');
  const show = getEl('hands-show');
  const pos = getEl('hands-pos');
  let hands = filterHands(allHands, tf, getEl('hands-stakes'), 'all', 'hands-date');
  if (pos!=='all') hands = hands.filter(h=>h.position===pos);
  if (show==='mistakes') hands = hands.filter(h=>h.tagIssues.length>0);
  if (show==='losses') hands = hands.filter(h=>h.netBB<0).sort((a,b)=>a.netBB-b.netBB);
  if (show==='played') hands = hands.filter(h=>h.vpip);
  var street = getEl('hands-street');
  var PF_FLAGS = {VPIP_TRASH:1, LIMP:1, LIMP_OOP:1, CALL_3BET:1, CALL_4BET:1, FOLD_STRONG_LP:1};
  var POSTF_FLAGS = {MISSED_CBET:1, CALL_WEAK:1};
  if (street==='preflop') hands = hands.filter(function(h){ return !h.sawFlop; });
  else if (street==='flop') hands = hands.filter(function(h){ return h.sawFlop; });
  else if (street==='turn') hands = hands.filter(function(h){ return h.streetReached==='Turn'||h.streetReached==='River'; });
  else if (street==='river') hands = hands.filter(function(h){ return h.streetReached==='River'; });
  else if (street==='pf_mistake') hands = hands.filter(function(h){ for(var i=0;i<h.tagIssues.length;i++){ if(PF_FLAGS[h.tagIssues[i]]) return true; } return false; });
  else if (street==='postf_mistake') hands = hands.filter(function(h){ for(var i=0;i<h.tagIssues.length;i++){ if(POSTF_FLAGS[h.tagIssues[i]]) return true; } return false; });
  filteredHandsCache = hands;
  renderHandsPage();
}

function renderHandsPage() {
  const hands = filteredHandsCache;
  const start = (currentPage-1)*PAGE_SIZE;
  const page = hands.slice(start, start+PAGE_SIZE);
  const el = document.getElementById('hands-list');
  if (!page.length) { el.innerHTML=`<div class="empty"><div class="empty-icon">🃏</div><p>No hands match this filter</p></div>`; return; }
  el.innerHTML = page.map(h=>{
    const issues = h.tagIssues;
    const bbCol = h.netBB>=0?'var(--green)':h.netBB<-5?'var(--red)':'var(--amber)';
    const pfBadge = h.pfAction==='RAISE'?'ok':h.pfAction==='CALL'?'warn':'muted';
    const issueBadge = issues.length ? `<span class="badge err">${issues.length} issue${issues.length>1?'s':''}</span>` : `<span class="badge ok">OK</span>`;
    return `<div class="hand-card" onclick="showHandDetail('${h.id}')">
      <div class="hand-card-top">
        <span class="hand-cards-display">${formatCards(h.holeCards)}</span> <span class="badge info" style="font-size:12px">${h.position}</span>
        <span class="hand-net" style="color:${bbCol}">${h.netBB>=0?'+':''}${h.netBB.toFixed(1)} BB</span>
      </div>
      <div class="hand-card-mid">
        <span class="badge info">${h.position}</span>
        <span class="badge ${pfBadge}">${h.pfAction}</span>
        ${issueBadge}
        <span class="badge muted">${h.streetReached}</span>
      </div>
      <div class="hand-card-bot">
        <span class="hand-meta">${h.handCat}</span>
        <span class="hand-meta">${h.stakes||''} ${h.gameType==='Rush&Cash'?'· R&C':''} · ${h.date.slice(5)}</span>
      </div>
    </div>`;
  }).join('');
  // Pagination
  const total = Math.ceil(hands.length/PAGE_SIZE);
  const pag = document.getElementById('hands-pagination');
  pag.innerHTML = total>1 ? `
    <span class="page-info">${hands.length} hands · page ${currentPage}/${total}</span>
    <button class="btn small" onclick="changePage(-1)" ${currentPage===1?'disabled':''}>‹</button>
    <button class="btn small" onclick="changePage(1)" ${currentPage===total?'disabled':''}>›</button>
  ` : `<span class="page-info">${hands.length} hands</span>`;
}

function changePage(dir) {
  const total = Math.ceil(filteredHandsCache.length/PAGE_SIZE);
  currentPage = Math.max(1, Math.min(total, currentPage+dir));
  renderHandsPage();
}

function renderAction(player, action, seatPositions, raisesBefore, isAllIn) {
  var isHero = player==='Hero';
  var col = isHero?'var(--green)':'var(--text3)';
  var pos = seatPositions && seatPositions[player] ? seatPositions[player] : null;
  var name = pos ? (isHero?'Hero':'Villain')+' ('+pos+')' : (isHero?'Hero':'Villain');
  var allInBadge = isAllIn ? ' <span style="font-size:9px;font-weight:800;color:var(--red);border:1px solid var(--red);border-radius:3px;padding:1px 4px;vertical-align:1px">ALL-IN</span>' : '';
  var verb;
  if (action==='folds') {
    verb='<span style="color:var(--muted)">folds</span>';
  } else if (action==='checks') {
    verb='<span style="color:var(--blue)">checks</span>';
  } else if (action.startsWith('calls')) {
    // "calls $X" — X is the amount to match
    verb='<span style="color:var(--amber)">'+action+'</span>'+allInBadge;
  } else if (action.startsWith('bets')) {
    var bm=action.match(/bets \$([\d.]+)/);
    verb=(bm?'<span style="color:var(--green)">bets <b>$'+bm[1]+'</b></span>':'<span style="color:var(--green)">'+action+'</span>')+allInBadge;
  } else if (action.startsWith('raises')) {
    // "raises $X to $Y" → X = increment, Y = total commitment on this street
    var rm=action.match(/raises \$[\d.]+ to \$([\d.]+)/);
    var totalTo=rm?rm[1]:'?';
    var rb=raisesBefore||0;
    var label=rb===0?'opens to':(rb+2)+'-bets to';
    verb='<span style="color:var(--green)">'+label+' <b>$'+totalTo+'</b></span>'+allInBadge;
  } else {
    verb=action;
  }
  return '<div style="display:flex;gap:8px;padding:4px 0;font-size:13px;border-bottom:1px solid var(--bg);align-items:center">'
    +'<span style="font-weight:600;color:'+col+';min-width:90px;font-size:12px">'+name+'</span>'
    +'<span>'+verb+'</span>'
    +'</div>';
}

function showHandDetail(id) {
  const h = allHands.find(x=>x.id===id);
  if (!h) return;
  const issues = h.tagIssues;
  const bbCol = h.netBB>=0?'var(--green)':'var(--red)';

  // ── Header ──
  let body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
    <div class="stat"><p class="stat-label">Cards</p><p class="stat-value" style="font-size:20px">${formatCards(h.holeCards)}</p></div>
    <div class="stat"><p class="stat-label">Result</p><p class="stat-value" style="font-size:20px;color:${bbCol}">${h.netBB>=0?'+':''}${h.netBB.toFixed(1)} BB</p></div>
    <div class="stat"><p class="stat-label">Position</p><p class="stat-value blue" style="font-size:16px">${h.position}</p></div>
    <div class="stat"><p class="stat-label">Hand type</p><p class="stat-value amber" style="font-size:13px">${h.handCat}<br/><span class="badge ${h.tagQuality==='A-Range'?'ok':h.tagQuality==='B-Range'?'warn':'err'}" style="margin-top:3px">${h.tagQuality}</span></p></div>
  </div>`;

  // ── Hand story — street by street ──
  const sa = h.streetActions || {};
  const streets = [
    {key:'preflop', label:'Preflop', board:''},
    {key:'flop', label:'Flop', board:h.boardFlop},
    {key:'turn', label:'Turn', board:h.boardTurn},
    {key:'river', label:'River', board:h.boardRiver},
  ];

  body += `<div class="card" style="margin-bottom:12px">`;
  body += `<div class="card-title">Hand story</div>`;

  // Show context: who raised preflop
  if (h.pfRaiser && h.pfRaiser!=='Hero') {
    body += `<p style="font-size:12px;color:var(--muted);margin:0 0 8px">Villain opened to $${h.pfRaiseAmt}</p>`;
  } else if (h.pfRaiser==='Hero') {
    body += `<p style="font-size:12px;color:var(--muted);margin:0 0 8px">Hero opened to $${h.pfRaiseAmt}</p>`;
  }

  // Only show streets up to and including the one where Hero was active
  const streetOrder = ['preflop','flop','turn','river'];
  const heroStreetIdx = streetOrder.indexOf((h.streetReached||'Preflop').toLowerCase());
  // Calculate pot after preflop for display
  var preflopActions = (sa.preflop||{}).actions||[];
  var potAfterPreflop = 0;
  var playerTotals = {};
  preflopActions.forEach(function(a){
    var act=a.action||a[1]; var pl=a.player||a[0];
    var rm=act.match(/raises \$[\d.]+ to \$([\d.]+)/);
    var cm=act.match(/calls \$([\d.]+)/);
    var bm=act.match(/bets \$([\d.]+)/);
    if(rm){playerTotals[pl]=(parseFloat(rm[1]));}
    else if(cm){playerTotals[pl]=(playerTotals[pl]||0)+parseFloat(cm[1]);}
    else if(bm){playerTotals[pl]=(playerTotals[pl]||0)+parseFloat(bm[1]);}
  });
  // Add blind posts not covered by raises
  Object.keys(h.seatPositions||{}).forEach(function(pl){
    if(!playerTotals[pl]){
      var _sb = sbForStake(h.stakes);
      var _bb = bbForStake(h.stakes);
      if(h.seatPositions[pl]==='SB') playerTotals[pl]=_sb;
      if(h.seatPositions[pl]==='BB') playerTotals[pl]=_bb;
    }
  });
  Object.values(playerTotals).forEach(function(v){potAfterPreflop+=v;});
  potAfterPreflop=Math.round(potAfterPreflop*100)/100;
  var runningPot=potAfterPreflop;
  var heroTotal = playerTotals['Hero']||0; // includes blind if Hero posted one

  streets.forEach(function({key,label,board}) {
    var st = sa[key];
    if (!st && !board) return;
    var actions = st ? st.actions : [];
    // Show all streets with board cards (incl. turn/river when Hero is all-in)
    if (key!=='preflop' && !board) return;
    if (key==='preflop' && !actions.length) return;

    // Pot label
    var potLabel = '';
    if (key==='preflop' && potAfterPreflop>0) {
      potLabel = ' <span style="font-size:10px;color:var(--muted);margin-left:auto">pot after: $'+potAfterPreflop.toFixed(2)+'</span>';
    } else if (key!=='preflop' && runningPot>0) {
      potLabel = ' <span style="font-size:10px;color:var(--muted);margin-left:auto">pot: $'+runningPot.toFixed(2)+'</span>';
    }

    body += '<div style="margin-bottom:12px">';
    body += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">'
      +'<span style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;background:var(--bg3);padding:2px 6px;border-radius:3px">'+label+'</span>'
      +(board?'<span style="font-size:14px;font-weight:600;color:var(--text)">'+formatCards(board)+'</span>':'')
      +potLabel
      +'</div>';

    if (actions.length) {
      body += '<div style="background:var(--bg3);border-radius:7px;padding:4px 10px;border:1px solid var(--border)">';
      var raisesBefore=0;
      var streetContribs={};
      var heroStreetTotal = (key==='preflop') ? heroTotal : 0; // preflop carries blind; later streets start fresh per-street
      actions.forEach(function(a) {
        var act=a.action||a[1]; var pl=a.player||a[0];
        var isAllIn=false;
        if (pl==='Hero') {
          var rmh=act.match(/raises \$[\d.]+ to \$([\d.]+)/);
          var cmh=act.match(/calls \$([\d.]+)/);
          var bmh=act.match(/bets \$([\d.]+)/);
          if(rmh) heroStreetTotal = parseFloat(rmh[1]);
          else if(cmh) heroStreetTotal += parseFloat(cmh[1]);
          else if(bmh) heroStreetTotal += parseFloat(bmh[1]);
          var heroCumulativeNow = (key==='preflop') ? heroStreetTotal : (heroTotal + heroStreetTotal);
          if (rmh||cmh||bmh) isAllIn = heroCumulativeNow >= (h.stackStart - 0.01);
        }
        body += renderAction(pl, act, h.seatPositions, raisesBefore, isAllIn);
        if(act.startsWith('raises'))raisesBefore++;
        // Track street pot additions
        var rm2=act.match(/raises \$[\d.]+ to \$([\d.]+)/);
        var cm2=act.match(/calls \$([\d.]+)/);
        var bm2=act.match(/bets \$([\d.]+)/);
        if(rm2){streetContribs[pl]=parseFloat(rm2[1]);}
        else if(cm2){streetContribs[pl]=(streetContribs[pl]||0)+parseFloat(cm2[1]);}
        else if(bm2){streetContribs[pl]=(streetContribs[pl]||0)+parseFloat(bm2[1]);}
      });
      heroTotal = (key==='preflop') ? heroStreetTotal : heroTotal + heroStreetTotal;
      Object.values(streetContribs).forEach(function(v){runningPot=Math.round((runningPot+v)*100)/100;});
      body += '</div>';
    } else if (key !== 'preflop' && board) {
      body += '<div style="background:var(--bg3);border-radius:7px;padding:6px 10px;font-size:12px;color:var(--muted);font-style:italic;border:1px solid var(--border)">Checked through — no recorded actions</div>';
    }
    body += '</div>';
  });
  body += `</div>`;

  // Showdown — full matchup: Hero's hand & made hand vs villain's, plus result
  if (h.villainShown && h.villainShown.length) {
    var fullBoard = (h.boardFlop||'') + (h.boardTurn?' '+h.boardTurn:'') + (h.boardRiver?' '+h.boardRiver:'');
    var heroMade = (h.holeCards && fullBoard) ? pfMadeHand(h.holeCards, fullBoard) : null;
    var heroWon = h.netBB > 0;
    body += `<div class="card" style="margin-bottom:12px"><div class="card-title">Showdown${fullBoard?' \u00b7 '+formatCards(fullBoard):''}</div>`;
    // Hero row
    body += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
      <div style="min-width:0"><span style="font-size:13px;color:var(--green);font-weight:700">Hero (${h.position})</span>${heroMade?'<p style="margin:2px 0 0;font-size:11px;color:var(--text3)">'+heroMade[0]+'</p>':''}</div>
      <div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px;font-weight:700">${formatCards(h.holeCards)}</span>${heroWon?'<span class="badge" style="background:var(--green);color:#0a0a0a;font-size:9px;font-weight:800;padding:2px 5px;border-radius:3px">WON</span>':''}</div>
    </div>`;
    // Villain rows
    h.villainShown.forEach(function(v){
      var vLabel = v.pos ? 'Villain ('+v.pos+')' : 'Villain';
      var vMade = (v.cards && fullBoard) ? pfMadeHand(v.cards, fullBoard) : null;
      var vWon = !heroWon;
      body += `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
        <div style="min-width:0"><span style="font-size:13px;color:var(--text3);font-weight:700">${vLabel}</span>${vMade?'<p style="margin:2px 0 0;font-size:11px;color:var(--text3)">'+vMade[0]+'</p>':''}</div>
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:16px;font-weight:700">${formatCards(v.cards)}</span>${vWon?'<span class="badge" style="background:var(--green);color:#0a0a0a;font-size:9px;font-weight:800;padding:2px 5px;border-radius:3px">WON</span>':''}</div>
      </div>`;
    });
    // Result line
    var resultCol = heroWon ? 'var(--green)' : 'var(--red)';
    body += `<div style="padding:8px 0 2px;text-align:right"><span style="font-size:13px;font-weight:800;color:${resultCol}">${heroWon?'Hero wins':'Hero loses'} \u00b7 ${h.netBB>=0?'+':''}${h.netBB.toFixed(1)} BB</span></div>`;
    body += `</div>`;
  }

  // ── TAG verdict ──
  // Determine verdict tier
  const isShowdown = h.showdown;
  const bigLoss = h.netBB < -10;
  const sawPostflop = h.sawFlop && ['Turn','River'].includes(h.streetReached);

  // Postflop hand-strength tier verdict (independent of preflop tagIssues — surfaced separately)
  let pfTierCard = '';
  if (h.sawFlop && h.boardFlop) {
    const _board = h.boardFlop + (h.boardTurn?' '+h.boardTurn:'') + (h.boardRiver?' '+h.boardRiver:'');
    const _tier = pfFinalTier(h); // [desc, tierName]
    const _verdict = pfVerdict(h, _tier[1], _tier[0]); // [OK/WRONG/MISSED/QUESTIONABLE, reason]
    const _tierLabels = {strong:'Strong value', medium:'Medium strength', draw:'Draw', weak:'Weak / air'};
    const _vColor = _verdict[0]==='OK' ? 'var(--green)' : (_verdict[0]==='WRONG' ? 'var(--red)' : 'var(--amber)');
    pfTierCard = `<div class="card" style="margin-bottom:12px">
      <div class="card-title">Postflop: ${_tierLabels[_tier[1]]||_tier[1]} (${_tier[0]})</div>
      <p style="color:${_vColor};font-size:13px;font-weight:700;margin:0 0 4px">${_verdict[0]}</p>
      <p style="color:var(--text3);font-size:12px;margin:0;line-height:1.5">${_verdict[1]}</p>
    </div>`;
    const _gp = pfGameplanVerdict(h);
    if (_gp) {
      const _roleLabel = _gp.role==='aggressor' ? 'Aggressor' : 'Caller';
      const _posLabel = _gp.position==='ip' ? 'in position' : 'out of position';
      const _gpColor = _gp.leak ? 'var(--red)' : (_gp.leakCell ? 'var(--green)' : 'var(--text3)');
      const _gpHeader = _gp.leak ? '⚠ LEAK — ' : (_gp.verdict==='OK' ? '✓ ' : '');
      pfTierCard += `<div class="card" style="margin-bottom:12px;${_gp.leak?'border-color:var(--red)':''}">
        <div class="card-title">${_gpHeader}${_roleLabel} · ${_posLabel} · ${_tierLabels[_gp.tier]||_gp.tier}</div>
        <p style="color:${_gpColor};font-size:13px;font-weight:700;margin:0 0 4px">${_gp.action}</p>
        <p style="color:var(--text3);font-size:12px;margin:0;line-height:1.5">${_gp.explain}</p>
      </div>`;
    }
  }
  body += pfTierCard;

  let verdictTier, verdictColor, verdictText, verdictSub;
  if (!issues.length) {
    if (!sawPostflop && !isShowdown) {
      verdictTier='✓ Played correctly'; verdictColor='var(--green)';
      verdictText='Clean preflop decision per Hardin framework.';
      verdictSub='';
    } else if (isShowdown && bigLoss) {
      verdictTier='✓ No TAG violations — statistical variance'; verdictColor='var(--green)';
      verdictText='All decisions correct per Hardin. The loss is variance, not a mistake.';
      verdictSub='Big losses with no violations are coolers or bad beats — unavoidable in the long run.';
    } else if (sawPostflop) {
      verdictTier='✓ Correct — review postflop sizing'; verdictColor='var(--amber)';
      verdictText='No framework violations detected. Postflop sizing and line choices may still have room for improvement.';
      verdictSub='Consider: was your bet sizing appropriate? Did you take the most profitable line?';
    } else {
      verdictTier='✓ Played correctly'; verdictColor='var(--green)';
      verdictText=h.netBB<0?'Loss is variance — correct decisions.':'Well played.';
      verdictSub='';
    }
  }
  if (!issues.length) {
    body += `<div style="background:var(--bg3);border:1px solid ${verdictColor}40;border-radius:10px;padding:12px 14px;margin-bottom:12px">
      <p style="color:${verdictColor};font-size:14px;margin:0;font-weight:700">${verdictTier}</p>
      <p style="color:var(--text3);font-size:12px;margin:5px 0 0">${verdictText}</p>
      ${verdictSub?`<p style="color:var(--muted);font-size:11px;margin:4px 0 0;line-height:1.5">${verdictSub}</p>`:''}
    </div>`;
  } else {
    body += `<div class="card" style="border-color:#d96060;margin-bottom:12px"><div class="card-title" style="color:var(--red)">TAG violations</div>`;
    issues.forEach(issue => {
      const ex = ISSUE_EXPLAIN[issue];
      if (!ex) return;
      body += `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
          <span style="font-size:14px;font-weight:700;color:var(--text)">${ex.label}</span>
          <span class="badge ${ex.type==='preflop'?'warn':'err'}">${ex.type}</span>
        </div>
        ${(function(){
          if(ex.type!=='preflop') return '';
          var pos = h.position;
          var rng = HARDIN_RANGES[pos];
          if(!rng) return '';
          var hn = h.handNotation;
          var inRange = rng.all.indexOf(hn) >= 0;
          var rangeStr = rng.all.join(', ');
          var verdict = inRange
            ? '<b style="color:var(--amber)">'+hn+'</b> IS in your '+pos+' opening range — the flag is about HOW you played it (action), not whether the hand qualifies.'
            : '<b style="color:var(--red)">'+hn+'</b> is NOT in your '+pos+' opening range. That is why it is flagged.';
          return '<div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;margin:0 0 8px">'
            +'<p style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:0 0 4px">'+pos+' opening range ('+rng.all.length+' hands)</p>'
            +'<p style="font-size:10px;color:var(--text3);margin:0 0 5px;line-height:1.5;font-family:monospace">'+rangeStr+'</p>'
            +'<p style="font-size:11px;color:var(--text2);margin:0;line-height:1.5">'+verdict+'</p>'
            +'</div>';
        })()}
        <div style="background:rgba(109,184,122,0.08);border-left:2px solid var(--green);border-radius:4px;padding:7px 10px;margin:0 0 7px">
          <p style="font-size:12px;color:var(--green);margin:0 0 3px;font-weight:700">→ ${ex.better}</p>
          <p style="font-size:11px;color:var(--text3);margin:0;line-height:1.5">${ex.principle}</p>
        </div>
        <p style="font-size:12px;color:var(--text3);margin:0 0 6px;line-height:1.6">${ex.explain}</p>
        ${ex.rangeNote?`<p style="font-size:11px;color:var(--muted);margin:0;line-height:1.5;font-style:italic">Range note: ${ex.rangeNote}</p>`:''}
      </div>`;
    });
    body += `</div>`;
  }

  if (h.reviewFlags.includes('BIG_LOSS')) {
    body += `<div style="background:#3d1e1e;border-radius:8px;padding:10px 12px">
      <p style="color:var(--red);font-size:13px;margin:0;font-weight:600">⚠ Big loss — was this a cooler or a mistake?</p>
    </div>`;
  }

  document.getElementById('modal-title').textContent = `${formatCards(h.holeCards).replace(/<[^>]+>/g,'')} · ${h.position} · ${h.date.slice(5)}`;
  var backBar = '';
  if (window._modalReturn) {
    var mr = window._modalReturn;
    if (mr.kind === 'violation') {
      var vex = ISSUE_EXPLAIN[mr.issue] || {};
      backBar = '<div onclick="showViolationHands(\''+mr.issue+'\',\''+(mr.source||'analysis')+'\')" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:7px 12px;margin-bottom:12px;color:var(--text2);font-size:12px;font-weight:600">'
        + '<span style="font-size:15px">\u2190</span> Back to '+(vex.label||mr.issue)+'</div>';
    } else {
      var lblMap = {strong:'Strong value', medium:'Medium', draw:'Draws', weak:'Weak'};
      var fLbl = mr.filter==='wrong'?' mistakes':(mr.filter==='ok'?' correct plays':'');
      backBar = '<div onclick="showTierHands(\''+mr.tier+'\',\''+(mr.filter||'all')+'\')" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:7px 12px;margin-bottom:12px;color:var(--text2);font-size:12px;font-weight:600">'
        + '<span style="font-size:15px">\u2190</span> Back to '+(lblMap[mr.tier]||mr.tier)+fLbl+'</div>';
    }
  }
  document.getElementById('modal-body').innerHTML = backBar + body;
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; window._modalReturn = null; }

// ─── POSITIONS ────────────────────────────────────────────────

// ─── MISTAKES ─────────────────────────────────────────────────
function showModal(title, body) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal').style.display = 'flex';
}

function wireRevBtns() {
  document.querySelectorAll('.rev-btn').forEach(function(b){
    b.addEventListener('click',function(e){e.stopPropagation();showHandDetail(b.dataset.id);});
  });
}

