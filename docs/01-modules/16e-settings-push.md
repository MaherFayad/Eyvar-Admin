# Settings Tab: Push notifications

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page:** `settings` (`#p-settings`, L1416–2048) · **Pane id:** `#stab-push` · **HTML lines:** L1929–1974
> **Nav button:** L1438 (`data-tab="push"`, icon 📲, `data-i18n="stab.push"`)
> **Render fn:** `renderPushOutbox()` L7748–7764 → `#push-tbody` + 3 KPIs
> **Supporting fns:** `pushAudienceIds()` L7711–7726, `updatePushAudienceCount()` L7727–7730, `updatePushCharCount()` L7731–7734, `sendPushNotification()` L7735–7747

---

## 1. Purpose

A second outbound channel, deliberately separate from Email. Pane description (L1933): *"Broadcast a push notification straight to the rider/driver app — shorter and more immediate than email. This file has no real APNs/FCM push server, so this log is the record of what would have been sent."*

Module comment (L7706–7709): *"Separate channel from Email — shorter, more immediate, and can also target drivers (email broadcast is riders-only today). Same 'no real send server, so the log is the source of truth' honesty as email."*

The whole tab is: three KPIs → a composer → a log table. There is **no** persisted push configuration (no APNs keys, no topics, no quiet hours, no throttle).

---

## 2. Layout map

```
#stab-push                                                    L1929
├── .card  header + KPI grid                                  L1930–1941
│   ├── .settings-panel-head 📲 "Push notifications" + desc   L1931–1934
│   └── KPI grid, 3 equal columns                             L1935–1940
│       ├── "Total sent"  #push-kpi-total / "since this session started"
│       ├── "Sent today"  #push-kpi-today / "last 24 hours"
│       └── "By audience" #push-kpi-aud   (chip cloud)
├── .card "📲 New push notification"                          L1942–1967
│   ├── .ch h2 + caption "Sends immediately — appears in the
│   │        log below the moment it goes out"                L1943
│   ├── select #push-audience (2 optgroups, 11 options)       L1946–1962
│   ├── #push-audience-count caption                          L1963
│   ├── field "Title"   → #push-title    (maxlength 40)       L1964
│   ├── field "Message" → #push-body     (maxlength 120)      L1965
│   │        label carries live #push-char-count "(0/120)"
│   └── [Send push notification]  sendPushNotification()      L1966
└── .card "Sent notifications"                                L1968–1972
    ├── .ch h2 + search input #push-search                    L1969
    └── table.dt → tbody #push-tbody                          L1970
```

---

## 3. Settings fields — EVERY field

No field in this tab is persisted as configuration. All four are transient composer/filter state.

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `push-audience` | "Audience" | `<select>`, 2 `optgroup`s, **11 options** (L1946–1962), max-width 260px | first option — `all_riders` (All riders) | segment key | full list in §8.2 | none | not persisted; read live by `pushAudienceIds()` (L7712) and stored **as its label** on the sent record (`PUSH_AUDIENCE_LABEL[seg] \|\| seg`, L7742) | `onchange="updatePushAudienceCount()"` (L1946) rewrites `#push-audience-count` |
| `push-title` | "Title" | `input type=text` **`maxlength="40"`**, placeholder `e.g. Ramadan offer inside 🎁` (L1964) | empty | text | **0–40 chars, browser-enforced** | `sendPushNotification` L7738: `if(!title \|\| !body)` → toast `⚠ Write a title and message first` (warn), return. No JS length check — `maxlength` is the only cap. | `PUSH-nnnn.title` | `oninput="updatePushCharCount()"` — but that function only reads `#push-body`, so typing in the title does nothing visible (see §12) |
| `push-body` | "Message" (+ live counter) | `<textarea rows=3>` **`maxlength="120"`**, placeholder `Keep it short — this shows as a phone notification, not an email.`, resize:vertical (L1965) | empty | text | **0–120 chars, browser-enforced** | same non-empty check | `PUSH-nnnn.body` | `oninput="updatePushCharCount()"` → writes `(<len>/120)` into `#push-char-count` (L7731–7734); cleared and the counter reset after a send (L7744) |
| `push-search` | *(no label — placeholder only)* | `input type=text`, placeholder `Search title or audience…`, width 220px, height 30px (L1969) | empty | text | — | none | not persisted | `oninput="renderPushOutbox()"` → filters the table on `title + ' ' + audience`, case-insensitive `indexOf` (L7759–7760). **Note: `body` is not searchable** despite the table showing it. |

