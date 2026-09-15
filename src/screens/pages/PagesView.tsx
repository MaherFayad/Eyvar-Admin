/**
 * The pages index — a P1 index table over `pages.list`, replacing
 * `DashboardsView.tsx` (D39/D46). `?view=dashboards` is accepted as an
 * alias for `?view=pages` (`views.ts`).
 */

import { useEffect, useRef, useState, type RefObject } from 'react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { DataTable, type RowAction } from '@/components/DataTable'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { DashboardIcon, RatingIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DataColumn } from '@/components/table/columns'
import { useAsync, useIndexTable } from '@/hooks'
import { deletePage, duplicatePage, listPages, savePage, starPage } from '@/data/clients/pages'
import { pageStarredBy, type Page } from '@/data/types/page'
import { countBlocks } from '@/components/pages/blockOps'
import { formatDate, isolatedRunProps, type Language, type Translator } from '@/lib'
import { reportsViewTabs, type ReportsView } from '@/screens/reports/views'

export interface PagesViewProps {
  title: string
  activeView?: ReportsView
  onSelectView?: (view: ReportsView) => void
  currentUserId: string
  t: Translator
  language: Language
  dir: 'ltr' | 'rtl'
}

type PagesIndexView = 'mine' | 'team' | 'starred' | 'drafts' | 'templates'
const PAGES_INDEX_VIEWS: readonly PagesIndexView[] = ['mine', 'team', 'starred', 'drafts', 'templates']

