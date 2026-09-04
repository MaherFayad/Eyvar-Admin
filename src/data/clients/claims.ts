/**
 * The one way a mock client writes a `Claim` (§8.4.1: exactly one ownership
 * model). `nextClaim` in `requests.ts` resolves the owner from the session; this
 * takes the owner as an argument for the callers that already resolved one
 * (a logged call, a transfer, the palette) and shares the take-over record.
 */

import { EYVAR_NOW } from '../mock/clock'
import { ApiError, type Claim } from '../types/common'
import { liveClaim } from './requests'

export interface ClaimOwner {
  id: string
  name: string
}

/** A live claim for `owner`; a take-over of somebody else's is recorded, a silent one refused. */
export function claimFor(
  entityType: string,
  entityId: string,
  current: Claim | null,
  owner: ClaimOwner,
  takeOver: boolean,
): Claim {
  const held = liveClaim(current)
  if (held && held.ownerId !== owner.id && !takeOver) {
    throw new ApiError({
      status: 409,
      kind: 'conflict',
      code: 'claimed_by_other',
      message: `${held.ownerName} is holding this ${entityType}`,
      retryable: false,
    })
  }
  const handedOver = held !== null && held.ownerId !== owner.id
  return {
    key: `${entityType}:${entityId}`,
    entityType,
    entityId,
    ownerId: owner.id,
    ownerName: owner.name,
    claimedAt: held?.ownerId === owner.id ? held.claimedAt : EYVAR_NOW,
    touchedAt: EYVAR_NOW,
    state: 'claimed',
    releasedAt: null,
    releaseReason: null,
    takeovers: handedOver
      ? [
          ...held.takeovers,
          {
            fromUserId: held.ownerId,
            fromUserName: held.ownerName,
            toUserId: owner.id,
            toUserName: owner.name,
            at: EYVAR_NOW,
          },
        ]
      : (held?.takeovers ?? []),
  }
}

/** The claim released by hand. A claim nobody holds is returned unchanged. */
export function releasedClaim(current: Claim | null): Claim | null {
  const held = liveClaim(current)
  if (held === null) return current
  return { ...held, state: 'released', releasedAt: EYVAR_NOW, releaseReason: 'manual' }
}

/** The claim closed by a decision, so the row records who decided it. */
export function doneClaim(current: Claim | null, fallback: Claim): Claim {
  const held = liveClaim(current) ?? fallback
  return { ...held, state: 'done', touchedAt: EYVAR_NOW }
}
