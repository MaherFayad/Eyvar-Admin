/**
 * Dispatch, operating cities and safety limits — the three panes that were
 * already on this screen and were never wired to anything.
 *
 * What they were: `INITIAL_CITIES` as a module literal seeded into `useState`,
 * six numeric limits as `useState` string literals, `handleAddCity` toasting
 * *"City {name} added to operating regions"* over an array no save reached, and
 * a save bar whose `onSave` was a `setTimeout`. A form that feels wired and is
 * not is worse than one that is obviously unbuilt: it teaches an operator that
 * the change took, and the change did not take.
 *
 * What they are now: the same three panes over `clients/policy.ts`, through the
 * same draft and the same one save as the SLA grid.
 *
 * Rules applied
 *   §11.2     every control is disabled **in place with its reason** when the
 *             role cannot write — never hidden. The reason renders as text
 *             under the card, not as a tooltip.
 *   R3        no primary button here. `Add city` is a secondary that opens a
 *             dialog; the dialog's confirm is the dialog's own primary.
 *   §9.1      counts and measurements sit inline-END with their headers.
 *   §8.3      every number is an integer in its base unit and the field edits
 *             that integer. The friendlier unit is stated in the help line and
 *             is never parsed back.
 *   copy 10   the cities table's empty is a sentence, not a dash.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { formatCount, type Language, type Translate } from '@/lib'
import type { OperatingCity } from '@/data/types/policy'
import {
  addCity,
  cityExists,
  metresAsKm,
  minutesAsHours,
  parseWholeNumber,
  setDispatch,
  setLimits,
  toggleCityService,
  type PolicyDraft,
} from './policyDraft'

interface PaneProps {
  draft: PolicyDraft
  onChange: (next: PolicyDraft) => void
  canWrite: boolean
  blockedReason: string | null
  t: Translate
  language: Language
}

/* ═══════════════════════ 1 · dispatch ═══════════════════════ */

