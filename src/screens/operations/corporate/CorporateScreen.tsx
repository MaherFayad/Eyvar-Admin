/**
 * **Operations > Corporate accounts** - `routeTable.ts`, shape `index`.
 * AC-43 the identity cell is a link; R4 counts and money inline-END; R3 one
 * primary, refused in place (§11.2); X2 every enum reaches the cell keyed;
 * T5.4 `Company` is the one flexible column and every other line truncates.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createCorporateAccount, listCorporateAccounts, type CreateCorporateAccountInput } from '@/data/clients'
import type { CorporateAccount, CorporateAccountStatus, CorporateBillingType, Paginated, SubTabRoute } from '@/data/types'
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

/**
 * R7 tone and the copy key for each account state, as one record over the
 * union - so a fifth state is a compile error here rather than an untranslated
 * value reaching an Arabic screen (X2).
 */
const STATUS: Readonly<
  Record<CorporateAccountStatus, { tone: 'success' | 'warning' | 'info' | 'neutral' | 'new'; key: string }>
> = {
  Active: { tone: 'success', key: 'corp.status.Active' },
  Trial: { tone: 'new', key: 'corp.status.Trial' },
  Pending: { tone: 'info', key: 'corp.status.Pending' },
  Suspended: { tone: 'neutral', key: 'corp.status.Suspended' },
}

const STATUS_VALUES = Object.keys(STATUS) as CorporateAccountStatus[]

/** The two billing methods, keyed. The values are the domain's own (X2). */
const BILLING: Readonly<Record<CorporateBillingType, string>> = {
  'Monthly invoice': 'corp.billing.monthly',
  'Prepaid balance': 'corp.billing.prepaid',
}

const BILLING_VALUES = Object.keys(BILLING) as CorporateBillingType[]

export function CorporateScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const navigate = useNavigate()
  /* AC-74 - the copy lives in `./copy.ts`; `withFallback` resolves keys the
     shell dictionary has not registered yet. Memoised because several screens
     carry `t` in a `deps` array and a fresh wrapper re-runs the fetch. */
  const t = useMemo(
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

  /* §11.2 - the failure is re-thrown, not swallowed: `NewCorpModal` awaits this
     and stays open with all seven fields intact when it rejects. */
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

  /**
   * **T5.4 - the width contract, §7.3.** `Company` is the one flexible column
   * (`minWidth`, no `width`); the other six declare px and sum with it to the
   * 910 the content region gives a table at 1280. Every line inside a cell
   * truncates rather than wrapping, so the row pitch is one value.
   */
  const columns: DataColumn<CorporateAccount>[] = useMemo(
    () => [
      {
        id: 'companyName',
        sortField: 'companyName',
        emphasis: 'primary',
        csv: (c) => c.companyName,
        header: t('column.company'),
        minWidth: 176,
        dataType: 'text',
        /* AC-43 - the identity is a `<Link>`: middle-clickable, its address can
           be copied, and it keeps `globals.css`'s `:focus-visible` ring. */
        cell: (c) => (
          <Link
            to={`/operations/corporate/${c.id}`}
            className="group flex min-w-0 flex-col rounded-sm text-start"
          >
            <span className="truncate group-hover:underline">{c.companyName}</span>
            <span className="truncate font-mono text-xs font-normal text-muted-foreground">{c.id}</span>
          </Link>
        ),
      },
      {
        id: 'contact',
        header: t('column.contact'),
        width: 144,
        /* A shrink FLOOR, not a second flexible column: `fitColumnWidths` takes
           the Arabic 40px out of the widest slack, and without this the contact
           name is the value that pays for it. */
        minWidth: 140,
        dataType: 'text',
        /* H1 - the person is DATA, the address is META. T5.4: the address is a
           second line only where the column is wide enough to hold it, which at
           the 1280 floor it is not; widening the column reveals it. */
        cell: (c) => (
          <div className="@container flex min-w-0 flex-col">
            <span className="truncate text-foreground">{c.contactName}</span>
            <span className="hidden truncate text-xs text-muted-foreground @3xs:block">
              {c.contactEmail}
            </span>
          </div>
        ),
      },
      {
        id: 'headcount',
        emphasis: 'data',
        header: t('column.employees'),
        width: 108,
        minWidth: 104,
        align: 'end',
        dataType: 'number',
        /* AC-73 - `0 / 40` is two numerals around a bidi-NEUTRAL slash, so an
           Arabic paragraph renders it `40 / 0`. Isolation is the cell's job. */
        cell: (c) => (
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
        width: 116,
        align: 'end',
        dataType: 'money',
        cell: (c) => (
          <span className="tabular-nums">
            <Money amount={c.totalSpendHalalas} />
          </span>
        ),
      },
      {
        id: 'billingType',
        /* The filter's VALUES are the domain's; its LABELS are keyed, so the
           option set reads in Arabic and still matches what the rows carry. */
        filter: {
          kind: 'select',
          field: 'billingType',
          options: BILLING_VALUES.map((value) => ({ value, label: t(BILLING[value]) })),
        },
        sortField: 'billingType',
        header: t('column.billing'),
        width: 152,
        dataType: 'enum',
        cell: (c) => <span className="block truncate">{t(BILLING[c.billingType])}</span>,
      },
      {
        id: 'status',
        filter: {
          kind: 'select',
          field: 'status',
          options: STATUS_VALUES.map((value) => ({ value, label: t(STATUS[value].key) })),
        },
        sortField: 'status',
        emphasis: 'data',
        header: t('column.status'),
        width: 96,
        dataType: 'enum',
        cell: (c) => (
          <StatusBadge tone={STATUS[c.status].tone}>{t(STATUS[c.status].key)}</StatusBadge>
        ),
      },
      {
        id: 'nextInvoice',
        header: t('column.nextInvoice'),
        width: 130,
        /* The floor `Day {day} of month` needs in Arabic; see `contact`. */
        minWidth: 118,
        dataType: 'date',
        cell: (c) => (
          <div className="flex min-w-0 flex-col text-xs">
            <span className="truncate text-muted-foreground">
              {c.nextInvoiceOn
                ? formatDate(c.nextInvoiceOn, { language })
                : t('corp.billingDay.value', { day: String(c.invoiceDayOfMonth) })}
            </span>
            {c.invoiceOverdue && (
              /* H7 rule 3 - the row already carries one badge, so a second
                 signal is text in the tone's own foreground, not a plate. */
              <span className="truncate text-xs font-medium text-warning-foreground">
                {t('corp.invoiceOverdue')}
              </span>
            )}
          </div>
        ),
      },
    ],
    [language, t]
  )

  const total = (data.data?.total ?? 0) + createdAccounts.length
  const title = t(row.titleKey)
  const meta = t('corp.meta.count', { count: formatCount(total, language) })

  /**
   * AC-24 / AC-36 - the failed WHOLE read is the screen's, not the shell's: the
   * rail and the top bar stay interactive. `Try again` is the one primary here,
   * so the header's own primary is withheld in this branch (R3).
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
          /* §11.2 - R3's one primary, rendered and refused rather than removed.
             `PageAction` has no field for the reason; it is stated on the
             dialog's dead primary instead. */
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
          /* §11.2 - the action renders whether or not the role can commit it;
             `EmptyAction` carries no `disabled`, so the refusal lands one step
             later, on the dialog's primary. */
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
        unavailableReason={canWrite ? null : t('corp.action.noPermission.create')}
        t={t}
      />
    </SingleColumnPage>
  )
}
