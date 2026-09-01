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
 *   §7.1 / P4-T1
 *              **all three views are `mode: 'index'` and carry a bulk bar.**
 *              See the two notes below — this is a deliberate change to what
 *              this file used to say, not a drift.
 *
 * ## P4-T1 — selection, and the one criterion it contradicts
 *
 * `OPERATOR-EXPERIENCE-PLAN.md` **P4-T1** names Payouts among the ten screens
 * that gain selection and a bulk bar, and paying a captain, releasing a hold
 * and applying a deduction are all set-shaped work: an operator settles a
 * period, not a captain.
 *
 * The three tables move from `mode: 'queue'` to **`mode: 'index'`**, which is
 * what they always were — an index of captains and of documents, with no claim
 * contract, no owner chip and no closed set of dispositions. §9.3's checkbox
 * restriction is a rule about **queues** (*"only if every bulk action offered
 * is a claim or assign action"*), and `Pay` is not a claim; the sanctioned
 * shape for a bulk command that is not a claim is an index table, which
 * `design/00-shell.md` §9.4 lists as *"checkbox column, kebab, sort popover,
 * bulk bar"*.
 *
 * > **⚠ This contradicts AC-476 as written, and product-owner has to settle
 * > it.** *"The three index tables that gain a `Reverse` row action **do not
 * > gain selection**: no header checkbox, no row checkbox, no bulk bar at any
 * > selection state."* Those three tables are these three. The criterion sits
 * > inside the **reversal** flow (AC-468–476), which has not shipped, and its
 * > own last sentence gives its reason: *"Acquiring selection as a side effect
 * > of gaining a row action fails."* That reason is intact here — selection
 * > arrives with four declared bulk commands and their refusals, not as a side
 * > effect of anything. **AC-335 is untouched and must stay so: `Reverse` is
 * > not among the bulk commands, and no Financials surface selects postings.**
 * > Raised in the handoff; AC-476 needs re-wording or P4-T1 needs to lose this
 * > screen, and an engineer must not pick.
 *
 * ## The set semantics, in one sentence
 *
 * **D21, ratified.** A bulk command is refused if **any** selected record would
 * be refused, the refusal names the count, and there is **no partial apply**:
 * on a money surface, paying the eligible five and silently leaving four is a
 * reconciliation incident. The predicate is the row action's own
 * (`payWithheldFrom`, `releaseWithheldFrom`, `deductionWithheldFrom`), read
 * over the selection by `bulkRefusal`, so the two surfaces cannot disagree
 * about the same record — the divergence **D9** records.
 *
 * The one way out is the bar's own **`Select only the N eligible`**, fed by
 * `eligibleIds` below. **It is not a partial apply**: the selection changes
 * visibly, by the operator's act, and the bar's count updates *before* the
 * command can run — so the number in the outcome toast is always the number
 * that was on the bar (**AC-961**). Every refused command here declares the
 * eligible subset **of the current selection**, and declares nothing when the
 * whole selection is refused, which is the case that takes D21's `.all`
 * sentence and no control (**AC-960**).
 *
 * **A permission refusal outranks a domain one** (**AC-962**) — the order the
 * three `*_REFUSAL_ORDER` arrays declare. Telling a Finance associate that four
 * captains have no bank account, when the real answer is that their role moves
 * no money at all, wastes their time twice.
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
import { DataTable, type BulkAction, type DataColumn, type RowAction } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { MoneyCell } from '@/components/Money'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useShell } from '@/shell/ShellContext'
import { bulkRefusalText, localisedText } from '../shared/text'
import { LedgerCard } from '../shared/LedgerCard'
import { ConfirmMoneyDialog, type MoneyConfirmRequest } from '../shared/ConfirmMoneyDialog'
import { EntityName, useEntityLinks } from '../shared/entityLinks'
import { FinancialsPage, periodLabel, usePeriod, useWriteGate } from '../shared/FinancialsPage'
import { useMoneyActions } from '../shared/actions'
import {
  bulkRefusal,
  deductionWithheldFrom,
  netPayableHalalas,
  payWithheldFrom,
  releaseWithheldFrom,
} from '../shared/derive'
import { useScreenViews, type ScreenView } from '../shared/views'

