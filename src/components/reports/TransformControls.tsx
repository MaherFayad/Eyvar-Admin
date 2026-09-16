/**
 * Transform controls. Each of the three checkboxes reads its disabled state
 * and reason from `plan.transformOptions` (`plan.ts`) — the same computation
 * that refuses a hand-edited URL carrying an illegal transform. It renders
 * the planner's answer, never its own copy of the predicates.
 */

import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoHint, hintLines } from '@/components/InfoHint'
import { DEFAULT_REPORT_TRANSFORM, type ReportTransform, type TransformLegality } from '@/data/types/report'
import type { ReportQuery } from '@/data/types'
import type { Translator } from '@/lib'

export interface TransformControlsProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  /** `plan.transformOptions` — one source of truth, shared with `planQuery`'s violations. */
  options: TransformLegality
  /** Only for the number field's `min`/`max`; the legality itself lives in `options`. */
  bucketCount: number
  unstarted: boolean
  t: Translator
}

export function TransformControls({
  query,
  onChange,
  options,
  bucketCount,
  unstarted,
  t,
}: TransformControlsProps) {
  const groupId = useId()
  const transform = query.transform ?? DEFAULT_REPORT_TRANSFORM
  const setTransform = (next: Partial<ReportTransform>) =>
    onChange({ ...query, transform: { ...transform, ...next } })

  const rollingMax = Math.max(2, Math.min(30, bucketCount))

  const cumulativeOff = unstarted || !options.cumulative.legal
  const rollingOff = unstarted || !options.rollingAverage.legal
  const percentOff = unstarted || !options.percentOfTotal.legal

  const unstartedReason = t('rb.control.disabled.unstarted')
  /* `unstarted` always wins the sentence: a measure-less report reads "choose
     a measure first" even where `options` (computed off `bucketCount` or
     `hasSplit` alone) would otherwise call itself legal. */
  const reasonFor = (option: TransformLegality[keyof TransformLegality]): string =>
    unstarted || !option.reasonKey ? unstartedReason : t(option.reasonKey, option.reasonParams)
  const cumulativeReasonId = `${groupId}-cumulative-reason`
  const rollingReasonId = `${groupId}-rolling-reason`
  const percentReasonId = `${groupId}-percent-reason`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label id={`${groupId}-label`}>{t('rb.control.transform')}</Label>
        <InfoHint t={t}>{hintLines([t('rb.control.transform.hint')])}</InfoHint>
      </div>

      <div role="group" aria-labelledby={`${groupId}-label`} className="flex flex-col gap-1.5">
        {/* ── cumulative total ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-0.5">
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={transform.cumulative}
              disabled={cumulativeOff}
              aria-describedby={cumulativeOff ? cumulativeReasonId : undefined}
              onCheckedChange={(checked) => setTransform({ cumulative: checked === true })}
            />
            {t('rb.control.transform.cumulative')}
          </label>
          {cumulativeOff && (
            <p id={cumulativeReasonId} className="text-xs text-muted-foreground">
              {reasonFor(options.cumulative)}
            </p>
          )}
        </div>

        {/* ── rolling average ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5 text-sm">
            <Checkbox
              checked={transform.rollingAverage !== null}
              disabled={rollingOff}
              aria-label={t('rb.control.transform.rollingAverage')}
              aria-describedby={rollingOff ? rollingReasonId : undefined}
              onCheckedChange={(checked) =>
                setTransform({
                  rollingAverage: checked === true ? Math.min(7, rollingMax) : null,
                })
              }
            />
            {t('rb.control.transform.rollingAverage')}
            <Input
              type="number"
              inputMode="numeric"
              className="w-14 tabular-nums"
              min={2}
              max={rollingMax}
              placeholder="7"
              disabled={rollingOff || transform.rollingAverage === null}
              value={transform.rollingAverage ?? ''}
              aria-label={t('rb.control.transform.rollingAverage')}
              onChange={(event) => {
                const raw = Number(event.target.value)
                if (!Number.isFinite(raw)) return
                setTransform({ rollingAverage: Math.max(2, Math.min(rollingMax, Math.round(raw))) })
              }}
            />
            <span className="text-xs text-muted-foreground">
              {t('rb.control.transform.rollingAverage.unit')}
            </span>
          </div>
          {rollingOff && (
            <p id={rollingReasonId} className="text-xs text-muted-foreground">
              {reasonFor(options.rollingAverage)}
            </p>
          )}
        </div>

        {/* ── percent of total ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-0.5">
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={transform.percentOfTotal}
              disabled={percentOff}
              aria-describedby={percentOff ? percentReasonId : undefined}
              onCheckedChange={(checked) => setTransform({ percentOfTotal: checked === true })}
            />
            {t('rb.control.transform.percentOfTotal')}
          </label>
          {percentOff && (
            <p id={percentReasonId} className="text-xs text-muted-foreground">
              {reasonFor(options.percentOfTotal)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
