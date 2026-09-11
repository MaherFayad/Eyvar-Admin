# Analytics v2 — build log

Branch `analytics-v2`, started from `71ddfac` on 2026-09-11. The orchestrator keeps this file;
implementing agents do not edit it.

## Deviations from 06-execution-plan.md, and why

| Plan said | What is being done | Why |
|---|---|---|
| One branch per work package | One branch, `analytics-v2`, for the whole build | The orchestrator runs the packages itself and merges nothing; per-WP branches would buy isolation that the allowed-file lists already give |
| Four worktrees for P2, P4, P5, P6 | One tree, with concurrent agents restricted to disjoint file sets | Worktrees on Windows need a `node_modules` junction and break the main tree's dep cache (memory `worktree-agents-windows`); the risk of that outweighs the isolation, given the file sets are disjoint by construction |
| A handoff document per work package | Each agent reports to the orchestrator; this log records the outcome | The handoff chain exists to move work between sessions; there is one session |

Everything else in the plan stands, including every gate.

## Status

| WP | Owner | State |
|---|---|---|
| WP-0.1 Decisions | product-owner | destroyed by the stash incident; rerun in flight |
| WP-0.2 WP gate | utilities-engineer | done — gate + 62 manifests, 10 tests green |
| WP-0.3 Tokens | design-token-steward | done — s7/s8 in both themes, block heights, heat ramp, contrast harness green |
| WP-0.4 Copy skeletons | i18n-arabic-engineer | done — pg.* (7 keys), an.* (16 keys), both registered |
| WP-0.5 Design notes | product-designer | done — design/22-analytics-v2.md, every control specced |
| WP-1.1 Types | mock-data-engineer | done — v2 unions + 5 new type modules; 121 downstream compiles broken by design |
| WP-4.1 Markdown | utilities-engineer | done — parse+render, 151 tests, no dangerouslySetInnerHTML |
| WP-6.1 Backend scaffold | general-purpose | running |

## Findings raised during the build, for the owner

| # | Finding | Raised by | Disposition |
|---|---|---|---|
| F-V2-1 | D33 … D37 exist only as prose in `RULINGS.md`'s "Standing owner overrides", never as headed entries in `DECISIONS.md`, though the ID-namespace table says their text lives there | WP-0.1 | Backlog; not fixed in this build. The owner decides whether they get retroactive entries |
| F-V2-2 | Q-RB-3 (week start) and Q-RB-7 (alert cadence) are not in `docs/07-api/OPEN-QUESTIONS.md`; they live in `specs/06-report-builder.md`. D45 and D41 answer them but the spec still poses them | WP-0.1 | Fixed in WP-8.5 |
| F-V2-3 | `MARKDOWN_MESSAGES_EN`'s `markdown.truncated` is not registered in `src/i18n/dictionaries.ts` and has no Arabic entry, so `renderMarkdown`'s truncation notice throws in dev | WP-4.1 | WP-4.2 registers it when it wires `TextBlock` |

## Incident: the stash of 2026-09-11

An agent ran `git stash` to compare a file against `HEAD`, hit a conflict on `git stash pop`,
recovered only its own three files and dropped the stash. Dropping it destroyed every
**tracked-file** edit then in flight across four other agents. Untracked new files survived,
because a plain `git stash` does not take them.

Lost and restored: the `docs/README.md` row, the two dictionary registrations
(`src/i18n/dictionaries.ts`, `src/i18n/ar/index.ts`), the `wp:gate` line in `package.json`,
and D38 … D46 in `DECISIONS.md` and `RULINGS.md` (rerun from scratch).

Two changes came out of it:

1. `AGENT-BRIEF.md` now forbids `git stash` outright and points at `git show HEAD:path`, which
   reads a committed file without touching the working tree.
2. The orchestrator commits a checkpoint after every batch, so the blast radius of any future
   accident is one batch rather than the whole build.
