# Module: Driver Onboarding & Applicants (KYC review)

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page ids:** `all-pending` — `div#p-all-pending` (**L1324–L1341**) · `applicant-detail` — `div#p-applicant-detail` (**L1342–L1350**, body `div#appd-body`)
> **Embedded surface:** the "Pending driver approvals" card inside `div#p-drivers` (**L890–L894**)
> **Render entries:** `renderPendingDrivers()` L10894 · `renderAllPending(search)` L10939 · `window.openApplicantDetail(id,isBack)` L8865 → `window.buildApplicantDetailBody(a,approved)` L7114
> **Companion doc:** `08a-drivers.md` (the roster an approved applicant lands in)

---

## 1. Purpose

This is the KYC funnel: everything between "a person submitted a driver application from the app" and "a `DRV-####` record exists on the roster and can accept trips".

It spans three surfaces:

1. **Triage card** on the Drivers page (L890–L894) — the top 3 open applications with inline Approve / Reject. Designed to be the first actionable thing on that page (comment L20947).
2. **All pending applications** page (L1324–L1341) — every application, decided or not, with a search box.
3. **Applicant / driver full detail** page (L1342–L1350) — the KYC review screen: personal data, vehicle + class verification, device fingerprint, bank account, submitted document scans with per-document approve/reject, document expiry-date capture, location history, and the approve/reject/reconsider actions.

Two audit-flagged gaps are explicitly closed here by design comments in the source:
- **Vehicle class was self-declared and unchecked** → `VEHICLE_CLASS_MAP` cross-reference (comment L10951–L10958).
- **Document expiry dates were missing or auto-guessed a year out** → real date capture at review time (comment L10986–L10992).

---

## 2. Entry points & routing

### 2.1 Page `all-pending`

| # | Entry | Line |
|---|---|---|
| 1 | Drivers page → `View all pending applications →` | L893 — `go('all-pending',null)` |
| 2 | `go()` dispatch | L8793 — `if(id==='all-pending'){renderAllPending('');}` — **always resets the search to empty**, even on Back |

There is **no sidebar item** for this page. Toolbar title ← `titles['all-pending']='All Pending Applications'` (L2168); toolbar subtitle ← `subs['all-pending']='5 applications'` (L2169, static — never recomputed by `refreshNavCounts`).

### 2.2 Page `applicant-detail`

| # | Entry | Line |
|---|---|---|
| 1 | Applicant name click in any applicant row (both the triage card and the All-Pending list) | L10933 — `openApplicantDetail(a.id)` |
| 2 | `goBack()` restoring a `{type:'applicant'}` history frame | L7018 — `openApplicantDetail(prev.id,true)` |
| 3 | Re-render after a decision, while already on the page | L11119, L11132 — `if(document.getElementById('p-applicant-detail').classList.contains('on'))openApplicantDetail(id)` |
| 4 | Re-render after a per-document verdict | L10859, L10881 — `openApplicantDetail(appId,true)` |

`openApplicantDetail(id,isBack)` (L8865–L8877):
```
a        = DB.pendingDrivers.find(x => x.id===id)
approved = (a && a.status==='approved' && a.approvedAs) ? DB.drivers[a.approvedAs] : null
if (!a) approved = Object.values(DB.drivers).find(d => d.id===id)   // accepts a DRV-id directly
if (!isBack) pushHistory()
navCurrent = {type:'applicant', id:id}
→ show #p-applicant-detail, tb-title='Applicant Detail', tb-sub=id, updateBackBtn()
→ buildApplicantDetailBody(a, approved)
```
So the page serves **three shapes**: a live applicant, an applicant who has already been approved (showing the resulting driver record), and a raw driver id with no application behind it.

Header buttons: `← Back to drivers` → `go('drivers',null)` (L1327) on All-Pending; `← Back` → `goBack()` (L1347) on Applicant Detail.

---

## 3. Layout map

### 3.1 Pending driver approvals card (inside `#p-drivers`, L890–L894)

| Element | id | Line |
|---|---|---|
| Card, `border-color:var(--amber-border)` | — | L890 |
| Header `.ch`, `background:var(--amber-lt)`: `🕓 Pending driver approvals` + count badge | `#pending-count` (`b b-amber`, default text `3`) | L891 |
| Header caption, 10.5px, `var(--amber-dk)`: `New applicants — review documents before activation` | — | L891 |
| Scroll list, `max-height:320px; overflow-y:auto` | `#pending-drivers-list` | L892 |
| Footer, `display:none` by default, centred, top border: button `View all pending applications →` | `#pending-drivers-footer` | L893 |

### 3.2 Page `all-pending` (L1324–L1341)

| Order | Element | id | Line |
|---|---|---|---|
| 1 | `.ph` header — H1 `🕓 All pending driver applications`, subtitle `— applicants awaiting review` | `#all-pending-sub` | L1326 |
| 2 | Header right — button `← Back to drivers` | — | L1327 |
| 3 | Card header `.ch` — H2 `Applications` + search pill (magnifier SVG + input) | `#pending-search` | L1330–L1335 |
| 4 | Scroll list, `max-height:620px; overflow-y:auto` | `#all-pending-list` | L1337 |

### 3.3 Page `applicant-detail` (L1342–L1350)

| Order | Element | id | Line |
|---|---|---|---|
| 1 | `.ph` header — H1 (avatar + name) | `#appd-name` (placeholder `—`) | L1345 |
| 2 | Header subtitle | `#appd-meta` (placeholder `—`) | L1345 |
| 3 | Header right — `← Back` → `goBack()` | — | L1347 |
| 4 | Everything else, injected wholesale | `#appd-body` | L1349 |

`#appd-body` composition order (return statement L7157–L7163):
`statusBanner` → `g2` two-column grid (**left:** Personal information + Device & access; **right:** Vehicle + Bank account) → `stats` (approved only) → `locationCard` → `docsCard` → `docExpiryCard` → `actions`.

---

## 4. Data model & fields

### 4.1 `DB.pendingDrivers` — array (L2712–L2743). Five seeded applicants `APP-2201` … `APP-2205`.

| Field | Type | Meaning | Example (APP-2201, L2713) |
|---|---|---|---|
| `id` | string `APP-####` | Application id (primary key) | `'APP-2201'` |
| `name` | string | Applicant full name | `'Saad Al-Quraishi'` |
| `phone` | string | Contact number | `'+966 58 010 2030'` |
| `vehicle` | string `"<Model> <Year> · <Colour>"` | Declared vehicle; first alphabetic token is parsed for class verification | `'Elantra 2024 · Blue'` |
| `plate` | string | Plate number — **applicant-only field**, not copied to the driver record | `'ABC 4521'` |
| `type` | `Economy` \| `Comfort` | **Self-declared** vehicle class, cross-checked at review | `'Economy'` |
| `applied` | string `"<DD Mon> · <relative>"` | Submission label; free text, not a date | `'24 Jun · 2 days ago'` |
| `dob` | string `"<DD Mon YYYY>"` | Date of birth | `'14 Mar 1994'` |
| `nid` | string, 10 digits | Saudi national ID | `'1098234567'` |
| `address` | string | Self-reported address | `'Al Olaya District, Riyadh'` |
| `city` | string | City | `'Riyadh'` |
| `gender` | `Male` \| `Female` | Gender | `'Male'` |
| `device` | string | Device + OS fingerprint | `'iPhone 13 · iOS 17.2'` |
| `appLang` | `Arabic` \| `English` | App language | `'Arabic'` |
| `lastIp` | string | Last known IP | `'92.96.41.9'` |
| `ipLocation` | string | Geolocated IP | `'Riyadh, SA'` |
| `hasPhoto` | boolean | Drives `avatarHTML()` | `true` |
| `movementLog` | array `{date,action,location}` | Timeline; every seed has exactly one entry `Application submitted` | 1 entry |
| `bank.bankName` | string | Bank | `'Al Rajhi Bank'` |
| `bank.iban` | string | IBAN (spaced) | `'SA44 8000 0000 6080 1016 7519'` |
| `bank.holder` | string | Account holder | `'Saad Al-Quraishi'` |
| `bank.status` | `Verified` \| `Pending verification` | Bank verification state | `'Verified'` |
| `docs` | object, 5 fixed keys | Per-document verdict strings — see §6 | `{license:'✓ Verified', …}` |
| `docNotes` | object `key → reason` | **Created lazily** by `confirmDocReject()` (L10876); absent in every seed | — |
| `docExpiry` | object `DOC_TYPES key → 'YYYY-MM-DD'` | **Created by `saveDocExpiry()`** (L11041); absent in every seed | — |
| `acceptedTrips` | number | Always `0` in seeds; copied to the driver on approval | `0` |
| `cancelledTrips` | number | Always `0` in seeds | `0` |
| `status` | `pending` \| `approved` \| `rejected` | Funnel state | `'pending'` |
| `decidedBy` | string | Set on decision — **hardcoded `'Sarah Al-Rashid'`** (L11114, L11128) | — |
| `decidedAt` | string | Set on decision — **hardcoded `'Just now'`** | — |
| `approvedAs` | string `DRV-####` | Set on approval only (L11114) | — |
| `reason` | string | Set on rejection only (L11128) | — |

