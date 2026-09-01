/**
 * Which columns are frozen at which **logical** edge while a wide table scrolls
 * sideways, where each one sits, and which one carries the boundary.
 *
 * Specified in `docs/05-restructure/design/01-table-controls.md` §7 (and
 * `DESIGN.md` §8.5), which adopts this hook's model. The rules it serves:
 *
 * - `DESIGN.md` §3.1 *Horizontal overflow*: wide tables scroll horizontally and
 *   *"the checkbox + primary cell stay pinned while they do"*.
 * - `DESIGN.md` §2.5: *"Bulk grids MUST be edge-to-edge with a sticky header row
 *   and a frozen identity column."*
 * - `DESIGN.md` §3.1 again: wide tables *"scroll horizontally rather than shrink
 *   columns below legibility"* — which is why **a pinnable column must declare an
 *   inline size**. A column sized `auto` has no offset until layout has run, and
 *   an offset computed after layout is a frame of visible jump on every scroll.
 *   §7.2 makes that a constraint on the column contract, not an implementation
 *   note.
 * - `01-table-controls.md` §7.1: **three regions, and only one is the
 *   operator's.** The R5a marker lane, the selection checkbox, the identity
 *   column (inline-start) and the row kebab (inline-end) are pinned by the
 *   *component* — never the operator, never unpinnable. Here they are columns
 *   carrying `lockedEdge`, so "the operator cannot unpin the identity column" is
 *   a type-and-throw, not a convention every `DataTable` has to remember.
 *
 * ## Everything is logical
 *
 * `start` / `end`, never left / right (§9.1). Nothing in this file reads `dir`,
 * `lang` or a `Direction`, and that is the RTL guarantee: identical columns and
 * identical pins produce byte-identical output in English and Arabic, exactly as
 * §8.2 promises — *"which columns are pinned: unchanged; their order within the
 * pinned block: unchanged"*. The browser mirrors it once, because the consumer
 * writes `offset` to `insetProperty`, which is `insetInlineStart` /
 * `insetInlineEnd`. §8.3 asks for precisely that: *"the offset for the second and
 * third pinned column must be the accumulated inline size of the ones before it
 * […] apply it to `inset-inline-start` — never to `left`."*
 *
 * `PinEdge` includes `'end'` because the component needs it for the kebab. §7.1:
 * *"it is never wired to an operator affordance."*
 *
 * ## Order: declaration order, never click order
 *
 * §7.1: *"Pinning is a freeze, not a reorder."* If pinning `Status` moved it in
 * front of `Plan` merely because it was clicked first, the operator would have
 * performed a column reorder they never asked for, and pinning a second column
 * would visibly shuffle the first. Column *order* is separate per-view state
 * (§9.1) and this hook must not become a second way to set it. §7.6 follows from
 * it: render order is **not stored**, because it comes from the declaration.
 *
 * ## One budget, measured at the floor — and therefore no resize behaviour
 *
 * §7.2, one rule and no count cap:
 *
 * > The pinned region may not exceed **50 %** of the table's inline size **at the
 * > narrowest width that table will ever have** — `TABLE_FLOOR_INLINE_SIZE_PX`,
 * > the content region at the 1280 px D2 floor with both nav columns expanded.
 *
 * A pinned region wider than what is left is a dead UI: nothing scrolls, and the
 * columns being scrolled towards are unreachable.
 *
 * Two consequences the spec draws out, and they are the reason `floorInlineSize`
 * is a floor and not a measurement:
 *
 * 1. **A count cap would be redundant.** Three narrow columns and one wide one
 *    are not the same risk, and the budget already refuses whichever combination
 *    is too much. `PinRefusalReason` has exactly one value; a second would be a
 *    second sentence to write and a second disabled state to test, for no
 *    additional protection.
 * 2. **Pins never change on resize.** A pin accepted at 1920 px is still valid at
 *    1280 px, so there is no demotion, no restoration, and no code path that a
 *    resize can reach. §3.3 already rules that shell state is never re-derived
 *    from a resize; this makes that vacuous rather than merely observed.
 *
 * **What the budget measures**, stated once because §7.2's rule and its
 * arithmetic table have to agree: **everything pinned except the locked
 * inline-end block**. The kebab is hard against the far edge, is never
 * refusable, and is not something an operator can scroll towards. Under that
 * reading §7.2's table reproduces exactly — 976 floor, 488 budget, 260 implicit
 * inline-start block, **228 left for operator pins**, one typical column.
 *
 * ## Guards, all structural
 *
 * - **Unknown id, and locked id.** `pin` / `unpin` / `togglePin` / `canPin`
 *   **throw**. The affordance is built from the column list and §7.5 renders the
 *   identity column's toggle disabled, so reaching either is a caller bug — and a
 *   returned refusal would be swallowed by a component that only checks the
 *   budget.
 * - **Stale id.** A pin on a column that is no longer in the list — hidden by the
 *   columns popover, or restored from a session where it existed — is **dropped**,
 *   everywhere it can be observed or persisted. Throwing there would crash a
 *   table because someone unticked a column. The trade accepted: hiding a column
 *   forgets its pin.
 * - **Duplicates and edge swaps.** Re-pinning to the same edge is an accepted
 *   no-op. Pinning to the other edge is a **move**, evaluated after the column is
 *   removed from its old edge, so a column is never refused for its own width.
 *
 * A refusal is a structured value, never thrown and never silent, so `DataTable`
 * can gate the affordance at render — §7.2: *"`Pin column` renders disabled in
 * place with the reason […] gated at render, never at commit."* The refusal
 * carries pixels; **the operator never sees a pixel figure**, and the sentence is
 * copy.
 *
 * ## Why this is not in `useIndexTable`
 *
 * A pin has no server meaning. `useIndexTable`'s whole output funnels into
 * `params: QueryParams`, which models the request — adding pins there would put
 * view state on the wire. It also does not know the columns. Compose the two.
 * `useIndexTable.ts` is untouched, so **AC-48**'s compile-time ledger guarantees
 * in `useIndexTable.types.ts` are untouched by construction — and §7 rules that
 * filtering and pinning a ledger are both legal, because a pin removes nothing
 * and mutates nothing.
 */

