/**
 * **Operations › Subscriptions** — `routeTable.ts`, shape `index`, five views.
 *
 * ## What P4-T1 and P8-T1 changed here
 *
 * **The table had a checkbox column and nothing behind it.** `mode: 'index'`
 * gives `canSelect: true` unconditionally, so every row rendered a checkbox and
 * the header a select-all — while `DataTable` only draws the bulk bar when
 * `bulkActions` is non-empty, and this screen declared none. Selecting rows
 * produced no bar, no count and no way to clear.
 *
 * **`Freeze` and `Resume` are the bulk commands.** `Cancel and settle` declares
 * `plural: false`: it moves money, the refund is server-computed per record,
 * and twelve refunds from one pill is a different risk from twelve freezes.
 *
 * **D21, in full.** A bulk command is refused if **any** selected subscription
 * would be refused on its own row; the refusal names the count in one of three
 * sentences (one, some, **all**); there is no partial apply; and the way out is
 * `Select only the N eligible`, which changes the SELECTION rather than
 * narrowing the command. One predicate answers for the row menu and the bar.
 *
 * **Three cells named an entity and none of them opened one properly.** The
 * rider and the captain were `<button onClick={navigate}>` carrying
 * `focus:outline-none` with nothing in its place — not middle-clickable, not
 * copyable, and with the focus ring removed (§7.2). The subscription's own id
 * was not a link at all. All three go through `EntityLink` now, and a
 * subscription with no captain renders **plain text with its reason** rather
 * than a dead control (§11.2).
 *
 * **§11.2 — the three row actions were HIDDEN behind `canWrite`.** An operator
 * without `manage_subscriptions` saw a kebab with two navigation items and no
 * sign that freezing or cancelling exists. They render and refuse now.
 *
 * **T1.2 / T6.1.** `Change captain` has a write (`reassignSubscriptionDriver`)
 * and is enabled; `Freeze`, `Resume` and `Cancel and settle` are resolved from
 * `src/commands/subscriptions.ts`, so the row menu, the bulk bar, the record
 * sheet and ⌘K hold one predicate and one write, and a freeze carries D18's
 * undo on every one of them.
 *
 * Rules applied
 *   §9.1 / AC-43  the first data cell is the identity and **a link**.
 *   §9.1 / R4     money, counts and percentages are inline-END, `tabular-nums`.
 *   §8.3.1        `escrowHeldHalalas: null` is *no hold*, not `0`.
 *   R5a           no red badge. `cancelled` is neutral; the WORD carries it.
 *   R3            one primary per screen, and Subscriptions has none — nobody
 *                 creates a subscription from ops.
 *   §11.2         gated at RENDER, disabled in place, with the reason.
 *   AC-74/75      every string is a key in `./copy.ts`, named placeholders only.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { listSubscriptions, reassignSubscriptionDriver } from '@/data/clients'
import type { Paginated, SubTabRoute, Subscription, SubscriptionStatus } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate } from '@/lib'
import { DataTable, type BulkAction, type DataColumn, type RowAction } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withOverlay, withView } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, NumCell } from '@/screens/queues/cells'
import { EntityLink, useEntityLinks } from '../EntityLink'
import { withFallback } from '../localCopy'
import { SUBSCRIPTIONS_EN } from './copy'
/**
 * **The commands are declared in `src/commands/subscriptions.ts`** — D9 / X9,
 * the way Trips does it. The row menu, the bulk bar, the record sheet and ⌘K
 * resolve one registry, so `Freeze` and `Resume` carry D18's undo everywhere.
 * `Change captain` stays a screen action: its confirmation is an asynchronous
 * captain picker, which `CommandConfirmRequest` cannot describe.
 */
import {
  SETTLE_REASONS,
  SUBSCRIPTION_COMMANDS,
  reassignRefusal,
  resolveCommands,
  runCommand,
  toastOutcome,
  unavailableReason,
  type Command,
  type CommandConfirmChoice,
  type CommandContext,
  type CommandHost,
  type CommandResult,
} from '@/commands'
import { CancelSettleModal, ChangeDriverModal, FreezeModal } from '@/components/actions'
import { SUBSCRIPTION_TONE } from './tone'

/**
 * Resolved once at module scope because they depend on nothing the screen
 * holds — CM-1. `plural: false` is the row kebab, `plural: true` the bulk bar.
 */
