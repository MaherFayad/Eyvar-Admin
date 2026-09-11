/**
 * `ulid()` — a client-generated, sortable id for an optimistic block insert
 * that needs a stable identity before its save returns (D39, page.ts §2).
 * Monotonic within one tab, so two calls in the same millisecond still sort
 * in call order. Not Crockford-conformant — this id never crosses a wire
 * boundary that checks the format.
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

let lastTime = 0
let sequence = 0

function randomPart(length: number): string {
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return out
}

/** Monotonic per call, in this tab, via a module-level clock — never reset between calls. */
export function ulid(now: number = Date.now()): string {
  if (now === lastTime) {
    sequence += 1
  } else {
    lastTime = now
    sequence = 0
  }
  const time = now.toString(36).padStart(9, '0')
  const seq = sequence.toString(36).padStart(3, '0')
  return `${time}${seq}${randomPart(6)}`
}

/** Resets the monotonic clock. Test-only — production never needs two ids to disagree on purpose. */
export function resetUlidClock(): void {
  lastTime = 0
  sequence = 0
}
