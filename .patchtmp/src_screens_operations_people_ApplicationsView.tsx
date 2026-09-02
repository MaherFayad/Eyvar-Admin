/**
 * Operations › People — view **Applications**. Design spec §9.3, §9.4
 * (`queue`), **R5a**, **AC-50**.
 *
 * §9.4: *Applications → `queue` → **no** checkbox column (no bulk claim is
 * offered), owner chip, SLA countdown, dispositions, R5a's three parts,
 * breached-first ordering.* Every clause is load-bearing here:
 *
 *   no checkbox   `useIndexTable({ mode: 'queue' })` **without** `bulkClaim`
 *                 returns a table with no `selectedIds` at all, so a checkbox
 *                 column does not compile. §9.3: a queue gets one only where
 *                 every bulk action offered is a claim or assign action, and
 *                 approving in bulk "must not ship".
 *   owner chip    three states, backed by the server's `claim` (V-06).
 *   SLA           one countdown, `slaClock` against a clock the view is passed.
 *   dispositions  a closed set — `Approve`, `Reject` — declared here, rendered
 *                 in the row's action cell, and **replaced entirely once
 *                 decided** by a `DecisionBadge`.
 *   R5a           (a) one page banner with the count and `Show only breached`,
 *                 (b) a 3px `--ev-red` leading-edge marker per breached row,
 *                 (c) the pill reading `overdue 14m` **in words**. All three;
 *                 none substitutes for another (**AC-50**).
 *   ordering      breached first, then remaining time ascending, `No clock`
 *                 last — which is exactly `slaDueAt` ascending with nulls last,
 *                 so the SERVER orders it and the view never re-sorts rows it
 *                 was given.
 *
 * **Opening an item must not claim it** (§9.3; `:19301`–`:19310` claims
 * silently on open). The identity link and the kebab's `Open application` both
 * navigate; `Claim` is a separate control in a separate cell.
 *
 * **A decided row converts in place and does not vanish** (§9.3). It is not
 * dimmed with `opacity` either — `:10929` uses `.7`, which is §4.6's disabled
 * treatment and says "this will come back". Its primary text goes muted and
 * its dispositions are replaced.
 *
 * Rules applied
 *   §11.2      every disposition and every claim control is gated **at
 *              render**, disabled in place with its reason. The systemic
 *              legacy defect is that the operator clicks, waits, and is told
 *              no (`:10237`, `:11876`).
 *   AC-41      a disposition that fails renders an error scoped to **that
 *              row's action cell**; every other row stays interactive and no
 *              page-level banner appears. `approveApplicant` throws 422 when a
 *              document is unverified, which is a real, reachable failure on
 *              `APP-2205`.
 *   R3         no filled primary in a row. §9.3 permits at most one; zero
 *              satisfies both it and R3's one-primary-per-screen rule, and a
 *              blue `Approve` repeated down twenty rows is what R3 exists to
 *              prevent.
 *   §5.4       the take-over confirmation names the current owner and states
 *              that they lose the item without being asked.
 *   R18        nothing pulses, blinks or loops.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import {
  approveApplicant,
  claimApplicant,
  listApplicants,
  listTeamUsers,
  rejectApplicant,
  releaseApplicant,
} from '@/data/clients'
import type { Applicant, IsoDateTime, Paginated, TeamUser } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, slaClock, type Language, type Translate } from '@/lib'
import { Banner } from '@/components/Banner'
import { ErrorState } from '@/components/ErrorState'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Absent, Cell, DateCell, Identity, MutedCell, NumCell } from './cells'
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog'
import { APPLICANT_STATUS } from './domain'
import { PeopleTable, type PeopleColumn } from './PeopleTable'
import { DecisionBadge, OwnerChip, SlaCountdown } from './queue'
import { useNowIso } from './useNowIso'
import { useRowOverrides } from './useRowOverrides'
import { VIEW_CAPTAINS, type ViewChrome } from './views'

/** The applicant detail route (`fixtures/routeTable.ts`, `APPLICANT_DETAIL`). */
const DETAIL_PATH = '/operations/people/applications'

/** The queue's SLA scope, as the applicants client declares it. */
const BREACHED_VIEW = 'breached'

interface RowError {
  message: string
  retry: () => void
}

