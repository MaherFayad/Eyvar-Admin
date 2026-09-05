/**
 * The onboarding layer — design §10. **Guided checklist (§5.6) in a shell layer
 * (§5.5, no scrim)**, minted as a pattern row in R4-2 §2.2.
 *
 * ```
 *  ┌─ 480 ──────────────────────────────────────────┐  --ev-drawer-w
 *  │  Getting started                          ✕    │  48px header
 *  │  Ops Manager                                   │  12px --ev-text-2
 *  ├────────────────────────────────────────────────┤
 *  │  ┌──────────────────────────────────────────┐  │  --ev-bg2 intro card
 *  │  │ You keep trips covered and captains …    │  │
 *  │  │ You hold 8 of 13 permissions.            │  │
 *  │  │ Work assigned to you arrives in My Work →│  │
 *  │  └──────────────────────────────────────────┘  │
 *  │  2 of 7 completed                              │
 *  │  ▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  4px, fill --ev-ink
 *  │  ✓ Check the account that is now yours         │
 *  │  ○ Find your own name in the activity log ←── EXPANDED
 *  │     [ Open Activity Log ] [ Mark as done ]     │
 *  │     Skip this step                             │
 *  │  ⊘ Tell a stale feed from a dead one           │  unavailable
 *  │     Live Dispatch isn't built yet. …           │
 *  │  ▸ Skipped (1)                                 │
 *  │  ▸ Completed under a previous role (2)         │
 *  ├────────────────────────────────────────────────┤
 *  │  Restart onboarding                 [ Dismiss ]│  footer
 *  └────────────────────────────────────────────────┘
 * ```
 *
 * ## Route, and what is deliberately not one
 *
 * `?onboarding=1` — **an overlay param, never a route of its own.** Browser
 * Back closes it and stays put. `route.overlay` gains `onboarding` and **not**
 * `reauth` (R4-3): a re-authentication surface with an address is one an
 * operator can navigate past, so it is a modal instead.
 *
 * ## Not a tour, and not an empty state
 *
 * §5.6's last MUST forbids coach marks, spotlights and modal wizards
 * (**AC-615**) — there are none here. And **AC-614**: onboarding never renders
 * inside a work queue's empty state or any R8 first-run treatment. R8's
 * first-run means *nothing has ever existed here*; wave 2's **E1 `queue
 * clear`** prohibition (Q-36) is exactly right, because a training checklist at
 * the moment an operator finishes their queue is the opposite signal.
 *
 * ## Auto-detection produces no toast
 *
 * **AC-612.** When a step's `autoSignal` fires because the operator did the
 * real task, the step marks done **silently**. They already got that task's own
 * toast; a second one for a checklist tick is a toast where nothing is needed.
 * The standing signal is the account-menu entry's `n / m`, which is where R10
 * routes a standing condition. *Stated because an engineer will otherwise add
 * the toast.*
 *
 * ## The four states
 *
 * | State | Treatment |
 * |---|---|
 * | content | the layer above |
 * | **`track-empty`** (**AC-631**) | `no-match` empty — one grey sentence, no illustration (R8). **The intro and the progress line are not rendered**; there is nothing to be `0 of 0` about |
 * | loading (**AC-650**) | **skeleton shaped like the step list** — an intro block, a progress bar, seven row bars. Never a centred spinner |
 * | error (**AC-649**) | `ErrorState`, **`card` scope**, inside the layer. The layer stays open and dismissible and **the console behind it keeps working** |
 *
 * Rules applied
 *   §5.5/AC-595 **no scrim**, and the workspace behind stays visible, readable
 *               and **operable** (**AC-596**). `ShellLayer` owns both.
 *   §7.3.3      **no focus trap** — the scrim decides the trap, and there is
 *               none. Focus moves *in* on open and `Tab` leaves.
 *   AC-597/613  `Escape` closes, focus returns to the account-menu trigger, and
 *               **closing marks nothing complete**.
 *   AC-604      `accordion` `type="single"` `collapsible` — at most one
 *               expanded, and expanding a second collapses the first.
 *   AC-605      **only the expanded step** shows its description, its action
 *               and its skip control — and **no step renders a `Learn more`
 *               link, in any state**, because a rendered one now *fails* the
 *               criterion (spec §19.3 C-5).
 *   AC-611      **no step is hidden.** Unavailable steps render disabled in
 *               place with the reason named, and are excluded from `total`.
 *   §10.4       **no confirmation modal** on skip, dismiss or restart: §5.5
 *               forbids a modal nested inside a no-scrim layer, and nothing
 *               irreversible is destroyed.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  completeStep,
  dismissOnboarding,
  findSubTabById,
  restartOnboarding,
  skipStep,
} from '@/data/clients'
import type { OnboardingChecklist, OnboardingStep } from '@/data/types/onboarding'
import { Accordion } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import type { Translator } from '@/lib'
import { ShellLayer } from '@/shell/ShellLayer'
import { useShell } from '@/shell/ShellContext'
import { splitAroundPlaceholder } from '@/components/auth/IsolatedValue'
import type { RoleName } from '@/data/types/session'
import { track } from '@/lib/analytics'
import { ROLE_INTRO_KEYS, ROLE_KEYS } from './copy'
import { CompleteArt, ROLE_ART } from './illustrations'
import { OnboardingStepRow } from './OnboardingStepRow'

export interface OnboardingLayerProps {
  open: boolean
  onClose: () => void
  t: Translator
  /** The step the URL names (`?onboarding=<id>`), so Back lands on the row the operator left. */
  initialStepId?: string | null
  /** Reports the expanded step so the shell can write it into the URL. */
  onStepChange?: (stepId: string | null) => void
}

