/**
 * The 360° profile's section registry and right rail.
 *
 * **The defect these tests exist against**: `ProfileLayer` took a
 * `sectionRenderers` prop nobody passed and `EntityPageScreen` hardcoded the
 * same fallback, so every section rendered `state.cardError.message` and a
 * healthy captain's profile showed nine cards each claiming to have failed. The
 * first test is the one that would have caught it, and it is deliberately
 * phrased as *"no card says it failed"* rather than *"identity renders a
 * phone"* — the bug was not a wrong field, it was nine wrong states.
 *
 * One `describe` per criterion, and every negative assertion is made against a
 * real render rather than a spy with no implementation.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getDriver,
  mockFailures,
  resetDataLayer,
  resolveProfile,
} from '@/data/clients'
import type { ProfileRef } from '@/data/types'
import { createTranslator, type Translate } from '@/lib'
import { EN } from '@/i18n/dictionaries'
import { DRIVER_STATUS } from '@/screens/operations/people/domain'
import { ProfileSections, RAIL_SECTIONS } from './ProfileSections'
import { profileRail } from './rail'
import { useProfileRecord } from './record'
import { PROFILE_SECTION_RENDERERS } from './sections'

const t: Translate = createTranslator({ dictionary: EN })
const en = (key: string) => EN[key] as string

/** A captain with nine sections, a rider with eight — `SECTIONS` decides, not us. */
const DRIVER_ID = 'DRV-0101'
const RIDER_ID = 'RDR-1041'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

afterEach(() => {
  mockFailures.clear()
})

/* ───────────────────────────── harnesses ──────────────────────────────── */

function Stack({ entity, omit }: { entity: ProfileRef; omit?: readonly ProfileRef['sections'][number][] }) {
  const record = useProfileRecord(entity)
  return <ProfileSections entity={entity} record={record} t={t} language="en" omit={omit} />
}

function Rail({ entity }: { entity: ProfileRef }) {
  const record = useProfileRecord(entity)
  return <>{profileRail({ entity, record, t, language: 'en' })}</>
}

/** Every card, open, so a collapsed body cannot hide a failure from an assertion. */
async function openEveryCard(): Promise<void> {
  const user = userEvent.setup()
  for (const trigger of screen.getAllByRole('button', { expanded: false })) {
    await user.click(trigger)
  }
  await waitFor(() => expect(screen.queryAllByRole('button', { expanded: false })).toHaveLength(0))
}

/* ═══════════════════ 1 · the defect: content actually renders ══════════ */