const ROW_COMMANDS = resolveCommands(SUBSCRIPTION_COMMANDS, {
  entityType: 'subscription',
  plural: false,
})
const BULK_COMMANDS = resolveCommands(SUBSCRIPTION_COMMANDS, {
  entityType: 'subscription',
  plural: true,
})

export function SubscriptionsScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { dir, language } = shell.language
  /* AC-74 — the copy lives in `./copy.ts`. See `localCopy` for what deletes
     this wrapper. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, SUBSCRIPTIONS_EN),
    [shell.language.t],
  )

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'all'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const table = useIndexTable<Subscription>({
    mode: 'index',
    getRowId: (sub) => sub.id,
    initialSort: { field: 'endsOn', dir: 'asc' },
  })

  const queryParams = useMemo(
    () => ({ ...table.params, view: activeTab }),
    [table.params, activeTab],
  )

  const data = useAsync<Paginated<Subscription>>(
    (signal) => listSubscriptions(queryParams, signal),
    { deps: [queryParams], cacheKey: 'subscriptions.list' },
  )

  /**
   * The mutated rows, held over the list until a real read agrees with them.
   * The mock clients deliberately do not write back to their fixture arrays, so
   * without this an operator freezes a subscription, reads the toast, and
   * watches the row stay active. The value held is the **response body**, never
   * something recomputed here — which is what makes the refund figure in the
   * record the server's and not the browser's.
   */
  const [overrides, setOverrides] = useState<ReadonlyMap<string, Subscription>>(() => new Map())
  const [reassigning, setReassigning] = useState<Subscription | null>(null)
  const [settling, setSettling] = useState<Subscription | null>(null)
  /** The subscriptions the freeze form is asking about — one, or the selection. */
  const [freezing, setFreezing] = useState<readonly Subscription[]>([])

  const rows = useMemo(() => {
    const raw = data.data?.items ?? []
    return overrides.size === 0 ? raw : raw.map((item) => overrides.get(item.id) ?? item)
  }, [data.data?.items, overrides])

  const canWrite = shell.permissions.permissions.includes('manage_subscriptions')

  /**
   * **P8-T1 — resolution is ASKED, not assumed.** `useEntityLinks` asks
   * `resolveProfile` once per distinct id on the page and answers `null` for
   * anything that names nothing, so an unresolvable name renders as text with
   * its reason rather than as a link into the overlay's not-found state.
   */
  const hrefFor = useEntityLinks(
    useMemo(() => rows.flatMap((sub) => [sub.id, sub.riderId, sub.driverId]), [rows]),
  )

  /** §11.2 — two different facts, two different sentences. */
  const captainReason = useCallback(
    (sub: Subscription) =>
      sub.driverId === null ? t('subs.captain.none.reason') : t('subs.entity.unresolved'),
    [t],
  )

  const record = useCallback((updated: readonly Subscription[]) => {
    setOverrides((current) => {
      const next = new Map(current)
      updated.forEach((sub) => next.set(sub.id, sub))
      return next
    })
  }, [])

  /* ── the registry: one declaration, four surfaces ───────────────── */

  /**
   * The confirmation each command asks for is one of this screen's own forms,
   * because both collect more than a sentence: a duration (`FreezeModal`, from
   * `request.choice`) and a reason code (`CancelSettleModal`). The command owns
   * the copy and the write, so the palette cannot ask a different question.
   */
  const pending = useRef<readonly Subscription[]>([])
  /** The id of the command whose question is on screen. Picks the form. */
  const asking = useRef<string>('')
  const answer = useRef<((reason: string | null) => void) | null>(null)
  const settled = useRef<{ ok: () => void; fail: (error: unknown) => void } | null>(null)
  /** The duration list the running command declared. See `FreezeModal`. */
  const [choice, setChoice] = useState<CommandConfirmChoice | null>(null)

  /** CQ-4 — the only things a command may reach this screen for. */
  const host: CommandHost = {
    openProfile: (_entityType, id) =>
      navigate({
        pathname: location.pathname,
        search: withOverlay(location.search, 'entity', id),
      }),
    confirm: (request) =>
      new Promise<string | null>((resolve) => {
        answer.current = resolve
        setChoice(request.choice ?? null)
        /* One form per command: cancel needs the reason-code list, freeze the
           duration the request just carried. */
        if (asking.current === 'subscription.cancel') setSettling(pending.current[0] ?? null)
        else setFreezing(pending.current)
      }),
  }

  const context = useCallback(
    (targets: readonly Subscription[]): CommandContext<Subscription> => ({
      targets,
      t,
      language,
      /* CQ-7 / Q4 — one boolean, read only by `roleRefusal`. */
      session: { canWrite },
      host,
    }),
    // `host` is rebuilt every render and holds only refs and the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, language, canWrite],
  )

  /**
   * **The one dispatch path.** `runCommand` re-checks the refusal, runs the
   * write, and `toastOutcome` renders D18's undo handle — a bare `toast` would
   * state the sentence and drop the inverse on the floor.
   */
  const dispatch = useCallback(
    async (command: Command<Subscription>, targets: readonly Subscription[]) => {
      pending.current = targets
      asking.current = command.id
      let result: CommandResult<Subscription>
      try {
        result = await runCommand(command, context(targets))
      } catch (error: unknown) {
        /* §11.2 — the refusal renders inside the form that asked, with the
           operator's input still on screen. */
        settled.current?.fail(error)
        settled.current = null
        return
      }
      settled.current?.ok()
      settled.current = null
      setFreezing([])
      setSettling(null)
      setChoice(null)
      if (result.kind === 'refused') {
        toast(result.reason)
        return
      }
      if (result.kind === 'cancelled' || result.outcome === null) return
      record(result.outcome.changed ?? [])
      table.clearSelection()
      toastOutcome(result.outcome, t)
    },
    [context, record, table, t],
  )

  /** §11.2 — `Change captain` is a screen action; one predicate, two surfaces. */
  const reassignReason = useCallback(
    (sub: Subscription) => reassignRefusal(sub, { canWrite, t }),
    [canWrite, t],
  )

  const runReassign = useCallback(
    async (id: string, driverId: string, driverName: string, reason: string) => {
      const changed = await reassignSubscriptionDriver(id, driverId, reason)
      record([changed])
      setReassigning(null)
      /* R9 — one line naming the object, and the name the SERVER returned. */
      toast(t('subs.toast.reassigned', { name: changed.driverName ?? driverName }))
    },
    [record, t],
  )

  /** The selection as RECORDS, which is what every predicate takes. */
  const selected = useMemo(
    () => rows.filter((sub) => table.selectedIds.has(sub.id)),
    [rows, table.selectedIds],
  )

  /* ── columns ─────────────────────────────────────────────────────────── */

  const columns: ReadonlyArray<DataColumn<Subscription>> = useMemo(
    () => [
      {
        id: 'id',
        emphasis: 'primary',
        csv: (sub) => sub.id,
        header: t('subs.col.id'),
        alwaysVisible: true,
        minWidth: 176,
        dataType: 'id',
        sortField: 'id',
        cell: (sub) => {
          const href = hrefFor(sub.id)
          /* §7.7 — line 2 QUALIFIES line 1: the plan and how far through it the
             rider is, which is what an operator reads next. One key with named
             placeholders; `plan + ' · ' + ratio` is what AC-75 forbids. */
          const secondary = t('subs.identity.secondary', {
            plan: sub.planName,
            trips: t('subs.trips.ratio', {
              completed: formatCount(sub.tripsCompleted, language),
              included: formatCount(sub.tripsIncluded, language),
            }),
          })
          /* **The identity degrades to text too** — see the same branch on
             Trips, and the `Identity` contract change requested in the handoff. */
          if (href === null) {
            return (
              <span className="flex min-w-0 max-w-80 flex-col justify-center">
                <EntityLink
                  href={null}
                  code
                  label={t('subs.open.subscription', { id: sub.id })}
                  reason={t('subs.entity.unresolved')}
                  reasonId={`sub-${sub.id}-unresolved`}
                >
                  {sub.id}
                </EntityLink>
                <span className="truncate text-xs text-muted-foreground">
                  <bdi>{secondary}</bdi>
                </span>
              </span>
            )
          }
          return (
            <Identity
              to={href}
              name={sub.id}
              code
              secondary={secondary}
              label={t('subs.open.subscription', { id: sub.id })}
            />
          )
        },
      },
      {
        id: 'riderName',
        header: t('subs.col.rider'),
        width: 152,
        dataType: 'text',
        sortField: 'riderName',
        filter: { kind: 'text', field: 'riderName' },
        /* **T5.1** — the widest Arabic rider on the fixtures measures 309px and
           this column's share of the 870px Arabic budget is 134, so a long
           patronymic chain clips. The `title` keeps the clipped half readable
           rather than lost; the width itself is the column-set decision the
           harness's numbers record. */
        cell: (sub) => (
          <Cell title={sub.riderName}>
            <EntityLink
              href={hrefFor(sub.riderId)}
              label={t('subs.open.rider', { name: sub.riderName })}
              reason={t('subs.entity.unresolved')}
              reasonId={`sub-${sub.id}-rider-unresolved`}
            >
              {sub.riderName}
            </EntityLink>
          </Cell>
        ),
      },
      {
        id: 'driverName',
        header: t('subs.col.captain'),
        width: 152,
        dataType: 'text',
        sortField: 'driverName',
        filter: { kind: 'text', field: 'driverName' },
        /* §11.2 / P8-T1 — an unassigned subscription has no captain to open, so
           the cell is plain muted text with the reason, never a dead link. */
        cell: (sub) => (
          <Cell title={sub.driverName ?? undefined}>
            <EntityLink
              href={hrefFor(sub.driverId)}
              label={t('subs.open.captain', { name: sub.driverName ?? '' })}
              reason={captainReason(sub)}
              reasonId={`sub-${sub.id}-captain-absent`}
            >
              {sub.driverName ?? t('subs.captain.none')}
            </EntityLink>
          </Cell>
        ),
      },
      {
        id: 'status',
        emphasis: 'data',
        header: t('subs.col.status'),
        width: 112,
        dataType: 'enum',
        sortField: 'status',
        filter: {
          kind: 'multi-select',
          field: 'status',
          options: (Object.keys(SUBSCRIPTION_TONE) as SubscriptionStatus[]).map((value) => ({
            value,
            label: t(`subs.status.${value}`),
          })),
        },
        cell: (sub) => (
          <Cell>
            <StatusBadge tone={SUBSCRIPTION_TONE[sub.status]}>
              {t(`subs.status.${sub.status}`)}
            </StatusBadge>
          </Cell>
        ),
      },
      {
        id: 'paidHalalas',
        emphasis: 'data',
        header: t('subs.col.paid'),
        /* T5.1 - off by default and in the picker. A subscription's paid total
           is a detail-surface figure; the 112px it spends is what `Rider` and
           `Captain` need to stop clipping the name the row is about. */
        defaultHidden: true,
        width: 112,
        align: 'end',
        dataType: 'money',
        sortField: 'paidHalalas',
        cell: (sub) => (
          <NumCell className="font-medium">
            <Money amount={sub.paidHalalas} />
          </NumCell>
        ),
      },
      {
        id: 'endsOn',
        emphasis: 'data',
        header: t('subs.col.ends'),
        width: 128,
        dataType: 'date',
        sortField: 'endsOn',
        /* §7.3 rule 5 — the trailing visible column is a DATE, never `money`
           or `id`, where a truncation reads as a different valid value. */
        cell: (sub) => <DateCell>{formatDate(sub.endsOn, { language })}</DateCell>,
      },

      /* ── behind the column control (§7.4) ─────────────────────────────── */
      {
        id: 'startedOn',
        header: t('subs.col.starts'),
        width: 128,
        dataType: 'date',
        defaultHidden: true,
        sortField: 'startedOn',
        cell: (sub) => <DateCell>{formatDate(sub.startedOn, { language })}</DateCell>,
      },
      {
        id: 'planKey',
        sortField: 'planKey',
        header: t('subs.col.plan'),
        width: 112,
        dataType: 'enum',
        defaultHidden: true,
        filter: {
          kind: 'multi-select',
          field: 'planKey',
          options: [
            { value: 'weekly', label: t('subs.plan.weekly') },
            { value: 'biweekly', label: t('subs.plan.biweekly') },
            { value: 'monthly', label: t('subs.plan.monthly') },
          ],
        },
        cell: (sub) => <Cell>{t(`subs.plan.${sub.planKey}`)}</Cell>,
      },
      {
        id: 'vehicleClass',
        sortField: 'vehicleClass',
        header: t('subs.col.class'),
        width: 112,
        dataType: 'enum',
        defaultHidden: true,
        filter: { kind: 'select', field: 'vehicleClass', options: [] },
        cell: (sub) => <Cell>{sub.vehicleClass}</Cell>,
      },
      {
        id: 'escrowHeldHalalas',
        header: t('subs.col.escrow'),
        width: 128,
        align: 'end',
        dataType: 'money',
        defaultHidden: true,
        sortField: 'escrowHeldHalalas',
        /* §8.3.1 — `null` means NO HOLD EXISTS, which is not a hold of zero.
           The client's own note makes the distinction; the cell keeps it. */
        cell: (sub) =>
          sub.escrowHeldHalalas === null ? (
            <Absent numeric />
          ) : (
            <NumCell>
              <Money amount={sub.escrowHeldHalalas} />
            </NumCell>
          ),
      },
      {
        id: 'renewalLikelihoodPercent',
        header: t('subs.col.renewal'),
        width: 144,
        align: 'end',
        dataType: 'number',
        defaultHidden: true,
        sortField: 'renewalLikelihoodPercent',
        /* "No renewal history to predict from" is a KNOWN fact about most
           first-cycle riders, so it reads in words rather than as `—`. */
        cell: (sub) =>
          sub.renewalLikelihoodPercent === null ? (
            <Cell className="text-end text-muted-foreground">{t('subs.renewal.none')}</Cell>
          ) : (
            <NumCell>
              {t('subs.renewal.percent', {
                percent: formatCount(sub.renewalLikelihoodPercent, language),
              })}
            </NumCell>
          ),
      },
      {
        id: 'frozenUntil',
        sortField: 'frozenUntil',
        header: t('subs.col.frozenUntil'),
        width: 128,
        dataType: 'date',
        defaultHidden: true,
        cell: (sub) =>
          sub.frozenUntil === null ? (
            <Absent />
          ) : (
            <DateCell>{formatDate(sub.frozenUntil, { language })}</DateCell>
          ),
      },
      {
        id: 'refundedHalalas',
        sortField: 'refundedHalalas',
        header: t('subs.col.refunded'),
        width: 128,
        align: 'end',
        dataType: 'money',
        defaultHidden: true,
        cell: (sub) =>
          sub.refundedHalalas === null ? (
            <Absent numeric />
          ) : (
            <NumCell>
              <Money amount={sub.refundedHalalas} />
            </NumCell>
          ),
      },
    ],
    [t, language, hrefFor, captainReason],
  )

  /* ── row actions (§7.8 / D8 ─ five declared, so a kebab) ─────────── */

  const rowActions: ReadonlyArray<RowAction<Subscription>> = useMemo(
    () => [
      {
        label: t('subs.action.view'),
        /* The record sheet is the 360° layer, not a drawer this screen owns:
           `?entity=SUB-*` is the one address, which is the move `TripsScreen`
           already made for the same reason. */
        onSelect: (sub: Subscription) =>
          navigate({
            pathname: location.pathname,
            search: withOverlay(location.search, 'entity', sub.id),
          }),
        /* **P0-2 — the declared row-click target.** Everything below mutates. */
        rowClick: true,
      },
      {
        /* Not a command — see the import header. §11.2: gated at render, and
           the sentence is the same one the record sheet shows. */
        label: t('subs.action.changeDriver'),
        onSelect: (sub: Subscription) => setReassigning(sub),
        disabled: (sub: Subscription) => reassignReason(sub) !== null,
        reason: reassignReason,
      },
      /* CM-1 — ids, no declarations. §11.2 / AC-368: `disabled` and `reason`
         are the same call, so a dead control cannot lose its sentence. */
      ...ROW_COMMANDS.map((command) => ({
        label: t(command.titleKey),
        onSelect: (sub: Subscription) => void dispatch(command, [sub]),
        disabled: (sub: Subscription) => unavailableReason(command, context([sub])) !== null,
        reason: (sub: Subscription) => unavailableReason(command, context([sub])),
      })),
    ],
    [t, context, dispatch, reassignReason, navigate, location.pathname, location.search],
  )

  /* ── the bulk bar (§13.4 ─ the inverted strip takes the compact form) ── */

  const bulkActions: ReadonlyArray<BulkAction> = useMemo(
    () =>
      BULK_COMMANDS.map((command) => {
        const refusal = selected.length === 0 ? null : unavailableReason(command, context(selected))
        /* **D21's escape hatch, and it is not a partial apply.** The ids in the
           CURRENT selection the command would accept, from the SAME predicate;
           `DataTable` narrows the selection through `table.selectOnly`, so the
           bar's count changes before the command can run (AC-959, AC-960). */
        const eligibleIds = new Set(
          selected
            .filter((sub) => unavailableReason(command, context([sub])) === null)
            .map((sub) => sub.id),
        )
        return {
          label: t(command.compactTitleKey ?? command.titleKey),
          onClick: (ids: ReadonlySet<string>) =>
            void dispatch(
              command,
              rows.filter((sub) => ids.has(sub.id)),
            ),
          disabled: refusal !== null,
          reason: refusal,
          eligibleIds: eligibleIds.size === selected.length ? undefined : eligibleIds,
        }
      }),
    [selected, rows, context, dispatch, t],
  )


  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))
  const total = data.data?.total ?? 0
  const meta =
    data.status === 'content'
      ? total === 1
        ? t('subs.meta.one', { count: '1' })
        : t('subs.meta.other', { count: formatCount(total, language) })
      : null

  /* AC-24 / AC-36 — a whole-read failure takes the PAGE scope: there is no
     table left for a card-scoped error to sit beside. */
  if (data.status === 'error') {
    const title = t(row.titleKey)
    return (
      <SingleColumnPage header={<PageHeader title={title} t={t} dir={dir} />}>
        <ErrorState
          scope="page"
          heading={t('state.pageError.title', { resource: title })}
          message={t('state.pageError.body')}
          action={{ label: t('state.pageError.action'), onClick: data.refetch }}
        />
      </SingleColumnPage>
    )
  }

  return (
    <SingleColumnPage header={<PageHeader title={t(row.titleKey)} meta={meta} t={t} dir={dir} />}>
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(sub) => sub.id}
        status={data.status}
        total={total}
        t={t}
        language={language}
        tableId="operations-subscriptions"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) =>
          navigate({ pathname: location.pathname, search: withView(location.search, id) })
        }
        searchPlaceholder={t('subs.search')}
        rowActions={rowActions}
        bulkActions={bulkActions}
        firstRun={{
          heading: t('subs.empty.firstRun.heading'),
          body: t('subs.empty.firstRun.body'),
          actions: [
            {
              label: t('subs.empty.firstRun.action'),
              onClick: () =>
                navigate({ pathname: location.pathname, search: withView(location.search, 'all') }),
            },
          ],
        }}
        noMatch={{ message: t('subs.empty.noMatch') }}
        error={{ message: t('subs.error.list'), onRetry: data.refetch }}
      />

      <FreezeModal
        subscriptions={freezing}
        choice={choice}
        /* Dismissing answers the command with `null`, which is how `run` learns
           it was cancelled and returns without writing anything. */
        onClose={() => {
          answer.current?.(null)
          answer.current = null
          setFreezing([])
        }}
        /* Resolved when the command settles, so the form stays open for the
           round trip and a refusal lands in place (§11.2). */
        onConfirm={(_subs, reason) =>
          new Promise<void>((ok, fail) => {
            settled.current = { ok, fail }
            answer.current?.(reason)
            answer.current = null
          })
        }
        language={language}
        t={t}
      />

      <ChangeDriverModal
        subscription={reassigning}
        open={reassigning !== null}
        onClose={() => setReassigning(null)}
        onConfirm={runReassign}
        unavailableReason={reassigning === null ? null : reassignReason(reassigning)}
        t={t}
      />

      <CancelSettleModal
        subscription={settling}
        reasonKeys={SETTLE_REASONS}
        open={settling !== null}
        onClose={() => {
          answer.current?.(null)
          answer.current = null
          setSettling(null)
        }}
        onConfirm={(_id, reason) =>
          new Promise<void>((ok, fail) => {
            settled.current = { ok, fail }
            answer.current?.(reason)
            answer.current = null
          })
        }
        language={language}
        t={t}
      />
    </SingleColumnPage>
  )
}
