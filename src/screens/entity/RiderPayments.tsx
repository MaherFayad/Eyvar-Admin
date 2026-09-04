/**
 * **The rider's card money, as a TABLE** — the movements that are *not* in the
 * wallet balance, and the labelled line §8.3.4 requires for money that is
 * captured and not settled.
 *
 * ```
 *  Payments   2 payments · 98.00 SAR under review ──────────────────────────
 *  [ search ]                              [ Filter ] [ Columns ] [ Export ]
 *
 *  Date     Reference     Description                            Amount
 *  23 Jun   PAY-6150      Quick ride fare                         98.00
 *                         ⟨ Held ⟩ Debit
 *  17 Jun   PAY-6149      Quick ride fare                         64.00
 *                         Released Debit
 *                                              Showing 1–2 of 2   ‹ Prev  Next ›
 * ```
 *
 * ## Why it is a table now, and what that changed
 *
 * Owner instruction: *the `Payments` section becomes a table, not a record
 * list, so it **paginates instead of growing into an infinite scroll***. It was
 * a `<ul>` of rows, which has exactly one length behaviour — all of them — and
 * a rider with three years of quick rides would have rendered every one of them
 * inside a profile page.
 *
 * `DataTable` already owns paging, and `infiniteScroll={false}` is the switch:
 * band 5 renders `Previous` / `Next` against `pageRange` instead of loading the
 * next page on scroll. **Nothing here hand-rolls paging**; the one thing this
 * file owes the mechanism is the window itself, because the client returns the
 * whole list (see `page` below).
 *
 * ## `mode: 'ledger'`, and it is a CAPABILITY choice rather than a claim that
 * ## these are postings
 *
 * They are not postings — a `mada` capture never touched `liability.wallet`,
 * which is the whole reason this group exists beside the wallet ledger rather
 * than inside it. The mode is chosen for what its type says a table may do:
 *
 * | | `ledger` | why this table wants it |
 * |---|---|---|
 * | `canSelect` | literal `false` | there is no bulk operation on a rider's payments, so there is nothing for a checkbox to enable. `LedgerTable` has no `selectedIds` and no `toggleRow` **at all**, so binding one does not compile (AC-48) — the rule is enforced by the type rather than by review |
 * | `canRowAction` | literal `false` | no operation releases a hold (see below), so there is no row action to offer |
 * | `urlState` | defaults `false` | **the decisive one.** This table shares an address with the wallet ledger on the same page, and that address already carries `?entity=`. Two tables writing `?q=` and `?page=` to one URL fight over both; `RiderMovementsTable` chose the ledger default for exactly this reason |
 *
 * What the mode costs is user sort and the `Columns` visibility checkboxes
 * (`showVisibility={!isLedger}`). Neither is a loss the operator can feel here:
 * four columns, none hideable without making the row ambiguous, and no sort
 * control existed on this section before. **Reported** rather than worked
 * around — if a payments list should be sortable, that is a design decision and
 * the mode is the wrong place to smuggle it in.
 *
 * ## NO `ledgerBoundaryRows`, and that is the point of the group
 *
 * A payments list has no running balance. An `Opening balance` / `Closing
 * balance` pair over these rows would be a balance that totals nothing: the
 * four movements sign to `+38.00` against a `200.00` wallet, and a money table
 * that visibly does not add up is the worst outcome available on this screen.
 * `ledgerBoundaryRows` is the wallet ledger's, and only the wallet ledger's —
 * `DataTable` renders it on `isLedger && ledgerBoundaryRows`, so omitting it is
 * the whole of the mechanism.
 *
 * ## Why the summary line does not say `held`
 *
 * `98.00 SAR held` printed under a wallet balance reads as *held out of your
 * balance*, and it is a false statement here: the wallet ledger's
 * `pendingHalalas` is `0` and **none of this rider's 200.00 is held**. The
 * 98.00 is money the platform captured from a card and has not settled onward,
 * frozen because this rider and one other share an IP. So the group's summary
 * says **under review**, which is what it is, while the payment's own row keeps
 * its `Held` badge — a state badge on a record and a summary label over a group
 * are different things and may legitimately use different words. The group is
 * `Payments` and not `Payments under review` for the same reason a group label
 * describes its contents: one of these two has been released.
 *
 * ## There is no release control here, and that is scope rather than a gap
 *
 * No client operation releases a payment hold, and the hold is a **two-record**
 * finding: lifting it from one profile means overturning it with the other half
 * off screen. The profile surfaces the hold and links to the payment. Surfacing
 * is not deciding, and there is no placeholder button standing in for a decision
 * nobody has made. `canRowAction: false` above is that, in the type.
 *
 * Rules applied
 *   §8.3.4/AC-312  a pending amount is a separate labelled line, never inside a
 *                  balance.
 *   §7.5           the settlement state is a WORD as well as a tone; `failed`
 *                  and `escalated` carry no tone at all (R5a) and render bare.
 *   §8.3.1         the unit is in the money header once and in no cell.
 *   §7.3 rule 3    the width budget: 104 + 128 + 128 + a 240 floor on the one
 *                  flexible column = **600**, inside the 870 an Arabic 1280
 *                  leaves and inside the ~696 the page's main column gives at
 *                  1440. It is deliberately NARROWER than the wallet ledger's
 *                  832 beside it — this table has no debit/credit/balance trio.
 *   §7.3 rule 5    a `money` column trails, as it does on the wallet ledger
 *                  beside it and on every ledger in the product. Flagged in the
 *                  handoff as a standing question about ledger-shaped tables
 *                  rather than answered here: R4 puts money at the inline-end,
 *                  and a `State` column parked after an end-aligned amount to
 *                  satisfy rule 5 would be a stranger table than the rule saves.
 *   R8             the zero-records case is ONE grey sentence, per the design
 *                  spec's own empties table (`Payments, none | card`). See
 *                  `firstRun` for why that keeps `DataTable`'s illustrated
 *                  empty out of reach.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { SectionHeading } from '@/components/metrics'
import { MoneyCell } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import {
  SETTLEMENT_BADGE_TONE,
  type RiderMoneyMovement,
  type RiderMoneyMovements,
} from '@/data/types'
import { useIndexTable, type AsyncResult } from '@/hooks'
import { formatDate, formatLocalisedText, formatMoney } from '@/lib'
import type { Language, Translator } from '@/lib'

export interface RiderPaymentsProps {
  result: AsyncResult<RiderMoneyMovements>
  t: Translator
  language: Language
}

export function RiderPayments({ result, t, language }: RiderPaymentsProps) {
  /* See the file header. `urlKey` is passed even though a ledger keeps its
     question out of the URL by default: it costs nothing today and it is the
     namespace this table would need the moment anyone opts it in beside the
     wallet ledger, which shares the address. */
  const table = useIndexTable({ mode: 'ledger', urlKey: 'pay' })

  /* The complement of the ledger's split, from the same flag, so no movement
     can land in both groups or in neither. */
  const payments = useMemo(
    () => (result.data?.movements ?? []).filter((row) => !row.inWalletBalance),
    [result.data],
  )
  const underReview = result.data?.heldHalalas ?? 0
  const query = (table.query ?? '').trim().toLowerCase()

  /* The envelope is unwindowed and unpaginated by contract — the client takes
     no `QueryParams` — so the whole list is in memory and the search narrows all
     of it rather than a page of it. It matches only what the operator can SEE.
     **Reported**, with `RiderMovementsTable`'s identical note, as a request for
     `getRiderMoneyMovements(riderId, params)`. */
  const matched = useMemo(() => {
    if (query === '') return payments
    return payments.filter((row) =>
      [formatLocalisedText(row.label, t), row.paymentId ?? row.id, t(`fin.settlement.${row.state}`)]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [payments, query, t])

  /**
   * **The window, and it is this file's to cut.**
   *
   * `DataTable` renders exactly the rows it is handed and derives band 5's
   * `Showing 1–25 of 60` from `total` and `table.page`. Every other table in
   * the product hands it a server page, so the two agree by construction; this
   * envelope is unpaginated, so handing over all sixty rows under a `Showing
   * 1–25` label would be the table contradicting itself on screen — and
   * `Next` would move the label and nothing else.
   */
  const page = useMemo(
    () => matched.slice((table.page - 1) * table.pageSize, table.page * table.pageSize),
    [matched, table.page, table.pageSize],
  )

  const columns = useMemo(() => paymentColumns(t, language), [t, language])

  const note =
    result.data === null
      ? null
      : [
          t.plural('entity.rider.payments.count', { count: payments.length }),
          /* Absent, with no orphan separator, when nothing is under review. */
          ...(underReview === 0
            ? []
            : [t('entity.rider.payments.underReview', { amount: formatMoney(underReview) })]),
        ].join(' · ')

  /* `useAsync`'s default `isEmpty` cannot answer for this envelope — an object
     with no `total` — so the section declares it. */
  const status =
    result.status === 'content' && matched.length === 0 ? ('empty' as const) : result.status

  /**
   * **The four states, and which one owns which.**
   *
   * | state | who renders it |
   * |---|---|
   * | loading | `DataTable status="loading"`, pattern P1 |
   * | error | `DataTable status="error"`, with its own retry |
   * | **no payments at all** | **this section**, as ONE grey sentence — the design spec's empties table rules `Payments, none` a **card** empty, not the illustrated whole-band `first-run` the wallet ledger takes. The table is not mounted, so there is no search box over zero records |
   * | a search narrowed to zero | `DataTable status="empty"` → `no-match`, one grey sentence |
   * | content | the table |
   */
  const zeroRecords =
    result.status !== 'loading' && result.status !== 'error' && payments.length === 0

  return (
    <section className="flex flex-col gap-4">
      {/* Owner instruction: the title and the control cluster share one row and
          the note reads as a subtitle beneath the title. The heading moves
          INSIDE the table, because `DataTable` owns the toolbar — see
          `RiderMovementsTable` for the full reasoning.

          The zero-records branch keeps its own heading above the empty, because
          there is no table under it to put one in. */}
      {zeroRecords ? (
        <>
          <SectionHeading title={t('profile.section.payments')} note={note} />
          <EmptyState kind="no-match" card={false} message={t('profile.rider.money.empty')} />
        </>
      ) : (
        <DataTable
          heading={t('profile.section.payments')}
          subheading={note}
          table={table}
          rows={page}
          columns={columns}
          getRowId={(row) => row.id}
          status={status}
          total={matched.length}
          t={t}
          language={language}
          tableId="profile.payments"
          searchPlaceholder={t('entity.rider.payments.search')}
          /* P1, not the ledger's P7: P7 draws the balance column's stepped
             figures and this table has no balance to step. */
          skeletonPattern="P1"
          /* The owner's instruction, and the whole mechanism behind it. */
          infiniteScroll={false}
          /* **Deliberately absent.** A payments list has no running balance and
             a boundary pair over it would frame a sum that is not one. See the
             file header. */
          firstRun={{
            /* **Unreachable twice over, and honest rather than a placeholder.**
               Once because the zero-records case is answered above, as the card
               empty the design spec specifies. And once because this table
               declares no `emptyKind`, so an empty it did reach would be the
               `first-run` default — which the zero-records branch answers first.

               **The branch this used to describe is gone.** `DataTable` read
               `table.isFiltered || isLedger`, so no ledger-mode table could ever
               render `first-run` — the defect reported from here, and fixed: the
               condition is now `table.isFiltered || emptyKind === 'no-match'`,
               declared by the screen. The wallet ledger's AC-RP-83 empty next
               door was the live casualty and now renders
               rather than dead copy. This says the right thing if either gate
               ever moves. */
            heading: t('entity.rider.payments.empty.heading'),
            body: t('entity.rider.payments.empty.body'),
            actions: [],
          }}
          /* The only empty this table can actually reach, and it is only ever a
             narrowed search: the unfiltered zero never mounts the table. */
          noMatch={{ message: t('entity.rider.payments.noMatch') }}
          error={{
            message: t('profile.state.error', { section: t('profile.section.payments') }),
            onRetry: result.refetch,
          }}
        />
      )}
    </section>
  )
}

/**
 * Four columns, and the first three are the wallet ledger's own — same ids,
 * same `fin.ledger.col.*` headers, same `dataType`s, same widths, same order.
 *
 * Two money tables sitting one above the other on one page must not spell
 * `Date` and `Reference` two ways; a second spelling of a column is a second
 * contract that has not noticed yet. What this table does not have is the
 * ledger's `Debit` / `Credit` / `Balance` trio — every row here is money leaving
 * the rider and the group says so — so it carries one `Amount` instead, and the
 * settlement rides the description's second line exactly as it does next door.
 */
function paymentColumns(t: Translator, language: Language): DataColumn<RiderMoneyMovement>[] {
  return [
    {
      id: 'date',
      header: t('fin.ledger.col.date'),
      dataType: 'date',
      width: 104,
      cell: (row) => (
        <span className="tabular-nums">{formatDate(row.at, { style: 'day-month', language })}</span>
      ),
    },
    {
      id: 'reference',
      header: t('fin.ledger.col.reference'),
      dataType: 'id',
      width: 128,
      /* §8.3.3's one permitted per-row affordance on a ledger-shaped table: a
         read-only link to the source document. It is not a row action — nothing
         is committed and `canRowAction` is still literally `false` — it is the
         record this row IS. `?entity=` opens the 360° layer OVER this page
         rather than replacing it, so the operator does not lose the profile to
         look at one payment.

         `dataType: 'id'` deliberately does not auto-isolate, so the `<bdi>` is
         written by hand, as `ledgerColumns` also does. */
      cell: (row) =>
        row.paymentId === null ? (
          <span className="block truncate font-medium tabular-nums">
            <bdi>{row.id}</bdi>
          </span>
        ) : (
          <Link
            to={`?entity=${row.paymentId}`}
            className="block truncate rounded-sm font-medium tabular-nums underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <bdi>{row.paymentId}</bdi>
          </Link>
        ),
    },
    {
      id: 'description',
      header: t('fin.ledger.col.description'),
      dataType: 'text',
      /* §7.3 rule 2 — the one flexible column. The ceiling is a measure: prose
         stops being readable past ~90 characters, ~640px at `--text-sm`. */
      minWidth: 240,
      maxWidth: 640,
      cell: (row) => <span className="block">{formatLocalisedText(row.label, t)}</span>,
      secondaryLine: (row) => <PaymentMeta row={row} t={t} />,
    },
    {
      id: 'amount',
      header: t('entity.rider.payments.col.amount'),
      dataType: 'money',
      align: 'end',
      width: 128,
      /* §3.1 — a positive amount, and no sign. The direction is not carried per
         row here: every row in this group is money leaving the rider, and the
         group's own heading says so. `MoneyCell` renders the em dash for a
         `null`, which this column never produces. */
      cell: (row) => <MoneyCell amount={row.amountHalalas} />,
    },
  ]
}

/**
 * The description cell's second line — the settlement in words, and the
 * direction beside it.
 *
 * **R5a**: `failed` and `escalated` have NO tone, on purpose, so the word
 * renders bare. Every other state takes the tone the DATA LAYER assigns; no map
 * here re-decides it. This is `RiderMovementsTable`'s `MovementMeta` construction
 * deliberately repeated rather than shared: the two are the same three lines
 * today and they answer to different column sets, and a shared component with a
 * `variant` prop is how one of them starts constraining the other. If a third
 * appears, extract it.
 */
function PaymentMeta({ row, t }: { row: RiderMoneyMovement; t: Translator }) {
  const tone = SETTLEMENT_BADGE_TONE[row.state]
  const label = t(`fin.settlement.${row.state}`)
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {tone === null ? (
        <span className="font-medium text-foreground">{label}</span>
      ) : (
        <StatusBadge tone={tone}>{label}</StatusBadge>
      )}
      {/* §7.5 — the direction as a WORD, so the row still reads correctly to
          anyone scanning the description line alone. */}
      <span>{t(row.direction === 'credit' ? 'profile.ledger.credit' : 'profile.ledger.debit')}</span>
    </span>
  )
}
