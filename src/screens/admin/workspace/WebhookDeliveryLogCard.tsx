/**
 * The webhook delivery log, with the replay control — **AC-952**.
 *
 * > *"A webhook endpoint that fails delivery appears in the delivery log with
 * > its failure reason and can be replayed from there."*
 *
 * ## Replay semantics, and why they are the email log's semantics
 *
 * `clients/emails.ts` already settled this for resends: *"a resend is a new
 * row. It does not mutate the failed delivery, because the failed delivery is
 * what happened. `resendOf` threads the two, so the log can show a retry
 * without losing the original."* A webhook replay follows it exactly —
 * `replayWebhookDelivery` writes a new `pending` row carrying `replayOf`, and
 * the failed attempt keeps its status code and its response body forever.
 *
 * The consequence an operator has to see is that **replaying does not make the
 * failure go away**: the row they clicked is still failed, and a second row
 * appears above it. So the replay confirmation says so, and the replayed row
 * carries a `Replay of WHD-3` line rather than quietly looking like an
 * original.
 *
 * ## A 4xx is replayable and a replay will not help
 *
 * `canReplay` is `true` for any failed attempt on an enabled endpoint,
 * including a 4xx, because refusing it would be this surface guessing about
 * somebody else's server. What it does instead is **say so in the row**: the
 * coded reason for `http-4xx` names the next move (fix the endpoint, then
 * replay) beside the endpoint's own response body. §11.2 governs a refusal;
 * this is an advisory, and it is not the same thing.
 *
 * ## Rules applied
 *   R5a        no red anywhere. A failed delivery is `warning` — a fact to work
 *              through, exactly as `EmailLogCard` argues about a bounce.
 *   R7 / §7.5  three tones, each paired with a word.
 *   §11.2      `Replay` renders on every row and is disabled in place with a
 *              sentence naming why, never hidden.
 *   §7.3       row actions come from `DataTable`: hover **or focus-within**.
 *   D25        no bulk command is declared, so no checkbox column is rendered.
 *              A bulk replay is a real request and it is **reported, not
 *              invented here**: D21 would want three refusal sentences and an
 *              `eligibleIds` set, and neither is specified.
 *   §9.1       ids, status codes and response bodies are `dir="ltr"`; every
 *              utility is logical.
 */

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { listWebhookDeliveries, replayWebhookDelivery } from '@/data/clients'
import type { BadgeTone, Paginated } from '@/data/types'
import {
  WEBHOOK_DELIVERY_STATES,
  WEBHOOK_EVENT_KEYS,
  type WebhookDelivery,
  type WebhookDeliveryState,
  type WebhookEndpoint,
  type WebhookFailureCode,
} from '@/data/types/integrations'
import { useAsync, useIndexTable } from '@/hooks'
import { formatDate, type Language, type Translate } from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { eventLabelKey } from './WebhookEndpointDialog'

/** R7's tones, and **no red**: a failed delivery is work to do, not an alarm (R5a). */
const STATE_TONE: Record<WebhookDeliveryState, BadgeTone> = {
  pending: 'neutral',
  succeeded: 'success',
  failed: 'warning',
}

const STATE_LABEL: Record<WebhookDeliveryState, string> = {
  pending: 'admin.integrations.delivery.state.pending',
  succeeded: 'admin.integrations.delivery.state.succeeded',
  failed: 'admin.integrations.delivery.state.failed',
}

/** One key per code. Never a prefix plus an interpolated reason. */
const FAILURE_LABEL: Record<WebhookFailureCode, string> = {
  timeout: 'admin.integrations.delivery.failure.timeout',
  'connection-refused': 'admin.integrations.delivery.failure.connectionRefused',
  'dns-failure': 'admin.integrations.delivery.failure.dnsFailure',
  'tls-error': 'admin.integrations.delivery.failure.tlsError',
  'http-4xx': 'admin.integrations.delivery.failure.http4xx',
  'http-5xx': 'admin.integrations.delivery.failure.http5xx',
}