/**
 * **§11.2 over a set reads differently from §11.2 over a row**, so each cause
 * carries a second sentence and these three maps are where the two are paired.
 *
 * The keys are the row predicate's own return type, so a fourth refusal added
 * to `payWithheldFrom` fails to compile here until its set sentence is written
 * — the same guard `derive.ts` puts on the row sentence, extended to the bar.
 *
 * The **order** is the precedence: a role that cannot move money is refused on
 * the whole set, and naming a subset underneath that would be misleading.
 */
const PAY_REFUSAL_ORDER = [
  'fin.payout.blocked.permission',
  'fin.payout.blocked.noBank',
  'fin.payout.blocked.nothing',
] as const

const PAY_REFUSAL_COPY = {
  'fin.payout.blocked.permission': 'fin.bulk.pay.permission',
  'fin.payout.blocked.noBank': 'fin.bulk.pay.noBank',
  'fin.payout.blocked.nothing': 'fin.bulk.pay.nothing',
} as const

const RELEASE_REFUSAL_ORDER = [
  'fin.payout.blocked.permission',
  'fin.escrow.blocked.state',
  'fin.escrow.blocked.trips',
] as const

const RELEASE_REFUSAL_COPY = {
  'fin.payout.blocked.permission': 'fin.bulk.release.permission',
  'fin.escrow.blocked.state': 'fin.bulk.release.state',
  'fin.escrow.blocked.trips': 'fin.bulk.release.trips',
} as const

const DEDUCTION_REFUSAL_ORDER = [
  'fin.payout.blocked.permission',
  'fin.deduction.blocked.decided',
] as const

const APPLY_REFUSAL_COPY = {
  'fin.payout.blocked.permission': 'fin.bulk.apply.permission',
  'fin.deduction.blocked.decided': 'fin.bulk.apply.decided',
} as const

