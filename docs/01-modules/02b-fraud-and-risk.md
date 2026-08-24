# Module: Fraud & Risk

> **Source file:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> **Page id:** `fraud` — container `<div class="page" id="p-fraud">`
> **HTML lines:** L649–L673 (page block); sidebar entry L490, L492
> **Sidebar group:** `Intelligence` (`sec.intelligence`, L490)
> **Primary render:** `renderFraudPage()` L5592–L5646 (module banner L5586–L5591)
> **Secondary render:** `renderIdentityCollisions()` L16492–L16513, backed by `identityCollisions()` L16461–L16491 (banner L16455–L16460)
> **Action entry point:** `quickSuspendFromFraud()` L9079–L9081 → `openSuspendAccountModal()` L9058–L9078 → `commitSuspendAccount()` L9082–L9098

---

## 1. Purpose

Surfaces fraud and abuse signals that are **computed from data that actually exists on account records** — shared last-known IP, the referral log, and real trip history — rather than from a simulated fraud score. The module banner is explicit about the boundary (L5586–L5591): *"GPS-anomaly detection is explicitly NOT simulated since this dataset has no real GPS stream to analyze; the page says so instead of faking a number."*

Page header copy (L651): `🛡️ Fraud & risk` / *"Real signals computed from account data — shared devices, referral abuse, and unusual driver-rider pairing patterns"*.

The Identity-collision card carries a second, separate purpose stated in its own banner (L16455–L16460): a pre-migration audit — *"audit first, split the two very different cases, then add the constraint"* — before a unique index is added to production contact fields.

Toolbar title `Fraud & Risk` (`titles` map, L2168). **The `subs` map (L2169) has no `fraud` key**, so the toolbar subtitle renders empty (`subs[id]||''`, L8787).

---

## 2. Entry points & routing

| Entry | Line | Effect |
|---|---|---|
| Sidebar item `onclick="go('fraud',this)"` | L492 | Navigates to page id `fraud` |
| `go()` page dispatch — `if(id==='fraud'){renderFraudPage();renderIdentityCollisions();}` | L8813 | Both renderers run on every navigation |
| Boot `setTimeout` block | L14575 | Calls **`renderFraudPage()` only** — `renderIdentityCollisions()` is *not* called at boot, so `#identity-collisions` stays empty until the page is first visited |

**Not on the demo tick loop.** Unlike Predictive Signals (L12620), nothing re-renders the fraud page while it is on screen; it is a snapshot as of the last navigation.

**No view permission gate.** `window.go` (L8774–L8826) performs no permission check for this page. Moreover **there is no `PAGE_PERMISSIONS.fraud` entry at all** — the map (L10564–L10651) has no `fraud` key, so `canPage('fraud', …)` would always be false. Nothing on the page calls `requirePagePerm('fraud', …)`, so this has no practical effect (see §15 item 1).

Sidebar badge `#sbb-fraud` (L492, static default `0`) is set only by `renderFraudPage()` (L5645) to `totalFlags || ''` — i.e. it renders **blank, not `0`**, when there are no flags.

---

## 3. Layout map

| Order | Container / card | id | Line | Rendered by |
|---|---|---|---|---|
| 1 | Page header `.ph` (title + strapline) | — | L651 | Static HTML |
| 2 | KPI row `.g3` (3 cards) | `fraud-kpis` | L652 | `renderFraudPage()` L5640–L5644 |
| 3 | Card (`border-color:#E0A0A0`), header `.ch` on `var(--red-lt)` — `🆔 Identity collisions — one email or phone, more than one account`, caption in `var(--red)`: *"Ambiguous identity is what lets a ride event reach the wrong client"* | `identity-collisions` (`padding:0`) | L653–L656 | `renderIdentityCollisions()` |
| 4 | Card (`border-color:#E0A0A0`), header on `var(--red-lt)` — `📱 Shared device / IP across rider accounts`, caption: *"Same device or IP behind multiple accounts — a classic promo/referral abuse pattern"* | `fraud-shared-list` (`padding:0`) | L657–L660 | `renderFraudPage()` L5595–L5607 |
| 5 | Card (`border-color:#E0A0A0`), header on `var(--red-lt)` — `🎁 Referral self-abuse`, caption: *"Referrer and referee sharing a device/IP — likely the same person claiming both bonuses"* | `fraud-referral-list` (`padding:0`) | L661–L664 | `renderFraudPage()` L5610–L5619 |
| 6 | Plain card — `🤝 Unusual driver-rider pairing`, caption in `var(--ghost)`: *"Same pair riding together far more than random chance would suggest — worth a manual look, not proof of collusion"* | `fraud-pairing-list` (`padding:0`) | L665–L668 | `renderFraudPage()` L5623–L5637 |
| 7 | Plain card — `📍 GPS anomaly flags`, caption in `var(--ghost)`: *"Simulated — this dataset has no real live GPS stream to analyze for spoofing/teleportation patterns"* | *(no id — static text block)* | L669–L672 | **Static HTML only — no JS** |

---

## 4. KPIs & metrics

Three cards, built in one `innerHTML` assignment from a literal 3-row array (L5640–L5644). Cards carry class `kpi` **only** — no `click` class, no `onclick`, no `title`, and no progress bar (`.kpi-bar`), unlike the Predictive page.

| # | Label | Source / Formula | Units | Colour rule | Sub-label (`kpi-dl neu`) | Line |
|---|---|---|---|---|---|---|
| 1 | `Shared device/IP groups` | `sharedGroups.length` = number of distinct `lastIp` values shared by **more than one rider** (L5602) | count of groups (not accounts) | `var(--red)` when `> 0`, else `var(--ink)` (L5644) | `rider accounts` | L5641 |
| 2 | `Referral self-abuse flags` | `refFlags.length` = referral-log entries where referrer and referee share `lastIp` **or** `device` (L5610–L5613) | count | `var(--red)` when `> 0`, else `var(--ink)` | `out of {DB.referralLog.length} referrals` — denominator is the total referral-log length | L5642 |
| 3 | `Unusual pairings` | `pairFlags.length` = driver↔rider pairs with `>= 3` shared trips (L5623–L5630) | count of pairs | `var(--red)` when `> 0`, else `var(--ink)` | `3+ shared trips` | L5643 |

