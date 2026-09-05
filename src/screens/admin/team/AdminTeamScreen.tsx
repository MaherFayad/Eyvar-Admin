/**
 * Admin › Team & Access — the operator lifecycle, made real (**P6-T5**).
 *
 * ## What this screen used to be
 *
 * `handleAddUser` fabricated an id as `USR-${users.length + 1}` and pushed onto
 * a component-local `invited[]`. `handleToggleStatus` wrote into a
 * `statusOverrides` map. Three security controls and two rota selects were
 * `useState` with **no save control anywhere on the screen**. The row kebab was
 * hidden for `USR-1` and hidden entirely without `manage_team`. So inviting an
 * operator did nothing, suspending one did nothing until a refetch undid it,
 * and setting a session timeout was theatre.
 *
 * Everything now goes through `clients/team.ts`, which is also where the F-016
 * invariant lives.
 *
 * ## F-016, and why this screen does not implement it
 *
 * *"The last holder of `manage_team` cannot be stripped of it, suspended, or
 * removed."* The client refuses it. This screen calls the **same exported
 * predicate** — `transitionRefusal` — to render the control disabled in place
 * with its reason, so the two cannot disagree. D9 records what happens when
 * they can: `Suspend captain` was declared four times with two different
 * `disabled` predicates and the same operator was stopped by one surface and
 * allowed by another over the same record.
 *
 * The old screen's `user.id !== 'USR-1'` did enforce the invariant, by
 * accident, for one hard-coded id, on one of the three transitions, by hiding
 * the control. All four of those are wrong.
 *
 * ## §11.2 — disabled in place, with the reason
 *
 * Nothing here is hidden because the operator may not use it. The row kebab
 * renders for every operator and every role; each item that is refused is
 * disabled and carries its sentence on a second line, which is the shape
 * `components/table/rowActions.tsx` already implements for `DataTable`. A
 * page-level refusal — no `manage_team` at all — is a banner rather than
 * thirty repeated sentences, and the header's primary is disabled beneath it.
 *
 * ## All four states
 *
 * They are page-scoped because the roster is the page's subject, and they are
 * derived from **three** reads: the roster, the security policy and the rota.
 * A permission matrix rendered above a roster that failed to load would tell
 * the operator the page loaded.
 *
 *   loading   `LoadingSkeleton` on `row.patterns[0]`. Never a spinner.
 *   error     page-scoped `ErrorState`; `Try again` re-runs all three reads.
 *   empty     `first-run`. This screen carries no filter, so `no-match` is
 *             unreachable and an unfiltered zero can only mean nobody invited.
 *   content   the four cards.
 *
 * ## Rules applied
 *   R3         ONE primary — `Invite operator`. Every other control is a
 *              secondary, and the save bar is the shell's, not a second primary.
 *   §11.2      every refusal is stated. Nothing is hidden.
 *   §11.6      the security policy and the rota are one form; dirty state goes
 *              to the shell save bar rather than to a per-card save button.
 *   §7.2       every interactive element is a `<button>` or a primitive with
 *              its own focus ring. No `<div onClick>`.
 *   §7.5       the second-factor column pairs its colour with a word, and the
 *              matrix pairs its tick with a visually-hidden `Granted`.
 *   §9.1       logical utilities only.
 *   R7         five badge tones, no red badge. `Suspended` is `neutral` — a
 *              terminal factual outcome, not an alarm.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { InfoHint } from '@/components/InfoHint'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getOnCallRota,
  getSecurityPolicy,
  inviteExpired,
  listAgentPresence,
  listInvites,
  listOperators,
  listWorkItems,
  offboardOperator,
  reinstateOperator,
  resendInvite,
  revokeInvite,
  suspendOperator,
  transitionRefusal,
  updateOnCallRota,
  updateSecurityPolicy,
  capForRole,
} from '@/data/clients'
import type {
  OnCallRota,
  Paginated,
  SecurityPolicy,
  AgentPresence,
  SubTabRoute,
  TeamGuardCode,
  TeamInvite,
  TeamTransition,
  TeamUser,
} from '@/data/types'
import { isApiError, isBuiltInRole } from '@/data/types'
import { useAsync, useIndexTable, useScreenViews, type ScreenView } from '@/hooks'
import { ViewTabs } from '@/components/ViewTabs'
import { DataTable, type DataColumn, type RowAction } from '@/components/DataTable'
import { formatDate, formatMoney, type Translate } from '@/lib'
import { EYVAR_NOW } from '@/data/mock/clock'
import { Banner } from '@/components/Banner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { withOverlay } from '@/shell/routeState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Clock, ShieldCheck, Users } from 'lucide-react'
import { AddUserModal } from './AddUserModal'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { OperatorSessionsDialog } from './OperatorSessionsDialog'
import { ChangeRoleDialog } from './ChangeRoleDialog'
import { RolesPane } from './panes/RolesPane'
import { OverridesPane } from './panes/OverridesPane'
import { SessionsPane } from './panes/SessionsPane'
import { withFallback } from '../../operations/localCopy'
import { ADMIN_TEAM_EN } from './copy'
/* A role name is a KEY, never the data layer's English literal. Three sites on
   this screen rendered `user.role` raw, which reads as English inside an
   otherwise Arabic table. `roleLabel` lives beside `ROLE_KEYS` in the auth copy
   so there is one map from the six roles, not two. */
