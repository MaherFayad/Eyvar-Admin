/**
 * Every command that moves a **rider's wallet balance** — D9, F6, **Q-P7**
 * (*"dispatch and wallets first"*).
 *
 * Ported from `WalletsScreen`'s `openAdjust` (`:411`), including the part that
 * is easy to drop: the **authority envelope is read before the question is
 * asked**, not after the amount is typed. AC-384 — the ceiling bounds the field
 * and the refusal names the cap and the role it was applied from; the amount is
 * never silently trimmed, because `:15412`'s own comment says a quietly reduced
 * credit is worse than a clear refusal.
 *
 * **AC-385 / D-F21.** The envelope applies whatever the reason. Legacy checks
 * it only when the reason label contains the literal string `'Goodwill'`
 * (`eyvar_ops_panel_v40_fixed.html:3985`), so `Manual top-up` moved any amount
 * with no ceiling at all. Both commands below read the same envelope from the
 * same client, so there is no reason code that routes around it.
 *
 * ## Neither offers an undo, and that is D18 refusing
 *
 * §3.4d: **an adjustment is not a correction.** `adjustWallet` has no field in
 * which to name another posting (AC-388, enforced by construction), so there is
 * no inverse operation to declare — and money moved, which fails D18's second
 * clause on its own. The confirmation is the whole net.
 *
 * ## What is not here
 *
 * **Freeze / unfreeze wallet.** There is no such operation anywhere in
 * `clients/wallets.ts`; a wallet is frozen by suspending the rider, which is a
 * different record and a different command. Reported rather than invented.
 *
 * ## CQ-7
 *
 * `unavailable` reads the wallet row and nothing else. The role half goes
 * through `roleRefusal` naming `adjust_wallets`; the *authority ceiling* is a
 * separate question, server-computed, and it is asked inside `run` because a
 * ceiling the browser evaluates is a ceiling the browser can be asked not to
 * evaluate.
 */

import { GiftIcon, WalletIcon } from 'lucide-react'
import { adjustWallet, checkAdjustmentAuthority } from '@/data/clients'
import type { WalletSummary } from '@/data/types'
import { formatMoney } from '@/lib'
import { roleRefusal, type Command, type CommandRegistry } from './registry'

/** The permission `WalletsScreen` gates its adjustment on — **Q4**. */
const WRITE_PERMISSION = 'adjust_wallets'

/**
 * The reason code a goodwill credit posts under. Legacy's wallet reason list
 * calls it *Goodwill / apology credit* (`:3972`); the console's own code is the
 * one `expense.goodwill` already reconciles.
 */
const GOODWILL_REASON = 'goodwill'

/** What the amount field opens on, in halalas. 25.00 SAR — the smallest credit that is not a gesture. */
const DEFAULT_CREDIT_HALALAS = 2_500

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * A credit with the operator's own reason code. `WalletsScreen`'s adjustment,
 * verbatim: `direction: 'credit'`, the typed reason carried through as
 * `reasonCode` (`WalletsScreen.tsx:443`).
 *
 * `plural: false`. The envelope is **per rider and per operator per day**, so a
 * set would need one ceiling per row and one refusal per ceiling — and a single
 * confirmation cannot state twelve of them.
 */
const adjust: Command<WalletSummary> = {
  id: 'wallet.adjust',
  titleKey: 'wallet.action.adjust',
  compactTitleKey: 'wallet.bulk.adjust',
  section: 'do',
  keywords: [
    'adjust',
    'adjust balance',
    'wallet',
    'credit',
    'top up',
    'refund to wallet',
    /* The legacy reason an operator would have picked for this (`:3972`) and
       the legacy page id the route table resolves. */
    'manual top-up',
    'wallets',
    'تعديل',
    'رصيد المحفظة',
    'إضافة رصيد',
    'محفظة',
  ],
  icon: WalletIcon,
  scope: { kind: 'entity', entityType: 'rider', plural: false },
  affordance: 'default',
  arity: 'needs-input',
  unavailable: (ctx) => roleRefusal(ctx, WRITE_PERMISSION, 'wallet.action.noPermission'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null

    /* **AC-385** — read BEFORE the dialog opens, and for every reason code.
       CQ-4: the client is reached from inside `run`. */
    const envelope = await checkAdjustmentAuthority(target.riderId, 0, GOODWILL_REASON)
    let amountHalalas = Math.min(DEFAULT_CREDIT_HALALAS, envelope.perCaseCapHalalas)

    const reasonCode = await ctx.host.confirm({
      title: ctx.t('wallet.adjust.title', { rider: target.riderName }),
      /* §5.7 rule 9 — what will not change: the balance moves, nothing is
         charged and no refund document is minted (§3.4). */
      body: ctx.t('wallet.adjust.body', {
        role: envelope.appliedRole,
        cap: formatMoney(envelope.perCaseCapHalalas),
      }),
      confirmLabel: ctx.t('wallet.adjust.confirm'),
      amount: {
        label: ctx.t('wallet.adjust.amount.label'),
        help: ctx.t('wallet.adjust.amount.help', { cap: formatMoney(envelope.perCaseCapHalalas) }),
        /* **AC-384** — the refusal names the cap in SAR and the role it was
           applied from. Never a trimmed amount. */
        message: ctx.t('wallet.adjust.amount.message', {
          role: envelope.appliedRole,
          cap: formatMoney(envelope.perCaseCapHalalas),
        }),
        maxHalalas: envelope.perCaseCapHalalas,
        initialHalalas: amountHalalas,
        onChange: (value) => {
          amountHalalas = value
        },
      },
      reason: {
        label: ctx.t('wallet.adjust.reason.label'),
        help: ctx.t('wallet.adjust.reason.help'),
        message: ctx.t('wallet.adjust.reason.message'),
      },
    })
    if (reasonCode === null) return null

    const { posting } = await adjustWallet({
      riderId: target.riderId,
      amountHalalas,
      direction: 'credit',
      reasonCode,
    })
    return {
      /* R9 — names the rider and the figure the SERVER posted, never the one
         the field held. **AC-386**: a posting above the second-approval
         threshold lands `pending`, and the toast says which of the two it is
         rather than claiming money moved. */
      message: ctx.t(
        posting.settlement === 'settled' ? 'wallet.toast.adjusted' : 'wallet.toast.pending',
        { rider: target.riderName, amount: formatMoney(posting.amountHalalas) },
      ),
      /* No `changed`: the balance is the ledger's last settled posting and
         `adjustWallet` returns the posting, not the row. A wallet recomputed
         here would be the drift §6.6 exists to prevent. */
    }
  },
}

