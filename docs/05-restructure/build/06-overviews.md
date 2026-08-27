# 06 — The metric boards: eight table-less sub-tabs

**Implements:** `DESIGN.md` **§3.7** · `design/03-navattic-language.md` **§4.9** (tile anatomy),
**§1.3** (the two chart roles) · `specs/00-foundation.md` **§3.4**
**Consumes:** `src/data/types/metrics.ts` and `src/data/clients/metrics.ts` (mock-data-engineer)
**Owner:** frontend-engineer (wave 4)
**Not in this document:** the metric fixtures, the metrics-library sidebar (§3.7 customise
mode), the date-range and compare chips, and every table-shaped surface.

---

## 1. The one thing to read

**There are eight boards and one screen component.** `MetricBoardScreen` is mounted by
`routes.tsx` for every id in **`METRIC_BOARD_SUB_TABS`**, and a board's contents come from
`getMetricBoard(subTabId)`.

Wave 4's bar was *"eight screens that are individually fine but do not read as one family is
a failure of this wave."* One component is how that is made structural rather than reviewed:
the header, the tile grid, the chart grid, the freshness line and the four states are decided
once, and **there is no per-screen file for two boards to drift apart on.** What varies
between them is *which numbers* — and that is a data question, answered where the numbers are.

The second consequence is that **adding a ninth board is a fixture change**, not a code
change. `routes.tsx` reads the sub-tab list from the data layer, the same way §11.3 requires
of permissions.

---

## 2. What was built, file by file

### 2.1 `src/components/metrics/` — new

| File | |
|---|---|
| `MetricTile.tsx` | §4.9's stat tile: icon, value, label, delta chip. The whole tile is the deep-link target (AC-16). |
| `MetricTileRow.tsx` | The grid. 3 across below `--ev-bp-wide`, 4 above **when four divides the row** — see §4.1. |
| `ChartCard.tsx` | §3.7's chart card, and **the place the kinds of "no data" are kept apart** — see §3. |
| `TrendChart.tsx` | The plot. Two colour roles, both written out, plot pinned LTR. |
| `formatMetric.ts` | `number \| null` + `MetricUnit` → a string. Six units, one `switch`. |
| `metrics.test.tsx` | 17 tests over the delta rules and the four states of a window. |
| `index.ts` | The barrel. |

### 2.2 `src/screens/metrics/` — new

| File | |
|---|---|
| `MetricBoardScreen.tsx` | The one screen. Four states, `getMetricBoard`, `SingleColumnPage`. |
| `copy.ts` | 45 metric/chart labels + the state strings. One dictionary for all eight. |
| `copy.test.ts` | Asserts the labels and the fixture keys agree, in both directions. See §5. |
| `index.ts` | The barrel. |

### 2.3 Files I do not own, and exactly what changed in them

| File | Change | Why it had to be there |
|---|---|---|
| `src/routes.tsx` | **Two edits.** One import (`MetricBoardScreen`, and `METRIC_BOARD_SUB_TABS` added to the existing `@/data/clients` import). One branch in `screenFor`, replacing nothing. | The route table is the only place a screen is registered. |
| `src/i18n/dictionaries.ts` | **Two lines** — one `import { OVERVIEW_EN }` and one `...OVERVIEW_EN` in the assembly. | The pattern `people/copy.ts` set: a screen owns its copy and the dictionary merges it in one line. |
| `src/components/LoadingSkeleton.tsx` | **`case 'P5'` only.** Its bars were a title, a value and a **48px chart block** — a shape no metric tile has ever had. Now the tile's own anatomy (16px icon, value, label, chip) at `gap-3`. | §11.3: nothing may move when the data lands. The skeleton and the tile are one decision. |

Nothing else outside `src/components/metrics/` and `src/screens/metrics/` was touched.
`components.json` is untouched and no `shadcn add` was run.

---

## 3. The kinds of "no data", and why none may borrow another's rendering

