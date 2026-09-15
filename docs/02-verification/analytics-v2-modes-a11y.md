# Analytics v2 — funnel, retention, data table — accessibility notes (WP-3.4, Proof)

**Scope** Keyboard operability, focus visibility, accessible names, and contrast, on the
funnel cascade + step detail, the retention/cohort matrix + curve, and the `mode: 'table'`
columns view.
**Standing boundary** Keyboard, focus order and screen-reader semantics are the
accessibility-auditor's verdict, not this role's — CLAUDE.md and the role brief both say so.
What follows is evidence gathered while proving the visual surface, offered to that role
rather than ruled on — **with one named exception**: this pass's own brief explicitly
instructed checking whether a sibling of a known, already-fixed accessible-name bug
(`ReportModePanel.tsx`'s old "Add a step" → "Steps" defect) exists elsewhere in these files.
One does. It is reported below because the instruction to find it was explicit, not as a
general a11y sign-off.
**Probe** `scripts/harness/reports-funnel-step-detail.mjs` (pre-existing, re-run),
`reports-modes.mjs` (new, this pass), plus two small one-off Playwright probes for the
accessible-name check and the focus-ring measurement (not committed — the finding they
proved is committed instead, in the tables below).

---

## The explicit sibling check — F-V2-50's shape, found once more

`ReportModePanel.tsx:611-616`'s own comment names the risk precisely: a `<label for>` also
names a `<button>` (a button is labelable, same as an input), so pointing a section's label
at one specific control inside the section swallows that control's own text and announces
the section's name instead. That comment explains why `Exclude`'s `Add an exclusion` button
uses a plain, unassociated `<Label>` instead.

**`rb-cohort-return-add` was never given the same fix.**

- `ReportModePanel.tsx:796` — `<Label htmlFor="rb-cohort-return-add">{t('rb.cohort.return')}</Label>`
- `rb.cohort.return` = **"Still here means"** (`copy.ts:558`) — the section heading text,
  describing what counts as retention, not the picker's own action.
- The `Select`'s `SelectTrigger` carries `id="rb-cohort-return-add"` (`ReportModePanel.tsx:826`)
  and its own placeholder is `rb.cohort.return.add` ("Add a measure" — never read, because the
  label wins).

**Measured, not inferred**, against Chromium's own accessibility tree (Playwright
`getByRole`, which resolves names the way a screen reader does, not against raw DOM text):

| Query | Result |
|---|---|
| `getByRole('combobox', { name: 'Still here means' })` | **count 1** — the control's real accessible name is the section heading |
| `getByRole('combobox', { name: /add/i })` | **count 0** — unreachable by any name resembling its own action |

