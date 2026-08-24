# Settings Tab: Email (Inbox & Outbox)

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page:** `settings` (`#p-settings`, L1416–2048) · **Pane id:** `#stab-emails` · **HTML lines:** L1845–1905
> **Nav button:** L1439 (`data-tab="emails"`, icon 📧, `data-i18n="stab.emails"`, English label `Email Log`)
> **Render fns:** `renderLeadInbox()` L7521–7537 → `#inbox-tbody`; `renderEmailOutbox()` L7557–7580 → `#emails-tbody` + 3 KPIs
> **Sub-tab switcher:** `switchMailSubTab(which)` L7515–7520

---

## 1. Purpose

Two **opposite** mail directions in one pane, deliberately separated. Pane description (L1849), verbatim:

> *"Two separate directions, don't confuse them: **Inbox** is what website visitors send *to* Eyvar (contact form). **Outbox** is everything Eyvar sends *out* — automatic system emails and manual broadcasts. This file has no real mail server, so these logs are the source of truth for what was actually received/sent."*

Outbox design comment (L3567–3571): *"This app has no real mail server, so 'sending' an email means logging exactly what would have gone out — recipient, subject, and full body — in DB.emailOutbox. sendSystemEmail() is the single choke point every real trigger in the app calls, so Settings → Email Log always reflects true system behavior, not a separate description of it."*

Inbox seed comment (L13836–13840): *"'Contact us' submissions from the public website — prospective riders, drivers asking before applying, press/partnership inquiries. This is INBOUND and has nothing to do with logged-in customer support (that's the separate Tickets system) or outbound broadcasts below. Seeded with realistic examples since this file has no live website form…"*

---

## 2. Layout map

```
#stab-emails                                                       L1845
├── .card  header 📧 "Email" + two-direction description           L1846–1851
├── sub-tab strip (flex, gap 2)                                    L1853–1856
│   ├── #mailsub-inbox   "📥 Inbox" + #inbox-unread-badge          L1854
│   └── #mailsub-outbox  "📤 Outbox"   (class "on" by default)     L1855
├── #mailtab-inbox      (display:none by default)                  L1858–1864
│   └── .card "📥 Inbox — from website visitors"                   L1859–1863
│       ├── .ch h2 + caption "Contact us form submissions…"        L1860
│       └── table.dt → tbody #inbox-tbody                          L1862
└── #mailtab-outbox     (visible by default)                       L1866–1903
    ├── .card  KPI grid, 3 columns                                 L1867–1873
    │   ├── "Total sent"   #mail-kpi-total   / "since this session started"
    │   ├── "Sent today"   #mail-kpi-today   / "last 24 hours"
    │   └── "By category"  #mail-kpi-cats    (chip cloud)
    ├── .card "📢 New broadcast"                                   L1875–1898
    │   ├── select #bc-audience (2 optgroups, 9 options)           L1879–1892
    │   ├── #bc-audience-count  caption                            L1893
    │   ├── input  #bc-subject                                     L1894
    │   ├── textarea #bc-body (rows 4)                             L1895
    │   └── [Send broadcast]  sendBroadcast()                      L1896
    └── .card "Sent mail"                                          L1899–1902
        ├── .ch h2 + search input #mail-search                     L1900
        └── table.dt → tbody #emails-tbody                         L1901
```

Default state: **Outbox** is the visible sub-tab (`#mailtab-inbox` carries `style="display:none"` at L1858, `#mailsub-outbox` carries `class="settings-tab on"` at L1855).

---

## 3. Settings fields — EVERY field

This tab has **no persisted configuration**. Every input is transient composer or filter state.

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `bc-audience` | "Audience" | `<select>`, 2 `optgroup`s, 9 options (L1879–1892), max-width 260px | first option, `all` (All riders) | segment key | full list in §8.2 | none | **not persisted** — read live by `broadcastAudienceIds()` (L7674) | `onchange="updateBroadcastAudienceCount()"` (L1879) recomputes the caption below |
| `bc-subject` | "Subject" | `input type=text`, placeholder `e.g. New Comfort plan now available` (L1894) | empty | text | free | `sendBroadcast` L7696: `if(!subject \|\| !body)` → toast `⚠ Write a subject and message first` (warn), return | into each `MAIL-nnnn.subject` | cleared to `''` after a successful send (L7702) |
| `bc-body` | "Message" | `<textarea rows=4>`, placeholder `Write the email body…`, resize:vertical (L1895) | empty | text | free, **no length cap** | same non-empty check | into each `MAIL-nnnn.body` | cleared after send (L7702) |
| `mail-search` | *(no label — placeholder only)* | `input type=text`, placeholder `Search recipient or subject…`, width 220px, height 30px (L1900) | empty | text | — | none | not persisted | `oninput="renderEmailOutbox()"` → filters the Sent-mail table on `toName + ' ' + toEmail + ' ' + subject`, case-insensitive `indexOf` (L7570–7571) |

