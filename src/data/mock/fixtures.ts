/**
 * The one edge from the application's module graph into `src/data/fixtures/`.
 *
 * ## Why this module exists
 *
 * Every mock client used to `import { allDriverFixtures } from '../fixtures/drivers'`
 * at the top of the file. That single line is enough to put 26 000 lines of
 * seeded data in the entry chunk of **every** build, including one where
 * `VITE_DATA_SOURCE=http` and not one row can ever be read — measured at
 * 329 kB of the entry chunk after the `DATA_SOURCE` branch itself was
 * statically eliminated.
 *
 * It survives elimination because a static `import` is retained *for the
 * imported module's side effects*, whatever the tree-shaker concludes about its
 * exports. The fixture modules build their rows with `.map(…)`, `cycle(…)` and
 * array spreads, none of which a bundler can prove pure, so every one of them
 * is evaluated and therefore emitted. Annotating them was measured too: 1 139
 * `/*#__PURE__*\/` annotations still left 105 kB behind, and left the fixtures
 * unreadable.
 *
 * A **dynamic** import cannot be retained by accident. `loadFixtures` is the
 * only caller of `import('../fixtures')`, it is reached only from `mock()` and
 * `mockMutation()`, and its body is behind `DATA_SOURCE`, which Vite folds to a
 * literal at build time. So:
 *
 *   `VITE_DATA_SOURCE=http` → the call site folds away → rollup emits no
 *                             fixture module and no fixture chunk at all.
 *   mock                    → the fixtures become their own chunk, fetched on
 *                             the first client call rather than inlined into
 *                             the code every operator downloads first.
 *
 * ## How a client uses it
 *
 * The seam's invariant is that **no exported client signature changes**, so the
 * fixtures cannot become a promise a caller has to await. Instead each client
 * declares its fixture bindings as late-bound module locals and fills them in a
 * `onFixturesLoaded` callback:
 *
 * ```ts
 * import { onFixturesLoaded, type Fixtures } from '../mock/fixtures'
 *
 * let allDriverFixtures!: Fixtures['allDriverFixtures']
 * onFixturesLoaded((f) => {
 *   allDriverFixtures = f.allDriverFixtures
 * })
 * ```
 *
 * Every reference to `allDriverFixtures` below that is unchanged — which is why
 * this design touches import blocks and leaves ~300 mock call sites alone.
 *
 * ## The ordering rule this creates, and why it is safe
 *
 * A late-bound local is `undefined` until `loadFixtures()` has resolved. That is
 * safe because **`mock()` and `mockMutation()` await it before they call
 * `produce`**, and every mock read path goes through one of those two. It is
 * *not* safe for a value read at module load, or by an exported synchronous
 * function a screen calls during render. Those are listed in `seam.test.ts` and
 * keep an ordinary static import — see `clients/routes.ts` and `clients/zones.ts`.
 *
 * Reading one early fails loudly (`Cannot read properties of undefined`) rather
 * than quietly returning an empty list, which is the failure mode worth having:
 * an empty table looks like a legitimate empty state.
 */

import { DATA_SOURCE } from '../config'

/**
 * The shape of the fixture barrel. A **type-level** dynamic import: erased at
 * compile time, so naming this type creates no runtime edge to the fixtures.
 */
export type Fixtures = typeof import('../fixtures')

type Binder = (fixtures: Fixtures) => void

let loaded: Fixtures | null = null
let inFlight: Promise<void> | null = null
const binders: Binder[] = []

/**
 * Register a callback that binds this module's fixture locals. Called once per
 * client, at module load, beside the import block.
 *
 * If the fixtures are already resident the binder runs immediately, so a client
 * imported late — a route-split screen reached after the first fetch — is bound
 * before any of its functions can run.
 */
export function onFixturesLoaded(bind: Binder): void {
  if (DATA_SOURCE === 'http') return
  binders.push(bind)
  if (loaded) bind(loaded)
}

/**
 * Fetch the fixture chunk once and run every registered binder.
 *
 * Idempotent and concurrency-safe: the second caller awaits the first caller's
 * promise rather than starting a second import. Called by `mock()` and
 * `mockMutation()` before the artificial latency, so the chunk fetch and the
 * fake delay overlap instead of adding up.
 */
export async function loadFixtures(): Promise<void> {
  if (DATA_SOURCE === 'http') return
  if (loaded) return
  if (!inFlight) {
    inFlight = import('../fixtures').then((module) => {
      loaded = module
      for (const bind of binders) bind(module)
    })
  }
  await inFlight
}

/**
 * The fixtures, for the rare mock helper that needs the whole namespace rather
 * than a few named arrays. Throws rather than returning a half-built object if
 * called before `loadFixtures()` — see the ordering rule above.
 */
export function fixtures(): Fixtures {
  if (!loaded) {
    throw new Error(
      'Fixtures are not loaded. Every mock read must go through mock() or mockMutation(), ' +
        'which await loadFixtures() first. See src/data/mock/fixtures.ts.',
    )
  }
  return loaded
}

/** Whether the fixture chunk is resident. For assertions in `seam.test.ts`. */
export function fixturesLoaded(): boolean {
  return loaded !== null
}
