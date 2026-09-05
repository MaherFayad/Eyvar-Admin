/**
 * Support › Safety › one incident (S-8, SUPPORT-UX-PLAN.md §8.5; spec F-2).
 * The four-step protocol as a checklist with names, the outstanding count as
 * text on the refused `Close` (AC-308, §11.2), both promises in the rail
 * (Q-11), and the take-over confirmation before deciding another's incident.
 */

import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  claimSafetyIncident,
  closeSafetyIncident,
  getSafetyIncident,
  liveClaim,
  releaseSafetyIncident,
  setSafetyProtocolStep,
} from '@/data/clients'
import { SAFETY_PROTOCOL_STEPS, type SafetyIncident, type SafetyProtocolStepKey } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader, type PageAction } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { RefusalLine } from '@/components/table/rowActions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { SlaCell, queueClock, useNowIso, useRowActions } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { withFallback } from '../../operations/localCopy'
import { SAFETY_EN } from './copy'

const STEP_LABEL: Readonly<Record<SafetyProtocolStepKey, string>> = {
  contact: 'safety.step.contact',
  verify: 'safety.step.verify',
  act: 'safety.step.act',
  document: 'safety.step.document',
}

export function IncidentDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { incidentId = '' } = useParams<{ incidentId: string }>()
  const t = useMemo(() => withFallback(shell.language.t, SAFETY_EN), [shell.language.t])
  const { dir, language } = shell.language
  const now = useNowIso(15)

  const record = useAsync<SafetyIncident>((signal) => getSafetyIncident(incidentId, signal), {
    deps: [incidentId],
    cacheKey: 'safety.get',
  })
  /* The safety mock returns a mutated row and writes nothing back, so the
     record is held here, as the queue holds its rows (`useRowOverrides`). */
  const actions = useRowActions<SafetyIncident>({ t })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const busy = actions.busy

  const currentUserId = shell.session?.userId ?? ''
  /* Q-51 / Q-84: `approve_drivers` is the nearest gate the fixture carries. */
  const canWrite = shell.permissions.permissions.includes('approve_drivers') && !shell.isFrozen

  if (record.status === 'loading') {
    return (
      <DetailPage
        header={<PageHeader title={incidentId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P2" />}
        rail={[]}
      />
    )
  }
  if (record.status === 'error' || !record.data) {
    return (
      <DetailPage
        header={<PageHeader title={incidentId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <ErrorState
            scope="page"
            heading={t('safety.detail.notFound')}
            message={t('safety.detail.notFoundBody', { id: incidentId })}
            action={{ label: t('safety.detail.back'), onClick: () => navigate('/support/safety') }}
          />
        }
        rail={[]}
      />
    )
  }

  const incident: SafetyIncident = actions.rows([record.data])[0] ?? record.data
  const closed = incident.status === 'closed'
  const held = liveClaim(incident.claim)
  const heldByMe = held !== null && held.ownerId === currentUserId
  const outstanding = incident.protocol.filter((step) => !step.done).length
  const acknowledged = incident.firstResponseAt !== null
  const overlay = (id: string) => `${location.pathname}${withOverlay(location.search, 'entity', id)}`

  function run(action: () => Promise<SafetyIncident>, toastKey: string, errorKey: string) {
    setConfirm(null)
    return actions.run({ id: incident.id, errorKey, toastKey, action })
  }

  const permission = canWrite ? null : t('queue.action.noPermission')
  const closeRefusal: string | null =
    permission ??
    (closed
      ? t('safety.step.closed')
      : outstanding === 1
        ? t('safety.action.close.blockedOne')
        : outstanding > 1
          ? t('safety.action.close.blocked', { count: formatCount(outstanding, language) })
          : null)

  function close() {
    setConfirm({
      title: t('safety.close.title', { id: incident.id }),
      body: t('safety.close.body'),
      confirmLabel: t('safety.close.confirm'),
      onConfirm: () =>
        void run(() => closeSafetyIncident(incident.id), 'safety.toast.closed', 'safety.error.row.close'),
    })
  }

  /** AC-209: deciding another operator's incident takes the take-over confirmation first. */
  function askClose() {
    if (held === null || heldByMe) return close()
    setConfirm({
      title: t('queue.takeOver.decide.title', { name: held.ownerName }),
      body: t('queue.takeOver.decide.body', { name: held.ownerName }),
      confirmLabel: t('queue.takeOver.decide.confirm'),
      onConfirm: () => {
        setConfirm(null)
        close()
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
                  () => claimSafetyIncident(incident.id, { takeOver: true }),
                  'queue.toast.takenOver',
                  'safety.error.row.claim',
                ),
            }),
          disabled: permission !== null || closed || busy,
          reason: permission ?? (closed ? t('safety.step.closed') : null),
        }
      : heldByMe
        ? {
            label: t('queue.release'),
            onClick: () =>
              void run(() => releaseSafetyIncident(incident.id), 'queue.toast.released', 'safety.error.row.release'),
            disabled: permission !== null || closed || busy,
            reason: permission ?? (closed ? t('safety.step.closed') : null),
          }
        : {
            label: t('queue.claim'),
            onClick: () =>
              void run(() => claimSafetyIncident(incident.id), 'queue.toast.claimed', 'safety.error.row.claim'),
            disabled: permission !== null || closed || busy,
            reason: permission ?? (closed ? t('safety.step.closed') : null),
          }
  const closeAction: PageAction = {
    label: t('safety.action.close'),
    onClick: askClose,
    disabled: closeRefusal !== null || busy,
    reason: closeRefusal,
  }
  /* Hold it, then close it. A closed incident keeps both visible and refused. */
  const primary = closed ? closeAction : heldByMe ? closeAction : claimAction
  const secondaries = closed ? [claimAction] : heldByMe ? [claimAction] : [closeAction]

  const acknowledgeClock = queueClock(
    {
      startedAt: incident.openedAt,
      dueAt: incident.firstResponseDueAt,
      targetMinutes: null,
      breachedAt: incident.firstResponseBreachedAt,
    },
    now,
    { terminal: acknowledged || closed },
  )
  const resolveClock = queueClock(
    {
      startedAt: incident.slaStartedAt,
      dueAt: incident.slaDueAt,
      targetMinutes: incident.slaTargetMinutes,
      breachedAt: incident.slaBreachedAt,
    },
    now,
    { terminal: closed },
  )

  const header = (
    <PageHeader
      title={incident.summary}
      meta={t('safety.detail.meta', {
        id: incident.id,
        type: t(`safety.type.${incident.type === 'unsafe-driving' ? 'unsafeDriving' : incident.type}`),
        opened: formatDate(incident.openedAt, { style: 'day-month-time', language }),
      })}
      badges={
        <span className="flex items-center gap-2">
          {incident.severity !== 'normal' && (
            <StatusBadge tone="warning">{t(`safety.severity.${incident.severity}`)}</StatusBadge>
          )}
          <StatusBadge tone={closed ? 'neutral' : acknowledged ? 'info' : 'warning'}>
            {t(closed ? 'safety.status.closed' : acknowledged ? 'safety.status.acknowledged' : 'safety.status.unacknowledged')}
          </StatusBadge>
        </span>
      }
      onBack={() => navigate('/support/safety')}
      primaryAction={primary}
      secondaryActions={secondaries}
      t={t}
      dir={dir}
    />
  )

  const documentBlocked =
    !closed &&
    incident.protocol.some((step) => step.key === 'document' && !step.done) &&
    incident.protocol.some((step) => step.key !== 'document' && !step.done)

  const failure = actions.failure(incident.id)

  const main = (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('safety.col.protocol')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ol className="flex flex-col gap-2">
          {SAFETY_PROTOCOL_STEPS.map((key) => {
            const step = incident.protocol.find((entry) => entry.key === key)
            const ticked = step?.done ?? false
            const blockedByOrder = key === 'document' && !ticked && documentBlocked
            const disabled = !canWrite || closed || blockedByOrder || busy
            return (
              <li key={key} className="flex items-start gap-3 rounded-md border border-border px-3 py-2">
                <Checkbox
                  id={`protocol-${key}`}
                  checked={ticked}
                  disabled={disabled}
                  aria-describedby={blockedByOrder ? 'protocol-document-refusal' : undefined}
                  onCheckedChange={(next) =>
                    void run(
                      () => setSafetyProtocolStep(incident.id, key, next === true),
                      'safety.toast.step',
                      'safety.error.row.step',
                    )
                  }
                />
                <label htmlFor={`protocol-${key}`} className="flex min-w-0 flex-1 flex-col text-sm">
                  <span className="font-medium text-foreground">{t(STEP_LABEL[key])}</span>
                  {step?.done && step.completedAt !== null && (
                    <span className="text-xs text-muted-foreground">
                      <bdi>
                        {t('queue.decided.by', {
                          actor: step.completedByUserName ?? '',
                          date: formatDate(step.completedAt, { style: 'day-month-time', language }),
                        })}
                      </bdi>
                    </span>
                  )}
                </label>
              </li>
            )
          })}
        </ol>
        {documentBlocked && canWrite && !closed && (
          <RefusalLine id="protocol-document-refusal">{t('safety.step.documentBlocked')}</RefusalLine>
        )}
        {failure && (
          <ErrorState
            scope="card"
            card={false}
            message={failure.message}
            action={{ label: t('queue.error.retry'), onClick: failure.retry }}
          />
        )}
        {closed && <p className="text-xs text-muted-foreground">{t('safety.step.closed')}</p>}
        <p className="text-xs text-muted-foreground">
          {t('safety.step.countLabel', {
            done: formatCount(incident.protocol.filter((s) => s.done).length, language),
            total: formatCount(SAFETY_PROTOCOL_STEPS.length, language),
          })}
        </p>
      </CardContent>
    </Card>
  )

  const rail = [
    <Card key="promises">
      <CardHeader className="pb-2">
        <CardTitle>{t('safety.detail.promises')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{t('safety.promise.acknowledge')}</span>
          {acknowledged ? (
            <span className="text-muted-foreground">
              <bdi>
                {t('safety.detail.acknowledgedAt', {
                  date: formatDate(incident.firstResponseAt!, { style: 'day-month-time', language }),
                })}
              </bdi>
            </span>
          ) : (
            <SlaCell result={acknowledgeClock} dueAt={incident.firstResponseDueAt} t={t} language={language} />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{t('safety.promise.resolve')}</span>
          <SlaCell result={resolveClock} dueAt={incident.slaDueAt} t={t} language={language} />
        </div>
        <span className="text-muted-foreground">
          {held === null ? t('queue.owner.unclaimed') : t('queue.owner.heldBy', { name: held.ownerName })}
        </span>
        {closed && incident.closedAt !== null && (
          <span className="text-muted-foreground">
            <bdi>
              {t('queue.decided.by', {
                actor: incident.closedByUserName ?? '',
                date: formatDate(incident.closedAt, { style: 'day-month-time', language }),
              })}
            </bdi>
          </span>
        )}
      </CardContent>
    </Card>,
    <Card key="parties">
      <CardHeader className="pb-2">
        <CardTitle>{t('safety.detail.parties')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-xs">
        {incident.againstId !== null ? (
          <Button asChild variant="secondary" size="xs" className="justify-start">
            <a href={overlay(incident.againstId)}>
              {t('safety.detail.against', { name: incident.againstName ?? incident.againstId })}
            </a>
          </Button>
        ) : (
          <span className="text-muted-foreground">{t('safety.detail.noAgainst')}</span>
        )}
        {incident.reporterId !== null && (
          <Button asChild variant="secondary" size="xs" className="justify-start">
            <a href={overlay(incident.reporterId)}>
              {t('safety.detail.reporter', { name: incident.reporterName ?? incident.reporterId })}
            </a>
          </Button>
        )}
        <span className="text-muted-foreground">
          {incident.tripId === null ? (
            t('safety.line.noTrip', { type: '' }).replace(/^\s*·\s*/, '')
          ) : (
            <bdi>{t('safety.detail.trip', { trip: incident.tripId })}</bdi>
          )}
        </span>
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