import { useCallback, useMemo, useState } from 'react'
import { invariant } from '@/lib/invariant'
import { UI_STATE_KEYS, createNullStore, defaultUiStore, type UiStateStore } from '@/lib/persistence'
/* D16 — see `useLanguage.ts`: the validator is what makes the store cached
   rather than in-memory, and it is required because caching without one means
   casting an unvalidated `JSON.parse` result to `T`. */
import { isUiColumnPinList } from '@/data/clients/preferences'

/** Logical edges. There is no `left` and no `right` here, and there must never be. */
export type PinEdge = 'start' | 'end'

export interface ColumnPin {
  readonly id: string
  readonly edge: PinEdge
}

/**
 * What the hook needs about a column: its id, the inline size it renders at in
 * CSS pixels, and whether the *component* pins it. Deliberately not a column
 * definition, so `DataTable` keeps its own richer type and passes a projection.
 */
export interface PinnableColumn {
  readonly id: string
  /** Declared inline size in px. Must be finite and > 0; see the header note on `auto`. */
  readonly width: number
  /**
   * §7.1's implicit regions: the R5a marker lane, the selection checkbox and the
   * identity column (`start`), and the row kebab (`end`). Always pinned, never
   * togglable by the operator, never refusable.
   */
  readonly lockedEdge?: PinEdge
}

export interface PinnedColumn {
  readonly id: string
  readonly edge: PinEdge
  readonly width: number
  /**
   * Cumulative inline size of everything pinned **between this column and its
   * edge**, in px. Write it to `insetProperty`; the first column at an edge is 0.
   */
  readonly offset: number
  /**
   * The innermost pinned column at this edge — the one the scrolling body slides
   * under, and §7.3's *"the last pinned column at each edge"* that carries the
   * boundary hairline. Equivalently: the largest `offset` at its edge.
   *
   * A flag rather than `array.at(-1)` at the call site because §7.3 says why: at
   * the inline-end edge the innermost pinned column is the **first**-declared
   * one, and `at(-1)` would put the hairline on the wrong side of the kebab.
   */
  readonly isLast: boolean
  /** §7.1: pinned by the component, not the operator. Not unpinnable. */
  readonly locked: boolean
  /** §9.1 / §8.3, handed over so nobody writes `left`. */
  readonly insetProperty: 'insetInlineStart' | 'insetInlineEnd'
}

/** §7.2: exactly one value. A second reason is a second sentence for no extra protection. */
export type PinRefusalReason = 'exceeds-budget'

export interface PinRefusal {
  readonly columnId: string
  readonly edge: PinEdge
  readonly reason: PinRefusalReason
  /** Total pinned inline size the pin would have produced, px. */
  readonly wouldBe: number
  /** The most that may be pinned, px. */
  readonly budget: number
}

