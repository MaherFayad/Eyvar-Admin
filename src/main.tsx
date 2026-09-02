import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/styles/globals.css"
import { App } from "@/App"
import { seedMockFailuresFromLocation } from "@/data/clients"
import { bootstrapPwa } from "@/pwa"

/**
 * `?mockFail=drivers.list,trips.list` — seeded HERE, and only here.
 *
 * `src/data/config.ts` has carried this function since 0.2 with the comment
 * *"Call once at boot, before the first render, from the app entry point"*, and
 * for six waves nothing called it: three separate reviewers reported the URL
 * form dead and each worked around it differently (one edited a fixture, one
 * reached into `mockFailures` from a devtools console the deployed build does
 * not have, one skipped the error state).
 *
 * It must run **before the first data read**, not inside a component: every
 * mock client calls `mockFailures.take(op)` on its way out, and `ShellProvider`
 * fires `session.current`, `navCounts.list` and `notifications.summary` in its
 * first effect. A `useEffect` in `App` would run after those reads were already
 * in flight and the failure would apply to the retry rather than the load. This
 * module is evaluated before `createRoot`, so the registry is populated before
 * any client exists.
 *
 * No-ops in `http` mode and with no query string — that guard is inside the
 * function, not duplicated here.
 */
seedMockFailuresFromLocation()

/**
 * The PWA layer — service worker registration, the kill switch, and the capture
 * of `beforeinstallprompt`. `docs/ref/pwa.md`, P1 and P2.
 *
 * Here rather than in a component or an effect, for two reasons that pull the
 * same way. **`beforeinstallprompt` fires once and is never replayed**, often
 * before React has mounted, so a listener attached on mount misses it and the
 * install affordance silently never appears. And registration is a
 * document-level side effect that must happen exactly once — a component doing
 * it would do it twice under `StrictMode`.
 *
 * It does not await, and it never throws: a worker that fails to install must
 * not delay or prevent the first paint of an operations console.
 *
 * The **kill switch runs inside this call, before anything is registered**, so
 * `?pwa=off` works on a build whose worker is the broken thing. See
 * `src/pwa/killSwitch.ts`.
 */
bootstrapPwa()

const root = document.getElementById("root")
if (!root) throw new Error("Root element #root is missing from index.html")

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
