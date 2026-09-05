/**
 * Every command that acts on a **colleague** — D9, F6.
 *
 * `operator` is a `ProfileEntityType` (plan T5.1) and `searchEntities` already
 * indexes the roster by name and email (`clients/profile.ts:469`), so this
 * registry is reachable from ⌘K: *"revoke yousef"* finds the person and the
 * command in one query.
 *
 * ## What F-016 can and cannot refuse at render
 *
 * The rule is *"the last active holder of `manage_team` may not be suspended,
 * offboarded or stripped of it"*, and it is a fact about the **whole roster**,
 * not about the record in hand. `CommandContext` carries `targets`, a
 * translator, a language, a one-boolean session and a host — **it does not
 * carry the roster**, and `unavailable` is synchronous, so it cannot read one.
 *
 * So each command refuses what the record alone can answer — `transitionRefusal`'s
 * status half (`clients/team.ts:276`), restated here against the target — and
 * the last-holder rule is enforced by the client, at commit. **That is weaker
 * than §11.2 wants and it is recorded as such**: the fix is a roster on
 * `CommandSession` (one field, one argument on `commandSession()`), not a
 * predicate rewritten in five registries. Reported.
 *
 * ## What is NOT here, and why
 *
 * **`Invite operator`.** `TeamInviteInput` needs a name, an email and a role.
 * `CommandConfirmRequest` collects one reason, one closed choice and one
 * amount; three free-text fields is a form, and a form is a screen. Inventing a
 * `fields` array on the confirm contract would be a design decision about who
 * renders it and how it validates — raised to product-designer rather than
 * assumed. Admin › Team's own invite form is the surface today.
 *
 * **`Change role`.** There is **no role-change operation** anywhere in
 * `clients/team.ts`: the roster carries `role` and `permissions`, `inviteOperator`
 * derives permissions from the role, and nothing writes either afterwards
 * (P6-T7, gated on D4/D17). Reported to mock-data-engineer.
 *
 * ## Undo
 *
 * **None of these carries one, and each fails a different clause.** Suspending
 * pushes a notification to the operator (`notifyTeam`, `clients/team.ts:548`) —
 * D18's *"nothing left the console"* fails outright. Reinstating's inverse
 * *does* exist as `operator.suspend`, but that command requires a stated reason
 * and an undo handle has none to give; inventing one would write a fabricated
 * sentence into the audit log. Revoking and offboarding have no inverse at all.
 */

import { MailIcon, UserMinusIcon, UserPlusIcon, UserXIcon } from 'lucide-react'
import { SuspendedIcon } from '@/components/icons'
import {
  offboardOperator,
  reinstateOperator,
  resendInvite,
  revokeInvite,
  suspendOperator,
} from '@/data/clients'
import type { TeamUser } from '@/data/types'
import { formatCount } from '@/lib'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandRegistry } from './registry'

/** The permission every command here will require once D17 lands — **Q4**. */
const WRITE_PERMISSION = 'manage_team'

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * Take a colleague's access away for now. `suspendOperator` releases everything
 * they were holding in the same mutation, so the queues do not end up pointing
 * at somebody who cannot answer.
 */
const suspend: Command<TeamUser> = {
  id: 'operator.suspend',
  titleKey: 'operator.action.suspend',
  compactTitleKey: 'operator.bulk.suspend',
  section: 'do',
  keywords: [
    'suspend operator',
    'suspend colleague',
    'disable account',
    'lock out',
    'pause access',
    /* Legacy's own roster button, verbatim (`eyvar_ops_panel_v40_fixed.html:4113`). */
    'suspend account',
    'team',
    'تعليق الحساب',
    'إيقاف زميل',
    'منع الدخول',
    'فريق',
  ],
  icon: SuspendedIcon,
  scope: { kind: 'entity', entityType: 'operator', plural: true },
  /* R5a — reversed by the command declared beneath it, so not red. */
  affordance: 'default',
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'operator.action.noPermission') ??
    blockedBy(ctx, (user) => user.status !== 'Active', 'operator.action.suspend.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    if (first === undefined) return null
    const reason = await ctx.host.confirm({
      title:
        count === 1
          ? ctx.t('operator.suspend.title', { name: first.name })
          : ctx.t('operator.suspend.title.other', { count: formatCount(count, ctx.language) }),
      /* §5.7 rule 9 — what does NOT change: the record, the audit trail and
         everything they already decided all stay. */
      body: ctx.t('operator.suspend.body'),
      confirmLabel: ctx.t('operator.suspend.confirm'),
      reason: {
        label: ctx.t('operator.reason.label'),
        help: ctx.t('operator.reason.help'),
        message: ctx.t('operator.reason.message'),
      },
    })
    if (reason === null) return null
    const changed = await Promise.all(
      ctx.targets.map((user) => suspendOperator(user.id, reason)),
    )
    return {
      message:
        count === 1
          ? ctx.t('operator.toast.suspended', { name: first.name })
          : ctx.t('operator.toast.suspended.other', { count: formatCount(count, ctx.language) }),
      changed,
    }
  },
}

/**
 * Give it back. Declared beside `suspend` for §11.2's `:4113` reason: the
 * legacy roster renders one or the other and never both, so an operator looking
 * at a suspended colleague cannot see that reinstating is a thing that exists.
 */
