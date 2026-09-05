/**
 * **The band at the head of a metric board** — the deep-green field carrying
 * the board's name, the one line saying what it is a board OF, the period the
 * numbers cover, and the three numerals the board is about.
 *
 * ```
 *  ┌────────────────────────────────────────────────────────────────────┐
 *  │  Overview                                     ┌──────────────────┐ │  30px/500, --ev-hero-fg
 *  │  Computed 25 Jun 09:14, covering the 15 days  │ 11 – 25 JUN 2026 │ │  13px, --ev-hero-fg-2
 *  │  from 11 to 25 June.                          └──────────────────┘ │  mono on --ev-hero-2
 *  │                                                                    │
 *  │  GROSS REVENUE        CONTRIBUTION MARGIN     ACTIVE SUBSCRIPTIONS │  mono 12 uppercase, fg-3
 *  │  8,075.70  ↑ +57%     11%  ↓ −15.4% worse     47  ↑ +46.9% better  │  40px/600, fg
 *  │  SAR                  vs 1 May – 25 May                            │  mono 12, fg-2
 *  └────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## What this replaces, and the defect it closes
 *
 * A board opened with a 24px title, a grey freshness line and then twelve
 * bordered tiles in a grid. Measured at 2400px on Operations Overview: twelve
 * tiles at **491px wide and 28px of numeral, without exception**. The board had
 * no opinion about which number an operator should read first, so it gave them
 * identical weight and left the ranking to whoever was looking — which on a
 * console read under pressure means the ranking does not happen.
 *
 * §H4 answered half of that by giving three metrics per board `rank: 'lead'`
 * and a bigger numeral. This is the other half: the leads get their own
 * **ground**. A size step alone is arguable at a glance; a size step on a
 * different-coloured field is not, and it also gives the board's name and its
 * lede somewhere to live that is not a fourth grey line above a grid.
 *
 * ## The `<h1>` moved here, and it is the same `<h1>`
 *
 * A board renders NO `PageHeader`. §8's slot 1 (no back arrow — a board is an
 * index route, §2.2) and slot 2 (the freshness line) are both satisfied here
 * instead, in the same order, with the same content. There is exactly one `h1`
 * on the page and it names the board, which is the only contract §8 was
 * protecting; what changed is which box it sits in.
 *
 * ## The period is STATED, not offered
 *
 * The reference this is dressed from draws the period as a picker with a
 * chevron and a calendar behind it. **This one is a fact and not a control**,
 * deliberately: `getMetricBoard` takes a `subTabId` and nothing else, so a
 * board has no period parameter to change. A chevron that opened a calendar
 * that changed no number would be the worst kind of affordance — one that
 * works, and does nothing. When the seam grows a range parameter this is the
 * element that becomes the trigger, and until then it says what it knows.
 *
 * Rules applied
 *   §7.5       the band's colour carries nothing. Every figure on it prints its
 *              own name, its own numeral and — where it has one — the valence
 *              word beside its delta. Painting the band grey would lose the
 *              hierarchy and no reading.
 *   §8         the title and the freshness line, in slots 1 and 2, unmoved in
 *              order and content.
 *   R18        no loop, no pulse. The band does not animate.
 *   §9.5       nothing here mirrors by hand. The band is a flex row that
 *              reverses with the document, and the one mark on it — a delta's
 *              caret — encodes magnitude rather than reading direction.
 */

