/**
 * Create a custom role from a built-in, or edit a custom one (D17, TA-4). The
 * live preview below the checklist is the router's own answer (AC-924).
 */

import { useEffect, useState } from 'react'
import { createRole, updateRole } from '@/data/clients'
import { isApiError, type PermissionKey, type Role, type RoleName } from '@/data/types'
import type { Translate } from '@/lib'
import { AccessPreview } from '@/components/access/AccessPreview'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldControl, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PERMISSION_KEYS } from '@/shell/permissions'
import { roleLabel } from '@/screens/auth/copy'

export type RoleEditorRequest =
  | { mode: 'create'; basedOn: RoleName; permissions: readonly PermissionKey[] }
  | { mode: 'edit'; role: Role }

export function RoleEditorDialog({
  request,
  onClose,
  onSaved,
  t,
}: {
  request: RoleEditorRequest | null
  onClose: () => void
  onSaved: (role: Role) => void
  t: Translate
}) {
  const [name, setName] = useState('')
  const [keys, setKeys] = useState<PermissionKey[]>([])
  const [nameError, setNameError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (request === null) return
    setName(request.mode === 'edit' ? request.role.name : '')
    setKeys(request.mode === 'edit' ? [...request.role.permissions] : [...request.permissions])
    setNameError(null)
  }, [request])

  if (request === null) return null

  const basedOn = request.mode === 'create' ? request.basedOn : (request.role.basedOn ?? 'Support')

  function toggle(key: PermissionKey, checked: boolean) {
    setKeys((prev) => (checked ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)))
  }

  async function save() {
    setBusy(true)
    setNameError(null)
    try {
      const saved =
        request!.mode === 'create'
          ? await createRole({ name: name.trim(), basedOn, permissions: keys })
          : await updateRole(request!.role.name, keys)
      onSaved(saved)
      onClose()
    } catch (thrown) {
      if (isApiError(thrown) && thrown.code === 'role_name_taken') {
        setNameError(t('admin.team.roles.editor.nameTaken'))
      } else if (isApiError(thrown) && thrown.code === 'role_name_empty') {
        setNameError(t('admin.team.roles.editor.nameEmpty'))
      } else {
        throw thrown
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>
            {request.mode === 'create'
              ? t('admin.team.roles.editor.createTitle', { basedOn: roleLabel(t, basedOn) })
              : t('admin.team.roles.editor.editTitle', { name: request.role.name })}
          </DialogTitle>
          <DialogDescription>{t('admin.team.roles.editor.desc')}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {request.mode === 'create' && (
            <Field id="admin-role-name" invalid={nameError !== null}>
              <FieldLabel>{t('admin.team.roles.editor.name')}</FieldLabel>
              <FieldControl>
                <Input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setNameError(null)
                  }}
                  required
                />
              </FieldControl>
              <FieldError>{nameError}</FieldError>
            </Field>
          )}

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-foreground">
              {t('admin.team.roles.editor.permissions')}
            </legend>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 compact:grid-cols-1">
              {PERMISSION_KEYS.map((key) => {
                const id = `admin-role-key-${key}`
                return (
                  <li key={key} className="flex items-start gap-2">
                    <Checkbox
                      id={id}
                      checked={keys.includes(key)}
                      onCheckedChange={(checked) => toggle(key, checked === true)}
                      className="mt-0.5"
                    />
                    <Label htmlFor={id} className="text-xs font-normal text-foreground">
                      {t(`account.permission.${key}`)}
                    </Label>
                  </li>
                )
              })}
            </ul>
          </fieldset>

          <AccessPreview permissions={keys} t={t} />
        </FieldGroup>

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('admin.team.confirm.cancel')}
          </Button>
          <Button size="xs" onClick={() => void save()} disabled={busy}>
            {request.mode === 'create' ? t('admin.team.roles.editor.create') : t('admin.team.roles.editor.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
