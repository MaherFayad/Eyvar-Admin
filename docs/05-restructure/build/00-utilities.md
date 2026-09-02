# 00.5 — Utilities: the shared layer

**Owner:** utilities-engineer · **Phase:** 0.5 · **Files owned:** `src/lib/*`, `src/hooks/*`

Everything below is built, typed with no `any`, and tested. Sources: design spec
`design/00-shell.md` §18 (the request list), §1.2, §3.3, §9.1–§9.4, §10, §14; foundation spec
`specs/00-foundation.md` §4.4, §8, §10; `DESIGN.md` §2.3, §8.2, §8.3, §8.4, §9.2, §9.7; and the
legacy app, cited `file:line` wherever behaviour was ported.

**Status:** `npx vitest run src/hooks src/lib` — **436 passed / 436**, the files I own. `npx tsc -b --noEmit --force` — **exit 0,
repo-wide**. `npx vitest run` repo-wide at handoff: **727 passed, 20 failed** — **every failure in
four `src/shell` files the two frontend-engineers are landing right now**, none mine, none touched.
§7 has the verbatim output, the attribution, and four consecutive runs of that area for honesty.

**Addendum, U-A (form state).** `useForm`, `isDeepEqual`, `parseNumericInput` and `parseMoneyInput`
were added after frontend-engineer reported at the end of 0.4 that shadcn 4's `form` is an empty
alias resolving to `field` — no form library is installed and none is coming, so the state layer is
this one. Covered by §2's two *Forms* blocks, §3's last five rows, §5's last five rows, §6's **U-6**
and **U-7**, §8's last four rows, and §9's *For the form work* block.

**Addendum, U-B (table controls).** `useColumnPinning`, `useColumnVisibility`, `toFilterSpec`,
`columnFilterIssue` and `formatColumnFilterBounds` were added when the business owner asked for
sort, filter and **column pinning** built into `DataTable` itself. Sort and filter state already
existed (`useIndexTable`, `useFilters`) and were **not** rebuilt. Pinning did not exist at all;
column visibility turned out not to exist either, and `useColumnPinning` depends on it, so it was
taken here rather than left as `DataTable` local state (§6 **U-10**). Covered by §2's *Column
pinning*, *Column visibility* and *Column filters* blocks, §3's last three rows, §6's **U-8**,
**U-9**, **U-10** and **U-11**, and §9's *For the table controls* block.

The interaction is `docs/05-restructure/design/01-table-controls.md` §7 and `DESIGN.md` §8.5, which
adopt this hook's model — declaration order, one budget measured at the 976 px floor, one refusal
reason, and therefore no resize behaviour at all. `useIndexTable.ts` and `useIndexTable.types.ts`
are **byte-identical** to before U-B; see §2 for why pinning is composed beside them rather than
folded in.

---

## 1. What exists, and where

```
src/lib/                        pure. no React, no JSX, no fetching.
  invariant.ts                  invariant, isDevEnvironment
  breakpoint.ts                 readWideBreakpointPx, isWideViewport
  pagination.ts                 pageRange
  persistence.ts                UiStateStore — the Q1 seam
  sla.ts                        slaClock and the No-clock rules
  equality.ts                   isDeepEqual — what "dirty" means (§8.2.5)
  columnFilter.ts               toFilterSpec — one column control, one FilterSpec (U-B)
  format/money.ts               formatMoney, MINUS_SIGN, ABSENT
  format/date.ts                formatDate, toDate
  format/duration.ts            formatDuration
  format/number.ts              formatCount, formatRange
  parse/input.ts                parseNumericInput, parseMoneyInput, toLatinDigits
  i18n/direction.ts             localeFor, directionFor, isRtl, mirrorGlyph
  i18n/translate.ts             createTranslator
  a11y/announcer.ts             the one live region
  index.ts                      barrel
  utils.ts                      NOT MINE — shadcn's cn(). Untouched.

src/hooks/                      React state and effects.
  useAsync.ts                   four states from one promise
  useIndexTable.ts              index | ledger | queue
  useIndexTable.types.ts        compile-time assertions for AC-48
  useColumnPinning.ts           logical-edge column pinning, with a budget (U-B)
  useColumnVisibility.ts        which columns are shown, and what cannot be hidden (U-B)
  useForm.ts                    dirty, derived, errors, submit — P3 and P4
  useForm.types.ts              compile-time assertions for §8.2
  useFilters.ts                 filter / search / view state
  useDebouncedValue.ts
  useLanguage.ts                the single language hook
  useTick.ts                    the one heartbeat
  useAnnounce.ts
  useFocusEntry.ts              focus in and back, no trap
  useRovingFocus.ts             arrow keys in a custom list
  index.ts                      barrel
```

Import from `@/lib` and `@/hooks`. `cn()` keeps coming from `@/lib/utils` exactly as the shadcn
CLI writes it — the barrels deliberately do not re-export it.

---

## 2. Signatures

### Money — `@/lib`

```ts
formatMoney(minorUnits: Halalas, options?: { unit?: 'code' | 'none'; currency?: CurrencyCode }): string
const MINUS_SIGN: '−'   // U+2212
const ABSENT: '—'       // U+2014
```

Takes `Halalas` from `@/data/types/common` — integer minor units. **Throws on a non-integer**:
`Halalas` is a type alias, not nominal, so a major-unit float still type-checks and the runtime
guard is what actually stops `formatMoney(12.34)` rendering `0.12 SAR`.

Rules encoded (§8.3.1, §8.3.2): trailing ` SAR`, exactly 2 dp always, `,` thousands, U+2212 for
negative set against the digits, `0.00 SAR` for a real zero.

**It takes no language.** The number half is formatted with a fixed `en-GB-u-nu-latn` because
§8.3.1 fixes the separators and **AC-73** requires the string to read in the same character order
in Arabic. Passing a language here is how that guarantee would be lost.

`unit: 'none'` is for a table cell whose column header already carries `(SAR)` — §8.3.1 says the
unit appears once, in the header, and never repeats in cells.

**`ABSENT` is exported but never returned.** A formatter that can return "no value" makes
`0.00 SAR` and "unknown" the same call. A caller holding `null` renders `ABSENT` and does not call.

### Dates — `@/lib`

```ts
formatDate(value: IsoDateTime | IsoDate | Date, options?: {
  style?: 'day-month' | 'day-month-time' | 'day-month-year' | 'time' | 'weekday-day-month-year'
  language?: Language
  timeZone?: string   // defaults to 'Asia/Riyadh'
}): string
toDate(value): Date
const RIYADH_TIME_ZONE = 'Asia/Riyadh'
```

There is **no locale parameter**. The locale comes from `localeFor(language)`, which is always
`en-GB-u-ca-gregory-nu-latn` or `ar-SA-u-ca-gregory-nu-latn`, and the options repeat
`calendar: 'gregory'` and `numberingSystem: 'latn'` where a reader can see them.

Verified against this repo's Node: `new Intl.DateTimeFormat('ar-SA')` resolves
`numberingSystem: 'arab'` and renders `٢٥ يونيو ٢٠٢٦`. The calendar half of the trap is
**ICU-version dependent** — some builds resolve `gregory` for `ar-SA`, others `islamic-umalqura`,
which is worse than either, because a date then means different things on an operator's browser and
a QA laptop. Naming both explicitly removes the engine from the question.

`day-month-time` is composed from two formatters, not requested as one: asking `Intl` for both
inserts a locale separator (`25 Jun, 09:14`) and §9.3's decided-row stamp is `19 Jul 09:14`.

### Durations and SLA — `@/lib`

```ts
formatDuration(ms: number): string      // '14m' | '3h 20m' | '2d 4h' — a magnitude, no sign, no word

slaClock(input: SlaInput, now: IsoDateTime): SlaClock
slaBand(clock): 'neutral' | 'warning' | 'breached'
slaTrackPercent(clock): number | null   // null ⇒ render NO track
slaSortKey(clock): number
compareBySla(a, b): number
slaLabelDescriptor(clock): { key, params }
formatSlaLabel(clock, t: Translate): string
const NO_CLOCK: SlaClock
const SLA_MESSAGES_EN = { 'sla.left': '{duration} left', 'sla.overdue': 'overdue {duration}', 'sla.noClock': 'No clock' }

interface SlaInput { dueAt: IsoDateTime | null; startedAt?: IsoDateTime | null; targetMinutes?: number | null }
type SlaClock =
  | { kind: 'no-clock';  band: 'neutral' }
  | { kind: 'running';   band: 'neutral' | 'warning'; dueAt; remainingMs; consumedRatio: number | null }
  | { kind: 'breached';  band: 'breached';            dueAt; overdueMs;   consumedRatio: number | null }
```

**`No clock` is a distinct value, not a null.** It is a member of the union with its own `kind`,
so `switch` is exhaustive and a screen cannot silently fall through to `—`.

**`No clock` sorts last**, via `Number.MAX_SAFE_INTEGER` — the same idea as legacy's `9e12`
sentinel (`:19229`–`:19232`), which its own UI copy at `:19267` describes as *"work with no clock
sits at the bottom"*. Full order: breached first (most overdue first), then remaining ascending,
then `No clock`.

**The denominator is the item's own target.** `startedAt→dueAt` is the window; `targetMinutes` is
the fallback when the start instant is unknown; **`startedAt` wins when both are present**, because
a shared default must never override a fact. With neither, `slaTrackPercent` returns `null` and no
track renders — §9.3: the track is shown *"only when the total window is known"*. The hardcoded
`90` at `:11652` has no equivalent here and cannot be reintroduced without changing the signature.

Copy goes through keys (AC-74/AC-75). `SLA_MESSAGES_EN` holds the three English templates exactly
as §9.3 words them, so the format string and the code filling it cannot drift; the Arabic dictionary
overrides them and may reorder the sentence around `{duration}`.

### Tables — `@/hooks`

```ts
useIndexTable(options: LedgerTableOptions): LedgerTable
useIndexTable<T>(options: QueueTableOptions<T> & { bulkClaim: true }): QueueTableWithSelection<T>
useIndexTable<T>(options: QueueTableOptions<T>): QueueTable
useIndexTable<T>(options: IndexTableOptions<T>): IndexTable<T>
```

All modes give `TableCore`: `params` (a `QueryParams` ready for a client), `page` / `setPage` /
`nextPage` / `previousPage`, `query` / `setQuery`, `view` / `setView`, `filters` / `setFilter` /
`removeFilter` / `clearAll`, and `isFiltered`.

`index` adds `TableSorting` + `TableSelection<T>`. `queue` adds `TableSorting`, and
`TableSelection<T>` **only** with a literal `bulkClaim: true` — §9.3: a checkbox column exists only
where every bulk action offered is a claim or assign action.

`ledger` adds **nothing**, and that is enforced four ways:

