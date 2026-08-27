/**
 * Financials › Ledger & Payment Controls — spec §5 row 7, §6.8,
 * **AC-415–424**.
 *
 * Six views on one route: the trial balance (default), the journal, the
 * operational-versus-ledger reconciliation, the refused postings, the payment
 * gateways and the VAT / invoicing configuration.
 *
 * Rules applied
 *   AC-415     the trial balance lists **every** account in the chart,
 *              including zero-balance ones. A trial balance that hides its
 *              empty rows cannot show you that an account has never been posted
 *              to, which is exactly the failure `12a` R11 records.
 *   AC-416 / §7.4
 *              out of balance is a **page-level critical banner** naming the
 *              difference in SAR. It replaces the inline `⛔ OUT OF BALANCE`
 *              string (`:20081`), which is a status wearing a colour.
 *   AC-419     a refused posting is kept, with its reason **in words**, and
 *              counted in a banner. Legacy gets this right (`:19926`) and it
 *              stays.
 *   AC-420     the reconciliation compares **like with like**: every row states
 *              the VAT basis both figures are on. Legacy's refund row multiplies
 *              the VAT account by zero (`:20065`) and shows a permanent ~13 %
 *              break as though it were real (**D-F12**).
 *   AC-422     disabling the default gateway is refused with the reason naming
 *              what to do first, and **the switch returns to its previous
 *              position** — nothing here flips optimistically.
 *   AC-424     the invoice sequence is read-only across the seam. Legacy
 *              increments it inside a *render* function (`:4404`), so previewing
 *              an invoice burns a number.
*   AC-421     **no developer or simulation control appears anywhere on this
 *              sub-tab.** The mock's own out-of-balance affordance lives in
 *              `src/data` and is reachable from a test — never imported here,
 *              and `financials.test.tsx` asserts the absence of the import
 *              rather than trusting this sentence.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  getIdempotencyStats,
  getInvoiceSequence,
  getTrialBalance,
  getVatConfig,
  listGateways,
  listJournalEntries,
  listReconciliation,
  listRefusedPostings,
  setDefaultGateway,
  setGatewayEnabled,
} from '@/data/clients'
import type {
  IdempotencyStats,
  InvoiceSequence,
  JournalEntry,
  Paginated,
  PaymentGateway,
  ReconciliationRow,
  RefusedPosting,
  SubTabRoute,
  TrialBalance,
  TrialBalanceRow,
  VatConfig,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, formatMoney } from '@/lib'
import type { BannerModel } from '@/components/Banner'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { MoneyCell } from '@/components/Money'
import { RowCriticalMarker } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useShell } from '@/shell/ShellContext'
import { FigureRow } from '../shared/Figures'
import { FinancialsPage, useWriteGate } from '../shared/FinancialsPage'
import { localisedText } from '../shared/text'
import { useMoneyActions } from '../shared/actions'
import { useScreenViews, type ScreenView } from '../shared/views'

const VIEWS: readonly ScreenView[] = [
  { id: 'trial-balance', titleKey: 'fin.controls.view.trialBalance' },
  { id: 'journal', titleKey: 'fin.controls.view.journal' },
  { id: 'reconciliation', titleKey: 'fin.controls.view.reconciliation' },
  { id: 'refused', titleKey: 'fin.controls.view.refused' },
  { id: 'gateways', titleKey: 'fin.controls.view.gateways' },
  { id: 'vat', titleKey: 'fin.controls.view.vat' },
]

const DEFAULT_VIEW = 'trial-balance'

export function LedgerControlsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const { t, dir, language } = shell.language
  const { tabs, activeTab, selectTab } = useScreenViews(VIEWS, DEFAULT_VIEW, t)
  const gate = useWriteGate(row, t)

  const trial = useAsync<TrialBalance>((signal) => getTrialBalance(signal), {
    deps: [],
    isEmpty: (data) => data.rows.length === 0,
  })

  /**
   * **AC-419's count, read at the SCREEN and not inside the view it belongs
   * to.**
   *
   * It was fetched inside `RefusedView` and therefore existed only while that
   * one sub-view was mounted, which is why the criterion's *"and is counted in
   * a page banner"* had nowhere to be satisfied: a page banner is a property of
   * the page, and the number was a local of a child. A refusal is a standing
   * condition on this whole sub-tab — the same reading Overview already makes
   * from `refusedPostingCount` — so the page reads it once and hands the rows
   * down rather than the child reading them and handing a number up.
   */
  const refused = useAsync<RefusedPosting[]>((signal) => listRefusedPostings(signal), { deps: [] })
  const refusedCount = refused.data?.length ?? 0

  /* **AC-416 / AC-419** — one banner. Out of balance outranks the refused
     count, because a book that does not balance is the more severe reading of
     the same evidence, and R10 allows exactly one page-level banner. */
  const banners = useMemo<BannerModel[]>(() => {
    if (!trial.data) return []
    if (!trial.data.balanced) {
      return [
        {
          id: 'fin.controls.outOfBalance',
          tone: 'critical',
          title: t('fin.overview.outOfBalance.title', {
            amount: formatMoney(Math.abs(trial.data.differenceHalalas)),
          }),
          body: t('fin.overview.outOfBalance.body'),
          actions: [
            { label: t('fin.overview.outOfBalance.action'), onClick: () => selectTab('refused') },
          ],
        },
      ]
    }
    /**
     * **AC-419** — the count, in the same words Overview uses, from the same
     * two keys. `warning` and not `critical`: the books balance, so every
     * refusal was the ledger correctly refusing to record something wrong.
     * That is the control working, and R5a does not spend red on it.
     *
     * The banner carries an action only when the operator is somewhere else on
     * this sub-tab. On the `Refused postings` view the rows are already on
     * screen beneath it, and a button that scrolls nowhere is furniture.
     */
    if (refusedCount > 0) {
      return [
        {
          id: 'fin.controls.refused',
          tone: 'warning',
          title:
            refusedCount === 1
              ? t('fin.overview.refused.title')
              : t('fin.overview.refused.titleMany', {
                  count: formatCount(refusedCount, language),
                }),
          body: t('fin.overview.outOfBalance.body'),
          actions:
            activeTab === 'refused'
              ? []
              : [
                  {
                    label: t('fin.overview.outOfBalance.action'),
                    onClick: () => selectTab('refused'),
                  },
                ],
        },
      ]
    }
    return []
  }, [trial.data, refusedCount, activeTab, t, language, selectTab])

  return (
    <FinancialsPage row={row} banners={banners} t={t} dir={dir}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {activeTab === 'trial-balance' && (
          <TrialBalanceView
            key="trial"
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={selectTab}
            trial={trial.data}
            status={trial.status}
            onRetry={trial.refetch}
          />
        )}
        {activeTab === 'journal' && (
          <JournalView key="journal" tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
        )}
        {activeTab === 'reconciliation' && (
          <ReconciliationView key="recon" tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />
        )}
        {activeTab === 'refused' && (
          <RefusedView
            key="refused"
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={selectTab}
            refused={refused.data ?? []}
            status={refused.status}
            onRetry={refused.refetch}
          />
        )}
        {activeTab === 'gateways' && (
          <GatewaysView key="gateways" tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} gate={gate} />
        )}
        {activeTab === 'vat' && <VatView key="vat" tabs={tabs} activeTab={activeTab} onSelectTab={selectTab} />}
      </div>
    </FinancialsPage>
  )
}

