/**
 * DropdownMenu - restyled for Eyvar.
 *
 * Row actions (the kebab), `More actions`, and the account menu.
 *
 * Rules applied
 *   §5.4       a list of commands ON AN OBJECT. Verb-first imperatives, sentence
 *              case, no trailing punctuation (R6).
 *   §3.3/§5.4  THE DESTRUCTIVE ITEM IS LAST AND SEPARATED BY A DIVIDER, BUT IT IS
 *              NOT RED. "Destructive overflow items are not red - the
 *              confirmation carries the weight." The stock
 *              `data-[variant=destructive]` red text and red focus fill are
 *              REMOVED; the variant survives only as a marker so a caller can say
 *              which item sorts last.
 *   §3.3       overflow items are grouped by divider into add/remove or scope
 *              pairs.
 *   §8         the page header collapses everything after the first two secondary
 *              actions into `More actions` (design spec §8, slots 4a/4b).
 *   §11.2      an action the role cannot use renders DISABLED IN PLACE with its
 *              reason available - never hidden, never checked only on commit. The
 *              systemic legacy defect (`:10237`, `:11876`) is that the operator
 *              clicks, waits, and is told no.
 *   §7.2       FOCUS INDICATOR NOTE: menu items use a roving highlight, so their
 *              visible focus state is the `--ev-bg2` accent fill on
 *              `data-highlighted` / `:focus`, not a ring. That IS a replacement
 *              for the outline, which is what §7.2 requires; a ring on top of a
 *              roving highlight double-signals on every arrow-key press.
 *   §7.4       every kebab is a `<button>` with an accessible name (AC-65).
 *
 *   OWNER RULING  A MENU ITEM IS ALWAYS ONE LINE. The menu sizes to its widest
 *              item (`w-max`), never to its trigger. The stock shadcn content
 *              carried `w-(--radix-dropdown-menu-trigger-width)`, which is the
 *              SELECT/combobox rule - match the input - wrongly applied to a
 *              command menu. Against a 28px kebab it collapsed every row-action
 *              menu to the 128px floor and wrapped `Open 360 profile` onto two
 *              lines. Items are `whitespace-nowrap`; the menu widens instead.
 *
 *   §7.6       `duration-100` — the licensed value for a popover, dropdown,
 *              tooltip or command list (`motion.md`). Tailwind's own scale is
 *              the token set; there is no `--ev-duration-*` and adding one is
 *              the defect.
 *
 * ## DEFECT D-11 — the design ruling, made
 *
 * `02-shell-fixes.md` §13 raised this to product-designer and left it open, and
 * `shell/qa.keyboard.test.tsx` carries it as an `it.fails`. It is a ruling, not
 * a bug report, so here is the ruling.
 *
 * The defect: a menu item that opens a shell layer leaves focus OUTSIDE the
 * layer. `See all` (the bell) and `My profile` (this menu) both do it. The
 * layer moves focus in; the menu then closes, restores focus to its own trigger
 * asynchronously, and wins because it writes last. Measured in the production
 * build: focus is on the sheet title at t=0, on `body` at ~50ms, and back on
 * the menu trigger at ~150ms while the drawer is still open. A keyboard
 * operator who opens `My profile` from here must Tab the whole page to reach
 * the panel that just appeared.
 *
 * RULING - THE LAYER WINS. A MENU THAT HANDS OFF DOES NOT TAKE FOCUS BACK.
 *
 * The reasoning is lifetime (R10). A menu is a transient command surface, and
 * its focus-restore exists so that dismissing it costs the operator nothing. A
 * layer is a DESTINATION. Restoring focus to the trigger is right when the menu
 * closes and nothing replaces it, and wrong the moment the selection produced
 * somewhere to go: where the operator's eye goes, their focus goes.
 *
 * Mechanism, for whoever implements it. Radix fires `onCloseAutoFocus` on the
 * closing content, and `event.preventDefault()` there suppresses the restore
 * and nothing else. It must be CONDITIONAL - a menu closed by `Escape`, or on
 * an item that opens no layer, still owes the trigger its focus, and a menu
 * used INSIDE an already-open drawer must keep restoring normally. The
 * condition is "this selection opened a layer", which only the call site knows:
 * the shell's two hand-off items (`AccountMenu`'s `My profile`,
 * `NotificationBell`'s `See all`) raise a flag in `onSelect` and read it in
 * `onCloseAutoFocus`. Do NOT make it unconditional here - that would silently
 * break every ordinary kebab in the product.
 *
 * Flipping `qa.keyboard.test.tsx`'s `it.fails` back to `it` is part of that
 * change and not a follow-up: the suite goes red either way round otherwise.
 */
import * as React from "react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"
import { nextIcon, useIconDirection } from "@/components/icons"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={cn("z-50 max-h-(--radix-dropdown-menu-content-available-height) w-max min-w-40 max-w-(--radix-dropdown-menu-content-available-width) origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-2 border border-border duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm whitespace-nowrap outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:ps-7 data-disabled:pointer-events-none data-disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-lg py-1 pe-8 ps-1.5 text-sm whitespace-nowrap outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:ps-7 data-disabled:pointer-events-none data-disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute end-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon
          />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-default items-center gap-1.5 rounded-lg py-1 pe-8 ps-1.5 text-sm whitespace-nowrap outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:ps-7 data-disabled:pointer-events-none data-disabled:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute end-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon
          />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground data-inset:ps-7",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ms-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  const SubChevron = nextIcon(useIconDirection())
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-default items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm whitespace-nowrap outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-inset:ps-7 data-open:bg-accent data-open:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      {/* O10 - the submenu points toward the inline END, picked by `dir`. */}
      <SubChevron className="ms-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn("z-50 w-max min-w-40 max-w-(--radix-dropdown-menu-content-available-width) origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-2 border border-border duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
