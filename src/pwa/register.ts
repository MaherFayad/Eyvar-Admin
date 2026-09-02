/**
 * Registration, and the page half of the kill switch.
 *
 * Called once from `src/main.tsx`, after the root render is scheduled. Not from
 * a component and not from an effect: registration is a document-level side
 * effect that must happen once per document, and a component that renders twice
 * under `StrictMode` would do it twice.
 *
 * ## The order is the point
 *
 * 1. **Resolve `?pwa=off` first, before anything is registered.** If the answer
 *    is "disabled", every registration is torn down and every cache dropped, and
 *    this function returns without registering. That ordering is what makes the
 *    hatch work on a build whose worker is broken: nothing this file does can be
 *    reached *through* the worker, because the worker never gets registered.
 * 2. Start listening for worker messages **before** registering, so a message
 *    from an already-active worker on a warm load is not missed.
 * 3. Register.
 *
 * ## What it deliberately does not do
 *
 * **It does not reload the page when a new version activates.** `registerType:
 * 'autoUpdate'` and `workbox-window`'s auto-reload are both wrong for an
 * operations console: an operator mid-form loses the form. The new worker waits,
 * `useAppUpdate()` reports it, and taking the update is somebody's decision. The
 * one exception is a kill, which reloads once — because a kill means the current
 * build is the problem, and leaving the operator on it is the worse outcome.
 */

import { useCallback, useSyncExternalStore } from 'react'
import { applyWorkerMessage } from './freshness'
import { resolveDisableFlag, tearDownServiceWorkers } from './killSwitch'
import { MSG_KILLED, MSG_SKIP_WAITING, type WorkerMessage } from './protocol'
import { createStore } from './store'

/**
 * Where the worker lives, and how it must be registered — which is not the same
 * answer in both modes, and getting it wrong is a silent 404 rather than an
 * error anyone sees.
 *
 * In a build, `vite-plugin-pwa` emits `dist/sw.js` as a bundled classic script.
 * In dev with `devOptions.enabled`, there is no `/sw.js` at all: the plugin
 * serves `src/pwa/sw.ts` through Vite's transform pipeline at the literal URL
 * `/dev-sw.js?dev-sw`, with its imports left as ES modules. Registering it
 * `classic` fails on the first `import`, so dev registers `module`.
 *
 * Both strings are the plugin's, not ours — `DEV_SW_NAME` in
 * `vite-plugin-pwa/dist/chunk-*.js` and `filename` in `vite.config.ts`.
 */
export const SW_URL = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js'
export const SW_TYPE: WorkerType = import.meta.env.DEV ? 'module' : 'classic'
export const SW_SCOPE = '/'

/** Guards the post-kill reload to exactly one per tab, ever. */
const RELOAD_GUARD_KEY = 'eyvar.pwa.killReloaded'

export interface AppUpdateState {
  /** A newer worker is installed and waiting for the current one to release. */
  updateReady: boolean
  /** The worker disabled itself. The page is running uncontrolled from here on. */
  killed: boolean
}

const updateStore = createStore<AppUpdateState>({ updateReady: false, killed: false })

/**
 * Update and kill state, for whoever renders the affordance.
 *
 * Nothing renders it in P1 or P2 — see the handoff. The mechanism ships because
 * without it an operator who never closes the tab never gets a fix, and because
 * a store that arrives with its consumer is a store nobody tested.
 */
export function useAppUpdate(): AppUpdateState {
  const getServerSnapshot = useCallback(() => updateStore.get(), [])
  return useSyncExternalStore(updateStore.subscribe, updateStore.get, getServerSnapshot)
}

/** Ask the waiting worker to take over. The caller reloads afterwards. */
export function applyAppUpdate(container: ServiceWorkerContainer = navigator.serviceWorker): void {
  void container.getRegistration(SW_SCOPE).then((registration) => {
    registration?.waiting?.postMessage({ type: MSG_SKIP_WAITING })
  })
}

