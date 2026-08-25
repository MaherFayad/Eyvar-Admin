/**
 * Kbd - restyled for Eyvar.
 *
 * Added in 0.4 beyond spec §5.2's list, deliberately: the top bar's search field
 * requires a trailing Cmd K / Ctrl K keycap chip (design spec §4, slot 3), and a
 * Phase 1 agent may never run the CLI to add it later.
 *
 * Rules applied
 *   §14        THE CHIP'S POSITION MIRRORS IN ARABIC; ITS GLYPH ORDER DOES NOT.
 *              Nothing here may apply `scaleX(-1)`, and there is no blanket
 *              `svg` mirror anywhere in the product.
 *   §14/AC-76  Western characters, no emoji. The command mark is a mark, not an
 *              emoji character.
 *   §13.2      the shortcut it names must actually work from anywhere: Cmd K /
 *              Ctrl K opens global search and focuses it.
 *   R15        rounded rectangle, radius 4px at this size - a keycap is smaller
 *              than a badge, and 4px is on the grid.
 *   a11y       `pointer-events-none`: the chip is a legend, not a button. The
 *              control is the field it sits in.
 *
 * Removed on arrival: `dark:` variant.
 */
import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
