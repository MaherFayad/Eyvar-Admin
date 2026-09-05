/**
 * Live operational interventions — the card the map rail's alert strip opens.
 *
 * T1.2 — both controls are real writes now (`clients/dispatch.ts`). §11.2: a
 * refusal disables the control it belongs to, in place, with its own sentence;
 * a missing permission disables both with `unavailableReason`.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BreachedIcon, PendingIcon } from '@/components/icons'
import { StatusBadge } from '@/components/StatusBadge'
import { isApiError, type Intervention, type IsoDateTime } from '@/data/types'
import type { Translate } from '@/lib'

interface InterventionsCardProps {
  items: Intervention[]
  /** The fixed clock the row's elapsed time is measured against (`mock/clock.ts`). */
  now: IsoDateTime
  /**
   * §11.2 — why neither control can be used, as a sentence. Non-null disables
   * both **in place** and renders the sentence once at the foot of the card.
   */
  unavailableReason: string | null
  /** Throws on refusal; this card states it on the row that refused. */
  onAcknowledge: (item: Intervention) => Promise<void>
  onReassign: (item: Intervention) => void
  t: Translate
}

const REFUSAL_ID = 'dispatch-intervention-refusal'

/** T4.2 — a kind is a key, not a slug: the row is read in Arabic too. */
const KIND_KEY: Readonly<Record<Intervention['kind'], string>> = {
  delayed: 'dispatch.intervention.delayed',
  sos: 'dispatch.intervention.sos',
  stranded: 'dispatch.intervention.stranded',
}

/* The codes `acknowledgeIntervention` and `reassignIntervention` raise. The
   server's own message names a user id; these say what to do instead. */
const REFUSAL_KEY: Readonly<Record<string, string>> = {
  already_acknowledged: 'dispatch.intervention.refusal.already_acknowledged',
  same_driver: 'dispatch.intervention.refusal.same_driver',
  driver_unavailable: 'dispatch.intervention.refusal.driver_unavailable',
}

export function InterventionsCard({
  items,
  now,
  unavailableReason,
  onAcknowledge,
  onReassign,
  t,
}: InterventionsCardProps) {
  const blocked = unavailableReason !== null
  /** The row whose write is in flight, and the rows whose write was refused. */
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refused, setRefused] = useState<Readonly<Record<string, string>>>({})

  const elapsed = (raisedAt: IsoDateTime) =>
    Math.max(0, Math.round((Date.parse(now) - Date.parse(raisedAt)) / 60_000))

  const acknowledge = async (item: Intervention) => {
    setBusyId(item.id)
    try {
      await onAcknowledge(item)
    } catch (error: unknown) {
      const key = isApiError(error) ? REFUSAL_KEY[error.code] : undefined
      setRefused((current) => ({
        ...current,
        [item.id]: t(key ?? 'dispatch.intervention.refusal.failed'),
      }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border bg-muted/20 pb-3">
        <div className="flex items-center justify-between">
          {/* H2/H3 — the title takes ink. T9.11: no glyph on a card title. */}
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {t('dispatch.interventions.title')}
          </CardTitle>
          <StatusBadge tone="warning">
            {t('dispatch.interventions.active', { count: items.length })}
          </StatusBadge>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-border p-0">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {t('dispatch.noInterventions')}
          </div>
        ) : (
          items.map((item) => {
            const refusal = refused[item.id]
            const busy = busyId === item.id
            const KindIcon = item.kind === 'sos' ? BreachedIcon : PendingIcon
            return (
              <div key={item.id} className="flex flex-col gap-2 p-3 text-xs hover:bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <KindIcon
                        aria-hidden="true"
                        className={
                          item.kind === 'sos'
                            ? 'size-4 shrink-0 text-destructive'
                            : 'size-4 shrink-0 text-warning-foreground'
                        }
                      />
                      <span className="font-semibold text-foreground">
                        {t(KIND_KEY[item.kind], { trip: item.tripId ?? item.riderName })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.driverName === null
                        ? t('dispatch.intervention.sub.noCaptain', {
                            rider: item.riderName,
                            place: item.place,
                          })
                        : t('dispatch.intervention.sub', {
                            captain: item.driverName,
                            rider: item.riderName,
                            place: item.place,
                          })}
                    </p>
                  </div>
                  {/* H2 — an SLA figure is a VALUE, not a badge label. */}
                  <span className="shrink-0 font-mono text-xs text-warning-foreground">
                    {t('dispatch.intervention.elapsed', { minutes: elapsed(item.raisedAt) })}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="xs"
                    disabled={blocked || busy || refusal !== undefined}
                    aria-describedby={
                      blocked ? REFUSAL_ID : refusal !== undefined ? rowRefusalId(item.id) : undefined
                    }
                    className="h-6 px-2 text-2xs"
                    onClick={() => void acknowledge(item)}
                  >
                    {t('dispatch.dismissAlert')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    disabled={blocked || busy}
                    aria-describedby={blocked ? REFUSAL_ID : undefined}
                    className="h-6 px-2 text-2xs"
                    onClick={() => onReassign(item)}
                  >
                    {t('dispatch.reassignCaptain')}
                  </Button>
                </div>

                {/* §11.2 — the refusal on the row that made it, so an operator
                    reads it beside the control that will not run. */}
                {refusal !== undefined && (
                  <p id={rowRefusalId(item.id)} role="alert" className="text-2xs text-muted-foreground">
                    {refusal}
                  </p>
                )}
              </div>
            )
          })
        )}

        {/* §8.4.4 — ONE sentence for every control the permission blocks. */}
        {blocked && items.length > 0 && (
          <p id={REFUSAL_ID} className="p-3 text-2xs text-muted-foreground">
            {unavailableReason}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const rowRefusalId = (id: string) => `${REFUSAL_ID}-${id}`