### Read-only elements

| id | Value | Sub-caption | Formula | Line |
|---|---|---|---|---|
| `push-kpi-total` | count | `since this session started` | `DB.pushOutbox.length` | L7751 |
| `push-kpi-today` | count | `last 24 hours` | `DB.pushOutbox.filter(p => p.ts.indexOf(new Date().toLocaleString([],{month:'short',day:'numeric'})) >= 0).length` — a **string prefix match**, not a rolling window | L7752–7753 |
| `push-kpi-aud` | chip cloud | — | `audCounts[p.audience]++`; each chip `.b .b-grey` at 9px reading `<audienceLabel> · <n>`; empty state `No push notifications sent yet` | L7754–7757 |
| `push-char-count` | `(<n>/120)` | inside the Message label | `#push-body.value.length` | L7731–7734 |
| `push-audience-count` | `<n> recipient(s) will receive this` | below the select | `pushAudienceIds().length` | L7727–7730 |

Static HTML default for `#push-audience-count` is `0 recipient(s) will receive this` (L1963) — consistent with the JS, unlike the Email tab.

---

## 4. Tables & lists

### 4.1 "Sent notifications" table — `#push-tbody` (`renderPushOutbox()` L7748–7764)

Row source: `DB.pushOutbox` (newest first — `unshift` at L7742), optionally filtered by `#push-search`.

| # | Column header (L1970) | Cell content | Style | Source |
|---|---|---|---|---|
| 1 | `Title` | plain text | `font-weight:500` | `p.title` |
| 2 | `Message` | plain text | `color:var(--muted)` | `p.body` |
| 3 | `Audience` | badge `.b .b-grey` | — | `p.audience` (already a **label**, not a key) |
| 4 | `Recipients` | integer | — | `p.recipients` |
| 5 | `Sent` | timestamp | `color:var(--muted); font-size:11px` | `p.ts` |

- **Row actions:** **none.** Rows are not clickable, there is no detail modal, no resend, no delete.
- **Two empty states** (L7763):
  - search active but no match → `No results match that search.`
  - list genuinely empty → `No push notifications sent yet this session.`
- No pagination, no sorting.

### 4.2 Add / edit / delete flows

| Flow | Exists? | How |
|---|---|---|
| Add | Yes — one record per send | `sendPushNotification()` L7742 (the **only** writer to `DB.pushOutbox` in the whole file) |
| Edit | **No** |
| Delete | **No** |
| Resend | **No** |
| View detail | **No** — the table already shows every field |

---

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Audience `<select>` change** | `updatePushAudienceCount()` L7727–7730 | Recomputes `pushAudienceIds().length` and writes the caption | none | none | none | no |
| **Typing in Title / Message** | `updatePushCharCount()` L7731–7734 | Writes `(<n>/120)` into `#push-char-count` from `#push-body.value.length` | none | none | none | no |
| **Send push notification** (`.btn p sm`, L1966) | `sendPushNotification()` L7735–7747 | 1. `requirePerm('manage_settings')` (L7736). 2. `val('push-title')`, `val('push-body')` — both-required check (L7738). 3. `seg = #push-audience.value` (L7739). 4. `ids = pushAudienceIds()`; if empty → toast `⚠ No one matches that audience`, return (L7741). 5. **`DB.pushOutbox.unshift({...})`** — **one single record for the whole broadcast** (unlike Email, which writes one record per recipient). 6. `logAction`. 7. Clears `#push-title` and `#push-body`, calls `updatePushCharCount()`. 8. `renderPushOutbox(); renderSettingsMeta();` 9. toast `✅ Push sent to N recipient(s)` | `DB.pushOutbox` (1 record), `DB.auditLog` | **`manage_settings`** (L7736) | `logAction('config_updated','settings','push','Push notification sent to N recipient(s): "<title>"', {}, {})` L7743 | **Yes** — `GATE_SPECS.sendPushNotification` L20803–20805, `d:true`, `irr:true` |
| **Search input** | `renderPushOutbox()` (oninput, L1969) | Re-filters the table on title + audience | none | none | none | no |