### Read-only KPI elements

| id | Value | Sub-caption | Formula | Line |
|---|---|---|---|---|
| `mail-kpi-total` | count | `since this session started` | `DB.emailOutbox.length` | L7561 |
| `mail-kpi-today` | count | `last 24 hours` | `list.filter(e => e.ts.indexOf(new Date().toLocaleString([],{month:'short',day:'numeric'})) >= 0).length` — a **string match on the date prefix**, not a 24-hour window | L7562–7563 |
| `mail-kpi-cats` | chip cloud | — | `catCounts[e.category]++` for every record; each chip is `.b .b-grey` at 9px reading `<EMAIL_CATEGORY_LABEL[c] \|\| c> · <n>`; empty state `No emails sent yet` | L7564–7567 |
| `inbox-unread-badge` | count or `''` | — | `DB.inboundMessages.filter(m => m.status==='new').length`, blanked when 0 | L7524–7526 |
| `bc-audience-count` | `<n> recipient(s) will receive this` | — | `broadcastAudienceCount()` = `broadcastAudienceIds().length` | L7686–7689 |

Note the static HTML default text for `#bc-audience-count` is `0 rider(s) will receive this` (L1893) while `updateBroadcastAudienceCount()` writes `… recipient(s) …` (L7688) — a wording inconsistency visible only before the first recompute.

---

## 4. Tables & lists

### 4.1 Inbox table — `#inbox-tbody` (`renderLeadInbox()` L7521–7537)

Row source: `DB.inboundMessages` (L7523), rendered in **array order** — no sort, no filter, no pagination.

| # | Column header (L1862) | Cell content | Source |
|---|---|---|---|
| 1 | `From` | `<p class="td-name">` name, `<p class="td-sub">` email | `m.name`, `m.email` |
| 2 | `Subject` | plain text | `m.subject` |
| 3 | `Received` | muted 11px | `m.receivedAt` |
| 4 | `Status` | badge — `new` → `.b-blue "New"`; `replied` → `.b-green "Replied"`; anything else → `.b-grey "Read"` | `m.status` |
| 5 | *(blank header)* | `[Open]` `.btn sm` → `stopEv(event); previewInboundMessage(id)` | — |

- **Row behaviour:** whole `<tr>` is `cursor:pointer` with `onclick="previewInboundMessage('<id>')"` (L7529). Unread rows (`status==='new'`) are rendered `font-weight:600`.
- **Empty state:** `<td colspan=5>` centred, ghost — `No messages from the website yet.` (L7535).

### 4.2 Outbox "Sent mail" table — `#emails-tbody` (`renderEmailOutbox()` L7557–7580)

Row source: `DB.emailOutbox` (newest first — every writer uses `unshift`), optionally filtered by `#mail-search`.

| # | Column header (L1901) | Cell content | Source |
|---|---|---|---|
| 1 | `To` | `<p class="td-name">` recipient name, `<p class="td-sub">` email | `e.toName`, `e.toEmail` |
| 2 | `Subject` | plain text | `e.subject` |
| 3 | `Category` | `.b .b-grey` with `EMAIL_CATEGORY_LABEL[e.category] \|\| e.category` | `e.category` |
| 4 | `Sent` | muted 11px | `e.ts` |
| 5 | *(blank header)* | `[View]` `.btn sm` → `stopEv(event); previewEmail(id)` | — |

- **Row behaviour:** whole `<tr>` `cursor:pointer` → `previewEmail('<id>')` (L7573).
- **Two distinct empty states** (L7578):
  - search active but no match → `No emails match that search.`
  - list genuinely empty → `No emails sent yet this session — they'll appear here as real actions trigger them (closing a ticket, approving a driver, sending a renewal offer…).`
- No pagination, no sorting, no delete, no resend.

### 4.3 Add / edit / delete flows

