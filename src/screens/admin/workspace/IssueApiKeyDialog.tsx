/**
 * Issue an API key — the scope picker, and the escalation ceiling.
 *
 * ## Every scope renders, and the ones you cannot grant are disabled in place
 *
 * `clients/integrations.ts` refuses a key carrying a scope its issuer does not
 * hold: without that, anybody holding `manage_workspace` — this pane's own
 * write key — could mint a machine credential carrying `process_payouts` and
 * then present it, which is D17's matrix bypassed through a settings pane.
 *
 * **§11.2 decides how that looks here.** The refused scopes are *not* filtered
 * out of the list. Hiding them would teach the operator that Eyvar has nine
 * scopes rather than nineteen, and the day their role widens they would have
 * no idea what they gained. So all nineteen render, the ones outside the
 * operator's own authority are disabled with one stated reason, and the
 * server's 422 is a backstop rather than the first thing anybody meets.
 *
 * ## Rules applied
 *   §11.2      refused scopes disabled in place, one shared reason sentence,
 *              linked by `aria-describedby` rather than repeated nineteen times.
 *   §4.3       a boolean saved with the form is a CHECKBOX, never a switch.
 *   §10.4      the name and the empty-scope refusal are validated in the dialog,
 *              before the mutation, with the message under the field; the
 *              client's 422 lands in the same place if it disagrees.
 *   §5.7       the primary repeats the verb — `Issue key`, never `OK`.
 *   §7.4.5     a placeholder is never a label.
 *   §7.2       focus is trapped by `dialog.tsx`; nothing mutates until the
 *              primary is pressed.
 */

import { useEffect, useId, useMemo, useState } from 'react'
import { API_KEY_SCOPES } from '@/data/types/integrations'
import type { PermissionKey } from '@/data/types'
import type { Translate } from '@/lib'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * The scope's own name, per key. Written out rather than built from a template
 * literal: a key assembled at runtime is invisible to every lexical check the
 * repo runs over the dictionaries, and `EmailLogCard` already pays that cost
 * deliberately.
 */
const SCOPE_LABEL: Record<string, string> = {
  view_analytics: 'admin.integrations.scope.view_analytics',
  view_operations: 'admin.integrations.scope.view_operations',
  view_finance: 'admin.integrations.scope.view_finance',
  view_support: 'admin.integrations.scope.view_support',
  view_admin: 'admin.integrations.scope.view_admin',
  view_profiles: 'admin.integrations.scope.view_profiles',
  approve_drivers: 'admin.integrations.scope.approve_drivers',
  manage_subscriptions: 'admin.integrations.scope.manage_subscriptions',
  live_ops: 'admin.integrations.scope.live_ops',
  manage_plans: 'admin.integrations.scope.manage_plans',
  process_payouts: 'admin.integrations.scope.process_payouts',
  release_escrow: 'admin.integrations.scope.release_escrow',
  apply_deductions: 'admin.integrations.scope.apply_deductions',
  manage_tickets: 'admin.integrations.scope.manage_tickets',
  contact_users: 'admin.integrations.scope.contact_users',
  manage_team: 'admin.integrations.scope.manage_team',
  manage_ops_policy: 'admin.integrations.scope.manage_ops_policy',
  manage_workspace: 'admin.integrations.scope.manage_workspace',
  manage_data_governance: 'admin.integrations.scope.manage_data_governance',
  manage_security_policy: 'admin.integrations.scope.manage_security_policy',
}

/** Shown beside the scope name where granting it hands a machine real authority. */
const WRITE_SCOPES: readonly PermissionKey[] = [
  'process_payouts',
  'release_escrow',
  'apply_deductions',
  'manage_team',
  'manage_ops_policy',
  'manage_workspace',
  'manage_data_governance',
  'manage_security_policy',
]

export function scopeLabelKey(scope: PermissionKey): string {
  return SCOPE_LABEL[scope] ?? 'admin.integrations.scope.unknown'
}

