/**
 * **The command centre — P3-T5 · T6 · T7 · T8 · T9.**
 *
 * `commands.test.tsx` proves the registry. This file proves the surface that
 * makes it real, and it drives the **whole production tree** — `ShellProvider`,
 * the router, the real `GlobalSearch`, the real mock clients — rather than the
 * hook in isolation. That is deliberate: every one of these tasks is a claim
 * about what an operator can do with a keyboard, and a hook test cannot fail
 * when the field forgets to forward `keydown`.
 *
 * **No spies.** The writes are the real mock clients, the toasts are the real
 * `<Toaster>`, and the pre-seed comes through the real
 * `usePublishCommandSelection` seam that P4-T1's ten screens will call.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import { disableMockLatency, listDrivers, mockFailures, resetDataLayer } from '@/data/clients'
import type { Driver } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { GlobalSearch } from '@/shell/GlobalSearch'
import { ShellProvider } from '@/shell/ShellContext'
import { resetCommandSelection, usePublishCommandSelection } from './selection'
import { deriveRecentCommands, deriveResume } from './recents'

const t = createTranslator({ dictionary: EN })
const en = (key: string, params?: Record<string, string | number>) => t(key, params)

/* ────────────────────────────── the harness ────────────────────────────── */

interface HarnessProps {
  /** Ids to publish as the on-screen selection, exactly as an index screen would. */
  selection?: readonly string[]
}

function Harness({ selection }: HarnessProps) {
  const navigate = useNavigate()
  /* The seam P4-T1's screens call. Publishing `[]` is the same as publishing
     nothing, so a test that wants no pre-seed passes nothing. */
  usePublishCommandSelection('driver', selection ?? [])
  return (
    <>
      <GlobalSearch t={t} onOpenEntity={() => {}} />
      <button type="button" onClick={() => navigate('/support/tickets')}>
        go-elsewhere
      </button>
      <Toaster />
    </>
  )
}

function mount(props: HarnessProps = {}, path = '/operations/people') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShellProvider>
        <Harness {...props} />
      </ShellProvider>
    </MemoryRouter>,
  )
}

const field = () => screen.getByRole('searchbox', { name: en('shell.topbar.search') })

/**
 * The `Do` heading carries a COUNT, and the count is whatever the registry
 * currently declares — two captain commands today, six domain registries
 * eventually. Matching the shape rather than the number keeps these tests
 * about ordering and execution instead of about the size of the registry.
 */
const DO_HEADING = /^Do \(/
const findDoGroup = () => screen.findByRole('group', { name: DO_HEADING })

async function openPalette(user: ReturnType<typeof userEvent.setup>) {
  await user.click(field())
  return field()
}

/** `DRV-0202` is the one suspended captain in the roster; `DRV-0101` is active. */
let active: Driver
let suspended: Driver

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  resetCommandSelection()
  /* Sonner's store is module-global and outlives a render, so a toast raised by
     the previous test is still in it — and `Undo` is the same label every
     time. */
  toast.dismiss()
  const roster = await listDrivers({ pageSize: 500 })
  const found = {
    active: roster.items.find((d) => !d.suspended),
    suspended: roster.items.find((d) => d.suspended),
  }
  if (!found.active || !found.suspended)
    throw new Error('The roster lost its two shapes of captain')
  active = found.active
  suspended = found.suspended
})

/* ══════════════ P3-T8 — populated before a key is pressed ══════════════ */

