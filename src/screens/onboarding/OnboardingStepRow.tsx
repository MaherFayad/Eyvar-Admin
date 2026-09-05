/**
 * One row of the checklist — design §10.2.
 *
 * | State | Marker | Title ink | Extra |
 * |---|---|---|---|
 * | Not started | `○` 16 px circle, 1 px `--ev-hairline` | `--ev-ink` | — |
 * | Expanded | `○` | `--ev-ink` 600 | the `--ev-bg2` sub-card below it |
 * | Done | `✓` 16 px **`--ev-green`** | `--ev-text-2` | — |
 * | Unavailable — unbuilt (**AC-609**) | `⊘` circle-slash `--ev-text-2` | `--ev-text-2` | reason line, 12 px |
 * | Unavailable — forbidden (**AC-610**) | `⊘` | `--ev-text-2` | the permission and who grants it |
 *
 * ## R19 is checked and deliberately not spent
 *
 * The not-started circle uses **`--ev-hairline`, not `--ev-hairline-strong`**,
 * because the step's state is carried by the **`✓` glyph and the ink weight**,
 * never by the circle's boundary. `--ev-green` on white is **5.958 : 1** (it was
 * 7.098 before the 2026-09-02 brand ruling moved `--ev-green` to `#1d723c` to
 * separate semantic success from the brand action), so the meaningful graphic
 * still clears 3 : 1 with room. R19 licences
 * `--ev-hairline-strong` for an unchecked checkbox/radio boundary and *"any
 * second use needs a §6.2 row"* — no second use is taken here.
 *
 * ## The markers are decorative
 *
 * `aria-hidden`, with the state carried by the row's **accessible name** —
 * `Check the account that is now yours, completed` (§13). A screen reader that
 * announced a `✓` glyph and then the title would say the state twice in one
 * language and once in the other.
 *
 * ## No step is hidden
 *
 * **AC-611.** An unavailable step renders **disabled in place with the reason
 * named** — foundation §11.2's *"Disabled actions MUST render greyed in place;
 * do NOT hide actions that are merely unavailable"*, applied to a checklist. It
 * is excluded from `total` (**AC-603**), which is a different thing from being
 * excluded from the list.
 *
 * ## No `Learn more`, in any state
 *
 * `learnMoreKey` is `null` on all 21 rows and **AC-605 fails if a link
 * renders** (spec §19.3 C-5). This component has no branch that could render
 * one — the field is not read. That is deviation **A-7** and finding **F-2**,
 * tracked as **Q-82**.
 */

import { useEffect, useRef, useState } from 'react'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ErrorState'
import { findSubTabById } from '@/data/clients'
import type { OnboardingStep } from '@/data/types/onboarding'
import type { Translator } from '@/lib'
import { cn } from '@/lib/utils'
import { permissionName } from '@/shell/permissions'
import { STEP_ART } from './illustrations'

export interface OnboardingStepRowProps {
  step: OnboardingStep
  t: Translator
  done: boolean
  pending: boolean
  /** A row-scoped failure key (**AC-646**, **AC-647**), or `null`. */
  errorKey: string | null
  onOpenDestination: () => void
  onMarkDone: () => void
}

