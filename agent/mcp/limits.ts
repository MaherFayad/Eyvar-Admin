/**
 * The caps every tool is built against — 01-analyst-agent.md §5's own words:
 * "series are truncated to 400 points; no tool returns more than 64 KB."
 * AC-1243. One module so a cap changes in one place, never re-guessed per tool.
 */

/** No tool output may exceed this many UTF-8 bytes (AC-1243). */
export const MAX_OUTPUT_BYTES = 64 * 1024

/** A series longer than this is truncated, never silently dropped (AC-1243). */
export const MAX_SERIES_POINTS = 400

/** T10's own cap, D44. Never raised by an argument the caller supplies. */
export const MAX_SAMPLE_ROWS = 50

export function byteSizeOf(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

/**
 * The last line of defence for AC-1243: every tool caps its own arrays before
 * this runs, so this should never actually trip. When it does, it is a
 * programming error in the tool (a forgotten cap), not a domain refusal —
 * hence a thrown `Error`, not a typed `refuse()` result.
 */
export function assertUnderOutputCap(value: unknown, toolName: string): void {
  const bytes = byteSizeOf(value)
  if (bytes > MAX_OUTPUT_BYTES) {
    throw new Error(
      `${toolName}: output is ${bytes} bytes, over the ${MAX_OUTPUT_BYTES}-byte cap (AC-1243). ` +
        'Cap the payload inside the tool before returning it.',
    )
  }
}

/**
 * A series' points, truncated to the most recent `MAX_SERIES_POINTS` buckets
 * — the window an analyst reasons over is almost always the recent one, and a
 * gap at the START of a long series is a less costly truncation than one at
 * the end. `partialBucketIndexes` is re-indexed to the truncated array.
 */
export function truncateSeries<T>(
  buckets: readonly string[],
  points: readonly T[],
  partialBucketIndexes: readonly number[] = [],
): { buckets: string[]; points: T[]; partialBucketIndexes: number[]; truncated: boolean; truncatedFrom: number } {
  const total = buckets.length
  if (total <= MAX_SERIES_POINTS) {
    return { buckets: [...buckets], points: [...points], partialBucketIndexes: [...partialBucketIndexes], truncated: false, truncatedFrom: total }
  }
  const start = total - MAX_SERIES_POINTS
  return {
    buckets: buckets.slice(start),
    points: points.slice(start),
    partialBucketIndexes: partialBucketIndexes.filter((i) => i >= start).map((i) => i - start),
    truncated: true,
    truncatedFrom: total,
  }
}
