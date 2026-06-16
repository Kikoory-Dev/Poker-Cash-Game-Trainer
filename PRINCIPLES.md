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
