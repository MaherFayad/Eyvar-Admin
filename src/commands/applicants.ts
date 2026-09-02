/**
 * Every command that acts on a **captain application** —
 * `design/05-command-centre.md` §2, phase **C-5**.
 *
 * ## Why this domain
 *
 * Onboarding is the queue with the SLA on it. `Approve` and `Reject` are the
 * two decisions the whole of Operations › People › Applications exists to
 * produce, and today they are two `<Button size="xs">`s inside a 176px table
 * cell — the narrowest, most easily missed target in the console, and the one
 * an operator presses hundreds of times a day. It is the strongest case in the
 * product for a keyboard path.
 *
 * ## D8's warning, answered here rather than per screen
 *
 * > *"a one-click approve is a one-click irreversible act."*
 *
 * `ApplicationsView` calls `approveApplicant` straight from `onClick` with no
 * confirmation at all — the applicant is approved, a `DRV-*` record is minted
 * (`clients/applicants.ts:282`), and there is no way back through this console.
 * **This registry confirms it**, and the reasoning is D18's own worked
 * counter-example, quoted in `captains.ts`:
 *
 * > *"Compare `Approve application`, which fails (b) because the applicant is
 * > notified, and which therefore confirms and offers no undo."*
 *
 * Both decisions therefore confirm, and neither carries an undo handle. That is
 * a **behaviour change against the screen for `Approve`**, it is deliberate,
 * and it is recorded in the handoff for product-designer — a command reached by
 * keyboard, from a palette, over a pre-seeded selection the operator may not be
 * looking at, is the last place a one-key irreversible act belongs.
 *
 * `Reject` already confirmed and already collected a reason (`askReject`), so
 * its shape is ported unchanged.
 *
 * ## §11.2 at render, not at commit — the real fix in this file
 *
 * `approveApplicant` throws **422 `documents_unverified`** when any document is
 * not verified (`clients/applicants.ts:265`). The screen does not check: the
 * operator presses `Approve`, waits, and gets a row error. That is gating at
 * commit, which is the systemic legacy defect (`:10237`) §11.2 exists to
 * replace. `unavailable` restates the client's own contract — it is not a
 * second policy — so the control is disabled **before** the press, with the
 * sentence naming the fix.
 *
 * ## What is deliberately NOT here: claim, release and take over
 *
 * The queue's ownership verbs are the obvious third, fourth and fifth commands
 * and none of them can be declared correctly yet.
 *
 * `OwnerChip` decides between them with `held.ownerId === currentUserId`, and
 * **`CommandSession` carries one boolean and no operator identity**
 * (`session.ts`). Without it:
 *
 *   - `Release` could not tell *my* claim from someone else's, and
 *     `releaseApplicant` has no server-side owner check
 *     (`clients/applicants.ts:243` returns the row untouched if there is no
 *     claim and releases unconditionally if there is) — so the command would
 *     let an operator drop a colleague's claim from a keyboard shortcut. That
 *     is not a refusal I can write; it is a write I must not offer.
 *   - `Claim` would name the holder correctly but read
 *     `Sarah Al-Rashid is holding this application` to Sarah.
 *
 * The fix is one field on `CommandSession` and one argument on
 * `commandSession()`, which would change its two call sites —
 * `shell/GlobalSearch.tsx:186` and `screens/operations/people/PeopleScreen.tsx:110`,
 * both owned by other agents. **Raised in the handoff as one decision covering
 * every queue** (applications, tickets, requests, safety, fairness, cash,
 * conversations, assurance all share these three verbs), because taking it
 * five times is how five queues end up with four answers.
 *
 * ## CQ-7
 *
 * `unavailable` reads `status` and `docs` and nothing else. The role half goes
 * through `roleRefusal`, naming `approve_drivers` — which is the permission
 * `PeopleScreen.tsx:105` already computes `canWrite` from, and the one
 * `COMMAND_WRITE_PERMISSION` stands for, so this domain is the one where the
 * single-boolean stand-in is exactly right.
 */

