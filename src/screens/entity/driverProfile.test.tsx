/**
 * The captain full-page profile — behaviour, against the rulings the surface was
 * built to.
 *
 * Two of these are the assertions the orchestrator asked for by name, and both
 * are phrased so they would fail if the defect they guard against returned:
 *
 *   **The opening balance is a FIELD, not a constant.** `RiderMovementsTable`
 *   renders `<Money amount={0} />` for its opening row and says so in its own
 *   comment: the rider's read takes no period, so there is nothing before the
 *   first row for a balance to be carried in from — *"the day this read gains a
 *   window the row needs that field rather than this constant."* This page's
 *   read is windowed and returns a real `Ledger`, so the assertion reads
 *   `openingBalanceHalalas` off the envelope and expects that string, which a
 *   hardcoded zero would only pass by coincidence.
 *
 *   **The two ledgers are never combined.** Not *"a net is not shown"* — that
 *   passes on a screen showing no money at all. It computes the net the way
 *   `payCaptain` would and asserts it is **absent** while both addends are
 *   **present**.
 *
 * Nothing here imports a fixture. Every expectation is read from the client, so
 * a fixture edit moves the test's inputs and its expectations together.
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  EYVAR_NOW,
  disableMockLatency,
  getCaptainPayableLedger,
  getDriver,
  getDriverCompliance,
  getDriverMoneyMovements,
  listTrips,
  resetDataLayer,
  resolveProfile,
} from '@/data/clients'
import type { Driver, ProfileRef } from '@/data/types'
import { useAsync, type AsyncResult } from '@/hooks'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AR, EN } from '@/i18n/dictionaries'
import { createTranslator, formatDate, formatMoney, type Translator } from '@/lib'
import {
  driverComplianceHref,
  driverPayoutsHref,
  deviceFields,
  identityFields,
  drivingFigures,
  payoutAccountFields,
  periodFigures,
} from '@/components/profile/driver'
import { INDEX_ROUTE } from './back'
import { DriverProfilePage } from './DriverProfilePage'

const t: Translator = createTranslator({ dictionary: EN, language: 'en' })
const en = (key: string) => EN[key] as string

const AHMED = 'DRV-0101'
const SUSPENDED = 'DRV-0202'
/* **The three ledger empties are all reachable in the seeded data**, which is
   why they are asserted against real captains rather than a stubbed envelope.
   Probed off the client, not off a fixture: `NEVER_EARNED` has
   `lifetimePostings === 0`, and `QUIET_WINDOW` has `lifetimePostings === 2`
   with `totalPostings === 0` — the captain the LR-2 defect was actually on
   screen for. */
const NEVER_EARNED = 'DRV-0203'
const QUIET_WINDOW = 'DRV-0207'
const CAPTAIN_INDEX = INDEX_ROUTE.driver.path

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/* ───────────────────────────── the harness ────────────────────────────── */

/**
 * The page, with the record read wired the way `EntityPageScreen` wires it —
 * `useProfileRecord` narrowed to a `Driver` — so the component under test is
 * the one that ships.
 */
function Page({
  entity,
  backTo = CAPTAIN_INDEX,
  backLabel = 'Back to Captains',
  canOpenCompliance = true,
  canOpenPayouts = true,
}: {
  entity: ProfileRef
  backTo?: string
  backLabel?: string
  canOpenCompliance?: boolean
  canOpenPayouts?: boolean
}) {
  const driver = useAsync<Driver>((signal) => getDriver(entity.entityId, signal), {
    deps: [entity.entityId],
  }) as AsyncResult<Driver>
  return (
    <DriverProfilePage
      entity={entity}
      driver={driver}
      backTo={backTo}
      backLabel={backLabel}
      complianceHref={driverComplianceHref(entity.entityId)}
      payoutsHref={driverPayoutsHref(entity.entityId)}
      canOpenCompliance={canOpenCompliance}
      canOpenPayouts={canOpenPayouts}
      nowIso={EYVAR_NOW}
      t={t}
      language="en"
      dir="ltr"
    />
  )
}

/**
 * The router's address, rendered so a test can read it.
 *
 * **`MemoryRouter` does not touch `window.location`**, so a test that asserted
 * on the global would pass against a tab row backed by local state — which is
 * the one thing D-CP-10 is about. This reads the router's own location, which
 * is what `withView` actually writes to.
 */
function LocationSpy() {
  const location = useLocation()
  return <span data-testid="address">{`${location.pathname}${location.search}`}</span>
}

/**
 * @param view the `?view=` the page is LANDED on, not clicked to.
 *
 * **Landed, deliberately.** D-CP-10's whole claim is that a tab is a location,
 * so a suite that only ever reached a tab by clicking would never exercise the
 * thing being asserted — that an operator can paste, bookmark or be returned to
 * `?view=earnings` and find the ledger there. `undefined` renders the bare
 * `/entity/:id`, which is the default-tab case and is also a real assertion:
 * the default value is the one that is never written.
 */
async function renderPage(
  id = AHMED,
  options: Partial<Parameters<typeof Page>[0]> & { view?: string } = {},
) {
  const { view: landOn, ...pageProps } = options
  const entity = await resolveProfile(id)
  const search = landOn === undefined ? '' : `?view=${landOn}`
  const view = render(
    <MemoryRouter initialEntries={[`/entity/${id}${search}`]}>
      <TooltipProvider>
        <Page entity={entity} {...pageProps} />
        <LocationSpy />
      </TooltipProvider>
    </MemoryRouter>,
  )
  /* The band paints from the ref immediately; everything below waits on a read. */
  await screen.findByText(entity.title)
  return { entity, ...view }
}

/**
 * The nearest box that holds both nodes.
 *
 * Used to assert that a heading and a control **share a row** rather than
 * merely both existing on the page — the difference between a title inside the
 * toolbar and a title above the table, which no text assertion can tell apart
 * because both render the same `h2` with the same words.
 */
function nearestCommonAncestor(a: HTMLElement, b: HTMLElement): HTMLElement {
  let node: HTMLElement | null = a
  while (node !== null && !node.contains(b)) node = node.parentElement
  if (node === null) throw new Error('the two nodes share no ancestor')
  return node
}

/* ═══════════ 1 · the back affordance never dead-ends ════════════════════ */

describe('the back affordance', () => {
  it('is a link to the captain index, not a history step', async () => {
    await renderPage()
    const back = await screen.findByTestId('profile-back')
    /* An `<a href>`, so it works on a pasted URL, in a fresh tab and with
       middle-click. `navigate(-1)` could do none of those. */
    expect(back.tagName).toBe('A')
    expect(back).toHaveAttribute('href', CAPTAIN_INDEX)
  })

  it('names its destination rather than the action', async () => {
    await renderPage()
    const back = await screen.findByTestId('profile-back')
    expect(back).toHaveAccessibleName('Back to Captains')
    expect(back).toHaveTextContent('←')
  })
})

/* ═══════════ 2 · the band ═══════════════════════════════════════════════ */

