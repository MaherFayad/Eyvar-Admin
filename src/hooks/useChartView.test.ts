/**
 * §2.2's "costs no request" proven the only way a hook can prove it: this
 * file imports nothing from `@/data/clients`, so there is no client function
 * that could be called — a `ChartView` change literally cannot reach the wire.
 */

import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDefaultUiStores, setUiStateOwner } from '@/lib/persistence'
import { defaultChartView, useChartView } from './useChartView'

beforeEach(() => {
  setUiStateOwner('U1')
  resetDefaultUiStores()
})

describe('defaultChartView', () => {
  it('starts a bar family at zero and a line/area at its own domain (§4.4, stated not auto)', () => {
    expect(defaultChartView('bar').yStartAtZero).toBe(true)
    expect(defaultChartView('stacked-bar').yStartAtZero).toBe(true)
    expect(defaultChartView('stacked-100').yStartAtZero).toBe(true)
    expect(defaultChartView('horizontal-bar').yStartAtZero).toBe(true)
    expect(defaultChartView('line').yStartAtZero).toBe(false)
    expect(defaultChartView('area').yStartAtZero).toBe(false)
  })
})

describe('useChartView', () => {
  it('persists a change and restores it on remount under the same key', () => {
    const { result, unmount } = renderHook(() => useChartView('RPT-1', 'line'))
    act(() => result.current.setYScale('log'))
    expect(result.current.view.yScale).toBe('log')
    unmount()

    const { result: again } = renderHook(() => useChartView('RPT-1', 'line'))
    expect(again.current.view.yScale).toBe('log')
  })

  it('re-seeds from the new key’s own store when the key changes — a different report is a different view', () => {
    const { result, rerender } = renderHook(({ key }) => useChartView(key, 'line'), {
      initialProps: { key: 'RPT-1' },
    })
    act(() => result.current.setDataLabels(true))
    expect(result.current.view.dataLabels).toBe(true)

    rerender({ key: 'RPT-2' })
    expect(result.current.view.dataLabels).toBe(false)
  })

  it('toggleHidden hides then restores a series id', () => {
    const { result } = renderHook(() => useChartView('RPT-3', 'line'))
    act(() => result.current.toggleHidden('p1'))
    expect(result.current.view.hidden).toEqual(['p1'])
    act(() => result.current.toggleHidden('p1'))
    expect(result.current.view.hidden).toEqual([])
  })

  it('isolate hides every other drawn id, and a second isolate of the same set restores all (AC-1139)', () => {
    const { result } = renderHook(() => useChartView('RPT-4', 'line'))
    const every = ['p1', 'p2', 'p3']
    act(() => result.current.isolate(['p1'], every))
    expect(result.current.view.hidden.sort()).toEqual(['p2', 'p3'])

    act(() => result.current.isolate(['p1'], every))
    expect(result.current.view.hidden).toEqual([])
  })

  it('showAll clears every hidden id at once', () => {
    const { result } = renderHook(() => useChartView('RPT-5', 'line'))
    act(() => {
      result.current.toggleHidden('p1')
      result.current.toggleHidden('p2')
    })
    act(() => result.current.showAll())
    expect(result.current.view.hidden).toEqual([])
  })
})