interface ViewProps {
  tabs: readonly { id: string; label: string }[]
  activeTab: string
  onSelectTab: (id: string) => void
}

/* ─────────────────────────── the trial balance ─────────────────────────── */

function TrialBalanceView({
  tabs,
  activeTab,
  onSelectTab,
  trial,
  status,
  onRetry,
}: ViewProps & {
  trial: TrialBalance | null
  status: 'loading' | 'error' | 'empty' | 'content'
  onRetry: () => void
}) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<TrialBalanceRow>({ mode: 'queue', getRowId: (each) => each.account })

  const rows = trial?.rows ?? []

  const columns = useMemo<DataColumn<TrialBalanceRow>[]>(
    () => [
      {
        id: 'account',
        header: t('fin.trial.col.account'),
        dataType: 'text',
        minWidth: 240,
        sortField: 'label',
        cell: (each) => <span className="font-medium">{each.label}</span>,
        secondaryLine: (each) => (
          <span className="tabular-nums">
            <bdi>{each.account}</bdi>
          </span>
        ),
      },
      {
        id: 'type',
        header: t('fin.trial.col.type'),
        dataType: 'enum',
        width: 180,
        cell: (each) => <span>{t(`fin.trial.type.${each.type}`)}</span>,
        filter: {
          kind: 'select',
          field: 'type',
          options: (['asset', 'liability', 'revenue', 'contra', 'expense', 'equity'] as const).map(
            (value) => ({ value, label: t(`fin.trial.type.${value}`) }),
          ),
        },
      },
      {
        id: 'balance',
        header: t('fin.trial.col.balance'),
        dataType: 'money',
        align: 'end',
        width: 160,
        sortField: 'balanceHalalas',
        /* **AC-415** — a zero-balance account renders `0.00`, not an em dash and
           not a hidden row. Zero is a reading; absent is not. */
        cell: (each) => <MoneyCell amount={each.balanceHalalas} />,
      },
    ],
    [t],
  )

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(each) => each.account}
      status={status}
      total={rows.length}
      t={t}
      language={language}
      tableId="financials-trial-balance"
      view={activeTab}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      searchPlaceholder={t('fin.trial.search')}
      skeletonPattern="P1"
      learnMore={
        trial ? (
          <span className="text-sm text-muted-foreground">
            {t('fin.trial.totals', {
              debits: formatMoney(trial.totalDebitsHalalas),
              credits: formatMoney(trial.totalCreditsHalalas),
              entries: formatCount(trial.entryCount, language),
            })}
          </span>
        ) : undefined
      }
      firstRun={{
        heading: t('fin.trial.empty.heading'),
        body: t('fin.trial.empty.body'),
        actions: [{ label: t('fin.trial.empty.action'), onClick: () => onSelectTab('journal') }],
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry }}
    />
  )
}

