/**
 * The metric tile — `DESIGN.md` §3.7, geometry from
 * `design/03-navattic-language.md` §4.9, which is the treatment in the drawer
 * of reference frame `79a31934`: a 3-up stat row of glyph, value, label, chip.
 *
 * ```
 *  ┌──────────────────────────────┐   white, 1px --ev-hairline, r8, no shadow
 *  │ ⛁                            │   16px icon, --ev-text-2, ABOVE the value
 *  │ 47                           │   22px/600 --ev-ink  (--text-kpi, H4)
 *  │ Active subscriptions         │   12px --ev-text-2, BELOW the value
 *  │ Excludes pending applicants. │   12px --ev-text-2, R4-4 §4.2's caption
 *  │ ↑ +8.1%  vs 1–25 May         │   neutral chip + grey trailing phrase
 *  └──────────────────────────────┘
 * ```
 *
 * Rules applied
 *   R4-4 §4.2   the **caption** is the third text line and states what a reader
 *               must know to read the number correctly and nothing else: a
 *               scope limit, a denominator, or the direction that counts as
 *               good where the label does not make it obvious. Never a value,
 *               never a status, never the delta, never an action, never a
 *               link. One line, **≤38 characters** (R5-4 §4.1 — the 60 was
 *               measured wrong against a box a caption never gets), truncates,
 *               never wraps.
 *   R5-1 §1.3   **a tile whose `value` is absent states why, in the line where
 *               its delta would be.** No new line, no new geometry, no change
 *               to §4.9's tile order. Two consequences that were stated so they
 *               would not be discovered: the **caption does not render** while
 *               the value is absent (a denominator with no numerator is noise,
 *               and a tile carries one explanation, not two), and
 *               `comparison.reason` is not shown on such a tile either — it is
 *               the right thing to say when a value exists and a comparison
 *               does not, and this tile has no value.
 *
 *               R5-1 §1.4 is the reason this is NOT a caption kind: the caption
 *               qualifies a number that exists and sits above the delta line,
 *               so a slot that sometimes qualifies a number and sometimes
 *               explains that there is no number has to be READ to find out
 *               which. §4.2 gains no absence kind.
 *
 *               A measure with no store at all does not render as a tile at
 *               all (R4-11 §11.2) — not an em dash, not a skeleton. That is
 *               the fixture's decision and it never reaches this file.
 *   AC-605      a comparison of kind `target` with no statable percentage
 *               renders the em dash **plus its target**, not the no-history
 *               sentence. AC-605 governs `none` and this is not `none`. See
 *               `ComparisonLine` for the defect this closes.
 *
 *               **R5-2 rewrote it and added the half that was missing: the
 *               absence is announced to a screen reader, not only drawn**
 *               (V-8). The `none` branch already satisfied that — its reason is
 *               visible text. The `target` branch hid its em dash with nothing
 *               replacing it, so it takes a companion phrase for a reader.
 *   §4.9 / H4   icon above, value **22px/600 (`--text-kpi`)**, label 12px
 *               below, delta in a chip.
 *
 *               **This is the amendment `design/15-hierarchy-and-scannability.md`
 *               §H4 asks for, and §4.9's original derivation is left in place
 *               above rather than deleted.** §4.9 solved 13-17 and chose 17 so
 *               the value out-weighs its label — faithful to a reference whose
 *               stat strip is a supporting element beside a chart. Eyvar's
 *               metric boards answer a different question: the number IS the
 *               page. `globals.css` carries the arithmetic on Inter's cap
 *               height (1490/2048 = 0.7275em) — at 17px the figure is 12.37px
 *               against an 11px label, **1.12 : 1**, which is a rounding error
 *               the operator reads as two lines of similar text; at 22px it is
 *               16.01px, **1.46 : 1**, which is a hierarchy. 22 is also the
 *               ceiling: no step above it exists and H2 forbids adding one.
 *
 *               **`--text-kpi` is its own name and not `text-xl`** even though
 *               the two are equal today. `--text-xl` is THE PAGE TITLE, one per
 *               screen; a 4-up tile row sharing it would put four glyphs at
 *               page-title rank on one screen, and any later move of the page
 *               title would silently drag every KPI in the product with it.
 *   §4.9 / V6   **the delta chip is NEUTRAL and never takes the success or
 *               critical tone.** A number going up is not, by itself, good
 *               news; R7's tones carry status and a delta is a quantity. The
 *               reference renders `0%` neutral beside every metric.
 *
 *               **STILL TRUE, AND STILL HONOURED — the chip below is
 *               `tone="neutral"`.** R7's five tones are untouched and R5a's
 *               "there is no red badge" holds.
 *
 *               **AMENDED 2026-09-02, on the half §4.9 did not decide.** The
 *               rule forbids toning THE CHIP. It was read as forbidding valence
 *               anywhere, and the consequence was measured: `higherIsBetter` is
 *               carried on every metric and reached a sighted operator not at
 *               all, so an eight-tile risk board said nothing about which of
 *               its numbers were bad news — while a screen-reader user was told
 *               outright. The paragraph below already recorded the complaint in
 *               those terms.
 *
 *               **The valence WORD is gone, and this paragraph used to say
 *               it was here.** It read *"the valence is now a WORD beside the
 *               chip … the word is the carrier, the colour is the
 *               redundancy"*. That was true when it was written and stopped
 *               being true at `:722` below, where the owner's later ruling
 *               removed the chip and the word together — and this paragraph
 *               was never amended, so the file argued for a carrier it no
 *               longer draws.
 *
 *               **What ships, measured on `/management/risk` in Chromium
 *               rather than read off this file:** the caret (`aria-hidden`),
 *               the signed numeral in a `<bdi>`, an `sr-only` clause reading
 *               *"up, which is worse"* / *"down, which is better"* on every one
 *               of the twelve deltas on that board, and the run tinted by
 *               `metricValence`. No ancestor carries an `aria-label`, so the
 *               clause is in the computed accessible name and not merely in
 *               the DOM.
 *
 *               **So the verdict does reach a non-sighted reader, and for a
 *               sighted one hue is the only carrier of valence.** Rendered in
 *               greyscale, `↓ −50%` (better) and `↑ +14.4%` (worse) are
 *               typographically identical; `Chapter`'s *"2 of 5 moved the
 *               wrong way"* is the only non-colour carrier on the board and it
 *               names no tile. That is a consequence of the owner's ruling
 *               which nothing in the tree had recorded. It is recorded here,
 *               it is named in the handoff, and it is deliberately **not**
 *               patched here: restoring a visible word would reverse a ruling
 *               this file does not own. `overview.valence.better` / `.worse`
 *               are still in both dictionaries, unread, ready for whichever
 *               way it is decided.
 *
 *               Nothing new is introduced by any of this — no tone, no badge,
 *               no colour value.
 *
 *               **This settles §3.7's "deltas MUST be colour-coded" and the
 *               data layer's expectation** (`Metric.higherIsBetter` says its
 *               purpose is to drive exactly this) without reversing D7: D7 is
 *               later and narrower and still wins on the chip, which is the
 *               thing it actually named. Raised in the wave-4 handoff; this is
 *               the resolution, and `metricValence` is where it is decided.
 *   §3.7        every metric with a comparison shows a delta; where none is
 *               possible the delta is an **em dash**, never `0%` and never
 *               blank. `deltaPercent === null` iff `comparison.kind === 'none'`
 *               — the client asserts the biconditional, so branching on either
 *               gives the same answer and this file branches on the union.
 *   §3.7 / §7.5 a delta carries a **direction caret** as well as a number. The
 *               caret encodes DIRECTION and its colour encodes VALENCE, and the
 *               two are not the same fact — a metric can fall and be better.
 *
 *               **DIRECTION is never colour-only**: the caret is a shape and
 *               the sign is in the text. **VALENCE is colour-only for a
 *               sighted reader on a tile**, and is carried in words for
 *               everyone else by the `sr-only` clause `MetricDelta` renders.
 *               This line used to claim *"neither is colour-only … the valence
 *               word is beside the chip"*; there is no valence word. The §4.9
 *               note above has the measurement and says who owns the decision.
 *   §3.7 / D-08 / **AC-16** — the tile deep-links to the surface that owns the
 *               number, from `Metric.drilldownRoute`. The legacy exec tiles are
 *               not clickable at all.
 *   §7.2 / §7.4 a linked tile **was** an `<a>` wrapping the card, not a `<div>`
 *               with a stretched pseudo-element: the focusable element and the
 *               visible box were then the same object, the ring needed no
 *               `focus-within` proxy, and there was no stretched-pseudo-element
 *               arbitrary value in the tree. A tile with no destination is a
 *               plain card and is not in the tab order — a focus stop that
 *               does nothing is worse than no focus stop.
 *
 *               **AMENDED for §E4, and the wrapping anchor is gone.** A lead
 *               figure now chooses which chart the band draws, and a control
 *               cannot be both a link and a radio. The destination moved to a
 *               named trailing action (`OpenAnalysis`, below), which is the
 *               reference's own shape and is the SAME action on both surfaces
 *               so an operator learns one. Everything §7.4 was protecting
 *               survives: the focusable thing is still a real `<a>`, it still
 *               has a visible ring, it still has an accessible name, and a
 *               figure with no destination still contributes no focus stop.
 *
 *               **The sentence above used to NAME that arbitrary value, in
 *               backticks, and Tailwind emitted a rule for it.** v4 scans
 *               comments and tests as plain text, so a class written to say
 *               *"we do not use this"* shipped in `dist/assets/*.css` — found
 *               by grepping the built stylesheet, which is the only place it
 *               was ever visible. Do not write a class name in prose here.
 *   fact 2      `asOf` renders only when this metric is STALER than the
 *               board's own line. Six timestamps per page is noise; the one
 *               that disagrees with the page is signal.
 */