import type { KeyboardEvent, ReactNode } from 'react'
import { CalendarIcon, RefreshIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { PAGE_BLOCK_INSET } from '@/components/PageShell'
import { BoardPeriodControl, periodPillLabel } from './BoardPeriodControl'
import { formatDate, type Language, type Translate } from '@/lib'
import type { IsoDate } from '@/data/types'

export interface BoardHeroProps {
  /** The board's name. Rendered as the page's one `<h1>`. */
  title: string
  /**
   * One sentence saying what the board is a board OF. `null` on a board that
   * has not declared one — the band then closes up around the title rather
   * than reserving a line for a string that is not coming.
   */
  lede: string | null
  /**
   * The board's computation instant. §8's slot 2.
   *
   * `null` in every state but `content`: a page that has not loaded cannot
   * honestly claim a freshness, and the band drops the line rather than
   * printing a placeholder where a timestamp goes.
   */
  asOf: string | null
  /**
   * The window the board's numbers cover, when its metrics agree on one.
   * `null` on a board whose metrics are all point-in-time — "active captains
   * right now" is not a period, and giving it one invites a reader to think
   * the board was filtered to it.
   */
  period: { start: IsoDate; end: IsoDate } | null
  /**
   * **Given, the pill becomes a picker; absent, it stays a caption.**
   *
   * Not every board that HAS a window can be asked for a different one — a
   * board whose read takes no range would offer a control that changes nothing,
   * which is worse than no control. Passing the handler is the caller saying
   * "my read honours this", and it is the only thing that turns the pill
   * interactive.
   */
  onPeriod?: (next: { start: IsoDate; end: IsoDate } | null) => void
  /**
   * A control of the caller's own, in the pill's place. Financials' presets are
   * calendar months and its stepper walks them; a second control on the band
   * would be two sets of presets for one window (§3.2). Outranks `onPeriod`.
   */
  periodSlot?: ReactNode
  /**
   * T5.7 — the window of the chart drawn under the band. Given and different
   * from `period`, the pill names both scopes rather than one.
   */
  chartPeriod?: { start: IsoDate; end: IsoDate } | null
  /**
   * T1.5 — given, the band draws a `Refresh` control beside the period pill.
   * Absent in every state but `content`: a board that has not loaded has
   * nothing to re-read, and `Try again` already owns the error state.
   */
  onRefresh?: () => void
  /** True while a re-read is in flight, so the control names its own state. */
  refreshing?: boolean
  /**
   * The lead figures. Three of them, rendered by the caller at
   * `surface="band"`. Absent while the board is loading, failed or empty —
   * the band is then its title, its lede and nothing else.
   */
  children?: ReactNode
  t: Translate
  language: Language
}

export function BoardHero({
  title,
  lede,
  asOf,
  period,
  onPeriod,
  periodSlot,
  chartPeriod = null,
  onRefresh,
  refreshing = false,
  children,
  t,
  language,
}: BoardHeroProps) {
  return (
    <BoardBand>
      {/* The band's GROUND runs to the region's edges; its CONTENT is capped
          and padded by `BoardBand`, exactly as the page block below caps and
          pads its own — see the note there. */}
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-5">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-band font-medium text-hero-foreground">{title}</h1>
          {/* **Measured, not full width.** A lede set across 1,440px is one
              line of 190 characters, which is a paragraph nobody reads. The
              band's own right-hand column takes what is left, which is where
              the period sits. */}
          {lede && <p className="max-w-prose text-sm text-hero-muted">{lede}</p>}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* T1.5 — the board's own re-read, beside the window it re-reads
                over. Not R3's primary: a board offers no primary (§8 slot 4c),
                and this changes nothing but the figures' freshness. */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                aria-busy={refreshing}
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-hero-line bg-hero-2 px-3 py-2',
                  'text-2xs text-hero-foreground transition-colors hover:bg-hero-line',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hero-foreground',
                  'focus-visible:ring-offset-2 focus-visible:ring-offset-hero',
                )}
              >
                {/* A refresh mark turns; it does not point. It does not mirror
                    (§9.5), and R18 keeps it still. */}
                <RefreshIcon aria-hidden="true" className="size-3.5 text-hero-label" />
                {t('overview.refresh')}
              </button>
            )}
            {/* **The control does not wait for the board to have a window.**
                `onPeriod` is the screen saying *my read honours a range*, and
                that is the whole condition — a board whose every figure is
                point-in-time has no period to print and is exactly the board an
                operator wants to put one on. The static pill is what is left
                when a board states a window it cannot be asked to change. */}
            {periodSlot ?? (onPeriod ? (
              <BoardPeriodControl
                period={period}
                onChange={onPeriod}
                chartPeriod={chartPeriod}
                t={t}
                language={language}
              />
            ) : (
              period && (
                /* `<bdi>` isolates it: `11 – 25 Jun` is a numeral run whose
                   leading digit the UBA otherwise moves to the far end of an
                   Arabic line. */
                <span className="flex items-center gap-2 rounded-lg border border-hero-line bg-hero-2 px-3 py-2 text-2xs tabular-nums text-hero-foreground">
                  {/* The reference's calendar mark, drawn rather than typed —
                      Inter carries no such glyph and the browser falls through
                      to a colour emoji font. It does not mirror: a calendar is
                      an object, not a direction (§9.5). */}
                  <CalendarIcon aria-hidden="true" className="size-3.5 text-hero-label" />
                  <bdi>{periodPillLabel({ period, chartPeriod, t, language })}</bdi>
                </span>
              )
            ))}
          </div>
          {/* §8 slot 2 — the board's freshness, in the band rather than above
              it. Same key, same format, same content as the `PageHeader` line
              it replaces. */}
          {asOf !== null && (
            <span className="text-2xs text-hero-label">
              <bdi>
                {t('overview.asOf', {
                  time: formatDate(asOf, { style: 'day-month-time', language }),
                })}
              </bdi>
            </span>
          )}
        </div>
      </div>

      {children}
    </BoardBand>
  )
}

