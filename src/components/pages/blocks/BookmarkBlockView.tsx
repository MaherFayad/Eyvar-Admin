/** `bookmark` — a card linking to another page or report; opens it on click (AC-1191). */

import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { useAsync } from '@/hooks'
import { getPage, getReport } from '@/data/clients'
import { isolatedRunProps } from '@/lib'
import { usePageBlocks } from '../PageBlocksContext'
import type { BookmarkBlock as BookmarkBlockData } from '@/data/types/page'

export function BookmarkBlockView({ block }: { block: BookmarkBlockData }) {
  const { editing, actions, t } = usePageBlocks()
  const { kind, id } = block.target

  const target = useAsync(
    async (signal) => {
      if (id === '') return null
      const single = kind === 'page' ? await getPage(id, signal) : await getReport(id, signal)
      return single.data
    },
    { deps: [kind, id], enabled: id !== '' },
  )

  const href = kind === 'page' ? `/management/reports/pages/${id}` : `/management/reports/${id}`

  return (
    <div className="flex flex-col gap-2">
      {editing && (
        <div className="flex items-center gap-2">
          <Select
            value={kind}
            onValueChange={(value) => actions?.onReplace(block.id, { ...block, target: { kind: value as 'page' | 'report', id: '' } })}
          >
            <SelectTrigger size="sm" aria-label={t('pg.block.bookmark.kind')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page">{t('pg.block.bookmark.kind.page')}</SelectItem>
              <SelectItem value="report">{t('pg.block.bookmark.kind.report')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={id}
            placeholder={t('pg.block.bookmark.id.placeholder')}
            onChange={(event) => actions?.onReplace(block.id, { ...block, target: { kind, id: event.target.value } })}
            className="h-8"
          />
        </div>
      )}

      {id === '' ? (
        <p className="text-sm text-muted-foreground">{t('pg.block.bookmark.empty')}</p>
      ) : target.status === 'loading' ? (
        <LoadingSkeleton pattern="P1" rows={1} label={t('pg.block.bookmark.name')} />
      ) : target.status === 'error' || !target.data ? (
        <ErrorState scope="card" card={false} message={t('pg.block.bookmark.error')} action={{ label: t('rb.dashboard.tile.retry'), onClick: target.refetch }} />
      ) : (
        <Card size="sm">
          <CardContent className="min-w-0">
            <Link to={href} className="flex min-w-0 flex-col gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <span {...isolatedRunProps({ className: 'min-w-0 truncate text-sm font-medium' }).box}>
                <bdi {...isolatedRunProps().run}>{'title' in target.data ? target.data.title : target.data.name}</bdi>
              </span>
              <span className="text-xs text-muted-foreground">{t(`pg.block.bookmark.kind.${kind}`)}</span>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
