# Settings Tab: Alert Preferences (`notifications`)

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` | Pane `#stab-notifications` (L1907–L1926) | Tab button L1439 (`switchSettingsTab('notifications',this)`, label `Alert Preferences`) | Render fn `renderNotificationConfig()` L8003–L8007 | Commit fn `saveNotificationConfig()` L8008–L8017 | Data `DB.opsConfig.notifications` (seed L2571)

---

## 1. Purpose

Controls what the **ops team itself** is alerted about internally and how. The panel description (L1911) draws the boundary explicitly: *"What the ops team itself gets alerted about internally, and how — not the same as sending push notifications to riders/drivers (see the Push Notifications tab for that)."*

The tab sits under the `System` nav group (`stabgrp.system`, L1437) and its sidebar label is **`Alert Preferences`** (L1439) even though its key, pane id, DB path and audit `entityId` all use `notifications`.

Three of the four settings are self-labelled with a live/tracked badge in the UI itself.

---

## 2. Layout map

Two `.card`s:

| Card | Element | Line |
|------|---------|------|
| 1 | Panel head 🔔 + title `Alert preferences` + description | L1908–L1912 |
| 1 | Body `display:flex;flex-direction:column;gap:12px` | L1913 |
| 1 | Checkbox — email alerts | L1914 |
| 1 | Checkbox — SMS alerts | L1915 |
| 1 | Checkbox — dispute notifications | L1916 |
| 1 | Number field — low-rating threshold | L1917 |
| 1 | Explanatory note under the threshold | L1918 |
| 1 | `Save alert preferences` button | L1919 |
| 1 | `.settings-meta#meta-notifications` | L1921 |
| 2 | `Planned` card with `Coming soon` chip | L1923–L1925 |

---

## 3. Settings fields — EVERY field

All persist to `DB.opsConfig.notifications` (seed L2571: `{emailAlerts:true, smsAlerts:false, lowRatingThreshold:2.5, notifyOnDispute:true}`).

| # | id | Label (verbatim) | Control | Default | Unit | Range | Validation | Persisted to | Status badge in UI | Affects |
|---|----|------------------|---------|---------|------|-------|------------|--------------|--------------------|---------|
| 1 | `cfg-notif-email` | `Email alerts for high-priority events` (L1914) | checkbox, `width:15px;height:15px` | `true` | — | on/off | none (`chk()` L8035 returns `el.checked`) | `DB.opsConfig.notifications.emailAlerts` | `<span class="b b-green">Live — gates the low-rating alert below</span>` | **Live.** Gates the entire low-rating branch at L12452 — both the in-app ops notification **and** the automatic driver check-in email. See §7.1. |
| 2 | `cfg-notif-sms` | `SMS alerts for critical incidents (SOS, safety)` (L1915) | checkbox | `false` | — | on/off | none | `DB.opsConfig.notifications.smsAlerts` | `<span class="b b-grey">Tracked — no SMS gateway wired up yet</span>` | **Nothing.** No reader anywhere. |
| 3 | `cfg-notif-dispute` | `Notify on every new dispute filed` (L1916) | checkbox | `true` | — | on/off | none | `DB.opsConfig.notifications.notifyOnDispute` | `<span class="b b-grey">Tracked — this file has no live dispute-filing flow to hook into</span>` | **Nothing.** No reader anywhere. |
| 4 | `cfg-notif-rating` | `Low-rating alert threshold (★)` (L1917) | `input type="number"` `min="1" max="5" step="0.1"` | `2.5` | ★ (stars) | HTML `1`–`5`; JS clamps to the same | **Clamped on save** (L8013): `Math.min(5, Math.max(1, parseFloat(val('cfg-notif-rating')) \|\| 2.5))` — a blank/NaN input falls back to `2.5`, then values <1 become 1 and >5 become 5 | `DB.opsConfig.notifications.lowRatingThreshold` | `<span class="b b-green">Live</span>` | **Live.** Read by `lowRatingThreshold()` (L15243), `isLowRating()` (L15247) and the trip-completion hook (L12452). See §8. |