const WAIVE_REFUSAL_COPY = {
  'fin.payout.blocked.permission': 'fin.bulk.waive.permission',
  'fin.deduction.blocked.decided': 'fin.bulk.waive.decided',
} as const

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
  /* **P4-T1** — an index, which is what it always was: no claim, no owner chip,
     no dispositions. See the file header for the AC-476 conflict this opens. */
  const table = useIndexTable<CaptainPayout>({
    mode: 'index',
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

  /* **P8-T1** — the captain name opens the captain. `useEntityLinks` asks
     whether each id resolves before it renders a link, so a captain the product
     cannot open stays as text (see `entityLinks.tsx`). */
  const hrefFor = useEntityLinks(useMemo(() => rows.map((p) => p.captainId), [rows]))

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
            {/* **P8-T1** — the identity opens the 360° profile. The captain
                **payable ledger** keeps its own labelled `View ledger` control
                in the action lane: this sub-tab is an index of ledgers and the
                captain has two of them (payable and receivable), so no single
                money view can claim the name. Rider Wallets is the one place
                the name IS the ledger, and that is AC-382, not a preference. */}
            <EntityName href={hrefFor(payout.captainId)} name={payout.captainName} t={t} />
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
    [t, language, actions, hrefFor],
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

  /* ── the bulk bar ── */

  const selected = useMemo(
    () => rows.filter((payout) => table.selectedIds.has(payout.captainId)),
    [rows, table.selectedIds],
  )

  /**
   * **§11.2 over the set, decided at REST** — before the click, from the same
   * predicate the row kebab reads. `bulkRefusal` returns the first cause any
   * selected row carries, in the declared precedence, with how many carry it.
   */
  const payRefusal = useMemo(
    () =>
      bulkRefusalText(
        t,
        language,
        bulkRefusal(
          selected.map((payout) => payWithheldFrom(payout, gate.canWrite)),
          PAY_REFUSAL_ORDER,
        ),
        PAY_REFUSAL_COPY,
      ),
    [selected, gate.canWrite, t, language],
  )

  /**
   * **D21's escape hatch** — the ids **in the current selection** this command
   * would accept, from the same predicate the refusal read.
   *
   * `undefined` rather than an empty set when nothing is eligible: there is
   * nothing to narrow to, the sentence is already the `.all` form, and a
   * `Select only the 0 eligible` control is a dead end (**AC-960**).
   */
  const payEligible = useMemo(() => {
    const ids = selected
      .filter((payout) => payWithheldFrom(payout, gate.canWrite) === null)
      .map((payout) => payout.captainId)
    return ids.length === 0 ? undefined : new Set(ids)
  }, [selected, gate.canWrite])

  /**
   * **AC-366 over a set.** The three lines are the sums of the same three
   * per-row values, and the net is summed from `netPayableHalalas` per captain
   * rather than as `Σpayable − Σdebt` — those agree today and stop agreeing the
   * moment one captain has a negative payable, and the committed amount is
   * per-captain either way.
   */
  const confirmPayMany = useCallback(() => {
    const payable = selected.reduce((sum, payout) => sum + payout.payableHalalas, 0)
    const debt = selected.reduce((sum, payout) => sum + payout.cashDebtHalalas, 0)
    const net = selected.reduce(
      (sum, payout) => sum + netPayableHalalas(payout.payableHalalas, payout.cashDebtHalalas),
      0,
    )
    const keys = selected.map((payout) => payout.captainId)
    setRequest({
      title: t.plural('fin.bulk.pay.confirm.title', {
        count: keys.length,
        net: formatMoney(net),
      }),
      body: t('fin.bulk.pay.confirm.body'),
      confirmLabel: t('fin.bulk.pay.confirm.confirm'),
      lines: [
        { label: t('fin.payout.col.payable'), amountHalalas: payable },
        { label: t('fin.payout.col.debt'), amountHalalas: debt },
        { label: t('fin.payout.col.net'), amountHalalas: net, emphasis: true },
      ],
      onConfirm: () => {
        void actions
          .runMany({
            keys,
            errorMessage: t('fin.error.row'),
            toastMessage: t('fin.bulk.pay.toast'),
            /* Every captain is paid through the SAME client call the row action
               uses, so each writes its own posting and its own audit entry
               (**AC-362**, **AC-437**). There is no batch write anywhere in the
               data layer and this must not pretend otherwise. */
            action: (captainId) => payCaptain(captainId, 'payout.scheduled'),
          })
          .then(() => {
            setRequest(null)
            table.clearSelection()
          })
      },
    })
  }, [selected, actions, table, t])

  const bulkActions = useMemo<BulkAction[]>(
    () => [
      {
        /* §13.4 — the inverted strip takes the compact label. `Pay` already is
           one, so the row action and the bar name the act identically. */
        label: t('fin.payout.action.pay'),
        onClick: confirmPayMany,
        disabled: payRefusal !== null,
        reason: payRefusal,
        eligibleIds: payRefusal === null ? undefined : payEligible,
      },
    ],
    [t, confirmPayMany, payRefusal, payEligible],
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
        bulkActions={bulkActions}
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
  const table = useIndexTable<EscrowHold>({ mode: 'index', getRowId: (hold) => hold.id })
  const actions = useMoneyActions<EscrowHold>({ keyOf: (hold) => hold.id })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const holds = useAsync<Paginated<EscrowHold>>(
    (signal) => listEscrowHolds({ ...table.params }, signal),
    { deps: [table.params] },
  )

  const rows = useMemo(() => actions.apply(holds.data?.items ?? []), [actions, holds.data])

  /* **P8-T1** — three entities on one row: the captain who is owed, the rider
     who bought the plan, and the subscription the hold belongs to. The **hold
     id** is not one: an escrow hold has no profile and no route, so it stays
     text (**AC-474**'s rule, applied to a document rather than a posting). */
  const hrefFor = useEntityLinks(
    useMemo(
      () => rows.flatMap((hold) => [hold.captainId, hold.riderId, hold.subscriptionId]),
      [rows],
    ),
  )

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
          if (hold.subscriptionCancelled) return t('fin.escrow.cancelled')
          /* **P8-T1** — the subscription this hold belongs to, as a code. */
          return (
            <EntityName
              href={hrefFor(hold.subscriptionId)}
              name={hold.subscriptionId}
              t={t}
              code
            />
          )
        },
      },
      {
        id: 'captain',
        header: t('fin.escrow.col.captain'),
        dataType: 'text',
        width: 170,
        cell: (hold) => <EntityName href={hrefFor(hold.captainId)} name={hold.captainName} t={t} />,
      },
      {
        id: 'rider',
        header: t('fin.escrow.col.rider'),
        dataType: 'text',
        width: 170,
        cell: (hold) => <EntityName href={hrefFor(hold.riderId)} name={hold.riderName} t={t} />,
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
    [t, language, actions, hrefFor],
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

  /* ── the bulk bar ── */

  const selected = useMemo(
    () => rows.filter((hold) => table.selectedIds.has(hold.id)),
    [rows, table.selectedIds],
  )

  const releaseRefusal = useMemo(
    () =>
      bulkRefusalText(
        t,
        language,
        bulkRefusal(
          selected.map((hold) => releaseWithheldFrom(hold, gate.canWrite)),
          RELEASE_REFUSAL_ORDER,
        ),
        RELEASE_REFUSAL_COPY,
      ),
    [selected, gate.canWrite, t, language],
  )

  const releaseEligible = useMemo(() => {
    const ids = selected
      .filter((hold) => releaseWithheldFrom(hold, gate.canWrite) === null)
      .map((hold) => hold.id)
    return ids.length === 0 ? undefined : new Set(ids)
  }, [selected, gate.canWrite])

  const confirmReleaseMany = useCallback(() => {
    const amount = selected.reduce((sum, hold) => sum + hold.amountHalalas, 0)
    const keys = selected.map((hold) => hold.id)
    setRequest({
      title: t.plural('fin.bulk.release.confirm.title', {
        count: keys.length,
        amount: formatMoney(amount),
      }),
      body: t('fin.bulk.release.confirm.body'),
      confirmLabel: t('fin.bulk.release.confirm.confirm'),
      lines: [{ label: t('fin.escrow.col.amount'), amountHalalas: amount }],
      onConfirm: () => {
        void actions
          .runMany({
            keys,
            errorMessage: t('fin.error.row'),
            toastMessage: t('fin.bulk.release.toast'),
            /* **AC-364** — each hold transitions and stays on the list, and
               each credits its own captain payable ledger. Same reason code as
               the row action, because it is the same act. */
            action: (id) => releaseEscrow(id, 'escrow.tripsDelivered'),
          })
          .then(() => {
            setRequest(null)
            table.clearSelection()
          })
      },
    })
  }, [selected, actions, table, t])

  const bulkActions = useMemo<BulkAction[]>(
    () => [
      {
        label: t('fin.escrow.action.release'),
        onClick: confirmReleaseMany,
        disabled: releaseRefusal !== null,
        reason: releaseRefusal,
        eligibleIds: releaseRefusal === null ? undefined : releaseEligible,
      },
    ],
    [t, confirmReleaseMany, releaseRefusal, releaseEligible],
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
        bulkActions={bulkActions}
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
  const table = useIndexTable<Deduction>({ mode: 'index', getRowId: (deduction) => deduction.id })
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

  /* **P8-T1** — the captain, and the trip the deduction was raised against.
     `tripId` is nullable AND, in the fixtures, sometimes names a trip that does
     not exist (`TRP-8043`); both render as text rather than as a link into a
     not-found state. The deduction id itself is a document, not an entity. */
  const hrefFor = useEntityLinks(
    useMemo(
      () => rows.flatMap((deduction) => [deduction.captainId, deduction.tripId]),
      [rows],
    ),
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
        cell: (deduction) => (
          <EntityName href={hrefFor(deduction.captainId)} name={deduction.captainName} t={t} />
        ),
      },
      {
        id: 'trip',
        header: t('fin.deduction.col.trip'),
        dataType: 'id',
        width: 132,
        /* §8.3.1 — a deduction raised against no trip renders nothing here, as
           it always has. It is the ABSENCE of a reference, not an unknown one. */
        cell: (deduction) =>
          deduction.tripId === null ? (
            <span className="tabular-nums" />
          ) : (
            <EntityName href={hrefFor(deduction.tripId)} name={deduction.tripId} t={t} code />
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
    [t, actions, hrefFor],
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

  /* ── the bulk bar ── */

  const selected = useMemo(
    () => rows.filter((deduction) => table.selectedIds.has(deduction.id)),
    [rows, table.selectedIds],
  )

  /**
   * `Apply` and `Waive` refuse on the SAME predicate and differ only in the
   * sentence, exactly as their row actions do — so the refusal is computed once
   * and worded twice, and the two can never disagree about which rows they
   * would refuse.
   */
  const deductionSetRefusal = useMemo(
    () =>
      bulkRefusal(
        selected.map((deduction) => deductionWithheldFrom(deduction, gate.canWrite)),
        DEDUCTION_REFUSAL_ORDER,
      ),
    [selected, gate.canWrite],
  )

  /* One eligible set for both commands, because both read one predicate. */
  const deductionEligible = useMemo(() => {
    const ids = selected
      .filter((deduction) => deductionWithheldFrom(deduction, gate.canWrite) === null)
      .map((deduction) => deduction.id)
    return ids.length === 0 ? undefined : new Set(ids)
  }, [selected, gate.canWrite])

  const totalHalalas = useMemo(
    () => selected.reduce((sum, deduction) => sum + deduction.amountHalalas, 0),
    [selected],
  )

  const confirmApplyMany = useCallback(() => {
    const keys = selected.map((deduction) => deduction.id)
    setRequest({
      title: t.plural('fin.bulk.apply.confirm.title', {
        count: keys.length,
        amount: formatMoney(totalHalalas),
      }),
      body: t('fin.bulk.apply.confirm.body'),
      confirmLabel: t('fin.bulk.apply.confirm.confirm'),
      lines: [{ label: t('fin.deduction.col.amount'), amountHalalas: totalHalalas }],
      onConfirm: () => {
        void actions
          .runMany({
            keys,
            errorMessage: t('fin.error.row'),
            toastMessage: t('fin.bulk.apply.toast'),
            action: (id) => applyDeduction(id, 'deduction.applied'),
          })
          .then(() => {
            setRequest(null)
            table.clearSelection()
          })
      },
    })
  }, [selected, totalHalalas, actions, table, t])

  /**
   * **AC-369 over a set.** A waiver requires a reason, and the bulk waiver asks
   * for it **once** — one act, one justification, written onto every record it
   * touched. That is the honest shape: an operator waiving nine deductions has
   * one reason, and asking nine times would produce nine copies of it.
   */
  const confirmWaiveMany = useCallback(() => {
    const keys = selected.map((deduction) => deduction.id)
    setRequest({
      title: t.plural('fin.bulk.waive.confirm.title', {
        count: keys.length,
        amount: formatMoney(totalHalalas),
      }),
      body: t('fin.bulk.waive.confirm.body'),
      confirmLabel: t('fin.bulk.waive.confirm.confirm'),
      lines: [{ label: t('fin.deduction.col.amount'), amountHalalas: totalHalalas }],
      reason: {
        label: t('fin.deduction.waive.reason.label'),
        help: t('fin.deduction.waive.reason.help'),
        message: t('fin.deduction.waive.reason.message'),
      },
      onConfirm: ({ reason }) => {
        void actions
          .runMany({
            keys,
            errorMessage: t('fin.error.row'),
            toastMessage: t('fin.bulk.waive.toast'),
            action: (id) => waiveDeduction(id, reason),
          })
          .then(() => {
            setRequest(null)
            table.clearSelection()
          })
      },
    })
  }, [selected, totalHalalas, actions, table, t])

  const bulkActions = useMemo<BulkAction[]>(() => {
    const apply = bulkRefusalText(t, language, deductionSetRefusal, APPLY_REFUSAL_COPY)
    const waive = bulkRefusalText(t, language, deductionSetRefusal, WAIVE_REFUSAL_COPY)
    return [
      {
        label: t('fin.deduction.action.apply'),
        onClick: confirmApplyMany,
        disabled: apply !== null,
        reason: apply,
        eligibleIds: apply === null ? undefined : deductionEligible,
      },
      {
        label: t('fin.deduction.action.waive'),
        onClick: confirmWaiveMany,
        disabled: waive !== null,
        reason: waive,
        eligibleIds: waive === null ? undefined : deductionEligible,
      },
    ]
  }, [
    t,
    language,
    deductionSetRefusal,
    deductionEligible,
    confirmApplyMany,
    confirmWaiveMany,
  ])

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
        bulkActions={bulkActions}
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
