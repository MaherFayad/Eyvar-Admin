/**
 * Every command that acts on a **safety incident** — D9, F6.
 *
 * ## Why these are `scope: 'route'` and hidden from the palette
 *
 * A safety incident has **no `ProfileEntityType`** (`types/profile.ts`), so
 * `search()` cannot rank one, `resolveProfile` cannot open one, and
 * `TARGET_SOURCES` has nowhere to put it. `scope.kind === 'entity'` cannot name
 * a type that does not exist, so these are declared against the sub-tab they
 * belong to and every one carries `hiddenFromPalette` with that sentence
 * (**CM-4**).
 *
 * They are still worth declaring, and C-1's own note says why: *"C-1 is worth
 * doing whether or not the palette is ever built"*. `SafetyScreen` declares
 * `Close incident` inline in a row action and again in the record sheet, and
 * the two carry different predicates. This is one declaration for both.
 *
 * **Reported to mock-data-engineer:** `incident` needs an entry in
 * `PROFILE_ENTITY_TYPES`, in `resolveLocally` and in `searchEntities` before
 * ⌘K can reach any of this.
 *
 * ## `Close` restates the 422 at render, which is the whole point
 *
 * `closeSafetyIncident` refuses while any protocol step is outstanding, and
 * legacy already disabled the button for it — with the reason in a `title`
 * attribute (`eyvar_ops_panel_v40_fixed.html:13437`). §5.7 confines a tooltip
 * to *naming* a control, so the sentence moves into `unavailable` and renders
 * as real text on a second line, and it **names how many steps are left**.
 */

import { HandIcon, ShieldOffIcon } from 'lucide-react'
import { ApproveIcon } from '@/components/icons'
import {
  claimSafetyIncident,
  closeSafetyIncident,
  precautionarilySuspend,
} from '@/data/clients'
import type { SafetyIncident } from '@/data/types'
import { formatCount } from '@/lib'
import { blockedBy, blockedSentence } from './refusal'
import { roleRefusal, type Command, type CommandContext, type CommandRegistry } from './registry'

/** The permission `SafetyScreen` computes `canWrite` from — **Q4**. */
const WRITE_PERMISSION = 'handle_safety'

/**
 * The sentence CM-4 requires of every id here. One string, because the reason
 * is one fact about the data layer rather than one per command.
 */
const NO_PROFILE_ENTITY =
  'A safety incident has no ProfileEntityType, so the palette has no way to find one as a target.'

function isClosed(incident: SafetyIncident): boolean {
  return incident.status === 'closed'
}

function outstandingSteps(incident: SafetyIncident): number {
  return incident.protocol.filter((step) => !step.done).length
}

/**
 * §11.2 — `closeSafetyIncident`'s 422 restated at RENDER, naming the count.
 * Two reasons refuse and they lead somewhere different: a closed incident is
 * finished, an incomplete one has work left and the operator can do it.
 */
function closeRefusal(ctx: CommandContext<SafetyIncident>): string | null {
  const only = ctx.targets.length === 1 ? ctx.targets[0] : undefined
  if (only !== undefined) {
    if (isClosed(only)) return ctx.t('incident.action.close.blocked.closed')
    const left = outstandingSteps(only)
    return left === 0
      ? null
      : ctx.t('incident.action.close.blocked.protocol', {
          count: formatCount(left, ctx.language),
        })
  }
  const blocked = ctx.targets.filter(
    (incident) => isClosed(incident) || outstandingSteps(incident) > 0,
  ).length
  return blockedSentence(ctx, blocked, 'incident.action.close.blocked')
}

/* ──────────────────────────────── commands ──────────────────────────────── */

/** Answer the phone. Claiming an incident stamps the first response (`clients/safety.ts:283`). */
const claim: Command<SafetyIncident> = {
  id: 'incident.claim',
  titleKey: 'incident.action.claim',
  section: 'do',
  keywords: [
    'claim incident',
    'respond',
    'take incident',
    'first response',
    'safety',
    'incidents',
    'استلام البلاغ',
    'الاستجابة',
    'سلامة',
    'حادث',
  ],
  icon: HandIcon,
  scope: { kind: 'route', subTabId: 'support-safety' },
  affordance: 'default',
  arity: 'needs-target',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'incident.action.noPermission') ??
    blockedBy(ctx, isClosed, 'incident.action.claim.blocked'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const changed = await Promise.all(ctx.targets.map((row) => claimSafetyIncident(row.id)))
    return {
      message:
        count === 1
          ? ctx.t('incident.toast.claimed', { id: first?.id ?? '' })
          : ctx.t('incident.toast.claimed.other', { count: formatCount(count, ctx.language) }),
      changed,
    }
  },
}