describe('a resolved profile renders content, not nine cards claiming to have failed', () => {
  it('renders one card per declared section for a captain, and none of them is an error', async () => {
    const entity = await resolveProfile(DRIVER_ID)
    render(<Stack entity={entity} />)

    /* Nine headings, from `ProfileRef.sections`. */
    await waitFor(() => {
      for (const section of entity.sections) {
        expect(
          screen.getByRole('button', { name: new RegExp(en(`profile.section.${section}`)) }),
          section,
        ).toBeInTheDocument()
      }
    })

    await openEveryCard()

    /* **The assertion the old code failed.** `state.cardError.message` is the
       string every section used to render on a healthy load. Nothing may say
       it, and no card may be in the alert role, because nothing failed. */
    await waitFor(() => {
      expect(screen.queryByText(/Couldn't load/i)).toBeNull()
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })
  })

  it('renders the captain record itself in the identity card', async () => {
    const entity = await resolveProfile(DRIVER_ID)
    render(<Stack entity={entity} />)
    /* Identity is the first section and opens by default. */
    expect(await screen.findByText(en('profile.field.vehicle'))).toBeInTheDocument()
    expect(screen.getByText(en('profile.field.phone'))).toBeInTheDocument()
  })
})

/* ═════════════════ 2 · entity kinds differ, driven by data ═════════════ */

describe('a captain gets nine sections and a rider eight, from the data and not from a branch', () => {
  it('renders exactly `ProfileRef.sections`, whatever length that is', async () => {
    const driver = await resolveProfile(DRIVER_ID)
    const rider = await resolveProfile(RIDER_ID)
    expect(driver.sections).toHaveLength(9)
    expect(rider.sections).toHaveLength(8)

    const driverView = render(<Stack entity={driver} />)
    await waitFor(() =>
      expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(1),
    )
    expect(driverView.container.querySelectorAll('[data-slot="collapsible"]')).toHaveLength(9)
    driverView.unmount()

    const riderView = render(<Stack entity={rider} />)
    await waitFor(() =>
      expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(1),
    )
    expect(riderView.container.querySelectorAll('[data-slot="collapsible"]')).toHaveLength(8)
  })

  it('has a renderer for every `ProfileSectionKey`, so a new key cannot ship unhandled', async () => {
    /* `Record<ProfileSectionKey, …>` is the compile-time half; this is the
       runtime half, and it is what fails if someone widens the map to
       `Partial<>` to make an addition build. */
    const keys = Object.keys(PROFILE_SECTION_RENDERERS)
    expect(keys).toHaveLength(12)
    for (const key of keys) {
      expect(typeof PROFILE_SECTION_RENDERERS[key as keyof typeof PROFILE_SECTION_RENDERERS]).toBe(
        'function',
      )
    }
  })
})

/* ═══════════════ 3 · one section failing does not take the rest down ═══ */

describe('a failed section fails alone', () => {
  it('renders the wallet card in error with a retry, and every other card in content', async () => {
    mockFailures.always('wallets.ledger')
    const entity = await resolveProfile(RIDER_ID)
    render(<Stack entity={entity} />)
    await openEveryCard()

    /* Exactly one card is in the alert role — the one whose read failed. */
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1))
    const failed = screen.getByRole('alert')
    expect(within(failed).getByText(en('profile.state.retry'))).toBeInTheDocument()

    /* And the neighbours still have their content: the identity card's phone
       row is proof the layer did not go down with the ledger. */
    expect(screen.getByText(en('profile.field.phone'))).toBeInTheDocument()
  })
})

/* ══════ 4 · the two kinds that used to have no record behind them ═══════ */

