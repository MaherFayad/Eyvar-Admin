# Module: Finance

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `finance` — sidebar route `go('finance', this)` (`L527`)
> **Page container:** `<div class="page" id="p-finance">` — **HTML `L928`–`L965`**
> **Render entry:** `if(id==='finance'){renderRefundsTable();renderContributionCard();renderCreditNotes();}` (`L8815`)
> **Sibling modules:** [12b — Driver Wallets](./12b-driver-wallets.md) · [12c — Rider Wallets](./12c-rider-wallets.md)

---

## 1. Purpose

The Finance page is the platform's **revenue-and-giveback ledger view**. It answers four separate questions on one screen:

1. **What did we bill and what is our headline take?** — the KPI strip (`L930`–`L940`) and the *Revenue by plan* table (`L949`–`L960`), both entirely hardcoded demo figures.
2. **What do we actually keep after everything we hand back?** — the *Contribution margin* card (`L941`–`L944`), computed live by `contributionMargin()` (`L15718`–`L15740`).
3. **What money went back to riders?** — the *Refunds ledger* (`L961`–`L964`), rendered from `DB.refunds` by `renderRefundsTable()` (`L3203`).
4. **Was the VAT on that money reversed?** — the *Credit notes* card (`L945`–`L948`), rendered from `DB.creditNotes` by `renderCreditNotes()` (`L15921`).

The page itself is **read-only**: it contains no buttons that move money. Every money movement it displays is *created elsewhere* (subscription cancellation at `L5562`, the wallet modal at `L4000`, cash reconciliation at `L12088`) and merely *reported* here. The one interactive element is the credit-note row, which opens a read-only tax-document modal (`openCreditNoteModal`, `L15892`).

Also documented here (assigned scope): the `DB.payments` collection (`L2694`–`L2704`), `payTable()` (`L3737`) and `buildPayProfile()` (`L4364`), which are the payment-record renderers used inside 360° profiles.

---

## 2. Entry points & routing

| # | Entry | Line | Mechanism |
|---|-------|------|-----------|
| 1 | Sidebar item "Finance" (`sec.finance` group) | `L526`–`L527` | `onclick="go('finance',this)"`, label `data-i18n="nav.finance"` |
| 2 | `go('finance', …)` router hook | `L8815` | Calls `renderRefundsTable()`, `renderContributionCard()`, `renderCreditNotes()` |
| 3 | Ops notification deep-link — "Credit note without an invoice" | `L15887`–`L15889` | `pushOpsNotification('warn', …, function(){go('finance',null);})` |
| 4 | Toolbar title / subtitle | `L2168` (`finance:'Finance'`), `L2169` (`finance:'June 2026'`) | Set by `go()` at `L8809`–`L8810` |
| 5 | Back-navigation | `pushHistory()` `L7015` / `goBack()` `L7014` | `navCurrent={type:'page',id:'finance'}` (`L8806`) |

**Boot-time rendering (partial — a real gap):** the boot sequence at `L14585` calls `renderRefundsTable()` only. `renderContributionCard()` and `renderCreditNotes()` are **not** in the boot list (`L14565`–`L14600`); they first run when the user navigates to the page. `backfillCreditNotes()` (`L15945`) runs via `gapsBoot2()` (`L16311`), registered in the module boot registry at `L21814` with `needs:['creditNotes','erasureRequests','massEvents']`.

**Page permission definition:** `finance:{label:'Finance',icon:'💰',legacy:'view_finance',perms:[{key:'view',label:'View financial reports'}]}` (`L10629`). The page render path does **not** call `requirePagePerm('finance','view')` anywhere — the permission is declared but never enforced on entry (see §17, R17).

---

## 3. Layout map

Top-to-bottom order of `#p-finance` (`L928`–`L965`):

| Order | Block | Lines | Container | Content source |
|-------|-------|-------|-----------|----------------|
| 1 | Page header `.ph` — h1 "Finance", sub "Revenue and commissions — June 2026" | `L929` | static | **hardcoded** |
| 2 | KPI grid `.g4` — 4 tiles | `L930`–`L935` | static | **all 4 hardcoded** |
| 3 | KPI grid `.g3` — 3 tiles | `L936`–`L940` | static | **all 3 hardcoded** |
| 4 | Card "📉 Contribution margin — what the business actually keeps" | `L941`–`L944` | `#contribution-body` | `renderContributionCard()` `L15741` |
| 5 | Card "🧾 Credit notes" + sub-note "Issued automatically against every refund" | `L945`–`L948` | `#creditnotes-body` | `renderCreditNotes()` `L15921` |
| 6 | Card "Revenue by plan" | `L949`–`L960` | static `<table id="finance-revenue-table">` | **entirely hardcoded, 4 rows** |
| 7 | Card "💸 Refunds ledger" + counter `#refunds-total` | `L961`–`L964` | `#refunds-table` | `renderRefundsTable()` `L3203` |

---

## 4. Data model & fields

### 4.1 `DB.refunds` — refund ledger (seed `L2881`–`L2884`; entries created by `recordRefund` `L3176`)

| Field | Type | Unit/Currency | Meaning | Line |
|-------|------|---------------|---------|------|
| `id` | string | — | `'REF-'+String(DB.refunds.length+1).padStart(4,'0')` — **not gapless, see §17 R5** | `L3181` |
| `date` | string | — | **Hardcoded `'25 Jun'`** — "frozen demo clock" | `L3182` |
| `riderId` | string | — | `RDR-*` key into `DB.riders` | `L3183` |
| `riderName` | string | — | Snapshot of `DB.riders[riderId].name`, falls back to the raw id | `L3178`, `L3184` |
| `amount` | number | **SAR**, positive magnitude (sign implied "money out") | Refund amount | `L3185` |
| `reason` | string | — | Free-form / from the cancellation reason select | `L3186` |
| `source` | string | — | Origin channel, e.g. `'Subscription cancellation'` | `L3187` |
| `relatedId` | string \| null | — | The subscription/trip/payment this reverses | `L3188` |
| `processedBy` | string | — | `DB.teamUsers.find(u.id===CURRENT_USER_ID).name`, else the raw id | `L3179`, `L3189` |
| `status` | string | — | **Always literal `'Processed'`** — no other value is ever written | `L3190` |
| `creditNote` | string | — | Back-reference `CN-nnnn`, set at `L3197` if `issueCreditNote` returned one | `L3196`–`L3198` |

Seed rows (`L2882`–`L2883`):
- `REF-0002` · 19 Jun · `RDR-2087` Layla Al-Faraj · **69.20 SAR** · reason `Rider request` · source `Subscription cancellation` · rel `SUB-0998` · by Sarah Al-Rashid · `Processed`
- `REF-0001` · 18 Jun · `RDR-2055` Bandar Al-Harbi · **73.50 SAR** · reason `Driver unavailable` · source `Subscription cancellation` · rel `SUB-0987` · by Sarah Al-Rashid · `Processed`

Neither seed row carries a `creditNote` field.

### 4.2 `DB.creditNotes` — object keyed by `CN-nnnn` (`L15847`), sequence `DB.creditNoteSequence` (`L15848`)

| Field | Type | Unit/Currency | Meaning | Line |
|-------|------|---------------|---------|------|
| `id` | string | — | `'CN-'+seq.padStart(4,'0')` | `L15869` |
| `noteNumber` | string | — | `'EYV-CN-'+new Date().getFullYear()+'-'+seq.padStart(6,'0')` — **gapless by construction** | `L15870` |
| `refundId` | string | — | Source `REF-*` | `L15871` |
| `againstInvoice` | string \| null | — | `inv.invoiceNumber` or `null` | `L15872` |
| `againstPayment` | string \| null | — | `inv.paymentId` or `null` | `L15873` |
| `buyerId` / `buyerName` | string | — | Rider identity snapshot | `L15874` |
| `reason` / `source` | string | — | Copied from the refund entry | `L15877` |
| `subtotal` | number | **SAR excl. VAT** | `round(total/(1+rate)*100)/100` | `L15866`, `L15876` |
| `vatAmount` | number | **SAR** | `round((total-subtotal)*100)/100` | `L15867`, `L15876` |
| `total` | number | **SAR incl. VAT**, positive magnitude (displayed with a `−` prefix) | `round(entry.amount*100)/100` | `L15865`, `L15876` |
| `issuedAt` | string | — | `entry.date` (i.e. `'25 Jun'`) or `fmtReqNowLabel()` | `L15877` |
| `issuedBy` | string | — | `entry.processedBy` | `L15878` |
| `unlinked` | boolean | — | `!inv` — true when no source tax invoice could be matched | `L15879` |

### 4.3 `DB.payments` — object keyed by `PAY-*` (`L2694`–`L2704`)

| Field | Type | Unit/Currency | Meaning |
|-------|------|---------------|---------|
| `id` | string | — | `PAY-*` |
| `entity` | string | — | `RDR-*` (rider charge) or `DRV-*` (driver payout) |
| `type` | string | — | One of `Subscription charge`, `Quick ride fare`, `Driver payout` |
| `amount` | **string** | SAR, e.g. `'86.50 SAR'` | **Stored as text, parsed with `parseFloat` everywhere** |
| `method` | string | — | `Visa ···4821`, `Mada ···2210`, `Apple Pay`, `Bank transfer` |
| `date` | string | — | e.g. `'19 Jun'` |
| `status` | string | — | `Paid` \| `Refunded` \| `Pending` |
| `trip` | string | — | Linked `SUB-*` / `TRP-*` / `'—'` |

Full seed enumeration (10 rows, `L2695`–`L2704`):

| ID | Entity | Type | Amount | Method | Date | Status | Trip/Sub |
|----|--------|------|--------|--------|------|--------|----------|
| PAY-5510 | RDR-1041 | Subscription charge | 86.50 SAR | Visa ···4821 | 19 Jun | Paid | SUB-1041 |
| PAY-5491 | RDR-2031 | Subscription charge | 412.00 SAR | Mada ···2210 | 12 Jun | Paid | SUB-1052 |
| PAY-5480 | RDR-1080 | Subscription charge | 41.22 SAR | Apple Pay | 01 Jun | Paid | SUB-1060 |
| PAY-5475 | RDR-2055 | Subscription charge | 29.40 SAR | Mada ···5540 | 25 Jun | Paid | TRP-7742 |
| PAY-6008 | RDR-2031 | Quick ride fare | 38.00 SAR | Mada ···2210 | 25 Jun | Paid | TRP-9008 |
| PAY-6001 | RDR-2087 | Quick ride fare | 24.50 SAR | Visa ···7766 | 25 Jun | Paid | TRP-9012 |
| PAY-5988 | RDR-2087 | Subscription charge | 86.50 SAR | Visa ···7766 | 12 Jun | **Refunded** | SUB-0998 |
| PAY-5977 | RDR-2055 | Subscription charge | 122.50 SAR | Mada ···5540 | 11 Jun | **Refunded** | SUB-0987 |
| PAY-6010 | RDR-2090 | Quick ride fare | 15.75 SAR | Mada ···9013 | 25 Jun | Paid | TRP-9005 |
| PAY-W640 | **DRV-0101** | Driver payout | 640 SAR | Bank transfer | 25 Jun | **Pending** | — |

