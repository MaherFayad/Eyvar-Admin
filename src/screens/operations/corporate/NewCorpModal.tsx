/**
 * **Register a corporate account** - Operations > Corporate.
 *
 * **P4 - the fake latency is gone and the failure has somewhere to land.** This
 * ran `setTimeout(..., 200)`, called `onConfirm` and closed. The screen then
 * ran `createCorporateAccount` and navigated on success; on failure the
 * operator was back on the index with a toast and **seven fields of typing
 * gone**. That is the worst possible place to lose a form.
 *
 * `onConfirm` is now awaited, the dialog stays open for the round trip, and a
 * refusal renders in place with every field intact (§11.2).
 */

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CreateCorporateAccountInput } from '@/data/clients/corporateAccounts'
import { isApiError } from '@/data/types'
import type { Translate } from '@/lib'

interface NewCorpModalProps {
  open: boolean
  onClose: () => void
  /** Awaited. The screen owns the write; this owns busy, failure and closing. */
  onConfirm: (input: CreateCorporateAccountInput) => Promise<void>
  /**
   * §11.2 - why this cannot be committed, as a sentence. Non-null disables the
   * primary **in place** and renders the sentence beside it. The index's own
   * `New corporate account` control stays visible either way: an operator who
   * cannot create one still needs to know that creating one is a thing.
   */
  unavailableReason?: string | null
  t: Translate
}

export function NewCorpModal({
  open,
  onClose,
  onConfirm,
  unavailableReason = null,
  t,
}: NewCorpModalProps) {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [billingType, setBillingType] = useState<CreateCorporateAccountInput['billingType']>('Monthly invoice')
  const [expectedEmployees, setExpectedEmployees] = useState('20')
  const [invoiceDayOfMonth, setInvoiceDayOfMonth] = useState('1')
  const [busy, setBusy] = useState(false)
  /** §11.2 - the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  /* Each opening is a fresh question. */
  useEffect(() => {
    if (open) setSubmitError(null)
  }, [open])

  const handleConfirm = async () => {
    if (unavailableReason !== null) return
    if (!companyName.trim() || !contactName.trim() || !contactEmail.trim()) return
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || null,
        billingType,
        expectedEmployees: parseInt(expectedEmployees, 10) || null,
        invoiceDayOfMonth: parseInt(invoiceDayOfMonth, 10) || 1,
      })
      onClose()
    } catch (error: unknown) {
      setSubmitError(
        isApiError(error)
          ? error.message
          : t('corp.new.saveError', {
              defaultValue: "Couldn't create the account. Nothing was saved.",
            }),
      )
    } finally {
      setBusy(false)
    }
  }

  const isValid = companyName.trim() && contactName.trim() && contactEmail.trim()

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('corp.new.title', { defaultValue: 'New Corporate Account' })}</DialogTitle>
          <DialogDescription>
            {t('corp.new.desc', { defaultValue: 'Register a company account for consolidated employee ride billing.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-3">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="corp-name" className="text-xs font-medium">
              {t('corp.companyName', { defaultValue: 'Company Name' })} *
            </Label>
            <Input
              id="corp-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Elm Information Security"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contact-name" className="text-xs font-medium">
              {t('corp.contactName', { defaultValue: 'Contact Person' })} *
            </Label>
            <Input
              id="contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Tariq Al-Ghamdi"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contact-email" className="text-xs font-medium">
              {t('corp.contactEmail', { defaultValue: 'Billing Email' })} *
            </Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="billing@company.sa"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contact-phone" className="text-xs font-medium">
              {t('corp.contactPhone', { defaultValue: 'Phone (optional)' })}
            </Label>
            <Input
              id="contact-phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+966 50 000 0000"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="corp-billing-type" className="text-xs font-medium">
              {t('corp.billingType', { defaultValue: 'Billing Method' })}
            </Label>
            <Select
              value={billingType}
              onValueChange={(val) => setBillingType(val as CreateCorporateAccountInput['billingType'])}
            >
              <SelectTrigger id="corp-billing-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monthly invoice">{t('corp.billing.monthly', { defaultValue: 'Monthly Invoice' })}</SelectItem>
                <SelectItem value="Prepaid balance">{t('corp.billing.prepaid', { defaultValue: 'Prepaid Balance' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="corp-expected" className="text-xs font-medium">
              {t('corp.expectedEmployees', { defaultValue: 'Expected Headcount' })}
            </Label>
            <Input
              id="corp-expected"
              type="number"
              value={expectedEmployees}
              onChange={(e) => setExpectedEmployees(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="corp-invoice-day" className="text-xs font-medium">
              {t('corp.invoiceDay', { defaultValue: 'Invoice Day (1-28)' })}
            </Label>
            <Input
              id="corp-invoice-day"
              type="number"
              min={1}
              max={28}
              value={invoiceDayOfMonth}
              onChange={(e) => setInvoiceDayOfMonth(e.target.value)}
            />
          </div>

          {/* §11.2 / §8.4.4 - the refusal is real text, and it renders with
              every field still filled in. `col-span-2` so it takes the full
              width of the two-column form rather than one cell of it.

              The STANDING refusal (`unavailableReason` - the role may not
              create an account) and the TRANSIENT one (`submitError` - the
              server said no) share the treatment, because to an operator they
              are the same fact: this did not happen, and here is why. */}
          {(unavailableReason ?? submitError) !== null && (
            <p
              id="new-corp-refusal"
              role={submitError === null ? undefined : 'alert'}
              className="col-span-2 text-xs text-destructive"
            >
              {unavailableReason ?? submitError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={() => void handleConfirm()}
            disabled={!isValid || busy || unavailableReason !== null}
            aria-describedby={unavailableReason === null ? undefined : 'new-corp-refusal'}
          >
            {busy ? t('action.saving', { defaultValue: 'Creating...' }) : t('corp.createAccount', { defaultValue: 'Create Account' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
