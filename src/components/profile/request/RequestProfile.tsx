/**
 * The request sheet's body: **the map first**, then a rail of standing facts,
 * then the panels.
 *
 * ```
 *  ┌──────────────────────────────────────┐
 *  │            the map                   │   the ride, with the waiting clock
 *  │   ● ──── ▪   [waiting] [fare]        │   and the money floating on it
 *  ├──────────────────────────────────────┤
 *  │ CAPTAIN                              │   the rail, --color-muted
 *  │ OWNER                                │
 *  │ PLAN                                 │
 *  ├──────────────────────────────────────┤
 *  │  Details │ Timeline 6                │   the panels, --color-card
 *  │  THE RIDE …                          │
 *  └──────────────────────────────────────┘
 *            --ev-drawer-w, 480
 * ```
 *
 * ## Why the map is first, above the summary
 *
 * Every other sheet leads with its rail, because a person's standing is the
 * summary and a summary below its own detail is not a summary (§6.2). A ride's
 * summary is **where it goes** — an operator deciding whether to chase a
 * breached request is asking which side of the city it is on and how far it
 * runs, and no arrangement of labelled pairs answers that as fast as a picture.
 * So the picture is the summary here, and the two numbers that qualify it —
 * how long the rider has waited, what the ride is worth — float on it rather
 * than sitting in a rail below (the owner's instruction, and the better
 * reading: both are facts about the journey).
 *
 * ## One clock, computed once
 *
 * The elapsed wait is derived here and handed down, rather than computed in the
 * map and again in anything else that wants it. Two `Date.now()` reads a render
 * apart give two answers, and a sheet whose float says `5m` beside a rail
 * saying `4m` is a sheet an operator stops trusting about the thing it exists
 * to tell them.
 *
 * `nowIso` comes from the shell's own ticking clock (`useNowIso`), never a
 * module-scope `Date.now()`: under the mock every fixture is written against
 * `EYVAR_NOW`, and the host clock would render every request as days overdue.
 *
 * ## What decides whether there is a map at all
 *
 * `requestPoints` resolves both place names through the shared gazetteer. With
 * **neither** end placeable there is no picture to draw, so the sheet leads with
 * the rail and states in one sentence that the map knows neither place — which
 * is `components/map/places.ts`'s standing rule applied at the top level: a
 * place missing from a picture and a place missing from the data look identical
 * once you stop saying which it is.
 *
 * ## One read, and that is the design
 *
 * There are no collection reads on this sheet. Every fact is a field on the
 * record `ProfileLayer` already fetched — `RequestPanels`'s header sets out
 * why, and what it would take to justify adding one.
 *
 * Rules applied
 *   §11.3      the loading state is `RequestSkeleton` — the same map band, the
 *              same rail blocks, the same tab row. Never a spinner.
 *   §9.1       nothing is placed on a physical side. The column is a `flex-col`,
 *              which has no direction to mirror.
 */

import type { IsoDateTime, RideRequest } from '@/data/types'
import { formatSlaLabel, queueClock, type Language, type Translate } from '@/lib'
import { RequestFigures, RequestMap, requestPoints } from './RequestMap'
import { RequestPanels } from './RequestPanels'
import { RequestRail } from './RequestRail'

/** §5.5 — the statuses after which nothing is owed, and the rider stopped waiting. */
const TERMINAL: ReadonlySet<RideRequest['status']> = new Set(['assigned', 'expired', 'cancelled'])

export interface RequestProfileProps {
  request: RideRequest
  /** The shell's ticking clock. See the header on why it is a prop. */
  nowIso: IsoDateTime
  /** The rider's own record. `RequestPanels` says why the sheet must offer it. */
  riderHref?: string | null
  t: Translate
  language: Language
}

export function RequestProfile({
  request,
  nowIso,
  riderHref = null,
  t,
  language,
}: RequestProfileProps) {
  const { from, to } = requestPoints(request)
  const hasMap = from !== null || to !== null

  /**
   * **When the waiting stopped, or `null` while it has not.**
   *
   * A disposed request is not still waiting, and a float counting up on a row
   * that was assigned four days ago is a lie the sheet tells at a glance. The
   * end is whichever disposition stamp the record carries; `TERMINAL` and the
   * stamps agree by construction, but the stamp is what is read, because a
   * status without its timestamp cannot say *when*.
   */
  const endedAt = TERMINAL.has(request.status)
    ? (request.assignedAt ?? request.expiredAt ?? request.cancelledAt)
    : null
  const waitMs = Math.max(
    0,
    Date.parse(endedAt ?? nowIso) - Date.parse(request.requestedAt),
  )

  /**
   * The deadline, in the words the queue row already uses.
   *
   * `queueClock` reads the BREACH STAMP and not `slaDueAt < now`
   * (`types/workQueue.ts`: *"breach is a stamp, never `slaDueAt < now`"*), so a
   * request decided inside its window never reads as overdue and one that was
   * breached and then resolved still says so. A disposed row's clock is
   * suppressed entirely: `overdue 4d` beside `Assigned` is two answers to
   * whether anybody still owes this rider anything.
   */
  const clock = queueClock(
    {
      dueAt: request.slaDueAt,
      startedAt: request.slaStartedAt,
      targetMinutes: request.slaTargetMinutes,
      breachedAt: request.slaBreachedAt,
    },
    nowIso,
    { terminal: TERMINAL.has(request.status) },
  )
  /* O7 — a missed cut-off keeps a breached clock so the ROW sorts with the
     breached ones, and this band still prints no countdown for it: the promise
     was not broken, and `overdue 12h` here would contradict the row. */
  const showClock = clock.clock.kind !== 'no-clock' && !clock.deadlinePassedUnbroken

  return (
    /* **`-m-3` cancels `ShellLayer`'s body padding, deliberately.** The map is a
       GROUND, edge to edge, and a map that stops 12px short of the sheet's edge
       reads as a card that failed to fill. The band above it already bleeds for
       the same reason, and the utility is symmetric, so it mirrors. */
    <div className="-m-3 flex min-h-full flex-col">
      {hasMap ? (
        <RequestMap
          request={request}
          from={from}
          to={to}
          waitMs={waitMs}
          waitOpen={endedAt === null}
          slaLabel={showClock ? formatSlaLabel(clock.clock, t) : null}
          slaBreached={clock.breached}
          t={t}
          language={language}
        />
      ) : (
        /* **Neither end resolved — so there is no picture, and the two figures
           still have to be here.** The sentence says why the map is missing (a
           place absent from a picture and a place absent from the data look
           identical once you stop saying which), and `RequestFigures` renders
           the same waiting clock and the same amount on the rail's own ground.
           Losing the gazetteer must not cost an operator the two numbers they
           opened the sheet to read. */
        <div className="flex flex-col gap-3 border-b border-border bg-muted px-4 py-3">
          <RequestFigures
            request={request}
            waitMs={waitMs}
            waitOpen={endedAt === null}
            slaLabel={showClock ? formatSlaLabel(clock.clock, t) : null}
            slaBreached={clock.breached}
            t={t}
          />
          <p className="text-sm text-muted-foreground">{t('profile.request.map.none')}</p>
        </div>
      )}

      <RequestRail request={request} t={t} language={language} />
      <RequestPanels request={request} riderHref={riderHref} t={t} language={language} />
    </div>
  )
}
