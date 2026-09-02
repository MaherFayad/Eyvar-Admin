/**
 * Operations › People — view **Captains**. Design spec §9.1, §9.4 (`index`).
 *
 * §9.4's table, verbatim: *Captains → `index` → checkbox column, kebab, sort
 * popover, bulk bar.* All four are here, and the mode is `table.mode` off
 * `useIndexTable`, never a prop.
 *
 * **The columns, and why each one is there.** The legacy roster
 * (`renderDriversTable`, `eyvar_ops_panel_v40_fixed.html:6344`–`:6400`) shows
 * nine: captain (with an inline rating badge and `id · vehicle` beneath),
 * vehicle class, tier, `activeSubs` as the string `'4/5'`, capacity, on-time,
 * month earnings, status, and a `View 360°` button.
 *
 *   kept        captain · status · rating · city · subs · trips · on-time ·
 *               earned — the eight an ops manager sorts and scans by.
 *   split out   `id` becomes its own column instead of a second line under the
 *               name. §9.1 allows a second line "when a value only qualifies
 *               the primary one", and an id does not qualify a name — it is
 *               the thing operators search by. Keeping it as a second line
 *               would also put **every** row at 48px and cost the screen a
 *               third of its density (D-2).
 *   converted   `'4/5'` was one string in legacy and cannot be compared or
 *               sorted; it is two integers here and renders through one key.
 *   added       `Last trip`, because `lastTripAt: null` is a real fixture
 *               state (`DRV-0203`, a captain who has never driven) and the
 *               roster never showed it.
 *   demoted     tier, class, vehicle, phone and joined date are real but
 *               secondary; they ship **behind the column control**, which is
 *               what §9.1 asks for past ~6 columns.
 *   dropped     `capacity` (`'1 open' | 'Full'`) — it is `maxSubscriptions −
 *               activeSubscriptions`, so showing both a value and its own
 *               arithmetic is the derived-value duplication §8.2 warns about.
 *
 * Rules applied
 *   §9.1/AC-43  the identity is a LINK — here to the 360° profile layer, since
 *               a captain has no detail route of its own (`?entity=`, an
 *               overlay param on this route, **AC-21** and **AC-22**).
 *   §9.1        the second line appears only on a **suspended** captain, where
 *               it carries the suspension reason. It qualifies the name; a
 *               suspension with no stated reason is not appealable
 *               (`clients/drivers.ts`).
 *   §9.1/R4     rating, subs, trips, on-time and earnings are inline-END with
 *               `tabular-nums`; the name, id, city and dates are inline-START.
 *   §8.3.1      money is integer halalas through `Money`, `unit="none"`,
 *               because the header carries `(SAR)` once.
 *   §11.2       `Suspend` and `Reinstate` are gated **at render**: without
 *               `approve_drivers` they are disabled in place with the reason,
 *               never hidden and never checked at commit (`:10237` is the
 *               systemic legacy defect). The predicate and the sentence both
 *               come from `@/commands` now — see below.
 *   §9.1/§5.3   the bulk confirmation names the verb and the count, says what
 *               will NOT change, and its primary repeats the verb. **Blue, not
 *               red** — a suspension is reversible and R5a spends red only on
 *               the unrecoverable.
 *   AC-25       selection resets on any view, filter or query change —
 *               `useIndexTable` does it synchronously, and switching People's
 *               view tab unmounts this component entirely.
 *
 * **This screen declares no action — CM-1 (D9, `design/05-command-centre.md`
 * §2, phase C-1).** It names a scope and renders what the registry returns.
 *
 * Before C-1, `Suspend captain` was declared here twice: once in `rowActions`
 * with a `disabled` predicate and once in `bulkActions` with none. The bulk bar
 * therefore suspended a captain the kebab on that same row refused — the
 * four-way duplication D9 exists to remove, caught in the act. Both lists now
 * come from `CAPTAIN_COMMANDS` through `resolveCommands`, the refusal comes
 * from `unavailableReason`, and every mutation goes through `runCommand`, so
 * the two surfaces cannot answer differently because there is only one answer.
 *
 * What stays here is what belongs to a screen and not to a command: **where the
 * question is asked** (the modal — §3 records that the palette will eventually
 * ask it in the palette instead) and **what to do with the result** (overlay
 * the returned rows, clear the selection, toast). The command owns the copy,
 * the predicate and the write.
 *
 * **That shortfall is closed (P4-T1).** `BulkAction` had no `disabled` and no
 * `reason`, so the bulk bar could only refuse **after** the click, as a toast -
 * gating at commit, which is the legacy behaviour §11.2 exists to replace. Both
 * fields now exist on `BulkAction`, `PeopleTable` no longer strips them, and
 * the bulk bar asks `unavailableReason` over the WHOLE SELECTION at render.
 *
 * The set reading is the strict one `captains.ts` already documents: **refused
 * if any selected captain would be refused on its own row**, with the sentence
 * naming how many. Acting on the eligible subset would silently drop records
 * the operator picked; refusing only when every target is ineligible would let
 * the bulk bar suspend a captain the kebab refuses, which is the divergence D9
 * records. `runCommand`'s check at dispatch stays as a backstop - the gate is
 * now at render, and the toast is what a refusal that slipped past it produces.
 */