export function IssueApiKeyDialog({
  open,
  held,
  busy,
  serverErrors,
  onSubmit,
  onClose,
  t,
}: {
  open: boolean
  /** The signed-in operator's own permissions. The ceiling on what may be granted. */
  held: readonly PermissionKey[]
  busy: boolean
  /** Field-keyed messages from the client's 422, if the backstop fired. */
  serverErrors: Record<string, string>
  onSubmit: (input: { name: string; scopes: PermissionKey[] }) => void
  onClose: () => void
  t: Translate
}) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<PermissionKey[]>([])
  const [touched, setTouched] = useState(false)
  const dialogId = useId()
  const refusalId = `${dialogId}-scope-refusal`

  useEffect(() => {
    if (open) {
      setName('')
      setScopes([])
      setTouched(false)
    }
  }, [open])

  const grantable = useMemo(
    () => new Set(API_KEY_SCOPES.filter((scope) => held.includes(scope))),
    [held],
  )

  if (!open) return null

  const nameError =
    serverErrors['name'] ?? (touched && name.trim() === '' ? t('admin.integrations.key.name.required') : null)
  const scopeError =
    serverErrors['scopes'] ??
    (touched && scopes.length === 0 ? t('admin.integrations.key.scopes.required') : null)
  const incomplete = name.trim() === '' || scopes.length === 0

  function toggle(scope: PermissionKey, checked: boolean) {
    setScopes((current) =>
      checked ? [...current, scope] : current.filter((each) => each !== scope),
    )
  }

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{t('admin.integrations.key.issue.title')}</DialogTitle>
          <DialogDescription>{t('admin.integrations.key.issue.desc')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${dialogId}-name`}>{t('admin.integrations.key.name.label')}</Label>
          <Input
            id={`${dialogId}-name`}
            value={name}
            disabled={busy}
            aria-invalid={nameError !== null}
            aria-describedby={`${dialogId}-name-help`}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
          />
          <span
            id={`${dialogId}-name-help`}
            className={nameError !== null ? 'text-2xs text-destructive' : 'text-2xs text-muted-foreground'}
          >
            {nameError ?? t('admin.integrations.key.name.help')}
          </span>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-semibold text-foreground">
            {t('admin.integrations.key.scopes.label')}
          </legend>
          <p className="text-2xs text-muted-foreground">
            {t('admin.integrations.key.scopes.help')}
          </p>

          {/* §11.2 — the sentence is stated ONCE and every refused checkbox
              points at it, rather than nineteen identical lines of noise. */}
          <p id={refusalId} className="text-2xs text-muted-foreground">
            {t('admin.integrations.key.scopes.ceiling')}
          </p>

          <div className="grid max-h-64 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 md:grid-cols-2">
            {API_KEY_SCOPES.map((scope) => {
              const allowed = grantable.has(scope)
              const id = `${dialogId}-scope-${scope}`
              return (
                <div key={scope} className="flex items-start gap-2 py-0.5">
                  <Checkbox
                    id={id}
                    checked={scopes.includes(scope)}
                    disabled={busy || !allowed}
                    aria-describedby={allowed ? undefined : refusalId}
                    onCheckedChange={(value) => toggle(scope, value === true)}
                  />
                  <Label
                    htmlFor={id}
                    className={
                      allowed
                        ? 'text-2xs leading-4 font-normal'
                        : 'text-2xs leading-4 font-normal text-muted-foreground'
                    }
                  >
                    {t(scopeLabelKey(scope))}
                    {WRITE_SCOPES.includes(scope) && (
                      /* §7.5 — a word, not a colour. A machine credential that
                         can move money should say so where it is granted. */
                      <span className="ms-1 text-muted-foreground">
                        {t('admin.integrations.key.scopes.writeMarker')}
                      </span>
                    )}
                  </Label>
                </div>
              )
            })}
          </div>

          {scopeError !== null && <span className="text-2xs text-destructive">{scopeError}</span>}
        </fieldset>

        <DialogFooter>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="xs" disabled={busy} onClick={onClose}>
                {t('admin.integrations.cancel')}
              </Button>
              <Button
                size="xs"
                disabled={busy || incomplete}
                aria-describedby={incomplete ? `${dialogId}-blocked` : undefined}
                onClick={() => {
                  setTouched(true)
                  if (!incomplete) onSubmit({ name: name.trim(), scopes })
                }}
              >
                {busy ? t('admin.integrations.key.issuing') : t('admin.integrations.key.issue')}
              </Button>
            </div>
            {incomplete && (
              <span id={`${dialogId}-blocked`} className="text-2xs text-muted-foreground">
                {t('admin.integrations.key.issue.blocked')}
              </span>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