import { roleLabel } from '@/screens/auth/copy'


/** The one element every page-level refusal on this screen describes itself by. */
const READ_ONLY_REASON_ID = 'admin-team-read-only-reason'

const ROSTER_ACTION_IDS = ['resend', 'revoke', 'suspend', 'reinstate', 'offboard', 'role', 'sessions'] as const
const ROSTER_ACTION_LABEL: Record<(typeof ROSTER_ACTION_IDS)[number], keyof typeof ADMIN_TEAM_EN> = {
  resend: 'admin.team.action.resend',
  revoke: 'admin.team.action.revoke',
  suspend: 'admin.team.action.suspend',
  reinstate: 'admin.team.action.reinstate',
  offboard: 'admin.team.action.offboard',
  role: 'admin.team.action.changeRole',
  sessions: 'admin.team.action.sessions',
}

const TEAM_PANES: readonly ScreenView[] = [
  { id: 'operators', titleKey: 'view.team.operators' },
  { id: 'roles', titleKey: 'view.team.roles' },
  { id: 'overrides', titleKey: 'view.team.overrides' },
  { id: 'sessions', titleKey: 'view.team.sessions' },
  { id: 'security', titleKey: 'view.team.security' },
  { id: 'oncall', titleKey: 'view.team.oncall' },
]

const IDLE_OPTIONS = [15, 30, 60] as const
const EXPIRY_OPTIONS = [8, 12, 24] as const

/** `TeamGuardCode` → the sentence beside the disabled control. §11.2's second clause. */
function refusalSentence(code: TeamGuardCode, t: Translate): string {
  switch (code) {
    case 'last_manage_team_holder':
      return t('admin.team.refusal.lastManageTeamHolder')
    case 'not_invited':
      return t('admin.team.refusal.notInvited')
    case 'not_active':
      return t('admin.team.refusal.notActive')
    case 'not_suspended':
      return t('admin.team.refusal.notSuspended')
    case 'no_manage_team':
      return t('admin.team.refusal.noPermission')
  }
}

