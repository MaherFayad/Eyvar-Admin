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

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  getOnCallRota,
  getSecurityPolicy,
  listOperators,
  offboardOperator,
  reinstateOperator,
  resendInvite,
  revokeInvite,
  suspendOperator,
  transitionRefusal,
  updateOnCallRota,
  updateSecurityPolicy,
} from '@/data/clients'
import type {
  OnCallRota,
  Paginated,
  SecurityPolicy,
  SubTabRoute,
  TeamGuardCode,
  TeamTransition,
  TeamUser,
} from '@/data/types'
import { isApiError, ROLE_NAMES, ROLE_PERMISSIONS } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate, type Translate } from '@/lib'
import { Banner } from '@/components/Banner'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { Money } from '@/components/Money'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'
import { PERMISSION_KEYS } from '@/shell/permissions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Check, Clock, Key, MoreHorizontal, ShieldCheck, Users, X } from 'lucide-react'
import { AddUserModal } from './AddUserModal'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ConfirmDialog'
import { OperatorSessionsDialog } from './OperatorSessionsDialog'
import { withFallback } from '../../operations/localCopy'
import { ADMIN_TEAM_EN } from './copy'

/**
 * **Q4 is CLOSED by D17, and this literal is superseded.**
 *
 * `ALL_PERMISSIONS` was *"an engineer's reading of the RBAC matrix"* — thirteen
 * keys and four roles, hand-written here because the ruling had not landed and
 * wiring a guess through the seam would have made it look ratified. It has
 * landed. The matrix now renders **the same two constants the router reads**:
 * `PERMISSION_KEYS` (the twenty, derived from the `PermissionKey` union so a
 * twenty-first is a compile error) and `ROLE_PERMISSIONS` (D17's six baselines).
 *
 * **This is what makes AC-924 true rather than plausible**: the preview lists
 * exactly the keys `forbiddenReason` and `canWriteSubTab` allow or deny on,
 * because there is now one list and not two. The labels come from the same
 * `account.permission.<key>` dictionary keys the account layer's §6.4 summary
 * uses, so a permission is described identically wherever it is named.
 *
 * The matrix stays **read-only**: editing a role baseline is Phase 6b's
 * `clients/rbac`, and D17 requires a per-user delta to render **as a delta**
 * (`Support + release_escrow`), which is a different control from a grid of
 * ticks.
 */
const MATRIX_ROLES = ROLE_NAMES

/** The one element every page-level refusal on this screen describes itself by. */
const READ_ONLY_REASON_ID = 'admin-team-read-only-reason'

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
    case 'cross_operator_session':
      return t('admin.team.refusal.crossOperatorSession')
  }
}

