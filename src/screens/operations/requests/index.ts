/**
 * Operations › Requests — the sub-tab's public surface.
 *
 * `PHASE-PLAN.md`: a Phase 1 sub-tab owns exactly one directory and exports one
 * screen. **`copy.ts` is deliberately not re-exported**: `src/i18n/dictionaries.ts`
 * imports it directly, because a barrel that also exports the screen would drag
 * `ShellContext` — which imports the dictionary — into a cycle.
 */

export { RequestsScreen } from './RequestsScreen'
