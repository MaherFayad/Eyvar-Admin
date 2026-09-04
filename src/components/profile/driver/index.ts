/**
 * The captain presentation's public surface.
 *
 * Two consumers, and the export shape is **deliberately the mirror of
 * `components/profile/rider/index.ts`** so that wiring the driver arm into
 * `shell/layers/ProfileLayer.tsx` is a mechanical copy of the rider arm rather
 * than a design exercise:
 *
 * ```tsx
 *   const driver = record.data?.entityType === 'driver' ? record.data.data : null
 *   const isDriver = ref?.entityType === 'driver'
 *   const driverReads = useDriverReads(entityId, isDriver)
 *   …
 *   banner={ref && isDriver ? <DriverBand entity={ref} driver={driver} … /> : undefined}
 *   footer={<DriverFooter onOpenFullProfile={…} t={t} />}
 *   children: driver ? <DriverProfile driver={driver} reads={driverReads} … />
 *                    : <DriverSkeleton />
 * ```
 *
 * `ProfileLayer.tsx` belongs to the rider surface's owner and is **not edited
 * by this task**; the wiring above is the orchestrator's to land once both
 * waves are in. Keeping this interface stable is the whole of what that costs.
 *
 * **`copy.ts` is imported by `src/i18n/dictionaries.ts` directly, never through
 * this barrel.** The barrel reaches components, which reach the data clients;
 * the dictionary must not. `components/profile/copy.ts` and the rider's are
 * imported the same way and for the same reason.
 */

export { DriverBand, type DriverBandProps } from './DriverBand'
export {
  CapacityBlock,
  DocumentsBlock,
  EarningsBlock,
  StandingBlock,
  type DriverBlockProps,
} from './DriverBlocks'
export { DriverTimeline, timelineSentence, type DriverTimelineProps } from './DriverTimeline'
export {
  DriverSupportPresenceCard,
  type DriverSupportPresenceCardProps,
} from './DriverSupportPresenceCard'
export { DriverDeductions, type DriverDeductionsProps } from './DriverDeductions'
export {
  DriverDocumentRecord,
  DriverDocuments,
  type DriverDocumentRecordProps,
  type DriverDocumentsProps,
} from './DriverDocuments'
export { DriverFooter, type DriverFooterProps } from './DriverFooter'
export { NavigateControl, type NavigateControlProps } from './NavigateControl'
export { DriverPanels, type DriverPanelsProps } from './DriverPanels'
export { DriverProfile, type DriverProfileProps } from './DriverProfile'
export { DriverRail, type DriverRailProps } from './DriverRail'
export { DriverSkeleton } from './DriverSkeleton'
export { DriverStrip } from './DriverStrip'
export {
  BlockCaption,
  BlockFigure,
  BlockSkeleton,
  BlockWord,
  SlotMeter,
  SummaryBlock,
  type SummaryBlockProps,
} from './SummaryBlock'
export {
  DOC_LABEL,
  DOC_STATE_WHY,
  RatingStars,
  bandPersonMeta,
  bandVehicleMeta,
  daysUntil,
  deviceFields,
  documentCountdown,
  documentRows,
  drivingFigures,
  identityFields,
  payoutAccountFields,
  periodFigures,
  soonestDocument,
  standingBanner,
  standingFlags,
  statusBadge,
  tabCounts,
  tripFigures,
  FigureGrid,
  TabCount,
  type DocumentRow,
  type Figure,
  type FigureValue,
  type TabCountValue,
  type TabCounts,
} from './facts'
export {
  COMPLIANCE_VIEW_PERMISSION,
  PAYOUTS_VIEW_PERMISSION,
  driverComplianceHref,
  driverPayoutsHref,
} from './hrefs'
export {
  DRIVER_LIST_ROWS,
  complianceState,
  useDriverReads,
  type ComplianceState,
  type DriverReads,
} from './reads'
