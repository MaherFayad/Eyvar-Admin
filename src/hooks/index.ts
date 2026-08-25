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
export { useDebouncedValue, DEFAULT_DEBOUNCE_MS } from './useDebouncedValue'
export { useFilters, type FiltersState, type UseFiltersOptions } from './useFilters'
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
export { useNavCollapse, type NavCollapseState, type UseNavCollapseOptions } from './useNavCollapse'
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
