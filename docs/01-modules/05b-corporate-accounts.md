# Module: Corporate Accounts

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page ids:** `corporate` — div `#p-corporate` (L634–L641); `corp-detail` — div `#p-corp-detail` (L644–L647), body container `#corpd-body` (L646)
> **Primary renders:** `renderCorporateList()` (L6472–L6497), `renderCorpDetail(id)` (L6571–L6638)
> **Supporting functions:** `corpTotalSpend` (L6450), `ordinalSuffix` (L6453), `nextCorpInvoiceDate` (L6457), `isCorpInvoiceDue` (L6463), `openNewCorpModal` (L6498), `commitNewCorp` (L6517), `openCorpDetail` (L6532), `getCorpUsagePolicy` (L6533), `riderVehicleTier` (L6542), `corpPolicyViolations` (L6547), `saveCorpBillingContact` (L6639), `saveCorpUsagePolicy` (L6651), `openCorpInvoiceModal` (L6669), `commitSendCorpInvoice` (L6702), `setCorpStatus` (L6715), `openAddEmployeeModal` (L6724), `commitAddEmployee` (L6738), `removeEmployeeFromCorp` (L6751), `findCorpForRider` (L4909)

---

## 1. Purpose

B2B accounts: a company entity that covers multiple rider employees under one consolidated bill. The in-file doctrine (L6446–L6449, restated at L13842–L13845):

> "A company entity covering multiple rider employees under one bill. Spend is always computed live from the linked riders' real payments — never stored as a separate number that could drift."

Three responsibilities beyond the list:
1. **Usage policy** — a spend cap, covered vehicle tier, work-hours restriction, a geographic radius from the office, and a manager-approval threshold, all evaluated per employee.
2. **Consolidated invoicing** — one VAT invoice aggregating every linked employee's paid transactions.
3. **Manager approval gate** — packages above a company-set SAR threshold are held (`Pending Approval`) until ops records the approver's decision.

Explicit scope limits stated in the UI itself:
- Policy is a **record, not a live block** (L6616): *"This is a policy record, not a live booking-time block — this file has no consumer app to intercept a ride as it's requested. Violations show up here for ops to review and follow up."*
- Approval is **email + phone, not a portal** (L6613): *"The approver gets an email and replies or calls in — they don't have their own login to click approve/reject directly. Ops records the outcome on the subscription's profile once they hear back. A true self-service approval portal is a separate, larger build."*

---

## 2. Entry points & routing

| Entry | Where | Line |
|---|---|---|
| Sidebar item → `go('corporate',this)` | Nav, badge `#sbb-corporate` (class `a`) | L503 |
| Router hook `if(id==='corporate'){renderCorporateList();}` | `window.go` body (L8774+) | L8812 |
| Boot render `renderCorporateList();` | init sequence | L14574 |
| Company name / `View` in list | `openCorpDetail(id)` → `go('corp-detail',null); renderCorpDetail(id);` | L6488, L6494, L6532 |
| After creating an account | `openCorpDetail(newId)` at the end of `commitNewCorp` | L6530 |
| From Settings → Lead Inbox | `openNewCorpModal(m.name, m.email)` on a detected corporate lead | L7546 |
| Back button on detail page | `go('corporate',null)` | L645 |
| Page titles | `corporate:'Corporate Accounts'`, `'corp-detail':'Corporate Account'` | L2168 |

**Routing gap:** `titles` has entries for both pages but the `subs` (page-subtitle) map at L2169 has **no** `corporate` or `corp-detail` key — the header sub-line is instead a static `<p id="corp-page-sub">` in HTML (L635).
**No render hook for `corp-detail`** exists in `window.go` — the detail page renders only because `openCorpDetail` calls `renderCorpDetail` explicitly after navigating. Navigating to `corp-detail` by any other route leaves the previous company's DOM in place.

Sidebar badge (L6496): `count(status==='Pending') || ''` — an empty string when zero, so the badge collapses. The static HTML value is `1` (L503), matching the single seeded `Pending` account.

---

## 3. Layout map

### 3.1 `#p-corporate` (L634–L641)

| Region | Element | Line |
|---|---|---|
| Header `.ph` | `<h1>Corporate Accounts</h1>` + `<p id="corp-page-sub">Companies with employee riders under one consolidated bill</p>` | L635 |
| Header button | `+ New corporate account` → `openNewCorpModal()` | L635 |
| KPI row `.g4` | `#corp-kpis` — empty in HTML, filled by `renderCorporateList` | L636 |
| Card | `<h2>All corporate accounts</h2>` | L637–L638 |
| Table | 7 columns, body `#corp-tbody` | L639 |

### 3.2 `#p-corp-detail` (L644–L647)

| Region | Element | Line |
|---|---|---|
| Header | `<h1 id="corpd-name">Company</h1>` + `<p id="corpd-sub">—</p>` | L645 |
| Back button | `← Corporate accounts` → `go('corporate',null)` | L645 |
| Body container | `#corpd-body` — entirely built by `renderCorpDetail` | L646 |

`#corpd-body` contains, in order (L6591–L6637):
1. `.g2` two-column row: `Company info` card + `Account summary` card.
2. Pending-activation banner (conditional).
3. `📋 Usage policy` card.
4. `💳 Billing contact` card.
5. `🧾 Monthly consolidated invoice` card.
6. `📋 Approval history` card.
7. `Employees` card with table.

---

## 4. Data model & fields

### 4.1 `DB.corporateAccounts` (declared L13846–L13849; doctrine comment L13842–L13845)

Seed: exactly **one** account, `CORP-001` — hardcoded demo data.

| Field | Type | Meaning | Set by |
|---|---|---|---|
| `id` | `CORP-###` | primary key, mirrors the object key | seed L13847 / `commitNewCorp` L6522 |
| `companyName` | string | display name; `#corpd-name`, list column 1 | seed / L6522 |
| `contactName` | string | main contact person | seed / L6522 |
| `contactEmail` | string | main contact email; invoice fallback recipient | seed / L6522 |
| `contactPhone` | string \| `null` | optional | seed (`null`) / L6522 |
| `billingType` | `'Monthly invoice'` \| `'Prepaid balance'` | drives `isCorpInvoiceDue` and the invoice-card copy | seed / L6523 |
| `expectedEmployees` | int \| `null` | target headcount, shown as `{linked} / {expected} expected` | seed (`40`) / L6523 |
| `invoiceDayOfMonth` | int 1–28 | issue day; clamped `Math.min(28, Math.max(1, parseInt(...) \|\| 1))` | seed (`1`) / L6524 |
| `lastInvoiceGeneratedAt` | string label \| `null` | set to `fmtReqNowLabel()` when an invoice is emailed | seed (`null`) / L6708 |
| `riders` | array of `RDR-####` | linked employees; the sole source of spend and headcount | seed (`[]`) / L6525, L6745, L6755 |
| `status` | `'Pending'` \| `'Active'` \| `'Trial'` | account state — see §5 | seed (`Pending`) / L6525, L6719 |
| `createdAt` | string date label | `'14 Jul'` on the seed; `fmtReqNowLabel()` on new | seed / L6525 |
| `usagePolicy` | object | see §4.2 | seed L13848 / L6526 |
| `billingContactName` | string \| `null` | overrides `contactName` for invoices | `saveCorpBillingContact` L6644 |
| `billingContactEmail` | string \| `null` | overrides `contactEmail` for invoices | L6645 |
| `billingContactPhone` | string \| `null` | — | L6646 |

