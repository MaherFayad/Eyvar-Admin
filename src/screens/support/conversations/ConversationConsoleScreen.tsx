/**
 * **Support › Contact Centre — the conversation console.** `DECISIONS.md`
 * **D19** (the ruling) and **D22** (the SLA and the cap). Pattern **P8**, the
 * §8.4 work queue, plus a drawer for the thread.
 *
 * ## What this replaces, and why none of it survived
 *
 * `ContactCentreScreen.tsx` was 302 lines with **no `useAsync`, no client and
 * none of the four states**. All three of its cards read module constants —
 * `INITIAL_AGENTS` (`:32`), `CPT_METRICS` (`:62`) and a `useState` literal for
 * the call log (`:105`) — so nothing on the page could load, fail, be empty, or
 * be counted. `CallConsoleModal` defaulted its caller to the string
 * `'Sara Al-Otaibi (+966 54 111 2233)'` and `handleCallComplete` (`:128`) pushed
 * a row into component state and toasted.
 *
 * D19 is explicit about the first two:
 *
 * > `ContactCentreScreen`'s `INITIAL_AGENTS` and `CPT_METRICS` are
 * > **superseded** by `AgentPresence` over `clients/realtime.ts`.
 *
 * Both are gone, and so is the fake call log: **`phone` conversations are real
 * rows** (`CNV-106`) served by `clients/conversations.ts`, so the console's call
 * history is now countable, filterable and shared with every other operator
 * instead of living for the lifetime of one component. `CallConsoleModal` is
 * deleted with it — D19 rules `phone` **read-only in v1**, and a modal whose
 * only act was writing to local state had nothing left to do. Call *logging*
 * already has a real home and a real client operation: `logTicketCall` on
 * Support › Tickets.
 *
 * ## A chat queue is a queue
 *
 * P5-T4's own words, and `types/conversation.ts` was built for it —
 * `Conversation extends WorkQueueRow`, so it arrives with `claim` and the whole
 * `SlaTracked` block. Nothing about ownership is re-invented here:
 * `screens/queues/` supplies the owner chip, the take-over confirmation, the
 * countdown pill, the breach banner, the R5a row marker, the disposition runner
 * and the four empty/error states, and all of it is already tested against the
 * five wave-2 sub-tabs.
 *
 * | Act | Confirms? | Reversible? | Where it comes from |
 * |---|---|---|---|
 * | **Grab** (`claim`) | **No** | **Yes — `release`** | `OwnerChip`, unchanged. **D18** buys a reversible act out of the dialog |
 * | **Release** | No | Yes | `OwnerChip`, unchanged. The waiting clock does **not** reset (**AC-939**) |
 * | **Take-over** | **Yes** | No | `queue.takeOver.*`, the shared confirmation naming the holder (**AC-940**) |
 * | **Transfer** | **Yes** | **No** | `ConfirmDialog` with a `choice` — the one act here that is not shared |
 *
 * ## What is NOT built, and is not built on purpose
 *
 * **The composer.** D19's **FINDING F-R5-1**: `DESIGN.md` §6.4 has no row for a
 * message composer that *sends*, and `patterns.md`'s own rule is that a page
 * with no row there may not be designed until it gets one. So `replyConversation`,
 * `sendTypingIndicator`, `Reply by email`, canned responses and `Send again` are
 * all absent, and `ConversationThread` states the absence in place (§11.2)
 * rather than leaving a blank region. **AC-943**, **AC-944**'s compose half and
 * **AC-945**'s retry half are blocked on that §6.4 row.
 *
 * **Routing.** D19: *"The queue is PULL. Nothing is auto-assigned in v1."*
 * P5-T6 keeps availability and the cap and loses its routing half.
 *
 * Rules applied
 *   §4.6 Q-32  a queue's default view is its **open work**. Here that is
 *              `unassigned` — D19: *"Default view Unassigned"*.
 *   §4.2 / AC-200
 *              **opening never claims.** The identity navigates to the 360°
 *              layer and does nothing else; `Claim` is a separate control in a
 *              separate cell, and `Open thread` is a third.
 *   §4.3 / AC-211
 *              **one countdown per row**, and the running one is chosen by
 *              `runningClock`, not by the cell.
 *   R5a        three carriers, none substituting for another: the page banner
 *              (count), the 3px leading edge (the row), the pill reading
 *              `overdue 4m` **in words**. The banner counts **first-response**
 *              breaches only — D22, **AC-964**.
 *   §11.2      every refusal is **disabled in place with its reason**: the cap
 *              names the number, a closed conversation says it is closed, and
 *              `Create ticket` says the operation does not exist yet.
 *   §9.4 / R10 exactly one page-level banner, and the breach scope is a
 *              dismissible **scope chip**, not a filter — see `QueueTableProps.scope`.
 *   §7.3       width budget: `104 + 112 + 136 + 96 + 176 = 624`, plus the
 *              identity's `minWidth: 176` = **800**, inside the Arabic budget of
 *              870 with the actions lane. `CNV-101`'s 44-character Arabic
 *              entity name is the row that has to survive it.
 */

import { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  claimConversation,
  closeConversation,
  conversationAssignee,
  getConversation,
  listConversations,
  releaseConversation,
  reopenConversation,
  transferConversation,
} from '@/data/clients'
import type {
  Conversation,
  ConversationCloseReason,
  IsoDateTime,
  Paginated,
  SubTabRoute,
  SubTabView,
} from '@/data/types'
import { CONVERSATION_CHANNELS, CONVERSATION_STATUSES } from '@/data/types'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { useAsync, useIndexTable } from '@/hooks'
import type { DataColumn } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { RowCriticalMarker, StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import {
  Absent,
  BreachBanner,
  Cell,
  DateCell,
  Identity,
  MutedCell,
  NumCell,
  OwnerChip,
  QueuePage,
  QueueTable,
  SlaCell,
  useNowIso,
  useQueueMeta,
  useQueueViews,
  useRowActions,
  type RowFailure,
} from '@/screens/queues'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { ConversationPane } from './ConversationPane'
import { PresenceBar } from './PresenceBar'
import { useAutoAway, usePresence, type PresenceModel } from './presence'
import { compareForQueue, conversationSla, runningClock, type ConversationSla } from './sla'
import { CHANNEL_KEY, CLOSE_REASONS, CLOSE_REASON_KEY, STATUS_KEY, STATUS_TONE } from './vocabulary'
import { withFallback } from '../../operations/localCopy'
import { CONVERSATIONS_EN } from './copy'

/**
 * **D19's six views, declared here because the route table declares none.**
 *
 * `routeTable.ts:696` gives `support-contact-centre` `views: []`, and D19 names
 * `Unassigned · Mine · Waiting · Active · Snoozed · Closed` — the same six ids
 * `clients/conversations.ts` already implements as `QueryShape.views`. That file
 * has a single owner, so the screen supplies the list to `useQueueViews` and the
 * divergence is reported rather than edited, exactly as `SafetyScreen` reports
 * its own missing `all` view.
 */
const CONVERSATION_VIEWS: SubTabView[] = [
  { id: 'unassigned', titleKey: 'view.conversations.unassigned', order: 1, isDefault: true },
  { id: 'mine', titleKey: 'view.conversations.mine', order: 2, isDefault: false },
  { id: 'waiting', titleKey: 'view.conversations.waiting', order: 3, isDefault: false },
  { id: 'active', titleKey: 'view.conversations.active', order: 4, isDefault: false },
  { id: 'snoozed', titleKey: 'view.conversations.snoozed', order: 5, isDefault: false },
  { id: 'closed', titleKey: 'view.conversations.closed', order: 6, isDefault: false },
]

/** **AC-936** — the console opens on Unassigned. §4.6 Q-32: a queue lands on its open work. */
const DEFAULT_VIEW = 'unassigned'

/** The queue's own order, before the operator picks another. D19: oldest waiting first. */
const DEFAULT_SORT = { field: 'waitingSince', dir: 'asc' } as const

const CLEARED_BODY: Readonly<Record<string, string>> = {
  unassigned: 'conversations.empty.cleared.unassigned',
  mine: 'conversations.empty.cleared.mine',
  waiting: 'conversations.empty.cleared.waiting',
  active: 'conversations.empty.cleared.active',
  snoozed: 'conversations.empty.cleared.snoozed',
  closed: 'conversations.empty.cleared.closed',
}

/** A row and its resolved promises, carried together so no cell re-derives. */
interface Decorated {
  conversation: Conversation
  sla: ConversationSla
}

export function ConversationConsoleScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const location = useLocation()
  const navigate = useNavigate()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, CONVERSATIONS_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language
  const now = useNowIso()

  const currentUserId = shell.session?.userId ?? ''
  const role = shell.session?.role ?? null
  /* Legacy's own gate for this page. **Q-84 is open** on the real key; this is
     the nearest one the permission fixture carries, and it is the one the
     screen this replaces already used. */
  const canWrite = shell.permissions.permissions.includes('contact_users')

  const { tabs, activeTab, selectTab } = useQueueViews(
    { ...row, views: CONVERSATION_VIEWS },
    DEFAULT_VIEW,
    t,
  )
  const { meta, onTotal } = useQueueMeta(t, language, 'conversations.meta')

  const table = useIndexTable<Conversation>({
    mode: 'queue',
    getRowId: (conversation) => conversation.id,
    initialView: activeTab,
    initialSort: DEFAULT_SORT,
  })

  const params = useMemo(() => ({ ...table.params, view: activeTab }), [table.params, activeTab])
  const data = useAsync<Paginated<Conversation>>((signal) => listConversations(params, signal), {
    /* `params` is the table query with the view tab merged in and is the whole
       argument, so each queue tab keys separately. */
    deps: [params],
    cacheKey: 'conversations.list',
  })

  /**
   * The whole corpus, once. It answers **two** questions that a page of rows
   * cannot, and it answers them from one request rather than two:
   *
   *   - **the breach count** for R5a's banner, which must be of the whole queue
   *     (a count of what is on screen understates the backlog the moment there
   *     are two pages, **AC-219**);
   *   - **E1 vs E3** (**AC-324**'s question on Safety): has this resource ever
   *     had a record? `isFiltered` cannot see the difference between a
   *     first-run zero and a cleared zero.
   *
   * `pageSize: 200` because the seam serves twelve rows and will serve
   * hundreds, not millions. When it stops being true the count moves behind a
   * `filters: [{ field: 'breached' }]` read — which is what every other queue
   * does today and what this one **cannot** do until D22's fixture work lands.
   * See `sla.ts`.
   */
  const corpus = useAsync<Paginated<Conversation>>(
    (signal) => listConversations({ pageSize: 200 }, signal),
    /* Constant query, restated in `deps` so the key names the request:
       `conversations.list::[]` would be claimed by any other unparameterised
       read of the same operation — `presence.ts` has one — and this envelope is
       the whole corpus, not a one-row count. */
    { deps: ['corpus', 200], cacheKey: 'conversations.list' },
  )

  /* Bumped after every mutation, so the presence counter and the roster re-read
     the moment a claim changes the number the cap is measured against. */
  const [revision, setRevision] = useState(0)
  const bump = useCallback(() => setRevision((n) => n + 1), [])

  const presence = usePresence({ currentUserId, role, revision })
  useAutoAway(presence.myState, () => presence.setState('away'))

  const actions = useRowActions<Conversation>({ t })
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  /**
   * **R5a's scope, and it is a SCOPE and not a filter** (§9.4). It cannot be a
   * `FilterSpec`: the breach it narrows to is derived from D22's channel policy
   * and the client's `breached` predicate reads stamps the fixtures do not
   * carry. A filter the server cannot evaluate would empty the page under a
   * banner reporting a non-zero count.
   */
  const [onlyBreached, setOnlyBreached] = useState(false)

  /* ── the rows, decorated, scoped and ordered ────────────────────────── */

  const decorated: readonly Decorated[] = useMemo(
    () =>
      actions
        .rows(data.data?.items ?? [])
        .map((conversation) => ({ conversation, sla: conversationSla(conversation) })),
    [actions, data.data, now],
  )

  /**
   * **D22's reordering clause, applied only while the queue is on its own
   * order.** The moment an operator picks a column to sort by, that is the
   * order they asked for and the screen does not override it — a sort control
   * that silently loses to a rule is a control the operator stops trusting.
   */
  const onDefaultSort =
    table.sort?.field === DEFAULT_SORT.field && table.sort?.dir === DEFAULT_SORT.dir

  const visible: readonly Decorated[] = useMemo(() => {
    const scoped = onlyBreached
      ? decorated.filter((entry) => entry.sla.firstResponseBreached)
      : decorated
    return onDefaultSort ? [...scoped].sort(compareForQueue) : scoped
  }, [decorated, onlyBreached, onDefaultSort])

  const rows = useMemo(() => visible.map((entry) => entry.conversation), [visible])
  const slaById = useMemo(
    () => new Map(visible.map((entry) => [entry.conversation.id, entry.sla])),
    [visible],
  )

  /**
   * **AC-964 — a resolution breach is counted nowhere.** This reads
   * `firstResponseBreached` and nothing else, and it excludes closed rows:
   * **Q-18**, *"a stopped clock is not a backlog."*
   */
  const breachedCount = useMemo(
    () =>
      (corpus.data?.items ?? []).filter(
        (conversation) =>
          conversation.status !== 'closed' &&
          conversationSla(conversation).firstResponseBreached,
      ).length,
    [corpus.data, now],
  )

  /* A scope that matches nothing is a `no-match`-shaped zero, not a cleared
     queue — so the empty copy names the scope rather than the view. */
  const status = data.status === 'content' && rows.length === 0 ? 'empty' : data.status
  const total = onlyBreached ? rows.length : (data.data?.total ?? 0)

  /* ── the open conversation (delta D-4) ──────────────────────────────── */

  /**
   * **`/support/contact-centre/:conversationId` — a real level-3 route.**
   *
   * The interim this replaces read `?conversation=<id>`, because the row
   * declared `detailRoutes: []` and `routes.tsx` has a single owner: a
   * file-ownership constraint was deciding a page shape. `CONVERSATION_DETAIL`
   * now exists, `detailScreenFor` dispatches on `detail.kind === 'conversation'`,
   * and the query-param fallback is **gone rather than kept** — two addresses
   * for one record is D16 class 1's own failure mode, and the one that would
   * have survived is the one nothing links to.
   *
   * §9.4 still governs what renders: *"a route may mount more than one mode
   * over its lifetime. It may never mount two at once."* This component is the
   * queue at `/support/contact-centre` and the pane at the detail path, and it
   * never draws both.
   *
   * **The search string travels in both directions**, so opening a conversation
   * from a filtered, sorted, scoped queue and pressing `Back` returns to exactly
   * that queue (**AC-10** — a level-3 route changes neither nav column nor the
   * view).
   */
  const openId = useParams().conversationId ?? null
  const openConversation = useAsync<Conversation>(
    (signal) => getConversation(openId as string, signal),
    /* The id is the fetcher's only argument; `revision` is the screen's own
       cache-buster, bumped after every claim, transfer and close, so a mutation
       moves this read to a fresh key rather than re-serving the pre-mutation
       record. Opening one conversation, pressing Back and opening it again
       inside the TTL costs nothing. */
    { deps: [openId, revision], cacheKey: 'conversations.get', enabled: openId !== null },
  )

  const openRecord = useCallback(
    (id: string | null) => {
      navigate({
        pathname: id === null ? row.path : `${row.path}/${id}`,
        /* Carried, not dropped. The queue's view, filters, sort and scope are
           the operator's question and returning to a reset queue after reading
           one conversation is how a shift loses its place. */
        search: location.search,
      })
    },
    [navigate, row.path, location.search],
  )

  /* ── the mutations ──────────────────────────────────────────────────── */

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

  /** **Grab.** One click, no dialog — it is reversible, and D18 buys it out. */
  function claim(conversation: Conversation, takeOver: boolean) {
    run(
      conversation.id,
      'conversations.error.row.claim',
      takeOver ? 'queue.toast.takenOver' : 'queue.toast.claimed',
      () => claimConversation(conversation.id, { takeOver }),
    )
    setConfirm(null)
  }

  /** **AC-940** — take-over confirms and the dialog **names the holder**. */
  function askTakeOver(conversation: Conversation) {
    const owner = conversationAssignee(conversation)?.name ?? ''
    setConfirm({
      title: t('queue.takeOver.title', { name: owner }),
      body: t('queue.takeOver.body', { name: owner }),
      confirmLabel: t('queue.takeOver.confirm'),
      onConfirm: () => claim(conversation, true),
    })
  }

  /**
   * **AC-941 — transfer confirms, posts a system note naming both operators,
   * and offers no undo.**
   *
   * The note is the client's: `transferConversation(id, toUserId, { note })`
   * appends it as an **internal** message, so the receiving operator's context
   * is in the thread rather than in a handover conversation somewhere else. The
   * note is required here rather than optional, because a transfer with no
   * context is the thing the system message exists to prevent.
   *
   * **AC-942** — `offline` operators are not in the option list at all, and the
   * confirm handler refuses one anyway. The client checks presence nowhere; it
   * validates only that the id is an operator. Reported.
   */
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
        /* **D19** — `online` first, `away` behind its own stated state
           (*"away is lunch, not gone"*), `offline` absent. The disclosure D19
           describes is not built: `ConfirmDialog` is shared by five other
           queues and this screen does not grow it for one caller. The state is
           carried as the option's `hint` instead, so the choice is informed. */
        options: [...presence.transferTargets]
          .sort((a, b) => (a.state === b.state ? 0 : a.state === 'online' ? -1 : 1))
          .map((agent) => ({
            value: agent.userId,
            label: agent.userName,
            hint:
              agent.state === 'away'
                ? t('conversations.transfer.away')
                : t('conversations.transfer.online'),
          })),
      },
      onConfirm: ({ reason, choice }) => {
        /* The option list is built from `online ∪ away` and is captured when
           the dialog opens. This guard covers the race — the target signed out
           while the dialog was up — and it is the ONLY path by which an
           `offline` operator can be chosen, because the client validates that
           `toUserId` is an operator and never that they are reachable.
           Reported to mock-data-engineer; **AC-942** is enforced here today. */
        const state = presence.presenceOf(choice)
        if (state === 'offline') {
          const name =
            presence.roster.find((agent) => agent.userId === choice)?.userName ?? choice
          setConfirm(null)
          toast(t('conversations.transfer.refused.offline', { name }))
          return
        }
        setConfirm(null)
        run(
          conversation.id,
          'conversations.error.row.transfer',
          'conversations.toast.transferred',
          () => transferConversation(conversation.id, choice, { note: reason }),
        )
      },
    })
  }

  /** The disposition. Four reasons, from the type's closed set. */
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
        options: CLOSE_REASONS.map((reason) => ({
          value: reason,
          label: t(CLOSE_REASON_KEY[reason]),
        })),
      },
      onConfirm: ({ choice }) => {
        setConfirm(null)
        run(conversation.id, 'conversations.error.row.close', 'conversations.toast.closed', () =>
          closeConversation(conversation.id, choice as ConversationCloseReason),
        )
      },
    })
  }

  /**
   * **§8.6.8 — one refusal sentence for the whole screen.** On a conversation
   * with no write key that is `Send`, `Grab`, `Create ticket`, `Transfer` and
   * `Close`: five controls and one sentence, not five copies of it. D17's
   * grammar is what makes one sentence travel — it names a **capability**, so it
   * carries no deictic, no count and nothing about the record.
   */
  const writeRefusal =
    canWrite && !shell.isFrozen
      ? null
      : t('conversations.composer.noPermission', {
          permission: t('conversations.composer.permission'),
        })

  /* ── the pane, mounted in place of the table (§9.4) ─────────────────── */

  if (openId !== null) {
    const record = actions.rows(openConversation.data === null ? [] : [openConversation.data])[0]

    if (openConversation.status === 'error' || (openConversation.status !== 'loading' && !record)) {
      return (
        <QueuePage row={row} meta={null} t={t} dir={dir}>
          <ErrorState
            scope="page"
            message={t('conversations.thread.error')}
            action={{ label: t('conversations.thread.retry'), onClick: openConversation.refetch }}
          />
        </QueuePage>
      )
    }

    if (!record) {
      return (
        <QueuePage row={row} meta={null} t={t} dir={dir}>
          <LoadingSkeleton pattern="P2" label={t('conversations.thread.retry')} />
        </QueuePage>
      )
    }

    const capBlocked =
      presence.atCap &&
      record.channel === 'chat' &&
      conversationAssignee(record)?.id !== currentUserId

    return (
      <>
        <ConversationPane
          conversation={record}
          now={now}
          t={t}
          language={language}
          dir={dir}
          currentUserId={currentUserId}
          writeRefusal={writeRefusal}
          grabRefusal={
            capBlocked
              ? t('conversations.cap.reached', {
                  count: formatCount(presence.cap, language),
                })
              : null
          }
          onBack={() => openRecord(null)}
          onClaim={() => claim(record, false)}
          onTakeOver={() => askTakeOver(record)}
          onTransfer={() => askTransfer(record)}
          onClose={() => askClose(record)}
          onReopen={() =>
            run(
              record.id,
              'conversations.error.row.reopen',
              'conversations.toast.reopened',
              () => reopenConversation(record.id),
            )
          }
          profileHref={`${location.pathname}${withOverlay(location.search, 'entity', record.entityId)}`}
          ticketHref={(ticketId) => `/support/tickets/${ticketId}`}
        />
        <ConfirmDialog
          request={confirm}
          onClose={() => setConfirm(null)}
          busy={actions.busy}
          t={t}
        />
      </>
    )
  }

  const columns = conversationColumns({
    t,
    language,
    now,
    canWrite: canWrite && !shell.isFrozen,
    currentUserId,
    presence,
    slaOf: (id) => slaById.get(id) ?? null,
    profileHref: (entityId) =>
      `${location.pathname}${withOverlay(location.search, 'entity', entityId)}`,
    ticketHref: (ticketId) => `/support/tickets/${ticketId}`,
    failure: actions.failure,
    onClaim: (conversation) => claim(conversation, false),
    onRelease: (conversation) =>
      run(
        conversation.id,
        'conversations.error.row.release',
        'queue.toast.released',
        () => releaseConversation(conversation.id),
      ),
    onTakeOver: askTakeOver,
  })

  return (
    <QueuePage row={row} meta={meta} t={t} dir={dir}>
      <PresenceBar
        presence={presence}
        currentUserId={currentUserId}
        t={t}
        language={language}
        frozen={shell.isFrozen}
      />

      {/* R5a (a) / R10 — exactly ONE page-level banner, stating the count. */}
      <BreachBanner
        id="support-conversations-sla"
        count={breachedCount}
        scoped={onlyBreached}
        onShowBreached={() => setOnlyBreached(true)}
        t={t}
        language={language}
        oneKey="conversations.banner.one"
        otherKey="conversations.banner.other"
      />

      <QueueTable
        t={t}
        language={language}
        table={table}
        rows={rows}
        status={status}
        total={total}
        getRowId={(conversation) => conversation.id}
        columns={columns}
        tableId="support-conversations"
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={selectTab}
        onTotal={onTotal}
        now={now}
        searchPlaceholder={t('conversations.search')}
        /* **R5a — the same predicate as the leading-edge marker, and only
           that one.** A FIRST-RESPONSE breach tints; a resolution breach does
           not, because it does not reorder, is not counted in the banner, and
           marking it would make the banner and the rows disagree (D22,
           AC-964). */
        isRowCritical={(conversation) =>
          conversationSla(conversation).firstResponseBreached
        }
        scope={
          onlyBreached
            ? {
                label: t('conversations.scope.breached'),
                clearLabel: t('conversations.scope.clear'),
                onClear: () => setOnlyBreached(false),
              }
            : null
        }
        rowActions={[
          {
            label: t('conversations.thread.open'),
            onSelect: (conversation) => openRecord(conversation.id),
            /* **P0-2 — the declared row-click target.** `Transfer` reassigns a
               live conversation and must stay unreachable from a row click. */
            rowClick: true,
          },
          {
            label: t('conversations.transfer'),
            onSelect: askTransfer,
            disabled: (conversation) =>
              !canWrite ||
              shell.isFrozen ||
              conversation.status === 'closed' ||
              presence.transferTargets.length === 0,
            /* §11.2 — three refusals, three sentences, and none of them is the
               label repeated back at the operator. */
            reason: (conversation) =>
              !canWrite || shell.isFrozen
                ? t('queue.action.noPermission')
                : conversation.status === 'closed'
                  ? t('conversations.transfer.blocked.closed')
                  : t('conversations.transfer.blocked.noTargets'),
          },
          {
            label: t('conversations.close'),
            onSelect: askClose,
            disabled: (conversation) =>
              !canWrite || shell.isFrozen || conversation.status === 'closed',
            reason: (conversation) =>
              conversation.status === 'closed'
                ? t('conversations.close.blocked')
                : t('queue.action.noPermission'),
          },
        ]}
        /* **AC-324's question, asked once.** A corpus of zero is first-run; a
           view of zero over a non-empty corpus is cleared.
           **`empty`, not `content`** — `useAsync`'s default `isEmpty` for a
           `Paginated` is `total === 0`, so the very read that answers this
           question resolves to `empty` and a `status === 'content'` test can
           never be true when the answer is yes. */
        emptyKind={corpus.status === 'empty' ? 'first-run' : 'cleared'}
        cleared={{
          heading: t('conversations.empty.cleared.heading'),
          body: onlyBreached
            ? t('conversations.empty.cleared.breached')
            : t(CLEARED_BODY[activeTab] ?? 'conversations.empty.cleared.unassigned'),
        }}
        firstRun={{
          heading: t('conversations.empty.firstRun.heading'),
          body: t('conversations.empty.firstRun.body'),
          actions: [
            { label: t('conversations.empty.firstRun.action'), onClick: () => selectTab('closed') },
          ],
        }}
        noMatch={{ message: t('conversations.empty.noMatch') }}
        error={{ message: t('conversations.error.list'), onRetry: data.refetch }}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={actions.busy} t={t} />
    </QueuePage>
  )
}

