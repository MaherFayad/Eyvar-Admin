/**
 * Sheet — the shell layer. Restyled on arrival, and the behaviour changed.
 *
 * The stock component arrives with a scrim AND a focus trap. Eyvar's edge
 * drawers have NEITHER, and that is not a preference — it is the reason a
 * drawer beat a modal in the first place (design spec §6.1).
 *
 * **The fifth side, `overlay`, is the exception and it has both.** It exists
 * because the 360° profile was asked to be a full-screen popup showing none of
 * the navigation, and §7.3.3 then supplies the rest: a surface that dims the
 * page owns the keyboard. See `Sheet` and `SheetContent` below; the four edge
 * variants are untouched by it.
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
 *   §7.6        `duration-200` — `motion.md` licenses exactly one duration for
 *               a layer arriving or leaving, and a drawer is a layer. The value
 *               comes from Tailwind's scale, which IS the token set; there is
 *               no `--ev-duration-*` and adding one is the defect.
 *
 * ## G8 "peek" — THIS IS IT. There is no sixth surface.
 *
 * `14-system-wide-ux-plan.md` G8 proposes a **peek**: a way to inspect one
 * record without losing the list. Read the requirement rather than the name and
 * it is already ruled and already built, here:
 *
 *   | peek asks for | this file, today |
 *   |---|---|
 *   | inspect a record without losing the list | no scrim, page stays legible AND interactive (§5.5 / AC-20) |
 *   | keyboard-operable | focus moves in on open |
 *   | escapable | `Escape` closes (AC-66) |
 *   | must not trap | `releaseTabAtEdges` below — Tab leaves and continues into the page (§7.3.3 / AC-67) |
 *   | focus returns to the opener | Radix restores to the trigger on close |
 *
 * `surfaces.md` already carries the row verbatim: *"A surface consulted against
 * the page behind it -> Drawer, no scrim. Not: Modal — it hides the thing being
 * worked on."* Peek and drawer are the same object under two names, and R10
 * decides a surface by LIFETIME, not by which screen opened it. **Adding
 * `peek` to the vocabulary would make six names for five surfaces, and the
 * first argument about which one to use would be unresolvable.**
 *
 * What G8 correctly identifies is a *routing* defect, not a missing component:
 * screens that NAVIGATE AWAY where they should consult. My Work's `Open` and
 * Conversations' thread are the two named cases. The fix is to send them here.
 * That is call-site work; nothing in this file changes to allow it.
 *
 * The two modes G8 adds on top are separately refused:
 *   - **`side` (docked) + a persisted per-operator preference.** A surface that
 *     differs per operator cannot be specified, tested or supported: no design
 *     spec could then say what an operator sees, and every bug report would
 *     start by asking which mode they were in.
 *   - **`full` (route).** Rendering the same detail component on a route is
 *     component reuse and is welcome — the four detail routes must keep their
 *     URLs because deep links are load-bearing — but a page is already its own
 *     row in `surfaces.md` and does not need to be a *mode* of a drawer.
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
 * `modal={false}` is load-bearing and is the DEFAULT: it is what turns off both
 * the scrim's pointer blocking and the focus trap for an edge drawer.
 */
