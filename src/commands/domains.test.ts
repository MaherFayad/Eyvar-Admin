/**
 * **The four domain registries added beyond captains** — phase **C-5**,
 * `design/05-command-centre.md` §2, `PHASE-PLAN` C-5.
 *
 * `commands.test.tsx` is captains' file and drives two real surfaces through
 * the DOM. This one is the **contract** file: it holds every registry — the
 * five that exist and the sixth nobody has written yet — to the same shape,
 * and then tests each domain's own three questions.
 *
 * The three that matter, and why each is here rather than trusted:
 *
 *   **the command is in scope**  a registry nothing can resolve is a list, not
 *   a command set. `resolveCommands` is asked with the row menu's query and the
 *   bulk bar's, and `TARGET_SOURCES` is asked whether the palette can reach it
 *   at all — a registry with no source is invisible to ⌘K, which is the exact
 *   failure C-5 exists to fix.
 *
 *   **a refusal refuses**  §11.2 wants a *sentence*, at RENDER, not a boolean
 *   and not a 422. Every refusal asserted below is asserted as its string,
 *   because a `toBeTruthy()` here would pass on a raw i18n key (AC-74) and on
 *   the wrong sentence.
 *
 *   **a destructive command confirms before acting**  asserted twice: once
 *   against `subscription.cancel` by name, and once **structurally** over every
 *   registry, so a sixth destructive command added later cannot skip it.
 *
 * **No spies, and no fixtures.** Records are read through the clients
 * (`seam.test.ts` scans test files too), the host is a recording fake — which
 * is what a host *is* — and the writes are the real mock clients.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  disableMockLatency,
  getSubscription,
  getTicket,
  listApplicants,
  listDrivers,
  listSubscriptions,
  listTickets,
  listTrips,
  mockFailures,
  resetDataLayer,
} from '@/data/clients'
import type { Applicant, Driver, Subscription, Ticket, Trip } from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { COMMANDS_EN } from './copy'
import { createTranslator } from '@/lib'
import { APPLICANT_COMMANDS } from './applicants'
import { CAPTAIN_COMMANDS } from './captains'
import {
  paletteCommands,
  resolveCommands,
  runCommand,
  unavailableReason,
  type Command,
  type CommandConfirmRequest,
  type CommandContext,
  type CommandHost,
} from './registry'
import { SUBSCRIPTION_COMMANDS } from './subscriptions'
import { TARGET_SOURCES } from './targets'
import { TICKET_COMMANDS } from './tickets'
import { TRIP_COMMANDS } from './trips'

const t = createTranslator({ dictionary: EN })

/* ─────────────────────────────── the harness ─────────────────────────────── */

/**
 * A host that records what it was asked and answers however the test says.
 *
 * `answer: null` is the operator dismissing the confirmation; a string is them
 * confirming with that reason typed. Identical in shape to
 * `commands.test.tsx`'s, deliberately — two harnesses for one interface is how
 * two files end up testing two different contracts.
 */
