/**
 * Command - restyled for Eyvar.
 *
 * Two jobs: GLOBAL SEARCH (Cmd K / Ctrl K, §2.6) and every combobox / resource
 * picker (§4.5).
 *
 * Rules applied
 *   override   global search is a CENTRED MODAL, 640 wide with its top edge at
 *              16vh (RULINGS, "The command palette is a centred modal",
 *              2026-09-05). This supersedes §2.6 and CQ-1 for this surface and
 *              for nothing else; every combobox below is untouched.
 *   §2.6       the SCOPE IS A REMOVABLE CHIP INSIDE THE INPUT, followed by the
 *              query. Never a separate dropdown outside the field. `Backspace` on
 *              an empty query removes the chip.
 *   §5         sections run in the fixed order Destinations, Records, Actions,
 *              each labelled with a count. Destinations first, because §4.3.4's
 *              stated job is finding where a page moved.
 *   §5         AN ESCAPE-HATCH ROW IS ALWAYS LAST:
 *              `Search for "{query}" in {scope}`.
 *   §5/R8      scoped with no query shows one centred prompt (`Search trips`) and
 *              NEVER a "no results" error. A query with no matches shows one grey
 *              sentence - `no-match`, no illustration, no heading.
 *   AC-60      results the role cannot open NEVER APPEAR. This is where
 *              `view_profiles` becomes a real gate.
 *   §5.4       end-of-list is stated IN WORDS. Never a blank surface.
 *   §7.2       FOCUS INDICATOR NOTE: items use a roving highlight - see
 *              `dropdown-menu.tsx`.
 *   §10.2      as a combobox: leading magnifier, plus a `Browse` secondary where
 *              a catalogue exists. Picked resources render as removable rows
 *              beneath the picker.
 */
import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { SearchIcon, CheckIcon } from "lucide-react"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * Restyled on arrival. Three changes, all defects in the stock component:
 * the title and description were OUTSIDE `DialogContent`, so nothing labelled
 * the dialog; the geometry was three arbitrary overrides, and is now
 * `size="palette"`; and the copy defaulted to two English literals, which
 * AC-74 forbids, so both are required props.
 */
function CommandDialog({
  title,
  description,
  children,
  className,
  showCloseButton = false,
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title: string
  description: string
  className?: string
  showCloseButton?: boolean
  onOpenAutoFocus?: React.ComponentProps<typeof DialogContent>["onOpenAutoFocus"]
}) {
  return (
    <Dialog {...props}>
      <DialogContent
        size="palette"
        className={className}
        showCloseButton={showCloseButton}
        onOpenAutoFocus={onOpenAutoFocus}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-8! rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:ps-2!">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        /* 8px above the label, 4px below it. D18 licenses the uppercase
           eyebrow on the profile band and nowhere else, so the group label is
           muted and small rather than small-caps. */
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm whitespace-nowrap outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ms-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ms-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
