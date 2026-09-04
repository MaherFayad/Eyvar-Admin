/**
 * 360° profile resolver and global search — foundation spec §4.3.1, §4.3.4.
 *
 * Two operations the shell cannot work without:
 *   `resolveProfile(id)`  — what `?entity=<id>` opens
 *   `search(q)`           — the field that makes a 5-workspace structure
 *                           survivable when someone cannot find where
 *                           Cancellation Policy went
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, notFound } from '../mock/delay'
/**
 * **`all*`, never the seed array.**
 *
 * `fixtures/trips.ts` is `[...tripFixtures, ...fillerTrips]`; drivers and
 * subscriptions split the same way. Every index client serves the combined
 * array — `clients/trips.ts` imports `allTripFixtures`, `clients/drivers.ts`
 * `allDriverFixtures`, `clients/subscriptions.ts` `allSubscriptionFixtures` —
 * and this module used to import the three **seed** arrays.
 *
 * The consequence was not subtle: the Trips index pages through 132 rows and
 * the resolver could see 12 of them, so **an operator clicking a row the table
 * had just rendered got `No record found`** on the majority of rows. Same for
 * 44 of 57 captains and 60 of 70 subscriptions. It survived because every
 * profile section renders an error today regardless, which masked the 404
 * behind it.
 *
 * `riderFixtures` is already the combined array (`fixtures/riders.ts` composes
 * it from `namedRiders` + `fillerRiders` under that name), and applicants,
 * corporate accounts, tickets and plans have no filler rows at all — so the
 * three below are the whole of the fix. **If a fixture file grows a `filler*`
 * array, this import list is the second place to change.**
 */
import { LEGACY_PAGE_TITLES } from '../fixtures/legacyPages'
import { SUB_TABS } from '../fixtures/routeTable'
/* Deep import, not the `@/lib` barrel: this module's dependency on the shared
   layer is one pure function, and the import should say so. */
import { matchScore } from '../../lib/search/fuzzy'
/* See `destinationTitle` below for why the English catalogue is imported here
   and why that does not put UI inside the data layer. */
import { EN } from '../../i18n/dictionaries'
import type {
  ProfileEntityType,
  ProfileRef,
  ProfileSectionKey,
  SearchResponse,
  SearchResult,
} from '../types/profile'
import { resolveLegacyPage } from './routes'
import { http } from './http'
import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. Bound before any mock read, because `mock()`
   and `mockMutation()` await `loadFixtures()`. */
let corporateAccountFixtures!: Fixtures['corporateAccountFixtures']
let allDriverFixtures!: Fixtures['allDriverFixtures']
let applicantFixtures!: Fixtures['applicantFixtures']
let subscriptionPlanFixtures!: Fixtures['subscriptionPlanFixtures']
let complaintFixtures!: Fixtures['complaintFixtures']
let paymentFixtures!: Fixtures['paymentFixtures']
let newRiderFixtures!: Fixtures['newRiderFixtures']
let riderFixtures!: Fixtures['riderFixtures']
let allSubscriptionFixtures!: Fixtures['allSubscriptionFixtures']
let ticketFixtures!: Fixtures['ticketFixtures']
let allTripFixtures!: Fixtures['allTripFixtures']
let allRequestFixtures!: Fixtures['allRequestFixtures']
onFixturesLoaded((f) => {
  corporateAccountFixtures = f.corporateAccountFixtures
  allDriverFixtures = f.allDriverFixtures
  applicantFixtures = f.applicantFixtures
  subscriptionPlanFixtures = f.subscriptionPlanFixtures
  complaintFixtures = f.complaintFixtures
  paymentFixtures = f.paymentFixtures
  newRiderFixtures = f.newRiderFixtures
  riderFixtures = f.riderFixtures
  allSubscriptionFixtures = f.allSubscriptionFixtures
  ticketFixtures = f.ticketFixtures
  allTripFixtures = f.allTripFixtures
  allRequestFixtures = f.allRequestFixtures
})

export const PROFILE_OPERATIONS = {
  resolve: 'profile.resolve',
  resolveBatch: 'profile.resolveBatch',
  search: 'search.query',
} as const

