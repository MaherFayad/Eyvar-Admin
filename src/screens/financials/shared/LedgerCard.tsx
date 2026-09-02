/**
 * The §8.3 ledger — the one construction five Financials sub-tabs render.
 *
 * `DESIGN.md` §8.3, spec §6.1 and §9.2. Every criterion from **AC-300** to
 * **AC-324** lands in this file or in the six columns beside it, which is the
 * point: five screens sharing one ledger cannot disagree about what a closing
 * balance means, and the legacy app's `finance`, `wallets`, `rwallets` and
 * `ledger` pane all do.
 *
 * ## What the table mode does for free, and what it forbids
 *
 * `useIndexTable({ mode: 'ledger' })` has **no** `sort`, no `setSortField`, no
 * `selectedIds` and no `toggleRow` *at all*, so **AC-313**, **AC-314**,
 * **AC-316** and **AC-325** are enforced by `tsc` rather than by review — a
 * sort control in a ledger header does not compile. **AC-315** is this file's
 * to keep: the only row-level affordance below is a link to the source
 * document, and no `rowActions` are declared.
 *
 * Rules applied
 *   §8.3 / AC-321
 *              Date · Reference · Description · Debit · Credit · Balance, in
 *              that order, with the three money columns inline-END so each
 *              shares its header's edge (R4).
 *   §8.3.1 / AC-322
 *              the unit is in the column HEADER once and in no cell of that
 *              column, which is what `MoneyCell`'s default already does.
 *   §8.3.3 / AC-302
 *              a posting renders in the column named by its `direction` and an
 *              em dash in the other. **No row has a value in both.**
 *   §8.3.2 / AC-309
 *              a negative balance is U+2212 in ordinary ink — never a badge,
 *              never parentheses, never colour alone.
 *   AC-311     the balance column renders `balanceAfterHalalas` **exactly**.
 *              Nothing here re-sums anything, so editing an earlier amount in a
 *              fixture cannot move a later row.
 *   AC-312     a pending settlement renders an em dash in the balance column,
 *              and its amount is on the separate `Pending` line beneath the
 *              header balance rather than inside it.
 *   AC-317/318 labelled opening and closing rows, emboldened; the closing
 *              figure is the header balance, from one field.
 *   AC-319     the two column totals are computed from the RENDERED rows.
 *   AC-320     `Showing {shown} of {total} postings`, in words, below the last
 *              row. No ledger caps silently.
 *   R5a        `failed` and `escalated` take the 3px leading marker, the words
 *              in the description and a page banner the SCREEN raises. Never a
 *              badge — R5 leaves no red one and R7's five tones are closed.
 *
 * ## The one place this file overrides `DataTable`, and why
 *
 * `DataTable` renders `no-match` for **every** empty ledger — its §9.2 reading
 * is *"a ledger is NEVER first-run empty"*. **AC-427 says the opposite**: *"a
 * ledger with no postings ever renders the first-run empty state — heading,
 * body and at least one action."* Both cannot hold.
 *
 * They are reconciled here rather than in `DataTable`, which is Phase 0's file:
 * when the caller says this subject has **no history at all**, the first-run
 * state renders in place of the table; when it has history and the query
 * narrowed it to nothing, `DataTable`'s `no-match` renders exactly as it does
 * today. That is §7.1's own distinction — *"a wallet with a zero balance and no
 * history is first-run; a wallet with history filtered to a date range with
 * nothing in it is filtered-to-zero"* — and the caller is the only one that
 * knows which it is holding. Reported to the shell owner as a genuine conflict
 * between AC-427 and `DataTable`'s ledger branch.
 */

import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  accountDefinition,
  SETTLEMENT_BADGE_TONE,
  type Ledger,
  type LedgerPosting,
} from '@/data/types'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { tableCeiling } from '@/components/table/columns'
import { EmptyState } from '@/components/EmptyState'
import { Money, MoneyCell } from '@/components/Money'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import type { LedgerTable } from '@/hooks'
import { ABSENT, formatCount, formatDate, formatMoney, type Language, type Translate } from '@/lib'
import { localisedText } from './text'

/* ───────────────────────────── the source link ──────────────────────────── */

/**
 * **AC-315** — a ledger row's one and only affordance, and **AC-354** — it
 * resolves to a real record.
 *
 * `/entity/:id` resolves riders, captains, applicants, trips, subscriptions and
 * corporate accounts, and nothing else. A payout, a deduction, an escrow hold
 * and a cash report have **no route in this product**, so those rows render
 * their reference as text rather than as a link that 404s.
 *
 * That is the same rule §6.3 applies to a credit note's invoice: *"never
 * guessed"*. A link that resolves to nothing is a guess about the route table.
 */
const LINKABLE_SOURCES: ReadonlySet<LedgerPosting['sourceType']> = new Set(['trip'])

