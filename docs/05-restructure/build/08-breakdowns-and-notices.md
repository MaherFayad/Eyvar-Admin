# 08 — Breakdowns, board notices, the caption and the target tile

**Implements:** `design/07-rulings-r4.md` **R4-4** (§4.1 breakdowns, §4.2 caption,
§4.3 notices) · **R4-5** (delta chip neutral, confirmed unchanged) · **R4-12** (the `ratio`
unit) · `specs/05-metrics-content.md` **AC-690–697**, **AC-605**, **AC-641/674/675**
**Consumes:** `src/data/types/metrics.ts`, `src/data/clients/metrics.ts`,
`src/data/fixtures/metrics.ts` (mock-data-engineer)
**Owner:** frontend-engineer
**Not in this document:** the fixtures, the zone-health `P1` table R4-6 assigns
`management-zones`, and the Arabic dictionary (`AR` is still `{}`).

---

## 1. The one thing to read

**Seven ranked lists across six boards had no surface, and nineteen tiles carried a
caption nothing drew.** The contract grew three fields under R4-4 and the UI rendered
none of them, which is what the business owner was looking at when they said *"these
pages look so empty."* All three now render, plus three defects found on the way that no
source audit could have seen — two by eye under `dir="rtl"`, one by grepping `dist/`.

There is **no `BreakdownList` anywhere in the history of this repo** — the brief that
commissioned the last pass said one shipped in wave 4 and it did not. R4-4 §4 says the
same. It is built here, from `Card` and nothing else; §3.7's shapes have no shadcn
equivalent and that is expected rather than a gap in the stack.

---

## 2. What was built, file by file

| File | |
|---|---|
| `src/components/metrics/BreakdownList.tsx` | **New.** R4-4 §4.1's anatomy, slot by slot. All four states. |
| `src/components/metrics/MetricTile.tsx` | The caption line (R4-4 §4.2) and the `target` comparison branch. Plus a bidi fix that was live on all eight boards. |
| `src/components/metrics/formatMetric.ts` | `ratio` renders `7.0×` (R4-12). |
| `src/screens/metrics/MetricBoardScreen.tsx` | The notice slot, the breakdown section, and `isBoardEmpty` counting rows. |
| `src/screens/metrics/copy.ts` | Seven dimension nouns; AC-696's sentence now names its dimension; one sub-label rewritten. |
| `src/screens/metrics/board.test.ts` | **New.** `selectNotice` and `isBoardEmpty`. |
| `src/components/metrics/metrics.test.tsx` · `src/screens/metrics/copy.test.ts` | Extended. |

**1064 passed / 0 failed**, against a baseline of **1028 / 0**. `tsc -b --noEmit` reports
nothing in `src/components/metrics/**` or `src/screens/metrics/**`.

---

## 3. `BreakdownList` — R4-4 §4.1, slot by slot

| Slot | Built as | Note |
|---|---|---|
| Heading | `CardTitle`, `id` referenced by the list's `aria-labelledby` | AC-690. A fragment, no period (R6). |
| Label | `text-sm font-medium text-foreground`, `truncate`, `<bdi>` **inside** the box | §5.4 |
| Sub-label | `text-xs text-muted-foreground`, `truncate` | one categorical fact |
| Primary value | `text-end tabular-nums`, `<bdi>` | R4; the column mirrors, the run does not (AC-73) |
| Secondary value | `text-end text-xs text-muted-foreground`, `min-w-8` | §3.1 |
| Bar | `bg-chart-fill`, `h-1.5`, `inlineSize` from `barFraction`, `aria-hidden` | §3.2 |
| Cut-off | `CardFooter`, rendered only when `rowsTotal > rowsShown` | AC-696 |
| Row height | `h-row` without a bar, `h-row-media` with one, uniform | *"a row that grows to fit is R20's defect in a new place"* |