/* Registered at module load, not on first call. `config.ts` says *"each client
   registers its ids here at module load"*, and `mock()` only registers when it
   runs — so an operation nobody has invoked yet is missing from a QA panel's
   list and from any validation of `?mockFail=`. Every id in this module is
   listed the moment the module is imported. */
registerOperations(...Object.values(PROFILE_OPERATIONS))

/**
 * GET /api/v1/entities/:entityId
 *   -> ProfileRef
 *   404 when the id resolves to nothing — and the copy must name the id that
 *      was searched (§9.2 `overlay-not-found`), which is why `notFound` carries it.
 *
 * Prefix-based resolution mirrors the id scheme the whole product already uses
 * (`RDR-`, `DRV-`, `TRP-`, `SUB-`, `PAY-`, `CMP-`, `TKT-`, `APP-`, `CORP-`,
 * `REQ-` and `SREQ-`).
 * Legacy resolves by scanning collections in an arbitrary `for…in` order
 * (`:3266`); prefixes make it deterministic and make the five missing types
 * (§4.3.1) a one-line addition each rather than a rewrite.
 */
export async function resolveProfile(entityId: string, signal?: AbortSignal): Promise<ProfileRef> {
  if (DATA_SOURCE === 'http') return http.get<ProfileRef>(`/entities/${entityId}`, undefined, { signal })
  return mock(PROFILE_OPERATIONS.resolve, signal, () => {
    const ref = resolveLocally(entityId)
    if (!ref) throw notFound('record', entityId)
    return ref
  })
}

/**
 * POST /api/v1/entities/resolve
 *   body: { ids: string[] }
 *   -> { entities: Record<string, ProfileRef | null> }
 *
 * **One request for a page of ids** — P8-T1. Every cell that names an entity
 * has to decide whether to render a link or plain text, and doing that with
 * `resolveProfile` per cell is up to ~40 sequential round trips on a full
 * index page. `screens/financials/shared/entityLinks.tsx` already has a
 * `resolveMissing` seam that collapses into a single call to this.
 *
 * ## Three properties the callers depend on, stated as contract
 *
 * **1. `null` means resolved-and-absent. It never means "the request failed".**
 * Callers cache a 404 permanently and deliberately do *not* cache a transport
 * failure, so that a dropped request downgrades one cell for one render rather
 * than for the life of the tab. Collapsing the two outcomes into one `null`
 * would silently destroy that distinction.
 *
 * **2. There is no partial failure.** The whole call succeeds or the whole call
 * throws, exactly as `resolveProfile` does. The alternative — a per-id
 * `{ ok, value }` envelope — was considered and rejected: it would make every
 * caller handle a third outcome that the mock cannot produce and that a real
 * endpoint should not either. A batch resolve reads a keyed index; if it can
 * answer for one id it can answer for all of them, and if it cannot answer at
 * all that is a 5xx on the request. **If a future server does need partial
 * failure, it needs a different return type and a different name**, because
 * widening `ProfileRef | null` in place is precisely the change that would look
 * compatible and would not be.
 *
 * **3. A non-entity id costs nothing and throws nothing.** Callers pre-filter on
 * prefix, so `ESC-1052`, `CASH-0001`, `DED-01` and `PO-0001` should never
 * arrive. One that does resolves to `null` like any other unknown id — this is
 * a lookup, not a validator, and an exception on one bad key would take down
 * the other thirty-nine.
 *
 * **`PAY-` is ambiguous and this does not guess.** `payablePrefix()`
 * (`clients/payouts.ts:138`) mints **ledger posting** ids as
 * `PAY-<captain number>`, so `PAY-0102-4` is a posting while `PAY-5510` is a
 * payment. `resolveLocally` answers `null` for the first and a `payment` ref
 * for the second, which is correct in both cases; nothing here relaxes the
 * match to make the posting resolve.
 *
 * Duplicate ids collapse — the return is a map — and the key is the id **as
 * given**, not the uppercased form `resolveLocally` matches on, so a caller can
 * look up what it passed in.
 */
