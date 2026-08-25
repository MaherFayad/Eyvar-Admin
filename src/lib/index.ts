/**
 * Every shared pure helper. No React, no JSX, no fetching.
 *
 * `src/lib/utils.ts` (`cn`) is deliberately **not** re-exported: it ships with
 * `shadcn init`, it belongs to frontend-engineer, and it is imported from
 * `@/lib/utils` exactly as the CLI writes it into every primitive.
 */

export { announce, currentAnnouncement, getLiveRegion, resetAnnouncer } from './a11y/announcer'
export { isWideViewport, readWideBreakpointPx, WIDE_BREAKPOINT_FALLBACK_PX } from './breakpoint'
export { formatDate, toDate, RIYADH_TIME_ZONE, type DateStyle, type FormatDateOptions } from './format/date'
export { formatDuration } from './format/duration'
export { ABSENT, MINUS_SIGN, formatMoney, type FormatMoneyOptions } from './format/money'
export { formatCount, formatRange } from './format/number'
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
  type TranslatorOptions,
} from './i18n/translate'
export { isDeepEqual } from './equality'
export { invariant, isDevEnvironment } from './invariant'
export { pageRange, type PageRange } from './pagination'
export { parseMoneyInput, parseNumericInput, toLatinDigits } from './parse/input'
export {
  UI_STATE_KEYS,
  createMemoryStore,
  createNullStore,
  defaultUiStore,
  resetDefaultUiStores,
  type UiStateStore,
} from './persistence'
export {
  NO_CLOCK,
  SLA_MESSAGES_EN,
  compareBySla,
  formatSlaLabel,
  slaBand,
  slaClock,
  slaLabelDescriptor,
  slaSortKey,
  slaTrackPercent,
  type SlaBand,
  type SlaClock,
  type SlaInput,
  type SlaLabelDescriptor,
  type SlaMessageKey,
} from './sla'
