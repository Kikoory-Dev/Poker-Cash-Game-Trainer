// ====================================================================
// CHECK REGISTRY
// ====================================================================
// Each check is one self-contained entry. To add a granular check, add an
// entry here — the tagger (runChecks) iterates this list in order, and all
// render surfaces pick it up via labelOf()/explainOf()/flagsByPhase().
//
// Entry shape:
//   key      : flag string stored in h.tagIssues (e.g. 'VPIP_TRASH')
//   phase    : 'preflop' | 'postflop'  (drives which box it renders in)
//   kind     : 'hard' (rule violation) | 'soft' (review flag)
//   label    : short human label (was ISSUE_EXPLAIN[k].label)
//   meaning  : one-line description (was pfFlagMeaning/postfFlagMeaning value)
//   detect(h, fired) -> true if the check fires for this hand.
//             `fired` is a Set of keys already fired on this hand this pass,
//             so order-dependent checks (e.g. CALL_WEAK skips if VPIP_TRASH)
//             can consult it. Detectors may also set derived fields on h
//             (e.g. h.blindDef) exactly as the original inline code did.
//
// Evaluation ORDER matters and must match the original tagging sequence.

var CHECK_REGISTRY = [
  {
    key:'VPIP_TRASH', phase:'preflop', kind:'hard',
    label:'Played a hand outside opening range',
    meaning:'Played a hand outside your opening range',
    detect:function(h){
      var r = HARDIN_RANGES[h.position];
      return !!(h.vpip && r && r.all.indexOf(h.handNotation)===-1);
    }
  },
  {
    key:'LIMP_OOP', phase:'preflop', kind:'hard',
    label:'SB called a raise outside the defense range',
    meaning:'SB called a raise that should be 3-bet or folded',
    detect:function(h){
      if (!(h.pfAction==='CALL' && h.position==='SB' && h.facedRaise && !h.pfr)) return false;
      var ctx = pfStealContext(h);
      if (ctx && ctx.isSteal) {
        var v = pfBlindDefenseVerdict(h, ctx);
        h.blindDef = {pos:'SB', isSteal:true, raiserPos:ctx.raiserPos, correct:v.correct, called:true};
        return v.correct !== 'call';
      }
      h.blindDef = {pos:'SB', isSteal:false, raiserPos:ctx?ctx.raiserPos:null, correct:'fold', called:true};
      return true;
    }
  },
  {
    key:'LIMP', phase:'preflop', kind:'hard',
    label:'Open-limped instead of raising',
    meaning:'Open-limped (first in) instead of raising or folding',
    detect:function(h){
      if (!(h.pfAction==='CALL' && !h.inBB && !h.inSB && !h.facedRaise)) return false;
      // True OPEN-limp = first voluntary entrant, no caller before Hero.
      // If a limper is already in, it's an OVER-limp (handled by OVERLIMP), not this.
      var acts = (h.streetActions&&h.streetActions.preflop&&h.streetActions.preflop.actions)||[];
      var hi=-1; for(var i=0;i<acts.length;i++){ if(acts[i].player==='Hero'){hi=i;break;} }
      if(hi>=0){
        var before=acts.slice(0,hi);
        if(before.some(function(a){return a.action&&a.action.indexOf('calls')===0;})) return false; // over-limp, not open-limp
      }
      var r = HARDIN_RANGES[h.position];
      return !!(r && r.all.indexOf(h.handNotation)!==-1);
    }
  },
  {
    key:'CALL_WEAK', phase:'postflop', kind:'hard',
    label:'Called a raise with a weak hand',
    meaning:'Cold-called a raise with a hand outside the range',
    detect:function(h, fired){
      if (!(h.pfAction==='CALL' && !h.pfr && !h.inBB && h.facedRaise && !fired.has('VPIP_TRASH'))) return false;
      // If there's a caller in front of Hero, this is an OVER-call — let OVERCALL handle it.
      var acts = (h.streetActions&&h.streetActions.preflop&&h.streetActions.preflop.actions)||[];
      var hi=-1; for(var i=0;i<acts.length;i++){ if(acts[i].player==='Hero'){hi=i;break;} }
      if(hi>=0){
        var before=acts.slice(0,hi);
        var lastRaiseIdx=-1;
        for(var j=0;j<before.length;j++){ if(before[j].action&&before[j].action.indexOf('raises')===0) lastRaiseIdx=j; }
        if(lastRaiseIdx>=0 && before.slice(lastRaiseIdx+1).some(function(a){return a.action&&a.action.indexOf('calls')===0;})) return false;
      }
      var r = HARDIN_RANGES[h.position];
      return !r || r.all.indexOf(h.handNotation)===-1;
    }
  },
  {
    key:'MISSED_CBET', phase:'postflop', kind:'soft',
    label:'Checked flop as aggressor (gave up)',
    meaning:'Gave up a c-bet spot that had equity or board range-advantage',
    detect:function(h){
      if (!(h.cbetOpp && !h.cbetMade)) return false;
      // Refinement: don't flag CORRECT give-ups (air on a caller-favoring board).
      // Still flag when Hero had equity, OR the board favors a range c-bet (A/K-high, not monotone).
      var RANK={T:10,J:11,Q:12,K:13,A:14}; for(var i=2;i<=9;i++) RANK[String(i)]=i;
      function cards(s){ return (s||'').trim().split(/\s+/).filter(Boolean).map(function(c){return {r:RANK[c[0]], s:c.slice(1)};}); }
      var flop=cards(h.boardFlop), hole=cards(h.holeCards);
      if (flop.length<3 || hole.length<2) return true; // can't assess -> keep conservative (flag)
      var bR=flop.map(function(c){return c.r;}), bS=flop.map(function(c){return c.s;});
      var madePair = (hole[0].r===hole[1].r) || hole.some(function(c){return bR.indexOf(c.r)>=0;});
      var fd = (hole[0].s===hole[1].s) && bS.filter(function(s){return s===hole[0].s;}).length>=2;
      var ranks=[]; hole.concat(flop).forEach(function(c){ if(ranks.indexOf(c.r)<0) ranks.push(c.r); });
      if (ranks.indexOf(14)>=0) ranks.push(1);
      var oesd=false; for(var lo=1;lo<=11;lo++){ var n=0; for(var k=lo;k<lo+4;k++){ if(ranks.indexOf(k)>=0) n++; } if(n>=4){oesd=true;break;} }
      var hasEquity = madePair || fd || oesd;
      var top=Math.max.apply(null,bR);
      var monotone = bS[0]===bS[1] && bS[1]===bS[2];
      var rangeCbetBoard = top>=13 && !monotone; // A/K-high, not monotone = PFR range advantage
      return hasEquity || rangeCbetBoard;
    }
  },
  {
    key:'BARREL_NO_EQUITY', phase:'postflop', kind:'soft',
    label:'Barreled a later street with no equity',
    meaning:'Fired a 2nd+ barrel with no pair and no draw — one c-bet bluff max, then give up',
    detect:function(h){
      if(!h.sawFlop) return false;
      var P=[['turn','flop'],['river','turn']],i;
      for(i=0;i<P.length;i++){ if(_pfHeroBet(h,P[i][0])&&_pfHeroBet(h,P[i][1]) && _pfStrength(_pfCards(h.holeCards),_pfBoardUpto(h,P[i][0]))==='Weak') return true; }
      return false;
    }
  },
  {
    key:'PAY_OFF', phase:'postflop', kind:'soft',
    label:'Paid off with a weak/medium hand',
    meaning:'Called the river with a medium/weak hand and lost — check-call at most, then fold',
    detect:function(h){
      if(!h.sawFlop||!h.showdown||(h.netBB||0)>=0) return false;
      if(!_pfHeroCall(h,'river')) return false;
      var s=_pfStrength(_pfCards(h.holeCards),_pfBoardUpto(h,'river'));
      return s==='Medium'||s==='Weak';
    }
  },
  {
    key:'CALL_3BET', phase:'preflop', kind:'hard',
    label:'Called a 3-bet out of range',
    meaning:'Flat-called a 3-bet (often should 4-bet or fold)',
    detect:function(h){
      // Hero opened, faced exactly ONE villain re-raise (the 3-bet), and called.
      if (!(h.pfr && h.facedRaise && h.pfAction==='CALL')) return false;
      var acts = (h.streetActions&&h.streetActions.preflop&&h.streetActions.preflop.actions)||[];
      var raises = acts.filter(function(a){return a.action&&a.action.indexOf('raises')===0;});
      var hi = -1; for (var i=0;i<raises.length;i++){ if(raises[i].player==='Hero'){hi=i;break;} }
      if (hi<0) return false;
      var villainRaisesAfter = raises.slice(hi+1).filter(function(a){return a.player!=='Hero';}).length;
      var heroRaisedAgain = raises.slice(hi+1).some(function(a){return a.player==='Hero';});
      // Faced a 3-bet = exactly one villain raise after Hero's open, and Hero did NOT 4-bet.
      if (!(villainRaisesAfter===1 && !heroRaisedAgain)) return false;
      var cont = CONTINUE_VS_4BET[h.position] || []; // proxy continue range (3-bet defense is read-dependent)
      return cont.indexOf(h.handNotation)===-1;
    }
  },
  {
    key:'CALL_4BET', phase:'preflop', kind:'hard',
    label:'Called a 4-bet out of range',
    meaning:'Called a 4-bet too light',
    detect:function(h){
      // Hero opened, Hero 4-bet (raised again), then faced a further raise and called.
      if (!(h.pfr && h.facedRaise && h.pfAction==='CALL')) return false;
      var acts = (h.streetActions&&h.streetActions.preflop&&h.streetActions.preflop.actions)||[];
      var raises = acts.filter(function(a){return a.action&&a.action.indexOf('raises')===0;});
      var hi = -1; for (var i=0;i<raises.length;i++){ if(raises[i].player==='Hero'){hi=i;break;} }
      if (hi<0) return false;
      var heroRaisedAgain = raises.slice(hi+1).some(function(a){return a.player==='Hero';});
      var villainRaisesAfter = raises.slice(hi+1).filter(function(a){return a.player!=='Hero';}).length;
      // Faced a 4-bet = either Hero 4-bet then faced another raise, or 2+ villain raises after Hero's open.
      if (!(heroRaisedAgain || villainRaisesAfter>=2)) return false;
      var cont = CONTINUE_VS_4BET[h.position] || [];
      return cont.indexOf(h.handNotation)===-1;
    }
  },
  {
    key:'FOLD_STRONG_LP', phase:'preflop', kind:'hard',
    label:'Folded a must-raise hand',
    meaning:'Folded a strong hand in late position',
    detect:function(h){
      var r = HARDIN_RANGES[h.position];
      return !!(h.pfAction==='FOLD' && !h.facedRaise && r && r.must.indexOf(h.handNotation)!==-1);
    }
  },
  {
    key:'OVERLIMP', phase:'preflop', kind:'hard',
    label:'Over-limped a hand outside the implied-odds range',
    meaning:'Limped behind limpers with a hand that does not play well multiway',
    detect:function(h){
      // Hero called with NO raise yet but >=1 limper already in (over-limp), in a non-blind seat.
      if (h.pfAction!=='CALL' || h.facedRaise || h.inBB || h.inSB) return false;
      var acts = (h.streetActions&&h.streetActions.preflop&&h.streetActions.preflop.actions)||[];
      var hi=-1; for(var i=0;i<acts.length;i++){ if(acts[i].player==='Hero'){hi=i;break;} }
      if(hi<0) return false;
      var before=acts.slice(0,hi);
      var limpersBefore = before.filter(function(a){return a.action&&a.action.indexOf('calls')===0;}).length;
      var raisesBefore = before.filter(function(a){return a.action&&a.action.indexOf('raises')===0;}).length;
      if (raisesBefore>0 || limpersBefore<1) return false; // not an over-limp
      // Leak only if the hand is outside the implied-odds over-limp range.
      return OVERLIMP_OVERCALL_RANGE.indexOf(h.handNotation)===-1;
    }
  },
  {
    key:'OVERCALL', phase:'preflop', kind:'hard',
    label:'Over-called a raise out of range',
    meaning:'Cold-called a raise behind another caller with a hand that should fold or squeeze',
    detect:function(h){
      // Hero called a raise with at least one caller already in front (over-call spot).
      if (h.pfAction!=='CALL' || !h.facedRaise || h.pfr) return false;
      var acts = (h.streetActions&&h.streetActions.preflop&&h.streetActions.preflop.actions)||[];
      var hi=-1; for(var i=0;i<acts.length;i++){ if(acts[i].player==='Hero'){hi=i;break;} }
      if(hi<0) return false;
      var before=acts.slice(0,hi);
      var lastRaiseIdx=-1;
      for(var j=0;j<before.length;j++){ if(before[j].action&&before[j].action.indexOf('raises')===0) lastRaiseIdx=j; }
      if(lastRaiseIdx<0) return false;
      var callersAfterRaise = before.slice(lastRaiseIdx+1).filter(function(a){return a.action&&a.action.indexOf('calls')===0;}).length;
      if(callersAfterRaise<1) return false; // no caller in front → it's a normal cold-call, handled elsewhere
      // Legit if it's a good multiway implied-odds over-call; leak if outside that range
      // (premiums should value-squeeze, not flat — also a leak when flatted).
      if (OVERLIMP_OVERCALL_RANGE.indexOf(h.handNotation)!==-1) return false; // in-range over-call = fine
      return true;
    }
  }
];

