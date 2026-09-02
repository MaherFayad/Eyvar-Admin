/**
 * **Availability and the concurrent-chat cap — P5-T6 as D19 and D22 left it.**
 *
 * P5-T6 originally asked for *"online / away / offline, a concurrent-chat cap
 * per agent, and routing that respects both"*. **D19 removed the routing half:**
 *
 * > **The queue is PULL. Nothing is auto-assigned in v1.**
 *
 * So there is no router here, no skills model, no overflow policy and no
 * escalation ladder — none of which exists in any spec. What is left is the
 * half that does real work: three states, an auto-away, and a cap that refuses.
 *
 * ## Everything in this file is screen-local, and that is deliberate
 *
 * `src/hooks/` has a single owner (`PHASE-PLAN.md`). `screens/queues/hooks.ts`
 * sets the precedent and the sentence: *"if a sixth queue or a non-queue screen
 * needs one, it moves to `src/hooks/` **with** utilities-engineer, not around
 * them."* Presence is support-console vocabulary, not app vocabulary, so it
 * lives here until a second surface wants it.
 *
 * ## The cap counter is NOT `AgentPresence.activeCount`, and that is a defect
 *
 * D22 says *"`AgentPresence.activeCount` is the counter"*. It cannot be, as
 * `clients/conversations.ts` currently derives it:
 *
 * ```
 * activeCount: rows().filter(
 *   (c) => c.status !== 'closed' && liveClaim(c.claim)?.ownerId === seed.userId,
 * ).length
 * ```
 *
 * That counts **every channel**. D22 is explicit that *"email, WhatsApp and
 * phone do not count"* and **AC-968** turns on it directly: an operator holding
 * three live chats and any number of email conversations must still be able to
 * grab an email conversation. So the counter here is a `view: 'mine'` read
 * narrowed to `channel: 'chat'`, which is exactly D22's predicate — `channel ===
 * 'chat'` and `status !== 'closed'` and a live claim — expressed with the
 * client's own vocabulary rather than recomputed from rows a screen happens to
 * be holding. Reported to mock-data-engineer; `activeCount` is still what the
 * ROSTER renders, because for another operator "3 conversations" is the honest
 * fact and the cap is not being enforced against them from here.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  listAgentPresence,
  listConversations,
  setMyPresence,
  subscribeToPresence,
} from '@/data/clients'
import type { AgentPresence, PresenceState, RoleName } from '@/data/types'
import { useAsync, type AsyncStatus } from '@/hooks'

/* ─────────────────────────────── the cap ───────────────────────────────── */

/**
 * **D22 — three.** *"45 seconds is only reachable if attention is not
 * fragmented… roughly 15 seconds of attention each per minute, which is one
 * exchange. Four makes the promise arithmetic fail before anybody is slow."*
 *
 * D22 also makes it **configurable per role in Admin › Operational Policy ›
 * Limits, default 3, range 1–8** (D20). `SafetyLimits` in `types/policy.ts`
 * carries `maxCaptainDailyDrivingMinutes`, `maxConcurrentSubscriptionsPerCaptain`
 * and `maxRiderDailyCancellations` and **no chat cap**, so there is nothing to
 * read. The default is used, the bounds are stated so the future field has them
 * to validate against, and **AC-969 is not verifiable today** — reported rather
 * than faked with a hard-coded per-role map, which would be a second policy
 * store the real one would have to be reconciled against.
 */
export const CONCURRENT_CHAT_CAP_DEFAULT = 3
export const CONCURRENT_CHAT_CAP_MIN = 1
export const CONCURRENT_CHAT_CAP_MAX = 8

/**
 * **D22 — the cap does not apply to Owner.** *"Not a privilege — an Owner
 * grabbing a fourth chat during an incident should not be stopped by a
 * throughput heuristic."*
 */
export function capAppliesTo(role: RoleName | null | undefined): boolean {
  return role !== 'Owner'
}

/* ───────────────────────────── auto-away ───────────────────────────────── */

/** **D19 — auto-away after 10 minutes with no console interaction.** */
export const AUTO_AWAY_MINUTES = 10

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'focusin'] as const

/**
 * Move `online` to `away` after ten idle minutes.
 *
 * **A deadline, not a decremented counter** — `session.ts`'s rule, for its
 * reason: *"a backgrounded tab, a slept laptop and a remount are all impossible
 * against a deadline and all handled badly against a countdown."* The timeout is
 * re-armed on activity and cleared when the operator is not `online`, because
 * nothing auto-promotes an `away` or `offline` operator and a timer running
 * against a state it cannot change is a wakeup for nothing.
 *
 * **It reads the host clock, not `EYVAR_NOW`.** Idle is a fact about the person
 * at the keyboard, not about the domain; the fixed mock clock would never
 * advance and the timer would never fire.
 *
 * **Known limit, stated rather than hidden:** this only runs while the console
 * is mounted. D19's *"auto-offline when the presence heartbeat lapses (sign-out,
 * tab close, connection loss)"* is a server-side property of a heartbeat that
 * `clients/realtime.ts` does not yet publish — reported, not simulated with a
 * `beforeunload` that fires unreliably and lies when it does not.
 */
