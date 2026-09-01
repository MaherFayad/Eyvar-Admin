/**
 * Financials › Rider Wallets — spec §5 row 5, §6.6, **AC-382–388**.
 *
 * ## An index *of* ledgers, and the boundary is the identity link
 *
 * The top level is an **index table**: selection, sort and filters all apply
 * (foundation §7.1). The second level, reached by the identity link, is that
 * rider's **ledger**: none of the three exists there (§7.2). The two rule sets
 * do not mix, and **AC-382** is the criterion — enforced by the table mode
 * rather than by this comment, because `LedgerTable` has no `sort`, no
 * `selectedIds` and no `toggleRow` at all.
 *
 * ## AC-451 — the chargeback that must NOT appear in `Negative balances`
 *
 * §3.4c has **two** recipes. `Dr ar.rider · Cr cash.gateway` is the **fare**
 * chargeback and leaves the wallet untouched; `Dr liability.wallet · Cr
 * cash.gateway` is the **top-up** chargeback and is the only one that can drive
 * a wallet below zero. The `Negative balances` view is the client's own
 * `balanceHalalas < 0` filter over the wallet ledger, so a rider whose *fare*
 * was charged back cannot appear in it on the strength of that chargeback
 * alone — there is no path in this file that could put them there.
 *
 * ## P4-T1 — why this sub-tab gets NO bulk bar, and what that leaves open
 *
 * The only act on the index is `Adjust`, and three things about it are
 * per-rider rather than per-set:
 *
 *   - **AC-387** requires a reason code on every adjustment. Nine riders
 *     sharing one reason is the blanket justification the field exists to stop
 *     — and unlike a bulk *waiver*, where the act is one decision about one
 *     policy, a goodwill credit is a decision about **what happened to that
 *     rider**.
 *   - **The daily ceiling is consumed as the set is applied.** `checkAdjustment
 *     Authority` measures `dailyUsed + amount` against the role cap, so a set
 *     of nine identical credits can be permitted for the first six and refused
 *     for the last three. There is no reservation and no batch endpoint, so
 *     *"refused if any selected record would be refused"* cannot be answered
 *     honestly before the run — and a half-applied set of money movements is
 *     the reconciliation incident P4-T1 is written to prevent.
 *   - **AC-386**'s second-approval flag is computed from **that rider's own**
 *     30-day history, so one set would split into committed and pending
 *     postings with nothing at commit time able to say which.
 *
 * > **⚠ That leaves the checkbox column doing nothing, and it is AC-382 that
 * > puts it there** (*"selection … works per foundation §7.1"*). A selection
 * > with no command is furniture. **Product-owner has to pick one**: give this
 * > index a bulk command that is genuinely set-shaped — an export, or an
 * > adjustment behind a batch endpoint that can reserve the daily ceiling — or
 * > amend AC-382 so the index carries sort and filters without selection.
 * > Raised in the handoff; it is not an engineer's call.
 *
 * Rules applied
 *   §7.1 / AC-382
 *              the index is `mode: 'index'` — selection, sort and filters all
 *              apply here, and none of the three exists on the ledger behind
 *              the identity link. **Payouts, Escrow and Deductions are now
 *              indexes too** (P4-T1); the sentence that used to call this the
 *              only one in Financials is no longer true and has been removed
 *              rather than left to mislead.
 *   §8.3.2 / AC-383
 *              a negative balance renders with U+2212 in ordinary ink, from
 *              `Money`. Never a badge, never parentheses, never colour.
 *   AC-384/385 the authority envelope is **server-computed and applies
 *              regardless of the reason chosen**. `compCheck` is bypassed today
 *              unless the reason label contains the literal `'Goodwill'`
 *              (`:3985`, **D-F21**); here the ceiling is read before the dialog
 *              opens and it bounds the amount field whatever the reason says.
 *   AC-386     above the second-approval threshold the confirmation says so
 *              **before** it commits, and the posting lands `pending`.
 *   AC-388     **there is no field in which to name another posting**, here or
 *              in `AdjustWalletInput`. An adjustment is a new economic event,
 *              not a correction, and the shape says so.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  adjustWallet,
  checkAdjustmentAuthority,
  getWalletLedger,
  listWallets,
} from '@/data/clients'
import type {
  AuthorityCheck,
  Ledger,
  LedgerPosting,
  Paginated,
  SubTabRoute,
  WalletSummary,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, formatMoney, type Translate } from '@/lib'
import type { BannerModel } from '@/components/Banner'
import { DataTable, type DataColumn, type ExtraFilterSpec } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { MoneyCell } from '@/components/Money'
import { RowCriticalMarker } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { useShell } from '@/shell/ShellContext'
import { ConfirmMoneyDialog, type MoneyConfirmRequest } from '../shared/ConfirmMoneyDialog'
import { EntityName, useEntityLinks } from '../shared/entityLinks'
import { FinancialsPage, useWriteGate } from '../shared/FinancialsPage'
import { LedgerCard } from '../shared/LedgerCard'
import { useMoneyActions } from '../shared/actions'
import { useScreenViews, type ScreenView } from '../shared/views'

/**
 * **AC-382** — the two wallet facts that are DERIVED and so belong to no
 * column: a balance below zero, and a wallet with no posting at all.
 *
 * Both are already `filterable` on the wallets query shape, and until now the
 * only route to either was switching to a whole view — which also changes the
 * count in the tab, the banner and the page meta. A filter narrows the list an
 * operator is already reading; a view replaces it. §6.4 exists for exactly this
 * pair.
 *
 * Neither is a `Yes` / `No` boolean at the control, because *"Balance below
 * zero: No"* is a sentence nobody reads correctly at speed. Both labels are
 * stated as the reading itself.
 */
