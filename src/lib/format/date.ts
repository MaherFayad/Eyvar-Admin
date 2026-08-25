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
 * | `time` | `09:14` | the ledger's second line, live surfaces |
 * | `weekday-day-month-year` | `Thursday 25 Jun 2026` | dashboard subtitle (`:2169`) |
 */
export type DateStyle =
  | 'day-month'
  | 'day-month-time'
  | 'day-month-year'
  | 'time'
  | 'weekday-day-month-year'

export interface FormatDateOptions {
  style?: DateStyle
  language?: Language
  /** Override only for a genuinely non-Riyadh instant. Defaults to `Asia/Riyadh`. */
  timeZone?: string
}

const STYLE_OPTIONS: Readonly<Record<DateStyle, Intl.DateTimeFormatOptions>> = {
  'day-month': { day: 'numeric', month: 'short' },
  // Composed from the two below, not requested as one: asking `Intl` for date
  // and time together inserts a locale separator (`25 Jun, 09:14`), and §9.3's
  // decided-row timestamp is `19 Jul 09:14` with a plain space.
  'day-month-time': { day: 'numeric', month: 'short' },
  'day-month-year': { day: 'numeric', month: 'short', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit', hour12: false },
  'weekday-day-month-year': { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' },
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(style: DateStyle, language: Language, timeZone: string): Intl.DateTimeFormat {
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
  if (style === 'day-month-time') {
    return (
      `${formatter('day-month-time', language, timeZone).format(date)} ` +
      formatter('time', language, timeZone).format(date)
    )
  }
  return formatter(style, language, timeZone).format(date)
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
