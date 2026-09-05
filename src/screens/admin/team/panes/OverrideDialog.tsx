/**
 * Edit one operator's override (D17, AC-921). Each key is inherited from the
 * role, granted on top of it, or revoked from it; the effective set and the
 * router's own preview update live (AC-924). The F-016 refusal is stated
 * where the client would throw it (AC-922).
 */

import { useEffect, useMemo, useState } from 'react'
import { baselineFor, capForRole, setCompensationCap, setPermissionDelta } from '@/data/clients'
import { Field, FieldControl, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isApiError, type PermissionKey, type TeamUser } from '@/data/types'
import { formatMoney, type Translate } from '@/lib'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PERMISSION_KEYS } from '@/shell/permissions'
import { roleLabel } from '@/screens/auth/copy'

type KeyState = 'inherited' | 'granted' | 'revoked'

export function OverrideDialog({
  operator,
  onClose,
  onSaved,
  t,
}: {
  operator: TeamUser | null
  onClose: () => void
  onSaved: (user: TeamUser) => void
  t: Translate
}) {
  const [granted, setGranted] = useState<PermissionKey[]>([])
  const [cap, setCap] = useState('')
  const [revoked, setRevoked] = useState<PermissionKey[]>([])
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

  useEffect(() => {
    if (operator === null) return
    setGranted([...(operator.permissionDelta?.granted ?? [])])
    setRevoked([...(operator.permissionDelta?.revoked ?? [])])
    setCap(operator.compensationCapHalalas === null ? '' : String(operator.compensationCapHalalas / 100))
    setRefusal(null)
  }, [operator])

  const baseline = useMemo(() => new Set(operator ? (baselineFor(operator.role) ?? []) : []), [operator])

  const effective = useMemo(() => {
    const out = PERMISSION_KEYS.filter((k) => (baseline.has(k) && !revoked.includes(k)) || granted.includes(k))
    return out
  }, [baseline, granted, revoked])

  if (operator === null) return null

  function stateOf(key: PermissionKey): KeyState {
    if (granted.includes(key)) return 'granted'
    if (revoked.includes(key)) return 'revoked'
    return 'inherited'
  }

  function setState(key: PermissionKey, next: KeyState) {
    setGranted((prev) => (next === 'granted' ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)))
    setRevoked((prev) => (next === 'revoked' ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)))
    setRefusal(null)
  }

  async function save() {
    setBusy(true)
    setRefusal(null)
    try {
      let saved = await setPermissionDelta(operator!.id, { granted, revoked })
      /* The cap is its own write (O-T5): blank is no cap, a number is riyals. */
      const parsed = cap.trim() === '' ? null : Math.round(Number(cap) * 100)
      const nextCap = parsed !== null && Number.isFinite(parsed) ? parsed : null
      if (nextCap !== operator!.compensationCapHalalas) saved = await setCompensationCap(operator!.id, nextCap)
      onSaved(saved)
      onClose()
    } catch (thrown) {
      if (isApiError(thrown) && thrown.code === 'last_manage_team_holder') {
        setRefusal(t('admin.team.refusal.lastManageTeamHolder'))
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
          <DialogTitle>{t('admin.team.override.dialog.title', { name: operator.name })}</DialogTitle>
          <DialogDescription>
            {t('admin.team.override.dialog.role', { role: roleLabel(t, operator.role) })}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col divide-y divide-border">
          {PERMISSION_KEYS.map((key) => {
            const inRole = baseline.has(key)
            const state = stateOf(key)
            return (
              <li key={key} className="flex items-center justify-between gap-3 py-1.5 text-xs">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-foreground">{t(`account.permission.${key}`)}</span>
                  <span className="text-muted-foreground">
                    {t(inRole ? 'admin.team.override.inRole' : 'admin.team.override.notInRole')}
                  </span>
                </span>
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={state}
                  aria-label={t(`account.permission.${key}`)}
                  onValueChange={(value) => {
                    if (value) setState(key, value as KeyState)
                  }}
                >
                  <ToggleGroupItem value="inherited">{t('admin.team.override.state.inherited')}</ToggleGroupItem>
                  {/* A key the role already holds cannot be granted again; one it
                      never held cannot be revoked. The absent option is the
                      honest one: it would change nothing. */}
                  {!inRole && (
                    <ToggleGroupItem value="granted">{t('admin.team.override.state.granted')}</ToggleGroupItem>
                  )}
                  {inRole && (
                    <ToggleGroupItem value="revoked">{t('admin.team.override.state.revoked')}</ToggleGroupItem>
                  )}
                </ToggleGroup>
              </li>
            )
          })}
        </ul>

        <p className="text-xs text-muted-foreground">
          {t('admin.team.override.effective', { count: effective.length, total: PERMISSION_KEYS.length })}
        </p>

        <FieldGroup>
          <Field id="admin-override-cap">
            <FieldLabel>{t('admin.team.override.cap')}</FieldLabel>
            <FieldControl>
              <Input type="number" inputMode="decimal" value={cap} onChange={(event) => setCap(event.target.value)} />
            </FieldControl>
            <FieldDescription>
              {t('admin.team.override.capHelp', {
                amount:
                  capForRole(operator.role) === null
                    ? t('admin.team.cap.unlimited')
                    : formatMoney(capForRole(operator.role) ?? 0),
              })}
            </FieldDescription>
          </Field>
        </FieldGroup>
        <AccessPreview permissions={effective} t={t} />

        {refusal !== null && (
          <p id="admin-override-refusal" role="status" className="text-xs text-foreground">
            {refusal}
          </p>
        )}

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('admin.team.confirm.cancel')}
          </Button>
          <Button
            size="xs"
            onClick={() => void save()}
            disabled={busy}
            aria-describedby={refusal !== null ? 'admin-override-refusal' : undefined}
          >
            {t('admin.team.override.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
