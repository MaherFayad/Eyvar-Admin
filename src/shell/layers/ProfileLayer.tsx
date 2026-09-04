/**
 * The 360° profile layer — `?entity=<id>`. Design spec §6.2, spec §4.3.1.
 *
 * **The highest-value single component in the rebuild.** `openProfile` already
 * has **100 call sites** — the second-most-used handler in the legacy file
 * after `closeModal` — reached from global search, any id or name link in any
 * table, any KPI drill-down, any notification and any work-inbox row.
 *
 * Rules applied
 *   §6.2        header: entity name (13px/600) + identity code and one-line
 *               context as the subtitle.
 *   §6.2        body: **a stack of collapsible cards contributed by workspaces
 *               as a declared contract** — Financials contributes wallet and
 *               payment cards, Support contributes tickets / disputes /
 *               fairness, Operations contributes trips / subscriptions /
 *               compliance / commitment. **Not one 600-line builder**:
 *               `ProfileRef.sections` is the contract as data, and the twelve
 *               renderers live in `components/profile`, one per key. This file
 *               renders the stack; it does not know what a wallet card is.
 *   §6.2        **the same stack on both surfaces.** `EntityPageScreen` renders
 *               the identical `<ProfileSections>` from the identical registry.
 *               Nothing is passed in, so nothing can be passed differently.
 *   §6.2        **EVERY entity type gets card toggles**, not just riders and
 *               drivers. Legacy `initCardToggles()` runs for two of eleven
 *               (`09b` §17.4) and the other nine get an uncollapsible wall.
 *   §6.2        eleven entity types, not six. The five legacy `resolveId()`
 *               misses — `new-rider`, `applicant`, `ticket`,
 *               `corporate-account`, `plan` — resolve here.
 *   §6.2        footer: `Open full profile` as a plain LINK at inline-start and
 *               **no primary** — the layer commits nothing.
 *   §9.2 #13    loading is a skeleton shaped like the card stack. Never a spinner.
 *   §9.2 #14    error is CARD-scoped inside the layer; the layer stays dismissible.
 *   §9.2 #15/AC-42
 *               not-found is a `no-match` empty — ONE grey sentence, no
 *               illustration, no heading — **naming the id that was searched**,
 *               with the layer still dismissible.
 *   AC-60       gated on `view_profiles`. This is where that permission, which
 *               is enforced at ZERO call sites today, finally becomes real.
 */

import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks'
import { resolveProfile } from '@/data/clients'
import { isApiError, type ProfileRef } from '@/data/types'
import type { Language, Translator } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { identityBandSlots, ProfileSections, useProfileRecord } from '@/components/profile'
import {
  RiderBand,
  RiderFooter,
  RiderProfile,
  RiderSkeleton,
  useRiderReads,
} from '@/components/profile/rider'
import {
  RequestBand,
  RequestFooter,
  RequestProfile,
  RequestSkeleton,
} from '@/components/profile/request'
import {
  DriverBand,
  DriverFooter,
  DriverProfile,
  DriverSkeleton,
  driverComplianceHref,
  driverPayoutsHref,
  useDriverReads,
} from '@/components/profile/driver'
/* The ride's own arrangement — the third kind to bring one, and built as a copy
   of the captain's arm rather than as a third design. */
import {
  TripBand,
  TripFooter,
  TripProfile,
  TripSkeleton,
  useTripReads,
} from '@/components/profile/trip'
/* The one clock a countdown is measured against. `EYVAR_NOW` under the mock —
   every fixture is written against it, so the host clock would render every
   compliance document as long expired. Never a module-scope `Date.now()`. */
import { useNowIso } from '@/screens/operations/people/useNowIso'
import { ShellLayer } from '../ShellLayer'

