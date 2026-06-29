// ====================================================================
// STATIC POKER REFERENCE DATA (ranges, grids, explanations)
// ====================================================================
const ISSUE_EXPLAIN = {
  VPIP_TRASH: {
    label:'Played a hand outside opening range',
    type:'preflop',
    better:'Fold preflop — this hand is outside your position\'s chart.',
    principle:'Hardin: play only hands in your position\'s opening range. Outside it is a fold, even for borderline hands.',
    explain:'This hand is outside your position chart. Some flagged hands are genuinely weak (dominated offsuit kickers); others are borderline (a suited ace like A8s from the HJ, just past the cutoff). Either way, sticking to the chart is where most of a TAG player\'s discipline edge comes from — the marginal opens look harmless individually but leak over volume, especially when they get 3-bet and you fold anyway.',
    rangeNote:'Open only the hands in your position chart. Borderline-but-outside (A8s/A7s from HJ) still folds.'
  },
  LIMP_OOP: {
    label:'SB called a raise outside the defense range',
    type:'preflop',
    better:'Facing a raise in the SB, you have three actions: fold, call, or 3-bet. Calling is only correct with a hand in the SB defense call range; otherwise fold or 3-bet.',
    principle:'Hardin ch.22: vs a steal (first-in CO/BTN/SB open), SB call range = 77+/broadways; 3-bet = JJ+/AQo+/AJs; else fold. Vs a non-steal open, SB is 3-bet-or-fold (no flat range).',
    explain:'This flags an SB call of a raise where calling was not the correct action. Three actions exist here: fold, call, or 3-bet. Calling is right only with hands in the SB blind-defense call range (TT-77, ATs, KQs/KJs/KTs, QJs/QTs, JTs, KQo/KJo/QJo, AJo/ATo/KTo). Stronger hands (JJ+/AQo+/AJs) should 3-bet for value; everything else folds. Set-mining small pairs like 66 out of position does not have the implied odds at these depths — 66 is a fold here, not a call.',
    rangeNote:'Vs a steal: call 77+/broadway suited+offsuit as charted; 3-bet JJ+/AQo+/AJs; fold the rest. Vs a non-steal open: 3-bet-or-fold only.'
  },
  CALL_3BET: {
    label:'Called a 3-bet out of range',
    type:'preflop',
    better:'4-bet your continue hands or fold. Do not flat-call a 3-bet, especially OOP.',
    principle:'Hardin: facing a 3-bet it is 4-bet-or-fold. Flatting in-between hands bleeds money.',
    explain:'Calling a 3-bet with hands like 88-JJ, AQ, or set-mining pairs puts you in a bloated pot with a capped range, usually out of position. The implied odds to set-mine are not there at these stack depths once the pot is already 3-bet. This is consistently the largest dollar leak in your data.',
    rangeNote:'Continue range vs a 3-bet: UTG/HJ = QQ+/AKs · CO/BTN = JJ+/AQs/AKs · SB = TT+/AJs+/AQo+. Everything else folds.'
  },
  CALL_WEAK: {
    label:'Calling raise with weak hand',
    type:'preflop',
    better:'Fold. If the hand is not strong enough to raise or continue, it is not strong enough to call.',
    principle:'Hardin: when in doubt preflop, fold — saved chips count as much as won chips.',
    explain:'Flat-calling a raise with a weak hand invites marginal postflop spots where you rarely hold an equity edge and often face tough decisions for stacks. The fold avoids all of it.',
    rangeNote:'Only continue with hands inside your position\'s defend range vs a raise.'
  },
  MISSED_CBET: {
    label:'Checked flop as aggressor (gave up)',
    type:'postflop',
    better:'C-bet 50-75% pot on most flops when you raised preflop and reached the flop heads-up.',
    principle:'Hardin: c-bet is a core profit tool, but 60-70% is a frequency — not every flop. Checking is correct sometimes.',
    explain:'This flag fires only when you checked the flop as the preflop raiser AND never bet again that hand. Checking to pot-control or to barrel a later street is fine and is NOT flagged. But checking and then giving up surrenders the pot you set up preflop. On dry, ace-high, or paired boards your range is strong — bet it. Reserve the give-up check for spots where you genuinely have nothing and the board smashes the caller.',
    rangeNote:'C-bet ~65% overall. Always-bet: dry boards (K-7-2), paired boards. Check more: wet multiway boards, or middle pair OOP for pot control (then bet later if it improves).'
  },
  FOLD_STRONG_LP: {
    label:'Folded a must-raise hand',
    type:'preflop',
    better:'Open-raise it. These hands are not optional from this seat.',
    principle:'Hardin defines must-raise hands per position — late position is your biggest edge, use it.',
    explain:'Folding a designated opening hand throws away three sources of value: the steal when everyone folds, your positional advantage postflop, and value against wider calling ranges. Always open these.',
    rangeNote:'Check your position chart — must-raise hands are the green core, never folded.'
  },
  OVERLIMP: {
    label:'Over-limped a hand outside the implied-odds range',
    type:'preflop',
    better:'Either iso-raise (with a strong hand and fold equity) or fold. Over-limp only with implied-odds hands that play well multiway.',
    principle:'Hardin Ch.20: over-limping is legitimate and profitable (61.62 bb/100) but ONLY with the right hands — suited aces A9s-A2s, pairs 22-77, suited connectors/gappers (K9s, Q9s, J9s+, T8s+, 97s+, 86s+, 76s, 65s, 54s).',
    explain:'You limped behind one or more limpers with a hand outside the implied-odds over-limp range. These hands do not flop well enough multiway to justify it, and you have no fold equity since you are not raising. Over-limp only with hands that make disguised strong holdings (sets, flushes, straights). Outside that range: iso-raise the strong ones, fold the rest. Also avoid over-limping when an aggressive iso-raiser is left to act.',
    rangeNote:'Over-limp range: A9s-A2s, 22-77, K9s/Q9s/J9s/JTs/T8s/T9s/97s/98s/86s/87s/76s/65s/54s. Else iso-raise or fold.'
  },
  OVERCALL: {
    label:'Over-called a raise out of range',
    type:'preflop',
    better:'Fold, or value-squeeze (3-bet) your premiums. Over-call only with multiway implied-odds hands.',
    principle:'Hardin Ch.21: facing an open + a caller you have three options — fold, over-call, or value-squeeze. Over-call only good multiway implied-odds hands; squeeze your value hands rather than flatting them.',
    explain:'You cold-called a raise behind another caller with a hand outside the over-call range. Calling bloats a multiway pot with a hand that does not play well multiway; if your hand was strong you missed value by flatting instead of squeezing. The caller in front signals a weak capped range you could 3-bet to isolate. Fold the marginal hands, value-squeeze the premiums.',
    rangeNote:'Over-call range: same implied-odds hands as over-limping. Premiums (QQ+/AK/AJs+/AQo+) value-squeeze. Marginal/dominated hands fold.'
  },
  CALL_4BET: {
    label:'Called a 4-bet out of range',
    type:'preflop',
    better:'Fold. Vs a 4-bet, continue only with the very top of your range.',
    principle:'Hardin: facing a 4-bet, continue with QQ+/AKs only from most seats. Everything else folds.',
    explain:'A 4-bet represents enormous strength. Calling with JJ, AJs, or KQ means you are usually crushed by AA/KK and cannot continue profitably postflop. Preserve your stack for a better spot.',
    rangeNote:'Vs 4-bet continue: QQ+/AKs (most seats). SB slightly wider. Fold the rest.'
  },
  LIMP: {
    label:'Entered the pot by calling, not raising',
    type:'preflop',
    better:'Raise instead. First in → open-raise. Limper ahead of you → raise to isolate (~3-4 BB + 1 BB per limper).',
    principle:'Hardin: TAG has no limping range. Raise or fold, never just call the big blind.',
    explain:'Two cases trigger this. (1) Open-limping a premium like AA/KK surrenders the value and fold equity of raising — you want chips in with the best hand, not a cheap multiway flop. (2) Over-limping behind another limper (e.g. T8s on the BTN after the HJ limps) should instead be an isolation raise: punish the limper, build a pot in position, play heads-up rather than letting the blinds in free. Either way, calling forfeits initiative.',
    rangeNote:'No limp range exists in TAG. First in: open-raise your position chart. Limper ahead: isolation-raise your playable hands, fold the rest.'
  }
};