export async function resolveProfiles(
  ids: readonly string[],
  signal?: AbortSignal,
): Promise<Record<string, ProfileRef | null>> {
  if (DATA_SOURCE === 'http') {
    const res = await http.post<{ entities: Record<string, ProfileRef | null> }>(
      '/entities/resolve',
      { ids: [...ids] },
      { signal },
    )
    return res.entities
  }
  return mock(PROFILE_OPERATIONS.resolveBatch, signal, () => {
    const out: Record<string, ProfileRef | null> = {}
    for (const id of ids) {
      /* Keyed by the id AS GIVEN. `resolveLocally` uppercases to match, and a
         caller that passed `rdr-1041` must still find its own key back. */
      if (id in out) continue
      out[id] = resolveLocally(id)
    }
    return out
  })
}

/**
 * GET /api/v1/search
 *   params: q · scope · limit
 *   -> SearchResponse
 *
 * Covers three kinds of target (§4.3.4): entities, destinations (by current
 * name **and by legacy name**, via the route table's `legacyPageIds`), and
 * named actions. Results the operator cannot open must not appear (AC-60) —
 * that filtering is the server's, because the client does not hold the
 * permission truth.
 *
 * **Matching and ranking are the server's job too, which is why they are here**
 * (`OPERATOR-EXPERIENCE-PLAN.md` P3-T1…T4). `cmdk`'s own filter stays off:
 * re-ranking on the client would mean the palette's ordering silently changed
 * the day `DATA_SOURCE` flips to `http`. Everything below is the contract the
 * real endpoint inherits — one score on one scale, produced by
 * `lib/search/fuzzy`, for all three kinds.
 */
export async function search(
  q: string,
  opts: { scope?: string | null; limit?: number } = {},
  signal?: AbortSignal,
): Promise<SearchResponse> {
  if (DATA_SOURCE === 'http') {
    return http.get<SearchResponse>('/search', { q, scope: opts.scope ?? undefined, limit: opts.limit }, { signal })
  }
  return mock(PROFILE_OPERATIONS.search, signal, () => {
    /* Trimmed only. Case, script, diacritics and digit set are folded by the
       matcher, on both sides — lowercasing here would fold one side twice and
       the other not at all. */
    const needle = q.trim()
    if (!needle) return { results: [], query: q, scope: opts.scope ?? null, computedAt: EYVAR_NOW }
    const results = [...searchEntities(needle), ...searchDestinations(needle)]
      // Stable descending: equal scores keep fixture order, so "Al-Harbi" does
      // not silently pick a different one of the two people on every keystroke.
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.limit ?? 20)
    return { results, query: q, scope: opts.scope ?? null, computedAt: EYVAR_NOW }
  })
}

/* ─────────────────────────────── resolution ────────────────────────────── */

const SECTIONS: Record<ProfileEntityType, ProfileSectionKey[]> = {
  rider: ['identity', 'subscriptions', 'trips', 'wallet', 'payments', 'tickets', 'movement', 'devices'],
  driver: ['identity', 'trips', 'compliance', 'commitment', 'wallet', 'payments', 'fairness', 'movement', 'devices'],
  trip: ['identity', 'trips', 'payments', 'disputes'],
  subscription: ['identity', 'subscriptions', 'trips', 'payments'],
  payment: ['identity', 'payments'],
  complaint: ['identity', 'disputes', 'tickets'],
  'new-rider': ['identity', 'movement', 'devices'],
  applicant: ['identity', 'compliance', 'movement', 'devices'],
  ticket: ['identity', 'tickets', 'disputes'],
  'corporate-account': ['identity', 'subscriptions', 'payments'],
  plan: ['identity', 'subscriptions'],
  /**
   * **One section, and the one that is honest.** A request is a record about a
   * ride that has not happened: there is no trip behind it, no payment, no
   * dispute and no ledger — those all belong to the trip it becomes. `identity`
   * carries the whole of what the row knows, and the DRAWER does not render
   * this stack at all (it has its own arrangement, exactly as a rider and a
   * captain do). This list is what the full-page escape at `/entity/REQ-*`
   * draws, and a card claiming a request has payments would be a card that
   * always fails.
   */
  request: ['identity'],
}

/**
 * All eleven, in the order a prefix collision is least likely to matter.
 *
 * **This resolves the same eleven `searchEntities` finds, and that is not a
 * nicety.** A search hit carries `target: { entityId, entityType }`; the shell
 * turns that into `?entity=<id>`, which comes straight back here. Making a
 * ticket findable but not openable would replace legacy's "No record found" on
 * the search box with the same sentence one click later (§4.3.1).
 */
