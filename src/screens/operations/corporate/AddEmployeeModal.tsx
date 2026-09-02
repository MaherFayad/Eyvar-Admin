/**
 * **Link an employee rider to a corporate account** - Operations > Corporate.
 *
 * **P4 - the fake latency is gone and the 409 finally has somewhere to land.**
 * This ran `setTimeout(..., 200)` and closed before `addCorporateEmployee` had
 * been called. That client raises a real **409 `rider_linked_elsewhere`** -
 * *"one rider cannot be on two corporate bills"* - and the operator could never
 * see it against the dialog that caused it, because the dialog was gone by the
 * time the promise settled.
 *
 * `onConfirm` is now awaited, the dialog stays open for the round trip, and the
 * conflict renders in place naming the other company (§11.2). The rider stays
 * selected, so the operator can read the sentence beside the choice that
 * produced it.
 */

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { listRiders } from '@/data/clients'
import { isApiError, type Paginated, type Rider } from '@/data/types'
import { useAsync } from '@/hooks'
import type { Translate } from '@/lib'

/** Enough to hold every registered rider; the picker is a list, not a page. */
const PICKER_PAGE_SIZE = 200

interface AddEmployeeModalProps {
  corpId: string
  companyName: string
  existingRiderIds: string[]
  open: boolean
  onClose: () => void
  /** Awaited. The screen owns the write; this owns busy, failure and closing. */
  onConfirm: (riderId: string) => Promise<void>
  t: Translate
}

export function AddEmployeeModal({
  companyName,
  existingRiderIds,
  open,
  onClose,
  onConfirm,
  t,
}: AddEmployeeModalProps) {
  const [selectedRiderId, setSelectedRiderId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  /** §11.2 - the last write's refusal, as real text inside this dialog. */
  const [submitError, setSubmitError] = useState<string | null>(null)

  /* Each opening is a fresh question: a 409 from the last one must not greet
     the operator on the next. */
  useEffect(() => {
    if (open) setSubmitError(null)
  }, [open])

  /**
   * The riders that are not already on this account, read through the seam.
   *
   * This used to be `riderFixtures.filter(...)` (`REMEDIATION-PLAN.md` §2.1),
   * which would have kept serving mocks after a `VITE_DATA_SOURCE=http`
   * cutover. `id nin [...]` is a declared rider filter
   * (`clients/riders.ts` — `filterable.id`, operator `nin`), so the exclusion
   * happens where the query does and no new client operation is needed. An
   * empty exclusion set is not a special case: `nin []` excludes nothing.
   *
   * `enabled: open` keeps a closed modal from issuing a request, and re-issues
   * one each time it opens — so a rider linked elsewhere since the last open
   * is reflected rather than remembered.
   *
   * Dep is the joined id list, not the array: `useAsync` compares deps
   * shallowly and a fresh array each render would re-fetch forever.
   */
  const excludedKey = existingRiderIds.join(',')
  const riders = useAsync<Paginated<Rider>>(
    (signal) =>
      listRiders(
        {
          filters: [{ field: 'id', op: 'nin', value: existingRiderIds }],
          pageSize: PICKER_PAGE_SIZE,
        },
        signal,
      ),
    /**
     * **The collision this read used to be skipped for, closed (P3-13).**
     *
     * `excludedKey` is `existingRiderIds.join(',')`, and the screen passes
     * `existingRiderIds={currentEmployees}` — the SAME array that
     * `CorporateDetailScreen`'s employee read keys on. A bare `cacheKey:
     * 'riders.list'` here would therefore produce the identical key
     * `riders.list::[s:<ids>]` for two fetchers that ask OPPOSITE questions
     * (`op: 'nin'` here, `op: 'in'` there), and this picker would offer exactly
     * the riders already on the account and no others.
     *
     * The fix the earlier note asked for: the filter operator was hard-coded
     * inside the closure and so invisible to the key. It is now in `deps` as
     * the stable value it is, and the two reads key apart —
     * `riders.list::[s:<ids>,s:nin]` against `…,s:in`.
     */
    { deps: [excludedKey, 'nin'], cacheKey: 'riders.list', enabled: open },
  )

  const availableRiders = riders.data?.items ?? []

  const handleConfirm = async () => {
    if (!selectedRiderId) return
    setBusy(true)
    setSubmitError(null)
    try {
      await onConfirm(selectedRiderId)
      setSelectedRiderId('')
      onClose()
    } catch (error: unknown) {
      /* The 409 names the company that already covers this rider, which is the
         one fact that tells the operator what to do next. Keep the server's
         sentence; a generic one would throw that away. */
      setSubmitError(
        isApiError(error)
          ? error.message
          : t('corp.addEmployee.saveError'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{t('corp.addEmployee.title')}</DialogTitle>
          <DialogDescription>
            {t('corp.addEmployee.desc', { company: companyName })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-2">
          <Label htmlFor="rider-select" className="text-xs font-medium">
            {t('corp.selectRider')}
          </Label>

          {/* Four states for the picker's read — loading, error, empty,
              content, in that order. `card={false}` on both states: a dialog
              body is already a surface and a state card inside it would be a
              second frame. */}
          {riders.status === 'loading' ? (
            <LoadingSkeleton pattern="P1" rows={3} />
          ) : riders.status === 'error' ? (
            /* §11.2 — card scope. The dialog itself still works: the operator
               can retry the read or cancel out. */
            <ErrorState
              scope="card"
              card={false}
              message={t('state.cardError.message', { resource: t('view.people.riders') })}
              action={{ label: t('state.pageError.action'), onClick: riders.refetch }}
            />
          ) : riders.status === 'empty' ? (
            /* Not first-run: riders exist, they are all already on this
               account. R8 — one sentence, no illustration, no action. */
            <EmptyState
              kind="cleared"
              card={false}
              heading={t('corp.noRidersAvailable')}
              body={t('corp.noRidersAvailableBody', { company: companyName })}
            />
          ) : (
            <Select value={selectedRiderId} onValueChange={setSelectedRiderId}>
              <SelectTrigger id="rider-select">
                <SelectValue placeholder={t('corp.selectRiderPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableRiders.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.phone} · {r.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* 11.2 / 8.4.4 - the refusal is real text, in the surface that made
              the request. The 409 names the account that already covers this
              rider, which is what tells the operator what to do next. */}
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
            disabled={!selectedRiderId || busy || riders.status !== 'content'}
          >
            {busy ? t('corp.action.linking') : t('corp.linkRider')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