**All five seeds start `status:'pending'`** — no seeded approved or rejected application exists. The decided-state UI is only reachable by acting in-session.

### 4.2 Seeded applicant summary

| id | Name | Type | Vehicle | Plate | Applied | Bank status | Docs not verified | Photo |
|---|---|---|---|---|---|---|---|---|
| APP-2201 | Saad Al-Quraishi | Economy | Elantra 2024 · Blue | ABC 4521 | 24 Jun · 2 days ago | Verified | `background: ⏳ Pending` | yes |
| APP-2202 | Mona Al-Tamimi | Comfort | Tucson 2023 · White | KLM 7790 | 25 Jun · today | Verified | `vehicle_reg: ⏳ Pending` | no |
| APP-2203 | Fares Al-Subaie | Economy | Accent 2021 · Grey | XYZ 1102 | 23 Jun · 3 days ago | **Pending verification** | none — all 5 verified | yes |
| APP-2204 | Naif Al-Dawsari | Comfort | Sonata 2022 · Black | QRS 3387 | 22 Jun · 4 days ago | Verified | `id_card: ⏳`, `insurance: ⏳` | no |
| APP-2205 | Rakan Al-Otaibi | Economy | Yaris 2023 · Silver | TUV 5512 | 21 Jun · 5 days ago | Verified | `license: ⏳`, `background: ⏳` | yes |

All five declared classes **match** `VEHICLE_CLASS_MAP` (elantra/accent/yaris → Economy; tucson/sonata → Comfort), so the mismatch branch is unreachable on seed data.

### 4.3 The driver record produced by approval (`approveDriver`, L11094)

```js
DB.drivers[newId] = {
  id:newId, name:a.name, phone:a.phone, email:genEmail,
  rating:0, lvl:'new', vehicle:a.vehicle, type:a.type, joined:'Jun 2026',
  dob:a.dob, nid:a.nid, address:a.address, city:a.city, gender:a.gender,
  device:a.device, appLang:a.appLang, lastIp:a.lastIp, ipLocation:a.ipLocation,
  hasPhoto:a.hasPhoto, bank:a.bank, movementLog:a.movementLog||[], notifLog:[],
  trips:[], payments:[], complaints:[],
  stats:{totalTrips:0, monthEarn:'0 SAR', onTime:'—', activeSubs:'0/0'},
  acceptedTrips:0, cancelledTrips:0
}
```
**Not carried over:** `plate`, `applied`, `docs`, `docNotes`, `docExpiry` (the last is transformed into `DB.driverDocs`), `status`. **Not created:** `capacity`, `mapPos`, `status` — so the new driver has no map pin and shows `—` (rendered green) in the roster's Capacity column.

---

## 5. Levels / tiers / ratings at onboarding

| Aspect | Value at approval | Line |
|---|---|---|
| `rating` | `0` → renders as the grey `New` chip in the roster and `New` on the applicant stat card | L11100 |
| `lvl` | `'new'` → `lvlBadge` maps to `b-grey` / label `New` (L3261) | L11100 |
| First tier promotion | Requires a real rating; `computeDriverTier()` returns `'new'` while `rating===0` (L13596) | L13595 |
| Earliest possible Silver | `rating ≥ 4.3` **and** `tenureDays ≥ 30`. Because `joined` is hardcoded `'Jun 2026'` (L11100) and `REQ_NOW_REF` is 25 Jun 2026, `parseJoinedDate` returns **1 Jun 2026** → tenure starts at **24 days** on day one | L13581, L13588 |
| Earliest possible Gold | `rating ≥ 4.7` **and** `tenureDays ≥ 90` | L13598 |
| Subscription eligibility | Blocked — `driverTrustedForSubs()` requires `driverCompletedTripsCount() ≥ 10` (`driver_min_trips_for_subs`, L2586). New driver's `stats.totalTrips` is `0`, so `parseInt('0')||0 = 0` (L4485). Quick Rides stay open | L4487 |
| Fast-track | Ops toggle **"Trusted new driver — skip this requirement"** on the 360° profile (`#drv-trust-{id}`, L4128) | L9139 |
| Applicant-stage rating display | `d.rating ? '★ '+d.rating : 'New'` on the stat card — approved-only | L7141 |

There is **no rating, tier, or low-rating filter anywhere in the onboarding funnel**. `toggleLowRatingFilter()` (L15345) belongs to the All-Trips page and never touches applicants.

---

## 6. Documents & compliance items

### 6.1 Two separate document sets exist — they do not match

**Set A — application verdict set** (`a.docs` object keys, L2717 and identical in all five seeds), rendered by `docsGrid()`:

| # | Key | UI label (`key.replace('_',' ')` title-cased) | States | Expiry captured? | Rejection flow |
|---|---|---|---|---|---|
| 1 | `license` | License | `✓ Verified` / `⏳ Pending` / `✗ Rejected` | Yes (matches `DOC_TYPES[0]`) | `setDocStatus(id,'license','rej')` |
| 2 | `id_card` | Id card | same | **No** — not in `DOC_TYPES` | same |
| 3 | `vehicle_reg` | Vehicle reg | same | Yes (`DOC_TYPES[1]`) | same |
| 4 | `background` | Background | same | **No** — not in `DOC_TYPES` | same |
| 5 | `insurance` | Insurance | same | Yes (`DOC_TYPES[3]`) | same |

**Set B — expiry-tracking set** (`DOC_TYPES`, L13277), rendered by the "📅 Document expiry dates" card and carried into `DB.driverDocs` on approval:

| # | Key | Label | In `a.docs`? |
|---|---|---|---|
| 1 | `license` | Driving license | yes |
| 2 | `vehicle_reg` | Vehicle registration (Istimara) | yes |
| 3 | `inspection` | Periodic inspection (Fahs) | **no** |
| 4 | `insurance` | Insurance | yes |
| 5 | `operating_card` | Transport authority operating card | **no** |

Net effect: `id_card` and `background` are verified but never get an expiry date; `inspection` and `operating_card` get an expiry date but are never visually verified or rejectable. See §19.

### 6.2 Verdict string → styling — `docStatusMeta(statusText)` (L10847–L10851)

| Condition | `cls` | border | background | badge |
|---|---|---|---|---|
| `statusText.indexOf('✓')===0` | `ok` | `#9DC86A` | `#F7FBF1` | `b-green` |
| `statusText.indexOf('✗')===0` | `rej` | `var(--red-border)` | `var(--red-lt)` | `b-red` |
| anything else (incl. `⏳ Pending`) | `pend` | `var(--amber-border)` | `#FFFAF0` | `b-amber` |

### 6.3 Document card — `window.docCardHTML(appId,key,statusText,note)` (L7092–L7107)

Per card, top to bottom:
- **Thumbnail** — 64 px tall, `repeating-linear-gradient(135deg,#E9E6DE …)` stripes, centred photo-frame SVG, and a corner label `scan.jpg`. `onclick="zoomDoc(key)"`, `cursor:pointer`.
- **Label** — `key.replace('_',' ')` with each word's first letter upper-cased, 10 px, weight 600.
- **Status badge** — the raw verdict string in the class from `docStatusMeta`.
- **Rejection note** — when `note` is present: `⚠ {note}` in `var(--red)`, 9 px.
- **Two 22 px buttons**, flex 1 each:
  - `✓` — `title="Approve this document"` → `stopEv(event); setDocStatus(appId,key,'ok')`. Filled green `#3B6D11` when already `ok`.
  - `✕` — `title="Reject this document"` → `stopEv(event); setDocStatus(appId,key,'rej')`. Filled `var(--red)` when already `rej`.

`window.docsGrid(appId,docs,notes)` (L7109–L7112): `display:grid; grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); gap:8px`, one `docCardHTML` per key of `docs` in object order. Defaults both arguments to `{}`.

### 6.4 Per-document approve — `setDocStatus(appId,key,'ok')` (L10852–L10857)

1. `a.docs[key] = '✓ Verified'`
2. `if(a.docNotes) delete a.docNotes[key]` — clears any prior rejection reason
3. *(L10858)* `toast('✓ {key with space} approved','ok')`
4. *(L10859)* `openApplicantDetail(appId,true)` — re-render in place, no history push

**No `requirePerm` gate. No audit entry.** Approving a document is silent — see §19.

### 6.5 Per-document reject — `setDocStatus(appId,key,'rej')` → modal → `confirmDocReject()` (L10868–L10882)

Modal **"Reject document"** (L10861–L10864):
- One field, **Reason** — `customSelectHTML('csel-doc-reject-reason','doc-reject-reason', …)`, default `'Photo unclear / blurry'`:
  | value = label |
  |---|
  | Photo unclear / blurry |
  | Document expired |
  | Mismatch with national ID |
  | Wrong document type uploaded |
  | Suspected forgery |
- Footer: `Cancel` → `closeModal()` · `Reject document` (`btn danger sm`) → `confirmDocReject(appId,key)`

