/**
 * The rider profile sheet — behaviour, not appearance.
 *
 * Every test drives the real surface: `ProfileLayer` with a real `resolveProfile`
 * and the real clients behind the mock seam. Nothing here imports a fixture, and
 * **no test hard-codes a record id.** `RDR-4002` is the record the design was
 * drawn against and it is being re-seeded, so every id below is DISCOVERED from
 * the data at run time — *"a rider whose newest open trip has no captain"*,
 * *"a rider whose wallet holds money"* — and the assertions are about the
 * relationship between what the data says and what the sheet renders. A test
 * pinned to an id passes until somebody edits a fixture and then fails for a
 * reason that has nothing to do with the component.
 *
 * The four states are the first four blocks, in the order §11 builds them.
 */

import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getRider,
  getRiderMoneyMovements,
  getRiderSupportPresence,
  getRiderTimeline,
  listRiders,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import type { Paginated, Rider, RiderTimelineEvent } from '@/data/types'
import type { AsyncResult } from '@/hooks'
import { createTranslator, formatMoney, type Translator } from '@/lib'
import { riderTimelineStrings } from '@/i18n/vocabulary/copy'
import { AR, EN } from '@/i18n/dictionaries'
import { ProfileLayer } from '@/shell/layers/ProfileLayer'
import { RiderPanels } from './RiderPanels'
import type { RiderProfileReads } from './RiderProfile'

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

afterEach(() => {
  mockFailures.clear()
})

/* ───────────────────────── discovering records ───────────────────────── */

/**
 * A rider whose newest open trip has no captain — the sheet's refusal case.
 *
 * `kind === 'trip-requested'` is the data layer's own open-trip test
 * (`TRIP_EVENT` maps the four open statuses onto it), so this helper cannot
 * drift from `OPEN_TRIP_STATUSES` the way a local status list would.
 */
async function riderWithUnassignedOpenTrip(): Promise<{
  rider: Rider
  event: RiderTimelineEvent
}> {
  const page = await listRiders({ pageSize: 500 })
  for (const rider of page.items) {
    const timeline = await getRiderTimeline(rider.id, { pageSize: 50 })
    const event = timeline.items.find(
      (row) => row.kind === 'trip-requested' && row.detail.captainAssigned === false,
    )
    if (event) return { rider, event }
  }
  throw new Error('no rider with an unassigned open trip in the fixtures')
}

/**
 * A rider at a named churn level.
 *
 * Discovered rather than pinned, like every other record here: the ruling under
 * test is *"only `high` is coloured"*, which needs one rider at each level and
 * no particular rider at any of them.
 */
async function riderAtChurn(level: Rider['churnRisk']): Promise<Rider> {
  const page = await listRiders({ pageSize: 500 })
  const rider = page.items.find((row) => row.churnRisk === level)
  expect(rider, `no rider with churnRisk '${level}' in the fixtures`).toBeDefined()
  return rider!
}

/** A rider with money captured and not settled — `Rider.heldHalalas` non-zero. */
async function riderWithMoneyUnderReview(): Promise<Rider> {
  const page = await listRiders({ pageSize: 500 })
  const rider = page.items.find((row) => row.heldHalalas !== 0)
  expect(rider, 'no rider with money under review in the fixtures').toBeDefined()
  return rider!
}

/** A rider whose money tab has nothing in it at all. */
async function riderWithNoMoney(): Promise<Rider> {
  const page = await listRiders({ pageSize: 500 })
  for (const row of page.items) {
    const movements = await getRiderMoneyMovements(row.id)
    if (movements.movements.length === 0) return row
  }
  throw new Error('no rider with an empty money tab in the fixtures')
}

/** A rider with a support resource that has records, and one that has none. */
async function riderWithMixedSupportPresence(): Promise<Rider> {
  const page = await listRiders({ pageSize: 500 })
  for (const row of page.items) {
    const presence = await getRiderSupportPresence(row.id)
    const counts = [
      presence.tickets,
      presence.complaints,
      presence.conversations,
      presence.disputes,
      presence.lostAndFound,
      presence.fairnessCases,
      presence.requests,
    ]
    if (counts.some((c) => c.total > 0) && counts.some((c) => c.total === 0)) return row
  }
  throw new Error('no rider with both a present and an absent support resource')
}

