# Settings Tab: Data export

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21857 lines)
> **Page:** `settings` (`#p-settings`, L1416–2048) · **Pane id:** `#stab-export` · **HTML lines:** L2020–2047
> **Nav button:** L1443 (`data-tab="export"`, icon 📤, `data-i18n="stab.export"`)
> **Render fns:** `renderExportCounts()` L7668–7670 (writes 8 count spans); `renderSnapshotsTable()` L7658–7664 → `#snapshots-tbody`

---

## 1. Purpose

Two cards with two distinct jobs:

1. **Data export** — eight one-click CSV downloads, each generated live from `DB` at click time. Pane description (L2024): *"Download a CSV snapshot of any dataset below, generated live from what's actually in the system right now — opens in Excel, Sheets, or any spreadsheet tool."* Footer note (L2035): *"Each export is logged in the Activity log so there's a record of who pulled what data and when."*

2. **Daily snapshots** — a manually-triggered point-in-time rollup so trends can be built. Card note (L2039), verbatim: *"A raw CSV export only ever shows 'right now' — no way to compare today against last week. Each snapshot below freezes the key numbers at a point in time, so a history builds up you can actually trend. This file has no server to auto-capture at midnight, so capture manually (or right before an export) until this is wired to a real backend job."*

Module comment (L7591–7594): *"One generic CSV builder + a small exporter per dataset, all reading straight from the live DB — never a separately-maintained copy, so an export always matches exactly what's on screen elsewhere."*

Snapshot seed comment (L13796–13801): *"Daily operational snapshots — a point-in-time rollup captured on demand (this file has no server to run a real midnight cron). Each snapshot is the foundation real time-series analysis needs: compare today's numbers against last week's instead of only ever seeing 'right now'."*

---

## 2. Layout map

```
#stab-export                                                        L2020
├── .card  "Data export"                                            L2021–2036
│   ├── .settings-panel-head 📤 title + description                 L2022–2025
│   ├── button grid  (2 columns, gap 10, padding 14)                L2026–2034
│   │   ├── 👤 Riders (#export-count-riders)        exportRiders()
│   │   ├── 🚗 Drivers (#export-count-drivers)      exportDrivers()
│   │   ├── 📦 Subscriptions (#export-count-subs)   exportSubscriptions()
│   │   ├── 💰 Payments / Finance (#export-count-payments) exportPayments()
│   │   ├── 🕵️ Activity log (#export-count-audit)   exportAuditLog()
│   │   ├── 📤 Outbox log (#export-count-emails)    exportEmailLog()
│   │   ├── 📥 Inbox (#export-count-inbox)          exportInbox()
│   │   └── 📲 Push log (#export-count-push)        exportPushLog()
│   └── ghost footnote "Each export is logged in the Activity log…"  L2035
└── .card  "📈 Daily snapshots"                                     L2037–2045
    ├── .ch  h2 + [📸 Capture snapshot now]  captureDailySnapshot()  L2038
    ├── explanatory paragraph                                        L2039
    ├── table.dt (7 columns) → tbody #snapshots-tbody                L2040
    └── [Export snapshot history — CSV]  exportSnapshots()           L2043
```

All eight export buttons are `.btn sm` with `style="justify-content:flex-start"` (left-aligned label). The count is a `<span>` inside the button label, e.g. `👤 Riders (<span id="export-count-riders">0</span>) — CSV`.

---

## 3. Settings fields — EVERY field

**This tab has no editable fields.** There is no input, select, checkbox, textarea, or radio anywhere in `#stab-export`. Every element is either a button or generated read-only text.

The only "field-like" values are the eight live counts injected by `renderExportCounts()` (L7668–7670):

| Element id | Value formula | Source | Line |
|---|---|---|---|
| `export-count-riders` | `Object.keys(DB.riders).length` | all riders | L7669 |
| `export-count-drivers` | `Object.keys(DB.drivers).filter(id => DB.drivers[id].status !== 'pending').length` | **active drivers only** | L7669 |
| `export-count-subs` | `Object.keys(DB.subscriptions).length` | all subscriptions incl. cancelled | L7669 |
| `export-count-payments` | `Object.keys(DB.payments).length` | all payments, any status | L7669 |
| `export-count-audit` | `(DB.auditLog \|\| []).length` | capped at 500 by `logAction` (L3149) | L7669 |
| `export-count-emails` | `(DB.emailOutbox \|\| []).length` | session-only | L7669 |
| `export-count-inbox` | `(DB.inboundMessages \|\| []).length` | 3 seeds | L7669 |
| `export-count-push` | `(DB.pushOutbox \|\| []).length` | session-only | L7669 |