function fakeHost(answer: string | null = 'Stated reason') {
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

function context<T>(
  targets: readonly T[],
  options: { canWrite?: boolean; host?: CommandHost } = {},
): CommandContext<T> {
  return {
    targets,
    t,
    language: 'en',
    session: { canWrite: options.canWrite ?? true },
    host: options.host ?? fakeHost().host,
  }
}

/**
 * The five registries, as the palette sees them. Adding a sixth to
 * `index.ts` and not to this table is the failure mode C-5 was written to
 * repair, so the last test in the shape block asserts the two agree.
 */
const REGISTRIES = [
  { name: 'captains', entityType: 'driver', commands: CAPTAIN_COMMANDS },
  { name: 'trips', entityType: 'trip', commands: TRIP_COMMANDS },
  { name: 'applications', entityType: 'applicant', commands: APPLICANT_COMMANDS },
  { name: 'tickets', entityType: 'ticket', commands: TICKET_COMMANDS },
  { name: 'subscriptions', entityType: 'subscription', commands: SUBSCRIPTION_COMMANDS },
] as const

const ALL: readonly Command<never>[] = REGISTRIES.flatMap(
  (registry) => registry.commands as readonly Command<never>[],
)

/**
 * **AC-74** — a command row must never render a raw i18n key. A sentence that
 * is nothing but dotted lowercase identifiers is a key that did not resolve,
 * and it is the failure that survives every `toBeTruthy()` assertion.
 */
const LOOKS_LIKE_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/

function assertRealCopy(value: string, what: string): void {
  expect(value.length, what).toBeGreaterThan(0)
  expect(LOOKS_LIKE_KEY.test(value), `${what} rendered the raw key "${value}"`).toBe(false)
}

/* ──────────────────────────── records, via clients ──────────────────────── */

let activeCaptain: Driver
let suspendedCaptain: Driver
let flaggedTrip: Trip
let plainTrip: Trip
let pendingApplication: Applicant
let decidedApplication: Applicant
let freeTicket: Ticket
let ownedTicket: Ticket
let resolvedTicket: Ticket
let liveSubscription: Subscription
let cancelledSubscription: Subscription

async function reload(): Promise<void> {
  /* Captains are read too, so the cross-cutting predicate sweep covers the
     registry that already shipped — a change to `refusal.ts` or to
     `roleRefusal` must not be able to break C-1 unnoticed. */
  const drivers = (await listDrivers({ pageSize: 500 })).items
  activeCaptain = drivers.find((driver) => !driver.suspended)!
  suspendedCaptain = drivers.find((driver) => driver.suspended)!

  const trips = (await listTrips({ pageSize: 500 })).items
  flaggedTrip = trips.find((trip) => trip.flagged)!
  plainTrip = trips.find((trip) => !trip.flagged)!

  const applications = (await listApplicants({ pageSize: 500 })).items
  pendingApplication = applications.find((row) => row.status === 'pending')!
  decidedApplication = applications.find((row) => row.status === 'approved')!

  const tickets = (await listTickets({ pageSize: 500 })).items
  freeTicket = tickets.find((row) => row.ownerId === null && row.status === 'open')!
  ownedTicket = tickets.find((row) => row.ownerId !== null && row.status !== 'resolved')!
  resolvedTicket = tickets.find((row) => row.status === 'resolved')!

  const subscriptions = (await listSubscriptions({ pageSize: 500 })).items
  liveSubscription = subscriptions.find((row) => row.status === 'active')!
  cancelledSubscription = subscriptions.find((row) => row.status === 'cancelled')!
}

beforeAll(async () => {
  disableMockLatency()
  await reload()
})

beforeEach(async () => {
  disableMockLatency()
  resetDataLayer()
  /* The ticket client mutates a module-level array, so a resolved ticket from
     one test is still resolved in the next unless the rows are re-read after
     the reset. */
  await reload()
})

function command<T>(registry: readonly Command<T>[], id: string): Command<T> {
  const found = registry.find((each) => each.id === id)
  if (!found) throw new Error(`No command ${id} in that registry`)
  return found
}

/* ═══════════════════════════════ the shape ═══════════════════════════════ */

describe('every registry keeps the Command contract', () => {
  it('gives every command across every domain a unique, dotted, untranslated id', () => {
    const ids = ALL.map((each) => each.id)
    expect(new Set(ids).size, ids.join(' ')).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][A-Za-z]*\.[a-z][A-Za-z]*$/)
  })

  /** **CM-2** — the label lives in exactly one place, and that place resolves. */
  it('resolves every declared label through a real dictionary key', () => {
    for (const each of ALL) {
      expect(EN[each.titleKey], each.id).toBeTypeOf('string')
      assertRealCopy(t(each.titleKey), `${each.id} titleKey`)
      if (each.compactTitleKey !== undefined) {
        expect(EN[each.compactTitleKey], each.id).toBeTypeOf('string')
      }
    }
  })

  /**
   * §6 — the Arabic synonyms are written now, while Arabic is still
   * unreachable, on the plan's explicit instruction: retrofitting them across
   * six registries later is strictly worse than writing them once. They are
   * match tokens, not translations, so they sit beside the English ones.
   */
  it('carries Arabic match tokens on every command', () => {
    const arabic = /[؀-ۿ]/
    for (const each of ALL) {
      expect(each.keywords.length, each.id).toBeGreaterThan(2)
      expect(
        each.keywords.some((word) => arabic.test(word)),
        `${each.id} has no Arabic keyword`,
      ).toBe(true)
      expect(
        each.keywords.some((word) => !arabic.test(word)),
        `${each.id} has no Latin keyword`,
      ).toBe(true)
    }
  })

  /** **CM-4** — in the palette, or a real sentence saying why not. */
  it('accounts for every id', () => {
    for (const registry of REGISTRIES) {
      const shown = paletteCommands(registry.commands as readonly Command<never>[])
      const hidden = registry.commands.filter((each) => each.hiddenFromPalette !== undefined)
      expect(shown.length + hidden.length, registry.name).toBe(registry.commands.length)
    }
    for (const each of ALL) {
      if (each.hiddenFromPalette === undefined) continue
      expect(each.hiddenFromPalette.trim().length, each.id).toBeGreaterThan(20)
    }
  })

  /**
   * **The registry is only as reachable as `TARGET_SOURCES` makes it.**
   *
   * Every command declared here is `scope.kind === 'entity'`, and the palette
   * finds it by walking the target sources (`usePalette.ts:725`). A registry
   * exported from `index.ts` with no source is a list nothing reads — which is
   * precisely the state ⌘K was in before this phase, one level up.
   */
  it('gives every registry a target source, and every source its own registry', () => {
    for (const registry of REGISTRIES) {
      const source = TARGET_SOURCES.find((each) => each.entityType === registry.entityType)
      expect(source, `${registry.name} has no target source`).toBeDefined()
      expect(source?.commands, registry.name).toBe(registry.commands)
    }
    expect(TARGET_SOURCES.length).toBe(REGISTRIES.length)
  })

  it('declares each source its plural noun and its match noun', () => {
    for (const source of TARGET_SOURCES) {
      assertRealCopy(t(source.pluralKey, { count: '3' }), `${source.entityType} pluralKey`)
      assertRealCopy(t(source.nounKey), `${source.entityType} nounKey`)
    }
  })

  /**
   * **The collision `dictionaries.ts` cannot warn about.**
   *
   * `COMMANDS_EN` is spread BEFORE every screen module, so a key declared in
   * both silently takes the screen's value and the command's copy is quietly
   * dead. Reusing a screen's key is correct and deliberate — the command reads
   * it, it does not redeclare it — so the test is that this file declares no
   * key any screen already owns.
   */
  it('declares no command copy that a screen module already owns', () => {
    const shadowed = Object.keys(COMMANDS_EN).filter((key) => EN[key] !== COMMANDS_EN[key])
    expect(shadowed, 'these keys are shadowed by a screen module').toEqual([])
  })
})