function walletExtraFilters(t: Translate): ExtraFilterSpec[] {
  return [
    {
      field: 'negative',
      label: t('fin.wallet.filter.negative'),
      kind: 'boolean',
      trueLabel: t('fin.wallet.filter.negative.true'),
      falseLabel: t('fin.wallet.filter.negative.false'),
    },
    {
      field: 'neverUsed',
      label: t('fin.wallet.filter.neverUsed'),
      kind: 'boolean',
      trueLabel: t('fin.wallet.filter.neverUsed.true'),
      falseLabel: t('fin.wallet.filter.neverUsed.false'),
    },
  ]
}

/**
 * `?rider=<id>` — the wallet ledger's own address on this route, which is what
 * lets the identity be a `<Link>` rather than a `<button>`. Everything else in
 * the query survives, so opening a ledger from a filtered, sorted page and
 * pressing Back returns to that page.
 */
function walletLedgerSearch(search: string, riderId: string): string {
  const next = new URLSearchParams(search)
  next.set('rider', riderId)
  return `?${next.toString()}`
}

const VIEWS: readonly ScreenView[] = [
  { id: 'all-wallets', titleKey: 'fin.wallets.view.all' },
  { id: 'goodwill', titleKey: 'fin.wallets.view.goodwill' },
  { id: 'negative-balances', titleKey: 'fin.wallets.view.negative' },
]

const DEFAULT_VIEW = 'all-wallets'

export function WalletsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const { tabs, activeTab, selectTab } = useScreenViews(VIEWS, DEFAULT_VIEW, t)
  const gate = useWriteGate(row, t)
  const location = useLocation()
  const navigate = useNavigate()

  const riderId = new URLSearchParams(location.search).get('rider')
  const openRider = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(location.search)
      if (id === null) next.delete('rider')
      else next.set('rider', id)
      navigate({ pathname: location.pathname, search: `?${next.toString()}` })
    },
    [navigate, location.pathname, location.search],
  )

  const [negativeCount, setNegativeCount] = useState(0)

  const banners = useMemo<BannerModel[]>(() => {
    if (negativeCount === 0 || riderId !== null || activeTab === 'negative-balances') return []
    return [
      {
        id: 'fin.wallet.negative',
        tone: 'warning',
        title:
          negativeCount === 1
            ? t('fin.wallet.negative.title')
            : t('fin.wallet.negative.titleMany', {
                count: formatCount(negativeCount, language),
              }),
        /* **Q-F6 / foundation Q9 is unanswered**, so the banner states the
           balance and takes no position on whether it blocks a booking. */
        body: t('fin.wallet.negative.body'),
        actions: [
          {
            label: t('fin.wallet.negative.action'),
            onClick: () => selectTab('negative-balances'),
          },
        ],
      },
    ]
  }, [negativeCount, riderId, activeTab, t, language, selectTab])

  return (
    <FinancialsPage row={row} banners={banners} t={t} dir={dir}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {riderId !== null ? (
          <RiderWalletLedger riderId={riderId} onBack={() => openRider(null)} />
        ) : (
          <WalletIndex
            key={activeTab}
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={selectTab}
            gate={gate}
            onOpenLedger={openRider}
            onNegativeCount={setNegativeCount}
          />
        )}
      </div>
    </FinancialsPage>
  )
}

