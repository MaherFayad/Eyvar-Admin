/**
 * Financials › Payouts & Escrow — spec §5 row 3, §6.4, **AC-362–371**.
 *
 * Three legacy behaviours this screen refuses to reproduce, each one a
 * criterion:
 *
 *   - **D-F6 / AC-366.** `payDriver` reads only `p.pending` (`:7026`) while the
 *     page copy at `:1000` has said for two versions that cash debt is
 *     *"deducted automatically from their next payout"*. Every payout over-pays
 *     by the outstanding debt. The confirmation here states payable, debt and
 *     **net** as three labelled lines, and the net is what commits.
 *   - **AC-364.** `releaseEscrow` splices the hold out of the array (`:7064`).
 *     Here the hold transitions and **stays on the list** with its released
 *     state.
 *   - **`12b` R1 / AC-369, AC-370.** `waiveDeduction` has no permission check,
 *     no confirmation, no reason and no audit entry. Here it has all four, and
 *     the waived row stays visible with its actor and reason.
 *
 * ## The view list, and where the ledger is
 *
 * §5 lists `All postings · Payouts · Escrow · Deductions`. `liability.driver`
 * is a **captain-scoped** account — there is no platform-level payable ledger
 * to mount, and one built by concatenating twelve captains' ledgers would have
 * twelve running balances in one column. So this sub-tab is an **index of
 * ledgers**, exactly as §5 describes Rider Wallets: the `Payouts` view is the
 * index, and a captain's payable ledger opens from the row's own control. The
 * boundary is that link, and §7.2's rules apply on the far side of it in full.
 *
 * Rules applied
 *   §7.8 / D8  **this screen does not choose the shape of its action lane.**
 *              It declares `Pay` and `View ledger`; `DataTable` decides from
 *              the count of DECLARED actions — never of enabled ones, so the
 *              lane cannot jitter row by row — and the threshold at which that
 *              count becomes a kebab is D8's to move, not this file's.
 *
 *              **Stated as the rule and not as the rendered shape on purpose.**
 *              The previous wording here named the shape, the threshold then
 *              moved under it, and a comment that describes what a row looks
 *              like is wrong the day somebody re-reads §7.8. Whatever the
 *              threshold is, both actions are visible at rest and both are
 *              keyboard operable (AC-68 / D19).
 *   §11.2 / AC-368
 *              a payout the role may not perform renders **disabled in place**
 *              with its reason. No spinner, no bank-network theatre, no success
 *              screen for an unauthorised payout.
 *   R5a / AC-367
 *              a returned payout takes the row marker, the words in its own
 *              cell and ONE page banner with a count. There is no red badge.
 *   §9.3       no bulk action exists on any of these tables, so none renders a
 *              checkbox column.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  applyDeduction,
  getCaptainPayableLedger,
  listCaptainPayouts,
  listDeductions,
  listEscrowHolds,
  payCaptain,
  releaseEscrow,
  waiveDeduction,
} from '@/data/clients'
import type {
  CaptainPayout,
  Deduction,
  EscrowHold,
  Ledger,
  LedgerPosting,
  Paginated,
  SubTabRoute,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatMoney, type Translate } from '@/lib'
import type { BannerModel } from '@/components/Banner'
import { DataTable, type DataColumn, type RowAction } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { MoneyCell } from '@/components/Money'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useShell } from '@/shell/ShellContext'
import { localisedText } from '../shared/text'
import { LedgerCard } from '../shared/LedgerCard'
import { ConfirmMoneyDialog, type MoneyConfirmRequest } from '../shared/ConfirmMoneyDialog'
import { FinancialsPage, periodLabel, usePeriod, useWriteGate } from '../shared/FinancialsPage'
import { useMoneyActions } from '../shared/actions'
import {
  deductionWithheldFrom,
  netPayableHalalas,
  payWithheldFrom,
  releaseWithheldFrom,
} from '../shared/derive'
import { useScreenViews, type ScreenView } from '../shared/views'

const VIEWS: readonly ScreenView[] = [
  { id: 'payouts', titleKey: 'fin.payouts.view.payouts' },
  { id: 'escrow', titleKey: 'fin.payouts.view.escrow' },
  { id: 'deductions', titleKey: 'fin.payouts.view.deductions' },
]

const DEFAULT_VIEW = 'payouts'

/** The captain whose payable ledger is open, if any. The index-of-ledgers boundary. */
function useCaptainParam(): { captainId: string | null; open: (id: string | null) => void } {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const captainId = params.get('captain')

  const open = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(location.search)
      if (id === null) next.delete('captain')
      else next.set('captain', id)
      navigate({ pathname: location.pathname, search: `?${next.toString()}` })
    },
    [navigate, location.pathname, location.search],
  )

  return { captainId, open }
}

