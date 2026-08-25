import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryStore, resetDefaultUiStores } from '@/lib/persistence'
import { useIndexTable } from './useIndexTable'
import {
  DEFAULT_MAX_PINNED_FRACTION,
  TABLE_FLOOR_INLINE_SIZE_PX,
  useColumnPinning,
  type ColumnPin,
  type PinnableColumn,
  type UseColumnPinningOptions,
} from './useColumnPinning'

afterEach(() => resetDefaultUiStores())

/**
 * The drivers index as `01-table-controls.md` §7.1 draws it: an implicit
 * inline-start block of checkbox + identity (40 + 220 = 260, §7.2's own number),
 * an implicit inline-end kebab, and five operator-pinnable columns.
 *
 * Budget at the floor is 976 × 0.5 = 488, less the 260 implicit block = **228
 * for operator pins** — §7.2's arithmetic table, to the pixel.
 */
const COLUMNS: readonly PinnableColumn[] = [
  { id: 'select', width: 40, lockedEdge: 'start' },
  { id: 'name', width: 220, lockedEdge: 'start' },
  { id: 'status', width: 120 },
  { id: 'city', width: 140 },
  { id: 'trips', width: 100 },
  { id: 'balance', width: 140 },
  { id: 'lastActive', width: 160 },
  { id: 'kebab', width: 56, lockedEdge: 'end' },
]

type ExtraOptions = Partial<Omit<UseColumnPinningOptions, 'columns'>>

const pinning = (options: ExtraOptions = {}) =>
  renderHook(() => useColumnPinning({ columns: COLUMNS, ...options }))

const ids = (entries: readonly { id: string }[]): string[] => entries.map((entry) => entry.id)

describe('the implicit block — §7.1, the component’s, never the operator’s', () => {
  it('is pinned before the operator does anything, and is not an operator pin', () => {
    const { result } = pinning()
    expect(ids(result.current.start)).toEqual(['select', 'name'])
    expect(ids(result.current.end)).toEqual(['kebab'])
    expect(result.current.pins).toEqual([])
    expect(result.current.lockedInlineSize).toBe(316)
    expect(result.current.operatorInlineSize).toBe(0)
  })

  it('lays the identity column out after the checkbox', () => {
    const { result } = pinning()
    expect(result.current.pinnedColumn('select')).toMatchObject({ offset: 0, locked: true })
    expect(result.current.pinnedColumn('name')).toMatchObject({
      offset: 40,
      locked: true,
      isLast: true,
    })
  })

  it('puts the kebab hard against the inline-end edge — the R5a marker’s stationary host', () => {
    const { result } = pinning()
    expect(result.current.pinnedColumn('kebab')).toMatchObject({
      offset: 0,
      isLast: true,
      locked: true,
      insetProperty: 'insetInlineEnd',
    })
  })

  it('refuses to let the operator pin or unpin it, by throwing', () => {
    const { result } = pinning()
    expect(() => result.current.pin('name')).toThrow(/pinned by the component/)
    expect(() => result.current.unpin('name')).toThrow(/pinned by the component/)
    expect(() => result.current.togglePin('kebab', 'end')).toThrow(/pinned by the component/)
    expect(() => result.current.canPin('select')).toThrow(/pinned by the component/)
  })

  it('survives clearPins — §7.5’s Reset columns clears the operator’s pins only', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status'))
    act(() => result.current.clearPins())
    expect(result.current.pins).toEqual([])
    expect(ids(result.current.start)).toEqual(['select', 'name'])
    expect(ids(result.current.end)).toEqual(['kebab'])
  })
})

