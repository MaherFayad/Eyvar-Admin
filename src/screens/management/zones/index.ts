/**
 * Management › Market & Zones.
 *
 * **The copy dictionary is not re-exported here.** `copy.ts` imports one TYPE
 * and nothing else; a barrel that also exports the screen would drag
 * `ShellContext` — which imports the dictionary — into a cycle. Same hazard the
 * People and queue barrels record.
 */

export { ZonesScreen } from './ZonesScreen'
