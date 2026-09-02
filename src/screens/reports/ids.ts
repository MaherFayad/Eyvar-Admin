/**
 * Sub-tab ids that the ROUTER needs to know without loading a screen.
 *
 * `REPORTS_SUB_TAB_ID` lived in `ReportsScreen.tsx`, which was fine while every
 * screen was imported eagerly. Under route-level code splitting it is not: the
 * router keys its Reports branch on this id, so a static import of it would pull
 * `ReportsScreen` — and through the barrel, the whole Report Builder — into the
 * entry chunk, which is exactly what the splitting exists to prevent.
 *
 * An id is data, not a component. It belongs in a module with no React in it.
 * `ReportsScreen.tsx` re-exports it so every existing importer is unaffected.
 */

export const REPORTS_SUB_TAB_ID = 'management-reports'
