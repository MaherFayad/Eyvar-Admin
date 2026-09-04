/**
 * The 360° profile's **full-page escape** — `/entity/:entityId`. Design spec
 * §6.2, spec §3.10 row 31, and `design/people-rider-profile.md` §7.
 *
 * §6.1 answers the obvious question — why not just make the drawer wider:
 *
 * > **Why 406px and not 648px.** §5.5 permits ~648px when a panel needs
 * > internal columns… but at 1280px a 648px drawer leaves 552px of content
 * > visible — narrower than a detail page's main column — which destroys the
 * > *only* reason a drawer beat a modal. 406px leaves 794px readable behind it.
 * > **Where genuine width is needed, the profile has a full-page escape.**
 *
 * So this is the same entity, in the **main + right rail** shape (§7.2), for
 * deep review. It belongs to no workspace — it is reachable from all five — so
 * neither nav column highlights anything, and `resolveRoute` returns a `detail`
 * shape with no `workspaceId`, which is correct rather than a gap.
 *
 * ## This screen is now a ROUTER between three presentations
 *
 * A rider gets `RiderProfilePage` — the band, the three-up strip, the
 * two-column body and the ledger the owner's design asks for.
 *
 * A **captain** gets `DriverProfilePage`, which is the same *pattern* and
 * deliberately not the same page: the strip leads with `Standing` rather than
 * money because a suspended captain earns nothing; `Documents` is the first
 * section because five documents expire on their own and take a captain off the
 * road with nobody acting; and the money band is a **payable** (`liability.driver`,
 * where a credit means Eyvar owes *more*) rather than a wallet. Those are
 * structural differences between two kinds of record, not two skins.
 *
 * **The other nine kinds keep the card stack**, which is not a stopgap:
 * `ProfileSections` and `profileRail()` are the same components the sheet
 * renders, from the same registry, and a trip or a plan has no purpose-built
 * design to move to yet. Splitting on `entityType` here rather than inside the
 * presentation is what keeps that true — no branch can be given a different
 * section list.
 *
 * ## The back affordance — owner amendment 1
 *
 * `onBack={() => navigate(-1)}` is **gone from every branch**. It dead-ends on
 * a pasted URL or a fresh tab, `window.history.length` counts entries from
 * other origins so it cannot be probed, and it is untestable under
 * `MemoryRouter`. `back.ts` resolves a real destination in every state —
 * `location.state.from`, else the record's own index from a map that is total
 * over `ProfileEntityType` — so the control is never hidden and never disabled,
 * including on the 404, where it is the one control that must still work.
 *
 * **Before the ref resolves there is no `entityType` to look a destination up
 * by**, so the pre-content states fall back to the operator's own landing
 * route. That is the honest answer for an id that may not resolve at all: it
 * cannot claim to return to a rider index for a record that is not a rider.
 *
 * **`TopBar` still renders its own `navigate(-1)` arrow on this route**, because
 * `resolveRoute` gives `/entity/:id` `showsBackArrow: true`. That is a second,
 * unlabelled back control with the dead-end behaviour this screen just removed.
 * `src/shell/TopBar.tsx` and `src/shell/routeState.ts` are the shell owner's;
 * reported rather than edited.
 */

import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { resolveProfile } from '@/data/clients'
import { isApiError, type ProfileRef } from '@/data/types'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import {
  ProfileSections,
  RAIL_SECTIONS,
  profileRail,
  useProfileRecord,
} from '@/components/profile'
import {
  COMPLIANCE_VIEW_PERMISSION,
  PAYOUTS_VIEW_PERMISSION,
  driverComplianceHref,
  driverPayoutsHref,
} from '@/components/profile/driver'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
/* The one clock this console measures countdowns against. `EYVAR_NOW` under the
   mock — every fixture is written against it, so the host clock would render
   every compliance document as long expired — and the shared `useTick` interval
   under `http`. Never a module-scope `Date.now()` (`types/driver.ts`). */
import { useNowIso } from '@/screens/operations/people/useNowIso'
import { INDEX_ROUTE, useReturnFrom } from './entity/back'
import { DriverProfilePage } from './entity/DriverProfilePage'
import { RiderProfilePage } from './entity/RiderProfilePage'
import { TripProfilePage } from './entity/TripProfilePage'