describe('order — declaration order, never click order (§7.1)', () => {
  it('renders in declaration order however the operator clicked', () => {
    const { result } = pinning({ floorInlineSize: 2000 })
    // `trips` is declared after `city`, but was pinned first. It stays after.
    act(() => void result.current.pin('trips'))
    act(() => void result.current.pin('city'))

    expect(ids(result.current.pins)).toEqual(['city', 'trips'])
    expect(ids(result.current.start)).toEqual(['select', 'name', 'city', 'trips'])
  })

  it('accumulates offsets across the locked block and the operator block as one region', () => {
    const { result } = pinning({ floorInlineSize: 2000 })
    act(() => void result.current.pin('trips'))
    act(() => void result.current.pin('city'))

    expect(result.current.start.map((c) => c.offset)).toEqual([0, 40, 260, 400])
    expect(result.current.operatorInlineSize).toBe(240)
  })

  it('marks exactly one column per edge as the boundary — §7.3’s hairline', () => {
    const { result } = pinning({ floorInlineSize: 2000 })
    act(() => void result.current.pin('trips'))
    act(() => void result.current.pin('city'))

    expect(result.current.isLastPinned('trips')).toBe(true)
    expect(result.current.isLastPinned('city')).toBe(false)
    expect(result.current.isLastPinned('name')).toBe(false)
    expect(result.current.start.filter((c) => c.isLast)).toHaveLength(1)
    expect(result.current.end.filter((c) => c.isLast)).toHaveLength(1)
  })
})

describe('the budget reproduces §7.2’s arithmetic (976 floor · 488 budget · 260 implicit · 228 left)', () => {
  it('states the floor and the budget it was built from', () => {
    const { result } = pinning()
    expect(TABLE_FLOOR_INLINE_SIZE_PX).toBe(976)
    expect(result.current.budget).toBe(488)
    expect(TABLE_FLOOR_INLINE_SIZE_PX * DEFAULT_MAX_PINNED_FRACTION).toBe(488)
  })

  it('fits one typical column, and refuses the second', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status')) // 260 + 120 = 380

    let refusal: unknown = null
    act(() => {
      refusal = result.current.pin('city') // 380 + 140 = 520 > 488
    })

    expect(ids(result.current.pins)).toEqual(['status'])
    expect(refusal).toEqual({
      columnId: 'city',
      edge: 'start',
      reason: 'exceeds-budget',
      wouldBe: 520,
      budget: 488,
    })
  })

  it('fits two narrow ones — §7.2’s "one typical column, or two narrow ones"', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status')) // 380
    act(() => void result.current.pin('trips')) // 480 <= 488
    expect(ids(result.current.pins)).toEqual(['status', 'trips'])
    expect(result.current.operatorInlineSize).toBe(220)
  })

  it('has exactly one refusal reason', () => {
    const { result } = pinning()
    act(() => void result.current.pin('lastActive')) // 260 + 160 = 420
    const refusal = result.current.canPin('balance') // 420 + 140 = 560
    expect(refusal?.reason).toBe('exceeds-budget')
  })

  it('leaves the state and the frozen region untouched when it refuses', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status'))
    const before = result.current.pins
    act(() => void result.current.pin('city'))

    expect(result.current.pins).toEqual(before)
    expect(result.current.isPinned('city')).toBe(false)
    expect(result.current.operatorInlineSize).toBe(120)
  })

  it('exposes the refusal, then clears it on the next accepted change', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status'))
    act(() => void result.current.pin('city'))
    expect(result.current.lastRefusal).toMatchObject({
      columnId: 'city',
      reason: 'exceeds-budget',
    })

    act(() => result.current.unpin('status'))
    expect(result.current.lastRefusal).toBeNull()
  })

  it('permits zero operator pins when the implicit block alone eats the budget', () => {
    const wide: PinnableColumn[] = [
      { id: 'name', width: 600, lockedEdge: 'start' },
      { id: 'status', width: 120 },
    ]
    const { result } = renderHook(() => useColumnPinning({ columns: wide }))
    expect(result.current.canPin('status')).toMatchObject({ reason: 'exceeds-budget' })
    expect(ids(result.current.start)).toEqual(['name'])
  })

  it('accepts a pin that lands exactly on the budget', () => {
    const columns: PinnableColumn[] = [
      { id: 'select', width: 40, lockedEdge: 'start' },
      { id: 'name', width: 220, lockedEdge: 'start' },
      { id: 'exact', width: 228 }, // 260 + 228 = 488
    ]
    const { result } = renderHook(() => useColumnPinning({ columns }))
    let refusal: unknown = 'unset'
    act(() => {
      refusal = result.current.pin('exact')
    })
    expect(refusal).toBeNull()
    expect(result.current.isPinned('exact')).toBe(true)
  })

  it('always leaves something to scroll, however many pins are attempted', () => {
    const { result } = pinning()
    for (const column of COLUMNS) {
      if (column.lockedEdge !== undefined) continue
      act(() => void result.current.pin(column.id))
    }
    expect(result.current.pinnedInlineSize).toBeLessThan(TABLE_FLOOR_INLINE_SIZE_PX)
    expect(result.current.freeInlineSize).toBeGreaterThan(0)
  })

  it('lets a full-bleed bulk grid state a wider floor — §2.5, the only sanctioned override', () => {
    const { result } = pinning({ floorInlineSize: 1280 })
    expect(result.current.budget).toBe(640)
    act(() => void result.current.pin('status')) // 380
    let refusal: unknown = 'unset'
    act(() => {
      refusal = result.current.pin('city') // 520 <= 640
    })
    expect(refusal).toBeNull()
  })

  it('does not move a pin when the viewport changes, because the budget is a floor (§7.2)', () => {
    // There is no live measurement to change. Re-rendering with a different
    // floor is the only way to reach the budget, and a screen never does that.
    const { result, rerender } = renderHook(
      ({ floorInlineSize }: { floorInlineSize: number }) =>
        useColumnPinning({ columns: COLUMNS, floorInlineSize }),
      { initialProps: { floorInlineSize: TABLE_FLOOR_INLINE_SIZE_PX } },
    )
    act(() => void result.current.pin('status'))
    rerender({ floorInlineSize: 4000 })
    expect(ids(result.current.pins)).toEqual(['status'])
    rerender({ floorInlineSize: TABLE_FLOOR_INLINE_SIZE_PX })
    expect(ids(result.current.pins)).toEqual(['status'])
    expect(result.current.isPinned('status')).toBe(true)
  })
})

