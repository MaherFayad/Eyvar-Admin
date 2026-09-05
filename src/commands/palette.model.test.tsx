/**
 * **The palette MODEL — P2 of `COMMAND-PALETTE-DISCOVERY.md`.**
 *
 * `palette.test.tsx` drives the shipped field and popover. This file drives
 * `usePalette` through a harness that renders the model and nothing else, so a
 * failure here names a decision (which rows, in what order, what a key does)
 * rather than a pixel. The harness is deliberately dumb: it renders every
 * contract field the model fills and adds no behaviour of its own, except the
 * one thing `GlobalSearch` also does — close when the model declines `Escape`.
 *
 * **No spies.** The reads are the real mock clients and the writes go through
 * `command.run` (CQ-4).
 */

import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getNavCounts,
  getSession,
  listDrivers,
  resetDataLayer,
  updateUiState,
} from '@/data/clients'
import type { Driver, NavCounts } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { createTranslator } from '@/lib'
import { recentEvents, resetAnalytics } from '@/lib/analytics'
import { permissionContext, type PermissionContext } from '@/shell/permissions'
import { resetCommandSelection, usePublishCommandSelection } from './selection'
import { commandSession } from './session'
import { usePalette, type PaletteRow } from './usePalette'

const t = createTranslator({ dictionary: EN })
const en = (key: string, params?: Record<string, string | number>) => t(key, params)

/** The sub-tab every test opens on, so `Go to` and `Resume` have a workspace. */
const HERE = 'operations-people'

let permissions: PermissionContext
let navCounts: NavCounts
let active: Driver
let suspended: Driver

beforeAll(async () => {
  disableMockLatency()
  permissions = permissionContext(await getSession())
  navCounts = await getNavCounts()
  const roster = await listDrivers({ pageSize: 500 })
  const found = {
    active: roster.items.find((driver) => !driver.suspended),
    suspended: roster.items.find((driver) => driver.suspended),
  }
  if (!found.active || !found.suspended) throw new Error('The roster lost its two shapes')
  active = found.active
  suspended = found.suspended
})

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
  resetCommandSelection()
  resetAnalytics()
})

/* ────────────────────────────── the harness ────────────────────────────── */

interface HarnessProps {
  /** Published exactly as an index screen publishes it, for the pre-seed. */
  selection?: readonly string[]
}

function Row({ row }: { row: PaletteRow }) {
  return (
    <div>
      <button type="button" onClick={row.onSelect} disabled={row.refusal !== null}>
        <span>{row.title}</span>
        {row.subtitle !== null && <span>{row.subtitle}</span>}
        {row.badge !== null && <span>{row.badge}</span>}
        {row.descends === true && <span>{'>'}</span>}
      </button>
      {row.refusal !== null && <p>{row.refusal}</p>}
      {row.shortcut ? <kbd>{row.shortcut}</kbd> : null}
      {row.onDescend ? (
        <button type="button" onClick={row.onDescend}>{`actions: ${row.title}`}</button>
      ) : null}
    </div>
  )
}

function Harness({ selection }: HarnessProps) {
  const [open, setOpen] = useState(true)
  usePublishCommandSelection('driver', selection ?? [])
  const palette = usePalette({
    open,
    close: () => setOpen(false),
    t,
    language: 'en',
    session: commandSession(permissions.permissions),
    subTabId: HERE,
    openEntityId: null,
    openEntityType: null,
    navCounts,
    permissions,
    navigate: () => {},
    openProfile: () => {},
    guide: null,
  })

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        reopen
      </button>
      {palette.scope ? (
        <button type="button" onClick={palette.scope.onRemove}>
          {`scope: ${palette.scope.label}`}
        </button>
      ) : null}
      {palette.chips.map((chip) => (
        <button key={chip.key} type="button" onClick={chip.onRemove} aria-label={chip.removeLabel}>
          {chip.label}
        </button>
      ))}
      <input
        aria-label="query"
        value={palette.query}
        readOnly={palette.busy}
        onChange={(event) => palette.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (palette.handleKeyDown(event)) return
          /* What `GlobalSearch` does with the key the model declined. */
          if (event.key === 'Escape') setOpen(false)
        }}
      />
      {open ? (
        <>
          <p>{`step: ${palette.step}`}</p>
          <p>{`rows: ${palette.count ?? 0}`}</p>
          <p>{`status: ${palette.listStatus}`}</p>
          {palette.blocks.map((block) => (
            <section key={block.id} aria-label={block.heading}>
              {block.rows.map((row) => (
                <Row key={row.key} row={row} />
              ))}
            </section>
          ))}
          {palette.confirm ? (
            <div>
              <p>{palette.confirm.request.title}</p>
              {palette.confirm.request.reason ? (
                <textarea
                  aria-label={palette.confirm.request.reason.label}
                  value={palette.confirm.reason}
                  onChange={(event) => palette.confirm?.setReason(event.target.value)}
                />
              ) : null}
              <button
                type="button"
                disabled={palette.confirm.submit === null}
                onClick={() => palette.confirm?.submit?.()}
              >
                {palette.confirm.request.confirmLabel}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p>closed</p>
      )}
    </div>
  )
}

