/**
 * The error taxonomy. `HttpError` is the only way a handler fails
 * (`docs/09-analytics-v2/05-backend.md` §4: "the router wraps every handler:
 * auth → permission → idempotency → handler → envelope. A thrown
 * HttpError(status, code, details) is the only way to fail."). `errorResponse`
 * turns one into the exact JSON shape `docs/07-api/CONTRACT.md` §5 declares,
 * reusing the frontend's own `kindForStatus`/`isRetryableStatus` so the two
 * sides cannot drift on what a status means.
 */

import { kindForStatus, isRetryableStatus } from '@/data/types/common'
import type { ApiErrorDetail, ApiErrorKind } from '@/data/types/common'
import type { PermissionKey } from '@/data/types/navigation'

export type { ApiErrorDetail, ApiErrorKind }

/** The wire body for every non-2xx response. Mirrors `ApiError`'s fields in `common.ts`. */
export interface ApiErrorBody {
  status: number
  kind: ApiErrorKind
  code: string
  message: string
  details: ApiErrorDetail[]
  requestId: string | null
  retryable: boolean
}

export class HttpError extends Error {
  readonly status: number
  readonly kind: ApiErrorKind
  readonly code: string
  readonly details: ApiErrorDetail[]
  readonly retryable: boolean

  constructor(
    status: number,
    code: string,
    message: string,
    details: ApiErrorDetail[] = [],
    opts: { kind?: ApiErrorKind; retryable?: boolean } = {},
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
    this.kind = opts.kind ?? kindForStatus(status)
    this.retryable = opts.retryable ?? isRetryableStatus(status)
  }
}

export function notFoundError(path: string): HttpError {
  return new HttpError(404, 'not_found', `No route matches ${path}`, [], { retryable: false })
}

/** A path matched a route pattern but not this method — distinct from 404, per `router.ts`. */
export function methodNotAllowedError(method: string, path: string): HttpError {
  return new HttpError(405, 'method_not_allowed', `${method} is not allowed on ${path}`, [], {
    retryable: false,
  })
}

export function unauthorizedError(message = 'Sign in to continue'): HttpError {
  return new HttpError(401, 'unauthorized', message, [], { retryable: false })
}

/**
 * Q1 (`05-backend.md` §2): a 403 names the permission it refused —
 * `details[0] = { field: <PermissionKey>, code: 'permission' }` — so the
 * refusal copy can say who can grant it (`CONTRACT.md` §11).
 */
export function forbiddenError(permission: PermissionKey): HttpError {
  const message = `Missing permission: ${permission}`
  return new HttpError(403, 'forbidden', message, [{ field: permission, code: 'permission', message }], {
    retryable: false,
  })
}

export function validationError(details: ApiErrorDetail[], message = 'Validation failed'): HttpError {
  return new HttpError(422, 'validation', message, details, { retryable: false })
}

/** `PATCH /pages/:id` on a stale `version` — `05-backend.md` §7. */
export function conflictError(details: ApiErrorDetail[], message = 'Conflict'): HttpError {
  return new HttpError(409, 'conflict', message, details, { retryable: false })
}

function internalError(cause: unknown): HttpError {
  // The cause is for server logs; the wire body never leaks internals.
  console.error(cause)
  return new HttpError(500, 'internal_error', 'Something went wrong', [], {
    kind: 'server',
    retryable: true,
  })
}

/** Converts whatever a handler threw into the `Response` the contract specifies. */
export function errorResponse(err: unknown, requestId: string): Response {
  const httpError = err instanceof HttpError ? err : internalError(err)
  const body: ApiErrorBody = {
    status: httpError.status,
    kind: httpError.kind,
    code: httpError.code,
    message: httpError.message,
    details: httpError.details,
    requestId,
    retryable: httpError.retryable,
  }
  return new Response(JSON.stringify(body), {
    status: httpError.status,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  })
}
