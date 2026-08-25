/**
 * My profile — `?account=me`. Design spec §6.4, spec §4.3.3.
 *
 * Profile · password · 2FA · active sessions · the 13-permission *"exactly what
 * your role can do"* summary. **It is the only place an operator can see their
 * own effective permissions.**
 *
 * **NO NESTED MODAL.** §5.5 forbids it outright and §7.3.3 explains why: the
 * scrim decides the trap, and a no-scrim drawer that spawned a scrimmed modal
 * would own the keyboard twice. So password change and 2FA enrolment are
 * **inline sections that expand in place** inside the drawer (§4.7's
 * checkbox-gated / inline-edit → `Done` pattern). While a section is in edit
 * mode the drawer's own footer carries `Cancel` plus the committing primary,
 * disabled until valid.
 *
 * Administering *other* users is Admin › Team & Access under `manage_team`.
 * Different job, different permission, different surface — and this layer must
 * never grow into it.
 *
 * **What 0.7 ships and what Phase 1 fills.** The layer, its inline-expansion
 * mechanism, the permission summary and the four states are here. The actual
 * password and 2FA forms are P4 surfaces with their own validation, and they
 * arrive with `useForm` in Phase 1 wave 7 — the section shells below are the
 * declared contract they slot into, so no one has to reopen this file to add a
 * modal that §5.5 forbids.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Session } from '@/data/types'
import type { Translate } from '@/lib'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ShellLayer } from '../ShellLayer'

export interface AccountLayerProps {
  open: boolean
  onClose: () => void
  session: Session | null
  status: 'loading' | 'error' | 'empty' | 'content'
  onRetry: () => void
  t: Translate
}

/** §6.4's five sections, in order. Each expands IN PLACE; none opens a modal. */
const SECTIONS = ['profile', 'password', 'twoFactor', 'sessions', 'permissions'] as const
type SectionId = (typeof SECTIONS)[number]

export function AccountLayer({ open, onClose, session, status, onRetry, t }: AccountLayerProps) {
  /** Which section is in edit mode. `null` is the resting state. §5.5: never a modal. */
  const [editing, setEditing] = useState<SectionId | null>(null)

  return (
    <ShellLayer
      open={open}
      onClose={onClose}
      title={t('shellLayer.account')}
      subtitle={session?.email ?? null}
      t={t}
      footer={
        /* §6.1 — the footer is present ONLY when the layer commits. It appears
           when a section is in edit mode and disappears when it is not. */
        editing !== null ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-3 py-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t('shell.layer.cancel')}
            </Button>
            {/* Disabled until valid — the form state arrives with the section
                in Phase 1, and `useForm.canSave` is what fills this in. */}
            <Button variant="default" disabled>
              {t('shell.saveBar.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      {status === 'loading' && <LoadingSkeleton pattern="overlay" />}

      {status === 'error' && (
        <ErrorState
          scope="card"
          message={t('state.shellError.body')}
          action={{ label: t('state.shellError.action'), onClick: onRetry }}
        />
      )}

      {status === 'content' && session && (
        <div className="flex flex-col gap-2">
          {SECTIONS.map((section) => (
            <section
              key={section}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-1"
            >
              <div className="flex h-10 items-center justify-between gap-2 px-3">
                <h3 className="text-sm font-semibold capitalize text-foreground">{section}</h3>
                {section !== 'permissions' && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditing(editing === section ? null : section)}
                    aria-expanded={editing === section}
                  >
                    {editing === section ? t('shell.layer.cancel') : t('shell.moreActions')}
                  </Button>
                )}
              </div>
              <Separator />
              <div className="p-3">
                {section === 'permissions' ? (
                  /* §6.4 — the 13-permission summary. The ONE place an operator
                     sees their own effective permissions. Rendered from
                     `session.permissions`, never re-derived from the role. */
                  <ul className="flex list-none flex-wrap gap-1.5">
                    {session.permissions.map((permission) => (
                      <li
                        key={permission}
                        className="rounded-lg bg-neutral px-1.5 py-0.5 text-2xs font-semibold text-neutral-foreground"
                      >
                        {permission}
                      </li>
                    ))}
                  </ul>
                ) : editing === section ? (
                  /* The inline expansion. §5.5: this is where a modal would
                     have gone, and it does not go here. */
                  <p className="text-sm text-muted-foreground">{t('state.cardError.message', { resource: section })}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {section === 'profile' ? session.name : t('state.cardError.message', { resource: section })}
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </ShellLayer>
  )
}