**Note:** `billingContact*` fields do **not** exist on a freshly created account (`commitNewCorp`, L6522–L6526 omits them) nor on the seed — they materialise only after the first `Save billing contact`. All read sites use `c.billingContactEmail || c.contactEmail` (L6626, L6705), so absence is safe.

### 4.2 `usagePolicy` — normalised by `getCorpUsagePolicy(c)` (L6533–L6541)

If `c.usagePolicy` is missing entirely it is created with all ten keys; five keys are individually back-filled to `null` when `undefined` (L6535–L6539) — a migration path for older records. The function **mutates and returns the live object**, so all callers write through it.

| Key | Type | Default (new account, L6526) | Default (`getCorpUsagePolicy` fallback, L6534) | Meaning |
|---|---|---|---|---|
| `monthlyCapSAR` | number \| `null` | `null` | `null` | max monthly spend per employee |
| `vehicleTier` | `'any'` \| `'Economy'` \| `'Comfort'` | `'any'` | `'any'` | which tier the company covers |
| `workHoursOnly` | bool | `false` | `false` | restrict coverage to work hours |
| `workHoursStart` | `'HH:MM'` | `'08:00'` | `'08:00'` | **never surfaced in any UI field** |
| `workHoursEnd` | `'HH:MM'` | `'18:00'` | `'18:00'` | **never surfaced in any UI field** |
| `officeDistrict` | string \| `null` | *absent* → back-filled `null` | `null` | key of `RIYADH_DISTRICTS` (L7243) |
| `geoRestrictKm` | number \| `null` | *absent* → back-filled `null` | `null` | covered radius from the office |
| `requireApprovalAboveSAR` | number \| `null` | *absent* → back-filled `null` | `null` | manager-approval threshold per package |
| `approverName` | string \| `null` | *absent* → back-filled `null` | `null` | who signs off |
| `approverEmail` | string \| `null` | *absent* → back-filled `null` | `null` | recipient of the approval email |

Seed `CORP-001` policy (L13848): `{monthlyCapSAR:200, vehicleTier:'Economy', workHoursOnly:true, workHoursStart:'07:00', workHoursEnd:'19:00', officeDistrict:'Olaya / KAFD', geoRestrictKm:12}` — no approval keys, so they are back-filled to `null` on first read.

### 4.3 `DB.corpApprovalLog` (L13962) — `[]` at boot, comment: *"every manager-approval decision ever made, for audit/history — not just the current pending state"*

Entry shape (written at L4888, L4903, L9982, L9994 — always `unshift`, newest first):

| Field | Type | Notes |
|---|---|---|
| `corpId` | `CORP-###` | filter key for the detail view |
| `subId` | `SUB-####` or `SREQ-…` | subscription **or** subscription-request id, depending on origin |
| `riderId` | `RDR-####` | employee |
| `amount` | string | `sub.paid` (already `'x SAR'`) at L4888/L4903, `fmtSAR(pend.amount)` at L9982/L9994 |
| `decision` | `'Approved'` \| `'Declined'` | |
| `context` | `'New subscription'` \| `'Subscription request'` | origin of the decision |
| `decidedAt` | string | `fmtReqNowLabel()` (L9645) |

### 4.4 Rider side-link

`DB.riders[rid].corpAccountId` — set on link (L6746), `delete`d on unlink (L6756). Reverse lookup is done by scanning `riders[]` arrays instead (`findCorpForRider`, L4909–L4912), so `corpAccountId` is a redundant convenience field. **UNVERIFIED**: no read of `corpAccountId` was found in the file — it appears write-only.

### 4.5 Config read by the invoice modal

`DB.vatConfig` (L13971): `{registrationNumber:'310123456700003', companyLegalName:'Eyvar Technologies LLC', companyAddress:'Riyadh, Saudi Arabia', ratePct:15}`.
`DB.invoiceSequence` — incremented before every invoice number is minted (L6685).

---

## 5. Lifecycle states & transitions

| State | Entered when | Exits to | Actions available |
|---|---|---|---|
| `Pending` | `commitNewCorp` — every new account is created `Pending` (L6525); seed `CORP-001` (L13847) | `Active` via `setCorpStatus(id,'Active')` | Everything on the detail page **plus** the blue activation banner with `✓ Activate account` (L6598). Counted in the sidebar badge (L6496) |
| `Active` | `setCorpStatus(id,'Active')` from the activation banner (L6598, L6715) | no coded exit — see §17 | all detail actions; activation banner hidden |
| `Trial` | **never set by any code** — only styled: `statusCls = status==='Trial' ? 'b-blue' : …` (L6487) | — | — |

`setCorpStatus(id,status)` (L6715–L6723) is generic — it accepts any string — but the only call site in the file passes `'Active'` (L6598). There is no Suspend / Close / Archive control.

### 5.1 Corporate-driven subscription lifecycle (the approval gate)

This is where the module reaches into Subscriptions:

```
finalizeNewSub (L5094–L5096):
    corp          = findCorpForRider(riderId)
    corpPol       = corp ? getCorpUsagePolicy(corp) : null
    needsApproval = corpPol && corpPol.requireApprovalAboveSAR && px.total > corpPol.requireApprovalAboveSAR
```

| Outcome | Subscription fields set | Side effects |
|---|---|---|
| `needsApproval === true` | `status:'Pending Approval'`, `started:null`, `pendingManagerApproval:true`, `approvalCorp:corp.id`, `approvalThreshold:corpPol.requireApprovalAboveSAR` (L5098, L5101) | approval email to `corpPol.approverEmail` if set (L5111); `pushOpsNotification('warn', …)` (L5112); amber toast (L5113); `evaluateSubStart` is **not** called |
| `needsApproval === false` | `status:'Active'`, `started:addDaysLabel(0)` | normal dispatch/commitment flow |

Resolution:
- `approveCorpSubscription(subId)` (L4882–L4896): `pendingManagerApproval=false`, `status='Active'`, unshift `{decision:'Approved', context:'New subscription'}` to `DB.corpApprovalLog`, audit `corp_approval_granted`, then `evaluateSubStart(subId)`; opens the tracking modal if the outcome is `pending`, else re-opens the profile.
- `rejectCorpSubscription(subId)` (L4897–L4908): `pendingManagerApproval=false`, `status='Cancelled'`, unshift `{decision:'Declined'}`, audit `corp_approval_declined`, toast *"Declined — {id} cancelled, nothing charged"*.

The same gate exists on the **subscription-request** path with its own pair: `approveSubReqCorp` (L9977–L9988) and `rejectSubReqCorp` (L9989–L10000), writing `context:'Subscription request'` into the same log.

---

## 6. KPIs & metrics

`renderCorporateList` builds `#corp-kpis` from a 4-row array (L6479–L6484). Each tile is `{label, value, delta}`; only the "Invoices overdue" tile gets a conditional colour.

| # | Label | Formula | Delta line | Colour rule |
|---|---|---|---|---|
| 1 | `Corporate accounts` | `Object.keys(DB.corporateAccounts).length` (L6473) | `{count(status==='Active')} active` (L6480) | `var(--ink)` |
| 2 | `Employees covered` | `Σ (c.riders \|\| []).length` over all accounts (L6476) | `across all companies` | `var(--ink)` |
| 3 | `Total corporate spend` | `Σ corpTotalSpend(c)` over all accounts, `.toFixed(2) + ' SAR'` (L6477, L6482) | `lifetime, computed from real payments` | `var(--ink)` |
| 4 | `Invoices overdue` | `count(isCorpInvoiceDue(c))` (L6478) | `need to be generated` when `>0`, else `all caught up` | `var(--red)` when `>0`, else `var(--ink)` (L6484) |

