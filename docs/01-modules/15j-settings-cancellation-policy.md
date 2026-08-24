# Settings Tab: Cancellation Policy

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` (`div#p-settings`, L1416) | Pane `#stab-cancelpolicy` **L1825–1842** | Tab button **L1429** (`data-tab="cancelpolicy"`, icon 🚫, `data-i18n="stab.cancelpolicy"`) | Render fn `renderCancellationPolicy()` **L7362–7368** (row builder `cancelPolicyRowHtml()` **L7348–7361**) | Data `DB.cancellationPolicy` **L13936–13945**

---

## 1. Purpose

The complete matrix of cancellation scenarios and the fee attached to each — including the ones that are free by design, so nothing is implicit.

Panel copy (L1829): *"Every real cancellation scenario, listed explicitly — including the free ones, so nothing is left to guesswork. 🔒 rows are always free by design and can't be turned into a fee. **Riders never cancel a subscription themselves** — the app only lets them request a trip [postponement](→ `readiness` page). Every cancellation on this page happens through this ops panel."*

Data-model comment (L13931–13935): *"Every real cancellation scenario listed explicitly — including the no-fee ones — so nothing is left to be silently assumed. `feeAmount` in SAR for quick rides, `feePct` (% of the refund otherwise owed) for the subscription early-termination case. `enabled:false` rows are enforced as 'no fee' regardless of `feeAmount`/`feePct`."*

## 2. Layout map

Three `.card` blocks:

| Card | Lines | Contents |
|---|---|---|
| 1 — Header | L1826–1831 | icon 🚫, title "Cancellation policy", description with a link to the Trip Readiness page |
| 2 — Quick rides | L1832–1836 | `<h2>🚕 Quick rides</h2>`, table, `tbody#cancelpolicy-qr-tbody` (L1834), **"Save cancellation policy" button** (L1835) |
| 3 — Subscriptions | L1837–1841 | `<h2>📦 Subscriptions</h2>`, table, `tbody#cancelpolicy-sub-tbody` (L1839), `div.settings-meta#meta-cancelpolicy` (L1840) |

The single Save button lives at the bottom of card 2 but saves **both** tables (`saveCancellationPolicy` queries both tbodies, L7372).

Table headers differ slightly between the two cards:
- Quick rides (L1834): `Scenario` (`width:44%`) · `Fee (SAR)` · `Enabled` · *(empty)*
- Subscriptions (L1839): `Scenario` (`width:44%`) · `Fee` · `Enabled` · *(empty)*

## 3. Settings fields — every field

All fields are generated per rule by `cancelPolicyRowHtml()` (L7348–7361). There are no page-level scalar settings and no add/composer form.

| Field (per row) | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| Fee — quick-ride rows | column "Fee (SAR)" | `input[type=number] min="0" step="0.5"`, `width:80px`, `data-rule-field="feeAmount"`, followed by a `SAR` suffix span | `rule.feeAmount` (`?? 0`, L7352) | **SAR** | `min="0"`, no max, 0.5 steps | `parseFloat(feeInput.value)||0` (L7379) — blank/NaN → `0`. The HTML `min` is a browser hint only; nothing re-checks it on save | `DB.cancellationPolicy[i].feeAmount` | Charged to the rider's wallet on live-trip cancellation (§7/§10) |
| Fee — subscription rows | column "Fee" | same input, `data-rule-field="feePct"`, followed by a `%` suffix span | `rule.feePct` (`?? 0`, L7352) | **%** of the gross refund | `min="0"`, no max — **a value above 100 is accepted**, producing a negative net refund | `parseFloat(feeInput.value)||0` (L7379) | Deducted from the mid-cycle refund (§7/§10) |
| Grace period | "Grace period (minutes)" — a nested `.field` inside the Scenario cell, `max-width:160px`, `margin-top:5px` | `input[type=number] min="0" step="1"`, `width:70px`, `height:26px`, `data-rule-field="graceMin"` | `rule.graceMin` | **minutes** | `min="0"`, integers | `parseInt(graceInput.value,10)||0` (L7380) | `DB.cancellationPolicy[i].graceMin` | **Nothing** — see §9 |
| Enabled | column "Enabled" | `input[type=checkbox].tog`, `data-rule-field="enabled"` | `rule.enabled` | boolean | — | `enabledInput.checked` (L7381) | `DB.cancellationPolicy[i].enabled` | A disabled rule is treated as zero-fee at every consumption site |