export function AdminTeamScreen({ row }: { row: SubTabRoute }) {
  const shell = useShell()
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

  const users = useMemo(() => roster.data?.items ?? [], [roster.data])

  const refetchAll = () => {
    roster.refetch()
    policy.refetch()
    rota.refetch()
  }

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
  const [busy, setBusy] = useState(false)

  async function run(work: () => Promise<void>, success: string) {
    setBusy(true)
    try {
      await work()
      setConfirm(null)
      roster.refetch()
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
            body: t('admin.team.confirm.suspend.body'),
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
            body: t('admin.team.confirm.offboard.body'),
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
      : roster.status === 'loading' || policy.status === 'loading' || rota.status === 'loading'
        ? 'loading'
        : users.length === 0
          ? 'empty'
          : 'content'

  const activeUsers = users.filter((u) => u.status === 'Active')

  const content = (
    <div className="flex max-w-5xl flex-col gap-6">
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

      {/* ── 1. the roster ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                {t('admin.team.roster.title')}
              </CardTitle>
              <CardDescription className="text-xs">{t('admin.team.roster.desc')}</CardDescription>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('admin.team.operators', { count: users.length })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    {t('admin.team.column.operator')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('admin.team.column.role')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('admin.team.column.twoFactor')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('admin.team.column.status')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('admin.team.column.lastSeen')}
                  </th>
                  <th scope="col" className="p-3 text-end">
                    {t('admin.team.column.cap')}
                  </th>
                  <th scope="col" className="p-3 text-end">
                    <span className="sr-only">{t('admin.team.rowActions')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 focus-within:bg-muted/20">
                    <td className="p-3">
                      <span className="flex flex-col">
                        <span className="font-semibold text-foreground">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.email} · {user.id}
                        </span>
                      </span>
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        tone={
                          user.role === 'Owner' ? 'new' : user.role === 'Ops Manager' ? 'info' : 'neutral'
                        }
                      >
                        {user.role}
                      </StatusBadge>
                    </td>
                    <td className="p-3">
                      {/* §7.5 — the tone is paired with a word, always. */}
                      {user.secondFactor === null ? (
                        <span className="font-medium text-warning-foreground">
                          {t('admin.team.twoFactor.none')}
                        </span>
                      ) : (
                        <span className="font-medium text-success-foreground">
                          {t(`admin.team.twoFactor.${user.secondFactor.method}`)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {/* R7 — `Suspended` is `neutral`. There is no red badge. */}
                      <StatusBadge
                        tone={
                          user.status === 'Active'
                            ? 'success'
                            : user.status === 'Invited'
                              ? 'info'
                              : 'neutral'
                        }
                      >
                        {t(`admin.team.status.${user.status}`)}
                      </StatusBadge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {user.lastLoginAt === null
                        ? t('admin.team.lastSeen.never')
                        : formatDate(user.lastLoginAt, { language })}
                    </td>
                    <td className="p-3 text-end font-medium text-foreground">
                      {user.compensationCapHalalas === null ? (
                        t('admin.team.cap.unlimited')
                      ) : (
                        <Money amount={user.compensationCapHalalas} />
                      )}
                    </td>
                    <td className="p-3 text-end">
                      {/* D8 — six declared actions, so the kebab is right. It
                          renders on EVERY row, at rest, for every role: §11.2
                          and AC-68 both. The old screen hid it for `USR-1` and
                          for any operator without `manage_team`. */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t('admin.team.rowActions')}
                          >
                            <MoreHorizontal aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actionsFor(user).map((action) => (
                            <RefusableMenuItem
                              key={action.id}
                              label={action.label}
                              reason={action.reason}
                              refusedByRole={action.refusedByRole}
                              busy={busy}
                              onSelect={action.onSelect}
                            />
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. the permission matrix ────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2">
            <Key className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.team.matrix.title')}
          </CardTitle>
          <CardDescription className="text-xs">{t('admin.team.matrix.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    {t('admin.team.matrix.capability')}
                  </th>
                  {MATRIX_ROLES.map((role) => (
                    <th key={role} scope="col" className="p-3 text-center">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PERMISSION_KEYS.map((permissionKey) => (
                  <tr key={permissionKey} className="hover:bg-muted/20">
                    <th scope="row" className="p-3 text-start font-normal">
                      <span className="block font-medium text-foreground">
                        {t(`account.permission.${permissionKey}`)}
                      </span>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {permissionKey}
                      </span>
                    </th>
                    {MATRIX_ROLES.map((role) => {
                      /* **D17's baseline, read from the one place it is
                         declared.** Not from `holder.permissions` on a seeded
                         operator: that array is the legacy absolute set, it is
                         no longer what `Session.permissions` carries, and a role
                         with no seeded holder would have rendered as an empty
                         column rather than as its baseline. */
                      const granted = ROLE_PERMISSIONS[role].includes(permissionKey)
                      return (
                        <td key={role} className="p-3 text-center">
                          {/* §7.5 — the glyph is never the only carrier. */}
                          {granted ? (
                            <Check
                              className="mx-auto size-4 text-success-foreground"
                              aria-hidden="true"
                            />
                          ) : (
                            <X className="mx-auto size-4 text-muted-foreground" aria-hidden="true" />
                          )}
                          <span className="sr-only">
                            {granted ? t('admin.team.matrix.granted') : t('admin.team.matrix.withheld')}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* §11.2 — the matrix is read-only and says why, in place. */}
          <p className="border-t border-border p-3 text-xs text-muted-foreground">
            {t('admin.team.matrix.blocked')}
          </p>
        </CardContent>
      </Card>

      {/* ── 3. security & session policy ────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.team.security.title')}
          </CardTitle>
          <CardDescription className="text-xs">{t('admin.team.security.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 text-xs">
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
              onCheckedChange={(next) =>
                setDraftPolicy((prev) => (prev === null ? prev : { ...prev, requireSecondFactor: next }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          {/* Stated rather than hidden: the value saves, and the shell does not
              read it yet. A pane that quietly saved a number nothing enforces
              is the defect this whole screen is being repaired for. */}
          <p className="text-xs text-muted-foreground">{t('admin.team.security.notWired')}</p>
        </CardContent>
      </Card>

      {/* ── 4. the on-call rota ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('admin.team.rota.title')}
          </CardTitle>
          <CardDescription className="text-xs">{t('admin.team.rota.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <p className="text-xs text-muted-foreground">{t('admin.team.rota.notWired')}</p>
        </CardContent>
      </Card>
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
    </SingleColumnPage>
  )
}

/**
 * §11.2 / §8.4.4 — a menu item that is refused stays in the menu, disabled,
 * **with the reason on a second line**. Never a tooltip: §5.7 confines a
 * tooltip to naming an icon-only control, and a hover-only explanation is
 * unreachable by keyboard and on touch.
 *
 * The accessible NAME stays the bare label — a description rendered inside the
 * item would otherwise be folded into it, and every caller that finds an action
 * by its label would stop finding it. Same construction as
 * `components/table/rowActions.tsx`, deliberately, so the two surfaces cannot
 * word or shape a refusal differently.
 */
function RefusableMenuItem({
  label,
  reason,
  refusedByRole,
  busy,
  onSelect,
}: {
  label: string
  reason: string | null
  refusedByRole: boolean
  busy: boolean
  onSelect: () => void
}) {
  const reasonId = `admin-team-refusal-${label.replace(/\W+/g, '-').toLowerCase()}`
  const refused = refusedByRole || reason !== null
  /* The role refusal is the banner's sentence; the domain refusal is its own
     line. Either way the control POINTS AT a real element with real text. */
  const describedBy = refusedByRole ? READ_ONLY_REASON_ID : reason !== null ? reasonId : undefined

  return (
    <DropdownMenuItem
      disabled={refused || busy}
      aria-label={refused ? label : undefined}
      aria-describedby={describedBy}
      className={reason !== null ? 'flex-col items-start gap-0.5 whitespace-normal' : undefined}
      onSelect={onSelect}
    >
      {label}
      {reason !== null && (
        <span id={reasonId} className="block max-w-64 text-xs font-normal text-muted-foreground">
          {reason}
        </span>
      )}
    </DropdownMenuItem>
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
              {t('admin.team.rota.option', { name: user.name, role: user.role })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
