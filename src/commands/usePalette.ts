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
import { track } from '@/lib/analytics'
import { toastOutcome } from './outcomeToast'
import { LOG_LIMIT, usePaletteRecents, type CommandUsage } from './recents'
import { subTabChord } from './shortcuts'
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
import { COMMAND_GROUPS, targetSourceFor, TARGET_LIMIT, type TargetSource } from './targets'

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

/* ────────────────────────── F5 — ranking that learns ─────────────────────── */

/**
 * How far a habit may move a row: at most 7%, so frequency breaks a tie and
 * never beats a better text match. Deterministic, and bounded by the log's own
 * window, which is what keeps the order testable.
 */
const USAGE_WEIGHT = 0.05
const USAGE_CAP = 5
const RECENCY_WEIGHT = 0.02

function learnedBoost(usage: CommandUsage | undefined): number {
  if (usage === undefined) return 1
  const often = Math.min(usage.count, USAGE_CAP) / USAGE_CAP
  const lately = 1 - Math.min(usage.recentIndex, LOG_LIMIT) / LOG_LIMIT
  return 1 + USAGE_WEIGHT * often + RECENCY_WEIGHT * lately
}

/* ─────────────────────── F3 — the argument that carries ──────────────────── */

/**
 * Split `suspend nora` into the tokens that NAME the command and the ones left
 * over. Longest naming head wins, so a two-word title takes both of its words
 * before the remainder starts. `null` when nothing but the whole query names it.
 */
function carryFor(
  tokens: readonly string[],
  title: string,
  keywords: readonly string[],
): { head: string; rest: string } | null {
  for (let n = tokens.length - 1; n >= 1; n -= 1) {
    const head = tokens.slice(0, n).join(' ')
    if (scoreCommand(head, title, keywords) >= MIN_MATCH_SCORE) {
      return { head, rest: tokens.slice(n).join(' ') }
    }
  }
  return null
}

/* ──────────────────────────── F7 — prefix modes ──────────────────────────── */

/** A leading glyph restricts what the palette answers with. Quiet: Q-P4. */
export type PaletteScopeMode = 'commands' | 'ids' | 'people' | 'destinations'

const PREFIX_MODES: readonly { glyph: string; mode: PaletteScopeMode; labelKey: string }[] = [
  { glyph: '>', mode: 'commands', labelKey: 'command.scope.commands' },
  { glyph: '#', mode: 'ids', labelKey: 'command.scope.ids' },
  { glyph: '@', mode: 'people', labelKey: 'command.scope.people' },
  { glyph: '/', mode: 'destinations', labelKey: 'command.scope.destinations' },
]

/** Which records `@` means. Every entity type that is a person, not a thing. */
const PEOPLE_ENTITY_TYPES: readonly ProfileEntityType[] = [
  'driver',
  'rider',
  'new-rider',
  'applicant',
  'operator',
]

/* ───────────────────────── F1 — the rest state's cap ─────────────────────── */

/** AC-CP3 — ten rows in four groups, and `Queues` is not one of them. */
const REST_ROW_LIMIT = 10
const REST_BLOCK_LIMIT = 3

