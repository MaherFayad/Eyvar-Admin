/**
 * The four page shapes — design spec §7, spec §3.10. **Every destination
 * resolves to exactly one**, and the shape comes from the route table
 * (`row.shape`), never from the screen.
 *
 *   `SingleColumnPage` (L-03)      32 of the 34 sub-tabs. ONE width.
 *   `DetailPage`       (L-04)      the 4 level-3 details + the profile's
 *                                  full-page escape. 2 : 1, restacking below
 *                                  the ONE breakpoint (**AC-34**).
 *   `MonitorShell`     (L-06)      Operations › Live Dispatch, and nothing else.
 *   `FullBleedEditorShell` (L-05)  the plan editor, and nothing else.
 *
 * Rules applied
 *   §7.1 (amended, V5 · D-2′) **`width: 'full' | 'capped'` is DELETED. Every
 *               single-column page is full width with a `--ev-page-pad`
 *               (32px) inline gutter.**
 *
 *               The prop was not mis-tuned, it was working as designed, and the
 *               design was the defect: two sibling sub-tabs in the same
 *               workspace put their `<h1>` in two different places — measured at
 *               **244px apart at 1920** between `/management/performance`
 *               (capped, centred) and `/management/zones` (full). Nothing else
 *               about them differs, so an operator reads the movement as
 *               breakage.
 *
 *               **Full, not capped-everywhere.** Capping the PAGE centres the
 *               whole block and moves the header with it, which is the cause,
 *               not the cure. Shopify keeps alignment fixed by running index
 *               pages full-bleed with a uniform page padding — measured, content
 *               starts at x = 264 on both `products-list-default.webp` (a dense
 *               table) and `customers-empty-state.webp` (an empty state). **The
 *               page frame is the constant; what varies is what sits inside it.**
 *
 *               **Measure is not abandoned, it moves down one level**, to where
 *               the long-line problem actually occurs:
 *                 metric tile row (P5)   auto-fill minmax(268px, 1fr), 4 cols
 *                                        above `--ev-bp-wide`, 3 below
 *                 form field column      `max-width: 640px` inside its card
 *                 prose / empty body     `max-width: 384px`
 *
 *               `--ev-page-max: 1120px` survives with one consumer,
 *               `FullBleedEditorShell` (§7.3), which is outside the layout and
 *               has no sibling to be inconsistent with.
 *   §7.4/AC-14  `MonitorShell` was already full width with no cap, and stays
 *               that way. It is no longer the exception — everything is.
 *   §7.2/AC-34  below `--ev-bp-wide` the right rail **restacks BENEATH the main
 *               column, in its original order, at full width. No card is
 *               dropped, collapsed by default, or reordered**, and the page
 *               loses its max-width cap. The 2 : 1 ratio BINDS; the px are
 *               indicative (R13).
 *   §7.2        a task-shaped page's confirming action returns to the PAGE
 *               HEADER as the single primary at base width — the only
 *               layout-dependent action move in the product. `DetailPage`
 *               reports the width so the caller can honour it without a second
 *               media query.
 *   §7.3/AC-13  the full-bleed editor **unmounts the shell entirely**: no rail,
 *               no sub-tab column, no app top bar. Its own 48px bar carries
 *               exit, the name, the status badge and `Save`.
 *   §7.4/AC-14  the monitoring shell **keeps the shell**. §8.1 explicitly
 *               rejects §2.5's full-bleed mapping for the live map: only the
 *               content region goes full width with no cap, and the standard
 *               page header remains.
 *   §0.1        there is ONE breakpoint and it is `wide:` (1344px). Any second
 *               one is a finding against the design spec, not a local decision.
 *   R-3 §1.3    the content ground carries no elevation — and under D7 nor do
 *               the cards in any visible sense: tier 1 is measured at ZERO in
 *               the reference and now paints nothing. A card is carried by a
 *               1px `--ev-hairline` border and an 8px radius (D-11). The tier
 *               keeps its name so the ladder is not deleted.
 *   D-11        **there is no canvas/card tonal step.** The content region is
 *               `#ffffff` edge to edge and so is a card. §6.3 D1 is NARROWED
 *               to "white on white *without a border*", which is what the
 *               legacy app shipped.
 */

