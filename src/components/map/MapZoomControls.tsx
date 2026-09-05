/**
 * **Two buttons in a free bottom corner, where every map puts them.**
 *
 * They are the keyboard's only route to the zoom and the touch device's only
 * comfortable one, so they are not a redundant copy of the wheel — they are the
 * accessible primary and the wheel is the shortcut (AC-30).
 *
 * The surface they sit on is pinned `dir="ltr"`, so `start` here is the
 * canvas's left in both languages. Which corner is free depends on where the
 * board's panels float, so the side is the caller's to name — see `side`.
 */

import { ZoomInIcon, ZoomOutIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { ZOOM_STEP } from './projection'

export interface MapZoomControlsProps {
  zoomAt: (factor: number) => void
  canZoomIn: boolean
  canZoomOut: boolean
  zoomInLabel: string
  zoomOutLabel: string
  /**
   * Which bottom corner is free.
   *
   * Zones floats ONE panel, on the inline-end, so the controls go opposite it
   * at the very bottom. Live Dispatch floats two and its inline-start is a
   * full-height feed, so the free corner there is the other one — and it sits
   * a rung higher, clear of the caption strip that runs along the bottom edge.
   * A control an operator cannot see is not a control.
   */
  side?: 'start' | 'end'
}

const BUTTON =
  'flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:opacity-40 disabled:hover:bg-transparent'

export function MapZoomControls({
  zoomAt,
  canZoomIn,
  canZoomOut,
  zoomInLabel,
  zoomOutLabel,
  side = 'start',
}: MapZoomControlsProps) {
  return (
    <div
      className={cn(
        'absolute z-10 flex flex-col overflow-hidden rounded-lg border border-border bg-card',
        side === 'start' ? 'bottom-3 start-3' : 'bottom-10 end-3',
      )}
    >
      <button
        type="button"
        onClick={() => zoomAt(ZOOM_STEP)}
        disabled={!canZoomIn}
        aria-label={zoomInLabel}
        className={`${BUTTON} border-b border-border`}
      >
        <ZoomInIcon aria-hidden="true" className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => zoomAt(1 / ZOOM_STEP)}
        disabled={!canZoomOut}
        aria-label={zoomOutLabel}
        className={BUTTON}
      >
        <ZoomOutIcon aria-hidden="true" className="size-3.5" />
      </button>
    </div>
  )
}
