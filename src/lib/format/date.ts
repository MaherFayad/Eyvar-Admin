/**
 * The **only** date formatter. DESIGN.md §9.2, design spec 00-shell §14, §18.
 *
 * The trap this exists to close, quoted from the design spec:
 *
 * > A bare `'ar-SA'` silently switches to the Hijri calendar and Arabic-Indic
 * > digits.
 *
 * Verified against this repo's Node build: `new Intl.DateTimeFormat('ar-SA')`
 * resolves `numberingSystem: 'arab'` and renders `٢٥ يونيو ٢٠٢٦`. The calendar
 * half is **ICU-version dependent** — some builds resolve `gregory` for `ar-SA`
 * and others `islamic-umalqura`, which is worse than either, because it means a
 * date can change meaning between an operator's browser and a QA laptop. Naming
 * both explicitly removes the engine from the question.
 *
 * So there is no locale parameter. A caller passes a `Language`; the locale
 * string comes from `localeFor`, which always carries `-u-ca-gregory-nu-latn`.
 * There is also no "browser default" time zone: the whole dataset is Riyadh, and
 * an instant that renders as a different calendar day on a laptop set to UTC is
 * the classic off-by-one nobody reproduces.
 *
 * The legacy app formats dates 11 different ways, all `toLocaleDateString('en-GB', …)`
 * with no calendar, no numbering system and no time zone
 * (`eyvar_ops_panel_v40_fixed.html:11235`, `:4728`, `:6627`, `:18755`), and stores
 * display strings like `'25 Jun 07:00'` (`:2676`) that cannot be sorted or
 * localised. Both defects stop here.
 */

import type { IsoDate, IsoDateTime } from '@/data/types/common'
import { invariant } from '../invariant'
import { type Language, localeFor } from '../i18n/direction'
import type { Translate } from '../i18n/translate'

/** Every seeded record is Riyadh local time. Saudi Arabia has observed no DST since 1990. */
export const RIYADH_TIME_ZONE = 'Asia/Riyadh'

/**
 * The closed set of date shapes the product uses. A screen that needs a twelfth
 * shape is a conversation with product-designer, not a new `options` object.
 *
 * | Style | English | Where |
 * |---|---|---|
 * | `day-month` | `25 Jun` | table cells, ledger date column (§8.3.3) |
 * | `day-month-time` | `25 Jun 09:14` | decided-row timestamps (§9.3), audit rows |
 * | `day-month-year` | `25 Jun 2026` | detail pages, expiry dates |
 * | `month-year` | `Mar 2026` | cohort row headers (Report Builder) |
 * | `time` | `09:14` | the ledger's second line, live surfaces |
 * | `weekday-day-month-year` | `Thursday 25 Jun 2026` | dashboard subtitle (`:2169`) |
 * | `relative` | `now` · `2m` · `4h` · `3d`, then `day-month` | inbox row age, thread header, presence roster (design 12 §3.1) |
 *
 * **`month-year` is a precision claim, not a shorter `day-month-year`.** A
 * monthly cohort is a whole month; rendering its header as `1 Mar 2026` states
 * a day the row does not have and invites an operator to read the first of the
 * month as the cohort's date. The day is dropped because it is not known, and
 * that is the same reason `formatDate` refuses to accept `null`.
 */
export type DateStyle =
  | 'day-month'
  | 'day-month-time'
  | 'day-month-year'
  | 'month-year'
  | 'time'
  | 'weekday-day-month-year'
  | 'relative'

/** The styles `Intl` renders directly; `relative` is arithmetic on top of `day-month`. */
type IntlDateStyle = Exclude<DateStyle, 'relative'>

export interface FormatDateOptions {
  style?: DateStyle
  language?: Language
  /** Override only for a genuinely non-Riyadh instant. Defaults to `Asia/Riyadh`. */
  timeZone?: string
  /** The reference instant for `relative`. Passed in, as `sla.ts` does; never `Date.now()`. */
  now?: IsoDateTime | Date
  /** The screen's translator, required by `relative`: its words are keys (AC-75). */
  t?: Translate
}