### 4.4 `DB.invoices` (`L13973`), `DB.invoiceSequence` (`L13972`), `DB.vatConfig` (`L13971`)

`DB.vatConfig = {registrationNumber:'310123456700003', companyLegalName:'Eyvar Technologies LLC', companyAddress:'Riyadh, Saudi Arabia', ratePct:15}` — `L13971`.

Invoice fields written by `getOrCreateInvoice()` (`L4396`–`L4415`): `invoiceNumber`, `paymentId`, `issuedAt`, `buyerName`, `buyerId`, `description`, `subtotal`, `vatAmount`, `total`, `method`. Keyed by payment id and "never regenerated" (`L13973`).

### 4.5 `ACCOUNTS` chart of accounts (`L19865`–`L19878`) + `DB.ledger` (`L19879`), `DB.idempotency` (`L19880`), `DB.moneyRejects` (`L19881`)

| Account key | Label | Type | Normal balance |
|---|---|---|---|
| `cash.gateway` | Cash at payment gateway | asset | debit |
| `ar.rider` | Rider receivable | asset | debit |
| `liability.wallet` | Rider wallet balances | liability | credit |
| `liability.driver` | Captain earnings payable | liability | credit |
| `liability.escrow` | Plan escrow held | liability | credit |
| `tax.vat_output` | VAT output payable | liability | credit |
| `revenue.fares` | Fare revenue | revenue | credit |
| `contra.refunds` | Refunds (contra revenue) | contra | **debit** (`L19945`) |
| `expense.driver_pay` | Captain earnings | expense | debit |
| `expense.goodwill` | Goodwill credits | expense | debit |
| `expense.emergency` | Emergency cover | expense | debit |
| `expense.compensation` | Rider compensation | expense | debit |

---

## 5. Money formulas — written out exactly

### 5.1 Refund creation guard (`recordRefund`, `L3177`)
```
if(!(amount>0)) return null;
```
Zero and negative amounts are rejected. There is **no upper bound** and no check that `amount ≤ the original payment`.

### 5.2 Refund ledger total (`renderRefundsTable`, `L3205`–`L3207`)
```
total = DB.refunds.reduce((s,r) => s + r.amount, 0)          // SAR, no rounding
label = DB.refunds.length + ' refund' + (len===1?'':'s') + ' · ' + fmtSAR(total) + ' total'
```
`fmtSAR(n)` = `n.toFixed(2)+' SAR'` (`L4394`) — display rounding only.

### 5.3 Subscription cancellation refund (upstream producer, `cancelSub` `L5521`–`L5531`)
```
doneParts      = (sub.trips || '0/0').split('/')
used           = parseInt(doneParts[0],10) || 0
total          = parseInt(doneParts[1],10) || 1        // guards div-by-zero
paidNum        = parseFloat(sub.paid) || 0             // SAR, parsed from a STRING like '86.50 SAR'
unusedFraction = Math.max(0, (total - used) / total)   // clamped >= 0
grossRefund    = Math.round(paidNum * unusedFraction * 100) / 100          // SAR, 2 dp
midCycleRule   = getCancellationRule('sub_mid_cycle')                       // L5533
feeApplies     = used > 0 && midCycleRule && midCycleRule.enabled && grossRefund > 0
fee            = feeApplies ? Math.round(grossRefund * (midCycleRule.feePct/100) * 100)/100 : 0
refund         = Math.round((grossRefund - fee) * 100) / 100               // SAR, 2 dp
```
`sub_mid_cycle.feePct = 10`, `enabled:true` (`L13944`). `sub_before_first_trip.feePct = 0`, `enabled:false`, `locked:true` (`L13943`) — **this rule is never read by any code**; the `used > 0` test at `L5532` is what implements "no fee before the first trip".

Commit path (`confirmCancelSub`, `L5545`–`L5567`):
```
if(refund > 0){
  recordRefund(sub.rider, refund, reason, 'Subscription cancellation', subId);            // L5562
  creditRiderWallet(sub.rider, refund, 'Subscription cancellation refund ('+subId+')', false); // L5563
}
```
**The same amount is booked twice** — once as a refund (contra-revenue + cash out) and once as a wallet credit (goodwill expense + wallet liability). See §17 R1.

### 5.4 Credit-note VAT split (`issueCreditNote`, `L15864`–`L15867`)
```
rate      = DB.vatConfig.ratePct / 100                       // 0.15
totalIncl = Math.round(entry.amount * 100) / 100             // SAR incl. VAT
subtotal  = Math.round((totalIncl / (1 + rate)) * 100) / 100 // SAR excl. VAT, 2 dp
vatAmount = Math.round((totalIncl - subtotal) * 100) / 100   // SAR, 2 dp — derived, never independently rounded
```
Sign convention: all three stored **positive**; the UI renders them with a leading `−` (`L15913`–`L15915`, `L15938`).

### 5.5 Invoice VAT split (`getOrCreateInvoice`, `L4400`–`L4404`) — the mirror of 5.4
```
totalIncl = parseFloat(p.amount) || 0     // "Saudi consumer prices are VAT-inclusive by convention" (L4400)
vatRate   = DB.vatConfig.ratePct / 100
subtotal  = Math.round((totalIncl/(1+vatRate)) * 100) / 100
vatAmount = Math.round((totalIncl - subtotal) * 100) / 100
DB.invoiceSequence++
invoiceNumber = 'EYV-' + new Date().getFullYear() + '-' + String(DB.invoiceSequence).padStart(6,'0')
```

### 5.6 Credit-note card aggregates (`renderCreditNotes`, `L15924`–`L15926`)
```
total    = SUM over DB.creditNotes of  cn.total       // SAR incl. VAT, no rounding on the sum
vat      = SUM over DB.creditNotes of  cn.vatAmount   // SAR
unlinked = count of cn where cn.unlinked === true
```
Displayed as `−total.toFixed(2) SAR`, `vat.toFixed(2) SAR`, and a warning chip when `unlinked > 0`.

### 5.7 Contribution margin (`contributionMargin`, `L15718`–`L15740`) — the page's only real financial model

```
gross      = SUM over DB.payments where p.status === 'Paid'   of (parseFloat(p.amount) || 0)      // L15719–15721
driverEarn = SUM over ALL DB.trips (NO status filter)         of (parseFloat(t.driverEarn) || 0)  // L15722–15723
net        = gross - driverEarn                                                                    // L15724

promo      = SUM over DB.promos              of (p.spent || 0)                                     // L15725
referral   = SUM over DB.referralLog         of ((r.referrerBonus||0) + (r.refereeBonus||0))       // L15726
incentive  = SUM over DB.driverBonusLog      of (b.amount || 0)                                    // L15727
refunds    = SUM over DB.refunds             of (r.amount || 0)                                    // L15728
goodwill   = SUM over DB.goodwillLedger      of  g.amount                                          // L15729
emergency  = SUM over DB.emergencyDispatches of Math.max(0,(d.replacementPay||0)-(d.recovered||0)) // L15732–15733

giveback     = promo + referral + incentive + refunds + goodwill + emergency                       // L15734
contribution = net - giveback                                                                      // L15737
headlinePct  = gross ? (net / gross) * 100 : 0                                                     // L15738
truePct      = gross ? ((net - giveback) / gross) * 100 : 0                                        // L15739
```
- **No rounding at any step** — all sums are raw float; only display uses `.toFixed(2)` / `.toFixed(1)`.
- **Currency:** SAR throughout, all magnitudes positive; the renderer prefixes `−` on every giveback line (`L15746`).
- **Zero-guard:** `gross ? … : 0` prevents division by zero for both percentages.
- **Emergency clamp:** `Math.max(0, replacementPay − recovered)` — an over-recovery never becomes negative cost.
- **Known unit mismatch, flagged in-product** (`L15767`–`L15771`): promos/incentives are month-scale seeds while `DB.payments` holds ~10 sample rows, so `giveback > net` and `truePct` goes negative. The card renders an explicit amber warning when `m.giveback > m.net` rather than hiding it.

### 5.8 Refund ledger posting (idempotency wrapper, `L19961`–`L19976`)
```
key = idemKey('refund', riderId, r2(amount), relatedId || reason || '')      // L19963
withIdempotency(key,'refund', () => {
  entry = __origRecordRefund(riderId, amount, reason, source, relatedId)
  if(entry){
    rate = (DB.vatConfig ? DB.vatConfig.ratePct : 15) / 100
    net  = r2(amount / (1 + rate))
    vat  = r2(amount - net)
    postLedger(key,'refund',[
      {account:'contra.refunds', debit: net},
      {account:'tax.vat_output', debit: vat},     // output VAT reversed
      {account:'cash.gateway',  credit: r2(amount)}
    ], {riderId, refundId:entry.id, creditNote:entry.creditNote})
  }
  return entry
})
```
`r2(n) = Math.round((n||0)*100)/100` (`L19883`). The posting balances exactly because `net + vat === r2(amount)` by construction.

### 5.9 Ledger balance guard (`postLedger`, `L19918`–`L19932`)
```
dr = SUM postings.debit ; cr = SUM postings.credit
if(unknownAccounts.length || r2(dr) !== r2(cr)){
   -> push to DB.moneyRejects, logAction('ledger_rejected'), toast err, return null   // NOTHING WRITTEN
}
entry = {id:'JE-'+String(DB.ledger.length+1).padStart(5,'0'), ref, type, tsMs, postings, meta, total:r2(dr)}
DB.ledger.unshift(entry)
```

### 5.10 Account balance (`accountBalance`, `L19934`–`L19947`)
```
debitNormal = (type==='asset' || type==='expense' || type==='contra')
balance = r2( debitNormal ? dr - cr : cr - dr )
```

### 5.11 Fare capture posting (`postFareCapture`, `L20030`–`L20050`) — the model the backend is meant to mirror
```
gross = r2(parseFloat(t.fare) || 0);  if(!gross) return null
rate  = vatConfig.ratePct/100 ;  net = r2(gross/(1+rate)) ;  vat = r2(gross-net)
drv   = r2(parseFloat(t.driverEarn) || 0)

JE 1 'fare_capture'   : debit cash.gateway gross | credit revenue.fares net | credit tax.vat_output vat
JE 2 'driver_accrual' : debit expense.driver_pay drv | credit liability.driver drv    (only if drv)
```

### 5.12 Reconciliation vs. the flat money arrays (`ledgerReconcile`, `L20057`–`L20068`)
```
walletTotal   = SUM over DB.riders of (r.wallet ? r.wallet.balance : 0)
refundTotal   = SUM over DB.refunds of (r.amount || 0)
goodwillTotal = SUM over DB.goodwillLedger of g.amount

rows = [
  {label:'Rider wallet balances', ops:r2(walletTotal),   ledger:accountBalance('liability.wallet')},
  {label:'Refunds issued',        ops:r2(refundTotal),   ledger:accountBalance('contra.refunds') + accountBalance('tax.vat_output')*0},
  {label:'Goodwill credits',      ops:r2(goodwillTotal), ledger:accountBalance('expense.goodwill')}
]
each row: row.diff = r2(row.ops - row.ledger)
```
⚠ The `+ accountBalance('tax.vat_output')*0` term at `L20065` is **multiplied by zero** — it contributes nothing. As written, `ops` (VAT-inclusive refund total) is compared against `contra.refunds` (VAT-**exclusive**), so this row shows a permanent non-zero `diff` equal to the VAT component. See §17 R10.