/**
 * **The green field itself, with nothing in it.**
 *
 * Split out of `BoardHero` for one caller: Support › Fairness is the one
 * metrics board with a screen of its own — it carries the appeal queue and a
 * segmented view row beneath its figures — so its identity is already set by
 * `QueuePage`'s header and its tabs. Giving it a second `<h1>` and a second
 * lede would be two page titles on one page. It wants the GROUND and the three
 * lead figures on it, and nothing else the band carries.
 *
 * ## Two shapes, and the difference is which container it is in
 *
 * `bleed` — the board's. The band reaches the content region's own edges
 * through `SingleColumnPage`'s `bleed` slot, whose note records why that is an
 * amendment to V5 rather than a hole in it. Because it is no longer inside the
 * measure, the inline padding that used to come from `PAGE_BLOCK` comes from
 * here instead, **at the same token**, so the band's title sits on the same
 * vertical line as the chapter headings below it. The two paddings move
 * together or the page grows a step down its inline-start edge; `page-pad` is
 * that shared token and neither side writes a number.
 *
 * `inset` — Fairness's. It is inside a `QueuePage` that has already padded it,
 * so the band takes a card's radius and its own inline padding and behaves like
 * any other block on that page. A bleeding band there would have to cancel a
 * padding it cannot see, which is the mechanism V5 exists to refuse.
 *
 * The block padding is the band's own in both shapes and is deliberately larger
 * than the page's: a coloured field needs air inside it to read as a field.
 */