/* ─────────────────────────────── columns ───────────────────────────────── */

interface ConversationDeps {
  t: Translate
  language: Language
  now: IsoDateTime
  canWrite: boolean
  currentUserId: string
  presence: PresenceModel
  slaOf: (id: string) => ConversationSla | null
  profileHref: (entityId: string) => string
  ticketHref: (ticketId: string) => string
  failure: (id: string) => RowFailure | undefined
  onClaim: (conversation: Conversation) => void
  onRelease: (conversation: Conversation) => void
  onTakeOver: (conversation: Conversation) => void
}

function conversationColumns(deps: ConversationDeps): ReadonlyArray<DataColumn<Conversation>> {
  const { t, language, now } = deps

  return [
    {
      id: 'conversation',
      header: t('conversations.col.conversation'),
      alwaysVisible: true,
      minWidth: 176,
      dataType: 'text',
      sortField: 'entityName',
      cell: (conversation) => {
        const sla = deps.slaOf(conversation.id)
        /**
         * **AC-937** — the second line is the subject where the channel has
         * one, the customer-visible preview where it does not, and a stated
         * sentence where there is nothing at all. `CNV-107` takes the third
         * branch: it renders *"No messages yet"*, not an empty line that reads
         * as a rendering fault.
         *
         * `lastMessagePreview` is already customer-visible-only — the type
         * says so and `CNV-102`'s fixture proves it by skipping `CMSG-1011`.
         * Nothing here re-filters it; re-deriving a rule the data layer already
         * applies is how the two answers drift apart.
         */
        const secondary =
          conversation.subject ??
          conversation.lastMessagePreview ??
          (conversation.messageCount > 0
            ? t('conversations.preview.internalOnly')
            : t('conversations.preview.none'))

        return (
          <span className="flex min-w-0 items-center gap-2">
            {/* R5a (b) — the 3px leading edge, spent on a FIRST-RESPONSE breach
                and on nothing else. A resolution breach gets no marker: it does
                not reorder, it is not counted, and marking it would make the
                banner and the rows disagree (D22, AC-964). */}
            {sla?.firstResponseBreached && <RowCriticalMarker />}
            <Identity
              /* §12.1 / **AC-200** — the identity OPENS THE RECORD and does
                 nothing else. There is no level-3 route on this sub-tab
                 (`detailRoutes: []`), so it opens the customer's 360° layer —
                 the same answer `SafetyScreen` gives for the same reason. The
                 THREAD is a separate, separately labelled control. */
              to={deps.profileHref(conversation.entityId)}
              name={conversation.entityName}
              secondary={secondary}
              label={t('conversations.a11y.open', { id: conversation.id })}
            />
            {conversation.unreadCount > 0 && (
              /* §7.5 — a bare number in a pill is not a word, so the
                 accessible name is on the wrapper and says what the number
                 counts. `<bdi>` isolates the digits (AC-73). */
              <bdi
                className="shrink-0"
                aria-label={t('conversations.a11y.unread', {
                  count: formatCount(conversation.unreadCount, language),
                })}
              >
                <StatusBadge tone="info">
                  {formatCount(conversation.unreadCount, language)}
                </StatusBadge>
              </bdi>
            )}
          </span>
        )
      },
    },
    {
      id: 'channel',
      header: t('conversations.col.channel'),
      width: 104,
      dataType: 'enum',
      sortField: 'channel',
      /* **D19** — the channel facet is *"the only way an operator can see that
         email exists and is empty, rather than assuming chat is all there is"*.
         The options come from the CLOSED SET, not from the facet counts, so
         `whatsapp` is offered at zero rather than vanishing. */
      filter: {
        kind: 'multi-select',
        field: 'channel',
        options: CONVERSATION_CHANNELS.map((channel) => ({
          value: channel,
          label: t(CHANNEL_KEY[channel]),
        })),
      },
      cell: (conversation) => (
        <Cell>
          <StatusBadge tone="neutral">{t(CHANNEL_KEY[conversation.channel])}</StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'status',
      header: t('queue.col.status'),
      width: 112,
      dataType: 'enum',
      sortField: 'status',
      filter: {
        kind: 'select',
        field: 'status',
        options: CONVERSATION_STATUSES.map((value) => ({
          value,
          label: t(STATUS_KEY[value]),
        })),
      },
      /* **Q-11's rule, borrowed** — the countdown gains no variant, so the
         STATUS badge is what says which promise is running beside it. */
      cell: (conversation) => (
        <Cell>
          <StatusBadge tone={STATUS_TONE[conversation.status]}>
            {t(STATUS_KEY[conversation.status])}
          </StatusBadge>
        </Cell>
      ),
    },
    {
      id: 'sla',
      header: t('queue.col.sla'),
      width: 136,
      dataType: 'date',
      cell: (conversation) => {
        const sla = deps.slaOf(conversation.id) ?? conversationSla(conversation)
        const running = runningClock(conversation, sla, now)
        return (
          <SlaCell
            result={running.result}
            dueAt={running.input?.dueAt ?? null}
            t={t}
            language={language}
            promiseLabel={
              sla.paused
                ? t('conversations.promise.paused')
                : running.promise === 'first-response'
                  ? t('conversations.promise.firstResponse')
                  : running.promise === 'resolution'
                    ? t('conversations.promise.resolution')
                    : t('conversations.promise.none')
            }
          />
        )
      },
    },
    {
      id: 'ticket',
      header: t('conversations.col.ticket'),
      width: 96,
      dataType: 'id',
      sortField: 'id',
      filter: {
        kind: 'boolean',
        field: 'hasTicket',
        trueLabel: t('conversations.col.ticket'),
        falseLabel: t('queue.owner.unclaimed'),
      },
      cell: (conversation) =>
        conversation.ticketId === null ? (
          /* §8.3.1 — `—` is not-applicable, and a conversation with no ticket
             genuinely has none. It is not a zero. */
          <Absent />
        ) : (
          <Cell>
            <a
              className="rounded-sm tabular-nums text-foreground underline underline-offset-2"
              href={deps.ticketHref(conversation.ticketId)}
            >
              <bdi>{conversation.ticketId}</bdi>
            </a>
          </Cell>
        ),
    },
    {
      id: 'owner',
      header: t('queue.col.owner'),
      width: 176,
      dataType: 'enum',
      filter: {
        kind: 'boolean',
        field: 'unclaimed',
        trueLabel: t('queue.owner.unclaimed'),
        falseLabel: t('queue.filter.breached.no'),
      },
      cell: (conversation) => {
        const failed = deps.failure(conversation.id)
        if (failed) {
          /* **AC-41** — a failed mutation is scoped to the row's action cell,
             never a page banner, and every other row stays interactive. */
          return (
            <MutedCell title={failed.message}>
              <button
                type="button"
                className="rounded-sm underline underline-offset-2"
                onClick={failed.retry}
              >
                {t('queue.error.retry')}
              </button>
            </MutedCell>
          )
        }

        /**
         * **D22's cap, refused in place with the number** (**AC-967**).
         *
         * `capBlocked` is deliberately three clauses and no more:
         *
         *   - **`channel === 'chat'`** — email, WhatsApp and phone do not count
         *     and are never refused (**AC-968**);
         *   - **not already mine** — *"release frees a slot immediately"*, so
         *     the `Release` control on a chat this operator holds must stay
         *     live at the cap, and `OwnerChip` reads one `canWrite` for all
         *     three of its shapes;
         *   - **`presence.atCap`**, which is `false` for Owner (D22) and
         *     `false` while the count is still unknown — a refusal computed
         *     from a number that has not arrived is a control that flickers.
         *
         * Take-over is refused by the same flag, which is D22's own wording.
         */
        const owner = conversationAssignee(conversation)
        const mine = owner !== null && owner.id === deps.currentUserId
        const capBlocked =
          deps.presence.atCap && conversation.channel === 'chat' && !mine
        const allowed = deps.canWrite && !capBlocked

        return (
          <OwnerChip
            claim={conversation.claim}
            currentUserId={deps.currentUserId}
            now={now}
            t={t}
            canWrite={allowed}
            disabledReason={
              capBlocked
                ? t('conversations.cap.reached', {
                    count: formatCount(deps.presence.cap, language),
                  })
                : t('queue.action.noPermission')
            }
            onClaim={() => deps.onClaim(conversation)}
            onRelease={() => deps.onRelease(conversation)}
            onTakeOver={() => deps.onTakeOver(conversation)}
          />
        )
      },
    },

    /* ── behind the column control (§7.4) ─────────────────────────────── */
    {
      id: 'id',
      header: t('queue.col.id'),
      width: 112,
      dataType: 'id',
      defaultHidden: true,
      sortField: 'id',
      cell: (conversation) => (
        <MutedCell className="tabular-nums">{conversation.id}</MutedCell>
      ),
    },
    {
      id: 'unread',
      header: t('conversations.col.unread'),
      width: 88,
      align: 'end',
      dataType: 'number',
      defaultHidden: true,
      sortField: 'unreadCount',
      cell: (conversation) => (
        <NumCell>{formatCount(conversation.unreadCount, language)}</NumCell>
      ),
    },
    {
      id: 'messages',
      header: t('conversations.col.messages'),
      width: 96,
      align: 'end',
      dataType: 'number',
      defaultHidden: true,
      sortField: 'messageCount',
      /* **AC-938** — `messageCount`, never `messages.length`. `CNV-108` reads
         64 here while one page of twenty is loaded in the pane. */
      cell: (conversation) => (
        <NumCell>{formatCount(conversation.messageCount, language)}</NumCell>
      ),
    },
    {
      id: 'lastMessage',
      header: t('conversations.col.lastMessage'),
      width: 136,
      dataType: 'date',
      defaultHidden: true,
      sortField: 'lastMessageAt',
      cell: (conversation) =>
        conversation.lastMessageAt === null ? (
          <Absent />
        ) : (
          <DateCell>
            {formatDate(conversation.lastMessageAt, { style: 'day-month-time', language })}
          </DateCell>
        ),
    },
  ]
}