import { CheckIcon, XIcon } from 'lucide-react'
import { approveApplicant, rejectApplicant } from '@/data/clients'
import type { Applicant } from '@/data/types'
import { formatCount } from '@/lib'
import { blockedBy } from './refusal'
import { roleRefusal, type Command, type CommandContext, type CommandRegistry } from './registry'

/** The permission `canWrite` stands for. Recorded, not evaluated — **Q4**. */
const WRITE_PERMISSION = 'approve_drivers'

/* ─────────────────────────── refusal predicates ─────────────────────────── */

/**
 * A decided application has nothing left to decide. The same three statuses
 * `ApplicationsView.isDecided` uses, restated here so the two surfaces cannot
 * drift — and `withdrawn` is in the list because the applicant left, which is
 * not a decision this console gets to overturn.
 */
function isDecided(row: Applicant): boolean {
  return row.status === 'approved' || row.status === 'rejected' || row.status === 'withdrawn'
}

const decided = (ctx: CommandContext<Applicant>, prefix: string): string | null =>
  blockedBy(ctx, isDecided, prefix)

/**
 * **§11.2 at render, restating `approveApplicant`'s own 422.**
 *
 * The one-target sentence is an **imperative that names the fix** (§5.7 rule 4)
 * rather than a count: `1 documents still to verify` is what a count-carrying
 * key produces at one, `Translate` has no plural selector (`Translator` does,
 * and `CommandContext` deliberately narrows to `Translate`), and *"verify every
 * document first"* is the more useful sentence anyway — the number is on the
 * `Docs` column and the file is one click away. Over a set the count is what
 * matters, because there the next action is to deselect.
 */
const unverifiedDocs = (ctx: CommandContext<Applicant>): string | null =>
  blockedBy(
    ctx,
    (row) => row.docs.some((doc) => doc.status !== 'verified'),
    'people.action.approve.blocked',
  )

/* ──────────────────────────────── commands ──────────────────────────────── */

/**
 * §5.3 — the question names the verb and the count, the body says what will
 * **not** change and what will not come back, and the primary repeats the verb.
 *
 * `arity: 'needs-target'` and not `'needs-input'`: `approveApplicant` takes no
 * reason and inventing a field the client discards is how a form grows a
 * question nobody reads.
 */
const approve: Command<Applicant> = {
  id: 'applicant.approve',
  titleKey: 'people.queue.approve',
  section: 'do',
  keywords: [
    'approve',
    'accept',
    'onboard',
    'activate',
    'pass',
    'sign off',
    /* Legacy labels, verbatim: `Approve application`
       (`eyvar_ops_panel_v40_fixed.html:7156`) and the audit verb
       `approve_driver` (`:2903`). `pendingDrivers` is the legacy page id. */
    'approve application',
    'approve driver',
    'pending drivers',
    'applications',
    'موافقة',
    'قبول',
    'اعتماد',
    'طلب',
    'تفعيل',
  ],
  icon: CheckIcon,
  /* D8 — the paired decision shape a work queue needs. Not `destructive`:
     R5a spends red on the unrecoverable, and the approve half of an
     approve/reject pair is never the red one. */
  affordance: 'decision-affirm',
  /* `plural: true` — approving a screened batch is a real operator action and
     the confirmation states the count, which is what makes it safe. */
  scope: { kind: 'entity', entityType: 'applicant', plural: true },
  arity: 'needs-target',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'people.action.noPermission') ??
    decided(ctx, 'people.action.approve.decided') ??
    unverifiedDocs(ctx),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const confirmed = await ctx.host.confirm({
      title:
        count === 1
          ? ctx.t('people.confirm.approve.title.one', { name: first?.name ?? '' })
          : ctx.t('people.confirm.approve.title.other', {
              count: formatCount(count, ctx.language),
            }),
      body: ctx.t('people.confirm.approve.body'),
      confirmLabel:
        count === 1
          ? ctx.t('people.confirm.approve.confirm')
          : ctx.t('people.confirm.approve.confirm.other'),
    })
    if (confirmed === null) return null

    const changed = await Promise.all(ctx.targets.map((row) => approveApplicant(row.id)))
    return {
      message:
        count === 1
          ? ctx.t('people.toast.approved')
          : ctx.t('people.toast.approved.other', { count: formatCount(count, ctx.language) }),
      changed,
      /* **No undo — D18's clause (b).** The applicant is told, and a `DRV-*`
         record is minted. Something left the console, so the confirmation is
         the whole safety net and there is deliberately no second one. */
    }
  },
}