/* ────────────────────────────── the journal ────────────────────────────── */

function JournalView({ tabs, activeTab, onSelectTab }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<JournalEntry>({ mode: 'queue', getRowId: (entry) => entry.id })

  const journal = useAsync<Paginated<JournalEntry>>(
    (signal) => listJournalEntries({ ...table.params, signal }),
    { deps: [table.params] },
  )

  const rows = journal.data?.items ?? []

  const columns = useMemo<DataColumn<JournalEntry>[]>(
    () => [
      {
        id: 'id',
        header: t('fin.journal.col.id'),
        dataType: 'id',
        width: 132,
        sortField: 'id',
        cell: (entry) => (
          <span className="block font-medium tabular-nums">
            <bdi>{entry.id}</bdi>
          </span>
        ),
      },
      {
        id: 'posted',
        header: t('fin.journal.col.posted'),
        dataType: 'date',
        width: 152,
        sortField: 'postedAt',
        cell: (entry) => (
          <span className="tabular-nums">
            {formatDate(entry.postedAt, { style: 'day-month-time', language })}
          </span>
        ),
      },
      {
        id: 'type',
        header: t('fin.journal.col.type'),
        dataType: 'text',
        width: 168,
        cell: (entry) => <span className="truncate">{entry.type}</span>,
      },
      {
        id: 'lines',
        header: t('fin.journal.col.lines'),
        dataType: 'text',
        minWidth: 300,
        /* **AC-418** — every line reads `Dr <account> <amount>` or
           `Cr <account> <amount>`, and each entry's debit total equals its
           credit total by construction: an unbalanced entry is refused at write
           time and appears in the refused view instead (**AC-343**). */
        cell: (entry) => (
          <span className="flex flex-col gap-0.5">
            {entry.lines.map((line, index) => (
              <span key={`${entry.id}-${index}`} className="tabular-nums">
                {t(
                  line.direction === 'debit' ? 'fin.journal.line.debit' : 'fin.journal.line.credit',
                  { account: line.account, amount: formatMoney(line.amountHalalas) },
                )}
              </span>
            ))}
          </span>
        ),
      },
      {
        id: 'total',
        header: t('fin.journal.col.total'),
        dataType: 'money',
        align: 'end',
        width: 140,
        cell: (entry) => <MoneyCell amount={entry.totalHalalas} />,
      },
    ],
    [t, language],
  )

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(entry) => entry.id}
      status={journal.status}
      total={journal.data?.total ?? 0}
      t={t}
      language={language}
      tableId="financials-journal"
      view={activeTab}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      searchPlaceholder={t('fin.journal.search')}
      skeletonPattern="P1"
      firstRun={{
        heading: t('fin.journal.empty.heading'),
        body: t('fin.journal.empty.body'),
        actions: [{ label: t('fin.journal.empty.action'), onClick: () => onSelectTab('trial-balance') }],
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry: journal.refetch }}
    />
  )
}

