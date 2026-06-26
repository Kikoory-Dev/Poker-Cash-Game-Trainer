// ====================================================================
// UTILITIES & FILTERING
// ====================================================================
function formatCards(cards) {
  if (!cards) return '??';
  const suitMap = {'s':'♠','h':'♥','d':'♦','c':'♣'};
  const suitColor = {'s':'var(--text)','h':'var(--red)','d':'var(--red)','c':'var(--text)'};
  return cards.split(' ').map(c => {
    if (c.length < 2) return c;
    const rank = c.slice(0,-1);
    const suit = c.slice(-1).toLowerCase();
    const sym = suitMap[suit] || suit;
    const col = suitColor[suit] || 'var(--text)';
    return `<span style="color:${col}">${rank}${sym}</span>`;
  }).join(' ');
}

// ─── FILTER UTILITY ───────────────────────────────────────────
function filterByTime(hands, tf, dateInputId) {
  if (tf==='all') return hands;
  if (tf==='may') return hands.filter(function(h){return h.date.startsWith('2026/05');});
  if (tf==='june') return hands.filter(function(h){return h.date.startsWith('2026/06');});
  if (tf==='last7') {
    var d=new Date(); d.setDate(d.getDate()-7);
    return hands.filter(function(h){return new Date(h.date.split('/').join('-'))>=d;});
  }
  if (tf==='last30') {
    var d=new Date(); d.setDate(d.getDate()-30);
    return hands.filter(function(h){return new Date(h.date.split('/').join('-'))>=d;});
  }
  if (tf==='last3s'||tf==='last5s'||tf==='last10s') {
    var n = tf==='last3s'?3:tf==='last5s'?5:10;
    var sessions = buildSessions(allHands);
    sessions.sort(function(a,b){return b.start-a.start;});
    var lastN = sessions.slice(0,n);
    var fileSet = {};
    lastN.forEach(function(s){s.fileList.forEach(function(f){fileSet[f]=true;});});
    return hands.filter(function(h){return fileSet[h.filename];});
  }
  if (tf==='date' && dateInputId) {
    var elF=document.getElementById(dateInputId+'-from');
    var elT=document.getElementById(dateInputId+'-to');
    if (elF) elF.style.display='inline-block';
    if (elT) elT.style.display='inline-block';
    var from=elF&&elF.value?elF.value.split('-').join('/'):'';
    var to=elT&&elT.value?elT.value.split('-').join('/'):'';
    if (!from && !to) return hands;
    return hands.filter(function(h){
      if (from && h.date < from) return false;
      if (to && h.date > to) return false;
      return true;
    });
  }
  if (dateInputId) {
    var eF=document.getElementById(dateInputId+'-from');
    var eT=document.getElementById(dateInputId+'-to');
    if (eF) eF.style.display='none';
    if (eT) eT.style.display='none';
  }
  return hands;
}

function filterHands(hands, tf, stakes, gameType, dateInputId) {
  let h = filterByTime(hands, tf, dateInputId);
  if (stakes && stakes.indexOf('|') >= 0) {
    // Combined format|stake value e.g. "Rush&Cash|NL10" — takes precedence, ignore gameType
    var parts = stakes.split('|');
    h = h.filter(function(x){ return x.gameType===parts[0] && x.stakes===parts[1]; });
    return h;
  }
  if (stakes && stakes!=='all') h = h.filter(function(x){ return x.stakes===stakes; });
  if (gameType && gameType!=='all') h = h.filter(function(x){ return x.gameType===gameType; });
  return h;
}

function getEl(id) { const e=document.getElementById(id); return e?e.value:'all'; }

// ─── TAB SWITCHING ────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

// ─── INIT ─────────────────────────────────────────────────────
async function init() {
  showToast('Loading data from GitHub...');
  allHands = await loadFromGitHub();
  // Patch legacy DB: fix streetReached for hands where Hero folded preflop
  allHands = allHands.map(h => {
    if (h.pfAction === 'FOLD' && h.streetReached !== 'Preflop') {
      return Object.assign({}, h, {streetReached: 'Preflop', sawFlop: 0});
    }
    return h;
  });
  renderDashboard();
  renderStoredSessions();
  setTimeout(()=>renderAnalysis(), 200);
}