**Conditional rendering:**
- The grace-period sub-field renders **only when `rule.graceMin != null`** (L7357). In the seeded data that is exactly one rule: `qr_grace_period`.
- **Locked rows render no inputs at all** (L7353–7355): the whole `<tr>` gets `style="background:var(--bg2)"`, the scenario is prefixed with `🔒`, the fee cell shows `<span class="b b-green">Always free</span>`, the Enabled cell shows a literal `—`, and the row carries **no `data-rule-id`** — so `saveCancellationPolicy()`'s selector `tr[data-rule-id]` (L7372) cannot reach it. Locked rules are structurally unwritable, not merely disabled in the UI.
- The `note` string renders as `<p class="td-sub">` under the scenario name when present (L7354, L7357).

### Per-rule record fields (`DB.cancellationPolicy` element shape)

| Field | Type | Meaning | Editable? |
|---|---|---|---|
| `id` | string | stable key for `getCancellationRule()` (L5548) and the `data-rule-id` attribute | no |
| `appliesTo` | `'quick_ride'` \| `'subscription'` | which table the row renders in (L7366–7367) and which fee field applies (L7350) | no |
| `scenario` | string | row title | no |
| `feeAmount` | number (SAR) | quick-ride fee | yes (quick-ride rows) |
| `feePct` | number (%) | subscription fee | yes (subscription rows) |
| `graceMin` | number (min) \| absent | grace window | yes (only where present) |
| `enabled` | boolean | fee active | yes (unlocked rows) |
| `locked` | `true` \| absent | always-free, uneditable | no |
| `note` | string \| absent | explanatory sub-caption | no |

## 4. Tables & lists

### Quick rides (`#cancelpolicy-qr-tbody`, L1834) — `DB.cancellationPolicy.filter(r => r.appliesTo==='quick_ride')` (L7366)
### Subscriptions (`#cancelpolicy-sub-tbody`, L1839) — `…filter(r => r.appliesTo==='subscription')` (L7367)

- **Row order**: seed-array order; no sort.
- **Row actions**: none. The fourth column is empty in every row (`<td></td>`, L7355/L7360).
- **Add flow**: **none.** There is no composer, no "+ Add scenario" button, and no code path that pushes into `DB.cancellationPolicy`. The matrix is fixed at 8 rows.
- **Edit flow**: inline; bulk-committed by the single Save button.
- **Delete flow**: **none.**
- **Empty state**: **none** on either table (L7366–7367 use bare `.map().join('')`).
- **Early return**: `renderCancellationPolicy()` bails if `#cancelpolicy-qr-tbody` is missing (L7364), so the subscription table is never rendered without the quick-ride one.

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Save cancellation policy** (L1835) | `saveCancellationPolicy()` L7369–7385 | Deep-clones the policy as `before` (L7371); iterates `#cancelpolicy-qr-tbody tr[data-rule-id], #cancelpolicy-sub-tbody tr[data-rule-id]`; per row resolves the rule via `getCancellationRule(id)` and writes fee (`feePct` if `appliesTo==='subscription'`, else `feeAmount`), `graceMin`, `enabled`; re-renders the tables and the meta line; toast `✅ Cancellation policy saved — applies to the next cancellation immediately` | `DB.cancellationPolicy[*].feeAmount \| feePct \| graceMin \| enabled` | `requirePerm('manage_settings')` L7370 | `logAction('config_updated','settings','cancellation-policy','Cancellation policy updated', before, DB.cancellationPolicy)` L7383 — full before/after snapshot | **Yes** — `GATE_SWEEP.saveCancellationPolicy` (L20786–20788): title "Save cancellation policy", `danger:true`, summary *"This is money: it decides what riders and captains are charged when a trip falls through."*, consequences `['Applies to cancellations from now on; past ones are unaffected.','Always-free rows stay free — they are locked for a reason.']`, button "Save policy" |
| **Enabled toggle** (per row) | none (plain checkbox, L7359) | DOM state only until Save | — | — | — | no |
| Postponement link (L1829) | `go('readiness',findSbEl('readiness'))` | Navigates to the Trip Readiness page | — | — | — | no |

