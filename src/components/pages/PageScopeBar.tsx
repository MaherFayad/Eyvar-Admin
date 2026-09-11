/**
 * The page's scope bar — range and filter chips applied to every `report`/
 * `metric` block through `applyBoardScope` (§5, ported verbatim from
 * `DashboardDetailScreen.tsx`'s `BoardRangeControl`/`BoardFilterControl`,
 * unchanged mechanism and copy, per `03-pages-and-dashboards.md` §5).
 */

import { Suspense, lazy, useState } from 'react'
import { CalendarIcon, CheckIcon, ChevronDownIcon, FilterIcon, forwardIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { boardFilterFields } from '@/data/clients/dashboards'
import { resolveWindow } from '@/data/clients'
import { REPORT_PRESETS } from '@/data/clients/reports'
import type { Dimension, FilterSpec, Measure } from '@/data/types'
import type { Page } from '@/data/types/page'
import type { ReportWindow } from '@/data/types/report'
import { directionFor, formatDate, type Language, type Translator } from '@/lib'

const Calendar = lazy(() => import('@/components/ui/calendar').then((m) => ({ default: m.Calendar })))

function toLocalDate(day: string): Date | undefined {
  if (day === '') return undefined
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

function toIsoDay(date: Date | undefined): string | null {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function fieldLabel(field: string, dimensions: readonly Dimension[], t: Translator): string {
  const dimension = dimensions.find((candidate) => candidate.key === field)
  return dimension ? t(dimension.labelKey) : field
}

export interface PageScopeBarProps {
  scope: Page['scope']
  onChange: (scope: Page['scope']) => void
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  editable: boolean
  today: string
  t: Translator
  language: Language
}

export function PageScopeBar({ scope, onChange, measures, dimensions, editable, today, t, language }: PageScopeBarProps) {
  const filterFields = boardFilterFields(measures, dimensions)
  if (!editable && scope.range === null && scope.filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      <BoardRangeControl
        range={scope.range}
        today={today}
        onChange={(range) => onChange({ ...scope, range })}
        t={t}
        language={language}
      />
      {scope.filters.map((filter) => (
        <Button
          key={filter.field}
          type="button"
          variant="secondary"
          size="xs"
          onClick={() => onChange({ ...scope, filters: scope.filters.filter((f) => f.field !== filter.field) })}
        >
          <bdi>{t('rb.dashboard.filters.chip', { field: fieldLabel(filter.field, dimensions, t), value: String(filter.value) })}</bdi>
          <span className="sr-only">{t('rb.dashboard.filters.remove', { field: fieldLabel(filter.field, dimensions, t) })}</span>
        </Button>
      ))}
      <BoardFilterControl
        fields={filterFields}
        dimensions={dimensions}
        onAdd={(filter) =>
          onChange({ ...scope, filters: [...scope.filters.filter((f) => f.field !== filter.field), filter] })
        }
        t={t}
      />
    </div>
  )
}

function BoardRangeControl({
  range,
  today,
  onChange,
  t,
  language,
}: {
  range: ReportWindow | null
  today: string
  onChange: (range: ReportWindow | null) => void
  t: Translator
  language: Language
}) {
  const FromToArrow = forwardIcon(directionFor(language))
  const [open, setOpen] = useState(false)
  const seed = resolveWindow(range ?? { kind: 'preset', preset: 'last-30d' }, today)
  const [draft, setDraft] = useState({ from: seed.from, to: seed.to })
  const [seededFor, setSeededFor] = useState('')
  const seedKey = `${seed.from}:${seed.to}`
  if (seededFor !== seedKey) {
    setSeededFor(seedKey)
    setDraft({ from: seed.from, to: seed.to })
  }

  function abandon() {
    setDraft({ from: seed.from, to: seed.to })
    setOpen(false)
  }

  const unchanged = range?.kind === 'absolute' && draft.from === range.from && draft.to === range.to
  const illegal = draft.from === '' || draft.to === '' || draft.from > draft.to

  const headline =
    range === null ? t('rb.dashboard.range.own') : range.kind === 'preset' ? t(`rb.preset.${range.preset}`) : t('rb.dashboard.range.custom')

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : abandon())}>
      <PopoverTrigger asChild>
        <Button type="button" variant="secondary" aria-label={t('rb.dashboard.range')} className="h-auto justify-between gap-2 py-1.5">
          <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex flex-col items-start gap-0.5">
            <span>{headline}</span>
            {range !== null && (
              <bdi className="text-2xs font-normal tabular-nums text-muted-foreground">
                {t('rb.control.window.range', {
                  from: formatDate(resolveWindow(range, today).from, { style: 'day-month', language }),
                  to: formatDate(resolveWindow(range, today).to, { style: 'day-month', language }),
                })}
              </bdi>
            )}
          </span>
          <ChevronDownIcon aria-hidden="true" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="flex w-auto flex-col gap-3 p-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-48 flex-col gap-1">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="w-full justify-start gap-2 font-normal"
              aria-pressed={range === null}
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
            >
              <CheckIcon aria-hidden="true" className={range === null ? 'text-muted-foreground' : 'invisible'} />
              {t('rb.dashboard.range.own')}
            </Button>
            <p className="ps-7 pb-1 text-xs text-muted-foreground">{t('rb.dashboard.range.own.hint')}</p>
            <Separator />
            <ul className="flex list-none flex-col">
              {REPORT_PRESETS.map((preset) => {
                const active = range?.kind === 'preset' && range.preset === preset
                return (
                  <li key={preset}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="w-full justify-start gap-2 font-normal"
                      aria-pressed={active}
                      onClick={() => {
                        onChange({ kind: 'preset', preset })
                        setOpen(false)
                      }}
                    >
                      <CheckIcon aria-hidden="true" className={active ? 'text-muted-foreground' : 'invisible'} />
                      {t(`rb.preset.${preset}`)}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>

          <Separator orientation="vertical" className="h-auto" />

          <div role="group" aria-label={t('rb.dashboard.range.custom')} className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pg-scope-range-from" className="text-xs text-muted-foreground">
                  {t('rb.dashboard.range.from')}
                </Label>
                <Input
                  id="pg-scope-range-from"
                  type="date"
                  className="w-36 tabular-nums"
                  value={draft.from}
                  onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
                />
              </div>
              <FromToArrow aria-hidden="true" className="mb-2 size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pg-scope-range-to" className="text-xs text-muted-foreground">
                  {t('rb.dashboard.range.to')}
                </Label>
                <Input
                  id="pg-scope-range-to"
                  type="date"
                  className="w-36 tabular-nums"
                  value={draft.to}
                  onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
                />
              </div>
            </div>

            <Suspense fallback={<div className="h-62 w-full" aria-hidden="true" />}>
              <Calendar
                mode="range"
                numberOfMonths={2}
                defaultMonth={toLocalDate(draft.from)}
                selected={{ from: toLocalDate(draft.from), to: toLocalDate(draft.to) }}
                onSelect={(picked) =>
                  setDraft((current) => ({
                    from: toIsoDay(picked?.from) ?? current.from,
                    to: toIsoDay(picked?.to) ?? toIsoDay(picked?.from) ?? current.to,
                  }))
                }
              />
            </Suspense>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="xs" onClick={abandon}>
            {t('rb.dashboard.range.cancel')}
          </Button>
          <Button
            type="button"
            size="xs"
            disabled={unchanged || illegal}
            onClick={() => {
              onChange({ kind: 'absolute', from: draft.from, to: draft.to })
              setOpen(false)
            }}
          >
            {t('rb.dashboard.range.apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function BoardFilterControl({
  fields,
  dimensions,
  onAdd,
  t,
}: {
  fields: readonly string[]
  dimensions: readonly Dimension[]
  onAdd: (filter: FilterSpec) => void
  t: Translator
}) {
  const [open, setOpen] = useState(false)
  const [field, setField] = useState('')
  const [value, setValue] = useState('')

  const submit = () => {
    if (field === '' || value.trim() === '') return
    onAdd({ field, op: 'eq', value: value.trim() })
    setField('')
    setValue('')
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setField('')
          setValue('')
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="secondary" className="gap-2">
          <FilterIcon aria-hidden="true" className="size-4 shrink-0" />
          {t('rb.dashboard.filters.add')}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="flex w-72 flex-col gap-3 p-3">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('rb.dashboard.filters.empty')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pg-scope-filter-field">{t('rb.dashboard.filters.field')}</Label>
              <Select value={field} onValueChange={setField}>
                <SelectTrigger id="pg-scope-filter-field" className="w-full">
                  <SelectValue placeholder={t('rb.dashboard.filters.field')} />
                </SelectTrigger>
                <SelectContent>
                  {fields.map((key) => (
                    <SelectItem key={key} value={key}>
                      {fieldLabel(key, dimensions, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pg-scope-filter-value">{t('rb.dashboard.filters.value')}</Label>
              <Input id="pg-scope-filter-value" value={value} disabled={field === ''} onChange={(event) => setValue(event.target.value)} />
            </div>

            <p className="text-xs text-muted-foreground">{t('rb.dashboard.filters.hint')}</p>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setField('')
                  setValue('')
                  setOpen(false)
                }}
              >
                {t('rb.dashboard.filters.cancel')}
              </Button>
              <Button type="button" size="xs" disabled={field === '' || value.trim() === ''} onClick={submit}>
                {t('rb.dashboard.filters.apply')}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
