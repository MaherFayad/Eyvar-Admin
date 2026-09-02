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
 *
 * ## Rules applied
 *   G7      seven `Field`s, no hand-rolled label/control/hint markup. The
 *           labels were Title Case with a trailing `*`; §10.2 forbids the
 *           asterisk anywhere in this product, so the three optional fields
 *           carry `field.optional` and the four required ones carry nothing.
 *   G6      `default` — seven single-line controls, one region.
 *   §5.7 r7 the invoice-day range moved out of the label and into helper text.
 *   AC-74   every string resolves through `./copy.ts`. There is no
 *           `defaultValue` in this file.
 */

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CreateCorporateAccountInput } from '@/data/clients/corporateAccounts'
import { isApiError } from '@/data/types'
import type { Translate } from '@/lib'
import { withFallback } from '../localCopy'
import { CORPORATE_EN } from './copy'

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
  /* AC-74 — the copy lives in `./copy.ts`, not in this file. */
  const tt = withFallback(t, CORPORATE_EN)

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
          : tt('corp.new.saveError'),
      )
    } finally {
      setBusy(false)
    }
  }

  const isValid = companyName.trim() && contactName.trim() && contactEmail.trim()

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{tt('corp.new.title')}</DialogTitle>
          <DialogDescription>
            {tt('corp.new.desc')}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <Field id="corp-name" className="col-span-2">
              <FieldLabel>{tt('corp.companyName')}</FieldLabel>
              <FieldControl>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </FieldControl>
            </Field>

            <Field id="contact-name">
              <FieldLabel>{tt('corp.contactName')}</FieldLabel>
              <FieldControl>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} required />
              </FieldControl>
            </Field>

            <Field id="contact-email">
              <FieldLabel>{tt('corp.contactEmail')}</FieldLabel>
              <FieldControl>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </FieldControl>
            </Field>

            <Field id="contact-phone">
              <FieldLabel optional={t('field.optional')}>{tt('corp.contactPhone')}</FieldLabel>
              <FieldControl>
                {/* §9.2 — a phone value is `dir="ltr"` in both languages, or a
                    leading `+` jumps sides in Arabic. */}
                <Input
                  value={contactPhone}
                  dir="ltr"
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </FieldControl>
            </Field>

            <Field id="corp-billing-type">
              <FieldLabel>{tt('corp.billingType')}</FieldLabel>
              <Select
                value={billingType}
                onValueChange={(val) => setBillingType(val as CreateCorporateAccountInput['billingType'])}
              >
                <FieldControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FieldControl>
                <SelectContent>
                  <SelectItem value="Monthly invoice">{tt('corp.billing.monthly')}</SelectItem>
                  <SelectItem value="Prepaid balance">{tt('corp.billing.prepaid')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="corp-expected">
              <FieldLabel optional={t('field.optional')}>{tt('corp.expectedEmployees')}</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={expectedEmployees}
                  onChange={(e) => setExpectedEmployees(e.target.value)}
                />
              </FieldControl>
            </Field>

            <Field id="corp-invoice-day">
              <FieldLabel optional={t('field.optional')}>{tt('corp.invoiceDay')}</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={28}
                  value={invoiceDayOfMonth}
                  onChange={(e) => setInvoiceDayOfMonth(e.target.value)}
                />
              </FieldControl>
              {/* Rule 7 — the constraint lives under the field, never inside
                  the label and never in a tooltip. */}
              <FieldDescription>{tt('corp.invoiceDayHelp')}</FieldDescription>
            </Field>
          </div>

          {/* §11.2 / §8.4.4 - the refusal is real text, and it renders with
              every field still filled in.

              The STANDING refusal (`unavailableReason` - the role may not
              create an account) and the TRANSIENT one (`submitError` - the
              server said no) share the treatment, because to an operator they
              are the same fact: this did not happen, and here is why. */}
          {(unavailableReason ?? submitError) !== null && (
            <p
              id="new-corp-refusal"
              role={submitError === null ? undefined : 'alert'}
              className="text-xs text-destructive"
            >
              {unavailableReason ?? submitError}
            </p>
          )}
        </FieldGroup>

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {tt('action.cancel')}
          </Button>
          <Button
            size="xs"
            onClick={() => void handleConfirm()}
            disabled={!isValid || busy || unavailableReason !== null}
            aria-describedby={unavailableReason === null ? undefined : 'new-corp-refusal'}
          >
            {busy ? tt('corp.creating') : tt('corp.createAccount')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
