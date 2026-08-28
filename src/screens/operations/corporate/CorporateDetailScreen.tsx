import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { addCorporateEmployee, getCorporateAccount, updateCorporateUsagePolicy } from '@/data/clients/corporateAccounts'
import { riderFixtures } from '@/data/fixtures/riders'
import type { CorporateAccount } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Building2, CreditCard, Plus, ShieldAlert, Trash2, Users } from 'lucide-react'
import { AddEmployeeModal } from './AddEmployeeModal'

export function CorporateDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { corpId = '' } = useParams<{ corpId: string }>()
  const { t, dir, language } = shell.language

  const account = useAsync<CorporateAccount>(
    (signal) => getCorporateAccount(corpId, signal),
    { deps: [corpId] }
  )

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)
  const [localPolicy, setLocalPolicy] = useState<CorporateAccount['usagePolicy'] | null>(null)
  const [policyDirty, setPolicyDirty] = useState(false)
  const [savingPolicy, setSavingPolicy] = useState(false)
  const [localEmployees, setLocalEmployees] = useState<string[] | null>(null)

  const data = account.data

  const currentPolicy = localPolicy ?? data?.usagePolicy ?? {
    monthlyCapHalalas: null,
    vehicleTier: 'any',
    workHoursOnly: false,
    workHoursStart: '08:00',
    workHoursEnd: '18:00',
    officeDistrict: null,
    geoRestrictKm: null,
    requireApprovalAboveHalalas: null,
    approverName: null,
    approverEmail: null,
  }

  const currentEmployees = localEmployees ?? data?.riderIds ?? []

  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  const handlePolicyChange = (patch: Partial<CorporateAccount['usagePolicy']>) => {
    setLocalPolicy({ ...currentPolicy, ...patch })
    setPolicyDirty(true)
  }

  const handleSavePolicy = async () => {
    if (!data) return
    setSavingPolicy(true)
    try {
      await updateCorporateUsagePolicy(data.id, currentPolicy)
      setPolicyDirty(false)
      toast.success(t('corp.toast.policySaved', { defaultValue: 'Usage policy updated successfully' }))
    } catch {
      toast.error(t('corp.toast.policyError', { defaultValue: 'Failed to update usage policy' }))
    } finally {
      setSavingPolicy(false)
    }
  }

  const handleAddEmployee = async (riderId: string) => {
    if (!data) return
    try {
      await addCorporateEmployee(data.id, riderId)
      const next = [...currentEmployees, riderId]
      setLocalEmployees(next)
      toast.success(t('corp.toast.employeeAdded', { defaultValue: 'Employee rider linked successfully' }))
    } catch (err: any) {
      toast.error(err?.message ?? t('corp.toast.employeeError', { defaultValue: 'Failed to link employee' }))
    }
  }

  const handleRemoveEmployee = (riderId: string) => {
    const next = currentEmployees.filter((id) => id !== riderId)
    setLocalEmployees(next)
    toast.success(t('corp.toast.employeeRemoved', { defaultValue: 'Employee rider unlinked' }))
  }

  const handleSendInvoice = () => {
    toast.success(t('corp.toast.invoiceSent', {
      defaultValue: 'Consolidated invoice sent to {email}',
      email: data?.contactEmail ?? 'billing contact',
    }))
  }

  if (account.status === 'loading') {
    return (
      <DetailPage
        header={<PageHeader title={corpId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={<LoadingSkeleton pattern="P2" />}
        rail={[]}
      />
    )
  }

  if (account.status === 'error' || !data) {
    return (
      <DetailPage
        header={<PageHeader title={corpId} onBack={() => navigate(-1)} t={t} dir={dir} />}
        main={
          <ErrorState
            scope="page"
            heading={t('corp.error.notFound', { defaultValue: 'Corporate account not found' })}
            message={t('corp.error.notFoundDesc', { defaultValue: 'Account {id} does not exist or has been removed.', id: corpId })}
            action={{ label: t('action.goBack', { defaultValue: 'Back to Corporate Accounts' }), onClick: () => navigate(-1) }}
          />
        }
        rail={[]}
      />
    )
  }

  const linkedRiders = riderFixtures.filter((r) => currentEmployees.includes(r.id))

  const header = (
    <PageHeader
      title={data.companyName}
      meta={`${data.id} · ${data.billingType} · ${data.status}`}
      onBack={() => navigate('/operations/corporate')}
      primaryAction={
        canWrite
          ? {
              label: t('corp.sendInvoice', { defaultValue: 'Generate Invoice' }),
              onClick: handleSendInvoice,
            }
          : undefined
      }
      t={t}
      dir={dir}
    />
  )

  const main = (
    <div className="flex flex-col gap-5">
      {/* 1. Account Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {t('corp.card.companyDetails', { defaultValue: 'Company & Billing Information' })}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('corp.card.companyDetailsDesc', { defaultValue: 'Primary billing coordinates and representative.' })}
              </CardDescription>
            </div>
            <StatusBadge tone={data.status === 'Active' ? 'success' : data.status === 'Pending' ? 'info' : 'new'}>
              {data.status}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('corp.contact', { defaultValue: 'Contact Person' })}</span>
              <span className="font-medium text-foreground">{data.contactName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('corp.email', { defaultValue: 'Billing Email' })}</span>
              <span className="font-medium text-foreground">{data.contactEmail}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('corp.phone', { defaultValue: 'Phone' })}</span>
              <span className="font-medium text-foreground">{data.contactPhone ?? '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-0.5">{t('corp.createdAt', { defaultValue: 'Account Opened' })}</span>
              <span className="font-medium text-foreground">{formatDate(data.createdAt, { language })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Usage Policy Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                {t('corp.card.usagePolicy', { defaultValue: 'Employee Ride & Usage Policy' })}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('corp.card.usagePolicyDesc', { defaultValue: 'Enforce spend caps, vehicle classes, and manager approval rules.' })}
              </CardDescription>
            </div>
            {policyDirty && (
              <Button
                size="xs"
                onClick={handleSavePolicy}
                disabled={savingPolicy}
              >
                {savingPolicy ? t('action.saving', { defaultValue: 'Saving...' }) : t('action.savePolicy', { defaultValue: 'Save Policy' })}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('corp.policy.monthlyCap', { defaultValue: 'Monthly Spend Cap (SAR)' })}</Label>
              <Input
                type="number"
                value={currentPolicy.monthlyCapHalalas ? currentPolicy.monthlyCapHalalas / 100 : ''}
                onChange={(e) =>
                  handlePolicyChange({
                    monthlyCapHalalas: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                  })
                }
                placeholder="No limit"
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('corp.policy.vehicleTier', { defaultValue: 'Allowed Vehicle Tier' })}</Label>
              <Select
                value={currentPolicy.vehicleTier}
                onValueChange={(val) => handlePolicyChange({ vehicleTier: val as any })}
                disabled={!canWrite}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t('corp.tier.any', { defaultValue: 'Any Tier (Economy, Comfort, Exec)' })}</SelectItem>
                  <SelectItem value="economy">{t('corp.tier.economy', { defaultValue: 'Economy Only' })}</SelectItem>
                  <SelectItem value="comfort">{t('corp.tier.comfort', { defaultValue: 'Comfort & Economy' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('corp.policy.approvalThreshold', { defaultValue: 'Approval Required Above (SAR)' })}</Label>
              <Input
                type="number"
                value={currentPolicy.requireApprovalAboveHalalas ? currentPolicy.requireApprovalAboveHalalas / 100 : ''}
                onChange={(e) =>
                  handlePolicyChange({
                    requireApprovalAboveHalalas: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null,
                  })
                }
                placeholder="No approval needed"
                disabled={!canWrite}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-foreground block">{t('corp.policy.workHoursOnly', { defaultValue: 'Work Hours Restriction' })}</span>
                <span className="text-[11px] text-muted-foreground block">{t('corp.policy.workHoursDesc', { defaultValue: 'Only allow rides between 08:00 and 18:00 on weekdays.' })}</span>
              </div>
              <Switch
                checked={currentPolicy.workHoursOnly}
                onCheckedChange={(checked) => handlePolicyChange({ workHoursOnly: checked })}
                disabled={!canWrite}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('corp.policy.approverEmail', { defaultValue: 'Approver Email' })}</Label>
              <Input
                type="email"
                value={currentPolicy.approverEmail ?? ''}
                onChange={(e) => handlePolicyChange({ approverEmail: e.target.value || null })}
                placeholder="manager@company.sa"
                disabled={!canWrite}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Linked Employees Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {t('corp.card.linkedEmployees', { defaultValue: 'Linked Employee Riders' })}
                <span className="text-xs font-normal text-muted-foreground">({linkedRiders.length})</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {t('corp.card.linkedEmployeesDesc', { defaultValue: 'Employees whose rides are consolidated onto this invoice.' })}
              </CardDescription>
            </div>
            {canWrite && (
              <Button size="xs" variant="secondary" onClick={() => setAddEmployeeOpen(true)} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                {t('corp.linkEmployee', { defaultValue: 'Link Employee' })}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {linkedRiders.length === 0 ? (
            <EmptyState
              kind="cleared"
              heading={t('corp.noEmployees', { defaultValue: 'No employees linked to this account yet.' })}
              body={t('corp.noEmployeesBody', { defaultValue: 'Link employee rider accounts to include their rides on monthly consolidated billing.' })}
            />
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {linkedRiders.map((rider) => (
                <div key={rider.id} className="flex items-center justify-between p-3 text-xs bg-card hover:bg-muted/30">
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{rider.name}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{rider.id} · {rider.phone} · {rider.city}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{rider.subscriptionIds.length} active subs</span>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemoveEmployee(rider.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const rail = [
    <Card key="spend-summary">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{t('corp.lifetimeSpend', { defaultValue: 'Total Lifetime Spend' })}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold text-foreground">
          <Money amount={data.totalSpendHalalas} />
        </div>
        <span className="text-[11px] text-muted-foreground block mt-1">
          {t('corp.activeRidersCount', { defaultValue: '{count} riders on account', count: currentEmployees.length })}
        </span>
      </CardContent>
    </Card>,
    <Card key="invoicing-schedule">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" />
          {t('corp.invoicingSchedule', { defaultValue: 'Invoicing Schedule' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('corp.method', { defaultValue: 'Method' })}:</span>
          <span className="font-medium text-foreground">{data.billingType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('corp.billingDay', { defaultValue: 'Billing Cycle' })}:</span>
          <span className="font-medium text-foreground">Day {data.invoiceDayOfMonth} of month</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('corp.nextInvoice', { defaultValue: 'Next Invoice' })}:</span>
          <span className="font-medium text-foreground">
            {data.nextInvoiceOn ? formatDate(data.nextInvoiceOn, { language }) : 'Upcoming'}
          </span>
        </div>
      </CardContent>
    </Card>,
  ]

  return (
    <>
      <DetailPage header={header} main={main} rail={rail} />

      <AddEmployeeModal
        corpId={data.id}
        companyName={data.companyName}
        existingRiderIds={currentEmployees}
        open={addEmployeeOpen}
        onClose={() => setAddEmployeeOpen(false)}
        onConfirm={handleAddEmployee}
        t={t}
      />
    </>
  )
}