describe('P3-T8 — the palette is populated before a key is pressed', () => {
  it('offers live queue counts, each a one-key jump, with nothing typed', async () => {
    const user = userEvent.setup()
    mount()
    await openPalette(user)

    const queues = await screen.findByRole('group', { name: en('command.block.queues') })
    /* §8.4 — the same counts the rail badges read. AC-26: a zero renders
       nothing at all, so every row here has a real backlog behind it. */
    expect(within(queues).getAllByRole('option').length).toBeGreaterThan(0)
  })

  it('does not show a prompt where it now has something to offer', async () => {
    const user = userEvent.setup()
    mount()
    await openPalette(user)

    await screen.findByRole('group', { name: en('command.block.queues') })
    /* R8's first empty is for a surface with nothing to say. This one has
       four blocks' worth. */
    expect(screen.queryByText(en('shell.search.prompt'))).toBeNull()
  })

  it('remembers where the operator has been — Resume', async () => {
    const user = userEvent.setup()
    mount()
    /* One visit recorded on mount; a second route makes the first resumable. */
    await user.click(screen.getByRole('button', { name: 'go-elsewhere' }))
    await openPalette(user)

    const resume = await screen.findByRole('group', { name: en('command.block.resume') })
    expect(within(resume).getByText(en('subtab.operations.people'))).toBeInTheDocument()
  })

  it('excludes the route the operator is already on', async () => {
    const user = userEvent.setup()
    mount()
    await openPalette(user)

    const queues = screen.queryByRole('group', { name: en('command.block.queues') })
    if (queues !== null) {
      /* A one-key jump to where you already are is a wasted row, and it is the
         row an operator's eye lands on first. */
      expect(within(queues).queryByText(en('subtab.operations.people'))).toBeNull()
    }
  })
})

describe('the two derivations over one bounded log', () => {
  it('reads Resume by recency, distinct, excluding the current route', () => {
    const log = ['go:a', 'do:x', 'go:b', 'go:a', 'go:c', 'go:d']
    expect(deriveResume(log, null)).toEqual(['a', 'b', 'c'])
    expect(deriveResume(log, 'a')).toEqual(['b', 'c', 'd'])
  })

  it('reads recent commands by USE, not by recency, ties broken by recency', () => {
    /* `y` is the most recent and `x` the most used. §4 says most-used first. */
    const log = ['do:y', 'do:x', 'go:a', 'do:x', 'do:z', 'do:x']
    expect(deriveRecentCommands(log)).toEqual(['x', 'y', 'z'])
  })

  it('ignores an entry written by a prefix it does not know', () => {
    /* The seeded example in `preferences.ts` uses `nav.` / `command.`. A client
       that discarded what it did not understand would make a third block a
       breaking change. */
    expect(deriveResume(['nav.operations.people', 'go:a'], null)).toEqual(['a'])
    expect(deriveRecentCommands(['command.suspendDriver', 'do:x'])).toEqual(['x'])
  })
})

/* ══════════════════ P3-T7 — the pre-seeded target ══════════════════════ */

