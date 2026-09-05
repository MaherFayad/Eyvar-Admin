/**
 * The first-arrival welcome: five slides on what the console is, shown once
 * per account and never again (owner override of §5.6, `docs/RULINGS.md`
 * 2026-09-05). Three slides show the product itself, two are drawn. Closing
 * by any route counts as seen; `Start the checklist` opens the layer.
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
import type { Language, Translator } from '@/lib'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { ROLE_INTRO_KEYS } from './copy'
import { WelcomeConsoleArt, WelcomePathArt, type ArtProps } from './illustrations'
import type { ComponentType } from 'react'

export interface WelcomeDialogProps {
  open: boolean
  name: string
  role: RoleName
  /** Reachable steps in the operator's track; the last slide names the count. */
  stepCount: number
  language: Language
  t: Translator
  /** `start` is true when the operator chose to open the checklist. */
  onFinish: (start: boolean) => void
}

type Media =
  | { kind: 'art'; Art: ComponentType<ArtProps> }
  | { kind: 'shot'; file: 'mywork' | 'activity' | 'palette'; altKey: string }

interface Slide {
  id: 'step1' | 'step2' | 'step3' | 'step4' | 'step5'
  media: Media
}

const SLIDES: readonly Slide[] = [
  { id: 'step1', media: { kind: 'art', Art: WelcomeConsoleArt } },
  { id: 'step2', media: { kind: 'shot', file: 'mywork', altKey: 'onboarding.welcome.image.mywork' } },
  { id: 'step3', media: { kind: 'shot', file: 'activity', altKey: 'onboarding.welcome.image.activity' } },
  { id: 'step4', media: { kind: 'shot', file: 'palette', altKey: 'onboarding.welcome.image.palette' } },
  { id: 'step5', media: { kind: 'art', Art: WelcomePathArt } },
]

export function WelcomeDialog({
  open,
  name,
  role,
  stepCount,
  language,
  t,
  onFinish,
}: WelcomeDialogProps) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index] ?? SLIDES[0]!
  const last = index === SLIDES.length - 1

  const finish = (start: boolean) => {
    track('onboarding.welcome.finished', { start, slide: index + 1 })
    onFinish(start)
  }
  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, next))
    setIndex(clamped)
    track('onboarding.welcome.viewed', { slide: clamped + 1 })
  }

  const title =
    slide.id === 'step1'
      ? t('onboarding.welcome.title', { name })
      : t(`onboarding.welcome.${slide.id}.title`)
  const body =
    slide.id === 'step5'
      ? t('onboarding.welcome.step5.body', { count: stepCount })
      : t(`onboarding.welcome.${slide.id}.body`)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && finish(false)}>
      <DialogContent size="lg">
        {/* Media first: a 16:9 frame on the muted ground. A screenshot is
            cropped to its top edge so the page title stays in view; the art
            sits centred inside it. */}
        <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
          {slide.media.kind === 'art' ? (
            <slide.media.Art className="h-3/5 w-3/5" />
          ) : (
            <img
              src={`${import.meta.env.BASE_URL}onboarding/${slide.media.file}.${language}.png`}
              alt={t(slide.media.altKey)}
              className="h-full w-full object-cover object-top"
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{body}</DialogDescription>
          {slide.id === 'step5' && (
            <p className="text-sm text-foreground">{t(ROLE_INTRO_KEYS[role] ?? 'onboarding.intro.support')}</p>
          )}
        </div>

        <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
          <ol
            className="flex items-center gap-1.5"
            aria-label={t('onboarding.welcome.progress', { current: index + 1, total: SLIDES.length })}
          >
            {SLIDES.map((each, i) => (
              <li key={each.id}>
                <button
                  type="button"
                  aria-label={t('onboarding.welcome.progress', { current: i + 1, total: SLIDES.length })}
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