## 6. Modals opened

**No bespoke modals.** Only the generic `confirmAction()` gate injected by `guardAction()` (L17819–17840) around `saveCancellationPolicy`, built from the `GATE_SWEEP` spec above.

Two modals *elsewhere* read this policy and display its numbers — `cancelLiveTrip()` (L11805–11822) and `cancelSub()` (L5530–5546) — documented in §10.

## 7. Rules / policy logic — written out exactly

### 7.1 Fee formulas, verbatim

**Quick ride** — `confirmCancelLiveTrip()`, L11831–11833:
```js
var ruleId = reason==='rider_request' ? 'qr_after_grace'
           : reason==='rider_noshow'  ? 'qr_rider_noshow'
           : null;
var rule = ruleId ? getCancellationRule(ruleId) : null;
var fee  = (rule && rule.enabled) ? rule.feeAmount : 0;
```
Charging, L11836–11844:
```js
if(fee>0 && trip.rider){
  var charged = debitRiderWallet(trip.rider, fee, 'Cancellation fee — '+id);
  if(!charged){
    logAction('wallet_debit','rider',trip.rider,
      'Cancellation fee of '+fee.toFixed(2)+' SAR for '+id+' — insufficient wallet balance, added to next trip charge',{},{});
    feeNote=' · '+fee.toFixed(2)+' SAR fee added to next trip (insufficient wallet balance)';
  } else {
    feeNote=' · '+fee.toFixed(2)+' SAR fee charged to wallet';
  }
}
```
So the quick-ride fee is a **flat SAR amount**, debited from the rider wallet; if the wallet cannot cover it the debit is *not* retried or queued anywhere — only a log line and a toast claim it will be "added to next trip".

**Subscription** — `cancelSub()`, L5521–5530:
```js
var doneParts     = (sub.trips||'0/0').split('/');
var used          = parseInt(doneParts[0],10)||0;
var total         = parseInt(doneParts[1],10)||1;
var paidNum       = parseFloat(sub.paid)||0;
var unusedFraction= Math.max(0,(total-used)/total);
var grossRefund   = Math.round(paidNum*unusedFraction*100)/100;
var midCycleRule  = getCancellationRule('sub_mid_cycle');
var feeApplies    = used>0 && midCycleRule && midCycleRule.enabled && grossRefund>0;
var fee           = feeApplies ? Math.round(grossRefund*(midCycleRule.feePct/100)*100)/100 : 0;
var refund        = Math.round((grossRefund-fee)*100)/100;
```
In words:
```
grossRefund = round2( amountPaid × max(0, (totalTrips − usedTrips) / totalTrips) )
feeApplies  = usedTrips > 0  AND  sub_mid_cycle.enabled  AND  grossRefund > 0
fee         = feeApplies ? round2( grossRefund × sub_mid_cycle.feePct / 100 ) : 0
netRefund   = round2( grossRefund − fee )
```
The fee is a **percentage of the refund that would otherwise be owed** — never of the full plan price — and the already-consumed trips are forfeited before the percentage is applied. The fee is not collected as a charge: `confirmCancelSub()` (L5549–5566) credits only `netRefund` to the wallet (L5563) and records the fee in the audit summary and toast only.

### 7.2 Rule-selection matrix — which rule fires when

| Trigger | Code | Rule consulted |
|---|---|---|
| Ops cancels a live trip, reason `rider_request` | L11831 | `qr_after_grace` |
| Ops cancels a live trip, reason `rider_noshow` | L11831 | `qr_rider_noshow` |
| Ops cancels a live trip, reason `ops_decision` | L11831 → `ruleId=null` | **none** → fee `0` |
| Ops cancels a subscription with `used>0` | L5527 | `sub_mid_cycle` |
| Ops cancels a subscription with `used===0` | L5528 (`feeApplies` false) | none → full refund |
| Ops cancels a **pending ride request** (`cancelRequest`, L11915–11926) | — | **none consulted** — no fee logic at all |

