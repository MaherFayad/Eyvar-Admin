/**
 * Pages — `03-pages-and-dashboards.md`. A dashboard is one `kind` of page;
 * the others are `case-study` (the analyst's output) and `note`. Replaces
 * `dashboards.ts` (D39): a migrated `DSH-*` id answers both
 * `/dashboards/:id` and `/pages/:id` through `pageFixtures`.
 * `SavedReport.pinnedToDashboardIds` keeps its name; the §3 rename is a
 * `SavedReport` change, out of this file's scope, flagged in the handoff.
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { paginate } from '../mock/query'
import { validatePage, type PageViolation } from '../reporting/pages/validate'
import { ApiError, type Paginated, type QueryParams, type Single } from '../types/common'
import { pageStarredBy, type Block, type Page, type PageVisibility } from '../types/page'
import { currentMockUserId } from './session'
import { http } from './http'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

let pageFixtures!: Fixtures['pageFixtures']
onFixturesLoaded((f) => {
  pageFixtures = f.pageFixtures
  pages = pageFixtures.map((p) => ({ ...p }))
})

export const PAGE_OPERATIONS = {
  list: 'pages.list',
  get: 'pages.get',
  save: 'pages.save',
  delete: 'pages.delete',
  publish: 'pages.publish',
  duplicate: 'pages.duplicate',
  star: 'pages.star',
} as const

registerOperations(...Object.values(PAGE_OPERATIONS))

/** Mutable copy. **Not persistence** — Q1 is open, the same as every saved-report resource. */
let pages!: Page[]

export interface PageQuery extends QueryParams {
  /** `mine · team · starred · drafts · templates` — §7. */
  view?: string | null
}

/**
 * GET /api/v1/pages
 *   params: q · view=mine|team|starred|drafts|templates · filters[kind|ownerId] · page · pageSize
 *   -> Paginated<Page>
 */
export async function listPages(params: PageQuery = {}, signal?: AbortSignal): Promise<Paginated<Page>> {
  if (DATA_SOURCE === 'http') {
    return http.get<Paginated<Page>>('/pages', { ...params, signal }, { signal })
  }
  return mock(PAGE_OPERATIONS.list, signal, () => {
    const me = currentMockUserId()
    let rows = pages.filter((p) => p.visibility === 'team' || p.ownerId === me)
    if (params.view === 'mine') rows = rows.filter((p) => p.ownerId === me)
    if (params.view === 'team') rows = rows.filter((p) => p.visibility === 'team')
    if (params.view === 'starred') rows = rows.filter((p) => pageStarredBy(p).includes(me))
    if (params.view === 'drafts') rows = rows.filter((p) => p.publishedAt === null)
    if (params.view === 'templates') rows = rows.filter((p) => p.template === true)
    for (const filter of params.filters ?? []) {
      const wanted = Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)]
      if (filter.field === 'kind') rows = rows.filter((p) => wanted.includes(p.kind))
      if (filter.field === 'ownerId') rows = rows.filter((p) => wanted.includes(p.ownerId))
    }
    const q = params.q?.trim().toLowerCase()
    if (q) rows = rows.filter((p) => p.title.toLowerCase().includes(q))
    return paginate(rows, params)
  })
}

/**
 * GET /api/v1/pages/:id
 *   -> Single<Page>
 */
export async function getPage(id: string, signal?: AbortSignal): Promise<Single<Page>> {
  if (DATA_SOURCE === 'http') return http.get<Single<Page>>(`/pages/${id}`, undefined, { signal })
  return mock(PAGE_OPERATIONS.get, signal, () => {
    const row = pages.find((p) => p.id === id)
    if (!row) throw notFound('page', id)
    return { data: { ...row } }
  })
}

export interface SavePageInput {
  /** `null` creates; a value updates in place. */
  id: string | null
  kind: Page['kind']
  title: string
  icon: Page['icon']
  description: string | null
  visibility: PageVisibility
  tags: string[]
  scope: Page['scope']
  blocks: Block[]
  /** Optimistic lock (§5, §11). Ignored on create; required on update. */
  version?: number
}

export type SavePageOutcome =
  | { status: 'saved'; page: Page }
  | { status: 'invalid'; violations: PageViolation[] }
  /** §8.3 state 11 — someone else saved first. `current` is the live row, never discarded. */
  | { status: 'conflict'; current: Page }

/**
 * POST /api/v1/pages · PATCH /api/v1/pages/:id
 *   body: { title, icon, description, visibility, tags, scope, blocks, version }
 *   -> Single<Page>, or 409 { kind: 'conflict', details: [{ field: 'version', code: 'stale' }] }
 *
 * `validatePage()` runs here exactly as `validate.ts` says it must run
 * server-side too: **the same function**, so a save this client accepts
 * cannot come back 422 from the real backend.
 */