export interface RegisterOptions {
  /** Defaults to the real one; a test passes its own. */
  container?: ServiceWorkerContainer
  location?: { search: string; reload: () => void }
  storage?: Storage
  caches?: CacheStorage
  /**
   * Defaults to "yes, unless we are inside a test runner".
   *
   * It used to default to `import.meta.env.PROD`, which meant `npm run dev`
   * actively **unregistered** the worker on every load. That is now wrong in
   * both directions: `devOptions.enabled` serves a real worker in dev, and a
   * teardown on load would fight the registration two lines below it.
   *
   * The exclusion is vitest, not dev: jsdom has no `navigator.serviceWorker`,
   * so a test that does not pass a fake container returns at the guard anyway,
   * and one that does passes `enabled` explicitly.
   */
  enabled?: boolean
}

/**
 * Register the worker, or tear it down. Never throws — a PWA failing to install
 * must not stop the console loading.
 */
export async function registerServiceWorker(options: RegisterOptions = {}): Promise<void> {
  const {
    container = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker,
    location: loc = typeof window === 'undefined'
      ? undefined
      : { search: window.location.search, reload: () => window.location.reload() },
    storage = typeof localStorage === 'undefined' ? undefined : localStorage,
    caches: cacheStorage = typeof caches === 'undefined' ? undefined : caches,
    enabled = !import.meta.env.VITEST,
  } = options

  if (!container || !loc) return

  /* ── 1. the escape hatch, before anything is registered ── */
  const decision = resolveDisableFlag(loc.search, storage)
  if (decision.disabled || !enabled) {
    const removed = await tearDownServiceWorkers(container, cacheStorage)
    /* Only reload when there was something to remove AND this load is the one
       that asked. Reloading on every disabled load is a loop; reloading on none
       leaves the operator on the page the dead worker already served. */
    if (removed && decision.changed) loc.reload()
    return
  }

  /* ── 2. listen before registering ── */
  listenForWorkerMessages(container, loc)

  /* ── 3. register ── */
  try {
    const registration = await container.register(SW_URL, { scope: SW_SCOPE, type: SW_TYPE })
    trackWaiting(registration)
  } catch {
    /* An unsupported browser, a non-secure origin, a 404 on `sw.js` behind a
       misconfigured proxy. All of them mean "no offline support today", and
       none of them means "do not show the operator their console". */
  }
}

function listenForWorkerMessages(
  container: ServiceWorkerContainer,
  loc: { reload: () => void },
): void {
  container.addEventListener('message', (event) => {
    const message = (event as MessageEvent).data as WorkerMessage | null
    if (!message || typeof message.type !== 'string') return
    if (applyWorkerMessage(message)) return
    if (message.type !== MSG_KILLED) return

    updateStore.set({ ...updateStore.get(), killed: true })
    /* One reload per tab, ever. `sessionStorage` rather than a module variable,
       because the reload itself resets module state — a module flag would guard
       nothing at all. */
    try {
      if (sessionStorage.getItem(RELOAD_GUARD_KEY) === '1') return
      sessionStorage.setItem(RELOAD_GUARD_KEY, '1')
    } catch {
      /* No session storage means no guard, and an unguarded reload can loop. Do
         not reload at all — a stale page is recoverable by hand, a reload loop
         is not. */
      return
    }
    loc.reload()
  })
}

/**
 * Report a waiting worker. Covers all three ways one appears: already waiting at
 * registration time, installed during this session, or installed by another tab.
 */
function trackWaiting(registration: ServiceWorkerRegistration): void {
  const publish = () => {
    if (!registration.waiting) return
    updateStore.set({ ...updateStore.get(), updateReady: true })
  }
  publish()
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing
    if (!installing) return
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') publish()
    })
  })
}

/** Test seam. */
export function resetAppUpdateState(): void {
  updateStore.set({ updateReady: false, killed: false })
}
