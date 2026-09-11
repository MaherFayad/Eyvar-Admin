import { describe, expect, it } from 'vitest'
import { dropRecipients, nextAlertState, type AlertMachineInput } from './machine'
import { evaluate, isNewBucket } from './evaluate'
import type { AlertRule } from '../../types/alert'

const NOW = '2026-06-25T09:14:00+03:00'

function ctx(overrides: Partial<AlertMachineInput> = {}): AlertMachineInput {
  return {
    now: NOW,
    conditionMet: null,
    coolingSince: null,
    minReArmMinutes: null,
    runFailed: false,
    consecutiveFailures: 0,
    consecutiveFailuresBeforeError: 5,
    ownerHasPermission: true,
    ...overrides,
  }
}

describe('nextAlertState — AC-1220, spec 06 §12.4', () => {
  it('armed -> cooling and fires when the condition is true on a complete bucket (armed -> firing, collapsed same cycle)', () => {
    const t = nextAlertState('armed', ctx({ conditionMet: true }))
    expect(t).toMatchObject({ from: 'armed', to: 'cooling', fired: true })
  })

  it('armed stays armed when the condition is false', () => {
    const t = nextAlertState('armed', ctx({ conditionMet: false }))
    expect(t).toMatchObject({ to: 'armed', fired: false })
  })

  it('armed stays armed on an inconclusive cycle (no-complete-bucket / no-baseline)', () => {
    const t = nextAlertState('armed', ctx({ conditionMet: null }))
    expect(t).toMatchObject({ to: 'armed', fired: false })
  })

  it('firing settles to cooling immediately, in the same cycle it was entered (§12.4)', () => {
    const t = nextAlertState('firing', ctx({ conditionMet: true }))
    expect(t).toMatchObject({ from: 'firing', to: 'cooling', fired: false })
  })

  it('cooling -> armed when the condition goes false for one full evaluation (hysteresis, the default re-arm)', () => {
    const t = nextAlertState('cooling', ctx({ conditionMet: false }))
    expect(t).toMatchObject({ to: 'armed' })
  })

  it('cooling stays cooling while the condition is still true and no re-arm backstop applies', () => {
    const t = nextAlertState('cooling', ctx({ conditionMet: true, minReArmMinutes: null }))
    expect(t).toMatchObject({ to: 'cooling' })
  })

  it('cooling -> armed when minReArmMinutes elapses while the condition is still true (the backstop re-arm)', () => {
    const t = nextAlertState(
      'cooling',
      ctx({ conditionMet: true, minReArmMinutes: 30, coolingSince: '2026-06-25T08:00:00+03:00', now: '2026-06-25T08:31:00+03:00' }),
    )
    expect(t).toMatchObject({ to: 'armed' })
  })

  it('cooling stays cooling when minReArmMinutes has not yet elapsed', () => {
    const t = nextAlertState(
      'cooling',
      ctx({ conditionMet: true, minReArmMinutes: 30, coolingSince: '2026-06-25T08:00:00+03:00', now: '2026-06-25T08:15:00+03:00' }),
    )
    expect(t).toMatchObject({ to: 'cooling' })
  })

  it('armed -> suspended when the owner loses access to the measure, and notifies the owner once', () => {
    const t = nextAlertState('armed', ctx({ ownerHasPermission: false }))
    expect(t).toMatchObject({ to: 'suspended', notifyOwner: true })
    expect(t.reasonKey).toBeTruthy()
  })

  it('suspended stays suspended and does not re-notify on a later cycle', () => {
    const t = nextAlertState('suspended', ctx({ ownerHasPermission: false }))
    expect(t).toMatchObject({ to: 'suspended', notifyOwner: false })
  })

  it('any state -> error after 5 consecutive reports.run failures, notifying the owner once', () => {
    const t = nextAlertState('armed', ctx({ runFailed: true, consecutiveFailures: 5, consecutiveFailuresBeforeError: 5 }))
    expect(t).toMatchObject({ to: 'error', notifyOwner: true })
  })

  it('does not enter error before the failure threshold is reached', () => {
    const t = nextAlertState('armed', ctx({ runFailed: true, consecutiveFailures: 4, consecutiveFailuresBeforeError: 5 }))
    expect(t).toMatchObject({ to: 'armed' })
  })

  it('error stays error on a later failing cycle — not N owner notifications, one', () => {
    const t = nextAlertState('error', ctx({ runFailed: true, consecutiveFailures: 9, consecutiveFailuresBeforeError: 5 }))
    expect(t).toMatchObject({ to: 'error', notifyOwner: false })
  })

  it("mutedUntil is not a machine input — a muted rule's condition still fires and re-arms normally (§12.4: mute silences delivery, not evaluation)", () => {
    // AlertMachineInput carries no `mutedUntil` field at all: nothing here
    // could suppress this transition even if the caller intended to mute delivery.
    const fires = nextAlertState('armed', ctx({ conditionMet: true }))
    const rearms = nextAlertState('cooling', ctx({ conditionMet: false }))
    expect(fires.fired).toBe(true)
    expect(rearms.to).toBe('armed')
  })
})

