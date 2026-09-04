/**
 * Live Dispatch — the telemetry read and the intervention queue (T1.1, T1.2).
 *
 * Both were literals inside `DispatchScreen.tsx`, which is why the header could
 * claim *"live telemetry connected"* over three numbers nothing refreshed (X4)
 * and why `Acknowledge` and `Reassign` rendered disabled (X5).
 */

import { DATA_SOURCE, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { mock, mockMutation, notFound } from '../mock/delay'
import { ApiError } from '../types/common'
import type { DispatchTelemetry, Intervention } from '../types/dispatch'
import { http } from './http'
import { currentMockUserId } from './session'
import { fixturesLoaded, onFixturesLoaded, type Fixtures } from '../mock/fixtures'

/* Late-bound fixture rows. `mock/fixtures.ts` says why this is not a static
   import: a static one pins seeded data into every build, including the http
   build that can never read it. */
let dispatchTelemetryFixture!: Fixtures['dispatchTelemetryFixture']
let interventionFixtures!: Fixtures['interventionFixtures']
let allDriverFixtures!: Fixtures['allDriverFixtures']
onFixturesLoaded((f) => {
  dispatchTelemetryFixture = f.dispatchTelemetryFixture
  interventionFixtures = f.interventionFixtures
  allDriverFixtures = f.allDriverFixtures
  dynamicInterventions = [...interventionFixtures]
})

export const DISPATCH_OPERATIONS = {
  telemetry: 'dispatch.telemetry',
  interventions: 'dispatch.interventions',
  acknowledgeIntervention: 'dispatch.acknowledgeIntervention',
  reassignIntervention: 'dispatch.reassignIntervention',
} as const

/* Registered at module load, not on first call, so an operation nobody has
   invoked yet is still listed for `?mockFail=`. */
registerOperations(...Object.values(DISPATCH_OPERATIONS))

let dynamicInterventions!: Intervention[]

/** Back to fixtures. A test that acknowledges one must not leak into the next. */
export function resetDispatch(): void {
  if (!fixturesLoaded()) return
  dynamicInterventions = [...interventionFixtures]
}

/**
 * GET /api/v1/dispatch/telemetry
 *   params: none — the server scopes to the caller's cities
 *   -> DispatchTelemetry
 *
 * Three measurements and the instant they were taken. **Numbers, not display
 * strings**: the screen formats them (§8.3), so Arabic gets Arabic digits.
 */
export async function getDispatchTelemetry(signal?: AbortSignal): Promise<DispatchTelemetry> {
  if (DATA_SOURCE === 'http') {
    return http.get<DispatchTelemetry>('/dispatch/telemetry', undefined, { signal })
  }
  return mock(DISPATCH_OPERATIONS.telemetry, signal, () => dispatchTelemetryFixture)
}

/**
 * GET /api/v1/dispatch/interventions
 *   params: status
 *   -> Intervention[]
 *
 * Not paginated: a monitor shows what is happening now, and a shift that has
 * more open interventions than fit on one card has a bigger problem than
 * paging. Ordered oldest first, because the longest-waiting rider is the one
 * an operator should reach next.
 */
export async function listInterventions(
  params: { status?: Intervention['status'] } = {},
  signal?: AbortSignal,
): Promise<Intervention[]> {
  if (DATA_SOURCE === 'http') {
    return http.get<Intervention[]>('/dispatch/interventions', { ...params }, { signal })
  }
  return mock(DISPATCH_OPERATIONS.interventions, signal, () =>
    dynamicInterventions
      .filter((i) => (params.status ? i.status === params.status : true))
      .slice()
      .sort((a, b) => Date.parse(a.raisedAt) - Date.parse(b.raisedAt)),
  )
}

/**
 * POST /api/v1/dispatch/interventions/:id/acknowledge
 *   body: { note: string | null }
 *   -> Intervention
 *   404 when the id does not exist
 *   409 `already_acknowledged` when somebody has already taken it
 *
 * The 409 is the point of the write. The old control spliced a local array and
 * toasted success, so two operators could both "acknowledge" and neither knew.
 */
export async function acknowledgeIntervention(
  id: string,
  note: string | null = null,
  signal?: AbortSignal,
): Promise<Intervention> {
  if (DATA_SOURCE === 'http') {
    return http.post<Intervention>(`/dispatch/interventions/${id}/acknowledge`, { note }, { signal })
  }
  return mockMutation(DISPATCH_OPERATIONS.acknowledgeIntervention, signal, () => {
    const index = dynamicInterventions.findIndex((i) => i.id === id)
    const existing = dynamicInterventions[index]
    if (!existing) throw notFound('intervention', id)
    if (existing.acknowledgedAt !== null) {
      throw new ApiError({
        status: 409,
        kind: 'conflict',
        code: 'already_acknowledged',
        message: `${existing.acknowledgedBy} acknowledged ${id} at ${existing.acknowledgedAt}`,
        retryable: false,
      })
    }
    const updated: Intervention = {
      ...existing,
      status: 'acknowledged',
      acknowledgedAt: EYVAR_NOW,
      acknowledgedBy: currentMockUserId(),
      acknowledgementNote: note,
    }
    dynamicInterventions[index] = updated
    return updated
  })
}

/**
 * POST /api/v1/dispatch/interventions/:id/reassign
 *   body: { driverId: string }
 *   -> Intervention
 *   404 when the intervention or the captain does not exist
 *   422 `driver_unavailable` when the captain is not online and free
 *   422 `same_driver` when the captain named is the one already on the trip
 *
 * Two 422s, because *"pick somebody else"* and *"pick somebody available"* are
 * different corrections and one code makes the screen guess.
 */
export async function reassignIntervention(
  id: string,
  driverId: string,
  signal?: AbortSignal,
): Promise<Intervention> {
  if (DATA_SOURCE === 'http') {
    return http.post<Intervention>(
      `/dispatch/interventions/${id}/reassign`,
      { driverId },
      { signal },
    )
  }
  return mockMutation(DISPATCH_OPERATIONS.reassignIntervention, signal, () => {
    const index = dynamicInterventions.findIndex((i) => i.id === id)
    const existing = dynamicInterventions[index]
    if (!existing) throw notFound('intervention', id)
    const driver = allDriverFixtures.find((d) => d.id === driverId)
    if (!driver) throw notFound('driver', driverId)
    if (existing.driverId === driverId) {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'same_driver',
        message: `${driver.name} is already on ${id}`,
        retryable: false,
      })
    }
    if (driver.status !== 'active') {
      throw new ApiError({
        status: 422,
        kind: 'validation',
        code: 'driver_unavailable',
        message: `${driver.name} is ${driver.status} and cannot take this trip`,
        retryable: false,
      })
    }
    const updated: Intervention = {
      ...existing,
      status: 'reassigned',
      reassignedToDriverId: driver.id,
      reassignedToDriverName: driver.name,
    }
    dynamicInterventions[index] = updated
    return updated
  })
}
