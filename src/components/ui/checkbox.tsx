/**
 * Checkbox — restyled for Eyvar.
 *
 * Rules applied
 *   §10.2       14px square, radius 4px, `--ev-blue` fill with a white check
 *               when checked. The stock 16px box and a 4px arbitrary radius
 *               arbitrary value are replaced by `size-3.5` / `rounded-sm`.
 *   §4.3        ANY BOOLEAN SAVED WITH THE FORM IS A CHECKBOX, not a switch.
 *               A switch is for instant-effect settings only. If it needs a
 *               Save, it is this component.
 *   §9.1        the table's selection column uses this at 12px from the card's
 *               inline-start edge, present in the header row and every body
 *               row — but ONLY in `index` and `queue` mode. A LEDGER HAS NO
 *               CHECKBOX COLUMN (§8.3.3, AC-48), and a queue gets one only if
 *               every bulk action offered is a claim or assign action.
 *   §7.7        the rendered box stays 14px while the HIT AREA is >= 24px, via
 *               the `after:-inset-x-3 after:-inset-y-2` pseudo-element — a hit
 *               area from padding plus a compensating negative offset, without
 *               changing the rendered box. §6.2 D-2 may NOT be cited against
 *               §7.7: D-2 names §1.2, §1.3 and §3.1 and reaches nothing else.
 *   §7.2 / D20  2px `--ev-blue` ring at 2px offset. The stock the stock 3px focus ring +
 *               the stock half-opacity ring colour is replaced; `outline-none` is never left bare.
 *   §10.2       helper text for a checkbox indents to the checkbox's LABEL,
 *               not its box. That is `Field`'s job, not this file's.
 *   R19 / §7.1  RESOLVED IN 0.7. The resting box border was `--ev-hairline`
 *               against white — 1.15:1, where `a11y.md` requires 3:1 for an
 *               interactive boundary. 0.4 raised it as R-4 and mitigated it
 *               with the hit area and the label; the ruling is that a
 *               mitigation is not a boundary, and that §7's contrast floor
 *               beats §6.4's "no new colour token". The border is now
 *               `border-border-strong`, mapped from `--ev-hairline-strong`,
 *               which clears 3:1 on every surface a checkbox can sit on. The
 *               value and the three measurements live beside the token in
 *               `globals.css` — the one file where a colour is legal, and the
 *               one place it should have to be changed.
 *               THE TOKEN IS LICENSED FOR THIS ONE USE. It is not a border,
 *               not a divider, not a card edge, not an input border and not a
 *               hover state; an input has a fill and a label to carry it, an
 *               unchecked checkbox has nothing else at all. The CHECKED state
 *               keeps `border-primary`, which already clears 3:1.
 *
 * Removed on arrival: `dark:` variants, the stock 3px focus ring, the stock half-opacity ring colour,
 * the stock fifth-opacity invalid ring (an opacity-modified token).
 */
import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-3.5 shrink-0 items-center justify-center",
        // R19 — `border-border-strong`, not `border-input`. See the header.
        "rounded-sm border border-border-strong bg-card transition-colors outline-hidden",
        // §7.7 — >= 24px hit area, rendered box unchanged.
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "group-has-disabled/field:opacity-50",
        "aria-invalid:border-destructive",
        "data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
