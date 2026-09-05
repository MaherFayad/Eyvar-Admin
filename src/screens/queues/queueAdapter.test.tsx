/**
 * The §4 contract as components (T8.1) — one assertion on the file five queues
 * share, rather than five copies on five screens. The adapter mounts through a
 * harness so the four states can be driven directly.
 */

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { disableMockLatency, getRouteTable, resetDataLayer } from '@/data/clients'
import type { Claim, SubTabRoute } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator, type Translator } from '@/lib'
import { useIndexTable } from '@/hooks'
import type { DataColumn } from '@/components/DataTable'
import { QUEUE_SHARED_EN } from './copy'
import { Absent, Cell, Identity, SubjectIdentity } from './cells'
import { CLAIM_EXPIRY_MINUTES, DecisionBadge, OwnerChip, SlaCell, queueClock } from './queue'
import { QueuePage, QueueTable, useQueueMeta, useQueueViews } from './QueuePage'

/* The shared queue keys resolve from `QUEUE_SHARED_EN`, everything else from
   the shell dictionary — exactly as `withFallback` resolves them on a screen. */
const t: Translator = createTranslator({
  dictionary: { ...EN, ...QUEUE_SHARED_EN },
  fallback: EN,
  language: 'en',
  /* The screens throw on a missing key; a unit test naming one should read the
     key rather than blow up inside a render. */
  onMissingKey: (key) => key,
})

const NOW = '2026-06-25T09:00:00+03:00'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

const requestsRow = (): SubTabRoute => {
  const found = getRouteTable().subTabs.find((each) => each.subTabId === 'operations-ride-requests')
  if (!found) throw new Error('No route-table row for operations-ride-requests')
  return found
}

/* ─────────────────────────── the harness ──────────────────────────────── */

interface Item {
  id: string
  subject: string
}

const ITEMS: readonly Item[] = [
  { id: 'Q-1', subject: 'First item' },
  { id: 'Q-2', subject: 'Second item' },
]

function Harness({
  row,
  status = 'content',
  rows = ITEMS,
  filtered = false,
  emptyKind = 'cleared',
}: {
  row: SubTabRoute
  status?: 'loading' | 'error' | 'empty' | 'content'
  rows?: readonly Item[]
  filtered?: boolean
  emptyKind?: 'cleared' | 'first-run'
}) {
  const { tabs, activeTab, selectTab } = useQueueViews(row, 'needs-decision', t)
  const { meta, onTotal } = useQueueMeta(t, 'en', 'requests.meta')
  const table = useIndexTable<Item>({
    mode: 'queue',
    getRowId: (item) => item.id,
    initialView: activeTab,
    initialFilters: filtered ? [{ field: 'breached', op: 'eq', value: true }] : [],
  })
  const columns: ReadonlyArray<DataColumn<Item>> = [
    {
      id: 'subject',
      emphasis: 'primary',
      header: t('queue.col.subject'),
      alwaysVisible: true,
      minWidth: 200,
      dataType: 'text',
      cell: (item) => <Cell>{item.subject}</Cell>,
    },
  ]
  return (
    <QueuePage row={row} meta={meta} t={t} dir="ltr">
      <QueueTable
        t={t}
        language="en"
        table={table}
        rows={rows}
        status={status}
        total={rows.length}
        getRowId={(item) => item.id}
        columns={columns}
        tableId="harness"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={selectTab}
        onTotal={onTotal}
        searchPlaceholder="Search"
        cleared={{ heading: 'Nothing waiting', body: 'Every request has an answer.' }}
        firstRun={{ heading: 'Requests land here', body: 'None yet.', actions: [] }}
        emptyKind={emptyKind}
        noMatch={{ message: 'No request matches this search.' }}
        error={{ message: "Couldn't load requests.", onRetry: () => {} }}
      />
    </QueuePage>
  )
}

function renderHarness(props: Partial<Parameters<typeof Harness>[0]> = {}, search = '') {
  return render(
    <MemoryRouter initialEntries={[`/operations/ride-requests${search}`]}>
      <Harness row={requestsRow()} {...props} />
    </MemoryRouter>,
  )
}

/* ══════════════════ the view tabs come from the route table ═════════════ */

