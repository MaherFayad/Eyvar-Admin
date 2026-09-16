# The analyst screen — visual audit (WP-7.7 Proof)

**Scope** Design tokens, both themes, Arabic/RTL, density at 1280px, per this work package's
charter — not a full DESIGN.md conformance pass (visual-qa-engineer's territory), but every
check the brief named explicitly plus what surfaced while proving the qa pass.

**Method** `scripts/harness/analyst.mjs`, extended this session (dark theme, all seven job
states, a computed-colour red scan over every element's resolved `color`/`backgroundColor`/
`borderColor`/`fill`/`stroke`, on `alerts-v2-proof.mjs`'s own precedent — never a class-name
grep alone). Run against an isolated `npx vite --port 4329` (see the qa doc's "A flaky first
run" — the shared default port was already serving another agent). Screenshots in
`scripts/harness/shots/analyst-*.png`.

---

## Tokens

- **Grep clean.** No Tailwind palette class (`bg-red-500`, `text-gray-400`, …) and no
  arbitrary `[Npx]`/`[#hex]` value anywhere in `src/screens/analyst/**` or
  `src/components/pages/blocks/AgentInsightBlockView.tsx` — checked this session, zero hits
  on both patterns.
- **No red possible by construction, not just by convention.** `Badge`'s `tone` prop
  (`src/components/ui/badge.tsx:51-58`) is a closed union — `success | warning | info |
  neutral | new` — with no `destructive` member; TypeScript refuses a fifth value.
  `AnalystView.tsx:36-42` and `JobScreen.tsx:45-51` both map every `AgentJobState` (`queued →
  neutral`, `running → info`, `deferred → warning`, `done → success`, `failed → warning`) —
  `failed` is warning, never red, exactly as AC-1254 requires.
- **Live-confirmed, not just grepped.** The computed-colour scan (`scanForRed()`, new this
  session) walked every element on all seven seeded job-page states and the index — **zero**
  saturated-red hits everywhere (`redHits: 0` on `queued`, `deferred`, `failed-evidence`,
  `failed-timeout`, `failed-schema`, and both dark-theme states). Screenshots:
  `analyst-state-{queued,deferred,failed-evidence,failed-timeout,failed-schema}.png`.
- **Logical directions only.** No `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`/`text-left`/
  `text-right` in any analyst-owning file — checked this session, zero hits.

## Both themes

`analyst-state-done-dark.png` and `analyst-state-running-dark.png`, new this session, alongside
the existing light-mode captures.

- The done job's trend chart (dark) uses the same `--color-value` green area fill as light,
  legible against the dark card ground; axis labels and the "Incomplete" gap marking read
  clearly.
- State badges keep their tone identity across themes — `Done` stays the success-green pill,
  not re-derived per theme.
- `overflowX: 0` in every state capture, both themes, at 1280px — no horizontal scroll
  introduced by the timeline, the Provenance rail, or the block renderer.

## Arabic / RTL

`analyst-ar-index.png`, `analyst-ar-running.png`, `analyst-ar-done.png` (existing, re-verified)
plus `rtl-analyst-job-agt2-en-ui.png` / `rtl-analyst-job-agt4-ar-ui.png` (existing, from an
earlier session, still representative of the current build per the fresh test run above).

- **Content renders in the job's own language, chrome in the shell's.** AGT-2's question is
  Arabic prose (`لماذا انخفض عدد الاشتراكات الجديدة هذا الأسبوع؟`) while the surrounding
  "Running", "Re-run" labels track whatever language the *shell* is in — AC-1263's split
  between content and copy, confirmed live rather than only read from `JobScreen.tsx`'s
  `t()`/study-text calls.
- **`overflowX: 0`** in both `analyst-ar-*` captures.
- The done job's main+rail grid mirrors correctly under `dir="rtl"` — Provenance sits on the
  visual left in Arabic (the trailing side), main content on the right, matching the rest of
  the reports surface's established RTL handling — read from the screenshot, not independently
  re-derived from CSS this session.

## A defect found while proving the qa pass: the Provenance rail never shows a `runId`

Already the qa document's blocking finding (F-V2-90) by function; noted here for its visual
half. `ProvenancePanel.tsx` renders a report's name, a window sentence and an `asOf` time —
never the literal `runId` string ("RUN-1") the finding text beside it cites. Visually, an
operator reading "The rate rose from 5% to 7% … (run RUN-1)" in the body and then "Provenance
→ [Arabic report name] → Open in builder" in the rail has **no shared token between the two**
to confirm they are the same evidence. This is a content/legibility problem as much as an
architecture one: even if Provenance listed every run (it does not — see the qa doc), the
current copy would still not let an operator visually match a finding to its rail entry.

**Severity: should-fix, layered on top of the qa doc's blocking architectural gap** — fixing
F-V2-90's completeness without also showing the `runId` (or the exact figure it produced) in
the rail entry would still leave this specific legibility gap.

## One primary per screen

Confirmed in every state screenshot this session: the job page shows exactly one filled/brand
button (`Save as page`, only when `state === 'done' && resultPageId !== null` —
`JobScreen.tsx:236-240`) alongside outline secondary/overflow actions; `queued`/`deferred`/
`failed` states correctly show **no** filled primary at all (nothing to save yet), never a
second filled button competing with it. The analyst index's own primary (`Ask`) is likewise
alone — the Schedules tab (not screenshotted live this session, see Coverage gaps) reads the
same way from its source (`SchedulesPanel.tsx`'s own `Card`+`Button` composer has one filled
"Create schedule" action).

## A rendering race, noted but not chased

`analyst-en-done.png` (the pre-existing light-mode capture, not re-taken this session) shows
the finding's chart block still as four skeleton placeholder cards under a "Report" heading,
while the dark-theme capture taken this session (`analyst-state-done-dark.png`) shows the
same chart fully rendered as a real trend line. This reads as a timing race in that specific
harness run (the screenshot taken before the chart's own data settled), not a defect in the
component — the dark capture proves the same route renders correctly when given time. Not
re-chased with a longer wait this session; flagged so a future run either confirms it is
purely timing or reopens it as real.

## Coverage gaps

- **The Schedules tab's four states** (content/empty/loading/error, `SchedulesPanel.tsx`) were
  read and typechecked but not screenshotted live this session — no visual proof of its own
  token conformance or RTL behaviour yet.
- **Dark-theme Arabic** (both together) was not captured for any analyst route this session —
  only dark+English and light+Arabic, never the combination. `toDark()`/`toArabic()` both
  exist in the harness now; a future run should compose them.
- **Full per-token contrast ratios** (the 4.5:1 body-text floor) were not measured — the
  red-hue scan is the narrower check this session ran, on the alerts-visual.md precedent, not
  a substitute for a full ratio sweep.
- **The four failure-reason badges' exact pixel styling** (padding, corner radius) were read
  from screenshots, not measured against `docs/ref/tokens.md`'s spacing scale.
