/**
 * The command registry — **CM-1 … CM-4** of `design/05-command-centre.md` §2,
 * phase **C-1**.
 *
 * **The load-bearing test in this file is CM-3**, and it is a regression test
 * for a bug that shipped. `Suspend captain` was declared twice in
 * `CaptainsView`: the row action carried `disabled: (d) => !canWrite ||
 * d.suspended`, the bulk action carried nothing. Selecting a suspended captain
 * and pressing the bulk bar's `Suspend` suspended them again, while the kebab
 * on that same row was disabled. Two surfaces, two answers, same operator, same
 * record. D9's whole argument for a registry is that this class of bug is
 * structural, so the test is written structurally: it asserts the three
 * surfaces reach the **same function**, and then drives two of them through the
 * real DOM to prove the wiring is not just present but used.
 *
 * The rest is the shape: ids, labels, palette coverage, the resolver's three
 * scope kinds, and the dispatch path's three outcomes.
 *
 * **No spies.** `runCommand` is driven with a recording fake `CommandHost` —
 * which is what a host *is*, so nothing is stubbed that the production path
 * does not also go through — and the writes are the real mock clients.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Toaster } from '@/components/ui/sonner'
import {
  disableMockLatency,
  getSubTabs,
  getWorkspaces,
  listDrivers,
  resetDataLayer,
} from '@/data/clients'
import type { Driver } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { CaptainsView } from '@/screens/operations/people/CaptainsView'
import { CAPTAIN_COMMANDS } from './captains'
import { SubTabShortcuts } from './SubTabShortcuts'
import { rowIntentFor, subTabForLetter, subTabLetters } from './shortcuts'
import {
  commandApplies,
  paletteCommands,
  resolveCommands,
  runCommand,
  unavailableReason,
  type Command,
  type CommandConfirmRequest,
  type CommandContext,
  type CommandHost,
} from './registry'

const t = createTranslator({ dictionary: EN })

/** `DRV-0202`, the one suspended captain in the roster (`drivers.ts:384`). */
const suspendedCaptain = (): Driver => driverFixture('DRV-0202')
/** `DRV-0101`, active. */
const activeCaptain = (): Driver => driverFixture('DRV-0101')

/**
 * **Read through the client, not the fixture** — `seam.test.ts` scans test files
 * too, and *"a component importing a fixture means the seam has failed"* applies
 * to the rows a test asserts against as much as to the rows a screen renders. A
 * test pinned to a fixture keeps passing after a `VITE_DATA_SOURCE=http`
 * cutover while the screen beside it breaks.
 *
 * Loaded once into a module cache so the helpers below stay synchronous — they
 * are called inline inside `it()` bodies, and `beforeAll` has already run by
 * then.
 */
let captains: readonly Driver[] = []

beforeAll(async () => {
  disableMockLatency()
  captains = (await listDrivers({ pageSize: 500 })).items
})

function driverFixture(id: string): Driver {
  const row = captains.find((driver) => driver.id === id)
  if (!row) throw new Error(`No captain ${id} in the roster the client served`)
  return row
}

function command(id: string): Command<Driver> {
  const found = CAPTAIN_COMMANDS.find((each) => each.id === id)
  if (!found) throw new Error(`No captain command ${id}`)
  return found
}

/**
 * A host that records what it was asked and answers however the test says.
 *
 * `answer: null` is the operator dismissing the confirmation; a string is them
 * confirming with that reason typed.
 */
function fakeHost(answer: string | null = 'Expired operating card') {
  const asked: CommandConfirmRequest[] = []
  const opened: string[] = []
  const host: CommandHost = {
    openProfile: (_entityType, entityId) => opened.push(entityId),
    confirm: (request) => {
      asked.push(request)
      return Promise.resolve(answer)
    },
  }
  return { host, asked, opened }
}

function context(
  targets: readonly Driver[],
  options: { canWrite?: boolean; host?: CommandHost } = {},
): CommandContext<Driver> {
  return {
    targets,
    t,
    language: 'en',
    session: { canWrite: options.canWrite ?? true },
    host: options.host ?? fakeHost().host,
  }
}

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/* ─────────────────────────────── the shape ─────────────────────────────── */

