# TASK QUEUE — open requests (most recent first)
*Auto-maintained. Check at start of each session; update as items complete.*

## OPEN
- PRINCIPLES.md rule-count discrepancy: file on main has 48 numbered rules,
  not 54 as referenced in a prior handoff. Header also says "16 Jun 2026"
  but rule 48 is dated 29 Jun. Need Bernhard to confirm whether 6 rules were
  lost, or the "54" was from a different snapshot never merged to main.
- Session tracking: awaiting next hand-history upload from Bernhard + his
  spec for new KPIs to add to the tracker dashboard beyond the existing
  scorecard (c-bet%, WTSD, W$SD, aggression factor, big-SD-loss indicator).
- Framework doc (4-street Preflop/Flop/Turn/River review scaffold, each
  street ending on "what continues against this size, does it beat me?")
  — still not built as an actual file/tool. Scope (doc vs tracker feature
  vs standalone) undecided as of 14 Aug 2026.
- Preflop trainer "Deploy to GitHub Pages" Action (deploy.yml) is
  disabled_manually, not broken — its last runs (12 Jun) were all
  successes. Per Principle 22 this is the intentional manual-deploy state,
  not an active CI bug. No action needed unless Bernhard wants it
  re-enabled (risk: could race with the tracker's own gh-pages pushes).

## DONE (recent)
- Postflop trainer mod3/mod4/mod5/mod6(9 MC Qs)/mod7/mod9 length-tell fix
  (14 Aug 2026): correct-option labels shortened to parallel length,
  reasoning moved into explanations. Verified longest-option-correct rate
  dropped from 91-100% to 0-36% across all 6 files (mod1/2/8 were already
  fixed at 25-50% baseline). Built and deployed to gh-pages
  (index-Dy4n0_Tw.js), verified live via Contents API + Pages build status.
- Postflop scorecard added to tracker dashboard (v2.35): c-bet%, WTSD, W$SD, aggression factor, big-SD-loss leak indicator
- Expanded postflop modules 2-5 with leak-focused drills (now 8/7/6/6 questions)
- Updated Module 0: added TAG-to-exploitation arc panel + new curriculum description
- Self-Verification Protocol added as section 0 of PRINCIPLES.md
- Hands tab rewired to clickable hand-review list (v2.34)
- Postflop trainer restructured into 8-module Hardin curriculum
- Postflop play analyzed vs Hardin criteria (fundamentals good; leak = overvaluing one pair)
