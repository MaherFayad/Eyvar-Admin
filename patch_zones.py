# -*- coding: utf-8 -*-
"""T7.3 - the `?view=table` surface on Market & Zones."""
import io

P = 'src/screens/management/zones/ZonesScreen.tsx'
s = io.open(P, encoding='utf-8').read()


def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:80]
    s = s.replace(old, new, 1)


# ── imports ───────────────────────────────────────────────────────────────
rep("""import {
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
} from '@/data/types'""",
    """import {
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
} from '@/data/types'""")

rep("""import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { SingleColumnPage } from '@/components/PageShell'
import { cn } from '@/lib/utils'
import { BoardBand } from '@/components/metrics'""",
    """import { DataTable, type DataColumn } from '@/components/DataTable'
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
} from '@/components/metrics'""")

# ── URL grammar ───────────────────────────────────────────────────────────
rep("""  /* The tile toggles ride as `?view=` — a control, not a level (§3.8.3). */
  const view = new URLSearchParams(location.search).get('view') ?? 'all'
  const setView = useCallback(
    (next: string) => {
      const params = new URLSearchParams(location.search)
      if (next === 'all') params.delete('view')
      else params.set('view', next)
      navigate({ pathname: location.pathname, search: `?${params.toString()}` })
    },
    [navigate, location.pathname, location.search],
  )""",
    """  /**
   * **Two questions, two parameters (T7.3, O5).** `view` says which SURFACE is
   * on — the map, or the index table this board lost — and is the same grammar
   * every other sub-tab's view tabs use. `scope` is the strip's tile toggle,
   * which narrows the zone set on either surface (R4-6 §6.4 clause 1). One
   * parameter could not carry both: `table` is not a zone filter, and `starved`
   * is not a surface.
   */
  const params = new URLSearchParams(location.search)
  const surface: 'map' | 'table' = params.get('view') === 'table' ? 'table' : 'map'
  const view = params.get('scope') ?? 'all'
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
  const setView = useCallback(
    (next: string) => setParam('scope', next === 'all' ? null : next),
    [setParam],
  )
  const setSurface = useCallback(
    (next: string) => setParam('view', next === 'table' ? 'table' : null),
    [setParam],
  )""")

# ── the board read ────────────────────────────────────────────────────────
rep("""  const rows = useMemo(() => actions.apply(zones.data?.items ?? []), [actions, zones.data])""",
    """  /**
   * **The board half of R4-6b, which was seeded and never rendered (X6).**
   * Thirteen `management-zones` metrics and the `citiesHealth` breakdown live
   * in the fixtures; the map surface has room for five of them, so the table
   * surface carries the rest. Read only when that surface is on.
   */
  const board = useAsync<MetricBoard>(
    (signal) => getMetricBoard('management-zones', undefined, signal),
    { deps: [], cacheKey: 'zones.board', enabled: surface === 'table', isEmpty: () => false },
  )

  const rows = useMemo(() => actions.apply(zones.data?.items ?? []), [actions, zones.data])""")

io.open(P, 'w', encoding='utf-8').write(s)
print('ok')
