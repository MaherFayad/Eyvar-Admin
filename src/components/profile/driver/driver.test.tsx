/**
 * The captain profile sheet — behaviour, against the rulings the surface was
 * built to.
 *
 * Three of these exist because they are the assertions most likely to go wrong
 * quietly, and each is phrased so that it would fail rather than pass if the
 * defect it guards against were reintroduced:
 *
 *   **The two ledgers are never combined.** The assertion is not *"a net is not
 *   shown"* — that would pass on a screen that showed no money at all. It reads
 *   the two balances from the client, computes the net the way `payCaptain`
 *   would, and asserts that string is **absent from the rendered surface** while
 *   both of its addends are present.
 *
 *   **A 404 on the compliance file is an answer, not a failure.** A captain with
 *   no documents must read `No file`, never `Couldn't load Documents.` — the two
 *   are indistinguishable to an operator and only one of them is true.
 *
 *   **A count never renders before its read returns.** Asserted on the loading
 *   frame, because `0` before an answer and `0` as an answer are the same pixels.
 *
 * Nothing here imports a fixture. Every expectation is read from the client, so
 * a fixture edit moves the test's inputs and its expectations together.
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import {
  EYVAR_NOW,
  disableMockLatency,
  getDriver,
  getDriverMoneyMovements,
  getDriverCompliance,
  getDriverTimeline,
  listCaptainPayouts,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import * as driversClient from '@/data/clients/drivers'
import { ApiError, type CaptainPayout, type Driver } from '@/data/types'
import { useAsync, type AsyncResult } from '@/hooks'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EN } from '@/i18n/dictionaries'
import { createTranslator, formatDate, formatMoney, type Translator } from '@/lib'
import { DOC_STATE_LABEL } from '../domain'
import { DriverProfile } from './DriverProfile'
import { driverComplianceHref, driverPayoutsHref } from './hrefs'
import { DRIVER_LIST_ROWS, useDriverReads } from './reads'
import {
  FigureGrid,
  bandPersonMeta,
  bandVehicleMeta,
  RatingStars,
  daysUntil,
  documentRows,
  drivingFigures,
  tripFigures,
  identityFields,
  periodFigures,
  soonestDocument,
  standingBanner,
  standingFlags,
  tabCounts,
  TabCount,
  DOC_STATE_WHY,
} from './facts'

const t: Translator = createTranslator({ dictionary: EN, language: 'en' })
const en = (key: string) => EN[key] as string

/** The reference captain: under review, one open complaint, a file, money on both ledgers. */
const AHMED = 'DRV-0101'
/** Suspended, plan access terminated, manually flagged, two complaints, negative payable. */
const SUSPENDED = 'DRV-0202'
/** Pending, no compliance file at all, no rating, no on-time history, no email. */
const NO_FILE = 'DRV-0205'
/** Plan access frozen with a date — the third and least severe banner. */
const FROZEN = 'DRV-0207'
/** The one bank account still being verified, on a captain who also has no file. */
const BANK_PENDING = NO_FILE
/** The one REJECTED bank account. A different operational fact from the above. */
const BANK_REJECTED = 'DRV-0204'

