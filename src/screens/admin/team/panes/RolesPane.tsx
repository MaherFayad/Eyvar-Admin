/**
 * Roles & permissions (D20 pane, D17 model) as a master-detail: the roles on
 * the start side, the selected role edited in place on the end side. Nothing
 * opens over the page. A built-in is fixed and duplicated; a custom role is
 * created, edited and deleted here (TA-4). A holders facet answers "who can
 * do this" for an access review (T8.2).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createRole, deleteRole, holdersOf, listRoles, roleDeletionRefusal, updateRole } from '@/data/clients'
import {
  ROLE_NAMES,
  ROLE_PERMISSIONS,
  isApiError,
  isBuiltInRole,
  type PermissionHolder,
  type PermissionKey,
  type Role,
  type RoleName,
} from '@/data/types'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'
import { AccessPreview } from '@/components/access/AccessPreview'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import { InfoHint } from '@/components/InfoHint'
import { MasterDetailPage } from '@/components/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldControl, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { PERMISSION_KEYS } from '@/shell/permissions'
import { roleLabel } from '@/screens/auth/copy'
import { cn } from '@/lib/utils'
import { sameKeySet } from '../permissionGroups'
import { PermissionGroupList } from './PermissionGroupList'

export interface RolesPaneProps {
  canWrite: boolean
  /** The element carrying the page-level refusal, for `aria-describedby`. */
  readOnlyReasonId: string
  t: Translate
  /** Called after any write so the roster pane re-reads too. */
  onChanged: () => void
}

type Draft =
  | {
      mode: 'create'
      name: string
      basedOn: RoleName
      permissions: PermissionKey[]
    }
  | { mode: 'edit'; role: Role; permissions: PermissionKey[] }

