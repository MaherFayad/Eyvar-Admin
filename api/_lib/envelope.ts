/**
 * The list and `Single<T>` envelopes, and offset pagination (CONTRACT.md §2,
 * 05-backend.md §2 Q2). Types re-export from `common.ts` so server and
 * clients cannot disagree about the shape.
 */

import { DEFAULT_PAGE_SIZE } from '@/data/types/common'
import type { CountResult, Paginated, Single } from '@/data/types/common'

export type { CountResult, Paginated, Single }
export { DEFAULT_PAGE_SIZE }

export function single<T>(data: T): Single<T> {
  return { data }
}

/**
 * A bare-`T` response, for endpoints CONTRACT.md §2 marks as the exception
 * to `Single<T>` — `session.ts`/`team.ts` clients call `http.get` directly
 * with no `.data` to unwrap, so the server must not wrap them either.
 */
export function jsonResponse<T = unknown>(data: T, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } })
}

export function countResult(count: number | null): CountResult {
  return { count }
}

/** Resolved offset pagination: `page` is 1-based, `offset`/`limit` are what the SQL wants. */
export interface OffsetPage {
  page: number
  pageSize: number
  offset: number
  limit: number
}

/** Clamps `page`/`pageSize` to sane positive integers, defaulting per `CONTRACT.md` §2. */
export function resolveOffsetPage(input: { page?: number; pageSize?: number }): OffsetPage {
  const page = Math.max(1, Math.trunc(input.page ?? 1) || 1)
  const pageSize = Math.max(1, Math.trunc(input.pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE)
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize }
}

/**
 * `total` is the count after filters, before pagination; `totalPages` has a
 * minimum of 1 so an empty result still has a page 1 (`CONTRACT.md` §2).
 */
export function paginated<T>(items: T[], total: number, page: number, pageSize: number): Paginated<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}
