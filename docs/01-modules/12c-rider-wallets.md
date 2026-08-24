# Module: Rider Wallets

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `rwallets` · **Page div:** `#p-rwallets`
> **HTML lines:** L1020–L1029
> **Primary render:** `renderRiderWalletsList()` L4010–L4030
> **Money helpers:** `getRiderWallet()` L3928 · `creditRiderWallet()` L3932 · `debitRiderWallet()` L3941 · `walletCardHTML()` L3951 · `openWalletAdjustModal()` L3962 · `commitWalletAdjust()` L3977 · `recordRefund()` L3176
> **THIS IS A FINANCIAL MODULE.** Every formula below is transcribed verbatim from source.

---

## 1. Purpose

A rider-side prepaid balance ledger. The page sub-header states the intent verbatim (L1021):

> "Prepaid balances — refunds, goodwill credits, and referral bonuses land here instead of a manual bank transfer"

The page itself is **read-mostly plus one write action**: it lists every rider that has a `wallet` object, three KPIs, and a `+ Credit` button per row. The full credit/debit surface (both directions) lives on the rider 360° profile via `walletCardHTML()` (L3951), which is injected into the profile body at L4185 (`var walletCard=!isDrv?walletCardHTML(d):'';`).

The wallet is a **liability account**: the double-entry wrapper at L19979–L19991 books a credit as `expense.goodwill` (or `expense.compensation`) DEBIT against `liability.wallet` CREDIT — "we now owe the rider" (comment, L19987).

---

## 2. Entry points & routing

| # | Entry point | Line | Mechanism |
|---|---|---|---|
| 1 | Sidebar item "Rider wallets" | L529 | `<div class="sb-item" onclick="go('rwallets',this)">` — i18n key `nav.rwallets` |
| 2 | Router branch | L8814 | `if(id==='rwallets'){renderRiderWalletsList();}` inside `window.go` (defined L8774) |
| 3 | Toolbar title | L2168 | `titles.rwallets = 'Rider Wallets'` |
| 4 | Toolbar subtitle | L2169 | **No `subs.rwallets` key exists** → `document.getElementById('tb-sub').textContent = subs[id]||''` (L8786) sets the subtitle to the **empty string**. See §18 G1. |
| 5 | Indirect re-render | L4008 | `commitWalletAdjust()` calls `renderRiderWalletsList()` after every adjustment, even when the page is not visible (the function no-ops safely via `if(!tb)return;` L4012). |

**No page-level permission gate.** `go('rwallets')` does not call `requirePagePerm(...)`; contrast the driver-wallets cash actions which do (L12148, L12189). The list is visible to any logged-in operator.

**Navigation side effects on entry** (L8774–L8783): mobile sidebar closed, `refreshNavCounts()`, `pushHistory()` unless `isBack`, all `.page` elements lose `.on`, `#p-rwallets` gains `.on`, sidebar item marked `.on`.

---

## 3. Layout map

```
#p-rwallets                                     L1020
├── .ph  (page header)                          L1021
│   └── .ph-l → <h1>Rider wallets</h1>
│              <p>Prepaid balances — refunds, goodwill credits,
│                 and referral bonuses land here instead of a
│                 manual bank transfer</p>
├── .g3  #rwallets-kpis        (3 KPI tiles)    L1022  ← filled by L4015
└── .card                                       L1023
    ├── .ch → <h2>All rider wallets</h2>        L1024
    └── table.dt                                L1025
        thead: Rider | Balance | Transactions | Last activity | (blank)
        tbody #rwallets-tbody                   ← filled by L4021
```

There is **no search box, no filter, no pagination, no sort control, and no export button** on this page (verified against L1020–L1029 in full).

---

## 4. Data model & fields

### 4.1 `DB.riders[<id>].wallet` — created lazily by `getRiderWallet()` L3928–L3931

```js
function getRiderWallet(d){
  if(!d.wallet)d.wallet={balance:0,transactions:[]};
  return d.wallet;
}
```

| Field | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `wallet` | object \| undefined | — | Absent until a rider is credited/debited or seeded. Its presence is the **row filter** for the page (L4013). | L3929 |
| `wallet.balance` | Number | SAR | Current prepaid balance. Always rounded to 2 dp on write. Never negative via the UI — `debitRiderWallet` refuses below zero (L3945). | L3929 |
| `wallet.transactions` | Array | — | Newest-first (`unshift`, L3937/L3946). Unbounded — no cap. | L3929 |

### 4.2 Wallet transaction record (`WTX`) — written at L3937 (credit) and L3946 (debit)

| Field | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `id` | String | — | `'WTX-'+Date.now()` — **millisecond epoch**, not a sequence. | L3937, L3946 |
| `type` | String enum | — | `'credit'` \| `'debit'` — the only two values written anywhere. | L3937, L3946 |
| `amount` | Number | SAR | **Always stored positive.** Sign is carried by `type`, not by the number. | L3937, L3946 |
| `reason` | String | — | Free-text label from the modal's reason picker (§7.1/§7.2) or from a programmatic caller (§7.4). | L3937, L3946 |
| `date` | String | — | `fmtReqNowLabel()` → `"DD Mon HH:MM"` from the **frozen demo clock** `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` (L14600). Never the real clock. | L9645–L9650 |
| `balanceAfter` | Number | SAR | Post-write balance snapshot. **Displayed nowhere in this module** — written but never read. | L3937, L3946 |

### 4.3 Seeded wallets (demo data — see §16)

| Rider | Line | Balance | Transactions |
|---|---|---|---|
| `RDR-1041` Nora Al-Harbi | L2594 | `20` SAR | 1 × `WTX-seed-2`, credit 20, "Referral bonus — referred Sara Al-Ghamdi", `18 Jul 09:30`, balanceAfter 20 |
| `RDR-2087` Layla Al-Faraj | L2599 | `17.30` SAR | 1 × `WTX-seed-1`, credit 17.30, "Trip cancellation refund", `19 Jun 10:52`, balanceAfter 17.30 |

No other rider in `DB.riders` carries a `wallet` key at load.

### 4.4 `DB.goodwillLedger[]` — written by `logGoodwill()` L15436–L15445

| Field | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `id` | String | — | `'GW-'+String(len+1).padStart(4,'0')` | L15439 |
| `tsMs` | Number | ms epoch | `nowMs()` = **real** `Date.now()` (L14627). Mismatched with the frozen `date` on the same record. | L15440 |
| `date` | String | — | `fmtReqNowLabel()` — frozen demo clock. | L15440 |
| `riderId` / `riderName` | String | — | `nm2(riderId)` for the name (L3565). | L15440 |
| `amount` | Number | SAR | Positive. | L15441 |
| `reasonCode` | String | — | Reason-code key; defaults `'OTHER_UNCODED'`. | L15441 |
| `agentId` / `agentName` | String | — | `CURRENT_USER_ID`; name from `DB.teamUsers`. | L15442 |
| `note` | String | — | The free-text reason label passed by `commitWalletAdjust` (L3997). | L15442 |

`DB.goodwillLedger` is initialised empty at L15391 — **no seeded goodwill history**, so every ceiling check starts from zero on page load.

### 4.5 `DB.refunds[]` — written by `recordRefund()` L3176–L3204

| Field | Type | Unit | Meaning | Line |
|---|---|---|---|---|
| `id` | String | — | `'REF-'+String(DB.refunds.length+1).padStart(4,'0')` — **length-based**. | L3181 |
| `date` | String | — | Hard-coded `'25 Jun'`. Comment: *"frozen demo clock — matches every other date in the panel"*. | L3182 |
| `riderId` / `riderName` | String | — | Falls back to `{name:riderId}` if the rider is unknown (L3178). | L3183–L3184 |
| `amount` | Number | SAR | VAT-inclusive gross. | L3185 |
| `reason` | String | — | Free text from the caller. | L3186 |
| `source` | String | — | Caller-supplied bucket, e.g. `'Subscription cancellation'` (L5562). | L3187 |
| `relatedId` | String | — | Originating sub/trip id. | L3188 |
| `processedBy` | String | — | Actor name, or `CURRENT_USER_ID` if not found. | L3189 |
| `status` | String | — | Hard-coded `'Processed'` — **the only value this field ever takes.** | L3190 |
| `creditNote` | String | — | Set to `cn.id` when `issueCreditNote()` returns one (L3197). | L3197 |

### 4.6 `DB.compPolicy` — L15379–L15390