// ═══ HARDIN POSTFLOP ANALYZER (var + string-concat, no template literals) ═══
var PF_RANKS='23456789TJQKA';
var PF_POSTFLOP_ORDER={SB:0,BB:1,UTG:2,HJ:3,CO:4,BTN:5};

var PF_GAMEPLAN_GRID={
  aggressor:{
    ip:{
      strong:{action:'Bet for value, 2-3 streets',explain:'Build the pot. This is where you make your money — strongest position, the lead, and the best hand. Get it in across multiple streets.',leak:false},
      medium:{action:'C-bet once, then pot-control',explain:'You have range + position advantage, so one c-bet is fine. Then check back the turn — don\'t barrel. Showdown-bound; get there cheaply.',leak:false},
      draw:{action:'Semi-bluff c-bet',explain:'Fold equity plus your own equity. Barrel the turn with a strong draw (combo draw, flush draw with overcards). Position lets you take a free card.',leak:false},
      weak:{action:'One c-bet bluff, then give up',explain:'You have fold equity from initiative + position, so one bluff is fine. But no second or third barrel without equity — when called, give up.',leak:false}
    },
    oop:{
      strong:{action:'Bet for value, size to protect',explain:'Still value-bet, but size up to protect — out of position you can\'t control the pot as well. Charge draws and deny equity while you\'re ahead.',leak:false},
      medium:{action:'Check-call once, don\'t bloat',explain:'C-bet or check, but lean toward check-calling one street rather than barreling. OOP you can\'t realize equity well, so keep the pot small with a marginal hand.',leak:false},
      draw:{action:'C-bet semi-bluff, be ready to fold',explain:'Semi-bluffing is fine, but OOP draws realize less of their equity — so be ready to give up when raised or when the price is wrong.',leak:false},
      weak:{action:'One c-bet at most, then check-fold',explain:'OOP bluffs are expensive — you fire less than in position. One c-bet bluff maximum, then check-fold. Without the positional edge, bluffing bleeds money.',leak:false}
    }
  },
  caller:{
    ip:{
      strong:{action:'Raise for value, or flat to trap',explain:'Raise their c-bet for value, or flat-call to let them keep barreling into you. Position lets you control the pot and choose the line that extracts most.',leak:false},
      medium:{action:'Call one street, fold to 2nd barrel',explain:'Bluff-catch one street, then evaluate. Fold to multiple barrels vs a TAG. Position lets you take a free card and get to showdown cheaply.',leak:false},
      draw:{action:'Call with odds, or raise semi',explain:'Call with correct odds — in position you\'ll see both cards cheaply — or raise as a semi-bluff to take the pot away with equity behind it.',leak:false},
      weak:{action:'Fold to the c-bet',explain:'No initiative, no equity = no continue. Even in position, a weak hand against a c-bet just folds. Don\'t float without a plan.',leak:false}
    },
    oop:{
      strong:{action:'Check-raise or check-call',explain:'Check-call or check-raise. Donk-betting is occasionally fine, but check-raising traps better — let them bet into you, then spring it.',leak:false},
      medium:{action:'Check-call once, then check-fold',explain:'OOP + no initiative + medium hand = the most -EV combo in poker. Check-call once at most, then check-fold. This is where the leak lives — don\'t keep paying.',leak:true},
      draw:{action:'Check-call with odds, fold marginal',explain:'Check-call with correct odds, but draws OOP are weak — you realize less and can\'t control the price. Fold the marginal ones.',leak:false},
      weak:{action:'Check-fold, always',explain:'No initiative, no position, no equity. Check-fold every time. There is no version of this spot where calling is right.',leak:true}
    }
  }
};

