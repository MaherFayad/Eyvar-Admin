/**
 * InputGroup - restyled for Eyvar.
 *
 * Added in 0.4 beyond spec §5.2's list, deliberately: five separate §10.2
 * requirements are all "an addon inside the input box", and a Phase 1 agent may
 * never run the CLI to add it later.
 *
 *   1. MONEY INPUT - `SAR` as an in-field inline-START prefix in `--ev-text-2`,
 *      value inline-end aligned, `tabular-nums`. §9.2's trap: the currency PREFIX
 *      rule governs INPUTS ONLY. A money OUTPUT carries `SAR` TRAILING. Two
 *      different rules, one field type.
 *   2. CHARACTER COUNTER - right-aligned INSIDE the field, `0/40`, only where a
 *      hard limit exists.
 *   3. PHONE - a country-code select docked at the inline-END of the field, with
 *      `dir="ltr"` and bidi isolation on the value; a leading `+` jumps sides in
 *      RTL without it (§9.2).
 *   4. THE TOP-BAR SEARCH FIELD - leading magnifier, trailing Cmd K / Ctrl K
 *      keycap chip (`kbd.tsx`), 400px, 28px tall.
 *   5. GLOBAL SEARCH'S SCOPE CHIP - a removable chip INSIDE the input, followed
 *      by the query. Never a separate dropdown outside the field (§2.6).
 *
 * Rules applied
 *   §10.2      the group's height is the field's height, `--ev-control-h`. An
 *              addon never makes the control taller.
 *   §9.1       addons use `ps-`/`pe-` and `start-`/`end-`, so the prefix follows
 *              the reading direction.
 *   §7.2       focus lands on the CONTROL and the ring is drawn around the whole
 *              group, so a prefixed field shows one ring, not two.
 *   §5.7       an addon names or formats. It never carries a constraint - that is
 *              helper text.
 *
 * Removed on arrival: `dark:` variants (three), the
 * the stock radius-minus-N and negative-rem inset
 * arbitrary values.
 */
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:bg-input/50 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-2 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pe-1.5 has-[>[data-align=inline-start]]:[&>input]:ps-1.5",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-sm [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first ps-2 has-[>button]:-ms-1 has-[>kbd]:-ms-0.5",
        "inline-end":
          "order-last pe-2 has-[>button]:-me-1 has-[>kbd]:-me-0.5",
        "block-start":
          "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-sm px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "",
        "icon-xs":
          "size-6 rounded-sm p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  )
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
