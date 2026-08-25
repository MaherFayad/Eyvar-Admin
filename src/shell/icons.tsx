/**
 * The five workspace glyphs and the sub-tab disclosure — design spec §2.2.
 *
 * §2.2: *"20px, 1.5px stroke, `currentColor`, all from one icon family (§1.5).
 * **None of the five mirrors** — all are objects, marks or characters (§9.5).
 * The currency glyph in particular is a character and must not be flipped."*
 *
 * Drawn here rather than picked from lucide for two reasons:
 *
 *   1. **Four of the five are the legacy candidates the design spec named**,
 *      and §3.3 asks that they be evaluated before new ones are drawn:
 *      `:487` (axis + rising line), `:498` (concentric circles + centre dot),
 *      `:527` (currency stroke through a vertical line), `:533` (speech
 *      bubble — the headset arc is added, per §2.2's concept). Only the gear
 *      is new: legacy `:539` is a circle between two arcs, not a gear.
 *   2. The rail's active state changes the glyph's colour and nothing else, so
 *      all five must sit on **one** optical grid or the column reads ragged.
 *
 * Construction matches lucide exactly — `viewBox="0 0 24 24"`, `fill="none"`,
 * `stroke="currentColor"`, 1.5px, round caps and joins — so a rail glyph and a
 * lucide glyph elsewhere in the shell are the same family, which is what §1.5
 * asks for. There is **no `.icon-mirror` class on any of these** (§14: no
 * blanket `scaleX(-1)`; mirroring is per-glyph and opt-in).
 */

import type { SVGProps } from 'react'
import type { WorkspaceId } from '@/data/types'

type GlyphProps = SVGProps<SVGSVGElement>

/** The one place the shared attributes live, so five glyphs cannot drift apart. */
function Glyph({ children, ...props }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Management — a chart axis with a rising line. Legacy `:487`. */
function ManagementGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </Glyph>
  )
}

/** Operations — concentric circles with a centre dot. Legacy `:498`. */
function OperationsGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="10" strokeDasharray="2 3" />
    </Glyph>
  )
}

/**
 * Financials — a currency stroke through a vertical line. Legacy `:527`.
 * §2.2 and §9.5: this is a **character**, and a character never flips.
 */
function FinancialsGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 2v20" />
      <path d="M17 5.5H9.75a3.25 3.25 0 0 0 0 6.5h4.5a3.25 3.25 0 0 1 0 6.5H6.5" />
    </Glyph>
  )
}

/** Customer Support — a speech bubble with a headset arc. Legacy `:533` + §2.2. */
function SupportGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M20 13.5a7.5 7.5 0 0 1-9.9 7.1L5 22l1.4-4.6A7.5 7.5 0 1 1 20 13.5z" />
      <path d="M9 12.5v-1a3.5 3.5 0 0 1 7 0v1" />
      <path d="M9 12.5h1.2v2.4H9zM14.8 12.5H16v2.4h-1.2z" />
    </Glyph>
  )
}

/**
 * Admin — sliders.
 *
 * **Not a gear.** The gear this replaced was a circle plus eight detached
 * radial ticks, which at the rail's 20px renders as a ring of dashes — the
 * universal loading spinner. A workspace tile that looks like it is perpetually
 * loading is worse than one with a duller glyph, and settings-as-sliders is
 * unambiguous at 20px because its three horizontal rules survive the hinting.
 */
function AdminGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="17" r="2" />
    </Glyph>
  )
}

const WORKSPACE_GLYPHS: Record<WorkspaceId, (props: GlyphProps) => React.JSX.Element> = {
  management: ManagementGlyph,
  operations: OperationsGlyph,
  financials: FinancialsGlyph,
  support: SupportGlyph,
  admin: AdminGlyph,
}

export function WorkspaceGlyph({
  workspaceId,
  ...props
}: GlyphProps & { workspaceId: WorkspaceId }) {
  const Component = WORKSPACE_GLYPHS[workspaceId]
  return <Component {...props} />
}

/* `SubTabDisclosureGlyph` was deleted in 02-shell-fixes. The sub-tab column no
   longer collapses (`DECISIONS.md` **D5**), so the control it drew does not
   exist. It was the only glyph in the product that mirrored, which is why §14's
   per-glyph `rtl:-scale-x-100` opt-in now has zero call sites — leave the ban on
   a blanket `svg { scaleX(-1) }` in place regardless. */