/** The sub-tab §8.3 part 3 links to. One id, from the route table, never a path. */
const MY_WORK_SUB_TAB = 'operations-my-work'

/** The three steps every track shares (AC-618). Done together, the intro says so. */
const COMMON_STEP_IDS = ['common.account', 'common.mywork', 'common.audit'] as const

function daysSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86_400_000))
}

export function OnboardingLayer({
  open,
  onClose,
  t,
  initialStepId = null,
  onStepChange,
}: OnboardingLayerProps) {
  const navigate = useNavigate()
  /**
   * **One read, at the shell, consumed here.** The account-menu entry carries
   * `{done} / {total}` whether or not this layer has ever been opened
   * (**AC-599**), so the read has to live above the layer; and a second read
   * inside the layer would let the menu and the list disagree for exactly as
   * long as one of them was stale. `refreshOnboarding` after a mutation
   * therefore updates both at once.
   */
  const shell = useShell()
  const checklist = {
    status: shell.onboardingStatus,
    data: shell.onboarding,
    refetch: shell.refreshOnboarding,
  }

  const [expanded, setExpanded] = useState<string | undefined>(undefined)
  /** Row-scoped failure, keyed by step id (**AC-646**, **AC-647**). */
  const [rowError, setRowError] = useState<{ id: string; key: string } | null>(null)
  const [footerError, setFooterError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  const data = checklist.data
  const steps = useMemo(() => data?.steps ?? [], [data])

  /* §10.1 — **on open, the first incomplete step is expanded.** That is the
     graceful degradation §8.4 names, and it needs nothing from Q1: the layer
     does not have to remember where the operator was, because "the first thing
     still to do" is a better answer than "where you were last week" anyway. */
  useEffect(() => {
    if (!open || data === null) return
    setExpanded((current) => {
      if (current !== undefined) return current
      if (initialStepId !== null && data.steps.some((step) => step.id === initialStepId)) {
        return initialStepId
      }
      const first = data.steps.find(
        (step) =>
          step.reachable &&
          !data.state.completedStepIds.includes(step.id) &&
          !data.state.skippedStepIds.includes(step.id),
      )
      return first?.id
    })
  }, [open, data, initialStepId])

  const run = useCallback(
    async (id: string, errorKey: string, action: () => Promise<OnboardingChecklist>) => {
      setPending(id)
      setRowError(null)
      setFooterError(null)
      try {
        await action()
        /* **AC-648** — the layer **re-reads and re-renders**. A two-tab race is
           not a page condition, so there is no banner: if the operator's action
           is still valid it applies, and if it is not, the re-read simply shows
           the truth. */
        checklist.refetch()
      } catch {
        if (id === 'footer') setFooterError(errorKey)
        else setRowError({ id, key: errorKey })
      } finally {
        setPending(null)
      }
    },
    [checklist],
  )

  const role = data?.role ?? null
  const roleLabel = role !== null ? t(ROLE_KEYS[role] ?? 'role.support') : ''

  return (
    <ShellLayer
      open={open}
      onClose={onClose}
      title={t('onboarding.title')}
      /* §10.1 — the header's subtitle **is the role name**, and it is a key. */
      subtitle={roleLabel === '' ? null : roleLabel}
      t={t}
      /* **AC-649** — *"the layer stays open and **dismissible**"* even when the
         checklist read failed. The footer is therefore NOT gated on the data:
         an operator whose checklist would not load still has to be able to
         close the thing, and a footer that disappears with its content is a
         layer with no exit. `Restart` is disabled in that state because there
         is no track to restart; `Dismiss` is not, because dismissing needs
         nothing from the read. */
      footer={
          <div className="flex items-center gap-2 border-t border-border p-3">
            {/* §10.4 — clears completions **for the current track only**,
                un-dismisses, and re-renders at `0 of {total}` (**AC-640**).
                **No confirmation**: §5.5 forbids a modal nested inside a
                no-scrim layer, and a restarted checklist is training to redo,
                not a record to lose. Inline-**start**. */}
            <Button
              variant="ghost"
              size="default"
              disabled={pending !== null || data === null}
              onClick={() =>
                void run('footer', 'onboarding.error.restart', () => restartOnboarding())
              }
            >
              {t('onboarding.restart')}
            </Button>
            <div className="ms-auto">
              {/* **AC-636** — available at **any** time, not only at completion.
                  A deliberate extension of §5.6: an operator on their first
                  shift can be handed a live safety incident in minute four, and
                  a checklist they cannot close is a trap. §5.6's *"MUST NOT
                  resurrect it afterwards"* is honoured exactly — no auto-open,
                  no banner, ever again (**AC-637**), and the account-menu entry
                  still opens it (**AC-638**). */}
              <Button
                variant={data?.isComplete ? 'default' : 'secondary'}
                size="default"
                disabled={pending !== null}
                onClick={() => {
                  track('onboarding.dismissed', {
                    done: data?.doneCount ?? 0,
                    total: data?.totalCount ?? 0,
                  })
                  void run('footer', 'onboarding.error.dismiss', () => dismissOnboarding())
                  onClose()
                }}
              >
                {t('onboarding.dismiss')}
              </Button>
            </div>
            {footerError !== null && (
              <ErrorState
                scope="row"
                message={t(footerError)}
                action={{
                  label: t('onboarding.tryAgain'),
                  onClick: () => void run('footer', footerError, () => dismissOnboarding()),
                }}
              />
            )}
          </div>
      }
    >
      {checklist.status === 'loading' ? (
        <ListSkeleton />
      ) : checklist.status === 'error' || data === null ? (
        /* **AC-649** — card scope. The layer stays open and dismissible, and
           the console behind it keeps working. */
        <ErrorState
          scope="card"
          card={false}
          message={t('onboarding.error')}
          action={{ label: t('onboarding.tryAgain'), onClick: checklist.refetch }}
        />
      ) : data.totalCount === 0 ? (
        /* **AC-631** — `track-empty`. One grey sentence, no illustration (R8),
           and **neither the intro nor the progress line renders**: there is
           nothing to be `0 of 0` about. */
        <EmptyState kind="no-match" card={false} message={t('onboarding.trackEmpty')} />
      ) : data.isComplete ? (
        /* **AC-635** — the list collapses to a done line and `Dismiss` takes
           primary emphasis in the footer. */
        <div className="flex flex-col gap-3">
          {/* The one hero-sized picture, because it is the one moment (plan §5 C-2). */}
          <CompleteArt className="h-28 w-40 max-w-full" />
          <p className="flex items-center gap-1 text-xs font-semibold text-success-foreground">
            <CheckGlyph />
            {t('onboarding.done')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('onboarding.doneBody', { role: roleLabel })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Intro
            t={t}
            introKey={ROLE_INTRO_KEYS[data.role] ?? 'onboarding.intro.support'}
            held={data.permissionsHeld}
            total={data.permissionsTotal}
            role={data.role}
            commonDone={COMMON_STEP_IDS.every((id) => data.state.completedStepIds.includes(id))}
            onOpenMyWork={() => {
              const row = findSubTabById(MY_WORK_SUB_TAB)
              if (row) {
                onClose()
                navigate(row.path)
              }
            }}
          />

          <Progress t={t} done={data.doneCount} total={data.totalCount} />

          <Accordion
            type="single"
            collapsible
            value={expanded ?? ''}
            onValueChange={(next) => {
              const id = next === '' ? undefined : next
              setExpanded(id)
              onStepChange?.(id ?? null)
            }}
            className="gap-0"
          >
            {steps
              .filter((step) => !data.state.skippedStepIds.includes(step.id))
              .filter((step) => !data.state.archivedStepIds.includes(step.id))
              .map((step) => (
                <OnboardingStepRow
                  key={step.id}
                  step={step}
                  t={t}
                  done={data.state.completedStepIds.includes(step.id)}
                  pending={pending === step.id}
                  errorKey={rowError?.id === step.id ? rowError.key : null}
                  onOpenDestination={() => {
                    /* **AC-607** — navigates **and closes the layer**. The step
                       is *not* marked done by navigating: only its `autoSignal`
                       or `Mark as done` does that. */
                    const path = destinationPath(step)
                    if (path === null) return
                    track('onboarding.step.opened', { stepId: step.id, role: data.role })
                    /* A push, not a close: the entry behind it still carries
                       `?onboarding=<step>`, so Back returns to this row (plan D-1). */
                    navigate(path)
                  }}
                  onMarkDone={() =>
                    void run(step.id, 'onboarding.error.mark', async () => {
                      const next = await completeStep(step.id, 'manual')
                      track('onboarding.step.completed', {
                        stepId: step.id,
                        role: next.role,
                        mode: 'manual',
                      })
                      if (next.isComplete) {
                        track('onboarding.completed', {
                          role: next.role,
                          days: daysSince(next.state.startedAt),
                        })
                      }
                      return next
                    })
                  }
                  onSkip={() =>
                    void run(step.id, 'onboarding.error.skip', async () => {
                      const next = await skipStep(step.id, true)
                      track('onboarding.step.skipped', { stepId: step.id, role: next.role })
                      return next
                    })
                  }
                />
              ))}
          </Accordion>

          {/* §10.4 — a skipped row **moves** to this group and can be
              re-entered from it (**AC-633**). A skip does not fake progress
              (**AC-634**): the numerator counts completions only. */}
          <StepGroup
            t={t}
            label={t('onboarding.skipped', {
              count: data.state.skippedStepIds.length,
            })}
            ids={data.state.skippedStepIds}
            steps={steps}
            action={{
              label: t('onboarding.step.doThis'),
              onSelect: (id) =>
                void run(id, 'onboarding.error.skip', () => skipStep(id, false)),
            }}
          />

          {/* **AC-644** — completed under a former role and now unreachable.
              **Archived, not deleted**: a demotion must not read as regression.
              Read-only, and excluded from `total`. */}
          <StepGroup
            t={t}
            label={t('onboarding.archived', {
              count: data.state.archivedStepIds.length,
            })}
            ids={data.state.archivedStepIds}
            steps={steps}
          />
        </div>
      )}
    </ShellLayer>
  )
}

/**
 * §8.3's three parts, in one `--ev-bg2` card:
 *
 * 1. one sentence of what the role is accountable for;
 * 2. `You hold {held} of {total} permissions.` (**AC-601**);
 * 3. `Work assigned to you arrives in {subTab}.`, with the sub-tab as a link
 *    that opens the route and closes the layer.
 */
function Intro({
  t,
  introKey,
  held,
  total,
  role,
  commonDone,
  onOpenMyWork,
}: {
  t: Translator
  introKey: string
  held: number
  total: number
  role: RoleName
  commonDone: boolean
  onOpenMyWork: () => void
}) {
  const Art = ROLE_ART[role]
  const row = findSubTabById(MY_WORK_SUB_TAB)
  const subTab = row ? t(row.titleKey) : ''
  /* One key, one placeholder, one substitution point — split on a sentinel so
     the LINK lands where the translator put the placeholder, not where an
     English word order happens to leave it. */
  const [before, after] = splitAroundPlaceholder(t, 'onboarding.intro.myWork', 'subTab')

  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="text-sm text-foreground">{t(introKey)}</p>
      {/* Two numbers in one sentence — `t()`, not `t.plural`. `pluralCountIn`
          refuses two numerics on purpose: there is no defensible way to guess
          which one governs the verb. */}
      <p className="text-sm text-muted-foreground">
        {t('onboarding.intro.permissions', { held, total })}
      </p>
      {commonDone ? (
        /* C-3 — once the shared three are done the third line says so, once,
           in the card. No banner, no toast. */
        <p className="text-sm text-muted-foreground">{t('onboarding.intro.commonDone')}</p>
      ) : (
      <p className="text-sm text-muted-foreground">
        {before}
        <button
          type="button"
          onClick={onOpenMyWork}
          className="rounded-sm text-info-foreground underline underline-offset-4 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
        >
          {subTab}
        </button>
        {after}
      </p>
      )}
      </div>
      {/* Decorative, `aria-hidden` inside the component; the text carries everything. */}
      {Art !== undefined && <Art className="h-16 w-24 shrink-0" />}
    </div>
  )
}

/**
 * §10.1's progress line and bar.
 *
 * **`total` counts reachable steps only** (**AC-603**) — the data layer derives
 * it, so a screen never recomputes it and the two can never disagree.
 *
 * The bar's fill is **`--ev-ink`** (`bg-primary`), not `--ev-blue`: blue's
 * declared roles are the focus ring, a chart series, selection and a link on
 * white, and it would compete with the expanded step's primary. A native
 * `<progress>` carries the semantics with the line as its accessible name, and
 * **the bar is never the sole carrier** — the sentence above it is.
 */
function Progress({ t, done, total }: { t: Translator; done: number; total: number }) {
  const label = t('onboarding.progress', { done, total })
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex flex-col gap-1">
      <p id="onboarding-progress-label" className="text-xs text-muted-foreground">
        {label}
      </p>
      <div
        role="progressbar"
        aria-labelledby="onboarding-progress-label"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        className="h-1 w-full overflow-hidden rounded-lg bg-muted"
      >
        {/* The fill mirrors — it fills from the inline-start, because a
            progress bar is a reading-direction quantity. */}
        <div className="h-full bg-primary transition-[width]" style={{ inlineSize: `${percent}%` }} />
      </div>
    </div>
  )
}