export interface ProfileLayerProps {
  entityId: string
  open: boolean
  onClose: () => void
  onOpenFullProfile: (path: string) => void
  /**
   * **`Translator`, not `Translate` — the plural form is not optional here.**
   *
   * This was `Translate`, the bare call signature, which is a strict subset of
   * what the shell actually hands down. It went unnoticed while every consumer
   * only ever interpolated; the captain arm counts documents and trips, and a
   * count that governs a noun is a plural FAMILY (AC-670/671) — Arabic has six
   * cardinal categories, so `{count} trips` is wrong in both languages.
   *
   * Widening the prop does not change a single caller: `createTranslator`
   * already returns a `Translator` and `AppLayout` already passes one.
   */
  t: Translator
  /** The card stack's dates and numbers. See `ProfileSections`. */
  language: Language
  /**
   * **A captain's two navigations, gated — passed in, not read from a context.**
   *
   * The driver arm offers two ways out: the compliance file and the payouts
   * ledger. §11.2 makes each a control that is disabled in place with its
   * reason when the operator may not follow it, so the arm has to know.
   *
   * They are props rather than a `useShell()` call for the same reason
   * `language` is: this layer takes what it needs from the shell above it and
   * stays renderable on its own, which is what lets its tests mount it without
   * a provider. `AppLayout` passes the real values.
   *
   * **They default to `false`, and the default is the safe one.** A missing
   * permission renders the control disabled with a stated reason, never
   * enabled — so a caller that forgets them under-promises rather than offering
   * a route the operator will be refused at.
   */
  canOpenCompliance?: boolean
  canOpenPayouts?: boolean
  /**
   * **Where another record's overlay lives — supplied, never derived.**
   *
   * The request sheet links to the rider waiting on the ride, which needs the
   * `?entity=` address of a DIFFERENT record on the CURRENT route. This layer
   * knows the second half and not the first.
   *
   * It is a prop for the same reason `onOpenFullProfile` is one, and the reason
   * is not style: a `useLocation()` call here would make the router a
   * requirement of rendering this component at all, and this layer's three
   * suites mount it directly with no route around it — the rider suite's 31
   * tests failed on exactly that the first time this was written the other way.
   * `AppLayout` owns the route and passes the builder; a caller that omits it
   * gets a name in ink instead of a link, which is the correct degradation
   * rather than a crash.
   */
  entityHref?: (entityId: string) => string
}

/**
 * **`sectionRenderers` is gone, and its removal is the fix.**
 *
 * It was an optional prop defaulting to `{}` that `AppLayout` never passed, so
 * every section fell to the `??` branch and rendered `state.cardError.message`.
 * A healthy rider's profile showed eight cards each claiming to have failed, and
 * an operator could not tell that from an outage.
 *
 * Re-adding it as a **required** prop would have moved the same drift one level
 * up: the drawer would take a registry from `AppLayout` while
 * `EntityPageScreen`, which has no `AppLayout` above it, would still need its
 * own. So there is no prop. Both presentations render `<ProfileSections>`, which
 * is the single consumer of the single registry (`components/profile`).
 *
 * §6.2's *"contributed by workspaces as a declared contract"* is unharmed: the
 * contract is `ProfileRef.sections` — **data**, from `clients/profile.ts` — and
 * a workspace adds a section by adding a renderer to the registry, not by
 * editing this file. That was always the part that mattered.
 */
