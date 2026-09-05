/**
 * Availability and the concurrent-chat cap (D19, D22). Three states, an
 * auto-away, and a cap that refuses; the queue is pull, so nothing routes.
 * Shared by the shell control and the conversation console (§6.3).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getOperationalPolicy,
  listAgentPresence,
  listConversations,
  setMyPresence,
  subscribeToPresence,
} from '@/data/clients'
import type { AgentPresence, PresenceState, RoleName } from '@/data/types'
import { useAsync, type AsyncStatus } from './useAsync'

/* ─────────────────────────────── the cap ───────────────────────────────── */

/* D22 / D20: the cap lives in Admin › Operational Policy › Limits; these are the
   fallback while the policy read is in flight and the bounds it is clamped to. */
export const CONCURRENT_CHAT_CAP_DEFAULT = 3
export const CONCURRENT_CHAT_CAP_MIN = 1
export const CONCURRENT_CHAT_CAP_MAX = 8

/** D22: the cap does not apply to Owner. */
export function capAppliesTo(role: RoleName | null | undefined): boolean {
  return role !== 'Owner'
}

/* ───────────────────────────── auto-away ───────────────────────────────── */

/** **D19 — auto-away after 10 minutes with no console interaction.** */
export const AUTO_AWAY_MINUTES = 10

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'focusin'] as const

/** D19: `online` becomes `away` after ten idle minutes, against a deadline, not a countdown. */
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
  /** `false` while nobody is signed in: no reads are issued. */
  enabled?: boolean
}

export function usePresence({ currentUserId, role, revision, enabled = true }: UsePresenceOptions): PresenceModel {
  const [saving, setSaving] = useState(false)
  const [optimistic, setOptimistic] = useState<PresenceState | null>(null)
  /* Bumped by the realtime `presence` event as well as by our own writes, so a
     second console changing this operator's state is reflected without a poll. */
  const [announced, setAnnounced] = useState(0)

  /* P3-13: not cached. `atCap` and `transferTargets` are wrong the moment they are a shift old. */
  const roster = useAsync<AgentPresence[]>((signal) => listAgentPresence(signal), {
    deps: [revision, announced],
    isEmpty: (data) => data.length === 0,
    enabled,
  })

  /* D22: the cap counter reads only `total` of my live chats. */
  const chats = useAsync((signal) => listConversations({ view: 'mine', channel: 'chat', pageSize: 1 }, signal), {
    deps: [revision, announced],
    enabled,
  })

  /* D22 / AC-969: the cap is policy, not a constant; clamped to the stated bounds. */
  const policy = useAsync((signal) => getOperationalPolicy(signal), { deps: [], cacheKey: 'policy.current', enabled })

  useEffect(() => {
    return subscribeToPresence((event) => {
      if (event.type === 'presence') setAnnounced((n) => n + 1)
    })
  }, [])

  const rosterRows = roster.data ?? []
  const me = rosterRows.find((agent) => agent.userId === currentUserId) ?? null
  const myState = optimistic ?? me?.state ?? null

  /* Another console (the shell's control, say) may have moved this operator's
     state; once the roster agrees with the optimistic value, drop the override. */
  useEffect(() => {
    if (optimistic !== null && me?.state === optimistic) setOptimistic(null)
  }, [me?.state, optimistic])

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
  const configured = policy.data?.limits.maxConcurrentChatsPerOperator ?? CONCURRENT_CHAT_CAP_DEFAULT
  const cap = Math.min(CONCURRENT_CHAT_CAP_MAX, Math.max(CONCURRENT_CHAT_CAP_MIN, configured))
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
