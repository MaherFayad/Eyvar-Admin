/**
 * **Availability, the concurrent-chat counter and the roster** — P5-T6 as D19
 * and D22 left it, which is availability plus a cap and **no routing**.
 *
 * This is what replaces `ContactCentreScreen`'s `INITIAL_AGENTS` (`:32`) and
 * `CPT_METRICS` (`:62`). D19 is explicit:
 *
 * > `ContactCentreScreen`'s `INITIAL_AGENTS` and `CPT_METRICS` are **superseded**
 * > by `AgentPresence` over `clients/realtime.ts`.
 *
 * Both module constants are gone. Every name, state and count on this bar comes
 * from `listAgentPresence()` over the seam and re-reads on the presence topic,
 * so a second console changing its own availability moves this one without a
 * refresh. **The CSAT scores, the average handle times and the four CPT rows
 * had no source at all** — they were literals in a screen file, and a metric
 * with no store behind it is a number an operator will quote in a review.
 *
 * ## Where this control belongs, and where it is
 *
 * D19 says availability is *"set by the operator from the top bar"*. The top bar
 * is `src/shell/TopBar.tsx`, which has a single owner (`PHASE-PLAN.md`), so the
 * control renders on the console instead and the placement is reported rather
 * than taken. Nothing about the behaviour changes when it moves: `usePresence`
 * is the whole of it and the bar is a rendering.
 *
 * Rules applied
 *   §11.3 / four states
 *              loading, error, empty and content. The roster read is a real
 *              read over the seam and can fail; the error is CARD-scoped with a
 *              retry, because a failed roster does not stop the queue working.
 *   §11.2      **the cap is a refusal, not a throttle** (D22). The counter
 *              states it before any control has to; the refusal itself is on
 *              the row, disabled in place, naming the number.
 *   R7         five tones, no sixth. `online` → `success`, `away` → `warning`,
 *              `offline` → `neutral`. There is no red anywhere on this bar:
 *              being signed out is not an error (R5a).
 *   §7.4.5     a placeholder is never a label. `Availability` is a real
 *              `<Label>` bound to the select.
 *   §7.5       every state is a WORD as well as a tone.
 *   §9.1       `<bdi>` on the counter and the last-seen date.
 */

import { toast } from 'sonner'
import type { AgentPresence, PresenceState } from '@/data/types'
import { formatCount, formatDate, type Language, type Translate } from '@/lib'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ErrorState'
import { StatusBadge } from '@/components/StatusBadge'
import { AUTO_AWAY_MINUTES, type PresenceModel } from './presence'

const PRESENCE_TONE: Readonly<Record<PresenceState, 'success' | 'warning' | 'neutral'>> = {
  online: 'success',
  away: 'warning',
  offline: 'neutral',
}

const PRESENCE_KEY: Readonly<Record<PresenceState, string>> = {
  online: 'conversations.presence.online',
  away: 'conversations.presence.away',
  offline: 'conversations.presence.offline',
}

const PRESENCE_TOAST: Readonly<Record<PresenceState, string>> = {
  online: 'conversations.presence.toast.online',
  away: 'conversations.presence.toast.away',
  offline: 'conversations.presence.toast.offline',
}

const PRESENCE_ORDER: readonly PresenceState[] = ['online', 'away', 'offline']

export interface PresenceBarProps {
  presence: PresenceModel
  currentUserId: string
  t: Translate
  language: Language
  /** §7.3.3 — the whole bar goes read-only while the session is frozen. */
  frozen: boolean
}

