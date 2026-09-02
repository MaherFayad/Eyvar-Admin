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
 * **D-19 — the block is a FLEX COLUMN that fills the content region.** A page
 * whose body is a bounded scroller (an index table, §7.2) claims the residual
 * and owns its own overflow, so the pagination row beneath it is on screen at
 * any page length.
 *
 * **D-19 AMENDED — the height rule is not one constant, and that is the whole
 * shell defect.** A hundred-percent height pins the block to the content region
 * exactly, so anything taller than the region has two ways out and both are
 * wrong: a flex child with a shrink factor is SQUEEZED to fit, and a child that
 * will not squeeze overflows a box that contributes no scroll height of its own.
 * Measured on `/management/zones` at 1440 x 900 before the change: the content
 * region reported `clientHeight` 848 against `scrollHeight` 890 — 42px of
 * travel — while the zone table's own box sat at y = 893 and ran to 1343.
 * **The table was 495px below a page that would not scroll.**
 *
 * **The naive repair — swap the height for a min-height everywhere — breaks
 * every index page, and the reason is worth writing down because nothing about
 * it is visible in the class list.** A `min-height` leaves the block's main size
 * INDEFINITE, and under an indefinite main size a percentage flex basis resolves
 * to `content` (Flexbox §7.2.3). The bodies below declare a zero-percent basis
 * to claim the residual; against an indefinite parent that zero silently becomes
 * *the full height of the table*, the block grows to it, and the bounded
 * scroller every index page is built on stops being bounded. Measured after that
 * one-word change: `/operations/people` went from `scrollHeight` 848 — the
 * bounded page, pagination on screen — to 1779.
 *
 * So the two shapes take two rules, and **which one a page is, is declared**
 * (`SingleColumnPageProps.body`):
 *
 *   fill  a definite height, exactly as before. The body's zero basis resolves
 *         to zero, it claims the residual, the table owns the overflow.
 *   flow  a minimum height. The block sizes to its content and `<main>` scrolls
 *         it. No descendant may claim the residual — there isn't one — which is
 *         why `flow`'s body declares no flex at all.
 *
 * `DetailPage` and `MonitorShell` are `flow`-shaped by construction: their
 * bodies are grids, nothing claims a residual, and a minimum height is what
 * lets a long detail page scroll instead of overflowing a pinned box.
 *
 * There is no `width` prop and there is not meant to be one. If a specific
 * block of content needs a measure, it constrains ITSELF (see §7.1 above).
 *
 * **The "no cap" clause above is now a cap, and V5 is the reason rather than
 * the casualty.** V5's rule is that the page header lands in the same place
 * whichever route you are on, enforced by there being no `width` prop; one
 * measure applied to every page block keeps that exactly — every route still
 * has ONE width. What changes is only what that width does above 1440, where
 * the product had never been measured: the owner's 2400px screen rendered a
 * 1,955px content region, and the residual had nowhere to stop, so a ledger's
 * opening balance ended up **1,828px** from the number it names.
 *
 * `--ev-page-measure` carries the arithmetic for 1440 and the proof that no
 * layout at or below a 1440px viewport moves by a pixel. `mx-auto` centres the
 * surplus rather than pooling it all at the inline-end, which also keeps the
 * page symmetric under `dir="rtl"` without a second rule.
 */
const PAGE_BLOCK =
  'mx-auto flex min-h-full w-full max-w-measure flex-col px-page-pad py-6 wide:px-page-pad-wide'

/**
 * The `fill` variant. Its hundred-percent height is what makes the main size
 * DEFINITE, and so is load-bearing for the body's zero basis; its zero minimum
 * height lets the block be shorter than its content, which is what allows the
 * body to bound the table rather than being pushed by it. Both are named in
 * words on purpose — Tailwind v4 scans comments as plain text and mints what it
 * finds, so a class written here is a rule shipped in `dist`.
 */
const PAGE_BLOCK_FILL =
  'mx-auto flex h-full min-h-0 w-full max-w-measure flex-col px-page-pad py-6 wide:px-page-pad-wide'

/* ───────────────────── L-03 · single column (§7.1) ───────────────────── */