describe('logical only — the Arabic guarantee, §8.2', () => {
  it('hands over a logical inset property and never a physical one', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status'))

    expect(result.current.pinnedColumn('status')?.insetProperty).toBe('insetInlineStart')
    expect(result.current.pinnedColumn('kebab')?.insetProperty).toBe('insetInlineEnd')

    const serialised = JSON.stringify([...result.current.start, ...result.current.end])
    expect(serialised).not.toMatch(/left|right/i)
  })

  it('produces identical output under dir=rtl, because it never reads direction', () => {
    const shape = (): string => {
      const { result, unmount } = pinning()
      act(() => void result.current.pin('status'))
      act(() => void result.current.pin('trips'))
      const json = JSON.stringify({ start: result.current.start, end: result.current.end })
      unmount()
      return json
    }

    document.documentElement.setAttribute('dir', 'ltr')
    const ltr = shape()

    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')
    const rtl = shape()

    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('lang')
    // §8.2: "which columns are pinned: unchanged. Their order within the pinned
    // block: unchanged." Only the physical side moves, and the browser does that.
    expect(rtl).toBe(ltr)
  })
})

describe('duplicates and edge swaps are well defined', () => {
  it('treats re-pinning to the same edge as an accepted no-op', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status'))
    const before = result.current.pins
    let refusal: unknown = 'unset'
    act(() => {
      refusal = result.current.pin('status')
    })

    expect(refusal).toBeNull()
    expect(result.current.pins).toEqual(before)
    expect(result.current.pins).toHaveLength(1)
  })

  it('moves a column across edges rather than pinning it twice', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status'))
    act(() => void result.current.pin('status', 'end'))

    expect(result.current.pins).toEqual<ColumnPin[]>([{ id: 'status', edge: 'end' }])
    expect(ids(result.current.start)).toEqual(['select', 'name'])
    // The locked kebab stays hard against the edge; the operator's column sits inside it.
    expect(ids(result.current.end)).toEqual(['status', 'kebab'])
    expect(result.current.pinnedColumn('kebab')?.offset).toBe(0)
    expect(result.current.pinnedColumn('status')?.offset).toBe(56)
    expect(result.current.isLastPinned('status')).toBe(true)
    expect(result.current.isLastPinned('kebab')).toBe(false)
  })

  it('never charges a moving column its own width twice', () => {
    const columns: PinnableColumn[] = [
      { id: 'a', width: 200 },
      { id: 'b', width: 200 },
    ]
    // Budget 400: two 200 px columns fill it exactly. A move must stay at 400.
    const { result } = renderHook(() => useColumnPinning({ columns, floorInlineSize: 800 }))
    act(() => void result.current.pin('a'))
    act(() => void result.current.pin('b'))
    expect(result.current.operatorInlineSize).toBe(400)

    let refusal: unknown = 'unset'
    act(() => {
      refusal = result.current.pin('b', 'end')
    })
    expect(refusal).toBeNull()
    expect(result.current.operatorInlineSize).toBe(400)
  })
})

