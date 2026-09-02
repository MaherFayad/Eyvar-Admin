/**
 * **One read of the entity's own record, for the whole profile.**
 *
 * `ProfileRef` is deliberately thin (`types/profile.ts`): an id, a title, a
 * subtitle and the list of sections. Four sections need the record *behind* it
 * — `identity`, `movement`, `devices`, and the full page's whole right rail —
 * and every one of them would otherwise issue its own request for the same row.
 *
 * So the record is fetched **once**, by the presentation, and handed to the
 * sections that need it as an `AsyncResult`. Two consequences, both wanted:
 *
 *   1. one request, not four, and no cache trickery to make that true;
 *   2. a failed record read fails **only** the cards derived from it. Trips,
 *      wallet, tickets and the rest fetch independently and keep working, which
 *      is the whole reason the sections are separate in the first place.
 *
 * The union is discriminated on `entityType`, so a renderer narrows with the
 * same string the section registry is keyed by and never casts.
 *
 * **All eleven kinds are backed.** `payment` and `complaint` were the two
 * exceptions — ids that existed only on other records, with a thin derived
 * index standing in for them — and `clients/payments.ts` and
 * `clients/complaints.ts` have since made both first-class. There is no
 * unbacked arm left, and the §11.2 "no record" copy that stood in for one is
 * gone with it.
 */

import { useAsync, type AsyncResult } from '@/hooks'
import {
  getApplicant,
  getComplaint,
  getCorporateAccount,
  getDriver,
  getPayment,
  getPlan,
  getRider,
  getSubscription,
  getTicket,
  getTrip,
  listNewRiders,
} from '@/data/clients'
import type {
  Applicant,
  Complaint,
  CorporateAccount,
  Driver,
  NewRider,
  Payment,
  PlanKey,
  ProfileRef,
  Rider,
  Subscription,
  SubscriptionPlan,
  Ticket,
  Trip,
} from '@/data/types'

/** The entity's own row, narrowed by the type `resolveProfile` returned. */
export type ProfileRecord =
  | { entityType: 'rider'; data: Rider }
  | { entityType: 'new-rider'; data: NewRider }
  | { entityType: 'driver'; data: Driver }
  | { entityType: 'applicant'; data: Applicant }
  | { entityType: 'trip'; data: Trip }
  | { entityType: 'subscription'; data: Subscription }
  | { entityType: 'corporate-account'; data: CorporateAccount }
  | { entityType: 'ticket'; data: Ticket }
  | { entityType: 'plan'; data: SubscriptionPlan }
  | { entityType: 'payment'; data: Payment }
  | { entityType: 'complaint'; data: Complaint }

export type ProfileRecordResult = AsyncResult<ProfileRecord>

/**
 * The data-layer operation each arm of `useProfileRecord` actually calls.
 *
 * `useAsync`'s cache key is `cacheKey` plus a serialisation of `deps`, and this
 * fetcher is a switch over eleven clients — so the id has to be chosen the same
 * way the switch chooses the client, from `entity.entityType`. A single made-up
 * id would be worse than none: `invalidate('riders.')` would then miss this
 * read, and the P1-T3 comment in `requestCache.ts` is explicit that a key which
 * does not name the operation is a lie the cache cannot detect.
 *
 * `entityType` is also in `deps`, so two kinds can never collide even if an id
 * here were wrong — but each one is the id its client registers, checked
 * against `src/data/clients/*`'s `*_OPERATIONS` maps.
 */
const RECORD_OPERATIONS: Record<ProfileRecord['entityType'], string> = {
  rider: 'riders.get',
  /* `clients/riders.ts` ships no `getNewRider`; the record is read as a
     one-row query, so the id is the LIST operation and not a `get`. */
  'new-rider': 'riders.listNew',
  driver: 'drivers.get',
  applicant: 'applicants.get',
  trip: 'trips.get',
  subscription: 'subscriptions.get',
  'corporate-account': 'corporate.get',
  ticket: 'tickets.get',
  plan: 'pricing.plan',
  payment: 'payments.get',
  complaint: 'complaints.get',
}

