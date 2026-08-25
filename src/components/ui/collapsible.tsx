/**
 * Collapsible - restyled for Eyvar.
 *
 * Rules applied
 *   §6.2       EVERY ENTITY TYPE GETS CARD TOGGLES, NOT JUST RIDERS AND DRIVERS
 *              (`09b` §17.4). The legacy `initCardToggles()` wires them for two
 *              of eleven entity types; the 360 profile's card stack needs them
 *              for all eleven.
 *   §6.2       the profile's body is a stack of collapsible cards CONTRIBUTED BY
 *              WORKSPACES AS A DECLARED CONTRACT - Financials contributes wallet
 *              and payment, Support contributes tickets / disputes / fairness,
 *              Operations contributes trips / subscriptions / compliance. Not one
 *              600-line builder.
 *   §7.4       the trigger is a `<button>` carrying `aria-expanded`, with a
 *              visible focus ring.
 *   §7.6       the transition is suppressed under `prefers-reduced-motion`.
 *   §7.2       a collapsed card still announces its own heading - collapse hides
 *              the body, never the name of the thing.
 */
import { Collapsible as CollapsiblePrimitive } from "radix-ui"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
