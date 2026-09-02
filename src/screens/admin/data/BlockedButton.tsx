/**
 * §11.2, on this screen's card-level actions: an act the operator may not take
 * is **disabled in place with its reason**, never hidden.
 *
 * Two of the three cards on Admin › Data hid their save behind
 * `{canWrite && (…)}`. A hidden control teaches an operator that the capability
 * does not exist, so they stop asking for it — which is the failure §11.2 is
 * written against, and it is worse than a dead button because it is invisible
 * to a bug report as well.
 *
 * The construction is `components/table/rowActions.tsx`'s `SingleRowAction`,
 * verbatim in behaviour: the button carries `aria-describedby` pointing at a
 * real rendered sentence, **not** a `title`. §5.7 confines a tooltip to naming
 * an icon-only control, §8.4.4 says outright that the reason must not be a
 * tooltip, and a hover-only explanation is unreachable by keyboard and by
 * touch. `RefusalLine` there is module-private, so its shape is reproduced here
 * rather than that file being edited — noted in the handoff as a candidate for
 * export, because a third copy of it would be a copy too many.
 *
 * Rules applied
 *   §11.2      disabled in place, with the reason rendered beside it.
 *   §8.4.4     the reason is text, never a tooltip and never behind a click.
 *   §7.2       nothing here removes an outline; the primitive keeps its ring.
 *   R3         `variant` is the caller's — a screen has one primary and this
 *              component must not quietly mint a second.
 */

import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export interface BlockedButtonProps {
  children: ReactNode
  onClick: () => void
  /** The sentence, or `null` when the act is allowed. Presence is what disables. */
  reason: string | null
  /** Disabled for a non-permission reason — in flight, nothing changed yet. */
  disabled?: boolean
  variant?: 'default' | 'secondary'
  /** The bare label, so a reason line does not become part of the accessible name. */
  label: string
}

export function BlockedButton({
  children,
  onClick,
  reason,
  disabled = false,
  variant = 'secondary',
  label,
}: BlockedButtonProps) {
  const reasonId = useId()
  return (
    <span className="flex flex-col items-end gap-1">
      <Button
        size="xs"
        variant={variant}
        disabled={disabled || reason !== null}
        aria-label={reason === null ? undefined : label}
        aria-describedby={reason === null ? undefined : reasonId}
        onClick={onClick}
      >
        {children}
      </Button>
      {reason !== null && (
        <span id={reasonId} className="block text-xs font-normal whitespace-normal text-muted-foreground">
          {reason}
        </span>
      )}
    </span>
  )
}
