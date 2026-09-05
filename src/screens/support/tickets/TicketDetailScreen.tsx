/**
 * Support › Tickets › one ticket (SUPPORT-UX-PLAN.md §5.2–5.3).
 * The header primary follows the pane's precedence (claim, then resolve, then
 * reopen); every other lifecycle act is a secondary or an overflow item,
 * disabled in place with its reason (§11.2). The rail states the three
 * promises (S-2) and never hides a clock that exists.
 */

import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  claimTicket,
  getTicket,
  listOperators,
  listReasonCodeOptions,
  liveClaim,
  recodeTicket,
  reopenTicket,
  replyTicket,
  resolveTicket,
  setTicketPriority,
  setTicketStatus,
  transferTicket,
} from '@/data/clients'
import type {
  BadgeTone,
  Paginated,
  TeamUser,
  Ticket,
  TicketCallLog,
  TicketMessage,
  TicketPriority,
} from '@/data/types'
import type { ReasonCode } from '@/data/types/policy'
import { useAsync, useNow } from '@/hooks'
import { formatDate, formatDuration, queueClock, type QueueClockInput, formatCount } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader, type PageAction } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { reasonLabel } from '@/i18n/vocabulary/copy'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ElsewhereCard } from '../shared/ElsewhereCard'
import { TemplatePicker } from '../shared/TemplatePicker'
import { SlaCell } from '@/screens/queues'
import { LogCallModal } from './LogCallModal'
import { firstResponseInput, resolutionInput, ticketIsDecided, updateInput } from './clock'
import { PRIORITY_TONE, STATUS_TONE } from './tone'
import { withFallback } from '../../operations/localCopy'
import { TICKETS_EN } from './copy'

/** One row of the merged timeline. Messages and calls, in time order. */
type TimelineEntry =
  | { kind: 'message'; at: string; message: TicketMessage }
  | { kind: 'call'; at: string; call: TicketCallLog }

const PRIORITIES: readonly TicketPriority[] = ['Critical', 'High', 'Medium', 'Low']

