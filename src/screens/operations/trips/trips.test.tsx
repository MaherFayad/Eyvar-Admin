/**
 * **Operations › Trips — P4-T1 (the bulk bar and D21's set rule) and P8-T1
 * (360° reach from every cell that names an entity).**
 *
 * Three things are under test and none can be checked by reading the source:
 *
 *   1. **D21's three sentences and its escape hatch.** The rule is not "some
 *      rows are ineligible" — it is a specific sentence naming a specific
 *      count, a *different* sentence when every target is blocked, and a
 *      `Select only the N eligible` control that changes the SELECTION rather
 *      than narrowing the command. The last of those is the one a source read
 *      cannot verify: the assertion has to be that the **bar's own count**
 *      changed, because AC-961's promise is that the toast can never name a
 *      different number from the bar.
 *   2. **Every bulk action reaches the data layer.** A bulk action that only
 *      fires a toast is worse than none, and the only proof is that the write
 *      is reachable by failure injection — a screen that toasted without
 *      calling `flagTrip` would pass every rendering assertion.
 *   3. **A link is a link.** `<button onClick={navigate}>` and `<Link>` render
 *      the same text and behave completely differently: only one is
 *      middle-clickable, right-click-copyable and reachable with the keyboard's
 *      own link semantics. `getByRole('link')` is the difference, and it is why
 *      these assertions query by role and not by text.
 *
 * Fixtures are read **through the client**, never imported — a test that
 * imports a fixture is the same seam breach the screens are being checked for,
 * and `seam.test.ts` scans this file too.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { disableMockLatency, listTrips, mockFailures, resetDataLayer } from '@/data/clients'
import type { Trip } from '@/data/types'
import { ShellProvider } from '@/shell/ShellContext'
import { AppRoutes } from '@/routes'
import { Toaster } from '@/components/ui/sonner'
import { EN } from '@/i18n/dictionaries'
import { TRIPS_EN } from './copy'

const t = (key: string, params: Record<string, string> = {}) =>
  Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), TRIPS_EN[key] as string)
/** The shell dictionary, for the keys the command registry owns. */
const en = (key: string) => EN[key] as string

const INDEX = '/operations/quick-rides'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  /* Sonner's store outlives a render, so a toast raised by an earlier test is
     still queued when the next one mounts a Toaster. */
  toast.dismiss()
})

beforeAll(() => {
  /* jsdom implements no Pointer Capture API and Radix's menus call three of its
     methods. Stubs, not simulations — the same posture as `src/test/setup.ts`. */
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>
  proto.hasPointerCapture ??= () => false
  proto.setPointerCapture ??= () => {}
  proto.releasePointerCapture ??= () => {}
  proto.scrollIntoView ??= () => {}
})

function renderApp(path: string = INDEX) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AppRoutes />
      </ShellProvider>
    </MemoryRouter>,
  )
}

/** The page's rows, read through the client so the expectations match the UI. */
let page: Trip[]
let flagged: Trip[]
let unflagged: Trip[]

beforeAll(async () => {
  /* D1b — the sub-tab under test is Quick rides, and the screen now scopes its
     query to `kind`. The expectations have to be scoped the same way or they
     name subscription legs the table will never render. */
  page = (
    await listTrips({
      view: 'all',
      sort: { field: 'startedAt', dir: 'desc' },
      filters: [{ field: 'kind', op: 'eq', value: 'Quick ride' }],
    })
  ).items
  flagged = page.filter((trip) => trip.flagged)
  unflagged = page.filter((trip) => !trip.flagged)
  /* Throw rather than assert non-null: if the fixtures stop carrying both a
     flagged and an unflagged trip on page one, these tests are not failing —
     they are testing nothing, and that must be loud. */
  if (flagged.length === 0 || unflagged.length === 0) {
    throw new Error(
      'Trips page one must contain at least one flagged and one unflagged trip for the D21 tests.',
    )
  }
})

/**
 * Tick a row's checkbox by the trip it belongs to. Retried, because the id cell
 * is replaced when `useEntityLinks` resolves and a node read either side of
 * that is detached from its row.
 */
