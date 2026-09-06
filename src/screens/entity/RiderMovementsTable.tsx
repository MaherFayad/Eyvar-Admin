/**
 * **The rider's money, in the product's own `DataTable`** — owner amendment 2,
 * spec §7.6, AC-RP-50 … AC-RP-64.
 *
 * ```
 *  Wallet and payments   2 movements ─────────────────────────────────────────
 *
 *  Date     Reference     Description      Debit    Credit    Balance
 *  Opening balance                                              0.00
 *  31 May   WTX-4002-T1   Wallet top-up        —    120.00    120.00
 *  19 Jun   WTX-4002-T2   Wallet top-up        —     80.00    200.00
 *  Closing balance                                            200.00
 * ```
 *
 * ## The rows are the ones the two boundary rows frame, and nothing else
 *
 * This table is opened by `Opening balance 0.00` and closed by `Closing balance
 * 200.00`, so it may contain **only the rows that get it from one to the
 * other**. The rider's four money movements include two `mada` captures that
 * never touched `liability.wallet`; put all four between those figures and an
 * operator reads four rows summing to `+38.00` between two balances 200.00
 * apart. A money table that visibly does not add up is the worst outcome
 * available on this screen, and it is exactly what the reference drawing
 * produces. The two card payments render in the `Payments` group beside this
 * one, where their own settlement state is the subject.
 *
 * ## The owner's three questions, answered
 *
 * **Selection — no, and it is not a preference.** Read `useIndexTable.ts:246`:
 * `selectable = mode === 'index' || (mode === 'queue' && bulkClaim === true)`.
 * Selection **follows from bulk actions**, and this table offers none — there
 * is no operation in the data layer that acts on a set of a rider's movements,
 * and a checkbox column whose only purpose is to enable an `Export` the toolbar
 * already offers unselected is a control with nothing behind it. So `ledger`,
 * whose `LedgerTable` has no `selectedIds` and no `toggleRow` **at all**: a
 * checkbox bound to this table does not compile (AC-48, AC-RP-51).
 *
 * **Row actions — no, same mechanism.** `canRowAction` is the literal type
 * `false`. §8.3.3 permits exactly one per-row affordance on a ledger, a
 * read-only link to the source document, and `sourceLinkFor` already gates that
 * to trips so no row links to a route that 404s (AC-RP-64). None of this
 * rider's movements has a `trip` source, so no link renders — which is the
 * gate working, not a gap.
 *
 * **The closing balance — a BOUNDARY ROW, never a row in `rows`.** A balance is
 * not a movement. Put it in `rows` and it becomes a `RiderMoneyMovement` that
 * is not one: a fabricated id, counted in `total`, caught by the search box,
 * exported to CSV as though a fifth movement had happened, and — the day this
 * table is ever given selection or sort — selectable and sortable beside four
 * real records. `ledgerBoundaryRows` renders **outside** the row set, and §8.3.3
 * requires the labelled opening row that comes with it, so the pair is not
 * optional and the type says so (AC-RP-56).
 *
 * `alignTo: 'balance'` is what makes it honest. The figure lands **under the
 * column it totals**; the full-span alternative measured **1,828px** between
 * `Opening balance` and its `0.00` on `/financials/wallets` at 2400px.
 *
 * ## The one place this departs from §7.6, and why
 *
 * §7.6 says *"reuse `ledgerColumns`"*, which is typed over `LedgerPosting` and
 * fed by `getWalletLedger`. The data layer has since shipped
 * `getRiderMoneyMovements`, built **for this card**, whose own header explains
 * why: a top-up is a `liability.wallet` posting and a quick-ride fare is a
 * `mada` capture that never touched the wallet, *"an operator does not care,
 * and should not have to"*. It is also the only source that produces the
 * figures the design draws. `getWalletLedger` would serve the same two settled
 * postings, but not the card payments the `Payments` group needs, and a page
 * that read both would be issuing two requests for one question.
 *
 * So the **column set is `ledgerColumns`' set, column for column** — same ids,
 * same headers off `fin.ledger.col.*`, same `dataType`s, widths, alignments and
 * ordering — over the type that actually carries the rows. **Raised in the
 * handoff** as the one place the spec and the data layer disagree; if the
 * designer holds, this file changes source and not shape.
 *
 * Rules applied
 *   §8.3.3/AC-302  direction is the COLUMN. No row carries a value in both, and
 *                  the other renders an em dash (AC-RP-55). X-5 refuses the
 *                  reference's signed amount for exactly this reason.
 *   §8.3.1         the unit is in each money header once and in no cell.
 *   AC-311/312     `balanceAfterHalalas` verbatim; an em dash where it is
 *                  `null`, which is every row that did not move the wallet.
 *   R4             money columns are `align: 'end'`, and that does NOT flip in
 *                  Arabic (§9.2, AC-RP-53).
 *   R5a            `failed` / `escalated` take the critical row GROUND plus
 *                  the word in the description. Never a badge.
 *   §11.3          the ledger skeleton, `P7`. No spinner (AC-RP-79).
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { MoneyCell, Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import {
  SETTLEMENT_BADGE_TONE,
  type RiderMoneyMovement,
  type RiderMoneyMovements,
} from '@/data/types'
import { useIndexTable, type AsyncResult } from '@/hooks'
import { formatDate, formatLocalisedText } from '@/lib'
import type { Language, Translator } from '@/lib'

export interface RiderMovementsTableProps {
  /** Owned by the page. This component renders what it is given and fetches nothing. */
  result: AsyncResult<RiderMoneyMovements>
  /** Where the ledger's first-run action goes — Financials › Rider wallets. */
  walletsPath: string
  t: Translator
  language: Language
}

