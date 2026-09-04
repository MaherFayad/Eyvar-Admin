/**
 * **The board's window, as a control rather than a caption.**
 *
 * The pill at the inline-end of every board band printed the range the metrics
 * happened to cover and did nothing. An operator reading a board wants the
 * question "and over the last week?" answered without leaving the page, and
 * every other console on the market answers it here, in this exact spot — so
 * the caption becomes the picker.
 *
 * ## What it is, and what it is not
 *
 * It is `PeriodControl`'s shape (Finance › shared), because that pattern is
 * already proven in this product: a preset column with a check on the live one,
 * two `type="date"` fields, a two-month range calendar behind a `lazy` boundary,
 * and `Apply` / `Cancel`. It is NOT that component: the presets differ (rolling
 * windows, not calendar ones — see `periods.ts`), there are no month steppers
 * (stepping a rolling seven-day window by a month is not a gesture anyone
 * makes), and the trigger is drawn for the dark band rather than for a white
 * toolbar.
 *
 * ## The trigger keeps the pill's exact geometry
 *
 * Same border, same ground, same padding, same calendar mark. What is added is
 * a chevron and the affordances of a real `<button>` — hover, focus ring,
 * `aria-expanded` from `PopoverTrigger`. A control that changes size when it
 * becomes interactive tells the operator the page moved under them.
 *
 * ## Rulings
 *
 *   §7.4     the trigger is a `<button>`, so keyboard and screen reader reach
 *            it; `Popover` traps and restores focus.
 *   §9.5     the calendar mark does not mirror — a calendar is an object, not a
 *            direction. The chevron does not mirror either: it points DOWN,
 *            which is the same down in both directions. The arrow BETWEEN the
 *            two date fields does mirror, and it is an SVG rather than a text
 *            `→` precisely so that it can.
 *   R6       `Reset` is a fragment on a button, not a sentence.
 *   AC-443   one key, named placeholders, for the range label.
 */

import { Suspense, lazy, useEffect, useState } from 'react'
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  forwardIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { directionFor, formatDate, type Language, type Translate } from '@/lib'
import { EYVAR_TODAY } from '@/data/mock/clock'
import {
  METRIC_PERIODS,
  activeMetricPeriod,
  isInverted,
  periodOf,
  type MetricPeriod,
} from '@/screens/metrics/periods'

/* Same reason as `PeriodControl`: `react-day-picker` + `date-fns` is 20.5 KB
   gzip, and an operator who never opens the picker never downloads a calendar. */
const Calendar = lazy(() =>
  import('@/components/ui/calendar').then((m) => ({ default: m.Calendar })),
)

