# PulseGuard — 2-Account Split & Credit Plan (for the humans)

This is for the team, not for Claude Code. It explains how to run the build across two Claude
accounts without wasting credits or stepping on each other.

## The split (by repo area, not by person)

| | Account A — Python | Account B — Frontend |
|---|---|---|
| Owns | `src/`, `api/`, `data/`, `models/` | `frontend/` |
| `CLAUDE.md` | repo root (rename `CLAUDE.backend-ml.md`) | `frontend/` (rename `CLAUDE.frontend.md`) |
| Drives | Members 1 (ML) + 2 (Backend) | Member 3 (Frontend) |
| Talks to other side via | `CONTRACT.md` + git | `CONTRACT.md` + git |

Why area-split and not person-split: ML and backend are glued together by `features.py` and the
contract, so keeping them in one context means Claude isn't re-learning the data shapes every
session. The frontend never needs to load the ML code at all. **That separation is the actual
credit saver** — each account only ever reads the slice of the repo it owns.

## Setup (once)
1. Both accounts clone the same repo.
2. Account A: rename `CLAUDE.backend-ml.md` -> `CLAUDE.md` at the repo root.
3. Account B: rename `CLAUDE.frontend.md` -> `CLAUDE.md` inside `frontend/`.
4. Put `CONTRACT.md` at the repo root (both `CLAUDE.md` files reference it).
5. Freeze the contract. From here, a field rename is a team event, not a solo edit.

## Daily rhythm
- Morning: each account pulls latest. Confirm `CONTRACT.md` hasn't drifted.
- Frontend builds against a mock of the contract; backend builds the real endpoints. They meet
  when the base URL flips — no blocking either way.
- Commit small and often. Git is the integration layer; you should almost never paste one
  account's code into the other.
- End of day: push, and post a one-line "what changed in the contract / nothing changed."

## Habits that save credits (biggest first)
1. **Lean on `CLAUDE.md`.** It loads automatically, so stop re-explaining the project. If you
   catch yourself pasting the same context twice, it belongs in `CLAUDE.md`.
2. **One scoped task per session.** "Add the time-based split to `train.py`" beats "build the
   ML pipeline." Tight asks = less reading, fewer tokens, fewer retries.
3. **Let Claude read from disk.** Point it at the file path; don't paste large files into chat.
4. **Keep each account in its lane.** Don't make the frontend account read `train.py`, or the
   Python account read `App.jsx`. Out-of-lane reading is wasted context.
5. **Commit before context resets.** A clean git state means a fresh session can pick up cheaply
   from the code instead of from a long replayed conversation.
6. **Don't ask Claude to coordinate the two accounts.** Coordinate through `CONTRACT.md` and a
   quick human message. Routing cross-account state through chat burns credits on both sides.

## The one risk to watch
Contract drift. If the backend changes a field and the frontend doesn't know, you lose an hour
at integration. The fix is cheap: any field change edits `CONTRACT.md` first, then a one-line
ping to the other account. Treat `CONTRACT.md` as law.

## Reminder on the credibility shield
The metrics on the judge-facing slide must come from REAL datasets, tagged `"real"` in
`metrics.json`. The synthetic generators are skeleton scaffolding only. This is the first
Day-1 task on Account A — do it before anything else.
