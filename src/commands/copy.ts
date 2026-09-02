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
}
