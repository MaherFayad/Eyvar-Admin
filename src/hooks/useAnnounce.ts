/**
 * A stable `announce` for the one live region. **AC-29**.
 *
 * The region itself is a module singleton (`src/lib/a11y/announcer.ts`) so there
 * is exactly one of it no matter how many screens speak. This hook exists only
 * so a component gets a referentially stable callback it can put in a dependency
 * array without re-subscribing everything downstream.
 *
 * Pass a **finished, translated string**. Never a key, never a concatenation
 * (AC-74, AC-75), and never the only carrier of the information (§7.5) — the
 * screen still renders the state.
 */

import { useCallback } from 'react'
import { announce } from '@/lib/a11y/announcer'

export function useAnnounce(): (message: string) => void {
  return useCallback((message: string) => announce(message), [])
}
