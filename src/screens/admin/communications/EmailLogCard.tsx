/**
 * The email log — **the sub-tab's `inbox` and `outbox` views**.
 *
 * `routeTable.ts:791` declares both on `admin-communications` and records why:
 * collapsing the old Email Log into two views on this row *"is what removes the
 * product's only four-deep path (§3.7)"*. The screen had neither. They are
 * views on **one** index, not two lists and not two endpoints (§3.8 rule 3), so
 * the tabs live on this table, the client filters on `params.view`, and the
 * address bar carries `?view=`.
 *
 * `outbox` is what we sent. `inbox` is what came back — a customer replying to
 * a transactional message. A bounce is **not** an inbox row: it is a state on
 * the outbound row it belongs to, which is why `bounced`, `complained` and
 * `failed` are three of the six delivery states rather than three inbox kinds.
 *
 * **A failed row states the failure and offers the resend.** The offer is
 * refused where a retry cannot help — a dead address, a spam complaint, an
 * unsubscribe — and the refusal is a sentence naming the next move rather than
 * a hidden button (§11.2). `canResend` comes from the client; this card does
 * not re-derive it.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { listEmailDeliveries, resendEmailDelivery } from '@/data/clients'
import type { Paginated, SubTabRoute } from '@/data/types'
import {
  EMAIL_DELIVERY_STATES,
  EMAIL_TEMPLATE_KEYS,
  type EmailDelivery,
  type EmailDeliveryState,
  type EmailFailureCode,
} from '@/data/types/email'
import { formatDate, type Language, type Translate } from '@/lib'
import { useAsync, useIndexTable } from '@/hooks'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import type { BadgeTone } from '@/data/types'
import { withView } from '@/shell/routeState'

/** R7's five tones, and no red: a bounce is a fact to work through, not an alarm (R5a). */
const STATE_TONE: Record<EmailDeliveryState, BadgeTone> = {
  queued: 'neutral',
  sent: 'info',
  delivered: 'success',
  bounced: 'warning',
  complained: 'warning',
  failed: 'warning',
}

const STATE_LABEL: Record<EmailDeliveryState, string> = {
  queued: 'comms.state.queued',
  sent: 'comms.state.sent',
  delivered: 'comms.state.delivered',
  bounced: 'comms.state.bounced',
  complained: 'comms.state.complained',
  failed: 'comms.state.failed',
}

const FAILURE_LABEL: Record<EmailFailureCode, string> = {
  'hard-bounce': 'comms.failure.hardBounce',
  'soft-bounce': 'comms.failure.softBounce',
  'mailbox-full': 'comms.failure.mailboxFull',
  'invalid-address': 'comms.failure.invalidAddress',
  'spam-complaint': 'comms.failure.spamComplaint',
  unsubscribed: 'comms.failure.unsubscribed',
  'rate-limited': 'comms.failure.rateLimited',
  'provider-error': 'comms.failure.providerError',
}

/** Why a retry cannot help. One key per code — never a prefix plus a reason. */
const RESEND_REFUSAL: Partial<Record<EmailFailureCode, string>> = {
  'hard-bounce': 'comms.resend.no.hardBounce',
  'invalid-address': 'comms.resend.no.invalidAddress',
  'spam-complaint': 'comms.resend.no.spamComplaint',
  unsubscribed: 'comms.resend.no.unsubscribed',
}

/* Written out rather than interpolated: a key built from a template literal is
   invisible to every lexical check the repo runs over the dictionaries. */
const OUTBOX_EMPTY = { heading: 'comms.log.empty.outbox.heading', body: 'comms.log.empty.outbox.body' }
const INBOX_EMPTY = { heading: 'comms.log.empty.inbox.heading', body: 'comms.log.empty.inbox.body' }

export interface EmailLogCardProps {
  row: SubTabRoute
  t: Translate
  language: Language
  canWrite: boolean
  /** So the page header's meta can name what the log holds. */
  onTotals?: (totals: { total: number; attention: number }) => void
}

const DEFAULT_VIEW = 'outbox'