async function select(user: ReturnType<typeof userEvent.setup>, trip: Trip) {
  const row = await waitFor(() => {
    const found = screen.getByText(trip.id).closest('tr')
    if (!found) throw new Error(`No row for ${trip.id}`)
    return found as HTMLElement
  })
  await user.click(within(row).getByRole('checkbox'))
}

describe('P8-T1 — every cell that names an entity opens that entity', () => {
  it('renders the trip id as a real link into the 360° layer, not a button', async () => {
    renderApp()
    const first = page[0]!
    /* **`getByRole('link')` is the assertion.** The cell used to be a
       `<button onClick={navigate}>`, which renders the same text, is not
       middle-clickable, has no copyable address, and carried
       `focus:outline-none` with nothing in its place. */
    const link = await screen.findByRole('link', { name: t('trips.open.trip', { id: first.id }) })
    expect(link).toHaveAttribute('href', expect.stringContaining(`entity=${first.id}`))
  })

  it('opens the rider and the captain from their own cells', async () => {
    renderApp()
    const withCaptain = page.find((trip) => trip.driverId !== null)!
    await screen.findByText(withCaptain.id)

    /* `getAllBy`, not `getBy`: one person can be the rider on one row and the
       captain on another, and both cells legitimately link to the same profile.
       Asserting on the FIRST is the assertion that matters — that the cell is a
       link at all, and that it points at the right entity. */
    expect(
      screen.getAllByRole('link', {
        name: t('trips.open.rider', { name: withCaptain.riderName }),
      })[0],
    ).toHaveAttribute('href', expect.stringContaining(`entity=${withCaptain.riderId}`))
    expect(
      screen.getAllByRole('link', {
        name: t('trips.open.captain', { name: withCaptain.driverName ?? '' }),
      })[0],
    ).toHaveAttribute('href', expect.stringContaining(`entity=${withCaptain.driverId}`))
  })

  it('renders a captain that cannot be resolved as plain text with its reason, not a dead link', async () => {
    const noCaptain = page.find((trip) => trip.driverId === null)
    if (!noCaptain) return /* No such row on page one; nothing to assert. */
    renderApp()
    await screen.findByText(noCaptain.id)

    /* §11.2 — the words are on screen and there is no link to nowhere. */
    expect(screen.getAllByText(t('trips.captain.none')).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('link', { name: t('trips.open.captain', { name: '' }) }),
    ).not.toBeInTheDocument()
    /* The reason is REAL TEXT reachable by assistive technology, not a title. */
    expect(screen.getAllByText(t('trips.captain.none.reason')).length).toBeGreaterThan(0)
  })
})

/**
 * **The refusal sentence, found by containment rather than by equality.**
 *
 * D21 §1.3: when two refused bulk actions carry *different* sentences the
 * refusal panel prefixes each with the action it belongs to
 * (`table.bulk.refusalLabelled`, `{action} — {reason}`), because otherwise the
 * operator cannot tell which sentence belongs to which dead button. When one
 * action is refused, or several share a reason, the line is unprefixed.
 *
 * So a screen's test cannot assert exact text without also asserting how many
 * of its *other* bulk actions happen to be refused in the same state — which is
 * not what AC-958 says. AC-958 says the refusal names the count, and that is
 * what this matches.
 */
function refusalSentence(sentence: string): HTMLElement {
  const found = screen
    .getAllByText((_, element) => element?.textContent?.includes(sentence) === true)
    .filter((element) => element.children.length === 0)
  const first = found[0]
  if (!first) throw new Error(`No refusal line containing: ${sentence}`)
  return first
}

