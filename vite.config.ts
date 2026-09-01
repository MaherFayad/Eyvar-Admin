import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    /**
     * **15 s, not vitest's default 5 s — a wait budget, not a licence for slow
     * tests.**
     *
     * The suite is ~2 300 tests across 83 files, and the heaviest render a whole
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
  },
})