import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CAPTAIN_COMMANDS,
  resolveCommands,
  runCommand,
  toastOutcome,
  unavailableReason,
  usePublishCommandSelection,
  type Command,
  type CommandContext,
  type CommandHost,
  type CommandResult,
} from '@/commands'
import { listDrivers } from '@/data/clients'
import type { Driver, Paginated } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { withOverlay } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, MutedCell, NumCell } from './cells'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { DRIVER_STATUS, DRIVER_TIER, VEHICLE_CLASS } from './domain'
import type { ExtraFilterSpec } from '@/components/DataTable'
import { PeopleTable, type PeopleColumn } from './PeopleTable'
import type { ViewChrome } from './views'
import { useRowOverrides } from './useRowOverrides'

/**
 * The two lists, resolved once at module scope because they depend on nothing
 * the screen holds — **CM-1**. `plural: false` is the row kebab and gets every
 * captain command; `plural: true` is the bulk bar and gets only the ones that
 * declared they mean something over a set, which is why `Open 360° profile`
 * appears in one and not the other without this file saying so.
 */
const ROW_COMMANDS = resolveCommands(CAPTAIN_COMMANDS, { entityType: 'driver', plural: false })
const BULK_COMMANDS = resolveCommands(CAPTAIN_COMMANDS, { entityType: 'driver', plural: true })

