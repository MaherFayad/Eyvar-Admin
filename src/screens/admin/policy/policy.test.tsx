/**
 * Admin › Policy — the screen.
 *
 * The data-layer half of P6-T3 is in `policyDraft.test.ts`; this file asserts
 * the two things only the rendered screen can answer.
 *
 * **The load-bearing one: an inherited target is not an input.** F-014 needed a
 * field pre-filled with an effective value in order to exist. A test that
 * asserted *"the cell shows 1440"* would pass against the defect — legacy showed
 * 1440 too, in a text box, and that was the whole problem. So the assertion is
 * about the **control**: the inherited cell renders text and an `Override`
 * button and **no spinbutton**, and the overridden cell renders a spinbutton and
 * a `Revert to inherited` button. Then the instrument is proved by asserting the
 * opposite of each on the other cell.
 *
 * AC-919 … AC-925.
 */

import { configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getOperationalPolicy,
  getRouteTable,
  mockFailures,
  resetDataLayer,
  switchMockUser,
  useEmptyReasonCodes,
} from '@/data/clients'
import type { SubTabRoute } from '@/data/types'
import { ShellProvider, useShell } from '@/shell/ShellContext'
import { AdminPolicyScreen } from './AdminPolicyScreen'
import { POLICY_EN } from './copy'

/**
 * The screen mounts six panes, a 72-cell SLA grid and a full `DataTable` in one
 * pass. Under jsdom, with this file running beside its sibling, the first paint
 * lands past Testing Library's 1000 ms default and every `findBy` times out
 * while the screen is still, correctly, in its loading state. The wait is
 * lengthened rather than the assertions loosened: a `queryBy` fallback would
 * turn a real regression into a passing test.
 */
configure({ asyncUtilTimeout: 10_000 })

const row = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'admin-policy')
  if (!found) throw new Error('No route-table row for admin-policy')
  return found
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/**
 * The save bar itself is `AppLayout`'s, not this screen's — the route reports a
 * dirty state and the shell renders the bar (§9.2 state 5). Mounting the whole
 * layout to observe it would test the layout; this probe observes **the contract
 * between them**, which is the part this screen owns.
 */
function SaveBarProbe() {
  const { saveBar } = useShell()
  if (!saveBar) return null
  return (
    <div data-testid="save-bar">
      <span>{saveBar.entity}</span>
      <button type="button" onClick={saveBar.onSave}>
        Save
      </button>
      <button type="button" onClick={saveBar.onDiscard}>
        Discard
      </button>
    </div>
  )
}

function renderPolicy(path = '/admin/policy') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <AdminPolicyScreen row={row()} />
        <SaveBarProbe />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const copy = (key: string): string => {
  const value = POLICY_EN[key]
  if (!value) throw new Error(`No POLICY_EN key ${key}`)
  return value
}

/** Selects one queue on the start side; its `<section>` is the end side. */
async function selectQueue(labelKey: string) {
  const list = within(await screen.findByRole('list', { name: copy('policy.sla.grid.title') }))
  await userEvent.click(list.getByRole('button', { name: new RegExp(`^${copy(labelKey)}`) }))
  return screen.findByRole('region', { name: copy(labelKey) })
}

/** The `<section>` for one queue, so a cell query cannot stray. */
async function queueSection(labelKey: string) {
  return within(await selectQueue(labelKey))
}

/* ═══════════════ the four states ═══════════════ */