### 7.3 Locked-row rule
`if(rule.locked){ … return '<tr style="background:var(--bg2)">…🔒 …<span class="b b-green">Always free</span>…—…</tr>'; }` (L7353–7355). No `data-rule-id`, no inputs, therefore unreachable by `saveCancellationPolicy`'s selector (L7372).

### 7.4 Disabled-rule rule
Every consumption site guards with `rule.enabled`: L11833 (`(rule&&rule.enabled)?rule.feeAmount:0`), L5528 (`midCycleRule.enabled` in `feeApplies`), and the two modal hint strings L11816–11817 fall back to the literal `'No fee configured'`.

## 8. Full enumeration — the complete policy matrix (`DB.cancellationPolicy`, L13936–13945, 8 rows)

### 8a. Quick rides — 6 rows, fee in **SAR**

| # | `id` | Scenario (verbatim) | Party charged | `feeAmount` | `graceMin` | `enabled` | `locked` | Note (verbatim) |
|---|---|---|---|---|---|---|---|---|
| 1 | `qr_before_assigned` | Rider cancels before a driver is assigned (still searching) | rider | 0 | — | ❌ false | 🔒 **true** | "Always free — no driver has committed anything yet." |
| 2 | `qr_grace_period` | Rider cancels within the grace period after a driver accepts | rider | **0** | **2** | ✅ true | — | "Free for this many minutes after acceptance, to allow genuine mistakes." |
| 3 | `qr_after_grace` | Rider cancels after the grace period, before the driver arrives | rider | **5** | — | ✅ true | — | *(none)* |
| 4 | `qr_after_arrival` | Rider cancels after the driver has arrived at pickup | rider | **10** | — | ✅ true | — | *(none)* |
| 5 | `qr_driver_fault` | Driver cancels, declines, or times out | **driver / system** — rider not charged | 0 | — | ❌ false | 🔒 **true** | "Always free to the rider — this is the driver/system's issue, not theirs." |
| 6 | `qr_rider_noshow` | Rider no-show — driver waited past the timeout at pickup | rider | **10** | — | ✅ true | — | *(none)* |

### 8b. Subscriptions — 2 rows, fee in **% of the gross refund**

| # | `id` | Scenario (verbatim) | Party charged | `feePct` | `enabled` | `locked` | Note (verbatim) |
|---|---|---|---|---|---|---|---|
| 7 | `sub_before_first_trip` | Cancelled before any trip in the plan has been taken | rider | 0 | ❌ false | 🔒 **true** | "Always a full refund, no fee — nothing was delivered yet." |
| 8 | `sub_mid_cycle` | Cancelled mid-cycle — some trips already used | rider | **10** | ✅ true | — | "Applied to the unused-portion refund, on top of forfeiting the already-used trips (which were never refundable to begin with)." |

**Windows, fees and parties summarised:**

| Window | Party | Fee | Live? |
|---|---|---|---|
| Before driver assigned | rider | 0 SAR (locked) | n/a — no code path |
| 0 → 2 min after acceptance (grace) | rider | 0 SAR | **graceMin never read** |
| After grace, before arrival | rider | 5 SAR | **enforced** (reason `rider_request`) |
| After driver arrival | rider | 10 SAR | **never enforced** |
| Rider no-show at pickup | rider | 10 SAR | **enforced** (reason `rider_noshow`) |
| Driver cancels/declines/times out | none | 0 SAR (locked) | n/a |
| Subscription, 0 trips used | rider | 0% (locked) | implicit via `used>0` guard |
| Subscription, ≥1 trip used | rider | 10% of gross refund | **enforced** |

**No fee anywhere on this tab is charged to a driver.** Every `feeAmount`/`feePct` debits the rider; the driver-fault row is locked free.

## 9. Consumption check

