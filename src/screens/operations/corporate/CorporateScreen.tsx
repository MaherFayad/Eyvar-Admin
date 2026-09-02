/**
 * **Operations > Corporate accounts** - `routeTable.ts`, shape `index`.
 *
 * ## What P4-T1 and P8-T1 changed here
 *
 * **The create form used to lose seven fields on failure.** `handleCreateCorp`
 * caught the error and toasted it - but `NewCorpModal` had already closed
 * itself behind a `setTimeout`, so a rejected create put the operator back on
 * the index with a toast and every field they had typed gone. The modal now
 * awaits this handler, so the error is re-thrown rather than swallowed and the
 * dialog stays open with the form intact (§11.2).
 *
 * **§11.2 - `New corporate account` and the row `View` were hidden behind
 * `canWrite`.** An operator without `manage_subscriptions` saw an index with no
 * sign that accounts can be created at all, which is exactly what §11.2 says
 * teaches the wrong thing. The primary renders and refuses.
 *
 * **P8-T1 - the company name is a real link.** It was a `<button
 * onClick={navigate}>`; it is an `<a>` now, so it is middle-clickable and its
 * address can be copied, and the redundant `View` button at the end of every
 * row is gone with it. That column existed only because the name was not a
 * link.
 *
 * ## The one thing I could not fix in my own files, and it is reported
 *
 * **This table renders a checkbox column with nothing behind it.** `mode:
 * 'index'` sets `canSelect: true` unconditionally (`useIndexTable.ts:460`),
 * so every row has a checkbox and the header a select-all - while `DataTable`
 * draws the bulk bar only when `bulkActions` is non-empty. Selecting rows here
 * therefore does nothing at all.
 *
 * **And there is no honest bulk command to declare.** `clients/corporateAccounts.ts`
 * offers `createCorporateAccount`, `updateCorporateUsagePolicy` and
 * `addCorporateEmployee`; none of the three means anything over a set of
 * accounts. Inventing one - a bulk suspend, a bulk invoice - would be a design
 * decision, and I do not make those.
 *
 * So the right fix is to **suppress the selection**, and that cannot be done
 * from here: `IndexTableOptions` has no way to decline the checkbox column, and
 * `useIndexTable.ts` has a single owner. The exact diff requested is in the
 * handoff. Until it lands the checkboxes remain, and they are named here rather
 * than left for visual-QA to find.
 *
 * Rules applied
 *   §9.1 / AC-43  the first data cell is the identity and **a link**.
 *   §9.1 / R4     headcount and spend are inline-END with `tabular-nums`.
 *   R3            one primary - `New corporate account` - and it is refused in
 *                 place rather than hidden.
 *   §11.2         gated at RENDER, disabled in place, with the reason.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createCorporateAccount, listCorporateAccounts, type CreateCorporateAccountInput } from '@/data/clients'
import type { CorporateAccount, Paginated, SubTabRoute } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '../localCopy'
import { CORPORATE_EN } from './copy'
import { NewCorpModal } from './NewCorpModal'

const STATUS_TONES: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'new'> = {
  Active: 'success',
  Pending: 'info',
  Trial: 'new',
  Suspended: 'neutral',
}

export function CorporateScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const navigate = useNavigate()
  /* AC-74 - the copy lives in `./copy.ts`. `withFallback` resolves keys the
     shell dictionary has not registered yet against that dictionary, so no
     English literal sits in this file. See `../localCopy`. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, CORPORATE_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language

  const table = useIndexTable<CorporateAccount>({
    mode: 'index',
    getRowId: (c) => c.id,
    initialSort: { field: 'createdAt', dir: 'desc' },
  })

  const data = useAsync<Paginated<CorporateAccount>>(
    (signal) => listCorporateAccounts(table.params, signal),
    { deps: [table.params], cacheKey: 'corporate.list' }
  )

  const [newCorpOpen, setNewCorpOpen] = useState(false)
  const [createdAccounts, setCreatedAccounts] = useState<CorporateAccount[]>([])

  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  /**
   * **The failure is re-thrown, not swallowed.** `NewCorpModal` awaits this and
   * keeps itself open with all seven fields intact when it rejects. Catching
   * here and toasting put the operator back on the index having lost the form
   * (§11.2) - and the modal closed itself before this ran, so the toast landed
   * over a surface they had already left.
   */
  const handleCreateCorp = async (input: CreateCorporateAccountInput) => {
    const created = await createCorporateAccount(input)
    setCreatedAccounts((prev) => [created, ...prev])
    toast.success(t('corp.toast.created', { name: input.companyName }))
    navigate(`/operations/corporate/${created.id}`)
  }

  const rows = useMemo(() => {
    const raw = data.data?.items ?? []
    return [...createdAccounts, ...raw.filter((r) => !createdAccounts.some((c) => c.id === r.id))]
  }, [createdAccounts, data.data?.items])

  const columns: DataColumn<CorporateAccount>[] = useMemo(
    () => [
      {
        id: 'companyName',
        emphasis: 'primary',
        csv: (c) => c.companyName,
        header: t('column.company'),
        width: 200,
        dataType: 'text',
        /* **P8-T1 / AC-43 - the identity is a LINK, not a button.** A button
           cannot be middle-clicked into a new tab, its address cannot be
           copied, and this one carried `focus:outline-none` with nothing in its
           place. The `<Link>` keeps `globals.css`'s `:focus-visible` ring, so
           there is no ring declaration here to get wrong. */
        cell: (c) => (
          <Link
            to={`/operations/corporate/${c.id}`}
            className="group flex flex-col rounded-sm text-start"
          >
            {/* **H1/H3 — the name now carries NO type classes at all, and
                that is the point.** The column declares `emphasis: 'primary'`,
                so `DataTable` puts ink and 500 on the cell; `body` sets 14px.
                The span used to override all three with `--text-xs` at 600 —
                a step SMALLER than the body it leads, wearing a weight ABOVE
                the rank that is supposed to mark it, which is the ramp
                inverted in one line. `globals.css` names this shape exactly:
                most body text should carry no size class, and the explicit
                ones are *"largely sites climbing back up to a default
                something else knocked them off"*. Deleting them is the fix.
                H2 — the id line leaves `--text-2xs`, whose declared job is a
                badge label and a count numeral. An id is META, `--text-xs`. */}
            <span className="group-hover:underline">{c.companyName}</span>
            <span className="font-mono text-xs font-normal text-muted-foreground">{c.id}</span>
          </Link>
        ),
      },
      {
        id: 'contact',
        header: t('column.contact'),
        width: 180,
        dataType: 'text',
        cell: (c) => (
          /* H1 — the two-line contact cell splits into its two tiers rather
             than rendering both at one size: the person is DATA (14px ink,
             400 — weight belongs to the identity column), the address is META
             (12px grey). The address was at an arbitrary 11px, off the ramp. */
          <div className="flex flex-col">
            <span className="text-foreground">{c.contactName}</span>
            <span className="text-xs text-muted-foreground">{c.contactEmail}</span>
          </div>
        ),
      },
      {
        id: 'headcount',
        emphasis: 'data',
        header: t('column.employees'),
        width: 110,
        align: 'end',
        dataType: 'number',
        cell: (c) => (
          /* H1 DATA — the column declares the tier, so the ink and the size
             come from `DataTable` and `body`; only the figures are local.

             **`<bdi>` — AC-73, and this cell was failing it.** `0 / 40` is two
             numerals either side of a bidi-NEUTRAL slash, so in an Arabic
             paragraph the UBA resolves the run right-to-left and the cell
             renders `40 / 0`. The headcount and the ceiling swap places: not a
             cosmetic mirror, a WRONG NUMBER. Found at 1512 under `dir="rtl"`
             on this screen; `queues/cells.tsx` records the identical shape in
             its own header (*"`4 / 5` renders as `5 / 4`"*). Isolation is the
             component's job, never the string's. */
          <span className="tabular-nums">
            <bdi>
              {c.employeeCount} {c.expectedEmployees ? `/ ${c.expectedEmployees}` : ''}
            </bdi>
          </span>
        ),
      },
      {
        id: 'totalSpend',
        emphasis: 'data',
        csv: (c) => c.totalSpendHalalas,
        header: t('column.totalSpend'),
        width: 130,
        align: 'end',
        dataType: 'money',
        cell: (c) => (
          /* H1/H3 DATA — 14px ink at 400, all of it declared rather than
             written here. The `font-semibold` this span carried was weight
             spent to compensate for a size two steps under the body; with the
             size right the weight is not needed, and it goes back to meaning
             "this is the identity". */
          <span className="tabular-nums">
            <Money amount={c.totalSpendHalalas} />
          </span>
        ),
      },
      {
        id: 'billingType',
        header: t('column.billing'),
        width: 140,
        dataType: 'enum',
        /* No `emphasis`, so this column is META by declaration — and the cell
           was overriding that with ink at 12px, which is a value arguing with
           its own column. It now takes the tier `DataTable` gives it. */
        cell: (c) => <span>{c.billingType}</span>,
      },
      {
        id: 'status',
        emphasis: 'data',
        header: t('column.status'),
        width: 100,
        dataType: 'enum',
        cell: (c) => (
          <StatusBadge tone={STATUS_TONES[c.status] ?? 'neutral'}>
            {c.status}
          </StatusBadge>
        ),
      },
      {
        id: 'nextInvoice',
        header: t('column.nextInvoice'),
        width: 140,
        dataType: 'date',
        cell: (c) => (
          <div className="flex flex-col text-xs">
            <span className="text-muted-foreground">
              {c.nextInvoiceOn ? formatDate(c.nextInvoiceOn, { language }) : `Day ${c.invoiceDayOfMonth}`}
            </span>
            {c.invoiceOverdue && (
              /* **Two defects in one span.** It carried Tailwind's own amber
                 at stop 700, plus a dark-mode variant of the same ramp at stop
                 400 — palette classes, not tokens, and the dark half could
                 never apply, since this product has no dark mode.
                 `globals.css` records the same disposition for the rose
                 variants in `DataTable`: deletion, not translation. The size
                 was an arbitrary bracketed value at ten pixels, below the
                 ramp's own floor and with no token at it.

                 **A class name written in PROSE is a class name.** Tailwind v4
                 scans comments as plain text, so the sentence above deliberately
                 spells out the palette and the size rather than quoting them —
                 `globals.css` and `MetricTileRow` both record a rule shipping to
                 `dist` from a comment that named the thing it was warning about.
                 H7 rule 3 is the shape of the fix: an overdue invoice is a
                 second signal on a row that already carries a status badge, so
                 it becomes **text in the tone's own foreground** —
                 `--ev-amber-dk` #7a3e12, 8.32 : 1 on white and 7.49 : 1 on the
                 darkest ground a row can take. Same tone, same word, no plate,
                 and the row's one badge keeps the colour budget. */
              <span className="text-xs font-medium text-warning-foreground">
                {t('corp.invoiceOverdue')}
              </span>
            )}
          </div>
        ),
      },
      /* **The `View` column is gone.** It existed only because the company name
         was a `<button>` rather than a link; §7.8 gives the action lane to
         `rowActions`, and a second control that goes exactly where the identity
         link goes is furniture that costs 80px of §7.3's width budget. */
    ],
    [language, t]
  )

  const total = (data.data?.total ?? 0) + createdAccounts.length
  const title = t(row.titleKey)
  const meta = t('corp.meta.count', { count: formatCount(total, language) })

  /**
   * §9.2 #3 / **AC-24**, **AC-36** — the failed read is the SCREEN's, not the
   * shell's: the rail, the sub-tab column and the top bar stay interactive and
   * the operator navigates away without a reload.
   *
   * The page-scoped state (heading + body + retry) replaces the table rather
   * than sitting inside it. `DataTable`'s own card-scoped error is right when a
   * *query* failed and the toolbar is still worth keeping; here the whole list
   * read failed, there is nothing for the toolbar to act on, and §11.2 gives
   * that case the page scope. Retry is bound to `data.refetch`, which re-runs
   * `listCorporateAccounts` with the same params.
   *
   * **R3** — the page error's `Try again` is `variant="default"`, so it is the
   * one primary on a screen showing nothing else. The header's *New Corporate
   * Account* is withheld in this branch rather than competing with it.
   */
  if (data.status === 'error') {
    return (
      <SingleColumnPage header={<PageHeader title={title} t={t} dir={dir} />}>
        <ErrorState
          scope="page"
          heading={t('state.pageError.title', { resource: title })}
          message={t('state.pageError.body')}
          action={{ label: t('state.pageError.action'), onClick: data.refetch }}
        />
      </SingleColumnPage>
    )
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={title}
          meta={meta}
          /* §11.2 - R3's one primary, RENDERED and refused rather than
             removed. `PageAction` carries `disabled` but has no field for a
             reason, which is a gap reported to the `PageHeader` owner; the
             sentence lives in the empty state's action and in the handoff
             until it has somewhere to go. */
          primaryAction={{
            label: t('corp.newAccount'),
            onClick: () => setNewCorpOpen(true),
            disabled: !canWrite,
          }}
          t={t}
          dir={dir}
        />
      }
    >
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(c) => c.id}
        status={data.status}
        total={total}
        t={t}
        language={language}
        tableId="operations-corporate"
        searchPlaceholder={t('corp.searchPlaceholder')}
        firstRun={{
          heading: t('corp.empty.heading'),
          body: t('corp.empty.body'),
          /* §11.2 - the action RENDERS whether or not the role can commit it.
             `EmptyAction` carries no `disabled` field (reported to the
             `EmptyState` owner), so the refusal happens one step later: the
             dialog opens and its primary is dead with the reason beside it,
             which is still a stated refusal rather than a capability the
             operator is never told exists. */
          actions: [
            {
              label: t('corp.newAccount'),
              primary: true,
              onClick: () => setNewCorpOpen(true),
            },
          ],
        }}
        noMatch={{ message: t('corp.empty.noMatch') }}
        error={{ message: t('corp.error.read'), onRetry: data.refetch }}
      />

      <NewCorpModal
        open={newCorpOpen}
        onClose={() => setNewCorpOpen(false)}
        onConfirm={handleCreateCorp}
        /* §11.2 - the role refusal, as a sentence beside a dead primary. */
        unavailableReason={
          canWrite
            ? null
            : t('corp.action.noPermission.create')
        }
        t={t}
      />
    </SingleColumnPage>
  )
}
