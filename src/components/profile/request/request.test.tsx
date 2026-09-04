/**
 * The ride-request sheet — behaviour, not appearance.
 *
 * Every test drives the real surface: `ProfileLayer` with a real
 * `resolveProfile` and the real client behind the mock seam. Nothing here
 * imports a fixture and **no test hard-codes a record id** — every row is
 * DISCOVERED from the data at run time (*"a request nobody has accepted"*, *"a
 * subscription request with a hold"*), so a fixture edit cannot fail a test for
 * a reason that has nothing to do with the component. The rider sheet's own
 * suite sets out the same rule and the same reasoning.
 *
 * What is under test, in order: that the row's subject is the RIDE, that the
 * two figures survive a request the gazetteer cannot place, that the clock
 * stops when the request is disposed of, and that Arabic gets the arrow the
 * other way round.
 */

import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, listRequests, resetDataLayer } from '@/data/clients'
import type { RideRequest } from '@/data/types'
import { createTranslator, formatMoney, type Translator } from '@/lib'
import { AR, EN } from '@/i18n/dictionaries'
import { ProfileLayer } from '@/shell/layers/ProfileLayer'
import { requestEvents } from './RequestPanels'

const t: Translator = createTranslator({ dictionary: EN })
const ar: Translator = createTranslator({ dictionary: AR, language: 'ar' })
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

/* ───────────────────────── discovering records ───────────────────────── */

async function allRequests(): Promise<RideRequest[]> {
  const page = await listRequests({ pageSize: 500 })
  return page.items
}

async function find(
  predicate: (row: RideRequest) => boolean,
  what: string,
): Promise<RideRequest> {
  const row = (await allRequests()).find(predicate)
  expect(row, `no request in the fixtures that is ${what}`).toBeDefined()
  return row!
}

/** The layer plus the one piece of state its container owns — see the rider suite. */
function Layer({
  entityId,
  translate = t,
  language = 'en' as const,
}: {
  entityId: string
  translate?: Translator
  language?: 'en' | 'ar'
}) {
  const [open, setOpen] = useState(true)
  return (
    /* The sheet links to the rider's own record, so it needs a router. The
       shell supplies one; the harness supplies the smallest possible stand-in. */
    <MemoryRouter>
      <ProfileLayer
        entityId={entityId}
        open={open}
        onClose={() => setOpen(false)}
        onOpenFullProfile={() => undefined}
        /* What `AppLayout` supplies in the shell: the current route with a
           different `?entity=`. Passed here rather than left out, because the
           link back to the rider is a claim this suite makes — and the layer
           takes it as a prop precisely so a test can mount without a route. */
        entityHref={(id) => `/operations/ride-requests?entity=${id}`}
        t={translate}
        language={language}
      />
    </MemoryRouter>
  )
}

async function openSheet(entityId: string, language?: 'ar'): Promise<HTMLElement> {
  render(
    language === 'ar' ? (
      <Layer entityId={entityId} translate={ar} language="ar" />
    ) : (
      <Layer entityId={entityId} />
    ),
  )
  return screen.findByRole('dialog')
}

/* === 1 . the subject is the ride ======================================= */

describe('the record is the RIDE, which is the whole reason this kind exists', () => {
  it('names the route as the sheet’s one heading, and the rider as a meta fact', async () => {
    const row = await find((r) => r.channel === 'instant', 'an instant request')
    const dialog = await openSheet(row.id)

    /* The route is the dialog's accessible name. It is built from
       `requests.route` — the key that carries the arrow — and never from a
       pre-joined string in the data layer. */
    const route = fill('requests.route', {
      pickup: row.pickup,
      destination: row.destination,
    })
    expect(await within(dialog).findByRole('heading', { name: route })).toBeInTheDocument()

    /* The kind and the id are the eyebrow; the rider is present but is NOT the
       heading. That inversion is the fix this record kind exists for. */
    expect(within(dialog).getByText(en('profile.kind.request'))).toBeInTheDocument()
    expect(within(dialog).getByText(row.id)).toBeInTheDocument()
    expect(within(dialog).queryByRole('heading', { name: row.riderName })).toBeNull()
    expect(await within(dialog).findAllByText(row.riderName)).not.toHaveLength(0)
  })

  it('keeps the rider reachable — the name is a link to their own record', async () => {
    const row = await find((r) => r.channel === 'instant', 'an instant request')
    const dialog = await openSheet(row.id)

    /* Making the row open the ride would otherwise have removed the only path
       from this queue to the person waiting on it. */
    const link = await within(dialog).findByRole('link', { name: row.riderName })
    expect(link.getAttribute('href')).toContain(`entity=${row.riderId}`)
  })
})

/* === 2 . the two figures =============================================== */

