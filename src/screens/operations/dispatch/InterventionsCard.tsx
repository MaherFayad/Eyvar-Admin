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
 * **Interventions have no type, no fixture and no client anywhere in the
 * product.** The two rows this card renders are literals in `DispatchScreen`,
 * which the file already says in as many words. There is therefore nothing for
 * either control to call, and §11.2's answer to that is not to hide them: a
 * blocked control is **disabled in place with a stated reason**, because a
 * hidden one teaches the operator that intervening is not a thing this console
 * does.
 *
 * So both render, both refuse, and one sentence at the foot of the card says
 * why - pointed at by `aria-describedby` from every button, because eight
 * copies of the same line down a narrow aside is noise and a `title` is
 * invisible to the keyboard (§5.7, §8.4.4).
 *
 * The model this needs is named in the handoff: an `Intervention` type, a
 * fixture, and `clients/dispatch.ts` with `acknowledgeIntervention(id, note)`
 * and `reassignIntervention(id, driverId)`. Until then the card is honest
 * about being read-only, which is what it has always actually been.
 */

import { AlertTriangle, Clock, RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Translate } from '@/lib'

interface InterventionItem {
  id: string
  kind: 'delayed' | 'sos' | 'stranded'
  title: string
  subtitle: string
  elapsedMinutes: number
  tripId?: string
}

interface InterventionsCardProps {
  items: InterventionItem[]
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

export function InterventionsCard({ items, unavailableReason, t }: InterventionsCardProps) {
  const blocked = unavailableReason !== null
  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            {t('dispatch.interventions.title', { defaultValue: 'Live Operational Interventions' })}
          </CardTitle>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
            {items.length} {t('dispatch.activeAlerts', { defaultValue: 'Active' })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            {t('dispatch.noInterventions', { defaultValue: 'All live trips operating within nominal SLAs.' })}
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
                      <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    )}
                    <span className="font-semibold text-foreground">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 shrink-0">
                  +{item.elapsedMinutes}m SLA
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
                  {t('dispatch.dismissAlert', { defaultValue: 'Acknowledge' })}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  disabled={blocked}
                  aria-describedby={blocked ? REFUSAL_ID : undefined}
                  className="h-6 gap-1 px-2 text-2xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t('dispatch.reassignCaptain', { defaultValue: 'Reassign' })}
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
