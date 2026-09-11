/**
 * Pages (`pg.*`), D39. The index screen's title, its four states, and one
 * page's own three; content is the blocks themselves. Block names, editor
 * actions, templates and toasts (`03-pages-and-dashboards.md` §10) are a
 * later work package's, not a speculative set here.
 */

import type { Dictionary } from '@/lib'

export const PAGES_EN: Dictionary = {
  /* ── the pages index (§7 / §8) ───────────────────────────────────────── */
  'pg.index.title': 'Pages',
  'pg.index.empty': 'No pages yet.',
  'pg.index.loading': 'Loading pages',
  'pg.index.error': 'The pages didn’t load.',

  /* ── one page (§8's second row) ──────────────────────────────────────── */
  /* The second kind of empty (R8): the page exists, it just has no blocks. */
  'pg.page.empty': 'This page has no blocks yet.',
  'pg.page.loading': 'Loading the page',
  'pg.page.error': 'The page didn’t load.',
}
