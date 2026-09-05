/**
 * The first-arrival welcome: four slides, shown once per account and never
 * again (owner override of §5.6, `docs/RULINGS.md` 2026-09-05). Picture on
 * the start side, words on the end side; two slides show the product itself,
 * two are drawn. Closing by any route counts as seen; `Start the checklist`
 * opens the layer.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RoleName } from '@/data/types/session'
import { useTheme } from '@/hooks'
import { localeFor, type Language, type Translator } from '@/lib'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { ROLE_INTRO_KEYS } from './copy'
import { ROLE_ART, WelcomeLoopArt, WelcomeRouteArt, type ArtProps } from './illustrations'
import type { ComponentType } from 'react'

export interface WelcomeDialogProps {
  open: boolean
  name: string
  role: RoleName
  /** Reachable steps in the operator's track; the last slide names the count. */
  stepCount: number
  /** Workspace titles the operator's role can open, in nav order. */
  workspaceNames: readonly string[]
  language: Language
  t: Translator
  /** `start` is true when the operator chose to open the checklist. */
  onFinish: (start: boolean) => void
}

type Media =
  | { kind: 'art'; Art: ComponentType<ArtProps> }
  | { kind: 'shot'; file: 'mywork' | 'palette'; altKey: string }

type SlideId = 'step1' | 'step2' | 'step3' | 'step4'

const SLIDE_IDS: readonly SlideId[] = ['step1', 'step2', 'step3', 'step4']

/** The greeting uses the first name; the full name stays in the account menu. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

export function WelcomeDialog({
  open,
  name,
  role,
  stepCount,
  workspaceNames,
  language,
  t,
  onFinish,
}: WelcomeDialogProps) {
  const [index, setIndex] = useState(0)
  /* A capture is stored per theme so a dark console never shows a light page. */
  const { resolved: theme } = useTheme({ applyToDocument: false })
  const id = SLIDE_IDS[index] ?? 'step1'
  const last = index === SLIDE_IDS.length - 1

  const finish = (start: boolean) => {
    track('onboarding.welcome.finished', { start, slide: index + 1 })
    onFinish(start)
  }
  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDE_IDS.length - 1, next))
    setIndex(clamped)
    track('onboarding.welcome.viewed', { slide: clamped + 1 })
  }

  const media: Media =
    id === 'step1'
      ? { kind: 'art', Art: WelcomeLoopArt }
      : id === 'step2'
        ? { kind: 'shot', file: 'mywork', altKey: 'onboarding.welcome.image.mywork' }
        : id === 'step3'
          ? { kind: 'shot', file: 'palette', altKey: 'onboarding.welcome.image.palette' }
          : { kind: 'art', Art: ROLE_ART[role] ?? WelcomeRouteArt }

  const title =
    id === 'step1'
      ? t('onboarding.welcome.title', { name: firstName(name) })
      : id === 'step4'
        ? t('onboarding.welcome.step4.title', { count: stepCount })
        : t(`onboarding.welcome.${id}.title`)
  const body =
    id === 'step4'
      ? t('onboarding.welcome.step4.body', { count: stepCount })
      : t(`onboarding.welcome.${id}.body`)
  const reach =
    id === 'step1' && workspaceNames.length > 0
      ? t('onboarding.welcome.step1.reach', {
          workspaces: new Intl.ListFormat(localeFor(language), { type: 'conjunction' }).format(
            workspaceNames,
          ),
        })
      : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish(false)}>
      <DialogContent size="lg">
        <div className="flex items-stretch gap-5">
          {/* The picture: a 3:2 frame on the muted ground. A capture is
              cropped to its top edge so the page title stays in view; a
              drawing sits inside with a little air around it. */}
          <div className="flex aspect-3/2 w-3/5 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {media.kind === 'art' ? (
              <media.Art className="h-full w-full p-5" />
            ) : (
              <img
                src={`${import.meta.env.BASE_URL}onboarding/${media.file}.${language}.${theme}.png`}
                alt={t(media.altKey)}
                className="h-full w-full object-cover object-top"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-1">
            {id === 'step1' && (
              <p className="text-xs font-medium text-muted-foreground">{t('onboarding.welcome.eyebrow')}</p>
            )}
            <DialogTitle className="text-lg font-semibold text-balance">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">{body}</DialogDescription>
            {reach !== null && <p className="text-sm text-foreground">{reach}</p>}
            {id === 'step4' && (
              <p className="text-sm text-foreground">{t(ROLE_INTRO_KEYS[role] ?? 'onboarding.intro.support')}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
          <ol
            className="flex items-center gap-1.5"
            aria-label={t('onboarding.welcome.progress', { current: index + 1, total: SLIDE_IDS.length })}
          >
            {SLIDE_IDS.map((each, i) => (
              <li key={each}>
                <button
                  type="button"
                  aria-label={t('onboarding.welcome.progress', { current: i + 1, total: SLIDE_IDS.length })}
                  aria-current={i === index ? 'step' : undefined}
                  onClick={() => go(i)}
                  className={cn(
                    'block size-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    i === index ? 'bg-primary' : 'bg-border',
                  )}
                />
              </li>
            ))}
          </ol>
          <div className="ms-auto flex items-center gap-2">
            <Button variant="ghost" size="default" onClick={() => finish(false)}>
              {t('onboarding.welcome.later')}
            </Button>
            {index > 0 && (
              <Button variant="secondary" size="default" onClick={() => go(index - 1)}>
                {t('onboarding.welcome.back')}
              </Button>
            )}
            {last ? (
              <Button variant="default" size="default" onClick={() => finish(true)}>
                {t('onboarding.welcome.start')}
              </Button>
            ) : (
              <Button variant="default" size="default" onClick={() => go(index + 1)}>
                {t('onboarding.welcome.next')}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
