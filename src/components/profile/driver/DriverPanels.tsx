/**
 * The captain sheet's detail column — **four tabs, and `Documents` leads.**
 *
 * ```
 *   Documents 5 │ Earnings │ Activity │ Identity
 *   ─────────────────────────────────────────────
 *   Licence            Valid       12 Mar 2027 · 260 days left
 *   Registration       Expiring    19 Jul 2026 · 24 days left
 *   …                                  [ Open compliance file ]
 * ```
 *
 * ## Why `Documents` and not `Activity`
 *
 * The rider sheet leads with `Activity`, and correctly: a rider's record *is*
 * its history — what they booked, what they paid, what lapsed. A captain's
 * leading question is different and it is not about the past. It is *"what is
 * about to stop this person driving"*, and the answer is a document with a date
 * on it that expires whether anybody acts or not. Nothing on a rider record
 * expires. Putting that tab first is the whole difference between a captain
 * profile and a rider profile with different words in it.
 *
 * ## Counts — the rule, narrowed
 *
 * The rider wave's rule is *"a tab's count is the number of records behind that
 * tab, never the number of rows shown, and a record is counted under exactly one
 * tab."* Applied here it produces a further clause, because two of these tabs
 * hold **two collections whose members overlap**:
 *
 * > **A tab carries a count only when exactly one collection sits behind it and
 * > the server knows its total.**
 *
 * - `Documents` qualifies: one file, five rows, all of them rendered.
 * - `Earnings` does **not**. It holds the payable ledger *and* the deduction
 *   list, and an applied deduction **is** a posting on that ledger
 *   (`applyDeduction` writes a debit on `liability.driver`). Any single number
 *   is either a double count or a silent claim about which collection is the
 *   real one.
 * - `Activity` qualifies. `getDriverTimeline` is **one** server-derived,
 *   paginated collection, so `Paginated.total` is the number of events behind
 *   the tab rather than the number of rows on screen — and the list states its
 *   own truncation in words beneath, so `Activity 21` over `Showing 6 of 21.`
 *   reconciles by reading rather than by counting pixels.
 * - `Identity` does not. It is a set of pairs, not a list of records, and a `1`
 *   on it would count nothing an operator can count.
 *
 * Each list states its own truncation in words instead (§5.4), which is a real
 * number rather than a derived one.
 *
 * **No count renders while its read is in flight.** A `0` printed before a read
 * returns is indistinguishable from a real zero. **The derivation and the chip
 * both moved into `facts.tsx`** (AC-CP-77): this file computed them inline and
 * the page shipped with no counts at all rather than write a second copy, so
 * the two surfaces could not print different numbers for one file only because
 * one of them printed nothing. `tabCounts` and `TabCount` are now the one copy,
 * and a failed read draws **nothing** where it used to draw an indefinite
 * skeleton.
 *
 * ## Performance is two figure rows now, and the card is gone (D-CP-13)
 *
 * `performanceFields`' seven label/value rows sat in the `Identity` tab under a
 * `Performance` heading, at one rank, next to eight identity facts and four
 * device facts. They are `drivingFigures` on **Activity** and `periodFigures`
 * on **Earnings** — each figure beside the thing it explains rather than in a
 * card of unrelated numbers — and every one of the seven has a stated home
 * (AC-CP-04: a card may shed facts, the record may not). `FigureGrid` is
 * rendered from `facts.tsx` because D-CP-13 ruled its geometry for **both**
 * surfaces, so there is nothing left for a surface to choose.
 *
 * Rules applied
 *   §9.2 #14   each read owns its four states inside the panel that renders it,
 *              so a failed ledger leaves the documents tab and the rail working
 *              and the sheet dismissible.
 *   §3.2/AC-308 the payable ledger states its direction convention ONCE, above
 *              the postings, because on `liability.driver` a credit means Eyvar
 *              owes MORE — the opposite of a wallet, and not guessable.
 *   §8.3.3     the sheet's money list is the rail-card form: newest-first, six
 *              rows, **balance column omitted**, closing balance above them.
 *              `MiniLedger` is that construction and is not re-implemented.
 *   §9.1       logical utilities only.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FieldList, MiniLedger } from '../fields'
import { SectionStates } from '../SectionCard'
import type { Driver } from '@/data/types'
import type { Language, Translator } from '@/lib'
import { DriverDeductions } from './DriverDeductions'
import { DriverSupportPresenceCard } from './DriverSupportPresenceCard'
import { DriverDocuments } from './DriverDocuments'
import { NavigateControl } from './NavigateControl'
import {
  FigureGrid,
  TabCount,
  deviceFields,
  drivingFigures,
  identityFields,
  payoutAccountFields,
  periodFigures,
  tabCounts,
  tripFigures,
} from './facts'
import type { DriverReads } from './reads'

export interface DriverPanelsProps {
  driver: Driver
  reads: DriverReads
  nowIso: string
  /** Both destinations are resolved by the caller from the route table. */
  complianceHref: string
  payoutsHref: string
  /** `view_operations` / `view_finance` — whether each route accepts this operator. */
  canOpenCompliance: boolean
  canOpenPayouts: boolean
  t: Translator
  language: Language
}

