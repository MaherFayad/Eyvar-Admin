/**
 * **Manual captain assignment** — the modal behind *Dispatch captain* on the
 * Live Dispatch pending feed. `surfaces.md`: a short focused form is a modal.
 *
 * **Remediation §2.1.** The captain list used to be `allDriverFixtures`
 * filtered in the component. It now comes from `listDrivers`, the client that
 * already existed, so a backend cutover reaches this picker too.
 *
 * **A picker that is still loading is not an empty picker.** The seam makes the
 * read genuinely asynchronous and genuinely failable, so the select has to say
 * which it is. An operator who opens a dropdown mid-flight and sees no captains
 * concludes there are none — and then dispatches nobody. So:
 *
 *   loading  the trigger is DISABLED with `aria-busy`, and its placeholder says
 *            the captains are still arriving. Not an empty list.
 *   error    the select is replaced by one sentence and a retry bound to
 *            `refetch` (`ErrorState scope="card"`, uncarded — the dialog is
 *            already the surface, so a second card inside it is furniture).
 *   empty    the read succeeded and nobody is on shift. That is a different
 *            sentence from the error, and it offers no retry, because retrying
 *            is not the fix.
 *   content  the list.
 *
 * Rules applied
 *   §2.1        `@/data/clients` only.
 *   AC-36       all four states, in a surface small enough that people skip them.
 *   §7.2        the disabled trigger keeps its focus ring class; `aria-busy` is
 *               what a screen reader hears, not a visual-only spinner.
 *   §10.2       the select is the shadcn primitive, unmodified geometry.
 *   R3          one primary — `Dispatch captain`. `Cancel` is secondary.
 *
 * ## P4 — the form used to lie, and this is the fix
 *
 * `handleConfirm` ran `setTimeout(…, 200)` and then called `onConfirm`, which
 * toasted success and refetched. The refetch re-rendered the same request
 * **still unassigned**, so the console contradicted the sentence the operator
 * had just read. A form that reports a write it never made is worse than a form
 * that refuses.
 *
 * Three things changed:
 *
 *   - **`onConfirm` returns a promise and this modal awaits it.** The screen
 *     calls `assignRequest` (`clients/requests.ts:246`, complete with its 422
 *     `driver_required` and its 409 `request_not_open`); the real call supplies
 *     the real latency, so the fake 200ms is gone.
 *   - **A failed write reports HERE, in the surface that made it** (§11.2). The
 *     dialog stays open with the operator's choice intact, the sentence names
 *     what the server said, and the primary is still live so retrying costs one
 *     click. Closing on failure and toasting is what loses the selection.
 *   - **The dialog does not close until the write lands.** `busy` covers the
 *     whole round trip, so a double-submit cannot produce a second assignment.
 *
 * **§4.2 is closed** (2026-09-02): the `defaultValue` calls are gone. The strings
 * live in `./copy.ts` and reach this component through the `t` its parent builds
 * with `withFallback`, so nothing here needed to change but the call sites.
 */

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ErrorState'
import { listDrivers } from '@/data/clients'
import { isApiError, type Driver, type Paginated } from '@/data/types'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'

/** One screenful of candidates. The picker is a shortlist, not a directory. */
const CANDIDATE_PAGE_SIZE = 50

interface ManualDispatchModalProps {
  requestId: string | null
  riderName: string
  pickup: string
  open: boolean
  onClose: () => void
  /**
   * **Returns a promise, and this modal awaits it.** The screen owns the write
   * (`assignRequest`); this owns the busy state, the failure sentence and the
   * decision not to close until the record has actually changed.
   */
  onConfirm: (requestId: string, driverId: string, driverName: string) => Promise<void>
  t: Translate
}

