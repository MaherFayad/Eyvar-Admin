/**
 * **The end-to-end proof that the D16 seam is not inert**, and the only test
 * here that renders anything.
 *
 * `lib/persistence.test.ts` proves the adapter survives five hostile
 * environments and `clients/preferences.test.ts` proves the bag round-trips.
 * Both would still pass if no preference ever survived a reload, because the
 * thing that decides that is **ordering**: every persisting hook reads its store
 * in a `useState` initialiser during the first render, and the operator id can
 * only be confirmed by an asynchronous `GET /session`. An owner set from the
 * session response alone is set one hop too late — the seed reads an unowned
 * store, gets `null`, and the cache is an elaborate in-memory store that passes
 * every test.
 *
 * That was measured before `lib/persistence.ts` began remembering the owner:
 * with the owner set from an effect the restored column set was `[]`. So this
 * file asserts the two halves of the real behaviour, through a real hook:
 *
 *   1. **A reload is a fresh module graph and an intact `localStorage`** — the
 *      layout comes back even though the session resolves after first render.
 *   2. **A sign-out is not a reload** — nothing comes back.
 */

import { createElement, useEffect, type ReactNode } from 'react'
import { act, render, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

interface Column {
  id: string
  label: string
  alwaysVisible?: boolean
}

const COLUMNS: readonly Column[] = [
  { id: 'name', label: 'Captain', alwaysVisible: true },
  { id: 'status', label: 'Status' },
  { id: 'city', label: 'City' },
]

/** A fresh module graph over the same storage: what pressing F5 actually does. */
async function reload() {
  vi.resetModules()
  return {
    persistence: await import('@/lib/persistence'),
    visibility: await import('./useColumnVisibility'),
  }
}

describe('an operator preference survives a reload', () => {
  it('restores the stored layout although the session resolves after first render', async () => {
    const before = await reload()
    before.persistence.clearCachedUiState(null)
    before.persistence.setUiStateOwner('USR-1')

    const first = renderHook(() =>
      before.visibility.useColumnVisibility<Column>({ columns: COLUMNS, tableId: 'drivers' }),
    )
    act(() => first.result.current.hide('city'))
    expect(first.result.current.hidden).toEqual(['city'])
    first.unmount()

    const after = await reload()
    /* The load-bearing assertion: the namespace is known during the first
       render, not one async hop later. Without it the two below pass with `[]`. */
    expect(after.persistence.currentUiStateOwner()).toBe('USR-1')

    let hidden: readonly string[] = []
    function Table() {
      hidden = after.visibility.useColumnVisibility<Column>({
        columns: COLUMNS,
        tableId: 'drivers',
      }).hidden
      return null
    }
    /* The shell sets the owner from an effect, because that is when
       `getSession` has resolved — `ShellContext.tsx`. The table below it has
       already rendered and seeded by then. */
    function Shell({ children }: { children: ReactNode }) {
      useEffect(() => {
        after.persistence.setUiStateOwner('USR-1')
      }, [])
      return createElement('div', null, children)
    }

    render(createElement(Shell, null, createElement(Table)))
    expect(hidden).toEqual(['city'])

    after.persistence.clearCachedUiState(null)
  })

  it('restores nothing after a sign-out, which is what signing out means', async () => {
    const before = await reload()
    before.persistence.clearCachedUiState(null)
    before.persistence.setUiStateOwner('USR-1')

    const first = renderHook(() =>
      before.visibility.useColumnVisibility<Column>({ columns: COLUMNS, tableId: 'drivers' }),
    )
    act(() => first.result.current.hide('city'))
    first.unmount()

    /* Exactly what `shell/session.ts` does, in that order. */
    before.persistence.setUiStateOwner(null)
    before.persistence.clearCachedUiState()

    const after = await reload()
    expect(after.persistence.currentUiStateOwner()).toBeNull()

    const second = renderHook(() =>
      after.visibility.useColumnVisibility<Column>({ columns: COLUMNS, tableId: 'drivers' }),
    )
    expect(second.result.current.hidden).toEqual([])
  })
})
