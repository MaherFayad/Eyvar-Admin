/**
 * The 360° profile's **subscription** presentation — the sheet a Subscriptions
 * row opens.
 *
 * One consumer: `shell/layers/ProfileLayer.tsx`. Everything else is exported
 * for the tests, which assert against the pieces rather than only against the
 * assembled sheet — a timeline's ordering is easier to pin on
 * `subscriptionEvents` than to fish out of a rendered tab.
 *
 * **`copy.ts` is imported by `src/i18n/dictionaries.ts` directly, never through
 * this barrel.** The barrel reaches components, which reach the data clients;
 * the dictionary must not.
 */

export { SubscriptionBand, type SubscriptionBandProps } from './SubscriptionBand'
export { SubscriptionFigures, type SubscriptionFiguresProps } from './SubscriptionFigures'
export {
  SubscriptionMap,
  hasSubscriptionMap,
  subscriptionPoints,
  type SubscriptionMapProps,
} from './SubscriptionMap'
export {
  SubscriptionPanels,
  subscriptionEvents,
  type SubscriptionPanelsProps,
} from './SubscriptionPanels'
export { SubscriptionProfile, type SubscriptionProfileProps } from './SubscriptionProfile'
export { SubscriptionRail, type SubscriptionRailProps } from './SubscriptionRail'
export { SubscriptionSkeleton } from './SubscriptionSkeleton'