export function CaptainsView({ chrome, t, language, canWrite }: ViewChrome) {
  const location = useLocation()
  const navigate = useNavigate()

  const table = useIndexTable<Driver>({
    mode: 'index',
    getRowId: (driver) => driver.id,
    initialSort: { field: 'name', dir: 'asc' },
  })

  /**
   * **P3-T7 — what is selected here IS the palette's target.**
   *
   * Without this the palette's selection pre-seed has no production caller and
   * exists only in its own test: an operator ticks two captains, presses ⌘K,
   * and the palette asks them to pick a target they have already picked. With
   * it the chip reads `2 captains` before a key is pressed and the target step
   * is skipped — which is the whole reason the palette is faster than the bulk
   * bar rather than a second route to it.
   *
   * `selectOnly` is passed so D21's `Select only the N eligible` narrows **this
   * table's** selection too: the bulk bar behind the palette visibly updates,
   * and the count in the outcome toast is still the count the operator saw
   * (AC-961). Never a partial apply.
   */
  usePublishCommandSelection('driver', table.selectedIds, table.selectOnly)

  const data = useAsync<Paginated<Driver>>(
    (signal) => listDrivers({ ...table.params }, signal),
    { deps: [table.params], cacheKey: 'drivers.list' },
  )

  const overrides = useRowOverrides<Driver>()
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)
  /**
   * The pending confirmation's resolver. `CommandHost.confirm` is a promise so
   * a command can read the operator's answer inline — `ConfirmDialog` is a
   * callback surface, and this ref is the whole of the adaptation between them.
   * Cleared on the way out either way, so a dismissed dialog can never resolve
   * twice.
   */
  const answer = useRef<((reason: string | null) => void) | null>(null)

  const rows = overrides.apply(data.data?.items ?? [])
  const profileHref = (id: string) => ({
    pathname: location.pathname,
    search: withOverlay(location.search, 'entity', id),
  })

  function settle(reason: string | null) {
    const resolve = answer.current
    answer.current = null
    resolve?.(reason)
  }

  /**
   * **CQ-4** — the only things a command may reach the screen for. Everything
   * it writes, it writes through `@/data/clients` inside its own `run`.
   */
  const host: CommandHost = {
    /* A captain has no detail route of its own, so this is an overlay param on
       the current route (AC-21, AC-22), same as the identity cell's link. */
    openProfile: (_entityType, id) => navigate(profileHref(id)),
    confirm: (request) =>
      new Promise<string | null>((resolve) => {
        answer.current = resolve
        setConfirm({
          ...request,
          /**
           * **`destructive` cannot be answered here, and it is deliberately
           * not guessed.** `CommandConfirmRequest` (`commands/registry.ts`)
           * carries no such field, so every command-driven confirmation on
           * this screen renders the ordinary primary. That is the right answer
           * for both captain commands today - `captains.ts:275` declares
           * `affordance: 'default'` for suspend with R5a's reasoning, and
           * reinstate is its inverse - but it is right by luck, not by wiring.
           * The fix is one field: `CommandConfirmRequest.destructive`, fed from
           * the command's own `affordance`, spread through here with the rest.
           * `src/commands/` belongs to another owner; raised in the G5 handoff.
           */
          onConfirm: ({ reason }) => {
            /* Busy from the moment they commit until the command settles — the
               dialog stays up and un-dismissable while the write is in flight,
               which is what it did before. */
            setBusy(true)
            settle(reason)
          },
        })
      }),
  }

  const context = (targets: readonly Driver[]): CommandContext<Driver> => ({
    targets,
    t,
    language,
    /* CQ-7 / Q4 — one boolean, read only by `roleRefusal`. */
    session: { canWrite },
    host,
  })

  /**
   * **The one dispatch path** — every surface on this screen goes through it,
   * which is half of CM-3 (the other half is `unavailableReason`, below).
   *
   * The mock clients return the updated record and do **not** write it back to
   * the fixture array, so `outcome.changed` is held over the list for the life
   * of the view — see `useRowOverrides` and the handoff's note to
   * mock-data-engineer.
   */
  async function dispatch(command: Command<Driver>, targets: readonly Driver[]) {
    let result: CommandResult<Driver>
    try {
      result = await runCommand(command, context(targets))
    } finally {
      setBusy(false)
    }

    /* §11.2's weaker half: the bulk bar has no field to carry a disabled state
       or a reason, so its refusal is stated after the click. See the header. */
    if (result.kind === 'refused') {
      toast(result.reason)
      return
    }

    setConfirm(null)
    if (result.kind === 'cancelled' || result.outcome === null) return
    result.outcome.changed?.forEach(overrides.record)
    table.clearSelection()
    /* **`toastOutcome`, not `toast` — otherwise the row kebab drops the undo
       handle on the floor.** `CommandOutcome` carries D18's inverse operation,
       and a bare `toast(message)` renders the sentence and discards it. The
       command was undoable from ⌘K and not from the surface it belongs to,
       which is D9's divergence in a third place: one predicate, two surfaces,
       two different answers about the same act. */
    toastOutcome(result.outcome, t)
  }

  const columns = captainColumns(t, language, profileHref)

  return (
    <>
      <PeopleTable
        t={t}
        language={language}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(driver) => driver.id}
        columns={columns}
        skeletonPattern="P1"
        {...chrome}
        searchPlaceholder={t('people.search.captains')}
        extraFilters={captainExtraFilters(t)}
        /* CM-1 — three ids, no declarations. CM-2 — the label is `titleKey`,
           rendered here and named nowhere. §11.2 / AC-368 — `disabled` and
           `reason` are the same call, so a dead control cannot lose its
           sentence on the way to the screen. */
        rowActions={ROW_COMMANDS.map((command) => ({
          label: t(command.titleKey),
          onSelect: (driver: Driver) => void dispatch(command, [driver]),
          disabled: (driver: Driver) => unavailableReason(command, context([driver])) !== null,
          reason: (driver: Driver) => unavailableReason(command, context([driver])),
          /* **P0-2 — the declared row-click target, read from the command's
             own `section`.** `go` is the registry's word for a command that
             navigates and decides nothing, and `captain.openProfile` is the
             only `go` on this table; `suspend` and `reinstate` are `do`. Keyed
             off the declaration rather than the translated label, which is the
             defect this replaces. */
          rowClick: command.section === 'go',
        }))}
        /* §13.4 — the inverted strip takes the compact form (`Suspend`), which
           the command declares beside its full one so the two cannot drift. */
        bulkActions={BULK_COMMANDS.map((command) => {
          /* The selection, as records. `unavailable` takes the same array
             whether it holds one captain or twelve, which is exactly why the
             row menu and the bulk bar cannot answer differently. */
          const targets = rows.filter((driver) => table.selectedIds.has(driver.id))
          const refusal = targets.length === 0 ? null : unavailableReason(command, context(targets))
          /* **D21's escape hatch**, derived from the SAME predicate rather than
             from a second copy of it: a captain is eligible exactly when the
             command would accept them on their own row. `unavailable` takes the
             same array shape whether it holds one record or twelve, which is
             what makes asking it per row legitimate here.

             **Reported, not worked around:** `captains.ts` declares `.one` and
             `.other` and not D21's third sentence, so a selection in which
             EVERY captain is already suspended still reads `3 of the selected
             captains are already suspended`. The `.all` key belongs beside the
             other two in the domain registry, which this task does not own. */
          const eligibleIds = new Set(
            targets
              .filter((driver) => unavailableReason(command, context([driver])) === null)
              .map((driver) => driver.id),
          )
          return {
            label: t(command.compactTitleKey ?? command.titleKey),
            onClick: (ids: ReadonlySet<string>) =>
              void dispatch(
                command,
                rows.filter((driver) => ids.has(driver.id)),
              ),
            /* §11.2 - disabled IN PLACE, at rest, with its reason as real text
               above the pill. Not a tooltip, and not a toast after the click. */
            disabled: refusal !== null,
            reason: refusal,
            eligibleIds: eligibleIds.size === targets.length ? undefined : eligibleIds,
          }
        })}
        firstRun={{
          heading: t('people.empty.captains.heading'),
          body: t('people.empty.captains.body'),
          actions: [
            {
              label: t('people.empty.captains.primary'),
              primary: true,
              onClick: () => chrome.onSelectTab('applications'),
            },
          ],
        }}
        noMatch={{
          message: t('people.empty.captains.noMatch'),
          action: { label: t('table.clearFilters'), onClick: table.clearAll },
        }}
        error={{ message: t('people.error.captains'), onRetry: data.refetch }}
      />

      <ConfirmDialog
        request={confirm}
        /* Dismissing answers the command with `null`, which is how `run`
           learns it was cancelled and returns without writing anything. */
        onClose={() => {
          settle(null)
          setConfirm(null)
        }}
        busy={busy}
        t={t}
      />
    </>
  )
}

