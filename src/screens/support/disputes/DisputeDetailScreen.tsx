/**
 * Support › Disputes › one claim (S-7, SUPPORT-UX-PLAN.md §5.6). The claim in
 * the claimant's words and its evidence in the main column; the verdict, the
 * owner and the parties in the rail. Resolving is the money-moving act and
 * keeps its modal (§8: the derived line before commit).
 */

import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  claimDispute,
  getDispute,
  liveClaim,
  releaseDispute,
  resolveDispute,
  type ResolveDisputeInput,
} from '@/data/clients'
import type { BadgeTone, Dispute } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate, formatMoney } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader, type PageAction } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { ElsewhereCard } from '../shared/ElsewhereCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Money } from '@/components/Money'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SlaCell, queueClock, useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { ResolveDisputeModal } from './ResolveDisputeModal'
import { withFallback } from '../../operations/localCopy'
import { DISPUTES_EN } from './copy'

const STATUS_TONE: Record<Dispute['status'], BadgeTone> = {
  open: 'warning',
  'under-review': 'info',
  resolved: 'success',
}

export function DisputeDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { disputeId = '' } = useParams<{ disputeId: string }>()
  const t = useMemo(() => withFallback(shell.language.t, DISPUTES_EN), [shell.language.t])
  const { dir, language } = shell.language
  const now = useNowIso(15)

  const record = useAsync<Dispute>((signal) => getDispute(disputeId, signal), {
    deps: [disputeId],
    cacheKey: 'disputes.get',
  })
  const [resolving, setResolving] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)

  const currentUserId = shell.session?.userId ?? ''
  const currentUserName = shell.session?.name ?? ''
  const canWrite = shell.permissions.permissions.includes('manage_tickets') && !shell.isFrozen

  if (record.status === 'loading') {
    return (
      <DetailPage
        header={<PageHeader title={disputeId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P2" />}
        rail={[]}
      />
    )
  }
  if (record.status === 'error' || !record.data) {
    return (
      <DetailPage
        header={<PageHeader title={disputeId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <ErrorState
            scope="page"
            heading={t('dispute.detail.notFound')}
            message={t('dispute.detail.notFoundBody', { id: disputeId })}
            action={{ label: t('dispute.detail.back'), onClick: () => navigate('/support/disputes') }}
          />
        }
        rail={[]}
      />
    )
  }

  const dispute: Dispute = record.data
  const decided = dispute.status === 'resolved'
  const held = liveClaim(dispute.ownership)
  const heldByMe = held !== null && held.ownerId === currentUserId
  const overlay = (entityId: string) =>
    `${location.pathname}${withOverlay(location.search, 'entity', entityId)}`

  async function run(action: () => Promise<unknown>, done: string, failed: string) {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      record.refetch()
    } catch {
      toast.error(failed)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const permission = canWrite ? null : t('dispute.action.take.blocked.permission')
  const claimRefusal = permission ?? (decided ? t('dispute.action.take.blocked.resolved') : null)
  const resolveRefusal =
    permission ??
    (decided
      ? t('dispute.action.resolve.blocked.resolved', {
          date: formatDate(dispute.resolution?.resolvedAt ?? dispute.filedAt, { style: 'day-month', language }),
        })
      : null)

  const claimAction: PageAction =
    held !== null && !heldByMe
      ? {
          label: t('queue.takeOver'),
          onClick: () =>
            setConfirm({
              title: t('queue.takeOver.title', { name: held.ownerName }),
              body: t('queue.takeOver.body', { name: held.ownerName }),
              confirmLabel: t('queue.takeOver.confirm'),
              onConfirm: () =>
                void run(
                  () => claimDispute(dispute.id, currentUserId, currentUserName, { takeOver: true }),
                  t('queue.toast.takenOver'),
                  t('dispute.toast.failed', { id: dispute.id }),
                ),
            }),
          disabled: claimRefusal !== null || busy,
          reason: claimRefusal,
        }
      : heldByMe
        ? {
            label: t('queue.release'),
            onClick: () =>
              void run(
                () => releaseDispute(dispute.id),
                t('queue.toast.released'),
                t('dispute.toast.failed', { id: dispute.id }),
              ),
            disabled: claimRefusal !== null || busy,
            reason: claimRefusal,
          }
        : {
            label: t('dispute.action.take'),
            onClick: () =>
              void run(
                () => claimDispute(dispute.id, currentUserId, currentUserName),
                t('dispute.toast.taken', { id: dispute.id }),
                t('dispute.toast.failed', { id: dispute.id }),
              ),
            disabled: claimRefusal !== null || busy,
            reason: claimRefusal,
          }
  const resolveAction: PageAction = {
    label: t('dispute.action.resolve'),
    onClick: () => setResolving(true),
    disabled: resolveRefusal !== null || busy,
    reason: resolveRefusal,
  }

  /* Hold it, then decide it; a decided claim keeps both visible and refused. */
  const primary = decided ? resolveAction : heldByMe ? resolveAction : claimAction
  const secondaries = decided ? [claimAction] : heldByMe ? [claimAction] : [resolveAction]

  const clock = queueClock(
    {
      startedAt: dispute.slaStartedAt,
      dueAt: dispute.slaDueAt,
      targetMinutes: dispute.slaTargetMinutes,
      breachedAt: dispute.slaBreachedAt,
    },
    now,
    { terminal: decided },
  )

  const handleResolve = async (input: ResolveDisputeInput) => {
    const { dispute: resolved } = await resolveDispute(input)
    const outcome = resolved.resolution?.outcome
    toast.success(
      outcome && outcome !== 'declined'
        ? t('dispute.toast.resolved', {
            id: resolved.id,
            amount: formatMoney(resolved.resolution?.refundHalalas ?? 0, { unit: 'code' }),
            name: resolved.claimantName,
          })
        : t('dispute.toast.declined', { id: resolved.id }),
    )
    setResolving(false)
    record.refetch()
  }

  const header = (
    <PageHeader
      title={t(`dispute.kind.${dispute.kind}`)}
      meta={t('dispute.detail.meta', {
        id: dispute.id,
        claimant: dispute.claimantName,
        amount: formatMoney(dispute.amountHalalas, { unit: 'code' }),
      })}
      badges={<StatusBadge tone={STATUS_TONE[dispute.status]}>{t(`dispute.status.${dispute.status}`)}</StatusBadge>}
      onBack={() => navigate('/support/disputes')}
      primaryAction={primary}
      secondaryActions={secondaries}
      t={t}
      dir={dir}
    />
  )

  const main = (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('dispute.resolve.claim')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="whitespace-pre-wrap text-foreground">{dispute.claim}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <dt className="text-muted-foreground">{t('dispute.resolve.claimed')}</dt>
            <dd className="text-end font-semibold">
              <Money amount={dispute.amountHalalas} />
            </dd>
            <dt className="text-muted-foreground">{t('dispute.resolve.filed')}</dt>
            <dd className="text-end">
              <bdi>{formatDate(dispute.filedAt, { style: 'day-month-time', language })}</bdi>
            </dd>
            {dispute.tripId !== null && (
              <>
                <dt className="text-muted-foreground">{t('dispute.detail.trip')}</dt>
                <dd className="text-end font-mono">
                  <bdi>{dispute.tripId}</bdi>
                </dd>
              </>
            )}
            {dispute.subscriptionId !== null && (
              <>
                <dt className="text-muted-foreground">{t('dispute.detail.subscription')}</dt>
                <dd className="text-end font-mono">
                  <bdi>{dispute.subscriptionId}</bdi>
                </dd>
              </>
            )}
            {dispute.ticketId !== null && (
              <>
                <dt className="text-muted-foreground">{t('dispute.detail.ticket')}</dt>
                <dd className="text-end">
                  <Button asChild variant="ghost" size="xs">
                    <a href={`/support/tickets/${dispute.ticketId}`}>
                      <bdi>{dispute.ticketId}</bdi>
                    </a>
                  </Button>
                </dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t('dispute.resolve.evidence')}</CardTitle>
        </CardHeader>
        <CardContent>
          {dispute.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dispute.resolve.noEvidence')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {dispute.evidence.map((item) => (
                <li key={`${item.source}-${item.detail}`} className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                  <span className="block text-xs font-medium text-foreground">
                    {t(`dispute.evidence.${item.source}`)}
                  </span>
                  <span className="text-muted-foreground">{item.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {dispute.resolution !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{t('dispute.detail.verdict')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">
              {dispute.resolution.refundHalalas === 0
                ? t('dispute.line.settledNothing', { outcome: t(`dispute.outcome.${dispute.resolution.outcome}`) })
                : t('dispute.line.settled', {
                    outcome: t(`dispute.outcome.${dispute.resolution.outcome}`),
                    amount: formatMoney(dispute.resolution.refundHalalas, { unit: 'code' }),
                  })}
            </span>
            <span className="text-xs text-muted-foreground">
              <bdi>
                {t('queue.decided.by', {
                  actor: dispute.resolution.resolvedByUserName,
                  date: formatDate(dispute.resolution.resolvedAt, { style: 'day-month-time', language }),
                })}
              </bdi>
            </span>
            {dispute.resolution.note !== null && (
              <p className="text-muted-foreground">{dispute.resolution.note}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  const rail = [
    <Card key="deadline">
      <CardHeader className="pb-2">
        <CardTitle>{t('dispute.col.due')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <SlaCell result={clock} dueAt={dispute.slaDueAt} t={t} language={language} />
        <span className="text-muted-foreground">
          {held === null ? t('queue.owner.unclaimed') : t('queue.owner.heldBy', { name: held.ownerName })}
        </span>
      </CardContent>
    </Card>,
    <Card key="parties">
      <CardHeader className="pb-2">
        <CardTitle>{t('dispute.col.parties')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <Button asChild variant="secondary" size="xs" className="justify-start">
          <a href={overlay(dispute.claimantId)}>{t('dispute.line.claimant', { name: dispute.claimantName })}</a>
        </Button>
        {dispute.againstId !== null && dispute.againstName !== null ? (
          <Button asChild variant="secondary" size="xs" className="justify-start">
            <a href={overlay(dispute.againstId)}>{t('dispute.line.against', { name: dispute.againstName })}</a>
          </Button>
        ) : (
          <span className="text-muted-foreground">{t('dispute.line.noAgainst')}</span>
        )}
      </CardContent>
    </Card>,
    /* §7.1: the claimant's other open items; the other party's when the id names a captain (DRV-). */
    <ElsewhereCard
      key="claimant-elsewhere"
      entityType={dispute.claimantType === 'captain' ? 'driver' : 'rider'}
      entityId={dispute.claimantId}
    />,
    ...(dispute.againstId === null
      ? []
      : [
          <ElsewhereCard
            key="against-elsewhere"
            entityType={dispute.againstId.startsWith('DRV-') ? 'driver' : 'rider'}
            entityId={dispute.againstId}
          />,
        ]),
  ]

  return (
    <>
      <DetailPage header={header} main={main} rail={rail} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />
      <ResolveDisputeModal
        dispute={resolving ? dispute : null}
        open={resolving}
        canWrite={canWrite}
        onClose={() => setResolving(false)}
        onConfirm={handleResolve}
        t={t}
        language={language}
      />
    </>
  )
}