**Sidebar badge:** `totalFlags = sharedGroups.length + refFlags.length + pairFlags.length` (L5639); written as `totalFlags || ''` (L5645) — an empty string when zero.

**Identity collisions are not in any KPI and not in `totalFlags`.** The collision count appears only as inline bold text inside the card header line (L16499–L16500): `<b>{all.length}</b> collision(s), <b>{cross}</b> spanning both a rider and a captain`, where the `cross` numeral is coloured `var(--red)` when `> 0`, else `var(--ink)` (L16500).

There is **no aggregate risk score** anywhere on this page — every signal is a discrete count. No severity numeric, no weighting, no threshold bands beyond the per-signal trigger rules in §9.

---

## 5. Data displayed

| Element | DB path / source | Type | Notes |
|---|---|---|---|
| Shared-IP value | `DB.riders[id].lastIp` (seed L2594–L2630) | IPv4 string | Rendered monospace 11 px, `var(--muted)` (L5605) |
| Shared-IP group size | computed — `g.riders.length` | int | Badge `b-red`, 9 px, text `{n} accounts` (L5605) |
| Rider names in a group | `nm2(rid)` → `DB.riders[rid].name` (L3565) | string | `var(--blue)`, click → `openProfile(rid)`; joined with `, ` (L5606) |
| Rider suspension state | `DB.riders[rid].suspended` — object `{reason, by, at}` set by `commitSuspendAccount` (L9090); **absent in seed data** | object ‖ undefined | Truthiness drives badge-vs-button (L5606) |
| Referral pair | `DB.referralLog[].referrerId` / `.refereeId` (seed L13888–L13890) | ids | Both rendered as `openProfile` links (L5617) |
| Referral log size | `(DB.referralLog||[]).length` | int | Denominator of KPI 2's sub-label |
| Rider device string | `DB.riders[id].device` — e.g. `'iPhone 14 Pro · iOS 17.4'` | string | Used **only** by the referral rule (L5612); never displayed |
| Pair trip count | computed from `DB.drivers[did].trips[]` → `DB.trips[tid].rider` (L5628) | int | Badge `b-amber`, 9 px, text `{count} shared trips` (L5634) |
| Driver name in pair | `nm2(p.driverId)` | string | `openProfile` link (L5634) |
| Rider name in pair | `nm2(p.riderId)` | string | `openProfile` link (L5634) |
| Driver suspension state | `DB.drivers[p.driverId].suspended` | object ‖ undefined | L5633, L5635 |
| Collision key value | lowercased, trimmed `r.email`/`r.phone`/`d.email`/`d.phone` (L16465) | string | Rendered as the row title, 11.5 px, weight 500 (L16506) |
| Collision kind | literal `'email'` or `'phone'` from `collide(map, kind)` (L16490) | string | Badge text; class `b-red` when cross-role else `b-amber` (L16506) |
| Collision members | `{id, name, role}` records (L16470–L16476) | objects | Rendered `{name} ({id} · {role})`, each an `openProfile` link, joined with `'  ·  '` (L16508) — two **plain** U+0020 spaces either side of U+00B7 (bytes `20 20 C2 B7 20 20`), not `&nbsp;`, so each pair collapses to a single space in rendered HTML |
| Collision verdict | computed string (L16485–L16487) | string | Prefixed `→ `; `var(--red)` when cross-role, else `var(--ghost)` (L16510) |
| Total / cross-role collision counts | `all.length` / `cross` (L16496–L16497) | int | Inline bold in the header paragraph (L16499–L16500) |
| GPS anomaly text | **Static HTML string** (L671) | prose | No data source |

**Source-of-truth note:** the rider/driver records used by the pairing rule are extended at boot. `historyBoot()` → `reconstructHistory()` (L18668+, boot step registered at L21819) generates synthetic trips, writes them into `DB.trips` with `reconstructed:true`, and pushes their ids onto both `r.trips` and `DB.drivers[t.driver].trips` (L18761–L18763), picking the driver at random via `driverIds[Math.floor(seededRand(...)*driverIds.length)]` (L18778 region). The pairing signal therefore operates largely over **generated** history, not over the 8 hand-seeded trips.

---

## 6. Input fields

**The Fraud & Risk page has no input fields of its own.** No search box, no filter chips, no `<select>`, no text input, no sort control. Verified across the full HTML block L649–L673 and both render functions (L5592–L5646, L16492–L16513).

The single field in the module belongs to the suspension modal:

| id | Type | Label | Default | Options / validation | Drives |
|---|---|---|---|---|---|
| `suspend-reason` (wrapper `csel-suspend-reason`) | Custom select — `customSelectHTML()` L5336–L5354. Renders a `.csel` button + menu plus a **`<input type="hidden" id="suspend-reason">`** carrying the value (L5352). Only 5 options, so the built-in search box (`options.length>6`, L5343) is **not** rendered. | `Reason` followed by a red `*` (L9067) | `'Confirmed fraud'` when opened from a Fraud-page button (a `prefillNote` is always passed); `''` — display placeholder `Select…` — when opened without one, e.g. from the profile page (L9074, L5338) | Options in order: `Confirmed fraud` · `Repeated policy violations` · `Safety incident` · `Under police/legal investigation` · `Other — see note` (L9069–L9073). **Validation:** `commitSuspendAccount` reads the hidden input and aborts with `toast('⚠ Pick a reason first','warn')` if empty (L9087–L9088). | Written verbatim into `d.suspended.reason`, into the audit summary, and into the ops-notification body |

---

