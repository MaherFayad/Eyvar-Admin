/**
 * **A preference must not be silently discarded in the window before the
 * session resolves.**
 *
 * `ShellContext` sets the cache namespace from the signed-in operator, and it
 * did so as `setUiStateOwner(session.data?.userId ?? null)`. On the FIRST pass
 * — before `getSession` has answered — `session.data` is `undefined`, so that
 * expression is `null`, and `setUiStateOwner(null)` is not a no-op: it forgets
 * the remembered owner and drops every default store.
 *
 * The remembered owner exists for one reason, stated on `uiStateOwnerId`
 * itself: *"so the next boot knows the namespace during its first render rather
 * than one async hop later."* This effect was throwing it away one render
 * before it was needed.
 *
 * What it cost, end to end: while the owner is `null`, `createCachedStore.read`
 * returns from memory without touching storage, because a null owner has no
 * namespace to read. `getUiState` lands inside that window, `cachedUiState()`
 * comes back `{}`, `hydratedMockState()` seeds the mock bag from defaults and
 * latches `mockHydrated`, and `receive()` writes the default back OVER the
 * cached value. An operator switched the console to Arabic, navigated once, and
 * was reading English again — with `"ar"` still sitting in `localStorage` under
 * the correct key, never read.
 *
 * `undefined` means "not resolved yet" and is not the same as "nobody".
 * Clearing on sign-out is `signOut`'s job in `./session.ts`, which the effect's
 * own comment already said.
 */

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { disableMockLatency } from '@/data/clients'
import { currentUiStateOwner, resetDefaultUiStores, setUiStateOwner } from '@/lib'
import { AppLayout } from './AppLayout'
import { ShellProvider } from './ShellContext'

const OWNER = 'USR-1'

beforeEach(() => {
  disableMockLatency()
  resetDefaultUiStores()
})

function mountShell() {
  return render(
    <MemoryRouter initialEntries={['/operations/overview']}>
      <ShellProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/operations/overview" element={<div>screen</div>} />
          </Route>
        </Routes>
      </ShellProvider>
    </MemoryRouter>,
  )
}

describe('the cache namespace survives the session-loading window', () => {
  it('keeps a remembered owner through the first render, before getSession answers', () => {
    setUiStateOwner(OWNER)
    expect(currentUiStateOwner()).toBe(OWNER)

    mountShell()

    /* Synchronous: effects have flushed, the session read has not resolved.
       This is the exact window the regression lived in. */
    expect(
      currentUiStateOwner(),
      'the shell cleared the cache owner while the session was still loading',
    ).toBe(OWNER)
  })

  it('still adopts the operator once the session resolves', async () => {
    setUiStateOwner(null)
    mountShell()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await vi.waitFor(() => expect(currentUiStateOwner()).toBe(OWNER))
  })
})
