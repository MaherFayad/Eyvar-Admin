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
import { ViewSwitcher } from '@/components/table/ViewSwitcher'
import { Button } from '@/components/ui/button'
import { DecisionBadge, OwnerChip, useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { ConfirmMoneyDialog, type MoneyConfirmRequest } from '../shared/ConfirmMoneyDialog'
import { EntityName, useEntityLinks } from '../shared/entityLinks'
import { FinancialsPage, usePeriod, useWriteGate } from '../shared/FinancialsPage'
import { LedgerCard } from '../shared/LedgerCard'
import { useMoneyActions } from '../shared/actions'
import { PeriodControl } from '../shared/PeriodControl'
import { ViewRow, usePublishFacts, type ViewFacts } from '../shared/ViewRow'
import { bulkRefusal, claimWithheldFrom, deviationHalalas } from '../shared/derive'
import { bulkRefusalText } from '../shared/text'
import { useScreenViews, type ScreenView } from '@/hooks'

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

/**
 * **P0-2** — what the queue lifts so the page banner can carry its control.
 * `showOnly` is `null` while the queue is unmounted, which keeps the banner's
 * action from outliving the table it narrows.
 */
interface EscalatedScope {
  count: number
  /** True while the list is already narrowed to the escalated set. */
  scoped: boolean
  showOnly: (() => void) | null
}

const NO_ESCALATED_SCOPE: EscalatedScope = { count: 0, scoped: false, showOnly: null }

export function CashScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const { period, setPeriod } = usePeriod()
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

  const [escalated, setEscalated] = useState<EscalatedScope>(NO_ESCALATED_SCOPE)
  /* **R2-2** — the drill-in's meta names the record, and only the ledger read
     knows its name. Cleared on unmount so the index cannot inherit it. */
  const [subject, setSubject] = useState<string | null>(null)
  /* The view the drill-in belongs to: the meta names it and the way back
     restores it, so the two cannot say different things. */
  const parentView = tabs.find((tab) => tab.id === activeTab)?.label ?? ''
  /* **§10.4** — the view's figures ride the stadium's row, published by the
     view that reads them. The drill-in's one figure is server policy. */
  const [facts, setFacts] = useState<ViewFacts | null>(null)

  /* **AC-378 / P0-3** — one banner, one count, and it is the only banner this
     sub-tab raises. **There is no breach banner**, because there is no breach
     (AC-453). The tone is `info` under **R17**: an escalated report is with
     Trust & Safety, so it is waiting on THEM, and R5a's one red banner is for
     the condition the operator must act on. **P0-2** gives it the control that
     narrows the list to those reports. */
  const banners = useMemo<BannerModel[]>(() => {
    if (escalated.count === 0 || escalated.scoped || activeTab !== 'reconciliation-queue') {
      return []
    }
    return [
      {
        id: 'fin.cash.escalated',
        tone: 'info',
        title:
          escalated.count === 1
            ? t('fin.cash.escalated.title')
            : t('fin.cash.escalated.titleMany', {
                count: formatCount(escalated.count, language),
              }),
        body: t('fin.cash.escalated.body'),
        actions:
          escalated.showOnly === null
            ? undefined
            : [{ label: t('fin.cash.escalated.action'), onClick: escalated.showOnly }],
      },
    ]
  }, [escalated, activeTab, t, language])

  return (
    <FinancialsPage
      row={row}
      /* **R2-2** — on the drill-in the meta is the parent view and the record,
         one key with two placeholders. The period is not printed twice: the
         control on the title row states the window it changes. */
      meta={
        captainId === null || subject === null
          ? null
          : t('fin.drill.meta', { view: parentView, record: subject })
      }
      /* §8 slot 4c - on the title row, and only where a read honours it. */
      periodControl={
        captainId === null ? undefined : (
          <PeriodControl period={period} onChange={setPeriod} t={t} language={language} />
        )
      }
      /* **ONE view row, in one place, on all three views** (D12) — the strip
         was the `DataTable` toolbar's and moved with whatever the view drew
         above it. The drill-in has no views, so the row carries the way back
         and the cap every balance under it is read against: **R2-2**, and one
         row where there were two. */
      viewRow={
        <ViewRow
          label={parentView}
          /* **R2-2** — on the drill-in the row carries the way back and nothing
             else: the cap is a figure beside the balance it qualifies, in the
             ledger header, rather than a second figure one row above it. */
          facts={captainId === null ? facts : null}
          lead={
            captainId === null ? (
              <ViewSwitcher tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
            ) : (
              <Button
                variant="link"
                onClick={() => openCaptain(null)}
                className="h-auto p-0 text-sm"
              >
                {t('fin.drill.back', { view: parentView })}
              </Button>
            )
          }
        />
      }
      banners={banners}
      t={t}
      dir={dir}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {captainId !== null ? (
          <CaptainDebtLedger
            captainId={captainId}
            onBack={() => openCaptain(null)}
            onSubject={setSubject}
          />
        ) : activeTab === 'reconciliation-queue' ? (
          <ReconciliationQueue
            activeTab={activeTab}
            onSelectTab={selectTab}
            gate={gate}
            onEscalated={setEscalated}
            onFacts={setFacts}
          />
        ) : (
          <CaptainDebtIndex
            key={activeTab}
            activeTab={activeTab}
            onSelectTab={selectTab}
            gate={gate}
            onOpenLedger={openCaptain}
            onFacts={setFacts}
          />
        )}
      </div>
    </FinancialsPage>
  )
}

