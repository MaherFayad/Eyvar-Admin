/**
 * **The ride record** — the sheet a trips row opens and the page behind it.
 *
 * The claims under test are the ones the surface was built to make, and every
 * one of them is a thing the previous drawer could not do:
 *
 *   1. the record's own arrangement replaces the generic card stack;
 *   2. the ROUTE is the title and the id is the eyebrow;
 *   3. the stage log is read and rendered, with the lateness the trip carries;
 *   4. a subscription leg says which plan and which leg — and a quick ride
 *      does not, which is the whole difference between the two sub-tabs;
 *   5. the fare's five lines are checked against the total, out loud;
 *   6. §11.2 — a ride with no captain still renders the captain card, disabled,
 *      with its reason;
 *   7. the four states, none of them a spinner.
 *
 * Records are **discovered** rather than pinned wherever the ruling is about a
 * condition rather than about a row: `TRP-9106`'s deliberate −3.00 residual is
 * named, because that fixture exists for exactly this assertion and its header
 * says so.
 */

import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getTrip,
  getTripTelemetry,
  listTrips,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import type { Trip } from '@/data/types'
import { createTranslator, type Translator } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { ProfileLayer } from '@/shell/layers/ProfileLayer'
import { hasTripMap } from './TripMap'

const t: Translator = createTranslator({ dictionary: EN })
const en = (key: string) => EN[key] as string
/** The English template with its placeholders filled, so an assertion is the real sentence. */
const fill = (key: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    en(key),
  )

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

afterEach(() => {
  mockFailures.clear()
})

/* ───────────────────────── discovering records ───────────────────────── */

/** A finished subscription leg whose plan is on file — the *Subscription trips* case. */
async function subscriptionLeg(): Promise<Trip> {
  const page = await listTrips({ pageSize: 300 })
  const row = page.items.find(
    (trip) => trip.kind === 'Subscription' && trip.subscriptionId !== null && trip.endedAt !== null,
  )
  expect(row, 'no finished subscription leg in the fixtures').toBeDefined()
  return row!
}

/** A quick ride — the *Quick rides* case, and the one with no plan to name. */
async function quickRide(): Promise<Trip> {
  const page = await listTrips({ pageSize: 300 })
  const row = page.items.find((trip) => trip.kind === 'Quick ride' && trip.driverId !== null)
  expect(row, 'no quick ride in the fixtures').toBeDefined()
  return row!
}

/** A trip that arrived late — the stage the whole surface exists to explain. */
async function lateTrip(): Promise<Trip> {
  const page = await listTrips({ pageSize: 300 })
  const row = page.items.find((trip) => (trip.latenessMinutes ?? 0) > 0)
  expect(row, 'no late trip in the fixtures').toBeDefined()
  return row!
}

/** A ride cancelled before anybody accepted it — §11.2's case. */
async function tripWithNoCaptain(): Promise<Trip> {
  const page = await listTrips({ pageSize: 300 })
  const row = page.items.find((trip) => trip.driverId === null)
  expect(row, 'no captainless trip in the fixtures').toBeDefined()
  return row!
}

/* ─────────────────────────────── the harness ───────────────────────────── */

/**
 * The layer plus the one piece of state its container owns, in a router.
 *
 * `open` is a prop, and in the shell it is derived from `?entity=`. A harness
 * that pinned it to `true` would make every dismissal assertion vacuous. The
 * `MemoryRouter` is not decoration: the sheet's links into the 360° layer are
 * `?entity=` on the CURRENT route, so the layer reads `useLocation`.
 */
function Layer({ entityId }: { entityId: string }) {
  const [open, setOpen] = useState(true)
  return (
    <MemoryRouter>
      <ProfileLayer
        entityId={entityId}
        open={open}
        onClose={() => setOpen(false)}
        onOpenFullProfile={() => undefined}
        t={t}
        language="en"
      />
    </MemoryRouter>
  )
}

async function openSheet(tripId: string): Promise<HTMLElement> {
  render(<Layer entityId={tripId} />)
  return screen.findByRole('dialog')
}

/* === 1 · the record's own arrangement ================================== */

describe('the ride sheet is the trip’s own arrangement, not the card stack', () => {
  it('leads with the ROUTE and puts the id in the eyebrow', async () => {
    const trip = await quickRide()
    const sheet = await openSheet(trip.id)

    /* §7.7 — the title is what happened, and the id is one line up where it can
       still be copied and read down a phone. The trips TABLE makes the opposite
       and equally correct choice, because an operator scans a column of ids. */
    const route = fill('profile.trip.band.route', {
      pickup: trip.pickup ?? trip.route,
      destination: trip.destination ?? trip.route,
    })
    expect(await within(sheet).findByRole('heading', { name: route })).toBeInTheDocument()
    expect(within(sheet).getByText(trip.id)).toBeInTheDocument()
  })

  it('states the trip’s status in the words the table uses, never a second spelling', async () => {
    const trip = await quickRide()
    const sheet = await openSheet(trip.id)
    /* One tone map and one set of words across the table and the record —
       `TRIP_STATUS_TONE` is exported for exactly this reason. */
    expect(
      await within(sheet).findByText(en(`trips.status.${trip.status}`)),
    ).toBeInTheDocument()
  })

  it('renders no generic identity card beside the band', async () => {
    const trip = await quickRide()
    const sheet = await openSheet(trip.id)
    await within(sheet).findByRole('heading', { level: 2 })
    /* The card stack's own heading. Its presence would mean the layer fell
       through to `ProfileSections` — which is what happened before the `trip`
       arm existed, and is why this assertion is here rather than implied. */
    expect(within(sheet).queryByText(en('profile.section.identity'))).not.toBeInTheDocument()
  })
})

