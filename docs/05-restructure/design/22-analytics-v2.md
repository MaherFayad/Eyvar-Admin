# Analytics v2 — design notes (WP-0.5)

Every implementing agent in phases 2–7 builds from this file. It is a control catalogue, not
a screen-by-screen mock: each of the 24 controls named in `AGENT-BRIEF.md`'s work packages
gets its own numbered section with tokens, states, keyboard behaviour, RTL behaviour and
final copy. Nothing here is a placeholder.

**Route context.** `management-reports`, unchanged. **Pattern** (existing, ratified):
**Query builder** — a persistent composition panel at the inline-start beside a result
canvas that re-renders on an explicit run (`docs/05-restructure/design/07-rulings-r4.md`
§2.3; shape 2 with the rail leading, `--ev-detail-rail-w`, never dropped at `wide:`). A page
of blocks (`?view=pages`) is **Index table** for the list and a new fifth shape is **not**
minted for the page itself — `PageView` is single column, capped at the content width, per
`03-pages-and-dashboards.md` §3. The analyst's job list is **Index table**; the job page is
**Main + rail** (timeline main, provenance rail) — see §7.2.

**Source read.** `AGENT-BRIEF.md`; `02-report-builder-v2.md` §2–§4; `03-pages-and-
dashboards.md` §5; `04-alerting-v2.md` §4; `01-analyst-agent.md` §4; `docs/ref/patterns.md`;
`docs/ref/tokens.md`; `docs/05-restructure/design/financials-rider-wallet-ledger.md` (house
format); `src/components/reports/QueryPanel.tsx`, `ChartToolbar.tsx`, `WindowControl.tsx`,
`ResultCanvas.tsx` (current state, read whole or in relevant part); `src/screens/reports/
AlertRuleDialog.tsx`, `AlertsView.tsx`; `docs/05-restructure/specs/06-report-builder.md` §5.2,
§8; `src/components/icons.ts`, `src/components/ViewTabs.tsx`, `src/components/metrics/
Sparkline.tsx`, `src/components/InfoHint.tsx`, `src/components/ui/badge.tsx`; `src/styles/
globals.css` (chart, tone, elevation and live-pulse tokens).

## Table of contents, against the brief

| # | Control (as named in the work packages) | Section |
|---|---|---|
| — | Formula field (expression, A/B chips, parse error at a position) | §1.1 |
| — | Segment picker (≤4, saved or inline, eight-hue ramp) | §1.2 |
| — | Transform controls (cumulative, rolling average, percent of total) | §1.3 |
| — | Window control's new presets and fixed-comparison mode | §1.4 |
| — | Comparison-display toggle | §1.5 |
| — | Legend as buttons (struck-through hidden entry, isolate) | §2.1 |
| — | The v2 tooltip | §2.2 |
| — | `View` menu (log axis, start at zero, data labels, label density) | §2.3 |
| — | Annotation marks and the inline annotation form | §2.4 |
| — | The brush and its reset chip | §2.5 |
| — | Block frame (selected, handle, menu) | §3.1 |
| — | Add-block picker | §3.2 |
| — | Slash command | §3.3 |
| — | Columns width control | §3.4 |
| — | The four report-block heights | §3.5 |
| — | Inline alert-rule panel | §4.1 |
| — | Each condition kind's fields | §4.2 |
| — | Preview chart (marks where the rule would have fired) | §4.3 |
| — | Channel picker | §4.4 |
| — | Mute menu | §4.5 |
| — | Lag state | §4.6 |
| — | Ask composer | §5.1 |
| — | Job timeline | §5.2 |
| — | Provenance panel | §5.3 |
| — | Runner-offline state | §5.4 |

Every row above has a section. Nothing was folded into another without a cross-reference.

## Tokens this spec depends on and does not mint

I do not own `globals.css`; every token below is either **already shipped** (cited with its
line) or **requested of design-token-steward**, never invented here.