| Mechanism | Effect |
|---|---|
| `LedgerTableOptions.initialSort?: never` | declaring a sort is a **compile error** |
| `LedgerTableOptions.getRowId?: never` | declaring a row identity is a **compile error** |
| `LedgerTable` omits `sort`, `setSortField`, `setSortDirection`, `selectedIds`, `selectedCount`, `toggleRow`, `toggleAllOnPage`, `pageSelectionState`, `clearSelection` | reading any of them **does not compile**, so no component can bind a checkbox to one |
| `canSelect: false`, `canSort: false`, `canRowAction: false` are **literal types**, not `boolean` | `mode === 'ledger' && table.canSelect` is `false` at compile time and a reviewer can see it |
| `params.sort` is always `null` in ledger mode | posting order cannot be overridden on the wire |

`src/hooks/useIndexTable.types.ts` asserts all of this at build time. It is a file of
`@ts-expect-error` markers, which are themselves errors when the marked line has *no* error — so if
someone relaxes the ledger types, `npx tsc -b --noEmit` breaks and names the rule, rather than a
checkbox quietly appearing on a wallet ledger in Phase 1. A runtime test cannot make that assertion.

**AC-25** is handled inside the setters, not in an effect: `setView`, `setQuery`, `setFilter`,
`removeFilter` and `clearAll` each reset the page to 1 and clear the selection synchronously, so no
render ever shows `3 selected` over rows that are already gone. Route change is covered by the hook
unmounting with the screen.

`isFiltered` is `filters.length > 0 || query.trim() !== ''` and deliberately **excludes `view`** —
`All` is a real unfiltered default and a view is a control, not a level (§3.8 rule 3). It drives
§9.1's `Clear all` and the `no-match` (**AC-37**) vs `first-run` (**AC-38**) choice.

### Column pinning — `@/hooks` (U-B)

```ts
useColumnPinning(options: {
  columns: readonly PinnableColumn[]         // the VISIBLE columns; order here is render order
  initialPins?: readonly ColumnPin[]
  tableId?: string                           // persistence key; omit and pins die with the mount
  view?: string | null                       // §7.6 — column state is per table AND per view
  store?: UiStateStore<readonly ColumnPin[]> // test + Q1 seam
  floorInlineSize?: number                   // default TABLE_FLOOR_INLINE_SIZE_PX = 976
  maxPinnedFraction?: number                 // default DEFAULT_MAX_PINNED_FRACTION = 0.5
}): ColumnPinningState

type PinEdge = 'start' | 'end'               // logical. there is no left and no right.
interface ColumnPin      { id: string; edge: PinEdge }
interface PinnableColumn {
  id: string
  width: number                              // declared px. `auto` cannot be pinned — §7.2
  lockedEdge?: PinEdge                       // §7.1's implicit block. the component's, not the operator's
}
interface PinnedColumn {
  id: string; edge: PinEdge; width: number
  offset: number                             // cumulative px between this column and its edge
  isLast: boolean                            // innermost at its edge — §7.3's only boundary
  locked: boolean                            // pinned by the component; not unpinnable
  insetProperty: 'insetInlineStart' | 'insetInlineEnd'
}
interface PinRefusal { columnId: string; edge: PinEdge; reason: 'exceeds-budget'; wouldBe: number; budget: number }

interface ColumnPinningState {
  pins: readonly ColumnPin[]                 // operator pins, declaration order, stale ids dropped
  start: readonly PinnedColumn[]             // render order: locked block, then operator pins
  end:   readonly PinnedColumn[]             // render order
  pinnedColumn(id): PinnedColumn | null
  isPinned(id): boolean
  isLastPinned(id): boolean
  pin(id, edge?): PinRefusal | null          // edge defaults to 'start' — §7.1
  unpin(id): void
  togglePin(id, edge?): PinRefusal | null
  clearPins(): void                          // §7.5's `Reset columns`. locked block untouched
  canPin(id, edge?): PinRefusal | null       // dry run, changes nothing
  lastRefusal: PinRefusal | null
  lockedInlineSize; operatorInlineSize; pinnedInlineSize; freeInlineSize; budget: number
}
```

**`PinRefusalReason` has exactly one value**, and `PinEdge`'s `'end'` is never wired to an operator
affordance — §7.1: the inline-end region is the kebab's, and the operator only pins inline-start.
`'end'` exists because the *component* pins the kebab there.

**§7.1's three regions, as one API.** The R5a marker lane, the selection checkbox, the identity
column and the row kebab are `lockedEdge` columns: always pinned, never togglable, never refusable,
and `pin`/`unpin`/`togglePin`/`canPin` **throw** on one. That makes *"you cannot hide or scroll away
the only thing that navigates"* a type-and-throw rather than a convention every `DataTable` has to
remember — and it puts the whole region's offsets in one place, so the consumer never adds the
implicit block's width by hand.

**The rule it encodes.** `DESIGN.md` §3.1 *Horizontal overflow*: wide tables scroll horizontally and
*"the checkbox + primary cell stay pinned while they do"*; §2.5, harder: *"Bulk grids MUST be
edge-to-edge with a sticky header row and a frozen identity column."* §3.1 also requires wide tables
to *"scroll horizontally rather than shrink columns below legibility"*, which is why **a pinnable
column must declare an inline size**: a column sized `auto` has no offset until layout has run, and
a sticky offset computed after layout is a frame of visible jump on every scroll.

**Everything is logical, and that is the RTL guarantee.** Nothing in the file reads `dir`, `lang` or
`Direction`. Identical columns and identical pins produce byte-identical output in English and
Arabic; the browser mirrors it once, because the consumer writes `offset` to `insetProperty`, which
is `insetInlineStart` / `insetInlineEnd` and never `left` / `right` (§9.1). A test serialises both
edges and asserts the string contains neither word.