## 7. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `Suspend` — btn `sm danger`, 9 px, per rider inside a shared-IP group (L5606) | `quickSuspendFromFraud(riderId,'false','Shared device/IP with another account')` | Opens the suspension modal with that detected reason pre-filled | none yet | **none at this layer** — the gate lives in `commitSuspendAccount` | none yet | The modal is the deliberate step |
| `Suspend referee` — btn `sm danger`, 9.5 px, referral row (L5618) | `quickSuspendFromFraud(refereeId,'false','Referral self-abuse — shared device/IP with referrer')` | Same | none yet | none at this layer | none yet | Modal |
| `Suspend driver` — btn `sm danger`, pairing row (L5635) | `quickSuspendFromFraud(driverId,'true','Unusual pairing — {count} shared trips with same rider')` | Same, driver branch | none yet | none at this layer | none yet | Modal |
| `Suspend rider` — btn `sm danger`, pairing row (L5636) | `quickSuspendFromFraud(riderId,'false','Unusual pairing — {count} shared trips with same driver')` | Same, rider branch | none yet | none at this layer | none yet | Modal |
| Any name link — shared-IP group, referral row, pairing row, collision row | `openProfile(id)` (L8827) | Switches to `p-profile`, pushes history | `navCurrent`, history stack | none | none | No |
| KPI cards 1–3 | *(no handler)* | Inert — display only | — | — | — | — |
| GPS anomaly card | *(no handler)* | Inert static text | — | — | — | — |

**There is no `go(...)` call anywhere on this page** — the only navigation is via `openProfile`.

**There is no un-suspend / reinstate control on this page.** `reinstateAccount()` (L9099–L9110) is only wired to the 360° Profile page (L4113). Once suspended from here, the entity shows a `🚫 Suspended` badge on the fraud list and can be reinstated only from its profile.

### Modal buttons (`openSuspendAccountModal`, L9058–L9078)

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| `✕` (`.modal-close`, L9063) | `closeModal()` | Dismiss | none | none | none | No |
| `Cancel` — btn `sm` (L9076) | `closeModal()` | Dismiss | none | none | none | No |
| `🚫 Suspend` — btn `sm danger` (L9076) | `commitSuspendAccount(entityId, isDrvStr)` | See below | see below | `requirePerm('approve_drivers')` (L9083) | `account_suspended` | **No secondary gate** — `commitSuspendAccount` is absent from both `GATE_SPECS` (L18245–L18371) and `GATE_SWEEP` (L20769–L20885), so `guardAction` never wraps it |

### `commitSuspendAccount(entityId, isDrvStr)` — exact effects (L9082–L9098)

1. `requirePerm('approve_drivers')` — aborts if the role lacks it (L9083). The inline comment states this is deliberately *"higher-trust action than flagging — same permission tier as approving/rejecting drivers."* A denial writes a `permission_denied` audit entry and an error toast (L3126–L3132).
2. `isDrv = (isDrvStr === 'true')`; resolves `d` from `DB.drivers` or `DB.riders`; returns silently if not found (L9084–L9086).
3. Reads `#suspend-reason`; if empty → `toast('⚠ Pick a reason first','warn')` and **abort** (L9087–L9088).
4. **Writes `d.suspended = {reason, by: <actor display name or CURRENT_USER_ID>, at: fmtReqNowLabel()}`** (L9089–L9090) — this is the single state mutation of the whole module.
5. `logAction('account_suspended', 'driver'|'rider', entityId, '{name} suspended — {reason}', {}, {suspended:true})` (L9091) → appends an `AUD-nnnn` record to `DB.auditLog`.
6. `pushOpsNotification('alert','Account suspended — {name}', reason, function(){openProfile(entityId);})` (L9092) → unshifts onto `DB.notifications`, updates the bell badge.
7. `closeModal()` (L9093).
8. `openProfile(entityId, true)` (L9094) — **navigates away from the Fraud page** to the 360° Profile. The second argument `isBack=true` means no history entry is pushed.
9. Re-renders the Drivers table or the Riders table depending on `isDrv` (L9095–L9096).
10. `toast('🚫 {name} suspended — ' + (isDrv ? 'removed from dispatch' : 'blocked from new subscriptions'), 'err')` (L9097).

**It never re-renders the fraud page** (`renderFraudPage()` is not called), and because step 8 navigates away, the operator must re-enter the page to see the updated badge.

---

## 8. Tables & lists

None of the five cards uses a `<table>`. All are stacked `<div>` rows.

### 8.1 Identity collisions (`#identity-collisions`, `renderIdentityCollisions()` L16492–L16513)

- **Header block (always rendered, L16498–L16502):** an explanatory paragraph, `padding:11px 14px`, 11.5 px, `var(--muted)`, `line-height:1.7`, bottom border — carrying the two inline counts and the closing recommendation *"Phone should be the canonical key (OTP-verified, unique); email should be optional and non-unique."*
- **Row source:** `identityCollisions().email.concat(.phone)` (L16496) — email collisions first, then phone collisions, each in `Object.keys()` order of its map.
- **Sort / filter / search:** none.
- **Per row (L16505–L16510):** `padding:11px 14px`, `border-bottom:.5px solid #F2F1EE`; background `var(--red-lt)` when `crossRole`. Line 1 — the colliding value + a kind badge. Line 2 — every member as `{name} ({id} · {role})`, each an `openProfile` link, joined by `'  ·  '` (plain spaces around U+00B7 — not `&nbsp;`, so they collapse in rendered HTML). Line 3 — `→ {verdict}`.
- **Row click:** per-member link only; no whole-row handler.
- **Empty state (L16512):** *"No collisions in the current dataset. Run this against production before adding a unique constraint — the audit tells you which duplicates are the same human (merge) and which are one ops address reused across a fleet (do not merge)."*
- **With the shipped seed data this card renders its empty state.** *(Verified:* `DB.riders` records L2594–L2630 carry **no `email` property at all**, so `add(byEmail, undefined, …)` returns early for every rider; the six driver emails L2632–L2668 are pairwise distinct; and every rider/driver `phone` value in the file is unique. A file-wide `grep -o "email:'…'" | sort | uniq -d` returns exactly one duplicate — `noura.f@eyvar.com` — which belongs to `DB.teamUsers` (L2837), a collection this function never reads.*)

