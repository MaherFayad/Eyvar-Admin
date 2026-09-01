/**
 * **The F-014 regression suite.**
 *
 * Legacy defect F-014: *saving the reason-code / SLA screen destroyed tier
 * inheritance for all 40 codes.* `renderReasonCodesTable` (`:15083`) filled each
 * target input with the **effective** value — `rcTargets(code).fr`, inheritance
 * already resolved — and `saveReasonCodes` (`:15104`) read the same inputs
 * straight back. One press of `Save changes`, with nothing edited, turned every
 * inherited target into an explicit override. Nothing on screen moved, so
 * nobody noticed until a tier default was changed and propagated to nothing.
 *
 * The headline test is `load → save unedited → assert nothing moved`, asserted
 * three independent ways: the stored document is byte-identical, no cell gained
 * an override, and the save reports zero changed fields.
 *
 * **And then the instrument is proved.** A test whose passing state is an
 * absence flatters a broken instrument — `DECISIONS.md`, *"a negative assertion
 * can pass vacuously"*. So every one of those three assertions is run a second
 * time against `flattenSlaPolicy`, which reproduces exactly what legacy did, and
 * every one of them **fails** in the way it is supposed to. Same save function,
 * same assertions, opposite outcome.
 *
 * AC-906 … AC-918.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  auditLogSize,
  disableMockLatency,
  effectiveSlaTargets,
  getOperationalPolicy,
  listAuditEntries,
  listReasonCodeOptions,
  listReasonCodes,
  mockFailures,
  overrideCount,
  resetDataLayer,
  resolutionTargetMinutes,
  resolveReasonCode,
  restoreReasonCode,
  retireReasonCode,
  saveOperationalPolicy,
  saveReasonCode,
  useEmptyReasonCodes,
} from '@/data/clients'
import { isApiError } from '@/data/types'
import type { OperationalPolicy, SlaPolicy } from '@/data/types/policy'
import { slaClock, slaTrackPercent, type SlaClock } from '@/lib'
import {
  draftFromPolicy,
  draftToInput,
  flattenSlaPolicy,
  isDraftDirty,
  overrideSlaTarget,
  overrideTally,
  parseWholeNumber,
  revertSlaTarget,
  setSlaTarget,
  setTierDefault,
  slaCellView,
} from './policyDraft'

beforeEach(() => {
  disableMockLatency()
  resetDataLayer()
})

/**
 * **The exact save the screen performs when the operator presses `Save` having
 * touched nothing.** It goes through the real draft module and the real client,
 * so the test cannot pass by reimplementing a correct mapping of its own.
 */
async function saveUnedited(policy: OperationalPolicy) {
  return saveOperationalPolicy(draftToInput(draftFromPolicy(policy)))
}

/** Legacy's save, reproduced. Same entry point, effective values resolved first. */
async function saveTheWayLegacyDid(policy: OperationalPolicy) {
  const draft = draftFromPolicy(policy)
  return saveOperationalPolicy({
    ...draftToInput(draft),
    sla: flattenSlaPolicy(draft.sla),
  })
}

/** Every `null` in the grid, as dotted paths. What F-014 emptied. */
function inheritedCells(sla: SlaPolicy): string[] {
  const paths: string[] = []
  for (const queue of sla.queues) {
    for (const cell of queue.tiers) {
      if (cell.firstResponseMinutes === null) paths.push(`${queue.queueId}.${cell.tier}.first`)
      if (cell.resolutionMinutes === null) paths.push(`${queue.queueId}.${cell.tier}.resolution`)
    }
  }
  return paths
}

/* ═══════════════ F-014 — the round trip ═══════════════ */

