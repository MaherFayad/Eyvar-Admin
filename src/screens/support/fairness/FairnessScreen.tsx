/**
 * **Support › Captain Fairness** — `fairness`. Pattern **P5 + P8**.
 * `specs/02-work-queues.md` §9.
 *
 * §9.1 says four things about this queue that shape every line below:
 *
 * **It is the only queue whose SLA target lives on the row, not on the queue.**
 * Every case carries a reason code and the reason code carries the target
 * (`rcTargets()`, `:14730`): a rating dispute has 48 hours, a suspension appeal
 * 24. Two rows in the same view can have windows twice each other's length —
 * which is precisely why `slaClock` takes `targetMinutes` per item and why a
 * shared queue-level constant would be wrong here (**AC-330**).
 *
 * **It is the only queue that exists to be *lost*.** Its own empty state says
 * so: *"A high overturn rate on this page is not a failure — it means the
 * appeal route is doing its job and catching bad calls before they cost you a
 * captain"* (`:15677`). Every metric on it must be read that way, and the
 * overturn rate must never be presented as a defect rate. So `overturned` is a
 * neutral outcome here, not a red one and not a green one (Q-28).
 *
 * **It is the only queue where the person waiting is not a customer.** A
 * suspended captain earns nothing while their appeal runs, which is why
 * `Suspension appeals` is the default view (§9.3) and why **Q-81** overrides the
 * shipped policy: `DB.slaPolicy` tier T2 sets `pauseOnCustomer: true`, and for
 * `DRV_SUSPENSION_APPEAL` that is **false** — the cost of the pause falls on the
 * captain, not on us. Nothing in this build pauses a clock, so **AC-331** holds
 * by construction; it is recorded here so nobody adds a pause later.
 *
 * **Its fourth view is not a queue at all.** Captain economics fails §4.1's
 * admission test on every clause: nobody is expected to act on a row, there is
 * no decision, nothing converts, and nobody would notice if no one looked. It is
 * **P5**, it lives on this route, and **it must not grow claim, SLA or
 * disposition furniture** (**AC-340**).
 *
 * Rules applied
 *   §9.6 Q-76–Q-78
 *              **the three effects an overturn must have are the data layer's,
 *              not this screen's.** `decideFairnessCase` sets `reinstatedAt` on
 *              a suspension appeal and `averageAdjusted` on a rating dispute; a
 *              rider report has **no code path at all** (`:15597`, `10a` §16.5)
 *              and Q-76 requires one. Reported, not simulated — a row that says
 *              `Overturned` while nothing reversed is exactly **F-21**.
 *   §9.6 Q-77 / AC-334
 *              *"an overturned rating is always voided; the average is
 *              recomputed only when it can be"* — and **the row states which of
 *              the two happened, in words.** This is the model for every
 *              derived-value honesty problem in the product.
 *   §4.5 Q-28 / AC-228
 *              `Upheld` and `Overturned` are both neutral. Neither is a
 *              failure, and colouring one would answer a question this queue
 *              exists to leave open.
 *   §9.5       captain economics states its own scope limits **above the
 *              board**, because neither fairness metric carries a `caption`.
 */

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  claimFairnessCase,
  decideFairnessCase,
  getMetricBoard,
  listFairnessCases,
  releaseFairnessCase,
} from '@/data/clients'
import type {
  FairnessCase,
  FairnessCaseStatus,
  FairnessReasonCode,
  IsoDateTime,
  MetricBoard,
  Paginated,
  SubTabRoute,
} from '@/data/types'
import { useAsync, useIndexTable } from '@/hooks'
import { formatDate, type Direction, type Language, type Translate } from '@/lib'
import {
  BoardBand,
  BoardHeroItem,
  BoardHeroRow,
  Chapter,
  ChapterFigures,
  chaptersOf,
  chapterSummary,
  ChartCard,
  MetricTile,
  MetricTileItem,
} from '@/components/metrics'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DataColumn, ExtraFilterSpec } from '@/components/DataTable'
import { RefusalLine } from '@/components/table/rowActions'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import {
  Absent,
  BreachBanner,
  Cell,
  DecisionBadge,
  Identity,
  MutedCell,
  OwnerChip,
  QueuePage,
  QueueTable,
  SlaCell,
  queueClock,
  useNowIso,
  useQueueMeta,
  useQueueViews,
  useRowActions,
  type QueueClockResult,
  type RowFailure,
} from '@/screens/queues'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { withFallback } from '../../operations/localCopy'
import { FAIRNESS_EN } from './copy'

/**
 * **§9.3 / Q-32 — the default is `Suspension appeals`**, and the reason is not
 * that it is first in the route table (it is, and that is a coincidence). It is
 * *"the only view where the clock costs someone their income, and the only one
 * whose subject cannot work while waiting."*
 */
