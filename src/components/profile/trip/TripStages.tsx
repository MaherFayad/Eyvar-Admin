/**
 * **What happened, in order** — the stage rail.
 *
 * ```
 *  12 min lost
 *  ●──── Requested            07:41
 *  ●──── Captain accepted     07:43 · 2 min
 *  ◐──── Arrived at pickup    07:52 · 7 min late      ← the answer
 *  ●──── Trip started         07:56
 *  ◐──── Detour on Northern Ring Road  08:04 · +5 min
 *  ○     Drop-off             ETA 08:19
 * ```
 *
 * ## Why this surface exists at all
 *
 * `Trip.latenessMinutes` is a number legacy kept *inside* a status string
 * (`'Late +8'`), and the whole product could say a trip was eight minutes late
 * and nothing about where the eight minutes went. An operator answering a rider
 * complaint had one recourse: ring the captain. The rail is the record of the
 * ride, and the **summary line above it is the point** — it states the total
 * lost so nobody has to add a column of deltas to answer the first question.
 *
 * ## The three states of a stage, and why none of them is a colour alone
 *
 * | state | mark | what it means |
 * |---|---|---|
 * | done, on time | filled disc | it happened and cost nothing |
 * | done, cost time | half disc, `warning` | it happened and this is where the time went |
 * | not yet | hollow ring, muted | it has not happened; the drop-off row carries the ETA |
 *
 * §7.5: the mark's SHAPE differs as well as its fill, and every row states its
 * time in words beside it, so the rail survives greyscale and a screen reader
 * reads a list of facts rather than a picture.
 *
 * **R5a — nothing here is red.** Time lost is `warning`, which is the same tone
 * the trips table gives a late trip and a flagged one. A ride that ran twelve
 * minutes over is not an incident.
 *
 * ## `at === null` is not `—`
 *
 * §8.3.1 keeps `—` for *not applicable*. A drop-off that has not happened is
 * neither absent nor inapplicable — it is **ahead**, and the operator's whole
 * question is when. So that row prints `ETA 08:19` when there is a projection
 * and `Not yet` when there is not, and never a dash.
 */

import type { TripStage, TripTelemetry } from '@/data/types'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'

export interface TripStagesProps {
  telemetry: TripTelemetry
  t: Translate
  language: Language
  /**
   * `'rail'` is the sheet's form — one column, a connector down the inline
   * start. `'row'` is the page's — the same stages across the measure, which
   * is what a 1440px page has room for and a 480px drawer does not.
   */
  layout?: 'rail' | 'row'
}

/** The label key for one stage. A `Record`, so a seventh kind fails to compile. */
const STAGE_LABEL: Readonly<Record<TripStage['kind'], string>> = {
  requested: 'profile.trip.stage.requested',
  accepted: 'profile.trip.stage.accepted',
  arrived: 'profile.trip.stage.arrived',
  started: 'profile.trip.stage.started',
  detour: 'profile.trip.stage.detour',
  dropoff: 'profile.trip.stage.dropoff',
  cancelled: 'profile.trip.stage.cancelled',
}

/**
 * How much time this ride lost, in minutes.
 *
 * Summed from the stages rather than read off the trip, because the rail's own
 * rows are what the operator will check it against — a headline that disagreed
 * with the column beneath it would be worse than no headline. `deltaMinutes` is
 * `null` on every stage that cost nothing, so this is a sum over the ones that
 * did.
 */
export function minutesLost(stages: readonly TripStage[]): number {
  return stages.reduce((total, stage) => total + Math.max(0, stage.deltaMinutes ?? 0), 0)
}

export function TripStages({ telemetry, t, language, layout = 'rail' }: TripStagesProps) {
  const stages = telemetry.stages
  const lost = minutesLost(stages)

  if (stages.length === 0) {
    /* §9.2 — a real sentence, not an empty box. It is reachable: a trip whose
       driver app never reported is a row the API can return. */
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground">{t('profile.trip.stages.empty')}</p>
    )
  }

  return (
    <section aria-labelledby="trip-stages-heading" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="trip-stages-heading" className="text-xs font-semibold text-foreground">
          {t('profile.trip.stages.heading')}
        </h3>
        {/* The headline figure. `warning` when there is time to account for,
            muted when there is not — one tone, and the WORD carries it. */}
        <span
          className={cn(
            'text-2xs font-medium tabular-nums',
            lost > 0 ? 'text-tone-warning-fg' : 'text-muted-foreground',
          )}
        >
          <bdi>
            {lost > 0
              ? t('profile.trip.stages.lost', { minutes: formatCount(lost, language) })
              : t('profile.trip.stages.onTime')}
          </bdi>
        </span>
      </div>

      <ol
        className={cn(
          'flex',
          layout === 'row'
            ? 'flex-row flex-wrap gap-x-6 gap-y-3'
            : 'flex-col gap-0',
        )}
      >
        {stages.map((stage, index) => (
          <StageRow
            key={`${stage.kind}-${index}`}
            stage={stage}
            last={index === stages.length - 1}
            telemetry={telemetry}
            layout={layout}
            t={t}
            language={language}
          />
        ))}
      </ol>
    </section>
  )
}