/**
 * `Skipped (n)` and `Completed under a previous role (n)` — collapsed
 * `collapsible` groups at the foot. Rendered only when non-empty: an empty
 * `Skipped (0)` is a row that names nothing.
 */
function StepGroup({
  t,
  label,
  ids,
  steps,
  action,
}: {
  t: Translator
  label: string
  ids: readonly string[]
  steps: readonly OnboardingStep[]
  action?: { label: string; onSelect: (id: string) => void }
}) {
  if (ids.length === 0) return null
  const rows = steps.filter((step) => ids.includes(step.id))
  return (
    <Collapsible className="flex flex-col">
      <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-lg py-2 text-start text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card">
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 ps-2">
        {rows.map((step) => (
          <div key={step.id} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t(step.titleKey)}</span>
            {action && (
              <Button
                variant="ghost"
                size="xs"
                className="ms-auto"
                onClick={() => action.onSelect(step.id)}
              >
                {action.label}
              </Button>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * **AC-650** — *"a skeleton shaped like the step list: an intro block, a
 * progress bar, seven row bars. Never a centred spinner."* Seven, because seven
 * is the smallest track and a skeleton that over-promises rows reflows when the
 * data lands.
 */
function ListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-1 w-full" />
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4, 5, 6].map((row) => (
          <Skeleton key={row} className="h-4 w-full" />
        ))}
      </div>
    </div>
  )
}

/** `✓`, 12 px, `currentColor`. A mark: it does not mirror, and it is decorative. */
function CheckGlyph() {
  return (
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
  )
}

/**
 * A step's destination as a path — **from the route table, never hard-coded**.
 *
 * **AC-608** is a diff of the fixture against `routeTable.ts`, and this is the
 * consumer that makes the diff matter: a step naming an id that is not there
 * resolves to `null` and renders no destination button rather than a link into
 * nothing.
 *
 * `subTabId` is `string | null` because **two steps open shell layers** —
 * `common.account` opens `my-account` and `support.profile` opens the profile —
 * and a layer rides as an overlay param over whatever route the operator is on,
 * so it has no sub-tab of its own.
 */
function destinationPath(step: OnboardingStep): string | null {
  const destination = step.destination
  if (destination === null) return null
  if (destination.layer !== null) {
    /* A layer is a param on the CURRENT route, so the path is the layer's own
       param appended to wherever the operator already is. `account` is `me`;
       `profile` needs an entity the checklist does not name, so it is not
       navigable from here and the step is manual-completion only. */
    return destination.layer === 'account' ? '?account=me' : null
  }
  if (destination.subTabId === null) return null
  const row = findSubTabById(destination.subTabId)
  if (!row) return null
  return destination.view === null ? row.path : `${row.path}?view=${destination.view}`
}
