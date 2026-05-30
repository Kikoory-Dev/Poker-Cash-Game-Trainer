# Poker Cash Game Trainer

Preflop decision trainer for 6-max NLHE cash games.
Based on Hardin's TAG conservative ranges from *Master Micro Stakes Poker*.

## Structure

```
src/
  data/
    questions.json    ← Question bank. Edit this to add/fix questions.
  App.jsx             ← React app
  main.jsx            ← Entry point
index.html
package.json
vite.config.js
```

## Question format

Each question in `questions.json`:

```json
{
  "id": "unique_id",
  "level": 1,
  "category": "Open Raise",
  "difficulty": "easy | medium | hard",
  "hand": ["A♠","K♣"],
  "position": "UTG | MP | CO | BTN | SB | BB",
  "situation": "Context string shown on card",
  "question": "Full question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "explanation": "Why the correct answer is correct",
  "why_wrong": {
    "1": "Why option B is wrong",
    "2": "Why option C is wrong",
    "3": "Why option D is wrong"
  }
}
```

## Levels

- **Level 1** — Default preflop actions. No opponent reads. Pure range + position.
- **Level 2** — Coming later. Reasoning layer, why defaults exist, when to adjust.
- **Level 3** — Coming later. Exploitative adjustments.

## Setup

```bash
npm install
npm run dev
```

## Categories (Level 1)

- Open Raise — RFI ranges by position, conservative and moderate
- 3-Bet Value — Default and optional value 3-bet ranges
- Cold-Call — Gap concept, set-mining (15:1 rule)
- ISO Raise — Default ISO range, sizing formula
- Squeeze — Value squeeze sizing with callers
- Blind Defense — SB calling range, BB defend range, steal defense