| Flow | Exists? | How |
|---|---|---|
| Add outbox record | Yes | `sendSystemEmail()` (any of 21 trigger sites, §8.4), `sendBroadcast()`, `replyToInbound()` |
| Edit outbox record | **No** |
| Delete outbox record | **No** |
| Add inbox record | **No UI.** Only the 3 seeds. The intended integration point is `onInboundMessage()` (named in the contact-centre comment at L20179–20180) |
| Edit inbox record | Only `status` — mutated by `previewInboundMessage` (`new → read`, L7539) and `replyToInbound` (`→ replied`, L7552) |
| Delete inbox record | **No** |

---

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **📥 Inbox** sub-tab (L1854) | `switchMailSubTab('inbox')` L7515–7520 | Sets `#mailtab-inbox` display `block`, `#mailtab-outbox` `none`; toggles `on` class on both sub-tab buttons | DOM only | none | none | no |
| **📤 Outbox** sub-tab (L1855) | `switchMailSubTab('outbox')` | Mirror of the above | DOM only | none | none | no |
| **Row click / [Open]** (inbox) | `previewInboundMessage(id)` L7538–7550 | If `status==='new'` → set `'read'` and re-render the inbox; opens the message modal (§6.1) | `m.status` | none | none | no |
| **Reply by email →** (modal) | `replyToInbound(id)` L7551–7556 | Sets `m.status='replied'`; **directly `unshift`s** a `MAIL-nnnn` record onto `DB.emailOutbox` (bypassing `sendSystemEmail`) with `toId:null`, subject `Re: <original>`, a fixed canned body, category `transactional`; `closeModal()`; re-renders both tables; toast `✅ Reply sent to <name>` | `DB.emailOutbox`, `m.status` | **none** | **none** — no `logAction` call | **No gate** |
| **🏢 Convert to corporate account** (modal, conditional) | `openNewCorpModal(m.name, m.email)` L7549 | Opens the corporate-account creation modal, pre-filled with the sender's name and email | (that module) | (that module) | (that module) | (that module) |
| **Close** (modal) | `closeModal()` | dismiss | — | — | — | no |
| **Row click / [View]** (outbox) | `previewEmail(id)` L7581–7590 | Opens the sent-mail modal (§6.2) | none | none | none | no |
| **View <name>'s profile →** (modal) | `openProfile(e.toId)` L7589 | Navigates to the recipient's 360° page | none | none | none | no |
| **Audience `<select>` change** | `updateBroadcastAudienceCount()` L7686–7689 | Recomputes and writes `#bc-audience-count` | none | none | none | no |
| **Send broadcast** (`.btn p sm`, L1896) | `sendBroadcast()` L7694–7705 | 1. `requirePerm('manage_settings')`. 2. `val('bc-subject')`, `val('bc-body')`, both-required check. 3. `broadcastAudienceIds()`; if empty → toast `⚠ No one matches that audience`, return. 4. **`ids.forEach(id => sendSystemEmail(id, subject, body, 'broadcast'))`** — one outbox record per recipient. 5. `logAction`. 6. Clears both inputs. 7. `renderEmailOutbox(); renderSettingsMeta();` 8. toast `✅ Broadcast sent to N recipient(s) — check Email Log below` | `DB.emailOutbox` (N records), `DB.auditLog` | **`manage_settings`** (L7695) | `logAction('config_updated','settings','broadcast','Broadcast sent to N recipient(s): "<subject>"', {}, {})` L7701 | **Yes** — `GATE_SPECS.sendBroadcast` L20800–20802, `d:true`, `irr:true` |
| **Search input** | `renderEmailOutbox()` (oninput) | Re-filters the sent table | none | none | none | no |

### Confirmation gate — `sendBroadcast` (L20800–20802)

- **t:** `Send a broadcast` · **d:** `true` (danger) · **irr:** `true` (irreversible)
- **s:** `This message goes to real customers and cannot be recalled.`
- **c:**
  1. `Delivered to every recipient in the selected segment.`
  2. `A wrong segment or a typo is visible to all of them.`
  3. `Check the count before confirming.`
- **btn:** `Send broadcast`

---

## 6. Modals opened

### 6.1 Inbound message preview — `previewInboundMessage(id)` L7538–7550

| Element | Content | Line |
|---|---|---|
| **Title** | `m.subject` | L7545 |
| Close | `✕` → `closeModal()` | L7545 |
| Header strip | `From: <b>m.name</b> &lt;m.email&gt; · m.receivedAt` | L7546 |
| Body | `m.message`, `white-space:pre-wrap`, 12.5px, line-height 1.7 | L7547 |
| **Conditional callout** | Blue box `🏢 This looks like a corporate account inquiry.` — shown when `isCorpLead` is true | L7548 |
| Footer button 1 | `Close` (`.btn sm`) | L7549 |
| Footer button 2 *(conditional)* | `🏢 Convert to corporate account` (`.btn sm teal`) → `closeModal(); openNewCorpModal('<name>','<email>')` | L7549 |
| Footer button 3 | `Reply by email →` (`.btn sm p`) → `replyToInbound('<id>')` | L7549 |

