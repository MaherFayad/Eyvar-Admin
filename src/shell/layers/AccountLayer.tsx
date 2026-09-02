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
 * mode the drawer's own footer carries `Cancel` plus the committing primary.
 *
 * Administering *other* users is Admin › Team & Access under `manage_team`.
 * Different job, different permission, different surface — and this layer must
 * never grow into it.
 *
 * ## Three defects closed here
 *
 * **1. Two of five sections rendered.** `password` and `twoFactor` fell to
 * `t('state.cardError.message')` — a permanent *"Couldn't load password. The
 * filters are unchanged."* on a layer where nothing had failed. Both are built.
 *
 * **2. `profile` showed `session.name` and nothing else**, dropping the email,
 * the role and the avatar the session already carries, and `permissions`
 * printed the raw `PermissionKey` strings. §6.4 asks for the **13-permission**
 * summary; thirteen is the size of the set, so the card now lists all thirteen
 * with `Granted` / `Not granted` **in words** (§7.5), which is the only form in
 * which "exactly what your role can do" is answerable — a list of the held ones
 * cannot tell an operator what they are missing.
 *
 * **3. The footer's `Save` was `<Button variant="default" disabled>`** with no
 * reason attached: edit mode was a dead end and §11.2 was breached in its
 * plainest form. It is now driven by the editing section's own descriptor —
 * `{ label, commit, blockedReason }` — so a section either commits or **states
 * why it cannot, in place, as text** (`aria-describedby`, never a tooltip:
 * §5.7 confines a tooltip to naming a control).
 *
 * ## What each section commits, and what it cannot
 *
 * | Section | Commit | Operation |
 * |---|---|---|
 * | `password` | email the operator a reset link | `requestPasswordReset` |
 * | `twoFactor` | **refused, with a stated reason** | none exists — see below |
 *
 * **The refusal is honest, not a placeholder.** `enrollSecondFactor` and
 * `beginTotpEnrolment` both take an `enrolmentToken`, which §4.4 issues during
 * *sign-in* after a password is proved. There is no operation that re-enrols a
 * factor for an operator who is **already signed in**, and inventing one here
 * would mean the console re-enrolled a second factor without proving the first.
 * The signature that would close it is named in the handoff. Until it exists,
 * the control is disabled **in place with the reason rendered**, which is what
 * §11.2 asks for and is strictly better than a `Save` that silently does
 * nothing.
 *
 * `password` deliberately does **not** grow an in-place `current → new` form:
 * there is no `changePassword` operation either, and a form whose Save is
 * refused is a worse answer than a real action that works. `requestPasswordReset`
 * is a shipped, complete route to a new password and it works from here.
 */

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getTeamUser, requestPasswordReset } from '@/data/clients'
import type { PermissionKey, Session, TeamUser } from '@/data/types'
import { useAsync } from '@/hooks'
import { formatDate, type Language, type Translator } from '@/lib'
import { DeviceList } from '@/components/auth/DeviceList'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { SectionSkeleton } from '@/components/profile'
import { StatusBadge } from '@/components/StatusBadge'
import { PERMISSION_KEYS } from '../permissions'
import { ShellLayer } from '../ShellLayer'

export interface AccountLayerProps {
  open: boolean
  onClose: () => void
  session: Session | null
  status: 'loading' | 'error' | 'empty' | 'content'
  onRetry: () => void
  /**
   * `Translator`, not `Translate` — the device list's
   * `Sign out everywhere` confirmation is a plural family
   * (`auth.devices.signOutAllConfirm`, **AC-576**) and needs `.plural`.
   */
  t: Translator
  /** For the device list's dates. See its header on why this is a prop. */
  language: Language
}

/** §6.4's five sections, in order. Each expands IN PLACE; none opens a modal. */
const SECTIONS = ['profile', 'password', 'twoFactor', 'sessions', 'permissions'] as const
type SectionId = (typeof SECTIONS)[number]

const SECTION_TITLE: Readonly<Record<SectionId, string>> = {
  profile: 'account.section.profile',
  password: 'account.section.password',
  twoFactor: 'account.section.twoFactor',
  sessions: 'account.section.sessions',
  permissions: 'account.section.permissions',
}

/**
 * The id the footer's refused primary points `aria-describedby` at. One string,
 * one element, so the reason is announced with the control rather than hidden
 * in a tooltip (§11.2, and the same shape `SaveBar` uses for the frozen case).
 */
