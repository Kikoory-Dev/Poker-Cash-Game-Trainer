# SELF-VERIFICATION PROTOCOL (read first, apply every turn)

**This is the most important section. Run it before every substantive answer.**
Documented failures in this project all came from answering before checking:
claimed the Hands tab was clickable (wasn't), said I didn't have the book
(it was uploaded), quoted a stale EUR88.08 balance (was EUR92.27), defended
buggy flags/code under pushback. The fix is mechanical:

0.1 **VERIFY BEFORE ASSERTING.** For any factual claim about the code, data,
    balances, ranges, or app behavior — read the actual file/data FIRST, then
    answer. Never describe what the app does from memory or from orphaned code.
0.2 **CITE THE EVIDENCE.** State what I actually checked ("I read renderHands
    and the row has onclick=showHandDetail"). If I can't cite a check I just
    ran, I'm guessing — say so explicitly.
0.3 **STATE CONFIDENCE + WHAT I CHECKED.** Separate "verified just now" from
    "pattern-matching from training." Flag the latter.
0.4 **LOOK FOR DISCONFIRMATION.** Ask "what would prove me wrong?" and check
    that, not just evidence for my first answer. (Cooler-vs-leak split, etc.)
0.5 **DON'T DEFEND — RE-EXAMINE.** When the user pushes back, re-derive from
    scratch. The user reads carefully and is usually right. Defending a prior
    answer without re-checking is the cardinal failure here.
0.6 **GROUND TRUTH WINS.** User screenshots / wallet balance / the book / the
    actual file beat my assumptions every time. When shown reality, correct
    immediately and without hedging.
0.7 **CROSS-CHECK AGAINST THIS FILE EVERY TURN.** Before acting, scan these
    principles; after establishing a new rule, add it here.

---

# PROJECT PRINCIPLES & ENFORCED RULES
*Poker training ecosystem — Bernhard. Last updated: 16 Jun 2026.*

This file captures the hard-won rules, conventions, and corrections from working
sessions that would otherwise be lost between conversations. **Cross-check every
new request against this file. Update it when a new rule is established.**

---

## A. DATA INTEGRITY (the trust foundation)

1. **Wallet balance is the ONLY ground truth for P&L.** Never trust PokerCraft —
   it reports PRE-rake winloss and over-counts hands. The parser is validated
   against the GGPoker wallet balance, not PokerCraft.
2. **Reconcile every session against before/after wallet balance.** Clean sessions
   (no mid-session add-chips/uncashed pool) should match the parser to the cent.
   Gaps come from uncashed chips or timing, not parser error — verify before blaming code.
3. **Reconstruct session START balance from the earliest buy-in's "Available" + the
   buy-in amount.** Do not assume the prior session's end carried over without checking.
4. **Date format in the DB is SLASH (2026/06/15), not dash.** The parser must output
   slash dates. Dash dates break the month filters and split the DB silently. After
   any parse, run h['date']=h['date'].replace('-','/') before merging.
5. **bb/100 across mixed stakes is convention-dependent and ambiguous.** The clean
   cross-tool comparison is always DOLLARS, not bb/100. G-Sheet is PRE-rake; parser
   is POST-rake — that gap is rake, not error.

## B. POKER MEASUREMENT

6. **Measure success POST-rake** (real bankroll). Post-rake is the correct basis for
   decisions too: rake makes some +EV-pre-rake plays -EV. Pre-rake is a diagnostic only.
7. **Track SKILL via violations/100 and compliance %, NOT bb/100.** bb/100 needs
   20-30k hands per split to mean anything. Per-table/per-session win rates are noise
   (an 18-hand table showing ±500 bb/100 is one pot, not skill).
8. **Rake facts (measured + book): all GGPoker cash = 5%.** R&C cap = 3 BB.
   Regular cap = ~8 BB. "No Flop No Drop" (~40% of hands pay $0). Jackpot 1 BB on
   pots >=30 BB (~neutral long-run). R&C's tighter cap is CHEAPER on big pots.
9. **Cashout/EV-cashout = 1% fee = -EV tax.** Recommend OFF for a winning player with
   a healthy roll. "Go all out when equity favors you" is correct.

## C. HARDIN FRAMEWORK (book = authoritative)

10. **The book is the sole strategic reference.** RFI ranges transcribed & verified
    16 Jun 2026 — app data MATCHES book exactly (conservative + moderate, all positions).
    See reference/hardin_ranges_reference.json. T8s IS a valid BTN open (book p.166).
11. **SB is 3-bet-or-fold vs an open** (no flat-call). SB vs 3-bet is 4-bet-or-fold.
12. **TAG has no limping range.** First in → open-raise. Limper ahead → ISOLATION-raise.
13. **C-bet is a FREQUENCY (~60-70%), not "always."** Checking middle pair OOP on
    ace-high = correct pot control. Delayed c-bet (check flop, bet later) = legit,
    NOT a missed c-bet. MISSED_CBET only fires on genuine give-ups (checked flop AND
    never bet again).
14. **Micro opponents think in HANDS, not ranges. Exploit, don't balance.**

## D. FLAG LOGIC (the leak detector)

15. **Flags must be accurate to the ACTION, not loose poker shorthand.**
    - VPIP_TRASH = "played a hand outside opening range" (not "trash" — fires on A8s too).
    - LIMP_OOP = "SB flat-called a raise" (all are SB cold-calls, NOT limps).
    - LIMP = covers open-limp (slowplay) AND over-limp (should isolate).
    - MISSED_CBET = excludes delayed c-bets.
    - CALL_3BET vs CALL_4BET = count villain raises BEFORE hero's raise to distinguish.
16. **Flag explanations lead with: better line + principle (Hardin), then short
    explain + range note.** Preflop flags show the position's range and whether the
    hand is in/out of it.

## E. DEPLOY MECHANICS (tracker)

17. **Run `node --check` before EVERY tracker deploy.** No exceptions.
18. **Tracker JS: var + string concatenation only.** No template literals / nested
    backticks / escaped quotes in onclick handlers — they cause blank-screen crashes.
19. **Sync BOTH branches:** push poker-tracker.html to gh-pages AND public/ on main.
20. **Bump APP_VERSION const AND version.json on both branches** every change.
    Forgetting the baked-in const = app reloads but shows old version.
21. **Poll Pages build until status=='built'** before telling user it's live.
22. **React trainers:** Vite workflow disabled — must manually clone/build/push dist.
    Preserve weightedSample bug fix (compute target once before loop).

## F. WORKING NORMS (how to behave with this user)

23. **Validate all claims against reality BEFORE stating them.** Documented pattern:
    misreading screenshots, defending buggy code, unwarranted assumptions (e.g.
    claiming multi-tabling from sequential moves). Don't repeat it.
24. **Never defend a position under pushback without re-examining it.** The user reads
    carefully and is usually right when they push back. Re-check, don't defend.
25. **Acknowledge mistakes plainly without over-apologizing.** Be direct, challenge
    assumptions, no flattery, concise structured output, identify blind spots/risks.
26. **When the user says "I don't have X" / "you have X" — verify, don't assume.**
    (E.g. the book was uploaded; don't claim not to have it without checking uploads.)

---
*Strategy: R&C is the faster path to a meaningful sample (3x hands/hour) and better
hourly $. Plan: R&C NL10 sprint to 15-20k → prove win rate → R&C NL25 → up. Drop
Regular NL10 (only losing split). Move up only with bankroll (20+ buy-ins) AND proven win rate.*


---

# SMARTER-METRIC STANDARD (apply when building any stat or analysis)

**The prompt to enforce (user-authored):**
> Before building any metric, separate signal from noise: distinguish what I can
> control (decision quality) from what I can't (card-driven variance). Never present
> a number that conflates the two. For any stat, ask: "could someone misread this as
> implying causation that isn't there?" — if yes, redesign it. Ground every
> classification in Hardin's exact rules (cite the page), assume a TAG villain unless
> I say otherwise, and split every result by the factors that change the correct play
> (aggressor vs caller, street, board texture). Show me the fixable leak as its own
> number, isolated from unavoidable losses. State your confidence and what's a
> "review" vs a "certain error." Ask me before assuming scope.

**Worked application (postflop tier scorecard, established 16 Jun):**
- Net BB by tier CONFLATES decision quality with card variance. Do not show it alone.
- Correct split: bb/100 for CORRECT-action hands vs INCORRECT-action hands per tier.
  Incorrect plays bleed 7-11x faster per hand — THAT is the fixable leak.
- Established facts from the data (cite, don't re-derive):
  - Overall postflop is WINNING: +402 BB / +31.6 bb/100 over 1,273 flopped hands.
  - 90% of correctly-played weak-hand losses are <=12bb = missed flop, lost only the
    preflop investment. NOT a postflop leak — it's the entry fee for seeing flops.
  - The real leak = medium hands played wrong (raised / called 2+ barrels) and the
    handful of weak hands called down. Isolate these, ignore the variance noise.
- ~12% of hands reaching turn/river (1,273 / ~10.6k) is NORMAL, especially in R&C
  (heavy preflop folding; ~70% fold preflop, UTG ~90%). Not a bug.
