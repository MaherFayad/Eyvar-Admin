/**
 * Management › Market & Zones — a map and an index table over one set of
 * zones. `docs/05-restructure/design/07-rulings-r4.md` **R4-6**, **R4-6b**.
 *
 * ## Two surfaces over one read, and `?view=` chooses (T7.3, owner decision O5)
 *
 * The map answers *where is demand starved*; the table answers *which of thirty
 * zones do I act on*. Both read `listZones` through the same `useIndexTable`,
 * so the search, the filters and the page survive the switch. `?scope=` is the
 * strip's tile toggle and stays separate: `table` is not a zone filter.
 */

/**
 * ## Why this is a table and not a metric board (R4-6)
 *
 * Legacy settles it: `filterZones(f)` re-renders and then
 * `kpiScrollTo('zones-list')` (`:14130`, `:14535`), so the tiles narrow rows
 * rather than navigate; and the rows carry a permission key of their own
 * (`zones.steer`, `:14004`), which no §3.7 board has.
 */

/**
 * ## Every figure derives, and the board half now renders (R4-6b §6.6.4, X6)
 *
 * `resolveZones()` is the one array and `getZoneHealth()` summarises it, so no
 * number is typed into this file. The seeded `management-zones` metrics and the
 * `citiesHealth` breakdown reached no surface at all; they are the board above
 * the table — the per-city ranking the removed `Cities` card could not hold,
 * because legacy gates the measure on a city's NAME (`c.name === 'Riyadh'`,
 * `:6942`) and three of its four rows could never fill.
 */

/**
 * Rules applied
 *   R4-6 §6.4 clause 1  a tile is a **toggle**, not an anchor. Only the two the
 *              rows can be filtered on are toggles; a control that narrows
 *              nothing is worse than a figure.
 *   R4-6 §6.4 clause 2 / D8  **two row actions is not a kebab**: labelled,
 *              visible at rest, keyboard-operable (**AC-68**), in a declared
 *              column because `rowActions` would collapse them into a menu.
 *              Widths are budgeted to §7.3 rule 3 so that column never clips.
 *   R4-12      a ratio renders `{value}×`, operands on the second line. `null`
 *              renders `ABSENT`, never `Infinity×`.
 *   R4-10.1 / R7  `recruit-now` and `watch` share the `warning` tone and the
 *              severity step is carried by the **label** (R5a leaves no red
 *              badge to give the first one).
 */

import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getMetricBoard,
  getZoneHealth,
  listCities,
  listZones,
  openSteerOffer,
  queueRecruitment,
} from '@/data/clients'
import {
  RECRUITMENT_PRIORITY_TONE,
  type MetricBoard,
  type SubTabRoute,
  type Paginated,
  type Zone,
  type ZoneHealthSummary,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import {
  ABSENT,
  formatCount,
  formatMoney,
  formatPercent,
  formatRatio,
  type Translate,
} from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { SingleColumnPage } from '@/components/PageShell'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  BoardBand,
  BreakdownList,
  Chapter,
  ChapterFigures,
  chaptersOf,
  chapterSummary,
  MetricTile,
  MetricTileItem,
} from '@/components/metrics'
import { ZonesMapView } from './ZonesMapView'
import { useShell } from '@/shell/ShellContext'
import {
  ConfirmMoneyDialog,
  type MoneyConfirmRequest,
} from '@/screens/financials/shared/ConfirmMoneyDialog'
import { useMoneyActions } from '@/screens/financials/shared/actions'
import { canWriteSubTab, permissionContext } from '@/shell/permissions'
import { withFallback } from '../../operations/localCopy'
import { ZONES_EN } from './copy'

/**
 * Legacy's own defaults for a steering offer (`:14012`–`:14017`): 12 SAR per
 * completed trip in the zone, a 300 SAR budget cap, and a two-hour window
 * (`selected` on the duration select). Carried across rather than re-chosen —
 * the operator edits the bonus, and the other two are stated in the dialog.
 */
const STEER_DEFAULT_BONUS_HALALAS = 12_00
const STEER_BUDGET_CAP_HALALAS = 300_00
const STEER_DURATION_MINUTES = 120

