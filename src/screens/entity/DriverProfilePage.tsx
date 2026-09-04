/**
 * **The captain's full profile page** — `/entity/:entityId` where the record is
 * a driver.
 *
 * ```
 *  ┌ band ─────────────────────────────────────────────────────────────────┐
 *  │ ←  CAPTAIN · DRV-0101                                                 │
 *  │    Ahmed Salem                                                        │
 *  │    ★★★★★ 4.9 │ Riyadh                                                 │  the person
 *  │    Corolla 2022 · White · Economy                                     │  the vehicle
 *  ├ banner (only when one stands) ────────────────────────────────────────┤
 *  │ ⚠ This captain is suspended                                           │
 *  ├ strip — 4 across at --ev-bp-wide, 2 × 2 below it, NEVER one column ───┤
 *  │ Standing         │ Documents  │ Earnings      │ Subscription slots    │
 *  │ Under review     │ Expiring   │ 652.60 SAR    │ 1                     │
 *  │ 1 open complaint │ Reg. 19 Jul│ payable       │ 4 of 5 slots taken    │
 *  ├ tab row — ?view=, NOT local state ────────────────────────────────────┤
 *  │  Documents  │  Earnings  │  Activity  │  Identity                     │
 *  ├────────────────────────────────────────────────────────────────────────┤
 *  │  the panel — the FULL width of the page block. There is no rail.       │
 *  └────────────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Owner amendment 2 — the page is tabbed and single-column (§4B)
 *
 * The owner's report was *"this is so hard to get anything"*, and the count
 * behind it was worse than reported: **twenty-five label/value rows in four rail
 * cards**, at one rank, with `Identity` (8) and `Device` (4) below the fold.
 *
 * **The rail is gone (D-CP-12), and one test removed it:** *must this be true on
 * every tab?* Nothing passed. Performance, Identity, Device and `Elsewhere in
 * the console` are reference data. The payout account's *state* is a gate — its
 * destination is not — and the state moves into `standingFlags`, which renders
 * in the strip, above the tab row, on every tab.
 *
 * **And a defect closes with it.** This header used to record that *"at 1440 the
 * main column is ~696px against the ledger's 832px budget, so the table
 * scrolls"*. Without the rail the panel is **872–1040px** at every supported
 * width and in both languages, so the sideways scroll — open since the page
 * shipped, and named in the rider spec §14 A — **stops happening**.
 *
 * ## What makes this a captain's page and not a rider's with different words
 *
 * Four structural choices, each grounded in a fact about the record rather than
 * in decoration:
 *
 * 1. **The strip leads with `Standing`**, and it is outside the tabs. A rider's
 *    first question is what they can spend; a captain's is whether they may work
 *    at all. Everything else is moot behind a suspension — which is also why the
 *    band, the banner and the strip are never inside a tab (D-CP-9): **a tab may
 *    hide a fact; it may not hide a gate.**
 * 2. **`Documents` is the default tab.** Five documents expire on their own and
 *    take a captain off the road with nobody acting. Nothing on a rider record
 *    expires, and `?view=documents` is the value that is never written.
 * 3. **The money band is a payable, not a wallet, and it runs the other way.**
 *    A credit means Eyvar owes this captain *more*. The convention is a real
 *    `<caption>` on the table (AC-308) because it is the opposite of every other
 *    ledger an operator reads in this console.
 * 4. **The rider page is `DetailPage` — main plus rail, no tabs.** This one is a
 *    single column with four addressable tabs. That is a bigger silhouette
 *    difference than anything D-CP-1…6 bought, and it is why converging the
 *    captain's two surfaces on one tab set costs the captain-vs-rider
 *    distinction nothing (§4B.3).
 *
 * ## The band is `BoardBand shape="inset"`, not a new component
 *
 * The sheet's band (`components/profile/driver/DriverBand.tsx`) embeds
 * `SheetClose` and `SheetTitle` and so cannot mount on a route. `BoardBand` is
 * the product's existing `--ev-hero` field with the measure, the padding token
 * and the block inset already solved. **The band's CONTENT is `bandPersonMeta()`
 * and `bandVehicleMeta()` — the same pair the sheet's band calls**, so the two
 * cannot disagree about a fact (§3). That is the improvement over the rider
 * wave, whose two bands build the same row from two copies of the same
 * expression. D-CP-1 splits the row; see `DriverBandBlock` below.
 *
 * ## What dropping `PageHeader` costs, stated so it stays visible
 *
 * §8 slot 1 is rebuilt here and could not have been kept: `PageHeader.onBack` is
 * a `() => void`, so it can only ever be a button calling a handler, and this
 * page's back affordance must be an `<a href>` with a real destination. Slots 2
 * and 3 move into the band unchanged. **What is genuinely lost is a
 * MECHANISM:** slot 4a's two-secondary cap with its `More actions ▾` spill and
 * slot 4c's one-primary cap are enforced inside `PageHeader` and this band has
 * no equivalent. Today they hold by construction — the band carries no actions
 * at all, and the only filled button on the page is the document list's. **The
 * day someone adds a third action to this band, nothing will stop them**, and
 * that is the moment to extract the cap rather than to rediscover it. The rider
 * page records the identical finding; it is one fix, for both.
 *
 * ## The ledger no longer needs a `below` band, and that is the point
 *
 * The rider spec §14 A asked `DetailPage` to grow a `below` slot for a
 * full-width ledger, and this page shipped the fallback: the table scrolled
 * sideways because the main column was 568–704px against an 832px budget.
 * **D-CP-12 solves it by removing the thing that was taking the width.** The
 * panel is the full page block, the ledger fits, and no shell slot was added:
 * `SingleColumnPage` already ships every slot this page needs, so
 * `PageShell.tsx` is untouched.
 *
 * ## The four states
 *
 * Owned here for the page, and per-block for everything that fetches
 * independently. The band renders **in full in every state** — a header that
 * appears after the data is a layout shift on every navigation — and the back
 * arrow is enabled in all four, including the 404, where it is the one control
 * that must still work.
 *
 * **The tab row is never replaced by an error** (§4B.9). A failed record read
 * puts `ErrorState scope="card"` inside the PANEL and leaves the row operable,
 * because an operator whose ledger read failed must still be able to reach
 * Documents. That is why `recordError` is a node rendered per panel rather than
 * a branch wrapped around the whole `Tabs`.
 *
 * Rules applied
 *   D-CP-12     `SingleColumnPage body="flow"`. No rail, no `SideCard`, and
 *               **AC-34 is not engaged** — it governs how a rail restacks and
 *               there is no rail to restack.
 *   §11.4       ZERO OR ONE banner, in the shell's own slot, above the tab row.
 *               `standingBanner` picks the more severe condition; never two.
 *   §5.1        `--ev-hero`, not `--ev-brand`: a brand-coloured SURFACE is a
 *               different token from a brand-coloured control.
 *   §8          the band carries slots 1–3; the page mounts no `PageHeader` and
 *               has exactly one `<h1>`, the name.
 *   D18/X-4     no uppercase-plus-letter-spacing label off the band.
 *   R5a         no red anywhere. A suspension is reversible and
 *               `commands/captains.ts` already ruled it *"blue, not red"*.
 *   §9.1        logical utilities only; the strip's dividers are
 *               `border-inline-start`, never `border-l`.
 */