| Field | Type | Unit | Value | Line |
|---|---|---|---|---|
| `roles.Owner.perCaseSAR` / `.dailySAR` | Number | SAR | `1000` / `10000` | L15381 |
| `roles.Operations.perCaseSAR` / `.dailySAR` | Number | SAR | `200` / `2000` | L15382 |
| `roles.Support.perCaseSAR` / `.dailySAR` | Number | SAR | `75` / `600` | L15383 |
| `roles.Finance.perCaseSAR` / `.dailySAR` | Number | SAR | `500` / `5000` | L15384 |
| `roles.default.perCaseSAR` / `.dailySAR` | Number | SAR | `50` / `300` | L15385 |
| `secondApprovalAboveSAR` | Number | SAR | `200` | L15387 |
| `perRiderPer30dSAR` | Number | SAR | `150` | L15388 |
| `perRiderPer30dCount` | Number | count | `3` | L15389 |

### 4.7 `ACCOUNTS` used by wallet postings — L19865–L19878

| Account key | Label | Type | Line |
|---|---|---|---|
| `cash.gateway` | Cash at payment gateway | asset | L19866 |
| `liability.wallet` | Rider wallet balances | liability | L19868 |
| `tax.vat_output` | VAT output payable | liability | L19871 |
| `revenue.fares` | Fare revenue | revenue | L19872 |
| `contra.refunds` | Refunds (contra revenue) | contra | L19873 |
| `expense.goodwill` | Goodwill credits | expense | L19874 |
| `expense.compensation` | Rider compensation | expense | L19876 |

---

## 5. Formulas — written out exactly

### F1 — Credit a wallet (`creditRiderWallet`, L3936)
```js
w.balance = Math.round((w.balance + amount) * 100) / 100;
```
Rounding: **half-up to 2 decimal places**, applied to the *result*, not the operand. Sign: `amount` is expected positive — **the function does not validate the sign** (see §17 R1). Currency: SAR, implicit everywhere; no currency field exists on any wallet record.

### F2 — Debit a wallet (`debitRiderWallet`, L3945–L3946)
```js
if(w.balance < amount) return false;
w.balance = Math.round((w.balance - amount) * 100) / 100;
```
The guard is `<` (strictly less), so an exact-balance debit succeeds and lands on `0`. Returns `false` with **no write and no audit entry** on insufficient funds.

### F3 — KPI 1: Total balance held (computed L4014, rendered L4016)
```js
totalBalance = withWallet.reduce(function(s,id){
  return s + getRiderWallet(DB.riders[id]).balance;
}, 0);
// displayed: totalBalance.toFixed(2) + ' SAR'
```
Sums only riders where `DB.riders[id].wallet` is truthy (L4013). **No re-rounding of the running sum** — float drift accumulates until `.toFixed(2)` at display time.

### F4 — KPI 2: Riders with a balance (L4017)
```js
withWallet.filter(function(id){
  return getRiderWallet(DB.riders[id]).balance > 0;
}).length
// sublabel: 'out of ' + Object.keys(DB.riders).length + ' total'
```
Strictly `> 0` — a zero-balance wallet appears in the table but not in this KPI.

### F5 — KPI 3: Wallet transactions (L4018)
```js
withWallet.reduce(function(s,id){
  return s + getRiderWallet(DB.riders[id]).transactions.length;
}, 0)
// sublabel: hard-coded string 'this session'
```

### F6 — Row sort (L4020)
```js
sorted = withWallet.sort(function(a,b){
  return getRiderWallet(DB.riders[b]).balance - getRiderWallet(DB.riders[a]).balance;
});
```
Descending balance. No secondary key — ties keep engine order. Sorts the array returned by `filter`, so no shared state is mutated.

### F7 — Credit-note VAT split (`issueCreditNote`, L15865–L15868)
```js
rate      = DB.vatConfig.ratePct / 100;              // 15/100 = 0.15   (L13971)
totalIncl = Math.round(entry.amount * 100) / 100;
subtotal  = Math.round((totalIncl / (1 + rate)) * 100) / 100;
vatAmount = Math.round((totalIncl - subtotal) * 100) / 100;
```
VAT is extracted **out of** a gross (VAT-inclusive) amount, never added on top.

### F8 — Refund ledger posting (`recordRefund` wrapper, L19964–L19974)
```js
rate = (DB.vatConfig ? DB.vatConfig.ratePct : 15) / 100;
net  = r2(amount / (1 + rate));
vat  = r2(amount - net);
postLedger(key,'refund',[
  {account:'contra.refunds', debit:  net},
  {account:'tax.vat_output', debit:  vat},          /* output VAT reversed */
  {account:'cash.gateway',   credit: r2(amount)}
], {riderId:riderId, refundId:entry.id, creditNote:entry.creditNote});
```
where `r2(n) = Math.round((n||0)*100)/100` (L19883).

### F9 — Wallet-credit ledger posting (L19981–L19989)
```js
expense = /goodwill|apolog/i.test(reason||'') ? 'expense.goodwill'
        : /compensat/i.test(reason||'')       ? 'expense.compensation'
        :                                       'expense.goodwill';
postLedger(key,'wallet_credit',[
  {account: expense,           debit:  r2(amount)},
  {account:'liability.wallet', credit: r2(amount)}   /* we now owe the rider */
], {riderId:riderId, reason:reason});
```
**Every** wallet credit — referral bonus, promo redemption, manual top-up, cancellation refund — lands on a goodwill/compensation expense account through this fallback chain. See §17 R7.

### F10 — Wallet-debit ledger posting (L19996–L19999)
```js
postLedger(key,'wallet_debit',[
  {account:'liability.wallet', debit:  r2(amount)},
  {account:'revenue.fares',    credit: r2(amount)}
], {riderId:riderId, reason:reason});
```
Every debit — including `'Correction — issued in error'` — is recognised as **fare revenue**. See §17 R8.

### F11 — Ledger balance guard (`postLedger`, L19918–L19928)
```js
dr = Σ postings[i].debit;
cr = Σ postings[i].credit;
unknown = postings.filter(p => !ACCOUNTS[p.account]);
if (unknown.length || r2(dr) !== r2(cr)) {
  why = unknown.length ? 'unknown account ' + unknown.map(p=>p.account).join(', ')
                       : 'unbalanced: debits ' + r2(dr) + ' vs credits ' + r2(cr);
  DB.moneyRejects.unshift({ref, type, why, tsMs:nowMs(), postings});
  logAction('ledger_rejected','money',ref,'Posting REFUSED — '+why+'. Nothing was written.');
  toast('⛔ Ledger rejected the posting — '+why,'err');
  return null;
}
```

### F12 — Idempotency keys (L19980 credit, L19994 debit)
```js
// credit
key = idemKey('wallet_credit', riderId, r2(amount), reason||'', Math.floor(nowMs()/1000));
// debit
key = idemKey('wallet_debit',  riderId, r2(amount), reason||'', Math.floor(nowMs()/1000));
// idemKey joins arguments with '|' after String()-coercing null/undefined to '' (L19889–L19892)
```
The trailing `Math.floor(nowMs()/1000)` is a **1-second bucket** — the duplicate window is one second. See §17 R3.

### F13 — Goodwill spent today (`goodwillToday`, L15400–L15404)
```js
since = nowMs() - 24*3600000;                       // rolling 24 h, not calendar day
return (DB.goodwillLedger||[])
  .filter(g => g.agentId === userId && g.tsMs >= since)
  .reduce((s,g) => s + g.amount, 0);
```

### F14 — Goodwill to this rider in 30 days (`goodwillForRider`, L15405–L15409)
```js
since = nowMs() - 30*24*3600000;
rows  = (DB.goodwillLedger||[]).filter(g => g.riderId === riderId && g.tsMs >= since);
return { total: rows.reduce((s,g)=>s+g.amount,0), count: rows.length };
```

