/**
 * Dialog - restyled for Eyvar.
 *
 * Rules applied
 *   §5.3/§13.1 THREE SIZES AND NO OTHERS: 440px confirmations and one-field
 *              forms, 560px default, 800px content-rich. Exposed as
 *              `size="sm" | "default" | "lg"`. The stock
 *              the stock viewport-clamp plus breakpoint max-width is replaced.
 *   §5.3       ALWAYS VERTICALLY CENTRED (C-corrected). `Cancel` sits before the
 *              primary in the inline direction.
 *   §5.3       copy: a QUESTION title naming the object and the count
 *              (`Pause 3 captains?`); a body stating the consequence in one
 *              sentence AND what will not change; a primary that REPEATS THE VERB
 *              (`Pause captains`). Never `OK`, `Yes`, `Confirm` or `Submit`.
 *   §5.3       a modal that commits nothing gets a single `Close`.
 *   §7.3.3     a modal HAS a scrim, so it OWNS THE KEYBOARD and DOES trap focus.
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
        "fixed inset-0 isolate z-50 bg-foreground/20 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
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
  /** 440 confirmations and one-field forms | 560 default | 800 content-rich. */
  size?: "sm" | "default" | "lg"
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          "fixed top-1/2 start-1/2 z-50 grid w-140 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground border border-border shadow-3 duration-100 outline-none data-[size=sm]:w-110 data-[size=lg]:w-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
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
