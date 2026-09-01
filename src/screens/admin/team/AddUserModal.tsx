/**
 * The invite dialog — the front of `clients/team.ts` `inviteOperator`.
 *
 * ## What changed, and why it is not cosmetic
 *
 * It used to call `onConfirm` behind a `setTimeout(…, 200)` and close. The
 * screen then minted an id as `USR-${users.length + 1}` and pushed a row onto a
 * component-local array. Nothing was sent, nothing persisted, and the dialog's
 * 200 ms made the whole thing feel like a request.
 *
 * Now it awaits the real mutation and stays open on failure with the message
 * under the field that caused it. The `email_taken` 409 is reachable — invite
 * `sarah@eyvar.com` — and it is the case a fire-and-forget dialog could never
 * have shown, because it had already closed by the time the server answered.
 *
 * Rules applied
 *   §10.4      the invalid field carries a 1px `--ev-red` border and a message
 *              beneath it. **No fill** — §6.2 **D-14** clause B is unsigned and
 *              `--ev-red-lt` is the critical banner's, so `input.tsx` ships
 *              border-and-message and this file does not add a fourth opinion.
 *   §7.4.5     a placeholder is never a label.
 *   §5.7       the primary repeats the verb: `Send invitation`.
 *   §11.2      the primary is disabled in place while the form is incomplete or
 *              in flight; it is never removed.
 *   §9.1       Arabic — every utility here is logical (`text-start`, `gap`).
 */

import { useEffect, useState } from 'react'
import { inviteOperator } from '@/data/clients'
import { ROLE_NAMES, type RoleName } from '@/data/types'
import { isApiError } from '@/data/types'
import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface AddUserModalProps {
  open: boolean
  onClose: () => void
  /** Called after the mutation resolves, with the invited operator's name. */
  onInvited: (name: string) => void
  t: Translate
}

export function AddUserModal({ open, onClose, onInvited, t }: AddUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<RoleName>('Support')
  const [cap, setCap] = useState('100')
  const [busy, setBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  /* A reopened dialog starts clean, including its server-side error. */
  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setPhone('')
    setRole('Support')
    setCap('100')
    setEmailError(null)
  }, [open])

  if (!open) return null

  const incomplete = name.trim() === '' || email.trim() === ''

  async function handleConfirm() {
    setBusy(true)
    setEmailError(null)
    try {
      const parsedCap = cap.trim() === '' ? null : Math.round(Number(cap) * 100)
      const created = await inviteOperator({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() === '' ? null : phone.trim(),
        role,
        compensationCapHalalas:
          parsedCap !== null && Number.isFinite(parsedCap) ? parsedCap : null,
      })
      onInvited(created.name)
      onClose()
    } catch (thrown) {
      /* §10.4 — the message lands under the field it is about. `email_taken` is
         the only field-specific refusal this mutation raises; anything else is
         re-thrown to the screen's own handler rather than swallowed here. */
      if (isApiError(thrown) && thrown.code === 'email_taken') {
        setEmailError(t('admin.team.invite.emailTaken'))
      } else {
        throw thrown
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('admin.team.invite.title')}</DialogTitle>
          <DialogDescription>{t('admin.team.invite.desc')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-start">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-invite-name">{t('admin.team.invite.name')}</Label>
            <Input
              id="admin-invite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-invite-email">{t('admin.team.invite.email')}</Label>
            <Input
              id="admin-invite-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setEmailError(null)
              }}
              aria-invalid={emailError !== null}
              aria-describedby={emailError === null ? undefined : 'admin-invite-email-error'}
              required
            />
            {emailError !== null && (
              <span id="admin-invite-email-error" className="text-2xs text-destructive">
                {emailError}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-invite-phone">{t('admin.team.invite.phone')}</Label>
            <Input
              id="admin-invite-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-invite-role">{t('admin.team.invite.role')}</Label>
            <Select value={role} onValueChange={(value) => setRole(value as RoleName)}>
              <SelectTrigger id="admin-invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_NAMES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-invite-cap">{t('admin.team.invite.cap')}</Label>
            <Input
              id="admin-invite-cap"
              type="number"
              inputMode="decimal"
              value={cap}
              onChange={(event) => setCap(event.target.value)}
              aria-describedby="admin-invite-cap-help"
            />
            <span id="admin-invite-cap-help" className="text-2xs text-muted-foreground">
              {t('admin.team.invite.capHelp')}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('admin.team.confirm.cancel')}
          </Button>
          <Button size="xs" onClick={() => void handleConfirm()} disabled={incomplete || busy}>
            {busy ? t('admin.team.invite.sending') : t('admin.team.invite.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