/** §6 — `palette.ran` records how deep the operator was when it ran. */
const STEP_DEPTH: Record<PaletteStep, number> = { root: 0, record: 1, target: 1, confirm: 2 }

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
  /** `null` where the registry's records have no `ProfileEntityType` — `COMMAND_GROUPS`. */
  source: TargetSource | null
  score: number
  /** The first token's score on its own — what CQ-2's "leading verb" means. */
  leadingScore: number
  /** F3 — what the operator typed after naming the command, or `null`. */
  carry: string | null
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
  kind: PaletteRow['kind'] = 'destination',
  shortcut: string | null = null,
): PaletteRow | null {
  if (route === null) return null
  return {
    key: `${prefix}:${route.subTabId}`,
    title: chrome.t(route.titleKey),
    subtitle: workspacePath(route, chrome.t),
    refusal: null,
    badge: count === null ? null : formatCount(count, chrome.language),
    narrow: null,
    kind,
    shortcut,
    descends: false,
    onDescend: null,
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
  /** F7 — the committed prefix. Stripped from the query, rendered as a scope chip. */
  const [mode, setMode] = useState<PaletteScopeMode | null>(null)
  /** F2 — the record whose actions are being shown, and the query to restore on the way up. */
  const [record, setRecord] = useState<{
    source: TargetSource
    id: string
    title: string
    previousQuery: string
  } | null>(null)
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

  const { resume, recentCommands, usage, recordCommand } = usePaletteRecents(subTabId)

  /* §6 — what `palette.ran` and `palette.abandoned` report. Refs, because
     counting keystrokes in state would re-render on every one of them. */
  const openedAt = useRef(0)
  const keystrokes = useRef(0)
  const ran = useRef(false)
  const wasOpen = useRef(false)
  const stepRef = useRef<PaletteStep>('root')
  const queryRef = useRef('')

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

  /* F2 — the record step outranks `target` because a command chosen there is
     handed the record and never needs candidates; `picked` is only ever the
     skipped kind while it is open. */
  const step: PaletteStep =
    request !== null
      ? 'confirm'
      : record !== null
        ? 'record'
        : picked !== null
          ? 'target'
          : 'root'
  const trimmed = query.trim()
  stepRef.current = step
  queryRef.current = query

  /* ── the two reads ───────────────────────────────────────────────────── */

  const results = useAsync<SearchResponse>((signal) => search(trimmed, {}, signal), {
    deps: [trimmed],
    /* `search(q, {})` — the trimmed query is the fetcher's only input, and the
       options argument is a literal, so `[trimmed]` is the whole key. Typing
       `dri`, backspacing to `dr` and typing `i` again is one round trip, not
       three. */
    cacheKey: 'search.query',
    /* F7 — `>` is commands only, and commands are local. No round trip. */
    enabled: open && step === 'root' && trimmed !== '' && mode !== 'commands',
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

  /* F2 — the record behind the record step. §11.2 refuses per record, and a
     refusal cannot be read off an id. Uncached for `seeded`'s reason. */
  const recordTarget = useAsync<readonly unknown[]>(
    (signal) => (record === null ? Promise.resolve([]) : record.source.byIds([record.id], signal)),
    {
      deps: [record?.source.entityType ?? '', record?.id ?? ''],
      enabled: open && record !== null,
      isEmpty: () => false,
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
    setMode(null)
    setRecord(null)
    setBusy(false)
  }, [])

  /* §6 — one open is one session: the counters start here and
     `palette.abandoned` fires on the way out when nothing ran. */
  useEffect(() => {
    if (open) {
      openedAt.current = Date.now()
      keystrokes.current = 0
      ran.current = false
      wasOpen.current = true
      return
    }
    if (wasOpen.current) {
      wasOpen.current = false
      if (!ran.current) {
        track('palette.abandoned', {
          queryLength: queryRef.current.length,
          step: stepRef.current,
        })
      }
    }
    reset()
  }, [open, reset])

  /**
   * F7 — a prefix glyph at the head of the query commits as a scope and leaves
   * the query itself clean, so every consumer below reads one effective query.
   */
  const changeQuery = useCallback(
    (value: string) => {
      keystrokes.current += 1
      const found = PREFIX_MODES.find((entry) => entry.glyph === value.slice(0, 1))
      if (found !== undefined && mode === null) {
        setMode(found.mode)
        setQuery(value.slice(1).trimStart())
        return
      }
      setQuery(value)
    },
    [mode],
  )

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
      /* Where the operator launched it from, not where the confirm step left
         them — §6's "step depth" is about the path, not the outcome. */
      const depth = STEP_DEPTH[stepRef.current]
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
      ran.current = true
      track('palette.ran', {
        command: command.id,
        step: depth,
        keystrokes: keystrokes.current,
        ms: Date.now() - openedAt.current,
      })
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
    async (
      command: Command,
      source: TargetSource | null,
      preseeded: readonly unknown[] | null,
      /* F3 — what the operator already typed after the verb, pre-filled into
         the target step rather than thrown away. */
      carry: string | null = null,
    ) => {
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
      setQuery(carry ?? '')
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
    /* F2 — out of the record step, with the query that found the record. */
    if (record !== null) {
      setRecord(null)
      setQuery(record.previousQuery)
      return true
    }
    return false
  }, [busy, picked, record, request])

  const handleKeyDown = useCallback(
    (event: { key: string; preventDefault: () => void }): boolean => {
      if (event.key === 'Escape' || (event.key === 'Backspace' && query === '')) {
        /* F7 — the scope chip is the innermost committed thing, so it comes off
           before any step does (AC-CP5). */
        if (mode !== null) {
          setMode(null)
          event.preventDefault()
          return true
        }
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
    [ascend, mode, query],
  )

  /* ── rows that need the closure ──────────────────────────────────────── */

  const commandRow = useCallback(
    (
      command: Command,
      source: TargetSource | null,
      rows: readonly unknown[] | null,
      keyPrefix: string,
      kind: PaletteRow['kind'] = 'command',
      carry: string | null = null,
    ): PaletteRow => {
      /* §11.2 — evaluated at RENDER against whatever the command would act on.
         With no pre-seed there is nothing to refuse yet, so the row is offered
         and the target step does the refusing one level down, per record. An
         `immediate` command has no target step to refuse in, so it is asked
         now with the empty target list it will actually run against. */
      const against = rows ?? (command.arity === 'immediate' ? [] : null)
      const refusal = against === null ? null : unavailableReason(command, context(against))

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

      const targeted =
        rows === null || rows.length === 0 || source === null
          ? null
          : describeSet(source, rows, t, language)

      return {
        key: `${keyPrefix}:${command.id}`,
        title: t(command.titleKey),
        /* F3 — the carried argument outranks the set description, because it is
           what happens next rather than what is already committed. */
        subtitle: carry !== null ? t('command.carry', { rest: carry }) : targeted,
        refusal,
        badge: null,
        ...(command.icon ? { icon: command.icon } : {}),
        narrow,
        kind,
        shortcut: null,
        /* A command with nothing to act on descends into its target step. */
        descends: command.arity !== 'immediate' && targeted === null,
        onDescend: null,
        onSelect: () => {
          if (refusal !== null) return
          void choose(command, source, rows, carry)
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
    /* 2. Route commands, over `COMMAND_GROUPS` rather than `TARGET_SOURCES`:
       a registry whose records have no `ProfileEntityType` has no target source
       and was invisible under the old walk (`targets.ts` header). */
    for (const group of COMMAND_GROUPS) {
      for (const command of paletteCommands(group.commands)) {
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
        .map((row) =>
          destinationRow(findSubTabById(row.subTabId), row.count, 'queue', chrome, 'queue'),
        )
        .filter((row): row is PaletteRow => row !== null)
    )
  }, [chrome, navCounts, subTabId])

  /* ── block ③ — Resume (P3-T8) ─────────────────────────────────────────── */

  const resumeRows = useMemo<PaletteRow[]>(
    () =>
      resume
        .map((id) => destinationRow(findSubTabById(id), null, 'resume', chrome, 'resume'))
        .filter((row): row is PaletteRow => row !== null),
    [chrome, resume],
  )

  /* ── block ④ — recent commands, most-used first (P3-T8) ───────────────── */

  const recentRows = useMemo<PaletteRow[]>(() => {
    const rows: PaletteRow[] = []
    for (const id of recentCommands) {
      for (const group of COMMAND_GROUPS) {
        const command = group.commands.find((each) => each.id === id)
        if (command === undefined || command.hiddenFromPalette !== undefined) continue
        const seededFor =
          seed !== null && group.source !== null && seed.source === group.source ? seedRecords : null
        rows.push(commandRow(command, group.source, seededFor, 'recent', 'recent'))
        break
      }
    }
    return rows
  }, [commandRow, recentCommands, seed, seedRecords])

  /* ── the ranked sections, once there is a query ───────────────────────── */

  const scoredCommands = useMemo<ScoredCommand[]>(() => {
    /* F7 — `>` with nothing typed is the whole command list, every text score
       equal, so what the operator runs most is what they see first (F5). */
    const listAll = trimmed === '' && mode === 'commands'
    if (trimmed === '' && !listAll) return []
    const tokens = trimmed === '' ? [] : trimmed.split(/\s+/)
    const leading = tokens[0] ?? ''
    const out: ScoredCommand[] = []
    /* `COMMAND_GROUPS`, not `TARGET_SOURCES`: the six `session.*` commands and
       every route registry live in a group with no target source, and walking
       the sources made them unfindable (`targets.ts` header). */
    for (const group of COMMAND_GROUPS) {
      for (const command of paletteCommands(group.commands)) {
        const title = t(command.titleKey)
        const carry = carryFor(tokens, title, command.keywords)
        /* F3 — an argument is not a typo. `suspend nora` is scored on
           `suspend`, or the whole string would drag the command below the
           threshold and the palette could never take an argument at all. */
        const named = carry === null ? trimmed : carry.head
        const score = listAll ? 1 : scoreCommand(named, title, command.keywords)
        if (!listAll && score < MIN_MATCH_SCORE) continue
        out.push({
          command,
          source: group.source,
          /* F5 — frequency and recency weight the text score; they never
             replace it, and the cap keeps a habit from beating a better match. */
          score: score * learnedBoost(usage.get(command.id)),
          leadingScore: listAll ? 0 : scoreCommand(leading, title, command.keywords),
          carry: carry === null ? null : carry.rest,
        })
      }
    }
    return out.sort((a, b) => b.score - a.score)
  }, [mode, t, trimmed, usage])

  const doRows = useMemo<PaletteRow[]>(
    () =>
      scoredCommands.map((entry) => {
        const seededFor = seed !== null && seed.source === entry.source ? seedRecords : null
        /* A pre-seeded command acts on the seed, so there is nothing to carry
           into a target step it will skip. */
        const carry = seededFor === null || seededFor.length === 0 ? entry.carry : null
        return commandRow(entry.command, entry.source, seededFor, 'do', 'command', carry)
      }),
    [commandRow, scoredCommands, seed, seedRecords],
  )

  /**
   * F2 — descend into one record's own commands, keeping the query that found
   * it so `Backspace` puts the operator back where they were.
   */
  const enterRecord = useCallback(
    (source: TargetSource, id: string, title: string) => {
      setRecord({ source, id, title, previousQuery: query })
      setQuery('')
    },
    [query],
  )

  const searchRows = useMemo(() => {
    function toRow(result: SearchResult): PaletteRow {
      const title = displayString(result.title, t)
      const subtitle = result.subtitle ? displayString(result.subtitle, t) : null
      const entity = 'entityId' in result.target ? result.target : null
      const source = entity === null ? null : targetSourceFor(entity.entityType)
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
        kind: entity === null ? 'destination' : 'record',
        shortcut: null,
        /* AC-CP7 — Enter still opens the profile. The actions are a SECOND
           affordance on the same row, never a change to what Enter does. */
        descends: false,
        onDescend:
          entity === null || source === null
            ? null
            : () => enterRecord(source, entity.entityId, title),
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
    const needle = trimmed.toLowerCase()
    /* F7 — each prefix drops the sections it is not about. `#` is stricter than
       a match: it keeps only the records whose ID actually contains what was
       typed, which is what "by ID" means. */
    const records = all.filter((result) => {
      if (result.kind !== 'entity' || !('entityId' in result.target)) return false
      if (mode === 'destinations' || mode === 'commands') return false
      if (mode === 'ids') return result.target.entityId.toLowerCase().includes(needle)
      if (mode === 'people') return PEOPLE_ENTITY_TYPES.includes(result.target.entityType)
      return true
    })
    return {
      destinations:
        mode === null || mode === 'destinations'
          ? all.filter((r) => r.kind === 'destination').map(toRow)
          : [],
      records: records.map(toRow),
    }
  }, [close, enterRecord, mode, navigate, openProfile, results.data, t, trimmed])

  /* ── the candidate list, in the target step ───────────────────────────── */

  const targetRows = useMemo<PaletteRow[]>(() => {
    const source = picked?.source
    const command = picked?.command
    if (!source || !command) return []
    return (candidates.data ?? []).slice(0, TARGET_LIMIT).map((candidate) => {
      const described = source.describe(candidate)
      /* §11.2 where it matters most: a captain who cannot be suspended is still
         listed, still readable, and says why. Filtering them out would leave the
         operator hunting for someone the palette had hidden from them. */
      const refusal = unavailableReason(command, context([candidate]))
      return {
        key: `target:${described.id}`,
        title: described.title,
        subtitle: described.subtitle,
        refusal,
        badge: null,
        narrow: null,
        kind: 'target',
        shortcut: null,
        descends: false,
        onDescend: null,
        onSelect: () => {
          if (refusal !== null) return
          setTargets([candidate])
          void dispatch(command, [candidate])
        },
      }
    })
  }, [candidates.data, context, dispatch, picked])

  /* ── F2 — one record's own commands, in place ─────────────────────────
     `Open 360° profile` first, because it is the row the operator came from
     and the one that always applies. Then every command whose entity scope
     matches, singular, each carrying its own §11.2 refusal (CQ-3). The rows
     wait for the record itself: a refusal cannot be read off an id. */
  const recordActionRows = useMemo<PaletteRow[]>(() => {
    if (record === null) return []
    const rows = recordTarget.data ?? null
    if (rows === null || rows.length === 0) return []
    const out: PaletteRow[] = []
    const openTitle = t('command.record.openProfile')
    if (trimmed === '' || matchScore(trimmed, openTitle) >= MIN_MATCH_SCORE) {
      out.push({
        key: 'record:profile',
        title: openTitle,
        subtitle: null,
        refusal: null,
        badge: null,
        narrow: null,
        kind: 'command',
        shortcut: null,
        descends: false,
        onDescend: null,
        onSelect: () => {
          close()
          openProfile(record.source.entityType, record.id)
        },
      })
    }
    const applicable = resolveCommands(record.source.commands, {
      entityType: record.source.entityType,
      plural: false,
    })
    for (const command of paletteCommands(applicable)) {
      const title = t(command.titleKey)
      if (trimmed !== '' && scoreCommand(trimmed, title, command.keywords) < MIN_MATCH_SCORE) {
        continue
      }
      out.push(commandRow(command, record.source, rows, 'record', 'command'))
    }
    return out
  }, [close, commandRow, openProfile, record, recordTarget.data, t, trimmed])

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
    /* Through the client, never the fixture — `seam.test.ts` enforces that a
       component reaches route data the same way in `mock` and in `http`.
       F4 — the chord comes from the WHOLE workspace's rows, because that is
       what `useSubTabShortcut` assigns letters from; a letter derived from the
       filtered list would name a key that does not work. */
    const rows = getSubTabs(here.workspaceId)
    return visibleSubTabs(permissions, rows, here.workspaceId)
      .filter((route) => route.subTabId !== subTabId)
      .map((route) =>
        destinationRow(
          route,
          null,
          'goto',
          chrome,
          'destination',
          subTabChord(rows, route.subTabId),
        ),
      )
      .filter((row): row is PaletteRow => row !== null)
  }, [chrome, permissions, subTabId])

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
      kind: 'guide',
      shortcut: null,
      descends: false,
      onDescend: null,
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

  /**
   * **AC-CP4 — the queues come when they are asked for.** They are inventory,
   * not context (F1), so the rest state drops them and this brings them back
   * for `queue`, `waiting`, a queue's own name, or their Arabic equivalents.
   */
  const queuesMatch = useMemo(() => {
    if (trimmed === '' || mode !== null || queueRows.length === 0) return false
    for (const word of t('command.queue.keywords').split(',')) {
      const needle = word.trim()
      if (needle !== '' && matchScore(trimmed, needle) >= MIN_MATCH_SCORE) return true
    }
    return queueRows.some((row) => matchScore(trimmed, row.title) >= MIN_MATCH_SCORE)
  }, [mode, queueRows, t, trimmed])

  const blocks = useMemo<PaletteBlock[]>(() => {
    if (step === 'confirm') return []
    if (step === 'target') {
      return [{ id: 'targets', heading: t('command.target.heading'), rows: targetRows }]
    }
    if (step === 'record' && record !== null) {
      return [
        {
          id: 'recordActions',
          heading: t('command.block.recordActions', { name: record.title }),
          rows: recordActionRows,
        },
      ]
    }
    if (trimmed === '') {
      /* F7 — a prefix with nothing typed still answers where it can. `#` and
         `@` cannot: an ID prefix with no ID names nothing. */
      if (mode === 'commands') {
        return [{ id: 'do', heading: t('command.block.do', { count: formatCount(doRows.length, language) }), rows: doRows }]
      }
      if (mode === 'destinations') {
        return [{ id: 'goTo', heading: t('command.block.goTo'), rows: goToRows.slice(0, REST_ROW_LIMIT) }]
      }
      if (mode !== null) return []

      /* **F1 / AC-CP3.** Context, not inventory: four blocks, ten rows, and no
         `Queues`. The budget is spent in §4's order, so the block an operator
         reads first is the one about what is in front of them. */
      const rest: PaletteBlock[] = []
      let budget = REST_ROW_LIMIT
      const take = (id: string, heading: string, rows: readonly PaletteRow[], cap: number) => {
        const slice = rows.slice(0, Math.min(cap, budget))
        if (slice.length === 0) return
        rest.push({ id, heading, rows: slice })
        budget -= slice.length
      }
      take('onScreen', t('command.block.onScreen'), onScreenRows, REST_BLOCK_LIMIT)
      take(
        'resume',
        t('command.block.resume'),
        guideRow === null ? resumeRows : [guideRow, ...resumeRows],
        REST_BLOCK_LIMIT,
      )
      take('recent', t('command.block.recent'), recentRows, REST_BLOCK_LIMIT)
      take('goTo', t('command.block.goTo'), goToRows, budget)
      return rest
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
    /* AC-CP4 — asked for by name, so it answers first. */
    const withQueues = queuesMatch
      ? [{ id: 'queues', heading: t('command.block.queues'), rows: queueRows }, ...ordered]
      : ordered
    return withQueues.filter((block) => block.rows.length > 0)
  }, [
    doRows,
    goToRows,
    guideMatches,
    guideRow,
    language,
    mode,
    onScreenRows,
    queueRows,
    queuesMatch,
    recentRows,
    record,
    recordActionRows,
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
    if (step === 'record') {
      if (recordTarget.status === 'loading') return 'loading'
      if (recordTarget.status === 'error') return 'error'
      return recordActionRows.length === 0 ? 'empty' : 'content'
    }
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
    /* F2 — the record is the outermost committed step, so its chip leads. */
    if (record !== null) {
      out.push({
        key: 'record',
        label: record.title,
        removeLabel: t('command.chip.remove', { label: record.title }),
        onRemove: () => {
          ascend()
        },
      })
    }
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
    /* In the record step the record's own chip already names it; a second chip
       saying the same thing is the field spending width on a repetition. */
    if (record === null && shown !== null && shown.length > 0 && source !== null) {
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
  }, [ascend, language, picked, record, seed, seedRecords, t, targets])

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

  /* F7 — the prefix as a removable chip. Removing it keeps what was typed
     after it, because the operator narrowed a query, not started one. */
  const scope = useMemo(() => {
    const found = PREFIX_MODES.find((entry) => entry.mode === mode)
    if (found === undefined) return null
    return { label: t(found.labelKey), onRemove: () => setMode(null) }
  }, [mode, t])

  const count = blocks.reduce((total, block) => total + block.rows.length, 0)

  const retry =
    step === 'record' ? recordTarget.refetch : step === 'target' ? candidates.refetch : results.refetch

  return {
    step,
    chips,
    query,
    setQuery: changeQuery,
    placeholder,
    busy,
    blocks,
    listStatus,
    retry,
    confirm,
    handleKeyDown,
    count,
    scope,
  }
}