/**
 * The layer plus the ONE piece of state its container owns.
 *
 * `open` is a prop, and in the shell it is derived from `?entity=` — closing
 * the layer removes the param and the layer unmounts. A harness that pinned
 * `open` to `true` would make every dismissal assertion vacuous: `Escape` would
 * fire, `onClose` would run, and the dialog would still be there because
 * nothing had told it not to be.
 */
function Layer({
  entityId,
  translate = t,
  language = 'en' as const,
}: {
  entityId: string
  /* `Translator`, not `Translate`: the layer's captain arm counts documents and
     trips, and a count that governs a noun needs the plural family. The value
     here has always been one — `createTranslator` returns a `Translator` — so
     this annotation was discarding it. */
  translate?: Translator
  language?: 'en' | 'ar'
}) {
  const [open, setOpen] = useState(true)
  return (
    /* **A router, because the layer now builds addresses.** The sheet's links
       into the 360° layer are `?entity=` on the CURRENT route, so `ProfileLayer`
       reads `useLocation` — the same reason the captain harness has had one
       since its own links landed. Without it the layer throws on render and
       every assertion below fails for a reason that has nothing to do with what
       it is testing. */
    <MemoryRouter>
      <ProfileLayer
        entityId={entityId}
        open={open}
        onClose={() => setOpen(false)}
        onOpenFullProfile={() => undefined}
        t={translate}
        language={language}
      />
    </MemoryRouter>
  )
}

/** The sheet's own dialog, so an assertion cannot match the page behind it. */
async function openSheet(entityId: string): Promise<HTMLElement> {
  render(<Layer entityId={entityId} />)
  return screen.findByRole('dialog')
}

/* === 1 . content ====================================================== */