| Setting | Read by (outside `#stab-cancelpolicy`) | Dead? |
|---|---|---|
| `qr_after_grace.feeAmount` (5) | `cancelLiveTrip()` hint L11816; `confirmCancelLiveTrip()` L11832–11833 → `debitRiderWallet` L11837 | **Live** |
| `qr_after_grace.enabled` | L11816, L11833 | **Live** |
| `qr_rider_noshow.feeAmount` (10) | `cancelLiveTrip()` hint L11817; `confirmCancelLiveTrip()` L11832–11833 | **Live** |
| `qr_rider_noshow.enabled` | L11817, L11833 | **Live** |
| `sub_mid_cycle.feePct` (10) | `cancelSub()` L5527–5529, displayed L5537 | **Live** |
| `sub_mid_cycle.enabled` | `cancelSub()` L5528, fallback copy L5537 | **Live** |
| `qr_grace_period.graceMin` (2) | **Nothing.** Grep for `graceMin` returns L7357 (render), L7377/L7380 (save), L13938 (seed) — **all inside Settings** | **DEAD.** The 2-minute free window is configurable and displayed but never applied: `confirmCancelLiveTrip` has no time-since-acceptance check and never reads `qr_grace_period` |
| `qr_grace_period.feeAmount` / `.enabled` | Settings only | **DEAD** |
| `qr_after_arrival` (10 SAR) — entire rule | **Nothing.** Grep for `qr_after_arrival` returns only L13940 (seed) | **DEAD.** The live-trip cancel modal offers three reasons (`rider_request`, `rider_noshow`, `ops_decision`, L11816–11818) and maps none of them to `qr_after_arrival`. A rider who cancels after the driver has arrived is charged the 5 SAR `qr_after_grace` fee, not the configured 10 SAR |
| `qr_before_assigned` — entire rule | **Nothing** (grep: L13937 only). `cancelRequest()` (L11915–11926) — the pre-assignment cancellation path — contains no fee logic | **DEAD by design** (locked, always free), but note the *implementation* is "no code" rather than "code that enforces zero" |
| `qr_driver_fault` — entire rule | **Nothing** (grep: L13941 only). Driver decline/timeout goes through `driverDeclineOrTimeout()` (L11995) which charges nobody | **DEAD by design** (locked) |
| `sub_before_first_trip` — entire rule | **Nothing** (grep: L13943 only). The zero-fee outcome for an unused plan comes from `used>0` in `feeApplies` (L5528), not from this rule | **DEAD** — the intended behaviour is achieved by a separate hardcoded condition |
| `rule.note` / `rule.scenario` / `rule.locked` | render only (L7353–7357) | Display-only |
| `getCancellationRule(id)` (L5548) | L5527, L11808, L11809, L11832, L7374 | Live |

**Score: 3 of 8 rules have a real enforcement point** (`qr_after_grace`, `qr_rider_noshow`, `sub_mid_cycle`). One editable field (`graceMin`) and one editable fee (`qr_after_arrival`) are configurable-but-inert; three locked rules document intent that is implemented elsewhere or not at all.

## 10. Cross-module effects

1. **Live Map → Cancel live trip** (`cancelLiveTrip`, L11805–11822). Pre-reads `qr_after_grace` and `qr_rider_noshow` (L11808–11809) to build reason-option hints:
   - `rider_request` → hint `"<feeAmount> SAR fee applies — driver already committed"` or `'No fee configured'` (L11816)
   - `rider_noshow` → hint `"<feeAmount> SAR fee applies"` or `'No fee configured'` (L11817)
   - `ops_decision` → hint `"No fee — not the rider's fault"` (L11818, hardcoded)

   Commit `confirmCancelLiveTrip` (L11824–11848): `requirePerm('live_ops')`, splices the trip out of `DB.liveTrips`, debits the wallet, writes `logAction('cancel_live_trip','trip',id,'Cancelled live trip <id> — reason: <reason> · fee <n> SAR|· no fee (<rider>)',{status:'active'},{status:'cancelled',fee})`, toast `✕ <id> cancelled<feeNote>`.
