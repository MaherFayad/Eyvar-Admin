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
  onResolve: (id: string) => void
  onReassign: (id: string) => void
  canWrite: boolean
  t: Translate
}

export function InterventionsCard({ items, onResolve, onReassign, canWrite, t }: InterventionsCardProps) {
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

              {canWrite && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => onResolve(item.id)}
                    className="h-6 text-[11px] px-2"
                  >
                    {t('dispatch.dismissAlert', { defaultValue: 'Acknowledge' })}
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => onReassign(item.id)}
                    className="h-6 text-[11px] px-2 gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t('dispatch.reassignCaptain', { defaultValue: 'Reassign' })}
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
