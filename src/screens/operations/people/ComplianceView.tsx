/**
 * Operations › People — view **Compliance**. Design spec §9.1, §9.4 (`index`).
 *
 * **This is the half of the merge that justifies it.** M7 (`spec §3.6`): the
 * roster and the document file are two pages over one entity, and `DRV-0106`
 * exists on the roster with **no `DB.driverDocs` entry**, so it is invisible to
 * `complianceScan()` and can never be auto-suspended for an expired document
 * (`08a` §17.9). Here that captain is a row like any other, carrying
 * `worstState: null` and the words `No documents on file` — the gap is on
 * screen instead of being a query that does not return it.
 *
 * **`worstState: null` is not `valid`.** `types/driver.ts` is explicit that
 * "reporting `valid` for one would be the most dangerous possible default", so
 * it has its own label and its own filter value.
 *
 * **The columns** follow the legacy page (`renderCompliancePage`,
 * `eyvar_ops_panel_v40_fixed.html:13320`–`:13355`): captain, then one column
 * per document type, then dispatch. Two changes:
 *   added    a `Worst` column, so the row can be scanned and sorted without
 *            reading five pills. It is the server's `worstState`, not a
 *            recomputation (§8.2).
 *   changed  the legacy tints an expired row's background `--red-lt` and puts
 *            `⛔ Suspended` in a **red badge**. There is no red badge (R5a) and
 *            no emoji in system copy (`copy.md` 3). The state is carried by the
 *            word `Expired`, by the `Suspended` dispatch cell, and by the
 *            suspension reason on the identity's second line.
 *
 * Rules applied
 *   §9.1       eleven columns ⇒ the column-visibility control appears and the
 *              table scrolls horizontally rather than shrinking a column below
 *              legibility. `table.tsx` already provides the scroll container.
 *   R17        `expiring` and `critical` share ONE warning tone; the number of
 *              days in the label is what separates them.
 *   R5a        **no row-critical marker here.** The 3px red leading edge is
 *              R5a use #3 and §8.4 scopes it to a WORK QUEUE. Compliance is an
 *              index table, so an expired document is neutral-toned and
 *              carries the word `Expired`. Raised as a finding: the type file
 *              suggests the marker and §8.4 does not grant it.
 *   §11.2      `Suspend` / `Reinstate` gate at render on `approve_drivers` -
 *              **in the bulk bar as well as the row kebab.** Before P4-T1 the
 *              two disagreed: the kebab checked `canWrite` and
 *              `suspendedReason`, and the bulk bar checked nothing and ran
 *              `askSuspend` regardless. Selecting an already-suspended captain
 *              and using the bulk bar therefore suspended them a second time,
 *              while the kebab on that same row was dead. One predicate now
 *              answers for both - `suspendRefusal` / `reinstateRefusal` below -
 *              and over a SET it refuses if **any** selected row would be
 *              refused, naming how many of how many.
 *   §8.3.1     days-remaining is computed by the UI from `expiresOn` against a
 *              clock it is PASSED (`useNowIso`), never from a module-scope
 *              `Date.now()`, and never returned by the server.
 */

import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  daysUntil,
  listDriverCompliance,
  reinstateDriver,
  suspendDriver,
} from '@/data/clients'
import type {
  ComplianceDocType,
  DriverCompliance,
  IsoDateTime,
  Paginated,
} from '@/data/types'
import { COMPLIANCE_DOC_TYPES } from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { StatusBadge } from '@/components/StatusBadge'
import { withOverlay } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, MutedCell } from './cells'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { WORST_STATE } from './domain'
import type { ExtraFilterSpec } from '@/components/DataTable'
import { PeopleTable, type PeopleColumn } from './PeopleTable'
import { setRefusal, type SetRefusal } from '../bulkRefusal'
import { useNowIso } from './useNowIso'
import { VIEW_CAPTAINS, type ViewChrome } from './views'

/**
 * The three expiring documents, **read from `COMPLIANCE_DOC_TYPES`** rather
 * than restated. It used to be a hand-written list of five, which was a second
 * home for both the order and the label keys; the constant owns both now, so a
 * change to the document set reaches this table without an edit here.
 */
const DOC_COLUMNS: ReadonlyArray<{ type: ComplianceDocType; key: string }> =
  COMPLIANCE_DOC_TYPES.map((d) => ({ type: d.key, key: d.labelKey }))

