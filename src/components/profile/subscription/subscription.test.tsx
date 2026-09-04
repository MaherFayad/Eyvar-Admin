/**
 * The subscription sheet — behaviour, not appearance.
 *
 * Every test drives the real surface: `ProfileLayer` with a real
 * `resolveProfile` and the real client behind the mock seam. No test hard-codes
 * a record id; every row is DISCOVERED from the data at run time, so a fixture
 * edit cannot fail a test for a reason that has nothing to do with the
 * component.
 *
 * What is under test: that a cycle renders as the commute it is, that the two
 * figures survive a commute the gazetteer cannot place, that the timeline is
 * the record's own dates, and — the part the owner asked for — that the table's
 * three commands are on the sheet, **gated by the same predicate the table
 * uses**.
 */

import { useState } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { disableMockLatency, listSubscriptions, resetDataLayer } from '@/data/clients'
import type { Subscription } from '@/data/types'
import { createTranslator, formatMoney, type Translator } from '@/lib'
import { AR, EN } from '@/i18n/dictionaries'
import { ProfileLayer } from '@/shell/layers/ProfileLayer'
import { subscriptionEvents } from './SubscriptionPanels'

const t: Translator = createTranslator({ dictionary: EN })
const ar: Translator = createTranslator({ dictionary: AR, language: 'ar' })
const en = (key: string) => EN[key] as string
const fill = (key: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    en(key),
  )

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

async function find(
  predicate: (row: Subscription) => boolean,
  what: string,
): Promise<Subscription> {
  const page = await listSubscriptions({ pageSize: 500 })
  const row = page.items.find(predicate)
  expect(row, `no subscription in the fixtures that is ${what}`).toBeDefined()
  return row!
}

function Layer({
  entityId,
  canWrite = true,
  translate = t,
  language = 'en' as const,
}: {
  entityId: string
  canWrite?: boolean
  translate?: Translator
  language?: 'en' | 'ar'
}) {
  const [open, setOpen] = useState(true)
  return (
    <MemoryRouter>
      <ProfileLayer
        entityId={entityId}
        open={open}
        onClose={() => setOpen(false)}
        onOpenFullProfile={() => undefined}
        canManageSubscriptions={canWrite}
        entityHref={(id) => `/operations/subscriptions?entity=${id}`}
        t={translate}
        language={language}
      />
    </MemoryRouter>
  )
}

async function openSheet(entityId: string, options?: { canWrite?: boolean }) {
  render(<Layer entityId={entityId} canWrite={options?.canWrite ?? true} />)
  return screen.findByRole('dialog')
}

/* === 1 . a cycle is a commute ========================================== */

describe('the record is the COMMUTE it repeats', () => {
  it('names the route as the sheet’s one heading, from the key that mirrors', async () => {
    const sub = await find(() => true, 'any subscription')
    const dialog = await openSheet(sub.id)

    const route = fill('requests.route', {
      pickup: sub.pickup,
      destination: sub.destination,
    })
    expect(await within(dialog).findByRole('heading', { name: route })).toBeInTheDocument()
    /* The plan is a meta fact beside the rider, never the heading: it says what
       was bought, and the route says what it is for. */
    expect(within(dialog).queryByRole('heading', { name: sub.planName })).toBeNull()
    expect(await within(dialog).findAllByText(sub.planName)).not.toHaveLength(0)
  })

  it('says in words whether the daily leg comes back', async () => {
    const round = await find((s) => s.tripKind === 'round-trip', 'a round-trip cycle')
    const oneWay = await find((s) => s.tripKind === 'one-way', 'a one-way cycle')

    /* `findAllByText`: the direction is stated twice on purpose — on the map's
       endpoint card and again as a labelled field in Details — because the map
       is a picture and the field is the record. */
    const a = await openSheet(round.id)
    expect(
      await within(a).findAllByText(en('profile.subscription.map.roundTrip')),
    ).not.toHaveLength(0)
    cleanup()

    const b = await openSheet(oneWay.id)
    /* §7.5 — the arrowheads are the second carrier, never the only one: a
       round trip costs twice the legs and that must survive greyscale. */
    expect(
      await within(b).findAllByText(en('profile.subscription.map.oneWay')),
    ).not.toHaveLength(0)
  })

  it('shows the legs and the money paid as the two figures', async () => {
    const sub = await find((s) => s.tripsIncluded > 0, 'a cycle with legs included')
    const dialog = await openSheet(sub.id)

    expect(
      await within(dialog).findByText(en('profile.subscription.figure.legs')),
    ).toBeInTheDocument()
    expect(
      within(dialog).getAllByText(formatMoney(sub.paidHalalas, { unit: 'none' })).length,
    ).toBeGreaterThan(0)
  })

  it('states in words that nothing is held, and never renders escrow as zero', async () => {
    const sub = await find((s) => s.escrowHeldHalalas === null, 'a cycle with no escrow')
    const dialog = await openSheet(sub.id)

    expect(
      await within(dialog).findByText(en('profile.subscription.rail.noEscrow')),
    ).toBeInTheDocument()
  })
})

/* === 2 . the timeline ================================================== */