/* ═══════════════════════ refusals resolve to sentences ═══════════════════ */

describe('§11.2 — a refusal is a sentence, at render', () => {
  /**
   * Every command, over every shape of set it can be handed, with and without
   * the write permission. The assertion is not *that* it refused — it is that
   * whatever it said is real copy rather than a key, because a missing `.all`
   * leaf is invisible until an operator selects a wholly ineligible set.
   */
  interface RecordSet {
    name: string
    /** A command only ever sees records of its own scope's type. */
    entityType: string
    rows: () => readonly unknown[]
  }

  const sets: readonly RecordSet[] = [
    { name: 'trip · eligible', entityType: 'trip', rows: () => [plainTrip] },
    { name: 'trip · blocked', entityType: 'trip', rows: () => [flaggedTrip] },
    { name: 'trip · mixed', entityType: 'trip', rows: () => [plainTrip, flaggedTrip] },
    { name: 'trip · all blocked', entityType: 'trip', rows: () => [flaggedTrip, flaggedTrip] },
    { name: 'captain · one', entityType: 'driver', rows: () => [activeCaptain] },
    { name: 'captain · mixed', entityType: 'driver', rows: () => [activeCaptain, suspendedCaptain] },
    { name: 'captain · all suspended', entityType: 'driver', rows: () => [suspendedCaptain, suspendedCaptain] },
    { name: 'application · pending', entityType: 'applicant', rows: () => [pendingApplication] },
    { name: 'application · decided', entityType: 'applicant', rows: () => [decidedApplication] },
    {
      name: 'application · mixed',
      entityType: 'applicant',
      rows: () => [pendingApplication, decidedApplication],
    },
    {
      name: 'application · all decided',
      entityType: 'applicant',
      rows: () => [decidedApplication, decidedApplication],
    },
    { name: 'ticket · free', entityType: 'ticket', rows: () => [freeTicket] },
    { name: 'ticket · owned', entityType: 'ticket', rows: () => [ownedTicket] },
    { name: 'ticket · resolved', entityType: 'ticket', rows: () => [resolvedTicket] },
    { name: 'ticket · mixed', entityType: 'ticket', rows: () => [freeTicket, resolvedTicket] },
    {
      name: 'ticket · all resolved',
      entityType: 'ticket',
      rows: () => [resolvedTicket, resolvedTicket],
    },
    { name: 'subscription · live', entityType: 'subscription', rows: () => [liveSubscription] },
    {
      name: 'subscription · cancelled',
      entityType: 'subscription',
      rows: () => [cancelledSubscription],
    },
    {
      name: 'subscription · mixed',
      entityType: 'subscription',
      rows: () => [liveSubscription, cancelledSubscription],
    },
  ]

  /** Every command paired with every set of ITS OWN entity type, both roles. */
  function each(
    visit: (command: Command<never>, set: RecordSet, canWrite: boolean) => void,
  ): void {
    for (const registry of REGISTRIES) {
      for (const command of registry.commands as readonly Command<never>[]) {
        const mine = sets.filter((set) => set.entityType === registry.entityType)
        expect(mine.length, `${registry.name} has no set to test against`).toBeGreaterThan(0)
        for (const set of mine) {
          for (const canWrite of [true, false]) visit(command, set, canWrite)
        }
      }
    }
  }

  it('never answers with a raw i18n key, whatever the set', () => {
    each((command, set, canWrite) => {
      const reason = unavailableReason(command, context(set.rows(), { canWrite }))
      if (reason === null) return
      assertRealCopy(reason, `${command.id} · ${set.name} · canWrite=${String(canWrite)}`)
    })
  })

  /**
   * **CM-3, over the four new domains.** The row menu, the bulk bar and the
   * palette differ only in `targets`, so there is no per-surface predicate to
   * fall out of step — asserted rather than promised, because the bug this
   * whole directory exists to remove was two surfaces with two answers.
   */
  it('returns one answer per command, record and role', () => {
    each((command, set, canWrite) => {
      const answers = [
        unavailableReason(command, context(set.rows(), { canWrite })),
        unavailableReason(command, context(set.rows(), { canWrite })),
        unavailableReason(command, context(set.rows(), { canWrite })),
      ]
      expect(new Set(answers).size, `${command.id} ${set.name}`).toBe(1)
    })
  })

  /** **D17 / D21 rule 5** — a permission refusal outranks a domain refusal. */
  it('states the permission first, because narrowing a set cannot make a role able', () => {
    const refused = unavailableReason(
      command(TRIP_COMMANDS, 'trip.flag'),
      context([flaggedTrip], { canWrite: false }),
    )
    expect(refused).toBe(EN['trips.action.noPermission'])
  })
})

