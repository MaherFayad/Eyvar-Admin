/**
 * Dialog - restyled for Eyvar.
 *
 * Rules applied
 *   §5.3/§13.1 THREE SIZES AND NO OTHERS: 440px confirmations and one-field
 *              forms, 560px default, 800px content-rich. Exposed as
 *              `size="sm" | "default" | "lg"`. The stock viewport-clamp plus
 *              breakpoint max-width is replaced.
 *   override   a FOURTH, `palette`, exists only for the command centre, whose
 *              geometry the owner fixed at 640 with a 16vh top edge (RULINGS,
 *              "The command palette is a centred modal"). It is not a size a
 *              screen may choose; `command.tsx` is its only caller.
 *
 * ## Which size — G6, and it is a rule, not a judgement
 *
 * The three widths were already declared here and were already correct. What
 * was missing was a way to CHOOSE, so fourteen dialogs shipped eight widths:
 * `sm:max-w-md`x3, `[440px]`x3, `[420px]`x3, `xl`, `lg`, `[480px]`, `[460px]`,
 * `3xl`. Every one of those was a `className` on top of `size`, and because a
 * `max-width` beats this file's `width`, the override always won. **The size
 * prop is now the only lever: a width class on `DialogContent` is a defect and
 * `dialog.size.test.tsx` fails the build on one.**
 *
 * Answer two questions in order and stop at the first `yes`.
 *
 * | # | Ask | Then |
 * |---|---|---|
 * | 1 | Does it carry a SECOND REGION — a preview, a table, a scrolling list of options, a side-by-side? | **`lg`** 800px |
 * | 2 | Does it hold MORE THAN ONE control? | **`default`** 560px |
 * | - | Otherwise: a confirmation, a single field, one picker, one decision | **`sm`** 440px |
 *
 * Worked: `Log a call` is one note field -> `sm`. `Invite operator` is five
 * single-line controls -> `default` was tempting but it is one decision with no
 * second region and it reads better narrow, so `sm`. `Issue API key` is a name
 * field plus twenty scrolling scope checkboxes -> a second region -> `lg`.
 * `Template editor` has subject, body and a live preview -> `lg`.
 *
 * A dialog is never sized to its content and never to a breakpoint. There is
 * one breakpoint in this product (`--ev-bp-wide`, `globals.css:872`) and a
 * `sm:` prefix on a dialog is a second one arriving by accident.
 *   §5.3       ALWAYS VERTICALLY CENTRED (C-corrected). `Cancel` sits before the
 *              primary in the inline direction.
 *   §5.3       copy: a QUESTION title naming the object and the count
 *              (`Pause 3 captains?`); a body stating the consequence in one
 *              sentence AND what will not change; a primary that REPEATS THE VERB
 *              (`Pause captains`). Never `OK`, `Yes`, `Confirm` or `Submit`.
 *   §5.3       a modal that commits nothing gets a single `Close`.
 *   §7.3.3     a modal HAS a scrim, so it OWNS THE KEYBOARD and DOES trap focus.
 *   §7.6       A MODAL IS A LAYER, AND A LAYER ARRIVES AT `duration-200`.
 *              It shipped at `duration-100` - the popover value - so the modal
 *              and the dropdown that opened it moved at the same speed and the
 *              scrim gave the eye nothing to follow. `motion.md`'s licensed
 *              table has one row for layers (modal, drawer, sheet) and one for
 *              popovers; `ui/sheet.tsx` was already on the layer row and this
 *              file was not. Overlay and content share the value so the scrim
 *              and the panel arrive together. Tailwind's scale IS the token
 *              set - there is no `--ev-duration-*` and adding one is the
 *              defect (`globals.css`, the Motion block).
 *              "The scrim decides the trap." This is the exact opposite of
 *              `sheet.tsx`, and both are correct.
 *   §5.5       A MODAL NESTED INSIDE A DRAWER IS FORBIDDEN. My-profile's password
 *              and 2FA sections expand in place instead (§6.4).
 *   §13.1      a picker modal - choosing which KIND of thing to create - has rows
 *              and `Cancel` only, and NO primary.
 *   R5a use #1 the primary is red ONLY when the action is unrecoverable. Use
 *              `<Button variant="destructive">`; a recoverable destructive
 *              confirmation takes the normal blue primary, and `Discard changes`
 *              in the navigate-away-dirty modal is BLUE (§11.6 state 10) - §5.3
 *              restricts red, it does not mandate it, and spending red there
 *              would train operators to ignore it.
 *
 * The scrim is `bg-foreground/20`. Tailwind's stock scrim utility reaches for
 * its own neutral palette, which is not in the Eyvar token set. The banned
 * class is deliberately NOT spelled out here: Tailwind v4 scans COMMENTS too,
 * and naming it once in this header was enough to emit a working rule for it
 * into the production stylesheet. The footer's grey band is also removed
 * (D18 - no filled grey bands).
 */
import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-foreground/20 duration-200 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  size = "default",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /**
   * 440 confirmations and one-field forms | 560 default | 800 content-rich.
   * `palette` is the fourth and last: the command centre, licensed by the
   * standing owner override of 2026-09-05, at 640 with a fixed top edge.
   */
  size?: "sm" | "default" | "lg" | "palette"
  showCloseButton?: boolean
}) {
  /*
   * The three widths become viewport-sized below the breakpoint.
   *
   * The scale is 440 / 560 / 800 and all three are wider than a 390px phone,
   * so every dialog in the product overflowed its viewport the moment the
   * console became reachable on one. The sizes above the breakpoint are
   * untouched; below it the box is pinned to both inline edges with the
   * standard gutter and the centring translate is cancelled, which makes it
   * span the viewport instead of hanging off it.
   *
   * The width override is written per size rather than once, because the size
   * widths are attribute-qualified: a bare utility loses to them on
   * specificity and a media query adds none, so the plain form applied the
   * insets and left the box at its desktop width.
   *
   * Logical inline properties plus a separate right-to-left reset, because a
   * physical-direction utility paints the wrong edge in Arabic and reviews
   * clean in English.
   *
   * Vertical centring is kept and the box scrolls inside itself, so a short
   * confirmation still sits in the middle rather than being stretched.
   */
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          "fixed top-1/2 start-1/2 z-50 grid w-140 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-modal p-4 text-sm text-modal-foreground border border-modal-border duration-200 outline-none data-[size=sm]:w-110 data-[size=lg]:w-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 compact:start-4 compact:end-4 compact:translate-x-0 compact:rtl:translate-x-0 compact:max-h-svh compact:overflow-y-auto compact:data-[size=sm]:w-auto compact:data-[size=default]:w-auto compact:data-[size=lg]:w-auto data-[size=palette]:w-160 data-[size=palette]:top-palette-top data-[size=palette]:translate-y-0 data-[size=palette]:max-h-palette-max data-[size=palette]:flex data-[size=palette]:flex-col data-[size=palette]:gap-0 data-[size=palette]:p-0 data-[size=palette]:overflow-hidden data-[size=palette]:data-open:duration-150 data-[size=palette]:data-closed:duration-100 data-[size=palette]:motion-reduce:data-open:zoom-in-100 data-[size=palette]:motion-reduce:data-closed:zoom-out-100 compact:data-[size=palette]:w-auto compact:data-[size=palette]:start-0 compact:data-[size=palette]:end-0 compact:data-[size=palette]:top-0 compact:data-[size=palette]:rounded-t-none",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-2 end-2"
              size="icon-xs"
            >
              <XIcon
              />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-row items-center justify-end gap-2 rounded-b-xl border-t border-border bg-card p-4",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="secondary">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-base font-semibold text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
