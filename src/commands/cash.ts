/**
 * The two decisions on a **captain cash report** — D9, F6.
 *
 * D8's paired decision affordance, and the first registry to use it: `resolve`
 * is `decision-affirm`, `escalate` is `decision-reject`, and the pair is
 * declared together so a queue cannot render one without the other.
 *
 * `decideCashReport` takes a closed set of two dispositions and **requires a
 * reason code** (422 without one), so both commands are `needs-input` and the
 * reason field is the client's contract rather than a courtesy.
 *
 * **The row converts in place** (AC-377): it stays in the list showing its
 * disposition, its decider and the time. Nothing here removes it, and the
 * toast says what it became rather than that it went.
 *
 * ## `scope: 'route'`, hidden from the palette — CM-4
 *
 * A cash report has **no `ProfileEntityType`**, so `search()` cannot rank one
 * and `TARGET_SOURCES` has nowhere to put it. Same sentence as `safety.ts`,
 * same report to mock-data-engineer.
 *
 * ## Neither offers an undo
 *
 * D18's second clause: escalating **pushes a notification** to Trust & Safety
 * (`:12180`) and the debt already applied stays on the captain's ledger
 * regardless of the outcome (`:12165`). Money and a message have both left the
 * console. Resolving has no inverse operation at all.
 */

import { ApproveIcon, BreachedIcon } from '@/components/icons'
import { decideCashReport } from '@/data/clients'
import type { CashReport } from '@/data/types'
import { formatMoney } from '@/lib'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandRegistry } from './registry'

/** The permission `CashScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'manage_cash'

const NO_PROFILE_ENTITY =
  'A cash report has no ProfileEntityType, so the palette has no way to find one as a target.'

/** `decideCashReport`'s own 409, restated at render. */
function isDecided(report: CashReport): boolean {
  return report.status !== 'pending'
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * Accept the captain's account of the cash. Legacy `Approve cash report`
 * (`eyvar_ops_panel_v40_fixed.html:12154`).
 */
const resolve: Command<CashReport> = {
  id: 'cashReport.resolve',
  titleKey: 'cashReport.action.resolve',
  compactTitleKey: 'cashReport.bulk.resolve',
  section: 'do',
  keywords: [
    'approve cash report',
    'resolve cash',
    'accept',
    'clear',
    'settle report',
    /* Legacy's own modal heading, verbatim (`:12154`), and the legacy page id. */
    'confirm approval',
    'cash-ledger',
    'اعتماد تقرير النقد',
    'قبول',
    'تسوية',
    'نقد',
  ],
  icon: ApproveIcon,
  scope: { kind: 'route', subTabId: 'financials-cash' },
  affordance: 'decision-affirm',
  arity: 'needs-input',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'cashReport.action.noPermission') ??
    blockedBy(ctx, isDecided, 'cashReport.action.resolve.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const reasonCode = await ctx.host.confirm({
      title: ctx.t('cashReport.resolve.title', { id: target.id, captain: target.captainName }),
      /* §5.7 rule 9 — the debt already applied stays either way (`:12165`). */
      body: ctx.t('cashReport.resolve.body', {
        debt: formatMoney(target.debtAddedHalalas),
      }),
      confirmLabel: ctx.t('cashReport.resolve.confirm'),
      reason: {
        label: ctx.t('cashReport.reason.label'),
        help: ctx.t('cashReport.reason.help'),
        message: ctx.t('cashReport.reason.message'),
      },
    })
    if (reasonCode === null) return null
    const changed = await decideCashReport(target.id, 'resolve', reasonCode)
    return {
      message: ctx.t('cashReport.toast.resolved', { id: changed.id }),
      changed: [changed],
    }
  },
}

/**
 * Send it to Trust & Safety. Legacy `Escalate to Trust & Safety`
 * (`:12235`), whose own confirmation says it *"cannot be undone from here"*
 * (`:12165`) — which is exactly D18's test failing, and exactly R5a's case.
 */
const escalate: Command<CashReport> = {
  id: 'cashReport.escalate',
  titleKey: 'cashReport.action.escalate',
  compactTitleKey: 'cashReport.bulk.escalate',
  section: 'do',
  keywords: [
    'escalate',
    'trust and safety',
    'investigate',
    'flag captain',
    'report fraud',
    /* Legacy's own button, verbatim (`:12235`). */
    'escalate to trust safety',
    'cash-ledger',
    'تصعيد',
    'تحقيق',
    'إحالة',
    'نقد',
  ],
  icon: BreachedIcon,
  scope: { kind: 'route', subTabId: 'financials-cash' },
  affordance: 'decision-reject',
  arity: 'needs-input',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'cashReport.action.noPermission') ??
    blockedBy(ctx, isDecided, 'cashReport.action.escalate.blocked'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const reasonCode = await ctx.host.confirm({
      title: ctx.t('cashReport.escalate.title', { id: target.id, captain: target.captainName }),
      body: ctx.t('cashReport.escalate.body', {
        captain: target.captainName,
        debt: formatMoney(target.debtAddedHalalas),
      }),
      confirmLabel: ctx.t('cashReport.escalate.confirm'),
      reason: {
        label: ctx.t('cashReport.reason.label'),
        help: ctx.t('cashReport.reason.help'),
        message: ctx.t('cashReport.reason.message'),
      },
    })
    if (reasonCode === null) return null
    const changed = await decideCashReport(target.id, 'escalate', reasonCode)
    return {
      message: ctx.t('cashReport.toast.escalated', {
        id: changed.id,
        captain: changed.captainName,
      }),
      changed: [changed],
    }
  },
}

/**
 * The cash registry. `plural: false` is implicit in `scope: 'route'` — a route
 * command is offered to the screen, and the screen hands it the row it is
 * deciding. Both toasts name one report because both questions name one
 * captain, and a set would name none.
 */
export const CASH_COMMANDS: CommandRegistry<CashReport> = [resolve, escalate]
