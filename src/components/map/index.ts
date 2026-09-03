/**
 * The shared map layer. Two boards draw Riyadh — Management › Market & Zones
 * and Operations › Live Dispatch — and everything they must agree about lives
 * here: the projection, the basemap tiles fitted to it, the pan-and-zoom
 * surface, and the zoom controls.
 */

export { Basemap, BasemapAttribution, type BasemapProps } from './Basemap'
export { MapZoomControls, type MapZoomControlsProps } from './MapZoomControls'
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