describe('the Command shape', () => {
  it('gives every command a unique, dotted, untranslated id', () => {
    const ids = CAPTAIN_COMMANDS.map((each) => each.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][A-Za-z]*\.[a-z][A-Za-z]*$/)
  })

  it('resolves every declared label through a real dictionary key — CM-2', () => {
    for (const each of CAPTAIN_COMMANDS) {
      expect(EN[each.titleKey], each.id).toBeTypeOf('string')
      if (each.compactTitleKey !== undefined) {
        expect(EN[each.compactTitleKey], each.id).toBeTypeOf('string')
      }
    }
  })

  /**
   * §6 / the plan's instruction: *"write the Arabic synonyms into `keywords`
   * now, even though Arabic is unreachable. Retrofitting them across six
   * registries later is strictly worse."* They are match tokens, not
   * translations, so they are correct to sit beside the English ones.
   */
  it('carries Arabic match tokens on every command', () => {
    const arabic = /[؀-ۿ]/
    for (const each of CAPTAIN_COMMANDS) {
      expect(each.keywords.length, each.id).toBeGreaterThan(2)
      expect(each.keywords.some((word) => arabic.test(word)), each.id).toBe(true)
      expect(each.keywords.some((word) => !arabic.test(word)), each.id).toBe(true)
    }
  })

  /**
   * **R5a** — red is spent on the unrecoverable, and a suspension is undone by
   * the command declared next to it. `people/copy.ts` already recorded that
   * call for the confirmation's primary button; this keeps the palette from
   * reaching a different one.
   */
  it('does not mark a reversible captain action destructive', () => {
    expect(command('captain.suspend').affordance).toBe('default')
    expect(command('captain.reinstate').affordance).toBe('default')
  })

  /** §3 — `Suspend` needs a reason typed, so it is not an immediate command. */
  it('declares the arity each command actually has', () => {
    expect(command('captain.suspend').arity).toBe('needs-input')
    expect(command('captain.reinstate').arity).toBe('needs-target')
    expect(command('captain.openProfile').arity).toBe('needs-target')
  })
})

/* ───────────────────────────────── CM-4 ───────────────────────────────── */

describe('CM-4 — every id is in the palette or says why not', () => {
  it('accounts for every command', () => {
    const shown = paletteCommands(CAPTAIN_COMMANDS)
    const hidden = CAPTAIN_COMMANDS.filter((each) => each.hiddenFromPalette !== undefined)
    expect(shown.length + hidden.length).toBe(CAPTAIN_COMMANDS.length)
  })

  it('requires a real sentence, not an empty string standing in for true', () => {
    for (const each of CAPTAIN_COMMANDS) {
      if (each.hiddenFromPalette === undefined) continue
      expect(each.hiddenFromPalette.trim().length, each.id).toBeGreaterThan(20)
    }
  })

  it('keeps both mutating commands reachable by keyboard', () => {
    const ids = paletteCommands(CAPTAIN_COMMANDS).map((each) => each.id)
    expect(ids).toContain('captain.suspend')
    expect(ids).toContain('captain.reinstate')
  })
})

/* ─────────────────────────────── the resolver ─────────────────────────── */

describe('resolveCommands', () => {
  it('gives the row menu every captain command, in declaration order', () => {
    const ids = resolveCommands(CAPTAIN_COMMANDS, {
      entityType: 'driver',
      plural: false,
    }).map((each) => each.id)
    expect(ids).toEqual(['captain.openProfile', 'captain.suspend', 'captain.reinstate'])
  })

  /** Twenty profile layers is not an action, so `plural: false` withholds it. */
  it('gives the bulk bar only the commands that mean something over a set', () => {
    const ids = resolveCommands(CAPTAIN_COMMANDS, {
      entityType: 'driver',
      plural: true,
    }).map((each) => each.id)
    expect(ids).toEqual(['captain.suspend', 'captain.reinstate'])
  })

  it('offers nothing captain-shaped over another entity type', () => {
    expect(resolveCommands(CAPTAIN_COMMANDS, { entityType: 'ticket' })).toEqual([])
  })

  it('matches the two scope kinds no captain command uses yet', () => {
    const global: Command<unknown> = {
      ...command('captain.reinstate'),
      scope: { kind: 'global' },
    } as unknown as Command<unknown>
    const route: Command<unknown> = {
      ...command('captain.reinstate'),
      scope: { kind: 'route', subTabId: 'operations-people' },
    } as unknown as Command<unknown>

    expect(commandApplies(global, {})).toBe(true)
    expect(commandApplies(global, { entityType: 'driver' })).toBe(true)
    expect(commandApplies(route, { subTabId: 'operations-people' })).toBe(true)
    expect(commandApplies(route, { subTabId: 'financials-payouts' })).toBe(false)
    expect(commandApplies(route, {})).toBe(false)
  })
})

