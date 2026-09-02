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
 *   §7.6       `transition-colors`, and NOT the blanket `all` variant. That
 *              one is not a wider net, it is a different rule: `--font-sans`
 *              leads with Inter Variable declared `font-weight: 100 900`
 *              (`globals.css` @font-face), so the weight axis INTERPOLATES.
 *              With `all`, the `font-semibold` on the selected state animated
 *              500 -> 600 over 150ms and the label physically thickened.
 *              `motion.md` licenses five kinds of motion and text growing is
 *              none of them - a selection is a colour change and a weight
 *              change, both instant. `all` also transitioned the focus ring,
 *              which rides on `box-shadow` (§7.2): a ring that fades in is a
 *              ring that is not there yet. Arabic carries the same axis
 *              (Naskh 400-700), so this was not a Latin-only defect.
 *              The class name itself is deliberately not spelled here:
 *              Tailwind v4 scans comments as PLAIN TEXT, so naming a
 *              utility in prose emits it into the stylesheet. A physical
 *              margin utility once shipped from a comment forbidding it,
 *              which is why this paragraph names no class at all.
 *   R15        radius 8px. The `line` variant's underline is `--ev-blue`, not
 *              `--ev-ink`.
 *
 * ## `aria-controls` never points at a panel that is not there (P1-6)
 *
 * axe reported this as **critical on every index screen**, and the root cause
 * is one line of Radix: `Tabs.Trigger` writes
 * `aria-controls={baseId + '-content-' + value}` **unconditionally**, whether
 * or not a `Tabs.Content` with that value was ever rendered. Two independent
 * ways it dangles:
 *
 *   1. **The view switcher.** `IndexToolbar` (and `FairnessScreen`) use `Tabs`
 *      as a switcher over a dataset whose body `DataTable` renders as a
 *      SIBLING, outside the `Tabs` root. There is no `TabsContent` at all, so
 *      **every trigger, selected one included, references a missing id.**
 *   2. **A real tab set.** Radix mounts only the SELECTED panel (`Presence` is
 *      `present={forceMount || isSelected}` and returns `null` otherwise), so
 *      the unselected triggers on `DispatchScreen` reference ids that do not
 *      exist yet either.
 *
 * **The fix is a panel registry, here, once — not a patch per screen.**
 * `TabsContent` registers its `value` while it is mounted; `TabsTrigger` emits
 * `aria-controls` only when a panel with its value is actually in the DOM, and
 * otherwise passes `undefined`, which React drops (our props are spread AFTER
 * Radix's own inside the primitive, so ours wins). No call site changes and no
 * call site can get it wrong.
 *
 * **`role="tab"` stays**, and that is a decision rather than an omission.
 * `aria-controls` is a SUPPORTED property of `tab`, not a required one, so a
 * tab without one is valid ARIA — while `aria-selected` is required, and it is
 * the state the switcher actually needs a screen reader to announce
 * (*"Applications, tab, selected, 2 of 4"*). The two alternatives were weighed:
 * pointing `aria-controls` at the table body needs an id from
 * `DataTable`/`IndexToolbar`, which this owner may not edit; and re-roling to
 * `radiogroup`/`radio` would lose that announcement, need an accessible name on
 * a list that has no string to give it, and rewrite four QA-owned test files.
 * Both are recorded in the handoff.
 */
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Which `value`s currently have a `TabsContent` MOUNTED under this root.
 *
 * `null` outside a `Tabs` — a lone `TabsTrigger` is a call-site error, and
 * treating "no context" as "assume the panel exists" keeps this from silently
 * changing that case's markup.
 */
const TabsPanelContext = React.createContext<ReadonlySet<string> | null>(null)

/**
 * **Two contexts, deliberately.** The register function must be
 * IDENTITY-STABLE: put it in the same object as the set and every registration
 * changes that object, which re-runs `TabsContent`'s effect, which unregisters
 * and registers again — an infinite loop. The set changes; the registrar never
 * does.
 */
const TabsRegisterContext = React.createContext<((value: string) => () => void) | null>(null)

function Tabs({
  className,
  orientation = "horizontal",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const [mounted, setMounted] = React.useState<ReadonlySet<string>>(() => new Set())

  /* Identity-stable, so `TabsContent`'s effect runs on mount and unmount and
     never on a re-render of the root. */
  const register = React.useCallback((value: string) => {
    setMounted((previous) => {
      if (previous.has(value)) return previous
      const next = new Set(previous)
      next.add(value)
      return next
    })
    return () => {
      setMounted((previous) => {
        if (!previous.has(value)) return previous
        const next = new Set(previous)
        next.delete(value)
        return next
      })
    }
  }, [])

  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    >
      <TabsRegisterContext.Provider value={register}>
        <TabsPanelContext.Provider value={mounted}>{children}</TabsPanelContext.Provider>
      </TabsRegisterContext.Provider>
    </TabsPrimitive.Root>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-1 text-muted-foreground group-data-horizontal/tabs:h-control group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        /* D12 — the owner's own reference: a STADIUM track with an inset pill.
           `p-0.5` is the 2px inset that makes the segments read as abutting;
           `gap-0` because a divider between segments is what the reference
           does NOT have. The track's own border is what gives a very light
           fill a shape. */
        segmented: "gap-0 rounded-full border border-border-control bg-muted p-0.5",
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
  const mounted = React.useContext(TabsPanelContext)
  /* No provider means this trigger is outside a `Tabs` root — leave Radix's
     markup exactly as it was rather than editing markup we cannot reason about. */
  const hasPanel = mounted === null || mounted.has(props.value)

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pe-1 has-data-[icon=inline-start]:ps-1 group-data-[variant=default]/tabs-list:data-active:shadow-none group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-accent data-active:text-foreground data-active:font-semibold",
        "after:absolute after:bg-primary after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-1 group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-end-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
      /* AFTER `props`, and after Radix's own defaults inside the primitive:
         `undefined` deletes the attribute rather than pointing it at nothing.
         Spread conditionally so a trigger WITH a panel keeps the id Radix
         computed — this drops a dangling reference and adds none. */
      {...(hasPanel ? null : { "aria-controls": undefined })}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const register = React.useContext(TabsRegisterContext)
  const value = props.value

  /* `useLayoutEffect`, not `useEffect`: the trigger's `aria-controls` is
     correct before the browser paints, so nothing observes the one frame in
     which the panel exists and the reference to it does not. */
  React.useLayoutEffect(() => register?.(value), [register, value])

  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      /* **No `outline-none` here** (§7.2 / D20). Radix gives the panel
         `tabIndex={0}`, so a keyboard user tabbing off the tab list lands ON
         it — and `globals.css` ships `:focus-visible { outline: 2px solid
         var(--ring) }` as the product default, which this class was opting
         out of with nothing put back. D20: components opt into a STRONGER
         ring, never out of one. */
      className={cn("flex-1 text-sm", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
