/**
 * Everything a block needs that is not its own data — the catalogue, the
 * page's scope, the translator, and (in edit mode) the editor's actions.
 * One context rather than fifteen props threaded through every recursion
 * level (`toggle` → its blocks, `columns` → each column's blocks).
 */

import { createContext, useContext } from 'react'
import type { Block, ReportBlockHeight, ReportBlockView } from '@/data/types/page'
import type { Dimension, Measure, SavedReport } from '@/data/types'
import type { BoardScope } from '@/data/clients/dashboards'
import type { Direction, Language, Translator } from '@/lib'

export interface PageEditorActions {
  /** `null` container id means the page root. */
  onInsert: (containerId: string | null, columnIndex: number | null, index: number, block: Block) => void
  onMove: (id: string, direction: -1 | 1) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onTurnIntoColumns: (id: string) => void
  onTurnInto: (id: string, to: Block['type']) => void
  onReplace: (id: string, next: Block) => void
  onSetHeight: (id: string, height: ReportBlockHeight) => void
  onSetView: (id: string, view: ReportBlockView) => void
  onToggleOpen: (id: string, open: boolean) => void
  onOpenReportPicker: (containerId: string | null, columnIndex: number | null, index: number) => void
  onMoveToColumn: (id: string, parentId: string, columnIndex: number) => void
}

export interface PageBlocksValue {
  pageId: string
  /** The whole page's blocks — read by the block menu's "Move to column…" to list every `columns` block on the page. */
  blocks: readonly Block[]
  measures: readonly Measure[]
  dimensions: readonly Dimension[]
  scope: BoardScope
  today: string
  noDataSentence: string
  t: Translator
  language: Language
  dir: Direction
  /** `false` for a published page in view mode; blocks render with no frame at all. */
  editing: boolean
  actions: PageEditorActions | null
  onOpenReport: (report: SavedReport) => void
}

const PageBlocksContextInner = createContext<PageBlocksValue | null>(null)

export function PageBlocksProvider({
  value,
  children,
}: {
  value: PageBlocksValue
  children: React.ReactNode
}) {
  return <PageBlocksContextInner.Provider value={value}>{children}</PageBlocksContextInner.Provider>
}

export function usePageBlocks(): PageBlocksValue {
  const ctx = useContext(PageBlocksContextInner)
  if (!ctx) throw new Error('usePageBlocks must be used inside a PageBlocksProvider')
  return ctx
}
