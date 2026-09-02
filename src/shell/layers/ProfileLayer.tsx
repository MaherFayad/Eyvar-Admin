/**
 * The 360° profile layer — `?entity=<id>`. Design spec §6.2, spec §4.3.1.
 *
 * **The highest-value single component in the rebuild.** `openProfile` already
 * has **100 call sites** — the second-most-used handler in the legacy file
 * after `closeModal` — reached from global search, any id or name link in any
 * table, any KPI drill-down, any notification and any work-inbox row.
 *
 * Rules applied
 *   §6.2        header: entity name (13px/600) + identity code and one-line
 *               context as the subtitle.
 *   §6.2        body: **a stack of collapsible cards contributed by workspaces
 *               as a declared contract** — Financials contributes wallet and
 *               payment cards, Support contributes tickets / disputes /
 *               fairness, Operations contributes trips / subscriptions /
 *               compliance / commitment. **Not one 600-line builder**:
 *               `ProfileRef.sections` is the contract as data, and the twelve
 *               renderers live in `components/profile`, one per key. This file
 *               renders the stack; it does not know what a wallet card is.
 *   §6.2        **the same stack on both surfaces.** `EntityPageScreen` renders
 *               the identical `<ProfileSections>` from the identical registry.
 *               Nothing is passed in, so nothing can be passed differently.
 *   §6.2        **EVERY entity type gets card toggles**, not just riders and
 *               drivers. Legacy `initCardToggles()` runs for two of eleven
 *               (`09b` §17.4) and the other nine get an uncollapsible wall.
 *   §6.2        eleven entity types, not six. The five legacy `resolveId()`
 *               misses — `new-rider`, `applicant`, `ticket`,
 *               `corporate-account`, `plan` — resolve here.
 *   §6.2        footer: `Open full profile` as a plain LINK at inline-start and
 *               **no primary** — the layer commits nothing.
 *   §9.2 #13    loading is a skeleton shaped like the card stack. Never a spinner.
 *   §9.2 #14    error is CARD-scoped inside the layer; the layer stays dismissible.
 *   §9.2 #15/AC-42
 *               not-found is a `no-match` empty — ONE grey sentence, no
 *               illustration, no heading — **naming the id that was searched**,
 *               with the layer still dismissible.
 *   AC-60       gated on `view_profiles`. This is where that permission, which
 *               is enforced at ZERO call sites today, finally becomes real.
 */

import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks'
import { resolveProfile } from '@/data/clients'
import { isApiError, type ProfileRef } from '@/data/types'
import type { Language, Translate } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { identityBandSlots, ProfileSections, useProfileRecord } from '@/components/profile'
import { ShellLayer } from '../ShellLayer'

export interface ProfileLayerProps {
  entityId: string
  open: boolean
  onClose: () => void
  onOpenFullProfile: (path: string) => void
  t: Translate
  /** The card stack's dates and numbers. See `ProfileSections`. */
  language: Language
}

/**
 * **`sectionRenderers` is gone, and its removal is the fix.**
 *
 * It was an optional prop defaulting to `{}` that `AppLayout` never passed, so
 * every section fell to the `??` branch and rendered `state.cardError.message`.
 * A healthy rider's profile showed eight cards each claiming to have failed, and
 * an operator could not tell that from an outage.
 *
 * Re-adding it as a **required** prop would have moved the same drift one level
 * up: the drawer would take a registry from `AppLayout` while
 * `EntityPageScreen`, which has no `AppLayout` above it, would still need its
 * own. So there is no prop. Both presentations render `<ProfileSections>`, which
 * is the single consumer of the single registry (`components/profile`).
 *
 * §6.2's *"contributed by workspaces as a declared contract"* is unharmed: the
 * contract is `ProfileRef.sections` — **data**, from `clients/profile.ts` — and
 * a workspace adds a section by adding a renderer to the registry, not by
 * editing this file. That was always the part that mattered.
 */
export function ProfileLayer({
  entityId,
  open,
  onClose,
  onOpenFullProfile,
  t,
  language,
}: ProfileLayerProps) {
  const profile = useAsync<ProfileRef>((signal) => resolveProfile(entityId, signal), {
    deps: [entityId],
    /* `entityId` is the fetcher's only input, so the key is complete. Closing
       the drawer and re-opening the same record paints the header immediately
       instead of re-running the resolve. */
    cacheKey: 'profile.resolve',
    enabled: open,
  })

  /* AC-42 — a 404 is NOT an error state. It is the `overlay-not-found` empty,
     and it must name the id that was searched. `ApiError.kind` is the machine
     -readable discriminator; the message string is never branched on. */
  const notFound = profile.status === 'error' && isApiError(profile.error) && profile.error.kind === 'not-found'

  const ref = profile.data
  /* **One read, feeding both the header and the body.** The standing badge is
     in the layer's header and the card stack is in its body, and both are the
     same record — so the read is owned here, above both, rather than in a child
     that the header could not reach. `useProfileRecord` stays disabled until
     `ref` resolves, which is the same "start when there is something to read"
     the child indirection used to buy. */
  const record = useProfileRecord(ref ?? null)

  return (
    <ShellLayer
      open={open}
      onClose={onClose}
      /* **A modal, not a drawer** — *"should be full screen no need to show me
         any of the navigation more like popup"*. `ShellLayer`'s header records
         which two rulings this departs from and why the departure is scoped to
         this layer alone; the other two stay drawers. */
      presentation="modal"
      title={ref?.title ?? t('shellLayer.profile')}
      subtitle={ref?.subtitle ?? null}
      /* The face, the record kind and the standing, beside the title in the ONE
         header. It used to be a second header inside the body repeating the
         title and subtitle this component already passes above. */
      header={ref ? identityBandSlots({ entity: ref, record, t }) : undefined}
      t={t}
      footer={
        ref && (
          /* §6.2 — a plain LINK at inline-start, and NO primary: this layer
             commits nothing, so §6.1's footer rule gives it no committing
             control at all. */
          <div className="flex shrink-0 items-center border-t border-border px-3 py-2">
            <Button variant="link" onClick={() => onOpenFullProfile(ref.fullPagePath)}>
              {t('shell.layer.openFullProfile')}
            </Button>
          </div>
        )
      }
    >
      {profile.status === 'loading' && <LoadingSkeleton pattern="overlay" />}

      {notFound && (
        <EmptyState kind="no-match" message={t('state.overlayNotFound.message', { id: entityId })} />
      )}

      {profile.status === 'error' && !notFound && (
        <ErrorState
          scope="card"
          message={t('state.overlayError.message')}
          action={{ label: t('state.overlayError.action'), onClick: profile.refetch }}
        />
      )}

      {/* §6.2's card stack. The layer has no rail, so it omits nothing — the
          identity card is its first card. */}
      {ref && (
        <ProfileSections entity={ref} record={record} t={t} language={language} />
      )}
    </ShellLayer>
  )
}
