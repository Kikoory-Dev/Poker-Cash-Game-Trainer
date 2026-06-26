# Tracker source structure (`src/tracker/`)

The tracker (`poker-tracker.html`) is authored as **concatenated source modules**, not a
single inline blob. Edit the modules here, run the build, deploy the assembled HTML.

## Modules (concatenation order = dependency order, top → bottom)

| File | Contains |
|---|---|
| `01-config.js` | GitHub config, BIG_BLIND, PAGE_SIZE, module state (`allHands`, caches) |
| `02-data-ranges.js` | All static poker reference data: `ISSUE_EXPLAIN`, `PF_GAMEPLAN_GRID`, `HARDIN_RANGES`, steal/blind-defense ranges, `CONTINUE_VS_4BET` |
| `03-parse.js` | Hand-history parsing: `getPosition`, `classifyHand`, `extractStreetActions`, `streetContrib`, `parseHands` |
| `04-eval.js` | Hand evaluation: `pfMadeHand`, `pfDetectDraws`, `pfTierByStreet`, `pfFinalTier`, `pfVerdict` |
| `05-checks.js` | Decision checks/verdicts: `pfStealContext`, `pfBlindDefenseVerdict`, `pfGameplanVerdict`, `getHardinVerdict`, flag-meaning maps |
| `06-util.js` | `formatCards`, `filterHands`, `filterByTime`, `getEl`, `showToast` |
| `07-render-core.js` | `renderDashboard`, sessions, `buildFlagCardHtml` (shared clickable flag card) |
| `08-render-hands.js` | Hands list, `showHandDetail`, modal infra (`showModal`, `closeModal`) |
| `09-render-analysis.js` | `renderAnalysis`, positions, all violation/tier drill-downs |
| `10-render-grid.js` | Grid view, starting-hand charts |
| `11-boot.js` | `APP_VERSION`, version self-check/reload, `init()` |

## Build

```
python3 build_tracker.py    # concatenates modules into tracker_template.html → poker-tracker.html
```
The build runs `node --check` on the assembled script and aborts on syntax error.

## Rules
- **Adding a new check** → add the detector to `05-checks.js`, its label/explanation to
  `ISSUE_EXPLAIN` in `02-data-ranges.js`, and the flag key to the relevant map in
  `pfFlagMeaning`/`postfFlagMeaning`. All render surfaces (dashboard + analysis) pick it
  up automatically via `buildFlagCardHtml`.
- **Never edit `poker-tracker.html` directly** — it's a build artifact. Edit modules + rebuild.
- After build: verify version constant, run the equivalence check (all hands, identical
  flags vs previous), confirm Pages build is `built` before declaring live.