describe('P4-T1 / D21 — the bulk bar, its three sentences and its escape hatch', () => {
  it('offers the bar with a count and a clear once anything is selected', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText(page[0]!.id)

    /* Before P4-T1 the checkbox column rendered and produced NOTHING: no bar,
       no count, no way to clear. */
    await select(user, unflagged[0]!)
    const bar = await screen.findByRole('group', { name: /1/ })
    expect(within(bar).getByRole('button', { name: t('trips.bulk.flag') })).toBeEnabled()
  })

  it('AC-958 — refuses the whole set when ANY selected trip is blocked, naming the count', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText(page[0]!.id)

    await select(user, unflagged[0]!)
    await select(user, flagged[0]!)

    /* The strict reading: one blocked record refuses the command for the whole
       selection. Running on the eligible subset would silently drop the record
       the operator picked. */
    const flag = screen.getByRole('button', { name: t('trips.bulk.flag') })
    expect(flag).toBeDisabled()
    expect(
      refusalSentence(t('trips.action.flag.blocked.other', { count: '1' })),
    ).toBeInTheDocument()
  })

  it('AC-960 — an all-blocked selection gets the `.all` sentence and no escape hatch', async () => {
    if (flagged.length < 2) return /* Needs two blocked rows to be a set. */
    const user = userEvent.setup()
    renderApp()
    await screen.findByText(page[0]!.id)

    await select(user, flagged[0]!)
    await select(user, flagged[1]!)

    /* `.other` would read `2 of the selected trips are already flagged`, which
       is TRUE of 2-of-2 and invites the operator to deselect a few — when there
       is nothing to deselect to. That is the whole argument for a third key. */
    expect(refusalSentence(t('trips.action.flag.blocked.all', { count: '2' }))).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Select only/i })).not.toBeInTheDocument()
  })

  it('AC-959 — `Select only the N eligible` changes the SELECTION, and the bar says so', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText(page[0]!.id)

    await select(user, unflagged[0]!)
    await select(user, flagged[0]!)

    /* BOTH bulk actions are refused by this selection — `Flag` by the already
       flagged row, `Remove flag` by the unflagged one — so each renders its own
       escape hatch with its own eligible set. That is correct: the sets differ.
       The first belongs to `Flag`, which is the command under test. */
    const narrow = screen.getAllByRole('button', { name: /Select only/i })[0]!
    await user.click(narrow)

    /**
     * **This is the assertion the ruling turns on.** Narrowing is not a partial
     * apply: the bar's own count has to change, because AC-961's promise is
     * that the outcome can never name a different number from the bar. Checking
     * only that the button re-enabled would pass on an implementation that
     * silently dropped the blocked row at commit — which is the behaviour D21
     * forbids.
     */
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('trips.bulk.flag') })).toBeEnabled(),
    )
    expect(screen.getByRole('group', { name: /1/ })).toBeInTheDocument()
  })
})

describe('P4-T1 — the bulk action reaches the data layer', () => {
  /**
   * **`mockFailures` is the seam assertion, and the observable is the
   * SELECTION.** A screen that toasted success without calling `unflagTrip`
   * would pass every rendering test above; it cannot pass this pair.
   *
   * The selection is cleared only on the success path — after the client has
   * returned and its rows have been held over the list — so the bar's presence
   * or absence after the click is a direct read of whether the write happened.
   * That is a stronger observable than a toast, which is rendered by a
   * `<Toaster>` this tree does not mount.
   */
  it('clears the selection when the write lands, so the bar reflects the record', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findByText(page[0]!.id)

    await select(user, flagged[0]!)
    await user.click(await screen.findByRole('button', { name: t('trips.bulk.unflag') }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: t('trips.bulk.unflag') })).not.toBeInTheDocument(),
    )
  })

  it('keeps the selection when the write is refused, so nothing claims to have happened', async () => {
    const user = userEvent.setup()
    /* A failure injected at the CLIENT is unreachable unless the client is
       actually called — which is exactly what makes this the seam assertion. */
    mockFailures.always('trips.flag')
    renderApp()
    await screen.findByText(page[0]!.id)

    await select(user, flagged[0]!)
    await user.click(await screen.findByRole('button', { name: t('trips.bulk.unflag') }))

    /* The bar is still there, still holding the record, and nothing on screen
       says the flag came off. */
    await waitFor(() =>
      expect(screen.getByRole('button', { name: t('trips.bulk.unflag') })).toBeInTheDocument(),
    )
  })
})

