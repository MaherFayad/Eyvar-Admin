/**
 * Management › Market & Zones — the **zone-health table**, and the strip above
 * it. `docs/05-restructure/design/07-rulings-r4.md` **R4-6** and **R4-6b**.
 *
 * ## The ruling this screen implements
 *
 * > **Market & Zones is an Index table (§3.1–3.3) with a metric strip (§3.7)
 * > above it, and the strip's tiles are *filters into the table*, not links
 * > away from it.**
 *
 * The legacy page settles it: `filterZones(f)` re-renders and then
 * `kpiScrollTo('zones-list')` (`:14130`, `:14535`) — the tiles **narrow the
 * table and scroll to it**; they do not navigate. And the rows carry actions
 * with a permission key of their own (`zones.steer`, `:14004`), which a §3.7
 * metric board has never had. A surface with a per-row permission key is a
 * table.
 *
 * ## R4-6b §6.6.4 — five tiles, and not one of them a literal
 *
 * > **When the table lands, Market & Zones' FIVE metric tiles MUST be derived
 * > from the table's own rows. They may not remain literals.**
 *
 * The derivation already exists: `resolveZones()` is the one array, and
 * `getZoneHealth()` summarises it. **This screen's job is not to re-derive — it
 * is to not reintroduce a literal.** Every figure in the strip comes from
 * `ZoneHealthSummary`; there is no number typed into this file, and the nav
 * badge, the strip and the table's first row cannot disagree because there is
 * nowhere for a second answer to live.
 *
 * The ruling's own correction is worth keeping in view: it was written as
 * *"four tiles"*, and `captainsNeeded` — which the metrics spec ranks **first**
 * — is zone-derived like the rest. Deriving four and leaving the fifth a
 * literal is precisely the drift the ruling exists to prevent, arriving one
 * tile to the left.
 *
 * ## The cities table is GONE, and L-6 is answered by not asking
 *
 * It was a four-row table headed `Cities`: `Riyadh · 6 · 45%`, then `Jeddah`,
 * `Dammam` and `Makkah`, each `Not launched · 0 · —`. Every one of those
 * numbers already had a home on this screen — 6 is the header's own zone count,
 * 45% is the strip's `avgFailureRate` tile, and `Riyadh` is the secondary line
 * of every row in the table below. So the card spent 184px of vertical space
 * and a second `<table>` element restating one row and drawing three em dashes.
 *
 * The em-dash discipline it was written to demonstrate is **not** what was
 * removed. L-6's finding is that legacy gates the measure on the city's NAME
 * (`c.name === 'Riyadh'`, `:6942`), so three rows can never be filled whatever
 * data arrives. Nothing in this screen does that, and the same discipline is
 * still enforced in two places, neither of them this card. The per-city
 * breakdown ITSELF still ships, computed, with the same three honest nulls and
 * its own tests: it is the `zones.citiesHealth` metric breakdown
 * (`data/clients/metrics.ts`, `data/clients/zones.test.ts:142`), which is where
 * a city-by-city comparison belongs. And the discipline is enforced where an
 * operator can watch it move: the ratio column
 * and the ratio tile render `ABSENT` for a zone with no captains rather than
 * `Infinity×` (R4-12), and the avg-failure tile renders `ABSENT` rather than
 * `0 %` when there is nothing to average.
 *
 * What the card uniquely carried was COVERAGE — one of the four cities is live
 * — and that is a count, so it is now a clause in the meta line under the title.
 * A count does not need a table, and a table of one real row and three absences
 * is not a summary of a market, it is a picture of a seed.
 *
 * ## `Captains needed` is not a column here, and the trade is the point
 *
 * It was 148px wide and **blank on 5 of its 6 rows** — deliberately so, because
 * a healthy zone has no recruitment target and a `0` would read as a
 * reassurance. That reasoning was right about the CELL and wrong about the
 * column: a measure that is absent on five rows in six is not a column, it is a
 * flag, and this table already flies that flag in words on every row.
 * `Priority` says `Recruit now` / `Watch` / `Healthy`; the exact figure is the
 * strip's first tile and the map inspector's own sentence.
 *
 * What the 148px bought back is why it is not a close call. The declared widths
 * summed to **1182 against a 1038px container at 1440**, so the table clipped
 * 144px and what fell off the inline-end was the **`Actions` column** — `Steer
 * captains` and `Queue recruitment`, the two controls this screen exists to
 * offer, and the two that R4-6 §6.4 clause 2 requires be visible at rest. The
 * sum is now 1034 and nothing clips. A blank column was hiding the buttons.
 *
 * Rules applied
 *   R4-6 §6.4 clause 1
 *              a zone tile is a **toggle**, not an anchor: same card, same
 *              anatomy, `aria-pressed`, and the focus ring traces the card.
 *              Only the two tiles the table can actually filter on are
 *              toggles; the other three are figures, because a control that
 *              narrows nothing is worse than a figure that states something.
 *   R4-6 §6.4 clause 2 / D8
 *              **two row actions is not a kebab.** `Steer drivers` and
 *              `Queue recruitment` render as labelled controls, visible at rest
 *              and keyboard-operable (**AC-68**), plus `View`. They live in a
 *              declared column because `DataTable`'s `rowActions` collapses two
 *              into a menu — the conflict is reported, not resolved here.
 *   R4-12      a ratio renders `{value}×` with the sign supplied by the UI and
 *              the operands in the label. `null` — a zone with no captains —
 *              renders an em dash, never `Infinity×`.
 *   R4-10.1 / R7
 *              `recruit-now` and `watch` share the `warning` tone and the
 *              severity step is carried by the **label**. R5a leaves no red
 *              badge to give the first one.
 */