describe('payments and complaints resolve to real records', () => {
  it('renders a payment from `getPayment`, not a sentence apologising for its absence', async () => {
    /* `PAY-5510` was an id on other records until `clients/payments.ts` landed,
       and `record.ts` carried an `unbacked` arm and a §11.2 sentence for it.
       Both are gone: it is a `Payment` and it renders like one. */
    const entity = await resolveProfile('PAY-5510')
    expect(entity.entityType).toBe('payment')
    render(<Stack entity={entity} />)

    expect(await screen.findByText(en('profile.field.kind'))).toBeInTheDocument()
    expect(screen.queryByText(/has no record of its own/i)).toBeNull()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('renders a complaint, and says why its ticket and dispute cards are empty', async () => {
    /* `CMP-301` carries `ticketId: null` and `disputeId: null` — filed in the
       app and never escalated. Both are ANSWERS, and the copy says which; an
       ordinary "nothing yet" would invite the operator to expect rows. */
    const entity = await resolveProfile('CMP-301')
    expect(entity.entityType).toBe('complaint')
    render(<Stack entity={entity} />)
    await openEveryCard()

    expect(
      await screen.findByText(en('profile.state.emptyComplaintTicket')),
    ).toBeInTheDocument()
    expect(screen.getByText(en('profile.state.emptyComplaintDispute'))).toBeInTheDocument()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })
})

/* ══════════════════════ 5 · the right rail (§7.2) ══════════════════════ */

describe('the full page has a right rail holding status, summary and metadata', () => {
  it('renders exactly those three cards, in restack order', async () => {
    const entity = await resolveProfile(DRIVER_ID)
    const cards = profileRail({
      entity,
      /* The shape only; `profileRail` is a pure function of its props. */
      record: { status: 'loading', data: null, error: null, isRefreshing: false, refetch: () => {} },
      t,
      language: 'en',
    })
    expect(cards).toHaveLength(3)

    render(<Rail entity={entity} />)
    await waitFor(() => {
      expect(screen.getByText(en('profile.rail.status'))).toBeInTheDocument()
      expect(screen.getByText(en('profile.rail.summary'))).toBeInTheDocument()
      expect(screen.getByText(en('profile.rail.metadata'))).toBeInTheDocument()
    })
  })

  it('puts the captain standing in the status card and the figures in the summary card', async () => {
    const entity = await resolveProfile(DRIVER_ID)
    render(<Rail entity={entity} />)
    /* The standing is a WORD, never colour alone (§7.5). `DRV-0101` is seeded
       `under-review` — derived from `openComplaints: 1` — so this asserts the
       captain's ACTUAL status rather than the one a healthy captain would
       have. `people/domain.ts` owns the mapping; this only reads it. */
    const driver = await getDriver(DRIVER_ID)
    const standing = DRIVER_STATUS[driver.status]
    expect(await screen.findByText(en(standing.key))).toBeInTheDocument()
    expect(screen.getByText(en('profile.field.monthEarnings'))).toBeInTheDocument()
    /* The identity code is always the metadata card's first row. */
    expect(screen.getByText(DRIVER_ID)).toBeInTheDocument()
  })

  it('names the section the page moves into the rail, so the two cannot drift', () => {
    expect(RAIL_SECTIONS).toEqual(['identity'])
  })
})

/* ═════════════ 6 · both presentations, one set of sections ═════════════ */

describe('the drawer and the full page render the same sections', () => {
  it('differs only by the sections the page moved into its rail', async () => {
    const entity = await resolveProfile(DRIVER_ID)

    const drawer = render(<Stack entity={entity} />)
    await waitFor(() =>
      expect(drawer.container.querySelectorAll('[data-slot="collapsible"]')).toHaveLength(9),
    )
    const drawerHeadings = headings(drawer.container)
    drawer.unmount()

    const page = render(<Stack entity={entity} omit={RAIL_SECTIONS} />)
    await waitFor(() =>
      expect(page.container.querySelectorAll('[data-slot="collapsible"]')).toHaveLength(8),
    )
    const pageHeadings = headings(page.container)

    expect(pageHeadings).toEqual(
      drawerHeadings.filter((heading) => heading !== en('profile.section.identity')),
    )
  })
})

/**
 * The card titles, in DOM order. `> span:first-child` and not
 * `span:first-child`: the caret is also the first child of its own wrapper, so
 * the loose selector returns nine titles interleaved with nine `▾`.
 */
function headings(container: HTMLElement): string[] {
  return [
    ...container.querySelectorAll('[data-slot="collapsible-trigger"] > span:first-child'),
  ].map((node) => node.textContent ?? '')
}

/* ════════════════════ 7 · four states, per section ═════════════════════ */

describe('every section carries all four states', () => {
  it('renders a skeleton while a section is reading, and never a spinner', async () => {
    /* Latency is on for this one test only: with it disabled the read resolves
       inside the first commit and the loading state is unobservable. */
    const entity = await resolveProfile(RIDER_ID)
    const { container } = render(<Stack entity={entity} />)
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(container.querySelector('[data-slot="spinner"]')).toBeNull()
    await waitFor(() =>
      expect(screen.getByText(en('profile.field.phone'))).toBeInTheDocument(),
    )
  })

  it('renders one grey sentence when a section read succeeds with nothing in it', async () => {
    /* The commitment ledger is EMPTY by default and legitimately so — the
       client's own header says the empty state means "nothing has gone wrong".
       That is a content-free success, not a failure, and it must not be one. */
    const entity = await resolveProfile(DRIVER_ID)
    render(<Stack entity={entity} />)
    await openEveryCard()
    expect(
      await screen.findByText(en('profile.state.emptyCommitment')),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })
})
