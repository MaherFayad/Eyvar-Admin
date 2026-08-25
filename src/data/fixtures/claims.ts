/**
 * Ownership claims — legacy `DB.ownership` (`eyvar_ops_panel_v40_fixed.html:18851`).
 *
 * Legacy seeds this **empty** and fills it at runtime, which means the "claimed
 * by someone else" state is unreachable on a fresh load and nobody has ever
 * designed it. These fixtures make all five claim states reachable without
 * hand-editing anything:
 *
 *   OWN-1  claimed by me (USR-1), fresh          → release / work it
 *   OWN-2  claimed by **another operator**       → take-over affordance, the state R5a's row marker exists for
 *   OWN-3  claimed by me but **stale** (42 min > staleMin 30) — legacy would
 *          auto-release it on read (`:18868`), which is D-L12: a read that writes
 *   OWN-4  released after a take-over, with the take-over recorded
 *   OWN-5  done
 *
 * `staleMin` is 30 (`DB.ownershipConfig`, `:18853`); all offsets below are from
 * the fixed clock, never from `Date.now()`.
 */

import type { Claim } from '../types/common'
import { offsetFromNow } from '../mock/clock'

export const OWNERSHIP_STALE_MINUTES = 30

export const claimFixtures: Claim[] = [
  {
    key: 'application:APP-2201',
    entityType: 'application',
    entityId: 'APP-2201',
    ownerId: 'USR-1',
    ownerName: 'Sarah Al-Rashid',
    claimedAt: offsetFromNow({ minutes: -8 }),
    touchedAt: offsetFromNow({ minutes: -2 }),
    state: 'claimed',
    releasedAt: null,
    releaseReason: null,
    takeovers: [],
  },
  {
    /* Claimed by someone else. The row must show who holds it and offer a
       deliberate take-over — "a claim is not a lock" (`:18841`). */
    key: 'application:APP-2204',
    entityType: 'application',
    entityId: 'APP-2204',
    ownerId: 'USR-5',
    ownerName: 'Yousef Al-Balawi',
    claimedAt: offsetFromNow({ minutes: -19 }),
    touchedAt: offsetFromNow({ minutes: -4 }),
    state: 'claimed',
    releasedAt: null,
    releaseReason: null,
    takeovers: [],
  },
  {
    /* 42 idle minutes — past the 30-minute stale window. Whether the UI shows
       this as held or as free is a **product decision nobody has made**: legacy
       releases it as a side effect of rendering (D-L12). Fixture kept in the
       `claimed` state so the screen has to decide, visibly. */
    key: 'ticket:TKT-503',
    entityType: 'ticket',
    entityId: 'TKT-503',
    ownerId: 'USR-1',
    ownerName: 'Sarah Al-Rashid',
    claimedAt: offsetFromNow({ minutes: -55 }),
    touchedAt: offsetFromNow({ minutes: -42 }),
    state: 'claimed',
    releasedAt: null,
    releaseReason: null,
    takeovers: [],
  },
  {
    key: 'ticket:TKT-502',
    entityType: 'ticket',
    entityId: 'TKT-502',
    ownerId: 'USR-3',
    ownerName: 'Lina Al-Otaibi',
    claimedAt: offsetFromNow({ hours: -3 }),
    touchedAt: offsetFromNow({ hours: -2 }),
    state: 'released',
    releasedAt: offsetFromNow({ minutes: -95 }),
    releaseReason: 'manual',
    takeovers: [
      {
        fromUserId: 'USR-4',
        fromUserName: 'Noura Al-Fahad',
        toUserId: 'USR-3',
        toUserName: 'Lina Al-Otaibi',
        at: offsetFromNow({ hours: -3 }),
      },
    ],
  },
  {
    key: 'application:APP-2203',
    entityType: 'application',
    entityId: 'APP-2203',
    ownerId: 'USR-5',
    ownerName: 'Yousef Al-Balawi',
    claimedAt: offsetFromNow({ days: -1, hours: -2 }),
    touchedAt: offsetFromNow({ days: -1 }),
    state: 'done',
    releasedAt: null,
    releaseReason: null,
    takeovers: [],
  },
]
