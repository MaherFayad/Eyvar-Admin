/**
 * **Churn risk `high` is RED — the owner's fifth use of red, scoped here so it
 * stays the fifth and does not become "some red is now allowed".**
 *
 * R5a enumerates four permitted uses of red — a destructive button, a
 * page-level critical banner, a breached-row marker, a map marker — and this
 * file's own earlier note refused a fifth on those grounds, as did
 * `RiderRail`'s header, `RiderProfilePage`'s (`R5a/X-1`) and the design spec
 * (§6.3, X-1). **That refusal is overturned by the owner, who is the authority
 * on R5a and has written the fifth use.** It is recorded here rather than in
 * four places, because a rule that lives in four comments is a rule with four
 * answers.
 *
 * ## What the ruling does NOT do, which is most of it
 *
 * | | |
 * |---|---|
 * | **Only `high`** | `medium` and `low` keep the neutral ink they have always had. A red that appears at every level signals nothing, and a three-level scale where every level is the alarm colour is not a scale. `CHURN_EMPHASISED` is the whole of the scope and there is exactly one of it. |
 * | **Still not a badge** | §12.1 — churn risk is a *prediction* and the badge family communicates *status*; a prediction wearing status chrome claims a certainty the value does not have. No pill, no fill, no border. The ruling was about colour and was never about chrome. |
 * | **Still not interactive** | no focus ring, no handler, no `role`. It is a word in a paragraph. |
 * | **The reason line is still mandatory** | §8.2. `Lapsed with nothing used` comes from `Rider.churnReason`, a server-minted `LocalisedText`, and the colour does not replace it. §7.5 — colour is never the only carrier — is not suspended: the level is a WORD (`High`), the basis is a SENTENCE, and the hue is the third carrier rather than the first. |
 *
 * ## The colour is `text-churn-high-foreground`, and the long name is the guard
 *
 * The token steward's, measured and recorded by them: **6.172** in light and
 * **7.653** in dark, both on `bg-muted`, both clearing AA — which is the bar
 * this has to clear, because the word is the VALUE and not decoration. No
 * `dark:` utility is needed or wanted: `.dark` redeclares the underlying red
 * and the slot resolves at use time.
 *
 * **The name is not shortened here and no alias is asked for.** Tailwind v4
 * generates `bg-`, `border-`, `ring-` and `fill-` from one `--color-*`, so an
 * ink cannot be published without its plate; the name is the only thing that
 * can hold the door. `bg-churn-high-foreground` reads as nonsense in a diff and
 * greps as one literal, where `bg-churn-high` would have read legitimate and
 * let the badge back in — through exactly the door §12.1 is holding shut.
 *
 * Nothing here reaches for `--ev-red` directly. That value is declared for *"the
 * one permitted use and the measurements"* — a destructive button FILL and the
 * 3px breached-row marker — and has never been measured as ink for a 20px word
 * on `--ev-bg2`. This slot has.
 */

import type { ChurnRisk } from '@/data/types'

/**
 * The one level the ruling reaches. A constant rather than an inline `'high'`
 * so that widening it is a visible edit to a named thing, and so the test that
 * pins the scope compares against the same symbol the components use.
 */
export const CHURN_EMPHASISED: ChurnRisk = 'high'

/** `medium` and `low`. Unchanged by the ruling, permanently. */
const CHURN_INK = 'text-foreground'

/** `high`, and nothing else in the product, takes this slot. See the header. */
const CHURN_INK_EMPHASISED = 'text-churn-high-foreground'

/** Is this the level the owner's ruling colours? */
export function isChurnEmphasised(level: ChurnRisk): boolean {
  return level === CHURN_EMPHASISED
}

/**
 * The ink for the LEVEL WORD alone — never for the reason line beneath it,
 * which is §8.2's sentence and stays `--ev-text-2` at every level.
 */
export function churnLevelInk(level: ChurnRisk): string {
  return isChurnEmphasised(level) ? CHURN_INK_EMPHASISED : CHURN_INK
}