export function AdminTeamScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
  const navigate = useNavigate()
  const location = useLocation()
  /* AC-74 — the copy lives in `./copy.ts` and travels in this screen's
     own chunk. `withFallback` resolves a key the shell dictionary does
     not carry, so nothing here needs registering there. */
  const t = useMemo(
    /* **Memoised, and it is load-bearing.** `withFallback` returns a NEW
       function on every call, and several screens carry `t` in a `deps`
       array — so an unmemoised wrapper re-ran the fetch, which re-rendered,
       which rebuilt the wrapper. Two suites hung outright. */
    () => withFallback(shell.language.t, ADMIN_TEAM_EN),
    [shell.language.t],
  )
  const { dir, language } = shell.language

  const canWrite = shell.permissions.permissions.includes('manage_team')
  /**
   * **D17 mints `manage_security_policy`, and this pane was standing in with
   * `manage_team` because the key did not exist.**
   *
   * They are separate keys on purpose: *"the person who edits the logo can turn
   * off the second factor"* is the failure `manage_settings` produced, and
   * `manage_team` standing in here has the same shape — anyone who can add an
   * operator could also change the idle timeout and the 2FA mandate. Second
   * factor, session lifetime and re-auth window decide **how people
   * authenticate**, which is the highest-privilege setting in the console, and
   * D17 gives the key to the Owner and to nobody else. Closes Q-78; unblocks
   * AC-663.
   *
   * The **on-call rota** below stays on `manage_team`: it is roster
   * administration, not authentication policy.
   */
  const canWriteSecurity = shell.permissions.permissions.includes('manage_security_policy')

  /* Three reads. The roster decides the page's four states; the other two are
     part of the same page and a failure in either is a page failure, because a
     security pane that silently renders its defaults is worse than one that
     says it could not load. */
  /* None of the three fetchers takes a varying parameter, so an empty `deps`
     is complete and the keys are honest. Every mutation on this page calls
     `refetchAll`, and `refetch` bypasses the cache read. */
  const roster = useAsync<Paginated<TeamUser>>((signal) => listOperators({ pageSize: 100 }, signal), {
    cacheKey: 'team.list',
  })
  const policy = useAsync<SecurityPolicy>((signal) => getSecurityPolicy(signal), {
    cacheKey: 'securityPolicy.get',
  })
  const rota = useAsync<OnCallRota>((signal) => getOnCallRota(signal), { cacheKey: 'team.rota' })
  const invites = useAsync<TeamInvite[]>((signal) => listInvites(signal), {
    cacheKey: 'team.invites',
    /* An empty list is a roster with nobody invited, not an empty page. */
    isEmpty: () => false,
  })

  /* A refetch after a pane's own write is a refresh, not a first load: the
     panes stay mounted on the last roster rather than yielding to a skeleton. */
  const lastUsers = useRef<TeamUser[]>([])
  const users = useMemo(() => {
    const items = roster.data?.items
    if (items) lastUsers.current = items
    return items ?? (roster.isRefreshing ? lastUsers.current : [])
  }, [roster.data, roster.isRefreshing])

  const refetchAll = () => {
    roster.refetch()
    policy.refetch()
    rota.refetch()
    invites.refetch()
  }
  const inviteFor = (userId: string) => (invites.data ?? []).find((i) => i.userId === userId) ?? null
  /* T6.2 / T6.3: who is on shift, and what each holds, from the clients that already know. */
  const presence = useAsync<AgentPresence[]>((signal) => listAgentPresence(signal), {
    cacheKey: 'conversations.presence',
    isEmpty: () => false,
  })
  const holdings = useAsync<Record<string, number>>(
    async (signal) => {
      const page = await listWorkItems({ includeOtherRoles: true, pageSize: 200 }, signal)
      const counts: Record<string, number> = {}
      for (const item of page.items) {
        if (item.claim?.state !== 'claimed') continue
        counts[item.claim.ownerId] = (counts[item.claim.ownerId] ?? 0) + 1
      }
      return counts
    },
    { cacheKey: 'work.list', isEmpty: () => false },
  )
  const presenceFor = (userId: string) => (presence.data ?? []).find((p) => p.userId === userId) ?? null

  /* ── the form half: security policy + rota, one save bar ──────────────── */

  const [draftPolicy, setDraftPolicy] = useState<SecurityPolicy | null>(null)
  const [draftRota, setDraftRota] = useState<OnCallRota | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (policy.data) setDraftPolicy(policy.data)
  }, [policy.data])
  useEffect(() => {
    if (rota.data) setDraftRota(rota.data)
  }, [rota.data])

  const policyDirty =
    draftPolicy !== null &&
    policy.data !== null &&
    (draftPolicy.requireSecondFactor !== policy.data.requireSecondFactor ||
      draftPolicy.idleTimeoutMinutes !== policy.data.idleTimeoutMinutes ||
      draftPolicy.absoluteExpiryHours !== policy.data.absoluteExpiryHours)

  const rotaDirty =
    draftRota !== null &&
    rota.data !== null &&
    (draftRota.primaryUserId !== rota.data.primaryUserId ||
      draftRota.secondaryUserId !== rota.data.secondaryUserId)

  const dirty = policyDirty || rotaDirty

  /* §11.6 rows 5–9 — the shell owns the bar; this screen owns the state. The
     `setTimeout` that used to stand in for a save is gone: `onSave` awaits the
     two real mutations and re-reads, so a failure lands in the catch and the
     bar stays dirty rather than clearing on a lie. */
  useEffect(() => {
    /* Each half of this form has its own key, so the bar appears when the
       operator can save *the half they dirtied* — not when they hold the other
       one. An operator who can edit the rota and not the policy still gets a
       working save bar for the rota. */
    if (!dirty || (policyDirty && !canWriteSecurity) || (rotaDirty && !canWrite)) {
      shell.setSaveBar(null)
      return
    }
    shell.setSaveBar({
      status: saving ? 'save-in-flight' : 'dirty',
      entity: t('admin.team.entity'),
      canSave: !saving,
      canDiscard: !saving,
      isSaving: saving,
      onSave: () => {
        void (async () => {
          setSaving(true)
          try {
            if (policyDirty && draftPolicy) {
              await updateSecurityPolicy({
                requireSecondFactor: draftPolicy.requireSecondFactor,
                idleTimeoutMinutes: draftPolicy.idleTimeoutMinutes,
                absoluteExpiryHours: draftPolicy.absoluteExpiryHours,
              })
            }
            if (rotaDirty && draftRota) {
              await updateOnCallRota({
                primaryUserId: draftRota.primaryUserId,
                secondaryUserId: draftRota.secondaryUserId,
              })
            }
            policy.refetch()
            rota.refetch()
            toast.success(t('admin.team.saved'))
          } catch (thrown) {
            toast.error(
              t('admin.team.toast.failed', {
                reason: isApiError(thrown) ? thrown.message : t('admin.team.error'),
              }),
            )
          } finally {
            setSaving(false)
          }
        })()
      },
      onDiscard: () => {
        setDraftPolicy(policy.data)
        setDraftRota(rota.data)
        toast.info(t('admin.team.discarded'))
      },
    })
    return () => shell.setSaveBar(null)
    /* `shell` is stable per render but the setter is what matters; the deps are
       the values the bar closes over. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, policyDirty, rotaDirty, saving, canWrite, canWriteSecurity, draftPolicy, draftRota, policy.data, rota.data, t])

  /* ── the lifecycle half ───────────────────────────────────────────────── */

  const [inviteOpen, setInviteOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [sessionsFor, setSessionsFor] = useState<TeamUser | null>(null)
  const [roleFor, setRoleFor] = useState<TeamUser | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(work: () => Promise<void>, success: string) {
    setBusy(true)
    try {
      await work()
      setConfirm(null)
      roster.refetch()
      invites.refetch()
      toast.success(success)
    } catch (thrown) {
      toast.error(
        t('admin.team.toast.failed', {
          reason: isApiError(thrown) ? thrown.message : t('admin.team.error'),
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  /**
   * One declaration per transition, per row. **The refusal comes from the
   * client's own predicate**, plus the page-level permission gate, so a control
   * is dead here exactly when the mutation would refuse it.
   */
  /* T6.4: the confirm names what the act releases. Two sentences, no assembly. */
  const withHolding = (body: string, userId: string) => {
    const count = holdings.data?.[userId] ?? 0
    return count > 0 ? `${body} ${t('admin.team.confirm.holding', { count })}` : body
  }

  function actionsFor(user: TeamUser): ReadonlyArray<{
    id: TeamTransition | 'sessions'
    label: string
    /** A domain refusal, which gets its own line. `null` when there is none. */
    reason: string | null
    /** True when the refusal is the page-level one, already stated in the banner. */
    refusedByRole: boolean
    onSelect: () => void
  }> {
    /**
     * **D21 rule 5, applied to a row rather than to a set: a permission
     * refusal outranks a domain refusal.** Telling an operator *this one has
     * already signed in* when the real answer is *you may not administer
     * operators* wastes their time twice.
     *
     * The permission refusal is stated ONCE, in the banner, and every control
     * it refuses points `aria-describedby` at it — otherwise the same sentence
     * renders five times in one menu and stops being read.
     */
    const gate = (transition: TeamTransition): string | null => {
      if (!canWrite) return null
      const code = transitionRefusal(users, user, transition)
      return code === null ? null : refusalSentence(code, t)
    }

    return [
      {
        id: 'resend',
        label: t('admin.team.action.resend'),
        reason: gate('resend'),
        refusedByRole: !canWrite,
        onSelect: () =>
          void run(
            async () => void (await resendInvite(user.id)),
            t('admin.team.toast.resent', { name: user.name }),
          ),
      },
      {
        id: 'revoke',
        label: t('admin.team.action.revoke'),
        reason: gate('revoke'),
        refusedByRole: !canWrite,
        onSelect: () =>
          setConfirm({
            title: t('admin.team.confirm.revoke.title', { name: user.name }),
            body: t('admin.team.confirm.revoke.body'),
            confirmLabel: t('admin.team.confirm.revoke.action'),
            /* An invitation that was never accepted. Re-inviting is the
               adjacent menu item, so nothing here is unrecoverable. */
            destructive: false,
            onConfirm: () =>
              void run(
                async () => void (await revokeInvite(user.id)),
                t('admin.team.toast.revoked', { name: user.name }),
              ),
          }),
      },
      {
        id: 'suspend',
        label: t('admin.team.action.suspend'),
        reason: gate('suspend'),
        refusedByRole: !canWrite,
        onSelect: () =>
          setConfirm({
            title: t('admin.team.confirm.suspend.title', { name: user.name }),
            body: withHolding(t('admin.team.confirm.suspend.body'), user.id),
            confirmLabel: t('admin.team.confirm.suspend.action'),
            /* Reinstatement is one click, on this same menu. R5a's red is for
               the unrecoverable; a deactivation is not that. */
            destructive: false,
            reason: {
              label: t('admin.team.confirm.reason.label'),
              help: t('admin.team.confirm.reason.help'),
              message: t('admin.team.confirm.reason.message'),
            },
            onConfirm: ({ reason }) =>
              void run(
                async () => void (await suspendOperator(user.id, reason)),
                t('admin.team.toast.suspended', { name: user.name }),
              ),
          }),
      },
      {
        id: 'reinstate',
        label: t('admin.team.action.reinstate'),
        reason: gate('reinstate'),
        refusedByRole: !canWrite,
        onSelect: () =>
          void run(
            async () => void (await reinstateOperator(user.id)),
            t('admin.team.toast.reinstated', { name: user.name }),
          ),
      },
      {
        id: 'offboard',
        label: t('admin.team.action.offboard'),
        reason: gate('offboard'),
        refusedByRole: !canWrite,
        onSelect: () =>
          setConfirm({
            title: t('admin.team.confirm.offboard.title', { name: user.name }),
            body: withHolding(t('admin.team.confirm.offboard.body'), user.id),
            confirmLabel: t('admin.team.confirm.offboard.action'),
            /* R5a use #1 — the record does not come back from this screen. */
            destructive: true,
            reason: {
              label: t('admin.team.confirm.reason.label'),
              help: t('admin.team.confirm.reason.help'),
              message: t('admin.team.confirm.reason.message'),
            },
            onConfirm: ({ reason }) =>
              void run(
                async () => void (await offboardOperator(user.id, reason)),
                t('admin.team.toast.offboarded', { name: user.name }),
              ),
          }),
      },
      {
        id: 'role',
        label: t('admin.team.action.changeRole'),
        reason: gate('role'),
        refusedByRole: !canWrite,
        onSelect: () => setRoleFor(user),
      },
      {
        /* Read-only, so it is not gated on `manage_team` write. */
        id: 'sessions',
        label: t('admin.team.action.sessions'),
        reason: null,
        refusedByRole: false,
        onSelect: () => setSessionsFor(user),
      },
    ]
  }

  const title = t(row.titleKey)

  /* §11.3 / AC-35 — the shape comes from the ROUTE, not from a guess here. */
  const skeletonPattern = row.patterns[0] === 'SH' ? 'P1' : (row.patterns[0] ?? 'P4')

  const status: 'loading' | 'error' | 'empty' | 'content' =
    roster.status === 'error' || policy.status === 'error' || rota.status === 'error'
      ? 'error'
      : (roster.status === 'loading' && !roster.isRefreshing) || policy.status === 'loading' || rota.status === 'loading'
        ? 'loading'
        : users.length === 0
          ? 'empty'
          : 'content'

  const activeUsers = users.filter((u) => u.status === 'Active')
  const [onlyPending, setOnlyPending] = useState(false)
  const pendingTwoFactor = users.filter((u) => u.secondFactor === null).length
  const rosterTable = useIndexTable<TeamUser>({ mode: 'index', getRowId: (u) => u.id, urlKey: 'roster' })
  /* The roster is one page, so the search narrows in place (§6.4). */
  const needle = (rosterTable.params.q ?? '').toLowerCase()
  const visibleUsers = users.filter(
    (u) =>
      (!onlyPending || u.secondFactor === null) &&
      (needle === '' ||
        [u.name, u.email, u.id, roleLabel(t, u.role)].some((field) => field.toLowerCase().includes(needle))),
  )

  const rosterColumns: DataColumn<TeamUser>[] = [
    {
      id: 'operator',
      header: t('admin.team.column.operator'),
      /* T5.2: the name opens the colleague's 360° layer (`?entity=`). */
      cell: (u) => (
        <button
          type="button"
          className="text-start font-semibold text-foreground underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => navigate({ pathname: location.pathname, search: withOverlay(location.search, 'entity', u.id) })}
        >
          {u.name}
        </button>
      ),
      secondaryLine: (u) => `${u.email} · ${u.id}`,
      minWidth: 210,
    },
    {
      id: 'role',
      header: t('admin.team.column.role'),
      width: 104,
      /* H7: a fill only where it carries a fact; the Owner and a custom role. */
      cell: (u) =>
        u.role === 'Owner' || !isBuiltInRole(u.role) ? (
          <StatusBadge tone={u.role === 'Owner' ? 'new' : 'info'}>{roleLabel(t, u.role)}</StatusBadge>
        ) : (
          <span className="text-foreground">{roleLabel(t, u.role)}</span>
        ),
    },
    {
      id: 'twoFactor',
      header: t('admin.team.column.twoFactor'),
      width: 104,
      cell: (u) =>
        u.secondFactor === null ? (
          <span className="text-muted-foreground">{t('admin.team.twoFactor.none')}</span>
        ) : (
          <span className="text-foreground">{t(`admin.team.twoFactor.${u.secondFactor.method}`)}</span>
        ),
    },
    {
      id: 'status',
      header: t('admin.team.column.status'),
      width: 104,
      /* R7: `Suspended` is `neutral`. There is no red badge. Presence (T6.2)
         is the second line of the same cell: one column answers "can they
         work, and are they here". */
      cell: (u) => (
        <StatusBadge tone={u.status === 'Active' ? 'success' : u.status === 'Invited' ? 'info' : 'neutral'}>
          {t(`admin.team.status.${u.status}`)}
        </StatusBadge>
      ),
      secondaryLine: (u) => <PresenceCell presence={presenceFor(u.id)} t={t} />,
    },
    {
      id: 'holding',
      header: t('admin.team.column.holding'),
      align: 'end',
      dataType: 'number',
      width: 88,
      cell: (u) => (holdings.status === 'content' ? holdings.data?.[u.id] ?? 0 : null),
    },
    {
      id: 'lastSeen',
      header: t('admin.team.column.lastSeen'),
      width: 104,
      cell: (u) =>
        u.lastLoginAt === null ? (
          <span className="flex flex-col text-muted-foreground">
            <span>{t('admin.team.lastSeen.never')}</span>
            {/* T3.2: an invitation states how long it has left, or that it is over. */}
            <InviteExpiry invite={inviteFor(u.id)} t={t} />
          </span>
        ) : (
          <span className="text-muted-foreground">{formatDate(u.lastLoginAt, { language })}</span>
        ),
    },
    {
      id: 'cap',
      header: t('admin.team.column.cap'),
      align: 'end',
      dataType: 'money',
      width: 96,
      /* O-T5: the operator's own cap, and the role default beneath it when they
         differ. The unit is in the header once (§8.3.1). */
      cell: (u) =>
        u.compensationCapHalalas === null
          ? t('admin.team.cap.unlimited')
          : formatMoney(u.compensationCapHalalas, { unit: 'none' }),
      secondaryLine: (u) => {
        const roleCap = capForRole(u.role)
        if (roleCap === u.compensationCapHalalas) return null
        return roleCap === null
          ? t('admin.team.cap.roleDefaultNone')
          : t('admin.team.cap.roleDefault', { amount: formatMoney(roleCap) })
      },
    },
  ]

  /* D8: seven declared actions, one kebab, on every row for every role (§11.2). */
  const rosterActions: RowAction<TeamUser>[] = ROSTER_ACTION_IDS.map((id) => ({
    label: t(ROSTER_ACTION_LABEL[id]),
    onSelect: (u) => actionsFor(u).find((a) => a.id === id)?.onSelect(),
    disabled: (u) => {
      const action = actionsFor(u).find((a) => a.id === id)
      return busy || !action || action.refusedByRole || action.reason !== null
    },
    /* The role refusal is the banner's sentence and is not repeated seven times. */
    reason: (u) => actionsFor(u).find((a) => a.id === id)?.reason ?? null,
  }))

  /* D20's panes, as `?view=`. The row declares them; this mirrors the ids. */
  const panes = useScreenViews(TEAM_PANES, 'operators', t)

  const content = (
    <div className="flex min-w-0 max-w-5xl flex-col gap-6">
      {/* §11.2 — a page-level refusal is stated ONCE, as a banner, rather than
          repeated on thirty controls. The controls beneath stay disabled in
          place; this is the sentence that explains all of them. */}
      {!canWrite && (
        <div id={READ_ONLY_REASON_ID}>
          <Banner
            role="status"
            banner={{
              id: 'admin-team-read-only',
              tone: 'info',
              title: t('admin.team.refusal.noPermission'),
            }}
          />
        </div>
      )}

      <ViewTabs
        tabs={panes.tabs}
        activeTab={panes.activeTab}
        onSelectTab={panes.selectTab}
        label={t('admin.panes')}
      />

      {/* ── 1. the roster (T7.1: the shared table, so search, column state
          and the row kebab behave as they do on every other index) ─────── */}
      {panes.activeTab === 'operators' && (
        <section aria-label={t('admin.team.roster.title')} className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="size-4 text-muted-foreground" aria-hidden="true" />
              {t('admin.team.roster.title')}
              <InfoHint t={t}>{t('admin.team.roster.desc')}</InfoHint>
            </h2>
            <span className="flex flex-col items-end gap-1 text-xs tabular-nums text-muted-foreground">
              <span>{t('admin.team.operators', { count: users.length })}</span>
              {/* T4.3: the two-factor posture, stated once, with the filter that acts on it. */}
              {pendingTwoFactor > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  aria-pressed={onlyPending}
                  onClick={() => setOnlyPending((prev) => !prev)}
                >
                  {onlyPending
                    ? t('admin.team.twoFactor.showAll')
                    : t('admin.team.twoFactor.pendingCount', { count: pendingTwoFactor })}
                </Button>
              )}
            </span>
          </div>
          <DataTable
            table={rosterTable}
            rows={visibleUsers}
            columns={rosterColumns}
            getRowId={(u) => u.id}
            status={visibleUsers.length === 0 ? 'empty' : 'content'}
            total={visibleUsers.length}
            t={t}
            language={language}
            tableId="admin-team-roster"
            searchPlaceholder={t('admin.team.search')}
            skeletonPattern="P1"
            emptyKind="no-match"
            rowActions={rosterActions}
            firstRun={{
              heading: t('admin.team.empty.heading'),
              body: t('admin.team.empty.body'),
              actions: canWrite
                ? [{ label: t('admin.team.invite'), primary: true, onClick: () => setInviteOpen(true) }]
                : [],
            }}
            noMatch={{ message: t('admin.team.noMatch') }}
            error={{ message: t('admin.team.error'), onRetry: refetchAll }}
          />
        </section>
      )}
      {/* ── 2. roles and overrides (D20 panes) ──────────────────────────── */}
      {panes.activeTab === 'roles' && (
        <RolesPane canWrite={canWrite} readOnlyReasonId={READ_ONLY_REASON_ID} t={t} onChanged={roster.refetch} />
      )}
      {panes.activeTab === 'overrides' && (
        <OverridesPane
          users={users}
          canWrite={canWrite}
          readOnlyReasonId={READ_ONLY_REASON_ID}
          t={t}
          onChanged={roster.refetch}
        />
      )}
      {panes.activeTab === 'sessions' && (
        <SessionsPane canWrite={canWrite} readOnlyReasonId={READ_ONLY_REASON_ID} t={t} language={language} />
      )}
      {/* ── 3. security & session policy ────────────────────────────────── */}
      {panes.activeTab === 'security' && (
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.team.security.title')}
            <InfoHint t={t}>{t('admin.team.security.desc')}</InfoHint>
          </CardTitle>
          </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 text-xs">
          {/* §11.2 and AC-957: the pane renders for `manage_team`; writing it needs
              `manage_security_policy`, and the refusal is stated once, here. */}
          {!canWriteSecurity && (
            <p id="admin-team-security-refusal" role="status" className="text-xs text-foreground">
              {t('admin.team.security.readOnly')}
            </p>
          )}
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-3">
            <span className="flex flex-col gap-0.5">
              <Label htmlFor="admin-team-2fa" className="font-medium text-foreground">
                {t('admin.team.security.twoFactor')}
              </Label>
              <span className="text-xs text-muted-foreground">
                {t('admin.team.security.twoFactorDesc')}
              </span>
            </span>
            <Switch
              id="admin-team-2fa"
              checked={draftPolicy?.requireSecondFactor ?? false}
              disabled={!canWriteSecurity || draftPolicy === null}
              aria-describedby={canWriteSecurity ? undefined : 'admin-team-security-refusal'}
              onCheckedChange={(next) =>
                setDraftPolicy((prev) => (prev === null ? prev : { ...prev, requireSecondFactor: next }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4 compact:grid-cols-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-team-idle">{t('admin.team.security.idle')}</Label>
              <Select
                value={String(draftPolicy?.idleTimeoutMinutes ?? '')}
                disabled={!canWriteSecurity || draftPolicy === null}
                onValueChange={(value) =>
                  setDraftPolicy((prev) =>
                    prev === null ? prev : { ...prev, idleTimeoutMinutes: Number(value) },
                  )
                }
              >
                <SelectTrigger id="admin-team-idle" aria-describedby="admin-team-idle-help">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IDLE_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {t('admin.team.security.idleOption', { minutes })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span id="admin-team-idle-help" className="text-xs text-muted-foreground">
                {t('admin.team.security.idleHelp')}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-team-expiry">{t('admin.team.security.expiry')}</Label>
              <Select
                value={String(draftPolicy?.absoluteExpiryHours ?? '')}
                disabled={!canWriteSecurity || draftPolicy === null}
                onValueChange={(value) =>
                  setDraftPolicy((prev) =>
                    prev === null ? prev : { ...prev, absoluteExpiryHours: Number(value) },
                  )
                }
              >
                <SelectTrigger id="admin-team-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>
                      {t('admin.team.security.expiryOption', { hours })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

        </CardContent>
      </Card>

      )}
      {/* ── 4. the on-call rota ─────────────────────────────────────────── */}
      {panes.activeTab === 'oncall' && (
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.team.rota.title')}
            <InfoHint t={t}>{t('admin.team.rota.desc')}</InfoHint>
          </CardTitle>
          </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 text-xs">
          <div className="grid grid-cols-2 gap-4 compact:grid-cols-1">
            <RotaSelect
              id="admin-team-rota-primary"
              label={t('admin.team.rota.primary')}
              value={draftRota?.primaryUserId ?? null}
              users={activeUsers}
              disabled={!canWrite || draftRota === null}
              t={t}
              onChange={(next) =>
                setDraftRota((prev) => (prev === null ? prev : { ...prev, primaryUserId: next }))
              }
            />
            <RotaSelect
              id="admin-team-rota-secondary"
              label={t('admin.team.rota.secondary')}
              value={draftRota?.secondaryUserId ?? null}
              users={activeUsers}
              disabled={!canWrite || draftRota === null}
              t={t}
              onChange={(next) =>
                setDraftRota((prev) => (prev === null ? prev : { ...prev, secondaryUserId: next }))
              }
            />
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )

  /* ── the four states, in order ──────────────────────────────────────── */
  const body =
    status === 'loading' ? (
      <LoadingSkeleton pattern={skeletonPattern} />
    ) : status === 'error' ? (
      <ErrorState
        scope="page"
        heading={t('state.pageError.title', { resource: title })}
        message={t('admin.team.error')}
        action={{ label: t('state.pageError.action'), onClick: refetchAll }}
      />
    ) : status === 'empty' ? (
      /* AC-38 — `first-run`, not `no-match`: this screen has no filter and no
         search, so an empty roster can only mean nobody has been invited. */
      <EmptyState
        kind="first-run"
        heading={t('admin.team.empty.heading')}
        body={t('admin.team.empty.body')}
        actions={
          canWrite ? [{ label: t('admin.team.invite'), primary: true, onClick: () => setInviteOpen(true) }] : []
        }
      />
    ) : (
      content
    )

  return (
    <SingleColumnPage
      header={
        <PageHeader
          title={title}
          meta={
            status === 'content' ? t('admin.team.operators', { count: users.length }) : null
          }
          /* R3 — ONE primary, and §11.2 — disabled in place rather than
             removed. On `empty` the first-run action is the screen's primary
             and this one is not rendered at all, which is a state difference
             rather than a permission one. */
          primaryAction={
            status === 'content'
              ? {
                  label: t('admin.team.invite'),
                  onClick: () => setInviteOpen(true),
                  /* §11.2 — disabled in place. The reason is the banner above
                     the content; `PageAction` carries no `reason` field, which
                     is a shared-component gap reported in the handoff. */
                  disabled: !canWrite,
                }
              : undefined
          }
          t={t}
          dir={dir}
        />
      }
    >
      {body}

      <AddUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(name) => {
          roster.refetch()
          invites.refetch()
          toast.success(t('admin.team.toast.invited', { name }))
        }}
        t={t}
      />

      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} busy={busy} t={t} />

      <OperatorSessionsDialog
        operator={sessionsFor}
        onClose={() => setSessionsFor(null)}
        onRevoked={() => toast.success(t('admin.team.toast.sessionRevoked'))}
        t={t}
        language={language}
      />
      <ChangeRoleDialog
        operator={roleFor}
        users={users}
        onClose={() => setRoleFor(null)}
        onChanged={(updated) => {
          roster.refetch()
          toast.success(
            t('admin.team.role.toast.changed', { name: updated.name, role: roleLabel(t, updated.role) }),
          )
        }}
        t={t}
      />
    </SingleColumnPage>
  )
}

/** `Nobody` is a real, selectable value — not a placeholder and not a disabled state. */
function RotaSelect({
  id,
  label,
  value,
  users,
  disabled,
  onChange,
  t,
}: {
  id: string
  label: string
  value: string | null
  users: readonly TeamUser[]
  disabled: boolean
  onChange: (next: string | null) => void
  t: Translate
}) {
  const NOBODY = '__nobody__'
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? NOBODY}
        disabled={disabled}
        onValueChange={(next) => onChange(next === NOBODY ? null : next)}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NOBODY}>{t('admin.team.rota.nobody')}</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {t('admin.team.rota.option', { name: user.name, role: roleLabel(t, user.role) })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** The invitation's remaining life, as a sentence; nothing when there is no invitation. */
function InviteExpiry({ invite, t }: { invite: TeamInvite | null; t: Translate }) {
  if (invite === null) return null
  if (inviteExpired(invite)) {
    return <span className="text-xs text-warning-foreground">{t('admin.team.invite.expired')}</span>
  }
  const days = Math.max(0, Math.round((Date.parse(invite.expiresAt) - Date.parse(EYVAR_NOW)) / 86_400_000))
  return (
    <span className="text-xs">
      {days === 0 ? t('admin.team.invite.expiresToday') : t('admin.team.invite.expiresIn', { days })}
    </span>
  )
}

/** Presence as a word with a dot beside it (§7.5); nothing when the roster does not know. */
function PresenceCell({ presence, t }: { presence: AgentPresence | null; t: Translate }) {
  if (presence === null) return null
  const dot =
    presence.state === 'online'
      ? 'bg-success-foreground'
      : presence.state === 'away'
        ? 'bg-warning-foreground'
        : 'bg-muted-foreground'
  return (
    <span className="flex items-center gap-1.5 text-foreground">
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} />
      {t(`admin.team.presence.${presence.state}`)}
    </span>
  )
}
