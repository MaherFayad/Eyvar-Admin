/**
 * **Change assigned captain** — the modal behind *Change captain* on the
 * Subscriptions queue and on the record sheet. `surfaces.md`: a short focused
 * form is a modal.
 */

/**
 * **A picker that is still loading is not an empty picker** (AC-36): the
 * trigger is disabled with `aria-busy` while the read is in flight, an error
 * offers a retry, and an empty result says nobody else is active and offers
 * none. An operator who opens a dropdown mid-flight and sees nothing concludes
 * there is nobody to reassign to.
 */

/**
 * **T1.2 — the write exists.** `reassignSubscriptionDriver(id, driverId, reason)`
 * refuses a cancelled cycle (409) and three cases at 422: the captain already
 * holds it, the captain is not active, and their vehicle is below the plan's
 * tier. Each renders here as real text with the operator's choice still on
 * screen (§11.2); `unavailableReason` covers the standing refusals.
 */

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ErrorState'
import { reassignCandidateRefusal } from '@/commands'
import { listDrivers } from '@/data/clients'
import { isApiError, type Driver, type Paginated, type Subscription } from '@/data/types'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'

/**
 * One screenful of candidates, hoisted so it is a **cache dependency**:
 * `useAsync` with a `cacheKey` needs everything the fetcher varies on in
 * `deps`, and a literal inside the closure is invisible to the key.
 */
const CANDIDATE_QUERY = { pageSize: 50 } as const

interface ChangeDriverModalProps {
  subscription: Subscription | null
  open: boolean
  onClose: () => void
  /** Awaited. The screen owns the write; this owns busy, failure and closing. */
  onConfirm: (subId: string, driverId: string, driverName: string, reason: string) => Promise<void>
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
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  /** §11.2 — the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  const subscriptionId = subscription?.id ?? null
  /* A new subscription is a new question: the previous row's choice and the
     previous row's failure must not survive into it. */
  useEffect(() => {
    setSelectedDriverId('')
    setReason('')
    setSubmitError(null)
  }, [subscriptionId])

  /* **§11.2 — the query no longer hides the ineligible.** It used to filter to
     `status: 'active'` and exclude the current captain, so two of the client's
     three 422s were unreachable and unexplained. Every candidate is listed and
     `reassignCandidateRefusal` disables the ones the write would refuse, with
     the sentence on the row. `enabled: open` issues the read on opening. */
  const drivers = useAsync<Paginated<Driver>>(
    (signal) => listDrivers(CANDIDATE_QUERY, signal),
    { deps: [CANDIDATE_QUERY], enabled: open, cacheKey: 'drivers.list' },
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
    if (!driver || reassignCandidateRefusal(subscription, driver, t) !== null) return
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm(subscription.id, driver.id, driver.name, reason)
      setSelectedDriverId('')
      onClose()
    } catch (error: unknown) {
      setSubmitError(
        isApiError(error)
          ? error.message
          : t('sub.changeDriver.saveError'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('sub.changeDriver.title')}</DialogTitle>
          <DialogDescription>
            {t('sub.changeDriver.desc', { id: subscription.id, rider: subscription.riderName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.currentDriver')}:</span>
              {/* O9 — an unassigned subscription is the reason this modal is open. */}
              {subscription.driverName === null ? (
                <span className="font-medium text-muted-foreground">{t('sub.noDriver')}</span>
              ) : (
                <span className="font-medium text-foreground">{subscription.driverName}</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.plan')}:</span>
              <span className="font-medium text-foreground">{subscription.planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('sub.progress')}:</span>
              <span className="font-medium text-foreground">{subscription.tripsCompleted} / {subscription.tripsIncluded}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="driver-select" className="text-xs font-medium">
              {t('sub.selectDriver')}
            </Label>

            {isFailed ? (
              <ErrorState
                scope="card"
                card={false}
                message={t('sub.changeDriver.error')}
                action={{ label: t('state.pageError.action'), onClick: drivers.refetch }}
              />
            ) : isEmpty ? (
              <p className="text-xs text-muted-foreground">
                {t('sub.changeDriver.empty')}
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
                        ? t('sub.selectDriverLoading')
                        : t('sub.selectDriverPlaceholder')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {qualifiedDrivers.map((d) => {
                    const refused = reassignCandidateRefusal(subscription, d, t)
                    return (
                      <SelectItem key={d.id} value={d.id} disabled={refused !== null}>
                        <span className="flex flex-col items-start">
                          {/* AC-75 — one key with named placeholders, never six
                              JSX fragments. O9 — an unrated captain drops the
                              clause rather than printing a mark. */}
                          <span>
                            {t(
                              d.rating === null ? 'sub.driverOption.unrated' : 'sub.driverOption',
                              {
                                name: d.name,
                                city: d.city,
                                rating: d.rating === null ? '' : d.rating.toFixed(1),
                                active: String(d.activeSubscriptions),
                                max: String(d.maxSubscriptions),
                              },
                            )}
                          </span>
                          {/* §11.2 — the refusal is real text on the control it
                              refuses, never a tooltip and never a hidden row. */}
                          {refused !== null && (
                            <span className="text-2xs text-muted-foreground">{refused}</span>
                          )}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="change-driver-reason" className="text-xs font-medium">
              {t('sub.changeDriver.reason')}
            </Label>
            {/* Optional, and it reaches the write: `reassignSubscriptionDriver`
                records it beside the change. */}
            <Input
              id="change-driver-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('sub.changeDriver.reasonPlaceholder')}
            />
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

        <DialogFooter>
          <Button variant="secondary" size="xs" onClick={onClose} disabled={busy}>
            {t('action.cancel')}
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
            {busy ? t('sub.reassigning') : t('sub.confirmChange')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
