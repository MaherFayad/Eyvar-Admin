/**
 * The six tracked zones — `DB.zones` (`eyvar_ops_panel_v40_fixed.html:13952`–`:13959`),
 * verbatim.
 *
 * **Only the stored fields are here.** `failureRate`, `demandSupplyRatio`,
 * `starved`, `captainsNeeded`, `recruitmentPriority` and `subMomentum` are
 * computed in `clients/zones.ts` and are deliberately absent from this file, so
 * that nobody can hand-edit a `failureRate` into disagreeing with the
 * `failures30d` beside it (R4-6b §6.6.4, `DESIGN.md` §8.2).
 *
 * ## Why every row says `Riyadh`
 *
 * Because every row **is** Riyadh. R4-6b §6.6.5: *"Every seeded zone is in
 * Riyadh — which is **L-6**'s cause, and the fixture should keep it rather than
 * hide it."* Legacy's own comment at `:6941` says the same thing —
 * *"this dataset's zones are all within the seed city (Riyadh)"* — and then
 * `:6942` turns that observation into a defect by gating the per-city failure
 * rate on `c.name === 'Riyadh'`, so Jeddah, Dammam and Makkah render an em-dash
 * forever no matter what data arrives.
 *
 * **Three of the four `zones.citiesHealth` rows genuinely have no reading**, and
 * `MetricBreakdownRow.secondaryValue` is nullable for exactly that. Filling
 * those em-dashes with invented numbers would hide the only evidence the defect
 * exists.
 *
 * ## The arithmetic, so a hand-edit is caught
 *
 * | Zone | demand : supply | ratio | fail rate | starved | needs |
 * |---|---|---|---|:--:|---:|
 * | Al Narjis | 14 : 2 | 7.00 | 11/14 → 79 % | ● | +3 |
 * | Al Sahafa | 9 : 3 | 3.00 | 6/9 → 67 % | ● | 0 |
 * | Al Yasmin | 11 : 4 | 2.75 | 7/11 → 64 % | | 0 |
 * | Al Malaz | 8 : 6 | 1.33 | 2/8 → 25 % | | 0 |
 * | KAFD / Olaya | 22 : 12 | 1.83 | 4/22 → 18 % | | 0 |
 * | Qurtubah | 6 : 5 | 1.20 | 1/6 → 17 % | | 0 |
 *
 * Sum of `failures30d` = **31**. Mean failure rate = 270 ÷ 6 = **45 %**. Starved
 * = **2**. Worst ratio = **7**. Those are the four numbers the strip publishes
 * today as literals, and they are unchanged.
 *
 * The table above is **display order**: worst-first by failure rate (`:14132`),
 * which is the table's default sort and the order the nav badge's first row
 * should agree with.
 */

import type { Zone, ZoneSteerOffer } from '../types/zone'

/**
 * The stored half of a zone row. Everything a server would persist and nothing
 * a server would compute.
 */
export type ZoneSeed = Pick<Zone, 'id' | 'name' | 'city' | 'demand' | 'supply' | 'failures30d'>

/**
 * Declaration order is legacy's seed order (`:13953`–`:13958`), **not** display
 * order. The client sorts; a fixture that arrives pre-sorted hides a sort bug.
 */
export const zoneSeeds: ZoneSeed[] = [
  { id: 'ZONE-01', name: 'Al Narjis', city: 'Riyadh', demand: 14, supply: 2, failures30d: 11 },
  { id: 'ZONE-02', name: 'Al Sahafa', city: 'Riyadh', demand: 9, supply: 3, failures30d: 6 },
  { id: 'ZONE-03', name: 'KAFD / Olaya', city: 'Riyadh', demand: 22, supply: 12, failures30d: 4 },
  { id: 'ZONE-04', name: 'Al Malaz', city: 'Riyadh', demand: 8, supply: 6, failures30d: 2 },
  { id: 'ZONE-05', name: 'Qurtubah', city: 'Riyadh', demand: 6, supply: 5, failures30d: 1 },
  { id: 'ZONE-06', name: 'Al Yasmin', city: 'Riyadh', demand: 11, supply: 4, failures30d: 7 },
]

/**
 * `DB.steerOffers=[]` (`:13960`) — **seeded empty, and that is a reading**.
 *
 * `management.zones.steerOffersLive` is therefore a measured `0`, not an
 * em-dash: we know how many offers are live and the answer is none. QA reaches
 * the offer-live row state through `useLiveSteerOffer()` in the client, not by
 * editing this array.
 */
export const zoneSteerOfferFixtures: ZoneSteerOffer[] = []

/**
 * `DB.recruitmentQueue=[]` (`:13961`). Same rule: empty is the seeded state, and
 * `queueRecruitment()` in the client is what fills it.
 */
export const zoneRecruitmentQueueFixtures: Array<{ zoneId: string; queuedAt: string }> = []

/**
 * `DB.cities` (`:13946`–`:13950`) — four, **one live**. Here because the zones
 * board's `liveCities` tile and the `zones.citiesHealth` breakdown both read it,
 * and because it is the other half of L-6's evidence: three of these rows can
 * never carry a failure rate under `:6942`'s `c.name === 'Riyadh'` test.
 */
export const cityFixtures: Array<{ name: string; active: boolean; launchedYear: string | null }> = [
  { name: 'Riyadh', active: true, launchedYear: '2025' },
  { name: 'Jeddah', active: false, launchedYear: null },
  { name: 'Dammam', active: false, launchedYear: null },
  { name: 'Makkah', active: false, launchedYear: null },
]