**Order: declaration order wins, not pin order.** The pinned region renders in column-declaration
order however the operator clicked. Pinning is a freeze, not a reorder — if clicking `Pin` on
`Status` moved it in front of `Phone` merely because it was clicked first, the operator would have
performed a column reorder they never asked for, and pinning a second column would visibly shuffle
the first. Column *order* is a separate per-view control (§3.1 *Column visibility*: "which columns
are visible and in what order is per-view state") and this hook must not become a second way to set
it.

**`isLast` is "innermost", not "last in the array".** At the `start` edge that is the last-declared
pinned column; at the `end` edge it is the **first**-declared one, because end offsets accumulate
from the edge inward. Uniformly: the largest `offset` at its edge. It is a flag rather than
`array.at(-1)` at the call site precisely because the two edges disagree.

**The structural guards:**

| Guard | Behaviour | Why that and not the other thing |
|---|---|---|
| Unknown id at a call site | `pin` / `unpin` / `togglePin` / `canPin` **throw**, naming the pinnable ids | The affordance can only be rendered from the column list, so reaching one with an id not in it is a caller bug. A returned refusal would be swallowed by a component that only checks the budget. |
| **Locked** id at a call site | The same **throw** | §7.1: the implicit block is the component's, and §7.5 already renders the identity column's toggle disabled. Reaching it means the disabled state was not honoured. |
| **Stale** id in restored or seeded state | **Dropped** — from `pins`, from both edges, and from the store | Throwing would crash a table because someone unticked a column. It is dropped everywhere it can be observed or persisted, so it cannot accumulate; the trade accepted is that hiding a column forgets its pin. |
| Total pinned width | Refused above `floorInlineSize × maxPinnedFraction` — 488 px by default — returned as a `PinRefusal`, never thrown and never silent | A pinned region wider than what is left is a dead UI: nothing scrolls, and the columns being scrolled towards are unreachable. |

**Why the budget is measured at a floor and not at the live width, and why that deletes a whole
state.** `DECISIONS.md` **D2** fixes the minimum viewport at 1280 px; `design/00-shell.md` §1
measures the content region there at **976 px** with both nav columns expanded. That is
`TABLE_FLOOR_INLINE_SIZE_PX`. A budget read from a live measurement would make a pin legal at 1440
and illegal at 1280, so pins would have to be demoted on resize and restored afterwards — an entire
behaviour, with its own copy, its own disabled state and its own tests. Measured at the floor, a pin
accepted at 1920 is still valid at 1280, **nothing can reach that code path**, and §3.3's "shell
state is never re-derived from a resize" becomes vacuous rather than merely observed.
`01-table-controls.md` §7.2 adopts this and drops the demotion behaviour its first draft had drawn.

A full-bleed bulk grid (§2.5) has no nav columns and may state a wider floor. §7.2: *"that is the
only sanctioned override."*

**One reason, no count cap.** Three narrow columns and one wide one are not the same risk, and the
budget already refuses whichever combination is too much. A second refusal reason would be a second
sentence to write and a second disabled state to test, for no additional protection.
`PinRefusalReason` has one value.

**What the budget measures**, stated once because §7.2's rule and its arithmetic table have to
agree: **everything pinned except the locked inline-end block**. The kebab is hard against the far
edge, is never refusable, and is not something an operator can scroll towards. Under that reading
§7.2's table reproduces to the pixel, and there is a test asserting each row of it:

| | px |
|---|---:|
| Floor — content region at 1280, both nav columns expanded | **976** |
| Budget — 50 % | **488** |
| Implicit inline-start block — 40 checkbox + 220 identity | **260** |
| Left for operator pins | **228** — one typical column, or two narrow ones |

**Half, and why.** The pinned region may never be larger than the region it freezes content out of.
Above half, the table is mostly frozen furniture. It is a knob, not a constant, but the default is
the one every index table should use.

**Duplicates and edge swaps are defined, not discovered.** Re-pinning to the same edge is an
accepted no-op. Pinning to the other edge is a **move**, evaluated after the column is removed from
its old edge, so a column is never refused for its own width. `togglePin` at the same edge unpins;
at the other edge it moves — it does not unpin and re-pin.

**A refusal is data, not a sentence.** `PinRefusal` carries `reason`, `wouldBe` and `budget`, and
`lastRefusal` holds the most recent one until something is accepted. The wording is copy and belongs
to the design spec.

**Persistence is the Q1 seam, in memory.** With a `tableId` the pins live under
`ui.columnPins.<tableId>.<view>` in `defaultUiStore`, so they survive a route change and **not** a
reload — the recorded AC-33 gap. Keyed **per view** because
§9.1 already makes visible columns and their order per-view state, and §7.6 says pins are the same
kind. `UI_STATE_KEYS.columnPins` is listed as a **prefix** so a Q1 answer can wildcard the
namespace. There is no `localStorage` adapter here, and adding one would be answering Q1 by writing
code.

The stored value is §7.6's shape already: `ColumnPin[]`, `{ id, edge }`, `edge` **logical**. Render
order is deliberately **not** stored — it comes from the declaration, and a stored order would be a
second, silently competing source of truth for column order. A test asserts the serialised store
contains no `left`, `right`, `offset` or `index`.

### Column visibility — `@/hooks` (U-B)

```ts
useColumnVisibility<T extends VisibilityColumn>(options: {
  columns: readonly T[]                      // every DECLARED column, in declaration order
  tableId?: string
  view?: string | null
  store?: UiStateStore<readonly string[]>    // the HIDDEN ids
}): ColumnVisibilityState<T>

interface VisibilityColumn {
  id: string
  defaultHidden?: boolean                    // `Reset columns` restores exactly this
  alwaysVisible?: boolean                    // the identity column. §3.1 / §7.1
}

interface ColumnVisibilityState<T> {
  visible: readonly T[]                      // declaration order — hand this to useColumnPinning
  hidden: readonly string[]
  isVisible(id): boolean
  isHideable(id): boolean                    // false for alwaysVisible AND for the last visible one
  hide(id): void                             // throws on unknown, and on !isHideable
  show(id): void
  toggle(id): void
  reset(): void                              // §7.5's `Reset columns`
  needsColumnsControl: boolean
}
```

**This existed as a gap, not as a request.** `useColumnPinning` takes *"the currently visible
columns"* and nothing produced that list, so the pin budget was defined against a column set nobody
could define. Ownership was open; it is settled **here** rather than as `DataTable` local state, for
three reasons:

1. It is state with rules, not markup. §3.1: *"Which columns are visible and in what order is
   per-view state"*, and *"Tables with more than ~6 columns MUST offer a column-visibility
   control"* — one rule, every index.
2. The rules go wrong quietly. §3.1 / §7.1 make the identity column never hideable — *"you cannot
   hide or scroll away the only thing that navigates"* — and a table with every column hidden is a
   dead UI. `isHideable` is false for both, `hide` throws on both, and §7.5's disabled toggle binds
   to the same predicate.
3. It must agree with `useColumnPinning` about what a column is and where the per-view key lives.
   Two owners is two answers.

**It is generic**, so `DataTable` passes its own column objects through and gets them back — there
is no second column type to keep in sync, and `visible` goes straight into `useColumnPinning`.
Hiding a pinned column drops its pin, which is exactly §7.5's *"hidden column: pin toggle
disabled"*.

**`needsColumnsControl`** is §3.1's *"more than ~6 columns"* widened by §7.5 to *"or any column is
pinnable or hideable"* — otherwise pinning is unreachable on a five-column table, which is where the
1280 operator most often is.

**Column *order* is not here.** §7.5: *"No drag handle and no reordering […] recorded as out of
scope, not forgotten."* Order comes from the declaration; a second source of it is the drift §7.1
refuses.

**Why this is not inside `useIndexTable`, and `useIndexTable.ts` is untouched.**

1. A pin has no server meaning. `useIndexTable`'s entire output funnels into `params: QueryParams`,
   and `QueryParams` models the **request** — putting pins on `TableCore` is one careless spread
   away from putting view state on the wire.
2. `useIndexTable` does not know the columns, and should not: `columns` is `DataTable`'s, and every
   caller would have to pass them even with nothing pinned.
3. **AC-48.** Any member added to `TableCore` lands on `LedgerTable` too. Pinning a ledger *is*
   legal — a pin removes nothing and mutates nothing — but the ledger's guarantee is a set of
   `@ts-expect-error` assertions in `useIndexTable.types.ts`, and the cheapest way to keep them
   honest is not to edit the file they guard. Both files are byte-identical to before U-B. A test
   composes `useIndexTable({ mode: 'ledger' })` with `useColumnPinning` and asserts the ledger still
   has no `setSortField`, that `params.sort` is still `null`, and that `params` still has exactly
   the six documented keys.

### Column filters — `@/lib` (U-B)

```ts
toFilterSpec(field: string, value: ColumnFilterValue): FilterSpec | null
columnFilterIssue(value: ColumnFilterValue): 'range-inverted' | null
formatColumnFilterBounds(value: ColumnFilterValue, language?: Language): { from: string | null; to: string | null } | null

type ColumnFilterValue =
  | { kind: 'text';         value: string }
  | { kind: 'select';       value: string | null }
  | { kind: 'multi-select'; values: readonly string[] }
  | { kind: 'number-range'; min: number | null; max: number | null; unit?: 'count' | 'money' }
  | { kind: 'date-range';   from: IsoDate | null; to: IsoDate | null }
  | { kind: 'boolean';      value: boolean | null }
```

One control, **exactly one `FilterSpec`** — the type that already exists in
`src/data/types/common.ts` and that `useFilters` already holds a list of. There is no parallel
filter model, because a second model is how `contains` and `in` end up meaning different things on
two screens.

| Kind | Empty | Set |
|---|---|---|
| `text` | `''` or whitespace → `null` | `{ op: 'contains', value: trimmed }` |
| `select` | `null` → `null` | `{ op: 'eq' }` |
| `multi-select` | `[]` → `null` | `{ op: 'in', value: deduped }` — **stays `in` for one selection** |
| `number-range` | both `null` → `null` | both → `between [min, max]`; one → `gte` / `lte` |
| `date-range` | both `null` → `null` | same shape, values are **instants** (below) |
| `boolean` | `null` → `null` | `{ op: 'eq', value: true \| false }` |

**Three rules encoded, each closing a bug that is otherwise invisible:**

1. **An empty control produces no filter at all.** Not `{ op: 'contains', value: '' }` — the query
   engine's `contains` matches every row against `''`, so an empty box would become a no-op chip
   that `isFiltered` counts, and §3.2 makes `Clear all` appear *only* when something is applied.
2. **`false` is a value, not an absence.** A boolean filter set to `false` emits
   `{ op: 'eq', value: false }`. The falsy check this closes drops every "Suspended: no".
3. **A date range is a pair of instants, inclusive of the whole end day, in Riyadh.**
   `to: '2026-06-30'` becomes `2026-06-30T23:59:59.999+03:00`, not the bare day. `Date.parse` reads
   a bare `2026-06-30` as **midnight UTC** — 03:00 Riyadh — so a bare upper bound silently excludes
   the entire working day the operator was asking for. The bound is built as a string with a literal
   `+03:00`, never from a host-local `Date`, so it is identical on a laptop in a DST zone. Riyadh has
   observed no DST since 1990, the same fact `format/date.ts` is built on.

`multi-select` **stays `in` even for one selection**: ticking a second box must not change the
*operator* of the query. A server may index `eq` and `in` differently, and a chip whose shape changes
mid-edit is two different queries.

**Inversion is a validation state, not a value.** `columnFilterIssue` returns a **code**, never a
sentence, and `toFilterSpec` **throws** if a control emits anyway — `between [500, 100]` matches
nothing and reads to an operator as "no results", which is the worst possible failure.

**The two range kinds get different treatments, and the contract now says so** —
`01-table-controls.md` §11.8. The first draft of this file said "disable `Apply`" for both, which is
wrong for a control that has no `Apply`:

| Kind | Commits on | While inverted |
|---|---|---|
| `date-range` | an `Apply` button | **`Apply` disabled**, no error text. §3.2: *"validate by disabling the primary button, not by showing an error after submit."* |
| `number-range` | debounce — there is no `Apply` | **Nothing is emitted**, the previous filter stands, and an **inline hint** renders beneath the pair (§4.4, `--ev-red` text — not a badge, not a banner, not a toast). §3.2 governs controls that have a primary button; this one does not, so doing nothing silently would leave the operator watching a filter that never takes. |

The check is the same call and the emission is refused the same way. What differs is what the
*control* does with a non-`null` return, and that is `DataTable`'s branch, not this function's. No
design change was needed: `number-range` keeps its live commit.

**A column filter *is* a `FilterSpec`.** Nothing else is produced and no parallel model exists, which
is why `table.isFiltered` stays true when a column filter is applied and the `no-match` (**AC-37**)
vs `first-run` (**AC-38**) empty-state choice keeps working with no amendment.

**Numeric bounds are integers.** Every numeric column here is a count, a duration in seconds, or
money in halalas. A decimal means major units reached a halalas field, which is the
`formatMoney(12.34)` bug one layer up; it throws.

**`formatColumnFilterBounds` exists for one rule, not for convenience.** It is one call site plus
`DESIGN.md` §9.2, which has to be enforced centrally: a chip is the one place a date and a money
amount get stringified away from a table cell, and a hand-rolled `toLocaleDateString('ar-SA', …)`
there brings back the **Hijri** calendar and Arabic-Indic digits that `format/date.ts` spent a module
closing. Dates route through `formatDate`, money through `formatMoney`, counts through `formatCount`.
An open end returns `null` rather than inventing copy for it.

### Async — `@/hooks`

```ts
useAsync<T>(run: (signal: AbortSignal) => Promise<T>, options?: {
  deps?: readonly unknown[]
  isEmpty?: (data: T) => boolean
  enabled?: boolean
}): { status: 'loading' | 'error' | 'empty' | 'content'; data: T | null; error: Error | null; isRefreshing: boolean; refetch: () => void }
```

Transport-agnostic: it takes a promise-returning function and an `AbortSignal` and knows nothing
about `fetch`, `DATA_SOURCE` or fixtures. Default emptiness covers the two shapes the data layer
returns — an array, and a `Paginated<T>` with `total === 0`.

`data` is `null` in `loading` and `error`, so stale rows cannot render under an error state.
Errors are normalised to `Error`; `isApiError(error)` still narrows to the data layer's `ApiError`.
Latest-wins on races, and the signal is aborted on unmount and on every re-run.

It does **not** distinguish `no-match` from `first-run` empty — that is "are filters applied", which
the table knows and the request does not. Read `table.isFiltered`.

### The one clock — `@/hooks`

```ts
useTick(everySeconds?: TickBucket, enabled?: boolean): number
useNow(everySeconds?: TickBucket, enabled?: boolean): IsoDateTime
setClockSource(clock: Clock): void
type TickBucket = 1 | 5 | 15 | 20 | 30 | 60
```

**Read §6 first — "one clock" is two things, and there is exactly one of each.**

One module-scoped `setInterval(…, 1000)` that starts on the first subscriber and stops on the last.
Every subscriber reads a *bucketed* tick count through `useSyncExternalStore`, so a `%60` surface
re-renders once a minute rather than sixty times. Buckets are the legacy set, ported from
`:12512`–`:12611`. `enabled: false` subscribes to nothing and renders nothing — **AC-28**'s
*"a surface that is not on the current route performs no render work when the clock ticks."*

`useNow` returns "now" from an injected `Clock`; `Date.now()` and `new Date()` do not appear in the
module. Screens pass that `now` to the pure helpers (`slaClock`, `formatDate`). That is what stops
`Date.now()` reappearing across 34 screens.

### The one live region — `@/lib`, `@/hooks`

```ts
announce(message: string, doc?: Document): void
getLiveRegion(doc?): HTMLElement
currentAnnouncement(doc?): string
resetAnnouncer(doc?): void
useAnnounce(): (message: string) => void
```

One `<div id="ev-live-region" role="status" aria-live="polite" aria-atomic="true">`, created on
first use, visually hidden but never `display:none` (a hidden region is never announced). **AC-29**
says *exactly one*, so there is no second `assertive` region — an assertive announcement is a
critical banner carrying `role="alert"`, which belongs to the component rendering the condition.

Pass a **finished, translated string**. Announcing is what a screen does *in addition to* rendering
the state, never instead of it (§7.5).

**Do not render a `<LiveRegion />` component.** A component any screen can render is one `git grep`
away from being three, and AC-29 would then read "exactly four".

### Nav collapse — `@/hooks` — **DELETED in 02-shell-fixes (U-11)**

> `useNavCollapse` and its test no longer exist. `DECISIONS.md` **D5** stops the sub-tab column
> collapsing, so another owner removed the hook and left the note in `src/hooks/index.ts`;
> `UI_STATE_KEYS.subTabNavCollapsed` went with it in U-B. **The block below is history**, kept
> because §3, §6 **U-2**, §7 and §9 all reference it and because the first-run-never-a-resize
> reasoning is the precedent `useColumnPinning`’s floor budget follows. Do not build against it.

```ts
useNavCollapse(options?: { store?: UiStateStore<boolean>; isWide?: () => boolean }):
  { collapsed: boolean; toggle: () => void; setCollapsed: (v: boolean) => void }
```

The viewport is read **once**, in a lazy `useState` initialiser, and only when nothing is stored.
There is **no resize listener, no `matchMedia` subscription and no effect that re-reads the
viewport** — §3.3 names this as the single most important thing not to get wrong, and there is a
test asserting that `addEventListener('resize', …)` is never called.

The breakpoint is not a constant here: `isWideViewport` reads `--ev-bp-wide` from the document
element's computed style, so `globals.css` stays the single source. `WIDE_BREAKPOINT_FALLBACK_PX =
1344` exists only for "no stylesheet yet" (jsdom, first paint) and is documented as stale-if-it-ever-
disagrees.

**AC-33 fails, deliberately and visibly.** See §4.

### Language and i18n — `@/lib`, `@/hooks`

```ts
localeFor(language: Language): string      // 'ar-SA-u-ca-gregory-nu-latn'
directionFor(language): 'ltr' | 'rtl'
isRtl(language): boolean
mirrorGlyph(glyph: string, direction: Direction): string
createTranslator({ dictionary, fallback?, onMissingKey? }): Translate

useLanguageState({ initialLanguage?, dictionaries, store?, applyToDocument?, document? }): LanguageState
useLanguage(): LanguageState               // reads LanguageContext
LanguageContext: React.Context<LanguageState | null>
applyDocumentDirection(language, doc?): void
```

`applyDocumentDirection` sets `dir` **and** `lang` on the **document element** — **AC-70**, not on a
subtree. `LanguageState` carries `language`, the derived `dir`, the explicit `locale`, `setLanguage`
and `t`.

`mirrorGlyph` swaps at **string-construction time**, never with CSS (§9.5). The map is closed on
purpose: `← → ‹ › « » ⇤ ⇥ ↳ ↲` mirror; `↑ ↓ ▶ ✓ × + ⌘` and every brand or object glyph are absent
because they must **not**, and an unknown glyph passes through rather than being guessed at.

`createTranslator` enforces AC-74 (Arabic missing ⇒ English fallback, never a raw key) and AC-75
(named placeholder inside a single key; a missing parameter throws rather than rendering
`{duration}` to an operator). A key in no dictionary throws in dev/test naming the key, and returns
the key in production — one missing string must not blank an operations console mid-shift.

There is **no plural API**, on purpose. Arabic has six plural categories; a count that changes the
sentence gets two keys chosen by the caller. Raise it with product-designer if a screen needs one.

### Focus — `@/hooks`

```ts
useFocusEntry({ active, containerRef, initialFocusRef?, restoreFocus? }): void
useRovingFocus({ itemCount, orientation?, direction?, loop?, initialIndex? }):
  { containerRef, activeIndex, setActiveIndex, itemProps(index) }
```

`useFocusEntry` moves focus in on open and back on close and **does not trap** — **AC-67** as
amended, and finding F-1's reasoning: §7.3.3 forbids a trap without a scrim, §5.5 forbids the scrim,
§7 outranks an AC. There is a test asserting it installs no `keydown`/`focusin`/`focusout` listener.
It also declines to focus an opener that was unmounted while the layer was open.

`useRovingFocus` is **AC-64** for the rail, the sub-tab column and the collapsed column's popover
list — the three places `sidebar` was not added to cover. Items are found by `data-roving-item`;
spread `itemProps(i)`. Exactly one item is `tabIndex={0}`. `direction` is consulted only for a
**horizontal** list, where `ArrowRight` must move toward the *end* and in Arabic the end is
physically left; a vertical list is not flipped, because down is down in every language.

**Do not use `useRovingFocus` inside a Radix component** — a menu, a radio group, the sort popover's
field list. Radix already owns it there.

### Forms — `@/hooks` (U-A)

```ts
useForm<Values extends object, Derived extends object & DisjointFrom<Values> = {}>(options: {
  initialValues: Values
  derive?:   (values: Values) => Derived                      // pure, synchronous
  validate?: (values: Values, derived: Derived) => FormErrors<Values>
  onSubmit:  (values: Values) => Promise<Values | void>       // throws on failure
  id?: string
}): Form<Values, Derived>

interface Form<Values, Derived> {
  values: Values
  derived: Derived
  status: 'clean' | 'dirty' | 'dirty-invalid' | 'save-in-flight' | 'save-failed'
  isDirty: boolean; isValid: boolean; isSaving: boolean
  canSave: boolean            // dirty && valid && !saving
  canDiscard: boolean         // dirty && !saving           — never gated on validity (AC-52)
  dirtyFields: readonly (keyof Values & string)[]
  errors: FormErrors<Values>                 // visible only: touched, or all after a save attempt
  issues: readonly FormIssue<Values>[]       // every blocker, in field declaration order
  failure: { kind: 'validation'; issues } | { kind: 'rejected'; error: Error } | null
  field(name: keyof Values & string): Field<Values[K]>
  derivedValue(name: keyof Derived & string): DerivedValue<Derived[K]>
  setValue(name, next) · setValues(patch) · setFieldError(name, message | null)
  submit(): Promise<void> · discard(): void · reset(next: Values): void
}

interface Field<V> {
  name; value: V; setValue(next: V); onBlur()
  error: string | null; isDirty; isTouched
  labelId; errorId
  controlProps: { id; name; 'aria-invalid': true | undefined; 'aria-describedby': string | undefined }
}

interface DerivedValue<V> {
  name; value: V
  isComputable: boolean                       // false for null / undefined / NaN / Infinity
  props: { 'aria-readonly': true; 'aria-live': 'polite' }    // and no tabIndex, ever
}
```

**`status` is the save bar.** Five values, mapping 1:1 onto design spec §11.6 rows 5–9 — `clean`
(no bar), `dirty` (row 5), `dirty-invalid` (row 6, **AC-52**), `save-in-flight` (row 7),
`save-failed` (rows 8/9, read `failure` for which). Render the bar when `status !== 'clean'`. There
is deliberately no second way to ask: no `showSaveBar`, no `hasEdited`.

**Dirty is a comparison, not a flag.** `isDeepEqual(values, baseline)` — so typing the saved value
back puts the form *back* to `clean`, and a tag input handing back a fresh array of identical
strings does not leave the bar armed. This is the state legacy **D2** never had:
`.settings-dirty-dot` (`:248`) ships `display:none` and has zero other occurrences, and
`.form-footer` (`:279`) is used once in 21,857 lines (`:1127`).

**A recompute cannot arm the save bar** (§8.2.5). Not "does not" — cannot. Derived values live in
`derived`, never in `values`, and dirtiness is measured over `values` alone. There is no code path
that would let a recompute enter `dirtyFields`.

**A derived value is structurally not a field**, and `src/hooks/useForm.types.ts` asserts it at
build time the way `useIndexTable.types.ts` asserts ledger mode:

| Construction | Result |
|---|---|
| `form.field('planTotal')` on a derived key | **compile error** |
| `form.setValue('planTotal', 42)` / `setValues({ planTotal })` | **compile error** |
| `form.setFieldError('planTotal', …)` | **compile error** — §8.2: never independently validated |
| `form.derivedValue('discountPercent')` on an editable key | **compile error** |
| a `derive` that returns a key `Values` already has | **compile error** — `DisjointFrom<Values>` |
| `validate` returning a derived key | **compile error** |
| `derivedValue(k).setValue` / `.onBlur` / `.controlProps` / `.props.tabIndex` | **do not exist** |

`props` carries exactly `aria-readonly="true"` and `aria-live="polite"` as **literal** types, and
**no `tabIndex` at all** — not even `-1`, which would still leave the element click-focusable while
§8.2 says not focusable. Spread it onto a `span`.

**Errors, in three layers, matching §10.4.** `field(name).error` is the inline message and is
suppressed until the field is blurred or a save has been attempted — but `canSave` uses the *full*
validity, so `Save` is greyed from the first render of an invalid create form (§2903) without
shouting at an untouched field. `issues` is the page-level banner's list and its `length` is the
count §11.6 row 8 states; it is ordered by field declaration, so the banner reads in the order the
operator reads the form. A failed save's field messages survive until the field they name is
edited, at which point the banner's count comes down — the banner is recomputed live, never
snapshotted.

**`onSubmit` is transport-agnostic**, like `useAsync`. An `ApiError` whose `details[].field` names
fields this form has becomes field errors (`failure.kind === 'validation'`); anything else —
including details naming a field this form does not have — becomes `failure.kind === 'rejected'`,
so a message can never silently vanish. A save landing after `reset()` is discarded (latest-wins).

**`derive` is synchronous by contract.** §8.2 allows 150 ms before a derived value must fall back to
an em-dash; anything slower than that is not derived, it is data, and it belongs in `useAsync`.
Keeping it synchronous is also what makes the "recompute is not an edit" guarantee structural.

### Form input parsing — `@/lib` (U-A)

```ts
parseNumericInput(raw: string): number | null    // blank -> null. Never 0, never the previous value
parseMoneyInput(raw: string): Halalas | null     // major units in, integer minor units out
toLatinDigits(input: string): string
isDeepEqual(a: unknown, b: unknown): boolean
```

`parseNumericInput` is §8.2.5's *"exactly one numeric coercion function MUST serve both preview and
save"*. The legacy app ships two with different blank semantics — `gv()` (`:12984`) is
`parseFloat(...)||0` and previews a cleared discount as **0 %**, while `numval()` (`:6150`) returns
the *stored* value and saves the old one. Here blank is `null`, once, and `null` flows straight into
§8.2's *"no computable result renders an em-dash, never `0`, never blank"*.

It is also the **Arabic input path** (§9.2): Arabic-Indic (U+0660) and extended Arabic-Indic
(U+06F0) digits, the Arabic decimal separator U+066B, the Arabic thousands separator U+066C, NBSP
and narrow-NBSP grouping, and the bidi controls a copy-paste out of an RTL paragraph drags along.
`parseFloat` returns `NaN` for every one of those and `||0` turns that into a silent zero.
Separators follow §8.3.1 rather than locale (`,` groups, `.` decimates), which makes this the exact
inverse of `formatMoney`'s number half, U+2212 included — there is a round-trip test.

`parseMoneyInput` converts on the **digit string**, not by `value * 100`, because `19.99 * 100` is
`1998.9999999999998`. `formatMoney` throws on a non-integer, so this is the one place a float could
get into money; there is a test asserting `formatMoney(parseMoneyInput(x))` never throws.

`isDeepEqual` is scoped to form values on purpose — primitives, `Date`, arrays and plain objects;
`Map`, `Set` and class instances fall back to reference equality and are documented as out of scope.
Two departures from `===`, both deliberate: `NaN` equals `NaN` (otherwise a `NaN` field is
permanently dirty and the bar can never be dismissed) and `-0` equals `0` (§8.3.1 renders them
identically, so a form must not be dirty over a difference nobody can see).

### Misc — `@/lib`

```ts
pageRange(page, pageSize, total): { from, to, total, hasPrevious, hasNext, totalPages }
formatCount(value: number, language?): string        // '4,218'
formatRange(from, to, language?): string             // '1–50', en dash
invariant(condition: unknown, message: string): asserts condition
UiStateStore<T> · createMemoryStore · createNullStore · defaultUiStore · UI_STATE_KEYS
```

`pageRange` clamps a page past the end (a row deleted while the operator sat on the last page) and
returns `0–0` for an empty list. It is the arithmetic behind §9.1's `Showing 1–50 of 4,218` and the
"state truncation in words" rule that closes the silent row cap at `:12250`.

---

## 3. Edge cases covered

**436 assertions across 22 files** in `src/hooks` and `src/lib` — 296 at U-A, **114 added in U-B**,
the rest folded into existing files since. The ones worth naming:

| Helper | Covered |
|---|---|
| `formatMoney` | zero, `-0` (renders `0.00`, never `−0.00`), negative, float rejected, `NaN`/`Infinity` rejected, `MAX_SAFE_INTEGER` with no lost halala, unit omitted, no Arabic-Indic digits, no `٫`, no `﷼`, never returns `—`, unit always trailing |
| `formatDate` | all five styles, Arabic with Latin digits, an explicit comparison against what a bare `ar-SA` *would* have produced, the 22:30 UTC → next-day-in-Riyadh off-by-one, bare calendar date as Riyadh midnight, a real DST transition (Europe/London springs forward; Riyadh does not), month end, leap day, `Invalid Date`, `''`, an ISO string with **no offset** rejected, and the legacy display string `'25 Jun 07:00'` rejected *even though `Date.parse` accepts it* |
| `formatDuration` | zero, 1ms, sub-minute (`1m`, never `0m`), the 60-minute and 24-hour boundaries, negative magnitude, 365 days, `NaN`/`Infinity`, and an assertion that it contains no sign and no word |
| `sla` | `No clock` value / band / track / label / sort-last / referential stability, the exact deadline instant, both denominators, `startedAt` winning over `targetMinutes`, a 30-minute vs a 4-hour SLA at the same remaining time, zero-length and reversed windows, clamping at 100%, a total-order check over every pair, stability for equal keys, empty-Arabic fallback, and an Arabic dictionary reordering the sentence |
| `useIndexTable` | ledger has no member and no compile path to one, ledger still paginates and filters, tri-state header checkbox, empty page, single-row page, selection surviving a page change, selection cleared by view/filter/search, page reset, one sort field replacing another, direction without field, queue selection opt-in, blank/whitespace query omitted, chip replaced not duplicated, page never below 1, `isFiltered` false for a view change |
| `useAsync` | all four states, `Paginated` total 0, custom emptiness, a thrown non-`Error`, refetch recovering from error, `isRefreshing` only on a reload that had rows, a slow page 1 landing after a fast page 2, abort on unmount, deps re-running (and not), `enabled: false` |
| `useTick` | exactly one `setInterval` across three hooks and three buckets, no interval with no subscribers, interval cleared on the last unmount, per-bucket render counts (`%1` = 3 in 3s, `%60` = 0 then 1, `%5` = 12 a minute), disabled subscribes to nothing, disabled never calls the clock |
| `useNavCollapse` | collapsed at 1280 / expanded at 1440, viewport read exactly once, stored `false` beating the narrow default, **no state change across a resize**, **no resize listener registered at all**, explicit choice surviving a viewport change, route change persisting, **reload not persisting (the AC-33 gap, asserted)** |
| `useLanguage` | `dir`+`lang` on `<html>` and nowhere else, idempotent, flips on change, opt-out, derived locale, every key falling back to English with an empty Arabic dictionary, a non-language stored value ignored |
| `useFocusEntry` | focus in, named initial control, restore, **no listener installed**, focus staying where the operator moved it, inactive does nothing, unmounted opener, opt-out |
| `useRovingFocus` | exactly one `tabIndex={0}`, arrows, real DOM focus, loop / no-loop at both ends, Home/End, horizontal LTR vs **RTL flip**, vertical *not* flipped in Arabic, empty list, single item, unowned keys ignored (so `Tab` still leaves), no container attached |
| `announcer` | one region however many calls, correct ARIA, visually hidden not `display:none`, re-announcing the same string, latest-wins in a tick, empty message, Arabic |
| `pageRange` | zero total, one row, exact page fill, page size 1, page past the end, 10M rows, invalid inputs |
| `translate` | fallback for every key, interpolation, reordered Arabic, missing parameter, missing key, custom policy, empty template, repeated placeholder |
| `breakpoint` | reads CSS, three fallback paths, 1280/1440, inclusive at 1344, the 1349 scrollbar case, no window |
| `useForm` | **dirty → pristine → dirty** (typing the saved value back clears the bar), an array field by content, a cleared field vs a typed zero, `dirtyFields` exactness, discard, `reset` rebasing the baseline, all five `status` values, `Save` not re-triggerable while in flight, the server's canonical values adopted on success, **a submit that fails** (503 → `rejected`, 422 → `validation` + a count, a thrown non-`Error`, details naming a field this form has not got), **a submit that fails and then the operator edits** (the field's server error clears, the banner's count comes down, the bar returns to `dirty`, `Save` comes back), a rejection dropped as soon as the payload changes, a retry that succeeds, discard clearing a failure, a save landing after `reset` discarded, error visibility (untouched / blurred / after a submit attempt), `aria-invalid` + `aria-describedby` + the id scheme, a live message beating a stale server one, `setFieldError` and clearing it, **a derived field changing because its input changed** (and staying out of `dirtyFields`, and reverting with its input), derived stays clean through `reset`, `isComputable` false for `null` / `NaN` / `Infinity`, `props` has exactly two keys and no `tabIndex`, derived values never reaching `onSubmit`, two forms on one page getting distinct ids, no `validate` at all, and no state set after unmount |
| `useForm` (Arabic) | dirty tracked over Arabic text with no normalisation, an invisible RLM counted as a real change, an Arabic-typed number giving the same derived result as its Latin spelling, a blank clearing to `null` and the derived value going to "no computable result", an Arabic error message passed through untouched |
| `parseNumericInput` | blank / whitespace-only → `null`, a typed `0` kept distinct from blank, text and `12px` and `1.2.3` rejected, exponent notation rejected, `Infinity`/`NaN` spellings rejected, signs, `.5`, `12.`, `,`/NBSP/narrow-NBSP/apostrophe grouping, the U+2212 round trip from `formatMoney`, `MAX_SAFE_INTEGER`, both Arabic-Indic digit ranges, U+066B and U+066C, RLM/LRM/ALM/FSI-PDI stripped, Arabic and Latin spellings of one amount agreeing, Arabic prose still rejected |
| `parseMoneyInput` | blank → `null`, `19.99` → `1999` where `19.99 * 100` is not, half-away-from-zero on a third decimal in both signs, zero and `-0` (never `-0`), negatives, a bare sign, the `formatMoney` round trip over seven values, an Arabic-typed amount, an unsafe integer → `null`, `12.34 SAR` rejected rather than truncated, and an assertion that every result is an integer `formatMoney` will accept |
| `useColumnPinning` | **each row of §7.2's arithmetic table** (976 floor, 488 budget, 260 implicit, one typical column or two narrow ones), a pin landing **exactly** on the budget, the implicit block eating the whole budget so zero operator pins are possible, state and free space untouched by a refusal, the refusal exposed then cleared by the next accepted change, `canPin` giving the same answer without mutating or setting `lastRefusal`, exactly one refusal reason, a wider `floorInlineSize` for a bulk grid, **the floor changing without moving a pin** (the "no resize behaviour" claim, asserted), declaration order beating click order, offsets accumulating across the locked and operator blocks as one region, `isLast` at both edges (exactly one per edge) and the kebab *not* carrying it, the locked block pinned before anything and surviving `clearPins`, `pin`/`unpin`/`togglePin`/`canPin` **throwing** on a locked id, an unknown id throwing and naming the pinnable ids (`(none)` when there are none), a stale id dropped from a restored set, a restored pin on a now-locked column dropped, a column **hidden** mid-session dropping its pin and never being written back, the budget applied to a restored set, a duplicate id in a restored set deduped, an empty column list, a zero-width column refused (and a zero-width **locked** column failing on the first render), an out-of-range fraction and a non-positive floor refused, an edge swap never charged twice, `togglePin` unpin-vs-move, unpin of an unpinned and of a non-existent column, persistence across a remount with `tableId` and **not** without one, two `tableId`s and two **views** kept apart, `initialPins` losing to a stored set, the stored value being §7.6's `{ id, edge }` with no `left`/`right`/`offset`/`index` in it, **`dir="rtl"` producing byte-identical output**, and composition with `useIndexTable` leaving `params` at exactly six keys and a ledger still without `setSortField` |
| `useColumnVisibility` | declared hidden respected at first run, declaration order preserved through show/hide, `visible` handed straight to `useColumnPinning` with a declared-hidden column not even pinnable, hide/show/toggle, idempotence in both directions, `reset()` restoring declared visibility (not "all visible"), the identity column reported not hideable and **throwing** if hidden anyway, a stored set claiming the identity column was hidden **ignored**, the **last visible column** refused and becoming hideable again when another returns, unknown ids throwing on a mutation but answering `false` on a query, a stale id dropped and dropped from the store on the next write, `needsColumnsControl` true under six columns when anything is hideable and false when nothing is, an empty column list, persistence per table and per **view**, the AC-33 reload gap asserted, and `dir="rtl"` producing an identical set and order |
| `toFilterSpec` / `columnFilterIssue` / `formatColumnFilterBounds` | every kind empty → `null`, whitespace-only text → `null`, text trimmed, **`false` emitting a filter and `null` not**, zero as a real numeric bound, a negative bound (overdrawn wallet), `MAX_SAFE_INTEGER`, a decimal bound rejected, `in` kept for a single selection, duplicates deduped in order, Arabic text and Arabic option values passed through untouched, an inverted number range and an inverted date range reported as a code and thrown by `toFilterSpec`, an equal-ended range accepted, a blank field name rejected, a full instant rejected where a day belongs, the legacy display string `'25 Jun 07:00'` rejected, both range ends open independently, **the inclusive end-of-day bound proven by instant comparison** (22:45 on the closing day inside, 00:10 the next day outside, 23:00 the previous day outside, a bare stored day inside at both ends), a range spanning Europe's spring-forward unchanged, and Arabic formatting asserted **Gregorian and Latin-digit** (`2026`, never `1447`, never `٢٠٢٦`) |
| `isDeepEqual` | `NaN`/`NaN`, `-0`/`0`, null vs undefined vs `0` vs `''`, arrays by content and by order, nesting, key order, a present `undefined` vs an absent key, `Date` by instant, two `Invalid Date`s, Arabic strings exactly, an RLM counted, no trimming, and the documented reference-equality fallbacks for `Map`/`Set`/class instances |

---

## 4. Tokens

**Nothing is missing.** Every token §18 asked for is already in `src/styles/globals.css`, including
all sixteen geometry tokens from §1.2, `--ev-bp-wide: 1344px` on `:root` (so `getComputedStyle` can
read it), the seven Arabic overrides, and the §14 type floors.

Two things checked specifically, both correct:

- **`--ev-teal-lt` is not defined.** Line 41 carries a comment saying not to add it. §18 satisfied.
- **The language hook is `:root:lang(ar)`, and only that.** §9.7's *"one hook only — never both
  `body.lang-ar` and `[dir="rtl"]`"* is honoured. `applyDocumentDirection` sets `lang` **and** `dir`
  on `<html>`; CSS keys off `lang` alone. Recommended over `dir` because `dir` also flips for a
  single RTL string inside an English UI while `lang` never does, and the six language-varying
  geometry tokens vary by *language*, not by direction.

One request, small: `useNavCollapse` reads `--ev-bp-wide` at runtime through `getComputedStyle`.
It must stay on `:root` and must not move inside `@theme` only, or the JS falls back to 1344 and the
CSS and the JS could silently disagree.

---

## 5. §18 items not built, and why

| §18 asked for | Status |
|---|---|
| `formatMoney`, `formatDate`, SLA helpers, `useIndexTable`, `useNavCollapse`, one clock, one live region, `useAsync`, `useFilters` | **All built.** |
| A ledger debit/credit splitter | **Not built.** §8.3.3 wants two columns of positive numbers, but there is no wallet/posting type in `src/data/types` yet, so it would have **zero** call sites and — worse — I would have to guess the sign convention. **Blocked on mock-data-engineer:** when the ledger resource lands (wave 3), tell me whether a debit is a negative `amount` or a `direction` field, and I will add it in an hour. Guessing now is how two agents ship incompatible answers. |
| A plural / pluralisation helper | **Not built, on purpose.** Arabic has six plural categories. A half-built plural engine is worse than an explicit choice of two keys. Raise with product-designer if a screen needs one. |
| A second `assertive` live region | **Not built, on purpose.** AC-29 says *exactly one*. An assertive announcement is a `role="alert"` banner, owned by the component rendering the condition. |
| A `localStorage` store | **Not built, on purpose.** Shipping one would answer **Q1** by writing code. See §6. |
| **U-A** — `useForm`, `isDeepEqual`, `parseNumericInput`, `parseMoneyInput` | **Built.** Raised by frontend-engineer at the end of 0.4. |
| A validation schema or rule DSL | **Not built, on purpose.** `validate` is one caller-supplied function returning finished messages. A DSL would have to carry copy (product-designer's) and rules like *"a discount is between 0 and 100"* (domain logic, which belongs with the feature). Three call sites would not make it right; it is the wrong layer, not the wrong count. |
| A `useFieldArray` for the plan editor's feature rows | **Not built.** One call site today. `setValue('features', next)` with an array is what the hook already gives, and `isDeepEqual` makes it behave. Ask again when a second and third surface need row add/remove/reorder. |
| A navigate-away guard | **Not built.** §11.6 row 10 / **AC-54** is a router concern; `isDirty` is what a `useBlocker` reads. The router seam is frontend-engineer's. |
| A `SaveBar` state machine that also owns the copy | **Not built.** `status` gives the five states; `Unsaved plan` vs `Unsaved changes` is entity copy and belongs to the screen. |

---

## 6. Findings and open items

**U-1 — "One clock" is two things. There is exactly one of each, and neither is a duplicate.**
The coordinator was right to ask. `src/data/mock/clock.ts` is a **time source** (`Clock = () =>
IsoDateTime`, `fixedClock`, `systemClock`) — it answers *what "now" is*. §18's "one clock" is a
**heartbeat** — `setInterval(…, 1000)` with modulo buckets exposed as shell state (**AC-28**) — which
answers *when anything re-reads it*. The data layer has no heartbeat and the shell needs one; a
heartbeat that invented its own "now" would be the defect. So `useTick` holds a `Clock` imported
from `@/data/clients` and calls it, and `Date.now()` / `new Date()` appear nowhere in `src/hooks`.
A test freezes the entire app by passing `fixedClock`. **Not two clocks. One source, one heartbeat.**

**U-2 — AC-33 fails, as the recorded gap, and there is a test asserting the failure.**
Q1 (persistence) is unanswered, so `defaultUiStore` is in memory: nav collapse and language survive
every route change (AC-32's second clause) and do **not** survive reload (AC-33). The seam is
`src/lib/persistence.ts` — one interface, one memory implementation, one `defaultUiStore` factory,
and `UI_STATE_KEYS` listing every key the shell persists. **Answering Q1 changes that one file.**
`useNavCollapse.test.ts` contains *"does NOT survive a reload — AC-33 fails until Q1 is answered"*
so the gap is visible in the test report rather than discovered by QA.
**Owner: engineering lead (design spec F-7).**

**U-3 — the SLA warning band needs a second field on any item that wants one.**
`Applicant` carries `slaDueAt` but no target window (`src/data/types/applicant.ts:66`, and its own
comment flags the window as a product-owner question). With only a deadline, `slaClock` can say
`running` or `breached` but has no honest way to compute "under half the window", so the band stays
`neutral` and no track renders. **Callers should pass `startedAt: applicant.appliedAt`** — that is
the natural window and it needs no new field. Where an item has no natural start, the queue needs
its own `targetMinutes`. **Owner: product-owner** for the actual SLA windows; **mock-data-engineer**
for surfacing `appliedAt`/`openedAt` alongside the deadline.

**U-4 — money needs bidi isolation at a boundary, and that is a component decision.**
`1,234.00 SAR` is two LTR runs and does not reorder inside an RTL paragraph, so AC-73 holds for the
string. At a boundary with Arabic prose it can still shift. The fix is `<bdi>` or `dir="ltr"` on the
cell — **frontend-engineer's**. I deliberately did *not* embed U+2068/U+2069, which would poison
copy-paste, CSV export and every test assertion.

**U-6 — the three-call-site test for U-A, stated rather than assumed.**
`useForm` has **eight or more** call sites before it is written: Admin's six configuration sub-tabs
and Financials › Ledger & Payment Controls are P3 (design spec §10.1 layout B), and the plan editor
plus every create/edit surface is P4 (layout A). `parseNumericInput` has one per numeric field —
the census in spec §7.4 counts 225 inputs. `isDeepEqual` has exactly **one** call site, `useForm`,
and is justified on the other half of the rule: §8.2.5 defines dirty, and reference equality gets
that definition wrong for arrays, `NaN` and `-0`. It is exported from `@/lib` because it is tested
independently, and its doc comment states the narrow scope so it does not become a general `isEqual`.

**U-7 — three things §8.2 asks for that are render decisions, not state, and are frontend-engineer's.**
Recorded so nobody assumes the hook covers them: (1) the **150 ms fallback** — `derive` is
synchronous by contract, so a derived value cannot be pending and the rule has nothing to bite on;
if a value ever needs a round trip it is `useAsync` data, not a derived value. (2) The
**`FormulaDisclosure` panel**, which §8.2.2 says *"MUST be generated from the same source as the
computation"* — `derive` is that source, and the panel should be built from it rather than
hand-written beside it, which is precisely the `:1125` vs `cr()` `:12986` drift the rule exists to
stop. (3) The **preview strip**'s `aria-live="polite"` container for a surface carrying two or more
derived values — each `DerivedValue` already carries its own, but the band is markup.

**U-8 — the three-call-site test for U-B, and two things I refused to add.**
`useColumnPinning` gets a call site per index screen the moment `DataTable` composes it — §3.1 makes
horizontal overflow a property of *every* wide index, and `DESIGN.md` names three surfaces outright:
the orders-shaped index (checkbox + primary cell pinned), the bulk grid (§2.5, frozen identity
column) and the variants matrix (§3.1 *Editable tables*). `toFilterSpec` gets one per column filter
control — six kinds, and the filter row is on every index (§3.2). `formatColumnFilterBounds` has
**one** call site and is justified on the other half of the rule: §9.2 has to be enforced centrally,
and a chip is where a date escapes `formatDate`.

**Refused: a `fromFilterSpec` inverse**, to rehydrate a control from a stored `FilterSpec`. One
speculative call site — reopening a chip's editor — and it is lossy: `gte` could have come from a
one-ended number range, a one-ended date range, or a control this table no longer has. `DataTable`
should keep the `ColumnFilterValue` draft keyed by field and treat `FilterSpec` as write-only, which
is one map and no ambiguity. If three screens genuinely need the inverse, ask and I will build it.

**Refused: a `physicalEdge(edge, direction)` helper** mapping `start`/`end` to `left`/`right`.
Nothing needs it — `insetInlineStart` / `insetInlineEnd` are the CSS properties and the browser does
the mirroring. Shipping the mapping would be shipping the tool for the §9.1 violation.

**U-9 — what a pin cannot know, and therefore what `DataTable` owns.**
Recorded so nobody assumes the hook covers it. The hook takes **declared** widths and returns px
offsets; it never measures the DOM and registers no `ResizeObserver`.

1. If `DataTable` renders a column at a width other than the one it declared, the sticky offsets are
   wrong and nothing here will notice. **The declared width must be the applied width** — which
   §3.1's "scroll horizontally rather than shrink columns below legibility" already requires, and
   which `01-table-controls.md` §7.2 makes a constraint on the column contract (§15).
2. The **boundary treatment** on `isLast` was open when this was written and is now answered — §7.3:
   `border-inline-end` / `border-inline-start`, `--ev-hairline`, **tier none, no shadow**, rendered
   only while `scrollWidth > clientWidth`. The overflow test itself is frontend-engineer's and §8.3
   names its trap: **`scrollLeft` is negative in RTL**, so it must be `Math.abs(el.scrollLeft)` and
   never a raw `> 0`.
3. The affordance is answered too — §7.2 and §7.5: one header button opening a menu, plus the
   columns popover as a second entry point. `pin` / `unpin` / `togglePin` / `canPin` serve both, and
   `canPin` is what gates the disabled item **at render**.
4. The **sentence** for a refused pin is `copy.md`'s, and §7.2 fixes it: `Not enough room to pin
   another column`. The hook returns `{ reason, wouldBe, budget }` in pixels and **the operator
   never sees a pixel figure**. It must be said, not swallowed — a menu item that does nothing when
   clicked is the failure the refusal object exists to prevent.

**U-10 — three corrections taken from review, recorded rather than quietly applied.**

1. **`columnFilterIssue`'s contract contradicted itself.** It told every control to disable `Apply`
   on an inverted range; `number-range` commits on debounce and has no `Apply`. Fixed in the doc
   comment and in §2's *Column filters* table, per `01-table-controls.md` §11.8. **No code and no
   design change** — the emission was already refused identically for both kinds; only what the
   control does with the return differs, and that was always `DataTable`'s branch.
2. **Column visibility had no owner** and `useColumnPinning` depended on it. Taken here as
   `useColumnVisibility` — see §2. The alternative, `DataTable` local state, would have put "the
   identity column is never hideable" and "a table cannot hide every column" in each `DataTable`.
3. **F-15 — `useRovingFocus`'s doc comment described its RTL arrow behaviour backwards.** It claimed
   `ArrowRight` moves toward the end of a horizontal list in Arabic; `forwardKey` is `ArrowLeft`
   under `rtl`, and `useFocusEntry.test.ts` has always asserted so. **The code was right and is
   unchanged**; the comment is corrected, and it names the test, because a wrong comment on a
   direction-sensitive hook is worse than none — the next reader "fixes" the code to match it.

**U-11 — `useNavCollapse` was deleted from `src/hooks` by another owner, and the cleanup it left is
done.** 02-shell-fixes removed the hook and its test under `DECISIONS.md` **D5** (the sub-tab column
no longer collapses), leaving a note in `src/hooks/index.ts` that
`UI_STATE_KEYS.subTabNavCollapsed` was now unread and mine to remove. Removed, with the reason in
place of the key. Two related items, neither mine to act on:

- **`UserPreferences.subTabNavCollapsed` still exists on the server type**
  (`src/data/types/session.ts`, and `src/data/clients/session.ts` seeds it). Retiring a field the
  API still returns is a data-seam and product-owner question. **Owner: mock-data-engineer /
  product-owner.**
- **`isWideViewport` and `readWideBreakpointPx` now have no production caller.** They are not dead:
  D2 gives `--ev-bp-wide` three uses, and two of them — the detail right-rail drop (§7.2) and the
  metric-tile grid — are still ahead. Kept, with the situation stated in `breakpoint.ts` itself so
  nobody deletes it as unused or adds a second breakpoint beside it.

**U-5 — five pre-existing type errors, none mine (resolved).** `src/components/ui/alert-dialog.tsx`,
`dialog.tsx` (×2), `select.tsx`, and `src/main.tsx` (`Cannot find module '@/App'`). All
frontend-engineer's, all in-progress at the time of writing. Reported rather than touched — and all
five are gone as of the U-A run: `npx tsc -b --noEmit --force` now exits 0 repo-wide.

---

## 7. Verification

Phase 0.5 as originally delivered: `tsc` clean in `src/lib` and `src/hooks`, five pre-existing
errors elsewhere (frontend-engineer's, in progress at the time), `339 passed / 339`.

**After U-A**, verbatim:

```
$ npx tsc -b --noEmit --force
(exit 0)

$ npx vitest run
 Test Files  23 passed (23)
      Tests  446 passed (446)
```

The five errors reported in the first pass are gone — frontend-engineer fixed them. All 339
pre-existing tests still pass; 107 are new in this addendum (47 `useForm`, 27 `parse/input`,
21 `equality`, plus the assertions folded into existing files).

**After U-B**, verbatim, at handoff:

```
$ npx vitest run src/hooks src/lib     # the files I own
 Test Files  22 passed (22)
      Tests  436 passed (436)

$ npx tsc -b --noEmit --force
(exit 0, repo-wide)

$ npx vitest run                       # repo-wide
 Test Files  4 failed | 30 passed (34)
      Tests  20 failed | 727 passed (747)

   src/shell/navBadges.test.ts · qa.copy.test.tsx · qa.keyboard.test.tsx · qa.shell.test.tsx
```

**`tsc` is clean repo-wide. All 20 test failures are in four `src/shell` files, and none is mine.**
They are AC-64/AC-65 (rail and sub-tab keyboard order and accessible names), AC-73/AC-74 (Arabic
copy and nav numerals) and `workspaceBadge` escalation — the shell rework the two
frontend-engineers are landing right now, against acceptance criteria that were themselves amended
mid-flight (`AC-64 (amended)` names a sub-tab disclosure that did not exist an hour ago).
**Owner: frontend-engineer.** Not touched.

Nothing in `src/lib` or `src/hooks` is implicated. The only file of mine those suites reach is
`useRovingFocus.ts`, and `git diff` shows every changed line there begins with ` *` — the F-15
comment correction and nothing else.

**This area churned continuously through U-B**, and the honest record is four consecutive
repo-wide runs, minutes apart, with no change of mine between them:

| Run | Repo-wide | `src/hooks` + `src/lib` |
|---|---|---|
| 1 | `24 failed / 720 passed`, five `src/shell` files, `nav.test.tsx` not parsing | `436 passed` |
| 2 | `2 failed / 734 passed` | `436 passed` |
| 3 | five suites uncollected — `CaptainsView.tsx` `Unexpected "**"` in a doc comment | `436 passed` |
| 4 | `20 failed / 727 passed`, `tsc` clean | `436 passed` |

Run 2's failure was a real defect worth keeping: a rail tile's count badge concatenated into its
accessible name, `'Exec6'` where `'Management'` was expected.

**The baseline moved twice, and not because of me.** The brief cited 446; the repo was at
**524 passed / 27 files** when U-B started, and at 664 / 31 an hour later, as the shell work landed.
**114 tests are new here** — 53 `useColumnPinning`, 36 `useColumnVisibility`, 25 `columnFilter` —
and two existing assertions were updated, both in my own files and both by design:

- `src/lib/persistence.test.ts` asserts the full list of `UI_STATE_KEYS` so a Q1 answer cannot miss
  one. Adding `ui.columnPins` and `ui.columnVisibility` made it fail — the guard working. Updated,
  with a comment saying both are **prefixes**, not keys.
- No other test in the repo was edited.

**One failure I caused and fixed rather than shipped.** My first `columnFilter.test.ts` imported
`@/data/mock/query` to prove the date bounds against the real query engine. That tripped
`src/data/clients/seam.test.ts` › *"keeps every mock-internal import inside src/data"* — correctly:
`src/lib` may not reach into the mock's internals. The test now asserts the same property one level
down, on `Date.parse` of the emitted bounds, which is what every engine actually compares. **No
`src/data/` file was touched.**

`src/hooks/useIndexTable.ts` and `src/hooks/useIndexTable.types.ts` are **byte-identical** to their
pre-U-B state — `git diff --stat` shows neither. The AC-48 `@ts-expect-error` assertions still error,
so `tsc` still passes them for the right reason.

**One existing test I changed, and it is mine.** `src/lib/persistence.test.ts` asserts the full list
of `UI_STATE_KEYS` so a Q1 answer cannot miss one. Adding `ui.columnPins` made it fail by design —
that is the guard working. Updated, with a comment saying `columnPins` is a **prefix**, not a key.

**One failure I caused and fixed rather than shipped.** My first `columnFilter.test.ts` imported
`@/data/mock/query` to prove the date bounds against the real query engine. That tripped
`src/data/clients/seam.test.ts` › *"keeps every mock-internal import inside src/data"* — correctly:
`src/lib` may not reach into the mock's internals. The test now asserts the same property one level
down, on `Date.parse` of the emitted bounds, which is what every engine actually compares. **No
`src/data/` file was touched.**

`src/hooks/useIndexTable.ts` and `src/hooks/useIndexTable.types.ts` are **byte-identical** to their
pre-U-B state; `git diff --stat` shows neither. The AC-48 `@ts-expect-error` assertions still error,
so `tsc` still passes for the right reason.

Both `src/hooks/useIndexTable.types.ts` and `src/hooks/useForm.types.ts` are part of the typecheck,
so **AC-48 and the §8.2 derived-value rules are verified by `npx tsc -b --noEmit`**, not only by a
runtime test. Each is a file of `@ts-expect-error` markers, which are themselves errors when the
marked line has no error — relax either type and the build breaks and names the rule.

**Two concurrent-edit artefacts, recorded because the brief asks for the real output.** Neither is
in a file I own and neither is caused by anything here.

1. A mid-run `tsc` briefly reported five errors in `src/data/clients/navCounts.test.ts`
   (mock-data-engineer's file, being edited at that moment). Gone on the next run; `tsc` exits 0.
2. A `vitest` run a few minutes later showed **445 passed / 1 failed**:

   ```
   FAIL src/data/clients/seam.test.ts > 4 — no component imports a fixture
     > keeps every fixture import inside src/data
     + "src\shell\navBadges.test.ts: from '@/data/fixtures/navCounts', from '@/data/fixtures/routeTable'"
   ```

   `src/shell/navBadges.test.ts` appeared during the run. It imports fixtures directly, which is the
   seam violation mock-data-engineer's guard exists to catch. **Owner: frontend-engineer** — it
   should go through `@/data/clients`. My three test files were re-run in isolation immediately
   after: `3 passed (3) · 96 passed (96)`.

---

## 8. Legacy behaviour ported, and the bugs left behind

| Ported from | To | Bug deliberately not carried across |
|---|---|---|
| `fmtAge` `:14630` | `formatDuration` | `Math.max(0, ms)` clamped negatives, forcing twelve call sites to pass `-ms` (`:14797`, `:19234`) — sign handling belonged in one place and was in twelve. And `Math.round` to the nearest minute made 20 seconds left render `0m`, so a live countdown read "0m left" for a whole minute. Now: magnitude by contract, and round **up** to the minute — with the tier below it added later for Q-13 / AC-215 (`formatDuration(ms, { precision: 'second' })`, `44s`, truncating), because a 45-second promise cannot be watched in whole minutes. Rounding up is what keeps the minute tier off `0m`; it is also the reason `1m left` can mean 44 seconds, which is why the seconds tier truncates instead. |
| `sortInbox` `:19229`–`:19232`, `dueChip` `:19234`–`:19241` | `slaSortKey`, `slaLabelDescriptor` | Nothing — the `9e12`-sentinel ordering was already right, and `:19267` documents it in its own UI copy. |
| The `sla-fill` bar `:11652` | `slaTrackPercent` | The hardcoded `/90` denominator. It made a 30-minute and a 4-hour SLA draw the same bar; there is a test asserting they now differ. |
| `fmtSAR()` `:4394`, `fmt()` `:12985`, inline `.toFixed(2)+' SAR'` `:6693` | `formatMoney` | Three formatters across 87 money strings, and a negative rendered in `--red` at `:5537`/`:3953`. Sign is now typographic only; §8.3.2 bans a negative in a badge and the function cannot produce one. |
| `toLocaleDateString('en-GB', …)` `:11235`, `:4728`, `:6627`, `:18755` | `formatDate` | No calendar, no numbering system, no time zone — plus stored display strings like `'25 Jun 07:00'` (`:2676`) that cannot be sorted or localised. Those strings are now **rejected**, not parsed into a plausible wrong date. |
| `tickEngine` `:11968`, buckets `:12512`–`:12611` | `useTick` | Per-page intervals (`:2509`, `:4791`, `:4962`, `:5165`) — five more `setInterval`s the shell now makes unnecessary. |
| `.sb-badge`, nav counts `:491`–`:533` | `formatCount` | The eleven rail badges that render a literal `0` at boot. `formatCount` still formats `0` (pagination needs it); **AC-26**'s "no badge at zero" is a render decision and stays with the badge component. |
| The 253 non-focusable click handlers, `aria-` appearing **zero** times | `announcer`, `useFocusEntry`, `useRovingFocus` | Nothing to port — this is net-new. |
| `gv()` `:12984`, `numval()` `:6150`–`:6155` | `parseNumericInput` | **Both of them.** `gv()` is `parseFloat(...)||0` and answers `0` for a blank field; `numval()` answers the *previous stored value*. The preview reads one and `savePlan()` reads the other, so an operator can clear a discount, watch the preview drop to 0 %, save, and store the old number. §8.2.5 names this and demands one function. Blank is now `null`, once. Neither legacy function reads an Arabic-Indic digit either. |
| `.computed-box` `:255`, `upd()` `:12987`–`:12999`, the seven listeners at `:13000` | `useForm`'s `derive` + `DerivedValue` | Two bugs. First, **four inputs that affect the result are not bound** (`fp3-duration`, `fp3-cap`, `fp3-sort`, the status select), so the strip can show a stale number with no indication — impossible here, because `derived` is recomputed from `values` rather than pushed by listeners, so there is no list to forget a field from. Second, `.computed-box` renders a derived value **inside a bordered `--bg2` box**, which §8.2.1 retires as declared: it asks the border to mean "editable" and "never editable" at once. `DerivedValue` ships no `controlProps`, so there is nothing to give a box to. |
| `.settings-dirty-dot` `:248`, `.form-footer` `:279` / `:1127` | `useForm`'s `status` | **D2 itself.** The dot is declared `display:none` and has zero other occurrences; the footer is used once in 21,857 lines. There was no dirty state to port — only the absence of one to fix. |
| `#fp3-status` `:1105` | — | Not ported, and worth naming: an editable control that `savePlan()` never reads, so the operator changes it, sees it change, saves, and loses it. `useForm` cannot express it — `onSubmit` receives the whole `values` object, so a field that exists is a field that is sent. |

---

## 9. For frontend-engineer

- Import from `@/lib` and `@/hooks`. Keep importing `cn` from `@/lib/utils`.
- **`DataTable`'s `mode` prop should be `table.mode`**, and the mode discriminates the union — so
  `if (table.mode === 'ledger')` narrows away selection and sort and TypeScript will not let you
  render a checkbox in that branch. That is the design's §9.4 rule as a type.
- **Do not render a live-region component.** Call `useAnnounce()`.
- **Do not use `useRovingFocus` inside a Radix primitive.** Rail, sub-tab column and the collapsed
  popover list only.
- Shell layers: `useFocusEntry`, and do **not** add a trap. AC-67 as amended.
- Money in an RTL boundary context needs `<bdi>` on the cell — see **U-4**.
- The countdown pill reads `formatSlaLabel(clock, t)`; the track renders **only** when
  `slaTrackPercent(clock) !== null`.
- One decision is yours: whether `SLA_MESSAGES_EN` is merged into the English dictionary at the
  dictionary's module or at the provider. The keys are fixed either way.

### For the table controls (U-B)

- **Sort and filter are already built. Do not rebuild them.** `table.sort` / `setSortField` /
  `setSortDirection` / `clearSort` drive §3.2's sort popover (field-as-radio-group + a separate
  direction pair). `table.filters` / `setFilter` / `removeFilter` / `clearAll` / `isFiltered` drive
  the chip row and `Clear all`. The only genuinely new state is pinning.
