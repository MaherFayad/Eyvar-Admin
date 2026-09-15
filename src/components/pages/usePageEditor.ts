/**
 * The page editor's own state — §5. Every edit updates local state and
 * schedules a save 800 ms later, coalesced (AC-1201). A 409 keeps every
 * local edit and shows the standing notice with `Reload` (AC-1202); undo is
 * a 20-step in-memory stack of full-tree snapshots (AC-1200), simpler and
 * exactly as correct as inverting each op individually would have been.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { savePage, type SavePageOutcome } from '@/data/clients/pages'
import { validatePage } from '@/data/reporting/pages/validate'
import { PageEditorUndoStack } from '@/commands/undo'
import {
  duplicateBlock,
  insertIntoContainer,
  moveBlock,
  moveToContainer,
  removeBlock,
  replaceBlock,
  setToggleOpen,
  turnIntoColumns,
} from './blockOps'
import type { Block, Page, ReportBlockHeight, ReportBlockView } from '@/data/types/page'
import type { Translator } from '@/lib'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'conflict' | 'invalid'

/** The subset of `Page` an edit can change. `id`, `kind`, owner-ish fields and `version` live outside it (see below). */
export type PageContent = Pick<Page, 'title' | 'icon' | 'description' | 'visibility' | 'tags' | 'scope' | 'blocks'>

export interface UsePageEditorOptions {
  page: Page
  t: Translator
  /** AC-1212 — a page opened from `?edit=1` (template creation) starts in edit mode, not view mode. */
  initialEditing?: boolean
}

const AUTOSAVE_DELAY_MS = 800

function contentOf(page: Page): PageContent {
  return {
    title: page.title,
    icon: page.icon,
    description: page.description,
    visibility: page.visibility,
    tags: page.tags,
    scope: page.scope,
    blocks: page.blocks,
  }
}