### F15 — Compensation authority check (`compCheck`, L15412–L15434)
Evaluated **in this exact order**; the first block wins and short-circuits the rest.
```js
role = currentRole();          // DB.teamUsers[CURRENT_USER_ID].role, else 'default'   (L15393)
lim  = compLimitsFor(role);    // DB.compPolicy.roles[role] || roles['default']         (L15397)
rc   = rcById(reasonCode) || {};

/* 1. Per-scenario prohibition */
if (rc.comp === 0 && rc.code && rc.code !== 'OTHER_UNCODED')
    blocked = 'No goodwill is permitted on ' + rcLabel(reasonCode)
            + ' — this scenario is resolved by fixing the underlying issue, not by paying for it.';

/* 2. Per-case ceiling */
if (!blocked && amount > lim.perCaseSAR)
    blocked = 'Above your per-case ceiling (' + lim.perCaseSAR + ' SAR for role "' + role
            + '"). Escalate to a supervisor instead of splitting it into smaller credits.';

/* 3. Daily ceiling */
today = goodwillToday(CURRENT_USER_ID);
if (!blocked && today + amount > lim.dailySAR)
    blocked = 'Above your daily ceiling — ' + today.toFixed(2) + ' of ' + lim.dailySAR
            + ' SAR already issued today.';

/* 4. Per-rider 30-day pattern → NOTE + approval, never a block */
hist = goodwillForRider(riderId);
if (!blocked && (hist.total + amount > DB.compPolicy.perRiderPer30dSAR
              || hist.count + 1   > DB.compPolicy.perRiderPer30dCount)) {
    notes.push('⚠ This rider has already received ' + hist.count + ' credits totalling '
             + hist.total.toFixed(2) + ' SAR in 30 days. Repeated goodwill to the same account '
             + 'is a signal to investigate, not to keep paying.');
    approval = true;
}

/* 5. Second-approver threshold → NOTE + approval */
if (!blocked && amount > DB.compPolicy.secondApprovalAboveSAR) {
    notes.push('Above ' + DB.compPolicy.secondApprovalAboveSAR + ' SAR — a second approver is required.');
    approval = true;
}

return { ok: !blocked, blocked: blocked, needsApproval: approval, notes: notes, role: role, limits: lim };
```
Source comment L15410–L15411: *"Returns {ok, blocked, needsApproval, notes[]} — never silently trims an amount, because a quietly reduced credit is worse than a clear refusal."*

### F16 — Account-balance normalisation (`accountBalance`, L19933–L19946)
```js
debitNormal = (a.type==='asset' || a.type==='expense' || a.type==='contra');
return r2(debitNormal ? dr - cr : cr - dr);
```
`liability.wallet` is credit-normal → its reported balance is `credits − debits`.

---

## 6. States & transitions

The wallet has **no explicit status enum**. Its observable states derive entirely from `balance`.

| State | Exact condition | Where it shows | Transition trigger |
|---|---|---|---|
| **No wallet** | `!d.wallet` | Row absent from `#rwallets-tbody` (filter L4013). The profile wallet card still renders, because `getRiderWallet` creates the object on read (L3929). | Any call to `getRiderWallet(rider)` — including a plain profile view — materialises `{balance:0,transactions:[]}`. See §17 R6. |
| **Zero balance** | `w.balance === 0` | Balance cell coloured `var(--ghost)` (L4024); card badge class `b-grey` (L3956); `− Deduct` button `disabled` (L3958). | `debitRiderWallet` bringing the balance to exactly 0; or lazy creation. |
| **Positive balance** | `w.balance > 0` | Balance cell `var(--green)` (L4024); card badge `b-green` (L3956); `− Deduct` enabled. | `creditRiderWallet` (F1). |
| **Negative balance** | Not reachable through `debitRiderWallet` (guard L3945). | — | Only reachable if `creditRiderWallet(id, negativeAmount, …)` is called programmatically. See §17 R1. |

### Transaction-type transitions

| Type | Written by | Trigger | Line |
|---|---|---|---|
| `credit` | `creditRiderWallet` | Any of the 7 call sites in §15.2 | L3937 |
| `debit` | `debitRiderWallet` | `commitWalletAdjust(kind='debit')` L4003, or live-trip cancellation fee L11838 | L3946 |

### Second-approval state machine (`commitWalletAdjust`, L3986–L3998)

| State | Condition | Effect |
|---|---|---|
| `window.__compApproved` falsy **and** `chk.needsApproval === true` | First press of "Add credit" | Sets `window.__compApproved = true`; toast `'⚠ Second approval required — press Confirm again to record this as an approved exception'` (warn); **returns without crediting** (L3993). |
| `window.__compApproved === true` | Second press | Resets to `false` (L3997), then `logGoodwill(...)` and `creditRiderWallet(...)`. |
| `chk.ok === false` | any press | `logAction('comp_blocked','rider',riderId,'Goodwill credit of '+amount.toFixed(2)+' SAR blocked — '+chk.blocked)` (L3988), toast `'⛔ '+chk.blocked` (err), **return** — no money moves. |

`window.__compApproved` is a **single global flag with no rider/amount/session binding** — see §17 R2.

### Idempotency state (`withIdempotency`, L19893–L19908)

| State | Condition | Effect |
|---|---|---|
| First occurrence | `DB.idempotency[key]` undefined | Runs the operation; stores `{key, operation, tsMs, attempts:1, result}`. |
| Repeat within the 1-second key bucket | `DB.idempotency[key]` exists | `seen.attempts++`, `seen.lastAttemptMs=nowMs()`, `logAction('duplicate_suppressed','money',key,…)`, toast warn, **returns the cached result — no money moves.** |

---

## 7. Reason codes / categories — full enumeration

### 7.1 Credit-modal "Reason" dropdown (`#wallet-reason`) — L3972, exactly 5 options

| # | value | label |
|---|---|---|
| 1 | `Trip cancellation refund` | Trip cancellation refund |
| 2 | `Goodwill / apology credit` | Goodwill / apology credit |
| 3 | `Referral bonus` | Referral bonus |
| 4 | `Promo code redemption` | Promo code redemption |
| 5 | `Manual top-up` | Manual top-up |

Placeholder `'Select a reason…'`; `selectedValue` is `''` (no default).
**Only option 2 triggers the compensation-authority path** — the test is `reason.indexOf('Goodwill') >= 0` (L3985), a substring match on the label text.

### 7.2 Debit-modal "Reason" dropdown (`#wallet-reason`) — L3972, exactly 3 options

| # | value | label |
|---|---|---|
| 1 | `Correction — issued in error` | Correction — issued in error |
| 2 | `Used toward ride payment` | Used toward ride payment |
| 3 | `Used toward subscription` | Used toward subscription |

### 7.3 Credit-modal "Reason code" dropdown (`#wallet-reasoncode`) — L3970

Populated from `(DB.reasonCodes||[]).filter(r=>r.active)`; label `(r.ref?'§'+r.ref+' ':'')+r.labelEn`; placeholder `'Which scenario is this for?'`; `onchange` → `compPreview(riderId)`. **Rendered only when `kind==='credit'`.** Read fallback when unset: `'OTHER_UNCODED'` (L3984).

Full taxonomy `DB.reasonCodes` (L14667–L14715, closing `]` at L14716) — all 40 entries are `active:true`. `comp` is the per-scenario goodwill ceiling in SAR; **`comp:0` blocks all goodwill** for that code except `OTHER_UNCODED`, which F15 step 1 excludes by name. `fr`/`res`/`upd` are minutes (`null` = inherit the tier default).