export function ProfileLayer({
  entityId,
  open,
  onClose,
  onOpenFullProfile,
  t,
  language,
  canOpenCompliance = false,
  canOpenPayouts = false,
  entityHref,
}: ProfileLayerProps) {
  const profile = useAsync<ProfileRef>((signal) => resolveProfile(entityId, signal), {
    deps: [entityId],
    /* `entityId` is the fetcher's only input, so the key is complete. Closing
       the drawer and re-opening the same record paints the header immediately
       instead of re-running the resolve. */
    cacheKey: 'profile.resolve',
    enabled: open,
  })

  /* AC-42 — a 404 is NOT an error state. It is the `overlay-not-found` empty,
     and it must name the id that was searched. `ApiError.kind` is the machine
     -readable discriminator; the message string is never branched on. */
  const notFound = profile.status === 'error' && isApiError(profile.error) && profile.error.kind === 'not-found'

  const ref = profile.data
  /* **One read, feeding both the header and the body.** The standing badge is
     in the layer's header and the card stack is in its body, and both are the
     same record — so the read is owned here, above both, rather than in a child
     that the header could not reach. `useProfileRecord` stays disabled until
     `ref` resolves, which is the same "start when there is something to read"
     the child indirection used to buy. */
  const record = useProfileRecord(ref ?? null)

  /**
   * **ONE SHARED CONTENT CONTRACT, TWO PRESENTATIONS.**
   *
   * This file's header says *"the same stack on both surfaces… nothing is
   * passed in, so nothing can be passed differently"*, and a rider now gets a
   * different arrangement from the other ten kinds. That rule is amended here,
   * and it is worth writing down exactly how far the amendment goes.
   *
   * What it protected — that the two surfaces cannot disagree about a FACT — is
   * untouched, and is enforced by where the facts come from rather than by
   * everyone rendering the same component:
   *
   *   · the record is `useProfileRecord`, the same one read the same way;
   *   · the collections are the same five client operations `sections.tsx`
   *     calls for a rider, under the same cache keys;
   *   · every derived value that both surfaces need is a SERVER field —
   *     `churnRisk` and `churnReason`, `closingBalanceHalalas` and
   *     `pendingHalalas`, `totalTrips`, `lifetimeValueHalalas`. Nothing below
   *     computes one, so there is nothing for the page to compute differently.
   *
   * What is presentation-local is ARRANGEMENT: which column a fact sits in,
   * which tab it is under, and what the tab's badge counts. Two surfaces may
   * arrange one set of facts differently. They may not hold two sets.
   *
   * The other ten kinds are unchanged and still render `<ProfileSections>` from
   * the single registry.
   */
  const rider = record.data?.entityType === 'rider' ? record.data.data : null
  const isRider = ref?.entityType === 'rider'
  /* Called for all eleven kinds, because a hook cannot be called
     conditionally, and ENABLED for one. `useAsync` holds a disabled read in
     `loading` and fires nothing, so the other ten cost no request. */
  const riderReads = useRiderReads(entityId, isRider)

  /* The captain's arm, the exact mirror of the rider's above — and the reason
     `components/profile/driver/index.ts` fixes its export shape is so that this
     stays a copy rather than a second design. Same conditional-enable rule: the
     hook runs for all eleven kinds because a hook cannot be called
     conditionally, and fires for one. */
  const driver = record.data?.entityType === 'driver' ? record.data.data : null
  const isDriver = ref?.entityType === 'driver'
  const driverReads = useDriverReads(entityId, isDriver)

  /* The ride's arm. Same conditional-enable rule as the two above, with one
     difference the shape forces: a trip's other reads are keyed on ids that are
     ON the trip, so the hook takes the RECORD rather than the id and fires
     nothing until it lands. */
  const trip = record.data?.entityType === 'trip' ? record.data.data : null
  const isTrip = ref?.entityType === 'trip'
  const tripReads = useTripReads(isTrip ? trip : null, isTrip)

  const nowIso = useNowIso()

  /**
   * **The third own arrangement, and the only one with no reads of its own.**
   *
   * A rider's sheet fires four collection reads and a captain's five, because
   * those records summarise things that happened elsewhere. A request does not:
   * every fact on it — the route, the money, the rider's name and rating, the
   * captain's name, the whole timeline — is a field on the one record already
   * fetched above. So there is no `useRequestReads` to call, and the sheet
   * costs exactly one request.
   */
  const request = record.data?.entityType === 'request' ? record.data.data : null
  const isRequest = ref?.entityType === 'request'
  /* Two kinds now bring their own arrangement; the other nine still render the
     card stack. Named once so the three slots below cannot drift apart — the
     original defect in this file was a header and a body disagreeing about
     which kinds were special. */
  const isOwnArrangement = isRider || isDriver || isTrip || isRequest

  /**
   * **Every `?entity=` link this layer hands out, through one function.**
   *
   * A trip names four other records and a request names its rider, and all five
   * are the same act: the CURRENT route with a different `?entity=`. One helper
   * so the two arms cannot build that address two ways.
   *
   * It delegates to the `entityHref` PROP rather than reading the router, and
   * the reason is not style. `useLocation()` here makes a `<Router>` a
   * requirement of rendering this component at all, and this file's suites
   * mount it directly with no route around them — the rider suite's 31 tests
   * failed on exactly that. `AppLayout` owns the route and supplies the
   * builder; a caller that omits it gets ink instead of a link, which is the
   * right degradation rather than a crash. Same contract the captain's arm
   * already has with `complianceHref` and `payoutsHref`.
   */
  const hrefFor = (id: string | null) => (id === null ? null : (entityHref?.(id) ?? null))

  /* **The rider, still one click away.** Making the queue row open the RIDE is
     the point of that record kind, and it would otherwise have removed the only
     path from the Requests queue to the person waiting on it. */
  const riderHref = hrefFor(request?.riderId ?? null)

  return (
    <ShellLayer
      open={open}
      onClose={onClose}
      /**
       * **A DRAWER. Two owner instructions, in order, and the second is
       * current.**
       *
       * | | instruction | what it bought | status |
       * |---|---|---|---|
       * | 1 | *"should be full screen no need to show me any of the navigation more like popup"* | a record that fills the screen. The reason given was that a 480px column beside a lit console made a full record read like a footnote to the table behind it — the layer stopped being a thing you consult beside your work and became the work | **REVERSED** |
       * | 2 | the 360° profile goes back to being a **side panel beside the console** | §6.1's inline-end panel, and with it every rule the modal presentation had to suspend | **CURRENT** |
       *
       * Instruction 1 is kept here rather than deleted because it names a real
       * cost that instruction 2 re-incurs: at the drawer's 480px the record no
       * longer gets a screen. That cost is paid where §6.1 always said it
       * would be — `Open full profile`, the footer link to `/entity/:id`,
       * which is the full-screen record instruction 1 asked for and is already
       * built (`screens/entity/RiderProfilePage.tsx`).
       *
       * **What returning restores**, all of it by construction rather than by
       * anything written here — `ShellLayer` derives every one from
       * `presentation`, and `sheet.tsx` derives them from `side`:
       *
       *   §6.1/§5.5  NO SCRIM. The workspace behind is legible AND interactive
       *              again (AC-20), and an outside pointer-down goes to the
       *              page instead of dismissing this.
       *   §7.3.3     NO FOCUS TRAP — *the scrim decides the trap*. Tab leaves
       *              the panel and continues into the page
       *              (`releaseTabAtEdges`). AC-67 stays amended: §7 outranks
       *              the AC, and the amendment was never about the modal.
       *   §5.5       *a modal nested inside a drawer is FORBIDDEN* is back in
       *              force. Nothing in this layer opens one today and nothing
       *              may: a confirmation expands in place (§4.7 / §6.4).
       *   §6.1       anchored inline-end, starting BELOW the top bar, so the
       *              top bar stays reachable while the layer is open.
       *   §9.5       the enter transform mirrors again (+X in LTR, −X in RTL).
       *              The modal faded, because a surface centred over the page
       *              arrives from nowhere; a panel at an edge does not.
       *   §6.2       **the layer commits nothing.** See `RiderFooter`, which
       *              already renders `Open full profile` and no primary, and
       *              `refusals.ts` for the one control in the BODY and why
       *              committing nothing is exactly what keeps it legal.
       */
      presentation="drawer"
      title={ref?.title ?? t('shellLayer.profile')}
      subtitle={ref?.subtitle ?? null}
      /* The face, the record kind and the standing, beside the title in the ONE
         header. It used to be a second header inside the body repeating the
         title and subtitle this component already passes above. */
      /* The ten other kinds keep the 48px chrome header and its two slots. A
         rider's head is a coloured GROUND carrying the same three facts at
         display size, so it replaces the bar rather than decorating it — and
         `banner` and `header` are mutually exclusive by construction, which is
         what keeps the surface from growing a second title. */
      header={
        ref && !isOwnArrangement ? identityBandSlots({ entity: ref, record, t }) : undefined
      }
      banner={
        ref && isRider ? (
          <RiderBand entity={ref} rider={rider} t={t} />
        ) : ref && isDriver ? (
          <DriverBand entity={ref} driver={driver} t={t} language={language} />
        ) : ref && isRequest ? (
          <RequestBand entity={ref} request={request} t={t} />
        ) : ref && isTrip ? (
          <TripBand entity={ref} trip={trip} t={t} language={language} />
        ) : undefined
      }
      t={t}
      footer={
        ref &&
        (isRider ? (
          <RiderFooter onOpenFullProfile={() => onOpenFullProfile(ref.fullPagePath)} t={t} />
        ) : isDriver ? (
          <DriverFooter onOpenFullProfile={() => onOpenFullProfile(ref.fullPagePath)} t={t} />
        ) : isRequest ? (
          <RequestFooter onOpenFullProfile={() => onOpenFullProfile(ref.fullPagePath)} t={t} />
        ) : isTrip ? (
          <TripFooter onOpenFullRecord={() => onOpenFullProfile(ref.fullPagePath)} t={t} />
        ) : (
          /* §6.2 — a plain LINK at inline-start, and NO primary: this layer
             commits nothing, so §6.1's footer rule gives it no committing
             control at all. */
          <div className="flex shrink-0 items-center border-t border-border px-3 py-2">
            <Button variant="link" onClick={() => onOpenFullProfile(ref.fullPagePath)}>
              {t('shell.layer.openFullProfile')}
            </Button>
          </div>
        ))
      }
    >
      {/* **The generic overlay skeleton, and it is the right one HERE.**
          `resolveProfile` has not answered, so the kind is unknown and no
          kind-shaped skeleton can honestly be drawn. The moment the ref says
          `rider`, the shape IS known and `RiderSkeleton` takes over below — two
          skeletons, one per thing that is actually being waited on, and a
          spinner in neither. */}
      {profile.status === 'loading' && <LoadingSkeleton pattern="overlay" />}

      {notFound && (
        <EmptyState kind="no-match" message={t('state.overlayNotFound.message', { id: entityId })} />
      )}

      {profile.status === 'error' && !notFound && (
        <ErrorState
          scope="card"
          message={t('state.overlayError.message')}
          action={{ label: t('state.overlayError.action'), onClick: profile.refetch }}
        />
      )}

      {/* A rider's own arrangement. The record read owns its four states here
          rather than inside the body, because the rail and both panels are
          built from it and there is nothing to arrange until it lands. */}
      {ref && isRider && (
        <>
          {record.status === 'loading' && <RiderSkeleton />}
          {record.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('profile.state.error', { section: t('profile.kind.rider') })}
              action={{ label: t('profile.state.retry'), onClick: record.refetch }}
            />
          )}
          {rider && (
            <RiderProfile rider={rider} reads={riderReads} t={t} language={language} />
          )}
        </>
      )}

      {/* A captain's own arrangement — Standing first, then Documents, because a
          suspended captain earns nothing and a document expires with nobody
          acting. Same four states, owned by the record read for the same
          reason: there is nothing to arrange until it lands. */}
      {ref && isDriver && (
        <>
          {record.status === 'loading' && <DriverSkeleton />}
          {record.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('profile.state.error', { section: t('profile.kind.driver') })}
              action={{ label: t('profile.state.retry'), onClick: record.refetch }}
            />
          )}
          {driver && (
            <DriverProfile
              driver={driver}
              reads={driverReads}
              nowIso={nowIso}
              complianceHref={driverComplianceHref(driver.id)}
              payoutsHref={driverPayoutsHref(driver.id)}
              canOpenCompliance={canOpenCompliance}
              canOpenPayouts={canOpenPayouts}
              t={t}
              language={language}
            />
          )}
        </>
      )}

      {/* A ride's own arrangement — the map first, because a ride's summary is
          where it goes and no arrangement of labelled pairs answers that as
          fast as a picture. Same four states as the two above, owned by the
          record read for the same reason: there is nothing to arrange until it
          lands. */}
      {ref && isRequest && (
        <>
          {record.status === 'loading' && <RequestSkeleton />}
          {record.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('profile.state.error', { section: t('profile.kind.request') })}
              action={{ label: t('profile.state.retry'), onClick: record.refetch }}
            />
          )}
          {request && (
            <RequestProfile
              request={request}
              nowIso={nowIso}
              riderHref={riderHref}
              t={t}
              language={language}
            />
          )}
        </>
      )}

      {/* The ride's own arrangement — the map first, because a journey is a
          thing that happened somewhere and every other fact on the sheet is
          read against it. Same four states, owned by the record read for the
          same reason: there is nothing to arrange until it lands. */}
      {ref && isTrip && (
        <>
          {record.status === 'loading' && <TripSkeleton />}
          {record.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('profile.state.error', { section: t('profile.kind.trip') })}
              action={{ label: t('profile.state.retry'), onClick: record.refetch }}
            />
          )}
          {trip && (
            <TripProfile
              trip={trip}
              reads={tripReads}
              nowIso={nowIso}
              riderHref={hrefFor(trip.riderId)}
              captainHref={hrefFor(trip.driverId)}
              subscriptionHref={hrefFor(trip.subscriptionId)}
              paymentHref={hrefFor(trip.paymentId)}
              t={t}
              language={language}
            />
          )}
        </>
      )}

      {/* §6.2's card stack, for the other eight kinds. The layer has no rail, so
          it omits nothing — the identity card is its first card. */}
      {ref && !isOwnArrangement && (
        <ProfileSections entity={ref} record={record} t={t} language={language} />
      )}
    </ShellLayer>
  )
}
