/**
 * Server policy constants — **not fixtures**, and that distinction is the
 * reason this file exists rather than a block inside `fixtures/financials.ts`.
 *
 * A fixture is seeded data standing in for rows a server will return, and it is
 * dropped entirely from a `VITE_DATA_SOURCE=http` build. These four values are
 * different: they are policy the server will eventually own, but which today a
 * screen reads **synchronously, during render**, in both modes —
 * `FinancialsPage.tsx` takes `DEFAULT_FINANCIALS_PERIOD` and `CashScreen.tsx`
 * calls `cashDebtCapHalalas()`. A value read synchronously cannot come from the
 * lazily-imported fixture chunk (`mock/fixtures.ts` explains the ordering
 * rule), so it needs a home that ships in both modes.
 *
 * They lived in `fixtures/financials.ts`, whose other 1 200 lines are seeded
 * rows. Keeping them there meant one 16 kB fixture module was statically
 * imported by four clients purely for these four constants, which put the whole
 * of it back into the http entry chunk.
 *
 * **These are open questions, not decisions.** Each is a client-side constant
 * standing in for something a backend should return; `07-api/OPEN-QUESTIONS.md`
 * carries Q-F8. When the server does return them, this file becomes a client
 * call and the screens keep their current shape.
 */

import type { FinancialsPeriod } from './types/financials'

/**
 * The default window. **Q-F8 open**: nobody has said whether a period closes.
 * This ships as an open range with no close concept.
 */
export const FINANCIALS_PERIOD: FinancialsPeriod = { start: '2026-06-01', end: '2026-06-30' }

/**
 * Server policy, per Admin › Operational Policy. `CASH_DEBT_CAP = -300` is a
 * client constant today (`:12080`) and its sign is inverted, because legacy
 * stores captain debt as a negative number.
 */
export const CASH_DEBT_CAP_HALALAS = 30_000

/** `CASH_TOLERANCE = 2.00` (`:12079`). Server policy; the client never classifies. */
export const CASH_TOLERANCE_HALALAS = 200

/** `CASH_COMMISSION_RATE = 0.20` (`:12078`) — one of the four commission answers §4.1 lists. */
export const CASH_COMMISSION_PERCENT = 20
