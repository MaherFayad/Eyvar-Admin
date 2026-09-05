/**
 * `ui.pageSize` (D16 class 2) supplies the fetch chunk under infinite scroll
 * when a screen names no size. There is no operator control for it: tables
 * scroll, they do not page, so a "rows per page" choice would act on nothing.
 */

import { useSyncExternalStore } from 'react'
import { isUiPageSize } from '@/data/clients/preferences'
import { DEFAULT_PAGE_SIZE } from '@/data/types/common'
import { UI_STATE_KEYS, currentUiStateOwner, defaultUiStore } from '@/lib/persistence'

/** The sizes the store accepts; 25 is `DEFAULT_PAGE_SIZE`. */
export const TABLE_PAGE_SIZES: readonly number[] = [25, 50, 100] as const

const listeners = new Set<() => void>()

function store() {
  return defaultUiStore<number>(UI_STATE_KEYS.pageSize, isUiPageSize)
}

/* Cached because `useSyncExternalStore` calls its snapshot on every render, and
   keyed on the operator because a cache that is not is the shift-change leak
   D16 rejects `localStorage`-as-the-store for. */
let cached: number | null = null
let cachedOwner: string | null | undefined

export function readTablePageSize(): number {
  const owner = currentUiStateOwner()
  if (cached === null || cachedOwner !== owner) {
    cachedOwner = owner
    const stored = store().read()
    /* A size the control does not offer is a size no menu can take back off,
       so the store is narrowed to the offered set on read as well as on write. */
    cached = stored !== null && TABLE_PAGE_SIZES.includes(stored) ? stored : DEFAULT_PAGE_SIZE
  }
  return cached
}

/** Write it, and tell every mounted table. */
export function setTablePageSize(size: number): void {
  if (!TABLE_PAGE_SIZES.includes(size)) return
  cached = size
  cachedOwner = currentUiStateOwner()
  store().write(size)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTablePageSize(): number {
  return useSyncExternalStore(subscribe, readTablePageSize, () => DEFAULT_PAGE_SIZE)
}