const REFUSAL_REASON_ID = 'account-commit-refusal'

/** What the footer commits while a section is expanded. §11.2's contract, as data. */
interface SectionCommit {
  /** The primary's verb. Never `Save` where a more specific verb exists (§5.7). */
  label: string
  /** `null` means it can commit. A string is the refusal, rendered as TEXT. */
  blockedReason: string | null
  run: () => Promise<void>
}

export function AccountLayer({
  open,
  onClose,
  session,
  status,
  onRetry,
  t,
  language,
}: AccountLayerProps) {
  /** Which section is in edit mode. `null` is the resting state. §5.5: never a modal. */
  const [editing, setEditing] = useState<SectionId | null>(null)
  const [committing, setCommitting] = useState(false)

  /**
   * The operator's own team record. The session carries identity; **the second
   * factor and the last sign-in live on `TeamUser`** (`types/session.ts`), and
   * `getTeamUser` is the operation that returns them. Its own four states live
   * inside the two cards that read it, so a failed read leaves the profile, the
   * sessions list and the permission summary working.
   */
  const me = useAsync<TeamUser>((signal) => getTeamUser(session?.userId ?? '', signal), {
    deps: [session?.userId],
    /* The user id is the fetcher's only input, and it is in `deps` — so a
       switch between operators keys separately and one operator can never be
       served the other's record. Moving between the layer's sections remounts
       the cards; this stops each move re-reading the same person. */
    cacheKey: 'team.get',
    enabled: open && session !== null,
  })

  const commit = commitFor(editing, session, t)

  const onCommit = useCallback(async () => {
    if (commit === null || commit.blockedReason !== null) return
    setCommitting(true)
    try {
      await commit.run()
      setEditing(null)
    } finally {
      setCommitting(false)
    }
  }, [commit])

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
        editing !== null && commit !== null ? (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-3 py-2">
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={committing}>
              {t('shell.layer.cancel')}
            </Button>
            {/* §11.2 — disabled IN PLACE with a stated reason, never disabled
                and silent. The reason is rendered inside the section body and
                referenced here, so it is announced with the control. */}
            <Button
              variant="default"
              disabled={commit.blockedReason !== null || committing}
              aria-describedby={commit.blockedReason !== null ? REFUSAL_REASON_ID : undefined}
              onClick={() => void onCommit()}
            >
              {commit.label}
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
          {SECTIONS.map((section) =>
            /* **`sessions` renders bare.** `DeviceList` draws its OWN `Card`
               and its OWN `Active sessions` heading, so wrapping it in a
               section card put a card inside a card and two identical `<h3>`s
               on one screen. It is `src/components/auth`'s component and it is
               right to own its own frame; this is the layer not drawing a
               second one around it. */
            section === 'sessions' ? (
              /* Design/08 §9 — **the legacy read-only list at `:3005`–`:3033`
                 made real.** Trusted-device markers, `Stop trusting`, a per-row
                 `Sign out` whose confirmation expands **in place** (§5.5 forbids
                 a modal nested in a no-scrim drawer — this is what replaces the
                 native `confirm()` at `:3059`, **D-A9**), and `Sign out
                 everywhere` naming the count before it acts (**AC-576**). All
                 four states live inside the card, so a failed sessions read
                 leaves the rest of this layer working (**AC-652**). */
              <DeviceList key={section} t={t} language={language} />
            ) : (
            <section
              key={section}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-1"
            >
              <div className="flex h-10 items-center justify-between gap-2 px-3">
                <h3 className="text-sm font-semibold text-foreground">{t(SECTION_TITLE[section])}</h3>
                {/* An affordance only where the section HAS one. `sessions`
                    carries its own controls per row and `profile` and
                    `permissions` are reads — a toggle on those opened an empty
                    edit mode with a dead Save, which is the defect above. */}
                {EDITABLE.includes(section) && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setEditing(editing === section ? null : section)}
                    aria-expanded={editing === section}
                  >
                    {editing === section
                      ? t('shell.layer.cancel')
                      : t(`account.action.${section}`)}
                  </Button>
                )}
              </div>
              <Separator />
              <div className="p-3">
                <SectionBody
                  section={section}
                  session={session}
                  me={me}
                  editing={editing === section}
                  blockedReason={editing === section ? (commit?.blockedReason ?? null) : null}
                  t={t}
                  language={language}
                />
              </div>
            </section>
            ),
          )}
        </div>
      )}
    </ShellLayer>
  )
}

