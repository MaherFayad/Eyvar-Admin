/**
 * **The Report Builder's one date-range control.**
 *
 * §5.3 item 5 for `QueryPanel`'s rail and the same item for
 * `ReportModePanel`'s. It was written twice — `QueryPanel.WindowControl` and
 * `ReportModePanel.WindowField`, near-verbatim — and both copies were two bare
 * `type="date"` inputs and an `Apply`. That is not a house range popover.
 *
 * DESIGN.md §3.7 states the form as a MUST:
 *
 * > *The range popover MUST offer presets **and** explicit start/end inputs
 * > **and** two visible months, and MUST require an explicit `Apply`.*
 *
 * All four are here, and there is now one place they can stop being true.
 *
 * ## It is `BoardPeriodControl`'s shape, and it is not that component
 *
 * `src/components/metrics/BoardPeriodControl.tsx` already answers this exact
 * question for the metric boards: a preset column with a check on the live
 * preset, two date fields, a two-month range calendar behind a `lazy`
 * boundary, `Cancel` / `Apply`. The shape is borrowed wholesale. What differs
 * is the vocabulary — the boards' presets are `MetricPeriod`, these are
 * `ReportPreset`, and the value written back is a `ReportWindow` on a
 * `ReportQuery` — so one component generic over both would earn nothing.
 *
 * ## The trigger states the range, because reading it cost two clicks
 *
 * It printed `Last 30 days` and nothing else: an operator who wanted to know
 * *which* thirty days had to open the popover, and an operator looking at an
 * absolute window read `13 Aug – 11 Sep` with no clue whether it was pinned or
 * rolling. So the trigger carries both facts — the preset's name (or
 * `Custom range` when the window is pinned) over the resolved range beneath it.
 * Amplitude §A7 puts the same two facts on the toolbar; §3.7's chip rule puts
 * them here, in the rail, which is where this product's query lives.
 *
 * `rb.control.window.custom` was written, translated and never rendered. This
 * is the pane it was written for.
 *
 * ## What did NOT change
 *
 *   - The nine presets and their ids — now read from `REPORT_PRESETS` rather
 *     than from the hand-kept copy `QueryPanel` held privately, which is the
 *     duplication that array's own comment forbids.
 *   - Picking a preset commits and closes. `Apply` governs the CUSTOM range;
 *     a preset is already an explicit and complete choice.
 *   - `resolveWindow` decides what a preset means. This control computes no
 *     date of its own.
 *   - The trend rail disables the whole control on an unstarted report and the
 *     three mode rails never do — a cohort's window is the thing that decides
 *     how many columns it can reach, so it must be reachable before a measure
 *     exists. That is why `disabled` is a prop and not a rule in here.
 *
 * Rules applied
 *   §3.7      presets + explicit inputs + two visible months + explicit Apply.
 *   §10.2     the range popover's anatomy; `Apply` disabled until the range
 *             changes. This is the one popover carrying Apply/Cancel (§5.4).
 *   §3.2      validate by disabling the primary, never by an error after
 *             submit — an inverted or half-typed range never becomes a query.
 *   §5.4      nothing commits on click-through; `Cancel`, `Escape` and a click
 *             outside all abandon the draft.
 *   §7.2      the trigger is a real `<button>` with the primitive's own focus
 *             ring; every preset and every day cell is focusable.
 *   §9.1      logical spacing throughout; nothing is placed by a physical side.
 *   §9.5      the calendar's month order and its `‹ ›` follow `dir`; the
 *             from→to arrow is a reading-order mark and mirrors with them.
 *   AC-443    one key with named placeholders for the range label.
 */

