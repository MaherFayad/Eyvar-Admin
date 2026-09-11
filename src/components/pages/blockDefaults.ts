/**
 * One fresh, empty block per insertable type — what the add-block picker and
 * the slash command both insert before the operator has typed anything.
 * `report`/`metric` are not here: they hand off to `ReportPickerPanel`
 * instead of inserting an empty pointer (§3.2).
 */

import { ulid } from '@/lib/ids'
import type { Block, PageTableColumn } from '@/data/types/page'

export const INSERTABLE_TYPES: readonly Block['type'][] = [
  'text',
  'heading',
  'callout',
  'divider',
  'toggle',
  'columns',
  'report',
  'metric',
  'table',
  'alert-status',
  'bookmark',
]

/**
 * `report`/`metric` hand off to `ReportPickerPanel` instead (§3.2);
 * `agent-insight` is written only by the analyst and has no picker row.
 * Neither is produced here.
 */
export function defaultBlockFor(type: Exclude<Block['type'], 'report' | 'metric' | 'agent-insight'>): Block {
  const id = ulid()
  switch (type) {
    case 'heading':
      return { id, type: 'heading', level: 2, text: '' }
    case 'text':
      return { id, type: 'text', md: '' }
    case 'callout':
      return { id, type: 'callout', tone: 'info', md: '' }
    case 'divider':
      return { id, type: 'divider' }
    case 'toggle':
      return { id, type: 'toggle', title: '', open: true, blocks: [] }
    case 'columns':
      return {
        id,
        type: 'columns',
        columns: [
          { width: 6, blocks: [] },
          { width: 6, blocks: [] },
        ],
      }
    case 'table': {
      const columns: PageTableColumn[] = [
        { key: 'c1', label: '', align: 'start' },
        { key: 'c2', label: '', align: 'start' },
      ]
      return { id, type: 'table', columns, rows: [['', '']] }
    }
    case 'alert-status':
      return { id, type: 'alert-status', ruleIds: [] }
    /* `id: ''` reads as "no target chosen yet" — `BookmarkBlockView` renders
       its own picker in that state rather than a broken link. */
    case 'bookmark':
      return { id, type: 'bookmark', target: { kind: 'page', id: '' } }
  }
}