export function sourceLinkFor(posting: LedgerPosting): string | null {
  if (posting.sourceId === null) return null
  return LINKABLE_SOURCES.has(posting.sourceType) ? `/entity/${posting.sourceId}` : null
}

/* ───────────────────────────── the six columns ──────────────────────────── */

/**
 * §7.3's width budget: 104 + 128 + (240 floor) + 116 + 116 + 128 = **832**,
 * inside the 870 an Arabic 1280 leaves. **Description is the one flexible
 * column** — it declares a floor and no width, so it absorbs the residual and
 * it is the only cell that may wrap. The three money columns cannot: a
 * truncated amount is the one value a reader cannot tell is truncated (§7.3
 * rule 5).
 */
export function ledgerColumns(t: Translate, language: Language): DataColumn<LedgerPosting>[] {
  return [
    {
      id: 'date',
      header: t('fin.ledger.col.date'),
      dataType: 'date',
      width: 104,
      cell: (row) => (
        <span className="relative block">
          {/* R5a use #3 — `failed` and `escalated` carry the marker, and the
              words are in the description beside it, so greyscale still shows
              which row it is (**AC-310**). The marker rides the first cell,
              which is the implicitly pinned one, so it survives a horizontal
              scroll. */}
          {isCritical(row) && <RowCriticalMarker />}
          <span className="tabular-nums">
            {formatDate(row.postedAt, { style: 'day-month', language })}
          </span>
        </span>
      ),
    },
    {
      id: 'reference',
      header: t('fin.ledger.col.reference'),
      dataType: 'id',
      width: 128,
      cell: (row) => (
        <span className="block truncate font-medium tabular-nums">
          <bdi>{row.reference ?? row.id}</bdi>
        </span>
      ),
    },
    {
      id: 'description',
      header: t('fin.ledger.col.description'),
      dataType: 'text',
      /* §7.3 rule 2 — the one flexible column. It is also the only cell §14's
         row anatomy allows to wrap. */
      minWidth: 240,
      /* **The ceiling, and the number is a measure rather than a taste.** A
         posting description is prose (`Referral reward for introducing Sara
         Al-Ghamdi`) plus a secondary line, and prose stops being readable past
         roughly 90 characters. At `--text-sm` (14px) Inter averages ~7.1px a
         character, so 90ch is ~640px. Below that the column still wraps rather
         than truncating, which is what §14 already allows this one cell to do.

         What it buys is measured on `/financials/revenue` at 2400: the column
         was 1,406px and the table 1,998px, so every `Debit` figure sat ~1,100px
         from the text it belonged to. */
      maxWidth: 640,
      cell: (row) => <span className="block">{localisedText(t, row.description)}</span>,
      secondaryLine: (row) => <LedgerRowMeta row={row} t={t} />,
    },
    {
      id: 'debit',
      header: t('fin.ledger.col.debit'),
      dataType: 'money',
      align: 'end',
      width: 116,
      /* **AC-302 / AC-303.** The column is chosen by `direction` and never by a
         sign, and a zero-amount posting still renders `0.00` in the column its
         direction names rather than an em dash. */
      cell: (row) => <MoneyCell amount={row.direction === 'debit' ? row.amountHalalas : null} />,
    },
    {
      id: 'credit',
      header: t('fin.ledger.col.credit'),
      dataType: 'money',
      align: 'end',
      width: 116,
      cell: (row) => <MoneyCell amount={row.direction === 'credit' ? row.amountHalalas : null} />,
    },
    {
      id: 'balance',
      header: t('fin.ledger.col.balance'),
      dataType: 'money',
      align: 'end',
      width: 128,
      /* **AC-311 / AC-312.** Rendered exactly as persisted; `null` on a
         non-settled row, which `Money` renders as an em dash. Nothing here
         recomputes and nothing here substitutes a zero. */
      cell: (row) => <MoneyCell amount={row.balanceAfterHalalas} />,
    },
  ]
}

function isCritical(posting: LedgerPosting): boolean {
  return posting.settlement === 'failed' || posting.settlement === 'escalated'
}

/**
 * The identity cell's second line: the settlement in words, the source link,
 * and the reversal cross-reference.
 *
 * **AC-329** — a reversed row keeps its amount, its column, its balance and its
 * place, and says `Reversed` in the neutral tone with a pointer to the row that
 * reversed it. **AC-326** — the reversing row names the original.
 */