/* ───────────────────────────  reconciliation  ──────────────────────────── */

function ReconciliationView({ tabs, activeTab, onSelectTab }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<ReconciliationRow>({
    mode: 'queue',
    getRowId: (each) => each.label.key,
  })

  const rows = useAsync<ReconciliationRow[]>((signal) => listReconciliation(signal), { deps: [] })
  const stats = useAsync<IdempotencyStats>((signal) => getIdempotencyStats(signal), { deps: [] })

  const columns = useMemo<DataColumn<ReconciliationRow>[]>(
    () => [
      {
        id: 'label',
        header: t('fin.reconcile.col.label'),
        dataType: 'text',
        minWidth: 240,
        cell: (each) => <span className="font-medium">{localisedText(t, each.label)}</span>,
      },
      {
        id: 'operational',
        header: t('fin.reconcile.col.operational'),
        dataType: 'money',
        align: 'end',
        width: 168,
        cell: (each) => <MoneyCell amount={each.operationalHalalas} />,
      },
      {
        id: 'ledger',
        header: t('fin.reconcile.col.ledger'),
        dataType: 'money',
        align: 'end',
        width: 152,
        cell: (each) => <MoneyCell amount={each.ledgerHalalas} />,
      },
      {
        id: 'difference',
        header: t('fin.reconcile.col.difference'),
        dataType: 'money',
        align: 'end',
        width: 160,
        /* **AC-420** — a row that agrees shows `0.00 SAR`, never an em dash:
           agreement is a reading. Derived here from the two figures beside it,
           and the client sends its own copy so the two can be compared. */
        cell: (each) => <MoneyCell amount={each.operationalHalalas - each.ledgerHalalas} />,
      },
      {
        id: 'basis',
        header: t('fin.reconcile.col.basis'),
        dataType: 'enum',
        width: 152,
        /* **D-F12 closed.** The basis is stated on the row, so a VAT-inclusive
           figure is never silently compared with a VAT-exclusive one. */
        cell: (each) => <span>{t(`fin.reconcile.basis.${each.vatBasis}`)}</span>,
      },
    ],
    [t],
  )

  return (
    <DataTable
      table={table}
      rows={rows.data ?? []}
      columns={columns}
      getRowId={(each) => each.label.key}
      status={rows.status}
      total={(rows.data ?? []).length}
      t={t}
      language={language}
      tableId="financials-reconciliation"
      view={activeTab}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      searchPlaceholder={t('fin.reconcile.search')}
      skeletonPattern="P1"
      learnMore={
        stats.data ? (
          <span className="text-sm text-muted-foreground">
            {t('fin.reconcile.idempotency', {
              operations: formatCount(stats.data.operations, language),
              duplicated: formatCount(stats.data.duplicated, language),
              suppressed: formatCount(stats.data.suppressed, language),
            })}
          </span>
        ) : undefined
      }
      firstRun={{
        heading: t('fin.reconcile.empty.heading'),
        body: t('fin.reconcile.empty.body'),
        actions: [
          { label: t('fin.reconcile.empty.action'), onClick: () => onSelectTab('trial-balance') },
        ],
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry: rows.refetch }}
    />
  )
}

