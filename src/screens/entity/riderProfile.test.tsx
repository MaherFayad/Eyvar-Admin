/**
 * The rider full-page profile — behaviour, against the owner's two amendments
 * and the rulings in `design/people-rider-profile.md`.
 *
 * Two of these are the tests the amendments were asked for by name:
 *
 *   **The back affordance with no history.** It is asserted as an `<a href>`
 *   with a resolved destination, in the CONTENT state and in the NOT-FOUND
 *   state, because a control that dead-ends on a pasted link is the defect and
 *   the 404 is where a naive one dies first.
 *
 *   **The closing balance is one field, not a sum of the rows on screen.** The
 *   assertion is deliberately phrased against the envelope's
 *   `walletBalanceHalalas` rather than against an addition, because a test that
 *   summed the visible rows would pass today and enshrine the wrong rule — the
 *   rider's four movements sign to `+38.00` and their balance is `200.00`.
 *
 * Nothing here imports a fixture. Every expectation is read from the client, so
 * a fixture edit moves the test's inputs and its expectations together.
 */

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getRider,
  getRiderMoneyMovements,
  getRiderSupportPresence,
  resetDataLayer,
  resolveProfile,
} from '@/data/clients'
import { PROFILE_ENTITY_TYPES } from '@/data/types'
import type { ProfileRef, Rider } from '@/data/types'
import { useAsync, type AsyncResult } from '@/hooks'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EN } from '@/i18n/dictionaries'
import { createTranslator, formatMoney, type Translator } from '@/lib'
import { INDEX_ROUTE, useReturnFrom } from './back'
import { RiderProfilePage } from './RiderProfilePage'

const t: Translator = createTranslator({ dictionary: EN, language: 'en' })
const en = (key: string) => EN[key] as string

const RIDER_ID = 'RDR-4002'
const RIDER_INDEX = INDEX_ROUTE.rider.path

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/* ───────────────────────────── the harness ────────────────────────────── */

/**
 * The page, with the record read wired the way `EntityPageScreen` wires it —
 * `useProfileRecord` narrowed to a `Rider` — so the component under test is the
 * one that ships.
 */
function Page({
  entity,
  backTo = RIDER_INDEX,
  backLabel = 'Back to Riders',
  canOpenDispatch = true,
}: {
  entity: ProfileRef
  backTo?: string
  backLabel?: string
  canOpenDispatch?: boolean
}) {
  const rider = useAsync<Rider>((signal) => getRider(entity.entityId, signal), {
    deps: [entity.entityId],
  }) as AsyncResult<Rider>
  return (
    <RiderProfilePage
      entity={entity}
      rider={rider}
      backTo={backTo}
      backLabel={backLabel}
      canOpenDispatch={canOpenDispatch}
      t={t}
      language="en"
      dir="ltr"
    />
  )
}

async function renderPage(options: Partial<Parameters<typeof Page>[0]> = {}) {
  const entity = await resolveProfile(RIDER_ID)
  render(
    <MemoryRouter initialEntries={[`/entity/${RIDER_ID}`]}>
      <TooltipProvider>
        <Page entity={entity} {...options} />
      </TooltipProvider>
    </MemoryRouter>,
  )
  /* The band paints from the ref immediately; everything below waits on a read. */
  await screen.findByText(entity.title)
  return entity
}

/* ═══════════ 1 · owner amendment 1 — the back affordance ═══════════════ */

