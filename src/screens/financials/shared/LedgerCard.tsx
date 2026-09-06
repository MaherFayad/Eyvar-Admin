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
 * **The conflict this was written against is now closed at the source.**
 * `DataTable` used to render `no-match` for **every** empty ledger, on §9.2's
 * reading *"a ledger is NEVER first-run empty"*, against **AC-427**'s *"a
 * ledger with no postings ever renders the first-run empty state — heading,
 * body and at least one action."* Both could not hold, and it was reported to
 * the shell owner as a genuine conflict rather than worked around silently.
 * **LR-1 narrowed §9.2** — the absolute is true of a *platform* ledger and was
 * generalised from one — and `DataTable`'s branch no longer keys off the mode
 * at all. Its `emptyKind` prop now carries the decision, and this file passes
 * `emptyKind="no-match"` below.
 *
 * **The guard below stays**, and it is no longer a workaround. **LR-3** says a
 * Financials first-run carries **no illustration**, and `EmptyState` cannot
 * express that from inside `DataTable`'s branch, which passes none of the three
 * knobs LR-3 needs. More to the point, the state replaces the whole card — the
 * toolbar and the column header row have nothing to operate on when a subject
 * has never had a posting — and `DataTable` has no branch that removes itself.
 * So the split is: **this file answers "has the subject ever posted"**
 * (`hasHistory`, a subject-lifetime server fact — **AC-485**, never the
 * envelope's window count), and `DataTable` answers "is this query narrowed".
 * That is §7.1's own distinction — *"a wallet with a zero balance and no
 * history is first-run; a wallet with history filtered to a date range with
 * nothing in it is filtered-to-zero"* — and it is now asked as two questions in
 * two places instead of one question standing in for both.
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
import { ViewFigureBlock, type ViewFigure } from './ViewRow'

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
   * `tableCeiling`, so the header never runs wider than the ledger it heads.
   *
   * `undefined` on a ledger whose columns declare no ceiling, which is the
   * pre-existing full-width behaviour.
   */
  maxInlineSize?: number
  /**
   * **R2-2** — figures that belong beside the balance rather than on a row of
   * their own. The Cash drill-in's cap is one: every balance under it is read
   * against it, so the two are adjacent clusters at the same size.
   */
  figures?: readonly ViewFigure[]
  /**
   * **AC-RW-07** — `false` drops the subject `<h2>`. A party drill-in already
   * names its record in the page title (O11); a platform ledger has nothing
   * else naming its book, so it keeps the heading.
   */
  showSubject?: boolean
}

/**
 * One column: the subject heading where a platform ledger needs one (AC-308),
 * the balance and the pending amount as peer figures (AC-312), and one line
 * stating which direction increases the balance and what pending excludes.
 */