**Threshold note rendered below the field (L1918, verbatim):** *"When a completed trip's driver rating is at or below this threshold, the ops team gets an in-app alert and the driver gets a check-in email automatically."*

### Load behaviour — `renderNotificationConfig()` (L8003–L8007)
```
n = DB.opsConfig.notifications || {}
#cfg-notif-email   .checked = !!n.emailAlerts
#cfg-notif-sms     .checked = !!n.smsAlerts
#cfg-notif-dispute .checked = !!n.notifyOnDispute
#cfg-notif-rating  .value   = (n.lowRatingThreshold != null) ? n.lowRatingThreshold : 2.5
```
Each assignment is individually null-guarded on the element (`if(e)…`).

---

## 4. Tables & lists

**None.** No `table` in this pane.

---

## 5. Actions

| Label | Line | Handler | Real effect | Writes to | Permission | Audit | Confirms? |
|-------|------|---------|-------------|-----------|-----------|-------|-----------|
| `Save alert preferences` | L1919 | `saveNotificationConfig()` L8008–L8017 | Snapshots `before`; reads the 3 checkboxes + clamps the threshold; `logAction`; `renderSettingsMeta()`; toast `✅ Notification settings saved` | `DB.opsConfig.notifications` (4 keys) | `requirePerm('manage_settings')` L8009 | **yes** — `logAction('config_updated','settings','notifications','Notification settings updated', before, n)` L8014 | **yes** — `GATE_SWEEP.saveNotificationConfig` L20783 |

The three checkboxes and the number input have **no** `onchange` handler — nothing is applied until Save is pressed.

---

## 6. Modals opened

**None.**

---

## 7. Rules / policy logic — written out exactly

### 7.1 The one live rule — low-rating alert (L12451–L12455)
Inside the trip-completion path, after `simulateRatingGiven()` produces the rating the **rider gave the driver**:
```
lowRatingCfg = DB.opsConfig && DB.opsConfig.notifications;
if (lowRatingCfg && lowRatingCfg.emailAlerts !== false
    && driverRating <= (lowRatingCfg.lowRatingThreshold || 2.5)) {

    pushOpsNotification('warn',
      'Low rating — ' + nm2(t.driver),
      nm2(t.rider) + ' rated this trip ' + driverRating + '★ (at or below the '
        + (lowRatingCfg.lowRatingThreshold || 2.5) + '★ alert threshold)',
      function(){ openProfile(t.driver); });

    sendSystemEmail(t.driver,
      'A recent trip rating needs your attention',
      'Hi ' + nm2(t.driver) + ',\n\nA rider rated a recent trip ' + driverRating
        + ' out of 5 stars. If something went wrong, our support team is here to help — '
        + 'reply to this email or open a ticket.\n\nEyvar',
      'transactional');
}
```
Exactly two consequences, both gated by the **same** `emailAlerts` flag:
1. An in-app ops notification of severity `warn`, clickable through to the driver's profile.
2. A `transactional`-category system email to the **driver** (not to the ops team) — text hardcoded above, visible afterwards in the Email Log tab.

Comparison is `<=` — a rating *equal* to the threshold triggers the alert. Note the gate uses `emailAlerts !== false`, so an `undefined` flag counts as enabled.

### 7.2 Threshold helpers (L15243–L15247)
```
function lowRatingThreshold(){
  var n = <DB.opsConfig.notifications>;
  return (n && n.lowRatingThreshold) || 2.5;
}
function isLowRating(r){ return typeof r === 'number' && r > 0 && r <= lowRatingThreshold(); }
```
`isLowRating` additionally excludes `0` (an unrated trip), so a 0-rating is never "low".

**Fallback bug:** `(n && n.lowRatingThreshold) || 2.5` uses `||`, not `!= null`. A saved threshold of `0` would fall back to `2.5` — unreachable here because the save clamps to a minimum of 1, but the two code paths use inconsistent null-handling (`renderNotificationConfig` correctly uses `!= null`).

