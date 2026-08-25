/**
 * App — the minimal root for 0.3/0.4. **The real shell is 0.7.**
 *
 * This file exists to do three things and nothing else:
 *   1. mount the three document-level providers every primitive depends on,
 *   2. give `globals.css` something to paint so the token layer is verifiable,
 *   3. compile.
 *
 * In 0.7 the body of this file is replaced by `AppLayout` (L-01) plus the
 * router. The providers below stay, and they belong HERE rather than inside
 * `AppLayout` because each must be a singleton per document:
 *
 *   `DirectionProvider`  Radix reads direction from context, not the DOM
 *                        (AC-70, AC-71). It must be fed the SAME value set on
 *                        `<html>` — one source, never two.
 *   `TooltipProvider`    one delay policy for the whole product (§5.7).
 *   `Toaster`            mounted ABOVE the router outlet so a toast survives a
 *                        route change within its 5s window (AC-23), and so
 *                        there is exactly ONE live region for toasts (AC-29).
 *
 * Two shell pieces are deliberately NOT here, because they are 0.7's:
 * `SkipToContent` (S-09, the first focusable element in the document, AC-62)
 * and `LiveRegionAnnouncer` (S-08).
 */
import { DirectionProvider } from "@/components/ui/direction"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

function App() {
  // 0.7 reads this from `ui.language`. Until then it follows the document,
  // which `index.html` sets — so there is still exactly one source.
  const dir =
    (document.documentElement.getAttribute("dir") as "ltr" | "rtl" | null) ??
    "ltr"

  return (
    <DirectionProvider dir={dir}>
      <TooltipProvider>
        <main className="min-h-screen bg-background p-6 text-sm text-foreground">
          <h1 className="text-lg font-semibold">Eyvar Admin</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Foundations only. The shell lands in 0.7.
          </p>
        </main>
        <Toaster />
      </TooltipProvider>
    </DirectionProvider>
  )
}

export { App }
