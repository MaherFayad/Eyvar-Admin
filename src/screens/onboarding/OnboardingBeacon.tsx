/**
 * The floating progress beacon: one numbered circle per reachable step, done
 * ones filled, at the bottom inline-end corner while the track is open work
 * and the layer is closed (owner override, `docs/RULINGS.md` 2026-09-05).
 * Activating it opens the checklist on the next step; `Hide` is per session.
 */

import { Button } from '@/components/ui/button'
import { CloseIcon } from '@/components/icons'
import type { OnboardingChecklist } from '@/data/types/onboarding'
import { useCompactShell } from '@/hooks'
import type { Translator } from '@/lib'
import { cn } from '@/lib/utils'

export interface OnboardingBeaconProps {
  checklist: OnboardingChecklist
  t: Translator
  onOpen: (stepId: string | null) => void
  onHide: () => void
}

export function OnboardingBeacon({ checklist, t, onOpen, onHide }: OnboardingBeaconProps) {
  const compact = useCompactShell()
  if (compact) return null

  const { state } = checklist
  const reachable = checklist.steps.filter(
    (step) => step.reachable && !state.archivedStepIds.includes(step.id),
  )
  const isDone = (id: string) => state.completedStepIds.includes(id)
  const next = reachable.find((step) => !isDone(step.id) && !state.skippedStepIds.includes(step.id))
  const label = t('onboarding.beacon.label', {
    done: checklist.doneCount,
    total: checklist.totalCount,
  })

  return (
    <div
      data-testid="onboarding-beacon"
      className="fixed bottom-4 end-4 z-40 flex items-center gap-1 rounded-xl border border-border bg-popover p-1 shadow-2"
    >
      <button
        type="button"
        aria-label={next ? `${label}. ${t('onboarding.beacon.next', { title: t(next.titleKey) })}` : label}
        onClick={() => onOpen(next?.id ?? null)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ol className="flex items-center gap-1" aria-hidden="true">
          {reachable.map((step, i) => {
            const done = isDone(step.id)
            const current = next?.id === step.id
            return (
              <li
                key={step.id}
                className={cn(
                  'flex size-5 items-center justify-center rounded-full border text-xs tabular-nums',
                  done && 'border-primary bg-primary text-primary-foreground',
                  !done && current && 'border-primary font-semibold text-foreground',
                  !done && !current && 'border-border text-muted-foreground',
                )}
              >
                {done ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-3"
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
                ) : (
                  i + 1
                )}
              </li>
            )
          })}
        </ol>
        <span className="text-xs text-muted-foreground">
          {t('onboarding.progress', { done: checklist.doneCount, total: checklist.totalCount })}
        </span>
      </button>
      <Button variant="ghost" size="icon-xs" aria-label={t('onboarding.beacon.hide')} onClick={onHide}>
        <CloseIcon aria-hidden="true" className="size-3.5" />
      </Button>
    </div>
  )
}
