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
  getPlan,
  getRequest,
  getSubscription,
  getTicket,
  listApplicants,
  listCashReports,
  listComplaints,
  listDisputes,
  listDrivers,
  listFairnessCases,
  listOperators,
  listPlans,
  listRequests,
  listSafetyIncidents,
  listSubscriptions,
  listTickets,
  listTrips,
  listWallets,
  mockFailures,
  resetDataLayer,
  setSafetyProtocolStep,
  suspendOperator,
} from '@/data/clients'
import type {
  Applicant,
  CashReport,
  Complaint,
  Dispute,
  Driver,
  FairnessCase,
  RideRequest,
  SafetyIncident,
  Subscription,
  SubscriptionPlan,
  TeamUser,
  Ticket,
  Trip,
  WalletSummary,
} from '@/data/types'
import { EN } from '@/i18n/dictionaries'
import { COMMANDS_EN } from './copy'
import { createTranslator } from '@/lib'
import { ANALYST_COMMANDS } from './analyst'
import { APPLICANT_COMMANDS } from './applicants'
import { CAPTAIN_COMMANDS } from './captains'
import { CASH_COMMANDS } from './cash'
import { COMPLAINT_COMMANDS } from './complaints'
import { DISPUTE_COMMANDS } from './disputes'
import { FAIRNESS_COMMANDS } from './fairness'
import { PLAN_COMMANDS } from './pricing'
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
import { REQUEST_COMMANDS } from './requests'
import { SAFETY_COMMANDS } from './safety'
import { SESSION_COMMANDS } from './sessionCommands'
import { SUBSCRIPTION_COMMANDS } from './subscriptions'
import { COMMAND_GROUPS, TARGET_SOURCES } from './targets'
import { TEAM_COMMANDS } from './team'
import { TICKET_COMMANDS } from './tickets'
import { TRIP_COMMANDS } from './trips'
import { WALLET_COMMANDS } from './wallets'

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

/**
 * A host that has the three session capabilities wired, and records what it was
 * told. The bare `fakeHost` deliberately does **not** — that absence is the
 * refusal every session command has to state (F6), and a harness that always
 * wired them could never assert it.
 */
function sessionHost() {
  const languages: string[] = []
  const themes: string[] = []
  let signedOut = 0
  const host: CommandHost = {
    ...fakeHost().host,
    setLanguage: (language) => languages.push(language),
    setTheme: (theme) => themes.push(theme),
    signOut: () => {
      signedOut += 1
    },
  }
  return { host, languages, themes, out: () => signedOut }
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
  /* ── F6: the ten domains added to the registry ───────────────────────── */
  { name: 'requests', entityType: 'request', commands: REQUEST_COMMANDS },
  /* A wallet is keyed by its rider — `WalletSummary` has no id of its own. */
  { name: 'wallets', entityType: 'rider', commands: WALLET_COMMANDS },
  { name: 'complaints', entityType: 'complaint', commands: COMPLAINT_COMMANDS },
  { name: 'team', entityType: 'operator', commands: TEAM_COMMANDS },
  { name: 'plans', entityType: 'plan', commands: PLAN_COMMANDS },
  /**
   * **`entityType: null` is a fact about the data layer, not a shortcut.**
   * These four act on records with no `ProfileEntityType`, so `search()` cannot
   * rank one and `TARGET_SOURCES` has nowhere to put them; `session` acts on no
   * record at all. Every command in the four carries `hiddenFromPalette`, which
   * the shape block asserts rather than trusts.
   */
  { name: 'safety', entityType: null, commands: SAFETY_COMMANDS },
  { name: 'cash', entityType: null, commands: CASH_COMMANDS },
  { name: 'disputes', entityType: null, commands: DISPUTE_COMMANDS },
  { name: 'fairness', entityType: null, commands: FAIRNESS_COMMANDS },
  { name: 'session', entityType: null, commands: SESSION_COMMANDS },
  /* WP-7.4 — acts on no record either; the id regex forbids a digit, so it
     is `analyst`, not `analyst.v2` or similar. */
  { name: 'analyst', entityType: null, commands: ANALYST_COMMANDS },
] as const

