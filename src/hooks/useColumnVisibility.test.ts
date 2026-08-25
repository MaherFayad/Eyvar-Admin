import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryStore, resetDefaultUiStores } from '@/lib/persistence'
import { useColumnPinning, type PinnableColumn } from './useColumnPinning'
import { useColumnVisibility, type VisibilityColumn } from './useColumnVisibility'

afterEach(() => resetDefaultUiStores())

interface Column extends VisibilityColumn, PinnableColumn {
  label: string
}

/** `01-table-controls.md` §7.5's columns popover, as data. */
const COLUMNS: readonly Column[] = [
  { id: 'select', label: '', width: 40, lockedEdge: 'start', alwaysVisible: true },
  { id: 'name', label: 'Captain', width: 220, lockedEdge: 'start', alwaysVisible: true },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'city', label: 'City', width: 140 },
  { id: 'trips', label: 'Trips', width: 100 },
  { id: 'balance', label: 'Earned (SAR)', width: 140, defaultHidden: true },
  { id: 'lastActive', label: 'Last active', width: 160 },
  { id: 'kebab', label: '', width: 56, lockedEdge: 'end', alwaysVisible: true },
]

const ids = (entries: readonly { id: string }[]): string[] => entries.map((entry) => entry.id)

const visibility = (
  options: Partial<Omit<Parameters<typeof useColumnVisibility<Column>>[0], 'columns'>> = {},
) => renderHook(() => useColumnVisibility<Column>({ columns: COLUMNS, ...options }))

describe('declared visibility', () => {
  it('starts with every column except the ones declared hidden', () => {
    const { result } = visibility()
    expect(result.current.hidden).toEqual(['balance'])
    expect(ids(result.current.visible)).toEqual([
      'select',
      'name',
      'status',
      'city',
      'trips',
      'lastActive',
      'kebab',
    ])
  })

  it('keeps declaration order, because order is not this hook’s to change (§7.5)', () => {
    const { result } = visibility()
    act(() => result.current.show('balance'))
    expect(ids(result.current.visible)).toEqual(ids(COLUMNS))
  })

  it('hands `visible` straight to useColumnPinning without a second column type', () => {
    const { result } = renderHook(() => {
      const shown = useColumnVisibility<Column>({ columns: COLUMNS })
      const pins = useColumnPinning({ columns: shown.visible })
      return { shown, pins }
    })
    act(() => void result.current.pins.pin('status'))
    expect(result.current.pins.isPinned('status')).toBe(true)
    // The declared-hidden column is not in the pin set at all.
    expect(() => result.current.pins.pin('balance')).toThrow(/no column "balance"/)
  })
})

describe('hiding and showing', () => {
  it('hides a column and reports it', () => {
    const { result } = visibility()
    act(() => result.current.hide('city'))
    expect(result.current.isVisible('city')).toBe(false)
    expect(result.current.hidden).toEqual(['city', 'balance'])
  })

  it('shows a hidden one back', () => {
    const { result } = visibility()
    act(() => result.current.show('balance'))
    expect(result.current.isVisible('balance')).toBe(true)
    expect(result.current.hidden).toEqual([])
  })

  it('toggles both ways', () => {
    const { result } = visibility()
    act(() => result.current.toggle('city'))
    expect(result.current.isVisible('city')).toBe(false)
    act(() => result.current.toggle('city'))
    expect(result.current.isVisible('city')).toBe(true)
  })

  it('is idempotent — hiding twice and showing twice change nothing', () => {
    const { result } = visibility()
    act(() => result.current.hide('city'))
    act(() => result.current.hide('city'))
    expect(result.current.hidden).toEqual(['city', 'balance'])
    act(() => result.current.show('trips'))
    expect(result.current.hidden).toEqual(['city', 'balance'])
  })

  it('restores declared visibility on reset — §7.5’s `Reset columns`', () => {
    const { result } = visibility()
    act(() => result.current.hide('city'))
    act(() => result.current.show('balance'))
    act(() => result.current.reset())
    expect(result.current.hidden).toEqual(['balance'])
  })
})

describe('the identity column is never hideable — §3.1 / §7.1', () => {
  it('reports it as not hideable, which is what disables the toggle', () => {
    const { result } = visibility()
    expect(result.current.isHideable('name')).toBe(false)
    expect(result.current.isHideable('select')).toBe(false)
    expect(result.current.isHideable('kebab')).toBe(false)
    expect(result.current.isHideable('city')).toBe(true)
  })

  it('throws if a call site hides it anyway', () => {
    const { result } = visibility()
    expect(() => result.current.hide('name')).toThrow(/cannot be hidden/)
    expect(() => result.current.toggle('name')).toThrow(/cannot be hidden/)
  })

  it('ignores a stored set that claims it was hidden', () => {
    const store = createMemoryStore<readonly string[]>()
    store.write(['name', 'city'])
    const { result } = visibility({ store })
    expect(result.current.isVisible('name')).toBe(true)
    expect(result.current.hidden).toEqual(['city'])
  })
})