**The four states.** Content is above. **Empty** is AC-692's second kind of empty — one
grey sentence, `Nothing to rank for this period.`, never the first-run illustration,
because the *section* is empty and the page is not; `support.contactReasons` ships that
way and it is the list `05-metrics-content.md` §11.3 calls the most valuable in the
product. **Loading** and **error** belong to the board, not to the list: one request
serves the whole board, so a per-list skeleton would be a spinner for data that already
arrived.

**No mutating control, ever** (AC-694). A row links only where its destination is already
filtered to that row (AC-693); `drilldownRoute: null` renders plain text, and an unlinked
row is not a focus stop. Legacy's `Send retention offer` button on the at-risk rider list
does not come across.

### 3.1 The nullable `secondaryValue`, and why the column is a property of the LIST

`MetricBreakdownRow.secondaryValue` is nullable because `zones.citiesHealth` ranks four
cities on the count of zones live while its real measure — the average request failure
rate — is computed for **Riyadh only**, by string equality on the city name (legacy defect
**L-6**, `:6940`–`:6942`). Three of four rows genuinely have no reading.

So the component decides the column **once for the list**: it exists if *any* row carries a
secondary, and a row without one renders an **em dash**. Per-row would have given Riyadh a
figure and the other three nothing, and a column of three blanks reads as three zeros.

`risk.subscriptionsByRenewalLikelihood` is the other arm — no row has a secondary, so
there is no column and no row renders a hole.

### 3.2 The bar, and a contrast finding

R4-4 names **`--chart-fill`**. Measured: **1.153 : 1** against the card's white, and
**1.083 : 1** against `--muted`. So the track is **not painted** — a bar inside a `--muted`
track would disappear into it — and the fill sits on the card's own ground, where it reads
as a band.

It clears §7 only because it is **redundant**: every bar sits beside its own number in
text, so nothing is carried by the fill alone (§7.5). **If the bar is ever meant to be read
on its own it needs a token that does not exist.** Raised in §6, not substituted.

`inlineSize`, not `width`, so the bar grows from the inline-start in both languages.
The height, `h-1.5` (6px), is a scale value chosen in the absence of one in the ruling:
4px at 1.15 : 1 is not visible and 8px crowds `--ev-row-h-media`.

---

## 4. The notice slot — R4-4 §4.3

**A board declares conditions; the page renders at most one banner.** `selectNotice` is
that sentence as a function, on the screen rather than in the client because
`clients/metrics.ts` says *"the selection rule is a rendering rule"*. Order: **highest
tone, then highest `severity`, then declaration order** — the last clause for free, because
`Array.prototype.sort` is stable.

It renders in the page banner slot between the header and the tile grid, as
`Banner variant="page"`, tone from the notice, **no dismiss** — every one of these names a
standing condition and §11.4 reserves dismissal for a completed action. An operator must
not be able to dismiss a breached statutory clock.

`BoardNotice.key` is a key **root**: a notice carrying a numeric `count` resolves to
`${key}.one` or `${key}.many` (AC-713, two keys per count, never a pluralisation by
concatenation); one carrying no count resolves to the root. Both seeded notices carry a
count and both render — Support's `.many` (`2 SOS incidents are unacknowledged.`) and
Admin's `.one` (`An erasure request is past its statutory deadline.`).

> ### The tie-break has no fixture and cannot be tested from data today
>
> **Two boards declare one `critical` notice each. No board declares two.** So the tone
> comparison, the `severity` tie-break and the declaration-order tie-break are exercised
> **only by the unit test in `board.test.ts`, on synthetic notices marked as such**, and
> never by seeded data. `fixtures/metrics.ts` reaches the same conclusion from the other
> side and gives the reason it will not manufacture a second: inventing one would put a
> banner on screen that no tile corroborates, which is the exact thing R4-4 §4.3 forbids.
>
> **Nobody should read the passing test as evidence that the product has ever selected
> between two real conditions.** The first board that declares two is the one to look at
> by eye. `03-financials.md` AC-351's trial-balance notice is the likely first, and it is
> blocked on **F-9b** (`financials-overview` has no board at all).

---

## 5. The three defects closed, and two found

### 5.1 `MetricTile`'s comparison line printed "no history" beside a target — **closed**

