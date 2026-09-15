/**
 * One page — header, scope bar, blocks. Single column, capped at the
 * content width (§3). View mode by default; `Edit` (the one primary) enters
 * edit mode, `Done` leaves it and flushes any pending save.
 */

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deletePage, duplicatePage, publishPage } from '@/data/clients/pages'
import type { Dimension, Measure, SavedReport } from '@/data/types'
import type { Page } from '@/data/types/page'
import { formatDate, type Direction, type Language, type Translator } from '@/lib'
import { BlockList } from './BlockList'
import { PageBlocksProvider, type PageEditorActions } from './PageBlocksContext'
import { PageScopeBar } from './PageScopeBar'
import { usePageEditor } from './usePageEditor'
import { countBlocks } from './blockOps'
import { PAGE_BLOCK_MAX } from '@/data/types/page'

export interface PageViewProps {
  page: Page
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  today: string
  currentUserId: string
  canWrite: boolean
  noDataSentence: string
  onOpenReport: (report: SavedReport) => void
  onDeleted: () => void
  onDuplicated: (page: Page) => void
  /** The record changed under the same id (publish sets `publishedAt`) — the parent refreshes its own copy. */
  onPublished: (page: Page) => void
  /** AC-1212 — `PageDetailScreen` reads `?edit=1` and passes it through so a fresh template copy opens already editable. */
  initialEditing?: boolean
  t: Translator
  language: Language
  dir: Direction
}

