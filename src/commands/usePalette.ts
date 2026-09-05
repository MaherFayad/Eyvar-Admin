/**
 * **The command centre's model — P3-T5 · T6 · T7 · T8 · T9.**
 *
 * `GlobalSearch` owns the anchored field and the popover (§2.6 / **CQ-1**:
 * stay anchored, never a centred palette). `components/command/` owns the
 * pixels. This file owns everything between: which rows exist, in what order,
 * which of them are refused and why, what pressing `Enter` does, and where
 * `Escape` goes.
 *
 * It is one file because the four tasks are one chain — the at-rest blocks feed
 * the target step, the target step feeds the confirm step, and the confirm step
 * feeds the toast — and because splitting a state machine across files is how a
 * transition ends up implemented twice.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ## P3-T5 — the `Do` section executes, and only through `command.run`
 *
 * **CQ-4.** Nothing here imports a mutating client. The palette resolves a
 * command, builds a `CommandContext`, and calls **`runCommand`** — the same
 * single dispatch path the row kebab and the bulk bar use. That is what keeps
 * the palette and the row kebab from ever disagreeing about the same record:
 * there is no second write path for them to disagree in.
 *
 * The `Actions` group `GlobalSearch` removed rather than left dead comes back
 * here, and it comes back *because* of the target step. Every command in the
 * registry is `scope: entity` with `arity: 'needs-target'` or `'needs-input'`,
 * so before P3-T6 a `Do` row could be rendered and could not be run — and a row
 * that cannot run is a §11.2 breach in a new place, which is exactly why the
 * previous owner deleted the group instead of shipping it empty.
 *
 * ## P3-T6 — three states, one field
 *
 * | State | Input holds | List holds |
 * |---|---|---|
 * | `root` | free text | the four blocks, or Do · Destinations · Records |
 * | `target` | `[command]` chip + free text | candidates for that command only |
 * | `confirm` | `[command]` `[target]` chips | the consequence + `Enter to confirm` |
 *
 * `Backspace` on an **empty** field ascends. `Escape` ascends, and closes only
 * from `root`. Two meanings for one key is a real cost and §6 records the
 * alternative as worse: Escape always closing throws away a typed target.
 *
 * **`cmdk` owns the arrow keys.** Changing state re-renders the list, so the
 * active index resets to 0 — deliberately, per §6, rather than by accident.
 *
 * ## P3-T7 — the pre-seed, and why it is the whole argument
 *
 * Rows selected when ⌘K opens **are** the target. The chip reads
 * `[2 captains]`, the target step is skipped, and `⌘K → suspend → Enter` acts
 * on exactly those two. An open 360° profile pre-seeds that one entity, and its
 * chip reads the record's **name**, because the operator picked a person, not a
 * quantity.
 *
 * Without it the palette is a slower bulk bar with more keystrokes. With it,
 * the fastest path to *suspend these two* stops going through a mouse.
 *
 * The capture is **frozen at open** — see `selection.ts` for the two reasons,
 * of which **AC-961** is the load-bearing one.
 *
 * ## P3-T8 — populated before a key is pressed
 *
 * Four blocks, in §4's order. Each is empty-safe: a block with no rows renders
 * nothing rather than a heading over a void.
 *
 * ## P3-T9 — the outcome toast
 *
 * `toastOutcome` (D18). The palette closes first, so the toast is never behind
 * the popover that produced it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ## §11.2 is the rule this file breaks most easily
 *
 * **A refused command is disabled in place with its reason. It is never
 * filtered out of the list.** A palette that hides what you may not do teaches
 * you it does not exist, and its absence is the exact legacy defect (`:10237`)
 * §11.2 was written to kill. Every row below carries `refusal: string | null`
 * and every list renders both.
 *
 * **CQ-3** splits this by kind and the split is honoured: destinations and
 * records obey **AC-60** (filtered by the server, absent); actions obey §11.2
 * (present, disabled, explained).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { findSubTabById, getSubTabs, search } from '@/data/clients'
import { visibleSubTabs, type PermissionContext } from '@/shell/permissions'
import type {
  NavCounts,
  ProfileEntityType,
  SearchResponse,
  SearchResult,
  SubTabRoute,
} from '@/data/types'
import { useAsync } from '@/hooks'
import { matchScore, MIN_MATCH_SCORE } from '@/lib/search/fuzzy'
import { formatCount, type Language, type Translate } from '@/lib'
import { toastOutcome } from './outcomeToast'
import { usePaletteRecents } from './recents'
import {
  paletteCommands,
  resolveCommands,
  runCommand,
  unavailableReason,
  type Command,
  type CommandConfirmRequest,
  type CommandContext,
  type CommandHost,
  type CommandSession,
} from './registry'
import { readCommandSelection, type CommandSelection } from './selection'
import { targetSourceFor, TARGET_LIMIT, TARGET_SOURCES, type TargetSource } from './targets'

/* ───────────────────────────── the row shape ───────────────────────────── */

/**
 * **One shape for every row the palette can render** — a command, a queue, a
 * destination, a record, a candidate target.
 *
 * Five shapes would mean five renderers, five focus treatments and five places
 * to forget the refusal line. `cmdk` moves the active highlight across section
 * boundaries (§5), which only works if what it moves across is uniform.
 */
