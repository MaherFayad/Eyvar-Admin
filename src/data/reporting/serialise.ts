/**
 * `ReportQuery` ⇄ URL — §9.2, and it is **AC-853**, not an implementation note.
 *
 * ## Why this is in the data layer
 *
 * **Q1 (persistence) is open and there is no storage adapter.** `lib/persistence.ts`
 * is explicit that shipping a `localStorage` adapter would be *"answering Q1 by
 * writing code"*. §9.2's answer is that **the URL is the storage adapter for the
 * core**: reload does not lose the question, Back steps through previous
 * questions, and sharing works with no share feature because pasting a link into
 * a chat is how every analytics tool is actually used.
 *
 * That makes the encoding part of the query model's contract rather than a
 * screen's detail: an alert's notification `route` is a serialised query
 * (§12.5), so a fixture in this layer has to be able to produce one.
 *
 * ## One opaque param, not one param per control
 *
 * §9.2: *"a compact encoding of the query object, not one param per control"* —
 * one param keeps §3.8's URL rules intact and keeps `?view=` and `?entity=`
 * unambiguous. Base64url of JSON is lossless by construction, which is what
 * AC-853 asks for; it is not obfuscation and nothing secret goes through it.
 *
 * **`reports.run` is a POST and this is a GET param, and the two encodings stay
 * independent on purpose** (§4.3): a filter list can exceed a URL, so the
 * request body and the shareable link are allowed to disagree about form while
 * agreeing about content.
 */

import type { ReportQuery } from '../types/report'

/** The single search param. `q` is short because it is typed into chat windows. */
export const REPORT_QUERY_PARAM = 'q'

/* Base64url, hand-rolled over `btoa`/`atob` so this file works in a browser, in
   Vitest and in a bare Node script without pulling in a Buffer polyfill. */

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(encoded: string): string {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/**
 * Serialise, with **keys in a fixed order**.
 *
 * `JSON.stringify` follows insertion order, and two panels that built the same
 * query in a different order would otherwise produce two different links for
 * one question — which breaks `Back` deduplication and makes two identical bug
 * reports look like two bugs. Determinism here is the same discipline the
 * fixtures follow.
 */
export function serialiseReportQuery(query: ReportQuery): string {
  const ordered = {
    m: query.measures.map((m) => m.key),
    g: query.groupBy,
    f: query.filters.map((f) => [f.field, f.op, f.value]),
    w: query.window,
    gr: query.grain,
    c: query.periodComparison,
    ct: query.chartType,
  }
  return toBase64Url(JSON.stringify(ordered))
}

/**
 * Restore. Returns `null` on anything unparseable — a mangled link is a
 * **domain** outcome the panel renders as "this link is not a report", not an
 * exception that takes down the screen. §8.3 state 2's rule applies: the
 * previous query is retained.
 */
export function deserialiseReportQuery(encoded: string): ReportQuery | null {
  try {
    const raw = JSON.parse(fromBase64Url(encoded)) as {
      m: string[]
      g: string | null
      f: Array<[string, string, unknown]>
      w: ReportQuery['window']
      gr: ReportQuery['grain']
      c: ReportQuery['periodComparison']
      ct: ReportQuery['chartType']
    }
    if (!Array.isArray(raw.m)) return null
    return {
      measures: raw.m.map((key) => ({ key })),
      groupBy: raw.g ?? null,
      filters: (raw.f ?? []).map(([field, op, value]) => ({
        field,
        op: op as ReportQuery['filters'][number]['op'],
        value: value as ReportQuery['filters'][number]['value'],
      })),
      window: raw.w,
      grain: raw.gr,
      periodComparison: raw.c,
      chartType: raw.ct,
    }
  } catch {
    return null
  }
}

/** `/management/reports?q=…` — the link an alert notification routes to (§12.5). */
export function reportQueryPath(query: ReportQuery, basePath = '/management/reports'): string {
  return `${basePath}?${REPORT_QUERY_PARAM}=${serialiseReportQuery(query)}`
}