This is the part of the brief that shaped the most code. `SeriesWindow`'s own doc comment
draws the line; `ChartCard` is where it becomes pixels.

| Window | Means | Renders as |
|---|---|---|
| `points: []` | **no data for this range at all** | §3.7's one centred grey sentence, verbatim with its trailing period. Card, title and report link all kept. |
| some `value: null` | **a gap** — the day is in the range and has no reading | the line **breaks** (`connectNulls={false}`) and the gaps are counted: *"No reading on 2 of 7 days."* |
| every `value: null` | we know the days and have no readings for any of them | the same sentence at full count — **not** the no-data sentence, because we know which days are missing |
| every `value: 0` | the measurement ran and the answer was **zero** | a flat baseline plus *"Every value in this range is zero."* |
| `comparison: null` | there is no comparison period | the legend's dotted chip **does not disappear** — it says *"No comparison period yet"* |

And on a tile, `deltaPercent === null`: an **em dash**, never `0%` and never blank (§3.7),
plus the reason in words. `NoComparisonReason` has three arms and they get three strings,
because *"no history yet"*, *"nobody set a target"* and *"too little data to compare"* are
three different things to do about it.

**`0%` survives.** "Measured, did not move" and "nothing to compare to" are different facts.
That is the assertion people forget and it is `metrics.test.tsx`'s third test.

**Collapsing all-zero into no-data is the defect this table exists to prevent.** A week with
zero unserved requests is the best week the market team has had; telling them the data is
missing hides a good result behind an error-shaped sentence and sends them looking for a
broken pipeline that is working. Management › Market & Zones renders exactly this today —
see the capture.

---

## 4. The tile and chart inventory

Eight boards, **34 tiles and 8 charts**, all live off `getMetricBoard`. Every figure below
is what the screen actually renders, read off the captures.

| Board | Tiles | Chart | The state it demonstrates |
|---|---|---|---|
| Management › **Overview** | 6 — total revenue *(money)*, active subscriptions, active captains, registered riders, plans keeping the same captain *(%)*, on-time pickups *(%)* | `revenue` *(money)* | the only board with a **real previous-period comparison**: a dotted same-hue line and a `+8.1%` chip |
| Management › **Performance** | 4 — contribution margin *(%)*, average renewal rate *(%)*, trips completed, average captain rating *(rating)* | `onTimePickup` *(%)* | a percentage axis |
| Management › **Risk & Signals** | 4 — open signals, revenue at risk *(money)*, captains at risk, captains with repeat incidents | `openSignals` | four tiles in one category; the only board where a tile has **no drilldown** and is correctly not a link |
| Management › **Growth** | 4 — promotion spend *(money)*, subscriptions from promotions, new riders, dormant riders *(%)* | `newSubscriptions` | a **target** comparison (`−34.8% vs 22,000.00 SAR target`) and a **real measured `0`** beside it |
| Management › **Market & Zones** | 4 — zones tracked, worst demand-to-supply ratio *(ratio)*, average request failure rate *(%)*, cities live | `unservedRequests` | **all-zero**: a flat current line, a dotted comparison that is not flat, and the sentence that says so |
| Operations › **Overview** | 4 — open requests, work items past their SLA, legs without a backup captain, applications waiting | `completedTrips` | the tiles agree with the nav badges, because both count the same fixtures |
| Support › **Overview** | 4 — open safety incidents, open fairness cases, contacts per 1,000 trips *(ratio)*, appeals overturned *(%)* | `contactsPerThousandTrips` | **an empty window** — §3.7's centred sentence, with the card, title and report link kept — beside a tile whose value is `null` and renders an em dash |
| Admin › **Overview** | 4 — active operators, operators without two-factor, activity events, open erasure requests | `activityEvents` | a four-digit count in a tile |

`support-fairness` is in `METRIC_BOARD_SUB_TABS` and is **deliberately excluded** in
`routes.tsx`: its board is the `captain-economics` view inside a work queue, and mounting the
board screen on `/support/fairness` would replace a queue with a strip of tiles. Its two
metric labels are keyed anyway, so the day that view is built the strings are there.

