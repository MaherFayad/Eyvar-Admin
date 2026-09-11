/**
 * Annotations — `02-report-builder-v2.md` §4.5. A marked date on a trend
 * chart: context, never query state, never serialised into a `ReportQuery`.
 * Write needs `manage_analytics`, a key not yet minted (`annotation.ts`); the
 * mock does not gate on it rather than invent one.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import type { IsoDate } from '../types/common'
import type { Annotation, AnnotationKind } from '../types/annotation'
import { currentMockUserId } from './session'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

let annotationFixtures!: Fixtures['annotationFixtures']
onFixturesLoaded((f) => {
  annotationFixtures = f.annotationFixtures
  annotations = annotationFixtures.map((a) => ({ ...a }))
})

export const ANNOTATION_OPERATIONS = {
  list: 'annotations.list',
  save: 'annotations.save',
  delete: 'annotations.delete',
} as const

registerOperations(...Object.values(ANNOTATION_OPERATIONS))

/** Mutable copy. **Not persistence** — Q1 is open, the same as every saved-report resource. */
let annotations!: Annotation[]

export interface AnnotationQuery {
  from?: IsoDate
  to?: IsoDate
}

/**
 * GET /api/v1/annotations
 *   params: from · to
 *   -> Annotation[]
 *
 * A bare array, not `Paginated<T>`: a finding, not a quiet deviation. T17 and
 * every chart that draws these expect a whole range in one call at once.
 */
export async function listAnnotations(
  params: AnnotationQuery = {},
  signal?: AbortSignal,
): Promise<Annotation[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<Annotation[]>('/annotations', { ...params, signal }, { signal })
  }
  return mock(ANNOTATION_OPERATIONS.list, signal, () => {
    let rows = annotations
    if (params.from) rows = rows.filter((a) => a.date >= params.from!)
    if (params.to) rows = rows.filter((a) => a.date <= params.to!)
    return [...rows].sort((a, b) => a.date.localeCompare(b.date))
  })
}

export interface SaveAnnotationInput {
  id: string | null
  date: IsoDate
  label: string
  note: string
  kind: AnnotationKind
}

/**
 * POST /api/v1/annotations · PATCH /api/v1/annotations/:id
 *   body: SaveAnnotationInput
 *   -> Annotation
 */
export async function saveAnnotation(input: SaveAnnotationInput, signal?: AbortSignal): Promise<Annotation> {
  if (DATA_SOURCE === 'http') {
    return input.id
      ? http.patch<Annotation>(`/annotations/${input.id}`, input, { signal })
      : http.post<Annotation>('/annotations', input, { signal })
  }
  return mockMutation(ANNOTATION_OPERATIONS.save, signal, () => {
    const existing = input.id ? annotations.find((a) => a.id === input.id) : undefined
    if (input.id && !existing) throw notFound('annotation', input.id)
    const saved: Annotation = {
      id: existing?.id ?? `ANN-${annotations.length + 1}${annotations.length}`,
      date: input.date,
      label: input.label,
      note: input.note,
      kind: input.kind,
      createdBy: existing?.createdBy ?? currentMockUserId(),
      createdAt: existing?.createdAt ?? EYVAR_NOW,
    }
    annotations = existing ? annotations.map((a) => (a.id === saved.id ? saved : a)) : [...annotations, saved]
    return { ...saved }
  })
}

/**
 * DELETE /api/v1/annotations/:id
 *   -> 204
 */
export async function deleteAnnotation(id: string, signal?: AbortSignal): Promise<void> {
  if (DATA_SOURCE === 'http') {
    await http.delete<void>(`/annotations/${id}`, { signal })
    return
  }
  await mockMutation(ANNOTATION_OPERATIONS.delete, signal, () => {
    if (!annotations.some((a) => a.id === id)) throw notFound('annotation', id)
    annotations = annotations.filter((a) => a.id !== id)
  })
}

export function resetAnnotations(): void {
  if (!fixturesLoaded()) return
  annotations = annotationFixtures.map((a) => ({ ...a }))
}
