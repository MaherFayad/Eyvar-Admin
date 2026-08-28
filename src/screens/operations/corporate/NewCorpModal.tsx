import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CreateCorporateAccountInput } from '@/data/clients/corporateAccounts'
import type { Translate } from '@/lib'

interface NewCorpModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (input: CreateCorporateAccountInput) => void
  t: Translate
}

export function NewCorpModal({ open, onClose, onConfirm, t }: NewCorpModalProps) {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [billingType, setBillingType] = useState<CreateCorporateAccountInput['billingType']>('Monthly invoice')
  const [expectedEmployees, setExpectedEmployees] = useState('20')
  const [invoiceDayOfMonth, setInvoiceDayOfMonth] = useState('1')
  const [busy, setBusy] = useState(false)

  const handleConfirm = () => {
    if (!companyName.trim() || !contactName.trim() || !contactEmail.trim()) return
    setBusy(true)
    setTimeout(() => {
      onConfirm({
        companyName: companyName.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || null,
        billingType,
        expectedEmployees: parseInt(expectedEmployees, 10) || null,
        invoiceDayOfMonth: parseInt(invoiceDayOfMonth, 10) || 1,
      })
      setBusy(false)
      onClose()
    }, 200)
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
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={handleConfirm}
            disabled={!isValid || busy}
          >
            {busy ? t('action.saving', { defaultValue: 'Creating...' }) : t('corp.createAccount', { defaultValue: 'Create Account' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