KPI tiles here are **plain `.kpi` divs with no `click` class and no `onclick`** (L6484) — unlike the Subscriptions KPIs, they are not interactive.

### Detail-page metrics — `Account summary` card (L6594)

| Row | Formula |
|---|---|
| `Employees linked` | `(c.riders \|\| []).length` |
| `Total lifetime spend` | `corpTotalSpend(c).toFixed(2) + ' SAR'` |
| `Created` | `c.createdAt` |
| `Policy compliance` | `totalViolations` (L6587) — red `{n} issue(s)` or green `✓ All compliant` |
| `Pending approvals` | `pendingApprovalCount` (L6588–L6589) — red `{n} waiting`, clickable to `openProfile(pendingApprovalSubIds[0])`; else green `None` |

`totalViolations = Σ corpPolicyViolations(c,rid).length` across linked riders (L6587).
`pendingApprovalSubIds = Object.keys(DB.subscriptions).filter(s.approvalCorp===id && s.pendingManagerApproval)` (L6588).

---

## 7. Business formulas

### 7.1 Company lifetime spend — `corpTotalSpend(corp)` L6450–L6452

```
corpTotalSpend(c) = Σ over rid in (c.riders || []):
                        DB.riders[rid] ? riderLTV(DB.riders[rid]) : 0

riderLTV(d) = Σ over pid in (d.payments || []):                       (L4031–L4037)
                  p = DB.payments[pid]
                  (p && p.status === 'Paid') ? (parseFloat(p.amount) || 0) : 0
```
No rounding until display (`.toFixed(2)`, L6482 and L6492). Only `Paid` payments count; pending/failed/refunded are excluded.

### 7.2 Monthly spend per employee (used for the cap check)

```
monthlySpend = riderLTV(r) / riderTenureMonths(r)                      (L6553)

riderTenureMonths(d):                                                  (L4038–L4046)
    if !d.joined → 1
    parse 'MMM YYYY' from d.joined; unparseable → 1
    months = (EYVAR_TODAY.getFullYear() − joined.getFullYear())×12
             + (EYVAR_TODAY.getMonth() − joined.getMonth())
```
This is a **lifetime average**, not the current calendar month's spend — a long-tenured heavy spender can pass a cap that this month's actual spend would breach, and vice versa.

### 7.3 Policy violations — `corpPolicyViolations(c, rid)` L6547–L6570

Returns an array of human-readable strings. Three independent checks:

**a) Monthly cap** (L6553–L6554)
```
if pol.monthlyCapSAR AND monthlySpend > pol.monthlyCapSAR
    → 'Over monthly cap ({monthlySpend.toFixed(2)} / {pol.monthlyCapSAR} SAR)'
```

**b) Vehicle tier** (L6555–L6556)
```
tier = riderVehicleTier(r)                                             (L6542–L6546)
     = first non-null DB.subscriptions[sid] over r.subs
       → plan contains 'Comfort' ? 'Comfort' : 'Economy'
       → null if the rider has no subscription

if pol.vehicleTier !== 'any' AND tier AND tier !== pol.vehicleTier
    → 'Subscribed to {tier} — policy only covers {pol.vehicleTier}'
```

**c) Geographic radius** (L6557–L6568)
```
requires BOTH pol.officeDistrict AND pol.geoRestrictKm
officePos = RIYADH_DISTRICTS[pol.officeDistrict]                       (L7243–L7249)
sub       = first non-null subscription of the rider
if officePos AND sub AND sub.route:
    for each distName in sub.route.split('→').map(trim):
        pos = RIYADH_DISTRICTS[distName]
        if pos:
            km = geoDistanceKm(officePos, pos)                         (L7256–L7260)
            if km > pol.geoRestrictKm
                → '{distName} is {km.toFixed(1)} km from office — outside the {pol.geoRestrictKm} km covered radius'
```
`geoDistanceKm(a,b) = sqrt((a.x−b.x)² + (a.y−b.y)²) × GEO_SCALE_KM` — Euclidean over the map's `{x,y}` percentage coordinates. **Straight-line**, with no `ROAD_CIRCUITY_FACTOR` applied (unlike `computeRouteKm`, L7250–L7255).

**Silent no-op (flagged):** the geo check reads `sub.route`, which exists only on subscriptions created through the UI (L5099). All 7 seeded subscriptions lack it, so the radius rule never fires for the seeded dataset.

### 7.4 Quick-ride policy check (mirrored, `Done`-trip handler, L12424–L12440)

Comment L12424: *"corporate policy checks — quick rides only had zero policy coverage before this fix"*. Runs only when the trip has **no** `sub` id:
```
qrCorp = findCorpForRider(t.rider)
if qrCorp:
    if pol.vehicleTier !== 'any' AND t.type AND t.type !== pol.vehicleTier
        → 'Rode {t.type} — policy only covers {pol.vehicleTier}'
    if pol.monthlyCapSAR AND rider:
        qrMonthlySpend = riderLTV(rider)/riderTenureMonths(rider)
        if qrMonthlySpend > pol.monthlyCapSAR
            → 'Now over monthly cap ({...} / {cap} SAR) after this ride'
    if any violation:
        trip.flagged = true
        trip.corpPolicyViolation = [...]
        logAction('corp_policy_violation','trip',t.id, …)
        pushOpsNotification('warn','Policy violation — {rider}', firstViolation + ' ({company})')
```
The violation list surfaces on the trip profile under the flag badge (L4276). **No geo check** in this path.

### 7.5 Invoice math — `openCorpInvoiceModal(corpId)` L6669–L6701

```
lineItems = for each rid in c.riders, for each pid in DB.riders[rid].payments:
                p = DB.payments[pid]
                if p && p.status === 'Paid':
                    push { rider: r.name, desc: p.type, amount: parseFloat(p.amount) || 0 }

totalIncl = Σ lineItems.amount                                          (VAT-inclusive by convention)
vatRate   = DB.vatConfig.ratePct / 100                                  = 0.15
subtotal  = round((totalIncl / (1 + vatRate)) × 100) / 100
vatAmount = round((totalIncl − subtotal) × 100) / 100

DB.invoiceSequence++
invoiceNumber = 'EYV-CORP-' + new Date().getFullYear() + '-' + String(DB.invoiceSequence).padStart(6,'0')
```
Rounding: `Math.round(x*100)/100` half-up. `vatAmount` is derived from the rounded `subtotal`, so `subtotal + vatAmount === totalIncl` exactly.

**Side effect on open (flagged):** `DB.invoiceSequence++` fires when the **modal opens** (L6685), not when the invoice is sent. Opening and closing the preview burns an invoice number permanently.

**Scope:** line items are the employee's **entire payment history**, not the current billing cycle — despite the card copy *"covering every linked employee's payments this cycle"* (L6626). No date filter exists anywhere in `openCorpInvoiceModal`.

### 7.6 Invoice scheduling

