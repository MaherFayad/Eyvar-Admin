/**
 * The captain picker — one dialog behind *Dispatch captain* on the pending feed
 * and *Reassign* on an intervention. `surfaces.md`: a short focused form is a
 * modal. Four states on the captain read (AC-36); the caller owns the write and
 * this owns the busy state and the refusal, which reports HERE with the
 * operator's choice intact (§11.2). §2.1: `listDrivers`, never a fixture.
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
  /** The record a captain is being put on. `null` renders nothing. */
  subjectId: string | null
  title: string
  description: string
  /** The two facts an operator checks before choosing. */
  facts: ReadonlyArray<{ label: string; value: string }>
  confirmLabel: string
  open: boolean
  onClose: () => void
  /**
   * **Returns a promise, and this modal awaits it.** The screen owns the write;
   * this owns the busy state, the failure sentence and the decision not to
   * close until the record has actually changed.
   */
  onConfirm: (subjectId: string, driverId: string, driverName: string) => Promise<void>
  /** §11.2 — the flow's own sentence for a refusal it can name. */
  refusalFor?: (error: unknown) => string | null
  t: Translate
}

export function ManualDispatchModal({
  subjectId,
  title,
  description,
  facts,
  confirmLabel,
  open,
  onClose,
  onConfirm,
  refusalFor,
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
  }, [subjectId])

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
  if (!subjectId) return null

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
      await onConfirm(subjectId, driver.id, driver.name)
      setSelectedDriverId('')
      onClose()
    } catch (error: unknown) {
      /* The flow's own sentence first (§11.2), then the server's when it has
         one — `REQ-0007 is already assigned` beats a generic failure line. */
      setSubmitError(
        refusalFor?.(error) ??
          (isApiError(error) ? error.message : t('dispatch.manual.assignError')),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            {facts.map((fact) => (
              <div key={fact.label} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{fact.label}</span>
                <span className="truncate font-medium text-foreground">
                  <bdi>{fact.value}</bdi>
                </span>
              </div>
            ))}
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
            {busy ? t('dispatch.action.assigning') : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
