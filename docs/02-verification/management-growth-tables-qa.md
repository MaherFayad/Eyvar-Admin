# Growth tables — QA verdict

**Spec:** `docs/05-restructure/specs/management-growth-tables.md` ·
**Design:** `docs/05-restructure/design/management-growth-tables.md` ·
**Branch:** `worktree-agent-a6a2cad54aa2805a3`, based on `integration/mgmt-ops` (954df5b) ·
**Suites:** `src/screens/metrics/growth/growth.test.tsx` **33 passed, 0 failed** ·
`src/data/clients/growth.test.ts` **15 passed, 0 failed** ·
`src/screens` **1016 passed, 0 failed** ·
`src/data src/i18n src/screens/metrics src/shell src/components` **2295 passed, 3 failed —
all three pre-existing**, confirmed by re-running them against a stashed working tree
(`auth.test.ts` AC-617 and AC-630; `seam.test.ts` on `zones.test.tsx`'s fixture import).

**Browser evidence:** `node scripts/harness/growth.mjs` against `vite preview` on 4365,
five views × two languages at 1280 × 800. Captures in `scripts/harness/shots/`
(`growth-*-{en,ar}-1280-t71i.png`, plus a table-anchored second shot per list view).

## Criteria

| # | Criterion | Result | Test |
|---|---|---|---|
| AC-G01 | bare route renders the board and no table | PASS | `AC-G01: renders the board and no table when no view is asked for` |
| AC-G02 | five tabs, `Board` first and selected | PASS | `AC-G02: renders five view tabs with Board selected by default` |
| AC-G03 | a list tab renders its table under the board | PASS | `AC-G03: selecting a list tab renders that table beneath the board` |
| AC-G04 | a reloaded `?view=` lands on that table | PASS | `AC-G04: a reloaded ?view= lands on that table with its tab selected` |
| AC-G05 | an unrecognised `?view=` falls back to the board | PASS | `AC-G05: an unrecognised ?view= falls back to the board, not an error` |
| AC-G06 | promos list code, burn, new subs, return, status | PASS | `AC-G06: lists every campaign with its code, burn, new subs, return and status` |
| AC-G07 | an exhausted campaign reads `Budget spent` at 100 % | PASS | `AC-G07: a campaign whose budget is consumed reads Budget spent at 100 %` |
| AC-G08 | sorting by return reorders the rows | PASS | `AC-G08: sorting by return orders the rows by that column` |
| AC-G09 | filtering to `Active` narrows the list and chips the filter | PASS | `AC-G09: filtering to Active leaves only active campaigns, and the chip says so` |
| AC-G10 | `Pause` moves a campaign and keeps it on the list | PASS | `AC-G10: Pause moves an active campaign to Paused and keeps it on the list` |
| AC-G11 | `Resume` moves it back | PASS | `AC-G11: Resume moves a paused campaign back to Active` |
| AC-G12 | an over campaign offers neither act | PASS | `AC-G12: an exhausted campaign offers neither Pause nor Resume` |
| AC-G13 | a role without `manage_plans` sees the act disabled with its reason | PASS | `AC-G13: a role without manage_plans sees Pause disabled, not hidden` |
| AC-G14 | D21: a mixed selection refuses whole and names the count | PASS | `AC-G14: a mixed selection refuses the whole bulk pause and names the count` |
| AC-G15 | AC-961: the eligible subset updates the bar before the command runs | PASS | `AC-G15: taking the eligible subset updates the bar before the command can run` |
| AC-G16 | a promo row opens a sheet with target, per-rider limit, expiry, spend | PASS | `AC-G16: clicking a row opens a sheet naming the campaign and its target` |
| AC-G17 | referrals list both riders and both bonuses | PASS | `AC-G17: lists each referral with both riders and both bonuses` |
| AC-G18 | a shared-device pair carries the signal as a word | PASS | `AC-G18: a shared-device pair carries the signal as a word` |
| AC-G19 | both riders are links; no row action | PASS | `AC-G19: both riders are links and the list offers no row action` |
| AC-G20 | incentives list condition, earned count, total paid | PASS | `AC-G20: lists each rule with its condition, earned count and total paid` |
| AC-G21 | a commission cut reads from-to; money reads as money | PASS | `AC-G21: a commission cut reads as a from-to pair and money reads as money` |
| AC-G22 | `Deactivate` and `Activate` move a rule and keep it listed | PASS | `AC-G22: Deactivate pauses a rule and Activate brings it back` |
| AC-G23 | messages list newest first with segment, channel, audience | PASS | `AC-G23: lists each send newest first with its segment, channel and audience` |
| AC-G24 | a message row opens a sheet with the full text | PASS | `AC-G24: clicking a row opens a sheet with the full message text` |
| AC-G25 | the messages list offers no act | PASS | `AC-G25: the messages list offers no act` |
| AC-G26 | every view offers CSV export | PASS (control only, see gaps) | `AC-G26: the view offers a CSV export control` |
| AC-G27 | pagination states the range and the total | PASS | `AC-G27: the pagination row states the range and the total` |
| AC-G28 | filtered-to-zero is one sentence, never the illustration | PASS | two tests, promos and messages |
| AC-G29 | a failed read renders the table error and recovers | PASS | `AC-G29: a failed read renders the table error and recovers on Try again` |
| AC-G30 | Arabic everywhere; no raw enum in a cell | PASS | two tests: dictionary parity, and the promos table rendered in Arabic |
| AC-G31 | no nav badge | PASS | `AC-G31: the Growth sub-tab raises no nav badge` |

## Browser measurements — `growth.mjs`, label `t71i`

| View | Lang | page overflow-X | table overflow-X | columns off the measure | row pitch | strip top | table top | clipped identity cells |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| board | en / ar | 0 / 0 | — | — | — | 507 / 511 | — | — |
| promos | en / ar | 0 / 0 | 0 / 0 | 0 / 0 | 53 / 61 | 515 / 519 | 605 / 617 | 3 / 1 of 10 |
| referrals | en / ar | 0 / 0 | 0 / 0 | 0 / 0 | 40 / 44 | 515 / 519 | 605 / 617 | 0 / 1 of 7 |
| incentives | en / ar | 0 / 0 | 0 / 0 | 0 / 0 | 53 / 61 | 515 / 519 | 605 / 617 | 0 / 0 of 4 |
| messages | en / ar | 0 / 0 | 0 / 0 | 0 / 0 | 40 / 44 | 515 / 519 | 605 / 617 | 8 / 8 of 8 |

**Overflow is 0 on every page and every table, in both languages, and no column falls
outside the measure.** The Arabic run mirrors and the campaign codes stay LTR inside their
`<bdi>`.

The clipping that remains is deliberate and named:

| View · column | Clipped | Why it is not a defect |
|---|---:|---|
| promos · `Code` | 3 en / 1 ar of 10 | `SUMMERLONGWEEKEND` is a fixture written to be longer than any real code, and two rows clip the `Lapsed subscribers` sub-line. `Target` is a column-picker column and the sheet states it in full |
| referrals · `Referee` | 2 en / 2 ar of 7 | Both cells are links to the rider's profile; the referrer, which is the identity, clips once in Arabic on the 46-character name the fixtures carry for exactly this test |
| incentives · `Reward` | 1 en / 0 ar of 4 | The sheet states the reward in full |
| messages · `Message` | 8 of 8 | By design: the body is prose, the cell is one line of it, and the sheet holds the whole message (AC-G24) |
| messages · `Segment`, `Sent by` | 4 / 2 en | `Subscriptions with no backup` is the longest label in the set; the sheet names the segment in full |

Each of these was measured against a wider setting first: `Status` at 98 clipped
`Budget spent`, `Signal` at 108 clipped `Shared device`, `Referee` at 140 clipped five names
of seven, and `Segment` at 168 clipped four sends of eight. All four were widened and
re-measured; the table above is the final state.

## Layout

| Question | Before | After |
|---|---:|---:|
| Where the view strip sits on an 800px viewport | y = **1663** | y = **507** |
| Where the table starts on `?view=promos` | y = **1761** | y = **605** |

The strip trailing the board's chart and chapters put the control that reaches four tables
two full scrolls below the fold. It now leads the page block, under the band.

## Defects found and fixed during the run

| Severity | What broke | Evidence | Fix |
|---|---|---|---|
| Major | Every promo row printed `This campaign is over` twice in its action lane, because both `Pause` and `Resume` declare a domain refusal and only one of them ever applies. Row pitch **77px** against 40 on the other three tables | `growth-promos-en-1280-table-t71.png` | Domain refusals render as a disabled control with **no** sentence; the row's badge already says `Budget spent` / `Expired`. Only the permission refusal keeps a sentence. Pitch 77 → 53 |
| Minor | `Discount` wrapped its header (`Discoun`/`t`) at 80px; `Expires` clipped an Arabic month at 96px | same capture, and the Arabic one | Discount 100, Expires 112, row lane 176 → 152 |
| Minor | On incentives, a `Condition` column of its own truncated every rule and left `Reward` 128px, clipping `Commission 20% to 17%` | `growth-incentives-en-1280-table-t71d.png` | The condition moved under the identity, the way a promo's target sits under its code; it stays a sortable, filterable `defaultHidden` column. Reward 184 |
| Major | The view strip sat at y = 1663 and the table at y = 1761 on an 800px viewport, because the slot trailed the board's chart and chapters. Two full scrolls to reach the control the whole task exists to add | measured with Playwright, recorded above | The slot moved to the top of the page block (`MetricBoardScreen`'s prop renamed `below` to `views`). Strip y = 507, table y = 605 |
| Minor | Four columns clipped their own longest value: `Status` (`Budget spent`), `Signal` (`Shared device`), `Referee`, `Segment` | `growth.mjs` per-column clip counts | Widened and re-measured; the residual clipping is the table above |
| Minor | The harness under-reported clipping: it compared the `td`, and `truncate` sits on an inner span, so a clipped name measured as clean | the same run | `growth.mjs` now walks the cell's descendants, skips chrome columns with no header, and reports clipping per column |

