/**
 * The invite dialog (D20 Operators pane, plan T3.1). The role decides the
 * cap and the preview shows what the invitee will see, through the router's
 * own functions (TA-2, AC-924). After the send the dialog stays to hand over
 * the activation link (O-T6). §11.2: the primary disables in place; §10.4:
 * the field error lands under its field.
 */

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { capForRole, getInvite, inviteOperator, listRoles } from '@/data/clients'
import { isApiError, type Role, type RoleId, type TeamInvite, type TeamUser } from '@/data/types'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'
import { AccessPreview } from '@/components/access/AccessPreview'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { roleLabel } from '@/screens/auth/copy'

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
  const [role, setRole] = useState<RoleId>('Support')
  const [cap, setCap] = useState(() => capField('Support'))
  const [busy, setBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  /** The sent invitation: the dialog's second screen. */
  const [sent, setSent] = useState<{ user: TeamUser; invite: TeamInvite | null } | null>(null)

  const roles = useAsync<Role[]>((signal) => listRoles(signal), { cacheKey: 'rbac.roles', enabled: open })
  const chosen = (roles.data ?? []).find((r) => r.name === role) ?? null

  /* A reopened dialog starts clean, including its server-side error. */
  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setPhone('')
    setRole('Support')
    setCap(capField('Support'))
    setEmailError(null)
    setSent(null)
  }, [open])

  /* The cap follows the role (`compPolicy` per role); the field stays editable. */
  function chooseRole(next: RoleId) {
    setRole(next)
    setCap(capField(next))
  }

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
      const invite = await getInvite(created.id).catch(() => null)
      onInvited(created.name)
      setSent({ user: created, invite })
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

  if (sent !== null) {
    const link = sent.invite === null ? null : inviteLink(sent.invite)
    return (
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('admin.team.invite.sentTitle', { name: sent.user.name })}</DialogTitle>
            <DialogDescription>{t('admin.team.invite.sentBody')}</DialogDescription>
          </DialogHeader>
          {link !== null && (
            <FieldGroup>
              <Field id="admin-invite-link">
                <FieldLabel>{t('admin.team.invite.link')}</FieldLabel>
                <FieldControl>
                  <Input readOnly value={link} dir="ltr" onFocus={(event) => event.currentTarget.select()} />
                </FieldControl>
              </Field>
            </FieldGroup>
          )}
          <DialogFooter>
            {link !== null && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => {
                  void navigator.clipboard?.writeText(link)
                  toast.info(t('admin.team.invite.copied'))
                }}
              >
                {t('admin.team.invite.copyLink')}
              </Button>
            )}
            <Button size="xs" onClick={onClose}>
              {t('admin.team.invite.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{t('admin.team.invite.title')}</DialogTitle>
          <DialogDescription>{t('admin.team.invite.desc')}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field id="admin-invite-name">
            <FieldLabel>{t('admin.team.invite.name')}</FieldLabel>
            <FieldControl>
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </FieldControl>
          </Field>

          <Field id="admin-invite-email" invalid={emailError !== null}>
            <FieldLabel>{t('admin.team.invite.email')}</FieldLabel>
            <FieldControl>
              <Input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailError(null)
                }}
                required
              />
            </FieldControl>
            <FieldError>{emailError}</FieldError>
          </Field>

          <Field id="admin-invite-phone">
            <FieldLabel optional={t('field.optional')}>{t('admin.team.invite.phone')}</FieldLabel>
            <FieldControl>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </FieldControl>
          </Field>

          <div className="grid grid-cols-2 gap-3 compact:grid-cols-1">
            <Field id="admin-invite-role">
              <FieldLabel>{t('admin.team.invite.role')}</FieldLabel>
              <Select value={role} onValueChange={(value) => chooseRole(value)}>
                <FieldControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FieldControl>
                <SelectContent>
                  {/* Built-ins and custom roles alike (D17): the list is the roles table. */}
                  {(roles.data ?? []).map((option) => (
                    <SelectItem key={option.name} value={option.name}>
                      {roleLabel(t, option.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="admin-invite-cap">
              <FieldLabel optional={t('field.optional')}>{t('admin.team.invite.cap')}</FieldLabel>
              <FieldControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={cap}
                  onChange={(event) => setCap(event.target.value)}
                />
              </FieldControl>
              <FieldDescription>{t('admin.team.invite.capHelp')}</FieldDescription>
            </Field>
          </div>

          {/* Behind a disclosure: with it open the dialog outgrows an 800px
              viewport, and the role and the cap are what the admin decides on. */}
          {chosen !== null && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="xs" aria-controls="admin-invite-preview">
                  {t('admin.team.invite.preview')}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent id="admin-invite-preview">
                <AccessPreview permissions={chosen.permissions} t={t} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </FieldGroup>

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

/** The role's cap in riyals as the field shows it; empty when the role has no cap. */
function capField(role: RoleId): string {
  const halalas = capForRole(role)
  return halalas === null ? '' : String(halalas / 100)
}

/** The activation URL on this origin; the token is the invitation's. */
function inviteLink(invite: TeamInvite): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/activate?token=${encodeURIComponent(invite.token)}`
}
