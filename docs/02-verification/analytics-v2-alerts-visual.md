# Alerting v2 — visual audit (WP-5.7 Proof)

**Scope** Tokens, both themes, Arabic/RTL, density at 1280, per this role's boundary: I rule
on operability and perception where it surfaced while proving the qa/a11y passes, not on
full design-system conformance (that is visual-qa-engineer's). Treat this as evidence for
that role, not a substitute sign-off.

**Method** `scripts/harness/alerts-v2.mjs` (existing, re-run this session — 4 theme/language
combinations of the rules-table sparkline and the composer preview) and
`scripts/harness/alerts-v2-proof.mjs` (new, this work package — the three G15 entry points,
the no-baseline refusal state, and a computed-colour red scan). Screenshots in
`scripts/harness/shots/`. Token values resolved from `src/styles/globals.css` and the
computed styles the browser actually painted, never estimated.

---

## Tokens

- **Grep clean.** No Tailwind palette class (`bg-red-500`, `text-gray-400`, etc.) and no
  arbitrary pixel/rem value in any alert-owning component (`src/screens/reports/Alert*.tsx`,
  `src/components/reports/AlertPreviewChart.tsx`, `src/components/pages/blocks/
  AlertStatusBlockView.tsx`, `src/data/types/alert.ts`) — checked this session, zero hits on
  both patterns.
- **No red badge, live-confirmed.** A computed-colour scan (not a class-name grep) walked
  every element on both the Rules tab (including the seeded `firing` row, ALR-1) and the
  Firings tab in light mode and found zero elements with a saturated-red `color`,
  `background-color`, `border-color`, `fill` or `stroke` (`rulesTabRed: []`,
  `firingsTabRed: []`, `proof-run.log`).
- **Logical directions only.** No `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-` utility in any
  alert-owning file — checked this session, zero hits (one unrelated comment string matched
  "right-to-left").
- **Preview chart's axis is deliberately LTR-pinned inside an RTL page**
  (`AlertPreviewChart.tsx:83-84`, `dir="ltr"`), matching the codebase's stated rule that a
  time series never mirrors. Confirmed live in the Arabic screenshot
  (`alerts-v2-light-ar-composer-preview.png`): the series still reads left-to-right (rising
  from May into June) while every surrounding label and control is RTL.

## Both themes

Screenshotted the rules table and the composer preview in light and dark
(`alerts-v2-{light,dark}-en-*.png`). Read both fully:

- The threshold reference line (`--chart-axis`, dashed) and the fired marks
  (`--color-warning-graphic`) are legible against both card grounds; `markFills` reported
  exactly one fill value in every run — no stray colour.
- `overflowX: 0` in every one of the four theme/language captures
  (`alerts-v2.mjs` facts) — no horizontal scroll introduced by the composer or the table at
  1280.

## Arabic / RTL

- **No mirrored chart, correctly** — see "Tokens" above.
- **`overflowX: 0` in both `light-ar` and `dark-ar`** — the composer's own layout does not
  overflow under RTL at 1280.
- The composer's field order visually mirrors (labels on the trailing side of their controls,
  segmented controls right-to-left) in `alerts-v2-light-ar-composer-preview.png` — consistent
  with the rest of the reports screens' RTL handling, not independently re-derived from CSS
  here.

## A defect found while proving the qa pass: a clipped placeholder in the anomaly form

Opening ALR-9's (anomaly kind) edit composer and reading the **Lookback** field
(`proof-no-baseline.png`) shows the placeholder text visibly cut off mid-word: **"Uses the
la"** where the full sentence is "Uses the last 28 buckets"
(`copy.ts:1479`, `rb.alert.anomaly.lookback.placeholder`).

Root cause, read at `AlertRuleDialog.tsx:670-681`: the `Input` is `className="w-24
tabular-nums"` — a fixed 96px width sized for the short *typed* value (an operator overriding
the lookback with a number like `28`), but the **placeholder** it shows by default is a full
sentence, not a number. The field is correctly narrow for its typed content and wrong for its
placeholder content — these are two different text budgets sharing one box.

This reproduces in plain English, at 1280, in light mode — it is not an Arabic
pseudo-locale-budget problem, it is a mismatch between the control's width and its own
placeholder copy's length. Every operator who has not memorised the default lookback (28 for
`day`, 12 for `week`, 6 for `month` — `04-alerting-v2.md` §2) cannot read what it is from this
field.

**Severity: should-fix.** Not blocking — the field still functions (typing a number still
works, and `rb.alert.anomaly.method`'s sentence just below explains the estimator in prose),
but the one place the UI was supposed to state the concrete default number is the one place
that number is invisible.

**Suggested owners:** frontend-engineer (the field width or a shorter placeholder key) or
copy — flagging to both handoff targets since either fix resolves it and I do not own either
file.

## One primary per screen

Confirmed live in every screenshot captured this session: the rules table, the firings feed
and the open composer each show exactly one filled/brand-toned button (`Save rule` in the
composer; no second primary anywhere on the alerts surface itself). Not re-derived from a
component prop the way `analytics-v2-pages-visual.md` did for `PageView.tsx`'s
`primaryAction` — this is a screenshot read, not a code read, for this document.

## Coverage gaps

- **Dark-mode Arabic RTL entry-point screenshots** (the bell, the unsaved-name prompt, the
  page-block-menu composer) were captured only in light/English this session
  (`proof-entry-*.png`). `alerts-v2.mjs`'s own four-combination sweep covers the rules table
  and the composer preview in all four, but not the three new G15 entry-point flows this WP
  drove — a future session should add `dark`/`ar` contexts to
  `checkEntryPoints()` in `alerts-v2-proof.mjs`.
- **Density at 1280 for the Lookback-field defect above** was read from one screenshot; pixel
  measurement of the actual clip point (character count vs. box width) was not taken — the
  screenshot is unambiguous enough that a ruler was not needed to call it a defect, but a
  precise "fix to N px" number is not offered here; that is a design-token-steward or
  frontend-engineer sizing decision.
- **Full D33/D34 shadow-and-recess conformance** (card elevation ceilings) was not
  independently re-measured this session — out of the time budget, and it is
  visual-qa-engineer's primary charge, not mine, per this role's stated boundary.