---

## 5. Decisions taken, with their reasons

### 5.1 The delta chip is neutral — and this contradicts both §3.7 and the data layer

`Metric.higherIsBetter` exists, and its own doc comment says *"Drives the delta's colour,
which §3.7 requires alongside the caret."* §3.7 agrees: *"Deltas MUST be colour-coded and
carry a direction caret."*

**D7 §4.9 overrules the colour half and it is later and narrower:** *"A delta chip does not
take the success or critical tone… A number going up is not, by itself, good news — R7's
tones carry status and a delta is a quantity."* The reference renders `0%` neutral beside
every metric, and V6's reasoning survives D7 unchanged.

So the chip is `tone="neutral"` and the caret is not redundancy — **it is the only visual
carrier**, which is what makes §7.5 pass for free.

**`higherIsBetter` is still used, and this is the part worth keeping.** It is spent on the
direction phrase a screen reader hears: `up, which is worse` on a churn metric,
`up, which is better` on revenue. That is the entire content of a green or red delta, said in
a way that does not depend on seeing colour. → **finding W4-F2**, for product-designer.

### 5.2 The tile is an `<a>` wrapping the card, not a card with a stretched pseudo-element

The first cut used `after:absolute after:inset-0 after:content-['']` on an inner link. That
is an arbitrary value (`content-['…']`) and it puts the focusable element and the visible box
in two different places, so the ring needs a `focus-within` proxy. Wrapping the card in the
anchor makes them one object, and the ring traces the tile at its own radius.

A tile with `drilldownRoute: null` is a plain card and is **not in the tab order** — a focus
stop that does nothing is worse than no focus stop.

### 5.3 The leading glyph is a lucide icon, not a Unicode mark — and the first cut was a defect

§4.9 evidences a 16px glyph above the value. The first cut used literal marks — `◍`, `⚑`,
`⌁`, `▲` — and **it painted in colour**: Inter carries almost none of them, the browser fell
through to `Segoe UI Emoji`, and the tiles rendered multicolour glyphs. *A colour entered the
page from a font fallback, and no token audit can see that.* It is only visible in a capture.

Now every mark is `lucide-react` — monochrome SVG on `currentColor`, already a dependency
(`Banner.tsx`, `FilterChipRow.tsx`), not a second component library. The icon is chosen from
`Metric.category`, so a seventh category is a compile error rather than a blank tile.

**Recorded as a general trap:** a Unicode geometric shape or dingbat in a `className`-styled
span is not a safe way to draw an icon in this product.

### 5.4 Four numeral runs needed `<bdi>`, and Arabic is how they were found

`dir="rtl"` rendered `SAR 42,186.50`, `8.1%+`, `4.2%−` and `Jun – 18 Jun 12`. All four are
the UBA doing exactly what it should: a trailing `SAR`, a leading `+`/`−` and an en dash
between two numeral runs are bidi-neutral and reorder in an Arabic paragraph.

`money.ts` names the isolation as **the component's** job, deliberately — *"embedding
U+2068/U+2069 here would poison copy-paste and assertions."* So the tile's value, its delta,
its `vs …` phrase and both legend ranges are `<bdi>`. **Nothing in the strings changed.**

### 5.5 The chart plot is pinned `dir="ltr"`

The wave brief said *"axis placement and reading order flip"*. **`DESIGN.md` §9.2 says the
opposite and it is binding** — D7 explicitly does not touch §9:

> MUST NOT apply `dir="rtl"`, `direction: rtl`, or `transform: scaleX(-1)` to … any chart
> plot area, any SVG axis group … **MUST NOT reverse a time-series axis in Arabic mode.**

So the plot is pinned LTR and the card around it — title, legend, report link, the freshness
line — mirrors normally. The Arabic capture shows the axis running 19 Jun → 25 Jun in both
directions. → **finding W4-F3**, correcting the brief.

