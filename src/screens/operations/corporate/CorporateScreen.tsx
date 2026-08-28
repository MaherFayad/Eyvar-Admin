import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { createCorporateAccount, listCorporateAccounts, type CreateCorporateAccountInput } from '@/data/clients/corporateAccounts'
import type { CorporateAccount, Paginated, SubTabRoute } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
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
  const { t, dir, language } = shell.language

  const table = useIndexTable<CorporateAccount>({
    mode: 'index',
    getRowId: (c) => c.id,
    initialSort: { field: 'createdAt', dir: 'desc' },
  })

  const data = useAsync<Paginated<CorporateAccount>>(
    (signal) => listCorporateAccounts(table.params, signal),
    { deps: [table.params] }
  )

  const [newCorpOpen, setNewCorpOpen] = useState(false)
  const [createdAccounts, setCreatedAccounts] = useState<CorporateAccount[]>([])

  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  const handleCreateCorp = async (input: CreateCorporateAccountInput) => {
    try {
      const created = await createCorporateAccount(input)
      setCreatedAccounts((prev) => [created, ...prev])
      toast.success(t('corp.toast.created', { defaultValue: 'Corporate account {name} created', name: input.companyName }))
      navigate(`/operations/corporate/${created.id}`)
    } catch {
      toast.error(t('corp.toast.createError', { defaultValue: 'Failed to create corporate account' }))
    }
  }

  const rows = useMemo(() => {
    const raw = data.data?.items ?? []
    return [...createdAccounts, ...raw.filter((r) => !createdAccounts.some((c) => c.id === r.id))]
  }, [createdAccounts, data.data?.items])

  const columns: DataColumn<CorporateAccount>[] = useMemo(
    () => [
      {
        id: 'companyName',
        header: t('column.company', { defaultValue: 'Company' }),
        width: 200,
        dataType: 'text',
        cell: (c) => (
          <button
            type="button"
            onClick={() => navigate(`/operations/corporate/${c.id}`)}
            className="flex flex-col text-left focus:outline-none group"
          >
            <span className="text-xs font-semibold text-foreground group-hover:underline">{c.companyName}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{c.id}</span>
          </button>
        ),
      },
      {
        id: 'contact',
        header: t('column.contact', { defaultValue: 'Primary Contact' }),
        width: 180,
        dataType: 'text',
        cell: (c) => (
          <div className="flex flex-col text-xs">
            <span className="font-medium text-foreground">{c.contactName}</span>
            <span className="text-[11px] text-muted-foreground">{c.contactEmail}</span>
          </div>
        ),
      },
      {
        id: 'headcount',
        header: t('column.employees', { defaultValue: 'Employees' }),
        width: 110,
        align: 'end',
        dataType: 'number',
        cell: (c) => (
          <span className="text-xs tabular-nums text-foreground">
            {c.employeeCount} {c.expectedEmployees ? `/ ${c.expectedEmployees}` : ''}
          </span>
        ),
      },
      {
        id: 'totalSpend',
        header: t('column.totalSpend', { defaultValue: 'Spend' }),
        width: 130,
        align: 'end',
        dataType: 'money',
        cell: (c) => (
          <span className="text-xs tabular-nums font-semibold text-foreground">
            <Money amount={c.totalSpendHalalas} />
          </span>
        ),
      },
      {
        id: 'billingType',
        header: t('column.billing', { defaultValue: 'Billing' }),
        width: 140,
        dataType: 'enum',
        cell: (c) => <span className="text-xs text-foreground">{c.billingType}</span>,
      },
      {
        id: 'status',
        header: t('column.status', { defaultValue: 'Status' }),
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
        header: t('column.nextInvoice', { defaultValue: 'Next Invoice' }),
        width: 140,
        dataType: 'date',
        cell: (c) => (
          <div className="flex flex-col text-xs">
            <span className="text-muted-foreground">
              {c.nextInvoiceOn ? formatDate(c.nextInvoiceOn, { language }) : `Day ${c.invoiceDayOfMonth}`}
            </span>
            {c.invoiceOverdue && (
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                {t('corp.invoiceOverdue', { defaultValue: 'Invoice Overdue' })}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        width: 80,
        align: 'end',
        cell: (c) => (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate(`/operations/corporate/${c.id}`)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t('action.view', { defaultValue: 'View' })}
          </Button>
        ),
      },
    ],
    [language, navigate, t]
  )

  const total = (data.data?.total ?? 0) + createdAccounts.length
  const meta = t('corp.meta.count', {
    defaultValue: '{count} corporate accounts',
    count: formatCount(total, language),
  })

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={meta}
          primaryAction={
            canWrite
              ? {
                  label: t('corp.newAccount', { defaultValue: '+ New Corporate Account' }),
                  onClick: () => setNewCorpOpen(true),
                }
              : undefined
          }
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
        searchPlaceholder={t('corp.searchPlaceholder', { defaultValue: 'Search corporate accounts...' })}
        firstRun={{
          heading: t('corp.empty.heading', { defaultValue: 'No corporate accounts registered' }),
          body: t('corp.empty.body', { defaultValue: 'Register corporate clients to manage centralized ride allowances and consolidated billing.' }),
          actions: canWrite ? [{ label: t('corp.newAccount', { defaultValue: '+ New Corporate Account' }), onClick: () => setNewCorpOpen(true) }] : [],
        }}
        noMatch={{ message: t('corp.empty.noMatch', { defaultValue: 'No corporate accounts match your filter' }) }}
        error={{ message: t('corp.error.read', { defaultValue: 'Failed to load corporate accounts' }), onRetry: data.refetch }}
      />

      <NewCorpModal
        open={newCorpOpen}
        onClose={() => setNewCorpOpen(false)}
        onConfirm={handleCreateCorp}
        t={t}
      />
    </SingleColumnPage>
  )
}