**Corporate-lead detection rule** (L7541): `/corporate|company|companies|business account/i.test(m.subject + ' ' + m.message)`.

**Side effect on open:** an unread message is silently marked `read` (L7539).

### 6.2 Sent-email preview — `previewEmail(id)` L7581–7590

| Element | Content | Line |
|---|---|---|
| **Title** | `e.subject` | L7586 |
| Close | `✕` | L7586 |
| Header strip | `To: <b>e.toName</b> &lt;e.toEmail&gt; · e.ts · <badge EMAIL_CATEGORY_LABEL[e.category]>` | L7587 |
| Body | `e.body`, `white-space:pre-wrap` | L7588 |
| Footer button 1 | `Close` (`.btn sm`) | L7589 |
| Footer button 2 | `View <e.toName>'s profile →` (`.btn sm p`) → `openProfile('<e.toId>')` | L7589 |

**Defect:** for broadcast-to-corporate-lead replies `e.toId` is `null` (L7553), so the button renders `openProfile('null')` and `resolveId` fails → toast `No record for null`.

No other modal originates in this tab.

---

## 7. Rules / policy logic — written out exactly

### 7.1 Address resolution — `emailFor(id)` L3572–3577

```js
r = DB.riders[id] || DB.drivers[id];
if (!r) return null;                       // unknown id → null
if (r.email) return r.email;               // use the stored address
return r.name.toLowerCase()
        .replace(/[^a-z ]/g,'')            // strip everything but a-z and space
        .trim()
        .split(' ').join('.')              // spaces → dots
        + '@gmail.com';                    // hardcoded domain
```

So a rider named `Layla Al-Faraj` with no stored email becomes `layla.alfaraj@gmail.com`. Every synthesised address is `@gmail.com`.

### 7.2 The single send choke point — `sendSystemEmail(toId, subject, body, category)` L3578–3583

```js
toName  = nm2(toId)                        // rider/driver name, or the id if unknown
toEmail = emailFor(toId) || '—'
entry   = {
  id:       'MAIL-' + String(DB.emailOutbox.length + 1).padStart(4,'0'),
  toId, toName, toEmail, subject, body, category,
  ts:       new Date().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})
}
DB.emailOutbox.unshift(entry)
if (typeof renderEmailOutbox === 'function') renderEmailOutbox()
return entry
```

**Id generation is `length + 1`** — not a monotonic counter. It is correct only while nothing is ever removed; it would collide if a record were deleted.

**No delivery, no queue, no retry, no bounce handling, no failure state.** The record *is* the send.

### 7.3 Outbox record shape (complete)

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `MAIL-0001` … | `length+1` padded to 4 | |
| `toId` | string or `null` | caller | `null` for inbox replies (L7553) and for corporate-approver emails addressed by raw address (L5111) |
| `toName` | string | `nm2(toId)` | falls back to the id itself when unresolvable |
| `toEmail` | string | `emailFor(toId) \|\| '—'` | |
| `subject` | string | caller | |
| `body` | string | caller | full text, `\n`-separated |
| `category` | one of 4 | caller | see §8.1 |
| `ts` | `"Jul 14, 11:20 AM"`-style | `toLocaleString` | locale-dependent format |

### 7.4 Inbox record shape (complete) — `DB.inboundMessages` L13899–13904

| Field | Type | Example |
|---|---|---|
| `id` | `INB-001` | |
| `name` | string | `Fahad Al-Dossari` |
| `email` | string | `fahad.dossari@gmail.com` |
| `subject` | string | |
| `message` | string | full body |
| `receivedAt` | string | `14 Jul, 11:20 AM` |
| `status` | `'new' \| 'read' \| 'replied'` | |

### 7.5 Audience-count formula — `broadcastAudienceIds()` L7674–7685

