/**
 * `MobileNav` — the phone shell's navigation. Two exports: the control that
 * opens it, and the drawer it opens.
 *
 * Added 2026-09-02 under the owner's viewport ruling ("PWA should work whenever
 * I refresh in mobile dimensions by default"). `index.html` records the ruling
 * and what the old `width=1280` cost.
 *
 * ## It renders the SAME two navs, relocated. It does not reimplement them.
 *
 * The drawer's whole body is `ModuleRail` + `PageNav` — the identical
 * components the desktop shell puts in the frame, with the identical props.
 * Everything they carry comes with them for free and cannot drift: the roving
 * tabindex (AC-64), `aria-current` from the route and never from a click
 * (AC-08), the permission filter (AC-57/AC-58), the count badges and their
 * tone rule, the `Overview` separator, both landmark names, and the logical
 * utilities that mirror under `dir="rtl"` (AC-71).
 *
 * A second rendering of the same route table is the failure mode this avoids.
 * It would be a second place for a permission filter to be forgotten, and the
 * nav tests would pass against the desktop copy while the phone copy leaked a
 * workspace the operator may not see.
 *
 * **80 + 224 = 304px**, which fits inside 390 with 86px of scrim left showing —
 * enough that the drawer reads as a layer over the page rather than as the page.
 * The two columns keep their own scroll contexts (AC-19), so a workspace with
 * ten sub-tabs scrolls the column and not the rail.
 *
 * ## On "do not stack 36 sub-tabs vertically" — measured, and it does not arise
 *
 * There are 36 sub-tab routes in the product, across five workspaces. **They
 * are never all on screen at once, on any viewport.** `PageNav` renders
 * `workspaceRows` — the ACTIVE workspace's rows only. Measured at
 * `/operations/quick-rides`: the rail is 6 items and the column is 10. Ten
 * rows at the phone tap-target height is a list, not a wall. So there is no
 * horizontal strip and no `select` element here: both would be a THIRD
 * rendering of the route table to solve a stack that does not exist, and a
 * native select would additionally throw away the count badges, the `Overview`
 * separator and the two landmark names.
 *
 * ## Modal, and therefore trapped — which is the rule, not an exception to it
 *
 * Design spec §7.3.3: *"The scrim decides the trap. If a surface dims the page,
 * it owns the keyboard. If it does not, it does not."* The shell layers have no
 * scrim and so must NOT trap, which is why `sheet.tsx` carries
 * `releaseTabAtEdges`. This drawer covers the page with a scrim, so the same
 * sentence requires the opposite of it, and Radix's modal dialog supplies all
 * of it: the trap, the scrim's pointer blocking, `Escape`, `aria-modal`, and
 * focus restored to the trigger on close. `Sheet` is deliberately not reused —
 * it hardcodes `modal={false}` and deletes its overlay, so reusing it would
 * mean editing a primitive three shell layers depend on in order to give it
 * back the two things it exists to remove.
 *
 * This adds no sixth surface to `surfaces.md`. It is the console's own
 * navigation, at a width where it does not fit beside the content — chrome
 * relocated, not a new kind of thing to choose between.
 */

import type { ReactNode } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { MenuIcon } from 'lucide-react'
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ModuleRail } from './ModuleRail'
import { PageNav } from './PageNav'
import type { NavCounts, SubTabRoute, Workspace, WorkspaceId } from '@/data/types'
import type { Translate } from '@/lib'

/**
 * `DialogContent` is not reused and the raw primitive is used instead: the
 * styled one is a centred, width-capped modal and this is an edge-anchored,
 * full-height panel. Every other piece — the root, the portal, the scrim, the
 * title — IS the styled one, so the scrim's value stays the single declaration
 * in `dialog.tsx` and is not copied into a second file.
 */
const DrawerContent = DialogPrimitive.Content

/**
 * The dialog root, wrapping the WHOLE shell frame.
 *
 * It has to, and the reason is focus restore. Radix's modal dialog returns
 * focus on close by calling `triggerRef.current?.focus()` and prevents the
 * default restore — so a dialog with no `Trigger` inside its own tree closes
 * onto `document.body` and a keyboard operator loses their place entirely. The
 * trigger lives in the top bar, which is deep inside the frame, so the root has
 * to be outside the frame for the two to share a context.
 *
 * The root renders no DOM of its own. On a desktop viewport it is a context
 * provider whose `open` can never become true.
 */
export function MobileNavRoot({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog>
  )
}

