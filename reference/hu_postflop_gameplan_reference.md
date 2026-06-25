# Heads-Up Postflop Game Plan (Hardin)

*Reference framework, added 25 Jun 2026. Encoded into the tracker's `pfGameplanVerdict`
function (v2.48) — every flopped hand is classified live against this grid, no data
migration needed since it's computed dynamically from existing fields.*

Aggression decreases top to bottom. Discipline lives in the bottom-right.
Color meaning: value, pot-control, semi-bluff, fold/give-up, **leak**.

## The grid

| | Strong | Medium | Draw | Weak |
|---|---|---|---|---|
| **Aggressor · IP** | Bet for value, 2-3 streets — build the pot, your best spot. | C-bet once, then pot-control — don't barrel, showdown-bound. | Semi-bluff c-bet — barrel turn with strong draws, position lets you take a free card. | One c-bet bluff, then give up — no second barrel without equity. |
| **Aggressor · OOP** | Bet for value, size to protect — charge draws, deny equity. | Check-call once, don't bloat — keep pot small with a marginal hand. | C-bet semi-bluff, be ready to fold — OOP draws realize less equity. | One c-bet at most, then check-fold — OOP bluffs are expensive. |
| **Caller · IP** | Raise for value, or flat to trap — profitable caller spot. | Call one street, fold to 2nd barrel — bluff-catch once, evaluate. | Call with odds, or raise semi — in position, cheap to realize equity. | Fold to the c-bet — no initiative, no equity, no continue. |
| **Caller · OOP** | Check-raise or check-call — worst spot, minimize. | **LEAK: Check-call once, then check-fold.** OOP + no initiative + medium hand = the most -EV combo in poker. | Check-call with odds, fold marginal — OOP draws realize less. | **LEAK: Check-fold, always.** No initiative, no position, no equity — there is no version of this spot where calling is right. |

## Combo-hand upgrade rule

A made hand plus a draw counts as the **higher** of the two, because the extra equity
lets you play it more aggressively:
- **Strong + draw → Strong** (a monster — bet big, get it in; the draw only adds outs)
- **Medium + draw → Draw** (semi-bluff: the pair gives backup showdown value, the draw gives the equity to bet)
- **Weak + draw → Draw** (the draw is the whole value — the weak pair is almost irrelevant)

Implemented in `pfMadeHand`: a medium/weak made-hand result is upgraded to `draw` tier
if a concurrent flush or straight draw is detected.

## Tier definitions
- **Strong**: sets, two pair, straights, flushes, full houses+, overpairs, top pair top kicker (A/K/Q)
- **Medium**: top pair weak kicker, middle pair, underpair (88 down to second-pair strength)
- **Draw**: flush draw, open-ended straight draw, strong combo draws
- **Weak**: bottom pair, tiny underpairs, no pair / whiff, overcards with no draw

## Implementation notes (tracker v2.48)

- **Role** (`pfHeroRole`): `aggressor` if `pfAction==='RAISE'` (Hero made the last preflop
  raise — has initiative), `caller` if `pfAction==='CALL'`. Limped/checked pots (no
  preflop raise) return `null` — the grid assumes a raised pot and doesn't apply.
- **Position** (`pfHeroPosition`): compares Hero's postflop acting-order rank
  (SB=0, BB=1, UTG=2, HJ=3, CO=4, BTN=5) against every villain seen acting in the
  hand's `streetActions`. Hero is IP only if his rank exceeds every villain present.
- **Leak verdict**: only the two explicitly-labeled leak cells get an auto-checked
  compliance rule (everything else is descriptive guidance, not auto-graded):
  - Caller/OOP/Weak → leak fires if Hero called **at least once** (rule says always fold)
  - Caller/OOP/Medium → leak fires if Hero called **2+ times** (rule allows one call,
    then fold to the next barrel)
  - A hand landing in a "leak cell" that Hero actually folded correctly is **not** a
    leak — verdict checks the action taken, not just which cell the hand fell into.
    (First implementation attempt got this wrong — flagged 3 correct folds as leaks
    before the call-count check was added. Verified against the live session before
    shipping: 0 false positives on 32 classified hands.)

## Validation (run against the 12,182-hand DB at deploy time)
- 1,331 hands classified into a grid cell
- 14 genuine leak instances (compliance violations, not just leak-prone cells)
- -91.68 BB total on those 14 hands — a real, separate leak from the existing
  -3,955 BB commitment leak. Some leak hands won money anyway (e.g. AKo BB +16.88,
  A9o BB +11.5) — expected, since this measures decision quality, not outcome.
