/**
 * The install affordance — P1's last piece.
 *
 * ## What it is, and what it deliberately is not
 *
 * A small dismissible panel anchored to the bottom inline-end corner, rendered
 * **only** when the browser has actually offered a prompt. It is not a banner:
 * R10's one-banner invariant governs `ShellBanner`, and an install offer is not
 * a standing condition of the workspace — it is a one-time, browser-originated
 * offer that disappears the moment it is answered. Putting it through
 * `ShellBanner` would mean an install offer could suppress an offline warning,
 * which is the wrong way round.
 *
 * It is also not chrome anyone has to maintain. It renders `null` in every
 * situation except one: Chromium fired `beforeinstallprompt`, the operator has
 * not dismissed it before, and the app is not already installed. In jsdom —
 * every test in this repo — that event never fires, so this component is
 * `null` in the entire test suite and adds nothing to any existing assertion.
 *
 * ## Layout rules it obeys
 *
 *   §0.1     no second breakpoint. It is `fixed`, sized in `w-80`, and
 *            participates in no screen's layout. Nothing reflows because of it.
 *   AC-70/71 anchored with the logical `end-4`, so it mirrors with the page.
 *            The **mark inside it does not mirror** (§9.5) — it is brand — but
 *            there is no mark here, only text and two buttons.
 *   §5.7     heading states the value; both buttons are verbs.
 *   tokens   `bg-card`, `border-border`, `shadow-1`, `rounded-xl` and the type
 *            scale, all lifted from `components/ui/card.tsx` rather than
 *            invented. No arbitrary values, no palette classes, no hex.
 */

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useShell } from '@/shell/ShellContext'
import { dismissInstallPrompt, promptInstall, useInstallState } from './install'

export function InstallAffordance() {
  const { language } = useShell()
  const { isInstallable, isInstalled } = useInstallState()

  const onInstall = useCallback(() => {
    void promptInstall()
  }, [])

  if (!isInstallable || isInstalled) return null

  const t = language.t

  return (
    <aside
      /* `region` with a name rather than `dialog`: it steals no focus and traps
         none. An operator reading a queue must not be interrupted by an offer to
         install — the offer waits until they look at it. */
      aria-label={t('pwa.install.title')}
      className="fixed bottom-4 end-4 z-50 w-80 rounded-xl border border-card-border bg-card p-3 text-sm text-card-foreground shadow-1"
    >
      <p className="font-medium">{t('pwa.install.title')}</p>
      <p className="mt-1 text-muted-foreground">{t('pwa.install.body')}</p>
      <div className="mt-3 flex justify-end gap-2">
        {/* Default size, not `xs`: `xs` is the 24px control the table toolbars
            use, and a 24px target in a floating panel is a miss waiting to
            happen. `secondary` is `Button`'s default variant by D-2, so the
            dismiss button takes no `variant` at all. */}
        <Button onClick={dismissInstallPrompt}>{t('pwa.install.dismiss')}</Button>
        <Button variant="default" onClick={onInstall}>
          {t('pwa.install.action')}
        </Button>
      </div>
    </aside>
  )
}