// Run all checks against a hand in registry order; returns array of fired keys.
function runChecks(h){
  var fired = new Set();
  for (var i=0;i<CHECK_REGISTRY.length;i++){
    var chk = CHECK_REGISTRY[i];
    if (chk.detect(h, fired)) fired.add(chk.key);
  }
  return Array.from(fired);
}

// Registry-derived lookups (replace pfFlagMeaning/postfFlagMeaning hardcoded maps)
function flagsByPhase(phase){
  var m = {};
  for (var i=0;i<CHECK_REGISTRY.length;i++){ if(CHECK_REGISTRY[i].phase===phase) m[CHECK_REGISTRY[i].key]=CHECK_REGISTRY[i].meaning; }
  return m;
}
function registryLabelOf(key){
  for (var i=0;i<CHECK_REGISTRY.length;i++){ if(CHECK_REGISTRY[i].key===key) return CHECK_REGISTRY[i].label; }
  return key;
}


// --- postflop hand-strength helpers (shared by BARREL_NO_EQUITY / PAY_OFF) ---
function _pfCards(s){ var R={T:10,J:11,Q:12,K:13,A:14},i; for(i=2;i<=9;i++)R[''+i]=i; var out=[]; (s||'').trim().split(/\s+/).forEach(function(c){ if(c && R[c[0]]!==undefined) out.push([R[c[0]], c.slice(1)]); }); return out; }
function _pfBoardUpto(h,st){ var b=_pfCards(h.boardFlop); if(st==='turn'||st==='river') b=b.concat(_pfCards(h.boardTurn)); if(st==='river') b=b.concat(_pfCards(h.boardRiver)); return b; }
function _pfStraight(rs){ var u=[]; rs.forEach(function(r){ if(u.indexOf(r)<0)u.push(r); }); if(u.indexOf(14)>=0)u.push(1); u.sort(function(a,b){return a-b;}); var run=1,i; for(i=1;i<u.length;i++){ if(u[i]===u[i-1]+1){run++; if(run>=5)return true;} else if(u[i]!==u[i-1])run=1; } return false; }
function _pfStrength(hole,board){
  if(hole.length<2||board.length<3) return null;
  var allR=[],allS=[],i;
  for(i=0;i<hole.length;i++){allR.push(hole[i][0]);allS.push(hole[i][1]);}
  for(i=0;i<board.length;i++){allR.push(board[i][0]);allS.push(board[i][1]);}
  var br=board.map(function(c){return c[0];}), hr=hole.map(function(c){return c[0];});
  var rc={},sc={}; allR.forEach(function(r){rc[r]=(rc[r]||0)+1;}); allS.forEach(function(s){sc[s]=(sc[s]||0)+1;});
  var flush=false,k; for(k in sc){ if(sc[k]>=5)flush=true; }
  var strt=_pfStraight(allR);
  var counts=Object.keys(rc).map(function(x){return rc[x];}).sort(function(a,b){return b-a;});
  var made='Weak';
  if(flush||strt||counts[0]>=3||(counts.length>=2&&counts[0]===2&&counts[1]===2)){ made='Strong'; }
  else {
    var pocket=hole[0][0]===hole[1][0], topb=Math.max.apply(null,br);
    if(pocket&&hole[0][0]>topb) made='Strong';
    else if(hr.indexOf(topb)>=0){ var kick=hr.filter(function(r){return r!==topb;}); var kk=kick.length?Math.max.apply(null,kick):0; made=(kk>=12)?'Strong':'Medium'; }
    else if(pocket) made='Medium';
    else if(hr.some(function(r){return br.indexOf(r)>=0;})){ var sb=br.slice().sort(function(a,b){return b-a;}).slice(1); made=hr.some(function(r){return sb.indexOf(r)>=0;})?'Medium':'Weak'; }
    else made='Weak';
  }
  var heroS=hole.map(function(c){return c[1];});
  var fd=false,su; for(su in sc){ if(sc[su]===4 && heroS.indexOf(su)>=0) fd=true; }
  var oesd=false,u=[]; allR.forEach(function(r){if(u.indexOf(r)<0)u.push(r);}); if(u.indexOf(14)>=0)u.push(1);
  var lo; for(lo=1;lo<=11&&!oesd;lo++){ var w=[lo,lo+1,lo+2,lo+3]; var allin=w.every(function(x){return u.indexOf(x)>=0;}); var heroIn=w.some(function(x){return hr.indexOf(x)>=0||(x===1&&hr.indexOf(14)>=0);}); if(allin&&heroIn&&!strt)oesd=true; }
  if(made==='Strong')return 'Strong';
  if(fd||oesd)return 'Draw';
  return made;
}
function _pfActs(h,st){ return (h.streetActions&&h.streetActions[st]&&h.streetActions[st].actions)||[]; }
function _pfHeroBet(h,st){ return _pfActs(h,st).some(function(a){return a.player==='Hero'&&/bets|raises/.test(a.action||'');}); }
function _pfHeroCall(h,st){ return _pfActs(h,st).some(function(a){return a.player==='Hero'&&/calls/.test(a.action||'');}); }