```js
seg          = #bc-audience.value  (default 'all' if the element is missing)
activeDrivers = Object.keys(DB.drivers).filter(id => DB.drivers[id].status !== 'pending')

if seg === 'all_drivers'     → activeDrivers
if seg === 'gold_drivers'    → activeDrivers.filter(id => DB.drivers[id].lvl === 'gold')
if seg === 'silver_drivers'  → activeDrivers.filter(id => DB.drivers[id].lvl === 'silver')
if seg === 'flagged_drivers' → activeDrivers.filter(id => DB.drivers[id].flaggedForDeclines || driverOpenComplaints(id) > 0)

// otherwise — rider segments
ids = Object.keys(DB.riders)
if seg === 'gold'            → ids.filter(id => DB.riders[id].lvl === 'gold')
else if seg === 'silver'     → ids.filter(id => DB.riders[id].lvl === 'silver')
else if seg === 'nosub'      → ids.filter(id => !(DB.riders[id].subs && DB.riders[id].subs.length))
else if seg === 'high_risk_riders' → ids.filter(id => riderChurnRisk(DB.riders[id]).level === 'High')
return ids                    // seg === 'all' falls through unfiltered
```

`broadcastAudienceCount()` (L7671–7673) is simply `broadcastAudienceIds().length`.

### 7.6 Send flow (broadcast)

```
[Send broadcast] click
  → guardAction wrapper → confirmAction dialog (danger, irreversible)
  → confirm → sendBroadcast()
     → requirePerm('manage_settings')      — fail: logAction('permission_denied') + toast, stop
     → subject & body non-empty            — fail: toast warn, stop
     → broadcastAudienceIds()              — empty: toast warn, stop
     → for each id: sendSystemEmail(id, subject, body, 'broadcast')
            → one MAIL-nnnn record unshifted per recipient
            → renderEmailOutbox() runs once per recipient (N re-renders — see §12)
     → logAction('config_updated','settings','broadcast', …)
     → clear #bc-subject and #bc-body
     → renderEmailOutbox(); renderSettingsMeta()
     → toast '✅ Broadcast sent to N recipient(s) — check Email Log below'
```

### 7.7 "Sent today" rule

`e.ts.indexOf(new Date().toLocaleString([],{month:'short',day:'numeric'})) >= 0` (L7562). This is a **substring test on the formatted date**, so:
- it is not a rolling 24-hour window despite the caption saying `last 24 hours` (L1869);
- it depends on the browser locale producing the same month/day fragment in both calls;
- seeded records with hand-written timestamps (none in the outbox — it starts empty) would not match.

---

## 8. Enumerations

### 8.1 Email categories — the complete set (`EMAIL_CATEGORY_LABEL`, L7514)

| Key | Label |
|---|---|
| `csat` | CSAT survey |
| `promo` | Promo/offer |
| `transactional` | Transactional |
| `broadcast` | Broadcast |

Unknown categories fall back to the raw key (`EMAIL_CATEGORY_LABEL[c] || c`, L7566, L7572, L7587).

### 8.2 Broadcast audience options — the complete list (L1879–1892)

**optgroup "Riders"**

| value | Label | Filter |
|---|---|---|
| `all` | All riders | none — every `DB.riders` key |
| `gold` | Gold-tier riders | `lvl === 'gold'` |
| `silver` | Silver-tier riders | `lvl === 'silver'` |
| `nosub` | Riders with no active subscription | `!(subs && subs.length)` |
| `high_risk_riders` | High churn-risk riders | `riderChurnRisk(r).level === 'High'` |

**optgroup "Drivers"**

| value | Label | Filter |
|---|---|---|
| `all_drivers` | All active drivers | `status !== 'pending'` |
| `gold_drivers` | Gold-tier drivers | active + `lvl === 'gold'` |
| `silver_drivers` | Silver-tier drivers | active + `lvl === 'silver'` |
| `flagged_drivers` | Flagged drivers (declines/complaints) | active + (`flaggedForDeclines` \|\| `driverOpenComplaints(id) > 0`) |

**9 options total.** Compare the Push tab, which has **11** (it adds `economy_drivers` and `comfort_drivers` and renames `all` → `all_riders`) — see `16e-settings-push.md` §12.

### 8.3 Inbox status values (complete)

`new` (blue badge "New"), `read` (grey badge "Read"), `replied` (green badge "Replied"). Set at L7539 and L7552; seeded at L13901–13903.

### 8.4 Every system-email trigger in the file — all 21 `sendSystemEmail()` call sites

