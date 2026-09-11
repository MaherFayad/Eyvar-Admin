/**
 * The firings feed — AC-1236…1238. A cross-rule LEDGER (no sort, no
 * selection, no `rowActions` kebab, enforced at compile time by `mode:
 * 'ledger'`); `Acknowledge`/`Explain` are their own column instead (§7.3).
 * Fetched whole and narrowed here, as `AlertHistoryDialog` already narrows a
 * firing list — `date`/`severity` run client-side since `clients/alerts.ts`
 * (not this role's file) only filters `ruleId`/`acknowledged` server-side.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import type { DataColumn } from '@/components/table/columns'
import { StatusBadge } from '@/components/StatusBadge'
import { useAsync, useIndexTable } from '@/hooks'
import { acknowledgeFiring, listAlertRules, listFirings } from '@/data/clients'
import type { AlertFiring } from '@/data/types'
import { alertDeliveries, alertSeverity } from '@/data/types/alert'
import { formatMetricValue } from '@/components/metrics/formatMetric'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { NoFiringsIllustration } from './AlertHistoryDialog'

export interface AlertFeedViewProps {
  today: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

export function AlertFeedView({ t, language }: AlertFeedViewProps) {
  const table = useIndexTable({ mode: 'ledger' })

  const rulesQuery = useAsync((signal) => listAlertRules({ pageSize: 200 }, signal), {
    cacheKey: 'alerts.list.feed',
    deps: [],
    isEmpty: (result) => result.items.length === 0,
  })
  const rules = rulesQuery.data?.items ?? []
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]))

  /* Whole, not paged — the four filters below narrow client-side, matching
     `AlertHistoryDialog`'s own established pattern for a ledger list. */
  const firingsQuery = useAsync((signal) => listFirings({ pageSize: 200 }, signal), {
    cacheKey: 'alerts.firings.feed',
    deps: [],
    isEmpty: (result) => result.items.length === 0,
  })
  const allFirings = firingsQuery.data?.items ?? []

  const needle = table.params.q?.trim().toLowerCase() ?? ''
  const activeFilters = table.params.filters ?? []
  const hasActiveFilter = needle !== '' || activeFilters.length > 0

  const rows = allFirings.filter((firing) => {
    for (const filter of activeFilters) {
      const wanted = Array.isArray(filter.value) ? filter.value.map(String) : [String(filter.value)]
      if (filter.field === 'ruleId' && !wanted.includes(firing.ruleId)) return false
      if (filter.field === 'severity') {
        const rule = rulesById.get(firing.ruleId)
        const severity = rule ? alertSeverity(rule) : 'high'
        if (!wanted.includes(severity)) return false
      }
      if (filter.field === 'acknowledged') {
        const want = wanted.includes('true')
        if ((firing.acknowledgedAt !== null && firing.acknowledgedAt !== undefined) !== want) return false
      }
      if (filter.field === 'date') {
        const value = String(filter.value)
        if (filter.op === 'gte' && firing.firedAt < value) return false
        if (filter.op === 'lte' && firing.firedAt > value) return false
      }
    }
    if (needle === '') return true
    const rule = rulesById.get(firing.ruleId)
    return (rule?.name.toLowerCase().includes(needle) ?? false) || firing.bucketStart.toLowerCase().includes(needle)
  })

  const status = firingsQuery.status === 'content' && rows.length === 0 ? 'empty' : firingsQuery.status

  const [acking, setAcking] = useState<Record<string, boolean>>({})
  const acknowledge = async (firing: AlertFiring) => {
    setAcking((current) => ({ ...current, [firing.id]: true }))
    try {
      await acknowledgeFiring(firing.id)
      toast.success(t('rb.alert.feed.acknowledged.toast'))
      firingsQuery.refetch()
    } catch {
      toast.error(t('rb.alert.feed.acknowledge.failed'))
    } finally {
      setAcking((current) => ({ ...current, [firing.id]: false }))
    }
  }

  const columns: Array<DataColumn<AlertFiring>> = [
    {
      id: 'firedAt',
      emphasis: 'primary',
      header: t('rb.alert.feed.col.firedAt'),
      minWidth: 170,
      dataType: 'date',
      filter: { kind: 'date-range', field: 'date', label: t('rb.alert.history.col.firedAt') },
      cell: (firing) => <bdi>{formatDate(firing.firedAt, { style: 'day-month-time', language })}</bdi>,
    },
    {
      id: 'rule',
      header: t('rb.alert.feed.col.rule'),
      minWidth: 200,
      dataType: 'text',
      filter: {
        kind: 'select',
        field: 'ruleId',
        label: t('rb.alert.feed.filter.rule'),
        options: rules.map((rule) => ({ value: rule.id, label: rule.name })),
      },
      cell: (firing) => (
        <span {...isolatedRunProps({ className: 'block min-w-0 truncate' }).box}>
          <bdi {...isolatedRunProps().run}>{rulesById.get(firing.ruleId)?.name ?? firing.ruleId}</bdi>
        </span>
      ),
    },
    {
      id: 'value',
      emphasis: 'data',
      header: t('rb.alert.feed.col.value'),
      width: 170,
      align: 'end',
      dataType: 'number',
      cell: (firing) => {
        const rule = rulesById.get(firing.ruleId)
        const unit = rule?.thresholdUnit ?? 'count'
        return (
          <span className="tabular-nums">
            {formatMetricValue(firing.value, unit, language)}
            {firing.band ? (
              <span className="text-muted-foreground">
                {' '}
                ({formatMetricValue(firing.band.low, unit, language)} – {formatMetricValue(firing.band.high, unit, language)})
              </span>
            ) : (
              <span className="text-muted-foreground"> / {formatMetricValue(firing.threshold, unit, language)}</span>
            )}
          </span>
        )
      },
    },
    {
      id: 'bucket',
      header: t('rb.alert.feed.col.bucket'),
      width: 120,
      dataType: 'date',
      cell: (firing) => <bdi>{formatDate(firing.bucketStart, { style: 'day-month', language })}</bdi>,
    },
    {
      id: 'severity',
      header: t('rb.alert.feed.col.severity'),
      width: 100,
      dataType: 'enum',
      filter: {
        kind: 'select',
        field: 'severity',
        label: t('rb.alert.feed.filter.severity'),
        options: [
          { value: 'high', label: t('rb.alert.severity.high') },
          { value: 'critical', label: t('rb.alert.severity.critical') },
        ],
      },
      cell: (firing) => {
        const rule = rulesById.get(firing.ruleId)
        const severity = rule ? alertSeverity(rule) : 'high'
        return <StatusBadge tone="neutral">{t(`rb.alert.severity.${severity}`)}</StatusBadge>
      },
    },
    {
      id: 'acknowledged',
      header: t('rb.alert.feed.col.acknowledged'),
      width: 190,
      dataType: 'text',
      filter: {
        kind: 'boolean',
        field: 'acknowledged',
        label: t('rb.alert.feed.filter.acknowledged'),
        trueLabel: t('rb.alert.feed.filter.acknowledged.yes'),
        falseLabel: t('rb.alert.feed.filter.acknowledged.no'),
      },
      cell: (firing) =>
        firing.acknowledgedAt ? (
          <bdi>
            {t('rb.alert.feed.acknowledged.by', {
              who: firing.acknowledgedBy ?? '',
              time: formatDate(firing.acknowledgedAt, { style: 'day-month-time', language }),
            })}
          </bdi>
        ) : null,
    },
    {
      id: 'deliveries',
      header: t('rb.alert.feed.col.deliveries'),
      width: 180,
      dataType: 'text',
      /* AC-1237 — the failed channel names itself and its error in `title`;
         the firing row is otherwise ordinary (no tone, no destructive ink). */
      cell: (firing) => (
        <span className="flex flex-wrap items-center gap-2 text-xs">
          {alertDeliveries(firing).map((delivery, index) => (
            <span
              key={index}
              title={
                delivery.status === 'failed'
                  ? t('rb.alert.history.delivery.failed', { channel: delivery.channelType }).concat(
                      delivery.error ? `: ${delivery.error}` : '',
                    )
                  : t('rb.alert.history.delivery.sent', { channel: delivery.channelType })
              }
              className="text-muted-foreground"
            >
              {delivery.channelType} {delivery.status === 'sent' ? '✓' : '✗'}
            </span>
          ))}
        </span>
      ),
    },
    {
      id: 'actions',
      header: t('rb.alert.feed.col.actions'),
      width: 180,
      dataType: 'text',
      cell: (firing) => (
        <span className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="xs"
            disabled={firing.acknowledgedAt !== null && firing.acknowledgedAt !== undefined ? true : (acking[firing.id] ?? false)}
            onClick={() => void acknowledge(firing)}
          >
            {t('rb.alert.feed.acknowledge')}
          </Button>
          {/* A real `<a>` — it navigates the analyst composer, it does not
             mutate (rule 6). The analyst's own `Attach` mechanism (§5.1, a
             separate work package) is what consumes `?firingId=` once built. */}
          <Link
            to={`/management/reports?view=analyst&firingId=${firing.id}`}
            className="text-xs text-info-foreground underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('rb.alert.feed.explain')}
          </Link>
        </span>
      ),
    },
  ]

  if (status === 'empty' && !hasActiveFilter) {
    if (rules.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 rounded-card border border-border px-3 py-12 text-center">
          <NoFiringsIllustration />
          <p className="text-sm font-semibold text-foreground">{t('rb.alert.feed.firstRun.heading')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('rb.alert.feed.firstRun.body')}</p>
        </div>
      )
    }
    return <p className="py-12 text-center text-sm text-muted-foreground">{t('rb.alert.feed.empty')}</p>
  }

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(firing) => firing.id}
      status={status}
      total={rows.length}
      t={t}
      language={language}
      tableId="management-reports-alerts-feed"
      searchPlaceholder={t('rb.alert.feed.search')}
      skeletonPattern="P1"
      emptyKind="no-match"
      firstRun={{ heading: t('rb.alert.feed.empty'), body: t('rb.alert.feed.empty'), actions: [] }}
      noMatch={{
        message: t('rb.alert.feed.noMatch'),
        action: { label: t('rb.alert.feed.noMatch.action'), onClick: table.clearAll },
      }}
      error={{ message: t('rb.alert.feed.error'), onRetry: firingsQuery.refetch }}
    />
  )
}
