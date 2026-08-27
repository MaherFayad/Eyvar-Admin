/**
 * The reporting-period control — spec §6.2's `periodStart` / `periodEnd`, and
 * what makes **AC-353** checkable rather than theoretical.
 *
 * Two labelled buttons and a stated window. Not a date picker: the period a
 * Finance lead reads Financials against is a **calendar month** in every
 * legacy screen and in every fixture, and a free date range would invite a
 * window that no close process recognises while **Q-F8** is open. When period
 * close lands, this control grows the vocabulary the close defines; until then
 * it moves one month at a time and states which month it is on.
 *
 * Rules applied
 *   §7.2       both controls are `<button>`s with the default focus ring. The
 *              labels are **words, not arrows**, so nothing here mirrors and
 *              nothing depends on a glyph resolving in two fonts.
 *   §8.3.1     the window is stated through one key with two named
 *              placeholders — never `{from} + ' – ' + {to}` (**AC-443**).
 *   R6         the label is a phrase and takes no period.
 */

import { Button } from '@/components/ui/button'
import type { FinancialsPeriod } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { periodLabel } from './FinancialsPage'

/**
 * Move a calendar month, staying on month boundaries.
 *
 * Built on `Date.UTC` with the **day** taken out of the arithmetic — `new
 * Date(y, m - 1, 31)` walks into the next month for every 30-day month, which
 * is how a period control ends up showing `1 Jul to 1 Jul`.
 */
export function shiftPeriodMonths(period: FinancialsPeriod, delta: number): FinancialsPeriod {
  const [year = 2026, month = 1] = period.start.split('-').map(Number)
  const anchor = new Date(Date.UTC(year, month - 1 + delta, 1))
  const y = anchor.getUTCFullYear()
  const m = anchor.getUTCMonth()
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(last)}` }
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="xs"
        onClick={() => onChange(shiftPeriodMonths(period, -1))}
      >
        {t('fin.overview.period.previous')}
      </Button>
      <span className="text-sm tabular-nums text-muted-foreground">
        <bdi>{periodLabel(period, t, language)}</bdi>
      </span>
      <Button variant="secondary" size="xs" onClick={() => onChange(shiftPeriodMonths(period, 1))}>
        {t('fin.overview.period.next')}
      </Button>
    </div>
  )
}