| Line | Trigger | Subject | Category |
|---|---|---|---|
| L2404 | Support ticket closed | `How did we do? — <ticketId>` | `csat` |
| L3850 | Re-consent reminder (Legal tab) | `Please review our updated <doc.label>` | `transactional` |
| L3873 | Referral processed — referrer | `Your referral bonus has landed 🎉` | `promo` |
| L3874 | Referral processed — referee | `Welcome to Eyvar — bonus inside 🎁` | `promo` |
| L3939 | Rider wallet credited (unless `actorNote === false`) | `Your Eyvar wallet was topped up 💳` | `transactional` |
| L4220 | Trip receipt sent | `Your Eyvar receipt — <tripId>` | `transactional` |
| L5111 | Corporate approval threshold breached (path A) | `Approval needed — <rider>'s ride package (<total>)` | `transactional` |
| L5119 | Corporate approval threshold breached (path B) | *(identical text — duplicated block)* | `transactional` |
| L6708 | Corporate consolidated invoice | `Your Eyvar invoice <invoiceNumber>` | `transactional` |
| L7001 | Pre-churn loyalty offer | `A little something before you go 🎁` | `promo` |
| L7700 | **Broadcast (this tab)** | operator-supplied | `broadcast` |
| L8654 | Subscription trip postponed | `Your trip has been moved to <targetDate>` | `transactional` |
| L10275 | Corporate approval (ride-request path) | `Approval needed — <rider>'s ride package (<amount>)` | `transactional` |
| L11115 | Driver application approved | `Welcome to Eyvar, <name>! 🚗` | `transactional` |
| L11186 | Retention offer activated | `<offerTitle>` | `promo` |
| L11411 | Corporate renewal above threshold | `Approval needed — <rider>'s renewal (<price> SAR)` | `transactional` |
| L11707 | Stop added to a live trip | `A stop was added to your trip` | `transactional` |
| L12454 | Low rating flagged to the captain | `A recent trip rating needs your attention` | `transactional` |
| L13710 | Driver incentive bonus awarded | `You earned a bonus 🏆` | `transactional` |
| L14278 | Early-renewal loyalty offer | `A little something before your renewal 🎁` | `promo` |
| L16131 | Bulk message tool | operator-supplied | `broadcast` |

Plus **one bypass**: `replyToInbound()` (L7553) writes directly into `DB.emailOutbox` without going through `sendSystemEmail` — see §12.

Category tally across triggers: `transactional` × 13, `promo` × 5, `broadcast` × 2, `csat` × 1.

### 8.5 Seeded inbox messages (all 3) — L13899–13904

| id | From | Subject | Status | Corp lead? |
|---|---|---|---|---|
| `INB-001` | Fahad Al-Dossari · fahad.dossari@gmail.com · `14 Jul, 11:20 AM` | *Partnership inquiry — corporate accounts* | `new` | **Yes** (matches `corporate`/`company`) |
| `INB-002` | Mona Al-Zahrani · mona.z.applicant@outlook.com · `13 Jul, 4:05 PM` | *Question before applying as a driver* | `new` | No |
| `INB-003` | Khalid Bin Turki · k.turki@yahoo.com · `12 Jul, 9:40 AM` | *App keeps crashing on sign-up* | `read` | No |

Full message bodies are in the seed at L13900–13903.

### 8.6 Canned reply body (L7553, verbatim)

```
Hi <m.name>,

Thanks for reaching out — a member of our team will follow up shortly.

Eyvar
```

---

## 9. Cross-module effects

| Target | Mechanism | Line |
|---|---|---|
| **Every module that emails a customer** | all 21 triggers in §8.4 funnel here; the pane is the system-wide send log | — |
| **Data Export tab** | `#export-count-emails` = `DB.emailOutbox.length`; `#export-count-inbox` = `DB.inboundMessages.length` (L7668); `exportEmailLog()` L7644 emits `id,to,email,subject,category,sentAt`; `exportInbox()` L7640 emits `id,name,email,subject,receivedAt,status` | L7640–7647, L7668 |
| **Corporate module** | `openNewCorpModal(name, email)` from the inbox modal | L7549 |
| **Rider/Driver 360°** | `openProfile(e.toId)` from the sent-mail modal | L7589 |
| **Legal & Consent tab** | its reminder button produces `transactional` records here | L3850 |
| **Push tab** | an intentionally parallel but separate log (`DB.pushOutbox`); comment L7707–7709: *"Separate channel from Email — shorter, more immediate, and can also target drivers (email broadcast is riders-only today)"* — note this comment is now **stale**, the email broadcast selector does include driver segments | L7707–7709 |
| **Activity / Audit log** | broadcasts write `config_updated`; replies write **nothing** | L7701 |
| **Settings meta** | `sendBroadcast` calls `renderSettingsMeta()` (L7703) but the map (L7340) has no `broadcast` or `emails` key, so nothing is updated | L7340 |
| **Navigation** | `renderEmailOutbox()`, `renderLeadInbox()` and `updateBroadcastAudienceCount()` all run on `go('settings')` | L8819 |
| **Contact-centre module** | names `onInboundMessage()` as the intended adapter entry point for real inbound mail; not wired | L20179–20180 |