/**
 * The content region at the **D2** floor — 1280 px with both nav columns
 * expanded — measured in `design/00-shell.md` §1 and named in
 * `01-table-controls.md` §7.2.
 *
 * Not a breakpoint: `--ev-bp-wide` is the only breakpoint (D2) and this is a
 * width budget, so it does not belong in `src/lib/breakpoint.ts`.
 */
export const TABLE_FLOOR_INLINE_SIZE_PX = 976

/**
 * §7.2. Half: the pinned region may never be larger than the region it freezes
 * content out of. Above half, the table is mostly frozen furniture.
 */
export const DEFAULT_MAX_PINNED_FRACTION = 0.5

export interface UseColumnPinningOptions {
  /**
   * The ordered, currently **visible** columns — `useColumnVisibility().visible`.
   * Order here is render order.
   */
  columns: readonly PinnableColumn[]
  initialPins?: readonly ColumnPin[]
  /**
   * Identifies the table so its pins survive a route change. Omit and pins live
   * for the life of the mount.
   *
   * **Q1 is unanswered** (`src/lib/persistence.ts`): the default store is in
   * memory, so this does **not** survive reload. That gap is recorded, not
   * hidden — the AC-33 gap, recorded in `src/lib/persistence.ts`.
   */
  tableId?: string
  /** §7.6: column state is per table **and per view**. Part of the key. */
  view?: string | null
  /** Test and Q1 seam. Overrides `tableId` / `view`. */
  store?: UiStateStore<readonly ColumnPin[]>
  /**
   * The **narrowest** inline size this table's scroll container will ever have,
   * px. Defaults to `TABLE_FLOOR_INLINE_SIZE_PX`. §7.2: a full-bleed bulk grid
   * (§2.5) has no nav columns and legitimately passes a larger one — *"that is
   * the only sanctioned override."* Never pass a live measurement; see the header
   * note on why pins do not move on resize.
   */
  floorInlineSize?: number
  maxPinnedFraction?: number
}

export interface ColumnPinningState {
  /** Every live pin, in column-declaration order. Stale and locked ids already dropped. */
  readonly pins: readonly ColumnPin[]
  /** Frozen at the inline-start edge, in render order: locked columns, then operator pins. */
  readonly start: readonly PinnedColumn[]
  /** Frozen at the inline-end edge, in render order. Offsets accumulate from the end edge inward. */
  readonly end: readonly PinnedColumn[]
  /** The resolved column, or `null` when it is not pinned. Edge, offset, `isLast` and `locked` in one lookup. */
  pinnedColumn: (id: string) => PinnedColumn | null
  isPinned: (id: string) => boolean
  /** §7.3's hairline: the pinned column adjacent to the scrolling body at its edge. */
  isLastPinned: (id: string) => boolean
  /** `null` on success, a `PinRefusal` when the budget refused it. Throws on an unknown or locked id. */
  pin: (id: string, edge?: PinEdge) => PinRefusal | null
  unpin: (id: string) => void
  /** Same edge → unpin. Other edge → move. Unpinned → pin. */
  togglePin: (id: string, edge?: PinEdge) => PinRefusal | null
  /** §7.5's `Reset columns` clears every operator pin. The locked block is untouched. */
  clearPins: () => void
  /** The dry run §7.2 gates the disabled menu item on. Same answer `pin` would give. */
  canPin: (id: string, edge?: PinEdge) => PinRefusal | null
  /** The most recent refusal, so the component can explain itself. Cleared by any accepted change. */
  readonly lastRefusal: PinRefusal | null
  /** Pinned by the component (§7.1). */
  readonly lockedInlineSize: number
  /** Pinned by the operator. */
  readonly operatorInlineSize: number
  readonly pinnedInlineSize: number
  /** What is left to scroll at the floor width. Never negative. */
  readonly freeInlineSize: number
  /** `floorInlineSize × maxPinnedFraction`, px. */
  readonly budget: number
}

/* ───────────────────────────── pure core ───────────────────────────── */

interface Resolved {
  pins: readonly ColumnPin[]
  start: readonly PinnedColumn[]
  end: readonly PinnedColumn[]
  byId: ReadonlyMap<string, PinnedColumn>
  lockedInlineSize: number
  operatorInlineSize: number
  /** What the budget is measured against: everything pinned but the locked inline-end block. */
  budgetedInlineSize: number
}

function assertWidth(column: PinnableColumn): void {
  invariant(
    Number.isFinite(column.width) && column.width > 0,
    `Column "${column.id}" cannot be pinned without a positive width, got ${column.width}.`,
  )
}

