import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /**
     * **The PWA layer.** `docs/ref/pwa.md`, phases P1 and P2.
     *
     * `injectManifest`, not `generateSW`. The plugin contributes exactly one
     * thing here — the precache manifest, substituted for `self.__WB_MANIFEST`,
     * which is the only part that genuinely needs build-time knowledge of the
     * content-hashed filenames. Everything else is hand-written and readable in
     * `src/pwa/sw.ts`, and the Workbox **runtime** packages are deliberately not
     * installed: `docs/ref/pwa.md` asks for *"an explicit Workbox config you can
     * read over anything generated"*, and on an operations console five more
     * dependencies to express this policy as `urlPattern` regexes is the wrong
     * trade. The distinction that matters — *is this a money figure?* — is
     * domain knowledge, and it lives in `src/pwa/cachePolicy.ts`.
     *
     * **`vite-plugin-pwa` is the only dependency this adds, and it is dev-only.**
     * Nothing from it reaches the production bundle; the emitted `sw.js` is
     * `src/pwa/sw.ts` and its three imports.
     *
     * `index.html`'s `<meta name="viewport" content="width=1280">` is untouched
     * and stays untouched. Five of the six PWA benefits need no responsive work;
     * the sixth — phone layout — is deferred as scope, not as an oversight, and
     * changing that tag is a design ruling rather than an implementation detail.
     *
     * **That deferral now has a live request against it and no ruling yet.**
     * Measured on an emulated phone (390x844, `isMobile`, DPR 3): the meta tag
     * is honoured, `window.innerWidth` is **1280**, every CSS pixel renders at
     * 390/1280 = 0.305x, and `matchMedia('(max-width: 767px)')` is **false** —
     * so no sub-768 breakpoint can ever fire while that tag stands. A phone
     * shell is therefore not implementable from this file, from `src/pwa/`, or
     * from any screen; it starts with the ruling. Nothing here works around it.
     */
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'sw.ts',
      /* Registration is `src/pwa/register.ts`, called from `main.tsx`. The
         plugin's injected snippet would register before the kill switch has been
         resolved, which is precisely the ordering the kill switch depends on. */
      injectRegister: false,
      /* `prompt`, never `autoUpdate`: an operations console must not reload
         itself under an operator who is mid-form. See `register.ts`. */
      registerType: 'prompt',
      /**
       * **The dev service worker is ON.** It used to be off, with the note "a
       * caching layer in front of HMR turns every confusing dev bug into two
       * confusing dev bugs". That reasoning was sound and the consequence was
       * not: the owner refreshes `npm run dev`, gets no worker and no manifest,
       * and the entire PWA layer is invisible to the only person who evaluates
       * it. An unobservable feature is indistinguishable from a missing one.
       *
       * The HMR objection is answered by what this worker actually does rather
       * than by turning it off. `cachePolicy.classify` sends every same-origin
       * non-API request down the `shell` branch, and `handleShell` is
       * cache-first **against the precache only** — a miss is fetched and NOT
       * stored. The dev precache is empty (see three paragraphs down), so no
       * dev module can be cached and HMR is untouched. Measured: after two
       * loads of `npm run dev` the only cache present is the shell cache with
       * **zero** entries, and `/@vite/client` is served 200 from the network
       * and is not in any cache. Navigations are network-first in every mode.
       *
       * `type: 'module'` is required, not preferred. Under `injectManifest`
       * the plugin serves `src/pwa/sw.ts` through Vite's dev transform at
       * `/dev-sw.js?dev-sw`, imports unbundled; a classic worker cannot import.
       * The production worker is still `iife` — see `rollupFormat` below — so
       * this is a dev-only relaxation, not a change to what ships.
       *
       * **The dev worker precaches nothing, and that is not fixable from here.**
       * The plugin's dev path substitutes the injection point by a literal
       * string search over the *unbundled source*, where the expression reads
       * `(self as unknown as EyvarWorkerScope).__WB_MANIFEST` and the literal
       * `self.__WB_MANIFEST` therefore does not occur. `devOptions.
       * navigateFallback` was tried and measured to change nothing for that
       * reason, so it is not set: dead configuration carrying a comment that
       * claims it works is worse than the gap it papers over. Production is
       * unaffected — there the search runs over the bundled output, where the
       * cast is gone and the token is present.
       *
       * The consequence, stated plainly: `MANIFEST` is `[]` in dev, so **dev
       * offline is not a test of offline.** It would not have been one anyway —
       * the dev document loads `/src/main.tsx` and the HMR client, neither of
       * which any precache would contain. Offline is verified against `vite
       * build` + `vite preview`, on the real precache.
       */
      devOptions: { enabled: true, type: 'module' },
      injectManifest: {
        /* `iife`, not the default `es`: an ES-module service worker still is not
           supported everywhere, and a classic script registers identically in
           every browser that supports service workers at all. */
        rollupFormat: 'iife',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        /* The kill switch must never be precached — a cached kill switch is not
           a kill switch. `cachePolicy.ts` refuses to store it at runtime too;
           this is the build-time half of the same rule. */
        globIgnores: ['**/pwa-kill-switch.json'],
        /* The default 2 MiB rejects a chart-heavy vendor chunk, and a precache
           that silently omits a chunk is an app that silently fails offline on
           one route. */
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      /**
       * `theme_color` and `background_color` are read from
       * `src/styles/globals.css` at the time of writing:
       *   `--ev-brand: #0c6944`  (also `--primary`, and `--ring`)
       *   `--ev-surface: #ffffff`, `--ev-bg: #ffffff`
       * A manifest cannot read a custom property, so these are the one place in
       * the product where those two values are duplicated. If the brand ramp
       * moves, it moves here too.
       */
      manifest: {
        id: '/',
        name: 'Eyvar Admin',
        short_name: 'Eyvar',
        description: 'The Eyvar operations console.',
        /* NOT `/`. An installed console should open on the workspace an
           operator actually works in — design/18 §1.4. `/` redirects, and a
           redirect on every cold launch is a visible flash. */
        start_url: '/management/overview',
        scope: '/',
        display: 'standalone',
        /**
         * **`any`, changed from `landscape` on 2026-09-02 under the viewport
         * ruling.** `landscape` was right for a console that only ran at 1280
         * and it is wrong now: an installed PWA with a locked orientation is
         * locked on the DEVICE, so a phone that installed this would rotate
         * the operator into landscape on every cold launch and refuse to come
         * back. That is the precise opposite of the requirement the ruling was
         * made for. The desktop is unaffected — a windowed install has no
         * orientation to lock.
         */
        orientation: 'any',
        theme_color: '#0c6944',
        background_color: '#ffffff',
        lang: 'en',
        dir: 'ltr',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-any.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  /**
   * Dev-only proxy to `vercel dev` — active only under `VITE_DATA_SOURCE=http`
   * (05-backend.md §1). Mock stays the default so harnesses keep working with
   * no database.
   */
  server:
    process.env.VITE_DATA_SOURCE === 'http'
      ? { proxy: { '/api': 'http://localhost:3000' } }
      : undefined,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    /**
     * **15 s, not vitest's default 5 s — a wait budget, not a licence for slow
     * tests.**
     *
     * The suite is large, and the heaviest tests render a whole
     * routed shell in jsdom, type into a debounced search field and wait for the
     * re-query to resolve. Those cost ~1.8 s alone and comfortably exceed 5 s
     * when a dozen workers share one machine.
     *
     * Diagnosed rather than assumed, because the symptom looks exactly like a
     * logic bug: the tests pass individually, pass with `--no-file-parallelism`,
     * and **the failing set changes between identical full-suite runs** — which
     * no logic defect does. Two independent measurements agreed before this
     * number moved.
     *
     * The default stays low enough to catch a genuinely hung test. If a single
     * test needs more than this, that test is the problem, not this line.
     */
    testTimeout: 15_000,
    /* Agent worktrees live under `.claude/worktrees/` inside the repo; their
       test files must not run against this tree's modules. `api/**` has its
       own project (`api/vitest.config.ts`, `npm run test:api`) — node, not
       jsdom — so it must not double-run here. `scripts/**` holds
       `node --test` files (`npm run wp:gate`-adjacent), a different runner
       with its own assertion API; vitest must not collect them too. */
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**', 'api/**', 'scripts/**'],
  },
})