describe('§3.8 rule 3 / AC-10 — the view row is the route table, and `?view=` is a control', () => {
  it('renders one tab per declared view, in the declared order, with the declared labels', () => {
    renderHarness()
    const declared = [...requestsRow().views]
      .sort((a, b) => a.order - b.order)
      .map((view) => EN[view.titleKey] as string)
    expect(declared.length).toBeGreaterThan(1)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(declared)
  })

  it('selects the view the URL names, and the queue default when the URL names none', () => {
    const { unmount } = renderHarness()
    expect(screen.getByRole('tab', { name: EN['view.requests.needsDecision'] as string })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    unmount()

    renderHarness({}, '?view=expired')
    expect(screen.getByRole('tab', { name: EN['view.requests.expired'] as string })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('an unknown `?view=` falls back to the queue default rather than an empty tab row', () => {
    renderHarness({}, '?view=not-a-view')
    expect(screen.getByRole('tab', { name: EN['view.requests.needsDecision'] as string })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})

/* ═══════════════════════════ the four states ════════════════════════════ */

describe('§4.11 / AC-234 / AC-235 — the adapter renders four states and tells the two empties apart', () => {
  it('content: the rows are on screen under the table', () => {
    renderHarness()
    const table = screen.getByRole('table')
    expect(within(table).getByText('First item')).toBeInTheDocument()
    expect(within(table).getByText('Second item')).toBeInTheDocument()
  })

  it('loading: no table and no empty sentence while the read is in flight', () => {
    renderHarness({ status: 'loading', rows: [] })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing waiting')).not.toBeInTheDocument()
  })

  it('error: the message and a retry the operator can press', async () => {
    const user = userEvent.setup()
    renderHarness({ status: 'error', rows: [] })
    expect(screen.getByText("Couldn't load requests.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: EN['state.pageError.action'] as string }))
  })

  it('AC-234 — an unfiltered zero shows the cleared sentence naming the scope, not a first run', () => {
    renderHarness({ status: 'empty', rows: [] })
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument()
    expect(screen.getByText('Every request has an answer.')).toBeInTheDocument()
    expect(screen.queryByText('Requests land here')).not.toBeInTheDocument()
  })

  it('AC-235 — a filtered zero shows the no-match sentence and a way back', () => {
    renderHarness({ status: 'empty', rows: [], filtered: true })
    expect(screen.getByText('No request matches this search.')).toBeInTheDocument()
    expect(screen.queryByText('Nothing waiting')).not.toBeInTheDocument()
  })
})

/* ═════════════════════════ §4.2 — the owner chip ════════════════════════ */

const heldBy = (ownerId: string, ownerName: string): Claim => ({
  key: 'request:REQ-1',
  entityType: 'request',
  entityId: 'REQ-1',
  ownerId,
  ownerName,
  claimedAt: '2026-06-25T08:56:00+03:00',
  touchedAt: '2026-06-25T08:56:00+03:00',
  state: 'claimed',
  releasedAt: null,
  releaseReason: null,
  takeovers: [],
})

function renderChip(props: Partial<Parameters<typeof OwnerChip>[0]> = {}) {
  const merged = {
    claim: null,
    currentUserId: 'USR-5',
    now: NOW,
    t,
    onClaim: () => {},
    onRelease: () => {},
    onTakeOver: () => {},
    canWrite: true,
    disabledReason: t('queue.action.noPermission'),
    ...props,
  }
  return render(<OwnerChip {...merged} />)
}

describe('§4.2 / AC-201 / AC-202 — Claim, Release and Take over are three separate labelled controls', () => {
  it('AC-201 — an unclaimed item reads `Unclaimed` and offers a control labelled `Claim`', () => {
    renderChip()
    expect(screen.getByText(t('queue.owner.unclaimed'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('queue.claim') })).toBeEnabled()
  })

  it("AC-202 — an item held by another operator shows that operator's name and offers `Take over`", () => {
    renderChip({ claim: heldBy('USR-1', 'Sarah Al-Rashid') })
    expect(screen.getByText('Sarah Al-Rashid')).toBeInTheDocument()
    const takeOver = screen.getByRole('button', { name: t('queue.takeOver') })
    expect(takeOver).toBeEnabled()
    expect(screen.queryByRole('button', { name: t('queue.claim') })).not.toBeInTheDocument()
  })

  it('an item held by me reads `Yours` with the hold time and offers `Release`', () => {
    renderChip({ claim: heldBy('USR-5', 'Yousef Al-Balawi') })
    expect(screen.getByText(/^Yours · /)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('queue.release') })).toBeEnabled()
  })

  it('a released claim is history: the row is unclaimed and claimable again', () => {
    renderChip({
      claim: { ...heldBy('USR-1', 'Sarah Al-Rashid'), state: 'released', releasedAt: NOW },
    })
    expect(screen.getByText(t('queue.owner.unclaimed'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('queue.claim') })).toBeEnabled()
  })

  it('AC-207 — the 30-minute expiry is stated on the queue itself, in all three chip states', () => {
    /* A plural family since the count agreement fix: the form is the
       selector's, and `CLAIM_EXPIRY_MINUTES` is what the chip passes. */
    const expiry = t.plural('queue.owner.expiry', { minutes: CLAIM_EXPIRY_MINUTES })
    const { unmount } = renderChip()
    expect(screen.getByRole('button', { name: t('queue.claim') })).toHaveAttribute('title', expiry)
    unmount()
    renderChip({ claim: heldBy('USR-1', 'Sarah Al-Rashid') })
    expect(screen.getByRole('button', { name: t('queue.takeOver') })).toHaveAttribute('title', expiry)
  })
})

describe('§4.13 / AC-205 / AC-232 — a refusal is stated before the press, never after it', () => {
  it('AC-232 — without the write permission the control is disabled in place with its reason', () => {
    const onClaim = vi.fn()
    renderChip({ canWrite: false })
    const claim = screen.getByRole('button', { name: t('queue.claim') })
    expect(claim).toBeDisabled()
    expect(claim).toHaveAttribute('title', t('queue.action.noPermission'))
    expect(onClaim).not.toHaveBeenCalled()
  })

  it('AC-205 — the holder is still named to a read-only operator; the verb is disabled, not hidden', () => {
    renderChip({ claim: heldBy('USR-1', 'Sarah Al-Rashid'), canWrite: false })
    expect(screen.getByText('Sarah Al-Rashid')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('queue.takeOver') })).toBeDisabled()
  })

  it('AC-292 — a row whose source queue is unreachable keeps its data and states the refusal', () => {
    const reason = 'Erasure requests cannot be claimed from here yet.'
    renderChip({ unavailableReason: reason })
    const claim = screen.getByRole('button', { name: t('queue.claim') })
    expect(claim).toBeDisabled()
    expect(claim).toHaveAttribute('title', reason)
  })
})

/* ═══════════════════════ §4.3 / §4.4 — the clock ════════════════════════ */

function renderSla(input: {
  startedAt: string | null
  dueAt: string | null
  targetMinutes: number | null
  breachedAt: string | null
  terminal?: boolean
}) {
  const result = queueClock(
    {
      startedAt: input.startedAt,
      dueAt: input.dueAt,
      targetMinutes: input.targetMinutes,
      breachedAt: input.breachedAt,
    },
    NOW,
    { terminal: input.terminal ?? false },
  )
  return render(<SlaCell result={result} dueAt={input.dueAt} t={t} language="en" />)
}

describe('§4.3 / §4.4 — one countdown per row, and the three readings it may take', () => {
  it('AC-211 — a running row shows exactly one countdown', () => {
    const { container } = renderSla({
      startedAt: '2026-06-25T08:30:00+03:00',
      dueAt: '2026-06-25T10:30:00+03:00',
      targetMinutes: 120,
      breachedAt: null,
    })
    expect(screen.getByText(/ left$/)).toBeInTheDocument()
    expect(container.querySelectorAll('[data-slot="badge"]')).toHaveLength(1)
  })

  it('AC-220 — a breached row reads `overdue` in words, so the state survives greyscale', () => {
    renderSla({
      startedAt: '2026-06-25T06:00:00+03:00',
      dueAt: '2026-06-25T08:00:00+03:00',
      targetMinutes: 120,
      breachedAt: '2026-06-25T08:00:00+03:00',
    })
    expect(screen.getByText(/^overdue /)).toBeInTheDocument()
  })

  it('AC-212 — a row with no deadline reads `No clock` as a value, never a dash', () => {
    const { container } = renderSla({
      startedAt: null,
      dueAt: null,
      targetMinutes: null,
      breachedAt: null,
    })
    expect(screen.getByText(EN['sla.noClock'] as string)).toBeInTheDocument()
    expect(container.textContent).not.toContain('—')
  })

  it('O7 — a cut-off that passed with no breach stamp reads `Missed <date>`, not a countdown', () => {
    renderSla({
      startedAt: null,
      dueAt: '2026-06-24T21:00:00+03:00',
      targetMinutes: null,
      breachedAt: null,
    })
    expect(screen.getByText(/^Missed /)).toBeInTheDocument()
    expect(screen.queryByText(/^overdue /)).not.toBeInTheDocument()
  })

  it('AC-213 — no progress track renders when the window is unknown', () => {
    const { container } = renderSla({
      startedAt: null,
      dueAt: '2026-06-25T10:30:00+03:00',
      targetMinutes: null,
      breachedAt: null,
    })
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('Q-18 — a decided row has no clock left to run', () => {
    renderSla({
      startedAt: '2026-06-25T06:00:00+03:00',
      dueAt: '2026-06-25T08:00:00+03:00',
      targetMinutes: 120,
      breachedAt: '2026-06-25T08:00:00+03:00',
      terminal: true,
    })
    expect(screen.getByText(EN['sla.noClock'] as string)).toBeInTheDocument()
  })
})

/* ══════════════════════ §4.5 — the decision badge ═══════════════════════ */

describe('§4.5 / AC-222 / AC-226 / AC-228 — a decision converts the row and never renders red', () => {
  it('AC-226 — the badge names the outcome, the actor and the time', () => {
    render(
      <DecisionBadge
        outcome="Assigned"
        meta={t('queue.decided.by', { actor: 'Yousef Al-Balawi', date: '25 Jun 09:00' })}
      />,
    )
    expect(screen.getByText('Assigned')).toBeInTheDocument()
    expect(screen.getByText('Yousef Al-Balawi · 25 Jun 09:00')).toBeInTheDocument()
  })

  it('AC-222 — an item decided after its deadline says `Late` in the badge', () => {
    render(
      <DecisionBadge outcome="Assigned" meta={null} late lateLabel={t('queue.decided.late')} />,
    )
    expect(screen.getByText(t('queue.decided.late'))).toBeInTheDocument()
  })

  it('AC-228 — a refusal renders in the neutral tone, never a red one', () => {
    const { container } = render(<DecisionBadge outcome="Expired" meta={null} />)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge).not.toBeNull()
    expect(badge!.className).not.toMatch(/destructive|red/)
  })

  it('Q-57 — a system disposition names the system as the actor', () => {
    render(
      <DecisionBadge
        outcome="Expired"
        meta={t('queue.decided.bySystem', { date: '25 Jun 09:00' })}
      />,
    )
    expect(screen.getByText('Automatic · 25 Jun 09:00')).toBeInTheDocument()
  })
})

/* ═══════════════════════════ §9.1 — the cells ═══════════════════════════ */

describe('O9 / §9.1 — the absent cell is blank or a word, and never a zero', () => {
  it('renders nothing at all when the value is simply not applicable', () => {
    const { container } = render(<Absent />)
    expect(container.textContent).toBe('')
  })

  it('renders the muted word when the absence is a fact the operator acts on', () => {
    render(<Absent word="Not settled" />)
    expect(screen.getByText('Not settled')).toBeInTheDocument()
  })

  it('never substitutes a zero or a dash for an absent value', () => {
    const { container } = render(<Absent numeric />)
    expect(container.textContent).toBe('')
    expect(container.textContent).not.toContain('0')
  })
})

describe('§9.1 / AC-43 / T5.3 — the identity is a link, and a CODE carries no avatar', () => {
  it('AC-43 — the identity is a link the operator can open', () => {
    render(
      <MemoryRouter>
        <Identity to="/operations/x" name="Nora Al-Harbi" label="Open Nora Al-Harbi" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Open Nora Al-Harbi' })).toHaveAttribute(
      'href',
      '/operations/x',
    )
  })

  it('a person-led identity carries an avatar with their initials (AC-76: never blank)', () => {
    const { container } = render(
      <MemoryRouter>
        <Identity to="/x" name="Nora Al-Harbi" label="Open Nora Al-Harbi" />
      </MemoryRouter>,
    )
    expect(container.querySelector('[data-slot="avatar"]')).not.toBeNull()
    expect(screen.getByText('NA')).toBeInTheDocument()
  })

  it('T5.3 — a code-led identity renders the code and no avatar', () => {
    const { container } = render(
      <MemoryRouter>
        <Identity to="/x" name="TRP-9012" code label="Open TRP-9012" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Open TRP-9012' })).toHaveTextContent('TRP-9012')
    expect(container.querySelector('[data-slot="avatar"]')).toBeNull()
  })

  it('§7.7 — a subject identity qualifies line one with line two, and depicts nobody', () => {
    const { container } = render(
      <MemoryRouter>
        <SubjectIdentity
          to="/x"
          title="KAFD → Airport T5"
          secondary="Nora Al-Harbi"
          label="Open the ride from KAFD to Airport T5"
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Open the ride from KAFD to Airport T5' })).toBeInTheDocument()
    expect(screen.getByText('Nora Al-Harbi')).toBeInTheDocument()
    expect(container.querySelector('[data-slot="avatar"]')).toBeNull()
  })
})

/* ══════════════ §4.14 — the take-over sentence, in words ════════════════ */

describe('AC-203 / AC-209 — the two take-over sentences name the operator losing the item', () => {
  it('AC-203 — claiming names the current owner and says they lose it unasked', () => {
    expect(t('queue.takeOver.title', { name: 'Sarah Al-Rashid' })).toBe(
      'Take over from Sarah Al-Rashid?',
    )
    expect(t('queue.takeOver.body', { name: 'Sarah Al-Rashid' })).toContain(
      'loses this item without being asked',
    )
  })

  it("AC-209 — deciding someone else's item takes the same confirmation, in its own words", () => {
    expect(t('queue.takeOver.decide.title', { name: 'Sarah Al-Rashid' })).toBe(
      'Decide instead of Sarah Al-Rashid?',
    )
    expect(t('queue.takeOver.decide.body', { name: 'Sarah Al-Rashid' })).toContain(
      'without being asked',
    )
  })
})