function LedgerRowMeta({ row, t }: { row: LedgerPosting; t: Translate }) {
  const tone = SETTLEMENT_BADGE_TONE[row.settlement]
  const to = sourceLinkFor(row)

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {/* R5 — `failed` and `escalated` have NO tone, on purpose. They read as
          words in the description; the row's marker is the visual half. */}
      {tone !== null ? (
        <StatusBadge tone={tone}>{t(`fin.settlement.${row.settlement}`)}</StatusBadge>
      ) : (
        <span className="font-medium text-foreground">{t(`fin.settlement.${row.settlement}`)}</span>
      )}
      {row.reversedByPostingId !== null && (
        <span>{t('fin.ledger.reversedBy', { reference: row.reversedByPostingId })}</span>
      )}
      {to !== null && (
        <Link
          to={to}
          className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('fin.ledger.source')}
        </Link>
      )}
    </span>
  )
}

/* ─────────────────────────── the card header ────────────────────────────── */

export interface LedgerHeaderProps {
  ledger: Ledger
  t: Translate
  /**
   * The width the table beneath this header stops growing at, from
   * `tableCeiling`. The header ends where the table ends, so the balance sits
   * over the balance column instead of at the far edge of the viewport.
   *
   * `undefined` on a ledger whose columns declare no ceiling, which is the
   * pre-existing full-width behaviour.
   */
  maxInlineSize?: number
}

/**
 * **AC-308** — the subject account in words, plus the sub-line stating which
 * direction increases the balance, read from `CHART_OF_ACCOUNTS[k].normalSide`
 * so no screen writes the accounting convention twice.
 *
 * **AC-312** — the `Pending` line is a separate labelled line beneath the
 * balance and is excluded from it. It renders only when something is pending:
 * a permanent `Pending 0.00 SAR` on every ledger in the product is noise, and
 * §10's *"a count of zero renders no badge"* is the same instinct.
 */
export function LedgerHeader({ ledger, t, maxInlineSize }: LedgerHeaderProps) {
  const definition = accountDefinition(ledger.subjectAccount)
  const subject =
    ledger.subjectName === null
      ? t('fin.ledger.subject.platform', { account: definition.label })
      : t('fin.ledger.subject.party', { account: definition.label, name: ledger.subjectName })

  return (
    /* **The header is capped to the table's own width.** Measured before this
       on `/financials/wallets` at 2400: the account name ended at x=689 and its
       `Balance` block began at x=2400 — **1,711px apart**, the second-worst
       instance of the defect in the product after the boundary rows. It is not
       a `justify-between` problem: an account name at one edge and its balance
       at the other is the right shape for this pair, and it reads correctly at
       1280. What was wrong is that the pair was allowed to stretch to a width
       the table beneath it does not use.

       Ending where the table ends puts the balance over the balance column,
       which is the same argument the boundary rows make one row lower. */
    <div
      className="flex flex-wrap items-end justify-between gap-3 pb-3"
      style={{ maxInlineSize }}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="truncate text-sm font-semibold text-foreground">
          <bdi>{subject}</bdi>
        </h2>
        <p className="text-xs text-muted-foreground">
          {t(`fin.ledger.normalSide.${definition.normalSide}`)}
        </p>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <span className="text-xs text-muted-foreground">{t('fin.ledger.balance')}</span>
        {/* §8.3.2 — the sign is typographic. `Money` renders U+2212 in ordinary
            ink and there is no tone anywhere near it. */}
        <Money amount={ledger.closingBalanceHalalas} className="text-lg font-semibold" />
        {ledger.pendingHalalas !== 0 && (
          <span className="text-xs text-muted-foreground">
            {t('fin.ledger.pending')} <Money amount={ledger.pendingHalalas} />
          </span>
        )}
        {ledger.pendingHalalas !== 0 && (
          <span className="text-xs text-muted-foreground">{t('fin.ledger.pending.help')}</span>
        )}
      </div>
    </div>
  )
}

/* ───────────────────────────── the ledger card ──────────────────────────── */

export interface LedgerCardProps {
  table: LedgerTable
  ledger: Ledger | null
  /** The four states, from `useAsync`. */
  status: 'loading' | 'error' | 'empty' | 'content'
  /** The rows as rendered — already narrowed by the toolbar query. */
  rows: readonly LedgerPosting[]
  t: Translate
  language: Language
  tableId: string
  tabs?: readonly { id: string; label: string }[]
  activeTab?: string
  onSelectTab?: (id: string) => void
  onRetry: () => void
  /**
   * **AC-427's two empties.** `false` means this subject has never had a
   * posting — the first-run state. `true` means it has history and the query
   * narrowed it away — `no-match`. The caller knows; this component cannot.
   *
   * **Read it from `Ledger.lifetimePostings`, never from `totalPostings`.**
   * `totalPostings` counts postings *in the selected window*, so deriving this
   * from it answers *"does this subject have history?"* with *"were there rows
   * in this window?"* — the question being asked. A captain with years of
   * history and one quiet month then renders `No money has moved here yet`
   * directly beneath a header carrying a real opening balance. All four call
   * sites did exactly that until AC-427's quiet-window case caught it.
   */
  hasHistory: boolean
  firstRun: { heading: string; body: string; action: { label: string; onClick: () => void } }
  /** Rendered above the table — the R5a page banner a screen raises for its own rows. */
  banner?: ReactNode
}

