/**
 * The real transport. **Typed and wired, not yet pointed at anything** — there
 * is no backend to talk to. It compiles, it is exercised by unit tests against
 * a stubbed `fetch`, and flipping `VITE_DATA_SOURCE=http` makes every client use
 * it without a single component changing.
 *
 * Two invariants make the swap safe:
 *   1. It throws `ApiError` and nothing else — the same type the mocks throw.
 *   2. It serialises `QueryParams` in one place, so `?view=`, `?sort=`,
 *      `?filter[]=` mean the same thing on every endpoint. The wire format
 *      below is a **proposal to whoever builds the API**; if the server
 *      disagrees, `toSearchParams` is the only thing that changes.
 */

import { API_BASE_URL, API_VERSION } from '../config'
import { ApiError, kindForStatus, type QueryParams } from '../types/common'

export interface HttpRequestOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
}

/**
 * Wire format for `QueryParams`:
 *   `page`      1-based integer
 *   `pageSize`  integer
 *   `q`         free text
 *   `view`      view-tab id
 *   `sort`      `field:asc` / `field:desc`
 *   `filter`    repeated, `field:op:value` — arrays comma-joined, e.g. `status:in:active,frozen`
 */
export function toSearchParams(params: QueryParams = {}): URLSearchParams {
  const sp = new URLSearchParams()
  if (params.page !== undefined) sp.set('page', String(params.page))
  if (params.pageSize !== undefined) sp.set('pageSize', String(params.pageSize))
  if (params.q) sp.set('q', params.q)
  if (params.view) sp.set('view', params.view)
  if (params.sort) sp.set('sort', `${params.sort.field}:${params.sort.dir}`)
  for (const f of params.filters ?? []) {
    const value = Array.isArray(f.value) ? f.value.join(',') : String(f.value ?? '')
    sp.append('filter', `${f.field}:${f.op}:${value}`)
  }
  return sp
}

/**
 * Params may carry resource-specific keys on top of `QueryParams` — `status`,
 * `kind`, `riderId`. Both are serialised: the `QueryParams` fields through
 * `toSearchParams`, everything else as a plain scalar pair. `signal` is skipped;
 * it belongs to the request, not the query string.
 */
export type RequestParams = QueryParams & Record<string, unknown>

const QUERY_PARAM_KEYS = new Set(['page', 'pageSize', 'q', 'sort', 'filters', 'view', 'signal'])