export function DispatchCard({ draft, onChange, canWrite, blockedReason, t }: PaneProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold">{t('policy.dispatch.title')}</CardTitle>
        <CardDescription className="text-xs">{t('policy.dispatch.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 md:grid-cols-3">
        <IntegerField
          id="dispatch-radius"
          label={t('policy.dispatch.radius')}
          help={t('policy.dispatch.radius.help', {
            value: metresAsKm(draft.dispatch.initialSearchRadiusMetres),
          })}
          value={draft.dispatch.initialSearchRadiusMetres}
          step={100}
          disabled={!canWrite}
          onCommit={(next) =>
            onChange(setDispatch(draft, { initialSearchRadiusMetres: next ?? 0 }))
          }
        />
        <IntegerField
          id="dispatch-timeout"
          label={t('policy.dispatch.timeout')}
          help={t('policy.dispatch.timeout.help')}
          value={draft.dispatch.searchPhaseTimeoutSeconds}
          step={5}
          disabled={!canWrite}
          onCommit={(next) =>
            onChange(setDispatch(draft, { searchPhaseTimeoutSeconds: next ?? 0 }))
          }
        />
        <IntegerField
          id="dispatch-surge"
          label={t('policy.dispatch.surge')}
          help={t('policy.dispatch.surge.help')}
          value={draft.dispatch.maxSurgePercent}
          step={10}
          disabled={!canWrite}
          onCommit={(next) => onChange(setDispatch(draft, { maxSurgePercent: next ?? 0 }))}
        />
        {blockedReason ? (
          <p className="text-2xs text-muted-foreground md:col-span-3">{blockedReason}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

/* ═══════════════════════ 2 · cities ═══════════════════════ */

export function CitiesCard({
  draft,
  onChange,
  canWrite,
  blockedReason,
  t,
  language,
  fleetById,
}: PaneProps & {
  /**
   * The measured fleet, keyed by city. It comes from the stored document rather
   * than from the draft because it is **not editable**, and a derived number
   * inside an editable draft is one spread away from being written back.
   */
  fleetById: ReadonlyMap<string, number>
}) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{t('policy.cities.title')}</CardTitle>
            <CardDescription className="text-xs">{t('policy.cities.desc')}</CardDescription>
          </div>
          <Button
            size="xs"
            variant="secondary"
            disabled={!canWrite}
            onClick={() => setAddOpen(true)}
          >
            {t('policy.cities.add')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {draft.cities.length === 0 ? (
          /* The genuine first-run: no city is configured, so nothing dispatches
             anywhere. A dash here would read as "unknown". */
          <p className="p-6 text-center text-xs text-muted-foreground">
            {t('policy.cities.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted/40 text-2xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 text-start">{t('policy.cities.col.city')}</th>
                  <th scope="col" className="p-3 text-center">{t('policy.cities.col.quickRides')}</th>
                  <th scope="col" className="p-3 text-center">
                    {t('policy.cities.col.subscriptions')}
                  </th>
                  <th scope="col" className="p-3 text-end">{t('policy.cities.col.fleet')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {draft.cities.map((city) => (
                  <tr key={city.id}>
                    <th scope="row" className="p-3 text-start font-normal">
                      <span className="font-semibold text-foreground">{city.nameEn}</span>{' '}
                      <span className="font-arabic text-muted-foreground" dir="rtl" lang="ar">
                        {city.nameAr}
                      </span>
                    </th>
                    <td className="p-3 text-center">
                      <Switch
                        checked={city.quickRidesEnabled}
                        disabled={!canWrite}
                        aria-label={t('policy.cities.quickRides.a11y', { city: city.nameEn })}
                        onCheckedChange={() =>
                          onChange(toggleCityService(draft, city.id, 'quickRidesEnabled'))
                        }
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={city.subscriptionsEnabled}
                        disabled={!canWrite}
                        aria-label={t('policy.cities.subscriptions.a11y', { city: city.nameEn })}
                        onCheckedChange={() =>
                          onChange(toggleCityService(draft, city.id, 'subscriptionsEnabled'))
                        }
                      />
                    </td>
                    <td className="p-3 text-end tabular-nums text-foreground">
                      {t('policy.cities.fleet.value', {
                        count: formatCount(fleetById.get(city.id) ?? 0, language),
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="border-t border-border p-3 text-2xs text-muted-foreground">
          {t('policy.cities.fleet.help')}
          {blockedReason ? ` ${blockedReason}` : ''}
        </p>
      </CardContent>

      <AddCityDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        draft={draft}
        onChange={onChange}
        t={t}
      />
    </Card>
  )
}

/**
 * Adding a city joins the **draft**, and the copy says so.
 *
 * Legacy toasted *"City {name} added to operating regions"* the moment the
 * dialog closed — over a `useState` array no save ever reached. The save bar is
 * what applies it, so the dialog's confirm reads `Add to draft` and there is no
 * toast at all: the appearing save bar is the feedback, and it is the truthful
 * one.
 */
function AddCityDialog({
  open,
  onOpenChange,
  draft,
  onChange,
  t,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  draft: PolicyDraft
  onChange: (next: PolicyDraft) => void
  t: Translate
}) {
  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')

  const duplicate = nameEn.trim().length > 0 && cityExists(draft, nameEn)
  /* Both languages, always. A city added with an English name only is the same
     defect as a reason code added with an English label only. */
  const canConfirm = nameEn.trim().length > 0 && nameAr.trim().length > 0 && !duplicate

  const close = () => {
    setNameEn('')
    setNameAr('')
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('policy.cities.add.title')}</DialogTitle>
          <DialogDescription>{t('policy.cities.add.desc')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-city-en" className="text-xs font-medium">
              {t('policy.cities.add.nameEn')}
            </Label>
            <Input
              id="new-city-en"
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
              aria-describedby={duplicate ? 'new-city-error' : undefined}
              aria-invalid={duplicate || undefined}
            />
            {duplicate ? (
              <p id="new-city-error" className="text-2xs text-destructive">
                {t('policy.cities.add.duplicate')}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-city-ar" className="text-xs font-medium">
              {t('policy.cities.add.nameAr')}
            </Label>
            <Input
              id="new-city-ar"
              value={nameAr}
              dir="rtl"
              lang="ar"
              className="font-arabic"
              onChange={(event) => setNameAr(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={close}>
            {t('policy.action.cancel')}
          </Button>
          <Button
            variant="default"
            disabled={!canConfirm}
            onClick={() => {
              onChange(addCity(draft, { nameEn, nameAr }))
              close()
            }}
          >
            {t('policy.cities.add.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ═══════════════════════ 3 · limits ═══════════════════════ */

export function LimitsCard({ draft, onChange, canWrite, blockedReason, t }: PaneProps) {
  return (
    <Card>
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold">{t('policy.limits.title')}</CardTitle>
        <CardDescription className="text-xs">{t('policy.limits.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 md:grid-cols-3">
        <IntegerField
          id="limits-driving"
          label={t('policy.limits.drivingHours')}
          help={t('policy.limits.drivingHours.help', {
            value: minutesAsHours(draft.limits.maxCaptainDailyDrivingMinutes),
          })}
          value={draft.limits.maxCaptainDailyDrivingMinutes}
          step={30}
          disabled={!canWrite}
          onCommit={(next) =>
            onChange(setLimits(draft, { maxCaptainDailyDrivingMinutes: next ?? 0 }))
          }
        />
        <IntegerField
          id="limits-subs"
          label={t('policy.limits.concurrentSubs')}
          value={draft.limits.maxConcurrentSubscriptionsPerCaptain}
          step={1}
          disabled={!canWrite}
          onCommit={(next) =>
            onChange(setLimits(draft, { maxConcurrentSubscriptionsPerCaptain: next ?? 0 }))
          }
        />
        <IntegerField
          id="limits-cancels"
          label={t('policy.limits.riderCancels')}
          value={draft.limits.maxRiderDailyCancellations}
          step={1}
          disabled={!canWrite}
          onCommit={(next) =>
            onChange(setLimits(draft, { maxRiderDailyCancellations: next ?? 0 }))
          }
        />
        {blockedReason ? (
          <p className="text-2xs text-muted-foreground md:col-span-3">{blockedReason}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

/* ───────────────────────── the field ───────────────────────── */

/**
 * One whole number in its base unit.
 *
 * `parseWholeNumber` gives `null` for blank, and the caller decides — it is
 * **never** `parseInt(v) || 0`, which is legacy's `gv()` (`:12984`) and the
 * reason D-F3 exists: the preview strip and the save read the same cleared
 * field and disagreed about whether it meant zero.
 */
function IntegerField({
  id,
  label,
  help,
  value,
  step,
  disabled,
  onCommit,
}: {
  id: string
  label: string
  help?: string
  value: number
  step: number
  disabled: boolean
  onCommit: (next: number | null) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={step}
        inputMode="numeric"
        disabled={disabled}
        value={String(value)}
        aria-describedby={help ? `${id}-help` : undefined}
        className="tabular-nums"
        onChange={(event) => onCommit(parseWholeNumber(event.target.value))}
      />
      {help ? (
        <p id={`${id}-help`} className="text-2xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  )
}

/** The measured fleet, keyed by id. Built once from the stored document. */
export function fleetIndex(cities: readonly OperatingCity[]): ReadonlyMap<string, number> {
  return new Map(cities.map((city) => [city.id, city.activeCaptains]))
}