function mount(props: HarnessProps = {}) {
  return render(<Harness {...props} />)
}

const field = () => screen.getByRole('textbox', { name: 'query' })
const groups = () => screen.getAllByRole('region')
const groupNames = () => groups().map((group) => group.getAttribute('aria-label') ?? '')
const rowCount = () => Number(screen.getByText(/^rows: /).textContent?.slice('rows: '.length))

/** The log the two derivations and F5's ranking read, seeded per operator. */
async function seedRecents(log: readonly string[]) {
  await updateUiState({ paletteRecents: [...log] })
}

/* ═══════════════════════ AC-CP3 — the rest state ═══════════════════════ */

describe('AC-CP3 — at rest the list holds at most ten rows in at most four groups, none of them Queues', () => {
  it('caps the rest state at ten rows in four groups and offers no Queues', async () => {
    await seedRecents([
      'go:operations-dispatch',
      'go:operations-corporate',
      'go:operations-quick-rides',
      'do:captain.suspend',
      'do:captain.suspend',
      'do:captain.reinstate',
    ])
    mount()

    await screen.findByRole('region', { name: en('command.block.resume') })
    await waitFor(() => expect(rowCount()).toBeGreaterThan(0))

    expect(rowCount()).toBeLessThanOrEqual(10)
    expect(groups().length).toBeLessThanOrEqual(4)
    /* Inventory before a key is pressed is what made it read as a dropdown. */
    expect(groupNames()).not.toContain(en('command.block.queues'))
    /* Not vacuously true: the blocks that DO belong are there. */
    expect(groupNames()).toContain(en('command.block.recent'))
    expect(groupNames()).toContain(en('command.block.goTo'))
  })
})

/* ═══════════════════════ AC-CP4 — queues on demand ══════════════════════ */

describe('AC-CP4 — typing queue shows the Queues group with waiting counts', () => {
  it('brings the queues back when they are asked for, each with its count', async () => {
    const user = userEvent.setup()
    mount()
    await user.type(field(), 'queue')

    const queues = await screen.findByRole('region', { name: en('command.block.queues') })
    const rows = within(queues).getAllByRole('button')
    expect(rows.length).toBeGreaterThan(0)
    /* The count is the reason the block exists; a queue row without one is a
       destination row wearing a heading. */
    expect(rows[0]?.textContent ?? '').toMatch(/\d/)
  })
})

/* ══════════ F6 — every registry is discovered, not only the findable ══════ */