describe('F-014 — a save with no edit changes nothing', () => {
  /** AC-906. The whole defect in one line. */
  it('stores a byte-identical document', async () => {
    const before = await getOperationalPolicy()
    await saveUnedited(before)
    const after = await getOperationalPolicy()

    expect(after).toStrictEqual(before)
    expect(JSON.stringify(after)).toBe(JSON.stringify(before))
  })

  /** AC-907 — no field gained an explicit override. */
  it('leaves every inherited target inherited', async () => {
    const before = await getOperationalPolicy()
    /* The fixture has to have something to lose, or this asserts nothing. */
    expect(inheritedCells(before.sla).length).toBeGreaterThan(50)

    await saveUnedited(before)
    const after = await getOperationalPolicy()

    expect(inheritedCells(after.sla)).toEqual(inheritedCells(before.sla))
    expect(overrideCount(after.sla)).toBe(overrideCount(before.sla))
  })

  /** AC-908 — and the save says so, in the payload the audit log carries. */
  it('reports zero changed fields', async () => {
    const before = await getOperationalPolicy()
    const result = await saveUnedited(before)
    expect(result.changedFields).toEqual([])
  })

  /** AC-909 — nothing changed, so the audit log gains nothing to read. */
  it('writes no audit entry', async () => {
    const before = await getOperationalPolicy()
    const sizeBefore = auditLogSize()
    await saveUnedited(before)
    expect(auditLogSize()).toBe(sizeBefore)
  })

  /**
   * AC-910 — the **consequence** F-014 destroyed, asserted directly.
   *
   * After a clean save, moving a tier default still reaches every cell that
   * inherits it. This is the assertion that would have failed silently in the
   * legacy app for a year: the flattened cells were carrying the *old* number
   * and looked completely normal.
   */
  it('keeps a tier default propagating after a save', async () => {
    const loaded = await getOperationalPolicy()
    await saveUnedited(loaded)

    const saved = await getOperationalPolicy()
    /* `dispute` inherits everything, so T3 resolution is the tier's 2880. */
    expect(effectiveSlaTargets(saved.sla, 'dispute', 'T3').resolution).toEqual({
      minutes: 2880,
      source: 'tier',
    })

    const draft = setTierDefault(draftFromPolicy(saved), 'T3', { resolutionMinutes: 3600 })
    await saveOperationalPolicy(draftToInput(draft))

    const moved = await getOperationalPolicy()
    expect(effectiveSlaTargets(moved.sla, 'dispute', 'T3').resolution).toEqual({
      minutes: 3600,
      source: 'tier',
    })
    /* And the queue that DID override T3's first response keeps its own number,
       which is the other half of inheritance working. */
    expect(effectiveSlaTargets(moved.sla, 'request', 'T3').firstResponse).toEqual({
      minutes: 30,
      source: 'queue',
    })
  })
})

/* ═══════════ the instrument, proved against the defect ═══════════ */

describe('F-014 — the same three assertions fail against the legacy save', () => {
  /**
   * Without this block the suite above is three negatives with nothing that can
   * make them positive, which is the vacuous green `DECISIONS.md` names. Here
   * the defect is reproduced through the **same client function**, and each
   * assertion above is inverted.
   */
  it('the document is no longer identical', async () => {
    const before = await getOperationalPolicy()
    await saveTheWayLegacyDid(before)
    const after = await getOperationalPolicy()

    expect(after).not.toStrictEqual(before)
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before))
  })

  it('every inherited target has become an explicit override', async () => {
    const before = await getOperationalPolicy()
    const lost = inheritedCells(before.sla).length
    expect(lost).toBeGreaterThan(50)

    await saveTheWayLegacyDid(before)
    const after = await getOperationalPolicy()

    /* Not one `null` left anywhere in the grid. */
    expect(inheritedCells(after.sla)).toEqual([])
    expect(overrideCount(after.sla)).toBe(overrideCount(before.sla) + lost)
  })

  it('the save reports one changed field per flattened cell', async () => {
    const before = await getOperationalPolicy()
    const lost = inheritedCells(before.sla).length
    const result = await saveTheWayLegacyDid(before)
    expect(result.changedFields).toHaveLength(lost)
    expect(result.changedFields).toContain('sla.queues.dispute.T1.firstResponseMinutes')
  })

  it('an audit entry is written, naming what moved', async () => {
    const before = await getOperationalPolicy()
    const sizeBefore = auditLogSize()
    await saveTheWayLegacyDid(before)
    expect(auditLogSize()).toBe(sizeBefore + 1)

    const log = await listAuditEntries({ subjectType: 'policy' })
    expect(log.items[0]?.action).toBe('policy.save')
    expect(log.items[0]?.detail.key).toBe('policy.audit.saved')
    expect(String(log.items[0]?.detail.params?.fields)).toContain('firstResponseMinutes')
  })

  /**
   * And the reason it matters: a flattened grid stops following the tier. The
   * numbers are identical the instant after the save and wrong the instant a
   * tier default moves — which is precisely why nobody caught it by looking.
   */
  it('a flattened grid stops following the tier default', async () => {
    const loaded = await getOperationalPolicy()
    await saveTheWayLegacyDid(loaded)

    const flattened = await getOperationalPolicy()
    /* Identical right now. This is the trap. */
    expect(effectiveSlaTargets(flattened.sla, 'dispute', 'T3').resolution.minutes).toBe(2880)

    const draft = setTierDefault(draftFromPolicy(flattened), 'T3', { resolutionMinutes: 3600 })
    await saveOperationalPolicy(draftToInput(draft))

    const moved = await getOperationalPolicy()
    expect(effectiveSlaTargets(moved.sla, 'dispute', 'T3').resolution).toEqual({
      minutes: 2880,
      source: 'queue',
    })
  })
})

