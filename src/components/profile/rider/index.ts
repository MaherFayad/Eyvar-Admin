/**
 * The rider presentation's public surface.
 *
 * One consumer: `shell/layers/ProfileLayer.tsx`. Everything else here is
 * exported for the tests, which assert against the pieces rather than only
 * against the assembled sheet — a refusal is easier to pin on `refusals.ts`
 * than to fish out of a rendered footer.
 *
 * **`copy.ts` is imported by `src/i18n/dictionaries.ts` directly, never through
 * this barrel.** The barrel reaches components, which reach the data clients;
 * the dictionary must not. `components/profile/copy.ts` is imported the same way
 * and for the same reason.
 */

export { RiderBand, type RiderBandProps } from './RiderBand'
export { RiderFooter, type RiderFooterProps } from './RiderFooter'
export { RiderPanels, type RiderPanelsProps, type RiderReads } from './RiderPanels'
export {
  RiderProfile,
  useRiderReads,
  type RiderProfileProps,
  type RiderProfileReads,
} from './RiderProfile'
export { RiderRail, type RiderRailProps } from './RiderRail'
export { RiderSkeleton } from './RiderSkeleton'
export { riderRefusals, type RefusalReason, type RiderRefusal } from './refusals'