describe('the back affordance never dead-ends', () => {
  it('is a link to a real destination, not a history step', async () => {
    await renderPage()
    const back = await screen.findByTestId('profile-back')
    /* An `<a href>`, so it works on a pasted URL, in a fresh tab, and with
       middle-click. `navigate(-1)` could do none of those. */
    expect(back.tagName).toBe('A')
    expect(back).toHaveAttribute('href', RIDER_INDEX)
  })

  it('names its destination rather than the action', async () => {
    await renderPage()
    const back = await screen.findByTestId('profile-back')
    expect(back).toHaveAccessibleName('Back to Riders')
    /* Icon-only: the glyph is decoration, and the name is the whole label. */
    expect(back).toHaveTextContent('←')
  })

  it('resolves to the record index when the navigation carried no state — the pasted-link case', () => {
    /* `useReturnFrom` is the half that reads the address. With a plain entry —
       a pasted URL, a fresh tab, a reload — there is no `state.from`, so the
       page falls to `INDEX_ROUTE`, which is total and cannot be missing. */
    let from: string | null = 'unset'
    function Probe() {
      from = useReturnFrom()
      return null
    }
    render(
      <MemoryRouter initialEntries={[`/entity/${RIDER_ID}`]}>
        <Probe />
      </MemoryRouter>,
    )
    expect(from).toBeNull()
    expect(INDEX_ROUTE.rider.path).toBe('/operations/people?view=riders')
  })

  it('returns to where the sheet was open over, when one was carried', () => {
    let from: string | null = null
    function Probe() {
      from = useReturnFrom()
      return null
    }
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: `/entity/${RIDER_ID}`, state: { from: '/support/tickets?entity=RDR-4002' } },
        ]}
      >
        <Probe />
      </MemoryRouter>,
    )
    expect(from).toBe('/support/tickets?entity=RDR-4002')
  })

  it('discards a `from` that is not an in-app path', () => {
    let from: string | null = 'unset'
    function Probe() {
      from = useReturnFrom()
      return null
    }
    render(
      <MemoryRouter
        initialEntries={[{ pathname: `/entity/${RIDER_ID}`, state: { from: 'https://example.com' } }]}
      >
        <Probe />
      </MemoryRouter>,
    )
    expect(from).toBeNull()
  })

  it('has a destination for every entity type the route serves', () => {
    /* Total over the closed union — a twelfth kind without a destination does
       not compile, and this asserts the eleven that exist all resolve. */
    for (const kind of PROFILE_ENTITY_TYPES) {
      const route = INDEX_ROUTE[kind]
      expect(route.path.startsWith('/')).toBe(true)
      expect(EN[route.labelKey]).toBeDefined()
    }
  })
})

/* ═══════════ 2 · owner amendment 2 — the movements table ══════════════ */

describe('the movements table is the product DataTable in ledger mode', () => {
  it('renders both boundary rows, and the closing figure is the envelope field', async () => {
    const movements = await getRiderMoneyMovements(RIDER_ID)
    await renderPage()

    const closing = await screen.findByText(en('fin.ledger.closing'))
    const row = closing.closest('tr')
    expect(row).not.toBeNull()
    /* **One field, not an addition.** The four movements sign to +38.00 and the
       balance is 200.00, because two of them are card money that never touched
       the wallet. A test that summed the rows would pass today and enshrine the
       wrong rule. */
    expect(within(row as HTMLElement).getByText(
      formatMoney(movements.walletBalanceHalalas, { unit: 'none' }),
    )).toBeInTheDocument()

    /* §9.2 / AC-49 — a ledger OPENS with a labelled opening balance. The
       reference draws one row; the contract is a pair. */
    expect(screen.getByText(en('fin.ledger.opening'))).toBeInTheDocument()
  })

  it('holds only the rows that move the balance those two figures frame', async () => {
    const movements = await getRiderMoneyMovements(RIDER_ID)
    const inBalance = movements.movements.filter((m) => m.inWalletBalance)
    expect(inBalance.length).toBeLessThan(movements.movements.length)

    await renderPage()
    /* The heading's count is the rows in the table, not the rider's movements —
       a table framed by two balances may only contain the rows that move it. */
    const heading = await screen.findByText(en('entity.rider.movements.title'))
    const band = heading.closest('section')
    expect(
      within(band as HTMLElement).getByText(
        t.plural('entity.rider.movements.count', { count: inBalance.length }),
      ),
    ).toBeInTheDocument()
  })

  it('offers no selection and no sortable header — AC-48, by type and on screen', async () => {
    await renderPage()
    await screen.findByText(en('fin.ledger.closing'))
    /* A ledger has no `selectedIds` and no `toggleRow` to bind a checkbox to,
       so none can render. Asserted on the DOM as well as by the compiler. */
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: en('table.sort') })).toBeNull()
  })

  it('states its columns once, with the unit in the header and not in a cell', async () => {
    await renderPage()
    /* **Scoped to the band, because the page now carries TWO money tables** and
       three of their headers are deliberately the same key: `Date`,
       `Reference` and `Description` are `fin.ledger.col.*` on the wallet ledger
       and on the payments table both, so that two tables stacked on one page do
       not spell one column two ways. An unscoped `findByText` therefore matches
       twice, which is the parity working rather than a duplicate. */
    const heading = await screen.findByText(en('entity.rider.movements.title'))
    const band = heading.closest('section') as HTMLElement
    for (const key of [
      'fin.ledger.col.date',
      'fin.ledger.col.reference',
      'fin.ledger.col.description',
      'fin.ledger.col.debit',
      'fin.ledger.col.credit',
      'fin.ledger.col.balance',
    ]) {
      expect(within(band).getByText(en(key))).toBeInTheDocument()
    }
  })
})

