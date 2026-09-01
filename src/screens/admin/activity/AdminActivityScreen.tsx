/**
 * Admin › Activity — the audit trail.
 *
 * Reads `listAuditEntries()` (`clients/audit.ts`) instead of the module-level
 * `INITIAL_LOGS` literal it shipped with. REMEDIATION-PLAN §2.2: the client
 * already existed, so this was wiring, not modelling.
 *
 * **The type reconciliation.** The screen declared its own `ActivityLogItem`;
 * the data layer's `AuditEntry` is the contract, so the screen adapted to it
 * rather than the other way round. Field by field:
 *
 *   `timestamp`                     → `at`
 *   `targetEntityType` / `…Id`      → `subjectType` / `subjectId`
 *   `details` (assembled English)   → `detail: LocalisedText` — a key plus
 *                                     params. The whole point of the type: an
 *                                     audit line written as English can never
 *                                     be read in Arabic. **Not rendered yet** —
 *                                     none of its 13 keys exist in `EN`, see
 *                                     the blocked column below.
 *   `actorRole`                     → **gone.** `AuditEntry` carries
 *                                     `actorId` + `actorName` only. Re-deriving
 *                                     the role by joining the roster here is the
 *                                     §8.2 duplication, so the column is dropped.
 *   `ipAddress`                     → **gone.** Not modelled. Reported.
 *   `category`                      → **gone**, and it was already broken: the
 *                                     screen filtered `l.category === activeTab`
 *                                     against views named `by-actor` /
 *                                     `by-action` / `by-entity`, so the default
 *                                     tab matched **zero rows** on every load.
 *   —                               → `amountHalalas` and `reasonCode` gained;
 *                                     both are first-class on the contract and
 *                                     an audit line that hides the amount it
 *                                     moved is not an audit line.
 *
 * **The three views are orderings, not filters.** `by-actor`, `by-action`,
 * `by-entity` (`routeTable.ts:823`) name a grouping. `listAuditEntries` accepts
 * `subjectType` / `subjectId` / `action` / `page` / `pageSize` — no `q`, no
 * `sort` — so the ordering and the search box are applied to the fetched page
 * here. Both are page-local until the client takes those parameters; raised
 * with mock-data-engineer, and noted here rather than left for a reader to
 * discover. The mock log is session-only and starts at zero entries, so today
 * one page is the whole log.
 *
 * **All four states** come from `DataTable`, which owns them, and each one is
 * now reachable: `status` is `data.status` (it was the literal `'content'`) and
 * the retry is `data.refetch` (it was `() => {}`).
 */

import { useMemo } from 'react'
import { toast } from 'sonner'
import { useLocation, useNavigate } from 'react-router-dom'
import { listAuditEntries } from '@/data/clients'
import type { AuditEntry, Paginated, SubTabRoute } from '@/data/types'
import { formatCount, formatDate, formatLocalisedText, type Language, type Translate } from '@/lib'
import { useAsync, useIndexTable } from '@/hooks'
import { DataTable, type BulkAction, type DataColumn } from '@/components/DataTable'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { useRouteState, withView } from '@/shell/routeState'

/**
 * A line break, as a named constant rather than as an escape written inline.
 *
 * Not a style choice: this file has twice been written through tooling that
 * turned `'\n'` into a **literal** newline inside the string literal, which
 * does not parse and takes the dev server down with it. A named constant cannot
 * be mangled the same way, and the two call sites read better for it.
 */
const NEWLINE = String.fromCharCode(10)

/**
 * Which field each view orders by. A view is a control, not a filter (§3.8) —
 * ordering keeps every row on screen, where the `category` filter it replaces
 * hid all of them.
 */
const VIEW_ORDER: Record<string, (entry: AuditEntry) => string> = {
  'by-actor': (e) => e.actorName,
  'by-action': (e) => e.action,
  'by-entity': (e) => `${e.subjectType} ${e.subjectId}`,
}

