// ====================================================================
// HAND EVALUATION (made hands, tiers, draws)
// ====================================================================
function pfRk(c){return PF_RANKS.indexOf(c.charAt(0));}
function pfCards(s){return s?s.split(' '):[];}

function pfDetectDraws(hole,board){
  var allc=pfCards(hole).concat(pfCards(board));var draws={};
  var suits='shdc';
  for(var i=0;i<4;i++){var s=suits.charAt(i);var n=0;
    for(var j=0;j<allc.length;j++){if(allc[j].charAt(1)===s)n++;}
    if(n===4)draws['flush']=1;}
  var vals=[];for(var k=0;k<allc.length;k++){var v=pfRk(allc[k]);if(vals.indexOf(v)<0)vals.push(v);}
  vals.sort(function(a,b){return a-b;});
  if(vals.indexOf(12)>=0)vals=[-1].concat(vals);
  for(var m=0;m<vals.length-3;m++){var w=vals.slice(m,m+4);
    if(w[3]-w[0]===3)draws['straight']=1;}
  return draws;
}

function pfMadeHand(hole,board){
  var h=pfCards(hole),b=pfCards(board);
  if(b.length<3)return['preflop','na'];
  var allc=h.concat(b);var rc={};
  for(var i=0;i<allc.length;i++){var r=allc[i].charAt(0);rc[r]=(rc[r]||0)+1;}
  var counts=[];for(var key in rc)counts.push(rc[key]);
  counts.sort(function(a,b){return b-a;});
  var suits=[];for(var s2=0;s2<allc.length;s2++)suits.push(allc[s2].charAt(1));
  var flush=false;var su='shdc';
  for(var f=0;f<4;f++){var cnt=0;for(var g=0;g<suits.length;g++)if(suits[g]===su.charAt(f))cnt++;if(cnt>=5)flush=true;}
  var vals=[];for(var vi=0;vi<allc.length;vi++){var vv=pfRk(allc[vi]);if(vals.indexOf(vv)<0)vals.push(vv);}
  vals.sort(function(a,b){return a-b;});
  var vlow=vals.indexOf(12)>=0?[-1].concat(vals):vals;
  function straight(vs){var run=1;for(var i=1;i<vs.length;i++){if(vs[i]===vs[i-1]+1){run++;if(run>=5)return true;}else if(vs[i]!==vs[i-1])run=1;}return false;}
  var isStraight=straight(vlow);
  var boardVals=[];for(var bi=0;bi<b.length;bi++)boardVals.push(pfRk(b[bi]));
  boardVals.sort(function(a,b){return b-a;});
  var topBoard=boardVals[0];
  var holeRanks=[];for(var hi=0;hi<h.length;hi++)holeRanks.push(h[hi].charAt(0));
  var holePair=h.length===2&&h[0].charAt(0)===h[1].charAt(0);

  if(counts[0]>=4)return['quads','strong'];
  if(counts[0]===3&&counts.length>1&&counts[1]>=2)return['full house','strong'];
  if(flush)return['flush','strong'];
  if(isStraight)return['straight','strong'];
  if(counts[0]===3)return['set/trips','strong'];
  var pairCount=0;for(var pc=0;pc<counts.length;pc++)if(counts[pc]===2)pairCount++;
  if(counts[0]===2&&pairCount>=2)return['two pair','strong'];

  if(counts[0]===2){
    var paired='';for(var pk in rc)if(rc[pk]===2){paired=pk;break;}
    var pv=PF_RANKS.indexOf(paired);
    var madeResult;
    if(holeRanks.indexOf(paired)<0&&!holePair)madeResult=['no pair (board paired)','weak'];
    else if(holePair){var pp=PF_RANKS.indexOf(holeRanks[0]);
      if(pp>topBoard)madeResult=['overpair','strong'];
      else if(boardVals.length>1&&pp>boardVals[1])madeResult=['underpair (2nd)','medium'];
      else madeResult=['underpair',pp>=PF_RANKS.indexOf('8')?'medium':'weak'];}
    else if(pv===topBoard){var kick=0;for(var ki=0;ki<holeRanks.length;ki++){if(holeRanks[ki]!==paired){var kv=PF_RANKS.indexOf(holeRanks[ki]);if(kv>kick)kick=kv;}}
      if(kick>=PF_RANKS.indexOf('Q'))madeResult=['top pair, top kicker','strong'];
      else madeResult=['top pair, weak kicker','medium'];}
    else if(boardVals.length>1&&pv===boardVals[1])madeResult=['middle pair','medium'];
    else madeResult=['bottom pair','weak'];
    // Combo-hand upgrade: a made medium/weak hand plus a live draw plays as a Draw
    // (Strong+draw stays Strong — it's already the top tier, the draw just adds outs).
    if(madeResult[1]==='medium'||madeResult[1]==='weak'){
      var combDraws=pfDetectDraws(hole,board);
      if(combDraws['flush']||combDraws['straight']){
        var cdn=[];if(combDraws['flush'])cdn.push('flush draw');if(combDraws['straight'])cdn.push('straight draw');
        return[madeResult[0]+' + '+cdn.join('+'),'draw'];
      }
    }
    return madeResult;
  }
  var draws=pfDetectDraws(hole,board);
  if(draws['flush']||draws['straight']){
    var dn=[];if(draws['flush'])dn.push('flush draw');if(draws['straight'])dn.push('straight draw');
    return[dn.join('+'),'draw'];}
  return['no pair / whiff','weak'];
}