/* ═══════════ 3 · the card money, stated where it is true ═══════════════ */

describe('money captured and not settled is its own group, not a line under the balance', () => {
  it('says `under review` over the payments group and nothing under the wallet figure', async () => {
    const movements = await getRiderMoneyMovements(RIDER_ID)
    await renderPage()

    const heading = await screen.findByText(en('profile.section.payments'))
    const group = heading.closest('section')
    expect(
      within(group as HTMLElement).getByText(
        `${t.plural('entity.rider.payments.count', {
          count: movements.movements.filter((m) => !m.inWalletBalance).length,
        })} · ${t('entity.rider.payments.underReview', {
          amount: formatMoney(movements.heldHalalas),
        })}`,
      ),
    ).toBeInTheDocument()

    /* `held` under a wallet balance reads as *held out of your balance*, and
       none of this rider's 200.00 is held. The word must not appear beside the
       strip's wallet figure. */
    const inWallet = screen.getByText(en('entity.rider.money.inWallet'))
    const moneyCell = inWallet.closest('section')
    expect(within(moneyCell as HTMLElement).queryByText(/held/i)).toBeNull()
  })

  /**
   * **The payments group is a TABLE that pages** — owner instruction. It was a
   * `<ul>`, which has one length behaviour: all of them.
   */
  it('renders the payments group as a DataTable with manual paging, not an infinite list', async () => {
    await renderPage()
    const heading = await screen.findByText(en('profile.section.payments'))
    const group = heading.closest('section') as HTMLElement

    expect(within(group).getByRole('table')).toBeInTheDocument()
    /* `infiniteScroll={false}` is the whole mechanism: band 5 renders the two
       controls instead of the `scrollMore` hint. Both are present and the first
       page disables `Previous`, which is what says the paging is real rather
       than decorative. */
    const previous = within(group).getByRole('button', { name: en('table.previous') })
    expect(previous).toBeDisabled()
    expect(within(group).getByRole('button', { name: en('table.next') })).toBeInTheDocument()
    expect(within(group).queryByText(en('table.scrollMore'))).toBeNull()
  })

  it('carries NO opening or closing balance row — a payments list totals nothing', async () => {
    await renderPage()
    const heading = await screen.findByText(en('profile.section.payments'))
    const group = heading.closest('section') as HTMLElement
    /* `ledgerBoundaryRows` is the wallet ledger's and only the wallet ledger's.
       Both labels exist ON THIS PAGE — the ledger above draws them — so the
       assertion has to be scoped to this group to mean anything. */
    expect(within(group).queryByText(en('fin.ledger.opening'))).toBeNull()
    expect(within(group).queryByText(en('fin.ledger.closing'))).toBeNull()
  })

  it('keeps the row: the PAY- reference as a link, the state badge, the date and the amount', async () => {
    const movements = await getRiderMoneyMovements(RIDER_ID)
    const payments = movements.movements.filter((row) => !row.inWalletBalance)
    expect(payments.length).toBeGreaterThan(0)
    await renderPage()
    const heading = await screen.findByText(en('profile.section.payments'))
    const group = heading.closest('section') as HTMLElement

    for (const payment of payments) {
      const reference = payment.paymentId ?? payment.id
      const link = within(group).getByRole('link', { name: reference })
      /* `?entity=` opens the 360° layer OVER this page rather than replacing
         it, so the operator does not lose the profile to read one payment. */
      expect(link).toHaveAttribute('href', expect.stringContaining(`entity=${reference}`))
      expect(within(group).getByText(en(`fin.settlement.${payment.state}`))).toBeInTheDocument()
      expect(
        within(group).getAllByText(formatMoney(payment.amountHalalas, { unit: 'none' })).length,
      ).toBeGreaterThan(0)
    }
  })

  it('offers no selection in the payments table — no bulk action, so no checkbox (AC-48)', async () => {
    await renderPage()
    const heading = await screen.findByText(en('profile.section.payments'))
    const group = heading.closest('section') as HTMLElement
    /* `mode: 'ledger'` makes this a compile error as well as a DOM assertion:
       `LedgerTable` has no `selectedIds` and no `toggleRow` to bind to. */
    expect(within(group).queryAllByRole('checkbox')).toHaveLength(0)
  })
})