export function DriverPanels({
  driver,
  reads,
  nowIso,
  complianceHref,
  payoutsHref,
  canOpenCompliance,
  canOpenPayouts,
  t,
  language,
}: DriverPanelsProps) {
  /* **One derivation, two surfaces** (AC-CP-77). Both counts were computed here
     and the page shipped without them rather than write a second copy; the copy
     is now `tabCounts` in `facts.tsx` and this reads it. A second derivation of
     either count anywhere fails the criterion. */
  const counts = tabCounts(reads, t, nowIso)
  const payout = reads.payout.data?.items[0] ?? null

  return (
    <Tabs defaultValue="documents" className="min-w-0 flex-1 gap-3 p-4">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="documents" className="flex-none">
          {t('profile.driver.tab.documents')}
          <TabCount value={counts.documents} language={language} />
        </TabsTrigger>
        {/* No count: two overlapping collections. See the header. */}
        <TabsTrigger value="earnings" className="flex-none">
          {t('profile.driver.tab.earnings')}
        </TabsTrigger>
        {/* **No count, because the thing it counted is gone.** `counts.activity`
            is `getDriverTimeline`'s server `total`, and the owner removed the
            timeline from this surface; a `21` beside a tab holding three
            figures counts something the operator cannot see. The page still
            renders the list and still carries the count. */}
        <TabsTrigger value="activity" className="flex-none">
          {t('profile.driver.tab.activity')}
        </TabsTrigger>
        <TabsTrigger value="identity" className="flex-none">
          {t('profile.section.identity')}
        </TabsTrigger>
      </TabsList>

      {/* ── documents ────────────────────────────────────────────────── */}
      <TabsContent value="documents" className="flex flex-col gap-4">
        <DriverDocuments
          result={reads.compliance}
          nowIso={nowIso}
          complianceHref={complianceHref}
          canOpenCompliance={canOpenCompliance}
          t={t}
          language={language}
        />
      </TabsContent>

      {/* ── earnings ─────────────────────────────────────────────────── */}
      <TabsContent value="earnings" className="flex flex-col gap-5">
        {/* **The figure row leads the tab, and it carries NO heading** — its
            blocks carry their own (D-CP-3), which is that ruling paying for
            itself. `Earnings this month` is not a duplicate of `EarningsBlock`:
            that block states `payableHalalas`, the liability BALANCE, and a
            month's earnings is an accrual over a window. Nothing here is summed
            with or netted against either ledger.

            **Two windows on one row, and it is reported rather than hidden.**
            `Trips this period` is `CaptainPayout`'s payout period and
            `Earnings this month` is a calendar month; `CaptainPayout` carries
            no period bounds to state, so each label names its own window and
            neither claims the other's. AC-CP-88 pairs them and this file does
            not overturn it. */}
        <FigureGrid figures={periodFigures(driver, payout, t, language)} />

        <section className="flex flex-col gap-2">
          <GroupHeading>{t('profile.driver.earnings.postings')}</GroupHeading>
          {/* **AC-308 — the convention, stated once, above the rows.** On
              `liability.driver` a credit means Eyvar owes this captain MORE and
              a debit means less, which is the opposite of a wallet ledger and
              is not guessable from the words `Debit` and `Credit` alone. The
              client's own header states it; this is the other end of that
              sentence. */}
          <p className="text-xs text-muted-foreground">
            {t('profile.driver.earnings.direction')}
          </p>
          <SectionStates
            result={reads.ledger}
            section={t('profile.driver.block.earnings')}
            empty={t('profile.driver.earnings.empty')}
            t={t}
            skeletonRows={4}
          >
            {(ledger) =>
              ledger.lifetimePostings === 0 ? (
                /* **`lifetimePostings`, never `totalPostings`.** The second is
                   a WINDOW figure — *nothing happened in the month you asked
                   for* — and a quiet month is not a captain who has never
                   earned. `types/ledger.ts` records four screens taking the
                   wrong one. */
                <p className="text-sm text-muted-foreground">
                  {t('profile.driver.earnings.empty')}
                </p>
              ) : (
                <MiniLedger ledger={ledger} t={t} language={language} />
              )
            }
          </SectionStates>
        </section>

        <section className="flex flex-col gap-2">
          <GroupHeading>{t('profile.driver.deductions.heading')}</GroupHeading>
          <DriverDeductions result={reads.deductions} t={t} language={language} />
        </section>

        {/* The second of the surface's two navigations, and it renders on the
            page beside its ledger too — one implementation, both surfaces, so
            neither can offer or refuse it differently (§3).

            **`link`, at the inline-start** (D-CP-6). It was already a link,
            because R3 caps the count of filled buttons at one and the document
            list held it; now that list has no filled button either and the
            alignment matches, so the two navigations on this surface are one
            kind of thing in one place rather than two. A control that CONTINUES
            a list is not a trailing action — it begins where the list's own
            content begins. */}
        <NavigateControl
          to={payoutsHref}
          label={t('profile.driver.action.payouts')}
          allowed={canOpenPayouts}
          reason={t('profile.driver.refusal.payouts')}
          align="start"
        />
      </TabsContent>

      {/* ── activity ─────────────────────────────────────────────────── */}
      {/* ONE list, server-derived. `DriverTimeline` carries the argument for
          what it holds and — more importantly — for the four things it
          deliberately does not. */}
      <TabsContent value="activity" className="flex flex-col gap-4">
        {/* **What this captain is LIKE**, at figure rank — the three facts that
            are true of them generally and do not change when the payout period
            rolls. `Last trip` is the CAPTION on `Trips completed` and never a
            figure of its own: a timestamp has nothing to aggregate.

            `MetricTile` is refused, twice over (D-CP-13): it is the metric-band
            grammar where this record is a dossier, and `Metric` requires
            `key`, `subTabId`, `category` and `asOf`, all four of which would be
            fabricated here. **A board metric is a population; this one is a
            person.** */}
        {/* **The sheet's row carries the trip count and the page's does not**,
            and that is a box difference rather than a disagreement about a
            fact (§3). The page renders `DriverTripsTable`, whose subheading IS
            the count and whose first row IS the last trip; the sheet has 447px
            and `DataTable`'s narrow rendering is keyed to a VIEWPORT media
            query at `--ev-bp-compact` (768px), so a table here would be a full
            `<table>` in a horizontal scroll container — the sideways scroll
            D-CP-12 closed, back inside a drawer §4.4 refuses to widen.
            `MiniLedger` is the same call one section over.

            **Neither builder takes a surface argument**, so neither can be
            handed the wrong one: the split is semantic — the two rates that
            have no list behind them, and the one figure that IS a list. */}
        <FigureGrid
          figures={[
            ...drivingFigures(driver, t, language),
            ...tripFigures(driver, t, language),
          ]}
        />
      </TabsContent>

      {/* ── identity ─────────────────────────────────────────────────── */}
      {/* The three field groups, from the SHARED builders in `facts.tsx`. The
          page renders the identical three as rail cards, from the identical
          calls — the surfaces choose the box and nothing else (§3). Absent
          values are passed as `null`, never omitted, so `splitAbsent()` groups
          three or more of them into one `Not recorded:` line. */}
      <TabsContent value="identity" className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <GroupHeading>{t('profile.section.identity')}</GroupHeading>
          <FieldList layout="grid" t={t} fields={identityFields(driver, t, language)} />
        </section>
        <section className="flex flex-col gap-2">
          <GroupHeading>{t('profile.driver.card.payout')}</GroupHeading>
          <FieldList
            layout="grid"
            t={t}
            fields={payoutAccountFields(driver, payout, t, language)}
          />
        </section>
        <section className="flex flex-col gap-2">
          <GroupHeading>{t('profile.section.devices')}</GroupHeading>
          <FieldList layout="grid" t={t} fields={deviceFields(driver, t)} />
        </section>
        {/* Nine collections, asked rather than assumed. `Driver.openComplaints`
            is one number counting one of them; a profile that answered *"is
            anything open against this captain"* from it would say `0` for a
            captain with an open dispute, an unresolved cash report and a
            fairness case under review. */}
        <section className="flex flex-col gap-2">
          <GroupHeading>{t('profile.driver.support.heading')}</GroupHeading>
          <DriverSupportPresenceCard result={reads.support} t={t} language={language} />
        </section>
      </TabsContent>
    </Tabs>
  )
}

/* D18 / X-4 — sentence case, no letter-spacing. */
function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs text-muted-foreground">{children}</h3>
}
