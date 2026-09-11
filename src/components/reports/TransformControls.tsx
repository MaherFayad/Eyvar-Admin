/**
 * Transform controls — `22-analytics-v2.md` §1.3. Three checkboxes over
 * `query.transform`. `plan.ts` carries no `ReportTransform` violation code
 * today (flagged in the WP-2.6 handoff), so each reason below is a LOCAL
 * predicate over facts the planner already exposes elsewhere — `additive`,
 * `hasSplit`, `bucketCount` — never a second copy of a rule stated twice.
 */

import { useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InfoHint, hintLines } from '@/components/InfoHint'
import { DEFAULT_REPORT_TRANSFORM, type ReportTransform } from '@/data/types/report'
import type { Measure, ReportQuery } from '@/data/types'
import type { Translator } from '@/lib'

export interface TransformControlsProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  /** Rolling average defaults to 7 buckets on check; `null` clamps it. */
  firstMeasure: Measure | null
  hasSplit: boolean
  bucketCount: number
  unstarted: boolean
  t: Translator
}

export function TransformControls({
  query,
  onChange,
  firstMeasure,
  hasSplit,
  bucketCount,
  unstarted,
  t,
}: TransformControlsProps) {
  const groupId = useId()
  const transform = query.transform ?? DEFAULT_REPORT_TRANSFORM
  const setTransform = (next: Partial<ReportTransform>) =>
    onChange({ ...query, transform: { ...transform, ...next } })

  const additive = firstMeasure?.additive ?? false
  const rollingMax = Math.max(2, Math.min(30, bucketCount))

  const cumulativeOff = unstarted || !additive
  const rollingOff = unstarted || bucketCount < 2
  const percentOff = unstarted || !hasSplit

  const unstartedReason = t('rb.control.disabled.unstarted')
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
              {unstarted ? unstartedReason : t('rb.control.transform.cumulative.disabled')}
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
              {unstarted
                ? unstartedReason
                : t('rb.control.transform.rollingAverage.disabled', { count: bucketCount })}
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
              {unstarted ? unstartedReason : t('rb.control.transform.percentOfTotal.disabled')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
