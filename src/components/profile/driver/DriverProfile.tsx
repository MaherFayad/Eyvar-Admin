/**
 * The captain sheet's body — **one column**: a 2x2 summary over a column of
 * four tabs, across the seven reads `reads.ts` declares.
 *
 * ```
 *  +---------------------+---------------------+
 *  | Standing            | Documents           |   the summary - bg-muted,
 *  | Under review        | Expiring            |   2x2 at every width
 *  +---------------------+---------------------+
 *  | Earnings            | Subscription slots  |
 *  | 652.60  SAR         | 1                   |
 *  +---------------------+---------------------+  <- a BLOCK-axis seam
 *  | Documents 5 | Earnings | Activity 20 | Identity |   the detail - bg-card
 *  | ---------------------------------------------- |
 *  | Registration                                 v |
 *  | < Expiring >  19 Jul 2026 . 24 days left       |
 *  +------------------------------------------------+
 * ```
 *
 * ## The rail is gone, and it was never a choice
 *
 * This rendered `flex-row` with a `compact` column override. **`compact` is
 * `@media (width < 768px)` — a viewport query** — so a 480px panel inside a
 * 1280px viewport never matched it, and the sheet has been a two-column 480px
 * drawer at every width an operator uses since the day it shipped. Nobody chose
 * that; the override simply never fired.
 *
 * Measured in Chromium at 1280x900 on `DRV-0101` before the change: the sheet
 * body wanted **542px in a 479px box** in English, the four-tab row wanted
 * **367 in 287** with `Identity` past the drawer's edge, and the summary's
 * `Expiring` wanted **140 in 127**. The rider profile met the same arrangement,
 * measured it at 480 / 560 / 640, found it first clean at 640 — precisely the
 * width `sheet.tsx` C12 refuses in writing — and **restacked instead of
 * widening**. D-CP-4 does the same here.
 *
 * **Do not propose widening the drawer.** It has now been measured and refused
 * three times: `sheet.tsx` §1.2 / C12, the rider spec §6.1, and this screen.
 * `--ev-drawer-w`, `globals.css`, `ShellLayer` and `sheet.tsx` are unchanged by
 * it.
 *
 * A two-column 480px drawer was never a distinction from the rider sheet; it
 * was an overflow. The distinction is rebuilt out of composition instead —
 * D-CP-1 the band's two meta rows, D-CP-2 the 2x2 summary, D-CP-3 the ink block
 * heading, D-CP-5 the deadline order, D-CP-6 no filled button, D-CP-7 the
 * expanding row — none of which needs a pixel of width or a new colour.
 *
 * ## The standing banner sits above the summary
 *
 * §11.4 gives the surface **zero or one** banner and puts it above the content,
 * not inside a column. A suspension changes what the console will let an
 * operator do with this record, which is what earns it that place; the
 * `Standing` block below still carries the status word and its reasons, because
 * a banner is an announcement and not a place to keep facts.
 *
 * ## Where the reads live, and why here rather than in the blocks
 *
 * The `Documents` tab's badge counts the same file the `Documents` **block**
 * reads, and the two sit in different columns. A read owned by either one could
 * not reach the other, and a second read to feed the badge would be two requests
 * racing for one number — the defect `record.ts` records against its own earlier
 * shape. So all seven are owned above both columns, by `useDriverReads`, and
 * both columns are handed the same results.
 *
 * `useDriverReads` is exported from `reads.ts` and the **full page calls the
 * same hook**. That is what makes §3's parity contract structural here rather
 * than test-enforced: the two surfaces cannot be looking at different rows,
 * because there is only one query.
 *
 * Rules applied
 *   §11.3      the loading state is `DriverSkeleton` — the same one column, the
 *              same 2x2 summary, the same tab row. Never a spinner.
 *   §9.2 #14   each read owns its own four states inside the block or panel that
 *              renders it, so one failed collection does not take the sheet
 *              down and the layer stays dismissible.
 *   §9.1       **the seam between the summary and the tabs is now a BLOCK-axis
 *              rule** (`border-b`, on `DriverRail`), not the `border-e` it used
 *              to be. That is the entire mirroring cost of the restack: the
 *              inline edge that had to mirror no longer exists.
 */

import { Banner } from '@/components/Banner'
import type { Driver } from '@/data/types'
import type { Language, Translator } from '@/lib'
import { DriverPanels } from './DriverPanels'
import { DriverRail } from './DriverRail'
import { standingBanner } from './facts'
import type { DriverReads } from './reads'

export interface DriverProfileProps {
  driver: Driver
  /** The seven collection reads. The RECORD is the layer's. */
  reads: DriverReads
  /** The instant document countdowns are measured against (`useNowIso`). */
  nowIso: string
  /** Where the two navigations go. Built by the caller from the route table. */
  complianceHref: string
  payoutsHref: string
  /** `view_operations` / `view_finance` — whether each route accepts this operator. */
  canOpenCompliance: boolean
  canOpenPayouts: boolean
  t: Translator
  language: Language
}

export function DriverProfile({
  driver,
  reads,
  nowIso,
  complianceHref,
  payoutsHref,
  canOpenCompliance,
  canOpenPayouts,
  t,
  language,
}: DriverProfileProps) {
  const banner = standingBanner(driver, t, language)

  return (
    /* **`-m-3` cancels `ShellLayer`'s body padding, deliberately.** The summary
       is a GROUND, and a ground that stops 12px short of the sheet's edge reads
       as a card that failed to fill rather than as a band. The band above it
       already bleeds for the same reason. The utility is symmetric, so it
       mirrors. */
    <div className="-m-3 flex min-h-full flex-col">
      {banner && (
        /* §11.4 — one banner, above the content and above the summary.
           `role="status"`: it announces a condition that is *true*, not a
           rejection of something the operator just attempted, and `role="alert"`
           interrupts whatever they were reading (AC-678). */
        <div className="border-b border-border px-4 py-3">
          <Banner banner={banner} variant="card" role="status" />
        </div>
      )}

      {/* One column, unconditionally (D-CP-4). No `compact` variant, because a
          `compact` variant here could never have fired: the panel is 480px
          inside a viewport that is not. */}
      <DriverRail driver={driver} reads={reads} nowIso={nowIso} t={t} language={language} />
      <div className="flex min-h-full flex-1 flex-col">
        <DriverPanels
          driver={driver}
          reads={reads}
          nowIso={nowIso}
          complianceHref={complianceHref}
          payoutsHref={payoutsHref}
          canOpenCompliance={canOpenCompliance}
          canOpenPayouts={canOpenPayouts}
          t={t}
          language={language}
        />
      </div>
    </div>
  )
}