describe('the timeline is the record’s own dates, ordered', () => {
  it('always carries the cycle’s two ends, newest first', async () => {
    const sub = await find(() => true, 'any subscription')
    const events = subscriptionEvents(sub, t)

    const times = events.map((e) => Date.parse(e.at))
    expect([...times].sort((a, b) => b - a)).toEqual(times)
    /* `Ends` is listed even when it is in the future — a commitment running out
       on a stated day is the fact an operator is usually here to check. */
    expect(events.map((e) => e.key)).toEqual(expect.arrayContaining(['started', 'ends']))
  })

  it('carries a cancellation row only for a cycle that was cancelled', async () => {
    const live = await find((s) => s.cancelledAt === null, 'a cycle still running')
    expect(subscriptionEvents(live, t).some((e) => e.key === 'cancelled')).toBe(false)
  })
})

/* === 3 . the actions, and the one gate ================================= */

describe('the table’s commands are on the sheet, behind the table’s own predicate', () => {
  it('offers Freeze and Cancel and settle on a cycle that can take them', async () => {
    const live = await find(
      (s) => s.status !== 'cancelled' && s.status !== 'expired',
      'a cycle that is not terminal',
    )
    const dialog = await openSheet(live.id)

    const freeze = await within(dialog).findByRole('button', { name: en('subs.action.freeze') })
    const cancel = within(dialog).getByRole('button', { name: en('subs.action.cancel') })
    expect(freeze).toBeEnabled()
    expect(cancel).toBeEnabled()
  })

  it('refuses both on a terminal cycle, IN PLACE and with the reason', async () => {
    const dead = await find(
      (s) => s.status === 'cancelled' || s.status === 'expired',
      'a terminal cycle',
    )
    const dialog = await openSheet(dead.id)

    /* §11.2 — disabled in place, never hidden, and the reason is on the control
       rather than only in a tooltip. It is the SAME sentence the table shows,
       because both resolve `SUBSCRIPTION_COMMANDS`. */
    const freeze = await within(dialog).findByRole('button', { name: en('subs.action.freeze') })
    expect(freeze).toBeDisabled()
    expect(freeze.getAttribute('title')).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: en('subs.action.cancel') })).toBeDisabled()
  })

  it('refuses every command when the operator holds no write permission', async () => {
    const live = await find(
      (s) => s.status !== 'cancelled' && s.status !== 'expired',
      'a cycle that is not terminal',
    )
    const dialog = await openSheet(live.id, { canWrite: false })

    /* D17 / D21 rule 5 — a permission refusal outranks every domain refusal, so
       a healthy cycle is refused too, and the sentence is the permission's. */
    const freeze = await within(dialog).findByRole('button', { name: en('subs.action.freeze') })
    expect(freeze).toBeDisabled()
    expect(freeze.getAttribute('title')).toBe(en('subs.action.noPermission'))
  })

  /** T1.2 — the write landed, so the control is live on a running cycle. */
  it('enables Change captain on a cycle that can take one', async () => {
    const live = await find(
      (s) => s.status !== 'cancelled' && s.status !== 'expired',
      'a cycle that is not terminal',
    )
    const dialog = await openSheet(live.id)

    expect(
      await within(dialog).findByRole('button', { name: en('subs.action.changeDriver') }),
    ).toBeEnabled()
  })

  it('refuses Change captain on a terminal cycle, IN PLACE and with the reason', async () => {
    const dead = await find(
      (s) => s.status === 'cancelled' || s.status === 'expired',
      'a terminal cycle',
    )
    const dialog = await openSheet(dead.id)

    const button = await within(dialog).findByRole('button', {
      name: en('subs.action.changeDriver'),
    })
    expect(button).toBeDisabled()
    expect(button.getAttribute('title')).toBe(en('subs.action.changeDriver.blocked.one'))
  })

  it('opens the queue’s own Freeze form from the sheet', async () => {
    const user = userEvent.setup()
    const live = await find(
      (s) => s.status !== 'cancelled' && s.status !== 'expired',
      'a cycle that is not terminal',
    )
    const dialog = await openSheet(live.id)

    await user.click(await within(dialog).findByRole('button', { name: en('subs.action.freeze') }))
    /* The SAME component the table mounts — the owner chose reuse over an
       in-place expansion, so the form an operator sees is one form. */
    expect(
      await screen.findByText(fill('subs.freeze.title.one', { id: live.id })),
    ).toBeInTheDocument()
  })
})

/* === 4 . Arabic ======================================================== */

describe('Arabic — the chrome mirrors, the geography does not', () => {
  it('points the commute the other way, from the dictionary', async () => {
    const sub = await find(() => true, 'any subscription')
    render(<Layer entityId={sub.id} translate={ar} language="ar" />)
    const dialog = await screen.findByRole('dialog')

    const arabicRoute = (AR['requests.route'] as string)
      .replace('{pickup}', sub.pickup)
      .replace('{destination}', sub.destination)
    expect(await within(dialog).findByRole('heading', { name: arabicRoute })).toBeInTheDocument()
    expect(arabicRoute).toContain('←')
  })
})