/* ═══════════ 4 · the strip, and the rulings inside it ═════════════════ */

describe('the summary strip', () => {
  it('prints the wallet balance the ledger closes on', async () => {
    const rider = await getRider(RIDER_ID)
    await renderPage()
    const inWallet = await screen.findByText(en('entity.rider.money.inWallet'))
    const cell = inWallet.closest('section') as HTMLElement
    expect(
      within(cell).getByText(formatMoney(rider.walletBalanceHalalas, { unit: 'none' })),
    ).toBeInTheDocument()
  })

  it('labels the third cell `Plan` and states the cycle in the past tense when it has ended', async () => {
    await renderPage()
    expect(await screen.findByText(en('profile.rider.rail.plan'))).toBeInTheDocument()
    expect(await screen.findByText(en('profile.subStatus.expired'))).toBeInTheDocument()
  })

  it('renders churn risk as a fact, not a control and not a badge', async () => {
    const rider = await getRider(RIDER_ID)
    await renderPage()
    const label = await screen.findByText(en('profile.field.churnRisk'))
    /* §8 slot 3 / §12.1 — it is a prediction, so it wears no status chrome: no
       button, no link, nothing in the tab order. **The owner's ruling coloured
       it and changed nothing else**, so this assertion is unamended. */
    expect(label.closest('button')).toBeNull()
    expect(label.closest('a')).toBeNull()
    /* §8.2 — a computed level owes its derivation, and the reason is mandatory. */
    expect(rider.churnReason).not.toBeNull()
    expect(
      await screen.findByText(en(rider.churnReason?.key ?? '')),
    ).toBeInTheDocument()
  })

  /**
   * **R5a use #5, on the second of its two surfaces.**
   *
   * The sheet's copy of this is in `components/profile/rider/rider.test.tsx`.
   * Both read `churnLevelInk` from the one module, which is what makes the
   * pair a parity assertion rather than two independent coincidences: the page
   * cannot colour a level the sheet does not.
   */
  it('paints a HIGH churn level with the churn token, and wears no plate for it', async () => {
    const rider = await getRider(RIDER_ID)
    expect(rider.churnRisk, 'the pinned record is the high-churn one').toBe('high')
    await renderPage()
    await screen.findByText(en('profile.field.churnRisk'))

    const word = document.querySelector<HTMLElement>('[data-churn-risk="high"]')!
    expect(word).not.toBeNull()
    expect(word.textContent).toBe(en('people.churn.high'))
    expect(word.className).toContain('text-churn-high-foreground')
    /* Ink only. Tailwind mints `bg-`/`border-`/`ring-` from the same slot, so
       the assertion is against the plate rather than against the name. */
    expect(word.className).not.toMatch(/\b(bg-|border|rounded|ring-)/)
    expect(word.getAttribute('tabindex')).toBeNull()
  })
})

/* ═══════════ 5 · the open trip ════════════════════════════════════════ */

describe('the open-trip card', () => {
  it('renders the newest open trip and offers the one filled control', async () => {
    await renderPage()
    expect(await screen.findByText(en('profile.rider.activity.open'))).toBeInTheDocument()
    const assign = await screen.findByRole('link', {
      name: en('profile.rider.action.assign'),
    })
    /* It NAVIGATES. There is no client operation that assigns a captain to a
       trip, so the control opens where the work is done rather than faking it. */
    expect(assign).toHaveAttribute('href', expect.stringContaining('/operations/dispatch?trip='))
  })

  it('refuses in place, with its reason as real text, when dispatch is closed to this operator', async () => {
    await renderPage({ canOpenDispatch: false })
    const button = await screen.findByRole('button', {
      name: en('profile.rider.action.assign'),
    })
    expect(button).toBeDisabled()
    /* §11.2 — the reason is rendered text bound by `aria-describedby`, never a
       tooltip and never discovered by clicking. */
    expect(button).toHaveAccessibleDescription(en('entity.rider.refusal.assignPermission'))
  })
})