| # | code | §ref | cat | target | tier | fr | res | upd | **comp (SAR)** | owner |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `CAP_CANCEL_ADV` | 1.1 | Captain | rider | T2 | 10 | 240 | — | **25** | Supply |
| 2 | `CAP_LATE` | 1.2 | Captain | rider | T3 | 15 | 240 | 15 | **15** | Ops |
| 3 | `CAP_NOSHOW` | 1.3 | Captain | rider | T2 | 10 | 240 | — | **50** | Supply |
| 4 | `CAP_OFFPLATFORM_PAY` | 1.4 | Captain | rider | T2 | 15 | 1440 | — | **0 — blocked** | Compliance |
| 5 | `CAP_CONDUCT` | 1.5 | Captain | rider | T1 | 0 | 1440 | — | **50** | Supply |
| 6 | `BKG_CANCEL_REQ` | 2.1 | Booking | rider | T4 | — | 1440 | — | **0 — blocked** | (none) |
| 7 | `BKG_WRONG_SLOT` | 2.2 | Booking | rider | T4 | — | 1440 | — | **0 — blocked** | Product |
| 8 | `BKG_NO_SUPPLY` | 2.3 | Booking | rider | T3 | 60 | 1440 | — | **20** | Supply |
| 9 | `BKG_CAPTAIN_PREF` | 2.4 | Booking | rider | T4 | — | 1440 | — | **0 — blocked** | Product |
| 10 | `PAY_INCORRECT_CHARGE` | 3.1 | Payment | rider | T2 | 15 | 1440 | — | **0 — blocked** | Payments |
| 11 | `PAY_DECLINED` | 3.2 | Payment | rider | T3 | 60 | 2880 | — | **0 — blocked** | Payments |
| 12 | `PAY_REFUND_REQ` | 3.3 | Payment | rider | T2 | 15 | 1440 | — | **0 — blocked** | Ops |
| 13 | `TRP_ROUTE_DEVIATION` | 4.1 | Trip | rider | T3 | 60 | 2880 | — | **0 — blocked** | Supply |
| 14 | `TRP_LOST_ITEM` | 4.2 | Trip | rider | T3 | 15 | 2880 | 30 | **0 — blocked** | Ops |
| 15 | `TRP_GHOST_COMPLETE` | 4.3 | Trip | rider | T1 | 0 | 240 | — | **0 — blocked** | Supply |
| 16 | `APP_LOGIN` | 5.1 | Technical | rider | T3 | 60 | 2880 | — | **0 — blocked** | Engineering |
| 17 | `APP_CRASH` | 5.2 | Technical | rider | T3 | 60 | 2880 | — | **0 — blocked** | Engineering |
| 18 | `TECH_STATE_DESYNC` | — | Technical | rider | T2 | 15 | 240 | — | **20** | Engineering |
| 19 | `APP_PROMO` | 5.3 | Technical | rider | T4 | — | 4320 | — | **0 — blocked** | Marketing |
| 20 | `SAF_RIDER_UNSAFE` | 6.1 | Safety | rider | T1 | 0 | 60 | — | **100** | Safety |
| 21 | `SAF_ACCIDENT` | 6.2 | Safety | driver | T1 | 0 | 60 | — | **100** | Safety |
| 22 | `SAF_THEFT` | 6.3 | Safety | rider | T2 | 15 | 1440 | — | **0 — blocked** | Compliance |
| 23 | `FBK_COMPLAINT` | 7.1 | Feedback | rider | T3 | 60 | 2880 | — | **25** | Ops |
| 24 | `FBK_ACCOUNT_DELETE` | 7.2 | Feedback | rider | T3 | 60 | 2880 | — | **0 — blocked** | Product |
| 25 | `FBK_INVOICE` | 7.3 | Feedback | rider | T4 | — | 1440 | — | **0 — blocked** | Product |
| 26 | `SUB_SAME_CAPTAIN_BROKEN` | — | Subscription | rider | T2 | 15 | 1440 | — | **25** | Supply |
| 27 | `SUB_POSTPONE` | — | Subscription | rider | T4 | — | 1440 | — | **0 — blocked** | (none) |
| 28 | `SUB_FREEZE` | — | Subscription | rider | T4 | — | 1440 | — | **0 — blocked** | Product |
| 29 | `SUB_RENEWAL` | — | Subscription | rider | T4 | — | 1440 | — | **0 — blocked** | (none) |
| 30 | `DRV_RIDER_NOSHOW` | — | Driver | driver | T3 | 60 | 1440 | — | **0 — blocked** | Ops |
| 31 | `DRV_RIDER_CONDUCT` | — | Driver | driver | T2 | 15 | 1440 | — | **0 — blocked** | Safety |
| 32 | `DRV_VEHICLE_DAMAGE` | — | Driver | driver | T3 | 60 | 2880 | — | **0 — blocked** | Ops |
| 33 | `DRV_PAYOUT_ISSUE` | — | Driver | driver | T2 | 15 | 1440 | — | **0 — blocked** | Payments |
| 34 | `DRV_RATING_DISPUTE` | — | Driver | driver | T3 | 60 | 2880 | — | **0 — blocked** | Ops |
| 35 | `DRV_DEDUCTION_DISPUTE` | — | Driver | driver | T2 | 15 | 1440 | — | **0 — blocked** | Ops |
| 36 | `DRV_SUSPENSION_APPEAL` | — | Driver | driver | T2 | 15 | 1440 | — | **0 — blocked** | Compliance |
| 37 | `DRV_DOC_HELP` | — | Driver | driver | T3 | 60 | 2880 | — | **0 — blocked** | Compliance |
| 38 | `CORP_BILLING` | — | Corporate | corp | T3 | 60 | 2880 | — | **0 — blocked** | Finance |
| 39 | `CORP_EMPLOYEE_MGMT` | — | Corporate | corp | T4 | — | 2880 | — | **0 — blocked** | (none) |
| 40 | `OTHER_UNCODED` | — | Other | rider | T3 | 60 | 2880 | — | **0 — but exempt from the block** | Ops |

Every code also carries `labelAr` (Arabic) — full bilingual strings at L14669–L14712.

### 7.4 Programmatic reason strings written to `wallet.transactions` (not user-selectable)

| Reason string | Written at | Amount | Direction | `actorNote` |
|---|---|---|---|---|
| `'Referral bonus — referred '+referee.name` | L3868 | `DB.referralConfig.referrerBonus` | credit | `false` (no email) |
| `'Welcome bonus — referred by '+referrer.name` | L3869 | `DB.referralConfig.refereeBonus` | credit | `false` |
| `'Subscription cancellation refund ('+subId+')'` | L5563 | computed `refund` | credit | `false` |
| `'Welcome offer — instant cashback'` | L11184 | **hard-coded `10`** | credit | `false` |
| `'Cancellation fee — '+id` | L11838 | `rule.feeAmount` | **debit** | n/a |
| `'Delay compensation — captain absence'` | L17337 | `d.riderCompensation` | credit | **omitted → email IS sent** |

---

## 8. KPIs & metrics

Rendered into `#rwallets-kpis` (L1022) by L4015–L4019. Markup per tile: `<div class="kpi"><div class="kpi-lbl">…</div><div class="kpi-val">…</div><div class="kpi-dl neu">…</div></div>`.

| # | Label | Value formula | Sub-label | Source | Threshold / colour |
|---|---|---|---|---|---|
| 1 | `Total balance held` | F3 → `totalBalance.toFixed(2)+' SAR'` | `'across all riders'` (hard-coded) | `DB.riders[*].wallet.balance` | none — class always `neu` |
| 2 | `Riders with a balance` | F4 (integer) | `'out of '+Object.keys(DB.riders).length+' total'` | `DB.riders` | none |
| 3 | `Wallet transactions` | F5 (integer) | `'this session'` (hard-coded — **inaccurate**: seeded transactions predate the session) | `DB.riders[*].wallet.transactions.length` | none |

**No KPI has a colour rule, delta, trend, or target.** All three use the neutral `neu` class.

Related metric surfaced inside the credit modal by `compPreview()` (L15447–L15464):
- `Authority · <role> — per case <perCaseSAR> SAR · today <goodwillToday>/<dailySAR> SAR`
- `This rider: <hist.count> credit(s), <hist.total> SAR in 30 days`

---

## 9. Data displayed

### 9.1 Page chrome

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| `<h1>Rider wallets</h1>` L1021 | hard-coded HTML | String | No `data-i18n` on the h1 |
| `<p>Prepaid balances — …</p>` L1021 | hard-coded HTML | String | No `data-i18n` |
| `#tb-title` | `titles.rwallets` L2168 → `'Rider Wallets'` | String | Set at L8785 |
| `#tb-sub` | `subs['rwallets']` — **undefined** | String | Renders `''` (L8786) |
| `<h2>All rider wallets</h2>` L1024 | hard-coded HTML | String | — |
| Sidebar label | i18n key `nav.rwallets`; AR `'محافظ الركاب'` L7909; EN literal `Rider wallets` in markup | String | L529 |

### 9.2 KPI tiles — see §8.

### 9.3 Table body `#rwallets-tbody` (L4021–L4029)

| Column | Cell content | DB path / computed | Type | Notes |
|---|---|---|---|---|
| Rider | `<p class="td-name">`+`r.name`; `<p class="td-sub">`+`id` | `DB.riders[id].name`; object key | String | Name styled `cursor:pointer;color:var(--blue)`, `onclick="openProfile(id)"` |
| Balance | `w.balance.toFixed(2)+' SAR'` | `DB.riders[id].wallet.balance` | Number→String | Colour `var(--green)` when `>0`, else `var(--ghost)`; `font-weight:500` |
| Transactions | `w.transactions.length` | array length | Number | Plain integer, no formatting |
| Last activity | `last.reason` + `<span>· `+`last.date`+`</span>`, else `'—'` | `w.transactions[0]` (L4023) | String | Newest, because writes use `unshift` |
| *(unlabeled 5th)* | `<button class="btn sm success">+ Credit</button>` | — | — | `onclick="openWalletAdjustModal(id,'credit')"` |

### 9.4 Wallet card on the 360° profile (`walletCardHTML`, L3951–L3961)

| Element | Source | Notes |
|---|---|---|
| Header `💳 Wallet` | hard-coded L3955 | — |
| Balance badge | `w.balance.toFixed(2)+' SAR'`; class `b-green` if `>0` else `b-grey` | L3956 |
| `+ Add credit` button | — | L3958 |
| `− Deduct` button | — | `disabled` when `w.balance<=0` (L3958) |
| Transaction rows | `w.transactions.slice(0,6)` | **Capped at 6**, no "show more" (L3953) |
| Row · reason | `t.reason` | colour `var(--muted)` |
| Row · date | `t.date` | colour `var(--ghost)`, 9.5px |
| Row · amount | `(t.type==='credit'?'+':'−')+t.amount.toFixed(2)+' SAR'` | green for credit, red for debit (L3954); the `−` is U+2212 |
| Empty state | `'No wallet activity yet.'` | L3959 |