### 5.6 A count axis takes `allowDecimals={false}`

A count series over a 0–2 domain gets ticks at 0, 0.67, 1.33, 2, and `formatCount` rounds
them to `0 1 1 2` — an axis showing the same label twice, which the first Market & Zones
capture did. Only counts are integral; a rate, a rating and a money amount are not.

### 5.7 Four across only when four divides the row

The reference shows both arrangements and shows why: `02b895df` is four across, and
`5b908c10` is **six in two rows of three**, not four-then-two. A trailing row of two under a
row of four reads as a layout that ran out.

The choice only exists above the breakpoint. Below it the content region is 912px and D7's
268px tile floor allows three columns and no more, so a four-tile board renders 3 + 1 at
1280 — which is exactly what `auto-fill minmax(268px, 1fr)` produces, and shrinking to 219px
tiles to avoid a ragged edge would wrap every label instead.

### 5.8 The empty state can only be `first-run`

AC-37/38: the kind comes from whether a filter is active. **A board has no filter** — there is
no query to relax and no `Clear filters` to offer — so `no-match` is not representable and the
choice is mechanical, not taste.

A board is empty when it has no computable number **and** no drawable chart. One `value: null`
tile is not emptiness: a board carrying four real counts beside two that could not be computed
is a content page with honest holes in it, and replacing it with an illustration would be a
lie. A sub-tab with **no board at all** 404s from the client and arrives as an *error*, which
is `getMetricBoard`'s own choice and the right one — *"a table screen calling this is a bug,
and a silently empty board would hide it."*

---

## 6. The stand-in that was built and then deleted

Wave 4 started before `src/data/clients/metrics.ts` existed. Following the brief — *"build the
screen against the shape you need and say precisely what you need in your handoff rather than
inventing a fixture or reaching around the seam"* — this directory briefly carried a
`contract.ts` (the types the screens needed) and a `source.ts` (a documented adapter that
counted real records through the existing clients and marked everything it could not answer
honestly as absent).

**`src/data/types/metrics.ts` and `src/data/clients/metrics.ts` landed mid-build, and they are
richer than the stand-in was.** Both stand-in files were deleted rather than left to drift
beside the real thing, and every component was re-typed against the real contract. Recorded
here because a stand-in that survives the resource it stood in for is how two answers to one
question ship.

Three things the real contract has that the stand-in did not, and all three earn their place:
`higherIsBetter`, a `target` comparison arm with an owner and an effective date, and
`NoComparisonReason`'s three-way split.

---

## 7. Verification — the real output

```
npx tsc -b --noEmit      clean, no output
npx vitest run           42 files, 986 tests, 986 passed, 0 failed
npx vite build           ✓ built in 7.56s
```

**My own count, separated as asked:** 23 new tests
(`components/metrics/metrics.test.tsx` 17, `screens/metrics/copy.test.ts` 6), all passing.
**Zero failures anywhere in the suite** — the ~22 red tests in `src/shell` had already been
re-cut by QA before this work landed.

**`dist/` greped, not assumed.**

```
recharts literals in dist JS      #3182bd ×2  #808080 ×1  #ccc ×4  #fff ×4
  ...as PROP DEFAULTS from node_modules — this is the Q5 leak, and it is why the
  defence block exists rather than evidence that it failed

hexes in dist CSS that are not a token value
  #3182bd  #808080  #ccc  #eee  #fff
  ...all five appear ONLY inside attribute selectors in the [data-slot="chart"]
  block, i.e. they are the values being OVERRIDDEN, not painted:
     stroke="#3182bd" ×1   fill="#808080" ×2   stroke="#ccc" ×3   fill="#eee" ×1

@media (min-width:)               1     ← exactly one, still
@media (hover:hover)              5
@media (prefers-reduced-motion)   2
@media (forced-colors:active)     1
tailwind palette classes in CSS   0
physical direction utilities      0
```

