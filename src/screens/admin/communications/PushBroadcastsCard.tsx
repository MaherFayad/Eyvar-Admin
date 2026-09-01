/**
 * Push broadcast history — **the fabricated number's replacement.**
 *
 * The screen used to hold `broadcasts` in component state and push a row with
 * `deliveredCount: 142` on every send, whatever the audience and whatever
 * happened. That is a made-up figure rendered to an operator as a result, and
 * it survived because nothing behind it could contradict it.
 *
 * Now every field on this card comes from the record `sendPushBroadcast`
 * returned: the delivered count is **the audience's device count**, the state
 * is `queued` until a provider says otherwise, and the open rate is `null`
 * until one is reported — rendered as an em dash, never as `0`, because
 * not-applicable is not zero (§8.3.1).
 */

import { useCallback } from 'react'
import { listPushBroadcasts } from '@/data/clients'
import type { Paginated } from '@/data/types'
import type { PushAudienceId, PushBroadcast, PushBroadcastState } from '@/data/types/email'
import { formatCount, formatDate, formatPercent, type Language, type Translate } from '@/lib'
import { useAsync } from '@/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { StatusBadge } from '@/components/StatusBadge'
import type { BadgeTone } from '@/data/types'

export const AUDIENCE_LABEL: Record<PushAudienceId, string> = {
  'all-captains': 'comms.audience.allCaptains',
  'online-captains': 'comms.audience.onlineCaptains',
  'all-riders': 'comms.audience.allRiders',
  'active-subscription-riders': 'comms.audience.activeSubscriptionRiders',
}

const STATE_LABEL: Record<PushBroadcastState, string> = {
  queued: 'comms.push.state.queued',
  sent: 'comms.push.state.sent',
  failed: 'comms.push.state.failed',
}

const STATE_TONE: Record<PushBroadcastState, BadgeTone> = {
  queued: 'neutral',
  sent: 'success',
  failed: 'warning',
}

export interface PushBroadcastsCardProps {
  t: Translate
  language: Language
  /** Bumped by the screen after a send, so the list reloads from the client. */
  reloadToken: number
}

export function PushBroadcastsCard({ t, language, reloadToken }: PushBroadcastsCardProps) {
  const load = useCallback(
    (signal: AbortSignal) => listPushBroadcasts({ pageSize: 10 }, signal),
    [],
  )
  const data = useAsync<Paginated<PushBroadcast>>(load, { deps: [reloadToken] })

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold">{t('comms.push.title')}</CardTitle>
        <CardDescription className="text-xs">{t('comms.push.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.status === 'loading' && (
          <div className="p-3">
            <LoadingSkeleton pattern="P4" rows={3} label={t('comms.push.title')} />
          </div>
        )}

        {data.status === 'error' && (
          <div className="p-3">
            <ErrorState
              scope="card"
              card={false}
              message={t('comms.push.error')}
              action={{ label: t('state.pageError.action'), onClick: data.refetch }}
            />
          </div>
        )}

        {data.status === 'empty' && (
          <EmptyState
            kind="first-run"
            card={false}
            illustration={null}
            heading={t('comms.push.empty.heading')}
            body={t('comms.push.empty.body')}
            actions={[]}
          />
        )}

        {data.status === 'content' && (
          <ul className="divide-y divide-border">
            {(data.data?.items ?? []).map((broadcast) => (
              <li key={broadcast.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{broadcast.title}</span>
                    <span className="font-mono text-2xs text-muted-foreground">{broadcast.id}</span>
                    <StatusBadge tone={STATE_TONE[broadcast.state]}>
                      {t(STATE_LABEL[broadcast.state])}
                    </StatusBadge>
                  </div>
                  <span className="text-2xs text-muted-foreground">
                    {t(AUDIENCE_LABEL[broadcast.audienceId])}
                  </span>
                  <span className="text-2xs text-muted-foreground">
                    {t('comms.push.sentOn', { date: formatDate(broadcast.sentAt, { language }) })}
                  </span>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
                  <span className="text-xs font-medium text-foreground tabular-nums">
                    {t('comms.push.devices', { count: formatCount(broadcast.deliveredCount, language) })}
                  </span>
                  <span className="text-2xs text-muted-foreground">
                    {broadcast.openRate === null
                      ? t('comms.push.openRatePending')
                      : t('comms.push.openRate', {
                          rate: formatPercent(broadcast.openRate, language),
                        })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