/* === 2 · the stage log ================================================= */

describe('the stage log answers where the time went', () => {
  it('names every stage the trip reached, in order', async () => {
    const trip = await quickRide()
    const telemetry = await getTripTelemetry(trip.id)
    const sheet = await openSheet(trip.id)

    await within(sheet).findByText(en('profile.trip.stages.heading'))
    for (const stage of telemetry.stages) {
      const label =
        stage.kind === 'detour' && stage.place !== null
          ? fill('profile.trip.stage.detourOn', { place: stage.place })
          : en(`profile.trip.stage.${stage.kind}`)
      /* `getAllByText` — `Drop-off` is also the map's own endpoint row, and the
         picture repeating the log in words is the point (§7.5) rather than a
         duplication to assert away. */
      expect(within(sheet).getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('carries the lateness the RECORD holds onto the stage it belongs to', async () => {
    const trip = await lateTrip()
    const sheet = await openSheet(trip.id)
    /* `Trip.latenessMinutes` is the number legacy kept inside a status string
       (`'Late +8'`). This is the surface that finally says WHERE it went, and
       the figure has to be the record's rather than one this file invented. */
    expect(
      await within(sheet).findByText(
        fill('profile.trip.stage.lost', { minutes: trip.latenessMinutes ?? 0 }),
      ),
    ).toBeInTheDocument()
  })

  it('sums the lost minutes into one headline, so nobody adds a column up', async () => {
    const trip = await lateTrip()
    const telemetry = await getTripTelemetry(trip.id)
    const lost = telemetry.stages.reduce(
      (total, stage) => total + Math.max(0, stage.deltaMinutes ?? 0),
      0,
    )
    const sheet = await openSheet(trip.id)
    expect(
      await within(sheet).findByText(fill('profile.trip.stages.lost', { minutes: lost })),
    ).toBeInTheDocument()
  })
})

/* === 3 · the subscription leg ========================================== */

describe('a subscription leg says which plan and which leg; a quick ride does not', () => {
  it('names the plan and the position in it', async () => {
    const trip = await subscriptionLeg()
    const sheet = await openSheet(trip.id)
    /* The ONE thing the *Subscription trips* sub-tab has that *Quick rides*
       does not — which is why the two share a record and a sheet. */
    const line = await within(sheet).findByText(new RegExp(trip.subscriptionId ?? ''))
    expect(line).toBeInTheDocument()
    expect(within(sheet).getByText(en('profile.trip.party.subscription'))).toBeInTheDocument()
  })

  it('renders no subscription row on a quick ride', async () => {
    const trip = await quickRide()
    const sheet = await openSheet(trip.id)
    await within(sheet).findByText(en('profile.trip.party.passenger'))
    expect(
      within(sheet).queryByText(en('profile.trip.party.subscription')),
    ).not.toBeInTheDocument()
  })
})

/* === 4 · the fare ====================================================== */

describe('the fare is shown to add up, and says so when it does not', () => {
  it('says the size of the gap on the one trip seeded not to reconcile', async () => {
    /* `TRP-9106` is pinned BY NAME because it exists for this assertion:
       `clients/integrity.ts`'s `money.trip-split` check requires a trip whose
       parts exceed its whole, and the fixture's own header says do not "fix"
       it. The residual is −300 halalas. */
    const trip = await getTrip('TRP-9106')
    const residual =
      trip.fareHalalas -
      (trip.driverEarningsHalalas +
        trip.platformCutHalalas +
        trip.extraStopFeeHalalas +
        trip.tipHalalas)
    expect(residual, 'TRP-9106 no longer carries its deliberate residual').not.toBe(0)

    const sheet = await openSheet(trip.id)
    const user = userEvent.setup()
    const fare = await within(sheet).findByRole('tab', { name: en('profile.trip.tab.fare') })
    await user.click(fare)
    expect(
      await within(sheet).findByText(
        fill('profile.trip.fare.reconcile', { amount: (residual / 100).toFixed(2) }),
      ),
    ).toBeInTheDocument()
  })
})

/* === 5 · §11.2 ========================================================= */

describe('§11.2 — a control with nobody to act on renders disabled with its reason', () => {
  it('keeps the captain card on a ride nobody accepted, and states why', async () => {
    const trip = await tripWithNoCaptain()
    const sheet = await openSheet(trip.id)

    /* Hiding it would leave an operator wondering whether the sheet was still
       loading — the systemic legacy defect §11.2 exists to end. */
    expect(await within(sheet).findByText(en('profile.trip.party.captain'))).toBeInTheDocument()
    expect(within(sheet).getByText(en('profile.trip.party.noCaptain'))).toBeInTheDocument()
    expect(
      within(sheet).getByText(en('profile.trip.party.noCaptainReason')),
    ).toBeInTheDocument()
    expect(
      within(sheet).getByRole('button', { name: en('profile.trip.party.callCaptain') }),
    ).toBeDisabled()
  })
})

/* === 6 · the states ==================================================== */

describe('the four states, and a spinner in none of them', () => {
  it('marks one busy region while the record arrives, and renders no spinner', async () => {
    render(<Layer entityId="TRP-7742" />)
    const busy = document.querySelectorAll('[aria-busy="true"]')
    expect(busy.length).toBeLessThanOrEqual(1)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    await screen.findByRole('dialog')
  })

  it('fails the stage log without taking the sheet down', async () => {
    /* §9.2 #14 — each read owns its four states inside the block that renders
       it. The trip's own record still paints; only the rail is lost. */
    mockFailures.always('trips.telemetry')
    const trip = await quickRide()
    const sheet = await openSheet(trip.id)
    expect(await within(sheet).findByText(en('profile.trip.stages.error'))).toBeInTheDocument()
    expect(within(sheet).getByText(en('profile.trip.party.passenger'))).toBeInTheDocument()
  })
})

/* === 7 · the expanded map ============================================== */

describe('the map opens into a surface big enough to work in', () => {
  it('offers the expansion as a real button, so the keyboard can reach it', async () => {
    const trip = await getTrip('TRP-7742')
    const sheet = await openSheet(trip.id)
    /* AC-30. The click-anywhere on the canvas is a mouse convenience layered
       over this; a control only a pointer can reach is not a control. */
    expect(
      await within(sheet).findByRole('button', { name: en('profile.trip.map.expand') }),
    ).toBeInTheDocument()
  })

  it('opens a dialog named for the ride, carrying the caveat the picture needs', async () => {
    const user = userEvent.setup()
    const trip = await getTrip('TRP-7742')
    const sheet = await openSheet(trip.id)

    await user.click(
      await within(sheet).findByRole('button', { name: en('profile.trip.map.expand') }),
    )

    const route = fill('profile.trip.band.route', {
      pickup: trip.pickup ?? trip.route,
      destination: trip.destination ?? trip.route,
    })
    /* The dialog is named for the RECORD, not `Map` — a surface called `Map`
       tells an operator with three sheets open nothing about which one this is. */
    const dialog = await screen.findByRole('dialog', { name: route })
    /* `places.ts`'s caveat travels with the picture, because the picture is now
       big enough to look authoritative. */
    expect(within(dialog).getByText(en('profile.trip.map.dialogNote'))).toBeInTheDocument()
  })

  it('does not offer a second expansion inside the expanded map', async () => {
    const user = userEvent.setup()
    const trip = await getTrip('TRP-7742')
    const sheet = await openSheet(trip.id)
    await user.click(
      await within(sheet).findByRole('button', { name: en('profile.trip.map.expand') }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: fill('profile.trip.band.route', {
        pickup: trip.pickup ?? trip.route,
        destination: trip.destination ?? trip.route,
      }),
    })
    /* None inside — the expanded instance drops the affordance it was opened
       by. Scoped to the dialog rather than counted across the document,
       because a modal marks everything outside itself `aria-hidden` and the
       inline map's own button is unreachable while this is open. */
    expect(
      within(dialog).queryByRole('button', { name: en('profile.trip.map.expand') }),
    ).not.toBeInTheDocument()
  })

  it('keeps its own zoom controls, so the big map is the one you work in', async () => {
    const user = userEvent.setup()
    const trip = await getTrip('TRP-7742')
    const sheet = await openSheet(trip.id)
    await user.click(
      await within(sheet).findByRole('button', { name: en('profile.trip.map.expand') }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: fill('profile.trip.band.route', {
        pickup: trip.pickup ?? trip.route,
        destination: trip.destination ?? trip.route,
      }),
    })
    /* Its OWN viewport: panning the expanded map must not move the small one
       behind it, which is what a second `useMapViewport` buys. */
    expect(
      within(dialog).getByRole('button', { name: en('profile.trip.map.zoom.in') }),
    ).toBeInTheDocument()
  })
})

/* === 8 · every trip has a map ========================================== */

describe('the gazetteer places both ends of an ordinary trip', () => {
  it('draws a map for the volume rows, which used to have none', async () => {
    /* 120 of the 137 trips ran between `District 1` … `District 12` — names the
       gazetteer has no entry for — so `hasTripMap` was false on almost every
       record in the product and an operator opening a trip saw no map and no
       reason for there not to be one. */
    const page = await listTrips({ pageSize: 300 })
    const unplaceable = page.items.filter((row) => !hasTripMap(row)).map((row) => row.route)
    /* `KFUPM` is in Dhahran and two hand-written trips use it as a Riyadh
       commute; `fixtures/trips.ts` says why it is left unplaced. Everything
       else places. */
    expect(unplaceable.every((route) => route.includes('KFUPM'))).toBe(true)
    expect(unplaceable.length).toBeLessThan(5)
  })
})