/**
 * **Case-insensitive on BOTH sides, and that is a bug fix.**
 *
 * `resolveLocally` uppercased the incoming id and then compared it to the
 * fixture's id verbatim — which works only while every id is already upper
 * case. `SUB-1052b` is not: its lowercase suffix marks it as the second cycle
 * on one rider, and it is a real row the Subscriptions table renders and links
 * to. The comparison could never match it, so `?entity=SUB-1052b` answered
 * *"No record found"* about a record sitting in the list behind the overlay.
 *
 * The `plan` branch already compared `p.id.toUpperCase() === id` for the same
 * reason one step further on — catalogue slugs are lower case — so this makes
 * the rule uniform rather than introducing one.
 */
function matches(recordId: string, id: string): boolean {
  return recordId.toUpperCase() === id
}

function resolveLocally(entityId: string): ProfileRef | null {
  const id = entityId.trim().toUpperCase()

  /* **Every branch returns the RECORD's own id, never the uppercased input.**
     The two are the same for all but `SUB-1052b` and the plan slugs — and for
     those the uppercased form is what every downstream client would then be
     asked for. `useProfileRecord` calls `getSubscription(ref.entityId)`, so a
     ref carrying `SUB-1052B` resolves and then 404s on its own record, which is
     a worse failure than not resolving at all. */

  const rider = riderFixtures.find((r) => matches(r.id, id))
  if (rider) return ref(rider.id, 'rider', rider.name, rider.phone)

  const newRider = newRiderFixtures.find((r) => matches(r.id, id))
  if (newRider) return ref(newRider.id, 'new-rider', newRider.name, newRider.phone)

  const driver = allDriverFixtures.find((d) => matches(d.id, id))
  if (driver) return ref(driver.id, 'driver', driver.name, driver.vehicle)

  const applicant = applicantFixtures.find((a) => matches(a.id, id))
  if (applicant) return ref(applicant.id, 'applicant', applicant.name, applicant.vehicle)

  const trip = allTripFixtures.find((t) => matches(t.id, id))
  if (trip) return ref(trip.id, 'trip', trip.id, trip.route)

  const sub = allSubscriptionFixtures.find((s) => matches(s.id, id))
  if (sub) return ref(sub.id, 'subscription', sub.id, sub.planName)

  const corp = corporateAccountFixtures.find((c) => matches(c.id, id))
  if (corp) return ref(corp.id, 'corporate-account', corp.companyName, corp.contactName)

  const ticket = ticketFixtures.find((t) => matches(t.id, id))
  if (ticket) return ref(ticket.id, 'ticket', ticket.subject, ticket.entityName)

  /* Both of these read real fixtures now. The subtitle is the person the record
     hangs off — a payment's payer, a complaint's captain — because that is what
     an operator recognises on a row whose title is an opaque id. */
  const payment = paymentFixtures.find((p) => matches(p.id, id))
  if (payment) return ref(payment.id, 'payment', payment.id, payment.riderName ?? payment.captainName)

  const complaint = complaintFixtures.find((c) => matches(c.id, id))
  if (complaint) return ref(complaint.id, 'complaint', complaint.id, complaint.driverName)

  /**
   * `REQ-*` and `SREQ-*`. Both channels are one resource and one prefix space,
   * so one lookup answers both — see `types/request.ts` on why the two legacy
   * collections became one type.
   *
   * **The route is deliberately NOT the title or the subtitle**, though it is
   * what an operator recognises. A route is `{pickup} → {destination}` and that
   * arrow **mirrors**: the Arabic form is `←`, and §9.5 fixes the swap at
   * string-construction time, which is the dictionary — not here. A pre-joined
   * route string minted in the data layer is exactly `Trip.route`, which
   * `components/profile/rider/copy.ts` records as unusable for that reason: *"one
   * pre-joined string with a hard-coded `→` that no dictionary can mirror, no
   * `<bdi>` can isolate and no translator can reach."*
   *
   * So the ref carries the id and the person, the same shape `payment` and
   * `complaint` use, and `RequestBand` builds the route itself from
   * `requests.route` once the record lands. Both place names are still
   * searchable — see `searchEntities`.
   */
  const request = allRequestFixtures.find((r) => matches(r.id, id))
  if (request) return ref(request.id, 'request', request.id, request.riderName)

  /* Plan ids are catalogue slugs (`weekly`), not prefixed keys, so the
     uppercase normalisation above does not apply to them. The ref carries the
     fixture's own id, because that is what every other client keys on. */
  const plan = subscriptionPlanFixtures.find((p) => matches(p.id, id))
  if (plan) return ref(plan.id, 'plan', plan.nameEn, null)

  return null
}

