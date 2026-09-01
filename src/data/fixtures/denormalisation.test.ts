/**
 * **The guard on the defect this pass was opened to fix.**
 *
 * Every index row in this product carries a denormalised name beside the id it
 * describes — `driverName` beside `driverId`, `captainName` beside `captainId`,
 * `entityName` beside `entityId` — because a list of 200 rows must not resolve
 * 200 profiles to render (`types/trip.ts`: legacy calls `nm2(t.rider)` per row,
 * an N+1 per render). Denormalisation is the right answer and it has one
 * failure mode: **the copy stops describing the original.**
 *
 * It had already happened, at scale. The filler generators applied `cycle()` to
 * an id list and to a name list *separately*, with different periods, so the
 * two walked out of phase on the second row:
 *
 *   - **80 of 132 filler trips** and **40 of 70 filler subscriptions** carried a
 *     `driverName` contradicting `fixtures/drivers.ts`;
 *   - sixteen captain ids carried between two and seven different names each —
 *     `DRV-0101` was *Khalid Mansour* in `SUB-3107` and *Ahmed Salem* in the
 *     captain record;
 *   - `CASH-0006` put `RDR-1041`'s name on `RDR-1046`, by hand, on a row nobody
 *     generated.
 *
 * `cycle.ts`'s `cycleRef`/`refsFor` make the generated case hard to write
 * wrongly — there is no second list left to fall out of step with the first —
 * but nothing stops a hand-written row from typing the wrong name, and nothing
 * stops the next generator from reintroducing parallel lists. **This file is
 * what stops both.** It re-derives every denormalised name from the canonical
 * record and fails the build on a mismatch.
 *
 * ## Two properties, not one
 *
 * 1. **Resolution** — every foreign id names a record that exists. A row
 *    linking to a profile that 404s is invisible until somebody clicks it.
 * 2. **Agreement** — where a row also carries the name, it is *that record's*
 *    name.
 *
 * The first without the second is how `CASH-0006` passed for months: the id was
 * fine, the name beside it belonged to somebody else.
 *
 * ## The deliberate exceptions
 *
 * One id does not resolve **on purpose** and one trip deliberately does not
 * balance; both are listed by name below. They exist because
 * `clients/integrity.test.ts` requires the Integrity pane to have something to
 * report, and a pane whose only reachable state is "every check passed" is a
 * lie with extra steps. Adding to either list is a decision, not a
 * convenience: state the check the row keeps alive.
 */

import { describe, expect, it } from 'vitest'

import { assuranceTripFixtures } from './assurance'
import { complianceFixtures } from './compliance'
import { conversationFixtures } from './conversations'
import {
  captainDebtFixtures,
  captainPayoutFixtures,
  cashReportFixtures,
  deductionFixtures,
  escrowHoldFixtures,
} from './financials'
import { fairnessCaseFixtures } from './fairness'
import { allDriverFixtures } from './drivers'
import { riderFixtures } from './riders'
import { safetyIncidentFixtures } from './safety'
import { allSubscriptionFixtures } from './subscriptions'
import { allTripFixtures } from './trips'

/* ── the canonical records ────────────────────────────────────────────── */

const captainName = new Map(allDriverFixtures.map((d) => [d.id, d.name]))
const riderName = new Map(riderFixtures.map((r) => [r.id, r.name]))
const subscriptionIds = new Set(allSubscriptionFixtures.map((s) => s.id))
const tripIds = new Set(allTripFixtures.map((t) => t.id))

/**
 * Ids that deliberately do not resolve, and the check each one keeps
 * reachable. Each is documented at its fixture with a "do not fix" note.
 */
const DELIBERATE_DANGLING = new Map<string, string>([
  ['SUB-0871', 'TRP-9107 — keeps `ref.trip-links` reportable (integrity.test.ts:198)'],
])

/**
 * Every `{ id, name }` pair a fixture states, from every collection, so the
 * question *"does any id go by two names?"* is asked once over the whole layer
 * rather than per file.
 */