export function ManualDispatchModal({
  requestId,
  riderName,
  pickup,
  open,
  onClose,
  onConfirm,
  t,
}: ManualDispatchModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  /** §11.2 — the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  /* A new request is a new question: the previous row's choice and the previous
     row's failure must not survive into it. */
  useEffect(() => {
    setSelectedDriverId('')
    setSubmitError(null)
  }, [requestId])

  /* `enabled: open` — the modal is mounted by the screen for the whole session,
     so an unconditional read would fetch captains on every page load and hold a
     stale list by the time one is needed. Opening it is the trigger. */
  const drivers = useAsync<Paginated<Driver>>(
    (signal) => listDrivers({ status: 'active', pageSize: CANDIDATE_PAGE_SIZE }, signal),
    /* The query is constant, so it is restated in `deps` to make the key name
       the request: `DispatchScreen`'s fleet column reads `drivers.list` with the
       same status and a different page size, and a shared `[]` slot would give
       the picker that column's rows. Re-opening the modal for a second request
       then costs nothing. */
    { deps: ['active', CANDIDATE_PAGE_SIZE], cacheKey: 'drivers.list', enabled: open },
  )

  /* Hooks first, guard second — the early return must never change the hook
     order between renders. */
  if (!requestId) return null

  const availableDrivers = drivers.data?.items ?? []
  const isLoading = drivers.status === 'loading'
  const isFailed = drivers.status === 'error'
  const isEmpty = drivers.status === 'empty'

  const handleConfirm = async () => {
    if (!selectedDriverId) return
    const driver = availableDrivers.find((d) => d.id === selectedDriverId)
    if (!driver) return
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm(requestId, driver.id, driver.name)
      setSelectedDriverId('')
      onClose()
    } catch (error: unknown) {
      /* The server's own sentence when it has one — `REQ-0007 is already
         assigned` is more use than a generic failure line, and `assignRequest`
         raises exactly that on 409. */
      setSubmitError(
        isApiError(error)
          ? error.message
          : t('dispatch.manual.assignError'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('dispatch.manual.title')}</DialogTitle>
          <DialogDescription>
            {t('dispatch.manual.desc', {
              id: requestId,
              rider: riderName,
              pickup,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('column.rider')}:</span>
              <span className="font-medium text-foreground">{riderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('trip.pickup')}:</span>
              <span className="font-medium text-foreground">{pickup}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-driver-select" className="text-xs font-medium">
              {t('dispatch.selectCaptain')}
            </Label>

            {isFailed ? (
              /* Uncarded: the dialog is already the surface (§4, ErrorState). */
              <ErrorState
                scope="card"
                card={false}
                message={t('dispatch.manual.error')}
                action={{ label: t('state.pageError.action'), onClick: drivers.refetch }}
              />
            ) : isEmpty ? (
              /* R8 — a card-sized empty is one grey sentence, and it names WHY
                 the list is empty rather than repeating that it is. No retry:
                 the fix is a captain coming on shift, not another request. */
              <p className="text-xs text-muted-foreground">
                {t('dispatch.manual.empty')}
              </p>
            ) : (
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
                disabled={isLoading}
              >
                <SelectTrigger id="manual-driver-select" aria-busy={isLoading}>
                  <SelectValue
                    placeholder={
                      isLoading
                        ? t('dispatch.manual.loading')
                        : t('sub.selectDriverPlaceholder')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {/* O9 — an unrated captain drops the clause, never a glyph. */}
                      {d.name} ({d.city}
                      {d.rating === null ? '' : ` · ★${d.rating.toFixed(1)}`})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* §11.2 / §8.4.4 — the WRITE's refusal, as real text in the surface
              that made it. `role="alert"` so it is announced; the dialog stays
              open with the operator's choice intact, so retrying is one click
              and not a re-selection. */}
          {submitError !== null && (
            <p role="alert" className="text-xs text-destructive">
              {submitError}
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
            disabled={!selectedDriverId || busy || isLoading || isFailed || isEmpty}
          >
            {busy ? t('dispatch.action.assigning') : t('dispatch.confirmAssign')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