`confirmDocReject` (L10868):
1. `requirePerm('approve_drivers')` — **gated** (unlike approve)
2. captures `prevDocStatus = a.docs[key]`
3. `a.docs[key] = '✗ Rejected'`
4. `a.docNotes = a.docNotes || {}; a.docNotes[key] = reason`
5. `closeModal()`
6. `logAction('reject_document','applicant',appId, 'Rejected {key} document for {appId} — {name} (reason: {reason})', {document:'{key}: {prevStatus}'}, {document:'{key}: ✗ Rejected', reason})`
7. `toast('✕ {key} rejected — {reason}','err')`
8. `openApplicantDetail(appId,true)`

A rejected document **does not block approval** — `approveDriver()` never inspects `a.docs`; only the confirmation modal warns (§7.3).

### 6.6 Document preview — `zoomDoc(key)` (L10883–L10892)

Modal `{Title-cased label} — document preview`: a 280 px striped placeholder with a photo-frame SVG and the caption *"Simulated scan preview — full document viewer would render the uploaded file here."* Footer: single `Close` button. Purely decorative.

### 6.7 Document expiry capture — the `📅 Document expiry dates` card

State var `_docExpiryEditing = {}` (L10993), keyed by `appId`. `docExpiryFormHTML(a)` (L10994) picks view or edit mode.

**View mode** — `docExpiryViewHTML(a)` (L10997–L11013). Card header `📅 Document expiry dates`, caption `Feeds Compliance auto-suspension`. One row per `DOC_TYPES` entry: label on the left, status chip on the right:
- no value → `<span class="b b-amber">Not set</span>`
- has value → `<span class="b {docState.cls}">{YYYY-MM-DD} · {docState.label}</span>` where `docState(docDaysLeft(v))` gives `EXPIRED` (red, `<0`), `{n}d left` (red, `≤7`), `{n}d left` (amber, `≤30`), `{n}d` (green, else) — L13290.
Footer button: `✏️ Edit dates` → `toggleDocExpiryEdit(a.id)`.

**Edit mode** — `docExpiryEditHTML(a)` (L11014–L11022). Caption changes to `Read the actual date off each document`. Two-column grid of five `<input type="date">`, ids `#docexp-license`, `#docexp-vehicle_reg`, `#docexp-inspection`, `#docexp-insurance`, `#docexp-operating_card`, each pre-filled from `a.docExpiry[key]`. Buttons: `Save document dates` (`btn sm p`) → `saveDocExpiry(a.id)` · `Cancel` → `toggleDocExpiryEdit(a.id,true)`.

**`toggleDocExpiryEdit(appId, cancel)`** (L11023–L11028):
```
_docExpiryEditing[appId] = cancel ? false : !_docExpiryEditing[appId];
a    = DB.pendingDrivers.find(x => x.id===appId);
card = document.getElementById('docexp-card-'+appId);
if (a && card) card.outerHTML = docExpiryFormHTML(a);   // surgical swap, page not re-rendered
```
No permission gate on the toggle itself (only on Save).

**`saveDocExpiry(appId)`** (L11029–L11049):
1. `requirePerm('approve_drivers')`
2. For each `DOC_TYPES` entry read `#docexp-{key}`; empty values are pushed onto `missing[]` **but still written** as `''`
3. `a.docExpiry = vals`; `_docExpiryEditing[appId] = false`; swap the card back to view mode
4. *(L11044)* `logAction('save_doc_expiry','applicant',appId, 'Saved document expiry dates for {name}' + (missing.length ? ' — still missing: {labels}' : ' — complete'), {}, {})` — **empty before/after objects**
5. `missing.length` → `toast('⚠ Saved — still missing: {labels}. Fill these before approving.','warn')`; else `toast('✅ Document expiry dates saved for {name}','ok')`

The card renders only for an **undecided applicant**: `docExpiryCard = (a && !isApproved && !isRejected) ? docExpiryFormHTML(a) : ''` (L7147). After approval, dates are edited from Compliance via `openDocDateEditor()` (L11050) instead.

---

## 7. Lifecycle states & transitions

### 7.1 State machine

| State | `a.status` | Entered when | Exits to | Actions available |
|---|---|---|---|---|
| **Pending review** | `'pending'` | Seed value for all five applicants; also re-entered by `reconsiderApplicant()` (L10913) | Approved, Rejected | Per-document ✓/✕, edit expiry dates, `✓ Approve application`, `✕ Reject application`, `📞 Call applicant` |
| **Approved** | `'approved'` | `approveDriver()` L11114 | *(terminal — no un-approve path)* | `Open full 360° profile`, `📞 Call`, `Flag for review` |
| **Rejected** | `'rejected'` | `rejectDriver()` L11126 | Pending, via `↻ Reconsider — Approve` | `📞 Call applicant`, `↻ Reconsider — Approve` |

Rows in a decided state render at `opacity:.7` (L10929) and swap the action buttons for a `decisionBadge` + timestamp block.

`decisionBadge(a)` (L10905–L10909):
| `a.status` | Output |
|---|---|
| `approved` | `<span class="b b-green">✓ Approved[ · {decidedBy}]</span>` |
| `rejected` | `<span class="b b-red">✕ Rejected[ · {reason}]</span>` |
| anything else | `<span class="b b-amber">⏳ Pending review</span>` |

### 7.2 Required documents before approval

There is **no hard requirement**. `approveDriver()` (L11094) reads none of `a.docs`, `a.docNotes`, `a.docExpiry`, or `a.bank.status`. Every check is advisory, surfaced only inside the confirmation modal.

### 7.3 Approve flow, end to end

**Step 1 — `confirmApproveDriver(id)`** (L7165–L7189). **No permission gate at this stage.** Builds `warnBox` from three independent checks:

| Check | Condition | Box |
|---|---|---|
| Document verification | `notVerified = values(a.docs).filter(v => v.indexOf('✓')!==0).length` | `>0` → amber: `⚠ {n} document(s) are still pending automated verification. You can still approve, but consider waiting for results first.` · `0` → green: `✓ All documents verified.` |
| Vehicle class | `verifyVehicleClass(a.vehicle,a.type).status` | `mismatch` → red: `⚠ Declared as {type}, but "{model}" is on record as a {knownClass} vehicle. Correct the class or verify manually before approving.` · `unknown` → amber: `❓ "{model\|vehicle}" isn't in the vehicle-class reference table — verify the class manually.` · `match` → no box |
| Expiry dates | `DOC_TYPES.filter(dt => !a.docExpiry[dt[0]])` | non-empty → amber: `📅 Document expiry dates not entered yet ({n} missing) — approving now will default them to 1 year out. Enter real dates below for accurate Compliance tracking.` |

Modal body: avatar (46 px) + name + `{id} · {vehicle}`; the warn boxes; then a grey box: *"Approving will activate this driver immediately, assign a new **DRV-id**, and allow them to accept trips."*
Footer: `Cancel` · `✓ Confirm approval` (`btn p sm success`) → `approveDriver(id)`.

Note: a **rejected** document (`✗ Rejected`) is counted by `notVerified` exactly like a pending one — the modal never distinguishes them.

**Step 2 — `approveDriver(id)`** (L11094–L11121), side effects in execution order:

| # | Effect | Line |
|---|---|---|
| 1 | `requirePerm('approve_drivers')` — deny → `logAction('permission_denied',…)` + `toast('🔒 Your role lacks permission: …','err')` and return | L11095 / L3126 |
| 2 | `newId = 'DRV-0'+(106+floor(random()*90))` — **random, no collision check** | L11098 |
| 3 | `genEmail = name.toLowerCase().replace(/[^a-z ]/g,'').trim().split(' ').join('.') + floor(random()*90) + '@gmail.com'` | L11099 |
| 4 | Insert `DB.drivers[newId] = {…}` (full shape in §4.3) | L11100 |
| 5 | Ensure `DB.driverDocs` exists; compute `defaultExpiry` = `REQ_NOW_REF` (or `Date.now()`) **+1 year**, ISO `YYYY-MM-DD` | L11108–L11110 |
| 6 | `DB.driverDocs[newId][key] = a.docExpiry[key] \|\| defaultExpiry` for all five `DOC_TYPES` | L11111–L11113 |
| 7 | `a.status='approved'; a.decidedBy='Sarah Al-Rashid'; a.decidedAt='Just now'; a.approvedAs=newId` | L11114 |
| 8 | `sendSystemEmail(newId, 'Welcome to Eyvar, {name}! 🚗', …, 'transactional')` — body contains driver id and vehicle on file | L11115 |
| 9 | `closeModal()` | L11116 |
| 10 | `renderPendingDrivers()` and `renderAllPending(<current #pending-search value or ''>)` | L11117 |
| 11 | `logAction('approve_driver','driver',newId, 'Approved driver application {appId} — {name} → activated as {newId}', {status:'pending'}, {status:'approved',driverId:newId})` — note `entityType` is `driver` and `entityId` is the **new DRV id**, not the APP id | L11118 |
| 12 | `toast('✅ {name} approved & activated as {newId}','ok')` | L11119 |
| 13 | If the applicant-detail page is currently `.on`, `openApplicantDetail(id)` — **without `isBack`, so this pushes a history frame** | L11120 |