The branch was `comparison.kind === 'none' || deltaPercent === null`, and
`clients/metrics.ts` documents the one deliberate break in the biconditional that walks
into it: a value that is not zero against a target of **zero** has no percentage, so
`deltaPercent` is `null` while the comparison survives on purpose, *"so the tile can still
render `vs 0 target`"*.

The casualty was **`admin.overview.operatorsWithoutTwoFactor`** — target `0`, set by
`USR-1`, **the only owned target on any board**, value `3`, three of five operators without
two-factor including `USR-2`, who moves money. It read *"No comparison period yet"*.

Now: a `kind === 'target'` branch renders §3.7's em dash plus `vs 0 target`.

**AC-605 is untouched and that is the point.** It governs a tile *"whose comparison is
`none`"* — em dash plus one of exactly three reason strings — and this tile's comparison is
`target`. It was inside AC-605 by accident; it is outside it by design. The `none` path,
all three reasons, and the `0%`-on-target path are all asserted.

### 5.2 `isBoardEmpty` ignored `breakdowns` — **closed**

A board whose only content was a ranked list read as **empty** and was replaced, whole, by
R8's first-run illustration, with five named captains sitting in the response. A row is
content.

**A notice deliberately does not count.** R4-4 §4.3's own test is that a notice may only
exist for a condition the board already shows a number for, so a notice can never be the
only thing on a board; counting it here would hide a violation of the ruling behind a
rendered page.

### 5.3 The caption was never drawn — **closed**

Nineteen seeded tiles carry one, three tiles cannot ship without one (AC-641, AC-674,
AC-675), and nothing rendered it. It is now the third text line — glyph, value, label,
**caption**, delta chip — `--text-xs` / `--ev-text-2`, one line, truncates, never wraps.

### 5.4 **FOUND BY EYE:** a stretched `<bdi>` flushes to its own direction

Not visible in any source rule, not caught by any test that existed, and **live on all
eight boards before this pass**.

`<bdi>` sets its own `direction` from its content. A `<bdi>` that is *stretched* — a flex
child in a column, or `flex-1` — then aligns its text to **its** start rather than the
page's. Under `dir="rtl"` at 1280 the tile value `42` flushed **left** while its own label
flushed **right**, and in `BreakdownList` the day names flushed left while their sub-labels
sat right, so the row read inside out.

**The fix is structural: the `<bdi>` goes INSIDE the box, never as the box.** The span keeps
the page's direction and the layout; the `<bdi>` isolates the run and nothing else. Applied
to the tile value (pre-existing), the tile caption and the row label. The content-sized
`<bdi>`s — the delta chip, the against-label, the numeric cells — were already correct,
because a box sized to its content has nothing to align inside.

### 5.5 **FOUND BY EYE:** the caption is a numeral run and reordered under Arabic

`7 days, 3 blocks, 2 tiers.` rendered as `days, 3 blocks, 2 tiers 7` — the leading numeral
moved to the far end. Nearly every caption is a *denominator*, so nearly every caption is a
numeral run: `1 of 4 cities is live.`, `Ceiling is 3%.` Isolation fixes it in both
languages, because `<bdi>` takes its direction from the first **strong** character and an
Arabic caption still lays out RTL.

### 5.6 **FOUND IN `dist/`:** a class name in a comment shipped as a rule

`MetricTile.tsx`'s own doc comment said *"there is no `content-['…']` arbitrary value in
the tree"* — and Tailwind v4, which scans comments and tests as plain text, emitted
**`.content-\[\'…\'\]`** into `dist/assets/*.css`. A sentence written to say *we do not use
this* was the only thing putting it in the build. Reworded; the rule is gone from the built
stylesheet, and the comment now says not to write a class name in prose there.

---

## 6. Findings — raised, not resolved