### 7.3 Meta footer
`renderSettingsMeta()` (L7341) maps `'meta-notifications' → 'notifications'`; `settingsLastUpdated('notifications')` (L7336) renders `Last updated by <actor> · <ts>` from the most recent `settings/notifications` audit entry, else `No changes recorded yet`.

### 7.4 The "Planned" card (L1923–L1925)
Static, no controls. Title `Planned` + `<span class="settings-soon">Coming soon</span>` (CSS L242). Description verbatim: *"Per-user notification channels (Slack/Teams webhook), digest scheduling (real-time vs. hourly summary), and per-role notification routing."*

---

## 8. Cross-module effects

| Setting | Consumer | Line | Effect |
|---------|----------|------|--------|
| `notifications.emailAlerts` | trip-completion hook | L12452 | Master gate for the entire low-rating branch (ops notification + driver email) |
| `notifications.lowRatingThreshold` | trip-completion hook | L12452–L12453 | Comparison value; also interpolated into the notification body text |
| `notifications.lowRatingThreshold` | `lowRatingThreshold()` → All Trips page KPI row | L3416 | KPI tile `⚠ Low ratings` with sub-label `at or below <n>★`; count from `lowRatedTripIds()` |
| `notifications.lowRatingThreshold` | All Trips empty state | L3438 | `No low-rated trips — nothing at or below <n>★.` |
| `notifications.lowRatingThreshold` | `isLowRating()` → rating cell renderer | L15247, L15253 | Red/bold rating text with tooltip `Below the <n>★ alert threshold` |
| `notifications.lowRatingThreshold` | trip detail banner | L15282 | `⚠ Low rating — <r>★ · at or below the <n>★ alert threshold.` |
| `notifications.emailAlerts` → `sendSystemEmail(..., 'transactional')` | Email Log tab (`#stab-emails`, L1845; `renderEmailOutbox()`) | L12454 | The generated driver email appears in the outbox |
| `notifications.smsAlerts` | — | — | **No consumer.** |
| `notifications.notifyOnDispute` | — | — | **No consumer.** |
| audit entry `settings/notifications` | Activity tab; `#meta-notifications` | L7336 | Last-updated line |
| `renderNotificationConfig()` | `go('settings')` | L8819 | Rendered on every entry to Settings |

**Boundary with Push Notifications:** the separate `push` tab (`#stab-push`, L1929) targets riders/drivers and has its own outbox (`renderPushOutbox()` L7745). Nothing in this pane feeds it.

---

## 9. Hardcoded / mock / demo values

- **Seed defaults** (L2571): `emailAlerts:true`, `smsAlerts:false`, `lowRatingThreshold:2.5`, `notifyOnDispute:true`.
- **`2.5` appears as a hardcoded fallback five separate times, on five lines**: `renderNotificationConfig` (L8006), `saveNotificationConfig` (L8013 — the `parseFloat` fallback; the clamp bounds on that line are `5` and `1`, not `2.5`), the trip hook (L12452 and L12453), and `lowRatingThreshold()` (L15245).
- **Min 1 / max 5** clamp is hardcoded in both the HTML attributes (L1917) and the JS (L8013).
- **The driver check-in email subject and body are hardcoded English strings** (L12454), with the driver's name interpolated. There is no template editor.
- **The two `Tracked` badges are honest hardcoded admissions** — *"no SMS gateway wired up yet"* (L1915) and *"this file has no live dispute-filing flow to hook into"* (L1916).
- The `Planned` card copy (L1924) is hardcoded aspiration, not configuration.
- Rating values themselves come from `simulateRatingGiven()` (L12443) — i.e. the low-rating alert fires off **simulated** ratings in this demo.

---

## 10. i18n keys

| Key | Element | Line | Arabic at |
|-----|---------|------|-----------|
| `stab.notifications` | tab button label `Alert Preferences` | L1439 | L7919 (`'تفضيلات التنبيه'`) |
| `stabgrp.system` | nav group heading `System` | L1437 | L7916 |

