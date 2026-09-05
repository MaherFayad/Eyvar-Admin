/**
 * **Operations > Corporate > account detail** - `/operations/corporate/:corpId`.
 * §11.2 every refused control renders disabled with its reason, and each reason
 * is a fact the account already carries, so the refusal precedes the click.
 * X15 an explanatory sentence opens from `InfoHint` on the card title (§1.5
 * keeps icons off card titles); §5.3 the unlink is confirmed.
 */

import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  addCorporateEmployee,
  getCorporateAccount,
  listRiders,
  removeCorporateEmployee,
  sendCorporateInvoice,
  updateCorporateUsagePolicy,
} from '@/data/clients'
import { isApiError, type CorporateAccount, type CorporateBillingType, type Paginated, type Rider } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { CloseIcon } from '@/components/icons'
import { InfoHint } from '@/components/InfoHint'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '../localCopy'
import { CORPORATE_EN } from './copy'
import { withOverlay } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AddEmployeeModal } from './AddEmployeeModal'

/**
 * The three values `CorporateUsagePolicy.vehicleTier` accepts, keyed. Typed as a
 * record over the union so an option value cannot drift from the domain, which
 * is how `'economy'` came to be written to a field that knows `'Economy'`.
 */
const VEHICLE_TIERS: Readonly<
  Record<CorporateAccount['usagePolicy']['vehicleTier'], { key: string }>
> = {
  any: { key: 'corp.tier.any' },
  Economy: { key: 'corp.tier.economy' },
  Comfort: { key: 'corp.tier.comfort' },
}

const VEHICLE_TIER_VALUES = Object.keys(
  VEHICLE_TIERS,
) as Array<CorporateAccount['usagePolicy']['vehicleTier']>

/** X2 - the billing method reaches the screen keyed, never as its own value. */
const BILLING_KEYS: Readonly<Record<CorporateBillingType, string>> = {
  'Monthly invoice': 'corp.billing.monthly',
  'Prepaid balance': 'corp.billing.prepaid',
}

