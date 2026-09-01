/**
 * The command registry's public surface — `design/05-command-centre.md`, D9.
 *
 * One barrel so a screen imports `@/commands` and never reaches into a domain
 * file's internals. The domain registries are added one per task (P2-T2…T7);
 * only captains exists in C-1.
 *
 * **Phase 3 adds the palette's half of that surface** — the model, the copy,
 * the pre-seed seam and the outcome toast. They live here rather than under
 * `src/shell` because they are the command system's, not the shell's: the shell
 * mounts the field, and everything the field does is declared in this
 * directory.
 */

export * from './registry'
export { CAPTAIN_COMMANDS } from './captains'
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