### 5.13 Commission / take-rate constants that touch this page

| Constant | Value | Where used | Line |
|---|---|---|---|
| `DB.vatConfig.ratePct` | `15` (%) | Invoice + credit-note VAT split, refund ledger posting | `L13971` |
| `DB.plans.weekly.eyvarPct` | `20` (%) | Plan config (not read by this page's arithmetic) | `L2890` |
| `DB.plans.biweekly.eyvarPct` | `18` (%) | " | `L2892` |
| `DB.plans.monthly.eyvarPct` | `15` (%) | " | `L2894` |
| `CASH_COMMISSION_RATE` | `0.20` | Cash-debt commission (Driver Wallets module) | `L12076` |
| Static "Eyvar %" column | `20% / 18% / 15% / 18.1%` | *Revenue by plan* table — **hardcoded text** | `L954`–`L957` |
| Headline "19.2% avg" | KPI decoration — **hardcoded** | `L932` |

**Observed inconsistency:** the hardcoded *Revenue by plan* total row states `Eyvar 8,752` / `18.1%` (`L957`), while the KPI tile above states `Eyvar net (Jun) 9,246` / `19.2% avg` (`L932`) and `Driver payouts 38,984` (`L933`) versus the table's `Drivers 39,478` (`L957`). Three of the four numbers disagree. All are static strings; none are computed. See §16 and §17 R12.

---

## 6. Financial state machines

### 6.1 Payment status (`DB.payments[*].status`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| `Paid` | **Seed only** (`L2695`–`L2704`) — no code path writes this value | (never transitioned by code) | Counted in `contributionMargin().gross` (`L15720`) and `riderLTV` (`L4033`–`L4036`) |
| `Refunded` | **Seed only** (`L2701`, `L2702`) | — | **Excluded** from `gross`; excluded from `riderLTV` |
| `Pending` | **Seed only** (`L2704`, driver payout `PAY-W640`) | — | Not counted anywhere |

⚠ **No function anywhere in the file mutates `DB.payments[x].status`.** `recordRefund` does *not* flip the source payment to `Refunded`. Confirmed by grep — the only writes to `DB.payments` are seed literals and per-entity id arrays. This is a genuine state-machine gap (§17 R2).

Badge rendering (`statusBadge`, `L3730`–`L3736`), applied in `payTable` (`L3752`) and `buildPayProfile` (`L4366`):
```
/done|resolved|closed/i  -> b-green
/trip|active/i           -> b-blue
/late|expir|pend/i       -> b-amber      <- 'Pending' matches here
/cancel|risk|refund/i    -> b-red        <- 'Refunded' matches here
otherwise                -> b-grey       <- 'Paid' falls through to GREY
```
⚠ `'Paid'` matches none of the four regexes and renders **grey**, identical to an unknown status.

### 6.2 Refund status (`DB.refunds[*].status`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| `Processed` | At creation, unconditionally (`L3190`); seeds also use it (`L2882`–`L2883`) | **No exit — terminal, single-state** | Adds to `refunds` giveback in `contributionMargin` (`L15728`); posts `contra.refunds` debit + `tax.vat_output` debit + `cash.gateway` credit (`L19969`–`L19973`) |

There is no `Pending`, `Failed`, or `Reversed` refund state. Rendered via `statusBadge('Processed')` → **grey** (`L3219`).

### 6.3 Credit-note state (`DB.creditNotes[*].unlinked`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| **linked** (`unlinked:false`) | `findInvoiceForRefund(entry)` returned an invoice (`L15863`, `L15879`) | never changes | VAT reversal is attributable to an original tax invoice |
| **unlinked** (`unlinked:true`) | `findInvoiceForRefund` returned `null` | **No code path ever sets it back to `false`** | Note stands alone; `logAction` records "NO ORIGINAL INVOICE FOUND, needs finance review" (`L15883`–`L15885`) and `pushOpsNotification('warn', …)` fires (`L15887`–`L15889`) |

The modal (`L15906`) states: *"This credit note stands alone until finance links it"* — but **no linking UI exists anywhere in the file** (§19 G5).

### 6.4 Idempotency state (`DB.idempotency[key]`, `L19893`–`L19910`)

| State | Entered when | Exits to | Money effect |
|-------|--------------|----------|--------------|
| absent | first time a key is seen | → recorded | Operation executes, result stored (`L19908`) |
| recorded (`attempts:1`) | after `fn()` returns | → duplicated | — |
| duplicated (`attempts:n>1`) | same key seen again (`L19895`–`L19897`) | stays duplicated | **No money moves.** `logAction('duplicate_suppressed', …)` (`L19898`–`L19901`) + warn toast (`L19902`–`L19903`); the *original* result is returned (`L19904`) |

Refund key: `'refund|'+riderId+'|'+r2(amount)+'|'+(relatedId||reason||'')` (`L19963`) — **no timestamp component**, so it suppresses forever within the session.

### 6.5 Ledger posting outcome (`postLedger`, `L19918`)

| State | Entered when | Money effect |
|-------|--------------|--------------|
| accepted | all accounts known **and** `r2(SUMdebit) === r2(SUMcredit)` | `JE-#####` unshifted onto `DB.ledger` (`L19931`) |
| **rejected** | unknown account **or** debits ≠ credits (`L19921`) | Nothing written to `DB.ledger`; pushed to `DB.moneyRejects` (`L19924`), `logAction('ledger_rejected')` (`L19925`), error toast (`L19926`) |

---

## 7. Reason codes & categories — full enumeration

### 7.1 Refund `reason` values reachable from the UI

Sourced from the *Cancel & refund* modal's select `csn-reason` (`L5540`–`L5542`) and passed straight through to `recordRefund(…, reason, …)` (`L5562`):

| Value | Label | Effect |
|-------|-------|--------|
| `Rider request` | Rider request | **Default selection** (`L5542`); stored verbatim as `refund.reason` and copied to `creditNote.reason` (`L15877`) |
| `Driver unavailable` | Driver unavailable | same |
| `Payment dispute` | Payment dispute | same |
| `Other` | Other | same |

Additional `reason` values that reach `DB.refunds` from non-UI paths:

| Value | Origin | Line |
|---|---|---|
| `'Duplicate-click test'` | `demoDoubleRefund()` diagnostic | `L20134`–`L20135` |

### 7.2 Refund `source` values

| Value | Origin | Line |
|---|---|---|
| `'Subscription cancellation'` | `confirmCancelSub` | `L5562` |
| `'demo'` | `demoDoubleRefund` | `L20134` |

`recordRefund` is called from exactly these two sites (grep-verified: `L5562`, `L20134`, `L20135`).

### 7.3 `DB.cancellationPolicy` — the rules that size a refund (`L13936`–`L13945`)

| id | appliesTo | Scenario | Fee | Enabled | Locked | Effect on this module |
|----|-----------|----------|-----|---------|--------|----------------------|
| `qr_before_assigned` | quick_ride | Rider cancels before a driver is assigned | `feeAmount:0` | ❌ | ✅ | none (quick-ride path) |
| `qr_grace_period` | quick_ride | Cancels within grace after acceptance | `feeAmount:0`, `graceMin:2` | ✅ | — | none |
| `qr_after_grace` | quick_ride | Cancels after grace, before arrival | `feeAmount:5` | ✅ | — | drives a wallet **debit** (`L11831`, `L11838`) |
| `qr_after_arrival` | quick_ride | Cancels after driver arrived | `feeAmount:10` | ✅ | — | rule exists; `L11831` maps only `qr_after_grace`/`qr_rider_noshow` |
| `qr_driver_fault` | quick_ride | Driver cancels/declines/times out | `feeAmount:0` | ❌ | ✅ | none |
| `qr_rider_noshow` | quick_ride | Rider no-show past timeout | `feeAmount:10` | ✅ | — | drives a wallet **debit** (`L11831`) |
| `sub_before_first_trip` | subscription | Cancelled before any trip taken | `feePct:0` | ❌ | ✅ | **never read by any code** |
| `sub_mid_cycle` | subscription | Cancelled mid-cycle, some trips used | `feePct:10` | ✅ | — | **the only rule that shapes a refund**, `L5533`–`L5535` |

### 7.4 `DB.reasonCodes` — the taxonomy that gates goodwill (`L14667`–`L14716`)

Full 40-row enumeration. Columns: `code` · `ref` (guide §) · `cat` · `target` · `tier` · `fr` (first-response min) · `res` (resolution min) · `upd` (update cadence min) · **`comp` (goodwill ceiling, SAR)** · `owner`.

| # | code | ref | cat | target | tier | fr | res | upd | **comp** | owner |
|---|------|-----|-----|--------|------|----|-----|-----|------|-------|
| 1 | `CAP_CANCEL_ADV` | 1.1 | Captain | rider | T2 | 10 | 240 | — | **25** | Supply |
| 2 | `CAP_LATE` | 1.2 | Captain | rider | T3 | 15 | 240 | 15 | **15** | Ops |
| 3 | `CAP_NOSHOW` | 1.3 | Captain | rider | T2 | 10 | 240 | — | **50** | Supply |
| 4 | `CAP_OFFPLATFORM_PAY` | 1.4 | Captain | rider | T2 | 15 | 1440 | — | **0** | Compliance |
| 5 | `CAP_CONDUCT` | 1.5 | Captain | rider | T1 | 0 | 1440 | — | **50** | Supply |
| 6 | `BKG_CANCEL_REQ` | 2.1 | Booking | rider | T4 | — | 1440 | — | **0** | — |
| 7 | `BKG_WRONG_SLOT` | 2.2 | Booking | rider | T4 | — | 1440 | — | **0** | Product |
| 8 | `BKG_NO_SUPPLY` | 2.3 | Booking | rider | T3 | 60 | 1440 | — | **20** | Supply |
| 9 | `BKG_CAPTAIN_PREF` | 2.4 | Booking | rider | T4 | — | 1440 | — | **0** | Product |
| 10 | `PAY_INCORRECT_CHARGE` | 3.1 | Payment | rider | T2 | 15 | 1440 | — | **0** | Payments |
| 11 | `PAY_DECLINED` | 3.2 | Payment | rider | T3 | 60 | 2880 | — | **0** | Payments |
| 12 | `PAY_REFUND_REQ` | 3.3 | Payment | rider | T2 | 15 | 1440 | — | **0** | Ops |
| 13 | `TRP_ROUTE_DEVIATION` | 4.1 | Trip | rider | T3 | 60 | 2880 | — | **0** | Supply |
| 14 | `TRP_LOST_ITEM` | 4.2 | Trip | rider | T3 | 15 | 2880 | 30 | **0** | Ops |
| 15 | `TRP_GHOST_COMPLETE` | 4.3 | Trip | rider | T1 | 0 | 240 | — | **0** | Supply |
| 16 | `APP_LOGIN` | 5.1 | Technical | rider | T3 | 60 | 2880 | — | **0** | Engineering |
| 17 | `APP_CRASH` | 5.2 | Technical | rider | T3 | 60 | 2880 | — | **0** | Engineering |
| 18 | `TECH_STATE_DESYNC` | — | Technical | rider | T2 | 15 | 240 | — | **20** | Engineering |
| 19 | `APP_PROMO` | 5.3 | Technical | rider | T4 | — | 4320 | — | **0** | Marketing |
| 20 | `SAF_RIDER_UNSAFE` | 6.1 | Safety | rider | T1 | 0 | 60 | — | **100** | Safety |
| 21 | `SAF_ACCIDENT` | 6.2 | Safety | **driver** | T1 | 0 | 60 | — | **100** | Safety |
| 22 | `SAF_THEFT` | 6.3 | Safety | rider | T2 | 15 | 1440 | — | **0** | Compliance |
| 23 | `FBK_COMPLAINT` | 7.1 | Feedback | rider | T3 | 60 | 2880 | — | **25** | Ops |
| 24 | `FBK_ACCOUNT_DELETE` | 7.2 | Feedback | rider | T3 | 60 | 2880 | — | **0** | Product |
| 25 | `FBK_INVOICE` | 7.3 | Feedback | rider | T4 | — | 1440 | — | **0** | Product |
| 26 | `SUB_SAME_CAPTAIN_BROKEN` | — | Subscription | rider | T2 | 15 | 1440 | — | **25** | Supply |
| 27 | `SUB_POSTPONE` | — | Subscription | rider | T4 | — | 1440 | — | **0** | — |
| 28 | `SUB_FREEZE` | — | Subscription | rider | T4 | — | 1440 | — | **0** | Product |
| 29 | `SUB_RENEWAL` | — | Subscription | rider | T4 | — | 1440 | — | **0** | — |
| 30 | `DRV_RIDER_NOSHOW` | — | Driver | driver | T3 | 60 | 1440 | — | **0** | Ops |
| 31 | `DRV_RIDER_CONDUCT` | — | Driver | driver | T2 | 15 | 1440 | — | **0** | Safety |
| 32 | `DRV_VEHICLE_DAMAGE` | — | Driver | driver | T3 | 60 | 2880 | — | **0** | Ops |
| 33 | `DRV_PAYOUT_ISSUE` | — | Driver | driver | T2 | 15 | 1440 | — | **0** | Payments |
| 34 | `DRV_RATING_DISPUTE` | — | Driver | driver | T3 | 60 | 2880 | — | **0** | Ops |
| 35 | `DRV_DEDUCTION_DISPUTE` | — | Driver | driver | T2 | 15 | 1440 | — | **0** | Ops |
| 36 | `DRV_SUSPENSION_APPEAL` | — | Driver | driver | T2 | 15 | 1440 | — | **0** | Compliance |
| 37 | `DRV_DOC_HELP` | — | Driver | driver | T3 | 60 | 2880 | — | **0** | Compliance |
| 38 | `CORP_BILLING` | — | Corporate | corp | T3 | 60 | 2880 | — | **0** | Finance |
| 39 | `CORP_EMPLOYEE_MGMT` | — | Corporate | corp | T4 | — | 2880 | — | **0** | — |
| 40 | `OTHER_UNCODED` | — | Other | rider | T3 | 60 | 2880 | — | **0** | Ops |

All 40 have `active:true`. Money effect: `compCheck` (`L15412`–`L15434`) **blocks** any goodwill credit whose reason code has `comp===0` — except `OTHER_UNCODED`, which is explicitly exempted (`L15415`: `rc.comp===0 && rc.code && rc.code!=='OTHER_UNCODED'`). See 12c §7.

---

## 8. KPIs & metrics

### 8.1 Static KPI strip — `.g4` (`L930`–`L935`). **All four are hardcoded strings.**

| # | Label | Value | Delta line | Bar width | Source | On click |
|---|-------|-------|-----------|-----------|--------|----------|
| 1 | Gross revenue (Jun) | `48,230` (SAR, unit not shown) | `↑ 18% vs May` (class `up`) | `78%`, `kf-b` | **hardcoded** `L931` | `kpiScrollTo('finance-revenue-table')` |
| 2 | Eyvar net (Jun) | `9,246` (SAR), `color:var(--blue)` | `19.2% avg` (class `neu`) | `19%`, `kf-b` | **hardcoded** `L932` | `kpiScrollTo('finance-revenue-table')` |
| 3 | Driver payouts | `38,984` (SAR), `color:var(--teal)` | `80.8% avg share` (class `up`) | `81%`, `kf-t` | **hardcoded** `L933` | `go('wallets',null)` |
| 4 | Pending payouts | `6,420` (SAR), `color:var(--amber)` | `Due this week` (class `dn`) | `55%`, `kf-a` | **hardcoded** `L934` | `go('wallets',null)` |

### 8.2 Static KPI strip — `.g3` (`L936`–`L940`). **All three hardcoded.**

| # | Label | Value | Delta line | Source | On click |
|---|-------|-------|-----------|--------|----------|
| 5 | Held in subscription escrow | `501.98` (SAR), amber | `2 plans in progress` | **hardcoded** `L937` | `go('wallets',null)` |
| 6 | Ready to release | `362.58` (SAR), blue | `2 plans fully delivered` | **hardcoded** `L938` | `go('wallets',null)` |
| 7 | Deductions (Jun) | `65.00` (SAR), red | `Late pickups & no-shows` | **hardcoded** `L939` | `go('wallets',null)` |

**Cross-check against live data:** `renderEscrow()` (12b) computes from `DB.escrowHolds` (`L2802`–`L2805`, `L8909`–`L8912`): `heldSum = 69.20 + 69.20 = 138.40`, `readySum = 329.60 + 32.98 = 362.58`. Tile 6 (`362.58`) **matches exactly**; tile 5 (`501.98`) matches nothing — the sum of all four holds is `500.98`. Tile 7 (`65.00`) equals the sum of all three seeded deductions (15 + 30 + 20), but `renderDeductions()` sums only `status==='pending'` rows = `45.00` (`L8951`–`L8953`; `DED-03` is already `applied`, `L2810`). See §17 R12.

### 8.3 Refunds ledger counter — `#refunds-total` (`L962`, written at `L3207`)

| Metric | Formula | Unit | Source |
|--------|---------|------|--------|
| Refund count + total | `DB.refunds.length + ' refund(s) · ' + fmtSAR(SUM r.amount) + ' total'` | count + SAR | `DB.refunds` (`L3205`–`L3207`) |

No threshold, no colour change. Styled `font-size:10.5px;color:var(--ghost)`.

### 8.4 Credit-notes header strip (`renderCreditNotes`, `L15927`–`L15932`)

| Metric | Formula | Unit | Threshold / colour |
|--------|---------|------|--------------------|
| Notes issued | `Object.keys(DB.creditNotes).length` | count | ink |
| Credited | `−(SUM cn.total).toFixed(2)` | SAR incl. VAT | always `var(--red)` |
| VAT reversed | `(SUM cn.vatAmount).toFixed(2)` | SAR | ink |
| ⚠ not linked to an invoice | count where `cn.unlinked` | count | **rendered only when `> 0`**, `var(--amber-dk)`, `font-weight:600` (`L15931`) |

### 8.5 Contribution-margin card (`renderContributionCard`, `L15741`–`L15773`)

Line items in render order (`L15752`–`L15764`), each SUM per §5.7:

| Row | Label | Sub-note | Sign shown | Colour |
|-----|-------|----------|-----------|--------|
| 1 | Gross bookings | — | + | ink |
| 2 | Captain earnings | — | **−** | red |
| 3 | **Gross margin** *(bold, 1px divider)* | — | `net.toFixed(2) SAR · headlinePct.toFixed(1)%` | `var(--blue)` |
| 4 | Promo spend | *campaign budgets consumed* | **−** | red |
| 5 | Referral bonuses | *both sides of every referral* | **−** | red |
| 6 | Captain incentives | *bonuses actually paid* | **−** | red |
| 7 | Refunds | *money returned to riders* | **−** | red |
| 8 | Goodwill credits | *apology credits issued by agents* | **−** | red |
| 9 | Emergency cover | *replacement premium not recovered from absent captains* | **−** | red |
| 10 | **Contribution margin** *(bold, 13px)* | — | `contribution.toFixed(2) SAR · truePct.toFixed(1)%` | **green if `contribution >= 0`, red otherwise** (`L15763`) |

Two explanatory blocks follow:
- Always shown (`L15765`–`L15766`): a paragraph contrasting `headlinePct` (gross margin) with the below-the-line givebacks.
- **Conditional threshold** (`L15767`–`L15771`): rendered **only when `m.giveback > m.net`** — an amber panel stating "⚠ The ratio is not meaningful on this dataset" and explaining the seed-scale mismatch.

---

## 9. Data displayed

| Element | DB path / source | Type | Unit | Notes |
|---------|------------------|------|------|-------|
| h1 "Finance" | literal `L929` | text | — | hardcoded |
| Sub "Revenue and commissions — June 2026" | literal `L929` | text | — | hardcoded; toolbar sub is separately `subs.finance='June 2026'` (`L2169`) |
| KPI tiles 1–7 | literals `L931`–`L939` | text | SAR / % | **all hardcoded**, see §8.1/§8.2 |
| Contribution rows 1–10 | `contributionMargin()` `L15718` | number | SAR + % | computed live, see §5.7 |
| Credit-notes summary strip | `DB.creditNotes` | number | count / SAR | `L15927`–`L15932` |
| Credit-note row: `noteNumber` | `cn.noteNumber` | string | — | `L15936` |
| Credit-note row: `unlinked` chip | `cn.unlinked` | boolean | — | `<span class="b b-amber">unlinked</span>` `L15936` |
| Credit-note row: `buyerName · againstInvoice · reason` | `cn.*` | string | — | `againstInvoice` falls back to the literal `'no invoice'` (`L15937`) |
| Credit-note row: amount | `cn.total` | number | SAR incl. VAT | rendered `−{total.toFixed(2)} SAR`, red (`L15938`) |
| Revenue-by-plan: Weekly row | literals `L954` | text | subs 68 · trips 934 · gross 18,540 · Eyvar 3,708 · 20% · drivers 14,832 | **hardcoded** |
| Revenue-by-plan: Bi-weekly row | literals `L955` | text | 48 · 684 · 19,680 · 3,542 · 18% · 16,138 | **hardcoded** |
| Revenue-by-plan: Monthly row | literals `L956` | text | 26 · 264 · 10,010 · 1,502 · 15% · 8,508 | **hardcoded** |
| Revenue-by-plan: **Total row** | literals `L957` | text | 142 · 1,882 · 48,230 · 8,752 · 18.1% · 39,478 | **hardcoded footer**, `font-weight:500;background:var(--bg2)` |
| `#refunds-total` | computed `L3205`–`L3207` | text | count + SAR | |
| Refund row: Date | `r.date` | string | — | `white-space:nowrap` (`L3213`) |
| Refund row: Rider | `rowLink(r.riderId, r.riderName)` | link | — | `L3214`; `rowLink` at `L3283` → `openProfile(id)` |
| Refund row: Amount | `fmtSAR(r.amount)` | number | SAR | `font-weight:500;color:var(--red)` (`L3215`) |
| Refund row: Source | `r.source` + optional `' · '+rowLink(r.relatedId)` | text + link | — | `L3216` |
| Refund row: Reason | `r.reason` | text | — | muted 11px (`L3217`) |
| Refund row: Processed by | `r.processedBy` | text | — | `L3218` |
| Refund row: Status | `statusBadge(r.status)` | badge | — | always `'Processed'` → **grey** (`L3219`) |

### Payment renderers (in scope, rendered inside 360° profiles, not on `#p-finance`)

| Element | Source | Line |
|---|---|---|
| `payTable(ids, ctxId)` columns: Payment ID · Type · Amount · Method · Date · Status | `DB.payments[pid]` | `L3749`, `L3751`–`L3752` |
| Empty state (no ids) | `'No payments in this panel\'s records.'` | `L3739` |
| **Orphan-reconciliation empty state** | If `reconcileEntity(ctxId)` returns a row with `label==='Total paid'` and `severity==='orphan'`: *"**No payment records held here**, although the billing aggregate reports {row.stored} SAR paid. Any refund calculated from this screen would be wrong — pull the ledger from billing first."* | `L3740`–`L3745` |
| `buildPayProfile(d)` — kvCard "Payment" | `Payment ID`, `Type`, `Amount` (bold), `Method`, `Date`, `Status`(badge) | `L4366` |
| `buildPayProfile(d)` — kvCard "Linked" | `Entity` = `rowLink(d.entity,nm2(d.entity))+' · '+d.entity`; `Trip / Sub` = `rowLink(d.trip)` or `'—'` when `d.trip==='—'` | `L4367` |

---

## 10. Input fields

**The `#p-finance` page contains zero `<input>`, `<select>`, or `<textarea>` elements.** Verified across `L928`–`L965`.

Inputs that *produce* the data this page shows live in other modules:

| id | Type | Label | Default | Unit | Validation | Drives | Line |
|----|------|-------|---------|------|------------|--------|------|
| `csn-reason` | custom select (`customSelectHTML` `L5336`) | *Cancellation reason* | `'Rider request'` | — | none — falls back to `'Rider request'` if the element is missing (`L5554`) | `refund.reason` → `creditNote.reason` | `L5540`–`L5542` |
| `wallet-amount` | `number` | *Amount (SAR)* | empty | SAR | `min="0.01" step="0.01"`; on debit also `max="{w.balance}"` | goodwill/refund credit (12c) | `L3970` |
| `wallet-reasoncode` | custom select | *Reason code* | empty | — | falls back to `'OTHER_UNCODED'` (`L3991`) | `compCheck` ceiling | `L3971` |
| `wallet-reason` | custom select | *Reason* | empty | — | required (`L3982`) | `refund.reason` / wallet tx reason | `L3972` |

---

## 11. Actions

### 11.1 On-page actions (`#p-finance`)

| # | Label / element | Handler | Money effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| 1 | KPI "Gross revenue (Jun)" | `kpiScrollTo('finance-revenue-table')` (`L14535`) | **none** | none | none | none | no |
| 2 | KPI "Eyvar net (Jun)" | `kpiScrollTo('finance-revenue-table')` | **none** | none | none | none | no |
| 3 | KPI "Driver payouts" | `go('wallets',null)` | **none** — navigation | `navStack` (`L7015`) | none | none | no |
| 4 | KPI "Pending payouts" | `go('wallets',null)` | **none** | `navStack` | none | none | no |
| 5 | KPI "Held in subscription escrow" | `go('wallets',null)` | **none** | `navStack` | none | none | no |
| 6 | KPI "Ready to release" | `go('wallets',null)` | **none** | `navStack` | none | none | no |
| 7 | KPI "Deductions (Jun)" | `go('wallets',null)` | **none** | `navStack` | none | none | no |
| 8 | Credit-note row (whole row, `cursor:pointer`) | `openCreditNoteModal(c.id)` (`L15892`) | **none** — read-only document | none | none | none | no |
| 9 | Refund row → Rider cell | `openProfile(riderId)` via `rowLink` (`L3283`) | **none** | `navStack` | none | none | no |
| 10 | Refund row → Source `relatedId` link | `openProfile(relatedId)` | **none** | `navStack` | none | none | no |

**`kpiScrollTo(elId)`** (`L14535`–`L14543`): `scrollIntoView({behavior:'smooth',block:'center'})`, then removes/re-adds `.kpi-flash-target` (forcing reflow via `void el.offsetWidth` so the CSS animation restarts on a repeat click) and strips it again after `1500 ms`.

### 11.2 Off-page actions that write to this module's data

| # | Action | Handler | Money effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| A | "Confirm cancel" in *Cancel & refund* modal | `confirmCancelSub(subId, refund, fee)` (`L5545`) | **YES — refunds `refund` SAR AND credits the same amount to the wallet** (`L5562`–`L5563`) | `DB.subscriptions[subId].status='Cancelled'`, `DB.refunds`, `DB.creditNotes`, `DB.riders[x].wallet`, `DB.ledger` ×2, `DB.auditLog` ×3+ | `requirePerm('manage_subscriptions')` (`L5546`) | `logAction('cancel_subscription', …)` `L5559`; plus `credit_note_issued` `L15883`; plus `wallet_credit` `L3937` | ✅ modal `L5536`–`L5546`, with an irreversibility banner (`L5539`) |
| B | Goodwill/refund wallet credit | `commitWalletAdjust(riderId,'credit')` (`L3977`) | **YES** | `DB.riders[x].wallet`, `DB.goodwillLedger`, `DB.ledger` | `requirePerm('contact_users')` (`L3978`) | `logAction('wallet_credit')` `L3937`; `comp_blocked` on refusal `L3995` | ✅ via `guardAction('commitWalletAdjust', …)` `L17888`–`L17897` |
| C | `recordRefund` direct call | `recordRefund(riderId,amount,reason,source,relatedId)` (`L3176`, overridden `L19962`) | **YES** | `DB.refunds`, `DB.creditNotes`, `DB.ledger`, `DB.idempotency`, `DB.auditLog` | **⚠ NONE — `recordRefund` performs no permission check of its own** | `credit_note_issued` (`L15883`); `duplicate_suppressed` on replay (`L19898`) | ✅ via `guardAction('recordRefund', …)` `L17901`–`L17908` — unless `window.__skipGuards` is true |
| D | `demoDoubleRefund()` | `L20131`–`L20141` | **YES — issues a real 25.00 SAR refund** against `Object.keys(DB.riders)[0]` | `DB.refunds`, `DB.creditNotes`, `DB.ledger` | none | yes (via C) | no explicit confirm of its own |
| E | `postFareCapture(tripId)` | `L20030` | Ledger-only (no operational balance changes) | `DB.ledger`, `DB.idempotency` | none | none | no |
| F | `ledgerBoot()` | `L20145` | Posts a fare capture for every non-cancelled trip at boot | `DB.ledger` | none | none | no — runs with `__skipGuards=true` (`L21833`) |

**`guardAction` mechanics** (`L17819`–`L17838`): wraps `window[name]`; if `window.__skipGuards` is true **or** `__guardToken === name`, the original runs immediately. Otherwise `builder(...args)` produces a spec; a `null` spec lets the call through unguarded; a non-null spec routes through `confirmAction(spec)` and the original runs only inside `spec.onConfirm`. The token is cleared in a `finally` (`L17835`).

**`recordRefund` gate spec** (`L17901`–`L17908`):
- title `'Issue refund'`, `danger:true`, `irreversible:true`
- summary: `fmtSAR(amount) + ' will be refunded to ' + nm2(riderId) + '.'`
- consequences (3): *"Money leaves Eyvar and returns to the rider's payment method."* · *"A sequential credit note is issued against the original tax invoice, reversing the VAT."* · *"The amount appears in contribution margin as a giveback."*
- confirmLabel: `'Refund ' + fmtSAR(amount)`
- **No `options` array** — no reason field, no notify toggle.

---

## 12. Tables & lists

### 12.1 Revenue by plan — `<table id="finance-revenue-table">` (`L951`–`L959`)

- **Ordered columns (7):** `Plan` · `Active subs` · `Trips` · `Gross (SAR)` · `Eyvar (SAR)` · `Eyvar %` · `Drivers (SAR)`
- **Row source:** **static HTML literals** — no JS ever writes into this table.
- **Rows:** Weekly (`L954`), Bi-weekly (`L955`), Monthly (`L956`).
- **Totals/footer row:** `L957` — `Total · 142 · 1,882 · 48,230 · 8,752 · 18.1% · 39,478`, styled `font-weight:500;background:var(--bg2)`. Column colour rules: Eyvar column `var(--blue)`, Drivers column `var(--teal)`.
- **Filters / sorts / search:** none.
- **Row click / row actions:** none.
- **Empty state:** not applicable (static).
- **Scroll target:** referenced by `kpiScrollTo('finance-revenue-table')` from KPIs 1 and 2.

### 12.2 Refunds ledger — `#refunds-table` (`L963`, rendered `L3203`–`L3225`)

- **Wrapper:** `<div class="tbl-scroll"><table class="dt">` (`L3212`) — horizontal scroll container, **no `max-height`**, so the list is unbounded vertically.
- **Ordered columns (7):** `Date` · `Rider` · `Amount` · `Source` · `Reason` · `Processed by` · `Status`
- **Row source:** `DB.refunds.map(...)` — **insertion order**, newest first, because `recordRefund` uses `unshift` (`L3192`).
- **Sort:** implicit newest-first; **no sort control**.
- **Filters / search:** **none**.
- **Row click:** none on the `<tr>`; two inline links (Rider cell, `relatedId` in Source cell) call `openProfile`.
- **Row actions:** none — no void, no reverse, no re-issue.
- **Totals/footer:** no `<tfoot>`; the total lives in the card header `#refunds-total` (§8.3).
- **Empty state** (`L3209`): `<div style="padding:20px;text-align:center;font-size:11.5px;color:var(--ghost)">No refunds issued this session.</div>` — the wording says *"this session"* although two rows are seeded at `L2882`–`L2883`, so this state is only reachable if the seed array is emptied.

### 12.3 Credit notes — `#creditnotes-body` (`L947`, rendered `L15921`–`L15943`)

- **Not a `<table>`** — a summary strip plus a flex-row list.
- **Summary strip** (`L15927`–`L15932`): Notes issued · Credited · VAT reversed · conditional unlinked warning. Bottom-bordered `.5px solid var(--border)`.
- **Row layout** (`L15935`–`L15938`): left = `noteNumber` (+ optional `unlinked` amber chip) over `buyerName · againstInvoice|'no invoice' · reason`; right = `−{total} SAR` in red.
- **Row source:** `Object.keys(DB.creditNotes).map(...)` — **object-key insertion order** (`CN-0001`, `CN-0002`, …), i.e. **oldest first**, the opposite of the refunds table.
- **Filters / sorts / search:** none.
- **Row click:** whole row, `cursor:pointer` → `openCreditNoteModal(c.id)`.
- **Row actions:** none.
- **Totals/footer:** the summary strip is a header, not a footer; no per-column totals.
- **Empty state** (`L15941`): *"No credit notes yet. One is generated automatically for every refund from now on — including the VAT split, so the output tax already declared gets reversed instead of quietly staying declared."*

### 12.4 `payTable(ids, ctxId)` (`L3737`–`L3754`) — used in rider/driver profiles

- **Wrapper:** `<div class="tbl-scroll" style="max-height:380px;overflow-y:auto">` (`L3749`)
- **Ordered columns (6):** `Payment ID` · `Type` · `Amount` · `Method` · `Date` · `Status`
- **Row source:** `ids.forEach(pid => DB.payments[pid])`; a missing id is silently skipped (`L3750` `if(!p)return;`).
- **Row click:** `onclick="openProfile(p.id)"`, `cursor:pointer` (`L3752`).
- **Totals:** **none** — no sum row despite being a money table.
- **Empty states:** two variants, see §9.

---

## 13. Modals opened

### 13.1 Credit note document — `openCreditNoteModal(cnId)` (`L15892`–`L15920`)

- **Title:** `🧾 Credit note — {cn.noteNumber}` (`L15897`), with `.modal-close` → `closeModal()`
- **Seller block** (`L15899`–`L15901`): `DB.vatConfig.companyLegalName` · `companyAddress` · `VAT Reg. No: {registrationNumber}`
- **Document block** (`L15902`–`L15904`): label "Credit note No.", `cn.noteNumber`, `cn.issuedAt`
- **Context panel** (`L15905`–`L15910`) — background switches to `var(--amber-lt)` when `cn.unlinked`, else `var(--bg2)`:
  - if `unlinked`: *"⚠ **No original tax invoice found.** This credit note stands alone until finance links it. A credit note that reverses nothing cannot be filed — it must be matched to the invoice that carried the output VAT."*
  - else: `Issued against tax invoice <b>{againstInvoice}</b> · payment {againstPayment}`
  - always appended: `Customer: <b>{buyerName}</b> · {buyerId}` and `Reason: {reason}` (+ `' · '+source` when present)
- **Amount table** (`L15911`–`L15915`), 3 rows, all right-aligned:

  | Label | Value |
  |---|---|
  | Amount credited (excl. VAT) | `−{cn.subtotal.toFixed(2)} SAR` |
  | VAT reversed ({vatConfig.ratePct}%) | `−{cn.vatAmount.toFixed(2)} SAR` |
  | **Total credited** *(bold)* | `−{cn.total.toFixed(2)} SAR`, `color:var(--red)` |

- **Footer disclaimer** (`L15916`): *"Phase-1 document. ZATCA Phase-2 clearance (signed XML, cryptographic stamp, reporting to Fatoora) is not implemented here and would be handled by the e-invoicing integration, not this panel."*
- **Buttons:** one — `Close` → `closeModal()` (`L15917`)
- **Preview logic:** none (static document)
- **Commit function:** **none — this modal writes nothing.**
- **Fields:** **no inputs.**

### 13.2 Cancel & refund (upstream producer) — `cancelSub(subId)` (`L5518`–`L5546`)

Documented here because it is the sole UI producer of `DB.refunds` rows.

- **Title:** `Cancel & refund — {subId}` (`L5537`)
- **Warning banner** (`L5539`): red — *"**This cannot be undone.** {rider.name}'s subscription will be terminated and remaining trips voided. Riders can't do this themselves — you're cancelling on their behalf."*
- **Preview rows:**

  | Row | Value | Line |
  |---|---|---|
  | Trips used | `sub.trips` (e.g. `'2/5'`) | `L5540` |
  | Refund before fee | `{grossRefund.toFixed(2)} SAR` + `' (fully used)'` when `grossRefund<=0` | `L5541` |
  | Mid-cycle cancellation fee ({feePct}%) | `−{fee.toFixed(2)} SAR` red — **only when `feeApplies`** | `L5542` |
  | *(else)* explainer | `'Mid-cycle fee is currently disabled in Settings.'` if `used>0`, else `'No trips used yet — full refund, no fee applies.'` | `L5542` |
  | **Net refund to wallet** *(bold, top border)* | `{refund.toFixed(2)} SAR` — green if `refund>0`, else muted | `L5543` |

- **Field:** `csn-reason`, custom select, label *Cancellation reason*, 4 options (§7.1), default `'Rider request'` (`L5542`)
- **Buttons:** `Keep subscription` → `closeModal()`; `Confirm cancel` (`.btn danger sm`) → `confirmCancelSub(subId, refund, fee)` — **the computed `refund` and `fee` are baked into the onclick string at render time** (`L5546`)
- **Commit function:** `confirmCancelSub` (`L5545`)

### 13.3 Invoice modal — `openInvoiceModal(paymentId)` (`L4429`+)

Opened from payment records; renders the `DB.vatConfig` header (`L4436`), `subtotal`, `VAT ({ratePct}%)` (`L4440`), `total`, and `invoiceQRData(inv)` (`L4417`–`L4427`) as a readable 5-field list (Seller · VAT No. · Timestamp · Total incl. VAT · VAT amount) rather than a fake scannable QR — explicitly documented as a stand-in at `L4418`–`L4424`.

### 13.4 Confirmation gate modal — `confirmAction(spec)` / `runConfirm()` (`L17800`–`L17812`)

Generic gate used by `recordRefund` (§11.2 C). `runConfirm()` harvests every `spec.options` field by `document.getElementById('cfa-'+f.id)`, coercing `checkbox`→`.checked`, `number`→`parseFloat`, else `.value`; stores them on `window.__confirmValues`; sets `__guardToken`; runs the original inside `try/finally`. `cancelConfirm()` (`L17802`) clears `__confirmPending` and closes the modal without running anything.

---

## 14. States & badges

| Badge / visual | Exact trigger | Class / colour | Line |
|---|---|---|---|
| Refund status pill | `statusBadge('Processed')` → matches none of the 4 regexes | `b-grey` | `L3219`, `L3730`–`L3736` |
| Refund amount, red | unconditional | `font-weight:500;color:var(--red)` | `L3215` |
| `unlinked` chip on a credit note | `cn.unlinked === true` | `<span class="b b-amber">unlinked</span>`, `font-size:9px` | `L15936` |
| Credit-note amount, red | unconditional | `color:var(--red);font-size:11.5px` | `L15938` |
| Credit-notes "⚠ n not linked to an invoice" | `unlinked > 0` | `color:var(--amber-dk);font-weight:600` | `L15931` |
| Credit-note modal amber context panel | `cn.unlinked === true` | `background:var(--amber-lt)` | `L15905` |
| Contribution margin value green | `m.contribution >= 0` | `var(--green)` | `L15763` |
| Contribution margin value red | `m.contribution < 0` | `var(--red)` | `L15763` |
| Amber "ratio is not meaningful" panel | `m.giveback > m.net` | `var(--amber-lt)` / `var(--amber-dk)` | `L15767`–`L15771` |
| Gross-margin row blue | unconditional | `var(--blue)` | `L15754` |
| Giveback lines red with `−` prefix | `neg` arg true on `line()` | `var(--red)` | `L15745`–`L15746` |
| KPI delta `up` / `neu` / `dn` | **hardcoded class per tile** | `.kpi-dl up/neu/dn` | `L931`–`L939` |
| KPI flash on scroll-to | `.kpi-flash-target` added, removed after 1500 ms | CSS animation | `L14539`–`L14542` |
| Payment status: `Paid` | falls through `statusBadge` | **`b-grey`** | `L3735` |
| Payment status: `Pending` | `/late\|expir\|pend/i` | `b-amber` | `L3733` |
| Payment status: `Refunded` | `/cancel\|risk\|refund/i` | `b-red` | `L3734` |
| `payTable` orphan warning | `reconcileEntity(ctxId)` row `Total paid` has `severity==='orphan'` | `<b style="color:var(--red)">` | `L3742`–`L3744` |

---

## 15. Cross-module links

**Outbound from `#p-finance`:**

| From | To | Mechanism | Line |
|---|---|---|---|
| KPI 3 "Driver payouts" | `wallets` (12b) | `go('wallets',null)` | `L933` |
| KPI 4 "Pending payouts" | `wallets` | `go('wallets',null)` | `L934` |
| KPI 5 "Held in subscription escrow" | `wallets` | `go('wallets',null)` | `L937` |
| KPI 6 "Ready to release" | `wallets` | `go('wallets',null)` | `L938` |
| KPI 7 "Deductions (Jun)" | `wallets` | `go('wallets',null)` | `L939` |
| Refund row → Rider | 360° rider profile | `rowLink(riderId, riderName)` → `openProfile` | `L3214`, `L3283` |
| Refund row → `relatedId` | Subscription / trip / payment profile | `rowLink(relatedId)` | `L3216` |
| Credit-note modal → `againstInvoice` | *(text only — not a link)* | — | `L15908` |

**Inbound to Finance:**

| From | Mechanism | Line |
|---|---|---|
| Sidebar `nav.finance` | `go('finance',this)` | `L527` |
| `issueCreditNote` ops notification "Credit note without an invoice" | `pushOpsNotification('warn', …, ()=>go('finance',null))` | `L15887`–`L15889` |
| Subscription cancel flow | `recordRefund` → `DB.refunds` → this page | `L5562` |
| Rider Wallets (12c) goodwill credit | `logGoodwill` → `DB.goodwillLedger` → contribution margin | `L3999`, `L15729` |
| Driver Wallets (12b) emergency dispatch | `DB.emergencyDispatches` → contribution margin `emergency` line | `L15732` |
| Growth module promos | `DB.promos[*].spent` → contribution margin `promo` line | `L15725`, `L13495` |
| Referral program | `DB.referralLog` → contribution margin `referral` line | `L15726`, `L13888` |
| Driver incentives | `DB.driverBonusLog` → contribution margin `incentive` line | `L15727`, `L13895` |
| Settings → Ledger tab | `renderLedger()` / `ledgerReconcile()` read `DB.refunds` | `L20059`–`L20066` |
| Settings → Compensation policy | `DB.goodwillLedger` shared with contribution margin | `L15466`–`L15484` |
| Driver 360° profile "💰 Earnings breakdown" | reads `DB.escrowHolds` / `DB.deductions`, links back to `wallets` | `L4163`–`L4177` |

---

## 16. Hardcoded / mock / demo values

| # | Value | Where | Line |
|---|-------|-------|------|
| 1 | Page subtitle "Revenue and commissions — June 2026" | h1 block | `L929` |
| 2 | Toolbar sub `finance:'June 2026'` | `subs` map | `L2169` |
| 3 | KPI 1 `48,230` / `↑ 18% vs May` / bar `78%` | `.g4` | `L931` |
| 4 | KPI 2 `9,246` / `19.2% avg` / bar `19%` | `.g4` | `L932` |
| 5 | KPI 3 `38,984` / `80.8% avg share` / bar `81%` | `.g4` | `L933` |
| 6 | KPI 4 `6,420` / `Due this week` / bar `55%` | `.g4` | `L934` |
| 7 | KPI 5 `501.98` / `2 plans in progress` | `.g3` | `L937` |
| 8 | KPI 6 `362.58` / `2 plans fully delivered` | `.g3` | `L938` |
| 9 | KPI 7 `65.00` / `Late pickups & no-shows` | `.g3` | `L939` |
| 10 | Entire *Revenue by plan* table (4 rows × 7 columns = 28 literal cells) | static table | `L954`–`L957` |
| 11 | Refund date **always `'25 Jun'`** — "frozen demo clock — matches every other date in the panel" | `recordRefund` | `L3182` |
| 12 | Refund status **always `'Processed'`** | `recordRefund` | `L3190` |
| 13 | Seeded refunds `REF-0001` (73.50) / `REF-0002` (69.20) | `DB.refunds` | `L2882`–`L2883` |
| 14 | `DB.payments` — 10 seed rows, amounts stored as **strings with a ` SAR` suffix** | `DB.payments` | `L2695`–`L2704` |
| 15 | VAT config: reg. no. `310123456700003`, `Eyvar Technologies LLC`, `Riyadh, Saudi Arabia`, `ratePct:15` | `DB.vatConfig` | `L13971` |
| 16 | `invoiceQRData` is an explicit **stand-in**, not a real ZATCA TLV/QR | comment + impl | `L4417`–`L4427` |
| 17 | Credit-note modal footer disclaims ZATCA Phase-2 | modal | `L15916` |
| 18 | `demoDoubleRefund()` fires **two real 25.00 SAR refunds** against `Object.keys(DB.riders)[0]` | diagnostic | `L20131`–`L20141` |
| 19 | Contribution-card amber panel text explicitly labels the dataset as "month-scale seeds" vs "a handful of sample rows" | card | `L15768`–`L15771` |
| 20 | `ledgerBoot()` seeds the books from trip history so the trial balance is not empty on first open | boot | `L20145`–`L20151` |
| 21 | `DB.cancellationPolicy` fee amounts (5 / 10 / 10 SAR, 10 %) | policy seed | `L13939`–`L13944` |
| 22 | Notification seed `N5 'Payout batch pending' — '6,420 SAR awaiting processing for 3 drivers'` | `DB.notifications` | `L2764` |
| 23 | Comment at `L2877`–`L2880` asserts the seeded refunds reference "subscriptions that are already fully closed and outside today's active list" — but `SUB-0998` and `SUB-0987` are both present in `DB.subscriptions` with `status:'Cancelled'` | comment vs data | `L2877`, `L2691`–`L2692` |

---

## 17. Financial risks & unguarded operations

> Each item below is a concrete defect or exposure found in the code, with the line that proves it.

**R1 — Double-booking on subscription cancellation.** `confirmCancelSub` calls `recordRefund(sub.rider, refund, …)` (`L5562`) *and* `creditRiderWallet(sub.rider, refund, …)` (`L5563`) with the **same amount**. The ledger consequence: `contra.refunds` debited `net` and `cash.gateway` credited `amount` (`L19969`–`L19973`), **and** `expense.goodwill` debited `amount` with `liability.wallet` credited `amount` (`L19985`–`L19988`). The business is charged twice for one refund, and the UI text "Net refund to wallet" (`L5543`) implies only the wallet leg. `contributionMargin` then counts the same money twice — once in `refunds` (`L15728`) and once in `goodwill` (`L15729`).

**R2 — Refund never marks the source payment refunded.** No code path writes `DB.payments[x].status='Refunded'`. A fully refunded payment therefore keeps counting toward `contributionMargin().gross` (`L15720`) and `riderLTV` (`L4035`), overstating revenue and lifetime value indefinitely.

**R3 — Refund amount is unbounded.** `recordRefund` validates only `amount > 0` (`L3177`). There is no ceiling, no comparison against the original payment, and no per-role authority check — unlike goodwill credits, which run through `compCheck` role ceilings (`L15412`). A cancellation refund of any size passes.

**R4 — `recordRefund` has no permission gate.** `requirePerm` is never called inside `recordRefund` (`L3176`–`L3202`). The only protection is (a) the caller's `requirePerm('manage_subscriptions')` at `L5546`, and (b) the `guardAction` confirmation modal (`L17901`). Both are bypassable: `window.__skipGuards = true` (a plain global, `L17817`) disables the gate for every guarded action at once, and the boot block sets it to `true` for the whole seed run (`L21833`).

**R5 — Non-gapless refund IDs, with collision risk.** `'REF-'+String(DB.refunds.length+1).padStart(4,'0')` (`L3181`). Seeds are `REF-0002` and `REF-0001` with `length===2`, so the first new refund is `REF-0003` — correct only while nothing is ever removed. Any deletion or reorder produces duplicate IDs. Contrast `DB.creditNoteSequence` (`L15868`), a true monotonic counter.

**R6 — Credit-note "unlinked" is a terminal dead end.** The modal promises finance can link it (`L15906`) and the ops notification says "Finance must link it manually before filing" (`L15888`) — but **no linking UI or function exists**. Grep for any writer of `.unlinked` returns only `L15879`.

**R7 — `findInvoiceForRefund` falls back to an arbitrary invoice.** `L15851`–`L15860`: after failing to match on `k===rel || p.trip===rel || p.sub===rel`, it takes **the first payment for that rider with `status==='Paid'`** (`L15857`–`L15859`). A credit note can therefore be issued against an unrelated invoice — wrong amount, wrong period — and be marked `unlinked:false`, i.e. silently "correct". This is worse than the unlinked case it was written to avoid.

**R8 — `p.sub` is read but never exists.** `findInvoiceForRefund` tests `p.sub===rel` (`L15855`). No payment record in `DB.payments` has a `sub` field (`L2695`–`L2704`) — the subscription link is stored in `p.trip`. The clause is permanently false.

**R9 — Refund idempotency key has no time component.** `idemKey('refund', riderId, r2(amount), relatedId||reason||'')` (`L19963`). Two *legitimately distinct* refunds of the same amount to the same rider for the same reason (e.g. two 25.00 SAR "Rider request" refunds where `relatedId` is falsy) collapse to the same key and the second is **silently suppressed** with only a warn toast (`L19902`). Contrast wallet credit/debit, which append `Math.floor(nowMs()/1000)` (`L19980`, `L19994`).

**R10 — `ledgerReconcile` refund row can never balance.** `accountBalance('contra.refunds') + accountBalance('tax.vat_output')*0` (`L20064`–`L20065`) — the VAT term is multiplied by zero. `ops` is the VAT-**inclusive** refund total while `ledger` is the VAT-**exclusive** contra balance, so `diff` is permanently ≈ 13.04 % of the refund total. The comment above it (`L20051`–`L20053`) says showing the difference "is the point", but this specific difference is an arithmetic bug, not a real reconciliation break.

**R11 — Escrow and payouts never reach the books.** `liability.escrow` (`L19870`) and the payout side of `liability.driver` (`L19869`) are declared in the chart of accounts but **never posted to**. Grep confirms `liability.escrow` appears at `L19870` only. `releaseEscrow` (`L7057`), `payDriver` (`L7024`), and `confirmProcessAll` (`L7051`) mutate `DB.payouts` without any `postLedger` call. The trial balance is therefore structurally incomplete for the entire driver-money side.

**R12 — KPI tiles contradict both each other and the live data.** KPI 2 says Eyvar net `9,246` / `19.2%` (`L932`) while the table total says `8,752` / `18.1%` (`L957`). KPI 3 says driver payouts `38,984` (`L933`) while the table says `39,478` (`L957`). KPI 5 says `501.98` held in escrow (`L937`) while `renderEscrow()` computes `138.40` from `DB.escrowHolds` (`L2802`–`L2805`, `L8911`). KPI 7 says deductions `65.00` (`L939`) while the live pending sum is `45.00` (`L8951`–`L8952`). Every one of these is a static string an operator would reasonably read as current.

**R13 — Amounts stored as strings.** `DB.payments[*].amount` is `'86.50 SAR'` (`L2695`). Every consumer does `parseFloat` (`L15721`, `L4400`, `L4035`). `parseFloat('640 SAR')` for `PAY-W640` yields `640` — fine here, but the pattern means a comma-grouped string (e.g. `'1,640.00 SAR'`, which **does** appear at `L2620` in `DB.riders[*].stats.totalPaid`) would `parseFloat` to `1` with no error.

**R14 — `contributionMargin` counts driver earnings from *all* trips, including cancelled ones.** `L15722`–`L15723` reduces over `Object.keys(DB.trips)` with **no status filter**, while `gross` filters `p.status==='Paid'` (`L15721`). Cancelled trips carrying a non-zero `driverEarn` depress `net` without a matching revenue line.

**R15 — `demoDoubleRefund` is a production-reachable money mover.** `L20131`–`L20141` issues two genuine `recordRefund` calls of 25.00 SAR each against whichever rider happens to be first in `Object.keys(DB.riders)`. It is a plain global function with no permission check and no gate registered against `demoDoubleRefund` itself — though each inner `recordRefund` call *does* raise its own confirmation gate (`installActionGates`, L17901), so the operator sees two dialogs rather than none.

**R16 — Refund rows are immutable and not self-audited.** `renderRefundsTable` offers no void, reverse, or edit action (`L3212`–`L3222`), and `recordRefund` writes **no `logAction` entry of its own** — only the *credit note* is audit-logged (`L15883`). The refund itself appears in the audit trail solely as a side-effect of the caller's own `logAction` (`L5559`) or, when called directly, not at all.

**R17 — `finance` page permission declared but never enforced.** `PAGE_PERMISSIONS.finance.perms=[{key:'view'}]` (`L10629`), yet neither `go()` (`L8815`) nor any render function calls `requirePagePerm('finance','view')`. Grep for `requirePagePerm('finance'` returns nothing. `view_finance` is likewise never passed to `requirePerm` anywhere.

**R18 — Credit-note `issuedAt` inherits the frozen demo date.** `entry.date||fmtReqNowLabel()` (`L15877`), and `entry.date` is always `'25 Jun'` (`L3182`). Every credit note issued in a session carries the same date on a document whose whole purpose is tax-period attribution.

**R19 — `issueCreditNote` is called before `entry.creditNote` is set, so the ledger meta can be stale.** `recordRefund` sets `entry.creditNote=cn.id` at `L3197`, and the ledger override reads `entry.creditNote` at `L19974` — this ordering happens to work because the override wraps the *whole* original call. But `issueCreditNote` itself is also called from `backfillCreditNotes` (`L15947`), which posts **no ledger entry at all**, so backfilled notes exist with no corresponding `contra.refunds`/`tax.vat_output` posting.

---

## 18. i18n keys

| Key | English (DOM default) | Arabic | Where |
|-----|----------------------|--------|-------|
| `sec.finance` | `Finance` | `المالية` | section label `L526`; `LANG_STRINGS.ar` `L7913` |
| `nav.finance` | `Finance` | `المالية` | sidebar item `L527`; `LANG_STRINGS.ar` `L7909` |

**Scope of translation:** `LANG_STRINGS` (`L7903`) covers only the sidebar nav and section labels. The file states explicitly (`L7900`–`L7902`): *"Deep page content — tables, forms, every dynamically-built string — stays English-only; translating thousands of generated strings throughout this file is a genuinely separate, much larger project than this toggle can honestly cover."*

**Consequently, none of the following are translatable:** the `#p-finance` h1/subtitle (`L929`), all seven KPI labels and values (`L931`–`L939`), the *Revenue by plan* headers and cells (`L952`–`L957`), the card titles "📉 Contribution margin", "🧾 Credit notes", "💸 Refunds ledger" (`L942`, `L946`, `L962`), and every string emitted by `renderRefundsTable` / `renderContributionCard` / `renderCreditNotes` / `openCreditNoteModal`.

Bilingual data that *does* exist but is not surfaced on this page: `DB.reasonCodes[*].labelAr` (`L14668`–`L14716`) and `DB.plans[*].nameAr` (`L2890`, `L2892`, `L2894`).

---

## 19. Gaps, dead code, UNVERIFIED items

### Gaps
| # | Gap | Evidence |
|---|-----|----------|
| G1 | No boot render for the contribution card or credit-notes list — both are blank until the user visits the page | boot list `L14565`–`L14600` calls only `renderRefundsTable()` (`L14585`) |
| G2 | No filter, search, sort, date-range, or export on the refunds ledger | `L3212`–`L3222` |
| G3 | No pagination on the refunds ledger or credit-note list — both render every row | `L3213`, `L15934` |
| G4 | No per-column totals in `payTable` despite it being a money table | `L3749`–`L3753` |
| G5 | No credit-note ↔ invoice linking UI, despite two places telling finance to do it | `L15888`, `L15906` |
| G6 | `DB.payments` has no runtime writer — the collection is effectively read-only | grep: only seed literals and per-entity id arrays |
| G7 | `sub_before_first_trip` cancellation rule is never read | grep `getCancellationRule` → `L5533`, `L11832` only |
| G8 | `ar.rider` account is declared but never posted to | `L19867`; grep returns one hit |
| G9 | `expense.emergency` account is declared; the emergency path posts to `liability.driver` and `expense.compensation` instead | `L19875` vs `L20016`–`L20019` |
| G10 | `backfillCreditNotes` issues notes without any ledger posting | `L15945`–`L15951` vs `L19961`–`L19976` |

### Dead / unreachable code
| # | Item | Evidence |
|---|------|----------|
| D1 | `p.sub===rel` clause in `findInvoiceForRefund` — no payment has a `sub` field | `L15855` vs `L2695`–`L2704` |
| D2 | `accountBalance('tax.vat_output')*0` — multiplied by zero | `L20065` |
| D3 | `'No refunds issued this session.'` empty state — unreachable while the two seeds exist | `L3209` vs `L2882`–`L2883` |
| D4 | `statusBadge('Paid')` falls through to `b-grey` — the green branch `/done\|resolved\|closed/i` can never match a payment status | `L3731` vs `L2695` |

### UNVERIFIED
| # | Item | Why unverifiable |
|---|------|------------------|
| U1 | Whether the hardcoded KPI figures (`48,230`, `9,246`, `38,984`, `6,420`, `501.98`, `362.58`, `65.00`) were ever derived from a real dataset | No computation exists in the file and no source comment. Only their mutual inconsistency (R12) is verifiable. |
| U2 | Whether the *Revenue by plan* percentages (20 % / 18 % / 15 % / 18.1 %) are meant to mirror `DB.plans[*].eyvarPct` | The three per-plan values coincide with `L2890`/`L2892`/`L2894`, but the table is static HTML with no binding — the correspondence cannot be confirmed as intentional. |
| U3 | Runtime value of `contributionMargin()` | Depends on `DB.promos[*].spent`, `DB.driverBonusLog`, `DB.emergencyDispatches`, and `DB.goodwillLedger`, populated by other modules' boot seeds and by session activity. Not statically determinable. |
| U4 | Whether `reconcileEntity()` ever returns `severity==='orphan'` for a real entity | `reconcileEntity` is outside this module's assigned scope; the `payTable` branch at `L3742` was not traced into. |
| U5 | Whether the `finance` page renders for a user lacking `view_finance` | No gate exists (R17), so it does render — but whether that is intended or an oversight is not stated anywhere. |
| U6 | Whether `DB.promos` entries carry a `spent` field | `DB.promos` is seeded at `L13495`, outside this module's assigned read scope; `contributionMargin` reads `p.spent||0` defensively (`L15725`). |

---

## 20. Line-number index

### HTML — `#p-finance`
| Lines | Element |
|-------|---------|
| `L928` | `<div class="page" id="p-finance">` |
| `L929` | Page header — h1 "Finance", subtitle |
| `L930`–`L935` | KPI grid `.g4` (4 tiles) |
| `L931` | KPI Gross revenue (Jun) `48,230` |
| `L932` | KPI Eyvar net (Jun) `9,246` |
| `L933` | KPI Driver payouts `38,984` |
| `L934` | KPI Pending payouts `6,420` |
| `L936`–`L940` | KPI grid `.g3` (3 tiles) |
| `L937` | KPI Held in subscription escrow `501.98` |
| `L938` | KPI Ready to release `362.58` |
| `L939` | KPI Deductions (Jun) `65.00` |
| `L941`–`L944` | Card Contribution margin → `#contribution-body` |
| `L945`–`L948` | Card Credit notes → `#creditnotes-body` |
| `L949`–`L960` | Card Revenue by plan → `#finance-revenue-table` |
| `L952` | Revenue table `<thead>` (7 columns) |
| `L954`–`L956` | Revenue rows Weekly / Bi-weekly / Monthly |
| `L957` | Revenue **totals row** |
| `L961`–`L964` | Card Refunds ledger → `#refunds-total`, `#refunds-table` |
| `L965` | close `#p-finance` |
| `L526`–`L527` | Sidebar section + item |

### JavaScript
| Lines | Symbol |
|-------|--------|
| `L2168` | `titles.finance = 'Finance'` |
| `L2169` | `subs.finance = 'June 2026'` |
| `L2686`–`L2692` | `DB.subscriptions` seed (referenced by refunds) |
| `L2694`–`L2704` | `DB.payments` seed (10 rows) |
| `L2801`–`L2806` | `DB.escrowHolds` seed (cross-checked in §8.2) |
| `L2807`–`L2811` | `DB.deductions` seed (cross-checked in §8.2) |
| `L2877`–`L2884` | `DB.refunds` seed comment + 2 rows |
| `L2890`–`L2894` | `DB.plans` — `eyvarPct` 20 / 18 / 15 |
| `L3122`–`L3125` | `can(permKey)` |
| `L3126`–`L3132` | `requirePerm(permKey)` |
| `L3133`–`L3151` | `logAction(...)` |
| `L3176`–`L3202` | **`recordRefund(riderId,amount,reason,source,relatedId)`** |
| `L3203`–`L3225` | **`renderRefundsTable()`** |
| `L3226`–`L3240` | `PERMISSION_LABELS` |
| `L3241`–`L3256` | `PERMISSION_DESC` |
| `L3283` | `rowLink(id,label)` |
| `L3565` | `nm2(id)` |
| `L3730`–`L3736` | `statusBadge(s)` |
| `L3737`–`L3754` | **`payTable(ids,ctxId)`** |
| `L4033`–`L4039` | `riderLTV(d)` |
| `L4163`–`L4177` | Driver profile "💰 Earnings breakdown" card |
| `L4364`–`L4370` | **`buildPayProfile(d)`** |
| `L4394` | `fmtSAR(n)` |
| `L4396`–`L4415` | `getOrCreateInvoice(paymentId)` |
| `L4417`–`L4427` | `invoiceQRData(inv)` |
| `L4429`+ | `openInvoiceModal(paymentId)` |
| `L5269` | `toast(msg,type,onClick,notify)` |
| `L5336` | `customSelectHTML(...)` |
| `L5518`–`L5546` | `cancelSub(subId)` — refund preview modal |
| `L5533` | `getCancellationRule(id)` |
| `L5545`–`L5567` | `confirmCancelSub(subId,refund,fee)` |
| `L5562` | `recordRefund(...)` call site |
| `L7014`–`L7022` | `goBack()` |
| `L8034` | `val(id)` |
| `L8815` | `go()` hook for `finance` |
| `L9645` | `fmtReqNowLabel()` |
| `L9661` | `pushOpsNotification(type,title,desc,action)` |
| `L10564` | `PAGE_PERMISSIONS` |
| `L10629` | `PAGE_PERMISSIONS.finance` |
| `L10680`–`L10692` | `requirePagePerm(pageKey,permKey)` |
| `L13495` | `DB.promos` |
| `L13855` | `DB.referralConfig` |
| `L13888` | `DB.referralLog` |
| `L13895` | `DB.driverBonusLog` |
| `L13936`–`L13945` | `DB.cancellationPolicy` (8 rules) |
| `L13971` | `DB.vatConfig` |
| `L13972`–`L13973` | `DB.invoiceSequence`, `DB.invoices` |
| `L14535`–`L14543` | `kpiScrollTo(elId)` |
| `L14585` | boot: `renderRefundsTable()` |
| `L14667`–`L14716` | `DB.reasonCodes` (40 rows) |
| `L15379`–`L15390` | `DB.compPolicy` |
| `L15391` | `DB.goodwillLedger` |
| `L15412`–`L15434` | `compCheck(amount,reasonCode,riderId)` |
| `L15436`–`L15444` | `logGoodwill(...)` |
| `L15718`–`L15740` | **`contributionMargin()`** |
| `L15741`–`L15773` | **`renderContributionCard()`** |
| `L15847`–`L15848` | `DB.creditNotes`, `DB.creditNoteSequence` |
| `L15850`–`L15861` | `findInvoiceForRefund(entry)` |
| `L15862`–`L15891` | **`issueCreditNote(entry)`** |
| `L15892`–`L15920` | **`openCreditNoteModal(cnId)`** |
| `L15921`–`L15943` | **`renderCreditNotes()`** |
| `L15945`–`L15951` | `backfillCreditNotes()` |
| `L16311`–`L16313` | `gapsBoot2()` |
| `L17199` | `DB.emergencyDispatches=[]` |
| `L17800`–`L17812` | `cancelConfirm()` / `runConfirm()` |
| `L17817`–`L17838` | `__skipGuards`, `guardAction(name,builder)` |
| `L17853` | `installActionGates()` |
| `L17888`–`L17897` | gate spec for `commitWalletAdjust` |
| `L17901`–`L17908` | gate spec for `recordRefund` |
| `L18089` | `installActionGates()` invocation |
| `L19865`–`L19878` | `ACCOUNTS` chart of accounts |
| `L19879`–`L19881` | `DB.ledger`, `DB.idempotency`, `DB.moneyRejects` |
| `L19883` | `r2(n)` |
| `L19889`–`L19892` | `idemKey(...)` |
| `L19893`–`L19910` | `withIdempotency(key,operation,fn)` |
| `L19911`–`L19916` | `idemStats()` |
| `L19918`–`L19933` | `postLedger(ref,type,postings,meta)` |
| `L19934`–`L19947` | `accountBalance(acct)` |
| `L19948`–`L19959` | `trialBalance()` |
| `L19961`–`L19976` | **`recordRefund` idempotency + ledger override** |
| `L19977`–`L19992` | `creditRiderWallet` override |
| `L19993`–`L20006` | `debitRiderWallet` override |
| `L20030`–`L20050` | `postFareCapture(tripId)` |
| `L20057`–`L20068` | `ledgerReconcile()` |
| `L20069`+ | `renderLedger()` |
| `L20131`–`L20141` | `demoDoubleRefund()` |
| `L20145`–`L20153` | `ledgerBoot()` |
| `L21807`–`L21855` | `bootModules()` registry |
| `L21814` | boot step `'credit notes'` → `gapsBoot2` |
| `L21822` | boot step `'ledger'` → `ledgerBoot` |
| `L21833` | boot sets `window.__skipGuards=true` |