describe('the band', () => {
  it('provides the page its ONE h1, and it is the name', async () => {
    const { entity } = await renderPage()
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(entity.title)
  })

  /**
   * D-CP-1 — the band is four rows and the fourth is the vehicle.
   *
   * The rows are read off the band block's children rather than found by text,
   * because **the ORDER and the ELEMENT are what the deviation changes**. Both
   * rows render the same words either way, so a text assertion passes against
   * the one flat row this replaces and guards nothing.
   */
  function band(): HTMLElement {
    const block = screen.getByRole('heading', { level: 1 }).parentElement
    if (block === null) throw new Error('the name is not inside a band block')
    return block
  }

  /**
   * The two meta rows, which share one wrapper so they read as one block.
   *
   * Returned as a fixed pair rather than an array: every caller wants both, and
   * a tuple is what lets them be destructured without an index that the
   * compiler has to be told cannot be `undefined`.
   */
  function metaRows(): [person: HTMLElement, vehicle: HTMLElement] {
    const meta = band().children[2]
    if (meta === undefined) throw new Error('the band has no meta block')
    const [person, vehicle] = Array.from(meta.children)
    if (person === undefined || vehicle === undefined) {
      throw new Error('the band’s meta block is not two rows')
    }
    return [person as HTMLElement, vehicle as HTMLElement]
  }

  it('is four rows — eyebrow, name, person, vehicle — AC-CP-01', async () => {
    await renderPage()
    const rows = Array.from(band().children)
    /* Eyebrow row, name, then ONE meta block holding the last two rows: the
       person and the vehicle are one description of one record at two ranks,
       not two more items in the band's stack. */
    expect(rows).toHaveLength(3)
    expect(rows[1]?.tagName).toBe('H1')
    /* Both meta rows are lists — the coordinator's contract, so this band and
       the sheet's cannot reach for two different elements for one row. */
    expect(metaRows().map((row) => row.tagName)).toEqual(['UL', 'UL'])
  })

  it('puts the band’s own rules between the person row’s survivors — AC-CP-02', async () => {
    const driver = await getDriver(AHMED)
    await renderPage()
    const [person] = metaRows()
    const items = person.querySelectorAll('li')
    expect(items.length).toBeGreaterThan(0)
    /* **`n − 1`, computed, not a literal.** AC-CP-02's "exactly four items" is
       stale — the owner moved the tier into `identityFields()` and dropped
       `Driving since`, and the designer is amending the criterion — so this
       asserts the CONSTRUCTION instead of the census: separators go BETWEEN
       survivors and never beside a possibly-absent item, so a row that loses a
       fact loses a rule with it and never leaves an orphan. That property is
       what the deviation is actually built on and it survives the amendment. */
    expect(person.querySelectorAll('.bg-hero-line')).toHaveLength(items.length - 1)
    expect(person.textContent).toContain(driver.city)
    /* The vehicle is not in this row — the whole of D-CP-1. **Scoped to the
       ROW**, never to the document: the vehicle is one line below and a
       page-wide negative would be asserting against copy that is supposed to be
       there. */
    expect(person.textContent).not.toContain(driver.vehicle)
  })

  it('states the vehicle one rank lower, with no rule — AC-CP-03', async () => {
    const driver = await getDriver(AHMED)
    await renderPage()
    const [, vehicle] = metaRows()
    expect(vehicle.textContent).toContain(driver.vehicle)
    /* One rank below the person row, and it is a RANK — `text-xs` on
       `text-hero-label`, both already on the band. No new token. */
    expect(vehicle.className).toContain('text-xs')
    expect(vehicle.className).toContain('text-hero-label')
    /* No 1px rule anywhere in it: the separator is a decorative `·`. */
    expect(vehicle.querySelectorAll('.bg-hero-line')).toHaveLength(0)
    const separators = Array.from(vehicle.querySelectorAll('[aria-hidden="true"]'))
    expect(separators).toHaveLength(1)
    expect(separators[0]?.textContent).toBe('·')
  })

  it('isolates every part of both rows and places nothing by a physical side — AC-CP-05', async () => {
    await renderPage()
    const [person, vehicle] = metaRows()
    /* Every item in both rows is `<bdi>`-isolated, so a Latin model name inside
       an Arabic paragraph cannot be walked backwards (AC-73). Asserted as one
       `<bdi>` PER ITEM rather than as a floor, so an item added without
       isolation fails rather than passing on the count of the others. */
    expect(person.querySelectorAll('bdi')).toHaveLength(person.querySelectorAll('li').length)
    expect(vehicle.querySelectorAll('bdi')).toHaveLength(vehicle.querySelectorAll('li').length)
    /* §9.1 — nothing in the band is placed by a physical side. */
    expect(band().outerHTML).not.toMatch(/\bborder-[lr]\b/)
  })

  /**
   * AC-CP-04's real content, now that facts have genuinely moved.
   *
   * The criterion was written as *"six items in, six items out"* against a
   * split that moved nothing. The owner then took `Tier` and `Driving since`
   * off the row — so the census is void and the claim underneath it is not:
   * **no fact left the record.** `DRIVER_TIER` was rendered in exactly one
   * place in the product, this band's meta row, so if the move had not landed
   * somewhere a captain's tier would have disappeared from the profile
   * entirely. This asserts it landed.
   */
  it('moves the tier out of the band without dropping it from the record', async () => {
    /* Its new home is `identityFields()`, which is the Identity TAB now that the
       rail is gone — so the assertion has to land there to see it. */
    await renderPage(AHMED, { view: 'identity' })
    const tier = screen.getByText(en('profile.field.tier'))
    /* On the page, and NOT in the band. The second half is what makes this a
       test of the move rather than of the field's existence. */
    expect(band().contains(tier)).toBe(false)
  })
})

/* ═══════════ 2b · the summary strip — D-CP-2, the page's half ═══════════ */

/**
 * `people-captain-profile.md` §4.2's invariant, on the surface this page owns.
 *
 * jsdom has no layout, so none of this measures anything — it asserts the
 * declarations the layout comes out of, which is the only honest thing a unit
 * test can claim here. **The 480px overflow sweep (AC-CP-13) and the rendered
 * silhouette belong to visual QA**, and they are the assertions that would
 * actually catch a broken grid.
 */
