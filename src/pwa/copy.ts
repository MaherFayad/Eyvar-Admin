/**
 * The PWA layer's own copy. **Four keys, and no more than four on purpose.**
 *
 * Follows the module convention exactly (`screens/**\/copy.ts`, `commands/copy.ts`):
 * a module exports a `Dictionary`, `i18n/dictionaries.ts` spreads it, and adding
 * a module never edits another module's strings.
 *
 * ## Why there is no offline-banner copy here
 *
 * Because it already exists, in `shell`, and writing a second set would have
 * been the mistake this file is small in order to avoid:
 *
 *   `state.offline.message`      "You are offline. Changes can't be saved until
 *                                the connection returns."   — condition 20
 *   `state.feedDead.message`     "Live data has stopped. What you see is from
 *                                {time}."                   — the *as-of* shape
 *   `state.feedStale.freshness`  "Last update {duration} ago"
 *
 * The offline-and-stale surface is a **new condition on the existing
 * `ShellBanner`**, not new chrome — R10's one-banner invariant already governs
 * it — and it is the product-designer's to place. `useDataFreshness()` in
 * `freshness.ts` is the one line it needs; those three keys are the copy. The
 * handoff says so; this file does not pre-empt it with strings nothing renders.
 *
 * ## Rules the four below are written to
 *
 *   §5.7   sentence case; a button is a verb; no exclamation marks; no
 *          "successfully"; no "please". A heading states the **value**, not the
 *          mechanism.
 *   AC-74  every operator-facing string resolves through a key here.
 *   AC-75  no concatenation.
 *
 * `pwa.install.body` names 90px because the number **is** the argument: round 17
 * measured only ~10.7 table rows fitting at 1280, and the browser toolbar is the
 * cheapest 90 of those pixels to get back. An operator deciding whether to
 * install deserves the reason rather than an adjective. **A first draft, and the
 * content-designer's to overrule.**
 */

import type { Dictionary } from '@/lib'

export const PWA_EN: Dictionary = {
  'pwa.install.title': 'Run the console in its own window',
  'pwa.install.body':
    'An installed window drops the browser toolbar and gives back about 90px — roughly another table row.',
  'pwa.install.action': 'Install',
  'pwa.install.dismiss': 'Dismiss',
}