export function CorporateDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { corpId = '' } = useParams<{ corpId: string }>()
  /* AC-74 - the copy lives in `./copy.ts`. Memoised: several screens carry `t`
     in a `deps` array and a fresh wrapper re-runs the fetch. */
  const t = useMemo(
    () => withFallback(shell.language.t, CORPORATE_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language

  const account = useAsync<CorporateAccount>(
    (signal) => getCorporateAccount(corpId, signal),
    { deps: [corpId], cacheKey: 'corporate.get' }
  )

  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)
  const [localPolicy, setLocalPolicy] = useState<CorporateAccount['usagePolicy'] | null>(null)
  const [policyDirty, setPolicyDirty] = useState(false)
  const [savingPolicy, setSavingPolicy] = useState(false)
  /* Every write returns the whole account, so one piece of state shadows the
     read for all three of them. Discarded the moment a different id lands. */
  const [written, setWritten] = useState<CorporateAccount | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)

  const fetched = account.data
  const data =
    written !== null && fetched !== null && written.id === fetched.id ? written : fetched

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

  const currentEmployees = data?.riderIds ?? []

  /**
   * The linked employee riders, read through the seam (`id in [...]` is a
   * declared rider filter). The dep is the joined id list, not the array;
   * `enabled` holds the dependent read until the account is in hand, so a
   * `mockFailures.once` injection cannot be swallowed by a throwaway call.
   */
  const employeeIdKey = currentEmployees.join(',')
  const employees = useAsync<Paginated<Rider>>(
    (signal) =>
      listRiders(
        {
          filters: [{ field: 'id', op: 'in', value: currentEmployees }],
          pageSize: Math.max(currentEmployees.length, 1),
        },
        signal,
      ),
    /* The operator is in `deps` on both sides of the collision with
       `AddEmployeeModal`'s read, so `…,s:in` here cannot be served `…,s:nin`. */
    { deps: [employeeIdKey, 'in'], cacheKey: 'riders.list', enabled: account.status === 'content' },
  )

  /* P8-T1 / AC-21 - the 360 profile opens as an overlay param on THIS route, so
     the account behind it is not lost. */
  const profileHref = (id: string) => ({
    pathname: location.pathname,
    search: withOverlay(location.search, 'entity', id),
  })

  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  /**
   * §11.2 - one sentence per refusal, stated before the click. `noWrite` is the
   * role; the other two are account facts the client's own 409 and 422 turn on
   * (`clients/corporateAccounts.ts`), so the control never offers a write the
   * server would refuse.
   */
  const noWrite = canWrite ? null : t('corp.action.noPermission')
  const unlinkRefusal =
    noWrite ?? (data?.invoiceOverdue === true ? t('corp.unlink.blocked.unbilled') : null)
  const invoiceRefusal =
    noWrite ??
    (data === null || data === undefined
      ? null
      : data.status !== 'Active'
        ? t('corp.invoice.blocked.notActive')
        : data.billingType !== 'Monthly invoice'
          ? t('corp.invoice.blocked.prepaid')
          : data.totalSpendHalalas <= 0
            ? t('corp.invoice.blocked.noSpend')
            : null)

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
      toast.success(t('corp.toast.policySaved'))
    } catch {
      toast.error(t('corp.toast.policyError'))
    } finally {
      setSavingPolicy(false)
    }
  }

  const handleAddEmployee = async (riderId: string) => {
    if (!data) return
    try {
      setWritten(await addCorporateEmployee(data.id, riderId))
      toast.success(t('corp.toast.employeeAdded'))
    } catch (error: unknown) {
      /* Re-thrown: `AddEmployeeModal` awaits this and renders the 409 - which
         names the company already covering the rider - beside the choice that
         produced it. A toast would close the dialog over that sentence. */
      throw isApiError(error) ? error : new Error(t('corp.toast.employeeError'))
    }
  }

  /* R5a - the ordinary primary, not red: an unlink is reversible from this
     console through `Link employee`. §5.3 still confirms it. */
  const askUnlink = (rider: Rider) => {
    if (!data) return
    setConfirm({
      title: t('corp.unlink.confirm.title', { name: rider.name }),
      body: t('corp.unlink.confirm.body'),
      confirmLabel: t('corp.unlink.confirm.action'),
      onConfirm: () => void handleRemoveEmployee(data.id, rider),
    })
  }

  const handleRemoveEmployee = async (id: string, rider: Rider) => {
    setBusy(true)
    try {
      setWritten(await removeCorporateEmployee(id, rider.id))
      toast.success(t('corp.toast.employeeRemoved', { name: rider.name }))
      setConfirm(null)
    } catch {
      toast.error(t('corp.toast.employeeRemoveError'))
    } finally {
      setBusy(false)
    }
  }

  const handleSendInvoice = async () => {
    if (!data) return
    setBusy(true)
    try {
      setWritten(await sendCorporateInvoice(data.id))
      toast.success(t('corp.toast.invoiceSent', { name: data.companyName }))
    } catch {
      toast.error(t('corp.toast.invoiceError'))
    } finally {
      setBusy(false)
    }
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
            heading={t('corp.error.notFound')}
            message={t('corp.error.notFoundDesc', { id: corpId })}
            action={{ label: t('corp.action.backToAccounts'), onClick: () => navigate(-1) }}
          />
        }
        rail={[]}
      />
    )
  }

  const linkedRiders = employees.data?.items ?? []

  const header = (
    <PageHeader
      title={data.companyName}
      /* AC-75 - one key, one separator, no line assembled in JSX. */
      meta={t('corp.detail.meta', {
        id: data.id,
        billing: t(BILLING_KEYS[data.billingType]),
        status: t(`corp.status.${data.status}`),
      })}
      onBack={() => navigate('/operations/corporate')}
      t={t}
      dir={dir}
    />
  )

  const main = (
    <div className="flex flex-col gap-5">
      {/* 1. Account summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-1">
              {t('corp.card.companyDetails')}
              <InfoHint t={t}>{t('corp.hint.companyDetails')}</InfoHint>
            </CardTitle>
            <StatusBadge
              tone={
                data.status === 'Active' ? 'success' : data.status === 'Pending' ? 'info' : 'new'
              }
            >
              {t(`corp.status.${data.status}`)}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardContent>
          {/* AC-73 - an address and a number are Latin runs inside an Arabic
              line, so each is `<bdi>` isolated and each cell truncates rather
              than spilling into the one beside it. */}
          <div className="grid grid-cols-4 gap-4 text-xs compact:grid-cols-2">
            <div className="min-w-0">
              <span className="mb-0.5 block text-muted-foreground">{t('corp.contact')}</span>
              <bdi className="block truncate font-medium text-foreground">{data.contactName}</bdi>
            </div>
            <div className="min-w-0">
              <span className="mb-0.5 block text-muted-foreground">{t('corp.email')}</span>
              <bdi className="block truncate font-medium text-foreground">{data.contactEmail}</bdi>
            </div>
            <div className="min-w-0">
              <span className="mb-0.5 block text-muted-foreground">{t('corp.phone')}</span>
              {/* O9 - a missing contact number is a fact the operator chases. */}
              {data.contactPhone === null ? (
                <span className="block truncate font-medium text-muted-foreground">
                  {t('corp.phone.notSet')}
                </span>
              ) : (
                <bdi className="block truncate font-medium text-foreground">
                  {data.contactPhone}
                </bdi>
              )}
            </div>
            <div className="min-w-0">
              <span className="mb-0.5 block text-muted-foreground">{t('corp.createdAt')}</span>
              <span className="block truncate font-medium text-foreground">
                {formatDate(data.createdAt, { language })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Usage policy. T9.6 - one field grid, no nested bordered box. */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="flex items-center gap-1">
              {t('corp.card.usagePolicy')}
              <InfoHint t={t}>{t('corp.hint.usagePolicy')}</InfoHint>
            </CardTitle>
            {/* §11.2 - the save bar appears when the form is dirty and is
                disabled with its reason when the role cannot commit it. */}
            {policyDirty && (
              <span className="flex items-center gap-2">
                {noWrite !== null && (
                  <span id="corp-policy-refusal" className="text-2xs text-muted-foreground">
                    {noWrite}
                  </span>
                )}
                <Button
                  size="xs"
                  onClick={() => void handleSavePolicy()}
                  disabled={savingPolicy || !canWrite}
                  aria-describedby={noWrite === null ? undefined : 'corp-policy-refusal'}
                >
                  {savingPolicy ? t('corp.action.savingPolicy') : t('action.savePolicy')}
                </Button>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 compact:grid-cols-1">
            <div className="space-y-1.5">
              <Label htmlFor="corp-cap" className="text-xs font-medium">
                {t('corp.policy.monthlyCap')}
              </Label>
              {/* §10.2 - a money INPUT carries `SAR` as an in-field
                  inline-START prefix, never as a placeholder. */}
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>{t('corp.sar')}</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="corp-cap"
                  type="number"
                  className="text-end tabular-nums"
                  value={currentPolicy.monthlyCapHalalas ? currentPolicy.monthlyCapHalalas / 100 : ''}
                  onChange={(e) =>
                    handlePolicyChange({
                      monthlyCapHalalas: e.target.value
                        ? Math.round(parseFloat(e.target.value) * 100)
                        : null,
                    })
                  }
                  placeholder={t('corp.policy.monthlyCap.placeholder')}
                  disabled={!canWrite}
                />
              </InputGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="corp-tier" className="text-xs font-medium">
                {t('corp.policy.vehicleTier')}
              </Label>
              {/* The option values ARE the domain's values; the narrowing below
                  is what an `as any` cast used to hide. */}
              <Select
                value={currentPolicy.vehicleTier}
                onValueChange={(val) => {
                  const tier = VEHICLE_TIER_VALUES.find((each) => each === val)
                  if (tier) handlePolicyChange({ vehicleTier: tier })
                }}
                disabled={!canWrite}
              >
                <SelectTrigger id="corp-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TIER_VALUES.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {t(VEHICLE_TIERS[tier].key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="corp-approval" className="text-xs font-medium">
                {t('corp.policy.approvalThreshold')}
              </Label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>{t('corp.sar')}</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="corp-approval"
                  type="number"
                  className="text-end tabular-nums"
                  value={
                    currentPolicy.requireApprovalAboveHalalas
                      ? currentPolicy.requireApprovalAboveHalalas / 100
                      : ''
                  }
                  onChange={(e) =>
                    handlePolicyChange({
                      requireApprovalAboveHalalas: e.target.value
                        ? Math.round(parseFloat(e.target.value) * 100)
                        : null,
                    })
                  }
                  placeholder={t('corp.policy.approvalThreshold.placeholder')}
                  disabled={!canWrite}
                />
              </InputGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="corp-approver" className="text-xs font-medium">
                {t('corp.policy.approverEmail')}
              </Label>
              <Input
                id="corp-approver"
                type="email"
                value={currentPolicy.approverEmail ?? ''}
                onChange={(e) => handlePolicyChange({ approverEmail: e.target.value || null })}
                placeholder={t('corp.policy.approverEmail.placeholder')}
                disabled={!canWrite}
              />
            </div>

            {/* T9.6 - the work-hours switch is a field in this grid; its
                sentence moved to the card title's `InfoHint`. */}
            <div className="space-y-1.5">
              <Label htmlFor="corp-work-hours" className="text-xs font-medium">
                {t('corp.policy.workHoursOnly')}
              </Label>
              <div className="flex h-8 items-center">
                <Switch
                  id="corp-work-hours"
                  checked={currentPolicy.workHoursOnly}
                  onCheckedChange={(checked) => handlePolicyChange({ workHoursOnly: checked })}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Linked employees */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1">
              {t('corp.card.linkedEmployees')}
              {/* §11.3 - the count comes from the ACCOUNT, not from the rider
                  read, so it does not appear, vanish and reappear. */}
              <span className="font-normal text-muted-foreground">
                ({formatCount(currentEmployees.length, language)})
              </span>
              <InfoHint t={t}>{t('corp.hint.linkedEmployees')}</InfoHint>
            </CardTitle>
            {/* §11.2 - rendered and refused, never removed. */}
            <span className="flex items-center gap-2">
              {noWrite !== null && (
                <span id="corp-link-refusal" className="text-2xs text-muted-foreground">
                  {noWrite}
                </span>
              )}
              <Button
                size="xs"
                variant="secondary"
                onClick={() => setAddEmployeeOpen(true)}
                disabled={!canWrite}
                aria-describedby={noWrite === null ? undefined : 'corp-link-refusal'}
              >
                {t('corp.linkEmployee')}
              </Button>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Four states for the card's own read. `card={false}`: this card is
              already a frame and a second one inside it is two. */}
          {employees.status === 'loading' ? (
            <LoadingSkeleton pattern="P1" rows={3} />
          ) : employees.status === 'error' ? (
            <ErrorState
              scope="card"
              card={false}
              message={t('state.cardError.message', { resource: t('view.people.riders') })}
              action={{ label: t('state.pageError.action'), onClick: employees.refetch }}
            />
          ) : employees.status === 'empty' ? (
            <EmptyState
              kind="cleared"
              card={false}
              heading={t('corp.noEmployees')}
              body={t('corp.noEmployeesBody')}
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {linkedRiders.map((rider) => (
                <div
                  key={rider.id}
                  className="group/row flex items-center justify-between bg-card p-3 text-xs hover:bg-muted/30 focus-within:bg-muted/30"
                >
                  <div className="flex min-w-0 flex-col">
                    {/* P8-T1 - a cell that names an entity opens that entity. */}
                    <Link
                      to={profileHref(rider.id)}
                      className="truncate rounded-sm font-semibold text-foreground hover:underline"
                    >
                      {rider.name}
                    </Link>
                    {/* AC-75 - one key, one separator. The row sets `text-xs`,
                        so the line inherits its size rather than restating it
                        as the 12px paragraph X15 counts. */}
                    <bdi className="truncate font-mono text-muted-foreground">
                      {t('corp.employee.meta', {
                        id: rider.id,
                        phone: rider.phone,
                        city: rider.city,
                      })}
                    </bdi>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-muted-foreground">
                      {t('corp.activeSubs', {
                        count: formatCount(rider.subscriptionIds.length, language),
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => askUnlink(rider)}
                      disabled={unlinkRefusal !== null || busy}
                      aria-label={t('corp.unlinkEmployee', { name: rider.name })}
                      aria-describedby={unlinkRefusal === null ? undefined : 'corp-unlink-refusal'}
                      className="text-muted-foreground"
                    >
                      <CloseIcon aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* §8.4.4 - ONE sentence for the whole column of refused unlinks,
              pointed at by every one of them. */}
          {employees.status === 'content' && unlinkRefusal !== null && (
            <p id="corp-unlink-refusal" className="pt-2 text-2xs text-muted-foreground">
              {unlinkRefusal}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const rail = [
    <Card key="spend-summary">
      <CardHeader className="pb-2">
        {/* H3 - a metric tile's LABEL wearing a card title keeps the META rank
            rather than the title's; weight below the numeral inverts them. */}
        <CardTitle className="flex items-center gap-1 text-xs text-muted-foreground">
          {t('corp.lifetimeSpend')}
          <InfoHint t={t}>
            {t('corp.hint.lifetimeSpend', {
              count: formatCount(currentEmployees.length, language),
            })}
          </InfoHint>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* H4 - a KPI numeral, not a title: `--text-kpi` at 600 in the
            `metric-value` slot that pins the tabular figures. */}
        <div data-slot="metric-value" className="text-kpi font-semibold text-foreground">
          <Money amount={data.totalSpendHalalas} />
        </div>
      </CardContent>
    </Card>,
    <Card key="invoicing-schedule">
      <CardHeader className="pb-2">
        <CardTitle>{t('corp.invoicingSchedule')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('corp.method')}</span>
          <span className="font-medium text-foreground">
            {t(BILLING_KEYS[data.billingType])}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('corp.billingDay')}</span>
          <span className="font-medium text-foreground">
            <bdi>
              {t('corp.billingDay.value', { day: String(data.invoiceDayOfMonth) })}
            </bdi>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('corp.nextInvoice')}</span>
          <span className="font-medium text-foreground">
            {data.nextInvoiceOn
              ? formatDate(data.nextInvoiceOn, { language })
              : t('corp.nextInvoice.upcoming')}
          </span>
        </div>

        {/* §11.2 - the invoice write, refused in place with the account fact
            that would produce the 409 or the 422. */}
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          <Button
            size="xs"
            variant="secondary"
            onClick={() => void handleSendInvoice()}
            disabled={invoiceRefusal !== null || busy}
            aria-describedby={invoiceRefusal === null ? undefined : 'corp-invoice-refusal'}
            className="w-full"
          >
            {busy ? t('corp.action.invoicing') : t('corp.sendInvoice')}
          </Button>
          {invoiceRefusal !== null && (
            <span id="corp-invoice-refusal" className="text-2xs text-muted-foreground">
              {invoiceRefusal}
            </span>
          )}
        </div>
      </CardContent>
    </Card>,
  ]

  return (
    <>
      <DetailPage header={header} main={main} rail={rail} />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />

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