export interface MobileNavProps {
  workspaces: readonly Workspace[]
  visibleRows: readonly SubTabRoute[]
  workspaceRows: readonly SubTabRoute[]
  workspace: Workspace | null
  navCounts: NavCounts | null
  navCountsLoading: boolean
  activeWorkspaceId: WorkspaceId | null
  activeSubTabId: string | null
  landingRoute: string
  t: Translate
}

/**
 * The control. An icon button in the top bar's first slot.
 *
 * A dialog trigger rather than an `onClick`, because the trigger is what Radix
 * restores focus to on close — AC-66's rule, met by the primitive rather than
 * by a captured element, since unlike the shell layers this surface really does
 * have a trigger.
 */
export function MobileNavTrigger({ t }: { t: Translate }) {
  return (
    <DialogPrimitive.Trigger asChild>
      <Button
        variant="ghost"
        size="icon"
        /* `min-*`, not a height, and this is one of the few places that needs
           it at all. The token steward raises `--ev-control-h` and the rest of
           the height tokens under the compact query, so every control that HAS
           a height token is already finger-sized with no call-site change. An
           icon-only ghost button is sized by `size="icon"` (28px) and is not
           one of them, which is exactly the case `--ev-tap-min` exists for.
           A floor rather than a height: `h-tap` would shrink a taller control
           rather than grow a shorter one. */
        className="min-h-tap min-w-tap shrink-0"
        aria-label={t('shell.nav.openMenu')}
      >
        <MenuIcon aria-hidden="true" className="size-5" />
      </Button>
    </DialogPrimitive.Trigger>
  )
}

/**
 * The drawer. Renders nothing at all when it is closed — Radix unmounts the
 * portal — so on a desktop viewport, where `open` can never become true, the
 * phone navigation is absent from the DOM rather than hidden in it.
 */
export function MobileNavPanel({
  workspaces,
  visibleRows,
  workspaceRows,
  workspace,
  navCounts,
  navCountsLoading,
  activeWorkspaceId,
  activeSubTabId,
  landingRoute,
  t,
}: MobileNavProps) {
  return (
    <DialogPortal>
      {/* The same scrim every modal in the product uses. Its presence is what
          licences the focus trap below (§7.3.3). */}
      <DialogOverlay />
      <DrawerContent
        data-slot="mobile-nav"
        aria-label={t('shell.nav.menu')}
        /* Anchored inline-start, so it mirrors to the physical right under
           `dir="rtl"` with no second rule (§9.5, AC-71) — the same side the
           rail occupies in the desktop frame in both directions.

           Width is `auto` and not a number: the two columns inside are
           `w-rail` and `w-subnav`, which are the tokens that already decide how
           wide this navigation is. A third number here could disagree, and the
           token steward deliberately did NOT narrow either one under `compact`
           — below the breakpoint the three-column shell goes away rather than
           squeezing, which is exactly what this drawer implements.

           The safe-area padding uses the LOGICAL utilities, not `env()`
           inline. `env(safe-area-inset-left)` is a physical edge; the notch
           side and the inline-start side are the same edge in English and
           opposite edges in Arabic, so an inline `env()` here would pad the
           wrong side of the drawer under `dir="rtl"` and would look correct in
           every English review. `globals.css` remaps the pair behind a
           `[dir="rtl"]` hook so the call site does not have to know. */
        className="fixed inset-y-0 start-0 z-50 flex w-auto shadow-3 outline-none transition-transform duration-200 ease-out pt-safe-top pb-safe-bottom ps-safe-start data-closed:-translate-x-full rtl:data-closed:translate-x-full"
      >
        {/* Radix requires an accessible title on a dialog and warns to the
            console without one. Visually hidden: the drawer's two landmarks
            already name themselves on screen, and a third heading would be a
            row of chrome taking 44px off an 844px viewport. */}
        <DialogTitle className="sr-only">{t('shell.nav.menu')}</DialogTitle>

        <ModuleRail
          workspaces={workspaces}
          visibleRows={visibleRows}
          navCounts={navCounts}
          navCountsLoading={navCountsLoading}
          activeWorkspaceId={activeWorkspaceId}
          landingRoute={landingRoute}
          t={t}
        />
        <PageNav
          workspace={workspace}
          rows={workspaceRows}
          navCounts={navCounts}
          navCountsLoading={navCountsLoading}
          activeSubTabId={activeSubTabId}
          t={t}
        />
      </DrawerContent>
    </DialogPortal>
  )
}