```
nextCorpInvoiceDate(c):                                                 (L6457–L6462)
    day        = c.invoiceDayOfMonth || 1
    thisMonth  = new Date(EYVAR_TODAY.year, EYVAR_TODAY.month, day)
    return thisMonth >= EYVAR_TODAY ? thisMonth
                                    : new Date(EYVAR_TODAY.year, EYVAR_TODAY.month + 1, day)

isCorpInvoiceDue(c):                                                    (L6463–L6471)
    if c.billingType !== 'Monthly invoice'          → false
    dueThisMonth = new Date(EYVAR_TODAY.year, EYVAR_TODAY.month, day)
    if EYVAR_TODAY < dueThisMonth                   → false
    if !c.lastInvoiceGeneratedAt                    → true
    last = parseShortDate(c.lastInvoiceGeneratedAt)                     (L14200, year hardcoded 2026)
    return !last || last < dueThisMonth

ordinalSuffix(n):                                                       (L6453–L6456)
    s = ['th','st','nd','rd']; v = n % 100
    return s[(v−20) % 10] || s[v] || s[0]
```
`EYVAR_TODAY = new Date(2026,5,25)` (L11232) — 25 Jun 2026.
Display: `nextCorpInvoiceDate(c).toLocaleDateString('en-GB',{day:'numeric',month:'short'})` (L6627).

---

## 8. Data displayed

### 8.1 List page

| Element | Source | Type | Notes |
|---|---|---|---|
| `#corp-page-sub` | literal HTML `Companies with employee riders under one consolidated bill` | string | **hardcoded, never updated** |
| KPI 1–4 | see §6 | int / string | live-computed |
| Company cell | `c.companyName` (blue, clickable) + sub-line `{id}` | string | `DB.corporateAccounts[id]` |
| Contact cell | `c.contactName` + sub-line `c.contactEmail` | string | |
| Employees cell | `(c.riders\|\|).length` + `' / ' + c.expectedEmployees + ' expected'` when `expectedEmployees` set | string | L6490 |
| Billing cell | grey badge `c.billingType`, plus red `⚠ Overdue` badge when `isCorpInvoiceDue(c)` | HTML | L6491 |
| Total spend | `corpTotalSpend(c).toFixed(2) + ' SAR'` | string | computed |
| Status | badge, class per §13 | HTML | L6487, L6493 |
| Sidebar badge `#sbb-corporate` | `count(status==='Pending') \|\| ''` | string | L6496 |

### 8.2 Detail page

| Element | Source | Line |
|---|---|---|
| `#corpd-name` | `c.companyName` | L6575 |
| `#corpd-sub` | `{id} · {c.billingType} · Added {c.createdAt}` | L6576 |
| `Company info` card | `contactName`, `contactEmail`, `contactPhone \|\| '—'`, `billingType`, `statusBadge(c.status)`, `expectedEmployees \|\| '—'` | L6593 |
| `Account summary` card | see §6 | L6594 |
| Activation banner | shown only when `c.status==='Pending'`; copy *"This account is still pending — activate it once the first employees are linked and billing is confirmed."* | L6598 |
| Usage-policy field values | `pol.*` via `getCorpUsagePolicy(c)` | L6600–L6615 |
| Billing-contact card sub-line | `c.billingContactEmail ? 'Invoices go here instead of the main contact' : 'Not set — invoices go to the main contact above'` | L6620 |
| Invoice card copy | `One tax invoice covering every linked employee's payments this cycle — {billingType}. Sent to {billingContactEmail\|\|contactEmail} ({billing contact\|main contact})` | L6626 |
| Invoice status line | `Monthly invoice` only: red `⚠ Invoice overdue — due on the {day}{ordinal} of each month` or grey `Next invoice: {date}` | L6627 |
| Approval-history rows | `DB.corpApprovalLog` filtered on `corpId===id` | L6590, L6631 |
| Employee rows | see §11.3 | L6577–L6586 |

---

## 9. Input fields

### 9.1 New-corporate-account modal — `openNewCorpModal(prefillName, prefillEmail)` L6498–L6516

| id | Type | Label | Default | Options / validation | Drives |
|---|---|---|---|---|---|
| `corp-company` | text | `Company name *` | empty, placeholder `e.g. Al-Dossari Logistics` | required (L6520) | `companyName` |
| `corp-contact-name` | text | `Contact name *` | `prefillName \|\| ''` (from a lead) | required (L6520) | `contactName` |
| `corp-contact-email` | text | `Contact email *` | `prefillEmail \|\| ''` | required (L6520); **no format validation** — plain `type="text"` | `contactEmail` |
| `corp-contact-phone` | text | `Contact phone` | empty, placeholder `+966 5…` | none | `contactPhone` |
| `corp-billing` | native `<select>` | `Billing type` | `Monthly invoice` (first option) | `Monthly invoice`, `Prepaid balance` | `billingType` |
| `corp-expected` | number, `min="1"` | `Expected employees` | empty, placeholder `e.g. 40` | `parseInt(...,10) \|\| null` (L6523) — the `min` attribute is not enforced in JS | `expectedEmployees` |
| `corp-invoice-day` | number, `min="1" max="28"` | `Invoice issue day of month` | `1` | clamped in JS: `Math.min(28, Math.max(1, parseInt \|\| 1))` (L6524) | `invoiceDayOfMonth` |

Buttons: `Cancel` → `closeModal()`; `Create account` → `commitNewCorp()`.
Validation failure toast: `⚠ Company name, contact name, and email are required` (L6520).

### 9.2 Usage-policy form (detail page) — L6600–L6615, saved by `saveCorpUsagePolicy` L6651–L6668

| id | Type | Label | Default (value attribute) | Options / validation | Writes to |
|---|---|---|---|---|---|
| `corp-pol-cap` | number, `min="0" step="10"` | `Monthly cap per employee (SAR)` | `pol.monthlyCapSAR \|\| ''`, placeholder `No cap` | `parseFloat(...) \|\| null` (L6657) — **`0` becomes `null`** | `pol.monthlyCapSAR` |
| `corp-pol-tier` | native `<select>` | `Covered vehicle tier` | `pol.vehicleTier` | `any` → `Any`, `Economy` → `Economy only`, `Comfort` → `Comfort only` | `pol.vehicleTier` (L6658) |
| `corp-pol-office` | native `<select>` | `Office location` | `pol.officeDistrict` | `''` → `Not set — no geo restriction`, plus all 16 `RIYADH_DISTRICTS` keys | `pol.officeDistrict` — `''` stored as `null` (L6660) |
| `corp-pol-radius` | number, `min="1" step="1"` | `Covered radius from office (km)` | `pol.geoRestrictKm \|\| ''`, placeholder `e.g. 15` | `parseFloat(...) \|\| null` (L6661) | `pol.geoRestrictKm` |
| `corp-pol-approval-threshold` | number, `min="0" step="10"` | `Require approval above (SAR/package)` | `pol.requireApprovalAboveSAR \|\| ''`, placeholder `No approval required` | `parseFloat(...) \|\| null` (L6662) | `pol.requireApprovalAboveSAR` |
| `corp-pol-approver-name` | text | `Approver name` | `pol.approverName \|\| ''` | `\|\| null` (L6663) | `pol.approverName` |
| `corp-pol-approver-email` | text | `Approver email` | `pol.approverEmail \|\| ''` | `\|\| null` (L6664); no format validation | `pol.approverEmail` |
| `corp-pol-workhours` | checkbox | `Restrict coverage to work hours only` | `pol.workHoursOnly` | boolean (L6659) | `pol.workHoursOnly` |

**`workHoursStart` / `workHoursEnd` have no input field anywhere** — they are stored (`'07:00'/'19:00'` on the seed, `'08:00'/'18:00'` on new accounts) but can never be edited from the UI, and no code reads them.

Sub-heading `Manager approval` groups the three approval fields (L6607). Explanatory note L6613 (see §1). Save button `Save usage policy` → `saveCorpUsagePolicy(id)` (L6614). Footer note L6616 (see §1).

### 9.3 Billing-contact form (detail page) — L6621–L6623, saved by `saveCorpBillingContact` L6639–L6650

