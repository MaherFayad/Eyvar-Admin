/**
 * Separator - restyled for Eyvar.
 *
 * Rules applied
 *   §3.1       the Overview separator: 1px `--ev-hairline` between the `Overview`
 *              row and the rest of the sub-tab column, 4px above and below.
 *              Overview is a different KIND of destination - it reads, it never
 *              acts - and the rule is worth encoding once in the chrome rather
 *              than re-explaining per workspace.
 *   §2.1       the rail's rule above the pinned `Admin` tile, 8px above and below.
 *   §3.3       menu group dividers, and the add/remove or scope pairing in a bulk
 *              overflow menu.
 *   §10.1      card section rules.
 *   §1.1       the nav/canvas separator is also a 1px `--ev-hairline`, because
 *              Eyvar's token set has no neutral darker than `--ev-bg` and §6.4
 *              forbids inventing one (sanctioned deviation #3).
 *   a11y       `decorative` defaults to true, so a purely visual rule is not
 *              announced. A separator that carries meaning - a group boundary in
 *              a menu - must pass `decorative={false}`.
 */
import * as React from "react"
import { Separator as SeparatorPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