/* ─────────── the two entity types that used to have no fixture ─────────── */

/**
 * **`paymentIndex` and `complaintIndex` are gone.**
 *
 * They were two module-scope builders that scraped `Trip.paymentId`,
 * `Rider.paymentIds`, `Driver.paymentIds` and both `complaintIds` arrays into
 * thin `{ id, subtitle }` rows, so that `?entity=PAY-5510` and
 * `?entity=CMP-330` resolved to *something* rather than throwing. Their own
 * comment named the fix — `paymentFixtures` and `complaintFixtures` with real
 * types — and said that when it landed, nothing else in this module would
 * change. It landed, and nothing else did: `resolveLocally` and
 * `searchEntities` each swapped one collection for another.
 *
 * What the deletion buys, beyond one fewer workaround:
 *
 *   - a payment row carries a real payer, a real amount and a real settlement
 *     state, so the identity card behind `?entity=PAY-*` stops having to state
 *     its own limitation;
 *   - a complaint row carries the captain it is against, so search can match on
 *     a name nobody had to invent;
 *   - the id space is **exactly** what the fixtures hold, rather than whatever
 *     other records happened to mention. An id nothing references is now
 *     findable, and an id that is referenced is guaranteed to resolve —
 *     `fixtures/payments.ts` derives its rows from the references themselves so
 *     that stays true when trips move.
 */

function ref(id: string, type: ProfileEntityType, title: string, subtitle: string | null): ProfileRef {
  return { entityId: id, entityType: type, title, subtitle, fullPagePath: `/entity/${id}`, sections: SECTIONS[type] }
}

/* ──────────────────────────────── search ──────────────────────────────── */

/**
 * **One score, one scale, every kind** — P3-T4.
 *
 * `lib/search/fuzzy` returns `(0, 1]` for how well a query matches one string.
 * Everything below is the only other thing a ranker needs: *which* string was
 * matched, expressed as a multiplier. There are no free constants left — the
 * 100/80/60/70/75 this replaces could not be compared with each other because
 * nothing said what they measured.
 *
 * The weights are ordered by how strong a statement of intent the field is:
 *
 *   `id` 1.00      — an operator who types `TKT-505` has already decided.
 *   `name` 0.95    — the usual case, and a hair below an id only so that a
 *                    record whose *id* matches outranks one whose name does.
 *   `detail` 0.80  — phone, route, plan name, related person. Real, but a
 *                    second-line field: `Weekly` matching sixty subscriptions'
 *                    plan name must not bury the plan itself.
 */
const FIELD_WEIGHT = {
  id: 1,
  name: 0.95,
  detail: 0.8,
} as const

/** `(0, 1]` → the `0…100` integer `SearchResult.score` is documented as. */
function toScore(value: number): number {
  return Math.round(Math.min(1, value) * 100)
}

