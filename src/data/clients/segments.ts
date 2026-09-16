/**
 * Saved segments (`02-report-builder-v2.md` §2.5): a named population
 * filter `ReportQuery.segments` can point at by id (`{ kind: 'saved' }`).
 * The store F-V2-18 found missing; `resolveReport.ts` resolves against it now instead of falling through to "everyone".
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
import type { Paginated, QueryParams, Single } from '../types/common'
import type { Segment, SegmentVisibility } from '../types/segment'
import { currentMockUserId } from './session'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

let segmentFixtures!: Fixtures['segmentFixtures']
onFixturesLoaded((f) => {
  segmentFixtures = f.segmentFixtures
  segments = segmentFixtures.map((s) => ({ ...s }))
})

export const SEGMENT_OPERATIONS = {
  list: 'segments.list',
  get: 'segments.get',
  save: 'segments.save',
  delete: 'segments.delete',
} as const

/* Registered at module load, not on first call — see `reports.ts` for why. */
registerOperations(...Object.values(SEGMENT_OPERATIONS))

/** Mutable copy. **Not persistence** — Q1 is open, the same as every saved-report resource. */
let segments!: Segment[]

/**
 * GET /api/v1/segments
 *   params: q · page · pageSize
 *   -> Paginated<Segment>
 */
export async function listSegments(
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<Paginated<Segment>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Segment>>('/segments', { ...params, signal }, { signal })
  }
  return mock(SEGMENT_OPERATIONS.list, signal, () => {
    const q = params.q?.trim().toLowerCase()
    const rows = q ? segments.filter((s) => s.name.toLowerCase().includes(q)) : segments
    return paginate(rows, params)
  })
}

/**
 * GET /api/v1/segments/:id
 *   -> Single<Segment>
 * Read by `reports.run`'s mock adapter for every `{ kind: 'saved' }` ref, and by the composer's edit form.
 */
export async function getSegment(id: string, signal?: AbortSignal): Promise<Single<Segment>> {
  if (DATA_SOURCE === 'http') return http.get<Single<Segment>>(`/segments/${id}`, undefined, { signal })
  return mock(SEGMENT_OPERATIONS.get, signal, () => {
    const row = segments.find((s) => s.id === id)
    if (!row) throw notFound('segment', id)
    return { data: { ...row } }
  })
}

export interface SaveSegmentInput {
  /** `null` creates; a value updates in place. */
  id: string | null
  name: string
  description: string | null
  filters: Segment['filters']
  performed: Segment['performed']
  visibility: SegmentVisibility
}

/**
 * POST /api/v1/segments · PATCH /api/v1/segments/:id
 *   body: SaveSegmentInput
 *   -> Single<Segment>
 */
export async function saveSegment(input: SaveSegmentInput, signal?: AbortSignal): Promise<Single<Segment>> {
  if (DATA_SOURCE === 'http') {
    const res = input.id
      ? await http.patch<Single<Segment>>(`/segments/${input.id}`, input, { signal })
      : await http.post<Single<Segment>>('/segments', input, { signal })
    return res
  }
  return mockMutation(SEGMENT_OPERATIONS.save, signal, () => {
    const existing = input.id ? segments.find((s) => s.id === input.id) : undefined
    if (input.id && !existing) throw notFound('segment', input.id)
    const saved: Segment = {
      id: existing?.id ?? `SEG-${segments.length + 1}${segments.length}`,
      name: input.name,
      description: input.description,
      filters: input.filters,
      performed: input.performed,
      ownerId: existing?.ownerId ?? currentMockUserId(),
      visibility: input.visibility,
    }
    segments = existing ? segments.map((s) => (s.id === saved.id ? saved : s)) : [...segments, saved]
    return { data: { ...saved } }
  })
}

/**
 * DELETE /api/v1/segments/:id
 *   -> 204
 * Unlike `reports.delete`, never refuses: a dangling `{ kind: 'saved' }` ref resolves as `segment-not-found` at run time.
 */
export async function deleteSegment(id: string, signal?: AbortSignal): Promise<void> {
  if (DATA_SOURCE === 'http') {
    await http.delete<void>(`/segments/${id}`, { signal })
    return
  }
  await mockMutation(SEGMENT_OPERATIONS.delete, signal, () => {
    if (!segments.some((s) => s.id === id)) throw notFound('segment', id)
    segments = segments.filter((s) => s.id !== id)
  })
}

export function resetSegments(): void {
  if (!fixturesLoaded()) return
  segments = segmentFixtures.map((s) => ({ ...s }))
}
