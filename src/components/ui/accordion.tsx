/**
 * Accordion - restyled for Eyvar.
 *
 * Rules applied
 *   §4.7       THE PERMISSIONS MATRIX EXPANDS INLINE. EXPANSION IS NOT
 *              NAVIGATION (`PROPOSED-STRUCTURE.md` §11.1 row 7). An operator
 *              reading "exactly what your role can do" must not be sent to
 *              another page to read one more line of it.
 *   §6.4       my-profile's password and 2FA sections expand IN PLACE inside the
 *              drawer, because §5.5 forbids a modal nested in a drawer. While a
 *              section is in edit mode the drawer's own footer carries `Cancel`
 *              plus the committing primary, disabled until valid.
 *   §7.4       the trigger is a `<button>` with a visible focus ring and an
 *              `aria-expanded` state. Never a `<div>` with an `onClick` - the
 *              legacy app has 253 non-focusable click handlers and this is not
 *              the 254th.
 *   §7.6       the height transition is suppressed under
 *              `prefers-reduced-motion` by the global guard in `globals.css`.
 *   §7.6       `transition-colors`, and NOT the blanket `all` variant (whose
 *              class name is deliberately not spelled here, because Tailwind
 *              v4 scans comments as plain text and would emit it). `all`
 *              reached the focus ring on `box-shadow` (§7.2), and because
 *              Inter Variable is declared `font-weight: 100 900` it would
 *              interpolate any weight change on the trigger. `motion.md`
 *              licenses no motion here: the trigger's hover and focus are
 *              colour, and the content's height change below is the
 *              disclosure itself.
 *   R15        radius 8px on the trigger's focus surface.
 */
import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-start text-sm font-medium transition-colors outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:after:border-ring disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon data-slot="accordion-trigger-icon" className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden" />
        <ChevronUpIcon data-slot="accordion-trigger-icon" className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "h-(--radix-accordion-content-height) pt-0 pb-2.5 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
