/**
 * The segment picker — `22-analytics-v2.md` §1.2. Up to four populations,
 * saved or inline, each taking a hue from the eight-stop ramp (D40,
 * `--chart-s1` … `--chart-s8`). Legality (the ceiling, `performed` support on
 * an already-added segment) comes from `plan.violations`; this component adds
 * no rule the planner does not already state.
 */

import { useEffect, useId, useState } from 'react'
import { BreachedIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { InfoHint, hintLines } from '@/components/InfoHint'
import { listSegments } from '@/data/clients'
import type { Dimension, Measure, QueryViolation, ReportQuery } from '@/data/types'
import type { PerformedSpec, Segment, SegmentRef } from '@/data/types/segment'
import type { Translator } from '@/lib'

const SEGMENTS_MAX = 4
/** The eight-stop categorical ramp (D40). Takes the ramp's length as a parameter — §1.2's open question. */
const RAMP_STOPS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const

export function segmentHue(index: number, rampLength: number = RAMP_STOPS.length): string {
  const usable = RAMP_STOPS.slice(0, Math.max(1, Math.min(rampLength, RAMP_STOPS.length)))
  const stop = usable[index % usable.length] ?? usable[0]
  return `var(--chart-${stop})`
}

export interface SegmentPickerProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  legalFilterFields: readonly string[]
  dimensions: readonly Dimension[]
  measures: readonly Measure[]
  /** Already filtered to `field === 'segments'` by the caller. */
  violations: readonly QueryViolation[]
  unstarted: boolean
  t: Translator
}

type SavedState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'content'; items: Segment[] }

