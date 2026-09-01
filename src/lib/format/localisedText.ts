/**
 * Renders a `LocalisedText` — the server's *"key plus named params"* shape — into
 * one finished sentence.
 *
 * ## Why this exists
 *
 * `LocalisedText` (`data/types/common.ts`) was minted to kill the legacy
 * concatenation defect: `'Released ' + e.amount.toFixed(2) + ' SAR escrow to ' + dn`
 * is untranslatable by construction, because Arabic does not put the noun where
 * English does. Its contract has two halves:
 *
 *   1. *"The server sends a key and named params; the UI resolves both."*
 *   2. *"Money params stay integer halalas so `formatMoney` is still the only
 *      formatter."*
 *
 * Half 1 was built — `t()` resolves a key and interpolates named params. **Half 2
 * was never built.** `interpolate` ends in `String(value)`, so a param of
 * `netHalalas: 450000` renders as the literal `450000`. Every `LocalisedText` the
 * financial clients mint carries at least one such param, so the first screen to
 * render one would have printed raw halalas at an operator.
 *
 * That screen is Admin › Activity, which is why nothing caught it earlier: the
 * data layer has minted `AuditEntry.detail` since wave 3 and no UI had read it.
 *
 * ## The rule, and why it is a suffix
 *
 * **A param whose name ends in `Halalas` is money and is formatted with
 * `formatMoney` before interpolation.** Everything else is passed through.
 *
 * A naming convention is doing real work here, so it is worth defending. The
 * alternative is a per-key table of which params are money, which is a second
 * place for the truth to live and the exact duplication `LocalisedText` exists to
 * remove — the data layer already knows the unit, and it says so in the name it
 * chose. Every mint site in `clients/` already follows it (`payableHalalas`,
 * `cashDebtHalalas`, `netHalalas`, `remainingHalalas`, `amountHalalas`), and
 * `moneyParamsIn` below lets a test assert that it stays true rather than trusting
 * it.
 *
 * The suffix is checked case-sensitively and on the **param name**, never on the
 * value: a large integer is not evidence of money, and `reference: 450000` must
 * not become `SAR 4,500.00`.
 */

import { formatMoney, type FormatMoneyOptions } from './money'
import type { Translate } from '../i18n/translate'

/**
 * The shape `data/types/common.ts` defines. Redeclared structurally rather than
 * imported, so `src/lib` keeps its one-way dependency: the shared layer may not
 * reach into the data layer, and a formatter that did would invert the graph for
 * a two-field interface.
 */
export interface LocalisedTextLike {
  key: string
  params?: Record<string, string | number>
}

/** The suffix that marks a param as integer minor units. See the header. */
const MONEY_PARAM_SUFFIX = 'Halalas'

export function isMoneyParam(name: string): boolean {
  return name.endsWith(MONEY_PARAM_SUFFIX) && name.length > MONEY_PARAM_SUFFIX.length
}

/** Which of a `LocalisedText`'s params this module will format as money. For tests. */
export function moneyParamsIn(text: LocalisedTextLike): string[] {
  return Object.keys(text.params ?? {})
    .filter(isMoneyParam)
    .sort()
}

/**
 * `{ key: 'fin.audit.payoutPaid', params: { netHalalas: 450000, … } }` →
 * `Paid SAR 4,500.00 to the captain…`
 *
 * Throws the same way `t()` does on a missing key — **deliberately**. AC-74's
 * dev-time throw is the mechanism that finds a key the data layer mints and the
 * dictionary does not carry, and swallowing it here would hide exactly the class
 * of defect this function was written in response to.
 */
export function formatLocalisedText(
  text: LocalisedTextLike,
  t: Translate,
  options: FormatMoneyOptions = {},
): string {
  const params = text.params
  if (params === undefined) return t(text.key)

  const resolved: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(params)) {
    if (isMoneyParam(name)) {
      /* A money param that is not an integer is a data-layer defect, and
         `formatMoney` already refuses it with a message naming DESIGN.md §8.3.1.
         Let it throw rather than rendering something plausible. */
      resolved[name] = formatMoney(Number(value), options)
    } else {
      resolved[name] = value
    }
  }

  return t(text.key, resolved)
}