/* ────────────────────────────────── CM-3 ────────────────────────────────── */

describe('CM-3 — the row menu, the bulk bar and the palette agree', () => {
  /**
   * The three surfaces, as the three shapes they actually call with:
   *
   *   row      one record, from the kebab (`plural: false`)
   *   bulk     the selection resolved to records (`plural: true`)
   *   palette  §3's pre-seeded target — *"if rows are selected when ⌘K opens,
   *            the selection IS the target"* — which is the same array again.
   *
   * Every combination of command × record × role is asserted, rather than the
   * one case that was broken, because the point is that no case can diverge.
   */
  const surfaces = (targets: readonly Driver[], canWrite: boolean) => ({
    row: unavailableReason(command('captain.suspend'), context(targets, { canWrite })),
    bulk: unavailableReason(command('captain.suspend'), context(targets, { canWrite })),
    palette: unavailableReason(command('captain.suspend'), context(targets, { canWrite })),
  })

  it('returns one answer per command, record and role', () => {
    for (const cmd of CAPTAIN_COMMANDS) {
      for (const targets of [
        [activeCaptain()],
        [suspendedCaptain()],
        [activeCaptain(), suspendedCaptain()],
      ]) {
        for (const canWrite of [true, false]) {
          const ctx = () => context(targets, { canWrite })
          const answers = [
            unavailableReason(cmd, ctx()),
            unavailableReason(cmd, ctx()),
            unavailableReason(cmd, ctx()),
          ]
          expect(new Set(answers).size, `${cmd.id} ${String(canWrite)}`).toBe(1)
        }
      }
    }
  })

  /** The bug, stated as it was: the bulk bar allowed what the row refused. */
  it('refuses a suspended captain in the bulk bar exactly as in the row menu', () => {
    const one = surfaces([suspendedCaptain()], true)
    expect(one.row).toBe('This captain is already suspended.')
    expect(one.bulk).toBe(one.row)
    expect(one.palette).toBe(one.row)
  })

  /**
   * A mixed selection is refused, and the sentence counts the **blocked**
   * subset rather than the selection — "1 of the selected captains" tells the
   * operator how much of what they picked is the problem.
   *
   * The strict reading is a ruling this task had to make and is flagged to
   * product-designer: acting on the eligible subset would silently drop
   * records the operator picked, and refusing only when *every* target is
   * ineligible would reintroduce the divergence being removed.
   */
  it('refuses a mixed selection and names how many are blocked', () => {
    const reason = unavailableReason(
      command('captain.suspend'),
      context([activeCaptain(), suspendedCaptain()]),
    )
    expect(reason).toBe('1 of the selected captains are already suspended.')
  })

  it('lets an eligible selection through', () => {
    expect(unavailableReason(command('captain.suspend'), context([activeCaptain()]))).toBeNull()
    expect(
      unavailableReason(command('captain.reinstate'), context([suspendedCaptain()])),
    ).toBeNull()
  })

  /**
   * **CQ-7** — the role half never reaches a domain predicate. `roleRefusal`
   * is the one place `session` is read, so the refusal an operator without
   * `approve_drivers` sees is the permission sentence and not a domain one.
   */
  it('routes the role refusal through the one seam, ahead of domain state', () => {
    const reason = unavailableReason(
      command('captain.suspend'),
      context([activeCaptain()], { canWrite: false }),
    )
    expect(reason).toBe(EN['people.action.noPermission'])
  })
})

/* ───────────────────────────── dispatch — CQ-4 ───────────────────────────── */

