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
 *   a11y       DECORATIVE BY DEFAULT, and that is a fix rather than a shortcut.
 *              This used to hard-code `role="status" aria-label="Loading"`, which
 *              was wrong twice over (AC-669). It was an untranslated English
 *              literal in a product that ships two languages - and worse, its
 *              only legal use is INSIDE A BUTTON, where an accessible name does
 *              not sit beside the button's name, it FOLDS INTO it. `Save` became
 *              "Save Loading" the moment it went in flight, so the control
 *              renamed itself at the exact instant an operator most needs it to
 *              be the thing they just pressed.
 *
 *              The in-flight state was never this element's to announce. The
 *              rule two lines up already says so: the button announces `Saving`
 *              through the live region (AC-29). One announcement, from the thing
 *              that knows the verb and has it translated.
 *
 *              A caller that genuinely needs a standalone, announced spinner
 *              passes its own `aria-label` - a TRANSLATED one - and gets
 *              `role="status"` back. Passing an untranslated literal here is the
 *              defect this replaced; `t('...')` is the only correct argument.
 */
import { cn } from "@/lib/utils"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  /* A named spinner is announced; an unnamed one is furniture. Nothing in
     between - a `role="status"` with no name is a live region that says
     nothing, which is worse than silence because it still interrupts. */
  const named = props["aria-label"] !== undefined || props["aria-labelledby"] !== undefined

  return (
    <Loader2Icon
      data-slot="spinner"
      {...(named ? { role: "status" } : { "aria-hidden": true })}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
