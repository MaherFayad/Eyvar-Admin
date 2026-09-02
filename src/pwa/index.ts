/**
 * The PWA layer's public surface. Everything else in this directory is internal
 * to it, including the service worker — which is not importable by the app at
 * all, because it runs in a different global scope.
 *
 * Four things leave this directory:
 *
 *   `bootstrapPwa()`        called once, from `src/main.tsx`.
 *   `InstallAffordance`     rendered once, from `src/App.tsx`.
 *   `PWA_EN`                spread once, from `src/i18n/dictionaries.ts`.
 *   the hooks               `useDataFreshness`, `useAppUpdate`, `useInstallState`
 *                           — read by whoever renders the surfaces. Nothing in
 *                           P1 or P2 renders the first two; see the handoff.
 */

import { watchInstallPrompt } from './install'
import { registerServiceWorker } from './register'

export { InstallAffordance } from './InstallAffordance'
export { PWA_EN } from './copy'
export { useDataFreshness, readFreshness, type Freshness } from './freshness'
export { useAppUpdate, applyAppUpdate, type AppUpdateState } from './register'
export { useInstallState, type InstallState } from './install'
export { classify, mayStore, type CacheClass } from './cachePolicy'

/**
 * One call, from the entry point, before the first render is committed.
 *
 * The order inside matters: `watchInstallPrompt` is synchronous and installs its
 * listener immediately, because `beforeinstallprompt` fires early and is never
 * replayed. Registration is deliberately *not* awaited — a worker taking two
 * seconds to install must not hold up the first paint of an operations console.
 */
export function bootstrapPwa(): void {
  watchInstallPrompt()
  void registerServiceWorker()
}
