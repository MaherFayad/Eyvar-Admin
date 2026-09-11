# Agent brief — analytics v2 build

Every implementing agent reads this before its work package.

## The tree

All work happens on branch `analytics-v2` in the main working tree. Several agents run at the
same time on disjoint file sets. Consequences:

- **`git status` will be dirty with files you did not touch. That is expected. Do not stop,
  do not revert, do not `git checkout` anything, do not commit, do not branch.** The
  orchestrator commits.
- **Never run `git stash`, for any reason, not even to check something and put it back.**
  This already happened once on this build: an agent stashed to compare against `HEAD`, hit a
  conflict on pop, recovered only its own files and dropped the stash. That silently destroyed
  four other agents' work — every tracked-file edit in the tree at that moment. If you want to
  know what a file looked like at `HEAD`, run `git show HEAD:path/to/file`, which changes
  nothing.
- **Touch only the files your work package names.** If you need one it does not name, say so
  in your final report instead of editing it.
- Shared append-only files (`src/screens/reports/copy.ts`, `src/i18n/ar/reports.ts`,
  `src/data/clients/index.ts`, `src/i18n/dictionaries.ts`) may be edited by another agent at
  the same moment. Make each edit small and anchored on a unique nearby string; never rewrite
  one of these files wholesale.

## Before you report done

Run and paste the tail of each:

1. `npm run typecheck`
2. `npx vitest run <your test files>` (not the full suite; another agent's half-finished file
   may be failing)
3. `npm run i18n:check` if you touched copy or a dictionary
4. `npm run api:check` if you touched `src/data/clients/`

`npm run typecheck` may report errors in files you did not touch, from another agent working
concurrently. Report those separately; fix only your own.

## The rules that bite (from CLAUDE.md, restated)

1. Tokens only. No `bg-blue-500`, no arbitrary values like `w-[13px]`. A missing token is
   added to `src/styles/globals.css` — but only the design-token-steward does that; ask.
2. Restyle every shadcn primitive on arrival.
3. Four states per screen and per block: content, empty, loading, error.
4. Logical utilities only: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`.
5. Visible focus. `outline-none` always pairs with `focus-visible:ring-*`. Clickable things
   are `<button>` or `<a>`, never a `div` with `onClick`.
6. One primary button per screen. No red badge.
7. Every operator-facing string is a key in the owning `copy.ts` with an Arabic entry under
   `src/i18n/ar/`. No `defaultValue` literals. Run `npm run i18n:keys` after adding keys.
8. Comments: at most five lines, say what and why, cite a ruling id (`R7`, `D40`, `AC-1130`).
   No dates, no history.
9. No `TODO` in code. A deferral is a sentence in your final report.
10. Every new client function gets the endpoint docblock and a registered operation id.

## The traps

| Trap | What to do |
|---|---|
| Recharts re-renders on `mousedown`; a mark with pointer events never receives `click` in a real browser, but jsdom says it works | keep `INERT = { pointerEvents: 'none' }` on every mark; see `SeriesChart.tsx` |
| `withFallback` must be memoised or the suite hangs | copy the pattern from `ReportsScreen.tsx` |
| Radix `Select` needs `hasPointerCapture` / `scrollIntoView` shims in jsdom | copy `runGate.test.tsx` |
| `askedOf` strips `chartType` so a redraw costs no request | view-only options live in persistence, never in `ReportQuery` |
| Tailwind v4 mints a class it finds in a comment | name the parts in comments, never the class |
| Money is integer halalas on the wire, decimal SAR only in CSV and PNG captions | `formatMetric` |
| A gap is `null`, never `0` | in results, bands, metrics, agent evidence |
| A partial bucket is drawn, marked, and excluded from every comparison and alert evaluation | |
| Illegal is disabled in place with a reason, never hidden | |

## Your report

End with: files created, files modified, the commands you ran and their tails, the ACs you
proved and the test name that proves each, and anything you deferred with who owns it.
Do not write a handoff document unless your work package asks for one.