function searchEntities(needle: string): SearchResult[] {
  const out: SearchResult[] = []

  /**
   * `alsoKnownAs` is for a record with a second real name — a plan carries
   * `nameEn` and `nameAr` and an operator may type either. It is weighted as a
   * name, not as a detail, because it *is* the name.
   */
  const push = (
    id: string,
    type: ProfileEntityType,
    title: string,
    subtitle: string | null,
    alsoKnownAs: readonly string[] = [],
  ) => {
    const score = Math.max(
      matchScore(needle, id) * FIELD_WEIGHT.id,
      matchScore(needle, title) * FIELD_WEIGHT.name,
      ...alsoKnownAs.map((name) => matchScore(needle, name) * FIELD_WEIGHT.name),
      subtitle === null ? 0 : matchScore(needle, subtitle) * FIELD_WEIGHT.detail,
    )
    if (score <= 0) return
    out.push({
      kind: 'entity',
      title,
      subtitle: `${id}${subtitle ? ` · ${subtitle}` : ''}`,
      target: { entityId: id, entityType: type },
      matchedLegacyName: null,
      score: toScore(score),
    })
  }

  /* All eleven `PROFILE_ENTITY_TYPES` (§4.3.1). The five below the line are the
     ones `UNRESOLVED_IN_LEGACY` records as returning "No record found", plus
     `payment` and `complaint`, which legacy resolved, the rebuild lost, and
     `fixtures/payments.ts` / `fixtures/complaints.ts` have now restored. */
  riderFixtures.forEach((r) => push(r.id, 'rider', r.name, r.phone))
  allDriverFixtures.forEach((d) => push(d.id, 'driver', d.name, d.phone))
  applicantFixtures.forEach((a) => push(a.id, 'applicant', a.name, a.phone))
  corporateAccountFixtures.forEach((c) => push(c.id, 'corporate-account', c.companyName, c.contactName))
  allTripFixtures.forEach((t) => push(t.id, 'trip', t.id, t.route))
  allSubscriptionFixtures.forEach((s) => push(s.id, 'subscription', s.id, s.planName))

  newRiderFixtures.forEach((r) => push(r.id, 'new-rider', r.name, r.phone))
  ticketFixtures.forEach((t) => push(t.id, 'ticket', t.subject, t.entityName))
  subscriptionPlanFixtures.forEach((p) => push(p.id, 'plan', p.nameEn, null, [p.nameAr]))
  paymentFixtures.forEach((p) => push(p.id, 'payment', p.id, p.riderName ?? p.captainName))
  /* `alsoKnownAs` carries the rider who complained: an operator hunting a
     complaint usually remembers one of the two people on it, not which side. */
  complaintFixtures.forEach((c) => push(c.id, 'complaint', c.id, c.driverName, [c.riderName]))
  /* **The two place names ride in `alsoKnownAs`, at NAME weight**, and that is
     the right weight rather than a generous one: an operator typing `KAFD` into
     the palette has named the ride as precisely as one typing the rider, and a
     request is the only record whose two most memorable facts are both places.
     The subtitle is the rider, matching the ref `resolveLocally` mints — and
     neither carries the route's arrow, which cannot mirror outside a
     dictionary. */
  allRequestFixtures.forEach((r) =>
    push(r.id, 'request', r.id, r.riderName, [r.pickup, r.destination]),
  )

  return out
}

/**
 * **The translated title, not the i18n key** — P3-T2, and the data-layer half
 * of defect D-7.
 *
 * `searchDestinations` used to match `row.titleKey`, so typing `captains` found
 * nothing at all: the key reads `subtab.operations.people`. It also *returned*
 * that key as the result's `title`, which is why `GlobalSearch` grew a guard
 * that puts anything key-shaped back through `t()`.
 *
 * **Why the English catalogue is imported into `src/data`.** The alternative —
 * a resolver passed in by the caller — would put a function on `search`'s
 * options object, and that object is the HTTP query string (`q`, `scope`,
 * `limit`). A parameter the wire cannot carry is not part of the contract the
 * real endpoint inherits, so it would be a mock-only back door pretending to be
 * an API. Duplicating the 35 titles inside `src/data` is worse still: it drifts
 * the first time a sub-tab is renamed.
 *
 * The import is safe in the direction that matters. `i18n/dictionaries` is a
 * string catalogue: it imports `@/lib` and the screens' leaf `copy.ts` modules,
 * none of which import `src/data`, so there is no cycle. And it is only ever
 * read on the mock path — when `DATA_SOURCE === 'http'` the server's own titles
 * are returned untouched, which is exactly right, because on that path the
 * server is the thing that knows what its destinations are called.
 */
function destinationTitle(key: string): string {
  return EN[key] ?? key
}

/**
 * How much each destination field is worth, on the same scale as `FIELD_WEIGHT`.
 *
 *   `title` 1.00     — the name on the tab.
 *   `view` 0.98      — a view is a real destination one level in. Barely
 *                      discounted: `Captains` is what the operator calls the
 *                      thing, even though the tab above it says `People`.
 *   `path` 0.90      — a route segment is typeable and unambiguous, but it is a
 *                      URL, not a label.
 *   `subtitle` 0.70  — descriptive prose. `Captains and riders, from
 *                      application to compliance` contains half the vocabulary
 *                      in the product; a hit there is a hint, not a decision.
 */
