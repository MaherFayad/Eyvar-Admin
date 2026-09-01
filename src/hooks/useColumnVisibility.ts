/**
 * Which columns a table is currently showing, and in declaration order.
 *
 * This exists because `useColumnPinning` takes *"the currently visible columns"*
 * and, until now, nothing produced that list — the pin budget is meaningless
 * against a column set nobody can define. Ownership was open; it is settled here,
 * in `src/hooks`, and not as `DataTable` local state, for three reasons:
 *
 * 1. It is state with rules, not markup. `DESIGN.md` §3.1: *"Which columns are
 *    visible and in what order is per-view state"*, and *"Tables with more than
 *    ~6 columns MUST offer a column-visibility control"* — one rule, every index.
 * 2. The rules are the sort that go wrong quietly. §3.1 makes the identity column
 *    *"never hideable"* — *"you cannot hide or scroll away the only thing that
 *    navigates"* (`01-table-controls.md` §7.1) — and a table with every column
 *    hidden is a dead UI. Both are enforced here, once, rather than in each
 *    `DataTable`.
 * 3. It has to agree with `useColumnPinning` about what a column is and where the
 *    per-view key lives. Two owners is two answers.
 *
 * Compose them, in this order:
 *
 * ```ts
 * const visibility = useColumnVisibility({ columns, tableId, view })
 * const pins = useColumnPinning({ columns: visibility.visible, tableId, view })
 * ```
 *
 * Hiding a pinned column therefore drops its pin, which is what
 * `01-table-controls.md` §7.5 draws: *"hidden column: pin toggle disabled"*.
 *
 * **Not here:** column *order*. §7.5 is explicit — *"No drag handle and no
 * reordering […] recorded as out of scope, not forgotten"* — and order comes from
 * the declaration, so adding a second source of it is the drift §7.1 refuses.
 *
 * Persistence is the same Q1 seam as everywhere else (`src/lib/persistence.ts`):
 * in memory, per table and per view, surviving a route change and **not** a
 * reload. That gap is recorded, not hidden (AC-33).
 */

import { useCallback, useMemo, useState } from 'react'
import { invariant } from '@/lib/invariant'
import { UI_STATE_KEYS, createNullStore, defaultUiStore, type UiStateStore } from '@/lib/persistence'
/* D16 — see `useLanguage.ts`: the validator is what makes the store cached
   rather than in-memory, and it is required because caching without one means
   casting an unvalidated `JSON.parse` result to `T`. */
import { isUiStringList } from '@/data/clients/preferences'

/**
 * The minimum a column must declare. Generic, so `DataTable` passes its own
 * richer column objects straight through and gets them back — there is no second
 * column type to keep in sync.
 */
export interface VisibilityColumn {
  readonly id: string
  /** Declared hidden. `Reset columns` (§7.5) restores exactly this. */
  readonly defaultHidden?: boolean
  /**
   * §3.1 / §7.1: the identity column, and anything else the record cannot be read
   * without. Hiding it is a compile-time-legal, runtime-refused mistake.
   */
  readonly alwaysVisible?: boolean
}

export interface UseColumnVisibilityOptions<T extends VisibilityColumn> {
  /** Every column the table declares, in declaration order. */
  columns: readonly T[]
  /** Persistence key. Omit and visibility lives for the life of the mount. */
  tableId?: string
  /** §7.6: column state is per table **and per view**. Part of the key. */
  view?: string | null
  /** Test and Q1 seam. Holds the **hidden** ids. */
  store?: UiStateStore<readonly string[]>
}

export interface ColumnVisibilityState<T extends VisibilityColumn> {
  /** The columns to render, in declaration order. Hand this to `useColumnPinning`. */
  readonly visible: readonly T[]
  /** Hidden column ids, in declaration order. Stale ids already dropped. */
  readonly hidden: readonly string[]
  isVisible: (id: string) => boolean
  /**
   * Whether the operator may hide it **right now**: `false` for an
   * `alwaysVisible` column and for the last visible one. §7.5 renders the toggle
   * disabled on exactly this.
   */
  isHideable: (id: string) => boolean
  /** Throws on an unknown id, or one `isHideable` says no to. */
  hide: (id: string) => void
  /** Throws on an unknown id. Showing an already-visible column is a no-op. */
  show: (id: string) => void
  toggle: (id: string) => void
  /** §7.5's `Reset columns`: back to declared visibility. */
  reset: () => void
  /**
   * §3.1's *"more than ~6 columns MUST offer a column-visibility control"*,
   * widened by §7.5 to *"or any column is pinnable or hideable"*. True when the
   * control must render.
   */
  readonly needsColumnsControl: boolean
}

