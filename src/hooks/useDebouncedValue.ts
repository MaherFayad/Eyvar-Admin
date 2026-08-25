/**
 * Trails a value by `delayMs`.
 *
 * One use, and it is the same one on all 34 sub-tabs: an index table's search
 * field must repaint on every keystroke (`value`) while the request behind it
 * fires once the operator stops typing (`useDebouncedValue(value)`). Every table
 * gets this through `useIndexTable`, which is the only caller that should need
 * it directly.
 */

import { useEffect, useState } from 'react'

/** 250ms: below a typist's inter-key gap, above the point where a request per keystroke is wasteful. */
export const DEFAULT_DEBOUNCE_MS = 250

export function useDebouncedValue<T>(value: T, delayMs: number = DEFAULT_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value)
      return
    }
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