function toLocalDate(day: string | null): Date | undefined {
  if (day === null) return undefined
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

function toIsoDay(date: Date | undefined): string | null {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * T5.7 — what the pill says. One window when the board has one scope, and both
 * named when the chart under the band covers a different one; one key with
 * named parameters, never two labels joined (AC-713).
 */
export function periodPillLabel({
  period,
  chartPeriod,
  t,
  language,
}: {
  period: MetricPeriod | null
  chartPeriod: MetricPeriod | null
  t: Translate
  language: Language
}): string {
  const range = (window: MetricPeriod) =>
    t('overview.period', {
      from: formatDate(window.start, { style: 'day-month', language }),
      to: formatDate(window.end, { style: 'day-month', language }),
    })
  const leads = period ? range(period) : t('overview.period.none')
  const differs =
    chartPeriod !== null &&
    (period === null || chartPeriod.start !== period.start || chartPeriod.end !== period.end)
  if (!differs) return leads
  return t('overview.period.scope', { leads, chart: range(chartPeriod) })
}

export function BoardPeriodControl({
  period,
  onChange,
  chartPeriod = null,
  t,
  language,
}: {
  /**
   * The window the board is currently showing, or `null` for a board that has
   * not been asked for one.
   *
   * **`null` is a real state and not a missing prop.** Operations Overview is
   * the case: every one of its figures is point-in-time — *captains available
   * now*, *items sitting with no owner* — so the board declares no period, and
   * before this the band drew no control at all. That is backwards. A board
   * with no window of its own is precisely the board an operator is most likely
   * to want to put a window ON; what it must not do is print a range it never
   * filtered to, which is why the trigger reads `All time` rather than a
   * plausible-looking fortnight.
   */
  period: MetricPeriod | null
  /**
   * A new window, or `null` to go back to the board's own — which is not the
   * same as picking the preset that happens to match it. `null` means *stop
   * asking for a window*, and it is what `Reset` sends.
   */
  onChange: (next: MetricPeriod | null) => void
  /**
   * T5.7 — the window of the chart drawn under the band, when the board draws
   * one. Given and different from `period`, the pill names both scopes instead
   * of stating one window over a plot covering another.
   */
  chartPeriod?: MetricPeriod | null
  t: Translate
  language: Language
}) {
  const FromToArrow = forwardIcon(directionFor(language))
  const [open, setOpen] = useState(false)
  /* The calendar and the two fields need a concrete range even when the board
     has none. A fortnight ending today is the draft they open on — it is not
     applied, and nothing on the page claims it until `Apply` is pressed. */
  const [draft, setDraft] = useState<MetricPeriod>(
    () => period ?? periodOf('twoWeeks', EYVAR_TODAY),
  )

  /* The draft is a COPY and it resets whenever the live window changes,
     including from outside this popover. Without it, reopening the picker after
     a preset would show the range from before that preset. */
  useEffect(() => {
    if (period) setDraft(period)
  }, [period])

  const active = activeMetricPeriod(period, EYVAR_TODAY)
  /* On a board with no window every draft is a change, so `Apply` is live from
     the moment the popover opens — which is the correct affordance there. */
  const unchanged = period !== null && draft.start === period.start && draft.end === period.end

  /** Both `Apply` and the presets end here, and so does `Board default` with
      `null`. One place closes the popover, so it cannot be left open by a path
      that forgot. */
  function commit(next: MetricPeriod | null) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            /* The pill's own geometry, unchanged — see the note above. */
            'flex items-center gap-2 rounded-lg border border-hero-line bg-hero-2 px-3 py-2',
            'text-2xs tabular-nums text-hero-foreground transition-colors',
            'hover:bg-hero-line focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-hero-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-hero',
          )}
        >
          <CalendarIcon aria-hidden="true" className="size-3.5 text-hero-label" />
          {/* `<bdi>` isolates it: `11 – 25 Jun` is a numeral run whose leading
              digit the UBA otherwise moves to the far end of an Arabic line. */}
          <bdi>{periodPillLabel({ period, chartPeriod, t, language })}</bdi>
          <ChevronDownIcon aria-hidden="true" className="size-3.5 text-hero-label" />
          {/* The control's name, for a reader who arrives on it out of context.
              The visible label is a date range, which says WHAT is chosen and
              not what choosing it does. */}
          <span className="sr-only">{t('overview.period.label')}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <div
              className="flex min-w-40 flex-col gap-0.5"
              role="group"
              aria-label={t('overview.period.presets')}
            >
              {/* **`All time` is the first window, not a reset in the corner.**
                  It stood at the bottom-left as `Board default`, which put the
                  widest window an operator can ask for in a different place and
                  a different voice from the six beside it — and gave the
                  popover two controls that do the same thing. It is checked
                  when no window has been asked for, which is the state a board
                  loads in.

                  It sends `null`: *stop filtering*. On a board whose figures
                  declare a period the reader still sees that period on the pill
                  — because unfiltered is all the data there is, and the board
                  states the window its data covers. */}
              <Button
                variant="ghost"
                size="xs"
                className="justify-start gap-2 font-normal"
                onClick={() => commit(null)}
              >
                <CheckIcon
                  aria-hidden="true"
                  className={cn(
                    'size-4 text-muted-foreground',
                    period === null ? 'visible' : 'invisible',
                  )}
                />
                {t('overview.period.none')}
                {period === null && (
                  <span className="sr-only">{t('overview.period.active')}</span>
                )}
              </Button>

              {METRIC_PERIODS.map((id) => (
                <Button
                  key={id}
                  variant="ghost"
                  size="xs"
                  className="justify-start gap-2 font-normal"
                  onClick={() => commit(periodOf(id, EYVAR_TODAY))}
                >
                  {/* The check keeps its slot whether or not it is drawn, so
                      choosing a window does not shift the other five labels
                      sideways under the pointer. */}
                  <CheckIcon
                    aria-hidden="true"
                    className={cn(
                      'size-4 text-muted-foreground',
                      active === id ? 'visible' : 'invisible',
                    )}
                  />
                  {t(`overview.period.preset.${id}`)}
                  {active === id && <span className="sr-only">{t('overview.period.active')}</span>}
                </Button>
              ))}
            </div>

            <Separator orientation="vertical" className="h-auto" />

            <div className="flex flex-col gap-3">
              {/* Two editable fields joined by an arrow. `type="date"` so the
                  value is always a real day and the browser's own keyboard
                  entry works; the calendar below writes the same two values. */}
              <div className="flex items-end gap-2">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t('overview.period.from')}
                  <Input
                    type="date"
                    className="h-8 w-36 tabular-nums"
                    value={draft.start}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, start: event.target.value }))
                    }
                  />
                </label>
                {/* A reading-order mark between two fields whose order mirrors,
                    so it is PICKED BY `dir` (§9.5, O10) - unlike the calendar
                    glyph on the trigger, which is an object. */}
                <FromToArrow
                  aria-hidden="true"
                  className="mb-2 size-4 shrink-0 text-muted-foreground"
                />
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t('overview.period.to')}
                  <Input
                    type="date"
                    className="h-8 w-36 tabular-nums"
                    value={draft.end}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, end: event.target.value }))
                    }
                  />
                </label>
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
                  defaultMonth={toLocalDate(draft.start)}
                  selected={{ from: toLocalDate(draft.start), to: toLocalDate(draft.end) }}
                  onSelect={(range) =>
                    setDraft((current) => ({
                      start: toIsoDay(range?.from) ?? current.start,
                      /* A range mid-drag has a `from` and no `to`. Collapsing to
                         the start rather than writing `null` keeps the draft a
                         valid window at every click, which is what lets `Apply`
                         be enabled on a real change rather than a half-made
                         one. */
                      end: toIsoDay(range?.to) ?? toIsoDay(range?.from) ?? current.end,
                    }))
                  }
                />
              </Suspense>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="xs" onClick={() => setOpen(false)}>
              {t('overview.period.cancel')}
            </Button>
            <Button
              size="xs"
              disabled={unchanged || isInverted(draft)}
              title={isInverted(draft) ? t('overview.period.inverted') : undefined}
              onClick={() => commit(draft)}
            >
              {t('overview.period.apply')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
