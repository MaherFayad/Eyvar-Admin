/**
 * **Live operational interventions** - the aside on Operations > Live Dispatch.
 *
 * ## The two controls that lied, and what they are now
 *
 * `Acknowledge` and `Reassign` each spliced a hardcoded local array in
 * `DispatchScreen` and toasted success. Nothing was acknowledged; no captain
 * was reassigned; the alert disappeared because the component forgot it, and it
 * came back on the next reload. `Reassign` was the worse of the two - it
 * reported that *"automated captain reassignment"* had been dispatched for a
 * rider who was still waiting.
 *
 * **T1.2 — the model now exists**: `types/dispatch.ts`, `fixtures/dispatch.ts`
 * and `clients/dispatch.ts` with `acknowledgeIntervention(id, note)` and
 * `reassignIntervention(id, driverId)`. This card reads `listInterventions()`.
 *
 * Both controls still render **disabled with a stated reason** (§11.2): wiring
 * them is a wave-2 screen task, and a hidden control teaches the operator that
 * intervening is not a thing this console does.
 */

import { AlertTriangle, Clock, RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Intervention, IsoDateTime } from '@/data/types'
import type { Translate } from '@/lib'

interface InterventionsCardProps {
  items: Intervention[]
  /** The fixed clock the row's elapsed time is measured against (`mock/clock.ts`). */
  now: IsoDateTime
  /**
   * §11.2 - why neither control can be used, as a sentence. Non-null disables
   * both **in place** and renders the sentence once at the foot of the card.
   * `null` would enable them, and nothing passes `null` today because there is
   * no client behind either act.
   */
  unavailableReason: string | null
  t: Translate
}

const REFUSAL_ID = 'dispatch-intervention-refusal'

/** T4.2 — a kind is a key, not a slug: the row is read in Arabic too. */
const KIND_KEY: Readonly<Record<Intervention['kind'], string>> = {
  delayed: 'dispatch.intervention.delayed',
  sos: 'dispatch.intervention.sos',
  stranded: 'dispatch.intervention.stranded',
}

export function InterventionsCard({ items, now, unavailableReason, t }: InterventionsCardProps) {
  const blocked = unavailableReason !== null
  const elapsed = (raisedAt: IsoDateTime) =>
    Math.max(0, Math.round((Date.parse(now) - Date.parse(raisedAt)) / 60_000))
  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          {/* H2/H3 — the card title takes ink; it was the same size and the
              same grey as the rows beneath it. */}
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-warning-foreground" />
            {t('dispatch.interventions.title')}
          </CardTitle>
          <span className="text-xs font-semibold text-warning-foreground bg-warning px-2 py-0.5 rounded-full border border-border">
            {items.length} {t('dispatch.activeAlerts')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {t('dispatch.noInterventions')}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="p-3 text-xs flex flex-col gap-2 hover:bg-muted/30">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {item.kind === 'sos' ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-warning-foreground shrink-0" />
                    )}
                    <span className="font-semibold text-foreground">
                      {t(KIND_KEY[item.kind], { trip: item.tripId ?? item.riderName })}
                    </span>
                  </div>
                  {/* H2 — 11px arbitrary, off the ramp. META is `--text-xs`. */}
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
                {/* H2 — an SLA figure is a VALUE, not a badge label, so it
                    leaves `--text-2xs`. H7 rule 3 already had it right: toned
                    text rather than a second chip on a row that carries one. */}
                <span className="text-xs font-mono text-warning-foreground shrink-0">
                  {t('dispatch.intervention.elapsed', { minutes: elapsed(item.raisedAt) })}
                </span>
              </div>

              {/* §11.2 - rendered and REFUSED, never removed. Both used to
                  splice a local array and toast success over an act nobody
                  performed. */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={blocked}
                  aria-describedby={blocked ? REFUSAL_ID : undefined}
                  className="h-6 px-2 text-2xs"
                >
                  {t('dispatch.dismissAlert')}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={blocked}
                  aria-describedby={blocked ? REFUSAL_ID : undefined}
                  className="h-6 gap-1 px-2 text-2xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t('dispatch.reassignCaptain')}
                </Button>
              </div>
            </div>
          ))
        )}

        {/* §8.4.4 - ONE sentence for every disabled control in the card,
            pointed at by all of them. */}
        {blocked && items.length > 0 && (
          <p id={REFUSAL_ID} className="p-3 text-2xs text-muted-foreground">
            {unavailableReason}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