describe('content — the record renders, in the arrangement the rider sheet declares', () => {
  it('paints the band from the record: kind, id, name, phone and city — and NOT the identity fields', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)

    expect(within(dialog).getByText(en('profile.kind.rider'))).toBeInTheDocument()
    expect(within(dialog).getByText(rider.id)).toBeInTheDocument()
    /* The NAME is the dialog's heading — one accessible name on the surface,
       and it is the record's, not the layer's. */
    expect(await within(dialog).findByRole('heading', { name: rider.name })).toBeInTheDocument()
    expect(await within(dialog).findByText(rider.phone)).toBeInTheDocument()
    expect(within(dialog).getByText(rider.city)).toBeInTheDocument()

    /* **The band carries two facts, not five, and the negative half is the
       point of this assertion.** The status, the tier and the joined date came
       out of the band on an owner instruction — and they are legal to remove
       only because all three remain fields in the Identity block on BOTH
       surfaces, so no fact changed surface, value or rank (§3).

       Scoped to the band rather than the dialog for exactly that reason: they
       are still on this screen, one scroll down, and a dialog-wide `queryBy`
       would fail on the copy that is SUPPOSED to be there. */
    const band = within(dialog).getByText(rider.phone).closest('div')!
    expect(within(band).queryByText(/Joined/)).toBeNull()
    expect(within(band).queryByText(/tier/i)).toBeNull()
  })

  it('shows the wallet balance the RECORD carries, from the one money read', async () => {
    const rider = await riderWithMoneyUnderReview()
    const dialog = await openSheet(rider.id)
    /* `unit="none"` — the ISO code is the caption beside it, stated once. */
    expect(
      await within(dialog).findByText(formatMoney(rider.walletBalanceHalalas, { unit: 'none' })),
    ).toBeInTheDocument()
    expect(within(dialog).getAllByText(en('profile.rider.rail.unit')).length).toBeGreaterThan(0)
  })

  it('puts money under review in its OWN block, never inside the wallet balance', async () => {
    const rider = await riderWithMoneyUnderReview()
    const dialog = await openSheet(rider.id)

    /* §8.3.4 — a separate labelled line, and the label is deliberately not
       `Held`: none of the rider's balance is held, and `Held` under a balance
       claims that it is. */
    const heading = await within(dialog).findByRole('heading', {
      name: en('profile.rider.rail.underReview'),
    })
    const block = heading.closest('section')!
    expect(
      within(block).getByText(formatMoney(rider.heldHalalas, { unit: 'none' })),
    ).toBeInTheDocument()

    /* And it is NOT in the wallet block. */
    const wallet = within(dialog)
      .getByRole('heading', { name: en('profile.section.wallet') })
      .closest('section')!
    expect(within(wallet).queryByText(formatMoney(rider.heldHalalas, { unit: 'none' }))).toBeNull()
  })

  it('renders neither the block nor its rule when nothing is under review', async () => {
    const page = await listRiders({ pageSize: 500 })
    const rider = page.items.find((row) => row.heldHalalas === 0)!
    const dialog = await openSheet(rider.id)
    await within(dialog).findByRole('heading', { name: en('profile.section.wallet') })
    /* No zero and no em dash — the block is absent. */
    expect(
      within(dialog).queryByRole('heading', { name: en('profile.rider.rail.underReview') }),
    ).toBeNull()
  })

  it('renders the churn REASON the record carries, never one it inferred', async () => {
    const page = await listRiders({ pageSize: 500 })
    const rider = page.items.find((row) => row.churnReason !== null)!
    const dialog = await openSheet(rider.id)
    /* The key comes off the record and resolves through the SHARED vocabulary,
       so the sheet and the full page cannot explain one level two ways. */
    const expected = Object.entries(rider.churnReason!.params ?? {}).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, String(value)),
      EN[rider.churnReason!.key] as string,
    )
    expect(await within(dialog).findByText(expected)).toBeInTheDocument()
  })

  it('pins the newest OPEN trip above the earlier rows and names it in words', async () => {
    const { rider, event } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)

    expect(await within(dialog).findByText(en('profile.rider.activity.open'))).toBeInTheDocument()
    expect(within(dialog).getByText(new RegExp(event.recordId!))).toBeInTheDocument()

    /* The subtitle comes from `riderTimelineStrings`, the resolver BOTH profile
       surfaces go through — so the route is built from `pickup` and
       `destination`, never from `Trip.route`'s pre-joined arrow, and the sheet
       and the page cannot word one row two ways. */
    const strings = riderTimelineStrings(t, event, 'en')
    expect(within(dialog).getByText(strings.subtitle!)).toBeInTheDocument()

    /* The unassigned line does NOT come from the resolver, and that is
       deliberate: the resolver answers for a timeline row and is past tense,
       while this is a card about a trip still waiting. Same shared module, same
       words on both surfaces, tense chosen by the context. */
    expect(within(dialog).getByText(en('rider.trip.noCaptainYet'))).toBeInTheDocument()
  })

  it('shows no fare on an open trip, because the record has none', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)
    const card = (await within(dialog).findByText(en('profile.rider.activity.open'))).closest(
      'section',
    )!
    /* `fareHalalas` is `0` on a trip that has not ended — the only thing a
       non-nullable `Halalas` can say for "not settled yet" — so `0.00 SAR`
       here would be a number the record does not have. Dispatch removed exactly
       this; the timeline carries no money at all. */
    expect(within(card).queryByText(/0\.00/)).toBeNull()
  })

  it('lists the money movements with the sign taken from `direction`', async () => {
    const user = userEvent.setup()
    const rider = await riderWithMoneyUnderReview()
    const movements = await getRiderMoneyMovements(rider.id)
    const debit = movements.movements.find((m) => m.direction === 'debit')!
    const dialog = await openSheet(rider.id)

    await user.click(await within(dialog).findByRole('tab', { name: /Money/ }))
    const row = (await within(dialog).findByText(new RegExp(debit.id))).closest('li')!
    /* U+2212, from `MINUS_SIGN` — and the AMOUNT is still the positive integer
       the contract fixes. Nothing negated it. */
    expect(row.textContent).toContain(`−${formatMoney(debit.amountHalalas)}`)
  })

  it('says which movements are outside the wallet balance', async () => {
    const user = userEvent.setup()
    const rider = await riderWithMoneyUnderReview()
    const movements = await getRiderMoneyMovements(rider.id)
    const outside = movements.movements.find((m) => !m.inWalletBalance)!
    const dialog = await openSheet(rider.id)

    await user.click(await within(dialog).findByRole('tab', { name: /Money/ }))
    const row = (await within(dialog).findByText(new RegExp(outside.id))).closest('li')!
    /* The rows do not sum to the balance and are not meant to. An operator who
       adds the column up has to be told, on the rows it is true of. */
    expect(within(row).getByText(en('profile.rider.money.outsideBalance'))).toBeInTheDocument()
  })

  it('states presence PER RESOURCE, asked rather than assumed', async () => {
    const user = userEvent.setup()
    const rider = await riderWithMixedSupportPresence()
    const presence = await getRiderSupportPresence(rider.id)
    const dialog = await openSheet(rider.id)

    await user.click(
      await within(dialog).findByRole('tab', { name: en('profile.section.identity') }),
    )

    /* The design ended on `No tickets, no device, no rating on this record.`
       That sentence is false for this record on two of its three clauses, which
       is why there is no sentence: each resource is asked and answers for
       itself. */
    for (const [label, count] of [
      [en('profile.section.tickets'), presence.tickets],
      [en('profile.rider.support.complaints'), presence.complaints],
      [en('profile.rider.support.conversations'), presence.conversations],
    ] as const) {
      const term = await within(dialog).findByText(label)
      const pair = term.parentElement!
      expect(pair.textContent, label).toContain(
        count.total === 0 ? en('profile.rider.support.none') : 'on record',
      )
    }
  })

  it('renders the DEVICE facts whenever the record has them', async () => {
    const user = userEvent.setup()
    const page = await listRiders({ pageSize: 500 })
    const withDevice = page.items.find((row) => row.device !== null)!
    const dialog = await openSheet(withDevice.id)

    await user.click(
      await within(dialog).findByRole('tab', { name: en('profile.section.identity') }),
    )
    expect(await within(dialog).findByText(en('profile.field.device'))).toBeInTheDocument()
    expect(within(dialog).getByText(withDevice.device!)).toBeInTheDocument()
  })

  it('groups an absent device with the other absences instead of printing a blank', async () => {
    const user = userEvent.setup()
    const page = await listRiders({ pageSize: 500 })
    const withoutDevice = page.items.find((row) => row.device === null)
    expect(
      withoutDevice,
      'no rider without a device — both branches have to be reachable',
    ).toBeDefined()
    const dialog = await openSheet(withoutDevice!.id)

    await user.click(
      await within(dialog).findByRole('tab', { name: en('profile.section.identity') }),
    )
    /* §3.5 as amended — the absent fields are NAMED, once, in `fields.tsx`'s own
       grouped line. Never a blank cell, and never a second sentence built here. */
    const absent = await within(dialog).findByText(en('profile.field.absentMany'))
    expect(absent.parentElement!.textContent).toContain(en('profile.field.device'))
  })
})