2. **Subscriptions → Cancel & refund** (`cancelSub`, L5517–5547 → `confirmCancelSub`, L5549–5566). The modal displays "Trips used", "Refund before fee", the fee line `Mid-cycle cancellation fee (<feePct>%)` and "Net refund to wallet". When the fee does not apply it shows either *"Mid-cycle fee is currently disabled in Settings."* (used>0) or *"No trips used yet — full refund, no fee applies."* (L5537). Commit requires `manage_subscriptions` (L5550), sets `sub.status='Cancelled'`, and on `refund>0` calls `recordRefund(...)` + `creditRiderWallet(...)` (L5562–5564).
3. **Rider wallet** — `debitRiderWallet(riderId, fee, 'Cancellation fee — <tripId>')` (L3941, called L11837) is the only money movement this tab causes directly.
4. **Ledger / Finance** — the subscription path routes through `recordRefund` (itself confirm-gated at L17901) which posts to the double-entry ledger; the quick-ride fee path posts only a wallet debit.
5. **Trip Readiness page** — linked from the description (L1829) as the rider-facing alternative (postponement) to cancellation.
6. **Permission split** — quick-ride cancellation is gated on **`live_ops`** (L11806, L11825); subscription cancellation on **`manage_subscriptions`** (L5550); editing this policy on **`manage_settings`** (L7370). Three different permissions touch one policy.
7. **Settings meta line** — `renderSettingsMeta()` (L7341–7344) maps `meta-cancelpolicy` → audit entity `'cancellation-policy'`.
8. **Settings nav regrouping** — `SETTINGS_GROUPS` (L21271) places `cancelpolicy` third in the **"Daily operations"** group.

## 11. Hardcoded / mock / demo values

| Item | Line | Note |
|---|---|---|
| All 8 rules with their fees (0/0/5/10/0/10 SAR, 0/10 %) and the 2-minute grace | L13936–13945 | In-file literals |
| The three cancellation reasons in the live-trip modal | L11816–11818 | Hardcoded `rider_request` / `rider_noshow` / `ops_decision`; **not** derived from `DB.cancellationPolicy`, which is why `qr_after_arrival` can never be selected |
| `'No fee — not the rider's fault'` hint for `ops_decision` | L11818 | Hardcoded string with no backing rule |
| `'No fee configured'` fallback hints | L11816–11817 | Hardcoded |
| Subscription trip counts parsed from a display string `sub.trips` like `'3/12'` | L5520–5522 | The refund fraction is derived from a formatted UI string, with `||1` guarding division by zero |
| `sub.paid` parsed with `parseFloat` from a string such as `'86.50 SAR'` | L5523 | Same pattern as elsewhere in the file |
| "insufficient wallet balance, added to next trip charge" | L11839–11840 | The claim is logged and toasted, but **no mechanism adds it to the next trip** anywhere in the file |
| Four cancellation reasons in the subscription modal (`Rider request` / `Driver unavailable` / `Payment dispute` / `Other`) | L5540–5542 | Hardcoded; unrelated to the policy matrix and not used in fee selection |

## 12. i18n keys

| Key | Element | EN | AR |
|---|---|---|---|
| `stab.cancelpolicy` | tab button label, L1429 | "Cancellation Policy" | `سياسة الإلغاء` (L7920) |
| `stabgrp.operations` | static group header, L1425 | "Operations" | `العمليات` (L7913) — removed at boot (L21285) |
| `stabgrp.daily_ops` | runtime group header for this tab | "Daily operations" | `العمليات اليومية` (L7914) |

**No `data-i18n` attribute exists anywhere inside `#stab-cancelpolicy` (L1825–1842).** The panel title, the long description, both card headings, all eight column headers, the "Grace period (minutes)" label, the `SAR`/`%` suffixes, the "Always free" badge and the Save button are English-only literals, as are every scenario string, note, toast and modal built from the policy.

## 13. Gaps, dead code, UNVERIFIED items