/**
 * Drops stale ids and locked ids, deduplicates (last write wins), and lays out
 * both edges in declaration order. One pass over `columns`, so it is cheap
 * enough to run on every render and there is no cache to go stale.
 */
function resolve(columns: readonly PinnableColumn[], pins: readonly ColumnPin[]): Resolved {
  const edgeById = new Map<string, PinEdge>()
  for (const pin of pins) edgeById.set(pin.id, pin.edge)

  const startColumns: PinnableColumn[] = []
  const endColumns: PinnableColumn[] = []
  const livePins: ColumnPin[] = []
  let lockedInlineSize = 0
  let operatorInlineSize = 0
  let budgetedInlineSize = 0

  for (const column of columns) {
    const locked = column.lockedEdge
    // A locked column ignores any pin recorded against it — §7.1, the implicit
    // block is the component's — and a pin on it never enters `livePins`.
    const edge = locked ?? edgeById.get(column.id)
    if (edge === undefined) continue

    assertWidth(column)
    if (locked === undefined) {
      livePins.push({ id: column.id, edge })
      operatorInlineSize += column.width
      budgetedInlineSize += column.width
    } else {
      lockedInlineSize += column.width
      if (locked === 'start') budgetedInlineSize += column.width
    }

    if (edge === 'start') startColumns.push(column)
    else endColumns.push(column)
  }

  const byId = new Map<string, PinnedColumn>()

  let cursor = 0
  startColumns.forEach((column, index) => {
    byId.set(column.id, {
      id: column.id,
      edge: 'start',
      width: column.width,
      offset: cursor,
      isLast: index === startColumns.length - 1,
      locked: column.lockedEdge === 'start',
      insetProperty: 'insetInlineStart',
    })
    cursor += column.width
  })

  // The end edge accumulates inward, so the *last*-declared end column sits at
  // offset 0 and the *first*-declared one is the innermost — §7.3's boundary.
  cursor = 0
  for (let index = endColumns.length - 1; index >= 0; index -= 1) {
    const column = endColumns[index]
    if (!column) continue
    byId.set(column.id, {
      id: column.id,
      edge: 'end',
      width: column.width,
      offset: cursor,
      isLast: index === 0,
      locked: column.lockedEdge === 'end',
      insetProperty: 'insetInlineEnd',
    })
    cursor += column.width
  }

  const pick = (list: readonly PinnableColumn[]): PinnedColumn[] =>
    list
      .map((column) => byId.get(column.id))
      .filter((entry): entry is PinnedColumn => entry !== undefined)

  return {
    pins: livePins,
    start: pick(startColumns),
    end: pick(endColumns),
    byId,
    lockedInlineSize,
    operatorInlineSize,
    budgetedInlineSize,
  }
}

/**
 * The single code path both `pin` and the first-run fold of a seed go through,
 * so a restored set can never contain something interactive pinning would have
 * refused.
 *
 * Removes then re-adds, which makes a duplicate pin idempotent and an edge swap a
 * move — and means the moving column's own width is never counted twice.
 */
function applyPin(
  columns: readonly PinnableColumn[],
  pins: readonly ColumnPin[],
  budget: number,
  id: string,
  edge: PinEdge,
): { pins: readonly ColumnPin[]; refusal: PinRefusal | null } {
  const existing = pins.find((pin) => pin.id === id)
  if (existing?.edge === edge) return { pins, refusal: null }

  const next: ColumnPin[] = [...pins.filter((pin) => pin.id !== id), { id, edge }]
  const wouldBe = resolve(columns, next).budgetedInlineSize

  if (wouldBe > budget) {
    return { pins, refusal: { columnId: id, edge, reason: 'exceeds-budget', wouldBe, budget } }
  }
  return { pins: next, refusal: null }
}

/* ─────────────────────────────── hook ─────────────────────────────── */

