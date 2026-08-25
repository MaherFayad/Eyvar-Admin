/**
 * The two things every mock client does before it returns: wait, and check
 * whether QA has rigged it to fail.
 *
 * Both live here so no client can quietly skip either. A mock that resolves
 * synchronously hides the loading state; a mock that cannot fail hides the
 * error state. Those are two of the four states every screen owes.
 */

import { getMockLatency, mockFailures, registerOperations } from '../config'
import { ApiError } from '../types/common'

/** Latency is deterministic — a fixed value, never jittered. Visual regression cannot diff jitter. */
export function delay(ms: number = getMockLatency()): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Abortable delay, so a mock honours `params.signal` exactly as `fetch` would. */
export function delayAbortable(signal?: AbortSignal, ms: number = getMockLatency()): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError())
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(abortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function abortError(): ApiError {
  return new ApiError({
    status: 0,
    kind: 'network',
    code: 'aborted',
    message: 'Request aborted',
    retryable: false,
  })
}

/**
 * The single entry point every mock implementation uses.
 *
 * ```ts
 * export async function listDrivers(params: DriverQuery): Promise<Paginated<Driver>> {
 *   if (DATA_SOURCE === 'http') return http.get(...)
 *   return mock('drivers.list', params.signal, () => paginate(filter(driverFixtures, params), params))
 * }
 * ```
 *
 * Order matters: wait first, then fail. Failing before the delay would resolve
 * the error state instantly and hide the fact that a real failure also takes
 * time — which is precisely the case a spinner-to-error transition must handle.
 */
export async function mock<T>(
  operation: string,
  signal: AbortSignal | undefined,
  produce: () => T,
): Promise<T> {
  registerOperations(operation)
  await delayAbortable(signal)
  const injected = mockFailures.take(operation)
  if (injected) throw injected
  return produce()
}

/** For mutations, which should be slower than a read so an optimistic UI is visibly wrong if it lies. */
export async function mockMutation<T>(
  operation: string,
  signal: AbortSignal | undefined,
  produce: () => T,
): Promise<T> {
  registerOperations(operation)
  await delayAbortable(signal, Math.round(getMockLatency() * 1.5))
  const injected = mockFailures.take(operation)
  if (injected) throw injected
  return produce()
}

/** Throw the canonical 404 from a mock lookup. Keeps `not-found` copy consistent across clients. */
export function notFound(resource: string, id: string): ApiError {
  return new ApiError({
    status: 404,
    kind: 'not-found',
    code: 'not_found',
    message: `No ${resource} with id ${id}`,
    retryable: false,
  })
}
