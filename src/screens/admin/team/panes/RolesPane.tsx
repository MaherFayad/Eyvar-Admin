/**
 * Roles & permissions (D20 pane, D17 model). One grid over every role, built-in
 * and custom, from the same keys the router gates on (AC-924); a built-in is
 * fixed, a custom role is duplicated from one and deleted only unheld (TA-4);
 * and a holders facet answers "who can do this" for an access review (T8.2).
 */

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { deleteRole, holdersOf, listRoles, roleDeletionRefusal } from '@/data/clients'
import { isApiError, isBuiltInRole, type PermissionHolder, type PermissionKey, type Role } from '@/data/types'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import { InfoHint } from '@/components/InfoHint'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PERMISSION_KEYS } from '@/shell/permissions'
import { roleLabel } from '@/screens/auth/copy'
import { Check } from 'lucide-react'
import { RoleEditorDialog, type RoleEditorRequest } from './RoleEditorDialog'

export interface RolesPaneProps {
  canWrite: boolean
  /** The element carrying the page-level refusal, for `aria-describedby`. */
  readOnlyReasonId: string
  t: Translate
  /** Called after any write so the roster pane re-reads too. */
  onChanged: () => void
}

export function RolesPane({ canWrite, readOnlyReasonId, t, onChanged }: RolesPaneProps) {
  const roles = useAsync<Role[]>((signal) => listRoles(signal), { cacheKey: 'rbac.roles' })
  const [editor, setEditor] = useState<RoleEditorRequest | null>(null)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = roles.data ?? []

  function refresh() {
    roles.refetch()
    onChanged()
  }

  async function remove(role: Role) {
    setBusy(true)
    try {
      await deleteRole(role.name)
      setConfirm(null)
      toast.success(t('admin.team.roles.toast.deleted', { name: role.name }))
      refresh()
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
          <CardTitle className="flex items-center gap-2">
            {t('admin.team.roles.title')}
            <InfoHint t={t}>{t('admin.team.roles.hint')}</InfoHint>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 p-0">
          {roles.status === 'loading' ? (
            <div className="flex flex-col gap-2 p-3" aria-label={t('admin.team.roles.loading')}>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : roles.status === 'error' ? (
            <ErrorState
              scope="card"
              message={t('admin.team.roles.error')}
              action={{ label: t('state.pageError.action'), onClick: roles.refetch }}
            />
          ) : (
            <div className="relative min-w-0 max-w-full overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th scope="col" className="sticky start-0 z-10 w-64 min-w-64 bg-muted/40 p-3 text-start">
                      {t('admin.team.matrix.capability')}
                    </th>
                    {rows.map((role) => (
                      <th key={role.name} scope="col" className="p-3 text-center align-top">
                        <span className="block text-foreground">{roleLabel(t, role.name)}</span>
                        {!role.builtIn && (
                          <span className="block font-normal text-muted-foreground">{t('admin.team.roles.custom')}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="bg-muted/10">
                    <th scope="row" className="sticky start-0 bg-card p-3 text-start font-medium text-foreground">
                      {t('admin.team.roles.holders')}
                    </th>
                    {rows.map((role) => (
                      <td key={role.name} className="p-3 text-center tabular-nums text-foreground">
                        {role.holders}
                      </td>
                    ))}
                  </tr>
                  {PERMISSION_KEYS.map((key) => (
                    <tr key={key} className="hover:bg-muted/20">
                      <th scope="row" className="sticky start-0 w-64 min-w-64 bg-card p-3 text-start font-normal">
                        <span className="block font-medium text-foreground">{t(`account.permission.${key}`)}</span>
                      </th>
                      {rows.map((role) => {
                        const granted = role.permissions.includes(key)
                        return (
                          <td key={role.name} className="p-2 text-center">
                            {/* Granted carries a shape; withheld carries none (§7.5, S9). */}
                            {granted ? (
                              <span
                                className="mx-auto flex size-6 items-center justify-center rounded-md border border-success-foreground/25 bg-success text-success-foreground"
                                aria-hidden="true"
                              >
                                <Check className="size-4" />
                              </span>
                            ) : (
                              <span className="mx-auto block size-6" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {granted ? t('admin.team.matrix.granted') : t('admin.team.matrix.withheld')}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="sticky start-0 bg-card p-3 text-start font-medium text-foreground">
                      <span className="sr-only">{t('admin.team.roles.actions')}</span>
                    </th>
                    {rows.map((role) => (
                      <td key={role.name} className="p-2 text-center align-top">
                        <RoleActions
                          role={role}
                          canWrite={canWrite}
                          readOnlyReasonId={readOnlyReasonId}
                          t={t}
                          onDuplicate={() =>
                            setEditor({
                              mode: 'create',
                              basedOn: isBuiltInRole(role.name) ? role.name : (role.basedOn ?? 'Support'),
                              permissions: role.permissions,
                            })
                          }
                          onEdit={() => setEditor({ mode: 'edit', role })}
                          onDelete={() =>
                            setConfirm({
                              title: t('admin.team.roles.confirm.delete.title', { name: role.name }),
                              body: t('admin.team.roles.confirm.delete.body'),
                              confirmLabel: t('admin.team.roles.delete'),
                              destructive: true,
                              onConfirm: () => void remove(role),
                            })
                          }
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <HoldersCard t={t} />

      <RoleEditorDialog
        request={editor}
        onClose={() => setEditor(null)}
        onSaved={(role) => {
          toast.success(
            t(editor?.mode === 'edit' ? 'admin.team.roles.toast.saved' : 'admin.team.roles.toast.created', {
              name: role.name,
            }),
          )
          refresh()
        }}
        t={t}
      />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />
    </>
  )
}

/** The three controls under a role column, each refused in place with its reason (§11.2). */
function RoleActions({
  role,
  canWrite,
  readOnlyReasonId,
  t,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  role: Role
  canWrite: boolean
  readOnlyReasonId: string
  t: Translate
  onDuplicate: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const deletion = roleDeletionRefusal(role)
  const deleteReason =
    !canWrite
      ? null
      : deletion === 'role_built_in'
        ? t('admin.team.matrix.fixed')
        : deletion === 'role_has_holders'
          ? t('admin.team.roles.refusal.holders', { count: role.holders })
          : null
  const reasonId = `admin-role-delete-reason-${role.name.replace(/\W+/g, '-')}`

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button
        variant="secondary"
        size="xs"
        disabled={!canWrite}
        aria-describedby={canWrite ? undefined : readOnlyReasonId}
        onClick={onDuplicate}
      >
        {t('admin.team.roles.duplicate')}
      </Button>
      {!role.builtIn && (
        <>
          <Button
            variant="secondary"
            size="xs"
            disabled={!canWrite}
            aria-describedby={canWrite ? undefined : readOnlyReasonId}
            onClick={onEdit}
          >
            {t('admin.team.roles.edit')}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            disabled={!canWrite || deletion !== null}
            aria-describedby={!canWrite ? readOnlyReasonId : deletion !== null ? reasonId : undefined}
            onClick={onDelete}
          >
            {t('admin.team.roles.delete')}
          </Button>
          {deleteReason !== null && (
            <span id={reasonId} className="text-xs text-muted-foreground">
              {deleteReason}
            </span>
          )}
        </>
      )}
    </div>
  )
}

/** T8.2: pick a permission, see every holder and how they hold it. */
function HoldersCard({ t }: { t: Translate }) {
  const [key, setKey] = useState<PermissionKey>('manage_team')
  const holders = useAsync<PermissionHolder[]>((signal) => holdersOf(key, signal), {
    deps: [key],
    cacheKey: 'rbac.holders',
  })
  const options = useMemo(() => PERMISSION_KEYS.map((k) => ({ key: k, label: t(`account.permission.${k}`) })), [t])

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2">
          {t('admin.team.roles.holdersOf.title')}
          <InfoHint t={t}>{t('admin.team.roles.holdersOf.hint')}</InfoHint>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-4 text-xs">
        <div className="flex max-w-sm flex-col gap-1.5">
          <Label htmlFor="admin-holders-key">{t('admin.team.roles.holdersOf.pick')}</Label>
          <Select value={key} onValueChange={(value) => setKey(value as PermissionKey)}>
            <SelectTrigger id="admin-holders-key">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {holders.status === 'loading' ? (
          <Skeleton className="h-8 w-full" />
        ) : holders.status === 'error' ? (
          <ErrorState
            scope="card"
            message={t('admin.team.roles.error')}
            action={{ label: t('state.pageError.action'), onClick: holders.refetch }}
          />
        ) : (holders.data ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t('admin.team.roles.holdersOf.empty')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {(holders.data ?? []).map((holder) => (
              <li key={holder.user.id} className="flex items-center justify-between gap-3 py-2">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">{holder.user.name}</span>
                  <span className="text-muted-foreground">{roleLabel(t, holder.user.role)}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {t(holder.via === 'baseline' ? 'admin.team.roles.holdersOf.viaBaseline' : 'admin.team.roles.holdersOf.viaGranted')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