describe('dropRecipients — AC-1224, D43', () => {
  it('drops a recipient without the measure permission and notifies the owner once', () => {
    const result = dropRecipients([
      { id: 'U-1', hasPermission: true },
      { id: 'U-2', hasPermission: false },
    ])
    expect(result.keptIds).toEqual(['U-1'])
    expect(result.droppedIds).toEqual(['U-2'])
    expect(result.notifyOwner).toBe(true)
  })

  it('does not notify the owner when every recipient still holds the permission', () => {
    const result = dropRecipients([{ id: 'U-1', hasPermission: true }])
    expect(result.droppedIds).toEqual([])
    expect(result.notifyOwner).toBe(false)
  })
})

function rule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'ALR-1',
    name: 'Weekly rule',
    reportId: 'RPT-1',
    seriesId: 'trips.count#none#current',
    comparator: 'gt',
    threshold: 40,
    thresholdUnit: 'count',
    thresholdCurrency: null,
    evaluationGrain: 'week',
    cadence: 'daily',
    minReArmMinutes: null,
    consecutiveFailuresBeforeError: 5,
    state: 'armed',
    enabled: true,
    mutedUntil: null,
    recipientIds: [],
    ownerId: 'U-1',
    notificationPriority: 'high',
    lastEvaluatedAt: null,
    lastFiredAt: null,
    lastValue: null,
    stateReasonKey: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('evaluate + nextAlertState composed — AC-1221', () => {
  it('a weekly rule on a daily cadence transitions at most once per new bucket (lastBucketStart)', () => {
    const weekBuckets = ['2026-06-08', '2026-06-15']
    const points = [30, 50]
    const series = { buckets: weekBuckets, points, partialBucketIndexes: [] as number[] }
    const r = rule({ comparator: 'gt', threshold: 40 })

    // Day 1: the weekly bucket is new — the scheduler evaluates and feeds the machine.
    const first = evaluate(r, series, NOW)
    expect(isNewBucket(first.bucketStart, null)).toBe(true)
    const firstTransition = nextAlertState('armed', ctx({ conditionMet: first.outcome === 'would-fire' }))
    expect(firstTransition).toMatchObject({ to: 'cooling', fired: true })

    // Day 2, same cadence tick, same underlying bucket: the scheduler sees the
    // bucket has not moved on and must not feed a second `conditionMet` this week.
    const second = evaluate(r, series, NOW)
    const sameBucket = !isNewBucket(second.bucketStart, first.bucketStart)
    expect(sameBucket).toBe(true)
    const secondTransition = nextAlertState('cooling', ctx({ conditionMet: sameBucket ? null : second.outcome === 'would-fire' }))
    // Fed `null` (inconclusive) because the bucket did not change — cooling holds, no second firing.
    expect(secondTransition).toMatchObject({ to: 'cooling', fired: false })
  })
})