export function EmailLogCard({ row, t, language, canWrite, onTotals }: EmailLogCardProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [resending, setResending] = useState<string | null>(null)

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const activeView = new URLSearchParams(location.search).get('view')
  const activeTab = views.some((view) => view.id === activeView) ? (activeView as string) : DEFAULT_VIEW

  const table = useIndexTable<EmailDelivery>({
    mode: 'index',
    getRowId: (delivery) => delivery.id,
    initialView: activeTab,
  })

  const params = useMemo(() => ({ ...table.params, view: activeTab }), [table.params, activeTab])

  const data = useAsync<Paginated<EmailDelivery>>((signal) => listEmailDeliveries(params, signal), {
    /* `params` is the fetcher's only input and carries the view tab, so a tab
       round trip is keyed apart. `resend` goes through `refetch`, which
       bypasses the read. */
    deps: [params],
    cacheKey: 'emails.deliveries.list',
  })

  const { refetch } = data

  const resend = useCallback(
    async (delivery: EmailDelivery) => {
      setResending(delivery.id)
      try {
        await resendEmailDelivery(delivery.id)
        toast.success(t('comms.toast.resent', { recipient: delivery.recipient }))
        refetch()
      } catch {
        toast.error(t('comms.toast.resendFailed'))
      } finally {
        setResending(null)
      }
    },
    [refetch, t],
  )

  const rows = data.data?.items ?? []
  const total = data.data?.total ?? 0
  /* Reported up rather than recounted there: the header's meta must agree with
     the table beneath it, and two counts computed twice will not. */
  const attention = rows.filter((delivery) => delivery.failure !== null).length
  const reportTotals = onTotals
  useEffect(() => {
    reportTotals?.({ total, attention })
  }, [reportTotals, total, attention])

  const columns: DataColumn<EmailDelivery>[] = useMemo(
    () => [
      {
        id: 'recipient',
        header: activeTab === 'inbox' ? t('comms.col.correspondent') : t('comms.col.recipient'),
        minWidth: 220,
        dataType: 'text',
        sortField: 'recipient',
        cell: (delivery) => (
          /* `block truncate` — an email address is the one identity value in
             the product long enough to wrap, and a wrapped one made this table
             ship THREE row heights (73, 77 and 105 at 1440) where every other
             identity cell ships one. A table whose pitch changes down the page
             cannot be scanned. `block` because `truncate` needs a block box to
             bound; the full address stays selectable and copyable, and the row
             opens the delivery. */
          <span className="block truncate text-xs font-semibold text-foreground">
            {delivery.direction === 'inbound' ? delivery.from : delivery.recipient}
          </span>
        ),
        secondaryLine: (delivery) =>
          delivery.recipientName ??
          (delivery.resendOf !== null
            ? t('comms.log.resendOf', { id: delivery.resendOf })
            : delivery.inReplyTo !== null
              ? t('comms.log.reply', { id: delivery.inReplyTo })
              : delivery.id),
      },
      {
        id: 'subject',
        sortField: 'subject',
        header: t('comms.col.subject'),
        width: 240,
        dataType: 'text',
        cell: (delivery) => (
          <span className="truncate text-xs text-foreground">{delivery.subject}</span>
        ),
      },
      {
        id: 'templateKey',
        sortField: 'templateKey',
        header: t('comms.col.template'),
        width: 190,
        dataType: 'enum',
        filter: {
          kind: 'select',
          field: 'templateKey',
          label: t('comms.filter.template'),
          options: EMAIL_TEMPLATE_KEYS.map((key) => ({ value: key, label: key })),
        },
        cell: (delivery) =>
          delivery.templateKey === null ? (
            <span className="text-xs text-muted-foreground">{t('comms.log.noTemplate')}</span>
          ) : (
            <span className="font-mono text-xs text-foreground">{delivery.templateKey}</span>
          ),
      },
      {
        id: 'state',
        sortField: 'state',
        header: t('comms.col.state'),
        width: 210,
        dataType: 'enum',
        /* R2-3 — a refusal is a fact about the delivery's state, so it reads
           here. Undeclared it falls to the recipient cell and stacks under the
           address AND its second line; the rows `Resend` refuses are the ones
           that did NOT fail, so this cell is a bare badge on every one of them. */
        carriesRefusalReason: true,
        filter: {
          kind: 'select',
          field: 'state',
          label: t('comms.filter.state'),
          options: EMAIL_DELIVERY_STATES.map((state) => ({
            value: state,
            label: t(STATE_LABEL[state]),
          })),
        },
        cell: (delivery) => (
          <div className="flex flex-col gap-0.5">
            <StatusBadge tone={STATE_TONE[delivery.state]}>{t(STATE_LABEL[delivery.state])}</StatusBadge>
            {delivery.failure !== null && (
              <>
                <span className="truncate text-xs text-foreground">
                  {t(FAILURE_LABEL[delivery.failure.code])}
                </span>
                {/* The provider's own words, beside the sentence and never
                    instead of it: untranslatable by construction, and an
                    operator cannot act on it alone. */}
                {/* **Both bounded at one line.** A delivery cell holding a
                    badge, a sentence and an SMTP string ran to 88px and shipped
                    a 105px row beside 77px rows in the same table — a pitch a
                    reader cannot scan. The provider's raw string is the one that
                    truly does not belong in a row: it is untranslatable, an
                    operator cannot act on it alone (this file says so two lines
                    up), and it is the longest thing here. One line each, and the
                    row opens the delivery where both are shown in full. */}
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {delivery.failure.providerMessage}
                </span>
              </>
            )}
          </div>
        ),
      },
      {
        id: 'queuedAt',
        header: t('comms.col.queuedAt'),
        width: 150,
        dataType: 'date',
        sortField: 'queuedAt',
        cell: (delivery) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(delivery.queuedAt, { language, style: 'day-month-time' })}
          </span>
        ),
      },
      {
        id: 'ticketId',
        sortField: 'ticketId',
        header: t('comms.col.ticket'),
        width: 110,
        dataType: 'id',
        defaultHidden: true,
        cell: (delivery) =>
          delivery.ticketId === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-mono text-xs text-foreground">{delivery.ticketId}</span>
          ),
      },
    ],
    [activeTab, language, t],
  )

  const tabs = views.map((view) => ({ id: view.id, label: t(view.titleKey) }))

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(delivery) => delivery.id}
      status={data.status}
      total={total}
      t={t}
      language={language}
      tableId="admin-communications-log"
      view={activeTab}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={(id) =>
        navigate({ pathname: location.pathname, search: withView(location.search, id) })
      }
      searchPlaceholder={t('comms.log.search')}
      /* **NO `isRowCritical`.** This card's own header: *R7's five tones, and
         no red: a bounce is a fact to work through, not an alarm (R5a).*
         `DataTable` tinted these rows anyway, off a bare `r.state === 'failed'`
         duck-type, against the screen's stated rule and R5a's closed list. */
      skeletonPattern="P1"
      rowActions={[
        {
          label: t('comms.log.resend'),
          onSelect: (delivery) => void resend(delivery),
          disabled: (delivery) => !canWrite || !delivery.canResend || resending === delivery.id,
          reason: (delivery) => resendRefusal(delivery, canWrite, t),
        },
      ]}
      firstRun={{
        heading: t(activeTab === 'inbox' ? INBOX_EMPTY.heading : OUTBOX_EMPTY.heading),
        body: t(activeTab === 'inbox' ? INBOX_EMPTY.body : OUTBOX_EMPTY.body),
        actions: [],
      }}
      noMatch={{ message: t('comms.log.noMatch') }}
      error={{ message: t('comms.log.error'), onRetry: data.refetch }}
    />
  )
}

/**
 * The sentence beside a refused resend. `null` only where the action is
 * allowed — every refusal owes the operator a next move.
 */
function resendRefusal(delivery: EmailDelivery, canWrite: boolean, t: Translate): string | null {
  if (!canWrite) return t('comms.resend.no.permission')
  if (delivery.canResend) return null
  if (delivery.direction === 'inbound') return t('comms.resend.no.inbound')
  if (delivery.failure === null) return t('comms.resend.no.notFailed')
  const key = RESEND_REFUSAL[delivery.failure.code]
  return key === undefined ? t('comms.resend.no.notFailed') : t(key)
}