function pairs(): Array<{ where: string; id: string; name: string }> {
  const out: Array<{ where: string; id: string; name: string }> = []
  const add = (where: string, id: string | null, name: string | null) => {
    if (id !== null && name !== null) out.push({ where, id, name })
  }

  for (const t of allTripFixtures) {
    add(`trip ${t.id}.driver`, t.driverId, t.driverName)
    add(`trip ${t.id}.rider`, t.riderId, t.riderName)
  }
  for (const s of allSubscriptionFixtures) {
    add(`subscription ${s.id}.driver`, s.driverId, s.driverName)
    add(`subscription ${s.id}.rider`, s.riderId, s.riderName)
  }
  for (const i of safetyIncidentFixtures) {
    add(`incident ${i.id}.reporter`, i.reporterId, i.reporterName)
    add(`incident ${i.id}.against`, i.againstId, i.againstName)
  }
  for (const c of fairnessCaseFixtures) {
    add(`fairness ${c.id}.driver`, c.driverId, c.driverName)
    add(`fairness ${c.id}.subject`, c.subjectId, c.subjectName)
  }
  for (const t of assuranceTripFixtures) {
    add(`assurance ${t.id}.driver`, t.driverId, t.driverName)
    add(`assurance ${t.id}.rider`, t.riderId, t.riderName)
    add(`assurance ${t.id}.backup`, t.backupDriverId, t.backupDriverName)
  }
  for (const c of complianceFixtures) add(`compliance ${c.driverId}`, c.driverId, c.driverName)
  for (const p of captainPayoutFixtures) add(`payout ${p.captainId}`, p.captainId, p.captainName)
  for (const d of captainDebtFixtures) add(`debt ${d.captainId}`, d.captainId, d.captainName)
  for (const e of escrowHoldFixtures) {
    add(`escrow ${e.id}.captain`, e.captainId, e.captainName)
    add(`escrow ${e.id}.rider`, e.riderId, e.riderName)
  }
  for (const d of deductionFixtures) add(`deduction ${d.id}`, d.captainId, d.captainName)
  for (const r of cashReportFixtures) {
    add(`cash ${r.id}.captain`, r.captainId, r.captainName)
    add(`cash ${r.id}.rider`, r.riderId, r.riderName)
  }
  for (const c of conversationFixtures) {
    add(`conversation ${c.id}.entity`, c.entityId, c.entityName)
    for (const p of c.participants) {
      if (p.kind === 'customer') add(`conversation ${c.id}.participant`, p.id, p.name)
    }
  }
  return out
}

/* ── 1. one id, one name ──────────────────────────────────────────────── */

describe('a denormalised name describes the id beside it', () => {
  it('never gives one id two different names, anywhere in the fixture layer', () => {
    const byId = new Map<string, Map<string, string[]>>()
    /**
     * **Riders and captains only, and the exclusion is a finding rather than a
     * convenience.**
     *
     * `CNV-109` is a conversation *about* `CORP-002` — an account — whose
     * customer participant is a **person**, نورة بنت عبد الرحمن آل الشيخ, the
     * named contact on it. She borrows the account's id because there is no
     * contact resource for her to have one of her own:
     * `ConversationParticipant.id` is documented as *"`RDR-1041`, `USR-3`, or a
     * transport-scoped id"*, and a corporate contact is none of the three.
     *
     * So one id genuinely carries two names — the company's and the contact's —
     * and neither is wrong. **The gap is that a corporate contact has no
     * record**, which is a modelling question for whoever owns
     * `types/conversation.ts` and `types/corporateAccount.ts`, not something a
     * fixture may settle by renaming a person after their employer.
     */
    for (const { where, id, name } of pairs().filter(
      (p) => p.id.startsWith('RDR-') || p.id.startsWith('DRV-'),
    )) {
      const names = byId.get(id) ?? new Map<string, string[]>()
      names.set(name, [...(names.get(name) ?? []), where])
      byId.set(id, names)
    }
    const conflicts = [...byId.entries()]
      .filter(([, names]) => names.size > 1)
      .map(([id, names]) => `${id}: ${[...names].map(([n, w]) => `"${n}" (${w[0]})`).join(' vs ')}`)
    expect(
      conflicts,
      'an id going by two names is the defect this file exists to catch',
    ).toEqual([])
  })

  it('matches every captain name to the captain record', () => {
    const wrong = pairs()
      .filter(({ id }) => id.startsWith('DRV-'))
      .filter(({ id, name }) => captainName.has(id) && captainName.get(id) !== name)
      .map(({ where, id, name }) => `${where}: ${id} is "${name}", record says "${captainName.get(id)}"`)
    expect(wrong).toEqual([])
  })

  it('matches every rider name to the rider record', () => {
    const wrong = pairs()
      .filter(({ id }) => id.startsWith('RDR-'))
      .filter(({ id, name }) => riderName.has(id) && riderName.get(id) !== name)
      .map(({ where, id, name }) => `${where}: ${id} is "${name}", record says "${riderName.get(id)}"`)
    expect(wrong).toEqual([])
  })
})

