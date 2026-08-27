/**
 * Financials › Cash & Captain Debt — spec §5 row 4, §6.5, **AC-372–381**.
 *
 * ## Two patterns on one route, and they are not one hybrid
 *
 * The reconciliation queue is a **§8.4 work queue**: it has a claim, a closed
 * set of two dispositions, and rows that convert in place. The captain debt
 * ledger is a **§8.3 ledger**: no selection, no sort, no row actions.
 * Foundation §3.4 already says so, and the two rule sets do not mix — they are
 * two views on one route, never one table with two moods.
 *
 * ## AC-453 — the SLA, and why the passing state is an absence
 *
 * **No cash report carries an SLA, and rendering one is the failure.** Every
 * report has `slaSource: 'unset'` with every clock field null, because no
 * cash-review window exists anywhere: legacy enforces none, and a cash report
 * carries no reason code, so `rcTargets` (`:14730`) has nothing to look up.
 *
 * So this queue renders **no countdown, no due time, no overdue pill, no
 * breach banner and no `Show only breached` control**, and offers **no breach
 * facet**. There is no `SlaCell`, no `SlaCountdown` and no `BreachBanner`
 * imported into this file, and that is deliberate: *a fixture, response or
 * component that supplies any of these fails AC-453 — including one that
 * supplies a plausible number.*
 *
 * **If you can render a countdown here, you have broken the criterion.** When
 * the business supplies a window (**Q-F9**), AC-453 is *replaced* rather than
 * satisfied, and replacing it is a visible edit somebody signs.
 *
 * Rules applied
 *   §4.2 / AC-375, AC-376
 *              **opening never claims.** The owner chip is a separate control
 *              in a separate cell, and rendering the queue writes no audit
 *              entry and mutates no ownership record.
 *   AC-374     a closed set of **exactly two** dispositions, both disabled in
 *              place with the owner named when another operator holds the row.
 *   AC-377     a decided report **converts in place** — it stays in the list
 *              showing its disposition, its decider and the time.
 *   R5a / AC-378
 *              an escalated report takes the row marker and a page banner with
 *              a count. It is not a red badge.
 *   AC-372     `reportedHalalas: null` renders `Never reported` in words and
 *              its deviation renders an em dash. Never `0.00 SAR`.
 *   AC-379     a repayment accepts a **partial** amount and leaves the rest
 *              visible. `commitCashRepayment` sets the debt to zero by
 *              assignment and calls it a feature (`:12197`, **D-F5**).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  cashDebtCapHalalas,
  claimCashReport,
  decideCashReport,
  getCaptainDebtLedger,
  listCaptainDebts,
  listCashReports,
  recordCashRepayment,
  releaseCashReport,
} from '@/data/clients'
import type {
  CaptainDebt,
  CashReport,
  Ledger,
  LedgerPosting,
  Paginated,
  SubTabRoute,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, formatMoney } from '@/lib'
import type { BannerModel } from '@/components/Banner'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { MoneyCell } from '@/components/Money'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { DecisionBadge, OwnerChip, useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { ConfirmMoneyDialog, type MoneyConfirmRequest } from '../shared/ConfirmMoneyDialog'
import { FinancialsPage, periodLabel, usePeriod, useWriteGate } from '../shared/FinancialsPage'
import { LedgerCard } from '../shared/LedgerCard'
import { useMoneyActions } from '../shared/actions'
import { deviationHalalas } from '../shared/derive'
import { useScreenViews, type ScreenView } from '../shared/views'

const VIEWS: readonly ScreenView[] = [
  { id: 'reconciliation-queue', titleKey: 'fin.cash.view.queue' },
  { id: 'captain-debt-ledger', titleKey: 'fin.cash.view.ledger' },
  { id: 'over-cap', titleKey: 'fin.cash.view.overCap' },
]

/**
 * §5 — the queue is the default, and that is **not** the index-table doctrine
 * of "`All` is always default". A queue describes work owed; a default that
 * includes decided rows buries it. Same departure §4.6 Q-32 records for wave 2.
 */
const DEFAULT_VIEW = 'reconciliation-queue'