export function usePageEditor({ page, t, initialEditing = false }: UsePageEditorOptions) {
  const [editing, setEditing] = useState(initialEditing)
  const [content, setContent] = useState<PageContent>(() => contentOf(page))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(page.publishedAt ? page.updatedAt : null)
  const [conflict, setConflict] = useState<Page | null>(null)
  const [violations, setViolations] = useState<readonly { message: string }[]>([])
  const undoStack = useRef(new PageEditorUndoStack<Block[]>())
  /* The version the next save writes against — never part of React state, so
     stamping it after a save does not itself trigger another autosave cycle. */
  const versionRef = useRef(page.version)
  /* Compared against `content` to decide whether the debounce fired on a real
     edit or merely re-ran after a save updated `versionRef`. */
  const lastSentRef = useRef<PageContent>(content)
  /* One save in flight at a time; a draft that arrives mid-request is queued
     and sent the moment the current one settles, never dropped and never
     raced against it (AC-1201's "coalesced"). */
  const savingRef = useRef(false)
  const queuedRef = useRef<PageContent | null>(null)

  const debouncedContent = useDebouncedValue(content, AUTOSAVE_DELAY_MS)

  const save = useCallback(
    async (draft: PageContent) => {
      if (savingRef.current) {
        queuedRef.current = draft
        return
      }
      savingRef.current = true
      setSaveStatus('saving')
      const candidate: Page = { ...page, ...draft, version: versionRef.current }
      const problems = validatePage(candidate)
      if (problems.length > 0) {
        setViolations(problems.map((p) => ({ message: p.message })))
        setSaveStatus('invalid')
        savingRef.current = false
        drainQueue()
        return
      }
      setViolations([])
      try {
        const outcome: SavePageOutcome = await savePage({
          id: candidate.id,
          kind: candidate.kind,
          title: candidate.title,
          icon: candidate.icon,
          description: candidate.description,
          visibility: candidate.visibility,
          tags: candidate.tags,
          scope: candidate.scope,
          blocks: candidate.blocks,
          version: candidate.version,
        })
        if (outcome.status === 'conflict') {
          setConflict(outcome.current)
          setSaveStatus('conflict')
          return
        }
        if (outcome.status === 'invalid') {
          setViolations(outcome.violations.map((v) => ({ message: v.message })))
          setSaveStatus('invalid')
          return
        }
        versionRef.current = outcome.page.version
        setSavedAt(outcome.page.updatedAt)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('invalid')
      } finally {
        savingRef.current = false
        drainQueue()
      }

      function drainQueue() {
        const next = queuedRef.current
        queuedRef.current = null
        if (next) void save(next)
      }
    },
    [page],
  )

  useEffect(() => {
    if (!editing) return
    if (debouncedContent === lastSentRef.current) return
    lastSentRef.current = debouncedContent
    void save(debouncedContent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent, editing])

  /** `Done` — leaves edit mode and flushes any edit still waiting out the 800 ms debounce, so closing the editor right after typing never drops it. */
  const finishEditing = useCallback(() => {
    setEditing(false)
    if (content !== lastSentRef.current) {
      lastSentRef.current = content
      void save(content)
    }
  }, [content, save])

  /**
   * Adopts the server's current version, keeping every local edit, and
   * resends it (AC-1202). The debounce effect fires on `[debouncedContent,
   * editing]` alone — neither changes here — so without an explicit resend
   * the kept edit would sit on screen, unsaved, until the operator typed
   * again; navigating away first would lose it silently.
   */
  const reload = useCallback(() => {
    if (!conflict) return
    versionRef.current = conflict.version
    setConflict(null)
    setSaveStatus('idle')
    lastSentRef.current = content
    void save(content)
  }, [conflict, content, save])

  const applyBlocks = useCallback((mutate: (blocks: Block[]) => Block[]) => {
    setContent((current) => {
      undoStack.current.push({ undo: () => current.blocks })
      return { ...current, blocks: mutate(current.blocks) }
    })
  }, [])

  const undo = useCallback(() => {
    setContent((current) => {
      const previous = undoStack.current.undo()
      if (previous === undefined) return current
      return { ...current, blocks: previous }
    })
  }, [])

  const deleteBlockWithUndo = useCallback(
    (id: string) => {
      let deleted = false
      setContent((current) => {
        const next = removeBlock(current.blocks, id)
        if (!next) return current
        deleted = true
        undoStack.current.push({ undo: () => current.blocks })
        return { ...current, blocks: next }
      })
      if (deleted) {
        toast(t('pg.edit.deleted.toast'), { action: { label: t('pg.edit.deleted.undo'), onClick: () => undo() } })
      }
    },
    [t, undo],
  )

  const actions = {
    onInsert: (containerId: string | null, columnIndex: number | null, index: number, block: Block) =>
      applyBlocks((blocks) => insertIntoContainer(blocks, containerId, columnIndex, index, block)),
    onMove: (id: string, direction: -1 | 1) => applyBlocks((blocks) => moveBlock(blocks, id, direction)),
    onDuplicate: (id: string) => applyBlocks((blocks) => duplicateBlock(blocks, id)),
    onDelete: deleteBlockWithUndo,
    onTurnIntoColumns: (id: string) => applyBlocks((blocks) => turnIntoColumns(blocks, id)),
    onTurnInto: (id: string, to: Block['type']) =>
      applyBlocks((blocks) => {
        const found = findBlockFor(blocks, id)
        return found ? replaceBlock(blocks, id, retype(found, to)) : blocks
      }),
    onReplace: (id: string, next: Block) => applyBlocks((blocks) => replaceBlock(blocks, id, next)),
    onSetHeight: (id: string, height: ReportBlockHeight) =>
      applyBlocks((blocks) => {
        const found = findBlockFor(blocks, id)
        return found?.type === 'report' ? replaceBlock(blocks, id, { ...found, height }) : blocks
      }),
    onSetView: (id: string, view: ReportBlockView) =>
      applyBlocks((blocks) => {
        const found = findBlockFor(blocks, id)
        return found?.type === 'report' ? replaceBlock(blocks, id, { ...found, view }) : blocks
      }),
    onToggleOpen: (id: string, open: boolean) => applyBlocks((blocks) => setToggleOpen(blocks, id, open)),
    onMoveToColumn: (id: string, parentId: string, columnIndex: number) =>
      applyBlocks((blocks) => moveToContainer(blocks, id, parentId, columnIndex)),
    onOpenReportPicker: () => {
      /* `BlockList` owns the insertion-point state that opens `ReportPickerPanel` directly; nothing to dispatch here. */
    },
  }

  return {
    editing,
    setEditing,
    finishEditing,
    content,
    setContent,
    saveStatus,
    savedAt,
    conflict,
    reload,
    violations,
    actions,
    undo,
    undoAvailable: undoStack.current.size > 0,
  }
}

function findBlockFor(blocks: readonly Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block
    if (block.type === 'toggle') {
      const found = findBlockFor(block.blocks, id)
      if (found) return found
    }
    if (block.type === 'columns') {
      for (const column of block.columns) {
        const found = findBlockFor(column.blocks, id)
        if (found) return found
      }
    }
  }
  return null
}

/** `Turn into` across prose types and across pinned types, keeping a report reference intact (AC-1206). */
function retype(block: Block, to: Block['type']): Block {
  const prose = block.type === 'text' ? block.md : block.type === 'heading' ? block.text : block.type === 'callout' ? block.md : ''
  if (to === 'heading' && block.type !== 'heading') return { id: block.id, type: 'heading', level: 2, text: prose }
  if (to === 'text' && block.type !== 'text') return { id: block.id, type: 'text', md: prose }
  if (to === 'callout' && block.type !== 'callout') return { id: block.id, type: 'callout', tone: 'info', md: prose }
  if (to === 'metric' && block.type === 'report') {
    return { id: block.id, type: 'metric', reportId: block.reportId, seriesId: null, format: 'value' }
  }
  if (to === 'report' && block.type === 'metric') {
    return { id: block.id, type: 'report', reportId: block.reportId, view: 'chart', height: 'M', title: null }
  }
  return block
}