/* === 2 . empty ======================================================== */

describe('empty — one grey sentence per tab, never one per collection (R8/AC-37)', () => {
  it('renders a single sentence for a rider with no money at all', async () => {
    const user = userEvent.setup()
    const rider = await riderWithNoMoney()
    const dialog = await openSheet(rider.id)

    await user.click(await within(dialog).findByRole('tab', { name: /Money/ }))
    expect(await within(dialog).findByText(en('profile.rider.money.empty'))).toBeInTheDocument()
    /* The tab is the unit: one statement, not one per collection behind it. */
    expect(within(dialog).queryByText(en('profile.state.emptyLedger'))).toBeNull()
    expect(within(dialog).queryByText(en('profile.state.emptyPayments'))).toBeNull()
  })

  it('renders one sentence when the timeline is empty', async () => {
    /* Synthesised rather than discovered: every seeded rider has at least a
       registration event, so this state is unreachable from the fixtures and a
       test that waited for one would silently never run. The reads are stubbed
       at the seam the panel consumes, not below it. */
    const rider = await getRider((await riderWithNoMoney()).id)
    render(<RiderPanels rider={rider} reads={await emptyReads(rider.id)} t={t} language="en" />)
    expect(screen.getByText(en('profile.rider.activity.empty'))).toBeInTheDocument()
  })
})

/* === 3 . loading ====================================================== */

