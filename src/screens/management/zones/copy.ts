/**
 * Market & Zones — every operator-facing string on the zone-health table and
 * its strip.
 *
 * The tile labels are `05-metrics-content.md` §9.1's, so the strip reads the
 * same whether an operator arrives from the board vocabulary or from the table.
 * **The `metric.management.zones.*` keys stay where they are** — this file does
 * not redefine them, because the metrics board owns that dictionary and two
 * dictionaries for one measure is how two labels for one number start.
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1   sentence case; city and zone names are proper nouns and keep their case.
 *   2   buttons are verbs: `Steer drivers`, `Queue recruitment`.
 *   4   errors are imperatives naming the fix.
 *   6   no period on a badge or a button; sentences take one.
 *  10   no-data is stated in words — **AC-718**'s word is *unserved*, never
 *       *failed*: the request did not fail, it found nobody.
 */

import type { Dictionary } from '@/lib'

export const ZONES_EN: Dictionary = {
  'zones.meta': '{zones} zones · {starved} starved',
  'zones.search': 'Search zones',

  /* The five derived tiles. Two of them narrow the table; three state a total. */
  'zones.tile.captainsNeeded': 'Captains needed',
  'zones.tile.starvedZones': 'Supply-starved zones',
  'zones.tile.unservedRequests30d': 'Unserved requests, 30 days',
  'zones.tile.avgFailureRate': 'Average request failure rate',
  'zones.tile.worstDemandSupplyRatio': 'Worst demand-to-supply ratio',

  'zones.col.zone': 'Zone',
  'zones.col.demandSupply': 'Demand : supply',
  'zones.col.failureRate': 'Failure rate',
  'zones.col.captainsNeeded': 'Captains needed',
  'zones.col.subMomentum': 'Subscription momentum',
  'zones.col.priority': 'Priority',
  'zones.col.actions': 'Actions',
  'zones.demandSupply.detail': '{demand} requests · {supply} captains',
  'zones.unserved.detail': '{count} unserved',

  /* R4-10.1 — two priorities share one tone; the severity step is the label. */
  'zones.priority.recruit-now': 'Recruit now',
  'zones.priority.watch': 'Watch',
  'zones.priority.healthy': 'Healthy',

  'zones.action.steer': 'Steer drivers',
  'zones.action.recruit': 'Queue recruitment',
  'zones.blocked.permission': 'Your role cannot act on a zone.',
  'zones.steer.blocked.live': 'An offer is already live here. Let it run before raising another.',
  'zones.recruit.blocked.queued': 'A recruitment drive is already queued here.',

  /* The offer is an invitation, and the copy says so: captains are independent
     and each one accepts or ignores it (`:14011`). */
  'zones.steer.title': 'Steer drivers to {zone}?',
  'zones.steer.body':
    'Captains are independent — the offer is an invitation each one can accept or ignore. It runs for {hours} hours or until {cap} is spent, whichever comes first, and it cannot be extended.',
  'zones.steer.confirm': 'Send offer',
  'zones.steer.amount.label': 'Bonus per completed trip in the zone',
  'zones.steer.amount.help': 'Paid on top of the fare, per trip, inside this zone.',
  'zones.steer.amount.message': 'Enter an amount up to {cap}.',
  'zones.toast.steered': 'Offer live',
  'zones.toast.recruited': 'Recruitment drive queued',

  'zones.error.read': 'Change the filters, then read again.',
  'zones.error.retry': 'Read again',
  'zones.error.row': 'That did not go through. Try again.',

  'zones.noMatch': 'No zone matches these filters.',
  'zones.noMatch.action': 'Show every zone',
  'zones.empty.heading': 'No zone is tracked',
  'zones.empty.body':
    'A zone is a district we measure demand and supply in. None is tracked in this city yet.',
  'zones.empty.action': 'Show every zone',

  'zones.cities.heading': 'Cities',
  'zones.cities.col.city': 'City',
  'zones.cities.col.zones': 'Zones tracked',
  'zones.cities.col.failureRate': 'Failure rate',
  /* **L-6's two honest reasons.** A city with no tracked zone has no rate, and
     the row says which of the two kinds of nothing it is. */
  'zones.cities.notLive': 'Not launched',
  'zones.cities.noZones': 'Live, no zone tracked yet',
}
