/**
 * Sheet — the shell layer. Restyled on arrival, and the behaviour changed.
 *
 * The stock component arrives with a scrim AND a focus trap. Eyvar's shell
 * layers have NEITHER, and that is not a preference — it is the reason a
 * drawer beat a modal in the first place (design spec §6.1).
 *
 * Rules applied
 *   §5.5        NO SCRIM. The workspace behind stays legible AND interactive
 *               (AC-20). `SheetOverlay` is deleted, not merely made
 *               transparent — a transparent overlay still eats pointer events.
 *   §7.3.3      NO FOCUS TRAP. "The scrim decides the trap. If a surface dims
 *               the page, it owns the keyboard. If it does not, it does not."
 *               Focus MOVES IN on open and Tab leaves the panel and continues
 *               into the page. Implemented with Radix `modal={false}`.
 *               AC-67 required a trap; it was amended after 0.2 because §7
 *               outranks an AC (finding F-1).
 *   §5.5 / AC-20 an outside pointer-down does NOT close the layer — it is
 *               forwarded to the page, which is the whole point of no scrim.
 *               `Escape` closes and restores focus to the opener (AC-66).
 *   §1.2 / C12  `--ev-drawer-w` = 406px, a named figure R13 preserves. NOT
 *               648px: at 1280px a 648px drawer leaves 552px of content, which
 *               is narrower than a detail page's main column and destroys the
 *               only reason a drawer beat a modal. Width is solved by the
 *               full-page escape at `/entity/:entityId`, not by eating the page.
 *   §6.1        anchored inline-END, starting below the shell banner and the
 *               top bar, running to the bottom of the viewport. The top bar
 *               stays reachable: a layer can be open while a form is dirty.
 *   §1.3        elevation is `shadow-2` — the drawer tier — AND the 1px
 *               inline-start hairline. Both, per the R-3 ruling: tier 3 is
 *               reserved for the scrimmed modals, and a drawer that outranked
 *               a modal would misreport the stacking order it deliberately
 *               does not have. No raw `box-shadow` here, so the focus ring and
 *               the elevation compose into one property (see `globals.css`).
 *   §9.5        the enter transform is `+X` in LTR and `−X` in RTL. Mirrored
 *               with the `rtl:` variant, ≤ 300ms. (The TOAST does not mirror —
 *               that is centre-anchored, AC-72 amended. Different component.)
 *   §5.5        a modal nested inside a drawer is FORBIDDEN. Password change
 *               and 2FA enrolment expand in place instead (§6.4).
 *   §7.6/AC-69  the transition is suppressed under `prefers-reduced-motion`
 *               by the global guard in `globals.css`.
 *
 * Physical `left-*` / `right-*` side variants are replaced by logical
 * `inline-start` / `inline-end` / `block-start` / `block-end`.
 */
import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/**
 * `modal={false}` is load-bearing: it is what turns off both the scrim's
 * pointer blocking and the focus trap. Passing `modal` is not offered.
 */