export interface SingleColumnPageProps {
  /** §11.4 — zero or ONE banner, spanning the whole content block. */
  banner?: ReactNode
  header?: ReactNode
  children: ReactNode
  /**
   * **D-19 — which of the two body shapes this page is, DECLARED.** Inferring
   * it is what produced the `/management/zones` defect: one shape was assumed
   * for every route, and a page that is a stack of several tall regions got the
   * bounded-scroller treatment and was squeezed into a region it could not fit.
   *
   * `'fill'` (the default, and 32 of the 34 sub-tabs) — **the body IS the
   * scroller.** An index page whose one body element is a `DataTable`: the body
   * claims the region's residual height, the table owns its own overflow, and
   * the pagination row and the horizontal scrollbar are on screen at any page
   * length. The page itself does not scroll.
   *
   * `'flow'` — **the body is a STACK and the page scrolls.** A page that puts
   * two or more tall regions on top of each other (a map AND a table) has more
   * content than one viewport by construction; there is no residual to claim
   * and pretending otherwise squeezes every region at once. The body sizes to
   * its content and `<main>` scrolls it. A `DataTable` in this position renders
   * at its full height rather than inside a bounded scroller — it reads the
   * shape off its parent, so nothing is passed down.
   */
  body?: 'fill' | 'flow'
  /** V-11 — one centred `Learn more about {resource}.` OUTSIDE the card. */
  learnMore?: ReactNode
}

export function SingleColumnPage({
  banner,
  header,
  children,
  body = 'fill',
  learnMore,
}: SingleColumnPageProps) {
  return (
    /* ONE width, every route. There is no `width` prop to get wrong, which is
       the point: the page header lands in the same place whichever sub-tab you
       are on. The header is INSIDE the cap, so §8's alignment rule — "the
       title's inline-start edge is the first card's inline-start edge" — holds
       by construction rather than by review. */
    <div className={body === 'flow' ? PAGE_BLOCK : PAGE_BLOCK_FILL}>
      {/* §1.2 — band 1 takes a declared **20** beneath it: *"a different kind
          of thing starts here"* — identity ends, controls begin. It is the only
          20 in the composition, and `PageHeader` already carries it as its own
          block-end padding, so this slot adds none. */}
      {header && <div className="shrink-0">{header}</div>}
      {banner && <div className="shrink-0">{banner}</div>}
      {/* D-19 — `fill` claims the residual so the body can be the bounded
          scroller; `flow` sizes to its content so the page scrolls instead.
          The zero-basis growth is what makes the first one bounded, and it is
          exactly what makes the second one collapse, which is why the two are
          different declarations rather than one clever class. */}
      <div className={body === 'flow' ? 'flex flex-col' : 'flex min-h-0 flex-1 flex-col'}>
        {children}
      </div>
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
  /**
   * Section 2.5's inspector panel — what the edit in progress DOES, shown while
   * it is being made. Sticky beside the form at and above 1344px; in the flow
   * beneath it below that. Omit for an editor whose edits have no computable
   * consequence to show.
   */
  aside?: ReactNode
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
  aside,
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
          nothing here and buys a readable form.

          **§2.5's INSPECTOR PANEL, added.** The note here used to read *"No
          inspector panel: §2.5 recommends one for multi-mode editors and the
          plan editor has one mode"*, and the mode count was the wrong test. The
          plan editor already computed a full worked example and a formula
          panel — it simply rendered them as the last two cards of a ~1,600px
          scrolling form, so a pricing owner editing `Commission %` could not
          see what their edit did to the numbers without scrolling past every
          field they had just filled in and then scrolling back. A preview below
          the fold is not a preview; it is an appendix.

          What §2.5 is actually about is whether an edit has CONSEQUENCES the
          editor can show while you make it. This one does, and they recompute
          on every keystroke.

          The aside is `sticky` rather than fixed so it scrolls with short
          content and pins for long, and it is omitted entirely below 1344px —
          two columns of a 1120px measure would leave the form at ~700px and
          the plan editor's field pairs are declared at half-width, so they
          would collapse. Below `wide:` the aside renders in the flow beneath
          the form, which is where it was before, and nothing is lost. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div
          className={
            aside
              ? 'mx-auto flex w-full max-w-measure flex-col gap-4 p-4 wide:flex-row wide:items-start'
              : 'mx-auto w-full max-w-page p-4'
          }
        >
          <div className={aside ? 'min-w-0 flex-1' : undefined}>{children}</div>
          {aside && (
            <aside className="w-full shrink-0 wide:sticky wide:top-4 wide:w-104">{aside}</aside>
          )}
        </div>
      </div>
    </div>
  )
}