### Confirmation gate — `sendPushNotification` (L20803–20805)

- **t:** `Send a push notification` · **d:** `true` (danger) · **irr:** `true` (irreversible)
- **c:**
  1. `Arrives on customer devices immediately and cannot be recalled.`
  2. `Push fatigue costs opt-ins permanently.`
- **btn:** `Send push`
- No `s` (summary) key — unlike `sendBroadcast`, this gate shows no headline sentence and **does not show the recipient count**, despite the email gate's own advice *"Check the count before confirming."* (L20852).

Installed via `installGateSweep()` → `gateAll(GATE_SWEEP)` (L20898–L20903, L20756) reading `GATE_SWEEP` (L20769). `installUniversalGates()` / `GATE_SPECS` is a different registry and does not carry this action.

---

## 6. Modals opened

**None.** This tab opens no modal of its own. The only overlay is the generic `confirmAction` dialog produced by the `sendPushNotification` gate (fields listed above). Rows in the sent table are inert.

---

## 7. Rules / policy logic — written out exactly

### 7.1 Audience-count formula — `pushAudienceIds()` L7711–7726

```js
seg           = #push-audience.value            // default 'all_riders' if the element is missing
activeDrivers = Object.keys(DB.drivers).filter(id => DB.drivers[id].status !== 'pending')

// driver segments — early returns
if (seg === 'all_drivers')      return activeDrivers
if (seg === 'gold_drivers')     return activeDrivers.filter(id => DB.drivers[id].lvl  === 'gold')
if (seg === 'silver_drivers')   return activeDrivers.filter(id => DB.drivers[id].lvl  === 'silver')
if (seg === 'economy_drivers')  return activeDrivers.filter(id => DB.drivers[id].type === 'Economy')
if (seg === 'comfort_drivers')  return activeDrivers.filter(id => DB.drivers[id].type === 'Comfort')
if (seg === 'flagged_drivers')  return activeDrivers.filter(id =>
                                     DB.drivers[id].flaggedForDeclines || driverOpenComplaints(id) > 0)

// rider segments — fall-through
ids = Object.keys(DB.riders)
if      (seg === 'gold')             ids = ids.filter(id => DB.riders[id].lvl === 'gold')
else if (seg === 'silver')           ids = ids.filter(id => DB.riders[id].lvl === 'silver')
else if (seg === 'nosub')            ids = ids.filter(id => !(DB.riders[id].subs && DB.riders[id].subs.length))
else if (seg === 'high_risk_riders') ids = ids.filter(id => riderChurnRisk(DB.riders[id]).level === 'High')
return ids                            // seg === 'all_riders' falls through unfiltered
```

`updatePushAudienceCount()` (L7727–7730) writes `pushAudienceIds().length + ' recipient(s) will receive this'` into `#push-audience-count`.

**Note:** the count is computed twice — once for the caption and again inside `sendPushNotification` (L7740). If the DB changes between the two, the stored `recipients` figure and the caption can disagree.

### 7.2 Send flow

```
[Send push notification] click
  → guardAction wrapper → confirmAction dialog (danger, irreversible, 2 consequences)
  → confirm → sendPushNotification()
     → requirePerm('manage_settings')          — fail: logAction('permission_denied') + 🔒 toast, stop
     → title & body non-empty                  — fail: toast '⚠ Write a title and message first', stop
     → ids = pushAudienceIds()
     → ids.length === 0                        — fail: toast '⚠ No one matches that audience', stop
     → DB.pushOutbox.unshift({ id, title, body, audience: LABEL, recipients: ids.length, ts })
     → logAction('config_updated','settings','push', 'Push notification sent to N recipient(s): "<title>"')
     → clear #push-title, #push-body; updatePushCharCount()
     → renderPushOutbox(); renderSettingsMeta()
     → toast '✅ Push sent to N recipient(s)'
```