/* ─────────────────────────────── columns ─────────────────────────────── */

/**
 * §6.4 — two filters bound to no visible column.
 *
 *   `suspended`      the roster already carries `status: 'suspended'`, so it
 *                    earns no column of its own — but an operator auditing
 *                    dispatch wants it as a filter.
 *   `openComplaints` a count with no column: it belongs to Risk & Fraud, and
 *                    §8.2 forbids recomputing it here. As a bound it is honest.
 *
 * Both are `filterable` on `src/data/clients/drivers.ts`. Every filter in this
 * file is; the handoff lists the fields that are NOT, and therefore have no
 * control here yet.
 */
function captainExtraFilters(t: Translate): ExtraFilterSpec[] {
  return [
    {
      field: 'suspended',
      label: t('people.filter.field.suspended'),
      kind: 'boolean',
      trueLabel: t('people.filter.value.suspended.true'),
      falseLabel: t('people.filter.value.suspended.false'),
    },
    {
      field: 'openComplaints',
      label: t('people.col.complaints'),
      kind: 'number-range',
      unit: 'count',
    },
  ]
}

/**
 * §15 — every column declares its inline size, its data type and, where the
 * client says the field is filterable, its filter kind.
 *
 * **The widths are not decoration.** §7.2: a column sized `auto` has no sticky
 * offset until layout has run, and an offset computed after layout is a frame of
 * visible jump on every scroll — so a pinnable column MUST declare one. They are
 * also what makes this table overflow at the 1280 floor rather than squeeze a
 * column below legibility (§3.1), which is what the pinning is for.
 */
