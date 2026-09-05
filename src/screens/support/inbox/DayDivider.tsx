/**
 * The day divider (design 12 §4.2): `Today`, `Yesterday`, else the date with
 * the year only outside the current one. The hairline rules belong to this
 * shape alone, so a system line never reads as one (R5-11).
 */

import type { IsoDate, IsoDateTime } from '@/data/types'
import { calendarDay, formatDate, type Language, type Translate } from '@/lib'

const DAY_MS = 86_400_000

export function dayLabel(date: IsoDate, now: IsoDateTime, t: Translate, language: Language): string {
  const today = calendarDay(now)
  if (date === today) return t('inbox.thread.today')
  if (date === calendarDay(new Date(Date.parse(now) - DAY_MS))) return t('inbox.thread.yesterday')
  const sameYear = date.slice(0, 4) === today.slice(0, 4)
  return formatDate(date, { style: sameYear ? 'day-month' : 'day-month-year', language })
}

export function DayDivider({
  date,
  now,
  t,
  language,
}: {
  date: IsoDate
  now: IsoDateTime
  t: Translate
  language: Language
}) {
  return (
    <li className="flex items-center gap-3 py-2 text-xs font-semibold text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span>{dayLabel(date, now, t, language)}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </li>
  )
}