export function LedgerHeader({
  ledger,
  t,
  maxInlineSize,
  figures = [],
  showSubject = true,
}: LedgerHeaderProps) {
  const definition = accountDefinition(ledger.subjectAccount)
  const subject =
    ledger.subjectName === null
      ? t('fin.ledger.subject.platform', { account: definition.label })
      : t('fin.ledger.subject.party', { account: definition.label, name: ledger.subjectName })
  const pending = ledger.pendingHalalas !== 0

  return (
    /* **One inline-start column, never `justify-between`.** A balance is a fact
       about the account named above it, so the heading, the figures and the
       line that explains them share one edge and sit one row apart (AC-RW-08 /
       AC-RW-10). `maxInlineSize` caps the block to the table's own width. */
    <div
      data-slot="ledger-header"
      className="flex flex-col items-start gap-2 pb-3"
      style={{ maxInlineSize }}
    >
      {showSubject && (
        <h2 className="max-w-full truncate text-sm font-semibold text-foreground">
          <bdi>{subject}</bdi>
        </h2>
      )}

      {/* Each figure is one cluster — label directly over its numeral, unit
          inline. §8.3.2: the sign is typographic, and no tone goes near it.
          Balance, then Pending, then whatever the caller ranks beside them. */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-2">
        <ViewFigureBlock
          figure={{
            label: t('fin.ledger.balance'),
            amountHalalas: ledger.closingBalanceHalalas,
          }}
          size="lg"
        />
        {/* **AC-312** — the pending amount is a peer figure, excluded from the
            balance, and absent at zero: a permanent `Pending 0.00 SAR` on every
            ledger in the product is noise. */}
        {pending && (
          <ViewFigureBlock
            figure={{ label: t('fin.ledger.pending'), amountHalalas: ledger.pendingHalalas }}
            size="lg"
          />
        )}
        {figures.map((figure) => (
          <ViewFigureBlock key={figure.label} figure={figure} size="lg" />
        ))}
      </div>

      {/* **AC-308** — which direction increases the balance, read from
          `CHART_OF_ACCOUNTS[k].normalSide`. The pending caveat rides the same
          line as a second sentence; the separator is drawn, never written into
          a string (AC-443). */}
      <p className="text-sm text-muted-foreground">
        <span>{t(`fin.ledger.normalSide.${definition.normalSide}`)}</span>
        {pending && (
          <>
            {' '}
            <span>{t('fin.ledger.pending.help')}</span>
          </>
        )}
      </p>
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
  /** **R2-2** — passed to `LedgerHeader`; figures beside the balance. */
  figures?: readonly ViewFigure[]
  /** **AC-RW-07** — forwarded to `LedgerHeader`. */
  showSubject?: boolean
  /**
   * **AC-429 / F-3** — the read failure's own sentence. `fin.error.read` names
   * the period and the filters, which a screen carrying neither cannot offer,
   * so such a screen states what did not arrive instead.
   */
  errorMessage?: string
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
  figures,
  showSubject,
  errorMessage,
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
        {ledger && (
          <LedgerHeader
            ledger={ledger}
            t={t}
            maxInlineSize={ceiling}
            figures={figures}
            showSubject={showSubject}
          />
        )}
        {banner}
        <EmptyState
          kind="first-run"
          heading={firstRun.heading}
          body={firstRun.body}
          actions={[firstRun.action]}
          /* **LR-3, and this branch is where Financials actually renders it.**
             *"No Financials empty state carries an illustration … an operator
             never creates a posting, so the illustration would sit above an
             action the product does not offer."* The action stays; the picture
             does not.

             Declared here rather than left to `DataTable`'s ledger default,
             because this `EmptyState` is not `DataTable`'s — the guard above
             replaces the whole card, so nothing in `DataTable` is mounted and
             no default it holds can reach this call. Every Financials ledger's
             first-run comes out of these six lines. */
          illustration={null}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {ledger && (
        <LedgerHeader
          ledger={ledger}
          t={t}
          maxInlineSize={ceiling}
          figures={figures}
          showSubject={showSubject}
        />
      )}
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
          /* Stated rather than inherited from `DataTable`'s ledger default.
             **LR-3 is a FINANCIALS rule, not a ledger-mode one** — it reaches
             this screen's index tables too, which are not ledger mode — so
             Financials declaring it is the honest direction. Unreachable while
             the guard above answers every first-run, and correct the moment it
             does not. */
          illustration: null,
        }}
        /**
         * **LR-2, declared rather than inherited from the mode.**
         *
         * `DataTable` used to force `no-match` on every ledger, so this said
         * nothing and got the right answer anyway. It no longer does, and
         * without this line the branch reached below would be **first-run** —
         * which is **D-F29** coming back: a quiet month on a ledger with years
         * of history rendering `No money has moved through this wallet`
         * directly beneath a header carrying a real opening balance.
         *
         * The guard above already answered the only first-run case there is
         * (`!hasHistory && !table.isFiltered`, **AC-427**). Everything that
         * reaches this table therefore has history, so an unfiltered zero here
         * is a **narrowed** empty in LR-2's sense — a quiet window — and takes
         * the one grey sentence. `hasHistory` decides it, exactly as **AC-485**
         * requires; the mode never could.
         */
        emptyKind="no-match"
        noMatch={{ message: t('fin.empty.noMatch') }}
        error={{ message: errorMessage ?? t('fin.error.read'), onRetry }}
      />
    </div>
  )
}

/** The em dash, for a caller holding `null` outside a money cell. */
export const ABSENT_MARK = ABSENT