import type { ReactNode } from 'react'
import { DeltaDownIcon, DeltaUpIcon } from '@/components/icons'
import { forwardIcon } from '@/components/icons'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  directionFor,
  formatDate,
  invariant,
  isolatedRunProps,
  type Language,
  type Translate,
} from '@/lib'
import type { Metric, MetricComparison } from '@/data/types'
import {
  formatMetricValue,
  formatSignedPercent,
  formatSignedPoints,
  metricValence,
  splitMetricValue,
} from './formatMetric'


export interface MetricTileProps {
  metric: Metric
  /** The board's own freshness line. A metric older than this says so. */
  boardAsOf: string
  t: Translate
  language: Language
  /**
   * Which ground this figure is painted on. Defaults to `page`, so the ~forty
   * call sites that predate the band keep the surface they already had and a
   * caller on the band is the one that has to say so.
   */
  surface?: MetricSurface
  /**
   * **§E4 — this figure CHOOSES which chart is drawn beneath the band.**
   *
   * Given, the figure becomes a `role="radio"` inside the row's radiogroup and
   * states `aria-checked`. Absent, it renders exactly as it did before — which
   * is what a lead metric with no chart of the same key gets, because a radio
   * that redraws nothing is a control that does not work.
   *
   * The three fields are the whole of the roving-tabindex pattern: `selected`
   * is the state, `onSelect` is the transition, and `tabIndex` is which one of
   * the group the tab key reaches. The GROUP owns the arrow keys — see
   * `BoardHeroRow` — because moving between radios is a fact about the set and
   * not about any one of them.
   */
  selection?: MetricSelection
  /**
   * What `deltaPercent` is a change IN. `percent` is the default. `points` is
   * the difference between two rates — 12.6% to 12.0% fell 0.6 points, not
   * 4.8% — and the caller puts that difference in `deltaPercent` (§4.3).
   */
  deltaUnit?: MetricDeltaUnit
}

