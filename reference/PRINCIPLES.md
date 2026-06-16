# PRINCIPLES & RULES REGISTRY — Poker Project

**Purpose:** Durable record of hard-won rules, corrections, and conventions established
while building Bernhard's poker tracker + trainers. Claude should READ THIS FILE at the
start of work and CROSS-CHECK every change against it, and UPDATE it when new principles
are established. This exists because conversation context gets compacted/erased over time
and these lessons must not be re-learned the hard way.

---

## A. GROUND TRUTH & DATA INTEGRITY (highest priority)
1. **Wallet balance is the ONLY ground truth for P&L.** Never trust PokerCraft — it is
   PRE-rake and over-counts hands (counts hands seated-for, not dealt-in). The parser is
   validated against the GGPoker wallet balance, and matches it to the cent on clean sessions.
2. **PokerCraft Win/Loss is pre-rake; parser is post-rake (real take-home).** The gap between
   them on a session ≈ the rake paid. This is expected, not a bug.
3. **Reconcile every session against the user's stated before/after wallet balance.** Reconstruct
   the start balance from the earliest buy-in's "Available" + the buy-in amount. Don't assume.
4. **The book is the source of truth for ranges/flags**, NOT the app's existing data. The book
   PDF is stored at reference/Master_Micro_Stakes_Poker_Alton_Hardin.pdf and ranges at
   reference/hardin_opening_ranges.md. Claude does NOT have the book in memory — read the
   reference files.

## B. DATE FORMAT (caused a real bug)
5. **All dates in tracker-data.json MUST use slash format: 2026/06/15.** The parser must
   convert dashes to slashes (h['date'].replace('-','/')) before merging. Dash-format dates
   silently break the month filter (June showed 3.40 instead of 7.52 bb/100 because 587 hands
   were invisible to the filter).

## C. DEPLOY MECHANICS (never skip)
6. **Run `node --check` on the extracted <script> before EVERY tracker deploy.** No exceptions.
7. **Tracker JS must use var + string concatenation in onclick/dynamic HTML** — no template
   literals, no nested backticks, no escaped quotes in onclick handlers. These cause blank screens.
8. **Sync BOTH branches on every tracker change:** push poker-tracker.html to gh-pages AND
   public/poker-tracker.html on main. Otherwise the Vite workflow can overwrite with a stale copy.
9. **Bump BOTH the baked-in APP_VERSION const AND version.json (both branches) every change.**
   Forgetting the const = app reloads but shows old version.
10. **Poll https://api.github.com/repos/.../pages/builds/latest until status=='built'** before
    telling the user it's live.
11. **React trainers don't auto-deploy** (Vite workflow disabled). Must manually clone main,
    npm install, npm run build, push dist bundle to gh-pages, delete old bundle, re-push tracker.

## D. FLAG LOGIC (validated, Hardin-only)
12. **MISSED_CBET only fires on genuine give-ups:** Hero checked flop as PFR AND never bet
    turn/river. Delayed c-bets (check flop, bet later) are a legit pot-control line — NOT a leak.
    ~33% of raw missed-cbets were delayed c-bets and must be excluded.
13. **LIMP_OOP = SB flat-called a raise (cold-call), NOT a limp.** All such flags are SB cold-calls.
    Label it accurately: SB is 3-bet-or-fold vs an open.
14. **LIMP covers two cases:** open-limping a premium (slowplay leak) AND over-limping behind a
    limper (should isolation-raise ~3-4BB +1BB/limper). Both forfeit initiative.
15. **CALL_3BET vs CALL_4BET:** count villain raises BEFORE Hero's raise. villain_before=False →
    CALL_3BET; True → CALL_4BET. Most flagged "4-bet calls" were actually 3-bet calls.
16. **VPIP_TRASH = played a hand outside the position's opening range.** Don't call marginal
    hands (e.g. A8s) "trash" — relabel as "outside opening range". Fires when played hand ∉ all-range.
17. **Flag explanations lead with: (better line + principle) in 2 lines, then short para, then
    range note.** Preflop flags also show the position's full range + in/out verdict. Hardin-only logic.

## E. POKER CONTENT TRUTHS
18. **T8s IS a valid Hardin BTN open** (in conservative range). Confirmed from book p.166-167.
19. **Measure success POST-rake** (real bankroll). Use pre-rake only as a raw-edge diagnostic.
    Rake makes some +EV-pre-rake marginal plays -EV, so post-rake drives correct decisions.
20. **bb/100 is meaningless below ~20-30k hands per split.** Per-table/per-session bb/100 over
    small samples (18-400 hands) is pure variance. Track violations/100 + compliance% for skill.
21. **GGPoker rake: 5% all formats.** Caps differ: R&C = 3BB cap (cheaper in big pots);
    Regular = ~8BB cap. "No Flop No Drop" (~40% of hands pay $0). Jackpot 1BB on pots ≥30BB.
22. **All-In Cash Out has a 1% fee = -EV tax.** For a winning player with adequate bankroll,
    recommend OFF. User uses it ~0.06% of hands (already fine).
23. **SB opens identical range to CO** per the book (both 22.17-24.89%).

## F. STRATEGIC DIRECTION (user's plan)
24. R&C is the faster path to a meaningful sample (~290 h/table-hr vs ~97 Regular). Plan:
    R&C NL10 sprint to 15-20k hands → prove win rate → R&C NL25 → NL50. Drop Regular NL10
    (only losing split). Concentrate volume, don't split 4 ways.
25. Move up stakes only with BOTH adequate bankroll (20+ buy-ins) AND a proven win rate.

## G. WORKING NORMS WITH THIS USER
26. **Validate every claim against reality before stating it.** Never defend a position under
    pushback without re-examining it first. The user repeatedly catches genuine bugs — when he
    pushes back, he is usually right. Re-check, don't defend.
27. **Acknowledge mistakes plainly without over-apologizing.** Own it, fix it, move on.
28. Direct tone, no flattery, challenge assumptions, high diligence, concise structured output.
29. **Apps:** Tracker (single HTML, gh-pages) + Preflop trainer (React/Vite) + Postflop trainer
    (React/Vite). Preflop uses bare position labels (UTG/MP/CO/BTN/SB/BB) for villains. Postflop
    keeps "Villain (POS, type)" since type matters postflop.
30. **Preserve the weightedSample bug fix** in both trainers (compute target once before loop).

---
*Last updated: 2026-06-16. Update this file whenever a new durable principle is established.*