export function PagesView({ title, activeView = 'pages', onSelectView, currentUserId, t, language, dir }: PagesViewProps) {
  const navigate = useNavigate()
  const table = useIndexTable<Page>({ mode: 'index', getRowId: (row) => row.id })
  const [indexView, setIndexView] = useState<PagesIndexView>('mine')
  const [creating, setCreating] = useState(false)
  const [pending, setPending] = useState<{ page: Page; failed: boolean } | null>(null)
  /* B2 — whichever control opened the dialog, captured at click/Enter time so
     `onCloseAutoFocus` can return focus to it explicitly rather than trust
     Radix's own previously-focused tracking, which this dialog lost. */
  const newPageTriggerRef = useRef<HTMLElement | null>(null)
  const openNewPage = () => {
    newPageTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setCreating(true)
  }

  const pages = useAsync((signal) => listPages({ ...table.params, view: indexView }, signal), {
    deps: [JSON.stringify(table.params), indexView],
    cacheKey: 'pages.list',
  })

  const rows = pages.data?.items ?? []

  const openPage = (page: Page) => navigate(`/management/reports/pages/${page.id}`)
  const openPageForEdit = (page: Page) => navigate(`/management/reports/pages/${page.id}?edit=1`)

  const columns: Array<DataColumn<Page>> = [
    {
      id: 'title',
      header: t('pg.index.col.title'),
      alwaysVisible: true,
      minWidth: 280,
      sortField: 'title',
      dataType: 'text',
      cell: (row) => (
        <span className="flex min-w-0 items-center gap-2">
          <DashboardIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
            <bdi {...isolatedRunProps().run}>{row.title}</bdi>
          </span>
        </span>
      ),
    },
    {
      id: 'kind',
      header: t('pg.index.col.kind'),
      width: 130,
      dataType: 'text',
      cell: (row) => (
        <span className="flex items-center gap-1.5">
          <Badge tone="neutral">{t(`pg.kind.${row.kind}`)}</Badge>
          {row.publishedAt === null && <Badge tone="info">{t('pg.page.draft')}</Badge>}
        </span>
      ),
    },
    {
      id: 'owner',
      header: t('pg.index.col.owner'),
      width: 140,
      dataType: 'text',
      cell: (row) => (
        <span {...isolatedRunProps({ className: 'min-w-0 truncate' }).box}>
          <bdi {...isolatedRunProps().run}>{row.ownerId === currentUserId ? t('pg.index.owner.you') : row.ownerId}</bdi>
        </span>
      ),
    },
    {
      id: 'blocks',
      header: t('pg.index.col.blocks'),
      width: 100,
      dataType: 'number',
      cell: (row) => <span className="tabular-nums">{countBlocks(row.blocks)}</span>,
    },
    {
      id: 'updated',
      header: t('pg.index.col.updated'),
      width: 160,
      sortField: 'updatedAt',
      dataType: 'date',
      cell: (row) => <bdi>{formatDate(row.updatedAt, { style: 'day-month-time', language })}</bdi>,
    },
    {
      id: 'star',
      header: t('pg.index.col.star'),
      width: 60,
      dataType: 'text',
      cell: (row) => {
        const starred = pageStarredBy(row).includes(currentUserId)
        return (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-pressed={starred}
            aria-label={t(starred ? 'pg.index.unstar' : 'pg.index.star', { name: row.title })}
            onClick={async () => {
              await starPage(row.id)
              pages.refetch()
            }}
          >
            <RatingIcon aria-hidden="true" className={starred ? 'size-4 text-foreground' : 'size-4 text-muted-foreground'} />
          </Button>
        )
      },
    },
  ]

  const duplicate = async (row: Page) => {
    try {
      const outcome = await duplicatePage(row.id)
      toast.success(t('pg.index.duplicated.toast', { name: outcome.data.title }))
      pages.refetch()
    } catch {
      toast.error(t('pg.index.duplicate.failed'))
    }
  }

  const rowActions: Array<RowAction<Page>> = [
    { label: t('pg.index.open'), onSelect: openPage, rowClick: true },
    { label: t('pg.index.duplicate'), onSelect: (row) => void duplicate(row) },
    { label: t('pg.index.delete'), onSelect: (row) => setPending({ page: row, failed: false }) },
  ]

  const confirmDelete = async () => {
    if (!pending) return
    try {
      await deletePage(pending.page.id)
      setPending(null)
      toast.success(t('pg.index.deleted.toast', { name: pending.page.title }))
      pages.refetch()
    } catch {
      setPending({ ...pending, failed: true })
    }
  }

  return (
    <SingleColumnPage
      header={
        <PageHeader title={title} meta={null} primaryAction={{ label: t('pg.index.new'), onClick: openNewPage }} t={t} dir={dir} />
      }
    >
      <div className="flex flex-col gap-3">
        <Tabs value={indexView} onValueChange={(value) => setIndexView(value as PagesIndexView)}>
          <TabsList variant="segmented">
            {PAGES_INDEX_VIEWS.map((view) => (
              <TabsTrigger key={view} value={view}>
                {t(`pg.view.${view}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <DataTable
          table={table}
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          status={pages.status}
          total={pages.data?.total ?? 0}
          t={t}
          language={language}
          tableId="management-reports-pages"
          view={activeView}
          tabs={reportsViewTabs(t)}
          activeTab={activeView}
          onSelectTab={(id) => onSelectView?.(id as ReportsView)}
          searchPlaceholder={t('pg.index.search')}
          rowActions={rowActions}
          skeletonPattern="P1"
          firstRun={{
            heading: t('pg.index.firstRun.heading'),
            body: t('pg.index.firstRun.body'),
            actions: [{ label: t('pg.index.firstRun.action'), onClick: openNewPage, primary: true }],
          }}
          noMatch={{ message: t('pg.index.noMatch'), action: { label: t('pg.index.noMatch.action'), onClick: table.clearAll } }}
          error={{ message: t('pg.index.error'), onRetry: pages.refetch }}
        />
      </div>

      <NewPageCard
        open={creating}
        onOpenChange={setCreating}
        onCreated={(page) => {
          setCreating(false)
          openPageForEdit(page)
        }}
        triggerRef={newPageTriggerRef}
        t={t}
      />

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pg.index.delete.title', { name: pending?.page.title ?? '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('pg.index.delete.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          {pending?.failed && (
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

/** `Blank` · `From template` · `Ask the analyst` (§6) — an inline card, never a dialog with a form to fill first. */
function NewPageCard({
  open,
  onOpenChange,
  onCreated,
  triggerRef,
  t,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (page: Page) => void
  /** B2 — the control that opened the dialog, so focus can return to it explicitly on close. */
  triggerRef: RefObject<HTMLElement | null>
  t: Translator
}) {
  const [step, setStep] = useState<'choose' | 'templates'>('choose')
  const [name, setName] = useState('')
  const [failed, setFailed] = useState(false)

  /* B2 — conditionally unmounting `AlertDialog` itself (rather than just
     toggling `open`) tore down Radix's own close-transition bookkeeping in
     the same commit, which is why focus fell to `<body>` instead of back to
     `New page`. Reset the form on each open instead of remounting. */
  useEffect(() => {
    if (open) {
      setStep('choose')
      setName('')
      setFailed(false)
    }
  }, [open])

  const templates = useAsync((signal) => listPages({ view: 'templates', pageSize: 50 }, signal), {
    deps: [open],
    enabled: open && step === 'templates',
    cacheKey: 'pages.list',
    isEmpty: (page) => page.items.length === 0,
  })

  const createBlank = async () => {
    setFailed(false)
    try {
      const outcome = await savePage({
        id: null,
        kind: 'note',
        title: name.trim() === '' ? t('pg.page.untitled') : name.trim(),
        icon: null,
        description: null,
        visibility: 'private',
        tags: [],
        scope: { range: null, filters: [] },
        blocks: [],
      })
      if (outcome.status !== 'saved') {
        setFailed(true)
        return
      }
      setName('')
      onCreated(outcome.page)
    } catch {
      setFailed(true)
    }
  }

  const fromTemplate = async (templateId: string) => {
    setFailed(false)
    try {
      const outcome = await duplicatePage(templateId)
      onCreated(outcome.data)
    } catch {
      setFailed(true)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus()
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t('pg.index.new')}</AlertDialogTitle>
          <AlertDialogDescription>{t('pg.index.new.body')}</AlertDialogDescription>
        </AlertDialogHeader>

        {step === 'choose' ? (
          <div className="flex flex-col gap-3">
            <Input value={name} placeholder={t('pg.page.untitled')} onChange={(event) => setName(event.target.value)} />
            <div className="flex flex-col gap-1">
              <Button type="button" variant="ghost" className="justify-start" onClick={() => void createBlank()}>
                {t('pg.index.new.blank')}
              </Button>
              <Button type="button" variant="ghost" className="justify-start" onClick={() => setStep('templates')}>
                {t('pg.index.new.template')}
              </Button>
              <Button type="button" variant="ghost" className="justify-start" asChild>
                <Link to="/management/reports?view=analyst">{t('pg.index.new.askAnalyst')}</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.status === 'loading' ? (
              <p className="text-sm text-muted-foreground">{t('pg.index.loading')}</p>
            ) : templates.status === 'empty' ? (
              <p className="text-sm text-muted-foreground">{t('pg.template.none')}</p>
            ) : (
              (templates.data?.items ?? []).map((template) => (
                <Button
                  key={template.id}
                  type="button"
                  variant="ghost"
                  className="h-auto flex-col items-start gap-0.5 text-start"
                  onClick={() => void fromTemplate(template.id)}
                >
                  <span className="font-medium">{template.title}</span>
                  {template.description && <span className="text-xs font-normal text-muted-foreground">{template.description}</span>}
                </Button>
              ))
            )}
            <Button type="button" variant="ghost" size="xs" className="w-fit" onClick={() => setStep('choose')}>
              {t('pg.index.new.back')}
            </Button>
          </div>
        )}

        {failed && (
          <p role="alert" className="text-xs text-muted-foreground">
            {t('pg.index.new.failed')}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{t('pg.index.new.cancel')}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
