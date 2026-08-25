/**
 * The shell banner strip — design spec §4.2, §11.6 states 16 / 17 / 20,
 * **AC-40**.
 *
 * Full viewport width, above everything **including the rail**. 32px
 * (`--ev-shellbar-h`), no radius — it spans the viewport, so a card radius is
 * wrong — a 1px hairline at the bottom, a pale tinted fill from the four-tone
 * set, one line of copy at inline-start and zero to two secondary buttons at
 * inline-end.
 *
 * **AT MOST ONE, EVER.** Impersonating *and* offline renders **one** banner
 * carrying a count, not two (**AC-40**). That is §5.2's merge clause and it is
 * the only legal rendering. The merge is `mergeBanners`, so a second banner is
 * not something this file declines to render — it is something it has no way
 * to produce.
 *
 * `call-active` is a `Banner`, not a bespoke "call bar". Spec §4.2 describes it
 * as a persistent strip; R10 says a standing condition is a banner. Same
 * component, `info` tone, undismissable while the call runs. One fewer
 * component to build and one fewer thing to drift.
 *
 * **None of the three is dismissable** (§11.4): they all name standing
 * conditions, and an operator must not be able to dismiss "You are offline."
 */

import { Banner, BannerConditionList, mergeBanners, type BannerModel } from '@/components/Banner'
import type { Translate } from '@/lib'
import type { ShellConditions } from './ShellContext'

export interface ShellBannerProps {
  conditions: ShellConditions
  t: Translate
  onStopImpersonating: () => void
  onEndCall: () => void
}

export function ShellBanner({
  conditions,
  t,
  onStopImpersonating,
  onEndCall,
}: ShellBannerProps) {
  const active = collect(conditions, t, onStopImpersonating, onEndCall)
  const merged = mergeBanners(active, (count) => t('state.merged.message', { count }))
  if (!merged) return null

  return (
    <Banner banner={merged} variant="shell">
      {/* §4.2 — when two or more are true, the merged banner carries the count
          and then each condition on its own line. */}
      {active.length > 1 && <BannerConditionList lines={active.map((b) => b.title)} />}
    </Banner>
  )
}

/**
 * §4.2's table, as data. Order is severity order, so a single-condition render
 * picks the right tone without a second rule.
 */
function collect(
  conditions: ShellConditions,
  t: Translate,
  onStopImpersonating: () => void,
  onEndCall: () => void,
): BannerModel[] {
  const out: BannerModel[] = []

  if (conditions.impersonating) {
    out.push({
      id: 'impersonating',
      tone: 'warning',
      title: t('state.impersonating.message', { name: conditions.impersonating.name }),
      actions: [{ label: t('state.impersonating.action'), onClick: onStopImpersonating }],
    })
  }

  if (conditions.offline) {
    out.push({
      id: 'offline',
      tone: 'warning',
      title: t('state.offline.message'),
    })
  }

  if (conditions.call) {
    out.push({
      id: 'call-active',
      tone: 'info',
      title: t('state.callActive.message', {
        name: conditions.call.name,
        duration: conditions.call.duration,
      }),
      actions: [{ label: t('state.callActive.action'), onClick: onEndCall }],
    })
  }

  return out
}
