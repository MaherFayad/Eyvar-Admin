/**
 * DirectionProvider - Radix's direction context. Added in 0.4 deliberately.
 *
 * Not on spec §5.2's list, but the shell cannot be correct in Arabic without it:
 * Radix reads text direction from this context, not from the DOM, so without it
 * every popover side, every menu alignment and every arrow-key traversal stays
 * LTR while the page mirrors.
 *
 * Rules applied
 *   AC-70      `dir` flips on the DOCUMENT ELEMENT, not on a subtree. §9.3's
 *              ratified `.sb`-only scoping was a policy for a HALF-TRANSLATED
 *              product; the rebuild translates everything, so its precondition is
 *              gone. This provider must be fed the SAME value that is set on
 *              `<html>` - one source, never two.
 *   §14        ONE HOOK ONLY. Language-varying DIMENSIONS live under
 *              `:root:lang(ar)` in `globals.css`; DIRECTION lives here and on the
 *              document element. Never `body.lang-ar` and `[dir="rtl"]` as
 *              parallel expressions of the same condition.
 *   AC-71      the nav renders on the inline-end physical side in Arabic. That
 *              falls out of logical utilities plus this provider; no component
 *              branches on direction.
 *   §11.6 #23  switching language keeps the operator on the same route, the same
 *              view and the same scroll position.
 *
 * Nothing here is restyled - it renders no DOM.
 */
"use client"

import * as React from "react"
import { Direction } from "radix-ui"

function DirectionProvider({
  dir,
  direction,
  children,
}: React.ComponentProps<typeof Direction.DirectionProvider> & {
  direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"]
}) {
  return (
    <Direction.DirectionProvider dir={direction ?? dir}>
      {children}
    </Direction.DirectionProvider>
  )
}

const useDirection = Direction.useDirection

export { DirectionProvider, useDirection }
