/**
 * The 360° profile's public surface — §6.2.
 *
 * Two presentations consume it and no third should have to know how the stack is
 * assembled: `ProfileLayer` (the drawer, `?entity=`) and `EntityPageScreen` (the
 * full page, `/entity/:entityId`) each render `<ProfileSections>` and, on the
 * page, `profileRail()`. Everything else here is exported for tests and for the
 * one legitimate reason a screen might reach in — a section renderer it wants to
 * assert against.
 */

export { ProfileSections, RAIL_SECTIONS, type ProfileSectionsProps } from './ProfileSections'
/* The drawer's missing region — the record itself, above any container that
   can be closed. The full page has the rail instead; see the component. */
export { identityBandSlots } from './IdentityBand'
export { profileRail, type ProfileRailProps } from './rail'
export { useProfileRecord, personFacets, type ProfileRecord, type ProfileRecordResult } from './record'
export {
  PROFILE_SECTION_RENDERERS,
  SECTION_TITLE_KEYS,
  type ProfileSectionComponent,
  type ProfileSectionProps,
} from './sections'
export { SectionCard, SectionStates, SectionSkeleton, SectionUnavailable } from './SectionCard'
export { PROFILE_EN } from './copy'