describe('loading — a skeleton shaped like this layout, never a spinner (§11.3/AC-35)', () => {
  it('marks one busy region and renders no spinner while the record is arriving', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    render(<Layer entityId={rider.id} />)

    /* The first paint, before any promise resolves. */
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(document.querySelector('[data-slot="spinner"]')).toBeNull()

    await screen.findByRole('heading', { name: rider.name })
  })

  it('renders NO tab count while the read behind it is still in flight', async () => {
    /* Driven at the panel rather than through the layer, because
       `disableMockLatency` resolves every read in a microtask — the in-flight
       window through the whole sheet is one synchronous frame, and a test that
       tried to observe it there would be racing the scheduler rather than
       asserting the rule.

       The rule: a `0` printed before a read returns is indistinguishable from a
       real zero, so an unanswered read withholds its count entirely. */
    const rider = await getRider((await riderWithNoMoney()).id)
    const reads = await emptyReads(rider.id)
    const { rerender } = render(
      <RiderPanels rider={rider} reads={{ ...reads, money: stubLoading() }} t={t} language="en" />,
    )

    expect(screen.getByRole('tab', { name: /Money/ })).not.toHaveTextContent(/\d/)
    /* And the badge is a SKELETON in the meantime, not an absence — the tab row
       does not change width when the number lands. */
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)

    rerender(<RiderPanels rider={rider} reads={reads} t={t} language="en" />)
    expect(screen.getByRole('tab', { name: /Money/ })).toHaveTextContent('0')
  })
})

/* === 4 . error and not-found ========================================== */

describe('error — card-scoped, and the sheet stays dismissible (§9.2 #14)', () => {
  it('fails the RECORD without taking the sheet down, and offers a retry', async () => {
    const user = userEvent.setup()
    const { rider } = await riderWithUnassignedOpenTrip()
    mockFailures.always('riders.get')
    const dialog = await openSheet(rider.id)

    expect(
      await within(dialog).findByRole('button', { name: en('profile.state.retry') }),
    ).toBeInTheDocument()
    /* The band still names the record: `resolveProfile` succeeded, so the id and
       the title are known even though the record read failed. */
    expect(within(dialog).getByText(rider.id)).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('fails ONE collection without failing the others', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    mockFailures.always('riders.timeline')
    const dialog = await openSheet(rider.id)

    expect(
      await within(dialog).findByText(
        fill('profile.state.error', { section: en('profile.rider.tab.activity') }),
      ),
    ).toBeInTheDocument()
    /* The rail is built from the record, which did not fail, so it is still
       showing the churn level beside the failed panel. */
    expect(within(dialog).getByText(en('profile.field.churnRisk'))).toBeInTheDocument()
  })

  it('names the id and stays dismissible when nothing resolves (AC-42)', async () => {
    const user = userEvent.setup()
    const dialog = await openSheet('NOT-A-RECORD')
    expect(
      await within(dialog).findByText(fill('state.overlayNotFound.message', { id: 'NOT-A-RECORD' })),
    ).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

/* === 5 . the refusal (§11.2) ========================================== */

describe('§11.2 — a blocked control is disabled IN PLACE with its reason readable', () => {
  it('disables `Assign a captain` on an unassigned trip and states why, in words', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)

    const assign = await within(dialog).findByRole('button', {
      name: en('profile.rider.action.assign'),
    })
    /* Present, not hidden. */
    expect(assign).toBeDisabled()

    /* The reason is ON SCREEN, readable, and associated with the control —
       not a `title` attribute and not implied by greying. */
    const reason = within(dialog).getByText(en('profile.rider.refusal.assign'))
    expect(reason).toBeVisible()
    expect(assign).toHaveAttribute('aria-describedby', reason.id)
  })

  it('states the FACT beside it rather than leaving the card silent', async () => {
    const { rider, event } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)

    /* **The shared sentence whose TENSE fits an open trip**, so the sheet and
       the full page say "no captain" in the same words as each other — and not
       in the timeline's words.

       Both sentences live in `i18n/vocabulary/copy.ts`. The resolver's `note`
       answers for a timeline ROW and is past tense, because a row reports what
       has already happened. This is the open-trip CARD, and "was assigned"
       there reads as though the trip were over — the one thing the card exists
       to say it is not. */
    expect(
      await within(dialog).findByText(en('rider.trip.noCaptainYet')),
    ).toBeInTheDocument()

    /* The negative twin, and the reason this test is not just a string check:
       the timeline's past-tense sentence must NOT be what the card renders.
       Without this, pointing the card back at the resolver would pass. */
    const timelineNote = riderTimelineStrings(t, event, 'en').note!
    expect(timelineNote).not.toBe(en('rider.trip.noCaptainYet'))
    expect(within(dialog).queryByText(timelineNote)).toBeNull()
  })

  it('offers no command that has no operation behind it', async () => {
    const rider = await riderWithMoneyUnderReview()
    const dialog = await openSheet(rider.id)
    await within(dialog).findByText(en('profile.field.churnRisk'))

    /* `Release` and `Renew plan` were in the design and are not in the product.
       Releasing this hold has real semantics (`reversePosting`, AC-332) and no
       way to reach them — `PAY-6150.postingId` is `null` — and the hold itself
       is a TWO-record finding: the rider shares an IP with another, so lifting
       it from one profile would overturn it with the other half off screen.
       Renewal is a three-step wizard behind a corporate approval gate. A
       command with no operation is absent from BOTH profile surfaces rather
       than disabled-and-broken on one, so there is no control here to find, no
       placeholder and no invented reason under it. */
    expect(within(dialog).queryByRole('button', { name: /Release/ })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: /Renew/ })).toBeNull()

    /* The hold is still SURFACED — displaying is not deciding. */
    expect(
      within(dialog).getByRole('heading', { name: en('profile.rider.rail.underReview') }),
    ).toBeInTheDocument()

    /* §6.2's footer is intact: a plain link at the inline-start, no primary. */
    expect(
      within(dialog).getByRole('button', { name: en('shell.layer.openFullProfile') }),
    ).toBeInTheDocument()
  })
})