---

## 10. Input fields

All wallet inputs live inside the adjust modal (`openWalletAdjustModal`, L3962–L3976). **The `rwallets` page itself contains zero input elements.**

| id | Type | Label | Default | Min / Max / Step | Validation | Drives |
|---|---|---|---|---|---|---|
| `wallet-amount` | `number` | `Amount (SAR) *` (red asterisk) | empty | `min="0.01"`, `step="0.01"`; `max="<current balance>"` **only when `kind==='debit'`** (L3969) | `commitWalletAdjust` L3982: `if(!amount||amount<=0)` → toast `'⚠ Enter a valid amount'` (warn), return. The `max` is a browser hint and is **never re-checked in JS**; the real guard is `debitRiderWallet`'s balance test (F2). | The credited/debited amount; `oninput="compPreview(riderId)"` (L3969) |
| `wallet-reasoncode` | custom select (`customSelectHTML` L5336) via `csel-wallet-rc` | `Reason code` (no asterisk) | none; placeholder `'Which scenario is this for?'`; read-time fallback `'OTHER_UNCODED'` (L3984) | options = active `DB.reasonCodes` | **Not validated** — a credit can commit with no reason code selected | `compCheck` step 1 (per-scenario `comp` ceiling); `logGoodwill.reasonCode`; `onchange="compPreview(riderId)"` |
| `wallet-reason` | custom select via `csel-wallet-reason` | `Reason *` (red asterisk) | none; placeholder `'Select a reason…'` | 5 credit options / 3 debit options (§7.1, §7.2) | `commitWalletAdjust` L3983: `if(!reason)` → toast `'⚠ Pick a reason'` (warn), return | `wallet.transactions[].reason`; the goodwill test `reason.indexOf('Goodwill')>=0`; the ledger expense-account chooser (F9). **`onChangeExpr` is `''` — selecting "Goodwill" does NOT refresh `#comp-preview`.** See §18 G2. |
| `#comp-preview` | output `<div>`, not an input | — | empty | — | — | Written by `compPreview()` L15447 |

**The debit modal has no reason-code field at all** (ternary at L3970), and `compPreview` returns immediately for any reason not containing "Goodwill" (L15453), so the preview is permanently blank for debits.

---

## 11. Actions

| # | Label | Location | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|---|
| A1 | Rider name (blue) | table row L4022 | `openProfile(id)` | Navigates to the 360° profile | — | none | none | no |
| A2 | `+ Credit` | table action cell L4028 | `openWalletAdjustModal(id,'credit')` | Opens the credit modal (§13.1). Pure UI. | — | **none** (gate is on commit) | none | no |
| A3 | `+ Add credit` | profile card L3958 | `openWalletAdjustModal(d.id,'credit')` | Same as A2 | — | none | none | no |
| A4 | `− Deduct` | profile card L3958 | `openWalletAdjustModal(d.id,'debit')` | Opens the debit modal (§13.2); `disabled` when `balance<=0` | — | none | none | no |
| A5 | `Add credit` (modal footer, `success`) | L3974 | `commitWalletAdjust(riderId,'credit')` | See A5-detail | `wallet.balance`, `wallet.transactions`, `DB.auditLog`, `DB.emailOutbox`, `DB.goodwillLedger` (goodwill only), `DB.ledger`, `DB.idempotency` | **`requirePerm('contact_users')`** L3978 | `logAction('wallet_credit',…)` L3938 with `before={}`, `after={balance:w.balance}`; plus `logAction('comp_blocked',…)` on refusal L3988 | **Yes** — `guardAction('commitWalletAdjust',…)` L17889 |
| A6 | `Deduct` (modal footer, `danger`) | L3974 | `commitWalletAdjust(riderId,'debit')` | Calls `debitRiderWallet`; on `false` → toast `'⚠ Insufficient wallet balance'` (warn) and return **without closing the modal** | `wallet.balance`, `wallet.transactions`, `DB.auditLog`, `DB.ledger`, `DB.idempotency` | **`requirePerm('contact_users')`** L3978 | `logAction('wallet_debit',…)` L3948 | **Yes** — same gate, `danger:true` |
| A7 | `Cancel` (modal footer) | L3974 | `closeModal()` | Closes modal, no writes | — | none | none | no |
| A8 | `✕` (modal close) | L3966 | `closeModal()` | Closes modal | — | none | none | no |

### A5-detail — `commitWalletAdjust(riderId,'credit')`, step by step (L3977–L4009)

1. `if(!requirePerm('contact_users'))return;` (L3978). On failure `requirePerm` calls `logAction('permission_denied','permission',permKey,'Blocked — tried "Call / message riders & drivers" without permission')` (L3129) and toasts `'🔒 Your role lacks permission: Call / message riders & drivers'` (L3130).
2. `amount = parseFloat(val('wallet-amount'))` — `val()` returns a trimmed string (L8034).
3. `reason = document.getElementById('wallet-reason').value` (L3980).
4. Amount validation, then reason validation (§10).
5. `rcCode = (#wallet-reasoncode).value || 'OTHER_UNCODED'` (L3984).
6. **If** `reason.indexOf('Goodwill')>=0` (L3985):
   a. `chk = compCheck(amount, rcCode, riderId)` (F15).
   b. `!chk.ok` → `logAction('comp_blocked',…)`, toast err, **return**.
   c. `chk.needsApproval && !window.__compApproved` → set the flag, toast warn, **return**.
   d. `window.__compApproved = false; logGoodwill(riderId, amount, rcCode, reason);`
7. `creditRiderWallet(riderId, amount, reason)` (L4000) — **`actorNote` is `undefined`, so `actorNote!==false` is true and a transactional email IS sent** (L3939), subject `'Your Eyvar wallet was topped up 💳'`, category `transactional`, body naming the amount, reason and new balance.
8. Toast `'✅ '+amount.toFixed(2)+' SAR added to '+nm2(riderId)+"'s wallet"` (ok) (L4001).
9. `closeModal();` then `if(typeof openProfile==='function')openProfile(riderId);` then `renderRiderWalletsList();` (L4006–L4008). **`openProfile` fires unconditionally**, navigating away from the wallets list.

### Confirmation gate spec (`guardAction('commitWalletAdjust')`, L17889–L17898)

```
title:        (kind==='credit' ? 'Credit' : 'Debit') + ' rider wallet'
danger:       kind==='debit'
irreversible: true                → renders "⚠ This cannot be undone."
summary:      fmtSAR(amt) + ' will be ' + (credit ? 'added to' : 'taken from') + ' ' + nm2(riderId) + '’s wallet.'
consequences:
   · '<Balance increases|Balance decreases> immediately.'
   · 'The movement is written to the wallet ledger and the activity log.'
   · credit → 'If this is goodwill it counts against your authority limits and the rider’s 30-day history.'
     debit  → 'The rider sees the deduction in their app.'
confirmLabel: (credit ? 'Credit ' : 'Debit ') + fmtSAR(amt)
options:      (none declared)
```
The builder returns `null` when `parseFloat(val('wallet-amount'))||0` is falsy (L17891) → **the confirm dialog is skipped entirely for a blank/zero amount**, letting the raw handler run straight to its validation toast.

Bypass paths: `window.__skipGuards` (L17817, *"programmatic/seed calls bypass the UI gate"*) and the one-shot `__guardToken` set by `runConfirm` (L17784). `confirmAction` renders the dialog (L17769–L17801).

### Idempotency & ledger behaviour on confirm

`creditRiderWallet` and `debitRiderWallet` are **replaced** at L19979 and L19993 by wrappers over `__origCreditWallet` / `__origDebitWallet`. Each call:
- builds the key (F12) and runs `withIdempotency` (L19893);
- on a duplicate: `logAction('duplicate_suppressed','money',key,'Duplicate wallet credit suppressed — this exact operation was already completed at <time>. Attempt #N. No money moved.')`, toast warn, return the cached result **without moving money**;
- otherwise runs the original, then `postLedger` (F9/F10). If `postLedger` rejects (F11), **the balance has already changed** and is not rolled back. See §17 R5.

---

## 12. Tables & lists

### 12.1 `#rwallets-tbody` — "All rider wallets" (markup L1025, render L4021)

