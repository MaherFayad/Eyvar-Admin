/**
 * Pane A's list (design 12 §3.3): rows in D22 order, `inbox.list.end` after
 * the last, `@tanstack/react-virtual` engaged above 200 rows (Q-CC5). Four
 * states: rows, one grey sentence per empty kind, six skeleton rows, or an
 * `ErrorState`. Rows are measured, so a 60px row token change needs no edit.
 */

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { IsoDateTime } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ErrorState'
import { ConversationListItem } from './ConversationListItem'
import type { InboxRow } from './order'

/** Below this many rows the plain list is cheaper than the virtualiser. */
export const VIRTUALISE_ABOVE = 200

export type ListStatus = 'loading' | 'error' | 'content'

export interface ConversationListProps {
  status: ListStatus
  rows: readonly InboxRow[]
  /** The one-sentence empty body for this folder or search. */
  emptyBody: string
  /** Set when the empty state is a search miss: renders `Clear search`. */
  onClearSearch: (() => void) | null
  onRetry: () => void
  selectedId: string | null
  hrefFor: (id: string) => string
  checked: ReadonlySet<string>
  onCheckedChange: (id: string, checked: boolean) => void
  currentUserId: string
  now: IsoDateTime
  t: Translate
  language: Language
}

export function ConversationList(props: ConversationListProps) {
  const { status, rows, emptyBody, onClearSearch, onRetry, t } = props
  const scroller = useRef<HTMLDivElement | null>(null)
  const virtual = rows.length > VIRTUALISE_ABOVE
  const virtualizer = useVirtualizer({
    count: virtual ? rows.length : 0,
    getScrollElement: () => scroller.current,
    estimateSize: () => 60,
    overscan: 8,
  })

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
      {status === 'loading' && (
        <ul aria-busy="true" className="flex flex-col">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <li key={row} className="flex h-row-media items-center gap-2 px-3">
              <span className="size-2 shrink-0" />
              <Skeleton className="size-control shrink-0 rounded-lg" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </span>
            </li>
          ))}
        </ul>
      )}

      {status === 'error' && (
        <div className="p-3">
          <ErrorState
            scope="card"
            message={t('conversations.error.list')}
            action={{ label: t('conversations.thread.retry'), onClick: onRetry }}
          />
        </div>
      )}

      {status === 'content' && rows.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-3 py-8 text-center text-sm text-muted-foreground">
          <p>{emptyBody}</p>
          {onClearSearch !== null && (
            <Button variant="ghost" size="xs" onClick={onClearSearch}>
              {t('inbox.search.clear')}
            </Button>
          )}
        </div>
      )}

      {status === 'content' && rows.length > 0 && (
        <>
          <ol
            aria-label={t('inbox.list.label')}
            className={virtual ? 'relative w-full' : 'flex flex-col'}
            style={virtual ? { height: virtualizer.getTotalSize() } : undefined}
          >
            {virtual
              ? virtualizer.getVirtualItems().map((item) => {
                  const row = rows[item.index]
                  if (row === undefined) return null
                  return (
                    <div
                      key={row.conversation.id}
                      ref={virtualizer.measureElement}
                      data-index={item.index}
                      className="absolute inset-x-0 top-0"
                      style={{ transform: `translateY(${item.start}px)` }}
                    >
                      <Row {...props} row={row} index={item.index} />
                    </div>
                  )
                })
              : rows.map((row, index) => <Row key={row.conversation.id} {...props} row={row} index={index} />)}
          </ol>
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">{t('inbox.list.end')}</p>
        </>
      )}
    </div>
  )
}

function Row({ row, index, ...props }: ConversationListProps & { row: InboxRow; index: number }) {
  const id = row.conversation.id
  const selected = props.selectedId === id
  const tabbable = props.selectedId === null ? index === 0 : selected
  return (
    <ConversationListItem
      row={row}
      href={props.hrefFor(id)}
      selected={selected}
      tabbable={tabbable}
      checked={props.checked.has(id)}
      checking={props.checked.size > 0}
      onCheckedChange={(next) => props.onCheckedChange(id, next)}
      currentUserId={props.currentUserId}
      now={props.now}
      t={props.t}
      language={props.language}
    />
  )
}
