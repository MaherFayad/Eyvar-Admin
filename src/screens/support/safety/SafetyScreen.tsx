/**
 * **Support › Safety & Incidents** — `safety`. Pattern **P8** (+ P9, **F-2**).
 * `specs/02-work-queues.md` §8, `design/07-rulings-r4.md` **R4-10**.
 *
 * §8.1 names five things that are true of this queue and of no other:
 *
 * **It is the only queue where the cost of being late is not money.** Every
 * other deadline in wave 2 protects revenue or a promise. This one protects a
 * person who pressed a button in a moving car.
 *
 * **It is the only queue with two clocks** (Q-11): acknowledge, then resolve. A
 * four-hour resolution target is meaningless if nobody looked at it for three
 * of them, and an acknowledgement target alone lets an incident sit open for a
 * week once someone has claimed it. **One runs at a time, the row shows that
 * one, and the STATUS BADGE says which promise it is** — the countdown pill
 * gains no new variant (**AC-303**).
 *
 * **It is the only queue whose empty state E3 is genuinely reachable** (Q-37),
 * which is why this is the one screen in wave 2 that computes `emptyKind`
 * rather than hard-coding `cleared` (**AC-324**).
 *
 * **R4-10 is this screen's ruling, and it is the reason the row reads the way
 * it does.** Legacy paints a critical SOS `b-red` on a `--red-lt` row
 * (`:13435`, `:13441`). R7 closes the tone palette at five, R5a permits no red
 * badge, so `critical` and `high` both map to `warning` — *"a real loss of
 * resolution on the one screen where it matters most"*, as the data layer put
 * it. The answer is not a sixth tone:
 *
 * > **The label carries the distinction; the row marker carries the escalation;
 * > the clock carries the order.** Three carriers where legacy had one red
 * > badge. **The resolution goes up, not down.**
 *
 * So: the badge reads `Critical` / `High` / `Normal` in words (**AC-319** — a
 * critical incident *inside* its window carries no marker and no red row); the
 * 3px `--ev-red` leading edge is spent on breach and nothing else (Q-22); and
 * the queue sorts by deadline, never by severity label, because *"a 'critical'
 * incident with four hours left is less urgent than a High ticket breaching in
 * ninety seconds"* (`:19074`).
 *
 * ── what this screen deliberately does NOT do ───────────────────────────────
 *
 * **It does not offer the precautionary suspension.** `precautionarilySuspend`
 * exists in the client and works; **nothing lifts it.** Q-73 is explicit —
 * *"it must be liftable"* — and **F-19** is the legacy defect it names: a
 * reason string beginning `"Precautionary"` against a deletion path that
 * requires `"Expired"` (`:13312`), so a precautionary suspension is permanent
 * for the life of the session and closing the incident does not lift it.
 * Shipping the apply half alone **recreates F-19 in the new app**: the one
 * irreversible action in the module would be irreversible by accident rather
 * than by design. It is withheld, deliberately, and named in the handoff rather
 * than half-built. **AC-311**, **AC-314** and **AC-326** go with it.
 *
 * Rules applied
 *   §4.7 Q-37 / AC-324
 *              **E1 and E3 are different screens on this route.** `emptyKind`
 *              is computed from one unscoped read: zero incidents ever ⇒
 *              `first-run`; zero *open* incidents ⇒ `cleared`.
 *   §8.6 Q-69 / AC-315
 *              order is enforced for `document` only, and it is enforced at
 *              RENDER (Q-25): the checkbox is disabled with its reason, so the
 *              denial cannot arrive after the click and cannot leave the box
 *              flipped (**Q-72**, **AC-316**).
 *   §8.6 Q-25 / AC-317
 *              a closed incident's protocol is read-only and its outcome, actor
 *              and time are legible on the row without opening it.
 *   §4.4 Q-22 / AC-321
 *              severity and lateness are two facts and the row does not
 *              collapse them.
 */

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  claimSafetyIncident,
  closeSafetyIncident,
  listSafetyIncidents,
  listTrips,
  releaseSafetyIncident,
  setSafetyProtocolStep,
} from '@/data/clients'
import {
  SAFETY_PROTOCOL_STEPS,
  type IsoDateTime,
  type Paginated,
  type SafetyIncident,
  type SafetyIncidentSeverity,
  type SafetyIncidentType,
  type SafetyProtocolStepKey,
  type SubTabRoute,
  type Trip,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { DataColumn, ExtraFilterSpec } from '@/components/DataTable'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import {
  BreachBanner,
  Cell,
  DecisionBadge,
  MutedCell,
  OwnerChip,
  QueuePage,
  QueueTable,
  SlaCell,
  SubjectIdentity,
  queueClock,
  useNowIso,
  useQueueMeta,
  useQueueViews,
  useRowActions,
  type QueueClockResult,
  type RowFailure,
} from '@/screens/queues'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { withFallback } from '../../operations/localCopy'
import { SAFETY_EN } from './copy'

/**
 * **Q-32** — the open work, which on this queue is `unacknowledged ∪
 * acknowledged`. It agrees with the route table's `isDefault`.
 *
 * §8.9 asks for `critical-sos` to be **renamed `critical`** — *"severity is not
 * type, and a critical incident may be an accident or a medical emergency, not
 * an SOS"* — and for an `all` view to be added, and for notification **N7**'s
 * route to move with the rename (`notifications.ts:108`). None of that landed;
 * `routeTable.ts:602` still declares `open · critical-sos · closed`, and that
 * file has a single owner. Reported, not edited.
 */
const DEFAULT_VIEW = 'open'

/**
 * **The two clocks, chosen by the state of the first one.** §4.3's table gives
 * six windows across three severities; the data layer models them as two field
 * groups on one row, which is the same thing said once.
 *
 * `firstResponseAt === null` means nobody has answered, so the **acknowledge**
 * promise is the one running. Once somebody has, it is the **resolve** promise,
 * and **Q-66 binds: the acknowledgement clock cannot be restarted.** An
 * incident acknowledged in 4 minutes and reopened three days later was still
 * acknowledged in 4 minutes.
 */
function activeClock(incident: SafetyIncident, now: IsoDateTime): QueueClockResult {
  const closed = incident.status === 'closed'
  if (incident.firstResponseAt === null && !closed) {
    return queueClock(
      {
        startedAt: incident.openedAt,
        dueAt: incident.firstResponseDueAt,
        targetMinutes: null,
        breachedAt: incident.firstResponseBreachedAt,
      },
      now,
      { terminal: false },
    )
  }
  return queueClock(
    {
      startedAt: incident.slaStartedAt,
      dueAt: incident.slaDueAt,
      targetMinutes: incident.slaTargetMinutes,
      breachedAt: incident.slaBreachedAt,
    },
    now,
    { terminal: closed },
  )
}

export function SafetyScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const location = useLocation()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, SAFETY_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  const now = useNowIso()

  const { tabs, activeTab, selectTab } = useQueueViews(row, DEFAULT_VIEW, t)
  const { meta, onTotal } = useQueueMeta(t, language, 'safety.meta')

  const table = useIndexTable<SafetyIncident>({
    mode: 'queue',
    getRowId: (incident) => incident.id,
    initialView: activeTab,
    /**
     * **AC-217.** Not `urgency`: the client's key returns `-1` for every
     * breached row, so they all tie and the comparator falls back to array
     * order — "most overdue at the top" is lost. `slaDueAt` ascending gives
     * both halves and puts `No clock` last.
     *
     * **This orders by the RESOLVE clock, and on an unacknowledged incident the
     * acknowledge clock is the one running.** `sortable` has no
     * `firstResponseDueAt`, so the two-clock queue can only be ordered by one
     * of them from here. Reported to mock-data-engineer; on the current fixture
     * the two agree in rank because both derive from `openedAt` and severity.
     */
    initialSort: { field: 'slaDueAt', dir: 'asc' },
  })

  const params = useMemo(() => ({ ...table.params, view: activeTab }), [table.params, activeTab])
  const data = useAsync<Paginated<SafetyIncident>>(
    (signal) => listSafetyIncidents(params, signal),
    /* `params` is the table query with the view tab merged in and is the whole
       argument, so each tab keys separately. */
    { deps: [params], cacheKey: 'safety.list' },
  )

  /* R5a (a) — open incidents past **either** clock. The client's `breached`
     predicate is `slaBreachedAt !== null || firstResponseBreachedAt !== null`,
     which is the right union: an SOS breaches its response long before its
     resolution. Q-18 excludes closed rows. */
  const breached = useAsync<Paginated<SafetyIncident>>(
    (signal) =>
      listSafetyIncidents(
        {
          pageSize: 1,
          filters: [
            { field: 'breached', op: 'eq', value: true },
            { field: 'status', op: 'eq', value: 'open' },
          ],
        },
        signal,
      ),
    /* **This screen reads `safety.list` three times with three constant
       queries**, so `deps: []` is not available to any of them: all three would
       claim `safety.list::[]` and the banner's breach count, the corpus probe
       and the table would serve each other's envelopes. Each names its own
       query instead. */
    { deps: ['breached'], cacheKey: 'safety.list' },
  )

  /**
   * **AC-324, and the one read that tells E1 and E3 apart.**
   *
   * Q-37: E3 is reachable on exactly one of these five queues, and only before
   * the first incident is ever reported. `isFiltered` cannot see the difference
   * — both are unfiltered zeros — so the call site asks the question the state
   * actually depends on: *has this resource ever had a record?* One request,
   * `pageSize: 1`, no filters, no view.
   */
  const corpus = useAsync<Paginated<SafetyIncident>>(
    (signal) => listSafetyIncidents({ view: 'all', pageSize: 1 }, signal),
    /* `'all'` is this read's own view, and it is what keeps the key apart from
       the breach count's — see the note there. */
    { deps: ['all'], cacheKey: 'safety.list' },
  )

  /**
   * **AC-323 / F-14** — the trip ids that actually resolve.
   *
   * Two of the three seeded incidents reference trips that are not in
   * `DB.trips` (`10e` §16.15), so *"one of the two reachable `Open trip`
   * buttons produces an error toast instead of a record"*. One read builds the
   * set, and a row whose trip is not in it **says so and offers no link**
   * rather than offering one that breaks.
   */
  const trips = useAsync<Paginated<Trip>>((signal) => listTrips({ pageSize: 200 }, signal), {
    /* Constant query, restated: `trips.list::[]` would collide with any other
       unparameterised read of the trips list — `DispatchScreen`'s active feed
       is one — and this set is only used to decide which `Open trip` links
       resolve. */
    deps: ['known-trips', 200],
    cacheKey: 'trips.list',
  })
  const knownTrips = useMemo(
    () => new Set((trips.data?.items ?? []).map((trip) => trip.id)),
    [trips.data],
  )

  const actions = useRowActions<SafetyIncident>({ t })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const rows = actions.rows(data.data?.items ?? [])
  const scoped = table.filters.some((filter) => filter.field === 'breached')
  /**
   * **Q-51 — Support cannot make a suspension decision, and it cannot close an
   * incident either.** Foundation §11.3 item 3: with three permissions the
   * Support role is not equipped for it, so Safety's write actions stay
   * Ops-Manager-gated and Support sees them read-only until **Q3** decides
   * whether `Trust & Safety` exists. `approve_drivers` is the nearest gate the
   * permission fixture actually carries; the real key is **Q-84**, open.
   */
  const canWrite = shell.permissions.permissions.includes('approve_drivers')
  const currentUserId = shell.session?.userId ?? ''

  function claim(incident: SafetyIncident, takeOver: boolean) {
    void actions.run({
      id: incident.id,
      errorKey: 'safety.error.row.claim',
      toastKey: takeOver ? 'queue.toast.takenOver' : 'queue.toast.claimed',
      action: () => claimSafetyIncident(incident.id, { takeOver }),
    })
    setConfirm(null)
  }

  function askTakeOver(incident: SafetyIncident) {
    const owner = incident.claim?.ownerName ?? ''
    setConfirm({
      title: t('queue.takeOver.title', { name: owner }),
      body: t('queue.takeOver.body', { name: owner }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () => claim(incident, true),
    })
  }

  function toggleStep(incident: SafetyIncident, step: SafetyProtocolStepKey, done: boolean) {
    void actions.run({
      id: incident.id,
      errorKey: 'safety.error.row.step',
      toastKey: 'safety.toast.step',
      action: () => setSafetyProtocolStep(incident.id, step, done),
    })
  }

  function askClose(incident: SafetyIncident) {
    const held = incident.claim?.state === 'claimed' ? incident.claim : null
    const close = () =>
      setConfirm({
        title: t('safety.close.title', { id: incident.id }),
        body: t('safety.close.body'),
        confirmLabel: t('safety.close.confirm'),
        onConfirm: () => {
          setConfirm(null)
          void actions.run({
            id: incident.id,
            errorKey: 'safety.error.row.close',
            toastKey: 'safety.toast.closed',
            action: () => closeSafetyIncident(incident.id),
          })
        },
      })

    /* **AC-209** — deciding an item somebody else holds takes the take-over
       confirmation first. On this queue that matters more than anywhere else:
       two operators closing one incident is two people believing the other one
       spoke to the person in the car. */
    if (held === null || held.ownerId === currentUserId) return close()
    setConfirm({
      title: t('queue.takeOver.decide.title', { name: held.ownerName }),
      body: t('queue.takeOver.decide.body', { name: held.ownerName }),
      confirmLabel: t('queue.takeOver.decide.confirm'),
      onConfirm: () => {
        setConfirm(null)
        close()
      },
    })
  }

  const columns = incidentColumns({
    t,
    language,
    now,
    canWrite,
    currentUserId,
    knownTrips,
    profileHref: (id) => `${location.pathname}${withOverlay(location.search, 'entity', id)}`,
    failure: actions.failure,
    onClaim: (incident) => claim(incident, false),
    onRelease: (incident) =>
      void actions.run({
        id: incident.id,
        errorKey: 'safety.error.row.release',
        toastKey: 'queue.toast.released',
        action: () => releaseSafetyIncident(incident.id),
      }),
    onTakeOver: askTakeOver,
    onToggleStep: toggleStep,
    onClose: askClose,
  })

  return (
    <QueuePage row={row} meta={meta} t={t} dir={dir}>
      <BreachBanner
        id="support-safety-sla"
        count={breached.data?.total ?? 0}
        scoped={scoped}
        onShowBreached={() => table.setFilter({ field: 'breached', op: 'eq', value: true })}
        t={t}
        language={language}
        oneKey="safety.banner.one"
        otherKey="safety.banner.other"
      />

      <QueueTable
        t={t}
        language={language}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(incident) => incident.id}
        columns={columns}
        tableId="support-safety"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={selectTab}
        onTotal={onTotal}
        now={now}
        searchPlaceholder={t('safety.search')}
        extraFilters={BREACH_FILTER(t)}
        /* **R5a** — the row tint reads `activeClock`, which is also what the
           leading-edge marker and the countdown pill read. Q-66's two-clock
           rule therefore governs the tint as well: an incident acknowledged
           late but resolved on time is late, and one closed inside its window
           is not. */
        isRowCritical={(incident) => activeClock(incident, now).breached}
        /* **AC-324** — the only `emptyKind` in wave 2 that is computed. */
        emptyKind={
          corpus.status === 'content' && (corpus.data?.total ?? 0) === 0 ? 'first-run' : 'cleared'
        }
        cleared={{
          heading: t('safety.empty.cleared.heading'),
          body: t(CLEARED_BODY[activeTab] ?? 'safety.empty.cleared.open'),
        }}
        firstRun={{
          heading: t('safety.empty.firstRun.heading'),
          body: t('safety.empty.firstRun.body'),
          actions: [{ label: t('safety.empty.firstRun.action'), onClick: () => selectTab('closed') }],
        }}
        noMatch={{ message: t('safety.empty.noMatch') }}
        error={{ message: t('safety.error.list'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={actions.busy} t={t} />
    </QueuePage>
  )
}

/* ─────────────────────────────── vocabulary ────────────────────────────── */

const CLEARED_BODY: Readonly<Record<string, string>> = {
  open: 'safety.empty.cleared.open',
  'critical-sos': 'safety.empty.cleared.critical',
  closed: 'safety.empty.cleared.closed',
}

const BREACH_FILTER = (t: Translate): readonly ExtraFilterSpec[] => [
  {
    field: 'breached',
    label: t('queue.filter.breached'),
    kind: 'boolean',
    trueLabel: t('queue.filter.breached.yes'),
    falseLabel: t('queue.filter.breached.no'),
  },
]

/** R4-10 — the label carries the distinction; `critical` and `high` share a tone. */
const SEVERITY: Readonly<
  Record<SafetyIncidentSeverity, { tone: 'warning' | 'neutral'; key: string }>
> = {
  critical: { tone: 'warning', key: 'safety.severity.critical' },
  high: { tone: 'warning', key: 'safety.severity.high' },
  normal: { tone: 'neutral', key: 'safety.severity.normal' },
}

const TYPE_LABEL: Readonly<Record<SafetyIncidentType, string>> = {
  sos: 'safety.type.sos',
  accident: 'safety.type.accident',
  harassment: 'safety.type.harassment',
  'unsafe-driving': 'safety.type.unsafeDriving',
  theft: 'safety.type.theft',
  other: 'safety.type.other',
}

const STEP_LABEL: Readonly<Record<SafetyProtocolStepKey, string>> = {
  contact: 'safety.step.contact',
  verify: 'safety.step.verify',
  act: 'safety.step.act',
  document: 'safety.step.document',
}

/* ─────────────────────────────── columns ───────────────────────────────── */

export interface SafetyDeps {
  t: Translate
  language: Language
  now: IsoDateTime
  canWrite: boolean
  currentUserId: string
  knownTrips: ReadonlySet<string>
  profileHref: (id: string) => string
  failure: (id: string) => RowFailure | undefined
  onClaim: (row: SafetyIncident) => void
  onRelease: (row: SafetyIncident) => void
  onTakeOver: (row: SafetyIncident) => void
  onToggleStep: (row: SafetyIncident, step: SafetyProtocolStepKey, done: boolean) => void
  onClose: (row: SafetyIncident) => void
}

/**
 * §7.3's width contract: `96 + 136 + 136 + 176 + 168 = 712`, plus the
 * identity's `minWidth: 152` = **864**, inside the Arabic budget of 870.
 *
 * **The identity's floor is 152 rather than the 176 the other four queues use,
 * and that is this screen paying for its seventh carrier.** Safety has more to
 * put on a row than any other wave-2 queue — a summary, a type, a trip, a
 * severity, a promise, a countdown, an owner, four protocol steps and a
 * disposition — and §7.3's budget does not stretch. What gives is the summary's
 * measure, because it is the one value on the row that truncates *legibly*: it
 * is a sentence, `title` carries it in full, and the rest of the row still
 * answers "how bad, how late, whose, how far through". At 1280 the residual
 * puts it back to 200 anyway; 152 is only what Arabic gets.
 */
export function incidentColumns(deps: SafetyDeps): ReadonlyArray<DataColumn<SafetyIncident>> {
  const { t, language, now } = deps

  const stepsDone = (incident: SafetyIncident) =>
    incident.protocol.filter((step) => step.done).length

  return [
    {
      id: 'incident',
      emphasis: 'primary',
      csv: (incident) => incident.id,
      header: t('safety.col.incident'),
      alwaysVisible: true,
      minWidth: 152,
      dataType: 'text',
      sortField: 'openedAt',
      cell: (incident) => {
        const clock = activeClock(incident, now)
        const type = t(TYPE_LABEL[incident.type])
        /* **AC-323** — three shapes, three keys, no concatenation. */
        const secondary =
          incident.tripId === null
            ? t('safety.line.noTrip', { type })
            : deps.knownTrips.has(incident.tripId)
              ? t('safety.line.withTrip', { type, trip: incident.tripId })
              : t('safety.line.unresolvableTrip', { type, trip: incident.tripId })
        return (
          <>
            {/* R5a (b). **AC-319** — a `critical` incident INSIDE its
                acknowledgement window gets no marker: severity is carried by
                its badge, and this edge is spent on breach alone (Q-22). */}
            {clock.breached && <RowCriticalMarker />}
            <SubjectIdentity
              /* §12.1 — the identity opens the record. There is no level-3
                 detail route on this sub-tab: §3's **F-2** asks for
                 `/support/safety/:incidentId` and it did not land, so the
                 identity opens the party's profile overlay instead. Reported. */
              to={deps.profileHref(incident.againstId ?? incident.reporterId ?? incident.id)}
              title={incident.summary}
              secondary={secondary}
              label={t('safety.a11y.open', { id: incident.id })}
            />
          </>
        )
      },
    },
    {
      id: 'severity',
      emphasis: 'data',
      header: t('queue.col.severity'),
      width: 96,
      dataType: 'enum',
      /* **No `sortField`.** *"Sort by DEADLINE, not by severity label"*
         (`:19074`, restated in `types/work.ts`). A sort control here would
         offer the operator exactly the ordering R4-10 rules out. */
      filter: {
        kind: 'multi-select',
        field: 'severity',
        options: (Object.keys(SEVERITY) as SafetyIncidentSeverity[]).map((value) => ({
          value,
          label: t(SEVERITY[value].key),
        })),
      },
      cell: (incident) =>
        /* D-21 — `normal` is this column's resting value and renders as text. */
        incident.severity === 'normal' ? (
          <Cell className="text-muted-foreground">{t(SEVERITY.normal.key)}</Cell>
        ) : (
          <Cell>
            <StatusBadge tone={SEVERITY[incident.severity].tone}>
              {t(SEVERITY[incident.severity].key)}
            </StatusBadge>
          </Cell>
        ),
    },
    {
      id: 'status',
      emphasis: 'data',
      header: t('queue.col.status'),
      width: 136,
      dataType: 'enum',
      sortField: 'status',
      filter: {
        kind: 'select',
        field: 'status',
        options: [
          { value: 'open', label: t('safety.status.unacknowledged') },
          { value: 'closed', label: t('safety.status.closed') },
        ],
      },
      /**
       * **Q-11 / AC-303 — this badge is what says which promise is running.**
       * The countdown beside it gains no new variant, so the pair reads
       * `Unacknowledged` + `overdue 4m` (the acknowledge promise) or
       * `Acknowledged` + `2h 10m left` (the resolve promise), and never both
       * clocks at once.
       *
       * **The three values are DERIVED**, from `status` and `firstResponseAt`.
       * `SafetyIncidentStatus` is `open | closed` in the data layer, and §8.4's
       * four-state machine (`unacknowledged · acknowledged · closed ·
       * reopened`) did not land. `reopened` is therefore unreachable here and
       * `acknowledged` keys off *"a human first touched it"* rather than off a
       * claim — which is **AC-305's gap**, reported rather than faked: nothing
       * in the client stamps `firstResponseAt` when a claim is taken.
       */
      cell: (incident) => {
        if (incident.status === 'closed') {
          return (
            <Cell>
              <StatusBadge tone="neutral">{t('safety.status.closed')}</StatusBadge>
            </Cell>
          )
        }
        const acknowledged = incident.firstResponseAt !== null
        /* **The unacknowledged state is the WARNING tone. Sweep S9.**
           It used to be the `new` tone — an outline, chosen as "not yet
           handled". Measured at 1440 that rendered as `--ev-blue-dk` #1b51c4
           on transparent, the calmest chip in the column, while `Acknowledged`
           next to it was a solid blue plate: the two rows nobody had answered
           read quieter than the four somebody had. R7's tone that means *needs
           attention · blocks something* is `warning`, and this queue is the one
           where "blocks something" is a person in a moving car.

           R17 is intact and is the reason this is safe: there is ONE warning
           tone, so a `Critical` severity chip and an `Unacknowledged` status
           chip share it and are told apart by their WORDS, never by a second
           fill. The pair reading amber-amber on the two unanswered SOS rows is
           the intended reading, not a collision.

           Three states, three tones, matching the vocabulary
           /operations/subscriptions already uses: amber demands action, blue is
           a promise still running, grey is done. */
        return (
          <Cell>
            <StatusBadge tone={acknowledged ? 'info' : 'warning'}>
              {t(acknowledged ? 'safety.status.acknowledged' : 'safety.status.unacknowledged')}
            </StatusBadge>
          </Cell>
        )
      },
    },
    {
      id: 'sla',
      emphasis: 'data',
      header: t('queue.col.sla'),
      width: 136,
      dataType: 'date',
      cell: (incident) => {
        const clock = activeClock(incident, now)
        const acknowledged = incident.firstResponseAt !== null || incident.status === 'closed'
        return (
          <SlaCell
            result={clock}
            dueAt={acknowledged ? incident.slaDueAt : incident.firstResponseDueAt}
            t={t}
            language={language}
            /* Q-11 — the pill's accessible description names the promise the
               status badge is already stating in words. */
            promiseLabel={t(
              acknowledged ? 'safety.promise.resolve' : 'safety.promise.acknowledge',
            )}
          />
        )
      },
    },
    {
      id: 'owner',
      header: t('queue.col.owner'),
      width: 176,
      dataType: 'enum',
      filter: {
        kind: 'boolean',
        field: 'unclaimed',
        trueLabel: t('queue.owner.unclaimed'),
        falseLabel: t('queue.filter.breached.no'),
      },
      /* **Q-65 / AC-307** — releasing a claim does NOT un-acknowledge.
         `firstResponseAt` is written once and never cleared, so the row returns
         to unclaimed with its status still `Acknowledged` and its resolve clock
         still running: the promise the acknowledgement made was to the person
         in the car, not to the queue. That state falls out of the two cells
         above being independent, and it needs no code here. */
      cell: (incident) =>
        incident.status === 'closed' ? (
          <MutedCell>{incident.closedByUserName ?? ''}</MutedCell>
        ) : (
          <OwnerChip
            claim={incident.claim}
            currentUserId={deps.currentUserId}
            now={now}
            t={t}
            canWrite={deps.canWrite}
            disabledReason={t('queue.action.noPermission')}
            onClaim={() => deps.onClaim(incident)}
            onRelease={() => deps.onRelease(incident)}
            onTakeOver={() => deps.onTakeOver(incident)}
          />
        ),
    },
    {
      id: 'protocol',
      header: t('safety.col.protocol'),
      width: 168,
      dataType: 'enum',
      filter: {
        kind: 'boolean',
        field: 'protocolComplete',
        trueLabel: t('safety.step.countLabel', { done: '4', total: '4' }),
        falseLabel: t('safety.action.close.blockedOne'),
      },
      /**
       * **The working cell.** §8.6's four steps and §8.5's `Close incident`
       * share one lane, because there is no level-3 detail route on this
       * sub-tab (**F-2**) and a protocol that cannot be worked from the queue
       * cannot be worked at all.
       *
       * Every control here is gated at RENDER (**AC-316**, Q-25, Q-72): a
       * checkbox the role cannot use is disabled with its reason, so it can
       * never show ticked while the record says otherwise — legacy's gate
       * returns before the re-render and leaves exactly that (`10e` §16.9).
       */
      cell: (incident) => {
        const failed = deps.failure(incident.id)
        if (failed) {
          return (
            <ErrorState
              scope="row"
              message={failed.message}
              action={{ label: t('queue.error.retry'), onClick: failed.retry }}
            />
          )
        }

        const done = stepsDone(incident)
        const total = SAFETY_PROTOCOL_STEPS.length

        /* **AC-317** — a closed incident converts in place and its outcome,
           actor and time are legible without opening it. Q-27: it goes MUTED,
           never `opacity: .7` (`:10929`), which is the disabled treatment and
           promises the row will come back. */
        if (incident.status === 'closed') {
          return (
            <DecisionBadge
              outcome={t('safety.decided.closed')}
              meta={
                incident.closedAt === null
                  ? null
                  : t('queue.decided.by', {
                      actor: incident.closedByUserName ?? '',
                      date: formatDate(incident.closedAt, { style: 'day-month-time', language }),
                    })
              }
              late={incident.slaBreachedAt !== null || incident.firstResponseBreachedAt !== null}
              lateLabel={t('queue.decided.late')}
            />
          )
        }

        const blocked = total - done
        return (
          <span className="flex items-center gap-2">
            {/* **AC-308's visible half — four boxes ARE the count.**
                §7.3's budget left 144px of content in this lane and a `2 of 4`
                span beside the boxes did not fit inside it. It is also
                redundant: four checkboxes, two ticked, states how many remain
                more directly than a fraction does, and it states it in a form
                that survives colour being removed. The NUMBER still reaches a
                screen reader — it is the disabled `Close` button's reason, and
                every box carries the step's own name. */}
            <span
              className="flex items-center gap-1"
              role="group"
              aria-label={t('safety.step.countLabel', {
                done: formatCount(done, language),
                total: formatCount(total, language),
              })}
            >
              {SAFETY_PROTOCOL_STEPS.map((key) => {
                const step = incident.protocol.find((entry) => entry.key === key)
                const ticked = step?.done ?? false
                /* **Q-69 / AC-315** — `document` requires the other three.
                   `contact`, `verify` and `act` may be completed in any order,
                   because in a real incident you may suspend a captain before
                   you have verified anything. What you cannot do is document an
                   outcome that has not happened. */
                const blockedByOrder =
                  key === 'document' &&
                  !ticked &&
                  incident.protocol.some((entry) => entry.key !== 'document' && !entry.done)
                const disabled = !deps.canWrite || blockedByOrder
                return (
                  <Checkbox
                    key={key}
                    checked={ticked}
                    disabled={disabled}
                    /* §7.5 — an icon-only control is never colour-alone and
                       always carries an accessible name. */
                    aria-label={t('safety.step.a11y', {
                      step: t(STEP_LABEL[key]),
                      incident: incident.id,
                    })}
                    title={
                      blockedByOrder
                        ? t('safety.step.documentBlocked')
                        : deps.canWrite
                          ? t(STEP_LABEL[key])
                          : t('queue.action.noPermission')
                    }
                    onCheckedChange={(next) => deps.onToggleStep(incident, key, next === true)}
                  />
                )
              })}
            </span>
            <Button
              variant="secondary"
              size="xs"
              className="shrink-0"
              onClick={() => deps.onClose(incident)}
              /* **AC-308** — disabled while any step is outstanding, and the
                 reason says HOW MANY. Gated at render, so `closeSafetyIncident`'s
                 422 `protocol_incomplete` is unreachable from this screen. */
              disabled={!deps.canWrite || blocked > 0}
              title={
                !deps.canWrite
                  ? t('queue.action.noPermission')
                  : blocked === 1
                    ? t('safety.action.close.blockedOne')
                    : blocked > 1
                      ? t('safety.action.close.blocked', {
                          count: formatCount(blocked, language),
                        })
                      : t('safety.action.close.help')
              }
            >
              {t('safety.action.close')}
            </Button>
          </span>
        )
      },
    },

    /* ── behind the column control (§7.4) ─────────────────────────────── */
    {
      id: 'id',
      emphasis: 'primary',
      csv: (incident) => incident.id,
      header: t('queue.col.id'),
      width: 112,
      dataType: 'id',
      defaultHidden: true,
      sortField: 'id',
      cell: (incident) => <MutedCell className="tabular-nums">{incident.id}</MutedCell>,
    },
    {
      id: 'type',
      header: t('queue.col.type'),
      width: 136,
      dataType: 'enum',
      defaultHidden: true,
      sortField: 'type',
      filter: {
        kind: 'multi-select',
        field: 'type',
        options: (Object.keys(TYPE_LABEL) as SafetyIncidentType[]).map((value) => ({
          value,
          label: t(TYPE_LABEL[value]),
        })),
      },
      cell: (incident) => <Cell>{t(TYPE_LABEL[incident.type])}</Cell>,
    },
    {
      id: 'opened',
      header: t('queue.col.opened'),
      width: 136,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'openedAt',
      cell: (incident) => (
        <Cell>
          <bdi>{formatDate(incident.openedAt, { style: 'day-month-time', language })}</bdi>
        </Cell>
      ),
    },
  ]
}