export interface PaletteRow {
  /** `cmdk`'s `value`, and React's key. Stable across renders of the same row. */
  key: string
  /** Line one. Already translated, never a raw key (**AC-74**). */
  title: string
  /** Line two — an id, a path, a count. `null` renders one line. */
  subtitle: string | null
  /**
   * §11.2 — the sentence explaining a refusal. **The row still renders**; it
   * renders disabled, with this as real text on a second line. Never a tooltip
   * (§5.7 confines a tooltip to *naming* a control).
   */
  refusal: string | null
  /** A trailing count, for a queue row. Already localised (**AC-75**). */
  badge: string | null
  icon?: LucideIcon
  /**
   * **D21's escape hatch.** Offered only when the refusal is partial — every
   * target refused is `.all`, and there is nothing to narrow to (**AC-960**) —
   * and only when the screen published a way to change its own selection. It is
   * never a partial apply: it changes what is selected and stops.
   */
  narrow: { label: string; run: () => void } | null
  onSelect: () => void
  /* ── The centred-palette contract (COMMAND-PALETTE-DISCOVERY.md §3, §5). Optional
     until every producer fills them; a renderer treats absence as the plain row. ── */
  /** What the row is, so the renderer can pick its glyph and its line count. */
  kind?: 'command' | 'destination' | 'record' | 'target' | 'queue' | 'resume' | 'recent' | 'guide' | 'hatch'
  /** Space-separated keys (`G O`); each token renders as one kbd chip at inline-end. */
  shortcut?: string | null
  /** Enter goes to another step rather than running; renders a chevron. */
  descends?: boolean
  /** F2 — ArrowRight on an active record row opens its actions in place. */
  onDescend?: (() => void) | null
}

/** A labelled run of rows. Renders nothing when empty — a `Queues (0)` heading is noise. */
export interface PaletteBlock {
  id: string
  heading: string
  rows: readonly PaletteRow[]
}

export type PaletteStep = 'root' | 'record' | 'target' | 'confirm'

/** A committed step, as a removable chip inside the field (§5's scope chip, same shape). */
export interface PaletteChip {
  key: string
  label: string
  removeLabel: string
  /** Ascends to the step this chip committed. */
  onRemove: () => void
}

export interface PaletteConfirm {
  request: CommandConfirmRequest
  reason: string
  setReason: (value: string) => void
  /** `null` while a required reason is empty — §10.4: validated here, never as a 422. */
  submit: (() => void) | null
  cancel: () => void
}

export type PaletteListStatus = 'idle' | 'loading' | 'error' | 'empty' | 'content'

export interface PaletteModel {
  step: PaletteStep
  chips: readonly PaletteChip[]
  query: string
  setQuery: (value: string) => void
  placeholder: string
  /** A write is in flight. Nothing is dismissable and nothing is submittable twice. */
  busy: boolean
  /** At rest: the four blocks. With a query: `Do` and §5's two sections, in CQ-2's order. */
  blocks: readonly PaletteBlock[]
  listStatus: PaletteListStatus
  retry: () => void
  confirm: PaletteConfirm | null
  /** `Backspace` on empty and `Escape`. Returns `true` when it consumed the key. */
  handleKeyDown: (event: { key: string; preventDefault: () => void }) => boolean
  /** Rows across every block, for the footer's count. Optional until the model fills it. */
  count?: number
  /** F7 — a typed prefix (`>` `#` `@` `/`) as a removable chip before the query. */
  scope?: { label: string; onRemove: () => void } | null
}

export interface UsePaletteOptions {
  open: boolean
  close: () => void
  t: Translate
  language: Language
  session: CommandSession
  /** The sub-tab the operator is on — block ① route commands, and `Resume`'s exclusion. */
  subTabId: string | null
  /** `?entity=` — the open 360° layer, and the second source of a pre-seed. */
  openEntityId: string | null
  openEntityType: ProfileEntityType | null
  navCounts: NavCounts | null
  /**
   * The shell's own permission filter, handed down rather than re-derived.
   *
   * `CommandSession` carries a single `canWrite` boolean — the Q4 seam — which
   * is enough to refuse a command and nowhere near enough to decide which
   * destinations a role may be shown. `GlobalSearch` is routed and already
   * holds the context the nav filters with, so it passes the same one here and
   * the two surfaces cannot disagree about what exists.
   */
  permissions: PermissionContext
  navigate: (path: string) => void
  openProfile: (entityType: ProfileEntityType, entityId: string) => void
  /** The onboarding checklist while it is incomplete and undismissed; `null` otherwise. */
  guide: { done: number; total: number; open: () => void } | null
}

/* ───────────────────────────── the pre-seed ───────────────────────────── */

interface PreSeed {
  source: TargetSource
  ids: readonly string[]
  /** D21 — present only when the publisher can narrow what it published. */
  selectOnly?: (ids: readonly string[]) => void
}

function seedFromSelection(selection: CommandSelection | null): PreSeed | null {
  if (selection === null || selection.ids.length === 0) return null
  const source = targetSourceFor(selection.entityType)
  if (source === null) return null
  return selection.selectOnly
    ? { source, ids: selection.ids, selectOnly: selection.selectOnly }
    : { source, ids: selection.ids }
}

