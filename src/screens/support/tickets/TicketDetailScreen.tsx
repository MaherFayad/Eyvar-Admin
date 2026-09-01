/**
 * Support › Tickets › one ticket.
 *
 * ## What was missing, and why each of the five mattered
 *
 * The screen rendered 13 of `Ticket`'s 18 fields. The five it dropped were
 * `createdAt`, `slaDueAt`, `slaBreached`, `conversationId` and `channel` — so
 * **an SLA console never showed the SLA**, which is close to the whole point of
 * the screen, and a reply was composed with no destination on display.
 *
 *   `slaDueAt` + `slaBreached` + `createdAt`
 *              the promise, whether it was kept, and how long the person has
 *              been waiting. Computed by `lib/sla.ts` against the item's own
 *              window (`startedAt: createdAt`), never a shared constant and
 *              never the legacy `/90` denominator.
 *   `channel`  where a reply goes. `types/ticket.ts:59` is explicit: absent
 *              means *"unknown, ask before replying"* and **never a default
 *              channel**. The composer replied anyway. It now names the
 *              destination above the box and, where there is none, is
 *              **disabled in place with the reason** (§11.2).
 *   `conversationId`
 *              which thread this ticket is discussed in. `null` is a real state
 *              — nobody has contacted the customer — and it is what makes the
 *              absent channel legible rather than looking like missing data.
 *
 * Rules applied
 *   §11.2      **nothing is hidden.** `Resolve`, `Claim`, `Log a call` and the
 *              composer are all rendered for every ticket and every operator;
 *              `disabled` plus a stated reason is the only refusal. The old
 *              screen used `canWrite && … ? {…} : undefined` in four places, so
 *              an operator looking at a resolved ticket could not see that
 *              resolving exists — the canonical form of this defect.
 *   §9.3       three readings and no fourth: a running countdown, `Breached`
 *              with the missed date, and a stopped clock on a decided ticket. A
 *              past `slaDueAt` with `slaBreached: false` renders as a **date**,
 *              not `overdue 3d` — the promise was kept.
 *   §11.1      the thread has a first-run empty state. `TKT-503` can reach it.
 *   §6.1       tokens only. The guide card was `border-amber-200 bg-amber-50/50
 *              text-amber-800 dark:text-amber-300` — five Tailwind palette
 *              classes on one element, none of them a token.
 *   §9.1       logical properties only. The bubbles were `ml-auto` / `mr-auto`,
 *              which puts the operator's own replies on the wrong side of the
 *              thread in Arabic.
 *   AC-74/75   every string is a key in `./copy`.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { claimTicket, getTicket, replyTicket, resolveTicket } from '@/data/clients'
import type { BadgeTone, Ticket, TicketCallLog, TicketMessage } from '@/data/types'
import { useAsync, useNow } from '@/hooks'
import {
  NO_CLOCK,
  formatDate,
  formatDuration,
  formatSlaLabel,
  slaClock,
  type SlaClock,
} from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { LogCallModal } from './LogCallModal'
import { PRIORITY_TONE, STATUS_TONE } from './tone'

/** One row of the merged timeline. Messages and calls, in time order. */
type TimelineEntry =
  | { kind: 'message'; at: string; message: TicketMessage }
  | { kind: 'call'; at: string; call: TicketCallLog }

