/**
 * The §4 work-queue contract's own strings — **AC-74**, **AC-75**, and
 * `specs/02-work-queues.md` §4.14.
 *
 * **Q-52 states the gap this file closes.** The five wave-2 surfaces carry
 * *five* `data-i18n` attributes between them in the legacy app — one per
 * sidebar label — and nothing else. Every status badge, every countdown, every
 * disposition label, every empty state, every confirmation and every toast is
 * an English literal in markup or JS.
 *
 * **Q-53 — no concatenation, no interpolated fragments.** Three legacy strings
 * cannot be translated cleanly and become single keys with named placeholders
 * here: `'🔒 ' + claimedBy` (`:9958`) is `queue.owner.heldBy`;
 * `'⚠ past ' + Math.round(tg.res/60) + 'h SLA'` (`:15654`) is retired outright
 * in favour of `sla.overdue`, which is one key with one placeholder; and
 * `'Nothing open in the queues routed to ' + me.role` (`:19290`) is
 * `myWork.empty.routed.body`.
 *
 * **Q-54 — no emoji.** These five queues are the densest emoji users in the
 * product: `✋` on every owner chip (`:18930`), `🆘 CRITICAL` (`:13429`), `⚠`,
 * `⏳`, `📤`, `🔒`, `🔁`, `⚖️`, `🚨`, `↪`, `🔗`. All go (**AC-76**).
 *
 * Rules applied (`docs/ref/copy.md`)
 *   1  sentence case everywhere; only proper nouns capitalised mid-string.
 *   2  buttons are verbs. `Cancel` is the one permitted non-verb.
 *   4  errors are imperatives naming the fix — no "please", no "invalid", no
 *      "failed", no blame (**AC-39**).
 *   6  no period on a toast, badge or menu item; banner and empty-state
 *      SENTENCES take one.
 *   9  a destructive confirmation says what will NOT change.
 *  10  end-of-list and no-data are stated in words.
 */

import type { Dictionary } from '@/lib'

export const QUEUE_SHARED_EN: Dictionary = {
  /* ── §4.2 ownership ─────────────────────────────────────────────────── */
  /* **AC-201** — `Claim` and `Open` are two separate, separately labelled
     controls. They are two keys here for the same reason. */
  'queue.claim': 'Claim',
  'queue.release': 'Release',
  'queue.takeOver': 'Take over',
  'queue.open': 'Open',
  'queue.owner.unclaimed': 'Unclaimed',
  'queue.owner.mine': 'Yours · {duration}',
  /* Q-53 — the replacement for `'🔒 ' + claimedBy`. One key, one placeholder. */
  'queue.owner.heldBy': 'Held by {name}',
  /* **AC-207** — the 30-minute expiry, stated on the queue. */
  'queue.owner.expiry': 'A claim is released after {minutes} minutes without activity.',

  /* **AC-203** — the confirmation names the current owner and states that they
     lose the item **without being asked**. Rule 9: it also says what does not
     change. */
  'queue.takeOver.title': 'Take this over from {name}?',
  'queue.takeOver.body':
    '{name} loses this item without being asked, and both names go on the record. Nothing else about the item changes.',
  'queue.takeOver.confirm': 'Take over',
  /* **AC-209** — disposing of someone else's item takes the same confirmation. */
  'queue.takeOver.decide.title': 'Decide this while {name} holds it?',
  'queue.takeOver.decide.body':
    '{name} is working this now. Deciding it takes the item from them without being asked, and both names go on the record.',
  'queue.takeOver.decide.confirm': 'Take over and decide',

  'queue.toast.claimed': 'Claimed',
  'queue.toast.released': 'Released',
  'queue.toast.takenOver': 'Taken over',

  /* ── §4.4 breach ────────────────────────────────────────────────────── */
  /* §4.4 — the third SLA reading, beside `sla.left` and `sla.overdue`. The
     deadline is behind us and the promise was **not** broken (`queueClock`'s
     `deadlinePassedUnbroken`), so nothing is counting and nothing is overdue.
     One key, one named placeholder. */
  'queue.sla.dueAt': 'Due {date}',

  'queue.showBreached': 'Show only past deadline',
  /* Q-18 — the wider audit set says so in its own label. The chip reads `Past
     deadline`, not `Breached`, because it also matches items decided late. */
  'queue.filter.breached': 'Past deadline',
  'queue.filter.breached.yes': 'Past its deadline',
  'queue.filter.breached.no': 'Inside its deadline',
  /* Q-18 / **AC-222** — the decision badge records lateness. No row marker. */
  'queue.decided.late': 'Late',

  /* ── §4.5 disposition ───────────────────────────────────────────────── */
  'queue.decided.by': '{actor} · {date}',
  'queue.decided.bySystem': 'Automatic · {date}',
  'queue.confirm.cancel': 'Cancel',
  'queue.action.noPermission':
    'You cannot claim or dispose of work in this queue. Ask an Owner for the permission this queue needs.',
  'queue.error.retry': 'Try again',

  /* ── §4.11 states ───────────────────────────────────────────────────── */
  'queue.col.owner': 'Owner',
  'queue.col.sla': 'Deadline',
  'queue.col.status': 'Status',
  'queue.col.decision': 'Decision',
  'queue.col.id': 'ID',
  'queue.col.opened': 'Opened',
  'queue.col.severity': 'Severity',
  'queue.col.reason': 'Reason',
  'queue.col.queue': 'Queue',
  'queue.col.subject': 'Subject',
  'queue.col.captain': 'Captain',
  'queue.col.rider': 'Rider',
  'queue.col.route': 'Route',
  'queue.col.plan': 'Plan',
  'queue.col.type': 'Type',
  'queue.col.actions': 'Actions',

  /* §8's metadata line (V4) — one key per noun, singular and plural chosen by
     the caller. */
  'queue.meta.items.one': '1 item',
  'queue.meta.items.other': '{count} items',
}
