# Verifying a claim

Source: the three-way audit reconciled in `design/17-reconciled-findings.md` §3. That
section exists because **nine claims across three independent audits were wrong**, and the
wrong ones were not obviously wrong — each was produced by a competent pass and read as
credible.

This file is the standard for reporting a defect in this codebase.

## The rule

**A grep is a lead, never a finding.** Every claim carries the artefact that would change if
you were wrong: a file and line you have read, a computed number, or a command with its
output. "I searched for X and found nothing" is not evidence that X is absent — it is
evidence about your pattern.

## The four ways a claim goes wrong here

**1. Counting a word instead of tracing a seam.**
Claim: *"five financials screens have no loading state."* All five forward
`status={…}` into `DataTable` (`revenue:203`, `payouts:632`, `cash:599`, `wallets:499`,
`pricing:244`). The grep counted the literal word "loading" in files that correctly delegate
it. **Follow the prop to where it lands.**

**2. A verification narrower than the claim.**
Claim: *"DataTable is clean of palette classes."* The verifying grep listed a palette set
that omitted `rose` — and `rose` is exactly what is there (`:848`, `:1215`, `:1257`). A
correction produced by a narrower check than the original is worse than the original.
**Verify with a wider net than the claim, never a narrower one.**

**3. Reporting a documented decision as an oversight.**
Three separate audits did this:
- `--chart-series` and `--chart-comparison` share a colour → deliberate, R7:
  *"differs by DASH, never by hue."*
- Critical and High share amber → the tone map's own comment documents it as an R7 consequence.
- `AR: Dictionary = {}` → `dictionaries.ts:6–27` explains it as the AC-74 fixture.
- Dispatch's hardcoded `42s` / `96.4%` / `78.2%` → already tracked at `:469` with a
  mitigation.
**Read the comment above the line before calling the line a defect.** A design critique of a
deliberate decision is legitimate; framing it as an oversight is not, and it destroys trust
in the rest of the report.

**4. The obvious fix failing the same test the defect failed.**
The critical-row ground fails AA at **4.40**. Swapping it for `--ev-red-lt` gives **4.35** —
worse. **Compute the ratio for your fix, not only for the defect.** Same for row counts,
column widths, and bundle size: measure the after, not just the before.

## What only running the app can find

The static passes missed all three of these, and they were the highest-severity findings:

- 60px row pitch on every non-ledger table
- the identity column collapsing to 38px at 1280 and 0px at 1152
- Arabic timestamps rendering reversed

**If a claim is about density, layout, or how something reads, open it.** `npx vite --port
5199`, then Playwright. Grep cannot see a screen.

## Reporting

- Rank by **what an operator hits**, not by how easy it is to fix.
- A claim you could not verify is marked **unverified, with the reason** — not dropped, and
  not promoted.
- When you refute a claim, say what produced it. "Not a defect" is not useful; "not a
  defect — `tone.ts:11` records it as deliberate under R7" ends the question permanently.
- Correct in place. A doc that carries a wrong finding plus a later correction elsewhere
  will be read wrong by the next person.

## `src` is clean is not `dist` is clean

**Tailwind v4 scans comments as plain text and mints the classes it finds there.** A grep
of `src/` for palette classes, physical direction utilities or arbitrary values checks the
code. It does not check the stylesheet you ship.

Measured on this repo, and the shape of it is worth keeping:

- `.mr-auto` and `.ml-auto` were shipping in `dist` — **physical** margin rules, in a
  product where every inset is logical — emitted from a comment that *warned against
  physical margins*. The defect performing itself.
- `text-[10px]` and `text-[11px]` rules were shipping from a comment in `DispatchScreen`.
- `bg-rose-50/95` is still emitted from prose in `DataTable.tsx`, long after the class
  itself was replaced by a token.

`globals.css` already carries `source(none)` plus two `@source` lines for exactly this
reason — automatic detection was harvesting the banned patterns out of `docs/`. The same
mechanism reaches every comment in every scanned `.tsx`.

**So: name the parts, never the token.** Write "the rose-50 tint at 95%" as words. And when
you audit for off-system values, grep the **built CSS**, not the source — it is the only
place this is visible.

## Measure on a quiescent tree, or do not measure

Added after a run in which eleven agents worked this repo concurrently, partitioned by file
so none could overwrite another. The partitioning worked. **It protected the files and it
did nothing for the measurements**, which is the failure worth recording:

- `tsc -b --force` returned 40+ errors, then 0, then 0, within minutes — the first run had
  caught a file mid-write.
- Two consecutive `npm test` runs failed **disjoint sets** of suites.
- `globals.css` was briefly broken by a comment containing `*/` inside a `**/*` glob, which
  ends the comment early. Dev served a **white page behind an HMR overlay** — and several
  agents were running Playwright at that moment. A screenshot of a blank page is evidence
  of nothing, and it looks exactly like evidence of something.

So: before quoting a number, establish that nothing else is writing. If you cannot, say the
number is provisional. A measurement taken during churn is not a weaker measurement, it is
a different file's.

Two more from the same run, both cheap to remember:

- **`tsc` cannot see CSS.** A green typecheck says nothing about whether the app builds.
  Run the build.
- **A test that passes alone and fails in the suite is a wait budget, not a defect** — the
  signature is that the failing set changes between identical runs. On this machine the
  default worker count yields **2–6 failures with different membership each run**, all of
  them 7–13s "element never rendered" timeouts. **`npx vitest run --maxWorkers=4` is a
  clean 3061/3061.** Use it before you go looking for a logic bug.

## Known-good baselines

Established 2026-09-02 on a quiescent tree, every figure reproduced:

| Gate | Result |
|---|---|
| `npx tsc -b --force` | **exit 0** |
| `npm test` | **3061 / 3061**, two consecutive full runs |
| `npx vite build` | green |
| `npm run api:check` | exit 0 — 284 endpoints |
| `npm run i18n:check` | exit 0 — 4,665 keys, **0 `defaultValue` at ceiling 0** |

Anything short of that is a regression, and it now has a name to be measured against.
**Capture the output with your claim** — an earlier baseline of "`tsc -b` exits 1" was true
when written, shifted three times in forty minutes, and was stale by the time it was read.