/* === 6 . the counts =================================================== */

describe('the tab counts are totals of disjoint collections, reconcilable by reading', () => {
  it('counts what each tab covers, from the server, and counts nothing twice', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)

    const [timeline, money] = await Promise.all([
      getRiderTimeline(rider.id, { pageSize: 1 }),
      getRiderMoneyMovements(rider.id),
    ])

    /* Activity is the timeline's server `total`; Money is the length of the
       movements list. The two collections are disjoint BY CONTRACT — money is
       deliberately absent from the timeline (`types/rider.ts`) — so nothing is
       counted under both. */
    await waitFor(() =>
      expect(within(dialog).getByRole('tab', { name: /Activity/ })).toHaveTextContent(
        String(timeline.total),
      ),
    )
    expect(within(dialog).getByRole('tab', { name: /Money/ })).toHaveTextContent(
      String(money.movements.length),
    )
    /* Identity is one record, not a list. A `1` on it would count nothing an
       operator can count. */
    expect(
      within(dialog).getByRole('tab', { name: en('profile.section.identity') }),
    ).not.toHaveTextContent(/\d/)
  })

  it('reconciles the badge with the rows by STATING the truncation (§5.4)', async () => {
    /* The badge is a total and the panel shows a page. That is only honest if
       the panel says so, which is the sentence this asserts. */
    const page = await listRiders({ pageSize: 500 })
    let subject: Rider | undefined
    for (const row of page.items) {
      const timeline = await getRiderTimeline(row.id, { pageSize: 6 })
      if (timeline.total > timeline.items.length) {
        subject = row
        break
      }
    }
    expect(subject, 'no rider with a timeline longer than one page').toBeDefined()
    const timeline = await getRiderTimeline(subject!.id, { pageSize: 6 })
    const dialog = await openSheet(subject!.id)

    expect(
      await within(dialog).findByText(
        fill('profile.list.truncated', {
          shown: timeline.items.length,
          total: timeline.total,
        }),
      ),
    ).toBeInTheDocument()
  })
})

/* === 7 . Arabic ======================================================= */