describe('F6 — commands come from COMMAND_GROUPS, so a registry with no target source is reachable', () => {
  const doGroup = () => screen.findByRole('region', { name: /^Do \(/ })

  it.each([
    ['arabic', 'session.action.arabic'],
    ['dark', 'session.action.themeDark'],
    ['sign out', 'session.action.signOut'],
  ])('finds the global session command for "%s"', async (query, titleKey) => {
    const user = userEvent.setup()
    mount()
    await user.type(field(), query)
    expect(within(await doGroup()).getByText(en(titleKey))).toBeInTheDocument()
  })

  it('lists every session command under the > prefix, refused in place while the host is unwired', async () => {
    const user = userEvent.setup()
    mount()
    await user.type(field(), '>')

    const rows = within(await doGroup()).getAllByRole('button')
    const titles = rows.map((row) => row.textContent ?? '')
    for (const key of [
      'session.action.arabic',
      'session.action.english',
      'session.action.themeLight',
      'session.action.themeDark',
      'session.action.themeSystem',
      'session.action.signOut',
    ]) {
      expect(titles.some((title) => title.includes(en(key)))).toBe(true)
    }
    /* §11.2 — a host with no `setTheme` refuses in place with its sentence,
       and never hides the row. */
    expect(screen.getAllByText(en('session.action.theme.unwired')).length).toBe(3)
  })
})

/* ═════════════════ AC-CP5 — Backspace, and what it takes off ════════════ */

describe('AC-CP5 — Backspace on an empty query ascends', () => {
  it('ascends out of the target step on Backspace in an empty field', async () => {
    const user = userEvent.setup()
    mount()
    await user.type(field(), 'suspend')

    const doGroup = await screen.findByRole('region', { name: /^Do \(/ })
    await user.click(within(doGroup).getByText(en('people.action.suspend')))
    await screen.findByText('step: target')

    await user.type(field(), '{Backspace}')
    await screen.findByText('step: root')
  })
})

describe('AC-CP5 — Backspace clears a scope before it ascends', () => {
  it('takes the scope chip off first and leaves the palette open', async () => {
    const user = userEvent.setup()
    mount()
    await user.type(field(), '>')
    await screen.findByText(`scope: ${en('command.scope.commands')}`)

    await user.type(field(), '{Backspace}')
    await waitFor(() =>
      expect(screen.queryByText(`scope: ${en('command.scope.commands')}`)).toBeNull(),
    )
    /* The step it would have ascended to is still on screen: the scope came
       off instead of the palette closing. */
    expect(screen.getByText('step: root')).toBeInTheDocument()
    expect(screen.queryByText('closed')).toBeNull()
  })
})

/* ═════════════════════ AC-CP6 — the argument carries ════════════════════ */

describe('AC-CP6 — suspend nora ranks Suspend captain first and carries nora into the target step', () => {
  it('says the argument will carry, and pre-fills it on Enter', async () => {
    const user = userEvent.setup()
    const firstName = active.name.split(' ')[0] ?? active.name
    mount()
    await user.type(field(), `suspend ${firstName}`)

    const doGroup = await screen.findByRole('region', { name: /^Do \(/ })
    /* CQ-2 — a leading verb puts `Do` first. */
    expect(groupNames()[0]).toMatch(/^Do \(/)
    const top = within(doGroup).getAllByRole('button')[0]?.textContent ?? ''
    expect(top).toContain(en('people.action.suspend'))
    expect(top).toContain(en('command.carry', { rest: firstName }))

    await user.click(within(doGroup).getByText(en('people.action.suspend')))
    await screen.findByText('step: target')
    expect(field()).toHaveValue(firstName)
  })
})

/* ══════════════════ AC-CP7 — the record's own commands ══════════════════ */

describe("AC-CP7 — a record row opens that record's commands, a refused one present", () => {
  it('lists the entity commands under a heading naming the record, refusal in place', async () => {
    const user = userEvent.setup()
    mount()
    await user.type(field(), suspended.id)

    const records = await screen.findByRole('region', { name: /^Records \(/ })
    await user.click(within(records).getByRole('button', { name: `actions: ${suspended.name}` }))

    const actions = await screen.findByRole('region', {
      name: en('command.block.recordActions', { name: suspended.name }),
    })
    await within(actions).findByText(en('command.record.openProfile'))

    /* §11.2 / CQ-3 — the command an already-suspended captain cannot take is
       PRESENT, disabled, with its sentence as real text. */
    const refused = within(actions).getByRole('button', { name: /Suspend/ })
    expect(refused).toBeDisabled()
    expect(within(actions).getByText(en('people.action.suspend.blocked.one'))).toBeInTheDocument()
    /* And one it can take, so the block is not just a wall of refusals. */
    expect(within(actions).getByText(en('people.action.reinstate'))).toBeInTheDocument()
  })
})

/* ═════════════════════ F5 — ranking that learns ═════════════════════════ */

describe('F5 — a command used three times outranks an unused one with an equal text score', () => {
  it('puts the habit first when the text scores are equal', async () => {
    const user = userEvent.setup()
    await seedRecents(['do:captain.reinstate', 'do:captain.reinstate', 'do:captain.reinstate'])
    mount()
    /* `>` with nothing typed scores every command alike, so the only thing
       left to order by is what this operator actually runs. */
    await user.type(field(), '>')

    const doGroup = await screen.findByRole('region', { name: /^Do \(/ })
    const titles = within(doGroup)
      .getAllByRole('button')
      .map((row) => row.textContent ?? '')
    expect(titles[0]).toContain(en('people.action.reinstate'))
    expect(titles.some((title) => title.includes(en('people.action.suspend')))).toBe(true)
    expect(titles.indexOf(titles[0] ?? '')).toBeLessThan(
      titles.findIndex((title) => title.includes(en('people.action.suspend'))),
    )
  })
})

/* ═══════════════════════ F7 — the four prefix modes ═════════════════════ */

describe('F7 — each prefix restricts the answer and shows a scope chip', () => {
  it('restricts to commands, records by id, people and destinations in turn', async () => {
    const user = userEvent.setup()
    mount()

    await user.type(field(), '>suspend')
    await screen.findByText(`scope: ${en('command.scope.commands')}`)
    await waitFor(() => expect(groupNames().every((name) => /^Do \(/.test(name))).toBe(true))

    await user.clear(field())
    await user.click(screen.getByText(`scope: ${en('command.scope.commands')}`))
    await user.type(field(), `#${suspended.id}`)
    await screen.findByText(`scope: ${en('command.scope.ids')}`)
    await screen.findByRole('region', { name: /^Records \(/ })
    expect(groupNames().every((name) => /^Records \(/.test(name))).toBe(true)

    await user.clear(field())
    await user.click(screen.getByText(`scope: ${en('command.scope.ids')}`))
    await user.type(field(), `@${active.name}`)
    await screen.findByText(`scope: ${en('command.scope.people')}`)
    const people = await screen.findByRole('region', { name: /^Records \(/ })
    expect(within(people).getByText(active.name)).toBeInTheDocument()

    await user.clear(field())
    await user.click(screen.getByText(`scope: ${en('command.scope.people')}`))
    await user.type(field(), '/people')
    await screen.findByText(`scope: ${en('command.scope.destinations')}`)
    await screen.findByRole('region', { name: /^Destinations \(/ })
    expect(groupNames().every((name) => /^Destinations \(/.test(name))).toBe(true)
  })
})

/* ════════════════════════════ §6 — telemetry ════════════════════════════ */

describe('§6 — palette.ran and palette.abandoned fire', () => {
  it('records an abandoned palette on close, and the command that ran', async () => {
    const user = userEvent.setup()
    mount({ selection: [active.id] })
    await screen.findByRole('region', { name: en('command.block.onScreen') })

    await user.type(field(), 'x{Escape}')
    await screen.findByText('closed')
    const abandoned = recentEvents().find((event) => event.name === 'palette.abandoned')
    expect(abandoned?.props.queryLength).toBe(1)
    expect(abandoned?.props.step).toBe('root')

    await user.click(screen.getByRole('button', { name: 'reopen' }))
    const onScreen = await screen.findByRole('region', { name: en('command.block.onScreen') })
    await user.click(within(onScreen).getByText(en('people.action.suspend')))

    const reason = await screen.findByLabelText(en('people.confirm.suspend.reason'))
    await user.type(reason, 'Expired operating card')
    await user.click(screen.getByRole('button', { name: en('people.confirm.suspend.confirm') }))

    await waitFor(() =>
      expect(recentEvents().some((event) => event.name === 'palette.ran')).toBe(true),
    )
    const ran = recentEvents().find((event) => event.name === 'palette.ran')
    expect(ran?.props.command).toBe('captain.suspend')
    /* Launched from the root: the pre-seed skipped the target step. */
    expect(ran?.props.step).toBe(0)
    expect(typeof ran?.props.ms).toBe('number')
  })
})