export function CashScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const { period } = usePeriod()
  const { tabs, activeTab, selectTab } = useScreenViews(VIEWS, DEFAULT_VIEW, t)
  const gate = useWriteGate(row, t)
  const location = useLocation()
  const navigate = useNavigate()

  const captainId = new URLSearchParams(location.search).get('captain')
  const openCaptain = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(location.search)
      if (id === null) next.delete('captain')
      else next.set('captain', id)
      navigate({ pathname: location.pathname, search: `?${next.toString()}` })
    },
    [navigate, location.pathname, location.search],
  )

  const [escalatedCount, setEscalatedCount] = useState(0)

  /* **AC-378** — one banner, one count, and it is the only banner this sub-tab
     raises. **There is no breach banner**, because there is no breach (AC-453). */
  const banners = useMemo<BannerModel[]>(() => {
    if (escalatedCount === 0 || activeTab !== 'reconciliation-queue') return []
    return [
      {
        id: 'fin.cash.escalated',
        tone: 'critical',
        title:
          escalatedCount === 1
            ? t('fin.cash.escalated.title')
            : t('fin.cash.escalated.titleMany', {
                count: formatCount(escalatedCount, language),
              }),
        body: t('fin.cash.escalated.body'),
      },
    ]
  }, [escalatedCount, activeTab, t, language])

  return (
    <FinancialsPage
      row={row}
      meta={periodLabel(period, t, language)}
      banners={banners}
      t={t}
      dir={dir}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {captainId !== null ? (
          <CaptainDebtLedger captainId={captainId} onBack={() => openCaptain(null)} />
        ) : activeTab === 'reconciliation-queue' ? (
          <ReconciliationQueue
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={selectTab}
            gate={gate}
            onEscalatedCount={setEscalatedCount}
          />
        ) : (
          <CaptainDebtIndex
            key={activeTab}
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={selectTab}
            gate={gate}
            onOpenLedger={openCaptain}
          />
        )}
      </div>
    </FinancialsPage>
  )
}

interface ViewProps {
  tabs: readonly { id: string; label: string }[]
  activeTab: string
  onSelectTab: (id: string) => void
  gate: { canWrite: boolean; reason: string }
}

/* ────────────────────── the reconciliation queue (§8.4) ─────────────────── */