/** The registries whose records the palette can find. */
const FINDABLE = REGISTRIES.filter((registry) => registry.entityType !== null)

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
let openRequest: RideRequest
let closedRequest: RideRequest
let wallet: WalletSummary
let openComplaint: Complaint
let disposedComplaint: Complaint
let activeOperator: TeamUser
let suspendedOperator: TeamUser
let invitedOperator: TeamUser
let livePlan: SubscriptionPlan
let archivedPlan: SubscriptionPlan
let openIncident: SafetyIncident
let readyIncident: SafetyIncident
let closedIncident: SafetyIncident
let pendingReport: CashReport
let decidedReport: CashReport
let openDispute: Dispute
let resolvedDispute: Dispute
let openCase: FairnessCase
let decidedCase: FairnessCase

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

  /* ── F6's ten domains, every record read through its own client ─────── */
  const requests = (await listRequests({ pageSize: 500 })).items
  openRequest = requests.find(
    (row) => row.status === 'searching' && (row.claim === null || row.claim.state !== 'claimed'),
  )!
  closedRequest = requests.find((row) => row.status === 'assigned' || row.status === 'expired')!

  wallet = (await listWallets({ pageSize: 500 })).items[0]!

  const complaints = (await listComplaints({ pageSize: 500 })).items
  openComplaint = complaints.find((row) => row.status === 'open')!
  disposedComplaint = complaints.find(
    (row) => row.status === 'resolved' || row.status === 'withdrawn',
  )!

  /**
   * **The roster fixtures hold no `Suspended` colleague**, so that state is
   * reached through the client rather than asserted into existence. The one
   * suspended is deliberately not a `manage_team` holder: F-016 refuses the
   * last one, and that refusal belongs to the client, not to this suite.
   *
   * Reported to mock-data-engineer: `teamUserFixtures` has Active and Invited
   * rows and no Suspended one, so `operator.reinstate` had no record to act on.
   */
  const roster = (await listOperators({ pageSize: 500 })).items
  activeOperator = roster.find((row) => row.status === 'Active')!
  invitedOperator = roster.find((row) => row.status === 'Invited')!
  const spare = roster.find(
    (row) =>
      row.status === 'Active' &&
      row.id !== activeOperator.id &&
      !row.permissions.includes('manage_team'),
  )!
  suspendedOperator = await suspendOperator(spare.id, 'Reached through the client for this suite')

  const plans = await listPlans()
  livePlan = plans.find((row) => row.status === 'active')!
  archivedPlan = plans.find((row) => row.status === 'archived')!

  const incidents = (await listSafetyIncidents({ pageSize: 500 })).items
  /* An incident with work left on it — the protocol refusal's own case. */
  openIncident = incidents.find(
    (row) => row.status === 'open' && row.protocol.some((step) => !step.done),
  )!
  closedIncident = incidents.find((row) => row.status === 'closed')!
  /**
   * The same incident with its four steps ticked, through the client. **Two
   * snapshots of one record, deliberately**: `unavailable` reads the record it
   * is handed, so the pair is what tells apart *"this cannot be closed yet"*
   * from *"this closes"* without needing a second fixture to exist.
   */
  let ready = openIncident
  for (const step of openIncident.protocol) {
    if (step.done) continue
    ready = await setSafetyProtocolStep(openIncident.id, step.key, true)
  }
  readyIncident = ready

  const reports = (await listCashReports({ pageSize: 500 })).items
  pendingReport = reports.find((row) => row.status === 'pending')!
  decidedReport = reports.find((row) => row.status !== 'pending')!

  const disputes = (await listDisputes({ pageSize: 500 })).items
  openDispute = disputes.find((row) => row.status !== 'resolved')!
  resolvedDispute = disputes.find((row) => row.status === 'resolved')!

  const cases = (await listFairnessCases({ pageSize: 500 })).items
  openCase = cases.find((row) => row.status === 'open')!
  decidedCase = cases.find((row) => row.status !== 'open')!
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
    for (const registry of FINDABLE) {
      const source = TARGET_SOURCES.find((each) => each.entityType === registry.entityType)
      expect(source, `${registry.name} has no target source`).toBeDefined()
      expect(source?.commands, registry.name).toBe(registry.commands)
    }
    expect(TARGET_SOURCES.length).toBe(FINDABLE.length)
  })

  /**
   * **The seam F6 needed and `TARGET_SOURCES` could not be.**
   *
   * `TARGET_SOURCES` answers *"how do I find a record of this type"*, and it was
   * doing a second job it was never shaped for: being the list a surface walks
   * to discover COMMANDS. A registry with no entity type had no row to sit in
   * and was therefore invisible — which is the whole of `session`, and four
   * more besides. `COMMAND_GROUPS` holds all fifteen and names the source or
   * `null`, so adding a registry to `index.ts` and not to the table is caught
   * here rather than by an operator who cannot find `Sign out`.
   */
  it('holds every registry in COMMAND_GROUPS, with its source or an honest null', () => {
    expect(COMMAND_GROUPS.map((group) => group.name)).toEqual(
      REGISTRIES.map((registry) => registry.name),
    )
    for (const [index, group] of COMMAND_GROUPS.entries()) {
      const registry = REGISTRIES[index]!
      expect(group.commands, group.name).toBe(registry.commands)
      expect(group.source?.entityType ?? null, group.name).toBe(registry.entityType)
    }
  })

  /**
   * **CM-4, sharpened for the registries the palette cannot reach.** A command
   * with no target source and no `hiddenFromPalette` would be offered in ⌘K and
   * then strand the operator at a target step with nothing to pick.
   */
  it('hides every command whose records the palette cannot find', () => {
    for (const group of COMMAND_GROUPS) {
      if (group.source !== null) continue
      for (const command of group.commands) {
        /* Global commands act on no record, so they are reachable as they are;
           the four route registries are not. */
        if (command.scope.kind === 'global') continue
        expect(command.hiddenFromPalette, `${command.id} is offered with no way to find a target`)
          .toBeDefined()
      }
    }
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
    /**
     * The REGISTRY the set belongs to, not the entity type. Five registries now
     * have no entity type at all (their records have no `ProfileEntityType`),
     * and `session` has no records; keying on the registry is what lets those
     * five into the same sweep.
     */
    registry: string
    rows: () => readonly unknown[]
  }

  const sets: readonly RecordSet[] = [
    { name: 'trip · eligible', registry: 'trips', rows: () => [plainTrip] },
    { name: 'trip · blocked', registry: 'trips', rows: () => [flaggedTrip] },
    { name: 'trip · mixed', registry: 'trips', rows: () => [plainTrip, flaggedTrip] },
    { name: 'trip · all blocked', registry: 'trips', rows: () => [flaggedTrip, flaggedTrip] },
    { name: 'captain · one', registry: 'captains', rows: () => [activeCaptain] },
    { name: 'captain · mixed', registry: 'captains', rows: () => [activeCaptain, suspendedCaptain] },
    { name: 'captain · all suspended', registry: 'captains', rows: () => [suspendedCaptain, suspendedCaptain] },
    { name: 'application · pending', registry: 'applications', rows: () => [pendingApplication] },
    { name: 'application · decided', registry: 'applications', rows: () => [decidedApplication] },
    {
      name: 'application · mixed',
      registry: 'applications',
      rows: () => [pendingApplication, decidedApplication],
    },
    {
      name: 'application · all decided',
      registry: 'applications',
      rows: () => [decidedApplication, decidedApplication],
    },
    { name: 'ticket · free', registry: 'tickets', rows: () => [freeTicket] },
    { name: 'ticket · owned', registry: 'tickets', rows: () => [ownedTicket] },
    { name: 'ticket · resolved', registry: 'tickets', rows: () => [resolvedTicket] },
    { name: 'ticket · mixed', registry: 'tickets', rows: () => [freeTicket, resolvedTicket] },
    {
      name: 'ticket · all resolved',
      registry: 'tickets',
      rows: () => [resolvedTicket, resolvedTicket],
    },
    { name: 'subscription · live', registry: 'subscriptions', rows: () => [liveSubscription] },
    {
      name: 'subscription · cancelled',
      registry: 'subscriptions',
      rows: () => [cancelledSubscription],
    },
    {
      name: 'subscription · mixed',
      registry: 'subscriptions',
      rows: () => [liveSubscription, cancelledSubscription],
    },

    /* ── F6's ten domains, each with an eligible row, a blocked row, a mixed
          set and a wholly blocked one — the four shapes D21's three sentences
          are distinguished by. ─────────────────────────────────────────── */
    { name: 'request · open', registry: 'requests', rows: () => [openRequest] },
    { name: 'request · closed', registry: 'requests', rows: () => [closedRequest] },
    { name: 'request · mixed', registry: 'requests', rows: () => [openRequest, closedRequest] },
    { name: 'request · all closed', registry: 'requests', rows: () => [closedRequest, closedRequest] },
    { name: 'wallet · one', registry: 'wallets', rows: () => [wallet] },
    { name: 'complaint · open', registry: 'complaints', rows: () => [openComplaint] },
    { name: 'complaint · disposed', registry: 'complaints', rows: () => [disposedComplaint] },
    {
      name: 'complaint · mixed',
      registry: 'complaints',
      rows: () => [openComplaint, disposedComplaint],
    },
    {
      name: 'complaint · all disposed',
      registry: 'complaints',
      rows: () => [disposedComplaint, disposedComplaint],
    },
    { name: 'operator · active', registry: 'team', rows: () => [activeOperator] },
    { name: 'operator · suspended', registry: 'team', rows: () => [suspendedOperator] },
    { name: 'operator · invited', registry: 'team', rows: () => [invitedOperator] },
    {
      name: 'operator · mixed',
      registry: 'team',
      rows: () => [activeOperator, suspendedOperator],
    },
    {
      name: 'operator · all invited',
      registry: 'team',
      rows: () => [invitedOperator, invitedOperator],
    },
    { name: 'plan · live', registry: 'plans', rows: () => [livePlan] },
    { name: 'plan · archived', registry: 'plans', rows: () => [archivedPlan] },
    { name: 'plan · mixed', registry: 'plans', rows: () => [livePlan, archivedPlan] },
    { name: 'plan · all archived', registry: 'plans', rows: () => [archivedPlan, archivedPlan] },
    { name: 'incident · open', registry: 'safety', rows: () => [openIncident] },
    { name: 'incident · closed', registry: 'safety', rows: () => [closedIncident] },
    { name: 'incident · mixed', registry: 'safety', rows: () => [openIncident, closedIncident] },
    {
      name: 'incident · all closed',
      registry: 'safety',
      rows: () => [closedIncident, closedIncident],
    },
    { name: 'report · pending', registry: 'cash', rows: () => [pendingReport] },
    { name: 'report · decided', registry: 'cash', rows: () => [decidedReport] },
    { name: 'report · mixed', registry: 'cash', rows: () => [pendingReport, decidedReport] },
    { name: 'report · all decided', registry: 'cash', rows: () => [decidedReport, decidedReport] },
    { name: 'dispute · open', registry: 'disputes', rows: () => [openDispute] },
    { name: 'dispute · resolved', registry: 'disputes', rows: () => [resolvedDispute] },
    { name: 'dispute · mixed', registry: 'disputes', rows: () => [openDispute, resolvedDispute] },
    {
      name: 'dispute · all resolved',
      registry: 'disputes',
      rows: () => [resolvedDispute, resolvedDispute],
    },
    { name: 'case · open', registry: 'fairness', rows: () => [openCase] },
    { name: 'case · decided', registry: 'fairness', rows: () => [decidedCase] },
    { name: 'case · mixed', registry: 'fairness', rows: () => [openCase, decidedCase] },
    { name: 'case · all decided', registry: 'fairness', rows: () => [decidedCase, decidedCase] },
    /* A session command acts on nothing, and the empty set is the real one. */
    { name: 'session · none', registry: 'session', rows: () => [] },
    /* Same shape as `session` — `analyst.ask` acts on no record either. */
    { name: 'analyst · none', registry: 'analyst', rows: () => [] },
  ]

  /** Every command paired with every set of ITS OWN registry, both roles. */
  function each(
    visit: (command: Command<never>, set: RecordSet, canWrite: boolean) => void,
  ): void {
    for (const registry of REGISTRIES) {
      for (const command of registry.commands as readonly Command<never>[]) {
        const mine = sets.filter((set) => set.registry === registry.name)
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
  /**
   * The eligible target every destructive command is run against. Read through
   * the clients like everything else here; a destructive command handed an
   * empty set would return early and pass the assertion without ever reaching
   * `host.confirm`, which is the one thing this test exists to prove it does.
   */
  function eligibleFor(id: string): readonly unknown[] {
    switch (id) {
      case 'subscription.cancel':
        return [liveSubscription]
      case 'request.expire':
        return [openRequest]
      case 'operator.revokeInvite':
        return [invitedOperator]
      case 'operator.offboard':
        return [activeOperator]
      case 'incident.close':
        return [readyIncident]
      default:
        throw new Error(`${id} is destructive and this table does not know an eligible row for it`)
    }
  }

  it('asks before it writes, in every registry', async () => {
    for (const registry of REGISTRIES) {
      for (const each of registry.commands) {
        if (each.affordance !== 'destructive') continue
        const { host, asked } = fakeHost(null)
        const result = await runCommand(
          each as Command<unknown>,
          context(eligibleFor(each.id), { host }) as CommandContext<unknown>,
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
    /**
     * Five, and each one names a thing the console cannot walk back: a
     * settlement that moved money, a request the rider is told nobody took, an
     * invitation and a colleague that leave the roster, and an incident legacy
     * itself admits is reopened by hand (`:13480`). Everything with an inverse
     * declared beside it is `default` — `plan.publish`, `operator.suspend`,
     * `incident.suspend` — which is what stops `destructive` becoming
     * decoration.
     */
    expect(destructive).toEqual([
      'subscription.cancel',
      'request.expire',
      'operator.revokeInvite',
      'operator.offboard',
      'incident.close',
    ])
  })

  /**
   * **D8's pair, and the first registries to use it.** `decision-affirm` and
   * `decision-reject` are a shape, not a colour: a work queue renders them side
   * by side, so a registry that declared one without the other would draw a
   * queue an operator can only say yes in.
   */
  it('declares decision affordances in pairs', () => {
    for (const registry of REGISTRIES) {
      const affirm = registry.commands.filter((each) => each.affordance === 'decision-affirm')
      const reject = registry.commands.filter((each) => each.affordance === 'decision-reject')
      expect(affirm.length, `${registry.name} affirms`).toBe(reject.length)
    }
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

/* ══════════════════════════════ dispatch ═════════════════════════════════ */

describe('ride requests', () => {
  it('refuses a closed request with a sentence, before any write', async () => {
    const { host, asked } = fakeHost()
    const result = await runCommand(
      command(REQUEST_COMMANDS, 'request.assign'),
      context([closedRequest], { host }),
    )
    expect(result).toEqual({
      kind: 'refused',
      reason: 'This request is already assigned, expired or cancelled.',
    })
    expect(asked).toEqual([])
  })

  /** **Q-P7's verb.** No target, no dialog, one keystroke. */
  it('claims the top unclaimed request and names the rider in the toast', async () => {
    const result = await runCommand(
      command(REQUEST_COMMANDS, 'request.claimNext'),
      context([], { host: fakeHost().host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    const claimed = result.outcome?.changed?.[0] as RideRequest | undefined
    expect(claimed?.claim?.state).toBe('claimed')
    /* R9 — the toast names the object AND the person the operator is about to
       phone, which is the fact that makes the row actionable. */
    expect(result.outcome?.message).toBe(`${claimed?.id} is yours · ${claimed?.riderName}`)
  })

  /**
   * The captain picker is a closed option list built **inside `run`** from a
   * live read — the thing `subscriptions.ts` records as impossible for
   * `Change captain` before `choice` existed.
   */
  it('offers active captains as a closed list and assigns the one picked', async () => {
    const asked: CommandConfirmRequest[] = []
    let chosen = ''
    const host: CommandHost = {
      openProfile: () => {},
      confirm: (request) => {
        asked.push(request)
        chosen = request.choice?.options.at(-1)?.value ?? ''
        request.choice?.onSelect(chosen)
        return Promise.resolve('')
      },
    }
    const result = await runCommand(
      command(REQUEST_COMMANDS, 'request.assign'),
      context([openRequest], { host }),
    )
    expect(asked[0]?.title).toBe(`Assign captain to ${openRequest.id}?`)
    expect(asked[0]?.confirmLabel).toBe('Assign captain')
    expect((asked[0]?.choice?.options.length ?? 0), 'no captains offered').toBeGreaterThan(0)
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    const assigned = result.outcome?.changed?.[0] as RideRequest | undefined
    expect(assigned?.status).toBe('assigned')
    expect(assigned?.assignedDriverId).toBe(chosen)
    /* Money is captured on the subscription channel and there is no unassign
       operation, so D18 fails on both clauses. */
    expect(result.outcome?.undo).toBeUndefined()
  })

  it('confirms before closing a request and writes nothing when the operator backs out', async () => {
    const { host, asked } = fakeHost(null)
    const result = await runCommand(
      command(REQUEST_COMMANDS, 'request.expire'),
      context([openRequest], { host }),
    )
    expect(result.kind).toBe('cancelled')
    expect(asked[0]?.confirmLabel).toBe('Close request')
    /* §5.7 rule 9 — what will not change, said in the body. */
    expect(asked[0]?.body).toContain('nothing is charged')
    expect(await getRequest(openRequest.id)).toMatchObject({ status: openRequest.status })
  })

  it('finds a request by its id and by its rider', async () => {
    const source = TARGET_SOURCES.find((each) => each.entityType === 'request')!
    expect((await source.list(openRequest.id)).map((row) => source.describe(row).id)).toContain(
      openRequest.id,
    )
    expect((await source.list(openRequest.riderName)).map((row) => source.describe(row).id))
      .toContain(openRequest.id)
  })
})

/* ═══════════════════════════════ wallets ═════════════════════════════════ */

describe('rider wallets', () => {
  /** **AC-384** — the ceiling bounds the field and the refusal names it. */
  it('bounds the amount by the server’s envelope and never trims it', async () => {
    const { host, asked } = fakeHost(null)
    await runCommand(command(WALLET_COMMANDS, 'wallet.goodwill'), context([wallet], { host }))
    const amount = asked[0]?.amount
    expect(amount?.maxHalalas, 'no ceiling on the field').toBeGreaterThan(0)
    expect(amount?.initialHalalas ?? 0).toBeLessThanOrEqual(amount?.maxHalalas ?? 0)
    assertRealCopy(amount?.message ?? '', 'goodwill amount refusal')
  })

  it('credits the amount the operator set and names the rider', async () => {
    let set = 0
    const host: CommandHost = {
      openProfile: () => {},
      confirm: (request) => {
        set = 1_000
        request.amount?.onChange(set)
        return Promise.resolve('The captain never arrived')
      },
    }
    const result = await runCommand(
      command(WALLET_COMMANDS, 'wallet.goodwill'),
      context([wallet], { host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    /* R9 — names the object, and the figure the SERVER posted. */
    expect(result.outcome?.message).toContain(wallet.riderName)
    expect(result.outcome?.message).toContain('10.00')
    /* §3.4d — an adjustment is not a correction, so there is no inverse. */
    expect(result.outcome?.undo).toBeUndefined()
  })

  it('finds a wallet by its rider’s name and by their id', async () => {
    const source = TARGET_SOURCES.find((each) => each.entityType === 'rider')!
    expect((await source.list(wallet.riderName)).map((row) => source.describe(row).id)).toContain(
      wallet.riderId,
    )
    expect((await source.byIds([wallet.riderId])).map((row) => source.describe(row).id)).toEqual([
      wallet.riderId,
    ])
  })
})

/* ═══════════════════════════ safety incidents ════════════════════════════ */

describe('safety incidents', () => {
  /**
   * §11.2, and the reason this domain is here at all: legacy put the same fact
   * in a `title` attribute on a disabled button (`:13437`). It renders as text
   * and it names the count.
   */
  it('names how many protocol steps are outstanding rather than only refusing', () => {
    const outstanding = openIncident.protocol.filter((step) => !step.done).length
    expect(
      unavailableReason(command(SAFETY_COMMANDS, 'incident.close'), context([openIncident])),
    ).toBe(`${outstanding} protocol steps are still outstanding on this incident.`)
    expect(
      unavailableReason(command(SAFETY_COMMANDS, 'incident.close'), context([closedIncident])),
    ).toBe('This incident is already closed.')
    expect(
      unavailableReason(command(SAFETY_COMMANDS, 'incident.close'), context([readyIncident])),
    ).toBeNull()
  })

  it('closes an incident whose protocol is complete, after confirming', async () => {
    const { host, asked } = fakeHost()
    const result = await runCommand(
      command(SAFETY_COMMANDS, 'incident.close'),
      context([readyIncident], { host }),
    )
    expect(asked[0]?.confirmLabel).toBe('Close incident')
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(result.outcome?.message).toBe(`${readyIncident.id} closed`)
    expect((result.outcome?.changed?.[0] as SafetyIncident | undefined)?.status).toBe('closed')
  })

  /** CM-4 — declared for the row menu, and honest about why ⌘K cannot reach it. */
  it('states in a sentence why the palette cannot offer these', () => {
    for (const each of SAFETY_COMMANDS) {
      expect(each.hiddenFromPalette, each.id).toContain('ProfileEntityType')
    }
    expect(paletteCommands(SAFETY_COMMANDS)).toEqual([])
  })
})

/* ═════════════════════════════ cash reports ══════════════════════════════ */

describe('cash reports', () => {
  it('refuses a report that has already been decided', () => {
    expect(
      unavailableReason(command(CASH_COMMANDS, 'cashReport.resolve'), context([decidedReport])),
    ).toBe('This report has already been decided.')
    expect(
      unavailableReason(command(CASH_COMMANDS, 'cashReport.resolve'), context([pendingReport])),
    ).toBeNull()
  })

  it('collects the reason code the client requires and converts the row in place', async () => {
    const { host, asked } = fakeHost('Receipt matched the trip')
    const result = await runCommand(
      command(CASH_COMMANDS, 'cashReport.resolve'),
      context([pendingReport], { host }),
    )
    expect(asked[0]?.reason?.label).toBe('Reason')
    /* §5.7 rule 9 — the debt already applied stays either way (`:12165`). */
    expect(asked[0]?.body).toContain('stays there either way')
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    const changed = result.outcome?.changed?.[0] as CashReport | undefined
    expect(changed?.status).toBe('resolved')
    expect(changed?.resolutionReasonCode).toBe('Receipt matched the trip')
    expect(result.outcome?.message).toBe(`${pendingReport.id} approved`)
  })

  it('escalates with the captain named, and offers no undo', async () => {
    const { host } = fakeHost('Third under-report this month')
    const result = await runCommand(
      command(CASH_COMMANDS, 'cashReport.escalate'),
      context([pendingReport], { host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(result.outcome?.message).toBe(
      `${pendingReport.id} escalated · ${pendingReport.captainName}`,
    )
    /* A notification left the console (`:12180`), so D18's second clause fails. */
    expect(result.outcome?.undo).toBeUndefined()
  })
})

/* ══════════════════════════════ complaints ═══════════════════════════════ */

describe('complaints', () => {
  it('refuses a complaint that is already resolved or withdrawn', () => {
    expect(
      unavailableReason(command(COMPLAINT_COMMANDS, 'complaint.uphold'), context([disposedComplaint])),
    ).toBe('This complaint is already resolved or withdrawn.')
  })

  /** `resolveComplaint` refuses a positive amount on `dismissed`, so no field is offered. */
  it('offers a compensation field on the upheld path and none on the dismissal', async () => {
    const upheld = fakeHost(null)
    await runCommand(
      command(COMPLAINT_COMMANDS, 'complaint.uphold'),
      context([openComplaint], { host: upheld.host }),
    )
    expect(upheld.asked[0]?.amount).toBeDefined()

    const dismissed = fakeHost(null)
    await runCommand(
      command(COMPLAINT_COMMANDS, 'complaint.dismiss'),
      context([openComplaint], { host: dismissed.host }),
    )
    expect(dismissed.asked[0]?.amount).toBeUndefined()
  })

  it('records the verdict and the note the operator typed', async () => {
    const { host } = fakeHost('The captain took a longer route without asking')
    const result = await runCommand(
      command(COMPLAINT_COMMANDS, 'complaint.dismiss'),
      context([openComplaint], { host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    const changed = result.outcome?.changed?.[0] as Complaint | undefined
    expect(changed?.status).toBe('resolved')
    expect(changed?.resolution?.outcome).toBe('dismissed')
    expect(changed?.resolution?.compensationHalalas).toBe(0)
    expect(changed?.resolution?.note).toBe('The captain took a longer route without asking')
    expect(result.outcome?.message).toBe(`${openComplaint.id} dismissed`)
  })

  it('finds a complaint by its id and by the rider who filed it', async () => {
    const source = TARGET_SOURCES.find((each) => each.entityType === 'complaint')!
    expect((await source.list(openComplaint.id)).map((row) => source.describe(row).id)).toContain(
      openComplaint.id,
    )
    expect((await source.list(openComplaint.riderName)).map((row) => source.describe(row).id))
      .toContain(openComplaint.id)
  })
})

/* ═══════════════════════════════ disputes ════════════════════════════════ */

describe('disputes', () => {
  it('refuses a dispute that is already resolved', () => {
    expect(
      unavailableReason(command(DISPUTE_COMMANDS, 'dispute.refund'), context([resolvedDispute])),
    ).toBe('This dispute is already resolved.')
  })

  /** `resolveDispute` refuses a settlement above the claim; the field says so first. */
  it('caps the settlement at the amount claimed', async () => {
    const { host, asked } = fakeHost(null)
    await runCommand(
      command(DISPUTE_COMMANDS, 'dispute.refund'),
      context([openDispute], { host }),
    )
    expect(asked[0]?.amount?.maxHalalas).toBe(openDispute.amountHalalas)
    expect(asked[0]?.amount?.initialHalalas).toBe(openDispute.amountHalalas)
  })

  it('declines with no money moved, and reuses the screen’s own sentence', async () => {
    const { host, asked } = fakeHost('The trip completed as booked')
    const result = await runCommand(
      command(DISPUTE_COMMANDS, 'dispute.decline'),
      context([openDispute], { host }),
    )
    expect(asked[0]?.amount, 'a declined claim has no amount to set').toBeUndefined()
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    const changed = result.outcome?.changed?.[0] as Dispute | undefined
    expect(changed?.resolution?.outcome).toBe('declined')
    expect(changed?.resolution?.refundHalalas).toBe(0)
    /* The key belongs to `DisputesScreen`; the command reads it rather than
       forking it, so the two surfaces state the same fact. */
    expect(result.outcome?.message).toBe(`${openDispute.id} declined — no money moved`)
  })
})

/* ═══════════════════════════════ fairness ════════════════════════════════ */

describe('fairness cases', () => {
  it('refuses a case that has already been decided', () => {
    expect(
      unavailableReason(command(FAIRNESS_COMMANDS, 'fairnessCase.overturn'), context([decidedCase])),
    ).toBe('This case has already been decided.')
  })

  /**
   * Legacy wrote status, decider and timestamp and left `rationale` at `null`
   * (`:15597`), so every decided appeal in the old console is unexplained. The
   * client's 422 is why this is `needs-input`, and the field is the contract.
   */
  it('will not decide without the reason the captain reads', async () => {
    const dismissed = fakeHost(null)
    const stopped = await runCommand(
      command(FAIRNESS_COMMANDS, 'fairnessCase.overturn'),
      context([openCase], { host: dismissed.host }),
    )
    expect(stopped.kind).toBe('cancelled')
    expect(dismissed.asked[0]?.reason?.help).toBe('The captain reads this. Say what decided it.')

    const { host } = fakeHost('The suspension rested on one disputed trip')
    const result = await runCommand(
      command(FAIRNESS_COMMANDS, 'fairnessCase.overturn'),
      context([openCase], { host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    const changed = result.outcome?.changed?.[0] as FairnessCase | undefined
    expect(changed?.status).toBe('overturned')
    expect(changed?.rationale).toBe('The suspension rested on one disputed trip')
    expect(result.outcome?.message).toBe(`${openCase.id} overturned · ${openCase.driverName}`)
  })
})

/* ════════════════════════════════ the team ═══════════════════════════════ */

describe('the team', () => {
  it('refuses a colleague whose status the transition does not apply to', () => {
    expect(
      unavailableReason(command(TEAM_COMMANDS, 'operator.suspend'), context([suspendedOperator])),
    ).toBe('This colleague is not active.')
    expect(
      unavailableReason(command(TEAM_COMMANDS, 'operator.revokeInvite'), context([activeOperator])),
    ).toBe('This colleague has no outstanding invitation.')
    expect(
      unavailableReason(command(TEAM_COMMANDS, 'operator.reinstate'), context([suspendedOperator])),
    ).toBeNull()
  })

  it('reinstates a suspended colleague and names them', async () => {
    const result = await runCommand(
      command(TEAM_COMMANDS, 'operator.reinstate'),
      context([suspendedOperator], { host: fakeHost().host }),
    )
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect((result.outcome?.changed?.[0] as TeamUser | undefined)?.status).toBe('Active')
    expect(result.outcome?.message).toBe(`${suspendedOperator.name} is active again`)
  })

  it('confirms a revoked invitation and leaves the roster alone on cancel', async () => {
    const { host, asked } = fakeHost(null)
    const result = await runCommand(
      command(TEAM_COMMANDS, 'operator.revokeInvite'),
      context([invitedOperator], { host }),
    )
    expect(result.kind).toBe('cancelled')
    expect(asked[0]?.confirmLabel).toBe('Revoke invitation')
    expect(asked[0]?.body).toContain(invitedOperator.email)
    const roster = (await listOperators({ pageSize: 500 })).items
    expect(roster.map((row) => row.id)).toContain(invitedOperator.id)
  })

  it('finds a colleague by name and by email', async () => {
    const source = TARGET_SOURCES.find((each) => each.entityType === 'operator')!
    expect((await source.list(activeOperator.name)).map((row) => source.describe(row).id))
      .toContain(activeOperator.id)
    expect((await source.list(activeOperator.email)).map((row) => source.describe(row).id))
      .toContain(activeOperator.id)
  })
})

/* ═════════════════════════════ pricing plans ═════════════════════════════ */

describe('subscription plans', () => {
  it('refuses a plan that is already in the state the command would put it in', () => {
    expect(
      unavailableReason(command(PLAN_COMMANDS, 'plan.publish'), context([livePlan])),
    ).toBe('This plan is already live.')
    expect(
      unavailableReason(command(PLAN_COMMANDS, 'plan.archive'), context([archivedPlan])),
    ).toBe('This plan is already archived.')
  })

  /**
   * **D18's trade, taken.** The inverse is the command declared beside it, it
   * runs through the seam, and nothing left the console — so no dialog, and the
   * ten-second handle instead.
   */
  it('publishes with no dialog and restores the status it actually had', async () => {
    const { host, asked } = fakeHost()
    const result = await runCommand(
      command(PLAN_COMMANDS, 'plan.publish'),
      context([archivedPlan], { host }),
    )
    expect(asked, 'a reversible command should not also confirm').toEqual([])
    expect(result.kind).toBe('ran')
    if (result.kind !== 'ran') return
    expect(result.outcome?.message).toBe(`${archivedPlan.nameEn} is live`)
    expect(await getPlan(archivedPlan.id)).toMatchObject({ status: 'active' })

    expect(result.outcome?.undo?.doneMessage).toBe(`${archivedPlan.nameEn} is back as it was`)
    await result.outcome?.undo?.run()
    /* Back to `archived`, not to a fixed default — the handle closes over the
       record as it was. */
    expect(await getPlan(archivedPlan.id)).toMatchObject({ status: 'archived' })
  })

  it('finds a plan by its English name and by its Arabic one', async () => {
    const source = TARGET_SOURCES.find((each) => each.entityType === 'plan')!
    expect((await source.list(livePlan.nameEn)).map((row) => source.describe(row).id)).toContain(
      livePlan.id,
    )
    expect((await source.list(livePlan.nameAr)).map((row) => source.describe(row).id)).toContain(
      livePlan.id,
    )
  })
})

/* ═════════════════════════════ the session ═══════════════════════════════ */

describe('the session', () => {
  /**
   * **The registry lands before the surface wires it.** A host with no
   * `setLanguage` refuses in a sentence rather than throwing at the press —
   * which is what lets this ship while `GlobalSearch` is somebody else's file.
   */
  it('refuses with a keyed sentence when the shell has not wired the capability', () => {
    expect(
      unavailableReason(command(SESSION_COMMANDS, 'session.arabic'), context([])),
    ).toBe('This console cannot change language from here yet.')
    expect(
      unavailableReason(command(SESSION_COMMANDS, 'session.themeDark'), context([])),
    ).toBe('This console cannot change theme from here yet.')
    expect(
      unavailableReason(command(SESSION_COMMANDS, 'session.signOut'), context([])),
    ).toBe('This console cannot sign you out from here yet.')
  })

  it('runs through the host once it is wired', async () => {
    const wired = sessionHost()
    await runCommand(
      command(SESSION_COMMANDS, 'session.arabic'),
      context([], { host: wired.host }),
    )
    await runCommand(
      command(SESSION_COMMANDS, 'session.themeDark'),
      context([], { host: wired.host }),
    )
    await runCommand(
      command(SESSION_COMMANDS, 'session.signOut'),
      context([], { host: wired.host }),
    )
    expect(wired.languages).toEqual(['ar'])
    expect(wired.themes).toEqual(['dark'])
    expect(wired.out()).toBe(1)
  })

  /**
   * §11.2's `:4113` argument at its plainest: both directions are declared, and
   * the one you are already in is present, disabled, and says so. Absence would
   * be a puzzle.
   */
  it('declares both languages and refuses the one already being read', () => {
    const wired = sessionHost()
    expect(
      unavailableReason(
        command(SESSION_COMMANDS, 'session.english'),
        context([], { host: wired.host }),
      ),
    ).toBe('You are already reading English.')
    expect(
      unavailableReason(
        command(SESSION_COMMANDS, 'session.arabic'),
        context([], { host: wired.host }),
      ),
    ).toBeNull()
  })
})

/* ══════════════════════ keyword search finds the command ═════════════════ */

/**
 * **§6 — the vocabulary an operator actually types.** Three kinds, and the
 * middle one is the one nobody writes without being told to: the name the
 * action had in the legacy console, so somebody who learnt that console finds
 * the command by the word they already know.
 */
describe('a command is found by what an operator types', () => {
  function find(needle: string): string[] {
    const lower = needle.toLowerCase()
    return ALL.filter((each) =>
      each.keywords.some((word) => word.toLowerCase().includes(lower)),
    ).map((each) => each.id)
  }

  it('finds a command by an English synonym', () => {
    expect(find('go live')).toContain('plan.publish')
    expect(find('take next')).toContain('request.claimNext')
    expect(find('apology')).toContain('wallet.goodwill')
  })

  it('finds a command by the name the legacy console gave it', () => {
    /* `assign_driver` / `Assign driver` (`:2899`, `:9958`). */
    expect(find('assign driver')).toContain('request.assign')
    /* `Escalate to Trust & Safety` (`:12235`). */
    expect(find('escalate to trust safety')).toContain('cashReport.escalate')
    /* `Save plan` (`:1127`) — legacy's only word for committing a plan. */
    expect(find('save plan')).toContain('plan.publish')
    /* `Mark resolved` (`:4375`) — the one complaint button legacy had. */
    expect(find('mark resolved')).toContain('complaint.uphold')
    /* `Reinstate account` / `Suspend account` (`:4113`). */
    expect(find('reinstate account')).toContain('operator.reinstate')
  })

  it('finds a command by an Arabic term', () => {
    expect(find('إسناد')).toContain('request.assign')
    expect(find('تعويض')).toContain('wallet.goodwill')
    expect(find('إغلاق البلاغ')).toContain('incident.close')
    expect(find('تسجيل الخروج')).toContain('session.signOut')
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
