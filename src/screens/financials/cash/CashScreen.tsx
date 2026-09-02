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
 *   §9.3 / P4-T1
 *              the reconciliation queue carries a checkbox column and **one**
 *              bulk command, `Claim`. The captain debt index carries neither.
 *              See the two notes below.
 *
 * ## P4-T1 — where a bulk bar belongs on this route, and where it does not
 *
 * **The queue gets one, and it may only ever be `Claim`.** §9.3 lets a queue
 * carry a checkbox *"only if every bulk action offered is a claim or assign
 * action"*, and `design/00-shell.md` §9.3 says the other half outright:
 * ***"Bulk disposition must not ship."*** So `bulkClaim: true` is declared,
 * `Claim` is the whole set of bulk commands, and `Resolve` and `Escalate` stay
 * on the row where each can carry its own reason about its own report. A set of
 * nine reports sharing one resolution reason is the blanket justification
 * **AC-374**'s reason field exists to prevent.
 *
 * **The captain debt index gets none, and that is a decision, not an
 * omission.** The only act on it is `Record repayment`, and **AC-379** makes
 * that a *partial* amount prefilled with **that captain's** balance and
 * lowerable. There is no amount a set of captains shares: one figure applied to
 * nine different balances is either an over-payment on eight of them or the
 * assignment-to-zero D-F5 records. `View ledger` is navigation, which is never
 * bulk. So the table stays `mode: 'queue'` without `bulkClaim`, which is what
 * makes the checkbox column structurally absent rather than merely unused.
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
import { DataTable, type BulkAction, type DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { MoneyCell } from '@/components/Money'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { DecisionBadge, OwnerChip, useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { ConfirmMoneyDialog, type MoneyConfirmRequest } from '../shared/ConfirmMoneyDialog'
import { EntityName, useEntityLinks } from '../shared/entityLinks'
import { FinancialsPage, periodLabel, usePeriod, useWriteGate } from '../shared/FinancialsPage'
import { LedgerCard } from '../shared/LedgerCard'
import { useMoneyActions } from '../shared/actions'
import { bulkRefusal, claimWithheldFrom, deviationHalalas } from '../shared/derive'
import { bulkRefusalText } from '../shared/text'
import { useScreenViews, type ScreenView } from '../shared/views'

/**
 * §11.2 over a set, for the queue's one bulk command — **D21**.
 *
 * Permission first (**AC-962**): a role that cannot claim is refused on every
 * row, and naming a subset underneath that answers a question the operator did
 * not ask. Then the states, most terminal first.
 */
const CLAIM_REFUSAL_ORDER = [
  'fin.payout.blocked.permission',
  'fin.cash.blocked.decided',
  'fin.cash.blocked.heldByOther',
  'fin.cash.blocked.mine',
] as const

const CLAIM_REFUSAL_COPY = {
  'fin.payout.blocked.permission': 'fin.bulk.claim.permission',
  'fin.cash.blocked.decided': 'fin.bulk.claim.decided',
  'fin.cash.blocked.heldByOther': 'fin.bulk.claim.heldByOther',
  'fin.cash.blocked.mine': 'fin.bulk.claim.mine',
} as const

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
  /* **§9.3 / P4-T1** — `bulkClaim: true` is the literal the type system reads:
     without it the returned table has no `selectedIds` to bind a checkbox to.
     It is declared here because the ONE bulk command this queue offers is a
     claim, which is the only condition under which §9.3 permits the column. */
  const table = useIndexTable<CashReport>({
    mode: 'queue',
    getRowId: (report) => report.id,
    bulkClaim: true,
  })
  const actions = useMoneyActions<CashReport>({ keyOf: (report) => report.id })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const reports = useAsync<Paginated<CashReport>>(
    (signal) => listCashReports({ ...table.params, view: activeTab }, signal),
    { deps: [activeTab, table.params], cacheKey: 'cash.list' },
  )

  const rows = useMemo(() => actions.apply(reports.data?.items ?? []), [actions, reports.data])

  /* **P8-T1** — the captain the report is about. The report id is a document,
     not an entity, and the rider is not a column on this queue. */
  const hrefFor = useEntityLinks(useMemo(() => rows.map((report) => report.captainId), [rows]))

  const escalated = useAsync<Paginated<CashReport>>(
    (signal) => listCashReports({ view: 'escalated', pageSize: 1 }, signal),
    /* Constant query; `[]` cannot collide with the queue read's `[s:tab,{...}]`. */
    { deps: [], cacheKey: 'cash.list' },
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
        emphasis: 'primary',
        csv: (report) => report.id,
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
        cell: (report) => (
          <EntityName href={hrefFor(report.captainId)} name={report.captainName} t={t} />
        ),
        secondaryLine: (report) =>
          report.riderConfirmed ? t('fin.cash.riderConfirmed') : t('fin.cash.riderUnconfirmed'),
      },
      {
        id: 'expected',
        csv: (report) => report.expectedFareHalalas,
        header: t('fin.cash.col.expected'),
        dataType: 'money',
        align: 'end',
        width: 124,
        sortField: 'expectedFareHalalas',
        cell: (report) => <MoneyCell amount={report.expectedFareHalalas} />,
      },
      {
        id: 'reported',
        csv: (report) => report.reportedHalalas,
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
        emphasis: 'data',
        csv: (report) => deviationHalalas(report),
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
        emphasis: 'data',
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
    [t, language, now, currentUserId, gate, actions, decide, hrefFor],
  )

  /* ── the bulk bar: one command, and it is a claim ── */

  const selected = useMemo(
    () => rows.filter((report) => table.selectedIds.has(report.id)),
    [rows, table.selectedIds],
  )

  const claimRefusal = useMemo(
    () =>
      bulkRefusalText(
        t,
        language,
        bulkRefusal(
          selected.map((report) => claimWithheldFrom(report, gate.canWrite, currentUserId)),
          CLAIM_REFUSAL_ORDER,
        ),
        CLAIM_REFUSAL_COPY,
      ),
    [selected, gate.canWrite, currentUserId, t, language],
  )

  /**
   * **D21's escape hatch.** The reports in the current selection that are still
   * claimable. `undefined` when none are: there is nothing to narrow to, the
   * sentence is already the `.all` form, and no control renders (**AC-960**).
   */
  const claimEligible = useMemo(() => {
    const ids = selected
      .filter((report) => claimWithheldFrom(report, gate.canWrite, currentUserId) === null)
      .map((report) => report.id)
    return ids.length === 0 ? undefined : new Set(ids)
  }, [selected, gate.canWrite, currentUserId])

  const bulkActions = useMemo<BulkAction[]>(
    () => [
      {
        label: t('queue.claim'),
        /* **No confirmation, and that is the row control's decision repeated.**
           A claim moves no money and takes nothing from anybody — `Release` is
           one click away. A **take-over** does need one and is deliberately not
           offered in bulk: nine operators losing their rows at once is not a
           thing one dialog can honestly describe. */
        onClick: () => {
          void actions
            .runMany({
              keys: selected.map((report) => report.id),
              errorMessage: t('fin.error.row'),
              toastMessage: t('fin.bulk.claim.toast'),
              action: (id) => claimCashReport(id),
            })
            .then(() => table.clearSelection())
        },
        disabled: claimRefusal !== null,
        reason: claimRefusal,
        eligibleIds: claimRefusal === null ? undefined : claimEligible,
      },
    ],
    [t, actions, table, selected, claimRefusal, claimEligible],
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
        bulkActions={bulkActions}
        /* **R5a / AC-378 — declared, and identical to the leading-edge
           marker's condition above.** `DataTable` used to infer this from the
           shape of the row; the screen owns it now, so the tint and the marker
           are one decision rather than two that happened to agree. */
        isRowCritical={(report) => report.status === 'escalated'}
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
  /* **No `bulkClaim`, deliberately** — see the file header. A repayment is a
     partial amount against ONE captain balance (**AC-379**), so there is no
     bulk command to offer, and §9.3 makes the checkbox column follow that
     rather than the other way round. */
  const table = useIndexTable<CaptainDebt>({ mode: 'queue', getRowId: (debt) => debt.captainId })
  const actions = useMoneyActions<CaptainDebt>({ keyOf: (debt) => debt.captainId })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const debts = useAsync<Paginated<CaptainDebt>>(
    (signal) => listCaptainDebts({ ...table.params, view: activeTab }, signal),
    { deps: [activeTab, table.params], cacheKey: 'cash.debts' },
  )

  const rows = useMemo(() => actions.apply(debts.data?.items ?? []), [actions, debts.data])

  /* **P8-T1** — the captain name opens the captain. The receivable **ledger**
     keeps its own labelled `View ledger` control in the action lane, which is
     the same split the Payouts index makes and for the same reason: a captain
     here has two ledgers, so neither can own the name. */
  const hrefFor = useEntityLinks(useMemo(() => rows.map((debt) => debt.captainId), [rows]))

  /* **AC-381** — the total includes every captain with a non-zero receivable,
     **in both directions**. A captain in credit is not silently dropped, which
     is why this is a signed sum and the Overview tile is the positive-only one. */
  const total = useMemo(() => rows.reduce((sum, debt) => sum + debt.balanceHalalas, 0), [rows])

  const columns = useMemo<DataColumn<CaptainDebt>[]>(
    () => [
      {
        id: 'captain',
        emphasis: 'primary',
        csv: (debt) => debt.captainName,
        header: t('fin.debt.col.captain'),
        dataType: 'text',
        minWidth: 200,
        sortField: 'captainName',
        cell: (debt) => (
          <span className="relative block font-medium">
            {/* **AC-380** — over the cap, from the same source value the 360°
                profile reads. R5a's leading edge, and the words below. */}
            {debt.balanceHalalas >= debt.capHalalas && <RowCriticalMarker />}
            <EntityName href={hrefFor(debt.captainId)} name={debt.captainName} t={t} />
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
        emphasis: 'data',
        csv: (debt) => debt.balanceHalalas,
        header: t('fin.debt.col.balance'),
        dataType: 'money',
        align: 'end',
        width: 140,
        sortField: 'balanceHalalas',
        cell: (debt) => <MoneyCell amount={debt.balanceHalalas} />,
      },
      {
        id: 'cap',
        csv: (debt) => debt.capHalalas,
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
        emphasis: 'data',
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
    [t, language, gate, actions, onOpenLedger, hrefFor],
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
        /* **AC-380 / R5a** — over the cap, the same comparison the marker
           makes. `isOverCap` is derived and not a field (`types/financials.ts`),
           so it is derived once here and read twice. */
        isRowCritical={(debt) => debt.balanceHalalas >= debt.capHalalas}
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
    /* Both of the fetcher's inputs are here, and `period` is decomposed into
       the two primitives it is compared on - so one captain's ledger can never
       serve under another's id, nor one period's under another's. */
    {
      deps: [captainId, period.start, period.end],
      cacheKey: 'cash.ledger',
      isEmpty: (data) => data.postings.length === 0,
    },
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
