// ====================================================================
// HAND-HISTORY PARSING
// ====================================================================
function getPosition(heroSeat, btnSeat, seatList) {
  const sorted = [...seatList].sort((a,b)=>a-b);
  const n = sorted.length;
  if (!n || !sorted.includes(heroSeat)) return 'UNKNOWN';
  const btnIdx = sorted.indexOf(btnSeat);
  const heroIdx = sorted.indexOf(heroSeat);
  const steps = (heroIdx - btnIdx + n) % n;
  const maps = {
    6:{0:'BTN',1:'SB',2:'BB',3:'UTG',4:'HJ',5:'CO'},
    5:{0:'BTN',1:'SB',2:'BB',3:'UTG',4:'HJ'},
    4:{0:'BTN',1:'SB',2:'BB',3:'UTG'},
    3:{0:'BTN',1:'SB',2:'BB'},
    2:{0:'SB',1:'BB'}
  };
  return (maps[n]||{})[steps] || `P${steps}`;
}

function classifyHand(cards) {
  if (!cards || cards.length < 2) return {cat:'N/A', notation:'', quality:'Unknown'};
  const ranks = {A:14,K:13,Q:12,J:11,T:10,9:9,8:8,7:7,6:6,5:5,4:4,3:3,2:2};
  const rn = r => ({14:'A',13:'K',12:'Q',11:'J',10:'T'}[r]||String(r));
  const c = cards.split(' ');
  if (c.length < 2) return {cat:'N/A', notation:'', quality:'Unknown'};
  const r1=ranks[c[0][0]]||0, r2=ranks[c[1][0]]||0;
  const suited=c[0][1]===c[1][1], hi=Math.max(r1,r2), lo=Math.min(r1,r2);
  let cat, notation;
  if (r1===r2) {
    notation=`${rn(hi)}${rn(hi)}`;
    cat=hi>=10?'Premium Pair':hi>=7?'Mid Pair':'Low Pair';
  } else {
    notation=`${rn(hi)}${rn(lo)}${suited?'s':'o'}`;
    if (hi===14&&lo>=10) cat='Premium';
    else if (hi===14&&lo>=7) cat='Strong Ace';
    else if (hi===14&&suited) cat='Strong Ace';  // suited aces (A2s-A6s) always playable
    else if (hi===14) cat='Weak Ace';
    else if (hi>=12&&lo>=10) cat='Broadway';
    else if (hi===13&&lo>=10) cat='Broadway';
    else if (suited&&(hi-lo<=2)&&lo>=6) cat='Suited Connector';
    else if (suited&&hi>=12) cat='Suited Broadway';
    else if (suited) cat='Suited Trash';
    else cat='Trash';
  }
  // Quality based on actual Hardin ranges
  const earlyMust = new Set([...(HARDIN_RANGES.UTG?.must||[]),...(HARDIN_RANGES.HJ?.must||[])]);
  const anyMust = new Set(Object.values(HARDIN_RANGES).flatMap(r=>r.must||[]));
  const anyAll = new Set(Object.values(HARDIN_RANGES).flatMap(r=>r.all||[]));
  const quality = earlyMust.has(notation) ? 'A-Range' : anyAll.has(notation) ? 'B-Range' : 'Outside';
  return {cat, notation, quality};
}

function extractStreetActions(raw) {
  const streets = {};
  const parts = raw.split(/\*\*\* (?:FIRST |SECOND )?(?:FLOP|TURN|RIVER) \*\*\*[^\n]*\n/);
  const headers = [...raw.matchAll(/\*\*\* (?:FIRST |SECOND )?(FLOP|TURN|RIVER) \*\*\* (\[[^\]]+\])?/g)];
  const pfStart = raw.indexOf('*** HOLE CARDS ***');
  const pfEnd = raw.search(/\*\*\* (?:FIRST )?FLOP \*\*\*/);
  const pfBlock = pfStart >= 0 ? raw.slice(pfStart, pfEnd > 0 ? pfEnd : undefined) : '';
  streets.preflop = {board:'', actions:[...pfBlock.matchAll(/(\w+): (raises \$[\d.]+ to \$[\d.]+|calls \$[\d.]+|folds|checks|bets \$[\d.]+)/g)].map(m=>({player:m[1],action:m[2]}))};
  headers.forEach((hdr,i) => {
    const sname = hdr[1].toLowerCase();
    const board = hdr[2]||'';
    const block = parts[i+1]||'';
    const actions = [...block.matchAll(/(\w+): (raises \$[\d.]+ to \$[\d.]+|calls \$[\d.]+|folds|checks|bets \$[\d.]+)/g)].map(m=>({player:m[1],action:m[2]}));
    if (!streets[sname]) {
      streets[sname] = {board, actions};
    } else {
      // Run-it-twice: a later FIRST/SECOND duplicate of an already-seen street.
      // Merge rather than overwrite so real actions are never silently dropped.
      streets[sname].actions = streets[sname].actions.concat(actions);
      if (board && board !== streets[sname].board) streets[sname].board2 = board;
    }
  });
  return streets;
}

