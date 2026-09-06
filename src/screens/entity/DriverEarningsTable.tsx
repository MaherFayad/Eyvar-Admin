/**
 * **The captain's payable ledger, in the product's own `DataTable`.**
 *
 * ```
 *  Payable movements                          [ Search postings ]  [ ⚙ ]
 *  2 postings · 1–30 Jun 2026
 *  ──────────────────────────────────────────────────────────────────────
 *  A credit is money earned. A debit is money paid out or deducted.  <caption>
 *  Date     Reference     Description        Debit    Credit    Balance
 *  Opening balance                                                0.00
 *  15 Jun   PAY-0101-1    Trip earnings          —    640.00    640.00
 *  25 Jun   PAY-0101-2    Trip earnings          —     12.60    652.60
 *  Closing balance                                               652.60
 * ```
 *
 * ## This is a payable, and it is not a wallet
 *
 * `liability.driver` runs the other way from a rider's wallet: a **credit**
 * means Eyvar owes this captain *more* — a trip earned, an escrow released —
 * and a **debit** means less: a payout, a deduction.
 * `clients/payouts.ts` fixes the convention and requires it be stated: *"the
 * header states that, once, and every row's `direction` is relative to it (§3.2,
 * AC-308)."* It is not guessable from the words `Debit` and `Credit`, and an
 * operator who reads this table as a bank statement reads every row backwards.
 *
 * **That sentence is `DataTable`'s `caption`, a real `<caption>` between the
 * toolbar row and the header row** — the designer's ruling on where it goes.
 * The paragraph this section used to render above the table was refused for
 * three reasons the slot's author states: it sat above a title that separated
 * it from the columns it defines; it was announced *before* the table and so
 * routinely skipped by anyone navigating by table or by heading, which makes a
 * convention that never reaches a screen-reader operator; and three ledgers
 * need the sentence, so a screen-local paragraph gets written three times and
 * drifts twice. Renaming `Credit` to `Earned` was refused with it — §8.3.3
 * requires the six ledger headers to be named literally, and a private
 * vocabulary is a worse trap than a visible one.
 *
 * ## Where the rider's ledger had to invent a number and this one does not
 *
 * `RiderMovementsTable` renders `<Money amount={0} />` as its opening balance
 * and says why in its own comment: *"`getRiderMoneyMovements` takes no period
 * and no page, so there is nothing before the first row for a balance to be
 * carried in from… the day this read gains a window the row needs that field
 * rather than this constant."*
 *
 * `getCaptainPayableLedger` returns a real `Ledger`, and both boundary figures
 * are **fields on the envelope** — `openingBalanceHalalas` and
 * `closingBalanceHalalas`. Nothing here computes either, and the day this
 * captain has history before the window the opening row is correct without a
 * change. That is the one place this surface is structurally better off than the
 * rider's, and it is worth naming because the rider's constant stops being true
 * silently.
 *
 * ## The window is stated, because it is a window
 *
 * The read takes a `FinancialsPeriod` and defaults to the product's current one,
 * so this table is **a month of the ledger and not the whole of it**. §5.4
 * refuses a silent truncation, so the period is named beside the count. The
 * strip's `payable to this captain` figure is `CaptainPayout.payableHalalas` —
 * the **live, unwindowed** `liability.driver` balance — and the two agree
 * whenever the window ends at or after today, which is every case the product
 * currently produces. They are labelled as what they are so that the day they
 * differ, the difference reads as two questions rather than as a contradiction.
 *
 * ## Selection, row actions, sort — none, and it is a compile error
 *
 * `useIndexTable({ mode: 'ledger' })` returns `LedgerTable`, which has no
 * `sort`, no `setSortField`, no `selectedIds` and no `toggleRow` **at all**, so
 * §8.3.3's *"§3.1 row actions and §3.3 bulk selection MUST NOT appear on a
 * ledger"* is enforced by `tsc` rather than by review. The one per-row
 * affordance §8.3.3 permits is a read-only link to the source document, and
 * `ledgerColumns` already renders it through `sourceLinkFor`, which gates it to
 * trips so no row links to a route that 404s.
 *
 * ## The columns are `ledgerColumns`, imported
 *
 * Not re-declared. `getCaptainPayableLedger` returns `LedgerPosting[]` — the
 * same type `LedgerCard` is built over — so §7.6's *"reuse `ledgerColumns`"*
 * applies here literally, where the rider had to restate the set over a
 * bespoke envelope. A second spelling of a column set is a second contract that
 * has not noticed yet.
 *
 * Rules applied
 *   §8.3.3/AC-302  direction is the COLUMN. No row carries a value in both, and
 *                  the other renders an em dash.
 *   §8.3.1         the unit is in each money header once and in no cell.
 *   AC-311/312     `balanceAfterHalalas` verbatim; an em dash where it is
 *                  `null`, which is every unsettled row.
 *   R4             money columns are `align: 'end'`, and that does NOT flip in
 *                  Arabic (§9.2).
 *   R5a            `failed` / `escalated` take the critical row GROUND plus
 *                  the word in the description. Never a badge.
 *   §11.3          the ledger skeleton, `P7`. No spinner.
 *   §7.1           the section title is `DataTable`'s `heading`, so it shares a
 *                  row with the toolbar's control cluster and the count reads
 *                  as its subtitle. `tabs` and `heading` are one slot and the
 *                  type says so; this table has no tabs.
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/DataTable'
import { Money } from '@/components/Money'
import type { Ledger, LedgerPosting } from '@/data/types'
import { useIndexTable, type AsyncResult } from '@/hooks'
import { formatDate, formatLocalisedText } from '@/lib'
import type { Language, Translator } from '@/lib'
import { ledgerColumns } from '@/screens/financials/shared/LedgerCard'

export interface DriverEarningsTableProps {
  /** Owned by the page. This component renders what it is given and fetches nothing. */
  result: AsyncResult<Ledger>
  /** Where the first-run empty's one action goes — Financials › Payouts. */
  payoutsPath: string
  t: Translator
  language: Language
}

