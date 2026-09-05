/**
 * **How the palette collects a target — P3-T6's second half.**
 *
 * ## The gap this fills, stated so it is not mistaken for a design
 *
 * `Command.arity` says a command `needs-target`. `Command.scope` says the
 * target is a `driver`. **Nothing in the registry says how to find one.** That
 * is fine for a row kebab, where the record is already under the cursor, and
 * for a bulk bar, where the selection is already made — and it is exactly what
 * is missing the moment a surface has to *offer* candidates.
 *
 * So the palette needs a second table, keyed by `ProfileEntityType`, saying
 * where records of that type come from and how one renders. That is this file.
 * **It is reported in the handoff as the one thing the registry cannot
 * express** — the alternative is a `resolveTargets` member on `Command`, which
 * would be declared identically on every command of the same entity type and is
 * therefore a property of the type, not of the command.
 *
 * ## Ranking is the data layer's, and stays there
 *
 * The candidate list goes through **`search()`**, not through
 * `listDrivers({ q })`. That is not a detour:
 *
 *   - `search()` is the only read that runs `lib/search/fuzzy` — bounded
 *     Damerau–Levenshtein, prefix and word-boundary boosts, Arabic folding — so
 *     it is the only one where `csptain` and `نورة` find anything. `runQuery`'s
 *     `q` is still `String.includes()` (`mock/query.ts:50`), which is the exact
 *     defect P3-T1 exists to fix and which has not reached the index clients
 *     yet.
 *   - It returns **one comparable score across kinds** (P3-T4), which is what
 *     lets the root list interleave a command, a destination and a record.
 *   - `shouldFilter={false}` stays on `cmdk`: re-ranking here would mean the
 *     palette's order changed the day `DATA_SOURCE` flips to `http`.
 *
 * `search()` returns hits, not records, and `unavailable` needs the record —
 * §11.2 cannot disable `Suspend` on an already-suspended captain from an id.
 * So the ids are resolved back through the resource's own client in **one**
 * read (`id in […]`), and re-ordered into the server's ranking. One extra
 * round trip, not one per row.
 */

import {
  listApplicants,
  listComplaints,
  listDrivers,
  listOperators,
  listPlans,
  listRequests,
  listSubscriptions,
  listTickets,
  listTrips,
  listWallets,
  search,
} from '@/data/clients'
import type {
  Applicant,
  Complaint,
  Driver,
  ProfileEntityType,
  RideRequest,
  Subscription,
  SubscriptionPlan,
  TeamUser,
  Ticket,
  Trip,
  WalletSummary,
} from '@/data/types'
import { APPLICANT_COMMANDS } from './applicants'
import { CAPTAIN_COMMANDS } from './captains'
import { CASH_COMMANDS } from './cash'
import { COMPLAINT_COMMANDS } from './complaints'
import { DISPUTE_COMMANDS } from './disputes'
import { FAIRNESS_COMMANDS } from './fairness'
import { PLAN_COMMANDS } from './pricing'
import type { Command, CommandRegistry } from './registry'
import { REQUEST_COMMANDS } from './requests'
import { SAFETY_COMMANDS } from './safety'
import { SESSION_COMMANDS } from './sessionCommands'
import { SUBSCRIPTION_COMMANDS } from './subscriptions'
import { TEAM_COMMANDS } from './team'
import { TICKET_COMMANDS } from './tickets'
import { TRIP_COMMANDS } from './trips'
import { WALLET_COMMANDS } from './wallets'

/** §CQ-1 caps the list at 8 rows; a candidate list longer than that is scrolled past, not read. */
export const TARGET_LIMIT = 8

/** How one candidate renders, and how the chip reads once it is picked. */
export interface TargetDescription {
  id: string
  /** Line one. A person's name, a record's id — whatever the operator recognises. */
  title: string
  /** Line two, or `null` for a one-line row. Never a breadcrumb (§2.6). */
  subtitle: string | null
}

/**
 * Everything the palette needs to run a domain's commands against records it
 * does not hold.
 *
 * Generic on the record so the source and its registry cannot drift: a
 * `TargetSource<Driver>` may only carry `CommandRegistry<Driver>`.
 */
export interface TargetSource<T = unknown> {
  entityType: ProfileEntityType
  commands: CommandRegistry<T>
  /**
   * Candidates for the target step. An empty query returns the first page of
   * the resource — the step must never open on a blank list, because a blank
   * list reads as "there are none" (R8's two empties are different things).
   */
  list(query: string, signal?: AbortSignal): Promise<readonly T[]>
  /** Pre-seeded ids — a selection, or the entity behind an open 360° layer — as records. */
  byIds(ids: readonly string[], signal?: AbortSignal): Promise<readonly T[]>
  describe(record: T): TargetDescription
  /** `{count} captains` — the chip over a set (**AC-75**: one key, one placeholder). */
  pluralKey: string
  /** `captains` — the noun inside `No captains match "…"`. */
  nounKey: string
}

