/**
 * Move an operator to another role (D17, TA-3). Names both states, takes the
 * reason the audit entry carries (AC-923), previews the new role through the
 * router's own functions (AC-924), and states the F-016 refusal in place.
 */

import { useEffect, useMemo, useState } from 'react'
import { baselineFor, changeRole, listRoles, transitionRefusal } from '@/data/clients'
import { isApiError, type Role, type TeamUser } from '@/data/types'
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
import { Field, FieldControl, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { roleLabel } from '@/screens/auth/copy'

export function ChangeRoleDialog({
  operator,
  users,
  onClose,
  onChanged,
  t,
}: {
  operator: TeamUser | null
  users: readonly TeamUser[]
  onClose: () => void
  onChanged: (user: TeamUser) => void
  t: Translate
}) {
  const roles = useAsync<Role[]>((signal) => listRoles(signal), {
    cacheKey: 'rbac.roles',
    enabled: operator !== null,
  })
  const [next, setNext] = useState<string>('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (operator === null) return
    setNext('')
    setReason('')
  }, [operator])

  const nextBaseline = useMemo(() => (next === '' ? null : baselineFor(next)), [next])
  const refusalCode =
    operator !== null && nextBaseline !== null
      ? transitionRefusal(users, operator, 'role', nextBaseline)
      : null
  const refusal =
    refusalCode === 'last_manage_team_holder' ? t('admin.team.refusal.lastManageTeamHolder') : null

  if (operator === null) return null

  async function confirm() {
    setBusy(true)
    try {
      const updated = await changeRole(operator!.id, next, reason.trim())
      onChanged(updated)
      onClose()
    } catch (thrown) {
      if (!isApiError(thrown)) throw thrown
    } finally {
      setBusy(false)
    }
  }

  const incomplete = next === '' || next === operator.role || reason.trim() === ''

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle>{t('admin.team.role.dialog.title', { name: operator.name })}</DialogTitle>
          <DialogDescription>
            {t('admin.team.role.dialog.current', { role: roleLabel(t, operator.role) })}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field id="admin-change-role">
            <FieldLabel>{t('admin.team.role.dialog.next')}</FieldLabel>
            <Select value={next} onValueChange={setNext}>
              <FieldControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.team.role.dialog.pick')} />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                {(roles.data ?? []).map((role) => (
                  <SelectItem key={role.name} value={role.name} disabled={role.name === operator.role}>
                    {roleLabel(t, role.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{t('admin.team.role.dialog.note')}</FieldDescription>
          </Field>

          <Field id="admin-change-role-reason">
            <FieldLabel>{t('admin.team.confirm.reason.label')}</FieldLabel>
            <FieldControl>
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
            </FieldControl>
            <FieldDescription>{t('admin.team.confirm.reason.help')}</FieldDescription>
          </Field>

          {nextBaseline !== null && <AccessPreview permissions={nextBaseline} t={t} />}
        </FieldGroup>

        {refusal !== null && (
          <p id="admin-change-role-refusal" role="status" className="text-xs text-foreground">
            {refusal}
          </p>
        )}

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('admin.team.confirm.cancel')}
          </Button>
          <Button
            size="xs"
            disabled={incomplete || refusal !== null || busy}
            aria-describedby={refusal !== null ? 'admin-change-role-refusal' : undefined}
            onClick={() => void confirm()}
          >
            {t('admin.team.role.dialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