/* ── 2. every foreign id resolves ─────────────────────────────────────── */

describe('a foreign id names a record that exists', () => {
  const unresolved = (where: string, id: string | null, known: Set<string> | Map<string, string>) =>
    id === null || DELIBERATE_DANGLING.has(id) || ('has' in known && known.has(id))
      ? null
      : `${where}: ${id}`

  it('resolves every captain and rider a trip names', () => {
    const bad = allTripFixtures.flatMap((t) =>
      [
        unresolved(`trip ${t.id}.driverId`, t.driverId, captainName),
        unresolved(`trip ${t.id}.riderId`, t.riderId, riderName),
        unresolved(`trip ${t.id}.subscriptionId`, t.subscriptionId, subscriptionIds),
      ].filter((x): x is string => x !== null),
    )
    expect(bad).toEqual([])
  })

  it('resolves every captain and rider a subscription names', () => {
    const bad = allSubscriptionFixtures.flatMap((s) =>
      [
        unresolved(`subscription ${s.id}.driverId`, s.driverId, captainName),
        unresolved(`subscription ${s.id}.riderId`, s.riderId, riderName),
      ].filter((x): x is string => x !== null),
    )
    expect(bad).toEqual([])
  })

  it('resolves every trip a safety incident, a deduction or a cash report cites', () => {
    const bad = [
      ...safetyIncidentFixtures.map((i) => unresolved(`incident ${i.id}.tripId`, i.tripId, tripIds)),
      ...deductionFixtures.map((d) => unresolved(`deduction ${d.id}.tripId`, d.tripId, tripIds)),
      ...cashReportFixtures.map((r) => unresolved(`cash ${r.id}.tripId`, r.tripId, tripIds)),
    ].filter((x): x is string => x !== null)
    expect(bad).toEqual([])
  })

  it('resolves every subscription an escrow hold or an assurance leg is against', () => {
    const bad = [
      ...escrowHoldFixtures.map((e) =>
        unresolved(`escrow ${e.id}.subscriptionId`, e.subscriptionId, subscriptionIds),
      ),
      ...assuranceTripFixtures.map((t) =>
        unresolved(`assurance ${t.id}.subscriptionId`, t.subscriptionId, subscriptionIds),
      ),
    ].filter((x): x is string => x !== null)
    expect(bad).toEqual([])
  })

  it('keeps the deliberate exceptions deliberate, and few', () => {
    /* A list that grows without a reason beside each entry is how "we know
       about it" becomes "nobody knows why". */
    expect([...DELIBERATE_DANGLING.values()].every((why) => why.length > 20)).toBe(true)
    expect(DELIBERATE_DANGLING.size).toBeLessThanOrEqual(2)
  })
})

/* ── 3. the aliases stay aliases ──────────────────────────────────────── */

describe('a field that mirrors another agrees with it', () => {
  it('keeps a participant `handle` equal to `handles[channel]` — F-3', () => {
    const wrong = conversationFixtures.flatMap((c) =>
      c.participants
        .filter((p) => (p.handles[c.channel] ?? null) !== p.handle)
        .map((p) => `${c.id}/${p.id}: handle "${p.handle}" vs handles.${c.channel} "${p.handles[c.channel]}"`),
    )
    expect(wrong, '`handle` is an alias for `handles[channel]`, never a second answer').toEqual([])
  })

  it('keeps a conversation participant list consistent with the entity it is about', () => {
    /* Riders and captains, for the reason given above: a corporate
       conversation's participant is the account's named contact, who has no
       record of their own to be named from. */
    const wrong = conversationFixtures
      .filter((c) => c.entityType === 'rider' || c.entityType === 'driver')
      .filter((c) => {
        const customer = c.participants.find((p) => p.kind === 'customer')
        return customer !== undefined && customer.id === c.entityId && customer.name !== c.entityName
      })
      .map((c) => c.id)
    expect(wrong).toEqual([])
  })

  it('names the one place a person borrows their employer’s id, so it stays visible', () => {
    /**
     * A deliberate exclusion nobody can see is an exclusion that quietly grows.
     * This asserts the *shape* of the gap rather than hiding it: exactly one
     * conversation is about a `corporate-account`, and its customer participant
     * carries the account's id with a human's name on it.
     */
    const corporate = conversationFixtures.filter((c) => c.entityType === 'corporate-account')
    expect(corporate).toHaveLength(1)
    const contact = corporate[0]!.participants.find((p) => p.kind === 'customer')!
    expect(contact.id).toBe(corporate[0]!.entityId)
    expect(contact.name).not.toBe(corporate[0]!.entityName)
  })
})