function Sheet({
  ...props
}: Omit<React.ComponentProps<typeof SheetPrimitive.Root>, "modal">) {
  return <SheetPrimitive.Root data-slot="sheet" modal={false} {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

type SheetSide = "inline-start" | "inline-end" | "block-start" | "block-end"

/**
 * Everything the browser lets you Tab to. Radix's own focus guards are excluded
 * — they exist to catch focus leaving a MODAL, and these drawers are not modal.
 */
const TABBABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

function tabbablesIn(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (el) =>
      !el.hasAttribute("data-radix-focus-guard") &&
      !el.hasAttribute("hidden") &&
      el.getAttribute("aria-hidden") !== "true",
  )
}

/**
 * **AC-67 — the drawer must NOT trap focus, and `modal={false}` does not
 * achieve that.** This is the fix, and the bug is in the dependency, not here:
 *
 *   `@radix-ui/react-dialog/dist/index.mjs:223`  hardcodes `loop: true` on its
 *                                                `FocusScope`.
 *   `react-focus-scope/dist/index.mjs:109`       runs its Tab handler when
 *                                                `loop || trapped`.
 *
 * `modal={false}` clears `trapped`. **It does not clear `loop`.** So Tab on the
 * last control inside the drawer is `preventDefault()`-ed and looped back to the
 * first, forever. A keyboard operator who opens a 360° profile can never get
 * back to the queue behind it without `Escape` — which closes the very thing
 * they were reading against, and that workflow is the entire reason §5.5 and
 * §7.3.3 removed the scrim.
 *
 * **Why this shape.** `FocusScope`'s handler only acts when
 * `document.activeElement` is the first or last tabbable INSIDE the container.
 * Radix `Slot` merges the child's `onKeyDown` before the scope's, so this runs
 * first: it moves focus out of the drawer itself and calls `preventDefault()`.
 * When the scope's handler runs a moment later it re-reads
 * `document.activeElement`, finds something outside the container, matches
 * neither edge, and does nothing. The loop is neutralised without patching a
 * dependency and without a `keydown` listener on the document.
 *
 * The drawer is portalled to the end of `<body>`, so "the next tabbable after
 * the container" is the start of the document and "the previous" is its end.
 * That is what the browser would do with no focus scope at all, which is the
 * behaviour §7.3.3 describes.
 */
function releaseTabAtEdges(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return
  const container = event.currentTarget
  const inside = tabbablesIn(container)
  if (inside.length === 0) return

  const active = document.activeElement
  const atFirst = active === inside[0]
  const atLast = active === inside[inside.length - 1]
  if (event.shiftKey ? !atFirst : !atLast) return

  const outside = tabbablesIn(document.body).filter((el) => !container.contains(el))
  if (outside.length === 0) return

  event.preventDefault()
  const next = event.shiftKey ? outside[outside.length - 1] : outside[0]
  next?.focus()
}

function SheetContent({
  className,
  children,
  side = "inline-end",
  showCloseButton = true,
  onPointerDownOutside,
  onInteractOutside,
  onKeyDown,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: SheetSide
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      {/* No SheetOverlay. See the header: §5.5 forbids the scrim. */}
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        /* AC-67 — see `releaseTabAtEdges`. This must stay ABOVE Radix's own
           handler in the merge order, which is what passing it as a child prop
           gets us. */
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (!event.defaultPrevented) releaseTabAtEdges(event)
        }}
        onPointerDownOutside={(event) => {
          // AC-20 — the page behind stays interactive, so an outside click is
          // a click on the page, not a dismissal.
          event.preventDefault()
          onPointerDownOutside?.(event)
        }}
        onInteractOutside={(event) => {
          event.preventDefault()
          onInteractOutside?.(event)
        }}
        className={cn(
          "fixed z-50 flex flex-col bg-popover text-sm text-popover-foreground",
          "shadow-2 transition-transform duration-200 ease-out",
          // Inline-end: the shell layers. Starts below the top bar so the save
          // bar stays reachable while the layer is open (§6.1).
          "data-[side=inline-end]:top-topbar data-[side=inline-end]:bottom-0",
          "data-[side=inline-end]:end-0 data-[side=inline-end]:w-drawer",
          "data-[side=inline-end]:border-s data-[side=inline-end]:border-border",
          "data-[side=inline-start]:inset-y-0 data-[side=inline-start]:start-0",
          "data-[side=inline-start]:w-drawer data-[side=inline-start]:border-e data-[side=inline-start]:border-border",
          "data-[side=block-start]:inset-x-0 data-[side=block-start]:top-0",
          "data-[side=block-start]:border-b data-[side=block-start]:border-border",
          "data-[side=block-end]:inset-x-0 data-[side=block-end]:bottom-0",
          "data-[side=block-end]:border-t data-[side=block-end]:border-border",
          // §9.5 — the transform sign flips in Arabic; nothing else does.
          "data-[side=inline-end]:data-closed:translate-x-full",
          "rtl:data-[side=inline-end]:data-closed:-translate-x-full",
          "data-[side=inline-start]:data-closed:-translate-x-full",
          "rtl:data-[side=inline-start]:data-closed:translate-x-full",
          "data-[side=block-start]:data-closed:-translate-y-full",
          "data-[side=block-end]:data-closed:translate-y-full",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute top-2.5 end-3"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

/** 48px header with a hairline below (§6.1 anatomy). */
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex shrink-0 flex-col justify-center gap-0.5 border-b border-border px-3 py-2 pe-10",
        className
      )}
      {...props}
    />
  )
}

/**
 * Footer — present ONLY when the layer commits something (§6.1). A layer that
 * only offers gets a single `Close`; the 360° profile gets `Open full profile`
 * as a plain link and no primary, because it commits nothing.
 */
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        "mt-auto flex shrink-0 items-center justify-end gap-2 border-t border-border px-3 py-2",
        className
      )}
      {...props}
    />
  )
}

/** Entity name — 13px/600, matching the page header's title treatment. */
function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  )
}

/** Identity code and one-line context — 12px `--ev-text-2`. */
function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