const DEFAULT_VIEW = 'suspension-appeals'
const VIEW_ECONOMICS = 'captain-economics'

export function FairnessScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, FAIRNESS_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  const { tabs, activeTab, selectTab } = useQueueViews(row, DEFAULT_VIEW, t)

  /* §9.4 — **one mode at a time.** The economics view is P5 and mounts a board;
     the three case views are P8 and mount a queue. A route may mount more than
     one mode over its lifetime and may never mount two at once, so these are
     two components and the switch unmounts the other. */
  return activeTab === VIEW_ECONOMICS ? (
    <EconomicsView
      key={VIEW_ECONOMICS}
      row={row}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={selectTab}
      t={t}
      dir={dir}
      language={language}
    />
  ) : (
    <CasesView
      key="cases"
      row={row}
      tabs={tabs}
      activeTab={activeTab}
      onSelectTab={selectTab}
      t={t}
      dir={dir}
      language={language}
    />
  )
}

interface ViewProps {
  row: SubTabRoute
  tabs: readonly { id: string; label: string }[]
  activeTab: string
  onSelectTab: (id: string) => void
  t: Translate
  dir: Direction
  language: Language
}

/* ─────────────────────────── the three case views ──────────────────────── */

function CasesView({ row, tabs, activeTab, onSelectTab, t, dir, language }: ViewProps) {
  const shell = useShell()
  const location = useLocation()
  const now = useNowIso()
  const { meta, onTotal } = useQueueMeta(t, language, 'fairness.meta')

  const table = useIndexTable<FairnessCase>({
    mode: 'queue',
    getRowId: (fairnessCase) => fairnessCase.id,
    initialView: activeTab,
    /* **AC-217 / AC-330.** `slaDueAt` ascending rather than the client's
       `urgency`, which collapses every breached row to `-1` and loses "most
       overdue at the top". It is also the key that makes AC-330 visible: two
       cases opened at the same moment with different reason codes have
       different `slaDueAt`, so they do not sit together. */
    initialSort: { field: 'slaDueAt', dir: 'asc' },
  })

  const params = useMemo(() => ({ ...table.params, view: activeTab }), [table.params, activeTab])
  const data = useAsync<Paginated<FairnessCase>>((signal) => listFairnessCases(params, signal), {
    /* `params` is the table query with the view tab merged in and is the
       fetcher's only argument, so each tab keys separately. */
    deps: [params],
    cacheKey: 'fairness.list',
  })

  /* R5a (a) — open cases only. Q-18: a case decided after its deadline is
     `late-decided`, its badge says so, and it is not a backlog. */
  const breached = useAsync<Paginated<FairnessCase>>(
    (signal) =>
      listFairnessCases(
        {
          pageSize: 1,
          filters: [
            { field: 'breached', op: 'eq', value: true },
            { field: 'open', op: 'eq', value: true },
          ],
        },
        signal,
      ),
    /* Constant query, named in `deps` so the key describes the request: the
       list read above is `fairness.list::[{…}]`, the profile card's is
       `fairness.list::[s:DRV-…]`, and this count is `fairness.list::[s:breached]`.
       A bare `[]` would be a slot any other constant read could claim. */
    { deps: ['breached'], cacheKey: 'fairness.list' },
  )

  const actions = useRowActions<FairnessCase>({ t })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const rows = actions.rows(data.data?.items ?? [])
  const scoped = table.filters.some((filter) => filter.field === 'breached')
  /* **Q-84 / F-4** — `fairness` has NO `PAGE_PERMISSIONS` entry at all; only
     `decideFairness` is gated, on the broad `approve_drivers` key, and filing a
     case has no check. `approve_drivers` is the nearest gate the fixture
     carries. The real key is open. */
  const canWrite = shell.permissions.permissions.includes('approve_drivers')
  const currentUserId = shell.session?.userId ?? ''

  function claim(fairnessCase: FairnessCase, takeOver: boolean) {
    void actions.run({
      id: fairnessCase.id,
      errorKey: 'fairness.error.row.claim',
      toastKey: takeOver ? 'queue.toast.takenOver' : 'queue.toast.claimed',
      action: () => claimFairnessCase(fairnessCase.id, { takeOver }),
    })
    setConfirm(null)
  }

  function askTakeOver(fairnessCase: FairnessCase) {
    const owner = fairnessCase.claim?.ownerName ?? ''
    setConfirm({
      title: t('queue.takeOver.title', { name: owner }),
      body: t('queue.takeOver.body', { name: owner }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () => claim(fairnessCase, true),
    })
  }

  /**
   * **AC-333** — neither disposition can be submitted without a written
   * rationale, and the rationale is visible on the decided row afterwards.
   *
   * The client 422s on an empty one (`rationale_required`); §10.4 puts the rule
   * in the modal so the operator meets it rather than the error. **D-1** is
   * open — whether a rationale is *required* is a product decision — and this
   * screen takes the position the mock takes, because the alternative is what
   * legacy shipped: every decided case unexplained.
   */
  function askDecide(fairnessCase: FairnessCase, outcome: 'upheld' | 'overturned') {
    const decide = () =>
      setConfirm({
        title: t(outcome === 'upheld' ? 'fairness.uphold.title' : 'fairness.overturn.title', {
          name: fairnessCase.driverName,
        }),
        body: t(outcome === 'upheld' ? 'fairness.uphold.body' : 'fairness.overturn.body'),
        confirmLabel: t(
          outcome === 'upheld' ? 'fairness.uphold.confirm' : 'fairness.overturn.confirm',
        ),
        /* §5.3 / R5a — **neither is red.** Both are irreversible and both
           confirm, but R5a use #1 is the *unrecoverable*, and an appeal outcome
           with a recorded reason and a route back is not that. Spending red
           here would also answer §9.1's question — which of these two is the
           bad one — and this queue exists to leave it open. */
        reason: {
          label: t('fairness.rationale'),
          help: t('fairness.rationale.help'),
          message: t('fairness.rationale.message'),
        },
        onConfirm: ({ reason }) => {
          setConfirm(null)
          void actions.run({
            id: fairnessCase.id,
            errorKey: 'fairness.error.row.decide',
            toastKey: outcome === 'upheld' ? 'fairness.toast.upheld' : 'fairness.toast.overturned',
            action: () => decideFairnessCase(fairnessCase.id, outcome, reason),
          })
        },
      })

    /* **AC-209** — deciding an item somebody else holds takes the take-over
       confirmation first. */
    const held = fairnessCase.claim?.state === 'claimed' ? fairnessCase.claim : null
    if (held === null || held.ownerId === currentUserId) return decide()
    setConfirm({
      title: t('queue.takeOver.decide.title', { name: held.ownerName }),
      body: t('queue.takeOver.decide.body', { name: held.ownerName }),
      confirmLabel: t('queue.takeOver.decide.confirm'),
      onConfirm: () => {
        setConfirm(null)
        decide()
      },
    })
  }

  const columns = caseColumns(activeTab, {
    t,
    language,
    now,
    canWrite,
    currentUserId,
    profileHref: (id) => `${location.pathname}${withOverlay(location.search, 'entity', id)}`,
    detailHref: (id) => `/support/fairness/${id}${location.search}`,
    failure: actions.failure,
    onClaim: (fairnessCase) => claim(fairnessCase, false),
    onRelease: (fairnessCase) =>
      void actions.run({
        id: fairnessCase.id,
        errorKey: 'fairness.error.row.release',
        toastKey: 'queue.toast.released',
        action: () => releaseFairnessCase(fairnessCase.id),
      }),
    onTakeOver: askTakeOver,
    onDecide: askDecide,
  })

  return (
    <QueuePage row={row} meta={meta} t={t} dir={dir}>
      <BreachBanner
        id="support-fairness-sla"
        count={breached.data?.total ?? 0}
        scoped={scoped}
        onShowBreached={() => table.setFilter({ field: 'breached', op: 'eq', value: true })}
        t={t}
        language={language}
        oneKey="fairness.banner.one"
        otherKey="fairness.banner.other"
      />

      <QueueTable
        t={t}
        language={language}
        table={table}
        rows={rows}
        status={data.status}
        total={data.data?.total ?? 0}
        getRowId={(fairnessCase) => fairnessCase.id}
        columns={columns}
        tableId="support-fairness"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onTotal={onTotal}
        now={now}
        searchPlaceholder={t('fairness.search')}
        /* **R5a** — one expression behind the marker, the pill and the tint. */
        isRowCritical={(row) => caseClock(row, now).breached}
        extraFilters={BREACH_FILTER(t)}
        /* **AC-343** — each of the three case views names its own scope. */
        cleared={{
          heading: t('fairness.empty.cleared.heading'),
          body: t(CLEARED_BODY[activeTab] ?? 'fairness.empty.cleared.appeals'),
        }}
        firstRun={{
          heading: t('fairness.empty.firstRun.heading'),
          body: t('fairness.empty.firstRun.body'),
          actions: [
            { label: t('fairness.empty.firstRun.action'), onClick: () => onSelectTab(VIEW_ECONOMICS) },
          ],
        }}
        noMatch={{ message: t('fairness.empty.noMatch') }}
        error={{ message: t('fairness.error.list'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={actions.busy} t={t} />
    </QueuePage>
  )
}

/* ────────────────── §9.5 · captain economics, P5 not P8 ────────────────── */

/**
 * **AC-340** — no claim control, no countdown and no disposition on any row,
 * because there are no rows. It is a metric board on a queue's route, and the
 * §4.1 admission test is what keeps it that way.
 *
 * **AC-341** — the four honesty statements §9.5 requires. **Neither fairness
 * metric carries a `caption`** (`caption: null` on both), and `Metric.caption`
 * is where a scope limit belongs, so they are stated once, above the board,
 * rather than repeated on each tile. Named in the handoff as a request:
 * `support.fairness.earningsPerEngagedHour` should carry the upper-bound caption
 * in the fixture, and then this card carries one line instead of three.
 */
function EconomicsView({ row, tabs, activeTab, onSelectTab, t, dir, language }: ViewProps) {
  const board = useAsync<MetricBoard>((signal) => getMetricBoard(row.subTabId, undefined, signal), {
    /* `subTabId` picks the board and is the fetcher's only input — the same key
       `MetricBoardScreen` uses for the same call, deliberately, so the two
       surfaces share one read of the same board rather than two. */
    deps: [row.subTabId],
    cacheKey: 'metrics.board',
  })

  return (
    <QueuePage row={row} meta={null} t={t} dir={dir}>
      {/* **D12's segmented control, the primitive — not a second one.** This
          view has no table, so `DataTable`'s toolbar never mounts and the view
          row has to be rendered here. It is rendered with the SAME
          `variant="segmented"` list and the same trigger overrides
          `IndexToolbar` uses, because the alternative is two segmented controls
          in one product that drift apart, and D12 scoped the stadium treatment
          to exactly one component. */}
      <div className="flex flex-col gap-3">
        <div className="flex h-14 items-center">
          <Tabs value={activeTab} onValueChange={onSelectTab} className="shrink-0 gap-0">
            <TabsList variant="segmented">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-full border-transparent px-3 text-sm data-active:border-border-control data-active:bg-card"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* §9.5 — the scope limits, before the numbers rather than under them.
            R6: each is a sentence and takes a period. */}
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{t('fairness.economics.title')}</p>
            <p className="text-sm text-muted-foreground">{t('fairness.economics.upperBound')}</p>
            <p className="text-sm text-muted-foreground">{t('fairness.economics.tips')}</p>
            <p className="text-sm text-muted-foreground">{t('fairness.economics.fleetAverage')}</p>
            <p className="text-sm text-muted-foreground">{t('fairness.economics.noAction')}</p>
          </CardContent>
        </Card>

        <BoardBody board={board.data} loading={board.status === 'loading'} onRetry={board.refetch} t={t} language={language} />
      </div>
    </QueuePage>
  )
}

/**
 * The board's four states, in one place. Split out of `EconomicsView` so the
 * narrowed `board` is a parameter rather than a closure variable — `useAsync`
 * types `data` as `T | null` in every status, and reading it inside a ternary
 * chain does not narrow.
 */
function BoardBody({
  board,
  loading,
  onRetry,
  t,
  language,
}: {
  board: MetricBoard | null
  loading: boolean
  onRetry: () => void
  t: Translate
  language: Language
}) {
  /**
   * **§E4 — which lead figure the band has checked**, held here because this
   * screen owns the board. `null` until an operator picks one; the board's own
   * first chartable lead is what renders until then.
   *
   * Declared before the four states, because a hook cannot sit behind an early
   * return. It is read only in the content branch.
   */
  const [featured, setFeatured] = useState<string | null>(null)

  /* AC-35 — the tile-shaped skeleton, never a spinner. */
  if (loading) return <LoadingSkeleton pattern="P5" />
  if (board === null) {
    return (
      <ErrorState
        scope="card"
        message={t('fairness.error.board')}
        action={{ label: t('state.pageError.action'), onClick: onRetry }}
      />
    )
  }
  const leads = board.metrics.filter((metric) => metric.rank === 'lead')
  const supporting = board.metrics.filter((metric) => metric.rank !== 'lead')

  /**
   * **§E4 — the lead row that drives the chart beneath the band, on the one
   * metrics board that is not `MetricBoardScreen`.**
   *
   * The expressions below are that screen's, verbatim, and they have to be:
   * `board.test.ts` counts `support-fairness` among the three boards with two
   * charted leads, so this board **qualifies** for the mechanism and was
   * excluded from it only because it renders somewhere else. A reader arriving
   * from Support › Overview found a row that looks selectable on one board and
   * is inert on the next, which is worse than a board that never offered it.
   *
   * A lead is selectable exactly when the board charts a series under the same
   * key; the row becomes a `radiogroup` at two, because a group of one radio
   * cannot be operated and is announced *"radio button, checked, 1 of 1"*. No
   * series is invented for an uncharted lead — it renders as the plain figure
   * it always was.
   *
   * **Known, and stated rather than hidden: this board's two radios plot two
   * different windows.** `overturnRate` is seeded on the fifteen-day snapshot
   * pair and `earningsPerEngagedHour` on the seven-day chart pair, so choosing
   * the other measure also re-scales the x-axis. That is **F-7** — the missing
   * board-level period — and the `overturnRate` seed books it there itself,
   * having taken the fifteen days because the seven-day comparison would close
   * one point away from the baseline its tile names. The card's own sub-line
   * states the window it drew, so the change is visible rather than silent; it
   * is not worked around here by dropping a qualifying lead out of the group,
   * which would hide a data question inside a screen.
   */
  const chartedKeys = new Set(board.charts.map((chart) => chart.key))
  const selectableLeads = leads.filter((metric) => chartedKeys.has(metric.key))
  const leadChoice = selectableLeads.length >= 2
  const featuredKey =
    featured !== null && chartedKeys.has(featured) ? featured : (selectableLeads[0]?.key ?? null)
  /* Hoisted, and REMOVED from the row below rather than repeated in it: a board
     that drew one series twice would leave an operator checking whether the two
     plots agreed, and they always would. */
  const featuredChart = board.charts.find((chart) => chart.key === featuredKey) ?? null
  const detailCharts = board.charts.filter((chart) => chart !== featuredChart)

  return (
    /* 48px, matching `MetricBoardScreen`. With no card edges, space is the only
       thing that says one chapter has ended and another has begun. */
    <div className="flex flex-col gap-12">
      {/* **§H4 — the same partition `MetricBoardScreen` renders**, and it has
          to be here too rather than only there. Fairness is the one metrics
          board with its own screen (it carries the appeal queue beneath the
          tiles), so a ranking applied only in `MetricBoardScreen` would give
          this board seven tiles at one size while its eight siblings had a
          headline — which is the flat board the ranking exists to replace,
          surviving on exactly the screen nobody would think to check.

          `BOARD_LEADS` already names its three: the overturn rate first,
          because it is how often the console decided wrongly against a
          captain, which is the board's reason to exist. */}
      {leads.length > 0 && (
        /* **`BoardBand` and not `BoardHero`.** The band's ground and its three
            figures, without the `<h1>` and the lede — this screen's identity is
            already set by `QueuePage`'s header and the segmented view row above,
            and a second page title on one page is the redundancy the band was
            supposed to remove. */
        <BoardBand shape="inset">
          <BoardHeroRow groupLabel={leadChoice ? t('overview.hero.group') : null}>
            {leads.map((metric) => (
              <BoardHeroItem key={metric.key} inGroup={leadChoice}>
                <MetricTile
                  metric={metric}
                  boardAsOf={board.asOf}
                  surface="band"
                  selection={
                    leadChoice && chartedKeys.has(metric.key)
                      ? {
                          selected: metric.key === featuredKey,
                          onSelect: () => setFeatured(metric.key),
                          /* Roving: the checked radio is the group's one tab
                             stop, so `Tab` enters the row at the figure whose
                             chart is on screen rather than always at the
                             first. */
                          tabIndex: metric.key === featuredKey ? 0 : -1,
                        }
                      : undefined
                  }
                  t={t}
                  language={language}
                />
              </BoardHeroItem>
            ))}
          </BoardHeroRow>
        </BoardBand>
      )}

      {/* **§E4 — the chart the band is driving, directly under the band.**
          Selecting a figure above redraws THIS card and nothing else moves.

          It takes the same `frame` and the same `reportHref` as the cards in
          the row below, deliberately: this screen draws its charts chromeless
          and every fairness metric's `drilldownRoute` is this page, so a link
          here would offer an operator the screen they are already on. Full
          width — it is the board's headline evidence. */}
      {featuredChart && (
        <ChartCard
          key={featuredChart.key}
          series={featuredChart}
          frame="plain"
          reportHref={null}
          t={t}
          language={language}
        />
      )}
      {/* The supporting figures in chapters, exactly as `MetricBoardScreen`
          renders them. Fairness's seven metrics fall into three categories, so
          this is the difference between seven equal cells and three named
          groups on the one board where the grouping matters most: an operator
          reading it is deciding whether the console has been fair to a captain,
          and "which of these is about money" is the first question they ask. */}
      {chaptersOf(supporting).map((chapter) => (
        <Chapter
          key={chapter.category}
          category={chapter.category}
          summary={chapterSummary(chapter.metrics, t, language)}
          t={t}
        >
          <ChapterFigures>
            {chapter.metrics.map((metric) => (
              <MetricTileItem key={metric.key}>
                <MetricTile metric={metric} boardAsOf={board.asOf} t={t} language={language} />
              </MetricTileItem>
            ))}
          </ChapterFigures>
        </Chapter>
      ))}
      {detailCharts.length > 0 && (
        <div
          className={
            /* **One panel takes the width.** With the §E4 card hoisted above,
               this row is usually a single chart, and holding it in a
               two-column grid would leave a half-width plot beside an empty
               cell. Static class strings both ways: a computed column count is
               a class Tailwind's scanner never sees. */
            detailCharts.length > 1
              ? 'grid grid-cols-2 gap-x-11 gap-y-12 border-t border-border pt-12 compact:grid-cols-1'
              : 'grid grid-cols-1 gap-y-12 border-t border-border pt-12'
          }
        >
          {detailCharts.map((chart) => (
            <ChartCard
              key={chart.key}
              series={chart}
              frame="plain"
              reportHref={null}
              t={t}
              language={language}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────── vocabulary ────────────────────────────── */

const CLEARED_BODY: Readonly<Record<string, string>> = {
  'suspension-appeals': 'fairness.empty.cleared.appeals',
  'rating-disputes': 'fairness.empty.cleared.disputes',
  'rider-reports': 'fairness.empty.cleared.reports',
}

const BREACH_FILTER = (t: Translate): readonly ExtraFilterSpec[] => [
  {
    field: 'breached',
    label: t('queue.filter.breached'),
    kind: 'boolean',
    trueLabel: t('queue.filter.breached.yes'),
    falseLabel: t('queue.filter.breached.no'),
  },
]

/**
 * **Q-28 / AC-228 — every outcome here is neutral.** An overturn is not a
 * success and an uphold is not a failure; §9.1's whole point is that a high
 * overturn rate means the appeal route is working. Tone would answer that.
 */
const STATUS: Readonly<Record<FairnessCaseStatus, { tone: 'info' | 'neutral'; key: string }>> = {
  open: { tone: 'info', key: 'fairness.status.open' },
  upheld: { tone: 'neutral', key: 'fairness.status.upheld' },
  overturned: { tone: 'neutral', key: 'fairness.status.overturned' },
  withdrawn: { tone: 'neutral', key: 'fairness.status.withdrawn' },
}

const REASON_CODES: readonly FairnessReasonCode[] = [
  'DRV_SUSPENSION_APPEAL',
  'DRV_RATING_DISPUTE',
  'DRV_RIDER_NOSHOW',
  'DRV_RIDER_CONDUCT',
  'DRV_VEHICLE_DAMAGE',
  'DRV_DEDUCTION_DISPUTE',
]

/* ─────────────────────────────── columns ───────────────────────────────── */

export interface CaseDeps {
  t: Translate
  language: Language
  now: IsoDateTime
  canWrite: boolean
  currentUserId: string
  profileHref: (id: string) => string
  detailHref: (id: string) => string
  failure: (id: string) => RowFailure | undefined
  onClaim: (row: FairnessCase) => void
  onRelease: (row: FairnessCase) => void
  onTakeOver: (row: FairnessCase) => void
  onDecide: (row: FairnessCase, outcome: 'upheld' | 'overturned') => void
}

/**
 * §7.3's width contract, per view. The middle column is the one thing each case
 * kind actually needs, and it is different for each:
 *
 * ```
 * suspension-appeals  176 + 176 + 160 + 176 + 176 = 864
 * rating-disputes     176 + 176 + 160 + 176 + 176 = 864
 * rider-reports       176 + 152 + 160 + 176 + 176 = 840
 * ```
 */
/**
 * **The case's clock — module level, because THREE carriers read it**: R5a's
 * leading-edge marker, the countdown pill, and the row tint declared on
 * `QueueTable`, where the columns are out of scope. `terminal` is part of the
 * expression: a case decided inside its window keeps `slaBreachedAt: null` and
 * a case decided late has a stopped clock, so neither is tinted.
 */
export function caseClock(row: FairnessCase, now: IsoDateTime): QueueClockResult {
  return queueClock(
    {
      startedAt: row.slaStartedAt,
      dueAt: row.slaDueAt,
      /* **The per-row denominator, and the reason this queue exists in §9.1's
         first sentence.** `slaTargetMinutes` is `rcTargets(reasonCode).res` —
         1440 or 2880 — so two rows in one view draw different fills at the
         same remaining time (**AC-213**). */
      targetMinutes: row.slaTargetMinutes,
      breachedAt: row.slaBreachedAt,
    },
    now,
    { terminal: row.status !== 'open' },
  )
}

export function caseColumns(view: string, deps: CaseDeps): ReadonlyArray<DataColumn<FairnessCase>> {
  const { t, language, now } = deps

  const isDecided = (row: FairnessCase) => row.status !== 'open'

  const clockFor = (row: FairnessCase): QueueClockResult => caseClock(row, now)

  const middle: DataColumn<FairnessCase> =
    view === 'rating-disputes'
      ? {
          id: 'rating',
          header: t('fairness.col.rating'),
          width: 176,
          dataType: 'number',
          sortField: 'id',
          filter: { kind: 'number-range', field: 'disputedRating' },
          /**
           * **AC-337** — the number the captain is contesting, on the row.
           * Legacy stores `disputedRating` and never renders it (`10a` §16.6).
           *
           * **AC-334 / Q-77** — and once the case is overturned, the same cell
           * states **which of the two things happened**: the score is always
           * voided; the historical average is recomputed only when there was a
           * denominator to recompute against. `averageAdjusted: false` is not a
           * failure — it is the server refusing to un-average a mean it cannot.
           */
          cell: (row) => {
            if (row.disputedRating === null) {
              return <MutedCell>{t('fairness.rating.none')}</MutedCell>
            }
            const rating = String(row.disputedRating)
            if (row.status !== 'overturned') {
              return <Cell>{t('fairness.rating.value', { rating })}</Cell>
            }
            const line = t(
              row.averageAdjusted
                ? 'fairness.rating.recomputed'
                : 'fairness.rating.voidedOnly',
              { rating },
            )
            return <Cell title={line}>{line}</Cell>
          },
        }
      : view === 'rider-reports'
        ? {
            id: 'rider',
            header: t('fairness.col.rider'),
            width: 152,
            dataType: 'text',
            filter: { kind: 'text', field: 'subjectName' },
            cell: (row) =>
              row.subjectName === null ? <Absent /> : <Cell>{row.subjectName}</Cell>,
          }
        : {
            id: 'suspension',
            header: t('fairness.col.suspension'),
            width: 176,
            dataType: 'text',
            filter: { kind: 'text', field: 'suspensionReason' },
            /* §9.7 `appeal-open-for-suspended-captain` — the suspension is in
               force *while* the appeal runs, and this column is the reason the
               operator can see what they are being asked to reverse. */
            cell: (row) =>
              row.suspensionReason === null ? (
                <MutedCell>{t('fairness.suspension.none')}</MutedCell>
              ) : (
                <Cell title={row.suspensionReason}>{row.suspensionReason}</Cell>
              ),
          }

  return [
    {
      id: 'captain',
      emphasis: 'primary',
      csv: (row) => row.driverName,
      header: t('fairness.col.captain'),
      alwaysVisible: true,
      minWidth: 176,
      dataType: 'text',
      sortField: 'driverName',
      cell: (row) => (
        <>
          {clockFor(row).breached && <RowCriticalMarker />}
          <Identity
            /* §12.1: the identity opens the record (S-8); the captain's profile is in its rail. */
            to={deps.detailHref(row.id)}
            name={row.driverName}
            /* §7.7 — what they are contesting, and the case id. ONE key. */
            secondary={t('fairness.line', {
              reason: t(`fairness.reason.${row.reasonCode}`),
              id: row.id,
            })}
            label={t('fairness.a11y.open', { name: row.driverName })}
          />
        </>
      ),
    },
    middle,
    {
      id: 'sla',
      emphasis: 'data',
      header: t('queue.col.sla'),
      width: 160,
      dataType: 'date',
      /* AC-114 — no sort. §4.6's order is a rule, not a preference. */
      /* A decided row says WHEN it was decided rather than drawing a dash: the
         page sweep measured this column empty on 16 of 17 rows while the
         banner counted two breaches the column could not show. */
      cell: (row) =>
        isDecided(row) ? (
          row.decidedAt === null ? (
            <Absent />
          ) : (
            <MutedCell>
              <bdi>
                {t('fairness.decided.on', {
                  date: formatDate(row.decidedAt, { style: 'day-month', language }),
                })}
              </bdi>
            </MutedCell>
          )
        ) : (
          <SlaCell result={clockFor(row)} dueAt={row.slaDueAt} t={t} language={language} />
        ),
    },
    {
      id: 'owner',
      header: t('queue.col.owner'),
      width: 176,
      dataType: 'enum',
      filter: {
        kind: 'boolean',
        field: 'unclaimed',
        trueLabel: t('queue.owner.unclaimed'),
        falseLabel: t('queue.filter.breached.no'),
      },
      /* On a decided row the owner is whoever decided it; the chip is for work
         still open. Same shape as Safety's closed row. */
      cell: (row) =>
        isDecided(row) ? (
          row.decidedByUserName === null ? (
            <Absent />
          ) : (
            <MutedCell>{row.decidedByUserName}</MutedCell>
          )
        ) : (
          <OwnerChip
            claim={row.claim}
            currentUserId={deps.currentUserId}
            now={now}
            t={t}
            canWrite={deps.canWrite}
            disabledReason={t('queue.action.noPermission')}
            onClaim={() => deps.onClaim(row)}
            onRelease={() => deps.onRelease(row)}
            onTakeOver={() => deps.onTakeOver(row)}
          />
        ),
    },
    {
      id: 'decision',
      header: t('queue.col.decision'),
      width: 176,
      dataType: 'enum',
      cell: (row) => {
        const failed = deps.failure(row.id)
        if (failed) {
          return (
            <ErrorState
              scope="row"
              message={failed.message}
              action={{ label: t('queue.error.retry'), onClick: failed.retry }}
            />
          )
        }

        /* **Q-26 / AC-226** — converted in place, naming outcome, actor and
           reason. **AC-333**'s second half: the rationale is on the decided
           row, as the cell's `title`, because R20 fixes the row's height and a
           three-line cell would clip instead of growing. */
        if (isDecided(row)) {
          return (
            <DecisionBadge
              outcome={t(STATUS[row.status].key)}
              meta={
                row.decidedAt === null
                  ? null
                  : t('queue.decided.by', {
                      actor: row.decidedByUserName ?? '',
                      date: formatDate(row.decidedAt, { style: 'day-month-time', language }),
                    })
              }
              reason={row.rationale}
              /* Q-18 / AC-222 — decided after its deadline says so here, and
                 carries no marker. */
              late={row.slaBreachedAt !== null}
              lateLabel={t('queue.decided.late')}
            />
          )
        }

        /* §9.6 — a closed set of exactly two, both neutral, both confirmed,
           both requiring a rationale. R3: no filled primary in a row.
           §11.2 / D17 clause 3 — the refusal is rendered text beneath the pair,
           once, never a `title`. The help text stays a `title` because it is a
           description of an ENABLED control, not a reason it is refused. */
        const refusalId = `fairness-decide-refusal-${row.id}`
        const refused = !deps.canWrite
        return (
          <span className="flex flex-col items-start gap-1">
            <span className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="xs"
                onClick={() => deps.onDecide(row, 'upheld')}
                disabled={refused}
                title={refused ? undefined : t('fairness.action.uphold.help')}
                aria-describedby={refused ? refusalId : undefined}
              >
                {t('fairness.action.uphold')}
              </Button>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => deps.onDecide(row, 'overturned')}
                disabled={refused}
                title={refused ? undefined : t('fairness.action.overturn.help')}
                aria-describedby={refused ? refusalId : undefined}
              >
                {t('fairness.action.overturn')}
              </Button>
            </span>
            {refused && <RefusalLine id={refusalId}>{t('queue.action.noPermission')}</RefusalLine>}
          </span>
        )
      },
    },

    /* ── behind the column control (§7.4) ─────────────────────────────── */
    {
      id: 'kind',
      header: t('fairness.col.kind'),
      width: 152,
      dataType: 'enum',
      defaultHidden: true,
      sortField: 'kind',
      filter: {
        kind: 'multi-select',
        field: 'kind',
        options: [
          { value: 'suspension-appeal', label: t('fairness.kind.suspensionAppeal') },
          { value: 'rating-dispute', label: t('fairness.kind.ratingDispute') },
          { value: 'rider-report', label: t('fairness.kind.riderReport') },
        ],
      },
      cell: (row) => (
        <Cell>
          {t(
            row.kind === 'suspension-appeal'
              ? 'fairness.kind.suspensionAppeal'
              : row.kind === 'rating-dispute'
                ? 'fairness.kind.ratingDispute'
                : 'fairness.kind.riderReport',
          )}
        </Cell>
      ),
    },
    {
      id: 'status',
      emphasis: 'data',
      header: t('queue.col.status'),
      width: 136,
      dataType: 'enum',
      defaultHidden: true,
      sortField: 'status',
      filter: {
        kind: 'multi-select',
        field: 'status',
        options: (Object.keys(STATUS) as FairnessCaseStatus[]).map((value) => ({
          value,
          label: t(STATUS[value].key),
        })),
      },
      cell: (row) => (
        <Cell>
          <StatusBadge tone={STATUS[row.status].tone}>{t(STATUS[row.status].key)}</StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'reasonCode',
      sortField: 'reasonCode',
      header: t('queue.col.reason'),
      width: 176,
      dataType: 'enum',
      defaultHidden: true,
      filter: {
        kind: 'multi-select',
        field: 'reasonCode',
        options: REASON_CODES.map((value) => ({ value, label: t(`fairness.reason.${value}`) })),
      },
      cell: (row) => <Cell>{t(`fairness.reason.${row.reasonCode}`)}</Cell>,
    },
    {
      id: 'opened',
      header: t('queue.col.opened'),
      width: 136,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'openedAt',
      cell: (row) => (
        <Cell>
          <bdi>{formatDate(row.openedAt, { style: 'day-month-time', language })}</bdi>
        </Cell>
      ),
    },
    {
      id: 'id',
      header: t('queue.col.id'),
      width: 112,
      dataType: 'id',
      defaultHidden: true,
      sortField: 'id',
      cell: (row) => <MutedCell className="tabular-nums">{row.id}</MutedCell>,
    },
  ]
}