export function buildUrl(path: string, params?: RequestParams): string {
  const base = `${API_BASE_URL}/api/${API_VERSION}${path.startsWith('/') ? path : `/${path}`}`
  if (!params) return base
  const sp = toSearchParams(params)
  for (const [key, value] of Object.entries(params)) {
    if (QUERY_PARAM_KEYS.has(key)) continue
    if (value === undefined || value === null) continue
    sp.set(key, String(value))
  }
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  init: { params?: RequestParams; body?: unknown } & HttpRequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, init.params)
  let response: Response
  try {
    response = await fetch(url, {
      method,
      signal: init.signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch (cause) {
    // fetch only rejects on network failure or abort — both are status 0 to us.
    const aborted = (cause as Error | undefined)?.name === 'AbortError'
    throw new ApiError({
      status: 0,
      kind: 'network',
      code: aborted ? 'aborted' : 'network_error',
      message: aborted ? 'Request aborted' : 'Could not reach the server',
      retryable: !aborted,
    })
  }

  if (response.status === 204) return undefined as T

  const requestId = response.headers.get('x-request-id')
  const payload = await safeJson(response)

  if (!response.ok) {
    const body = (payload ?? {}) as {
      code?: string
      message?: string
      details?: ApiError['details']
    }
    throw new ApiError({
      status: response.status,
      kind: kindForStatus(response.status),
      code: body.code ?? 'http_error',
      message: body.message ?? response.statusText ?? 'Request failed',
      details: body.details ?? [],
      requestId,
    })
  }

  return payload as T
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError({
      status: response.status,
      kind: 'server',
      code: 'malformed_response',
      message: 'The server returned a response this app could not read',
      requestId: response.headers.get('x-request-id'),
      retryable: true,
    })
  }
}

/**
 * **The one read that does not return JSON.**
 *
 * `request` above assumes a JSON body on every response, which is right for 46
 * of the 47 clients and wrong for the object-store read behind a compliance
 * scan — `types/driver.ts` calls it *"a separate, streaming, separately-permitted
 * read"* and it hands back image or PDF bytes with a `Content-Type`, not a
 * document.
 *
 * Three answers, and the middle one is the reason this is not just `fetch`:
 *
 *   - **200** — bytes, with the media type the store holds them under.
 *   - **204** — the record exists and holds no object. **Not an error**, so it
 *     resolves as `null` rather than throwing. The caller turns it into its own
 *     honest outcome; see `ComplianceDocumentFileRead`.
 *   - anything else — the same `ApiError` every other client throws, so a 403
 *     stays a refusal and a 503 stays a failure, and the two do not merge.
 *
 * `Accept` is set by the caller: only the caller knows which media types its
 * own type union can actually decode.
 */
async function requestBytes(
  path: string,
  init: { params?: RequestParams } & HttpRequestOptions = {},
): Promise<{ mimeType: string; bytes: Uint8Array } | null> {
  const url = buildUrl(path, init.params)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      signal: init.signal,
      credentials: 'include',
      headers: { Accept: '*/*', ...init.headers },
    })
  } catch (cause) {
    const aborted = (cause as Error | undefined)?.name === 'AbortError'
    throw new ApiError({
      status: 0,
      kind: 'network',
      code: aborted ? 'aborted' : 'network_error',
      message: aborted ? 'Request aborted' : 'Could not reach the server',
      retryable: !aborted,
    })
  }

  if (response.status === 204) return null

  if (!response.ok) {
    /* An error body is JSON even on a binary endpoint — a store that streams
       bytes on success still has to explain a 403 in words — but **a body this
       cannot parse must not change the status**. `request` throws
       `malformed_response` on unreadable JSON, which is right for an endpoint
       whose success case is JSON and wrong here: an object store answering a
       403 with an HTML error page would arrive as a retryable 502, and a
       refusal read as a failure is the one confusion this endpoint exists to
       avoid. The status is the diagnosis; the body only decorates it. */
    const body = await safeJson(response).catch(() => null) as {
      code?: string
      message?: string
      details?: ApiError['details']
    } | null
    throw new ApiError({
      status: response.status,
      kind: kindForStatus(response.status),
      code: body?.code ?? 'http_error',
      message: body?.message ?? response.statusText ?? 'Request failed',
      details: body?.details ?? [],
      requestId: response.headers.get('x-request-id'),
    })
  }

  const mimeType = (response.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? ''
  return { mimeType, bytes: new Uint8Array(await response.arrayBuffer()) }
}

export const http = {
  get: <T>(path: string, params?: RequestParams, opts?: HttpRequestOptions) =>
    request<T>('GET', path, { params, ...opts }),
  /** Bytes rather than JSON, `null` on a 204. See `requestBytes`. */
  bytes: (path: string, params?: RequestParams, opts?: HttpRequestOptions) =>
    requestBytes(path, { params, ...opts }),
  post: <T>(path: string, body?: unknown, opts?: HttpRequestOptions) => request<T>('POST', path, { body, ...opts }),
  patch: <T>(path: string, body?: unknown, opts?: HttpRequestOptions) => request<T>('PATCH', path, { body, ...opts }),
  put: <T>(path: string, body?: unknown, opts?: HttpRequestOptions) => request<T>('PUT', path, { body, ...opts }),
  delete: <T>(path: string, opts?: HttpRequestOptions) => request<T>('DELETE', path, opts),
}
