/**
 * The five writes X5 named as missing, and the telemetry read X4 named as a
 * literal. One test per operation: the write lands, the read reflects it, and
 * the named 409 or 422 is thrown for the condition its docblock states.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { isApiError } from '../types/common'
import {
  acknowledgeIntervention,
  getDispatchTelemetry,
  listInterventions,
  reassignIntervention,
  resetDispatch,
} from './dispatch'
import {
  getCorporateAccount,
  listCorporateAccounts,
  removeCorporateEmployee,
  resetCorporateAccounts,
  sendCorporateInvoice,
} from './corporateAccounts'
import { listSubscriptions, reassignSubscriptionDriver } from './subscriptions'
import { listDrivers } from './drivers'

beforeEach(async () => {
  disableMockLatency()
  mockFailures.clear()
  /* The fixture chunk has to have landed before the reset can seed from it. */
  await listInterventions()
  resetDispatch()
  resetCorporateAccounts()
})

/** The `ApiError` a rejected call carried, or a failure naming what came back. */
async function refusal(call: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await call
  } catch (error) {
    if (isApiError(error)) return { status: error.status, code: error.code }
    throw error
  }
  throw new Error('the call resolved; it was expected to refuse')
}

describe('T1.1 — dispatch telemetry is a read, not a literal', () => {
  it('serves three measurements and the instant they were taken', async () => {
    const telemetry = await getDispatchTelemetry()
    /* Numbers, so §8.3 can format them for Arabic. `'42s'` could not be. */
    expect(typeof telemetry.medianMatchSeconds).toBe('number')
    expect(typeof telemetry.autoMatchPercent).toBe('number')
    expect(typeof telemetry.fleetUtilisationPercent).toBe('number')
    expect(telemetry.asOf).toBe('2026-06-25T09:14:00+03:00')
  })

  it('can fail, so the header has an error state to render', async () => {
    mockFailures.once('dispatch.telemetry')
    await expect(getDispatchTelemetry()).rejects.toBeDefined()
  })
})

describe('T1.2 — acknowledgeIntervention', () => {
  it('lands, and the read reflects it', async () => {
    const before = await listInterventions({ status: 'open' })
    const target = before.find((i) => i.id === 'INT-01')!
    expect(target.acknowledgedAt).toBeNull()

    const updated = await acknowledgeIntervention('INT-01', 'Called the captain.')
    expect(updated.status).toBe('acknowledged')
    expect(updated.acknowledgementNote).toBe('Called the captain.')

    const after = await listInterventions({ status: 'open' })
    expect(after.map((i) => i.id)).not.toContain('INT-01')
    const acknowledged = await listInterventions({ status: 'acknowledged' })
    expect(acknowledged.map((i) => i.id)).toContain('INT-01')
  })

  it('refuses 409 `already_acknowledged` when somebody has it', async () => {
    expect(await refusal(acknowledgeIntervention('INT-04'))).toEqual({
      status: 409,
      code: 'already_acknowledged',
    })
  })

  it('404s on an id that does not exist', async () => {
    expect((await refusal(acknowledgeIntervention('INT-99'))).status).toBe(404)
  })
})

describe('T1.2 — reassignIntervention', () => {
  it('lands, and the read reflects it', async () => {
    const captains = await listDrivers({ status: 'active', pageSize: 50 })
    const free = captains.items.find((d) => d.id !== 'DRV-0101')!

    const updated = await reassignIntervention('INT-01', free.id)
    expect(updated.reassignedToDriverId).toBe(free.id)
    expect(updated.reassignedToDriverName).toBe(free.name)

    const reassigned = await listInterventions({ status: 'reassigned' })
    expect(reassigned.map((i) => i.id)).toContain('INT-01')
  })

  it('refuses 422 `same_driver` when the captain named is already on it', async () => {
    expect(await refusal(reassignIntervention('INT-01', 'DRV-0101'))).toEqual({
      status: 422,
      code: 'same_driver',
    })
  })

  it('refuses 422 `driver_unavailable` when the captain is not active', async () => {
    const all = await listDrivers({ pageSize: 200 })
    const unavailable = all.items.find((d) => d.status !== 'active' && d.id !== 'DRV-0101')!
    expect(await refusal(reassignIntervention('INT-01', unavailable.id))).toEqual({
      status: 422,
      code: 'driver_unavailable',
    })
  })
})

