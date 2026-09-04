/**
 * The request presentation's public surface.
 *
 * One consumer: `shell/layers/ProfileLayer.tsx`. Everything else here is
 * exported for the tests, which assert against the pieces rather than only
 * against the assembled sheet — a timeline's ordering is easier to pin on
 * `requestEvents` than to fish out of a rendered tab.
 *
 * **`copy.ts` is imported by `src/i18n/dictionaries.ts` directly, never through
 * this barrel.** The barrel reaches components, which reach the data clients;
 * the dictionary must not. `components/profile/copy.ts` and the rider and
 * captain barrels are imported the same way and for the same reason.
 */

export { RequestBand, type RequestBandProps } from './RequestBand'
export { RequestFooter, type RequestFooterProps } from './RequestFooter'
export { RequestFigures, RequestMap, requestPoints, type RequestMapProps } from './RequestMap'
export { RequestPanels, requestEvents, type RequestPanelsProps } from './RequestPanels'
export { RequestProfile, type RequestProfileProps } from './RequestProfile'
export { RequestRail, type RequestRailProps } from './RequestRail'
export { RequestSkeleton } from './RequestSkeleton'
