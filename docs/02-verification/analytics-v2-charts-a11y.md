# Analytics v2 chart surface — accessibility notes (WP-2.9)

**Scope** Keyboard operability, focus order and visibility, accessible names, contrast,
reduced motion, on the nine chart types, the legend, tooltip, annotations, brush and toolbar.
**Standing boundary** Keyboard, focus order and screen-reader semantics are the
accessibility-auditor's verdict, not this role's — CLAUDE.md and the role brief both say so.
What follows is evidence gathered incidentally while proving the visual surface, offered to
that role rather than ruled on; nothing here should be read as a final a11y sign-off.
**Probe** `scripts/harness/reports-v2.mjs`, run this pass against `HARNESS_BASE=
http://localhost:4327`; a small number of one-off Playwright probes (pixel sampling for
contrast, listed inline, not committed) to check impressions the harness itself does not
assert on.

---

## Keyboard operability

| Surface | Result | Evidence |
|---|---|---|
| Chart region focus + arrow-key bucket movement | **Works.** `role="group"][aria-describedby]` receives focus; `ArrowRight` moves the active bucket and the description updates (`28 May · Registered captains: 55, Registered riders: 52`) | `reports-v2.mjs` — `AC-1143` pass |
| Legend entries | **Works as real buttons.** `aria-pressed` toggles on click; hidden entry gets a struck-through label, stays in the legend rather than disappearing | `AC-1138` pass |
| Brush | **Works, and the stated `INERT` exception holds.** Dragging the traveller narrows the domain and shows the `Zoomed · reset` chip; a click on the plot surface itself still fires with no throw *after* the brush is mounted — the one documented hole in the pointer-events-none rule, proven rather than assumed | `AC-1151` pass |
| Brush edge stepping | `[` / `]` step the brush edge with the chart region focused; URL unchanged (view-only, per the `askedOf` rule) | `AC-1152` pass |
| Annotation markers | Real `<button>`s, reachable by keyboard; focus opens the same `role="tooltip"` note a mouse hover would | `AC-1149` pass — focus on the `Payment gateway outage` marker showed the tooltip |
| View menu (log scale, start-at-zero) | `menuitemcheckbox` items report `aria-checked`/`aria-disabled` correctly for the fixtures exercised (RPT-1 all-positive → log scale enabled; RPT-15 bar family → start-at-zero defaults true) | `AC-1144`, `AC-1145` pass |

No keyboard trap or unreachable control found in any surface this pass touched. Row/mark
clicks (`INERT`'s core claim — a mark never intercepts a `mousedown` a real operator would
send to the plot) were proven in Chromium, not jsdom, per the trap this role was warned about:
`AC-1131` passes with every mark computing `pointer-events: none`.

## Two `role="status"` regions — not a duplicate landmark

The trap sheet asked this role to check which of the chart's two `role="status"` regions is
which before reporting a duplicate. Read at source:

- `SeriesChart.tsx:423` — an always-present, screen-reader-only `<span role="status">`
  holding the active bucket's description, updated on arrow-key navigation (AC-1143's target).
- `ResultCanvas.tsx:345` — `<p role={stale ? 'status' : undefined}>`, the freshness sentence,
  **conditional**: it only carries the role when the result is stale enough to say so
  (`rb.canvas.stale`); otherwise it renders with no role at all.

These are two distinct live regions announcing two distinct facts (the active bucket vs.
staleness), and the second is not even always present. Not a duplicate-landmark defect.

## Contrast — computed, not eyeballed

| Pair | Ratio | Verdict |
|---|---|---|
| Annotation marker (`--chart-axis`) vs. the area-fill background beside it, light | **5.216:1** | Comfortably clears WCAG 1.4.11's 3:1 floor for a graphical object. Sampled from decoded PNG pixel bytes at the mark's exact screen position, not CSS `background-color` (the fill is SVG-painted, so a DOM-property read would have measured the wrong layer) |
| Same pair, dark | **5.867:1** | Clears with more margin |
| Chart card (`--card` / `--ev-surface`) vs. page, light | 1.036:1 value step (not a text pair; D33b's card-recess ceiling, not a contrast ratio) | Matches the token layer's own documented value (`globals.css:319,337`) |
| Legend struck-through hidden entry text | Not independently measured this pass | `text-muted-foreground` + `line-through`, same ink as every other muted-foreground use already measured elsewhere in the token file (`--ev-text-2`, 4.6–5.9:1 depending on ground per `globals.css`'s own table) |

**`--ghost` was not found in the chart surface files at all** (grepped
`src/components/reports/`, `src/screens/reports/`) — nothing here needs flagging for the
2.79:1 failure mode named in this role's brief.

## Reduced motion

`globals.css:1238` collapses every CSS animation/transition to 1ms globally — component code
does not need its own branch, per `motion.md`. Recharts' own JS-driven draw-in animation is a
**separate** mechanism the global CSS rule does not touch, so it was checked directly:

- Every `<Area>`, `<Bar>`, `<Line>` in `SeriesChart.tsx` (lines 445, 460, 493, 508, 549, 566,
  680) sets `isAnimationActive={false}`.
- Every mark in `PanelChart.tsx` (lines 345, 363, 399, 406) does the same.

No chart-surface animation depends on `prefers-reduced-motion` being separately honoured,
because none of them run a JS animation to begin with, in either preference state. This is a
clean result across the whole surface, not a per-chart spot-check.

## Accessible names

Sampled toolbar controls (`ChartToolbar.tsx`) all carry `aria-label` from a copy key rather
than an icon-only guess: `rb.toolbar.createAlert` (the bell), `rb.canvas.error.retry` (the
refresh glyph), `rb.toolbar.compare.clear`. The alert bell's disabled state pairs
`aria-describedby` with a visible reason paragraph (`ChartToolbar.tsx:296,302-306`) rather
than disabling silently — "illegal is disabled in place with a reason" held here.
`ReportBuilder.tsx`'s overflow trigger (`aria-label={t('shell.moreActions')}`) and title/
description fields (`aria-label={t('rb.title.label')}`, `rb.description.label`) follow the
same pattern.

Not independently re-verified this pass: the full accessible-name sweep of every toolbar
button (pin, ask-the-analyst, version history) and the segment/formula rail controls — these
have dedicated vitest coverage (`formulaField.test.tsx`, `segmentPicker.test.tsx`,
`windowControl.comparison.test.tsx`, `builder.overflow.test.tsx`), re-run this pass as a
sanity check: **60/60 passing** across those four files plus `builder.chrome.test.tsx` and
`export.test.ts` (`npx vitest run … --maxWorkers=4`, this session).

## What this role did not check

Per the stated boundary, focus **order** across the full rail (formula → transform → split →
segments → window → chart type) and full screen-reader semantics (landmark structure, live
region announcement timing beyond the two `role="status"` regions above) were not audited
here. Refer to accessibility-auditor for the binding verdict on those.
