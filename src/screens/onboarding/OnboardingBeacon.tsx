/**
 * The floating progress beacon: a ring with the percentage at the bottom
 * inline-end corner while the track is open work and the layer is closed
 * (owner override, `docs/RULINGS.md` 2026-09-05). It opens a small panel that
 * lists the steps; a step goes straight to its screen, and the full checklist
 * is one more click. `Hide` is per session.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { OnboardingChecklist, OnboardingStep } from '@/data/types/onboarding'
import { useCompactShell } from '@/hooks'
import { formatPercent, type Language, type Translator } from '@/lib'
import { cn } from '@/lib/utils'
import { destinationPath } from './destination'

export interface OnboardingBeaconProps {
  checklist: OnboardingChecklist
  t: Translator
  language: Language
  /** Opens the full checklist layer, on a step when one is named. */
  onOpenLayer: (stepId: string | null) => void
  /** Navigates to a step's own screen. */
  onGo: (path: string) => void
  onHide: () => void
}

/* A 40-unit ring: radius 17 leaves room for a 3-unit stroke inside the box. */
const RADIUS = 17
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function OnboardingBeacon({
  checklist,
  t,
  language,
  onOpenLayer,
  onGo,
  onHide,
}: OnboardingBeaconProps) {
  const compact = useCompactShell()
  const [open, setOpen] = useState(false)
  if (compact) return null

  const { state } = checklist
  const reachable = checklist.steps.filter(
    (step) => step.reachable && !state.archivedStepIds.includes(step.id),
  )
  const isDone = (id: string) => state.completedStepIds.includes(id)
  const isSkipped = (id: string) => state.skippedStepIds.includes(id)
  const next = reachable.find((step) => !isDone(step.id) && !isSkipped(step.id))
  const ratio = checklist.totalCount === 0 ? 0 : checklist.doneCount / checklist.totalCount
  const percent = formatPercent(Math.round(ratio * 100), language)
  const label = t('onboarding.beacon.label', {
    done: checklist.doneCount,
    total: checklist.totalCount,
  })

  const select = (step: OnboardingStep) => {
    setOpen(false)
    if (isDone(step.id)) {
      onOpenLayer(step.id)
      return
    }
    const path = destinationPath(step)
    if (path === null) onOpenLayer(step.id)
    else onGo(path)
  }

  return (
    <div data-testid="onboarding-beacon" className="fixed bottom-6 end-6 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${label}, ${percent}`}
            className="relative flex size-12 items-center justify-center rounded-full border border-border bg-popover shadow-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden="true" focusable="false">
              <circle cx="20" cy="20" r={RADIUS} className="fill-none stroke-border" strokeWidth={3} />
              <circle
                cx="20"
                cy="20"
                r={RADIUS}
                className="fill-none stroke-primary"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
                transform="rotate(-90 20 20)"
              />
            </svg>
            <span className="text-xs font-semibold tabular-nums text-foreground">{percent}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
          sideOffset={8}
          data-testid="onboarding-beacon-panel"
          className="w-80 p-0"
        >
          <div className="flex items-center gap-3 border-b border-border px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-sm font-semibold text-foreground">{t('onboarding.title')}</p>
              <p className="text-xs text-muted-foreground">
                {t('onboarding.progress', { done: checklist.doneCount, total: checklist.totalCount })}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">{percent}</span>
          </div>
          <ol className="flex flex-col py-1">
            {reachable.map((step) => {
              const done = isDone(step.id)
              const skipped = isSkipped(step.id)
              const current = next?.id === step.id
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => select(step)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      done || skipped ? 'text-muted-foreground' : 'text-foreground',
                      current && 'font-medium',
                    )}
                  >
                    <Marker done={done} current={current} />
                    <span className="min-w-0 flex-1 truncate">{t(step.titleKey)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="flex items-center gap-2 border-t border-border px-2 py-1.5">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setOpen(false)
                onOpenLayer(next?.id ?? null)
              }}
            >
              {t('onboarding.beacon.open')}
            </Button>
            <Button variant="ghost" size="xs" className="ms-auto" onClick={onHide}>
              {t('onboarding.beacon.hide')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** Decorative; the row's text and colour carry the state. */
function Marker({ done, current }: { done: boolean; current: boolean }) {
  if (done) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0 text-success-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M4 12.5l5 5L20 6.5" />
      </svg>
    )
  }
  return (
    <span
      className={cn('size-4 shrink-0 rounded-full border', current ? 'border-primary' : 'border-border')}
      aria-hidden="true"
    />
  )
}
