/**
 * *What needs a decision* — the standing Financials conditions R10 did not let
 * the banner carry, each a link to the view that can act on it (§3.0).
 *
 * Not a `BreakdownList`: that is a ranking with no control on any row
 * (AC-694), and every row here exists to be opened. Same panel shape, so the
 * two read as one pair.
 */

import { useId } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCount, directionFor, type Language, type Translate } from '@/lib'
import type { DecisionRow } from '../overview/toBoard'

export function DecisionList({
  rows,
  t,
  language,
}: {
  rows: readonly DecisionRow[]
  t: Translate
  language: Language
}) {
  const headingId = useId()
  /* §9.5 — the chevron points along the reading direction, so it is the one
     mark on this panel that turns around in Arabic. */
  const rtl = directionFor(language) === 'rtl'

  return (
    <Card className="min-w-0 border border-border shadow-xs">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle id={headingId}>{t('fin.overview.decisions.heading')}</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 p-2">
        {rows.length === 0 ? (
          /* R8's second kind — one grey sentence, no illustration: the section
             is empty and the page is not. */
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('fin.overview.decisions.empty')}
          </p>
        ) : (
          <ul
            aria-labelledby={headingId}
            className="flex list-none flex-col gap-0.5 divide-y divide-border/40"
          >
            {rows.map((row) => (
              <li key={row.id} className="min-w-0">
                <Link
                  to={row.route}
                  className="flex min-w-0 items-center gap-3 rounded-md px-2 py-2.5 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm text-foreground">{t(row.labelKey)}</span>
                    {/* V-3's facts rung — size, case, tracking and muted ink.
                        NOT a monospace face (the owner's Inter ruling) and NOT
                        `--ev-text-3`, which measures 2.54 : 1 and fails AA. */}
                    <span className="truncate text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t(row.whereKey)}
                    </span>
                  </span>
                  {/* R4 — the one numeric column, tabular and end-aligned. */}
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    <bdi>{formatCount(row.count, language)}</bdi>
                  </span>
                  <ChevronRightIcon
                    aria-hidden="true"
                    className={`size-4 shrink-0 text-muted-foreground ${rtl ? 'rotate-180' : ''}`}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