| Property | Value |
|---|---|
| Columns (in order) | `Rider`, `Balance`, `Transactions`, `Last activity`, *(unlabeled action column)* — L1025 |
| Row source | `Object.keys(DB.riders).filter(id => DB.riders[id].wallet)` — L4013 |
| Sort | Descending `wallet.balance` (F6). Not user-changeable. |
| Filters | **None** |
| Search | **None** |
| Pagination | **None** — the whole list renders |
| Row click | No row-level handler; only the rider name (`.td-name`) is clickable → `openProfile(id)` (L4022) |
| Row actions | One `+ Credit` button → `openWalletAdjustModal(id,'credit')` (L4028) |
| Empty state | `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--ghost);font-size:11.5px">No rider has any wallet activity yet — add a credit from any rider's 360° profile to get started.</td></tr>` — L4029 |
| Guard | `if(!tb)return;` (L4012) — renders nothing when the markup is absent |

### 12.2 Transaction list inside `walletCardHTML` (profile page, L3953)

| Property | Value |
|---|---|
| Layout | Flex rows, not a `<table>` |
| Row source | `w.transactions.slice(0,6)` |
| Sort | Insertion order = newest-first (writes `unshift`) |
| Columns | reason + `· ` + date (left) · signed amount (right) |
| Empty state | `'No wallet activity yet.'` (L3959) |
| Row click | none |

---

## 13. Modals opened

### 13.1 `openWalletAdjustModal(riderId,'credit')` — L3962

| Element | Content |
|---|---|
| Title | `Add wallet credit — <rider.name>` (L3966) |
| Close | `✕` → `closeModal()` |
| Static line | `Current balance: <b>w.balance.toFixed(2) SAR</b>` (L3968) |
| Field 1 | `wallet-amount` — number, label `Amount (SAR) *`, `min=0.01`, `step=0.01`, **no `max`**, `oninput="compPreview(riderId)"` |
| Field 2 | `wallet-reasoncode` (custom select `csel-wallet-rc`) — label `Reason code`, placeholder `Which scenario is this for?`, options = active reason codes, `onchange="compPreview(riderId)"` |
| Field 3 | `wallet-reason` (custom select `csel-wallet-reason`) — label `Reason *`, placeholder `Select a reason…`, 5 options (§7.1), **no onchange** |
| Field 4 | `#comp-preview` — live authority panel (blank unless the chosen reason contains "Goodwill") |
| Footer 1 | `Cancel` → `closeModal()` |
| Footer 2 | `Add credit` (`btn sm success`) → `commitWalletAdjust(riderId,'credit')` |
| Commit fn | `commitWalletAdjust` L3977 |

### 13.2 `openWalletAdjustModal(riderId,'debit')` — L3962

| Element | Content |
|---|---|
| Title | `Deduct from wallet — <rider.name>` |
| Static line | `Current balance: <b>…SAR</b>` |
| Field 1 | `wallet-amount` — number, `min=0.01`, `step=0.01`, **`max="<w.balance>"`** (raw unformatted float) |
| Field 2 | *(reason-code field omitted)* |
| Field 3 | `wallet-reason` — 3 options (§7.2) |
| Field 4 | `#comp-preview` (always blank for debits) |
| Footer 1 | `Cancel` → `closeModal()` |
| Footer 2 | `Deduct` (`btn sm danger`) → `commitWalletAdjust(riderId,'debit')` |
| Commit fn | `commitWalletAdjust` L3977 |

### 13.3 Confirmation dialog (interposed before both commits)

Rendered by `confirmAction()` L17769–L17801. Structure: title (prefixed `⚠ ` when `danger`), `✕` → `cancelConfirm()`, summary paragraph, a "What happens when you confirm" block (red background when `danger`), the line `⚠ This cannot be undone.` (because `irreversible:true`), then footer `Cancel` (`cancelConfirm()`) / `<confirmLabel>` (`runConfirm()`). **No option fields** for the wallet gate.

### 13.4 `#comp-preview` panel (inside 13.1) — `compPreview()` L15447–L15462

```
Authority · <role> — per case <perCaseSAR> SAR · today <goodwillToday>/<dailySAR> SAR
This rider: <hist.count> credit(s), <hist.total.toFixed(2)> SAR in 30 days
[⛔ <blocked message>]     ← red, bold, only when compCheck blocked
[<notes joined by <br>>]   ← amber (var(--amber-dk)), only when notes exist
```
Panel background `var(--red-lt)` when blocked, else `var(--bg2)`.

---

## 14. States & badges

| Badge / indicator | Location | Exact trigger |
|---|---|---|
| Balance badge `b-green` | profile card L3956 | `w.balance > 0` |
| Balance badge `b-grey` | profile card L3956 | `w.balance <= 0` |
| Balance cell green | table L4024 | `w.balance > 0` |
| Balance cell ghost | table L4024 | `w.balance <= 0` |
| `− Deduct` disabled | profile L3958 | `w.balance <= 0` |
| Transaction amount green with `+` | L3954 | `t.type === 'credit'` |
| Transaction amount red with `−` | L3954 | `t.type === 'debit'` |
| `#comp-preview` red background | L15459 | `compCheck().blocked` is non-null |
| `#comp-preview` amber note block | L15459 | `compCheck().notes.length > 0` |
| **Sidebar badge** | — | **The `rwallets` sidebar item has no badge element** (L529 — contrast L534 which carries `sbb-contacts`) |

### Toasts emitted by this module

| Text | Type | Line |
|---|---|---|
| `⚠ Enter a valid amount` | warn | L3982 |
| `⚠ Pick a reason` | warn | L3983 |
| `⛔ <chk.blocked>` | err | L3990 |
| `⚠ Second approval required — press Confirm again to record this as an approved exception` | warn | L3993 |
| `✅ <amt> SAR added to <name>'s wallet` | ok | L4001 |
| `⚠ Insufficient wallet balance` | warn | L4003 |
| `✅ <amt> SAR deducted from <name>'s wallet` | ok | L4004 |
| `🔒 Your role lacks permission: Call / message riders & drivers` | err | L3130 |
| `⛔ Already done — this exact wallet credit was completed <age> ago. Nothing was charged again.` | warn | L19901 |
| `⛔ Ledger rejected the posting — <why>` | err | L19926 |

---

## 15. Cross-module links

### 15.1 Outbound from this module

| Target | Trigger | Line |
|---|---|---|
| 360° Profile (`openProfile`) | rider-name click; also unconditionally after every commit | L4022, L4007 |
| Activity log (`DB.auditLog` → Settings › Activity log) | every credit / debit / block | L3938, L3948, L3988 |
| Email outbox (`DB.emailOutbox` → Settings › Emails) | every UI credit — subject `'Your Eyvar wallet was topped up 💳'`, category `transactional` | L3939 |
| Goodwill ledger (Settings › Compensation policy, `#gw-ledger`) | goodwill credits only | L3997 → L15436, rendered L15470 |
| General ledger / trial balance (`DB.ledger`) | every credit and debit via the wrappers | L19985, L19996 |
| Idempotency store (`DB.idempotency`) | every credit and debit | L19905 |
| Money rejects (`DB.moneyRejects`) | unbalanced or unknown-account posting | L19923 |

### 15.2 Inbound — every other writer of a rider wallet

| Source module | Function | Line | Direction | Amount |
|---|---|---|---|---|
| Promos & Growth — referrals | `processReferral` | L3868 | credit | `DB.referralConfig.referrerBonus` |
| Promos & Growth — referrals | `processReferral` | L3869 | credit | `DB.referralConfig.refereeBonus` |
| Subscriptions — cancellation | `commitCancelSub` | L5563 | credit | computed net refund (also `recordRefund` at L5562) |
| Riders — welcome offer | `confirmWelcomeOffer` | L11184 | credit | **hard-coded `10`** |
| Live map — cancel live trip | cancel handler | L11838 | **debit** | `rule.feeAmount` from `getCancellationRule(ruleId)`; on failure `logAction('wallet_debit',…,'insufficient wallet balance, added to next trip charge')` (L11840) |
| Plan commitment — emergency dispatch | `acceptEmergency` | L17337 | credit | `d.riderCompensation`; also `logGoodwill(d.riderId, d.riderCompensation, 'CAP_NOSHOW', 'Policy compensation — automatic, not agent discretion')` (L17339) |
| PDPL erasure | `erasureBlockers` | L15970 | **read only** — a positive balance blocks account erasure: `'<bal> SAR must be refunded or spent before closure'` | — |

All programmatic credit call sites pass `actorNote=false` (suppressing the rider email) **except L17337**, which passes only three arguments and therefore does send it.

### 15.3 `recordRefund` relationship

`recordRefund` (L3176) is a **separate ledger from the wallet**. Header comment L3172–L3175: *"Records an actual refund line in the financial ledger — separate from the audit-log entry for the same cancellation (that records the admin action; this records the money movement itself, which Finance needs as its own reconcilable list, not buried inside a text description)."*

