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
- Critical and High share amber → `src/lib/tone.ts:11` documents it as an R7 consequence.
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

## Known-good baselines

`tsc -b` currently **exits 1**. The error set has shifted three times across runs as the
tree moves, so **capture the output with your claim** — a bare "there are N type errors" is
stale by the time it is read.