export async function savePage(input: SavePageInput, signal?: AbortSignal): Promise<SavePageOutcome> {
  if (DATA_SOURCE === 'http') {
    try {
      const res = input.id
        ? await http.patch<Single<Page>>(`/pages/${input.id}`, input, { signal })
        : await http.post<Single<Page>>('/pages', input, { signal })
      return { status: 'saved', page: res.data }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && input.id) {
        const current = await getPage(input.id, signal)
        return { status: 'conflict', current: current.data }
      }
      throw e
    }
  }
  return mockMutation(PAGE_OPERATIONS.save, signal, () => {
    const existing = input.id ? pages.find((p) => p.id === input.id) : undefined
    if (input.id && !existing) throw notFound('page', input.id)
    if (existing && input.version !== undefined && input.version !== existing.version) {
      return { status: 'conflict' as const, current: { ...existing } }
    }

    const draft: Page = {
      id: existing?.id ?? `PAGE-${pages.length + 1}${pages.length}`,
      kind: input.kind,
      title: input.title,
      icon: input.icon,
      description: input.description,
      ownerId: existing?.ownerId ?? currentMockUserId(),
      visibility: input.visibility,
      tags: input.tags,
      official: existing?.official ?? false,
      template: existing?.template,
      starredBy: existing?.starredBy,
      scope: input.scope,
      blocks: input.blocks,
      version: (existing?.version ?? 0) + 1,
      publishedAt: existing?.publishedAt ?? null,
      createdAt: existing?.createdAt ?? EYVAR_NOW,
      updatedAt: EYVAR_NOW,
      updatedBy: currentMockUserId(),
    }

    const violations = validatePage(draft)
    if (violations.length > 0) return { status: 'invalid' as const, violations }

    pages = existing ? pages.map((p) => (p.id === draft.id ? draft : p)) : [...pages, draft]
    return { status: 'saved' as const, page: { ...draft } }
  })
}

/**
 * DELETE /api/v1/pages/:id
 *   -> 204
 */
export async function deletePage(id: string, signal?: AbortSignal): Promise<void> {
  if (DATA_SOURCE === 'http') {
    await http.delete<void>(`/pages/${id}`, { signal })
    return
  }
  await mockMutation(PAGE_OPERATIONS.delete, signal, () => {
    if (!pages.some((p) => p.id === id)) throw notFound('page', id)
    pages = pages.filter((p) => p.id !== id)
  })
}

/**
 * POST /api/v1/pages/:id/publish
 *   -> Single<Page>
 *
 * The only writer of `publishedAt`. Idempotent: publishing an already-
 * published page keeps its original `publishedAt` rather than bumping it,
 * so `Publish` on a stale page never reads as a fresh one.
 */
export async function publishPage(id: string, signal?: AbortSignal): Promise<Single<Page>> {
  if (DATA_SOURCE === 'http') return http.post<Single<Page>>(`/pages/${id}/publish`, undefined, { signal })
  return mockMutation(PAGE_OPERATIONS.publish, signal, () => {
    const row = pages.find((p) => p.id === id)
    if (!row) throw notFound('page', id)
    const published: Page = { ...row, publishedAt: row.publishedAt ?? EYVAR_NOW }
    pages = pages.map((p) => (p.id === id ? published : p))
    return { data: { ...published } }
  })
}

/**
 * POST /api/v1/pages/:id/duplicate
 *   -> Single<Page>
 *
 * Copies blocks and scope, never `publishedAt` (§6: "a template copy is a
 * draft until the operator publishes"). Owned by the acting operator,
 * private, so duplicating a `team` page does not hand it to the team.
 */
export async function duplicatePage(id: string, signal?: AbortSignal): Promise<Single<Page>> {
  if (DATA_SOURCE === 'http') return http.post<Single<Page>>(`/pages/${id}/duplicate`, undefined, { signal })
  return mockMutation(PAGE_OPERATIONS.duplicate, signal, () => {
    const row = pages.find((p) => p.id === id)
    if (!row) throw notFound('page', id)
    const copy: Page = {
      ...row,
      id: `PAGE-${pages.length + 1}${pages.length}`,
      title: `${row.title} copy`,
      ownerId: currentMockUserId(),
      visibility: 'private',
      official: false,
      template: false,
      starredBy: [],
      version: 1,
      publishedAt: null,
      createdAt: EYVAR_NOW,
      updatedAt: EYVAR_NOW,
      updatedBy: currentMockUserId(),
    }
    pages = [...pages, copy]
    return { data: { ...copy } }
  })
}

/**
 * POST /api/v1/pages/:id/star
 *   -> Single<Page>
 *
 * Toggles the acting operator in `starredBy` — §7's index toggle. A field
 * `03-pages-and-dashboards.md` §2's model block omits; mirrors
 * `SavedReport.starredBy`, the same shape for the same control.
 */
export async function starPage(id: string, signal?: AbortSignal): Promise<Single<Page>> {
  if (DATA_SOURCE === 'http') return http.post<Single<Page>>(`/pages/${id}/star`, undefined, { signal })
  return mockMutation(PAGE_OPERATIONS.star, signal, () => {
    const row = pages.find((p) => p.id === id)
    if (!row) throw notFound('page', id)
    const me = currentMockUserId()
    const already = pageStarredBy(row).includes(me)
    const starred: Page = {
      ...row,
      starredBy: already ? pageStarredBy(row).filter((u) => u !== me) : [...pageStarredBy(row), me],
    }
    pages = pages.map((p) => (p.id === id ? starred : p))
    return { data: { ...starred } }
  })
}

export function resetPages(): void {
  if (!fixturesLoaded()) return
  pages = pageFixtures.map((p) => ({ ...p }))
}