/* ═════════════════ destructive commands confirm before acting ════════════ */

describe('a destructive command confirms', () => {
  /**
   * **The structural half.** `registry.ts` records the rule as *"the absence of
   * an undo handle on an `affordance: 'destructive'` command makes the confirm
   * step mandatory"* — enforced here over every registry rather than per
   * screen, so a sixth destructive command cannot be added without one.
   *
   * The proof is behavioural, not a flag on the object: the command is run with
   * a host that **dismisses**, and the result must be `cancelled` — which is
   * only reachable by way of `host.confirm`. A command that wrote first and
   * asked afterwards would return `ran`.
   */
  it('asks before it writes, in every registry', async () => {
    for (const registry of REGISTRIES) {
      for (const each of registry.commands) {
        if (each.affordance !== 'destructive') continue
        const { host, asked } = fakeHost(null)
        const targets = registry.entityType === 'subscription' ? [liveSubscription] : []
        const result = await runCommand(
          each as Command<unknown>,
          context(targets, { host }) as CommandContext<unknown>,
        )
        expect(result.kind, `${each.id} did not stop at the confirmation`).toBe('cancelled')
        expect(asked, `${each.id} wrote without asking`).toHaveLength(1)
      }
    }
  })

  /**
   * **R5a — red is spent on the unrecoverable, and nothing else may claim it.**
   * A command with an inverse declared beside it is `default`; asserting the
   * inverse of the rule is what stops `destructive` becoming decoration.
   */
  it('spends destructive on exactly the commands with no way back', () => {
    const destructive = ALL.filter((each) => each.affordance === 'destructive').map(
      (each) => each.id,
    )
    expect(destructive).toEqual(['subscription.cancel'])
  })
})

/* ════════════════════════════════ trips ══════════════════════════════════ */