export function useAutoAway(state: PresenceState | null, goAway: () => void): void {
  const goAwayRef = useRef(goAway)
  goAwayRef.current = goAway

  useEffect(() => {
    if (state !== 'online') return

    let timer: ReturnType<typeof setTimeout> | undefined
    const arm = () => {
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => goAwayRef.current(), AUTO_AWAY_MINUTES * 60_000)
    }

    arm()
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, arm, { passive: true })
    return () => {
      if (timer !== undefined) clearTimeout(timer)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, arm)
    }
  }, [state])
}

/* ──────────────────────────── the roster read ──────────────────────────── */

export interface PresenceModel {
  /** The four states, so the bar can render loading, error, empty and content. */
  status: AsyncStatus
  retry: () => void
  /** Every operator, including the acting one. */
  roster: readonly AgentPresence[]
  /** The acting operator's own row, or `null` while the read is in flight. */
  me: AgentPresence | null
  /** `null` while the read is in flight; never guessed. */
  myState: PresenceState | null
  setState: (next: PresenceState) => void
  /** True while a presence write is in flight — the control's own disabled state. */
  saving: boolean

  /** **D22's predicate.** Live chats this operator holds. `null` until the read lands. */
  liveChats: number | null
  cap: number
  /** `false` for Owner (D22). */
  capApplies: boolean
  /** `liveChats >= cap`, and `false` while either number is unknown. */
  atCap: boolean

  /** **D19** — only `online` operators are offered as transfer targets by default. */
  transferTargets: readonly AgentPresence[]
  /** Everyone who is neither `online` nor the acting operator, for the refusal sentence. */
  presenceOf: (userId: string) => PresenceState | null
}

export interface UsePresenceOptions {
  currentUserId: string
  role: RoleName | null
  /** Bumped by the screen after every claim / release / transfer, so the counter re-reads. */
  revision: number
}

export function usePresence({ currentUserId, role, revision }: UsePresenceOptions): PresenceModel {
  const [saving, setSaving] = useState(false)
  const [optimistic, setOptimistic] = useState<PresenceState | null>(null)
  /* Bumped by the realtime `presence` event as well as by our own writes, so a
     second console changing this operator's state is reflected without a poll. */
  const [announced, setAnnounced] = useState(0)

  /* **Deliberately NOT cached (P3-13), both reads below.** `revision` and
     `announced` are local counters that reset to `0` on every mount, so the
     key a fresh console would read — `[0, 0]` — is exactly the entry written
     *before* the last shift's claims and presence changes. Freshness is the
     whole content of this hook: `atCap` gates claiming and `transferTargets`
     decides who may be handed a conversation, and both are wrong the moment
     they are a shift old. A skeleton on a presence chip costs nothing.
     Cacheable once presence is keyed on something that survives a remount. */
  const roster = useAsync<AgentPresence[]>((signal) => listAgentPresence(signal), {
    deps: [revision, announced],
    isEmpty: (data) => data.length === 0,
  })

  /**
   * The cap counter. `view: 'mine'` is *a live claim held by the acting
   * operator, and not closed*; `channel: 'chat'` is the rest of D22's predicate.
   * `pageSize: 1` because only `total` is read — the rows are the queue's job.
   */
  const chats = useAsync((signal) => listConversations({ view: 'mine', channel: 'chat', pageSize: 1 }, signal), {
    deps: [revision],
  })

  useEffect(() => {
    return subscribeToPresence((event) => {
      if (event.type === 'presence') setAnnounced((n) => n + 1)
    })
  }, [])

  const rosterRows = roster.data ?? []
  const me = rosterRows.find((agent) => agent.userId === currentUserId) ?? null
  const myState = optimistic ?? me?.state ?? null

  const setState = useCallback(
    (next: PresenceState) => {
      /* Optimistic, and reverted by the re-read rather than by a catch that
         guesses: `setMyPresence` announces on the presence topic, which bumps
         `announced`, which re-reads the roster. */
      setOptimistic(next)
      setSaving(true)
      void setMyPresence(next)
        .catch(() => setOptimistic(null))
        .finally(() => {
          setSaving(false)
          setAnnounced((n) => n + 1)
        })
    },
    [],
  )

  const capApplies = capAppliesTo(role)
  const liveChats = chats.data?.total ?? null
  const cap = CONCURRENT_CHAT_CAP_DEFAULT
  const atCap = capApplies && liveChats !== null && liveChats >= cap

  return {
    status: roster.status,
    retry: roster.refetch,
    roster: rosterRows,
    me,
    myState,
    setState,
    saving,
    liveChats,
    cap,
    capApplies,
    atCap,
    /* **D19 / AC-942** — `offline` operators are not offered. `away` is
       offered, because *"away is lunch, not gone"*, and the option states the
       state so the choice is informed rather than silent. */
    transferTargets: rosterRows.filter(
      (agent) => agent.userId !== currentUserId && agent.state !== 'offline',
    ),
    presenceOf: (userId) => rosterRows.find((agent) => agent.userId === userId)?.state ?? null,
  }
}
