# Pages of blocks — visual audit (WP-4.8)

**Scope** Tokens, both themes, Arabic/RTL, density at 1280, per this role's boundary: I rule
on operability and perception, not on full design-system conformance (that is
visual-qa-engineer's). What follows is what surfaced while proving the a11y pass; treat it as
evidence for that role, not a substitute sign-off.

**Method** `scripts/harness/pages.mjs` (existing, re-run this session) and
`scripts/harness/pages-v2.mjs` (new, this work package). Screenshots in
`scripts/harness/shots/page-{en-light,en-dark,ar-light}-{view,edit,picker}.png`,
`columns-1280-stacked.png`, `columns-1344-wide.png`. Token values resolved from
`src/styles/globals.css`, never estimated.

---

## Tokens

- **Grep clean.** No Tailwind palette class (`bg-red-500`, `text-gray-400`, etc.) in
  `src/components/pages/**` or `src/screens/pages/**` (`grep -rnE
  "\b(bg|text|border)-(red|blue|green|gray|...)-\d{2,3}\b"`, zero hits).
  No arbitrary pixel value (`grep -rnE "\[[0-9]+(px|rem)\]"`, zero hits).
- **No red badge.** `AlertStatusBlockView.tsx`'s `STATE_TONE` maps `firing` → `warning`
  (R7), never `destructive`; no `Badge tone="destructive"` anywhere in the block views read.
- **One primary per screen, confirmed live.** Both view-mode and edit-mode header
  screenshots show exactly one filled/brand button in the header (`Edit` in view mode,
  `Done` in edit mode); `Duplicate`/`Delete` are `secondary`. `PageView.tsx`'s
  `primaryAction` prop is a single object, never an array — structurally cannot mint two.
- **Callout tone tokens are functionally invisible** — already the lead finding in the a11y
  report (border-vs-page ratios 1.09–1.39:1 in both themes; effective backgrounds within 1-2
  sRGB units of the page colour). Restated here because it is also a **visual** defect
  independent of the a11y floor: the three tones (info/success/warning) are supposed to be
  visually distinct states and are not distinguishable at a glance in either theme. Root
  cause traced to source: `CalloutBlockView.tsx:17-21`'s `bg-info/10` compounds a second 10%
  onto `--tone-info` (`--ev-blue-lt`, itself documented as "`--ev-blue` at 10% on white",
  `globals.css:884`), landing at roughly 1% of full saturation. **Any fix must be
  re-measured**, not assumed: this audit's brief warns exactly against that, and it applies
  here too — swapping to `bg-info` (dropping the `/10`) lands the background at `#eaf0fe`
  itself, whose measured border-vs-white ratio (1.142:1) still fails a 3:1 floor, so the fix
  is a token/design decision, not a class-name edit. Flagged for design-token-steward.

## Both themes

Screenshotted view, edit and picker states in light and dark
(`page-en-light-*.png`, `page-en-dark-*.png`). Read both fully:

- Chart series colours swap correctly per theme (`--ev-series-*` tokens are theme-scoped;
  the pie chart's green/sage wedges and the two line-chart colours read clearly against both
  card grounds).
- The block-menu / add-block picker popover surface (`page-en-dark-edit.png` — not
  separately captured for the picker in dark, only light; see Unrun below) uses `--popover`/
  `--card`, no hardcoded white flash in dark mode was observed in what was captured.
- `overflowX` measured `0` in all three of `page-en-light`, `page-en-dark`, `page-ar-light`
  (`pages.mjs`'s own `facts` log, this session) — no horizontal scrollbar/overflow regression
  at 1440 in either theme or direction.

## Arabic / RTL

`page-ar-light-view.png`: full page-shell mirroring confirmed — the nav rail moves to the
visual right, the page content sits under it starting from the visual right edge, matching
every other Eyvar screen.

**Columns order mirrors correctly under RTL — verified by screenshot, not assumed.**
Comparing `page-en-light-view.png` to `page-ar-light-view.png` directly:
- LTR: column 0 (visual left) = "Completed trips by pickup district"; column 1 (visual
  right) = "New subscriptions by plan" (the pie chart).
- RTL: column 0 is still the *first* column in DOM/source order, but now renders at the
  visual **right** ("Completed trips by pickup district"), and column 1 at the visual
  **left** ("New subscriptions by plan") — the exact mirror. `ColumnsBlockView.tsx` places no
  explicit `grid-column` (auto-placement only), so this is CSS Grid's own RTL flow doing the
  work, not a per-component RTL branch — confirmed working rather than inferred.
This resolves the a11y report's one RTL "Unrun" item (columns order) as a **pass**, evidenced
here rather than there since it is a rendering/layout fact, not a keyboard/semantic one.

Report titles in the Arabic screenshot stay in English ("Captains vs riders · 30 days," etc.)
— correct: these are user-authored report names (data), not `pg.*` copy keys, and are not
expected to translate.

## Density at 1280

- `columns-1344-wide.png` (1344px): two columns side by side, as expected above `wide:`.
- `columns-1280-stacked.png` (1280px, **not** 1279px): still renders **two columns side by
  side**, not stacked. This is *correct* per the restated AC-1209
  (`docs/09-analytics-v2/07-acceptance-criteria.md:135`: "`wide:` is inclusive from 1280,"
  ruling O1) — at exactly 1280, the two-up layout is the right answer. **The screenshot's own
  filename is the problem, not the render**: `pages.mjs` (pre-existing, not this work
  package's file) names this shot `columns-1280-stacked`, which reads as a claim that
  stacking happens at 1280. It does not, and per AC-1209's own text should not. Flagged as a
  should-fix for whoever next touches `scripts/harness/pages.mjs`: rename the shot (or capture
  a second one at 1279, the width AC-1209 actually specifies) so a future reader does not take
  the filename as proof of something the pixels don't show. **The 1279px case itself was
  checked this session** (a one-off script, not committed, per this role's "unrun with
  reason" discipline for anything not left as a durable artefact): at 1279 the two columns do
  stack (`top` values 680 then 1192 at the same `left`, i.e. one below the other) — the
  product behaviour is correct, only the committed harness's proof of it is missing/mislabeled.
- Header density at 1280/1344 in both edit and view mode reads as intended: single-line
  title, meta line, right-aligned action cluster, no wrapping observed in any captured shot.

## Unrun

- Dark-theme add-block picker was not separately screenshotted (only light and the Arabic
  picker were captured by `pages.mjs`'s existing flow, which opens the picker only inside the
  `arabic`/default English light branch — dark skips straight from edit to done).
- Print visual conformance (ink-saving overrides, tone-carrying colour surviving print) is
  `pages-print.mjs`'s remit (WP-4.7) and was not re-screenshotted this session; its last
  recorded gate result (build log) is green and was not independently re-verified here.
- Pixel-level contrast sampling (decoded PNG bytes, as the charts-a11y note did for SVG-
  painted fills) was not performed for the callout tones — the ratios above come from
  `getComputedStyle` + canvas colour resolution + manual alpha compositing against the known
  page background, which is exact for solid/rgba colours but was not cross-checked against a
  screenshot pixel sample.

## Verdict

Token discipline is clean (no raw palette classes, no arbitrary values, no red badge, exactly
one primary). Both themes and RTL render coherently with no overflow regression. Two real
findings, both should-fix: the callout tone tint/border is visually non-functional in both
themes (same root cause as the a11y contrast failure — one finding, two audiences), and the
`pages.mjs` harness's `columns-1280-stacked.png` is mislabeled (the product itself stacks
correctly at 1279, verified this session; only the artefact's name is wrong).