function Sheet({
  modal = false,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  /* **`modal` is offered again, and still defaults to `false`.**
   *
   * It used to be `Omit`ted outright, on the reasoning quoted above: `false` is
   * what turns off the scrim's pointer blocking AND the focus trap, both of
   * which §5.5 and §7.3.3 forbid for an edge drawer. That reasoning is intact
   * and the default enforces it — a caller that says nothing gets a drawer.
   *
   * What the `Omit` also did, unintentionally, was make the modal presentation
   * unbuildable. `side="overlay"` renders a scrim and traps focus BECAUSE
   * §7.3.3 says a surface that dims the page owns the keyboard, and Radix
   * derives all three behaviours — the overlay element, the pointer block and
   * the trap — from this one flag. Hand-rolling them beside a `modal={false}`
   * root meant reimplementing three things the primitive already does, and the
   * first attempt got one of them wrong: `SheetPrimitive.Overlay` renders
   * nothing at all under a non-modal root, so the "scrim" was absent while the
   * markup claimed it.
   *
   * One flag, three behaviours, no divergence. `ShellLayer` is the only caller
   * that passes it, and it derives it from `presentation`.
   */
  return <SheetPrimitive.Root data-slot="sheet" modal={modal} {...props} />
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

/**
 * `overlay` is the fifth, and it is not an edge — it is a MODAL that covers the
 * shell. See `SheetContent` for the two rulings it deliberately departs from
 * and why the owner's instruction outranks them here.
 */
type SheetSide = "inline-start" | "inline-end" | "block-start" | "block-end" | "overlay"

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
  const isModal = side === "overlay"
  return (
    <SheetPortal>
      {/* §5.5 forbids the scrim, and the four EDGE variants still have none —
          that ruling is about a panel sitting beside a page the operator is
          still working in, which is what those are.

          **`overlay` takes one, on the owner's instruction**: the record layer
          should show none of the navigation and read as a popup. A popup that
          leaves the rail, the nav column and the top bar lit behind it is not a
          popup, and the scrim is the only thing that says the console is
          suspended. The departure is scoped to this one side; nothing else in
          the product gains a scrim by it. */}
      {isModal && (
        <SheetPrimitive.Overlay
          data-slot="sheet-overlay"
          /* **The same scrim `dialog.tsx` paints, to the class.** The product
             has one scrim recipe and this is it — `bg-foreground/20` plus the
             backdrop blur — so a scrimmed record modal and a scrimmed
             confirmation look like the same kind of surface. A first cut used
             `/25` and no blur, which was a second recipe and was also wrong in
             dark: `--foreground` is near-white there, so the wash LIGHTENS the
             console rather than dimming it, and the blur is what actually
             separates the two planes. */
          className="fixed inset-0 isolate z-50 bg-foreground/20 duration-200 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
        />
      )}
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        /* AC-67 — see `releaseTabAtEdges`. This must stay ABOVE Radix's own
           handler in the merge order, which is what passing it as a child prop
           gets us. */
        onKeyDown={(event) => {
          onKeyDown?.(event)
          /* AC-67 lets Tab LEAVE an edge layer, because the page behind it is
             still live and reachable. A modal's page is not: releasing focus
             into a scrimmed console would put the caret on controls the
             operator can neither see nor click. So the modal traps, which is
             what every other dialog in the product already does. */
          if (!isModal && !event.defaultPrevented) releaseTabAtEdges(event)
        }}
        onPointerDownOutside={(event) => {
          /* AC-20 — the page behind an EDGE layer stays interactive, so an
             outside click is a click on the page rather than a dismissal.

             A modal has no interactive outside; its outside is the scrim, and a
             click there is the ordinary way to dismiss a popup. Preventing it
             would leave the operator with a full-screen surface closable only
             from one small control. */
          if (!isModal) event.preventDefault()
          onPointerDownOutside?.(event)
        }}
        onInteractOutside={(event) => {
          if (!isModal) event.preventDefault()
          onInteractOutside?.(event)
        }}
        className={cn(
          "fixed z-50 flex flex-col bg-popover text-sm text-popover-foreground",
          "shadow-2 transition-transform duration-200 ease-out",
          /* **`overlay` — a modal over the whole shell, not a panel at an
             edge.** Inset 24px at and above 768px so it reads as a POPUP: a
             panel with all four edges visible over a dimmed console. Edge to
             edge below that, where 24px of scrim on a 390px phone is a border
             rather than a frame and the record needs every pixel.

             It fades rather than slides. The four edge variants translate
             because they arrive FROM somewhere; a modal centred over the page
             arrives from nowhere, and sliding it in from an edge would claim a
             direction it does not have. */
          /* Capped at the page measure and centred, not stretched to the
             viewport. A record stack across 2,352px would put a label and its
             value at opposite ends of the screen — the exact defect
             `--ev-page-measure` was added to remove — so the modal obeys the
             same measure every page does. `inset-6` still sets the block axis
             and the 24px minimum inset; `mx-auto` centres the surplus. */
          "data-[side=overlay]:inset-6 data-[side=overlay]:rounded-xl",
          "data-[side=overlay]:mx-auto data-[side=overlay]:max-w-measure",
          "data-[side=overlay]:border data-[side=overlay]:border-border",
          "data-[side=overlay]:compact:inset-0 data-[side=overlay]:compact:rounded-none",
          "data-[side=overlay]:compact:border-0",
          "data-[side=overlay]:transition-opacity",
          "data-[side=overlay]:data-closed:opacity-0",
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