export function PayoutsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const { period } = usePeriod()
  const { tabs, activeTab, selectTab } = useScreenViews(VIEWS, DEFAULT_VIEW, t)
  const { captainId, open } = useCaptainParam()
  const gate = useWriteGate(row, t)

  const [failedCount, setFailedCount] = useState(0)

  const banners = useMemo<BannerModel[]>(() => {
    if (failedCount === 0 || activeTab !== 'payouts' || captainId !== null) return []
    return [
      {
        id: 'fin.payout.failed',
        tone: 'critical',
        title:
          failedCount === 1
            ? t('fin.payout.failed.title')
            : t('fin.payout.failed.titleMany', { count: formatCount(failedCount, language) }),
        body: t('fin.payout.failed.body'),
      },
    ]
  }, [failedCount, activeTab, captainId, t, language])

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
          <CaptainPayableLedger captainId={captainId} onBack={() => open(null)} />
        ) : (
          <>
            {activeTab === 'payouts' && (
              <PayoutsView
                key="payouts"
                tabs={tabs}
                activeTab={activeTab}
                onSelectTab={selectTab}
                onOpenLedger={open}
                gate={gate}
                onFailedCount={setFailedCount}
              />
            )}
            {activeTab === 'escrow' && (
              <EscrowView key="escrow" tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} gate={gate} />
            )}
            {activeTab === 'deductions' && (
              <DeductionsView
                key="deductions"
                tabs={tabs}
                activeTab={activeTab}
                onSelectTab={selectTab}
                gate={gate}
              />
            )}
          </>
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

/* ──────────────────────────────── payouts ──────────────────────────────── */

