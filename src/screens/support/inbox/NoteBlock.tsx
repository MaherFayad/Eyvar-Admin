/**
 * An internal note (design 12 §4.2, §8.6.2): full width, never a bubble, no
 * avatar, `--ev-note` ground with the 3px `--ev-note-bar` inline-start edge.
 * Its not-sent-ness is in the header; the delivery position stays empty.
 */

import type { Message } from '@/data/types'
import { formatDate, type Language, type Translate } from '@/lib'
import { StatusBadge } from '@/components/StatusBadge'

export function NoteBlock({ message, t, language }: { message: Message; t: Translate; language: Language }) {
  return (
    <li className="relative overflow-hidden rounded-lg bg-note p-3">
      <span aria-hidden="true" className="absolute inset-y-0 start-0 w-marker bg-note-bar" />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <StatusBadge tone="neutral">{t('conversations.thread.internal')}</StatusBadge>
        {message.authorName !== '' && <span>{message.authorName}</span>}
        <bdi className="tabular-nums">{formatDate(message.sentAt, { style: 'time', language })}</bdi>
        <span>{t('conversations.thread.notSent')}</span>
      </div>
      <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">{message.body}</p>
    </li>
  )
}