/* ──────────────────────────── refused postings ─────────────────────────── */

function RefusedView({
  tabs,
  activeTab,
  onSelectTab,
  refused,
  status,
  onRetry,
}: ViewProps & {
  /* Read by the screen, because the page banner needs the same count — see
     `LedgerControlsScreen`. This view renders what it is given (**AC-419**). */
  refused: readonly RefusedPosting[]
  status: 'loading' | 'error' | 'empty' | 'content'
  onRetry: () => void
}) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<RefusedPosting>({ mode: 'queue', getRowId: (each) => each.reference })

  const rows = refused

  const columns = useMemo<DataColumn<RefusedPosting>[]>(
    () => [
      {
        id: 'reference',
        header: t('fin.refused.col.reference'),
        dataType: 'id',
        minWidth: 220,
        cell: (each) => (
          <span className="relative block font-medium tabular-nums">
            {/* R5a — a refusal is a standing critical condition on the row. */}
            <RowCriticalMarker />
            <bdi>{each.reference}</bdi>
          </span>
        ),
        secondaryLine: (each) => each.type,
      },
      {
        id: 'reason',
        header: t('fin.refused.col.reason'),
        dataType: 'text',
        width: 320,
        /* **AC-419** — the reason **in words**, from a key with named
           parameters. Legacy builds `'unbalanced: debits X vs credits Y'`
           (`:19924`) and embeds it inside another sentence, which is a sentence
           inside a sentence and cannot be translated. */
        cell: (each) => <span>{localisedText(t, each.reason)}</span>,
      },
      {
        id: 'attempted',
        header: t('fin.refused.col.attempted'),
        dataType: 'date',
        width: 156,
        cell: (each) => (
          <span className="tabular-nums">
            {formatDate(each.attemptedAt, { style: 'day-month-time', language })}
          </span>
        ),
      },
      {
        id: 'lines',
        header: t('fin.refused.col.lines'),
        dataType: 'text',
        width: 260,
        cell: (each) => (
          <span className="flex flex-col gap-0.5">
            {each.lines.map((line, index) => (
              <span key={`${each.reference}-${index}`} className="tabular-nums">
                {t(
                  line.direction === 'debit' ? 'fin.journal.line.debit' : 'fin.journal.line.credit',
                  { account: line.account, amount: formatMoney(line.amountHalalas) },
                )}
              </span>
            ))}
          </span>
        ),
      },
    ],
    [t, language],
  )

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(each) => each.reference}
      status={status}
      total={rows.length}
      t={t}
      language={language}
      tableId="financials-refused"
      view={activeTab}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      searchPlaceholder={t('fin.refused.search')}
      skeletonPattern="P1"
      /* A ledger that has refused nothing is a good state, not a first run —
         but this is an index of documents, and the illustrated state is the
         honest one here: nothing has ever been refused. */
      firstRun={{
        heading: t('fin.refused.empty.heading'),
        body: t('fin.refused.empty.body'),
        actions: [{ label: t('fin.refused.empty.action'), onClick: () => onSelectTab('journal') }],
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry }}
    />
  )
}