const STYLE_OPTIONS: Readonly<Record<IntlDateStyle, Intl.DateTimeFormatOptions>> = {
  'day-month': { day: 'numeric', month: 'short' },
  // Composed from the two below, not requested as one: asking `Intl` for date
  // and time together inserts a locale separator (`25 Jun, 09:14`), and §9.3's
  // decided-row timestamp is `19 Jul 09:14` with a plain space.
  'day-month-time': { day: 'numeric', month: 'short' },
  'day-month-year': { day: 'numeric', month: 'short', year: 'numeric' },
  'month-year': { month: 'short', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit', hour12: false },
  'weekday-day-month-year': { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' },
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(style: IntlDateStyle, language: Language, timeZone: string): Intl.DateTimeFormat {
  const cacheKey = `${style}|${language}|${timeZone}`
  let found = formatters.get(cacheKey)
  if (!found) {
    found = new Intl.DateTimeFormat(localeFor(language), {
      // Belt and braces: the locale string already says `-u-ca-gregory-nu-latn`,
      // and these say it again where a reader can see it. Both are required by
      // design spec §18 — "an explicit calendar and numbering system".
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone,
      ...STYLE_OPTIONS[style],
    })
    formatters.set(cacheKey, found)
  }
  return found
}

/**
 * Accepts an ISO instant (`2026-06-25T09:14:00+03:00`), an ISO calendar date
 * (`2026-06-25`), or a `Date`.
 *
 * A bare calendar date is **midnight in Riyadh**, not midnight UTC — the same
 * normalisation `src/data/mock/clock.ts` applies, so a document expiry does not
 * shift a day between the data layer and the screen.
 *
 * `null` is not accepted. An absent date renders `ABSENT` (`—`) at the call
 * site; a formatter that can return "no value" makes absent and midnight the
 * same call.
 */
export function formatDate(value: IsoDateTime | IsoDate | Date, options: FormatDateOptions = {}): string {
  const { style = 'day-month', language = 'en', timeZone = RIYADH_TIME_ZONE } = options
  const date = toDate(value)
  if (style === 'relative') return formatRelative(date, options)
  if (style === 'day-month-time') {
    return (
      `${formatter('day-month-time', language, timeZone).format(date)} ` +
      formatter('time', language, timeZone).format(date)
    )
  }
  return formatter(style, language, timeZone).format(date)
}

/**
 * The relative-age keys, merged into `EN` by `src/i18n/dictionaries.ts` exactly
 * as `SLA_MESSAGES_EN` is; the Arabic side is `src/i18n/ar/date.ts`. The unit
 * letter stays inside the key so no screen concatenates it (AC-75).
 */
export const DATE_MESSAGES_EN = Object.freeze({
  'date.age.now': 'now',
  'date.age.minutes': '{count}m',
  'date.age.hours': '{count}h',
  'date.age.days': '{count}d',
})

export type DateMessageKey = keyof typeof DATE_MESSAGES_EN

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 3_600_000
const MS_PER_DAY = 86_400_000
/** From the seventh day the age is a date: `25 Jun` (design 12 §3.1). */
const RELATIVE_AGE_MAX_DAYS = 7

/**
 * An age, floored: `1m 59s` reads `1m`, unlike the countdown in `formatDuration`
 * which ceils. A future instant (clock skew) reads `now`, never a negative.
 * Legacy `fmtAge` (`eyvar_ops_panel_v40_fixed.html:14630`) rounded and had no
 * `now` or day tier; neither is carried across.
 */
function formatRelative(date: Date, options: FormatDateOptions): string {
  const { now, t, language = 'en', timeZone = RIYADH_TIME_ZONE } = options
  invariant(now !== undefined, "formatDate style 'relative' needs a `now` instant; pass the clock, never Date.now().")
  invariant(t !== undefined, "formatDate style 'relative' needs the screen's translator for its unit keys.")
  const age = Math.max(0, toDate(now).getTime() - date.getTime())
  if (age < MS_PER_MINUTE) return t('date.age.now')
  if (age < MS_PER_HOUR) return t('date.age.minutes', { count: Math.floor(age / MS_PER_MINUTE) })
  if (age < MS_PER_DAY) return t('date.age.hours', { count: Math.floor(age / MS_PER_HOUR) })
  if (age < RELATIVE_AGE_MAX_DAYS * MS_PER_DAY) {
    return t('date.age.days', { count: Math.floor(age / MS_PER_DAY) })
  }
  return formatter('day-month', language, timeZone).format(date)
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>()

/**
 * The calendar day an instant falls on in `timeZone` (Riyadh by default), as an
 * `IsoDate`. Two instants share a day divider exactly when this agrees, so the
 * thread's `Today` and the fixture clock's `EYVAR_TODAY` compare by string.
 */
export function calendarDay(value: IsoDateTime | IsoDate | Date, timeZone: string = RIYADH_TIME_ZONE): IsoDate {
  let found = dayFormatters.get(timeZone)
  if (!found) {
    found = new Intl.DateTimeFormat('en-u-ca-gregory-nu-latn', {
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    dayFormatters.set(timeZone, found)
  }
  const parts = found.formatToParts(toDate(value))
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{1,9})?(Z|[+-]\d{2}:?\d{2})$/

/**
 * Shared parse. Throws on garbage rather than rendering `Invalid Date`.
 *
 * The shape is checked with a pattern **before** `Date.parse`, because V8's
 * parser is lenient enough to accept the legacy app's stored display strings —
 * `Date.parse('25 Jun 07:00')` (`eyvar_ops_panel_v40_fixed.html:2676`) succeeds
 * and silently assumes the *current* year. A stored display string reaching a
 * formatter is the bug; parsing it into a plausible wrong date hides it.
 *
 * An offset is required, matching `src/data/types/common.ts`'s `IsoDateTime`.
 * A bare `2026-06-25T09:14:00` means a different instant on every host.
 */
export function toDate(value: IsoDateTime | IsoDate | Date): Date {
  if (value instanceof Date) {
    invariant(!Number.isNaN(value.getTime()), 'formatDate was given an Invalid Date.')
    return value
  }

  invariant(
    ISO_DATE.test(value) || ISO_DATE_TIME.test(value),
    `Not an ISO date or date-time with an offset: ${JSON.stringify(value)}`,
  )

  // A date-only string is midnight **in Riyadh**, the same normalisation
  // `src/data/mock/clock.ts` applies, so an expiry does not shift a day.
  const iso = ISO_DATE.test(value) ? `${value}T00:00:00+03:00` : value
  const ms = Date.parse(iso)
  invariant(!Number.isNaN(ms), `Not a valid instant: ${JSON.stringify(value)}`)
  return new Date(ms)
}
