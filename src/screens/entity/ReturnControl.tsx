/**
 * **The back affordance** — owner amendment 1, spec §7.2, AC-RP-14 … AC-RP-19.
 *
 * A single `←` at the inline-start of the band's name row. Icon-only, with an
 * accessible name and a tooltip that name the **destination** rather than the
 * action — `Back to Riders` — which is the one thing §5.7 sanctions a tooltip
 * for (*naming an icon-only control*) and is not a breadcrumb trail (§2.6).
 *
 * It is **an `<a>`, always**, because it always has a destination: `back.ts`
 * resolves `location.state.from` first and the record's index second, and there
 * is no third case. That is what lets it satisfy §11.2 without a branch — it is
 * never hidden and never disabled, in any of the four states, including the 404
 * where it is the only control that must still work (AC-RP-19).
 *
 * A link rather than a button is also the honest element: middle-click and
 * open-in-new-tab work, and the destination is in the status bar before the
 * operator commits to it. `navigate(-1)` could be neither of those things.
 *
 * Rules applied
 *   §8 slot 1  one `←`, never a trail. **Mirrored at string-construction time**
 *              through `mirrorGlyph` (§9.5), never `scaleX(-1)` (AC-RP-15).
 *   §7.2       it rests on `--ev-hero`, where `--ring` (brand green at
 *              1.15 : 1) is not a visible ring, so it takes the band's own —
 *              `ring-hero-foreground` on `ring-offset-hero`, exactly as
 *              `BoardPeriodControl` and the sheet's close control already do.
 *   §5.7       the tooltip NAMES the control. It carries no constraint and no
 *              explanation, and the same string is the `aria-label`, so a
 *              keyboard or screen-reader operator is not told less.
 *   §9.1       `-ms-2` pulls the glyph out to the band's text edge and mirrors
 *              with it. No physical utility anywhere.
 */

import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { mirrorGlyph, type Direction } from '@/lib'

export interface ReturnControlProps {
  /** Already resolved by `back.ts` — `state.from`, or the record's index. */
  to: string
  /** Already translated, and it names the DESTINATION: `Back to Riders`. */
  label: string
  dir: Direction
}

export function ReturnControl({ to, label, dir }: ReturnControlProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          asChild
          className={cn(
            '-ms-2 shrink-0 text-hero-foreground',
            'hover:bg-hero-2 hover:text-hero-foreground',
            'focus-visible:ring-hero-foreground focus-visible:ring-offset-hero',
          )}
        >
          <Link to={to} aria-label={label} data-testid="profile-back">
            {/* §9.5 — the glyph is swapped in the STRING. `←` in LTR, `→` in
                RTL, and no transform anywhere near it. */}
            <span aria-hidden="true" className="text-base leading-none">
              {mirrorGlyph('←', dir)}
            </span>
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