It is **not called by anything on the rider-wallets page, nor by `commitWalletAdjust`.** Its only call site is `commitCancelSub` L5562, immediately followed by a *separate* `creditRiderWallet` at L5563 — so a subscription cancellation produces **both** a `REF-` line and a wallet credit for the same money (§17 R9).

Its gate spec is at L17900–L17907: `title:'Issue refund'`, `danger:true`, `irreversible:true`, consequences *"Money leaves Eyvar and returns to the rider's payment method." / "A sequential credit note is issued against the original tax invoice, reversing the VAT." / "The amount appears in contribution margin as a giveback."*, `confirmLabel:'Refund '+fmtSAR(amount)`.

Side effects of `recordRefund`: `DB.refunds.unshift(entry)` (L3192); `issueCreditNote(entry)` → `DB.creditNotes[cn.id]`, `DB.creditNoteSequence++`, `logAction('credit_note_issued',…)` (L15886), and `pushOpsNotification('warn','Credit note without an invoice — …')` when no original invoice is found (L15891–L15893); then `renderRefundsTable()` (L3199) and `renderCreditNotes()` (L3201).

---

## 16. Hardcoded / mock / demo values

| # | Value | Line | Note |
|---|---|---|---|
| M1 | `RDR-1041` wallet `{balance:20, tx "Referral bonus — referred Sara Al-Ghamdi", date '18 Jul 09:30'}` | L2594 | Seed. The date `18 Jul` is **after** the frozen "today" of 25 Jun 2026. |
| M2 | `RDR-2087` wallet `{balance:17.30, tx "Trip cancellation refund", date '19 Jun 10:52'}` | L2599 | Seed |
| M3 | KPI 3 sub-label `'this session'` | L4018 | Hard-coded; counts seeded transactions too, so the label is wrong |
| M4 | KPI 1 sub-label `'across all riders'` | L4016 | Hard-coded |
| M5 | `recordRefund` `date:'25 Jun'` | L3182 | Hard-coded, with an explicit comment naming it a frozen demo clock |
| M6 | `recordRefund` `status:'Processed'` | L3190 | Never any other value |
| M7 | `REQ_NOW_REF = new Date(2026,5,25,9,14,0)` | L14600 | Frozen clock feeding every `wallet.transactions[].date` via `fmtReqNowLabel()` |
| M8 | `DB.refunds` seed: `REF-0002` 69.20 SAR (`RDR-2087`, SUB-0998); `REF-0001` 73.50 SAR (`RDR-2055`, SUB-0987) | L2882–L2883 | Demo refunds. **Neither has a matching wallet transaction** — `RDR-2087`'s seeded wallet credit is 17.30, not 69.20. |
| M9 | Welcome-offer credit `10` SAR | L11184 | Hard-coded, not policy-driven |
| M10 | `DB.vatConfig = {registrationNumber:'310123456700003', companyLegalName:'Eyvar Technologies LLC', companyAddress:'Riyadh, Saudi Arabia', ratePct:15}` | L13971 | Demo VAT registration |
| M11 | `DB.goodwillLedger = []` | L15391 | No seeded history → every ceiling starts at 0 on each reload |
| M12 | `DB.ledger = []`, `DB.idempotency = {}`, `DB.moneyRejects = []` | L19879–L19881 | Session-only, in memory |
| M13 | Block comment L19856–L19859: *"This is a model, not an accounting system. Its purpose is to be an unambiguous specification for the backend: these accounts, these postings, these keys."* | L19856 | Self-declared mock |
| M14 | All state is in-memory `DB.*`. **No persistence** — every balance resets on reload. | — | No `localStorage`, no `fetch` anywhere in the wallet path |

---

## 17. Financial risks & unguarded operations

| # | Risk | Evidence | Impact |
|---|---|---|---|
| **R1** | **`creditRiderWallet` accepts a negative amount.** No sign check exists in L3932–L3940. `commitWalletAdjust` blocks `amount<=0` (L3982), but **no programmatic caller validates**. | L3936 | A negative "credit" silently drives the balance below zero, bypassing `debitRiderWallet`'s insufficiency guard entirely, and posts a reversed ledger entry that still balances (F11 passes). |
| **R2** | **The second-approval flag is a bare global with no binding.** `window.__compApproved` (L3992–L3997) is keyed to nothing — not rider, amount, reason code, or actor. | L3992–L3997 | Trip the flag on rider A with a 250 SAR goodwill credit, then immediately credit rider B 250 SAR — B's credit is authorised by A's "second press". The flag also lives on `window`, so it survives navigation. |
| **R3** | **The idempotency window is one second.** `Math.floor(nowMs()/1000)` is part of the key. | F12; L19980, L19994 | Two identical credits ~1.1 s apart produce different keys and both execute. The protection only catches double-clicks inside the same wall-clock second. |
| **R4** | **The only permission gate on moving rider money is `contact_users`**, labelled *"Call / message riders & drivers"* (L3236) / *"Call or message a rider or driver directly from their profile."* (L3255). | L3978 | `Support` (`USR-3`, `USR-4`, L2835–L2838) holds `['manage_tickets','view_profiles','contact_users']` — no finance permission — yet can credit and debit wallets. `Finance` (`USR-2`, L2833) **lacks `contact_users`** and therefore cannot adjust a wallet at all. The permission is semantically unrelated to money. |
| **R5** | **No rollback when the ledger rejects a posting.** `postLedger` returns `null` and toasts, but `__origCreditWallet`/`__origDebitWallet` have already mutated the balance and pushed the transaction. | L19982–L19989 vs L19919–L19927 | Wallet balance and general ledger diverge with no reconciliation path. `DB.moneyRejects` records the refusal; nothing reverses the balance. |
| **R6** | **Reading a wallet creates one.** `getRiderWallet` writes `{balance:0,transactions:[]}` into `DB.riders[id]` on a plain read. | L3929 | Merely opening a rider's 360° profile (L4185 → L3952) permanently adds that rider to `#rwallets-tbody` (filter L4013). The list grows by browsing. |
| **R7** | **Every wallet credit is expensed as goodwill.** The account chooser (F9) falls through to `'expense.goodwill'` for any reason not matching `/goodwill\|apolog/i` or `/compensat/i`. | L19981–L19984 | Referral bonuses, promo redemptions, manual top-ups and subscription refunds are all booked to `expense.goodwill`. Goodwill-spend and contribution-margin reporting are materially overstated. |
| **R8** | **Every wallet debit is recognised as fare revenue.** | L19996–L19999 | A debit reasoned `'Correction — issued in error'` (§7.2 option 1) credits `revenue.fares`. Reversing a mistaken credit fabricates revenue. |
| **R9** | **A subscription cancellation books the same money twice.** `recordRefund` (contra-revenue + VAT reversal + cash out, F8) and `creditRiderWallet` (goodwill expense + wallet liability, F9) both fire for one `refund` figure. | L5562–L5563 | Cash is shown leaving the gateway while an equal wallet liability is simultaneously created for the same amount. |
| **R10** | **`compCheck` is bypassed unless the reason label contains the literal string "Goodwill".** The test is `reason.indexOf('Goodwill')>=0` on free text. | L3985 | Selecting `Manual top-up` or `Promo code redemption` moves any amount with **no per-case ceiling, no daily ceiling, no per-rider pattern check, and no goodwill-ledger entry** — only `contact_users` and the confirm dialog stand in the way. |
| **R11** | **Role-key mismatch makes the `Operations` tier unreachable.** `DB.compPolicy.roles` keys are `Owner / Operations / Support / Finance / default` (L15380–L15386); seeded `DB.teamUsers[].role` values are `Owner / Finance / Support / Support / Ops Manager` (L2831–L2840). | `compLimitsFor` L15397 | `Yousef Al-Balawi` (`USR-5`, role `'Ops Manager'`) falls through to `default` — 50 SAR per case / 300 daily — not the intended 200/2000. The `Operations` row is dead configuration. |
| **R12** | **The debit `max` attribute is client-side only** and is set from the unformatted float. | L3969, L3945 | Not exploitable through this UI (F2 still guards), but `max` implies a validation that does not exist in JS, and can render as e.g. `max="17.299999999999997"`. |
| **R13** | **Audit `before` is always empty for wallet moves.** `logAction('wallet_credit',…,{},{balance:w.balance})` passes `{}`. | L3938, L3948 | `auditDiffHTML` (L3153–L3170) treats an empty-but-truthy `before` as a normal change and prints only differing fields — so the prior balance is never recorded and cannot be reconstructed from the log. |
| **R14** | **`WTX` ids are `'WTX-'+Date.now()`.** | L3937, L3946 | Two writes in the same millisecond — e.g. the two `processReferral` credits at L3868–L3869 — can produce colliding transaction ids. |
| **R15** | **`REF-` ids derive from array length** with `unshift` insertion. | L3181, L3192 | Correct only while nothing is ever removed from `DB.refunds`; any removal produces a duplicate id. |
| **R16** | **No page-level permission on `rwallets`.** Every operator sees every rider's balance and the platform's total wallet liability. | L8814 | Contrast the driver-wallets cash actions, which call `requirePagePerm('wallets','cash_review')` (L12148) and `requirePagePerm('wallets','cash_repayment')` (L12189). |
| **R17** | **`commitWalletAdjust` navigates away on success.** `openProfile(riderId)` fires unconditionally. | L4007 | An operator crediting from the wallets list is thrown onto the rider profile; the following `renderRiderWalletsList()` then runs against a hidden page. Breaks batch work and can mask a second failed adjustment. |
| **R18** | **The rider is emailed before the ledger posting is validated.** `sendSystemEmail` runs inside `__origCreditWallet` (L3939), which completes before `postLedger` (L19985). | L3939 vs L19985 | If the posting is rejected (F11), the rider has already been told their balance rose. |
| **R19** | **`window.__skipGuards` disables every confirmation dialog globally**, including the wallet gate. | L17817 | Any code path (or console line) that sets it removes the only confirmation standing between a click and a money movement. |

