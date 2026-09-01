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
 *
 * ## Lossless, and what P7-T1 did to that word
 *
 * `mode` and its three configurations serialise here, which is the entire point
 * of putting `mode` in the query: **a funnel, a cohort matrix and a journey are
 * now shareable, bookmarkable and alertable on the same terms as a trend**, and
 * the alert notification `route` this file produces (§12.5) can point at any of
 * the five.
 *
 * Lossless is now *lossless up to `normaliseReportQuery`*, and the one thing
 * that collapses is the one thing that must:
 *
 *     serialise({ …q })                  === serialise({ …q, mode: 'trend' })
 *     deserialise(serialise(q))          deep-equals normaliseReportQuery(q)
 *
 * The default is never written, so an existing link keeps its exact bytes and
 * an existing link written before this field existed keeps its exact meaning
 * (AC-853). Nothing else collapses: every non-default mode, every funnel step
 * with its own filters, every cohort anchor and horizon and every journey root
 * survives the trip unchanged.
 */

import { DEFAULT_REPORT_MODE, reportMode } from '../types/report'
import type {
  CohortSpec,
  FunnelSpec,
  FunnelStep,
  JourneySpec,
  ReportMode,
  ReportQuery,
} from '../types/report'

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
  const ordered: Record<string, unknown> = {
    m: query.measures.map((m) => m.key),
    g: query.groupBy,
    f: query.filters.map((f) => [f.field, f.op, f.value]),
    w: query.window,
    gr: query.grain,
    c: query.periodComparison,
    ct: query.chartType,
  }

  /* The mode and its configuration are **appended in a fixed order after the
     seven that were always there**, and only when they carry something. Two
     properties fall out of that and both are load-bearing:

     1. **`trend` never reaches the URL.** It is the default, so its absence and
        its presence mean the same thing, and writing it would change the link
        for every report that already exists. Every URL an operator has
        bookmarked, pinned to a runbook or pasted into a chat window before this
        field existed keeps parsing to the identical query (AC-853).
     2. **The order is still fixed.** §9.2's determinism rule is that one
        question produces one link; conditional keys appended in a constant
        sequence preserve that, because the condition depends only on the query. */
  const mode = reportMode(query)
  if (mode !== DEFAULT_REPORT_MODE) ordered.mo = mode
  if (query.funnel) ordered.fn = encodeFunnel(query.funnel)
  if (query.cohort) ordered.co = encodeCohort(query.cohort)
  if (query.journey) ordered.jo = encodeJourney(query.journey)

  return toBase64Url(JSON.stringify(ordered))
}

/* Each configuration gets short keys for the same reason `q` is short: these
   strings are typed into chat windows. Steps carry their own filters as the
   same `[field, op, value]` triples the query-level filters use — one filter
   encoding in the product, as there is one filter model (AC-814). */

type WireFilter = [string, string, unknown]
type WireFunnel = { s: Array<[string, WireFilter[]]>; w: number | null }
type WireCohort = { a: string | null; r: string | null; g: string; h: number }
type WireJourney = { r: string | null; d: number }

function encodeFunnel(funnel: FunnelSpec): WireFunnel {
  return {
    s: funnel.steps.map((step) => [
      step.measureKey,
      step.filters.map((f) => [f.field, f.op, f.value] as WireFilter),
    ]),
    w: funnel.conversionWindowDays,
  }
}

function decodeFunnel(raw: WireFunnel | undefined): FunnelSpec | undefined {
  if (!raw || !Array.isArray(raw.s)) return undefined
  const steps: FunnelStep[] = raw.s.map(([measureKey, filters]) => ({
    measureKey,
    filters: (filters ?? []).map(decodeFilter),
  }))
  return { steps, conversionWindowDays: raw.w ?? null }
}

function encodeCohort(cohort: CohortSpec): WireCohort {
  return {
    a: cohort.anchorMeasureKey,
    r: cohort.returnMeasureKey,
    g: cohort.cohortGrain,
    h: cohort.horizon,
  }
}

function decodeCohort(raw: WireCohort | undefined): CohortSpec | undefined {
  if (!raw) return undefined
  return {
    anchorMeasureKey: raw.a ?? null,
    returnMeasureKey: raw.r ?? null,
    cohortGrain: raw.g as CohortSpec['cohortGrain'],
    horizon: raw.h,
  }
}

function encodeJourney(journey: JourneySpec): WireJourney {
  return { r: journey.rootMeasureKey, d: journey.depth }
}

function decodeJourney(raw: WireJourney | undefined): JourneySpec | undefined {
  if (!raw) return undefined
  return { rootMeasureKey: raw.r ?? null, depth: raw.d }
}

function decodeFilter([field, op, value]: WireFilter): ReportQuery['filters'][number] {
  return {
    field,
    op: op as ReportQuery['filters'][number]['op'],
    value: value as ReportQuery['filters'][number]['value'],
  }
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
      f: WireFilter[]
      w: ReportQuery['window']
      gr: ReportQuery['grain']
      c: ReportQuery['periodComparison']
      ct: ReportQuery['chartType']
      mo?: ReportMode
      fn?: WireFunnel
      co?: WireCohort
      jo?: WireJourney
    }
    if (!Array.isArray(raw.m)) return null

    const query: ReportQuery = {
      measures: raw.m.map((key) => ({ key })),
      groupBy: raw.g ?? null,
      filters: (raw.f ?? []).map(decodeFilter),
      window: raw.w,
      grain: raw.gr,
      periodComparison: raw.c,
      chartType: raw.ct,
      /* **A link written before `mode` existed carries no `mo` and lands here
         as a trend** — the same answer `reportMode()` gives everywhere else,
         reached through the same constant rather than a literal. This is the
         whole of the backwards-compatibility guarantee, and it is one line. */
      mode: raw.mo ?? DEFAULT_REPORT_MODE,
    }

    /* Set only when present, so an absent configuration deserialises to an
       absent configuration rather than to an empty one. `{ steps: [] }` and
       "no funnel yet" are different states and the panel renders them
       differently. */
    const funnel = decodeFunnel(raw.fn)
    if (funnel) query.funnel = funnel
    const cohort = decodeCohort(raw.co)
    if (cohort) query.cohort = cohort
    const journey = decodeJourney(raw.jo)
    if (journey) query.journey = journey

    return query
  } catch {
    return null
  }
}

/** `/management/reports?q=…` — the link an alert notification routes to (§12.5). */
export function reportQueryPath(query: ReportQuery, basePath = '/management/reports'): string {
  return `${basePath}?${REPORT_QUERY_PARAM}=${serialiseReportQuery(query)}`
}
