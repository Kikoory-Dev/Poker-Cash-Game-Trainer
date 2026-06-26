// ====================================================================
// DECISION CHECKS & VERDICTS (steal, gameplan, blind defense)
// ====================================================================
function pfHeroPosition(h){
  var villainRanks=[];
  var sa=h.streetActions||{};
  ['flop','turn','river'].forEach(function(st){
    var acts=(sa[st]||{}).actions||[];
    acts.forEach(function(a){
      if(a.player!=='Hero'){
        var pos=(h.seatPositions||{})[a.player];
        if(pos!==undefined&&PF_POSTFLOP_ORDER[pos]!==undefined)villainRanks.push(PF_POSTFLOP_ORDER[pos]);
      }
    });
  });
  var heroRank=PF_POSTFLOP_ORDER[h.position];
  if(heroRank===undefined||villainRanks.length===0)return null;
  var maxVillain=Math.max.apply(null,villainRanks);
  return heroRank>maxVillain?'ip':'oop';
}

function pfHeroRole(h){
  if(h.pfAction==='RAISE')return 'aggressor';
  if(h.pfAction==='CALL')return 'caller';
  return null; // limped/checked pot — game plan doesn't apply
}

function pfHeroCallCount(h){
  var sa=h.streetActions||{};var n=0;
  ['flop','turn','river'].forEach(function(st){
    var acts=(sa[st]||{}).actions||[];
    acts.forEach(function(a){if(a.player==='Hero'&&a.action.indexOf('calls')===0)n++;});
  });
  return n;
}

function pfGameplanVerdict(h){
  var role=pfHeroRole(h);
  var pos=pfHeroPosition(h);
  if(!role||!pos)return null;
  var tier=pfFinalTier(h);
  var tierName=tier[1];
  if(!tierName||tierName==='na')return null;
  var cell=(PF_GAMEPLAN_GRID[role]||{})[pos];
  if(!cell)return null;
  var entry=cell[tierName];
  if(!entry)return null;
  var callCount=pfHeroCallCount(h);
  var verdict='INFO',leakNow=false;
  // Only the two explicit leak cells (caller/oop/medium and caller/oop/weak) get an
  // auto-checkable compliance rule; everything else is descriptive guidance only.
  if(entry.leak&&role==='caller'&&pos==='oop'&&tierName==='weak'){
    leakNow=callCount>=1; verdict=leakNow?'LEAK':'OK';
  } else if(entry.leak&&role==='caller'&&pos==='oop'&&tierName==='medium'){
    leakNow=callCount>=2; verdict=leakNow?'LEAK':'OK';
  }
  return {role:role,position:pos,tier:tierName,tierDesc:tier[0],action:entry.action,explain:entry.explain,leakCell:entry.leak,leak:leakNow,verdict:verdict,callCount:callCount};
}

function pfStealContext(h){
  if(!(h.inSB||h.inBB)) return null;
  if(!h.facedRaise) return null;
  var pfActs = (h.streetActions&&h.streetActions.preflop&&h.streetActions.preflop.actions)||[];
  // find the FIRST raise in the hand and confirm nothing but folds preceded it (first-in)
  var firstRaiseIdx=-1;
  for(var i=0;i<pfActs.length;i++){ if(pfActs[i].action&&pfActs[i].action.indexOf('raises')===0){ firstRaiseIdx=i; break; } }
  if(firstRaiseIdx<0) return null;
  for(var j=0;j<firstRaiseIdx;j++){ if(pfActs[j].action&&pfActs[j].action.indexOf('calls')===0) return {isSteal:false, raiserPos:null}; }
  // count total raises before Hero acted — if more than one, it's a 3bet+ spot, not a simple steal
  var raisesBeforeHero=0, heroActed=false;
  for(var k=0;k<pfActs.length;k++){
    if(pfActs[k].player==='Hero'){ heroActed=true; break; }
    if(pfActs[k].action&&pfActs[k].action.indexOf('raises')===0) raisesBeforeHero++;
  }
  if(raisesBeforeHero!==1) return {isSteal:false, raiserPos:null};
  var raiser = pfActs[firstRaiseIdx].player;
  var raiserPos = (h.seatPositions||{})[raiser] || null;
  var isSteal = raiserPos && STEAL_POSITIONS[raiserPos] ? true : false;
  return {isSteal:isSteal, raiserPos:raiserPos};
}

// Table-driven verdict for a blind defending vs a steal. Enumerates ALL THREE actions
// (fold / call / 3-bet) every time — generated from the range tables, never hand-written.
function pfBlindDefenseVerdict(h, ctx){
  var hand = h.handNotation;
  var callRange = h.inSB ? SB_DEFENSE_CALL : BB_DEFENSE_CALL;
  var is3bet = BLIND_DEF_3BET.indexOf(hand)>=0;
  var isCall = callRange.indexOf(hand)>=0;
  var correct = is3bet ? '3-bet' : (isCall ? 'call' : 'fold');
  var posLabel = h.inSB ? 'SB' : 'BB';
  var rangeBlurb = h.inSB
    ? 'Call: 77+/ATs/KQs-KJs-KTs/QJs-QTs/JTs/KQo-KJo-QJo/AJo-ATo-KTo. 3-bet: JJ+/AQo+/AJs. Else fold.'
    : 'Call: 22+/A5s+/K9s+/Q9s+/J9s+/T9s/97s+/86s+/76s/65s + broadway offsuits. 3-bet: JJ+/AQo+/AJs. Else fold.';
  return {correct:correct, is3bet:is3bet, isCall:isCall, posLabel:posLabel, rangeBlurb:rangeBlurb};
}

function getHardinVerdict(notation, position, pfAction) {
  const posRange = HARDIN_RANGES[position];
  if (!posRange) return {verdict:'no-data', note:'Position not tracked.'};
  const inMust = posRange.must.includes(notation);
  const inOptional = posRange.optional.includes(notation);
  const inAll = posRange.all.includes(notation);

  if (pfAction === 'RAISE') {
    if (inAll) return {verdict:'correct', note:`${notation} is a raise from ${position} per Hardin.`};
    return {verdict:'too-loose', note:`${notation} is outside Hardin's opening range from ${position}.`};
  }
  if (pfAction === 'FOLD') {
    if (inMust) return {verdict:'should-raise', note:`${notation} is a must-raise from ${position}. Folding gives up steal equity and value.`};
    if (inOptional) return {verdict:'fold-ok-optional', note:`${notation} is optional from ${position}. Folding is acceptable but raising is also correct.`};
    return {verdict:'correct-fold', note:`${notation} is outside Hardin's range from ${position}. Fold is correct.`};
  }
  if (pfAction === 'CALL') {
    if (inMust || inOptional) return {verdict:'should-raise-not-call', note:`${notation} from ${position} should be raised, not called. Calling gives up fold equity and initiative.`};
    return {verdict:'ok', note:`Calling with ${notation} from ${position}.`};
  }
  return {verdict:'ok', note:''};
}

function pfFlagMeaning(){ return {VPIP_TRASH:'Played a hand outside your opening range',LIMP:'Open-limped instead of raising or folding',LIMP_OOP:'Limped out of position',CALL_3BET:'Flat-called a 3-bet (should 4-bet or fold)',CALL_4BET:'Called a 4-bet too light',FOLD_STRONG_LP:'Folded a strong hand in late position'}; }
function postfFlagMeaning(){ return {MISSED_CBET:'Checked when a c-bet was the right play',CALL_WEAK:'Called postflop with a weak hand (should fold)'}; }