A screen-reader user tabbing through the cohort rail hears "Still here means, combo box" for
BOTH the heading's own context and the picker beneath it, with no way to tell from the name
alone that this second announcement is an interactive control that adds a return measure,
distinct from the first announcement (the section's own static label). This is the same
defect class as the fixed "Add a step" bug, unfixed here.

**Confirmed no other sibling exists** in the funnel/cohort/table files: grepped
`htmlFor="[a-z-]*-add"` across `ReportModePanel.tsx`, `ReportModeCanvas.tsx`,
`ResultTable.tsx`, `TableColumnsControl.tsx` — the only two hits are the fixed funnel one
(`rb-funnel-add`, now a comment describing the OLD, removed pattern) and this one.

**Suggested fix**, matching the pattern already used for `Exclude`: drop `htmlFor` from the
"Still here means" `<Label>` (it becomes a plain section heading, same as `Exclude`'s),
and give the `SelectTrigger` its own `aria-label` (e.g. `rb.cohort.return.add`'s own text,
"Add a measure", or a more specific `Add a return measure`) so it is reachable by a name
describing what it does.

---

## Keyboard operability

| Surface | Result | Evidence |
|---|---|---|
| Funnel step header (opens the drop-off group table) | Real `<button>` when a split is set, `aria-expanded`/`aria-controls` pair correctly; a plain `<div>` with no button semantics when no split is set — correctly, per `ReportModePanel.tsx`'s own reasoning cited in `ReportModeCanvas.tsx:403-406`: a control with no effect on activation is worse than none | `reports-funnel-step-detail.mjs`, live click-and-toggle proof |
| Drop-off group table | Reachable as a real `<table>` inside a `role="region"`; the RTL check also confirms DOM/tab order is unaffected by the visual mirror | `reports-funnel-step-detail.mjs` |
| Cohort Matrix/Curve toggle | Real `<button aria-pressed>`; focus produces a measured ring (below) | Direct Playwright `.focus()` + `getComputedStyle` probe, this pass |
| Cohort bracket `Add` button | Disabled in place (not hidden) while a candidate overlaps or is incomplete, `disabled` attribute set correctly; the reason renders as a sibling `<p>`, not a tooltip | Code-read, `ReportModePanel.tsx:992-1005`; behaviourally proven in `reportModePanel.v2.test.tsx` (re-run, passing) |
| Columns table sort headers | Real `<button>` inside each `<th>`, `aria-sort` on the `<th>` itself (sibling, not parent, of the button) — the same documented pattern that avoids the "Add a step" defect shape (`ResultTable.tsx:918-926`'s own comment: nothing but the label may sit inside the sort button) | Code-read; `resultTableColumns.test.tsx` covers the sort interaction in jsdom, sufficient since no SVG/table-layout dependency |

No keyboard trap found in any surface this pass touched.

## Focus visibility

| Control | Result |
|---|---|
| Cohort `Matrix` button, focused via `.focus()` | Real ring measured via `getComputedStyle`: `box-shadow: rgb(255,255,255) 0 0 0 2px, rgb(12,105,68) 0 0 0 4px` — a white gap ring plus the brand-coloured outer ring, not a browser default and not suppressed |
| Funnel step header, sort headers | `outline-none` paired with `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` in the class string itself (`ReportModeCanvas.tsx:327`, `ResultTable.tsx:965`) — not independently re-measured pixel-by-pixel this pass, but the class pairing is the same one just measured working on the Matrix button |

## Contrast — computed, not eyeballed

| Pair | Ratio | Verdict |
|---|---|---|
| Retention cell text (`text-foreground`) on `bg-heat-4` (the strongest fill), light theme | **14.984:1** | Comfortably clears 4.5:1 for normal text |
| "No reading" cell text (`text-muted-foreground`) on the card ground, light theme | **5.850:1** | Clears 4.5:1 |
| "No reading" cell text on the card ground, dark theme | **8.872:1** | Clears with more margin |
| `bg-heat-4` on `bg-card`, dark theme | Not independently re-measured — the dark-theme heat-4 cell did not appear in the DOM at the moment sampled (a timing/selector issue in the one-off probe, not a rendering absence: the dark matrix screenshot shows the same cells filled). The token pairing is the same mechanism proven safe in light (`--ev-series-1-lt` chains through the same `.dark` override at `globals.css:1961` that every other chart-fill token already relies on), so this is a gap in this pass's *measurement*, not a suspected failure |

**`--ghost` was not found for text anywhere in the six files this pass read** (grepped
`ReportModeCanvas.tsx`, `ReportModePanel.tsx`, `ResultTable.tsx`, `TableColumnsControl.tsx`,
`funnelSteps.ts`, `cohorts.ts`) — nothing here needs flagging for the 2.79:1 failure mode
named in this role's brief.

## Not exercised this pass

- The cohort curve's individual (non-average) cohort lines are drawn `aria-hidden="true"`
  inside a `role="img"` wrapper with one summary `aria-label` (`rb.cohort.curve.label`) — the
  per-cohort detail is not independently exposed to a screen reader, only the Matrix view's
  real `<table>` is. This is a plausible, defensible choice (the Matrix view carries the same
  numbers in an accessible form and is one click away) rather than a clear violation, so it
  is noted rather than filed — the accessibility-auditor's call.
- Full screen-reader-path walkthroughs (NVDA/VoiceOver) were not run; this pass's tooling is
  Chromium/Playwright's accessibility-tree queries, which resolve names and roles correctly
  but do not exercise an actual assistive-technology reading order.