- **Compose three hooks, in this order, inside `DataTable`:**
  ```ts
  const table      = useIndexTable({ mode, getRowId })
  const visibility = useColumnVisibility({ columns, tableId, view: table.view })
  const pins       = useColumnPinning({ columns: visibility.visible, tableId, view: table.view })
  ```
  Pins and visibility are view state and must not reach `table.params` — there is a test asserting
  `params` has exactly `page`, `pageSize`, `q`, `sort`, `filters`, `view` and nothing else.
- **Declare the implicit block as `lockedEdge`, not as three pins you remember to add.** The R5a
  marker lane and the selection checkbox get `lockedEdge: 'start'`, the identity column gets
  `lockedEdge: 'start'` **and** `alwaysVisible: true`, the row kebab gets `lockedEdge: 'end'`. Then
  §7.1's "never unpinnable" and §3.1's "never hideable" are enforced for you, and the offsets of the
  whole region come out of one place.
- **Render a pinned cell from `PinnedColumn` and nothing else:**
  ```tsx
  const p = pins.pinnedColumn(column.id)
  const style = p ? { position: 'sticky', [p.insetProperty]: p.offset, zIndex: 1 } : undefined
  ```
  `insetProperty` is `insetInlineStart` / `insetInlineEnd`. **Never write `left` or `right`**, and
  never branch on `edge` to choose one — that branch is the §9.1 defect, pre-made.
