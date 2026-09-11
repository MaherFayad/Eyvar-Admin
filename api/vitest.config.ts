/**
 * A separate Vitest project for `api/**` so `npm test` (the frontend suite,
 * jsdom) never picks these up (`05-backend.md` §9). Run with `npm run
 * test:api`. `environment: 'node'` — no DOM here, ever.
 */
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, '../src') },
  },
  test: {
    name: 'api',
    root: path.resolve(__dirname, '..'),
    environment: 'node',
    include: ['api/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
    // PGlite spin-up plus WP-6.2's deliberately CPU-hard scrypt hashing (one
    // per seeded user) is slower than the 5s default under a loaded machine
    // — several tests seed two or three users.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
