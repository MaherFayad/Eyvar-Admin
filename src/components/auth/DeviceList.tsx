/**
 * Active sessions and trusted devices — design §9. Lives in the `my-account`
 * shell layer (`?account=me`), security section.
 *
 * The legacy list already exists as a read-only display (`:2994`–`:3033`);
 * this makes it real.
 *
 * ```
 * ┌─ Active sessions ───────────────────────────────────┐
 * │ Chrome on Windows · Riyadh            [This device] │ 13/600 + neutral badge
 * │ 176.44.2.19 · Active now                            │ 12px --ev-text-2
 * │ Trusted until 12 September 2026   [ Stop trusting ] │ 12px + plain button
 * │ ─────────────────────────────────────────────────── │ --ev-hairline2
 * │ Safari on iPhone · Jeddah                           │
 * │ 176.44.9.4 · 2 days ago              [ Sign out ]   │
 * │ ─────────────────────────────────────────────────── │
 * │                            [ Sign out everywhere ]  │ secondary
 * └─────────────────────────────────────────────────────┘
 * ```
 *
 * ## Four decisions worth not re-litigating
 *
 * **One badge per row, maximum.** `This device` is a **neutral** badge (R7,
 * R15 rounded rectangle). Trusted state is carried by the **line** `Trusted
 * until {date}`, never by a second badge — two badges on a 13 px row is where
 * a list stops being scannable. **Never a red badge** (R5).
 *
 * **`isDeviceTrusted`, never `trustedUntil !== null`.** A `trustedUntil` in the
 * past is **not** trusted, and `USR-3`'s row is seeded four days expired
 * precisely to catch a null-check. A screen that renders `Trusted until
 * {date}` on any non-null value shows a date that has already gone by.
 *
 * **The IP is rendered, and it is PII.** It is the operator's **own** list,
 * which is what makes it defensible — recorded as **D-A10**. Rendered as a
 * `<bdi dir="ltr">`, a single LTR token like a plate or an IBAN.
 *
 * **Confirmations expand in place. There is no modal.** §5.5 forbids a modal
 * nested inside a no-scrim drawer, and 00-shell §6.4 already took this position
 * for password change and enrolment inside this same layer. This **replaces
 * the native `confirm()`** at `:3059` — **D-A9**, which has no styling, no
 * Arabic and no focus management.
 *
 * | Action | Confirmation |
 * |---|---|
 * | Per-row `Sign out` | the row expands, naming the device |
 * | `Sign out everywhere` | expands in place, **naming the count before it acts** (**AC-576**) |
 * | `Stop trusting` | **none.** Recoverable, cheap, and the row's line changes immediately (**AC-571**) |
 *
 * ## The four states
 *
 * | State | Treatment |
 * |---|---|
 * | content | the rows above |
 * | **empty** (**AC-653**) | **`no-match` kind — one grey sentence, no illustration** (R8): *"You're only signed in on this device."* Never a first-run illustration: sessions are not something an operator creates |
 * | loading (**AC-651**) | **skeleton** — three two-line row bars matching the real row shape. Not a spinner |
 * | error (**AC-652**) | `ErrorState`, **`card` scope**, inside this card only; the rest of the account layer still renders |
 * | per-row failure | `ErrorState`, **`row` scope**. Every other row stays interactive |
 *
 * **AC-661 / AC-662:** an operator always sees their own list, with no
 * permission gate; another account's sessions need `manage_team`. This
 * component is only ever mounted for the operator's own list, so it carries no
 * gate — which is the correct amount of gate for AC-661.
 */

import { useCallback, useState } from 'react'
import {
  isDeviceTrusted,
  listDevices,
  revokeDevice,
  setDeviceTrust,
  signOutEverywhere,
} from '@/data/clients'
import type { DeviceSession } from '@/data/types/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { useAsync } from '@/hooks'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { IsolatedValue } from './IsolatedValue'

/**
 * `language` is a **prop, not a `useLanguage()` call**, for the same reason
 * `NotificationsLayer` takes one: this component renders dates, and a component
 * that reaches for a context to format a date is a component that cannot be
 * rendered in a test, a Storybook entry or a second language without dragging
 * a provider along. The shell already holds the value; passing it down costs
 * one prop and buys a component that is dumb about where it is mounted.
 */