| id | Type | Label | Default | Validation | Writes to |
|---|---|---|---|---|---|
| `corp-bill-name` | text | `Billing contact name` | `c.billingContactName \|\| ''`, placeholder `Leave blank to use main contact` | `\|\| null` (L6644) | `c.billingContactName` |
| `corp-bill-email` | text | `Billing contact email` | `c.billingContactEmail \|\| ''`, placeholder `e.g. finance@company.com` | `\|\| null` (L6645); no format validation | `c.billingContactEmail` |
| `corp-bill-phone` | text | `Billing contact phone` | `c.billingContactPhone \|\| ''` | `\|\| null` (L6646) | `c.billingContactPhone` |

Save button `Save billing contact` → `saveCorpBillingContact(id)` (L6624).

### 9.4 Add-employee modal — `openAddEmployeeModal(corpId)` L6724–L6737

| id | Type | Label | Default | Options | Drives |
|---|---|---|---|---|---|
| `corp-emp` | custom select (`csel-corp-emp`) | `Rider` | `''` | **only riders not linked to any corporate account** — `Object.keys(DB.riders).filter(rid => !linkedElsewhere[rid])`, label `{name} · {rid}`, `search` blob `{phone} {rid} {name}`, hint = phone (L6727) | `commitAddEmployee(corpId)` |

`linkedElsewhere` is built by scanning **every** account's `riders[]` (L6726) — a rider linked to another company is excluded, not just those on this one.
When no candidate exists, the select is replaced by (L6733): *"All {totalRiders} registered riders are already linked to a corporate account (this one or another) — there's no unlinked rider left to add. Remove a rider from an account first if you need to move them."* and the `Add to account` button is omitted entirely (L6735).
Placeholder `Search rider…`; the custom select renders a search box automatically when `options.length > 6`.

---

## 10. Actions

| Label | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `+ New corporate account` (L635) | `openNewCorpModal()` L6498 | opens the creation modal | — | **none at open** | — | no |
| `Create account` (modal) | `commitNewCorp()` L6517 | validates 3 required fields; mints `newId = 'CORP-' + String(Object.keys(...).length + 1).padStart(3,'0')` (L6521); writes a full record; `closeModal()`; `renderCorporateList()`; toast; `openCorpDetail(newId)` | `DB.corporateAccounts` | `manage_subscriptions` (L6518) | `create_corporate_account`, entity `corporate`, after `{companyName}` (L6527) | no |
| Company name / `View` (row) | `openCorpDetail(id)` L6532 | `go('corp-detail',null)` then `renderCorpDetail(id)` | `navCurrent` | none | none | no |
| `✓ Activate account` (banner) | `setCorpStatus(id,'Active')` L6715 | `c.status='Active'`; `renderCorpDetail` + `renderCorporateList`; toast `✅ {company} is now Active` | `DB.corporateAccounts[id].status` | `manage_subscriptions` (L6716) | `config_updated`, entity `corporate`, after `{status}` (L6720) | no |
| `Save usage policy` | `saveCorpUsagePolicy(id)` L6651 | reads 8 controls into the live `usagePolicy` object; re-renders detail; toast `✅ Usage policy saved for {company}` | `DB.corporateAccounts[id].usagePolicy` | `manage_subscriptions` (L6652) | `config_updated` with a `before` snapshot of 6 keys (L6655) and the whole `pol` as `after` (L6665) | no |
| `Save billing contact` | `saveCorpBillingContact(id)` L6639 | writes 3 fields; re-renders; toast varies on whether an email was set | `DB.corporateAccounts[id]` | `manage_subscriptions` (L6640) | `config_updated`, `before` = 3 fields, `after` = `{billingContactEmail}` (L6647) | no |
| `Generate invoice` | `openCorpInvoiceModal(id)` L6669 | **increments `DB.invoiceSequence`** and opens the invoice preview | `DB.invoiceSequence` | **none** | none | no |
| `📧 Email invoice` (modal) | `commitSendCorpInvoice(corpId, invoiceNumber, total)` L6702 | `sendSystemEmail(toEmail, 'Your Eyvar invoice {n}', body, 'transactional')` (L6707); `c.lastInvoiceGeneratedAt = fmtReqNowLabel()` (L6708); `closeModal()`; `renderCorpDetail`; toast | `DB.emailOutbox`, `DB.corporateAccounts[id].lastInvoiceGeneratedAt` | **`view_finance`** (L6703) — different key from every other action here | `corp_invoice_sent`, entity `corporate` (L6710) | no |
| `+ Add employee` | `openAddEmployeeModal(corpId)` L6724 | opens the picker | — | **none** | — | no |
| `Add to account` (modal) | `commitAddEmployee(corpId)` L6738 | rejects empty pick (L6740) and duplicates (L6744); `c.riders.push(rid)`; `DB.riders[rid].corpAccountId = corpId` (L6746); closes; re-renders both views; toast | `DB.corporateAccounts[id].riders`, `DB.riders[rid]` | **none** (L6738–L6750 — no `requirePerm`) | `config_updated`, summary `{rider} linked to {company}` (L6747) | no |
| `Remove` (employee row) | `removeEmployeeFromCorp(corpId, rid)` L6751 | filters `rid` out of `c.riders`; `delete DB.riders[rid].corpAccountId`; re-renders both views; toast `Employee removed` | same as above | `manage_subscriptions` (L6752) | `config_updated`, summary `{rider} removed from {company}` (L6756) | **no confirmation dialog** |
| Employee name (row) | `openProfile(rid)` L6581 | 360° profile | — | none | none | no |
| `Pending approvals — N waiting` (summary) | `openProfile(pendingApprovalSubIds[0])` L6594 | opens **only the first** pending subscription | — | none | none | no |
| Approval-history employee cell | `openProfile(a.riderId)` L6631 | 360° profile | — | none | none | no |
| `← Corporate accounts` (L645) | `go('corporate',null)` | back to the list | `navCurrent` | none | none | no |
| `🏢 Convert to corporate account` (Lead Inbox) | `closeModal(); openNewCorpModal(m.name, m.email)` L7546 | opens the creation modal pre-filled from the inbound message | — | none | none | no |

---

## 11. Tables & lists

### 11.1 `#corp-tbody` — All corporate accounts (head L639, rows L6486–L6495)

| # | Header | Cell |
|---|---|---|
| 1 | Company | `c.companyName` (blue, `openCorpDetail`) + sub-line `{id}` |
| 2 | Contact | `c.contactName` + sub-line `c.contactEmail` |
| 3 | Employees | `{linked}` or `{linked} / {expected} expected` |
| 4 | Billing | grey badge `billingType` + red `⚠ Overdue` when due |
| 5 | Total spend | `{corpTotalSpend}.toFixed(2) SAR` |
| 6 | Status | status badge |
| 7 | *(unlabelled)* | `View` button |

- **Row source:** `Object.keys(DB.corporateAccounts)` in insertion order (L6473).
- **Sort / filter / search:** **none exist** for this table.
- **Row click:** none on `<tr>`; only the company name and the `View` button navigate.
- **Empty state (L6495), colspan 7:** `No corporate accounts yet — check the Inbox for leads, or add one directly.`

### 11.2 Approval history (detail, L6630–L6633)

| # | Header | Cell |
|---|---|---|
| 1 | Employee | `nm2(a.riderId)` (blue, `openProfile(a.riderId)`) |
| 2 | Amount | `a.amount` — already a formatted string |
| 3 | Context | `a.context` (`New subscription` / `Subscription request`) |
| 4 | Decision | badge `b-green` for `Approved`, `b-red` otherwise |
| 5 | Date | `a.decidedAt` |