export function SegmentPicker({
  query,
  onChange,
  legalFilterFields,
  dimensions,
  measures,
  violations,
  unstarted,
  t,
}: SegmentPickerProps) {
  const groupId = useId()
  const segments = query.segments ?? []
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState<SavedState>({ status: 'loading' })

  /* Loaded once, whether or not the popover is open — a saved chip's NAME has
     to resolve without the operator reopening the picker. */
  useEffect(() => {
    const controller = new AbortController()
    setSaved({ status: 'loading' })
    listSegments({}, controller.signal).then(
      (res) => setSaved({ status: 'content', items: res.items }),
      () => setSaved({ status: 'error' }),
    )
    return () => controller.abort()
  }, [])

  const atMax = segments.length >= SEGMENTS_MAX
  const ceilingViolation = violations.find((v) => v.code === 'too-many-series')
  const performedViolation = violations.find((v) => v.code === 'segment-performed-unsupported')

  const nameOf = (ref: SegmentRef): string =>
    ref.kind === 'inline'
      ? ref.label
      : (saved.status === 'content' ? saved.items.find((s) => s.id === ref.id)?.name : undefined) ?? ref.id

  const remove = (index: number) =>
    onChange({ ...query, segments: segments.filter((_, i) => i !== index) })

  const add = (ref: SegmentRef) => {
    onChange({ ...query, segments: [...segments, ref] })
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Label id={`${groupId}-label`}>{t('rb.control.segments')}</Label>
        <InfoHint t={t}>
          {hintLines([
            unstarted ? t('rb.control.disabled.unstarted') : t('rb.control.segments.hint'),
            ceilingViolation && t(ceilingViolation.reasonKey, ceilingViolation.reasonParams),
            performedViolation && t(performedViolation.reasonKey, performedViolation.reasonParams),
          ])}
        </InfoHint>
      </div>

      {segments.length > 0 && (
        <ul aria-labelledby={`${groupId}-label`} className="flex list-none flex-wrap gap-1">
          {segments.map((ref, index) => {
            /* AC-1154 — the LAST-added segment is the one named when the
               ceiling is breached, so the operator knows which chip to pull. */
            const breached = Boolean(ceilingViolation) && index === segments.length - 1
            return (
              <li key={index}>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => remove(index)}
                  className="gap-1"
                >
                  {breached ? (
                    <BreachedIcon aria-hidden="true" className="size-3.5 text-warning-graphic" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: segmentHue(index) }}
                    />
                  )}
                  <bdi>{nameOf(ref)}</bdi>
                  <span className="sr-only">
                    {breached ? ` ${t('rb.control.segments.overCeiling')}` : ''}{' '}
                    {t('rb.control.segments.remove', { name: nameOf(ref) })}
                  </span>
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="self-start"
            disabled={unstarted || atMax}
            aria-describedby={atMax ? `${groupId}-max` : undefined}
          >
            {t('rb.control.segments.add')}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <SegmentComposer
            saved={saved}
            legalFilterFields={legalFilterFields}
            dimensions={dimensions}
            measures={measures}
            onPickSaved={(id) => add({ kind: 'saved', id })}
            onAddInline={(inline) => add(inline)}
            onCancel={() => setOpen(false)}
            t={t}
          />
        </PopoverContent>
      </Popover>
      {atMax && (
        <p id={`${groupId}-max`} className="text-xs text-muted-foreground">
          {t('rb.control.segments.max')}
        </p>
      )}
    </div>
  )
}

function SegmentComposer({
  saved,
  legalFilterFields,
  dimensions,
  measures,
  onPickSaved,
  onAddInline,
  onCancel,
  t,
}: {
  saved: SavedState
  legalFilterFields: readonly string[]
  dimensions: readonly Dimension[]
  measures: readonly Measure[]
  onPickSaved: (id: string) => void
  onAddInline: (ref: Extract<SegmentRef, { kind: 'inline' }>) => void
  onCancel: () => void
  t: Translator
}) {
  const [name, setName] = useState('')
  const [field, setField] = useState('')
  const [value, setValue] = useState('')
  const [filters, setFilters] = useState<ReportQuery['filters']>([])
  const [performedOn, setPerformedOn] = useState(false)
  const [performedMeasure, setPerformedMeasure] = useState('')
  const [performedOp, setPerformedOp] = useState<PerformedSpec['op']>('gte')
  const [performedCount, setPerformedCount] = useState('1')
  const [performedWindow, setPerformedWindow] = useState<'each-bucket' | 'rolling'>('each-bucket')
  const [performedDays, setPerformedDays] = useState('7')

  const performedMeasures = measures.filter((m) => m.supportsPerformed === true)
  const performedUnsupported = performedMeasures.length === 0

  const labelFor = (key: string) => t(dimensions.find((d) => d.key === key)?.labelKey ?? key)

  const addFilter = () => {
    if (field === '' || value.trim() === '') return
    setFilters((current) => [...current.filter((f) => f.field !== field), { field, op: 'eq', value: value.trim() }])
    setValue('')
  }

  const canAdd = name.trim() !== ''

  const submit = () => {
    if (!canAdd) return
    const performed: PerformedSpec | undefined =
      performedOn && performedMeasure !== ''
        ? {
            measureKey: performedMeasure,
            op: performedOp,
            count: Math.max(1, Number(performedCount) || 1),
            window: performedWindow === 'each-bucket' ? 'each-bucket' : { rollingDays: Math.max(1, Number(performedDays) || 1) },
          }
        : undefined
    onAddInline({ kind: 'inline', label: name.trim(), filters, performed })
  }

  return (
    <div className="flex flex-col">
      {/* ── saved segments ──────────────────────────────────────────────── */}
      <Command label={t('rb.control.segments')} className="rounded-b-none">
        <CommandInput placeholder={t('rb.control.segments.search')} />
        <CommandList className="max-h-40">
          {saved.status === 'loading' && (
            <p className="px-2 py-2 text-xs text-muted-foreground">{t('rb.catalogue.segments.loading')}</p>
          )}
          {saved.status === 'error' && (
            <p className="px-2 py-2 text-xs text-muted-foreground">{t('rb.catalogue.segments.error')}</p>
          )}
          {saved.status === 'content' && saved.items.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">{t('rb.control.segments.none')}</p>
          )}
          {saved.status === 'content' && saved.items.length > 0 && (
            <>
              <CommandEmpty className="px-2 py-2 text-xs text-muted-foreground">
                {t('rb.control.segments.none')}
              </CommandEmpty>
              <CommandGroup>
                {saved.items.map((segment) => (
                  <CommandItem key={segment.id} value={segment.name} onSelect={() => onPickSaved(segment.id)}>
                    {segment.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>

      <CommandSeparator />

      {/* ── new segment ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-2">
        <Label htmlFor="rb-segment-name" className="text-xs text-muted-foreground">
          {t('rb.control.segments.new.name')}
        </Label>
        <Input id="rb-segment-name" value={name} onChange={(event) => setName(event.target.value)} />

        {filters.length > 0 && (
          <ul className="flex list-none flex-wrap gap-1">
            {filters.map((f) => (
              <li key={f.field}>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => setFilters((current) => current.filter((each) => each.field !== f.field))}
                >
                  <bdi>{String(f.value)}</bdi>
                  <span className="sr-only">
                    {t('rb.control.filters.remove', { field: labelFor(f.field) })}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}

        {legalFilterFields.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Select value={field} onValueChange={setField}>
              <SelectTrigger className="w-32" size="sm">
                <SelectValue placeholder={t('rb.control.filters.field')} />
              </SelectTrigger>
              <SelectContent>
                {legalFilterFields.map((key) => (
                  <SelectItem key={key} value={key}>
                    {labelFor(key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label={t('rb.control.filters.value')}
              className="w-24"
              value={value}
              disabled={field === ''}
              onChange={(event) => setValue(event.target.value)}
            />
            <Button type="button" size="xs" variant="secondary" disabled={field === '' || value.trim() === ''} onClick={addFilter}>
              {t('rb.control.filters.apply')}
            </Button>
          </div>
        )}

        {/* ── performed ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1.5 text-sm">
            <Checkbox
              checked={performedOn}
              disabled={performedUnsupported}
              onCheckedChange={(checked) => setPerformedOn(checked === true)}
            />
            {t('rb.control.segments.performed.label')}
          </label>
          {performedUnsupported ? (
            <p className="text-xs text-muted-foreground">{t('rb.control.segments.performed.unsupported')}</p>
          ) : (
            performedOn && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Select value={performedMeasure} onValueChange={setPerformedMeasure}>
                  <SelectTrigger className="w-36" size="sm">
                    <SelectValue placeholder={t('rb.control.measure.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {performedMeasures.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {t(m.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={performedOp} onValueChange={(v) => setPerformedOp(v as PerformedSpec['op'])}>
                  <SelectTrigger className="w-24" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gte">{t('rb.control.segments.performed.op.gte')}</SelectItem>
                    <SelectItem value="lte">{t('rb.control.segments.performed.op.lte')}</SelectItem>
                    <SelectItem value="eq">{t('rb.control.segments.performed.op.eq')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className="w-14 tabular-nums"
                  value={performedCount}
                  aria-label={t('rb.control.segments.performed.timesUnit')}
                  onChange={(event) => setPerformedCount(event.target.value)}
                />
                <span className="text-xs text-muted-foreground">{t('rb.control.segments.performed.timesUnit')}</span>
                <Select value={performedWindow} onValueChange={(v) => setPerformedWindow(v as 'each-bucket' | 'rolling')}>
                  <SelectTrigger className="w-32" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each-bucket">{t('rb.control.segments.performed.eachBucket')}</SelectItem>
                    <SelectItem value="rolling">
                      {t('rb.control.segments.performed.rollingDays', { days: performedDays })}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {performedWindow === 'rolling' && (
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="w-14 tabular-nums"
                    value={performedDays}
                    aria-label={t('rb.control.segments.performed.rollingDays', { days: performedDays })}
                    onChange={(event) => setPerformedDays(event.target.value)}
                  />
                )}
              </div>
            )
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
            {t('rb.control.segments.new.cancel')}
          </Button>
          <Button type="button" size="xs" disabled={!canAdd} onClick={submit}>
            {t('rb.control.segments.new.add')}
          </Button>
        </div>
      </div>
    </div>
  )
}