### 8.2 Shared device / IP across rider accounts (`#fraud-shared-list`, L5595–L5607)

- **Row source:** `DB.riders` grouped by `r.lastIp` (riders with no `lastIp` are skipped, L5598); groups with `riders.length > 1` are kept (L5602).
- **Scope:** riders **only** — `DB.drivers` is never consulted here.
- **Sort / filter / search:** none. `Object.keys(byIp)` order.
- **Per row (L5605–L5606):** `padding:10px 14px`, bottom border `#F2F1EE`. Badge `b-red` (9 px) `{n} accounts` · monospace IP · ` — ` · comma-separated member list. Each member is a blue `openProfile` link followed by **either** a `🚫 Suspended` badge (`background:var(--red); color:#fff; font-size:8px`) when `DB.riders[rid].suspended` is truthy, **or** a `Suspend` button.
- **Empty state (L5607):** `No rider accounts currently share the same last-known IP.`
- **With the seed data exactly one group qualifies:** `160.156.4.90` shared by `RDR-2087` (Layla Al-Faraj, L2598) and `RDR-2055` (Bandar Al-Harbi, L2611). The near-miss pair `92.96.14.201` (RDR-1041) / `92.96.14.208` (DRV-0106) does not match — different addresses, and drivers are out of scope anyway.

### 8.3 Referral self-abuse (`#fraud-referral-list`, L5610–L5619)

- **Row source:** `DB.referralLog` filtered by the rule in §9.3 (L5610–L5613).
- **Sort / filter / search:** none — array order.
- **Per row (L5617–L5618):** `padding:10px 14px`, bottom border, 11.5 px, flex with `justify-content:space-between` and `flex-wrap:wrap`. Left — badge `b-red` (9 px) `Flagged`, then `{referrer} referred {referee} — same device/IP on both accounts` with both names as `openProfile` links. Right — a `🚫 Referee suspended` badge when `DB.riders[refereeId].suspended`, otherwise a `Suspend referee` button.
- **Empty state (L5619):** `No referral pairs currently share a device or IP.`
- **With the seed data this card renders its empty state.** The one seeded entry `REF-seed-1` (L13889) links `RDR-1041` → `RDR-1075`; their IPs (`92.96.14.201` vs `185.45.10.91`) and devices (`iPhone 14 Pro · iOS 17.4` vs `Samsung Galaxy A54 · Android 13`) both differ.
- **Asymmetry:** only the **referee** is offered a suspend button. The referrer is a link only, with no action — see §15 item 4.

### 8.4 Unusual driver-rider pairing (`#fraud-pairing-list`, L5623–L5637)

- **Row source:** for every driver in `DB.drivers` that has a `trips` array (L5624–L5626), tally `DB.trips[tid].rider` across their trips (L5628); emit one flag per rider with `count >= 3` (L5629).
- **Sort / filter / search:** none — driver-key order, then rider-key order within each driver.
- **Per row (L5634–L5636):** `padding:10px 14px`, bottom border, 11.5 px, flex `space-between` + wrap. Left — badge `b-amber` (9 px) `{count} shared trips`, then `{driverName} ↔ {riderName}` as two `openProfile` links. Right — a 6 px-gap flex holding, for each side independently, either a `🚫 Driver suspended` / `🚫 Rider suspended` badge or a `Suspend driver` / `Suspend rider` button.
- **Empty state (L5637):** `No driver-rider pair currently exceeds the pairing threshold.`
- **From the hand-seeded trips alone, zero pairs qualify.** The largest seeded driver trip list is `DRV-0101` with three trips (`trips:[…]` at L2636: `TRP-7741`, `TRP-9005`, `TRP-7720`), and their riders are not all the same (`TRP-7741` → `RDR-1041`, `TRP-9005` → `RDR-2090`). Runtime flags therefore come from the reconstructed history described in §5.

### 8.5 GPS anomaly flags (static, L669–L672)

- No id, no render function, no data. A single explanatory paragraph (`padding:14px`, 11.5 px, `var(--ghost)`), L671: *"A real deployment would flag: impossible speed between two pings, a trip's GPS staying fixed at one point the whole ride, or a route that doesn't match any real road path. None of these are computable from this dataset's static mock coordinates — flagging them here would be fabricating a signal, not detecting one."*
- This is a **deliberate non-implementation**, labelled as such in the card caption (*"Simulated — this dataset has no real live GPS stream…"*, L670) and in the module banner (L5589–L5591).

---

## 9. Signals / rules / scoring logic

There is no composite score in this module. Each of the four live signals is a boolean/threshold rule producing a discrete flag.

### 9.1 Identity collision (`identityCollisions()`, L16461–L16491)

**Index build (L16463–L16477).** `add(map, key, rec)` skips falsy keys **and the literal string `'[erased]'`** (L16464) — the sentinel written by the GDPR-erasure routine (L16024–L16026, which sets `r.phone`, `r.email`, `r.address`, `r.device`, `r.lastIp`, `r.ipLocation` to `'[erased]'`). Surviving keys are normalised with `String(key).toLowerCase().trim()` (L16465).
Indexed sources, in order: every `DB.riders` record contributes `email` and `phone` as role `rider` (L16468–L16472); every `DB.drivers` record contributes `email` and `phone` as role `driver` (L16473–L16477). `DB.teamUsers`, `DB.pendingDrivers` and `DB.inboundMessages` are **not** indexed.

**Collision rule (L16478–L16489).** Any normalised key held by more than one record.

| Derived attribute | Rule | Line |
|---|---|---|
| `crossRole` | the collision's records span more than one distinct `role` | L16481–L16482 |
| `sameName` | every record's `name` equals the first record's `name` | L16483 |