The design comment at L11101–L11107 explains step 6: *"a newly-approved driver who never appears here would be invisible to auto-suspension on expiry… only defaults to a 1-year runway for whichever document type was left blank, so an incomplete entry never blocks approval outright but is still flagged beforehand."*

### 7.4 Reject flow, end to end

**Step 1 — `confirmRejectDriver(id)`** (L11081–L11093). **No permission gate.** Modal **"Confirm rejection"**:
- Avatar 46 px + name + `{id} · {vehicle}`
- Red box (L11089): *"This applicant will be notified and removed from the pending queue."*
- Field **Rejection reason** (L11090) — `customSelectHTML('csel-reject-reason','reject-reason', …)`, default `'Document mismatch'`:
  | value = label |
  |---|
  | Document mismatch |
  | Failed background check |
  | Vehicle does not meet requirements |
  | Incomplete application |
  | Other |
- Footer: `Cancel` · `✕ Confirm rejection` (`btn danger sm`) → `rejectDriver(id)`

**Step 2 — `rejectDriver(id)`** (L11122–L11134):

| # | Effect | Line |
|---|---|---|
| 1 | `requirePerm('approve_drivers')` | L11123 |
| 2 | `reason = #reject-reason value \|\| 'Not specified'` | L11127 |
| 3 | `a.status='rejected'; a.decidedBy='Sarah Al-Rashid'; a.decidedAt='Just now'; a.reason=reason` | L11128 |
| 4 | `closeModal()` | L11129 |
| 5 | `renderPendingDrivers(); renderAllPending(<search>)` | L11130 |
| 6 | `logAction('reject_driver','applicant',id, 'Rejected application {id} — {name} (reason: {reason})', {status:'pending'}, {status:'rejected',reason})` | L11131 |
| 7 | `toast('❌ Application rejected — {name} ({reason})','err')` | L11132 |
| 8 | Re-render applicant detail if it is the active page | L11133 |

**No email is sent on rejection**, despite the modal promising *"This applicant will be notified"* — see §19.

### 7.5 Reconsider flow — `reconsiderApplicant(id)` (L10910–L10917)

```
requirePerm('approve_drivers')
a.status = 'pending'
logAction('reconsider_applicant','applicant',id,
          'Reopened rejected application {id} — {name} (back to pending review)',
          {status:'rejected'}, {status:'pending'})
confirmApproveDriver(id)          // chains straight into the approval modal
```
Notably: it **does not clear** `a.decidedBy`, `a.decidedAt`, or `a.reason`, and it does **not** re-render the lists before opening the approval modal. If the operator cancels that modal, the record is left `status:'pending'` with a stale `reason` and `decidedAt:'Just now'` — and `decisionBadge()` will show `⏳ Pending review` while `a.reason` still holds the old rejection text. Reached only from the Applicant Detail actions bar of a rejected applicant (L7154).

### 7.6 Vehicle class verification (approval gate support)

`VEHICLE_CLASS_MAP` (L10959–L10966) — 30 entries:

| Class | Models |
|---|---|
| **Economy** (15) | `yaris`, `corolla`, `accent`, `rio`, `elantra`, `sunny`, `versa`, `city`, `soluto`, `picanto`, `ceed`, `i10`, `i20`, `attrage`, `mirage` |
| **Comfort** (15) | `camry`, `sonata`, `accord`, `altima`, `optima`, `k5`, `malibu`, `taurus`, `azera`, `tucson`, `sportage`, `rav4`, `cr-v`, `crv`, `pathfinder` |

- `extractVehicleModel(vehicleStr)` (L10967–L10970): `/^([A-Za-z][A-Za-z\-]*)/` on the trimmed string, lower-cased. Returns `null` if the string does not start with a letter.
- `verifyVehicleClass(vehicleStr, declaredType)` (L10971–L10977) → `{status:'unknown'|'match'|'mismatch', model, knownClass?}`.
- `vehicleVerifyBadge(vehicleStr, declaredType)` (L10978–L10983):
  | status | Badge | `title` |
  |---|---|---|
  | `match` | `<span class="b b-green">✓ Verified {declaredType}</span>` | `Model '{model}' is a known {knownClass} vehicle — matches the declared class` |
  | `mismatch` | `<span class="b b-red">⚠ Declared {declaredType} — model is known {knownClass}</span>` | `Model '{model}' is on record as {knownClass}, not {declaredType}` |
  | `unknown` | `<span class="b b-amber">❓ Unrecognized model — verify manually</span>` | `This model isn't in the reference table yet — verify manually` |

---

## 8. KPIs & metrics

The onboarding surfaces expose **four numeric readouts**; there is no KPI grid.

| Name | Element | Source | Formula | Thresholds / styling |
|---|---|---|---|---|
| **Pending count badge** | `#pending-count` (L891) | `DB.pendingDrivers` | `filter(a => a.status==='pending').length` | Static `b b-amber` chip, no threshold. HTML default text `3` (mock; real = 5) |
| **All-pending subtitle** | `#all-pending-sub` (L1326) | `DB.pendingDrivers` | `'{openCount} awaiting review · {DB.pendingDrivers.length − openCount} decided'` | none |
| **Pending-approval supply KPI** | `#supply-kpis` tile 2 (L21200) | `fleetCounts().drivers.pending` = count of `DB.drivers` with `status==='pending'` | **Always 0** — see 08a §19 #2 | amber when `>0`; click → `kpiScrollTo('pending-drivers-list')` |
| **Approved-applicant stat grid** | applicant-detail (L7136–L7142) | the resulting driver record | 4 tiles: `Trips accepted` = `d.acceptedTrips\|\|0` (green) · `Trips cancelled` = `d.cancelledTrips\|\|0` (red) · `Rating` = `d.rating ? '★ '+rating : 'New'` · `Joined` = `d.joined` (15 px) | Rendered **only** when `isApproved` |

Cross-module readouts driven by this funnel: dashboard KPI **"Pending approvals"** (`pendApp`, L10374) and notification `N4` (L2769).

---

## 9. Data displayed

### 9.1 Applicant row — `applicantRowHTML(a)` (L10918–L10938), used by BOTH lists

| Element | Source | Notes |
|---|---|---|
| Avatar (42 px) | `avatarHTML(a.name,42,a.hasPhoto)` L10930 | Photo → gradient + person SVG; no photo → 2 initials on a colour from `AV_COLORS[name.length % 6]` |
| Name (12.5 px, blue, pointer) | `a.name` | `onclick="openApplicantDetail(a.id)"` |
| Id chip | `a.id` | `b b-grey`, 9 px |
| Class chip | `a.type` | `b-com` for Comfort, `b-eco` otherwise |
| Approved-as chip | `→ {a.approvedAs}` | `b b-blue`, only when `status==='approved'` |
| Sub-line (10.5 px, ghost) | `{a.phone} · {a.vehicle} · Applied {a.applied}` | L10932 |
| Document chips row | one per `a.docs` key: `{key with space}: {verdict}` | **Two-state only**: `b-green` if the verdict starts with `✓`, `b-amber` otherwise — so a **rejected (`✗`) document renders amber, identical to pending** (L10920) |
| Actions (undecided) | `Reject` (`btn sm danger`) → `confirmRejectDriver(id)` · `Approve` (`btn sm success`) → `confirmApproveDriver(id)` | L10927–L10928 |
| Actions (decided) | `decisionBadge(a)` stacked over `{a.decidedAt\|\|''}` (9.5 px ghost), right-aligned | L10925 |
| Row container | `display:flex; gap:12px; padding:12px 14px; border-bottom:.5px solid #F2F1EE` + `opacity:.7` when decided | L10929 |

### 9.2 Applicant detail — `buildApplicantDetailBody(a, approved)` (L7114–L7164)

Resolution: `d = approved || a` (L7116); `isApproved = !!approved`; `isRejected = a && a.status==='rejected'`. If `!d` → `toast('Record not found','err'); go('drivers',null); return` (L7117).

