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

/** Admin — a gear. */
function AdminGlyph(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" />
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

/**
 * The sub-tab disclosure — §2.5. **Two states, one control, one position.**
 *
 * Expanded → a **filled** two-panel icon, `Hide sub-tabs`.
 * Collapsed → an **outline** two-panel icon, `Show sub-tabs`.
 *
 * This one DOES mirror, and it mirrors correctly by construction rather than
 * by CSS: the narrow panel is drawn at the INLINE-START, and the element
 * carries `rtl:-scale-x-100`. §14 bans a blanket `scaleX(-1)` on `svg` or any
 * broad selector — this is the per-glyph, opt-in case that ban leaves open,
 * and the decision is carried in the icon's own definition, which is where §14
 * says it belongs.
 */
export function SubTabDisclosureGlyph({
  filled,
  ...props
}: GlyphProps & { filled: boolean }) {
  return (
    <Glyph {...props} className={`rtl:-scale-x-100 ${props.className ?? ''}`}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      {filled && <path d="M4.5 5.5h3v13h-3z" fill="currentColor" stroke="none" />}
    </Glyph>
  )
}