/** See `MetricTileProps.deltaUnit`. */
export type MetricDeltaUnit = 'percent' | 'points'

/** The three fields of a roving-tabindex radio. See `MetricTileProps`. */
export interface MetricSelection {
  selected: boolean
  onSelect: () => void
  /** `0` on the one radio the tab key reaches; `-1` on the rest. */
  tabIndex: 0 | -1
}

/**
 * **The ground a figure is painted on**, and the only thing that changes
 * between the two.
 *
 * `band` is `--ev-hero` — the deep-green field at the head of a board, which
 * does not invert (see the token's own derivation). Every colour a figure uses
 * there comes from the `hero` family, because none of the page's foreground
 * tokens are legible on it: `--ev-text-2` measures 1.83 : 1 there.
 *
 * `page` is `--ev-bg`. It is the default, so a caller that has no opinion gets
 * the page and a caller on the band has to say so.
 */
export type MetricSurface = 'band' | 'page'

export function MetricTile({
  metric,
  boardAsOf,
  t,
  language,
  surface = 'page',
  selection,
  deltaUnit = 'percent',
}: MetricTileProps) {
  const label = t(`metric.${metric.key}`)
  const isStale = new Date(metric.asOf).getTime() < new Date(boardAsOf).getTime()
  const onBand = surface === 'band'
  /* §H4 — the ONE thing rank changes on the PAGE. On the band every figure is
     a lead by construction (only leads are painted there), so rank is spent
     entirely by the surface and this reads `false` for all three of them. */
  const isLead = !onBand && metric.rank === 'lead'

  const { delta, note } = comparisonParts({ metric, t, language, onBand, deltaUnit })
  /* The numeral and the unit beside it — see `splitMetricValue` for why a money
     value is two runs here and one everywhere else. `unitNode` is `null` on
     every non-money measure, so nothing but money gains a line. */
  const shown = splitMetricValue(metric.value, metric.unit, metric.currency, language)

  /* **The label, and its position is the whole difference between the two
     surfaces.**
     On the BAND it is an eyebrow: mono, uppercase, above the numeral, in
     `--ev-hero-fg-3`. Three figures sit side by side there with nothing else
     between them, and an eyebrow is what lets an operator find the one they
     want before reading any digits.

     On the PAGE it is beneath the numeral, in body type. The page carries
     eight to twelve of these under chapter headings that have already said
     what kind of number is coming, so the numeral leads and the name settles
     it. This is R5-3's finding about the ledger restated for a figure: the
     name and the number must be adjacent, and which of them comes first is
     decided by what the reader is scanning FOR.

     `tracking-wider` is a no-op in Arabic and that is deliberate rather than a
     loss — `globals.css` zeroes the whole scale under `:root:lang(ar)` because
     letter-spacing breaks cursive joins. `uppercase` is likewise a no-op
     there, Arabic having no case. The eyebrow keeps its size, its weight and
     its colour in both languages, which is what carries it.
     **The face is the console's own and NOT the reference's.** The reference
     sets every eyebrow, delta and axis tick in JetBrains Mono. The owner's
     ruling is to keep the dashboard's font, so what carries these runs is size,
     case, tracking and colour — the four things the reference was ALSO using —
     in Inter. Nothing is lost that a monospaced face was the only way to buy:
     the one thing it uniquely gives is column-aligned digits, and every numeral
     run in the product already has that from `tabular-nums`, pinned in
     `@layer base` on `[data-numeric]` and on the value slot. */
  const labelNode = onBand ? (
    <span className="text-2xs font-medium uppercase tracking-wider text-hero-label">{label}</span>
  ) : (
    <span className={cn('text-sm', isLead ? 'text-foreground' : 'text-muted-foreground')}>
      {label}
    </span>
  )

  /* R4 — tabular figures, so a column of figures scans down its digits.
     **`<bdi>`, and it is not decoration.** `42,186.50 SAR` is two LTR runs,
     and in an Arabic paragraph the UBA moves the trailing `SAR` to the front —
     the tile rendered `SAR 42,186.50` before this. `money.ts` names the
     isolation as the COMPONENT's job, deliberately, so that embedding
     U+2068/U+2069 in the string does not poison copy-paste and assertions.

     **The `<bdi>` is wrapped rather than styled, and that is a defect fix no
     source audit could see.** `<bdi>` derives its own `direction` from its
     content, so a STRETCHED one — this is a child of a column flex, so it is
     full width — aligned `42` to ITS start. Under `dir="rtl"` the value
     flushed LEFT while its own label flushed RIGHT. The span keeps the page's
     direction; the `<bdi>` isolates the run and nothing more.

     **The em dash a `null` value renders is `aria-hidden`** (R5-1 §10, state
     D). It is a MARK standing in for a number, and on its own it says nothing.
     What a reader is given instead is the reason, in `note`, in words. */
  const valueNode = (
    <span
      aria-hidden={metric.value === null || undefined}
      /* **Two halves, and neither is optional** — the SIZE is here and the
         `font-variant-numeric` is pinned in `@layer base` on
         `[data-slot="metric-value"]`. The tabular utility is deliberately NOT
         written beside it: a hand-written class would restate the guarantee at
         a call site free to omit it, which is the mechanism §H4 declines to
         rely on.

         Three sizes, one per rung, and no surface carries two of them: the
         band is 40 (`text-kpi-hero`), a page lead is 36, a supporting figure
         is 28. */
      data-slot="metric-value"
      className={cn(
        'font-semibold',
        onBand ? 'text-kpi-hero text-hero-foreground' : 'text-foreground',
        !onBand && (isLead ? 'text-kpi-lead' : 'text-kpi'),
      )}
    >
      <bdi>{shown.value}</bdi>
    </span>
  )

  const unitNode = shown.unit ? (
    <span className={cn('text-xs', onBand ? 'text-hero-muted' : 'text-muted-foreground')}>
      {shown.unit}
    </span>
  ) : null

  /* R4-4 §4.2 — the caption states a scope limit, a denominator, or the
     direction that counts as good where the label does not make it obvious,
     and nothing else. ≤38 characters, **one line, truncates and never wraps**,
     because a figure that wraps changes its own height and the row it sits in
     is one object read across.

     **It does not render while the value is absent** (R5-1 §1.3): a
     denominator with no numerator is noise, and a figure carries ONE
     explanation. The explanation on such a figure is the absence reason, which
     `note` is already carrying.

     `<bdi>` for the reason given above: nearly every caption is a numeral run
     inside a sentence — `7 days, 3 blocks, 2 tiers.`, `1 of 4 cities is live.`
     — and under `dir="rtl"` the UBA moved the leading digit to the far end. */
  const captionNode =
    metric.value !== null && metric.caption ? (
      <span
        className={cn(
          'truncate text-xs',
          onBand ? 'text-hero-muted' : 'text-muted-foreground',
        )}
      >
        <bdi>{t(metric.caption, metric.captionParams ?? undefined)}</bdi>
      </span>
    ) : null

  const staleNode = isStale ? (
    <span
      className={cn('text-xs', onBand ? 'text-hero-muted' : 'text-muted-foreground')}
    >
      {t('overview.asOf', {
        time: formatDate(metric.asOf, { style: 'day-month-time', language }),
      })}
    </span>
  ) : null

  /* **The card is gone, and its removal is the change rather than a saving.**
     Twelve bordered boxes in a grid drew twelve rectangles and no ranking: the
     border said "these are all the same kind of thing" at exactly the moment
     the board needed to say which of them to read first. What separates one
     figure from the next now is SPACE and the chapter heading above it, which
     is what lets the numeral carry the hierarchy the type ramp gives it. */
  /* The numeral and its delta **on one baseline**. They are one statement —
     "8,075.70, up 57%" — and stacking them made the reader carry the first
     across a line break to reach the second. `items-baseline` so the 12px
     delta sits on the 40px numeral's baseline rather than floating at its
     optical centre; wrapping is allowed so a six-figure money value and a
     delta do not overflow a 3-up column in Arabic. */
  const quantity = (
    <span
      className={cn(
        'flex flex-wrap items-baseline gap-x-2.5 gap-y-1',
        /* On a phone the quantity is the row's TRAILING column and flushes to
           the inline end — which under `dir="rtl"` is the left, without a
           second rule.

           **It is allowed to shrink, and that is the fix for a real defect
           rather than a preference.** Held rigid, `1,281.86 SAR` plus its
           delta claimed 290 of a 358px row and left `Revenue per active
           captain` a 68px column, which set one word per line and ran the
           figure eleven lines deep. The container wraps instead: when the two
           columns will not share a line the quantity takes its own, still
           flushed to the end, and the figure degrades to the stack it was
           rather than to a ransom note. Short values — which is most of
           them — keep the row. */
        !onBand && 'compact:order-2 compact:justify-end compact:text-end',
      )}
    >
      {valueNode}
      {delta}
    </span>
  )

  /* **The words, grouped, because on a phone they are a column.**
   *
     At 390px the reference stops laying a figure out as a stack and lays it
     out as a ROW: the name on one side, the number on the other, sharing a
     baseline. That is the right call and it is the same finding R5-3 made
     about the ledger — a name and a number 300px apart with nothing between
     them is a pairing the reader has to reconstruct, and on a phone the stack
     was spending a whole 44px line on each of nine figures.
   *
     `order` rather than two DOM orders: the source stays value-first, which is
     the desktop reading and the one a screen reader gets in both. Flex `order`
     moves the boxes and touches nothing else. */
  const words = (
    <span
      className={cn(
        'flex min-w-0 flex-col gap-1.5',
        !onBand && 'compact:order-1 compact:flex-1 compact:basis-40',
      )}
    >
      {!onBand && labelNode}
      {unitNode}
      {captionNode}
      {note}
      {staleNode}
    </span>
  )

  const figure = (
    <div
      className={cn(
        'flex h-full flex-col gap-1.5',
        onBand && 'gap-2.5',
        !onBand &&
          'compact:flex-row compact:flex-wrap compact:items-baseline compact:justify-between compact:gap-x-4 compact:gap-y-2',
      )}
    >
      {onBand && labelNode}
      {quantity}
      {!onBand && words}
      {/* On the band the words have no group of their own: a lead figure's
          eyebrow is already above the numeral, so what is left below it is the
          caption and the note, in source order, at full width. */}
      {onBand && unitNode}
      {onBand && captionNode}
      {onBand && note}
      {onBand && staleNode}
    </div>
  )

  /**
   * **§E4 — the drilldown left the figure, and this is why it had to.**
   *
   * The whole tile was an `<a>`. §7.2 / §7.4's argument for that is unchanged
   * and still right *for a tile that only navigates*: the focusable element and
   * the visible box are then the same object and the ring needs no proxy.
   *
   * A lead figure now also CHOOSES which chart the band draws, and **a control
   * cannot be both a link and a radio** — one role, one activation, one
   * `Enter`. So the destination moved onto an affordance of its own, which is
   * the reference's own shape (`Open Analysis →`), and the figure above it is
   * free to be either a plain block or a radio.
   *
   * It is the same action on the page as on the band, deliberately: a figure
   * whose drilldown you reach one way in the band and another way six inches
   * below it is two patterns, and an operator learns the second one by
   * failing at the first.
   *
   * A figure with no `drilldownRoute` gets nothing here and is not a focus
   * stop — a stop that does nothing is worse than no stop.
   */
  const action = metric.drilldownRoute ? (
    <OpenAnalysis
      href={metric.drilldownRoute}
      report={label}
      onBand={onBand}
      t={t}
      language={language}
    />
  ) : null

  if (!selection && !action) return figure

  return (
    /* `h-full` IS LOAD-BEARING, not tidiness: `figure` carries `h-full`, which
       resolves against THIS box, and a box that sizes to its content makes that
       percentage resolve to the content height — so a figure with an action
       under it stops filling its grid cell and the row goes ragged. The figure
       takes the slack (`flex-1`) so the action sits on the cell's bottom edge
       and every action in a row is on one line. */
    <div className="flex h-full min-w-0 flex-col items-start gap-2.5">
      {selection ? (
        <button
          type="button"
          role="radio"
          aria-checked={selection.selected}
          tabIndex={selection.tabIndex}
          onClick={selection.onSelect}
          /* **No `aria-label`.** `radio` presents its children, so a label here
             would REPLACE the eyebrow, the numeral and the delta clause rather
             than summarise them — and the name computed from the contents
             already reads *"Gross revenue 8,075.70 SAR +57% up, which is
             better"*, which is the whole tile and is what a reader wants.

             **The selected ring is `ring-offset`, not padding.** The reference
             outlines the chosen tile; drawn as a box the tile would gain
             padding and shift its neighbours' columns as the selection moved.
             An offset ring is painted outside the border box and costs no
             layout, so the three tracks hold still. */
          className={cn(
            'block w-full flex-1 rounded-lg text-start outline-none transition-shadow',
            'focus-visible:ring-2 focus-visible:ring-offset-4',
            onBand
              ? 'focus-visible:ring-hero-foreground focus-visible:ring-offset-hero'
              : 'focus-visible:ring-ring focus-visible:ring-offset-background',
            selection.selected &&
              (onBand
                ? 'ring-2 ring-hero-foreground ring-offset-4 ring-offset-hero'
                : 'ring-2 ring-ring ring-offset-4 ring-offset-background'),
          )}
        >
          {figure}
        </button>
      ) : (
        <div className="w-full flex-1">{figure}</div>
      )}
      {action}
    </div>
  )
}