**Verdict (severity) ladder — first match wins (L16485–L16487):**

| Priority | Condition | Verdict text | Severity treatment |
|---|---|---|---|
| 1 | `crossRole` | `cross-role — dispatch cannot disambiguate` | **Highest** — row background `var(--red-lt)`, kind badge `b-red`, verdict text `var(--red)`, and the record is counted in the header's `cross` tally |
| 2 | `!crossRole && sameName` | `same person, duplicate accounts — merge under one user` | Kind badge `b-amber`, verdict text `var(--ghost)` |
| 3 | otherwise | `one address reused across accounts — make it optional, non-unique` | Kind badge `b-amber`, verdict text `var(--ghost)` |

The header paragraph states the operational stake (L16500–L16501): cross-role collisions *"break dispatch, because an event keyed on an ambiguous identity can be published to the wrong client."*

### 9.2 Shared device / IP (L5595–L5602)

**Rule:** two or more `DB.riders` records share an identical `lastIp` string (exact match, no normalisation, no CIDR/subnet logic). Riders with a falsy `lastIp` are excluded.
**Threshold:** `riders.length > 1`.
**Severity:** flat — every group gets the same `b-red` treatment; group size is shown but does not change styling.
**Discrepancy:** the card title and caption say *"device / IP"* and *"Same device or IP behind multiple accounts"* (L658), but the code groups on `lastIp` **only** — `r.device` is never read in this block. See §15 item 3.

### 9.3 Referral self-abuse (L5610–L5613)

**Rule:** for each `DB.referralLog` entry, resolve `a = DB.riders[l.referrerId]` and `b = DB.riders[l.refereeId]`; flag when **both exist** AND (`a.lastIp && a.lastIp === b.lastIp`) **OR** (`a.device && a.device === b.device`).
**Threshold:** boolean — a single shared attribute flags the pair.
**Severity:** flat `b-red` `Flagged` badge.
**Note:** `device` is a coarse model-plus-OS string (e.g. `'iPhone 15 · iOS 17.5'`), not a device fingerprint — two unrelated riders on the same phone model and OS version would flag. `RDR-2031` and `DRV-0106` both carry `'iPhone 15 · iOS 17.5'` in the seed data, illustrating the collision space. See §15 item 5.

### 9.4 Unusual driver-rider pairing (L5623–L5630)

**Rule:** for each driver, count how many of *their* trips (`DB.drivers[did].trips`) resolve to the same `DB.trips[tid].rider`; emit a flag for every rider whose count reaches the threshold.
**Threshold:** `count >= 3` — stated in the inline comment as *"(threshold: 3+ shared trips)"* (L5622) and echoed in KPI 3's sub-label.
**Severity:** flat `b-amber` (deliberately softer than the red cards). The card caption is explicit about the epistemic status: *"worth a manual look, not proof of collusion"* (L666).
**No baseline or normalisation.** The caption claims the pairs ride together *"far more than random chance would suggest"*, but the rule is an absolute count — it does not compare against the driver's total trip volume, the rider's total, or any expected-frequency baseline. A driver with exactly 3 lifetime trips, all with one rider, is treated identically to one with 300 trips of which 3 were with that rider. See §15 item 6.

### 9.5 GPS anomaly — declared not-implemented (L669–L672)

Three named rules a real deployment would run, all explicitly *not* computed here: impossible speed between two pings · a trip's GPS staying fixed at one point for the whole ride · a route that matches no real road path.

---

## 10. Modals opened

### Modal — Suspend account (`openSuspendAccountModal()`, L9058–L9078)

Reached from every one of the four suspend buttons via `quickSuspendFromFraud()` (L9079–L9081), which is a pure pass-through: `openSuspendAccountModal(entityId, isDrvStr, detectedReason)` — the third argument becomes `prefillNote`.

| Property | Value |
|---|---|
| Title | `🚫 Suspend account — {d.name}` (L9063) |
| Guard | `if(!d)return;` — silent no-op when the id resolves to neither a driver nor a rider (L9061). **No permission check at open time.** |
| Warning box (L9065) | `var(--red-lt)` background, `var(--red-border)` border, 11.5 px, `var(--red)` text. Driver copy: *"Immediately removes this driver from dispatch matching — no new rides or subscription assignments until reinstated."* Rider copy: *"Blocks this rider from being assigned to new subscriptions. Existing active trips are not interrupted."* |
| Detected-reason box (L9066) | **Conditional** — rendered only when `prefillNote` is truthy. `var(--amber-lt)` background, 11 px, `var(--amber-dk)`, text `🔍 Detected: {prefillNote}`. From the Fraud page this always renders, with one of four literal strings (see §7). |
| Field | `Reason *` → custom select, hidden input id `suspend-reason` — see §6 |
| Footer (L9076) | `Cancel` (btn `sm`) → `closeModal()` · `🚫 Suspend` (btn `sm danger`) → `commitSuspendAccount(entityId, isDrvStr)` |
| Close | `✕` `.modal-close` → `closeModal()` (L9063) |
| Opened by | `document.getElementById('modal-overlay').classList.add('open')` (L9077) |
| Commit function | `commitSuspendAccount()` L9082–L9098 — see §7 |

The four `prefillNote` strings supplied by this page, verbatim:

| Origin | Line | Detected-reason text |
|---|---|---|
| Shared IP group | L5606 | `Shared device/IP with another account` |
| Referral self-abuse | L5618 | `Referral self-abuse — shared device/IP with referrer` |
| Pairing — driver side | L5635 | `Unusual pairing — {count} shared trips with same rider` |
| Pairing — rider side | L5636 | `Unusual pairing — {count} shared trips with same driver` |

**No other modal is opened from this module.** There is no confirmation gate layered on top (see §7).

---

## 11. States & badges

