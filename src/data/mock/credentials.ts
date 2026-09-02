/**
 * The two mock credentials a **test** needs to hold as a value, rather than to
 * receive from a client call.
 *
 * They were declared in `fixtures/authIdentities.ts` beside the seeded
 * identities, and `clients/auth.ts` re-exported them through the seam so a
 * screen test could reach them without importing a fixture directly. That
 * re-export is a `export … from '../fixtures/…'`, which is a **static** edge:
 * it pinned the whole of `authIdentities.ts` — every seeded identity, every
 * `USR-…` id — into the http build, where not one of them can be read.
 *
 * They are the only two values in that file with no rows in them, so they move
 * here: `mock/` is already statically imported by every client (`delay.ts`,
 * `clock.ts`), it costs 40 bytes in an http build, and `clients/auth.ts` can go
 * on re-exporting them unchanged. The seeded identities behind them stay in the
 * fixture chunk where they belong.
 *
 * `authIdentities.ts` imports both from here, so there is still exactly one
 * declaration of each.
 */

/**
 * §10.3's five codes. **Any other six digits is `wrong`** — which is the case
 * that counts against `attemptsRemaining`, and the only one that does.
 */
export const AUTH_FIXTURE_CODES = {
  correct: '123456',
  expired: '000000',
  superseded: '111111',
  challengeLocked: '999999',
} as const

/**
 * **The one password every seeded identity accepts** — **AC-505**'s *"the
 * fixture password"*, which the spec's §10.3 table names nowhere.
 *
 * 14 characters, so it clears `PASSWORD_MIN_LENGTH` (12) and nothing in the
 * fixtures depends on a password the reset form would itself refuse.
 */
export const AUTH_FIXTURE_PASSWORD = 'eyvar-ops-2026'