/* ───────────────────────────────── CQ-2 ───────────────────────────────── */

/**
 * One comparable number for a command, on the scale `search()` scores an entity
 * and a destination on (**P3-T4**).
 *
 * The title outweighs the synonyms: an operator who typed the command's actual
 * name meant that command, and a keyword hit is a near miss by design —
 * `deactivate` should *find* `Suspend captain` and should not *outrank* it.
 *
 * **This is the only ranking that happens on the client, and it is not a breach
 * of "ranking belongs in the data layer".** The registry is client code; no
 * server knows which commands this build declares. Rows that *do* come from the
 * server — destinations and records — render in the order the server sent them
 * and are never re-scored here, which is the same reason `shouldFilter={false}`
 * stays on `cmdk`.
 */
const KEYWORD_WEIGHT = 0.8

/** What an operator types to find the checklist. */
const GUIDE_KEYWORDS = ['onboarding', 'getting started', 'checklist', 'guide', 'البدء', 'التهيئة']

function scoreCommand(query: string, title: string, keywords: readonly string[]): number {
  let best = matchScore(query, title)
  for (const keyword of keywords) {
    best = Math.max(best, matchScore(query, keyword) * KEYWORD_WEIGHT)
  }
  return best
}

/**
 * **Order by query shape, not by fixed rank — CQ-2.**
 *
 * §5 fixes `Destinations · Records`; a command centre wants verbs first. The
 * ruling is that the order is *derived* — "a query that matches a command's
 * keywords **with a leading verb** puts `Do` first" — and never a user setting.
 *
 * The mechanical reading of "leading verb": score the query's **first token**
 * against the command vocabulary. A leading token landing on a command keyword
 * is an operator naming an action; the same token later is an operator naming a
 * thing and qualifying it. So `suspend nora` puts `Do` first and `nora suspend`
 * does not — which is right, because the second reads as a search for Nora.
 */
function commandsFirst(query: string, commands: readonly ScoredCommand[]): boolean {
  const leading = query.trim().split(/\s+/)[0] ?? ''
  if (leading === '') return false
  return commands.some((entry) => entry.leadingScore >= MIN_MATCH_SCORE)
}

interface ScoredCommand {
  command: Command
  source: TargetSource
  score: number
  /** The first token's score on its own — what CQ-2's "leading verb" means. */
  leadingScore: number
}

/* ──────────────────────────── free row builders ──────────────────────────── */

interface RowChrome {
  t: Translate
  language: Language
  close: () => void
  navigate: (path: string) => void
}

/**
 * `Operations · Customer Support`. The workspace, then the sub-tab, `·`
 * separated — §5's result **metadata**, not a breadcrumb (§2.6 bans those, and
 * the separator is what makes that unmistakable).
 *
 * Built from the route table, so a row for a page the operator is not on still
 * says where it is.
 */
/**
 * The path rendered UNDER a destination row.
 *
 * It used to append `route.titleKey` — the row's own title — so every row in
 * the command centre stated its name twice:
 *
 *     Safety & Incidents
 *     Customer Support · Safety & Incidents
 *
 * A second line that restates the first spends a row of the popover and tells
 * the operator nothing they cannot already read. 35 of the 36 route rows carry
 * a `subtitleKey` saying what the page is FOR, which is exactly what a name
 * cannot convey, so that is what belongs here. The one row that has none falls
 * back to the workspace alone rather than padding the line to look full.
 */
function workspacePath(route: SubTabRoute, t: Translate): string {
  const workspace = t(`workspace.${route.workspaceId}`)
  return route.subtitleKey === null ? workspace : `${workspace} · ${t(route.subtitleKey)}`
}

function destinationRow(
  route: SubTabRoute | null,
  count: number | null,
  prefix: string,
  chrome: RowChrome,
): PaletteRow | null {
  if (route === null) return null
  return {
    key: `${prefix}:${route.subTabId}`,
    title: chrome.t(route.titleKey),
    subtitle: workspacePath(route, chrome.t),
    refusal: null,
    badge: count === null ? null : formatCount(count, chrome.language),
    narrow: null,
    onSelect: () => {
      chrome.close()
      chrome.navigate(route.path)
    },
  }
}

/**
 * The chip and the row subtitle for a set of targets — **P3-T7**.
 *
 * One record reads as the record: `Nora Al-Harbi`. The operator picked a
 * person, and `1 captain` would be the palette telling them what they can
 * already see. More than one reads as a count, because twelve names do not fit
 * in a chip and the count is the fact that matters.
 */
function describeSet(
  source: TargetSource,
  rows: readonly unknown[],
  t: Translate,
  language: Language,
): string {
  const first = rows[0]
  if (rows.length === 1 && first !== undefined) return source.describe(first).title
  return t(source.pluralKey, { count: formatCount(rows.length, language) })
}

/**
 * **AC-74 — a row must never render a raw i18n key.**
 *
 * The same guard `GlobalSearch` has carried since 0.8, for the same reason and
 * with the same narrowness: `searchDestinations` sets `title: row.titleKey`,
 * and `SearchResult.title` is typed as a finished display string. A dotted,
 * space-free, lower-camel token is a key; `Nora Al-Harbi`, `TRP-4182` and
 * `Riyadh North` all fail the test, so a human string is never put through
 * `t()` — which matters, because `t()` throws on a missing key under test.
 */
