/**
 * Every fixture module, in one place, **so that there is exactly one edge from
 * the application's module graph into seeded data.**
 *
 * Nothing imports this file statically. `src/data/mock/fixtures.ts` reaches it
 * with a single `await import('../fixtures')`, and that dynamic edge is the
 * whole point:
 *
 *   - a `VITE_DATA_SOURCE=http` build eliminates the only call site, so rollup
 *     never emits this module or anything below it — **no fixture ships to an
 *     operator who can never read one**;
 *   - a `mock` build emits it as its own chunk instead of inlining 26 000 lines
 *     of seeded data into the entry chunk every operator downloads first.
 *
 * The guarantee is structural rather than an optimisation the bundler might or
 * might not manage: a static `import` of a fixture module is retained *for its
 * side effects* whatever the tree-shaker concludes about its exports, because
 * these modules build their rows with `.map`, `cycle(...)` and spreads that no
 * bundler can prove pure. One dynamic edge cannot be retained by accident.
 *
 * **Adding a fixture module means adding a line here.** `seam.test.ts` fails if
 * a module under `fixtures/` is missing from this barrel.
 *
 * `index.ts` itself is excluded — it would re-export itself.
 */

export * from './applicants'
export * from './assurance'
export * from './authIdentities'
export * from './claims'
export * from './complaints'
export * from './compliance'
export * from './complianceScans'
export * from './conversations'
export * from './corporateAccounts'
export * from './cycle'
export * from './dailySnapshots'
export * from './disputes'
export * from './drivers'
export * from './emails'
export * from './fairness'
export * from './financials'
export * from './integrations'
export * from './ledger'
export * from './legacyPages'
export * from './measures'
export * from './metrics'
export * from './navCounts'
export * from './notifications'
export * from './onboardingTracks'
export * from './payments'
export * from './policy'
export * from './pricing'
export * from './reports'
export * from './requests'
export * from './riders'
export * from './routeTable'
export * from './safety'
export * from './subscriptions'
export * from './teamUsers'
export * from './tickets'
export * from './trips'
/* The stage log, derived from the trips above. Must follow them: it reads
   `allTripFixtures` at module load. */
export * from './tripTelemetry'
export * from './workspace'
export * from './zones'
