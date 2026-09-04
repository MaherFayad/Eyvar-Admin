/**
 * The reporting-period control — spec §6.2's `periodStart` / `periodEnd`, and
 * what makes **AC-353** checkable rather than theoretical.
 *
 * ## What this used to be, and why it changed
 *
 * Two buttons and a sentence: `Previous month · Period 1 Jun to 30 Jun · Next
 * month`. The note that shipped with it argued the case for exactly that, and
 * the argument stays on the record because half of it is still right:
 *
 * > *"Not a date picker: the period a Finance lead reads Financials against is
 * > a **calendar month** in every legacy screen and in every fixture, and a
 * > free date range would invite a window that no close process recognises
 * > while **Q-F8** is open."*
 *
 * **The owner overruled it** — *"this calender of next month… is so bad have a
 * proper date picker"* — and on the evidence the ruling was over-fitted. Three
 * things were wrong with it:
 *
 *   1. **It was not a period control, it was a stepper.** Reaching March from
 *      June cost three clicks and three full re-reads of every figure on the
 *      page, because `usePeriod` puts the window in the URL and every read
 *      depends on it (AC-353). Reaching March *last year* cost fifteen.
 *   2. **It could not state the year.** `Period 1 Jun to 30 Jun` is the label
 *      in June 2026 and in June 2025 alike. A stepper with no absolute
 *      destination and no year is a control an operator can get lost in, and
 *      the only way out was to count clicks back.
 *   3. **"No close process recognises it" argues for PRESETS, not against a
 *      picker.** That is the shape this now has: the five windows a close
 *      process does recognise are one click, on month boundaries, computed in
 *      `periodPresets.ts`; anything else takes the calendar and two clicks. The
 *      constraint is expressed as a default rather than as an absence, which is
 *      the form that does not also block the Finance lead reconciling a single
 *      week against a bank statement.
 *
 * **What is NOT overturned:** the periods this control defaults to are still
 * calendar months, `shiftPeriodMonths` is unchanged and still exported, and
 * **Q-F8 is still open** — `quarterToDate` is named for the calendar quarter it
 * computes rather than for a fiscal one nobody has defined yet.
 *
 * ## The anatomy is §10.2's, not a new one
 *
 * §10.2 already specifies this control and it had simply never been built here:
 * *"a preset column with a check on the active preset; two editable date fields
 * joined by an arrow; two side-by-side months; `Cancel` / `Apply`, with `Apply`
 * DISABLED UNTIL THE RANGE CHANGES. This is the one popover that carries
 * Apply/Cancel (§5.4)."* `ColumnFilterControl`'s `date-range` filter is the same
 * ruling rendered for a table column; this is it rendered for the page period,
 * down to the lazy `Calendar` and the `Suspense` footprint.
 *
 * Rules applied
 *   §10.2      the range popover's anatomy, above. `Apply` is disabled while
 *              the draft equals the live period AND while the range is
 *              inverted — a half-chosen window is not a period.
 *   §14        the calendar is `ui/calendar`, which pins
 *              `ar-SA-u-ca-gregory-nu-latn`. A bare `ar-SA` silently switches
 *              to the Hijri calendar, which would put a Finance lead's close on
 *              a different month.
 *   §7.2       every control is a real `<button>` with the default focus ring.
 *   §8.3.1     the window is stated through one key with two named
 *              placeholders — never a concatenation (**AC-443**).
 *   §9.5       the stepper's chevrons are DIRECTION and mirror under `dir`;
 *              their accessible names are the same two translated strings the
 *              word-labelled buttons carried, so the change costs a screen
 *              reader nothing.
 *   R6         the label is a phrase and takes no period.
 */

