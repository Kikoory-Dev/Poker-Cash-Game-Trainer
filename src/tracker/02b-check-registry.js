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