export function captainColumns(
  t: Translate,
  language: Language,
  profileHref: (id: string) => { pathname: string; search: string },
): ReadonlyArray<PeopleColumn<Driver>> {
  return [
    {
      id: 'captain',
      emphasis: 'primary',
      csv: (d) => d.name,
      header: t('people.col.captain'),
      /* AC-104 — column index 0 is the identity: pinned implicitly and
         permanently, never hideable, never unpinnable. */
      alwaysVisible: true,
      /* **§7.3 rule 2 — the one flexible column.** It declares no `width`, so
         it absorbs 100 % of the residual the fixed columns leave: 278px at
         1280, 406 at 1440 (content clamped to 320, the rest trailing air).
         `minWidth` is what the budget counts and what a pinned offset is
         computed from, and that offset is exact at the only moment it matters:
         a table that overflows has no residual, so the column renders at
         precisely 200. */
      minWidth: 200,
      dataType: 'text',
      sortField: 'name',
      /* §7.4 — line 2 is the PHONE. The suspension reason moves to the drawer
         (§11): under R20 the second line is all-or-nothing, and a reason that
         is present on 2 rows in 25 is exactly the partial application that made
         the built table look ragged. Reported in the handoff as a real loss. */
      cell: (d) => (
        <Identity to={hrefString(profileHref(d.id))} name={d.name} secondary={d.phone} t={t} />
      ),
    },
    {
      id: 'status',
      emphasis: 'data',
      header: t('people.col.status'),
      width: 112,
      dataType: 'enum',
      /* `in` even for one selection, so ticking a second box never changes the
         query's OPERATOR (§6.1). `toFilterSpec` owns that. */
      filter: {
        kind: 'multi-select',
        field: 'status',
        options: [
          { value: 'active', label: t('people.driverStatus.active') },
          { value: 'under-review', label: t('people.driverStatus.underReview') },
          { value: 'suspended', label: t('people.driverStatus.suspended') },
          { value: 'pending', label: t('people.driverStatus.pending') },
        ],
      },
      cell: (d) => (
        <Cell>
          <StatusBadge tone={DRIVER_STATUS[d.status].tone}>
            {t(DRIVER_STATUS[d.status].key)}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'rating',
      emphasis: 'data',
      header: t('people.col.rating'),
      align: 'end',
      width: 80,
      dataType: 'number',
      sortField: 'rating',
      /* §6.1 — integer bounds. A rating is stored to one decimal, so `gte 4`
         matches 4.8; `toFilterSpec` throws on a decimal bound, because a decimal
         means someone passed major units one layer up. */
      filter: { kind: 'number-range', field: 'rating', unit: 'count' },
      /* `0` is a seeded value meaning NO RATING YET (`:2607`), and the client
         sends it as `null`. It is not a zero-star rating, so it renders as a
         word, not as a number. */
      cell: (d) =>
        d.rating === null || d.rating === 0 ? (
          <NumCell className="text-muted-foreground">{t('people.ratingNew')}</NumCell>
        ) : (
          <NumCell>{d.rating.toFixed(1)}</NumCell>
        ),
    },
    {
      id: 'trips',
      header: t('people.col.trips'),
      align: 'end',
      width: 88,
      dataType: 'number',
      sortField: 'totalTrips',
      cell: (d) => <NumCell>{formatCount(d.totalTrips, language)}</NumCell>,
    },
    {
      id: 'earned',
      emphasis: 'data',
      header: t('people.col.earned'),
      align: 'end',
      width: 128,
      dataType: 'money',
      sortField: 'monthEarningsHalalas',
      cell: (d) => (
        <NumCell>
          <Money unit="none" amount={d.monthEarningsHalalas} />
        </NumCell>
      ),
    },
    {
      id: 'city',
      /* §7.3 rule 5 — `City` is the trailing data column BECAUSE it is text.
         `Earned (SAR)` sat here and was the value the pinned action column
         painted over: `12,4` where the truth was `12,400.50`. A truncated city
         name announces itself; a truncated amount does not. */
      header: t('people.col.city'),
      width: 128,
      dataType: 'text',
      /* The option LABELS are the data values, not keys: a city name is a
         record's content, and the cell renders it untranslated too. A real API
         returns this list as a facet — see the handoff. */
      filter: {
        kind: 'multi-select',
        field: 'city',
        options: [
          { value: 'Riyadh', label: 'Riyadh' },
          { value: 'Jeddah', label: 'Jeddah' },
        ],
      },
      cell: (d) => <Cell>{d.city}</Cell>,
    },

    /* ── §7.4's default-hidden set, reachable from `Columns` (§5.3). ────────
       Rule 6: un-hiding one of these may push Σ past 910, and only THEN does
       the table scroll horizontally — which §3.1 sanctions, and which is now
       operator-initiated rather than the default state. */
    {
      id: 'id',
      header: t('people.col.id'),
      width: 112,
      /* §7.3 rule 5 — an `id`, so it may never be the trailing column. */
      dataType: 'id',
      defaultHidden: true,
      cell: (d) => <MutedCell className="tabular-nums">{d.id}</MutedCell>,
    },
    {
      id: 'subs',
      header: t('people.col.subs'),
      align: 'end',
      width: 88,
      dataType: 'number',
      defaultHidden: true,
      sortField: 'activeSubscriptions',
      cell: (d) => (
        <NumCell>
          {t('people.subsOfMax', {
            used: formatCount(d.activeSubscriptions, language),
            max: formatCount(d.maxSubscriptions, language),
          })}
        </NumCell>
      ),
    },
    {
      id: 'onTime',
      header: t('people.col.onTime'),
      align: 'end',
      width: 88,
      dataType: 'number',
      defaultHidden: true,
      sortField: 'onTimePercent',
      cell: (d) =>
        d.onTimePercent === null ? (
          <Absent numeric />
        ) : (
          <NumCell>
            {t('people.percent', { value: formatCount(d.onTimePercent, language) })}
          </NumCell>
        ),
    },
    {
      id: 'lastTrip',
      header: t('people.col.lastTrip'),
      width: 112,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'lastTripAt',
      /* `null` is a captain who has never driven — a real fixture row. `—`
         means not-applicable or unknown and is never a zero (§8.3.1). */
      cell: (d) =>
        d.lastTripAt === null ? (
          <Absent />
        ) : (
          <DateCell>{formatDate(d.lastTripAt, { style: 'day-month', language })}</DateCell>
        ),
    },
    {
      id: 'tier',
      header: t('people.col.tier'),
      width: 100,
      dataType: 'enum',
      defaultHidden: true,
      filter: {
        kind: 'multi-select',
        field: 'tier',
        options: [
          { value: 'gold', label: t('people.tier.gold') },
          { value: 'silver', label: t('people.tier.silver') },
          { value: 'standard', label: t('people.tier.standard') },
        ],
      },
      cell: (d) => <Cell>{t(DRIVER_TIER[d.tier])}</Cell>,
    },
    {
      id: 'class',
      header: t('people.col.class'),
      width: 112,
      dataType: 'enum',
      defaultHidden: true,
      filter: {
        kind: 'select',
        field: 'vehicleClass',
        options: [
          { value: 'Economy', label: t('people.class.economy') },
          { value: 'Comfort', label: t('people.class.comfort') },
        ],
      },
      cell: (d) => <Cell>{t(VEHICLE_CLASS[d.vehicleClass])}</Cell>,
    },
    {
      id: 'vehicle',
      header: t('people.col.vehicle'),
      width: 144,
      dataType: 'text',
      defaultHidden: true,
      cell: (d) => <Cell>{d.vehicle}</Cell>,
    },
    {
      id: 'phone',
      header: t('people.col.phone'),
      width: 144,
      dataType: 'text',
      /* §9.2 / A2 — a phone value is a single LTR token with no strong
         character in it, so without isolation the leading `+` takes the
         paragraph's direction and jumps sides under `dir="rtl"`. `dataType`
         says `text` because it sorts and filters like text; this says what it
         READS like. `DateCell` already isolates the value it renders — this
         makes the column say so, for the day the cell changes. */
      isolate: true,
      defaultHidden: true,
      cell: (d) => <DateCell className="tabular-nums">{d.phone}</DateCell>,
    },
    {
      id: 'joined',
      header: t('people.col.joined'),
      width: 120,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'joinedAt',
      cell: (d) => (
        <DateCell>{formatDate(d.joinedAt, { style: 'day-month-year', language })}</DateCell>
      ),
    },
  ]
}

/** `Link`'s `to` as a string, so `Identity` stays a dumb presentational cell. */
function hrefString(target: { pathname: string; search: string }): string {
  return `${target.pathname}${target.search}`
}