/* ──────────────────────────── payment gateways ─────────────────────────── */

function GatewaysView({
  tabs,
  activeTab,
  onSelectTab,
  gate,
}: ViewProps & { gate: { canWrite: boolean; reason: string } }) {
  const shell = useShell()
  const { t, language } = shell.language
  const table = useIndexTable<PaymentGateway>({ mode: 'queue', getRowId: (each) => each.id })
  const actions = useMoneyActions<PaymentGateway>({ keyOf: (each) => each.id })
  const [refusal, setRefusal] = useState<string | null>(null)

  const gateways = useAsync<PaymentGateway[]>((signal) => listGateways(signal), { deps: [] })
  const rows = useMemo(() => actions.apply(gateways.data ?? []), [actions, gateways.data])

  /**
   * **AC-422** — the switch **never flips optimistically**. The rendered value
   * is the last value the server returned, so a refusal leaves it exactly where
   * it was, and the reason renders beside it rather than as a toast that has
   * gone by the time the operator looks.
   */
  const toggle = useCallback(
    async (gateway: PaymentGateway, next: boolean) => {
      if (!next && gateway.isDefault) {
        setRefusal(t('fin.gateway.blocked.default'))
        return
      }
      setRefusal(null)
      await actions.run({
        key: gateway.id,
        errorMessage: t('fin.error.row'),
        toastMessage: next ? t('fin.gateway.toast.enabled') : t('fin.gateway.toast.disabled'),
        action: () => setGatewayEnabled(gateway.id, next),
      })
    },
    [actions, t],
  )

  const makeDefault = useCallback(
    async (gateway: PaymentGateway) => {
      if (!gateway.enabled) {
        setRefusal(t('fin.gateway.blocked.disabled'))
        return
      }
      setRefusal(null)
      await actions.run({
        key: gateway.id,
        errorMessage: t('fin.error.row'),
        toastMessage: t('fin.gateway.toast.default'),
        action: async () => {
          const updated = await setDefaultGateway(gateway.id)
          gateways.refetch()
          return updated.find((each) => each.id === gateway.id) ?? gateway
        },
      })
    },
    [actions, t, gateways],
  )

  const columns = useMemo<DataColumn<PaymentGateway>[]>(
    () => [
      {
        id: 'name',
        header: t('fin.gateway.col.name'),
        dataType: 'text',
        minWidth: 200,
        sortField: 'name',
        cell: (gateway) => <span className="font-medium">{gateway.name}</span>,
        secondaryLine: (gateway) => (gateway.isDefault ? t('fin.gateway.default') : gateway.type),
      },
      {
        id: 'transactions',
        header: t('fin.gateway.col.transactions'),
        dataType: 'number',
        align: 'end',
        width: 148,
        /* **AC-423** — server-attributed per period, never a hardcoded value.
           Legacy prefix-matches a payment's `method` string (`:7457`), so a
           renamed gateway silently reattributes volume (**D-F16**). */
        cell: (gateway) => (
          <span className="tabular-nums">{formatCount(gateway.transactionCount, language)}</span>
        ),
      },
      {
        id: 'volume',
        header: t('fin.gateway.col.volume'),
        dataType: 'money',
        align: 'end',
        width: 160,
        cell: (gateway) => <MoneyCell amount={gateway.volumeHalalas} />,
      },
      {
        id: 'enabled',
        header: t('fin.gateway.col.enabled'),
        dataType: 'boolean',
        width: 200,
        cell: (gateway) => (
          <span className="flex items-center gap-2">
            <Switch
              id={`gateway-${gateway.id}`}
              checked={gateway.enabled}
              disabled={!gate.canWrite}
              aria-label={t('fin.gateway.toggle', { gateway: gateway.name })}
              onCheckedChange={(next) => void toggle(gateway, next)}
            />
            <Button
              variant="secondary"
              size="xs"
              disabled={!gate.canWrite || gateway.isDefault}
              title={gate.canWrite ? undefined : gate.reason}
              onClick={() => void makeDefault(gateway)}
            >
              {t('fin.gateway.action.setDefault')}
            </Button>
          </span>
        ),
      },
    ],
    [t, language, gate, toggle, makeDefault],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {refusal && (
        <Card className="gap-1">
          <p role="alert" className="px-(--card-spacing) text-sm text-foreground">
            {refusal}
          </p>
        </Card>
      )}
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(gateway) => gateway.id}
        status={gateways.status}
        total={rows.length}
        t={t}
        language={language}
        tableId="financials-gateways"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.gateway.search')}
        skeletonPattern="P1"
        firstRun={{
          heading: t('fin.gateway.empty.heading'),
          body: t('fin.gateway.empty.body'),
          actions: [
            { label: t('fin.gateway.empty.action'), onClick: () => onSelectTab('trial-balance') },
          ],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry: gateways.refetch }}
      />
    </div>
  )
}