const CONTINUE_VS_4BET = {"UTG": ["AA", "AKs", "KK", "QQ"], "HJ": ["AA", "AKs", "KK", "QQ"], "CO": ["AA", "AKs", "AQs", "JJ", "KK", "QQ"], "BTN": ["AA", "AKs", "AQs", "JJ", "KK", "QQ"], "SB": ["AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "JJ", "KK", "QQ", "TT"]};

// ─── STEALING & BLIND DEFENSE (Hardin ch.22, pp.249-264; charts read cell-by-cell) ───
// Steal = first-in (open) raise from a STEAL POSITION (CO, BTN, SB) only.
var STEAL_POSITIONS = {CO:1, BTN:1, SB:1};
// Shared value 3-bet range vs a steal (same for SB and BB): JJ+, AQo+, AJs
var BLIND_DEF_3BET = ["AA","KK","QQ","JJ","AKs","AQs","AJs","AKo","AQo"];
// SB blind-defense CALL range vs a steal (chart p.262, corrected cell-by-cell incl KQo):
var SB_DEFENSE_CALL = ["TT","99","88","77","ATs","KQs","KJs","KTs","QJs","QTs","JTs","KQo","KJo","QJo","AJo","ATo","KTo"];
// BB blind-defense CALL range vs a steal (chart p.263 — much wider):
var BB_DEFENSE_CALL = ["TT","99","88","77","66","55","44","33","22",
  "ATs","A9s","A8s","A7s","A6s","A5s","KJs","KTs","K9s","QJs","QTs","Q9s","JTs","J9s","T9s","98s","97s","87s","86s","76s","65s",
  "ATo","A9o","A8o","A7o","KJo","KTo","K9o","QJo","QTo","Q9o","JTo","J9o","T9o"];

// Hardin Ch.20/21 over-limp & over-call implied-odds range (hands that play well multiway):
// suited aces A9s-A2s, pairs 22-77, suited connectors/gappers. Calling OUTSIDE this
// range (and outside premiums, which should squeeze) when there are callers in front
// is the leak. In-range over-limps/over-calls are legitimate (Hardin: 61.62bb/100 on over-limps).
var OVERLIMP_OVERCALL_RANGE = ["A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
  "22","33","44","55","66","77",
  "K9s","Q9s","J9s","JTs","T8s","T9s","97s","98s","86s","87s","76s","65s","54s"];
// Premium hands that should value-squeeze (3-bet) rather than over-call when there's a raise+caller:
var SQUEEZE_VALUE_RANGE = ["AA","KK","QQ","JJ","TT","AKs","AQs","AJs","AKo","AQo"];

// Determine whether Hero (in SB or BB) faced a steal: a first-in raise from CO/BTN/SB.
// Returns {isSteal, raiserPos} or null if Hero isn't a defending blind facing a single raise.
const HARDIN_RANGES = {
  'UTG': {
    must: ["66", "77", "88", "99", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATs", "JJ", "JTs", "KJs", "KK", "KQo", "KQs", "QQ", "TT"],
    optional: ["55", "87s", "98s", "KTs", "QJs", "QTs", "T9s"],
    all: ["55", "66", "77", "87s", "88", "98s", "99", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATs", "JJ", "JTs", "KJs", "KK", "KQo", "KQs", "KTs", "QJs", "QQ", "QTs", "T9s", "TT"],
  },
  'MP': {
    must: ["55", "66", "77", "88", "99", "A9s", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATo", "ATs", "JJ", "JTs", "KJs", "KK", "KQo", "KQs", "KTs", "QJs", "QQ", "QTs", "T9s", "TT"],
    optional: ["44", "76s", "87s", "97s", "98s", "A4s", "A5s", "J9s", "T8s"],
    all: ["44", "55", "66", "76s", "77", "87s", "88", "97s", "98s", "99", "A4s", "A5s", "A9s", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATo", "ATs", "J9s", "JJ", "JTs", "KJs", "KK", "KQo", "KQs", "KTs", "QJs", "QQ", "QTs", "T8s", "T9s", "TT"],
  },
  'CO': {
    must: ["22", "33", "44", "55", "66", "76s", "77", "86s", "87s", "88", "97s", "98s", "99", "A2s", "A3s", "A4s", "A5s", "A6s", "A7s", "A8s", "A9o", "A9s", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATo", "ATs", "J9s", "JJ", "JTs", "K9s", "KJo", "KJs", "KK", "KQo", "KQs", "KTo", "KTs", "QJo", "QJs", "QQ", "QTs", "T8s", "T9s", "TT"],
    optional: ["65s", "75s", "JTo", "K8s", "QTo"],
    all: ["22", "33", "44", "55", "65s", "66", "75s", "76s", "77", "86s", "87s", "88", "97s", "98s", "99", "A2s", "A3s", "A4s", "A5s", "A6s", "A7s", "A8s", "A9o", "A9s", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATo", "ATs", "J9s", "JJ", "JTo", "JTs", "K8s", "K9s", "KJo", "KJs", "KK", "KQo", "KQs", "KTo", "KTs", "QJo", "QJs", "QQ", "QTo", "QTs", "T8s", "T9s", "TT"],
  },
  'BTN': {
    must: ["22", "33", "44", "54s", "55", "65s", "66", "75s", "76s", "77", "86s", "87s", "88", "97s", "98o", "98s", "99", "A2o", "A2s", "A3o", "A3s", "A4o", "A4s", "A5o", "A5s", "A6o", "A6s", "A7o", "A7s", "A8o", "A8s", "A9o", "A9s", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATo", "ATs", "J8s", "J9s", "JJ", "JTo", "JTs", "K7s", "K8s", "K9o", "K9s", "KJo", "KJs", "KK", "KQo", "KQs", "KTo", "KTs", "Q8s", "Q9s", "QJo", "QJs", "QQ", "QTo", "QTs", "T8s", "T9o", "T9s", "TT"],
    optional: ["43s", "64s", "87o", "J7s", "J9o", "K5s", "K6s", "K7o", "K8o", "Q6s", "Q7s", "Q9o", "T7s", "T8o"],
    all: ["22", "33", "43s", "44", "54s", "55", "64s", "65s", "66", "75s", "76s", "77", "86s", "87o", "87s", "88", "97s", "98o", "98s", "99", "A2o", "A2s", "A3o", "A3s", "A4o", "A4s", "A5o", "A5s", "A6o", "A6s", "A7o", "A7s", "A8o", "A8s", "A9o", "A9s", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATo", "ATs", "J7s", "J8s", "J9o", "J9s", "JJ", "JTo", "JTs", "K5s", "K6s", "K7o", "K7s", "K8o", "K8s", "K9o", "K9s", "KJo", "KJs", "KK", "KQo", "KQs", "KTo", "KTs", "Q6s", "Q7s", "Q8s", "Q9o", "Q9s", "QJo", "QJs", "QQ", "QTo", "QTs", "T7s", "T8o", "T8s", "T9o", "T9s", "TT"],
  },
  'SB': {
    must: ["22", "33", "44", "55", "66", "76s", "77", "86s", "87s", "88", "97s", "98s", "99", "A2s", "A3s", "A4s", "A5s", "A6s", "A7s", "A8s", "A9o", "A9s", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATo", "ATs", "J9s", "JJ", "JTs", "K9s", "KJo", "KJs", "KK", "KQo", "KQs", "KTo", "KTs", "QJo", "QJs", "QQ", "QTs", "T8s", "T9s", "TT"],
    optional: ["65s", "75s", "JTo", "K8s", "QTo"],
    all: ["22", "33", "44", "55", "65s", "66", "75s", "76s", "77", "86s", "87s", "88", "97s", "98s", "99", "A2s", "A3s", "A4s", "A5s", "A6s", "A7s", "A8s", "A9o", "A9s", "AA", "AJo", "AJs", "AKo", "AKs", "AQo", "AQs", "ATo", "ATs", "J9s", "JJ", "JTo", "JTs", "K8s", "K9s", "KJo", "KJs", "KK", "KQo", "KQs", "KTo", "KTs", "QJo", "QJs", "QQ", "QTo", "QTs", "T8s", "T9s", "TT"],
  },
};