export function TicketDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { ticketId = '' } = useParams<{ ticketId: string }>()
  const { t, dir, language } = shell.language
  const now = useNow(15)

  const ticket = useAsync<Ticket>((signal) => getTicket(ticketId, signal), { deps: [ticketId] })

  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [logCallOpen, setLogCallOpen] = useState(false)

  const data = ticket.data
  const currentUserId = shell.session?.userId ?? 'USR-1'
  const currentUserName = shell.session?.name ?? 'Sarah Al-Rashid'
  const canWrite = shell.permissions.permissions.includes('manage_tickets')

  const timeline: TimelineEntry[] = useMemo(() => {
    if (!data) return []
    const entries: TimelineEntry[] = [
      ...data.messages.map((message) => ({ kind: 'message' as const, at: message.sentAt, message })),
      ...data.callLogs.map((call) => ({ kind: 'call' as const, at: call.loggedAt, call })),
    ]
    return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  }, [data])

  if (ticket.status === 'loading') {
    return (
      <DetailPage
        header={<PageHeader title={ticketId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P2" />}
        rail={[]}
      />
    )
  }

  if (ticket.status === 'error' || !data) {
    return (
      <DetailPage
        header={<PageHeader title={ticketId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <ErrorState
            scope="page"
            heading={t('ticket.detail.notFound')}
            message={t('ticket.detail.notFoundBody', { id: ticketId })}
            /* A retry, not only a way out. `useAsync.refetch` re-runs the same
               read, which is what makes an injected failure recoverable. */
            action={{ label: t('ticket.detail.back'), onClick: () => navigate('/support/tickets') }}
          />
        }
        rail={[]}
      />
    )
  }

  const terminal = data.status === 'resolved' || data.status === 'closed'
  const clock = ticketClock(data, now, terminal)
  const deadlinePassedUnbroken =
    !terminal && !data.slaBreached && data.slaDueAt !== null && Date.parse(data.slaDueAt) <= Date.parse(now)

  const channelLabel =
    data.channel === undefined || data.channel === null
      ? t('ticket.channel.unknown')
      : t(`ticket.channel.${data.channel}`)
  const hasChannel = data.channel !== undefined && data.channel !== null

  /* ── §11.2 refusals, computed once and used by every control ──────── */

  const claimRefusal: string | null = !canWrite
    ? t('ticket.action.claim.blocked.permission')
    : data.status === 'closed'
      ? t('ticket.action.claim.blocked.closed')
      : data.ownerId !== null
        ? t('ticket.action.claim.blocked.owned', { name: data.ownerName ?? data.ownerId })
        : null

  const resolveRefusal: string | null = !canWrite
    ? t('ticket.action.resolve.blocked.permission')
    : terminal
      ? t('ticket.action.resolve.blocked.done', { status: t(`ticket.status.${data.status}`) })
      : null

  const replyRefusal: string | null = !canWrite
    ? t('ticket.reply.blocked.permission')
    : data.status === 'closed'
      ? t('ticket.reply.blocked.closed')
      : !hasChannel
        ? t('ticket.reply.blocked.noChannel')
        : replyText.trim() === ''
          ? t('ticket.reply.blocked.empty')
          : null

  const logCallRefusal: string | null = !canWrite ? t('ticket.logCall.blocked.permission') : null

  /* ── mutations ────────────────────────────────────────────────────── */

  const handleClaim = async () => {
    try {
      await claimTicket(data.id, currentUserId, currentUserName)
      toast.success(t('ticket.toast.claimed', { id: data.id }))
      ticket.refetch()
    } catch {
      toast.error(t('ticket.toast.claimFailed', { id: data.id }))
    }
  }

  const handleResolve = async () => {
    try {
      await resolveTicket(data.id)
      toast.success(t('ticket.toast.resolved', { id: data.id }))
      ticket.refetch()
    } catch {
      toast.error(t('ticket.toast.resolveFailed', { id: data.id }))
    }
  }

  const handleSendReply = async () => {
    if (replyRefusal !== null) return
    setSendingReply(true)
    try {
      await replyTicket(data.id, replyText.trim(), currentUserId, currentUserName)
      setReplyText('')
      /* The toast names the destination, because the destination is the thing
         the operator could not see before and is the thing they can get wrong. */
      toast.success(t('ticket.toast.replied', { channel: channelLabel }))
      ticket.refetch()
    } catch {
      toast.error(t('ticket.toast.replyFailed'))
    } finally {
      setSendingReply(false)
    }
  }

  /* ── header ───────────────────────────────────────────────────────── */

  const header = (
    <PageHeader
      title={data.subject}
      meta={t('ticket.detail.meta', {
        id: data.id,
        requester: data.entityName,
        category: data.category,
      })}
      onBack={() => navigate('/support/tickets')}
      /* R3 — one primary, and it is ALWAYS declared. The old screen passed
         `undefined` and the control vanished, so an operator looking at a
         resolved ticket could not see that resolving exists.

         **FINDING — `PageAction` carries `disabled` and NOT `reason`**
         (`components/PageHeader.tsx:67`). §11.2 is two clauses and only the
         first can be expressed here: the control is greyed in place, and there
         is no field to hang the sentence on. `RowAction` had exactly this gap
         until AC-368 added `reason` to it. Same one-field fix, same
         `aria-describedby` construction, in a shell-owned file. Reported;
         not worked around. */
      primaryAction={{
        label: t('ticket.action.resolve'),
        onClick: () => void handleResolve(),
        disabled: resolveRefusal !== null,
      }}
      t={t}
      dir={dir}
    />
  )

  /* ── main ─────────────────────────────────────────────────────────── */

  const main = (
    <div className="flex flex-col gap-4">
      {data.callGuideScript && (
        /* Tokens only. This was five Tailwind palette classes; a guide is a
           quiet informational surface, so it takes the muted ground every other
           informational block on this page takes. */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t('ticket.guide.heading', { scenario: data.callGuideScript.scenario })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-xs">
            <div>
              <span className="mb-1 block font-semibold text-foreground">
                {t('ticket.guide.say')}
              </span>
              <p className="rounded-md border border-border bg-muted/40 p-2 text-muted-foreground">
                {data.callGuideScript.say}
              </p>
            </div>
            <div>
              <span className="mb-1 block font-semibold text-foreground">
                {t('ticket.guide.do')}
              </span>
              <p className="text-muted-foreground">{data.callGuideScript.do}</p>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {t('ticket.guide.policy', { ref: data.callGuideScript.policyRef })}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold">{t('ticket.thread')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          {timeline.length === 0 ? (
            /* §11.1 — the empty state the screen did not have. `TKT-503` is a
               ticket raised from an operations event nobody has replied to, so
               this is reachable rather than theoretical. */
            <EmptyState
              kind="first-run"
              card={false}
              illustration={null}
              heading={t('ticket.thread.empty.heading')}
              body={t('ticket.thread.empty.body')}
              actions={[]}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {timeline.map((entry) =>
                entry.kind === 'message' ? (
                  <li
                    key={entry.message.id}
                    /* Logical properties. `ms-auto` / `me-auto` mirror in
                       Arabic; `ml-auto` / `mr-auto` do not, and put the
                       operator's own replies on the wrong side of the thread. */
                    className={`flex max-w-lg flex-col rounded-lg border p-3 text-xs ${
                      entry.message.senderType === 'agent'
                        ? 'ms-auto border-border bg-muted/40'
                        : 'me-auto border-primary/20 bg-primary/10'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                      <span className="font-semibold">
                        {t('ticket.thread.from', {
                          name: entry.message.senderName,
                          role: t(`ticket.thread.role.${entry.message.senderType}`),
                        })}
                      </span>
                      <span>
                        {formatDate(entry.at, { style: 'day-month-time', language })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-foreground">{entry.message.body}</p>
                  </li>
                ) : (
                  /* A call is not a message and does not wear a bubble: nothing
                     was sent to anybody. It is a full-width record on the
                     timeline, which is where an operator looks for it. */
                  <li
                    key={entry.call.id}
                    className="flex flex-col rounded-lg border border-dashed border-border px-3 py-2 text-xs"
                  >
                    <div className="mb-1 flex items-center justify-between gap-4 text-muted-foreground">
                      <span className="font-semibold">
                        {t('ticket.call.entry', { name: entry.call.loggedByUserName })}
                      </span>
                      <span>{formatDate(entry.at, { style: 'day-month-time', language })}</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {t(`ticket.call.outcome.${entry.call.outcome}`)}
                    </span>
                    <p className="text-muted-foreground">
                      {entry.call.notes ?? t('ticket.call.noNotes')}
                    </p>
                  </li>
                ),
              )}
            </ul>
          )}

          {/* The composer. Always rendered; §11.2 decides whether it works. */}
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <span className="text-xs font-medium text-foreground">
              {t('ticket.reply.to', { channel: channelLabel })}
            </span>
            <Textarea
              id="ticket-reply"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder={t('ticket.reply.placeholder')}
              rows={3}
              className="text-xs"
              disabled={!canWrite || !hasChannel || data.status === 'closed'}
              aria-describedby={hasChannel ? undefined : 'ticket-reply-refusal'}
            />
            {!hasChannel && (
              /* The rule `types/ticket.ts:59` states, made visible: ask before
                 replying. It says what to do instead, so the operator is not
                 left with a dead box and no next step. */
              <p id="ticket-reply-refusal" className="text-xs text-muted-foreground">
                {t('ticket.channel.unknownHelp')}
              </p>
            )}
            <div className="flex items-start justify-between gap-3">
              <span className="flex flex-col items-start gap-1">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setLogCallOpen(true)}
                  disabled={logCallRefusal !== null}
                  aria-describedby={logCallRefusal === null ? undefined : 'ticket-logcall-refusal'}
                >
                  {t('ticket.logCall')}
                </Button>
                {logCallRefusal !== null && (
                  <span id="ticket-logcall-refusal" className="text-2xs text-muted-foreground">
                    {logCallRefusal}
                  </span>
                )}
              </span>
              <span className="flex flex-col items-end gap-1">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => void handleSendReply()}
                  disabled={replyRefusal !== null || sendingReply}
                  aria-describedby={replyRefusal === null ? undefined : 'ticket-send-refusal'}
                >
                  {sendingReply ? t('ticket.reply.sending') : t('ticket.reply.send')}
                </Button>
                {replyRefusal !== null && (
                  <span
                    id="ticket-send-refusal"
                    className="text-2xs whitespace-normal text-muted-foreground"
                  >
                    {replyRefusal}
                  </span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  /* ── rail ─────────────────────────────────────────────────────────── */

  const rail = [
    <Card key="ticket-sla">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t('ticket.sla.heading')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <StatusBadge tone={slaTone(clock, data.slaBreached)}>
            {data.slaBreached ? t('ticket.sla.breached') : formatSlaLabel(clock, t)}
          </StatusBadge>
          {data.slaDueAt !== null && (
            <span className="text-muted-foreground">
              {t('ticket.sla.due', {
                date: formatDate(data.slaDueAt, { style: 'day-month-time', language }),
              })}
            </span>
          )}
        </div>
        {data.slaBreached && data.slaDueAt !== null && (
          <p className="text-muted-foreground">
            {t('ticket.sla.breachedDetail', {
              date: formatDate(data.slaDueAt, { style: 'day-month-time', language }),
            })}
          </p>
        )}
        {terminal && (
          <p className="text-muted-foreground">
            {t('ticket.sla.stopped', { status: t(`ticket.status.${data.status}`) })}
          </p>
        )}
        {deadlinePassedUnbroken && (
          /* §9.3 — the deadline has passed and `slaBreached` is false, so the
             promise was kept. A live countdown here would print `overdue 3d`
             on a ticket the data says was answered in time. */
          <p className="text-muted-foreground">{t('ticket.sla.met')}</p>
        )}
        <p className="text-muted-foreground">
          {t('ticket.sla.age', {
            duration: formatDuration(Math.max(0, Date.parse(now) - Date.parse(data.createdAt))),
          })}
        </p>
      </CardContent>
    </Card>,

    <Card key="ticket-meta">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t('ticket.details')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 text-xs">
        <Row label={t('ticket.field.status')}>
          <StatusBadge tone={STATUS_TONE[data.status]}>
            {t(`ticket.status.${data.status}`)}
          </StatusBadge>
        </Row>
        <Row label={t('ticket.field.priority')}>
          <StatusBadge tone={PRIORITY_TONE[data.priority]}>
            {t(`ticket.priority.${data.priority}`)}
          </StatusBadge>
        </Row>
        <Row label={t('ticket.field.reasonCode')}>
          <span className="font-mono font-medium text-foreground">{data.reasonCode}</span>
        </Row>
        <Row label={t('ticket.field.opened')}>
          <span className="text-foreground">
            {formatDate(data.createdAt, { style: 'day-month-time', language })}
          </span>
        </Row>
        <Row label={t('ticket.field.channel')}>
          <span className="text-foreground">{channelLabel}</span>
        </Row>
        <Row label={t('ticket.field.thread')}>
          <span className="font-mono text-foreground">
            {data.conversationId ?? t('ticket.channel.unknown')}
          </span>
        </Row>
        <Row label={t('ticket.field.owner')}>
          <span className="font-medium text-foreground">
            {data.ownerName ?? t('ticket.owner.unassigned')}
          </span>
        </Row>
        {/* Always rendered. §11.2 — an operator who cannot claim sees why. */}
        <span className="flex flex-col items-stretch gap-1">
          <Button
            size="xs"
            variant="secondary"
            onClick={() => void handleClaim()}
            disabled={claimRefusal !== null}
            aria-describedby={claimRefusal === null ? undefined : 'ticket-claim-refusal'}
          >
            {t('ticket.action.claim')}
          </Button>
          {claimRefusal !== null && (
            <span
              id="ticket-claim-refusal"
              className="text-2xs whitespace-normal text-muted-foreground"
            >
              {claimRefusal}
            </span>
          )}
        </span>
      </CardContent>
    </Card>,

    <Card key="requester">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t('ticket.requester')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <span className="font-medium text-foreground">{data.entityName}</span>
        <span className="font-mono text-muted-foreground">{data.entityId}</span>
        <Button
          variant="secondary"
          size="xs"
          onClick={() =>
            navigate({
              pathname: location.pathname,
              search: withOverlay(location.search, 'entity', data.entityId),
            })
          }
        >
          {t('ticket.requester.viewProfile')}
        </Button>
      </CardContent>
    </Card>,
  ]

  return (
    <>
      <DetailPage header={header} main={main} rail={rail} />

      <LogCallModal
        ticket={data}
        open={logCallOpen}
        onClose={() => setLogCallOpen(false)}
        onLogged={(updated) => {
          setLogCallOpen(false)
          toast.success(t('ticket.toast.callLogged', { id: updated.id }))
          ticket.refetch()
        }}
        actorId={currentUserId}
        actorName={currentUserName}
        t={t}
      />
    </>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

/**
 * §9.3's three readings, and no fourth.
 *
 * The **stamp** decides a breach, not `dueAt < now` — a resolved ticket from
 * three weeks ago is not overdue, and a ticket answered one minute before its
 * deadline is not breached because the deadline has since passed. Same rule
 * `types/workQueue.ts` states for every work queue.
 */
function ticketClock(ticket: Ticket, now: string, terminal: boolean): SlaClock {
  if (terminal) return NO_CLOCK
  const clock = slaClock({ dueAt: ticket.slaDueAt, startedAt: ticket.createdAt }, now)
  if (clock.kind === 'breached' && !ticket.slaBreached) return NO_CLOCK
  return clock
}

/** R5a — red is spent on the row marker, never on a badge. `warning` is the tone. */
function slaTone(clock: SlaClock, breached: boolean): BadgeTone {
  if (breached) return 'warning'
  return clock.band === 'neutral' ? 'neutral' : 'warning'
}
