/**
 * `LocalisedText` → a finished string, with money rendered by the one money
 * formatter — **AC-340**, **AC-443**.
 *
 * The data layer emits keyed text with **integer halalas** in its parameters:
 * `fin.refused.unbalanced` carries `{debitsHalalas, creditsHalalas}` and
 * `fin.authority.abovePerCase` carries `{capHalalas}`. Interpolating those raw
 * puts `90000` in front of a Finance lead.
 *
 * Two rules meet here and neither bends:
 *
 *   **AC-443** — a dynamic value sits in a named placeholder inside ONE key.
 *   So the sentence is not assembled; only the *parameter* is formatted.
 *   **AC-340** — every money string comes from the shared formatter. So the
 *   formatting cannot happen in the dictionary, which has no formatter.
 *
 * The convention is the parameter's own name: a parameter whose name ends in
 * `Halalas` is money and is formatted; everything else passes through. That is
 * the data layer's naming convention already (`amountHalalas`,
 * `balanceAfterHalalas`, `capHalalas`), so nothing here is a new rule to
 * remember — it is the existing one, read.
 */

import type { LocalisedText } from '@/data/types'
import { formatCount, formatMoney, type Language, type Translate } from '@/lib'

const MONEY_SUFFIX = 'Halalas'

/**
 * @param text the keyed text as the client emitted it
 *
 * A parameter named `…Halalas` holding an integer is rendered `12.34 SAR`.
 * A non-integer is left alone rather than thrown on: this runs on server data
 * inside a table cell, and a malformed parameter should render oddly, not take
 * the page down.
 */
export function localisedText(t: Translate, text: LocalisedText): string {
  const params = text.params
  if (!params) return t(text.key)

  const rendered: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(params)) {
    rendered[name] =
      name.endsWith(MONEY_SUFFIX) && typeof value === 'number' && Number.isInteger(value)
        ? formatMoney(value)
        : value
  }
  return t(text.key, rendered)
}

/**
 * **The bulk bar's refusal, as one finished sentence** — P4-T1, **D21**.
 *
 * `bulkRefusal` (`derive.ts`) decides *whether* and *which cause*, staying pure
 * and holding no `t`. This picks which of D21's **three** sentences that cause
 * takes, and it is the only place the count is formatted — so a refusal on a
 * money surface groups its digits the way every other number on the page does
 * (D21 rendering rule 4: `formatCount`, never `String(n)`).
 *
 * | Case | Suffix | Why it is its own sentence |
 * |---|---|---|
 * | one record selected, refused | `.one` | there is no subset to talk about |
 * | some of the selection refused | `.other` | the escape hatch is offered |
 * | **every** selected record refused | `.all` | **no** escape hatch (AC-960) |
 *
 * D21 states the third one's reason: *"`.other` is wrong when every target is
 * blocked"* — `4 of the selected payouts cannot be paid` is true of 4-of-4 and
 * invites the operator to believe a subset would work.
 *
 * `.one` wins over `.all` at a selection of one, which is the order D21's own
 * table gives: a single refused record is *"this payout"*, not *"all 1"*.
 *
 * @param keyFor the **base** key per cause; the case suffix is appended here so
 *   a call site cannot ship two of the three and discover the missing one from
 *   a `createTranslator` throw in production.
 */
export function bulkRefusalText<K extends string>(
  t: Translate,
  language: Language,
  refusal: { key: K; blocked: number; total: number } | null,
  keyFor: Readonly<Record<K, string>>,
): string | null {
  if (refusal === null) return null
  const form = refusal.total === 1 ? 'one' : refusal.blocked === refusal.total ? 'all' : 'other'
  /* **D21 rendering rule 4** — the count is `blocked.length`, the whole refused
     subset, and it is formatted rather than stringified. It has to be the whole
     subset for the sentence to agree with the escape hatch beside it:
     `blocked + eligible === total`. `.one` carries no placeholder and ignores
     the parameter. */
  return t(`${keyFor[refusal.key]}.${form}`, { count: formatCount(refusal.blocked, language) })
}