/* ────────────────────────── VAT and invoicing ──────────────────────────── */

function VatView({ tabs, activeTab, onSelectTab }: ViewProps) {
  const shell = useShell()
  const { t, language } = shell.language
  const vat = useAsync<VatConfig>((signal) => getVatConfig(signal), { deps: [] })
  const sequence = useAsync<InvoiceSequence>((signal) => getInvoiceSequence(signal), { deps: [] })

  return (
    <div className="flex flex-col gap-3">
      <ViewTabs tabs={tabs} activeTab={activeTab} onSelectTab={onSelectTab} />

      {vat.status === 'loading' && <LoadingSkeleton pattern="P4" />}
      {vat.status === 'error' && (
        <ErrorState
          scope="card"
          message={t('fin.error.read')}
          action={{ label: t('fin.error.retry'), onClick: vat.refetch }}
        />
      )}

      {vat.data && (
        <Card className="gap-2">
          <div className="flex flex-col px-(--card-spacing)">
            <h2 className="pb-1 text-sm font-semibold text-foreground">{t('fin.vat.heading')}</h2>
            <FigureRow
              label={t('fin.vat.registrationNumber')}
              value={<span className="tabular-nums">{vat.data.registrationNumber}</span>}
            />
            <FigureRow label={t('fin.vat.companyLegalName')} value={vat.data.companyLegalName} />
            <FigureRow label={t('fin.vat.companyAddress')} value={vat.data.companyAddress} />
            <FigureRow
              label={t('fin.vat.ratePercent')}
              value={t('fin.vat.rate', { value: String(vat.data.ratePercent) })}
            />
          </div>
        </Card>
      )}

      {sequence.data && (
        <Card className="gap-2">
          <div className="flex flex-col px-(--card-spacing)">
            <h2 className="pb-1 text-sm font-semibold text-foreground">
              {t('fin.invoice.heading')}
            </h2>
            <FigureRow
              label={t('fin.invoice.next')}
              value={
                <span className="tabular-nums">
                  {sequence.data.prefix}
                  {formatCount(sequence.data.next, language)}
                </span>
              }
            />
            <FigureRow
              label={t('fin.invoice.lastIssued')}
              value={sequence.data.lastIssued ?? t('fin.invoice.none')}
            />
            {/* **AC-424** — the sequence is server-owned and read-only here.
                There is no control on this card that allocates a number. */}
            <p className="pt-1 text-xs text-muted-foreground">{t('fin.invoice.gapless')}</p>
          </div>
        </Card>
      )}
    </div>
  )
}

/** A view with cards instead of a table still needs the same control, in the same place. */
function ViewTabs({ tabs, activeTab, onSelectTab }: ViewProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-pressed={tab.id === activeTab}
          onClick={() => onSelectTab(tab.id)}
          className={
            tab.id === activeTab
              ? 'rounded-lg bg-accent px-2.5 py-1.5 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              : 'rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