/** R5a use #3, DECLARED. Never duck-typed off the shape of a value. */
function isCritical(row: LedgerPosting): boolean {
  return row.settlement === 'failed' || row.settlement === 'escalated'
}

export function DriverEarningsTable({
  result,
  payoutsPath,
  t,
  language,
}: DriverEarningsTableProps) {
  /* §8.3.3 — the MODE is the contract, and it is what makes "no selection, no
     sort, no row actions" a compile error rather than a review note.

     `urlState` stays at the ledger default (`false`): this table shares its
     address with a profile page that carries `?entity=` and nothing of its own,
     and a `?q=` written here would be inherited by whatever index the back
     control returns to. */
  const table = useIndexTable({ mode: 'ledger' })
  const navigate = useNavigate()

  const ledger = result.data
  /* **Oldest-first as returned, and that is required rather than preferred.**
     `buildLedger` returns postings oldest-first (AC-317) because a running
     balance is only meaningful in posting order, and the opening row has to sit
     above the first movement it precedes. The SHEET reverses the same rows into
     its six-row card, which is an arrangement difference between two surfaces
     and not a disagreement about a fact. */
  const postings = useMemo(() => ledger?.postings ?? [], [ledger])
  const query = (table.params.q ?? '').trim().toLowerCase()

  const rows = useMemo(() => {
    if (query === '') return postings
    /* The envelope is unwindowed within its period and unpaginated by contract
       — `getCaptainPayableLedger` takes no `QueryParams` — so the whole window
       is in memory and narrowing it here narrows all of it rather than a page
       of it. It matches only what the operator can SEE. **Reported** as a
       request for `getCaptainPayableLedger(captainId, period, params)`, so this
       becomes the server's answer like every other table's. */
    return postings.filter((row) =>
      [formatLocalisedText(row.description, t), row.reference ?? row.id, t(`fin.settlement.${row.settlement}`)]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [postings, query, t])

  const columns = useMemo(() => ledgerColumns(t, language), [t, language])

  /* A search that narrows to nothing is the OTHER empty: `table.isFiltered` is
     true, so `DataTable` renders `no-match` rather than first-run. The read's
     own `isEmpty` is disabled (`reads.ts`) because a `Ledger` is an envelope,
     not a list — a ledger with no postings in the window still has an opening
     balance, a closing balance and a period, all of which render. */
  const status =
    result.status === 'content' && rows.length === 0 ? ('empty' as const) : result.status

  /* §5.4 — the count AND the window, because the table is a month of a ledger
     rather than the whole of it. Two facts with a decorative separator between
     them, never one sentence built from two translated fragments (§9.6). */
  const note =
    ledger === null
      ? null
      : `${t.plural('entity.driver.ledger.count', { count: ledger.totalPostings })} · ${period(
          ledger,
          t,
          language,
        )}`

  return (
    <section className="flex flex-col gap-3">
      {/* **The heading is INSIDE the table**, not above it — owner instruction:
          the title and the toolbar's control cluster share one row, and the
          count reads as a subtitle beneath the title rather than beside it.
          `IndexToolbar` types the slot as a union, so a table cannot carry view
          tabs and a heading at once; this one has no tabs, so it takes the
          heading arm unchanged. */}
      <DataTable
        heading={t('entity.driver.ledger.title')}
        /* §5.4 — the count and the window, as the subtitle. `null` until the
           envelope lands, so the subtitle never claims a window it has not
           read. */
        subheading={note}
        /* **AC-308's convention, as a real `<caption>` between the toolbar and
           the header row** — the designer's ruling, and it beats the paragraph
           this section used to render above the table on all three counts the
           slot's author sets out. It sits at the point of confusion rather than
           above a title that separates it from the columns it defines; it is
           the only form assistive technology reads as **part of** the table, so
           an operator navigating by table or by heading still hears it; and the
           sentence is one key rather than three screen-local paragraphs that
           drift.

           It renders only in `content`, which is correct rather than a gap: a
           sign convention has nothing to define over a skeleton, over §11.3's
           header-less error, or over one grey sentence of empty. */
        caption={t('profile.driver.earnings.direction')}
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        status={status}
        total={postings.length}
        t={t}
        language={language}
        tableId="profile.captainPayable"
        searchPlaceholder={t('entity.driver.ledger.search')}
        skeletonPattern="P7"
        /* R5a use #3 — the same predicate the description's words use, so the
           row's two carriers cannot disagree. */
        isRowCritical={isCritical}
        /* A profile shows a bounded window and states it in words; there is no
           `nextPage` to call. */
        infiniteScroll={false}
        /* No avatars in a ledger. */
        rowMedia={false}
        ledgerBoundaryRows={
          ledger === null
            ? undefined
            : {
                alignTo: 'balance',
                opening: {
                  label: t('fin.ledger.opening'),
                  /* **A FIELD, not a constant.** `openingBalanceHalalas` is the
                     balance carried into `periodStart`, computed server-side.
                     Nothing here sums anything to get it, and it stays correct
                     the day this captain has history before the window. */
                  value: <Money amount={ledger.openingBalanceHalalas} unit="none" />,
                },
                closing: {
                  label: t('fin.ledger.closing'),
                  /* AC-318 — ONE field, never a re-sum of the rows above it.
                     `types/ledger.ts` fixes it as *"the last settled row's
                     `balanceAfterHalalas`"*, computed once where the postings
                     are. A table that recomputed its own total would disagree
                     with the strip the first time a row was unsettled. */
                  value: <Money amount={ledger.closingBalanceHalalas} unit="none" />,
                },
              }
        }
        /**
         * ① — the captain has never earned. `lifetimePostings === 0`.
         *
         * **This should carry NO illustration, and today it does — a known
         * defect, recorded rather than worked around.** LR-3: R8 *permits* an
         * illustration on a whole-page zero-records-ever state and does not
         * *require* one, and no Financials empty takes it, because an operator
         * never creates a posting. The heading, the body and the action stay
         * (AC-427).
         *
         * `DataTable.firstRun` is typed `{ heading; body; actions }` with no
         * illustration field, and its render falls to `EmptyState`'s default
         * art. `EmptyState` already accepts `illustration?: ReactNode | null`
         * where **`null` renders none** — its own doc says that arm exists so a
         * caller can suppress it — so the fix is one passthrough in
         * `components/DataTable.tsx`, which is not this file. **Routed as one
         * fix for two screens:** the rider's wallet ledger is AC-427's own
         * example and draws the same forbidden illustration through the same
         * branch.
         *
         * Not worked around. Suppressing the empty, or declaring `no-match` for
         * a captain who has genuinely never earned, would trade a visible
         * cosmetic defect for a false sentence.
         *
         * §11.1 wants at least one action and there is exactly one honest one —
         * nobody CREATES a posting, so it returns to where this captain's money
         * is actually worked. A handler that did nothing would be worse than no
         * action at all.
         */
        firstRun={{
          heading: t('entity.driver.ledger.empty.heading'),
          body: t('entity.driver.ledger.empty.body'),
          actions: [
            {
              label: t('entity.driver.ledger.empty.action'),
              onClick: () => navigate(payoutsPath),
            },
          ],
        }}
        /**
         * **Three empties, not two — LR-2's defect, fixed.**
         *
         * This table declared `firstRun` and no `emptyKind`, so `DataTable`
         * defaulted to `first-run` and a captain with years of history and one
         * quiet month was told *"Nothing has been posted yet"*. `types/ledger.ts`
         * documents that trap at length: `totalPostings === 0` means nothing
         * happened **in the window you asked for**, which a subject with history
         * has every quiet month. `lifetimePostings` is the field that answers
         * "has this ever happened", and this file's own copy comment already
         * claimed the empty was decided from it — the comment was right and the
         * code was not.
         *
         * `cleared` is deliberately NOT used: LR-4 rules that a ledger never
         * renders it, because that is a work queue's empty and a ledger is not
         * worked to zero. A quiet window is a **narrowed** result whose sentence
         * names what narrowed it, which is `no-match`'s job.
         */
        emptyKind={ledger !== null && ledger.lifetimePostings === 0 ? 'first-run' : 'no-match'}
        /* ② and ③ — the two NARROWED empties, and they are different sentences
           because different things narrowed them. A filter the operator set is
           theirs to clear; a window they did not choose is not, so ② names the
           window and offers no action.

           Both keys are SHARED. `entity.driver.ledger.noMatch` used to sit here
           saying `No postings match this search.` and was deleted with LR-4: it
           was a second spelling of `fin.empty.noMatch`, which every other ledger
           already uses, and the rider's wallet needs the identical pair.

           **`ledger === null` is unreachable and is guarded anyway.** `status`
           is only `'empty'` when the read is `content`, which means the envelope
           landed — but the type says `Ledger | null` and a guard that costs
           nothing beats a non-null assertion that is only true by argument. */
        noMatch={{
          message:
            table.isFiltered || ledger === null
              ? t('fin.empty.noMatch')
              : /* **Two formatted DATES, not a translated range fragment.**
                   This first shipped as one `{period}` param fed by `period()`,
                   which returns `من {start} إلى {end}` — so Arabic rendered
                   *"no postings during **from** 1 June to 30 June"*, one
                   sentence assembled from two translated fragments with the
                   nesting visible only once both were rendered. §9.6 / AC-75.

                   LR-4's own wording avoids it without a range formatter at
                   all, because the sentence IS the range: it interpolates two
                   values, and a date is a value. `period()` keeps its real job
                   in the subheading. Fixed in the shared key, because the
                   rider's wallet calls it next.

                   **The unwindowed ledger cannot reach this branch.** With no
                   window every posting is in scope, so `totalPostings === 0`
                   implies `lifetimePostings === 0` and `emptyKind` is
                   `first-run` above. Guarded rather than asserted. */
                ledger.periodStart === null || ledger.periodEnd === null
                  ? t('fin.empty.noMatch')
                  : t('fin.ledger.empty.period', {
                      start: formatDate(ledger.periodStart, { style: 'day-month', language }),
                      end: formatDate(ledger.periodEnd, { style: 'day-month-year', language }),
                    }),
        }}
        error={{
          message: t('profile.state.error', { section: t('entity.driver.ledger.title') }),
          onRetry: result.refetch,
        }}
      />
    </section>
  )
}

/**
 * The window this table covers, as one key with two named parameters.
 *
 * `periodStart` and `periodEnd` are both nullable — a ledger read with no
 * window has neither — so the unwindowed case says so in its own sentence
 * rather than rendering `null to null` or a half-built range (§9.6).
 */
function period(ledger: Ledger, t: Translator, language: Language): string {
  if (ledger.periodStart === null || ledger.periodEnd === null) {
    return t('entity.driver.ledger.allTime')
  }
  return t('entity.driver.ledger.period', {
    start: formatDate(ledger.periodStart, { style: 'day-month', language }),
    end: formatDate(ledger.periodEnd, { style: 'day-month-year', language }),
  })
}
