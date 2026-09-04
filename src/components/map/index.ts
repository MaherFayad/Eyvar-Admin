/**
 * The shared map layer. Two boards draw Riyadh — Management › Market & Zones
 * and Operations › Live Dispatch — and everything they must agree about lives
 * here: the projection, the basemap tiles fitted to it, the pan-and-zoom
 * surface, and the zoom controls.
 */

export { Basemap, BasemapAttribution, type BasemapProps } from './Basemap'
export { MapZoomControls, type MapZoomControlsProps } from './MapZoomControls'
/* The expanded surface every journey sheet's map opens into, and the affordance
   that opens it. One chrome, three pictures — see `MapDialog.tsx`. */
export {
  MapDialog,
  MapExpandButton,
  type MapDialogProps,
  type MapExpandButtonProps,
} from './MapDialog'
/* The gazetteer. It began inside the dispatch screen; `places.ts` says why a
   second surface drawing the same names had to move it here. */
export { locate } from './places'
/* The arithmetic the three journey sheets share — see `route.ts` on why the
   numbers are shared and the marks are not. */
export { MIN_SPAN_DEG, routeFrame, straightLineKm } from './route'
export {
  clampView,
  fitProjection,
  mercatorY,
  MAX_ZOOM,
  VIEW_H_BASE,
  VIEW_IDENTITY,
  VIEW_PAD,
  VIEW_W,
  ZOOM_STEP,
  type FitOptions,
  type GeoPoint,
  type MapView,
  type Projection,
} from './projection'
export { useMapViewport, type MapViewport, type MapViewportOptions } from './useMapViewport'