| Token | Status | Used in |
|---|---|---|
| `--chart-s1`…`--chart-s6`, `--chart-fill-s1`…`-s6` | shipped (`globals.css:2668-2694`) | §1.2, §2.1 |
| `--chart-s7`, `--chart-s8` + fills | **requested, blocked on D40 (owner)** — see the open question at the end of §1.2 | §1.2, §2.1 |
| `--chart-axis`, `--chart-fill` | shipped (`globals.css:2649-2650`) | §2.2, §2.4, §4.3 |
| `--color-warning-graphic` (amber ink, `--ev-amber`) | shipped (`globals.css:2435`) | §1.2 (ceiling flag), §4.3, §4.6 |
| `--animate-live-pulse` / `--ev-live-loop` | shipped, **unconsumed today** (`globals.css:2939`, `:1759`) | §5.4 (first real use) |
| `--ev-detail-rail-w` | shipped (`globals.css:1705`) | §1 (rail width, unchanged) |
| `--ev-block-h-s/m/l/xl` (375/500/625/750px) | **requested** — new, per `03-pages-and-dashboards.md` §2 | §3.5 |
| `--ev-heat-1`…`-4` (opacity steps on `--chart-fill-s1`) | **requested**, for retention v2 (out of this spec's scope, noted for completeness) | not used here |

Nothing in this spec introduces a raw hex, a Tailwind palette class or a pixel literal
outside these named tokens.

---

# 1 — Report rail v2 (`QueryPanel.tsx`)

The rail keeps its §5.3 order and its rule: every control disabled in place with a reason,
nothing hidden (D9 CQ-3), one primary (`Refresh`, unchanged). Five new rows join the existing
nine, in the order the question composes:

```
1 Measure                (existing)
2 Measured as             (existing, F-1 shown only when options.length > 1)
3 Second measure          (existing)
  ── NEW ──
4 Formula                 §1.1 — references 1 and 3
5 Transform               §1.3 — depends on 4 when set, else on 1
  ── existing, renumbered ──
6 Split by
  ── NEW ──
7 Segments                §1.2 — composes with 1, 3, 6
  ── existing ──
8 Filters
[Refresh]
```

`ChartToolbar` gains one control (§1.5) beside the existing four; `WindowControl` gains two
presets sets and a fixed-comparison branch (§1.4).

## 1.1 Formula field

**What it is.** A single-row text field under the two measure pickers, active only once at
least one measure is chosen. It replaces the plotted series with the formula's derived
series when non-empty (§2.2 of the plan doc); it does not replace the measures in the rail.

**Layout**

```
Formula                                                    ⓘ
┌──────────────────────────────────────────────────────┐
│ A / B × 100                                            │
└──────────────────────────────────────────────────────┘
 A · Gross fares            B · Completed trips
Position 6: expected a number, a measure or a bracket.
☐ Show A and B too
```

**Tokens / components.** `Label` + `InfoHint` (existing pattern, sibling of the label, never
a child). `Input` (`h-control`, `border-input`, `rounded-control`), **monospace numerals**
(`tabular-nums font-mono text-sm`) so `A`, `B` and the operators sit on a fixed grid — the
only field in the rail that takes `font-mono`, because it is the only field whose content is
a small grammar rather than prose. The two reference chips are **not** `Badge` (badges are
reserved for lifecycle state, R7/§12.1): each is a `<span>`, `rounded-control` (not the 4px
badge radius — these are not status pills), `border border-border`, `bg-muted`, `px-1.5
py-0.5`, `text-xs`, holding a 2px `Swatch`-style dot in the measure's series hue
(`--chart-s1` / `--chart-s2`) followed by `A · <bdi>{measure label}</bdi>` (truncated, full
label as the chip's `title`). When no second measure is chosen the `B` chip renders at
`text-muted-foreground` with `B · not set` and no dot. The parse-error line is a plain
paragraph, `text-xs text-destructive-foreground`— no: **destructive red is reserved for the
four R5a uses** (a button, one page banner, a row marker, a map pin); a field error is not
one of them, so it renders `text-xs text-warning-foreground` is also wrong (warning is a
*status* tone). A field error in this product's own convention (`copy.md` rule 8) is plain
body text at `text-xs text-muted-foreground` **plus** the `aria-invalid` / `aria-describedby`
wiring that makes it a real error to assistive tech — colour is never the only carrier here,
words are. `Refresh` is disabled by the same `plan.violations` mechanism as every other
field-level violation.

**States**

| State | Shown |
|---|---|
| Content, no formula | Empty input, placeholder `A / B × 100`, `A`/`B` chips shown, no error line |
| Content, valid formula | Chips shown, no error line, `Show A and B too` checkbox enabled |
| Empty (no measures yet) | Field disabled in place; `InfoHint` reads `rb.control.disabled.unstarted` (existing key) |
| Loading | N/A — this field has no request of its own; it is inert while `catalogueStatus === 'loading'`, same as every other rail control |
| Error — parse | Red is not used (see above); `aria-invalid="true"`, error paragraph shown, `Refresh` disabled |
| Error — unknown ref | Same treatment, `rb.violation.formulaUnknownRef` |
| Error — unit mismatch | `rb.violation.formulaUnit` |
| Disabled — `CUMSUM` needs additive | `rb.violation.formulaNeedsAdditive` |
| Disabled — `PCT` needs a split | `rb.violation.formulaNeedsSplit` |

**Keyboard.** Standard text input; `Tab` reaches the field, the checkbox, then `Split by`.
The reference chips are **not** focusable — they are read-only context, not controls (a
focusable element with nothing to activate is a trap). The parse error is associated via
`aria-describedby` so a screen-reader user hears it the moment they land on the field, not
only when they find the paragraph below.

**RTL.** The expression itself is a **code string**, not prose — per `rtl.md`, "code / query
editors: No, syntax is LTR by specification." The input therefore carries `dir="ltr"`
unconditionally, same as a phone number or an IBAN field, with `text-start` so it still opens
at the reading-order edge of an RTL form. The chips and the label mirror normally (they are
chrome, not code).

**Copy**

| Key | English |
|---|---|
| `rb.control.formula` | Formula |
| `rb.control.formula.placeholder` | A / B × 100 |
| `rb.control.formula.hint` | Combine measures A and B. Use ROLLAVG, CUMSUM, DELTA or PCT to shape one. |
| `rb.control.formula.refA` | A is {measure} |
| `rb.control.formula.refB` | B is {measure} |
| `rb.control.formula.refB.unset` | B is not set |
| `rb.control.formula.showParts` | Show A and B too |
| `rb.violation.formulaParse` | Position {position}: expected {expected}. |
| `rb.violation.formulaUnknownRef` | Add a second measure to use B in this formula. |
| `rb.violation.formulaUnit` | A and B use different units and cannot combine this way. |
| `rb.violation.formulaNeedsAdditive` | CUMSUM needs a measure that adds up, like a count or a total. |
| `rb.violation.formulaNeedsSplit` | PCT needs a split, so there is a group to take a share of. |

## 1.2 Segment picker

**What it is.** Up to four population filters, each becoming a multiplier on the series
count (measures × segments × groups). A segment is **saved** (a named, shared population) or
**inline** (built once, for this report).

**Layout**

```
Segments                                                    ⓘ
[● Riyadh riders  ✕] [● New this month  ✕]        [+ Add segment]
```

Empty (no segments — the default, "everyone") shows only the `Add segment` button, no chip
row — segments are additive context, not a required field, so an empty list is not an "empty
state" under `states.md`; it is simply the unset default and needs no sentence.

**`Add segment`** opens an inline `Popover` (never a dialog — this is a rail control, same
surface class as the filter and window pickers) with two sections stacked, not tabbed, so
the operator sees both without a click:

```
┌ Saved segments ──────────────────────────┐
│ 🔍 Search…                                 │
│  Riyadh riders                             │
│  New this month                            │
│  Lapsed corporate riders                   │
├ New segment ───────────────────────────────┤
│ Name  [________________]                   │
│ Filters   [same Filters sub-control as §4] │
│ Performed  ☐ at least ▾ [3] times in       │
│            [each bucket ▾]                 │
│                            [Cancel] [Add]   │
└─────────────────────────────────────────────┘
```

**Tokens / components.** The saved-segment list is a `Command` (the same combobox primitive
`rb-measure`'s typeahead conventions come from), `size-4` `SearchIcon` leading. The new-
segment form reuses `Input` for the name, the existing `Filters` sub-component (byte-
identical `FilterSpec` vocabulary — no second filter model, per `02-report-builder-v2.md`
§2.5) and a `performed` row: a comparator `Select` (`at least` / `at most` / `exactly` — the
words for `gte`/`lte`/`eq`), a numeric `Input` (`w-14`), and a window `Select` (`each bucket`
/ `in the last {n} days`, the second opening a small inline number field). The `performed` row
is **disabled in place** — not hidden — when the chosen filters' resource has no matching
subject-level measure, with the reason `rb.control.segments.performed.unsupported`. Each
chip: `Swatch` dot (2×8px line, matching the legend's own mark) in the segment's assigned hue,
`bdi`-wrapped name, remove `Button` (`variant="secondary" size="xs"`) — identical shape to
the existing filter chip, including its Label-in-Name fix (visible name first, `sr-only`
"Remove segment" suffix after).

**Hue assignment.** Segments take hues in the order added, from the categorical ramp,
independent of which hue the measure or group already carries in the plot — because the
resulting series name is `Measure · Segment · Group` (§2.5) and the segment is frequently the
part that most needs its own colour to scan. **Open question, not resolved here:** the ramp
is six stops today (`--chart-s1`…`s6`); four segments × two measures is eight distinct
series, one more than the ramp can uniquely carry even before a group is added. D40 (owner)
is the decision that mints `--chart-s7`/`s8`. Until it lands, the eighth-and-beyond series in
view is **not** invented a colour here — that is exactly the kind of improvisation this role
is told not to do. Flagged to product-owner and design-token-steward; frontend-engineer
should build the hue-assignment function to take the ramp's length as a parameter so it does
not need a second change when the ramp grows.

**States**

| State | Shown |
|---|---|
| Content, segments chosen | Chips + `Add segment` |
| Empty — no segments (default) | `Add segment` only, no sentence (not an empty state, an unset default) |
| At the ceiling (4 segments) | `Add segment` disabled in place: `rb.control.segments.max` |
| Loading — `segments.list` | Inside the popover only: `LoadingSkeleton` pattern `P1`, 3 rows, label `rb.catalogue.segments.loading`. The rail itself and any already-chosen chips stay interactive |
| Error — `segments.list` | Inside the popover: `ErrorState scope="card" card={false}`, `rb.catalogue.segments.error`, retry re-requests only the segment list |
| Zero saved segments | The "Saved segments" section shows one grey sentence, `rb.control.segments.none`, and the "New segment" section stays fully usable — this is not first-run (R8's illustration is for a whole page, never a popover section) |
| Too many series (state #17) | Rail-level banner-free notice: the `Segments` label row gains a second `InfoHint` line, `rb.violation.tooManySeries`, **and** the most-recently-added chip that pushed the count over the ceiling gets a leading `BreachedIcon` (`size-3.5 text-warning-graphic`, `aria-hidden`) with an `sr-only` suffix "over the series limit" on that chip's accessible name |
| `performed` unsupported for this population | The `performed` row disabled in place, `rb.control.segments.performed.unsupported` |

**Keyboard.** `Add segment` is a real `<button>`; the popover follows the house popover
pattern (`Escape` and outside-click abandon an unsaved "New segment" draft, same as
`WindowControl`'s custom range). The `Command` list is arrow-key navigable with visible focus.
Each chip's remove button is independently tabbable.

**RTL.** Chrome, mirrors wholesale. The `Swatch` dot is decorative colour, not a directional
mark, so nothing about it changes. The chip's `Name · reason` order (when the ceiling marker
is present) stays logical-order (`ms-1` gap before the icon), not `left`/`right`.

**Copy**

| Key | English |
|---|---|
| `rb.control.segments` | Segments |
| `rb.control.segments.hint` | Compare up to four populations side by side. Leave empty to include everyone. |
| `rb.control.segments.add` | Add segment |
| `rb.control.segments.max` | Segments are capped at 4. Remove one to add another. |
| `rb.control.segments.none` | No saved segments yet. |
| `rb.control.segments.new.name` | Segment name |
| `rb.control.segments.new.cancel` | Cancel |
| `rb.control.segments.new.add` | Add segment |
| `rb.control.segments.performed.label` | Performed |
| `rb.control.segments.performed.unsupported` | This population has no per-person activity to count against. |
| `rb.control.segments.performed.eachBucket` | in each bucket |
| `rb.control.segments.performed.rollingDays` | in the last {days} days |
| `rb.control.segments.remove` | Remove segment {name} |
| `rb.violation.tooManySeries` | This asks for {count} series — the limit is {ceiling}. Remove a segment or a split. |
| `rb.catalogue.segments.loading` | Loading segments… |
| `rb.catalogue.segments.error` | Couldn't load segments. Try again. |

## 1.3 Transform controls

**What it is.** Three independent, per-query transforms applied after aggregation, before
comparison. Not mutually exclusive — an operator can ask for a cumulative rolling percent of
total, and the resolver applies them in the stated order.

**Layout**

```
Transform                                                   ⓘ
☐ Cumulative total
☐ Rolling average over  [7▾] buckets
☐ Percent of total
```

**Tokens / components.** Three `Checkbox` rows (`size-4`, existing house checkbox — R19's
resting boundary token, `--ev-hairline-strong`, unchanged). The rolling-average row's number
field is a plain `Input type="number"` at `w-14`, `min={2}`, `max={min(30, bucketCount)}`,
`tabular-nums`, suffixed with the word "buckets" as static text, not a placeholder — a
placeholder disappears the moment the field is used, and the unit word must not.

**States**

| Row | Content | Disabled, in place, with reason |
|---|---|---|
| Cumulative total | Checkbox, unchecked by default | `rb.control.transform.cumulative.disabled` when the measure (or formula result) does not add up |
| Rolling average | Checkbox + number, `7` shown as the field's placeholder only while unchecked | `rb.control.transform.rollingAverage.disabled` when the current window has fewer than 2 complete buckets; the number field's own `max` silently clamps between 2 and the window's bucket count rather than producing a separate violation |
| Percent of total | Checkbox, unchecked by default | `rb.control.transform.percentOfTotal.disabled` when `Split by` is unset |
| Unstarted (no measure) | All three disabled | `rb.control.disabled.unstarted` (existing key) |

There is no loading or error state of its own — this row has no request; its legality comes
from the same `QueryPlan` every other rail control reads.

**Keyboard.** Three checkboxes and one number field in document order, each independently
tabbable, `Space` toggles a checkbox, arrow keys step the number field per native `<input
type="number">` behaviour.

**RTL.** Mirrors wholesale. The number field is a plain quantity, not a numeral run inside
prose, so no `bdi` isolation is needed (contrast the formula's `A / B` string, which is code).

**Copy**

| Key | English |
|---|---|
| `rb.control.transform` | Transform |
| `rb.control.transform.hint` | Reshape the answer without changing the question. |
| `rb.control.transform.cumulative` | Cumulative total |
| `rb.control.transform.cumulative.disabled` | This measure does not add up, so a running total would not be meaningful. |
| `rb.control.transform.rollingAverage` | Rolling average over |
| `rb.control.transform.rollingAverage.unit` | buckets |
| `rb.control.transform.rollingAverage.disabled` | This range has {count} complete buckets. Widen it to average over more. |
| `rb.control.transform.percentOfTotal` | Percent of total |
| `rb.control.transform.percentOfTotal.disabled` | Add a split so there is a group to take a share of. |

## 1.4 Window control v2 — new presets and fixed-comparison mode

**New presets.** `this-quarter`, `last-quarter`, `this-year`, `year-to-date` join the existing
nine in `REPORT_PRESETS`, rendered in the same `ul` of ghost buttons with the same
resting/active check-mark treatment (`WindowControl.tsx:220-249`) — no new component, four
more rows in an existing list. Order: the four new presets sit after `last-year` and before
the existing implicit "custom" affordance, grouped with the other calendar-period presets
rather than the rolling-N-days ones, because that is how an operator scans them (rolling
first, calendar-aligned second — this only reorders four items already in the same list, it
does not restructure the popover).

**Grain.** `quarter` joins `day`/`week`/`month`/`none` in `ChartToolbar`'s grain `Select`,
same `SelectItem` shape, illegal-in-place exactly like the other three when the window is too
short or too long for it (existing `plan.grains` mechanism — no new legality code needed in
this file, the planner supplies it).

**Fixed-comparison mode.** Today `COMPARISONS` is a flat three-item array rendered as plain
`SelectItem`s. v2 needs a fifth option whose selection does not commit immediately — it opens
a range picker. Rather than invent a new interaction, the compare `Select`'s trigger grows
**the same two-line shape `WindowControl`'s own trigger already uses** (headline over
resolved range, `bdi`-isolated) the moment a fixed comparison is active, and choosing
`Fixed range…` from the menu opens a `Popover` anchored on that same trigger — the **custom-
range half only** of `WindowControl`'s popover (two date `Input`s + the lazy two-month
`Calendar` + `Cancel`/`Apply`), with no preset column, because a fixed comparison range has
no presets of its own.

```
Compare to  [Fixed range        ▾]     ✕
             13 Aug – 11 Sep
             ┌ Fixed comparison range ──────────┐
             │ From [____] → To [____]           │
             │ [   two-month calendar   ]         │
             │ This range needs 30 buckets to     │
             │ match the current window.          │
             │                    [Cancel] [Apply]│
             └────────────────────────────────────┘
```

**Tokens / components.** Identical primitives to `WindowControl`: `Popover`, `Input
type="date"`, the lazy `Calendar` chunk (shared import, not duplicated — re-export the
already-lazy `Calendar` rather than a second `lazy()` boundary, which would double-download
the 20.5 KB chunk). `Select` for the four immediate options (`None`, `Previous period`,
`Previous quarter`, `Previous year`) plus the fifth row `Fixed range…` that triggers the
popover instead of closing on selection — implemented as the `Select`'s `onValueChange`
short-circuiting to `setOpen(true)` on the popover rather than writing the query, exactly the
same non-committing branch `WindowControl` already uses for its own custom range.

**States**

| State | Shown |
|---|---|
| Content — series comparison | Trigger reads the comparison's name, single line (unchanged from v1) |
| Content — fixed comparison set | Trigger reads `Fixed range` over the resolved dates, two lines, `bdi`-isolated |
| Popover open, range not yet valid | `Apply` disabled (`illegal` — same predicate as `WindowControl`) |
| Popover open, valid but wrong length | `Apply` enabled but writes a query the planner immediately flags; the popover **also** shows the required-length sentence live, before `Apply`, so the mismatch is visible before commit, not only after (`rb.control.window.fixedCompare.length`) |
| Violation — comparison length mismatch (state #18) | The window's own violation list (already rendered under `WindowControl` in the toolbar, unchanged mechanism) carries `rb.violation.comparisonLength` |
| Unstarted | Whole compare control disabled, same as v1 |

**Keyboard.** Identical to `WindowControl`'s own popover: `Escape`/outside-click abandons the
draft, `Tab` order is From → arrow (non-interactive) → To → Calendar → Cancel → Apply.

**RTL.** The from→to arrow glyph is picked by `directionFor(language)` exactly as
`WindowControl` already does (§9.5, O10) — a reading-order mark, mirrors with the layout. The
calendar's month order and its `‹›` follow `dir`. The resolved-range numerals stay LTR inside
the `bdi` per the existing rule; nothing here differs from `WindowControl`'s own RTL note.

**Copy**

| Key | English |
|---|---|
| `rb.preset.thisQuarter` | This quarter |
| `rb.preset.lastQuarter` | Last quarter |
| `rb.preset.thisYear` | This year |
| `rb.preset.yearToDate` | Year to date |
| `rb.grain.quarter` | Quarter |
| `rb.compare.previousQuarter` | Previous quarter |
| `rb.compare.fixed` | Fixed range… |
| `rb.control.window.fixedCompare.heading` | Fixed comparison range |
| `rb.control.window.fixedCompare.length` | This range needs {count} buckets to match the current window. |
| `rb.violation.comparisonLength` | The comparison range has {have} buckets — the current window has {need}. |

## 1.5 Comparison-display toggle

**What it is.** `comparisonDisplay: 'series' | 'difference' | 'percent-change'`, shown only
while `periodComparison !== 'none'`, sitting between the `Compare to` control and its
existing clear (`✕`) button in `ChartToolbar`.

**Why a `Select`, not a new segmented control.** DESIGN.md's segmented-control MUST (§4) is a
§1–§5 source-system rule, not a Rulings-tier one (R13: no §1–§5 pixel or component figure is
binding on its own). The toolbar already holds four `Select` triggers on one row that wraps
at narrow widths; a fifth control in the same idiom keeps the row's rhythm, where a visually
heavier stadium control would read as the one thing on the row asking for attention it has not
earned. This is a judgement call within precedent, not a deviation — nothing here suspends a
Ruling.

**Layout**

```
Compare to [Previous period ▾]  Show as [Series ▾]  ✕
```

**Tokens / components.** `Select`, `size="sm"`, identical shell to the grain and compare
triggers beside it. Label is `sr-only` (`rb.control.comparisonDisplay`) — the toolbar's
controls carry their labels as `aria-labelledby` on a `sr-only` `Label`, exactly like `rb-
grain` and `rb-compare` already do. Three items: `Series`, `Difference`, `% change` — short
values in the closed trigger, with the fuller sentence carried by each item's own `textValue`
so a screen-reader user still hears the complete description on typeahead.

**States**

| State | Shown |
|---|---|
| No comparison | Control is not rendered at all (not disabled — there is nothing to display a comparison *as*) |
| Comparing, `series` (default) | `Series` in the trigger; chart draws the existing dashed comparison line |
| Comparing, `difference` | `Difference`; chart draws one solid series per current series holding `current − comparison`, with a zero reference line (§2.1's legend gains a plain, undashed entry per series rather than the single dashed "Previous period" entry) |
| Comparing, `percent-change` | `% change`; same as above in `percent` units |

**Keyboard.** Standard `Select` — `Enter`/`Space` opens, arrows move, `Enter` commits,
`Escape` closes without changing the value.

**RTL.** Mirrors wholesale, no numeral runs, no directional glyphs.

**Copy**

| Key | English |
|---|---|
| `rb.control.comparisonDisplay` | Show as |
| `rb.comparisonDisplay.series` | Series |
| `rb.comparisonDisplay.difference` | Difference |
| `rb.comparisonDisplay.percentChange` | % change |
| `rb.comparisonDisplay.series.full` | Draw the comparison as a second, dashed line |
| `rb.comparisonDisplay.difference.full` | Draw the difference between the two periods |
| `rb.comparisonDisplay.percentChange.full` | Draw the percent change between the two periods |

---

# 2 — Chart surface (`SeriesChart.tsx`, `ResultCanvas.tsx`)

All of §2 is **view-only**: no request, no URL change, `ChartView` persisted through
`src/lib/persistence.ts` keyed on the report id or the query hash (unsaved). `INERT = {
pointerEvents: 'none' }` stays on every mark; the brush handles (§2.5) are the one named
exception, matching the existing rule in `AGENT-BRIEF.md`'s trap table.

A new slim **chart controls row** sits between `SeriesHeadlines` and `SeriesChart` inside
each panel card, inline-end aligned except for the zoom chip:

```
[Zoomed · reset]                              [+ Add annotation]  [View ⌄]
```

`role="group"`, `aria-label` = `rb.chart.controlsRow`, no elevation (chrome attached to the
card beneath it, same rule `ChartToolbar` already states).

## 2.1 Legend as buttons

**What changes.** `SeriesLegend` (`ResultCanvas.tsx:822`) stops being a `<ul>` of static
`<li>`s and becomes a `<ul role="list">` of `<li>` each holding a real `<button aria-
pressed>`. Clicking toggles that series into `ChartView.hidden`. A small **kebab** beside
each entry (visible on the same hover/focus terms as every other secondary control in this
product — resting at `text-muted-foreground`, never hover-only, D19) opens a two-item `dropdown-menu`: `Isolate` (hides every *other* series) — there is no `Only` label here, because a
menu item is still held to the verb rule (copy.md rule 2) as tightly as a button is. When any
series is hidden, a `Show all` text `Button` (`variant="link"`) appears once, after the last
legend entry, rather than repeating "Show all" inside every entry's menu.

**Layout**

```
 ── ● Gross fares   ⋮      ┄ Completed trips   ⋮      ┄╌ Previous period          Show all
```

(struck-through label shown for a hidden series; the dash pattern still shows in the swatch
so the operator can tell *which* line would return.)

**Tokens / components.** `Swatch` (existing SVG line mark, unchanged — the mark stays the
plot's own mark, dash pattern included, per the standing rule that a legend must not draw a
pattern its plot does not). The label span gains `line-through decoration-muted-foreground`
and `opacity-70` when hidden — opacity alone would be too subtle against a white ground per
the a11y sweep already required by `token-audit`; the strike is the primary signal, opacity
is secondary reinforcement. The comparison entry (present only when `hasComparison`, existing
rule) toggles every comparison series' `hidden` flags together as one unit.

**States**

| State | Shown |
|---|---|
| Content, nothing hidden | All entries solid, `aria-pressed="true"` (a visible series reads as the "on" state of the toggle) |
| One or more hidden | Those entries struck through, `aria-pressed="false"`; `Show all` link appears; hidden series excluded from the y-axis domain and the tooltip |
| Isolated (via `Isolate`) | Every entry except the chosen one struck through; `Show all` restores |
| Single series, no comparison | Legend renders nothing (existing rule, unchanged — the headline above the plot already names the one series) |

**Keyboard.** Each entry's button is independently tabbable in legend order; `Enter`/`Space`
toggles. The kebab opens with `Enter`/`Space`/`ArrowDown`; `Isolate` runs on `Enter`;
`Escape` returns focus to the kebab trigger, not to the page.

**RTL.** The legend row is chrome (`flex flex-wrap justify-center`) and mirrors wholesale —
entry order reverses with the line, same as any other centred row. The `Swatch` mark is a
fixed-shape SVG, decorative, and does not encode direction, so it is never mirrored (map/chart
marker rule, `rtl.md`).

**Copy**

| Key | English |
|---|---|
| `rb.legend.isolate` | Isolate |
| `rb.legend.showAll` | Show all |
| `rb.panel.legend.previous` | Previous period (existing, unchanged) |

## 2.2 The v2 tooltip

**What it adds**, per series row, when hovering or focusing a bucket: the comparison value on
the same row; the delta (absolute and percent) with the comparison bucket's own date; the
group's share of the bucket when `percentOfTotal` is on. The bucket header states `Partial`
when the hovered bucket is a partial one (state #4 — partial buckets are drawn, marked, and
excluded from every delta and alert evaluation, unchanged rule).

**Layout**

```
┌ 3 Jun (partial) ───────────────────────┐
│ ● Gross fares      12,400 SAR           │
│   vs 27 May         9,800 SAR  ↑ 27%    │
│   share of total              38%       │
└──────────────────────────────────────────┘
```

**Tokens / components.** The existing `ChartContainer`/`ChartTooltipContent` shell
(`bg-popover`, `border-border`, `--ev-shadow-2`, `rounded-card`) grows two optional rows per
series. Deltas use `DeltaUpIcon`/`DeltaDownIcon` (registry, `size-3`) at `text-muted-
foreground` — **never** a red/green pairing: this product states direction with a glyph and a
number, never with colour, the same rule already applied to every delta chip elsewhere (R4-5).
`Partial` renders as plain text beside the date, not a badge (a tooltip is not a place for a
status pill — it is transient, and R7's badges are for standing record state).

**States.** The tooltip has no state of its own beyond hover/focus — it renders from whatever
bucket is active. It omits a hidden series entirely (§2.1) and omits the comparison row when
`periodComparison === 'none'` or the series is a `difference`/`percent-change` series (which
carries no separate "vs" line — it *is* the comparison, already computed).

**Keyboard.** The plot region is `role="group" tabIndex={0}` with an `aria-label` naming what
is drawn (existing `description` prop) and an `aria-describedby` pointing at a visually-
hidden live node holding the active bucket's full readout. **Arrow keys move the active
bucket**: `ArrowRight` moves to the later bucket, `ArrowLeft` to the earlier one. `Home`/`End`
jump to the first/last bucket.

**RTL — a stated exception.** The arrow-key mapping above does **not** mirror. `rtl.md` is
explicit that chart plot areas and axes do not reverse — "a reversed time axis makes axis and
numbers run opposite ways" — so `ArrowRight` always means *forward in time* regardless of
document direction, exactly like the delta arrows never encode reading direction. This is
worth stating plainly because it is the one place in this spec where a physical key differs
from the logical navigation an Arabic-reading operator would otherwise expect from every other
list in the product.

**Copy**

| Key | English |
|---|---|
| `rb.chart.tooltip.partial` | partial |
| `rb.chart.tooltip.vs` | vs {date} |
| `rb.chart.tooltip.share` | share of total |

## 2.3 `View` menu

**What it is.** One `dropdown-menu` gathering the view-only chart controls Amplitude keeps in
its own `View` menu: log scale, start the y-axis at zero, data labels, and the table beneath.
**Label density is not a menu item.** It is computed automatically (at most one x-axis label
per 64px, chosen at month starts, then week starts, then days, never rotated — RTL rotates
text the wrong way) and is named here only to say plainly that it is not offered as a
control — an operator cannot make a bad density choice if there is no choice to make.

**Layout**

```
[View ⌄]
 ☑ Log scale
 ☐ Start at zero
 ☐ Data labels
 ☐ Show table
```

**Tokens / components.** Trigger: `Button variant="secondary" size="sm"` reading `View` with
a trailing `ChevronDownIcon`, matching the toolbar's other secondary triggers. Content:
`DropdownMenuContent` with four `DropdownMenuCheckboxItem`s — a checkbox item, not a plain
item, because each is a persistent toggle the operator revisits, and the check state must be
readable without reopening.

**States, per item**

| Item | Disabled in place, with reason |
|---|---|
| Log scale | `rb.view.log.disabled` when any visible value is ≤ 0 (a series with a zero or an all-null series) |
| Start at zero | Never disabled; defaults `true` for `bar`, `false` for `line`/`area` (stated, not "auto" — Eyvar names its own default rather than inheriting Amplitude's silent one) |
| Data labels | `rb.view.dataLabels.disabled` when `bucketCount × seriesCount > 60` (too many labels to read) |
| Show table | Never disabled; opens `NumbersBehind` beneath the plot and persists |

**Keyboard.** Native `DropdownMenu` behaviour: `Enter`/`Space` opens, arrows move between
items, `Space`/`Enter` toggles a checkbox item without closing the menu (so several can be
set in one open), `Escape` closes.

**RTL.** Chrome, mirrors wholesale. Nothing inside the menu is a numeral run or a directional
mark.

**Copy**

| Key | English |
|---|---|
| `rb.view.menu` | View |
| `rb.view.log` | Log scale |
| `rb.view.log.disabled` | Log scale needs every value above zero. |
| `rb.view.startAtZero` | Start at zero |
| `rb.view.dataLabels` | Data labels |
| `rb.view.dataLabels.disabled` | Too many points to label — {count} would overlap. |
| `rb.view.showTable` | Show table |

## 2.4 Annotation marks and the inline annotation form

**What it is.** A vertical hairline with a small marker at the top, drawn on every trend chart
whose window contains the annotation's date. `Add annotation` opens a small inline form under
the chart — **no dialog**, matching the owner's standing no-dialog ruling that already governs
the alert composer and the page editor.

**Layout — mark**

```
        │
   ──────┴──── plot continues …
        ▲
```

**Layout — the inline form**, opened under the chart, pushing it down rather than overlaying
it (a dialog would hide the very thing being annotated):

```
┌ Add annotation ──────────────────────────────┐
│ Date   [ 03 Jun 2026        ]                  │
│ Label  [________________________]              │
│ Kind   [ Launch ▾ ]                             │
│ Note   [________________________]              │
│                          [Cancel] [Add annotation] │
└──────────────────────────────────────────────────┘
```

**Tokens / components.** The hairline is an SVG `line`, `stroke-[var(--chart-axis)]`,
`strokeDasharray` none (solid, distinct from the dashed comparison line so the two never read
as the same kind of mark). The marker is a small filled circle, `size-2`, same stroke colour,
`INERT` for pointer events on the plot itself — the **hover/focus target is a transparent
8px-tall strip behind the mark**, wide enough to catch a pointer without needing pixel
precision on a 2px dot. On hover or focus it shows a `Tooltip`-shaped popover with the label
and note. The form: `Input type="date"`, `Input` for the label, `Select` for `kind`
(`launch`/`price`/`incident`/`campaign`/`other`), `Input` (or a short `Textarea`) for the
note, `Cancel`/`Add annotation` pair — primary restates the verb + object (`surfaces.md`'s
modal-shape rule applied to an inline form, since it is the same "commit vs abandon" pattract
minus the dialog chrome).

**States**

| State | Shown |
|---|---|
| Content — annotations in range | Marks drawn, hover/focus shows label + note |
| No annotations in range | Nothing drawn — not an empty state (states.md governs surfaces with a request behind them; a chart with zero annotations in its window is simply a chart with zero annotations, same as a legend with one series) |
| Form open, valid | `Add annotation` enabled |
| Form open, invalid (no date or no label) | `Add annotation` disabled — §3.2's validate-by-disabling rule, not an error after submit |
| No `manage_analytics` permission | `Add annotation` button itself is not rendered — an operator who cannot write annotations does not see an invitation to try |
| Save failed | Inline error inside the form, input preserved, form stays open (§8.3's standing rule: a failed save never closes the surface it came from) |

**Keyboard.** The mark's hover strip is also reachable by `Tab` (a real, if visually minimal,
`<button>` with an `aria-label` naming the annotation) so a keyboard user can read every
annotation in a window without a mouse. The form is a normal tab sequence ending at
`Cancel`/`Add annotation`; `Escape` while the form has focus abandons it, same as every other
inline draft in this product.

**RTL.** The mark itself is plotted against the chart's date axis, which — like every axis in
this product — does not mirror (`rtl.md`). The hairline's horizontal position is therefore
computed against the same LTR-pinned x-scale as every bucket, never flipped. The form's fields
mirror normally; they are a standard form, not a chart element.

**Copy**

| Key | English |
|---|---|
| `rb.chart.addAnnotation` | Add annotation |
| `rb.annotation.form.date` | Date |
| `rb.annotation.form.label` | Label |
| `rb.annotation.form.kind` | Kind |
| `rb.annotation.form.note` | Note (optional) |
| `rb.annotation.form.cancel` | Cancel |
| `rb.annotation.form.submit` | Add annotation |
| `rb.annotation.kind.launch` | Launch |
| `rb.annotation.kind.price` | Price change |
| `rb.annotation.kind.incident` | Incident |
| `rb.annotation.kind.campaign` | Campaign |
| `rb.annotation.kind.other` | Other |

## 2.5 Brush and its reset chip

**What it is.** A `Brush` under any trend chart with ≥30 buckets. Dragging narrows the
**view** (the x domain drawn), never the query — the URL and the request are unaffected.

**Layout**

```
[Zoomed · reset]                                      ← chart controls row, start side
 ────────────────────────────────────────
 ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓   ← brush track, under the plot
```

**Tokens / components.** Recharts `Brush`, `fill: var(--muted)`, `stroke: var(--chart-axis)`,
travel handles at the same stroke colour. The reset chip is a `Button variant="secondary"
size="xs"` reading `Zoomed · reset` as one string (not two chips) — pressing it or its own
`✕` (there is no separate `✕`; the whole chip is the reset action, verb-first: "reset") clears
the brush's domain back to the full window.

**States**

| State | Shown |
|---|---|
| < 30 buckets | No brush rendered at all — not disabled, absent, same as the legend rule for a single series |
| ≥ 30 buckets, not zoomed | Brush track shown, full width, no chip |
| Zoomed | Chip shown at the controls row's start side; plot redraws to the narrowed domain; legend, tooltip and axis all reflect the narrowed view; the query and any saved report are untouched |

**Keyboard.** `[` and `]` step the brush's start and end edges by one bucket while the chart
region has focus (the same `role="group" tabIndex={0}` wrapper as §2.2). The handles
themselves are the one exception to `INERT` named in the brief's trap table — they must
receive real pointer events to drag, and the harness (`scripts/harness/reports-v2.mjs`) is
where that is proven, not a jsdom test.

**RTL.** The brush sits on the same LTR-pinned time axis as the plot and the annotation marks
— it does not mirror, for the same reason the axis does not: reversing it would make the
brush's start and end edges disagree with the numbers under them. The **chip's position**
(inline-start of the controls row) does mirror, because that chip is chrome, not plot.

**Copy**

| Key | English |
|---|---|
| `rb.chart.zoomed.reset` | Zoomed · reset |

---

# 3 — Page blocks (`src/components/pages/`)

Editing is **inline**, never a dialog (owner's standing ruling, cited in `03-pages-and-
dashboards.md` §5's own header). `PageView` is single column, capped at the content width. In
view mode no block carries a frame; `Edit` (the page's one primary) enters edit mode, `Done`
leaves it.

## 3.1 Block frame — selection, handle, menu

**What it is.** The chrome edit mode wraps around every block: a hover/focus-revealed handle
and menu, and an insertion affordance above and below each block and at the list's end.

**Layout**

```
 view mode                          edit mode, resting        edit mode, hover/focus
 ┌ Heading ───┐                     ┌ Heading ───┐             ⠿  Weekly review        ⋮
 │ Weekly …   │                     │ Weekly …   │             ┌───────────────────┐
 └────────────┘                     └────────────┘             │ Weekly review      │
                                                                 └───────────────────┘
                                     (no border, no handle)      (border-border, handle
                                                                  + kebab both visible)
```

**Tokens / components.** `BlockFrame` is `role="group"`, `tabIndex={0}`, `aria-label` from the
block's title or its type name (`pg.block.<type>.name`) — one DOM region per block, so a
screen-reader operator can walk the page block by block, per `03-pages-and-dashboards.md` §3.
At rest: `border border-transparent`, no visible chrome. On hover, on `:focus-within`, or
while its own menu is open: `border-border`, `rounded-card`. The handle
(`DragHandleIcon`, `size-4`, `text-muted-foreground`) sits in a thin gutter at the block's
inline-start; the kebab (`MoreIcon`, same size and colour) sits inline-end of the same gutter
— both real `<button>`s, both rendered at rest but visually `opacity-0`, becoming
`opacity-100` on the frame's hover **or** on their own `focus-visible` (D19's two-step rule:
hover or focus, never hover-only). The frame's own keyboard focus ring is the standard
`focus-visible:ring-2 ring-ring ring-offset-2`; that ring **also** forces the handle/kebab
visible, so a keyboard user sees exactly what a mouse user sees once they land on a block.

**Insertion affordance** — a 1px hairline with a centred `+` `Button` (`variant="secondary"
size="icon-xs"`), rendered between every two blocks and after the last one, `opacity-0` at
rest, `opacity-100` on hover of the gap or on the button's own `focus-visible` — present in
the DOM (so `Tab` reaches it in order) but visually quiet until needed, the same opacity
contract as the handle/kebab above.

**States**

| State | Shown |
|---|---|
| View mode | No frame, no handle, no kebab, no insertion affordance — the page reads as a document |
| Edit mode, resting | Frame chrome hidden per-block until hover/focus, per above |
| Edit mode, hovered or focused | Border, handle, kebab all visible |
| Menu open | Frame chrome stays visible until the menu closes |
| No `manage_analytics` and not the owner | `Edit` itself is not in the page header — nobody sees frame chrome at all |
| Page has 200 blocks (the cap) | The picker (§3.2) and slash command (§3.3) both refuse a new block in place, `pg.edit.blockLimit` |

**Keyboard.** `Tab` moves frame to frame in document order (nested column blocks are visited
depth-first). `Shift+F10` on a focused frame opens its block menu (same convention as a
right-click context menu, offered without a mouse). `Alt+↑`/`Alt+↓` move the block;
`Ctrl+D` duplicates it; `Delete` deletes it with a one-step undo toast (R10 — a toast, not a
confirmation dialog, because undo is available). The block **menu** itself:

```
Move up · Move down · Move to column… · Duplicate · Turn into… · Height (report only) ·
View (report only) · Delete
```

each a `DropdownMenuItem`, arrow-navigable, `Escape` returns focus to the kebab.

**RTL.** The handle sits at the frame's **inline-start**, the kebab at **inline-end** — this
reverses physically in Arabic along with the rest of the frame's chrome (`ms-`/`me-`
utilities only, never `left`/`right`). `Alt+↑`/`Alt+↓` move a block **up or down the list**,
which is a vertical relationship and does not mirror at all — only `Alt+←`/`Alt+→`-style
horizontal moves would need a direction check, and there are none here.

**Copy**

| Key | English |
|---|---|
| `pg.edit.enter` | Edit |
| `pg.edit.done` | Done |
| `pg.edit.moveUp` | Move up |
| `pg.edit.moveDown` | Move down |
| `pg.edit.moveToColumn` | Move to column… |
| `pg.edit.duplicate` | Duplicate |
| `pg.edit.turnInto` | Turn into… |
| `pg.edit.height` | Height |
| `pg.edit.view` | View |
| `pg.edit.delete` | Delete |
| `pg.edit.deleted.toast` | Block removed |
| `pg.edit.deleted.undo` | Undo |
| `pg.edit.blockLimit` | This page has reached 200 blocks. Remove one to add another. |

## 3.2 Add-block picker

**What it is.** Clicking the insertion affordance (§3.1) opens an inline picker listing every
block type with a one-line description and a search box — the `cmdk` primitive already
restyled for the command palette, rendered **inline** in the affordance's place, not centred
on the page.

**Layout**

```
[+]  ⌄
┌ Search block types…                                 ┐
│ Text          A paragraph of formatted text          │
│ Heading       A section title                        │
│ Callout       A highlighted note                      │
│ Divider       A thin rule between sections             │
│ Toggle        A section that opens and closes          │
│ Columns       Two to four side-by-side sections        │
│ Report        A chart or table from a saved report     │
│ Metric        One number from a saved report            │
│ Table         A small hand-built table                  │
│ Alert status  The state of one or more alert rules       │
│ Bookmark      A link to another page or report            │
└────────────────────────────────────────────────────────┘
```

`agent-insight` is **not** offered here — it is written only by the analyst (§5), never
inserted by an operator, so it has no row in this picker.

**Tokens / components.** `Command`/`CommandList`/`CommandItem` (the same restyled primitive
the command palette uses), opened as an inline `Popover` anchored on the `+` button rather
than the palette's centred overlay — same primitive, different anchor, per `03-pages-and-
dashboards.md` §5's explicit instruction. Each item shows the block's icon (from the registry
— `FileTextIcon` for text, `ChartIcon` for report, `TableChartIcon` for table, etc.), its
name, and its one-line description in `text-muted-foreground`.

**States**

| State | Shown |
|---|---|
| Content | Full list, filterable by typing |
| Filtered to zero | One grey sentence inside the list, `pg.picker.noMatch` |
| Block cap reached | Every item disabled in place, `pg.edit.blockLimit` shown once at the top of the list rather than repeated on all eleven items |
| `report`/`metric` chosen | Picker closes and hands off to the report-picker panel (existing `AddContentDialog` list, re-homed as an inline panel inside the new block's frame — search, already-placed reports disabled with a reason, `New report` opens the builder with `?pinTo=<pageId>`) |

**Keyboard.** Typeahead filters as the operator types; arrows move; `Enter` inserts the
highlighted type at the insertion point; `Escape` closes without inserting.

**RTL.** Chrome, mirrors wholesale, including the icon-then-label order inside each row.

**Copy**

| Key | English |
|---|---|
| `pg.block.text.name` / `.desc` | Text / A paragraph of formatted text |
| `pg.block.heading.name` / `.desc` | Heading / A section title |
| `pg.block.callout.name` / `.desc` | Callout / A highlighted note |
| `pg.block.divider.name` / `.desc` | Divider / A thin rule between sections |
| `pg.block.toggle.name` / `.desc` | Toggle / A section that opens and closes |
| `pg.block.columns.name` / `.desc` | Columns / Two to four side-by-side sections |
| `pg.block.report.name` / `.desc` | Report / A chart or table from a saved report |
| `pg.block.metric.name` / `.desc` | Metric / One number from a saved report |
| `pg.block.table.name` / `.desc` | Table / A small hand-built table |
| `pg.block.alert-status.name` / `.desc` | Alert status / The state of one or more alert rules |
| `pg.block.bookmark.name` / `.desc` | Bookmark / A link to another page or report |
| `pg.picker.search` | Search block types… |
| `pg.picker.noMatch` | No block type matches. |

## 3.3 Slash command

**What it is.** Typing `/` at the start of a line inside a text block opens the **same**
picker as §3.2, anchored under the cursor instead of under a `+` button.

**Layout**

```
Weekly numbers are steady. /table
                            ┌ Search block types…      ┐
                            │ Table   A small hand-…    │
                            │ …                          │
                            └─────────────────────────────┘
```

**Behaviour.** The `/` and whatever the operator types after it become the picker's search
query live, character for character — typing `/tab` filters straight to `Table` the same way
`Search block types…` would. Choosing an item **replaces** the `/query` text with the new
block, inserted immediately after the text block (splitting it if the cursor was mid-
paragraph, exactly as the markdown editor's four-button formatting bar already treats a
selection). Pressing `Escape` or deleting back past the `/` closes the picker and leaves the
literal `/query` text in the paragraph — a slash the operator typed on purpose (e.g. a date
`12/06`) is never silently eaten.

**States.** Identical states to §3.2 (content, filtered-to-zero, cap reached) — this is the
same component, a second entry point, not a second implementation.

**Keyboard.** Identical to §3.2, with one addition: `Backspace` at the picker's empty-query
state (only the bare `/` left) closes it rather than deleting into the paragraph's preceding
character, so closing the picker is never destructive.

**RTL.** The `/` is typed at the **start of a line** in the logical sense — `text-start` — so
in an Arabic paragraph it is the visually right-most character, and the picker anchors under
it exactly as it would under a `/` at the visual left in English. No special-casing needed
beyond the paragraph already being `dir`-aware.

**Copy.** No new keys — reuses every key from §3.2.

## 3.4 Columns width control

**What it is.** Inside a `columns` block, each column's width is one of six named fractions,
stored as one of ten legal twelfths (3…12) per `03-pages-and-dashboards.md` §2, but only six
of those ten are offered as named choices — the others exist for validation math (unset
widths sharing the remainder) rather than as operator-facing options.

**Layout**

```
 ┌ column chrome, on hover/focus of the column's own frame ─────┐
 │  Width   [ ¼ | ⅓ | ½ | ⅔ | ¾ | full ]                          │
 └──────────────────────────────────────────────────────────────┘
```

**Tokens / components.** `Tabs`/`TabsList variant="segmented"`/`TabsTrigger` — the exact
house segmented control already shipping in `ViewTabs.tsx` (`rounded-full` track and pill,
R15's licensed stadium-shape exception) — because this is precisely the case DESIGN.md's own
MUST names: *"a segmented control only for a mode switch that changes what the rest of the
card shows"*, and a column's width is exactly that. Six `TabsTrigger`s map to 3/4/6/8/9/12
twelfths.

**States**

| State | Shown |
|---|---|
| Content | Current width's trigger active (`data-active`, filled `bg-card` pill) |
| A width would overflow the row's 12-twelfth budget | That trigger disabled in place — not hidden, so the operator can see the full scale and understand why the row is full, `pg.edit.columns.overflow` |
| Only one column left in the row | Width control itself is not shown — one column has no fraction to be a fraction *of*; it always reads as `full` |

**Keyboard.** Arrow keys move between the six triggers, `Enter`/`Space` commits, matching
every other segmented control in the product (`ViewTabs`'s own behaviour, unchanged).

**RTL.** The six triggers read in **logical order** (¼ nearest inline-start, `full` nearest
inline-end) and the whole strip mirrors with the column it belongs to — a column's *content*
reflows to match its new width the same way any grid item does; nothing here needs a `dir`
branch beyond the existing logical-property discipline.

**Copy**

| Key | English |
|---|---|
| `pg.edit.columns.width` | Width |
| `pg.edit.columns.quarter` | ¼ |
| `pg.edit.columns.third` | ⅓ |
| `pg.edit.columns.half` | ½ |
| `pg.edit.columns.twoThirds` | ⅔ |
| `pg.edit.columns.threeQuarters` | ¾ |
| `pg.edit.columns.full` | Full |
| `pg.edit.columns.overflow` | This row is full. Narrow another column first. |

## 3.5 The four report-block heights

**What it is.** `report.height: 'S' | 'M' | 'L' | 'XL'`, mapped to four fixed tokens —
Amplitude's own four row heights, requested of design-token-steward as `--ev-block-h-s`
(375px), `-m` (500px), `-l` (625px), `-xl` (750px). No component computes a height itself;
every `ReportBlock` reads its token by name.

**Layout — the `Height` menu item's own submenu (from the block menu, §3.1)**

```
Height ▸  Small (375px)
          Medium (500px)
          Large (625px)
          Extra large (750px)
```

**Tokens / components.** A `DropdownMenuSub` off the block menu's `Height` row — not a
separate control on the block frame itself, because height is an infrequent adjustment and
the menu already holds `View` and `Turn into…` at the same frequency. Each item is a
`DropdownMenuRadioItem` (one height at a time, radio semantics, not checkbox). The block's own
`className` reads `h-block-s` / `h-block-m` / `h-block-l` / `h-block-xl` — four Tailwind
utilities exposed from the four tokens, never an inline pixel value.

**States**

| State | Shown |
|---|---|
| Content | The chosen height's radio item marked, block renders at that height |
| Chart taller than its content needs | The block still takes the full token height — a shorter box would clip the legend or the x-axis on some chart types, and a fixed set of four heights exists precisely so every block in a row lines up, which a self-sizing block would defeat |
| `view: 'headline'` (KPI-shaped) | Height still applies (the card simply centres its content within the token height) — headline view is a content choice, not an exemption from the height grid |

**Keyboard.** Standard `DropdownMenuRadioGroup` behaviour — arrows move, `Enter` commits,
`Escape` closes without changing the height.

**RTL.** Heights are a single geometry axis (block-progression, i.e. vertical) and do not
mirror under any circumstance — there is no "start/end" equivalent for a block's height.

**Copy**

| Key | English |
|---|---|
| `pg.edit.height.menu` | Height |
| `pg.edit.height.s` | Small |
| `pg.edit.height.m` | Medium |
| `pg.edit.height.l` | Large |
| `pg.edit.height.xl` | Extra large |

---

# 4 — Alert composer

**What it is.** `AlertRuleDialog` stops being a `Dialog` and becomes an **inline panel**,
opened from the report-builder toolbar's bell, from a page's report-block menu (`Create
alert…`), or from the Rules list's row action — the file keeps its name until the rename
sweep, per `04-alerting-v2.md` §4's own note. The panel replaces the trigger's surrounding
content in place (the same "opens where it was invoked" rule the annotation form uses, §2.4)
rather than layering over it, because a rule composer needs to be read against the report it
is watching.

## 4.1 The inline panel

**Layout**

```
┌ New alert rule ───────────────────────────────────────────────┐
│ Name          [________________________]                       │
│ Report        Weekly gross fares · Riyadh   (resolved, §12.2)   │
│ Series        [Gross fares — Riyadh North ▾]                    │
│ Condition     [ Threshold · Change · Anomaly · Missing data ]   │
│               … kind-specific fields, §4.2 …                    │
│                                                                   │
│               … preview chart, §4.3 …                            │
│                                                                   │
│ Evaluation grain  [Day ▾]                                        │
│ Cadence           [ Hourly · Daily · Not scheduled ]             │
│ Re-arm after      [_____] minutes (optional)                     │
│ Channels          §4.4                                            │
│ Recipients        [multi-select of team users]                   │
│ Severity          [ High · Critical ]  (Critical disabled, Q-RB-9)│
│ Labels            [chips + add]                                    │
│                                              [Test now] [Save rule]│
└─────────────────────────────────────────────────────────────────┘
```

**Tokens / components.** A `Card`-shaped panel (`border-border`, `rounded-card`, `--ev-
shadow-1` — the same elevation tier a form card takes, none of the modal's tier-3 scrim,
because this is not a modal). `Input` for name, resolved-report line as plain text (not
editable — a rule's report is fixed once chosen, matching v1), `Select` for series (populated
by *running* the chosen report, exactly as v1 already does — one request the operator asked
for by choosing a report). Condition kind is a `Tabs`/`TabsList variant="segmented"` four-way
control — the textbook case for a segmented control (§4 MUST), changing every field below it.
`Cadence` is the same segmented shape, three-way, with `Not scheduled` as a legitimate third
state rather than an empty one — selecting it is a deliberate choice, not a default.

**States**

| State | Shown |
|---|---|
| Content, valid | `Save rule` and `Test now` enabled |
| No report chosen yet (opened from the toolbar bell on an unsaved report) | Panel opens with `Save to alert` as an interstitial: name the unsaved report, save it, then the panel continues with that report fixed — this is the existing v1 branch, unchanged in v2 |
| Series list loading | `LoadingSkeleton` inside the `Series` field's position, `P1`, 1 row |
| Series list empty (report returned zero series) | `Series` disabled in place, `rb.alert.series.empty` |
| Save failed | Inline error inside the panel, every field's input preserved, panel stays open |
| `critical` severity chosen | Disabled in place, `rb.alert.severity.critical.blocked` (Q-RB-9, open) |
| No `manage_analytics` and not the report's owner | The panel's every entry point is absent, same rule as the page editor |

**Keyboard.** Standard form tab order ending at `Test now` then `Save rule`. `Escape` while
the panel has focus and nothing is dirty closes it; while dirty, it behaves like every other
inline draft in this product (abandon on `Escape`, no confirmation — there was never a commit
to protect, matching §8.6's composer rule that a draft with no save bar has no discard
dialog either).

**RTL.** Mirrors wholesale — this is a form.

**Copy**

| Key | English |
|---|---|
| `rb.alert.panel.heading.new` | New alert rule |
| `rb.alert.panel.heading.edit` | Edit alert rule |
| `rb.alert.form.name` | Name |
| `rb.alert.form.report` | Report |
| `rb.alert.form.series` | Series |
| `rb.alert.series.empty` | This report has no series to watch. |
| `rb.alert.form.condition` | Condition |
| `rb.alert.form.evaluationGrain` | Evaluation grain |
| `rb.alert.form.cadence` | Cadence |
| `rb.alert.cadence.hourly` | Hourly |
| `rb.alert.cadence.daily` | Daily |
| `rb.alert.cadence.none` | Not scheduled |
| `rb.alert.form.reArm` | Re-arm after |
| `rb.alert.form.reArm.unit` | minutes |
| `rb.alert.form.severity` | Severity |
| `rb.alert.severity.high` | High |
| `rb.alert.severity.critical` | Critical |
| `rb.alert.severity.critical.blocked` | Critical severity needs a recipient rule that is not decided yet. |
| `rb.alert.form.labels` | Labels |
| `rb.alert.action.test` | Test now |
| `rb.alert.action.save` | Save rule |

## 4.2 Each condition kind's fields

**Threshold (`static`)** — unchanged from v1: comparator `Select` (`>`, `≥`, `<`, `≤`) +
`Input` for the threshold, unit-suffixed (`SAR`, `%`, etc., derived from the series, never
chosen — `AlertRuleDialog.tsx`'s existing `parseMoneyInput` path, unchanged).

```
[ > ▾ ]  [ 400 ] SAR
```

**Change (`relative`)** — new:

```
Direction  [ Up · Down · Either ]
Measure    [ Amount changed · Percent changed ]
Amount     [ 20 ] %
Against    [ Previous bucket ▾ ]
```

`Direction` and `Measure` are two-and-three-way segmented controls (mode switches, §4 MUST,
same reasoning as §4.1's condition-kind strip). `Amount`'s suffix switches between the
series' own unit (`delta`) and `%` (`percent`) as `Measure` changes. `Against`'s `Select`
offers `Previous bucket`, `Same bucket, previous week` (disabled in place, `rb.alert.
against.weekOnlyAtDay`, unless `evaluationGrain === 'day'`), and `Previous period`.

**Anomaly** — new:

```
Direction   [ Above · Below · Either ]
Confidence  [ 95% · 99% ]
Lookback    [______] buckets (optional — leave blank to use the last {n} automatically)
```

`Confidence` is a two-way segmented control. `Lookback` is a plain numeric `Input`, its
placeholder stating the automatic default for the current `evaluationGrain` (28 for day, 12
for week, 6 for month). Below both, the panel states plainly and without overclaiming
(`rb.alert.anomaly.method`, required by the plan doc to exist and to be honest about the
estimator):

```
This estimates a normal range from recent history. It is a simple statistical
band, not a learned model.
```

**Missing data** — new:

```
Fires when  [ 3 ] complete buckets in a row are missing
```

One numeric `Input`, `min={1}`.

**States (all four kinds share this shape)**

| State | Shown |
|---|---|
| Content | Fields for the chosen kind, prefilled on edit |
| Switching kind | Fields for the previous kind are discarded, not hidden — `AlertCondition` is a discriminated union and the draft never carries two kinds' fields at once |
| Threshold amount invalid (non-numeric, or wrong shape for the unit) | `Save rule` disabled, inline field error under the input |
| Relative `Against: same bucket, previous week` at a non-day grain | Disabled in place, `rb.alert.against.weekOnlyAtDay` |
| Anomaly, insufficient baseline | Not a composer-blocking state — the rule can still be saved; the preview (§4.3) and any `Test now` instead report `no-baseline` in place of a band |
| Missing-data count below 1 | `Save rule` disabled, inline field error |

**Keyboard.** Every segmented control behaves as `ViewTabs` already does (arrows move, `Enter`
commits). Numeric inputs are native, with the browser's own spinner semantics.

**RTL.** Mirrors wholesale — all four kinds are plain forms; no numeral run needs isolation
beyond the existing `tabular-nums` treatment already applied to every metric input in the
product.

**Copy**

| Key | English |
|---|---|
| `rb.alert.kind.static.name` | Threshold |
| `rb.alert.kind.static.desc` | Fires when a value crosses a fixed line |
| `rb.alert.kind.relative.name` | Change |
| `rb.alert.kind.relative.desc` | Fires when a value moves against a past bucket |
| `rb.alert.kind.anomaly.name` | Anomaly |
| `rb.alert.kind.anomaly.desc` | Fires when a value leaves its normal range |
| `rb.alert.kind.missing.name` | Missing data |
| `rb.alert.kind.missing.desc` | Fires when the pipeline stops delivering |
| `rb.alert.relative.direction.up` | Up |
| `rb.alert.relative.direction.down` | Down |
| `rb.alert.relative.direction.either` | Either |
| `rb.alert.relative.measure.delta` | Amount changed |
| `rb.alert.relative.measure.percent` | Percent changed |
| `rb.alert.relative.against.previousBucket` | Previous bucket |
| `rb.alert.relative.against.sameWeekday` | Same bucket, previous week |
| `rb.alert.relative.against.previousPeriod` | Previous period |
| `rb.alert.against.weekOnlyAtDay` | This comparison needs a daily evaluation grain. |
| `rb.alert.anomaly.direction.above` | Above |
| `rb.alert.anomaly.direction.below` | Below |
| `rb.alert.anomaly.direction.either` | Either |
| `rb.alert.anomaly.confidence.95` | 95% |
| `rb.alert.anomaly.confidence.99` | 99% |
| `rb.alert.anomaly.lookback` | Lookback |
| `rb.alert.anomaly.lookback.placeholder` | Uses the last {count} buckets |
| `rb.alert.anomaly.method` | This estimates a normal range from recent history. It is a simple statistical band, not a learned model. |
| `rb.alert.missing.count` | Fires when |
| `rb.alert.missing.count.suffix` | complete buckets in a row are missing |

## 4.3 Preview chart

**What it is.** Beneath the condition's fields, a chart of the series' last 60 complete
buckets, drawn the moment enough of the condition is filled in to evaluate — computed
client-side, view-only, via the same `evaluate()` function the server runs (so the preview
can never disagree with what actually fires).

**Layout**

```
┌ Would this have fired? ─────────────────────────────────┐
│         ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ threshold / band ┄┄┄┄┄┄┄┄┄┄┄┄     │
│   ╭╮        ●                                 ●          │
│  ╱  ╲______╱_╲__________________________╱____╱╲________  │
│                                                            │
└────────────────────────────────────────────────────────────┘
   ● = a bucket that would have fired
```

**Tokens / components.** A `SeriesChart`-shaped plot, `INERT` marks throughout (this is a
preview, not an interactive chart — no legend-isolate, no brush, no tooltip beyond the
default hover). The threshold line (`static`) or band (`anomaly`) is drawn dashed,
`stroke: var(--chart-axis)`, matching the existing "comparison" dash convention so an
operator already reads it as "a reference, not a series." A would-fire bucket gets a small
filled dot, `fill: var(--color-warning-graphic)` — the same amber ink the `firing` state
badge already uses (`AlertsView.tsx`'s `STATE_TONE.firing = 'warning'`), so the preview's
marks and the eventual notification agree on what colour "would fire" means.

**States**

| State | Shown |
|---|---|
| Enough of the condition set to evaluate | Chart + marks as above |
| Not enough set yet (e.g. threshold amount blank) | The chart area shows one grey sentence, `rb.alert.preview.incomplete`, frame kept |
| Anomaly, insufficient baseline | Band not drawn; grey sentence in its place, `rb.alert.anomaly.noBaseline` |
| Series has fewer than 60 buckets | Draws what exists; no sentence needed — a shorter preview is still a true preview |
| Condition never would have fired in the preview window | Chart draws with no dots — not an empty state; the absence of marks is itself the answer |

**Keyboard.** The chart region is reachable by `Tab` as a `role="group"` with an `aria-label`
summarising the count of would-fire buckets in the preview window (e.g. "3 of the last 60
buckets would have fired") — this makes the marks' meaning available without requiring the
operator to visually count dots.

**RTL.** Same axis rule as every other chart in this product (§2.2) — the plot does not
mirror; the card's surrounding chrome does.

**Copy**

| Key | English |
|---|---|
| `rb.alert.preview.heading` | Would this have fired? |
| `rb.alert.preview.incomplete` | Fill in the condition to see when this would have fired. |
| `rb.alert.anomaly.noBaseline` | Needs 8 complete buckets to estimate a range. This series has {count}. |
| `rb.alert.preview.summary` | {count} of the last {window} buckets would have fired |

## 4.4 Channel picker

**What it is.** Three kinds: `in-app` (always on, cannot be removed — the notification centre
is the record of a firing), `email` (team users only, filtered to those who hold the measure's
permission), `slack` (a webhook chosen from ones already registered under Admin ›
Integrations, never a URL typed into the rule).

**Layout**

```
Channels
 ☑ In-app                    always on
 ☐ Email      [multi-select: Nora Al-Harbi ×, Faisal … ×]  [+ add]
 ☐ Slack      [ #finance-alerts ▾ ]
```

**Tokens / components.** In-app row: a checked, disabled `Checkbox` with `always on` as
static trailing text (not a tooltip — this is a fact the operator needs without hunting for
it, X15's inline test). Email: a `Command`-backed multi-select, chips shaped exactly like the
segment picker's chips (§1.2) — swatch-free here, since a recipient chip carries no series
colour. Slack: a `Select` populated from the webhook registry.

**States**

| State | Shown |
|---|---|
| Content | As above |
| Email checked, no eligible users | `Email` checkbox disabled in place, `rb.alert.channel.email.empty` — every team user who could receive it lacks permission on this measure |
| Slack checked, no webhook registered | `Slack`'s `Select` disabled in place, `rb.alert.channel.slack.empty`, with a real `<a>` to Admin › Integrations rather than a dead-end sentence |
| A previously-added email recipient loses their permission (D43, state #25) | That recipient's chip gains a leading `BreachedIcon` (amber, matching §1.2's ceiling marker) with `sr-only` text naming the reason; the owner separately receives a notification naming the recipient and the reason |

**Keyboard.** Checkboxes toggle with `Space`. The email multi-select follows the same
`Command` keyboard contract as the segment picker's saved-segment search. The Slack `Select`
is a native `Select`.

**RTL.** Mirrors wholesale. Chips follow the same Label-in-Name convention as every other
removable chip in this product.

**Copy**

| Key | English |
|---|---|
| `rb.alert.channel.inApp` | In-app |
| `rb.alert.channel.inApp.always` | always on |
| `rb.alert.channel.email` | Email |
| `rb.alert.channel.email.empty` | No team member with access to this measure can receive email. |
| `rb.alert.channel.slack` | Slack |
| `rb.alert.channel.slack.empty` | No Slack webhook is connected. |
| `rb.alert.channel.slack.addLink` | Add one in Admin › Integrations |
| `rb.alert.channel.recipientDropped` | Lost access to this measure |

## 4.5 Mute menu

**What it is.** A row action on the Rules list (and inside the composer for an existing rule)
— an inline `dropdown-menu`, never a dialog, offering a short list of durations plus a custom
date.

**Layout**

```
Mute for…  ⌄
 1 hour
 8 hours
 24 hours
 Until Monday
 Custom date…
```

When already muted, the menu instead opens with:

```
Unmute
──────
Mute for…  (the same five rows, to extend or replace the mute)
```

**Tokens / components.** `DropdownMenu` from a `Button variant="ghost" size="xs"` row action,
matching every other row-action kebab in the product. `Custom date…` opens a small `Popover`
with a date+time `Input` pair and an `Apply` — reusing the same commit/abandon contract as
every other inline draft in this spec.

**States**

| State | Shown |
|---|---|
| Not muted | `Mute for…` menu as above |
| Muted | Row shows `Muted until {time}` (state #26); menu opens with `Unmute` first |
| Custom date popover open, no date chosen | `Apply` disabled |

**Keyboard.** Standard `DropdownMenu` + `Popover` behaviour, consistent with every other menu
in this spec.

**RTL.** Mirrors wholesale.

**Copy**

| Key | English |
|---|---|
| `rb.alert.mute.menu` | Mute for… |
| `rb.alert.mute.1h` | 1 hour |
| `rb.alert.mute.8h` | 8 hours |
| `rb.alert.mute.24h` | 24 hours |
| `rb.alert.mute.untilMonday` | Until Monday |
| `rb.alert.mute.custom` | Custom date… |
| `rb.alert.mute.unmute` | Unmute |
| `rb.alert.mute.rowState` | Muted until {time} |

## 4.6 Lag state

**What it is.** Two related facts, both stated in words, never in colour alone: a single
rule's own evaluation lag (row-level), and the list-level fact that no rule has a cadence at
all (banner-level).

**Row-level (state #28).** In the Rules table's `Last evaluated` cell:

```
Last evaluated 3 h ago · expected hourly
```

rendered `text-warning-foreground` with a leading `BreachedIcon` (`size-3.5`, `aria-hidden`,
`text-warning-graphic`) **only** when lag > 2 × cadence; otherwise the cell reads the plain
relative time in `text-muted-foreground`, no icon. This is a cell content change, not a badge
— R7's tone set governs badges specifically, and a table cell stating a fact in coloured text
plus an icon plus words is the same three-part pattern the rest of the product already uses
for a warning fact (never colour as the only carrier).

**List-level.** When **no rule in view has a cadence**, an undismissable banner (R1: pale
tinted card, `tone="warning"`) sits above the Rules table:

```
┌ ⚠ A rule without a cadence never runs.                          ┐
│   Set a cadence so it can evaluate and fire.        [Set cadence]│
└────────────────────────────────────────────────────────────────┘
```

This banner is **removed once D41 lands** (server evaluation ships) — it exists only while
"no scheduler runs any rule" is a true, standing condition an operator needs to act on (R10:
standing condition → banner, and it must be the *only* banner on the surface — never two
page-level banners).

**States**

| State | Shown |
|---|---|
| Lag ≤ 2 × cadence | Plain relative time, no icon, no colour |
| Lag > 2 × cadence | Icon + warning-tone text, as above |
| `cadence === null` (not scheduled) | The cell reads `Not scheduled` in `text-muted-foreground` — this is not a lag state, it is the honest absence of one, and it must not also carry the warning icon (that would conflate "never runs" with "is late") |
| No rule anywhere has a cadence | The list-level banner, above |
| At least one rule has a cadence | No banner, even if other rules are `Not scheduled` — the banner's claim is about the *view*, not about any one rule |

**Keyboard / RTL.** The banner's one action (`Set cadence`) is a real `<button>`, tab-
reachable, opening the composer scrolled to the `Cadence` field. Mirrors wholesale — no
numeral runs beyond the relative time, which is prose, not a numeral run needing isolation.

**Copy**

| Key | English |
|---|---|
| `rb.alert.state.lag` | Last evaluated {duration} ago · expected {cadence} |
| `rb.alert.state.notScheduled` | Not scheduled |
| `rb.alert.banner.noCadence.title` | A rule without a cadence never runs. |
| `rb.alert.banner.noCadence.body` | Set a cadence so it can evaluate and fire. |
| `rb.alert.banner.noCadence.action` | Set cadence |

---

# 5 — Analyst (`?view=analyst`)

## 5.1 Ask composer

**What it is.** An inline card at the top of the analyst view — never a dialog. A `Textarea`
for the question, a `Kind` segmented control, optional context chips, one primary `Ask`.

**Layout**

```
┌ Ask the analyst ──────────────────────────────────────────┐
│ [ Why did completed trips drop in Riyadh last week?      ] │
│                                                              │
│ Kind    [ Answer · Case study · Draft a page · Weekly review ]│
│ Attach  [Weekly gross fares ×]                    [+ Attach…] │
│                                                       [Ask]    │
└────────────────────────────────────────────────────────────┘
 Runner offline. Your question will wait until it reconnects.
```

**Tokens / components.** `Textarea`, growing with content (`field-sizing: content` where
supported, the same measured fallback the page editor's text blocks already use — one growth
mechanism, not two). `Kind`: `Tabs`/`TabsList variant="segmented"`, four-way — a mode switch
that changes the output schema entirely, the clearest possible case for the segmented control.
Context chips: same shape as the segment picker's and the filter row's chips (§1.2), added via
an `Attach…` popover listing the four attachable kinds (a saved report / a page / an alert
firing / a date range). `Ask` is the view's one primary.

**States**

| State | Shown |
|---|---|
| Content, ready | `Ask` enabled |
| Empty question | `Ask` disabled — no reason sentence needed, an empty required field is self-evident and does not meet X15's "would the operator act differently" bar |
| Runner offline | `Ask` disabled in place; **inline** sentence under the composer (not only a tooltip — X15's test: this fact changes what the operator does, so it must be readable without hunting for it), `an.compose.disabled.offline` |
| At usage limit | Same treatment, `an.compose.disabled.limited`, naming the retry time |
| Attaching | The `Attach…` popover's own list has its own loading/error/empty states, mirroring §1.2's saved-segment section exactly (same component family, different resource) |

**Keyboard.** `Textarea` is a normal multi-line field (`Enter` inserts a newline; there is no
submit-on-Enter, because a question is frequently more than one line and a stray `Enter`
sending an incomplete question is a worse failure than one extra click). `Kind`'s segmented
control follows the house arrow-key contract. `Ask` is the last stop before the row wraps to
context chips' remove buttons.

**RTL.** Mirrors wholesale — a question is prose, and prose in Arabic reads right-to-left
exactly as English reads left-to-right, with no numeral or axis exception involved.

**Copy**

| Key | English |
|---|---|
| `an.compose.heading` | Ask the analyst |
| `an.compose.question.placeholder` | Ask a question about the business |
| `an.compose.kind` | Kind |
| `an.compose.kind.ask` | Answer |
| `an.compose.kind.caseStudy` | Case study |
| `an.compose.kind.page` | Draft a page |
| `an.compose.kind.review` | Weekly review |
| `an.compose.attach` | Attach… |
| `an.compose.action.ask` | Ask |
| `an.compose.disabled.offline` | Runner offline. Your question will wait until it reconnects. |
| `an.compose.disabled.limited` | At usage limit until {time}. Ask again after that. |

## 5.2 Job timeline

**What it is.** The job page's body while `running`: a live list of steps (tool name, one-
line summary, duration) plus interim findings from `note_finding`, refreshed by polling every
2 seconds.

**Layout**

```
 ● Read the job details                              0.1s
 ● Looked up measures                                 0.4s
 ● Checked the question                                0.2s
 ● Ran a report · Completed trips, Riyadh, by day       1.8s
 ○ "Riyadh North fell 22% week over week, the rest      —
    of the city held steady."                    (finding)
 ● Found what changed                                  2.1s
 …
 ⠋ Ran a report · Completed trips, Riyadh North           …
```

**Tokens / components.** An ordered `<ul>`, each step a small row: a status dot (`●` filled
`text-muted-foreground` for a completed step, a spinner glyph — **not** `animate-spin` on an
indefinite loop without the `prefers-reduced-motion` guard already built into `Skeleton` — for
the in-flight step, reusing that same guarded mechanism rather than a bespoke spinner), the
step's translated label (the table below), and its duration right-aligned, `tabular-nums`,
`text-muted-foreground`. A `note_finding` row is visually distinct: `text-foreground` (not
muted — a finding is content, not chrome), a small `○` marker in `text-info-foreground`, no
duration column (a finding is not a timed step).

**Tool-label dictionary** (chrome, final, translated; the finding text itself is the model's
own prose in the operator's language, not a copy key):

| Tool | `an.tool.<name>` |
|---|---|
| `catalogue_measures` | Looked up measures |
| `catalogue_dimensions` | Checked available splits |
| `glossary` | Checked a definition |
| `plan_query` | Checked the question |
| `run_report` | Ran a report |
| `compare_windows` | Compared two periods |
| `describe_series` | Described the trend |
| `correlate` | Checked a correlation |
| `contribution` | Found what changed |
| `sample_rows` | Sampled a few rows |
| `saved_reports_search` | Searched saved reports |
| `get_saved_report` | Opened a saved report |
| `save_report` | Saved a report |
| `pages_search` | Searched pages |
| `get_page` | Opened a page |
| `create_page_draft` | Drafted a page |
| `alerts_list` | Checked alert rules |
| `alert_history` | Checked firing history |
| `alert_context` | Checked a firing |
| `annotations_list` | Checked annotations |
| `prior_studies_search` | Searched past studies |
| `note_finding` | *(no label — the finding's own text is shown)* |
| `job_context` | Read the job details |

Where a tool's input names something (a report, a measure), the step label carries it after a
`·`, per `copy.md`'s qualifier rule — `Ran a report · Completed trips, Riyadh, by day` — built
from the tool's actual input, never a second freeform sentence.

**States**

| State | Shown |
|---|---|
| `running` | Steps append live; the in-flight step shows its guarded spinner |
| `queued` | No steps yet; one grey sentence, `an.timeline.queued` |
| `done` | Every step shown, resolved; the timeline collapses to a `Show steps` disclosure beneath the finished result (the steps are provenance, not the headline, once the job is done) |
| `deferred` | Steps shown so far, plus a line stating the retry time, `an.timeline.deferred` |
| `failed:timeout` | Steps shown so far, findings kept, plus `an.timeline.timedOut` |
| `failed:evidence` | `an.timeline.evidenceMismatch`, with the specific mismatched values listed underneath |
| `failed:schema` | `an.timeline.schemaFailed`, `Re-run` offered |
| Tool error (a blocked series, a 403) | **Not** a failure state — the step still shows as completed, its label unchanged, and the refusal surfaces later in the result's own `dataQuality.blockedSeries`, never as a red step here |

**Keyboard.** The timeline is a plain reading list — `Tab` skips over it as a landmark region
(`role="log" aria-live="polite"` while `running`, so new steps are announced without stealing
focus) rather than stopping at every row, because there is nothing to activate per row.

**RTL.** Mirrors wholesale. Durations stay `tabular-nums` numeral runs (no reordering, per the
standing numeral-run rule) but the row itself — dot, label, duration — reverses left-to-right
into inline-start-to-inline-end like any other row.

**Copy**

| Key | English |
|---|---|
| `an.timeline.queued` | Waiting for the runner to pick this up. |
| `an.timeline.showSteps` | Show steps |
| `an.timeline.deferred` | Paused — the runner is at its usage limit until {time}. |
| `an.timeline.timedOut` | This job ran out of time. Here is what it found before stopping. |
| `an.timeline.evidenceMismatch` | The analyst couldn't substantiate its own numbers, so this job did not finish. |
| `an.timeline.schemaFailed` | This job's answer didn't come back in the expected shape. |
| `an.timeline.rerun` | Re-run |

## 5.3 Provenance panel

**What it is.** A rail beside the finished result (main + rail shape for the job page, per the
pattern note at the top of this document), listing every run the job made — query, window,
`asOf` — each with an `Open in builder` link.

**Layout**

```
 result (main)                        Provenance (rail, --ev-detail-rail-w)
 ┌───────────────────────────┐        ┌─────────────────────────────┐
 │ heading, findings, charts │        │ Run 1                          │
 │ …                          │        │ Completed trips · by day        │
 │                             │        │ 1–7 Jun 2026 · as of 12:03       │
 │                             │        │                Open in builder →│
 │                             │        │ ─────────────────────────────  │
 │                             │        │ Run 2                            │
 │                             │        │ …                                 │
 └───────────────────────────┘        └─────────────────────────────┘
```

**Tokens / components.** A `Card`-less list (the rail is already framed by the page's own
main+rail shape, so a second nested card would double the border) — each run is a plain block
separated by `border-t border-border`, `py-2`. `Open in builder` is a real `<a>` (not a
`<button>`, it navigates) styled per the link rule (`--ev-blue-dk` + underline, R3) with a
trailing `ExpandIcon` or an outbound-style chevron from the registry.

**States**

| State | Shown |
|---|---|
| Content | Every run listed, newest first |
| Zero runs (an `answer`-kind job that only used T1–T3) | One grey sentence, `an.provenance.none` — a job can legitimately finish having run nothing, e.g. a glossary lookup |
| A run's report was since deleted | The run entry stays (it is a record of what happened, not a live link); `Open in builder` is replaced with plain text, `an.provenance.reportGone` |

**Keyboard.** Plain reading order; each `Open in builder` link is independently tabbable.

**RTL.** Mirrors wholesale — the rail sits at the content's inline-end automatically under the
shared detail-shape grid (`--grid-template-columns-detail`, already logical), no change needed
here beyond what the shape already guarantees.

**Copy**

| Key | English |
|---|---|
| `an.provenance.heading` | Provenance |
| `an.provenance.openInBuilder` | Open in builder |
| `an.provenance.none` | This job didn't run a report. |
| `an.provenance.reportGone` | Report deleted |
| `an.provenance.asOf` | as of {time} |

## 5.4 Runner-offline state

**What it is.** A small status line in the analyst view's header, one of three facts, each
sourced from `GET /api/v1/agent/status`.

**Layout**

```
 ● Runner online · last seen 12:03
```
```
 ○ Runner offline
```
```
 ○ At usage limit until 14:00
```

**Tokens / components.** A leading dot plus text, `role="status"`. **Online** is the first
real consumer of the shipped-but-unused `--animate-live-pulse` utility (`globals.css:2939`,
R18's sanctioned "this feed is live" loop): `size-1.5 rounded-full bg-success-foreground
animate-live-pulse`, paired with the words "Runner online" so the loop never carries meaning
on its own (R18: a loop may never encode severity by itself). **Offline** and **at usage
limit** are static dots (`bg-muted-foreground`, no animation) — they are facts, not a live
feed, and R18's licence is for liveness only.

**States**

| State | Shown |
|---|---|
| Online | Pulsing green-ink dot + `Runner online · last seen {time}` |
| Offline | Static dot + `Runner offline`; the ask composer is disabled in place (§5.1) with its own inline reason; every queued job's row states it is waiting, not failed |
| At usage limit | Static dot + `At usage limit until {time}`; composer disabled in place with the retry time; queued jobs stay queued |
| Status request itself fails | The status line is omitted entirely rather than showing a stale or invented state — a missing fact is honest, a guessed one is not |

**Keyboard.** The status line is not interactive — it is `role="status"`, read by assistive
tech on change, with nothing to tab to.

**RTL.** Mirrors wholesale; the dot sits at the line's inline-start via `ms-` spacing, never
`left`.

**Copy**

| Key | English |
|---|---|
| `an.status.online` | Runner online · last seen {time} |
| `an.status.offline` | Runner offline |
| `an.status.limited` | At usage limit until {time} |

---

# 6 — Components used, consolidated

| Component | Where | Variant / tone |
|---|---|---|
| `Input` | Formula, transform stepper, segment name, window dates, threshold, condition amounts | default, `tabular-nums` where numeric, `font-mono` only on the formula field |
| `Checkbox` | Transform rows, channel picker's in-app row | default, R19 resting boundary unchanged |
| `Select` | Formula's none, transform's none, comparisonDisplay, fixed-compare's four immediate options, series/webhook/against/lookback-grain pickers | `size="sm"` in toolbars, default in rails |
| `Tabs` / `TabsList variant="segmented"` | Condition kind, cadence, direction/measure sub-toggles, columns width, ask-composer kind | R15's stadium exception, licensed |
| `Popover` | Segment add, fixed-comparison range, mute's custom date, add-annotation is **not** a popover (see below) | `align="start"`, `Cancel`/`Apply` pair where a draft exists |
| `DropdownMenu` | Legend entry's `Isolate`, `View` menu, block menu, mute menu | checkbox items for `View`, plain items elsewhere |
| `Command` | Add-block picker, slash command, saved-segment search, email recipient multi-select, attach popover | inline anchor, never centred, except the existing command palette itself |
| `Button` | Every primary/secondary/ghost/link instance named above | `default` = one primary per surface (Run/Save rule/Ask/Add annotation/Apply), never two |
| `Badge` | Alert row state (`armed` success, `firing` warning, `cooling` info, `suspended`/`error` neutral), job state (`queued` neutral, `running` info, `deferred` warning, `done` success, `failed` warning) | R7's five tones, **no sixth, no red**, unchanged from v1 |
| Custom chip (`<span>`, not `Badge`) | Formula's A/B reference chips, segment chips, filter chips, email recipient chips, context-attachment chips | `rounded-control`, `border-border`, `bg-muted` — reserved for removable/contextual tags, never a status |

No control in this spec introduces a sixth badge tone or a red use beyond R5a's existing four.

---

# 7 — Open questions and dependencies (not resolved here)

1. **Eight-hue segment ramp (D40, owner).** Only six categorical hues ship today. §1.2 flags
   this rather than inventing a seventh/eighth colour or a fallback scheme — that decision is
   the owner's and design-token-steward's, not mine to make inside a component spec.
2. **`--ev-block-h-s/m/l/xl` and the two chart hues (`--chart-s7`/`s8`)** need minting by
   design-token-steward before §2.1 and §3.5 can be built as written. Neither is invented here.
3. **`Q-RB-9` (critical severity gating)** is inherited, unresolved, from v1 — §4.1 keeps the
   field disabled in place until it is settled, exactly as v1 already does.
4. **Recipient permission resolution (D4, open in the base spec)** — §4.4's email picker is
   specified against the *intended* filter ("users who hold the measure's permission"); the
   actual predicate depends on D4 landing, same dependency `AlertRuleDialog.tsx`'s own header
   comment already names for the recipient picker it does not yet have.

---

# Handoff

This spec covers every control named in `AGENT-BRIEF.md`'s report-rail, chart-surface, page-
block, alert-composer and analyst work packages, each with tokens (not pixels, except where a
token itself carries one), all four base states plus every named domain state, keyboard
behaviour, RTL behaviour, and final English copy under its namespace (`rb.*` for the rail and
chart, `rb.alert.*` for alerting, `pg.*` for pages, `an.*` for the analyst). Arabic entries are
the i18n engineer's, per `AGENT-BRIEF.md`'s division of labour — no `defaultValue` literal
appears anywhere above; every string is a final sentence ready to be keyed.