/**
 * Take the captain off dispatch while the incident is investigated. Legacy ties
 * this to the `act` protocol step and hides the control when the incident names
 * nobody (`:13444`); an API has to answer instead, so the 422 is restated at
 * render.
 *
 * **`default`, not red.** A precautionary suspension is lifted by reinstating
 * the captain — the same call `captain.reinstate` makes — so it is not the
 * unrecoverable act R5a spends red on. No undo handle: that inverse is a
 * command in `captains.ts`, not in this registry, and D18's clause (a) means
 * what it says.
 */
const suspend: Command<SafetyIncident> = {
  id: 'incident.suspend',
  titleKey: 'incident.action.suspend',
  compactTitleKey: 'incident.bulk.suspend',
  section: 'do',
  keywords: [
    'precautionary suspension',
    'suspend captain',
    'take off dispatch',
    'escalate',
    'ground',
    'safety',
    'incidents',
    'إيقاف احترازي',
    'تعليق الكابتن',
    'تصعيد',
    'سلامة',
  ],
  icon: ShieldOffIcon,
  scope: { kind: 'route', subTabId: 'support-safety' },
  affordance: 'default',
  arity: 'needs-input',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'incident.action.noPermission') ??
    blockedBy(
      ctx,
      (incident) => isClosed(incident) || incident.againstId === null,
      'incident.action.suspend.blocked',
    ),
  async run(ctx) {
    const target = ctx.targets[0]
    if (target === undefined) return null
    const reason = await ctx.host.confirm({
      title: ctx.t('incident.suspend.title', {
        captain: target.againstName ?? target.againstId ?? '',
      }),
      /* §5.7 rule 9 — the body says what does NOT happen: the account stays,
         the trips stay, and nothing about the incident is decided by this. */
      body: ctx.t('incident.suspend.body'),
      confirmLabel: ctx.t('incident.suspend.confirm'),
      reason: {
        label: ctx.t('incident.suspend.reason.label'),
        help: ctx.t('incident.suspend.reason.help'),
        message: ctx.t('incident.suspend.reason.message'),
      },
    })
    if (reason === null) return null
    const changed = await precautionarilySuspend(target.id, reason)
    return {
      message: ctx.t('incident.toast.suspended', {
        captain: changed.againstName ?? changed.againstId ?? '',
      }),
      changed: [changed],
    }
  },
}

/**
 * Finalise the record. Legacy `Close incident` (`:13437`), whose confirmation
 * says *"reopen it manually if new information comes in later"* (`:13480`) —
 * a sentence with no command behind it, because nothing reopens an incident.
 * That is why this is red: from this console it does not come back.
 */
const close: Command<SafetyIncident> = {
  id: 'incident.close',
  titleKey: 'incident.action.close',
  compactTitleKey: 'incident.bulk.close',
  section: 'do',
  keywords: [
    'close incident',
    'finalise',
    'finish',
    'done',
    'wrap up',
    /* Legacy's own button, verbatim (`:13437`). */
    'close',
    'safety',
    'incidents',
    'إغلاق البلاغ',
    'إنهاء',
    'سلامة',
    'حادث',
  ],
  icon: ApproveIcon,
  scope: { kind: 'route', subTabId: 'support-safety' },
  /* **R5a.** Nothing in the product reopens a closed incident; legacy's own
     confirmation admits as much by telling the operator to do it by hand. */
  affordance: 'destructive',
  arity: 'needs-target',
  hiddenFromPalette: NO_PROFILE_ENTITY,
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'incident.action.noPermission') ?? closeRefusal(ctx),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    if (first === undefined) return null
    const confirmed = await ctx.host.confirm({
      title:
        count === 1
          ? ctx.t('incident.close.title', { id: first.id })
          : ctx.t('incident.close.title.other', { count: formatCount(count, ctx.language) }),
      body: ctx.t('incident.close.body'),
      confirmLabel: ctx.t('incident.close.confirm'),
    })
    if (confirmed === null) return null
    const changed = await Promise.all(ctx.targets.map((row) => closeSafetyIncident(row.id)))
    return {
      message:
        count === 1
          ? ctx.t('incident.toast.closed', { id: first.id })
          : ctx.t('incident.toast.closed.other', { count: formatCount(count, ctx.language) }),
      changed,
    }
  },
}

export const SAFETY_COMMANDS: CommandRegistry<SafetyIncident> = [claim, suspend, close]