**Nothing inside the pane is internationalised** — the panel title, description, all four field labels, both status badges, the threshold note, the Save button and the entire Planned card are hardcoded English with no `data-i18n`. Contrast the Security tab (`15e`), which *is* fully keyed.

---

## 11. Gaps, dead code, UNVERIFIED items

1. **Two of four settings are inert and say so.** `smsAlerts` and `notifyOnDispute` have no reader; the UI labels them `Tracked` (L1915–L1916). They are stored and audit-logged but change nothing.
2. **One flag gates two unrelated channels.** `emailAlerts` — labelled *"Email alerts for high-priority events"* — also gates the **in-app** `pushOpsNotification` call (L12453). Turning off email silently turns off the in-app low-rating alert too. The badge text acknowledges this obliquely (*"gates the low-rating alert below"*) but the field label does not.
3. **The email generated by this rule goes to the driver, not to the ops team**, despite the pane being scoped to *"what the ops team itself gets alerted about"* (L1911).
4. **Only one event type is covered.** Despite "high-priority events" and "critical incidents (SOS, safety)" in the labels, the **only** wired trigger anywhere is a low driver rating on trip completion. SOS/safety incidents, disputes and every other event produce no alert from this configuration.
5. **Inconsistent null handling for the threshold.** `renderNotificationConfig` uses `!= null` (L8006) while `lowRatingThreshold()` uses `||` (L15245) — a stored `0` would behave differently between them.
6. **No per-user or per-role routing.** Alerts are global; the Planned card (L1924) confirms per-user channels and per-role routing don't exist.
7. **No digest/throttle.** Every qualifying trip completion fires an immediate notification + email; there is no rate limit, dedupe, or hourly summary.
8. **No `.settings-meta` on the Planned card**, and no way to dismiss/hide it.
9. **`renderNotificationConfig()` is called only from `go('settings')`** (L8819) — the boot sequence itself does not initialise these inputs, so before the Settings page is first opened the DOM values are empty while `DB` holds the seed.
10. **UNVERIFIED — `pushOpsNotification` and `sendSystemEmail` internals.** Both are invoked at L12453/L12454 but their implementations were not read in this pass; the claim that the ops notification is in-app and clickable rests on the call signature (`'warn', title, body, clickHandler`) and the email's `'transactional'` category argument.
11. **UNVERIFIED — real email/SMS delivery.** No backend exists; `sendSystemEmail` writes to the in-file Email Log only.

---

## 12. Line-number index

| Item | Line(s) |
|------|---------|
| Nav group `System` heading | L1437 |
| Tab button (`Alert Preferences`) | L1439 |
| Pane `#stab-notifications` | L1907–L1926 |
| Panel head / title / description | L1908–L1912 |
| `#cfg-notif-email` + Live badge | L1914 |
| `#cfg-notif-sms` + Tracked badge | L1915 |
| `#cfg-notif-dispute` + Tracked badge | L1916 |
| `#cfg-notif-rating` + Live badge | L1917 |
| Threshold explanatory note | L1918 |
| `Save alert preferences` button | L1919 |
| `.settings-meta#meta-notifications` | L1921 |
| `Planned / Coming soon` card | L1923–L1925 |
| `.settings-soon` CSS | L242 |
| `DB.opsConfig.notifications` seed | L2571 |
| `requirePerm()` | L3126–L3133 |
| All Trips KPI using the threshold | L3416 |
| All Trips empty state using the threshold | L3438 |
| `settingsLastUpdated()` | L7336–L7339 |
| `renderSettingsMeta()` map | L7341 |
| `renderNotificationConfig()` | L8003–L8007 |
| `saveNotificationConfig()` | L8008–L8017 |
| `val()` / `chk()` helpers | L8034–L8035 |
| `go('settings')` render entry | L8819 |
| Low-rating alert enforcement | L12451–L12455 |
| `lowRatingThreshold()` | L15243–L15246 |
| `isLowRating()` | L15247 |
| Rating cell renderer using `isLowRating` | L15253 |
| Trip detail low-rating banner | L15282 |