export function AdminActivityScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const route = useRouteState()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, dir, language } = shell.language

  const views = useMemo(() => [...row.views].sort((a, b) => a.order - b.order), [row.views])
  const fallback = views.find((v) => v.isDefault)?.id ?? 'by-actor'
  const activeTab = views.some((v) => v.id === route.view) ? (route.view as string) : fallback

  const table = useIndexTable<AuditEntry>({
    mode: 'index',
    getRowId: (item) => item.id,
  })

  const data = useAsync<Paginated<AuditEntry>>(
    (signal) => listAuditEntries({ page: table.page, pageSize: table.pageSize, signal }),
    { deps: [table.page, table.pageSize] },
  )

  const rows = useMemo(() => {
    const items = data.data?.items ?? []
    const query = table.params.q?.toLowerCase() ?? ''
    const matched = query
      ? items.filter((e) =>
          [e.id, e.actorName, e.actorId, e.action, e.subjectId, e.subjectType, e.reasonCode ?? '', e.note ?? '']
            .join(' ')
            .toLowerCase()
            .includes(query),
        )
      : items
    const key = VIEW_ORDER[activeTab]
    if (!key) return matched
    /* Stable within a group: the client returns newest-first, and
       `Array.prototype.sort` is specified stable, so equal keys keep it. */
    return [...matched].sort((a, b) => key(a).localeCompare(key(b), language))
  }, [data.data, table.params.q, activeTab, language])

  /* A query that matches nothing is an EMPTY table, not a content table with no
     rows — `DataTable` reads `table.isFiltered` and renders `no-match` (AC-37).
     Unfiltered, an empty audit log is `first-run` (AC-38): it is append-only and
     holds nothing until the first mutating action. */
  const status = data.status === 'content' && rows.length === 0 ? 'empty' : data.status

  /* §11.3 — the skeleton shape comes from the ROUTE (`patterns: ['P1']`).
     `DataTable` accepts the three table shapes; anything else is an index. */
  const routePattern = row.patterns[0]
  const skeletonPattern = routePattern === 'P7' || routePattern === 'P8' ? routePattern : 'P1'

  const columns: DataColumn<AuditEntry>[] = useMemo(
    () => [
      {
        id: 'id',
        header: t('admin.activity.column.event'),
        width: 110,
        dataType: 'id',
        cell: (item) => <span className="font-mono text-xs font-semibold text-foreground">{item.id}</span>,
      },
      {
        id: 'actor',
        header: t('admin.activity.column.operator'),
        width: 170,
        dataType: 'text',
        cell: (item) => (
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-foreground">{item.actorName}</span>
            <span className="text-2xs text-muted-foreground">{item.actorId}</span>
          </div>
        ),
      },
      {
        id: 'action',
        header: t('admin.activity.column.action'),
        width: 160,
        dataType: 'enum',
        cell: (item) => <span className="font-mono text-xs font-medium text-foreground">{item.action}</span>,
      },
      /* **UNBLOCKED.** `AuditEntry.detail` is a `LocalisedText`, and all 14 keys
         the financial clients mint for it were absent from `EN` — this screen is
         the first UI consumer of `detail`, which is why three waves passed
         without anyone noticing. Rendering one threw AC-74's dev-time
         `Missing translation key "fin.audit.gatewayDefaulted"`.

         Two things landed since, and both were needed:
           - the 14 keys, in `screens/financials/copy.ts` (the `fin.` prefix owns
             them) — plus a fifteenth, `fin.posting.deductionReceivable`, that a
             new guard found while it was there;
           - `formatLocalisedText`, because resolving the key is only half the
             contract. `common.ts` promises *"money params stay integer halalas so
             `formatMoney` is still the only formatter"*, and `t()`'s interpolation
             ends in `String(value)` — so `{ netHalalas: 450000 }` rendered
             through `t()` alone reads `450000` at an operator.

         `i18n/localisedKeys.test.ts` now fails the build if the data layer mints
         a `LocalisedText` key the dictionary does not carry, so this cannot
         regress into a fourth wave. */
      {
        id: 'detail',
        header: t('admin.activity.column.detail'),
        width: 300,
        dataType: 'text',
        cell: (item) => (
          <span className="text-xs text-foreground">{formatLocalisedText(item.detail, t)}</span>
        ),
      },
      {
        id: 'note',
        header: t('admin.activity.column.note'),
        width: 220,
        dataType: 'text',
        cell: (item) =>
          item.note === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="text-xs text-foreground truncate">{item.note}</span>
          ),
      },
      {
        id: 'subject',
        header: t('admin.activity.column.target'),
        width: 160,
        dataType: 'text',
        cell: (item) => (
          <div className="flex flex-col text-xs">
            <span className="font-mono text-foreground">{item.subjectId}</span>
            <span className="text-2xs text-muted-foreground">{item.subjectType}</span>
          </div>
        ),
      },
      {
        id: 'amount',
        header: t('admin.activity.column.amount'),
        align: 'end',
        width: 120,
        dataType: 'money',
        /* `null` is an act that moved no money — a gateway toggle. `—` means
           not-applicable and is never a zero (§8.3.1). */
        cell: (item) =>
          item.amountHalalas === null ? (
            <span className="text-muted-foreground tabular-nums">—</span>
          ) : (
            <span className="tabular-nums"><Money unit="none" amount={item.amountHalalas} /></span>
          ),
      },
      {
        id: 'reasonCode',
        header: t('admin.activity.column.reason'),
        width: 130,
        dataType: 'text',
        defaultHidden: true,
        cell: (item) =>
          item.reasonCode === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-mono text-2xs text-muted-foreground">{item.reasonCode}</span>
          ),
      },
      {
        id: 'at',
        header: t('admin.activity.column.time'),
        width: 140,
        dataType: 'date',
        cell: (item) => <span className="text-2xs text-muted-foreground">{formatDate(item.at, { language })}</span>,
      },
    ],
    [language, t]
  )

  /* ── the bulk bar — P4-T1, under D21's set semantics ─────────────────── */

  /**
   * **D21, applied to an append-only log.** A bulk command is refused if **any**
   * selected record would be refused, the refusal names the count, there is no
   * partial apply, and the escape hatch is `Select only the N eligible` —
   * which `DataTable` renders from `eligibleIds` and runs through
   * `table.selectOnly`.
   *
   * The predicate here is the one refusal an audit entry can carry: an entry
   * with a non-null `amountHalalas` **records a money movement**, and exporting
   * one is reading financial detail. `view_finance` is the key that governs
   * that everywhere else in the product, so it governs it here.
   *
   * **This is reachable without editing a fixture.** `switchMockUser('USR-3')`
   * signs in as Support, whose three permissions do not include
   * `view_finance`; every financial mutation seeds the log with a money-moving
   * entry. So the refused state is constructed from domain state and a real
   * role rather than from a route permission that is `null` on all 35 rows and
   * currently cannot fail.
   *
   * Rule 5 — **a permission refusal outranks a domain refusal.** There is one
   * of each here and the order is explicit below, not incidental.
   */
  const canViewFinance = shell.permissions.permissions.includes('view_finance')

  const bulkActions: BulkAction[] = useMemo(() => {
    const selected = rows.filter((entry) => table.selectedIds.has(entry.id))
    const blocked = canViewFinance ? [] : selected.filter((e) => e.amountHalalas !== null)
    const eligible = selected.filter((e) => !blocked.includes(e))
    const allBlocked = blocked.length > 0 && blocked.length === selected.length

    /* **D21's three sentences, and the boundary between them is the SELECTION
       size, not the blocked count.** `.one` is *one target, blocked*; `.all` is
       *N targets, all blocked*; `.other` is *N targets, some blocked*. Keying
       `.one` off `blocked.length === 1` would render "That entry…" over a
       four-row selection with one bad row, which says nothing about the other
       three. */
    const reason =
      blocked.length === 0
        ? null
        : selected.length === 1
          ? t('admin.activity.bulk.export.refused.one')
          : allBlocked
            ? t('admin.activity.bulk.export.refused.all', {
                count: formatCount(blocked.length, language),
              })
            : t('admin.activity.bulk.export.refused.other', {
                blocked: formatCount(blocked.length, language),
                total: formatCount(selected.length, language),
              })

    return [
      {
        label: t('admin.activity.bulk.export'),
        disabled: blocked.length > 0,
        reason,
        /* Absent when everything is blocked — there is nothing to narrow to,
           and a `Select only the 0 eligible` control is a dead end. */
        eligibleIds: allBlocked ? undefined : new Set(eligible.map((e) => e.id)),
        onClick: (ids) => {
          downloadAuditCsv(rows.filter((entry) => ids.has(entry.id)), t, language)
          /* AC-961 — the number in the toast is the number the bar acted on. */
          toast.success(
            t('admin.activity.bulk.exported', { count: formatCount(ids.size, language) }),
          )
        },
      },
      {
        /* Never refused: an event id is not financial detail, and the contrast
           is what makes the refusal above legible as a rule rather than as the
           bar being broken. */
        label: t('admin.activity.bulk.copyIds'),
        onClick: (ids) => {
          void navigator.clipboard?.writeText([...ids].join(NEWLINE))
          toast.success(
            t('admin.activity.bulk.copied', { count: formatCount(ids.size, language) }),
          )
        },
      },
    ]
  }, [rows, table.selectedIds, canViewFinance, language, t])

  const tabs = views.map((v) => ({ id: v.id, label: t(v.titleKey) }))

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={t('admin.activity.meta')}
          t={t}
          dir={dir}
        />
      }
    >
      <DataTable
        table={table}
        rows={rows}
        columns={columns}
        getRowId={(item) => item.id}
        status={status}
        total={data.data?.total ?? 0}
        t={t}
        language={language}
        tableId="admin-activity"
        view={activeTab}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={(id) => navigate({ pathname: location.pathname, search: withView(location.search, id) })}
        bulkActions={bulkActions}
        searchPlaceholder={t('admin.activity.search')}
        skeletonPattern={skeletonPattern}
        firstRun={{
          heading: t('admin.activity.empty.heading'),
          body: t('admin.activity.empty.body'),
          actions: [],
        }}
        noMatch={{ message: t('admin.activity.noMatch') }}
        error={{ message: t('admin.activity.error'), onRetry: data.refetch }}
      />
    </SingleColumnPage>
  )
}

/**
 * The export itself — a CSV the operator can open, built in the browser.
 *
 * It is here rather than in the data layer on purpose: the log has already been
 * fetched, the operator selected rows from what is on screen, and a second
 * round trip could return a different set. The columns are the ones the table
 * shows, in the order it shows them, so an export and a screenshot agree.
 *
 * `detail` is resolved through `t` before it is written. A `LocalisedText` key
 * in a spreadsheet is not an audit trail.
 */
function downloadAuditCsv(entries: readonly AuditEntry[], t: Translate, language: Language): void {
  const header = [
    t('admin.activity.column.event'),
    t('admin.activity.column.operator'),
    t('admin.activity.column.action'),
    t('admin.activity.column.detail'),
    t('admin.activity.column.target'),
    t('admin.activity.column.time'),
  ]
  const rows = entries.map((entry) => [
    entry.id,
    entry.actorName,
    entry.action,
    formatLocalisedText(entry.detail, t),
    `${entry.subjectType} ${entry.subjectId}`,
    formatDate(entry.at, { language, style: 'day-month-time' }),
  ])
  const csv = [header, ...rows]
    .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join(NEWLINE)

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'eyvar-activity.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}