/* ═══════════ inheritance, as the editor sees it ═══════════ */

describe('inherited and overridden are different, visibly', () => {
  /** AC-911 — the view model the cell renders from. */
  it('an un-overridden cell has no editable value, only the tier’s', async () => {
    const draft = draftFromPolicy(await getOperationalPolicy())

    const inherited = slaCellView(draft, 'dispute', 'T2', 'resolutionMinutes')
    expect(inherited.state).toBe('inherited')
    expect(inherited.effectiveMinutes).toBe(1440)
    expect(inherited.tierMinutes).toBe(1440)

    const overridden = slaCellView(draft, 'incident', 'T2', 'firstResponseMinutes')
    expect(overridden.state).toBe('overridden')
    expect(overridden.effectiveMinutes).toBe(5)
    /* The tier's number is still carried, so the cost of the override is
       renderable beside it. */
    expect(overridden.tierMinutes).toBe(15)
  })

  /** AC-912 — override then revert is a true round trip, back to `null`. */
  it('override seeds from the tier, and revert puts the null back', async () => {
    const policy = await getOperationalPolicy()
    const clean = draftFromPolicy(policy)
    expect(isDraftDirty(clean, policy)).toBe(false)

    const overridden = overrideSlaTarget(clean, 'dispute', 'T2', 'resolutionMinutes')
    expect(slaCellView(overridden, 'dispute', 'T2', 'resolutionMinutes').state).toBe('overridden')
    expect(isDraftDirty(overridden, policy)).toBe(true)

    const reverted = revertSlaTarget(overridden, 'dispute', 'T2', 'resolutionMinutes')
    expect(slaCellView(reverted, 'dispute', 'T2', 'resolutionMinutes').state).toBe('inherited')
    expect(isDraftDirty(reverted, policy)).toBe(false)
    expect(JSON.stringify(draftToInput(reverted))).toBe(JSON.stringify(draftToInput(clean)))
  })

  /** AC-913 — an override that equals the tier is still an override, and survives a save. */
  it('an override numerically equal to the tier is stored as an override', async () => {
    const policy = await getOperationalPolicy()
    const draft = overrideSlaTarget(draftFromPolicy(policy), 'dispute', 'T2', 'resolutionMinutes')

    const result = await saveOperationalPolicy(draftToInput(draft))
    expect(result.changedFields).toEqual(['sla.queues.dispute.T2.resolutionMinutes'])

    const after = await getOperationalPolicy()
    expect(effectiveSlaTargets(after.sla, 'dispute', 'T2').resolution.source).toBe('queue')
    expect(overrideCount(after.sla)).toBe(overrideCount(policy.sla) + 1)
  })

  it('counts the grid honestly — nine queues, four tiers, two targets', async () => {
    const draft = draftFromPolicy(await getOperationalPolicy())
    const tally = overrideTally(draft)
    expect(tally.total).toBe(9 * 4 * 2)
    expect(tally.overridden).toBeGreaterThan(0)
    expect(tally.overridden).toBeLessThan(tally.total)
  })

  /**
   * AC-914 — **the editor and `src/lib/sla.ts` read the same number.**
   *
   * `resolutionTargetMinutes` is `SlaInput.targetMinutes`. Changing the policy
   * moves the clock's band with no other edit, which is the whole reason this
   * screen exists: `sla.ts` has always computed against a policy and nothing
   * could change one.
   */
  it('feeds SlaInput.targetMinutes, so an edit moves the clock', async () => {
    const policy = await getOperationalPolicy()
    const now = '2026-06-25T09:14:00+03:00'
    const dueAt = '2026-06-25T10:14:00+03:00'

    /* `slaTrackPercent` rather than `clock.consumedRatio`: the ratio lives on
       two of the union's three arms and the `no-clock` arm has no such field, so
       reading it directly would need a narrowing this test has no business
       doing. The track percent is the same number, rounded, through the public
       function. */
    const clockOn = (sla: SlaPolicy): SlaClock =>
      slaClock({ dueAt, targetMinutes: resolutionTargetMinutes(sla, 'dispute', 'T3') }, now)

    /* `slaClock` bands on the share of the window CONSUMED: 60 minutes left of
       a 2880-minute window is 97.9 % gone, which is `warning`. */
    expect(clockOn(policy.sla).band).toBe('warning')
    expect(slaTrackPercent(clockOn(policy.sla))).toBe(98)

    const draft = setSlaTarget(draftFromPolicy(policy), 'dispute', 'T3', 'resolutionMinutes', 90)
    await saveOperationalPolicy(draftToInput(draft))

    /* Same item, same deadline, same instant — 60 minutes left of a 90-minute
       window is 33 % gone, and the band is `neutral`. **Nothing about the item
       changed; only the policy did.** */
    const after = await getOperationalPolicy()
    expect(clockOn(after.sla).band).toBe('neutral')
    expect(slaTrackPercent(clockOn(after.sla))).toBe(33)
  })

  /** A blank field is `null`, never `0`. `parseInt(v) || 0` is legacy's `gv()` (`:12984`). */
  it('reads a blank number field as null, not zero', () => {
    expect(parseWholeNumber('')).toBeNull()
    expect(parseWholeNumber('   ')).toBeNull()
    expect(parseWholeNumber('abc')).toBeNull()
    expect(parseWholeNumber('-5')).toBeNull()
    expect(parseWholeNumber('2.5')).toBeNull()
    expect(parseWholeNumber('0')).toBe(0)
    expect(parseWholeNumber('240')).toBe(240)
  })
})

