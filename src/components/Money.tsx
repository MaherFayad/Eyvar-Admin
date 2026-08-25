/**
 * `Money` (V-02) — design spec §9.2, §8.3.1, **R4**, and 0.5's **U-4**.
 *
 * **This component exists for one reason: the bidi isolation.** `formatMoney`
 * (0.5) deliberately does NOT embed U+2068/U+2069 — that would poison
 * copy-paste, CSV export and every test assertion — so the isolation belongs in
 * the markup, and 0.5 handed it to 0.7 by name:
 *
 * > **U-4** — `1,234.00 SAR` is two LTR runs and does not reorder inside an RTL
 * > paragraph, so AC-73 holds for the string. **At a boundary with Arabic prose
 * > it can still shift.** The fix is `<bdi>` or `dir="ltr"` on the cell.
 *
 * `<bdi>` is the element the HTML spec created for exactly this: it isolates
 * its contents from the surrounding bidi context without asserting a direction
 * the content does not have. `dir="ltr"` would also work but over-claims —
 * a money value is neutral-then-LTR, not LTR — and it wins only on very old
 * engines. `<bdi>` it is, everywhere, including in Latin, so there is one code
 * path and the Arabic case cannot be the one nobody rendered.
 *
 * Rules applied
 *   §8.3.1      `<amount> SAR`: ISO code **trailing**, one space, never the ﷼
 *               glyph, never a leading symbol. Exactly 2 decimals, always. `,`
 *               thousands. Zero renders `0.00 SAR`.
 *   §8.3.1      **inside a table the unit appears ONCE, in the column header as
 *               `(SAR)`, and never repeats in cells** — that is `unit="none"`.
 *   §8.3.2      negative uses **U+2212**, never a hyphen, never parentheses,
 *               never colour alone, and **never inside a badge or pill**. The
 *               sign is typographic only: `formatMoney` cannot produce a
 *               coloured negative and this component does not add one.
 *   R4          `tabular-nums` on every value, and inline-END alignment in a
 *               table column. In Arabic the COLUMN mirrors and the NUMERAL RUN
 *               does not (**AC-73**).
 *   §8.3.1      `—` (U+2014) is reserved for not-applicable or unknown. A
 *               caller holding `null` renders `ABSENT`; it does not call
 *               `formatMoney` with a zero and pretend.
 *   §9.2        **the trap**: §4.2's currency-PREFIX rule governs INPUTS ONLY.
 *               A money *input* carries `SAR` as an in-field inline-start
 *               prefix; a money *output* carries it trailing. Two different
 *               rules, one field type. This is the OUTPUT.
 */

import { ABSENT, formatMoney, type FormatMoneyOptions } from '@/lib'
import type { Halalas } from '@/data/types'
import { cn } from '@/lib/utils'

export interface MoneyProps {
  /** Integer minor units. `null` renders `—`, which is not the same as zero. */
  amount: Halalas | null
  /** `'none'` inside a table whose header already carries `(SAR)` (§8.3.1). */
  unit?: FormatMoneyOptions['unit']
  className?: string
}

export function Money({ amount, unit = 'code', className }: MoneyProps) {
  /* §8.3.1 — `—` means not-applicable or unknown. `formatMoney` deliberately
     never returns it, so that `0.00 SAR` and "unknown" can never become the
     same call; the decision is made here, by the caller's data. */
  if (amount === null) {
    return (
      <span className={cn('tabular-nums text-foreground', className)} aria-label={ABSENT}>
        {ABSENT}
      </span>
    )
  }

  return (
    /* U-4. `<bdi>` isolates the value from the surrounding paragraph's
       direction, so `1,234.00 SAR` reads in the same character order in Arabic
       as in English (**AC-73**) even when it is embedded in Arabic prose. The
       STRING is unchanged — no isolation characters are in it — so copy-paste,
       CSV export and test assertions all still see exactly what
       `formatMoney` returned. */
    <bdi className={cn('tabular-nums text-foreground', className)}>
      {formatMoney(amount, { unit })}
    </bdi>
  )
}

/**
 * A money **table cell**. R4: numeric, currency and count columns use
 * `text-align: end` — **never** `text-align: right`, which in Arabic aligns on
 * the side the eye leaves. Eyvar inline-end-aligns every numeric column on
 * every screen; do not reproduce Shopify's customers-index exception (§3.1).
 *
 * The unit defaults to `none` here, because a table's header carries `(SAR)`.
 */
export function MoneyCell({ amount, unit = 'none', className }: MoneyProps) {
  return (
    <span className={cn('block text-end', className)}>
      <Money amount={amount} unit={unit} />
    </span>
  )
}