export function OnboardingStepRow({
  step,
  t,
  done,
  pending,
  errorKey,
  onOpenDestination,
  onMarkDone,
}: OnboardingStepRowProps) {
  const title = t(step.titleKey)
  const unavailable = !step.reachable
  const Art = STEP_ART[step.id]

  /* C-1 — the tick draws in only when the step completes while on screen;
     a step that arrives done is drawn already. */
  const wasDone = useRef(done)
  const [justDone, setJustDone] = useState(false)
  useEffect(() => {
    if (done && !wasDone.current) setJustDone(true)
    wasDone.current = done
  }, [done])
  const destinationName = destinationLabel(step, t)

  /* §13 — the marker is decorative, so the state lives in the accessible name.
     One key per state, with the title as a placeholder: never `title + ', ' +
     state`, which is the concatenation **AC-670** forbids. */
  const accessibleName = done
    ? t('onboarding.step.a11y.completed', { title })
    : unavailable
      ? t('onboarding.step.a11y.unavailable', { title })
      : title

  return (
    <AccordionItem
      value={step.id}
      /* An unavailable step is not expandable: there is nothing inside it to
         act on, and an accordion that opens onto a disabled button is a
         promise it cannot keep. The reason renders **under the row**, always
         visible, which is what "disabled in place with the reason named"
         means. */
      disabled={unavailable}
      className="border-b-0"
    >
      <AccordionTrigger
        className={cn(
          'items-center gap-2 py-2',
          done && 'text-muted-foreground',
          unavailable && 'text-muted-foreground',
        )}
        aria-label={accessibleName}
      >
        <span className="flex items-center gap-2">
          <Marker done={done} unavailable={unavailable} animate={justDone} />
          <span className={cn('text-sm', done || unavailable ? 'font-normal' : 'font-medium')}>
            {title}
          </span>
        </span>
      </AccordionTrigger>

      {unavailable ? null : (
        <AccordionContent className="pb-3">
          {/* Only the expanded step shows its description and its actions
              (AC-605). No Skip: the owner removed it (RULINGS.md 2026-09-05).
              The picture is decorative and sits at inline-end. */}
          <div className="ms-6 flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-sm text-muted-foreground">{t(step.bodyKey)}</p>
              <div className="flex flex-wrap items-center gap-2">
                {destinationName !== null && (
                  /* Navigates and closes the layer (AC-607); marks nothing. */
                  <Button variant="default" size="default" onClick={onOpenDestination}>
                    {t('onboarding.step.open', { subTab: destinationName })}
                  </Button>
                )}
                {/* On every step, whether or not it auto-detects (AC-606). */}
                <Button variant="ghost" size="default" onClick={onMarkDone} disabled={pending || done}>
                  {t('onboarding.step.markDone')}
                </Button>
              </div>
              {errorKey !== null && (
                /* AC-646: the step returns to not-done with a retry in the row. */
                <ErrorState
                  scope="row"
                  message={t(errorKey)}
                  action={{ label: t('onboarding.tryAgain'), onClick: onMarkDone }}
                />
              )}
            </div>
            {Art !== undefined && <Art className="h-16 w-24 shrink-0" />}
          </div>
        </AccordionContent>
      )}

      {unavailable && (
        /* **AC-609** — *"renders disabled in place, states why, and is excluded
           from `total`"*. The reason is beneath the row and always visible; it
           is not behind an expansion the row refuses to open. */
        <p className="ms-6 pb-2 text-xs text-muted-foreground">
          {/* **Two different unavailable states, and the test is `available`, not
              `requiredPermission`.** This asked whether the step *declared* a
              permission — which was a serviceable proxy only while every step
              declared `null`. Now that the gates are real (AC-610 is reachable),
              nearly every step has one, so an **unbuilt** destination would have
              rendered the *forbidden* sentence: an operator told they lack a
              permission for a screen that does not exist.

              `available` is whether the destination is built. `reachable` is
              that AND the operator holding the gate. So: not built → unbuilt;
              built but not held → forbidden. */}
          {step.available
            ? t('onboarding.step.forbidden', {
                /* A built-but-unreachable step always has a gate; the fallback is
                   for the type, not for a state that can occur. */
                permission: permissionName(t, step.requiredPermission ?? ''),
              })
            : t('onboarding.step.unbuilt', { subTab: destinationName ?? '' })}
        </p>
      )}
    </AccordionItem>
  )
}

/**
 * §10.2's three markers. `aria-hidden` on all of them — the row's accessible
 * name carries the state.
 *
 * The not-started circle is `border-border` (`--ev-hairline`) and **not**
 * `border-border-strong`: see the file header on R19.
 */
function Marker({
  done,
  unavailable,
  animate,
}: {
  done: boolean
  unavailable: boolean
  animate: boolean
}) {
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
        <path
          d="M4 12.5l5 5L20 6.5"
          strokeDasharray={24}
          className={cn(animate && 'animate-draw motion-reduce:animate-none')}
        />
      </svg>
    )
  }
  if (unavailable) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-4 shrink-0 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M5.6 5.6l12.8 12.8" />
      </svg>
    )
  }
  return (
    <span
      className="size-4 shrink-0 rounded-full border border-border"
      aria-hidden="true"
    />
  )
}

/**
 * The destination's **sub-tab name, from the route table** — itself a key
 * (§11), so `Open My Work` is one key with one placeholder and never
 * `'Open ' + name`.
 *
 * `null` when the step has no navigable destination: no `destination` at all,
 * or a `profile` layer, which needs an entity the checklist does not name.
 */
function destinationLabel(step: OnboardingStep, t: Translator): string | null {
  const destination = step.destination
  if (destination === null) return null
  if (destination.subTabId !== null) {
    const row = findSubTabById(destination.subTabId)
    return row ? t(row.titleKey) : null
  }
  if (destination.layer === 'account') return t('shell.account.myProfile')
  return null
}
