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
  /* **The coverage clause replaces the four-row `Cities` card.** Three of its
     four rows were an em dash because three of the four cities are not
     launched; that is one number, not a table. `{cities} of {allCities}` is
     the whole of what the card carried that nothing else on the screen did. */
  'zones.meta': '{zones} zones · {starved} starved · {cities} of {allCities} cities live',
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

  'zones.action.steer': 'Steer captains',
  'zones.action.recruit': 'Queue recruitment',
  'zones.blocked.permission':
    'You cannot act on a zone. Ask an Owner for the “Operational policy” permission.',
  'zones.steer.blocked.live': 'An offer is already live here. Let it run before raising another.',
  'zones.recruit.blocked.queued': 'A recruitment drive is already queued here.',

  /* The offer is an invitation, and the copy says so: captains are independent
     and each one accepts or ignores it (`:14011`). */
  'zones.steer.title': 'Steer captains to {zone}?',
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
  'zones.empty.heading': 'Where demand and supply meet, district by district',
  'zones.empty.body':
    'A zone is a district where demand and supply are measured. None is tracked in this city yet.',
  'zones.empty.action': 'Show every zone',

  /* ── the zone map ──────────────────────────────────────────────────────
     The map draws Eyvar's own zone boundaries and fetches nothing. Every
     string here names what the operator is looking at rather than what drew
     it: there is no basemap to attribute and no provider to credit. */
  'zones.map.heading': 'Zone map',
  'zones.map.a11y.desc':
    '{count} zones, shaded by {metric}. Every zone is also listed beside the map.',
  'zones.map.metric.label': 'Shade by',
  'zones.map.metric.ratio': 'demand to supply',
  'zones.map.metric.failure': 'failure rate',
  'zones.map.metric.demand': 'requests',
  'zones.map.reading.demand': '{count} req',
  'zones.map.shading.on': 'Hide shading',
  'zones.map.shading.off': 'Show shading',
  'zones.map.legend.low': 'Lower',
  'zones.map.legend.high': 'Higher {metric}',
  /* A zone we track but hold no boundary for. Stated, never dropped — a zone
     missing from the picture and a zone missing from the data look identical
     the moment nobody says which it is. */
  'zones.map.unmapped': 'No boundary is recorded for {zones}.',
  'zones.map.list.heading': 'Zones',
  'zones.map.search': 'Search zones',
  'zones.map.noMatch': 'No zone matches this search.',
  'zones.map.noMatch.action': 'Clear search',
  /* R5-11's third sentence: nothing is captured, so there is nothing to draw.
     Not "no data for this range" — the range is not what is missing. */
  'zones.map.empty': 'Nothing is recorded here yet.',
  'zones.map.loading': 'Drawing the zone map',
  'zones.map.error': 'Change the filters, then read again to redraw the map.',
  /* The un-retryable half — a 401, 403, 404, 409 or 422. Rule 4 still applies:
     name the fix, and the fix here is not the button that would fail again. */
  'zones.map.error.final': 'The map cannot be drawn with this role and this filter.',
  'zones.map.inspector.heading': 'Zone detail',
  'zones.map.inspector.none': 'Pick a zone on the map or in the list to see its detail.',
  'zones.map.captainsNeeded': '{count} more captains reach 3 requests per captain here.',
}
