/**
 * **A chapter of a board** — a heading, one derived line under it, a rule
 * running to the end of the measure, and the figures that belong to it.
 *
 * ```
 *  Money   Nothing here moved the wrong way ────────────────────────────────
 *
 *  861.31  +435.9% better       1,281.86  +1,171.2% better    50.1%  −19.7%
 *  Revenue per subscription     Revenue per active captain    Subscription
 *  SAR                          SAR                           share of gross
 * ```
 *
 * ## Why a board needs chapters at all
 *
 * Operations Overview carries thirteen metrics. Nine of them are supporting,
 * and before this they were nine equal cells in one grid with no statement
 * anywhere on the page about what any of them had to do with each other. A
 * reader scanning for "how is money doing" had to read nine labels to find the
 * three that were about money.
 *
 * The grouping is `Metric.category`, which already exists and is already
 * populated on every seeded metric — §3.7's metrics-library taxonomy, and the
 * one field on `Metric` that is about *what kind of number it is*. So no
 * editorial table is added and no fixture changes: the chapters a board has
 * are the categories its supporting metrics are in, in the order the client
 * already returns them.
 *
 * ## The sub-line is DERIVED, and that is why it can be trusted
 *
 * The reference writes its chapter subs by hand — *"Both below the 95%
 * target"*, *"Complaints down, lateness concentrating"* — which is a sentence
 * about the data written at design time and true only until the data moves.
 * This one is computed from the figures underneath it every render, using the
 * same `metricValence` the deltas use, so the two can never disagree and
 * nobody has to remember to rewrite it.
 *
 * Three states and no fourth:
 *
 *   some moved the wrong way  `2 of 3 moved the wrong way`
 *   none did, some compared   `Nothing here moved the wrong way`
 *   nothing comparable        `No comparison period yet` — the same string a
 *                             figure uses for the same fact, so the page says
 *                             it once in one voice.
 *
 * Rules applied
 *   §7.5       the sub-line is words. The chapter carries no colour of its own
 *              and the rule beside it is `--ev-hairline`, which is structure.
 *   R5-4       the sub states a fact about the figures below it and nothing
 *              else — never a status, never an action, never a link.
 *   AC-713     a key with parameters, never a concatenation. All three states
 *              are whole sentences in the dictionary.
 */

