/**
 * `alert-status` — the live state of one or more alert rules (AC-1189).
 * The tone map mirrors `AlertsView.tsx`'s (R7: firing = warning); repeated
 * here rather than imported, since that file belongs to another package.
 */

import {
  ArmedIcon,
  CoolingIcon,
  FiringIcon,
  NotWorkingIcon,
  SuspendedIcon,
} from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useAsync } from '@/hooks'
import { getAlertRule } from '@/data/clients'
import type { AlertRule } from '@/data/types'
import { formatDate, isolatedRunProps } from '@/lib'
import { usePageBlocks } from '../PageBlocksContext'
import type { AlertStatusBlock as AlertStatusBlockData } from '@/data/types/page'

const STATE_TONE: Record<AlertRule['state'], 'success' | 'warning' | 'info' | 'neutral'> = {
  armed: 'success',
  firing: 'warning',
  cooling: 'info',
  suspended: 'neutral',
  error: 'neutral',
}

const STATE_GLYPH: Record<AlertRule['state'], typeof ArmedIcon> = {
  armed: ArmedIcon,
  firing: FiringIcon,
  cooling: CoolingIcon,
  suspended: SuspendedIcon,
  error: NotWorkingIcon,
}

export function AlertStatusBlockView({ block }: { block: AlertStatusBlockData }) {
  const { t, language } = usePageBlocks()

  const rules = useAsync(
    async (signal) => {
      const results = await Promise.all(block.ruleIds.map((id) => getAlertRule(id, signal)))
      return results.map((r) => r.data)
    },
    { deps: [block.ruleIds.join(',')], cacheKey: 'alerts.get' },
  )

  if (block.ruleIds.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('pg.block.alertStatus.empty')}</p>
  }

  if (rules.status === 'loading') return <LoadingSkeleton pattern="P1" rows={block.ruleIds.length} label={t('pg.block.alertStatus.name')} />
  if (rules.status === 'error') {
    return (
      <ErrorState
        scope="card"
        card={false}
        message={t('pg.block.alertStatus.error')}
        action={{ label: t('rb.dashboard.tile.retry'), onClick: rules.refetch }}
      />
    )
  }

  return (
    <ul className="flex list-none flex-col gap-2">
      {(rules.data ?? []).map((rule) => {
        const Glyph = STATE_GLYPH[rule.state]
        return (
          <li key={rule.id} className="flex items-center justify-between gap-2 rounded-card border border-border p-2">
            <span {...isolatedRunProps({ className: 'min-w-0 truncate text-sm' }).box}>
              <bdi {...isolatedRunProps().run}>{rule.name}</bdi>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              {rule.lastValue !== null && <span className="tabular-nums">{rule.lastValue}</span>}
              {rule.lastEvaluatedAt && (
                <bdi className="tabular-nums">{formatDate(rule.lastEvaluatedAt, { style: 'day-month-time', language })}</bdi>
              )}
              <Badge tone={STATE_TONE[rule.state]}>
                <Glyph aria-hidden="true" />
                {t(`rb.alert.state.${rule.state}`)}
              </Badge>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