Static HTML default for every count span is `0` (L2027–2034); `renderExportCounts()` overwrites them on every `go('settings')` (L8819).

---

## 4. Tables & lists

### 4.1 Daily snapshots table — `#snapshots-tbody` (`renderSnapshotsTable()` L7658–7664)

Row source: `DB.dailySnapshots`, rendered in **array order**. The seed is defined oldest→newest then `.reverse()`d (L13832), and `captureDailySnapshot` uses `unshift` (L7652), so the display order is **newest first**.

| # | Column header (L2040) | Cell content | Style | Source field |
|---|---|---|---|---|
| 1 | `Captured` | timestamp string | — | `s.date` |
| 2 | `Riders` | integer | — | `s.riders` |
| 3 | `Drivers` | integer | — | `s.drivers` |
| 4 | `Active subs` | integer | — | `s.activeSubs` |
| 5 | `Quick rides` | integer | — | `s.quickRides` |
| 6 | `Cancel rate` | `<n>%` | — | `s.cancelRatePct` |
| 7 | `Revenue` | `<n> SAR` | `font-weight:500; color:var(--blue)` | `s.totalRevenue` |

- **Row actions:** **none.** Rows are not clickable; no edit, no delete, no detail view.
- **Empty state** (L7663): `<td colspan=7>` centred ghost — `No snapshots captured yet — click "Capture snapshot now" to start building a history.`
- **Not displayed** despite being captured: `s.id`, `s.quickRideRevenue`, `s.subRevenue`. All three are in the record; only `id` reaches the CSV.
- No pagination, no sorting, no filtering. All 30 seeded rows render at once.

### 4.2 Add / edit / delete flows

| Flow | Exists? | How |
|---|---|---|
| Add snapshot | Yes | `captureDailySnapshot()` L7645–7657 — the **only** writer to `DB.dailySnapshots` |
| Edit snapshot | **No** |
| Delete snapshot | **No** |
| Overwrite same-day snapshot | **No** — despite the gate claiming otherwise (see §12) |

---

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **👤 Riders (n) — CSV** (L2027) | `exportRiders()` L7600–7603 | Builds rows from `DB.riders`, calls `downloadCSV('eyvar_riders.csv', …)` | file download | none | via `downloadCSV` → `logAction('export_data','export','eyvar_riders.csv','Exported eyvar_riders.csv',{},{})` | no |
| **🚗 Drivers (n) — CSV** (L2028) | `exportDrivers()` L7604–7607 | Filters `status !== 'pending'` | file | none | `export_data` | no |
| **📦 Subscriptions (n) — CSV** (L2029) | `exportSubscriptions()` L7608–7611 | All subscriptions | file | none | `export_data` | no |
| **💰 Payments / Finance (n) — CSV** (L2030) | `exportPayments()` L7612–7615 | All payments | file | none | `export_data` | no |
| **🕵️ Activity log (n) — CSV** (L2031) | `exportAuditLog()` L7628–7631 | All audit entries | file | none | `export_data` — **the export itself is appended to the log it just exported** | no |
| **📤 Outbox log (n) — CSV** (L2032) | `exportEmailLog()` L7644–7647 | All sent mail | file | none | `export_data` | no |
| **📥 Inbox (n) — CSV** (L2033) | `exportInbox()` L7640–7643 | All inbound messages | file | none | `export_data` | no |
| **📲 Push log (n) — CSV** (L2034) | `exportPushLog()` L7648–7650 | Raw `DB.pushOutbox` | file | none | `export_data` | no |
| **📸 Capture snapshot now** (`.btn p sm`, L2038) | `captureDailySnapshot()` L7645–7657 | 1. `requirePerm('manage_settings')`. 2. Computes 9 metrics (§7.2). 3. `DB.dailySnapshots.unshift(snap)`. 4. `logAction`. 5. `renderSnapshotsTable()`. 6. `renderExecTrendChart()` if defined. 7. toast `✅ Snapshot captured — <date>` | `DB.dailySnapshots` (1 record), `DB.auditLog` | **`manage_settings`** (L7646) | `logAction('export_data','snapshot','<SNAP-id>','Captured daily snapshot: N riders, M drivers, R SAR revenue',{},{})` L7653 | **Yes** — `GATE_SPECS.captureDailySnapshot` L20881–20882 (non-danger) |
| **Export snapshot history — CSV** (`.btn sm`, L2043) | `exportSnapshots()` L7665–7667 | `downloadCSV('eyvar_daily_snapshots.csv', toCSV(DB.dailySnapshots, [8 cols]))` | file | none | `export_data` | no |