/**
 * **§E7's `Open Analysis →`** — the one named way off a figure or a card.
 *
 * ## Two runs, and the second one is not decoration
 *
 * The visible words are short because they repeat under every figure on a
 * board; the accessible name still has to say which analysis, so the report's
 * own name is appended as a screen-reader run. Written this way round rather
 * than as an `aria-label`, and the reason is §7.2's label-in-name: an
 * `aria-label` of *"Open the Gross revenue report"* REPLACES the visible words,
 * so a voice user saying what they can read — *"open analysis"* — matches
 * nothing. Appending instead makes the spoken name a superset of the visible
 * one, which is the property the rule is about.
 *
 * The arrow points FORWARD THROUGH READING, so it is picked by `dir` and turns
 * around in Arabic (§9.5, O10); a delta's caret encodes magnitude on the
 * vertical axis and never mirrors. `size-4` is §1.5's 16px, monochrome.
 */
export function OpenAnalysis({
  href,
  report,
  onBand = false,
  t,
  language,
}: {
  href: string
  /** The thing being analysed — a metric's label, or a chart's title. */
  report: string
  onBand?: boolean
  t: Translate
  language: Language
}) {
  const ForwardArrow = forwardIcon(directionFor(language))
  return (
    <Link
      to={href}
      data-slot="open-analysis"
      className={cn(
        /* `relative` gives the `sr-only` span below a containing block: an
           absolutely positioned descendant of the scrolled region otherwise
           resolves against the ICB and stretches the document. */
        'relative inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-medium outline-none transition-colors',
        'focus-visible:ring-2 focus-visible:ring-offset-2',
        onBand
          ? 'text-hero-muted hover:text-hero-foreground focus-visible:ring-hero-foreground focus-visible:ring-offset-hero'
          : 'text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background',
      )}
    >
      {t('overview.report.analysis')}
      <span className="sr-only">{t('overview.report.analysisFor', { report })}</span>
      <ForwardArrow aria-hidden="true" className="size-4" />
    </Link>
  )
}

