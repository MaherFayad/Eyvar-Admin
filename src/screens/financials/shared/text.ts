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
import { formatMoney, type Translate } from '@/lib'

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
