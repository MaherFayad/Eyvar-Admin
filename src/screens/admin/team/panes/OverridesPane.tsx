/**
 * Overrides (D20 pane, AC-921) as a master-detail: every operator on the start
 * side, the selected one's permissions edited in place on the end side. Each
 * key is inherited from the role, granted on top of it or revoked from it;
 * the effective set and the router's own preview update live (AC-924). The
 * F-016 refusal is stated where the client would throw it (AC-922).
 */

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { baselineFor, capForRole, setCompensationCap, setPermissionDelta } from '@/data/clients'
import { isApiError, type PermissionKey, type TeamUser } from '@/data/types'
import { formatMoney, type Translate } from '@/lib'
import { AccessPreview } from '@/components/access/AccessPreview'
import { InfoHint } from '@/components/InfoHint'
import { MasterDetailPage } from '@/components/PageShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PERMISSION_KEYS } from '@/shell/permissions'
import { roleLabel } from '@/screens/auth/copy'
import { cn } from '@/lib/utils'
import { sameKeySet } from '../permissionGroups'
import { PermissionGroupList } from './PermissionGroupList'

export interface OverridesPaneProps {
  users: readonly TeamUser[]
  canWrite: boolean
  readOnlyReasonId: string
  t: Translate
  onChanged: () => void
}

type KeyState = 'inherited' | 'granted' | 'revoked'

function hasDelta(user: TeamUser): boolean {
  return (user.permissionDelta?.granted.length ?? 0) > 0 || (user.permissionDelta?.revoked.length ?? 0) > 0
}