/** The payout POSITION, the way both surfaces read it: the first row, or `null`. */
async function payoutOf(driverId: string): Promise<CaptainPayout | null> {
  const page = await listCaptainPayouts({
    filters: [{ field: 'captainId', op: 'eq', value: driverId }],
    pageSize: 1,
  })
  return page.items[0] ?? null
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/* Every spy in this file is on `@/data/clients/drivers`' own namespace, which
   the barrel re-exports with a live binding. Restoring after each test keeps
   one test's stub out of the next one's read. */
afterEach(() => {
  vi.restoreAllMocks()
})

/* ───────────────────────────── the harness ────────────────────────────── */

function Sheet({
  driverId,
  canOpenCompliance = true,
  canOpenPayouts = true,
}: {
  driverId: string
  canOpenCompliance?: boolean
  canOpenPayouts?: boolean
}) {
  const record = useAsync<Driver>((signal) => getDriver(driverId, signal), {
    deps: [driverId],
  }) as AsyncResult<Driver>
  const reads = useDriverReads(driverId)
  if (record.data === null) return null
  return (
    <DriverProfile
      driver={record.data}
      reads={reads}
      /* The clock is PASSED, never read. `EYVAR_NOW` is what every fixture was
         written against; the host clock would render every document expired. */
      nowIso={EYVAR_NOW}
      complianceHref={driverComplianceHref(driverId)}
      payoutsHref={driverPayoutsHref(driverId)}
      canOpenCompliance={canOpenCompliance}
      canOpenPayouts={canOpenPayouts}
      t={t}
      language="en"
    />
  )
}

async function renderSheet(options: Parameters<typeof Sheet>[0]) {
  const view = render(
    <MemoryRouter>
      <TooltipProvider>
        <Sheet {...options} />
      </TooltipProvider>
    </MemoryRouter>,
  )
  await screen.findByText(en('profile.driver.block.standing'))
  return view
}

/* ═══════════ 1 · the band leads with what a captain IS ═══════════════════ */

describe('the band states a captain rather than a person', () => {
  it('describes the vehicle on its own row, verbatim, with its class beside it', async () => {
    const driver = await getDriver(AHMED)
    const vehicle = bandVehicleMeta(driver, t)

    /* D-CP-1 — a captain record is a person AND a vehicle. `Driver.vehicle` is
       one display field in legacy and is carried verbatim; the `·` inside
       `Corolla 2022 · White` is the data's, not the layer's, so the row is TWO
       items and never four. */
    expect(vehicle).toEqual([driver.vehicle, en('people.class.economy')])
  })

  it('keeps the vehicle off the person row and the phone off both', async () => {
    const driver = await getDriver(AHMED)
    const person = bandPersonMeta(driver, t, 'en')
    /* `clients/profile.ts` builds a captain's `ProfileRef.subtitle` from
       `driver.vehicle` and a rider's from the phone. The band follows the data
       layer's own reading of what identifies each, and the phone is a contact
       detail that lives in Identity. */
    expect(person).toContain(driver.city)
    expect(person).not.toContain(driver.phone)
    expect(person).not.toContain(driver.vehicle)
  })

  it('renders the rating as a shape whose VALUE is a word, never five glyphs alone', async () => {
    const driver = await getDriver(AHMED)
    expect(driver.rating).not.toBeNull()
    /* Mounted directly rather than through the sheet: the band is
       `DriverBand`, which `ShellLayer` renders as the layer's `banner` and
       `DriverProfile` therefore does not contain. The component IS the shared
       implementation — both bands call `bandPersonMeta`, which calls this — so
       this is the one place the treatment exists. */
    render(<RatingStars rating={driver.rating!} t={t} language="en" />)
    /* §7.5 — the glyphs are `aria-hidden` in full and ONE visually-hidden
       sentence carries the number, so a screen reader hears `Rated 4.9` rather
       than five identical star names or `4.9 Rated 4.9`. */
    const value = screen.getByText(
      t('profile.driver.meta.rating', { rating: driver.rating!.toFixed(1) }),
    )
    expect(value.className).toContain('sr-only')
    /* Five glyphs, all of them inside an `aria-hidden` wrapper — so the
       accessible tree carries the number once and the shape never. */
    expect(document.querySelectorAll('[aria-hidden="true"] svg').length).toBe(5)
    /* And the visible figure is hidden from the accessible tree too: it and the
       sentence are the same fact, and announcing both reads as `4.9 Rated 4.9`. */
    expect(screen.getByText(driver.rating!.toFixed(1)).getAttribute('aria-hidden')).toBe('true')
  })

  it('says a captain is not yet rated rather than drawing them zero stars', async () => {
    const unrated = await getDriver(NO_FILE)
    expect(unrated.rating).toBeNull()
    /* R4-11 — legacy's `0` meant *no rating yet*, the data layer already
       normalised it to `null`, and five empty stars is a review score nobody
       gave. The null branch stays a plain string. */
    expect(bandPersonMeta(unrated, t, 'en')).toContain(en('profile.driver.meta.noRating'))
  })

  it('moves the tier and the joining date off the band without losing either', async () => {
    const driver = await getDriver(AHMED)
    const person = bandPersonMeta(driver, t, 'en')
    const fields = identityFields(driver, t, 'en')
    const labels = fields.map((field) => field.label)

    /* The owner took both off the person row. `DRIVER_TIER` was rendered in
       exactly one place in the product — that row — so deleting rather than
       moving it would have dropped a captain's tier from the profile entirely.
       The assertion is scoped to the BUILDER, not to the rendered dialog: both
       facts are still on screen, one block down. */
    expect(person).not.toContain(en('profile.value.tier'))
    expect(labels).toContain(en('profile.field.tier'))
    expect(labels).toContain(en('profile.field.joined'))
    /* Legacy stores `joined: 'Feb 2025'` and the converter sets the day to 01.
       A day-precision date here would render a day nobody recorded. */
    expect(fields.find((field) => field.label === en('profile.field.joined'))?.value).toBe(
      'Feb 2025',
    )
  })
})

/* ═══════════ 2 · standing — words in a list, never a sentence ════════════ */

describe('standing is stated, not scored', () => {
  it('names every condition as its own line', async () => {
    const driver = await getDriver(SUSPENDED)
    const flags = standingFlags(driver, null, t, 'en')

    expect(flags).toContain(en('profile.driver.flag.suspended'))
    expect(flags).toContain(en('profile.driver.flag.manual'))
    expect(flags).toContain(en('profile.driver.flag.planTerminated'))
    /* A plural FAMILY, so `1 open complaints` is unrepresentable. */
    expect(flags).toContain(
      t.plural('profile.driver.flag.complaints', { count: driver.openComplaints }),
    )
    /* Each is its own entry. §9.6 forbids joining the ones that happen to be
       true into a sentence, and a conditional join is still a join. */
    expect(flags.length).toBeGreaterThan(1)
  })

  it('states a clean record in words rather than leaving a blank', async () => {
    const clean = await getDriver('DRV-0206')
    expect(standingFlags(clean, null, t, 'en')).toEqual([])
    await renderSheet({ driverId: 'DRV-0206' })
    expect(screen.getByText(en('profile.driver.standing.clear'))).toBeTruthy()
  })

  it('holds the payout-derived flags back until that read has answered', async () => {
    const driver = await getDriver(AHMED)
    /* `undefined` is *not known yet*. A list that grows a line after the
       operator has read it is worse than one that arrives complete. */
    const pending = standingFlags(driver, undefined, t, 'en')
    const answered = standingFlags(driver, { bankAccountLast4: null, state: 'failed' } as never, t, 'en')
    expect(pending).not.toContain(en('profile.driver.flag.noBankAccount'))
    expect(answered).toContain(en('profile.driver.flag.noBankAccount'))
    expect(answered).toContain(en('profile.driver.flag.payoutReturned'))
  })
})

/* ═══════════ 3 · the banner — zero or one, and never red ════════════════ */

describe('the standing banner', () => {
  it('is absent when nothing stands against the captain', async () => {
    expect(standingBanner(await getDriver(AHMED), t, 'en')).toBeNull()
  })

  it('reports a suspension with its recorded reason', async () => {
    const driver = await getDriver(SUSPENDED)
    const banner = standingBanner(driver, t, 'en')
    expect(banner?.title).toBe(en('profile.driver.banner.suspended.title'))
    expect(banner?.body).toContain(driver.suspensionReason as string)
  })

  it('is ONE banner at the more severe condition, never two', async () => {
    const driver = await getDriver(SUSPENDED)
    /* This captain is suspended AND has plan access terminated. §11.4 gives the
       surface zero or one, at the highest severity present. */
    expect(driver.planAccess).toBe('terminated')
    expect(standingBanner(driver, t, 'en')?.id).toBe('driver.suspended')
  })

  it('is warning and never critical, because a suspension is reversible', async () => {
    /* `commands/captains.ts`: *"blue, not red (R5a): a suspension is
       reversible."* R5a does licence a page-level critical banner; this
       deliberately does not take it. */
    expect(standingBanner(await getDriver(SUSPENDED), t, 'en')?.tone).toBe('warning')
    expect(standingBanner(await getDriver(FROZEN), t, 'en')?.tone).toBe('info')
  })

  it('names the date a frozen plan lifts', async () => {
    const driver = await getDriver(FROZEN)
    expect(driver.planFrozenUntil).not.toBeNull()
    expect(standingBanner(driver, t, 'en')?.title).toContain('4 Jul 2026')
  })
})

/* ═══════════ 4 · TWO LEDGERS, NEVER ONE NUMBER ══════════════════════════ */

describe('the payable and the cash debt are never combined', () => {
  it('renders both balances and no net anywhere on the surface', async () => {
    const money = await getDriverMoneyMovements(AHMED)
    expect(money.payableHalalas).toBeGreaterThan(0)
    expect(money.cashDebtHalalas).toBeGreaterThan(0)

    const { container } = await renderSheet({ driverId: AHMED })
    const text = container.textContent ?? ''

    /* Both addends are on screen… */
    expect(text).toContain(formatMoney(money.payableHalalas, { unit: 'none' }))
    expect(text).toContain(formatMoney(money.cashDebtHalalas))

    /* …and the number `payCaptain` would actually transfer is not, in either
       unit form. `types/financials.ts`: the net *"is deliberately not a field…
       it must be computed once from two independently-true server values rather
       than sent as a third value that can disagree with them."* This surface
       takes no payout, so it states no net — a figure here would be a number no
       ledger holds, printed beside two that both do. */
    const net = money.payableHalalas - money.cashDebtHalalas
    expect(text).not.toContain(formatMoney(net))
    expect(text).not.toContain(formatMoney(net, { unit: 'none' }))
    /* Nor the sum, which is the other way to get it wrong. */
    expect(text).not.toContain(formatMoney(money.payableHalalas + money.cashDebtHalalas))
  })

  it('labels a negative payable as owed BACK, rather than leaving the label wrong', async () => {
    const money = await getDriverMoneyMovements(SUSPENDED)
    expect(money.payableHalalas).toBeLessThan(0)
    await renderSheet({ driverId: SUSPENDED })
    expect(screen.getByText(en('profile.driver.earnings.negative'))).toBeTruthy()
    expect(screen.queryByText(en('profile.driver.earnings.payable'))).toBeNull()
  })

  it('renders no line for a figure that is zero', async () => {
    const money = await getDriverMoneyMovements(SUSPENDED)
    await renderSheet({ driverId: SUSPENDED })
    /* A `Deductions pending 0.00 SAR` line invents a category this captain is
       not in — the tile rule (R4-11 §11.2) applied to a line. */
    if (money.pendingDeductionsHalalas === 0) {
      expect(screen.queryByText(en('profile.driver.field.pendingDeductions'))).toBeNull()
    }
    if (money.escrowHeldHalalas === 0) {
      expect(screen.queryByText(en('profile.driver.field.escrowHeld'))).toBeNull()
    }
  })

  it('states the ledger direction once, because a payable runs the other way', async () => {
    await renderSheet({ driverId: AHMED })
    await userEvent.click(screen.getByRole('tab', { name: /Earnings/ }))
    /* AC-308 / §3.2 — `clients/payouts.ts` requires the convention be stated,
       and `Debit` / `Credit` alone do not carry it. */
    expect(await screen.findByText(en('profile.driver.earnings.direction'))).toBeTruthy()
  })
})

/* ═══════════ 5 · documents — the clock, and the 404 that is an answer ═══ */

describe('the document file', () => {
  it('counts days against the clock it is passed, not a module-scope one', async () => {
    const file = await getDriverCompliance(AHMED)
    const registration = file.docs.find((doc) => doc.type === 'vehicle_reg')
    expect(registration).toBeDefined()
    /* `types/driver.ts` fixes the buckets as a server field and the days
       remaining as the UI's, *"computed by the UI from `expiresOn` against a
       passed clock, never from a module-scope `Date.now()`"*. */
    const days = daysUntil(registration!.expiresOn, EYVAR_NOW)
    await renderSheet({ driverId: AHMED })
    expect(
      screen.getByText(t.plural('profile.driver.documents.daysLeft', { count: days })),
    ).toBeTruthy()
  })

  it('reads a captain with no file as No file, never as a failure', async () => {
    await renderSheet({ driverId: NO_FILE })
    /* Nothing failed. `Couldn't load Documents. Try again.` over a captain who
       simply has no documents is a statement an operator cannot tell from an
       outage — and `types/driver.ts` calls reporting `valid` for an empty file
       *"the most dangerous possible default"*. */
    expect(screen.getAllByText(en('people.compliance.worst.none')).length).toBeGreaterThan(0)
    expect(
      screen.queryByText(
        t('profile.state.error', { section: en('profile.driver.block.documents') }),
      ),
    ).toBeNull()
  })

  it('carries a count on Documents and nothing on Earnings or Identity', async () => {
    const file = await getDriverCompliance(AHMED)
    await renderSheet({ driverId: AHMED })
    const documents = screen.getByRole('tab', { name: new RegExp(en('profile.driver.tab.documents')) })
    await waitFor(() => expect(documents.textContent).toContain(String(file.docs.length)))

    /* A tab carries a count only when exactly one collection sits behind it and
       the server knows its total. `Earnings` holds the ledger AND the deduction
       list, whose members overlap — an applied deduction IS a posting — so any
       single number is a double count or a claim about which is the real one. */
    const earnings = screen.getByRole('tab', { name: new RegExp(en('profile.driver.tab.earnings')) })
    expect(earnings.textContent?.trim()).toBe(en('profile.driver.tab.earnings'))
    const identity = screen.getByRole('tab', { name: new RegExp(en('profile.section.identity')) })
    expect(identity.textContent?.trim()).toBe(en('profile.section.identity'))
  })
})

/* ═══════════ 5b · D-CP-5 / D-CP-7 — the order, and the expansion ═══════ */

describe('the document list answers what is about to stop this captain driving', () => {
  it('orders by deadline, soonest first, not by the canonical order', async () => {
    const file = await getDriverCompliance(AHMED)
    const rows = documentRows(file, t, EYVAR_NOW)
    /* D-CP-5 — a profile asks *what expires next*; the Compliance VIEW asks
       *which document is which* and keeps `DOC_ORDER` in its own columns. */
    const dates = rows.map((row) => row.expiresOn)
    expect(dates).toEqual([...dates].sort())
    /* And the summary block's caption names row 1 by construction rather than
       deriving the answer a second time (AC-CP-18). */
    expect(soonestDocument(rows)).toBe(rows[0])
  })

  it('breaks a tie on the canonical order so the list cannot flicker', async () => {
    const file = await getDriverCompliance(AHMED)
    const sameDay = {
      ...file,
      docs: file.docs.map((doc) => ({ ...doc, expiresOn: file.docs[0]!.expiresOn })),
    }
    const once = documentRows(sameDay, t, EYVAR_NOW).map((row) => row.type)
    const again = documentRows(
      { ...sameDay, docs: [...sameDay.docs].reverse() },
      t,
      EYVAR_NOW,
    ).map((row) => row.type)
    expect(again).toEqual(once)
  })

  it('makes every row one control that expands in place, and only one at a time', async () => {
    const user = userEvent.setup()
    await renderSheet({ driverId: AHMED })
    const rows = await screen.findAllByRole('button', { expanded: false })
    const documents = rows.filter((row) => row.getAttribute('data-slot') === 'accordion-trigger')
    /* Three, not five. `COMPLIANCE_DOC_TYPES` is the national ID, the driving
       licence and the vehicle licence since the document set was cut to four —
       the profile photo is the fourth and does not expire, so it is not a
       compliance row. See `types/driver.ts`. */
    expect(documents.length).toBe(3)

    await user.click(documents[0]!)
    expect(documents[0]!.getAttribute('aria-expanded')).toBe('true')
    /* §4.7 / §5.6 — opening one collapses the siblings. At 480 a stack of
       expanded rows buries the list they belong to. */
    await user.click(documents[1]!)
    expect(documents[0]!.getAttribute('aria-expanded')).toBe('false')
    expect(documents[1]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('never leaves an expanded row empty, because the derivation always renders', async () => {
    const user = userEvent.setup()
    await renderSheet({ driverId: AHMED })
    const file = await getDriverCompliance(AHMED)
    const rows = documentRows(file, t, EYVAR_NOW)

    for (const row of rows) {
      const trigger = screen.getByRole('button', { name: new RegExp(row.label) })
      await user.click(trigger)
      /* §8.2 — a derived value states its derivation, and `ComplianceDocState`'s
         7- and 30-day boundaries were invisible on every surface that printed
         the word. */
      expect(screen.getByText(en(DOC_STATE_WHY[row.state]))).toBeTruthy()
      await user.click(trigger)
    }
  })

  it('does not restate the date or the state word the trigger already carries', async () => {
    const user = userEvent.setup()
    await renderSheet({ driverId: AHMED })
    const file = await getDriverCompliance(AHMED)
    const row = documentRows(file, t, EYVAR_NOW)[0]!
    const trigger = screen.getByRole('button', { name: new RegExp(row.label) })
    await user.click(trigger)
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!)
    expect(panel).not.toBeNull()
    /* An expansion that repeats its own trigger teaches an operator that
       expanding is pointless. */
    expect(panel!.textContent).not.toContain(en(DOC_STATE_LABEL[row.state]))
  })

  it('tells a scan that is absent apart from a scan that is withheld', async () => {
    const user = userEvent.setup()
    const file = await getDriverCompliance(AHMED)
    const withFile = documentRows(file, t, EYVAR_NOW).find((row) => row.doc.file !== null)
    const withoutFile = documentRows(file, t, EYVAR_NOW).find((row) => row.doc.file === null)

    await renderSheet({ driverId: AHMED })
    if (withoutFile) {
      await user.click(screen.getByRole('button', { name: new RegExp(withoutFile.label) }))
      /* §6.4 — one grey sentence, no tile outline, no glyph, no placeholder
         image, no em dash. */
      expect(screen.getByText(en('profile.driver.documents.noScan'))).toBeTruthy()
    }
    if (withFile) {
      await user.click(screen.getByRole('button', { name: new RegExp(withFile.label) }))
      expect(screen.getByText(withFile.doc.file!.name)).toBeTruthy()
      /* The third state is the one that bites: `file !== null` with the
         permission refused must NOT fall through to the absence sentence, which
         would tell an operator no scan exists over a record that has one. */
      expect(screen.queryByText(en('profile.driver.documents.noScan'))).toBeNull()
    }
  })

  it('refuses the scan without ever gating the expansion or the record', async () => {
    const user = userEvent.setup()
    const file = await getDriverCompliance(AHMED)
    const withFile = documentRows(file, t, EYVAR_NOW).find((row) => row.doc.file !== null)
    if (!withFile) return

    await renderSheet({ driverId: AHMED, canOpenCompliance: false })
    const trigger = screen.getByRole('button', { name: new RegExp(withFile.label) })
    await user.click(trigger)
    /* AC-CP-40 — expanding reveals nothing an operator cannot already read in
       the collapsed row, so gating it would be chrome pretending to be
       security. AC-CP-39 — the scan itself is refused in place, in words, and in
       DIFFERENT words from the absence. */
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(en(DOC_STATE_WHY[withFile.state]))).toBeTruthy()
    expect(screen.getByText(en('profile.driver.refusal.viewDocument'))).toBeTruthy()

    /* **The RECORD ROW renders for a refused operator, and this assertion is
       inverted from what shipped.** §6.3: *"the gate attaches to the bytes, not
       to the metadata … the scan record renders for every operator who can open
       the profile, and `canOpenCompliance` is not consulted in the expansion at
       all."* A filename, a size and an uploader are administrative facts about
       a record; a scan is a photograph of a government identity document, and
       only the second gets the gate.
    
       The shipped implementation hid the row because there was no control to
       disable and §11.2 governs *a control the operator may not use*. §6.5a
       ships two, so §6.3's branch is reachable exactly as it predicted: the row
       renders and the controls are disabled in place (state B). */
    expect(screen.getByText(withFile.doc.file!.name)).toBeTruthy()
  })

  /**
   * **State B, drawn in full** (§6.5a.8, AC-CP-135 / AC-CP-141).
   *
   * Never hidden, because hidden controls make a permission and an absent file
   * indistinguishable and those are opposite facts. **One sentence serves both**
   * — two identical refusals stacked is not twice as clear — and both controls
   * point at it with `aria-describedby`.
   */
  it('disables both scan controls in place, with one linked reason', async () => {
    const user = userEvent.setup()
    const file = await getDriverCompliance(AHMED)
    const withFile = documentRows(file, t, EYVAR_NOW).find((row) => row.doc.file !== null)
    if (!withFile) return

    await renderSheet({ driverId: AHMED, canOpenCompliance: false })
    await user.click(screen.getByRole('button', { name: new RegExp(withFile.label) }))

    const open = screen.getByRole('button', {
      name: t('profile.driver.documents.openScanNamed', { document: withFile.label }),
    })
    const download = screen.getByRole('button', {
      name: t('profile.driver.documents.downloadNamed', { document: withFile.label }),
    })
    expect(open).toBeDisabled()
    expect(download).toBeDisabled()

    const reason = open.getAttribute('aria-describedby')
    expect(reason).not.toBeNull()
    /* ONE sentence, and both controls name it. */
    expect(download.getAttribute('aria-describedby')).toBe(reason)
    expect(document.getElementById(reason as string)?.textContent).toBe(
      en('profile.driver.refusal.viewDocument'),
    )
    /* §8.2a — it refuses the SCAN. The shipped wording refused *documents*,
       over a list whose expansion is never gated. */
    expect(en('profile.driver.refusal.viewDocument')).toContain('scans')
    expect(en('profile.driver.refusal.viewDocument')).not.toContain('documents')
  })

  it('collapses the open row on Escape rather than closing the surface', async () => {
    const user = userEvent.setup()
    await renderSheet({ driverId: AHMED })
    const file = await getDriverCompliance(AHMED)
    const row = documentRows(file, t, EYVAR_NOW)[0]!
    const trigger = screen.getByRole('button', { name: new RegExp(row.label) })
    await user.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    /* `DESIGN.md` :4114 — Escape twice in a nested surface, innermost first.
       The second one belongs to the sheet and is not this component's. */
    await user.keyboard('{Escape}')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('spends no filled button on either navigation', async () => {
    await renderSheet({ driverId: AHMED })
    /* D-CP-6 — the surface commits nothing (`DriverFooter`), and a filled
       control in a drawer is the affordance for a commit. R3 caps the count at
       one; it does not require one. */
    const compliance = screen.getByRole('link', { name: en('profile.driver.action.compliance') })
    expect(compliance.className).not.toContain('bg-primary')
    /* The payouts navigation lives behind the Earnings tab, beside the ledger it
       extends — one control per list, each seated under its own. */
    await userEvent.click(screen.getByRole('tab', { name: /Earnings/ }))
    const payouts = await screen.findByRole('link', { name: en('profile.driver.action.payouts') })
    expect(payouts.className).not.toContain('bg-primary')
  })
})

/* ═══════════ 6 · §11.2 — the two navigations, and their refusal ════════ */

describe('the two navigations', () => {
  it('are links with resolved destinations when the operator may follow them', async () => {
    await renderSheet({ driverId: AHMED })
    const open = screen.getByRole('link', { name: en('profile.driver.action.compliance') })
    /* An `<a href>`, so middle-click and open-in-new-tab work and the
       destination is in the status bar before the operator commits. */
    expect(open.getAttribute('href')).toBe(driverComplianceHref(AHMED))
  })

  it('are disabled IN PLACE with a real sentence when they are not', async () => {
    await renderSheet({ driverId: AHMED, canOpenCompliance: false })
    const refused = screen.getByRole('button', { name: en('profile.driver.action.compliance') })
    /* §11.2 — never hidden, and the reason is text beside it rather than a
       tooltip: a hover-only explanation is unreachable by keyboard and on
       touch. */
    expect(refused).toBeDisabled()
    expect(screen.getByText(en('profile.driver.refusal.compliance'))).toBeTruthy()
    expect(refused.getAttribute('aria-describedby')).not.toBeNull()
  })

  it('offers the payouts navigation on the sheet too, not only on the page', async () => {
    await renderSheet({ driverId: AHMED })
    await userEvent.click(screen.getByRole('tab', { name: /Earnings/ }))
    const payouts = await screen.findByRole('link', { name: en('profile.driver.action.payouts') })
    /* §3 — a command available on one surface and missing from the other is
       the divergence the parity contract exists to refuse. */
    expect(payouts.getAttribute('href')).toBe(driverPayoutsHref(AHMED))
  })
})

/* ═══════════ 7 · the timeline, and the one event it refuses to invent ═══ */

describe('the timeline', () => {
  it('is one server-derived list and carries no suspension event', async () => {
    await renderSheet({ driverId: SUSPENDED })
    await userEvent.click(screen.getByRole('tab', { name: /Activity/ }))
    const panel = await screen.findByRole('tabpanel')
    /* `Driver` has `suspended` and `suspensionReason` and no `suspendedAt`. A
       timeline event needs a time, so putting one here would mean inventing a
       date. The banner reports the current state instead, and neither lies. */
    expect(within(panel).queryByText(en('profile.driver.flag.suspended'))).toBeNull()
  })

  it('names the rider on a trip row rather than a route', async () => {
    await renderSheet({ driverId: AHMED })
    await userEvent.click(screen.getByRole('tab', { name: /Activity/ }))
    const panel = await screen.findByRole('tabpanel')
    /* `types/driver.ts` refuses to carry `pickup` / `destination` — both
       nullable on `Trip`, which is the optional-key trap `interpolate` throws
       on — and a captain's own history is a list of who they carried. */
    expect(within(panel).getAllByText(/Trip (completed|requested|cancelled)/).length).toBeGreaterThan(0)
  })
})

/* ═══════════ 8 · presence, asked rather than assumed ════════════════════ */

describe('what else references this captain', () => {
  it('asks all nine collections rather than reading openComplaints', async () => {
    await renderSheet({ driverId: SUSPENDED })
    await userEvent.click(screen.getByRole('tab', { name: new RegExp(en('profile.section.identity')) }))
    const panel = await screen.findByRole('tabpanel')
    /* Two of the nine are collections a captain has and a rider cannot. A
       profile that answered "is anything open" from `Driver.openComplaints`
       would say `0` for a captain with an open dispute and a cash report. */
    expect(within(panel).getByText(en('profile.driver.support.safetyIncidents'))).toBeTruthy()
    expect(within(panel).getByText(en('profile.driver.support.cashReports'))).toBeTruthy()
  })
})

/* ═══════════ 9 · the payout gate is on the RECORD, not on the read ══════ */

describe('a bank account that cannot receive money is a standing condition', () => {
  it('flags a pending account and a rejected one as two different facts', async () => {
    const pending = await getDriver(BANK_PENDING)
    const rejected = await getDriver(BANK_REJECTED)
    const verified = await getDriver(AHMED)

    expect(pending.bank.status).toBe('Pending verification')
    expect(rejected.bank.status).toBe('Rejected')
    expect(verified.bank.status).toBe('Verified')

    /* Two entries and not one: a check that has not finished clears itself, a
       check that refused does not, and an operator does a different thing
       about each. The six flags above already separate causes at that grain. */
    expect(standingFlags(pending, null, t, 'en')).toContain(en('profile.driver.flag.bankPending'))
    expect(standingFlags(pending, null, t, 'en')).not.toContain(
      en('profile.driver.flag.bankRejected'),
    )
    expect(standingFlags(rejected, null, t, 'en')).toContain(en('profile.driver.flag.bankRejected'))
    expect(standingFlags(rejected, null, t, 'en')).not.toContain(
      en('profile.driver.flag.bankPending'),
    )
    /* A verified account is not a condition, so it says nothing at all. */
    const clean = standingFlags(verified, null, t, 'en')
    expect(clean).not.toContain(en('profile.driver.flag.bankPending'))
    expect(clean).not.toContain(en('profile.driver.flag.bankRejected'))
  })

  it('states the gate before the payout read has answered', async () => {
    /* **The load-bearing assertion for D-CP-12.** The captain page dropped its
       right-hand rail on the argument that the payout gate moves UP into
       `standingFlags`, which renders in the strip above the tab row. That only
       holds if the flag comes off the RECORD — `undefined` is the payout read
       in flight, and the two payout-derived flags are correctly held back. */
    const pending = await getDriver(BANK_PENDING)
    const flags = standingFlags(pending, undefined, t, 'en')
    expect(flags).toContain(en('profile.driver.flag.bankPending'))
    expect(flags).not.toContain(en('profile.driver.flag.noBankAccount'))
    expect(flags).not.toContain(en('profile.driver.flag.payoutReturned'))
  })

  it('renders it as a word in the standing list, never as a badge', async () => {
    await renderSheet({ driverId: BANK_REJECTED })
    const flag = await screen.findByText(en('profile.driver.flag.bankRejected'))
    /* §7.5 — the WORD carries it. R5a spends red on four things and a bank
       account's verification state is not one of them, so the entry is a list
       item in the standing block and carries no tone at all. */
    expect(flag.closest('[data-slot="badge"]')).toBeNull()
    expect(flag.closest('li')).not.toBeNull()
  })
})

/* ═══════════ 10 · Performance as figures (D-CP-13) ══════════════════════ */

describe('the seven performance facts become two figure rows', () => {
  it('splits by the window the fact is true over', async () => {
    const driver = await getDriver(AHMED)
    const payout = await payoutOf(AHMED)

    /* What this captain is LIKE — true of them generally, unchanged when the
       payout period rolls. **Two, not three**: `Trips completed` left for
       `tripFigures` when the owner ruled it a list, and the split is semantic
       rather than per-surface — these are the two RATES, which have no list
       behind them. */
    expect(drivingFigures(driver, t, 'en').map((figure) => figure.label)).toEqual([
      en('profile.field.rating'),
      en('profile.field.onTime'),
    ])
    /* The one figure that IS a list. The page renders the list and not this;
       the sheet, which cannot fit a `DataTable` in 447px, renders this. */
    expect(tripFigures(driver, t, 'en').map((figure) => figure.label)).toEqual([
      en('profile.field.totalTrips'),
    ])
    /* What happened in the WINDOW on screen. */
    expect(periodFigures(driver, payout, t, 'en').map((figure) => figure.label)).toEqual([
      en('profile.field.monthEarnings'),
      en('profile.driver.field.tripsInPeriod'),
    ])
  })

  it('keeps the last trip as a caption and never as a figure of its own', async () => {
    const driver = await getDriver(AHMED)
    expect(driver.lastTripAt).not.toBeNull()
    const trips = tripFigures(driver, t, 'en')[0]
    /* A timestamp has nothing to aggregate. It qualifies the number above it —
       exactly what a caption is for — at the rank `SummaryBlock` already has. */
    expect(trips?.caption).toBe(
      t('profile.driver.figure.lastTrip', {
        date: formatDate(driver.lastTripAt as string, { style: 'day-month-time', language: 'en' }),
      }),
    )
    const labels = [
      ...drivingFigures(driver, t, 'en'),
      ...tripFigures(driver, t, 'en'),
      ...periodFigures(driver, null, t, 'en'),
    ].map((figure) => figure.label)
    expect(labels).not.toContain(en('profile.field.lastTrip'))
  })

  it('loses no fact the card used to state — AC-CP-04', async () => {
    const driver = await getDriver(AHMED)
    const payout = await payoutOf(AHMED)

    /* **The seven rows `performanceFields` printed, pinned to the spec's own
       table (§4B.6) rather than to the builder.**
    
       The builder was deleted in the commit that removed its last consumer
       (AC-CP-92), and reading the expectation off it would have been a test
       that could only ever agree with itself. This list is frozen: if a figure
       row later drops one of the seven, this fails and names it. */
    const wasOnTheCard = [
      en('profile.field.rating'),
      en('profile.field.onTime'),
      en('profile.field.totalTrips'),
      en('profile.driver.field.tripsInPeriod'),
      en('profile.field.monthEarnings'),
      en('profile.field.lastTrip'),
      en('profile.driver.field.capacity'),
    ]

    /* **A card may shed facts; the RECORD may not.** Every label the dissolved
       card printed has a stated home: five are figures, `Last trip` is the
       caption asserted above, and `Subscription slots` is `CapacityBlock` —
       which renders on the sheet's rail and in the page's strip, so tiling it
       again would state one fact twice on one screen. */
    const homed = new Set([
      ...drivingFigures(driver, t, 'en').map((figure) => figure.label),
      ...tripFigures(driver, t, 'en').map((figure) => figure.label),
      ...periodFigures(driver, payout, t, 'en').map((figure) => figure.label),
      en('profile.field.lastTrip'),
      en('profile.driver.field.capacity'),
    ])
    expect(wasOnTheCard.filter((label) => !homed.has(label))).toEqual([])
  })

  it('deletes the card and its heading, and renders the word Performance nowhere', () => {
    /* AC-CP-92 / AC-CP-93. A figure row never takes a section heading — its
       blocks carry their own (D-CP-3) — so the key lost its last consumer with
       the card and goes with it rather than being orphaned. */
    expect(EN['profile.driver.card.performance']).toBeUndefined()
    expect(Object.keys(EN).filter((key) => key.endsWith('.card.performance'))).toEqual([])
  })

  it('puts a sentence in the place of an absent figure, never a zero and never a dash', async () => {
    /* Three different absences, three different claims. `totalTrips === 0` is a
       REAL zero and still prints a sentence: `0` under `Trips completed` and
       `0` printed before a read returns are the same pixels (R4-11). */
    const driver = await getDriver(NO_FILE)
    expect(driver.rating).toBeNull()
    expect(driver.onTimePercent).toBeNull()
    expect(driver.totalTrips).toBe(0)

    const figures = [
      ...drivingFigures(driver, t, 'en'),
      ...tripFigures(driver, t, 'en'),
      ...periodFigures(driver, null, t, 'en'),
    ]
    const sentences = figures.flatMap((figure) =>
      figure.value.kind === 'absent' ? [figure.value.sentence] : [],
    )
    expect(sentences).toEqual([
      en('profile.driver.meta.noRating'),
      en('profile.driver.figure.noOnTime'),
      en('profile.driver.figure.noTrips'),
      en('profile.driver.figure.noPeriod'),
    ])

    const { container } = render(<FigureGrid figures={figures} />)
    expect(container.textContent).not.toContain('—')
    /* `Earnings this month` is on the record and a `0.00` there is a real zero
       that prints as one (§8.3.1) — which is why it is the one figure with no
       absence sentence, and why the row is not empty. */
    expect(container.textContent).toContain(
      formatMoney(driver.monthEarningsHalalas, { unit: 'none' }),
    )
  })

  it('fits its columns rather than declaring them, on page ground', async () => {
    const driver = await getDriver(AHMED)
    const { container } = render(<FigureGrid figures={drivingFigures(driver, t, 'en')} />)
    const grid = container.firstElementChild as HTMLElement
    /* **`auto-fill`, not `auto-fit`, and not `grid-cols-2`** — the owner: *"put
       all metrics side by side."* D-CP-13's two-across arithmetic was computed
       against a main column that D-CP-12 removed in the same amendment.

       This assertion said `auto-fit` and had to be inverted, because `auto-fit`
       was the defect wearing the fix's name. It collapses every EMPTY track to
       zero and then shares the container between the survivors, so a two-figure
       row on the 1264px page gave each figure a **620px** track. Measured
       natural widths in that row: `Rating` 56px, `On time` 82px, `Trips this
       period` 93px, `Earnings this month` 210px. A 56px figure in a 620px track
       is not a row of metrics — it is two numbers at opposite ends of the page.

       `auto-fill` keeps the empty tracks, so the filled ones stay at track size
       and the figures pack as one group. Measured after: 1264 → 5 tracks of
       234px, 1168 → 4 of 274, 1136 → 4 of 266, and the sheet's 447 → 1, stacked
       — correct, because two columns there would be 211px against the 210px
       that money figure needs, and 1px is not clearance.

       No breakpoint variant, because the fitting IS the responsiveness. */
    expect(grid.className).toContain('auto-fill')
    expect(grid.className).not.toContain('auto-fit')
    expect(grid.className).toContain('var(--figure-col)')
    expect(grid.className).not.toContain('grid-cols-2')
    expect(grid.className).not.toContain('wide:')
    expect(grid.className).not.toContain('compact:')
    /* `PLAIN_FRAME`'s posture: the thing the owner liked has no border. */
    for (const block of Array.from(grid.children)) {
      const cls = (block as HTMLElement).className
      expect(cls).not.toMatch(/(^|\s)(border|bg-|shadow|rounded)/)
      /* `px-0 py-0` cancels `SummaryBlock`'s own padding so a figure's
         inline-start edge is the section's. `0` is on every grid. */
      expect(cls).toContain('px-0')
      expect(cls).toContain('py-0')
    }
  })
})

/* ═══════════ 11 · one count, two surfaces ═══════════════════════════════ */

function Counts({ driverId }: { driverId: string }) {
  const counts = tabCounts(useDriverReads(driverId), t, EYVAR_NOW)
  return (
    <>
      <span data-testid="documents">{String(counts.documents)}</span>
      <span data-testid="activity">{String(counts.activity)}</span>
    </>
  )
}

/** Both counts, once every read behind them has answered. */
async function settledCounts(driverId: string) {
  render(<Counts driverId={driverId} />)
  await waitFor(() => {
    expect(screen.getByTestId('documents').textContent).not.toBe('loading')
    expect(screen.getByTestId('activity').textContent).not.toBe('loading')
  })
  return {
    documents: screen.getByTestId('documents').textContent,
    activity: screen.getByTestId('activity').textContent,
  }
}

describe('the tab counts are derived once for both surfaces', () => {
  it('counts the records behind the tab, not the rows on screen', async () => {
    const file = await getDriverCompliance(AHMED)
    const timeline = await getDriverTimeline(AHMED, { pageSize: DRIVER_LIST_ROWS })
    const counts = await settledCounts(AHMED)

    expect(counts.documents).toBe(String(file.docs.length))
    /* The server's `total`, never the six rows the list holds. A captain with
       412 trips has more events than the window shows, and the list states its
       own truncation in words beneath. */
    expect(timeline.total).toBeGreaterThan(DRIVER_LIST_ROWS)
    expect(counts.activity).toBe(String(timeline.total))
  })

  it('is loading before a read answers, so no zero is ever a guess', async () => {
    /* `0` printed before a read returns and `0` as an answer are the same
       pixels, and on `Documents` the guess reads as *this captain has filed
       nothing*. Asserted on the first synchronous frame. */
    render(<Counts driverId={AHMED} />)
    expect(screen.getByTestId('documents').textContent).toBe('loading')
    expect(screen.getByTestId('activity').textContent).toBe('loading')
    /* Then let both reads land, so the frame under assertion is the loading
       one rather than whatever the runner happened to catch. */
    await waitFor(() => expect(screen.getByTestId('documents').textContent).not.toBe('loading'))
  })

  /**
   * **A failed read is `'unknown'`, and `TabCount` draws NOTHING for it.**
   *
   * Both cases returned `null` before, `TabCount` drew a `Skeleton` for `null`,
   * and a failed compliance read therefore left an indefinite shimmer beside a
   * tab that was not loading — a chip promising a number that is never coming.
   * In flight draws the skeleton; failed draws nothing. The tab is still
   * rendered, still selectable, and the section inside it still carries its own
   * error with `Try again` (AC-CP-76, AC-CP-78).
   */
  it('draws nothing beside a tab whose read failed, and a skeleton only while it is in flight', async () => {
    mockFailures.always('compliance.get')
    render(<Counts driverId={AHMED} />)
    await waitFor(() =>
      expect(screen.getByTestId('documents').textContent).toBe('unknown'),
    )

    cleanup()
    const { container: failed } = render(
      <TabCount value="unknown" language="en" />,
    )
    expect(failed.innerHTML).toBe('')

    const { container: pending } = render(<TabCount value="loading" language="en" />)
    expect(pending.querySelector('[data-slot="skeleton"]')).not.toBeNull()

    const { container: real } = render(<TabCount value={0} language="en" />)
    /* A real `0` prints as `0`. It is the answer, not the absence of one. */
    expect(real.textContent).toBe('0')
  })

  it('reads a captain with no file as a real 0, because a 404 is an answer', async () => {
    expect((await settledCounts(NO_FILE)).documents).toBe('0')
  })

  it('agrees with the number the sheet renders on the tab', async () => {
    const file = await getDriverCompliance(AHMED)
    await renderSheet({ driverId: AHMED })
    const documents = screen.getByRole('tab', {
      name: new RegExp(en('profile.driver.tab.documents')),
    })
    /* The whole point of the shared builder: the sheet and the page cannot
       disagree about how many documents a captain has, because there is one
       derivation to disagree with. */
    await waitFor(() => expect(documents.textContent).toContain(String(file.docs.length)))
  })
})

/* ═══════════ 12 · the scan — preview, open and download (§6.5a) ═════════ */

/**
 * **The six states of the file slot, each reached the way an operator reaches
 * it**, and the fetch policy that decides which one is on screen.
 *
 * `getComplianceDocumentFile` is spied **with an implementation, always** —
 * `reauth.test.tsx` records why in full: `@/data/clients` re-exports with a
 * live binding, so a bare `vi.spyOn` records nothing and a negative assertion
 * passes vacuously while reading as the strongest check on the page.
 *
 * **What is NOT asserted here, deliberately.** The new tab, the object URL's
 * revocation and the tab-stop count are measured in **Chromium**, not jsdom:
 * `window.open` is a not-implemented stub, `URL.createObjectURL` is a counter
 * from `src/test/setup.ts`, and jsdom reports `tabindex="-1"` on every Radix
 * trigger including the selected one. Measured at `/entity/DRV-0101`, viewport
 * 1440 x 900, and at the sheet's 480 from
 * `/operations/people?view=captains&entity=DRV-0101`:
 *
 * | | measured |
 * |---|---|
 * | the frame | **240 x 160** on both surfaces; the sheet's panel is 447 wide and nothing overflows |
 * | tab stops added by an expanded row | **exactly 2** — `Open scan`, `Download`. The frame is `aria-hidden` / `tabindex="-1"` and is never focused |
 * | `Open scan` on a PDF, bytes NOT in hand | opens on the **first** click; the tab lands on `blob:…` with `document.contentType === 'application/pdf'` |
 * | focus across that click | `document.activeElement` is `Open scan: Registration` **before and after**; no scrim, no dialog, nothing to restore (AC-CP-117) |
 * | `window.opener` in the new tab | `null` |
 * | `Escape` | one press collapses the row and the sheet stays open; a second closes the sheet (AC-CP-118) |
 * | object URLs across expand / collapse / re-expand | every one created was revoked; **0 leaked** |
 * | `Download` on `DRV-0201` | `رخصة-القيادة-تجديد-٢٠٢٩.pdf` — Arabic filename, Arabic-Indic digits **unnormalised** |
 * | `dir="rtl"` | the frame's x moves to the inline-start; `transform` is `none` on both the frame and the `<img>`; `Open scan` (source-order first) sits at the higher x |
 * | Arabic control widths at 448 | `فتح النسخة الممسوحة ↗` 152 + `تنزيل` 50 + gap 8 = **210**, against §6.5a.9's estimate of 188 |
 *
 * **One environment caveat, isolated rather than guessed:** headless Chromium
 * has no PDF viewer, so navigating a tab to a `blob:` of `application/pdf`
 * leaves it on `about:blank` — reproduced with a bare `window.open` + blob and
 * three media types, where `text/html` and `image/jpeg` navigate and
 * `application/pdf` does not. **Headed Chromium navigates all three.** A
 * Playwright suite asserting the PDF tab must run headed.
 */
describe('the scan viewer', () => {
  /** `DRV-0101`: licence is a JPEG, registration and insurance are PDFs, two have no file. */
  const IMAGES = AHMED

  const scanned = (
    compliance: Awaited<ReturnType<typeof getDriverCompliance>>,
    mime: string | null,
  ) =>
    documentRows(compliance, t, EYVAR_NOW).find((row) =>
      mime === null ? row.doc.file === null : row.doc.file?.mimeType === mime,
    )

  /**
   * The row's disclosure trigger, and it is found by `aria-expanded` rather
   * than by name.
   *
   * **The two scan controls name their document** (AC-CP-138), so once a row is
   * open `Open scan: Licence` and `Download: Licence` both match a name regex
   * for `Licence` and `getByRole` throws on three matches. The trigger is the
   * only one of the three that carries `aria-expanded`.
   */
  function trigger(label: string): HTMLElement {
    const found = screen
      .getAllByRole('button', { name: new RegExp(label) })
      .find((button) => button.hasAttribute('aria-expanded'))
    if (found === undefined) throw new Error(`no disclosure trigger named ${label}`)
    return found
  }

  async function expand(label: string) {
    await userEvent.setup().click(trigger(label))
  }

  const openName = (label: string) =>
    t('profile.driver.documents.openScanNamed', { document: label })
  const downloadName = (label: string) =>
    t('profile.driver.documents.downloadNamed', { document: label })

  it('A — a record with no scan asks for nothing and says so in its own words', async () => {
    const read = vi.spyOn(driversClient, 'getComplianceDocumentFile')
    const compliance = await getDriverCompliance(IMAGES)
    const row = scanned(compliance, null)
    if (!row) return

    await renderSheet({ driverId: IMAGES })
    await expand(row.label)

    expect(screen.getByText(en('profile.driver.documents.noScan'))).toBeTruthy()
    /* AC-CP-126 — a row whose `file` is `null` costs zero requests, and there
       is no control to disable because there is nothing to open. */
    expect(read).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: openName(row.label) })).toBeNull()
    /* A versus E is exact: this sentence renders ONLY for `file === null`. */
    expect(screen.queryByText(en('profile.driver.documents.scanError'))).toBeNull()
  })

  it('C then D — an image fetches on expansion, exactly once, and draws the frame', async () => {
    const read = vi.spyOn(driversClient, 'getComplianceDocumentFile')
    const compliance = await getDriverCompliance(IMAGES)
    const row = scanned(compliance, 'image/jpeg')
    if (!row) return

    await renderSheet({ driverId: IMAGES })
    await expand(row.label)

    /* AC-CP-127 — expanding an image row with the permission makes EXACTLY one
       request, and it carries the seam's `AbortSignal` (AC-CP-128). */
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1))
    expect(read.mock.calls[0]?.[0]).toBe(row.doc.id)
    expect(read.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal)

    /* D — the scan, `object-contain`, `alt=""`, and no descriptive alt text
       generated from the file name, the document type or anything else. */
    const image = await waitFor(() => {
      const found = document.querySelector('img[src^="blob:"]')
      expect(found).not.toBeNull()
      return found as HTMLImageElement
    })
    expect(image.getAttribute('alt')).toBe('')
    expect(image.className).toContain('object-contain')
    /* AC-CP-150 — the frame's position mirrors; its contents never do. */
    expect(image.className).not.toContain('scale-x')
    expect(image.parentElement?.className ?? '').not.toContain('rtl:')
    /* The frame is a redundant mouse target and adds no tab stop. */
    expect(image.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(image.parentElement).toHaveAttribute('tabindex', '-1')

    /* Both controls live, and the record row still states the RECORD's size —
       never `bytes.byteLength`, which is a sample of the pipeline. */
    expect(screen.getByRole('button', { name: openName(row.label) })).toBeEnabled()
    expect(screen.getByRole('button', { name: downloadName(row.label) })).toBeEnabled()
    expect(screen.getByText(row.doc.file?.name as string)).toBeTruthy()
  })

  it('Dprime — a PDF fetches nothing, draws no frame, and says why', async () => {
    const read = vi.spyOn(driversClient, 'getComplianceDocumentFile')
    const compliance = await getDriverCompliance(IMAGES)
    const row = scanned(compliance, 'application/pdf')
    if (!row) return

    await renderSheet({ driverId: IMAGES })
    await expand(row.label)

    /* AC-CP-127 — a PDF makes NO request until a control is clicked. */
    expect(read).not.toHaveBeenCalled()
    /* AC-CP-122 — no frame in any state: not an empty one, not a placard, not
       a format chip in a box. An empty bordered box is §6.4's prohibition. */
    expect(document.querySelector('img[src^="blob:"]')).toBeNull()
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull()
    expect(screen.getByText(en('profile.driver.documents.pdfNoPreview'))).toBeTruthy()
    /* AC-CP-123 — nothing renders a PDF in-process. */
    expect(document.querySelector('iframe, embed, object')).toBeNull()
    /* Both controls are live: the click is what starts the read. */
    expect(screen.getByRole('button', { name: openName(row.label) })).toBeEnabled()
    expect(screen.getByRole('button', { name: downloadName(row.label) })).toBeEnabled()
  })

  it('E — a failed read replaces the frame, keeps the record row, and retries once', async () => {
    const compliance = await getDriverCompliance(IMAGES)
    const row = scanned(compliance, 'image/jpeg')
    if (!row) return
    /* `?mockFail=compliance.documentFile` in the URL is QA's route to the same
       state; this is the same shape of error, `retryable: true`. */
    const read = vi
      .spyOn(driversClient, 'getComplianceDocumentFile')
      .mockRejectedValue(
        new ApiError({ status: 503, kind: 'server', message: 'down', retryable: true }),
      )

    await renderSheet({ driverId: IMAGES })
    await expand(row.label)

    expect(await screen.findByText(en('profile.driver.documents.scanError'))).toBeTruthy()
    /* AC-CP-143 — the record row still renders under the error. */
    expect(screen.getByText(row.doc.file?.name as string)).toBeTruthy()
    /* AC-CP-140 — E and A never share a string. */
    expect(screen.queryByText(en('profile.driver.documents.noScan'))).toBeNull()
    expect(screen.getByRole('button', { name: openName(row.label) })).toBeDisabled()

    expect(read).toHaveBeenCalledTimes(1)
    await userEvent.setup().click(screen.getByRole('button', { name: en('profile.state.retry') }))
    /* Exactly one more request, not a burst. */
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2))
  })

  it('F — a record whose scan is gone says so, and offers no retry', async () => {
    const compliance = await getDriverCompliance(IMAGES)
    const row = scanned(compliance, 'image/jpeg')
    if (!row) return
    vi.spyOn(driversClient, 'getComplianceDocumentFile').mockResolvedValue({
      outcome: 'no-file-on-record',
      documentId: row.doc.id,
    })

    await renderSheet({ driverId: IMAGES })
    await expand(row.label)

    expect(await screen.findByText(en('profile.driver.documents.scanGone'))).toBeTruthy()
    /* AC-CP-144 — no `Try again`, because retrying cannot help, and no invented
       remedy, because this console cannot upload. Three diagnoses, three
       sentences, and no two of them share one. */
    expect(screen.queryByRole('button', { name: en('profile.state.retry') })).toBeNull()
    expect(screen.queryByText(en('profile.driver.documents.scanError'))).toBeNull()
    expect(screen.queryByText(en('profile.driver.documents.noScan'))).toBeNull()
    expect(screen.getByRole('button', { name: downloadName(row.label) })).toBeDisabled()
  })

  it('renders the same refusal for a late 403 as for the flag — AC-CP-142', async () => {
    const compliance = await getDriverCompliance(IMAGES)
    const row = scanned(compliance, 'image/jpeg')
    if (!row) return
    /* The permission was revoked mid-session: the flag says permitted and the
       read says otherwise. It is the same fact arriving late, so it is the same
       sentence and the same disabled controls. */
    vi.spyOn(driversClient, 'getComplianceDocumentFile').mockRejectedValue(
      new ApiError({ status: 403, kind: 'forbidden', message: 'no', retryable: false }),
    )

    await renderSheet({ driverId: IMAGES, canOpenCompliance: true })
    await expand(row.label)

    expect(await screen.findByText(en('profile.driver.refusal.viewDocument'))).toBeTruthy()
    expect(screen.getByRole('button', { name: openName(row.label) })).toBeDisabled()
    /* A refusal never offers a retry. */
    expect(screen.queryByRole('button', { name: en('profile.state.retry') })).toBeNull()
  })

  it('makes no request while every row is collapsed — AC-CP-126', async () => {
    const read = vi.spyOn(driversClient, 'getComplianceDocumentFile')
    await renderSheet({ driverId: IMAGES })
    /* Five rows on screen, none expanded. The list load costs nothing. */
    expect(read).not.toHaveBeenCalled()
  })

  it('aborts the read when the row collapses — AC-CP-128', async () => {
    const compliance = await getDriverCompliance(IMAGES)
    const row = scanned(compliance, 'image/jpeg')
    if (!row) return
    let signal: AbortSignal | undefined
    vi.spyOn(driversClient, 'getComplianceDocumentFile').mockImplementation(
      (_id: string, incoming?: AbortSignal) => {
        signal = incoming
        return new Promise(() => {})
      },
    )

    await renderSheet({ driverId: IMAGES })
    await expand(row.label)
    await waitFor(() => expect(signal).toBeInstanceOf(AbortSignal))
    expect(signal?.aborted).toBe(false)

    /* Collapse. `AccordionContent` unmounts, the read is cancelled, and no
       state update lands afterwards — five rows and an operator expanding
       faster than the reads resolve would otherwise race stale bytes into a row
       that has moved on. */
    await expand(row.label)
    await waitFor(() => expect(signal?.aborted).toBe(true))
  })

  it('names its document in both accessible names, from one key each — AC-CP-138', async () => {
    const compliance = await getDriverCompliance(IMAGES)
    const row = scanned(compliance, 'application/pdf')
    if (!row) return

    await renderSheet({ driverId: IMAGES })
    await expand(row.label)

    const open = screen.getByRole('button', { name: openName(row.label) })
    /* WCAG 2.5.3 — the accessible name CONTAINS the visible label contiguously.
       `Open the {document} scan in a new tab` would have failed this. */
    expect(open).toHaveAccessibleName(`${en('profile.driver.documents.openScan')}: ${row.label}`)
    expect(open.textContent).toContain(en('profile.driver.documents.openScan'))
    /* §9.5 — the external-link mark, `aria-hidden`, so it is in the label an
       operator SEES and not in the one a screen reader speaks. */
    expect(open.textContent).toContain('↗')
    expect(open.querySelector('[aria-hidden="true"]')?.textContent).toBe('↗')

    const download = screen.getByRole('button', { name: downloadName(row.label) })
    expect(download).toHaveAccessibleName(
      `${en('profile.driver.documents.download')}: ${row.label}`,
    )
  })
})
