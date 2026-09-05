/**
 * **Freeze a subscription** — the form behind `Freeze` on the row kebab, on the
 * bulk bar and on the record sheet. `surfaces.md`: a short focused form is a
 * modal, and one form serves one record or twelve (§9.1 states the count).
 */

/**
 * **T6.1 — the duration list is the COMMAND's, not this file's.** It arrives as
 * `CommandConfirmRequest.choice`: each option's value is the resume date
 * `subscription.freeze` computed against the fixed clock, so nothing here
 * parses a number into a date and the two surfaces cannot offer two windows.
 */

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CommandConfirmChoice } from '@/commands'
import { isApiError, type Subscription } from '@/data/types'
import { formatCount, type Language, type Translate } from '@/lib'

interface FreezeModalProps {
  /** The records being frozen. Empty closes the dialog; one or many opens it. */
  subscriptions: readonly Subscription[]
  /** The command's duration list. `null` until a command has asked. */
  choice: CommandConfirmChoice | null
  onClose: () => void
  /** Awaited. The command owns the write; this owns busy, failure and closing. */
  onConfirm: (subscriptions: readonly Subscription[], reason: string) => Promise<void>
  language: Language
  t: Translate
}

export function FreezeModal({
  subscriptions,
  choice,
  onClose,
  onConfirm,
  language,
  t,
}: FreezeModalProps) {
  const initial = choice?.initial ?? ''
  const [until, setUntil] = useState(initial)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  /** §11.2 — the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  const open = subscriptions.length > 0
  /* Each opening is a fresh question. */
  useEffect(() => {
    if (open) {
      setUntil(initial)
      setReason('')
      setSubmitError(null)
    }
  }, [open, initial])

  const single = subscriptions.length === 1 ? subscriptions[0] : undefined
  const selected = choice?.options.find((option) => option.value === until)

  const handleConfirm = async () => {
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm(subscriptions, reason)
    } catch (error: unknown) {
      setSubmitError(isApiError(error) ? error.message : t('subs.freeze.saveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {single
              ? t('subs.freeze.title.one', { id: single.id })
              : t('subs.freeze.title.other', {
                  count: formatCount(subscriptions.length, language),
                })}
          </DialogTitle>
          <DialogDescription>
            {t(single ? 'subs.freeze.body.one' : 'subs.freeze.body.other')}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {choice !== null && (
            <Field id="freeze-duration">
              <FieldLabel>{choice.label}</FieldLabel>
              <Select
                value={until}
                onValueChange={(value) => {
                  setUntil(value)
                  choice.onSelect(value)
                }}
              >
                <FieldControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FieldControl>
                <SelectContent>
                  {choice.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* The consequence, restated as a date rather than as a duration:
                  `Resumes on 2 Jul` is checkable against a rider's message and
                  `14 days` is not. AC-73 isolates it. */}
              {selected?.hint != null && (
                <FieldDescription>
                  <bdi>{selected.hint}</bdi>
                </FieldDescription>
              )}
            </Field>
          )}

          <Field id="freeze-reason" invalid={submitError !== null}>
            <FieldLabel optional={t('field.optional')}>{t('subs.freeze.reason')}</FieldLabel>
            <FieldControl>
              <Input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t('subs.freeze.reasonPlaceholder')}
              />
            </FieldControl>
            {/* §11.2 / §8.4.4 — a refusal is real text in the surface that made
                the request, with the operator's input still on screen. */}
            <FieldError>{submitError}</FieldError>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('table.cancel')}
          </Button>
          {/* R5a — blue. A freeze is reversible, and now carries D18's undo. */}
          <Button size="xs" onClick={() => void handleConfirm()} disabled={busy}>
            {t(single ? 'subs.freeze.confirm' : 'subs.freeze.confirm.other')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
