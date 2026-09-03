/**
 * **What this rule has actually done** — `alerts.history`, rendered at last.
 *
 * `AlertFiring` was fully modelled (`types/report.ts`), seeded with two rows
 * including the deliberate `notificationId: null` case, and served by
 * `listAlertFirings` — which had **zero callers**. So an operator could not see
 * that `ALR-1` fired twice, and could not see that one of those two firings is
 * no longer in the notification centre. The whole resource was invisible.
 *
 * ## It is a LEDGER, and that is not a styling choice
 *
 * §8.3: a firing is append-only. It cannot be edited, re-ordered, re-sent or
 * un-fired, and nothing about it is selectable in bulk.
 * `useIndexTable({ mode: 'ledger' })` returns a `LedgerTable` with no `sort`,
 * no `setSortField`, no `selectedIds` and no `toggleRow` **at all**, so a sort
 * control or a checkbox here is a compile error rather than a review comment.
 * No `rowActions` are declared, for the same reason: there is no act to perform
 * on a past crossing.
 *
 * Order is the client's — newest first (`alerts.ts`) — and it is posting order,
 * not a sort the operator chose.
 *
 * ## `notificationId === null` is a state, not a failure
 *
 * It means the notification this firing produced has since been cleared from
 * the centre. The firing still happened; the value still crossed the line. So
 * both readings are plain factual words in ordinary ink — no badge, no tone, no
 * `warning`, and nothing that would read as *this one went wrong*. R7 puts a
 * terminal factual outcome in neutral and neither of these is even an outcome.
 *
 * Rules applied
 *   §8.3        ledger mode: append-only, no sort, no row actions, no selection.
 *   §5.4        the four states, in order, all four present — the empty is the
 *               ledger's `no-match` because `DataTable` collapses a ledger's
 *               first-run into it (*"a ledger is NEVER first-run empty"*).
 *   R7          no tone is spent on either notification reading.
 *   §9.2        a rule NAME is user content: never translated, `<bdi>`-isolated.
 *   §7.2        focus is the dialog's; nothing here kills an outline.
 */

import { useMemo } from 'react'
import { DataTable } from '@/components/DataTable'
import type { DataColumn } from '@/components/table/columns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
/* Deep import, NOT the `@/components/metrics` barrel — the barrel pulls
   recharts, and no chart renders on this surface. Same reason `AlertsView`
   reaches past it. */
import { formatMetricValue } from '@/components/metrics/formatMetric'
import { useAsync, useIndexTable } from '@/hooks'
import { listAlertFirings } from '@/data/clients'
import type { AlertFiring, AlertRule } from '@/data/types'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'

