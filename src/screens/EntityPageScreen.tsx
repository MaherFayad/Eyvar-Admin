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
 *
 * ## Two things this screen no longer gets wrong
 *
 * **It rendered no section.** It hardcoded `t('state.cardError.message')` for
 * every key in `ref.sections`, so a healthy captain's page showed nine cards
 * each claiming to have failed. It now renders `<ProfileSections>` — the same
 * component, from the same registry, as `ProfileLayer`. Neither surface holds a
 * list of sections and neither can be given a different one.
 *
 * **It shipped `rail={[]}`**, so §7.2's *"main plus right rail"* collapsed to a
 * single column and the escape hatch was a wider drawer with a back arrow. The
 * rail is `profileRail()` — status, summary and metadata, which is exactly and
 * only what §2.2 permits there. Those three are built from the identity record,
 * so the identity **card** is omitted from the main column (`RAIL_SECTIONS`)
 * rather than printing the same facts twice on one screen.
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
import {
  ProfileSections,
  RAIL_SECTIONS,
  profileRail,
  useProfileRecord,
} from '@/components/profile'
import { useShell } from '@/shell/ShellContext'

export function EntityPageScreen() {
  const shell = useShell()
  const navigate = useNavigate()
  const { entityId = '' } = useParams<{ entityId: string }>()
  const { t, dir } = shell.language

  const profile = useAsync<ProfileRef>((signal) => resolveProfile(entityId, signal), {
    /* `entityId` is the only thing the fetcher varies on, so the key is honest
       and Back out of a profile and into it again paints instead of skeletons. */
    deps: [entityId],
    cacheKey: 'profile.resolve',
  })

  const notFound =
    profile.status === 'error' && isApiError(profile.error) && profile.error.kind === 'not-found'

  const header = (
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
  )

  if (profile.data === null) {
    /* The three pre-content states. They render with an EMPTY RAIL, and that is
       correct rather than a gap: the rail holds facts about a record, and there
       is no record — a rail of three skeletons beside a `no-match` sentence
       would be claiming there is something still arriving when the id does not
       resolve. §7.2's restack means an empty rail costs no layout. */
    return (
      <DetailPage
        header={header}
        main={
          profile.status === 'loading' ? (
            <LoadingSkeleton pattern="P2" />
          ) : notFound ? (
            /* AC-42's copy, on the page rather than in the layer. Same key. */
            <EmptyState kind="no-match" message={t('state.overlayNotFound.message', { id: entityId })} />
          ) : (
            <ErrorState
              scope="card"
              message={t('state.overlayError.message')}
              action={{ label: t('state.overlayError.action'), onClick: profile.refetch }}
            />
          )
        }
        rail={[]}
      />
    )
  }

  return <ResolvedEntityPage entity={profile.data} header={header} />
}

/**
 * A child, so the record read starts when there is a ref to read against and
 * the rail and the main column share **one** result rather than two requests
 * for the same row. See `useProfileRecord`.
 */
function ResolvedEntityPage({
  entity,
  header,
}: {
  entity: ProfileRef
  header: React.ReactNode
}) {
  const shell = useShell()
  const { t, language } = shell.language
  const record = useProfileRecord(entity)

  return (
    <DetailPage
      header={header}
      main={
        <ProfileSections
          entity={entity}
          record={record}
          t={t}
          language={language}
          /* §7.2 — identity's facts are the rail's three cards. Omitted here so
             the page does not print them twice. */
          omit={RAIL_SECTIONS}
        />
      }
      /* §2.2 — status, summary and metadata, and nothing else. AC-34: the array
         is the restack order below `--ev-bp-wide`. */
      rail={profileRail({ entity, record, t, language })}
    />
  )
}