export function PageView({
  page,
  measures,
  dimensions,
  today,
  currentUserId,
  canWrite,
  noDataSentence,
  onOpenReport,
  onDeleted,
  onDuplicated,
  onPublished,
  initialEditing = false,
  t,
  language,
  dir,
}: PageViewProps) {
  const isOwner = page.ownerId === currentUserId
  const canEdit = canWrite && (isOwner || page.visibility === 'team')
  const isDraft = page.publishedAt === null

  /* Only a permitted operator opens already editing — `?edit=1` alone never grants the chrome. */
  const editor = usePageEditor({ page, t, initialEditing: initialEditing && canEdit })
  const [deleting, setDeleting] = useState<{ failed: boolean } | null>(null)
  const [publishing, setPublishing] = useState(false)

  const setTitle = (title: string) => editor.setContent((c) => ({ ...c, title }))
  const setDescription = (description: string) => editor.setContent((c) => ({ ...c, description: description === '' ? null : description }))

  const confirmDelete = async () => {
    try {
      await deletePage(page.id)
      setDeleting(null)
      toast.success(t('pg.index.deleted.toast', { name: page.title }))
      onDeleted()
    } catch {
      setDeleting({ failed: true })
    }
  }

  const duplicate = async () => {
    try {
      const outcome = await duplicatePage(page.id)
      toast.success(t('pg.index.duplicated.toast', { name: outcome.data.title }))
      onDuplicated(outcome.data)
    } catch {
      toast.error(t('pg.index.duplicate.failed'))
    }
  }

  const publish = async () => {
    setPublishing(true)
    try {
      const outcome = await publishPage(page.id)
      onPublished(outcome.data)
      toast.success(t('pg.page.published.toast', { name: outcome.data.title }))
    } catch {
      toast.error(t('pg.page.publish.failed'))
    } finally {
      setPublishing(false)
    }
  }

  /* Keyboard on a focused frame — Alt+↑/↓ move, Ctrl+D duplicate, Delete
     removes with undo, Shift+F10 opens the block menu (AC-1199). Bound once
     at the page root rather than per block, so a moved focus target does
     not need its own listener rebound. */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!editor.editing) return
      const frame = (event.target as HTMLElement).closest<HTMLElement>('[data-block-id]')
      const id = frame?.dataset.blockId
      if (!id) return
      if (event.altKey && event.key === 'ArrowUp') {
        event.preventDefault()
        editor.actions.onMove(id, -1)
      } else if (event.altKey && event.key === 'ArrowDown') {
        event.preventDefault()
        editor.actions.onMove(id, 1)
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        editor.actions.onDuplicate(id)
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if ((event.target as HTMLElement).tagName === 'INPUT' || (event.target as HTMLElement).tagName === 'TEXTAREA') return
        event.preventDefault()
        editor.actions.onDelete(id)
      }
    },
    [editor],
  )

  /* `Ctrl+Z` — the same 20-step stack the block menu's own undo entry reads (AC-1200). */
  useEffect(() => {
    if (!editor.editing) return
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        editor.undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editor])

  const owner = page.updatedBy
  const meta = t('rb.dashboard.meta', { owner, time: formatDate(page.updatedAt, { style: 'day-month-time', language }) })

  const header = (
    <PageHeader
      title={editor.content.title || t('pg.page.untitled')}
      meta={meta}
      badges={isDraft ? <Badge tone="info">{t('pg.page.draft')}</Badge> : undefined}
      control={
        editor.editing ? (
          <p className="text-xs text-muted-foreground" role="status">
            {editor.saveStatus === 'saving'
              ? t('pg.page.saving')
              : editor.saveStatus === 'saved' && editor.savedAt
                ? t('pg.page.saved', { time: formatDate(editor.savedAt, { style: 'day-month-time', language }) })
                : null}
          </p>
        ) : undefined
      }
      primaryAction={
        canEdit
          ? editor.editing
            ? { label: t('pg.edit.done'), onClick: editor.finishEditing }
            : { label: t('pg.edit.enter'), onClick: () => editor.setEditing(true) }
          : undefined
      }
      overflowActions={
        canEdit
          ? [
              ...(isDraft && isOwner ? [{ label: t('pg.page.publish'), onClick: () => void publish(), disabled: publishing }] : []),
              { label: t('pg.index.duplicate'), onClick: () => void duplicate() },
              { label: t('pg.index.delete'), onClick: () => setDeleting({ failed: false }), destructive: true },
            ]
          : []
      }
      t={t}
      dir={dir}
    />
  )

  const actions: PageEditorActions | null = editor.editing ? editor.actions : null

  return (
    <SingleColumnPage header={header} body="flow">
      {/* AC-1217 — none of this is content; a printed page shows none of it. */}
      {editor.editing && (
        <div className="flex flex-col gap-2 pb-3 print:hidden">
          <Input
            value={editor.content.title}
            placeholder={t('pg.page.untitled')}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            aria-label={t('pg.page.title.label')}
            className="border-none bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
          />
          <Textarea
            value={editor.content.description ?? ''}
            placeholder={t('pg.page.description.placeholder')}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-8 resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      )}

      {editor.conflict && (
        <div role="alert" className="mb-3 flex items-center justify-between gap-2 rounded-card border border-border bg-muted p-3 text-sm print:hidden">
          <span>{t('pg.page.conflict')}</span>
          <Button type="button" size="xs" variant="secondary" onClick={editor.reload}>
            {t('pg.page.conflict.reload')}
          </Button>
        </div>
      )}

      {editor.saveStatus === 'invalid' && editor.violations.length > 0 && (
        <div role="alert" className="mb-3 flex flex-col gap-0.5 rounded-card border border-border bg-muted p-3 text-xs text-muted-foreground print:hidden">
          {editor.violations.map((v, i) => (
            <p key={i}>{v.message}</p>
          ))}
        </div>
      )}

      {/* AC-1217 — the scope bar is a question the operator can still change; a printed page answers as of the moment it was printed and drops the control. `data-pages-scope-bar` is the print harness's language-independent hook. */}
      <div data-pages-scope-bar className="print:hidden">
        <PageScopeBar
          scope={editor.content.scope}
          onChange={(scope) => editor.setContent((c) => ({ ...c, scope }))}
          measures={measures}
          dimensions={dimensions}
          editable={editor.editing}
          today={today}
          t={t}
          language={language}
        />
      </div>

      {/* `data-pages-block-tree` — the print layer's scope hook (globals.css), so the one-column override touches only a page's own blocks. */}
      <div data-pages-block-tree onKeyDown={onKeyDown}>
        <PageBlocksProvider
          value={{
            pageId: page.id,
            blocks: editor.content.blocks,
            measures,
            dimensions,
            scope: editor.content.scope,
            today,
            noDataSentence,
            t,
            language,
            dir,
            editing: editor.editing,
            actions,
            onOpenReport,
          }}
        >
          {editor.content.blocks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('pg.page.empty')}</p>
          ) : null}
          {countBlocks(editor.content.blocks) >= PAGE_BLOCK_MAX && editor.editing && (
            <p className="pb-2 text-xs text-muted-foreground print:hidden">{t('pg.edit.blockLimit')}</p>
          )}
          <BlockList blocks={editor.content.blocks} containerId={null} columnIndex={null} />
        </PageBlocksProvider>
      </div>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pg.index.delete.title', { name: page.title })}</AlertDialogTitle>
            <AlertDialogDescription>{t('pg.index.delete.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleting?.failed && (
            <p role="alert" className="text-xs text-muted-foreground">
              {t('pg.index.delete.failed')}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('pg.index.delete.cancel')}</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()}>
              {t('pg.index.delete.confirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SingleColumnPage>
  )
}