export function WebhookDeliveryLogCard({
  t,
  language,
  canWrite,
  endpoints,
  reloadToken,
  onReplayed,
}: {
  t: Translate
  language: Language
  canWrite: boolean
  /** From the section's single endpoint read — names, and the filter's options. */
  endpoints: readonly WebhookEndpoint[]
  /** Bumped when an endpoint is enabled, disabled or created: `canReplay` moves with it. */
  reloadToken: number
  onReplayed: () => void
}) {
  const table = useIndexTable<WebhookDelivery>({
    mode: 'queue',
    getRowId: (delivery) => delivery.id,
    /* Its own namespace: three tables share this route. */
    urlKey: 'deliveries',
  })

  const params = useMemo(() => ({ ...table.params }), [table.params])
  const data = useAsync<Paginated<WebhookDelivery>>(
    (signal) => listWebhookDeliveries(params, signal),
    {
      /* `params` is the fetcher's only input; `reloadToken` is a superset that
         moves a replay onto a fresh key. */
      deps: [params, reloadToken],
      cacheKey: 'integrations.deliveries.list',
    },
  )
  const { refetch } = data

  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const endpointName = useCallback(
    (id: string) => endpoints.find((each) => each.id === id)?.name ?? id,
    [endpoints],
  )

  const replay = useCallback(
    async (delivery: WebhookDelivery) => {
      setBusy(true)
      try {
        const created = await replayWebhookDelivery(delivery.id)
        setConfirm(null)
        refetch()
        onReplayed()
        toast.success(
          t('admin.integrations.delivery.replayed', { id: created.id, original: delivery.id }),
        )
      } catch {
        toast.error(t('admin.integrations.delivery.replay.failed'))
      } finally {
        setBusy(false)
      }
    },
    [onReplayed, refetch, t],
  )

  const columns: DataColumn<WebhookDelivery>[] = useMemo(
    () => [
      {
        id: 'event',
        sortField: 'event',
        header: t('admin.integrations.delivery.col.event'),
        minWidth: 160,
        dataType: 'enum',
        filter: {
          kind: 'select',
          field: 'event',
          label: t('admin.integrations.delivery.filter.event'),
          options: WEBHOOK_EVENT_KEYS.map((event) => ({
            value: event,
            label: t(eventLabelKey(event)),
          })),
        },
        cell: (delivery) => (
          <span className="text-xs font-semibold text-foreground">
            {t(eventLabelKey(delivery.event))}
          </span>
        ),
        secondaryLine: (delivery) =>
          delivery.replayOf === null
            ? delivery.subjectId
            : t('admin.integrations.delivery.replayOf', { id: delivery.replayOf }),
      },
      {
        id: 'endpointId',
        sortField: 'endpointId',
        header: t('admin.integrations.delivery.col.endpoint'),
        width: 140,
        dataType: 'enum',
        filter: {
          kind: 'select',
          field: 'endpointId',
          label: t('admin.integrations.delivery.filter.endpoint'),
          options: endpoints.map((endpoint) => ({ value: endpoint.id, label: endpoint.name })),
        },
        cell: (delivery) => (
          <span className="truncate text-xs text-foreground">
            {endpointName(delivery.endpointId)}
          </span>
        ),
      },
      {
        id: 'state',
        sortField: 'state',
        header: t('admin.integrations.delivery.col.state'),
        width: 240,
        dataType: 'enum',
        filter: {
          kind: 'select',
          field: 'state',
          label: t('admin.integrations.delivery.filter.state'),
          options: WEBHOOK_DELIVERY_STATES.map((state) => ({
            value: state,
            label: t(STATE_LABEL[state]),
          })),
        },
        cell: (delivery) => (
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <StatusBadge tone={STATE_TONE[delivery.state]}>
                {t(STATE_LABEL[delivery.state])}
              </StatusBadge>
              {delivery.statusCode !== null && (
                /* AC-952's "failure reason" starts with the status code the
                   endpoint actually returned. */
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {delivery.statusCode}
                </span>
              )}
            </span>
            {delivery.failure !== null && (
              <>
                <span className="text-xs text-foreground">
                  {t(FAILURE_LABEL[delivery.failure.code])}
                </span>
                {delivery.failure.responseBody === null ? (
                  /* No response at all is a different fact from an empty one,
                     and this cell refuses to render them the same way. */
                  <span className="text-xs text-muted-foreground">
                    {t('admin.integrations.delivery.noResponse')}
                  </span>
                ) : (
                  /* The endpoint's own words, beside the coded reason and never
                     instead of it: untranslatable by construction, and an
                     operator cannot act on it alone. */
                  <span
                    className="truncate font-mono text-xs text-muted-foreground"
                    dir="ltr"
                    title={delivery.failure.responseBody}
                  >
                    {delivery.failure.responseBody}
                  </span>
                )}
              </>
            )}
          </div>
        ),
      },
      {
        id: 'durationMs',
        header: t('admin.integrations.delivery.col.duration'),
        width: 80,
        dataType: 'number',
        sortField: 'durationMs',
        cell: (delivery) => (
          <span className="text-xs text-muted-foreground" dir="ltr">
            {delivery.durationMs === null
              ? t('admin.integrations.delivery.noDuration')
              : t('admin.integrations.delivery.ms', { ms: delivery.durationMs })}
          </span>
        ),
      },
      {
        id: 'attemptedAt',
        header: t('admin.integrations.delivery.col.attempted'),
        width: 140,
        dataType: 'date',
        sortField: 'attemptedAt',
        cell: (delivery) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(delivery.attemptedAt, { language, style: 'day-month-time' })}
          </span>
        ),
      },
      {
        id: 'id',
        sortField: 'id',
        header: t('admin.integrations.delivery.col.id'),
        width: 110,
        dataType: 'id',
        defaultHidden: true,
        cell: (delivery) => (
          <span className="font-mono text-xs text-foreground" dir="ltr">
            {delivery.id}
          </span>
        ),
      },
    ],
    [endpointName, endpoints, language, t],
  )

  return (
    <section
      aria-label={t('admin.integrations.delivery.title')}
      className="flex flex-col gap-3"
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          {t('admin.integrations.delivery.title')}
        </h2>
        <p className="max-w-2xl text-xs text-muted-foreground">
          {t('admin.integrations.delivery.desc')}
        </p>
      </div>

      <DataTable
        table={table}
        rows={data.data?.items ?? []}
        columns={columns}
        getRowId={(delivery) => delivery.id}
        status={data.status}
        total={data.data?.total ?? 0}
        t={t}
        language={language}
        tableId="admin-workspace-webhook-deliveries"
        searchPlaceholder={t('admin.integrations.delivery.search')}
        /* **NO `isRowCritical`.** This card's own header: *R5a — no red
         anywhere. A failed delivery is `warning` — a fact to work through.*
         The duck-type tinted every `state === 'failed'` row regardless. */
        skeletonPattern="P1"
        rowActions={[
          {
            label: t('admin.integrations.delivery.replay'),
            onSelect: (delivery) =>
              setConfirm({
                title: t('admin.integrations.delivery.replay.confirm.title'),
                body: t('admin.integrations.delivery.replay.confirm.body', {
                  id: delivery.id,
                  endpoint: endpointName(delivery.endpointId),
                }),
                confirmLabel: t('admin.integrations.delivery.replay'),
                /* A replay ADDS a delivery attempt; it destroys nothing and the
                   log keeps both. Confirmed only because the receiver sees it
                   twice, so it is not red. */
                destructive: false,
                onConfirm: () => void replay(delivery),
              }),
            disabled: (delivery) => !canWrite || !delivery.canReplay || busy,
            reason: (delivery) => replayRefusal(delivery, endpoints, canWrite, t),
          },
        ]}
        firstRun={{
          heading: t('admin.integrations.delivery.empty.heading'),
          body: t('admin.integrations.delivery.empty.body'),
          actions: [],
        }}
        noMatch={{ message: t('admin.integrations.delivery.noMatch') }}
        error={{ message: t('admin.integrations.delivery.error'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} busy={busy} onClose={() => setConfirm(null)} t={t} />
    </section>
  )
}

/**
 * The sentence beside a refused replay. `null` only where the action is
 * allowed — every refusal owes the operator a next move, and each of these
 * ends on one.
 */
function replayRefusal(
  delivery: WebhookDelivery,
  endpoints: readonly WebhookEndpoint[],
  canWrite: boolean,
  t: Translate,
): string | null {
  if (!canWrite) return t('admin.integrations.readOnly')
  if (delivery.canReplay) return null
  if (delivery.state === 'pending') return t('admin.integrations.delivery.refusal.pending')
  if (delivery.state === 'succeeded') return t('admin.integrations.delivery.refusal.succeeded')
  const endpoint = endpoints.find((each) => each.id === delivery.endpointId)
  if (endpoint?.state === 'disabled') {
    return t('admin.integrations.delivery.refusal.endpointDisabled')
  }
  return t('admin.integrations.delivery.refusal.unknown')
}
