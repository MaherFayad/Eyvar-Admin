import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Money } from '@/components/Money'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDate } from '@/lib'
import type { Trip } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { MapPin, DollarSign, User, ShieldCheck } from 'lucide-react'

interface TripDetailDrawerProps {
  trip: Trip | null
  open: boolean
  onClose: () => void
  language: Language
  t: Translate
}

export function TripDetailDrawer({ trip, open, onClose, language, t }: TripDetailDrawerProps) {
  if (!trip) return null

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-[440px] overflow-y-auto">
        <SheetHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">{trip.id}</SheetTitle>
            <StatusBadge tone={trip.status === 'done' ? 'success' : (trip.status === 'in-trip' || trip.status === 'en-route') ? 'info' : 'neutral'}>
              {trip.status}
            </StatusBadge>
          </div>
          <SheetDescription className="text-xs">
            {trip.kind} · {formatDate(trip.startedAt, { language })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 py-4 text-xs">
          {/* Route Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                  {t('trip.pickup', { defaultValue: 'Pickup' })}
                </span>
                <span className="font-medium text-foreground">{trip.pickup}</span>
              </div>
            </div>

            <div className="border-l-2 border-dashed border-border ml-2 pl-4 py-1 text-[11px] text-muted-foreground flex items-center gap-3">
              <span>{trip.distanceKm ? `${trip.distanceKm.toFixed(1)} km` : '—'}</span>
              <span>•</span>
              <span>{trip.durationMinutes ? `${trip.durationMinutes} min` : '—'}</span>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium block">
                  {t('trip.destination', { defaultValue: 'Destination' })}
                </span>
                <span className="font-medium text-foreground">{trip.destination}</span>
              </div>
            </div>
          </div>

          {/* People Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 space-y-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                {t('column.rider', { defaultValue: 'Rider' })}
              </span>
              <span className="font-medium text-foreground block">{trip.riderName}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{trip.riderId}</span>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                {t('column.captain', { defaultValue: 'Captain' })}
              </span>
              <span className="font-medium text-foreground block">{trip.driverName}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{trip.driverId}</span>
            </div>
          </div>

          {/* Fare & Economics Breakdown */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 pb-1 border-b border-border">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              {t('trip.fareBreakdown', { defaultValue: 'Fare & Commission Breakdown' })}
            </span>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('trip.totalFare', { defaultValue: 'Total Fare' })}:</span>
              <span className="font-semibold text-foreground"><Money amount={trip.fareHalalas} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('trip.driverEarnings', { defaultValue: 'Captain Payout' })}:</span>
              <span className="text-foreground"><Money amount={trip.driverEarningsHalalas} /></span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('trip.platformFee', { defaultValue: 'Platform Fee' })}:</span>
              <span className="text-foreground"><Money amount={trip.platformCutHalalas} /></span>
            </div>
            {trip.tipHalalas ? (
              <div className="flex justify-between text-emerald-600">
                <span>{t('trip.tip', { defaultValue: 'Tip' })}:</span>
                <span>+<Money amount={trip.tipHalalas} /></span>
              </div>
            ) : null}
          </div>

          {/* Ratings & Quality */}
          {trip.driverRatingGiven !== null && (
            <div className="rounded-lg border border-border p-3 flex justify-between items-center">
              <span className="text-muted-foreground">{t('trip.ratingGiven', { defaultValue: 'Rider Rating' })}:</span>
              <span className="font-semibold text-foreground">
                ★ {trip.driverRatingGiven} / 5
              </span>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
