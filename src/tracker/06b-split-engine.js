// ====================================================================
// SPLIT / DIMENSION ENGINE
// ====================================================================
// Group any set of hands by any DIMENSION and compute any METRICS per group.
// Both dimensions and metrics are small registries (same pattern as the check
// registry) so adding a new split axis or stat is a one-entry change.
//
// DIMENSION: {key, label, of(h) -> bucket-string-or-null, order? (sort fn)}
// METRIC   : {key, label, compute(handsInGroup) -> number, fmt(n) -> string, good? (n)->bool|null}

var SPLIT_DIMENSIONS = [
  { key:'stake',    label:'Stake',      of:function(h){ return h.stakes || '?'; },
    order:function(a,b){ var n=function(s){return parseInt((s||'').replace(/\D/g,''))||0;}; return n(a)-n(b); } },
  { key:'format',   label:'Table type', of:function(h){ return h.gameType || '?'; } },
  { key:'position', label:'Position',   of:function(h){ return h.position || '?'; },
    order:function(a,b){ var o={BTN:0,CO:1,HJ:2,UTG:3,SB:4,BB:5}; return (o[a]==null?9:o[a])-(o[b]==null?9:o[b]); } },
  { key:'hour',     label:'Hour of day', of:function(h){ return h.time ? h.time.slice(0,2)+':00' : '?'; },
    order:function(a,b){ return a.localeCompare(b); } },
  { key:'weekday',  label:'Day of week', of:function(h){
      if(!h.date) return '?';
      var p=h.date.split('/'); var d=new Date(Date.UTC(+p[0], +p[1]-1, +p[2]));
      return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
    },
    order:function(a,b){ var o=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; return o.indexOf(a)-o.indexOf(b); } }
];

var SPLIT_METRICS = [
  { key:'hands',  label:'Hands', compute:function(hs){ return hs.length; },
    fmt:function(n){ return String(n); }, good:function(){ return null; } },
  { key:'netbb',  label:'Net BB', compute:function(hs){ return hs.reduce(function(s,h){return s+h.netBB;},0); },
    fmt:function(n){ return (n>=0?'+':'')+n.toFixed(1); }, good:function(n){ return n>=0; } },
  { key:'bb100',  label:'bb/100', compute:function(hs){ return hs.length? hs.reduce(function(s,h){return s+h.netBB;},0)/hs.length*100 : 0; },
    fmt:function(n){ return (n>=0?'+':'')+n.toFixed(1); }, good:function(n){ return n>=0; } },
  { key:'vpip',   label:'VPIP %', compute:function(hs){ return hs.length? hs.filter(function(h){return h.vpip;}).length/hs.length*100 : 0; },
    fmt:function(n){ return n.toFixed(1)+'%'; }, good:function(){ return null; } },
  { key:'pfr',    label:'PFR %', compute:function(hs){ return hs.length? hs.filter(function(h){return h.pfr;}).length/hs.length*100 : 0; },
    fmt:function(n){ return n.toFixed(1)+'%'; }, good:function(){ return null; } },
  { key:'flagrate', label:'Flags/100', compute:function(hs){ var f=hs.reduce(function(s,h){return s+(h.tagIssues?h.tagIssues.length:0);},0); return hs.length? f/hs.length*100 : 0; },
    fmt:function(n){ return n.toFixed(1); }, good:function(n){ return n<=10; } }
];

function splitDimension(key){ for(var i=0;i<SPLIT_DIMENSIONS.length;i++){ if(SPLIT_DIMENSIONS[i].key===key) return SPLIT_DIMENSIONS[i]; } return SPLIT_DIMENSIONS[0]; }
function splitMetric(key){ for(var i=0;i<SPLIT_METRICS.length;i++){ if(SPLIT_METRICS[i].key===key) return SPLIT_METRICS[i]; } return SPLIT_METRICS[1]; }

// Core: group hands by dimension, compute every metric per group.
// Returns [{bucket, hands, metrics:{key:value}}], sorted by the dimension's order (or by netbb desc).
function splitBy(hands, dimKey){
  var dim = splitDimension(dimKey);
  var groups = {};
  for(var i=0;i<hands.length;i++){
    var b = dim.of(hands[i]); if(b==null) continue;
    (groups[b] = groups[b] || []).push(hands[i]);
  }
  var rows = Object.keys(groups).map(function(b){
    var hs = groups[b];
    var m = {};
    for(var j=0;j<SPLIT_METRICS.length;j++){ m[SPLIT_METRICS[j].key] = SPLIT_METRICS[j].compute(hs); }
    return { bucket:b, hands:hs, metrics:m };
  });
  if(dim.order) rows.sort(function(a,b){ return dim.order(a.bucket,b.bucket); });
  else rows.sort(function(a,b){ return b.metrics.netbb - a.metrics.netbb; });
  return rows;
}