- **The boundary is `p.isLast`, and only `p.isLast`** (§7.3). Exactly one column per edge carries
  it. Do not use `start.at(-1)`: at the `end` edge the boundary column is `end[0]`, and `at(-1)`
  would put the hairline on the wrong side of the kebab. §7.3 also gates it on
  `scrollWidth > clientWidth` — and §8.3 warns that **`scrollLeft` is negative in RTL**, so that
  test is `Math.abs(el.scrollLeft)`, never a raw comparison to `0`.
- **A refused pin must say why.** `pins.canPin(id)` gates the disabled menu item **at render**, not
  at commit (§7.2); `pin()` returns the same `PinRefusal | null` and `pins.lastRefusal` holds the
  last one. **The operator never sees a pixel figure** — §7.2 fixes the sentence as `Not enough room
  to pin another column`. I return `reason`, `wouldBe` and `budget`.
- **Declared width must equal applied width.** `useColumnPinning` never measures the DOM. If a
  column renders narrower than its declared `width`, every offset behind it is wrong and nothing
  will warn you. §7.2 makes this a constraint on the column contract, not an implementation note.
- **There is no resize behaviour to build.** The budget is measured at the floor, so a pin accepted
  at 1920 is still valid at 1280 and nothing demotes. No `ResizeObserver` for pinning.