function ReconciliationQueue({
  tabs,
  activeTab,
  onSelectTab,
  gate,
  onEscalatedCount,
}: ViewProps & { onEscalatedCount: (count: number) => void }) {
  const shell = useShell()
  const { t, language } = shell.language
  const now = useNowIso()
  const currentUserId = shell.session?.userId ?? ''
  const table = useIndexTable<CashReport>({ mode: 'queue', getRowId: (report) => report.id })
  const actions = useMoneyActions<CashReport>({ keyOf: (report) => report.id })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const reports = useAsync<Paginated<CashReport>>(
    (signal) => listCashReports({ view: activeTab, ...table.params }, signal),
    { deps: [activeTab, table.params] },
  )

  const rows = useMemo(() => actions.apply(reports.data?.items ?? []), [actions, reports.data])

  const escalated = useAsync<Paginated<CashReport>>(
    (signal) => listCashReports({ view: 'escalated', pageSize: 1 }, signal),
    { deps: [] },
  )
  const escalatedTotal = escalated.data?.total ?? 0
  useEffect(() => {
    onEscalatedCount(escalatedTotal)
    return () => onEscalatedCount(0)
  }, [escalatedTotal, onEscalatedCount])

  const decide = useCallback(
    (report: CashReport, disposition: 'resolve' | 'escalate') => {
      setRequest({
        title:
          disposition === 'resolve'
            ? t('fin.cash.resolve.title', { report: report.id })
            : t('fin.cash.escalate.title', { report: report.id }),
        body:
          disposition === 'resolve' ? t('fin.cash.resolve.body') : t('fin.cash.escalate.body'),
        confirmLabel:
          disposition === 'resolve'
            ? t('fin.cash.resolve.confirm')
            : t('fin.cash.escalate.confirm'),
        lines: [
          { label: t('fin.cash.col.debtAdded'), amountHalalas: report.debtAddedHalalas },
        ],
        reason: {
          label: t('fin.cash.reason.label'),
          help: t('fin.cash.reason.help'),
          message: t('fin.cash.reason.message'),
        },
        onConfirm: ({ reason }) => {
          void actions
            .run({
              key: report.id,
              errorMessage: t('fin.error.row'),
              toastMessage:
                disposition === 'resolve'
                  ? t('fin.cash.toast.resolved')
                  : t('fin.cash.toast.escalated'),
              action: () => decideCashReport(report.id, disposition, reason),
            })
            .then(() => setRequest(null))
        },
      })
    },
    [actions, t],
  )

  const columns = useMemo<DataColumn<CashReport>[]>(
    () => [
      {
        id: 'id',
        header: t('fin.cash.col.id'),
        dataType: 'id',
        minWidth: 170,
        sortField: 'id',
        cell: (report) => (
          <span className="relative block font-medium tabular-nums">
            {/* R5a use #3 — escalated, in the leading edge. Never a red badge. */}
            {report.status === 'escalated' && <RowCriticalMarker />}
            <bdi>{report.id}</bdi>
          </span>
        ),
        secondaryLine: (report) =>
          report.repeatCount >= 2
            ? t('fin.cash.repeat', { count: formatCount(report.repeatCount, language) })
            : formatDate(report.reportedAt, { style: 'day-month-time', language }),
      },
      {
        id: 'captain',
        header: t('fin.cash.col.captain'),
        dataType: 'text',
        width: 168,
        sortField: 'captainName',
        cell: (report) => <span className="truncate">{report.captainName}</span>,
        secondaryLine: (report) =>
          report.riderConfirmed ? t('fin.cash.riderConfirmed') : t('fin.cash.riderUnconfirmed'),
      },
      {
        id: 'expected',
        header: t('fin.cash.col.expected'),
        dataType: 'money',
        align: 'end',
        width: 124,
        sortField: 'expectedFareHalalas',
        cell: (report) => <MoneyCell amount={report.expectedFareHalalas} />,
      },
      {
        id: 'reported',
        header: t('fin.cash.col.reported'),
        dataType: 'money',
        align: 'end',
        width: 132,
        /* **AC-372** — never reported is a STATE, in words, not a zero. */
        cell: (report) =>
          report.reportedHalalas === null ? (
            <span className="block text-end text-foreground">{t('fin.cash.neverReported')}</span>
          ) : (
            <MoneyCell amount={report.reportedHalalas} />
          ),
      },
      {
        id: 'deviation',
        header: t('fin.cash.col.deviation'),
        dataType: 'money',
        align: 'end',
        width: 124,
        /* **AC-373** — `reported − topup − expected`, derived, with its sign;
           `null` when there is nothing to compute from (**AC-372**). */
        cell: (report) => <MoneyCell amount={deviationHalalas(report)} />,
      },
      {
        id: 'classification',
        header: t('fin.cash.col.classification'),
        dataType: 'enum',
        width: 148,
        cell: (report) => (
          <StatusBadge tone={report.classification === 'match' ? 'success' : 'warning'}>
            {t(`fin.cash.class.${report.classification}`)}
          </StatusBadge>
        ),
        filter: {
          kind: 'select',
          field: 'classification',
          options: (['match', 'over_report', 'under_report', 'no_report'] as const).map(
            (value) => ({ value, label: t(`fin.cash.class.${value}`) }),
          ),
        },
      },
      {
        id: 'owner',
        header: t('queue.col.owner'),
        dataType: 'enum',
        width: 184,
        /* §4.2 — the owner chip has three states: unclaimed, `You`, and another
           operator named. **Opening a report does not claim it** (AC-375). */
        cell: (report) =>
          report.status === 'pending' ? (
            <OwnerChip
              claim={report.claim}
              currentUserId={currentUserId}
              now={now}
              t={t}
              canWrite={gate.canWrite}
              disabledReason={gate.reason}
              onClaim={() => {
                void actions.run({
                  key: report.id,
                  errorMessage: t('fin.error.row'),
                  toastMessage: t('queue.toast.claimed'),
                  action: () => claimCashReport(report.id),
                })
              }}
              onRelease={() => {
                void actions.run({
                  key: report.id,
                  errorMessage: t('fin.error.row'),
                  toastMessage: t('queue.toast.released'),
                  action: () => releaseCashReport(report.id),
                })
              }}
              onTakeOver={() => {
                void actions.run({
                  key: report.id,
                  errorMessage: t('fin.error.row'),
                  toastMessage: t('queue.toast.takenOver'),
                  action: () => claimCashReport(report.id, { takeOver: true }),
                })
              }}
            />
          ) : null,
        filter: {
          kind: 'boolean',
          field: 'unclaimed',
          trueLabel: t('queue.owner.unclaimed'),
          falseLabel: t('queue.owner.heldBy', { name: '' }),
        },
      },
      {
        id: 'decision',
        header: t('queue.col.decision'),
        dataType: 'enum',
        width: 190,
        cell: (report) => {
          const failure = actions.failure(report.id)
          if (failure) {
            return (
              <ErrorState
                scope="row"
                message={failure.message}
                action={{ label: t('fin.error.retry'), onClick: failure.retry }}
              />
            )
          }

          /* **AC-377** — decided rows convert in place, naming the disposition,
             the decider and the time. Nothing disappears on click. */
          if (report.status !== 'pending') {
            return (
              <DecisionBadge
                outcome={
                  report.status === 'resolved'
                    ? t('fin.cash.action.resolve')
                    : t('fin.cash.action.escalate')
                }
                meta={
                  report.resolvedAt === null
                    ? null
                    : t('fin.cash.decided', {
                        actor: report.resolvedByUserName ?? '',
                        date: formatDate(report.resolvedAt, {
                          style: 'day-month-time',
                          language,
                        }),
                      })
                }
                reason={report.resolutionReasonCode}
                /* **AC-453** — there is no late state to render, because there
                   is no deadline to be late against. Not `false` by accident:
                   `slaBreachedAt` is null on every cash report by criterion. */
                late={false}
                lateLabel=""
              />
            )
          }

          /* **AC-374** — a closed set of EXACTLY two, both neutral, both
             requiring a reason, both **disabled in place** with the owner named
             when another operator holds the row. R3: no filled primary in a
             row. */
          const heldByOther =
            report.claim?.state === 'claimed' && report.claim.ownerId !== currentUserId
          const blocked = !gate.canWrite || heldByOther
          const reason = heldByOther
            ? t('queue.owner.heldBy', { name: report.claim?.ownerName ?? '' })
            : gate.reason

          return (
            <span className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => decide(report, 'resolve')}
                disabled={blocked}
                title={blocked ? reason : undefined}
              >
                {t('fin.cash.action.resolve')}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => decide(report, 'escalate')}
                disabled={blocked}
                title={blocked ? reason : undefined}
              >
                {t('fin.cash.action.escalate')}
              </Button>
            </span>
          )
        },
      },
    ],
    [t, language, now, currentUserId, gate, actions, decide],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(report) => report.id}
        status={reports.status}
        total={reports.data?.total ?? 0}
        t={t}
        language={language}
        tableId="financials-cash-queue"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.cash.search')}
        skeletonPattern="P8"
        /* §4.7 **E1** — a queue worked to zero is `cleared`, never the
           illustrated first-run state that tells an operator who just cleared
           their queue that they have never had one. */
        emptyKind="cleared"
        cleared={{ heading: t('fin.cash.empty.heading'), body: t('fin.cash.empty.body') }}
        firstRun={{
          heading: t('fin.cash.empty.heading'),
          body: t('fin.cash.empty.body'),
          actions: [
            { label: t('fin.debt.action.ledger'), onClick: () => onSelectTab('captain-debt-ledger') },
          ],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: reports.refetch }}
      />
      <ConfirmMoneyDialog
        request={request}
        onClose={() => setRequest(null)}
        busy={actions.busy}
        t={t}
      />
    </>
  )
}

