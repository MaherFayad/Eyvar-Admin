/**
 * The page editor's own state (§5). Every edit debounces a save 800ms later
 * (AC-1201, coalesced); a 409 keeps the local edit and offers `Reload`
 * (AC-1202); undo is a 20-step in-memory snapshot stack (AC-1200).
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

/**
 * S3 — where focus goes after a delete: the block that took its place, its
 * container if now empty, or the page's "Add block" control if page-empty.
 * `PageView` owns the DOM query; this hook only names the target.
 */
export type PendingFocus = { kind: 'block'; id: string } | { kind: 'addBlock' }

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
  const [pendingFocus, setPendingFocus] = useState<PendingFocus | null>(null)
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
   * Adopts the server's version, keeping every local edit, and resends it
   * (AC-1202): the autosave effect only fires on [debouncedContent, editing]
   * (F-V2-70), so without this explicit resend the kept edit sits unsaved.
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
      /* `content`, not the updater's own `current`, decides whether this
         delete happened: a flag set inside setContent's updater is not
         reliably readable right after, since React may not run it
         synchronously — a second delete in the same tick (S3's repro) read
         a stale value. Removal still goes through `applyBlocks` as usual. */
      if (!findBlockFor(content.blocks, id)) return
      const focusTarget = focusAfterDelete(content.blocks, id)
      applyBlocks((blocks) => removeBlock(blocks, id) ?? blocks)
      setPendingFocus(focusTarget)
      /* S3 — the toast's own `Undo` button sits far down the tab order
         (Sonner mounts the toaster at the shell root), so a keyboard
         operator is told the faster path instead: `Ctrl+Z`, read aloud by
         the toast's own live region (sonner.tsx, AC-29). */
      toast(t('pg.edit.deleted.toast'), {
        description: t('pg.edit.deleted.toast.hint'),
        action: { label: t('pg.edit.deleted.undo'), onClick: () => undo() },
      })
    },
    [content, applyBlocks, t, undo],
  )

  const clearPendingFocus = useCallback(() => setPendingFocus(null), [])

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
    pendingFocus,
    clearPendingFocus,
  }
}

/**
 * S3 — computed against the tree as it stood BEFORE the removal, the only
 * place `id`'s siblings and parent are visible. Mirrors `findBlockFor`'s
 * traversal instead of `blockOps.ts`'s private `locate`, which lacks it.
 */
function focusAfterDelete(blocks: readonly Block[], id: string): PendingFocus {
  const located = locateSiblings(blocks, id, null)
  if (!located) return { kind: 'addBlock' }
  const { siblingIds, parentBlockId } = located
  const ownIndex = siblingIds.indexOf(id)
  const remaining = siblingIds.filter((siblingId) => siblingId !== id)
  if (remaining.length > 0) {
    const next = remaining[ownIndex] ?? remaining[ownIndex - 1]
    if (next) return { kind: 'block', id: next }
  }
  /* The container `id` sat in is now empty. A nested container (a toggle's
     body, a column) still has its own frame to land on; only an empty page
     root falls through to the page's "Add block" control. */
  return parentBlockId ? { kind: 'block', id: parentBlockId } : { kind: 'addBlock' }
}

function locateSiblings(
  blocks: readonly Block[],
  id: string,
  parentBlockId: string | null,
): { siblingIds: string[]; parentBlockId: string | null } | null {
  for (const block of blocks) {
    if (block.id === id) return { siblingIds: blocks.map((b) => b.id), parentBlockId }
    if (block.type === 'toggle') {
      const found = locateSiblings(block.blocks, id, block.id)
      if (found) return found
    }
    if (block.type === 'columns') {
      for (const column of block.columns) {
        const found = locateSiblings(column.blocks, id, block.id)
        if (found) return found
      }
    }
  }
  return null
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