describe('Arabic — the sheet survives `dir="rtl"` and the arrow mirrors', () => {
  it('renders the route with the MIRRORED arrow, from the shared dictionary', async () => {
    const { rider, event } = await riderWithUnassignedOpenTrip()
    document.documentElement.setAttribute('dir', 'rtl')
    document.documentElement.setAttribute('lang', 'ar')
    try {
      render(<Layer entityId={rider.id} translate={ar} language="ar" />)
      const dialog = await screen.findByRole('dialog')
      /* §9.5 — the mirrored glyph is swapped at STRING-construction time, and a
         dictionary entry is where a string is constructed. `Trip.route`'s
         pre-joined `→` could never do this, which is why no surface reads it. */
      const subtitle = riderTimelineStrings(ar, event, 'ar').subtitle!
      const node = await within(dialog).findByText(subtitle)
      expect(node.textContent).toContain('←')
      expect(node.textContent).not.toContain('→')
    } finally {
      document.documentElement.removeAttribute('dir')
      document.documentElement.removeAttribute('lang')
    }
  })

  it('isolates the id and the phone so a Latin run does not read backwards (AC-73)', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)
    /* `<bdi>`, not a `dir` attribute: it isolates without asserting a direction
       the content does not have, and the STRING is unchanged so copy-paste and
       these assertions still see what the formatter returned. */
    expect(within(dialog).getByText(rider.id).tagName).toBe('BDI')
    expect((await within(dialog).findByText(rider.phone)).tagName).toBe('BDI')
  })
})

/* === 8 . the token floor ============================================== */

/* === the drawer's one column ========================================== */

describe('the sheet is ONE column at `--ev-drawer-w`, rail above the tabs', () => {
  it('puts the whole rail before the tab row in DOM order', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)

    /* The four rail blocks and the tab row, read in document order. §6.2's
       one-column rule is *"the rail restacks above the tab row — it is the
       summary, and a summary below its own detail is not a summary"*, and the
       last rail block still has to precede the first tab. */
    const wallet = await within(dialog).findByRole('heading', {
      name: en('profile.section.wallet'),
    })
    const churn = within(dialog).getByRole('heading', { name: en('profile.field.churnRisk') })
    const tabs = within(dialog).getByRole('tablist')

    const follows = Node.DOCUMENT_POSITION_FOLLOWING
    expect(wallet.compareDocumentPosition(churn) & follows).toBeTruthy()
    expect(churn.compareDocumentPosition(tabs) & follows).toBeTruthy()
  })

  it('separates the rail from the panels on the BLOCK axis, which has no side to mirror', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)
    const wallet = await within(dialog).findByRole('heading', {
      name: en('profile.section.wallet'),
    })
    /* The rail's ground: the nearest ancestor that draws the separating edge.
       `border-e` was correct while the rail was a column BESIDE the panels and
       is wrong now — an inline edge between two stacked blocks is a rule down
       one side of the sheet. */
    const ground = wallet.closest('div')!
    expect(ground.className).toContain('border-b')
    expect(ground.className).not.toContain('border-e')
    /* And nothing in the sheet still declares a fractional column width, which
       is what produced a 159px rail inside a 170px content box at 480. */
    const fractions = [...dialog.querySelectorAll<HTMLElement>('*')]
      .flatMap((element) => [...element.classList])
      .filter((name) => /^w-\d+\/\d+$/.test(name))
    expect([...new Set(fractions)]).toEqual([])
  })
})

/* === R5a use #5 — churn risk `high` ==================================== */

