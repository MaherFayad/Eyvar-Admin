/**
 * The inline add-block picker (§3.2) and the slash command's anchor (§3.3) —
 * one component, two entry points, per `03-pages-and-dashboards.md` §5.
 * `agent-insight` has no row: it is written only by the analyst (§3.2).
 */

import {
  AlertRuleIcon,
  ChartIcon,
  ColumnsIcon,
  CountIcon,
  FileTextIcon,
  TableChartIcon,
} from '@/components/icons'
import { BookmarkBlockIcon, CalloutBlockIcon, DividerBlockIcon, HeadingBlockIcon, ToggleBlockIcon } from './blockIcons'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { INSERTABLE_TYPES, defaultBlockFor } from './blockDefaults'
import { PAGE_BLOCK_MAX } from '@/data/types/page'
import type { Block } from '@/data/types/page'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Translator } from '@/lib'

const BLOCK_ICONS: Record<Block['type'], LucideIcon> = {
  text: FileTextIcon,
  heading: HeadingBlockIcon,
  callout: CalloutBlockIcon,
  divider: DividerBlockIcon,
  toggle: ToggleBlockIcon,
  columns: ColumnsIcon,
  report: ChartIcon,
  metric: CountIcon,
  table: TableChartIcon,
  'alert-status': AlertRuleIcon,
  'agent-insight': FileTextIcon,
  bookmark: BookmarkBlockIcon,
}

export interface AddBlockPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchor: ReactNode
  /** Search text is controlled by the caller so the slash command can feed it what the operator typed after `/`. */
  query: string
  onQueryChange: (query: string) => void
  totalBlocks: number
  onInsert: (block: Block) => void
  onPickReport: (type: 'report' | 'metric') => void
  /** `false` for the slash command, which opens with focus already in the text block (AC-1197) — the `+` button (AC-1196) still autofocuses. */
  autoFocusSearch?: boolean
  t: Translator
}

export function AddBlockPicker({
  open,
  onOpenChange,
  anchor,
  query,
  onQueryChange,
  totalBlocks,
  onInsert,
  onPickReport,
  autoFocusSearch = true,
  t,
}: AddBlockPickerProps) {
  const atCap = totalBlocks >= PAGE_BLOCK_MAX

  const select = (type: Block['type']) => {
    if (atCap) return
    if (type === 'report' || type === 'metric') {
      onPickReport(type)
      return
    }
    onInsert(defaultBlockFor(type as Exclude<Block['type'], 'report' | 'metric' | 'agent-insight'>))
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>{anchor}</PopoverAnchor>
      <PopoverContent align="start" className="w-80 p-0">
        {/* cmdk points the input's `aria-labelledby` at its own hidden
            `<label>`, which wins over an `aria-label` on the input itself —
            so the label text has to come from `Command`'s own `label` prop. */}
        <Command label={t('pg.picker.search')}>
          <CommandInput
            value={query}
            onValueChange={onQueryChange}
            placeholder={t('pg.picker.search')}
            autoFocus={autoFocusSearch}
          />
          <CommandList>
            {atCap && (
              <p className="px-3 py-2 text-xs text-muted-foreground">{t('pg.edit.blockLimit')}</p>
            )}
            <CommandEmpty>{t('pg.picker.noMatch')}</CommandEmpty>
            <CommandGroup>
              {INSERTABLE_TYPES.map((type) => {
                const Icon = BLOCK_ICONS[type]
                return (
                  <CommandItem
                    key={type}
                    value={`${t(`pg.block.${type}.name`)} ${t(`pg.block.${type}.desc`)} ${type}`}
                    disabled={atCap}
                    onSelect={() => select(type)}
                    className="items-start gap-2"
                  >
                    <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{t(`pg.block.${type}.name`)}</span>
                      <span className="text-xs text-muted-foreground">{t(`pg.block.${type}.desc`)}</span>
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