const reinstate: Command<TeamUser> = {
  id: 'operator.reinstate',
  titleKey: 'operator.action.reinstate',
  compactTitleKey: 'operator.bulk.reinstate',
  section: 'do',
  keywords: [
    'reinstate operator',
    'restore access',
    'unsuspend',
    'enable account',
    'let back in',
    /* Legacy's own roster button, verbatim (`:4113`). */
    'reinstate account',
    'team',
    'إعادة التفعيل',
    'استعادة الوصول',
    'رفع التعليق',
    'فريق',
  ],
  icon: UserPlusIcon,
  scope: { kind: 'entity', entityType: 'operator', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'operator.action.noPermission') ??
    blockedBy(ctx, (user) => user.status !== 'Suspended', 'operator.action.reinstate.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const changed = await Promise.all(ctx.targets.map((user) => reinstateOperator(user.id)))
    return {
      message:
        count === 1
          ? ctx.t('operator.toast.reinstated', { name: first?.name ?? '' })
          : ctx.t('operator.toast.reinstated.other', { count: formatCount(count, ctx.language) }),
      changed,
    }
  },
}

/**
 * Send the invitation again. **No state change on the person** — the clock
 * restarts and the resend count goes up. 404 on anybody who is not `Invited`,
 * restated at render.
 */
const resend: Command<TeamUser> = {
  id: 'operator.resendInvite',
  titleKey: 'operator.action.resendInvite',
  compactTitleKey: 'operator.bulk.resendInvite',
  section: 'do',
  keywords: [
    'resend invite',
    'send invitation again',
    'invite email',
    'chase invite',
    'nudge',
    'team',
    'إعادة إرسال الدعوة',
    'إرسال الدعوة',
    'تذكير',
    'فريق',
  ],
  icon: MailIcon,
  scope: { kind: 'entity', entityType: 'operator', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'operator.action.noPermission') ??
    blockedBy(ctx, (user) => user.status !== 'Invited', 'operator.action.resendInvite.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    await Promise.all(ctx.targets.map((user) => resendInvite(user.id)))
    return {
      /* No `changed`: `resendInvite` returns the invitation, not the roster
         row, and the row did not move. */
      message:
        count === 1
          ? ctx.t('operator.toast.invited', { email: first?.email ?? '' })
          : ctx.t('operator.toast.invited.other', { count: formatCount(count, ctx.language) }),
    }
  },
}

/**
 * Withdraw an invitation nobody accepted. **R5a red**: the roster row and the
 * invitation are both deleted and there is no operation that puts either back —
 * the person would have to be invited again from scratch.
 */
const revoke: Command<TeamUser> = {
  id: 'operator.revokeInvite',
  titleKey: 'operator.action.revokeInvite',
  compactTitleKey: 'operator.bulk.revokeInvite',
  section: 'do',
  keywords: [
    'revoke invite',
    'cancel invitation',
    'withdraw invite',
    'uninvite',
    'revoke access',
    'team',
    'سحب الدعوة',
    'إلغاء الدعوة',
    'إبطال',
    'فريق',
  ],
  icon: UserXIcon,
  scope: { kind: 'entity', entityType: 'operator', plural: false },
  affordance: 'destructive',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'operator.action.noPermission') ??
    blockedBy(ctx, (user) => user.status !== 'Invited', 'operator.action.revokeInvite.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const confirmed = await ctx.host.confirm({
      title: ctx.t('operator.revokeInvite.title', { name: target.name }),
      body: ctx.t('operator.revokeInvite.body', { email: target.email }),
      confirmLabel: ctx.t('operator.revokeInvite.confirm'),
    })
    if (confirmed === null) return null
    await revokeInvite(target.id)
    return {
      /* The row is gone, so there is nothing to overlay — `changed` is
         deliberately absent rather than carrying a record that no longer
         exists. */
      message: ctx.t('operator.toast.inviteRevoked', { name: target.name }),
    }
  },
}

/**
 * Remove a colleague for good. **R5a red, and the sharpest case in the
 * product**: the record leaves the roster, the rota is repaired around them,
 * and offboarding the last administrator locks everybody out of the screen
 * permanently with nothing in the console able to undo it.
 */
const offboard: Command<TeamUser> = {
  id: 'operator.offboard',
  titleKey: 'operator.action.offboard',
  compactTitleKey: 'operator.bulk.offboard',
  section: 'do',
  keywords: [
    'offboard',
    'remove operator',
    'revoke access',
    'delete colleague',
    'leaver',
    'team',
    'إنهاء الوصول',
    'إزالة زميل',
    'حذف الحساب',
    'فريق',
  ],
  icon: UserMinusIcon,
  scope: { kind: 'entity', entityType: 'operator', plural: false },
  affordance: 'destructive',
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'operator.action.noPermission') ??
    blockedBy(ctx, (user) => user.status === 'Invited', 'operator.action.offboard.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const reason = await ctx.host.confirm({
      title: ctx.t('operator.offboard.title', { name: target.name }),
      /* §5.7 rule 9 — what will not change (the audit trail keeps every act
         they took) alongside what cannot be walked back. */
      body: ctx.t('operator.offboard.body'),
      confirmLabel: ctx.t('operator.offboard.confirm'),
      reason: {
        label: ctx.t('operator.reason.label'),
        help: ctx.t('operator.reason.help'),
        message: ctx.t('operator.reason.message'),
      },
    })
    if (reason === null) return null
    await offboardOperator(target.id, reason)
    return { message: ctx.t('operator.toast.offboarded', { name: target.name }) }
  },
}

/**
 * The team registry, in the order an administrator works a roster row: pause,
 * restore, chase the invitation, withdraw it, or end the relationship.
 */
export const TEAM_COMMANDS: CommandRegistry<TeamUser> = [
  suspend,
  reinstate,
  resend,
  revoke,
  offboard,
]
