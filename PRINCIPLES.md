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

## G. HU POSTFLOP GAME PLAN (added 25 Jun 2026)

27. **Role x position x tier grid governs postflop play** (Hardin framework,
    see reference/hu_postflop_gameplan_reference.md). Aggressor = pfAction==RAISE,
    Caller = pfAction==CALL. IP/OOP from postflop acting order vs villains seen
    in streetActions. Tiers: Strong/Medium/Draw/Weak from pfMadeHand, with a
    combo-upgrade rule (medium/weak made hand + live draw plays as Draw).
28. **Two explicit, auto-checked leak cells**: Caller+OOP+Weak (any call = leak,
    rule is always fold) and Caller+OOP+Medium (2+ calls = leak, rule allows one
    call then fold). All other 14 cells are descriptive guidance only — not
    auto-graded, to avoid false positives from cells that merely look leak-prone.
29. **Don't flag a cell as a leak just because it CAN be one** — check the actual
    action taken. First implementation pass flagged 3 hands where Hero correctly
    check-folded as leaks, just for landing in a leak-labeled cell. Always verify
    against the specific action sequence before asserting a violation.

31. **Every session push gets, by default**: (1) reconciliation table, (2) P&L
    in USD and bb/100 for that session (with the standard caveat that single-session
    bb/100 is noise, not signal — sample too small to mean anything about true win
    rate), (3) full leak/decision-quality breakdown, (4) a concise summary version
    of that breakdown — not just the detailed one.

## H. STEALING & BLIND DEFENSE (added 26 Jun 2026, verified vs book)

32. **Steal definition (Hardin p.116, p.250 verbatim):** "Raising first into a pot
    is considered a steal" — and only from a STEAL POSITION = CO, BTN, or SB.
    A raise is a steal ONLY IF it is first-in (opens an unopened pot) AND from CO/BTN/SB.
    - UTG / MP opens are NOT steals (not steal positions).
    - A raise after a limp, or any non-first-in raise, is NOT a steal.

33. **SB action vs a raise is steal-dependent.** The SB calling/3-betting range
    differs based on whether the raise was a steal:
    - vs a STEAL (CO/BTN/SB first-in): SB plays the blind-defense range (below).
    - vs a NON-STEAL open (UTG/MP, or non-first-in): SB is 3-bet-or-fold on a
      tighter value range; no flat-calling range. Flatting is still a violation,
      but the *reason* differs from the steal case — do not conflate them.

