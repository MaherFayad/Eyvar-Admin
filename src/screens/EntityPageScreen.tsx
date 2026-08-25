/**
 * The 360° profile's **full-page escape** — `/entity/:entityId`. Design spec
 * §6.2, spec §3.10 row 31.
 *
 * §6.1 answers the obvious question — why not just make the drawer wider:
 *
 * > **Why 406px and not 648px.** §5.5 permits ~648px when a panel needs
 * > internal columns… but at 1280px a 648px drawer leaves 552px of content
 * > visible — narrower than a detail page's main column — which destroys the
 * > *only* reason a drawer beat a modal. 406px leaves 794px readable behind it.
 * > **Where genuine width is needed, the profile has a full-page escape.**
 * > Width is solved by the escape hatch, not by eating the page.
 *
 * So this is the same entity, in the **main + right rail** shape (§7.2), for
 * deep review. It belongs to no workspace — it is reachable from all five — so
 * neither nav column highlights anything, and `resolveRoute` returns a `detail`
 * shape with no `workspaceId`, which is correct rather than a gap.
 *
 * The four states are the drawer's, on a page: skeleton shaped like the card
 * stack, card-scoped error, `no-match` for an unresolvable id naming the id
 * searched (**AC-42**), and the card stack itself.
 */

import { useNavigate, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks'
import { resolveProfile } from '@/data/clients'
import { isApiError, type ProfileRef } from '@/data/types'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { DetailPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'

export function EntityPageScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { entityId = '' } = useParams<{ entityId: string }>()
  const { t, dir } = shell.language

  const profile = useAsync<ProfileRef>((signal) => resolveProfile(entityId, signal), {
    deps: [entityId],
  })

  const notFound =
    profile.status === 'error' && isApiError(profile.error) && profile.error.kind === 'not-found'

  return (
    <DetailPage
      header={
        <PageHeader
          title={profile.data?.title ?? entityId}
          /* V4 — , and legitimately so: this line is RECORD-DERIVED
             (`RDR-1041 · Rider since Mar 2024`), which is exactly what §8's
             second row is for. It changes when the record changes. */
          meta={profile.data?.subtitle ?? null}
          /* §7.2 / §8 slot 1 — a `detail` shape carries the back arrow. */
          onBack={() => navigate(-1)}
          t={t}
          dir={dir}
        />
      }
      main={
        profile.status === 'loading' ? (
          <LoadingSkeleton pattern="P2" />
        ) : notFound ? (
          /* AC-42's copy, on the page rather than in the layer. Same key. */
          <EmptyState kind="no-match" message={t('state.overlayNotFound.message', { id: entityId })} />
        ) : profile.status === 'error' ? (
          <ErrorState
            scope="card"
            message={t('state.overlayError.message')}
            action={{ label: t('state.overlayError.action'), onClick: profile.refetch }}
          />
        ) : (
          /* §6.2 — the same section contract the drawer uses. Phase 1's
             workspaces contribute their cards to both surfaces at once. */
          <div className="flex flex-col gap-3">
            {(profile.data?.sections ?? []).map((section) => (
              <section key={section} className="rounded-xl border border-border bg-card shadow-1 p-3">
                <h2 className="mb-1 text-sm font-semibold capitalize text-foreground">{section}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('state.cardError.message', { resource: section })}
                </p>
              </section>
            ))}
          </div>
        )
      }
      /* §2.2 — the rail holds ONLY status, publishing, summary and metadata.
         Phase 1 fills it; an empty rail restacks to nothing, which is correct. */
      rail={[]}
    />
  )
}
