/**
 * One delivery word under a bubble (§8.6.6): no glyph, no timestamp. A failed
 * message renders `failureMessage` at full ink, never `failureCode` (§8.6.7).
 */

import type { MessageDelivery, MessageDeliveryState } from '@/data/types'
import type { Translate } from '@/lib'

const DELIVERY_KEY: Readonly<Record<MessageDeliveryState, string>> = {
  queued: 'conversations.delivery.queued',
  sent: 'conversations.delivery.sent',
  delivered: 'conversations.delivery.delivered',
  read: 'conversations.delivery.read',
  failed: 'conversations.delivery.failed',
}

export function DeliveryLine({ delivery, t }: { delivery: MessageDelivery; t: Translate }) {
  if (delivery.state === 'failed') {
    return (
      <span className="text-xs text-foreground">
        {delivery.failureMessage === null
          ? t('conversations.delivery.failed')
          : t('conversations.delivery.failedReason', { reason: delivery.failureMessage })}
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">{t(DELIVERY_KEY[delivery.state])}</span>
}