Row source: `(DB.corpApprovalLog || []).filter(a => a.corpId === id)` (L6590), newest first (entries are `unshift`ed).
Empty state (L6632): `No approval decisions recorded yet.`

### 11.3 Employees (detail, L6577–L6586, L6635–L6637)

| # | Header | Cell |
|---|---|---|
| 1 | Rider | `r.name` (blue, `openProfile(rid)`) + sub-line `{rid}` |
| 2 | Lifetime spend | `riderLTV(r).toFixed(2) + ' SAR'` |
| 3 | Subscription | green `Has subscription` when `r.subs.length`, else grey `Quick-ride only` |
| 4 | Policy | red `⚠ {n} policy issue(s)` with the full list in the `title` attribute, else green `✓ Compliant` |
| 5 | *(unlabelled)* | red `Remove` button |

Row source: `c.riders` array order. Riders missing from `DB.riders` render as `''` (L6579) — a silently dropped row.
Empty state (L6636), colspan 5: `No employees linked yet.`

---

## 12. Modals opened

### 12.1 New corporate account — `openNewCorpModal(prefillName, prefillEmail)` L6498–L6516

- **Title:** `New corporate account`.
- **Fields:** the 7 listed in §9.1, laid out as: company name (full width), contact name (full width), contact email + contact phone (side by side), billing type + expected employees (side by side), invoice issue day (max-width 220 px).
- **Buttons:** `Cancel` → `closeModal()`; `Create account` → `commitNewCorp()`.
- **Prefill source:** the Lead Inbox conversion button (L7546) passes the inbound message's `name` and `email`. A lead is detected as corporate by `isCorpLead = /corporate|company|companies|business account/i.test(m.subject + ' ' + m.message)` (L7539).

### 12.2 Consolidated invoice — `openCorpInvoiceModal(corpId)` L6669–L6701

- **Title:** `🧾 Consolidated invoice — {companyName}`.
- **Seller block (L6688):** `DB.vatConfig.companyLegalName` (`Eyvar Technologies LLC`) and `VAT Reg. No: {DB.vatConfig.registrationNumber}` (`310123456700003`).
- **Invoice number block (L6688):** `EYV-CORP-{currentYear}-{seq padded to 6}`.
- **Billed to (L6689):** `{companyName} · {billingContactName||contactName} ({billingContactEmail||contactEmail})` plus a blue `Billing contact` badge when an override exists.
- **Line items (L6691):** scrollable (`max-height:200px`) list of `{rider name} — {payment type}` / `{amount} SAR`, one per **Paid** payment of every linked employee. Empty state: `No paid transactions recorded for this company's employees yet.`
- **Totals (L6693–L6695):** `Subtotal (excl. VAT)`, `VAT ({ratePct}%)`, bold `Total` — formulas in §7.5.
- **Buttons:** `Close` → `closeModal()`; `📧 Email invoice` → `commitSendCorpInvoice(corpId, invoiceNumber, totalIncl.toFixed(2))` — **all three values baked into the onclick string at render time** (L6699).
- **Commit** (`commitSendCorpInvoice`, L6702–L6714): `requirePerm('view_finance')`; resolves `toEmail`/`toName` with the billing-contact override; `sendSystemEmail(toEmail, 'Your Eyvar invoice {n}', "Hi {name},\n\nAttached is your consolidated invoice for {company}:\n\nInvoice: {n}\nTotal: {total} SAR\n\nEyvar", 'transactional')`; stamps `lastInvoiceGeneratedAt`; audits `corp_invoice_sent`; closes; re-renders; toast `✅ Invoice {n} emailed to {email}`.
  `sendSystemEmail` (L3578–L3585) is a logging shim — comment L3567–L3571: *"This app has no real mail server, so 'sending' an email means logging exactly what would have gone out — recipient, subject, and full body — in DB.emailOutbox."* It resolves the recipient via `nm2(toId)` / `emailFor(toId)`; **here it is handed a raw email string, not an entity id**, so `toName` falls back to the email string itself and `emailFor` returns `null` → `toEmail: '—'` in the outbox entry (see §17).

### 12.3 Add employee — `openAddEmployeeModal(corpId)` L6724–L6737

- **Title:** `Add employee`.
- **Field:** `Rider` custom select `corp-emp` (§9.4), or the exhausted-pool message.
- **Buttons:** `Cancel`; `Add to account` → `commitAddEmployee(corpId)` — rendered only when at least one candidate exists (L6735).

**No confirmation modal exists for `Remove`** — the employee row's red button unlinks immediately (L6584 → L6751).

---

## 13. States & badges

