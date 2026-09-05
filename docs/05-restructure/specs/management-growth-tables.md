# Growth tables — promos, referrals, incentives, bulk messages

**Module:** `docs/01-modules/11a-promos-and-growth.md` · **Pages:** `p-growth` ·
**Pattern:** `docs/ref/patterns.md` → Index table (§3.1–3.3) beneath Metric tiles (§3.7),
the shape `R4-6` gave Market & Zones and named *"the same shape `management-growth`
already carries"* (`design/07-rulings-r4.md:793`)
**Task:** `MANAGEMENT-OPERATIONS-PLAN.md` T7.1, under decision **O3** (*"Yes, as four P1
tables behind `?view=` on the Growth sub-tab, with the board above them"*)
**Status:** ready to build

## Problem

`routeTable.ts:220` declares `patterns: ['P5', 'P1']` for `management-growth` and only the
`P5` half exists. The board states `Promo return 1.3x`, `Budget consumed 42 %` and
`Referral and incentive spend SAR 95.00`
(`fixtures/metrics.ts:1255`, `:1294`, `:1450`) and offers no way to see which campaign
earned the return, which referral was paid, which incentive is still live, or what was
last sent to a segment. Every one of those four lists existed in the legacy page
(`eyvar_ops_panel_v40_fixed.html:1264-1297`) and none has a surface in the rebuild. X6
records it as *"declared content with no surface"*; §3.1 records the operator-visible half:
*"the board says `2 of 4 campaigns are active` and offers no way to see them"*.

## Scope

In:

1. Four `?view=` index tables under the Growth board: `promos`, `referrals`,
   `incentives`, `messages`.
2. A `growth` client seam with four list reads, one facet read per list, and two writes
   (`pausePromo` / `resumePromo`, `setIncentiveActive`).
3. Sort, search, column filters, the column picker, CSV export and paging on all four,
   through `DataTable` and `useIndexTable` — the furniture is the table's, not the
   screen's (`docs/ref/patterns.md`, *"Table controls are not per-pattern"*).
4. Row detail as a sheet on `promos`, `incentives` and `messages`.
5. D21 bulk semantics on the one bulk act the spec grants: `Pause` on `promos`.
6. Arabic for every string, and a keyed label for every enum the data layer carries (X2).

Out:

- **Creating a promo campaign.** §8 slot 4c withholds a page-level action from a board
  (`MetricBoardScreen.tsx:57`) and R3 allows one primary per screen; the board keeps it,
  and it keeps it by spending it on nothing. Legacy's `+ New promo campaign`
  (`:1267`) returns when the Growth board is no longer the page's headline.
- **Awarding an incentive bonus.** `commitAwardIncentive` (`:13702`) writes a wallet-
  adjacent bonus and gates on `process_payouts`, which is a Financials key; a money write
  does not belong on a Management board's sub-view.
- **Adding or removing an incentive rule.** Rule authoring is a settings surface, not an
  index one.
- **Sending a bulk message.** `sendBulkMsg` (`:13750`) *sends nothing* (§18.1 item 6) and
  the composer it needs is `design/11-conversation-composer.md`'s, not a table's. The
  `messages` view is the **send log** and is read-only.
- **Editing referral bonus rates.** `saveReferralConfig` (`:3897`) gates on
  `manage_settings` and belongs to Admin › Workspace settings.
- **Retention cohorts and CSAT/NPS.** Legacy cards 5 and 6, both hardcoded
  (§16 items 12–15). They are board content, not table content, and `05-metrics-content.md`
  already owns them.
- Nav badge. A roster has no backlog; `navCounts.ts:155` already seeds
  `{ subTabId: 'management-growth', count: null }` and stays that way (**O8**).

## Data

### `GrowthPromo` — `promos`

| Field | Type | Source | Derived? | Notes |
|---|---|---|---|---|
| `code` | string | `DB.promos[].code` (`:13496`) | no | The identity. Uppercase, monospace. |
| `discountPercent` | number | `.discountPct` | no | 1–100. |
| `budgetHalalas` | number | `.budget` × 100 | no | SAR in legacy; halalas on the wire (money is integer minor units everywhere). |
| `spentHalalas` | number | `.spent` × 100 | no | **Server-computed.** Legacy never increments it (§18.1 item 2) — recorded, not reproduced. |
| `burnPercent` | number | `spent ÷ budget` (`:13510`) | **yes** | Server-computed so the list and the board's `promoBudgetConsumed` tile cannot disagree. |
| `uses` | number | `.uses` | no | Redemptions. |
| `newSubscriptions` | number | `.newSubs` | no | Feeds `management.growth.subscriptionsFromPromos`. |
| `roi` | number | `promoROI(p)` (`:13501`) | **yes** | `newSubs × plan price ÷ spent`. Server-computed for the same reason as `burnPercent`. |
| `targetSegment` | `'new-riders' \| 'all-riders' \| 'lapsed-subscribers' \| 'monthly-plan' \| 'zone'` | `.target` | no | **Keyed, not a sentence.** Legacy stores the English label (`:13540`); X2 forbids it reaching an Arabic cell. |
| `perUserLimit` | number | `.perUserLimit` | no | Sheet only. |
| `expiresOn` | IsoDate | `.expires` | no | |
| `status` | `'active' \| 'paused' \| 'exhausted' \| 'expired'` | `.status` | no | |
| `createdAt` | IsoDateTime | — | no | New. Legacy has array order only (`:13509`); a list you can sort needs a date. |

### `GrowthReferral` — `referrals`

| Field | Type | Source | Derived? | Notes |
|---|---|---|---|---|
| `id` | string | `DB.referralLog[].id` (`:13888`) | no | `REF-…`. |
| `referrerId` / `referrerName` | string | `.referrerId`, `nm2()` | no | Links to the rider's profile. |
| `refereeId` / `refereeName` | string | `.refereeId`, `nm2()` | no | Links to the rider's profile. |
| `referrerBonusHalalas` | number | `.referrerBonus` × 100 | no | |
| `refereeBonusHalalas` | number | `.refereeBonus` × 100 | no | |
| `totalBonusHalalas` | number | sum of the two | **yes** | The figure `contributionMargin()` subtracts (`:15726`). |
| `creditedAt` | IsoDateTime | `.date` | no | Legacy stores `'18 Jul 09:30'`, a display string; the wire carries an instant. |
| `sharedDeviceFlag` | boolean | `refFlags` (`:5610`) | **yes** | Referrer and referee share `lastIp` or `device`. Server-computed: the screen cannot see either field. |

### `GrowthIncentive` — `incentives`

| Field | Type | Source | Derived? | Notes |
|---|---|---|---|---|
| `id` | string | `DB.incentives[].id` (`:13565`) | no | `INV-…`. |
| `name` | string | `.name` | no | The identity. Operator-authored, so a string and not a key. |
| `ruleKind` | `'perfect-package' \| 'rating-streak' \| 'gold-tier' \| 'backup-readiness'` | `.rule` | no | **Keyed.** The four seeded rules map one to one; a fifth is a new key, which is the point. |
| `reward` | `{ kind: 'per-package' \| 'flat' \| 'weekly-retainer' \| 'commission-cut'; amountHalalas: number \| null; fromPercent: number \| null; toPercent: number \| null }` | `.reward` | no | Legacy stores `'+40 SAR per package'` and `'Commission 20% → 17%'` as prose (§16 item 9). Structured here so a number is right-aligned and a sentence is translated. |
| `active` | boolean | `.active` | no | |
| `earnedCount` | number | `incentiveEarnedCount()` (`:13662`) | **yes** | Captains paid under this rule. |
| `totalPaidHalalas` | number | `incentiveTotalPaid()` (`:13663`) | **yes** | |
| `createdAt` | IsoDateTime | — | no | New, for the same reason as `GrowthPromo.createdAt`. |

### `GrowthBulkMessage` — `messages`

Legacy holds no send log: `sendBulkMsg` writes one audit row
(`logAction('bulk_message','segment',seg.id,'Bulk <channel> to "<label>" (<count> recipients)')`,
`:13755`) and nothing else. **This resource is that audit row made first-class**, which is
what makes a table of it honest — every field below is a field legacy already writes.

| Field | Type | Source | Derived? | Notes |
|---|---|---|---|---|
| `id` | string | new | no | `MSG-…`. |
| `body` | string | `#bm-txt` (`:13746`) | no | Operator-authored. The identity cell, truncated to one line. |
| `segment` | `'drivers-in-zone' \| 'packages-expiring' \| 'exposed-subscriptions' \| 'documents-expiring' \| 'active-subscribers'` | `MSG_SEGMENTS` (`:13734`) | no | **Keyed.** The five ids are legacy's `seg1`–`seg5` renamed to say what they are. |
| `channel` | `'push' \| 'sms' \| 'in-app'` | `#bm-ch` (`:13745`) | no | Keyed. |
| `recipientCount` | number | `seg.count` | no | **Hardcoded in legacy** (§16 item 11) and recorded as such; on the wire it is what the send actually reached. |
| `sentAt` | IsoDateTime | `logAction` timestamp | no | |
| `sentById` / `sentByName` | string | the audit row's actor | no | Who sent it. |

## States

| State | Trigger | What the operator sees |
|---|---|---|
| **Content** | The list read resolved with rows | The board, the four-tab row, and the table |
| **Empty (first-run)** | Zero records ever on this view | R8's illustrated state, a heading naming what the view is for, and no action — every act that would create a record is out of scope above |
| **Empty (no-match)** | Search or filters returned nothing | One grey sentence with `Clear filters` |
| **Loading** | Read in flight | `DataTable`'s `P1` skeleton. The board above keeps rendering — the two reads are independent |
| **Error** | The list read failed | The table's own error row with `Try again`. The board is unaffected, and vice versa |
| **Board-only** | `?view=` absent or unrecognised | The board alone, with the tab row beneath it, `Board` selected, and no table |
| **Promo paused** | `status === 'paused'` | `Paused` badge, warning tone, `Resume` in the row's action lane |
| **Promo exhausted** | `status === 'exhausted'` | `Budget spent` badge and no act. Its burn cell reads 100 % |
| **Promo expired** | `expiresOn` is past, `status === 'expired'` | `Expired` badge, neutral tone, no act |
| **Referral flagged** | `sharedDeviceFlag` | `Shared device` in the flag column, warning tone. **No red badge** (R5a) and no act: suspending the referee is Risk & Signals' (T7.2, **O4**) |
| **Incentive inactive** | `active === false` | `Paused` badge and `Activate` in the lane |
| **Refused by role** | The operator lacks `manage_plans` | The act renders **disabled in place** with its reason (§11.2), never hidden |
| **Bulk partly refused** | A selection mixes eligible and ineligible rows | D21: the command is refused for the whole selection, the refusal names the count, and the bar offers `Select only the N eligible` |

## Acceptance criteria

**AC-G01.** `/management/growth` with no `?view=` renders the Growth board and no table.

**AC-G02.** Five view tabs — `Board`, `Promos`, `Referrals`, `Incentives`, `Messages` —
render beneath the board in every view, and each is a `tab` with an accessible selected
state. `Board` is first and is the one selected when no `?view=` is set.

**AC-G03.** Selecting one of the four list tabs puts `?view=<id>` in the address and
renders that view's table beneath the board; the board stays on screen. Selecting `Board`
returns to the board-only state.

**AC-G04.** Reloading `/management/growth?view=incentives` lands on the incentives table
with the `Incentives` tab selected.

**AC-G05.** An unrecognised `?view=` value renders the board-only state, not an error and
not an empty table.

**AC-G06.** The promos table lists every campaign with its code, discount, budget burn,
uses, new subscriptions, return and status.

**AC-G07.** A promo whose budget is fully consumed reads `Budget spent` and its burn cell
reads 100 %.

**AC-G08.** Sorting the promos table by return orders the rows by `roi` and the header
announces the direction.

**AC-G09.** Filtering the promos table to `Active` leaves only campaigns whose status is
active, and the filter chip states the field and the value.

**AC-G10.** `Pause` on an active campaign moves it to `Paused`, keeps it on the list, and
raises a toast naming the campaign's code.

**AC-G11.** `Resume` on a paused campaign moves it back to `Active`.

**AC-G12.** An exhausted or expired campaign offers neither `Pause` nor `Resume`.

**AC-G13.** An operator without `manage_plans` sees `Pause` disabled with a reason, not
hidden.

**AC-G14.** Selecting two active campaigns and one exhausted one and choosing bulk `Pause`
refuses the whole command, names the one campaign that cannot be paused, and offers
`Select only the 2 eligible`. Nothing is paused (D21: no partial apply).

**AC-G15.** Taking that offer changes the selection to the two eligible campaigns and the
bar's count reads 2 before the command can run (**AC-961**).

**AC-G16.** Clicking a promo row opens a sheet naming the campaign and stating its target
segment, per-user limit, expiry and spend against budget.

**AC-G17.** The referrals table lists each credited referral with both riders, both
bonuses and the date it was credited.

**AC-G18.** A referral whose two riders share a device or an IP reads `Shared device` in
its flag column, in the warning tone and as a word, never as colour alone.

**AC-G19.** The referrer and referee cells are links to those riders' profiles, and the
referrals table offers no row action.

**AC-G20.** The incentives table lists each rule with its condition, its reward, the count
of captains who earned it and the total paid.

**AC-G21.** A reward that is a commission cut reads as a from-to pair of percentages, and
a reward that is money reads as money in the operator's language.

**AC-G22.** `Deactivate` on an active incentive moves it to `Paused` and keeps it on the
list; `Activate` moves it back.

**AC-G23.** The messages table lists each send with its text, segment, channel, recipient
count, time and sender, newest first.

**AC-G24.** Clicking a message row opens a sheet with the full message text, not the
truncated cell.

**AC-G25.** The messages table offers no act: a send cannot be unsent.

**AC-G26.** `Export CSV` on any of the four views downloads the rows currently in view,
with the same columns and the same order.

**AC-G27.** Each of the four views paginates, and the pagination row states the range and
the total.

**AC-G28.** Each view's first-run empty state names what the view is for, and its
filtered-to-zero state is one sentence with `Clear filters` — never the illustration.

**AC-G29.** Each view's failed read renders the table's error with `Try again`, and the
board above it keeps its numbers.

**AC-G30.** In Arabic every column header, badge, tab label, filter option, empty state and
toast is Arabic, the table mirrors, and no cell renders a raw enum value.

**AC-G31.** Nothing on the Growth sub-tab raises a nav badge.

## Permissions

| Who | Sees | Acts |
|---|---|---|
| `view_analytics` | The board and all four tables | nothing |
| `manage_plans` | as above | `Pause` / `Resume` a campaign, `Activate` / `Deactivate` an incentive |

Both keys are the route table's own for this row (`routeTable.ts:225-226`), which already
carries the D17 deviation granting Finance `manage_plans` here. Legacy gates `Pause` on the
page key `growth.pause_promo` (`:13529`) and the incentive toggle on **nothing at all**
(`:13674`) — that second one is a defect, recorded below, and this spec closes it by
putting the toggle behind the same key as everything else that commits money to captains.

A refusal renders in place and states its reason (§11.2). A permission refusal outranks a
domain one (**AC-962**): an operator who may not pause anything is told that, not that one
of their three campaigns is exhausted.

## Open questions

| # | Question | Who answers | What is blocked |
|---|---|---|---|
| G-1 | `promoROI` divides by a hardcoded `86.50` SAR plan price (`:13503`) that duplicates `PLANS.weekly.eco` instead of reading it. Should the wire carry `roi`, or the plan price beside the operands? | product-owner + api-contract-steward | Nothing in this build — `roi` is server-computed either way. It blocks the backend contract |
| G-2 | Legacy claims a campaign auto-pauses at 100 % burn and no code does it (§18.1 item 3). Is auto-pause coming? | owner | Nothing here. If it lands, `exhausted` stops being reachable only from seed data |
| G-3 | `recipientCount` on a send is legacy's hardcoded segment count (§16 item 11). Is the real figure resolvable at send time? | backend | Nothing here; the column states what the send reached and the fixtures say so |

None of the three blocks the build.

## Legacy behaviour observed

| Behaviour | Evidence | Carry across? |
|---|---|---|
| Promo list is unsorted, unsearchable, unfilterable, with a 400px inner scroll | `:1271`, `:13509` | **No.** A list you query is a P1 table (O5's reasoning, applied here) |
| Promo list has no empty state — `map().join('')` yields a bare `<tbody>` | `:13508` | **No.** Four states, R8's two kinds of empty |
| ROI cell is coloured green below/above 1.0 with no word | `:13521` | **No.** §7.5: colour is never the only carrier. The number carries itself |
| Budget burn is a bar with a green/amber/red fill | `:13517` | **Partly.** The percentage is the value; the bar is a `Progress` beneath it, and its colour is a second carrier rather than the only one |
| `Pause` is gated and confirmed; `Resume` is neither (asymmetric) | `:13529`, `:13530`, `GATE_SWEEP.pausePromo` `:20877` | **Yes, and the asymmetry is right.** Pausing refuses riders at the till; resuming restores a state the operator chose |
| The incentive active toggle has **no permission check and no audit entry** | `:13674` | **No — this is a defect.** Recorded in §18.3's spirit and closed here: the act takes `manage_plans` |
| Referral log has no sort, no paging, five columns and a `colspan` empty row | `:3894` | **No.** Same reasoning as the promo list |
| Referral KPI delta reads `this session` over a seeded log | `:3884`, §16 item 8 | **No.** Not carried: the board's tiles already state the window |
| The self-abuse flag lives on the Fraud page, not beside the referral | `:5610` | **The flag comes across; the act does not.** O4 keeps suspend on the pre-filtered list Risk & Signals links to |
| Incentive `reward` and `rule` are English prose in the data | `:13565` | **No.** X2: both are keyed enums with numeric operands |
| `sendBulkMsg` writes an audit row and sends nothing | `:13750`, §18.1 item 6 | **The audit row comes across as the resource.** The composer does not |
| Segment recipient counts are hardcoded and `142` contradicts the live subscription count | `:13734`, §16 item 11 | **Recorded, not reproduced.** `recipientCount` is per-send and is what the send reached |
| The fraud-guard footer under the promo table is prose asserting backend behaviour | `:13527` | **No.** A sentence that describes something the product does not do is not a caption |
