/**
 * Operations › People — the sub-tab's public surface.
 *
 * `PHASE-PLAN.md`: a Phase 1 sub-tab owns exactly one directory and exports
 * one screen. **The copy dictionary is deliberately NOT re-exported here**:
 * `src/i18n/dictionaries.ts` imports `./copy` directly, because a barrel that
 * also exports the screen would drag `ShellContext` — which imports the
 * dictionary — into a cycle.
 */

export { PeopleScreen } from './PeopleScreen'
export { ApplicantDetailScreen } from './ApplicantDetailScreen'