export function DeviceList({ t, language }: { t: Translator; language: Language }) {
  const devices = useAsync<DeviceSession[]>((signal) => listDevices(undefined, signal), {
    /* **Deliberately NOT cached (P3-13).** `listDevices(undefined)` means *the
       signed-in operator's* devices, so the acting user is a real input to this
       request — and this component takes no session prop, so it cannot be put
       in `deps`. A `[]` key would hand one operator another's sessions list for
       the TTL after a switch. Cacheable the day the component takes a `userId`.
       */
    deps: [],
  })

  /** Which row has its confirmation open. At most one, and `all` is the footer's. */
  const [confirming, setConfirming] = useState<string | null>(null)
  /** Row-scoped failure, keyed by device id (**AC-652**'s row sibling). */
  const [rowError, setRowError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  const act = useCallback(
    async (id: string, run: () => Promise<unknown>) => {
      setPending(id)
      setRowError(null)
      try {
        await run()
        setConfirming(null)
        devices.refetch()
      } catch {
        /* **Row scope.** A failed sign-out of one device is not a page
           condition and does not raise a banner: every other row stays
           interactive (**AC-41**'s rule, applied here). */
        setRowError(id)
      } finally {
        setPending(null)
      }
    },
    [devices],
  )

  return (
    <Card className="flex flex-col gap-3 p-3">
      <h3 className="text-sm font-semibold text-foreground">{t('auth.devices.title')}</h3>

      {devices.status === 'loading' ? (
        <ListSkeleton />
      ) : devices.status === 'error' ? (
        /* **AC-652** — card scope. The rest of the account layer still
           renders, which is the whole point of a scope that is not `page`. */
        <ErrorState
          scope="card"
          card={false}
          message={t('auth.devices.error')}
          action={{ label: t('auth.tryAgain'), onClick: devices.refetch }}
        />
      ) : (devices.data ?? []).length === 0 ? (
        /* **AC-653** — one grey sentence, no illustration (R8). */
        <EmptyState kind="no-match" card={false} message={t('auth.devices.empty')} />
      ) : (
        <>
          <ul className="flex list-none flex-col">
            {(devices.data ?? []).map((device, index) => (
              <li key={device.id}>
                {index > 0 && <Separator className="my-2" />}
                <DeviceRow
                  device={device}
                  t={t}
                  language={language}
                  confirming={confirming === device.id}
                  pending={pending === device.id}
                  failed={rowError === device.id}
                  onAskSignOut={() => setConfirming(device.id)}
                  onCancel={() => setConfirming(null)}
                  onSignOut={() => void act(device.id, () => revokeDevice(device.id))}
                  onStopTrusting={() =>
                    void act(device.id, () => setDeviceTrust(device.id, false))
                  }
                />
              </li>
            ))}
          </ul>

          <SignOutEverywhere
            t={t}
            /* **AC-576** — the count is *other* sessions, stated before it
               acts. `isCurrent` is the one row that is not "other". */
            otherCount={(devices.data ?? []).filter((device) => !device.isCurrent).length}
            confirming={confirming === 'all'}
            pending={pending === 'all'}
            failed={rowError === 'all'}
            onAsk={() => setConfirming('all')}
            onCancel={() => setConfirming(null)}
            onConfirm={() => void act('all', () => signOutEverywhere())}
          />
        </>
      )}
    </Card>
  )
}

function DeviceRow({
  device,
  t,
  language,
  confirming,
  pending,
  failed,
  onAskSignOut,
  onCancel,
  onSignOut,
  onStopTrusting,
}: {
  device: DeviceSession
  t: Translator
  language: Language
  confirming: boolean
  pending: boolean
  failed: boolean
  onAskSignOut: () => void
  onCancel: () => void
  onSignOut: () => void
  onStopTrusting: () => void
}) {
  /* A single LTR token, like a plate or an IBAN. The box carries the layout;
     the `<bdi>` carries only the isolation (`isolatedRunProps`' two bags). */
  const ip = isolatedRunProps({ ltr: 'ip' })
  /* **Trusted NOW, not merely stamped.** A past `trustedUntil` is not trusted,
     and the fixture is seeded four days expired to catch exactly the
     `!== null` version of this line. */
  const trusted = isDeviceTrusted(device)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {device.location ? `${device.device} · ${device.location}` : device.device}
        </span>
        {/* R7 `neutral`, R15 rounded rectangle, and **one badge per row,
            maximum**. Trusted state is the line below, never a second badge. */}
        {device.isCurrent && (
          <Badge tone="neutral" className="ms-auto">
            {t('auth.devices.thisDevice')}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span {...ip.box}>
          <bdi {...ip.run}>{device.ip}</bdi>
        </span>
        <span aria-hidden="true">·</span>
        {/* §9 shows `Active now` for the current device and `2 days ago` for
            the rest. **There is no relative-time helper in `src/lib`** — the
            legacy list stored display strings (`lastActive: '3 days ago'`,
            `:2994`) that cannot be sorted or localised, and the data layer
            correctly replaced them with ISO instants without anyone building
            the formatter that renders them. `Active now` is keyed and rendered;
            every other row shows the **absolute** instant through `formatDate`,
            which is true, sortable and localised. **A relative formatter is
            requested from utilities-engineer**; inventing one here would be a
            second answer to "how does this product say two days ago". */}
        <span>
          {device.isCurrent
            ? t('auth.devices.activeNow')
            : formatDate(device.lastActiveAt, { style: 'day-month-time', language })}
        </span>
        {!device.isCurrent && !confirming && (
          <Button
            variant="ghost"
            size="xs"
            className="ms-auto"
            onClick={onAskSignOut}
            disabled={pending}
          >
            {t('auth.devices.signOut')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {trusted && device.trustedUntil !== null ? (
          <IsolatedValue
            t={t}
            tKey="auth.devices.trustedUntil"
            name="date"
            value={formatDate(device.trustedUntil, { style: 'day-month-year', language })}
            ltr="date"
            as="span"
          />
        ) : (
          <span>{t('auth.devices.notTrusted')}</span>
        )}
        {trusted && (
          /* **AC-571 — no confirmation.** Recoverable, cheap, and the line
             above changes to `Not trusted` immediately. */
          <Button variant="ghost" size="xs" className="ms-auto" onClick={onStopTrusting} disabled={pending}>
            {t('auth.devices.stopTrusting')}
          </Button>
        )}
      </div>

      {/* **Expands in place. There is no modal** — §5.5 forbids one nested
          inside a no-scrim drawer, and this replaces the native `confirm()` at
          `:3059` (**D-A9**). */}
      {confirming && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg bg-muted p-2">
          <p className="text-xs text-foreground">
            <IsolatedValue
              t={t}
              tKey="auth.devices.signOutConfirm"
              name="device"
              value={device.device}
              as="span"
            />{' '}
            {t('auth.devices.signOutConfirmBody')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="xs" onClick={onCancel} disabled={pending}>
              {t('common.cancel')}
            </Button>
            <Button variant="default" size="xs" onClick={onSignOut} disabled={pending}>
              {t('auth.devices.signOut')}
            </Button>
          </div>
        </div>
      )}

      {failed && (
        /* **Row scope**, and nothing else on the list stops working. */
        <ErrorState
          scope="row"
          message={t('auth.devices.rowError')}
          action={{ label: t('auth.tryAgain'), onClick: onSignOut }}
        />
      )}
    </div>
  )
}

function SignOutEverywhere({
  t,
  otherCount,
  confirming,
  pending,
  failed,
  onAsk,
  onCancel,
  onConfirm,
}: {
  t: Translator
  otherCount: number
  confirming: boolean
  pending: boolean
  failed: boolean
  onAsk: () => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!confirming) {
    return (
      <div className="flex justify-end">
        <Button variant="secondary" size="default" onClick={onAsk} disabled={otherCount === 0}>
          {t('auth.devices.signOutAll')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted p-2">
      {/* **AC-576** — how many sessions will end, stated **before** it acts.
          One key, one plural rule, no concatenation (**AC-670**). */}
      <p className="text-xs text-foreground">
        {t.plural('auth.devices.signOutAllConfirm', { count: otherCount })}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="xs" onClick={onCancel} disabled={pending}>
          {t('common.cancel')}
        </Button>
        <Button variant="default" size="xs" onClick={onConfirm} disabled={pending}>
          {t('auth.devices.signOutAll')}
        </Button>
      </div>
      {failed && (
        <ErrorState
          scope="row"
          message={t('auth.devices.rowError')}
          action={{ label: t('auth.tryAgain'), onClick: onConfirm }}
        />
      )}
    </div>
  )
}

/**
 * **AC-651** — a skeleton, not a spinner, and **shaped like the row**: three
 * two-line bars matching the real row's own two lines, so the card does not
 * resize when the data lands.
 */
function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-1">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}