describe('four states', () => {
  /** AC-919 — the skeleton exists, and it is reachable. */
  it('renders a loading state before the document arrives', () => {
    /* Latency restored for this one test only: at 0 ms the mock resolves before
       React paints and the loading state is unobservable — which is exactly how
       a loading state that was never built passes review. */
    renderPolicy()
    expect(screen.getByLabelText(copy('policy.loading'))).toBeInTheDocument()
  })

  /** AC-920 — the error state, with a retry that re-issues the read. */
  it('renders an error with a retry when the document fails to load', async () => {
    mockFailures.once('policy.get')
    renderPolicy()

    expect(await screen.findByText(copy('policy.error.read'))).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: copy('policy.error.retry') }))
    expect(await screen.findByText(copy('policy.dispatch.title'))).toBeInTheDocument()
  })

  it('renders every pane once the document arrives, one per view (D20)', async () => {
    const panes: Array<[string, string[]]> = [
      ['dispatch', ['policy.dispatch.title']],
      ['cities', ['policy.cities.title']],
      ['limits', ['policy.limits.title']],
      ['sla', ['policy.sla.tiers.title', 'policy.sla.grid.title']],
      ['reasons', ['policy.reasons.title']],
    ]
    for (const [view, keys] of panes) {
      const mounted = renderPolicy('/admin/policy?view=' + view)
      for (const key of keys) expect((await screen.findAllByText(copy(key))).length).toBeGreaterThan(0)
      mounted.unmount()
    }
  })

  /** AC-921 — the registry's first-run empty, which is not the filtered one. */
  it('renders the first-run empty when no reason code is defined', async () => {
    useEmptyReasonCodes()
    renderPolicy('/admin/policy?view=reasons')
    expect(await screen.findByText(copy('policy.reasons.empty.heading'))).toBeInTheDocument()
    expect(screen.getByText(copy('policy.reasons.empty.body'))).toBeInTheDocument()
  })
})

/* ═══════════ inherited is not an input — the F-014 guard ═══════════ */

describe('an inherited SLA target has no field to read back', () => {
  /**
   * AC-922. `dispute` inherits every cell. The T2 resolution therefore renders
   * the tier's 1440 **as text**, badged `Inherited`, with an `Override` button
   * and no spinbutton anywhere in the cell.
   */
  it('renders text and an Override button, and no spinbutton', async () => {
    renderPolicy('/admin/policy?view=sla')
    const dispute = await queueSection('policy.sla.queue.dispute')

    expect(dispute.getAllByText(copy('policy.sla.state.inherited')).length).toBeGreaterThan(0)
    /* Grouped, because it goes through `formatCount` in the UI language — a raw
       `1440` here would mean an Arabic page renders an ungrouped numeral. */
    expect(dispute.getByText('1,440 min from T2')).toBeInTheDocument()
    expect(dispute.getByText('240 min from T1')).toBeInTheDocument()
    expect(
      dispute.getByRole('button', {
        name: 'Override the resolution target for Disputes at T2',
      }),
    ).toBeInTheDocument()
    /* The assertion the defect could not have survived. */
    expect(dispute.queryAllByRole('spinbutton')).toHaveLength(0)
  })

  /**
   * AC-923 — the instrument, proved. `Safety and incidents` overrides T2's first
   * response, so **that** queue does render a spinbutton, and it renders the
   * revert control beside it. If the query above were incapable of finding a
   * spinbutton, this would fail.
   */
  it('renders a field and a revert control on a queue that overrides', async () => {
    renderPolicy('/admin/policy?view=sla')
    const incident = await queueSection('policy.sla.queue.incident')

    expect(incident.getAllByText(copy('policy.sla.state.overridden')).length).toBeGreaterThan(0)
    const field = incident.getByRole('spinbutton', {
      name: 'Safety and incidents · T2 · first response',
    })
    expect(field).toHaveValue(5)
    expect(
      incident.getByRole('button', {
        name: 'Revert the first response target for Safety and incidents at T2 to the tier default',
      }),
    ).toBeInTheDocument()
  })

  /**
   * AC-924 — `Override` then `Revert to inherited` is a true round trip: the
   * spinbutton appears, then disappears, and the save bar goes away with it
   * because the draft is byte-identical to what was loaded again.
   */
  it('override then revert leaves the screen clean', async () => {
    renderPolicy('/admin/policy?view=sla')
    const disputeLabel = copy('policy.sla.queue.dispute')
    await selectQueue('policy.sla.queue.dispute')

    const override = await screen.findByRole('button', {
      name: 'Override the resolution target for Disputes at T2',
    })
    await userEvent.click(override)

    let dispute = within(screen.getByRole('region', { name: disputeLabel }))
    const field = dispute.getByRole('spinbutton', { name: 'Disputes · T2 · resolution' })
    expect(field).toHaveValue(1440)
    /* Dirty: the route has reported it and the shell holds a save bar. */
    expect(await screen.findByTestId('save-bar')).toHaveTextContent(copy('policy.entity'))

    await userEvent.click(
      dispute.getByRole('button', {
        name: 'Revert the resolution target for Disputes at T2 to the tier default',
      }),
    )

    dispute = within(screen.getByRole('region', { name: disputeLabel }))
    expect(dispute.queryByRole('spinbutton', { name: 'Disputes · T2 · resolution' })).toBeNull()
    await waitFor(() => expect(screen.queryByTestId('save-bar')).toBeNull())
  })

  /**
   * AC-925 — and the save that follows an override writes **one** field, not
   * seventy-two. The screen-level statement of the F-014 criterion.
   */
  it('saves only the target the operator overrode', async () => {
    renderPolicy('/admin/policy?view=sla')
    const before = await getOperationalPolicy()
    await selectQueue('policy.sla.queue.dispute')

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Override the resolution target for Disputes at T2',
      }),
    )
    await userEvent.click(await screen.findByRole('button', { name: /^Save$/ }))

    await waitFor(async () => {
      const after = await getOperationalPolicy()
      const disputeT2 = after.sla.queues
        .find((queue) => queue.queueId === 'dispute')
        ?.tiers.find((cell) => cell.tier === 'T2')
      expect(disputeT2?.resolutionMinutes).toBe(1440)
    })

    const after = await getOperationalPolicy()
    /* Everything else stayed inherited. Count the nulls; the defect emptied them. */
    const nulls = (policy: typeof after) =>
      policy.sla.queues.flatMap((queue) =>
        queue.tiers.flatMap((cell) =>
          [cell.firstResponseMinutes, cell.resolutionMinutes].filter((v) => v === null),
        ),
      ).length
    expect(nulls(after)).toBe(nulls(before) - 1)
  })
})