/** The two sections that expand into a committing state. The other three are reads. */
const EDITABLE: readonly SectionId[] = ['password', 'twoFactor']

/**
 * What the footer's primary does for the expanded section.
 *
 * Both arms are deliberate and neither is a placeholder — see the file header
 * for why `twoFactor` refuses and why `password` sends a link rather than
 * growing a form whose Save could not work.
 */
function commitFor(
  editing: SectionId | null,
  session: Session | null,
  t: Translator,
): SectionCommit | null {
  if (editing === null || session === null) return null

  if (editing === 'password') {
    return {
      label: t('account.password.send'),
      blockedReason: null,
      run: async () => {
        await requestPasswordReset(session.email)
        /* R9 — one line, names what happened, no period, no action. §6.2's own
           rule holds: the response is the same for every address, so the
           confirmation says a link was sent and never whether it landed. */
        toast.success(t('account.password.sent', { email: session.email }))
      },
    }
  }

  return {
    label: t('account.twoFactor.reenrol'),
    blockedReason: t('account.twoFactor.blocked'),
    /* Unreachable while `blockedReason` is set, and it throws rather than
       resolving quietly: a no-op `run` is how a refusal becomes a silent
       success the day someone clears the reason without adding the operation. */
    run: () => Promise.reject(new Error('Re-enrolment has no signed-in operation yet')),
  }
}

/* ────────────────────────────── the five bodies ───────────────────────── */

function SectionBody({
  section,
  session,
  me,
  editing,
  blockedReason,
  t,
  language,
}: {
  section: SectionId
  session: Session
  me: ReturnType<typeof useAsync<TeamUser>>
  editing: boolean
  blockedReason: string | null
  t: Translator
  language: Language
}) {
  switch (section) {
    case 'profile':
      return <ProfileBody session={session} me={me} t={t} language={language} />

    case 'password':
      return <PasswordBody session={session} editing={editing} t={t} />

    case 'twoFactor':
      return (
        <TwoFactorBody
          me={me}
          editing={editing}
          blockedReason={blockedReason}
          t={t}
        />
      )

    /* Rendered by the caller, outside a section card — see the note there. */
    case 'sessions':
      return null

    case 'permissions':
      return <PermissionsBody session={session} t={t} />
  }
}

/**
 * §6.4's identity card. The session already carries every one of these fields
 * and the layer was rendering one of them.
 */
