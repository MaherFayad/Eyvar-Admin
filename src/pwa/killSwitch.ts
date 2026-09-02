/**
 * **The kill switch. Written before the first cache entry, on purpose.**
 *
 * `docs/ref/pwa.md`'s rule: *"A service worker is a cache you cannot easily
 * un-ship. Version it, and build the kill switch before the first cache
 * entry."* This module and `protocol.ts` were written before `sw.ts`, and
 * `sw.ts` consults `isKilled()` in its `install` handler **before** it opens a
 * cache — so there is no build of this app in which a worker can precache
 * before it has asked whether it is allowed to exist.
 *
 * ## The failure it defends against
 *
 * A worker that caches a broken build serves the broken build from its own
 * cache. Reloading does not help: the reload is answered by the broken worker.
 * Redeploying does not help either unless the operator's browser happens to
 * fetch the new worker script — and if the bad worker is intercepting
 * navigations wrongly, it may not. The escape has to be reachable without the
 * app's cooperation.
 *
 * ## Three independent routes out, none of which depends on the others
 *
 * 1. **`?pwa=off`** — handled in `register.ts` before registration, and in the
 *    worker's own `fetch` handler for navigations. Works when the page's
 *    JavaScript is broken, and works when the worker is the broken thing.
 * 2. **The remote kill file, `/pwa-kill-switch.json`** — a static file on the
 *    origin, fetched `no-store`, checked at install, at activate, and at most
 *    once every `KILL_SWITCH_POLL_MS` while the app is running. Flipping
 *    `disabled` to `true` and redeploying that one file disables the worker for
 *    every operator without touching the app. **This is the route that needs no
 *    action from the operator**, which is the only kind that works at 03:00.
 * 3. **`localStorage`** — once either of the first two fires, the flag sticks,
 *    so the app does not re-register the worker on the next load and then need
 *    killing again.
 *
 * The file is fetched, not `import`ed, because an imported constant is baked
 * into the bundle the broken worker is already serving.
 *
 * ## It fails toward staying alive
 *
 * A kill file that 404s, times out, or returns something unparseable means
 * **not killed**. Only an explicit `{"disabled": true}` kills. An offline
 * operator must not lose the app because the check could not complete — that
 * would make the offline shell self-defeating.
 */

import {
  DISABLE_QUERY_PARAM,
  DISABLE_QUERY_VALUE,
  DISABLE_STORAGE_KEY,
  ENABLE_QUERY_VALUE,
  KILL_SWITCH_PATH,
} from './protocol'
import { CACHE_PREFIX } from './protocol'

/** How often a long-lived session re-checks the file. Five minutes. */
export const KILL_SWITCH_POLL_MS = 5 * 60 * 1000

/** The shape of `public/pwa-kill-switch.json`. */
export interface KillSwitchFile {
  /** `true` disables the worker everywhere, on the next check. */
  disabled: boolean
  /** Free text for whoever finds it in a console. Never rendered to an operator. */
  reason?: string | null
}

/**
 * Read the file. `false` on any failure — see the header.
 *
 * `cache: 'no-store'` on both the HTTP cache and, because the worker's own
 * `fetch` handler classifies `KILL_SWITCH_PATH` as `no-store`, on ours.
 */
export async function isKilledRemotely(fetchImpl: typeof fetch = fetch): Promise<false | string> {
  try {
    const response = await fetchImpl(KILL_SWITCH_PATH, { cache: 'no-store', credentials: 'omit' })
    if (!response.ok) return false
    const body = (await response.json()) as Partial<KillSwitchFile> | null
    if (body?.disabled !== true) return false
    return typeof body.reason === 'string' && body.reason.length > 0 ? body.reason : 'kill switch'
  } catch {
    /* Offline, DNS failure, malformed JSON, wrong content type. None of those
       is a reason to take the app away from someone. */
    return false
  }
}

/* ─────────────────────── the sticky local flag ─────────────────────── */

/**
 * `localStorage` may throw — Safari private mode, a locked-down profile, an
 * enterprise policy. A storage failure must not stop the app booting, and it
 * must not accidentally read as "disabled".
 */
function readFlag(storage: Storage | undefined): boolean {
  try {
    return storage?.getItem(DISABLE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeFlag(storage: Storage | undefined, value: boolean): void {
  try {
    if (value) storage?.setItem(DISABLE_STORAGE_KEY, '1')
    else storage?.removeItem(DISABLE_STORAGE_KEY)
  } catch {
    /* Nothing to do and nothing to report. The query parameter still works for
       this page load; only its stickiness is lost. */
  }
}

export interface DisableDecision {
  /** Should the worker be disabled and torn down on this load? */
  disabled: boolean
  /** Did this load *change* the stored flag? Used only to decide on a reload. */
  changed: boolean
}

/**
 * Resolve `?pwa=off` / `?pwa=on` against the stored flag.
 *
 * Pure, and takes both inputs, so the whole hatch is unit-testable without a
 * browser — which matters, because this is the code path that has to work on
 * the day nothing else does.
 */
export function resolveDisableFlag(search: string, storage: Storage | undefined): DisableDecision {
  const stored = readFlag(storage)
  let parameter: string | null = null
  try {
    parameter = new URLSearchParams(search).get(DISABLE_QUERY_PARAM)
  } catch {
    parameter = null
  }

  if (parameter === DISABLE_QUERY_VALUE) {
    writeFlag(storage, true)
    return { disabled: true, changed: !stored }
  }
  if (parameter === ENABLE_QUERY_VALUE) {
    writeFlag(storage, false)
    return { disabled: false, changed: stored }
  }
  return { disabled: stored, changed: false }
}

/* ───────────────────────────── teardown ────────────────────────────── */

/**
 * Delete every cache this app owns. Prefix-scoped, so a cache belonging to
 * something else on the same origin is never touched — an ops console shares an
 * origin with whatever the business puts there next.
 */
export async function deleteOwnCaches(cacheStorage: CacheStorage | undefined): Promise<number> {
  if (!cacheStorage) return 0
  let deleted = 0
  for (const name of await cacheStorage.keys()) {
    if (!name.startsWith(CACHE_PREFIX)) continue
    if (await cacheStorage.delete(name)) deleted += 1
  }
  return deleted
}

/**
 * The page-side teardown: unregister every worker registered for this scope and
 * drop every cache. Called by `register.ts` when the flag resolves to disabled,
 * **before** it would otherwise have registered anything.
 *
 * Returns whether anything was actually there to remove, so the caller can
 * decide whether a reload is warranted. Reloading unconditionally would put a
 * page that was never controlled into a loop.
 */
export async function tearDownServiceWorkers(
  container: ServiceWorkerContainer | undefined,
  cacheStorage: CacheStorage | undefined,
): Promise<boolean> {
  let removed = false
  try {
    const registrations = (await container?.getRegistrations()) ?? []
    for (const registration of registrations) {
      if (await registration.unregister()) removed = true
    }
  } catch {
    /* `getRegistrations` rejects in a few sandboxed contexts. The cache purge
       below is still worth attempting. */
  }
  const deleted = await deleteOwnCaches(cacheStorage).catch(() => 0)
  return removed || deleted > 0
}
