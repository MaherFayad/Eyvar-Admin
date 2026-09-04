/**
 * The 360° profile's **trip** presentation — the ride sheet and the ride page.
 *
 * Two presentations consume it and no third should have to know how the stack
 * is assembled: `ProfileLayer` (the drawer, `?entity=TRP-*`) and
 * `TripProfilePage` (the full page, `/entity/TRP-*`). Everything a presentation
 * needs is exported here, in the shape `components/profile/driver/index.ts`
 * fixed for the captain — so the two arms of `ProfileLayer` stay copies of one
 * another rather than two designs.
 */

export { TripBand, TRIP_STATUS_TONE, type TripBandProps } from './TripBand'
export { TripFacts, tripFigures, type TripFactsProps } from './TripFacts'
export { TripFare, fareResidual, type TripFareProps } from './TripFare'
export { TripFooter, type TripFooterProps } from './TripFooter'
export { TripMap, hasTripMap, tripPoints, type TripMapProps } from './TripMap'
export { TripParties, type TripPartiesProps } from './TripParties'
export {
  TripProfile,
  useTripReads,
  type TripProfileProps,
  type TripProfileReads,
} from './TripProfile'
export { TripSkeleton } from './TripSkeleton'
export { TripStages, minutesLost, type TripStagesProps } from './TripStages'
export { TRIP_PROFILE_EN } from './copy'