export interface AlertHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` while no rule has been chosen — the dialog holds nothing and fetches nothing. */
  rule: AlertRule | null
  t: Translator
  language: Language
}

/**
 * Every firing this rule has produced. Fetched whole and narrowed here, the way
 * `LedgerCard` narrows a posting list: the toolbar's search field is
 * unconditional in `DataTable`, so it is **wired** rather than left to look
 * operable and do nothing.
 */
export function AlertHistoryDialog({
  open,
  onOpenChange,
  rule,
  t,
  language,
}: AlertHistoryDialogProps) {
  const table = useIndexTable({ mode: 'ledger' })

  const history = useAsync<readonly AlertFiring[]>(
    async (signal) => {
      if (rule === null) return []
      /* Whole, not paged: the narrowing below is client-side, and a page of
         rows the search cannot see is a search that lies about its result. */
      return (await listAlertFirings(rule.id, { pageSize: 200 }, signal)).items
    },
    {
      /* The rule id is the only input. Deliberately NOT cached: `alerts.history`
         is one operation id serving one rule at a time, and a cache key with no
         rule in it would hand the second rule the first rule's firings. */
      deps: [rule?.id ?? null, open],
      isEmpty: (rows) => rows.length === 0,
      enabled: open && rule !== null,
    },
  )

  const needle = table.params.q?.trim().toLowerCase() ?? ''
  const rows = useMemo(() => {
    const all = history.data ?? []
    if (needle === '') return all
    /* The bucket the firing read, and the firing's own id. Both are things an
       operator can type; neither is a translated string, so this narrows the
       same way in both languages. */
    return all.filter(
      (firing) =>
        firing.bucketStart.toLowerCase().includes(needle) ||
        firing.id.toLowerCase().includes(needle),
    )
  }, [history.data, needle])

  const status = history.status === 'content' && rows.length === 0 ? 'empty' : history.status

  const columns: Array<DataColumn<AlertFiring>> = [
    {
      id: 'firedAt',
      emphasis: 'primary',
      header: t('rb.alert.history.col.firedAt'),
      minWidth: 180,
      dataType: 'date',
      cell: (firing) => (
        <bdi>{formatDate(firing.firedAt, { style: 'day-month-time', language })}</bdi>
      ),
    },
    {
      id: 'bucket',
      header: t('rb.alert.history.col.bucket'),
      width: 140,
      dataType: 'date',
      cell: (firing) => (
        <bdi>{formatDate(firing.bucketStart, { style: 'day-month', language })}</bdi>
      ),
    },
    {
      id: 'value',
      emphasis: 'data',
      header: t('rb.alert.history.col.value'),
      width: 130,
      align: 'end',
      dataType: 'number',
      /* The unit comes off the RULE, never off the firing: `AlertFiring.value`
         is a bare number in the series' wire unit, and money on the wire is
         halalas. Formatting it as a count would be off by a factor of a
         hundred in the direction nobody notices. */
      cell: (firing) => (
        <span className="tabular-nums">
          {formatMetricValue(firing.value, rule?.thresholdUnit ?? 'count', language)}
        </span>
      ),
    },
    {
      id: 'threshold',
      header: t('rb.alert.history.col.threshold'),
      width: 130,
      align: 'end',
      dataType: 'number',
      /* The threshold **as it was when the rule fired**, from the firing and not
         from the rule: editing a rule's threshold must not rewrite what a past
         crossing was measured against. */
      cell: (firing) => (
        <span className="tabular-nums">
          {formatMetricValue(firing.threshold, rule?.thresholdUnit ?? 'count', language)}
        </span>
      ),
    },
    {
      id: 'notification',
      header: t('rb.alert.history.col.notification'),
      width: 240,
      dataType: 'text',
      /* Two ordinary sentences in ordinary ink. `null` is *cleared*, which is a
         normal end for a notification and not a fault — a badge, a tone or a
         muted grey would all read as the second thing. */
      cell: (firing) => (
        <span>
          {firing.notificationId === null
            ? t('rb.alert.history.notification.cleared')
            : t('rb.alert.history.notification.present')}
        </span>
      ),
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {/* The rule's NAME is user content — never translated, and it must
                render right-to-left inside an English UI (AC-898). */}
            <span {...isolatedRunProps({ className: 'min-w-0' }).box}>
              <bdi {...isolatedRunProps().run}>
                {t('rb.alert.history.title', { name: rule?.name ?? '' })}
              </bdi>
            </span>
          </DialogTitle>
          {/* §8.3 in one sentence, said rather than merely enforced: the
              operator is told the list is append-only instead of inferring it
              from the absence of every control they expected. */}
          <DialogDescription>{t('rb.alert.history.description')}</DialogDescription>
        </DialogHeader>

        <DataTable
          table={table}
          rows={rows}
          columns={columns}
          getRowId={(firing) => firing.id}
          status={status}
          total={rows.length}
          t={t}
          language={language}
          tableId="management-reports-alert-history"
          searchPlaceholder={t('rb.alert.history.search')}
          skeletonPattern="P1"
          /* Unreachable by construction and supplied anyway, because the prop is
             required: `DataTable` collapses a LEDGER's unfiltered zero into
             `no-match` (*"a ledger is NEVER first-run empty"*, §9.2). The
             sentence an operator actually reads is `noMatch.message` below. */
          firstRun={{
            heading: t('rb.alert.history.empty'),
            body: t('rb.alert.history.empty'),
            actions: [],
          }}
          /* Both empties, told apart by the call site — the component cannot.
             *This rule has not fired* and *your search matched none of its
             firings* are different facts, and the second one has a way back. */
          noMatch={
            needle === ''
              ? { message: t('rb.alert.history.empty') }
              : {
                  message: t('rb.alert.history.noMatch'),
                  action: {
                    label: t('rb.alert.history.noMatch.action'),
                    onClick: table.clearAll,
                  },
                }
          }
          error={{ message: t('rb.alert.history.error'), onRetry: history.refetch }}
        />

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t('rb.alert.history.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
