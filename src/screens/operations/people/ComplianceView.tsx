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
 *   §11.2      `Suspend` / `Reinstate` gate at render on `approve_drivers`.
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
import { useAsync, useIndexTable } from '@/hooks'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { StatusBadge } from '@/components/StatusBadge'
import { withOverlay } from '@/shell/routeState'
import { Absent, Cell, DateCell, Identity, MutedCell } from './cells'
import { ConfirmDialog, type ConfirmRequest } from './ConfirmDialog'
import { DOC_STATE, WORST_STATE } from './domain'
import { PeopleTable, type PeopleColumn } from './PeopleTable'
import { useNowIso } from './useNowIso'
import { VIEW_CAPTAINS, type ViewChrome } from './views'

/** The five, in the legacy order (`DOC_TYPES`, `:13277`), with their column keys. */
const DOC_COLUMNS: ReadonlyArray<{ type: ComplianceDocType; key: string }> = [
  { type: 'license', key: 'people.col.doc.license' },
  { type: 'vehicle_reg', key: 'people.col.doc.vehicleReg' },
  { type: 'inspection', key: 'people.col.doc.inspection' },
  { type: 'insurance', key: 'people.col.doc.insurance' },
  { type: 'operating_card', key: 'people.col.doc.operatingCard' },
]

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
    { deps: [table.params] },
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

  function askSuspend(ids: readonly string[]) {
    setConfirm({
      title:
        ids.length === 1
          ? t('people.confirm.suspend.title.one')
          : t('people.confirm.suspend.title.other', { count: formatCount(ids.length, language) }),
      body: t('people.confirm.suspend.body'),
      confirmLabel: t('people.confirm.suspend.confirm'),
      reason: {
        label: t('people.confirm.suspend.reason'),
        help: t('people.confirm.suspend.reasonHelp'),
        message: t('people.confirm.suspend.reasonHelp'),
      },
      onConfirm: (reason) => void runSuspend(ids, reason),
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
      onConfirm: () => void runReinstate(ids),
    })
  }

  return (
    <>
      <PeopleTable
        t={t}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(row) => row.driverId}
        columns={complianceColumns(t, language, now, profileHref)}
        skeletonPattern="P1"
        {...chrome}
        searchPlaceholder={t('people.search.compliance')}
        sortFields={[
          { field: 'driverName', label: t('people.col.captain') },
          { field: 'worstState', label: t('people.col.docs') },
          { field: 'soonestExpiry', label: t('people.col.doc.license') },
        ]}
        filterFields={[
          {
            field: 'worstState',
            label: t('people.filter.field.worstState'),
            options: [
              { value: 'expired', label: t('people.compliance.worst.expired') },
              { value: 'critical', label: t('people.compliance.worst.critical') },
              { value: 'valid', label: t('people.compliance.worst.valid') },
              { value: null, label: t('people.compliance.worst.none') },
            ],
          },
          {
            field: 'suspended',
            label: t('people.filter.field.suspended'),
            options: [
              { value: true, label: t('people.filter.value.suspended.true') },
              { value: false, label: t('people.filter.value.suspended.false') },
            ],
          },
        ]}
        rowActions={[
          {
            label: t('people.action.viewProfile'),
            onSelect: (row) => navigate(profileHref(row.driverId)),
          },
          {
            label: t('people.action.suspend'),
            onSelect: (row) => askSuspend([row.driverId]),
            disabled: (row) => !canWrite || row.suspendedReason !== null,
          },
          {
            label: t('people.action.reinstate'),
            onSelect: (row) => askReinstate([row.driverId]),
            disabled: (row) => !canWrite || row.suspendedReason === null,
          },
        ]}
        bulkActions={[
          { label: t('people.bulk.suspend'), onClick: (ids) => askSuspend([...ids]) },
          { label: t('people.bulk.reinstate'), onClick: (ids) => askReinstate([...ids]) },
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

function complianceColumns(
  t: Translate,
  language: Language,
  now: IsoDateTime,
  profileHref: (id: string) => string,
): ReadonlyArray<PeopleColumn<DriverCompliance>> {
  return [
    {
      id: 'captain',
      header: t('people.col.captain'),
      alwaysVisible: true,
      sortField: 'driverName',
      cell: (row) => <Identity to={profileHref(row.driverId)} name={row.driverName} t={t} />,
      /* Two qualifiers, in priority order: why dispatch is blocked, or that
         there is no file at all. §9.1's own worked example is this row. */
      secondaryLine: (row) =>
        row.suspendedReason ?? (row.docs.length === 0 ? t('people.doc.noneOnFile') : null),
    },
    {
      id: 'id',
      header: t('people.col.id'),
      cell: (row) => <MutedCell className="tabular-nums">{row.driverId}</MutedCell>,
    },
    {
      id: 'worst',
      header: t('people.col.docs'),
      sortField: 'worstState',
      cell: (row) => {
        const state = WORST_STATE[row.worstState ?? 'none']
        return (
          <Cell>
            <StatusBadge tone={state.tone}>{t(state.key)}</StatusBadge>
          </Cell>
        )
      },
    },
    ...DOC_COLUMNS.map<PeopleColumn<DriverCompliance>>(({ type, key }) => ({
      id: type,
      header: t(key),
      cell: (row) => {
        const doc = row.docs.find((d) => d.type === type)
        /* No document of this type on file. `—` is not-applicable or unknown
           (§8.3.1) and is exactly right: there is nothing to expire. */
        if (!doc) return <Absent />
        const days = daysUntil(doc.expiresOn, now)
        return (
          <Cell>
            <StatusBadge tone={DOC_STATE[doc.state]}>
              {doc.state === 'expired'
                ? t('people.doc.expired')
                : t('people.doc.daysLeft', { days: formatCount(days, language) })}
            </StatusBadge>
          </Cell>
        )
      },
    })),
    {
      id: 'dispatch',
      header: t('people.col.dispatch'),
      cell: (row) => (
        <Cell>
          {/* No red badge (R5a): a blocked captain is neutral-toned and the
              WORD carries it, with the reason on the identity's second line. */}
          <StatusBadge tone={row.suspendedReason === null ? 'success' : 'neutral'}>
            {t(row.suspendedReason === null ? 'people.dispatch.active' : 'people.dispatch.suspended')}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'vehicle',
      header: t('people.col.vehicle'),
      defaultHidden: true,
      cell: (row) => <Cell>{row.vehicle}</Cell>,
    },
    {
      id: 'soonest',
      header: t('people.col.soonestExpiry'),
      defaultHidden: true,
      cell: (row) => {
        const soonest = row.docs.map((d) => d.expiresOn).sort()[0]
        return soonest === undefined ? (
          <Absent />
        ) : (
          <DateCell>{formatDate(soonest, { style: 'day-month-year', language })}</DateCell>
        )
      },
    },
  ]
}