describe('togglePin', () => {
  it('pins an unpinned column', () => {
    const { result } = pinning()
    act(() => void result.current.togglePin('status'))
    expect(result.current.isPinned('status')).toBe(true)
  })

  it('unpins when toggled at the edge it already sits on', () => {
    const { result } = pinning()
    act(() => void result.current.togglePin('status'))
    act(() => void result.current.togglePin('status'))
    expect(result.current.isPinned('status')).toBe(false)
    expect(result.current.pins).toEqual([])
  })

  it('moves — never unpins — when toggled at the other edge', () => {
    const { result } = pinning()
    act(() => void result.current.togglePin('status'))
    act(() => void result.current.togglePin('status', 'end'))
    expect(result.current.pins).toEqual<ColumnPin[]>([{ id: 'status', edge: 'end' }])
  })
})

describe('unpin and clearPins', () => {
  it('removes one pin and re-lays the survivors', () => {
    const { result } = pinning({ floorInlineSize: 2000 })
    act(() => void result.current.pin('status'))
    act(() => void result.current.pin('city'))
    act(() => result.current.unpin('status'))

    expect(ids(result.current.start)).toEqual(['select', 'name', 'city'])
    expect(result.current.pinnedColumn('city')).toMatchObject({ offset: 260, isLast: true })
  })

  it('is a harmless no-op for a column that is pinnable but not pinned', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status'))
    act(() => result.current.unpin('city'))
    expect(result.current.pins).toHaveLength(1)
  })

  it('clears every operator pin at once', () => {
    const { result } = pinning({ floorInlineSize: 2000 })
    act(() => void result.current.pin('status'))
    act(() => void result.current.pin('city'))
    act(() => result.current.clearPins())

    expect(result.current.pins).toEqual([])
    expect(result.current.operatorInlineSize).toBe(0)
  })
})

describe('canPin — the dry run §7.2 gates the disabled menu item on', () => {
  it('agrees with pin, and changes nothing', () => {
    const { result } = pinning()
    act(() => void result.current.pin('status'))

    expect(result.current.canPin('city')).toMatchObject({
      reason: 'exceeds-budget',
      wouldBe: 520,
    })
    expect(result.current.isPinned('city')).toBe(false)
    expect(result.current.lastRefusal).toBeNull()

    expect(result.current.canPin('trips')).toBeNull()
    expect(result.current.isPinned('trips')).toBe(false)
  })
})

