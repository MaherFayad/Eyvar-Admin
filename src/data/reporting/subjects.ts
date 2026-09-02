/**
 * **Which stores carry a subject, and which subject.** P7-T3.
 *
 * Three of the five modes ask a question about *people over time* rather than
 * about *numbers over time*:
 *
 *   **funnel**  — of the subjects who did A, how many went on to do B?
 *   **cohort**  — of the subjects who joined in March, how many are still here?
 *   **journey** — after a subject did A, what did they do next?
 *
 * None of those questions has an answer over a store whose rows are not about a
 * person. `daily-snapshots` is one number for one day; it has no `riderId` and
 * no `driverId`, and a cohort of snapshot rows is not a thin cohort, it is a
 * category error. So the table below is the one fact those three modes need
 * that the measure catalogue does not carry, and it lives here — in the
 * reporting semantics — rather than in the mock, because **`plan.ts` has to
 * refuse a cohort anchored on a subject-less measure before a request exists**
 * (AC-817's discipline: disabled in place with a reason, not an empty matrix
 * the operator has to interpret).
 *
 * ## Why a trip's subject is its rider and not its captain
 *
 * A trip row carries both. One of them has to be *the* subject or "trips, then
 * subscriptions" is a funnel that silently changes what it is following
 * halfway down. The rider is chosen because every measure over `trips` in the
 * catalogue is a demand measure — completed trips, quick rides, fares — and
 * because `subscriptions` is a rider-owned record too, so rider is the one
 * choice under which the three demand stores compose. **A captain-side funnel
 * would need a second subject on the same store, and that is a modelling
 * decision for the owner of the measure catalogue, not one to make here.**
 * It is recorded in the handoff rather than guessed at.
 *
 * ## This is not a permission and not a filter
 *
 * It answers exactly one question — *does a row of this store name a person?* —
 * and nothing else reads it.
 */

/** The two people the product's stores are about. */
export type SubjectKind = 'rider' | 'driver'

/**
 * `population.resource` → the subject its rows name, or `undefined` for a store
 * whose rows name nobody.
 *
 * Deliberately a flat literal: the next person to ask whether a journey can be
 * rooted on a snapshot measure reads one line.
 */
export const SUBJECT_BY_RESOURCE: Readonly<Record<string, SubjectKind | undefined>> = {
  riders: 'rider',
  drivers: 'driver',
  /* Both ids are on the row; the rider is the subject. See the file header. */
  trips: 'rider',
  subscriptions: 'rider',
  /* `daily-snapshots` is absent, and its absence is the whole point of this
     table. One row is one day's number, captured by hand. */
}

/** `null` where a store names nobody. Read through this, never off the record. */
export function subjectKindOf(resource: string): SubjectKind | null {
  return SUBJECT_BY_RESOURCE[resource] ?? null
}