34. **SB blind-defense vs a steal (chart p.262, read cell-by-cell):**
    - Value 3-bet: JJ+, AQo+, AJs
    - Call: TT, 99, 88, 77, ATs, KQs, KJs, KTs, QJs, QTs, JTs, KQo, KJo, QJo, AJo, ATo, KTo
    - Else: fold (small pairs/suited aces = 3-bet-bluff-or-fold)
    - 66 specifically: NOT a call (call stops at 77), NOT a 3-bet → fold. (Call only
      vs a 2bb min-raise per Practice Hand #6.)

35. **BB blind-defense vs a steal (chart p.263) — much wider** (BB closes action,
    best pot odds):
    - Value 3-bet: JJ+, AQo+, AJs
    - Call: 22-TT, ATs-A5s, KJs KTs K9s, QJs QTs Q9s, JTs J9s, T9s, 98s 97s, 87s 86s,
      76s, 65s; ATo A9o A8o A7o, KJo KTo K9o, QJo QTo Q9o, JTo J9o, T9o
    - Else: fold

36. **CROSS-CHECK AGAINST HARDIN YOURSELF.** The book PDF is in the repo at
    reference/Master_Micro_Stakes_Poker_Alton_Hardin.pdf (460pp). Before encoding
    ANY range or rule, read it from the book — do not ask the user to supply
    definitions that are in the DB, and do not rely on memory. Rasterize chart
    pages (pdftoppm) and read grids cell-by-cell; prose + practice hands disambiguate.

37. **When the user flags a mistake, propose a guardrail against the whole CLASS
    of mistake — not just a one-off fix.** Every correction is a signal that some
    process let an error through; the deliverable is a concrete idea to stop that
    kind (or similar) of error recurring, not merely patching the instance.
    Examples of guardrails: encode the rule as an auto-check so it can't be
    misremembered; transcribe ranges cell-by-cell from the book image rather than
    from memory/PDF-text; enumerate the full action set for a spot before writing
    any verdict string; add a regression test that would have caught it.

38. **Enumerate the full action set for a spot before writing any verdict text.**
    A preflop spot facing a raise has THREE actions: fold / call / 3-bet (raise).
    Verdict strings must not collapse this to two. (Caught 26 Jun: an SB-vs-steal
    message said "fold or 3-bet" and dropped calling — misrepresenting the standard.)

## I. ARCHITECTURE (added 26 Jun 2026)

39. **Tracker is authored as concatenated source modules** in `src/tracker/`
    (01-config … 11-boot), built into `poker-tracker.html` by `build_tracker.py`.
    Never edit the built HTML directly — edit modules and rebuild. The build runs
    `node --check` and aborts on syntax error. See src/tracker/README.md.

40. **All decision checks live in the CHECK_REGISTRY** (`02b-check-registry.js`).
    Each check is one entry: {key, phase, kind, label, meaning, detect(h,fired)}.
    The tagger calls `runChecks(h)`; render surfaces read labels/meanings from the
    same registry via `flagsByPhase()`. To add a granular check, add ONE entry —
    do not scatter logic across parse/render/maps (that drift caused the version mess).

41. **Equivalence-test every refactor before shipping.** Run all checks/evals on all
    hands in both old and new code paths; require identical output (normalizing any
    intended behavior change explicitly). The modularization (62,570 evals) and the
    registry migration (12,514 hands) were both verified at 0 unexplained differences.

42. **CALL_3BET vs CALL_4BET are distinct checks.** Faced-a-3-bet = exactly one
    villain re-raise after Hero's open, Hero did not 4-bet. Faced-a-4-bet = Hero
    4-bet then faced a further raise (or 2+ villain raises after the open). A latent
    bug had CALL_3BET defined but never produced; the registry fixed it.

43. **Derived-index + memoized filtering** (`06-util.js`). `filterHands` on the full
    `allHands` set is memoized by argument signature, keyed to `_dataVersion`.
    ANY mutation of `allHands` MUST call `bumpDataVersion()` (load, upload, clear) or
    stale results will be served. The `date` time-filter is never cached (reads live
    DOM). `getDerivedIndex()` precomputes buckets/rollups once per version. Measured
    ~116x speedup on repeated filters at 50k hands.

44. **Split/dimension engine** (`06b-split-engine.js`). Group results by any
    DIMENSION (stake/format/position/hour/weekday) and compute any METRIC; both are
    registries — add an axis or stat with one entry. The Positions tab is the
    Splits tab; position keeps its richer issue-breakdown view.

45. **Heads-up / short-handed position**: when only 2 players are dealt, the button
    posts the small blind and is labeled SB (acts first preflop, last postflop) — NOT
    a separate BTN/SB bucket. Hardin's framework is 6-max; don't create phantom
    positions for folded-down hands.

## J. SESSION REPORTING PROTOCOL (added 29 Jun 2026, standing request)

46. **After EVERY session the user shares, always deliver this report, unprompted:**
    a. **Reconciliation** — check the numbers add up: parsed hand count vs PokerCraft
       "Download N Game Histories" and the session list; per-table parsed net vs
       wallet buy-in/cashout/add-chips deltas to the cent. Flag anything missing
       (scrolled-off tables, un-uploaded files, dupes already in DB). Wallet is
       ground truth; explain any gap (time-bank credits, Fish Buffet rakeback,
       add-chips rebuys). Note that PokerCraft "Winloss" is PRE-rake and will read
       higher than the wallet/parsed net — the difference is the rake paid.
    b. **Headline numbers** — hands played, P&L in USD, and bb/100 rate. The
       small-sample caveat applies ONLY to the net $ result (one big pot swings it)
       and to rare high-variance spots (stack-offs, river bluffs) — NOT to preflop
       decisions. ~1000 hands = hundreds of repetitions of every preflop spot, which
       is plenty to identify and act on preflop leaks immediately. Do not dismiss a
       full multi-hour session as "small sample"; every session accumulates.
    c. **Most-frequent mistakes, ranked (ALWAYS, unprompted)** — list the top
       preflop mistakes by count AND the top postflop mistakes by count for THIS
       session, each ranked with the flag count (e.g. "CALL_3BET ×4, LIMP_OOP ×7").
       Then: biggest single leaks by BB lost, and any pattern across the flags
       (e.g. "leaks cluster on calling decisions") even in one session — stated as
       an indication to act on, not a statistical verdict. Preflop and postflop are
       reported as two separate ranked lists.

47. **Over-limp & over-call are distinct from open-limp/cold-call** (Hardin Ch.20/21):
    - OPEN-LIMP (LIMP): first voluntary entrant limps — a leak with raiseable hands.
    - OVER-LIMP (OVERLIMP): limp behind limpers. LEGIT (61.62bb/100) with the
      implied-odds range (A9s-A2s, 22-77, suited connectors/gappers); a leak only
      OUTSIDE that range. Don't over-limp with an aggressive iso-raiser left to act.
    - OVER-CALL (OVERCALL): cold-call a raise behind another caller. Three options:
      fold / over-call (implied-odds hands) / value-squeeze (premiums). Leak =
      flatting marginal hands or flatting premiums that should squeeze.
    - These checks must not double-fire with LIMP/CALL_WEAK; the more specific
      over-limp/over-call check takes precedence.

48. **A SESSION = ONE UPLOAD BATCH, not a time window.** The user uploads when they
    decide a session ended; that upload IS the session boundary. Every file uploaded
    together is stamped with one sessionId and counts as a single session regardless
    of gaps between hands (bathroom/activity breaks do NOT split it). Two separate
    uploads on the same day = two sessions. Never infer session boundaries from
    timestamps for new data. Historic hands (pre-sessionId, before 29 Jun 2026) use a
    60-min-gap fallback as an estimate only. "Last N sessions" filters operate on
    these upload-defined sessions.

49. **LEAD WITH A SHORT SUMMARY, THEN THE REST — always.** Every substantive answer
    opens with a tight, high-signal summary before any detail or breakdown. For a session
    report the summary carries at minimum: hands, net $ (true / wallet-reconciled), bb/100,
    and running DB total. This reorders Rule 46 — the concise summary comes FIRST, not last.


50. **BE SHORT. Default to the fewest words that answer.** Lead with the answer, cut
    preamble, caveats, and restatement. Expand only when asked.
