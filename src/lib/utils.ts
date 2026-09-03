import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * **`tailwind-merge` has to be told about this product's own type ramp, and
 * before it was, it was silently deleting it.**
 *
 * `twMerge` resolves a conflict by knowing which utilities belong to the same
 * CSS property and keeping the last one. It ships a list of Tailwind's DEFAULT
 * font sizes — `text-xs` through `text-9xl` — and anything else matching
 * `text-*` it classifies as a **text colour**, because that is what `text-*`
 * usually is.
 *
 * `globals.css` declares five sizes that are not on that list: `--text-2xs`
 * (12px, the badge and caption rung), `--text-kpi` (28), `--text-kpi-lead`
 * (36), `--text-kpi-hero` (40) and `--text-band` (30). Every one of them was
 * being treated as a colour, so a call as ordinary as
 *
 *     cn('text-2xs', muted ? 'text-muted-foreground' : 'text-foreground')
 *
 * emitted **only the colour**. The size was dropped before it reached the DOM,
 * the element fell back to the inherited 13px, and nothing anywhere reported
 * it: the class is in the source, the rule is in `dist`, the token is in
 * `@theme`, and the audit that greps for any of those three finds it. It is
 * visible only by measuring a rendered node.
 *
 * The reverse case was worse because it LOOKED right. `cn('text-foreground',
 * 'text-kpi')` keeps the size and drops the colour — a metric value has been
 * rendering at 28px in the inherited colour since the ramp landed, which is
 * the same colour it asked for, so the bug sat under a correct-looking tile.
 * The first surface where the two differed was the board band, where the
 * inherited colour is white-on-green and the dropped one was the whole point.
 *
 * Declaring them here is the fix `tailwind-merge` documents for exactly this:
 * one list, in the module that owns `cn`, so no call site has to know and no
 * future size can be added to `globals.css` without this list being the place
 * it is registered. **A new `--text-*` token belongs in both files.**
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["2xs", "kpi", "kpi-lead", "kpi-hero", "band"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