function PayoutsView({
  tabs,
  activeTab,
  onSelectTab,
  gate,
  onOpenLedger,
  onFailedCount,
}: ViewProps & { onOpenLedger: (id: string) => void; onFailedCount: (count: number) => void }) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<CaptainPayout>({
    mode: 'queue',
    getRowId: (payout) => payout.captainId,
  })
  const actions = useMoneyActions<CaptainPayout>({ keyOf: (payout) => payout.captainId })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const payouts = useAsync<Paginated<CaptainPayout>>(
    (signal) => listCaptainPayouts({ ...table.params }, signal),
    { deps: [table.params] },
  )

  const rows = useMemo(
    () => actions.apply(payouts.data?.items ?? []),
    [actions, payouts.data],
  )

  /* The banner counts the whole population, not the page: a count of what is on
     screen understates the moment there are two pages (**AC-367**). */
  const failed = useAsync<Paginated<CaptainPayout>>(
    (signal) => listCaptainPayouts({ view: 'failed', pageSize: 1 }, signal),
    { deps: [] },
  )
  const failedTotal = failed.data?.total ?? 0
  useEffect(() => {
    onFailedCount(failedTotal)
    return () => onFailedCount(0)
  }, [failedTotal, onFailedCount])

  const confirmPay = useCallback(
    (payout: CaptainPayout) => {
      const net = netPayableHalalas(payout.payableHalalas, payout.cashDebtHalalas)
      setRequest({
        title: t('fin.payout.confirm.title', {
          captain: payout.captainName,
          net: formatMoney(net),
        }),
        body: t('fin.payout.confirm.body', {
          payable: formatMoney(payout.payableHalalas),
          debt: formatMoney(payout.cashDebtHalalas),
          net: formatMoney(net),
        }),
        confirmLabel: t('fin.payout.confirm.confirm'),
        /* **AC-366** — three labelled lines, and the transferred amount is the
           net. The row, the confirmation and the audit entry all read the same
           `netPayableHalalas()`. */
        lines: [
          { label: t('fin.payout.col.payable'), amountHalalas: payout.payableHalalas },
          { label: t('fin.payout.col.debt'), amountHalalas: payout.cashDebtHalalas },
          { label: t('fin.payout.col.net'), amountHalalas: net, emphasis: true },
        ],
        onConfirm: () => {
          void actions
            .run({
              key: payout.captainId,
              errorMessage: t('fin.error.row'),
              toastMessage: t('fin.payout.toast.paid'),
              action: () => payCaptain(payout.captainId, 'payout.scheduled'),
            })
            .then(() => setRequest(null))
        },
      })
    },
    [actions, t],
  )

  const columns = useMemo<DataColumn<CaptainPayout>[]>(
    () => [
      {
        id: 'captain',
        header: t('fin.payout.col.captain'),
        dataType: 'text',
        minWidth: 200,
        sortField: 'captainName',
        cell: (payout) => (
          <span className="relative block font-medium">
            {/* R5a use #3 — a returned payout, in the leading edge. */}
            {payout.state === 'failed' && <RowCriticalMarker />}
            {payout.captainName}
          </span>
        ),
        secondaryLine: (payout) => {
          const failure = actions.failure(payout.captainId)
          if (failure) {
            /* **AC-431** — the failure renders on the row, and the rest of the
               table stays interactive. */
            return (
              <ErrorState
                scope="row"
                message={failure.message}
                action={{ label: t('fin.error.retry'), onClick: failure.retry }}
              />
            )
          }
          return payout.failureReason ? localisedText(t, payout.failureReason) : payout.tier
        },
      },
      {
        id: 'trips',
        header: t('fin.payout.col.trips'),
        dataType: 'number',
        align: 'end',
        width: 92,
        sortField: 'tripsInPeriod',
        cell: (payout) => (
          <span className="tabular-nums">{formatCount(payout.tripsInPeriod, language)}</span>
        ),
      },
      {
        id: 'payable',
        header: t('fin.payout.col.payable'),
        dataType: 'money',
        align: 'end',
        width: 128,
        sortField: 'payableHalalas',
        cell: (payout) => <MoneyCell amount={payout.payableHalalas} />,
      },
      {
        id: 'debt',
        header: t('fin.payout.col.debt'),
        dataType: 'money',
        align: 'end',
        width: 128,
        sortField: 'cashDebtHalalas',
        cell: (payout) => <MoneyCell amount={payout.cashDebtHalalas} />,
      },
      {
        id: 'net',
        header: t('fin.payout.col.net'),
        dataType: 'money',
        align: 'end',
        width: 132,
        /* **Derived**, from two independently-true server values. Never a third
           wire field that can disagree with both. */
        cell: (payout) => (
          <MoneyCell amount={netPayableHalalas(payout.payableHalalas, payout.cashDebtHalalas)} />
        ),
      },
      {
        id: 'state',
        header: t('fin.payout.col.state'),
        dataType: 'enum',
        width: 168,
        cell: (payout) =>
          payout.state === 'failed' ? (
            /* R5 — no red badge exists. The state is the words. */
            <span className="font-medium text-foreground">{t('fin.payout.state.failed')}</span>
          ) : (
            <StatusBadge tone={payout.state === 'paid' ? 'success' : 'warning'}>
              {t(`fin.payout.state.${payout.state}`)}
            </StatusBadge>
          ),
        filter: {
          kind: 'select',
          field: 'state',
          options: (['due', 'processing', 'paid', 'failed', 'reversed'] as const).map((state) => ({
            value: state,
            label: t(`fin.payout.state.${state}`),
          })),
        },
      },
    ],
    [t, language, actions],
  )

  const rowActions = useMemo<RowAction<CaptainPayout>[]>(
    () => [
      {
        label: t('fin.payout.action.pay'),
        onSelect: confirmPay,
        /* §11.2 — gated at RENDER, disabled in place, reason on the control.
           Three reasons, and each is a fact about the row or the role rather
           than a refusal the operator discovers by clicking (**AC-368**). */
        disabled: (payout) => payWithheldFrom(payout, gate.canWrite) !== null,
        /* §11.2's second clause. The predicate above and this share ONE
           function, so a fourth refusal cannot be added to the gate and
           forgotten in the sentence — the control would go dead with nothing to
           say, which is the state AC-368 was failing in. */
        reason: (payout) => {
          const withheld = payWithheldFrom(payout, gate.canWrite)
          return withheld === null ? null : t(withheld)
        },
      },
      {
        label: t('fin.payout.action.ledger'),
        onSelect: (payout) => onOpenLedger(payout.captainId),
      },
    ],
    [t, gate.canWrite, confirmPay, onOpenLedger],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(payout) => payout.captainId}
        status={payouts.status}
        total={payouts.data?.total ?? 0}
        t={t}
        language={language}
        tableId="financials-payouts"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.payout.search')}
        skeletonPattern="P1"
        rowActions={rowActions}
        firstRun={{
          heading: t('fin.payout.empty.heading'),
          body: t('fin.payout.empty.body'),
          actions: [{ label: t('fin.payout.empty.action'), onClick: () => onSelectTab('escrow') }],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: payouts.refetch }}
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