export function LedgerCard({
  table,
  ledger,
  status,
  rows,
  t,
  language,
  tableId,
  tabs = [],
  activeTab = '',
  onSelectTab,
  onRetry,
  hasHistory,
  firstRun,
  banner,
}: LedgerCardProps) {
  const columns = useMemo(() => ledgerColumns(t, language), [t, language])
  /* One derivation, two consumers: `DataTable` caps the table and its band with
     this same function, and the header above the table is capped to match. Two
     separate sums would be free to drift by a column width. */
  const ceiling = useMemo(() => tableCeiling(columns), [columns])

  /* **AC-319** — the totals are of the RENDERED rows, so a narrowed ledger's
     totals describe what is on screen rather than what is behind it. */
  const totals = useMemo(() => {
    let debits = 0
    let credits = 0
    for (const row of rows) {
      if (row.direction === 'debit') debits += row.amountHalalas
      else credits += row.amountHalalas
    }
    return { debits, credits }
  }, [rows])

  /* The override this file's header explains: a subject with no history at all
     gets AC-427's first-run state instead of `DataTable`'s `no-match`. */
  if (status === 'empty' && !hasHistory && !table.isFiltered) {
    return (
      <div className="flex flex-col">
        {ledger && <LedgerHeader ledger={ledger} t={t} maxInlineSize={ceiling} />}
        {banner}
        <EmptyState
          kind="first-run"
          heading={firstRun.heading}
          body={firstRun.body}
          actions={[firstRun.action]}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {ledger && <LedgerHeader ledger={ledger} t={t} maxInlineSize={ceiling} />}
      {banner}
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        status={status}
        total={ledger?.totalPostings ?? 0}
        t={t}
        language={language}
        tableId={tableId}
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        searchPlaceholder={t('fin.ledger.search')}
        /* **R5a — the same predicate the leading-edge marker uses**, so the
           row's two carriers cannot disagree. `DataTable` no longer guesses:
           it tested `row.status`, and a posting's state is `settlement`, so
           `failed` and `escalated` were the one thing the ledger DOES call
           critical (`types/ledger.ts`) and the only rows it never tinted. */
        isRowCritical={isCritical}
        /* §11.3 — the LEDGER skeleton: its own six columns, never a spinner
           (**AC-426**). */
        skeletonPattern="P7"
        ledgerBoundaryRows={
          ledger
            ? {
                /* **AC-317 / AC-318.** Both rows are labelled and bold on both
                   sides, and the closing figure is the same field the header
                   renders — one value, two places, no arithmetic between them.

                   **The layout is no longer written here, and that is the
                   fix.** This used to hand `DataTable` one node per row and lay
                   it out with `justify-between` inside a cell spanning every
                   column — which put 1,828px between `Opening balance` and
                   `0.00` at 2400px. The screen was describing a POSITION it
                   could not see the columns of. It now states the three parts
                   and names the column the figure belongs under; where that
                   lands is the table's arithmetic, at every width and in both
                   directions. */
                alignTo: 'balance',
                opening: {
                  label: t('fin.ledger.opening'),
                  value: <Money amount={ledger.openingBalanceHalalas} unit="none" />,
                },
                closing: {
                  label: t('fin.ledger.closing'),
                  /* **AC-322** — the unit is in the column headers and in
                     nothing beneath them, this summary included. It sits beside
                     the LABEL now: it is a description of the row, and putting
                     it in the balance column would be a second number in a
                     column of balances. */
                  note: (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t('fin.ledger.totals', {
                        debits: formatMoney(totals.debits, { unit: 'none' }),
                        credits: formatMoney(totals.credits, { unit: 'none' }),
                      })}
                    </span>
                  ),
                  value: <Money amount={ledger.closingBalanceHalalas} unit="none" />,
                },
              }
            : undefined
        }
        /* **AC-320** — stated in words, below the last row, whenever the window
           holds fewer postings than the ledger has. */
        learnMore={
          ledger && ledger.returnedPostings < ledger.totalPostings ? (
            <span className="text-sm text-muted-foreground">
              {t('fin.ledger.truncated', {
                shown: formatCount(ledger.returnedPostings, language),
                total: formatCount(ledger.totalPostings, language),
              })}
            </span>
          ) : undefined
        }
        firstRun={{
          heading: firstRun.heading,
          body: firstRun.body,
          actions: [firstRun.action],
        }}
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: t('fin.error.read'), onRetry }}
      />
    </div>
  )
}

/** The em dash, for a caller holding `null` outside a money cell. */
export const ABSENT_MARK = ABSENT