describe('T6.1 / D18 — flagging a trip is reversible from the toast', () => {
  /* X9: the two commands were declared twice and the screen-side pair carried
     no undo handle, so a flag placed on the wrong ride was unrecoverable from
     the surface that placed it. `src/commands/trips.ts` declares the inverse
     and `toastOutcome` is what puts it on screen. */
  function renderWithToasts(path: string = INDEX) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <ShellProvider>
          <AppRoutes />
          {/* Sonner renders nothing without a mounted Toaster, and D18's one
              control lives inside the toast. */}
          <Toaster />
        </ShellProvider>
      </MemoryRouter>,
    )
  }

  it('offers Undo inside the window, and the undo reverts the flag through the client', async () => {
    const user = userEvent.setup()
    const target = unflagged[0]!
    renderWithToasts()
    await screen.findByText(page[0]!.id)
    await select(user, target)
    await user.click(await screen.findByRole('button', { name: t('trips.bulk.flag') }))

    /* The category is the point of the flag, so the form still asks for it. */
    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: t('trips.reason.fareDispute') }))
    await user.click(screen.getByRole('button', { name: t('trips.flag.confirm') }))

    const undo = await screen.findByRole('button', { name: en('command.undo') })
    expect(undo, 'a flag must offer its inverse, not just report success').toBeInTheDocument()

    await user.click(undo)
    /* The second toast, which only `unflagTrip` returning can produce. */
    expect(
      await screen.findByText(
        (en('trips.toast.flagged.undone.one') as string).replace('{id}', target.id),
      ),
    ).toBeInTheDocument()
  })
})

/**
 * **T9.3 / O9 — the fare cell.** The rule is about the trip's STATUS, not the
 * number. Every open, cancelled and no-show trip carries `fareHalalas: 0`, so
 * a cell keyed off the value prints `0.00 SAR` on a ride nobody has paid for
 * and on one that never happened. Neither is true, and only a render shows it.
 */
describe('T9.3 / O9 — the fare column says what it knows and nothing more', () => {
  /** The `Fare` cell of the row naming `trip`, found through the header. */
  function fareCell(trip: Trip): HTMLElement {
    const row = screen.getByText(trip.id).closest('tr')
    if (!row) throw new Error(`No row for ${trip.id}`)
    const headers = Array.from(row.closest('table')!.querySelectorAll('thead th'))
    const index = headers.findIndex((th) => th.textContent?.includes(t('trips.col.fare')))
    if (index < 0) throw new Error('No Fare column header')
    return row.cells[index] as HTMLElement
  }

  it('reads Not settled while a trip is still under way', async () => {
    const open = page.find((trip) =>
      ['requested', 'assigned', 'en-route', 'in-trip'].includes(trip.status),
    )
    if (!open) throw new Error('Page one must carry an open trip or this test asserts nothing.')
    renderApp()
    await screen.findByText(open.id)

    expect(fareCell(open)).toHaveTextContent(t('trips.fare.notSettled'))
  })

  it('is blank on a cancelled or no-show trip, not a zero and not a mark', async () => {
    const ended = page.find((trip) => trip.status === 'cancelled' || trip.status === 'no-show')
    if (!ended) throw new Error('Page one must carry a cancelled trip or this test asserts nothing.')
    renderApp()
    await screen.findByText(ended.id)

    /* `textContent`, not `toHaveTextContent('')` — jest-dom treats the empty
       string as a substring match and passes on any content at all. */
    expect(fareCell(ended).textContent).toBe('')
  })

  it('still prints the money on a completed trip', async () => {
    const done = page.find((trip) => trip.status === 'done' || trip.status === 'late')
    if (!done) throw new Error('Page one must carry a completed trip or this test asserts nothing.')
    renderApp()
    await screen.findByText(done.id)

    expect(fareCell(done)).toHaveTextContent(/\d/)
    expect(fareCell(done)).not.toHaveTextContent(t('trips.fare.notSettled'))
  })
})