export function BoardBand({
  children,
  shape = 'bleed',
  density = 'tall',
}: {
  children: ReactNode
  shape?: 'bleed' | 'inset'
  /**
   * `tall` — the analytics band: a title, a lede and three 40px numerals, with
   * the air a coloured field needs to read as a field.
   *
   * `bar` — Market & Zones. That screen's subject is a MAP, and a map wants the
   * viewport; a band that took a third of it before the first polygon would be
   * the band winning an argument it should not be in. So the same ground, the
   * same title treatment one step down, and a single row. The reference draws
   * it exactly this way and the reason is the same one: the numbers on that
   * board are a strip under the bar, not headlines on it.
   */
  density?: 'tall' | 'bar'
}) {
  return (
    <section
      className={cn(
        'bg-hero text-hero-foreground',
        /* **One block inset, both densities, and the same one the padded block
           takes.** The bar took `py-4` and the tall band 32/44 where
           `PAGE_BLOCK` took 24, so a page's title opened at a different height
           depending on which sub-tab you were on. What the two densities differ
           in is the GAP inside the band, which is real: a bar has one row and a
           tall band has a title block above a row of figures. The frame around
           them is one frame — `PAGE_BLOCK_INSET`, spent here by reference so it
           cannot drift. */
        PAGE_BLOCK_INSET,
        shape === 'inset' && 'rounded-xl px-8 compact:px-5 wide:px-12',
      )}
    >
      {/* **The cap and the padding are ONE element, and they are `PAGE_BLOCK`'s
          two classes in `PAGE_BLOCK`'s order. This is a defect fix.**

          They used to be two: the padding on the `<section>` and the cap on an
          inner wrapper. That is a different construction from the page block
          below — where `max-w-measure` sits ON the padded box, so the cap
          INCLUDES the padding — and the two agree at every width up to the
          measure and disagree past it. Measured at 2400: the band's title at
          x = 632 and every chapter heading under it at x = 680, a 48px step
          down the console's inline-start edge that appears only on a monitor
          wider than 1440 and is invisible on the machine it was built on.

          `scratch/board-align.mjs` is the check: nine widths, seven boards,
          every section-level element on one line or it fails. */}
      <div
        className={cn(
          'mx-auto flex w-full max-w-measure flex-col',
          /* **Tightened one step with the rest of the board (§E7 density).**
             The reference's boards carry more per screen than this one did and
             the band was the largest single spend: 36px between the title block
             and the figures, on a field that already has 32px of its own block
             inset. 28 keeps the field reading as a field and gives the page
             back most of a line. */
          density === 'tall' ? 'gap-7 compact:gap-6' : 'gap-3',
          shape === 'bleed' && 'px-page-pad wide:px-page-pad-wide',
        )}
      >
        {children}
      </div>
    </section>
  )
}

/**
 * **The gutter, written once**, because the band's row and every chapter's row
 * have to be the same three tracks.
 *
 * It was one step wider than `ChapterFigures`', which put the band's second
 * column 4px off the second column of every chapter under it — three columns
 * that ALMOST line up read worse than three that obviously do not, because the
 * eye keeps trying to resolve them. The band and the page block already share a
 * padding token and a measure, so equal gutters is the last thing needed; with
 * it, a reader's eye comes down one line from `CONTRIBUTION MARGIN` through
 * every chapter's middle figure.
 *
 * **Tightened from 44px to 24px** with the rest of the board (§3.7's grid is a
 * ~19–20px gutter and the reference's boards read denser than this one did).
 * 24 rather than 20 on this grid alone: these figures have NO card edges, so
 * the gutter is the only separator, and a 40px numeral needs a hair more air
 * beside it than a bordered card does. The chapters' grid takes the same value
 * from this constant, so the two cannot drift apart again.
 */
const FIGURE_GUTTER = 'gap-x-6'

/**
 * The three lead figures, side by side on the band.
 *
 * Separate from the PAGE's 3-up grid because the two rows differ in more than a
 * colour: this one stacks with a hairline between on a phone, where a 358px
 * column cannot carry three 40px numerals across.
 *
 * `data-numeric` covers everything in the row that is a number but is NOT the
 * numeral itself — a delta, a caption's denominator — so the row scans down
 * its digits. The numeral gets it from `[data-slot="metric-value"]`.
 *
 * ## §E4 — given a `groupLabel`, the row becomes a radiogroup
 *
 * The reference's best single idea is a KPI row that **drives one chart**: the
 * selected tile is outlined and the plot beneath it is that tile's series. That
 * is a choice among mutually exclusive options, which is a radiogroup and not
 * three toggle buttons — `aria-checked` on a radio says *this is the one*,
 * where three `aria-pressed` buttons say *these three are independently on or
 * off*, which is false and is the thing an operator would have to test to
 * disprove.
 *
 * `role="list"` when no label is passed, so the ~two boards whose leads chart
 * nothing keep exactly the markup they had.
 *
 * **The arrow keys belong to the GROUP.** Which radio comes next is a fact
 * about the set, not about any member of it, so the handler is here and each
 * radio carries only its own `tabIndex`. Selection is NOT moved by the arrows:
 * this row redraws a chart on every change, and a group that selects on focus
 * would fire three reads while an operator arrows past two tiles to reach the
 * third. `Enter` and `Space` select, which they do for free — every radio here
 * is a real `<button>`.
 */