---

## 10. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| `DB.emailOutbox = []` | L13834 | **Starts empty every session** — hence the KPI caption `since this session started` |
| 3 seeded inbound messages with full bodies and fabricated names/addresses | L13899–13904 | Explicitly flagged in the seed comment as *"Seeded with realistic examples since this file has no live website form"* (L13839–13840) |
| `@gmail.com` fallback domain | L3576 | Every rider/driver without a stored address gets a fabricated gmail address |
| Canned reply body | L7553 | Fixed text, no editor, no i18n |
| Corporate-lead regex `corporate\|company\|companies\|business account` | L7541 | Heuristic |
| All 21 email subjects and bodies | §8.4 | Hardcoded English templates with emoji |
| `'—'` for an unresolvable address | L3579 | |
| "no real mail server" disclaimers | L1849, L3567–3571 | Explicit demo acknowledgement |

**There is no template system.** Every message is an inline string literal at its trigger site; nothing in this tab lists, previews, or edits them.

---

## 11. i18n keys

| Key | Element | English | Arabic |
|---|---|---|---|
| `stab.emails` | Nav button label span, L1439 | `Email Log` | `سجل البريد` (L7920) ✅ |
| `stabgrp.comms` | Group header (emails is in the `Customer comms` group, L21274) | `Customer comms` | `تواصل العملاء` (L7916) |

**No `data-i18n` attribute exists inside `#stab-emails`.** Untranslated: the panel title `Email` and its two-direction description (L1849), both sub-tab labels, both card headings, all five inbox column headers, all five outbox column headers, all three KPI labels and sub-captions, the `📢 New broadcast` heading and its caption, all four field labels, all placeholders, both empty states, all four category labels, every audience option label, both modal layouts, and all 21 email templates.

---

## 12. Gaps, dead code, UNVERIFIED items

1. **`replyToInbound()` bypasses the choke point.** L7553 constructs and `unshift`s a `MAIL-` record inline instead of calling `sendSystemEmail`. This directly contradicts the design comment at L3569–3571 (*"sendSystemEmail() is the single choke point every real trigger in the app calls"*). Consequences: `toId` is `null`, `toEmail` is the raw inbound address rather than `emailFor()`, and the id is computed with the same `length+1` rule but independently.
2. **`replyToInbound()` writes no audit entry.** Every other outbound path from this tab logs; replying to a member of the public does not.
3. **`previewEmail`'s profile button breaks on `toId === null`** (L7589) — renders `openProfile('null')`. Affects every inbox reply and the corporate-approver emails at L5111/L5119/L10275/L11411 that pass an email address as `toId`.
4. **N re-renders per broadcast.** `sendSystemEmail` calls `renderEmailOutbox()` on every single record (L3582), so a broadcast to 200 riders repaints the table 200 times, then once more at L7703.
5. **Id collision risk.** `'MAIL-' + (DB.emailOutbox.length + 1)` (L3579) is not monotonic. Safe today only because nothing deletes records.
6. **"Sent today" is a string match, not a time window** (L7562) despite the caption `last 24 hours` (L1869). Locale-dependent and brittle.
7. **Broadcast audience list is out of sync with Push.** 9 options here vs 11 there; the "all riders" key differs (`all` vs `all_riders`); `economy_drivers` / `comfort_drivers` exist only in Push. Two near-duplicate implementations (`broadcastAudienceIds` L7674 and `pushAudienceIds` L7711) that must be kept in step by hand.
8. **Stale comment.** L7708 says *"email broadcast is riders-only today"* — false since the driver optgroup was added at L1885–1891.
9. **`#bc-audience-count` static default says "rider(s)"** (L1893) while the JS writes "recipient(s)" (L7688).
10. **No message length limit on the broadcast body**, unlike Push (`maxlength=120`).
11. **No preview, no test-send, no scheduling, no unsubscribe/opt-out handling, no suppression list.** The gate warns the send *"cannot be recalled"* (L20801) but offers no way to check it first.
12. **`config_updated` is the audit key for broadcasts** (L7701) — the same generic key used by gateway edits, push sends, and legal reminders, so broadcasts are not separable in the audit log.
13. **`config_updated` is not in `ACTION_LABELS`** (L2900–2910), so broadcasts cannot be filtered by action type on the Activity-log page (filter built at L9210).
14. **Inbox has no search, sort, filter, pagination, delete, or archive**, and no way to add a message — it is effectively a 3-row static list.
15. **`renderSettingsMeta()` has no key for this tab** (L7340), so the "Last updated by …" caption never appears despite `sendBroadcast` calling it (L7703).
16. **No XSS escaping** anywhere — `m.message`, `m.name`, `e.body`, `e.subject` and operator-typed subject/body are interpolated raw into `innerHTML` (L7529, L7547, L7573, L7588).
17. **UNVERIFIED — `driverOpenComplaints(id)` and `riderChurnRisk(r)`.** Both are used by the audience filters (L7679, L7684) but their definitions were not read in this pass; their exact thresholds are therefore not documented here.
18. **UNVERIFIED — `openNewCorpModal(name, email)`.** Called at L7549; its field list belongs to the corporate module and was not enumerated in this pass.
19. **UNVERIFIED — `stopEv(event)`.** Used on both `[Open]` and `[View]` buttons (L7533, L7574) to stop the row-level click; its definition line was not located in this pass.