| State / badge | Exact condition | Visual |
|---|---|---|
| `{n} accounts` | always, per shared-IP group (L5605) | `b-red`, 9 px, `margin-right:6px` |
| `🚫 Suspended` (rider, shared-IP list) | `DB.riders[rid].suspended` truthy (L5606) | `class="b"` with inline `background:var(--red); color:#fff; font-size:8px` |
| `Suspend` button (shared-IP list) | `DB.riders[rid].suspended` falsy (L5606) | `btn sm danger`, `padding:1px 6px; height:auto; font-size:9px; margin-left:3px` |
| `Flagged` | always, per referral row (L5617) | `b-red`, 9 px |
| `🚫 Referee suspended` | `DB.riders[refereeId].suspended` truthy (L5618) | `class="b"`, red background, white text, 8 px |
| `Suspend referee` button | `DB.riders[refereeId].suspended` falsy (L5618) | `btn sm danger`, `padding:2px 8px; height:auto; font-size:9.5px` |
| `{count} shared trips` | always, per pairing row (L5634) | `b-amber`, 9 px |
| `🚫 Driver suspended` | `DB.drivers[p.driverId].suspended` truthy (L5635) | `class="b"`, red background, white text, 8 px |
| `Suspend driver` button | `DB.drivers[p.driverId].suspended` falsy (L5635) | `btn sm danger`, 9.5 px |
| `🚫 Rider suspended` | `DB.riders[p.riderId].suspended` truthy (L5636) | `class="b"`, red background, white text, 8 px |
| `Suspend rider` button | `DB.riders[p.riderId].suspended` falsy (L5636) | `btn sm danger`, 9.5 px |
| Collision kind badge `email` / `phone` — red | `x.crossRole` true (L16506) | `b-red`, 9 px |
| Collision kind badge — amber | `x.crossRole` false (L16506) | `b-amber`, 9 px |
| Collision row highlighted | `x.crossRole` true (L16505) | `background:var(--red-lt)` |
| Collision verdict text red | `x.crossRole` true (L16510) | `color:var(--red)` |
| Collision verdict text ghost | `x.crossRole` false (L16510) | `color:var(--ghost)` |
| Header `cross` numeral red | `cross > 0` (L16500) | `color:var(--red)`; otherwise `var(--ink)` |
| KPI value red | that KPI's count `> 0` (L5644) | `color:var(--red)`; otherwise `var(--ink)` |
| Sidebar badge blank | `totalFlags === 0` (L5645, `totalFlags||''`) | Empty `.sb-badge a` element |
| Card border red | Cards 3, 4, 5 — static (L653, L657, L661) | `border-color:#E0A0A0`, header `.ch` background `var(--red-lt)`, caption `var(--red)` |
| Card border neutral | Cards 6, 7 — static (L665, L669) | Default card border, caption `var(--ghost)` |

**`suspended` payload** written by `commitSuspendAccount` (L9090): `{reason: <selected reason>, by: <actor display name>, at: fmtReqNowLabel()}`. Nothing in the seed data sets it, so every list starts with buttons rather than badges.

---

## 12. Cross-module links

| From | Call | Target | Line |
|---|---|---|---|
| Rider name in a shared-IP group | `openProfile(riderId)` | 360° Profile — rider branch (`window.openProfile` L8827) | L5606 |
| Referrer / referee names | `openProfile(riderId)` | 360° Profile | L5617 |
| Driver / rider names in a pairing row | `openProfile(id)` | 360° Profile | L5634 |
| Collision member link | `openProfile(id)` | 360° Profile (rider **or** driver) | L16508 |
| `commitSuspendAccount` step 8 | `openProfile(entityId, true)` | 360° Profile — **forced navigation off this page** | L9094 |
| Ops-notification click-through | `openProfile(entityId)` | 360° Profile | L9092 |
| `commitSuspendAccount` side effects | `renderDriversTable()` / `renderRidersTable()` | Drivers / Riders modules | L9095–L9096 |
| Sidebar | `go('fraud',this)` | this page | L492 |

**No `go(...)` call originates from the Fraud page body.** Compare Predictive Signals, which links out to Compliance, Safety and Zones.

Inbound: `renderFraudPage()` from `go()` (L8813) and from the boot `setTimeout` (L14575); `renderIdentityCollisions()` from `go()` only (L8813).

---

## 13. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| GPS-anomaly card body text | L671 | **Entirely static prose — no computation.** Flagged in-product as simulated/not-implemented |
| Pairing threshold `>= 3` | L5629 | Hardcoded; not exposed in Settings |
| Shared-IP group threshold `> 1` | L5602 | Hardcoded |
| Collision threshold `> 1` | L16479 | Hardcoded |
| `'[erased]'` sentinel | L16464 (written at L16024–L16026) | Hardcoded string |
| Four `prefillNote` detected-reason strings | L5606, L5618, L5635, L5636 | Hardcoded copy |
| Five suspension reason options | L9069–L9073 | Hardcoded list; not editable in Settings (unlike `DB.reasonCodes` used by tickets) |
| Modal warning copy (driver and rider variants) | L9065 | Hardcoded |
| `DB.referralLog` — **one** seeded entry, `REF-seed-1` (`RDR-1041` → `RDR-1075`, bonuses 20/10, dated `18 Jul 09:30`) | L13888–L13890 | Seed data; the sole input to the referral signal and to KPI 2's denominator |
| `DB.riders` `lastIp` / `device` values | L2594–L2630 | Seed data; `160.156.4.90` is deliberately duplicated across `RDR-2087` and `RDR-2055` to make the shared-IP card non-empty |
| `DB.drivers` `email` / `phone` values | L2632–L2668 | Seed data, all unique — so the collision card is empty by construction |
| Seeded `DB.trips` (8 records) | L2671–L2683 | Seed data; too few for any pairing flag |
| Reconstructed trip history (randomised driver assignment) | L18668–L18773, boot step L21819 | **Generated data.** Every generated trip carries `reconstructed:true` and is rendered elsewhere with a provenance warning (L18799), but the pairing signal consumes it silently, with no such marker |
| Card border colour `#E0A0A0`, row border `#F2F1EE` | L653/L657/L661, L5605/L5617/L5634/L16505 | Hardcoded hex, not CSS variables |
| Page header + all five card captions | L651–L670 | Hardcoded English |