export function ComplianceView({ chrome, t, language, canWrite }: ViewChrome) {
  const location = useLocation()
  const navigate = useNavigate()
  const now = useNowIso()

  const table = useIndexTable<DriverCompliance>({
    mode: 'index',
    getRowId: (row) => row.driverId,
    initialSort: { field: 'soonestExpiry', dir: 'asc' },
  })

  const data = useAsync<Paginated<DriverCompliance>>(
    (signal) => listDriverCompliance({ ...table.params }, signal),
    { deps: [table.params], cacheKey: 'compliance.list' },
  )

  /* The compliance row and the driver record hold the SAME fact — legacy
     `DB.complianceSuspensions[driverId]` (`types/driver.ts`). Suspending from
     here returns the updated DRIVER, so its `suspensionReason` is copied onto
     the compliance row it belongs to. Copied from the response, never
     recomputed, and it dies with the view (see `useRowOverrides` for why the
     overlay is needed at all). */
  const [suspensions, setSuspensions] = useState<ReadonlyMap<string, string | null>>(
    () => new Map(),
  )
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = (data.data?.items ?? []).map((row) =>
    suspensions.has(row.driverId)
      ? { ...row, suspendedReason: suspensions.get(row.driverId) ?? null }
      : row,
  )

  function holdSuspension(driverId: string, reason: string | null) {
    setSuspensions((current) => new Map(current).set(driverId, reason))
  }

  const profileHref = (id: string) =>
    `${location.pathname}${withOverlay(location.search, 'entity', id)}`

  async function runSuspend(ids: readonly string[], reason: string) {
    setBusy(true)
    try {
      const updated = await Promise.all(ids.map((id) => suspendDriver(id, reason)))
      updated.forEach((driver) => holdSuspension(driver.id, driver.suspensionReason))
      table.clearSelection()
      toast(
        ids.length === 1
          ? t('people.toast.suspended.one')
          : t('people.toast.suspended.other', { count: formatCount(ids.length, language) }),
      )
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  async function runReinstate(ids: readonly string[]) {
    setBusy(true)
    try {
      const updated = await Promise.all(ids.map((id) => reinstateDriver(id)))
      updated.forEach((driver) => holdSuspension(driver.id, driver.suspensionReason))
      table.clearSelection()
      toast(
        ids.length === 1
          ? t('people.toast.reinstated.one')
          : t('people.toast.reinstated.other', { count: formatCount(ids.length, language) }),
      )
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  /**
   * **D21 over a set, and the rule is the strict one.**
   *
   * A bulk command is refused if **any** selected record would be refused on
   * its own row; the refusal names the count in one of three sentences; there
   * is no partial apply; and the way out is `Select only the N eligible`, which
   * changes the SELECTION and not the command. Running on the eligible subset
   * would silently drop records the operator picked and told nobody; refusing
   * only when *every* target is ineligible would let the bulk bar act on a row
   * the kebab refuses, which is the divergence this pass exists to remove.
   *
   * The same two functions answer for the row menu (`targets` of length 1) and
   * for the bulk bar, so there is no single-record code path for them to
   * disagree in. `setRefusal` supplies D21's shape, including the third
   * sentence a hand-written predicate forgets.
   */
  const roleReason = canWrite ? null : t('people.action.noPermission')

  function suspendRefusal(targets: readonly DriverCompliance[]): SetRefusal {
    return setRefusal({
      targets,
      getId: (row) => row.driverId,
      isBlocked: (row) => row.suspendedReason !== null,
      roleReason,
      blockedKeyPrefix: 'people.action.suspend.blocked',
      t,
      language,
    })
  }

  /** The mirror. Reinstating a captain who is not suspended does nothing. */
  function reinstateRefusal(targets: readonly DriverCompliance[]): SetRefusal {
    return setRefusal({
      targets,
      getId: (row) => row.driverId,
      isBlocked: (row) => row.suspendedReason === null,
      roleReason,
      blockedKeyPrefix: 'people.action.reinstate.blocked',
      t,
      language,
    })
  }

  /** The selection as RECORDS, which is what both predicates take. */
  const selected = rows.filter((row) => table.selectedIds.has(row.driverId))

  function askSuspend(ids: readonly string[]) {
    setConfirm({
      title:
        ids.length === 1
          ? t('people.confirm.suspend.title.one')
          : t('people.confirm.suspend.title.other', { count: formatCount(ids.length, language) }),
      body: t('people.confirm.suspend.body'),
      confirmLabel: t('people.confirm.suspend.confirm'),
      /* **Not destructive, and this is the ruling not an omission.** DESIGN.md
         names `deactivate` as the reversible case that MUST keep the ordinary
         primary, `askReinstate` below is the inverse one click away, the body
         says so in words - "You can reinstate them at any time" - and
         `commands/captains.ts:275` reached the same answer independently
         (`affordance: 'default'`). Red here would be R5a use #1 spent on a
         recoverable act, which is what teaches operators to ignore it. */
      destructive: false,
      reason: {
        label: t('people.confirm.suspend.reason'),
        help: t('people.confirm.suspend.reasonHelp'),
        message: t('people.confirm.suspend.reasonHelp'),
      },
      onConfirm: ({ reason }) => void runSuspend(ids, reason),
    })
  }

  function askReinstate(ids: readonly string[]) {
    setConfirm({
      title:
        ids.length === 1
          ? t('people.confirm.reinstate.title.one')
          : t('people.confirm.reinstate.title.other', {
              count: formatCount(ids.length, language),
            }),
      body: t('people.confirm.reinstate.body'),
      confirmLabel: t('people.confirm.reinstate.confirm'),
      /* The undo of the act above. Nothing is lost and nothing leaves. */
      destructive: false,
      onConfirm: () => void runReinstate(ids),
    })
  }

  return (
    <>
      <PeopleTable
        t={t}
        language={language}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(row) => row.driverId}
        columns={complianceColumns(t, language, now, profileHref)}
        skeletonPattern="P1"
        {...chrome}
        searchPlaceholder={t('people.search.compliance')}
        extraFilters={complianceExtraFilters(t)}
        /* §11.2 / **AC-368** - `disabled` and `reason` are the SAME call, so a
           dead control cannot lose its sentence on the way to the screen. The
           row menu previously disabled both with no explanation at all. */
        rowActions={[
          {
            label: t('people.action.viewProfile'),
            onSelect: (row) => navigate(profileHref(row.driverId)),
            /* **P0-2 — the declared row-click target.** `Suspend` and
               `Reinstate` mutate, so neither may carry this. */
            rowClick: true,
          },
          {
            label: t('people.action.suspend'),
            onSelect: (row) => askSuspend([row.driverId]),
            disabled: (row) => suspendRefusal([row]).refused,
            reason: (row) => suspendRefusal([row]).reason,
          },
          {
            label: t('people.action.reinstate'),
            onSelect: (row) => askReinstate([row.driverId]),
            disabled: (row) => reinstateRefusal([row]).refused,
            reason: (row) => reinstateRefusal([row]).reason,
          },
        ]}
        /* **The bulk bar asks the same two functions over the whole
           selection.** It used to ask nothing and run `askSuspend` regardless
           of `canWrite` or the row's own state. */
        bulkActions={[
          {
            label: t('people.bulk.suspend'),
            onClick: (ids) => askSuspend([...ids]),
            disabled: suspendRefusal(selected).refused,
            reason: suspendRefusal(selected).reason,
            /* **D21's escape hatch.** The ids in the current selection this
               command would accept — `DataTable` renders `Select only the N
               eligible` and narrows the SELECTION, so the bar's count changes
               before the command runs and the toast cannot name a different
               number. Empty when every selected captain is blocked, and no
               control renders then (AC-960). */
            eligibleIds: suspendRefusal(selected).eligibleIds,
          },
          {
            label: t('people.bulk.reinstate'),
            onClick: (ids) => askReinstate([...ids]),
            disabled: reinstateRefusal(selected).refused,
            reason: reinstateRefusal(selected).reason,
            eligibleIds: reinstateRefusal(selected).eligibleIds,
          },
        ]}
        firstRun={{
          heading: t('people.empty.compliance.heading'),
          body: t('people.empty.compliance.body'),
          actions: [
            {
              label: t('people.empty.compliance.primary'),
              primary: true,
              onClick: () => chrome.onSelectTab(VIEW_CAPTAINS),
            },
          ],
        }}
        noMatch={{
          message: t('people.empty.compliance.noMatch'),
          action: { label: t('table.clearFilters'), onClick: table.clearAll },
        }}
        error={{ message: t('people.error.compliance'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />
    </>
  )
}

/**
 * §6.4 — dispatch state, which the `Dispatch` column shows but the client
 * exposes as the boolean `suspended`, not as the column's own rendered value.
 * Declared here rather than on the column so the field the filter writes and
 * the value the cell reads stay visibly separate.
 */
function complianceExtraFilters(t: Translate): ExtraFilterSpec[] {
  return [
    {
      field: 'suspended',
      label: t('people.filter.field.suspended'),
      kind: 'boolean',
      trueLabel: t('people.filter.value.suspended.true'),
      falseLabel: t('people.filter.value.suspended.false'),
    },
  ]
}

export function complianceColumns(
  t: Translate,
  language: Language,
  now: IsoDateTime,
  profileHref: (id: string) => string,
): ReadonlyArray<PeopleColumn<DriverCompliance>> {
  return [
    {
      id: 'captain',
      header: t('people.col.captain'),
      /* AC-104 — the identity: implicitly pinned, never hidden, never unpinned. */
      alwaysVisible: true,
      /* §7.3 rule 2 — the one flexible column. See `CaptainsView` for the
         arithmetic; Compliance's residual is the largest of the four (302 at
         1280) because it now carries the fewest columns. */
      minWidth: 200,
      dataType: 'text',
      sortField: 'driverName',
      /* §7.7 — *"Compliance uses the id as the second line because there the id
         IS the qualifier"*. `01-people.md`'s ruling that a driver id gets its
         own column stands for Captains and is superseded here, by name. */
      cell: (row) => (
        <Identity
          to={profileHref(row.driverId)}
          name={row.driverName}
          secondary={row.driverId}
          t={t}
        />
      ),
    },
    {
      id: 'documents',
      header: t('people.col.docs'),
      /* **192, not §7.4's 160.** Measured: `4 of 5 valid 1 expired` needs ~168
         of text plus 12/12 of cell padding, and at 160 it rendered
         `4 of 5 valid 1 expi…` — a truncated derived value, which is the same
         class of defect as the truncated money §7.3 exists to remove. The
         budget pays for it: Compliance is the lightest of the four views at 808
         and 192 takes it to 840, still inside the Arabic 870. */
      width: 192,
      /* §9.2 — a DERIVED value. `4 of 5 valid` is plain text, never a badge:
         `DESIGN.md` §3.4 is a MUST and this column is where the build broke it
         hardest. The five per-document badge columns collapse into this one
         cell, which is the single largest visual change in the redesign —
         Compliance goes from 51 coloured elements to about 4, and the two rows
         that matter become the loudest things on the page. */
      dataType: 'text',
      sortField: 'worstState',
      cell: (row) => {
        /* `DRV-0106` exists on the roster with NO document file at all, and
           `worstState: null` is deliberately not `valid`. The gap keeps its own
           words; it used to live on the identity's second line, which §7.7 now
           spends on the id. */
        if (row.docs.length === 0) return <MutedCell>{t('people.doc.noneOnFile')}</MutedCell>
        const expired = row.docs.filter((d) => d.state === 'expired').length
        const valid = row.docs.length - expired
        return (
          <Cell>
            <bdi>
              {t('people.docs.summary', {
                valid: formatCount(valid, language),
                total: formatCount(row.docs.length, language),
              })}
            </bdi>
            {expired > 0 && (
              /* §9.3 — the critical TEXT tone, one of exactly three values that
                 may take it. Never colour alone: the word `expired` is in the
                 string. */
              <span className="text-critical-foreground">
                {' '}
                <bdi>{t('people.docs.expired', { n: formatCount(expired, language) })}</bdi>
              </span>
            )}
          </Cell>
        )
      },
    },
    {
      id: 'nextExpiry',
      header: t('people.col.soonestExpiry'),
      width: 128,
      dataType: 'date',
      /* §7.4 — `12 Aug · 45d`, plain text; inside the alert window the same
         text in the critical tone. Computed from a clock this component is
         PASSED (`useNowIso`), never a module-scope `Date.now()` (§8.3.1). */
      cell: (row) => {
        /* The soonest document, not the soonest DATE: the alert window is the
           SERVER's `state`, never a threshold recomputed here (§8.2). */
        const soonest = [...row.docs].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))[0]
        if (soonest === undefined) return <Absent />
        /* A document already past its date has no countdown left to state.
           `{date} · -7d` is arithmetic leaking into copy: a negative day count
           is not a duration, and §8.3.1 does not let a value mean two things.
           The word is the readout, and it is red for the same reason the
           countdown would have been. */
        if (soonest.state === 'expired') {
          return (
            <DateCell className="text-critical-foreground">
              {t('people.expiry.cellExpired', {
                date: formatDate(soonest.expiresOn, { style: 'day-month', language }),
              })}
            </DateCell>
          )
        }
        return (
          <DateCell className={soonest.state === 'valid' ? undefined : 'text-critical-foreground'}>
            {t('people.expiry.cell', {
              date: formatDate(soonest.expiresOn, { style: 'day-month', language }),
              days: formatCount(daysUntil(soonest.expiresOn, now), language),
            })}
          </DateCell>
        )
      },
    },
    {
      id: 'worst',
      header: t('people.col.status'),
      width: 112,
      dataType: 'enum',
      sortField: 'worstState',
      /* The `No file` option the previous hand-built filter offered is ABSENT,
         deliberately and reported: `worstState` is `null` for a captain with no
         documents, and `ColumnFilterValue`'s `select` reserves `null` for `Any`,
         so "the field IS null" is not expressible. `FilterOperator` has
         `isNull` and the mock engine implements it; `toFilterSpec` has no path
         to it. Raised for utilities-engineer in the handoff. */
      filter: {
        kind: 'select',
        field: 'worstState',
        options: [
          { value: 'expired', label: t('people.compliance.worst.expired') },
          { value: 'critical', label: t('people.compliance.worst.critical') },
          { value: 'expiring', label: t('people.compliance.worst.expiring') },
          { value: 'valid', label: t('people.compliance.worst.valid') },
        ],
      },
      cell: (row) => {
        const state = WORST_STATE[row.worstState ?? 'none']
        return (
          <Cell>
            <StatusBadge tone={state.tone}>{t(state.key)}</StatusBadge>
          </Cell>
        )
      },
    },
    {
      id: 'dispatch',
      header: t('people.col.dispatch'),
      width: 112,
      dataType: 'enum',
      cell: (row) => (
        <Cell>
          {/* No red badge (R5a): a blocked captain is neutral-toned and the
              WORD carries it. */}
          <StatusBadge tone={row.suspendedReason === null ? 'success' : 'neutral'}>
            {t(row.suspendedReason === null ? 'people.dispatch.active' : 'people.dispatch.suspended')}
          </StatusBadge>
        </Cell>
      ),
    },

    /* ── §7.4's default-hidden set. The five per-document columns are PLAIN
       TEXT now, not badges: 33 of Compliance's 51 badges were computed day
       counts, which `DESIGN.md` §3.4 forbids outright. ─────────────────── */
    ...DOC_COLUMNS.map<PeopleColumn<DriverCompliance>>(({ type, key }) => ({
      id: type,
      header: t(key),
      width: 112,
      dataType: 'text' as const,
      defaultHidden: true,
      cell: (row: DriverCompliance) => {
        const doc = row.docs.find((d) => d.type === type)
        /* No document of this type on file. `—` is not-applicable or unknown
           (§8.3.1) and is exactly right: there is nothing to expire. */
        if (!doc) return <Absent />
        if (doc.state === 'expired') {
          return <Cell className="text-critical-foreground">{t('people.doc.expired')}</Cell>
        }
        const days = daysUntil(doc.expiresOn, now)
        /* R17 — `expiring` and `critical` are ONE window; the day count in the
           label is what separates them. The tone comes from the server's state,
           not from a threshold this file invents. */
        const alerting = doc.state !== 'valid'
        return (
          <Cell className={alerting ? 'text-critical-foreground' : undefined}>
            <bdi>
              {t(alerting ? 'people.docs.expiring' : 'people.docs.valid', {
                days: formatCount(days, language),
              })}
            </bdi>
          </Cell>
        )
      },
    })),
    {
      id: 'id',
      header: t('people.col.id'),
      width: 112,
      /* §7.3 rule 5 — an `id` may never be the trailing column. */
      dataType: 'id',
      defaultHidden: true,
      /* §6.1 — the `text` kind, `contains`, on a 250 ms debounce. `driverId` is
         the one identifier this client declares filterable. */
      filter: { kind: 'text', field: 'driverId' },
      cell: (row) => <MutedCell className="tabular-nums">{row.driverId}</MutedCell>,
    },
    {
      id: 'vehicle',
      header: t('people.col.vehicle'),
      width: 144,
      dataType: 'text',
      defaultHidden: true,
      cell: (row) => <Cell>{row.vehicle}</Cell>,
    },
  ]
}
