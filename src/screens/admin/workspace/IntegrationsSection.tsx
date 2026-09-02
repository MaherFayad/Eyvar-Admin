/**
 * Admin › Workspace › **Integrations** — **P6-T10**, D20's fourth Workspace
 * pane.
 *
 * D20 is explicit that this is **not** an eighth Admin sub-tab and that *"the
 * sub-tab count stays 35"*, so nothing here touches the route table. It is a
 * section of the existing `admin-workspace` row, beside General, Branding and
 * Legal, in the §2.4 settings shell that is *"a pane list by construction"*.
 *
 * ## What it composes, and in the order an operator meets the questions
 *
 *   1. **API keys** — what can call us, and with what authority.
 *   2. **Webhook endpoints** — what we call, and about what.
 *   3. **The delivery log** — did it land, and if not, why, and replay it.
 *
 * ## One read of the endpoint list, shared
 *
 * The endpoints card renders the list and the delivery log filters by it. Two
 * reads would let the filter offer an endpoint the card cannot see, and would
 * let a disable land in one and not the other — which matters here because
 * `canReplay` is a function of the endpoint's state. So this component owns the
 * single `useAsync`, both children take it as a prop, and a write in either
 * bumps `endpointToken`, which re-reads both.
 *
 * ## The secret never lives here for longer than one dialog
 *
 * `reveal` is the only state in this file that ever holds a credential, it is
 * set from a mutation's return value, and it is cleared the moment the reveal
 * dialog is acknowledged. There is no cache, no ref and no list that keeps it.
 * `data/types/integrations.ts` carries the ruling on why that matters.
 *
 * ## Rules applied
 *   R3      no `default` primary at this level: a settings pane commits through
 *           the shell save bar, and each card's create action is `secondary`.
 *   §11.2   the read-only refusal is stated per card, once, and pointed at.
 *   §2.4    a pane list, not a new route.
 */

import { useCallback, useState } from 'react'
import { Plug } from 'lucide-react'
import { listWebhookEndpoints } from '@/data/clients'
import type { PermissionKey } from '@/data/types'
import type { WebhookEndpoint } from '@/data/types/integrations'
import { useAsync } from '@/hooks'
import type { Language, Translate } from '@/lib'
import { ApiKeysCard } from './ApiKeysCard'
import { SecretRevealDialog, type RevealRequest } from './SecretRevealDialog'
import { WebhookDeliveryLogCard } from './WebhookDeliveryLogCard'
import { WebhooksCard } from './WebhooksCard'

export function IntegrationsSection({
  t,
  language,
  canWrite,
  held,
}: {
  t: Translate
  language: Language
  canWrite: boolean
  /** The signed-in operator's own permissions — the ceiling on a key's scopes. */
  held: readonly PermissionKey[]
}) {
  const [endpointToken, setEndpointToken] = useState(0)
  const [reveal, setReveal] = useState<RevealRequest | null>(null)

  const endpointData = useAsync<WebhookEndpoint[]>((signal) => listWebhookEndpoints(signal), {
    /* No fetcher parameters; `endpointToken` is a superset, and bumping it
       moves the read onto a fresh key after a mutation. */
    deps: [endpointToken],
    cacheKey: 'integrations.webhooks.list',
  })

  const bumpEndpoints = useCallback(() => setEndpointToken((token) => token + 1), [])
  const onReveal = useCallback((request: RevealRequest) => setReveal(request), [])

  const endpoints = endpointData.data ?? []
  const endpointStatus =
    endpointData.status === 'content' && endpoints.length === 0 ? 'empty' : endpointData.status

  return (
    <section
      aria-label={t('admin.integrations.title')}
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Plug className="size-4 text-muted-foreground" aria-hidden="true" />
          {t('admin.integrations.title')}
        </h2>
        <p className="text-xs text-muted-foreground">{t('admin.integrations.desc')}</p>
      </div>

      <ApiKeysCard
        t={t}
        language={language}
        canWrite={canWrite}
        held={held}
        onReveal={onReveal}
      />

      <WebhooksCard
        t={t}
        language={language}
        canWrite={canWrite}
        endpoints={endpoints}
        status={endpointStatus}
        onRetry={endpointData.refetch}
        onReveal={onReveal}
        onEndpointsChanged={bumpEndpoints}
      />

      <WebhookDeliveryLogCard
        t={t}
        language={language}
        canWrite={canWrite}
        endpoints={endpoints}
        reloadToken={endpointToken}
        /* A replay changes an endpoint's `consecutiveFailures` and its
           `lastDeliveryAt`, both of which the card above renders. */
        onReplayed={bumpEndpoints}
      />

      <SecretRevealDialog request={reveal} onClose={() => setReveal(null)} t={t} />
    </section>
  )
}
