/**
 * **Operations > Corporate > account detail** - `/operations/corporate/:corpId`.
 *
 * ## What P4 changed here, and why each one was a defect
 *
 * **Two controls reported writes that never happened.** `handleRemoveEmployee`
 * filtered a local array and toasted *"Employee rider unlinked"*; the next read
 * of the account brought the rider straight back. `handleSendInvoice` toasted
 * *"Consolidated invoice sent to {email}"* and did nothing at all - there is no
 * invoicing operation anywhere in `@/data/clients`. Both are now **disabled in
 * place with their reason** (§11.2), and the two client operations they need
 * are named in the handoff:
 *
 * ```ts
 * removeCorporateEmployee(id: string, riderId: string, signal?: AbortSignal)
 *   : Promise<CorporateAccount>          // 409 when the rider has open rides on this account
 * sendCorporateInvoice(id: string, signal?: AbortSignal)
 *   : Promise<CorporateInvoice>          // the period, the total and the delivery record
 * ```
 *
 * A disabled control with a sentence is not a worse product than a working
 * button; it is a truthful one. The button that lied taught the operator the
 * unlink had happened, and the invoice had gone out.
 *
 * **The vehicle-tier select wrote a value the type forbids.**
 * `CorporateUsagePolicy.vehicleTier` is `'Economy' | 'Comfort' | 'any'`; the
 * options offered `'economy'` and `'comfort'`, and an `as any` cast on the
 * handler hid it. So saving the policy PATCHed a lowercase string the domain
 * does not recognise, and reopening the form showed the placeholder because
 * neither option matched. The cast is gone and `VEHICLE_TIERS` is derived from
 * the union, so a fourth tier is a compile error here rather than a silent
 * mismatch.
 *
 * **`catch (err: any)`** on the link handler is gone with it. `any` in a data
 * path is a defect; `isApiError` is the narrowing the client's own 409 was
 * written for.
 *
 * **§11.2 - refused controls are disabled, not hidden.** `canWrite` used to
 * remove `Link employee`, the policy save bar and every row's unlink from the
 * page. An operator without `manage_subscriptions` therefore saw a read-only
 * page with no indication that any of it was ever editable, which is exactly
 * what §11.2 says teaches the wrong thing. They are now rendered, disabled, and
 * they say why.
 */

import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { addCorporateEmployee, getCorporateAccount, listRiders, updateCorporateUsagePolicy } from '@/data/clients'
import { isApiError, type CorporateAccount, type Paginated, type Rider } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Building2, CreditCard, Plus, ShieldAlert, Trash2, Users } from 'lucide-react'
import { AddEmployeeModal } from './AddEmployeeModal'

/**
 * The three values `CorporateUsagePolicy.vehicleTier` actually accepts, keyed
 * to their copy. Typed as a record over the union rather than three loose
 * `<SelectItem>`s, so the option values cannot drift from the domain again -
 * which is precisely how `'economy'` came to be written to a field that only
 * knows `'Economy'`.
 */
const VEHICLE_TIERS: Readonly<
  Record<CorporateAccount['usagePolicy']['vehicleTier'], { key: string; fallback: string }>
> = {
  any: { key: 'corp.tier.any', fallback: 'Any tier (Economy, Comfort, Exec)' },
  Economy: { key: 'corp.tier.economy', fallback: 'Economy only' },
  Comfort: { key: 'corp.tier.comfort', fallback: 'Comfort and Economy' },
}

const VEHICLE_TIER_VALUES = Object.keys(
  VEHICLE_TIERS,
) as Array<CorporateAccount['usagePolicy']['vehicleTier']>