**No export button carries a permission check.** Only the snapshot capture does. Anyone who can reach the Settings page can pull the entire rider, driver, payment and audit datasets.

### Confirmation gate — `captureDailySnapshot` (L20881–20882)

- **t:** `Capture a daily snapshot` (no `d`, so non-danger)
- **c:**
  1. `Freezes today's figures as the comparison baseline.`
  2. `Capturing twice in one day overwrites the earlier snapshot.` ← **false**, see §12
- **btn:** `Capture`

Installed via `installGateSweep()` / `gateAll(GATE_SWEEP)` (L20898–20900).

---

## 6. Modals opened

**None from this tab.** The only overlay is the generic `confirmAction` dialog for `captureDailySnapshot`.

A separate, richer export modal exists in the file — `exportData(btn, page)` L9188–9204 with `doExport(page)` L9130–9152 — offering **CSV/JSON** format choice and **"Choose where to save…" vs "Downloads folder"** via `window.showSaveFilePicker`. That modal is **not reachable from this tab**; it is wired to per-page export buttons elsewhere (subscriptions, quickrides, trips — see `exportRows()` L9175–9182). See §12.

---

## 7. Rules / policy logic — written out exactly

### 7.1 The CSV pipeline

**`toCSV(rows, headers)` — L7595–7599** (object-array form, used by the 8 dataset exporters)
```js
esc = v => { v = (v == null ? '' : String(v));
             return /[",\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; }
lines = [ headers.map(esc).join(',') ]
rows.forEach(r => lines.push(headers.map(h => esc(r[h])).join(',')))
return lines.join('\n')
```
Quotes **only when needed** (comma, double-quote or newline present). No BOM, no CRLF.

**`buildCSV(head, rows)` — L9183–9186** (array-of-arrays form, used by `exportIntegrity` and the `doExport` modal)
```js
esc = v => '"' + String(v == null ? '' : v).replace(/"/g,'""') + '"'
```
Quotes **everything, unconditionally**. Two different, incompatible CSV encoders coexist in the file.

**`downloadCSV(filename, csv)` — L7632–7641**
```js
blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
url  = URL.createObjectURL(blob)
a = document.createElement('a'); a.href = url; a.download = filename
document.body.appendChild(a); a.click(); document.body.removeChild(a)
setTimeout(() => URL.revokeObjectURL(url), 1000)
logAction('export_data','export',filename,'Exported ' + filename, {}, {})
toast('✅ ' + filename + ' downloaded','ok')
```
Note the audit summary records only the **filename**, never the row count — unlike `doExport` (L9145), which logs `'Exported N <name> rows as CSV (filename)'`.

### 7.2 Snapshot capture formulas — `captureDailySnapshot()` L7645–7657

