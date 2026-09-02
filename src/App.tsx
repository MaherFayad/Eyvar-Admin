/**
 * `App` — the document-level providers, and the router.
 *
 * Each provider here is a **singleton per document**, which is why none of them
 * lives inside `AppLayout`:
 *
 *   `BrowserRouter`      one history. `AppLayout` is a LAYOUT ROUTE beneath it,
 *                        so it is never remounted by navigation (**AC-18**).
 *   `ShellProvider`      identity, nav counts, language, the collapse flag and
 *                        the standing conditions. Mounted once for the session
 *                        (spec §4.1); its `useAsync` reads have empty deps, so
 *                        a route change never refetches identity.
 *   `DirectionProvider`  Radix reads text direction from a React CONTEXT, not
 *                        from the DOM. Without it every popover side, every
 *                        menu alignment and every arrow-key traversal stays LTR
 *                        while the page mirrors (**AC-70**, **AC-71**). It is
 *                        fed the SAME value `useLanguage` sets on `<html>` —
 *                        one source, never two.
 *   `TooltipProvider`    one delay policy for the whole product (§5.7).
 *   `Toaster`            mounted ABOVE the router outlet, so a toast **survives
 *                        a route change** within its 5s window (**AC-23**), and
 *                        so there is exactly one toast region.
 *
 * **`LiveRegionAnnouncer` (S-08) is deliberately not a component here.** 0.5's
 * announcer is a module singleton created on first use, because **AC-29** says
 * *exactly one* live region — and a component any screen can render is one
 * `git grep` away from being three. Call `useAnnounce()`.
 */

import { BrowserRouter } from 'react-router-dom'
import { DirectionProvider } from '@/components/ui/direction'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AppRoutes } from '@/routes'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import { InstallAffordance } from '@/pwa'

function App() {
  return (
    <BrowserRouter>
      <ShellProvider>
        <DirectionBridge>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
            {/*
              The install offer (P1). Mounted here for the same reason `Toaster`
              is — one per document, above the router outlet, so a route change
              does not unmount it mid-decision.

              **It renders `null` unless Chromium has actually fired
              `beforeinstallprompt`**, which never happens in jsdom, so it adds
              nothing to any existing test's DOM. It is not a `ShellBanner`
              condition on purpose: R10's one-banner invariant is for standing
              conditions of the workspace, and an install offer must never be
              able to suppress an offline warning.
            */}
            <InstallAffordance />
          </TooltipProvider>
        </DirectionBridge>
      </ShellProvider>
    </BrowserRouter>
  )
}

/**
 * Feeds Radix the direction the language hook already set on `<html>`.
 *
 * It reads `useShell()` rather than the DOM so there is **one source**: 0.5's
 * `applyDocumentDirection` writes `dir` and `lang` on the document element, and
 * this reads the same state that wrote them. Reading `document.documentElement`
 * back would be a second source that can disagree for exactly one render.
 */
function DirectionBridge({ children }: { children: React.ReactNode }) {
  const { language } = useShell()
  return <DirectionProvider dir={language.dir}>{children}</DirectionProvider>
}

export { App }