import type { ReactNode } from 'react'
import { mirrorGlyph, type Direction, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'

/**
 * The content block every page shape shares: full width of the content region,
 * `--ev-page-pad` all round, and no cap. Written once so no page shape can
 * drift from another — a page header that lands somewhere different depending
 * on the route is exactly the defect V5 removed, and one shared constant is
 * what makes that structural rather than a review item.
 *
 * **The gutter is `--ev-page-pad` (32px), up from a literal 16 — D-2'.** V5's
 * "one page width" survives; only its literal moved into a token. This is the
 * single largest deliberate departure from the reference in the whole re-skin
 * and the arithmetic is why: Navattic spends **68px** a side, but at D2's
 * 1280px floor Eyvar's content region is 976px, and 68 would leave 840px for
 * index tables that run six to nine columns — 78px less than the effective 918
 * they had, i.e. it would clip. At 32, and with the card gone from index pages,
 * the table gets 912px. Verification is required and is fix-list item 9, which
 * belongs to the table engineer: re-measure `scrollWidth === clientWidth` on
 * all four People views at 1280. **If a view clips, the identity column's
 * `min-w` drops first. Do not "fix" it by shrinking this gutter.**
 *
 * **D-2′ AMENDED — `04-index-screen-redesign.md` §1.2, §14.3, §15.1.** The
 * gutter is 32 below `--ev-bp-wide` and **48 at and above it**. It arrives
 * through the **existing** `wide:` variant, so no token is redefined inside a
 * media query and there is still exactly one `@media (min-width:)` in `dist` —
 * which is the one-breakpoint check's actual test. `--ev-page-pad` itself is
 * unchanged at 32; the step is `--ev-page-pad-wide`. This closes finding 2 of
 * `03-navattic-language.md` §11.
 *
 * **The block padding is 24, not 32 — §1.2's band table.** 24 is "the page's
 * own edge" and it is one of the composition's four gap values (24 · 20 · 12 ·
 * 0). The inline gutter is a column budget and the block padding is a rhythm;
 * they were the same number by accident, not by derivation.
 *
 * **D-19 — the block is a FLEX COLUMN that fills the content region.**
 * `h-full min-h-0 flex flex-col`, so a page whose body is a bounded scroller
 * (an index table, §7.2) can take `flex-1 min-h-0` and own its own overflow,
 * and the pagination row beneath it is on screen at any page length. A page
 * whose body is ordinary content is unaffected: nothing claims the residual, so
 * everything keeps its natural height and `<main>`'s own `overflow-y-auto`
 * still scrolls it when it is taller than the region.
 *
 * There is no `width` prop and there is not meant to be one. If a specific
 * block of content needs a measure, it constrains ITSELF (see §7.1 above).
 */
const PAGE_BLOCK =
  'flex h-full min-h-0 w-full flex-col px-page-pad py-6 wide:px-page-pad-wide'

/* ───────────────────── L-03 · single column (§7.1) ───────────────────── */

export interface SingleColumnPageProps {
  /** §11.4 — zero or ONE banner, spanning the whole content block. */
  banner?: ReactNode
  header?: ReactNode
  children: ReactNode
  /** V-11 — one centred `Learn more about {resource}.` OUTSIDE the card. */
  learnMore?: ReactNode
}

export function SingleColumnPage({
  banner,
  header,
  children,
  learnMore,
}: SingleColumnPageProps) {
  return (
    /* ONE width, every route. There is no `width` prop to get wrong, which is
       the point: the page header lands in the same place whichever sub-tab you
       are on. The header is INSIDE the cap, so §8's alignment rule — "the
       title's inline-start edge is the first card's inline-start edge" — holds
       by construction rather than by review. */
    <div className={PAGE_BLOCK}>
      {/* §1.2 — band 1 takes a declared **20** beneath it: *"a different kind
          of thing starts here"* — identity ends, controls begin. It is the only
          20 in the composition, and `PageHeader` already carries it as its own
          block-end padding, so this slot adds none. */}
      {header && <div className="shrink-0">{header}</div>}
      {banner && <div className="shrink-0">{banner}</div>}
      {/* D-19 — the body claims the residual. A page whose body is a bounded
          scroller uses it; one whose body is ordinary content does not grow
          into it, because nothing inside asks for the height. */}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {learnMore && <div className="shrink-0 pt-3 text-center">{learnMore}</div>}
    </div>
  )
}

/* ───────────────────────── L-04 · detail (§7.2) ───────────────────────── */

export interface DetailPageProps {
  banner?: ReactNode
  header?: ReactNode
  /** Primary content. Form fields stay HERE, never in the rail (§2.2). */
  main: ReactNode
  /**
   * §2.2 — the rail holds **only** status, publishing, summary and metadata.
   * Rail cards are read-only displays with an edit affordance, never inline
   * forms. Below the breakpoint these restack beneath `main` **in this exact
   * order** (**AC-34**), which is why it is an array and not a slot.
   */
  rail: ReactNode[]
}

export function DetailPage({ banner, header, main, rail }: DetailPageProps) {
  return (
    /* Same block as the single column, so a level-3 detail's `<h1>` lands where
       its parent sub-tab's did. §7.2's "the page loses its max-width cap" below
       the breakpoint is now vacuous — there is no cap at any width. */
    <div className={PAGE_BLOCK}>
      {header}
      {banner}
      {/* ONE breakpoint. Below it: a single column, so the rail cards fall
          beneath the main column in source order, at full width, with nothing
          dropped or collapsed. Above it: `minmax(0,1fr) 320px` with a 16px
          gutter, from the `--grid-template-columns-detail` token. */}
      <div className="grid grid-cols-1 gap-4 wide:grid-cols-detail">
        <div className="flex min-w-0 flex-col gap-3">{main}</div>
        <div className="flex flex-col gap-3">{rail}</div>
      </div>
    </div>
  )
}

/* ──────────────────────── L-06 · monitor (§7.4) ──────────────────────── */

export interface MonitorShellProps {
  header?: ReactNode
  banner?: ReactNode
  /** The map canvas. `min-height: 360px` (§7.4). */
  canvas: ReactNode
  /** The 340px side list. ONE selection model across both panes (§7.4). */
  aside: ReactNode
}

export function MonitorShell({ header, banner, canvas, aside }: MonitorShellProps) {
  return (
    /* AC-14 — the shell STAYS. Only the content region goes full width, with
       NO max-width cap, and the standard page header remains. Since V5 that is
       what every page shape does, so AC-14 is satisfied by the shared block
       rather than by an exception. */
    <div className={PAGE_BLOCK}>
      {header}
      {banner}
      <div className="grid grid-cols-1 gap-4 wide:grid-cols-monitor">
        <div className="min-w-0">{canvas}</div>
        <div className="flex flex-col gap-3">{aside}</div>
      </div>
    </div>
  )
}

/* ───────────────────── L-05 · full-bleed editor (§7.3) ───────────────────── */

export interface FullBleedEditorShellProps {
  title: string
  /** The plan's status badge, beside the name (§7.3). */
  badge?: ReactNode
  onExit: () => void
  /** §2.5 — greyed when there is nothing to save. */
  onSave: () => void
  canSave: boolean
  children: ReactNode
  t: Translate
  dir: Direction
}

export function FullBleedEditorShell({
  title,
  badge,
  onExit,
  onSave,
  canSave,
  children,
  t,
  dir,
}: FullBleedEditorShellProps) {
  return (
    /* AC-13 — neither the rail, nor the sub-tab list, nor the app top bar is
       in the DOM. This component is rendered OUTSIDE `AppLayout`, which is what
       makes that true structurally rather than by a hidden class. */
    <div className="flex h-screen w-full flex-col bg-background">
      <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-border px-4">
        <Button variant="ghost" size="icon" onClick={onExit} aria-label={t('shell.topbar.back')}>
          {/* §7.3 — `⇤` mirrors to `⇥` in Arabic, at string-construction time. */}
          <span aria-hidden="true" className="text-base leading-none">
            {mirrorGlyph('⇤', dir)}
          </span>
        </Button>
        <span className="truncate text-sm font-semibold text-foreground">{title}</span>
        {badge}
        <div className="flex-1" />
        <Button variant="default" onClick={onSave} disabled={!canSave}>
          {t('shell.saveBar.save')}
        </Button>
      </header>

      {/* §7.3 — capped 1120px, centred. **The one surviving consumer of
          `--ev-page-max`** (V5): the editor is outside `AppLayout` and has no
          sibling route to be inconsistent with, so a centred measure costs
          nothing here and buys a readable form. No inspector panel: §2.5
          recommends one for multi-mode editors and the plan editor has one
          mode. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-page p-4">{children}</div>
      </div>
    </div>
  )
}
