# Settings Tab: Ledger & money safety

> **Source file** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page** `settings` (`#p-settings`, L1416–L2048)
> **Pane id** `#stab-ledger` — HTML **L1728–1736**
> **Tab button** L1434 (`switchSettingsTab('ledger',this)`), group "Operations" (L1424)
> **Render fn** `renderLedger()` **L20069–20119**
> **Data module** "B1 · B2 — IDEMPOTENCY AND A DOUBLE-ENTRY LEDGER", L19841–20151

---

## 1. Purpose

A **double-entry ledger model** plus an **idempotency register**, presented as a trial balance, a reconciliation against the panel's flat money arrays, and a journal-entry tail.

Pane description, verbatim (L1732):
> "Double-entry postings and idempotency keys — the two things that stop money being paid twice or going unaccounted. Modelled here so the backend has an unambiguous specification: these accounts, these postings, these keys."

Module header, verbatim (L19841–19863):
> "B1 — Nothing stopped the same refund being issued twice. A double click, a retried request, an agent pressing Confirm again because the modal felt slow: all of them paid out twice. The fix is not a disabled button — the browser is not where correctness lives. It is a deterministic key derived from the operation itself, so the SECOND attempt is recognised as the same act and returns the first result instead of performing a new one.
> B2 — Wallet credits, refunds, goodwill and captain earnings each lived in their own array. Nothing tied them together and nothing could prove the books balanced, because there were no books — only lists. Every money movement now posts a balanced pair of entries against a chart of accounts, and an unbalanced posting is REJECTED rather than recorded.
> **This is a model, not an accounting system.** Its purpose is to be an unambiguous specification for the backend: these accounts, these postings, these keys."

**Verified: this tab is NOT display-only.** The module monkey-patches **four** existing global money functions (`recordRefund`, `creditRiderWallet`, `debitRiderWallet`, `acceptEmergency`) and adds one new one (`postFareCapture`) — see §9.2. It is, however, incomplete on two axes: driver payouts, escrow release, deductions and tips do **not** post at all (§9.3), and of the four patches only **`creditRiderWallet` and `debitRiderWallet` actually reach `postLedger` in this build** — `recordRefund` and `acceptEmergency` are wrapped by `guardAction` *before* the ledger patches them, so their ledger postings are unreachable (§10 ⚠ ordering).

---

## 2. Layout map

| Order | Element | Built at | Container |
|---|---|---|---|
| 1 | Panel head card — 📒 icon, title, description | L1729–1734 (static) | `.card` |
| 2 | `<div id="ledger-body">` — everything below is injected | L1735 (static), filled L20073 | `.card` |
| 2a | **Summary strip** — 6 stats | L20073–20081 | `#ledger-body` |
| 2b | **Explainer prose** | L20082–20084 | |
| 2c | **Trial-balance table** (12 fixed account rows) | L20085–20091 | |
| 2d | **"🔁 Ledger vs the operational arrays"** header + prose + 3-row reconciliation table | L20092–20101 | |
| 2e | **"📒 Recent journal entries"** header + 2 buttons + up to 14 entry blocks (or empty state) | L20102–20114 | |
| 2f | **"⛔ Refused postings"** header + up to 6 rows — **rendered only when `DB.moneyRejects.length`** | L20115–20118 | |

Whole pane written in one `innerHTML` assignment at L20073.

---

## 3. Settings fields — EVERY field

**There are ZERO input fields in this pane.** No `<input>`, no `<select>`, no toggle, no textarea. `renderLedger()` produces only text, tables and two buttons. Nothing in this tab is configurable and nothing is persisted from it.

The only tunables that govern its behaviour live elsewhere and are **not exposed here**:

| Constant | Value | Line | Exposed in a UI? |
|---|---|---|---|
| `ACCOUNTS` chart of accounts | 12 accounts, §8.1 | 19865–19878 | ❌ hardcoded `var`, not on `DB` |
| `DB.vatConfig.ratePct` | `15` | 13971 | ✅ but on the **General/VAT** surface, not here — read at L19967 and L20037 to split net/VAT |
| Idempotency key time-bucket | `Math.floor(nowMs()/1000)` (1 s) | 19980, 19994 | ❌ hardcoded |
| Journal-entry display cap | `14` | 20105 | ❌ hardcoded |
| Refused-posting display cap | `6` | 20116 | ❌ hardcoded |
| Balance tolerance | `Math.abs(diff) < 0.01` (colour only) | 20100 | ❌ hardcoded |

---

## 4. Tables & lists

### 4.1 Summary strip — L20073–20081 (not a table; 6 inline stats)

| # | Label | Value | Source | Conditional styling |
|---|---|---|---|---|
| 1 | Journal entries | `tb.entries` | `trialBalance().entries` = `DB.ledger.length` | — |
| 2 | Debits | `tb.totalDebits.toFixed(2)` | sum of every `p.debit` across all entries | — |
| 3 | Credits | `tb.totalCredits.toFixed(2)` | sum of every `p.credit` | — |
| 4 | *(status)* | `✓ books balance` / `⛔ OUT OF BALANCE` | `r2(dr)===r2(cr)` | green / red |
| 5 | Duplicates suppressed | `idm.suppressed` | `idemStats()` | amber when non-zero |
| 6 | Refused postings | `⛔ N posting(s) refused` | `DB.moneyRejects.length` | red, **omitted entirely when 0** |

