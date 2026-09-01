/**
 * **How the palette collects a target — P3-T6's second half.**
 *
 * ## The gap this fills, stated so it is not mistaken for a design
 *
 * `Command.arity` says a command `needs-target`. `Command.scope` says the
 * target is a `driver`. **Nothing in the registry says how to find one.** That
 * is fine for a row kebab, where the record is already under the cursor, and
 * for a bulk bar, where the selection is already made — and it is exactly what
 * is missing the moment a surface has to *offer* candidates.
 *
 * So the palette needs a second table, keyed by `ProfileEntityType`, saying
 * where records of that type come from and how one renders. That is this file.
 * **It is reported in the handoff as the one thing the registry cannot
 * express** — the alternative is a `resolveTargets` member on `Command`, which
 * would be declared identically on every command of the same entity type and is
 * therefore a property of the type, not of the command.
 *
 * ## Ranking is the data layer's, and stays there
 *
 * The candidate list goes through **`search()`**, not through
 * `listDrivers({ q })`. That is not a detour:
 *
 *   - `search()` is the only read that runs `lib/search/fuzzy` — bounded
 *     Damerau–Levenshtein, prefix and word-boundary boosts, Arabic folding — so
 *     it is the only one where `csptain` and `نورة` find anything. `runQuery`'s
 *     `q` is still `String.includes()` (`mock/query.ts:50`), which is the exact
 *     defect P3-T1 exists to fix and which has not reached the index clients
 *     yet.
 *   - It returns **one comparable score across kinds** (P3-T4), which is what
 *     lets the root list interleave a command, a destination and a record.
 *   - `shouldFilter={false}` stays on `cmdk`: re-ranking here would mean the
 *     palette's order changed the day `DATA_SOURCE` flips to `http`.
 *
 * `search()` returns hits, not records, and `unavailable` needs the record —
 * §11.2 cannot disable `Suspend` on an already-suspended captain from an id.
 * So the ids are resolved back through the resource's own client in **one**
 * read (`id in […]`), and re-ordered into the server's ranking. One extra
 * round trip, not one per row.
 */

import { listDrivers, search } from '@/data/clients'
import type { Driver, ProfileEntityType } from '@/data/types'
import { CAPTAIN_COMMANDS } from './captains'
import type { CommandRegistry } from './registry'

/** §CQ-1 caps the list at 8 rows; a candidate list longer than that is scrolled past, not read. */
export const TARGET_LIMIT = 8

/** How one candidate renders, and how the chip reads once it is picked. */
export interface TargetDescription {
  id: string
  /** Line one. A person's name, a record's id — whatever the operator recognises. */
  title: string
  /** Line two, or `null` for a one-line row. Never a breadcrumb (§2.6). */
  subtitle: string | null
}

/**
 * Everything the palette needs to run a domain's commands against records it
 * does not hold.
 *
 * Generic on the record so the source and its registry cannot drift: a
 * `TargetSource<Driver>` may only carry `CommandRegistry<Driver>`.
 */
export interface TargetSource<T = unknown> {
  entityType: ProfileEntityType
  commands: CommandRegistry<T>
  /**
   * Candidates for the target step. An empty query returns the first page of
   * the resource — the step must never open on a blank list, because a blank
   * list reads as "there are none" (R8's two empties are different things).
   */
  list(query: string, signal?: AbortSignal): Promise<readonly T[]>
  /** Pre-seeded ids — a selection, or the entity behind an open 360° layer — as records. */
  byIds(ids: readonly string[], signal?: AbortSignal): Promise<readonly T[]>
  describe(record: T): TargetDescription
  /** `{count} captains` — the chip over a set (**AC-75**: one key, one placeholder). */
  pluralKey: string
  /** `captains` — the noun inside `No captains match "…"`. */
  nounKey: string
}

/* ────────────────────────────── captains ────────────────────────────── */

async function rankedDriverIds(query: string, signal?: AbortSignal): Promise<string[]> {
  const response = await search(query, { limit: TARGET_LIMIT * 3 }, signal)
  const ids: string[] = []
  for (const result of response.results) {
    if (!('entityId' in result.target)) continue
    if (result.target.entityType !== 'driver') continue
    if (ids.includes(result.target.entityId)) continue
    ids.push(result.target.entityId)
    if (ids.length === TARGET_LIMIT) break
  }
  return ids
}

const driverSource: TargetSource<Driver> = {
  entityType: 'driver',
  commands: CAPTAIN_COMMANDS,
  pluralKey: 'command.entity.driver.other',
  nounKey: 'command.entity.driver.plural',

  async list(query, signal) {
    const needle = query.trim()
    if (needle === '') {
      /* Alphabetical, so the step at rest is a stable roster rather than
         whatever order the fixture happens to hold. */
      const page = await listDrivers(
        { pageSize: TARGET_LIMIT, sort: { field: 'name', dir: 'asc' } },
        signal,
      )
      return page.items
    }
    const ids = await rankedDriverIds(needle, signal)
    if (ids.length === 0) return []
    const rows = await driverSource.byIds(ids, signal)
    /* The server ranked these; restore that order after the id read, which
       returns them in fixture order. */
    return [...rows].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
  },

  async byIds(ids, signal) {
    if (ids.length === 0) return []
    const page = await listDrivers(
      { filters: [{ field: 'id', op: 'in', value: [...ids] }], pageSize: ids.length },
      signal,
    )
    return page.items
  },

  describe: (driver) => ({
    id: driver.id,
    title: driver.name,
    /* The id, because that is what an operator reading a work order has in
       front of them, and it is what disambiguates two people called Al-Harbi
       (§4.3.4's own example). */
    subtitle: driver.id,
  }),
}

/* ─────────────────────────────── the table ─────────────────────────────── */

/**
 * One entry per entity type that has commands. **Captains only today**, because
 * `CAPTAIN_COMMANDS` is the only domain registry that exists (P2-T2 landed;
 * T3–T7 have not). Each of those tasks adds one entry here beside its registry.
 */
export const TARGET_SOURCES: readonly TargetSource[] = [driverSource]

export function targetSourceFor(entityType: ProfileEntityType | null): TargetSource | null {
  if (entityType === null) return null
  return TARGET_SOURCES.find((source) => source.entityType === entityType) ?? null
}
