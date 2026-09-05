/**
 * Support › Contact Centre, the three-pane inbox (design 12; plan §2, §4).
 * A full-height grid under the top bar: list, thread + composer, context.
 * The route carries the selection, `?view=` the folder, `?q=` the search
 * (D16 class 1). Opening marks read and never claims (AC-200, AC-CC-07).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  claimConversation,
  closeConversation,
  conversationAssignee,
  getConversation,
  getTicket,
  listConversations,
  markConversationRead,
  releaseConversation,
  reopenConversation,
  snoozeConversation,
  subscribeToConversationQueue,
  transferConversation,
} from '@/data/clients'
import type {
  Conversation,
  ConversationChannel,
  ConversationCloseReason,
  ConversationParticipant,
  IsoDateTime,
  Paginated,
  SubTabRoute,
  Ticket,
} from '@/data/types'
import { isBuiltInRole } from '@/data/types'
import { formatCount, readWideBreakpointPx } from '@/lib'
import { defaultUiStore } from '@/lib/persistence'
import { useAsync, useAutoAway, useCompactShell, useDebouncedValue, usePresence } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { SearchIcon } from '@/components/icons'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { useNowIso, useRowActions } from '@/screens/queues'
import { LogCallModal } from '@/screens/support/tickets/LogCallModal'
import { NewTicketModal, type TicketRequester } from '@/screens/support/tickets/NewTicketModal'
import { cn } from '@/lib/utils'
import { conversationSla } from '../conversations/sla'
import { CHANNEL_KEY, CLOSE_REASONS, CLOSE_REASON_KEY } from '../conversations/vocabulary'
import { Composer, type ComposerHandle } from './Composer'
import { ContextRail, RailToggle } from './ContextRail'
import { ConversationList } from './ConversationList'
import { FolderNav, type Folder } from './FolderNav'
import { Thread } from './Thread'
import { ThreadHeader, type HeaderAction } from './ThreadHeader'
import { compareInboxRows, decorateRow } from './order'
import { useThread } from './useThread'

/** D19's six views, in D19's order. The route table declares none. */
const VIEWS = ['unassigned', 'mine', 'waiting', 'active', 'snoozed', 'closed'] as const
type View = (typeof VIEWS)[number]
const DEFAULT_VIEW: View = 'unassigned'

const CLEARED_BODY: Readonly<Record<View, string>> = {
  unassigned: 'conversations.empty.cleared.unassigned',
  mine: 'conversations.empty.cleared.mine',
  waiting: 'conversations.empty.cleared.waiting',
  active: 'conversations.empty.cleared.active',
  snoozed: 'conversations.empty.cleared.snoozed',
  closed: 'conversations.empty.cleared.closed',
}

/** Wide enough for every row the seam serves; virtualised above 200 (Q-CC5). */
const LIST_PAGE = 200

interface RailSections {
  elsewhere: boolean
  history: boolean
}

/* D16 class 2: the rail's collapse and its two sections, per operator. */
const railStore = defaultUiStore<boolean>('ui.inboxRailCollapsed', (v): v is boolean => typeof v === 'boolean')
const foldersStore = defaultUiStore<boolean>('ui.inboxFoldersCollapsed', (v): v is boolean => typeof v === 'boolean')
const sectionsStore = defaultUiStore<RailSections>(
  'ui.inboxRailSections',
  (v): v is RailSections =>
    typeof v === 'object' && v !== null && typeof (v as RailSections).elsewhere === 'boolean' && typeof (v as RailSections).history === 'boolean',
)

function viewOf(raw: string | null): View {
  return (VIEWS as readonly string[]).includes(raw ?? '') ? (raw as View) : DEFAULT_VIEW
}

function isView(conversation: Conversation, view: View, currentUserId: string): boolean {
  const owner = conversationAssignee(conversation)
  switch (view) {
    case 'unassigned':
      return owner === null && conversation.status !== 'closed'
    case 'mine':
      return owner !== null && owner.id === currentUserId && conversation.status !== 'closed'
    default:
      return conversation.status === view
  }
}

function subscribeWide(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const list = window.matchMedia(`(min-width: ${readWideBreakpointPx()}px)`)
  if (typeof list.addEventListener === 'function') {
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }
  list.addListener(onChange)
  return () => list.removeListener(onChange)
}

function wideSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(`(min-width: ${readWideBreakpointPx()}px)`).matches
}

/** Above `--ev-bp-wide` the rail sits in the grid; below it, a Sheet (§2). */
function useWideViewport(): boolean {
  return useSyncExternalStore(subscribeWide, wideSnapshot, () => true)
}

function addressOn(participant: ConversationParticipant, channel: ConversationChannel): string | null {
  return participant.handles[channel] ?? null
}

function requesterOf(conversation: Conversation): TicketRequester | null {
  const type = conversation.entityType
  const entityType =
    type === 'rider' ? 'rider' : type === 'driver' ? 'driver' : type === 'corporate-account' ? 'corporate' : null
  if (entityType === null) return null
  return { entityId: conversation.entityId, entityName: conversation.entityName, entityType }
}

export function InboxScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const location = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { t, language, dir } = shell.language
  const now = useNowIso()
  const compact = useCompactShell()
  const wide = useWideViewport()

  const currentUserId = shell.session?.userId ?? ''
  const role = shell.session?.role ?? null
  const canWrite = shell.permissions.permissions.includes('contact_users') && !shell.isFrozen

  const view = viewOf(params.get('view'))
  const q = params.get('q') ?? ''
  const openId = useParams().conversationId ?? null

  /* ── the search field, debounced into `?q=` ────────────────────────── */
  const [search, setSearch] = useState(q)
  const debounced = useDebouncedValue(search)
  useEffect(() => {
    if (debounced === q) return
    const next = new URLSearchParams(params)
    if (debounced === '') next.delete('q')
    else next.set('q', debounced)
    setParams(next, { replace: true })
  }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps -- the field drives the URL, not the reverse.

  /* ── reads ─────────────────────────────────────────────────────────── */
  const [revision, setRevision] = useState(0)
  const bump = useCallback(() => setRevision((n) => n + 1), [])

  const list = useAsync<Paginated<Conversation>>(
    (signal) => listConversations({ view, q: q === '' ? undefined : q, pageSize: LIST_PAGE }, signal),
    { deps: [view, q, revision] },
  )
  const corpus = useAsync<Paginated<Conversation>>(
    (signal) => listConversations({ pageSize: LIST_PAGE }, signal),
    { deps: ['corpus', revision] },
  )
  const open = useAsync<Conversation>((signal) => getConversation(openId as string, signal), {
    deps: [openId, revision],
    enabled: openId !== null,
  })

  /* AC-CC-07: the queue topic keeps every row current without a refetch. */
  const [overlay, setOverlay] = useState<ReadonlyMap<string, Conversation>>(() => new Map())
  useEffect(
    () =>
      subscribeToConversationQueue((event) => {
        if (event.type === 'conversation.updated') {
          setOverlay((current) => new Map(current).set(event.conversationId, event.conversation))
        }
      }),
    [],
  )
  const actions = useRowActions<Conversation>({ t })
  const fresh = useCallback(
    (rows: readonly Conversation[]) => actions.rows(rows).map((each) => overlay.get(each.id) ?? each),
    [actions, overlay],
  )

  const rows = useMemo(
    () => fresh(list.data?.items ?? []).map((conversation) => decorateRow(conversation, now)).sort(compareInboxRows),
    [fresh, list.data, now],
  )
  const corpusRows = useMemo(() => fresh(corpus.data?.items ?? []), [fresh, corpus.data])
  const record = useMemo(() => {
    if (openId === null) return null
    const loaded = open.data === null ? null : fresh([open.data])[0] ?? null
    return loaded ?? overlay.get(openId) ?? null
  }, [openId, open.data, fresh, overlay])

  const folders: Folder[] = useMemo(
    () =>
      VIEWS.map((id) => ({
        id,
        titleKey: `view.conversations.${id}`,
        count: corpus.status === 'loading' ? null : corpusRows.filter((each) => isView(each, id, currentUserId)).length,
      })),
    [corpus.status, corpusRows, currentUserId],
  )

  /* ── presence, for the cap and the transfer targets ─────────────────── */
  const presence = usePresence({
    currentUserId,
    role: role !== null && isBuiltInRole(role) ? role : null,
    revision,
  })
  useAutoAway(presence.myState, () => presence.setState('away'))

  /* ── preferences ───────────────────────────────────────────────────── */
  const [railCollapsed, setRailCollapsed] = useState(() => railStore.read() ?? false)
  const [foldersCollapsed, setFoldersCollapsed] = useState(() => foldersStore.read() ?? false)
  const [sections, setSections] = useState<RailSections>(() => sectionsStore.read() ?? { elsewhere: true, history: true })
  const [railSheet, setRailSheet] = useState(false)
  const toggleRail = () => {
    if (!wide || compact) {
      setRailSheet((current) => !current)
      return
    }
    setRailCollapsed((current) => {
      railStore.write(!current)
      return !current
    })
  }
  const toggleFolders = () =>
    setFoldersCollapsed((current) => {
      foldersStore.write(!current)
      return !current
    })
  const toggleSection = (section: keyof RailSections) =>
    setSections((current) => {
      const next = { ...current, [section]: !current[section] }
      sectionsStore.write(next)
      return next
    })

  /* ── selection and read state ──────────────────────────────────────── */
  const hrefFor = useCallback((id: string) => `${row.path}/${id}${location.search}`, [row.path, location.search])
  const viewHref = (next: string) => {
    const search = new URLSearchParams(location.search)
    search.set('view', next)
    return `${location.pathname}?${search.toString()}`
  }

  const marking = useRef(false)
  const markRead = useCallback(() => {
    if (record === null || record.unreadCount === 0 || marking.current) return
    marking.current = true
    void markConversationRead(record.id)
      .catch(() => undefined)
      .finally(() => {
        marking.current = false
      })
  }, [record])
  useEffect(() => markRead(), [markRead])

  /* ── checked rows (tier 2 bulk claim) ──────────────────────────────── */
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set())
  useEffect(() => setChecked(new Set()), [view])
  const setRowChecked = (id: string, next: boolean) =>
    setChecked((current) => {
      const copy = new Set(current)
      if (next) copy.add(id)
      else copy.delete(id)
      return copy
    })

  /* ── mutations ─────────────────────────────────────────────────────── */
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [ticketFor, setTicketFor] = useState<Conversation | null>(null)
  const [callFor, setCallFor] = useState<{ conversation: Conversation; ticket: Ticket } | null>(null)

  const run = useCallback(
    (id: string, errorKey: string, toastKey: string, action: () => Promise<Conversation>) => {
      void actions.run({ id, errorKey, toastKey, action }).then((ok) => {
        if (ok) {
          bump()
          void corpus.refetch()
        }
      })
    },
    [actions, bump, corpus],
  )

  function claim(conversation: Conversation, takeOver: boolean) {
    run(conversation.id, 'conversations.error.row.claim', takeOver ? 'queue.toast.takenOver' : 'queue.toast.claimed', () =>
      claimConversation(conversation.id, { takeOver }),
    )
    setConfirm(null)
  }

  function askTakeOver(conversation: Conversation) {
    const owner = conversationAssignee(conversation)?.name ?? ''
    setConfirm({
      title: t('queue.takeOver.title', { name: owner }),
      body: t('queue.takeOver.body', { name: owner }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () => claim(conversation, true),
    })
  }

  function askTransfer(conversation: Conversation) {
    setConfirm({
      title: t('conversations.transfer.title'),
      body: t('conversations.transfer.body'),
      confirmLabel: t('conversations.transfer.confirm'),
      reason: {
        label: t('conversations.transfer.noteLabel'),
        help: t('conversations.transfer.noteHelp'),
        message: t('conversations.transfer.noteMessage'),
      },
      choice: {
        label: t('conversations.transfer.choiceLabel'),
        help: t('conversations.transfer.choiceHelp'),
        message: t('conversations.transfer.choiceMessage'),
        placeholder: t('conversations.transfer.choicePlaceholder'),
        emptyMessage: t('conversations.transfer.choiceEmpty'),
        options: [...presence.transferTargets]
          .sort((a, b) => (a.state === b.state ? 0 : a.state === 'online' ? -1 : 1))
          .map((agent) => ({
            value: agent.userId,
            label: agent.userName,
            hint: agent.state === 'away' ? t('conversations.transfer.away') : t('conversations.transfer.online'),
          })),
      },
      onConfirm: ({ reason, choice }) => {
        /* AC-942: the target signed out while the dialog was up. */
        if (presence.presenceOf(choice) === 'offline') {
          const name = presence.roster.find((agent) => agent.userId === choice)?.userName ?? choice
          setConfirm(null)
          toast(t('conversations.transfer.refused.offline', { name }))
          return
        }
        setConfirm(null)
        run(conversation.id, 'conversations.error.row.transfer', 'conversations.toast.transferred', () =>
          transferConversation(conversation.id, choice, { note: reason }),
        )
      },
    })
  }

  function snoozeUntil(choice: string): IsoDateTime {
    const base = Date.parse(now)
    if (choice === '30m') return new Date(base + 30 * 60_000).toISOString()
    if (choice === '2h') return new Date(base + 2 * 60 * 60_000).toISOString()
    const tomorrow = new Date(base + 24 * 60 * 60_000)
    return `${tomorrow.toISOString().slice(0, 10)}T09:00:00${now.slice(-6)}`
  }

  function askSnooze(conversation: Conversation) {
    setConfirm({
      title: t('conversations.snooze.title'),
      body: t('conversations.snooze.body'),
      confirmLabel: t('conversations.snooze.confirm'),
      choice: {
        label: t('conversations.snooze.choiceLabel'),
        help: t('conversations.snooze.choiceHelp'),
        message: t('conversations.snooze.choiceMessage'),
        placeholder: t('conversations.snooze.choicePlaceholder'),
        emptyMessage: t('conversations.snooze.choiceEmpty'),
        options: ['30m', '2h', 'tomorrow'].map((value) => ({ value, label: t(`conversations.snooze.option.${value}`) })),
      },
      onConfirm: ({ choice }) => {
        setConfirm(null)
        run(conversation.id, 'conversations.error.row.snooze', 'conversations.toast.snoozed', () =>
          snoozeConversation(conversation.id, snoozeUntil(choice)),
        )
      },
    })
  }

  function askClose(conversation: Conversation) {
    setConfirm({
      title: t('conversations.close.title'),
      body: t('conversations.close.body'),
      confirmLabel: t('conversations.close.confirm'),
      choice: {
        label: t('conversations.close.choiceLabel'),
        help: t('conversations.close.choiceHelp'),
        message: t('conversations.close.choiceMessage'),
        placeholder: t('conversations.close.choicePlaceholder'),
        emptyMessage: t('conversations.close.choiceEmpty'),
        options: CLOSE_REASONS.map((reason) => ({ value: reason, label: t(CLOSE_REASON_KEY[reason]) })),
      },
      onConfirm: ({ choice }) => {
        setConfirm(null)
        run(conversation.id, 'conversations.error.row.close', 'conversations.toast.closed', () =>
          closeConversation(conversation.id, choice as ConversationCloseReason),
        )
      },
    })
  }

  function askLogCall(conversation: Conversation) {
    if (conversation.ticketId === null) return
    void getTicket(conversation.ticketId).then((ticket) => setCallFor({ conversation, ticket }))
  }

  function reopen(conversation: Conversation) {
    run(conversation.id, 'conversations.error.row.reopen', 'conversations.toast.reopened', () =>
      reopenConversation(conversation.id),
    )
  }

  function release(conversation: Conversation) {
    run(conversation.id, 'conversations.error.row.release', 'queue.toast.released', () =>
      releaseConversation(conversation.id),
    )
  }

  async function claimChecked() {
    const ids = [...checked]
    setChecked(new Set())
    for (const id of ids) {
      const found = rows.find((each) => each.conversation.id === id)?.conversation
      if (found && conversationAssignee(found) === null) claim(found, false)
    }
  }

  /* ── the thread ────────────────────────────────────────────────────── */
  const thread = useThread(record, currentUserId)
  const composer = useRef<ComposerHandle | null>(null)
  const root = useRef<HTMLDivElement | null>(null)
  const focusComposerOnOpen = useRef(false)

  const owner = record === null ? null : conversationAssignee(record)
  const heldByMe = owner !== null && owner.id === currentUserId
  const sla = record === null ? null : conversationSla(record)
  const writeRefusal = canWrite
    ? null
    : t('conversations.composer.noPermission', { permission: t('conversations.composer.permission') })
  const capBlocked = record !== null && presence.atCap && record.channel === 'chat' && !heldByMe
  const capReason = capBlocked ? t('conversations.cap.reached', { count: formatCount(presence.cap, language) }) : null
  const grabRefusal = writeRefusal ?? capReason

  const customer = record?.participants.find((party) => party.kind === 'customer') ?? null
  const customerEmail = customer === null ? null : addressOn(customer, 'email')
  const composerRefusal: string | null =
    record === null
      ? null
      : writeRefusal !== null
        ? writeRefusal
        : thread.status === 'error'
          ? t('conversations.composer.threadError')
          : record.status === 'closed'
            ? t('conversations.composer.closed')
            : !heldByMe
              ? owner !== null
                ? t('conversations.composer.heldBy', { name: owner.name })
                : t('conversations.composer.unclaimed')
              : record.channel === 'phone'
                ? t('conversations.composer.phone')
                : customer !== null && addressOn(customer, record.channel) === null
                  ? t('conversations.composer.noHandle')
                  : null

  /* §8.6.8, one sentence per screen: the closed sentence is the composer's, and a
     refused `Create ticket` points at it rather than printing it again (D-1). */
  const composerReasonId = record === null ? '' : `inbox-composer-reason-${record.id}`
  const headerReasonId = record === null ? '' : `inbox-header-reason-${record.id}`
  const closedByComposer = record !== null && record.status === 'closed' && writeRefusal === null
  const createTicketRefusal: string | null =
    record === null
      ? null
      : writeRefusal ??
        (requesterOf(record) === null
          ? t('conversations.ticket.create.unavailable')
          : record.ticketId !== null
            ? t('conversations.ticket.linked', { id: record.ticketId })
            : record.status === 'closed'
              ? t('conversations.composer.closed')
              : null)
  const createTicketReasonId = closedByComposer && createTicketRefusal === composerRefusal ? composerReasonId : headerReasonId

  /* §4.1's table: which controls are visible, which overflow, which is filled. */
  const header = useMemo(() => {
    if (record === null || sla === null) return { visible: [] as HeaderAction[], overflow: [] as HeaderAction[], filledFirst: false }
    const action = (id: string, label: string, onClick: () => void, refusal: string | null): HeaderAction => ({
      id,
      label,
      onClick,
      refusal,
    })
    const transfer = action('transfer', t('conversations.transfer'), () => askTransfer(record), writeRefusal)
    const snooze = action(
      'snooze',
      t('conversations.snooze'),
      () => askSnooze(record),
      writeRefusal ?? (record.status === 'snoozed' ? t('conversations.snooze.blocked') : null),
    )
    const close = action('close', t('conversations.close'), () => askClose(record), writeRefusal)
    const createTicket: HeaderAction =
      createTicketReasonId === composerReasonId
        ? { ...action('ticket', t('conversations.ticket.create'), () => setTicketFor(record), null), disabledBy: composerReasonId }
        : action('ticket', t('conversations.ticket.create'), () => setTicketFor(record), createTicketRefusal)
    const logCall = action(
      'log-call',
      t('conversations.logCall'),
      () => askLogCall(record),
      writeRefusal ?? (record.ticketId === null ? t('conversations.logCall.blocked.noTicket') : null),
    )
    const phone = record.channel === 'phone' ? [logCall] : []

    /* §4.1's table as restated under D8-b: a `⋯` only at three or more. */
    if (record.status === 'closed') {
      return {
        visible: [action('reopen', t('conversations.reopen'), () => reopen(record), writeRefusal), createTicket],
        overflow: [],
        filledFirst: true,
      }
    }
    if (record.status === 'snoozed') {
      /* §10 row 12: Close is reachable after wake; three ghosts left no room for the name. */
      return { visible: [transfer, createTicket], overflow: [], filledFirst: false }
    }
    if (!heldByMe) {
      const takeOver = owner !== null
      return {
        visible: [
          action(
            'claim',
            t(takeOver ? 'queue.takeOver' : 'queue.claim'),
            () => (takeOver ? askTakeOver(record) : claim(record, false)),
            grabRefusal,
          ),
        ],
        overflow: [transfer, snooze, createTicket, close],
        filledFirst: true,
      }
    }
    if (sla.resolutionBreached && record.ticketId === null) {
      return { visible: [createTicket], overflow: [transfer, snooze, ...phone, close], filledFirst: false }
    }
    return { visible: [transfer], overflow: [snooze, ...phone, createTicket, close], filledFirst: false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the askers close over `record`, which is in the list.
  }, [record, sla, heldByMe, owner, writeRefusal, grabRefusal, createTicketRefusal, createTicketReasonId, composerReasonId, t, presence.transferTargets])

  /* Enter on a row: select, then focus the composer (or the thread when refused). */
  useEffect(() => {
    if (!focusComposerOnOpen.current || record === null || thread.status === 'loading') return
    focusComposerOnOpen.current = false
    if (composerRefusal === null && record.channel !== 'whatsapp') composer.current?.focus()
    else root.current?.querySelector<HTMLElement>('[data-inbox-thread]')?.focus()
  }, [record, thread.status, composerRefusal])

  /* ── keyboard (§7) ─────────────────────────────────────────────────── */
  function rowsInDom(): HTMLElement[] {
    return [...(root.current?.querySelectorAll<HTMLElement>('[data-inbox-row]') ?? [])]
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const key = event.key
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key.toLowerCase() === 'n') {
      event.preventDefault()
      composer.current?.toggleRegister()
      return
    }
    const editable = target.closest('input, textarea, [contenteditable="true"]') !== null
    if (editable) {
      if (key === 'Escape' && target.tagName === 'TEXTAREA') {
        event.preventDefault()
        rowsInDom().find((each) => each.getAttribute('aria-current') === 'page')?.focus()
      }
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const list = rowsInDom()
    const focusedIndex = list.findIndex((each) => each === target)
    if (key === 'j' || key === 'k') {
      event.preventDefault()
      const from = focusedIndex >= 0 ? focusedIndex : list.findIndex((each) => each.getAttribute('aria-current') === 'page')
      const next = key === 'j' ? Math.min(list.length - 1, from + 1) : Math.max(0, from - 1)
      list[next]?.focus()
      return
    }
    if (key === 'Enter' && focusedIndex >= 0) {
      focusComposerOnOpen.current = true
      return
    }
    if (key === 'Escape' && target.closest('[data-inbox-pane="list"]') !== null) {
      if (checked.size > 0) setChecked(new Set())
      return
    }
    if (key === 'c' && record !== null && !heldByMe && record.status !== 'closed' && grabRefusal === null) {
      event.preventDefault()
      if (owner !== null) askTakeOver(record)
      else claim(record, false)
      return
    }
    if (key === 'r' && record !== null) {
      event.preventDefault()
      composer.current?.focus(record.channel === 'phone' ? 'internal' : 'customer')
      return
    }
    if (key === 'x' && focusedIndex >= 0) {
      event.preventDefault()
      const id = target.getAttribute('data-id')
      if (id !== null) setRowChecked(id, !checked.has(id))
    }
  }

  /* ── panes ─────────────────────────────────────────────────────────── */
  const listStatus = list.status === 'loading' ? 'loading' : list.status === 'error' ? 'error' : 'content'
  const firstRun = corpus.status === 'empty'
  const profileHref = (entityId: string) => `${location.pathname}${withOverlay(location.search, 'entity', entityId)}`
  const ticketHref = (ticketId: string) => `/support/tickets/${ticketId}`

  const paneA = (
    <section
      data-inbox-pane="list"
      aria-label={t('inbox.list.label')}
      className={cn('flex min-h-0 flex-col', !compact && 'border-e border-border')}
    >
      {/* §10 row 2: eight rows at 800px with the folders open needs the list's top at 320. */}
      <div className="relative px-3 pt-2">
        <SearchIcon className="pointer-events-none absolute top-1/2 start-5.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          aria-label={t('inbox.search')}
          placeholder={t('inbox.search')}
          className="ps-8"
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <FolderNav
        folders={folders}
        active={view}
        hrefFor={viewHref}
        onSelect={(next) => navigate(viewHref(next))}
        collapsed={foldersCollapsed}
        onToggle={toggleFolders}
        compact={compact}
        t={t}
        language={language}
      />
      {checked.size > 0 && (
        <div className="flex items-center gap-2 border-y border-border bg-muted px-3 py-1 text-xs text-foreground">
          <span className="flex-1">
            <bdi>{t('table.selectedCount', { count: formatCount(checked.size, language) })}</bdi>
          </span>
          <Button variant="secondary" size="xs" disabled={!canWrite} onClick={() => void claimChecked()}>
            {t('queue.claim')}
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setChecked(new Set())}>
            {t('inbox.bulk.clear')}
          </Button>
        </div>
      )}
      <div className="border-t border-border" />
      <ConversationList
        status={listStatus}
        rows={rows}
        emptyBody={q !== '' ? t('conversations.empty.noMatch') : t(CLEARED_BODY[view])}
        onClearSearch={q !== '' ? () => setSearch('') : null}
        onRetry={list.refetch}
        selectedId={openId}
        hrefFor={hrefFor}
        checked={checked}
        onCheckedChange={setRowChecked}
        currentUserId={currentUserId}
        now={now}
        t={t}
        language={language}
      />
    </section>
  )

  const railProps =
    record === null
      ? null
      : {
          conversation: record,
          now,
          t,
          language,
          dir,
          currentUserId,
          profileHref: profileHref(record.entityId),
          ticketHref,
          onCreateTicket: () => setTicketFor(record),
          createTicketRefusal,
          reasonId: createTicketReasonId,
          canWrite: canWrite && !capBlocked,
          claimRefusal: capReason ?? t('queue.action.noPermission'),
          onClaim: () => claim(record, false),
          onRelease: () => release(record),
          onTakeOver: () => askTakeOver(record),
          sections,
          onToggleSection: toggleSection,
        }

  const rail =
    openId === null ? null : railProps === null ? (
      <ContextRail
        conversation={null}
        now={now}
        t={t}
        language={language}
        dir={dir}
        currentUserId={currentUserId}
        profileHref=""
        ticketHref={ticketHref}
        onCreateTicket={() => undefined}
        createTicketRefusal={null}
        reasonId=""
        canWrite={false}
        claimRefusal=""
        onClaim={() => undefined}
        onRelease={() => undefined}
        onTakeOver={() => undefined}
        sections={sections}
        onToggleSection={toggleSection}
      />
    ) : (
      <ContextRail {...railProps} />
    )

  const paneB = (
    <section data-inbox-pane="thread" className="flex min-h-0 min-w-0 flex-col">
      {openId === null ? (
        firstRun ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              kind="first-run"
              heading={t('conversations.empty.firstRun.heading')}
              body={t('conversations.empty.firstRun.body')}
              actions={[{ label: t('conversations.empty.firstRun.action'), onClick: () => navigate(viewHref('closed')) }]}
            />
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {t('inbox.thread.noSelection')}
          </p>
        )
      ) : record === null ? (
        open.status === 'error' ? (
          <div className="p-4">
            <Thread
              status="error"
              messages={[]}
              hasEarlier={false}
              onLoadEarlier={() => undefined}
              onRetry={open.refetch}
              onReachBottom={() => undefined}
              conversationChannel="chat"
              currentUserId={currentUserId}
              customerName=""
              typingBy={null}
              now={now}
              t={t}
              language={language}
              profileHref=""
              onSendAgain={() => undefined}
            />
          </div>
        ) : (
          <Thread
            key={openId}
            status="loading"
            messages={[]}
            hasEarlier={false}
            onLoadEarlier={() => undefined}
            onRetry={() => undefined}
            onReachBottom={() => undefined}
            conversationChannel="chat"
            currentUserId={currentUserId}
            customerName=""
            typingBy={null}
            now={now}
            t={t}
            language={language}
            profileHref=""
            onSendAgain={() => undefined}
          />
        )
      ) : (
        <>
          <ThreadHeader
            conversation={record}
            now={now}
            t={t}
            language={language}
            dir={dir}
            profileHref={profileHref(record.entityId)}
            visible={header.visible}
            overflow={header.overflow}
            filledFirst={header.filledFirst}
            onBack={compact ? () => navigate(`${row.path}${location.search}`) : null}
            onDetails={compact ? () => setRailSheet(true) : null}
          />
          <div data-inbox-thread tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
            <Thread
              key={record.id}
              status={thread.status}
              messages={thread.messages}
              hasEarlier={thread.hasEarlier}
              onLoadEarlier={thread.loadEarlier}
              onRetry={thread.refetch}
              onReachBottom={markRead}
              conversationChannel={record.channel}
              currentUserId={currentUserId}
              customerName={record.entityName}
              typingBy={thread.typingBy}
              now={now}
              t={t}
              language={language}
              profileHref={profileHref(record.entityId)}
              onSendAgain={thread.restore}
            />
          </div>
          <div className={cn(compact && 'sticky bottom-0 bg-background')}>
            <Composer
              ref={composer}
              reasonId={composerReasonId}
              conversationId={record.id}
              channel={record.channel}
              customerName={record.entityName}
              channelLabel={t(CHANNEL_KEY[record.channel])}
              t={t}
              refusal={composerRefusal}
              quietlyDisabled={thread.status === 'loading'}
              noteOnly={record.channel === 'phone'}
              emailSwitch={
                record.channel === 'chat'
                  ? { address: customerEmail, refusal: customerEmail === null ? t('conversations.composer.noHandle') : null }
                  : null
              }
              restored={thread.restored}
              templateSurface={record.channel === 'email' ? 'email' : record.channel === 'phone' ? null : 'chat'}
              onSend={thread.send}
              onRetry={thread.retry}
            />
          </div>
        </>
      )}
    </section>
  )

  const railInGrid = wide && !compact
  const paneC =
    openId === null ? (
      <div className={cn('min-h-0', railInGrid && 'border-s border-border')} />
    ) : railInGrid && !railCollapsed ? (
      <aside aria-label={t('inbox.header.details')} className="flex min-h-0 flex-col overflow-y-auto border-s border-border">
        <div className="flex justify-end px-2 pt-2">
          <RailToggle collapsed={false} onToggle={toggleRail} dir={dir} t={t} />
        </div>
        {rail}
      </aside>
    ) : (
      <div className="flex min-h-0 flex-col items-center border-s border-border pt-2">
        <RailToggle collapsed onToggle={toggleRail} dir={dir} t={t} />
      </div>
    )

  return (
    <div
      ref={root}
      onKeyDown={onKeyDown}
      className={cn(
        'grid h-full min-h-0 overflow-hidden bg-background',
        compact ? 'grid-cols-1' : railInGrid && !railCollapsed ? 'grid-cols-inbox' : 'grid-cols-inbox-collapsed',
      )}
    >
      {compact ? (openId === null ? paneA : paneB) : paneA}
      {!compact && paneB}
      {!compact && paneC}

      {/* Below `wide:` the rail is a Sheet without a scrim (§5.5). */}
      <Sheet open={railSheet && openId !== null} onOpenChange={setRailSheet}>
        <SheetContent side="inline-end" className={cn('overflow-y-auto p-0', compact ? 'w-full' : 'w-inbox-rail')}>
          <SheetHeader className="p-3 pb-0">
            <SheetTitle>{t('inbox.header.details')}</SheetTitle>
          </SheetHeader>
          {rail}
        </SheetContent>
      </Sheet>

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={actions.busy} t={t} />
      {callFor !== null && (
        <LogCallModal
          ticket={callFor.ticket}
          open
          onClose={() => setCallFor(null)}
          onLogged={() => {
            const id = callFor.conversation.id
            setCallFor(null)
            run(id, 'conversations.error.row.reopen', 'conversations.toast.callLogged', () => getConversation(id))
          }}
          actorId={currentUserId}
          actorName={shell.session?.name ?? ''}
          t={t}
        />
      )}
      <NewTicketModal
        open={ticketFor !== null}
        onClose={() => setTicketFor(null)}
        onCreated={(ticket) => {
          const linked = ticketFor
          setTicketFor(null)
          toast.success(t('conversations.toast.ticketCreated', { id: ticket.id }))
          if (linked !== null) {
            void actions.run({ id: linked.id, errorKey: 'conversations.thread.error', action: () => getConversation(linked.id) })
          }
          bump()
          void corpus.refetch()
        }}
        t={t}
        language={language}
        locked={
          ticketFor === null || requesterOf(ticketFor) === null
            ? null
            : { requester: requesterOf(ticketFor)!, channel: ticketFor.channel, conversationId: ticketFor.id }
        }
      />
    </div>
  )
}
