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
 * ## The domain registries — **five**, as of phase C-5
 *
 * | registry | entity | commands |
 * |---|---|---|
 * | `CAPTAIN_COMMANDS` | `driver` | open profile, suspend, reinstate |
 * | `TRIP_COMMANDS` | `trip` | flag, remove flag |
 * | `APPLICANT_COMMANDS` | `applicant` | approve, reject |
 * | `TICKET_COMMANDS` | `ticket` | claim, resolve, reopen |
 * | `SUBSCRIPTION_COMMANDS` | `subscription` | freeze, resume, cancel and settle |
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
export { blockedBy, blockedSentence } from './refusal'
export { undoHandle, type UndoOptions } from './undo'
export { COMMANDS_EN } from './copy'
export { commandSession, COMMAND_WRITE_PERMISSION } from './session'
export { toastOutcome, UNDO_WINDOW_MS } from './outcomeToast'
export {
  targetSourceFor,
  TARGET_LIMIT,
  TARGET_SOURCES,
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