/* ──────────────────────── the shape every source shares ──────────────────── */

/**
 * **The server's ranking for one entity type, as ids.**
 *
 * Generalised from `rankedDriverIds` when the second source arrived: five
 * copies of this loop is five chances for one of them to forget the
 * de-duplication or the limit, and none of what it does is a per-domain
 * decision. `search()` is still the only read that runs `lib/search/fuzzy`
 * (bounded Damerau–Levenshtein, prefix and word-boundary boosts, Arabic
 * folding), which is why the candidate list goes through it rather than
 * through the resource's own `q`.
 */
async function rankedIds(
  entityType: ProfileEntityType,
  query: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const response = await search(query, { limit: TARGET_LIMIT * 3 }, signal)
  const ids: string[] = []
  for (const result of response.results) {
    if (!('entityId' in result.target)) continue
    if (result.target.entityType !== entityType) continue
    if (ids.includes(result.target.entityId)) continue
    ids.push(result.target.entityId)
    if (ids.length === TARGET_LIMIT) break
  }
  return ids
}

/**
 * `list` for a source whose `byIds` is already written: an empty query returns
 * the resource's first page **in the same order its screen shows it**, and a
 * typed query is ranked by `search()` and then resolved back through the
 * resource's own client in ONE read.
 *
 * The empty case is not cosmetic. The step must never open on a blank list,
 * because a blank list reads as *"there are none"* — R8's two empties are
 * different things and this one is neither.
 */
async function listFor<T>(
  source: Pick<TargetSource<T>, 'entityType' | 'byIds'>,
  page: (signal?: AbortSignal) => Promise<readonly T[]>,
  query: string,
  signal?: AbortSignal,
  /**
   * Where the id lives on the record. Defaults to `id`, which every resource
   * but one has — `WalletSummary` is keyed by `riderId` and carries no `id`
   * field at all, and a source that could not say so would have needed its own
   * copy of this whole function.
   */
  idOf: (row: T) => string = (row) => (row as { id: string }).id,
): Promise<readonly T[]> {
  const needle = query.trim()
  if (needle === '') return page(signal)
  const ids = await rankedIds(source.entityType, needle, signal)
  if (ids.length === 0) return []
  const rows = await source.byIds(ids, signal)
  /* The server ranked these; restore that order after the id read, which
     returns them in the resource's own order. */
  return [...rows].sort((a, b) => ids.indexOf(idOf(a)) - ids.indexOf(idOf(b)))
}

/* ────────────────────────────── captains ────────────────────────────── */