- **Column visibility: bind the toggle's disabled state to `isHideable(id)`**, not to
  `alwaysVisible` — it is also false for the last visible column, which is the other way to make a
  dead table. `reset()` is §7.5's `Reset columns`; call `pins.clearPins()` beside it, since §7.5
  says that control clears both.
- **Pinning a ledger is legal, sorting one still is not.** §8.3.3 / **AC-48** is unchanged and
  `useIndexTable.ts` was not edited. `table.mode === 'ledger'` still narrows away `setSortField`.
- **Column filters go through `toFilterSpec`.** `toFilterSpec(field, value)` → `setFilter(spec)`,
  and `null` → `removeFilter(field)`. That pairing is the whole contract: an empty control must
  remove its chip, not add an empty one. Hold the `ColumnFilterValue` draft keyed by field in
  `DataTable`; there is deliberately no inverse (see **U-8**).
- **`columnFilterIssue(value) !== null` branches two ways, and §11.8 says which** — `date-range`
  disables its `Apply`; `number-range` has no `Apply`, so it emits nothing, leaves the previous
  filter standing, and renders §4.4's inline hint. `toFilterSpec` throws either way if you emit
  anyway, so the branch is not optional.
- **One decision is yours:** whether `tableId` is the route's sub-tab id or an explicit prop. I would
  use the sub-tab id, so two tables on one route stay distinct — pass the same `tableId` and `view`
  to both `useColumnVisibility` and `useColumnPinning`, or their per-view state will disagree.
