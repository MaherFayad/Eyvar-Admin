/**
 * Admin › Team & Access — every operator-facing string, as keys (**AC-74**).
 *
 * Two groups, and the second is the one with a build-time guard on it:
 *
 *   `admin.team.*`   the screen. Sentence case, verbs on buttons (`copy.md`).
 *   `admin.audit.*`  the `LocalisedText` keys `clients/team.ts` mints on
 *                    `AuditEntry.detail`. `i18n/localisedKeys.test.ts` scans
 *                    `src/data` for them and fails the build if one is missing
 *                    here — the check that exists because 14 `fin.audit.*` keys
 *                    were minted for three waves and defined nowhere.
 *
 * **The refusal sentences are copy, not error messages.** `clients/team.ts`
 * throws a `TeamGuardCode`; the screen maps the code to one of the
 * `admin.team.refusal.*` keys below and renders it as the *reason* beside the
 * disabled control (§11.2, and `components/table/rowActions.tsx` for the shape).
 * The client's own `ApiError.message` names the rule for a log and is never
 * shown to an operator.
 */

import type { Dictionary } from '@/lib'

export const ADMIN_TEAM_EN: Dictionary = {
  /* ── the page ───────────────────────────────────────────────────────── */
  'admin.team.meta': 'Operators, permissions, security policy and the on-call rota',
  'admin.team.invite': 'Invite operator',
  'admin.team.operators': '{count} operators',

  /* ── the roster ─────────────────────────────────────────────────────── */
  'admin.team.search': 'Search operators',
  'admin.team.noMatch': 'No operators match.',
  'admin.team.roster.title': 'Operators & access',
  'admin.team.roster.desc':
    'Everyone who can sign in, the role they hold, and how much they may compensate a rider without asking.',
  'admin.team.column.operator': 'Operator',
  'admin.team.column.role': 'Role',
  'admin.team.column.twoFactor': 'Second factor',
  'admin.team.column.status': 'Status',
  'admin.team.column.lastSeen': 'Last seen',
  'admin.team.column.cap': 'Cap (SAR)',
  'admin.team.column.holding': 'Holding',
  'admin.team.presence.online': 'Online',
  'admin.team.presence.away': 'Away',
  'admin.team.presence.offline': 'Offline',
  'admin.team.twoFactor.totp': 'Authenticator app',
  'admin.team.twoFactor.sms': 'SMS',
  'admin.team.twoFactor.none': 'Enrolment pending',
  'admin.team.twoFactor.pendingCount': '{count} without a second factor. Show only them',
  'admin.team.twoFactor.showAll': 'Show everyone',
  'admin.team.lastSeen.never': 'Never signed in',
  'admin.team.cap.unlimited': 'No cap',
  'admin.team.cap.roleDefault': 'Role default {amount}',
  'admin.team.cap.roleDefaultNone': 'Role default: no cap',
  'admin.team.status.Active': 'Active',
  'admin.team.status.Invited': 'Invited',
  'admin.team.status.Suspended': 'Suspended',
  'admin.team.invite.sent': 'Invited {days} days ago · {resends} resends',
  'admin.team.rowActions': 'Operator actions',

  /* ── the six transitions ────────────────────────────────────────────── */
  'admin.team.action.resend': 'Resend invitation',
  'admin.team.action.revoke': 'Revoke invitation',
  'admin.team.action.suspend': 'Suspend operator',
  'admin.team.action.reinstate': 'Reinstate operator',
  'admin.team.action.offboard': 'Offboard operator',
  'admin.team.action.sessions': 'View sessions',
  'admin.team.action.changeRole': 'Change role',

  /* ── roles pane (D17, D20) ──────────────────────────────────────────── */
  'admin.team.roles.title': 'Roles',
  'admin.team.roles.hint': 'A built-in role is fixed. Duplicate one to make a custom role you can edit.',
  'admin.team.roles.loading': 'Loading roles',
  'admin.team.roles.error': 'The roles could not be loaded.',
  'admin.team.roles.holders': 'Holders',
  'admin.team.roles.custom': 'Custom',
  'admin.team.roles.actions': 'Role actions',
  'admin.team.roles.duplicate': 'Duplicate as custom',
  'admin.team.roles.edit': 'Edit permissions',
  'admin.team.roles.delete': 'Delete role',
  'admin.team.roles.refusal.holders': '{count} operators hold this role. Move them first.',
  'admin.team.roles.confirm.delete.title': 'Delete the role {name}?',
  'admin.team.roles.confirm.delete.body': 'Nobody holds it. Its audit entries stay.',
  'admin.team.roles.editor.createTitle': 'New role from {basedOn}',
  'admin.team.roles.editor.editTitle': 'Edit {name}',
  'admin.team.roles.editor.desc': 'Tick what the role may do. The preview shows what its holders will see.',
  'admin.team.roles.editor.name': 'Role name',
  'admin.team.roles.editor.nameTaken': 'A role with that name exists.',
  'admin.team.roles.editor.nameEmpty': 'Give the role a name.',
  'admin.team.roles.editor.permissions': 'Permissions',
  'admin.team.roles.editor.create': 'Create role',
  'admin.team.roles.editor.save': 'Save role',
  'admin.team.roles.toast.created': 'Role {name} created',
  'admin.team.roles.toast.saved': 'Role {name} saved',
  'admin.team.roles.toast.deleted': 'Role {name} deleted',
  'admin.team.roles.holdersOf.title': 'Who holds a permission',
  'admin.team.roles.holdersOf.hint': 'Every operator whose effective set holds the permission, and whether the role or an override gave it.',
  'admin.team.roles.holdersOf.pick': 'Permission',
  'admin.team.roles.holdersOf.empty': 'Nobody holds this permission.',
  'admin.team.roles.holdersOf.viaBaseline': 'From the role',
  'admin.team.roles.holdersOf.viaGranted': 'Granted as an override',

  /* ── overrides pane ─────────────────────────────────────────────────── */
  'admin.team.overrides.title': 'Overrides',
  'admin.team.overrides.hint': 'An override is what differs from the role. It is shown as a difference, never as a flat list.',
  'admin.team.overrides.empty': 'No operator has an override. Every permission comes from a role.',
  'admin.team.overrides.add': 'Add override',
  'admin.team.overrides.edit': 'Edit override',
  'admin.team.overrides.clear': 'Remove override',
  'admin.team.overrides.column.operator': 'Operator',
  'admin.team.overrides.column.delta': 'Override',
  'admin.team.overrides.plus': '+ {label}',
  'admin.team.overrides.minus': '− {label}',
  'admin.team.override.picker': 'Operator',
  'admin.team.override.pickerPlaceholder': 'Choose an operator',
  'admin.team.override.dialog.title': 'Override for {name}',
  'admin.team.override.dialog.role': 'Role: {role}',
  'admin.team.override.inRole': 'In the role',
  'admin.team.override.notInRole': 'Not in the role',
  'admin.team.override.state.inherited': 'As role',
  'admin.team.override.state.granted': 'Granted',
  'admin.team.override.state.revoked': 'Revoked',
  'admin.team.override.effective': 'Effective: {count} of {total} permissions',
  'admin.team.override.save': 'Save override',
  'admin.team.override.cap': 'Compensation cap (SAR)',
  'admin.team.override.capHelp': 'Blank is no cap. The role default is {amount}.',
  'admin.team.override.toast.saved': 'Override for {name} saved',
  'admin.team.override.toast.cleared': 'Override for {name} removed',

  /* ── change role ────────────────────────────────────────────────────── */
  'admin.team.role.dialog.title': 'Change {name}’s role',
  'admin.team.role.dialog.current': 'Now {role}.',
  'admin.team.role.dialog.next': 'New role',
  'admin.team.role.dialog.pick': 'Choose a role',
  'admin.team.role.dialog.note': 'Their override is removed. Permissions come from the new role.',
  'admin.team.role.dialog.confirm': 'Change role',
  'admin.team.role.toast.changed': '{name} is now {role}',

  /* ── §11.2 refusals. A dead control owes the operator a sentence ────── */
  'admin.team.refusal.lastManageTeamHolder':
    'This is the last active operator who can administer the team. Give someone else that permission first.',
  'admin.team.refusal.notInvited': 'This operator has already signed in, so there is no invitation to act on.',
  'admin.team.refusal.notActive': 'Only an active operator can be suspended.',
  'admin.team.refusal.notSuspended': 'Only a suspended operator can be reinstated.',
  'admin.team.refusal.noPermission':
    'You cannot administer operators. Ask an Owner for the “Team administration” permission.',

  /* ── confirmations ──────────────────────────────────────────────────── */
  'admin.team.confirm.revoke.title': 'Revoke {name}’s invitation?',
  'admin.team.confirm.revoke.body':
    'The link stops working and the record is removed. Nothing they have done is affected, because they have never signed in.',
  'admin.team.confirm.revoke.action': 'Revoke invitation',
  'admin.team.confirm.suspend.title': 'Suspend {name}?',
  'admin.team.confirm.suspend.body':
    'They cannot sign in until they are reinstated. Their record, their claims and their history stay as they are.',
  'admin.team.confirm.suspend.action': 'Suspend operator',
  'admin.team.confirm.offboard.title': 'Offboard {name}?',
  'admin.team.confirm.offboard.body':
    'The record leaves the roster and cannot be restored from this screen. Their entries in the activity log stay.',
  'admin.team.confirm.offboard.action': 'Offboard operator',
  'admin.team.confirm.reason.label': 'Reason',
  'admin.team.confirm.reason.help': 'Recorded on the audit entry beside your name.',
  'admin.team.confirm.reason.message': 'Say why. This is what the audit entry will carry.',
  'admin.team.confirm.cancel': 'Cancel',
  'admin.team.confirm.holding': 'They hold {count} items. Those return to Unassigned.',

  /* ── invite ─────────────────────────────────────────────────────────── */
  'admin.team.invite.title': 'Invite an operator',
  'admin.team.invite.desc':
    'They receive a link that expires in seven days. Permissions come from the role and can be changed afterwards.',
  'admin.team.invite.name': 'Full name',
  'admin.team.invite.email': 'Work email',
  'admin.team.invite.phone': 'Mobile',
  'admin.team.invite.role': 'Role',
  'admin.team.invite.cap': 'Compensation cap (SAR)',
  'admin.team.invite.capHelp': 'The most they may credit a rider wallet without a second approval. Blank means no cap.',
  'admin.team.invite.send': 'Send invitation',
  'admin.team.invite.sending': 'Sending…',
  'admin.team.invite.nameRequired': 'A name is required.',
  'admin.team.invite.emailRequired': 'A work email is required.',
  'admin.team.invite.emailTaken': 'An operator already exists with that email.',
  'admin.team.invite.sentTitle': 'Invitation sent to {name}',
  'admin.team.invite.sentBody': 'It expires in seven days. Copy the link if email is not where they will look.',
  'admin.team.invite.link': 'Invite link',
  'admin.team.invite.preview': 'What they will see',
  'admin.team.invite.copyLink': 'Copy invite link',
  'admin.team.invite.copied': 'Link copied',
  'admin.team.invite.done': 'Done',
  'admin.team.invite.expiresIn': 'Invite expires in {days} days',
  'admin.team.invite.expiresToday': 'Invite expires today',
  'admin.team.invite.expired': 'Invite expired',

  /* ── sessions (P6-T8) ───────────────────────────────────────────────── */
  'admin.team.sessions.title': 'Sessions — {name}',
  'admin.team.sessions.desc': 'Where this operator is signed in right now.',
  'admin.team.sessions.empty': 'Signed in on no device.',
  'admin.team.sessions.thisDevice': 'This device',
  'admin.team.sessions.trusted': 'Trusted until {date}',
  'admin.team.sessions.untrusted': 'Not trusted',
  'admin.team.sessions.signOut': 'Sign out',
  'admin.team.sessions.confirm': 'End this session',
  'admin.team.sessions.cancel': 'Keep it',
  'admin.team.sessions.close': 'Close',
  'admin.team.sessions.error': 'Sessions could not be loaded.',
  'admin.team.sessions.loading': 'Loading sessions…',

  /* ── the permission matrix ──────────────────────────────────────────── */
  'admin.team.matrix.title': 'Role permission matrix',
  'admin.team.matrix.desc':
    'What each role can do.',
  'admin.team.matrix.capability': 'Capability',
  'admin.team.matrix.granted': 'Granted',
  'admin.team.matrix.withheld': 'Withheld',
  'admin.team.matrix.fixed': 'Built-in roles are fixed.',

  /* ── security & session policy ──────────────────────────────────────── */
  'admin.team.security.title': 'Security & session policy',
  'admin.team.security.desc': 'Applies to every operator, including you.',
  'admin.team.security.twoFactor': 'Require a second factor',
  'admin.team.security.twoFactorDesc':
    'Operators without one enrol at their next sign-in rather than being locked out.',
  'admin.team.security.idle': 'Idle session timeout',
  'admin.team.security.idleHelp': 'Between 5 and 240 minutes.',
  'admin.team.security.idleOption': '{minutes} minutes',
  'admin.team.security.expiry': 'Absolute session expiry',
  'admin.team.security.expiryOption': '{hours} hours',
  'admin.team.security.readOnly':
    'You can read the security policy and change none of it. Ask an Owner for the “Security policy” permission.',

  /* ── sessions & devices pane (D20) ─────────────────────────────────── */
  'admin.team.sessionsPane.title': 'Sessions & devices',
  'admin.team.sessionsPane.hint': 'Every device an operator is signed in on. Ending a session signs that device out now.',
  'admin.team.sessionsPane.count': '{count} sessions',
  'admin.team.sessionsPane.empty': 'Nobody is signed in on any device.',
  'admin.team.sessionsPane.column.device': 'Device',
  'admin.team.sessionsPane.column.lastActive': 'Last active',
  'admin.team.sessionsPane.column.trust': 'Trust',
  'admin.team.sessionsPane.end': 'End session',

  /* ── on-call rota ───────────────────────────────────────────────────── */
  'admin.team.rota.title': 'On-call rota',
  'admin.team.rota.desc': 'Who takes an incident out of hours. Only an active operator can be on call.',
  'admin.team.rota.primary': 'Primary',
  'admin.team.rota.secondary': 'Secondary',
  'admin.team.rota.nobody': 'Nobody',
  'admin.team.rota.option': '{name} · {role}',

  /* ── the four states ────────────────────────────────────────────────── */
  'admin.team.empty.heading': 'Everyone who can sign in, and what each may do',
  'admin.team.empty.body':
    'Invite the people who run dispatch, finance and support. Each one gets a role, a permission set and a compensation cap.',
  'admin.team.error': 'The roster, the security policy or the rota could not be loaded.',

  /* ── the save bar ───────────────────────────────────────────────────── */
  'admin.team.entity': 'Security policy and rota',
  'admin.team.saved': 'Security policy and rota saved',
  'admin.team.discarded': 'Changes discarded',

  /* ── toasts ─────────────────────────────────────────────────────────── */
  'admin.team.toast.invited': 'Invitation sent to {name}',
  'admin.team.toast.resent': 'Invitation resent to {name}',
  'admin.team.toast.revoked': '{name}’s invitation revoked',
  'admin.team.toast.suspended': '{name} suspended',
  'admin.team.toast.reinstated': '{name} reinstated',
  'admin.team.toast.offboarded': '{name} offboarded',
  'admin.team.toast.sessionRevoked': 'Session ended',
  'admin.team.toast.failed': '{reason}',

  /* ── LocalisedText minted by clients/team.ts. Guarded by the i18n test ── */
  'admin.audit.team.invited': 'Invited {name} as {role}',
  'admin.audit.team.inviteResent': 'Resent {name}’s invitation (resend {count})',
  'admin.audit.team.inviteRevoked': 'Revoked {name}’s invitation',
  'admin.audit.team.suspended': 'Suspended {name}. {released} held items returned to Unassigned',
  'admin.audit.team.reinstated': 'Reinstated {name}',
  'admin.audit.team.offboarded': 'Offboarded {name} ({role})',
  'admin.audit.team.sessionRevoked': 'Ended a session for {name} on device {device}',
  'admin.audit.team.securityPolicy':
    'Security policy saved — idle {idleMinutes} min, absolute expiry {expiryHours} h, second-factor requirement changed: {twoFactor}',
  'admin.audit.team.rota': 'On-call rota saved — primary {primary}',
  'admin.audit.team.roleChanged': 'Changed {name}’s role from {from} to {to}',
  'admin.audit.team.capChanged': 'Changed {name}’s compensation cap',
  'admin.audit.team.overrideChanged':
    'Changed {name}’s override to {granted} granted and {revoked} revoked. It was {wasGranted} and {wasRevoked}.',
  'admin.audit.role.created': 'Created the role {name} from {basedOn} with {count} permissions',
  'admin.audit.role.updated': 'Changed the role {name}: {added} added, {removed} removed',
  'admin.audit.role.deleted': 'Deleted the role {name}',
}
