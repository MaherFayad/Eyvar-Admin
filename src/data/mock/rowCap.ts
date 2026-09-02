/**
 * The report resolver's row cap, and the two QA seams that move it.
 *
 * **Split out of `resolveReport.ts` to break a static import chain**, not for
 * tidiness. `clients/reports.ts` re-exports `useTruncatedReports` through the
 * public barrel, and that one re-export pulled `resolveReport.ts` — which
 * statically imports six fixture modules — into the entry chunk of **every**
 * build, including `VITE_DATA_SOURCE=http`, where the resolver can never run.
 * Seeded driver rows and the Arabic name pool were measured in the production
 * `http` bundle because of it.
 *
 * Nothing here touches a fixture, so this module is free to be imported from
 * anywhere. The resolver itself is now reached by a dynamic `import()` inside
 * the mock branch that actually uses it.
 */

const DEFAULT_ROW_CAP = 5_000

let rowCap = DEFAULT_ROW_CAP

/**
 * Shrink the resolver's row budget so a QA engineer can reach the truncated
 * state without editing a fixture.
 *
 * The cap is applied to the rows the resolver reads, so the numbers that come
 * back are genuinely short and `truncated: true` describes something that
 * happened. A flag with full data behind it would ship the caveat's copy for a
 * state that never occurs.
 */
export function useTruncatedReports(cap = 40): void {
  rowCap = cap
}

export function resetReportRowCap(): void {
  rowCap = DEFAULT_ROW_CAP
}

export function currentRowCap(): number {
  return rowCap
}