export function ZonesScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, ZONES_EN),
    [shell.language.t],
  )
  const { language } = shell.language
  const navigate = useNavigate()
  const location = useLocation()

  /**
   * **RESOLVED — the screen renders both surfaces, and the environment branch
   * that used to choose between them is gone.**
   *
   * It read `process.env.NODE_ENV === 'test'`: under test, the strip +
   * `DataTable` + `CitiesCard` that **R4-6b specifies** and that
   * `zones.test.tsx` asserts on; everywhere else, `ZonesMapView` instead. So
   * every rendering assertion in that suite was green over a surface **no
   * operator ever saw**, `ZonesMapView` could hold no test at all because it
   * was unreachable from a rendered `ZonesScreen`, and the table's search,
   * filters, sort, column controls and pagination did not exist in production.
   *
   * It was the only `NODE_ENV` branch in `src/`, and it is worth naming what it
   * actually was: **a way to keep a suite green while changing the screen out
   * from under it.** A test that cannot see the shipped component is not a
   * weaker test — it is a test of something else, reported as coverage.
   *
   * The resolution is that neither surface was wrong; the exclusive choice was.
   * The map answers *where is demand starved*, the table answers *which zone do
   * I act on*, and an operator needs both in the same visit. They now stack,
   * and **`DataTable` is the single owner of the four states** — the map
   * renders on `content` and nothing otherwise, so loading, empty and error are
   * stated once instead of twice with two different treatments.
   */

  const canWrite = canWriteSubTab(permissionContext(shell.session), row) && !shell.isFrozen

  /**
   * **The cities table, reduced to the one clause of it that was not already on
   * the page.** See the note at the top of this file: the card said `Riyadh ·
   * 6 · 45%` and then three rows of `Not launched · 0 · —`. The zone count is
   * the header's own, the failure rate is the strip's `avgFailureRate` tile,
   * and `Riyadh` is the secondary line of every row in the table beneath it.
   * What no other surface carried is the COVERAGE: one of four cities is live.
   * That is a count, so it is stated as a count, in the meta line under the
   * title, and it costs 5 words where the card cost 184px of vertical space and
   * three em dashes.
   *
   * `listCities()` is synchronous and fixture-backed, so this is not a read and
   * has no state of its own. It is `active`, not "has a tracked zone": a live
   * city with no zone yet is a gap an operator can close, and one that is not
   * launched is not. The two happen to coincide in the seed and will not always.
   */
  const cities = listCities()
  const allCities = cities.length
  const liveCities = cities.filter((city) => city.active).length

  /**
   * **Two questions, two parameters (T7.3, O5).** `view` says which SURFACE is
   * on — the map, or the index table this board lost — and is the same grammar
   * every other sub-tab's view tabs use. `scope` is the strip's tile toggle,
   * which narrows the zone set on either surface (R4-6 §6.4 clause 1). One
   * parameter could not carry both: `table` is not a zone filter, and `starved`
   * is not a surface.
   */
  const params = new URLSearchParams(location.search)
  const surface: 'map' | 'table' = params.get('view') === 'table' ? 'table' : 'map'
  const scope = params.get('scope') ?? 'all'
  const setParam = useCallback(
    (key: string, next: string | null) => {
      const search = new URLSearchParams(location.search)
      if (next === null) search.delete(key)
      else search.set(key, next)
      const query = search.toString()
      navigate({ pathname: location.pathname, search: query === '' ? '' : `?${query}` })
    },
    [navigate, location.pathname, location.search],
  )
  const setScope = useCallback(
    (next: string) => setParam('scope', next === 'all' ? null : next),
    [setParam],
  )
  const setSurface = useCallback(
    (next: string) => setParam('view', next === 'table' ? 'table' : null),
    [setParam],
  )

  const table = useIndexTable<Zone>({ mode: 'queue', getRowId: (zone) => zone.id })
  const actions = useMoneyActions<Zone>({ keyOf: (zone) => zone.id })
  const [request, setRequest] = useState<MoneyConfirmRequest | null>(null)

  const health = useAsync<ZoneHealthSummary>((signal) => getZoneHealth(signal), {
    /* `getZoneHealth` takes no argument but the signal, so `[]` is the complete
       key and nothing else in the repo claims `zones.health`. */
    deps: [],
    cacheKey: 'zones.health',
    isEmpty: () => false,
  })

  const zones = useAsync<Paginated<Zone>>(
    /* **`view` LAST, and that is the whole of the bug this fixes.**
       `useIndexTable` reads `?view=` as a row scope, and `?view=` now names the
       SURFACE (T7.3), so spreading `table.params` after the scope handed
       `listZones` the word `table` as a filter and the tiles narrowed nothing.
       The strip's scope is the row filter; the surface is not. */
    (signal) => listZones({ ...table.params, view: scope, signal }),
    {
      /* Both fetcher inputs are here, so each scope keys separately: flipping
         to `starved` and back paints `all`'s own rows. `steer` and
         `queueRecruitment` go through `refetch`, which rewrites the entry, so a
         steered zone is never re-served stale. */
      deps: [scope, table.params],
      cacheKey: 'zones.list',
    },
  )

  /**
   * **The board half of R4-6b, which was seeded and never rendered (X6).** The
   * `management-zones` metrics and the `citiesHealth` breakdown live in the
   * fixtures and reached no surface. Read only when the table is on, because
   * the map has no room for a board and does not ask for one.
   */
  const board = useAsync<MetricBoard>(
    (signal) => getMetricBoard('management-zones', undefined, signal),
    { deps: [], cacheKey: 'zones.board', enabled: surface === 'table', isEmpty: () => false },
  )

  const rows = useMemo(() => actions.apply(zones.data?.items ?? []), [actions, zones.data])

  /* **The zone the worst ratio belongs to**, for that reading's note.
     Derived from the same rows the summary is derived from, so the name and
     the number cannot come from two different reads. `null` when nothing has a
     ratio at all — a zone with no captains has no ratio, and R4-12 forbids
     manufacturing one. */
  /* The one condition the page block exists for. Named, because it is read
     twice: once to decide whether to render the block's contents and once, by
     `SingleColumnPage`, to decide whether there is a block at all. */
  const hasPageState =
    health.status === 'loading' || health.status === 'error' || zones.status === 'error'

  const worstZone = useMemo(() => {
    let worst: (typeof rows)[number] | null = null
    for (const zone of rows) {
      if (zone.demandSupplyRatio === null) continue
      if (worst === null || zone.demandSupplyRatio > (worst.demandSupplyRatio ?? 0)) worst = zone
    }
    return worst?.name ?? null
  }, [rows])

  const steer = useCallback(
    (zone: Zone) => {
      setRequest({
        title: t('zones.steer.title', { zone: zone.name }),
        body: t('zones.steer.body', {
          cap: formatMoney(STEER_BUDGET_CAP_HALALAS),
          hours: String(STEER_DURATION_MINUTES / 60),
        }),
        confirmLabel: t('zones.steer.confirm'),
        amount: {
          label: t('zones.steer.amount.label'),
          help: t('zones.steer.amount.help'),
          message: t('zones.steer.amount.message', {
            cap: formatMoney(STEER_BUDGET_CAP_HALALAS),
          }),
          maxHalalas: STEER_BUDGET_CAP_HALALAS,
          initialHalalas: STEER_DEFAULT_BONUS_HALALAS,
        },
        onConfirm: ({ amountHalalas }) => {
          if (amountHalalas === null) return
          void actions
            .run({
              key: zone.id,
              errorMessage: t('zones.error.row'),
              toastMessage: t('zones.toast.steered'),
              action: async () => {
                await openSteerOffer({
                  zoneId: zone.id,
                  bonusPerTripHalalas: amountHalalas,
                  budgetCapHalalas: STEER_BUDGET_CAP_HALALAS,
                  durationMinutes: STEER_DURATION_MINUTES,
                })
                zones.refetch()
                return zone
              },
            })
            .then(() => setRequest(null))
        },
      })
    },
    [actions, t, zones],
  )

  const recruit = useCallback(
    (zone: Zone) => {
      void actions.run({
        key: zone.id,
        errorMessage: t('zones.error.row'),
        toastMessage: t('zones.toast.recruited'),
        action: async () => {
          await queueRecruitment(zone.id)
          zones.refetch()
          return zone
        },
      })
    },
    [actions, t, zones],
  )


  /**
   * **The P1 table, restored as the second view (T7.3, owner decision O5).**
   * A city with thirty zones is a list you query, and sort, the column picker,
   * the filter menu, CSV and paging are affordances the map cannot offer.
   * Widths are re-budgeted to §7.3 rule 3 so `Actions` — which R4-6 §6.4
   * clause 2 requires visible at rest — is not the column that clips.
   */
  const columns = useMemo<DataColumn<Zone>[]>(
    () => [
      {
        id: 'zone',
        emphasis: 'primary',
        csv: (zone) => zone.name,
        header: t('zones.col.zone'),
        dataType: 'text',
        minWidth: 190,
        sortField: 'name',
        alwaysVisible: true,
        cell: (zone) => (
          <span className="relative block font-medium">
            {/* R5a use #3 - a starved zone carries the leading edge, and the
                priority label beside it carries the words. */}
            {zone.starved && <RowCriticalMarker />}
            {zone.name}
          </span>
        ),
        secondaryLine: (zone) => {
          const failure = actions.failure(zone.id)
          if (failure) {
            return (
              <ErrorState
                scope="row"
                message={failure.message}
                action={{ label: t('zones.error.retry'), onClick: failure.retry }}
              />
            )
          }
          return zone.city
        },
      },
      {
        id: 'demandSupply',
        emphasis: 'data',
        header: t('zones.col.demandSupply'),
        dataType: 'number',
        align: 'end',
        width: 118,
        sortField: 'demandSupplyRatio',
        /* **R4-12** - the operands are in the second line, the value is the
           bare ratio, and a zone with no captains renders `ABSENT` rather than
           `Infinity`. */
        cell: (zone) => (
          <span
            className="block text-end tabular-nums"
            aria-label={zone.demandSupplyRatio === null ? ABSENT : undefined}
          >
            {zone.demandSupplyRatio === null
              ? ABSENT
              : formatRatio(zone.demandSupplyRatio, language)}
          </span>
        ),
        secondaryLine: (zone) => (
          <span className="block text-end tabular-nums">
            {t('zones.demandSupply.detail', {
              demand: formatCount(zone.demand, language),
              supply: formatCount(zone.supply, language),
            })}
          </span>
        ),
      },
      {
        id: 'failureRate',
        header: t('zones.col.failureRate'),
        dataType: 'number',
        align: 'end',
        width: 112,
        sortField: 'failureRate',
        /* The table's default order is this column, worst first (`:14132`). */
        cell: (zone) => (
          <span className="block text-end tabular-nums">
            {formatPercent(zone.failureRate, language)}
          </span>
        ),
        secondaryLine: (zone) => (
          <span className="block text-end">
            {t('zones.unserved.detail', {
              count: formatCount(zone.failures30d, language),
            })}
          </span>
        ),
      },
      {
        id: 'captainsNeeded',
        emphasis: 'data',
        header: t('zones.col.captainsNeeded'),
        dataType: 'number',
        align: 'end',
        width: 148,
        sortField: 'captainsNeeded',
        /* **Off by default, in the picker, and the recorded reason holds.** It
           is blank on five rows in six — a healthy zone has no recruitment
           target, and `0` would read as a reassurance — and the figure is the
           strip's first tile. Shown by default it spends the width `Actions`
           needs (§7.3 rule 3), which is what R4-6 §6.4 clause 2 forbids. */
        defaultHidden: true,
        cell: (zone) => (
          <span className="block text-end tabular-nums">
            {zone.captainsNeeded === 0 ? '' : formatCount(zone.captainsNeeded, language)}
          </span>
        ),
      },
      {
        id: 'subMomentum',
        header: t('zones.col.subMomentum'),
        dataType: 'number',
        align: 'end',
        width: 120,
        sortField: 'subMomentum',
        /* **`null` when no subscription request maps to this zone at all.** A
           `0` would claim we measured flat growth. */
        cell: (zone) => (
          <span
            className="block text-end tabular-nums"
            aria-label={zone.subMomentum === null ? ABSENT : undefined}
          >
            {zone.subMomentum === null ? ABSENT : formatPercent(zone.subMomentum, language)}
          </span>
        ),
      },
      {
        id: 'priority',
        header: t('zones.col.priority'),
        dataType: 'enum',
        width: 120,
        cell: (zone) => (
          <StatusBadge tone={RECRUITMENT_PRIORITY_TONE[zone.recruitmentPriority]}>
            {t(`zones.priority.${zone.recruitmentPriority}`)}
          </StatusBadge>
        ),
        filter: {
          kind: 'select',
          field: 'recruitmentPriority',
          options: (['recruit-now', 'watch', 'healthy'] as const).map((value) => ({
            value,
            label: t(`zones.priority.${value}`),
          })),
        },
      },
      {
        id: 'actions',
        header: t('zones.col.actions'),
        dataType: 'enum',
        width: 250,
        /* **R4-6 §6.4 clause 2** - two actions, both direct, both labelled,
           both visible at rest. Each is disabled in place with its own reason
           when it cannot be used (§11.2). */
        cell: (zone) => (
          <span className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="xs"
              disabled={!canWrite || zone.activeSteerOffer !== null}
              title={
                zone.activeSteerOffer !== null
                  ? t('zones.steer.blocked.live')
                  : canWrite
                    ? undefined
                    : t('zones.blocked.permission')
              }
              onClick={() => steer(zone)}
            >
              {t('zones.action.steer')}
            </Button>
            <Button
              variant="secondary"
              size="xs"
              disabled={!canWrite || zone.recruitmentQueuedAt !== null}
              title={
                zone.recruitmentQueuedAt !== null
                  ? t('zones.recruit.blocked.queued')
                  : canWrite
                    ? undefined
                    : t('zones.blocked.permission')
              }
              onClick={() => recruit(zone)}
            >
              {t('zones.action.recruit')}
            </Button>
          </span>
        ),
      },
    ],
    [t, language, canWrite, actions, steer, recruit],
  )


  return (
    <SingleColumnPage
      /* **This page is a STACK, and saying so is the fix.** A map at 4 : 3 and
         an index table cannot both be a bounded region of one viewport; the
         default shape assumes the body IS the table and claims the region's
         height for it, which at 1440 x 900 squeezed every region at once and
         put the table's own box at y = 893 in a region 848 tall, reachable by
         42px of page scroll. Declared `flow`, the body sizes to its content and
         the content region scrolls it. See `SingleColumnPageProps.body`. */
      body="flow"
      /* **The band, in its `bar` density, and NO `PageHeader`.** Every metrics
         board opens on the same green field; this one is the same field one
         step down, because the screen's subject is a map and a tall band would
         spend the viewport the map needs. §8's slots 1 and 2 — the title and
         the summary line — are satisfied on it, in order, with the same
         strings the header carried. There is still exactly one `h1`. */
      bleed={
        <>
        <BoardBand density="bar">
          {/* **The band carries §8's slots 1 and 2, and one control.** The
              measure switch sits in the panel above the list it orders; the
              shading toggle is gone — see `SHADE_FLOOR`. What stands at the
              band's inline-end is the surface choice, which is about the whole
              board rather than about any one reading.

              **The summary is a SUBTITLE, not a tail**: on the title's own
              baseline it read as one run with the name. It is the slot every
              other board fills with its lede, one line under the name. */}
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 flex-col gap-3">
              <h1 className="text-band font-medium text-hero-foreground">{t(row.titleKey)}</h1>
              {health.data && (
                <span className="max-w-prose text-sm text-hero-muted">
                  <bdi>
                    {t('zones.meta', {
                      zones: formatCount(health.data.zonesTracked, language),
                      starved: formatCount(health.data.starvedZones, language),
                      cities: formatCount(liveCities, language),
                      allCities: formatCount(allCities, language),
                    })}
                  </bdi>
                </span>
              )}
            </div>

            {/* **The view switch (T7.3, owner decision O5).** A map answers
                *where is demand starved*; a table answers *which of thirty
                zones do I act on*. The same underlined tab every other sub-tab
                uses for a view, so the grammar is not invented here. */}
            <Tabs value={surface} onValueChange={setSurface} className="gap-0">
              <TabsList
                variant="line"
                aria-label={t('zones.view.label')}
                className="h-auto gap-4 p-0"
              >
                <TabsTrigger value="map" className="h-auto flex-none px-0 pb-1.5 text-xs">
                  {t('zones.view.map')}
                </TabsTrigger>
                <TabsTrigger value="table" className="h-auto flex-none px-0 pb-1.5 text-xs">
                  {t('zones.view.table')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </BoardBand>

        {/* **The strip and the map ride with the band, above the measure.**
            All three are one object in the reference — a bar, the readings
            under it, and the map they are about — and putting the strip inside
            the page block while the bar bled would have drawn a 32px step down
            the console's inline-start edge between two halves of one header.
            The TABLE stays in the block below, where a table belongs. */}
        {health.data && (
          <ZoneStrip
            summary={health.data}
            worstZone={worstZone}
            view={scope}
            onView={setScope}
            t={t}
            language={language}
          />
        )}

        {surface === 'map' && (zones.status === 'loading' || zones.status === 'content') && (
          <ZonesMapView
            zones={rows}
            onSteer={steer}
            onQueueRecruitment={recruit}
            language={language}
            canWrite={canWrite}
            status={zones.status}
            error={zones.error}
            onRetry={zones.refetch}
            t={t}
          />
        )}

        {/* Declared in the bleed because it renders through a portal — where it
            sits in this tree decides nothing about where it paints, and in the
            children slot it would be a page block's worth of padding that only
            exists to hold a dialog that is usually closed. */}
        <ConfirmMoneyDialog
          request={request}
          onClose={() => setRequest(null)}
          busy={actions.busy}
          t={t}
        />
        </>
      }
    >
      {/* **`null` on the map surface, and that is load-bearing.** There, the
          screen IS the bleed — band, strip, and a map that fills what is left —
          so `SingleColumnPage` skips the padded block entirely rather than
          drawing 64px of ground under the map. On the table surface the block
          is the board and the table. */}
      {surface === 'table' || hasPageState ? (
        <div className="flex flex-col gap-6">
          {health.status === 'loading' && <LoadingSkeleton pattern="P5" />}
          {health.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('zones.error.read')}
              action={{ label: t('zones.error.retry'), onClick: health.refetch }}
            />
          )}
          {zones.status === 'error' && surface === 'map' && (
            <ErrorState
              scope="card"
              message={t('zones.error.read')}
              action={{ label: t('zones.error.retry'), onClick: zones.refetch }}
            />
          )}

          {surface === 'table' && (
            <>
              <ZoneBoard board={board} t={t} language={language} />
              <DataTable
                table={table}
                rows={rows}
                columns={columns}
                getRowId={(zone) => zone.id}
                isRowCritical={(zone) => zone.starved}
                status={zones.status}
                total={zones.data?.total ?? 0}
                t={t}
                language={language}
                tableId="management-zones"
                view={scope}
                searchPlaceholder={t('zones.search')}
                skeletonPattern="P1"
                firstRun={{
                  heading: t('zones.empty.heading'),
                  body: t('zones.empty.body'),
                  actions: [{ label: t('zones.empty.action'), onClick: () => setScope('all') }],
                }}
                noMatch={{
                  message: t('zones.noMatch'),
                  action: { label: t('zones.noMatch.action'), onClick: () => setScope('all') },
                }}
                error={{ message: t('zones.error.read'), onRetry: zones.refetch }}
              />
            </>
          )}
        </div>
      ) : null}
    </SingleColumnPage>
  )
}