/* ─────────────────────────────── the index ─────────────────────────────── */

function WalletIndex({
  tabs,
  activeTab,
  onSelectTab,
  gate,
  onOpenLedger,
  onNegativeCount,
}: {
  tabs: readonly { id: string; label: string }[]
  activeTab: string
  onSelectTab: (id: string) => void
  gate: { canWrite: boolean; reason: string }
  onOpenLedger: (id: string) => void
  onNegativeCount: (count: number) => void
}) {
  const shell = useShell()
  const { t, language } = shell.language
  const location = useLocation()
  /* **AC-382** — an `index` table: selection, sort and filters all apply here,
     and none of them exists on the ledger behind the identity link. */
  const table = useIndexTable<WalletSummary>({
    mode: 'index',
    getRowId: (wallet) => wallet.riderId,
  })
  const actions = useMoneyActions<WalletSummary>({ keyOf: (wallet) => wallet.riderId })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)
  const [authority, setAuthority] = useState<AuthorityCheck | null>(null)

  const wallets = useAsync<Paginated<WalletSummary>>(
    (signal) => listWallets({ ...table.params, view: activeTab }, signal),
    { deps: [activeTab, table.params] },
  )

  const rows = useMemo(() => actions.apply(wallets.data?.items ?? []), [actions, wallets.data])

  /**
   * **P8-T1, and the one place the answer is not "the name opens the profile".**
   *
   * §5 of the spec: *"Rider Wallets is an index **of** ledgers … the second
   * level, reached by the identity link, is that rider's ledger … **the
   * boundary is the identity link**"*, and **AC-382** tests it. So here the
   * **name** stays the money view and the **rider id**, on the cell's second
   * line, carries the 360° profile. Two names for one entity, one going to each
   * destination, and neither guessed.
   */
  const hrefFor = useEntityLinks(useMemo(() => rows.map((wallet) => wallet.riderId), [rows]))

  const negative = useAsync<Paginated<WalletSummary>>(
    (signal) => listWallets({ view: 'negative-balances', pageSize: 1 }, signal),
    { deps: [] },
  )
  const negativeTotal = negative.data?.total ?? 0
  useEffect(() => {
    onNegativeCount(negativeTotal)
    return () => onNegativeCount(0)
  }, [negativeTotal, onNegativeCount])

  /**
   * The authority envelope, read **before** the dialog opens.
   *
   * **AC-385** — it applies regardless of the reason. The envelope is returned
   * for every reason code by construction, so there is no branch here that a
   * reason label could route around; that is exactly what `:3985` does when it
   * tests the label for the literal string `'Goodwill'`.
   */
  const openAdjust = useCallback(
    async (wallet: WalletSummary) => {
      const envelope = await checkAdjustmentAuthority(wallet.riderId, 0, 'goodwill')
      setAuthority(envelope)
      setRequest({
        title: t('fin.wallet.adjust.title', { rider: wallet.riderName }),
        body: t('fin.wallet.adjust.body'),
        confirmLabel: t('fin.wallet.adjust.confirm'),
        lines: [{ label: t('fin.wallet.col.balance'), amountHalalas: wallet.balanceHalalas }],
        /* **AC-386** — stated before it commits, not discovered after. */
        note: envelope.needsSecondApproval
          ? t('fin.wallet.adjust.secondApproval', {
              threshold: formatMoney(envelope.secondApprovalThresholdHalalas),
            })
          : t('fin.authority.applied', { role: envelope.appliedRole }),
        /* **AC-384** — the ceiling bounds the field and the refusal names the
           cap in SAR and the role it was applied from. The amount is never
           silently trimmed: the primary stays disabled and says why. */
        amount: {
          label: t('fin.wallet.adjust.amount.label'),
          help: t('fin.wallet.adjust.amount.help', {
            cap: formatMoney(envelope.perCaseCapHalalas),
          }),
          message: t('fin.authority.abovePerCase', {
            role: envelope.appliedRole,
            capHalalas: formatMoney(envelope.perCaseCapHalalas),
          }),
          maxHalalas: envelope.perCaseCapHalalas,
        },
        reason: {
          label: t('fin.wallet.adjust.reason.label'),
          help: t('fin.wallet.adjust.reason.help'),
          message: t('fin.wallet.adjust.reason.message'),
        },
        onConfirm: ({ amountHalalas, reason }) => {
          if (amountHalalas === null) return
          void actions
            .run({
              key: wallet.riderId,
              errorMessage: t('fin.error.row'),
              toastMessage: t('fin.wallet.toast.adjusted'),
              action: async () => {
                await adjustWallet({
                  riderId: wallet.riderId,
                  amountHalalas,
                  direction: 'credit',
                  reasonCode: reason,
                })
                /* The index row is re-read rather than patched: the balance is
                   the ledger's last settled posting, and a screen that computes
                   it a second way is the drift §6.6 exists to prevent. */
                const refreshed = await listWallets()
                return (
                  refreshed.items.find((each) => each.riderId === wallet.riderId) ?? wallet
                )
              },
            })
            .then(() => setRequest(null))
        },
      })
    },
    [actions, t],
  )

  const columns = useMemo<DataColumn<WalletSummary>[]>(
    () => [
      {
        id: 'rider',
        header: t('fin.wallet.col.rider'),
        dataType: 'text',
        minWidth: 200,
        sortField: 'riderName',
        alwaysVisible: true,
        /* **AC-382** — every filter below names a field the wallets client
           already declares `filterable`, so nothing here asks the data layer
           for a capability it does not have. A filter bound to a field the
           query shape has never heard of narrows to zero rows and reads as
           `No wallets match`, which is the worst of the three outcomes. */
        filter: { kind: 'text', field: 'riderName' },
        cell: (wallet) => (
          <span className="relative block">
            {/* **AC-383** — a negative wallet carries the row's structural
                signal; the balance itself is U+2212 in ink, never a red pill. */}
            {wallet.balanceHalalas < 0 && <RowCriticalMarker />}
            {/* **A LINK, not a button** — §9.1 / AC-43. The ledger is a view of
                this route (`?rider=<id>`), so it has an address, and an
                identity with an address must be openable in a new tab,
                middle-clickable and copyable. The `<button>` this replaces was
                none of those, and it carried its own `focus-visible:` ring
                because it had killed the default outline; this carries
                `globals.css`'s ring untouched. */}
            <Link
              to={{
                pathname: location.pathname,
                search: walletLedgerSearch(location.search, wallet.riderId),
              }}
              aria-label={t('fin.a11y.openWallet', { name: wallet.riderName })}
              className="block truncate rounded-sm font-medium text-foreground underline-offset-2 group-hover/row:underline"
            >
              {wallet.riderName}
            </Link>
          </span>
        ),
        secondaryLine: (wallet) => {
          const failure = actions.failure(wallet.riderId)
          if (failure) {
            return (
              <ErrorState
                scope="row"
                message={failure.message}
                action={{ label: t('fin.error.retry'), onClick: failure.retry }}
              />
            )
          }
          /* **P8-T1** — the id is the entity, and it opens the 360° profile.
             The name beside it is the ledger; see the note on `hrefFor`. */
          return <EntityName href={hrefFor(wallet.riderId)} name={wallet.riderId} t={t} code />
        },
      },
      {
        id: 'balance',
        header: t('fin.wallet.col.balance'),
        dataType: 'money',
        align: 'end',
        width: 140,
        sortField: 'balanceHalalas',
        /* §6.1 / **AC-101** — `money` puts the `SAR` prefix in the field and
           converts major units to halalas before emitting, so the operator
           types `-50` and the wire carries `-5000`. */
        filter: { kind: 'number-range', field: 'balanceHalalas', unit: 'money' },
        cell: (wallet) => <MoneyCell amount={wallet.balanceHalalas} />,
      },
      {
        id: 'pending',
        header: t('fin.wallet.col.pending'),
        dataType: 'money',
        align: 'end',
        width: 132,
        sortField: 'pendingHalalas',
        filter: { kind: 'number-range', field: 'pendingHalalas', unit: 'money' },
        /* **AC-312's other half** — pending is beside the balance and never
           inside it. Zero renders `0.00`, because zero pending is a reading. */
        cell: (wallet) => <MoneyCell amount={wallet.pendingHalalas} />,
      },
      {
        id: 'postings',
        header: t('fin.wallet.col.postings'),
        dataType: 'number',
        align: 'end',
        width: 116,
        sortField: 'postingCount',
        /* A count, not money — the bounds render bare and take no prefix. */
        filter: { kind: 'number-range', field: 'postingCount', unit: 'count' },
        cell: (wallet) => (
          <span className="tabular-nums">{formatCount(wallet.postingCount, language)}</span>
        ),
      },
      {
        id: 'lastActivity',
        header: t('fin.wallet.col.lastActivity'),
        dataType: 'date',
        width: 152,
        sortField: 'lastActivityAt',
        filter: { kind: 'date-range', field: 'lastActivityAt' },
        cell: (wallet) => (
          <span className="tabular-nums">
            {wallet.lastActivityAt === null
              ? ''
              : formatDate(wallet.lastActivityAt, { style: 'day-month', language })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('queue.col.actions'),
        dataType: 'enum',
        width: 190,
        cell: (wallet) => (
          <span className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="xs"
              disabled={!gate.canWrite}
              title={gate.canWrite ? undefined : gate.reason}
              onClick={() => void openAdjust(wallet)}
            >
              {t('fin.wallet.action.adjust')}
            </Button>
            <Button variant="secondary" size="xs" onClick={() => onOpenLedger(wallet.riderId)}>
              {t('fin.wallet.action.ledger')}
            </Button>
          </span>
        ),
      },
    ],
    [t, language, gate, actions, onOpenLedger, openAdjust, hrefFor, location],
  )

  return (
    <>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(wallet) => wallet.riderId}
        status={wallets.status}
        total={wallets.data?.total ?? 0}
        t={t}
        language={language}
        tableId="financials-wallets"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.wallet.search')}
        skeletonPattern="P1"
        /* §6.4 — the two derived facts no column carries. See the function. */
        extraFilters={walletExtraFilters(t)}
        firstRun={{
          heading: t('fin.wallet.empty.heading'),
          body: t('fin.wallet.empty.body'),
          actions: [{ label: t('fin.wallet.empty.action'), onClick: () => onSelectTab('all-wallets') }],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: wallets.refetch }}
      />
      <ConfirmMoneyDialog
        request={request}
        onClose={() => {
          setRequest(null)
          setAuthority(null)
        }}
        busy={actions.busy}
        t={t}
      />
      {/* The envelope is held so a test can assert the ceiling that was applied
          (**AC-439**); it renders nothing of its own. */}
      <span className="sr-only" data-applied-role={authority?.appliedRole ?? undefined} />
    </>
  )
}

/* ─────────────────────── one rider's wallet ledger ─────────────────────── */

function RiderWalletLedger({ riderId, onBack }: { riderId: string; onBack: () => void }) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable({ mode: 'ledger' })

  const ledger = useAsync<Ledger>((signal) => getWalletLedger(riderId, undefined, signal), {
    deps: [riderId],
    isEmpty: (data) => data.postings.length === 0,
  })

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
          {t('fin.wallet.back')}
        </Button>
      </div>
      <LedgerCard
        table={table}
        ledger={ledger.data}
        status={status}
        rows={rows}
        t={t}
        language={language}
        tableId="financials-wallet-ledger"
        onRetry={ledger.refetch}
        /* §7.1's two empties: a wallet with **no history at all** is first-run;
           a wallet with history narrowed to nothing is filtered-to-zero. The
           lifetime count is the only field that can tell those apart — the
           window count answers the question with itself. */
        hasHistory={(ledger.data?.lifetimePostings ?? 0) > 0}
        firstRun={{
          heading: t('fin.empty.firstRun.heading'),
          body: t('fin.empty.firstRun.body'),
          action: { label: t('fin.wallet.back'), onClick: onBack },
        }}
      />
    </div>
  )
}