describe('a table showing nothing is a dead UI', () => {
  const bare: Column[] = [
    { id: 'a', label: 'A', width: 100 },
    { id: 'b', label: 'B', width: 100 },
  ]

  it('refuses to hide the last visible column', () => {
    const { result } = renderHook(() => useColumnVisibility<Column>({ columns: bare }))
    act(() => result.current.hide('a'))
    expect(result.current.isHideable('b')).toBe(false)
    expect(() => result.current.hide('b')).toThrow(/last visible column/)
    expect(ids(result.current.visible)).toEqual(['b'])
  })

  it('makes it hideable again as soon as something else comes back', () => {
    const { result } = renderHook(() => useColumnVisibility<Column>({ columns: bare }))
    act(() => result.current.hide('a'))
    expect(result.current.isHideable('b')).toBe(false)
    act(() => result.current.show('a'))
    expect(result.current.isHideable('b')).toBe(true)
  })
})

describe('unknown and stale ids', () => {
  it('throws when a call site names a column that does not exist', () => {
    const { result } = visibility()
    expect(() => result.current.hide('nope')).toThrow(/no column "nope"/)
    expect(() => result.current.show('nope')).toThrow(/no column "nope"/)
  })

  it('reports an unknown id as neither visible nor hideable rather than throwing on a query', () => {
    const { result } = visibility()
    expect(result.current.isVisible('nope')).toBe(false)
    expect(result.current.isHideable('nope')).toBe(false)
  })

  it('drops a stale id out of a restored set', () => {
    const store = createMemoryStore<readonly string[]>()
    store.write(['city', 'a-column-that-was-retired'])
    const { result } = visibility({ store })
    expect(result.current.hidden).toEqual(['city'])
  })

  it('drops it from the store on the next change, so it cannot accumulate', () => {
    const store = createMemoryStore<readonly string[]>()
    store.write(['city', 'a-column-that-was-retired'])
    const { result } = visibility({ store })
    act(() => result.current.hide('trips'))
    expect(store.read()).toEqual(['city', 'trips'])
  })
})

describe('needsColumnsControl — §3.1 widened by §7.5', () => {
  it('is true when any column is hideable, even under six columns', () => {
    const small: Column[] = [
      { id: 'name', label: 'Captain', width: 220, alwaysVisible: true },
      { id: 'city', label: 'City', width: 140 },
    ]
    const { result } = renderHook(() => useColumnVisibility<Column>({ columns: small }))
    expect(result.current.needsColumnsControl).toBe(true)
  })

  it('is false when nothing is hideable and there are six or fewer', () => {
    const fixed: Column[] = [
      { id: 'a', label: 'A', width: 100, alwaysVisible: true },
      { id: 'b', label: 'B', width: 100, alwaysVisible: true },
    ]
    const { result } = renderHook(() => useColumnVisibility<Column>({ columns: fixed }))
    expect(result.current.needsColumnsControl).toBe(false)
  })

  it('is true past six columns whatever they declare', () => {
    const many: Column[] = Array.from({ length: 7 }, (_, index) => ({
      id: `c${index}`,
      label: `C${index}`,
      width: 100,
      alwaysVisible: true,
    }))
    const { result } = renderHook(() => useColumnVisibility<Column>({ columns: many }))
    expect(result.current.needsColumnsControl).toBe(true)
  })
})

describe('an empty column list', () => {
  it('resolves to nothing rather than throwing', () => {
    const { result } = renderHook(() => useColumnVisibility<Column>({ columns: [] }))
    expect(result.current.visible).toEqual([])
    expect(result.current.hidden).toEqual([])
    expect(result.current.needsColumnsControl).toBe(false)
    expect(() => result.current.reset()).not.toThrow()
    expect(() => result.current.hide('anything')).toThrow(/\(none\)/)
  })
})

describe('persistence — the same Q1 seam, per table and per view', () => {
  it('survives a remount when the table is named', () => {
    const first = renderHook(() => useColumnVisibility<Column>({ columns: COLUMNS, tableId: 'drivers' }))
    act(() => first.result.current.hide('city'))
    first.unmount()

    const second = renderHook(() =>
      useColumnVisibility<Column>({ columns: COLUMNS, tableId: 'drivers' }),
    )
    expect(second.result.current.hidden).toEqual(['city', 'balance'])
  })

  it('keeps two views of the same table apart', () => {
    const all = renderHook(() =>
      useColumnVisibility<Column>({ columns: COLUMNS, tableId: 'drivers', view: null }),
    )
    act(() => all.result.current.hide('city'))

    const atRisk = renderHook(() =>
      useColumnVisibility<Column>({ columns: COLUMNS, tableId: 'drivers', view: 'at-risk' }),
    )
    expect(atRisk.result.current.hidden).toEqual(['balance'])
  })

  it('lives only for the mount when the table is not named — the AC-33 gap, asserted', () => {
    const first = visibility()
    act(() => first.result.current.hide('city'))
    first.unmount()

    const second = visibility()
    expect(second.result.current.hidden).toEqual(['balance'])
  })
})

describe('Arabic', () => {
  it('is direction-blind — the same set, the same order, under dir=rtl', () => {
    const shape = (): string => {
      const { result, unmount } = visibility()
      act(() => result.current.hide('city'))
      const json = JSON.stringify({ visible: ids(result.current.visible), hidden: result.current.hidden })
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

    expect(rtl).toBe(ltr)
  })
})
