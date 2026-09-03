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
  /* **The window left the label and became the note beside the number.** It
     read `Unserved requests, 30 days` — a label carrying its own scope in a
     subordinate clause, which is the thing R4-4 §4.2 has a slot for. The slot
     is the note below; the label names the measure and nothing else. */
  'zones.tile.unservedRequests30d': 'Unserved requests',
  /* **Both lost a word, and the word they lost was the one that wrapped.** The
     strip is five equal columns of a capped measure, so at 1440 each label has
     about 200px; `Average request failure rate` and
     `Worst demand-to-supply ratio` each ran to two lines, which pushed their
     numerals a line lower than the three beside them — five readings meant to
     be scanned as one row, drawn on two baselines.

     Nothing is lost with the words. `request` is the only thing on this screen
     that can fail, and `ratio` is what `demand-to-supply` already names. */
  'zones.tile.avgFailureRate': 'Average failure rate',
  'zones.tile.worstDemandSupplyRatio': 'Worst demand-to-supply',

  /* ── THE STRIP'S NOTES. ────────────────────────────────────────────────
     One short phrase beside a reading, saying what a reader must know to read
     it correctly: what would clear it, what it is out of, what window it
     covers. FRAGMENTS, so no terminal period (R6), and never a value — the
     value is the numeral they sit beside.

     Two of the five have none. `Average request failure rate` is a percentage
     across the live zones and the label says so; `Worst demand-to-supply` takes
     the WORST ZONE'S NAME, which is data rather than copy and comes from the
     rows. A note nobody can write honestly is a note that does not render. */
  'zones.tile.captainsNeeded.note': 'to clear starved zones',
  'zones.tile.starvedZones.note': 'of {total}',
  'zones.tile.unservedRequests30d.note': '30 days',

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
  /* The colon is the reference's and it is doing work: `demand to supply` reads
     as a direction of travel, and the reading is a RATIO — one number set
     against another. It is also the phrase the table's own column header
     already uses (`zones.col.demandSupply`), so the tab on the band and the
     column under the map now name the measure identically. */
  'zones.map.metric.ratio': 'demand : supply',
  'zones.map.metric.failure': 'failure rate',
  'zones.map.metric.demand': 'requests',
  'zones.map.reading.demand': '{count} req',
  /* The two zoom controls. Icon-only buttons, so these ARE their names — a
     `+` with no accessible name is a button that announces itself as "button". */
  'zones.map.zoom.in': 'Zoom in',
  'zones.map.zoom.out': 'Zoom out',
  'zones.map.legend.low': 'Lower',
  'zones.map.legend.high': 'Higher {metric}',
  /* A zone we track but hold no boundary for. Stated, never dropped — a zone
     missing from the picture and a zone missing from the data look identical
     the moment nobody says which it is. */
  'zones.map.unmapped': 'No boundary is recorded for {zones}.',
  /* The list's eyebrow, which names the SORT and not the rows. `{metric}` is
     whichever measure the band's switch is on, so the eyebrow and the numbers
     down the right of the list can never disagree about what is being ranked.

     The search that used to sit under it is gone: six rows is a list you scan,
     every district on the canvas is its own button, and the table below the map
     carries the search, the filters and the pagination for a list long enough
     to need them. */
  'zones.map.list.heading': 'All zones',
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
  /* The shortfall reading's own note — what the number would BUY, in the slot
     R4-4 §4.2 keeps for exactly that. A fragment, so no terminal period (R6).
     The three is the starved threshold the sentence above already names; it is
     one number stated in one voice rather than a value interpolated twice. */
  'zones.map.captainsNeeded.detail': 'to reach 3 requests each',
}
