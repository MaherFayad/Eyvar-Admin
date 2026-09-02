/**
 * Admin-side sessions and devices — plan task **P6-T8**.
 *
 * `clients/auth.ts` has held `listDevices(userId)` and `revokeDevice(deviceId)`
 * since wave 5 and **no admin surface used either**. This is that surface.
 *
 * ## Half of P6-T8 lands, and the other half is refused in place rather than faked
 *
 * `listDevices` already takes an operator id — AC-661/662 anticipated exactly
 * this: *"another account's sessions need `manage_team`, which is why `userId`
 * is optional here."* So the **list** works for any operator today.
 *
 * `revokeDevice` does not. It resolves the device against
 * `devicesFor(signedInUserId ?? CURRENT_USER_ID)` (`clients/auth.ts:959`) and
 * takes no operator id, so another operator's device is a 404. §11.2 is
 * explicit about what to do with that: the control renders, **disabled in
 * place, with its reason** — it is not hidden, and the operator is not left to
 * discover the limit by clicking. `clients/team.ts` answers `canRevoke` and a
 * refusal code on the same read, so the surface never has to guess.
 *
 * Rules applied
 *   §5.5       the per-row confirmation expands **in the row**. A modal nested
 *              inside this dialog is forbidden, and it also replaces the
 *              legacy native `confirm()` at `:3059` (D-A9).
 *   §11.2      `Sign out` on another operator's row is disabled with its
 *              reason as real text — never a tooltip (§8.4.4).
 *   R8         the empty is the second kind: one grey sentence, no
 *              illustration. *"Signed in on no device."* `USR-4` reaches it
 *              without a hand edit (AC-653).
 *   §9 (auth)  the IP is a single LTR token inside `<bdi dir="ltr">`, and
 *              `Trusted until {date}` is gated on `isDeviceTrusted` rather than
 *              on `trustedUntil !== null` — `USR-3`'s row is seeded four days
 *              expired precisely so a screen that gets this wrong renders a
 *              date that has already gone by.
 *   §7.2       every control here is a `<button>` with the primitive's own
 *              focus ring. Nothing removes an outline.
 */

import { useState } from 'react'
import { isDeviceTrusted, listOperatorSessions, revokeOperatorSession } from '@/data/clients'
import type { DeviceSession, TeamUser } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate, type Language, type Translate } from '@/lib'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

interface SessionsResponse {
  items: DeviceSession[]
  canRevoke: boolean
  refusal: string | null
}

export function OperatorSessionsDialog({
  operator,
  onClose,
  onRevoked,
  t,
  language,
}: {
  operator: TeamUser | null
  onClose: () => void
  onRevoked: () => void
  t: Translate
  language: Language
}) {
  const userId = operator?.id ?? null

  const data = useAsync<SessionsResponse>(
    (signal) =>
      userId === null
        ? Promise.resolve({ items: [], canRevoke: false, refusal: null })
        : listOperatorSessions(userId, signal),
    {
      /* Keyed by the operator whose sessions these are - the one dependency
         that must not be missing here. Revoke calls `refetch`. */
      deps: [userId],
      enabled: userId !== null,
      cacheKey: 'team.sessions',
    },
  )

  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (operator === null) return null

  const rows = data.data?.items ?? []
  const canRevoke = data.data?.canRevoke ?? false
  const refusal =
    data.data?.refusal === 'cross_operator_session'
      ? t('admin.team.refusal.crossOperatorSession')
      : null

  async function handleRevoke(deviceId: string) {
    if (userId === null) return
    setBusy(true)
    try {
      await revokeOperatorSession(userId, deviceId)
      setConfirming(null)
      data.refetch()
      onRevoked()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.team.sessions.title', { name: operator.name })}</DialogTitle>
          <DialogDescription>{t('admin.team.sessions.desc')}</DialogDescription>
        </DialogHeader>

        {/* The four states, in order. They are dialog-scoped because the dialog
            is the surface that owns this read. */}
        {data.status === 'loading' ? (
          <div className="flex flex-col gap-2" aria-label={t('admin.team.sessions.loading')}>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data.status === 'error' ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{t('admin.team.sessions.error')}</p>
            <Button size="xs" onClick={data.refetch}>
              {t('state.pageError.action')}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          /* R8's second kind — one grey sentence, no illustration. */
          <p className="text-xs text-muted-foreground">{t('admin.team.sessions.empty')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((device) => {
              const trusted = isDeviceTrusted(device)
              return (
                <li key={device.id} className="flex flex-col gap-1.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        {device.device}
                        {device.isCurrent && (
                          <StatusBadge tone="neutral">
                            {t('admin.team.sessions.thisDevice')}
                          </StatusBadge>
                        )}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        {device.location} · <bdi dir="ltr">{device.ip}</bdi> ·{' '}
                        {formatDate(device.lastActiveAt, { language, style: 'day-month-time' })}
                      </span>
                      <span className="text-2xs text-muted-foreground">
                        {trusted && device.trustedUntil !== null
                          ? t('admin.team.sessions.trusted', {
                              date: formatDate(device.trustedUntil, { language }),
                            })
                          : t('admin.team.sessions.untrusted')}
                      </span>
                    </div>

                    {/* §5.5 — the confirmation expands in the row, never a
                        nested modal. §11.2 — refused controls stay put. */}
                    {confirming === device.id ? (
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Button
                          size="xs"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => void handleRevoke(device.id)}
                        >
                          {t('admin.team.sessions.confirm')}
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setConfirming(null)}>
                          {t('admin.team.sessions.cancel')}
                        </Button>
                      </span>
                    ) : (
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <Button
                          size="xs"
                          disabled={!canRevoke || device.isCurrent || busy}
                          aria-describedby={
                            !canRevoke ? `admin-team-session-refusal-${device.id}` : undefined
                          }
                          onClick={() => setConfirming(device.id)}
                        >
                          {t('admin.team.sessions.signOut')}
                        </Button>
                        {!canRevoke && refusal !== null && (
                          <span
                            id={`admin-team-session-refusal-${device.id}`}
                            className="max-w-56 text-end text-2xs text-muted-foreground"
                          >
                            {refusal}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('admin.team.sessions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