/**
 * §3.7's comparison, **split into the two places it is now drawn**, and the
 * three shapes a `MetricComparison` has.
 *
 * ## Why this returns two nodes instead of rendering one line
 *
 * It used to be `ComparisonLine`, a single row beneath the label carrying
 * `↑ +8.1%  better  vs 1–25 May` all together. That was right while a figure
 * was a bordered tile read top to bottom; it is wrong now that the numeral is
 * the thing an operator scans across a row of three. The delta belongs ON THE
 * NUMERAL'S BASELINE — `8,075.70` and `+57%` are one statement, and a line
 * break between them made the reader carry the first down to reach the second
 * — while the phrase saying what the change is measured AGAINST is context and
 * belongs with the caption, below the name.
 *
 * So the union is destructured once, here, and the caller places the two
 * halves. **The union is still why this cannot be got wrong**: there is no way
 * to produce a delta without having said which kind of comparison it came
 * from, and *"no comparison period yet"* cannot silently become `0%`.
 *
 * Every branch returns BOTH keys. A branch that has no note returns `null` for
 * it rather than omitting it, so a caller cannot render a hole by forgetting a
 * case the type checker never made it think about.
 */
function comparisonParts({
  metric,
  t,
  language,
  onBand,
  deltaUnit,
}: {
  metric: Metric
  t: Translate
  language: Language
  onBand: boolean
  deltaUnit: MetricDeltaUnit
}): { delta: ReactNode; note: ReactNode } {
  const { comparison, deltaPercent } = metric
  /* One bag, every place the trailing phrase is drawn. `isolatedRunProps`
     rather than a `<bdi>` carrying the classes itself: the helper's `run` bag
     types `className` as `never`, so the box is the only place a class can
     land and §5.4's stretched-`<bdi>` defect cannot be reintroduced by a later
     edit. */
  const againstBox = isolatedRunProps({
    className: cn('text-xs', onBand ? 'text-hero-muted' : 'text-muted-foreground'),
  })

  const reasonLine = (text: string) => (
    <span className={cn('text-xs', onBand ? 'text-hero-muted' : 'text-muted-foreground')}>
      {text}
    </span>
  )

  const againstLine = (
    <span {...againstBox.box}>
      <bdi {...againstBox.run}>{againstLabel(comparison, metric, t, language)}</bdi>
    </span>
  )

  /**
   * **No value at all — R5-1 §1.3, and the reason it lives HERE.**
   *
   * When the value is absent the delta is *entailed* to be absent: you cannot
   * compute a change from nothing. So the figure has exactly one thing to say
   * and before this it said the less important of the two — `— No comparison
   * period yet` under a value that was itself an em dash, with the sentence
   * explaining the LOWER dash and nothing explaining the upper one. That is
   * V-2, and it is ambiguity by construction rather than by taste: there is no
   * reading of that tile, including the correct one, in which the value's
   * absence is explained.
   *
   * `comparison.reason` is not deleted by this and is not shown here. It is
   * still the right thing to say when a value exists and a comparison does not.
   *
   * `absenceReason` is non-null if and only if `value === null`, so a metric
   * that breaks the biconditional is a FIXTURE defect and says so by name
   * rather than resolving to a translation key that never existed — which
   * would send whoever reads the stack trace to the dictionary, the wrong file.
   */
  if (metric.value === null) {
    invariant(
      metric.absenceReason !== null,
      `Metric ${metric.key} has no value and no absenceReason (R5-1 §1.3)`,
    )
    return {
      /* Nothing beside the numeral: the numeral is ALREADY an em dash in this
         state, and a second one on the same baseline would read as a range. */
      delta: null,
      /* Visible text, so V-8 is satisfied without a companion: a reader hears
         the reason rather than silence where a number would be. */
      note: reasonLine(t(`overview.absent.${metric.absenceReason}`)),
    }
  }

  /**
   * **A target that exists, and no percentage to state against it.**
   *
   * `clients/metrics.ts` documents the one break in the biconditional that
   * causes it: a value that is not zero against a target of **zero** has no
   * percentage — there is no percentage change from nothing — so `deltaPercent`
   * is `null` while the comparison survives, on purpose, *"so the tile can
   * still render `vs 0 target`"*.
   *
   * The casualty was `admin.overview.operatorsWithoutTwoFactor`: target `0`,
   * set by `USR-1`, **the only owned target on any board**, three of five
   * operators without two-factor including the one who moves money. The tile
   * said the console had no history when what it had was a goal it was missing.
   *
   * **AC-605 is unaffected and that is the point.** It governs a tile *"whose
   * comparison is `none`"* — em dash plus one of exactly three reason strings —
   * and this tile's comparison is `target`.
   */
  if (comparison.kind === 'target' && deltaPercent === null) {
    return {
      /* O9 — the magnitude of the miss is not statable, so the slot is blank
         rather than a mark; the target is named on the note line below, and
         V-8 is carried by the clause a reader hears. `relative` gives the
         `sr-only` span a containing block inside the scrolled region. */
      delta: (
        <span className="relative flex items-baseline gap-1.5">
          <span className="sr-only">{t('overview.compare.targetNoDelta.sr')}</span>
        </span>
      ),
      note: againstLine,
    }
  }

  /* O9 supersedes §3.7's mark: the slot is blank and the reason carries the
     absence in words. The three reasons read very differently to an operator:
     one resolves itself next month, one is a setting nobody has filled in, and
     one will not resolve until the volume is there. */
  if (comparison.kind === 'none' || deltaPercent === null) {
    return {
      delta: null,
      note: reasonLine(
        t(`overview.noCompare.${comparison.kind === 'none' ? comparison.reason : 'no-history'}`),
      ),
    }
  }

  return {
    /* **The chip and the valence word are both gone, and this is the owner's
       ruling rather than a drift.**

       What stood here was `Badge tone="neutral"` carrying the caret and the
       percent, with the word `better` or `worse` beside it — D7 §4.9's plate,
       and R4-5's answer to how a tile states valence without toning a badge.
       The owner's direction is the reference frame, which draws a delta as a
       small coloured run on the numeral's own baseline and nothing else, and
       the reason it reads better is visible in the two side by side: three
       figures in a row carried three plates and three adjectives, so a chapter
       of five was five rectangles and five judgements competing with the five
       numbers they were about.

       **The run itself now lives in `MetricDelta`**, one component below, so
       the chart card and the report builder's panel reach the same judgement
       rather than each re-deriving it. What was here has not changed; it
       moved. */
    delta: (
      <MetricDelta
        deltaPercent={deltaPercent}
        higherIsBetter={metric.higherIsBetter}
        onBand={onBand}
        deltaUnit={deltaUnit}
        t={t}
        language={language}
      />
    ),
    note: againstLine,
  }
}