function pfTierByStreet(h){
  var out={};var flop=h.boardFlop||'';
  var turn=h.boardTurn?(flop+' '+h.boardTurn):'';
  var river=h.boardRiver?(turn+' '+h.boardRiver):'';
  if(flop)out.flop=pfMadeHand(h.holeCards,flop);
  if(turn)out.turn=pfMadeHand(h.holeCards,turn);
  if(river)out.river=pfMadeHand(h.holeCards,river);
  return out;
}
function pfFinalTier(h){var ts=pfTierByStreet(h);return ts.river||ts.turn||ts.flop||['','weak'];}

function pfIsMonster(desc){var ks=['set','trips','straight','flush','full house','quads','two pair'];for(var i=0;i<ks.length;i++)if(desc.indexOf(ks[i])>=0)return true;return false;}
function pfBoardDry(h){var b=(h.boardFlop||'').split(' ');if(b.length<3)return false;
  var suits=[],ranks=[];for(var i=0;i<b.length;i++){suits.push(b[i].charAt(1));ranks.push(pfRk(b[i]));}
  ranks.sort(function(a,b){return a-b;});
  var twoFlush=false,su='shdc';for(var f=0;f<4;f++){var c=0;for(var g=0;g<suits.length;g++)if(suits[g]===su.charAt(f))c++;if(c>=2)twoFlush=true;}
  var connected=(ranks[2]-ranks[0])<=4;return!twoFlush&&!connected;}

function pfHeroStreets(h){var sa=h.streetActions||{};var out={};var sts=['flop','turn','river'];
  for(var i=0;i<sts.length;i++){var acts=[];var sa2=sa[sts[i]]||{};var a=sa2.actions||[];
    for(var j=0;j<a.length;j++)if(a[j].player==='Hero')acts.push(a[j].action);out[sts[i]]=acts;}return out;}

function heroIsAllIn(h){
  var sa=h.streetActions||{};
  var sb = h.stakes==='NL25' ? 0.10 : 0.05;
  var bb = h.stakes==='NL25' ? 0.25 : 0.10;
  var total = 0;
  var pos = (h.seatPositions||{})['Hero'];
  if(pos==='SB') total=sb; else if(pos==='BB') total=bb;
  ['preflop','flop','turn','river'].forEach(function(street){
    var info = sa[street]; if(!info) return;
    var streetTotal = (street==='preflop') ? total : 0;
    (info.actions||[]).forEach(function(a){
      if(a.player!=='Hero') return;
      var rm=a.action.match(/raises \$[\d.]+ to \$([\d.]+)/);
      var cm=a.action.match(/calls \$([\d.]+)/);
      var bm=a.action.match(/bets \$([\d.]+)/);
      if(rm) streetTotal = parseFloat(rm[1]);
      else if(cm) streetTotal += parseFloat(cm[1]);
      else if(bm) streetTotal += parseFloat(bm[1]);
    });
    total = (street==='preflop') ? streetTotal : total + streetTotal;
  });
  return total >= (h.stackStart - 0.01);
}
function pfVerdict(h,tier,desc){
  var aggressor=!!h.pfr;var acts=pfHeroStreets(h);
  var flat=acts.flop.concat(acts.turn).concat(acts.river);
  var nBet=0,nRaise=0,nCall=0;
  for(var i=0;i<flat.length;i++){if(flat[i].indexOf('bets')>=0)nBet++;if(flat[i].indexOf('raises')>=0)nRaise++;if(flat[i].indexOf('calls')>=0)nCall++;}
  var hasRaise=nRaise>0;
  if(tier==='strong'){
    if(nBet===0&&nRaise===0&&h.showdown){
      if(heroIsAllIn(h))return['OK','Already all-in before this point \\u2014 no decision was available'];
      if(pfIsMonster(desc)&&pfBoardDry(h))return['OK','Slowplayed a monster on a dry board \\u2014 legit (induce / let them improve)'];
      return['MISSED','Strong value checked down \\u2014 extract value (bet/raise)'];}
    return['OK','Bet/raised strong value \\u2014 correct'];}
  if(tier==='medium'){
    if(hasRaise)return['WRONG','Medium hand raised \\u2014 Hardin: pot-control, do not build the pot'];
    if(nCall>=2)return['WRONG','Medium called 2+ barrels vs TAG \\u2014 fold to multiple bets'];
    if(aggressor&&nBet>=2)return['QUESTIONABLE','Medium barreled multiple streets \\u2014 vs TAG only better calls'];
    return['OK','Pot-controlled / checked for showdown \\u2014 correct'];}
  if(tier==='draw'){
    if(nCall>=3)return['QUESTIONABLE','Draw called 3 streets \\u2014 verify pot/implied odds justified it'];
    return['OK','Draw played reasonably'];}
  if(tier==='weak'){
    if(aggressor){
      if(nBet>=3)return['WRONG','3rd-barrel bluff into a caller \\u2014 Hardin: give up, micro players call a third'];
      if(nCall>=1&&h.showdown&&h.netBB<0)return['WRONG','Called a bet/raise with a whiff \\u2014 give up as aggressor'];
      return['OK','C-bet 1-2 barrels / gave up \\u2014 fine for aggressor air'];}
    if(nCall>=1&&h.showdown&&h.netBB<0)return['WRONG','Weak hand called to showdown & lost \\u2014 check/fold weak hands'];
    return['OK','Check/folded weak hand \\u2014 correct'];}
  return['OK',''];
}

// ─── CARD FORMATTER ──────────────────────────────────────────
