/**
 * Index into a non-empty list, wrapping.
 *
 * Exists for one reason: the volume-filler generators at the bottom of the
 * fixture files must be **deterministic** (no `Math.random()`), which means they
 * index a literal list by loop counter — and `noUncheckedIndexedAccess` makes
 * `list[i % list.length]` a `T | undefined`. This is total, so the compiler flag
 * stays on rather than being worked around with `!` in twenty places.
 */
export function cycle<T>(items: readonly T[], i: number): T {
  return items[((i % items.length) + items.length) % items.length] as T
}