**Nothing per-recipient is stored.** The ids are computed, counted, and discarded (L7740–7742). There is no way to answer "did rider X receive this push".

### 7.3 Outbox record shape (complete) — L7742

| Field | Type | Value | Notes |
|---|---|---|---|
| `id` | string | `'PUSH-' + String(DB.pushOutbox.length + 1).padStart(4,'0')` | `PUSH-0001`, `PUSH-0002`… Not monotonic — computed from array length |
| `title` | string | operator-supplied, ≤ 40 chars | |
| `body` | string | operator-supplied, ≤ 120 chars | |
| `audience` | string | `PUSH_AUDIENCE_LABEL[seg] \|\| seg` — the **human label**, not the key | Means the record cannot be re-resolved to a segment key programmatically |
| `recipients` | number | `ids.length` at send time | A snapshot count; the id list itself is not kept |
| `ts` | string | `new Date().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})` | e.g. `Jul 14, 11:20 AM`; locale-dependent |

Compare the Email record shape (`16d` §7.3), which stores `toId`, `toName`, `toEmail` **per recipient**. The two logs are structurally different: email = one row per person; push = one row per campaign.

### 7.4 "Sent today" rule

`p.ts.indexOf(new Date().toLocaleString([],{month:'short',day:'numeric'})) >= 0` (L7752). Substring test on the formatted date; not a 24-hour window despite the caption `last 24 hours` (L1937).

### 7.5 Character-count rule

`updatePushCharCount()` (L7731–7734) reads **only** `#push-body`:
```js
el   = #push-char-count
body = #push-body
if (el && body) el.textContent = '(' + body.value.length + '/120)'
```
`#push-title` also fires this on input (L1964) but the function ignores it, so the 40-char title limit has **no visible counter**.

### 7.6 Length limits

| Field | Limit | Enforcement |
|---|---|---|
| Title | 40 | `maxlength="40"` attribute only (L1964) — browser-side, defeated by programmatic value assignment |
| Message | 120 | `maxlength="120"` attribute only (L1965) — same caveat |

No JS-side length validation exists in `sendPushNotification`.

### 7.7 What is deliberately absent

The pane text is explicit (L1933): *"This file has no real APNs/FCM push server, so this log is the record of what would have been sent."* There is no delivery status, no per-device token, no opt-in/opt-out registry, no quiet-hours rule, no frequency cap, no deep link, no image/rich payload, no localisation of the payload, and no scheduling — despite the gate warning about "push fatigue" (L20805).

---

## 8. Enumerations

### 8.1 `PUSH_AUDIENCE_LABEL` — the complete key→label map (L7710)

| Key | Label |
|---|---|
| `all_riders` | All riders |
| `gold` | Gold-tier riders |
| `silver` | Silver-tier riders |
| `nosub` | No active subscription |
| `high_risk_riders` | High churn-risk riders |
| `all_drivers` | All active drivers |
| `gold_drivers` | Gold-tier drivers |
| `silver_drivers` | Silver-tier drivers |
| `economy_drivers` | Economy-vehicle drivers |
| `comfort_drivers` | Comfort-vehicle drivers |
| `flagged_drivers` | Flagged drivers |

**11 entries.** Note three of these labels differ from the `<option>` text in the HTML — see §12.

### 8.2 `#push-audience` options — the complete list as rendered (L1946–1962)

**optgroup "Riders"** (5)