---

## 14. i18n keys

| Key | Element | Line(s) | Arabic value |
|---|---|---|---|
| `nav.fraud` | Sidebar label *Fraud & risk* | L492 (`data-i18n`), L7905 (`LANG_STRINGS.ar`) | `الاحتيال والمخاطر` |
| `sec.intelligence` | Sidebar section heading *Intelligence* | L490 (`data-i18n`), L7912 | `الذكاء` |

**Nothing inside the page body is translated.** No `data-i18n` attribute occurs anywhere in L649–L673, and no rendered string in `renderFraudPage()`, `renderIdentityCollisions()`, `openSuspendAccountModal()` or `commitSuspendAccount()` passes through a lookup. This follows the localization banner at L7897–L7902, which limits translation to the always-visible shell.

Non-i18n page-name strings: `titles.fraud = 'Fraud & Risk'` (L2168). **`subs.fraud` does not exist** (L2169), so the toolbar subtitle is blank on this page — every neighbouring page in the map has one.

---

## 15. Gaps, dead code, UNVERIFIED items

1. **No `PAGE_PERMISSIONS` entry for `fraud`.** The map (L10564–L10651) covers `subscriptions`, `coverage`, `compliance`, `safety`, `growth`, `zones`, `predictive`, `finance`, `wallets`, `plans`, `support`, `settings`, `audit-log` — but not `fraud`. Consequently `canPage('fraud', anything)` is always `false`, and `defaultPagePerms()` (L10658–L10669) never generates grants for it. Nothing on the page calls `requirePagePerm('fraud', …)`, so today this is inert; but the granular permission matrix in Settings offers no row for this page, and the only enforcement is the broad `approve_drivers` check inside `commitSuspendAccount` (L9083).
2. **`commitSuspendAccount` has no confirmation gate.** It writes `d.suspended`, cuts a driver out of dispatch, logs, notifies and navigates — on a single click of `🚫 Suspend`. It appears in neither `GATE_SPECS` (L18245–L18371) nor `GATE_SWEEP` (L20769–L20885), even though comparable operational actions are gated there (`precautionSuspend`, L20867–L20869, gates the Safety module's precautionary suspension with *"Their income stops from this moment"*). The modal is the only friction.
3. **The shared device/IP card does not use `device`.** Title, caption and all four detected-reason strings say *"device/IP"*, but the grouping key is `r.lastIp` alone (L5595–L5601). A shared device on two different networks is not detected here — only the referral rule (L5612) reads `device`.
4. **The referrer is never actionable.** In a self-abuse flag the referral bonus is paid to *both* sides (`DB.referralLog` records `referrerBonus` and `refereeBonus`, L13889), yet only the referee gets a `Suspend referee` button (L5618). There is no control to claw back the bonus, void the referral, or act on the referrer.
5. **`device` is a model string, not a fingerprint.** Values are of the form `'iPhone 15 · iOS 17.5'` (L2603, L2663). Two unrelated riders on the same phone model and OS version satisfy `a.device === b.device` and would be flagged as self-abuse. The seed data already contains such a pair across collections (`RDR-2031` and `DRV-0106`).
6. **The pairing rule has no baseline.** The caption promises *"far more than random chance would suggest"* (L666), but the implementation is an absolute count of `>= 3` (L5629) with no normalisation against either party's total trip volume. It is also asymmetric by construction: it iterates drivers and counts riders, so a rider's own trip total is never consulted.
7. **The pairing rule consumes reconstructed data without flagging it.** `historyBoot()` → `reconstructHistory()` (L18668+, boot step L21819) synthesises trips and assigns each to a pseudo-randomly chosen driver (`driverIds[Math.floor(seededRand(...)*driverIds.length)]`), pushing ids onto `DB.drivers[].trips` (L18761–L18763). Those trips are marked `reconstructed:true` and get an explicit provenance warning wherever a trip is rendered (L18799), but the Fraud page reads the counts silently. A "3+ shared trips" flag can therefore be an artefact of the seeded RNG rather than an observed pattern — and the module banner's claim that every signal is computed from *"real trip history"* (L5588) does not hold for this card.
8. **`renderIdentityCollisions()` is not called at boot** (L14575 calls only `renderFraudPage()`), so `#identity-collisions` is empty markup until the page is first navigated to. Harmless in practice because the div is only visible on this page.
9. **Suspending navigates away and never re-renders the page.** `commitSuspendAccount` calls `openProfile(entityId,true)` (L9094) and refreshes the Drivers/Riders tables (L9095–L9096) but not `renderFraudPage()`. Working through a list of flagged accounts therefore requires re-entering the page after every action.
10. **No reinstate control on this page.** `reinstateAccount()` (L9099–L9110) is wired only into the profile page (L4113). A mistakenly suspended account can only be reversed from elsewhere.
11. **No missing-subtitle handling.** `subs.fraud` is absent (L2169) so the toolbar subtitle renders as an empty string (L8787) — a cosmetic inconsistency with every neighbouring page.
12. **No `go(...)` cross-links out of the page**, so there is no path from a flag to the Safety, Support or Audit modules where a fraud case would normally be worked.
13. **Identity collisions never reach the KPI row or the sidebar badge.** `totalFlags` (L5639) sums only the three `renderFraudPage` signals; a cross-role collision — described in-product as the one that *"breaks dispatch"* — contributes nothing to either count.
14. **`DB.pendingDrivers` and `DB.teamUsers` are outside the collision audit** (L16468–L16477). A pending applicant reusing an existing driver's phone would not be detected, which is arguably the case the audit most needs to catch before onboarding.
15. **Helpers adjacent to this module that the fraud page does not use.** `priorTripsWithRider(driverId, riderId)` (L5647–L5649) computes exactly the pairing statistic this page needs, but `renderFraudPage` does not use it — the pairing block re-implements the count inline (L5628). `hasOpenComplaint()` (L5650–L5655) and `openComplaintFor()` (L5656–L5662) sit in the same block and are likewise not referenced by the fraud page. **None of the three is dead code, however:** `hasOpenComplaint` is called at L3530, L4288 and L5690; `priorTripsWithRider` at L5694; `openComplaintFor` at L5761 — all outside this module.
16. **UNVERIFIED — the runtime value of KPI 3 / the pairing card.** It depends on `reconstructHistory()`'s seeded RNG over the whole rider book and cannot be asserted without executing the page. The other four cards are deterministic from seed data and are documented above with their concrete outcomes.
17. **UNVERIFIED — CSS classes.** `b-red`, `b-amber`, `kpi`, `kpi-lbl`, `kpi-val`, `kpi-dl neu`, `btn sm danger`, `.g3`, `.csel*` are used but their stylesheet rules were not read; visual descriptions above are inferred from inline styles and class names only.

---

## 16. Line-number index

| Symbol / element | Lines |
|---|---|
| Sidebar section heading `Intelligence` | L490 |
| Sidebar item `fraud` + badge `#sbb-fraud` | L492 |
| Page block `#p-fraud` | L649–L673 |
| Page header (`h1` + strapline) | L651 |
| `#fraud-kpis` (`.g3`) | L652 |
| Card: Identity collisions / `#identity-collisions` | L653–L656 |
| Card: Shared device / IP / `#fraud-shared-list` | L657–L660 |
| Card: Referral self-abuse / `#fraud-referral-list` | L661–L664 |
| Card: Unusual driver-rider pairing / `#fraud-pairing-list` | L665–L668 |
| Card: GPS anomaly flags (static) | L669–L672 |
| `titles.fraud` (and `subs` map with no `fraud` key) | L2168 (L2169) |
| `DB.riders` seed (`lastIp`, `device`, `phone`; **no `email`**) | L2594–L2630 |
| `DB.drivers` seed (`email`, `phone`, `trips`, `lastIp`, `device`) | L2632–L2668 |
| `DB.trips` seed (8 records) | L2671–L2683 |
| `DB.teamUsers` seed (holds the only duplicate email in the file) | L2837+ |
| `requirePerm()` | L3126–L3132 |
| `logAction()` | L3133–L3150 |
| `nm2()` | L3565 |
| Profile page Suspend / Reinstate buttons | L4113 |
| `toast()` | L5269+ |
| `customSelectHTML()` | L5336–L5354 |
| Fraud module banner comment | L5586–L5591 |
| `renderFraudPage()` | L5592–L5646 |
| — shared-IP grouping | L5595–L5602 |
| — shared-IP rendering + empty state | L5603–L5607 |
| — referral rule | L5610–L5613 |
| — referral rendering + empty state | L5614–L5619 |
| — pairing tally (threshold comment L5622) | L5621–L5630 |
| — pairing rendering + empty state | L5631–L5637 |
| — `totalFlags` | L5639 |
| — KPI array + render | L5640–L5644 |
| — sidebar badge write | L5645 |
| `priorTripsWithRider()` (not used by this page; live callers at L5694) | L5647–L5649 |
| `hasOpenComplaint()` / `openComplaintFor()` (not used by this page; live callers at L3530/L4288/L5690 and L5761) | L5650–L5655 / L5656–L5662 |
| `LANG_STRINGS` (localization banner L7897–L7902) | L7903+ |
| `nav.fraud` / `sec.intelligence` Arabic strings | L7905 / L7912 |
| `window.go` + page dispatch (`fraud` at L8813) | L8774–L8826 |
| `window.openProfile` | L8827+ |
| Account-suspension banner comment | L9054–L9057 |
| `openSuspendAccountModal()` | L9058–L9078 |
| — reason `customSelectHTML` options | L9068–L9074 |
| — modal footer | L9076 |
| `quickSuspendFromFraud()` | L9079–L9081 |
| `commitSuspendAccount()` | L9082–L9098 |
| `reinstateAccount()` | L9099–L9110 |
| `fmtReqNowLabel()` | L9645 |
| `pushOpsNotification()` | L9661–L9666 |
| `PAGE_PERMISSIONS` (no `fraud` key) | L10564–L10651 |
| `defaultPagePerms()` | L10658–L10669 |
| `canPage()` | L10674–L10677 |
| `requirePagePerm()` | L10680–L10688 |
| `DB.referralLog` seed | L13888–L13890 |
| Boot `setTimeout` → `renderFraudPage()` | L14575 |
| GDPR erasure writing `'[erased]'` | L16024–L16026 |
| Identity-collision audit banner | L16455–L16460 |
| `identityCollisions()` | L16461–L16491 |
| — `add()` with `'[erased]'` guard | L16463–L16467 |
| — rider indexing | L16468–L16472 |
| — driver indexing | L16473–L16477 |
| — `collide()` + verdict ladder | L16478–L16489 |
| `renderIdentityCollisions()` | L16492–L16513 |
| — header paragraph with counts | L16498–L16502 |
| — row rendering | L16504–L16511 |
| — empty state | L16512 |
| `guardAction()` | L17819–L17840 |
| `GATE_SPECS` (no suspension entry) | L18245–L18371 |
| `reconstructHistory()` | L18668–L18773 |
| — pushes trip ids onto rider and driver | L18761–L18763 |
| — `reconstructed:true` marker | L18760, L18770 |
| Reconstructed-record provenance warning | L18799 |
| `historyBoot()` | L18824 |
| `GATE_SWEEP` (no suspension entry) | L20769–L20885 |
| `installGateSweep()` | L20898–L20902 |
| `bootModules()` — `history reconstruction` step | L21807–L21827 (step at L21819) |
