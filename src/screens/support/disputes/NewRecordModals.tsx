/**
 * Raise a claim, and report a lost item (§5.6). Legacy could create neither
 * (`13b` §18.1–2). Both forms state their refusal in place and never guess a
 * party: the requester comes from the search seam.
 */

import { useEffect, useState } from 'react'
import { createDispute, createLostFoundItem } from '@/data/clients'
import { DISPUTE_KINDS, isApiError, type Dispute, type DisputeKind, type LostFoundItem } from '@/data/types'
import { parseMoneyInput, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldControl, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RefusalLine } from '@/components/table/rowActions'
import { RequesterPicker, type Requester } from '../shared/RequesterPicker'

/* ───────────────────────────── a claim ─────────────────────────────── */

export function NewDisputeModal({
  open,
  onClose,
  onCreated,
  t,
}: {
  open: boolean
  onClose: () => void
  onCreated: (dispute: Dispute) => void
  t: Translate
}) {
  const [claimant, setClaimant] = useState<Requester | null>(null)
  const [kind, setKind] = useState<DisputeKind | ''>('')
  const [amount, setAmount] = useState('')
  const [claim, setClaim] = useState('')
  const [tripId, setTripId] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setClaimant(null)
    setKind('')
    setAmount('')
    setClaim('')
    setTripId('')
    setFailure(null)
    setBusy(false)
  }, [open])

  const amountHalalas = parseMoneyInput(amount)
  const refusal: string | null =
    claimant === null
      ? t('dispute.new.blocked.claimant')
      : kind === ''
        ? t('dispute.new.blocked.kind')
        : amountHalalas === null || amountHalalas <= 0
          ? t('dispute.new.blocked.amount')
          : claim.trim() === ''
            ? t('dispute.new.blocked.claim')
            : null

  async function handleConfirm() {
    if (refusal !== null || claimant === null || kind === '' || amountHalalas === null) return
    setBusy(true)
    setFailure(null)
    try {
      const created = await createDispute({
        kind,
        claim: claim.trim(),
        claimantId: claimant.entityId,
        claimantName: claimant.entityName,
        claimantType: claimant.entityType === 'driver' ? 'captain' : 'rider',
        tripId: tripId.trim() === '' ? null : tripId.trim(),
        amountHalalas,
      })
      onCreated(created)
    } catch (error) {
      setFailure(t('dispute.new.failed', { reason: isApiError(error) ? error.message : String(error) }))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dispute.new.title')}</DialogTitle>
          <DialogDescription>{t('dispute.new.desc')}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field id="new-dispute-claimant">
            <FieldLabel>{t('dispute.new.claimant')}</FieldLabel>
            <RequesterPicker
              value={claimant}
              onChange={setClaimant}
              accept={['rider', 'driver']}
              placeholderKey="dispute.new.claimant.placeholder"
              copyPrefix="dispute.new.claimant"
              t={t}
            />
          </Field>
          <Field id="new-dispute-kind">
            <FieldLabel>{t('dispute.new.kind')}</FieldLabel>
            <Select value={kind} onValueChange={(value) => setKind(value as DisputeKind)} disabled={busy}>
              <FieldControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('dispute.new.kind.placeholder')} />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                {DISPUTE_KINDS.map((each) => (
                  <SelectItem key={each} value={each}>
                    {t(`dispute.kind.${each}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="new-dispute-amount">
            <FieldLabel>{t('dispute.new.amount')}</FieldLabel>
            <FieldControl>
              <Input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy} />
            </FieldControl>
            <FieldDescription>{t('dispute.new.amount.help')}</FieldDescription>
          </Field>
          <Field id="new-dispute-trip">
            <FieldLabel optional={t('field.optional')}>{t('dispute.new.trip')}</FieldLabel>
            <FieldControl>
              <Input value={tripId} onChange={(event) => setTripId(event.target.value)} disabled={busy} />
            </FieldControl>
          </Field>
          <Field id="new-dispute-claim">
            <FieldLabel>{t('dispute.new.claim')}</FieldLabel>
            <FieldControl>
              <Textarea rows={3} value={claim} onChange={(event) => setClaim(event.target.value)} disabled={busy} />
            </FieldControl>
            <FieldDescription>{t('dispute.new.claim.help')}</FieldDescription>
          </Field>
        </FieldGroup>
        {failure !== null && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {failure}
          </p>
        )}
        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('dispute.resolve.cancel')}
          </Button>
          <span className="flex flex-col items-stretch gap-1">
            <Button
              size="xs"
              onClick={() => void handleConfirm()}
              disabled={busy || refusal !== null}
              aria-describedby={refusal === null ? undefined : 'new-dispute-refusal'}
            >
              {busy ? t('dispute.new.saving') : t('dispute.new.confirm')}
            </Button>
            {refusal !== null && <RefusalLine id="new-dispute-refusal">{refusal}</RefusalLine>}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ─────────────────────────── a lost item ───────────────────────────── */

export function NewLostFoundModal({
  open,
  onClose,
  onCreated,
  t,
}: {
  open: boolean
  onClose: () => void
  onCreated: (item: LostFoundItem) => void
  t: Translate
}) {
  const [rider, setRider] = useState<Requester | null>(null)
  const [item, setItem] = useState('')
  const [tripId, setTripId] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRider(null)
    setItem('')
    setTripId('')
    setFailure(null)
    setBusy(false)
  }, [open])

  const refusal: string | null =
    rider === null
      ? t('dispute.lf.new.blocked.rider')
      : item.trim() === ''
        ? t('dispute.lf.new.blocked.item')
        : tripId.trim() === ''
          ? t('dispute.lf.new.blocked.trip')
          : null

  async function handleConfirm() {
    if (refusal !== null || rider === null) return
    setBusy(true)
    setFailure(null)
    try {
      const created = await createLostFoundItem({
        item: item.trim(),
        tripId: tripId.trim(),
        riderId: rider.entityId,
        riderName: rider.entityName,
      })
      onCreated(created)
    } catch (error) {
      setFailure(t('dispute.lf.new.failed', { reason: isApiError(error) ? error.message : String(error) }))
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('dispute.lf.new.title')}</DialogTitle>
          <DialogDescription>{t('dispute.lf.new.desc')}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field id="new-lf-rider">
            <FieldLabel>{t('dispute.lf.new.rider')}</FieldLabel>
            <RequesterPicker
              value={rider}
              onChange={setRider}
              accept={['rider']}
              placeholderKey="dispute.lf.new.rider.placeholder"
              copyPrefix="dispute.new.claimant"
              t={t}
            />
          </Field>
          <Field id="new-lf-item">
            <FieldLabel>{t('dispute.lf.new.item')}</FieldLabel>
            <FieldControl>
              <Input value={item} onChange={(event) => setItem(event.target.value)} disabled={busy} />
            </FieldControl>
          </Field>
          <Field id="new-lf-trip">
            <FieldLabel>{t('dispute.lf.new.trip')}</FieldLabel>
            <FieldControl>
              <Input value={tripId} onChange={(event) => setTripId(event.target.value)} disabled={busy} />
            </FieldControl>
            <FieldDescription>{t('dispute.lf.new.trip.help')}</FieldDescription>
          </Field>
        </FieldGroup>
        {failure !== null && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {failure}
          </p>
        )}
        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('dispute.resolve.cancel')}
          </Button>
          <span className="flex flex-col items-stretch gap-1">
            <Button
              size="xs"
              onClick={() => void handleConfirm()}
              disabled={busy || refusal !== null}
              aria-describedby={refusal === null ? undefined : 'new-lf-refusal'}
            >
              {busy ? t('dispute.lf.new.saving') : t('dispute.lf.new.confirm')}
            </Button>
            {refusal !== null && <RefusalLine id="new-lf-refusal">{refusal}</RefusalLine>}
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
