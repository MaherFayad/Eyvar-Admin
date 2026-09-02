/**
 * The install prompt: capture it, expose it, remember a dismissal.
 *
 * ## Why a module-level listener rather than an effect
 *
 * **`beforeinstallprompt` fires once, early, and is not replayed.** Chrome
 * dispatches it as soon as it decides the app is installable, which is often
 * before React has mounted. A `useEffect` that subscribes on mount misses it and
 * the affordance never appears — the single most common way an install prompt
 * ships broken. So the listener is installed at module evaluation, from
 * `main.tsx`'s import graph, and the event is parked in a store the UI reads
 * whenever it gets round to rendering.
 *
 * ## Why the browser's own prompt and not a fabricated one
 *
 * `prompt()` may only be called from a user gesture and only once per captured
 * event. There is no way to re-open a dismissed one. So the affordance is a
 * button that calls `prompt()`, and once the operator has answered, the event is
 * spent and the affordance goes away for good on this device.
 *
 * ## Browsers that never fire it
 *
 * Safari and Firefox do not implement `beforeinstallprompt`; installation there
 * is a browser menu item. `isInstallable` stays `false`, the affordance never
 * renders, and nothing tells the operator to look for a feature their browser
 * does not have. Installing still works — the manifest is what makes it
 * possible, not this file.
 */

import { useCallback, useSyncExternalStore } from 'react'
import { createStore } from './store'

/**
 * Not in TypeScript's DOM lib, because it is not a standard. Declared with only
 * the two members used, so nothing here depends on the rest of the proposal.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Dismissal is a per-device preference, so it belongs in `src/lib/persistence.ts`
 * with the other operator preferences. It is here under its own key because that
 * file's `UI_STATE_KEYS` has another owner this wave; **raised in the handoff —
 * it should move.** The key is namespaced identically either way, so the move is
 * a rename of one string.
 */
const DISMISSED_KEY = 'eyvar.pwa.installDismissed'

export interface InstallState {
  /** The browser has offered a prompt and the operator has not dismissed it. */
  isInstallable: boolean
  /** Already running as an installed app. Nothing to offer. */
  isInstalled: boolean
}

let deferred: BeforeInstallPromptEvent | null = null

const store = createStore<InstallState>({ isInstallable: false, isInstalled: detectInstalled() })

/**
 * `display-mode: standalone` is the manifest's `display` taking effect, which is
 * the only reliable cross-browser signal that this window *is* the installed
 * app. `navigator.standalone` covers iOS Safari, which does not implement the
 * media query for home-screen apps.
 */
function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches === true
  const iosStandalone = (navigator as { standalone?: boolean }).standalone === true
  return standalone || iosStandalone
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Install the listeners. Idempotent, and called from `main.tsx` alongside
 * registration — early, for the reason in the header.
 */
export function watchInstallPrompt(target: Window | undefined = typeof window === 'undefined' ? undefined : window): void {
  if (!target) return

  target.addEventListener('beforeinstallprompt', (event) => {
    /* Suppress Chrome's own mini-infobar. The affordance is ours, it sits where
       the design puts it, and its copy is the product's. */
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    store.set({ isInstallable: !isDismissed(), isInstalled: detectInstalled() })
  })

  target.addEventListener('appinstalled', () => {
    deferred = null
    store.set({ isInstallable: false, isInstalled: true })
  })
}

/**
 * Show the browser's prompt. Must be called from a user gesture.
 *
 * Returns the outcome, or `null` when there was nothing to prompt with. Either
 * way the event is spent, so the affordance is retired.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  const event = deferred
  deferred = null
  store.set({ isInstallable: false, isInstalled: detectInstalled() })
  if (!event) return null
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    return outcome
  } catch {
    return null
  }
}

/** The operator said no. Remember it, per device, until storage is cleared. */
export function dismissInstallPrompt(): void {
  deferred = null
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    /* Not remembering a dismissal is a small annoyance; failing to dismiss it
       for this session would be a large one. The store update below still runs. */
  }
  store.set({ isInstallable: false, isInstalled: detectInstalled() })
}

export function useInstallState(): InstallState {
  const getServerSnapshot = useCallback(() => store.get(), [])
  return useSyncExternalStore(store.subscribe, store.get, getServerSnapshot)
}

/** Test seam. */
export function resetInstallState(): void {
  deferred = null
  store.set({ isInstallable: false, isInstalled: false })
}