| Field | Formula | Line |
|---|---|---|
| `id` | `'SNAP-' + String(DB.dailySnapshots.length + 1).padStart(4,'0')` | L7648 |
| `date` | `new Date().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})` | L7648 |
| `riders` | `Object.keys(DB.riders).length` | L7649 |
| `drivers` | `Object.keys(DB.drivers).filter(id => DB.drivers[id].status !== 'pending').length` | L7649 |
| `activeSubs` | `Object.keys(DB.subscriptions).filter(id => !/cancel/i.test(DB.subscriptions[id].status)).length` — **regex** match on the status string | L7647 |
| `quickRides` | `Object.keys(DB.trips).filter(id => DB.trips[id].kind === 'Quick ride').length` | L7647 |
| `cancelRatePct` | `quickTrips.length ? Math.round(cancelled / quickTrips.length * 100) : 0`, where `cancelled` = quick trips with `status === 'Cancelled'` (exact match) | L7647–7650 |
| `totalRevenue` | `Σ parseFloat(p.amount)` over `DB.payments` where `p.status === 'Paid'`, `.toFixed(2)` — **stored as a string** | L7647–7650 |
| `quickRideRevenue` | same Σ restricted to `p.type === 'Quick ride fare'`, `.toFixed(2)` | L7647–7650 |
| `subRevenue` | same Σ restricted to `p.type === 'Subscription charge'`, `.toFixed(2)` | L7647–7650 |

**Inconsistent status matching:** `activeSubs` uses a case-insensitive regex `/cancel/i`, while `cancelRatePct` uses exact `=== 'Cancelled'`. Both are in the same function.

### 7.3 The snapshot mechanism

- **Trigger:** manual only. There is no timer, no interval, no boot-time capture. The card text says so (L2039) and the seed comment repeats it (L13796–13798).
- **Storage:** `DB.dailySnapshots` array in memory. No persistence — a page reload restores the 30 seeded rows and discards anything captured.
- **Ordering:** `unshift` → newest first.
- **Uniqueness:** none. Capturing twice appends two rows with identical or near-identical `date` strings; nothing is overwritten.
- **Consumers:** the table here (L7658), the CSV export (L7665), and `renderExecTrendChart()` (L6762–6772), which does `(DB.dailySnapshots||[]).slice().reverse()` to draw an SVG polyline oldest→newest with no charting library.

### 7.4 Provenance guarantee

Every exporter reads `DB` directly at click time (L7600–7650). No cached copy exists. This is the stated design intent (L7591–7594).

---

## 8. Enumerations

### 8.1 Exportable datasets — the complete set (8)

| # | Button label (L2027–2034) | Function | Filename | Row source | Record-count source | Filter |
|---|---|---|---|---|---|---|
| 1 | 👤 Riders | `exportRiders()` L7600 | `eyvar_riders.csv` | `Object.keys(DB.riders)` | `Object.keys(DB.riders).length` | none |
| 2 | 🚗 Drivers | `exportDrivers()` L7604 | `eyvar_drivers.csv` | `DB.drivers` | active count | `status !== 'pending'` |
| 3 | 📦 Subscriptions | `exportSubscriptions()` L7608 | `eyvar_subscriptions.csv` | `DB.subscriptions` | `Object.keys(...).length` | none |
| 4 | 💰 Payments / Finance | `exportPayments()` L7612 | `eyvar_payments.csv` | `DB.payments` | `Object.keys(...).length` | none |
| 5 | 🕵️ Activity log | `exportAuditLog()` L7628 | `eyvar_audit_log.csv` | `DB.auditLog` | `.length` | none |
| 6 | 📤 Outbox log | `exportEmailLog()` L7644 | `eyvar_email_log.csv` | `DB.emailOutbox` | `.length` | none |
| 7 | 📥 Inbox | `exportInbox()` L7640 | `eyvar_inbox.csv` | `DB.inboundMessages` | `.length` | none |
| 8 | 📲 Push log | `exportPushLog()` L7648 | `eyvar_push_log.csv` | `DB.pushOutbox` | `.length` | none |

Plus a 9th, in the second card: **snapshot history** → `exportSnapshots()` L7665 → `eyvar_daily_snapshots.csv`.

### 8.2 CSV columns per dataset — complete