---

## 13. Line-number index

| Item | Lines |
|---|---|
| Nav button `data-tab="emails"` | L1439 |
| Pane `#stab-emails` | L1845–1905 |
| Header + two-direction description | L1846–1851 |
| Sub-tab strip | L1853–1856 |
| `#mailtab-inbox` + `#inbox-tbody` | L1858–1864 |
| `#mailtab-outbox` | L1866–1903 |
| Outbox KPI grid | L1867–1873 |
| Broadcast composer card | L1875–1898 |
| `#bc-audience` options | L1879–1892 |
| Sent-mail card + `#mail-search` + `#emails-tbody` | L1899–1902 |
| CSAT email trigger (ticket closed) | L2404 |
| `ACTION_LABELS` | L2900–2910 |
| `requirePerm()` | L3126–3132 |
| `logAction()` | L3133–3155 |
| `kvCard()` / `nm2()` helpers | L7290–7295, L3566 |
| Outbox block comment | L3567–3571 |
| `emailFor()` | L3572–3577 |
| `sendSystemEmail()` | L3578–3583 |
| Re-consent reminder trigger | L3850 |
| Referral email triggers | L3873–3874 |
| Wallet top-up trigger | L3939 |
| Trip receipt trigger | L4220 |
| Corporate approval triggers | L5111, L5119, L10275, L11411 |
| Corporate invoice trigger | L6708 |
| Churn loyalty offer trigger | L7001 |
| `EMAIL_CATEGORY_LABEL` | L7514 |
| `switchMailSubTab()` | L7515–7520 |
| `renderLeadInbox()` | L7521–7537 |
| `previewInboundMessage()` | L7538–7550 |
| `replyToInbound()` | L7551–7556 |
| `renderEmailOutbox()` | L7557–7580 |
| `previewEmail()` | L7581–7590 |
| `exportInbox()` | L7640–7643 |
| `exportEmailLog()` | L7644–7647 |
| `renderExportCounts()` | L7668–7670 |
| `broadcastAudienceCount()` | L7671–7673 |
| `broadcastAudienceIds()` | L7674–7685 |
| `updateBroadcastAudienceCount()` | L7686–7689 |
| `sendBroadcast()` | L7694–7705 |
| Push-vs-email comment | L7707–7709 |
| `renderSettingsMeta()` map | L7339–7342 |
| `val()` | L8034 |
| Trip-postponed trigger | L8654 |
| `go('settings')` fan-out | L8819 |
| Driver-approved trigger | L11115 |
| Retention-offer trigger | L11186 |
| Stop-added trigger | L11707 |
| Low-rating trigger | L12454 |
| Driver-bonus trigger | L13710 |
| `DB.emailOutbox = []` / `DB.pushOutbox = []` | L13834–13835 |
| Inbox seed comment | L13836–13840 |
| `DB.inboundMessages` seed | L13899–13904 |
| Early-renewal trigger | L14278 |
| Bulk-message trigger | L16131 |
| `GATE_SWEEP.sendBroadcast` | L20850–20852 |
| `onInboundMessage()` integration note | L20179–20180 |
| `SETTINGS_GROUPS` (emails → `Customer comms`) | L21274 |