| Element | id / card | Content | Line |
|---|---|---|---|
| Page H1 | `#appd-name` | `avatarHTML(d.name,30,d.hasPhoto)` + name; style forced to `display:flex;align-items:center;font-size:17px;font-weight:500` | L7119–L7120 |
| Page subtitle | `#appd-meta` | `{a?a.id:d.id} · {d.type} · {d.vehicle}` + one of ` · Active driver ({d.id})` / ` · Rejected` / ` · Pending review` | L7121 |
| **Status banner** | card, top | Border + background keyed to status (green `#9DC86A`/`--green-lt`, red `--red-border`/`--red-lt`, amber `--amber-border`/`--amber-lt`); left = `decisionBadge(a)`, right = `a.decidedAt \|\| 'Awaiting decision'`. **Omitted entirely when `a` is null** (raw-driver-id case) | L7123 |
| **👤 Personal information** | `kvCard` | Full name · Phone · Gender (`\|'—'`) · Date of birth · National ID · Registered address *(self-reported at signup)* · City — **7 rows**, vs 3 on the driver 360° | L7127–L7130 |
| **🚗 Vehicle** | `kvCard` | Vehicle · **Plate number** (`a?a.plate:'—'` — blank for an approved driver, since `plate` is not copied) · Type · **Class check** = `vehicleVerifyBadge(d.vehicle,d.type)` · Status badge (`Active driver — {id}` green / `Rejected` red / `Awaiting approval` amber) | L7131–L7135 |
| **📱 Device & access** | `kvCard` | Device · App language · Last known IP `{ip} ({ipLocation})`. **No ToS/Privacy consent rows** (unlike the driver 360°) | L7136–L7139 |
| **🏦 Bank account** | `bankCardHTML(d,true)` | compact variant (`margin-bottom:0`); falls back to `'<div></div>'` when `d.bank` is absent. Rows: Status (`Active` chip + `Verified` green / other amber) · Bank · IBAN (monospace) · Account holder · optional previous-accounts block | L7140 |
| **Stat grid** (`g4`) | approved only | Trips accepted · Trips cancelled · Rating · Joined — see §8 | L7141–L7146 |
| **📍 Location history** | `buildLocationHistoryCard(d)` | Caption `Since registration`; rows `{date}` · blue dot · `{action} · {location}`; empty state `No location history recorded yet.` | L7147 / L6283 |
| **📄 Submitted documents** | card | Header caption `Tap to preview · approve or reject each document`; body = `docsGrid(a.id, a.docs, a.docNotes)`. Rendered only when `a && a.docs` — so an approved applicant **still shows editable document cards** | L7125 |
| **📅 Document expiry dates** | card | `docExpiryFormHTML(a)` — only when `a && !isApproved && !isRejected` | L7147 |
| **Actions** | card | Three variants — §11 | L7148–L7156 |

---

## 10. Input fields / filters / toggles

| id | Type | Label / placeholder | Default | Options | Drives |
|---|---|---|---|---|---|
| `#pending-search` | `<input>` text, 160 px, borderless, inside a search pill | placeholder `Search name, ID, plate…` | `''` — and **reset to `''` on every navigation to the page** (L8793) | free text | `oninput="renderAllPending(this.value)"` (L1334) |
| `#doc-reject-reason` | custom select (`csel-doc-reject-reason`) | `Reason` | `Photo unclear / blurry` | 5 values — §6.5 | `confirmDocReject()` |
| `#reject-reason` | custom select (`csel-reject-reason`) | `Rejection reason` | `Document mismatch` | 5 values — §7.4 | `rejectDriver()` |
| `#docexp-license` | `<input type="date">` | `Driving license` | `a.docExpiry.license \|\| ''` | ISO date | `saveDocExpiry()` |
| `#docexp-vehicle_reg` | `<input type="date">` | `Vehicle registration (Istimara)` | idem | ISO date | idem |
| `#docexp-inspection` | `<input type="date">` | `Periodic inspection (Fahs)` | idem | ISO date | idem |
| `#docexp-insurance` | `<input type="date">` | `Insurance` | idem | ISO date | idem |
| `#docexp-operating_card` | `<input type="date">` | `Transport authority operating card` | idem | ISO date | idem |
| `#dde-{5 keys}` | `<input type="date">` | same five labels | `DB.driverDocs[id][key] \|\| ''` | ISO date | `saveDriverDocDates()` (post-approval, from Compliance) |

### 10.1 Search predicate — `renderAllPending(filter)` (L10939–L10947)

```js
f = (filter||'').trim().toLowerCase();
list = DB.pendingDrivers.filter(a =>
  !f || a.name.toLowerCase().indexOf(f)>=0
     || a.id.toLowerCase().indexOf(f)>=0
     || a.plate.toLowerCase().indexOf(f)>=0);
```
Three fields: **name, application id, plate**. Substring, case-insensitive, no phone/vehicle/city matching. `a.plate` is dereferenced unguarded — an applicant record without `plate` would throw.

The page shows **all applications regardless of status**; there is **no status filter, no sort, and no date filter**.

---

## 11. Actions

### 11.1 Triage card & All-Pending list

| Label | Handler | Line | Effect | Writes | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| Applicant **name** | `openApplicantDetail(a.id)` | L10933 | Navigate to `#p-applicant-detail` | `navStack` | none | none | no |
| **Approve** | `confirmApproveDriver(a.id)` | L10928 | Opens confirmation modal | none yet | **none at this step** | none | yes → `approveDriver` |
| **Reject** | `confirmRejectDriver(a.id)` | L10927 | Opens confirmation modal | none yet | **none at this step** | none | yes → `rejectDriver` |
| **View all pending applications →** | `go('all-pending',null)` | L893 | Navigate; resets search | `navStack` | none | none | no |
| **← Back to drivers** | `go('drivers',null)` | L1327 | Navigate | `navStack` | none | none | no |

### 11.2 Applicant Detail — actions card, three mutually exclusive variants (L7148–L7156)

**Pending** (L7156):
| Label | Handler | Effect | Permission | Audit |
|---|---|---|---|---|
| `✓ Approve application` (`btn p sm success`) | `confirmApproveDriver(d.id)` | Modal → `approveDriver` | `approve_drivers` (in step 2) | `approve_driver` |
| `✕ Reject application` (`btn sm danger`) | `confirmRejectDriver(d.id)` | Modal → `rejectDriver` | `approve_drivers` (in step 2) | `reject_driver` |
| `📞 Call applicant` | `priorityCall(d.name)` | Call-simulation modal | none | none |

**Rejected** (L7154):
| Label | Handler | Effect | Permission | Audit |
|---|---|---|---|---|
| `📞 Call applicant` | `priorityCall(d.name)` | modal | none | none |
| `↻ Reconsider — Approve` (`btn sm success`) | `reconsiderApplicant(d.id)` | `status → 'pending'`, then opens the approval modal | `approve_drivers` | `reconsider_applicant` |

**Approved** (L7152):
| Label | Handler | Effect | Permission | Audit |
|---|---|---|---|---|
| `Open full 360° profile` (`btn p sm`) | `openProfile(d.id)` | Navigate to `#p-profile` with `buildEntityProfile(d,true)` | none | none |
| `📞 Call` | `priorityCall(d.name)` | modal | none | none |
| `Flag for review` (`btn sm danger`) | `reviewDriver(d.name)` | **Stub** — modal with a hardcoded flag message; Apply does nothing (see 08a §11.2) | none | none |

**Note the `d.id` bug**: in the rejected branch (L7154) the button is built with `d.id`, but `d = approved || a` and for a rejected applicant `approved` is `null`, so `d === a` and `d.id` is the correct `APP-` id. In the pending branch (L7156) the same is true. Correct — but fragile, since the rest of the function distinguishes `a.id` from `d.id` explicitly (L7121, L7125).

### 11.3 Document actions (all on Applicant Detail)

| Label | Handler | Line | Effect | Writes | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|---|
| Thumbnail click | `zoomDoc(key)` | L10883 | Simulated preview modal | none | none | none | no |
| `✓` per document | `setDocStatus(id,key,'ok')` | L10852 | `docs[key]='✓ Verified'`, clears `docNotes[key]`, toast, re-render | applicant record | **none** | **none** | **no** |
| `✕` per document | `setDocStatus(id,key,'rej')` | L10861 | Opens the reason modal | none yet | none at this step | none | yes |
| `Reject document` (modal) | `confirmDocReject(id,key)` | L10868 | `docs[key]='✗ Rejected'`, `docNotes[key]=reason`, toast, re-render | applicant record | `approve_drivers` | `reject_document` with before/after `{document, reason}` | — |
| `✏️ Edit dates` | `toggleDocExpiryEdit(id)` | L11023 | Swaps the card to edit mode via `outerHTML` | `_docExpiryEditing[id]` | none | none | no |
| `Cancel` (expiry card) | `toggleDocExpiryEdit(id,true)` | L11023 | Back to view mode, discards edits | `_docExpiryEditing[id]` | none | none | no |
| `Save document dates` | `saveDocExpiry(id)` | L11029 | Writes all five values (blanks included), returns to view mode, toast | `a.docExpiry` | `approve_drivers` | `save_doc_expiry`, **before/after both `{}`** | no |

---

## 12. Tables & lists

Neither page uses a `<table>`. Both render a **flat list of applicant cards** from the same builder, `applicantRowHTML(a)`.

### 12.1 Triage list — `renderPendingDrivers()` (L10894–L10904)

```js
open = DB.pendingDrivers.filter(a => a.status==='pending');
document.getElementById('pending-count').textContent = open.length;
list = open.slice(0,3);                                     // hard cap of 3
footer.style.display = DB.pendingDrivers.length>3 ? 'block':'none';   // total, not open
if (!open.length) { el.innerHTML = '<div …>✓ No pending applications — all caught up.</div>'; return; }
el.innerHTML = list.map(applicantRowHTML).join('');
```