/* ───────────────────────────────── escrow ──────────────────────────────── */

function EscrowView({ tabs, activeTab, onSelectTab, gate }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<EscrowHold>({ mode: 'queue', getRowId: (hold) => hold.id })
  const actions = useMoneyActions<EscrowHold>({ keyOf: (hold) => hold.id })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const holds = useAsync<Paginated<EscrowHold>>(
    (signal) => listEscrowHolds({ ...table.params }, signal),
    { deps: [table.params] },
  )

  const rows = useMemo(() => actions.apply(holds.data?.items ?? []), [actions, holds.data])

  const columns = useMemo<DataColumn<EscrowHold>[]>(
    () => [
      {
        id: 'id',
        header: t('fin.escrow.col.id'),
        dataType: 'id',
        minWidth: 180,
        sortField: 'id',
        cell: (hold) => (
          <span className="block font-medium tabular-nums">
            <bdi>{hold.id}</bdi>
          </span>
        ),
        secondaryLine: (hold) => {
          const failure = actions.failure(hold.id)
          if (failure) {
            return (
              <ErrorState
                scope="row"
                message={failure.message}
                action={{ label: t('fin.error.retry'), onClick: failure.retry }}
              />
            )
          }
          /* **Q-F4, visible rather than absent.** A hold on a cancelled
             subscription is neither held nor releasable under any rule anybody
             has written, and the row says so instead of implying it is fine. */
          return hold.subscriptionCancelled ? t('fin.escrow.cancelled') : hold.subscriptionId
        },
      },
      {
        id: 'captain',
        header: t('fin.escrow.col.captain'),
        dataType: 'text',
        width: 170,
        cell: (hold) => <span className="truncate">{hold.captainName}</span>,
      },
      {
        id: 'rider',
        header: t('fin.escrow.col.rider'),
        dataType: 'text',
        width: 170,
        cell: (hold) => <span className="truncate">{hold.riderName}</span>,
      },
      {
        id: 'amount',
        header: t('fin.escrow.col.amount'),
        dataType: 'money',
        align: 'end',
        width: 128,
        sortField: 'amountHalalas',
        cell: (hold) => <MoneyCell amount={hold.amountHalalas} />,
      },
      {
        id: 'progress',
        header: t('fin.escrow.col.progress'),
        dataType: 'text',
        width: 160,
        /* **AC-365** — the progress is stated as `4/5 trips delivered`, in
           words, beside the disabled control that names the same reason. */
        cell: (hold) => (
          <span className="tabular-nums">
            {t('fin.escrow.progress', {
              completed: formatCount(hold.tripsCompleted, language),
              required: formatCount(hold.tripsRequired, language),
            })}
          </span>
        ),
      },
      {
        id: 'state',
        header: t('fin.escrow.col.state'),
        dataType: 'enum',
        width: 132,
        /* **AC-452** — `held | released | reversed` is the DOCUMENT's lifecycle.
           An escrow posting settles on arrival, because money arriving is a
           fact; this badge is the hold's state and never a posting's. */
        cell: (hold) => (
          <StatusBadge tone={hold.settlement === 'released' ? 'success' : 'warning'}>
            {t(`fin.settlement.${hold.settlement}`)}
          </StatusBadge>
        ),
        filter: {
          kind: 'select',
          field: 'settlement',
          options: (['held', 'released', 'reversed'] as const).map((state) => ({
            value: state,
            label: t(`fin.settlement.${state}`),
          })),
        },
      },
    ],
    [t, language, actions],
  )

  const rowActions = useMemo<RowAction<EscrowHold>[]>(
    () => [
      {
        label: t('fin.escrow.action.release'),
        onSelect: (hold) =>
          setRequest({
            title: t('fin.escrow.confirm.title', {
              amount: formatMoney(hold.amountHalalas),
              captain: hold.captainName,
            }),
            body: t('fin.escrow.confirm.body'),
            confirmLabel: t('fin.escrow.confirm.confirm'),
            lines: [{ label: t('fin.escrow.col.amount'), amountHalalas: hold.amountHalalas }],
            onConfirm: () => {
              void actions
                .run({
                  key: hold.id,
                  errorMessage: t('fin.error.row'),
                  toastMessage: t('fin.escrow.toast.released'),
                  action: () => releaseEscrow(hold.id, 'escrow.tripsDelivered'),
                })
                .then(() => setRequest(null))
            },
          }),
        /* **AC-365** — disabled in place while the trips are outstanding, and
           **AC-368** — saying which of the three it is. One function feeds both
           so they cannot drift apart. */
        disabled: (hold) => releaseWithheldFrom(hold, gate.canWrite) !== null,
        reason: (hold) => {
          const withheld = releaseWithheldFrom(hold, gate.canWrite)
          if (withheld === null) return null
          return withheld === 'fin.escrow.blocked.state'
            ? t(withheld, { state: t(`fin.settlement.${hold.settlement}`) })
            : t(withheld)
        },
      },
    ],
    [t, gate.canWrite, actions],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(hold) => hold.id}
        status={holds.status}
        total={holds.data?.total ?? 0}
        t={t}
        language={language}
        tableId="financials-escrow"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.escrow.search')}
        skeletonPattern="P1"
        rowActions={rowActions}
        rowActionsWidth={96}
        firstRun={{
          heading: t('fin.escrow.empty.heading'),
          body: t('fin.escrow.empty.body'),
          actions: [{ label: t('fin.escrow.empty.action'), onClick: () => onSelectTab('payouts') }],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: holds.refetch }}
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

/* ─────────────────────────────── deductions ────────────────────────────── */

/**
 * **AC-368** for both deduction actions. `Apply` and `Waive` refuse for the
 * same two reasons, so they share one sentence-builder rather than each
 * carrying a copy that could drift from the other.
 */
function deductionRefusal(
  deduction: Deduction,
  canWrite: boolean,
  t: Translate,
): string | null {
  const withheld = deductionWithheldFrom(deduction, canWrite)
  if (withheld === null) return null
  return withheld === 'fin.deduction.blocked.decided'
    ? t(withheld, { state: t(`fin.deduction.status.${deduction.status}`) })
    : t(withheld)
}

function DeductionsView({ tabs, activeTab, onSelectTab, gate }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<Deduction>({ mode: 'queue', getRowId: (deduction) => deduction.id })
  const actions = useMoneyActions<Deduction>({ keyOf: (deduction) => deduction.id })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const deductions = useAsync<Paginated<Deduction>>(
    (signal) => listDeductions({ ...table.params }, signal),
    { deps: [table.params] },
  )

  const rows = useMemo(
    () => actions.apply(deductions.data?.items ?? []),
    [actions, deductions.data],
  )

  const columns = useMemo<DataColumn<Deduction>[]>(
    () => [
      {
        id: 'id',
        header: t('fin.deduction.col.id'),
        dataType: 'id',
        minWidth: 190,
        sortField: 'id',
        cell: (deduction) => (
          <span className="block font-medium tabular-nums">
            <bdi>{deduction.id}</bdi>
          </span>
        ),
        secondaryLine: (deduction) => {
          const failure = actions.failure(deduction.id)
          if (failure) {
            return (
              <ErrorState
                scope="row"
                message={failure.message}
                action={{ label: t('fin.error.retry'), onClick: failure.retry }}
              />
            )
          }
          /* **AC-370** — a waived deduction keeps its actor and its reason on
             the row. It is not removed from the list. */
          if (deduction.status === 'waived' && deduction.waivedByUserName) {
            return t('fin.deduction.waivedBy', {
              actor: deduction.waivedByUserName,
              reason: deduction.waivedReasonCode ?? '',
            })
          }
          return localisedText(t, deduction.type)
        },
      },
      {
        id: 'captain',
        header: t('fin.deduction.col.captain'),
        dataType: 'text',
        width: 180,
        sortField: 'captainName',
        cell: (deduction) => <span className="truncate">{deduction.captainName}</span>,
      },
      {
        id: 'trip',
        header: t('fin.deduction.col.trip'),
        dataType: 'id',
        width: 132,
        cell: (deduction) => (
          <span className="tabular-nums">
            <bdi>{deduction.tripId ?? ''}</bdi>
          </span>
        ),
      },
      {
        id: 'amount',
        header: t('fin.deduction.col.amount'),
        dataType: 'money',
        align: 'end',
        width: 128,
        sortField: 'amountHalalas',
        cell: (deduction) => <MoneyCell amount={deduction.amountHalalas} />,
      },
      {
        id: 'status',
        header: t('fin.deduction.col.status'),
        dataType: 'enum',
        width: 132,
        cell: (deduction) => (
          <StatusBadge tone={deduction.status === 'applied' ? 'success' : deduction.status === 'waived' ? 'neutral' : 'warning'}>
            {t(`fin.deduction.status.${deduction.status}`)}
          </StatusBadge>
        ),
        filter: {
          kind: 'select',
          field: 'status',
          options: (['pending', 'applied', 'waived'] as const).map((status) => ({
            value: status,
            label: t(`fin.deduction.status.${status}`),
          })),
        },
      },
    ],
    [t, actions],
  )

  const rowActions = useMemo<RowAction<Deduction>[]>(
    () => [
      {
        label: t('fin.deduction.action.apply'),
        onSelect: (deduction) =>
          setRequest({
            title: t('fin.deduction.apply.title', {
              amount: formatMoney(deduction.amountHalalas),
              captain: deduction.captainName,
            }),
            /* **AC-371** — the body states what happens to the excess rather
               than letting a clamp forgive it silently. */
            body: t('fin.deduction.apply.body'),
            confirmLabel: t('fin.deduction.apply.confirm'),
            lines: [
              { label: t('fin.deduction.col.amount'), amountHalalas: deduction.amountHalalas },
            ],
            onConfirm: () => {
              void actions
                .run({
                  key: deduction.id,
                  errorMessage: t('fin.error.row'),
                  toastMessage: t('fin.deduction.toast.applied'),
                  action: () => applyDeduction(deduction.id, 'deduction.applied'),
                })
                .then(() => setRequest(null))
            },
          }),
        disabled: (deduction) => deductionWithheldFrom(deduction, gate.canWrite) !== null,
        reason: (deduction) => deductionRefusal(deduction, gate.canWrite, t),
      },
      {
        label: t('fin.deduction.action.waive'),
        onSelect: (deduction) =>
          setRequest({
            title: t('fin.deduction.waive.title', {
              amount: formatMoney(deduction.amountHalalas),
              captain: deduction.captainName,
            }),
            body: t('fin.deduction.waive.body'),
            confirmLabel: t('fin.deduction.waive.confirm'),
            lines: [
              { label: t('fin.deduction.col.amount'), amountHalalas: deduction.amountHalalas },
            ],
            /* **AC-369** — a waiver requires a reason, and the reason is
               validated here rather than arriving as a 422. */
            reason: {
              label: t('fin.deduction.waive.reason.label'),
              help: t('fin.deduction.waive.reason.help'),
              message: t('fin.deduction.waive.reason.message'),
            },
            onConfirm: ({ reason }) => {
              void actions
                .run({
                  key: deduction.id,
                  errorMessage: t('fin.error.row'),
                  toastMessage: t('fin.deduction.toast.waived'),
                  action: () => waiveDeduction(deduction.id, reason),
                })
                .then(() => setRequest(null))
            },
          }),
        disabled: (deduction) => deductionWithheldFrom(deduction, gate.canWrite) !== null,
        reason: (deduction) => deductionRefusal(deduction, gate.canWrite, t),
      },
    ],
    [t, gate.canWrite, actions],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(deduction) => deduction.id}
        status={deductions.status}
        total={deductions.data?.total ?? 0}
        t={t}
        language={language}
        tableId="financials-deductions"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.deduction.search')}
        skeletonPattern="P1"
        rowActions={rowActions}
        firstRun={{
          heading: t('fin.deduction.empty.heading'),
          body: t('fin.deduction.empty.body'),
          actions: [
            { label: t('fin.deduction.empty.action'), onClick: () => onSelectTab('payouts') },
          ],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: deductions.refetch }}
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

/* ──────────────────── a captain's payable ledger (§7.2) ─────────────────── */

/**
 * The far side of the identity link. §7.2 applies in full here: no selection,
 * no sort, no row actions — enforced by `mode: 'ledger'` rather than by this
 * comment.
 */
function CaptainPayableLedger({
  captainId,
  onBack,
}: {
  captainId: string
  onBack: () => void
}) {
  const shell = useShell()
  const { t, language } = shell.language
  const { period } = usePeriod()
  const table = useIndexTable({ mode: 'ledger' })

  const ledger = useAsync<Ledger>(
    (signal) => getCaptainPayableLedger(captainId, period, signal),
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
      <div>
        <Button variant="secondary" size="xs" onClick={onBack}>
          {t('fin.payout.back')}
        </Button>
      </div>
      <LedgerCard
        table={table}
        ledger={ledger.data}
        status={status}
        rows={rows}
        t={t}
        language={language}
        tableId="financials-captain-payable"
        onRetry={ledger.refetch}
        hasHistory={(ledger.data?.lifetimePostings ?? 0) > 0}
        firstRun={{
          heading: t('fin.empty.firstRun.heading'),
          body: t('fin.empty.firstRun.body'),
          action: { label: t('fin.payout.back'), onClick: onBack },
        }}
      />
    </div>
  )
}