| Dataset | Columns (in order) |
|---|---|
| **Riders** (L7602) | `id`, `name`, `phone`, `city`, `rating`, `level`, `joined`, `activeSubs` — where `level` ← `r.lvl` and `activeSubs` ← `(r.subs \|\| []).length` |
| **Drivers** (L7606) | `id`, `name`, `phone`, `vehicle`, `type`, `rating`, `level`, `city` — `level` ← `d.lvl` |
| **Subscriptions** (L7610) | `id`, `rider`, `driver`, `plan`, `started`, `ends`, `trips`, `paid`, `status` — **rider/driver are raw ids, not names** |
| **Payments** (L7614) | `id`, `entity`, `type`, `amount`, `method`, `date`, `status` |
| **Activity log** (L7630) | `id`, `time`, `actor`, `action`, `entityType`, `entityId`, `summary` — `time` ← `e.ts`, `actor` ← `e.actorName`. **`before` and `after` are dropped.** |
| **Outbox log** (L7646) | `id`, `to`, `email`, `subject`, `category`, `sentAt` — `to` ← `e.toName`, `sentAt` ← `e.ts`. **`body` is dropped.** |
| **Inbox** (L7642) | `id`, `name`, `email`, `subject`, `receivedAt`, `status`. **`message` is dropped.** |
| **Push log** (L7649) | `id`, `title`, `body`, `audience`, `recipients`, `ts` — raw record, no renaming |
| **Snapshots** (L7666) | `id`, `date`, `riders`, `drivers`, `activeSubs`, `quickRides`, `cancelRatePct`, `totalRevenue`. **`quickRideRevenue` and `subRevenue` are dropped.** |

### 8.3 Snapshot record shape (complete) — L7648–7651

```js
{
  id:               'SNAP-0031',        // 'SNAP-' + (length+1) padded to 4
  date:             'Aug 23, 09:14 AM', // toLocaleString, locale-dependent
  riders:            Number,
  drivers:           Number,            // active only
  activeSubs:        Number,            // status not matching /cancel/i
  quickRides:        Number,            // kind === 'Quick ride'
  cancelRatePct:     Number,            // integer percent
  totalRevenue:     'String',           // toFixed(2) — a STRING, not a number
  quickRideRevenue: 'String',
  subRevenue:       'String'
}
```

### 8.4 Snapshot table columns (L2040)

`Captured`, `Riders`, `Drivers`, `Active subs`, `Quick rides`, `Cancel rate`, `Revenue`

### 8.5 The 30 seeded snapshots (L13802–13832)

`SNAP-0001` … `SNAP-0030`, dated `26 Jun 09:00` through `25 Jul 09:00` — one per day, every one at exactly `09:00`. Trajectory: riders 6→10, drivers 4→7, activeSubs 2→6, totalRevenue `295.05`→`647.37`. `quickRides` oscillates 8–26; `cancelRatePct` oscillates 3–9. The array literal is written oldest-first then `.reverse()`d at L13832.

---

## 9. Cross-module effects

| Target | Mechanism | Line |
|---|---|---|
| **Executive overview trend chart** | `renderExecTrendChart()` reads `(DB.dailySnapshots \|\| []).slice().reverse()` and draws a plain SVG polyline — *"no charting library"* (L6762) | L6762–6772; called by `captureDailySnapshot` at L7655 |
| **Activity / Audit log** | every download and every capture writes an `export_data` entry | L7638, L7653 |
| **Audit-log self-reference** | `exportAuditLog()` exports the log, then `downloadCSV` appends a new `export_data` row to it — the exported file is always one row behind | L7628 → L7638 |
| **Every other module** | all eight exporters read the live `DB` collections owned by other modules (riders, drivers, subscriptions, payments, audit, email, inbox, push) | L7600–7650 |
| **Settings meta captions** | `renderSettingsMeta()`'s map (L7340) has **no** `export` or `snapshot` key → no "Last updated by …" caption | L7339–7342 |
| **Navigation** | `renderExportCounts()` and `renderSnapshotsTable()` both run on every `go('settings')` | L8819 |
| **Data-integrity tab** | uses the *other* CSV encoder — `exportIntegrity()` calls `downloadCSV(name, buildCSV(head,rows))` (L18627), mixing the two pipelines | L18627 |

---

## 10. Hardcoded / mock / demo values