export function BoardHeroRow({
  children,
  groupLabel = null,
}: {
  children: ReactNode
  /**
   * Given, the row is a `radiogroup` with this as its accessible name. `null`
   * — the default — leaves it the plain list it was.
   */
  groupLabel?: string | null
}) {
  const grid = cn(
    'grid list-none grid-cols-3 gap-y-0',
    FIGURE_GUTTER,
    'compact:grid-cols-1 compact:gap-y-0 compact:divide-y compact:divide-hero-line',
  )

  if (groupLabel === null) {
    return (
      <ul data-numeric role="list" className={grid}>
        {children}
      </ul>
    )
  }

  return (
    <div
      data-numeric
      role="radiogroup"
      aria-label={groupLabel}
      className={grid}
      onKeyDown={moveWithinGroup}
    >
      {children}
    </div>
  )
}

/** Which way each arrow walks the group. Anything else falls through. */
const ARROW_STEP: Record<string, number | undefined> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

/**
 * Roving focus across the radios, and **the two horizontal arrows swap in
 * Arabic**.
 *
 * `ArrowRight` means *the next one along the row*, and in a mirrored row the
 * next one along is to the LEFT — the key names a screen direction and the
 * group is laid out in reading order. The vertical pair does not swap: the row
 * stacks top-to-bottom on a phone in both languages.
 *
 * The direction is read off the nearest `dir` rather than from a language prop,
 * so a subtree that pins its own direction is honoured and the row needs no
 * knowledge of which language is loaded.
 *
 * It wraps at both ends, which is the APG's radiogroup behaviour and is what
 * makes a three-item group reachable in one keypress from either side.
 */
function moveWithinGroup(event: KeyboardEvent<HTMLDivElement>) {
  const step = ARROW_STEP[event.key]
  if (step === undefined) return

  const group = event.currentTarget
  const radios = Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]'))
  const at = radios.indexOf(document.activeElement as HTMLElement)
  if (at === -1) return

  event.preventDefault()
  const dir =
    group.closest('[dir]')?.getAttribute('dir') ?? group.ownerDocument.documentElement.dir
  const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
  const walk = dir === 'rtl' && horizontal ? -step : step
  radios[(at + walk + radios.length) % radios.length]?.focus()
}

/**
 * One cell of the band's row.
 *
 * The block padding is what makes `divide-y` above legible on a phone: a
 * hairline with no air either side of it reads as a seam rather than as a
 * separator. It is zero on the first and last so the row does not gain padding
 * the band already provides.
 *
 * **`inGroup` swaps the `<li>` for a `<div>`, and that is a correctness fix
 * rather than a preference.** A `radiogroup` owns its radios; an `<li>` between
 * the group and the radio breaks that ownership, and a group whose owned
 * elements are not radios is a group with no members — which is what a screen
 * reader would announce. The list semantics are the thing being replaced, so
 * there is nothing to preserve.
 */
export function BoardHeroItem({
  children,
  inGroup = false,
}: {
  children: ReactNode
  inGroup?: boolean
}) {
  const cell = 'min-w-0 compact:py-5 compact:first:pt-0 compact:last:pb-0'
  return inGroup ? <div className={cell}>{children}</div> : <li className={cell}>{children}</li>
}

/** The gutter the chapters' grid takes, so the two rows are three tracks. */
export { FIGURE_GUTTER }