import { Suspense, lazy, useEffect, useState } from 'react'
import { CalendarIcon, CheckIcon, ChevronDownIcon } from '@/components/icons'
import { forwardIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { resolveWindow } from '@/data/clients'
import { REPORT_PRESETS } from '@/data/clients/reports'
import type { ReportQuery } from '@/data/types'
import { directionFor, formatDate, type Language, type Translator } from '@/lib'

/* `react-day-picker` + `date-fns` is 20.5 KB gzip and this rail renders on
   every report. An operator who never opens the popover never downloads a
   calendar — the same boundary `BoardPeriodControl` draws, for the same
   reason. */
const Calendar = lazy(() =>
  import('@/components/ui/calendar').then((m) => ({ default: m.Calendar })),
)

/** `2026-09-03` → LOCAL midnight, which is the day the calendar paints. */
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

export interface WindowControlProps {
  query: ReportQuery
  onChange: (query: ReportQuery) => void
  /** The day presets resolve against. Passed, never read from an ambient clock. */
  today: string
  /**
   * The trend rail's unstarted state, and nothing else. Defaults to `false`
   * because the three mode rails deliberately keep the window live — see the
   * note above.
   */
  disabled?: boolean
  /**
   * Distinct per rail, so two panels cannot both claim `rb-window` if they ever
   * render in one document. It also names the two date fields.
   */
  id?: string
  /**
   * **§A7 — the toolbar variant.**
   *
   * The rail stacks a `Label` over every control because the rail is a form.
   * The toolbar sets its controls side by side, so the label moves onto the
   * trigger as an `aria-label` and a 16px calendar glyph carries it visually —
   * which is §1.5's own "input affix / disclosure" case, and the one Amplitude
   * puts at the end of its toolbar row.
   *
   * **The trigger's TEXT does not change.** It still prints the preset name
   * over the resolved range, because those are the two facts §3.7's chip rule
   * requires and dropping one to save width is how "which thirty days?" becomes
   * a two-click question again.
   */
  compact?: boolean
  t: Translator
  language: Language
}

export function WindowControl({
  query,
  onChange,
  today,
  disabled = false,
  id = 'rb-window',
  compact = false,
  t,
  language,
}: WindowControlProps) {
  const FromToArrow = forwardIcon(directionFor(language))
  const [open, setOpen] = useState(false)
  const resolved = resolveWindow(query.window, today)
  /** The draft is a COPY. Nothing on the page reads it until `Apply`. */
  const [draft, setDraft] = useState({ from: resolved.from, to: resolved.to })

  /* Re-seed whenever the LIVE window changes, including from outside this
     popover — a preset click, a `Back`, a link that arrived composed. Without
     it, reopening the picker after a preset shows the range from before it.
     Both old copies carried this defect. */
  useEffect(() => {
    setDraft({ from: resolved.from, to: resolved.to })
  }, [resolved.from, resolved.to])

  /** One place abandons the draft, so no path can leave it half-applied. */
  function abandon() {
    setDraft({ from: resolved.from, to: resolved.to })
    setOpen(false)
  }

  const unchanged =
    query.window.kind === 'absolute' &&
    draft.from === query.window.from &&
    draft.to === query.window.to
  const illegal = draft.from === '' || draft.to === '' || draft.from > draft.to

  /* Two facts, not one: WHICH window was asked for, and WHICH DAYS that is. A
     preset without its dates cannot be checked against a chart; dates without
     the preset cannot be told apart from a pinned range. */
  const headline =
    query.window.kind === 'preset'
      ? t(`rb.preset.${query.window.preset}`)
      : t('rb.control.window.custom')
  const range = t('rb.control.window.range', {
    from: formatDate(resolved.from, { style: 'day-month', language }),
    to: formatDate(resolved.to, { style: 'day-month', language }),
  })

  const control = (
      <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : abandon())}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="secondary"
            disabled={disabled}
            /* The label is on the trigger in the toolbar and above it in the
               rail. Exactly one of the two, so the accessible name is the same
               string either way. */
            aria-label={compact ? t('rb.control.window') : undefined}
            className={cn('h-auto justify-between py-1.5', compact && 'gap-2')}
          >
            {/* A calendar is an OBJECT, not a reading-order mark, so it does not
                mirror (§9.5). It inherits `currentColor` through the button. */}
            {compact && <CalendarIcon aria-hidden="true" className="size-4 shrink-0" />}
            <span className="flex flex-col items-start gap-0.5">
              <span>{headline}</span>
              {/* `<bdi>` isolates it: `13 Aug – 11 Sep` is a numeral run whose
                  leading digit the UBA otherwise throws to the far end of an
                  Arabic line. */}
              <bdi className="text-2xs font-normal tabular-nums text-muted-foreground">
                {range}
              </bdi>
            </span>
            <ChevronDownIcon aria-hidden="true" className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="flex w-auto flex-col gap-3 p-3">
          <div className="flex flex-wrap gap-3">
            {/* ── the nine presets ─────────────────────────────────────── */}
            <ul className="flex min-w-40 list-none flex-col">
              {REPORT_PRESETS.map((preset) => {
                const active = query.window.kind === 'preset' && query.window.preset === preset
                return (
                  <li key={preset}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="w-full justify-start gap-2 font-normal"
                      aria-pressed={active}
                      onClick={() => {
                        onChange({ ...query, window: { kind: 'preset', preset } })
                        setOpen(false)
                      }}
                    >
                      {/* The check keeps its slot whether or not it is drawn, so
                          choosing a window does not shift the other eight labels
                          sideways under the pointer. */}
                      <CheckIcon
                        aria-hidden="true"
                        className={active ? 'text-muted-foreground' : 'invisible'}
                      />
                      {t(`rb.preset.${preset}`)}
                    </Button>
                  </li>
                )
              })}
            </ul>

            <Separator orientation="vertical" className="h-auto" />

            {/* ── the custom range ─────────────────────────────────────── */}
            <div
              role="group"
              aria-label={t('rb.control.window.custom')}
              className="flex flex-col gap-3"
            >
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-from`} className="text-xs text-muted-foreground">
                    {t('rb.control.window.from')}
                  </Label>
                  <Input
                    id={`${id}-from`}
                    type="date"
                    className="w-36 tabular-nums"
                    value={draft.from}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, from: event.target.value }))
                    }
                  />
                </div>
                {/* A reading-order mark between two fields whose order mirrors,
                    so it is PICKED BY `dir` (§9.5, O10) - unlike a calendar
                    glyph, which is an object and does not mirror. */}
                <FromToArrow
                  aria-hidden="true"
                  className="mb-2 size-4 shrink-0 text-muted-foreground"
                />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${id}-to`} className="text-xs text-muted-foreground">
                    {t('rb.control.window.to')}
                  </Label>
                  <Input
                    id={`${id}-to`}
                    type="date"
                    className="w-36 tabular-nums"
                    value={draft.to}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, to: event.target.value }))
                    }
                  />
                </div>
              </div>

              <Suspense
                fallback={
                  /* The grid's own footprint, so the popover does not resize
                     under the pointer when the chunk lands. */
                  <div className="h-62 w-full" aria-hidden="true" />
                }
              >
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  defaultMonth={toLocalDate(draft.from)}
                  selected={{ from: toLocalDate(draft.from), to: toLocalDate(draft.to) }}
                  onSelect={(picked) =>
                    setDraft((current) => ({
                      from: toIsoDay(picked?.from) ?? current.from,
                      /* A range mid-drag has a `from` and no `to`. Collapsing to
                         the start rather than emptying it keeps the draft a
                         valid window at every click, which is what lets `Apply`
                         be enabled on a real change and not on a half-made
                         one. */
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
              {t('rb.control.window.cancel')}
            </Button>
            {/* §3.2 — the primary is off while the range is illegal, and §10.2
                keeps it off until the range actually changes. An inverted range
                never becomes a query. */}
            <Button
              type="button"
              size="xs"
              disabled={unchanged || illegal}
              onClick={() => {
                onChange({
                  ...query,
                  window: { kind: 'absolute', from: draft.from, to: draft.to },
                })
                setOpen(false)
              }}
            >
              {t('rb.control.window.apply')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
  )

  if (compact) return control

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t('rb.control.window')}</Label>
      {control}
    </div>
  )
}