export function ApplicationsView({ chrome, t, language, canWrite, currentUserId }: ViewChrome) {
  const now = useNowIso()

  const table = useIndexTable<Applicant>({
    mode: 'queue',
    getRowId: (applicant) => applicant.id,
    /* §9.3's order, expressed as the one thing the server can do: earliest
       deadline first. `compare` sorts nulls last, so `No clock` lands last
       without a second pass. */
    initialSort: { field: 'slaDueAt', dir: 'asc' },
  })

  const data = useAsync<Paginated<Applicant>>(
    (signal) => listApplicants({ ...table.params }, signal),
    { deps: [table.params], cacheKey: 'applicants.list' },
  )

  /* R5a (a) — the banner states the count across the WHOLE queue, not the
     page. One extra read, one row, because a count of what is on screen would
     understate the backlog the moment there are two pages. */
  const breached = useAsync<Paginated<Applicant>>(
    (signal) =>
      listApplicants(
        {
          view: BREACHED_VIEW,
          pageSize: 1,
          /* **Only items still running.** The client's `breached` view is
             `slaDueAt < now` regardless of status, so it counts applications
             that were decided days ago — and a clock that has stopped is not a
             backlog. The banner states what is still on the operator's desk;
             `Show only breached` deliberately shows the wider set, because
             "everything that went past its SLA" is the right thing to audit.
             Raised for mock-data-engineer: the VIEW itself should probably
             exclude decided items. */
          filters: [{ field: 'status', op: 'in', value: ['pending', 'in-review'] }],
        },
        signal,
      ),
    { deps: [] },
  )

  /* The decision's actor is an id on the wire. A real API joins it; the mock
     does not, so the team list is read once and mapped here. Named in the
     handoff as a request for a `decidedBy: { id, name }` on the record. */
  /* A parameterless lookup used only to name a decision's actor - the cheapest
     read on the page to stop re-paying for. */
  const team = useAsync<TeamUser[]>((signal) => listTeamUsers(signal), {
    deps: [],
    cacheKey: 'session.teamUsers',
  })
  const actorName = (id: string | null) =>
    team.data?.find((user) => user.id === id)?.name ?? id ?? ''

  const overrides = useRowOverrides<Applicant>()
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)
  const [rowErrors, setRowErrors] = useState<ReadonlyMap<string, RowError>>(() => new Map())

  const rows = overrides.apply(data.data?.items ?? [])
  const breachedCount = breached.data?.total ?? 0
  const scoped = table.view === BREACHED_VIEW

  function clearRowError(id: string) {
    setRowErrors((current) => {
      if (!current.has(id)) return current
      const next = new Map(current)
      next.delete(id)
      return next
    })
  }

  /** Every mutation goes through here, so **AC-41** cannot be forgotten once. */
  async function run(id: string, errorKey: string, action: () => Promise<Applicant>) {
    setBusy(true)
    clearRowError(id)
    try {
      overrides.record(await action())
      return true
    } catch {
      setRowErrors((current) =>
        new Map(current).set(id, {
          message: t(errorKey),
          retry: () => void run(id, errorKey, action),
        }),
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  async function claim(row: Applicant, takeOver: boolean) {
    const ok = await run(row.id, 'people.error.row.claim', () =>
      claimApplicant(row.id, { takeOver }),
    )
    if (ok) toast(t(takeOver ? 'people.toast.takenOver' : 'people.toast.claimed'))
    setConfirm(null)
  }

  async function release(row: Applicant) {
    const ok = await run(row.id, 'people.error.row.release', () => releaseApplicant(row.id))
    if (ok) toast(t('people.toast.released'))
  }

  async function approve(row: Applicant) {
    const ok = await run(row.id, 'people.error.row.approve', () => approveApplicant(row.id))
    if (ok) toast(t('people.toast.approved'))
  }

  async function reject(row: Applicant, reason: string) {
    const ok = await run(row.id, 'people.error.row.reject', () => rejectApplicant(row.id, reason))
    if (ok) toast(t('people.toast.rejected'))
    setConfirm(null)
  }

  function askReject(row: Applicant) {
    setConfirm({
      title: t('people.reject.title', { name: row.name }),
      body: t('people.reject.body'),
      confirmLabel: t('people.reject.confirm'),
      reason: {
        label: t('people.reject.reason'),
        help: t('people.reject.reasonHelp'),
        message: t('people.reject.reasonHelp'),
      },
      onConfirm: (reason) => void reject(row, reason),
    })
  }

  function askTakeOver(row: Applicant) {
    const owner = row.claim?.ownerName ?? ''
    setConfirm({
      title: t('people.takeOver.title', { name: owner }),
      body: t('people.takeOver.body', { name: owner }),
      confirmLabel: t('people.takeOver.confirm'),
      onConfirm: () => void claim(row, true),
    })
  }

  const columns = applicationColumns({
    t,
    language,
    now,
    canWrite,
    currentUserId,
    detailHref: (id) => `${DETAIL_PATH}/${id}`,
    rowErrors,
    actorName,
    onClaim: (row) => void claim(row, false),
    onRelease: (row) => void release(row),
    onTakeOver: askTakeOver,
    onApprove: (row) => void approve(row),
    onReject: askReject,
  })

  return (
    <>
      {/* R5a (a) — ONE page-level critical banner, stating the count, with one
          secondary button that filters the list. It is the view's, not the
          route's: it is absent on the other three views (§9.4), and there is
          never more than one page-level banner (R10). */}
      {breachedCount > 0 && !scoped && (
        <Banner
          className="mb-3"
          banner={{
            id: 'people-applications-sla',
            tone: 'critical',
            title:
              breachedCount === 1
                ? t('people.queue.banner.one')
                : t('people.queue.banner.other', {
                    count: formatCount(breachedCount, language),
                  }),
            actions: [
              {
                label: t('people.queue.showBreached'),
                onClick: () => table.setView(BREACHED_VIEW),
              },
            ],
          }}
        />
      )}

      <PeopleTable
        t={t}
        language={language}
        table={table}
        now={now}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(applicant) => applicant.id}
        columns={columns}
        skeletonPattern="P8"
        {...chrome}
        searchPlaceholder={t('people.search.applications')}
        scope={
          scoped
            ? {
                label: t('people.scope.breached'),
                clearLabel: t('people.scope.clear'),
                onClear: () => table.setView(null),
              }
            : null
        }
        /* **No row kebab, and no `rowActions`.** D8: *"if only 1 action put the
           action not 3 dots"*. The single item this menu carried —
           `Open application` — navigated to `${DETAIL_PATH}/${row.id}`, which is
           byte-for-byte the destination the identity link in the same row
           already opens (§12.1: the identity opens the record). A 56px pinned
           lane, a menu and two keystrokes for a duplicate of the link beside it.

           Removing it also pays for §7.3: with the lane gone the queue's Σ is
           864 against the 870 the Arabic content region allows. §7.8 gives this
           column a `View` control in build item 11; until then the identity link
           is the one entry point, which is one more than it needs. */
        firstRun={{
          heading: t('people.empty.applications.heading'),
          body: t('people.empty.applications.body'),
          actions: [
            {
              label: t('people.empty.applications.primary'),
              primary: true,
              onClick: () => chrome.onSelectTab(VIEW_CAPTAINS),
            },
          ],
        }}
        noMatch={{
          message: t('people.empty.applications.noMatch'),
          action: { label: t('table.clearFilters'), onClick: table.clearAll },
        }}
        error={{ message: t('people.error.applications'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />
    </>
  )
}

/* ─────────────────────────────── columns ─────────────────────────────── */

export interface ColumnDeps {
  t: Translate
  language: Language
  now: IsoDateTime
  canWrite: boolean
  currentUserId: string
  detailHref: (id: string) => string
  rowErrors: ReadonlyMap<string, RowError>
  actorName: (id: string | null) => string
  onClaim: (row: Applicant) => void
  onRelease: (row: Applicant) => void
  onTakeOver: (row: Applicant) => void
  onApprove: (row: Applicant) => void
  onReject: (row: Applicant) => void
}

function isDecided(row: Applicant): boolean {
  return row.status === 'approved' || row.status === 'rejected' || row.status === 'withdrawn'
}

export function applicationColumns(deps: ColumnDeps): ReadonlyArray<PeopleColumn<Applicant>> {
  const { t, language, now } = deps

  const clockFor = (row: Applicant) =>
    slaClock({ dueAt: row.slaDueAt, startedAt: row.appliedAt }, now)

  return [
    {
      id: 'applicant',
      header: t('people.col.applicant'),
      /* AC-104 / AC-106 — the identity is implicitly pinned, and R5a's
         leading-edge marker rides it. That is what keeps a breached row's
         marker visible at EVERY horizontal scroll offset: on the scrolling
         region it would vanish the moment the operator scrolled, and R5a's
         three parts are explicit that none substitutes for another (AC-50). */
      alwaysVisible: true,
      /* §7.3 rule 2 — the one flexible column; 266px of residual at 1280. */
      minWidth: 200,
      dataType: 'text',
      sortField: 'name',
      cell: (row) => (
        <>
          {/* R5a (b) — a 3px full-height `--ev-red` marker on the row's
              LEADING edge, positioned against the row (`DataTable` makes the
              `<tr>` relative). Not a badge: no pill, no fill-plus-text, no
              label, outside the row's content box. At most ONE red carrier per
              row, and this is it. */}
          {clockFor(row).kind === 'breached' && !isDecided(row) && <RowCriticalMarker />}
          {/* §7.7 — line 2 is `Applied 24 Jun`, which is what retires the
              `Applied` COLUMN to the hidden set below. */}
          <Identity
            to={deps.detailHref(row.id)}
            name={row.name}
            secondary={t('people.applied', {
              date: formatDate(row.appliedAt, { style: 'day-month', language }),
            })}
            t={t}
          />
        </>
      ),
    },
    {
      id: 'id',
      header: t('people.col.id'),
      width: 112,
      /* §7.3 rule 5 — `APP-2204` is an `id`, so it may never be the trailing
         visible column: a truncated id reads as a different, valid id. */
      dataType: 'id',
      cell: (row) => <MutedCell className="tabular-nums">{row.id}</MutedCell>,
    },
    {
      id: 'status',
      header: t('people.col.status'),
      width: 112,
      dataType: 'enum',
      sortField: 'status',
      filter: {
        kind: 'multi-select',
        field: 'status',
        options: [
          { value: 'pending', label: t('people.applicantStatus.pending') },
          { value: 'in-review', label: t('people.applicantStatus.inReview') },
          { value: 'approved', label: t('people.applicantStatus.approved') },
          { value: 'rejected', label: t('people.applicantStatus.rejected') },
          { value: 'withdrawn', label: t('people.applicantStatus.withdrawn') },
        ],
      },
      cell: (row) => (
        <Cell>
          <StatusBadge tone={APPLICANT_STATUS[row.status].tone}>
            {t(APPLICANT_STATUS[row.status].key)}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'applied',
      header: t('people.col.applied'),
      width: 128,
      dataType: 'date',
      /* §7.4 — behind the column control: the date is the identity's second
         line now, and §6.4's rule is that state with a visible carrier does not
         get a second one. */
      defaultHidden: true,
      sortField: 'appliedAt',
      cell: (row) => (
        <DateCell>{formatDate(row.appliedAt, { style: 'day-month-time', language })}</DateCell>
      ),
    },
    {
      id: 'sla',
      header: t('people.col.sla'),
      width: 120,
      dataType: 'date',
      /* **AC-114 — no `sortField`, deliberately.** §8.4's order is a RULE, not
         an operator preference: breached first, then remaining time ascending,
         `No clock` last. A sort control able to override it would be a defect,
         so the header carries a pin and no sort block. The queue's order is set
         once, in `useIndexTable`'s `initialSort`, and the toolbar popover has no
         entry for this column either — both read the same declaration. */
      /* A decided item has no clock left to run. `—` is not-applicable, which
         is exactly what it is — never a synthetic deadline (§9.3). */
      cell: (row) =>
        isDecided(row) ? <Absent /> : <SlaCountdown clock={clockFor(row)} t={t} />,
    },
    {
      id: 'docs',
      header: t('people.col.docs'),
      align: 'end',
      width: 112,
      dataType: 'number',
      /* Behind the column control by default: at 1280px the queue's own
         furniture — SLA pill and track, owner chip plus its verb, two
         dispositions — already fills the row, and §9.1 would rather scroll
         than shrink a column below legibility. The count is one click away
         and the whole file is on the detail route. */
      defaultHidden: true,
      cell: (row) => (
        <NumCell>
          {t('people.queue.docsVerified', {
            verified: formatCount(row.docs.filter((d) => d.status === 'verified').length, language),
            total: formatCount(row.docs.length, language),
          })}
        </NumCell>
      ),
    },
    {
      id: 'owner',
      header: t('people.col.owner'),
      width: 144,
      dataType: 'enum',
      /* §6.1 — three states, so a radio group and not a switch. `null` is "not
         set"; `false` is a filter. */
      filter: {
        kind: 'boolean',
        field: 'unclaimed',
        trueLabel: t('people.queue.owner.unclaimed'),
        falseLabel: t('people.filter.value.claimed'),
      },
      /* §8.4.1 — a fixed position: the last cell before the action cell. */
      cell: (row) =>
        isDecided(row) ? (
          <Absent />
        ) : (
          <OwnerChip
            claim={row.claim}
            currentUserId={deps.currentUserId}
            now={now}
            t={t}
            canWrite={deps.canWrite}
            disabledReason={t('people.action.noPermission')}
            onClaim={() => deps.onClaim(row)}
            onRelease={() => deps.onRelease(row)}
            onTakeOver={() => deps.onTakeOver(row)}
          />
        ),
    },
    {
      id: 'decision',
      header: t('people.col.decision'),
      /* **176, and this column is a placeholder for build item 11.** §7.4 makes
         `Decision` default-hidden and moves the disposition controls into a
         116px ACTIONS lane carrying D8's `✓ ✗ View` triad. That is item 11 and
         not this pass, so the column stays visible — it is the only carrier of
         `Approve` and `Reject` today, and hiding it would take the queue's whole
         purpose off the screen to satisfy an arithmetic that is not yet real.
         176 is §7.4's own declared width for the hidden `Decision` column and it
         keeps Σ inside the budget in both languages (864 ≤ 870). When item 11
         lands this becomes `defaultHidden` and Σ drops to 844. */
      width: 176,
      dataType: 'enum',
      cell: (row) => {
        const failure = deps.rowErrors.get(row.id)
        /* AC-41 — the failure replaces THIS row's action cell and nothing
           else. No page banner, and every other row keeps working. */
        if (failure) {
          return (
            <ErrorState
              scope="row"
              message={failure.message}
              action={{ label: t('people.error.retry'), onClick: failure.retry }}
            />
          )
        }

        if (isDecided(row)) {
          return (
            <DecisionBadge
              outcome={t(
                row.status === 'approved'
                  ? 'people.queue.decided.approved'
                  : row.status === 'rejected'
                    ? 'people.queue.decided.rejected'
                    : 'people.queue.decided.withdrawn',
              )}
              meta={
                row.decidedAt === null
                  ? null
                  : t(
                      row.status === 'withdrawn'
                        ? 'people.queue.decided.byApplicant'
                        : 'people.queue.decided.by',
                      {
                        actor: deps.actorName(row.decidedByUserId),
                        date: formatDate(row.decidedAt, { style: 'day-month-time', language }),
                      },
                    )
              }
              reason={row.rejectionReason}
            />
          )
        }

        return (
          <span className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => deps.onApprove(row)}
              disabled={!deps.canWrite}
              title={deps.canWrite ? undefined : t('people.action.noPermission')}
            >
              {t('people.queue.approve')}
            </Button>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => deps.onReject(row)}
              disabled={!deps.canWrite}
              title={deps.canWrite ? undefined : t('people.action.noPermission')}
            >
              {t('people.queue.reject')}
            </Button>
          </span>
        )
      },
    },
    {
      id: 'plate',
      header: t('people.col.plate'),
      width: 128,
      dataType: 'text',
      defaultHidden: true,
      cell: (row) => <DateCell>{row.plate}</DateCell>,
    },
    {
      id: 'vehicle',
      header: t('people.col.vehicle'),
      width: 144,
      dataType: 'text',
      defaultHidden: true,
      filter: {
        kind: 'select',
        field: 'vehicleClass',
        options: [
          { value: 'Economy', label: t('people.class.economy') },
          { value: 'Comfort', label: t('people.class.comfort') },
        ],
      },
      cell: (row) => <Cell>{row.vehicle}</Cell>,
    },
    {
      id: 'city',
      header: t('people.col.city'),
      width: 120,
      dataType: 'text',
      defaultHidden: true,
      filter: {
        kind: 'multi-select',
        field: 'city',
        options: [{ value: 'Riyadh', label: 'Riyadh' }],
      },
      cell: (row) => <Cell>{row.city}</Cell>,
    },
  ]
}
