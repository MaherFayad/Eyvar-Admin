/**
 * Notifications — legacy `DB.notifications` (`eyvar_ops_panel_v40_fixed.html:2773`–`:2780`),
 * the six seeded rows, extended to reach every state §4.3.2 and §8.3 name.
 *
 * N1–N6 are verbatim (ids, types, titles, bodies, read flags). Times become ISO
 * against the fixed clock. N7–N10 are added because the seeded six do not reach
 * `critical`, do not include a long Arabic title, and do not include the
 * `route: null` case that §4.3.2 says is the *most common* runtime type.
 *
 * **N11 is the report builder's fired threshold alert** (`06-report-builder.md`
 * §4.4 item 4). It is the one `alert`-type row with a real route.
 */

import { offsetFromNow } from '../mock/clock'
import { ALR_1_ROUTE } from './reports'
import type { Notification } from '../types/notifications'

export const notificationFixtures: Notification[] = [
  {
    id: 'N1',
    type: 'alert',
    /* `alert` + no SOS/suspend/breach keyword → `high` under legacy `notifPriority` (`:2189`). */
    priority: 'high',
    title: 'No-show · TRP-9003',
    body: 'Bandar Al-Harbi · ride auto-cancelled',
    createdAt: '2026-06-25T07:55:00+03:00',
    read: false,
    /* The defect §4.3.2 names: `alert` has no destination in `handleNotifClick`
       (`:2273`), so the most frequent notification does nothing when clicked.
       Modelled honestly as `null` so the design has to decide what that row
       looks like, rather than pretending every row is a link. */
    route: null,
    entityId: 'TRP-9003',
    entityType: 'trip',
  },
  {
    id: 'N2',
    type: 'ticket',
    priority: 'medium',
    title: 'New support ticket TKT-503',
    body: 'Billing complaint from Bandar Al-Harbi',
    createdAt: '2026-06-25T08:02:00+03:00',
    read: false,
    route: '/support/tickets/TKT-503',
    entityId: 'TKT-503',
    entityType: 'ticket',
  },
  {
    id: 'N3',
    type: 'renewal',
    priority: 'medium',
    title: 'Subscription expiring · Sara Al-Ghamdi',
    body: 'SUB ends tomorrow, renewal likelihood 25%',
    createdAt: '2026-06-25T08:05:00+03:00',
    read: false,
    route: '/operations/subscriptions?view=expiring-7d',
    entityId: 'SUB-1075',
    entityType: 'subscription',
  },
  {
    id: 'N4',
    type: 'approval',
    priority: 'medium',
    title: 'New driver application',
    body: 'Mona Al-Tamimi submitted documents',
    createdAt: '2026-06-25T09:00:00+03:00',
    read: true,
    route: '/operations/people/applications/APP-2202',
    entityId: 'APP-2202',
    entityType: 'application',
  },
  {
    id: 'N5',
    type: 'payout',
    /* Money movement — always `high` (`:2192`). */
    priority: 'high',
    title: 'Payout batch pending',
    body: '6,420 SAR awaiting processing for 3 drivers',
    createdAt: offsetFromNow({ days: -1, hours: -2 }),
    read: true,
    route: '/financials/payouts',
    entityId: null,
    entityType: null,
  },
  {
    id: 'N6',
    type: 'complaint',
    priority: 'high',
    title: 'Driver complaint filed',
    body: 'CMP-330 against Ahmed Salem',
    createdAt: offsetFromNow({ days: -2 }),
    read: true,
    route: '/support/disputes',
    entityId: 'CMP-330',
    entityType: 'complaint',
  },

  /* ── added: states the seeded six cannot reach ───────────────────────── */
  {
    id: 'N7',
    type: 'alert',
    /* `alert` + `sos` keyword → `critical` (`:2190`). Nothing in the seed data
       produces one, so the top priority tier renders empty on a fresh load and
       the tier heading has never been seen with a row under it. */
    priority: 'critical',
    title: 'SOS on TRP-7742 · rider triggered the panic button',
    body: 'Al Malaz → Riyadh Park · captain Khalid Mansour · 8 minutes late',
    createdAt: offsetFromNow({ minutes: -6 }),
    read: false,
    route: '/support/safety?view=critical-sos',
    entityId: 'TRP-7742',
    entityType: 'trip',
  },
  {
    id: 'N8',
    type: 'warning',
    priority: 'high',
    /* A long Arabic title. The panel is a fixed-width popover; this is the row
       that finds out whether it truncates, wraps, or breaks the layout in RTL. */
    title: 'انتهاء صلاحية رخصة القيادة · عبد الرحمن بن محمد آل عبد الله القحطاني',
    body: 'تنتهي الصلاحية خلال ٣ أيام · يجب تعليق الحساب إذا لم يتم التجديد',
    createdAt: offsetFromNow({ hours: -5 }),
    read: false,
    route: '/operations/people?view=compliance',
    entityId: 'DRV-0102',
    entityType: 'driver',
  },
  {
    id: 'N9',
    type: 'error',
    /* Every `error` is `critical` (`:2188`). */
    priority: 'critical',
    title: 'Payment gateway timeout · 14 charges unconfirmed',
    body: null,
    createdAt: offsetFromNow({ hours: -1, minutes: -12 }),
    read: false,
    /* Routes to a Financials surface a Support agent cannot open. §11.2: the row
       renders **without** its navigation affordance rather than being hidden —
       the operator should know the event happened. */
    route: '/financials/ledger',
    entityId: null,
    entityType: null,
  },
  {
    id: 'N10',
    type: 'info',
    priority: 'low',
    title: 'Daily snapshot complete',
    body: 'SNAP-0030 · 10 riders · 7 captains · 6 active subscriptions',
    createdAt: offsetFromNow({ days: -1, hours: -9 }),
    read: true,
    route: '/admin/data',
    entityId: 'SNAP-0030',
    entityType: null,
  },
  {
    /* ── the report builder's threshold alert, `ALR-1` ───────────────────
       `06-report-builder.md` §4.4 item 4: one seeded already-fired alert with
       one seeded `Notification` pointing at it, *"otherwise the entire
       delivered state of §12 is unreachable without a scheduler."*

       Three things this row settles, each argued in the spec rather than
       assumed here:

       **It is the first `alert` notification in this product with a real
       destination.** §4.3.2 records that `alert` is the most-produced runtime
       type and has none (`handleNotifClick`, `:2273`); every other `alert` seed
       carries `route: null` honestly. This one routes to the report that fired,
       at the window and grain the rule evaluated, through §9.2's URL
       serialisation — so the operator lands on the picture of the thing rather
       than on a list (§12.5, AC-883).

       **`priority: 'high'`, not `'critical'`.** §12.5: `critical` is reserved
       for a rule an operator explicitly marked as such while holding a
       permission that does not exist yet (Q-RB-9). It is **not** derived from
       how far past the threshold the value went — *that is a magnitude, not an
       urgency*.

       **No red, and no nav badge.** §12.7 checks a firing threshold against
       R5a's four permitted uses of red and it is none of them; §12.6 keeps
       `management-reports` at `hasBacklog: false` so `navCounts.test.ts`'s
       two-`attention` cap stays assertable. This row changes no count and no
       tone anywhere (AC-884, AC-885). */
    id: 'N11',
    type: 'alert',
    priority: 'high',
    title: 'Cancellation rate over 6% · 24 Jun',
    body: 'Daily cancellation rate reached 7%, over the 6% threshold on “Cancellation rate over 6%”.',
    createdAt: offsetFromNow({ hours: -2 }),
    read: false,
    route: ALR_1_ROUTE,
    entityId: 'ALR-1',
    entityType: 'alert-rule',
  },
  {
    /**
     * **`success` — the tenth `NotificationType`, and the first row to reach
     * it.** `notifIcon` covers ten types (`:2171`) and nine had a seed;
     * `success` had none, so the `success` filter matched nothing, its icon had
     * never rendered, and §8.3's four-tone notification list was three-tone in
     * practice.
     *
     * It is the only *good news* row in the set — every other notification is a
     * problem — which matters for the list's visual rhythm: a panel where every
     * row is a warning teaches an operator to stop reading it.
     *
     * **`read: true`, deliberately.** The unread count drives a badge that
     * `clients/notifications.ts` summarises and other fixtures reason about; a
     * new unread row would move a number this fixture does not own.
     * `notificationFixturesAllRead` still reaches the all-read state, and the
     * unread population is unchanged.
     */
    id: 'N12',
    type: 'success',
    priority: 'low',
    title: 'Payout run completed · 24 Jun',
    body: '38 captains paid, 902.40 SAR released. One payout reversed (PO-0007).',
    createdAt: offsetFromNow({ days: -1, hours: -3 }),
    read: true,
    /* The payouts sub-tab, at the period the run covered. */
    route: '/financials/payouts',
    entityId: 'PO-0007',
    entityType: 'payout',
  },
]

/** The `notif-unread-zero` state (§8.3): **no badge, not a `0`**. Reached without hand-editing. */
export const notificationFixturesAllRead: Notification[] = notificationFixtures.map((n) => ({
  ...n,
  read: true,
}))