export function RolesPane({ canWrite, readOnlyReasonId, t, onChanged }: RolesPaneProps) {
  const roles = useAsync<Role[]>((signal) => listRoles(signal), {
    cacheKey: 'rbac.roles',
  })
  /* A refetch after this pane's own write is a refresh: the list and the
     selection stay on the last rows instead of yielding to a skeleton. */
  const lastRows = useRef<Role[]>([])
  const rows = useMemo(() => {
    if (roles.data) lastRows.current = roles.data
    return roles.data ?? (roles.isRefreshing ? lastRows.current : [])
  }, [roles.data, roles.isRefreshing])
  const settled = roles.status === 'content' || (roles.status === 'loading' && roles.isRefreshing)

  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const current = draft?.mode === 'create' ? null : (rows.find((r) => r.name === selected) ?? null)

  function select(role: Role) {
    setSelected(role.name)
    setDraft(role.builtIn ? null : { mode: 'edit', role, permissions: [...role.permissions] })
    setNameError(null)
  }

  /* The first role is selected once the list lands; nothing is ever shown blank. */
  useEffect(() => {
    if (selected === null && draft === null && rows[0]) select(rows[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  function startCreate(basedOn: RoleName) {
    setSelected(null)
    setDraft({
      mode: 'create',
      name: '',
      basedOn,
      permissions: [...ROLE_PERMISSIONS[basedOn]],
    })
    setNameError(null)
  }

  const shown: readonly PermissionKey[] = draft ? draft.permissions : (current?.permissions ?? [])
  const editable = canWrite && draft !== null
  const dirty =
    draft?.mode === 'create'
      ? true
      : draft?.mode === 'edit'
        ? !sameKeySet(draft.permissions, draft.role.permissions)
        : false

  function toggle(key: PermissionKey, on: boolean) {
    setDraft((d) =>
      d === null
        ? d
        : {
            ...d,
            permissions: on ? [...new Set([...d.permissions, key])] : d.permissions.filter((k) => k !== key),
          },
    )
  }

  function refresh() {
    roles.refetch()
    onChanged()
  }

  async function save() {
    if (draft === null) return
    setBusy(true)
    setNameError(null)
    try {
      const saved =
        draft.mode === 'create'
          ? await createRole({
              name: draft.name.trim(),
              basedOn: draft.basedOn,
              permissions: draft.permissions,
            })
          : await updateRole(draft.role.name, draft.permissions)
      toast.success(
        t(draft.mode === 'create' ? 'admin.team.roles.toast.created' : 'admin.team.roles.toast.saved', {
          name: saved.name,
        }),
      )
      select(saved)
      refresh()
    } catch (thrown) {
      if (isApiError(thrown) && thrown.code === 'role_name_taken') setNameError(t('admin.team.roles.editor.nameTaken'))
      else if (isApiError(thrown) && thrown.code === 'role_name_empty')
        setNameError(t('admin.team.roles.editor.nameEmpty'))
      else
        toast.error(
          t('admin.team.toast.failed', {
            reason: isApiError(thrown) ? thrown.message : t('admin.team.error'),
          }),
        )
    } finally {
      setBusy(false)
    }
  }

  async function remove(role: Role) {
    setBusy(true)
    try {
      await deleteRole(role.name)
      setConfirm(null)
      toast.success(t('admin.team.roles.toast.deleted', { name: role.name }))
      setSelected(null)
      setDraft(null)
      refresh()
    } catch (thrown) {
      toast.error(
        t('admin.team.toast.failed', {
          reason: isApiError(thrown) ? thrown.message : t('admin.team.error'),
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  const list = (
    <div className="flex flex-col gap-3 self-start">
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              {t('admin.team.roles.title')}
              <InfoHint t={t}>{t('admin.team.roles.hint')}</InfoHint>
            </CardTitle>
            <Button
              variant="secondary"
              size="xs"
              disabled={!canWrite || !settled}
              aria-describedby={canWrite ? undefined : readOnlyReasonId}
              onClick={() =>
                startCreate(current && isBuiltInRole(current.name) ? current.name : (current?.basedOn ?? 'Support'))
              }
            >
              {t('admin.team.roles.new')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {roles.status === 'loading' && !roles.isRefreshing ? (
            <div className="flex flex-col gap-2 p-3" aria-label={t('admin.team.roles.loading')}>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : roles.status === 'error' ? (
            <ErrorState
              scope="card"
              message={t('admin.team.roles.error')}
              action={{
                label: t('state.pageError.action'),
                onClick: roles.refetch,
              }}
            />
          ) : (
            <ul aria-label={t('admin.team.roles.title')} className="divide-y divide-border">
              {rows.map((role) => {
                const active = current?.name === role.name
                return (
                  <li key={role.name}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-xs hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        active && 'bg-accent',
                      )}
                      onClick={() => select(role)}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium text-foreground">{roleLabel(t, role.name)}</span>
                        <span className="text-muted-foreground">
                          {role.builtIn ? t('admin.team.roles.builtIn') : t('admin.team.roles.custom')}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {t(
                          role.holders === 1
                            ? 'admin.team.roles.holdersCount.one'
                            : 'admin.team.roles.holdersCount.other',
                          {
                            count: role.holders,
                          },
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      {/* T8.2 lives under the roles: a lookup, not a second record. */}
      <HoldersCard t={t} />
    </div>
  )

  const deletion = current && !current.builtIn ? roleDeletionRefusal(current) : null
  const deleteReason =
    deletion === 'role_has_holders' && current
      ? t('admin.team.roles.refusal.holders', { count: current.holders })
      : null

  const detail =
    !settled ? null : draft?.mode === 'create' ? (
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle>
            {t('admin.team.roles.editor.createTitle', {
              basedOn: roleLabel(t, draft.basedOn),
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="grid grid-cols-2 gap-4 compact:grid-cols-1">
            <Field id="admin-role-name" invalid={nameError !== null}>
              <FieldLabel>{t('admin.team.roles.editor.name')}</FieldLabel>
              <FieldControl>
                <Input
                  value={draft.name}
                  onChange={(event) => {
                    const name = event.target.value
                    setDraft((d) => (d?.mode === 'create' ? { ...d, name } : d))
                    setNameError(null)
                  }}
                  required
                />
              </FieldControl>
              <FieldError>{nameError}</FieldError>
            </Field>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-role-based-on" className="text-xs">
                {t('admin.team.roles.basedOn')}
              </Label>
              <Select
                value={draft.basedOn}
                onValueChange={(value) => {
                  const basedOn = value as RoleName
                  setDraft({
                    mode: 'create',
                    name: draft.name,
                    basedOn,
                    permissions: [...ROLE_PERMISSIONS[basedOn]],
                  })
                }}
              >
                <SelectTrigger id="admin-role-based-on">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_NAMES.map((name) => (
                    <SelectItem key={name} value={name}>
                      {roleLabel(t, name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <PermissionGroupList
            t={t}
            idPrefix="admin-role"
            control={(key) => (
              <Switch
                checked={shown.includes(key)}
                disabled={!editable}
                aria-label={t(`account.permission.${key}`)}
                onCheckedChange={(checked) => toggle(key, checked)}
              />
            )}
          />
          <AccessPreview permissions={shown} t={t} />
          <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="xs"
              disabled={busy}
              onClick={() => (rows[0] ? select(rows[0]) : setDraft(null))}
            >
              {t('admin.team.confirm.cancel')}
            </Button>
            <Button variant="secondary" size="xs" disabled={busy || !canWrite} onClick={() => void save()}>
              {t('admin.team.roles.editor.create')}
            </Button>
          </div>
        </CardContent>
      </Card>
    ) : current ? (
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <CardTitle>{roleLabel(t, current.name)}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {current.builtIn
                  ? t('admin.team.roles.fixedHelp')
                  : t('admin.team.roles.meta', {
                      basedOn: roleLabel(t, current.basedOn ?? 'Support'),
                      count: current.holders,
                    })}
              </p>
            </div>
            <Button
              variant="secondary"
              size="xs"
              disabled={!canWrite}
              aria-describedby={canWrite ? undefined : readOnlyReasonId}
              onClick={() => startCreate(isBuiltInRole(current.name) ? current.name : (current.basedOn ?? 'Support'))}
            >
              {t('admin.team.roles.duplicate')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          <PermissionGroupList
            t={t}
            idPrefix="admin-role"
            control={(key) => (
              <Switch
                checked={shown.includes(key)}
                disabled={!editable}
                aria-label={t(`account.permission.${key}`)}
                aria-describedby={!canWrite ? readOnlyReasonId : undefined}
                onCheckedChange={(checked) => toggle(key, checked)}
              />
            )}
          />
          <p className="text-xs text-muted-foreground">
            {t('admin.team.override.effective', {
              count: shown.length,
              total: PERMISSION_KEYS.length,
            })}
          </p>
          <AccessPreview permissions={shown} t={t} />
          {!current.builtIn && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
              <span className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  disabled={!canWrite || busy || deletion !== null}
                  aria-describedby={
                    !canWrite ? readOnlyReasonId : deleteReason !== null ? 'admin-role-delete-reason' : undefined
                  }
                  onClick={() =>
                    setConfirm({
                      title: t('admin.team.roles.confirm.delete.title', {
                        name: current.name,
                      }),
                      body: t('admin.team.roles.confirm.delete.body'),
                      confirmLabel: t('admin.team.roles.delete'),
                      destructive: true,
                      onConfirm: () => void remove(current),
                    })
                  }
                >
                  {t('admin.team.roles.delete')}
                </Button>
                {deleteReason !== null && (
                  <span id="admin-role-delete-reason" className="text-xs text-muted-foreground">
                    {deleteReason}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <Button variant="ghost" size="xs" disabled={!dirty || busy} onClick={() => select(current)}>
                  {t('admin.team.roles.discard')}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={!dirty || busy || !canWrite}
                  onClick={() => void save()}
                >
                  {t('admin.team.roles.editor.save')}
                </Button>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    ) : null

  return (
    <>
      <MasterDetailPage list={list} detail={detail} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />
    </>
  )
}

/** T8.2: pick a permission, see every holder and how they hold it. */
function HoldersCard({ t }: { t: Translate }) {
  const [key, setKey] = useState<PermissionKey>('manage_team')
  const holders = useAsync<PermissionHolder[]>((signal) => holdersOf(key, signal), {
    deps: [key],
    cacheKey: 'rbac.holders',
  })
  const options = useMemo(
    () =>
      PERMISSION_KEYS.map((k) => ({
        key: k,
        label: t(`account.permission.${k}`),
      })),
    [t],
  )

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2">
          {t('admin.team.roles.holdersOf.title')}
          <InfoHint t={t}>{t('admin.team.roles.holdersOf.hint')}</InfoHint>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-4 text-xs">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-holders-key">{t('admin.team.roles.holdersOf.pick')}</Label>
          <Select value={key} onValueChange={(value) => setKey(value as PermissionKey)}>
            <SelectTrigger id="admin-holders-key" className="w-full">
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
            action={{
              label: t('state.pageError.action'),
              onClick: holders.refetch,
            }}
          />
        ) : (holders.data ?? []).length === 0 ? (
          <p className="text-muted-foreground">{t('admin.team.roles.holdersOf.empty')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {(holders.data ?? []).map((holder) => (
              <li key={holder.user.id} className="flex min-w-0 flex-col py-2">
                <span className="truncate font-medium text-foreground">{holder.user.name}</span>
                <span className="text-muted-foreground">
                  {roleLabel(t, holder.user.role)}
                  {' · '}
                  {t(
                    holder.via === 'baseline'
                      ? 'admin.team.roles.holdersOf.viaBaseline'
                      : 'admin.team.roles.holdersOf.viaGranted',
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