| Value | Where | Note |
|---|---|---|
| **30 seeded snapshots**, all timestamped `09:00` | L13802–13832 | Fabricated time series. The whole trend chart on the Executive page is drawn from these until an operator captures a real one. |
| All 9 filenames (`eyvar_*.csv`) | L7601, L7607, L7611, L7615, L7631, L7641, L7645, L7650, L7666 | Hardcoded, no date stamp — a second export overwrites the first in the Downloads folder |
| `'Quick ride'`, `'Cancelled'`, `'Paid'`, `'pending'`, `'Quick ride fare'`, `'Subscription charge'` | L7647–7650 | String literals compared exactly |
| `/cancel/i` regex | L7647 | Inconsistent with the exact-match literals in the same function |
| `1000` ms revoke delay | L7639 | |
| Static `0` counts in the HTML | L2027–2034 | Overwritten on render |
| "no server to auto-capture at midnight" disclaimer | L2039, L13797 | Explicit demo acknowledgement |
| `eyvar_<name>_25Jun.<fmt>` filename pattern | L9143 | In the *unreachable* `doExport` modal — hardcodes the frozen demo date `25Jun` into every filename |

---

## 11. i18n keys

| Key | Element | English | Arabic |
|---|---|---|---|
| `stab.export` | Nav button label span, L1443 | `Data Export` | `تصدير البيانات` (L7921) ✅ |
| `stabgrp.records` | Group header (export is in the `Records` group, L21276) | `Records` | `السجلات` (L7916) |

**No `data-i18n` attribute exists inside `#stab-export`.** Untranslated: the panel title and description (L2024), all eight button labels, the footnote (L2035), the `📈 Daily snapshots` heading, the capture button, the explanatory paragraph (L2039), all seven table column headers, the empty state, and the snapshot-history export button. All CSV **column headers are English only** as well.

---

## 12. Gaps, dead code, UNVERIFIED items

1. **No permission check on any export.** All eight dataset exporters and `exportSnapshots()` are ungated and unguarded (L7600–7667). `captureDailySnapshot` — which only appends a summary row — is the one action requiring `manage_settings` (L7646). Riders' phone numbers, drivers' details, and the full payment ledger can be pulled by anyone reaching the page. The pane's own footnote (L2035) promises accountability via the log but not authorisation.
2. **The gate text is factually wrong.** `GATE_SWEEP.captureDailySnapshot` claims *"Capturing twice in one day overwrites the earlier snapshot."* (L20882). `captureDailySnapshot` only `unshift`s (L7652) — there is no de-duplication by date, and no overwrite anywhere. Two captures in one day produce two rows.
3. **Two incompatible CSV encoders.** `toCSV` (L7595) quotes conditionally; `buildCSV` (L9183) quotes everything. Both are live; `exportIntegrity` uses the latter (L18627) while this tab uses the former.
4. **`downloadCSV` logs no row count** (L7638) — the audit entry reads only `Exported eyvar_riders.csv`. The richer `doExport` path does log counts (L9145). So the audit trail cannot answer "how much data left the system".
5. **`exportAuditLog()` is self-mutating** — exporting the audit log appends an `export_data` row to it (L7628 → L7638), so the CSV never contains the export that produced it.
6. **A superior export modal exists but is unreachable from this tab.** `exportData(btn, page)` (L9188) + `doExport(page)` (L9130) offer CSV **or JSON**, a native save-location picker via `window.showSaveFilePicker` with graceful fallback, and row-count logging. This tab's eight buttons bypass all of it. Worse, `exportRows(page)` (L9175) only knows three page keys (`subscriptions`, `quickrides`, default `trips`) — so the two systems export different datasets with different encoders and different filename conventions.
7. **`doExport` hardcodes `25Jun` into every filename** (L9143: `'eyvar_' + d.name + '_25Jun.' + fmt`) — the frozen demo date.
8. **Data loss in three exports:** the audit CSV drops `before`/`after` (L7630); the email CSV drops `body` (L7646); the inbox CSV drops `message` (L7642). The snapshot CSV drops `quickRideRevenue` and `subRevenue` (L7666). The user is not told.
9. **Subscriptions CSV exports raw ids for rider and driver** (L7610) rather than names, unlike the parallel `exportRows('subscriptions')` (L9176) which resolves them via `nm2()`.
10. **The snapshot table hides 3 of 10 captured fields** (`id`, `quickRideRevenue`, `subRevenue`) and the CSV hides 2. The two revenue splits are computed on every capture (L7650) and are visible nowhere in this tab.
11. **`totalRevenue` is stored as a string** (`.toFixed(2)`, L7650). Any downstream arithmetic must re-parse; the trend chart at L6772 consumes these.
12. **Inconsistent cancelled-subscription matching inside one function** — `/cancel/i` for `activeSubs` (L7647) vs `=== 'Cancelled'` for `cancelRatePct` (L7647). A status of `"Cancelled by rider"` counts as cancelled for one metric and not the other.
13. **`SNAP-` id collision.** `length + 1` (L7648) against 30 seeds yields `SNAP-0031` for the first capture — correct only while nothing is removed.
14. **No date-stamped filenames** — re-exporting overwrites the previous download.
15. **`export_data` IS in `ACTION_LABELS`** (L2909, label `Exported data`) — one of the few keys in this half of Settings that is filterable on the Activity-log page. Note it is also the key used by `captureDailySnapshot` (L7653) with `entityType:'snapshot'`, so captures and downloads share one filter bucket.
16. **`renderSettingsMeta()` has no key for this tab** (L7340) — no "Last updated by …" caption.
17. **No persistence.** Captured snapshots live only in memory; a reload discards them and restores the 30 seeds.
18. **No scheduling, no retention policy, no size guard.** A 500-row audit export and a 6-row rider export use identical machinery with no warning either way.
19. **UNVERIFIED — `renderExecTrendChart()`.** Confirmed to read `DB.dailySnapshots` at L6772 and to be called from `captureDailySnapshot` at L7655; its full rendering logic and which fields it plots were not read in this pass.
20. **UNVERIFIED — `DB.payments[*].type` value domain.** `captureDailySnapshot` splits revenue on the exact strings `'Quick ride fare'` and `'Subscription charge'` (L7650). Whether other `type` values exist (in which case their revenue is counted in `totalRevenue` but in neither split) was not confirmed.