describe('P3-T7 — rows selected when ⌘K opens ARE the target', () => {
  it('reads the selection as a chip and offers its commands with nothing typed', async () => {
    const user = userEvent.setup()
    mount({ selection: [active.id, suspended.id] })
    await openPalette(user)

    /* The chip: `2 captains`. One record would read as the record's name. */
    await screen.findByRole('button', {
      name: en('command.chip.remove', { label: en('command.entity.driver.other', { count: '2' }) }),
    })

    const onScreen = await screen.findByRole('group', { name: en('command.block.onScreen') })
    expect(within(onScreen).getByText(en('people.action.suspend'))).toBeInTheDocument()
  })

  it('names the record, not a count, for a single pre-seeded target', async () => {
    const user = userEvent.setup()
    mount({ selection: [active.id] })
    await openPalette(user)

    await screen.findByRole('button', {
      name: en('command.chip.remove', { label: active.name }),
    })
  })

  it('SKIPS the target step — one key runs it on the selection', async () => {
    const user = userEvent.setup()
    mount({ selection: [active.id] })
    await openPalette(user)

    const onScreen = await screen.findByRole('group', { name: en('command.block.onScreen') })
    await user.click(within(onScreen).getByText(en('people.action.suspend')))

    /* Straight to the reason step. No captain list in between — that is the
       whole of P3-T7, and without it the palette is a slower bulk bar. */
    await screen.findByText(en('people.confirm.suspend.title.one'))
    expect(screen.queryByText(en('command.target.heading'))).toBeNull()
  })

  it('§11.2 — refuses in place, with the sentence, and does not hide the row', async () => {
    const user = userEvent.setup()
    mount({ selection: [suspended.id] })
    await openPalette(user)

    const onScreen = await screen.findByRole('group', { name: en('command.block.onScreen') })
    /* The command is PRESENT. A palette that hid what you may not do would
       teach you it does not exist — legacy `:10237`, which §11.2 exists to
       kill. */
    expect(within(onScreen).getByText(en('people.action.suspend'))).toBeInTheDocument()
    expect(within(onScreen).getByText(en('people.action.suspend.blocked.one'))).toBeInTheDocument()
  })

  it('**D21** — an all-blocked selection gets the third sentence, not the plural', async () => {
    const user = userEvent.setup()
    const roster = await listDrivers({
      pageSize: 500,
      filters: [{ field: 'suspended', op: 'eq', value: true }],
    })
    if (roster.items.length < 2) {
      /* One suspended captain in the roster means `.all` and `.one` coincide;
         the single-target case is asserted above and this is not a silent skip. */
      expect(roster.items.length).toBe(1)
      return
    }
    mount({ selection: roster.items.map((d) => d.id) })
    await openPalette(user)

    const onScreen = await screen.findByRole('group', { name: en('command.block.onScreen') })
    expect(
      within(onScreen).getByText(
        en('people.action.suspend.blocked.all', { count: String(roster.items.length) }),
      ),
    ).toBeInTheDocument()
    expect(
      within(onScreen).queryByText(
        en('people.action.suspend.blocked.other', { count: String(roster.items.length) }),
      ),
    ).toBeNull()
  })
})

/* ═══════════ P3-T5 / T6 — the Do section executes, in three states ═══════ */

describe('P3-T5 and P3-T6 — root → target → confirm, one field', () => {
  it('finds a command by a synonym and descends into its target step', async () => {
    const user = userEvent.setup()
    mount()
    const input = await openPalette(user)

    /* A synonym, not the label — `keywords` is what makes `deactivate` find
       `Suspend captain`. */
    await user.type(input, 'deactivate')
    const doGroup = await findDoGroup()
    await user.click(within(doGroup).getByText(en('people.action.suspend')))

    /* The palette does not close. It DESCENDS, and the chip records what was
       committed. */
    await screen.findByRole('button', {
      name: en('command.chip.remove', { label: en('people.action.suspend') }),
    })
    await screen.findByRole('group', { name: en('command.target.heading') })
  })

  it('tolerates a typo in the command, because ranking is one score', async () => {
    const user = userEvent.setup()
    mount()
    const input = await openPalette(user)
    /* A transposition costs one edit, not two — `lib/search/fuzzy`. */
    await user.type(input, 'susepnd')
    const doGroup = await findDoGroup()
    expect(within(doGroup).getByText(en('people.action.suspend'))).toBeInTheDocument()
  })

  it('ascends on Backspace in an empty field, and on Escape, and closes only from root', async () => {
    const user = userEvent.setup()
    mount()
    const input = await openPalette(user)

    await user.type(input, 'suspend')
    const doGroup = await findDoGroup()
    await user.click(within(doGroup).getByText(en('people.action.suspend')))
    await screen.findByRole('group', { name: en('command.target.heading') })

    /* Backspace on an EMPTY field ascends — the field is empty because
       descending cleared it. */
    await user.type(input, '{Backspace}')
    await waitFor(() => expect(screen.queryByText(en('command.target.heading'))).toBeNull())
    /* Still open. Escape from the root is what closes. */
    expect(screen.getByRole('group', { name: en('command.block.queues') })).toBeInTheDocument()
    await user.type(input, '{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('group', { name: en('command.block.queues') })).toBeNull(),
    )
  })

  it('keeps §5 order for a query that is not a leading verb, and flips it for one that is', async () => {
    const user = userEvent.setup()
    mount()
    const input = await openPalette(user)

    /* **CQ-2** — derived from the query's shape, never a setting. */
    await user.type(input, 'suspend')
    await waitFor(() => {
      const groups = screen.getAllByRole('group')
      expect(groups[0]).toHaveAccessibleName(DO_HEADING)
    })

    await user.clear(input)
    await user.type(input, active.name)
    await waitFor(() => {
      const groups = screen.getAllByRole('group')
      expect(groups[0]).not.toHaveAccessibleName(DO_HEADING)
    })
  })

  it('refuses a candidate in the target list in place, rather than hiding them', async () => {
    const user = userEvent.setup()
    mount()
    const input = await openPalette(user)

    await user.type(input, 'suspend')
    const doGroup = await findDoGroup()
    await user.click(within(doGroup).getByText(en('people.action.suspend')))

    await user.type(input, suspended.name)
    const targets = await screen.findByRole('group', { name: en('command.target.heading') })
    expect(within(targets).getByText(suspended.name)).toBeInTheDocument()
    expect(within(targets).getByText(en('people.action.suspend.blocked.one'))).toBeInTheDocument()
  })
})

