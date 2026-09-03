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
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { SingleColumnPage } from '@/components/PageShell'
import { cn } from '@/lib/utils'
import { BoardBand } from '@/components/metrics'
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
          {/* **The band carries §8's slots 1 and 2 and no control.** The
              measure switch stood at its inline-end for a version, which is
              where the reference draws it; it now sits in the panel directly
              above the list it orders. The shading toggle beside it is gone
              outright — see `SHADE_FLOOR`. What is left is what a band is for:
              the name of the board and one line of scope. */}
          {/* **The summary is a SUBTITLE, not a tail.** It sat on the title's
              own baseline, which made `Market & Zones 6 zones · 2 starved` read
              as one run — and it is the slot every other board fills with its
              lede, one line under the name in the same quiet tone. Same words,
              same colour; what changed is that it is now a line of its own. */}
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
            view={view}
            onView={setView}
            t={t}
            language={language}
          />
        )}

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
      {/* **The table is gone, and the screen is the map now.**
          The owner asked for it removed and the reference has no table on this
          board: a zone is a SHAPE on a city, and a row in a grid is the one
          representation that cannot say where it is. What the table carried is
          carried elsewhere on the page — the panel lists every zone with its
          ratio and its bar, searchable and selectable, and the inspector holds
          the two actions each row had.

          **What is genuinely lost, stated rather than buried:** column sorting,
          the column picker, the filter menu and CSV export. Those are index-
          table affordances and there is no index table. If an operator needs to
          export zones or sort by failure rate, that is a case for bringing the
          table back as a second view on this board rather than for keeping it
          under a map nobody scrolled past.

          The page block still exists and still carries the load and error
          states, because those are the SCREEN's states and must not be painted
          over a map that may not have rendered. */}
      {/* **`null` in the ordinary content state, and that is load-bearing.**
          The screen IS the bleed — a band, a strip and a map that fills what is
          left — so on a healthy read there is no second half of the page, and
          `SingleColumnPage` skips the padded block entirely rather than drawing
          64px of ground under the map. The states below are the only thing that
          ever goes there. */}
      {hasPageState ? (
        <div className="flex flex-col gap-4">
          {health.status === 'loading' && <LoadingSkeleton pattern="P5" />}
          {health.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('zones.error.read')}
              action={{ label: t('zones.error.retry'), onClick: health.refetch }}
            />
          )}
          {zones.status === 'error' && (
            <ErrorState
              scope="card"
              message={t('zones.error.read')}
              action={{ label: t('zones.error.retry'), onClick: zones.refetch }}
            />
          )}
        </div>
      ) : null}
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
/**
 * **Which end of the strip a cell is at, declared by the caller.**
 *
 * A `first:` variant cannot answer this: each cell is the only child of its own
 * `<li>`, so `first-child` matches every one of them. The strip is the only
 * thing that knows which is first, and at 1344 the grid goes from three across
 * to five, so it is not even the same set of cells at both widths — the end
 * cell of a three-up row is the third, not the fifth.
 *
 * The point of it is alignment: the strip carries the page's inline padding so
 * its outer edge is on the measure, and without this the cells' own padding
 * would push the first numeral 20px further in than the band's title directly
 * above it. Both properties are logical, so both mirror under `dir="rtl"`.
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
    <div className={cn('flex h-full flex-col gap-1.5 px-5 py-4', EDGE_PAD[edge ?? 'mid'])}>
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
      <span className={cn('flex h-full flex-col gap-1.5 px-5 py-4', EDGE_PAD[edge ?? 'mid'])}>
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
