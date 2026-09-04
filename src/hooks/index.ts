/**
 * Every shared hook. `src/hooks/*` has a single owner (utilities-engineer,
 * PHASE-PLAN.md parallelism table) — screens request, they do not write.
 *
 * `src/lib/utils.ts` is **not** re-exported here. `cn()` ships with `shadcn init`
 * and belongs to frontend-engineer; importing it from two places is how a second
 * one gets written.
 */

export { useAnnounce } from './useAnnounce'
export { useAsync, defaultIsEmpty, type AsyncResult, type AsyncStatus, type UseAsyncOptions } from './useAsync'
export {
  useColumnPinning,
  DEFAULT_MAX_PINNED_FRACTION,
  TABLE_FLOOR_INLINE_SIZE_PX,
  type ColumnPin,
  type ColumnPinningState,
  type PinEdge,
  type PinRefusal,
  type PinRefusalReason,
  type PinnableColumn,
  type PinnedColumn,
  type UseColumnPinningOptions,
} from './useColumnPinning'
export {
  useColumnVisibility,
  type ColumnVisibilityState,
  type UseColumnVisibilityOptions,
  type VisibilityColumn,
} from './useColumnVisibility'
export { useCooldown, secondsUntil, type Cooldown, type UseCooldownOptions } from './useCooldown'
export { useDebouncedValue, DEFAULT_DEBOUNCE_MS } from './useDebouncedValue'
export { useFilters, type FiltersState, type UseFiltersOptions } from './useFilters'
export { useFocusCapture, type FocusCapture, type UseFocusCaptureOptions } from './useFocusCapture'
export { useFocusEntry, type UseFocusEntryOptions } from './useFocusEntry'
export {
  useForm,
  type DerivedValue,
  type DerivedValueProps,
  type DerivedValues,
  type DisjointFrom,
  type Field,
  type FieldControlProps,
  type Form,
  type FormErrors,
  type FormIssue,
  type FormStatus,
  type FormValues,
  type SaveFailure,
  type UseFormOptions,
} from './useForm'
export {
  useIndexTable,
  type AnyTable,
  type IndexTable,
  type IndexTableOptions,
  type LedgerTable,
  type LedgerTableOptions,
  type PageSelectionState,
  type QueueTable,
  type QueueTableOptions,
  type QueueTableWithSelection,
  type TableCore,
  type TableMode,
  type TableSelection,
  type TableSorting,
} from './useIndexTable'
export {
  LanguageContext,
  applyDocumentDirection,
  useLanguage,
  useLanguageState,
  type LanguageState,
  type UseLanguageStateOptions,
} from './useLanguage'
/* `useNavCollapse` was deleted in 02-shell-fixes: the sub-tab column no longer
   collapses (`DECISIONS.md` **D5**), so a hook nobody calls is not left behind.
   `src/hooks` belongs to utilities-engineer; this one deletion is the recorded
   exception. `UI_STATE_KEYS.subTabNavCollapsed` was removed in U-B, as asked;
   `UserPreferences.subTabNavCollapsed` still exists on the *server* type
   (`src/data/types/session.ts`), which is the data seam’s to retire, not mine. */
/* The producer for `ShellConditions.offline`, which had copy, a flag and a
   banner since the shell was built and **nothing that ever set it**. Promoted
   out of `src/shell/` once it had three consumers. */
export { useOnline } from './useOnline'
export { useCompactShell, useDrawerDisclosure, type DisclosureState } from './useCompactShell'
export { useRovingFocus, type RovingFocus, type RovingItemProps, type UseRovingFocusOptions } from './useRovingFocus'
export {
  useNow,
  useTick,
  getClockSubscriberCount,
  getTickCount,
  resetClock,
  setClockSource,
  type TickBucket,
} from './useTick'
/* The colour theme. One class on `<html>`; the palette itself is a block of
   `--ev-*` overrides in `globals.css` and no component knows about it. */
export {
  useTheme,
  applyTheme,
  resolveTheme,
  systemTheme,
  isThemeChoice,
  type ThemeChoice,
  type ResolvedTheme,
  type ThemeState,
} from './useTheme'
/* The `?view=` tab row. Promoted out of `screens/financials/shared/views.ts` on
   its seventh consumer — the captain profile page — because a screen module
   importing a hook from another screen module is the coupling this directory
   exists to hold instead. Moved unchanged. */
export { useScreenViews, type ScreenView, type ScreenViews } from './useScreenViews'