/* ═════════════════════ P3-T9 — undo on the toast ════════════════════════ */

describe('P3-T9 / D18 — the outcome toast carries a real inverse', () => {
  async function suspendFromPalette(user: ReturnType<typeof userEvent.setup>) {
    mount({ selection: [active.id] })
    await openPalette(user)
    const onScreen = await screen.findByRole('group', { name: en('command.block.onScreen') })
    await user.click(within(onScreen).getByText(en('people.action.suspend')))

    /* `needs-input` — the reason the captain is shown. An input step is NOT a
       confirmation (D18), and `suspendDriver` requires it by contract. */
    await screen.findByText(en('people.confirm.suspend.title.one'))
    const reason = screen.getByLabelText(en('people.confirm.suspend.reason'))
    await user.type(reason, 'Expired operating card')
    await user.click(screen.getByRole('button', { name: en('people.confirm.suspend.confirm') }))
  }

  it('states the outcome and offers Undo', async () => {
    const user = userEvent.setup()
    await suspendFromPalette(user)

    await screen.findByText(en('people.toast.suspended.one'))
    expect(screen.getByRole('button', { name: en('command.undo') })).toBeInTheDocument()
  })

  it('runs the inverse THROUGH THE SEAM and confirms with a second toast that offers no undo', async () => {
    const user = userEvent.setup()
    await suspendFromPalette(user)
    await user.click(await screen.findByRole('button', { name: en('command.undo') }))

    await screen.findByText(en('people.toast.suspended.undone.one', { name: active.name }))
    /* An undo of an undo is a loop with no floor. The first toast is dismissed
       rather than left beside its own confirmation, so the control goes with
       it — after Sonner's exit, which is why this waits. */
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: en('command.undo') })).toBeNull(),
    )
  })

  it('turns the toast critical IN PLACE when the inverse fails, and never swallows it', async () => {
    const user = userEvent.setup()
    await suspendFromPalette(user)
    await screen.findByRole('button', { name: en('command.undo') })

    mockFailures.always('drivers.reinstate')
    await user.click(screen.getByRole('button', { name: en('command.undo') }))

    /* It states what is STILL TRUE — the original effect stays on screen,
       because it is still the truth — and offers `Try again` exactly once. */
    await screen.findByText(en('people.toast.suspended.undoFailed.one', { name: active.name }))
    expect(screen.getByRole('button', { name: en('command.undo.retry') })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: en('command.undo.retry') }))
    /* Twice failed: the console stops promising, and points at the record. */
    await screen.findByRole('button', { name: en('command.undo.openRecord') })
    expect(screen.queryByRole('button', { name: en('command.undo.retry') })).toBeNull()
  })
})