| Property | Value |
|---|---|
| Row source | `DB.pendingDrivers`, `status==='pending'` only |
| Order | Array order (`APP-2201` → `APP-2205`); no sort by `applied` date |
| Cap | First **3** |
| Filters / search | none |
| Row click | Name only → `openApplicantDetail` |
| Row actions | Approve / Reject (undecided rows only) |
| Empty state | `✓ No pending applications — all caught up.` — `padding:16px`, 11.5 px, `var(--ghost)` |
| Container | `max-height:320px; overflow-y:auto` |

### 12.2 All-pending list — `renderAllPending(filter)` (L10939–L10947)

| Property | Value |
|---|---|
| Row source | **All** of `DB.pendingDrivers` — pending, approved and rejected |
| Order | Array order; no sort |
| Filter | Search on name / id / plate (§10.1) |
| Cap | none |
| Row click | Name only |
| Row actions | Approve / Reject for undecided; badge + timestamp for decided |
| Empty state | `No matches.` — `padding:20px`, centred, 11.5 px, `var(--ghost)` |
| Container | `max-height:620px; overflow-y:auto` |
| Subtitle side-effect | Writes `#all-pending-sub` = `'{open} awaiting review · {decided} decided'` |

**Note:** `renderAllPending` writes `#all-pending-sub` unconditionally (L10942), and `approveDriver`/`rejectDriver` call it even when the Drivers page is the active one (L11116, L11129) — a harmless cross-page DOM write.

### 12.3 Document grid

`docsGrid()` (L7109) — CSS grid, `repeat(auto-fill, minmax(112px,1fr))`, gap 8 px, one card per `a.docs` key in object order: license, id_card, vehicle_reg, background, insurance. No empty state (an empty `docs` object simply yields an empty grid; the whole card is suppressed by the `a && a.docs` guard at L7125).

### 12.4 Expiry-date rows

`docExpiryViewHTML()` (L10997) — five flex rows, `justify-content:space-between`, `padding:7px 0`, `border-bottom:.5px solid #F2F1EE`. Label 11.5 px `var(--muted)` on the left, status chip (9 px) on the right. No empty state — `Not set` is the per-row empty representation.

---

## 13. 360° profile sections

The onboarding funnel has **no 360° profile of its own**. Two adjacent views exist:

1. **Applicant Detail** (`buildApplicantDetailBody`, L7114) — the KYC view, fully enumerated in §9.2. It is *not* `buildEntityProfile`.
2. **Driver 360°** (`buildEntityProfile(d, isDrv=true)`, L4083) — reached after approval via `Open full 360° profile` (L7152). Fully enumerated in **08a §13**.

Field-level differences between the two views of the same person:

| Field | Applicant Detail | Driver 360° |
|---|---|---|
| Full name, Phone, DOB, National ID | **shown** (L7128–L7129) | **absent** — profile Personal card has only Gender/Address/City (L4150–L4154) |
| Plate number | shown (L7132) | absent — `plate` is never copied to the driver record |
| Class check badge | shown (L7133) | absent |
| ToS / Privacy consent | absent | shown (L4160–L4161) |
| Submitted document scans | shown, with ✓/✕ per document | absent |
| Document expiry card | shown while undecided | absent (moved to Compliance) |
| Subscription settings card | absent | shown (L4116–L4141) |
| Earnings breakdown | absent | shown (L4164–L4176) |
| Trip history / Payments / Complaints | absent | shown (L4186–L4188) |
| Stat tiles | Trips accepted · Trips cancelled · Rating · Joined (approved only) | Total trips · Month earnings · On-time · Active subs |
| Location history | shown | shown |
| Bank account | compact variant | full variant |

---

## 14. Modals opened

| Modal | Opened by | Line | Full field list | Footer |
|---|---|---|---|---|
| **Confirm approval** | `confirmApproveDriver(id)` | L7165 | Avatar 46 px · name (13 px, 600) · `{APP-id} · {vehicle}` · up to 3 warn boxes (documents / vehicle class / expiry dates — §7.3) · grey box *"Approving will activate this driver immediately, assign a new **DRV-id**, and allow them to accept trips."* **No inputs.** | `Cancel` → `closeModal()` · `✓ Confirm approval` (`btn p sm success`) → `approveDriver(id)` |
| **Confirm rejection** | `confirmRejectDriver(id)` | L11081 | Avatar 46 px · name · `{APP-id} · {vehicle}` · red box *"This applicant will be notified and removed from the pending queue."* · **Rejection reason** select `#reject-reason` (default `Document mismatch`; options: Document mismatch / Failed background check / Vehicle does not meet requirements / Incomplete application / Other) | `Cancel` · `✕ Confirm rejection` (`btn danger sm`) → `rejectDriver(id)` |
| **Reject document** | `setDocStatus(appId,key,'rej')` | L10861 | **Reason** select `#doc-reject-reason` (default `Photo unclear / blurry`; options: Photo unclear / blurry, Document expired, Mismatch with national ID, Wrong document type uploaded, Suspected forgery). No other fields — the document key is not displayed | `Cancel` · `Reject document` (`btn danger sm`) → `confirmDocReject(appId,key)` |
| **{Doc} — document preview** | `zoomDoc(key)` | L10883 | 280 px striped placeholder + photo-frame SVG · caption *"Simulated scan preview — full document viewer would render the uploaded file here."* No inputs | `Close` |
| **📞 Priority call** | `priorityCall(name)` | L9147 | Blue circle + phone SVG · name (14 px, 600) · `{context}{ · entityId}` line | *(call-simulation controls)* |
| **Review driver — {name}** | `reviewDriver(name)` from the approved-state actions | L8995 | Hardcoded amber box `Flagged: Late 3× consecutive, on-time rate dropped to 88%.` · **Action** select `#review-action` (default `warning`; Send warning / Temporary suspension / Reassign riders / Clear flag) | `Cancel` · `Apply` → close + `toast('✅ Review action applied','ok')` — **no effect** |
| **📅 Document dates — {name}** | `openDocDateEditor(driverId)` (post-approval, from Compliance) | L11050 | Five `<input type="date">` `#dde-license` / `#dde-vehicle_reg` / `#dde-inspection` / `#dde-insurance` / `#dde-operating_card` | `Cancel` · `Save dates` → `saveDriverDocDates(driverId)` |

All modals render into `#modal-content` and are shown by `document.getElementById('modal-overlay').classList.add('open')`.

---

## 15. States & badges

| Badge / visual | Exact trigger | Class / style | Line |
|---|---|---|---|
| `⏳ Pending review` | `a.status` is neither `approved` nor `rejected` | `b b-amber` | L10908 |
| `✓ Approved[ · {decidedBy}]` | `a.status==='approved'` | `b b-green` | L10906 |
| `✕ Rejected[ · {reason}]` | `a.status==='rejected'` | `b b-red` | L10907 |
| `→ {approvedAs}` | `a.status==='approved'` (row only) | `b b-blue`, 9 px | L10933 |
| Row dimming | `a.status!=='pending'` | `opacity:.7` | L10929 |
| Economy / Comfort chip | `a.type==='Comfort'` → `b-com`, else `b-eco` | | L10933 |
| Application-id chip | always | `b b-grey`, 9 px | L10933 |
| Doc chip green | `a.docs[k].indexOf('✓')===0` | `b b-green`, 9.5 px | L10920 |
| Doc chip amber | anything else — **including `✗ Rejected`** | `b b-amber`, 9.5 px | L10920 |
| Doc card green frame | verdict starts `✓` | border `#9DC86A`, bg `#F7FBF1`, badge `b-green` | L10848 |
| Doc card red frame | verdict starts `✗` | border `--red-border`, bg `--red-lt`, badge `b-red` | L10849 |
| Doc card amber frame | otherwise | border `--amber-border`, bg `#FFFAF0`, badge `b-amber` | L10850 |
| Doc `✓` button filled | `meta.cls==='ok'` | bg `#3B6D11`, white glyph | L11100 region / L7103 |
| Doc `✕` button filled | `meta.cls==='rej'` | bg `var(--red)`, white glyph | L7104 |
| Rejection note | `a.docNotes[key]` present | `⚠ {note}` in `var(--red)`, 9 px | L7101 |
| Expiry `Not set` | `!a.docExpiry[key]` | `b b-amber`, 9 px | L11001 |
| Expiry `EXPIRED` | `docDaysLeft < 0` | `b b-red` | L13291 |
| Expiry `{n}d left` red | `0 ≤ days ≤ 7` | `b b-red` | L13292 |
| Expiry `{n}d left` amber | `7 < days ≤ 30` | `b b-amber` | L13293 |
| Expiry `{n}d` green | `days > 30` | `b b-green` | L13294 |
| Class check `✓ Verified {type}` | `verifyVehicleClass().status==='match'` | `b b-green` + tooltip | L10979 |
| Class check `⚠ Declared {type} — model is known {other}` | `'mismatch'` | `b b-red` + tooltip | L10980 |
| Class check `❓ Unrecognized model — verify manually` | `'unknown'` | `b b-amber` + tooltip | L10981 |
| Vehicle Status `Active driver — {id}` | `isApproved` | `b b-green` | L7134 |
| Vehicle Status `Rejected` | `isRejected` | `b b-red` | L7134 |
| Vehicle Status `Awaiting approval` | otherwise | `b b-amber` | L7134 |
| Status banner border/bg | approved → `#9DC86A` / `--green-lt`; rejected → `--red-border` / `--red-lt`; else `--amber-border` / `--amber-lt` | | L7123 |
| Bank `Verified` / other | `d.bank.status==='Verified'` → `b-green`, else `b-amber`; always preceded by a blue `Active` chip | | L6297 |
| Avatar with photo | `hasPhoto===true` | gradient from `PHOTO_GRADS[name.length % 5]` + white person SVG | L10838–L10841 |
| Avatar without photo | `hasPhoto` falsy | 2 initials on `AV_COLORS[name.length % 6]` | L10842–L10844 |