---

## 13. Line-number index

| Item | Lines |
|---|---|
| Nav button `data-tab="export"` | L1443 |
| Pane `#stab-export` | L2020–2047 |
| Export card header + description | L2021–2025 |
| Eight export buttons + count spans | L2026–2034 |
| Footnote "Each export is logged…" | L2035 |
| Snapshots card + `[📸 Capture snapshot now]` | L2037–2038 |
| Snapshots explanatory paragraph | L2039 |
| Snapshots table header + `#snapshots-tbody` | L2040 |
| `[Export snapshot history — CSV]` | L2043 |
| `ACTION_LABELS` (contains `export_data`) | L2900–2910, key at L2909 |
| `requirePerm()` | L3126–3132 |
| `logAction()` (500-entry cap) | L3133–3155 |
| `renderExecTrendChart()` (reads snapshots) | L6762–6772 |
| `renderSettingsMeta()` map | L7339–7342 |
| Export module comment | L7591–7594 |
| `toCSV()` | L7595–7599 |
| `exportRiders()` | L7600–7603 |
| `exportDrivers()` | L7604–7607 |
| `exportSubscriptions()` | L7608–7611 |
| `exportPayments()` | L7612–7615 |
| `exportAuditLog()` | L7628–7631 |
| `downloadCSV()` | L7632–7641 |
| `exportInbox()` | L7640–7643 |
| `exportEmailLog()` | L7644–7647 |
| `exportPushLog()` | L7648–7650 |
| `captureDailySnapshot()` | L7645–7657 |
| `renderSnapshotsTable()` | L7658–7664 |
| `exportSnapshots()` | L7665–7667 |
| `renderExportCounts()` | L7668–7670 |
| `go('settings')` fan-out | L8819 |
| `doExport()` (unreachable modal path) | L9130–9152 |
| `exportRows()` | L9175–9182 |
| `buildCSV()` (second encoder) | L9183–9186 |
| `exportData()` (unreachable modal) | L9188–9204 |
| Snapshot seed comment | L13796–13801 |
| `DB.dailySnapshots` seed (30 rows) + `.reverse()` | L13802–13832 |
| `exportIntegrity()` (uses `buildCSV`) | L18615–18628 |
| `GATE_SWEEP.captureDailySnapshot` | L20881–20882 |
| `installGateSweep()` | L20898–20900 |
| `SETTINGS_GROUPS` (export → `Records`) | L21276 |
