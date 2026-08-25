/**
 * The full-bleed plan editor — `/financials/pricing/plans/:planId/edit`, and
 * nothing else. Design spec §7.3, **AC-13**.
 *
 * **The shell unmounts entirely**: no rail, no sub-tab column, no app top bar.
 * That is structural, not cosmetic — this route is a SIBLING of `AppLayout` in
 * `routes.tsx`, so none of the three is in the DOM. A `hidden` class would
 * leave all three there and AC-13 asks specifically about the DOM.
 *
 * Its own 48px bar carries, at minimum: exit (`⇤`, **mirrors** to `⇥` in
 * Arabic), the plan name, its status badge, and a `Save` greyed when there is
 * nothing to save (§2.5). Exit returns to `/financials/pricing` with both nav
 * columns restored and `Pricing & Plans` selected — which happens for free,
 * because both columns are route-derived.
 *
 * **No inspector panel.** §2.5 recommends one for multi-mode editors; the plan
 * editor has one mode.
 *
 * **Phase 1 wave 3 builds the form.** What 0.7 owns is the SHELL of this
 * screen: the bleed geometry, the bar, the exit contract and AC-13. The form
 * itself is a P3 surface with derived values (§8.2) and it arrives with
 * `useForm`; the `canSave` wiring below is the seam it plugs into.
 */

import { useNavigate, useParams } from 'react-router-dom'
import { FullBleedEditorShell } from '@/components/PageShell'
import { StatusBadge } from '@/components/StatusBadge'
import { useShell } from '@/shell/ShellContext'

export function PlanEditorScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { planId } = useParams<{ planId: string }>()
  const { t, dir } = shell.language

  return (
    <FullBleedEditorShell
      /* Until wave 3 loads the plan, the id IS the name we can honestly show —
         inventing a placeholder name would be worse than the identifier the
         operator navigated with. */
      title={planId ?? ''}
      badge={<StatusBadge tone="info">{t('view.pricing.subscriptionPlans')}</StatusBadge>}
      /* §7.3 — exit returns to the sub-tab, with both columns restored and
         `Pricing & Plans` selected. Route-derived, so nothing sets that. */
      onExit={() => navigate('/financials/pricing')}
      onSave={() => undefined}
      /* §2.5 — greyed when there is nothing to save. Nothing is editable yet,
         so there is nothing to save yet, and the button says so. */
      canSave={false}
      t={t}
      dir={dir}
    >
      {/* §8.2.3 — the preview strip and the inputs card land here in wave 3. */}
      <div className="rounded-xl border border-border bg-card shadow-1 p-3">
        <p className="text-sm text-muted-foreground">
          {t('state.cardError.message', { resource: t('subtab.financials.pricing') })}
        </p>
      </div>
    </FullBleedEditorShell>
  )
}
