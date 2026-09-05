/**
 * The initials avatar, promoted from the shell (design 12 §3.1, R4-7). Every
 * avatar in the product is initials today; the fallback is never blank (§7.5).
 * `channel` draws a glyph slot at the bottom inline-end corner so a list row
 * says which pipe the conversation came down without a badge.
 */

import type { ConversationChannel } from '@/data/types'
import { Avatar as AvatarRoot, AvatarFallback } from '@/components/ui/avatar'
import { ChatIcon, EmailIcon, PhoneIcon, WhatsAppIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export type AvatarSize = 'xs' | 'sm' | 'default' | 'lg'

export interface AvatarProps {
  name: string
  size?: AvatarSize
  /** Draws the channel glyph at the corner (list rows and the thread header). */
  channel?: ConversationChannel | null
  /** The accessible name; the initials are decorative when one is given. */
  label?: string
  className?: string
}

const CHANNEL_ICON = {
  chat: ChatIcon,
  email: EmailIcon,
  phone: PhoneIcon,
  whatsapp: WhatsAppIcon,
} as const

/** Characters taken out of a proper noun, not a sentence: not an AC-75 concatenation. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function Avatar({ name, size = 'default', channel = null, label, className }: AvatarProps) {
  const Glyph = channel === null ? null : CHANNEL_ICON[channel]
  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      role={label === undefined ? undefined : 'img'}
      aria-label={label}
    >
      <AvatarRoot size={size} aria-hidden={label !== undefined ? true : undefined}>
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </AvatarRoot>
      {Glyph !== null && (
        /* The 20px slot sits on the avatar's corner: --ev-surface with a
           hairline so it reads on any ground (design 12 §3.1). */
        <span
          aria-hidden="true"
          className="absolute -end-1.5 -bottom-1.5 inline-flex size-5 items-center justify-center rounded-sm border border-border bg-card text-muted-foreground"
        >
          <Glyph className="size-3.5" />
        </span>
      )}
    </span>
  )
}