/* ───────────────────────── the captain debt index ──────────────────────── */

function CaptainDebtIndex({
  tabs,
  activeTab,
  onSelectTab,
  gate,
  onOpenLedger,
}: ViewProps & { onOpenLedger: (id: string) => void }) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<CaptainDebt>({ mode: 'queue', getRowId: (debt) => debt.captainId })
  const actions = useMoneyActions<CaptainDebt>({ keyOf: (debt) => debt.captainId })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const debts = useAsync<Paginated<CaptainDebt>>(
    (signal) => listCaptainDebts({ view: activeTab, ...table.params }, signal),
    { deps: [activeTab, table.params] },
  )

  const rows = useMemo(() => actions.apply(debts.data?.items ?? []), [actions, debts.data])

  /* **AC-381** — the total includes every captain with a non-zero receivable,
     **in both directions**. A captain in credit is not silently dropped, which
     is why this is a signed sum and the Overview tile is the positive-only one. */
  const total = useMemo(() => rows.reduce((sum, debt) => sum + debt.balanceHalalas, 0), [rows])

  const columns = useMemo<DataColumn<CaptainDebt>[]>(
    () => [
      {
        id: 'captain',
        header: t('fin.debt.col.captain'),
        dataType: 'text',
        minWidth: 200,
        sortField: 'captainName',
        cell: (debt) => (
          <span className="relative block font-medium">
            {/* **AC-380** — over the cap, from the same source value the 360°
                profile reads. R5a's leading edge, and the words below. */}
            {debt.balanceHalalas >= debt.capHalalas && <RowCriticalMarker />}
            {debt.captainName}
          </span>
        ),
        secondaryLine: (debt) => {
          const failure = actions.failure(debt.captainId)
          if (failure) {
            return (
              <ErrorState
                scope="row"
                message={failure.message}
                action={{ label: t('fin.error.retry'), onClick: failure.retry }}
              />
            )
          }
          if (debt.balanceHalalas >= debt.capHalalas) return t('fin.debt.suspended')
          if (debt.balanceHalalas < 0) return t('fin.debt.inCredit')
          return debt.captainId
        },
      },
      {
        id: 'balance',
        header: t('fin.debt.col.balance'),
        dataType: 'money',
        align: 'end',
        width: 140,
        sortField: 'balanceHalalas',
        cell: (debt) => <MoneyCell amount={debt.balanceHalalas} />,
      },
      {
        id: 'cap',
        header: t('fin.debt.col.cap'),
        dataType: 'money',
        align: 'end',
        width: 132,
        /* Server policy, per Admin › Operational Policy — **not** the client
           constant `CASH_DEBT_CAP = -300` (`:12080`), and not negated. */
        cell: (debt) => <MoneyCell amount={debt.capHalalas} />,
      },
      {
        id: 'openReports',
        header: t('fin.debt.col.openReports'),
        dataType: 'number',
        align: 'end',
        width: 132,
        sortField: 'openReportCount',
        cell: (debt) => (
          <span className="tabular-nums">{formatCount(debt.openReportCount, language)}</span>
        ),
      },
      {
        id: 'lastReport',
        header: t('fin.debt.col.lastReport'),
        dataType: 'date',
        width: 148,
        sortField: 'lastReportAt',
        cell: (debt) => (
          <span className="tabular-nums">
            {debt.lastReportAt === null
              ? ''
              : formatDate(debt.lastReportAt, { style: 'day-month', language })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('queue.col.actions'),
        dataType: 'enum',
        width: 210,
        /* **R4-6's D8 reading, applied here**: two actions render as two
           labelled controls, visible at rest and reachable by keyboard, rather
           than behind a kebab. They live in a declared column because
           `DataTable`'s `rowActions` collapses two into a menu. */
        cell: (debt) => (
          <span className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="xs"
              disabled={!gate.canWrite || debt.balanceHalalas <= 0}
              title={!gate.canWrite ? gate.reason : undefined}
              onClick={() =>
                setRequest({
                  title: t('fin.debt.repay.title', { captain: debt.captainName }),
                  body: t('fin.debt.repay.body', {
                    captain: debt.captainName,
                    balance: formatMoney(debt.balanceHalalas),
                  }),
                  confirmLabel: t('fin.debt.repay.confirm'),
                  lines: [
                    { label: t('fin.debt.col.balance'), amountHalalas: debt.balanceHalalas },
                  ],
                  /* **AC-379** — a PARTIAL amount, prefilled with the whole
                     balance and lowerable. It never sets the debt to zero by
                     assignment. */
                  amount: {
                    label: t('fin.debt.repay.amount.label'),
                    help: t('fin.debt.repay.amount.help', {
                      balance: formatMoney(debt.balanceHalalas),
                    }),
                    message: t('fin.debt.repay.amount.message', {
                      balance: formatMoney(debt.balanceHalalas),
                    }),
                    maxHalalas: debt.balanceHalalas,
                    initialHalalas: debt.balanceHalalas,
                  },
                  reason: {
                    label: t('fin.debt.repay.reason.label'),
                    help: t('fin.debt.repay.reason.help'),
                    message: t('fin.debt.repay.reason.message'),
                  },
                  onConfirm: ({ amountHalalas, reason }) => {
                    if (amountHalalas === null) return
                    void actions
                      .run({
                        key: debt.captainId,
                        errorMessage: t('fin.error.row'),
                        toastMessage: t('fin.debt.toast.repaid'),
                        action: () =>
                          recordCashRepayment(debt.captainId, amountHalalas, reason),
                      })
                      .then(() => setRequest(null))
                  },
                })
              }
            >
              {t('fin.debt.action.repay')}
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => onOpenLedger(debt.captainId)}
            >
              {t('fin.debt.action.ledger')}
            </Button>
          </span>
        ),
      },
    ],
    [t, language, gate, actions, onOpenLedger],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(debt) => debt.captainId}
        status={debts.status}
        total={debts.data?.total ?? 0}
        t={t}
        language={language}
        tableId="financials-captain-debt"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.debt.search')}
        skeletonPattern="P1"
        learnMore={
          debts.status === 'content' ? (
            <span className="text-sm text-muted-foreground">
              {t('fin.debt.total', {
                amount: formatMoney(total),
                count: formatCount(rows.length, language),
              })}
            </span>
          ) : undefined
        }
        firstRun={{
          heading: t('fin.debt.empty.heading'),
          body: t('fin.debt.empty.body'),
          actions: [
            {
              label: t('fin.debt.empty.action'),
              onClick: () => onSelectTab('reconciliation-queue'),
            },
          ],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: debts.refetch }}
      />
      <ConfirmMoneyDialog
        request={request}
        onClose={() => setRequest(null)}
        busy={actions.busy}
        t={t}
      />
    </>
  )
}

