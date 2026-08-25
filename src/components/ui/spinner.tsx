/**
 * Spinner - restyled for Eyvar. It has exactly one legal use.
 *
 * INLINE, INSIDE A BUTTON, WHILE A SAVE IS IN FLIGHT (§11.6 state 7): `Save`
 * shows progress, is not re-triggerable, and `Discard` is disabled.
 *
 * Rules applied
 *   AC-35      NEVER A PAGE OR CARD LOADING STATE. Every pattern has a skeleton
 *              shaped like its content, and none of them renders a centred
 *              spinner. If you are about to centre this in a card, you want
 *              `LoadingSkeleton` (B-04).
 *   §7.6/AC-69 the rotation is an indefinite loop, so it is suppressed by the
 *              `prefers-reduced-motion` guard in `globals.css`. Under that
 *              preference the button still announces `Saving` through the live
 *              region (AC-29) - the state is never carried by motion alone.
 *   R18        a loop may only signal "this feed is live" and may never encode
 *              severity. "In flight" is neither: it is bounded and it ends.
 *   a11y       `role="status"` with an accessible name, so the in-flight state is
 *              announced once and not on every frame.
 */
import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