export function useColumnPinning(options: UseColumnPinningOptions): ColumnPinningState {
  const {
    columns,
    initialPins,
    tableId,
    view = null,
    floorInlineSize = TABLE_FLOOR_INLINE_SIZE_PX,
    maxPinnedFraction = DEFAULT_MAX_PINNED_FRACTION,
  } = options

  invariant(
    Number.isFinite(floorInlineSize) && floorInlineSize > 0,
    `useColumnPinning needs a positive floor inline size, got ${floorInlineSize}.`,
  )
  invariant(
    maxPinnedFraction > 0 && maxPinnedFraction <= 1,
    `useColumnPinning needs a pinned fraction in (0, 1], got ${maxPinnedFraction}.`,
  )

  const budget = floorInlineSize * maxPinnedFraction

  const fallbackStore = useMemo(() => createNullStore<readonly ColumnPin[]>(), [])
  const store =
    options.store ??
    (tableId === undefined
      ? fallbackStore
      : defaultUiStore(
          `${UI_STATE_KEYS.columnPins}.${tableId}.${view ?? 'all'}`,
          isUiColumnPinList,
        ))

  const [pins, setPins] = useState<readonly ColumnPin[]>(() => {
    const seed = store.read() ?? initialPins ?? []
    // Unknown and locked ids are dropped rather than thrown: a seed comes from
    // storage or from a screen's default, and neither can know today's columns.
    const pinnable = new Map(columns.map((column) => [column.id, column]))
    let accepted: readonly ColumnPin[] = []
    for (const pin of seed) {
      const column = pinnable.get(pin.id)
      if (!column || column.lockedEdge !== undefined) continue
      accepted = applyPin(columns, accepted, budget, pin.id, pin.edge).pins
    }
    return accepted
  })
  const [lastRefusal, setLastRefusal] = useState<PinRefusal | null>(null)

  const resolved = useMemo(() => resolve(columns, pins), [columns, pins])

  const commit = useCallback(
    (next: readonly ColumnPin[]) => {
      // `resolve` first, so neither state nor the store ever receives a stale id.
      const pruned = resolve(columns, next).pins
      setPins(pruned)
      store.write(pruned)
      setLastRefusal(null)
    },
    [columns, store],
  )

  const assertOperatorPinnable = useCallback(
    (id: string) => {
      const column = columns.find((entry) => entry.id === id)
      invariant(
        column !== undefined,
        `useColumnPinning: no column "${id}". Pinnable ids: ${
          columns
            .filter((entry) => entry.lockedEdge === undefined)
            .map((entry) => entry.id)
            .join(', ') || '(none)'
        }.`,
      )
      invariant(
        column.lockedEdge === undefined,
        `useColumnPinning: "${id}" is pinned by the component (§7.1) and is not the operator's to pin or unpin.`,
      )
    },
    [columns],
  )

  const canPin = useCallback(
    (id: string, edge: PinEdge = 'start'): PinRefusal | null => {
      assertOperatorPinnable(id)
      return applyPin(columns, resolved.pins, budget, id, edge).refusal
    },
    [assertOperatorPinnable, budget, columns, resolved.pins],
  )

  const pin = useCallback(
    (id: string, edge: PinEdge = 'start'): PinRefusal | null => {
      assertOperatorPinnable(id)
      const { pins: next, refusal } = applyPin(columns, resolved.pins, budget, id, edge)
      if (refusal) {
        setLastRefusal(refusal)
        return refusal
      }
      commit(next)
      return null
    },
    [assertOperatorPinnable, budget, columns, commit, resolved.pins],
  )

  const unpin = useCallback(
    (id: string) => {
      assertOperatorPinnable(id)
      if (!resolved.pins.some((entry) => entry.id === id)) return
      commit(resolved.pins.filter((entry) => entry.id !== id))
    },
    [assertOperatorPinnable, commit, resolved.pins],
  )

  const togglePin = useCallback(
    (id: string, edge: PinEdge = 'start'): PinRefusal | null => {
      assertOperatorPinnable(id)
      const current = resolved.pins.find((entry) => entry.id === id)
      if (current?.edge === edge) {
        unpin(id)
        return null
      }
      return pin(id, edge)
    },
    [assertOperatorPinnable, pin, resolved.pins, unpin],
  )

  const clearPins = useCallback(() => {
    if (resolved.pins.length === 0) return
    commit([])
  }, [commit, resolved.pins.length])

  const pinnedColumn = useCallback((id: string) => resolved.byId.get(id) ?? null, [resolved.byId])
  const isPinned = useCallback((id: string) => resolved.byId.has(id), [resolved.byId])
  const isLastPinned = useCallback(
    (id: string) => resolved.byId.get(id)?.isLast === true,
    [resolved.byId],
  )

  const pinnedInlineSize = resolved.lockedInlineSize + resolved.operatorInlineSize

  return {
    pins: resolved.pins,
    start: resolved.start,
    end: resolved.end,
    pinnedColumn,
    isPinned,
    isLastPinned,
    pin,
    unpin,
    togglePin,
    clearPins,
    canPin,
    lastRefusal,
    lockedInlineSize: resolved.lockedInlineSize,
    operatorInlineSize: resolved.operatorInlineSize,
    pinnedInlineSize,
    freeInlineSize: Math.max(0, floorInlineSize - pinnedInlineSize),
    budget,
  }
}