describe('unknown and stale ids', () => {
  it('throws when a call site pins an id that is not a column, naming the pinnable ones', () => {
    const { result } = pinning()
    expect(() => result.current.pin('not-a-column')).toThrow(/no column "not-a-column"/)
    expect(() => result.current.pin('not-a-column')).toThrow(/status, city, trips/)
    expect(() => result.current.togglePin('not-a-column')).toThrow(/no column/)
    expect(() => result.current.canPin('not-a-column')).toThrow(/no column/)
    expect(() => result.current.unpin('not-a-column')).toThrow(/no column/)
  })

  it('says `(none)` when there is nothing pinnable at all', () => {
    const { result } = renderHook(() =>
      useColumnPinning({ columns: [{ id: 'name', width: 220, lockedEdge: 'start' }] }),
    )
    expect(() => result.current.pin('status')).toThrow(/\(none\)/)
  })

  it('drops a stale id out of a restored set instead of throwing', () => {
    const store = createMemoryStore<readonly ColumnPin[]>()
    store.write([
      { id: 'status', edge: 'start' },
      { id: 'a-column-that-was-retired', edge: 'start' },
    ])
    const { result } = pinning({ store })
    expect(result.current.pins).toEqual<ColumnPin[]>([{ id: 'status', edge: 'start' }])
  })

  it('drops a restored pin on a column the component now locks', () => {
    const store = createMemoryStore<readonly ColumnPin[]>()
    store.write([{ id: 'name', edge: 'start' }])
    const { result } = pinning({ store })
    expect(result.current.pins).toEqual([])
    expect(result.current.isPinned('name')).toBe(true) // locked, not operator state
  })

  it('drops the pin when the columns popover hides the column, and never writes it back', () => {
    const store = createMemoryStore<readonly ColumnPin[]>()
    const { result, rerender } = renderHook(
      ({ columns }: { columns: readonly PinnableColumn[] }) =>
        useColumnPinning({ columns, store }),
      { initialProps: { columns: COLUMNS } },
    )
    act(() => void result.current.pin('status'))

    rerender({ columns: COLUMNS.filter((column) => column.id !== 'status') })
    expect(result.current.pins).toEqual([])
    expect(result.current.operatorInlineSize).toBe(0)

    act(() => void result.current.pin('trips'))
    expect(store.read()).toEqual<ColumnPin[]>([{ id: 'trips', edge: 'start' }])
  })

  it('applies the budget to a restored set too, dropping what would not fit', () => {
    const store = createMemoryStore<readonly ColumnPin[]>()
    store.write([
      { id: 'status', edge: 'start' }, // 380
      { id: 'city', edge: 'start' }, // 520 — refused
      { id: 'trips', edge: 'start' }, // 480 — fits
    ])
    const { result } = pinning({ store })

    expect(ids(result.current.pins)).toEqual(['status', 'trips'])
    expect(result.current.operatorInlineSize).toBe(220)
  })

  it('deduplicates a restored set that names the same column twice, last mention winning', () => {
    const store = createMemoryStore<readonly ColumnPin[]>()
    store.write([
      { id: 'status', edge: 'start' },
      { id: 'status', edge: 'end' },
    ])
    const { result } = pinning({ store })
    expect(result.current.pins).toEqual<ColumnPin[]>([{ id: 'status', edge: 'end' }])
  })
})

describe('an empty column list', () => {
  it('resolves to nothing rather than throwing', () => {
    const { result } = renderHook(() => useColumnPinning({ columns: [] }))
    expect(result.current.pins).toEqual([])
    expect(result.current.start).toEqual([])
    expect(result.current.end).toEqual([])
    expect(result.current.pinnedInlineSize).toBe(0)
    expect(() => result.current.clearPins()).not.toThrow()
  })
})

describe('bad inputs', () => {
  it('refuses to pin a column with no declared width', () => {
    const { result } = renderHook(() => useColumnPinning({ columns: [{ id: 'auto', width: 0 }] }))
    expect(() => result.current.pin('auto')).toThrow(/positive width/)
  })

  it('refuses a locked column with no declared width, on the very first render', () => {
    expect(() =>
      renderHook(() =>
        useColumnPinning({ columns: [{ id: 'auto', width: 0, lockedEdge: 'start' }] }),
      ),
    ).toThrow(/positive width/)
  })

  it('refuses a non-positive floor or an out-of-range fraction', () => {
    expect(() => renderHook(() => useColumnPinning({ columns: [], floorInlineSize: 0 }))).toThrow(
      /positive floor/,
    )
    expect(() => renderHook(() => useColumnPinning({ columns: [], maxPinnedFraction: 0 }))).toThrow(
      /fraction/,
    )
    expect(() =>
      renderHook(() => useColumnPinning({ columns: [], maxPinnedFraction: 1.5 })),
    ).toThrow(/fraction/)
  })
})