/* ═══════════ 6 · the side column's absences ═══════════════════════════ */

describe('absent identity fields', () => {
  it('are named once as a group, with no em dash', async () => {
    await renderPage()
    const line = await screen.findByText(en('profile.field.absentMany'))
    const group = line.closest('p') as HTMLElement
    for (const key of ['profile.field.rating', 'profile.field.renewalRate', 'profile.field.lastTrip']) {
      expect(within(group).getByText(en(key))).toBeInTheDocument()
    }
    /* §8.3.1 — the em dash is reserved for not-applicable; an absent value says
       so in words, and the group heading says it once for all three. */
    expect(group.textContent).not.toContain('—')
  })
})

/* ═══════════ 7 · Arabic ═══════════════════════════════════════════════ */

describe('under dir="rtl"', () => {
  it('mirrors the two directional glyphs at construction time and nothing else', async () => {
    const entity = await resolveProfile(RIDER_ID)
    const { container } = render(
      <MemoryRouter initialEntries={[`/entity/${RIDER_ID}`]}>
        <TooltipProvider>
          <div dir="rtl">
            <RiderProfilePage
              entity={entity}
              rider={
                {
                  status: 'loading',
                  data: null,
                  error: null,
                  isRefreshing: false,
                  refetch: () => undefined,
                } as AsyncResult<Rider>
              }
              backTo={RIDER_INDEX}
              backLabel="العودة إلى الركاب"
              canOpenDispatch
              t={t}
              language="ar"
              dir="rtl"
            />
          </div>
        </TooltipProvider>
      </MemoryRouter>,
    )

    /* §9.5 / AC-RP-15 — the BACK arrow is swapped in the string. There is no
       `scaleX(-1)` and no `rotate` anywhere on the page to do it with. */
    const back = await screen.findByTestId('profile-back')
    expect(back).toHaveTextContent('→')
    expect(back).not.toHaveTextContent('←')
    expect(container.innerHTML).not.toContain('scaleX(-1)')

    /* AC-RP-86 — no physical-direction utility survives in the rendered tree.
       The dividers, the dots and the meter are all logical. */
    expect(container.innerHTML).not.toMatch(/class="[^"]*\b(ml|mr|pl|pr|border-l|border-r)-/)
  })
})

/* ═══════════ 8 · the support presence block ═══════════════════════════ */

describe('every support record that references this rider', () => {
  it('renders presence per resource, with the three states kept apart', async () => {
    const presence = await getRiderSupportPresence(RIDER_ID)
    await renderPage()

    const heading = await screen.findByText(en('profile.rider.support.heading'))
    /* The CARD, not the title slot inside it — `closest('[data-slot]')` finds
       the heading's own wrapper first. */
    const card = heading.closest('[data-slot="card"]') as HTMLElement
    expect(card).not.toBeNull()

    /* `total: 0` and `open: 0` on a resource with history are DIFFERENT facts,
       and the envelope carries both so a surface cannot flatten them. Tickets
       is the one genuinely empty resource on this record. */
    expect(presence.tickets.total).toBe(0)
    expect(within(card as HTMLElement).getByText(en('profile.rider.support.none'))).toBeInTheDocument()

    /* And a resource that does have records states both numbers. */
    expect(presence.complaints.total).toBeGreaterThan(0)
    expect(
      within(card as HTMLElement).getAllByText(
        t('profile.rider.support.some', {
          total: String(presence.complaints.total),
          open: String(presence.complaints.open),
        }),
      ).length,
    ).toBeGreaterThan(0)
  })

  it('states no composed absence sentence anywhere on the page', async () => {
    await renderPage()
    await screen.findByText(en('profile.rider.support.heading'))
    /* X-7 / §9.6 — the reference's `No support tickets reference this record.
       No device recorded.` is deleted, not made conditional: a conditional
       concatenation is still a concatenation, and it was false for a record
       that carries a device. */
    expect(screen.queryByText(/No device recorded/i)).toBeNull()
    expect(screen.queryByText(/No support tickets reference this record/i)).toBeNull()
    /* The device IS on file, so its facts render. `getAllBy`, because `Device`
       is both the card's title and the field's label. */
    expect((await screen.findAllByText(en('profile.field.device'))).length).toBeGreaterThan(0)
  })
})