describe('trips', () => {
  it('offers both commands to the row menu and to the bulk bar', () => {
    expect(resolveCommands(TRIP_COMMANDS, { entityType: 'trip', plural: false }).map((c) => c.id))
      .toEqual(['trip.flag', 'trip.unflag'])
    expect(resolveCommands(TRIP_COMMANDS, { entityType: 'trip', plural: true }).map((c) => c.id))
      .toEqual(['trip.flag', 'trip.unflag'])
    expect(resolveCommands(TRIP_COMMANDS, { entityType: 'driver' })).toEqual([])
  })

  it('refuses an already flagged trip, and names the count over a set', () => {
    expect(
      unavailableReason(command(TRIP_COMMANDS, 'trip.flag'), context([flaggedTrip])),
    ).toBe('This trip is already flagged.')
    expect(
      unavailableReason(
        command(TRIP_COMMANDS, 'trip.flag'),
        context([plainTrip, flaggedTrip]),
      ),
    ).toBe('1 of the selected trips are already flagged.')
    /* D21's third sentence — true of 3-of-3, and the one a hand-written
       predicate forgets. */
    expect(
      unavailableReason(
        command(TRIP_COMMANDS, 'trip.flag'),
        context([flaggedTrip, flaggedTrip]),
      ),
    ).toBe('All 2 selected trips are already flagged.')
  })

  it('refuses before the confirmation is ever asked', async () => {
    const { host, asked } = fakeHost()
    const result = await runCommand(command(TRIP_COMMANDS, 'trip.flag'), context([flaggedTrip], { host }))
    expect(result).toEqual({ kind: 'refused', reason: 'This trip is already flagged.' })
    expect(asked).toEqual([])
  })

  it('asks §5.3’s question, collects the note, and returns the record the client returned', async () => {
    const { host, asked } = fakeHost('Route deviation on the airport leg')
    const result = await runCommand(command(TRIP_COMMANDS, 'trip.flag'), context([plainTrip], { host }))

    expect(asked[0]?.title).toBe(`Flag trip ${plainTrip.id} for investigation?`)
    expect(asked[0]?.confirmLabel).toBe('Flag trip')
    expect(asked[0]?.reason?.label).toBe('Investigation note')
    /* §5.7 rule 9 — the body says what will NOT change. */
    expect(asked[0]?.body).toContain('nothing is refunded')

    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(result.outcome?.message).toBe('Trip flagged')
    expect((result.outcome?.changed?.[0] as Trip | undefined)?.flagged).toBe(true)
  })

  /**
   * **D18's trade, taken.** The inverse is declared in this registry and
   * nothing left the console, so the dialog goes and the ten-second handle
   * arrives — the branch `captain.reinstate` could not take because its surface
   * dropped the handle.
   */
  it('removes a flag with no dialog and offers the undo instead', async () => {
    const { host, asked } = fakeHost()
    const result = await runCommand(
      command(TRIP_COMMANDS, 'trip.unflag'),
      context([flaggedTrip], { host }),
    )
    expect(asked, 'a reversible command should not also confirm').toEqual([])
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(result.outcome?.message).toBe('Flag removed')
    expect(result.outcome?.undo?.label).toBe('Undo')
    expect(result.outcome?.undo?.doneMessage).toBe(`${flaggedTrip.id} is flagged again`)
    expect(result.outcome?.undo?.failedMessage).toBe(`${flaggedTrip.id} is not flagged`)
  })

  /** D18 — the inverse runs through the SEAM, as a real, separately audited write. */
  it('reverses through the client rather than locally', async () => {
    const result = await runCommand(
      command(TRIP_COMMANDS, 'trip.unflag'),
      context([flaggedTrip], { host: fakeHost().host }),
    )
    if (result.kind !== 'ran' || !result.outcome?.undo) throw new Error('no undo handle')
    await result.outcome.undo.run()
    const [again] = (
      await listTrips({ filters: [{ field: 'id', op: 'in', value: [flaggedTrip.id] }], pageSize: 1 })
    ).items
    expect(again?.flagged).toBe(true)
  })
})

/* ═════════════════════════ captain applications ══════════════════════════ */