| # | For | Finding |
|---|---|---|
| **B-1** | product-designer | **R4-4 §4.1 has no way to label two numeric columns.** Its own worked example uses the sub-label to do it (`Supply gap · captains needed`), which collides with the sub-label's stated job of carrying a *categorical* fact. `admin.rotaGapsByDay` renders `Friday … 6 6` beside `Weekend, so every block is high risk` — two numbers, neither named. `operations.backlogByQueue` is resolved in copy (§7); the rota one is not, because its sub-label carries the ranking's rationale and I will not flatten that unilaterally. |
| **B-2** | product-designer | **The bar's token gives a 1.153 : 1 band.** `--chart-fill` is an area fill under a line, where the line delimits it; a standalone ranked bar has no line. Legible as drawn only because the number is beside it. If a bar should ever be read on its own, that is a new token. |
| **B-3** | product-designer | **`caption.overturnIsNotFailure` is out of R4-4 §4.2's scope.** It renders `Of decided appeals. Higher is better here.` — the first sentence is a denominator and legal; the second states a valence, and §4.2 permits only a scope limit or a denominator. `05-metrics-content.md` §11.1 tile 8 explicitly asks the tile to say it (*"the tile must say so"*). Two documents disagree; I have changed neither. |
| **B-4** | product-designer | **`AR` is `{}`, so every English sentence renders under `dir="rtl"` with its period at the visual start** — `.An erasure request is past its statutory deadline`. It hits the banner, `overview.noData`, `breakdown.empty` and every caption not carrying a number. It is the empty-dictionary condition, not a component defect, and it will vanish when Arabic lands — but it is the condition every Arabic capture is taken in today, so it should not be re-reported as a new bug each time. |
| **B-5** | utilities-engineer | **`formatRatio` still has no home.** R4-12's `×` is implemented in `src/components/metrics/formatMetric.ts` because `src/lib/format/number.ts` is yours; `types/metrics.ts` names it as W4-F5's fifth call site. The move is a one-line re-export. `formatPercent` is in the same position — raised in wave 4 and still open. |
| **B-6** | mock-data-engineer | **`breakdown.sub.queueStanding` was `{secondary} past their SLA`** — it put the row's second *number* in the sub-label, which would have rendered the same count twice once the secondary column existed. Changed to `Open · past their SLA`, R4-4's own worked-example construction. The key and the row are unchanged; only the string moved, and only in my file. |
| **B-7** | mock-data-engineer | **`chart.management.risk.openSignals` — KEPT.** See §8. |
| **B-8** | product-designer | **`MetricBreakdownRow.labelKey` cannot hold an entity name**, which the fixture already flags: `breakdown.row.entity` is a pass-through key whose whole English string is `{name}`. It satisfies the type and AC-713 and it is a fig leaf. A union — `{ key, params }` for a closed set, `{ text }` for an entity — would make a translated row and a named row different things in the type. Seconded from the rendering side: the component cannot tell them apart either, which is why every row label is `<bdi>`-isolated defensively. |

---

## 7. The copy that changed, and why

| Key | Was | Is | Why |
|---|---|---|---|
| `breakdown.cutOff` | `Showing the top {shown} of {total}.` | `Showing the top {shown} of {total} {dimension}.` | R4-4 §4.1 writes the sentence out with the dimension. `copy.test.ts` now fails if a board declares a dimension with no noun, because `createTranslator` throws on a missing key in dev — and that would take the *board* down, not the suite. |
| `breakdown.dimension.*` | — | seven plural nouns | as above |
| `breakdown.sub.queueStanding` | `{secondary} past their SLA` | `Open · past their SLA` | B-6 |

---

## 8. The two judgement calls, answered

### 8.1 `caption: null` in `metrics.test.tsx` — **KEPT**

mock-data-engineer added one line to my test file's `metric()` factory because
`Metric.caption` is required and the factory would not compile, and offered to revert it
and leave `tsc` red instead.

**Kept.** The rule against editing another role's tests exists to stop assertions moving,
and no assertion moved: a required field needs a default in a factory, the default is the
same `null` that thirty-seven seeded tiles carry, and the edit carries a comment saying so.
The alternative would have made every test in the file unrunnable to protect a boundary
the edit did not cross. **The disclosed-minimal-edit pattern is exactly what it is for, and
this is what it looks like when it works.**

