/**
 * Pane A's folders (design 12 §3.1): D19's six views with live counts, as a
 * `<nav>` of links carrying `?view=`. The heading collapses the list to one
 * line naming the current folder (D16 class 2). Compact: a `Select`.
 */

import { Link } from 'react-router-dom'
import { formatCount, type Language, type Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDownIcon, ChevronRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export interface Folder {
  id: string
  titleKey: string
  count: number | null
}

export interface FolderNavProps {
  folders: readonly Folder[]
  active: string
  hrefFor: (view: string) => string
  onSelect: (view: string) => void
  collapsed: boolean
  onToggle: () => void
  compact: boolean
  t: Translate
  language: Language
}

export function FolderNav({ folders, active, hrefFor, onSelect, collapsed, onToggle, compact, t, language }: FolderNavProps) {
  const current = folders.find((folder) => folder.id === active) ?? folders[0]
  const count = (folder: Folder | undefined) =>
    folder === undefined || folder.count === null ? '' : formatCount(folder.count, language)

  if (compact) {
    return (
      <div className="px-3 pb-2">
        <Select value={active} onValueChange={onSelect}>
          <SelectTrigger aria-label={t('inbox.folders.label')} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {folders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                {t('inbox.folders.collapsed', { folder: t(folder.titleKey), count: count(folder) })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const Chevron = collapsed ? ChevronRightIcon : ChevronDownIcon

  return (
    <nav aria-label={t('inbox.folders.label')} className="flex flex-col">
      <Button
        variant="ghost"
        size="default"
        aria-expanded={!collapsed}
        aria-label={t(collapsed ? 'inbox.folders.show' : 'inbox.folders.hide')}
        className="justify-start gap-1 rounded-none px-3 text-xs font-semibold text-muted-foreground"
        onClick={onToggle}
      >
        <Chevron />
        {collapsed && current !== undefined
          ? t('inbox.folders.collapsed', { folder: t(current.titleKey), count: count(current) })
          : t('inbox.folders.label')}
      </Button>
      {!collapsed && (
        <ul className="flex flex-col">
          {folders.map((folder) => {
            const selected = folder.id === active
            return (
              <li key={folder.id}>
                <Link
                  to={hrefFor(folder.id)}
                  aria-current={selected ? 'page' : undefined}
                  className={cn(
                    'flex h-control items-center gap-2 ps-8 pe-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none hover:bg-muted',
                    selected ? 'bg-muted font-semibold' : 'font-medium',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{t(folder.titleKey)}</span>
                  <span className="text-2xs text-muted-foreground tabular-nums">{count(folder)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