/* ═══════════ the registry ═══════════ */

describe('the reason-code registry', () => {
  it('shows a retired code in the table, badged and dated', async () => {
    renderPolicy('/admin/policy?view=reasons')
    expect(await screen.findByText('TRP_GHOST_COMPLETE')).toBeInTheDocument()
    expect(screen.getAllByText(copy('policy.reasons.state.retired')).length).toBeGreaterThan(0)
    expect(screen.getByText('Use TRP_FALSE_COMPLETE instead')).toBeInTheDocument()
  })

  it('renders both labels, with the Arabic one in its own direction', async () => {
    renderPolicy('/admin/policy?view=reasons')
    const arabic = await screen.findByText('عدم حضور الكابتن')
    expect(arabic).toHaveAttribute('dir', 'rtl')
    expect(arabic).toHaveAttribute('lang', 'ar')
  })
})

/* ═══════════ §11.2 — disabled in place, with the reason ═══════════ */

describe('a role that cannot write', () => {
  it('disables the controls rather than hiding them, and states why', async () => {
    /* USR-3 leads Customer Support and holds no `manage_settings`. */
    await switchMockUser('USR-3')
    const dispatch = renderPolicy()

    expect(await screen.findByText(copy('policy.dispatch.title'))).toBeInTheDocument()
    /* The control is still there — that is the rule — and it is dead. */
    expect(screen.getByLabelText(copy('policy.dispatch.radius'))).toBeDisabled()
    expect(screen.getAllByText(copy('policy.blocked.permission')).length).toBeGreaterThan(0)
    dispatch.unmount()

    renderPolicy('/admin/policy?view=cities')
    expect(await screen.findByRole('button', { name: copy('policy.cities.add') })).toBeDisabled()
  })
})