import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getZoneHealth,
  listCities,
  listZones,
  openSteerOffer,
  queueRecruitment,
} from '@/data/clients'
import {
  RECRUITMENT_PRIORITY_TONE,
  type SubTabRoute,
  type Paginated,
  type Zone,
  type ZoneHealthSummary,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { ABSENT, formatCount, formatMoney, formatPercent, formatRatio } from '@/lib'
import { DataTable, type DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
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
  const { dir, language } = shell.language
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

  /* The tile toggles ride as `?view=` — a control, not a level (§3.8.3). */
  const view = new URLSearchParams(location.search).get('view') ?? 'all'
  const setView = useCallback(
    (next: string) => {
      const params = new URLSearchParams(location.search)
      if (next === 'all') params.delete('view')
      else params.set('view', next)
      navigate({ pathname: location.pathname, search: `?${params.toString()}` })
    },
    [navigate, location.pathname, location.search],
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
    (signal) => listZones({ view, ...table.params, signal }),
    {
      /* The tile toggle and the table query are the fetcher's two inputs and
         both are here, so each `?view=` keys separately — flipping to
         `starved` and back paints `all`'s own rows. `steer` and
         `queueRecruitment` both go through `refetch`, which bypasses the cache
         and rewrites the entry, so a steered zone is never re-served stale. */
      deps: [view, table.params],
      cacheKey: 'zones.list',
    },
  )

  const rows = useMemo(() => actions.apply(zones.data?.items ?? []), [actions, zones.data])

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
            {/* R5a use #3 — a starved zone carries the leading edge, and the
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
        width: 152,
        sortField: 'demandSupplyRatio',
        /* **R4-12** — the operands are in the label, the value is the bare
           ratio, and a zone with no captains renders an em dash rather than
           `Infinity×`. */
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
        width: 140,
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
        id: 'subMomentum',
        header: t('zones.col.subMomentum'),
        dataType: 'number',
        align: 'end',
        width: 152,
        sortField: 'subMomentum',
        /* **`null` when no subscription request maps to this zone at all.** A
           `0` would claim we measured flat growth; the em dash says there is
           nothing to measure, which is the second-most valuable reading on this
           page and must not read as flat. */
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
        width: 150,
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
        /* **R4-6 §6.4 clause 2** — two actions, both direct, both labelled,
           both visible at rest, plus `View`. Each is disabled in place with its
           own reason when it cannot be used (§11.2). */
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
      header={
        <PageHeader
          title={t(row.titleKey)}
          meta={
            health.data
              ? t('zones.meta', {
                  zones: formatCount(health.data.zonesTracked, language),
                  starved: formatCount(health.data.starvedZones, language),
                  cities: formatCount(liveCities, language),
                  allCities: formatCount(allCities, language),
                })
              : null
          }
          t={t}
          dir={dir}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {health.status === 'loading' && <LoadingSkeleton pattern="P5" />}
        {health.status === 'error' && (
          <ErrorState
            scope="card"
            message={t('zones.error.read')}
            action={{ label: t('zones.error.retry'), onClick: health.refetch }}
          />
        )}

        {health.data && (
          <ZoneStrip summary={health.data} view={view} onView={setView} t={t} language={language} />
        )}

        {/* **The map and the table read the SAME request**, so a failure is one
            failure and gets one statement: `DataTable` below. What the map does
            now own is its own **loading** shape — a map-shaped skeleton rather
            than a basemap drawn identically in every state, which is what made
            the old surface stateless. `ZonesMapView` implements all four
            (`status`, `error`, `onRetry` are its contract); this screen wires
            the two that are not already answered one region down. */}
        {(zones.status === 'loading' || zones.status === 'content') && (
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

        <DataTable
          table={table}
          rows={rows}
          columns={columns}
          getRowId={(zone) => zone.id}
          status={zones.status}
          total={zones.data?.total ?? 0}
          t={t}
          language={language}
          tableId="management-zones"
          view={view}
          searchPlaceholder={t('zones.search')}
          /* **R5a** — `demand ÷ supply >= 3` is starved, stated once on the row
             (`types/zone.ts`) and read by the badge, the tile, the marker and
             now this tint. */
          isRowCritical={(zone) => zone.starved}
          skeletonPattern="P1"
          firstRun={{
            heading: t('zones.empty.heading'),
            body: t('zones.empty.body'),
            actions: [{ label: t('zones.empty.action'), onClick: () => setView('all') }],
          }}
          noMatch={{
            message: t('zones.noMatch'),
            action: { label: t('zones.noMatch.action'), onClick: () => setView('all') },
          }}
          error={{ message: t('zones.error.read'), onRetry: zones.refetch }}
        />
      </div>

      <ConfirmMoneyDialog
        request={request}
        onClose={() => setRequest(null)}
        busy={actions.busy}
        t={t}
      />
    </SingleColumnPage>
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
function ZoneStrip({
  summary,
  view,
  onView,
  t,
  language,
}: {
  summary: ZoneHealthSummary
  view: string
  onView: (view: string) => void
  t: ReturnType<typeof useShell>['language']['t']
  language: ReturnType<typeof useShell>['language']['language']
}) {
  return (
    <ul role="list" className="grid list-none grid-cols-3 gap-3 wide:grid-cols-5">
      <li className="min-w-0">
        <TileToggle
          label={t('zones.tile.captainsNeeded')}
          value={formatCount(summary.captainsNeeded, language)}
          pressed={view === 'needs-captains'}
          onToggle={() => onView(view === 'needs-captains' ? 'all' : 'needs-captains')}
        />
      </li>
      <li className="min-w-0">
        <TileToggle
          label={t('zones.tile.starvedZones')}
          value={formatCount(summary.starvedZones, language)}
          pressed={view === 'starved'}
          onToggle={() => onView(view === 'starved' ? 'all' : 'starved')}
        />
      </li>
      <li className="min-w-0">
        <Tile
          label={t('zones.tile.unservedRequests30d')}
          value={formatCount(summary.unservedRequests30d, language)}
        />
      </li>
      <li className="min-w-0">
        <Tile
          label={t('zones.tile.avgFailureRate')}
          /* `null` with no zones at all — never `0 %`, which would claim a
             measured perfect month. */
          value={
            summary.avgFailureRate === null
              ? ABSENT
              : formatPercent(summary.avgFailureRate, language)
          }
        />
      </li>
      <li className="min-w-0">
        <Tile
          label={t('zones.tile.worstDemandSupplyRatio')}
          value={
            summary.worstDemandSupplyRatio === null
              ? ABSENT
              : formatRatio(summary.worstDemandSupplyRatio, language)
          }
        />
      </li>
    </ul>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="h-full gap-1.5">
      <div className="flex flex-col gap-1 px-(--card-spacing)">
        <span className="text-lg font-semibold tabular-nums text-foreground">
          <bdi>{value}</bdi>
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </Card>
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
  pressed,
  onToggle,
}: {
  label: string
  value: string
  pressed: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        'group/tile block w-full rounded-xl text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pressed && 'ring-2 ring-ring',
      )}
    >
      <Card className="h-full gap-1.5 transition-colors group-hover/tile:bg-muted">
        <div className="flex flex-col gap-1 px-(--card-spacing)">
          <span className="text-lg font-semibold tabular-nums text-foreground">
            <bdi>{value}</bdi>
          </span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </Card>
    </button>
  )
}