| value | Option text (L1947–1951) | `PUSH_AUDIENCE_LABEL` (L7710) | Filter |
|---|---|---|---|
| `all_riders` | All riders | All riders | none — every `DB.riders` key |
| `gold` | Gold-tier riders | Gold-tier riders | `lvl === 'gold'` |
| `silver` | Silver-tier riders | Silver-tier riders | `lvl === 'silver'` |
| `nosub` | Riders with no active subscription | **No active subscription** ⚠ | `!(subs && subs.length)` |
| `high_risk_riders` | High churn-risk riders | High churn-risk riders | `riderChurnRisk(r).level === 'High'` |

**optgroup "Drivers"** (6)

| value | Option text (L1953–1959) | `PUSH_AUDIENCE_LABEL` | Filter |
|---|---|---|---|
| `all_drivers` | All active drivers | All active drivers | `status !== 'pending'` |
| `gold_drivers` | Gold-tier drivers | Gold-tier drivers | active + `lvl === 'gold'` |
| `silver_drivers` | Silver-tier drivers | Silver-tier drivers | active + `lvl === 'silver'` |
| `economy_drivers` | Economy-vehicle drivers | Economy-vehicle drivers | active + `type === 'Economy'` |
| `comfort_drivers` | Comfort-vehicle drivers | Comfort-vehicle drivers | active + `type === 'Comfort'` |
| `flagged_drivers` | Flagged drivers (declines/complaints) | **Flagged drivers** ⚠ | active + (`flaggedForDeclines` \|\| `driverOpenComplaints(id) > 0`) |

### 8.3 Push vs Email audience sets — the differences

| Segment | Push | Email broadcast |
|---|---|---|
| All riders | `all_riders` | **`all`** (different key) |
| Gold / Silver riders | ✅ | ✅ |
| No active subscription | ✅ | ✅ |
| High churn-risk riders | ✅ | ✅ |
| All / Gold / Silver / Flagged drivers | ✅ | ✅ |
| **Economy-vehicle drivers** | ✅ | ❌ **absent** |
| **Comfort-vehicle drivers** | ✅ | ❌ **absent** |
| **Total options** | **11** | **9** |

Two near-identical implementations: `pushAudienceIds()` L7711 and `broadcastAudienceIds()` L7674.

### 8.4 Push categories / templates

**There are none.** Unlike Email — which has four categories (`EMAIL_CATEGORY_LABEL`, L7514) and 21 hardcoded system templates (see `16d` §8.4) — push has **no category field, no template library, and exactly one producer** (`sendPushNotification`). No other code path anywhere in the file writes to `DB.pushOutbox`; grep confirms only L7742.

### 8.5 Table columns (L1970)

`Title`, `Message`, `Audience`, `Recipients`, `Sent`

### 8.6 CSV export columns — `exportPushLog()` L7648–7650

`id`, `title`, `body`, `audience`, `recipients`, `ts` — passed straight to `toCSV(DB.pushOutbox, [...])`, i.e. the raw record shape with no renaming.

---

## 9. Cross-module effects

| Target | Mechanism | Line |
|---|---|---|
| **Data Export tab** | `#export-count-push` = `(DB.pushOutbox \|\| []).length` (L7668); `[📲 Push log — CSV]` button → `exportPushLog()` | L2029, L7648–7650, L7668 |
| **Activity / Audit log** | every send writes a `config_updated` entry with entity `push` | L7743 |
| **Settings meta captions** | `sendPushNotification` calls `renderSettingsMeta()` (L7745) but the map (L7340) has no `push` key, so nothing is updated | L7340 |
| **Navigation** | `renderPushOutbox()` and `updatePushAudienceCount()` both run on every `go('settings')` | L8819 |
| **`DB.drivers[*].status / .lvl / .type / .flaggedForDeclines`** | read-only dependencies of the audience filters | L7713–7719 |
| **`DB.riders[*].lvl / .subs`** | read-only dependencies of the rider filters | L7721–7724 |
| **Email tab** | conceptual sibling; the comment at L7707–7709 frames push as the shorter, more immediate channel | L7706–7709 |
| **Nothing else reads `DB.pushOutbox`** | only `renderPushOutbox`, `renderExportCounts`, `exportPushLog`, and `sendPushNotification` reference it | — |