---

## 16. Cross-module links

| Direction | Target | Mechanism | Line |
|---|---|---|---|
| Out | **Drivers roster** | `go('drivers',null)` — Back button, and the not-found fallback | L1327, L7117 |
| Out | **360° Profile** | `openProfile(d.id)` from the approved-state actions | L7152 |
| Out | **Fleet Compliance** | `approveDriver` populates `DB.driverDocs[newId]` for all five `DOC_TYPES` | L11108–L11113 |
| Out | **Email Log (Settings)** | `sendSystemEmail(newId,'Welcome to Eyvar, {name}! 🚗',…,'transactional')` → `DB.emailOutbox` | L11115 |
| Out | **Activity log** | `approve_driver`, `reject_driver`, `reconsider_applicant`, `reject_document`, `save_doc_expiry`, `permission_denied` | L11118, L11131, L10915, L10879, L11044 |
| In | **Drivers page** | Card embedded at L890–L894, rendered on `go('drivers')` | L8791 |
| In | **Dashboard** | KPI "Pending approvals" → `go('drivers')` (lands on the card, not this page) | L10374 |
| In | **Notifications** | `type==='approval'` → `go('drivers')`; seed `N4` "New driver application — Mona Al-Tamimi submitted documents" | L2274, L2769 |
| In | **Boot sequence** | `renderPendingDrivers()` in the deferred boot block | L14563 |
| Shared | **Permissions** | `approve_drivers` legacy permission; `PAGE_PERMISSIONS.drivers` sub-perm `approve` = *"Approve / reject applications"* | L3226, L10590–L10594 |
| Shared | **`ACTION_LABELS`** | `approve_driver`, `reject_driver`, `reconsider_applicant`, `reject_document` map to display strings | L2903–L2905 |
| Shared | **Team users** | `Sarah Al-Rashid` / `Fahad Al-Dosari` both hold `approve_drivers` | L2832, L2840 |

---

## 17. Hardcoded / mock / demo values

| # | Value | Where | Line |
|---|---|---|---|
| 1 | `#pending-count` static text `3` | HTML | L891 |
| 2 | `#all-pending-sub` static text `— applicants awaiting review` | HTML | L1326 |
| 3 | `subs['all-pending'] = '5 applications'`, `subs['applicant-detail'] = 'KYC review'` | seed maps | L2169 |
| 4 | `#appd-name` / `#appd-meta` placeholders `—` | HTML | L1345 |
| 5 | All five `DB.pendingDrivers` records — names, phones, IBANs, national IDs, IPs, devices | seed | L2712–L2743 |
| 6 | `applied` values are **relative-text strings** (`'24 Jun · 2 days ago'`), not dates — cannot be sorted or aged | seed | L2713 etc. |
| 7 | Every seed has `acceptedTrips:0, cancelledTrips:0` | seed | L2717 etc. |
| 8 | Every seed `movementLog` has exactly one entry, `Application submitted` | seed | L2715 etc. |
| 9 | `decidedBy: 'Sarah Al-Rashid'` on **both** approve and reject | code | L11114, L11128 |
| 10 | `decidedAt: 'Just now'` | code | L11114, L11128 |
| 11 | `joined: 'Jun 2026'` on the created driver | code | L11100 |
| 12 | New driver id `'DRV-0'+(106+floor(random()*90))` | code | L11098 |
| 13 | Generated email `{dotted-name}{0-89}@gmail.com` | code | L11099 |
| 14 | Welcome email subject/body template | code | L11115 |
| 15 | `defaultExpiry` = today + 1 year for any blank document date | code | L11109–L11110 |
| 16 | Document thumbnail placeholder — striped gradient + `scan.jpg` label | code | L7095–L7098 |
| 17 | `zoomDoc` caption *"Simulated scan preview…"* | code | L10889 |
| 18 | `VEHICLE_CLASS_MAP` — 30 hardcoded model→class rows, no data source | code | L10959–L10966 |
| 19 | Rejection-reason option lists (5 + 5) — hardcoded, not from `DB.reasonCodes` | code | L10863, L11090 |
| 20 | `reviewDriver` amber box *"Flagged: Late 3× consecutive, on-time rate dropped to 88%."* | code | L8998 |
| 21 | Seed audit entry `AUD-0003` — `approve_driver` of `APP-2178` → `DRV-0138`; **neither id exists in `DB`** | seed | L2869 |
| 22 | Notification `N4` "New driver application" | seed | L2769 |
| 23 | `+ Onboard driver` button on the Drivers page — `toast('Driver onboarding form would open here','info')`; **there is no application-creation UI anywhere** | HTML | L888 |

---

## 18. i18n keys

**Zero.** There is no `data-i18n` attribute anywhere inside `div#p-all-pending` (L1324–L1341) or `div#p-applicant-detail` (L1342–L1350), and none inside the pending card in `div#p-drivers` (L890–L894).

Every string in this module — page titles, card headers, badge labels, document labels, modal copy, reason options, toasts, email body — is **English-only, hardcoded in JS string concatenation**. The file states the limitation explicitly at L7900–L7902.

`titles['all-pending']`, `titles['applicant-detail']`, `subs['all-pending']`, `subs['applicant-detail']` (L2168–L2169) are plain object values with no i18n key.

The only keys in the vicinity are the sidebar's `nav.drivers` / `sec.fleet` (L512, L511), whose Arabic values live at L7907 / L7909 — both belong to the Drivers module (08a §18).

---

