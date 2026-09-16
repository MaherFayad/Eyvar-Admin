/**
 * The five-state machine, moved out of `clients/alerts.ts` (spec 06 §12.4,
 * `04-alerting-v2.md` §3). Pure: given the current state and what this
 * evaluation cycle found, returns the next state. No fetch, no clock read.
 */

import type { AlertState } from '../../types/alert'
import type { IsoDateTime } from '../../types/common'

export interface AlertMachineInput {
  now: IsoDateTime
  /** Whether the tested condition held this cycle. `null` for an inconclusive outcome (`no-complete-bucket` / `no-baseline` / `invalid-condition`) — nothing new happened, so nothing transitions. */
  conditionMet: boolean | null
  /** When the rule most recently entered `cooling` (`AlertRule.lastFiredAt`). `null` if it never has. */
  coolingSince: IsoDateTime | null
  /** `null` is hysteresis-only. */
  minReArmMinutes: number | null
  /** `reports.run` itself failed this cycle — distinct from a legitimate empty-data outcome. */
  runFailed: boolean
  /** Consecutive `runFailed` cycles, this one included, tracked by the caller. */
  consecutiveFailures: number
  consecutiveFailuresBeforeError: number
  /** The owner still holds the measure's permission (§13.3). */
  ownerHasPermission: boolean
}

export interface AlertTransition {
  from: AlertState
  to: AlertState
  /** True exactly on the cycle a notification should be emitted. */
  fired: boolean
  /** Set entering `suspended` or `error`; `null` otherwise. */
  reasonKey: string | null
  /** True exactly on the transition into `error` or `suspended` — never repeated while already there. */
  notifyOwner: boolean
}

const REASON_SUSPENDED = 'rb.alert.state.suspended.permission'
const REASON_ERROR = 'rb.alert.state.error.evaluation'

function settled(state: AlertState): AlertTransition {
  return { from: state, to: state, fired: false, reasonKey: null, notifyOwner: false }
}

function minutesBetween(a: IsoDateTime, b: IsoDateTime): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 60_000)
}

/**
 * `armed → firing → cooling → armed`, `suspended`, `error` (spec 06 §12.4).
 * `suspended`/`error` are terminal — re-entry is a save action, not an
 * evaluation outcome. `mutedUntil` is deliberately absent: §12.4 silences delivery, never evaluation.
 */
export function nextAlertState(state: AlertState, input: AlertMachineInput): AlertTransition {
  if (state === 'suspended' || state === 'error') return settled(state)

  if (!input.ownerHasPermission) {
    return { from: state, to: 'suspended', fired: false, reasonKey: REASON_SUSPENDED, notifyOwner: true }
  }
  if (input.runFailed && input.consecutiveFailures >= input.consecutiveFailuresBeforeError) {
    return { from: state, to: 'error', fired: false, reasonKey: REASON_ERROR, notifyOwner: true }
  }

  if (state === 'firing') {
    // "immediately, same cycle" (§12.4) — firing is never the resting state this function returns to.
    return { from: state, to: 'cooling', fired: false, reasonKey: null, notifyOwner: false }
  }

  if (state === 'armed') {
    if (input.conditionMet === true) return { from: state, to: 'cooling', fired: true, reasonKey: null, notifyOwner: false }
    return settled('armed')
  }

  // cooling
  if (input.conditionMet === false) return { from: state, to: 'armed', fired: false, reasonKey: null, notifyOwner: false } // hysteresis, the default re-arm
  if (input.conditionMet === true && input.minReArmMinutes !== null && input.coolingSince !== null) {
    if (minutesBetween(input.coolingSince, input.now) >= input.minReArmMinutes) {
      return { from: state, to: 'armed', fired: false, reasonKey: null, notifyOwner: false } // the backstop re-arm
    }
  }
  return settled('cooling')
}

/** D43: a recipient who has lost the measure's permission is dropped at delivery, the owner notified once. Pure — the caller persists the drop and the notification. */
export interface RecipientPermission {
  id: string
  hasPermission: boolean
}

export interface RecipientDrop {
  keptIds: string[]
  droppedIds: string[]
  notifyOwner: boolean
}

export function dropRecipients(recipients: readonly RecipientPermission[]): RecipientDrop {
  const keptIds = recipients.filter((r) => r.hasPermission).map((r) => r.id)
  const droppedIds = recipients.filter((r) => !r.hasPermission).map((r) => r.id)
  return { keptIds, droppedIds, notifyOwner: droppedIds.length > 0 }
}
