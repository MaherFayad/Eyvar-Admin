/**
 * **The rail that floats on the map's inline-end: layers, alerts, legend.**
 *
 * Three cards in one column, in the order an operator needs them: what is
 * drawn, what is wrong, and what the marks mean.
 *
 * ## The layer switches are a real control, not a preference
 *
 * Fifty-one captain dots over six waiting requests is a board where the thing
 * you are looking for is behind the thing you are not. Turning a layer off is
 * how an operator reads a crowded city, so each switch carries its layer's own
 * colour and its own count — the same pill the feed's tabs carry, so the tab,
 * the switch and the mark on the map are visibly one thing.
 *
 * ## The legend states what the marks do NOT mean
 *
 * `dispatch.legend.note`. A captain dot is placed from a registered district,
 * because nothing in `Driver` carries a position (`geo.ts`). A board that draws
 * a captain without saying that is a board an operator trusts for the one
 * decision it cannot support.
 *
 * Rules applied
 *   §7.5    the four legend marks differ in shape before they differ in
 *           colour — disc, square, ring, dot — so the key is readable in
 *           greyscale and the map is too.
 *   §11.2   the interventions strip opens a card whose two controls are
 *           disabled in place with a stated reason. Nothing is hidden.
 *   R5a     the strip's red is a live alert count on a monitor, which is one
 *           of the four places red is allowed, and it is the only red here.
 *   R18     the strip does not pulse. A blinking alert is an alert an operator
 *           learns to stop seeing.
 */

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { formatCount, mirrorGlyph, type Direction, type Language, type Translate } from '@/lib'
import { cn } from '@/lib/utils'
import type { DispatchLayer, LayerState } from './DispatchMap'

export interface MapRailProps {
  layers: LayerState
  onToggleLayer: (layer: DispatchLayer) => void
  counts: Readonly<Record<DispatchLayer, number>>

  interventionCount: number
  interventionsOpen: boolean
  onInterventionsOpen: (open: boolean) => void
  /** The `InterventionsCard`, rendered only while the strip is open. */
  interventions: ReactNode

  language: Language
  dir: Direction
  t: Translate
}

const CARD_TITLE =
  'flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground'

export function MapRail({
  layers,
  onToggleLayer,
  counts,
  interventionCount,
  interventionsOpen,
  onInterventionsOpen,
  interventions,
  language,
  dir,
  t,
}: MapRailProps) {
  return (
    <>
      <Card className="shrink-0 gap-0 py-3 shadow-2">
        <CardHeader className="px-3 pb-2">
          <CardTitle className={CARD_TITLE}>{t('dispatch.layers.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5 px-3">
          <LayerRow
            layer="trips"
            label={t('dispatch.layers.trips')}
            count={counts.trips}
            on={layers.trips}
            onToggle={onToggleLayer}
            language={language}
          />
          <LayerRow
            layer="pending"
            label={t('dispatch.layers.pending')}
            count={counts.pending}
            on={layers.pending}
            onToggle={onToggleLayer}
            language={language}
          />
          <LayerRow
            layer="captains"
            label={t('dispatch.layers.captains')}
            count={counts.captains}
            on={layers.captains}
            onToggle={onToggleLayer}
            language={language}
          />
        </CardContent>
      </Card>

      {interventionCount > 0 && (
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => onInterventionsOpen(!interventionsOpen)}
            aria-expanded={interventionsOpen}
            className={cn(
              /* `--row-critical` is the product's own ground for a row in
                 trouble and it is theme-aware, which an alpha over
                 `--destructive` is not. The SENTENCE is ink rather than red:
                 red on this ground measures 3.26 : 1 (globals.css:588), which
                 is a graphic contrast and not a text one — so the red is the
                 dot, where 3 : 1 is the bar it has to clear. */
              'flex w-full items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-row-critical px-3 py-2.5 text-start shadow-2 transition-colors',
              'hover:bg-row-critical-emphasis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              interventionsOpen && 'rounded-b-none border-b-0',
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-destructive" />
              <span className="truncate text-xs text-foreground">
                {t('dispatch.interventions.strip', {
                  count: formatCount(interventionCount, language),
                })}
              </span>
            </span>
            <span className="shrink-0 text-2xs text-muted-foreground">
              {t('dispatch.interventions.open')}{' '}
              <span aria-hidden="true">{mirrorGlyph('›', dir)}</span>
            </span>
          </button>
          {interventionsOpen && interventions}
        </div>
      )}

      <Card className="shrink-0 gap-0 py-3 shadow-2">
        <CardHeader className="px-3 pb-2">
          <CardTitle className={CARD_TITLE}>{t('dispatch.legend.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5 px-3">
          <LegendRow mark={<span className="size-2.5 rounded-full bg-foreground" />}>
            {t('dispatch.legend.tripPickup')}
          </LegendRow>
          <LegendRow mark={<span className="size-2 bg-foreground" />}>
            {t('dispatch.legend.tripDestination')}
          </LegendRow>
          <LegendRow
            mark={
              <span className="size-2.5 rounded-full border-2 border-warning-graphic bg-card" />
            }
          >
            {t('dispatch.legend.requestWaiting')}
          </LegendRow>
          <LegendRow mark={<span className="size-2 rounded-full bg-chart-series" />}>
            {t('dispatch.legend.captainOnline')}
          </LegendRow>
          {/* The caveat, in the same card as the mark it is about. */}
          <p className="pt-1 text-2xs text-muted-foreground">{t('dispatch.legend.note')}</p>
        </CardContent>
      </Card>
    </>
  )
}

const LAYER_DOT: Readonly<Record<DispatchLayer, string>> = {
  trips: 'bg-foreground',
  pending: 'bg-warning-graphic',
  captains: 'bg-chart-series',
}

function LayerRow({
  layer,
  label,
  count,
  on,
  onToggle,
  language,
}: {
  layer: DispatchLayer
  label: string
  count: number
  on: boolean
  onToggle: (layer: DispatchLayer) => void
  language: Language
}) {
  const id = `dispatch-layer-${layer}`
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="flex min-w-0 cursor-pointer items-center gap-2">
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', LAYER_DOT[layer])} />
        <span className="truncate text-xs text-foreground">{label}</span>
        <span className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
          {formatCount(count, language)}
        </span>
      </label>
      <Switch id={id} checked={on} onCheckedChange={() => onToggle(layer)} />
    </div>
  )
}

function LegendRow({ mark, children }: { mark: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      {/* A fixed box so four marks of three shapes still line their labels up. */}
      <span aria-hidden="true" className="flex size-3 shrink-0 items-center justify-center">
        {mark}
      </span>
      {children}
    </p>
  )
}
