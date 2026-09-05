/**
 * The operator's own arrangement in the 360° layer (plan T5.1, TA-10): access
 * as role plus delta (AC-921) with the router's own preview (AC-924), what they
 * hold now, their recent audit entries, their sessions, their onboarding and
 * their place on the rota. Rendered only under `manage_team`.
 */

import {
  getOnCallRota,
  getOnboarding,
  listAuditEntries,
  listDevices,
  listWorkItems,
  resolvePermissions,
} from '@/data/clients'
import type {
  AuditEntry,
  DeviceSession,
  OnCallRota,
  Paginated,
  TeamUser,
  WorkItem,
} from '@/data/types'
import type { OnboardingChecklist } from '@/data/types/onboarding'
import { useAsync } from '@/hooks'
import { formatDate, formatLocalisedText, type Language, type Translate } from '@/lib'
import { AccessPreview } from '@/components/access/AccessPreview'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { PERMISSION_KEYS } from '@/shell/permissions'
import { roleLabel } from '@/screens/auth/copy'
import { workText } from '@/screens/operations/my-work/MyWorkScreen'
import { SectionCard, SectionStates } from '../SectionCard'

export interface OperatorProfileProps {
  operator: TeamUser
  t: Translate
  language: Language
  /** Closes the layer and navigates; the shell owns both halves. */
  onNavigate: (path: string) => void
}

export function OperatorProfile({ operator, t, language, onNavigate }: OperatorProfileProps) {
  const effective = resolvePermissions(operator)
  const delta = operator.permissionDelta ?? null

  const holding = useAsync<WorkItem[]>(
    async (signal) => {
      const page: Paginated<WorkItem> = await listWorkItems({ includeOtherRoles: true, pageSize: 200 }, signal)
      return page.items.filter((w) => w.claim?.state === 'claimed' && w.claim.ownerId === operator.id)
    },
    { deps: [operator.id], cacheKey: 'work.list', isEmpty: (rows) => rows.length === 0 },
  )
  const today = useAsync<AuditEntry[]>(
    async (signal) => (await listAuditEntries({ actorId: operator.id, pageSize: 20, signal })).items,
    { deps: [operator.id], cacheKey: 'audit.list', isEmpty: (rows) => rows.length === 0 },
  )
  const sessions = useAsync<DeviceSession[]>((signal) => listDevices(operator.id, signal), {
    deps: [operator.id],
    cacheKey: 'devices.list',
    isEmpty: (rows) => rows.length === 0,
  })
  const onboarding = useAsync<OnboardingChecklist>((signal) => getOnboarding(operator.id, signal), {
    deps: [operator.id],
    cacheKey: 'onboarding.get',
    isEmpty: () => false,
  })
  const rota = useAsync<OnCallRota>((signal) => getOnCallRota(signal), { cacheKey: 'team.rota', isEmpty: () => false })

  return (
    <div className="flex flex-col gap-2">
      <SectionCard title={t('profile.operator.section.access')} defaultOpen>
        <div className="flex flex-col gap-2 text-xs">
          <span className="flex flex-wrap items-center gap-1">
            <span className="font-medium text-foreground">{roleLabel(t, operator.role)}</span>
            {delta?.granted.map((key) => (
              <StatusBadge key={`g-${key}`} tone="success">
                {t('profile.operator.override.plus', { label: t(`account.permission.${key}`) })}
              </StatusBadge>
            ))}
            {delta?.revoked.map((key) => (
              <StatusBadge key={`r-${key}`} tone="neutral">
                {t('profile.operator.override.minus', { label: t(`account.permission.${key}`) })}
              </StatusBadge>
            ))}
          </span>
          <span className="text-muted-foreground">
            {t('profile.operator.effective', { count: effective.length, total: PERMISSION_KEYS.length })}
          </span>
          <AccessPreview permissions={effective} t={t} />
        </div>
      </SectionCard>

      <SectionCard title={t('profile.operator.section.holding')} defaultOpen>
        <SectionStates
          result={holding}
          section={t('profile.operator.section.holding')}
          empty={t('profile.operator.holding.empty')}
          t={t}
        >
          {(rows) => (
            <ul className="flex flex-col divide-y divide-border text-xs">
              {rows.map((item) => (
                <li key={item.key} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="truncate text-foreground">{workText(t, item.titleKey, item.titleParams)}</span>
                  {item.dueAt !== null && (
                    <span className="shrink-0 text-muted-foreground">
                      {formatDate(item.dueAt, { language, style: 'day-month-time' })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionStates>
      </SectionCard>

      <SectionCard
        title={t('profile.operator.section.today')}
        defaultOpen
        aside={
          <Button variant="link" size="xs" onClick={() => onNavigate(`/admin/activity?actor=${operator.id}`)}>
            {t('profile.operator.openActivity')}
          </Button>
        }
      >
        <SectionStates result={today} section={t('profile.operator.section.today')} empty={t('profile.operator.today.empty')} t={t}>
          {(rows) => (
            <ul className="flex flex-col divide-y divide-border text-xs">
              {rows.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="truncate text-foreground">{formatLocalisedText(entry.detail, t)}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatDate(entry.at, { language, style: 'day-month-time' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionStates>
      </SectionCard>

      <SectionCard title={t('profile.operator.section.sessions')} defaultOpen={false}>
        <SectionStates result={sessions} section={t('profile.operator.section.sessions')} empty={t('profile.operator.sessions.empty')} t={t}>
          {(rows) => (
            <ul className="flex flex-col divide-y divide-border text-xs">
              {rows.map((device) => (
                <li key={device.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="truncate text-foreground">
                    {device.device} · {device.location}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatDate(device.lastActiveAt, { language, style: 'day-month-time' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionStates>
      </SectionCard>

      <SectionCard title={t('profile.operator.section.onboarding')} defaultOpen={false}>
        <SectionStates result={onboarding} section={t('profile.operator.section.onboarding')} empty={t('profile.state.empty')} t={t}>
          {(checklist) => (
            <p className="text-xs text-foreground">
              {checklist.isComplete
                ? t('profile.operator.onboarding.complete')
                : t('profile.operator.onboarding.progress', { done: checklist.doneCount, total: checklist.totalCount })}
            </p>
          )}
        </SectionStates>
      </SectionCard>

      <SectionCard title={t('profile.operator.section.onCall')} defaultOpen={false}>
        <SectionStates result={rota} section={t('profile.operator.section.onCall')} empty={t('profile.state.empty')} t={t}>
          {(current) => (
            <p className="text-xs text-foreground">
              {current.primaryUserId === operator.id
                ? t('profile.operator.onCall.primary')
                : current.secondaryUserId === operator.id
                  ? t('profile.operator.onCall.secondary')
                  : t('profile.operator.onCall.none')}
            </p>
          )}
        </SectionStates>
      </SectionCard>
    </div>
  )
}
