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
 *               compliance / commitment. **Not one 600-line builder**, which is
 *               why 0.7 ships the SHELL of the stack and each workspace fills
 *               its own section in Phase 1. `ProfileRef.sections` is that
 *               contract, as data.
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

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks'
import { resolveProfile } from '@/data/clients'
import { isApiError, type ProfileRef, type ProfileSectionKey } from '@/data/types'
import type { Translate } from '@/lib'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ShellLayer } from '../ShellLayer'

export interface ProfileLayerProps {
  entityId: string
  open: boolean
  onClose: () => void
  onOpenFullProfile: (path: string) => void
  t: Translate
  /**
   * §6.2 — the declared contract. A workspace registers a renderer for the
   * section keys it owns; unclaimed keys render nothing. Phase 1 fills this,
   * and no workspace has to edit this file to do it.
   */
  sectionRenderers?: Partial<Record<ProfileSectionKey, (ref: ProfileRef) => React.ReactNode>>
}

export function ProfileLayer({
  entityId,
  open,
  onClose,
  onOpenFullProfile,
  t,
  sectionRenderers = {},
}: ProfileLayerProps) {
  const profile = useAsync<ProfileRef>((signal) => resolveProfile(entityId, signal), {
    deps: [entityId],
    enabled: open,
  })

  /* AC-42 — a 404 is NOT an error state. It is the `overlay-not-found` empty,
     and it must name the id that was searched. `ApiError.kind` is the machine
     -readable discriminator; the message string is never branched on. */
  const notFound = profile.status === 'error' && isApiError(profile.error) && profile.error.kind === 'not-found'

  const ref = profile.data

  return (
    <ShellLayer
      open={open}
      onClose={onClose}
      title={ref?.title ?? t('shellLayer.profile')}
      subtitle={ref?.subtitle ?? null}
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

      {ref && (
        <div className="flex flex-col gap-2">
          {ref.sections.map((section) => (
            <ProfileCard key={section} title={section} defaultOpen={section === 'identity'}>
              {sectionRenderers[section]?.(ref) ?? (
                /* §3.5 — an empty pair renders an explicit grey placeholder
                   sentence, never blank. A section no workspace has claimed yet
                   says so rather than showing an empty box. */
                <p className="text-sm text-muted-foreground">
                  {t('state.cardError.message', { resource: section })}
                </p>
              )}
            </ProfileCard>
          ))}
        </div>
      )}
    </ShellLayer>
  )
}

/**
 * One collapsible card. **Every entity type gets these toggles** (§6.2) — the
 * component takes no "is this a rider" branch, which is what makes that true.
 */
function ProfileCard({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-1"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-10 w-full items-center justify-between rounded-none px-3 text-sm font-semibold"
        >
          <span className="capitalize">{title}</span>
          {/* A disclosure caret. `▾` is a mark and does not mirror (§9.5); the
              rotation is vertical, so it is direction-neutral too. */}
          <span aria-hidden="true" className="transition-transform group-data-open/collapsible:rotate-180">
            ▾
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border p-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