## 19. Gaps, dead code, UNVERIFIED items

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **Two incompatible document sets.** `a.docs` uses `license, id_card, vehicle_reg, background, insurance`; `DOC_TYPES` uses `license, vehicle_reg, inspection, insurance, operating_card`. `id_card` and `background` are verified but never get an expiry date; `inspection` and `operating_card` get an expiry date but can never be visually inspected, approved, or rejected. | L2717 vs L13277 | **High** |
| 2 | **Approving a document has no permission gate and no audit entry**, while rejecting one has both. An operator without `approve_drivers` can mark every document `✓ Verified`. | L10852–L10857 vs L10868–L10882 | **High — permission bypass** |
| 3 | **A rejected document renders identically to a pending one in both lists.** `applicantRowHTML` tests only `indexOf('✓')===0` and falls back to `b-amber` — so `✗ Rejected` shows as an amber chip. The triage screen therefore cannot distinguish "waiting on a scan" from "we refused this scan". | L10920 | **High — misleading triage** |
| 4 | **`confirmApproveDriver`'s document warning counts rejected documents as "pending automated verification".** `notVerified` uses the same `indexOf('✓')!==0` test, so a forged, explicitly-rejected document produces the soft amber "you can still approve" copy rather than a hard block. | L7168–L7170 | **High** |
| 5 | **Nothing blocks approval.** `approveDriver()` reads none of `a.docs`, `a.docNotes`, `a.docExpiry`, `a.bank.status`, or the vehicle-class verdict. A mismatched class, a rejected licence and an unverified bank account can all be approved with two clicks. | L11094–L11121 | **High** |
| 6 | **New driver id can collide.** `'DRV-0'+(106+floor(random()*90))` ranges `DRV-0106`–`DRV-0195`, no uniqueness check, and `DRV-0106` already exists (L2666). A collision silently overwrites a live driver, taking its trips, payments, complaints and stats with it. | L11098 | **High** |
| 7 | **Rejection promises a notification that never happens.** The modal says *"This applicant will be notified"* but `rejectDriver()` calls no `sendSystemEmail` / `pushOpsNotification` — only approval sends mail. | L11089 vs L11122–L11134 | **High** |
| 8 | **`reconsiderApplicant` leaves the record inconsistent.** It sets `status='pending'` and audits the change, then immediately opens the approval modal — but never clears `a.reason`, `a.decidedBy`, `a.decidedAt`, and never re-renders the lists. Cancelling the modal leaves a "pending" applicant carrying a stale rejection reason and `decidedAt:'Just now'`. | L10910–L10917 | **Medium** |
| 9 | **`decidedBy` is hardcoded `'Sarah Al-Rashid'`** on both approve and reject, while `logAction()` resolves the real `CURRENT_USER_ID`. The applicant record and the audit trail can attribute the same decision to two different people. | L11114, L11128 vs L3134 | **Medium — audit integrity** |
| 10 | **`confirmApproveDriver` and `confirmRejectDriver` have no permission gate.** Any operator can open the confirmation modal; the block only fires on the final button. The denial toast therefore appears *after* the operator has read a screen implying the action is available. | L7165, L11081 | **Medium** |
| 11 | **`saveDocExpiry` writes empty strings.** Blank inputs are added to `missing[]` *and* written as `vals[key]=''`. `docExpiryViewHTML` then treats `''` as falsy → shows `Not set`, so it round-trips, but `approveDriver`'s `enteredExpiry[key] || defaultExpiry` also treats `''` as falsy → silently substitutes today+1 year. | L11035–L11038, L11113 | **Medium** |
| 12 | **`save_doc_expiry` audit entry has empty before/after objects** (`{}`,`{}`) — the actual dates are only in the free-text summary and cannot be diffed. | L11044 | Medium |
| 13 | **`approveDriver` re-opens the detail page without `isBack`** (L11119), pushing a history frame. Pressing Back after an approval returns to the same applicant-detail page rather than to the list. | L11120 vs L10859 (which correctly passes `true`) | Medium |
| 14 | **`docsCard` still renders for an approved applicant.** The guard is `a && a.docs` with no `isApproved` check, so the ✓/✕ buttons remain live on `a.docs` after the driver has been created — edits there affect nothing downstream. | L7125 vs L7147 | Medium |
| 15 | **Pending footer visibility uses the wrong count.** `DB.pendingDrivers.length > 3` counts decided applications too, so "View all pending applications →" can appear beneath a 1-row list. | L10901 | Low |
| 16 | **`plate` is lost on approval.** It is displayed on the applicant page (L7132) but never copied into `DB.drivers`, so an approved driver's Vehicle card shows `Plate number: —`, and the All-Pending plate search cannot find them afterwards. | L11100 vs L7132 | Medium |
| 17 | **All-Pending search resets on every navigation.** `go()` calls `renderAllPending('')` unconditionally (L8793) — including on Back — while the `#pending-search` input keeps its typed value, so the list and the box disagree until the next keystroke. | L8793 | Medium |
| 18 | **No status filter, no sort, no pagination on All-Pending.** Decided and open applications are interleaved in array order; `applied` is unsortable free text. | L10939–L10947, L2713 | Medium |
| 19 | **`renderAllPending` dereferences `a.plate` unguarded** — an applicant record without `plate` throws and blanks the whole list. | L10944 | Low |
| 20 | **`fleetCounts().drivers.pending` is structurally always 0** and is displayed as "Pending approval" directly above a card showing 5. The two numbers come from `DB.drivers[*].status` and `DB.pendingDrivers[*].status` respectively and can never agree. | L20930 vs L10898 | **High — contradictory UI** |
| 21 | **No application-creation path exists.** `+ Onboard driver` is a toast stub (L888); `DB.pendingDrivers` can only shrink (by decision), never grow. | L888 | Medium |
| 22 | **Rejection reasons are hardcoded**, not sourced from the configurable `Reason codes` settings tab. | L11090 | Low |
| 23 | **Mismatch and unknown branches of `vehicleVerifyBadge` are unreachable on seed data** — all five applicants and all six drivers use models present in `VEHICLE_CLASS_MAP` with matching classes. | L10959 vs L2713–L2742, L2632–L2667 | Low (test-coverage note) |
| 24 | **`stopEv(event)`** is called on both document buttons (L7103–L7104) to stop the thumbnail's `zoomDoc` click. Its definition was not located within the lines read. | L7103 | **UNVERIFIED** |
| 25 | **`sendSystemEmail(newId, …)` addresses the driver by `DRV-id`.** Whether the outbox resolves that to `d.email` (the generated Gmail address) is **UNVERIFIED** — the function body at L3578 was not read in full. | L11114 vs L3578 | UNVERIFIED |
| 26 | **`customSelectHTML(cselId, valueId, options, default)`** — the exact DOM it builds (and therefore whether `document.getElementById('reject-reason').value` reads a hidden input or a data attribute) was not read. All reason-reading code assumes a `.value`. | L10863, L11090, L10859 | UNVERIFIED |
| 27 | **`REQ_NOW_REF`** (used by `docDaysLeft`, `driverTenureDays`, `defaultExpiry`) — its definition was not located within the lines read; assumed to be 25 Jun 2026 to match `EYVAR_TODAY` (L11235). | L13288, L11109 | UNVERIFIED |
| 28 | **`isConsentCurrent` / `getUserConsent`** are called for the driver 360° but not for applicants — whether applicants carry consent records at all is **UNVERIFIED**. | L4155–L4156 | UNVERIFIED |

---

## 20. Line-number index

### HTML
| Lines | Content |
|---|---|
| L890–L894 | Pending driver approvals card (inside `#p-drivers`) |
| L891 | `#pending-count` badge (default `3`) |
| L892 | `#pending-drivers-list` |
| L893 | `#pending-drivers-footer` + `View all pending applications →` |
| L1324–L1341 | `div#p-all-pending` |
| L1326 | H1 + `#all-pending-sub` |
| L1327 | `← Back to drivers` |
| L1330–L1335 | Card header + `#pending-search` |
| L1337 | `#all-pending-list` |
| L1342–L1350 | `div#p-applicant-detail` |
| L1345 | `#appd-name`, `#appd-meta` |
| L1347 | `← Back` → `goBack()` |
| L1349 | `#appd-body` |

### Data
| Lines | Content |
|---|---|
| L2168 | `titles` — `'all-pending'`, `'applicant-detail'` |
| L2169 | `subs` — `'5 applications'`, `'KYC review'` |
| L2274 | Notification routing `type==='approval'` |
| L2712–L2743 | **`DB.pendingDrivers`** (5 applicants) |
| L2769 | Notification seed `N4` |
| L2832, L2840 | Team users holding `approve_drivers` |
| L2869 | Seed audit entry `AUD-0003` |
| L2903–L2905 | `ACTION_LABELS` — approve/reject/reconsider/reject_document |
| L3226, L3245 | `approve_drivers` label + description |
| L10590–L10594 | `PAGE_PERMISSIONS.drivers` (view / approve / contact) |
| L10959–L10966 | `VEHICLE_CLASS_MAP` |
| L10993 | `_docExpiryEditing` |
| L13277 | `DOC_TYPES` |
| L13278–L13284 | `DB.driverDocs` |

### Functions
| Line | Function |
|---|---|
| L3126 | `requirePerm(permKey)` |
| L3133 | `logAction(...)` |
| L3560 | `kvCard(title, rows)` |
| L3578 | `sendSystemEmail(toId, subject, body, category)` |
| L6283 | `buildLocationHistoryCard(d)` |
| L6294 | `bankCardHTML(d, compact)` |
| L7006 | `pushHistory()` |
| L7012 | `goBack()` — `applicant` frame at L7018 |
| **L7092** | `window.docCardHTML(appId,key,statusText,note)` |
| **L7109** | `window.docsGrid(appId,docs,notes)` |
| **L7114** | **`window.buildApplicantDetailBody(a, approved)`** |
| **L7165** | **`window.confirmApproveDriver(id)`** |
| L8774 | `window.go(...)` — dispatch `all-pending` at L8793 |
| L8827 | `window.openProfile(id, isBack)` |
| **L8865** | **`window.openApplicantDetail(id, isBack)`** |
| L8995 | `reviewDriver(name)` |
| L9147 | `priorityCall(name, context, entityId)` |
| L10680 | `requirePagePerm(pageKey, permKey)` |
| L10836 | `avatarHTML(name, size, hasPhoto)` |
| **L10847** | `docStatusMeta(statusText)` |
| **L10852** | `setDocStatus(appId, key, verdict)` |
| **L10868** | `confirmDocReject(appId, key)` |
| **L10883** | `zoomDoc(key)` |
| **L10894** | **`renderPendingDrivers()`** |
| **L10905** | `decisionBadge(a)` |
| **L10910** | **`reconsiderApplicant(id)`** |
| **L10918** | **`applicantRowHTML(a)`** |
| **L10939** | **`renderAllPending(filter)`** |
| L10967 | `extractVehicleModel(vehicleStr)` |
| L10971 | `verifyVehicleClass(vehicleStr, declaredType)` |
| L10978 | `vehicleVerifyBadge(vehicleStr, declaredType)` |
| L10994 | `docExpiryFormHTML(a)` |
| L10997 | `docExpiryViewHTML(a)` |
| L11014 | `docExpiryEditHTML(a)` |
| **L11023** | **`toggleDocExpiryEdit(appId, cancel)`** |
| **L11029** | `saveDocExpiry(appId)` |
| L11050 | `openDocDateEditor(driverId)` |
| L11064 | `saveDriverDocDates(driverId)` |
| **L11081** | `confirmRejectDriver(id)` |
| **L11094** | **`approveDriver(id)`** |
| **L11122** | **`rejectDriver(id)`** |
| L13286 | `docDaysLeft(dateStr)` |
| L13290 | `docState(days)` |
| L13297 | `complianceScan()` |
| L13595 | `computeDriverTier(d)` |
| L14535 | `kpiScrollTo(elId)` |
| L14563 | Boot call to `renderPendingDrivers()` |
| L20918 | `fleetCounts()` |
