/**
 * Deterministic indexing for the volume-filler generators.
 *
 * ## `cycle` — scalars only
 *
 * Exists for one reason: the filler generators at the bottom of the fixture
 * files must be **deterministic** (no `Math.random()`), which means they index a
 * literal list by loop counter — and `noUncheckedIndexedAccess` makes
 * `list[i % list.length]` a `T | undefined`. This is total, so the compiler flag
 * stays on rather than being worked around with `!` in twenty places.
 *
 * ## The defect this file now exists to prevent
 *
 * `cycle` used to be applied to an **id list** and to a **name list**, twice,
 * with the same `i`:
 *
 * ```ts
 * driverId:   `DRV-0${101 + (i % 6)}`,                       // period 6
 * driverName: cycle(['Ahmed', 'Omar', 'Khalid', 'Hassan'], i) // period 4
 * ```
 *
 * The two sequences have different periods, so they walk out of phase and the
 * denormalised name stops describing the id beside it. Measured before the fix:
 * **80 of 132 filler trips and 40 of 70 filler subscriptions** carried a
 * `driverName` that contradicted the canonical `Driver` record, and sixteen ids
 * carried between two and seven different names each — `DRV-0101` was "Khalid
 * Mansour" in `SUB-3107` and "Ahmed Salem" in `fixtures/drivers.ts`.
 *
 * Patching the periods to agree would fix today and break again the next time
 * either list changed length. The pattern is the defect.
 *
 * ## The rule
 *
 * > **A denormalised field is read off the same object as the id it describes.
 * > Never cycle an id list and a name list as two independent sequences.**
 *
 * `cycleRef` is how that rule is expressed mechanically: it returns **one
 * object** carrying both halves, so a filler has nothing to desynchronise — the
 * second list no longer exists. `fixtures/integrity.test.ts` is the backstop:
 * it re-derives every denormalised name from the canonical record and fails if
 * anyone reintroduces the parallel-list pattern.
 *
 * `cycle` itself is kept, and is correct, for values with **no canonical
 * record behind them** — district names, plan labels, device strings. If the
 * value you are cycling has an id, you want `cycleRef` or `cycleRecord`.
 */

/** Index into a non-empty list, wrapping. Scalars with no canonical record. */
export function cycle<T>(items: readonly T[], i: number): T {
  return items[((i % items.length) + items.length) % items.length] as T
}

/**
 * Pick one whole record, wrapping. Read **every** denormalised field off the
 * object this returns — that is the entire point of returning a record rather
 * than a projection.
 */
export function cycleRecord<T extends { readonly id: string }>(records: readonly T[], i: number): T {
  return cycle(records, i)
}

/**
 * A denormalised reference: an id and the display name that goes with it,
 * guaranteed to have come off the same record.
 */
export interface FixtureRef {
  readonly id: string
  readonly name: string
}

/**
 * Project canonical records to refs, once, at module load.
 *
 * Throws on a duplicate id, because a duplicate id is the one thing that would
 * make "same id, two names" representable again — the exact condition this
 * module exists to remove.
 */
export function refsOf<T extends { readonly id: string; readonly name: string }>(
  records: readonly T[],
): readonly FixtureRef[] {
  const seen = new Set<string>()
  return records.map((r) => {
    if (seen.has(r.id)) {
      throw new Error(`refsOf: duplicate id "${r.id}" — a ref list must be one name per id`)
    }
    seen.add(r.id)
    return Object.freeze({ id: r.id, name: r.name })
  })
}

/**
 * Pick one ref. The id and the name arrive together, from one record, so the
 * caller cannot pair them wrongly:
 *
 * ```ts
 * const driver = cycleRef(DRIVER_REFS, i)
 * return { driverId: driver.id, driverName: driver.name }
 * ```
 */
export function cycleRef(refs: readonly FixtureRef[], i: number): FixtureRef {
  return cycle(refs, i)
}

/**
 * The refs for a named subset of a canonical list, in the order named.
 *
 * Filler rows often want a *small* slice of the population — six captains, nine
 * riders — so the per-entity row counts stay realistic and every downstream
 * aggregate keeps the distribution it was tuned against. Selecting by id keeps
 * that slice honest: an id that no longer exists throws at module load rather
 * than shipping a row that links to a 404.
 */
export function refsFor<T extends { readonly id: string; readonly name: string }>(
  records: readonly T[],
  ids: readonly string[],
): readonly FixtureRef[] {
  return refsOf(
    ids.map((id) => {
      const found = records.find((r) => r.id === id)
      if (!found) throw new Error(`refsFor: no record with id "${id}" — fix the id or the fixture`)
      return found
    }),
  )
}