/**
 * The other half. `arity: 'needs-input'` because the reason is not optional:
 * the applicant is shown it, `rejectApplicant` throws 422 on an empty one
 * (`clients/applicants.ts:306`), and a rejection with no stated reason is not
 * appealable.
 */
const reject: Command<Applicant> = {
  id: 'applicant.reject',
  titleKey: 'people.queue.reject',
  section: 'do',
  keywords: [
    'reject',
    'decline',
    'refuse',
    'turn down',
    'fail',
    /* Legacy labels (`:7156`, `:2903`). */
    'reject application',
    'reject driver',
    'applications',
    'رفض',
    'استبعاد',
    'عدم قبول',
    'طلب',
  ],
  icon: XIcon,
  affordance: 'decision-reject',
  scope: { kind: 'entity', entityType: 'applicant', plural: true },
  arity: 'needs-input',
  unavailable: (ctx) =>
    roleRefusal(ctx, WRITE_PERMISSION, 'people.action.noPermission') ??
    decided(ctx, 'people.action.reject.decided'),
  async run(ctx) {
    const count = ctx.targets.length
    const first = ctx.targets[0]
    const reason = await ctx.host.confirm({
      /* The screen's own key, unchanged — `Reject {name}?` — with a counted
         sibling for the set the screen never had to state. */
      title:
        count === 1
          ? ctx.t('people.reject.title', { name: first?.name ?? '' })
          : ctx.t('people.reject.title.other', { count: formatCount(count, ctx.language) }),
      body: ctx.t('people.reject.body'),
      confirmLabel:
        count === 1 ? ctx.t('people.reject.confirm') : ctx.t('people.reject.confirm.other'),
      reason: {
        label: ctx.t('people.reject.reason'),
        help: ctx.t('people.reject.reasonHelp'),
        message: ctx.t('people.reject.reasonHelp'),
      },
    })
    if (reason === null) return null

    const changed = await Promise.all(ctx.targets.map((row) => rejectApplicant(row.id, reason)))
    return {
      message:
        count === 1
          ? ctx.t('people.toast.rejected')
          : ctx.t('people.toast.rejected.other', { count: formatCount(count, ctx.language) }),
      changed,
      /* **No undo.** The rejection reason is sent to the applicant, and
         `reconsiderApplicant` — the legacy console's way back (`:10915`) — has
         no client function in this data layer. Clause (a) of D18 fails as well
         as clause (b). */
    }
  },
}

/**
 * The application registry, in the order the decision cell renders them —
 * affirm first, then reject, which is `ApplicationsView`'s own order and a
 * design decision recorded there rather than re-sorted here.
 *
 * **No `Open application` command.** Its destination is the route
 * `/operations/people/applications/:id`, and `CommandHost` has no `navigate`
 * until `shell.ts` lands (`registry.ts`). ⌘K's `Find` verb already resolves an
 * `APP-*` id to the applicant's 360° layer (§5, `clients/profile.ts:240`), so
 * nothing is unreachable in the meantime.
 */
export const APPLICANT_COMMANDS: CommandRegistry<Applicant> = [approve, reject]
