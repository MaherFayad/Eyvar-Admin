/**
 * The saved-report picker, re-homed as an inline panel inside a block's own
 * frame (§5) — `AddContentDialog`'s list, without the dialog chrome, per the
 * owner's standing no-dialog ruling. Search, already-placed reports disabled
 * with a reason (AC-1204), `New report` opens the builder with `?pinTo=`.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useAsync } from '@/hooks'
import { listReports } from '@/data/clients'
import { isolatedRunProps } from '@/lib'
import { collectReportIds } from './blockOps'
import { usePageBlocks } from './PageBlocksContext'
import { ulid } from '@/lib/ids'
import type { Block, MetricBlockFormat, ReportBlockHeight, ReportBlockView } from '@/data/types/page'

export interface ReportPickerPanelProps {
  kind: 'report' | 'metric'
  onPick: (block: Block) => void
  onCancel: () => void
}

export function ReportPickerPanel({ kind, onPick, onCancel }: ReportPickerPanelProps) {
  const { pageId, blocks, t } = usePageBlocks()
  const [query, setQuery] = useState('')
  const placed = new Set(collectReportIds(blocks))

  const reports = useAsync((signal) => listReports({ pageSize: 100, q: query }, signal), {
    deps: [query],
    cacheKey: 'reports.list',
    isEmpty: (page) => page.items.length === 0,
  })

  const pick = (reportId: string) => {
    const id = ulid()
    if (kind === 'report') {
      onPick({ id, type: 'report', reportId, view: 'chart' as ReportBlockView, height: 'M' as ReportBlockHeight, title: null })
    } else {
      onPick({ id, type: 'metric', reportId, seriesId: null, format: 'value' as MetricBlockFormat })
    }
  }

  return (
    <Card
      onKeyDown={(event) => {
        // S1 — a plain Card, not a Radix popover, so Escape is not wired by default (a11y.md).
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
    >
      <CardContent className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        <Input
          autoFocus
          value={query}
          placeholder={t('rb.dashboards.search')}
          onChange={(event) => setQuery(event.target.value)}
        />
        {reports.status === 'loading' ? (
          <LoadingSkeleton pattern="P1" rows={3} label={t('rb.dashboard.add.loading')} />
        ) : reports.status === 'error' ? (
          <ErrorState scope="card" card={false} message={t('rb.dashboard.add.error')} action={{ label: t('rb.library.error.retry'), onClick: reports.refetch }} />
        ) : reports.status === 'empty' ? (
          <p className="text-sm text-muted-foreground">{t('rb.dashboard.add.empty')}</p>
        ) : (
          <ul className="flex list-none flex-col gap-1">
            {(reports.data?.items ?? []).map((report) => {
              const already = placed.has(report.id)
              return (
                <li key={report.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start"
                    disabled={already}
                    aria-describedby={already ? `pg-picker-already-${report.id}` : undefined}
                    onClick={() => pick(report.id)}
                  >
                    <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
                      <bdi {...isolatedRunProps().run}>{report.name}</bdi>
                    </span>
                  </Button>
                  {already && (
                    <p id={`pg-picker-already-${report.id}`} className="text-xs text-muted-foreground">
                      {t('rb.dashboard.add.already')}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
            {t('pg.picker.cancel')}
          </Button>
          <Button type="button" variant="link" size="xs" asChild>
            <Link to={`/management/reports?q=&pinTo=${pageId}`}>{t('rb.dashboard.addContent.new')}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