export function OverridesPane({ users, canWrite, readOnlyReasonId, t, onChanged }: OverridesPaneProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [granted, setGranted] = useState<PermissionKey[]>([])
  const [revoked, setRevoked] = useState<PermissionKey[]>([])
  const [cap, setCap] = useState('')
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

  const operator = users.find((u) => u.id === selectedId) ?? users[0] ?? null

  /* The draft follows the selection, and a saved write re-seeds it from the roster. */
  useEffect(() => {
    if (operator === null) return
    setGranted([...(operator.permissionDelta?.granted ?? [])])
    setRevoked([...(operator.permissionDelta?.revoked ?? [])])
    setCap(operator.compensationCapHalalas === null ? '' : String(operator.compensationCapHalalas / 100))
    setRefusal(null)
  }, [operator])

  const baseline = useMemo(() => new Set(operator ? (baselineFor(operator.role) ?? []) : []), [operator])
  const effective = useMemo(
    () => PERMISSION_KEYS.filter((k) => (baseline.has(k) && !revoked.includes(k)) || granted.includes(k)),
    [baseline, granted, revoked],
  )

  const parsedCap = cap.trim() === '' ? null : Math.round(Number(cap) * 100)
  const nextCap = parsedCap !== null && Number.isFinite(parsedCap) ? parsedCap : null
  const dirty =
    operator !== null &&
    (!sameKeySet(granted, operator.permissionDelta?.granted ?? []) ||
      !sameKeySet(revoked, operator.permissionDelta?.revoked ?? []) ||
      nextCap !== operator.compensationCapHalalas)

  const withOverride = users.filter((u) => hasDelta(u) || u.compensationCapHalalas !== capForRole(u.role))

  /* Search narrows the list only; the selection and its draft survive a query. */
  const needle = query.trim().toLowerCase()
  const visible =
    needle === ''
      ? users
      : users.filter((u) => [u.name, u.email, roleLabel(t, u.role)].some((s) => s.toLowerCase().includes(needle)))

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

  async function write(nextGranted: PermissionKey[], nextRevoked: PermissionKey[], capHalalas: number | null) {
    if (operator === null) return
    setBusy(true)
    setRefusal(null)
    try {
      await setPermissionDelta(operator.id, {
        granted: nextGranted,
        revoked: nextRevoked,
      })
      /* The cap is its own write (O-T5): blank is no cap, a number is riyals. */
      if (capHalalas !== operator.compensationCapHalalas) await setCompensationCap(operator.id, capHalalas)
      toast.success(t('admin.team.override.toast.saved', { name: operator.name }))
      onChanged()
    } catch (thrown) {
      if (isApiError(thrown) && thrown.code === 'last_manage_team_holder') {
        setRefusal(t('admin.team.refusal.lastManageTeamHolder'))
      } else {
        toast.error(
          t('admin.team.toast.failed', {
            reason: isApiError(thrown) ? thrown.message : t('admin.team.error'),
          }),
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const list = (
    <Card className="self-start">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2">
          {t('admin.team.overrides.title')}
          <InfoHint t={t}>{t('admin.team.overrides.hint')}</InfoHint>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {withOverride.length === 0
            ? t('admin.team.overrides.empty')
            : t('admin.team.overrides.count', { count: withOverride.length })}
        </p>
        <div className="relative mt-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            placeholder={t('admin.team.search')}
            aria-label={t('admin.team.search')}
            className="ps-8"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('')
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {visible.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">{t('admin.team.noMatch')}</p>}
        <ul aria-label={t('admin.team.overrides.title')} className="divide-y divide-border">
          {visible.map((user) => {
            const active = operator?.id === user.id
            const overridden = withOverride.includes(user)
            return (
              <li key={user.id}>
                <button
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 px-3 py-2 text-start text-xs hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    active && 'bg-accent',
                  )}
                  onClick={() => setSelectedId(user.id)}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-foreground">{user.name}</span>
                    <span className="text-muted-foreground">{roleLabel(t, user.role)}</span>
                    {/* `Support + release_escrow − contact_users`, in words (AC-921). */}
                    {hasDelta(user) && (
                      <span className="flex flex-wrap gap-x-2 text-muted-foreground">
                        {user.permissionDelta?.granted.map((key) => (
                          <span key={`g-${key}`}>
                            {t('admin.team.overrides.plus', {
                              label: t(`account.permission.${key}`),
                            })}
                          </span>
                        ))}
                        {user.permissionDelta?.revoked.map((key) => (
                          <span key={`r-${key}`}>
                            {t('admin.team.overrides.minus', {
                              label: t(`account.permission.${key}`),
                            })}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  {overridden && (
                    <span className="shrink-0 text-xs text-muted-foreground">{t('admin.team.overrides.mark')}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )

  const detail =
    operator === null ? null : (
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle>{t('admin.team.override.dialog.title', { name: operator.name })}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t('admin.team.override.dialog.role', {
              role: roleLabel(t, operator.role),
            })}
            {' · '}
            {t('admin.team.override.effective', {
              count: effective.length,
              total: PERMISSION_KEYS.length,
            })}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          <PermissionGroupList
            t={t}
            idPrefix="admin-override"
            note={(key) => (
              <span className="text-muted-foreground">
                {t(baseline.has(key) ? 'admin.team.override.inRole' : 'admin.team.override.notInRole')}
              </span>
            )}
            control={(key) => {
              const inRole = baseline.has(key)
              return (
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={stateOf(key)}
                  disabled={!canWrite}
                  aria-label={t(`account.permission.${key}`)}
                  onValueChange={(value) => {
                    if (value) setState(key, value as KeyState)
                  }}
                >
                  <ToggleGroupItem value="inherited">{t('admin.team.override.state.inherited')}</ToggleGroupItem>
                  {/* A key the role holds cannot be granted again; one it never held cannot be revoked. */}
                  {!inRole && (
                    <ToggleGroupItem value="granted">{t('admin.team.override.state.granted')}</ToggleGroupItem>
                  )}
                  {inRole && (
                    <ToggleGroupItem value="revoked">{t('admin.team.override.state.revoked')}</ToggleGroupItem>
                  )}
                </ToggleGroup>
              )
            }}
          />

          <Field id="admin-override-cap" disabled={!canWrite}>
            <FieldLabel>{t('admin.team.override.cap')}</FieldLabel>
            <FieldControl>
              <Input
                type="number"
                inputMode="decimal"
                value={cap}
                className="w-40"
                onChange={(event) => setCap(event.target.value)}
              />
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

          <AccessPreview permissions={effective} t={t} />

          {refusal !== null && (
            <p id="admin-override-refusal" role="status" className="text-xs text-foreground">
              {refusal}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="xs"
              disabled={
                !canWrite ||
                busy ||
                (!hasDelta(operator) && operator.compensationCapHalalas === capForRole(operator.role))
              }
              aria-describedby={canWrite ? undefined : readOnlyReasonId}
              onClick={() => void write([], [], capForRole(operator.role))}
            >
              {t('admin.team.overrides.clear')}
            </Button>
            <span className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                disabled={!dirty || busy}
                onClick={() => {
                  setGranted([...(operator.permissionDelta?.granted ?? [])])
                  setRevoked([...(operator.permissionDelta?.revoked ?? [])])
                  setCap(operator.compensationCapHalalas === null ? '' : String(operator.compensationCapHalalas / 100))
                  setRefusal(null)
                }}
              >
                {t('admin.team.roles.discard')}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                disabled={!dirty || busy || !canWrite}
                aria-describedby={
                  refusal !== null ? 'admin-override-refusal' : !canWrite ? readOnlyReasonId : undefined
                }
                onClick={() => void write(granted, revoked, nextCap)}
              >
                {t('admin.team.override.save')}
              </Button>
            </span>
          </div>
        </CardContent>
      </Card>
    )

  return <MasterDetailPage list={list} detail={detail} />
}