/**
 * **§3.7's delta run — the one implementation, on three surfaces.**
 *
 * A metric tile, a chart card's headline and the report builder's panel all
 * state the same fact and used to state it three ways: the tile with a caret,
 * a hue and a clause; the chart with nothing at all; the panel with a neutral
 * numeral and *alert-threshold* copy read out `sr-only`. One component, so the
 * mark a reader sees and the clause a reader hears are one judgement.
 *
 * ## §3.7 and R4-5 are both satisfied, and here is exactly how
 *
 * §3.7 rule 3: *"Deltas MUST be colour-coded **and** carry a direction caret;
 * colour alone is insufficient."* R4-5: `higherIsBetter` *"words a sentence; it
 * never colours a number."* They read as a contradiction and are not one — R4-5
 * is about a toned **badge**, which is D7 §4.9's plate, and there is no badge
 * here. Four carriers, and colour is the only one that could be missed:
 *
 *   - **DIRECTION** is the caret. A shape, not a hue — and it does **not**
 *     mirror (§9.5): up and down encode magnitude on the vertical axis, not a
 *     direction of reading. Drawn as a lucide icon rather than a Unicode
 *     geometric shape, which Inter does not carry: the browser falls through to
 *     whatever font does, and on Windows that font paints in colour.
 *   - **THE SIGN** is in the text. `+57%` and `−15.4%` read as a rise and a
 *     fall with the stylesheet switched off.
 *   - **VALENCE** — whether a rise is good news — is the hue for a sighted
 *     reader and `overview.delta.*`'s full clause, rendered `sr-only` on every
 *     delta, for everyone else.
 *   - **THE SENTENCE** under the headline (`trendRead`) says the same thing in
 *     words, from the same number.
 *
 * So the hue is redundancy wherever a fourth carrier is present — a chart
 * card's `trendRead` sentence states the verdict in visible words — and on a
 * metric TILE, which has no such sentence, it is the only carrier a **sighted**
 * reader has. That is measured, not inferred; the §4.9 note in this file's
 * header carries the measurement and names it as an open decision. For every
 * other reader the clause below is the carrier and the hue is the redundancy.
 *
 * ## The two grounds, and why the tone foregrounds are not enough
 *
 * On the page it is R7's tone foregrounds. On the band NEITHER is legible —
 * `--ev-red` measures 1.79 : 1 on `--ev-hero` — so the band has its own pair,
 * derived against that one ground and nothing else. See `--ev-hero-up`.
 *
 * ## `null` is blank and never `0%`
 *
 * O9 supersedes AC-834's mark: an absent delta draws nothing, because every
 * caller already pairs it with words — the tile's reason line, the card's
 * `overview.chart.read.noBaseline`. A caller that renders this with `null` and
 * says nothing beside it has a defect, not a delta.
 */