/* ─────────────────── a captain's receivable ledger (§7.2) ───────────────── */

function CaptainDebtLedger({ captainId, onBack }: { captainId: string; onBack: () => void }) {
  const shell = useShell()
  const { t, language } = shell.language
  const { period } = usePeriod()
  const table = useIndexTable({ mode: 'ledger' })

  const ledger = useAsync<Ledger>(
    (signal) => getCaptainDebtLedger(captainId, period, signal),
    { deps: [captainId, period.start, period.end], isEmpty: (data) => data.postings.length === 0 },
  )

  const rows = useMemo<LedgerPosting[]>(() => {
    const all = ledger.data?.postings ?? []
    const needle = table.params.q?.trim().toLowerCase() ?? ''
    if (needle === '') return all
    return all.filter(
      (posting) =>
        (posting.reference ?? posting.id).toLowerCase().includes(needle) ||
        t(posting.description.key, posting.description.params).toLowerCase().includes(needle),
    )
  }, [ledger.data, table.params.q, t])

  const status = ledger.status === 'content' && rows.length === 0 ? 'empty' : ledger.status

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="xs" onClick={onBack}>
          {t('fin.debt.empty.action')}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t('fin.debt.col.cap')} <MoneyCell amount={cashDebtCapHalalas()} />
        </span>
      </div>
      <LedgerCard
        table={table}
        ledger={ledger.data}
        status={status}
        rows={rows}
        t={t}
        language={language}
        tableId="financials-captain-debt-ledger"
        onRetry={ledger.refetch}
        hasHistory={(ledger.data?.lifetimePostings ?? 0) > 0}
        firstRun={{
          heading: t('fin.empty.firstRun.heading'),
          body: t('fin.empty.firstRun.body'),
          action: { label: t('fin.debt.empty.action'), onClick: onBack },
        }}
      />
    </div>
  )
}
