/**
 * Webhook endpoints — target, subscriptions, signing secret, enabled state.
 *
 * ## Why this is a list of cards and not a `DataTable`
 *
 * An endpoint is four facts and four actions, and there are a handful of them.
 * A table would spend a column on `events` that is always a wrapped chip list
 * and a column on `url` that is always truncated — and the two things an
 * operator comes here to do (*is this one failing?* and *stop it*) would both
 * be behind a kebab. `listWebhookEndpoints` returns an array rather than a
 * `Paginated<T>` for the same reason, which is `getSecurityPolicy`'s shape
 * rather than `listEmailDeliveries`'s.
 *
 * ## The four states are this card's own
 *
 * There is no `DataTable` here to own them, so the card owns them explicitly
 * and in order: loading skeleton, card-scoped error with a retry, first-run
 * empty naming what an endpoint is *for*, then content.
 *
 * ## The failing endpoint says so here, not only in the log
 *
 * `consecutiveFailures` is derived from the delivery log by the client and
 * surfaced on the endpoint, so an operator scanning this list sees *"3 failed
 * deliveries in a row"* without first opening the log and filtering it. The
 * log below is where they then go, and the link between the two is the
 * endpoint filter.
 *
 * ## Rules applied
 *   R3         card actions are `secondary`; the one `default` primary of each
 *              act lives in its dialog. `ReasonCodesCard`'s precedent.
 *   R5a        no red. A failing endpoint is a `warning` badge — "needs
 *              attention", which is R7's own definition of that tone — and the
 *              only red on this pane is the API key revoke confirmation.
 *   R7 / §7.5  every tone is paired with a word.
 *   §11.2      every action renders for every role and is disabled in place
 *              with a sentence. The read-only refusal is stated ONCE for the
 *              card and pointed at by `aria-describedby`, not repeated per row.
 *   §7.2       every control is a real `<button>` with its own focus ring.
 *   §9.1       the URL and the wire event names are `dir="ltr"`; every utility
 *              is logical.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink } from 'lucide-react'
import {
  createWebhookEndpoint,
  rotateWebhookSecret,
  updateWebhookEndpoint,
} from '@/data/clients'
import { isApiError } from '@/data/types'
import type { WebhookEndpoint } from '@/data/types/integrations'
import { formatDate, type Language, type Translate } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import type { RevealRequest } from './SecretRevealDialog'
import {
  WebhookEndpointDialog,
  eventLabelKey,
  type EndpointDraftSubmission,
} from './WebhookEndpointDialog'

const READ_ONLY_ID = 'admin-integrations-webhooks-read-only'

export function WebhooksCard({
  t,
  language,
  canWrite,
  endpoints,
  status,
  onRetry,
  onReveal,
  onEndpointsChanged,
}: {
  t: Translate
  language: Language
  canWrite: boolean
  /**
   * Read by the section, not by this card. **One read, one source**: the
   * delivery log's endpoint filter and this list are the same list, and two
   * reads of it would let the filter offer an endpoint the card cannot see.
   */
  endpoints: readonly WebhookEndpoint[]
  status: 'loading' | 'error' | 'empty' | 'content'
  onRetry: () => void
  onReveal: (request: RevealRequest) => void
  /** Both this list and the delivery log re-read after a write. */
  onEndpointsChanged: () => void
}) {
  const [editing, setEditing] = useState<{ endpoint: WebhookEndpoint | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const submit = useCallback(
    async (draft: EndpointDraftSubmission, endpoint: WebhookEndpoint | null) => {
      setBusy(true)
      setFieldErrors({})
      try {
        if (endpoint === null) {
          const result = await createWebhookEndpoint(draft)
          setEditing(null)
          onEndpointsChanged()
          /* The signing secret goes straight to the one-time reveal and
             nowhere else. See `SecretRevealDialog`. */
          onReveal({
            kind: 'webhook-secret',
            occasion: 'issued',
            subjectName: result.endpoint.name,
            secret: result.issued.secret,
            prefix: result.issued.prefix,
          })
        } else {
          await updateWebhookEndpoint(endpoint.id, draft)
          setEditing(null)
          onEndpointsChanged()
          toast.success(t('admin.integrations.webhook.saved', { name: draft.name }))
        }
      } catch (thrown) {
        if (isApiError(thrown) && thrown.details.length > 0) {
          setFieldErrors(
            Object.fromEntries(thrown.details.map((detail) => [detail.field, detail.message])),
          )
        } else {
          toast.error(t('admin.integrations.webhook.failed'))
        }
      } finally {
        setBusy(false)
      }
    },
    [onEndpointsChanged, onReveal, t],
  )

  const setState = useCallback(
    async (endpoint: WebhookEndpoint, state: 'enabled' | 'disabled') => {
      setBusy(true)
      try {
        await updateWebhookEndpoint(endpoint.id, { state })
        setConfirm(null)
        onEndpointsChanged()
        toast.success(
          state === 'enabled'
            ? t('admin.integrations.webhook.enabled', { name: endpoint.name })
            : t('admin.integrations.webhook.disabled', { name: endpoint.name }),
        )
      } catch {
        toast.error(t('admin.integrations.webhook.failed'))
      } finally {
        setBusy(false)
      }
    },
    [onEndpointsChanged, t],
  )

  const rotate = useCallback(
    async (endpoint: WebhookEndpoint) => {
      setBusy(true)
      try {
        const issued = await rotateWebhookSecret(endpoint.id)
        setConfirm(null)
        onEndpointsChanged()
        onReveal({
          kind: 'webhook-secret',
          occasion: 'rotated',
          subjectName: endpoint.name,
          secret: issued.secret,
          prefix: issued.prefix,
        })
      } catch {
        toast.error(t('admin.integrations.webhook.rotate.failed'))
      } finally {
        setBusy(false)
      }
    },
    [onEndpointsChanged, onReveal, t],
  )

  const body =
    status === 'loading' ? (
      <LoadingSkeleton pattern="P4" label={t('admin.integrations.webhook.title')} />
    ) : status === 'error' ? (
      <ErrorState
        scope="card"
        message={t('admin.integrations.webhook.error')}
        action={{ label: t('state.pageError.action'), onClick: onRetry }}
      />
    ) : status === 'empty' ? (
      <EmptyState
        kind="first-run"
        heading={t('admin.integrations.webhook.empty.heading')}
        body={t('admin.integrations.webhook.empty.body')}
        actions={
          canWrite
            ? [
                {
                  label: t('admin.integrations.webhook.create'),
                  primary: true,
                  onClick: () => setEditing({ endpoint: null }),
                },
              ]
            : []
        }
      />
    ) : (
      <ul className="flex flex-col gap-2">
        {endpoints.map((endpoint) => (
          <li
            key={endpoint.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 md:flex-row md:items-start md:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{endpoint.name}</span>
                <StatusBadge tone={endpoint.state === 'enabled' ? 'success' : 'info'}>
                  {endpoint.state === 'enabled'
                    ? t('admin.integrations.webhook.state.enabled')
                    : t('admin.integrations.webhook.state.disabled')}
                </StatusBadge>
                {endpoint.consecutiveFailures > 0 && (
                  /* R7 — "needs attention", one warning tone, paired with a
                     word carrying the count. Never red (R5a). */
                  <StatusBadge tone="warning">
                    {t('admin.integrations.webhook.failing', {
                      count: endpoint.consecutiveFailures,
                    })}
                  </StatusBadge>
                )}
              </div>

              <span className="truncate font-mono text-xs text-muted-foreground" dir="ltr">
                {endpoint.url}
              </span>

              <span className="flex flex-wrap gap-1">
                {endpoint.events.map((event) => (
                  <span
                    key={event}
                    className="rounded-md border border-border px-1.5 py-0.5 text-2xs text-muted-foreground"
                  >
                    {t(eventLabelKey(event))}
                  </span>
                ))}
              </span>

              <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span dir="ltr" className="font-mono">
                  {endpoint.secretPrefix}
                </span>
                <span>
                  {endpoint.rotatedAt === null
                    ? t('admin.integrations.webhook.secret.never')
                    : t('admin.integrations.webhook.secret.rotated', {
                        date: formatDate(endpoint.rotatedAt, { language }),
                      })}
                </span>
                <span>
                  {endpoint.lastDeliveryAt === null
                    ? t('admin.integrations.webhook.noDeliveries')
                    : t('admin.integrations.webhook.lastDelivery', {
                        date: formatDate(endpoint.lastDeliveryAt, {
                          language,
                          style: 'day-month-time',
                        }),
                      })}
                </span>
              </span>
            </div>

            {/* §11.2 — all four render for every role; the refused ones are
                disabled and point at the card's one read-only sentence. */}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Button
                size="xs"
                variant="secondary"
                disabled={!canWrite || busy}
                aria-describedby={canWrite ? undefined : READ_ONLY_ID}
                onClick={() => setEditing({ endpoint })}
              >
                {t('admin.integrations.webhook.edit')}
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={!canWrite || busy}
                aria-describedby={canWrite ? undefined : READ_ONLY_ID}
                onClick={() =>
                  setConfirm({
                    title: t('admin.integrations.webhook.rotate.confirm.title'),
                    body: t('admin.integrations.webhook.rotate.confirm.body', {
                      name: endpoint.name,
                    }),
                    confirmLabel: t('admin.integrations.webhook.rotate'),
                    /* Confirmed because every receiver still verifying with the
                       old secret starts failing the moment it lands — but not
                       red: the endpoint survives and the remedy is to update
                       the receiver. (Carried from `IntegrationsConfirm.tsx`.) */
                    destructive: false,
                    onConfirm: () => void rotate(endpoint),
                  })
                }
              >
                {t('admin.integrations.webhook.rotate')}
              </Button>
              <Button
                size="xs"
                variant="secondary"
                disabled={!canWrite || busy}
                aria-describedby={canWrite ? undefined : READ_ONLY_ID}
                onClick={() => {
                  if (endpoint.state === 'enabled') {
                    setConfirm({
                      title: t('admin.integrations.webhook.disable.confirm.title'),
                      body: t('admin.integrations.webhook.disable.confirm.body', {
                        name: endpoint.name,
                      }),
                      confirmLabel: t('admin.integrations.webhook.disable'),
                      /* Stops delivery, and enabling it again is the click
                         below. Reversible, so the ordinary primary. */
                      destructive: false,
                      onConfirm: () => void setState(endpoint, 'disabled'),
                    })
                  } else {
                    /* Enabling is the undo of an act that was already
                       confirmed, so it is not confirmed again. */
                    void setState(endpoint, 'enabled')
                  }
                }}
              >
                {endpoint.state === 'enabled'
                  ? t('admin.integrations.webhook.disable')
                  : t('admin.integrations.webhook.enable')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )

  return (
    <section aria-label={t('admin.integrations.webhook.title')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ExternalLink className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.integrations.webhook.title')}
          </h2>
          <p className="max-w-2xl text-xs text-muted-foreground">
            {t('admin.integrations.webhook.desc')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button
            size="xs"
            variant="secondary"
            disabled={!canWrite || busy}
            aria-describedby={canWrite ? undefined : READ_ONLY_ID}
            onClick={() => setEditing({ endpoint: null })}
          >
            {t('admin.integrations.webhook.create')}
          </Button>
          {/* §11.2 — the page-level refusal, stated ONCE for this card. */}
          {!canWrite && (
            <span id={READ_ONLY_ID} className="text-xs text-muted-foreground">
              {t('admin.integrations.readOnly')}
            </span>
          )}
        </div>
      </div>

      {body}

      <WebhookEndpointDialog
        open={editing !== null}
        editing={editing?.endpoint ?? null}
        busy={busy}
        serverErrors={fieldErrors}
        onSubmit={(draft) => void submit(draft, editing?.endpoint ?? null)}
        onClose={() => {
          setEditing(null)
          setFieldErrors({})
        }}
        t={t}
      />

      <ConfirmDialog request={confirm} busy={busy} onClose={() => setConfirm(null)} t={t} />
    </section>
  )
}
