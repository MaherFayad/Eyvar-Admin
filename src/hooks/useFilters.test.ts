import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'
import { hasActiveFilters, useFilters, withFilter, withoutFilter } from './useFilters'
import type { FilterSpec } from '@/data/types/common'

/**
 * The chip algebra is pure and exported because two stores now apply it — this
 * hook's `useState` and the URL (`useUrlTableState`, P1-T1). Tested here rather
 * than only through a store, so a change to the rule fails on the rule.
 */
describe('the chip algebra', () => {
  const riyadh: FilterSpec = { field: 'city', op: 'eq', value: 'Riyadh' }
  const jeddah: FilterSpec = { field: 'city', op: 'eq', value: 'Jeddah' }
  const active: FilterSpec = { field: 'status', op: 'eq', value: 'active' }

  it('replaces the chip for a field instead of adding a second one (§9.1)', () => {
    expect(withFilter([riyadh], jeddah)).toEqual([jeddah])
  })

  it('appends a chip for a field that has none', () => {
    expect(withFilter([riyadh], active)).toEqual([riyadh, active])
  })

  it('does not mutate the list it was given', () => {
    const original = [riyadh]
    withFilter(original, jeddah)
    withoutFilter(original, 'city')
    expect(original).toEqual([riyadh])
  })

  it('removes one field and leaves the rest', () => {
    expect(withoutFilter([riyadh, active], 'city')).toEqual([active])
  })

  it('is a no-op for a field with no chip', () => {
    expect(withoutFilter([riyadh], 'status')).toEqual([riyadh])
  })

  it.each([
    ['', [], false],
    ['   ', [], false],
    ['nora', [], true],
    ['', [riyadh], true],
    ['   ', [riyadh], true],
  ] as const)('hasActiveFilters(%j, %j) is %s', (query, filters, expected) => {
    expect(hasActiveFilters(query, [...filters])).toBe(expected)
  })
})

describe('useFilters', () => {
  it('starts empty and unfiltered', () => {
    const { result } = renderHook(() => useFilters())
    expect(result.current.query).toBe('')
    expect(result.current.view).toBeNull()
    expect(result.current.filters).toEqual([])
    expect(result.current.isFiltered).toBe(false)
  })

  it('accepts initial state, for a route arriving with `?view=`', () => {
    const { result } = renderHook(() =>
      useFilters({ initialView: 'instant', initialQuery: 'nora', initialFilters: [] }),
    )
    expect(result.current.view).toBe('instant')
    expect(result.current.isFiltered).toBe(true)
  })

  it('treats a whitespace-only query as no query', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setQuery('   '))
    expect(result.current.isFiltered).toBe(false)
  })

  it('keeps one chip per field', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    act(() => result.current.setFilter({ field: 'status', op: 'eq', value: 'Active' }))
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Jeddah' }))
    expect(result.current.filters).toHaveLength(2)
    expect(result.current.filters.find((f) => f.field === 'city')?.value).toBe('Jeddah')
  })

  it('removes a chip by field, and ignores a field that is not there', () => {
    const { result } = renderHook(() => useFilters())
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    act(() => result.current.removeFilter('city'))
    expect(result.current.filters).toEqual([])
    act(() => result.current.removeFilter('nothing'))
    expect(result.current.filters).toEqual([])
  })

  it('bumps a revision on every change, so a caller can reset without diffing arrays', () => {
    const { result } = renderHook(() => useFilters())
    const start = result.current.revision
    act(() => result.current.setQuery('a'))
    act(() => result.current.setView('active'))
    act(() => result.current.setFilter({ field: 'city', op: 'eq', value: 'Riyadh' }))
    act(() => result.current.removeFilter('city'))
    act(() => result.current.clearAll())
    expect(result.current.revision).toBe(start + 5)
  })
})

describe('useDebouncedValue', () => {
  it('trails the value by the delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }: { value: string }) => useDebouncedValue(value, 250), {
      initialProps: { value: 'n' },
    })
    rerender({ value: 'no' })
    rerender({ value: 'nora' })
    expect(result.current).toBe('n')
    act(() => void vi.advanceTimersByTime(250))
    expect(result.current).toBe('nora')
    vi.useRealTimers()
  })

  it('is synchronous at zero delay, which is what tests use', () => {
    const { result, rerender } = renderHook(({ value }: { value: string }) => useDebouncedValue(value, 0), {
      initialProps: { value: 'a' },
    })
    rerender({ value: 'b' })
    expect(result.current).toBe('b')
  })

  it('handles a value cleared back to empty', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }: { value: string }) => useDebouncedValue(value, 250), {
      initialProps: { value: 'nora' },
    })
    act(() => void vi.advanceTimersByTime(250))
    rerender({ value: '' })
    act(() => void vi.advanceTimersByTime(250))
    expect(result.current).toBe('')
    vi.useRealTimers()
  })
})
