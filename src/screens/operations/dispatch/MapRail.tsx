/**
 * The rail floating on the map's inline-end: layers, alerts, legend — what is
 * drawn, what is wrong, what the marks mean. §7.5 the four legend marks differ
 * in shape before colour; R5a the strip's red is a live alert count on a
 * monitor; R18 it does not pulse; X15 the legend's caveat is an `InfoHint` on
 * the legend title, because it explains rather than changes what to do next.
 */

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { InfoHint } from '@/components/InfoHint'
import { ChevronLeftIcon, ChevronRightIcon, directionalIcon } from '@/components/icons'
import { formatCount, type Direction, type Language, type Translator } from '@/lib'
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
  t: Translator
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
  /* Open points forward through the reading order; the card below is closed. */
  const OpenChevron = directionalIcon(
    dir,
    interventionsOpen ? ChevronLeftIcon : ChevronRightIcon,
    interventionsOpen ? ChevronRightIcon : ChevronLeftIcon,
  )
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
                {t.plural('dispatch.interventions.strip', { count: interventionCount })}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-2xs text-muted-foreground">
              {t('dispatch.interventions.open')}
              {/* T9.10 / O10 — a registry chevron chosen by `dir` in code. */}
              <OpenChevron aria-hidden="true" className="size-3.5" />
            </span>
          </button>
          {interventionsOpen && interventions}
        </div>
      )}

      <Card className="shrink-0 gap-0 py-3 shadow-2">
        <CardHeader className="px-3 pb-2">
          <CardTitle className={CARD_TITLE}>
            {t('dispatch.legend.title')}
            {/* X15 — the caveat an operator asks for, beside what it is about. */}
            <InfoHint t={t}>{t('dispatch.legend.note')}</InfoHint>
          </CardTitle>
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