function streetContrib(raw) {
  const preHC = raw.split('*** HOLE CARDS ***')[0];
  let preflopBlind = 0;
  const blindM = preHC.match(/Hero: posts (?:small|big) blind \$([\d.]+)/);
  if (blindM) preflopBlind = parseFloat(blindM[1]);
  const streetRe = /\*\*\* (?:FIRST |SECOND )?(HOLE CARDS|FLOP|TURN|RIVER) \*\*\*/g;
  const parts = raw.split(streetRe);
  let total = 0;
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i];
    let block = parts[i+1] || '';
    block = block.split('*** SUMMARY')[0].split('*** SHOWDOWN')[0];
    let streetTotal = (name === 'HOLE CARDS') ? preflopBlind : 0;
    const lines = block.split('\n');
    for (const line of lines) {
      if (!line.startsWith('Hero:')) continue;
      const m1 = line.match(/raises \$[\d.]+ to \$([\d.]+)/);
      const m2 = line.match(/calls \$([\d.]+)/);
      const m3 = line.match(/bets \$([\d.]+)/);
      if (m1) streetTotal = parseFloat(m1[1]);
      else if (m2) streetTotal += parseFloat(m2[1]);
      else if (m3) streetTotal += parseFloat(m3[1]);
    }
    const uncalled = [...block.matchAll(/Uncalled bet \(\$([\d.]+)\) returned to Hero/g)];
    for (const um of uncalled) streetTotal -= parseFloat(um[1]);
    total += streetTotal;
  }
  return Math.max(0, Math.round(total * 100) / 100);
}