export function CorporateDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  const { corpId = '' } = useParams<{ corpId: string }>()
  const { t, dir, language } = shell.language

  const account = useAsync<CorporateAccount>(
    (signal) => getCorporateAccount(corpId, signal),
    /* `corpId` is the fetcher's only input - the one dep that must not be
       missing on a detail read, or one account's record serves under another's
       id. Policy edits are held in `localPolicy`, which shadows this. */
    { deps: [corpId], cacheKey: 'corporate.get' }
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

  /**
   * The linked employee riders, read through the seam.
   *
   * This used to be `riderFixtures.filter(...)`, which meant the card kept
   * serving mocks after a `VITE_DATA_SOURCE=http` cutover — the seam's whole
   * point (`REMEDIATION-PLAN.md` §2.1). `id in [...]` is a declared rider
   * filter (`clients/riders.ts` — `filterable.id`, operator `in`), so no new
   * client operation is needed.
   *
   * An empty `in` set matches nothing, so an account with no employees lands on
   * `empty` without a special case, and `pageSize` is the size of the set so
   * the page can never truncate the answer.
   *
   * The dep is the joined id list, not the array: `useAsync` compares deps
   * shallowly, and a fresh array each render would re-fetch forever.
   *
   * `enabled` holds the read until the account is in hand. This is a DEPENDENT
   * read — without the gate it fires once against an empty id set before
   * `riderIds` exists and again after, which is a wasted request and, worse,
   * silently swallows a `mockFailures.once` injection on the throwaway call.
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
    /**
     * **Deliberately NOT cached (P3-13).** The other half of the collision
     * documented on `AddEmployeeModal`'s read: same operation id, same
     * `join(',')` dep, opposite filter operator. See that comment for the fix.
     */
    { deps: [employeeIdKey], enabled: account.status === 'content' },
  )

  /**
   * **P8-T1** - the 360 profile layer, as an overlay param on THIS route
   * (AC-21 / AC-22). A rider named on this page is a rider an operator can
   * open, without losing the account they are looking at.
   */
  const profileHref = (id: string) => ({
    pathname: location.pathname,
    search: withOverlay(location.search, 'entity', id),
  })

  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  /**
   * §11.2 - one sentence per refusal, and the control renders disabled beside
   * it rather than disappearing. `noWrite` is the role refusal; the other two
   * are *"there is no operation behind this"*, which is a different fact and
   * gets a different sentence.
   */
  const noWrite = canWrite
    ? null
    : t('corp.action.noPermission', {
        defaultValue: 'You need the Subscriptions permission to change this account.',
      })
  const unlinkUnavailable = t('corp.action.unlink.unavailable', {
    defaultValue: 'Unlinking an employee is not connected yet. Nothing would be saved.',
  })
  const invoiceUnavailable = t('corp.action.invoice.unavailable', {
    defaultValue: 'Invoice generation is not connected yet. Nothing would be sent.',
  })

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
    } catch (error: unknown) {
      /* Re-thrown, not swallowed: `AddEmployeeModal` awaits this and renders
         the 409 - which names the company already covering the rider - beside
         the choice that produced it. A toast here would close the dialog over
         the one sentence the operator needs. */
      throw isApiError(error)
        ? error
        : new Error(t('corp.toast.employeeError', { defaultValue: 'Failed to link employee' }))
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
            heading={t('corp.error.notFound', { defaultValue: 'Corporate account not found' })}
            message={t('corp.error.notFoundDesc', { defaultValue: 'Account {id} does not exist or has been removed.', id: corpId })}
            action={{ label: t('action.goBack', { defaultValue: 'Back to Corporate Accounts' }), onClick: () => navigate(-1) }}
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
      meta={`${data.id} · ${data.billingType} · ${data.status}`}
      onBack={() => navigate('/operations/corporate')}
      /* **`Generate invoice` has moved out of the header, and it is now
         refused rather than faked.** It toasted `Consolidated invoice sent to
         {email}` with no client, no invoice record and no delivery - the
         operator was told a bill had gone to a customer. There is no
         invoicing operation to call, so it cannot be R3's primary; and
         `PageAction` has a `disabled` flag but no field for a REASON, so a
         disabled header primary could not satisfy §11.2 either. It sits in the
         *Invoicing schedule* rail card instead, disabled, with its sentence
         beside it - which is also where an operator looks for it. The missing
         `PageAction.disabledReason` is reported to the `PageHeader` owner. */
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
            {/* §11.2 - the save bar appears when the form is dirty and is
                DISABLED with its reason when the role cannot commit it, rather
                than the whole form being silently read-only. */}
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
                  {savingPolicy ? t('action.saving', { defaultValue: 'Saving...' }) : t('action.savePolicy', { defaultValue: 'Save policy' })}
                </Button>
              </span>
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
              {/* The option values ARE the domain's values. `as any` used to
                  hide `'economy'` being written to a field whose union is
                  `'Economy' | 'Comfort' | 'any'`; the cast is gone and the
                  narrowing is a real one. */}
              <Select
                value={currentPolicy.vehicleTier}
                onValueChange={(val) => {
                  const tier = VEHICLE_TIER_VALUES.find((each) => each === val)
                  if (tier) handlePolicyChange({ vehicleTier: tier })
                }}
                disabled={!canWrite}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TIER_VALUES.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {t(VEHICLE_TIERS[tier].key, { defaultValue: VEHICLE_TIERS[tier].fallback })}
                    </SelectItem>
                  ))}
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
                {/* The count comes from the ACCOUNT's `riderIds`, not from the
                    rider read, so the number does not appear, vanish and
                    reappear as the second request resolves (§11.3 — nothing
                    moves when the data lands). */}
                <span className="text-xs font-normal text-muted-foreground">({currentEmployees.length})</span>
              </CardTitle>
              <CardDescription className="text-xs">
                {t('corp.card.linkedEmployeesDesc', { defaultValue: 'Employees whose rides are consolidated onto this invoice.' })}
              </CardDescription>
            </div>
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
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('corp.linkEmployee', { defaultValue: 'Link employee' })}
              </Button>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {/* Four states for the card's OWN read — loading, error, empty,
              content, in that order. `card={false}` on both states: this card
              already exists, and a state card inside it would be a second
              frame. */}
          {employees.status === 'loading' ? (
            <LoadingSkeleton pattern="P1" rows={3} />
          ) : employees.status === 'error' ? (
            /* §11.2 — card scope: the rest of the detail page (summary,
               policy form, rail) is unaffected and stays interactive, so only
               this card reports. Retry re-runs the rider read. */
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
              heading={t('corp.noEmployees', { defaultValue: 'No employees linked to this account yet.' })}
              body={t('corp.noEmployeesBody', { defaultValue: 'Link employee rider accounts to include their rides on monthly consolidated billing.' })}
            />
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {linkedRiders.map((rider) => (
                <div
                  key={rider.id}
                  className="group/row flex items-center justify-between bg-card p-3 text-xs hover:bg-muted/30 focus-within:bg-muted/30"
                >
                  <div className="flex min-w-0 flex-col">
                    {/* **P8-T1** - a cell that NAMES an entity opens that
                        entity. A real `<Link>`: focusable, middle-clickable,
                        and its address can be copied. */}
                    <Link
                      to={profileHref(rider.id)}
                      className="truncate rounded-sm font-semibold text-foreground hover:underline"
                    >
                      {rider.name}
                    </Link>
                    <span className="truncate font-mono text-2xs text-muted-foreground">
                      {rider.id} · {rider.phone} · {rider.city}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-muted-foreground">
                      {t('corp.activeSubs', {
                        defaultValue: '{count} active subscriptions',
                        count: formatCount(rider.subscriptionIds.length, language),
                      })}
                    </span>
                    {/* §11.2 - disabled IN PLACE with its reason. This used to
                        filter a local array and toast success over an unlink
                        that the next read undid. */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled
                      aria-label={t('corp.unlinkEmployee', {
                        defaultValue: 'Unlink {name}',
                        name: rider.name,
                      })}
                      aria-describedby="corp-unlink-refusal"
                      className="text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* §8.4.4 - ONE sentence for the whole column of disabled unlink
              buttons, pointed at by every one of them. Twenty-five copies of
              the same line would be noise; a `title` would be invisible to the
              keyboard. */}
          {employees.status === 'content' && (
            <p id="corp-unlink-refusal" className="pt-2 text-2xs text-muted-foreground">
              {noWrite ?? unlinkUnavailable}
            </p>
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
          <span className="text-muted-foreground">{t('corp.nextInvoice', { defaultValue: 'Next invoice' })}:</span>
          <span className="font-medium text-foreground">
            {data.nextInvoiceOn
              ? formatDate(data.nextInvoiceOn, { language })
              : t('corp.nextInvoice.upcoming', { defaultValue: 'Not scheduled' })}
          </span>
        </div>

        {/* §11.2 - the invoice action, disabled IN PLACE with its reason as
            real text. It used to be the page's primary and it used to toast
            success over an invoice that was never generated and never sent. */}
        <div className="flex flex-col gap-1 border-t border-border pt-2">
          <Button
            size="xs"
            variant="secondary"
            disabled
            aria-describedby="corp-invoice-refusal"
            className="w-full"
          >
            {t('corp.sendInvoice', { defaultValue: 'Generate invoice' })}
          </Button>
          <span id="corp-invoice-refusal" className="text-2xs text-muted-foreground">
            {noWrite ?? invoiceUnavailable}
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
