/**
 * The command registry's public surface — `design/05-command-centre.md`, D9.
 *
 * One barrel so a screen imports `@/commands` and never reaches into a domain
 * file's internals.
 *
 * **Phase 3 added the palette's half of that surface** — the model, the copy,
 * the pre-seed seam and the outcome toast. They live here rather than under
 * `src/shell` because they are the command system's, not the shell's: the shell
 * mounts the field, and everything the field does is declared in this
 * directory.
 *
 * ## The domain registries — **sixteen**, as of WP-7.4
 *
 * | registry | scope | commands |
 * |---|---|---|
 * | `CAPTAIN_COMMANDS` | `driver` | open profile, suspend, reinstate |
 * | `TRIP_COMMANDS` | `trip` | flag, remove flag |
 * | `APPLICANT_COMMANDS` | `applicant` | approve, reject |
 * | `TICKET_COMMANDS` | `ticket` | claim, resolve, reopen |
 * | `SUBSCRIPTION_COMMANDS` | `subscription` | freeze, resume, cancel and settle |
 * | `REQUEST_COMMANDS` | `request` | claim next, claim, assign, close |
 * | `WALLET_COMMANDS` | `rider` | adjust, credit goodwill |
 * | `COMPLAINT_COMMANDS` | `complaint` | uphold, dismiss |
 * | `TEAM_COMMANDS` | `operator` | suspend, reinstate, resend, revoke, remove |
 * | `PLAN_COMMANDS` | `plan` | publish, archive |
 * | `SAFETY_COMMANDS` | route `support-safety` | respond, suspend captain, close |
 * | `CASH_COMMANDS` | route `financials-cash` | approve, escalate |
 * | `DISPUTE_COMMANDS` | route `support-disputes` | refund, decline |
 * | `FAIRNESS_COMMANDS` | route `support-fairness` | overturn, uphold |
 * | `SESSION_COMMANDS` | global | Arabic, English, three themes, sign out |
 * | `ANALYST_COMMANDS` | global | ask the analyst |
 *
 * **The last six have no `TARGET_SOURCES` entry and cannot.** Session and
 * analyst commands act on no record; safety incidents, cash reports, disputes
 * and fairness cases have **no `ProfileEntityType`**, so `search()` cannot
 * rank one. Every command in those four carries `hiddenFromPalette` saying
 * exactly that (CM-4) — `scope: { kind: 'global' }` says it for the other two.
 * `COMMAND_GROUPS` (`targets.ts`) is the table that holds all sixteen — the
 * one a surface iterates for *commands*, where `TARGET_SOURCES` answers
 * *targets*.
 *
 * C-1 shipped captains alone, and this header said so for long enough that the
 * palette executed with one screen's worth of commands behind it while the
 * comment still read as the plan. **A registry is not added without its row
 * above and its entry in `TARGET_SOURCES`** (`targets.ts`) — the second is what
 * makes it reachable from ⌘K at all, and a registry without one is a list
 * nothing reads.
 *
 * ## What is deliberately not here yet
 *
 * Recorded so the next person does not re-derive it, and expanded in each
 * domain file's own header:
 *
 *   - **payouts, escrow, deductions, disputes, safety, conversations** — none
 *     of these records has a `ProfileEntityType`, so `search()` cannot rank a
 *     target for them and `CommandScope`'s `entity` kind cannot name them.
 *     They need a resolver entry in `clients/profile.ts` first.
 *   - **claim / release / take over**, on every work queue — `CommandSession`
 *     carries one boolean and no operator identity, and `release` without it
 *     would let one operator drop another's claim.
 *   - **`ticket.reply`** — a message with a channel does not fit
 *     `CommandConfirmRequest`. `subscription.freeze`'s duration now does:
 *     `choice` is a typed option list (T6.1).
 *   - **`Open …` commands** — `CommandHost` has `openProfile` and `confirm`
 *     and no `navigate`, so a command cannot reach a detail ROUTE. ⌘K's `Find`
 *     verb already resolves an id to the 360° layer (§5).
 */

export * from './registry'
export { CAPTAIN_COMMANDS } from './captains'
export { TRIP_COMMANDS, FLAG_REASONS } from './trips'
export { APPLICANT_COMMANDS } from './applicants'
export { TICKET_COMMANDS } from './tickets'
export {
  FREEZE_DAYS,
  SETTLE_REASONS,
  SUBSCRIPTION_COMMANDS,
  isTerminalSubscription,
  reassignCandidateRefusal,
  reassignRefusal,
} from './subscriptions'
/* F6 — the ten domains added to the registry. Order matches the table above. */
export { REQUEST_COMMANDS, isClosedRequest } from './requests'
export { WALLET_COMMANDS } from './wallets'
export { COMPLAINT_COMMANDS } from './complaints'
export { TEAM_COMMANDS } from './team'
export { PLAN_COMMANDS } from './pricing'
export { SAFETY_COMMANDS } from './safety'
export { CASH_COMMANDS } from './cash'
export { DISPUTE_COMMANDS } from './disputes'
export { FAIRNESS_COMMANDS } from './fairness'
export { SESSION_COMMANDS } from './sessionCommands'
export { ANALYST_COMMANDS } from './analyst'
export { blockedBy, blockedSentence } from './refusal'
export { undoHandle, type UndoOptions } from './undo'
export { COMMANDS_EN } from './copy'
export { commandSession, COMMAND_WRITE_PERMISSION } from './session'
export { toastOutcome, UNDO_WINDOW_MS } from './outcomeToast'
export {
  targetSourceFor,
  COMMAND_GROUPS,
  TARGET_LIMIT,
  TARGET_SOURCES,
  type CommandGroup,
  type TargetDescription,
  type TargetSource,
} from './targets'
export {
  readCommandSelection,
  resetCommandSelection,
  useCommandSelection,
  usePublishCommandSelection,
  type CommandSelection,
} from './selection'
export {
  deriveRecentCommands,
  deriveResume,
  usePaletteRecents,
  RECENT_COMMAND_LIMIT,
  RESUME_LIMIT,
  type PaletteRecents,
} from './recents'
export {
  displayString,
  usePalette,
  type PaletteBlock,
  type PaletteChip,
  type PaletteConfirm,
  type PaletteListStatus,
  type PaletteModel,
  type PaletteRow,
  type PaletteStep,
  type UsePaletteOptions,
} from './usePalette'
