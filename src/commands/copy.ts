/**
 * The command centre's own copy — **P3-T5 … P3-T9**,
 * `design/05-command-centre.md`, **D18**, **D21**.
 *
 * ## Why this file exists rather than more keys in `shell`
 *
 * §5's `shell.search.*` block is the copy of a **search field**: a prompt, a
 * no-match sentence, an escape hatch. Everything here belongs to the surface
 * that field grew into — the chips, the three steps, the four blocks at rest,
 * and the undo contract on the outcome toast. Keeping them apart is not
 * tidiness: `shell.search.*` is owned by the shell agent and this block is
 * owned by whoever owns `src/commands`, and a single block would give two
 * owners one file.
 *
 * The screen convention is followed exactly (`screens/**\/copy.ts`): a module
 * exports a `Dictionary`, `i18n/dictionaries.ts` spreads it, and adding a
 * module never edits another module's strings.
 *
 * ## The `people.*` keys at the bottom, and why they are not in `people/copy.ts`
 *
 * **They are command copy, not screen copy.** `people/copy.ts` already holds
 * every label, refusal and confirmation `captains.ts` renders, including
 * **D21's three `.blocked.all` sentences** — which existed unused until this
 * task wired the predicates to them. The four keys added here are the ones
 * **D18** requires and nothing had yet: the sentence the *second* toast states
 * when an inverse succeeds, and the sentence the toast states **in place** when
 * it fails.
 *
 * They are namespaced `people.toast.*` so they sit with their siblings in the
 * merged dictionary, and they are declared here because
 * `screens/operations/people/` has a different owner. **Raised in the handoff:
 * they should move next to `people.toast.suspended.one`, and this file should
 * then hold only `command.*`.**
 *
 * ## Rules
 *
 *   R9 / §5.7   a toast is ONE LINE, names the object, <= 60 characters, no
 *               period, no exclamation, no "successfully".
 *   AC-75       no concatenation. Every count and every name is a NAMED
 *               placeholder inside a single key.
 *   AC-74       every string an operator reads resolves through a key here.
 *   §5.7        a section heading is a NOUN, a command row is a VERB PHRASE.
 */

import type { Dictionary } from '@/lib'

