/**
 * The four page shapes — design spec §7, spec §3.10. **Every destination
 * resolves to exactly one**, and the shape comes from the route table
 * (`row.shape`), never from the screen.
 *
 *   `SingleColumnPage` (L-03)      32 of the 34 sub-tabs. `full` | `capped`.
 *   `DetailPage`       (L-04)      the 4 level-3 details + the profile's
 *                                  full-page escape. 2 : 1, restacking below
 *                                  the ONE breakpoint (**AC-34**).
 *   `MonitorShell`     (L-06)      Operations › Live Dispatch, and nothing else.
 *   `FullBleedEditorShell` (L-05)  the plan editor, and nothing else.
 *
 * Rules applied
 *   §7.1        `capped` is `max-width: 1120px` **centred on the CONTENT
 *               REGION, not the viewport** (§2.2). 1120 = four metric tiles at
 *               268 plus three 16px gutters; Shopify's ~955 is indicative only
 *               (R13).
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
 *   R-3 §1.3    the canvas carries no elevation; the CARDS inside it carry
 *               tier 1, through `card.tsx`.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { mirrorGlyph, type Direction, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'

/* ───────────────────── L-03 · single column (§7.1) ───────────────────── */

export interface SingleColumnPageProps {
  /** `full` for index tables, ledgers, work queues and the activity log;
   *  `capped` for every Overview and every settings sub-tab (§7.1). */
  width?: 'full' | 'capped'
  /** §11.4 — zero or ONE banner, spanning the whole content block. */
  banner?: ReactNode
  header?: ReactNode
  children: ReactNode
  /** V-11 — one centred `Learn more about {resource}.` OUTSIDE the card. */
  learnMore?: ReactNode
}

export function SingleColumnPage({
  width = 'full',
  banner,
  header,
  children,
  learnMore,
}: SingleColumnPageProps) {
  return (
    <div className={cn('w-full p-4', width === 'capped' && 'mx-auto max-w-page')}>
      {header}
      {banner}
      {children}
      {learnMore && <div className="pt-3 text-center">{learnMore}</div>}
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
    <div className="w-full p-4">
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
       NO max-width cap, and the standard page header remains. */
    <div className="w-full p-4">
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

      {/* §7.3 — capped 1120px, centred. No inspector panel: §2.5 recommends one
          for multi-mode editors and the plan editor has one mode. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-page p-4">{children}</div>
      </div>
    </div>
  )
}