/* ═══════════ retirement ═══════════ */

describe('a retired code leaves the picker and nothing else', () => {
  /** AC-915 — the instrument first: the code IS offered before it is retired. */
  it('offers an active code on every surface it declares', async () => {
    const options = await listReasonCodeOptions('refund')
    expect(options.map((code) => code.key)).toContain('CAP_NOSHOW')
  })

  /** AC-916 — retiring removes it from the picker. */
  it('removes it from the picker', async () => {
    await retireReasonCode('CAP_NOSHOW', { supersededByKey: 'CAP_CANCEL_ADV' })
    const options = await listReasonCodeOptions('refund')
    expect(options.map((code) => code.key)).not.toContain('CAP_NOSHOW')
  })

  /**
   * AC-917 — **and keeps rendering on historical records.** This is the
   * criterion the whole `state` field exists for: a closed dispute from March
   * points at the key as a string, and a key that stops resolving prints itself
   * onto an audit line.
   */
  it('still resolves for a historical record, in both languages', async () => {
    await retireReasonCode('CAP_NOSHOW', { supersededByKey: 'CAP_CANCEL_ADV' })

    const resolved = await resolveReasonCode('CAP_NOSHOW')
    expect(resolved.state).toBe('retired')
    expect(resolved.labels.en).toBe('Captain no-show')
    expect(resolved.labels.ar).toBe('عدم حضور الكابتن')
    expect(resolved.retiredAt).toBe('2026-06-25T09:14:00+03:00')
    expect(resolved.supersededByKey).toBe('CAP_CANCEL_ADV')
  })

  it('keeps it in the admin registry, sunk below the active codes', async () => {
    const before = await listReasonCodes({ pageSize: 100 })
    await retireReasonCode('CAP_NOSHOW')
    const after = await listReasonCodes({ pageSize: 100 })

    expect(after.total).toBe(before.total)
    const keys = after.items.map((code) => code.key)
    expect(keys).toContain('CAP_NOSHOW')
    const firstRetired = after.items.findIndex((code) => code.state === 'retired')
    expect(after.items.slice(firstRetired).every((code) => code.state === 'retired')).toBe(true)
  })

  it('ships codes already retired, so the state is reachable without a mutation', async () => {
    const retired = await listReasonCodes({ state: 'retired', pageSize: 100 })
    expect(retired.total).toBeGreaterThan(0)
    expect(retired.items.map((code) => code.key)).toContain('TRP_GHOST_COMPLETE')
    /* And it is still resolvable, which is the same guarantee one turn earlier. */
    expect((await resolveReasonCode('TRP_GHOST_COMPLETE')).labels.ar).not.toBe('')
  })

  it('refuses a successor that is itself retired', async () => {
    await expect(
      retireReasonCode('CAP_LATE', { supersededByKey: 'APP_PROMO' }),
    ).rejects.toSatisfy((error: unknown) => isApiError(error) && error.status === 422)
  })

  it('refuses to retire a code twice', async () => {
    await retireReasonCode('CAP_LATE')
    await expect(retireReasonCode('CAP_LATE')).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.status === 409,
    )
  })

  it('puts a code back in the picker without erasing that it was retired', async () => {
    await retireReasonCode('CAP_LATE')
    const restored = await restoreReasonCode('CAP_LATE')
    expect(restored.state).toBe('active')
    /* The retirement happened. An audit trail that can be un-happened is not one. */
    expect(restored.retiredAt).not.toBeNull()
    expect((await listReasonCodeOptions('ticket')).map((c) => c.key)).toContain('CAP_LATE')
  })

  it('refuses an Arabic label left blank', async () => {
    await expect(
      saveReasonCode('CAP_LATE', {
        labels: { en: 'Captain late for pickup', ar: '   ' },
        surfaces: ['ticket'],
        requiresNote: false,
        tier: 'T3',
        ownerTeam: 'Ops',
        reference: '1.2',
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isApiError(error) && error.details.some((detail) => detail.field === 'labels.ar'),
    )
  })

  it('writes one audit entry per registry write, naming the code', async () => {
    const before = auditLogSize()
    await retireReasonCode('CAP_LATE', { supersededByKey: 'CAP_NOSHOW' })
    expect(auditLogSize()).toBe(before + 1)

    const log = await listAuditEntries({ subjectType: 'reasonCode' })
    expect(log.items[0]?.action).toBe('reasonCode.retire')
    expect(log.items[0]?.subjectId).toBe('CAP_LATE')
  })
})

/* ═══════════ the three panes that were never wired ═══════════ */

describe('dispatch, cities and limits round-trip too', () => {
  /** AC-918 — the coordinator's addition: the same round trip, on the other panes. */
  it('a save with no edit leaves every city and limit identical', async () => {
    const before = await getOperationalPolicy()
    await saveUnedited(before)
    const after = await getOperationalPolicy()

    expect(after.cities).toStrictEqual(before.cities)
    expect(after.limits).toStrictEqual(before.limits)
    expect(after.dispatch).toStrictEqual(before.dispatch)
  })

  it('never lets a save write the measured fleet', async () => {
    const before = await getOperationalPolicy()
    const riyadh = before.cities.find((city) => city.id === 'CITY-01')!
    expect(riyadh.activeCaptains).toBe(142)

    /* A doctored input carrying a fleet count. `SaveOperationalPolicyInput`
       has no such field, so this is what a careless spread would send. */
    const draft = draftFromPolicy(before)
    await saveOperationalPolicy({
      ...draftToInput(draft),
      cities: draft.cities.map((city) => ({ ...city, activeCaptains: 9999 })),
    })

    const after = await getOperationalPolicy()
    expect(after.cities.find((city) => city.id === 'CITY-01')?.activeCaptains).toBe(142)
  })

  it('refuses a cleared numeric limit rather than storing it as zero', async () => {
    const draft = draftFromPolicy(await getOperationalPolicy())
    await expect(
      saveOperationalPolicy({
        ...draftToInput(draft),
        limits: { ...draft.limits, maxCaptainDailyDrivingMinutes: 0 },
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isApiError(error) &&
        error.status === 422 &&
        error.details.some((d) => d.field === 'limits.maxCaptainDailyDrivingMinutes'),
    )
  })

  it('refuses a first-response target later than the resolution it belongs to', async () => {
    const draft = setSlaTarget(
      draftFromPolicy(await getOperationalPolicy()),
      'dispute',
      'T3',
      'firstResponseMinutes',
      99_999,
    )
    await expect(saveOperationalPolicy(draftToInput(draft))).rejects.toSatisfy(
      (error: unknown) => isApiError(error) && error.status === 422,
    )
  })
})

/* ═══════════ the four states are reachable ═══════════ */

describe('every state QA has to reach is reachable without editing a fixture', () => {
  it('fails the document read on demand', async () => {
    mockFailures.always('policy.get')
    await expect(getOperationalPolicy()).rejects.toSatisfy(isApiError)
    mockFailures.clear('policy.get')
    await expect(getOperationalPolicy()).resolves.toBeDefined()
  })

  it('fails the save on demand', async () => {
    mockFailures.always('policy.save')
    const before = await getOperationalPolicy()
    mockFailures.always('policy.save')
    await expect(saveUnedited(before)).rejects.toSatisfy(isApiError)
  })

  it('reaches an empty registry — the first-run empty, not a filtered one', async () => {
    useEmptyReasonCodes()
    const page = await listReasonCodes({ pageSize: 100 })
    expect(page.total).toBe(0)
    expect(page.totalPages).toBe(1)
  })

  it('reaches the filtered empty, which is a different sentence', async () => {
    const page = await listReasonCodes({ q: 'zzzz-no-such-code', pageSize: 100 })
    expect(page.total).toBe(0)
    /* And the registry itself is not empty, which is what makes the two states
       different rather than two names for one. */
    expect((await listReasonCodes({ pageSize: 100 })).total).toBeGreaterThan(0)
  })

  it('returns identical data on two reads', async () => {
    expect(await getOperationalPolicy()).toStrictEqual(await getOperationalPolicy())
  })
})