const driverSource: TargetSource<Driver> = {
  entityType: 'driver',
  commands: CAPTAIN_COMMANDS,
  pluralKey: 'command.entity.driver.other',
  nounKey: 'command.entity.driver.plural',

  list: (query, signal) =>
    listFor(
      driverSource,
      /* Alphabetical, so the step at rest is a stable roster rather than
         whatever order the fixture happens to hold. */
      async (s) =>
        (await listDrivers({ pageSize: TARGET_LIMIT, sort: { field: 'name', dir: 'asc' } }, s))
          .items,
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listDrivers(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  describe: (driver) => ({
    id: driver.id,
    title: driver.name,
    /* The id, because that is what an operator reading a work order has in
       front of them, and it is what disambiguates two people called Al-Harbi
       (§4.3.4's own example). */
    subtitle: driver.id,
  }),
}

/* ─────────────────────────────── trips ─────────────────────────────── */

/**
 * **The ordering at rest is the screen's, not a fresh opinion.**
 *
 * `TripsScreen` opens on `startedAt` descending, so the palette's candidate
 * list opens on the same rows in the same order. An operator who reaches the
 * same records two ways should not have to re-find their place because the
 * second way sorted them differently — and the screen's order is a design
 * decision recorded there, which re-deriving here would quietly fork.
 */
const tripSource: TargetSource<Trip> = {
  entityType: 'trip',
  commands: TRIP_COMMANDS,
  pluralKey: 'command.entity.trip.other',
  nounKey: 'command.entity.trip.plural',

  list: (query, signal) =>
    listFor(
      tripSource,
      async (s) =>
        (await listTrips({ pageSize: TARGET_LIMIT, sort: { field: 'startedAt', dir: 'desc' } }, s))
          .items,
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listTrips(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  /* A trip's identity IS its id — there is no name — so line one carries it
     and line two carries the route, which is what an operator recognises a
     trip by when two ids look alike. */
  describe: (trip) => ({ id: trip.id, title: trip.id, subtitle: trip.route }),
}

/* ─────────────────────── captain applications ─────────────────────── */

const applicantSource: TargetSource<Applicant> = {
  entityType: 'applicant',
  commands: APPLICANT_COMMANDS,
  pluralKey: 'command.entity.applicant.other',
  nounKey: 'command.entity.applicant.plural',

  list: (query, signal) =>
    listFor(
      applicantSource,
      /* §8.4's queue order — soonest deadline first, which is
         `ApplicationsView`'s own `initialSort` and a RULE there rather than an
         operator preference (AC-114). The palette does not get to reorder a
         queue whose order is a rule. */
      async (s) =>
        (await listApplicants({ pageSize: TARGET_LIMIT, sort: { field: 'slaDueAt', dir: 'asc' } }, s))
          .items,
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listApplicants(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  describe: (applicant) => ({
    id: applicant.id,
    title: applicant.name,
    subtitle: applicant.id,
  }),
}

/* ────────────────────────────── tickets ────────────────────────────── */

const ticketSource: TargetSource<Ticket> = {
  entityType: 'ticket',
  commands: TICKET_COMMANDS,
  pluralKey: 'command.entity.ticket.other',
  nounKey: 'command.entity.ticket.plural',

  list: (query, signal) =>
    listFor(
      ticketSource,
      async (s) =>
        (await listTickets({ pageSize: TARGET_LIMIT, sort: { field: 'createdAt', dir: 'desc' } }, s))
          .items,
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listTickets(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  /* The subject on line one and the id on line two: an agent looking for a
     ticket knows what it was about far more often than they know `TKT-505`,
     and the id is what disambiguates two tickets with the same subject. */
  describe: (ticket) => ({ id: ticket.id, title: ticket.subject, subtitle: ticket.id }),
}

/* ─────────────────────────── subscriptions ─────────────────────────── */

const subscriptionSource: TargetSource<Subscription> = {
  entityType: 'subscription',
  commands: SUBSCRIPTION_COMMANDS,
  pluralKey: 'command.entity.subscription.other',
  nounKey: 'command.entity.subscription.plural',

  list: (query, signal) =>
    listFor(
      subscriptionSource,
      /* `endsOn` ascending — the screen's own order, and the one that puts the
         subscriptions somebody is about to be asked about at the top. */
      async (s) =>
        (
          await listSubscriptions(
            { pageSize: TARGET_LIMIT, sort: { field: 'endsOn', dir: 'asc' } },
            s,
          )
        ).items,
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listSubscriptions(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  /* The rider's name is what an operator taking the call has; the id is what
     the record is filed under. */
  describe: (sub) => ({ id: sub.id, title: sub.riderName, subtitle: sub.id }),
}

/* ────────────────────────────── ride requests ────────────────────────────── */

/**
 * **The queue's own order, which is a RULE and not a preference.** `urgency`
 * descending is legacy `reqUrgencyScore` (`:10057`) — breached first, then
 * longest waiting — because *"a broken promise is not a queue position"*
 * (`:19076`). The palette does not get to reorder that.
 *
 * `search()` indexes a request by its id, its rider **and both place names**
 * (`clients/profile.ts:490`), so `KAFD` finds the ride as readily as `REQ-508`.
 */
const requestSource: TargetSource<RideRequest> = {
  entityType: 'request',
  commands: REQUEST_COMMANDS,
  pluralKey: 'command.entity.request.other',
  nounKey: 'command.entity.request.plural',

  list: (query, signal) =>
    listFor(
      requestSource,
      async (s) =>
        (
          await listRequests(
            { pageSize: TARGET_LIMIT, sort: { field: 'urgency', dir: 'desc' } },
            s,
          )
        ).items,
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listRequests(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  /* The id on line one because that is what the row, the work order and the
     rider's message all carry; the rider on line two because that is who the
     operator is about to phone. The route is deliberately not here — an arrow
     between two place names cannot mirror outside a dictionary (§9.5). */
  describe: (request) => ({ id: request.id, title: request.id, subtitle: request.riderName }),
}

/* ─────────────────────────── rider wallets ─────────────────────────── */

/**
 * **Keyed by the rider, because a wallet is not a record of its own.**
 * `WalletSummary` has no `id`; it has a `riderId`, and `search()` indexes
 * riders. So the entity type is `rider` and every id in this source is an
 * `RDR-*` — which is also what makes the 360° layer openable from a wallet row
 * without inventing a second identity for the same person.
 *
 * There is exactly one source per entity type (`targetSourceFor` finds the
 * first), so `rider` belongs to wallets and to nothing else today. **Reported:**
 * the day a rider registry exists, `TargetSource` needs a way to carry two
 * command sets for one type, or the two registries have to merge.
 */
const walletSource: TargetSource<WalletSummary> = {
  entityType: 'rider',
  commands: WALLET_COMMANDS,
  pluralKey: 'command.entity.wallet.other',
  nounKey: 'command.entity.wallet.plural',

  list: (query, signal) =>
    listFor(
      walletSource,
      /* Alphabetical by rider — `WalletsScreen`'s own opening order, so an
         operator who reaches the same wallets two ways does not have to
         re-find their place. */
      async (s) =>
        (await listWallets({ pageSize: TARGET_LIMIT, sort: { field: 'riderName', dir: 'asc' } }, s))
          .items,
      query,
      signal,
      (wallet) => wallet.riderId,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listWallets(
      { filters: [{ field: 'riderId', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  /* The person on line one and their id on line two — the same arrangement the
     captain source uses, and for the same reason: two riders share a family
     name and the id is what tells them apart (§4.3.4). */
  describe: (wallet) => ({ id: wallet.riderId, title: wallet.riderName, subtitle: wallet.riderId }),
}

/* ──────────────────────────────── complaints ─────────────────────────────── */

const complaintSource: TargetSource<Complaint> = {
  entityType: 'complaint',
  commands: COMPLAINT_COMMANDS,
  pluralKey: 'command.entity.complaint.other',
  nounKey: 'command.entity.complaint.plural',

  list: (query, signal) =>
    listFor(
      complaintSource,
      /* §8.4's queue order — soonest deadline first, which is the screen's own
         and a rule there rather than an operator preference. */
      async (s) =>
        (await listComplaints({ pageSize: TARGET_LIMIT, sort: { field: 'slaDueAt', dir: 'asc' } }, s))
          .items,
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listComplaints(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  /* The grievance on line one — it is what the operator remembers — and the id
     on line two, which is what two complaints about the same thing differ by.
     `subject` is the rider's own words and is not translated. */
  describe: (complaint) => ({
    id: complaint.id,
    title: complaint.subject,
    subtitle: complaint.id,
  }),
}

/* ──────────────────────────────── colleagues ─────────────────────────────── */

const operatorSource: TargetSource<TeamUser> = {
  entityType: 'operator',
  commands: TEAM_COMMANDS,
  pluralKey: 'command.entity.operator.other',
  nounKey: 'command.entity.operator.plural',

  list: (query, signal) =>
    listFor(
      operatorSource,
      async (s) =>
        (await listOperators({ pageSize: TARGET_LIMIT, sort: { field: 'name', dir: 'asc' } }, s))
          .items,
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listOperators(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  /* The email on line two rather than the id: `searchEntities` indexes a
     colleague by both (`clients/profile.ts:469`), and an administrator asked to
     revoke somebody was given an address, not a `USR-4`. */
  describe: (user) => ({ id: user.id, title: user.name, subtitle: user.email }),
}

/* ────────────────────────── subscription plans ────────────────────────── */

const planSource: TargetSource<SubscriptionPlan> = {
  entityType: 'plan',
  commands: PLAN_COMMANDS,
  pluralKey: 'command.entity.plan.other',
  nounKey: 'command.entity.plan.plural',

  /* `listPlans` takes no query and returns the whole catalogue — there are
     four — so the page is sliced here rather than asked for. */
  list: (query, signal) =>
    listFor(
      planSource,
      async (s) => (await listPlans(s)).slice(0, TARGET_LIMIT),
      query,
      signal,
    ),

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const plans = await listPlans(signal)
    return plans.filter((plan) => ids.includes(plan.id))
  },

  /* The English name on line one and the Arabic one on line two, because both
     are the plan's real name and an operator may have been told either — which
     is exactly why `searchEntities` weights `nameAr` as a name and not as a
     detail (`clients/profile.ts:478`). */
  describe: (plan) => ({ id: plan.id, title: plan.nameEn, subtitle: plan.nameAr }),
}

/* ─────────────────────────────── the table ─────────────────────────────── */

/**
 * One entry per entity type that has commands.
 *
 * **Phase C-5 takes this from one to five.** Every entry is an entity type the
 * profile resolver already answers for (`clients/profile.ts`), which is not a
 * coincidence: a target source needs `search()` to rank ids of that type, and
 * `search()` indexes exactly what `resolveProfile` resolves. That is also why
 * the domains this pass could NOT add are the ones with no `ProfileEntityType`
 * at all — payouts, escrow holds, deductions, disputes, safety incidents and
 * conversations are records the resolver has never heard of, so a command over
 * one has nowhere to find its target. Reported.
 */
export const TARGET_SOURCES: readonly TargetSource[] = [
  driverSource,
  tripSource,
  applicantSource,
  ticketSource,
  subscriptionSource,
  requestSource,
  walletSource,
  complaintSource,
  operatorSource,
  planSource,
]

export function targetSourceFor(entityType: ProfileEntityType | null): TargetSource | null {
  if (entityType === null) return null
  return TARGET_SOURCES.find((source) => source.entityType === entityType) ?? null
}

/* ──────────────────── every registry, findable or not ──────────────────── */

/**
 * **A registry plus where its targets come from, or `null` when there is
 * nowhere.** The seam F6 needed and `TARGET_SOURCES` could not be.
 *
 * `TARGET_SOURCES` answers *"how do I find a record of this type"*. It was
 * doing a second job it was never shaped for — being the list the palette walks
 * to discover **commands** (`usePalette.ts:786`, `:849`) — and that conflation
 * is invisible until a command has no findable target. Two kinds now do:
 *
 *   - **`scope: 'global'`** — `sessionCommands.ts`. There is no record to find;
 *     `Switch to Arabic` acts on the session. Under the old walk these were
 *     unreachable, because a registry with no entity type had no row to sit in.
 *   - **`scope: 'route'`** — `safety.ts`, `cash.ts`, `disputes.ts`,
 *     `fairness.ts`. These act on records that have **no `ProfileEntityType`**
 *     at all (`types/profile.ts`), so `search()` cannot rank one and
 *     `resolveProfile` cannot open one. Every command in them carries
 *     `hiddenFromPalette` saying exactly that (**CM-4**), so they are declared
 *     once for the row menu and the bulk bar — which is C-1's whole value,
 *     *"worth doing whether or not the palette is ever built"* — and the
 *     palette does not offer what it could not complete.
 *
 * **For the palette's owner:** iterate this for commands and `TARGET_SOURCES`
 * for targets. The first five entries are identical to the old walk, so the
 * change is additive in behaviour as well as in type.
 *
 * **Reported to mock-data-engineer:** `incident`, `cash-report`, `dispute` and
 * `fairness-case` need entries in `PROFILE_ENTITY_TYPES`, in `resolveLocally`
 * and in `searchEntities` before any of those twelve commands can reach ⌘K.
 */
export interface CommandGroup {
  /** A name for the table and for the test's failure messages. Never rendered. */
  name: string
  commands: readonly Command<never>[]
  /** `null` where the records this acts on have no `ProfileEntityType`. */
  source: TargetSource | null
}

/**
 * `Command<T>`'s methods are declared with method syntax, so they are bivariant
 * and a `Command<Driver>` is assignable to `Command<never>`. The cast is what
 * lets one table hold eleven record types; `domains.test.ts` does the same.
 */
function group(name: string, commands: CommandRegistry<never>, source: TargetSource | null): CommandGroup {
  return { name, commands, source }
}

export const COMMAND_GROUPS: readonly CommandGroup[] = [
  group('captains', CAPTAIN_COMMANDS as CommandRegistry<never>, driverSource),
  group('trips', TRIP_COMMANDS as CommandRegistry<never>, tripSource),
  group('applications', APPLICANT_COMMANDS as CommandRegistry<never>, applicantSource),
  group('tickets', TICKET_COMMANDS as CommandRegistry<never>, ticketSource),
  group('subscriptions', SUBSCRIPTION_COMMANDS as CommandRegistry<never>, subscriptionSource),
  group('requests', REQUEST_COMMANDS as CommandRegistry<never>, requestSource),
  group('wallets', WALLET_COMMANDS as CommandRegistry<never>, walletSource),
  group('complaints', COMPLAINT_COMMANDS as CommandRegistry<never>, complaintSource),
  group('team', TEAM_COMMANDS as CommandRegistry<never>, operatorSource),
  group('plans', PLAN_COMMANDS as CommandRegistry<never>, planSource),
  group('safety', SAFETY_COMMANDS as CommandRegistry<never>, null),
  group('cash', CASH_COMMANDS as CommandRegistry<never>, null),
  group('disputes', DISPUTE_COMMANDS as CommandRegistry<never>, null),
  group('fairness', FAIRNESS_COMMANDS as CommandRegistry<never>, null),
  group('session', SESSION_COMMANDS, null),
]