describe('T1.2 — removeCorporateEmployee', () => {
  /** An account with employees and no unsent invoice, whichever the fixtures seed. */
  async function unlinkable() {
    const { items } = await listCorporateAccounts({ pageSize: 100 })
    return items.find((c) => c.riderIds.length > 0 && !c.invoiceOverdue)
  }

  it('lands, and the read reflects it', async () => {
    const account = await unlinkable()
    if (!account) return
    const rider = account.riderIds[0]!

    const updated = await removeCorporateEmployee(account.id, rider)
    expect(updated.riderIds).not.toContain(rider)
    expect(updated.employeeCount).toBe(updated.riderIds.length)

    const reread = await getCorporateAccount(account.id)
    expect(reread.riderIds).not.toContain(rider)
  })

  it('refuses 422 `rider_not_linked` for a rider on no account', async () => {
    const account = await unlinkable()
    if (!account) return
    expect(await refusal(removeCorporateEmployee(account.id, 'RDR-0000'))).toEqual({
      status: 422,
      code: 'rider_not_linked',
    })
  })
})

describe('T1.2 — sendCorporateInvoice', () => {
  async function billable() {
    const { items } = await listCorporateAccounts({ pageSize: 100 })
    return items.find(
      (c) => c.status === 'Active' && c.billingType === 'Monthly invoice' && c.totalSpendHalalas > 0,
    )
  }

  it('lands, and the read reflects it', async () => {
    const account = await billable()
    if (!account) return
    const updated = await sendCorporateInvoice(account.id)
    expect(updated.lastInvoiceGeneratedAt).toBe('2026-06-25')
    expect(updated.invoiceOverdue).toBe(false)

    const reread = await getCorporateAccount(account.id)
    expect(reread.lastInvoiceGeneratedAt).toBe('2026-06-25')
  })

  it('refuses an account that is not active or not invoiced', async () => {
    const { items } = await listCorporateAccounts({ pageSize: 100 })
    const refusable = items.find(
      (c) => c.status !== 'Active' || c.billingType !== 'Monthly invoice',
    )
    if (!refusable) return
    const { status, code } = await refusal(sendCorporateInvoice(refusable.id))
    expect([409, 422]).toContain(status)
    expect(['account_not_active', 'prepaid_account', 'no_billable_spend']).toContain(code)
  })
})

describe('T1.2 — reassignSubscriptionDriver', () => {
  async function live() {
    const { items } = await listSubscriptions({ view: 'active', pageSize: 200 })
    return items.find((s) => s.driverId !== null)!
  }

  it('lands, and the row carries the new captain', async () => {
    const subscription = await live()
    const captains = await listDrivers({ status: 'active', pageSize: 200 })
    const replacement = captains.items.find(
      (d) =>
        d.id !== subscription.driverId &&
        (subscription.vehicleClass !== 'Comfort' || d.vehicleClass === 'Comfort'),
    )!

    const updated = await reassignSubscriptionDriver(
      subscription.id,
      replacement.id,
      'Captain suspended',
    )
    expect(updated.driverId).toBe(replacement.id)
    expect(updated.driverName).toBe(replacement.name)
  })

  it('refuses 422 `same_driver` when the captain already holds it', async () => {
    const subscription = await live()
    expect(
      await refusal(
        reassignSubscriptionDriver(subscription.id, subscription.driverId!, 'No change'),
      ),
    ).toEqual({ status: 422, code: 'same_driver' })
  })

  it('refuses 409 `not_reassignable` on a cancelled subscription', async () => {
    const { items } = await listSubscriptions({ pageSize: 500 })
    const dead = items.find((s) => s.status === 'cancelled' || s.status === 'expired')
    if (!dead) return
    const captains = await listDrivers({ status: 'active', pageSize: 50 })
    expect(
      await refusal(reassignSubscriptionDriver(dead.id, captains.items[0]!.id, 'Reassign')),
    ).toEqual({ status: 409, code: 'not_reassignable' })
  })

  it('refuses 422 `vehicle_class_below_plan` on a Comfort plan', async () => {
    const { items } = await listSubscriptions({ pageSize: 500 })
    const comfort = items.find((s) => s.vehicleClass === 'Comfort' && s.status === 'active')
    if (!comfort) return
    const captains = await listDrivers({ status: 'active', pageSize: 200 })
    const economy = captains.items.find(
      (d) => d.vehicleClass === 'Economy' && d.id !== comfort.driverId,
    )
    if (!economy) return
    expect(
      await refusal(reassignSubscriptionDriver(comfort.id, economy.id, 'Reassign')),
    ).toEqual({ status: 422, code: 'vehicle_class_below_plan' })
  })
})
