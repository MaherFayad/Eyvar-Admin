/**
 * Block-type glyphs missing from the shared icon registry, kept local since
 * that file has another owner. Same icon() sizing/stroke contract.
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
