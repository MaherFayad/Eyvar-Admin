/**
 * "Elsewhere in the console" for a support record's rail (SUPPORT-UX-PLAN.md
 * §7.1, E4): the rider's or captain's other open support items, each a link
 * to that queue. Read-only (§7.2). Renders nothing for any other party.
 */

import { getDriverSupportPresence, getRiderSupportPresence } from '@/data/clients'
import type { DriverSupportPresence, RiderSupportPresence } from '@/data/types'
import { useAsync } from '@/hooks'
import { useShell } from '@/shell/ShellContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DriverSupportPresenceCard } from '@/components/profile/driver/DriverSupportPresenceCard'
import { RiderSupportPresenceCard } from '@/screens/entity/RiderSupportPresence'

export interface ElsewhereCardProps {
  entityType: string
  entityId: string
}

/* The cards' keys are registered shell copy, so the shell's translator serves them. */
export function ElsewhereCard({ entityType, entityId }: ElsewhereCardProps) {
  const { t, language } = useShell().language
  const kind = entityType === 'rider' || entityType === 'driver' ? entityType : null
  const rider = useAsync<RiderSupportPresence>((signal) => getRiderSupportPresence(entityId, signal), {
    deps: [entityId],
    enabled: kind === 'rider',
  })
  const driver = useAsync<DriverSupportPresence>((signal) => getDriverSupportPresence(entityId, signal), {
    deps: [entityId],
    enabled: kind === 'driver',
  })
  if (kind === null) return null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t(kind === 'rider' ? 'profile.rider.support.heading' : 'profile.driver.support.heading')}</CardTitle>
      </CardHeader>
      <CardContent>
        {kind === 'rider' ? (
          <RiderSupportPresenceCard result={rider} t={t} language={language} />
        ) : (
          <DriverSupportPresenceCard result={driver} t={t} language={language} />
        )}
      </CardContent>
    </Card>
  )
}
