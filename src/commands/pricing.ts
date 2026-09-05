/**
 * Publishing and retiring a **subscription plan** — D9, F6.
 *
 * `plan` is a `ProfileEntityType` and `searchEntities` indexes plans by both
 * names — `nameEn` and `nameAr` are carried as `alsoKnownAs` at NAME weight
 * (`clients/profile.ts:478`) — so an operator typing either finds the plan and
 * the command together.
 *
 * ## Why `savePlan` and not a `publishPlan`
 *
 * There is no publish operation. `PlanStatus` is `draft | active | archived`
 * and `SavePlanInput` carries `status` (*"Read by the save handler —
 * `savePlan()` today reads it from nothing"*, §8.6), so publishing is a save
 * that changes one field and re-sends the catalogue half unchanged.
 * `catalogueOf` below is what "unchanged" means, written once so the two
 * commands cannot send different subsets — the **pricing half is not in
 * `SavePlanInput` at all**, which is how the Stage-A boundary is enforced at
 * the seam rather than by a `disabled` attribute (Q7).
 *
 * ## Both carry an undo, and both earn it
 *
 * D18's three clauses hold: the inverse is a declared command in this registry
 * (each is the other's), it runs through the seam as a real, separately audited
 * `plan.save`, and **nothing leaves the console** — a plan's status changes what
 * the catalogue offers next, it sends no message and moves no money. So neither
 * confirms, and the ten-second handle is the net instead.
 */

import { ArchiveIcon, SendIcon } from 'lucide-react'
import { savePlan, type SavePlanInput } from '@/data/clients'
import type { PlanStatus, SubscriptionPlan } from '@/data/types'
import { formatCount } from '@/lib'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandRegistry } from './registry'
import { undoHandle } from './undo'

/** The permission `PricingScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'manage_pricing'

/**
 * The catalogue half of a plan, at a given status. **The pricing half is absent
 * by type**, so neither command can touch a rate while Q7 is open.
 */
function catalogueOf(plan: SubscriptionPlan, status: PlanStatus): SavePlanInput {
  return {
    nameEn: plan.nameEn,
    nameAr: plan.nameAr,
    durationDays: plan.durationDays,
    executeDays: plan.executeDays,
    cancelCap: plan.cancelCap,
    sortOrder: plan.sortOrder,
    status,
    features: plan.features,
    economyActive: plan.economyActive,
    comfortActive: plan.comfortActive,
  }
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * Put the plan in front of riders. Legacy's only word for committing a plan is
 * `Save plan` (`eyvar_ops_panel_v40_fixed.html:1127`), which is why it is a
 * keyword here: an operator who learnt the old console types that.
 */
const publish: Command<SubscriptionPlan> = {
  id: 'plan.publish',
  titleKey: 'plan.action.publish',
  compactTitleKey: 'plan.bulk.publish',
  section: 'do',
  keywords: [
    'publish plan',
    'activate plan',
    'go live',
    'make available',
    'launch plan',
    /* Legacy's own footer button (`:1127`) and the legacy page id. */
    'save plan',
    'plans',
    'نشر الخطة',
    'تفعيل الخطة',
    'إطلاق',
    'خطة',
  ],
  icon: SendIcon,
  scope: { kind: 'entity', entityType: 'plan', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'plan.action.noPermission') ??
    blockedBy(ctx, (plan) => plan.status === 'active', 'plan.action.publish.blocked'),
  async run(ctx) {
    const first = ctx.targets[0]
    if (first === undefined) return null
    /* CQ-4 — the client is reached from inside `run`, never at module scope. */
    const changed = await Promise.all(
      ctx.targets.map((plan) => savePlan(plan.id, catalogueOf(plan, 'active'))),
    )
    return {
      message:
        ctx.targets.length === 1
          ? ctx.t('plan.toast.published', { plan: first.nameEn })
          : ctx.t('plan.toast.published.other', {
              count: formatCount(ctx.targets.length, ctx.language),
            }),
      changed,
      /**
       * **D18.** The inverse restores the status the plan actually had, not a
       * fixed one: a plan published from `archived` goes back to `archived`,
       * and one published from `draft` goes back to `draft`. The handle closes
       * over the target, which is the record as it was before the write.
       */
      undo: undoHandle(ctx, {
        inverse: (plan) => savePlan(plan.id, catalogueOf(plan, plan.status)),
        copyPrefix: 'plan.toast.published',
        nameOf: (plan) => ({ plan: plan.nameEn }),
        record: (plan) => ({ entityType: 'plan', entityId: plan.id }),
      }),
    }
  },
}

/**
 * Take it out of the catalogue. **Not red**: existing subscriptions on the plan
 * are untouched — archiving stops it being offered, it does not cancel anybody
 * — and `plan.publish` above puts it straight back.
 */
const archive: Command<SubscriptionPlan> = {
  id: 'plan.archive',
  titleKey: 'plan.action.archive',
  compactTitleKey: 'plan.bulk.archive',
  section: 'do',
  keywords: [
    'archive plan',
    'retire plan',
    'unpublish',
    'withdraw plan',
    'stop offering',
    'save plan',
    'plans',
    'أرشفة الخطة',
    'سحب الخطة',
    'إيقاف العرض',
    'خطة',
  ],
  icon: ArchiveIcon,
  scope: { kind: 'entity', entityType: 'plan', plural: true },
  affordance: 'default',
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'plan.action.noPermission') ??
    blockedBy(ctx, (plan) => plan.status === 'archived', 'plan.action.archive.blocked'),
  async run(ctx) {
    const first = ctx.targets[0]
    if (first === undefined) return null
    const changed = await Promise.all(
      ctx.targets.map((plan) => savePlan(plan.id, catalogueOf(plan, 'archived'))),
    )
    return {
      message:
        ctx.targets.length === 1
          ? ctx.t('plan.toast.archived', { plan: first.nameEn })
          : ctx.t('plan.toast.archived.other', {
              count: formatCount(ctx.targets.length, ctx.language),
            }),
      changed,
      undo: undoHandle(ctx, {
        inverse: (plan) => savePlan(plan.id, catalogueOf(plan, plan.status)),
        copyPrefix: 'plan.toast.archived',
        nameOf: (plan) => ({ plan: plan.nameEn }),
        record: (plan) => ({ entityType: 'plan', entityId: plan.id }),
      }),
    }
  },
}

/**
 * The pricing registry.
 *
 * **No `Duplicate plan`.** Nothing in `clients/pricing.ts` creates one —
 * `savePlan` writes an existing `PlanKey` and there is no `createPlan`, so a
 * duplicate command would have to mint an id, which is the server's. Reported.
 *
 * **Nothing about rates.** `proposeRateCard`, `approveRateCard` and
 * `commitRateCardChange` are Stage B and do not exist in the data layer
 * (D-F10); the pricing half of a plan is not even in `SavePlanInput`.
 */
export const PLAN_COMMANDS: CommandRegistry<SubscriptionPlan> = [publish, archive]