/** R5a use #3, DECLARED. Never duck-typed off the shape of a value. */
function isCritical(row: RiderMoneyMovement): boolean {
  return row.state === 'failed' || row.state === 'escalated'
}

export function RiderMovementsTable({
  result,
  walletsPath,
  t,
  language,
}: RiderMovementsTableProps) {
  /* §8.3.3 — the MODE is the contract, and it is what makes AC-RP-51 a compile
     error rather than a review note.

     `urlState` stays at the ledger default (`false`): this table shares its
     address with a profile page that carries `?entity=` and nothing of its own,
     and a `?q=` written here would be inherited by whatever index the back
     control returns to. */
  const table = useIndexTable({ mode: 'ledger' })
  const navigate = useNavigate()

  /* **Only the rows that move the balance the two boundary rows frame.**
     A ledger opened by `Opening balance 0.00` and closed by `Closing balance
     200.00` must contain only the rows that get it from one to the other, or an
     operator sees four rows summing to `+38.00` between two figures 200.00
     apart. A money table that visibly does not add up is the worst outcome
     available on this screen, and it is what the reference drawing produces.

     `inWalletBalance`, **not `source === 'wallet'`**: the data layer's own
     warning is that an unsettled wallet posting is in the list and outside the
     balance, so the flag is the only honest split. The two `mada` captures are
     card money that never touched `liability.wallet`; they render in the
     `Payments` group beside this one, which is where they belong. */
  const movements = (result.data?.movements ?? []).filter((row) => row.inWalletBalance)
  const query = (table.params.q ?? '').trim().toLowerCase()

  const rows = useMemo(() => {
    /* **Oldest first, and it is required rather than preferred.**
       `getRiderMoneyMovements` returns newest-first, which is right for the
       sheet's six-row card. A running balance is only meaningful in posting
       order (AC-317) and the opening row has to sit above the first movement it
       precedes. Same rows, same fields, read the other way: an ARRANGEMENT
       difference between the two surfaces, not a disagreement about a fact. */
    const ordered = [...movements].reverse()
    if (query === '') return ordered
    /* The envelope is unwindowed and unpaginated by contract — the client takes
       no `QueryParams` — so the whole list is in memory and narrowing it here
       narrows all of it rather than a page of it. It matches only what the
       operator can SEE. **Reported** as a request for
       `getRiderMoneyMovements(riderId, params)`, so this becomes the server's
       answer like every other table's. */
    return ordered.filter((row) =>
      [
        formatLocalisedText(row.label, t),
        row.paymentId ?? row.id,
        t(`fin.settlement.${row.state}`),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [movements, query, t])

  /**
   * **The window, and it is this file's to cut.**
   *
   * `DataTable` renders exactly the rows it is handed and derives band 5's
   * `Showing 1–25 of 60` from `total` and `table.page`. Every other table in
   * the product hands it a server page, so the two agree by construction; this
   * envelope is unpaginated, so without this slice a rider with sixty postings
   * would get all sixty rows under a `Showing 1–25 of 60` label, and `Next`
   * would move the label and nothing else. Fixed here and in `RiderPayments`
   * together — two money tables on one page must not page two ways.
   *
   * **The boundary rows are unaffected, and that is correct.** `Opening` and
   * `Closing` render outside the row set, so they frame the whole ledger rather
   * than the page of it — which is what a balance means. §8.3.3's own reason
   * for putting them outside `rows`.
   */
  const page = useMemo(
    () => rows.slice((table.page - 1) * table.pageSize, table.page * table.pageSize),
    [rows, table.page, table.pageSize],
  )

  const columns = useMemo(() => movementColumns(t, language), [t, language])

  /* `useAsync`'s default `isEmpty` cannot answer for this envelope — an object
     with no `total` — so the page declares it, and a search that narrows to
     nothing is the OTHER empty: `table.isFiltered` is true, so `DataTable`
     renders `no-match` rather than first-run (AC-RP-62). */
  const status =
    result.status === 'content' && rows.length === 0 ? ('empty' as const) : result.status

  return (
    <section className="flex flex-col gap-4">
      {/* **The heading is INSIDE the table now, not above it** — owner
          instruction: the title and the control cluster share one row, and the
          count reads as a subtitle beneath the title rather than beside it.

          It is `DataTable`'s `heading` / `subheading` rather than a
          `SectionHeading` above the table because the toolbar belongs to
          `DataTable` and always has. A heading rendered outside it can only ever
          sit on its own row, and reproducing the toolbar here to get them onto
          one row is how forty screens end up with two toolbars. `IndexToolbar`
          types the slot as a union, so a table cannot carry view tabs and a
          heading at once — this one has no tabs.

          Measured by the slot's author: the heading wraps before it truncates,
          the control cluster never moves, and band 2 grows 56 → 62 — which
          costs no row, and buys one back by removing the heading's own row. */}
      <DataTable
        /* Derived every render from the rows this table actually holds, so the
           heading cannot claim a count the table does not show.

           **The held figure is NOT here.** `heldHalalas` is money on a different
           ledger — captured at a gateway and not settled onward — and none of
           this rider's 200.00 is held. §8.3.4 requires a pending amount to be a
           separate labelled line, and `held` printed under a wallet balance
           reads as *held out of your balance*, which is a false statement. It
           is stated once, in the `Payments` group, where its records are. */
        heading={t('entity.rider.movements.title')}
        subheading={
          result.data === null
            ? null
            : t.plural('entity.rider.movements.count', { count: movements.length })
        }
        table={table}
        rows={page}
        columns={columns}
        getRowId={(row) => row.id}
        status={status}
        /* `total` is the NARROWED count, not the unfiltered one: band 5 reads
           `Showing {from}–{to} of {total}`, and a search that hides rows has to
           move the denominator with them or `Showing 1–2 of 60` sits over two
           rows for the rest of the session. */
        total={rows.length}
        t={t}
        language={language}
        tableId="profile.wallet"
        searchPlaceholder={t('entity.rider.movements.search')}
        skeletonPattern="P7"
        /* R5a use #3 — the same predicate the description's words use, so the
           row's two carriers cannot disagree. */
        isRowCritical={isCritical}
        /* A profile shows a bounded window and states its truncation in words;
           there is no `nextPage` to call. */
        infiniteScroll={false}
        ledgerBoundaryRows={
          result.data === null
            ? undefined
            : {
                alignTo: 'balance',
                opening: {
                  label: t('fin.ledger.opening'),
                  /* **Zero because the window is the whole history**, not
                     because anything here computed it: `getRiderMoneyMovements`
                     takes no period and no page, so there is nothing before the
                     first row for a balance to be carried in from. **Reported**
                     — the envelope has no `openingBalanceHalalas` the way
                     `Ledger` does, and the day this read gains a window the row
                     needs that field rather than this constant. */
                  value: <Money amount={0} unit="none" />,
                },
                closing: {
                  label: t('fin.ledger.closing'),
                  /* AC-318 / AC-RP-57 — ONE field, never a re-sum of the rows
                     above it. The envelope derives it from the
                     `movesWalletBalance` rows and asserts it equals
                     `Rider.walletBalanceHalalas`, which is the figure the strip
                     prints; `riderProfile.test.tsx` asserts the two render the
                     same string on this page. */
                  value: <Money amount={result.data.walletBalanceHalalas} unit="none" />,
                },
              }
        }
        firstRun={{
          heading: t('entity.rider.movements.empty.heading'),
          body: t('entity.rider.movements.empty.body'),
          /* The one illustrated state on this page (R8, AC-RP-83): a whole-band
             zero-records-ever empty.

             §11.1 wants at least one action and there is exactly one honest
             one — nobody CREATES a movement, so the action navigates to where
             the rest of this rider's money lives. A handler that did nothing
             would be worse than no action at all. */
          actions: [
            {
              label: t('entity.rider.movements.empty.action'),
              onClick: () => navigate(walletsPath),
            },
          ],
        }}
        noMatch={{ message: t('entity.rider.movements.noMatch') }}
        error={{
          message: t('profile.state.error', { section: t('entity.rider.movements.title') }),
          onRetry: result.refetch,
        }}
      />
    </section>
  )
}

/**
 * `ledgerColumns`' six columns, over the type that carries a rider's money.
 *
 * Ids, headers, `dataType`s, alignments, widths and order are
 * `LedgerCard.ledgerColumns`', deliberately — a second *spelling* of a column
 * set is a second contract that has not noticed yet, and `alignTo: 'balance'`
 * only resolves against a column whose id is `balance`.
 *
 * §7.3's budget: 104 + 128 + (240 floor) + 116 + 116 + 128 = **832**, inside
 * the 870px an Arabic 1280 leaves.
 */
function movementColumns(t: Translator, language: Language): DataColumn<RiderMoneyMovement>[] {
  return [
    {
      id: 'date',
      header: t('fin.ledger.col.date'),
      dataType: 'date',
      width: 104,
      cell: (row) => (
        <span className="tabular-nums">
          {formatDate(row.at, { style: 'day-month', language })}
        </span>
      ),
    },
    {
      id: 'reference',
      header: t('fin.ledger.col.reference'),
      dataType: 'id',
      width: 128,
      /* `dataType: 'id'` deliberately does not auto-isolate — it is usually a
         composite identity cell — so the `<bdi>` is written by hand here, as
         `ledgerColumns` also does. A Latin code inside an Arabic line
         (§10.1). */
      cell: (row) => (
        <span className="block truncate font-medium tabular-nums">
          <bdi>{row.paymentId ?? row.id}</bdi>
        </span>
      ),
    },
    {
      id: 'description',
      header: t('fin.ledger.col.description'),
      dataType: 'text',
      /* §7.3 rule 2 — the one flexible column, and the only cell §14's row
         anatomy allows to wrap. The ceiling is a measure: prose stops being
         readable past ~90 characters, which is ~640px at `--text-sm`. */
      minWidth: 240,
      maxWidth: 640,
      cell: (row) => <span className="block">{formatLocalisedText(row.label, t)}</span>,
      secondaryLine: (row) => <MovementMeta row={row} t={t} />,
    },
    {
      id: 'debit',
      header: t('fin.ledger.col.debit'),
      dataType: 'money',
      align: 'end',
      width: 116,
      /* AC-302 / AC-RP-55 — the column is chosen by `direction` and never by a
         sign; a zero-amount movement still renders `0.00` in the column its
         direction names rather than an em dash. `direction` here is already
         RIDER-relative (`clients/riders.ts` flips an inbound payment), so
         `debit` means the rider's money went down, which is the bank-statement
         convention the wallet ledger documents. */
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
      /* AC-311 / AC-312 / AC-RP-58 — rendered exactly as persisted. `null` on
         every row that did not move the wallet and on every unsettled one, which
         `Money` renders as an em dash. Nothing here recomputes and nothing
         substitutes a zero. */
      cell: (row) => <MoneyCell amount={row.balanceAfterHalalas} />,
    },
  ]
}

/**
 * The description cell's second line — the settlement in words.
 *
 * **R5a**: `failed` and `escalated` have NO tone, on purpose, so the word
 * renders bare beside the row's leading marker. Every other state takes the
 * tone the DATA LAYER assigns; no map here re-decides it.
 */
function MovementMeta({ row, t }: { row: RiderMoneyMovement; t: Translator }) {
  const tone = SETTLEMENT_BADGE_TONE[row.state]
  const label = t(`fin.settlement.${row.state}`)
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {tone === null ? (
        <span className="font-medium text-foreground">{label}</span>
      ) : (
        <StatusBadge tone={tone}>{label}</StatusBadge>
      )}
      {/* §7.5 — the direction as a WORD as well as a column, so the row still
          reads correctly to anyone scanning the description line alone. */}
      <span>
        {t(row.direction === 'credit' ? 'profile.ledger.credit' : 'profile.ledger.debit')}
      </span>
    </span>
  )
}