const LOOKS_LIKE_I18N_KEY = /^[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+$/

export function displayString(value: string, t: Translate): string {
  return LOOKS_LIKE_I18N_KEY.test(value) ? t(value) : value
}

/* ─────────────────────────────── the hook ─────────────────────────────── */

export function usePalette(options: UsePaletteOptions): PaletteModel {
  const {
    open,
    close,
    t,
    language,
    session,
    subTabId,
    openEntityId,
    openEntityType,
    navCounts,
    permissions,
    navigate,
    openProfile,
    guide,
  } = options

  const [query, setQuery] = useState('')
  /**
   * The command the operator committed to. `skipped` records **how** it got its
   * targets, and it is what tells `Escape` where to go: a command whose target
   * step was skipped by the pre-seed has no target step to fall back to, so
   * backing out of its confirmation returns to the root rather than to a step
   * that was never entered.
   */
  const [picked, setPicked] = useState<{
    command: Command
    source: TargetSource | null
    skipped: boolean
  } | null>(null)
  const [targets, setTargets] = useState<readonly unknown[] | null>(null)
  const [request, setRequest] = useState<CommandConfirmRequest | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  /** The pending `host.confirm` promise's resolver. See `CommandHost.confirm`. */
  const answer = useRef<((value: string | null) => void) | null>(null)
  /**
   * The confirm step's primary, reachable from the field's `keydown`.
   *
   * A ref rather than a dependency because `handleKeyDown` is built before the
   * confirm memo — and because the handler must not be rebuilt on every
   * keystroke of a typed reason, which is what putting the submit callback in
   * its dependency array would do.
   */
  const confirmSubmit = useRef<(() => void) | null>(null)

  const { resume, recentCommands, recordCommand } = usePaletteRecents(subTabId)

  /* ── the pre-seed, captured on the open transition (P3-T7) ─────────────
     `open` is the only trigger: re-reading on a selection change is exactly
     what freezing exists to prevent. */
  const [seed, setSeed] = useState<PreSeed | null>(null)
  useEffect(() => {
    if (!open) return
    /* Selection first, then the open profile — §4's block ① order, and the
       same precedence: what the operator ticked outranks what they opened. */
    const fromSelection = seedFromSelection(readCommandSelection())
    if (fromSelection !== null) {
      setSeed(fromSelection)
      return
    }
    const source = targetSourceFor(openEntityType)
    if (source !== null && openEntityId !== null) {
      setSeed({ source, ids: [openEntityId] })
      return
    }
    setSeed(null)
  }, [open, openEntityId, openEntityType])

  /* The pre-seeded ids as **records**. `unavailable` needs the record: §11.2
     cannot disable `Suspend` on an already-suspended captain from an id. */
  const seedKey = seed === null ? '' : `${seed.source.entityType}:${seed.ids.join(',')}`
  const seeded = useAsync<readonly unknown[]>(
    (signal) => (seed === null ? Promise.resolve([]) : seed.source.byIds(seed.ids, signal)),
    /* **Deliberately NOT cached (P3-13)** — same reason as `candidates` below:
       `seed.source.byIds` is a registry dispatch across several clients, so no
       honest operation id exists for this read. */
    { deps: [seedKey], enabled: open && seed !== null, isEmpty: () => false },
  )
  const seedRecords = seed === null ? null : (seeded.data ?? null)

  const step: PaletteStep = request !== null ? 'confirm' : picked !== null ? 'target' : 'root'
  const trimmed = query.trim()

  /* ── the two reads ───────────────────────────────────────────────────── */

  const results = useAsync<SearchResponse>((signal) => search(trimmed, {}, signal), {
    deps: [trimmed],
    /* `search(q, {})` — the trimmed query is the fetcher's only input, and the
       options argument is a literal, so `[trimmed]` is the whole key. Typing
       `dri`, backspacing to `dr` and typing `i` again is one round trip, not
       three. */
    cacheKey: 'search.query',
    enabled: open && step === 'root' && trimmed !== '',
    isEmpty: (response) => response.results.length === 0,
  })

  const targetSource = picked?.source ?? null
  const candidates = useAsync<readonly unknown[]>(
    (signal) =>
      targetSource ? targetSource.list(trimmed, signal) : Promise.resolve([] as unknown[]),
    {
      /* **Deliberately NOT cached (P3-13).** `targetSource.list` dispatches
         through the command registry to a different client per entity type, so
         there is no single data-layer operation id to key on and an invented one
         would break `invalidate('<resource>.')` for every resource it stood in
         for. Cacheable once the registry declares the operation id it calls. */
      deps: [targetSource?.entityType ?? '', trimmed],
      enabled: open && step === 'target' && targetSource !== null,
      isEmpty: (rows) => rows.length === 0,
    },
  )

  /* ── dispatch (P3-T5) ────────────────────────────────────────────────── */

  const reset = useCallback(() => {
    /* A pending confirmation must be answered or `runCommand` never settles and
       `busy` never clears. `null` is the operator backing out. */
    answer.current?.(null)
    answer.current = null
    setPicked(null)
    setTargets(null)
    setRequest(null)
    setReason('')
    setQuery('')
    setBusy(false)
  }, [])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  /**
   * **CQ-4 — the palette's whole write surface.**
   *
   * `confirm` is what makes §3's confirm step work without the command knowing
   * it exists: `run` awaits a promise, the palette renders the question as its
   * third state, and `Enter` resolves it. A destructive command reached from a
   * row still confirms in a modal; reached from the palette it confirms *in*
   * the palette. Two shapes, one decision, one signature — and one place where
   * the copy lives, which is the command.
   *
   * `busy` drops here on purpose: from the moment the question is on screen the
   * console is waiting on a human, not on a write, and a read-only field with a
   * dead primary is not what waiting on a human looks like.
   */
  const host = useMemo<CommandHost>(
    () => ({
      openProfile,
      confirm: (next) =>
        new Promise<string | null>((resolve) => {
          answer.current = resolve
          setRequest(next)
          setReason('')
          setBusy(false)
        }),
    }),
    [openProfile],
  )

  const context = useCallback(
    (rows: readonly unknown[]): CommandContext => ({
      targets: rows,
      t,
      language,
      session,
      host,
    }),
    [host, language, session, t],
  )

  const dispatch = useCallback(
    async (command: Command, rows: readonly unknown[]) => {
      setBusy(true)
      let result
      try {
        result = await runCommand(command, context(rows))
      } finally {
        setBusy(false)
        answer.current = null
      }

      if (result.kind === 'refused') {
        /* Belt and braces. The gate is at render — the row carried this
           sentence and was disabled — so reaching here means the record changed
           under the palette, and stating it is better than silence. */
        setRequest(null)
        close()
        toastOutcome({ message: result.reason }, t)
        return
      }
      if (result.kind === 'cancelled') {
        /* They backed out of the confirm step. Ascend, do not close: they still
           have the command and the target, and throwing those away is the exact
           cost §6 rejected when it made Escape ascend. */
        setRequest(null)
        setReason('')
        return
      }
      /* Recorded on success only. Block ④ is *commands you ran*, and a cancelled
         confirmation is not one. */
      recordCommand(command.id)
      close()
      toastOutcome(result.outcome, t)
    },
    [close, context, recordCommand, t],
  )

  /**
   * Pick a command: run it now if it already has what it needs, otherwise
   * descend to the target step.
   *
   * The `await` is the pre-seed's race, closed: `byIds` fires when the palette
   * opens, and an operator fast enough to press `Enter` inside that read would
   * otherwise be dropped into a target step for records that were already
   * chosen. It resolves the same ids from the same source, so it is the read
   * finishing rather than a second one starting.
   */
  const choose = useCallback(
    async (command: Command, source: TargetSource | null, preseeded: readonly unknown[] | null) => {
      if (command.arity === 'immediate') {
        void dispatch(command, [])
        return
      }
      let rows = preseeded
      if (rows === null && seed !== null && source !== null && seed.source === source) {
        setBusy(true)
        try {
          rows = await seed.source.byIds(seed.ids)
        } finally {
          setBusy(false)
        }
      }
      if (rows !== null && rows.length > 0) {
        /* **P3-T7 — the target step is skipped.** The chip is already committed
           and the operator pressed one key. */
        setPicked({ command, source, skipped: true })
        setTargets(rows)
        void dispatch(command, rows)
        return
      }
      setPicked({ command, source, skipped: false })
      setTargets(null)
      setQuery('')
    },
    [dispatch, seed],
  )

  /* ── ascend / descend (P3-T6) ────────────────────────────────────────── */

  const ascend = useCallback((): boolean => {
    /* A write in flight is not dismissable — D8's rule for the modal, and the
       same reason: the operator cannot un-ask a question already on the wire. */
    if (busy) return true
    if (request !== null) {
      answer.current?.(null)
      answer.current = null
      setRequest(null)
      setReason('')
      if (picked?.skipped) {
        setPicked(null)
        setTargets(null)
      } else {
        setTargets(null)
      }
      return true
    }
    if (picked !== null) {
      setPicked(null)
      setTargets(null)
      setQuery('')
      return true
    }
    return false
  }, [busy, picked, request])

  const handleKeyDown = useCallback(
    (event: { key: string; preventDefault: () => void }): boolean => {
      if (event.key === 'Escape' || (event.key === 'Backspace' && query === '')) {
        if (ascend()) {
          event.preventDefault()
          return true
        }
      }
      /* §3 — `Enter to confirm`. The confirm step replaces the list, so `cmdk`
         has no active item to open and the key would otherwise do nothing. It
         is claimed here rather than on the primary button so that the operator
         never has to leave the field they have been typing in. */
      if (event.key === 'Enter' && confirmSubmit.current !== null) {
        event.preventDefault()
        confirmSubmit.current()
        return true
      }
      return false
    },
    [ascend, query],
  )

  /* ── rows that need the closure ──────────────────────────────────────── */

  const commandRow = useCallback(
    (
      command: Command,
      source: TargetSource | null,
      rows: readonly unknown[] | null,
      keyPrefix: string,
    ): PaletteRow => {
      /* §11.2 — evaluated at RENDER against whatever the command would act on.
         With no pre-seed there is nothing to refuse yet, so the row is offered
         and the target step does the refusing one level down, per record. */
      const refusal = rows === null ? null : unavailableReason(command, context(rows))

      let narrow: PaletteRow['narrow'] = null
      const selectOnly = seed?.selectOnly
      if (refusal !== null && rows !== null && selectOnly && source !== null) {
        const eligible = rows.filter((row) => unavailableReason(command, context([row])) === null)
        /* Not offered when EVERY target is blocked — that is `.all`, and there
           is nothing to narrow to (**AC-960**). */
        if (eligible.length > 0 && eligible.length < rows.length) {
          const ids = eligible.map((row) => source.describe(row).id)
          narrow = {
            label: t('command.selectEligible', { count: formatCount(eligible.length, language) }),
            /* **It never runs the command.** It changes the selection — the
               operator's own, visibly, through the seam the screen published —
               and leaves them to press the command again. */
            run: () => {
              selectOnly(ids)
              setSeed((current) => (current === null ? current : { ...current, ids }))
            },
          }
        }
      }

      return {
        key: `${keyPrefix}:${command.id}`,
        title: t(command.titleKey),
        subtitle:
          rows === null || rows.length === 0 || source === null
            ? null
            : describeSet(source, rows, t, language),
        refusal,
        badge: null,
        ...(command.icon ? { icon: command.icon } : {}),
        narrow,
        onSelect: () => {
          if (refusal !== null) return
          void choose(command, source, rows)
        },
      }
    },
    [choose, context, language, seed, t],
  )

  const chrome = useMemo<RowChrome>(
    () => ({ t, language, close, navigate }),
    [close, language, navigate, t],
  )

  /* ── block ① — commands for what is on screen (P3-T8) ─────────────────── */

  const onScreenRows = useMemo<PaletteRow[]>(() => {
    const rows: PaletteRow[] = []
    /* 1. The selection, or the open profile — whichever was captured. */
    if (seed !== null && seedRecords !== null && seedRecords.length > 0) {
      const plural = seedRecords.length > 1
      const applicable = resolveCommands(seed.source.commands, {
        entityType: seed.source.entityType,
        plural,
      })
      for (const command of paletteCommands(applicable)) {
        rows.push(commandRow(command, seed.source, seedRecords, 'seeded'))
      }
    }
    /* 2. Route commands. **None are declared today** — `scope.kind === 'route'`
       arrives with `shell.ts` in P2-T7 — so this contributes nothing yet, and is
       written now rather than remembered later. */
    for (const source of TARGET_SOURCES) {
      for (const command of paletteCommands(source.commands)) {
        if (command.scope.kind !== 'route' || command.scope.subTabId !== subTabId) continue
        rows.push(commandRow(command, null, [], 'route'))
      }
    }
    return rows
  }, [commandRow, seed, seedRecords, subTabId])

  /* ── block ② — live queue counts (P3-T8) ──────────────────────────────── */

  const queueRows = useMemo<PaletteRow[]>(() => {
    if (navCounts === null) return []
    return (
      navCounts.subTabs
        .filter((row) => row.count !== null && row.count > 0 && row.subTabId !== subTabId)
        /* Attention before neutral, then biggest first. §2.4/**AC-26**: a zero
         renders nothing at all, which is why the filter is `> 0` and not a
         badge that reads `0`. */
        .slice()
        .sort((a, b) => {
          const byTone = Number(b.tone === 'attention') - Number(a.tone === 'attention')
          return byTone !== 0 ? byTone : (b.count ?? 0) - (a.count ?? 0)
        })
        .slice(0, 5)
        .map((row) => destinationRow(findSubTabById(row.subTabId), row.count, 'queue', chrome))
        .filter((row): row is PaletteRow => row !== null)
    )
  }, [chrome, navCounts, subTabId])

  /* ── block ③ — Resume (P3-T8) ─────────────────────────────────────────── */

  const resumeRows = useMemo<PaletteRow[]>(
    () =>
      resume
        .map((id) => destinationRow(findSubTabById(id), null, 'resume', chrome))
        .filter((row): row is PaletteRow => row !== null),
    [chrome, resume],
  )

  /* ── block ④ — recent commands, most-used first (P3-T8) ───────────────── */

  const recentRows = useMemo<PaletteRow[]>(() => {
    const rows: PaletteRow[] = []
    for (const id of recentCommands) {
      for (const source of TARGET_SOURCES) {
        const command = source.commands.find((each) => each.id === id)
        if (command === undefined || command.hiddenFromPalette !== undefined) continue
        const seededFor = seed !== null && seed.source === source ? seedRecords : null
        rows.push(commandRow(command, source, seededFor, 'recent'))
        break
      }
    }
    return rows
  }, [commandRow, recentCommands, seed, seedRecords])

  /* ── the ranked sections, once there is a query ───────────────────────── */

  const scoredCommands = useMemo<ScoredCommand[]>(() => {
    if (trimmed === '') return []
    const leading = trimmed.split(/\s+/)[0] ?? ''
    const out: ScoredCommand[] = []
    for (const source of TARGET_SOURCES) {
      for (const command of paletteCommands(source.commands)) {
        const title = t(command.titleKey)
        const score = scoreCommand(trimmed, title, command.keywords)
        if (score < MIN_MATCH_SCORE) continue
        out.push({
          command,
          source,
          score,
          leadingScore: scoreCommand(leading, title, command.keywords),
        })
      }
    }
    return out.sort((a, b) => b.score - a.score)
  }, [t, trimmed])

  const doRows = useMemo<PaletteRow[]>(
    () =>
      scoredCommands.map((entry) => {
        const seededFor = seed !== null && seed.source === entry.source ? seedRecords : null
        return commandRow(entry.command, entry.source, seededFor, 'do')
      }),
    [commandRow, scoredCommands, seed, seedRecords],
  )

  const searchRows = useMemo(() => {
    function toRow(result: SearchResult): PaletteRow {
      const title = displayString(result.title, t)
      const subtitle = result.subtitle ? displayString(result.subtitle, t) : null
      return {
        key: `${result.kind}:${title}:${subtitle ?? ''}`,
        title,
        subtitle,
        /* **CQ-3.** A destination or a record the role cannot open never appears
           at all (**AC-60**) — the server filtered it and the client does not
           re-add any. Only an ACTION is disabled in place. */
        refusal: null,
        badge: null,
        narrow: null,
        onSelect: () => {
          close()
          if ('entityId' in result.target) {
            openProfile(result.target.entityType, result.target.entityId)
            return
          }
          const suffix = result.target.viewId
            ? `?view=${encodeURIComponent(result.target.viewId)}`
            : ''
          navigate(`${result.target.path}${suffix}`)
        },
      }
    }
    const all = results.data?.results ?? []
    return {
      destinations: all.filter((r) => r.kind === 'destination').map(toRow),
      records: all.filter((r) => r.kind === 'entity').map(toRow),
    }
  }, [close, navigate, openProfile, results.data, t])

  /* ── the candidate list, in the target step ───────────────────────────── */

  const targetRows = useMemo<PaletteRow[]>(() => {
    const source = picked?.source
    const command = picked?.command
    if (!source || !command) return []
    return (candidates.data ?? []).slice(0, TARGET_LIMIT).map((record) => {
      const described = source.describe(record)
      /* §11.2 where it matters most: a captain who cannot be suspended is still
         listed, still readable, and says why. Filtering them out would leave the
         operator hunting for someone the palette had hidden from them. */
      const refusal = unavailableReason(command, context([record]))
      return {
        key: `target:${described.id}`,
        title: described.title,
        subtitle: described.subtitle,
        refusal,
        badge: null,
        narrow: null,
        onSelect: () => {
          if (refusal !== null) return
          setTargets([record])
          void dispatch(command, [record])
        },
      }
    })
  }, [candidates.data, context, dispatch, picked])

  /* ── block ⑤ — the rest of this workspace ──────────────────────
     At rest the surface offered `Queues` and, on a fresh session, nothing else:
     route commands are undeclared, `Resume` needs work in flight and `Recent`
     needs a command already run. So pressing the shortcut and typing nothing
     produced five rows and no route to anywhere — a command centre that cannot
     navigate until it is told what to look for.

     The filter is `visibleSubTabs`, the shell's own, which is what keeps AC-60
     intact: a destination the role cannot open is not rendered here for the
     same reason it is not rendered in the nav. The current sub-tab is dropped
     because offering the screen already open is a wasted row, and the queue
     block's own rows are dropped because a duplicate is worse than an absence. */
  const goToRows = useMemo<PaletteRow[]>(() => {
    const here = subTabId === null ? null : findSubTabById(subTabId)
    if (here === null) return []
    const alreadyOffered = new Set(queueRows.map((row) => row.key.split(':')[1]))
    /* Through the client, never the fixture — `seam.test.ts` enforces that a
       component reaches route data the same way in `mock` and in `http`. */
    return visibleSubTabs(permissions, getSubTabs(here.workspaceId), here.workspaceId)
      .filter((route) => route.subTabId !== subTabId && !alreadyOffered.has(route.subTabId))
      .map((route) => destinationRow(route, null, 'goto', chrome))
      .filter((row): row is PaletteRow => row !== null)
  }, [chrome, permissions, queueRows, subTabId])

  /* ── assembly ─────────────────────────────────────────────────────────── */

  /* The checklist, reachable by keyboard from anywhere while it is open work
     (plan D-2): one row, under `Resume` when the field is empty and among the
     destinations when the query names it. */
  const guideRow = useMemo<PaletteRow | null>(() => {
    if (guide === null) return null
    return {
      key: 'guide:onboarding',
      title: t('onboarding.menuEntry'),
      subtitle: t('onboarding.progress', { done: guide.done, total: guide.total }),
      refusal: null,
      badge: null,
      narrow: null,
      onSelect: () => {
        close()
        guide.open()
      },
    }
  }, [close, guide, t])
  const guideMatches =
    guideRow !== null &&
    trimmed !== '' &&
    scoreCommand(trimmed, guideRow.title, GUIDE_KEYWORDS) >= MIN_MATCH_SCORE

  const blocks = useMemo<PaletteBlock[]>(() => {
    if (step === 'confirm') return []
    if (step === 'target') {
      return [{ id: 'targets', heading: t('command.target.heading'), rows: targetRows }]
    }
    if (trimmed === '') {
      return [
        { id: 'onScreen', heading: t('command.block.onScreen'), rows: onScreenRows },
        { id: 'queues', heading: t('command.block.queues'), rows: queueRows },
        {
          id: 'resume',
          heading: t('command.block.resume'),
          rows: guideRow === null ? resumeRows : [guideRow, ...resumeRows],
        },
        { id: 'recent', heading: t('command.block.recent'), rows: recentRows },
        { id: 'goTo', heading: t('command.block.goTo'), rows: goToRows },
      ].filter((block) => block.rows.length > 0)
    }

    const doBlock: PaletteBlock = {
      id: 'do',
      heading: t('command.block.do', { count: formatCount(doRows.length, language) }),
      rows: doRows,
    }
    const destinations: PaletteBlock = {
      id: 'destinations',
      heading: t('shell.search.destinations', {
        count: formatCount(searchRows.destinations.length, language),
      }),
      rows:
        guideMatches && guideRow !== null
          ? [guideRow, ...searchRows.destinations]
          : searchRows.destinations,
    }
    const records: PaletteBlock = {
      id: 'records',
      heading: t('shell.search.records', {
        count: formatCount(searchRows.records.length, language),
      }),
      rows: searchRows.records,
    }
    /* **CQ-2** — derived from the query's shape, never a setting. */
    const ordered = commandsFirst(trimmed, scoredCommands)
      ? [doBlock, destinations, records]
      : [destinations, records, doBlock]
    return ordered.filter((block) => block.rows.length > 0)
  }, [
    doRows,
    goToRows,
    guideMatches,
    guideRow,
    language,
    onScreenRows,
    queueRows,
    recentRows,
    resumeRows,
    scoredCommands,
    searchRows,
    step,
    t,
    targetRows,
    trimmed,
  ])

  const listStatus: PaletteListStatus = (() => {
    if (step === 'confirm') return 'idle'
    if (step === 'target') {
      if (candidates.status === 'loading') return 'loading'
      if (candidates.status === 'error') return 'error'
      return targetRows.length === 0 ? 'empty' : 'content'
    }
    if (trimmed === '') return blocks.length === 0 ? 'empty' : 'content'
    if (results.status === 'loading') return 'loading'
    /* **A failed search with matching commands is not an empty palette.** The
       `Do` section is local and still answers, so the error line renders above
       it rather than instead of it — §11.2's "never a dead end", and the reason
       `error` and `empty` were split apart in the first place. */
    if (results.status === 'error') return doRows.length > 0 ? 'content' : 'error'
    return blocks.length === 0 ? 'empty' : 'content'
  })()

  /* ── chips (P3-T6, P3-T7) ─────────────────────────────────────────────── */

  const chips = useMemo<PaletteChip[]>(() => {
    const out: PaletteChip[] = []
    if (picked !== null) {
      const label = t(picked.command.titleKey)
      out.push({
        key: 'command',
        label,
        removeLabel: t('command.chip.remove', { label }),
        onRemove: () => {
          setPicked(null)
          setTargets(null)
          setQuery('')
        },
      })
    }
    /* The target chip. Committed targets first; at the root it previews the
       pre-seed, which is what tells the operator, before they type, that
       whatever they pick will act on those two. */
    const shown = targets ?? (picked === null ? seedRecords : null)
    const source = picked?.source ?? seed?.source ?? null
    if (shown !== null && shown.length > 0 && source !== null) {
      const label = describeSet(source, shown, t, language)
      out.push({
        key: 'target',
        label,
        removeLabel: t('command.chip.remove', { label }),
        onRemove: () => {
          if (picked === null) {
            /* Dropping the pre-seed at the root: the operator wants to pick a
               target themselves. */
            setSeed(null)
            return
          }
          ascend()
        },
      })
    }
    return out
  }, [ascend, language, picked, seed, seedRecords, t, targets])

  /* ── the confirm step ─────────────────────────────────────────────────── */

  const confirm = useMemo<PaletteConfirm | null>(() => {
    if (request === null) return null
    /* §10.4 — a required reason is validated HERE, before the write, not
       returned as a 422 the operator has to interpret. */
    const needsReason = request.reason !== undefined
    const ready = !busy && (!needsReason || reason.trim() !== '')
    return {
      request,
      reason,
      setReason,
      submit: ready
        ? () => {
            setBusy(true)
            const resolve = answer.current
            answer.current = null
            resolve?.(needsReason ? reason.trim() : '')
          }
        : null,
      cancel: () => {
        ascend()
      },
    }
  }, [ascend, busy, reason, request])

  confirmSubmit.current = confirm?.submit ?? null

  const placeholder = step === 'target' ? t('command.target.prompt') : t('shell.search.placeholder')

  return {
    step,
    chips,
    query,
    setQuery,
    placeholder,
    busy,
    blocks,
    listStatus,
    retry: step === 'target' ? candidates.refetch : results.refetch,
    confirm,
    handleKeyDown,
  }
}