/**
 * The apology credit, with the reason code fixed. Legacy's *Goodwill / apology
 * credit* (`:3972`) — the one reason whose ceiling legacy actually enforced,
 * and the one whose ceiling this command shares with every other (AC-385).
 *
 * Declared beside `wallet.adjust` rather than folded into it because the
 * operator is doing a different thing: `adjust` asks *under what code*, this
 * one asks *how much, and what happened*. The free-text note is the second, and
 * it is the sentence the goodwill ledger shows (`:1804`).
 */
const goodwill: Command<WalletSummary> = {
  id: 'wallet.goodwill',
  titleKey: 'wallet.action.goodwill',
  compactTitleKey: 'wallet.bulk.goodwill',
  section: 'do',
  keywords: [
    'goodwill',
    'apology',
    'compensate',
    'make good',
    'gesture',
    /* Legacy's own reason label, verbatim (`:3972`), and its ledger heading
       (`:1804`). */
    'goodwill apology credit',
    'goodwill ledger',
    'wallets',
    'تعويض',
    'اعتذار',
    'رصيد تعويضي',
    'محفظة',
  ],
  icon: GiftIcon,
  scope: { kind: 'entity', entityType: 'rider', plural: false },
  affordance: 'default',
  arity: 'needs-input',
  unavailable: (ctx) => roleRefusal(ctx, WRITE_PERMISSION, 'wallet.action.noPermission'),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null

    const envelope = await checkAdjustmentAuthority(
      target.riderId,
      0,
      GOODWILL_REASON,
    )
    let amountHalalas = Math.min(DEFAULT_CREDIT_HALALAS, envelope.perCaseCapHalalas)

    const note = await ctx.host.confirm({
      title: ctx.t('wallet.goodwill.title', { rider: target.riderName }),
      body: ctx.t('wallet.goodwill.body', {
        role: envelope.appliedRole,
        cap: formatMoney(envelope.perCaseCapHalalas),
      }),
      confirmLabel: ctx.t('wallet.goodwill.confirm'),
      amount: {
        label: ctx.t('wallet.goodwill.amount.label'),
        help: ctx.t('wallet.adjust.amount.help', { cap: formatMoney(envelope.perCaseCapHalalas) }),
        message: ctx.t('wallet.adjust.amount.message', {
          role: envelope.appliedRole,
          cap: formatMoney(envelope.perCaseCapHalalas),
        }),
        maxHalalas: envelope.perCaseCapHalalas,
        initialHalalas: amountHalalas,
        onChange: (value) => {
          amountHalalas = value
        },
      },
      reason: {
        label: ctx.t('wallet.goodwill.reason.label'),
        help: ctx.t('wallet.goodwill.reason.help'),
        message: ctx.t('wallet.goodwill.reason.message'),
      },
    })
    if (note === null) return null

    const { posting } = await adjustWallet({
      riderId: target.riderId,
      amountHalalas,
      direction: 'credit',
      reasonCode: GOODWILL_REASON,
      note,
    })
    return {
      message: ctx.t(
        posting.settlement === 'settled' ? 'wallet.toast.goodwill' : 'wallet.toast.pending',
        { rider: target.riderName, amount: formatMoney(posting.amountHalalas) },
      ),
    }
  },
}

/**
 * The wallet registry. Two commands, both credits, both bounded by the same
 * server-computed envelope.
 *
 * **No debit.** `adjustWallet` takes a direction and `WalletsScreen` only ever
 * sends `credit`; taking money out of a rider's wallet from a command palette
 * is a product decision nobody has made. Raised, not assumed.
 */
export const WALLET_COMMANDS: CommandRegistry<WalletSummary> = [adjust, goodwill]