### 4.2 Trial balance — L20085–20091
Row source: `trialBalance().rows` = `Object.keys(ACCOUNTS).map(...)` → **always exactly 12 rows in declaration order**. No add/edit/delete, no row click, no empty state (the chart is static).

| # | Column | Value | Align |
|---|---|---|---|
| 1 | Account | `ACCOUNTS[k].label` with the raw key `k` as a ghost sub-line | left |
| 2 | Type | `ACCOUNTS[k].type` (`asset` / `liability` / `revenue` / `contra` / `expense`) | left |
| 3 | Balance | `accountBalance(k).toFixed(2) + ' SAR'` | right; `font-weight:500` + ink colour when non-zero, `400` + ghost when zero |

### 4.3 Ledger vs the operational arrays — L20095–20101
Row source: `ledgerReconcile()` → **always exactly 3 rows**. No actions, no empty state.

| # | Column | Value |
|---|---|---|
| 1 | Measure | `r.label` |
| 2 | Operational | `r.ops.toFixed(2)` (right) |
| 3 | Ledger | `r.ledger.toFixed(2)` (right) |
| 4 | Difference | `r.diff.toFixed(2)` (right) — **green** when `abs(diff)<0.01`, **amber-dk** otherwise |

The three rows are enumerated in §8.4.

### 4.4 Recent journal entries — L20102–20114
Row source: `DB.ledger.slice(0,14)` — newest first (`postLedger` uses `unshift`). Not a `<table>`; each entry is a `<div>` block.

Per-entry rendering:
- Line 1: `<b>{e.id}</b> · {e.type} <span ghost>{e.total.toFixed(2)} SAR</span>`
- Then one line per posting: `Dr <account label> <b>amount</b>` (2 nbsp indent) or `Cr <account label> <b>amount</b>` (4 nbsp indent). The Dr/Cr choice is `p.debit ? 'Dr' : 'Cr'`; the amount is `r2(p.debit||p.credit)`.

**Empty state (L20114):** `"No entries yet — post the trip history or issue a refund to see the postings."`
No pagination, no "…and N more", no expand, no click-through to the referenced trip/rider.

### 4.5 Refused postings — L20115–20118
Row source: `DB.moneyRejects.slice(0,6)`. The whole section (header included) is **omitted** when the array is empty — there is no explicit empty state.
Row content: `{r.type} — {r.why}` in red.
`r.ref`, `r.tsMs` and `r.postings` are stored (L19924) but **not rendered**.

---

## 5. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `Post fares from trip history` (L20103) | `backfillFareLedger()` L20120–20128 | Iterates **every** key of `DB.trips`, skips any whose `status` matches `/cancel/i`, calls `postFareCapture(id)` on the rest, counts successes, re-renders, toasts `📒 Posted N fare capture(s) to the ledger` | `DB.ledger`, `DB.idempotency` (via `postFareCapture`) | **none** | none directly; `postFareCapture` emits `duplicate_suppressed` per already-posted trip via `withIdempotency` | **no** |
| `Simulate a double-click refund` (L20104) | `demoDoubleRefund()` L20131–20141 | Picks `Object.keys(DB.riders)[0]`, snapshots `accountBalance('cash.gateway')`, fires `recordRefund(rid,25,'Duplicate-click test','demo','DEMO-1')` **twice**, snapshots again, re-renders, toasts either `✅ Second click suppressed …` or `⚠ Duplicate was NOT suppressed`. **In this build it always takes the second branch** — see the ⚠ below | `DB.refunds`, `DB.creditNotes`, `DB.ledger`, `DB.idempotency`, `DB.auditLog` | **none** | `duplicate_suppressed` on the 2nd call (L19898); `credit_note_issued` on the 1st (via `issueCreditNote`) | **yes** — the `guardAction('recordRefund')` gate (L17901–17907) opens an “Issue refund” `confirmAction` modal |

> ⚠ **`demoDoubleRefund()` is a destructive demo button with no permission gate, and it cannot do what it claims.** It fires a genuine SAR 25 refund against a real rider record, styled as an ordinary `btn sm` identical to the button beside it. It *does* raise a confirmation: `recordRefund` was already wrapped by `guardAction` at **L17901** (installed by `installActionGates()` at **L18089**), so the first call at L20134 opens the “Issue refund” gate modal (`danger:true, irreversible:true`, built L17902–17907) and **returns `undefined`**. The second call at L20135 is suppressed by `withIdempotency` and replays that same `undefined`. `a` and `b` are therefore both `undefined`, `a&&b&&a.id===b.id` is false, and the button **always toasts `⚠ Duplicate was NOT suppressed`** (L20140) — the exact opposite of the “Proof, not decoration” claim in its own source comment (L20129–20130). If the operator then confirms the gate, `guardAction`'s `orig.apply` (L17834) calls the **raw pre-patch** `recordRefund`, so a real refund and credit note are issued **with no ledger posting at all**, against an idempotency key that has already been burnt.

> ⚠ **`backfillFareLedger()` and `ledgerBoot()` are byte-identical loops** (L20120–20128 vs L20145–20151) except that the boot version does not re-render or toast. Because `ledgerBoot` already ran at page load, clicking the button normally posts **0** new entries and instead emits one `duplicate_suppressed` audit entry *per trip*, plus a `⛔ Already done…` toast per trip from `withIdempotency` (L19902). On a seeded panel with hundreds of reconstructed trips this floods the audit log and the toast queue.

