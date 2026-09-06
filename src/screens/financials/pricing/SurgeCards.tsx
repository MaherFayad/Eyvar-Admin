/**
 * Rate card — surge windows, suspend surge, suspensions. **AC-RC-25…31**.
 *
 * AC-410 no control here raises a multiplier; the one write is a suspension.
 * X-RC-5 the chosen chip takes `ToggleGroup`'s own on-state, never a fill.
 * X-RC-11 district narrowing is the `DataTable` column filter, not a segment.
 */

import { useCallback, useId, useMemo, useState } from 'react'
import { listSurgeSuspensions, listSurgeWindows, listZones, suspendSurge } from '@/data/clients'
import { SURGE_SUSPENSION_MAX_HOURS } from '@/data/types'
import type { FilterSpec, Paginated, SurgeSuspension, SurgeWindow, Zone } from '@/data/types'
import { useAsync, useIndexTable, useNow } from '@/hooks'
import { formatCount, formatDate, formatDuration, type Language, type Translator } from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { KEY_VALUE_CELL, KEY_VALUE_HEAD, KEY_VALUE_ROW, KeyValueTable } from '@/components/KeyValueGrid'
import { StatusBadge } from '@/components/StatusBadge'
import { RefusalLine } from '@/components/table/rowActions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useShell } from '@/shell/ShellContext'
import { ConfirmMoneyDialog, type MoneyConfirmRequest } from '../shared/ConfirmMoneyDialog'
import { useMoneyActions } from '../shared/actions'

/** F-RC-3 — legacy stores `Sun`…`Sat` in English; the column translates them. */
const DAY_KEYS: Record<string, string> = {
  sun: 'fin.pricing.surge.day.sun',
  mon: 'fin.pricing.surge.day.mon',
  tue: 'fin.pricing.surge.day.tue',
  wed: 'fin.pricing.surge.day.wed',
  thu: 'fin.pricing.surge.day.thu',
  fri: 'fin.pricing.surge.day.fri',
  sat: 'fin.pricing.surge.day.sat',
}

export function SurgeCards({ gate }: { gate: { canWrite: boolean; reason: string } }) {
  const shell = useShell()
  const { t, language } = shell.language
  const actions = useMoneyActions<SurgeSuspension>({ keyOf: (suspension) => suspension.id })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const windows = useAsync<SurgeWindow[]>((signal) => listSurgeWindows(signal), {
    deps: [],
    cacheKey: 'pricing.surgeWindows',
  })
  const suspensions = useAsync<SurgeSuspension[]>((signal) => listSurgeSuspensions(signal), {
    deps: [],
    cacheKey: 'pricing.surgeSuspensions',
  })
  /* **Deliberately NOT cached (P3-13).** `zones.list` is the Zones surface's
     operation and this is a parameterless read of it, so a `deps: []` key here
     would be claimed by whichever of the two screens mounts first. */
  const zones = useAsync<Paginated<Zone>>((signal) => listZones({ signal }), { deps: [] })

  const suspend = useCallback(
    (zone: Zone) => {
      setRequest({
        title: t('fin.pricing.surge.suspend.title', { zone: zone.name }),
        body: t('fin.pricing.surge.suspend.body'),
        confirmLabel: t('fin.pricing.surge.suspend.confirm'),
        /* **AC-411** — the primary is disabled until a reason is entered. */
        reason: {
          label: t('fin.pricing.surge.suspend.reason.label'),
          help: t('fin.pricing.surge.suspend.reason.help', {
            hours: String(SURGE_SUSPENSION_MAX_HOURS),
          }),
          message: t('fin.pricing.surge.suspend.reason.message'),
        },
        onConfirm: ({ reason }) => {
          void actions
            .run({
              key: zone.id,
              errorMessage: t('fin.error.row'),
              toastMessage: t('fin.pricing.surge.toast.suspended'),
              action: () =>
                suspendSurge({
                  zoneId: zone.id,
                  zoneName: zone.name,
                  reason,
                  /* **AC-409** — the ceiling is the data layer's constant. */
                  hours: SURGE_SUSPENSION_MAX_HOURS,
                }),
            })
            .then(() => {
              setRequest(null)
              suspensions.refetch()
            })
        },
      })
    },
    [actions, t, suspensions],
  )

  return (
    <>
      <div className="grid grid-cols-3 gap-3 compact:grid-cols-1">
        <SurgeWindowsCard windows={windows} t={t} language={language} />
        <SuspendSurgeCard zones={zones} gate={gate} onSuspend={suspend} t={t} />
      </div>
      <SuspensionsCard suspensions={suspensions} t={t} language={language} />
      <ConfirmMoneyDialog
        request={request}
        onClose={() => setRequest(null)}
        busy={actions.busy}
        t={t}
      />
    </>
  )
}