import { Suspense, lazy, useEffect, useState } from 'react'
import { CalendarIcon, CheckIcon } from 'lucide-react'
import { nextIcon, previousIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { EYVAR_TODAY } from '@/data/mock/clock'
import type { FinancialsPeriod } from '@/data/types'
import { directionFor, formatDate, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'
import { PERIOD_PRESETS, activePreset, isInverted, shiftPeriodMonths } from './periodPresets'

export { shiftPeriodMonths } from './periodPresets'

/* `react-day-picker` + `date-fns` is 20.5 KB gzip. `ColumnFilterControl` pays
   for it lazily for exactly this reason and this control does the same, so a
   Finance lead who never opens the picker never downloads a calendar. */
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
 * `1 Jun to 30 Jun 2026` — the range without the leading `Period`, for a control
 * whose own glyph already says what it is. One key, two named placeholders
 * (AC-443).
 *
 * **The end carries the year and the start does not.** Stating it twice is
 * noise on the overwhelmingly common single-month window; stating it nowhere
 * was defect 2 above. On a range that spans a year boundary the start's year is
 * recoverable from the calendar, and the label's job is to say which window is
 * live rather than to be a full citation.
 */
function rangeLabel(period: FinancialsPeriod, t: Translate, language: Language): string {
  return t('fin.overview.period', {
    from: formatDate(`${period.start}T00:00:00+03:00`, { style: 'day-month', language }),
    to: formatDate(`${period.end}T00:00:00+03:00`, { style: 'day-month-year', language }),
  })
}

export function PeriodControl({
  period,
  onChange,
  t,
  language,
}: {
  period: FinancialsPeriod
  onChange: (next: FinancialsPeriod) => void
  t: Translate
  language: Language
}) {
  const dir = directionFor(language)
  const PreviousChevron = previousIcon(dir)
  const NextChevron = nextIcon(dir)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FinancialsPeriod>(period)

  /* The draft is a COPY, and it resets whenever the live period changes —
     including when a preset or a stepper changes it from outside this popover.
     Without this, opening the picker after two clicks of the forward stepper
     would show the window from before those clicks. */
  useEffect(() => setDraft(period), [period])

  const active = activePreset(period, EYVAR_TODAY)
  const unchanged = draft.start === period.start && draft.end === period.end

  function commit(next: FinancialsPeriod) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* §9.5/O10 - a MIRRORING pair, PICKED BY `dir`. The chevron encodes
          "one month back / one month forward" against the reading direction,
          so unlike the delta caret it turns around in Arabic. */}
      <Button
        variant="secondary"
        size="icon-xs"
        aria-label={t('fin.overview.period.previous')}
        onClick={() => onChange(shiftPeriodMonths(period, -1))}
      >
        <PreviousChevron className="size-4" aria-hidden="true" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="xs" className="gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            {/* `<bdi>` — the range is a Latin numeral run inside what may be an
                Arabic control, and it reorders without the isolate. */}
            <bdi className="tabular-nums">{rangeLabel(period, t, language)}</bdi>
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-auto p-3">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              {/* §10.2's preset column, with the check on the active one. */}
              <div
                className="flex min-w-44 flex-col gap-0.5"
                role="group"
                aria-label={t('fin.period.presets')}
              >
                {PERIOD_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="ghost"
                    size="xs"
                    className="justify-start gap-2 font-normal"
                    onClick={() => commit(preset.of(EYVAR_TODAY))}
                  >
                    {/* The check keeps its slot whether or not it is drawn, so
                        choosing a preset does not shift the other four labels
                        sideways under the pointer. */}
                    <CheckIcon
                      aria-hidden="true"
                      className={cn(
                        'size-4 text-muted-foreground',
                        active === preset.id ? 'visible' : 'invisible',
                      )}
                    />
                    {t(`fin.period.preset.${preset.id}`)}
                    {active === preset.id && (
                      <span className="sr-only">{t('fin.period.active')}</span>
                    )}
                  </Button>
                ))}
              </div>

              <Separator orientation="vertical" className="h-auto" />

              <div className="flex flex-col gap-3">
                {/* §10.2's two editable fields joined by an arrow.
                    `type="date"` so the value is always a real day and the
                    browser's own keyboard entry works; the calendar below
                    writes the same two values. */}
                <div className="flex items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t('fin.period.from')}
                    <Input
                      type="date"
                      className="h-8 w-36 tabular-nums"
                      value={draft.start}
                      onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
                    />
                  </label>
                  <span aria-hidden="true" className="pb-2 text-muted-foreground">
                    &rarr;
                  </span>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t('fin.period.to')}
                    <Input
                      type="date"
                      className="h-8 w-36 tabular-nums"
                      value={draft.end}
                      onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
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
                      setDraft((d) => ({
                        start: toIsoDay(range?.from) ?? d.start,
                        /* A range mid-drag has a `from` and no `to`. Collapsing
                           to the start rather than writing `null` keeps the
                           draft a valid period at every keystroke, which is
                           what lets `Apply` be enabled on a real change rather
                           than on a half-made one. */
                        end: toIsoDay(range?.to) ?? toIsoDay(range?.from) ?? d.end,
                      }))
                    }
                  />
                </Suspense>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setDraft(period)
                  setOpen(false)
                }}
              >
                {t('fin.period.cancel')}
              </Button>
              <Button
                size="xs"
                /* §10.2 — disabled until the range CHANGES, and also while it
                   is inverted. Both are the same rule from two sides: a period
                   that is not a period yet must not become the page's window,
                   because every figure on the page re-reads against it. */
                disabled={unchanged || isInverted(draft)}
                onClick={() => commit(draft)}
              >
                {t('fin.period.apply')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="secondary"
        size="icon-xs"
        aria-label={t('fin.overview.period.next')}
        onClick={() => onChange(shiftPeriodMonths(period, 1))}
      >
        <NextChevron className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