function ProfileBody({
  session,
  me,
  t,
  language,
}: {
  session: Session
  me: ReturnType<typeof useAsync<TeamUser>>
  t: Translator
  language: Language
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {/* R15 — a rounded square, the same shape the top-bar trigger uses.
            `photoUrl` is `null` on every seeded operator (`types/session.ts`),
            so the fallback is the ordinary case and not the exception. */}
        <Avatar className="size-10">
          {session.photoUrl && <AvatarImage src={session.photoUrl} alt="" />}
          <AvatarFallback>{initials(session.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{session.name}</p>
          {/* An email is a single LTR token in an Arabic paragraph. */}
          <p className="truncate text-xs text-muted-foreground">
            <bdi dir="ltr">{session.email}</bdi>
          </p>
        </div>
      </div>

      <dl className="flex flex-col gap-1.5 border-t border-border pt-2 text-sm">
        <Pair label={t('account.field.role')} value={session.role} />
        <Pair
          label={t('account.field.permissionCount')}
          value={t('account.field.permissionSummary', {
            granted: session.permissions.length,
            total: PERMISSION_KEYS.length,
          })}
        />
        {/* `lastLoginAt` lives on the team record, not the session, so this pair
            carries the read's own states rather than the card's. */}
        <Pair
          label={t('account.field.lastLogin')}
          value={
            me.status === 'loading' ? (
              <SectionSkeleton rows={1} />
            ) : me.status === 'error' || me.data === null ? (
              <span className="text-muted-foreground">{t('account.field.unavailable')}</span>
            ) : me.data.lastLoginAt === null ? (
              /* §3.5 — an empty pair is a sentence, never blank. `Not yet` is a
                 real seeded state: `USR-4` has never signed in. */
              <span className="text-muted-foreground">{t('account.field.neverSignedIn')}</span>
            ) : (
              formatDate(me.data.lastLoginAt, { style: 'day-month-time', language })
            )
          }
        />
      </dl>
    </div>
  )
}

/**
 * §6.4's password section. Resting: what the operator can do about it.
 * Expanded: the consequence, stated before the footer's primary commits it.
 */
function PasswordBody({
  session,
  editing,
  t,
}: {
  session: Session
  editing: boolean
  t: Translator
}) {
  if (!editing) return <p className="text-sm text-muted-foreground">{t('account.password.resting')}</p>

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-foreground">
        {t('account.password.expanded', { email: session.email })}
      </p>
      {/* §5.3 — the consequence, and what will NOT change. An operator who
          reads only the second line still knows they stay signed in here. */}
      <p className="text-xs text-muted-foreground">{t('account.password.consequence')}</p>
    </div>
  )
}

/**
 * §6.4's 2FA section, and the layer's one §11.2 refusal.
 *
 * `secondFactor: null` is **enrolment pending, not opted out** —
 * `types/session.ts` retires both legacy switches and says so at length. The
 * copy follows: it never reads "2FA is off".
 */
function TwoFactorBody({
  me,
  editing,
  blockedReason,
  t,
}: {
  me: ReturnType<typeof useAsync<TeamUser>>
  editing: boolean
  blockedReason: string | null
  t: Translator
}) {
  return (
    <div className="flex flex-col gap-2">
      {me.status === 'loading' && <SectionSkeleton rows={2} />}

      {me.status === 'error' && (
        <ErrorState
          scope="card"
          card={false}
          message={t('account.twoFactor.error')}
          action={{ label: t('state.shellError.action'), onClick: me.refetch }}
        />
      )}

      {me.status !== 'loading' && me.status !== 'error' && me.data !== null && (
        <>
          {me.data.secondFactor === null ? (
            /* R8 `no-match` — one grey sentence, no illustration, no heading. */
            <EmptyState kind="no-match" card={false} message={t('account.twoFactor.pending')} />
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  {t(`account.twoFactor.method.${me.data.secondFactor.method}`)}
                </p>
                {/* AC-519 / design §12 — the hint is an LTR-pinned run. */}
                <p className="truncate text-xs text-muted-foreground">
                  <bdi dir="ltr">{me.data.secondFactor.hint}</bdi>
                </p>
              </div>
              <StatusBadge tone="success">{t('account.twoFactor.enrolled')}</StatusBadge>
            </div>
          )}
        </>
      )}

      {/* §11.2 — the reason is TEXT, in place, referenced by the disabled
          primary. Not a tooltip (§5.7), not a hidden control, not absence. */}
      {editing && blockedReason !== null && (
        <p id={REFUSAL_REASON_ID} className="border-t border-border pt-2 text-sm text-muted-foreground">
          {blockedReason}
        </p>
      )}
    </div>
  )
}

/**
 * §6.4 — *"exactly what your role can do"*, and the ONE place an operator sees
 * their own effective permissions.
 *
 * **All thirteen render, held or not.** A list of only the granted ones answers
 * "what can I do" and not "why can I not do this", and the second question is
 * the one that brings an operator here. Rendered from `session.permissions`,
 * never re-derived from the role (§8.2).
 */
function PermissionsBody({ session, t }: { session: Session; t: Translator }) {
  const held = new Set<PermissionKey>(session.permissions)
  return (
    <ul className="flex list-none flex-col gap-1.5">
      {PERMISSION_KEYS.map((key) => {
        const granted = held.has(key)
        return (
          <li key={key} className="flex items-center justify-between gap-3 text-sm">
            <span className={granted ? 'text-foreground' : 'text-muted-foreground'}>
              {t(`account.permission.${key}`)}
            </span>
            {/* §7.5 — carried by a WORD. A granted/withheld pair drawn only in
                colour is unreadable to the people most likely to be checking. */}
            <span className="shrink-0 text-xs text-muted-foreground">
              {t(granted ? 'account.permission.granted' : 'account.permission.withheld')}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end text-foreground">{value}</dd>
    </div>
  )
}

/** Same rule as `AccountMenu`'s trigger, so one operator has one set of initials. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toLocaleUpperCase('en')
}