All three were fixed and re-measured; the table above is the post-fix run.

## Coverage gaps

| What | Why not tested |
|---|---|
| The CSV file's contents (AC-G26) | jsdom cannot observe a download and the harness runs headless with no download path. The test asserts the control is present and enabled; the columns and order are `DataTable`'s, covered by `components/table/csv.ts`'s own tests |
| Keyboard: `Esc` closes the sheet, focus returns to the row | `Sheet` is Radix and its focus contract is covered by `components/qa.states.test.tsx`; nothing on this screen overrides it |
| Dark surface | Not in this task's evidence list; the screen introduces no colour of its own |

## Pre-existing failures, not caused by this work

Verified by stashing the whole change set and re-running the two files:

| Test | Result on a clean `integration/mgmt-ops` |
|---|---|
| `seam.test.ts` › keeps every fixture import inside src/data | FAILS — `src\screens\management\zones\zones.test.tsx: from '@/data/fixtures/metrics'` |
| `auth.test.ts` › AC-617 RECORDED GAP: two of the six roles have no track | FAILS — expected `['Dispatcher','Trust & Safety']`, got `[]` |
| `auth.test.ts` › sends no step to the operator's OWN landing route | FAILS — `Cannot read properties of undefined (reading 'path')` |

## Observations for other owners

- **Two em dashes render on `/management/growth` in both languages**, and they are the
  board's, not the tables'. Both sit in a `MetricTile` value for a metric with no computable
  number, which is `states.md`'s sanctioned *"we measure it; today there is nothing"*
  treatment. `/management/performance` prints one from the same place. Recorded, not
  changed: the metric tile is another owner's.
- **The promos and incentives tables have two row pitches**, 40 for a row with no second
  line and 53 for one carrying `Nearly spent` or a long identity. That is the same shape
  `CorporateScreen` ships for `Invoice overdue`, so it is the product's existing answer
  rather than a new deviation, but a table engineer may want one rule for both.
