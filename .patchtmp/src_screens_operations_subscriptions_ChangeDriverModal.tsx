/**
 * **Change assigned captain** — the modal behind *Change captain* on
 * Operations › Subscriptions. `surfaces.md`: a short focused form is a modal.
 *
 * **Remediation §2.1.** The candidate list used to be `allDriverFixtures`
 * filtered in the component. It now comes from `listDrivers`, the client that
 * already existed. The *current* captain is excluded by the query rather than
 * by a `.filter()` afterwards — `id neq {current}` — so the server, not the
 * screen, decides what "another captain" means, and the count the operator sees
 * is the count that was matched.
 *
 * **A picker that is still loading is not an empty picker.** Same contract as
 * `ManualDispatchModal`, and for the same reason: an operator who opens a
 * dropdown mid-flight and sees nothing concludes there is nobody to reassign
 * to, and leaves the rider with the captain they complained about.
 *
 *   loading  trigger DISABLED with `aria-busy`; the placeholder says so.
 *   error    one sentence and a retry bound to `refetch`, uncarded — the dialog
 *            is already the surface.
 *   empty    the read succeeded and nobody else is qualified. A different
 *            sentence, and no retry, because retrying is not the fix.
 *   content  the list.
 *
 * Rules applied
 *   §2.1        `@/data/clients` only.
 *   AC-36       all four states.
 *   §7.2        `aria-busy` on the disabled trigger; focus ring untouched.
 *   R3          one primary — `Reassign captain`.
 *
 * ## P4 — **this form has no write behind it, and it now says so**
 *
 * `handleConfirm` ran `setTimeout(…, 200)` and then called `onConfirm`, which
 * set a local `{ driverId, driverName }` override on the row and toasted
 * success. The override was discarded by the next refetch, so the reassignment
 * the operator was told had happened had not happened.
 *
 * **`clients/subscriptions.ts` has no reassign operation.** It has
 * `listSubscriptions`, `getSubscription`, `freezeSubscription` and
 * `cancelSubscription` and nothing else, so there is nothing this modal could
 * have called. The signature requested from mock-data-engineer is in the
 * handoff:
 *
 * ```ts
 * reassignSubscriptionDriver(id: string, driverId: string, signal?: AbortSignal)
 *   : Promise<Subscription>
 * //  409 when the subscription is not `active`
 * //  409 when the captain is at `maxSubscriptions`
 * //  422 when `driverId` is empty or is the captain already assigned
 * ```
 *
 * Until it exists the **entry point is disabled in place with its reason**
 * (§11.2) — `SubscriptionsScreen` passes `unavailableReason`, the row action
 * carries the same sentence, and this modal's primary refuses even if some
 * future path reaches it. That is the honest state: a control an operator can
 * see, cannot use, and is told why. It is not hidden, and it does not lie.
 *
 * Everything else here is finished and waiting: `onConfirm` is a promise this
 * awaits, the failure renders in place, and the dialog does not close until the
 * write lands.
 *
 * Known, not fixed here: the `t(key, { defaultValue })` calls are §4.2's wave.
 */

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ErrorState'
import { listDrivers } from '@/data/clients'
import { isApiError, type Driver, type FilterSpec, type Paginated, type Subscription } from '@/data/types'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'

/** One screenful of candidates. The picker is a shortlist, not a directory. */
const CANDIDATE_PAGE_SIZE = 50

interface ChangeDriverModalProps {
  subscription: Subscription | null
  open: boolean
  onClose: () => void
  /** Awaited. The screen owns the write; this owns busy, failure and closing. */
  onConfirm: (subId: string, driverId: string, driverName: string) => Promise<void>
  /**
   * §11.2 — why this cannot be committed right now, as a sentence. Non-null
   * disables the primary **in place** and renders the sentence beside it. Never
   * a tooltip and never a hidden button.
   */
  unavailableReason?: string | null
  t: Translate
}