**And what the browser actually paints.** Every colour on a live chart SVG, read from
`getComputedStyle` on every node (`scratch/w4-chart-probe.mjs`):

```
stroke rgb(43,110,240)   = #2b6ef0  --ev-blue        (series AND comparison — same hue)
fill   rgb(234,240,254)  = #eaf0fe  --ev-blue-lt     (--chart-fill)
stroke rgb(107,114,128)  = #6b7280  --ev-text-2      (--chart-axis)
fill   rgb(107,114,128)  = #6b7280  --ev-text-2      (axis ticks)
color  rgb(23,26,33)     = #171a21  --ev-ink
fill   rgb(0,0,0)        — <title>, <desc>, <defs>, <clipPath> and two empty <g>
                           layers. Nothing that paints. Verified node by node.
```

**No `#3182bd` reaches a rendered mark.** Every stroke and fill is set explicitly on the
component *and* covered by the defence block; the block was not removed and not worked around.

**Token audit — clean.** Across `components/metrics`, `screens/metrics`, `routes.tsx`,
`LoadingSkeleton.tsx` and `dictionaries.ts`: zero palette classes, zero arbitrary values,
zero raw colours, zero physical directions, zero `<div onClick>`, zero hover-only reveals,
and every `outline-none` paired with a `focus-visible:ring`. The only inline style in the
layer was removed with the breakdown list. (`grep` for `slate-` also matches `translate-`;
those hits in `components/ui/` are that false positive, not palette classes.)

**Live probe, all 11 routes, `pageerror` and `console.error` captured
(`scratch/w4-verify.mjs`):**

```
/                          200  h1="Overview"          no errors
/management/overview       200  h1="Overview"          no errors
/management/performance    200  h1="Performance"       no errors
/management/risk           200  h1="Risk & Signals"    no errors
/management/growth         200  h1="Growth"            no errors
/management/zones          200  h1="Market & Zones"    no errors
/operations/overview       200  h1="Overview"          no errors
/support/overview          200  h1="Overview"          no errors
/admin/overview            200  h1="Overview"          no errors
/support/fairness          200  h1="Captain Fairness"  no errors   ← still the queue
/exec/overview             200  (not-found, URL not rewritten — AC-12, unchanged)
```

### Captures — `scratch/shots/`

| File | |
|---|---|
| `w4-mgmt-overview-1440.png` · `-1280.png` | 6 tiles, real previous-period comparison, dotted same-hue line |
| `w4-mgmt-performance-1440.png` · `-1280.png` | percentage axis |
| `w4-mgmt-risk-1440.png` · `-1280.png` | four tiles in one category; one non-linked tile |
| `w4-mgmt-growth-1440.png` · `-1280.png` | a **target** comparison and a real measured `0` |
| `w4-mgmt-zones-1440.png` · `-1280.png` | **all-zero** — the flat line and the sentence |
| `w4-ops-overview-1440.png` · `-1280.png` | tiles agreeing with the nav badges |
| `w4-support-overview-1440.png` · `-1280.png` | **empty window** — §3.7's centred sentence, card and report link kept |
| `w4-admin-overview-1440.png` · `-1280.png` | |
| `w4-mgmt-overview-rtl-1280.png` | `dir="rtl" lang="ar"` — money and deltas in the right order, legend ranges intact, **plot LTR and the time axis unreversed** |

RTL probe (`scratch/w4-rtl.mjs`): `html[dir]=rtl`, plot `dir=ltr` and
`computed direction: ltr`, `h1` 24px (the Arabic `--text-xl` floor fires), rail at x=1192
(inline-end), tile `text-align: start`, no page errors.

---

## 8. Findings — raised, not decided by me

