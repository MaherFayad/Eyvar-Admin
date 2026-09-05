import { useCallback, useLayoutEffect, useRef, useState, type DependencyList, type RefObject } from 'react'

/** How close to the bottom still counts as "at the bottom" (design 12 §4.3). */
export const STICK_TO_BOTTOM_THRESHOLD_PX = 48

export interface StickToBottom {
  /** True while the operator is within the threshold of the bottom. */
  pinned: boolean
  /** Arrivals since the operator left the bottom: the `↓ N new` pill's count. */
  pendingCount: number
  /** Scrolls to the bottom, re-pins and clears the count. */
  scrollToBottom: () => void
}

function distanceFromBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight
}

/**
 * Keeps `ref`'s scroll container at its bottom on every `deps` change while the
 * operator is within `STICK_TO_BOTTOM_THRESHOLD_PX` of it; otherwise holds the
 * place and counts. Reaching the bottom by scrolling clears the count. Key the
 * caller on the conversation so a switch mounts fresh (design 12 §4.3).
 */
export function useStickToBottom(ref: RefObject<HTMLElement | null>, deps: DependencyList): StickToBottom {
  const [pinned, setPinned] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const pinnedRef = useRef(true)

  const scrollToBottom = useCallback(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
    pinnedRef.current = true
    setPinned(true)
    setPendingCount(0)
  }, [ref])

  // Layout effect so the scroll lands before paint: no flash of the old position.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined

    if (pinnedRef.current) el.scrollTop = el.scrollHeight
    else setPendingCount((count) => count + 1)

    const onScroll = () => {
      const near = distanceFromBottom(el) <= STICK_TO_BOTTOM_THRESHOLD_PX
      pinnedRef.current = near
      setPinned(near)
      if (near) setPendingCount(0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` is the caller's "a message arrived" signal.
  }, deps)

  return { pinned, pendingCount, scrollToBottom }
}
