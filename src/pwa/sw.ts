/**
 * **The service worker.** Built by `vite-plugin-pwa` in `injectManifest` mode,
 * emitted as `dist/sw.js`.
 *
 * ## Why this is hand-written rather than generated
 *
 * `docs/ref/pwa.md`: *"Prefer `vite-plugin-pwa` with an explicit Workbox config
 * you can read over anything generated."* The plugin is used, in the mode where
 * it contributes exactly one thing — the precache manifest, substituted for
 * `self.__WB_MANIFEST` at build time, which is the part that genuinely needs
 * build-time knowledge of the hashed filenames. Everything else is here, in
 * order, in about two hundred readable lines.
 *
 * The Workbox **runtime** packages are deliberately not installed. They would
 * add five more production-adjacent dependencies to an operations console in
 * exchange for expressing the policy in `urlPattern` regexes — which is a worse
 * form for this policy than the table in `cachePolicy.ts`, because the
 * distinction that matters here (*is this a money figure?*) is domain
 * knowledge, not a URL shape. The only dependency added is `vite-plugin-pwa`
 * itself, dev-only.
 *
 * ## Order of operations, and why it is this order
 *
 * 1. **Kill switch, before anything else.** `install` asks `isKilledRemotely()`
 *    before it opens a cache. There is no path through this file that writes a
 *    cache entry before the kill check has returned.
 * 2. **Version, derived from the manifest.** `CACHE_VERSION` is a fingerprint of
 *    the precache manifest, so it changes exactly when the build's assets
 *    change, and it cannot be forgotten the way a hand-bumped constant can.
 * 3. **Everything not explicitly cacheable is not intercepted at all.** Money,
 *    auth, session, reports, exports and every non-`GET` fall straight through
 *    to the network. See `cachePolicy.ts` for why that is stricter than
 *    network-first and why stricter is correct here.
 *
 * ## What it does not do
 *
 * No mutation queue (P3 — needs `docs/07-api/OPEN-QUESTIONS.md` Q3 answered)
 * and no push handler (P4 — needs a backend). Neither is stubbed: an empty
 * `push` listener is a worse artefact than no listener, because it reports as
 * "push is wired" to anyone reading the file.
 */

import {
  HEADER_CACHED_AT,
  HEADER_FROM_CACHE,
  MSG_CHECK_KILL_SWITCH,
  MSG_KILLED,
  MSG_REVALIDATED,
  MSG_SERVED_FROM_CACHE,
  MSG_SKIP_WAITING,
  CACHE_PREFIX,
  DISABLE_QUERY_PARAM,
  DISABLE_QUERY_VALUE,
  readCacheName,
  shellCacheName,
  type WorkerMessage,
} from './protocol'
import { classify } from './cachePolicy'
import { deleteOwnCaches, isKilledRemotely, KILL_SWITCH_POLL_MS } from './killSwitch'
import type {
  EyvarWorkerScope,
  ExtendableEventLike,
  ExtendableMessageEventLike,
  FetchEventLike,
  PrecacheEntry,
} from './workerGlobals'

const sw = self as unknown as EyvarWorkerScope

/* ─────────────────────────── the version ───────────────────────────── */

/**
 * `vite-plugin-pwa` replaces this expression with the literal manifest array.
 * `?? []` covers the dev build, where the plugin is not running and the
 * expression survives as `undefined`.
 *
 * **Written as `self.__WB_MANIFEST`, not `sw.__WB_MANIFEST`, and that is not a
 * style choice.** Workbox's `injectManifest` does a literal string search for
 * `self.__WB_MANIFEST` in the BUNDLED output; the typed `sw` alias does not
 * survive bundling as that token, so the build failed with *"Unable to find a
 * place to inject the manifest"* and produced a worker that precached nothing.
 * The cast keeps the typing that `workerGlobals.ts` exists to provide.
 */
const MANIFEST: PrecacheEntry[] =
  (self as unknown as EyvarWorkerScope).__WB_MANIFEST ?? []