describe('runCommand', () => {
  it('refuses before the confirmation is ever asked', async () => {
    const { host, asked } = fakeHost()
    const result = await runCommand(
      command('captain.suspend'),
      context([suspendedCaptain()], { host }),
    )
    expect(result).toEqual({ kind: 'refused', reason: 'This captain is already suspended.' })
    expect(asked).toEqual([])
  })

  it('reports a dismissed confirmation as cancelled, with no write', async () => {
    const { host, asked } = fakeHost(null)
    const result = await runCommand(
      command('captain.suspend'),
      context([activeCaptain()], { host }),
    )
    expect(result.kind).toBe('cancelled')
    expect(asked).toHaveLength(1)
  })

  /**
   * §9.1 / §5.3 — the question names the verb and the count, the body says what
   * will **not** change, the primary repeats the verb, and the reason field is
   * present because `suspendDriver` requires one by contract (§10.4).
   */
  it('asks §5.3’s question and returns the record the client returned', async () => {
    const { host, asked } = fakeHost('Expired operating card')
    const result = await runCommand(
      command('captain.suspend'),
      context([activeCaptain()], { host }),
    )

    expect(asked[0]?.title).toBe('Suspend 1 captain?')
    expect(asked[0]?.confirmLabel).toBe('Suspend captains')
    expect(asked[0]?.reason?.label).toBe('Reason')

    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(result.outcome?.message).toBe('Captain suspended')
    expect(result.outcome?.changed?.[0]?.suspended).toBe(true)
    expect(result.outcome?.changed?.[0]?.suspensionReason).toBe('Expired operating card')
  })

  it('counts the selection in the question and in the toast', async () => {
    const { host, asked } = fakeHost('Expired operating card')
    const result = await runCommand(
      command('captain.suspend'),
      context([activeCaptain(), driverFixture('DRV-0102')], { host }),
    )
    expect(asked[0]?.title).toBe('Suspend 2 captains?')
    expect(result.kind === 'ran' && result.outcome?.message).toBe('2 captains suspended')
  })

  /** `Reinstate` takes no reason — `reinstateDriver` has no parameter for one. */
  it('asks for no reason where the domain requires none', async () => {
    const { host, asked } = fakeHost('')
    await runCommand(command('captain.reinstate'), context([suspendedCaptain()], { host }))
    expect(asked[0]?.reason).toBeUndefined()
  })

  /** A navigating command runs, writes nothing, and toasts nothing. */
  it('navigates without an outcome', async () => {
    const { host, opened } = fakeHost()
    const result = await runCommand(
      command('captain.openProfile'),
      context([suspendedCaptain()], { host }),
    )
    expect(opened).toEqual(['DRV-0202'])
    expect(result).toEqual({ kind: 'ran', outcome: null })
  })
})

/* ─────────────────────── CM-1 and CM-2, in the source ─────────────────────── */

const SRC = join(process.cwd(), 'src')
const captainsViewSource = readFileSync(
  join(SRC, 'screens', 'operations', 'people', 'CaptainsView.tsx'),
  'utf8',
)

describe('CM-1 — CaptainsView declares no action inline', () => {
  it('names command ids instead of building action objects', () => {
    expect(captainsViewSource).toContain('resolveCommands(CAPTAIN_COMMANDS')
    expect(captainsViewSource).toContain('unavailableReason(command')
    expect(captainsViewSource).toContain('runCommand(command')
  })

  it('holds no action label, predicate or confirmation copy of its own', () => {
    const body = captainsViewSource.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const key of [
      'people.action.suspend',
      'people.action.reinstate',
      'people.action.viewProfile',
      'people.bulk.suspend',
      'people.bulk.reinstate',
      'people.confirm.suspend.title.one',
      'people.confirm.reinstate.title.one',
      'people.toast.suspended.one',
      'people.toast.reinstated.one',
    ]) {
      expect(body, key).not.toContain(key)
    }
    /* The predicate that used to live here, and the client calls it guarded. */
    expect(body).not.toContain('driver.suspended')
    expect(body).not.toContain('suspendDriver')
    expect(body).not.toContain('reinstateDriver')
  })
})

describe('CM-2 — a label exists in exactly one place', () => {
  it('names the literal in one dictionary entry and in no .tsx', () => {
    const entries = Object.entries(EN).filter(([, value]) => value === 'Suspend captain')
    expect(entries.map(([key]) => key)).toEqual(['people.action.suspend'])
    expect(captainsViewSource).not.toContain("'Suspend captain'")
    expect(captainsViewSource).not.toContain('"Suspend captain"')
  })
})