function StageRow({
  stage,
  last,
  telemetry,
  layout,
  t,
  language,
}: {
  stage: TripStage
  last: boolean
  telemetry: TripTelemetry
  layout: 'rail' | 'row'
  t: Translate
  language: Language
}) {
  const done = stage.at !== null
  const costly = (stage.deltaMinutes ?? 0) > 0

  /* A detour without its road tells an operator that time was lost and nothing
     about why, so the place goes INTO the label rather than beside it — one
     key with a placeholder, never two strings joined (AC-75). */
  const label =
    stage.kind === 'detour' && stage.place !== null
      ? t('profile.trip.stage.detourOn', { place: stage.place })
      : t(STAGE_LABEL[stage.kind])

  /* The drop-off row of a running trip is the one that carries the projection.
     Everything else that has not happened says so in words. */
  const time = done
    ? formatDate(stage.at as string, { style: 'time', language })
    : stage.kind === 'dropoff' && telemetry.etaAt !== null
      ? t('profile.trip.fact.eta', {
          time: formatDate(telemetry.etaAt, { style: 'time', language }),
        })
      : t('profile.trip.stage.pending')

  const delta =
    stage.deltaMinutes === null
      ? null
      : stage.kind === 'arrived'
        ? t('profile.trip.stage.lost', {
            minutes: formatCount(stage.deltaMinutes, language),
          })
        : stage.kind === 'accepted'
          ? t('profile.trip.stage.wait', {
              minutes: formatCount(stage.deltaMinutes, language),
            })
          : t('profile.trip.stage.added', {
              minutes: formatCount(stage.deltaMinutes, language),
            })

  return (
    <li
      className={cn(
        'flex min-w-0 gap-2.5',
        layout === 'row' ? 'flex-1 basis-32 flex-col' : 'flex-row items-start',
      )}
    >
      {/* The mark and its connector. `aria-hidden` — the row states everything
          it means in words, and a screen reader has no use for a rule. */}
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center',
          layout === 'row' ? 'h-2.5 w-full gap-1.5' : 'w-2.5 flex-col self-stretch',
        )}
      >
        <Mark done={done} costly={costly} />
        {!last && (
          <span
            className={cn(
              costly ? 'bg-tone-warning-graphic' : done ? 'bg-chart-series' : 'bg-border',
              layout === 'row' ? 'h-px flex-1' : 'w-px flex-1',
            )}
          />
        )}
      </span>

      <span
        className={cn(
          'flex min-w-0 flex-col',
          layout === 'row' ? 'gap-0.5' : 'gap-0.5 pb-3',
        )}
      >
        <span
          className={cn(
            'text-xs font-medium',
            done ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <bdi>{label}</bdi>
        </span>
        <span className="flex flex-wrap items-baseline gap-x-2 text-2xs tabular-nums">
          <bdi className={done ? 'text-muted-foreground' : 'text-muted-foreground'}>{time}</bdi>
          {delta !== null && (
            <bdi className={costly ? 'text-tone-warning-fg' : 'text-muted-foreground'}>
              {delta}
            </bdi>
          )}
        </span>
      </span>
    </li>
  )
}

/**
 * One stage's mark. Three shapes for three states (§7.5) — a filled disc, a
 * half-filled disc for a stage that cost time, and a hollow ring for one that
 * has not happened.
 */
function Mark({ done, costly }: { done: boolean; costly: boolean }) {
  if (!done) {
    return <span className="size-2.5 shrink-0 rounded-full border border-border bg-card" />
  }
  if (costly) {
    return (
      <span className="relative size-2.5 shrink-0 overflow-hidden rounded-full border border-tone-warning-graphic">
        <span className="absolute inset-y-0 start-0 w-1/2 bg-tone-warning-graphic" />
      </span>
    )
  }
  return <span className="size-2.5 shrink-0 rounded-full bg-chart-series" />
}