/* ────────────────────────────── the board ──────────────────────────────── */

/**
 * **The seeded `management-zones` metrics and the city breakdown, rendered
 * (T7.3, X6).** They were in the fixtures with no surface. R4-6b puts a board
 * above the index it explains, and these are the same chapters, tiles and
 * ranked list every other metric board draws — the strip's readings are
 * derived from the rows and carry no trend, so neither restates the other.
 */
function ZoneBoard({
  board,
  t,
  language,
}: {
  board: ReturnType<typeof useAsync<MetricBoard>>
  t: Translate
  language: ReturnType<typeof useShell>['language']['language']
}) {
  if (board.status === 'loading') return <LoadingSkeleton pattern="P5" />
  if (board.status === 'error') {
    return (
      <ErrorState
        scope="card"
        message={t('zones.error.read')}
        action={{ label: t('zones.error.retry'), onClick: board.refetch }}
      />
    )
  }
  const loaded = board.data
  if (!loaded) return null

  return (
    <div className="flex flex-col gap-6">
      {chaptersOf(loaded.metrics).map((chapter) => (
        <Chapter
          key={chapter.category}
          category={chapter.category}
          summary={chapterSummary(chapter.metrics, t, language)}
          t={t}
        >
          <ChapterFigures>
            {chapter.metrics.map((metric) => (
              <MetricTileItem key={metric.key}>
                <MetricTile metric={metric} boardAsOf={loaded.asOf} t={t} language={language} />
              </MetricTileItem>
            ))}
          </ChapterFigures>
        </Chapter>
      ))}

      {/* L-6's computed answer, which the removed `Cities` card could not hold:
          a city with no reading and a city reading zero stay different facts. */}
      <div className="grid gap-5 wide:grid-cols-2">
        {loaded.breakdowns.map((breakdown) => (
          <BreakdownList
            key={breakdown.key}
            breakdown={breakdown}
            scope={{ subTabId: 'management-zones', period: null }}
            t={t}
            language={language}
          />
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────── the strip ──────────────────────────────── */

/**
 * Five tiles, **all five derived** from the table's own rows (R4-6b §6.6.4).
 *
 * Two of them narrow the table, because two of them correspond to a view the
 * table has: `captainsNeeded` → the zones short of captains, `starvedZones` →
 * the starved ones. The other three state a total that no filter expresses, and
 * a tile that looks like a control and narrows nothing is worse than a figure.
 */
/**
 * **Which end of the strip a cell is at, declared by the caller.** A `first:`
 * variant cannot answer it: each cell is the only child of its own `<li>`. The
 * point is alignment — the strip carries the page's inline padding, and without
 * this the first numeral would sit inside the band's title above it. Both
 * properties are logical, so both mirror under `dir="rtl"`.
 */
type Edge = 'start' | 'end' | 'both' | 'mid'

const EDGE_PAD: Record<Edge, string> = {
  start: 'ps-0',
  end: 'pe-0',
  both: 'ps-0 pe-0',
  mid: '',
}

function ZoneStrip({
  summary,
  worstZone,
  view,
  onView,
  t,
  language,
}: {
  summary: ZoneHealthSummary
  /** The zone the worst ratio belongs to, for that reading's note. */
  worstZone: string | null
  view: string
  onView: (view: string) => void
  t: Translate
  language: ReturnType<typeof useShell>['language']['language']
}) {
  return (
    /* **One divided strip, not five cards.** Five bordered boxes in a row drew
       five rectangles and said nothing about the five numbers in them; the
       reference runs them as one band under the header with a hairline between,
       which reads as ONE strip of related readings rather than as five
       unrelated tiles.

       The rule is a logical inline-start border on every cell, cancelled on the
       first. **Not the divide helper**, whose horizontal form paints a PHYSICAL
       edge — in Arabic those rules land on the wrong side of every cell. The
       logical property mirrors with the document and needs no second class.

       The helper is described rather than named here on purpose: Tailwind v4
       scans this comment as plain text, and a prose sentence that spells a
       utility mints it into `dist`. It did, the first time this note was
       written, and `scratch/prose-class-leak.mjs` is what caught it.

       **Padded and capped exactly as the band above it**, so the first
       reading's eyebrow sits on the same vertical line as `Market & Zones`. */
    <ul
      data-numeric
      role="list"
      className="mx-auto grid w-full max-w-measure list-none grid-cols-3 border-b border-border bg-card px-page-pad wide:grid-cols-5 wide:px-page-pad-wide"
    >
      <li className="min-w-0 border-s border-border first:border-s-0 last:border-e-0">
        <TileToggle
          edge="start"
          label={t('zones.tile.captainsNeeded')}
          value={formatCount(summary.captainsNeeded, language)}
          note={t('zones.tile.captainsNeeded.note')}
          pressed={view === 'needs-captains'}
          onToggle={() => onView(view === 'needs-captains' ? 'all' : 'needs-captains')}
        />
      </li>
      <li className="min-w-0 border-s border-border first:border-s-0 last:border-e-0">
        <TileToggle
          label={t('zones.tile.starvedZones')}
          value={formatCount(summary.starvedZones, language)}
          note={t('zones.tile.starvedZones.note', {
            total: formatCount(summary.zonesTracked, language),
          })}
          tone={summary.starvedZones > 0 ? 'critical' : undefined}
          pressed={view === 'starved'}
          onToggle={() => onView(view === 'starved' ? 'all' : 'starved')}
        />
      </li>
      <li className="min-w-0 border-s border-border first:border-s-0 last:border-e-0">
        <Reading
          label={t('zones.tile.unservedRequests30d')}
          value={formatCount(summary.unservedRequests30d, language)}
          note={t('zones.tile.unservedRequests30d.note')}
        />
      </li>
      <li className="min-w-0 border-s border-border first:border-s-0 last:border-e-0">
        <Reading
          label={t('zones.tile.avgFailureRate')}
          /* R4-12 — `null` is not zero. A month with no requests at all has no
             failure RATE, and printing `0%` would claim a measured perfect
             month. */
          value={
            summary.avgFailureRate === null
              ? ABSENT
              : formatPercent(summary.avgFailureRate, language)
          }
          tone={summary.avgFailureRate !== null ? 'critical' : undefined}
        />
      </li>
      <li className="min-w-0 border-s border-border first:border-s-0 last:border-e-0">
        <Reading
          edge="end"
          label={t('zones.tile.worstDemandSupplyRatio')}
          value={
            summary.worstDemandSupplyRatio === null
              ? ABSENT
              : formatRatio(summary.worstDemandSupplyRatio, language)
          }
          /* The zone the reading belongs to. Data, not copy — there is no
             honest way to write this one in the dictionary. */
          note={worstZone}
          tone={summary.worstDemandSupplyRatio !== null ? 'critical' : undefined}
        />
      </li>
    </ul>
  )
}

/**
 * One reading in the strip.
 *
 * Numeral over label, which is the order every figure on every board now uses:
 * a reader scanning a strip is scanning for a QUANTITY and reads the name to
 * confirm which one it found. The label is an eyebrow above it in the
 * reference; here it stays below because these five read left to right as one
 * sentence about supply, and an uppercase eyebrow on each would give the strip
 * five headings.
 */
/**
 * **One reading of the strip: eyebrow, then numeral, then its note.**
 *
 * The order is the reference's and it is the order every figure on every board
 * now uses on the band — the name above, small and quiet, and the quantity
 * under it at full size. On the strip specifically it is what lets five
 * readings sit side by side: the eyebrows form a row an operator scans to find
 * the one they want, and the numerals form a row they read.
 *
 * **`tone` is on the NUMERAL and it is a judgement, not a category.** Three of
 * the five say something is wrong when they are large — starved zones, failure
 * rate, worst ratio — and R5a permits red exactly here: a reading that is
 * itself the bad news. §7.5 is met because the note beside it says the same
 * thing in words, and because the two toggles carry the state in their pressed
 * state rather than in a colour.
 */
function Reading({
  label,
  value,
  note,
  tone,
  edge,
}: {
  label: string
  value: string
  note?: string | null
  tone?: 'critical'
  edge?: Edge
}) {
  return (
    <div className={cn('flex h-full flex-col gap-1 px-5 py-3', EDGE_PAD[edge ?? 'mid'])}>
      <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span
          className={cn(
            'text-2xl font-medium',
            tone === 'critical' ? 'text-critical-foreground' : 'text-foreground',
          )}
        >
          <bdi>{value}</bdi>
        </span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </span>
    </div>
  )
}

/**
 * The same card, as a **toggle**. `aria-pressed` states which of the two it is,
 * the focus ring traces the card exactly as the anchor form's does, and it is a
 * `<button>` — never a `<div>` with a click handler.
 */
function TileToggle({
  label,
  value,
  note,
  tone,
  pressed,
  onToggle,
  edge,
}: {
  label: string
  value: string
  note?: string | null
  tone?: 'critical'
  pressed: boolean
  onToggle: () => void
  edge?: Edge
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      /* **The ring moved INSIDE the cell.** With the card gone the button has no
         box of its own to trace, and an outward ring on a cell in a divided
         strip would sit under its neighbour's rule. `-inset` draws it within
         the cell instead, which is also what makes the pressed state legible
         against a strip that has no gaps between its cells. */
      className={cn(
        'group/tile relative block h-full w-full text-start transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        pressed && 'bg-muted ring-2 ring-inset ring-ring',
      )}
    >
      <span className={cn('flex h-full flex-col gap-1 px-5 py-3', EDGE_PAD[edge ?? 'mid'])}>
        <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              'text-2xl font-medium',
              tone === 'critical' ? 'text-critical-foreground' : 'text-foreground',
            )}
          >
            <bdi>{value}</bdi>
          </span>
          {note && <span className="text-xs text-muted-foreground">{note}</span>}
        </span>
      </span>
    </button>
  )
}