There are no other clickable elements in the pane. No row is clickable; no entry links to its `meta.trip` / `meta.riderId`.

---

## 6. Modals opened

**One — and it is raised by a wrapper installed outside this module, which is why an earlier revision of this document missed it.** `renderLedger()` opens no modal, and `backfillFareLedger()` opens none.

`demoDoubleRefund()` **does** open a modal: its first `recordRefund` call (L20134) hits the `guardAction('recordRefund')` wrapper registered at **L17901** and installed at **L18089**, which calls `confirmAction(spec)` at **L17836** with the “Issue refund” spec built at L17902–17907. That is the only dialog this tab can raise; everything else is the toast queue.

On confirm, the raw pre-patch `recordRefund` runs and → `issueCreditNote` triggers downstream re-renders (`renderRefundsTable` L3199, `renderCreditNotes` L3200) but no further modal.

---

## 7. Rules / policy logic — written out exactly

### 7.1 `r2(n)` — L19883
`Math.round((n||0)*100)/100` — the single rounding primitive for all money in this module (and used by the pricing module too).

### 7.2 `idemKey(...)` — L19889–19892
```
Array.prototype.slice.call(arguments)
  .map(p => String(p===undefined||p===null ? '' : p))
  .join('|')
```
Comment (L19886–19888): *"The key is derived from WHAT is being done, not from a random token, so a retry from a different tab or a re-submitted form produces the same key and is caught."*

### 7.3 `withIdempotency(key,operation,fn)` — L19893–19908 — **the money-safety check**
```
seen = DB.idempotency[key]
if (seen):
    seen.attempts = (seen.attempts||1) + 1
    seen.lastAttemptMs = nowMs()
    logAction('duplicate_suppressed','money',key,
      'Duplicate '+operation+' suppressed — this exact operation was already completed at '
      + new Date(seen.tsMs).toLocaleTimeString() + '. Attempt #'+seen.attempts+'. No money moved.')
    toast('⛔ Already done — this exact '+operation+' was completed '+fmtAge(nowMs()-seen.tsMs)+' ago. Nothing was charged again.','warn')
    return seen.result                       // returns the FIRST result, does not re-run fn
result = fn()
DB.idempotency[key] = { key, operation, tsMs:nowMs(), attempts:1, result }
return result
```
**Rules:** the register is never expired or pruned; a key is valid forever. `fn()` is called *before* the register entry is written, so a throw inside `fn` leaves no record and the operation is retryable (correct). There is no lock — two synchronous calls in the same tick are impossible in JS, so this is sound single-threaded.

### 7.4 `idemStats()` — L19909–19914
```
keys       = Object.keys(DB.idempotency)
dupes      = keys.filter(k => DB.idempotency[k].attempts > 1)
return { operations: keys.length,
         duplicated: dupes.length,
         suppressed: dupes.reduce((s,k) => s + (attempts-1), 0) }
```
Only `suppressed` is rendered (L20079). `operations` and `duplicated` are computed and discarded.

### 7.5 `postLedger(ref,type,postings,meta)` — L19917–19933 — **the balance check**
```
dr = Σ p.debit
cr = Σ p.credit
unknown = postings.filter(p => !ACCOUNTS[p.account])

REJECT IF  unknown.length > 0  OR  r2(dr) !== r2(cr)
    why = unknown.length ? 'unknown account '+<joined account names>
                         : 'unbalanced: debits '+r2(dr)+' vs credits '+r2(cr)
    DB.moneyRejects.unshift({ ref, type, why, tsMs:nowMs(), postings })
    logAction('ledger_rejected','money',ref,'Posting REFUSED — '+why+'. Nothing was written.')
    toast('⛔ Ledger rejected the posting — '+why,'err')
    return null                              // NOTHING is written to DB.ledger

OTHERWISE
    e = { id:'JE-'+pad5(DB.ledger.length+1), ref, type, tsMs:nowMs(),
          postings, meta:meta||{}, total:r2(dr) }
    DB.ledger.unshift(e)
    return e
```
Exactly **two** rejection rules; there is no third (no sign check, no account-type check, no zero-amount check).

⚠ `id` is `'JE-'+pad5(DB.ledger.length+1)` — length-derived, and entries are `unshift`ed. Ids are therefore monotonic **only while nothing is ever removed**; nothing removes entries, so it holds — but it is fragile by construction (identical pattern to `AUD-` ids, which *do* collide, see `16k`).

### 7.6 `accountBalance(acct)` — L19934–19947
```
walk every entry, every posting; accumulate dr and cr for the matching account
debitNormal = (type==='asset' || type==='expense' || type==='contra')
return r2(debitNormal ? dr-cr : cr-dr)
```
Comment (L19943–19944): *"assets and expenses are debit-normal; liabilities, revenue and contra-revenue are credit-normal"*.
Note `contra` is classified **debit-normal** — correct for contra-revenue.
Complexity: O(entries × postings) per account. Per `renderLedger()`: **12** walks from `trialBalance`'s row map (L19950, one per `ACCOUNTS` key) + **1** more full walk for `trialBalance`'s own debit/credit totals (L19953–19955) + **4** from `ledgerReconcile` (L20063, L20064, **L20065** — the `*0` term still costs a full walk, see §7.8 — and L20066) = **17 full ledger walks per `renderLedger()`**. `demoDoubleRefund`'s two `accountBalance` calls (L20133, L20136) fire **per click, not per render**, and are additional to the 17.

