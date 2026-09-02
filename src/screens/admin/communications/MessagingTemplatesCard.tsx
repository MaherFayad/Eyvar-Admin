/**
 * The SMS / WhatsApp / push catalogue — what `TEMPLATES` at
 * `AdminCommunicationsScreen.tsx:23` used to be.
 *
 * A module-level literal has no loading state, no error state and no empty
 * state, and it cannot grow without a component edit. Same four rows, now read
 * through the seam like everything else on the page.
 *
 * These are **not** `EmailTemplate`s: no subject, no per-locale row, no
 * declared variables. Folding them into the email model would have put four
 * empty columns on this card and made the coverage question meaningless for
 * rows that have no locale.
 */

import { listMessagingTemplates } from '@/data/clients'
import type { Paginated } from '@/data/types'
import type { MessagingAudience, MessagingChannel, MessagingTemplate } from '@/data/types/email'
import type { Translate } from '@/lib'
import { useAsync } from '@/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { StatusBadge } from '@/components/StatusBadge'
import type { BadgeTone } from '@/data/types'

const CHANNEL_LABEL: Record<MessagingChannel, string> = {
  sms: 'comms.channel.sms',
  push: 'comms.channel.push',
  whatsapp: 'comms.channel.whatsapp',
}

/** Three channels, three tones from R7's closed five. None of them is red. */
const CHANNEL_TONE: Record<MessagingChannel, BadgeTone> = {
  sms: 'info',
  push: 'new',
  whatsapp: 'success',
}

const AUDIENCE_LABEL: Record<MessagingAudience, string> = {
  driver: 'comms.audience.driver',
  rider: 'comms.audience.rider',
  both: 'comms.audience.both',
}

export function MessagingTemplatesCard({ t }: { t: Translate }) {
  const data = useAsync<Paginated<MessagingTemplate>>(
    (signal) => listMessagingTemplates({ pageSize: 50 }, signal),
    { cacheKey: 'messaging.templates.list' },
  )

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle>{t('comms.messaging.title')}</CardTitle>
        <CardDescription className="text-xs">{t('comms.messaging.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.status === 'loading' && (
          <div className="p-3">
            <LoadingSkeleton pattern="P4" rows={4} label={t('comms.messaging.title')} />
          </div>
        )}

        {data.status === 'error' && (
          <div className="p-3">
            <ErrorState
              scope="card"
              card={false}
              message={t('comms.messaging.error')}
              action={{ label: t('state.pageError.action'), onClick: data.refetch }}
            />
          </div>
        )}

        {data.status === 'empty' && (
          <EmptyState
            kind="first-run"
            card={false}
            illustration={null}
            heading={t('comms.messaging.empty.heading')}
            body={t('comms.messaging.empty.body')}
            actions={[]}
          />
        )}

        {data.status === 'content' && (
          <ul className="divide-y divide-border">
            {(data.data?.items ?? []).map((template) => (
              <li key={template.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{template.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{template.code}</span>
                    <StatusBadge tone={CHANNEL_TONE[template.channel]}>
                      {t(CHANNEL_LABEL[template.channel])}
                    </StatusBadge>
                    <StatusBadge tone={template.status === 'active' ? 'success' : 'neutral'}>
                      {t(template.status === 'active' ? 'comms.template.inUse' : 'comms.template.draft')}
                    </StatusBadge>
                  </div>
                  <p className="max-w-xl rounded-md border border-border bg-muted/40 p-2 font-mono text-xs text-muted-foreground">
                    {template.sampleText}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-end">
                  <span className="text-xs text-muted-foreground">{t('comms.messaging.audience')}</span>
                  <span className="text-xs text-foreground">{t(AUDIENCE_LABEL[template.audience])}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
