/**
 * Block-type glyphs the shared registry (`components/icons.ts`) does not
 * carry yet — that file is another owner's, so these stay local rather than
 * landing there unreviewed. Same `icon()` contract: 1.75 stroke, `size-4`.
 * Flagged in the WP-4.2 handoff for the icon owner to promote if wanted.
 */

import { createElement, forwardRef } from 'react'
import {
  BookmarkIcon as RawBookmark,
  ChevronDownIcon as RawChevronDown,
  Heading1Icon as RawHeading1,
  MegaphoneIcon as RawMegaphone,
  MinusIcon as RawMinus,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'

const STROKE = 1.75

function icon(Base: LucideIcon, displayName: string): LucideIcon {
  const Wrapped = forwardRef<SVGSVGElement, LucideProps>((props, ref) =>
    createElement(Base, { strokeWidth: STROKE, ...props, ref }),
  )
  Wrapped.displayName = displayName
  return Wrapped as LucideIcon
}

export const HeadingBlockIcon = icon(RawHeading1, 'HeadingBlockIcon')
export const CalloutBlockIcon = icon(RawMegaphone, 'CalloutBlockIcon')
export const DividerBlockIcon = icon(RawMinus, 'DividerBlockIcon')
export const ToggleBlockIcon = icon(RawChevronDown, 'ToggleBlockIcon')
export const BookmarkBlockIcon = icon(RawBookmark, 'BookmarkBlockIcon')