describe('churn risk: `high` is red, and only `high`', () => {
  it('paints the level word with the churn token when the level is high', async () => {
    const rider = await riderAtChurn('high')
    const dialog = await openSheet(rider.id)
    await within(dialog).findByRole('heading', { name: en('profile.field.churnRisk') })

    const word = dialog.querySelector<HTMLElement>('[data-churn-risk="high"]')!
    expect(word).not.toBeNull()
    expect(word.textContent).toBe(en('people.churn.high'))
    /* The token's full name, deliberately unshortened: Tailwind generates
       `bg-`, `border-` and `ring-` from one `--color-*`, so the name is what
       keeps the badge out. See `churn.ts`. */
    expect(word.className).toContain('text-churn-high-foreground')
  })

  it('leaves `medium` and `low` in ordinary ink — a red at every level signals nothing', async () => {
    for (const level of ['medium', 'low'] as const) {
      const rider = await riderAtChurn(level)
      const { unmount } = render(<Layer entityId={rider.id} />)
      const dialog = await screen.findByRole('dialog')
      await within(dialog).findByRole('heading', { name: en('profile.field.churnRisk') })

      const word = dialog.querySelector<HTMLElement>(`[data-churn-risk="${level}"]`)!
      expect(word, `no churn word rendered for '${level}'`).not.toBeNull()
      expect(word.className).toContain('text-foreground')
      expect(word.className).not.toContain('churn-high')
      unmount()
    }
  })

  it('is still not a badge, not a control and not focusable — §12.1 stands', async () => {
    const rider = await riderAtChurn('high')
    const dialog = await openSheet(rider.id)
    const label = await within(dialog).findByRole('heading', {
      name: en('profile.field.churnRisk'),
    })
    const block = label.closest('section')!
    const word = block.querySelector<HTMLElement>('[data-churn-risk]')!

    /* The colour was the whole of the ruling. No pill, no plate, no edge, no
       ring, no tab stop, no role. */
    expect(word.tagName).toBe('P')
    expect(within(block).queryByRole('button')).toBeNull()
    expect(word.getAttribute('tabindex')).toBeNull()
    expect(word.className).not.toMatch(/\b(bg-|border|rounded|ring-)/)
  })

  it('keeps §8.2 reason line beside it, in ordinary secondary ink', async () => {
    const rider = await riderAtChurn('high')
    const dialog = await openSheet(rider.id)
    const label = await within(dialog).findByRole('heading', {
      name: en('profile.field.churnRisk'),
    })
    const block = label.closest('section')!
    /* §7.5 — colour is never the only carrier, and the ruling did not suspend
       it: the level is a word, the basis is a sentence, the hue is third. The
       reason line is a sibling of the coloured word and is NOT coloured. */
    const reason = block.querySelector<HTMLElement>('p:not([data-churn-risk])')!
    expect(reason.textContent?.trim().length ?? 0).toBeGreaterThan(0)
    expect(reason.className).toContain('text-muted-foreground')
    expect(reason.className).not.toContain('churn-high')
  })
})

describe('no physical direction utility reaches the DOM', () => {
  it('renders no `ml-`, `pl-`, `left-` or `text-right` anywhere in the sheet', async () => {
    const { rider } = await riderWithUnassignedOpenTrip()
    const dialog = await openSheet(rider.id)
    await within(dialog).findByText(en('profile.field.churnRisk'))

    const classes = [...dialog.querySelectorAll<HTMLElement>('*')].flatMap((element) => [
      ...element.classList,
    ])
    const physical = classes.filter(
      (name) =>
        /^-?(ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r)-/.test(name) ||
        name === 'text-left' ||
        name === 'text-right',
    )
    expect([...new Set(physical)]).toEqual([])
  })
})

/* ------------------------------ stubs --------------------------------- */

function stubLoading<T>(): AsyncResult<T> {
  return {
    status: 'loading',
    data: null,
    error: null,
    isRefreshing: false,
    refetch: () => undefined,
  }
}

function stubContent<T>(data: T): AsyncResult<T> {
  return { status: 'content', data, error: null, isRefreshing: false, refetch: () => undefined }
}

const EMPTY_TIMELINE: Paginated<RiderTimelineEvent> = {
  items: [],
  page: 1,
  pageSize: 6,
  total: 0,
  totalPages: 1,
}

/**
 * A panel with nothing behind it.
 *
 * The money and support envelopes are REAL, read through their clients for a
 * rider who has neither. Hand-writing them would mean this file owning shapes
 * the data layer owns, and the day one grows a field the stub would be the only
 * thing in the product that disagreed with it.
 */
async function emptyReads(riderId: string): Promise<RiderProfileReads> {
  return {
    timeline: {
      status: 'empty',
      data: EMPTY_TIMELINE,
      error: null,
      isRefreshing: false,
      refetch: () => undefined,
    },
    money: stubContent(await getRiderMoneyMovements(riderId)),
    support: stubContent(await getRiderSupportPresence(riderId)),
    subscriptions: {
      status: 'empty',
      data: { items: [], page: 1, pageSize: 1, total: 0, totalPages: 1 },
      error: null,
      isRefreshing: false,
      refetch: () => undefined,
    },
  }
}
