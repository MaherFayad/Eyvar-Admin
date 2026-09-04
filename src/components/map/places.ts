/**
 * **The gazetteer: a place name in the fixtures → a point on the ground.**
 *
 * ## The gap this fills, stated plainly
 *
 * `Trip`, `RideRequest` and `Driver` carry **no coordinates**. A pickup is the
 * string `'Al Sahafa District'` and a captain has a `city` and an `address`;
 * nothing in the data model knows a latitude. Anything that draws one of those
 * rows on a map has to turn a name into a point, and this file is that
 * something — the same job `ZONE_GEOMETRY` does for the zones board, and the
 * same caveat applies: **these are hand-placed anchors, not survey data and not
 * telemetry.** They are accurate to the district, not to the street.
 *
 * What the real API must send instead:
 *
 *   - a **captain's live position**, which cannot be derived from a registered
 *     address (see `captainPoint` in the dispatch board's `geo.ts`, which is
 *     the placeholder and says so);
 *   - a **trip's or request's route** as a polyline. We have two endpoint
 *     names, so a map draws the straight connector between them. Every surface
 *     that draws one says `pickup` and `destination`, never "route", because a
 *     straight line between two districts is not the road anybody drove.
 *
 * Both are on the handover for `docs/07-api/`. Until they arrive, this is the
 * honest version: every mark is labelled as the thing it is.
 *
 * ## Why a gazetteer rather than a geocoder
 *
 * The fixtures use a closed set of ~30 place names. A lookup table over that
 * set is greppable, hand-correctable, and cannot fail at runtime; a geocoding
 * call would put a third-party network dependency behind a monitor screen. A
 * name that is not in the table returns `null` and is **not drawn**, and every
 * caller says how many rows that was — a row missing from a picture and a row
 * missing from the data look identical once you stop saying which it is.
 *
 * ## Why it sits in `components/map` and not in a screen
 *
 * It began in `screens/operations/dispatch/geo.ts`, for the one board that had
 * a map. Three surfaces draw these names now — Live Dispatch, and the request
 * sheet in `components/profile/request` — and a component may not import from a
 * screen. The alternative was a second table, which is the one thing two maps
 * of the same city must never have: `projection.ts`'s header records the same
 * reasoning for the same reason, one file earlier.
 */

import type { GeoPoint } from './projection'

/**
 * Every place name the trip, request and captain fixtures use.
 *
 * Districts carry the anchor `ZONE_GEOMETRY` already chose where the two
 * overlap, so a request picked up in Al Sahafa lands on the Al Sahafa polygon
 * the zones board draws. That agreement is deliberate: two boards showing the
 * same district in two places is worse than neither showing it.
 *
 * Keys are matched case-insensitively and with a trailing `District` or `Dist.`
 * trimmed, so `'Al Sahafa'`, `'Al Sahafa District'` and the address form
 * `'Al Sahafa District, Riyadh'` all resolve to one point. See `normalise`.
 */
const PLACES: Readonly<Record<string, GeoPoint>> = {
  /* ── districts ─────────────────────────────────────────────────────────
     The six that `ZONE_GEOMETRY` also anchors keep its exact numbers. */
  'al narjis': { lat: 24.8555, lng: 46.6575 },
  'al sahafa': { lat: 24.8175, lng: 46.6375 },
  kafd: { lat: 24.766, lng: 46.642 },
  'king abdullah financial district': { lat: 24.766, lng: 46.642 },
  'al malaz': { lat: 24.667, lng: 46.737 },
  qurtubah: { lat: 24.797, lng: 46.78 },
  'al yasmin': { lat: 24.8215, lng: 46.69 },

  /* The rest of the districts the fixtures name, placed from the city's own
     layout: north-west along King Fahd Road, then the older grid to the south. */
  'al aqiq': { lat: 24.7745, lng: 46.628 },
  'al badiah': { lat: 24.625, lng: 46.664 },
  'al malqa': { lat: 24.808, lng: 46.611 },
  'al nuzha': { lat: 24.757, lng: 46.718 },
  'al rabwah': { lat: 24.716, lng: 46.748 },
  'al rawdah': { lat: 24.736, lng: 46.769 },
  'al shifa': { lat: 24.57, lng: 46.729 },
  'al suwaidi': { lat: 24.586, lng: 46.672 },
  'al wurud': { lat: 24.7075, lng: 46.672 },
  hittin: { lat: 24.766, lng: 46.586 },
  'king fahd': { lat: 24.748, lng: 46.674 },
  olaya: { lat: 24.696, lng: 46.6845 },
  'al olaya': { lat: 24.696, lng: 46.6845 },

  /* ── landmarks the fixtures use as destinations ────────────────────── */
  'airport t5': { lat: 24.9578, lng: 46.6989 },
  diriyah: { lat: 24.737, lng: 46.575 },
  'al fanar mall': { lat: 24.8032, lng: 46.7261 },
  'granada mall': { lat: 24.762, lng: 46.742 },
  'king abdullah rd': { lat: 24.759, lng: 46.696 },
  'king fahd rd': { lat: 24.748, lng: 46.674 },
  'king fahd st': { lat: 24.748, lng: 46.674 },
  'king saud university': { lat: 24.7223, lng: 46.6197 },
  'kingdom tower': { lat: 24.7115, lng: 46.6745 },
  'olaya towers': { lat: 24.6935, lng: 46.6855 },
  'princess noura university': { lat: 24.8478, lng: 46.71 },
  'riyadh front': { lat: 24.836, lng: 46.716 },
  'riyadh park': { lat: 24.7726, lng: 46.6157 },
  'riyadh park mall': { lat: 24.7726, lng: 46.6157 },

  /* ── the Arabic forms the fixtures also carry ──────────────────────────
     `denormalisation.test.ts` keeps both languages in the fixtures on purpose;
     a table that only answered the English ones would drop a row from the map
     the moment somebody switched the console to Arabic. */
  'حي الملقا': { lat: 24.808, lng: 46.611 },
  'حي حطين': { lat: 24.766, lng: 46.586 },
  'مستشفى الملك فيصل التخصصي': { lat: 24.689, lng: 46.689 },
  'مطار الملك خالد الدولي، صالة ٥': { lat: 24.9578, lng: 46.6989 },
}

/**
 * One name, in the form `PLACES` is keyed by.
 *
 * The three shapes the fixtures use for one place are `'Al Sahafa'`,
 * `'Al Sahafa District'` and `'Al Sahafa District, Riyadh'`. Trimming the city
 * clause and the word `District` collapses them, so the table holds one entry
 * per place rather than three that can drift apart.
 */
function normalise(name: string): string {
  const withoutCity = name.split(',')[0] ?? name
  return withoutCity
    .trim()
    .toLowerCase()
    .replace(/\s+(district|dist\.?)$/u, '')
    .replace(/\s+/gu, ' ')
}

/** The point for a place name, or `null` when the gazetteer has no entry. */
export function locate(name: string | null | undefined): GeoPoint | null {
  if (name === null || name === undefined || name === '') return null
  return PLACES[normalise(name)] ?? null
}
