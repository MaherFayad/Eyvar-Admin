# -*- coding: utf-8 -*-
"""T7.3 part 3 - the page block carries the board and the table."""
import io

P = 'src/screens/management/zones/ZonesScreen.tsx'
s = io.open(P, encoding='utf-8').read()


def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:90]
    s = s.replace(old, new, 1)


rep("""      {/* **The table is gone, and the screen is the map now.**
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
      ) : null}""",
    """      {/* **`null` on the map surface, and that is load-bearing.** There, the
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
                view={view}
                searchPlaceholder={t('zones.search')}
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
            </>
          )}
        </div>
      ) : null}""")

BOARD = """
/* ────────────────────────────── the board ──────────────────────────────── */

/**
 * **The thirteen seeded `management-zones` metrics and the city breakdown,
 * rendered (T7.3, X6).** They were in the fixtures with no surface: the strip
 * above the map carries five of them, and R4-6b's board half is where the rest
 * belong. Same chapters, same tiles and same ranked list every metric board
 * draws, so nothing about a zone measure is styled twice.
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

/* ────────────────────────────── the strip ──────────────────────────────── */"""

rep("\n/* ────────────────────────────── the strip ──────────────────────────────── */", BOARD)

io.open(P, 'w', encoding='utf-8').write(s)
print('ok')