import { BoardBand } from '@/components/metrics'
import { Banner } from '@/components/Banner'
import { SingleColumnPage } from '@/components/PageShell'
import { ErrorState } from '@/components/ErrorState'
import { SectionHeading } from '@/components/metrics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FieldList } from '@/components/profile/fields'
import {
  DriverDeductions,
  DriverDocuments,
  DriverSupportPresenceCard,
  DriverStrip,
  FigureGrid,
  NavigateControl,
  TabCount,
  bandPersonMeta,
  bandVehicleMeta,
  deviceFields,
  drivingFigures,
  identityFields,
  payoutAccountFields,
  periodFigures,
  standingBanner,
  tabCounts,
  useDriverReads,
} from '@/components/profile/driver'
import type { Driver, ProfileRef } from '@/data/types'
import { useScreenViews, type AsyncResult, type ScreenView } from '@/hooks'
import type { Direction, Language, Translator } from '@/lib'
import { ReturnControl } from './ReturnControl'
import { DriverEarningsTable } from './DriverEarningsTable'
import { DriverTripsTable } from './DriverTripsTable'

/* ──────────────────────────── the four tabs ─────────────────────────────── */

/**
 * **The sheet's four, in the sheet's order, from the sheet's four copy keys**
 * (§4B.3). `DriverPanels.tsx` declares the identical set; a second grouping
 * would mint eight strings for facts that already have names, and would break
 * an operator's position on the documented `Open full profile` → `ReturnControl`
 * round trip.
 *
 * The ids are the `?view=` values. `documents` is the default and is the value
 * that is never written — D-CP-5's argument as a landing: *what is about to
 * stop this captain driving*.
 */