/**
 * The four person-shaped types share five fields, and `movement` and `devices`
 * are built from exactly those five. Pulling them out here is what stops those
 * two renderers growing a four-arm switch each.
 *
 * `types/rider.ts` and `types/driver.ts` both declare `movementLog:
 * MovementLogEntry[]`; `Applicant` and `NewRider` do too.
 */
export interface PersonFacets {
  movementLog: { at: string; action: string; location: string }[]
  device: string
  appLanguage: string
  lastIp: string
  ipLocation: string
}

export function personFacets(record: ProfileRecord): PersonFacets | null {
  switch (record.entityType) {
    case 'rider':
    case 'new-rider':
    case 'driver':
    case 'applicant': {
      const { movementLog, device, appLanguage, lastIp, ipLocation } = record.data
      return { movementLog, device, appLanguage, lastIp, ipLocation }
    }
    default:
      return null
  }
}

/**
 * Fetch the record behind a `ProfileRef`.
 *
 * Every arm is an existing client operation. **`new-rider` is the one that has
 * to go the long way round**: `clients/riders.ts` ships `listNewRiders` and no
 * `getNewRider`, so the single row is read as a one-record query on the id.
 * That is a filter the shape already declares (`newRiderShape.filterable.id`),
 * not a client-side scan of a list — but it is still a list endpoint answering
 * a record question, and the missing operation is named in the handoff.
 */
export function useProfileRecord(entity: ProfileRef): ProfileRecordResult {
  return useAsync<ProfileRecord>(
    async (signal): Promise<ProfileRecord> => {
      const id = entity.entityId
      switch (entity.entityType) {
        case 'rider':
          return { entityType: 'rider', data: await getRider(id, signal) }
        case 'driver':
          return { entityType: 'driver', data: await getDriver(id, signal) }
        case 'applicant':
          return { entityType: 'applicant', data: await getApplicant(id, signal) }
        case 'trip':
          return { entityType: 'trip', data: await getTrip(id, signal) }
        case 'subscription':
          return { entityType: 'subscription', data: await getSubscription(id, signal) }
        case 'corporate-account':
          return { entityType: 'corporate-account', data: await getCorporateAccount(id, signal) }
        case 'ticket':
          return { entityType: 'ticket', data: await getTicket(id, signal) }
        case 'payment':
          return { entityType: 'payment', data: await getPayment(id, signal) }
        case 'complaint':
          return { entityType: 'complaint', data: await getComplaint(id, signal) }
        case 'plan':
          return { entityType: 'plan', data: await getPlan(id as PlanKey, signal) }
        case 'new-rider': {
          const page = await listNewRiders(
            { filters: [{ field: 'id', op: 'eq', value: id }], pageSize: 1 },
            signal,
          )
          const row = page.items[0]
          /* A ref that resolved and a row that did not arrive is a 404 on the
             record, not an empty list — `resolveProfile` already found this id
             in `newRiderFixtures`, so a miss here means the two disagree. The
             card renders its error state; the message is never shown, because
             §11.2's copy comes from the dictionary and not from a thrown
             string. */
          if (row === undefined) throw new Error(`No new-rider record for ${id}`)
          return { entityType: 'new-rider', data: row }
        }
      }
    },
    {
      deps: [entity.entityId, entity.entityType],
      /* Both of the fetcher's inputs are in `deps` above — the id it asks for
         and the type that picks the client — so the key is complete and the
         operation id follows the same switch. Opening the drawer on a record,
         closing it and opening it again paints the header immediately. */
      cacheKey: RECORD_OPERATIONS[entity.entityType],
      /* The record read has no empty state: it returns a row or it throws. The
         default `isEmpty` treats `null` as empty, and nothing here returns one
         — saying so keeps `status` to the three values this read can produce. */
      isEmpty: () => false,
    },
  )
}
