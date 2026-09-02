/**
 * The service-worker globals `sw.ts` uses, declared by hand.
 *
 * ## Why not `lib: ["WebWorker"]`
 *
 * `lib.webworker.d.ts` and `lib.dom.d.ts` both declare `self`, `caches`,
 * `fetch`, `EventTarget` and a few dozen more, and TypeScript reports every one
 * of them as a duplicate when both are in the same program. The usual fixes are
 * a second `tsconfig` for one file — which then needs project references, which
 * need `composite`, which fights `noEmit` — or a `/// <reference lib="webworker" />`
 * directive, which has the same duplicate-identifier problem.
 *
 * Both of those buy a worse outcome than this file: the worker would stop being
 * covered by `tsc -b`, which is the one command the whole repo is gated on. So
 * the ~40 lines below are declared here, `sw.ts` stays inside the single
 * program, and `npx tsc -b --force` type-checks the service worker along with
 * everything else.
 *
 * Only what `sw.ts` actually touches is declared. It is deliberately not a
 * general-purpose shim: an incomplete copy of `lib.webworker.d.ts` pretending
 * to be a complete one would be worse than none.
 *
 * `Request`, `Response`, `Cache`, `CacheStorage` and `ServiceWorkerRegistration`
 * all come from the DOM lib unchanged — they are the same types in both places.
 */

/** What `vite-plugin-pwa`'s `injectManifest` substitutes for `self.__WB_MANIFEST`. */
export interface PrecacheEntry {
  url: string
  /** `null` for content-hashed filenames, which need no separate revision. */
  revision: string | null
}

export interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void
}

export interface FetchEventLike extends ExtendableEventLike {
  readonly request: Request
  respondWith(response: Response | Promise<Response>): void
}

export interface ExtendableMessageEventLike extends ExtendableEventLike {
  readonly data: unknown
}

export interface WindowClientLike {
  readonly id: string
  readonly url: string
  postMessage(message: unknown): void
}

export interface ClientsLike {
  claim(): Promise<void>
  matchAll(options?: { type?: 'window' | 'all'; includeUncontrolled?: boolean }): Promise<WindowClientLike[]>
}

/**
 * The subset of `ServiceWorkerGlobalScope` this worker uses.
 *
 * The event map is spelled out rather than typed as `string`, so a handler
 * registered for a misspelled event name is a compile error instead of a
 * handler that is simply never called — which is the failure mode that costs an
 * afternoon.
 */
export interface EyvarWorkerScope {
  readonly registration: ServiceWorkerRegistration
  readonly clients: ClientsLike
  readonly caches: CacheStorage
  readonly location: Location
  readonly __WB_MANIFEST: PrecacheEntry[]
  skipWaiting(): Promise<void>
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEventLike) => void): void
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void): void
  addEventListener(type: 'message', listener: (event: ExtendableMessageEventLike) => void): void
}