export function MetricDelta({
  deltaPercent,
  higherIsBetter,
  onBand = false,
  deltaUnit = 'percent',
  t,
  language,
}: {
  /** Signed, in percentage points. `null` when there is nothing to compare. */
  deltaPercent: number | null
  higherIsBetter: boolean
  /** `true` on the hero band, which has its own legible pair of valence hues. */
  onBand?: boolean
  /** See `MetricTileProps.deltaUnit`. `points` renders `−0.6 pts`, not `−0.6%`. */
  deltaUnit?: MetricDeltaUnit
  t: Translate
  language: Language
}) {
  if (deltaPercent === null) return null

  const Caret = deltaPercent > 0 ? DeltaUpIcon : deltaPercent < 0 ? DeltaDownIcon : null

  /* The LONG clause, and it is the screen reader's. */
  const direction =
    deltaPercent === 0
      ? t('overview.delta.flat')
      : t(
          deltaPercent > 0
            ? higherIsBetter
              ? 'overview.delta.upBetter'
              : 'overview.delta.upWorse'
            : higherIsBetter
              ? 'overview.delta.downWorse'
              : 'overview.delta.downBetter',
        )

  /* One derivation feeds the hue a reader sees and the clause a screen reader
     hears, so the two can never disagree. `null` at zero: nothing moved, so
     nothing is better or worse, and the run takes the muted colour rather than
     a verdict. */
  const valence = metricValence(deltaPercent, higherIsBetter)
  const valenceClass =
    valence === null
      ? onBand
        ? 'text-hero-muted'
        : 'text-muted-foreground'
      : onBand
        ? valence === 'better'
          ? 'text-hero-up'
          : 'text-hero-down'
        : valence === 'better'
          ? 'text-success-foreground'
          : 'text-critical-foreground'

  return (
    /* `relative` so the `sr-only` clause below has a containing block inside
       the scrolled region and cannot stretch the document. */
    <span
      className={cn(
        'relative flex items-center gap-1 text-xs font-medium tabular-nums',
        valenceClass,
      )}
    >
      {Caret && <Caret aria-hidden="true" className="size-3" />}
      {/* Isolated for the same reason as the value. `+8.1%` renders `8.1%+`
          without it under `dir="rtl"`, its leading sign being bidi-neutral. */}
      {/* A change in a RATE is a point difference, and the run says which it is
          rather than leaving `%` to mean two things (§4.3). */}
      <bdi className="tabular-nums">
        {deltaUnit === 'points'
          ? `${formatSignedPoints(deltaPercent, language)}${t('metric.delta.points')}`
          : formatSignedPercent(deltaPercent, language)}
      </bdi>
      <span className="sr-only">{direction}</span>
    </span>
  )
}

/**
 * What the delta is measured against, in words.
 *
 * §3.7 requires the comparison period to be **named with dates**, which is only
 * possible because `MetricComparison` carries them — a bare `previousValue:
 * number` could not fill in `1–25 May`.
 */
function againstLabel(
  comparison: MetricComparison,
  metric: Metric,
  t: Translate,
  language: Language,
): string {
  if (comparison.kind === 'target') {
    return t('overview.compare.target', {
      target: formatMetricValue(comparison.value, metric.unit, language),
    })
  }
  if (comparison.kind === 'previous-period') {
    return t('overview.compare.period', {
      from: formatDate(comparison.periodStart, { style: 'day-month', language }),
      to: formatDate(comparison.periodEnd, { style: 'day-month', language }),
    })
  }
  return ''
}