describe('persistence — the Q1 seam, in memory, per table and per view (§7.6)', () => {
  it('survives a remount when the table is named', () => {
    const first = renderHook(() => useColumnPinning({ columns: COLUMNS, tableId: 'drivers' }))
    act(() => void first.result.current.pin('status'))
    first.unmount()

    const second = renderHook(() => useColumnPinning({ columns: COLUMNS, tableId: 'drivers' }))
    expect(second.result.current.pins).toEqual<ColumnPin[]>([{ id: 'status', edge: 'start' }])
  })

  it('keeps two views of the same table apart — §9.1 makes column state per-view', () => {
    const all = renderHook(() =>
      useColumnPinning({ columns: COLUMNS, tableId: 'drivers', view: null }),
    )
    act(() => void all.result.current.pin('status'))

    const atRisk = renderHook(() =>
      useColumnPinning({ columns: COLUMNS, tableId: 'drivers', view: 'at-risk' }),
    )
    expect(atRisk.result.current.pins).toEqual([])
  })

  it('keeps two differently named tables apart', () => {
    const drivers = renderHook(() => useColumnPinning({ columns: COLUMNS, tableId: 'drivers' }))
    act(() => void drivers.result.current.pin('status'))

    const trips = renderHook(() => useColumnPinning({ columns: COLUMNS, tableId: 'trips' }))
    expect(trips.result.current.pins).toEqual([])
  })

  it('lives only for the mount when the table is not named — the AC-33 gap, asserted', () => {
    const first = pinning()
    act(() => void first.result.current.pin('status'))
    first.unmount()

    const second = pinning()
    expect(second.result.current.pins).toEqual([])
  })

  it('seeds from initialPins when nothing is stored, and prefers the store when there is', () => {
    const seeded = pinning({ initialPins: [{ id: 'status', edge: 'start' }] })
    expect(seeded.result.current.pins).toEqual<ColumnPin[]>([{ id: 'status', edge: 'start' }])

    const store = createMemoryStore<readonly ColumnPin[]>()
    store.write([{ id: 'trips', edge: 'start' }])
    const restored = pinning({ store, initialPins: [{ id: 'status', edge: 'start' }] })
    expect(restored.result.current.pins).toEqual<ColumnPin[]>([{ id: 'trips', edge: 'start' }])
  })

  it('stores §7.6’s shape — { id, edge }, logical, with no render order in it', () => {
    const store = createMemoryStore<readonly ColumnPin[]>()
    const { result } = pinning({ store })
    act(() => void result.current.pin('trips'))

    expect(store.read()).toEqual([{ id: 'trips', edge: 'start' }])
    expect(JSON.stringify(store.read())).not.toMatch(/left|right|offset|index/i)
  })
})

describe('composition with useIndexTable — pinning is view state, not a request parameter', () => {
  it('never reaches QueryParams', () => {
    const { result } = renderHook(() => {
      const table = useIndexTable<{ id: string }>({
        mode: 'index',
        getRowId: (row) => row.id,
        searchDebounceMs: 0,
      })
      const pins = useColumnPinning({ columns: COLUMNS })
      return { table, pins }
    })

    act(() => void result.current.pins.pin('status'))

    const params = result.current.table.params as unknown as Record<string, unknown>
    for (const member of ['pins', 'pinned', 'columnPins', 'start', 'end']) {
      expect(member in params).toBe(false)
    }
    expect(Object.keys(params).sort()).toEqual(['filters', 'page', 'pageSize', 'q', 'sort', 'view'])
  })

  it('lets a ledger pin a column without gaining a sort — §8.3.3 / AC-48 is untouched', () => {
    const { result } = renderHook(() => {
      const table = useIndexTable({ mode: 'ledger', searchDebounceMs: 0 })
      const pins = useColumnPinning({ columns: COLUMNS })
      return { table, pins }
    })

    act(() => void result.current.pins.pin('status'))
    expect(result.current.pins.isPinned('status')).toBe(true)
    expect(result.current.table.canSort).toBe(false)
    expect(result.current.table.params.sort).toBeNull()
    expect('setSortField' in (result.current.table as unknown as Record<string, unknown>)).toBe(
      false,
    )
  })
})