/* ──────────────────────── CM-3, through the real DOM ──────────────────────── */

/**
 * The registry tests above prove the three surfaces call one function. These
 * two prove `CaptainsView` is what calls it — a registry nobody consumes would
 * pass every assertion in this file and change nothing on screen.
 */
describe('CM-3 in CaptainsView', () => {
  function mount(canWrite = true) {
    return render(
      <MemoryRouter initialEntries={['/operations/people?view=captains']}>
        <CaptainsView
          chrome={{
            tabs: [{ id: 'captains', label: 'Captains' }],
            activeTab: 'captains',
            onSelectTab: () => {},
            onTotal: () => {},
          }}
          t={t}
          language="en"
          canWrite={canWrite}
          currentUserId="USR-001"
        />
        <Toaster />
      </MemoryRouter>,
    )
  }

  /**
   * The roster is sorted by name and paged at 25, and `DRV-0202` is not on page
   * one — so the row is reached the way an operator would reach it, through the
   * search field. That also keeps the assertion about one row rather than about
   * whichever rows the fixture happens to put first.
   */
  async function rowFor(user: ReturnType<typeof userEvent.setup>, name: string) {
    await screen.findByRole('table')
    await user.type(screen.getByLabelText('Search captains'), name)
    const cell = await screen.findByText(name)
    const tr = cell.closest('tr')
    if (!tr) throw new Error(`No row for ${name}`)
    return tr
  }

  /**
   * §11.2 / **AC-368** — disabled in place **with the reason as real text**.
   * Before C-1 the item was disabled and silent, which `rowActions.tsx` has
   * had the field to fix since it was written.
   */
  it('disables the row action in place and renders its reason', async () => {
    const user = userEvent.setup()
    mount()
    const row = await rowFor(user, 'Majed Al-Shamrani')
    await user.click(within(row).getByRole('button', { name: 'More actions for DRV-0202' }))

    const item = await screen.findByRole('menuitem', { name: 'Suspend captain' })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('This captain is already suspended.')).toBeInTheDocument()

    /* And the mirror is offered, rather than the legacy roster's one-or-the-
       other (`eyvar_ops_panel_v40_fixed.html:4113`). */
    expect(screen.getByRole('menuitem', { name: 'Reinstate captain' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  /**
   * **The regression test for the shipped bug.** Same record, same operator,
   * the other surface. Before C-1 this opened the confirmation and suspended an
   * already-suspended captain.
   *
   * `DataTable`'s `BulkAction` is `{ label, onClick }` with no `disabled` and no
   * `reason`, so the refusal is stated after the click rather than at rest —
   * weaker than the row menu, recorded in the handoff, and still the same
   * sentence from the same predicate.
   */
  it('refuses the same record in the bulk bar, with the same sentence', async () => {
    const user = userEvent.setup()
    mount()
    const row = await rowFor(user, 'Majed Al-Shamrani')
    await user.click(within(row).getByRole('checkbox', { name: 'Select row' }))
    await user.click(await screen.findByRole('button', { name: 'Suspend' }))

    await waitFor(() =>
      expect(screen.getByText('This captain is already suspended.')).toBeInTheDocument(),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  /** The eligible path still works end to end — the toast, and the new status. */
  it('suspends an eligible captain and holds the returned row', async () => {
    const user = userEvent.setup()
    mount()
    const row = await rowFor(user, 'Ahmed Salem')
    await user.click(within(row).getByRole('button', { name: 'More actions for DRV-0101' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Suspend captain' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Suspend 1 captain?')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Reason'), 'Expired operating card')
    await user.click(within(dialog).getByRole('button', { name: 'Suspend captains' }))

    await waitFor(() => expect(screen.getByText('Captain suspended')).toBeInTheDocument())
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

/**
 * **T6.2 — the keyboard grammar.** The two halves are tested differently on
 * purpose: the mapping is a pure function and is asserted as one, and the
 * wiring is driven through the real DOM, because a grammar nothing installs is
 * the same defect as a preference nothing reads.
 */
describe('T6.2 — j / k / . / g, resolved through the registry', () => {
  /** The same roster CM-3 drives, for the same reason: it is a real table. */
  function mountRoster() {
    return render(
      <MemoryRouter initialEntries={['/operations/people?view=captains']}>
        <CaptainsView
          chrome={{
            tabs: [{ id: 'captains', label: 'Captains' }],
            activeTab: 'captains',
            onSelectTab: () => {},
            onTotal: () => {},
          }}
          t={t}
          language="en"
          canWrite
          currentUserId="USR-001"
        />
      </MemoryRouter>,
    )
  }

  /** The path an operator takes to a row that is not on page one. */
  async function rosterRow(user: ReturnType<typeof userEvent.setup>, name: string) {
    await screen.findByRole('table')
    await user.type(screen.getByLabelText('Search captains'), name)
    const tr = (await screen.findByText(name)).closest('tr')
    if (!tr) throw new Error(`No row for ${name}`)
    return tr
  }

  /** The router's current path, read where a component can see it. */
  function locationProbe(): { read: () => string; Probe: () => null } {
    let path = ''
    return {
      read: () => path,
      Probe: () => {
        path = useLocation().pathname
        return null
      },
    }
  }

  it('names the three row intents and yields every other press', () => {
    const bare = { metaKey: false, ctrlKey: false, altKey: false }
    expect(rowIntentFor({ ...bare, key: 'j' })).toBe('row.next')
    expect(rowIntentFor({ ...bare, key: 'k' })).toBe('row.previous')
    expect(rowIntentFor({ ...bare, key: '.' })).toBe('row.actions')

    /* Not ours, and each for its own reason: `Escape` belongs to whatever is
       above the row, `J` is a capital in a field, ⌘K is global search. */
    expect(rowIntentFor({ ...bare, key: 'Escape' })).toBeNull()
    expect(rowIntentFor({ ...bare, key: 'J' })).toBeNull()
    expect(rowIntentFor({ ...bare, key: 'k', metaKey: true })).toBeNull()
  })

  it('gives every sub-tab of a workspace its own letter', () => {
    for (const workspace of getWorkspaces()) {
      const rows = getSubTabs(workspace.id)
      const letters = subTabLetters(rows)
      expect(letters.size, `${workspace.id} loses a sub-tab to a letter clash`).toBe(rows.length)
      expect(subTabForLetter(workspace.id, 'zz')).toBeNull()
    }
    /* The mapping is the id's, not the title's — a translated title would give
       an Arabic operator a different keyboard from an English one. */
    expect(subTabForLetter('operations', 'a')?.subTabId).toBe('operations-assurance')
  })

  it('moves row focus with j and k', async () => {
    const user = userEvent.setup()
    mountRoster()
    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').slice(1)
    rows[0]!.focus()

    await user.keyboard('j')
    expect(rows[1]).toHaveFocus()
    await user.keyboard('k')
    expect(rows[0]).toHaveFocus()
  })

  it('opens the focused row’s actions with a full stop', async () => {
    const user = userEvent.setup()
    mountRoster()
    const row = await rosterRow(user, 'Ahmed Salem')
    row.focus()

    await user.keyboard('.')

    expect(await screen.findByRole('menuitem', { name: 'Suspend captain' })).toBeInTheDocument()
  })

  it('jumps to a sub-tab on g then its letter, and not on the letter alone', async () => {
    const user = userEvent.setup()
    const { read, Probe } = locationProbe()
    render(
      <MemoryRouter initialEntries={['/operations/overview']}>
        <SubTabShortcuts />
        <Probe />
      </MemoryRouter>,
    )

    /* A bare letter is somebody's search query, not a navigation. */
    await user.keyboard('a')
    expect(read()).toBe('/operations/overview')

    await user.keyboard('ga')
    expect(read()).toBe(subTabForLetter('operations', 'a')?.path)
  })

  it('leaves the grammar alone while the operator is typing', async () => {
    const user = userEvent.setup()
    const { read, Probe } = locationProbe()
    render(
      <MemoryRouter initialEntries={['/operations/overview']}>
        <SubTabShortcuts />
        <Probe />
        <input aria-label="Search" />
      </MemoryRouter>,
    )

    await user.click(screen.getByLabelText('Search'))
    await user.keyboard('ga')

    expect(read()).toBe('/operations/overview')
    expect(screen.getByLabelText('Search')).toHaveValue('ga')
  })
})
