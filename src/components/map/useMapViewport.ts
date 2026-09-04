/**
 * **The map surface's behaviour: measure, pan, zoom.**
 *
 * `MapCanvas` in `ZonesMapView` grew all of this — a `ResizeObserver` that
 * decides the user space's height, a non-passive wheel listener, a pointer
 * drag, and two buttons for the keyboard — and Live Dispatch needs exactly the
 * same surface under a different set of pins. Copying ~140 lines of pointer
 * arithmetic into a second screen is how two maps start behaving differently
 * on a trackpad, so it is one hook and both boards call it.
 *
 * What it deliberately does NOT own: the projection (the caller decides what it
 * is fitting), the markers, and the direction of the chrome around it. It
 * hands back a `ref`, a set of props to spread on the surface, and the numbers
 * a projection needs.
 *
 * Rules applied
 *   AC-30    the zoom is reachable from the keyboard. The hook exposes
 *            `zoomAt`, `canZoomIn` and `canZoomOut`; the two real buttons are
 *            the caller's, so each board can label them in its own words.
 *   R18      no animation. A view change is a re-render at the new scale.
 *   §9.1     no physical direction decided here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clampView,
  MAX_ZOOM,
  VIEW_H_BASE,
  VIEW_IDENTITY,
  VIEW_W,
  ZOOM_STEP,
  type MapView,
} from './projection'

export interface MapViewport {
  /** Goes on the surface element — the box the SVG and the markers fill. */
  boxRef: React.RefObject<HTMLDivElement | null>
  /** The measured box, in CSS pixels. */
  boxPx: { w: number; h: number }
  /** The user space's height, derived from the box's own ratio. */
  viewH: number
  /** The live pan-and-zoom transform, to compose into a projection. */
  view: MapView
  /** True while a drag is in flight, for the cursor. */
  panning: boolean
  /** Multiply the scale, optionally anchored at a view-space point. */
  zoomAt: (factor: number, at?: { x: number; y: number }) => void
  canZoomIn: boolean
  canZoomOut: boolean
  /** Reset to the fit. */
  resetView: () => void
  /**
   * **Did the last pointer sequence PAN the map?**
   *
   * A canvas that opens something on click has to tell a click from the end of
   * a drag, and the browser cannot: a pan of two hundred pixels still fires
   * `click` on pointer-up. The hook already tracks `moved` to do its own work,
   * so it answers rather than making every caller re-measure the gesture.
   *
   * Reads the LAST completed sequence and stays true until the next
   * pointer-down, because `click` fires after `pointerup`.
   */
  lastGestureMoved: () => boolean
  /**
   * View units a floating panel of `px` CSS pixels covers — zero when the box
   * is too narrow for the panel to float, because below that breakpoint the
   * panel is stacked under the map and covers nothing.
   */
  reserveFor: (px: number) => number
  /** Spread on the surface element. Pointer capture, drag, and the cursor. */
  surfaceProps: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void
  }
}

export interface MapViewportOptions {
  /** Clamp on the derived user space, so marker constants stay in range. */
  minViewH?: number
  maxViewH?: number
}

export function useMapViewport(options: MapViewportOptions = {}): MapViewport {
  const { minViewH = 120, maxViewH = 640 } = options

  /* **The box's own ratio, watched.** `ResizeObserver` rather than a window
     listener: the canvas changes shape when the rail collapses or a panel
     opens, neither of which resizes the window. The initial 4 : 3 is what the
     first paint draws with and what a test environment without the observer
     keeps — a fallback that is a real ratio rather than a zero. */
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxPx, setBoxPx] = useState({ w: VIEW_W, h: VIEW_H_BASE })
  const [view, setView] = useState<MapView>(VIEW_IDENTITY)

  useEffect(() => {
    const box = boxRef.current
    if (!box || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect || rect.width <= 0 || rect.height <= 0) return
      setBoxPx({ w: rect.width, h: rect.height })
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  /* Clamped so a collapsed or absurdly tall box cannot ask for a user space the
     marker constants were never sized against. */
  const viewH = Math.round(
    Math.min(Math.max((VIEW_W * boxPx.h) / boxPx.w, minViewH), maxViewH),
  )

  const reserveFor = useCallback(
    (px: number) => (boxPx.w >= px * 2 ? (px / boxPx.w) * VIEW_W : 0),
    [boxPx.w],
  )

  /** A client point, in view units. Zoom anchors here so the map does not
      slide out from under the cursor. */
  const toViewPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = boxRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0 || rect.height === 0) {
        return { x: VIEW_W / 2, y: viewH / 2 }
      }
      return {
        x: ((clientX - rect.left) / rect.width) * VIEW_W,
        y: ((clientY - rect.top) / rect.height) * viewH,
      }
    },
    [viewH],
  )

  const zoomAt = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      setView((current) => {
        const anchor = at ?? { x: VIEW_W / 2, y: viewH / 2 }
        const next = Math.min(Math.max(current.k * factor, 1), MAX_ZOOM)
        /* The realised factor, after the clamp — using the requested one would
           translate by more than it scaled and drift the map at the limits. */
        const applied = next / current.k
        return clampView(
          {
            k: next,
            tx: anchor.x - applied * (anchor.x - current.tx),
            ty: anchor.y - applied * (anchor.y - current.ty),
          },
          viewH,
        )
      })
    },
    [viewH],
  )

  const resetView = useCallback(() => setView(VIEW_IDENTITY), [])

  /* **A non-passive listener, which is why this is not `onWheel`.** React
     attaches wheel handlers passively, and a passive handler cannot call
     `preventDefault` — so every zoom would also scroll the console behind the
     map. Registered directly, with the flag set. */
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const factor = Math.exp(-event.deltaY / 320)
      zoomAt(
        Math.min(Math.max(factor, 1 / ZOOM_STEP), ZOOM_STEP),
        toViewPoint(event.clientX, event.clientY),
      )
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  }, [zoomAt, toViewPoint])

  /* The drag. `dragging` is a ref rather than state: it changes on every
     pointer move and nothing rendered depends on it except the cursor, which
     is a class the pointer handlers set directly. */
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null)
  /* Survives the pointer-up that clears `drag`, because `click` fires after it
     and is the event that has to know. */
  const movedLast = useRef(false)
  const [panning, setPanning] = useState(false)

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    /* A marker is a real button and its click is not a drag. */
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    movedLast.current = false
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPanning(true)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const held = drag.current
    if (!held || held.id !== event.pointerId) return
    const rect = boxRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return
    const dx = ((event.clientX - held.x) / rect.width) * VIEW_W
    const dy = ((event.clientY - held.y) / rect.height) * viewH
    if (Math.abs(dx) + Math.abs(dy) > 0.5) {
      held.moved = true
      movedLast.current = true
    }
    held.x = event.clientX
    held.y = event.clientY
    setView((current) => clampView({ ...current, tx: current.tx + dx, ty: current.ty + dy }, viewH))
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return
    drag.current = null
    setPanning(false)
  }

  return {
    boxRef,
    boxPx,
    viewH,
    view,
    panning,
    zoomAt,
    canZoomIn: view.k < MAX_ZOOM,
    canZoomOut: view.k > 1,
    resetView,
    lastGestureMoved: () => movedLast.current,
    reserveFor,
    surfaceProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  }
}