---

## 18. Gaps, dead code, UNVERIFIED items

| # | Item | Evidence |
|---|---|---|
| G1 | **`subs.rwallets` is missing.** The `subs` map (L2169) has `wallets:'Driver payout management'` but no `rwallets` key, so `#tb-sub` renders `''`. | L2169 → L8786 |
| G2 | **Selecting "Goodwill / apology credit" does not refresh the authority preview.** `customSelectHTML('csel-wallet-reason','wallet-reason',…,'','Select a reason…','')` passes an **empty `onChangeExpr`** (L3972), while the amount and reason-code fields both call `compPreview`. | L3969, L3970 vs L3972 |
| G3 | **`compPreview` is a no-op until "Goodwill" is already selected** (`if(reason.indexOf('Goodwill')<0){el.innerHTML='';return;}` L15453). Combined with G2, the preview only ever appears if the operator picks "Goodwill" first and *then* edits the amount or reason code. | L15453 |
| G4 | **`balanceAfter` is written but never read.** No reader exists anywhere in the file. | L3937, L3946 |
| G5 | **`recordRefund` is unreachable from this page.** No button, link or handler on `p-rwallets` invokes it; its gate spec (L17900) is exercised only via `commitCancelSub`. | L5562 is the sole call site |
| G6 | **No export on the wallets table.** The panel has `exportData`/`buildCSV` and `exportContacts` (L15058) but nothing for wallets. | L1020–L1029 |
| G7 | **No pagination or virtualisation.** Every wallet-bearing rider renders. Safe at demo scale (2 seeded), unbounded in production. | L4021 |
| G8 | **UNVERIFIED — `comp` default for runtime-created reason codes.** `DB.reasonCodes.push({code:code,ref:null,cat:'Other',target:'rider',tier:'T3',…})` at L15120 continues past the excerpt read; whether it sets `comp` is not established. If `comp` is `undefined`, F15 step 1 does not block (it tests `rc.comp===0`), and `rcCompCap` (L14741) would return `null`. |
| G9 | **UNVERIFIED — full `PERMISSION_LABELS` map.** Only the two `contact_users` entries (L3236, L3255) were read; other keys are out of this module's scope. |
| G10 | **UNVERIFIED — `customSelectHTML` internals.** Defined L5336. Its call signature `(cselId, fieldId, options, selectedValue, placeholder, onChangeExpr, extraClass)` is established from usage, and reads such as `document.getElementById('wallet-reason').value` prove it emits an element with `id === fieldId` carrying a `.value`. The body was not read, so whether that element is a `<select>` or a hidden `<input>` is unconfirmed. |
| G11 | **UNVERIFIED — `toast()` signature.** `toast(msg, type, onClick, sticky)` is inferred from call sites (e.g. L12138); the body was not read. |
| G12 | **`window.__compApproved` is never initialised.** The first read at L3992 is `undefined` (falsy) — the behaviour is correct by accident, not declaration. | L3992 |
| G13 | **`fmtSAR` and `.toFixed(2)` are used interchangeably.** The gate dialog uses `fmtSAR(amt)` (L17893, defined L4394 as `n.toFixed(2)+' SAR'`) while the toasts use `amount.toFixed(2)+' SAR'` — identical output, two code paths. | L4394, L4001 |

---

## 19. Line-number index

| Line(s) | What |
|---|---|
| L529 | Sidebar item, i18n `nav.rwallets` |
| L1020–L1029 | `#p-rwallets` page markup |
| L1021 | `.ph` header + sub-copy |
| L1022 | `#rwallets-kpis` container |
| L1025 | Table head + `#rwallets-tbody` |
| L2168 | `titles.rwallets` |
| L2169 | `subs` map (no `rwallets` key) |
| L2594 | Seed wallet — `RDR-1041` |
| L2599 | Seed wallet — `RDR-2087` |
| L2831–L2840 | `DB.teamUsers` roles & permissions |
| L2881–L2884 | `DB.refunds` seed |
| L3122–L3132 | `can()` / `requirePerm()` |
| L3133–L3151 | `logAction()` |
| L3153–L3170 | `auditDiffHTML()` |
| L3172–L3204 | `recordRefund()` (comment + body) |
| L3236, L3255 | `PERMISSION_LABELS.contact_users` |
| L3565 | `nm2()` |
| L3578–L3584 | `sendSystemEmail()` |
| L3860–L3876 | `processReferral()` → wallet credits L3868–L3869 |
| L3928–L3931 | `getRiderWallet()` |
| L3932–L3940 | `creditRiderWallet()` |
| L3941–L3950 | `debitRiderWallet()` |
| L3951–L3961 | `walletCardHTML()` |
| L3962–L3976 | `openWalletAdjustModal()` |
| L3977–L4009 | `commitWalletAdjust()` |
| L4010–L4030 | `renderRiderWalletsList()` |
| L4185 | Wallet card injected into the 360° profile |
| L4394 | `fmtSAR()` |
| L5336 | `customSelectHTML()` |
| L5562–L5563 | Subscription cancellation → `recordRefund` + `creditRiderWallet` |
| L8034 | `val()` |
| L8774–L8828 | `window.go()` router |
| L8814 | Router branch for `rwallets` |
| L9645–L9650 | `fmtReqNowLabel()` |
| L11184 | Welcome-offer 10 SAR credit |
| L11838–L11843 | Live-trip cancellation-fee debit |
| L13971 | `DB.vatConfig` |
| L14600 | `REQ_NOW_REF` frozen clock |
| L14627 | `nowMs()` |
| L14630–L14635 | `fmtAge()` |
| L14667–L14715 | `DB.reasonCodes` (40 entries) |
| L14721–L14743 | `rcById`, `rcTierObj`, `rcTargets`, `rcCompCap`, `rcLabel` |
| L15379–L15391 | `DB.compPolicy`, `DB.goodwillLedger` |
| L15393–L15398 | `currentRole()`, `compLimitsFor()` |
| L15400–L15409 | `goodwillToday()`, `goodwillForRider()` |
| L15412–L15434 | `compCheck()` |
| L15436–L15445 | `logGoodwill()` |
| L15447–L15464 | `compPreview()` |
| L15466+ | `renderCompPolicyTable()` / `#gw-ledger` |
| L15862–L15895 | `issueCreditNote()` |
| L15970 | Wallet balance as a PDPL erasure blocker |
| L17336–L17341 | Delay-compensation credit + `logGoodwill` |
| L17769–L17801 | `confirmAction()` |
| L17782–L17794 | `cancelConfirm()` / `runConfirm()` |
| L17817–L17838 | `window.__skipGuards`, `guardAction()` |
| L17889–L17898 | Gate spec for `commitWalletAdjust` |
| L17900–L17907 | Gate spec for `recordRefund` |
| L19865–L19878 | `ACCOUNTS` chart |
| L19879–L19881 | `DB.ledger`, `DB.idempotency`, `DB.moneyRejects` |
| L19883 | `r2()` |
| L19889–L19908 | `idemKey()`, `withIdempotency()` |
| L19917–L19932 | `postLedger()` |
| L19933–L19946 | `accountBalance()` |
| L19962–L19977 | `recordRefund` idempotency + ledger wrapper |
| L19978–L19991 | `creditRiderWallet` wrapper |
| L19992–L20003 | `debitRiderWallet` wrapper |
