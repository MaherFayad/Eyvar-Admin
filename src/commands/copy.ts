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
}
