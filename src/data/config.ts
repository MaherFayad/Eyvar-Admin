/**
 * The switch. This is the only file that knows whether the app is talking to
 * fixtures or to a server, and the only file a backend cutover has to touch
 * besides `clients/http.ts`.
 *
 * Nothing outside `src/data/` imports this. Components import clients.
 */

import { ApiError } from './types/common'

export type DataSource = 'mock' | 'http'

/* ───────────────────────── environment ─────────────────────── */

/**
 * Read once, defensively: this module must load under Vite (`import.meta.env`),
 * under Vitest (same), and under a bare Node script (neither). A throw here
 * would take down every screen.
 */
function readEnv(key: string): string | undefined {
  try {
    const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env
    if (viteEnv && typeof viteEnv[key] === 'string') return viteEnv[key]
  } catch {
    /* not a module-graph that defines import.meta.env */
  }
  // Declared locally rather than pulling in `@types/node`: this file must
  // typecheck in a browser-only tsconfig, and the data layer has no other Node
  // dependency.
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  if (nodeEnv && typeof nodeEnv[key] === 'string') return nodeEnv[key]
  return undefined
}

/**
 * `mock` until a backend exists. Flip with `VITE_DATA_SOURCE=http`.
 *
 * Deliberately a `const`, not a mutable module variable: a data source that can
 * change at runtime means a screen can be half-mocked, which is the one bug
 * class this seam exists to prevent. Tests that need the other mode build the
 * client with an explicit transport instead.
 */
export const DATA_SOURCE: DataSource = readEnv('VITE_DATA_SOURCE') === 'http' ? 'http' : 'mock'

/** Base URL for the http transport. Empty string means same-origin `/api/...`. */
export const API_BASE_URL: string = readEnv('VITE_API_BASE_URL') ?? ''

/** Version prefix, so the endpoint comments above each client stay literally true. */
export const API_VERSION = 'v1'

/* ─────────────────────── mock latency ──────────────────────── */

/**
 * Artificial latency for mock clients. Non-zero **on purpose**: a synchronous
 * mock resolves before React paints, the loading state never renders, and the
 * loading state then never gets built. 320 ms is long enough to see a skeleton
 * and short enough not to be annoying to work against.
 *
 * Mutable — but only through `setMockLatency`, and only two callers should:
 * the test setup (0 ms) and a QA devtool (2500 ms, to inspect a skeleton).
 */
let mockLatencyMs = Number(readEnv('VITE_MOCK_LATENCY_MS') ?? 320)

export function getMockLatency(): number {
  return mockLatencyMs
}

export function setMockLatency(ms: number): void {
  mockLatencyMs = Math.max(0, ms)
}

/** Convenience for `beforeEach` in behaviour tests that are not testing the skeleton. */
export function disableMockLatency(): void {
  setMockLatency(0)
}

/* ───────────────────── failure injection ───────────────────── */

/**
 * Every client operation has a stable string id — `'drivers.list'`,
 * `'session.current'`, `'navCounts.list'` — and QA can make any of them fail
 * without editing a fixture or a component. A data layer that can only succeed
 * produces a UI that only handles success.
 *
 * Three ways in:
 *   1. `mockFailures.always('drivers.list')`      — until cleared
 *   2. `mockFailures.once('drivers.list')`        — next call only, then clears
 *   3. `?mockFail=drivers.list,trips.list`        — from the URL, seeded at boot
 *
 * The URL form matters: it is how a QA engineer reaches an error state on a
 * deployed preview build with no console access, and how a Playwright visual
 * test pins the error state without reaching into app internals.
 */
export type MockFailureMode = 'always' | 'once'

interface MockFailureEntry {
  mode: MockFailureMode
  error: ApiError
}

const failures = new Map<string, MockFailureEntry>()

/** The failure QA gets when they do not name one. Retryable, so the ErrorState offers `Retry`. */
export function defaultInjectedError(operation: string): ApiError {
  return new ApiError({
    status: 503,
    kind: 'server',
    code: 'mock_injected_failure',
    message: `Injected failure for "${operation}"`,
    requestId: `mock-${operation}`,
    retryable: true,
  })
}

export const mockFailures = {
  /** Fail every call to `operation` until `clear`. */
  always(operation: string, error?: ApiError): void {
    failures.set(operation, { mode: 'always', error: error ?? defaultInjectedError(operation) })
  },

  /** Fail the next call to `operation`, then behave normally — for testing retry. */
  once(operation: string, error?: ApiError): void {
    failures.set(operation, { mode: 'once', error: error ?? defaultInjectedError(operation) })
  },

  /**
   * Called by every mock client before it returns. Returns the error to throw,
   * or `null`. Consuming a `once` entry is the side effect — that is why this
   * is `take` and not `get`.
   */
  take(operation: string): ApiError | null {
    const entry = failures.get(operation)
    if (!entry) return null
    if (entry.mode === 'once') failures.delete(operation)
    return entry.error
  },

  /** Inspect without consuming. For assertions in tests. */
  peek(operation: string): ApiError | null {
    return failures.get(operation)?.error ?? null
  },

  clear(operation?: string): void {
    if (operation === undefined) failures.clear()
    else failures.delete(operation)
  },

  /** Every operation currently rigged to fail. Powers a QA devtool panel. */
  list(): string[] {
    return [...failures.keys()].sort()
  },
}

/**
 * Seed failures from `?mockFail=a,b,c`. Call once at boot, before the first
 * render, from the app entry point. No-op outside a browser and outside mock
 * mode — an injected failure in http mode would be a lie.
 */
export function seedMockFailuresFromLocation(search?: string): string[] {
  if (DATA_SOURCE !== 'mock') return []
  const raw = search ?? (typeof window !== 'undefined' ? window.location.search : '')
  if (!raw) return []
  const value = new URLSearchParams(raw).get('mockFail')
  if (!value) return []
  const ops = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  ops.forEach((op) => mockFailures.always(op))
  return ops
}

/**
 * Every operation id the data layer exposes, so `?mockFail=` can be validated
 * and a QA panel can list them. Each client registers its ids here at module
 * load; the registry is append-only and deduplicated.
 */
const operationIds = new Set<string>()

export function registerOperations(...ids: string[]): void {
  ids.forEach((id) => operationIds.add(id))
}

export function knownOperations(): string[] {
  return [...operationIds].sort()
}