---

## 10. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| `DB.pushOutbox = []` | L13835 | **Starts empty every session** — hence `since this session started` on the KPI |
| `40` (title maxlength) | L1964 | |
| `120` (body maxlength, and the literal `/120` in the counter) | L1965, L7733 | The counter's denominator is hardcoded, not derived from the attribute |
| Placeholder `e.g. Ramadan offer inside 🎁` | L1964 | |
| Placeholder `Keep it short — this shows as a phone notification, not an email.` | L1965 | |
| All 11 option labels and all 11 `PUSH_AUDIENCE_LABEL` values | L1947–1959, L7710 | |
| `'Economy'` / `'Comfort'` vehicle-type string literals | L7717–7718 | Compared by exact string against `DB.drivers[id].type` |
| `'gold'` / `'silver'` tier string literals | L7714–7715, L7722–7723 | |
| `'pending'` status literal | L7712 | |
| `'High'` churn-risk literal | L7725 | |
| "no real APNs/FCM push server" disclaimer | L1933 | Explicit demo acknowledgement |

There is **no seeded push history at all** — the table is empty until the operator sends something.

---

## 11. i18n keys

| Key | Element | English | Arabic |
|---|---|---|---|
| `stab.push` | Nav button label span, L1438 | `Push Notifications` | `الإشعارات الفورية` (L7920) ✅ |
| `stabgrp.comms` | Group header (push is in the `Customer comms` group, L21274) | `Customer comms` | `تواصل العملاء` (L7916) |

**No `data-i18n` attribute exists inside `#stab-push`.** Untranslated: the panel title and description (L1933), all three KPI labels and sub-captions, both optgroup labels, all 11 option labels, the audience-count caption, all three field labels, both placeholders, the `📲 New push notification` heading and its caption, the send button, the `Sent notifications` heading, the search placeholder, all five column headers, both empty states, and — critically — **the push payload itself**, which is composed in one language with no locale variants.

---

## 12. Gaps, dead code, UNVERIFIED items

1. **`updatePushCharCount()` ignores the title.** `#push-title` fires it on input (L1964) but the function reads only `#push-body` (L7732–7733). The 40-character title cap therefore has no counter and no feedback.
2. **Three label mismatches between the `<option>` text and `PUSH_AUDIENCE_LABEL`:**
   - `nosub`: option says `Riders with no active subscription`, stored label is `No active subscription`;
   - `flagged_drivers`: option says `Flagged drivers (declines/complaints)`, stored label is `Flagged drivers`.
   Because the record stores the *label*, the sent log and the "By audience" chips show wording the operator never saw in the picker.