### 7.7 `trialBalance()` — L19948–19958
```
rows = every ACCOUNTS key → { account, label, type, balance:accountBalance(k) }
dr,cr = totals across every posting of every entry
return { rows, totalDebits:r2(dr), totalCredits:r2(cr),
         balanced: r2(dr)===r2(cr), entries: DB.ledger.length }
```
`balanced` is **structurally always true**: `postLedger` refuses any unbalanced posting, so the sum of balanced entries is balanced. The `⛔ OUT OF BALANCE` branch (L20078) is unreachable in this build — see §13.

### 7.8 `ledgerReconcile()` — L20057–20068
```
walletTotal   = Σ over DB.riders of (rider.wallet ? rider.wallet.balance : 0)
refundTotal   = Σ over DB.refunds of (r.amount||0)
goodwillTotal = Σ over DB.goodwillLedger of g.amount
rows:
  'Rider wallet balances' : ops=r2(walletTotal),   ledger=accountBalance('liability.wallet')
  'Refunds issued'        : ops=r2(refundTotal),   ledger=accountBalance('contra.refunds') + accountBalance('tax.vat_output')*0
  'Goodwill credits'      : ops=r2(goodwillTotal), ledger=accountBalance('expense.goodwill')
each row gains diff = r2(ops - ledger)
```
⚠ **`+ accountBalance('tax.vat_output')*0`** (L20064–20065) — a term multiplied by zero. It costs a full ledger walk and contributes nothing. Almost certainly a half-finished VAT adjustment: the refund's ledger side is booked **net of VAT** (`contra.refunds` gets `net`, `tax.vat_output` gets `vat`, L19969–19973) while `DB.refunds[].amount` is **gross**, so this row shows a permanent ~13% difference by construction. The `*0` looks like the author disabling the fix rather than removing the code.

Module comment (L20053–20056): *"Honest by design: the arrays still exist and not every path posts to the ledger yet. Showing the difference is the point — a ledger that silently disagrees with the operational records is worse than none."*

### 7.9 `postFareCapture(tripId)` — L20030–20051
```
t = DB.trips[tripId]; if (!t) return null
gross = r2(parseFloat(t.fare)||0); if (!gross) return null
key = idemKey('fare', tripId)
withIdempotency(key,'fare capture', () => {
   rate = (DB.vatConfig ? DB.vatConfig.ratePct : 15)/100
   net  = r2(gross/(1+rate));  vat = r2(gross-net)
   drv  = r2(parseFloat(t.driverEarn)||0)
   postLedger(key,'fare_capture',[
      {account:'cash.gateway',  debit:  gross},
      {account:'revenue.fares', credit: net},
      {account:'tax.vat_output',credit: vat}])
   if (drv) postLedger(key+'|drv','driver_accrual',[
      {account:'expense.driver_pay', debit:  drv},
      {account:'liability.driver',   credit: drv}])
   return true
})
```
Comment (L20027–20029): *"Fare capture — the entry the panel never had, modelled so the backend knows the shape. Called from the trial-balance page for a worked example, and available for the API to mirror."*

⚠ `net+vat` may differ from `gross` by 1 halala after independent rounding (e.g. gross 17.65 → net 15.35, vat 2.30 → 17.65 ✓, but other values can drift). When it does, `postLedger` **rejects** the entry and the trip is silently skipped while the idempotency key is still recorded — so a later `backfillFareLedger()` will not retry it. `UNVERIFIED: whether any seeded fare actually triggers this` (would require running the file).

---

## 8. Full enumerations

### 8.1 `ACCOUNTS` — the COMPLETE chart of accounts (L19865–19878)

| Key | Label | Type | Normal balance |
|---|---|---|---|
| `cash.gateway` | Cash at payment gateway | `asset` | debit |
| `ar.rider` | Rider receivable | `asset` | debit |
| `liability.wallet` | Rider wallet balances | `liability` | credit |
| `liability.driver` | Captain earnings payable | `liability` | credit |
| `liability.escrow` | Plan escrow held | `liability` | credit |
| `tax.vat_output` | VAT output payable | `liability` | credit |
| `revenue.fares` | Fare revenue | `revenue` | credit |
| `contra.refunds` | Refunds (contra revenue) | `contra` | debit |
| `expense.driver_pay` | Captain earnings | `expense` | debit |
| `expense.goodwill` | Goodwill credits | `expense` | debit |
| `expense.emergency` | Emergency cover | `expense` | debit |
| `expense.compensation` | Rider compensation | `expense` | debit |

**Never posted to (permanently zero):** `ar.rider`, `liability.escrow`. `expense.compensation` is reachable only via a `/compensat/i` match on a wallet-credit reason (L19983–19984).

### 8.2 Journal-entry record shape — EVERY field (L19929–19930)