const DESTINATION_WEIGHT = {
  title: 1,
  view: 0.98,
  path: 0.9,
  subtitle: 0.7,
} as const

/**
 * The one weight above 1 in this file. An operator who types a name that **no
 * longer exists anywhere in the product** has told you something a
 * current-name match cannot: they are looking for a page that moved. That is
 * the §4.3.4 case the legacy-name index exists for, so the row that answers it
 * edges ahead of a merely equal current-name hit. Capped back to 1 by
 * `toScore`, so the scale stays `0…100`.
 */
const LEGACY_NAME_WEIGHT = 1.05

function searchDestinations(needle: string): SearchResult[] {
  const out: SearchResult[] = []

  /* By current name. One row per sub-tab, never one per matching field: an
     operator looking for Captains wants one way in, not three rows that all
     land on the same screen. */
  for (const row of SUB_TABS) {
    const title = destinationTitle(row.titleKey)
    const subtitle = row.subtitleKey === null ? null : destinationTitle(row.subtitleKey)

    let best = Math.max(
      matchScore(needle, title) * DESTINATION_WEIGHT.title,
      matchScore(needle, row.path) * DESTINATION_WEIGHT.path,
      subtitle === null ? 0 : matchScore(needle, subtitle) * DESTINATION_WEIGHT.subtitle,
    )

    /* If a view matched better than the tab, the view *is* the destination and
       the row says so — `Captains`, opening `?view=captains`, rather than
       `People` and a second click. */
    let viewId: string | null = null
    let label = title
    for (const view of row.views) {
      const viewTitle = destinationTitle(view.titleKey)
      const score = matchScore(needle, viewTitle) * DESTINATION_WEIGHT.view
      if (score <= best) continue
      best = score
      viewId = view.id
      label = viewTitle
    }

    if (best <= 0) continue
    out.push({
      kind: 'destination',
      title: label,
      subtitle: viewId === null ? row.path : `${row.path}?view=${viewId}`,
      target: { path: row.path, viewId },
      matchedLegacyName: null,
      score: toScore(best),
    })
  }

  /* By legacy name — the §4.3.4 case: "Renewal pipeline" resolves to
     Operations › Subscriptions — Expiring ≤ 7 days without the operator knowing
     it moved. `resolveLegacyPage` still decides *which* pages are candidates
     (substring over `LEGACY_PAGE_TITLES`); this only scores what it returned.
     The page id is scored too, because several are typeable names in their own
     right and do not appear in their title — `all-pending` is not a substring
     of "All Pending Applications". */
  for (const hit of resolveLegacyPage(needle)) {
    const legacyTitle = LEGACY_PAGE_TITLES[hit.legacyPageId] ?? hit.legacyPageId
    const score =
      Math.max(matchScore(needle, legacyTitle), matchScore(needle, hit.legacyPageId)) *
      LEGACY_NAME_WEIGHT
    if (score <= 0) continue
    out.push({
      kind: 'destination',
      title: legacyTitle,
      subtitle: hit.viewId ? `${hit.path}?view=${hit.viewId}` : hit.path,
      target: { path: hit.path, viewId: hit.viewId },
      matchedLegacyName: hit.legacyTitle,
      score: toScore(score),
    })
  }

  return bestPerDestination(out)
}

/**
 * One row per place you can end up. The current-name and legacy-name passes can
 * both land on the same `path` + `view`, and two identical-looking rows in a
 * palette is a bug the operator has to resolve. Highest score wins; the legacy
 * row wins a tie by construction, which is what keeps `matchedLegacyName`
 * populated so a row can still say *"was: Renewal pipeline"*.
 */
function bestPerDestination(rows: SearchResult[]): SearchResult[] {
  const best = new Map<string, SearchResult>()
  for (const row of rows) {
    const key = 'path' in row.target ? `${row.target.path}|${row.target.viewId ?? ''}` : row.title
    const existing = best.get(key)
    if (existing === undefined || row.score > existing.score) best.set(key, row)
  }
  return [...best.values()]
}
