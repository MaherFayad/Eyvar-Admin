/**
 * Overrides (D20 pane). One row per operator whose permissions differ from
 * their role, displayed as a delta and never flattened (AC-921); an override
 * is added, edited or removed through one dialog.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { setPermissionDelta } from '@/data/clients'
import { isApiError, type TeamUser } from '@/data/types'
import type { Translate } from '@/lib'
import { InfoHint } from '@/components/InfoHint'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { roleLabel } from '@/screens/auth/copy'
import { OverrideDialog } from './OverrideDialog'

export interface OverridesPaneProps {
  users: readonly TeamUser[]
  canWrite: boolean
  readOnlyReasonId: string
  t: Translate
  onChanged: () => void
}

export function OverridesPane({ users, canWrite, readOnlyReasonId, t, onChanged }: OverridesPaneProps) {
  const [editing, setEditing] = useState<TeamUser | null>(null)
  const [pick, setPick] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const withDelta = users.filter(
    (u) => u.permissionDelta && (u.permissionDelta.granted.length > 0 || u.permissionDelta.revoked.length > 0),
  )
  const without = users.filter((u) => !withDelta.includes(u))

  async function clear(user: TeamUser) {
    setBusy(true)
    try {
      await setPermissionDelta(user.id, { granted: [], revoked: [] })
      toast.success(t('admin.team.override.toast.cleared', { name: user.name }))
      onChanged()
    } catch (thrown) {
      toast.error(t('admin.team.toast.failed', { reason: isApiError(thrown) ? thrown.message : t('admin.team.error') }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              {t('admin.team.overrides.title')}
              <InfoHint t={t}>{t('admin.team.overrides.hint')}</InfoHint>
            </CardTitle>
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="admin-override-pick" className="text-xs">
                  {t('admin.team.override.picker')}
                </Label>
                <Select value={pick} onValueChange={setPick} disabled={!canWrite || without.length === 0}>
                  <SelectTrigger id="admin-override-pick" className="min-w-48">
                    <SelectValue placeholder={t('admin.team.override.pickerPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {without.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="secondary"
                size="xs"
                disabled={!canWrite || pick === ''}
                aria-describedby={canWrite ? undefined : readOnlyReasonId}
                onClick={() => {
                  const user = users.find((u) => u.id === pick) ?? null
                  setEditing(user)
                }}
              >
                {t('admin.team.overrides.add')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {withDelta.length === 0 ? (
            /* R8's second kind: one grey sentence. */
            <p className="p-3 text-xs text-muted-foreground">{t('admin.team.overrides.empty')}</p>
          ) : (
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    {t('admin.team.overrides.column.operator')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('admin.team.overrides.column.delta')}
                  </th>
                  <th scope="col" className="p-3 text-end">
                    <span className="sr-only">{t('admin.team.rowActions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {withDelta.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20">
                    <td className="p-3">
                      <span className="flex flex-col">
                        <span className="font-semibold text-foreground">{user.name}</span>
                        <span className="text-muted-foreground">{roleLabel(t, user.role)}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      {/* `Support + release_escrow − contact_users`, as chips with words. */}
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="text-foreground">{roleLabel(t, user.role)}</span>
                        {user.permissionDelta?.granted.map((key) => (
                          <StatusBadge key={`g-${key}`} tone="success">
                            {t('admin.team.overrides.plus', { label: t(`account.permission.${key}`) })}
                          </StatusBadge>
                        ))}
                        {user.permissionDelta?.revoked.map((key) => (
                          <StatusBadge key={`r-${key}`} tone="neutral">
                            {t('admin.team.overrides.minus', { label: t(`account.permission.${key}`) })}
                          </StatusBadge>
                        ))}
                      </span>
                    </td>
                    <td className="p-3 text-end">
                      <span className="flex justify-end gap-1">
                        <Button
                          variant="secondary"
                          size="xs"
                          disabled={!canWrite || busy}
                          aria-describedby={canWrite ? undefined : readOnlyReasonId}
                          onClick={() => setEditing(user)}
                        >
                          {t('admin.team.overrides.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={!canWrite || busy}
                          aria-describedby={canWrite ? undefined : readOnlyReasonId}
                          onClick={() => void clear(user)}
                        >
                          {t('admin.team.overrides.clear')}
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <OverrideDialog
        operator={editing}
        onClose={() => setEditing(null)}
        onSaved={(user) => {
          toast.success(t('admin.team.override.toast.saved', { name: user.name }))
          setPick('')
          onChanged()
        }}
        t={t}
      />
    </>
  )
}