describe('the summary strip', () => {
  /** The grid, found through a block rather than by a class selector. */
  function strip(): HTMLElement {
    const standing = screen.getByRole('heading', {
      level: 3,
      name: en('profile.driver.block.standing'),
    })
    const grid = standing.closest('div[data-numeric]')
    if (grid === null) throw new Error('the standing block is not inside a strip')
    return grid as HTMLElement
  }

  it('is never a single column — AC-CP-06', async () => {
    await renderPage()
    /* The whole of D-CP-2: `grid-cols-1` was the single-column restack, and its
       absence is the invariant. `wide:grid-cols-4` keeps the four-across case
       the page had at and above `--ev-bp-wide`. */
    expect(strip().className).toContain('grid-cols-2')
    expect(strip().className).not.toMatch(/(^|\s)grid-cols-1(\s|$)/)
    expect(strip().className).toContain('wide:grid-cols-4')
  })

  it('keeps the priority order row-major — AC-CP-07', async () => {
    await renderPage()
    /* Standing, then what will stop them, then what they are owed, then how
       much work they can still be given. A grid's row-major order follows the
       document, so DOM order IS reading order in both directions — which is
       why this assertion is enough and no `dir="rtl"` variant of it exists. */
    const labels = Array.from(strip().querySelectorAll('h3')).map((h) => h.textContent)
    expect(labels).toEqual([
      en('profile.driver.block.standing'),
      en('profile.driver.block.documents'),
      en('profile.driver.block.earnings'),
      en('profile.driver.block.capacity'),
    ])
  })

  it('draws its inline rule with a logical utility — AC-CP-08', async () => {
    await renderPage()
    /* The inline axis is the one that mirrors, so it is the one that must be
       logical: `border-s`, never `border-l` / `border-r`.

       **`border-t` on the second row is deliberate and is reported against
       AC-CP-08's wording.** Tailwind v4 ships `border-s` / `border-e` for the
       inline axis and has no `border-block-start` utility; `globals.css`
       defines no `@utility` for one and is the token steward's file. The block
       axis does not mirror in a horizontal writing mode, so `border-t` and
       `border-block-start` are the same rule — which is why every strip and
       rail already shipped in this product draws the block axis this way. */
    expect(strip().className).toContain('border-s')
    expect(strip().outerHTML).not.toMatch(/\bborder-[lr]\b/)
  })
})

/* ═══════════ 3 · THE LEDGER — a payable, with real boundary figures ═════ */