The note it left — *"a tile with a caption is unbuilt and untested"* — is now closed rather
than inherited: the caption is built and asserted, and the comment records both the
decision and the reason it was not a violation.

### 8.2 `chart.management.risk.openSignals` — **KEPT, and the reason is not the test**

`05-metrics-content.md` §7.2 argues Risk should ship chartless, and the argument is good:
no operator acts on the shape of a signal count, Q-105 permits a board with none, and the
tile it aggregated was deleted under AC-629/AC-720. The fixture keeps the series **only**
because my test builds its `TimeSeries` on that key and renders it through the real
dictionary, and says so in a comment.

**That is a bad reason to keep production data, and it would have been a bad reason to
delete it.** I could unpick the test in ten minutes — the fixture key is arbitrary to what
the four window states assert. I have not, because deleting the seed would leave
`management-risk` with **six tiles, two ranked lists and no chart**, and that is a content
decision belonging to product-owner and product-designer, not a side effect of a test
refactor.

So: **the test is no longer the reason.** Whenever §7.2 is ratified, the unpick is one edit
to `series()`'s default key and one to `copy.ts`, in the same commit as the fixture change,
and nothing of mine blocks it. Recorded here so the next person does not find a comment in
`fixtures/metrics.ts` pointing at a test as the obstacle and conclude the obstacle is real.

---

## 9. Captures

At **1280** and **1440**, in **English** and **Arabic**, six boards each — plus close-ups
of every ranked list. Arabic is entered through the account menu's language radio on every
navigation, because language is React state and a full-page `goto` resets it; the first
pass of this capture silently photographed the English board twice and the fix is in the
script.

```
scratch/shots/r4-{admin,support,risk,zones,ops,performance}-{en,ar}-{1280,1440}.png
scratch/shots/r4-list-{admin,ops,zones,perf}-{en,ar}-{1280,1440}.png
scratch/r4-shots.mjs      boards + a measurement and bidi probe
scratch/r4-lists.mjs      the list close-ups
```

**No console errors and no page errors** across all four passes. The glyph probe walks
every text node in `<main>` and reports **zero** characters outside Latin-1 plus the
product's sanctioned marks — so the wave-4 emoji-fallback defect has no new foothold. The
one non-Latin-1 character these components add is **U+00D7** in `formatRatio`, which is
Latin-1 Supplement, carried by Inter and by Noto Naskh Arabic, and already in
`i18n/direction.ts`'s closed set of marks that do not mirror.

---

## 10. Do the boards still look empty?

**Honestly: less empty, and two of them are still thin.**

- **Admin › Overview** is the transformation. A critical banner, seven tiles of which three
  now carry a caption, a chart, and a seven-row ranked list with bars. It reads as a board.
- **Operations › Overview** and **Risk & Signals** read well. Ops gains a five-row routing
  table that says which screen to open next; Risk gains two ranked lists side by side, one
  of them five named riders with money against them.
- **Market & Zones** gains four cities with three em dashes in the secondary column. That
  is *honest*, and it still looks like a board waiting for data. Its two best lists —
  zones by failure rate, zones by momentum — do not ship, because R4-6 assigns them to a
  `P1` table that is not built and zones are not yet a resource in `src/data`.
- **Support › Overview** is the one that still looks empty, and the fixtures are right to
  leave it that way: four of eight tiles are em dashes, the chart has no points, and the
  ranked list — *"the most valuable list in the product"* — renders
  `Nothing to rank for this period.` because `DB.contacts` is `[]`. **A contact log is the
  highest-value data capture left**, and no amount of layout fixes it.
- **Management › Overview** declares no breakdown at all, by §5.3's own instruction, and
  **Growth** declares none because its two ranked lists carry row actions and belong to its
  `P1` table. Both are six tiles and a chart or two. They look sparse because they *are*
  sparse, and the spec decided that deliberately.

The gap that was making the pages look empty was real and it was in the UI. What is left is
missing data and two unbuilt tables, and neither is mine.
