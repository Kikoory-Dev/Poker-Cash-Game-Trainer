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

// ─── DERIVED INDEX & MEMOIZED FILTERING ───────────────────────
// As the dataset grows, re-scanning allHands on every render gets costly.
// We memoize filterHands by its argument signature, keyed to a dataset
// version that MUST be bumped whenever allHands changes (load, upload).
// We also precompute a derived index (buckets + rollups) once per version.
var _dataVersion = 0;
var _filterCache = {};
var _derivedIndex = null;

// Call this whenever allHands is mutated/replaced — invalidates all caches.
function bumpDataVersion(){ _dataVersion++; _filterCache = {}; _derivedIndex = null; }

// Built once per dataVersion; cheap rollups the UI reads directly.
function getDerivedIndex(){
  if (_derivedIndex && _derivedIndex._v === _dataVersion) return _derivedIndex;
  var idx = { _v:_dataVersion, total:allHands.length, byStake:{}, byFormat:{}, byPosition:{}, netBB:0, flags:0 };
  for (var i=0;i<allHands.length;i++){
    var h = allHands[i];
    idx.netBB += h.netBB || 0;
    idx.flags += (h.tagIssues?h.tagIssues.length:0);
    (idx.byStake[h.stakes] = idx.byStake[h.stakes] || []).push(h);
    (idx.byFormat[h.gameType] = idx.byFormat[h.gameType] || []).push(h);
    (idx.byPosition[h.position] = idx.byPosition[h.position] || []).push(h);
  }
  _derivedIndex = idx;
  return idx;
}

function _rawFilterHands(hands, tf, stakes, gameType, dateInputId) {
  let h = filterByTime(hands, tf, dateInputId);
  if (stakes && stakes.indexOf('|') >= 0) {
    var parts = stakes.split('|');
    return h.filter(function(x){ return x.gameType===parts[0] && x.stakes===parts[1]; });
  }
  if (stakes && stakes!=='all') h = h.filter(function(x){ return x.stakes===stakes; });
  if (gameType && gameType!=='all') h = h.filter(function(x){ return x.gameType===gameType; });
  return h;
}

function filterHands(hands, tf, stakes, gameType, dateInputId) {
  // Only memoize the common case: filtering the full allHands set. Calls with a
  // different `hands` array (rare) bypass the cache to stay correct.
  if (hands !== allHands) return _rawFilterHands(hands, tf, stakes, gameType, dateInputId);
  // Date-range filter reads live DOM inputs, so its result can change without a
  // dataVersion bump — never cache it.
  if (tf === 'date') return _rawFilterHands(hands, tf, stakes, gameType, dateInputId);
  var key = _dataVersion + '|' + tf + '|' + stakes + '|' + gameType + '|' + (dateInputId||'');
  if (_filterCache[key]) return _filterCache[key];
  var res = _rawFilterHands(hands, tf, stakes, gameType, dateInputId);
  _filterCache[key] = res;
  return res;
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
  // Re-tag every hand with the CURRENT check registry. tagIssues is derived data,
  // not ground truth — recomputing on load means any check-logic improvement
  // (steal fix, 3bet/4bet split, future checks) applies retroactively to ALL
  // historic hands, and stale stored tags can never mislead the analysis.
  retagAll(allHands);
  bumpDataVersion();
  renderDashboard();
  renderStoredSessions();
  setTimeout(()=>renderAnalysis(), 200);
}

// Recompute tagIssues + derived flags for every hand using the live registry.
function retagAll(hands){
  for (var i=0;i<hands.length;i++){
    var h = hands[i];
    h.tagIssues = runChecks(h);
    h.tagCompliant = h.tagIssues.length===0 ? 1 : 0;
    h.isPreflop = h.tagIssues.some(function(x){ return ['VPIP_TRASH','LIMP_OOP','CALL_WEAK','FOLD_STRONG_LP','CALL_3BET','CALL_4BET','LIMP'].indexOf(x)>=0; });
    h.isPostflop = h.tagIssues.some(function(x){ return ['MISSED_CBET','CALL_WEAK'].indexOf(x)>=0; }) || (h.reviewFlags||[]).indexOf('POSTFLOP')>=0;
  }
}