export function EntityPageScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { entityId = '' } = useParams<{ entityId: string }>()
  const { t, dir } = shell.language
  const from = useReturnFrom()

  const profile = useAsync<ProfileRef>((signal) => resolveProfile(entityId, signal), {
    /* `entityId` is the only thing the fetcher varies on, so the key is honest
       and Back out of a profile and into it again paints instead of skeletons. */
    deps: [entityId],
    cacheKey: 'profile.resolve',
  })

  const notFound =
    profile.status === 'error' && isApiError(profile.error) && profile.error.kind === 'not-found'

  /* **The destination, resolved once for every branch.** `state.from` wins; the
     record's index is next; and before the ref resolves there is no kind to
     look one up by, so it falls to where this operator works. Never `-1`. */
  const back = useMemo(() => {
    const index = profile.data === null ? null : INDEX_ROUTE[profile.data.entityType]
    const to = from ?? index?.path ?? shell.session?.landingRoute ?? '/'
    const name = index === null ? t('shell.topbar.back') : t(index.labelKey)
    /* **`Back to {name}` is one sentence living under two prefixes**, and that
       is a naming defect rather than a duplication of meaning:
       `entity.rider.backTo` was minted for the rider page and then used for all
       eleven kinds, so a captain's back button currently reads out of the
       rider's namespace. The captain arm takes its own key so it does not
       depend on another surface's, and the shared string should move to
       `profile.back.to` — **reported**, because collapsing it touches the rider
       page's dictionary and its tests. */
    const labelKey =
      profile.data?.entityType === 'driver' ? 'entity.driver.backTo' : 'entity.rider.backTo'
    return {
      to,
      /* Where there is no index to name — an unresolved id — the control keeps
         the shared word rather than inventing a destination it cannot promise. */
      label: index === null ? t('shell.topbar.back') : t(labelKey, { name }),
    }
  }, [from, profile.data, shell.session?.landingRoute, t])

  const header = (
    <PageHeader
      title={profile.data?.title ?? entityId}
      /* V4 — RECORD-DERIVED (`RDR-1041 · Rider since Mar 2024`), which is what
         §8's second row is for. It changes when the record changes. */
      meta={profile.data?.subtitle ?? null}
      /* §7.2 / §8 slot 1 — a destination, never a history step. */
      onBack={() => navigate(back.to)}
      t={t}
      dir={dir}
    />
  )

  if (profile.data === null) {
    /* The three pre-content states. They render with an EMPTY RAIL, and that is
       correct rather than a gap: the rail holds facts about a record, and there
       is no record — a rail of three skeletons beside a `no-match` sentence
       would be claiming there is something still arriving when the id does not
       resolve. §7.2's restack means an empty rail costs no layout. */
    return (
      <DetailPage
        header={header}
        main={
          profile.status === 'loading' ? (
            <LoadingSkeleton pattern="P2" />
          ) : notFound ? (
            /* AC-42's copy, on the page rather than in the layer. Same key. */
            <EmptyState kind="no-match" message={t('state.overlayNotFound.message', { id: entityId })} />
          ) : (
            <ErrorState
              scope="card"
              message={t('state.overlayError.message')}
              action={{ label: t('state.overlayError.action'), onClick: profile.refetch }}
            />
          )
        }
        rail={[]}
      />
    )
  }

  if (profile.data.entityType === 'rider') {
    return (
      <ResolvedRiderPage
        entity={profile.data}
        backTo={back.to}
        backLabel={back.label}
        canOpenDispatch={shell.permissions.permissions.includes('view_operations')}
      />
    )
  }

  if (profile.data.entityType === 'driver') {
    return (
      <ResolvedDriverPage entity={profile.data} backTo={back.to} backLabel={back.label} />
    )
  }

  if (profile.data.entityType === 'trip') {
    return <ResolvedTripPage entity={profile.data} backTo={back.to} backLabel={back.label} />
  }

  return <ResolvedEntityPage entity={profile.data} header={header} />
}

/**
 * The rider presentation. A child, so the record read starts when there is a
 * ref to read against — and so the rider page receives ONE `AsyncResult` rather
 * than fetching the record a second time beside the sheet's.
 */
function ResolvedRiderPage({
  entity,
  backTo,
  backLabel,
  canOpenDispatch,
}: {
  entity: ProfileRef
  backTo: string
  backLabel: string
  canOpenDispatch: boolean
}) {
  const shell = useShell()
  const { t, language, dir } = shell.language
  const record = useProfileRecord(entity)

  /* `useProfileRecord` returns the discriminated union every kind shares. The
     narrowing is here, at the one place that already knows this is a rider, so
     the page below takes a `Rider` and cannot be handed anything else. */
  const rider = useMemo(
    () => ({
      ...record,
      data: record.data?.entityType === 'rider' ? record.data.data : null,
    }),
    [record],
  )

  return (
    <RiderProfilePage
      entity={entity}
      rider={rider}
      backTo={backTo}
      backLabel={backLabel}
      canOpenDispatch={canOpenDispatch}
      t={t}
      language={language}
      dir={dir}
    />
  )
}

