/**
 * **The profile's only kind of control: a navigation, with §11.2's refusal.**
 *
 * Both of the captain profile's controls are this component — `Open compliance
 * file` beside the document list, `Open payouts` beside the earnings — and both
 * render on **both surfaces**, from this one implementation. §3's parity
 * contract requires that: a command available on the page and missing from the
 * sheet is exactly the divergence the contract exists to refuse, and the way to
 * guarantee it is for there to be one declaration rather than two that agree.
 *
 * ## Allowed it is an `<a>`, not a button with a handler
 *
 * A navigation is honestly a link: middle-click and open-in-new-tab work, and
 * the destination is in the status bar before the operator commits to it. The
 * rider profile's back control reaches the same conclusion for the same reason
 * (*"`navigate(-1)` could be neither of those things"*), and `ReturnControl`
 * records it.
 *
 * ## Refused it is a disabled button with its reason as real text
 *
 * §11.2 — *a blocked control is disabled in place with a stated reason, never
 * hidden.* The sentence is rendered beside the control and bound with
 * `aria-describedby`; it is **not** a tooltip, because
 * `table/rowActions.tsx` already settled that: *"a hover-only explanation is
 * also unreachable by keyboard and unreachable on touch."* §5.7 confines a
 * tooltip to naming a control, which is a different job.
 *
 * `aria-describedby` still points at the sentence even though a `disabled`
 * button is not focusable: some assistive technology exposes disabled controls,
 * and the association costs nothing when it does not.
 *
 * ## What this is not
 *
 * It is never a mutation. Every operation that changes a captain —
 * `suspendDriver`, `reinstateDriver`, `payCaptain`, `applyDeduction`,
 * `waiveDeduction` — is declared once elsewhere and needs a §5.3 confirmation
 * that §5.5 forbids nesting inside the profile modal. `DriverFooter` carries the
 * full argument.
 */

import { useId } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface NavigateControlProps {
  /** An in-app path. Resolved by the caller from the route table, never guessed. */
  to: string
  label: string
  /** Whether the destination route will accept this operator. */
  allowed: boolean
  /** §11.2's sentence. Shown in place when `allowed` is false. */
  reason: string
  /**
   * **`default` has NO call site on either captain surface, and that is the
   * ruling rather than an oversight** (D-CP-6).
   *
   * `Open compliance file` shipped as `default` — the stranded filled button in
   * the owner's screenshot — and three things were wrong with it, only one of
   * them the colour. It is a *navigation*, not the primary act of the list; R3
   * caps the count of filled buttons at one and does not require one. On the
   * sheet it contradicted §6.2's *"the layer commits nothing"*: a filled button
   * in a drawer is the affordance for a commit, and there is none here —
   * `DriverFooter` records at length that all five captain operations are
   * declared elsewhere on purpose. And it was detached from the list it
   * belonged to.
   *
   * **The colour was never the problem.** `globals.css` sets
   * `--primary: var(--ev-brand)` under a written amendment to R2 — *"it is now
   * green, and that is not 'Save is green', it is 'primary is green'"* — with
   * white on it measured at 6.731 : 1. The button was the product's primary
   * rendering correctly. It goes for being FILLED.
   *
   * The prop keeps its type so the component stays usable by a surface that has
   * a primary act. If a third consumer appears, it must say what its filled
   * button commits before it passes `default`.
   */
  variant?: 'default' | 'link'
  /**
   * Which edge the control sits on.
   *
   * **Both captain navigations pass `start`** (D-CP-6). A control that CONTINUES
   * a list is not a trailing action: seated on the list's own inline-start,
   * beneath the hairline that closes it, `Open compliance file` reads as the
   * file's last row rather than as a button that floated free of it. Evidence is
   * `View all billing history` in
   * `10-settings/settings-billing-overview-bills-and-credits.webp` — a plain
   * link at the bottom inline-start of the card it extends.
   *
   * **`end` remains the default** so a surface that has a genuine trailing
   * action still gets one without arguing for it. Nothing on the captain profile
   * takes it.
   *
   * Logical, so it mirrors: `items-start` / `items-end` resolve against the
   * document's direction (§9.1).
   */
  align?: 'start' | 'end'
  className?: string
}

export function NavigateControl({
  to,
  label,
  allowed,
  reason,
  variant = 'link',
  align = 'end',
  className,
}: NavigateControlProps) {
  const reasonId = useId()
  const lane = align === 'start' ? 'items-start' : 'items-end'

  if (!allowed) {
    return (
      <div className={className}>
        <div className={cn('flex flex-col gap-1', lane)}>
          <Button variant={variant} disabled aria-describedby={reasonId}>
            {label}
          </Button>
          <span id={reasonId} className="text-xs text-muted-foreground">
            {reason}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className={cn('flex flex-col', lane)}>
        <Button variant={variant} asChild>
          <Link to={to}>{label}</Link>
        </Button>
      </div>
    </div>
  )
}