export function ChangeDriverModal({
  subscription,
  open,
  onClose,
  onConfirm,
  unavailableReason = null,
  t,
}: ChangeDriverModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  /** §11.2 — the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  const subscriptionId = subscription?.id ?? null
  /* A new subscription is a new question: the previous row's choice and the
     previous row's failure must not survive into it. */
  useEffect(() => {
    setSelectedDriverId('')
    setSubmitError(null)
  }, [subscriptionId])

  /* The one exclusion the domain asks for: you cannot reassign a subscription
     to the captain it already has. `driverId` is nullable — an unassigned
     subscription excludes nobody, so the filter is omitted rather than sent
     with a `null` the query engine would have to guess at. */
  const currentDriverId = subscription?.driverId ?? null
  const excludeCurrent: FilterSpec[] = currentDriverId
    ? [{ field: 'id', op: 'neq', value: currentDriverId }]
    : []

  /* `enabled: open` — the modal is mounted for the whole session by the screen;
     opening it is what should issue the read. `deps` carries the exclusion so
     switching rows re-queries instead of reusing the previous row's list. */
  const drivers = useAsync<Paginated<Driver>>(
    (signal) =>
      listDrivers(
        { status: 'active', filters: excludeCurrent, pageSize: CANDIDATE_PAGE_SIZE },
        signal,
      ),
    /* `excludeCurrent` is derived from `currentDriverId`, so that one dep is
       the whole of what the fetcher varies on. The key is `[s:<id>]`, distinct
       from every other `drivers.list` reader. */
    { deps: [currentDriverId], enabled: open, cacheKey: 'drivers.list' },
  )

  /* Hooks first, guard second — the early return must never change the hook
     order between renders. */
  if (!subscription) return null

  const qualifiedDrivers = drivers.data?.items ?? []
  const isLoading = drivers.status === 'loading'
  const isFailed = drivers.status === 'error'
  const isEmpty = drivers.status === 'empty'

  const handleConfirm = async () => {
    if (!selectedDriverId || unavailableReason !== null) return
    const driver = qualifiedDrivers.find((d) => d.id === selectedDriverId)
    if (!driver) return
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm(subscription.id, driver.id, driver.name)
      setSelectedDriverId('')
      onClose()
    } catch (error: unknown) {
      setSubmitError(
        isApiError(error)
          ? error.message
          : t('sub.changeDriver.saveError', {
              defaultValue: "Couldn't reassign the captain. Nothing was changed.",
            }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t('sub.changeDriver.title', { defaultValue: 'Change Assigned Captain' })}</DialogTitle>
          <DialogDescription>
            {t('sub.changeDriver.desc', {
              defaultValue: 'Reassign subscription {id} ({rider}) to another qualified captain.',
              id: subscription.id,
              rider: subscription.riderName,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.currentDriver', { defaultValue: 'Current Captain' })}:</span>
              <span className="font-medium text-foreground">{subscription.driverName ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.plan', { defaultValue: 'Plan' })}:</span>
              <span className="font-medium text-foreground">{subscription.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.progress', { defaultValue: 'Trips Completed' })}:</span>
              <span className="font-medium text-foreground">{subscription.tripsCompleted} / {subscription.tripsIncluded}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="driver-select" className="text-xs font-medium">
              {t('sub.selectDriver', { defaultValue: 'Select New Captain' })}
            </Label>

            {isFailed ? (
              <ErrorState
                scope="card"
                card={false}
                message={t('sub.changeDriver.error', {
                  defaultValue: "Captains didn't load. Try again, or close this and reassign from the captain's profile.",
                })}
                action={{ label: t('state.pageError.action'), onClick: drivers.refetch }}
              />
            ) : isEmpty ? (
              <p className="text-xs text-muted-foreground">
                {t('sub.changeDriver.empty', {
                  defaultValue: 'No other captain is active right now. Reassignment reopens when one comes online.',
                })}
              </p>
            ) : (
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
                disabled={isLoading}
              >
                <SelectTrigger id="driver-select" className="w-full" aria-busy={isLoading}>
                  <SelectValue
                    placeholder={
                      isLoading
                        ? t('sub.selectDriverLoading', { defaultValue: 'Loading captains' })
                        : t('sub.selectDriverPlaceholder', { defaultValue: 'Choose an active captain...' })
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {qualifiedDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.city} · ★{d.rating !== null ? d.rating.toFixed(1) : '—'} · {d.activeSubscriptions}/{d.maxSubscriptions} subs)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* §11.2 / §8.4.4 — a refusal is REAL TEXT, never a tooltip. The
              standing one (`unavailableReason`, no write behind the form) and
              the transient one (`submitError`, the write was refused) are the
              same treatment, because to an operator they are the same fact:
              this did not happen, and here is why. */}
          {(unavailableReason ?? submitError) !== null && (
            <p
              id="change-driver-refusal"
              role={submitError === null ? undefined : 'alert'}
              className="text-xs text-destructive"
            >
              {unavailableReason ?? submitError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            size="xs"
            onClick={() => void handleConfirm()}
            disabled={
              !selectedDriverId ||
              busy ||
              isLoading ||
              isFailed ||
              isEmpty ||
              unavailableReason !== null
            }
            aria-describedby={unavailableReason === null ? undefined : 'change-driver-refusal'}
          >
            {busy ? t('action.saving', { defaultValue: 'Reassigning...' }) : t('sub.confirmChange', { defaultValue: 'Reassign Captain' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
