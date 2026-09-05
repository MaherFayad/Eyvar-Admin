/**
 * A system message (design 12 §4.2, §8.6.2): centred, no ground, no avatar,
 * no rule. The rule is the day divider's carrier.
 */

import type { Message } from '@/data/types'
import { formatDate, type Language, type Translate } from '@/lib'

export function SystemLine({ message, t, language }: { message: Message; t: Translate; language: Language }) {
  return (
    <li className="py-1 text-center text-xs text-muted-foreground">
      {t('inbox.thread.system', {
        body: message.body,
        time: formatDate(message.sentAt, { style: 'time', language }),
      })}
    </li>
  )
}