/**
 * The captain presentation. A child, so the record read starts when there is a
 * ref to read against — and so the page receives ONE `AsyncResult` rather than
 * fetching the record a second time beside the sheet's.
 *
 * **The two destinations and their permissions come from `hrefs.ts`**, which
 * both surfaces import, so the sheet and the page cannot send an operator to
 * two different places or refuse the same control on two different grounds
 * (§3). The permission ids are the route table's own `viewPermission` values,
 * named as constants so a typo here cannot silently refuse a control that would
 * have worked.
 */
function ResolvedDriverPage({
  entity,
  backTo,
  backLabel,
}: {
  entity: ProfileRef
  backTo: string
  backLabel: string
}) {
  const shell = useShell()
  const { t, language, dir } = shell.language
  const record = useProfileRecord(entity)
  const nowIso = useNowIso()

  /* `useProfileRecord` returns the discriminated union every kind shares. The
     narrowing is here, at the one place that already knows this is a captain,
     so the page below takes a `Driver` and cannot be handed anything else. */
  const driver = useMemo(
    () => ({
      ...record,
      data: record.data?.entityType === 'driver' ? record.data.data : null,
    }),
    [record],
  )

  const { permissions } = shell.permissions

  return (
    <DriverProfilePage
      entity={entity}
      driver={driver}
      backTo={backTo}
      backLabel={backLabel}
      complianceHref={driverComplianceHref(entity.entityId)}
      payoutsHref={driverPayoutsHref(entity.entityId)}
      canOpenCompliance={permissions.includes(COMPLIANCE_VIEW_PERMISSION)}
      canOpenPayouts={permissions.includes(PAYOUTS_VIEW_PERMISSION)}
      nowIso={nowIso}
      t={t}
      language={language}
      dir={dir}
    />
  )
}

/**
 * The ride presentation. A child, for the same reason the two above are: the
 * record read starts when there is a ref to read against, and the page receives
 * ONE `AsyncResult` rather than fetching the record a second time beside the
 * sheet's.
 */
function ResolvedTripPage({
  entity,
  backTo,
  backLabel,
}: {
  entity: ProfileRef
  backTo: string
  backLabel: string
}) {
  const shell = useShell()
  const location = useLocation()
  const { t, language, dir } = shell.language
  const record = useProfileRecord(entity)
  const nowIso = useNowIso()

  const trip = useMemo(
    () => ({
      ...record,
      data: record.data?.entityType === 'trip' ? record.data.data : null,
    }),
    [record],
  )

  /* The four records a ride names, as `?entity=` links on THIS page — so
     opening the rider from the ride page puts the rider's sheet over the ride
     rather than replacing it. `ProfileLayer` builds the same address from the
     same helper. */
  const hrefFor = useCallback(
    (id: string | null) =>
      id === null ? null : `${location.pathname}${withOverlay(location.search, 'entity', id)}`,
    [location.pathname, location.search],
  )

  return (
    <TripProfilePage
      entity={entity}
      trip={trip}
      backTo={backTo}
      backLabel={backLabel}
      nowIso={nowIso}
      hrefFor={hrefFor}
      t={t}
      language={language}
      dir={dir}
    />
  )
}

/**
 * The card stack, for the eight kinds that have no purpose-built design yet.
 *
 * A child, so the record read starts when there is a ref to read against and
 * the rail and the main column share **one** result rather than two requests
 * for the same row. See `useProfileRecord`.
 */
function ResolvedEntityPage({
  entity,
  header,
}: {
  entity: ProfileRef
  header: React.ReactNode
}) {
  const shell = useShell()
  const { t, language } = shell.language
  const record = useProfileRecord(entity)

  return (
    <DetailPage
      header={header}
      main={
        <ProfileSections
          entity={entity}
          record={record}
          t={t}
          language={language}
          /* §7.2 — identity's facts are the rail's three cards. Omitted here so
             the page does not print them twice. */
          omit={RAIL_SECTIONS}
        />
      }
      /* §2.2 — status, summary and metadata, and nothing else. AC-34: the array
         is the restack order below `--ev-bp-wide`. */
      rail={profileRail({ entity, record, t, language })}
    />
  )
}
