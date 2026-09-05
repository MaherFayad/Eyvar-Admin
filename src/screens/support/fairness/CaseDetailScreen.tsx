/**
 * Support › Captain Fairness › one case (S-8, SUPPORT-UX-PLAN.md §8.6). What
 * the captain contests, in full; the two dispositions with a required
 * rationale (AC-333) that then reads back on the record; the promise and the
 * owner in the rail. Both outcomes stay neutral (Q-28).
 */

import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  claimFairnessCase,
  decideFairnessCase,
  getFairnessCase,
  liveClaim,
  releaseFairnessCase,
} from '@/data/clients'
import type { FairnessCase } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader, type PageAction } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { KeyValueGrid, KeyValueRow } from '@/components/KeyValueGrid'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SlaCell, useNowIso, useRowActions } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { caseClock } from './FairnessScreen'
import { withFallback } from '../../operations/localCopy'
import { FAIRNESS_EN } from './copy'

const STATUS_KEY: Record<FairnessCase['status'], string> = {
  open: 'fairness.status.open',
  upheld: 'fairness.status.upheld',
  overturned: 'fairness.status.overturned',
  withdrawn: 'fairness.status.withdrawn',
}

export function CaseDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { caseId = '' } = useParams<{ caseId: string }>()
  const t = useMemo(() => withFallback(shell.language.t, FAIRNESS_EN), [shell.language.t])
  const { dir, language } = shell.language
  const now = useNowIso(15)

  const record = useAsync<FairnessCase>((signal) => getFairnessCase(caseId, signal), {
    deps: [caseId],
    cacheKey: 'fairness.get',
  })
  /* The record holds mutated rows the way the queue does (`useRowOverrides`). */
  const actions = useRowActions<FairnessCase>({ t })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const busy = actions.busy

  const currentUserId = shell.session?.userId ?? ''
  /* Q-84 / F-4: `approve_drivers` is the nearest gate the fixture carries. */
  const canWrite = shell.permissions.permissions.includes('approve_drivers') && !shell.isFrozen

  if (record.status === 'loading') {
    return (
      <DetailPage
        header={<PageHeader title={caseId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P2" />}
        rail={[]}
      />
    )
  }
  if (record.status === 'error' || !record.data) {
    return (
      <DetailPage
        header={<PageHeader title={caseId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <ErrorState
            scope="page"
            heading={t('fairness.detail.notFound')}
            message={t('fairness.detail.notFoundBody', { id: caseId })}
            action={{ label: t('fairness.detail.back'), onClick: () => navigate('/support/fairness') }}
          />
        }
        rail={[]}
      />
    )
  }

  const fairnessCase: FairnessCase = actions.rows([record.data])[0] ?? record.data
  const decided = fairnessCase.status !== 'open'
  const held = liveClaim(fairnessCase.claim)
  const heldByMe = held !== null && held.ownerId === currentUserId
  const overlay = (id: string) => `${location.pathname}${withOverlay(location.search, 'entity', id)}`

  function run(action: () => Promise<FairnessCase>, toastKey: string, errorKey: string) {
    setConfirm(null)
    return actions.run({ id: fairnessCase.id, errorKey, toastKey, action })
  }

  const permission = canWrite ? null : t('queue.action.noPermission')
  const decidedRefusal = permission ?? (decided ? t('fairness.decided.blocked') : null)

  /** AC-333: neither disposition commits without a written rationale. */
  function decide(outcome: 'upheld' | 'overturned') {
    setConfirm({
      title: t(outcome === 'upheld' ? 'fairness.uphold.title' : 'fairness.overturn.title', {
        name: fairnessCase.driverName,
      }),
      body: t(outcome === 'upheld' ? 'fairness.uphold.body' : 'fairness.overturn.body'),
      confirmLabel: t(outcome === 'upheld' ? 'fairness.uphold.confirm' : 'fairness.overturn.confirm'),
      reason: {
        label: t('fairness.rationale'),
        help: t('fairness.rationale.help'),
        message: t('fairness.rationale.message'),
      },
      onConfirm: ({ reason }) =>
        void run(
          () => decideFairnessCase(fairnessCase.id, outcome, reason),
          outcome === 'upheld' ? 'fairness.toast.upheld' : 'fairness.toast.overturned',
          'fairness.error.row.decide',
        ),
    })
  }

  /** AC-209: deciding a case somebody else holds takes the take-over confirmation first. */
  function askDecide(outcome: 'upheld' | 'overturned') {
    if (held === null || heldByMe) return decide(outcome)
    setConfirm({
      title: t('queue.takeOver.decide.title', { name: held.ownerName }),
      body: t('queue.takeOver.decide.body', { name: held.ownerName }),
      confirmLabel: t('queue.takeOver.decide.confirm'),
      onConfirm: () => {
        setConfirm(null)
        decide(outcome)
      },
    })
  }

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
                  () => claimFairnessCase(fairnessCase.id, { takeOver: true }),
                  'queue.toast.takenOver',
                  'fairness.error.row.claim',
                ),
            }),
          disabled: decidedRefusal !== null || busy,
          reason: decidedRefusal,
        }
      : heldByMe
        ? {
            label: t('queue.release'),
            onClick: () =>
              void run(() => releaseFairnessCase(fairnessCase.id), 'queue.toast.released', 'fairness.error.row.release'),
            disabled: decidedRefusal !== null || busy,
            reason: decidedRefusal,
          }
        : {
            label: t('queue.claim'),
            onClick: () =>
              void run(() => claimFairnessCase(fairnessCase.id), 'queue.toast.claimed', 'fairness.error.row.claim'),
            disabled: decidedRefusal !== null || busy,
            reason: decidedRefusal,
          }
  const upholdAction: PageAction = {
    label: t('fairness.action.uphold'),
    onClick: () => askDecide('upheld'),
    disabled: decidedRefusal !== null || busy,
    reason: decidedRefusal,
  }
  const overturnAction: PageAction = {
    label: t('fairness.action.overturn'),
    onClick: () => askDecide('overturned'),
    disabled: decidedRefusal !== null || busy,
    reason: decidedRefusal,
  }
  /* R3 / §5.3: neither disposition is red and neither is the "good" one, so
     the primary is the hold; the two decisions sit side by side as secondaries. */
  const primary = decided ? upholdAction : claimAction
  const secondaries = decided ? [overturnAction, claimAction] : [upholdAction, overturnAction]

  const clock = caseClock(fairnessCase, now)

  const header = (
    <PageHeader
      title={fairnessCase.driverName}
      meta={t('fairness.line', { reason: t(`fairness.reason.${fairnessCase.reasonCode}`), id: fairnessCase.id })}
      badges={
        <StatusBadge tone={fairnessCase.status === 'open' ? 'info' : 'neutral'}>
          {t(STATUS_KEY[fairnessCase.status])}
        </StatusBadge>
      }
      onBack={() => navigate('/support/fairness')}
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
          <CardTitle>{t('fairness.detail.contested')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="whitespace-pre-wrap text-foreground">{fairnessCase.detail}</p>
          <KeyValueGrid>
            {fairnessCase.disputedRating !== null && (
              <KeyValueRow label={t('fairness.col.rating')}>
                {fairnessCase.status !== 'overturned'
                  ? t('fairness.rating.value', { rating: String(fairnessCase.disputedRating) })
                  : t(fairnessCase.averageAdjusted ? 'fairness.rating.recomputed' : 'fairness.rating.voidedOnly', {
                      rating: String(fairnessCase.disputedRating),
                    })}
              </KeyValueRow>
            )}
            {fairnessCase.suspensionReason !== null && (
              <KeyValueRow label={t('fairness.col.suspension')}>{fairnessCase.suspensionReason}</KeyValueRow>
            )}
            {fairnessCase.reinstatedAt !== null && (
              <KeyValueRow label={t('fairness.detail.reinstated')} numeric>
                <bdi>{formatDate(fairnessCase.reinstatedAt, { style: 'day-month-time', language })}</bdi>
              </KeyValueRow>
            )}
            {fairnessCase.tripId !== null && (
              <KeyValueRow label={t('fairness.detail.trip')} valueClassName="font-mono">
                <bdi>{fairnessCase.tripId}</bdi>
              </KeyValueRow>
            )}
            <KeyValueRow label={t('queue.col.opened')} numeric>
              <bdi>{formatDate(fairnessCase.openedAt, { style: 'day-month-time', language })}</bdi>
            </KeyValueRow>
          </KeyValueGrid>
        </CardContent>
      </Card>

      {decided && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>{t('fairness.detail.decision')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">{t(STATUS_KEY[fairnessCase.status])}</span>
            {fairnessCase.decidedAt !== null && (
              <span className="text-xs text-muted-foreground">
                <bdi>
                  {t('queue.decided.by', {
                    actor: fairnessCase.decidedByUserName ?? '',
                    date: formatDate(fairnessCase.decidedAt, { style: 'day-month-time', language }),
                  })}
                </bdi>
              </span>
            )}
            {/* AC-333's second half: the rationale reads back in full. */}
            <p className="whitespace-pre-wrap text-foreground">
              {fairnessCase.rationale ?? t('fairness.detail.noRationale')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const rail = [
    <Card key="promise">
      <CardHeader className="pb-2">
        <CardTitle>{t('queue.col.sla')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        {decided ? (
          <span className="text-muted-foreground">
            {fairnessCase.slaBreachedAt !== null ? t('queue.decided.late') : t('fairness.detail.decidedInTime')}
          </span>
        ) : (
          <SlaCell result={clock} dueAt={fairnessCase.slaDueAt} t={t} language={language} />
        )}
        <span className="text-muted-foreground">
          {held === null ? t('queue.owner.unclaimed') : t('queue.owner.heldBy', { name: held.ownerName })}
        </span>
      </CardContent>
    </Card>,
    <Card key="parties">
      <CardHeader className="pb-2">
        <CardTitle>{t('fairness.detail.parties')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        <Button asChild variant="secondary" size="xs" className="justify-start">
          <a href={overlay(fairnessCase.driverId)}>
            {t('fairness.detail.captain', { name: fairnessCase.driverName })}
          </a>
        </Button>
        {fairnessCase.subjectId !== null && fairnessCase.subjectName !== null && (
          <Button asChild variant="secondary" size="xs" className="justify-start">
            <a href={overlay(fairnessCase.subjectId)}>
              {t('fairness.detail.rider', { name: fairnessCase.subjectName })}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>,
  ]

  return (
    <>
      <DetailPage header={header} main={main} rail={rail} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />
    </>
  )
}