function parseHands(text, filename) {
  const rawHands = text.split(/\n\n(?=Poker Hand #)/);
  const hands = [];
  // Parse the actual blind level from the filename: "... - <SB> - <BB> - 6max.txt".
  // Previously only NL10/NL25 were recognized and anything else defaulted to NL25 —
  // which mislabeled NL5 (0.02/0.05) as NL25 and made every bb/100 wrong by 5x.
  var blindMatch = filename.match(/-\s*([0-9.]+)\s*-\s*([0-9.]+)\s*-\s*6max/);
  var fileSB = blindMatch ? parseFloat(blindMatch[1]) : 0.10;
  var fileBB = blindMatch ? parseFloat(blindMatch[2]) : 0.25;
  // Derive the stake label from the big blind in cents (NL = 100 * BB).
  var fileStakes = 'NL' + Math.round(fileBB*100);
  const fileGameType = filename.includes('Rush') ? 'Rush&Cash' : 'Regular';

  for (const raw of rawHands) {
    if (!raw.trim() || !raw.includes('Hero')) continue;
    const h = {};
    const mid = raw.match(/Poker Hand #(\w+):/); if (!mid) continue;
    h.id = mid[1];
    h.filename = filename;
    h.stakes = fileStakes;
    h.gameType = fileGameType;
    const dm = raw.match(/- (\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/);
    h.date = dm ? dm[1].slice(0,10) : '';
    h.time = dm ? dm[1].slice(11) : '';
    const tm = raw.match(/Table '(\w+)'/); h.table = tm ? tm[1] : '';
    const bm = raw.match(/Seat #(\d+) is the button/); const btnSeat = bm ? parseInt(bm[1]) : 0;
    const seats = [...raw.matchAll(/Seat (\d+): (\w+) \(\$([\d.]+) in chips\)/g)];
    const seatMap = {}; seats.forEach(s=>seatMap[parseInt(s[1])]=s[2]);
    const seatNums = Object.keys(seatMap).map(Number);
    const heroSeat = seatNums.find(n=>seatMap[n]==='Hero'); if (!heroSeat) continue;
    h.position = getPosition(heroSeat, btnSeat, seatNums);
    h.numPlayers = seatNums.length;
    // Build seat→position map for villain labeling in review
    const seatPosMap = {};
    seatNums.forEach(sn => { seatPosMap[seatMap[sn]] = getPosition(sn, btnSeat, seatNums); });
    h.seatPositions = seatPosMap;
    const sm = raw.match(new RegExp(`Seat ${heroSeat}: Hero \\(\\$([\\.\\d]+) in chips\\)`));
    h.stackStart = sm ? parseFloat(sm[1]) : 25;
    const hcm = raw.match(/Dealt to Hero \[([^\]]+)\]/); h.holeCards = hcm ? hcm[1] : '';
    const {cat,notation,quality} = classifyHand(h.holeCards);
    h.handCat = cat; h.handNotation = notation; h.tagQuality = quality;
    const summ = raw.match(/\*\*\* SUMMARY \*\*\*([\s\S]*)/);
    const summText = summ ? summ[1] : '';
    h.inSB = /small blind/.test(summText.match(new RegExp(`Seat ${heroSeat}.*`))?.[0]||'');
    h.inBB = /big blind/.test(summText.match(new RegExp(`Seat ${heroSeat}.*`))?.[0]||'');
    const pfEnd = raw.search(/\*\*\* (?:FLOP|FIRST FLOP) \*\*\*/);
    const pfText = pfEnd > 0 ? raw.slice(0,pfEnd) : raw;
    const heroPF = [...pfText.matchAll(/Hero: (calls|raises|bets|checks|folds)/g)].map(m=>m[1]);
    h.vpip = heroPF.some(a=>['calls','raises'].includes(a)) ? 1 : 0;
    h.pfr = heroPF.includes('raises') ? 1 : 0;
    // Did someone else raise before Hero acted preflop?
    const otherRaisers = [...pfText.matchAll(/^(\w+): raises/gm)].filter(m=>m[1]!=='Hero');
    h.facedRaise = otherRaisers.length > 0 ? 1 : 0;
    // pfAction = last voluntary action (calls overrides raises for 3bet-then-call-4bet spots)
    if (heroPF.includes('calls')) h.pfAction='CALL';
    else if (h.pfr) h.pfAction='RAISE';
    else if (h.inBB && heroPF.includes('checks')) h.pfAction='CHECK_BB';
    else h.pfAction='FOLD';
    // streetReached = last street where Hero was still active (folded hands = Preflop)
    if (h.pfAction === 'FOLD') {
      h.streetReached = 'Preflop';
    } else {
      // Check if Hero has actions on each street
      const rawAfterPF = raw.slice(raw.search(/\*\*\* (?:FLOP|FIRST FLOP|TURN|RIVER) \*\*\*/));
      const riverSection = raw.match(/\*\*\* RIVER \*\*\*[\s\S]*?(?=\*\*\*|$)/);
      const turnSection  = raw.match(/\*\*\* TURN \*\*\*[\s\S]*?(?=\*\*\* RIVER|\*\*\* SHOW|\*\*\* SUM|$)/);
      const flopSection  = raw.match(/\*\*\* (?:FIRST )?FLOP \*\*\*[\s\S]*?(?=\*\*\* TURN|\*\*\* SHOW|\*\*\* SUM|$)/);
      if (riverSection && /Hero:/.test(riverSection[0])) h.streetReached = 'River';
      else if (turnSection && /Hero:/.test(turnSection[0])) h.streetReached = 'Turn';
      else if (flopSection && /Hero:/.test(flopSection[0])) h.streetReached = 'Flop';
      else if (/\*\*\* (?:FLOP|FIRST FLOP) \*\*\*/.test(raw)) h.streetReached = 'Flop';
      else h.streetReached = 'Preflop';
    }
    h.sawFlop = h.streetReached !== 'Preflop' && h.pfAction !== 'FOLD' ? 1 : 0;
    h.showdown = /Hero: shows/.test(raw) ? 1 : 0;
    // Store villain showdown cards
    const villainShows = [...raw.matchAll(/(\w+): shows \[([^\]]+)\]/g)]
      .filter(m => m[1] !== 'Hero')
      .map(m => ({
        player: m[1],
        cards: m[2],
        pos: ''  // filled below
      }));
    h.villainShown = villainShows;
    // Collect winnings — GGPoker uses both "collected" and "won"
    const heroSummLine = summText.match(new RegExp(`Seat ${heroSeat}: Hero[^\n]*`))?.[0]||'';
    const collM = heroSummLine.match(/(?:collected|won) \(\$([\d.]+)\)/);
    const collected = collM ? parseFloat(collM[1]) : 0;
    // Contribution: walk each street, tracking cumulative committed amount per player.
    // A raise's "to Y" is the new absolute total for that street, not additive — summing
    // multiple raises-to amounts (e.g. open then re-raise over a 3-bet) double-counts.
    // If Hero's final committed amount on a street exceeds everyone else's, the excess
    // was never called and is returned — cap Hero's contribution at the max committed
    // by any other player on that street.
    let contrib = streetContrib(raw);
    h.netUSD = Math.round((collected-contrib)*100)/100;
    h.netBB = Math.round(h.netUSD/fileBB*100)/100;
    h.collectedUSD = collected;
    h.isCashout = 0;
    h.cashoutCost = 0;
    const fm = raw.match(/\*\*\* (?:FIRST )?FLOP \*\*\* \[([^\]]+)\]/);
    h.boardFlop = fm ? fm[1] : '';
    const tm2 = raw.match(/\*\*\* TURN \*\*\* \[[^\]]+\] \[([^\]]+)\]/);
    h.boardTurn = tm2 ? tm2[1] : '';
    const rm2 = raw.match(/\*\*\* RIVER \*\*\* \[[^\]]+\] \[([^\]]+)\]/);
    h.boardRiver = rm2 ? rm2[1] : '';
    // Street-by-street actions for review
    h.streetActions = extractStreetActions(raw);
    const pfRaiserM = pfText.match(/(\w+): raises \$[\d.]+ to \$([\d.]+)/);
    h.pfRaiser = pfRaiserM ? pfRaiserM[1] : '';
    h.pfRaiseAmt = pfRaiserM ? pfRaiserM[2] : '';
    h.cbetOpp=0; h.cbetMade=0;
    if (h.pfr && h.sawFlop) {
      const fp = raw.split(/\*\*\* (?:FIRST )?FLOP \*\*\*[^\n]*\n/);
      if (fp.length>1) {
        const flopOnly = fp[1].split(/\*\*\* TURN \*\*\*/)[0];
        if (/Hero:/.test(flopOnly)) {
          // Only a c-bet opportunity if Hero acts FIRST on flop (not facing a bet already)
          // Check if first action in flop block is Hero's
          const firstActor = flopOnly.match(/(\w+):/);
          const heroActsFirst = firstActor && firstActor[1] === 'Hero';
          // Also exclude 3-bet pots where Hero called (villain is aggressor, not Hero)
          const calledThreeBet = h.facedRaise && /Hero: calls/.test(raw.split(/\*\*\* (?:FLOP|FIRST FLOP) \*\*\*/)[0]);
          if (heroActsFirst && !calledThreeBet) {
            h.cbetOpp=1;
            if (/Hero: bets/.test(flopOnly)) h.cbetMade=1;
          }
        }
      }
    }
    // Tagging is now driven by the CHECK_REGISTRY (see 02b-check-registry.js).
    // To add/modify a check, edit the registry — the tagger picks it up here,
    // and all render surfaces read labels/meanings from the same registry.
    h.tagIssues = runChecks(h);
    h.tagCompliant = h.tagIssues.length===0 ? 1 : 0;
    const reviews = [];
    if (h.netBB < -10) reviews.push('BIG_LOSS');
    if (h.sawFlop && ['Turn','River'].includes(h.streetReached)) reviews.push('POSTFLOP');
    if (h.showdown) reviews.push('SHOWDOWN');
    h.reviewFlags = reviews;
    h.isPreflop = h.tagIssues.some(i=>['VPIP_TRASH','LIMP_OOP','CALL_WEAK','FOLD_STRONG_LP'].includes(i));
    h.isPostflop = h.tagIssues.some(i=>['MISSED_CBET','CALL_WEAK'].includes(i)) || h.reviewFlags.includes('POSTFLOP');
    hands.push(h);
  }
  return hands;
}

// ─── HARDIN EXPLANATIONS ──────────────────────────────────────