3. **The audience is stored as a label, not a key** (L7742). The record cannot be programmatically resolved back to a segment, so no re-send, no cohort re-derivation, and no analytics by segment key are possible.
4. **No per-recipient record.** Only a count is kept (L7742). It is impossible to answer "was this push sent to rider X" — a direct asymmetry with the Email outbox, which keeps one row per person.
5. **Id collision risk.** `'PUSH-' + (DB.pushOutbox.length + 1)` (L7742) is not monotonic; safe only because nothing deletes records.
6. **The count is computed twice** (L7728 for the caption, L7740 for the send) with no re-check at confirm time. The gate dialog does not display the count at all — despite the sibling email gate advising *"Check the count before confirming."* (L20802).
7. **"Sent today" is a string match, not a time window** (L7752), contradicting the `last 24 hours` caption (L1937). Locale-dependent.
8. **Search does not cover the message body** (L7760: `p.title + ' ' + p.audience`) even though the body is the widest column in the table.
9. **`maxlength` is the only length enforcement.** Neither limit is re-checked in `sendPushNotification` (L7735–7747).
10. **`config_updated` is the audit key** (L7743) — the same generic key used by broadcasts, gateway edits, and legal reminders, so push sends are not separable in the audit log.
11. **`config_updated` is not in `ACTION_LABELS`** (L2900–2910), so push sends cannot be filtered by action type on the Activity-log page (filter built from `Object.keys(ACTION_LABELS)`, L9210).
12. **`renderSettingsMeta()` has no `push` key** (L7340), so the `renderSettingsMeta()` call at L7745 is a no-op for this tab and no "Last updated by …" caption appears.
13. **No push categories or templates** (§8.4) — every message is composed from scratch, with no library, no preview, no test-send to a single device, and no scheduling.
14. **No frequency cap, quiet hours, or opt-out registry**, despite the gate explicitly warning that *"Push fatigue costs opt-ins permanently."* (L20805).
15. **Stale sibling comment.** L7708 claims *"email broadcast is riders-only today"*; the Email tab gained a driver optgroup at L1885–1891, so the stated justification for the two channels having different audience lists no longer holds.
16. **Duplicated audience logic.** `pushAudienceIds()` (L7711) and `broadcastAudienceIds()` (L7674) are ~90 % identical and must be maintained in lockstep by hand; they already diverge (§8.3).
17. **No XSS escaping** — `p.title`, `p.body` and `p.audience` are interpolated raw into `innerHTML` (L7762).
18. **No rows are clickable** and there is no detail view; every field happens to be visible in the table, so nothing is lost today, but there is no extensibility point.
19. **UNVERIFIED — `driverOpenComplaints(id)`** (L7719) and **`riderChurnRisk(r)`** (L7725): both gate audience membership but their definitions and thresholds were not read in this pass.
20. **UNVERIFIED — `DB.drivers[*].type` value domain.** The filters compare against the exact strings `'Economy'` and `'Comfort'` (L7717–7718). Whether every driver record uses precisely that casing, and whether a third vehicle class exists (the file defines an XL/Large Quick-Ride type at L13907+), was not confirmed; if a Large/XL driver class exists it has **no push segment**.

---

## 13. Line-number index

| Item | Lines |
|---|---|
| Nav button `data-tab="push"` | L1438 |
| Pane `#stab-push` | L1929–1974 |
| Header + description | L1931–1934 |
| KPI grid (`#push-kpi-total`, `#push-kpi-today`, `#push-kpi-aud`) | L1935–1940 |
| Composer card `📲 New push notification` | L1942–1967 |
| `#push-audience` + 11 options | L1946–1962 |
| `#push-audience-count` | L1963 |
| `#push-title` (maxlength 40) | L1964 |
| `#push-body` (maxlength 120) + `#push-char-count` | L1965 |
| `[Send push notification]` | L1966 |
| `Sent notifications` card + `#push-search` + `#push-tbody` | L1968–1972 |
| `ACTION_LABELS` | L2900–2910 |
| `requirePerm()` | L3126–3132 |
| `logAction()` | L3133–3155 |
| `EMAIL_CATEGORY_LABEL` (email counterpart) | L7514 |
| `broadcastAudienceIds()` (email counterpart) | L7674–7685 |
| `exportPushLog()` | L7648–7650 |
| `renderExportCounts()` | L7668–7670 |
| Push module comment | L7706–7709 |
| `PUSH_AUDIENCE_LABEL` | L7710 |
| `pushAudienceIds()` | L7711–7726 |
| `updatePushAudienceCount()` | L7727–7730 |
| `updatePushCharCount()` | L7731–7734 |
| `sendPushNotification()` | L7735–7747 |
| `renderPushOutbox()` | L7748–7764 |
| `renderSettingsMeta()` map (no push key) | L7339–7342 |
| `val()` | L8034 |
| `go('settings')` fan-out | L8819 |
| `renderAuditFilterSelect()` | L9206–9218 |
| `DB.pushOutbox = []` | L13835 |
| `installGateSweep()` / `gateAll()` | L20898–L20903 / L20756 |
| `GATE_SWEEP` start | L20769 |
| `GATE_SWEEP.sendPushNotification` | L20853–20854 |
| `GATE_SWEEP.sendBroadcast` (for comparison) | L20850–20852 |
| `SETTINGS_GROUPS` (push → `Customer comms`) | L21274 |