describe('the money and the wait — the two numbers the sheet exists to show', () => {
  it('shows an instant request’s quote under the estimated-fare label', async () => {
    const row = await find(
      (r) => r.channel === 'instant' && r.quotedFareHalalas !== null,
      'an instant request with a quote',
    )
    const dialog = await openSheet(row.id)

    expect(await within(dialog).findAllByText(en('profile.request.rail.fare'))).not.toHaveLength(0)
    /* `unit: 'none'` on the float — the unit is its own caption beside it. */
    const figure = formatMoney(row.quotedFareHalalas!, { unit: 'none' })
    expect(within(dialog).getAllByText(figure).length).toBeGreaterThan(0)
  })

  it('shows a subscription request’s AUTHORISATION HOLD, under its own label', async () => {
    const row = await find(
      (r) => r.channel === 'subscription' && r.authorisationHoldHalalas !== null,
      'a subscription request with a hold',
    )
    const dialog = await openSheet(row.id)

    /* Two labels and not one, because the two are different facts: a quote is
       an estimate an operator may ignore, a hold is money that moves when they
       press Assign. */
    expect(await within(dialog).findAllByText(en('profile.request.rail.hold'))).not.toHaveLength(0)
    const figure = formatMoney(row.authorisationHoldHalalas!, { unit: 'none' })
    expect(within(dialog).getAllByText(figure).length).toBeGreaterThan(0)
  })

  it('states in words that no quote came back, and never renders it as zero', async () => {
    const row = await find(
      (r) => r.channel === 'instant' && r.quotedFareHalalas === null,
      'an instant request with no quote',
    )
    const dialog = await openSheet(row.id)

    expect(await within(dialog).findByText(en('profile.request.rail.noQuote'))).toBeInTheDocument()
    expect(within(dialog).queryByText(formatMoney(0, { unit: 'none' }))).toBeNull()
  })
})

/* === 3 . the clock ===================================================== */

describe('the waiting clock stops when the request does', () => {
  it('reads “Waiting” while the request is open and “Waited” once it is disposed of', async () => {
    const open = await find(
      (r) => r.status === 'searching' || r.status === 'no-drivers',
      'a request still open',
    )
    const closed = await find((r) => r.status === 'assigned', 'a request already assigned')

    const openDialog = await openSheet(open.id)
    expect(await within(openDialog).findByText(en('profile.request.float.waiting'))).toBeInTheDocument()
    /* Torn down explicitly rather than left to the auto-cleanup between tests:
       both sheets are asserted inside ONE test, because the pair is the claim —
       one word while the clock runs and the other once it has stopped — and two
       dialogs on the screen at once would make either `findByText` ambiguous. */
    cleanup()

    const closedDialog = await openSheet(closed.id)
    /* A float counting up on a row assigned four days ago is a lie the sheet
       tells at a glance. The word changes because the clock has stopped. */
    expect(await within(closedDialog).findByText(en('profile.request.float.waited'))).toBeInTheDocument()
  })
})

/* === 4 . the timeline ================================================== */

describe('the timeline is the record’s own stamps, ordered — nothing inferred', () => {
  it('emits one row per stamp the record carries, newest first', async () => {
    const row = await find((r) => r.assignedAt !== null, 'an assigned request')
    const events = requestEvents(row, t)

    /* Newest first, and every row's instant is a field on the record. */
    const times = events.map((e) => Date.parse(e.at))
    expect([...times].sort((a, b) => b - a)).toEqual(times)

    /* `requestedAt` is the one stamp every request has, so it is always the
       last row and the list is never empty. */
    expect(events.at(-1)?.at).toBe(row.requestedAt)
    expect(events.some((e) => e.key === 'assigned')).toBe(true)
  })

  it('emits NO breach row for a request whose deadline merely passed', async () => {
    /* `types/workQueue.ts`: breach is a stamp, never `slaDueAt < now`. A naive
       comparison would put a breach row on every closed archive row. */
    const row = await find(
      (r) => r.slaBreachedAt === null && r.slaDueAt !== null,
      'a request with a deadline and no breach stamp',
    )
    expect(requestEvents(row, t).some((e) => e.key === 'breached')).toBe(false)
  })
})

/* === 5 . Arabic ======================================================== */

describe('Arabic — the chrome mirrors, the geography does not', () => {
  it('points the route arrow the other way, from the dictionary and not from CSS', async () => {
    const row = await find((r) => r.channel === 'instant', 'an instant request')
    const dialog = await openSheet(row.id, 'ar')

    const arabicRoute = (AR['requests.route'] as string)
      .replace('{pickup}', row.pickup)
      .replace('{destination}', row.destination)
    expect(await within(dialog).findByRole('heading', { name: arabicRoute })).toBeInTheDocument()
    /* The English arrow must be gone entirely — §9.5 swaps the glyph at
       string-construction time, so a mirrored layout carrying `→` would mean
       the swap had been done with CSS somewhere. */
    expect(arabicRoute).toContain('←')
  })

  it('pins the map canvas to ltr — north is up in every locale', async () => {
    const row = await find((r) => r.channel === 'instant', 'an instant request')
    const dialog = await openSheet(row.id, 'ar')

    /* **Wait for the RECORD, not for the dialog.** `openSheet` resolves the
       moment the surface exists, which is while `resolveProfile` and the record
       read are still in flight — and until the record lands the sheet is its
       skeleton, which draws no map. Anchoring on a value only the loaded record
       can produce is what makes the query below assert the map rather than race
       the read. */
    await within(dialog).findByText(row.pickup)

    const canvas = dialog.querySelector('[dir="ltr"]')
    expect(canvas, 'the map canvas is not pinned ltr').not.toBeNull()
    expect(canvas!.querySelector('svg[role="img"]')).not.toBeNull()
  })
})