const VIEWS: readonly ScreenView[] = [
  { id: 'documents', titleKey: 'profile.driver.tab.documents' },
  { id: 'earnings', titleKey: 'profile.driver.tab.earnings' },
  { id: 'activity', titleKey: 'profile.driver.tab.activity' },
  { id: 'identity', titleKey: 'profile.section.identity' },
]

const DEFAULT_VIEW = 'documents'

export interface DriverProfilePageProps {
  entity: ProfileRef
  /** The record read, owned by `EntityPageScreen` and shared with nothing else. */
  driver: AsyncResult<Driver>
  /** Resolved by `EntityPageScreen`: `location.state.from`, or the captain index. */
  backTo: string
  /** Already translated, and it names the destination. */
  backLabel: string
  /** Where the two navigations go — built from the route table by the caller. */
  complianceHref: string
  payoutsHref: string
  /** `view_operations` / `view_finance`. §11.2's two refusals on this page. */
  canOpenCompliance: boolean
  canOpenPayouts: boolean
  /** The instant document countdowns are measured against (`useNowIso`). */
  nowIso: string
  t: Translator
  language: Language
  dir: Direction
}

export function DriverProfilePage({
  entity,
  driver,
  backTo,
  backLabel,
  complianceHref,
  payoutsHref,
  canOpenCompliance,
  canOpenPayouts,
  nowIso,
  t,
  language,
  dir,
}: DriverProfilePageProps) {
  /* **The same hook the sheet calls.** One declaration of five queries, so the
     two surfaces cannot be looking at different rows — the parity contract made
     structural rather than test-enforced. `reads.ts` carries the argument. */
  const reads = useDriverReads(entity.entityId)

  const record = driver.data
  const banner = record === null ? null : standingBanner(record, t, language)
  const payout = reads.payout.data?.items[0] ?? null
  /* **The page shipped with NO counts**, deliberately: the sheet derived them
     inline and a second derivation here is the exact drift AC-CP-77 forbids.
     `tabCounts` is now the one copy in `facts.tsx` and both surfaces read it,
     so the two cannot print different numbers for one file. */
  const counts = tabCounts(reads, t, nowIso)

  /* **D-CP-10 — the tab is a LOCATION.** `useScreenViews` is the product's
     shipped `?view=` hook, on its seventh consumer; this page does not write a
     fallback of its own, because two fallbacks is how one of them stops
     matching. It resolves an unknown `?view=` to `documents` **without
     rewriting the URL** (`resolveRoute`'s AC-12 posture), and `selectTab`
     pushes through `withView`.

     **Nothing in the shell changes.** `routeState.ts:128` already reads `?view`
     into `base` and the `/entity/:entityId` branch spreads it. */
  const views = useScreenViews(VIEWS, DEFAULT_VIEW, t)

  /* The record is what every panel is built from, so its failure is the
     PANEL's — never the tab row's. An operator whose record read failed must
     still be able to reach another tab (§4B.9). */
  const recordError = (
    <ErrorState
      scope="card"
      message={t('state.overlayError.message')}
      action={{ label: t('state.overlayError.action'), onClick: driver.refetch }}
    />
  )

  return (
    <SingleColumnPage
      /* **D-19 `flow`, and it is a declaration rather than a default.** The
         page is a stack of tall regions — a band, a strip, a tab row and a
         panel that can hold a full ledger — so there is no residual height for
         a bounded scroller to claim. Under `flow` the `DataTable` on the
         Earnings tab renders at full height and `<main>` scrolls it, which is
         what stops the ledger being squeezed. */
      body="flow"
      header={
        <div className="flex flex-col gap-4 pb-5">
          <DriverBandBlock
            entity={entity}
            driver={record}
            backTo={backTo}
            backLabel={backLabel}
            t={t}
            language={language}
            dir={dir}
          />
          {record !== null && (
            <DriverStrip
              driver={record}
              reads={reads}
              nowIso={nowIso}
              t={t}
              language={language}
            />
          )}
        </div>
      }
      /* §11.4 — zero or ONE, in the shell's own slot, spanning the whole content
         block. `role="status"`: it announces a condition that is *true*, not a
         rejection of something the operator just attempted, and `role="alert"`
         interrupts whatever they were reading (AC-678).

         **Above the tab row by ruling (D-CP-9): a tab may hide a fact, it may
         not hide a gate.** Behind a tab, an operator reads a suspended
         captain's earnings without ever learning they are suspended. */
      banner={banner === null ? undefined : <Banner banner={banner} role="status" />}
    >
      {/* `gap-5` between the tab row and the panel — §1.2's *a different kind of
          thing starts here* step, and the same one the sheet uses. */}
      {/* **`activationMode="manual"`, and it is measured rather than preferred.**
          Radix defaults to automatic activation: an arrow key moves focus AND
          selection. Selection here pushes `?view=`, so under the default an
          operator arrowing the three steps from Documents to Identity pushed
          three history entries and then needed FOUR Back presses to leave the
          captain page — measured in Chromium, `history.length` 2 → 5 across
          three ArrowRight presses. A mouse user pushed one entry for the same
          journey, so the default penalised keyboard operation specifically.

          Manual activation is also what the ARIA practices ask for once
          activating a tab has a consequence beyond swapping a panel, which a
          URL push is. Arrow moves focus; Enter or Space commits. D-CP-10 is
          unaffected — the tab is still a location, it is just not entered by
          passing through it. The prop rides the `{...props}` spread on
          `ui/tabs.tsx`'s root, so the primitive is untouched. */}
      <Tabs
        value={views.activeTab}
        onValueChange={views.selectTab}
        activationMode="manual"
        className="gap-5"
      >
        {/* **`variant="line"`, not `segmented`.** `segmented` is `IndexToolbar`'s
            view-tab dress and these are not views over a dataset; `line` is what
            the sheet already ships, which keeps one tab grammar on the record.

            `h-auto` + `flex-wrap` is the behaviour of LAST RESORT, so a longer
            future label wraps rather than clipping or scrolling a control off
            the edge. It does not engage today: at 1280 in Arabic the content
            region gives 872px for four labels and two count chips. */}
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start">
          {/* **Counts on `Documents` and `Activity` only**, and the reason is
              the sheet's unchanged rule: a tab carries a count only when
              exactly one collection sits behind it and the server knows its
              total. `Earnings` holds the payable ledger AND the deduction list
              and their members overlap — an applied deduction IS a posting on
              that ledger — so any single number is a double count. `Identity`
              is a set of pairs, not a list of records.

              A count whose read is in flight is a `Skeleton`, never a `0` that
              guesses; a count whose read FAILED renders nothing, because a
              skeleton beside a tab that is not loading is a promise nothing
              will keep. The tab itself is never hidden and never disabled
              (AC-CP-76). */}
          {views.tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex-none">
              {tab.label}
              {/* Documents only. `counts.activity` counted the timeline's
                  server `total`, and the timeline is gone from both surfaces —
                  a number beside a tab that holds a trips table and a reference
                  list counts nothing the operator can see. `tabCounts` still
                  derives it; nothing renders it. */}
              {tab.id === 'documents' && (
                <TabCount value={counts.documents} language={language} />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── documents ─────────────────────────────────────────────────
            ONE section, and it carries NO heading: the tab already says the
            word, and a section that repeats its own tab's name is a line of
            chrome (§4B.8). */}
        <TabsContent value="documents" className="flex flex-col gap-8">
          {record === null ? (
            recordError
          ) : (
            <DriverDocuments
              result={reads.compliance}
              nowIso={nowIso}
              complianceHref={complianceHref}
              canOpenCompliance={canOpenCompliance}
              t={t}
              language={language}
            />
          )}
        </TabsContent>

        {/* ── earnings ──────────────────────────────────────────────────
            What you earned → what moved → what came off → where it goes →
            open payouts. One sentence, in that order (§4B.7). */}
        <TabsContent value="earnings" className="flex flex-col gap-8">
          {record === null ? (
            recordError
          ) : (
            <>
              {/* §4B.8 — the figure row leads the tab, above the movements it
                  summarises, and carries **no heading**.

                  **`Earnings this month` is not a duplicate of the ledger.**
                  `DriverEarningsTable` states the `liability.driver` position
                  and its postings; a month's earnings is an accrual over a
                  window. Nothing on this page sums, nets or otherwise combines
                  the two — `types/financials.ts` keeps the net off the record
                  deliberately and this screen does not compute one.

                  **The row names two different windows** — `Trips this period`
                  is `CaptainPayout`'s payout period, `Earnings this month` is a
                  calendar month, and `CaptainPayout` carries no bounds to
                  state. Each label names its own window; AC-CP-88 pairs them
                  and this file does not overturn it silently. Reported. */}
              <FigureGrid figures={periodFigures(record, payout, t, language)} />

              <DriverEarningsTable
                result={reads.ledger}
                payoutsPath={payoutsHref}
                t={t}
                language={language}
              />

              {/* **Deductions and the payout account share a row, and the
                  pairing fixes a legibility defect rather than saving space.**

                  §4B.7 puts the payout account at the END of the tab: an
                  operator reads the destination while reconciling, after the
                  movements it explains. Both still sit there — the change is
                  that they sit beside each other.

                  The defect: `FieldList` in `rows` layout puts the label at the
                  inline-start edge and the value at the inline-end, so across
                  the full 1264px column `Bank` and `مصرف الراجحي` were ~1,200px
                  apart with nothing between them. A pair that far apart is not
                  a pair — the eye cannot carry a label that distance and the
                  row has to be re-found by counting down from the top. Halving
                  the column halves the gap, which is the whole fix.

                  It also gives `Deductions`' empty state something to sit
                  beside: an empty card 1264px wide is a large area of nothing
                  in the middle of a dense tab.

                  `items-start` because the two are unequal in height and must
                  align at their headings, not stretch to a common floor.

                  **Fitted, not `wide:`.** `--ev-bp-wide` is 1344px, so a
                  breakpoint variant would leave 1280 — where the column is
                  still 1136px — reading as one 1136px pair. 24rem is the floor
                  at which a label and its value are close enough to read as
                  one row; above 2×24rem + the gap the pair splits on its own,
                  which lands two columns at 1280 and 1440 and one wherever the
                  box is genuinely narrow, with no breakpoint to keep in sync.

                  **Its GATE is not here.** `Bank account is pending
                  verification` is a `standingFlags` entry and renders in the
                  strip, above the tab row, on every tab — which is why §4B.5
                  could move this block off the always-visible surface without
                  losing anything. */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(24rem,1fr))] items-start gap-6">
                <section className="flex flex-col gap-3">
                  <SectionHeading title={t('profile.driver.deductions.heading')} />
                  <DriverDeductions result={reads.deductions} t={t} language={language} />
                </section>

                {/* **`layout="grid"`, and it is the alignment fix.** In `rows`
                    layout a pair is a flex line with the label at the
                    inline-start edge and the value at the inline-end, so across
                    the full column `Bank` and `مصرف الراجحي` sat ~1,200px apart
                    — measured, and still 510px apart after the column was
                    halved. A pair that far apart is not a pair. `FactGrid`
                    stacks the value under its own label, so the distance is a
                    line-height regardless of how wide the box gets, and it is
                    already what the Identity tab uses for the same reason. */}
                <section className="flex flex-col gap-3">
                  <SectionHeading title={t('profile.driver.card.payout')} />
                  <FieldList layout="grid" t={t} fields={payoutAccountFields(record, payout, t, language)} />
                </section>
              </div>

              {/* The same control the sheet's earnings tab renders, from the
                  same component, so neither surface can offer or refuse it
                  differently (§3). */}
              <NavigateControl
                to={payoutsHref}
                label={t('profile.driver.action.payouts')}
                allowed={canOpenPayouts}
                reason={t('profile.driver.refusal.payouts')}
              />
            </>
          )}
        </TabsContent>

        {/* ── activity ──────────────────────────────────────────────────
            The timeline carries no heading — the tab is its heading — and
            `Elsewhere in the console` keeps one because it is a SECOND section
            (§4B.8). */}
        <TabsContent value="activity" className="flex flex-col gap-8">
          {record === null ? (
            recordError
          ) : (
            <>
              {/* **The swap the interim named, landed.** This shipped as
                  `performanceFields` in a `FieldList` under a `Performance`
                  heading — the right TAB, the wrong FORM — because deleting the
                  card before `drivingFigures` existed would have taken the
                  rating, the on-time rate and three counts off the page
                  entirely (AC-CP-04: a card may shed facts, the RECORD may
                  not). The builders exist, both surfaces call them, and every
                  one of the seven rows has a stated home: three are here, two
                  are the Earnings figure row, `Last trip` is the caption on
                  `Trips completed`, and `Subscription slots` is `CapacityBlock`
                  in the strip above — tiling it here would state one fact twice
                  on one screen.

                  **No `SectionHeading`.** A figure row never takes one — its
                  blocks carry their own (D-CP-3) — which is why
                  `profile.driver.card.performance` lost its last consumer and
                  is deleted (AC-CP-93). The word `Performance` now names
                  nothing, because each figure names itself. */}
              <FigureGrid figures={drivingFigures(record, t, language)} />

              {/* **`Trips completed` is a LIST now, not a figure** — the
                  owner's amendment: *"trips completed is usually a list."* A
                  lifetime count is not something an operator acts on; the trips
                  are. The count did not disappear, it moved into the table's
                  own `subheading`, where it reads as a fact about the captain
                  rather than as the table's row count.

                  The rows are newest-first, so **the first row IS the last
                  trip** and the `Last trip {date}` caption that used to sit
                  under the figure is retired here — one fact twice on one
                  screen is the defect `payoutAccountFields` refuses for the
                  cash debt.

                  **`Last trip` was NOT dropped, and the measurement is why.**
                  The proposal was that a newest-first table makes it redundant;
                  measured on `DRV-0101` it does not. `lastTripAt` is `25 Jun
                  07:00` and the table's first row is a CANCELLED trip started
                  `25 Jun 09:14` — the newest trip record is not the last trip
                  driven. Both facts ride in the table's subheading, separated,
                  which is `DriverEarningsTable`'s own construction. */}
              {/* **The trips table and `Elsewhere in the console` share a row.**
                  The split is 2fr/1fr rather than even: the table carries five
                  columns and a four-control toolbar, and `Elsewhere` is a short
                  list of references. Giving them equal halves would push the
                  table back into the sideways scroll D-CP-12 closed by removing
                  the rail, which is the one outcome this pairing must not buy.

                  `minmax(0,…)` on both tracks, not a bare `2fr`: a grid track's
                  automatic minimum is `auto`, so a `<table>` inside it sizes the
                  TRACK to the table's min-content and the ratio silently stops
                  applying. This is the defect that makes a "2fr/1fr" grid render
                  as something else entirely, and it is invisible until a wide
                  child appears.

                  It stacks below `wide:` because at 1136px a 2fr share is 745px
                  and the table needs more than that. */}
              <div className="grid items-start gap-6 wide:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <DriverTripsTable
                  driverId={entity.entityId}
                  totalTrips={record.totalTrips}
                  lastTripAt={record.lastTripAt}
                  t={t}
                  language={language}
                />

                <section className="flex flex-col gap-3">
                  <SectionHeading title={t('profile.driver.support.heading')} />
                  <DriverSupportPresenceCard result={reads.support} t={t} language={language} />
                </section>
              </div>

              {/* **The timeline is gone from this tab, by the owner's instruction**
                  — it was removed from the sheet first and then from here, so
                  the two surfaces still agree (§3). `entity.driver.timeline.title`
                  ("Activity history") loses its consumer with it.

                  What the tab keeps is the list an operator came for. The
                  timeline was the audit trail of everything else, and the
                  argument for giving it a heading — that two headless lists
                  read as one list that changed shape halfway down — dies with
                  the second list. */}
            </>
          )}
        </TabsContent>

        {/* ── identity ──────────────────────────────────────────────────
            `layout="grid"` is the whole answer to "eight label/value rows down
            a 320px rail": `FactGrid` auto-fits at `--fact-col`, so the same
            eight facts take THREE columns in a 944px panel where they took one
            in the rail. The fields come from the shared builders, so the sheet's
            Identity tab and this one cannot differ. */}
        <TabsContent value="identity" className="flex flex-col gap-8">
          {record === null ? (
            recordError
          ) : (
            <>
              <section className="flex flex-col gap-3">
                <SectionHeading title={t('profile.section.identity')} />
                <FieldList layout="grid" t={t} fields={identityFields(record, t, language)} />
              </section>

              <section className="flex flex-col gap-3">
                <SectionHeading title={t('profile.section.devices')} />
                <FieldList layout="grid" t={t} fields={deviceFields(record, t)} />
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </SingleColumnPage>
  )
}

/* ─────────────────────────────── the band ──────────────────────────────── */

/**
 * The band on the page — **four rows, and the fourth is the vehicle** (D-CP-1).
 *
 * ```
 *  ←  CAPTAIN · DRV-0101                        eyebrow  text-2xs hero-label
 *     Ahmed Salem                               name     text-band hero-foreground
 *     ★★★★★ 4.9 │ Riyadh                        person   text-sm  hero-muted
 *     Corolla 2022 · White · Economy            vehicle  text-xs  hero-label
 * ```
 *
 * **A captain record is two things: a person and a vehicle. A rider record is
 * one thing.** That is the only structural fact available at the very top of
 * the screen, and one flat meta row threw it away — six items at one rank, two
 * of them describing a car. The rider band is three rows; this one is four, and
 * the fourth is visibly a different rank, so the two are distinguishable before
 * a word is read.
 *
 * **The person row is now the rating and the city, and the two facts that left
 * it did not leave the record** — the owner's instruction, landed in the shared
 * builders. `Tier` moved into `identityFields()`, which had to happen rather
 * than a deletion: `DRIVER_TIER` was rendered in exactly ONE place in the
 * product, this row, so dropping it would have taken a captain's tier off the
 * profile entirely. `Driving since` is gone outright, because
 * `profile.field.joined` was already an identity field at the same precision
 * and the band was stating it twice.
 *
 * ## The two rows differ by separator, and that is the load-bearing half
 *
 * The person row's items are **independent facts** and take the band's 1px
 * `bg-hero-line` rules between them. The vehicle row is **one description of
 * one object** and takes `aria-hidden` `·` spans instead. That difference — not
 * the size — is why the two read as two kinds of thing rather than as one row
 * that wrapped; a rank change alone would read as a wrap.
 *
 * **`bandPersonMeta` returns `ReactNode[]`, not `string[]`**, because the
 * rating renders as stars and the stars must exist in ONE place: if this band
 * composed them, the star markup would exist in two bands and could drift
 * between the page and the sheet, which is precisely what D-CP-1's
 * one-pair-of-builders clause forbids. This page never calls `RatingStars`.
 *
 * **Both rows are `<ul role="list">`, and that is the coordinator's contract
 * rather than this file's preference.** A `<p>` for the vehicle row was
 * proposed here and refused: the sheet's band renders the same two rows, and
 * two surfaces reaching for two elements is exactly the drift §3 exists to
 * prevent. The rows sit in one `flex flex-col gap-1` inside the band's `gap-2`
 * so they read as one meta block at two ranks.
 *
 * Both rows come from `bandPersonMeta` / `bandVehicleMeta`, **the same pair the
 * sheet's band calls**, so the two surfaces state one set of facts by
 * construction (§3). Both place their separators BETWEEN surviving items rather
 * than beside a possibly-absent one — a divider beside an item leaves an orphan
 * when that item is missing — and neither uses a border on a physical side,
 * which would be a defect on arrival (§9.1).
 */
function DriverBandBlock({
  entity,
  driver,
  backTo,
  backLabel,
  t,
  language,
  dir,
}: {
  entity: ProfileRef
  driver: Driver | null
  backTo: string
  backLabel: string
  t: Translator
  language: Language
  dir: Direction
}) {
  const person = driver === null ? [] : bandPersonMeta(driver, t, language)
  /* Before the record lands the band still says what this captain drives, from
     the ref that resolved first — and it lands in the row that fact belongs to.
     `clients/profile.ts` builds a captain's `ProfileRef.subtitle` from
     `driver.vehicle`, so the fallback is a vehicle string and putting it in the
     person row above would have been a rank error the moment the read returned.
     Nothing waits for the read (§9.2). */
  const vehicle =
    driver === null
      ? [entity.subtitle ?? ''].filter((value) => value !== '')
      : bandVehicleMeta(driver, t)

  return (
    <BoardBand shape="inset" density="bar">
      <div className="flex flex-col gap-2">
        {/* §8 slot 1 — the back arrow leads the name row in both directions,
            and it is the page's first tab stop. */}
        <div className="flex items-center gap-2">
          <ReturnControl to={backTo} label={backLabel} dir={dir} />
          {/* The licensed eyebrow: two independent labels with a decorative
              separator between them. `uppercase` and `tracking-wider` are
              no-ops in Arabic by design, and the `·` is `aria-hidden` so the
              visual order becomes `DRV-0101 · كابتن` under `dir="rtl"` — the
              logical string read right to left, which is correct. */}
          <p className="flex items-center gap-1.5 text-2xs font-medium tracking-wider text-hero-label uppercase">
            <span>{t(`profile.kind.${entity.entityType}`)}</span>
            <span aria-hidden="true">·</span>
            <bdi className="tabular-nums">{entity.entityId}</bdi>
          </p>
        </div>

        {/* The page's ONE `<h1>`, and it is the name. It wraps and is never
            clamped: a long Arabic name's patronymic chain is the half that
            disambiguates two people with one surname. */}
        <h1 className="text-band font-medium break-words text-hero-foreground">
          <bdi>{entity.title}</bdi>
        </h1>

        {/* Rows 3 and 4 — ONE meta block at two ranks, not two more items in
            the band's stack. `gap-1` inside the band's own `gap-2` is what
            makes the person and the vehicle read as one description of one
            record rather than as two unrelated lines. */}
        {(person.length > 0 || vehicle.length > 0) && (
          <div className="flex flex-col gap-1">
            {/* Row 3 — the PERSON. Four independent facts, so the band's 1px
                rules go between them, at the meta rank it already ships. */}
            {person.length > 0 && (
              <ul
                role="list"
                className="flex list-none flex-wrap items-center gap-x-3 gap-y-1 text-sm text-hero-muted"
              >
                {/* **Keyed by index**, and that is forced rather than lazy: an
                    item may be a NODE — the star rating — and a node is not a
                    key. The list is a fixed, ordered projection of one record,
                    never reordered and never filtered mid-life, so the index is
                    stable for as long as it needs to be. Same key strategy as
                    the sheet's band, deliberately. */}
                {person.map((value, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {index > 0 && (
                      <span aria-hidden="true" className="h-3 w-px shrink-0 bg-hero-line" />
                    )}
                    <bdi>{value}</bdi>
                  </li>
                ))}
              </ul>
            )}

            {/* Row 4 — the EQUIPMENT. One rank lower — `text-xs
                text-hero-label`, the measured eyebrow rank on `--ev-hero` —
                and **no rule**: one description of one object gets punctuation
                where four independent facts get rules. That separator is the
                load-bearing half of D-CP-1; the size alone would read as a row
                that wrapped.

                **`gap-1.5` matches the sheet's band exactly, and the 6px is
                REPORTED rather than silently corrected here.** `gap-1` was
                written first — 4px is on D15's grid where 6px is not
                (AC-CP-56) — and then changed back: the sheet renders the same
                two rows from the same builders, and two surfaces spacing one
                row two ways is the drift §3 exists to refuse. It is also what
                the eyebrow two rows above already ships. **One off-grid value
                shared by both surfaces beats two values that disagree**; the
                grid question belongs to whoever owns the ramp, on both
                surfaces at once.

                **A rank, not a new token.** Nothing here introduces a value. */}
            {vehicle.length > 0 && (
              <ul
                role="list"
                className="flex list-none flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-hero-label"
              >
                {vehicle.map((value, index) => (
                  <li key={value} className="flex items-center gap-1.5">
                    {index > 0 && <span aria-hidden="true">·</span>}
                    <bdi>{value}</bdi>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </BoardBand>
  )
}

/* **`SideCard` is deleted, not left unused.** It was §7.2's rail card shape and
   the rail is gone (D-CP-12). An unused card component beside a page that has
   no rail is how a sixth card comes back — the same argument §8.1a makes for
   deleting `profile.driver.card.performance` rather than orphaning it. The
   reversal path in §4B.5 is `DetailPage` plus a two-item `rail` array, and it
   would reach for `Card` directly. */