describe('the payable ledger', () => {
  it('opens with the envelope’s own opening balance, not a constant', async () => {
    const ledger = await getCaptainPayableLedger(AHMED)
    const { container } = await renderPage(AHMED, { view: 'earnings' })

    const opening = await screen.findByText(en('fin.ledger.opening'))
    const row = opening.closest('tr')
    expect(row).not.toBeNull()
    /* The FIELD, read off the envelope. `getCaptainPayableLedger` returns a real
       `Ledger` with `openingBalanceHalalas` computed server-side, so this stays
       correct the day the captain has history before the window — where the
       rider table's hardcoded `0` would silently stop being true. */
    expect(within(row as HTMLElement).getByText(
      formatMoney(ledger.openingBalanceHalalas, { unit: 'none' }),
    )).toBeTruthy()
    expect(container.textContent).toContain(en('fin.ledger.closing'))
  })

  it('closes with ONE field, never a re-sum of the rows on screen', async () => {
    const ledger = await getCaptainPayableLedger(AHMED)
    const closing = (
      await renderPage(AHMED, { view: 'earnings' }),
      await screen.findByText(en('fin.ledger.closing'))
    )
    const row = closing.closest('tr')
    expect(within(row as HTMLElement).getByText(
      formatMoney(ledger.closingBalanceHalalas, { unit: 'none' }),
    )).toBeTruthy()
  })

  it('agrees with the strip’s payable figure', async () => {
    const ledger = await getCaptainPayableLedger(AHMED)
    const money = await getDriverMoneyMovements(AHMED)
    /* §8.3.3 — *"the closing balance MUST equal the balance displayed in the
       card header."* Both are read from `liability.driver` rather than carried
       beside it, so a mismatch is a data-layer failure and not a rounding
       question. They answer different questions — the strip is unwindowed and
       the table is a period — and this asserts they agree for the current
       window, which is every case the product produces today. */
    expect(ledger.closingBalanceHalalas).toBe(money.payableHalalas)
  })

  it('states its window in words, because it is a window', async () => {
    const ledger = await getCaptainPayableLedger(AHMED)
    expect(ledger.periodStart).not.toBeNull()
    const { container } = await renderPage(AHMED, { view: 'earnings' })
    /* §5.4 — a silent window is a silent truncation. */
    expect(container.textContent).toContain(en('entity.driver.ledger.title'))
    expect(container.textContent).toMatch(/1 Jun to 30 Jun 2026/)
  })

  /**
   * AC-308 — on `liability.driver` a credit means Eyvar owes MORE, which is the
   * opposite of a wallet and is not guessable from the column headers.
   *
   * **Asserted as the table's own `<caption>`, not as text somewhere on the
   * page**, which is the designer's ruling and the whole reason the sentence
   * moved off a paragraph: a `<caption>` is announced when a screen reader
   * ENTERS the table, and a paragraph before it is announced before it and is
   * skipped by anyone navigating by table or by heading. `getByText` passes
   * either way, so it guards nothing; the element name is what changed.
   */
  it('states the direction convention as the table’s own caption', async () => {
    await renderPage(AHMED, { view: 'earnings' })
    const table = await screen.findByRole('table')
    const caption = table.querySelector('caption')
    expect(caption).not.toBeNull()
    expect(caption?.textContent).toBe(en('profile.driver.earnings.direction'))
  })

  /**
   * The owner's instruction, asserted structurally rather than by presence.
   *
   * `SectionHeading` and `IndexToolbar` both render an `h2` with the same words,
   * so *"the title exists"* passes either way and guards nothing. What actually
   * changed is which BOX the title is in: it now shares one row with the
   * toolbar's control cluster, which is a claim about a common ancestor.
   *
   * The second half is the reading ORDER the two decisions produce together:
   * the title names the section, the caption defines the columns, and the
   * caption sits between the toolbar and the header row rather than above the
   * title. A `caption-bottom` inherited from `ui/table.tsx` would render the
   * sentence under the rows and pass every text assertion.
   */
  it('puts its title in the table’s own toolbar, above the caption that defines the columns', async () => {
    await renderPage(AHMED, { view: 'earnings' })
    const heading = screen.getByRole('heading', {
      level: 2,
      name: en('entity.driver.ledger.title'),
    })
    const search = screen.getByPlaceholderText(en('entity.driver.ledger.search'))
    const table = await screen.findByRole('table')
    const caption = table.querySelector('caption') as HTMLElement

    /* The toolbar is the nearest box holding BOTH the title and the search
       control. A heading rendered above the table can never satisfy this — its
       nearest common ancestor with the search box is the whole section. */
    const toolbar = nearestCommonAncestor(heading, search)
    expect(toolbar.contains(caption)).toBe(false)

    /* §5.4 — the count and the window are the SUBTITLE, under the title and
       inside the same box, not a note beside it. */
    expect(toolbar.textContent).toMatch(/1 Jun to 30 Jun 2026/)

    /* Toolbar, then caption, then the header row it defines. */
    expect(heading.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const firstHeader = table.querySelector('th') as HTMLElement
    expect(
      caption.compareDocumentPosition(firstHeader) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('offers no selection and no sortable header — AC-48, by type and on screen', async () => {
    await renderPage(AHMED, { view: 'earnings' })
    const table = await screen.findByRole('table')
    expect(within(table).queryAllByRole('checkbox')).toHaveLength(0)
    /* `useIndexTable({ mode: 'ledger' })` returns a `LedgerTable` with no
       `sort`, no `setSortField`, no `selectedIds` and no `toggleRow` at all, so
       this is enforced by `tsc` as well as asserted here. */
    expect(within(table).queryAllByRole('button', { name: /sort/i })).toHaveLength(0)
  })
})

/* ═══════════ 3b · THREE ledger empties, not one — LR-2/LR-4 ═════════════ */

/**
 * The defect these close, stated so the tests cannot be "simplified" back into
 * it: this table declared `firstRun` and no `emptyKind`, so `DataTable`
 * defaulted to `first-run` and **`DRV-0207` — a captain with two lifetime
 * postings and a quiet June — was told "Nothing has been posted yet"**.
 *
 * `types/ledger.ts` documents the trap: `totalPostings === 0` means nothing
 * happened *in the window you asked for*, which a subject with history has
 * every quiet month. `lifetimePostings` is the field that answers *"has this
 * ever happened"*.
 *
 * Each case asserts the two sentences that must NOT appear as well as the one
 * that must. A test that only checked for the right words would pass on a
 * screen showing all three.
 */
describe('the ledger’s three empties', () => {
  it('① a captain who has never earned gets the first-run sentence', async () => {
    const ledger = await getCaptainPayableLedger(NEVER_EARNED)
    expect(ledger.lifetimePostings).toBe(0)
    const { container } = await renderPage(NEVER_EARNED, { view: 'earnings' })

    expect(await screen.findByText(en('entity.driver.ledger.empty.heading'))).toBeTruthy()
    expect(container.textContent).toContain(en('entity.driver.ledger.empty.body'))
    /* §11.1's one honest action — nobody CREATES a posting. */
    expect(screen.getByRole('button', { name: en('entity.driver.ledger.empty.action') })).toBeTruthy()
    /* Neither narrowed sentence: nothing narrowed anything. */
    expect(container.textContent).not.toContain(en('fin.empty.noMatch'))
  })

  it('② a quiet window on a captain WITH history names the window, not a first run', async () => {
    const ledger = await getCaptainPayableLedger(QUIET_WINDOW)
    /* The precondition IS the defect: history, and nothing in this period. */
    expect(ledger.lifetimePostings).toBeGreaterThan(0)
    expect(ledger.totalPostings).toBe(0)
    const { container } = await renderPage(QUIET_WINDOW, { view: 'earnings' })
    /* **Not `findByRole('table')`** — an empty `DataTable` renders the empty
       state INSTEAD of the table in band 4, so waiting for a table here waits
       for something that is correctly absent. */
    /* **`between … and …`, not `in …`.** The key first shipped taking one
       `{period}` fed by the subheading's range formatter, which returns
       `من {start} إلى {end}` — so Arabic read *"no postings during FROM 1 June
       to 30 June"*, one sentence assembled from two translated fragments
       (§9.6 / AC-75). LR-4's wording interpolates two formatted DATES instead,
       which are values rather than fragments, and needs no range formatter at
       all because the sentence is the range. */
    expect(await screen.findByText(/No postings between .*Jun.* and .*Jun/)).toBeTruthy()

    /* **The regression.** This captain has earned twice; telling them nothing
       ever reached them is false. */
    expect(container.textContent).not.toContain(en('entity.driver.ledger.empty.heading'))
    /* And LR-1's other wrong sentence: nothing was filtered, so nothing failed
       to match a filter. */
    expect(container.textContent).not.toContain(en('fin.empty.noMatch'))
    /* What it says instead: the window, named. */
    expect(container.textContent).toMatch(/No postings between .*Jun.* and .*Jun/)
  })

  it('③ a search that narrows to nothing gets the shared filter sentence', async () => {
    const { container } = await renderPage(AHMED, { view: 'earnings' })
    await screen.findByRole('table')
    await userEvent.type(
      screen.getByPlaceholderText(en('entity.driver.ledger.search')),
      'zzzznothingmatchesthis',
    )

    expect(await screen.findByText(en('fin.empty.noMatch'))).toBeTruthy()
    /* Not the first-run sentence — this captain has postings, they are just
       hidden — and not the window sentence, because the WINDOW is not what
       narrowed it. ③ beats ② and that ordering is LR-4's. */
    expect(container.textContent).not.toContain(en('entity.driver.ledger.empty.heading'))
    expect(container.textContent).not.toMatch(/No postings in .*Jun/)
  })

  it('mints no captain-specific spelling of a shared sentence', async () => {
    /* LR-4 deleted `entity.driver.ledger.noMatch`. It read `No postings match
       this search.` beside `fin.empty.noMatch`'s `No postings match these
       filters.` — one sentence under two keys, which is how the captain's
       ledger and the rider's wallet drift. Asserted on the DICTIONARY so it
       cannot come back through a different call site. */
    expect(EN['entity.driver.ledger.noMatch']).toBeUndefined()
    expect(AR['entity.driver.ledger.noMatch']).toBeUndefined()
    expect(EN['fin.empty.noMatch']).toBeTruthy()
    expect(EN['fin.ledger.empty.period']).toBeTruthy()
  })
})

/* ═══════════ 4 · two ledgers, never one number ══════════════════════════ */

describe('the payable and the cash debt', () => {
  it('both render, and the amount a payout would move does not', async () => {
    const money = await getDriverMoneyMovements(AHMED)
    const { container } = await renderPage()
    const text = container.textContent ?? ''

    expect(text).toContain(formatMoney(money.payableHalalas, { unit: 'none' }))
    expect(text).toContain(formatMoney(money.cashDebtHalalas))

    const net = money.payableHalalas - money.cashDebtHalalas
    expect(text).not.toContain(formatMoney(net))
    expect(text).not.toContain(formatMoney(net, { unit: 'none' }))
    expect(text).not.toContain(formatMoney(money.payableHalalas + money.cashDebtHalalas))
  })

  it('states the cash debt exactly once on the page', async () => {
    await renderPage()
    /* It is a fact with ONE home — beneath the balance it is not part of, which
       is where §8.3.4 puts it and where it means something. The `Payout
       account` card deliberately does not repeat it. */
    expect(screen.getAllByText(en('profile.driver.field.cashDebt'))).toHaveLength(1)
  })
})

/* ═══════════ 5 · the banner, in the shell's own slot ════════════════════ */

describe('the standing banner', () => {
  it('is absent for a captain with nothing standing against them', async () => {
    await renderPage()
    expect(screen.queryByText(en('profile.driver.banner.suspended.title'))).toBeNull()
  })

  it('reports a suspension, with its reason, above the content', async () => {
    const driver = await getDriver(SUSPENDED)
    await renderPage(SUSPENDED)
    expect(screen.getByText(en('profile.driver.banner.suspended.title'))).toBeTruthy()
    expect(screen.getByText(new RegExp(driver.suspensionReason as string))).toBeTruthy()
  })

  it('is exactly ONE, even when two conditions hold', async () => {
    await renderPage(SUSPENDED)
    /* §11.4 — zero or one, at the more severe condition. This captain is also
       plan-access terminated, and that banner must not also render. */
    expect(screen.queryByText(en('profile.driver.banner.planTerminated.title'))).toBeNull()
  })
})

/* ═══════════ 6 · the tabs carry the record, and no fact is lost ═════════ */

/**
 * **The rail is gone (D-CP-12) and this is the assertion that it took nothing
 * with it.** AC-CP-04's principle, one level up: *a card may shed facts; the
 * RECORD may not.* Every builder that fed a rail card is asserted on the tab it
 * was ruled onto, so a fact cannot be quietly dropped by the rearrangement.
 *
 * Each loop lands on its own tab rather than scanning the document, because
 * Radix unmounts an inactive panel — a document-wide query would pass on the
 * page's old single scroll and fail to notice a fact that never got a tab.
 */
describe('the tabs carry the record', () => {
  it('has no rail and no side card', async () => {
    const { container } = await renderPage()
    /* `DetailPage`'s grid is what a rail is. Its absence is the deviation. */
    expect(container.querySelector('.grid-cols-detail')).toBeNull()
  })

  it('puts identity and device on the Identity tab', async () => {
    const driver = await getDriver(AHMED)
    await renderPage(AHMED, { view: 'identity' })
    for (const field of identityFields(driver, t, 'en')) {
      expect(screen.getAllByText(field.label).length).toBeGreaterThan(0)
    }
    for (const field of deviceFields(driver, t)) {
      expect(screen.getAllByText(field.label).length).toBeGreaterThan(0)
    }
  })

  it('puts the payout account at the END of the Earnings tab', async () => {
    const driver = await getDriver(AHMED)
    const { container } = await renderPage(AHMED, { view: 'earnings' })
    for (const field of payoutAccountFields(driver, null, t, 'en')) {
      expect(screen.getAllByText(field.label).length).toBeGreaterThan(0)
    }
    /* What you earned -> what moved -> what came off -> where it goes. The
       destination is read while reconciling, so it follows the movements it
       explains rather than preceding them (§4B.7). */
    const text = container.textContent ?? ''
    expect(text.indexOf(en('entity.driver.ledger.title'))).toBeLessThan(
      text.indexOf(en('profile.driver.card.payout')),
    )
    expect(text.indexOf(en('profile.driver.deductions.heading'))).toBeLessThan(
      text.indexOf(en('profile.driver.card.payout')),
    )
  })

  /**
   * **The swap the interim named, asserted at both ends.** D-CP-13 dissolved
   * `performanceFields` into `drivingFigures` and `periodFigures`; the interim
   * held the seven facts on the page as one `FieldList` — the ruled tab, the
   * wrong form — precisely so this assertion could be made after the swap
   * rather than rediscovered. AC-CP-04: a card may shed facts, the record may
   * not.
   */
  it('renders the driving figures on Activity, not a Performance card', async () => {
    const driver = await getDriver(AHMED)
    await renderPage(AHMED, { view: 'activity' })
    for (const figure of drivingFigures(driver, t, 'en')) {
      expect(screen.getAllByText(figure.label).length).toBeGreaterThan(0)
    }
    /* AC-CP-93 — the heading key is deleted and the word renders nowhere. */
    expect(EN['profile.driver.card.performance']).toBeUndefined()
    expect(screen.queryByText('Performance')).toBeNull()
  })

  it('renders the period figures on Earnings, above the movements', async () => {
    const driver = await getDriver(AHMED)
    const { container } = await renderPage(AHMED, { view: 'earnings' })
    for (const figure of periodFigures(driver, null, t, 'en')) {
      expect(screen.getAllByText(figure.label).length).toBeGreaterThan(0)
    }
    const text = container.textContent ?? ''
    expect(text.indexOf(en('profile.field.monthEarnings'))).toBeLessThan(
      text.indexOf(en('entity.driver.ledger.title')),
    )
  })

  it('loses none of the seven facts the Performance card used to state — AC-CP-04', async () => {
    /* The seven, frozen against §4B.6's table rather than read off a builder
       that no longer exists. Five are figures across two tabs, `Last trip` is
       the caption on `Trips completed`, and `Subscription slots` is
       `CapacityBlock` in the strip — which is on every tab, so tiling it again
       would state one fact twice on one screen. */
    const driver = await getDriver(AHMED)
    await renderPage(AHMED, { view: 'activity' })
    const onActivity = document.body.textContent ?? ''
    for (const label of [
      en('profile.field.rating'),
      en('profile.field.onTime'),
      en('profile.driver.field.capacity'),
    ]) {
      expect(onActivity).toContain(label)
    }
    /* **`Trips completed` moved rather than left**, which is the whole of the
       owner's amendment: it is the trips table's `subheading`, where it reads
       as a fact about the CAPTAIN and not as the table's row count. The label
       `Trips completed` is correctly absent — the count is on screen, the
       figure is not, and stating both would be one fact twice on one screen. */
    expect(onActivity).toContain(
      t.plural('entity.driver.trips.count', { count: driver.totalTrips }),
    )
    expect(screen.queryByText(en('profile.field.totalTrips'))).toBeNull()
    /* `Last trip` is retired on the PAGE because the table is newest-first, so
       its first row IS the last trip. The date itself is still on screen, in
       that row. The sheet keeps the caption; `facts.tsx` argues why. */
    await waitFor(() =>
      expect(screen.getByRole('table')).toBeTruthy(),
    )

    cleanup()
    await renderPage(AHMED, { view: 'earnings' })
    const onEarnings = document.body.textContent ?? ''
    for (const label of [
      en('profile.field.monthEarnings'),
      en('profile.driver.field.tripsInPeriod'),
    ]) {
      expect(onEarnings).toContain(label)
    }
  })

  it('puts Elsewhere in the console on the Activity tab', async () => {
    await renderPage(AHMED, { view: 'activity' })
    expect(screen.getByText(en('profile.driver.support.heading'))).toBeTruthy()
  })
})

/* ═══════════ 7 · §11.2 — refused in place, never hidden ════════════════ */

describe('the two navigations', () => {
  /* **One control per tab now**, each at the end of the list it extends: the
     compliance link closes the Documents tab and the payouts link closes the
     Earnings tab. They are asserted on their own tabs because Radix unmounts
     the other panel — which is also why a single render can no longer see
     both, and why that is correct rather than a lost assertion. */
  it('are links with resolved destinations', async () => {
    await renderPage(AHMED, { view: 'documents' })
    expect(
      screen.getByRole('link', { name: en('profile.driver.action.compliance') }),
    ).toHaveAttribute('href', driverComplianceHref(AHMED))

    cleanup()
    await renderPage(AHMED, { view: 'earnings' })
    expect(
      screen.getByRole('link', { name: en('profile.driver.action.payouts') }),
    ).toHaveAttribute('href', driverPayoutsHref(AHMED))
  })

  it('are disabled in place with their reason as text when refused', async () => {
    await renderPage(AHMED, { view: 'documents', canOpenCompliance: false })
    expect(
      screen.getByRole('button', { name: en('profile.driver.action.compliance') }),
    ).toBeDisabled()
    expect(screen.getByText(en('profile.driver.refusal.compliance'))).toBeTruthy()

    cleanup()
    await renderPage(AHMED, { view: 'earnings', canOpenPayouts: false })
    expect(
      screen.getByRole('button', { name: en('profile.driver.action.payouts') }),
    ).toBeDisabled()
    expect(screen.getByText(en('profile.driver.refusal.payouts'))).toBeTruthy()
  })

  it('declares no suspend, reinstate, pay or deduction control', async () => {
    const { container } = await renderPage(SUSPENDED)
    /* All five operations EXIST, and every one of them is declared once
       elsewhere with a §5.3 confirmation §5.5 forbids nesting inside the
       profile modal. Declaring one here would put it on the page and not the
       sheet, which §3 refuses — and would be the second declaration
       `commands/captains.ts` was created to remove. */
    for (const label of ['Suspend', 'Reinstate', 'Pay captain', 'Apply', 'Waive']) {
      expect(within(container).queryByRole('button', { name: label })).toBeNull()
    }
  })
})

/* ═══════════ 8 · Arabic — §9.1, §9.5 ════════════════════════════════════ */

describe('Arabic', () => {
  it('renders the whole page from the Arabic dictionary and mirrors the back glyph', async () => {
    const ar: Translator = createTranslator({
      dictionary: AR,
      fallback: EN,
      language: 'ar',
      fallbackLanguage: 'en',
    })
    const entity = await resolveProfile(AHMED)
    render(
      <MemoryRouter initialEntries={[`/entity/${AHMED}`]}>
        <TooltipProvider>
          <div dir="rtl" lang="ar">
            <ArabicPage entity={entity} t={ar} />
          </div>
        </TooltipProvider>
      </MemoryRouter>,
    )
    await screen.findByText(entity.title)

    /* Every block label resolves in Arabic — `createTranslator` throws on a
       missing key under test, so a gap fails here rather than rendering a raw
       key to an operator (AC-74). */
    expect(await screen.findByText(AR['profile.driver.block.standing'] as string)).toBeTruthy()
    /* `getAllByText`, and the plural IS the assertion. `Earnings` is now the
       strip's block label AND a tab label, and both resolve from the Arabic
       dictionary — `createTranslator` throws on a missing key under test, so a
       tab label with no Arabic value fails here rather than rendering a raw key
       to an operator (AC-74). */
    expect(
      screen.getAllByText(AR['profile.driver.block.earnings'] as string).length,
    ).toBeGreaterThan(1)

    /* §9.5 — the glyph is swapped at STRING-CONSTRUCTION time, never with
       `scaleX(-1)`, so the element's own text is the mirrored character. */
    const back = await screen.findByTestId('profile-back')
    expect(back).toHaveTextContent('→')
  })
})

function ArabicPage({ entity, t: ar }: { entity: ProfileRef; t: Translator }) {
  const driver = useAsync<Driver>((signal) => getDriver(entity.entityId, signal), {
    deps: [entity.entityId],
  }) as AsyncResult<Driver>
  return (
    <DriverProfilePage
      entity={entity}
      driver={driver}
      backTo={CAPTAIN_INDEX}
      backLabel={ar('entity.driver.backTo', { name: ar('view.people.captains') })}
      complianceHref={driverComplianceHref(entity.entityId)}
      payoutsHref={driverPayoutsHref(entity.entityId)}
      canOpenCompliance
      canOpenPayouts
      nowIso={EYVAR_NOW}
      t={ar}
      language="ar"
      dir="rtl"
    />
  )
}

/* ═══════════ 8b · the document viewer, COMPOSED not built ═══════════════ */

/**
 * §6's viewer lives in `components/profile/driver/DriverDocuments.tsx` and both
 * surfaces mount that one component. **These are the page's half of AC-CP-30**
 * — that the page composes the shared accordion rather than reaching for a
 * dialog of its own, which is the divergence §3 exists to refuse and the one
 * failure a test on the sheet alone could never catch.
 *
 * The viewer's own behaviour — the derivation sentence, the file tile, the
 * absence sentence, double-`Escape` — is asserted in that component's suite,
 * where it belongs. Restating it here would be a second contract.
 */
describe('the document viewer, on the page', () => {
  /**
   * The open panel, not a heading.
   *
   * **The Documents tab carries NO `SectionHeading`** — §4B.8: a section that
   * repeats its own tab's name is a line of chrome — so the old lookup by an
   * `h2` named `Documents` has nothing left to find. Radix mounts exactly one
   * `tabpanel`, which is a better scope anyway: it is the thing the tab
   * addresses.
   */
  function documentsSection(): HTMLElement {
    return screen.getByRole('tabpanel')
  }

  function triggers(): HTMLButtonElement[] {
    return Array.from(documentsSection().querySelectorAll('button[aria-expanded]'))
  }

  it('mounts the shared accordion, and no dialog — AC-CP-30, AC-CP-31, AC-CP-32', async () => {
    await renderPage()
    const rows = triggers()
    expect(rows.length).toBeGreaterThan(0)
    /* Each row is ONE button whose accessible name is the document, so the whole
       two-line row is the target rather than a caret beside it (AC-CP-32). */
    for (const row of rows) {
      expect(row.tagName).toBe('BUTTON')
      expect(row.textContent).not.toBe('')
    }

    /* **`aria-controls` appears when the panel does, and that is Radix's
       behaviour rather than a gap.** AC-CP-32 asks for it unconditionally; the
       shipped `Accordion` unmounts a closed panel, and an `aria-controls`
       pointing at an id with no element behind it is itself an a11y defect. So
       the criterion is asserted where it is meaningful — on the open row — and
       AC-CP-32's collapsed-state clause is **reported** rather than worked
       around by forcing the panels to mount. */
    const [first] = rows
    if (first === undefined) throw new Error('the document list rendered no rows')
    await userEvent.click(first)
    const controls = first.getAttribute('aria-controls')
    expect(controls).toBeTruthy()
    expect(document.getElementById(controls as string)).not.toBeNull()
    /* §5.5 — no modal, and on the PAGE for the same reason as in the drawer: a
       viewer that is a dialog here and an accordion there is two mechanisms for
       one job. This is the assertion the sheet's own suite cannot make. */
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens one row at a time, and opening is never gated — AC-CP-33, AC-CP-40', async () => {
    /* **Without `view_operations`.** §6.3 splits the act in two: opening the
       SCAN is gated because it is a photograph of a government identity
       document; expanding the row is not, because it discloses nothing the
       collapsed row did not already show. Gating a disclosure that discloses
       nothing is chrome pretending to be security. */
    await renderPage(AHMED, { canOpenCompliance: false })
    const [first, second] = triggers()
    if (first === undefined || second === undefined) {
      throw new Error('the document list needs at least two rows for this assertion')
    }
    expect(first.disabled).toBe(false)
    expect(second.disabled).toBe(false)

    await userEvent.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('true')

    await userEvent.click(second)
    expect(second.getAttribute('aria-expanded')).toBe('true')
    /* At most one panel open: five expanded rows bury the list they belong to,
       and at 480 there is no room for even two. */
    expect(first.getAttribute('aria-expanded')).toBe('false')
  })
})

/* ═══════════ 9 · the tab row — D-CP-9, D-CP-10 ═════════════ */

/**
 * The tab row IS the amendment. These assert the five things a build of it gets
 * wrong: which tab is the default, that an unknown value falls back without
 * rewriting the URL, that the gates are outside the tabs, that the row is one
 * tab stop, and that a failed record leaves the row operable.
 *
 * Every one lands on its tab rather than clicking to it, because D-CP-10's
 * claim is that a tab is a LOCATION. A suite that only ever reached a tab by
 * clicking would never exercise the thing being asserted.
 */
describe('the tab row', () => {
  function triggerNames(): string[] {
    return screen.getAllByRole('tab').map((tab) => tab.textContent ?? '')
  }

  it('is the sheet\u2019s four, in the sheet\u2019s order', async () => {
    await renderPage()
    /* From the sheet\u2019s own four copy keys. A second grouping would mint eight
       strings for facts that already have names, and would break an operator\u2019s
       position on the documented `Open full profile` round trip.

       **Matched by prefix rather than by equality**, because `Documents` and
       `Activity` now carry a count chip *inside* the trigger and it is part of
       the trigger's text (AC-CP-77). The chip is asserted on its own below;
       this test is about the four labels and their order. */
    const names = triggerNames()
    expect(names).toHaveLength(4)
    const labels = [
      en('profile.driver.tab.documents'),
      en('profile.driver.tab.earnings'),
      en('profile.driver.tab.activity'),
      en('profile.section.identity'),
    ]
    labels.forEach((label, index) => expect(names[index]).toMatch(new RegExp(`^${label}`)))
  })

  /**
   * **AC-CP-77 \u2014 the page shipped with no counts at all**, because the sheet
   * derived them inline and a second derivation here is the drift the criterion
   * forbids. `tabCounts` is the one copy and both surfaces read it.
   *
   * Counts on `Documents` and `Activity` only: `Earnings` holds the payable
   * ledger AND the deduction list and their members overlap, so any single
   * number is a double count; `Identity` is a set of pairs, not records.
   */
  it('carries a count on Documents and on none of the other three', async () => {
    const compliance = await getDriverCompliance(AHMED)
    await renderPage()
    const [documents, earnings, activity, identity] = screen.getAllByRole('tab')

    await waitFor(() =>
      expect(documents?.textContent).toBe(
        `${en('profile.driver.tab.documents')}${compliance.docs.length}`,
      ),
    )
    /* **Activity lost its count with its list.** `counts.activity` is
       `getDriverTimeline`'s server `total`; the owner removed the timeline from
       both surfaces, so a number here would count something no operator can
       see. `tabCounts` still derives it and nothing renders it. */
    expect(activity?.textContent).toBe(en('profile.driver.tab.activity'))
    /* No chip, and no skeleton standing in for one. */
    expect(earnings?.textContent).toBe(en('profile.driver.tab.earnings'))
    expect(identity?.textContent).toBe(en('profile.section.identity'))
  })

  it('lands on Documents when ?view= is absent', async () => {
    await renderPage()
    /* The default, and the value that is never written. D-CP-5\u2019s argument as a
       landing: what is about to stop this captain driving. */
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      en('profile.driver.tab.documents'),
    )
  })

  it('is a LOCATION \u2014 ?view=earnings lands on the ledger with no click', async () => {
    await renderPage(AHMED, { view: 'earnings' })
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      en('profile.driver.tab.earnings'),
    )
    /* The whole claim of D-CP-10: paste the URL, get the tab. */
    expect(await screen.findByRole('table')).toBeTruthy()
  })

  it('writes the tab into the URL when one is chosen, as ?view= and not ?tab=', async () => {
    await renderPage()
    await userEvent.click(
      screen.getByRole('tab', { name: new RegExp(`^${en('profile.driver.tab.activity')}`) }),
    )

    /* **The address is the assertion, not the panel.** A tab row backed by
       local state would switch the panel and leave the URL alone, and every
       panel assertion in this file would still pass. `?view=` is the product's
       one view parameter with one writer (`withView`); a second key meaning the
       same thing would be a synonym. */
    expect(screen.getByTestId('address')).toHaveTextContent(
      `/entity/${AHMED}?view=activity`,
    )
    expect(screen.getByTestId('address').textContent).not.toContain('tab=')
  })

  it('falls back on an unknown ?view= rather than rendering nothing', async () => {
    await renderPage(AHMED, { view: 'not-a-tab' })
    /* `resolveRoute`\u2019s AC-12 posture, reached through `useScreenViews` rather
       than a fallback written here: the page renders `documents` and the URL
       keeps the bad value. A silent rewrite makes a typo untraceable and eats a
       history entry. */
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
      en('profile.driver.tab.documents'),
    )
  })

  it('never hides a gate \u2014 the band, the banner and the strip sit above it', async () => {
    /* D-CP-9, asserted on a SUSPENDED captain from the tab furthest from the
       reason \u2014 because the failure this guards against is exactly "an operator
       reads a suspended captain\u2019s earnings without ever learning they are
       suspended". */
    await renderPage(SUSPENDED, { view: 'earnings' })
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(screen.getByText(en('profile.driver.block.standing'))).toBeTruthy()

    const banner = screen.getByText(en('profile.driver.banner.suspended.title'))
    const firstTab = screen.getAllByRole('tab')[0]
    if (firstTab === undefined) throw new Error('the page rendered no tab row')
    /* Above the row in DOM order, so it is read before any tab is chosen. */
    expect(
      banner.compareDocumentPosition(firstTab) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  /**
   * **What this does NOT assert, and why \u2014 read before "fixing" it.**
   *
   * \u00a74B.10 wants the row to be ONE tab stop (Radix's roving tabindex), and that
   * assertion was written and then removed, because **jsdom cannot decide it.**
   * Measured: under jsdom every trigger renders `tabindex="-1"`, including the
   * selected one \u2014 and it does so for a bare `<Tabs defaultValue>` with two
   * children and no props of ours, so it is the primitive's behaviour under
   * this environment and not this page's usage. Radix sets the tab stop from
   * `currentTabStopId`, which its roving-focus group resolves through real
   * focus events.
   *
   * An assertion that passes only because the environment reports `-1` for
   * everything would be worse than none: it would go green on a row that is
   * genuinely unreachable. **Reported for a real browser** \u2014 and it is the
   * SHEET's row too, since both mount `ui/tabs.tsx`, which is out of bounds for
   * this task either way.
   *
   * What jsdom can decide is asserted instead, and it is the half that carries
   * the semantics: exactly one selected tab, and a panel wired to it.
   */
  it('exposes exactly one selected tab, wired to its panel', async () => {
    await renderPage()
    const selected = screen.getAllByRole('tab').filter(
      (tab) => tab.getAttribute('aria-selected') === 'true',
    )
    expect(selected).toHaveLength(1)

    const trigger = selected[0]
    if (trigger === undefined) throw new Error('no tab is selected')
    const panelId = trigger.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    /* Radix mounts only the active panel, so this is also the assertion that
       the other three are not in the accessibility tree. */
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
    expect(document.getElementById(panelId as string)).not.toBeNull()
  })

  it('stays operable when the RECORD read fails', async () => {
    /* §4B.9\u2019s hardest clause: the tab row is NEVER replaced by an error. An
       operator whose record read failed must still be able to reach another
       tab, so the error goes in the PANEL and the row is untouched. */
    const entity = await resolveProfile(AHMED)
    render(
      <MemoryRouter initialEntries={[`/entity/${AHMED}`]}>
        <TooltipProvider>
          <FailedRecordPage entity={entity} />
        </TooltipProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText(entity.title)).toBeTruthy()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(screen.getByText(en('state.overlayError.message'))).toBeTruthy()
  })
})

/** The page with a record read that has failed and stays failed. */
function FailedRecordPage({ entity }: { entity: ProfileRef }) {
  const failed = {
    data: null,
    status: 'error',
    error: new Error('read failed'),
    refetch: () => undefined,
  } as unknown as AsyncResult<Driver>
  return (
    <DriverProfilePage
      entity={entity}
      driver={failed}
      backTo={CAPTAIN_INDEX}
      backLabel="Back to Captains"
      complianceHref={driverComplianceHref(entity.entityId)}
      payoutsHref={driverPayoutsHref(entity.entityId)}
      canOpenCompliance
      canOpenPayouts
      nowIso={EYVAR_NOW}
      t={t}
      language="en"
      dir="ltr"
    />
  )
}

/* ═══════════ 9 · the trips table — the owner's amendment to D-CP-13 ═════ */

/**
 * **`Trips completed` stops being a figure and becomes a list.**
 *
 * The owner, on the built page: *"trips completed is usually a list"*, and
 * *"make this a table not a record so we can add pagination without it becoming
 * infinite scroll."* So the assertions here are about the three things that
 * makes true: real pages, the count moved into the table's own head rather than
 * deleted, and no second statement of a fact the table already carries.
 */
describe('the trips table', () => {
  it('renders this captain’s trips, headed, with the completed count as its subtitle', async () => {
    const driver = await getDriver(AHMED)
    await renderPage(AHMED, { view: 'activity' })

    const table = await screen.findByRole('table')
    expect(table).toBeTruthy()
    expect(screen.getByRole('heading', { name: en('entity.driver.trips.title') })).toBeTruthy()
    /* **Two CAPTAIN facts, not the table's row count** — `Driver.totalTrips`
       and `Driver.lastTripAt`, the two figures the dissolved Performance card
       stated, worded so neither can be read as the table's own numbers. */
    const subheading = document.body.textContent ?? ''
    expect(subheading).toContain(
      t.plural('entity.driver.trips.count', { count: driver.totalTrips }),
    )
    /* **`Last trip` is kept, and the fixture is why.** The proposal was that a
       newest-first table makes it redundant; on this captain it does not.
       `lastTripAt` is the last trip DRIVEN and the table's first row is the
       newest trip RECORD — a cancellation, started later on the same day. This
       assertion reads both off the client so a fixture edit moves it. */
    const newest = (
      await listTrips({
        driverId: AHMED,
        pageSize: 1,
        /* The table's own order, so the comparison is against the row an
           operator actually sees first. */
        sort: { field: 'startedAt', dir: 'desc' },
      })
    ).items[0]
    expect(newest?.startedAt).not.toBe(driver.lastTripAt)
    /* And it is not merely a different instant — it is a different KIND of
       row: the newest record is a trip that never completed. */
    expect(newest?.status).not.toBe('done')
    expect(subheading).toContain(
      t('profile.driver.figure.lastTrip', {
        date: formatDate(driver.lastTripAt as string, {
          style: 'day-month-time',
          language: 'en',
        }),
      }),
    )
  })

  it('carries no Captain column, because every row is this captain', async () => {
    await renderPage(AHMED, { view: 'activity' })
    await screen.findByRole('table')
    const headers = screen
      .getAllByRole('columnheader')
      .map((cell) => (cell.textContent ?? '').trim())
    /* Substring, because a sortable header carries its sort affordance's text
       alongside the label and a money header carries its unit (§8.3.1). */
    const has = (label: string) => headers.some((header) => header.includes(label))
    expect(has(en('trips.col.id'))).toBe(true)
    expect(has(en('trips.col.rider'))).toBe(true)
    expect(has(en('trips.col.status'))).toBe(true)
    expect(has(en('trips.col.started'))).toBe(true)
    /* One name repeated down the whole page, taking 152px from two columns that
       truncate. Same argument `TripsScreen` makes for dropping `kind` from a
       kind-scoped table. */
    expect(has(en('trips.col.captain'))).toBe(false)
  })

  it('pages rather than scrolling forever, and every row belongs to this captain', async () => {
    await renderPage(AHMED, { view: 'activity' })
    await screen.findByRole('table')
    /* The read is scoped server-side by `driverId`; this asserts the scope
       reached the client rather than trusting the prop. */
    const page = await listTrips({ driverId: AHMED, pageSize: 10 })
    expect(page.items.every((trip) => trip.driverId === AHMED)).toBe(true)
    /* `infiniteScroll={false}` — the owner's instruction, in one prop. A
       sentinel-driven list has no pagination controls to find. */
    if (page.total > 10) {
      expect(
        screen.getByRole('button', { name: en('table.next') }),
      ).toBeTruthy()
    }
  })

  it('states the last trip once, in the first row, and not again above it', async () => {
    const driver = await getDriver(AHMED)
    expect(driver.lastTripAt).not.toBeNull()
    await renderPage(AHMED, { view: 'activity' })
    await screen.findByRole('table')

    /* **Once, in the table's own head — and NOT as a figure.** The count and
       the last trip both left `drivingFigures`; the page states them in the
       subheading and the figure row above carries neither label. */
    const caption = t('profile.driver.figure.lastTrip', {
      date: formatDate(driver.lastTripAt as string, { style: 'day-month-time', language: 'en' }),
    })
    const body = document.body.textContent ?? ''
    expect(body).toContain(caption)
    expect(body.split(caption).length - 1).toBe(1)
    expect(screen.queryByText(en('profile.field.totalTrips'))).toBeNull()
    expect(screen.queryByText(en('profile.field.lastTrip'))).toBeNull()
  })

  it('no longer renders the timeline, on the owner’s instruction', async () => {
    await renderPage(AHMED, { view: 'activity' })
    await screen.findByRole('table')
    /* Removed from the sheet first and then from here, so the two surfaces
       still agree (§3). This asserts the HEADING is absent rather than the
       events: a trip row's text is `Trip completed · {rider}`, and the trips
       table on this same tab legitimately carries the same trips, so an
       assertion on the events would pass or fail for the wrong reason. */
    expect(screen.queryByRole('heading', { name: en('entity.driver.timeline.title') })).toBeNull()
  })

  it('leaves the profile’s address alone — no ?q= and no ?page=', async () => {
    await renderPage(AHMED, { view: 'activity' })
    await screen.findByRole('table')
    /* `urlState: false`. A `?q=` written here would be inherited by whatever
       index the back control returns to — `DriverEarningsTable`'s reasoning,
       and the reason `useIndexTable` defaults a ledger out of the address. */
    const address = screen.getByTestId('address').textContent ?? ''
    expect(address).toBe(`/entity/${AHMED}?view=activity`)
  })

  it('offers no selection and no row actions — this surface commits nothing', async () => {
    await renderPage(AHMED, { view: 'activity' })
    await screen.findByRole('table')
    /* Flagging a trip is `TripsScreen`'s, with its refusal set, its modal and
       its audit line. A second entry point on a profile would be a second
       implementation of a mutation (§3, §6.2). `DataTable` renders the checkbox
       column only where `bulkActions` is non-empty, so there is nothing to
       disable — the column is absent. */
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})