import { Children, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { formatCount, invariant, type Language, type Translate } from '@/lib'
import type { Metric, MetricCategory } from '@/data/types'
import { FIGURE_GUTTER } from './BoardHero'
import { metricValence } from './formatMetric'


/**
 * **The order chapters appear in, and it is the same on all nine boards.**
 *
 * It reads as a sentence about a business: the money it made, the
 * subscriptions that produced it, the captains who delivered them, the demand
 * they were answering, the quality of the answer, and what threatens it. A
 * reader who learns that sequence on Management › Overview reads Operations ›
 * Overview without learning a second one, which is Wave 4's bar — *"eight
 * screens that are individually fine but do not read as one family is a
 * failure of this wave"* — made structural instead of aspirational.
 *
 * **This DOES re-order what the client returned, and only at the chapter
 * level.** Within a chapter, order is the client's and untouched: a board's
 * `BOARD_LEADS` sequence and its fixture order decide which of two revenue
 * figures comes first, and nothing here has an opinion about that. What is
 * decided here is which chapter a reader meets first, which is a layout
 * question about the page rather than a ranking of the numbers — the same
 * distinction §H4 draws between a metric's `rank` and the grid it lands in.
 *
 * The array is the union, so a seventh category cannot be added to
 * `MetricCategory` without landing here. A category the array somehow did not
 * name would sort to the end rather than vanish.
 */
const CATEGORY_ORDER: readonly MetricCategory[] = [
  'revenue',
  'subscriptions',
  'supply',
  'team',
  'demand',
  'service',
  'risk',
]

/**
 * The supporting metrics of a board, in chapters.
 *
 * One walk opens a chapter the first time it meets a category, then the
 * chapters are put into `CATEGORY_ORDER`. **The sort is stable and the walk is
 * what fills each chapter**, so two metrics in one category keep the order the
 * client gave them.
 */
export function chaptersOf(metrics: readonly Metric[]): Array<{
  category: MetricCategory
  metrics: Metric[]
}> {
  const out: Array<{ category: MetricCategory; metrics: Metric[] }> = []
  for (const metric of metrics) {
    const open = out.find((chapter) => chapter.category === metric.category)
    if (open) open.metrics.push(metric)
    else out.push({ category: metric.category, metrics: [metric] })
  }
  const rank = (category: MetricCategory) => {
    const at = CATEGORY_ORDER.indexOf(category)
    return at === -1 ? Number.MAX_SAFE_INTEGER : at
  }
  return out.sort((a, b) => rank(a.category) - rank(b.category))
}

/**
 * The sub-line, computed from the figures the chapter is about.
 *
 * A metric is COMPARABLE when it has a value and a signed delta — which is
 * exactly the condition under which a figure draws a delta rather than an em
 * dash, so the count here and the marks on the page are derived from one test.
 */
export function chapterSummary(
  metrics: readonly Metric[],
  t: Translate,
  language: Language,
): string {
  const comparable = metrics.filter(
    (metric) => metric.value !== null && metric.deltaPercent !== null,
  )
  if (comparable.length === 0) return t('overview.noCompare.no-history')

  const worse = comparable.filter(
    (metric) => metricValence(metric.deltaPercent ?? 0, metric.higherIsBetter) === 'worse',
  ).length

  if (worse === 0) return t('overview.chapter.steady')
  return t('overview.chapter.worse', {
    worse: formatCount(worse, language),
    total: formatCount(comparable.length, language),
  })
}

/**
 * **The chrome a chart or a breakdown drops on a board.**
 *
 * `Card` is right nearly everywhere in the product and it is wrong here, for
 * the reason the figures dropped theirs: a bordered white panel on a white
 * ground is a rectangle drawn around a plot that already has an axis and a grid
 * to bound it, and on a page whose figures have no edges it was the last thing
 * still claiming that a panel and a figure are different kinds of object.
 *
 * These are OVERRIDES rather than a second component, and that is the whole
 * point — `cn` runs `tailwind-merge`, so every one of them beats the class it
 * collides with in `Card`'s own list and nothing else about the card changes.
 * The header grid, the action slot's placement, the footer's legend, the error
 * boundary around the body: all of it is the code that already works.
 *
 * Two constants because `Card` pads on the block axis and its slots pad on the
 * inline axis, so removing the box means removing padding in two places. A
 * single string carrying both would have to be spread onto children that also
 * take their own classes, which is how a merge order stops being obvious.
 */
export const PLAIN_FRAME = 'rounded-none border-0 bg-transparent py-0 shadow-none'
export const PLAIN_FRAME_SLOT = 'px-0'

export interface ChapterProps {
  /**
   * A board's chapters are its `MetricCategory` groups and name themselves from
   * one. `null` on a surface whose sections are its own — Financials' *The
   * period* and *Where the money is held* are not categories — which then
   * passes `title` instead.
   */
  category: MetricCategory | null
  /** Given, it names the chapter. Required when `category` is `null`. */
  title?: string
  /** The chapter's own sub-line — see `chapterSummary`. */
  summary: string
  children: ReactNode
  t: Translate
}

/**
 * **The heading every section on a board wears** — a word, a muted phrase and a
 * rule to the end of the measure.
 *
 * One component because a board has two kinds of section — the chapters and the
 * chart row — and they must be the same object. Two headings that differed by a
 * few pixels would read as two different levels of the page, which is exactly
 * what they are not.
 *
 * **The rule is the section's own separator**, so the page needs no border
 * between one section and the next. `items-baseline` puts the word and the
 * phrase on one baseline; the rule is centred against them rather than
 * baselined, because a 1px line has no baseline to sit on.
 *
 * It wraps: at 390px `Subscriptions` plus a nine-word phrase does not fit one
 * line, and a heading that truncated would lose the phrase entirely. When it
 * wraps the rule falls to its own row and still closes the heading, which is
 * what it is for.
 *
 * **No glyph.** An earlier cut put the category icon here, moved off the tiles
 * it used to decorate. The reference sets a section as a word, a phrase and a
 * rule, and it is right: an icon beside `Money` repeats nothing the word does
 * not already say, and a column of them down the page reads as a list of
 * buttons. §7.5 wanted them hidden from a reader for exactly that reason; the
 * honest conclusion is not to draw them.
 */
export function SectionHeading({ title, note }: { title: string; note?: string | null }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {/* T9.9 — stays inline. `chapterSummary` counts the figures below that
          moved the wrong way, so this reports the data rather than explaining
          the chrome, and X15 leaves a data fact where a reader scans. */}
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      <span aria-hidden="true" className="h-px min-w-8 flex-1 self-center bg-border" />
    </div>
  )
}

export function Chapter({ category, title, summary, children, t }: ChapterProps) {
  const heading = title ?? (category === null ? '' : t(`overview.category.${category}`))
  invariant(heading !== '', 'Chapter needs a category or a title')
  return (
    /* 16px between the heading and its figures, down from 24. The rule in the
       heading already closes the section above; what separates a heading from
       the figures it names should be less than what separates one chapter from
       the next, and at 24 against 48 it read as a gap rather than as an
       attachment. §E7's density pass. */
    <section className="flex flex-col gap-4">
      <SectionHeading title={heading} note={summary} />
      {children}
    </section>
  )
}

/**
 * The columns a chapter of `n` figures takes (T5.6): three across at three or
 * more, two halves at two. A fixed third track left a third of every Overview
 * chapter row as page ground. Static class strings only — a computed count is
 * a class Tailwind's scanner never sees, and it ships as one column.
 */
function chapterColumns(figures: number): string {
  if (figures <= 1) return 'grid-cols-1'
  if (figures === 2) return 'grid-cols-2'
  return 'grid-cols-3'
}

/**
 * The figures of one chapter, in as many tracks as it has figures, to three.
 * The gutter is `FIGURE_GUTTER` and is not written here, so the band's row and
 * this one cannot drift apart (§E7).
 */
export function ChapterFigures({ children }: { children: ReactNode }) {
  /* The count decides the tracks, so it is read off the children rather than
     passed: a caller that had to state it could state it wrongly. */
  const figures = Children.count(children)
  return (
    <ul
      data-numeric
      data-slot="chapter-figures"
      role="list"
      className={cn(
        'grid list-none gap-y-7 compact:grid-cols-1 compact:gap-y-6',
        chapterColumns(figures),
        FIGURE_GUTTER,
      )}
    >
      {children}
    </ul>
  )
}