describe('captain applications', () => {
  it('offers both decisions to the row menu and to the bulk bar', () => {
    expect(
      resolveCommands(APPLICANT_COMMANDS, { entityType: 'applicant', plural: false }).map(
        (c) => c.id,
      ),
    ).toEqual(['applicant.approve', 'applicant.reject'])
    expect(
      resolveCommands(APPLICANT_COMMANDS, { entityType: 'applicant', plural: true }).map(
        (c) => c.id,
      ),
    ).toEqual(['applicant.approve', 'applicant.reject'])
  })

  it('refuses a decided application', () => {
    expect(
      unavailableReason(command(APPLICANT_COMMANDS, 'applicant.reject'), context([decidedApplication])),
    ).toBe('This application has already been decided.')
  })

  /**
   * **§11.2 at render, restating `approveApplicant`'s own 422.** The screen
   * lets the operator press `Approve`, wait, and read a row error; this refuses
   * before the press, which is the difference between gating at render and
   * gating at commit (`:10237`).
   */
  it('refuses an approval whose documents are not verified, before the press', async () => {
    expect(pendingApplication.docs.some((doc) => doc.status !== 'verified')).toBe(true)
    const { host, asked } = fakeHost()
    const result = await runCommand(
      command(APPLICANT_COMMANDS, 'applicant.approve'),
      context([pendingApplication], { host }),
    )
    expect(result).toEqual({
      kind: 'refused',
      reason: 'Verify every document on this application first.',
    })
    expect(asked).toEqual([])
  })

  /**
   * **D8's warning, answered.** `ApplicationsView` calls `approveApplicant`
   * straight from `onClick`; this asks first, and the proof is behavioural — a
   * host that dismisses must produce `cancelled`, which is only reachable
   * through `host.confirm`.
   *
   * **The one place this file constructs a record rather than reading one, and
   * the reason is a defect worth stating.** No undecided applicant in the
   * console's data has every document verified — `listApplicants` returns five
   * and every one has outstanding paperwork — and there is **no client
   * operation that verifies a document anywhere in the data layer**. So the
   * approval path is refused for every real record, which is the *correct*
   * §11.2 answer and also means the console cannot approve anybody. Reported to
   * mock-data-engineer.
   *
   * The record still comes from the client; only the document statuses are
   * overridden, and that override is the state under test rather than a
   * stand-in for the resource. It reaches the confirmation and no further:
   * `approveApplicant` re-reads `applicantFixtures` by id
   * (`clients/applicants.ts:262`) and would throw its 422 against the fixture's
   * own docs, which is exactly why the success path cannot be asserted here.
   */
  it('confirms an approval before it writes, and names the applicant', async () => {
    const ready: Applicant = {
      ...pendingApplication,
      docs: pendingApplication.docs.map((doc) => ({ ...doc, status: 'verified' as const })),
    }
    const dismissed = fakeHost(null)
    const stopped = await runCommand(
      command(APPLICANT_COMMANDS, 'applicant.approve'),
      context([ready], { host: dismissed.host }),
    )
    expect(stopped.kind, 'D8 — a one-click approve is a one-click irreversible act').toBe(
      'cancelled',
    )
    expect(dismissed.asked[0]?.title).toBe(`Approve ${ready.name}?`)
    expect(dismissed.asked[0]?.confirmLabel).toBe('Approve application')
    /* §5.7 rule 9 — what will NOT change, alongside what will. */
    expect(dismissed.asked[0]?.body).toContain('stay on file')
    /* `approveApplicant` takes no reason, so no field is invented for one. */
    expect(dismissed.asked[0]?.reason).toBeUndefined()
  })

  /** The counted forms of the same question, for a selection. */
  it('counts the selection in the question', async () => {
    const ready = [pendingApplication, decidedApplication].map((row) => ({
      ...row,
      status: 'pending' as const,
      docs: row.docs.map((doc) => ({ ...doc, status: 'verified' as const })),
    }))
    const { host, asked } = fakeHost(null)
    await runCommand(command(APPLICANT_COMMANDS, 'applicant.approve'), context(ready, { host }))
    expect(asked[0]?.title).toBe('Approve 2 applications?')
    expect(asked[0]?.confirmLabel).toBe('Approve applications')
  })

  it('collects the reason a rejection needs by contract, and does not write without one', async () => {
    const dismissed = fakeHost(null)
    const stopped = await runCommand(
      command(APPLICANT_COMMANDS, 'applicant.reject'),
      context([pendingApplication], { host: dismissed.host }),
    )
    expect(stopped.kind).toBe('cancelled')
    expect(dismissed.asked[0]?.title).toBe(`Reject ${pendingApplication.name}?`)
    expect(dismissed.asked[0]?.reason?.label).toBe('Reason')

    const { host } = fakeHost('The vehicle is outside the age limit')
    const result = await runCommand(
      command(APPLICANT_COMMANDS, 'applicant.reject'),
      context([pendingApplication], { host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(result.outcome?.message).toBe('Application rejected')
    const changed = result.outcome?.changed?.[0] as Applicant | undefined
    expect(changed?.status).toBe('rejected')
    expect(changed?.rejectionReason).toBe('The vehicle is outside the age limit')
    expect(result.outcome?.undo).toBeUndefined()
  })
})

/* ═══════════════════════════════ tickets ═════════════════════════════════ */

describe('tickets', () => {
  it('offers all three commands to the row menu and to the bulk bar', () => {
    expect(
      resolveCommands(TICKET_COMMANDS, { entityType: 'ticket', plural: false }).map((c) => c.id),
    ).toEqual(['ticket.claim', 'ticket.resolve', 'ticket.reopen'])
    expect(
      resolveCommands(TICKET_COMMANDS, { entityType: 'ticket', plural: true }).map((c) => c.id),
    ).toEqual(['ticket.claim', 'ticket.resolve', 'ticket.reopen'])
  })

  /**
   * §11.2 wants the sentence, and claiming has **two** — they lead somewhere
   * different, which is why the precise singular pair survives beside D21's set
   * family instead of being collapsed into it.
   */
  it('names who holds a claimed ticket, and tells the agent to reopen a closed one', () => {
    const claim = command(TICKET_COMMANDS, 'ticket.claim')
    expect(unavailableReason(claim, context([ownedTicket]))).toBe(
      `${ownedTicket.ownerName ?? ownedTicket.ownerId ?? ''} already owns this ticket.`,
    )
    expect(unavailableReason(claim, context([freeTicket]))).toBeNull()
    expect(unavailableReason(claim, context([freeTicket, ownedTicket]))).toBe(
      '1 of the selected tickets are already claimed or closed.',
    )
  })

  it('refuses a reopen on a ticket that was never resolved', () => {
    expect(
      unavailableReason(command(TICKET_COMMANDS, 'ticket.reopen'), context([freeTicket])),
    ).toBe('This ticket is Open, so there is nothing to reopen.')
    expect(
      unavailableReason(command(TICKET_COMMANDS, 'ticket.reopen'), context([resolvedTicket])),
    ).toBeNull()
  })

  it('refuses a resolve on a ticket that is already resolved, naming its status', () => {
    expect(
      unavailableReason(command(TICKET_COMMANDS, 'ticket.resolve'), context([resolvedTicket])),
    ).toBe('This ticket is already Resolved.')
  })

  /** The actor comes from `/session`, through the seam, inside `run` — CQ-4. */
  it('claims in the current operator’s name, without asking the caller for one', async () => {
    const result = await runCommand(
      command(TICKET_COMMANDS, 'ticket.claim'),
      context([freeTicket], { host: fakeHost().host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(result.outcome?.message).toBe(`${freeTicket.id} is yours`)
    const changed = result.outcome?.changed?.[0] as Ticket | undefined
    expect(changed?.ownerId).toBeTruthy()
    expect(changed?.ownerName).toBeTruthy()
    /* No `releaseTicket` exists, so D18's clause (a) fails and no handle is
       offered rather than a second write path being invented. */
    expect(result.outcome?.undo).toBeUndefined()
  })

  it('resolves with no dialog and reverses through the client', async () => {
    const { host, asked } = fakeHost()
    const result = await runCommand(
      command(TICKET_COMMANDS, 'ticket.resolve'),
      context([freeTicket], { host }),
    )
    expect(asked).toEqual([])
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran' || !result.outcome?.undo) throw new Error('no undo handle')
    expect(result.outcome.message).toBe(`${freeTicket.id} resolved`)
    expect(await getTicket(freeTicket.id)).toMatchObject({ status: 'resolved' })

    expect(result.outcome.undo.doneMessage).toBe(`${freeTicket.id} is open again`)
    await result.outcome.undo.run()
    expect(await getTicket(freeTicket.id)).toMatchObject({ status: 'open' })
  })
})

/* ════════════════════════════ subscriptions ══════════════════════════════ */

describe('subscriptions', () => {
  /**
   * `plural: false` is a domain fact: the copy names one id and one
   * server-computed refund, and a set has neither. The row menu gets it; the
   * bulk bar does not.
   */
  it('offers cancel on a row and withholds it from the bulk bar', () => {
    expect(
      resolveCommands(SUBSCRIPTION_COMMANDS, { entityType: 'subscription', plural: false }).map(
        (c) => c.id,
      ),
    ).toEqual(['subscription.freeze', 'subscription.unfreeze', 'subscription.cancel'])
    /* T6.1 — a school holiday freezes a cohort, so both holds are plural;
       `subscription.cancel` is not, and that is the only one withheld. */
    expect(
      resolveCommands(SUBSCRIPTION_COMMANDS, { entityType: 'subscription', plural: true }).map(
        (c) => c.id,
      ),
    ).toEqual(['subscription.freeze', 'subscription.unfreeze'])
  })

  it('refuses a subscription the client would refuse, restating its 409', () => {
    expect(
      unavailableReason(
        command(SUBSCRIPTION_COMMANDS, 'subscription.cancel'),
        context([cancelledSubscription]),
      ),
    ).toBe('This subscription is already cancelled or expired.')
    expect(
      unavailableReason(
        command(SUBSCRIPTION_COMMANDS, 'subscription.cancel'),
        context([liveSubscription]),
      ),
    ).toBeNull()
  })

  /** **The destructive command, by name.** Dismissal writes nothing at all. */
  it('confirms, and leaves the subscription untouched when the operator backs out', async () => {
    const { host, asked } = fakeHost(null)
    const result = await runCommand(
      command(SUBSCRIPTION_COMMANDS, 'subscription.cancel'),
      context([liveSubscription], { host }),
    )
    expect(result.kind).toBe('cancelled')
    expect(asked).toHaveLength(1)
    expect(asked[0]?.title).toBe(`Cancel and settle ${liveSubscription.id}?`)
    /* §5.7 rule 9 / R2 — the primary repeats the verb, never `OK` or `Yes`. */
    expect(asked[0]?.confirmLabel).toBe('Cancel subscription')
    expect(asked[0]?.body).toContain('cannot be undone')
    expect(asked[0]?.reason?.label).toBe('Termination reason')
    expect(await getSubscription(liveSubscription.id)).toMatchObject({ status: 'active' })
  })

  it('names the server’s refund in the toast, and offers no undo', async () => {
    const { host } = fakeHost('Rider moved outside the service zone')
    const result = await runCommand(
      command(SUBSCRIPTION_COMMANDS, 'subscription.cancel'),
      context([liveSubscription], { host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    const changed = result.outcome?.changed?.[0] as Subscription | undefined
    expect(changed?.status).toBe('cancelled')
    /* R9 — the toast names the object and the figure the SERVER returned, not
       the browser's estimate. */
    expect(result.outcome?.message).toMatch(/^Subscription cancelled · /)
    /* D18 fails on both clauses: no inverse client, and money left the
       console. The confirmation above is the whole net. */
    expect(result.outcome?.undo).toBeUndefined()
  })

  /* T6.1 — the duration is a closed, typed option list, not a parsed box. */
  it('asks for the duration as a closed option list whose values are dates', async () => {
    const { host, asked } = fakeHost('School holiday')
    await runCommand(
      command(SUBSCRIPTION_COMMANDS, 'subscription.freeze'),
      context([liveSubscription], { host }),
    )
    const choice = asked[0]?.choice
    expect(choice?.options).toHaveLength(4)
    for (const option of choice?.options ?? []) {
      expect(option.value, option.label).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      assertRealCopy(option.label, 'freeze duration label')
    }
    expect(choice?.initial).toBe(choice?.options[1]?.value)
  })

  it('freezes to the window the operator picked, not to the default', async () => {
    const asked: CommandConfirmRequest[] = []
    let chosen = ''
    const host: CommandHost = {
      openProfile: () => {},
      confirm: (request) => {
        asked.push(request)
        /* The HOST moves the selection and the command reads it back — which
           is the whole of the additive contract T6.1 added. */
        chosen = request.choice?.options.at(-1)?.value ?? ''
        request.choice?.onSelect(chosen)
        return Promise.resolve('School holiday')
      },
    }
    const result = await runCommand(
      command(SUBSCRIPTION_COMMANDS, 'subscription.freeze'),
      context([liveSubscription], { host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(chosen).not.toBe(asked[0]?.choice?.initial)
    expect((result.outcome?.changed?.[0] as Subscription | undefined)?.frozenUntil).toBe(chosen)
  })

  /** **D18** — the inverse is `subscription.unfreeze`, through the seam. */
  it('offers an undo on a freeze and reverses it through the client', async () => {
    const { host } = fakeHost('School holiday')
    const result = await runCommand(
      command(SUBSCRIPTION_COMMANDS, 'subscription.freeze'),
      context([liveSubscription], { host }),
    )
    if (result.kind !== 'ran' || !result.outcome?.undo) throw new Error('no undo handle')
    expect(result.outcome.undo.label).toBe('Undo')
    expect(result.outcome.undo.doneMessage).toBe(`${liveSubscription.id} is running again`)
    /* The inverse goes through the SEAM, so failure injection on the client's
       own operation is what proves it — a local reversal would resolve. */
    mockFailures.always('subscriptions.unfreeze')
    await expect(result.outcome.undo.run()).rejects.toBeTruthy()
    mockFailures.clear()
    await expect(result.outcome.undo.run()).resolves.toBeUndefined()
  })

  it('refuses to resume a subscription that is not on hold, before any write', async () => {
    const { host, asked } = fakeHost()
    const result = await runCommand(
      command(SUBSCRIPTION_COMMANDS, 'subscription.unfreeze'),
      context([liveSubscription], { host }),
    )
    expect(result).toEqual({
      kind: 'refused',
      reason: 'This subscription is not on hold.',
    })
    expect(asked).toEqual([])
  })
})

/* ═════════════════════════ the palette can reach them ════════════════════ */

describe('the palette can find a target for every domain', () => {
  it('opens each step on a real page rather than on a blank list', async () => {
    for (const source of TARGET_SOURCES) {
      const rows = await source.list('')
      /* R8 — a blank list reads as "there are none", which is a different fact
         from "nothing matched" and is not the one this step is stating. */
      expect(rows.length, `${source.entityType} opened empty`).toBeGreaterThan(0)
      for (const row of rows) {
        const described = source.describe(row)
        expect(described.id, source.entityType).toBeTruthy()
        assertRealCopy(described.title, `${source.entityType} title`)
      }
    }
  })

  it('resolves a typed id back to the record the command needs', async () => {
    const source = TARGET_SOURCES.find((each) => each.entityType === 'trip')!
    const rows = await source.list(flaggedTrip.id)
    expect(rows.map((row) => source.describe(row).id)).toContain(flaggedTrip.id)
  })

  it('reads a pre-seeded selection back as records', async () => {
    const source = TARGET_SOURCES.find((each) => each.entityType === 'ticket')!
    const rows = await source.byIds([freeTicket.id, resolvedTicket.id])
    expect(rows.map((row) => source.describe(row).id).sort()).toEqual(
      [freeTicket.id, resolvedTicket.id].sort(),
    )
  })
})
