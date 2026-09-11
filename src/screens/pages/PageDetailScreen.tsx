/**
 * One page — `/management/reports/pages/:pageId` (D46). `pages.get`'s own
 * failure is the page-level error (AC-1194); a block's own failure is its
 * own, handled inside `ReportBlockView`/`MetricBlockView`.
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useAsync } from '@/hooks'
import { EYVAR_TODAY, getPage, listMeasures, listDimensions, localDayOf } from '@/data/clients'
import type { SavedReport } from '@/data/types'
import type { Page } from '@/data/types/page'
import { useNowIso } from '@/screens/queues'
import { useShell } from '@/shell/ShellContext'
import { withFallback } from '@/screens/operations/localCopy'
import { PAGES_EN } from './copy'
import { PageView } from '@/components/pages/PageView'
import { REPORTS_EN } from '@/screens/reports/copy'

export function PageDetailScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { pageId = '' } = useParams()
  const t = useMemo(() => withFallback(shell.language.t, { ...REPORTS_EN, ...PAGES_EN }), [shell.language.t])
  const { dir, language } = shell.language
  const now = useNowIso()
  const today = now ? localDayOf(now) : EYVAR_TODAY
  const [localPage, setLocalPage] = useState<Page | null>(null)

  const pageQuery = useAsync(async (signal) => (await getPage(pageId, signal)).data, {
    deps: [pageId],
    cacheKey: 'pages.get',
    isEmpty: () => false,
  })

  const catalogue = useAsync(
    async (signal) => {
      const [measures, dimensions] = await Promise.all([
        listMeasures({ pageSize: 100 }, signal),
        listDimensions({ pageSize: 100 }, signal),
      ])
      return { measures: measures.items, dimensions: dimensions.items }
    },
    { deps: [], cacheKey: 'catalogue.measures', isEmpty: (data) => data.measures.length === 0 },
  )

  const listRoute = '/management/reports?view=pages'
  const openReport = useCallback((report: SavedReport) => navigate(`/management/reports/${report.id}`), [navigate])

  /* A local override wins over the fetched record until the next `pages.get` —
     `publish`/autosave both hand back the fresh row, and re-fetching just to
     read back what the mutation already returned would race the operator's
     next edit. */
  const page = localPage && localPage.id === pageId ? localPage : pageQuery.data

  if (pageQuery.status === 'loading' || catalogue.status === 'loading') {
    return (
      <SingleColumnPage
        header={<PageHeader title={t('pg.page.loading')} meta={null} t={t} dir={dir} />}
        body="flow"
      >
        <LoadingSkeleton pattern="P5" label={t('pg.page.loading')} />
      </SingleColumnPage>
    )
  }

  if (pageQuery.status === 'error' || page === null || page === undefined) {
    return (
      <ErrorState
        scope="page"
        message={t('pg.page.error')}
        action={{ label: t('pg.index.error.retry'), onClick: pageQuery.refetch }}
        secondaryAction={{ label: t('pg.index.title'), onClick: () => navigate(listRoute) }}
      />
    )
  }

  return (
    <PageView
      page={page}
      measures={catalogue.data?.measures ?? []}
      dimensions={catalogue.data?.dimensions ?? []}
      today={today}
      currentUserId={shell.session?.userId ?? ''}
      canWrite={shell.permissions.permissions.includes('view_analytics')}
      noDataSentence={t('overview.noData')}
      onOpenReport={openReport}
      onDeleted={() => navigate(listRoute)}
      onDuplicated={(next) => navigate(`/management/reports/pages/${next.id}`)}
      onPublished={(next) => setLocalPage(next)}
      t={t}
      language={language}
      dir={dir}
    />
  )
}