/**
 * FNV-1a over the manifest — every URL and every revision.
 *
 * A hand-bumped `CACHE_VERSION = 3` is the constant everyone forgets, and the
 * symptom of forgetting it is an operator served last week's JavaScript. A
 * fingerprint of the thing being cached cannot be forgotten: change one asset
 * and the version moves; change nothing and it does not, so a rebuild with no
 * asset changes does not needlessly evict a warm cache.
 */
function fingerprint(entries: readonly PrecacheEntry[]): string {
  let hash = 0x811c9dc5
  const material = entries.map((entry) => `${entry.url}|${entry.revision ?? ''}`).join('\n')
  for (let index = 0; index < material.length; index += 1) {
    hash ^= material.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

const CACHE_VERSION = fingerprint(MANIFEST)
const SHELL_CACHE = shellCacheName(CACHE_VERSION)
const READ_CACHE = readCacheName(CACHE_VERSION)

/** Absolute URL for a manifest entry, resolved against the registration scope. */
function absolute(url: string): string {
  return new URL(url, sw.registration.scope).toString()
}

/** The document every offline navigation falls back to. */
const SHELL_DOCUMENT = absolute('index.html')

/* ───────────────────────────── install ─────────────────────────────── */

sw.addEventListener('install', (event: ExtendableEventLike) => {
  event.waitUntil(onInstall())
})

async function onInstall(): Promise<void> {
  /* THE FIRST THING THAT HAPPENS. Before `caches.open`, before `addAll`. If the
     kill file says stop, this build never writes a cache entry at all. */
  const killed = await isKilledRemotely()
  if (killed !== false) {
    await selfDestruct(killed)
    return
  }

  const cache = await sw.caches.open(SHELL_CACHE)
  await Promise.all(
    MANIFEST.map(async (entry) => {
      /* A content-hashed filename is immutable, so the HTTP cache may answer it.
         A revisioned one (`index.html`) is not, and `reload` is what stops a CDN
         handing us the copy we are trying to replace. */
      const request = new Request(absolute(entry.url), {
        cache: entry.revision === null ? 'default' : 'reload',
        credentials: 'same-origin',
      })
      const response = await fetch(request)
      if (!response.ok) throw new Error(`Precache failed for ${entry.url}: ${response.status}`)
      await cache.put(request.url, stampCachedAt(response))
    }),
  )

  /* No previous worker means nobody is depending on an older cache, so taking
     over immediately is free. When there IS one, we wait: 42 routes are
     `React.lazy`, and an open session holding references to the previous
     build's chunks must keep being served the previous build's precache until
     it navigates. `register.ts` surfaces the waiting worker; the operator
     decides when to take it. */
  if (!sw.registration.active) await sw.skipWaiting()
}

/* ───────────────────────────── activate ────────────────────────────── */

sw.addEventListener('activate', (event: ExtendableEventLike) => {
  event.waitUntil(onActivate())
})

async function onActivate(): Promise<void> {
  const killed = await isKilledRemotely()
  if (killed !== false) {
    await selfDestruct(killed)
    return
  }

  /* Prefix-scoped, version-aware. Anything of ours that is not this version is
     a previous build's, and nothing else on the origin is touched. */
  for (const name of await sw.caches.keys()) {
    if (!name.startsWith(CACHE_PREFIX)) continue
    if (name === SHELL_CACHE || name === READ_CACHE) continue
    await sw.caches.delete(name)
  }

  await sw.clients.claim()
}

/* ────────────────────────────── fetch ──────────────────────────────── */

sw.addEventListener('fetch', (event: FetchEventLike) => {
  const request = event.request
  if (request.method !== 'GET') return

  let url: URL
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  const isNavigation = request.mode === 'navigate'

  /* The escape hatch, honoured by the worker itself. `register.ts` also handles
     it, but that code lives in the bundle this worker is serving — so if the
     bundle is the broken thing, this is the branch that saves the operator.

     **`notifyClients: false`, and that is the whole fix for a measured defect:
     the hatch used to need two attempts.** Broadcasting `MSG_KILLED` here tells
     every OPEN tab to reload, and `register.ts` reloads them at their own URL —
     which does not carry `?pwa=off`. That reload is a second navigation, and
     the browser cancels the first one to service it, so the navigation carrying
     the escape parameter never lands. `register.ts` therefore never sees
     `?pwa=off`, never writes the sticky flag, and re-registers the worker the
     operator was trying to get rid of.

     Measured, at 390x844 against `npm run dev`: after `?pwa=off` the tab ended
     on `/` with **1 registration, 1 cache and `eyvar.pwa.disabled` unset**.
     The same script had passed on an earlier run — it is a race, which is worse
     than a reliable failure, because the hatch appears to work when you test it
     and fails on the night it is needed.

     There is nothing to notify here anyway. The page that asked is mid-
     navigation and is about to run `register.ts`'s teardown branch itself. The
     REMOTE kill file still broadcasts, because in that case no page asked for
     anything and telling them is the entire point. */
  if (isNavigation && url.searchParams.get(DISABLE_QUERY_PARAM) === DISABLE_QUERY_VALUE) {
    event.waitUntil(selfDestruct('escape hatch', false))
    return
  }

  /* A long shift never reloads the page, so the poll has to hang off traffic. */
  event.waitUntil(maybeCheckKillSwitch())

  if (isNavigation) {
    event.respondWith(handleNavigation(request))
    return
  }

  const cacheClass = classify({
    pathname: url.pathname,
    method: request.method,
    sameOrigin: url.origin === new URL(sw.registration.scope).origin,
  })

  /* `money` and `no-store` return without calling `respondWith`, which hands the
     request back to the browser untouched. There is no code below this line
     that can put a money figure in a cache. */
  if (cacheClass === 'shell') event.respondWith(handleShell(request))
  else if (cacheClass === 'read') event.respondWith(handleRead(request, url));
})

/**
 * Navigations: network first, precached shell second.
 *
 * Network first rather than cache first, because the served document names the
 * hashed asset filenames. Serving a cached `index.html` after a deploy points a
 * fresh session at chunks that no longer exist — a blank screen with a 404 in
 * the console, which is a worse offline story than the one being solved. An SPA
 * makes one document request per session, so the cost is one round trip.
 */
async function handleNavigation(request: Request): Promise<Response> {
  try {
    return await fetch(request)
  } catch {
    const cache = await sw.caches.open(SHELL_CACHE)
    const shell = await cache.match(SHELL_DOCUMENT)
    if (shell) return shell
    /* Never precached — a first visit with no network. Nothing to serve, and
       the browser's own offline page is more honest than an empty 200. */
    throw new Error('Offline, and the app shell has not been cached yet.')
  }
}

/**
 * Shell assets: cache-first against the **precache only**.
 *
 * A miss goes to the network and is *not* stored. Storing every same-origin GET
 * would make the shell cache unbounded and would quietly cache things nobody
 * classified — the precache manifest is the whole list of what this app is, and
 * anything outside it is somebody else's request.
 */
async function handleShell(request: Request): Promise<Response> {
  const cache = await sw.caches.open(SHELL_CACHE)
  const hit = await cache.match(request.url)
  if (hit) return hit
  return fetch(request)
}

/**
 * Index and detail reads: stale-while-revalidate, **and the staleness is
 * broadcast**.
 *
 * The broadcast is not decoration. `docs/ref/pwa.md`: *"A cached figure is never
 * rendered as if it were live. If you cannot show the staleness, you may not
 * serve the cache."* The worker is the only party that knows a response came
 * from a cache, so it is the only party that can tell the truth about it —
 * `freshness.ts` receives these messages and `useDataFreshness()` exposes them.
 * The `x-eyvar-from-cache` and `x-eyvar-cached-at` headers carry the same fact
 * on the response itself, for a data layer that later wants to read it inline.
 */
async function handleRead(request: Request, url: URL): Promise<Response> {
  const cache = await sw.caches.open(READ_CACHE)
  const cached = await cache.match(request.url)

  const revalidate = async (): Promise<Response> => {
    const response = await fetch(request)
    if (isStorable(response)) await cache.put(request.url, stampCachedAt(response.clone()))
    broadcast({ type: MSG_REVALIDATED, path: url.pathname })
    return response
  }

  if (!cached) {
    /* Cold. No catch: an offline first read must reach the screen's error state
       as a genuine network failure, not as a synthetic status this app invented.
       `http.ts` turns a rejected `fetch` into `ApiError { kind: 'network' }`. */
    return revalidate()
  }

  /* Warm. Revalidation runs past the response, under `waitUntil` at the call
     site, so the next read is fresh even though this one was not. */
  void revalidate().catch(() => undefined)

  const cachedAt = cached.headers.get(HEADER_CACHED_AT) ?? new Date(0).toISOString()
  const ageMs = Math.max(0, Date.now() - Date.parse(cachedAt))
  broadcast({ type: MSG_SERVED_FROM_CACHE, path: url.pathname, cachedAt, ageMs })

  return withHeaders(cached, { [HEADER_FROM_CACHE]: '1' })
}

/**
 * Only a plain, complete, cacheable 200 is stored.
 *
 * `Vary: *` means the response is not reusable by definition. `no-store` is the
 * server telling us not to, and a server that says so about a read outranks this
 * policy — the table in `cachePolicy.ts` decides what we *may* cache, not what
 * we may cache over an explicit refusal.
 */
function isStorable(response: Response): boolean {
  if (response.status !== 200 || response.type === 'opaque') return false
  if (response.headers.get('vary') === '*') return false
  return !(response.headers.get('cache-control') ?? '').includes('no-store')
}

/** Copy a response with `x-eyvar-cached-at` set to now. Body is streamed, not read. */
function stampCachedAt(response: Response): Response {
  return withHeaders(response, { [HEADER_CACHED_AT]: new Date().toISOString() })
}

function withHeaders(response: Response, extra: Record<string, string>): Response {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(extra)) headers.set(name, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

/* ──────────────────────── the kill switch poll ─────────────────────── */

let lastKillCheck = Date.now()
let killCheckInFlight: Promise<void> | null = null

/**
 * Throttled to `KILL_SWITCH_POLL_MS`, and de-duplicated, so a page firing forty
 * requests does not fire forty checks. The clock starts at activation rather
 * than at zero, because `install` and `activate` have already checked.
 */
async function maybeCheckKillSwitch(): Promise<void> {
  if (killCheckInFlight) return killCheckInFlight
  if (Date.now() - lastKillCheck < KILL_SWITCH_POLL_MS) return
  killCheckInFlight = (async () => {
    lastKillCheck = Date.now()
    const killed = await isKilledRemotely()
    if (killed !== false) await selfDestruct(killed)
  })().finally(() => {
    killCheckInFlight = null
  })
  return killCheckInFlight
}

/**
 * Delete every cache, unregister, and — usually — tell the pages why.
 *
 * Order matters: caches first, because `unregister()` may complete and tear
 * this worker down before a later step runs. `register.ts` decides what to do
 * with `MSG_KILLED` — it reloads once per session, guarded, never in a loop.
 *
 * `notifyClients` is `false` for exactly one caller, the `?pwa=off` navigation.
 * See that branch for the race it fixes. Every other caller — install, activate
 * and the remote poll — notifies, because in those cases nobody asked and a
 * page left running on a killed build is the failure being prevented.
 */
async function selfDestruct(reason: string, notifyClients = true): Promise<void> {
  await deleteOwnCaches(sw.caches).catch(() => 0)
  if (notifyClients) broadcast({ type: MSG_KILLED, reason })
  await sw.registration.unregister().catch(() => false)
}

async function broadcast(message: WorkerMessage): Promise<void> {
  const clients = await sw.clients.matchAll({ type: 'window' })
  for (const client of clients) client.postMessage(message)
}

/* ───────────────────────────── messages ────────────────────────────── */

sw.addEventListener('message', (event: ExtendableMessageEventLike) => {
  const type = (event.data as { type?: unknown } | null)?.type
  if (type === MSG_SKIP_WAITING) {
    event.waitUntil(sw.skipWaiting())
    return
  }
  if (type === MSG_CHECK_KILL_SWITCH) {
    /* Forced, not throttled: this is somebody asking on purpose. */
    lastKillCheck = 0
    event.waitUntil(maybeCheckKillSwitch())
  }
})