- **One thing I could not resolve, and it is frontend-engineer's:** the `z-index` relationship
  between a pinned column and the sticky header row. Both are sticky, both are §6.3 elevation
  `none`, and where they cross is a render decision with no rule behind it. §7.3 requires the pinned
  cells to be opaque (`--ev-surface`, `--ev-bg2` on hover) so scrolling content cannot show through;
  the stacking order of the two sticky axes is not specified anywhere I could find.

### For the form work (U-A)

- **`SaveBar`'s visibility is `form.status !== 'clean'`**, and its three button states are
  `form.canSave`, `form.canDiscard`, `form.isSaving`. Do not recompute any of them from `isDirty`
  and `errors` — that is how row 6 and row 7 drift apart.
- **`form.status` is a union, so `switch` it.** `save-failed` is the only branch that renders the
  page-level critical banner, and `form.failure.kind` picks §11.6 row 8 (`validation`, title carries
  `failure.issues.length`) from row 9 (`rejected`).
- **Render a derived value as a `span`**, spreading `derivedValue(k).props`. When `isComputable` is
  `false`, render `ABSENT` from `@/lib` — never `0`, never blank, never a spinner (§8.2).
- **Number and money inputs must go through `parseNumericInput` / `parseMoneyInput`.** A raw
  `Number(e.target.value)` or `parseFloat(...) || 0` reintroduces the exact §8.2.5 defect, and it
  will not read an Arabic keyboard. A cleared field is `null`.
- **`aria-describedby` composition is yours where helper text exists.** `controlProps` sets it to
  `errorId` when there is an error; spread first, then override with
  `[helperId, field.error ? field.errorId : null].filter(Boolean).join(' ')`. Only the component
  knows whether helper text rendered.
- **Two decisions are yours, and I did not make them:**
  1. **The dirty label's copy.** §2.3 wants `Unsaved plan` when editing a named record and
     `Unsaved changes` otherwise. `useForm` does not carry an entity noun — that is copy, and it is
     per-screen. Pass it to `SaveBar`.
  2. **Announcing `Saving`** (§11.6 row 7). Call `useAnnounce()` from the save bar when
     `status` becomes `save-in-flight`; the hook does not announce, because the string is copy and
     must be translated.
- **`isDirty` is what the navigate-away guard reads** (§11.6 row 10, **AC-54**). The router blocker
  is yours; I have no router seam and will not invent one.
- **Do not add a second form helper.** If a form needs something this does not do, tell me what and
  I will decide whether it belongs here — a screen-local `useState` beside `useForm` is two sources
  of truth for one save bar.