export function PresenceBar({ presence, currentUserId, t, language, frozen }: PresenceBarProps) {
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <CardTitle>
          {t('conversations.presence.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* ── loading ─────────────────────────────────────────────────── */}
        {presence.status === 'loading' && (
          <div aria-busy="true" className="flex flex-col gap-2">
            <Skeleton className="h-control w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        )}

        {/* ── error ───────────────────────────────────────────────────── */}
        {presence.status === 'error' && (
          <ErrorState
            scope="card"
            card={false}
            message={t('conversations.presence.error')}
            action={{ label: t('conversations.thread.retry'), onClick: presence.retry }}
          />
        )}

        {(presence.status === 'content' || presence.status === 'empty') && (
          <>
            <MyAvailability
              presence={presence}
              t={t}
              language={language}
              frozen={frozen}
            />

            {/* ── empty: the roster holds nobody but the acting operator ─ */}
            {presence.roster.filter((agent) => agent.userId !== currentUserId).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('conversations.presence.empty')}
              </p>
            ) : (
              <Roster
                roster={presence.roster}
                currentUserId={currentUserId}
                t={t}
                language={language}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

/* ─────────────── the acting operator: state, cap, and the rule ─────────── */

function MyAvailability({
  presence,
  t,
  language,
  frozen,
}: {
  presence: PresenceModel
  t: Translate
  language: Language
  frozen: boolean
}) {
  const state = presence.myState

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="conversations-presence">{t('conversations.presence.label')}</Label>
        <Select
          value={state ?? undefined}
          disabled={frozen || presence.saving || state === null}
          onValueChange={(next) => {
            const chosen = next as PresenceState
            presence.setState(chosen)
            toast(t(PRESENCE_TOAST[chosen]))
          }}
        >
          <SelectTrigger id="conversations-presence" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESENCE_ORDER.map((option) => (
              <SelectItem key={option} value={option}>
                {t(PRESENCE_KEY[option])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* **D22's counter, stated before any control has to refuse.** The cap is
          named here so an operator at three knows why `Claim` is dead on the
          next chat without having to hover it. Owner is exempt (D22), so the
          Owner's readout is a count with no denominator rather than a limit
          that is not being applied. */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">
          {t('conversations.cap.help')}
        </span>
        <span className="text-sm font-semibold text-foreground">
          <bdi>
            {presence.liveChats === null
              ? '—'
              : presence.capApplies
                ? t('conversations.cap.counter', {
                    count: formatCount(presence.liveChats, language),
                    cap: formatCount(presence.cap, language),
                  })
                : t('conversations.cap.exempt', {
                    count: formatCount(presence.liveChats, language),
                  })}
          </bdi>
        </span>
      </div>

      {/* The two rules an operator would otherwise discover by losing work:
          the ten-minute auto-away, and the fact that going offline holds the
          claims. Both are D19's, and both are stated where the choice is made. */}
      <p className="max-w-96 text-xs text-muted-foreground">
        {t('conversations.presence.autoAway', { minutes: String(AUTO_AWAY_MINUTES) })}{' '}
        {t('conversations.presence.keepsClaims')}
      </p>
    </div>
  )
}

/* ─────────────────────────────── the roster ────────────────────────────── */

function Roster({
  roster,
  currentUserId,
  t,
  language,
}: {
  roster: readonly AgentPresence[]
  currentUserId: string
  t: Translate
  language: Language
}) {
  const others = roster.filter((agent) => agent.userId !== currentUserId)

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        {t('conversations.presence.roster')}
      </span>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {others.map((agent) => (
          <li key={agent.userId} className="flex min-w-0 items-center gap-2">
            <StatusBadge tone={PRESENCE_TONE[agent.state]}>
              {t(PRESENCE_KEY[agent.state])}
            </StatusBadge>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{agent.userName}</span>
              <span className="truncate text-xs text-muted-foreground">
                <bdi>
                  {t(
                    agent.activeCount === 1
                      ? 'conversations.presence.activeCount.one'
                      : 'conversations.presence.activeCount.other',
                    { count: formatCount(agent.activeCount, language) },
                  )}
                </bdi>
                {' · '}
                <bdi>
                  {agent.lastSeenAt === null
                    ? t('conversations.presence.never')
                    : t('conversations.presence.lastSeen', {
                        date: formatDate(agent.lastSeenAt, {
                          style: 'day-month-time',
                          language,
                        }),
                      })}
                </bdi>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