/* ───────────────────────────── surge windows ───────────────────────────── */

/* AC-RC-25 — five columns. Hours and Multiplier are numeric and end-align (R4);
   the rule does not flip in Arabic, only the column does. */
function SurgeWindowsCard({
  windows,
  t,
  language,
}: {
  windows: ReturnType<typeof useAsync<SurgeWindow[]>>
  t: Translator
  language: Language
}) {
  const columns = ['window', 'days', 'hours', 'multiplier', 'state'] as const
  const rows = windows.data ?? []

  return (
    <Card className="col-span-2 gap-2 compact:col-span-1">
      <div className="flex flex-col gap-1 px-(--card-spacing)">
        <h2 className="text-sm font-semibold text-foreground">{t('fin.pricing.surge.heading')}</h2>
        {/* **AC-410** — stated, and true: no control on this card raises one. */}
        <p className="text-xs text-muted-foreground">{t('fin.pricing.surge.readOnly')}</p>
      </div>

      {windows.status === 'loading' && (
        <div className="flex flex-col gap-2 px-(--card-spacing)" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-4 w-full" />
          ))}
        </div>
      )}
      {windows.status === 'error' && (
        <ErrorState
          scope="card"
          card={false}
          message={t('fin.error.read')}
          action={{ label: t('fin.error.retry'), onClick: windows.refetch }}
        />
      )}
      {windows.status !== 'loading' && windows.status !== 'error' && rows.length === 0 && (
        <p className="px-(--card-spacing) text-sm text-muted-foreground">
          {t('fin.pricing.surge.empty')}
        </p>
      )}
      {rows.length > 0 && (
        <KeyValueTable className="text-sm">
          <thead>
            <tr className="border-b border-border-soft">
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={cn(
                    KEY_VALUE_HEAD,
                    KEY_VALUE_CELL,
                    column === 'hours' || column === 'multiplier' ? 'text-end' : 'text-start',
                  )}
                >
                  {t(`fin.pricing.surge.col.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((window) => (
              <tr key={window.id} className={KEY_VALUE_ROW}>
                <td className={cn('py-1.5 text-foreground', KEY_VALUE_CELL)}>{t(window.labelKey)}</td>
                <td className={cn('py-1.5 text-foreground', KEY_VALUE_CELL)}>
                  <span className="flex flex-wrap gap-1">
                    {window.days.map((day) => (
                      <span key={day}>{dayLabel(day, t)}</span>
                    ))}
                  </span>
                </td>
                <td className={cn('py-1.5 text-end tabular-nums text-foreground', KEY_VALUE_CELL)}>
                  <bdi>
                    {t('fin.pricing.surge.hours', {
                      start: formatCount(window.startHour, language),
                      end: formatCount(window.endHour, language),
                    })}
                  </bdi>
                </td>
                <td className={cn('py-1.5 text-end tabular-nums text-foreground', KEY_VALUE_CELL)}>
                  <bdi>{t('fin.pricing.surge.multiplier', { value: String(window.multiplier) })}</bdi>
                </td>
                <td className={cn('py-1.5', KEY_VALUE_CELL)}>
                  <StatusBadge tone={window.enabled ? 'success' : 'neutral'}>
                    {window.enabled ? t('fin.pricing.surge.enabled') : t('fin.pricing.surge.disabled')}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </KeyValueTable>
      )}
    </Card>
  )
}

function dayLabel(day: string, t: Translator): string {
  const key = DAY_KEYS[day.slice(0, 3).toLowerCase()]
  return key === undefined ? day : t(key)
}

/* ───────────────────────────── suspend surge ───────────────────────────── */

/* AC-RC-26 / AC-RC-27 — one single-select group, one `variant="default"` button
   on the whole view (R3), and the refusal is visible text, never a `title`. */
function SuspendSurgeCard({
  zones,
  gate,
  onSuspend,
  t,
}: {
  zones: ReturnType<typeof useAsync<Paginated<Zone>>>
  gate: { canWrite: boolean; reason: string }
  onSuspend: (zone: Zone) => void
  t: Translator
}) {
  const [chosenId, setChosenId] = useState<string | null>(null)
  const refusalId = useId()
  const items = zones.data?.items ?? []
  const chosen = items.find((zone) => zone.id === chosenId) ?? null

  const refusal = !gate.canWrite
    ? gate.reason
    : chosen === null
      ? t('fin.pricing.surge.suspend.prompt')
      : null

  return (
    <Card className="gap-2">
      <div className="flex flex-col gap-2 px-(--card-spacing)">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-foreground">
            {t('fin.pricing.surge.suspend.heading')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {t('fin.pricing.surge.suspend.subtitle')}
          </p>
        </div>

        {zones.status === 'loading' && <Skeleton className="h-control w-full" />}
        {zones.status === 'error' && (
          <ErrorState
            scope="card"
            card={false}
            message={t('fin.error.read')}
            action={{ label: t('fin.error.retry'), onClick: zones.refetch }}
          />
        )}
        {zones.status !== 'loading' && zones.status !== 'error' && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t('fin.pricing.surge.suspend.zone.empty')}
          </p>
        )}
        {items.length > 0 && (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={chosenId ?? ''}
            onValueChange={(value) => setChosenId(value === '' ? null : value)}
            aria-label={t('fin.pricing.surge.suspend.group.label')}
            className="flex-wrap"
          >
            {items.map((zone) => (
              <ToggleGroupItem key={zone.id} value={zone.id}>
                {zone.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}

        <div className="flex flex-col items-start gap-1">
          <Button
            variant="default"
            disabled={refusal !== null}
            aria-describedby={refusal === null ? undefined : refusalId}
            onClick={() => chosen !== null && onSuspend(chosen)}
          >
            {t('fin.pricing.surge.suspend.confirm')}
          </Button>
          {refusal !== null && <RefusalLine id={refusalId}>{refusal}</RefusalLine>}
          {refusal === null && chosen !== null && (
            <span className="text-xs text-muted-foreground">
              {t('fin.pricing.surge.suspend.chosen', { district: chosen.name })}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

/* ────────────────────────────── suspensions ────────────────────────────── */

/* AC-RC-29 / AC-RC-30 — queue mode, no checkbox and no row actions; `In force`
   is `warning` and `Ended` is `neutral`, and neither reuses the word `Running`. */
function SuspensionsCard({
  suspensions,
  t,
  language,
}: {
  suspensions: ReturnType<typeof useAsync<SurgeSuspension[]>>
  t: Translator
  language: Language
}) {
  const table = useIndexTable<SurgeSuspension>({
    mode: 'queue',
    getRowId: (suspension) => suspension.id,
    urlKey: 'sus',
    initialSort: { field: 'startedAt', dir: 'desc' },
  })
  /* **AC-409** — a live countdown against the shared clock, never a per-row
     interval, and never a stored number. */
  const now = useNow(30, true)

  const all = useMemo(() => suspensions.data ?? [], [suspensions.data])
  const inForce = useMemo(
    () => all.filter((row) => Date.parse(row.expiresAt) > Date.parse(now)).length,
    [all, now],
  )

  const districts = useMemo(
    () =>
      [...new Set(all.map((row) => row.zoneName))]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [all],
  )

  /* `listSurgeSuspensions` takes no query params, so the narrowing the toolbar
     asks for is applied here against the same `FilterSpec` the column emits. */
  const rows = useMemo(() => {
    const query = (table.params.q ?? '').trim().toLowerCase()
    let out = all.filter(
      (row) =>
        query === '' ||
        row.zoneName.toLowerCase().includes(query) ||
        row.reason.toLowerCase().includes(query) ||
        row.setByUserName.toLowerCase().includes(query),
    )
    for (const filter of table.params.filters ?? []) out = out.filter((row) => keep(row, filter))
    const sort = table.params.sort
    if (sort) {
      const sign = sort.dir === 'asc' ? 1 : -1
      out = [...out].sort((a, b) => sign * sortValue(a, sort.field).localeCompare(sortValue(b, sort.field)))
    }
    return out
  }, [all, table.params])

  const columns = useMemo<DataColumn<SurgeSuspension>[]>(
    () => [
      {
        id: 'district',
        emphasis: 'primary',
        header: t('fin.pricing.surge.col.district'),
        dataType: 'enum',
        sortField: 'zoneName',
        width: 160,
        filter: { kind: 'multi-select', field: 'zoneName', options: districts },
        cell: (row) => <span className="font-medium">{row.zoneName}</span>,
      },
      {
        id: 'reason',
        emphasis: 'data',
        header: t('fin.pricing.surge.col.reason'),
        dataType: 'text',
        minWidth: 240,
        maxWidth: 420,
        cell: (row) => <span>{row.reason}</span>,
      },
      {
        id: 'raisedBy',
        header: t('fin.pricing.surge.col.raisedBy'),
        dataType: 'text',
        width: 180,
        cell: (row) => <span>{row.setByUserName}</span>,
      },
      {
        id: 'started',
        header: t('fin.pricing.surge.col.started'),
        dataType: 'date',
        align: 'end',
        sortField: 'startedAt',
        width: 148,
        cell: (row) => (
          <span className="block text-end tabular-nums">
            {formatDate(row.startedAt, { style: 'day-month-time', language })}
          </span>
        ),
      },
      {
        id: 'state',
        emphasis: 'data',
        header: t('fin.pricing.surge.col.suspensionState'),
        dataType: 'enum',
        width: 140,
        cell: (row) => {
          const remainingMs = Date.parse(row.expiresAt) - Date.parse(now)
          return (
            <span className="flex flex-col items-start gap-0.5">
              <StatusBadge tone={remainingMs > 0 ? 'warning' : 'neutral'}>
                {remainingMs > 0
                  ? t('fin.pricing.surge.state.inForce')
                  : t('fin.pricing.surge.state.ended')}
              </StatusBadge>
              {remainingMs > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  <bdi>
                    {t('fin.pricing.surge.suspension.expires', {
                      duration: formatDuration(remainingMs),
                    })}
                  </bdi>
                </span>
              )}
            </span>
          )
        },
      },
    ],
    [t, language, now, districts],
  )

  const subheading = `${t.plural('fin.pricing.surge.suspensions.inForce', {
    count: inForce,
  })} · ${t.plural('fin.pricing.surge.suspensions.ended', { count: all.length - inForce })}`

  return (
    <DataTable
      table={table}
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      status={suspensions.status === 'content' && rows.length === 0 ? 'empty' : suspensions.status}
      total={rows.length}
      t={t}
      language={language}
      tableId="financials-surge-suspensions"
      view="rate-card"
      heading={t('fin.pricing.surge.suspensions.heading')}
      subheading={all.length === 0 ? null : subheading}
      searchPlaceholder={t('fin.pricing.surge.suspensions.search')}
      skeletonPattern="P1"
      firstRun={{
        heading: t('fin.pricing.surge.suspensions.heading'),
        body: t('fin.pricing.surge.suspensions.empty'),
        actions: [],
        /* R8 / AC-RC-31 — an operator never raises one from here. */
        illustration: null,
      }}
      noMatch={{ message: t('fin.empty.noMatch') }}
      error={{ message: t('fin.error.read'), onRetry: suspensions.refetch }}
    />
  )
}

function sortValue(row: SurgeSuspension, field: string): string {
  return field === 'zoneName' ? row.zoneName : row.startedAt
}

function keep(row: SurgeSuspension, filter: FilterSpec): boolean {
  if (filter.field !== 'zoneName') return true
  if (filter.op === 'in') return Array.isArray(filter.value) && filter.value.includes(row.zoneName)
  if (filter.op === 'eq') return filter.value === row.zoneName
  return true
}