| Badge / indicator | Exact trigger | Line |
|---|---|---|
| Status badge `b-green` (list) | `c.status === 'Active'` | L6487 |
| Status badge `b-blue` (list) | `c.status === 'Trial'` — **unreachable, no code sets `Trial`** | L6487 |
| Status badge `b-amber` (list) | anything else, i.e. `Pending` | L6487 |
| Status badge (detail `Company info`) | `statusBadge(c.status)` (L3730) — different function, different palette: `Active` → `b-blue` (matches `/trip\|active/i`), `Pending` → `b-amber` (matches `/pend/i`), `Trial` → `b-grey`. **The same account shows green in the list and blue on its detail page.** | L6593 |
| Grey badge `{billingType}` | always | L6491 |
| Red `⚠ Overdue` badge | `isCorpInvoiceDue(c)` — `billingType==='Monthly invoice'` AND today ≥ the issue day AND (never invoiced OR last invoice predates this month's issue day) | L6491, L6463–L6471 |
| KPI 4 value red | `overdueCount > 0` | L6484 |
| Pending-activation banner | `c.status === 'Pending'` | L6598 |
| `Policy compliance` red | `totalViolations > 0` | L6594 |
| `Policy compliance` green `✓ All compliant` | `totalViolations === 0` | L6594 |
| `Pending approvals` red `{n} waiting` | `pendingApprovalCount > 0` | L6594 |
| `Pending approvals` green `None` | `pendingApprovalCount === 0` | L6594 |
| Employee `Has subscription` (green) | `(r.subs \|\| []).length` truthy | L6582 |
| Employee `Quick-ride only` (grey) | otherwise | L6582 |
| Employee `⚠ {n} policy issue(s)` (red) | `corpPolicyViolations(c,rid).length > 0`; full list in the `title` tooltip | L6583 |
| Employee `✓ Compliant` (green) | zero violations | L6583 |
| Approval-history `Approved` (green) / `Declined` (red) | `a.decision === 'Approved'` | L6631 |
| Invoice `⚠ Invoice overdue — due on the {n}{ordinal} of each month` (red) | `billingType==='Monthly invoice'` AND `isCorpInvoiceDue(c)` | L6627 |
| Invoice `Next invoice: {date}` (grey) | `billingType==='Monthly invoice'` AND not due | L6627 |
| Invoice `Billing contact` badge (blue, in the invoice modal) | `c.billingContactEmail` set | L6689 |
| Sidebar badge `#sbb-corporate` | `count(status==='Pending')`, hidden when zero | L6496 |
| Trip `🚩 Flagged for review` + violation list | `t.flagged && t.corpPolicyViolation` — set by the quick-ride policy check | L4276, L12436–L12437 |

---

## 14. Cross-module links

| From | Call | To |
|---|---|---|
| List row → detail | `openCorpDetail(id)` L6488, L6494 | `corp-detail` page |
| Detail back button | `go('corporate',null)` L645 | `corporate` page |
| Employee row name | `openProfile(rid)` L6581 | 360° Profile → rider |
| Approval-history employee | `openProfile(a.riderId)` L6631 | 360° Profile → rider |
| `Pending approvals` counter | `openProfile(pendingApprovalSubIds[0])` L6594 | 360° Profile → subscription |
| Settings → Lead Inbox | `openNewCorpModal(m.name, m.email)` L7546 | this module's creation modal |
| New-subscription flow | `findCorpForRider` → `getCorpUsagePolicy` → approval hold L5094–L5102 | Subscriptions module |
| Subscription profile approval banner | `approveCorpSubscription` / `rejectCorpSubscription` L4322 | writes `DB.corpApprovalLog` back into this module |
| Subscription-request flow | `approveSubReqCorp` / `rejectSubReqCorp` L9977, L9989 | writes `DB.corpApprovalLog` |
| Quick-ride completion | `findCorpForRider` policy check L12425–L12440 | flags `DB.trips[id]`, ops notification → `openProfile(t.id)` |
| Trip profile | renders `d.corpPolicyViolation` under the flag badge L4276 | Trips module |
| Approval email | `sendSystemEmail(corpPol.approverEmail, …)` L5111 | Settings → Email Log (`DB.emailOutbox`) |
| Invoice email | `sendSystemEmail(toEmail, …)` L6707 | Settings → Email Log |

---

## 15. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| `CORP-001` — Al-Dossari Logistics, Fahad Al-Dossari, `fahad.dossari@gmail.com`, `contactPhone:null`, `Monthly invoice`, `expectedEmployees:40`, `invoiceDayOfMonth:1`, `riders:[]`, `status:'Pending'`, `createdAt:'14 Jul'` | L13847 | the **entire** seeded dataset — one account with **zero** linked employees, so every spend/compliance figure on the list page renders as `0.00 SAR` / `0` at boot |
| Seed `usagePolicy` `{monthlyCapSAR:200, vehicleTier:'Economy', workHoursOnly:true, workHoursStart:'07:00', workHoursEnd:'19:00', officeDistrict:'Olaya / KAFD', geoRestrictKm:12}` | L13848 | |
| `#corp-page-sub` copy | L635 | static; nothing updates it |
| Sidebar badge `1` | L503 | replaced by `renderCorporateList` |
| `DB.vatConfig` — `310123456700003`, `Eyvar Technologies LLC`, `Riyadh, Saudi Arabia`, `ratePct:15` | L13971 | |
| Invoice prefix `EYV-CORP-`, 6-digit zero-padded sequence, year from `new Date().getFullYear()` (**the real system clock**, not `EYVAR_TODAY`) | L6686 | inconsistent with the rest of the app's frozen 2026 clock |
| `EYVAR_TODAY = new Date(2026,5,25)` used by `nextCorpInvoiceDate` / `isCorpInvoiceDue` | L11232 | |
| `parseShortDate` hardcodes year `2026` | L14204 | |
| Billing-type options `Monthly invoice` / `Prepaid balance` | L6509 | `Prepaid balance` has **no distinct behaviour** anywhere; it only suppresses the due-date logic (L6464) |
| Vehicle-tier options `any` / `Economy` / `Comfort` | L6601 | |
| Invoice-day clamp `1..28` | L6512 (attribute), L6524 (JS) | |
| Id generator `'CORP-' + String(count+1).padStart(3,'0')` | L6521 | collision-prone — see §17 |
| 16 `RIYADH_DISTRICTS` with synthetic `{x,y}` percentage coordinates | L7243–L7249 | the geo policy's entire universe |
| Lead-detection regex `/corporate\|company\|companies\|business account/i` | L7539 | |
| Explanatory copy about the approval portal and the policy-record limitation | L6613, L6616 | honest scope notes, not values |

---

## 16. i18n keys

| Key | English (DOM) | Arabic | Line |
|---|---|---|---|
| `nav.corporate` | `Corporate accounts` | `حسابات الشركات` | L503 / L7906 |

**No other `data-i18n` attribute exists in `#p-corporate` (L634–L641), `#p-corp-detail` (L644–L647), or in any corporate-related JS-generated HTML.** Every heading, column header, KPI label, field label, button, badge, modal title, toast and empty-state string in this module is English-only literal text — including the entire invoice document, which for a Saudi VAT invoice would normally require Arabic. `applyLanguage()` (L14596) can translate only the sidebar entry.

---

## 17. Gaps, dead code, UNVERIFIED items

1. **Collision-prone id generator.** `'CORP-' + String(Object.keys(DB.corporateAccounts).length + 1).padStart(3,'0')` (L6521). With `CORP-001` and `CORP-002` present, deleting `CORP-001` and creating a new account regenerates `CORP-002`, silently overwriting the existing record. Contrast the subscription generator, which retries on collision (L5090).
2. **No delete/archive path for corporate accounts.** No function removes an entry from `DB.corporateAccounts`, so item 1 is only reachable if deletion is added later. Nevertheless there is no way to close, suspend, or archive an account.
3. **`Trial` status is unreachable.** Styled at L6487 but never assigned by any code.
4. **Two different status palettes for the same value.** The list uses a bespoke `statusCls` (`Active`→green, `Trial`→blue, else amber, L6487); the detail card uses `statusBadge()` (L3730), where `Active` matches `/trip|active/i` and renders **blue**. The same account is green in one place and blue in the other.
5. **`Generate invoice` burns a sequence number on open.** `DB.invoiceSequence++` at L6685 fires when the preview opens, not when it is sent. Repeatedly opening and closing the preview permanently advances the counter and creates gaps in the invoice series — a real problem for a numbered VAT sequence.
6. **Invoice ignores the billing cycle.** The card promises *"every linked employee's payments this cycle"* (L6626) but `lineItems` includes the **entire payment history** of each employee with no date filter (L6672–L6678). Every invoice re-bills everything.
7. **`sendSystemEmail` is called with an email string, not an entity id.** Its contract (L3578–L3580) is `sendSystemEmail(toId, …)` and it resolves `toName = nm2(toId)` and `toEmail = emailFor(toId) || '—'`. `commitSendCorpInvoice` passes `toEmail` (L6707), and `finalizeNewSub` passes `corpPol.approverEmail` (L5111). Since neither is a rider/driver id, `emailFor` returns `null` and the outbox entry records `toEmail: '—'` with `toName` set to the raw email address. Corporate emails are logged with a broken recipient field.
8. **`commitSendCorpInvoice` gates on `view_finance`,** while every other write in the module gates on `manage_subscriptions` (L6518, L6640, L6652, L6716, L6752). A corporate-ops role that can rewrite billing contacts may not be able to send the invoice, and vice versa.
9. **`commitAddEmployee` has no permission gate at all** (L6738–L6750) — it mutates `DB.corporateAccounts` and `DB.riders` and writes an audit entry without `requirePerm`, unlike its sibling `removeEmployeeFromCorp` (L6752).
10. **`openCorpInvoiceModal` and `openAddEmployeeModal` are ungated** — the former even has the sequence-number side effect (item 5), reachable by any user.
11. **`Remove` employee has no confirmation.** L6584 fires `removeEmployeeFromCorp` directly. Elsewhere the file uses `confirm(...)` for comparable destructive actions (e.g. L9970).
12. **No render hook for `corp-detail` in `window.go`.** L8812 handles `corporate` only; `corp-detail` renders solely because `openCorpDetail` calls `renderCorpDetail` after navigating (L6532). Any other route to that page shows stale DOM.
13. **`corp-detail` has no `subs` map entry** (L2169) while `titles` has one (L2168) — asymmetric page metadata.
14. **`workHoursOnly` is stored but never evaluated.** `corpPolicyViolations` (L6547–L6570) implements only cap, tier and geo. No code compares a trip's time against `workHoursStart`/`workHoursEnd`, and those two fields have no UI control at all (§9.2). The checkbox is a stored preference with no consequence.
15. **The geo radius rule silently never fires on seeded data.** It requires `sub.route` (L6560), a field only present on subscriptions created through the UI (L5099). All 7 seeded subscriptions lack it.
16. **Geo distance is straight-line.** `geoDistanceKm` (L7256) omits the `ROAD_CIRCUITY_FACTOR = 1.35` that `computeRouteKm` applies (L7254), so the "covered radius" is measured as the crow flies while the app's own pricing assumes 35 % more road distance.
17. **Monthly cap uses a lifetime average, not the current month.** `riderLTV(r) / riderTenureMonths(r)` (L6553) — see §7.2.
18. **`riderVehicleTier` only inspects the rider's first subscription.** `(r.subs||[]).map(...).find(Boolean)` (L6543) returns whichever subscription happens to be first in the array; a rider with both an Economy and a Comfort package is judged on one of them arbitrarily.
19. **`corpAccountId` appears write-only.** Set at L6746, deleted at L6756; no read site was found. **UNVERIFIED** whether an unscanned code path consumes it.
20. **`Pending approvals` opens only the first waiting subscription.** L6594 hardcodes `pendingApprovalSubIds[0]`; the other pending packages are unreachable from this counter.
21. **The `Trial` state, `Prepaid balance` billing type, and `expectedEmployees` have no downstream behaviour.** `expectedEmployees` is display-only (L6490, L6593); nothing warns when linked headcount exceeds it.
22. **List page has no search, filter, sort or pagination** — acceptable at one seeded account, but it renders every key of `DB.corporateAccounts` unbounded (L6486).
23. **Employees missing from `DB.riders` vanish silently.** `renderCorpDetail` returns `''` for such a row (L6579), so a broken FK reduces the visible employee count without any warning, while `Employees linked` in the summary still counts the array length (L6594).
24. **No email-format validation anywhere.** `corp-contact-email`, `corp-bill-email` and `corp-pol-approver-email` are all `type="text"` with only a truthiness check (L6520, L6645, L6664).
25. **`saveCorpUsagePolicy` treats `0` as "unset".** `parseFloat(val(...)) || null` (L6657, L6661, L6662) — a deliberate `0 SAR` cap or `0 km` radius is stored as `null`, i.e. no restriction. The inputs advertise `min="0"`.
26. **The audit `after` payload for the usage policy is the live object.** `logAction(..., before, pol)` (L6665) passes the same mutated `pol` reference that was just written; the `before` snapshot (L6655) captures only 6 of the 10 keys — `approverName`, `approverEmail`, `workHoursStart`, `workHoursEnd` are not diffed.
27. **Invoice year comes from the real system clock.** `new Date().getFullYear()` (L6686) rather than `EYVAR_TODAY.getFullYear()` (2026), so an invoice number's year contradicts every date shown beside it.

---

## 18. Line-number index

| Item | Lines |
|---|---|
| HTML `#p-corporate` | 634–641 |
| — header + `+ New corporate account` | 635 |
| — `#corp-kpis` | 636 |
| — card + table head (7 columns) + `#corp-tbody` | 637–639 |
| HTML `#p-corp-detail` | 644–647 |
| — `#corpd-name` / `#corpd-sub` / back button | 645 |
| — `#corpd-body` | 646 |
| Sidebar nav item + `#sbb-corporate` | 503 |
| `titles` (`corporate`, `corp-detail`) | 2168 |
| `logAction` | 3133–3158 |
| `statusBadge` | 3730–3736 |
| `kvCard` | 3560–3564 |
| `nm2` | 3565 |
| `emailFor` / `sendSystemEmail` | 3572–3585 |
| `riderLTV` | 4031–4037 |
| `riderTenureMonths` | 4038–4046 |
| trip profile — `corpPolicyViolation` render | 4276 |
| `buildSubProfile` — approval banner | 4318–4324 |
| `approveCorpSubscription` | 4882–4896 |
| `rejectCorpSubscription` | 4897–4908 |
| `findCorpForRider` | 4909–4912 |
| `finalizeNewSub` — approval gate | 5094–5102, 5110–5123 |
| — approver email / notification / toast | 5111–5113 |
| **CORPORATE ACCOUNTS section header comment** | 6446–6449 |
| `corpTotalSpend` | 6450–6452 |
| `ordinalSuffix` | 6453–6456 |
| `nextCorpInvoiceDate` | 6457–6462 |
| `isCorpInvoiceDue` | 6463–6471 |
| `renderCorporateList` | 6472–6497 |
| — KPI array | 6479–6484 |
| — row template | 6486–6494 |
| — empty state | 6495 |
| — sidebar badge | 6496 |
| `openNewCorpModal` | 6498–6516 |
| `commitNewCorp` | 6517–6531 |
| `openCorpDetail` | 6532 |
| `getCorpUsagePolicy` | 6533–6541 |
| `riderVehicleTier` | 6542–6546 |
| `corpPolicyViolations` | 6547–6570 |
| `renderCorpDetail` | 6571–6638 |
| — employee rows | 6577–6586 |
| — violation / pending-approval aggregates | 6587–6590 |
| — Company info + Account summary cards | 6593–6594 |
| — pending-activation banner | 6598 |
| — usage-policy card | 6599–6618 |
| — manager-approval sub-block + note | 6607–6613 |
| — work-hours checkbox | 6615 |
| — policy-record disclaimer | 6616 |
| — billing-contact card | 6619–6624 |
| — consolidated-invoice card | 6625–6628 |
| — approval-history card | 6629–6634 |
| — employees card | 6635–6637 |
| `saveCorpBillingContact` | 6639–6650 |
| `saveCorpUsagePolicy` | 6651–6668 |
| `openCorpInvoiceModal` | 6669–6701 |
| — line-item collection | 6672–6678 |
| — VAT math | 6679–6683 |
| — `DB.invoiceSequence++` + number mint | 6684–6686 |
| `commitSendCorpInvoice` | 6702–6714 |
| `setCorpStatus` | 6715–6723 |
| `openAddEmployeeModal` | 6724–6737 |
| `commitAddEmployee` | 6738–6750 |
| `removeEmployeeFromCorp` | 6751–6759 |
| `RIYADH_DISTRICTS` | 7243–7249 |
| `computeRouteKm` | 7250–7255 |
| `geoDistanceKm` | 7256–7260 |
| `ROAD_CIRCUITY_FACTOR` | 7261 |
| `previewInboundMessage` (lead → corporate) | 7536–7548 |
| — `isCorpLead` regex | 7539 |
| — `🏢 Convert to corporate account` button | 7546 |
| i18n `nav.corporate` | 7906 |
| router hook `id==='corporate'` | 8812 |
| `fmtReqNowLabel` | 9645–9650 |
| `approveSubReqCorp` | 9977–9988 |
| `rejectSubReqCorp` | 9989–10000 |
| `EYVAR_TODAY` | 11232 |
| quick-ride corporate policy check | 12424–12440 |
| `DB.corporateAccounts` doctrine comment | 13842–13845 |
| `DB.corporateAccounts` seed | 13846–13849 |
| `DB.corpApprovalLog` | 13962 |
| `DB.vatConfig` | 13971 |
| `parseShortDate` | 14200–14205 |
| boot `renderCorporateList()` | 14574 |