1. **`graceMin` is configurable and never enforced.** The 2-minute free window after driver acceptance exists only as a number in the store and an input in Settings; `confirmCancelLiveTrip` never compares elapsed time and never consults `qr_grace_period`.
2. **`qr_after_arrival` (10 SAR) is unreachable.** The live-trip modal's reason list (L11816–11818) has no option that maps to it, so the "after arrival" fee tier is documented, editable, and inert. Post-arrival rider cancellations are charged 5 SAR under `qr_after_grace`.
3. **`sub_before_first_trip` is decorative** — the equivalent behaviour is hardcoded as `used>0` in `feeApplies` (L5528). Deleting the rule would change nothing; disabling it would change nothing.
4. **`qr_before_assigned` and `qr_driver_fault` are documentation, not code.** `cancelRequest()` (L11915) and `driverDeclineOrTimeout()` (L11995) simply never charge anyone.
5. **Fee inputs have no upper bound.** `feePct` above 100 makes `refund = grossRefund − fee` negative, and `confirmCancelSub`'s `if(refund>0)` guard (L5562) then silently skips the refund entirely — the rider is neither refunded nor charged the excess.
6. **`parseFloat(...)||0` on save** (L7379) turns any unparseable fee into `0`, silently disabling a fee rather than rejecting the input.
7. **Quick-ride fees are not recoverable.** When `debitRiderWallet` returns falsy the code logs "added to next trip charge" (L11839) but no such deferred charge exists anywhere.
8. **The subscription fee is never collected** — it only reduces the refund. That matches the "withholding, not a fine" philosophy used elsewhere in the file, but it means the fee has no ledger entry of its own.
9. **No add/edit/delete of scenarios.** The matrix is closed at 8; a new cancellation window would require a code change, contradicting the extensible pattern used by `DB.opsLimits`.
10. **No empty state** on either table.
11. **Single Save button placed under the Quick rides card** (L1835) saves the Subscriptions card too — discoverability risk; the subscriptions card has no Save affordance of its own.
12. **Grace-period input renders inside the Scenario cell**, not under the Fee column, so it is easy to miss.
13. **`config_updated` is missing from `ACTION_LABELS`** (L2898–2910) — cancellation-policy audit rows have no friendly label in the Activity filter (L9238).
14. **Toast overpromises**: "applies to the next cancellation immediately" (L7384) is true for the three live rules and false for `graceMin` and `qr_after_arrival`.
15. **UNVERIFIED** — whether a rider-side app enforces the grace period client-side. Nothing in this file does.

## 14. Line-number index

| What | Lines |
|---|---|
| Tab button | 1429 |
| Pane `#stab-cancelpolicy` | 1825–1842 |
| Header card / description | 1826–1831 |
| Quick rides card | 1832–1836 |
| `thead` (Quick rides) / `tbody#cancelpolicy-qr-tbody` | 1834 |
| "Save cancellation policy" button | 1835 |
| Subscriptions card | 1837–1841 |
| `thead` (Subscriptions) / `tbody#cancelpolicy-sub-tbody` | 1839 |
| `#meta-cancelpolicy` | 1840 |
| `ACTION_LABELS` | 2898–2910 |
| `debitRiderWallet()` | 3941 |
| `cancelSub()` (refund + fee formula) | 5517–5547 |
| — `sub_mid_cycle` lookup and fee math | 5527–5530 |
| — fee / no-fee display line | 5537 |
| `getCancellationRule()` | 5548 |
| `confirmCancelSub()` | 5549–5566 |
| `renderSettingsMeta()` | 7341–7344 |
| `cancelPolicyRowHtml()` | 7348–7361 |
| — locked-row branch | 7353–7355 |
| — grace-period sub-field | 7357 |
| — fee input | 7358 |
| — enabled toggle | 7359 |
| `renderCancellationPolicy()` | 7362–7368 |
| `saveCancellationPolicy()` | 7369–7385 |
| Arabic `stab.cancelpolicy` | 7920 |
| Settings page render fan-out | 8819 |
| Activity-log action filter | 9238 |
| `cancelLiveTrip()` (modal + hints) | 11805–11822 |
| `confirmCancelLiveTrip()` (fee selection + charge) | 11824–11848 |
| `cancelRequest()` (no fee logic) | 11915–11926 |
| `driverDeclineOrTimeout()` (no fee logic) | 11995–12007 |
| `DB.cancellationPolicy` (comment + 8 rules) | 13931–13945 |
| `guardAction()` | 17819–17840 |
| `recordRefund` gate | 17901 |
| `gateAll()` | 20755–20767 |
| `GATE_SWEEP.saveCancellationPolicy` | 20786–20788 |
| `SETTINGS_GROUPS` ("Daily operations") | 21271 |
| `reorderSettingsTabs()` | 21278 |
