# THE SYSTEM (v2)

A personal levelling PWA. The System measures you at first launch, places you at a rank
(E-III → S), and prescribes daily quests from a built-in, science-backed protocol library —
morning protocols, a generated fitness plan, and your own personal quests. Letter promotion
happens only at Gates: fixed fitness and consistency standards, self-reported, never adjusted.

One user, no accounts, no backend — all state lives in localStorage (`the-system-v1`,
`version: 2`; v1 blobs migrate automatically).

## Commands

- `npm run dev` — dev server
- `npm run build` — typecheck + production build (PWA assets in `dist/`)
- `npm run preview` — serve the production build
- `npm test` — unit tests for the pure logic in `src/logic/` (rank/gates/consistency/credit/schedule/assessment/migration)

## Structure

- `src/data/protocols.ts` — morning protocols, running tracks, strength/steps/rest (static, tunable design data)
- `src/data/gates.ts` — gate standards tables (M/F)
- `src/logic/` — pure, tested: XP curve, sub-ranks, two-track credit, trailing-window consistency, schedule generator (10% volume cap, 4th-week deloads), gate evaluation
- `src/motion/springs.ts` — the one motion system

## Notes

- Append `?debug` to the URL for the test panel: fast-forward days, inject MET/ATTEMPTED results, +100 XP per tap (also on the rank letter).
- Backup: Status → ⚙ → EXPORT / IMPORT (v1 export files import cleanly).
