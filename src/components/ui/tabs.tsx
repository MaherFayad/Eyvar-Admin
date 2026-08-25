/**
 * Tabs - restyled for Eyvar.
 *
 * Rules applied
 *   §3.2/§2.6  TABS LIVE INSIDE THE TABLE CARD, NEVER IN THE PAGE HEADER. They
 *              are saved views over one dataset, so they belong to that dataset's
 *              card. A tab row in the page header is a second navigation level,
 *              and D-4 already spent that budget.
 *   §9.1       `All` is first and always the default; a trailing `+` creates a
 *              saved view.
 *   §3.2       ONLY THE SELECTED TAB EXPOSES A CHEVRON and its actions menu.
 *              Unselected tabs stay plain.
 *   §9.4       switching views REPLACES THE WHOLE CARD BODY, INCLUDING THE HEADER
 *              ROW. Selection clears (AC-25); the toolbar - tabs, search, filters
 *              - persists (§4.4).
 *   §9.4       the VIEW, not the route, chooses the `DataTable` mode. Operations
 *              > People's `Captains` view is `index` and its `Applications` view
 *              is `queue`, on one route.
 *   AC-47      search mode REPLACES THE TAB ROW IN PLACE with no vertical shift.
 *              That swap belongs to `IndexToolbar` (D-02), not here.
 *   §7.2/§7.5  active tab = `--ev-bg2` fill PLUS weight 600 - two carriers, so it
 *              survives greyscale. The stock white-on-white pill is invisible on
 *              a white card.
 *   R15        radius 8px. The `line` variant's underline is `--ev-blue`, not
 *              `--ev-ink`.
 */
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-1 text-muted-foreground group-data-horizontal/tabs:h-control group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pe-1 has-data-[icon=inline-start]:ps-1 group-data-[variant=default]/tabs-list:data-active:shadow-none group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-accent data-active:text-foreground data-active:font-semibold",
        "after:absolute after:bg-primary after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-1 group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-end-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