export const COMMANDS_EN: Dictionary = {
  /* ── the four blocks at rest (P3-T8, §4) ───────────────────────────────
     Order is the spec's, and the headings say what the block IS rather than
     what it is for: an operator scanning a list at rest reads nouns. */
  'command.block.onScreen': 'On this screen',
  'command.block.queues': 'Queues',
  'command.block.resume': 'Resume',
  'command.block.recent': 'Recent commands',
  /* The fifth block, and the reason the surface is a command CENTRE at rest.
     Route commands are not declared yet and a fresh session has no recents,
     so before this existed an operator who pressed the shortcut and typed
     nothing was offered five queues and no way to reach anything else. */
  'command.block.goTo': 'Go to',
  /* §5's own two headings keep their keys (`shell.search.destinations`,
     `shell.search.records`); `Do` is the third section CQ-2 orders against. */
  'command.block.do': 'Do ({count})',

  /* ── the chips (P3-T6, §3) ─────────────────────────────────────────────
     One removable chip per committed step. The label is the command's own
     title or the target's own name, so this key names only the CONTROL. */
  'command.chip.remove': 'Remove {label}',

  /* ── the target step (P3-T6) ───────────────────────────────────────────
     A heading, because the list under it is no longer search results — it is
     the candidates for one command, and saying so is what stops the step
     reading like a search that lost its other sections. */
  'command.target.heading': 'Choose a target',
  'command.target.prompt': 'Type a name or an id',
  'command.target.noMatch': 'No {entity} match "{query}".',

  /* ── the confirm step (P3-T6, §3) ──────────────────────────────────────
     The consequence sentence is the COMMAND's (it is the same sentence the
     row-action modal states, from the same key), so these are the two strings
     the palette owns: the hint and the way back. */
  'command.confirm.hint': 'Enter to confirm',
  'command.confirm.cancel': 'Cancel',
  'command.confirm.reasonPlaceholder': 'Type the reason',
  'command.confirm.working': 'Working',

  /* ── refusals (§11.2) ──────────────────────────────────────────────────
     A refused command is DISABLED IN PLACE with its reason as real text on a
     second line, never filtered out and never a tooltip. The reason itself
     comes from `command.unavailable`; this key labels the fact for a screen
     reader, which cannot see the second line's proximity. */
  'command.refused': 'Unavailable: {reason}',
  /* **D21's escape hatch**, offered only when the screen published a way to
     change its own selection. Never a partial apply — it narrows what is
     selected and leaves the command to be pressed again. */
  'command.selectEligible': 'Select only the {count} eligible',

  /* ── undo on the outcome toast (P3-T9, D18) ────────────────────────────
     One control, labelled `Undo`. Never an icon, never `Cancel` — `Cancel`
     reads as *stop the thing in progress*, and the thing is already done. */
  'command.undo': 'Undo',
  /* D18: the failed reversal offers `Try again` EXACTLY ONCE, then a link to
     the record. The console stops promising something it has failed at twice. */
  'command.undo.retry': 'Try again',
  'command.undo.openRecord': 'Open the record',

  /* ── queue rows (P3-T8 block ②) ────────────────────────────────────────
     The row renders the sub-tab's own title from the route table; this labels
     the count beside it for assistive technology, because a bare number next
     to a title reads as part of the title. */
  'command.queue.count': '{count} waiting',

  /* ── the entity noun, for a chip over a set (P3-T7) ────────────────────
     `[2 captains]`. One key per entity type that has commands, with the
     singular handled by the record's own name — a chip for one captain reads
     `Nora Al-Harbi`, not `1 captain`, because the operator picked a person. */
  'command.entity.driver.other': '{count} captains',
  'command.entity.driver.plural': 'captains',

  /* ── the whole surface, for assistive technology ───────────────────────── */
  'command.palette.label': 'Command centre',

  /* ══════════════════════════════════════════════════════════════════════
     D18's toast pair. See the header for why these four are not in
     `screens/operations/people/copy.ts` yet.

     R9 — one line, names the object, no period. The SECOND toast carries no
     undo of its own: an undo of an undo is a loop with no floor.

     The failure sentence states **what is still true**, not that something
     "failed": D18 requires the original action's effect to stay on screen
     because it is still the truth, and `Nora Al-Harbi is still suspended` is
     that truth in the operator's own terms. The server's reason, when there is
     one, renders as the toast's second line and is not part of this key.
     ══════════════════════════════════════════════════════════════════════ */
  'people.toast.suspended.undone.one': 'Suspension reverted for {name}',
  'people.toast.suspended.undone.other': 'Suspension reverted for {count} captains',
  'people.toast.suspended.undoFailed.one': '{name} is still suspended',
  'people.toast.suspended.undoFailed.other': '{count} captains are still suspended',
  'people.toast.reinstated.undone.one': 'Reinstatement reverted for {name}',
  'people.toast.reinstated.undone.other': 'Reinstatement reverted for {count} captains',
  'people.toast.reinstated.undoFailed.one': '{name} is active again',
  'people.toast.reinstated.undoFailed.other': '{count} captains are active again',

  /* ======================================================================
     PHASE C-5 - the four domains added beyond captains.

     Every key below is NEW. Not one of them shadows a screen's own string:
     `dictionaries.ts` spreads `COMMANDS_EN` BEFORE every screen module, so a
     collision would silently hand the screen's value to the command and the
     drift would be invisible. `domains.test.ts` asserts the disjointness
     mechanically rather than trusting this paragraph.

     They live here, namespaced under their domain's prefix, for the reason the
     header already gives for the `people.toast.*` block: they are COMMAND copy
     (a refusal over a SET, a confirmation the screen never had to state, the
     second toast an undo produces) and the screen files that would otherwise
     hold them have different owners. **Raised in the handoff:** each block
     should move next to its siblings once those files are free, at which point
     this file holds only `command.*`.

     R9    a toast is ONE LINE, names the object, <= 60 characters, no period,
           no exclamation, no "successfully".
     R6    a REFUSAL is a sentence and takes a full stop; a toast is not and
           does not.
     AC-75 no concatenation. Every count is a named placeholder in one key.
     ====================================================================== */

  /* -- the entity nouns, for a chip and a no-match line over a set -------
     `[3 trips]`, and `No tickets match "..."`. One pair per entity type that
     now has a target source; the singular is the record's own name or id,
     because the operator picked a record and not a quantity. */
  'command.entity.trip.other': '{count} trips',
  'command.entity.trip.plural': 'trips',
  'command.entity.applicant.other': '{count} applications',
  'command.entity.applicant.plural': 'applications',
  'command.entity.ticket.other': '{count} tickets',
  'command.entity.ticket.plural': 'tickets',
  'command.entity.subscription.other': '{count} subscriptions',
  'command.entity.subscription.plural': 'subscriptions',

  /* -- trips (D18's toast pair) ------------------------------------------
     The forward toasts, the refusals and the flag form all already exist in
     `screens/operations/trips/copy.ts`; these four pairs are the ones D18
     requires and nothing had.

     The failure sentence states **what is still true**, never that something
     "failed": the original action's effect stays on screen because it is still
     the truth, and `TRP-1042 is still flagged` is that truth in the operator's
     own terms. */
  'trips.toast.flagged.undone.one': 'Flag reverted on {id}',
  'trips.toast.flagged.undone.other': 'Flag reverted on {count} trips',
  'trips.toast.flagged.undoFailed.one': '{id} is still flagged',
  'trips.toast.flagged.undoFailed.other': '{count} trips are still flagged',
  'trips.toast.unflagged.undone.one': '{id} is flagged again',
  'trips.toast.unflagged.undone.other': '{count} trips are flagged again',
  'trips.toast.unflagged.undoFailed.one': '{id} is not flagged',
  'trips.toast.unflagged.undoFailed.other': '{count} trips are not flagged',

  /* -- captain applications ---------------------------------------------
     **D21's three sentences** for the two decisions, which the screen never
     needed because it has no bulk bar over applications and the palette does.
     `.all` is the one that changes what the operator does next: `.other` on a
     3-of-3 selection is true and invites them to deselect a few when there is
     nothing to deselect to. */
  'people.action.approve.decided.one': 'This application has already been decided.',
  'people.action.approve.decided.other':
    '{count} of the selected applications have already been decided.',
  'people.action.approve.decided.all':
    'All {count} selected applications have already been decided.',
  'people.action.reject.decided.one': 'This application has already been decided.',
  'people.action.reject.decided.other':
    '{count} of the selected applications have already been decided.',
  'people.action.reject.decided.all':
    'All {count} selected applications have already been decided.',

  /* §11.2 at RENDER, restating `approveApplicant`'s 422 rather than waiting
     for it. §5.7 rule 4 - an error is an imperative that names the fix, with
     no "please", no "invalid" and no blame. The one-target sentence carries no
     count deliberately: `Translate` has no plural selector, and `1 documents`
     is the sentence a count-carrying key produces at one. */
  'people.action.approve.blocked.one': 'Verify every document on this application first.',
  'people.action.approve.blocked.other':
    '{count} of the selected applications still have documents to verify.',
  'people.action.approve.blocked.all':
    'All {count} selected applications still have documents to verify.',

  /* §5.3 - the title states the verb and the count, the body states the
     consequence AND what will not change, and the primary repeats the verb.
     `Approve` had no confirmation at all on the screen; D8's *"a one-click
     approve is a one-click irreversible act"* is why it has one here. */
  'people.confirm.approve.title.one': 'Approve {name}?',
  'people.confirm.approve.title.other': 'Approve {count} applications?',
  'people.confirm.approve.body':
    'The applicant becomes a captain and is told. Their documents and their history stay on file, and the approval cannot be undone from here.',
  'people.confirm.approve.confirm': 'Approve application',
  'people.confirm.approve.confirm.other': 'Approve applications',
  /* The screen's `people.reject.title` names one applicant; a set has no name
     to give, so it gets the count instead. */
  'people.reject.title.other': 'Reject {count} applications?',
  'people.reject.confirm.other': 'Reject applications',
  'people.toast.approved.other': '{count} applications approved',
  'people.toast.rejected.other': '{count} applications rejected',

  /* -- support tickets --------------------------------------------------
     The two PRECISE singular refusals stay in `screens/support/tickets/copy.ts`
     and are reused as they are: `{name} already owns this ticket.` and
     `A closed ticket is not claimed. Reopen it first.` lead somewhere
     different, and collapsing them into one family would have thrown away the
     half that says what to do next. Only the SET sentences are new. */
  'ticket.action.claim.blocked.other':
    '{count} of the selected tickets are already claimed or closed.',
  'ticket.action.claim.blocked.all':
    'All {count} selected tickets are already claimed or closed.',
  'ticket.action.resolve.blocked.other':
    '{count} of the selected tickets are already resolved.',
  'ticket.action.resolve.blocked.all': 'All {count} selected tickets are already resolved.',

  /* `Reopen` is declared although no screen shows it - §11.2's `:4113`
     argument and D18's clause (a). See `commands/tickets.ts`. */
  'ticket.action.reopen': 'Reopen',
  'ticket.action.reopen.blocked.open': 'This ticket is {status}, so there is nothing to reopen.',
  'ticket.action.reopen.blocked.other': '{count} of the selected tickets are not resolved.',
  'ticket.action.reopen.blocked.all': 'None of the {count} selected tickets is resolved.',
  'ticket.action.reopen.blocked.permission':
    'You cannot reopen tickets. Ask an Owner for the “Ticket handling” permission.',

  'ticket.toast.claimed.other': '{count} tickets are yours',
  'ticket.toast.resolved.other': '{count} tickets resolved',
  'ticket.toast.reopened': '{id} is open again',
  'ticket.toast.reopened.other': '{count} tickets are open again',
  /* D18's pair. `reopenTicket` returns a ticket to `open` rather than to
     whatever it was before it was resolved, so the copy says `is open again`
     and never `restored` - the console does not claim an accuracy the data
     layer does not have. */
  'ticket.toast.resolved.undone.one': '{id} is open again',
  'ticket.toast.resolved.undone.other': '{count} tickets are open again',
  'ticket.toast.resolved.undoFailed.one': '{id} is still resolved',
  'ticket.toast.resolved.undoFailed.other': '{count} tickets are still resolved',
  'ticket.toast.reopened.undone.one': '{id} is resolved again',
  'ticket.toast.reopened.undone.other': '{count} tickets are resolved again',
  'ticket.toast.reopened.undoFailed.one': '{id} is still open',
  'ticket.toast.reopened.undoFailed.other': '{count} tickets are still open',

  /* -- subscriptions ----------------------------------------------------
     `subs.action.cancel.blocked.one` already exists. The two set sentences are
     declared even though `subscription.cancel` is `plural: false` and no
     surface can hand it a set today: the predicate is what a later
     `plural: true` would run, and a missing `.all` is invisible until the day
     someone flips that line. */
  'subs.action.cancel.blocked.other':
    '{count} of the selected subscriptions are already cancelled or expired.',
  'subs.action.cancel.blocked.all':
    'All {count} selected subscriptions are already cancelled or expired.',

  /* ── pal/registry ─────────────────────────────────────────────────────
     F6 — the registry from 13 commands to 43, across ten domains. Every key
     below belongs to a command declared in `src/commands/<domain>.ts`; none of
     them is a screen's, which is what `domains.test.ts` asserts.

     R9 / §5.7  a toast is ONE LINE, names the object, no period.
     AC-75      one key, named placeholders, never concatenation.
     D21        every `.blocked` family carries `.one`, `.other` AND `.all`. */

  /* the nouns the target step and the chip render */
  'command.entity.request.other': '{count} requests',
  'command.entity.request.plural': 'requests',
  'command.entity.wallet.other': '{count} wallets',
  'command.entity.wallet.plural': 'wallets',
  'command.entity.complaint.other': '{count} complaints',
  'command.entity.complaint.plural': 'complaints',
  'command.entity.operator.other': '{count} colleagues',
  'command.entity.operator.plural': 'colleagues',
  'command.entity.plan.other': '{count} plans',
  'command.entity.plan.plural': 'plans',

  /* ── dispatch (requests.ts) ──────────────────────────────────────────── */
  'request.action.claimNext': 'Claim the next request',
  'request.bulk.claimNext': 'Claim next',
  'request.action.claim': 'Claim request',
  'request.action.assign': 'Assign a captain',
  'request.bulk.assign': 'Assign',
  'request.action.expire': 'Close request',
  'request.bulk.expire': 'Close',
  'request.action.noPermission':
    'You cannot act on requests. Ask an Owner for the “Dispatch” permission.',

  'request.action.claim.blocked.one': 'This request is closed or already claimed.',
  'request.action.claim.blocked.other':
    '{count} of the selected requests are closed or already claimed.',
  'request.action.claim.blocked.all':
    'All {count} selected requests are closed or already claimed.',
  'request.action.assign.blocked.one': 'This request is already assigned, expired or cancelled.',
  'request.action.assign.blocked.other':
    '{count} of the selected requests are already assigned, expired or cancelled.',
  'request.action.assign.blocked.all':
    'All {count} selected requests are already assigned, expired or cancelled.',
  'request.action.expire.blocked.one': 'This request is already closed.',
  'request.action.expire.blocked.other': '{count} of the selected requests are already closed.',
  'request.action.expire.blocked.all': 'All {count} selected requests are already closed.',

  'request.assign.title': 'Assign a captain to {id}?',
  /* §5.7 rule 9 — what will NOT change, alongside what will. The subscription
     line names the capture because that is the one disposition where money
     moves (§5.1). */
  'request.assign.body.instant':
    'The captain is notified and the ride starts from their app. The quoted fare is an estimate and nothing is charged yet.',
  'request.assign.body.subscription':
    'The rider’s authorisation hold is captured and the subscription starts. The capture cannot be undone from here; the plan and its price do not change.',
  'request.assign.confirm': 'Assign captain',
  'request.assign.choice': 'Captain',
  'request.assign.choice.help': 'Active captains only.',
  'request.assign.choice.message': 'Choose a captain.',
  'request.assign.choice.placeholder': 'Search captains…',
  'request.assign.choice.empty': 'No captain is active right now.',

  'request.expire.title': 'Close {id} with no captain?',
  'request.expire.title.other': 'Close {count} requests with no captain?',
  'request.expire.body':
    'The rider is told no captain was found and nothing is charged. The request cannot be reopened; they would have to ask again.',
  'request.expire.confirm': 'Close request',

  'request.toast.nothingWaiting': 'No request is waiting to be claimed',
  'request.toast.claimedNext': '{id} is yours · {rider}',
  'request.toast.claimed': '{id} is yours',
  'request.toast.claimed.other': '{count} requests are yours',
  'request.toast.assigned': '{id} assigned to {captain}',
  'request.toast.expired': '{id} closed',
  'request.toast.expired.other': '{count} requests closed',

  /* ── rider wallets (wallets.ts) ──────────────────────────────────────── */
  'wallet.action.adjust': 'Adjust wallet balance',
  'wallet.bulk.adjust': 'Adjust',
  'wallet.action.goodwill': 'Credit goodwill',
  'wallet.bulk.goodwill': 'Goodwill',
  'wallet.action.noPermission':
    'You cannot move wallet balances. Ask an Owner for the “Wallet adjustments” permission.',

  'wallet.adjust.title': 'Adjust {rider}’s wallet?',
  'wallet.adjust.body':
    'The balance moves and the rider can spend it on their next ride. Nothing is charged and no refund is issued. Your {role} ceiling is {cap} per adjustment.',
  'wallet.adjust.confirm': 'Adjust balance',
  'wallet.adjust.amount.label': 'Amount',
  'wallet.adjust.amount.help': 'Up to {cap} on one adjustment.',
  'wallet.adjust.amount.message': 'Above the {role} ceiling of {cap}. Lower the amount.',
  'wallet.adjust.reason.label': 'Reason code',
  'wallet.adjust.reason.help': 'What this credit is for. It appears on the rider’s statement.',
  'wallet.adjust.reason.message': 'Enter a reason code.',

  'wallet.goodwill.title': 'Credit goodwill to {rider}?',
  'wallet.goodwill.body':
    'The credit lands in the rider’s wallet and is spent on their next ride. It is not a refund: nothing is returned and no credit note is issued. Your {role} ceiling is {cap} per credit.',
  'wallet.goodwill.confirm': 'Credit goodwill',
  'wallet.goodwill.amount.label': 'Credit',
  'wallet.goodwill.reason.label': 'What happened',
  'wallet.goodwill.reason.help': 'One line, for the goodwill ledger and the audit trail.',
  'wallet.goodwill.reason.message': 'Say what happened.',

  'wallet.toast.adjusted': '{amount} credited to {rider}',
  'wallet.toast.goodwill': '{amount} goodwill credited to {rider}',
  /* AC-386 — above the second-approval threshold the posting waits. The toast
     says which of the two happened rather than claiming money moved. */
  'wallet.toast.pending': '{amount} for {rider} is waiting for a second approver',

  /* ── safety incidents (safety.ts) ────────────────────────────────────── */
  'incident.action.claim': 'Respond to incident',
  /* Not `Suspend captain`: **CM-2** reserves that literal for
     `people.action.suspend`, and this is a different act with a different
     inverse — the captain stops receiving rides, their account is untouched. */
  'incident.action.suspend': 'Take the captain off dispatch',
  'incident.bulk.suspend': 'Off dispatch',
  'incident.action.close': 'Close incident',
  'incident.bulk.close': 'Close',
  'incident.action.noPermission':
    'You cannot act on safety incidents. Ask an Owner for the “Safety” permission.',

  'incident.action.claim.blocked.one': 'This incident is already closed.',
  'incident.action.claim.blocked.other': '{count} of the selected incidents are already closed.',
  'incident.action.claim.blocked.all': 'All {count} selected incidents are already closed.',
  'incident.action.suspend.blocked.one': 'This incident is closed, or it names nobody to suspend.',
  'incident.action.suspend.blocked.other':
    '{count} of the selected incidents are closed or name nobody to suspend.',
  'incident.action.suspend.blocked.all':
    'All {count} selected incidents are closed or name nobody to suspend.',
  'incident.action.close.blocked.closed': 'This incident is already closed.',
  /* Legacy put this in a `title` attribute (`:13437`); §5.7 confines a tooltip
     to naming a control, so it renders as text and names the count. */
  'incident.action.close.blocked.protocol':
    '{count} protocol steps are still outstanding on this incident.',
  'incident.action.close.blocked.one': 'This incident cannot be closed yet.',
  'incident.action.close.blocked.other':
    '{count} of the selected incidents are closed or have protocol steps outstanding.',
  'incident.action.close.blocked.all':
    'All {count} selected incidents are closed or have protocol steps outstanding.',

  'incident.suspend.title': 'Take {captain} off dispatch?',
  'incident.suspend.body':
    'They stop receiving rides while this is investigated. Their account, their trips and their earnings are untouched, and nothing about the incident is decided by this.',
  /* §5.3 — the primary repeats the verb in the title above it. */
  'incident.suspend.confirm': 'Take off dispatch',
  'incident.suspend.reason.label': 'Reason',
  'incident.suspend.reason.help': 'The captain is shown this.',
  'incident.suspend.reason.message': 'Enter a reason.',

  'incident.close.title': 'Close incident {id}?',
  'incident.close.title.other': 'Close {count} incidents?',
  'incident.close.body':
    'The record is finalised and nothing in the console reopens it. The protocol, the notes and any suspension stay exactly as they are.',
  'incident.close.confirm': 'Close incident',

  'incident.toast.claimed': '{id} is yours',
  'incident.toast.claimed.other': '{count} incidents are yours',
  'incident.toast.suspended': '{captain} is off dispatch',
  'incident.toast.closed': '{id} closed',
  'incident.toast.closed.other': '{count} incidents closed',

  /* ── cash reports (cash.ts) ──────────────────────────────────────────── */
  'cashReport.action.resolve': 'Approve cash report',
  'cashReport.bulk.resolve': 'Approve',
  'cashReport.action.escalate': 'Escalate to Trust & Safety',
  'cashReport.bulk.escalate': 'Escalate',
  'cashReport.action.noPermission':
    'You cannot decide cash reports. Ask an Owner for the “Cash reconciliation” permission.',

  'cashReport.action.resolve.blocked.one': 'This report has already been decided.',
  'cashReport.action.resolve.blocked.other':
    '{count} of the selected reports have already been decided.',
  'cashReport.action.resolve.blocked.all':
    'All {count} selected reports have already been decided.',
  'cashReport.action.escalate.blocked.one': 'This report has already been decided.',
  'cashReport.action.escalate.blocked.other':
    '{count} of the selected reports have already been decided.',
  'cashReport.action.escalate.blocked.all':
    'All {count} selected reports have already been decided.',

  'cashReport.reason.label': 'Reason',
  'cashReport.reason.help': 'Why you decided it this way. It goes on the captain’s record.',
  'cashReport.reason.message': 'Enter a reason.',
  'cashReport.resolve.title': 'Approve {id} from {captain}?',
  'cashReport.resolve.body':
    'The report is settled and the row stays in the list showing your decision. The {debt} already added to their ledger stays there either way.',
  'cashReport.resolve.confirm': 'Approve report',
  'cashReport.escalate.title': 'Escalate {id} from {captain}?',
  'cashReport.escalate.body':
    'This flags {captain} for a Trust & Safety investigation and cannot be undone from here. The {debt} already added to their ledger stays there regardless of the outcome.',
  'cashReport.escalate.confirm': 'Escalate report',
  'cashReport.toast.resolved': '{id} approved',
  'cashReport.toast.escalated': '{id} escalated · {captain}',

  /* ── complaints (complaints.ts) ──────────────────────────────────────── */
  'complaint.action.uphold': 'Uphold complaint',
  'complaint.bulk.uphold': 'Uphold',
  'complaint.action.dismiss': 'Dismiss complaint',
  'complaint.bulk.dismiss': 'Dismiss',
  'complaint.action.noPermission':
    'You cannot decide complaints. Ask an Owner for the “Complaint handling” permission.',

  'complaint.action.uphold.blocked.one': 'This complaint is already resolved or withdrawn.',
  'complaint.action.uphold.blocked.other':
    '{count} of the selected complaints are already resolved or withdrawn.',
  'complaint.action.uphold.blocked.all':
    'All {count} selected complaints are already resolved or withdrawn.',
  'complaint.action.dismiss.blocked.one': 'This complaint is already resolved or withdrawn.',
  'complaint.action.dismiss.blocked.other':
    '{count} of the selected complaints are already resolved or withdrawn.',
  'complaint.action.dismiss.blocked.all':
    'All {count} selected complaints are already resolved or withdrawn.',

  'complaint.note.label': 'Note',
  'complaint.note.help': 'What you decided and why. It stays on the record.',
  'complaint.note.message': 'Enter a note.',
  'complaint.uphold.title': 'Uphold {id} from {rider}?',
  'complaint.uphold.body':
    'The rider is compensated from your authority and the complaint closes. {captain}’s rating and standing are not decided by this. A fairness case decides those.',
  'complaint.uphold.confirm': 'Uphold complaint',
  'complaint.uphold.amount.label': 'Compensation',
  'complaint.uphold.amount.help': 'Up to {cap}. Leave it at zero to uphold without paying.',
  'complaint.uphold.amount.message': 'Above the {role} ceiling of {cap}. Lower the amount.',
  'complaint.dismiss.title': 'Dismiss {id} from {rider}?',
  'complaint.dismiss.body':
    'The complaint closes with no compensation and {rider} is told the outcome. Nothing on the captain’s record changes.',
  'complaint.dismiss.confirm': 'Dismiss complaint',
  'complaint.toast.upheld': '{id} upheld · {amount}',
  'complaint.toast.dismissed': '{id} dismissed',

  /* ── disputes (disputes.ts) ──────────────────────────────────────────── */
  'dispute.action.refund': 'Refund the claim',
  'dispute.bulk.refund': 'Refund',
  'dispute.action.decline': 'Decline the claim',
  'dispute.bulk.decline': 'Decline',
  'dispute.action.noPermission':
    'You cannot settle disputes. Ask an Owner for the “Dispute handling” permission.',

  'dispute.action.refund.blocked.one': 'This dispute is already resolved.',
  'dispute.action.refund.blocked.other': '{count} of the selected disputes are already resolved.',
  'dispute.action.refund.blocked.all': 'All {count} selected disputes are already resolved.',
  'dispute.action.decline.blocked.one': 'This dispute is already resolved.',
  'dispute.action.decline.blocked.other': '{count} of the selected disputes are already resolved.',
  'dispute.action.decline.blocked.all': 'All {count} selected disputes are already resolved.',

  'dispute.note.label': 'Note',
  'dispute.note.help': 'What you decided and why. It stays on the claim.',
  'dispute.note.message': 'Enter a note.',
  'dispute.refund.title': 'Settle {id} for {amount}?',
  'dispute.refund.body':
    'The money is paid out now and cannot be recalled from here. The trip, the fare and the captain’s standing are unchanged.',
  'dispute.refund.confirm': 'Settle claim',
  'dispute.refund.amount.label': 'Settlement',
  'dispute.refund.amount.help': 'Up to the {claim} claimed. Lower it for a partial settlement.',
  'dispute.refund.amount.message': 'A settlement cannot exceed the {claim} claimed.',
  'dispute.decline.title': 'Decline {id}?',
  'dispute.decline.body':
    'No money moves and the claim closes. The claimant is told the outcome; nothing on the trip or the captain changes.',
  'dispute.decline.confirm': 'Decline claim',
  'dispute.toast.refunded': '{id} settled · {amount}',
  /* `dispute.toast.declined` is NOT declared here. `DisputesScreen` already
     owns it — `{id} declined — no money moved` — and reusing a screen's key is
     correct where the command states the same fact; redeclaring it would be
     silently shadowed (`domains.test.ts`). */

  /* ── fairness cases (fairness.ts) ────────────────────────────────────── */
  'fairnessCase.action.overturn': 'Overturn the decision',
  'fairnessCase.bulk.overturn': 'Overturn',
  'fairnessCase.action.uphold': 'Uphold the decision',
  'fairnessCase.bulk.uphold': 'Uphold',
  'fairnessCase.action.noPermission':
    'You cannot decide fairness cases. Ask an Owner for the “Captain decisions” permission.',

  'fairnessCase.action.overturn.blocked.one': 'This case has already been decided.',
  'fairnessCase.action.overturn.blocked.other':
    '{count} of the selected cases have already been decided.',
  'fairnessCase.action.overturn.blocked.all':
    'All {count} selected cases have already been decided.',
  'fairnessCase.action.uphold.blocked.one': 'This case has already been decided.',
  'fairnessCase.action.uphold.blocked.other':
    '{count} of the selected cases have already been decided.',
  'fairnessCase.action.uphold.blocked.all': 'All {count} selected cases have already been decided.',

  'fairnessCase.rationale.label': 'Reason',
  'fairnessCase.rationale.help': 'The captain reads this. Say what decided it.',
  'fairnessCase.rationale.message': 'Enter a reason the captain can read.',
  'fairnessCase.overturn.title': 'Overturn {id} for {captain}?',
  'fairnessCase.overturn.body':
    'A suspension is lifted and a contested rating is left out of their average. Their trips, their earnings and the complaint behind the case are unchanged.',
  'fairnessCase.overturn.confirm': 'Overturn decision',
  'fairnessCase.uphold.title': 'Uphold {id} against {captain}?',
  'fairnessCase.uphold.body':
    'The original decision stands and the case closes. Nothing new is applied to the captain; the appeal simply ends.',
  'fairnessCase.uphold.confirm': 'Uphold decision',
  'fairnessCase.toast.overturned': '{id} overturned · {captain}',
  'fairnessCase.toast.upheld': '{id} upheld · {captain}',

  /* ── the team (team.ts) ──────────────────────────────────────────────── */
  'operator.action.suspend': 'Suspend colleague',
  'operator.bulk.suspend': 'Suspend',
  'operator.action.reinstate': 'Reinstate colleague',
  'operator.bulk.reinstate': 'Reinstate',
  'operator.action.resendInvite': 'Resend invitation',
  'operator.bulk.resendInvite': 'Resend',
  'operator.action.revokeInvite': 'Revoke invitation',
  'operator.bulk.revokeInvite': 'Revoke',
  'operator.action.offboard': 'Remove colleague',
  'operator.bulk.offboard': 'Remove',
  'operator.action.noPermission':
    'You cannot manage the team. Ask an Owner for the “Team management” permission.',

  'operator.action.suspend.blocked.one': 'This colleague is not active.',
  'operator.action.suspend.blocked.other': '{count} of the selected colleagues are not active.',
  'operator.action.suspend.blocked.all': 'None of the {count} selected colleagues is active.',
  'operator.action.reinstate.blocked.one': 'This colleague is not suspended.',
  'operator.action.reinstate.blocked.other':
    '{count} of the selected colleagues are not suspended.',
  'operator.action.reinstate.blocked.all': 'None of the {count} selected colleagues is suspended.',
  'operator.action.resendInvite.blocked.one': 'This colleague has no outstanding invitation.',
  'operator.action.resendInvite.blocked.other':
    '{count} of the selected colleagues have no outstanding invitation.',
  'operator.action.resendInvite.blocked.all':
    'None of the {count} selected colleagues has an outstanding invitation.',
  'operator.action.revokeInvite.blocked.one': 'This colleague has no outstanding invitation.',
  'operator.action.revokeInvite.blocked.other':
    '{count} of the selected colleagues have no outstanding invitation.',
  'operator.action.revokeInvite.blocked.all':
    'None of the {count} selected colleagues has an outstanding invitation.',
  'operator.action.offboard.blocked.one':
    'This colleague has not accepted their invitation. Revoke it instead.',
  'operator.action.offboard.blocked.other':
    '{count} of the selected colleagues have not accepted their invitation.',
  'operator.action.offboard.blocked.all':
    'None of the {count} selected colleagues has accepted their invitation.',

  'operator.reason.label': 'Reason',
  'operator.reason.help': 'It goes in the audit log beside your name.',
  'operator.reason.message': 'Enter a reason.',
  'operator.suspend.title': 'Suspend {name}?',
  'operator.suspend.title.other': 'Suspend {count} colleagues?',
  'operator.suspend.body':
    'They cannot sign in, and anything they were holding goes back to the queues. Their record, their history and everything they decided stay exactly as they are.',
  'operator.suspend.confirm': 'Suspend colleague',
  'operator.revokeInvite.title': 'Revoke {name}’s invitation?',
  'operator.revokeInvite.body':
    'The invitation to {email} stops working and the row leaves the roster. Nothing in the console puts it back; they would have to be invited again.',
  'operator.revokeInvite.confirm': 'Revoke invitation',
  'operator.offboard.title': 'Remove {name} from the team?',
  'operator.offboard.body':
    'They lose access, their claims go back to the queues and they come off the on-call rota. The audit log keeps every act they took. This cannot be undone.',
  'operator.offboard.confirm': 'Remove colleague',

  'operator.toast.suspended': '{name} is suspended',
  'operator.toast.suspended.other': '{count} colleagues are suspended',
  'operator.toast.reinstated': '{name} is active again',
  'operator.toast.reinstated.other': '{count} colleagues are active again',
  'operator.toast.invited': 'Invitation resent to {email}',
  'operator.toast.invited.other': '{count} invitations resent',
  'operator.toast.inviteRevoked': '{name}’s invitation is revoked',
  'operator.toast.offboarded': '{name} is removed from the team',

  /* ── subscription plans (pricing.ts) ─────────────────────────────────── */
  'plan.action.publish': 'Publish plan',
  'plan.bulk.publish': 'Publish',
  'plan.action.archive': 'Archive plan',
  'plan.bulk.archive': 'Archive',
  'plan.action.noPermission':
    'You cannot change plans. Ask an Owner for the “Pricing” permission.',

  'plan.action.publish.blocked.one': 'This plan is already live.',
  'plan.action.publish.blocked.other': '{count} of the selected plans are already live.',
  'plan.action.publish.blocked.all': 'All {count} selected plans are already live.',
  'plan.action.archive.blocked.one': 'This plan is already archived.',
  'plan.action.archive.blocked.other': '{count} of the selected plans are already archived.',
  'plan.action.archive.blocked.all': 'All {count} selected plans are already archived.',

  'plan.toast.published': '{plan} is live',
  'plan.toast.published.other': '{count} plans are live',
  'plan.toast.archived': '{plan} is archived',
  'plan.toast.archived.other': '{count} plans are archived',
  /* D18's four sentences per family. Each is a FACT about what is true now,
     never “something failed”. */
  'plan.toast.published.undone.one': '{plan} is back as it was',
  'plan.toast.published.undone.other': '{count} plans are back as they were',
  'plan.toast.published.undoFailed.one': '{plan} is still live',
  'plan.toast.published.undoFailed.other': '{count} plans are still live',
  'plan.toast.archived.undone.one': '{plan} is back as it was',
  'plan.toast.archived.undone.other': '{count} plans are back as they were',
  'plan.toast.archived.undoFailed.one': '{plan} is still archived',
  'plan.toast.archived.undoFailed.other': '{count} plans are still archived',

  /* ── the session (sessionCommands.ts) ────────────────────────────────── */
  'session.action.arabic': 'Switch to Arabic',
  'session.action.arabic.already': 'You are already reading Arabic.',
  'session.action.english': 'Switch to English',
  'session.action.english.already': 'You are already reading English.',
  'session.action.language.unwired': 'This console cannot change language from here yet.',
  'session.action.themeLight': 'Use the light theme',
  'session.action.themeDark': 'Use the dark theme',
  'session.action.themeSystem': 'Match the system theme',
  'session.action.theme.unwired': 'This console cannot change theme from here yet.',
  'session.action.signOut': 'Sign out',
  'session.action.signOut.unwired': 'This console cannot sign you out from here yet.',
}
