/**
 * Every shared pure helper. No React, no JSX, no fetching.
 *
 * `src/lib/utils.ts` (`cn`) is deliberately **not** re-exported: it ships with
 * `shadcn init`, it belongs to frontend-engineer, and it is imported from
 * `@/lib/utils` exactly as the CLI writes it into every primitive.
 */

export { announce, currentAnnouncement, getLiveRegion, resetAnnouncer } from './a11y/announcer'
export { isWideViewport, readWideBreakpointPx, WIDE_BREAKPOINT_FALLBACK_PX } from './breakpoint'
export { compactMediaQuery, readCompactBreakpointPx, COMPACT_BREAKPOINT_FALLBACK_PX } from './breakpoint'
export { formatDate, toDate, RIYADH_TIME_ZONE, type DateStyle, type FormatDateOptions } from './format/date'
export {
  formatDuration,
  type DurationPrecision,
  type FormatDurationOptions,
} from './format/duration'
export { ABSENT, MINUS_SIGN, formatMoney, type FormatMoneyOptions } from './format/money'
export {
  formatLocalisedText,
  isMoneyParam,
  moneyParamsIn,
  type LocalisedTextLike,
} from './format/localisedText'
export {
  MULTIPLICATION_SIGN,
  formatCount,
  formatDecimal,
  formatPercent,
  formatRange,
  formatRatio,
} from './format/number'
export {
  LANGUAGES,
  directionFor,
  isLanguage,
  isRtl,
  localeFor,
  mirrorGlyph,
  mirrors,
  type Direction,
  type Language,
} from './i18n/direction'
export {
  createTranslator,
  interpolate,
  placeholdersIn,
  type Dictionary,
  type Translate,
  type TranslateParams,
  type Translator,
  type TranslatorOptions,
} from './i18n/translate'
export {
  PLURAL_CATEGORIES,
  PLURAL_SEPARATOR,
  isPluralCategory,
  pluralCategory,
  pluralCountIn,
  pluralFormKey,
  pluralFormsIn,
  selectPluralForm,
  type PluralCategory,
} from './i18n/plural'
export {
  LTR_RUN_KINDS,
  isolatedRunProps,
  stretchesInlineSize,
  type IsolatedRun,
  type IsolatedRunOptions,
  type IsolatedRunProps,
  type IsolationBoxProps,
  type LtrRunKind,
} from './i18n/isolate'
export {
  columnFilterIssue,
  formatColumnFilterBounds,
  toFilterSpec,
  type ColumnFilterIssue,
  type ColumnFilterKind,
  type ColumnFilterValue,
  type NumberFilterUnit,
} from './columnFilter'
export { isDeepEqual } from './equality'
export { invariant, isDevEnvironment } from './invariant'
export { pageRange, type PageRange } from './pagination'
export { parseMoneyInput, parseNumericInput, toLatinDigits } from './parse/input'
export {
  UI_STATE_CACHE_PREFIX,
  UI_STATE_KEYS,
  UI_STATE_SCHEMA_VERSION,
  clearCachedUiState,
  createCachedStore,
  createMemoryStore,
  createNullStore,
  currentUiStateOwner,
  defaultUiStore,
  resetDefaultUiStores,
  setUiStateOwner,
  uiStateCacheKey,
  type CachedStoreOptions,
  type StorageLike,
  type UiStateStore,
  type UiStateValidator,
} from './persistence'
export {
  MIN_MATCH_SCORE,
  editDistance,
  matchDetail,
  matchScore,
  normalizeSearchText,
  type MatchDetail,
  type MatchRange,
} from './search/fuzzy'
export {
  NO_CLOCK,
  SLA_MESSAGES_EN,
  compareBySla,
  formatSlaLabel,
  slaBand,
  slaClock,
  slaLabelDescriptor,
  slaPrecision,
  slaSortKey,
  slaTrackPercent,
  type SlaBand,
  type SlaClock,
  type SlaInput,
  type SlaLabelDescriptor,
  type SlaMessageKey,
} from './sla'