/**
 * What a sub-view still needs: the id it is (the CSV's `view` column) and a way
 * to send an operator to a sibling view from an empty state. **Not `tabs`** —
 * the view row is the screen's, rendered once above (D12).
 */
interface ViewProps {
  activeTab: string
  onSelectTab: (id: string) => void
  gate: { canWrite: boolean; reason: string }
  /* **§10.4** — the view's figures belong on the screen's view row, and only
     the view's own reads know them. Published, not rendered here. */
  onFacts: (facts: ViewFacts | null) => void
}

/* ────────────────────── the reconciliation queue (§8.4) ─────────────────── */

function ReconciliationQueue({
  activeTab,
  onSelectTab,
  gate,
  onEscalated,
  onFacts,
}: ViewProps & { onEscalated: (scope: EscalatedScope) => void }) {
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

  /* **R2-1** — what the queue holds, counted over the POPULATION rather than
     the page, the same reason the escalated count above is. */
  const open = useAsync<Paginated<CashReport>>(
    (signal) => listCashReports({ view: 'pending', pageSize: 1 }, signal),
    { deps: ['pending'], cacheKey: 'cash.list' },
  )

  /* **P0-2** — a FILTER, not a view: it shows as a clearable chip in the query
     strip and makes `isFiltered` true, so the resulting zero is `no-match`
     rather than the cleared-queue sentence. The field is the one the
     `Decision` column declares, so the chip is labelled and removable. */
  const setFilter = table.setFilter
  const showOnlyEscalated = useCallback(
    () => setFilter({ field: 'status', op: 'eq', value: 'escalated' }),
    [setFilter],
  )
  const scopedToEscalated = table.filters.some(
    (filter) => filter.field === 'status' && filter.value === 'escalated',
  )

  useEffect(() => {
    onEscalated({
      count: escalatedTotal,
      scoped: scopedToEscalated,
      showOnly: showOnlyEscalated,
    })
    return () => onEscalated(NO_ESCALATED_SCOPE)
  }, [escalatedTotal, scopedToEscalated, showOnlyEscalated, onEscalated])

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
        minWidth: 150,
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
        /* **H6 preset** — `fitWidths` shrank this to 76px and names truncated
           at eight characters. The floor is what a captain's name reads at. */
        width: 148,
        minWidth: 140,
        sortField: 'captainName',
        cell: (report) => (
          <EntityName href={hrefFor(report.captainId)} name={report.captainName} t={t} />
        ),
        /* **R2-7** — one word, so the cell stays two lines at 1280. The long
           sentence wrapped every unconfirmed captain onto a third line. */
        secondaryLine: (report) =>
          report.riderConfirmed ? t('fin.cash.riderConfirmed') : t('fin.cash.riderUnconfirmed'),
        /* **R2-7** — and an operator who wants only the unconfirmed ones asks
           for them, rather than reading the second line down the column. */
        filter: {
          kind: 'boolean',
          field: 'riderConfirmed',
          trueLabel: t('fin.cash.riderConfirmed'),
          falseLabel: t('fin.cash.riderUnconfirmed'),
        },
      },
      {
        id: 'expected',
        csv: (report) => report.expectedFareHalalas,
        header: t('fin.cash.col.expected'),
        dataType: 'money',
        align: 'end',
        width: 124,
        /* **H6 preset.** Nine columns do not fit 1280 and a wrapping header is
           the tell. `Deviation` carries what this column means; the operator
           un-hides it through `Columns` when they want the base fare.
           `DataTable` has no width-conditional hide, so this is the
           `defaultHidden` the plan's *"below `wide:`"* resolves to. */
        defaultHidden: true,
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
        /* **H6 preset, and one hide was not enough.** Six columns and a
           checkbox lane is what 910px holds. `Never reported` still renders in
           words in `Classification` and the deviation is still an em dash
           (**AC-372**); an operator resolves against deviation and
           classification, and un-hides the raw figure through `Columns`. */
        defaultHidden: true,
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
        width: 140,
        /* **AC-373** — `reported − topup − expected`, derived, with its sign;
           `null` when there is nothing to compute from (**AC-372**). */
        cell: (report) => <MoneyCell amount={deviationHalalas(report)} />,
      },
      {
        id: 'classification',
        sortField: 'classification',
        emphasis: 'data',
        header: t('fin.cash.col.classification'),
        dataType: 'enum',
        /* **Stays visible.** `classification` is server policy over
           `CASH_TOLERANCE_HALALAS` (`serverPolicy.ts:41`), so a deviation
           inside the band is `match` rather than `under_report` — the one fact
           the deviation's sign cannot give. Sized to `Under-reported` in its
           badge and floored there. */
        width: 136,
        minWidth: 130,
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
        width: 156,
        minWidth: 148,
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
        /* **The action lane of this queue**, and it is a declared column rather
           than `rowActions` because AC-377 converts a decided row into a
           `DecisionBadge` in the same cell — a lane renders controls only. It
           is last, it is sized to hold both controls, and it never shrinks
           under them. */
        width: 164,
        minWidth: 156,
        /* The field **P0-2**'s banner control sets, declared here so the filter
           renders as a labelled, removable chip rather than as a narrowing
           nothing on screen accounts for. */
        filter: {
          kind: 'select',
          field: 'status',
          options: (['pending', 'escalated', 'resolved'] as const).map((value) => ({
            value,
            label: t(`fin.cash.status.${value}`),
          })),
        },
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

  /* **§10.4** — the two counts the queue is worked against, on the view row. */
  const openTotal = open.data?.total
  const facts = useMemo<ViewFacts | null>(
    () =>
      openTotal === undefined
        ? null
        : {
            figures: [
              { label: t('fin.cash.figure.open'), value: formatCount(openTotal, language) },
              {
                label: t('fin.cash.status.escalated'),
                value: formatCount(escalatedTotal, language),
              },
            ],
          },
    [openTotal, escalatedTotal, t, language],
  )
  usePublishFacts(onFacts, facts)

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
          /* LR-3 — no Financials empty carries an illustration. See
             `PayoutsScreen`'s first declaration for the full reasoning. */
          illustration: null,
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
  activeTab,
  onSelectTab,
  gate,
  onOpenLedger,
  onFacts,
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

  /* **The cap is what every balance on this table is read against**, and until
     now it was printed only inside one captain's ledger. The count is of the
     whole population, not the page. */
  const overCap = useAsync<Paginated<CaptainDebt>>(
    (signal) => listCaptainDebts({ view: 'over-cap', pageSize: 1 }, signal),
    { deps: [], cacheKey: 'cash.debts.overCap' },
  )

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
        width: 128,
        sortField: 'balanceHalalas',
        cell: (debt) => <MoneyCell amount={debt.balanceHalalas} />,
      },
      {
        id: 'cap',
        csv: (debt) => debt.capHalalas,
        header: t('fin.debt.col.cap'),
        dataType: 'money',
        align: 'end',
        width: 112,
        /* Server policy, per Admin › Operational Policy — **not** the client
           constant `CASH_DEBT_CAP = -300` (`:12080`), and not negated. */
        cell: (debt) => <MoneyCell amount={debt.capHalalas} />,
      },
      {
        id: 'openReports',
        header: t('fin.debt.col.openReports'),
        dataType: 'number',
        align: 'end',
        width: 120,
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
        width: 120,
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
        /* Two labelled controls, and the floor is what stops `fitWidths`
           cutting `View ledger` in half when the table is over budget. */
        width: 210,
        minWidth: 200,
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

  /* **§10.4** — three bordered tiles became three figures on the view row.
     **AC-381** — the outstanding figure is the SIGNED sum, so a captain in
     credit is in it, and the count the table footer used to carry is the
     caption. */
  const facts = useMemo<ViewFacts | null>(
    () =>
      debts.status === 'content'
        ? {
            caption: [t('fin.debt.figure.captains', { count: formatCount(rows.length, language) })],
            figures: [
              { label: t('fin.debt.figure.outstanding'), amountHalalas: total },
              {
                label: t('fin.cash.view.overCap'),
                value: formatCount(overCap.data?.total ?? 0, language),
              },
              /* Server policy, per Admin › Operational Policy. */
              { label: t('fin.debt.figure.cap'), amountHalalas: cashDebtCapHalalas() },
            ],
          }
        : null,
    [debts.status, rows.length, total, overCap.data, t, language],
  )
  usePublishFacts(onFacts, facts)

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
        searchPlaceholder={t('fin.debt.search')}
        /* **AC-380 / R5a** — over the cap, the same comparison the marker
           makes. `isOverCap` is derived and not a field (`types/financials.ts`),
           so it is derived once here and read twice. */
        isRowCritical={(debt) => debt.balanceHalalas >= debt.capHalalas}
        skeletonPattern="P1"
        firstRun={{
          /* LR-3 — no Financials empty carries an illustration. See
             `PayoutsScreen`'s first declaration for the full reasoning. */
          illustration: null,
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

function CaptainDebtLedger({
  captainId,
  onBack,
  onSubject,
}: {
  captainId: string
  onBack: () => void
  /** **R2-2** — the page meta names the record, and only this read knows it. */
  onSubject: (name: string | null) => void
}) {
  const shell = useShell()
  const { t, language } = shell.language
  /* **Q-F13 / TL-2** — `getCaptainDebtLedger` is the one read on this screen
     that takes a window; the control for it is on the page's title row. */
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

  const subjectName = ledger.data?.subjectName ?? null
  useEffect(() => {
    onSubject(subjectName)
    return () => onSubject(null)
  }, [subjectName, onSubject])

  /* **R2-2** — the way back left this row for the header's breadcrumb slot and
     the cap moved beside the balance it qualifies, so the ledger header follows
     the title row directly. */
  const capFigures = useMemo(
    () => [{ label: t('fin.debt.figure.cap'), amountHalalas: cashDebtCapHalalas() }],
    [t],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <LedgerCard
        table={table}
        ledger={ledger.data}
        status={status}
        rows={rows}
        t={t}
        language={language}
        tableId="financials-captain-debt-ledger"
        figures={capFigures}
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
