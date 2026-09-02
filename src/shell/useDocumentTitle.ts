/**
 * **`document.title` names the route.**
 *
 * Before this, every one of the 34 routes carried the literal `Eyvar Admin`
 * from `index.html`, and `src/` contained **zero writers** of `document.title`.
 * That is a real defect for two groups and a nuisance for everyone:
 *
 *   - A screen-reader user gets the title on every navigation. Thirty-four
 *     routes announcing one string means the announcement carries no
 *     information, which is worse than silence because it costs time.
 *   - An operator with the console open in several tabs — a normal way to work
 *     a queue against a ledger — cannot tell them apart. Browser history and
 *     bookmarks are equally undifferentiated.
 *
 * **Most specific part first.** `Payouts · Financials · Eyvar Admin`, not the
 * reverse: a tab strip truncates from the end, and a pinned tab shows only the
 * first few characters. The workspace is the disambiguator, so it comes second.
 *
 * **A layer does not rename the page.** `?entity=`, `?account=` and
 * `?notifications=` are surfaces consulted *against* the route behind them
 * (`docs/ref/surfaces.md`), and AC-10 already says a layer changes neither
 * column's highlight. Renaming the tab would claim a navigation that did not
 * happen — and closing the layer would have to rename it back.
 *
 * The separator is `·` rather than `—` or `|`: it is what a screen reader
 * treats as a pause rather than reading aloud as a word.
 */

import { useEffect } from 'react'
import type { Translate } from '@/lib'
import type { RouteState } from './routeState'

/** Matches `index.html`, so the fallback is not a second source of the name. */
const PRODUCT = 'Eyvar Admin'

export function documentTitleFor(route: RouteState, t: Translate): string {
  const parts: string[] = []

  /* A level-3 detail names its parent sub-tab, not the record: the id is in the
     URL and on the page, and a title that changes per record makes the browser's
     own history unreadable — thirty entries all called `Trips`, or thirty
     different ids with no clue which product they belong to. */
  if (route.subTab) parts.push(t(route.subTab.titleKey))
  if (route.workspace) parts.push(t(route.workspace.titleKey))
  parts.push(PRODUCT)

  /* De-duplicate rather than render `Overview · Overview · Eyvar Admin`: a
     workspace whose landing sub-tab shares its name is the common case, and
     five of the five workspaces have one. */
  return parts.filter((part, i) => parts.indexOf(part) === i).join(' · ')
}

export function useDocumentTitle(route: RouteState, t: Translate): void {
  const title = documentTitleFor(route, t)
  useEffect(() => {
    document.title = title
  }, [title])
}
