/**
 * The job timeline (`22-analytics-v2.md` §5.2, AC-1256/AC-1257/AC-1261) — a
 * live `role="log"` list of tool-call steps plus interim findings. A `done`
 * job collapses it behind `Show steps` (`Collapsible`, already restyled).
 * The in-flight step's dot reuses `Skeleton`'s own guarded `animate-pulse`
 * (R18: a loading indicator, not an idle ambient loop) rather than a bespoke
 * spinner — the convention `durationMs === 0` marks that one event unsettled.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { AgentEvent, AgentJob, AgentRunner } from '@/data/types/agent'
import { formatDate, type Language, type Translator } from '@/lib'

export interface JobTimelineProps {
  job: AgentJob
  events: readonly AgentEvent[]
  /** AC-1267 — `null` while `agent.status` has not answered yet, the same "a missing fact is honest" default `AskComposer` uses; a queued job then reads as an ordinary wait, never a guessed reason. */
  runner: AgentRunner | null
  onRerun: () => void
  t: Translator
  language: Language
}

/** `420ms` -> `0.4s` — the design's own tenths-of-a-second reading for a tool
    call (§5.2's ASCII table). A stopwatch reading, not an SLA countdown, so
    `formatDuration` (a different semantic domain) is not reused here. */
function stepDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

function StepRow({
  event,
  inFlight,
  t,
}: {
  event: Extract<AgentEvent, { kind: 'tool-call' }>
  inFlight: boolean
  t: Translator
}) {
  const label = t(`an.tool.${event.tool}`)
  return (
    <li className="flex items-center gap-2 py-1 text-sm">
      <span
        aria-hidden="true"
        className={
          inFlight
            ? 'size-1.5 shrink-0 animate-pulse rounded-full bg-info-foreground'
            : 'size-1.5 shrink-0 rounded-full bg-muted-foreground'
        }
      />
      <span className="min-w-0 flex-1 truncate">
        {label}
        {event.summary.trim() !== '' && <span className="text-muted-foreground"> · {event.summary}</span>}
      </span>
      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
        {inFlight ? '…' : stepDuration(event.durationMs)}
      </span>
    </li>
  )
}

function FindingRow({ event }: { event: Extract<AgentEvent, { kind: 'finding' }> }) {
  return (
    <li className="flex items-start gap-2 py-1 text-sm">
      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full border border-info-foreground" />
      <bdi className="min-w-0 flex-1 text-foreground">{event.text}</bdi>
    </li>
  )
}

function StepList({ events, running, t }: { events: readonly AgentEvent[]; running: boolean; t: Translator }) {
  return (
    <ul role="log" aria-live={running ? 'polite' : 'off'} className="flex flex-col">
      {events.map((event, index) => {
        const isLast = index === events.length - 1
        if (event.kind === 'finding') return <FindingRow key={event.id} event={event} />
        const inFlight = running && isLast && event.durationMs === 0
        return <StepRow key={event.id} event={event} inFlight={inFlight} t={t} />
      })}
    </ul>
  )
}

export function JobTimeline({ job, events, runner, onRerun, t, language }: JobTimelineProps) {
  const [open, setOpen] = useState(false)

  if (job.state === 'queued') {
    /* AC-1267: an offline runner does not leave a queued job looking like an
       ordinary short wait — the reason is stated in place, the same way a
       deferred job's timeline names the usage limit below. */
    const offline = runner !== null && !runner.online
    return (
      <p className="text-sm text-muted-foreground">
        {offline ? t('an.timeline.queued.offline') : t('an.timeline.queued')}
      </p>
    )
  }

  if (job.state === 'done') {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="xs">
            {t('an.timeline.showSteps')}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <StepList events={events} running={false} t={t} />
        </CollapsibleContent>
      </Collapsible>
    )
  }

  if (job.state === 'deferred') {
    return (
      <div className="flex flex-col gap-2">
        <StepList events={events} running={false} t={t} />
        <p className="text-sm text-muted-foreground">
          {t('an.timeline.deferred', {
            time: job.retryAt ? formatDate(job.retryAt, { style: 'time', language }) : '',
          })}
        </p>
      </div>
    )
  }

  if (job.state === 'failed') {
    /* `evidence` pulls the finding rows OUT of the ordinary step list and
       into their own callout below, so the one claim that failed validation
       is not also read as a settled step above it. */
    const findings = events.filter(
      (event): event is Extract<AgentEvent, { kind: 'finding' }> => event.kind === 'finding',
    )
    const steps = job.failureReason === 'evidence' ? events.filter((event) => event.kind !== 'finding') : events
    return (
      <div className="flex flex-col gap-2">
        <StepList events={steps} running={false} t={t} />
        {job.failureReason === 'timeout' && <p className="text-sm text-muted-foreground">{t('an.timeline.timedOut')}</p>}
        {job.failureReason === 'evidence' && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{t('an.timeline.evidenceMismatch')}</p>
            {/* The specific mismatch (§5.2) — the finding events already in the
                timeline are the only record of what the analyst claimed. */}
            <ul className="flex flex-col gap-1 ps-3">
              {findings.map((event) => (
                <li key={event.id} className="text-sm text-foreground">
                  <bdi>{event.text}</bdi>
                </li>
              ))}
            </ul>
          </div>
        )}
        {job.failureReason === 'schema' && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t('an.timeline.schemaFailed')}</p>
            <Button type="button" variant="secondary" size="xs" onClick={onRerun}>
              {t('an.timeline.rerun')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  /* `running` — the default arm, steps append live. */
  return <StepList events={events} running t={t} />
}