function declaredHidden<T extends VisibilityColumn>(columns: readonly T[]): string[] {
  return columns.filter((column) => column.defaultHidden === true).map((column) => column.id)
}

/** §3.1's threshold, quoted rather than guessed at. */
const COLUMNS_CONTROL_THRESHOLD = 6

export function useColumnVisibility<T extends VisibilityColumn>(
  options: UseColumnVisibilityOptions<T>,
): ColumnVisibilityState<T> {
  const { columns, tableId, view = null } = options

  const fallbackStore = useMemo(() => createNullStore<readonly string[]>(), [])
  const store =
    options.store ??
    (tableId === undefined
      ? fallbackStore
      : defaultUiStore(
          `${UI_STATE_KEYS.columnVisibility}.${tableId}.${view ?? 'all'}`,
          isUiStringList,
        ))

  const [hiddenIds, setHiddenIds] = useState<readonly string[]>(
    () => store.read() ?? declaredHidden(columns),
  )

  /**
   * Stale ids are dropped, and an `alwaysVisible` column can never be hidden even
   * if a stored set says it was — a column can gain `alwaysVisible` between
   * sessions, and the identity column must win.
   */
  const hidden = useMemo(
    () =>
      columns
        .filter((column) => column.alwaysVisible !== true && hiddenIds.includes(column.id))
        .map((column) => column.id),
    [columns, hiddenIds],
  )

  const visible = useMemo(
    () => columns.filter((column) => !hidden.includes(column.id)),
    [columns, hidden],
  )

  const commit = useCallback(
    (next: readonly string[]) => {
      setHiddenIds(next)
      store.write(next)
    },
    [store],
  )

  const columnFor = useCallback(
    (id: string): T => {
      const column = columns.find((entry) => entry.id === id)
      invariant(
        column !== undefined,
        `useColumnVisibility: no column "${id}". Declared ids: ${columns.map((c) => c.id).join(', ') || '(none)'}.`,
      )
      return column
    },
    [columns],
  )

  const isVisible = useCallback((id: string) => visible.some((column) => column.id === id), [visible])

  const isHideable = useCallback(
    (id: string) => {
      const column = columns.find((entry) => entry.id === id)
      if (column === undefined || column.alwaysVisible === true) return false
      // A table showing nothing is a dead UI. The last visible column stays.
      if (visible.length <= 1 && isVisible(id)) return false
      return true
    },
    [columns, isVisible, visible.length],
  )

  const hide = useCallback(
    (id: string) => {
      columnFor(id)
      invariant(
        isHideable(id),
        `useColumnVisibility: "${id}" cannot be hidden — it is the record's identity, or the last visible column. §7.5 renders its toggle disabled.`,
      )
      if (!isVisible(id)) return
      commit([...hidden, id])
    },
    [columnFor, commit, hidden, isHideable, isVisible],
  )

  const show = useCallback(
    (id: string) => {
      columnFor(id)
      if (isVisible(id)) return
      commit(hidden.filter((entry) => entry !== id))
    },
    [columnFor, commit, hidden, isVisible],
  )

  const toggle = useCallback(
    (id: string) => {
      if (isVisible(id)) hide(id)
      else show(id)
    },
    [hide, isVisible, show],
  )

  const reset = useCallback(() => commit(declaredHidden(columns)), [columns, commit])

  const needsColumnsControl =
    columns.length > COLUMNS_CONTROL_THRESHOLD ||
    columns.some((column) => column.alwaysVisible !== true)

  return {
    visible,
    hidden,
    isVisible,
    isHideable,
    hide,
    show,
    toggle,
    reset,
    needsColumnsControl,
  }
}