/* ── 4. an aggregate and its records ──────────────────────────────────── */

describe('a stored total does not contradict its own record', () => {
  /**
   * **The narrow version of `agree.aggregate-vs-records`, and deliberately
   * narrow.**
   *
   * A lifetime `totalTrips` exceeding the trips we hold is **expected** at
   * fixture scale and is not asserted here: this layer serves a 137-row sample
   * of a trip table and 46 captains' lifetime histories, and flattening real
   * totals to match a sample would corrupt the data to satisfy a check.
   * `riders.ts` says the same thing on `RDR-1041` — *"stores 42 trips and we
   * hold a handful. Expected, not a fault"* — and `clients/integrity.test.ts`
   * asserts only the useful half: nobody **with** trips may be flagged.
   *
   * What *is* asserted is the contradiction a record makes with itself:
   * `lastTripAt` is documented as `null` **exactly when** the party has never
   * taken a trip, so a non-zero `totalTrips` beside a null `lastTripAt` is this
   * layer disagreeing with its own field definition — and it silently breaks
   * every `lastTripAt` sort and date filter for the row.
   */
  it('never claims trips with a null last-trip timestamp', () => {
    const riders = riderFixtures
      .filter((r) => r.totalTrips > 0 && r.lastTripAt === null)
      .map((r) => `${r.id} (${r.totalTrips} trips)`)
    const captains = allDriverFixtures
      .filter((d) => d.totalTrips > 0 && d.lastTripAt === null)
      .map((d) => `${d.id} (${d.totalTrips} trips)`)
    expect([...riders, ...captains]).toEqual([])
  })

  it('never states a last trip for a party that has never taken one', () => {
    const wrong = [
      ...riderFixtures.filter((r) => r.totalTrips === 0 && r.lastTripAt !== null).map((r) => r.id),
      ...allDriverFixtures.filter((d) => d.totalTrips === 0 && d.lastTripAt !== null).map((d) => d.id),
    ]
    expect(wrong).toEqual([])
  })
})

/* ── 5. the fare splits ───────────────────────────────────────────────── */

describe('the money on a trip adds up', () => {
  /**
   * `fare = driverEarnings + extraStopFee + platformCut`, which is
   * `clients/integrity.ts`'s `money.trip-split` identity and legacy's own
   * `max(0, fare - earn - stopFee)` (`:3422`).
   *
   * `TRP-9106` is the one exception and it is deliberate — see the note on the
   * row. Every other trip is checked, which is what stops the fourteen-row
   * regression from coming back: those rows charged a 300-halala extra-stop fee
   * on top of a fare that was already fully split.
   */
  const DELIBERATELY_UNBALANCED = new Set(['TRP-9106'])

  it('splits every fare into earnings, extras and cut, to the halala', () => {
    const wrong = allTripFixtures
      .filter((t) => !DELIBERATELY_UNBALANCED.has(t.id))
      .filter(
        (t) =>
          t.fareHalalas - t.driverEarningsHalalas - t.extraStopFeeHalalas - t.platformCutHalalas !== 0,
      )
      .map((t) => `${t.id}: residual ${t.fareHalalas - t.driverEarningsHalalas - t.extraStopFeeHalalas - t.platformCutHalalas}`)
    expect(wrong).toEqual([])
  })

  it('keeps the one deliberately unbalanced trip unbalanced, so the check has a subject', () => {
    const row = allTripFixtures.find((t) => t.id === 'TRP-9106')!
    const residual =
      row.fareHalalas - row.driverEarningsHalalas - row.extraStopFeeHalalas - row.platformCutHalalas
    expect(residual, 'clients/integrity.test.ts:229 needs this row to keep failing').not.toBe(0)
  })

  it('carries integer halalas on every money field of every trip', () => {
    const amounts = allTripFixtures.flatMap((t) => [
      t.fareHalalas,
      t.driverEarningsHalalas,
      t.platformCutHalalas,
      t.extraStopFeeHalalas,
      t.tipHalalas,
    ])
    expect(amounts.filter((a) => !Number.isInteger(a))).toEqual([])
  })
})
