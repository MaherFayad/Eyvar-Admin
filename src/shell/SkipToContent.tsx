/**
 * `SkipToContent` (S-09) — design spec §11.6, §7.3.4, **AC-62**.
 *
 * > **AC-62** — the first `Tab` from the document body focuses a **visible**
 * > "Skip to content" link; activating it moves focus into the content region.
 *
 * So it is the **first focusable element in the document**, visually hidden
 * until focused, and its target is the content region's `<main>` landmark.
 *
 * `sr-only` alone would fail AC-62 — the link must become VISIBLE on focus, not
 * merely reachable — so the classes below reverse the hiding under
 * `focus-visible` and give it a real, positioned, focus-ringed appearance.
 *
 * `position: fixed` with `start-*`/`top-*` keeps it out of the layout entirely
 * when hidden, and logical offsets mean it lands at the inline-start corner in
 * both languages (§9.1).
 */

import type { Translate } from '@/lib'

export const CONTENT_LANDMARK_ID = 'ev-content'

export function SkipToContent({ t }: { t: Translate }) {
  return (
    <a
      href={`#${CONTENT_LANDMARK_ID}`}
      className={[
        'sr-only',
        'focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:start-2 focus-visible:z-50',
        'focus-visible:inline-flex focus-visible:h-control focus-visible:items-center',
        'focus-visible:rounded-lg focus-visible:border focus-visible:border-border',
        'focus-visible:bg-card focus-visible:px-2.5 focus-visible:text-sm focus-visible:font-medium',
        'focus-visible:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      ].join(' ')}
    >
      {t('shell.skipToContent')}
    </a>
  )
}