| # | Finding | Owner |
|---|---|---|
| **W4-F1** | **Management › Market & Zones is declared an Index table, not §3.7.** `specs/00-foundation.md` §3.4 row 5 says *"Index table (§3.1–3.3)"* and `routeTable.ts` agrees (`patterns: ['P1']`) — but it was named in wave 4's scope, the metrics resource seeds it a board, and `METRIC_BOARD_SUB_TABS` lists it. It renders as a board today. **Either the spec row is stale or the board is wrong**; the zone index table is deliberately not built, because table-shaped work is frozen. | product-designer |
| **W4-F2** | **§3.7 requires a coloured delta and D7 §4.9 forbids one.** The chip is neutral (D7 is later and narrower) and `higherIsBetter` is spent on the screen-reader phrase instead. `Metric.higherIsBetter`'s own doc comment still says it drives the colour and should be corrected, or D7 §4.9 amended. | product-designer |
| **W4-F3** | **The wave brief says charts mirror in Arabic; `DESIGN.md` §9.2 says they must not.** §9.2 is binding and D7 does not touch §9, so the plot is pinned LTR. Recorded so the brief is not cited back at the build. | product-owner |
| **W4-F4** | **`Metric.key` carries no display label, so the dictionary and the fixtures must be kept in step by hand.** Renaming `management.zones.failedRequests` → `unservedRequests` **took the board down** mid-build, because `createTranslator` throws on a missing key (correctly, AC-74). `copy.test.ts` now catches it in CI instead. The durable fix is a `labelKey` on `Metric` and on `TimeSeries`, owned by whoever adds the seed. | mock-data-engineer |
| **W4-F5** | **`formatPercent` and `formatDecimal` have no home in `src/lib`.** They live in `components/metrics/formatMetric.ts` and belong beside `format/number.ts`'s `formatCount` and `formatRange`. Eight call sites already. | utilities-engineer |
| **W4-F6** | **Recharts warns `The width(0) and height(0) of chart should be greater than 0` on every jsdom render.** Harmless — jsdom has no layout — but it is now noise in `qa.shell.test.tsx`'s output as well as mine, because the boards render on the landing route. Suppressing it globally is a worse habit than living with it; if QA wants it gone it is a filter in `src/test/setup`. | qa-engineer |
| **W4-F7** | **The `ratio` unit renders as a bare decimal.** `7.0` for "worst demand-to-supply ratio" is ambiguous; the legacy panel writes `2.4× demand/supply` (`:6953`). Adding the `×` is a copy decision, not an engineering one. | product-designer |
| **W4-F8** | **A card title is `text-sm` (14px) where D7 §1.6 gives the card/section title `--text-lg` (17px).** `ui/card.tsx`'s `CardTitle` is another owner's file and fix-list item 8 covers it; the boards deliberately do not override it locally, so all cards in the product move together when it lands. | frontend-engineer (`ui/card.tsx`) |
| **W4-F9** | **`--card-spacing` is 12px where D7 §4.2 measures 16px on a stat tile.** Same file, same fix-list item 8. Overriding it per-card would make the boards the only cards in the product with different padding. | frontend-engineer (`ui/card.tsx`) |
| **W4-F10** | **The top bar's `Mine 2` chip and the rail's `99+` badge reorder under `dir="rtl"`** — visible in `w4-mgmt-overview-rtl-1280.png`. Same `<bdi>` fix as §5.4, in `src/shell/`. Not mine to make. | frontend-engineer (`src/shell/`) |

---

## 9. Not built, and why

- **§3.7's date-range chip and compare chip.** `getMetricBoard` takes `from`/`to` in its
  documented signature and the mock serves one window; there is no second window to switch
  to, so the control would be a chip that cannot change anything. It needs the fixture to
  carry more than one range first.
- **§3.7's customise mode** — the metrics-library sidebar, the drag handles, the contextual
  save bar. `listMetrics` and `getMetricFacets` exist and are exactly the endpoints it wants,
  so it is unblocked. It is a mode, not a screen, and it is more work than the eight boards
  were.
- **The Growth promo list.** §3.4 gives that sub-tab a second pattern — *"the promo list is
  an Index table"* — and everything table-shaped is frozen for this wave.
- **The Market & Zones index table.** See W4-F1.