export function TicketDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { ticketId = '' } = useParams<{ ticketId: string }>()
  /* Memoised: `withFallback` returns a new function per call and `t` sits in deps. */
  const t = useMemo(() => withFallback(shell.language.t, TICKETS_EN), [shell.language.t])
  const { dir, language } = shell.language
  const now = useNow(15)

  /* Every mutation ends in `ticket.refetch()`, which bypasses the cache. */
  const ticket = useAsync<Ticket>((signal) => getTicket(ticketId, signal), {
    deps: [ticketId],
    cacheKey: 'tickets.get',
  })
  const operators = useAsync<Paginated<TeamUser>>(
    (signal) => listOperators({ pageSize: 50 }, signal),
    { deps: ['ticket-transfer', 50], cacheKey: 'team.list' },
  )
  const reasonCodes = useAsync<ReasonCode[]>(
    (signal) => listReasonCodeOptions('ticket', signal),
    { deps: ['ticket'], cacheKey: 'policy.reasonCodeOptions' },
  )

  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)

  const data = ticket.data
  const currentUserId = shell.session?.userId ?? 'USR-1'
  const currentUserName = shell.session?.name ?? 'Sarah Al-Rashid'
  const canWrite = shell.permissions.permissions.includes('manage_tickets') && !shell.isFrozen

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
            action={{ label: t('ticket.detail.back'), onClick: () => navigate('/support/tickets') }}
          />
        }
        rail={[]}
      />
    )
  }

  /* Narrowed once; the closures below cannot see the guard above. */
  const record: Ticket = data
  const decided = ticketIsDecided(record)
  const held = liveClaim(record.claim)
  const heldByMe = held !== null && held.ownerId === currentUserId
  const paused = record.pausedAt !== null

  const channelLabel = record.channel === null ? t('ticket.channel.unknown') : t(`ticket.channel.${record.channel}`)
  const hasChannel = record.channel !== null

  /* ── §11.2 refusals, computed once and used by every control ──────── */

  const permission = canWrite ? null : t('ticket.action.claim.blocked.permission')
  const claimRefusal: string | null = !canWrite
    ? t('ticket.action.claim.blocked.permission')
    : decided
      ? t('ticket.action.claim.blocked.closed')
      : heldByMe
        ? t('ticket.action.claim.blocked.owned', { name: currentUserName })
        : null
  const resolveRefusal: string | null = !canWrite
    ? t('ticket.action.resolve.blocked.permission')
    : decided
      ? t('ticket.action.resolve.blocked.done', { status: t(`ticket.status.${record.status}`) })
      : null
  const reopenRefusal: string | null = !canWrite
    ? t('ticket.action.reopen.blocked.permission')
    : decided
      ? null
      : t('ticket.action.reopen.blocked.open', { status: t(`ticket.status.${record.status}`) })
  const decidedRefusal: string | null = permission ?? (decided ? t('ticket.action.blocked.decided') : null)
  const transferRefusal: string | null =
    decidedRefusal ??
    ((operators.data?.items ?? []).filter((u) => u.id !== currentUserId && u.status === 'Active').length === 0
      ? t('ticket.transfer.blocked.noTargets')
      : null)
  const replyRefusal: string | null = !canWrite
    ? t('ticket.reply.blocked.permission')
    : record.status === 'closed'
      ? t('ticket.reply.blocked.closed')
      : !hasChannel
        ? t('ticket.reply.blocked.noChannel')
        : replyText.trim() === ''
          ? t('ticket.reply.blocked.empty')
          : null
  const logCallRefusal: string | null = !canWrite ? t('ticket.logCall.blocked.permission') : null

  /* ── mutations ────────────────────────────────────────────────────── */

  async function run(action: () => Promise<Ticket>, done: string, failed: string) {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      ticket.refetch()
    } catch {
      toast.error(failed)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const handleSendReply = async () => {
    if (replyRefusal !== null) return
    setSendingReply(true)
    try {
      await replyTicket(record.id, replyText.trim(), currentUserId, currentUserName)
      setReplyText('')
      /* X3 / R10: the thread's delivery word is the confirmation; no toast. */
      ticket.refetch()
    } catch {
      toast.error(t('ticket.toast.replyFailed'))
    } finally {
      setSendingReply(false)
    }
  }

  /** AC-S-10: the confirmation names the operator who loses the ticket. */
  function askTakeOver() {
    setConfirm({
      title: t('queue.takeOver.title', { name: held?.ownerName ?? '' }),
      body: t('queue.takeOver.body', { name: held?.ownerName ?? '' }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () =>
        void run(
          () => claimTicket(record.id, currentUserId, currentUserName, { takeOver: true }),
          t('queue.toast.takenOver'),
          t('ticket.toast.claimFailed', { id: record.id }),
        ),
    })
  }

  /** AC-S-13: a required note, posted to the thread as an internal message. */
  function askTransfer() {
    const targets = (operators.data?.items ?? []).filter(
      (u) => u.id !== currentUserId && u.status === 'Active',
    )
    setConfirm({
      title: t('ticket.transfer.title'),
      body: t('ticket.transfer.body'),
      confirmLabel: t('ticket.transfer.confirm'),
      reason: {
        label: t('ticket.transfer.noteLabel'),
        help: t('ticket.transfer.noteHelp'),
        message: t('ticket.transfer.noteMessage'),
      },
      choice: {
        label: t('ticket.transfer.choiceLabel'),
        help: t('ticket.transfer.choiceHelp'),
        message: t('ticket.transfer.choiceMessage'),
        placeholder: t('ticket.transfer.choicePlaceholder'),
        emptyMessage: t('ticket.transfer.blocked.noTargets'),
        options: targets.map((u) => ({ value: u.id, label: u.name })),
      },
      onConfirm: ({ reason, choice }) =>
        void run(
          () => transferTicket(record.id, choice, { note: reason }),
          t('ticket.toast.transferred'),
          t('ticket.toast.failed', { id: record.id }),
        ),
    })
  }

  /** AC-S-12: the dialog says what re-coding does before the operator commits. */
  function askRecode() {
    setConfirm({
      title: t('ticket.recode.title', { id: record.id }),
      body: t('ticket.recode.body'),
      confirmLabel: t('ticket.recode.confirm'),
      choice: {
        label: t('ticket.recode.choiceLabel'),
        help: t('ticket.recode.choiceHelp'),
        message: t('ticket.recode.choiceMessage'),
        placeholder: t('ticket.recode.choicePlaceholder'),
        emptyMessage: t('ticket.recode.choiceEmpty'),
        options: (reasonCodes.data ?? [])
          .filter((code) => code.key !== record.reasonCode)
          .map((code) => ({
            value: code.key,
            label: language === 'ar' ? code.labels.ar : code.labels.en,
            hint: t(`policy.sla.tier.${code.tier}`),
          })),
      },
      onConfirm: ({ choice }) =>
        void run(
          () => recodeTicket(record.id, choice),
          t('ticket.toast.recoded', { id: record.id }),
          t('ticket.toast.failed', { id: record.id }),
        ),
    })
  }

  function askPriority() {
    setConfirm({
      title: t('ticket.priority.title', { id: record.id }),
      body: t('ticket.priority.body'),
      confirmLabel: t('ticket.priority.confirm'),
      choice: {
        label: t('ticket.priority.choiceLabel'),
        help: t('ticket.priority.choiceHelp'),
        message: t('ticket.priority.choiceMessage'),
        placeholder: t('ticket.priority.choicePlaceholder'),
        emptyMessage: t('ticket.priority.choiceMessage'),
        options: PRIORITIES.filter((p) => p !== record.priority).map((p) => ({
          value: p,
          label: t(`ticket.priority.${p}`),
        })),
      },
      onConfirm: ({ choice }) =>
        void run(
          () => setTicketPriority(record.id, choice as TicketPriority),
          t('ticket.toast.priority', { id: record.id }),
          t('ticket.toast.failed', { id: record.id }),
        ),
    })
  }

  /* ── the header: one primary by precedence, everything else visible ── */

  const claimAction: PageAction = held === null || heldByMe
    ? {
        label: t('queue.claim'),
        onClick: () =>
          void run(
            () => claimTicket(record.id, currentUserId, currentUserName),
            t('ticket.toast.claimed', { id: record.id }),
            t('ticket.toast.claimFailed', { id: record.id }),
          ),
        disabled: claimRefusal !== null || busy,
        reason: claimRefusal,
      }
    : {
        label: t('queue.takeOver'),
        onClick: askTakeOver,
        disabled: claimRefusal !== null || busy,
        reason: claimRefusal,
      }
  const resolveAction: PageAction = {
    label: t('ticket.action.resolve'),
    onClick: () =>
      void run(
        () => resolveTicket(record.id),
        t('ticket.toast.resolved', { id: record.id }),
        t('ticket.toast.resolveFailed', { id: record.id }),
      ),
    disabled: resolveRefusal !== null || busy,
    reason: resolveRefusal,
  }
  const reopenAction: PageAction = {
    label: t('ticket.action.reopen'),
    onClick: () =>
      void run(
        () => reopenTicket(record.id),
        t('ticket.toast.reopened', { id: record.id }),
        t('ticket.toast.failed', { id: record.id }),
      ),
    disabled: reopenRefusal !== null || busy,
    reason: reopenRefusal,
  }
  const waitAction: PageAction = {
    label: t(paused || record.status === 'waiting' ? 'ticket.action.resume' : 'ticket.action.wait'),
    onClick: () =>
      void run(
        () => setTicketStatus(record.id, record.status === 'waiting' ? 'in-progress' : 'waiting'),
        t(record.status === 'waiting' ? 'ticket.toast.resumed' : 'ticket.toast.waiting', { id: record.id }),
        t('ticket.toast.failed', { id: record.id }),
      ),
    disabled: decidedRefusal !== null || busy,
    reason: decidedRefusal,
  }
  const transferAction: PageAction = {
    label: t('ticket.action.transfer'),
    onClick: askTransfer,
    disabled: transferRefusal !== null || busy,
    reason: transferRefusal,
  }
  const recodeAction: PageAction = {
    label: t('ticket.action.recode'),
    onClick: askRecode,
    disabled: decidedRefusal !== null || busy,
    reason: decidedRefusal,
  }
  const priorityAction: PageAction = {
    label: t('ticket.action.priority'),
    onClick: askPriority,
    disabled: permission !== null || busy,
    reason: permission,
  }

  /* Precedence: hold it, then decide it, then put it back (§5.3). */
  const primary = decided ? reopenAction : heldByMe ? resolveAction : claimAction
  const secondaries = decided
    ? [resolveAction, transferAction]
    : heldByMe
      ? [waitAction, transferAction]
      : [resolveAction, waitAction]
  const overflow = decided
    ? [waitAction, recodeAction, priorityAction]
    : heldByMe
      ? [reopenAction, recodeAction, priorityAction]
      : [transferAction, reopenAction, recodeAction, priorityAction]

  const header = (
    <PageHeader
      title={record.subject}
      meta={t('ticket.detail.meta', {
        id: record.id,
        requester: record.entityName,
        category: reasonLabel(t, record.reasonCode),
      })}
      badges={
        <StatusBadge tone={STATUS_TONE[record.status]}>{t(`ticket.status.${record.status}`)}</StatusBadge>
      }
      onBack={() => navigate('/support/tickets')}
      primaryAction={primary}
      secondaryActions={secondaries}
      overflowActions={overflow}
      t={t}
      dir={dir}
    />
  )

  /* ── main ─────────────────────────────────────────────────────────── */

  const main = (
    <div className="flex flex-col gap-4">
      {record.callGuideScript && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold tracking-wide text-foreground uppercase">
              {t('ticket.guide.heading', { scenario: record.callGuideScript.scenario })}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-xs">
            <div>
              <span className="mb-1 block font-semibold text-foreground">{t('ticket.guide.say')}</span>
              <p className="rounded-md border border-border bg-muted/40 p-2 text-muted-foreground">
                {record.callGuideScript.say}
              </p>
            </div>
            <div>
              <span className="mb-1 block font-semibold text-foreground">{t('ticket.guide.do')}</span>
              <p className="text-muted-foreground">{record.callGuideScript.do}</p>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {t('ticket.guide.policy', { ref: record.callGuideScript.policyRef })}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle>{t('ticket.thread')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-4">
          {timeline.length === 0 ? (
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
                  entry.message.visibility === 'internal' ? (
                    /* §8.6.2: the note is the one message that is not a bubble,
                       and its not-sent-ness lives in its header. */
                    <li
                      key={entry.message.id}
                      className="flex flex-col rounded-lg border border-border-control bg-muted p-3 text-xs"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                        <StatusBadge tone="neutral">{t('ticket.thread.internal')}</StatusBadge>
                        <span className="font-semibold">{entry.message.senderName}</span>
                        <span>{t('ticket.thread.notSent')}</span>
                        <span className="ms-auto">
                          {formatDate(entry.at, { style: 'day-month-time', language })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-foreground">{entry.message.body}</p>
                    </li>
                  ) : (
                    <li
                      key={entry.message.id}
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
                        <span>{formatDate(entry.at, { style: 'day-month-time', language })}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-foreground">{entry.message.body}</p>
                    </li>
                  )
                ) : (
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
                    <p className="text-muted-foreground">{entry.call.notes ?? t('ticket.call.noNotes')}</p>
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
              disabled={!canWrite || !hasChannel || record.status === 'closed'}
              aria-describedby={hasChannel ? undefined : 'ticket-reply-refusal'}
            />
            {!hasChannel && (
              <p id="ticket-reply-refusal" className="text-xs text-muted-foreground">
                {t('ticket.channel.unknownHelp')}
              </p>
            )}
            <div className="flex items-start justify-between gap-3">
              {/* The two tools sit together at the start; Send alone at the end (§8.6.3). */}
              <span className="flex items-start gap-2">
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
              <TemplatePicker
                surface="ticket"
                reasonCode={record.reasonCode}
                disabled={!canWrite || !hasChannel || record.status === 'closed'}
                onInsert={(text) => setReplyText((current) => (current.trim() ? `${current}\n${text}` : text))}
                t={t}
              />
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
                  <span id="ticket-send-refusal" className="text-2xs whitespace-normal text-muted-foreground">
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
        <CardTitle className="text-xs font-semibold tracking-wide text-foreground uppercase">
          {t('ticket.sla.heading')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-xs">
        <Promise
          label={t('ticket.sla.firstReply')}
          input={firstResponseInput(record)}
          answeredAt={record.firstResponseAt}
          breachedAt={record.firstResponseBreachedAt}
          decided={decided}
          paused={false}
          now={now}
          t={t}
          language={language}
        />
        <Promise
          label={t('ticket.sla.resolution')}
          input={resolutionInput(record)}
          answeredAt={record.resolvedAt}
          breachedAt={record.slaBreachedAt}
          decided={decided}
          paused={paused}
          now={now}
          t={t}
          language={language}
        />
        {record.updateDueAt !== null && (
          <Promise
            label={t('ticket.sla.nextUpdate')}
            input={updateInput(record)}
            answeredAt={null}
            breachedAt={null}
            decided={decided}
            paused={paused}
            now={now}
            t={t}
            language={language}
          />
        )}
        {paused && record.pausedAt !== null && (
          <p className="text-muted-foreground">
            {t('ticket.sla.paused', { date: formatDate(record.pausedAt, { style: 'day-month-time', language }) })}
          </p>
        )}
        {decided && (
          <p className="text-muted-foreground">
            {t('ticket.sla.stopped', { status: t(`ticket.status.${record.status}`) })}
          </p>
        )}
        <p className="text-muted-foreground">
          {t('ticket.sla.age', {
            duration: formatDuration(Math.max(0, Date.parse(now) - Date.parse(record.createdAt))),
          })}
        </p>
      </CardContent>
    </Card>,

    <Card key="ticket-meta">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide text-foreground uppercase">
          {t('ticket.details')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 text-xs">
        <Row label={t('ticket.field.status')}>
          <StatusBadge tone={STATUS_TONE[record.status]}>{t(`ticket.status.${record.status}`)}</StatusBadge>
        </Row>
        <Row label={t('ticket.field.priority')}>
          <StatusBadge tone={PRIORITY_TONE[record.priority]}>{t(`ticket.priority.${record.priority}`)}</StatusBadge>
        </Row>
        <Row label={t('ticket.field.reasonCode')}>
          <span className="flex flex-col items-end gap-0.5 text-end">
            <span className="font-medium text-foreground">{reasonLabel(t, record.reasonCode)}</span>
            <bdi className="font-mono text-xs text-muted-foreground">{record.reasonCode}</bdi>
          </span>
        </Row>
        <Row label={t('ticket.field.opened')}>
          <span className="text-foreground">
            <bdi>{formatDate(record.createdAt, { style: 'day-month-time', language })}</bdi>
          </span>
        </Row>
        <Row label={t('ticket.field.channel')}>
          <span className="text-foreground">{channelLabel}</span>
        </Row>
        <Row label={t('ticket.field.thread')}>
          <span className="font-mono text-foreground">
            <bdi>{record.conversationId ?? t('ticket.channel.unknown')}</bdi>
          </span>
        </Row>
        <Row label={t('ticket.field.owner')}>
          <span className="font-medium text-foreground">
            {record.ownerName ?? t('ticket.owner.unassigned')}
          </span>
        </Row>
        {decided && (
          <Row label={t('ticket.field.csat')}>
            <span className="text-foreground">
              {record.csat === null
                ? t('ticket.csat.none')
                : t('ticket.csat.short', { score: formatCount(record.csat.score, language) })}
            </span>
          </Row>
        )}
      </CardContent>
    </Card>,

    <Card key="requester">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide text-foreground uppercase">
          {t('ticket.requester')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <span className="font-medium text-foreground">{record.entityName}</span>
        <span className="font-mono text-muted-foreground">
          <bdi>{record.entityId}</bdi>
        </span>
        <Button
          variant="secondary"
          size="xs"
          onClick={() =>
            navigate({
              pathname: location.pathname,
              search: withOverlay(location.search, 'entity', record.entityId),
            })
          }
        >
          {t('ticket.requester.viewProfile')}
        </Button>
      </CardContent>
    </Card>,
    <ElsewhereCard
      key="ticket-elsewhere"
      entityType={record.entityType}
      entityId={record.entityId}
    />,
  ]

  return (
    <>
      <DetailPage header={header} main={main} rail={rail} />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />

      <LogCallModal
        ticket={record}
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
 * One promise: the pill with §9.3's three readings, the due date, and a sentence
 * for the two facts a pill cannot carry (kept late, or missed and still owed).
 */
function Promise({
  label,
  input,
  answeredAt,
  breachedAt,
  decided,
  paused,
  now,
  t,
  language,
}: {
  label: string
  input: QueueClockInput
  answeredAt: string | null
  breachedAt: string | null
  decided: boolean
  paused: boolean
  now: string
  t: ReturnType<typeof withFallback>
  language: 'en' | 'ar'
}) {
  const kept = answeredAt !== null
  const stopped = decided || paused || kept
  const result = queueClock(input, now, { terminal: stopped })
  const missed = breachedAt !== null
  const keptLate = kept && input.dueAt !== null && Date.parse(answeredAt) > Date.parse(input.dueAt)
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex items-center justify-between gap-3">
        {missed && !kept ? (
          <StatusBadge tone="warning">{t('ticket.sla.breached')}</StatusBadge>
        ) : kept ? (
          <StatusBadge tone={keptLate ? 'neutral' : 'success'}>
            {t(keptLate ? 'ticket.sla.keptLate' : 'ticket.sla.kept')}
          </StatusBadge>
        ) : (
          <SlaCell result={result} dueAt={input.dueAt} t={t} language={language} promiseLabel={label} />
        )}
        {input.dueAt !== null && (
          <span className="text-muted-foreground">
            <bdi>{t('ticket.sla.due', { date: formatDate(input.dueAt, { style: 'day-month-time', language }) })}</bdi>
          </span>
        )}
      </div>
      {missed && !kept && input.dueAt !== null && (
        <p className="text-muted-foreground">
          {t('ticket.sla.breachedDetail', {
            date: formatDate(input.dueAt, { style: 'day-month-time', language }),
          })}
        </p>
      )}
    </div>
  )
}

/** R5a: red is spent on the row marker, never on a badge. */
export function slaTone(breached: boolean): BadgeTone {
  return breached ? 'warning' : 'neutral'
}