| Field | Type | Value |
|---|---|---|
| `id` | string | `'JE-' + String(DB.ledger.length+1).padStart(5,'0')` → `JE-00001` |
| `ref` | string | the idempotency key (or key + `'\|pay'` / `'\|recover'` / `'\|drv'`) |
| `type` | string | one of the **7** entry types in §8.3 (§8.3's 8th row is a `*(none)*` placeholder for the two never-posted accounts, not an entry type) |
| `tsMs` | number | `nowMs()` — **not rendered anywhere** |
| `postings` | array | `[{account, debit}` or `{account, credit}, …]` |
| `meta` | object | per-type payload, §8.3 — **not rendered anywhere** |
| `total` | number | `r2(Σ debits)` |

### 8.3 EVERY entry type — complete posting specification

| `type` | Emitted by | Line | Postings (Dr / Cr) | `meta` |
|---|---|---|---|---|
| `fare_capture` | `postFareCapture` | 20040–20044 | Dr `cash.gateway` gross · Cr `revenue.fares` net · Cr `tax.vat_output` vat | `{trip}` |
| `driver_accrual` | `postFareCapture` (only when `t.driverEarn`) | 20045–20048 | Dr `expense.driver_pay` drv · Cr `liability.driver` drv | `{trip, driver}` |
| `refund` | patched `recordRefund` | 19969–19973 | Dr `contra.refunds` net · Dr `tax.vat_output` vat · Cr `cash.gateway` gross | `{riderId, refundId, creditNote}` |
| `wallet_credit` | patched `creditRiderWallet` | 19985–19988 | Dr `expense.goodwill` **or** `expense.compensation` · Cr `liability.wallet` | `{riderId, reason}` |
| `wallet_debit` | patched `debitRiderWallet` (only when the debit succeeded) | 19997–20000 | Dr `liability.wallet` · Cr `revenue.fares` | `{riderId, reason}` |
| `emergency_cover` | patched `acceptEmergency` | 20014–20017 | Dr `expense.emergency` `d.replacementPay` · Cr `liability.driver` | `{dispatch, driver}` |
| `emergency_recovery` | patched `acceptEmergency` (only when `d.recovered>0`) | 20018–20021 | Dr `liability.driver` `d.recovered` · Cr `expense.emergency` | `{dispatch, from}` |
| *(none)* | — | — | `liability.escrow` and `ar.rider` are declared but never posted | — |

**Expense-account selection rule for `wallet_credit` (L19983–19984), exactly:**
```
/goodwill|apolog/i.test(reason)  → 'expense.goodwill'
/compensat/i.test(reason)        → 'expense.compensation'
otherwise                        → 'expense.goodwill'     // same as the first branch
```
The default and the first branch produce the same account, but the first branch is **not** redundant — it is a **precedence** rule. A reason matching *both* regexes (e.g. “Goodwill compensation”) books to `expense.goodwill` **because** the `/goodwill|apolog/i` test is evaluated first; delete it and that reason books to `expense.compensation` instead. The second clause is correct as stated: any reason that is not `/compensat/i` books to goodwill.

### 8.4 Idempotency register record shape (L19906)

| Field | Value |
|---|---|
| `key` | the composed key |
| `operation` | human label: `'refund'`, `'wallet credit'`, `'wallet debit'`, `'emergency settlement'`, `'fare capture'` |
| `tsMs` | first-completion time |
| `attempts` | starts `1`, incremented on every suppressed retry |
| `lastAttemptMs` | added on the first retry (L19897); **absent** on never-retried keys |
| `result` | the first call's return value, replayed to every retry |

### 8.5 EVERY idempotency key formula

| Operation | Key | Line | Notes |
|---|---|---|---|
| refund | `'refund' \| riderId \| r2(amount) \| (relatedId \|\| reason \|\| '')` | 19963 | **Fully deterministic** — the intended B1 behaviour |
| wallet credit | `'wallet_credit' \| riderId \| r2(amount) \| (reason\|\|'') \| floor(nowMs()/1000)` | 19980 | ⚠ contains a **1-second time bucket**: a second click ≥1 s later produces a *different* key and is **not** suppressed |
| wallet debit | `'wallet_debit' \| riderId \| r2(amount) \| (reason\|\|'') \| floor(nowMs()/1000)` | 19994 | same 1-second window |
| emergency settlement | `'emergency_accept' \| dispatchId` | 20009 | fully deterministic |
| fare capture | `'fare' \| tripId` | 20035 | fully deterministic |

### 8.6 `moneyRejects` record shape (L19924)
`{ ref, type, why, tsMs, postings }` — only `type` and `why` are rendered.

### 8.7 Audit keys emitted by this module

| Key | Line | Entity type | In `ACTION_LABELS`? |
|---|---|---|---|
| `duplicate_suppressed` | 19898 | `money` | ❌ |
| `ledger_rejected` | 19925 | `money` | ❌ |

Both use `entityType:'money'` and set `entityId` to the raw idempotency key or `ref` — a long pipe-joined string, which `auditEntityLink()` (L9281) will render as a monospace non-link because `resolveId()` cannot resolve it.

### 8.8 State containers
| Key | Init | Line |
|---|---|---|
| `DB.ledger` | `[]` | 19879 |
| `DB.idempotency` | `{}` | 19880 |
| `DB.moneyRejects` | `[]` | 19881 — comment: *"postings refused, kept visible rather than dropped"* |

---

## 9. Consumption check — is each setting actually read anywhere?

There are no settings in this tab (§3), so the consumption question becomes: **is the ledger actually written by financial actions elsewhere, or is it display-only?**

### 9.1 Verdict
**The ledger is genuinely written by real financial actions — but by fewer of them than the wiring suggests.** It is *not* display-only, and it is *not* complete. The module replaces **four** existing globals and adds **one** new function; of the four replacements, only **two** (`creditRiderWallet`, `debitRiderWallet`) can actually reach `postLedger`, because `recordRefund` and `acceptEmergency` were already wrapped by `guardAction` before the ledger ran — see §10 ⚠ ordering.

### 9.2 Money paths that DO post — four monkey-patch wrappers plus one new function

The module replaces four existing global functions at load time (`var __origX = X; X = function(){…}`). Every existing call site therefore routes through the wrapper without being modified. **Two of the four are neutralised by wrapper ordering** (flagged ⛔ below).

| Patched fn | Wrapper line | Original | Real call sites that now post |
|---|---|---|---|
| `recordRefund` ⛔ | 19961–19977 | L3176 | **L5562** subscription-cancellation refund (`confirmCancelSub`); L20134/20135 the demo button. **⛔ Posts nothing**: `__origRecordRefund` (L19961) captures the *guarded* function, whose call returns `undefined`, so `if(entry)` at L19966 is false. On confirm, `guardAction` calls the raw L3176 function and bypasses this wrapper entirely |
| `creditRiderWallet` ✅ | 19978–19991 | L3932 | **L3868** referrer bonus; **L3869** referee welcome bonus; **L4000** `commitWalletAdjust` (the Finance/rider wallet credit modal); **L5563** subscription-cancellation refund credit; **L11184** welcome-offer instant cashback; **L17337** delay compensation on captain absence |
| `debitRiderWallet` ✅ | 19992–20005 | L3941 | **L4003** `commitWalletAdjust` debit branch; **L11838** cancellation fee charge |
| `acceptEmergency` ⛔ | 20007–20025 | L17315 | **L17385** “Simulate accept” button on the emergency-dispatch card. **⛔ Posts nothing**: `GATE_SPECS.acceptEmergency` (L18260) is installed by `installUniversalGates()` at **L18383**, before L20007, so the inner call returns `undefined`, `d.status==='Accepted'` (L20013) is false, and neither `emergency_cover` nor `emergency_recovery` is ever written |
| `postFareCapture` ✅ | (new) 20030–20051 | — | `ledgerBoot()` L20145 at page load (every non-cancelled trip); `backfillFareLedger()` L20120 |

Boot registration: `{name:'ledger', fn:ledgerBoot, needs:['ledger','idempotency']}` — L21822. So the trial balance is **non-empty on first open**: every seeded and reconstructed trip has already been fare-captured.

### 9.3 Money paths that DO NOT post — verified gaps

| Money movement | Function / line | Audit key | Posts to ledger? |
|---|---|---|---|
| Pay a single driver | L7034 | `pay_driver` | ❌ — `liability.driver` is never debited |
| Process all payouts | L7055 | `process_all_payouts` | ❌ |
| Release subscription escrow | L7069 | `release_escrow` | ❌ — `liability.escrow` stays permanently 0 |
| Apply / waive a deduction | L7082 (`applyDeduction` L8971) | `apply_deduction` | ❌ |
| Rider tip to captain | L12450 | `trip_tip` | ❌ |
| Goodwill ledger row | `logGoodwill()` L15436–15443 | — | ❌ directly — it posts only if the surrounding call also goes through `creditRiderWallet` |
| Credit note issue | `issueCreditNote()` L15862 | `credit_note_issued` | ❌ — the VAT reversal is booked by the `refund` entry instead |
| Corporate invoicing | `corp_invoice_sent` | — | ❌ |

**Consequence:** `liability.driver` (Captain earnings payable) accrues from every `driver_accrual` and is **never cleared**, because payouts do not post. The trial balance's captain-payable figure therefore grows monotonically and represents cumulative accrual, not an outstanding obligation. `liability.escrow` and `ar.rider` are permanently zero. The panel's own reconciliation table only checks three of these gaps.

### 9.4 Reverse consumption — is anything outside this tab reading the ledger?

| Reader | Line | Purpose |
|---|---|---|
| `renderLedger` | 20072 | this tab |
| `demoDoubleRefund` | 20133, 20136 | this tab |
| `ledgerReconcile` | 20063–20066 | this tab |

`accountBalance`, `trialBalance`, `idemStats` and `DB.ledger` have **no readers outside the ledger module**. No dashboard, Finance page, export, or KPI reads the ledger. `exportPayments()` and the Finance page read `DB.refunds` / `DB.payments` / `DB.goodwillLedger` directly — the flat arrays, not the books.

---

## 10. Cross-module effects

| Direction | Target | Line | Effect |
|---|---|---|---|
| ← reads | `DB.trips` | 20031, 20122, 20147 | fare/driverEarn source for captures |
| ← reads | `DB.riders[].wallet.balance` | 20059 | reconciliation "operational" column |
| ← reads | `DB.refunds` | 20060 | reconciliation |
| ← reads | `DB.goodwillLedger` | 20061 | reconciliation |
| ← reads | `DB.vatConfig.ratePct` | 19967, 20037 | net/VAT split (fallback literal `15`) |
| ← reads | `DB.emergencyDispatches` | 20012 | `replacementPay`, `recovered`, `acceptedBy`, `absentDriver` |
| → patches | `recordRefund` | 19961 | every refund call site now idempotent + posted |
| → patches | `creditRiderWallet` | 19978 | 6 call sites |
| → patches | `debitRiderWallet` | 19992 | 2 call sites |
| → patches | `acceptEmergency` | 20007 | 1 call site — **but see the ⛔ ordering row below: this wrapper never posts** |
| → writes | `DB.auditLog` | 19898, 19925 | 2 unlabelled keys |
| → triggers | toasts | 19902, 19926 | `warn` / `err` |
| → triggers | `renderRefundsTable`, `renderCreditNotes` | via `recordRefund` L3199+ | Finance page refresh from the demo button |
| ⛔ ordering | `guardAction` / `installActionGates` / `installUniversalGates` | 17819 / **17853** (invoked **18089**) / 18372 (invoked **18383**) | **The two wrapping mechanisms are not coordinated, and the conflict is observable.** `guardAction` (L17819) reassigns `window[name]`; the ledger's four wrappers are plain top-level assignments at L19961–20025. Both gate installers run **first** (L18089 and L18383) — several thousand lines above the ledger module — so the ledger wrapper is the **outer** layer and its inner call reaches `guardAction`'s wrapper (L17822–17837), which calls `confirmAction` (L17836) and **returns `undefined`**. Affected: `recordRefund` (guarded at L17901, patched at L19961) and `acceptEmergency` (guarded via `GATE_SPECS` L18260, patched at L20007). Consequence: `if(entry)` at L19966 and `d.status==='Accepted'` at L20013 are both false on every UI-initiated call, so **the `refund`, `emergency_cover` and `emergency_recovery` entry types cannot be produced through any UI path in this build.** On confirm, `runConfirm()` → `o.onConfirm` → `orig.apply` (L17834) invokes the **raw** function captured at guard time, bypassing the ledger wrapper altogether. `commitWalletAdjust` is guarded at **L17889** but is not ledger-patched, so it is unaffected; `creditRiderWallet` and `debitRiderWallet` are ledger-patched but not guarded, so they post normally. |

---

## 11. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| `ACCOUNTS` (12 accounts) | 19865–19878 | Plain `var`, not on `DB` — cannot be extended at runtime and is not exported/persisted |
| `demoDoubleRefund` amount **25 SAR** | 20134–20135 | Hardcoded demo refund against a real rider |
| `demoDoubleRefund` rider `Object.keys(DB.riders)[0]` | 20132 | Whichever rider happens to be first |
| `demoDoubleRefund` reason `'Duplicate-click test'`, source `'demo'`, relatedId `'DEMO-1'` | 20134 | The `DEMO-1` relatedId makes the key permanently reusable — the demo can be run only once per session |
| Journal display cap `14` | 20105 | |
| Refused display cap `6` | 20116 | |
| Colour tolerance `0.01` | 20100 | |
| VAT fallback `15` | 19967, 20037 | |
| Idempotency time bucket `1000 ms` | 19980, 19994 | |
| `+ accountBalance('tax.vat_output')*0` | 20064–20065 | Dead arithmetic, §7.8 |
| Colour literal `#F2F1EE` | 20106 | Bypasses CSS vars |
| `nbsp` indentation for Dr/Cr | 20111 | Layout by entity reference |

---

## 12. i18n keys

| Key | Element | Line | Arabic present? |
|---|---|---|---|
| `stabgrp.operations` | nav group label | 1424 | ✅ L7914 |
| `stab.ledger` | tab button "Ledger & money safety" | 1434 | ❌ **MISSING** from the `ar` dictionary (L7917–7921) |

**Zero `data-i18n` attributes inside `#stab-ledger` (L1728–1736).** All 12 account labels, both table headers, all prose, both button labels, both toasts and both audit summaries are English-only string literals in JS.

---

## 13. Gaps, dead code, UNVERIFIED items

### Confirmed issues
1. **`demoDoubleRefund()` cannot demonstrate what it claims, and issues a real SAR 25 refund when confirmed** (L20104, L20131). It *does* raise the `guardAction('recordRefund')` confirmation (L17901 → L17836), so it is not unconfirmed — but that gate returns `undefined`, so `a` and `b` are both `undefined` and the button **always** toasts `⚠ Duplicate was NOT suppressed` (L20140). If confirmed, the raw `recordRefund` (L3176) writes to `DB.refunds`, issues a credit note and appears on the Finance page **with no ledger posting**, having already burnt the idempotency key. There is still **no permission gate** and no visual distinction from a safe action.
2. **`backfillFareLedger()` is a no-op after boot** and instead emits one `duplicate_suppressed` audit entry + one `⛔ Already done…` warn toast **per trip** (L20120 vs L20145; toast at L19902). Nothing debounces the toast queue.
3. **`⛔ OUT OF BALANCE` is unreachable** (L20077–20078). `postLedger` refuses every unbalanced posting, so `trialBalance().balanced` is always `true`. The most prominent safety indicator on the pane can never fire.
4. **The `Refunds issued` reconciliation row is permanently wrong by ~13%** — `ops` is gross, `ledger` is net-of-VAT, and the intended correction is multiplied by zero (L20064–20065).
5. **Wallet credit/debit idempotency is only 1 second wide** (L19980, L19994). A double-click slower than 1 s pays out twice. The refund path — the one the module header cites as the motivating incident — is correctly deterministic; the wallet paths are not.
6. **`liability.driver` never clears.** Payouts, escrow release and deductions do not post (§9.3). Captain earnings payable is a monotonically increasing accrual.
7. **`liability.escrow` and `ar.rider` are declared and never used** — two of twelve rows are permanent zeros.
8. **A rejected `postFareCapture` is not retryable** — the idempotency key is recorded by `withIdempotency` regardless of whether the inner `postLedger` returned `null` (L20036–20050 wraps both postings and L20049 `return true;` runs unconditionally). *(Note: rounding is **not** a route to such a rejection — see §7.9.)*
9. **`postFareCapture` returns `true` even when both postings were refused**, so `backfillFareLedger`'s success count is wrong.
10. **No permission gate on either button.** Compare `saveDataWindow` (L20515) and `setRotaSlot` (L19671), which call `requirePerm('manage_settings')`.
11. **17 full ledger walks per render** (§7.6). O(n²)-ish on a large journal; the render is triggered by `go('settings')` and by both buttons.
12. **Entry `meta` and `tsMs` are never rendered** — a journal entry cannot be traced to its trip/rider from the UI.
13. **The `/goodwill|apolog/i` branch is a precedence rule, not a redundancy** (L19983–19984) — it produces the same account as the fallback, but it decides the outcome for any reason that matches *both* regexes (e.g. “Goodwill compensation” → `expense.goodwill`). §8.3.

### Dead / unused
| Item | Line | Status |
|---|---|---|
| `ACCOUNTS['ar.rider']` | 19867 | never posted |
| `ACCOUNTS['liability.escrow']` | 19870 | never posted |
| `idemStats().operations` | 19912 | computed, never rendered |
| `idemStats().duplicated` | 19912 | computed, never rendered |
| `trialBalance().rows[].account` | 19950 | rendered as a ghost sub-line only |
| `moneyRejects[].ref`, `.tsMs`, `.postings` | 19924 | stored, never rendered |
| `DB.ledger[].meta`, `.tsMs`, `.ref` | 19929 | stored, never rendered |
| `accountBalance('tax.vat_output')*0` | 20065 | dead arithmetic |
| `withIdempotency` `seen.lastAttemptMs` | 19897 | written, never read |

### UNVERIFIED
- **Whether the backend this "specification" targets exists.** The module explicitly frames itself as a model (L19860–19863). There is no network layer in the file. `UNVERIFIED: no backend present in the artifact.`
- **Whether the gate modal's confirm path is ever exercised in practice** (§10). The install order is static and certain (L18089 / L18383 both precede L19961 / L20007), and the `undefined` return is a direct consequence of `guardAction`'s wrapper (L17836–17837) having no `return`. What is *not* recoverable from static reading is whether an operator ever presses Confirm on the “Issue refund” gate in this demo build. `UNVERIFIED: runtime behaviour of the confirm branch, static analysis only.`

---

## 14. Line-number index

| Line(s) | What |
|---|---|
| 1424 | Nav group label `stabgrp.operations` |
| 1434 | Tab button, `data-i18n="stab.ledger"` |
| 1728–1736 | `#stab-ledger` pane HTML |
| 1735 | `<div id="ledger-body">` mount point |
| 3176–3202 | original `recordRefund()` |
| 3868–3869 | referral bonuses → `creditRiderWallet` |
| 3932 | original `creditRiderWallet()` |
| 3941 | original `debitRiderWallet()` |
| 4000, 4003 | `commitWalletAdjust` credit / debit |
| 5562–5563 | subscription-cancellation refund + wallet credit |
| 7034 / 7055 / 7069 / 7082 | payouts / escrow / deductions — **do not post** |
| 8819 | `go('settings')` calls `renderLedger()` |
| 11184 | welcome-offer cashback |
| 11838 | cancellation-fee wallet debit |
| 12450 | tip logged — **does not post** |
| 13971 | `DB.vatConfig` |
| 15436–15443 | `logGoodwill()` |
| 15862 | `issueCreditNote()` |
| 17315 | original `acceptEmergency()` |
| 17337 | delay compensation → `creditRiderWallet` |
| 17385 | "Simulate accept" button |
| 17819 | `guardAction()` |
| 17853 / 18089 | `installActionGates()` declared / invoked — **runs before the ledger module** |
| 17901–17907 | `guardAction('recordRefund', …)` — the “Issue refund” gate |
| 18260 / 18372 / 18383 | `GATE_SPECS.acceptEmergency` / `installUniversalGates()` declared / invoked |
| 19841–19863 | Module header comment (B1/B2 rationale) |
| 19865–19878 | `ACCOUNTS` chart of accounts |
| 19879–19881 | `DB.ledger`, `DB.idempotency`, `DB.moneyRejects` |
| 19883 | `r2()` |
| 19889–19892 | `idemKey()` |
| 19893–19908 | `withIdempotency()` |
| 19909–19914 | `idemStats()` |
| 19917–19933 | `postLedger()` |
| 19934–19947 | `accountBalance()` |
| 19948–19958 | `trialBalance()` |
| 19961–19977 | `recordRefund` wrapper |
| 19978–19991 | `creditRiderWallet` wrapper |
| 19992–20005 | `debitRiderWallet` wrapper |
| 20007–20025 | `acceptEmergency` wrapper |
| 20030–20051 | `postFareCapture()` |
| 20053–20068 | `ledgerReconcile()` |
| 20069–20119 | `renderLedger()` |
| 20120–20128 | `backfillFareLedger()` |
| 20131–20141 | `demoDoubleRefund()` |
| 20145–20151 | `ledgerBoot()` |
| 21822 | Boot registration `{name:'ledger',fn:ledgerBoot,needs:['ledger','idempotency']}` |
