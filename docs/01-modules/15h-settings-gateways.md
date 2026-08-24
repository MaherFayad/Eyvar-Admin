# Settings Tab: Payment Gateways

> Source file `eyvar_ops_panel_v40_fixed.html` | Page `settings` (`div#p-settings`, L1416) | Pane `#stab-gateways` **L1651–1665** | Tab button **L1427** (`data-tab="gateways"`, icon 💳, `data-i18n="stab.gateways"`) | Render fn `renderPaymentGateways()` **L7461–7474**

---

## 1. Purpose

Lists the payment methods the platform accepts, with live transaction counts and volume computed from the Finance payment records, plus enable/disable and default-gateway controls.

Panel copy (L1655): *"Transaction counts and volume below are computed live from the Finance payment records — not fabricated. Turning a gateway off stops new charges through it; the current default can't be turned off directly, set a different default first."*

**Half of that is true, half is not.** The counts/volume genuinely derive from `DB.payments` (§4). The claim that "turning a gateway off stops new charges" is **not implemented** — no charge path reads `gw.enabled` or `gw.isDefault`. See §9. There is **no real integration** of any kind: no API keys, no credentials, no endpoints, no webhooks, no tokenisation. The tab is a registry plus a live report.

## 2. Layout map

| Region | Lines | Contents |
|---|---|---|
| Card wrapper | L1652 | single `.card` |
| Panel head | L1653–1656 | icon 💳, title "Payment gateways", description |
| Table | L1657 | `table.dt`, inline `thead`, `tbody#gateways-tbody` |
| Add-gateway strip | L1658–1662 | name input, type select, Add button (background `var(--bg2)`) |
| Meta line | L1663 | `div.settings-meta#meta-gateways` |

## 3. Settings fields — every field

### 3a. Composer inputs (the only form fields on the tab)

| id | Label | Control | Default | Unit | Options / Range | Validation | Persisted to | Affects |
|---|---|---|---|---|---|---|---|---|
| `new-gateway-name` (L1659) | "New gateway name" | `input[type=text]`, placeholder "e.g. PayPal", `max-width:200px` | empty | — | free text | `addCustomGateway()` (L7498): `if(!name){toast('⚠ Give the gateway a name first','warn');return;}` — **no duplicate check, no length limit, no character sanitisation** | `DB.paymentGateways[].name` **and** `.matchPrefix` (both set to the same string, L7501) | The name doubles as the payment-method matching prefix, so it silently controls which `DB.payments` rows count toward this gateway's stats |
| `new-gateway-type` (L1660) | "Type" | `select`, `max-width:140px` | `Card` (first option) | — | **Exactly 4 options, in order: `Card`, `Wallet`, `Bank`, `BNPL`** (L1660) — plain `<option>` elements with no `value` attribute, so the value equals the label | falls back to `'Card'` if empty (`val('new-gateway-type')||'Card'`, L7500) | `DB.paymentGateways[].type` | Renders as a grey badge in the Type column (L7467). No behavioural effect anywhere |

### 3b. Per-gateway record fields (`DB.paymentGateways` element shape, L13913–13920)

| Field | Type | Set by | Read by | Effect |
|---|---|---|---|---|
| `id` | string | seed / `'custom_'+Date.now()` (L7500) | `toggleGatewayEnabled`, `setDefaultGateway`, `removeGateway` lookups (L7477, 7488, 7490, 7509) | identity only |
| `name` | string | seed / composer | render L7466, toasts, audit summaries | display |
| `type` | string | seed / composer | render L7467 (badge) | **display only** |
| `matchPrefix` | string | seed / `= name` for custom (L7501) | `gatewayStats()` L7457 — `p.method.indexOf(gw.matchPrefix)===0` | drives the Transactions/Volume columns |
| `enabled` | boolean | seed / `toggleGatewayEnabled` L7481 | render L7470; `setDefaultGateway` guard L7489 | **no external consumer** — see §9 |
| `isDefault` | boolean | seed / `setDefaultGateway` L7490 | render L7466 badge + L7471 column; `toggleGatewayEnabled` guard L7479 | **no external consumer** — see §9 |
| `custom` | boolean | `false` on all 6 seeds / `true` on added | render L7472 (Remove button visibility) | UI-only |

### 3c. Per-gateway UI controls

| Control | Column | Line | Type | Default | Handler |
|---|---|---|---|---|---|
| Enabled toggle | "Enabled" | L7470 | `input[type=checkbox].tog` | `gw.enabled` | `toggleGatewayEnabled(gw.id, this)` |
| "Set default" button | "Default" | L7471 | `button.btn.sm` — replaced by static text `Current default` when `gw.isDefault` | — | `setDefaultGateway(gw.id)` |
| "Remove" button | actions | L7472 | `button.btn.sm.danger` — rendered only when `gw.custom` | — | `removeGateway(gw.id)` |

**There are no credential fields of any kind.** No API key, secret, merchant ID, webhook URL, environment (test/live), currency restriction, or fee/MDR field exists on the record or in the UI. The confirmation copy at L20829 states this explicitly: *"Credentials are handled outside this panel."*

## 4. Tables & lists

### Gateways table (`#gateways-tbody`, L1657; rendered L7461–7474)

**Columns, in order** (thead L1657): `Gateway` · `Type` · `Transactions` · `Volume` · `Enabled` · `Default` · *(unlabelled actions column)*

- **Row source**: `(DB.paymentGateways||[]).map(...)` — **unsorted**, seed-array order, custom gateways appended at the end (L7464).
- **Gateway cell** (L7466): `gw.name` + `<span class="b b-blue">Default</span>` when `gw.isDefault`.
- **Type cell** (L7467): `<span class="b b-grey">gw.type</span>`.
- **Transactions / Volume** (L7468–7469): from `gatewayStats(gw)` (L7456–7460):
  ```js
  var list=Object.values(DB.payments||{}).filter(p => p.method && p.method.indexOf(gw.matchPrefix)===0);
  var volume=list.reduce((s,p)=> s+(parseFloat(p.amount)||0), 0);
  return {count:list.length, volume:volume};
  ```
  Volume is rendered `st.volume.toFixed(2)+' SAR'` with `font-weight:500`. `parseFloat` tolerates the `'86.50 SAR'` string format used throughout `DB.payments` (L2695+).
- **Empty state**: **none** (L7464/L7474). An empty `DB.paymentGateways` renders a header with a blank body.

**Add flow**: type a name → pick a type → `+ Add gateway`. New gateways are always created `enabled:false, isDefault:false, custom:true` (L7501).
**Edit flow**: none. Name, type and `matchPrefix` cannot be edited after creation.
**Delete flow**: `removeGateway(id)` (L7507–7513) — custom gateways only, **no confirmation**, and **no guard against deleting the current default** (see §13).

## 5. Actions

| Label | Handler | Effect | Writes to | Permission | Audit | Confirms? |
|---|---|---|---|---|---|---|
| **Enabled toggle** | `toggleGatewayEnabled(id, cb)` L7475–7485 | Sets `gw.enabled=cb.checked`; re-renders table + meta; toast `✅ <name> enabled — riders can now pay with it` / `⚠ <name> disabled — riders can no longer pay with it` (both use severity `'ok'`, L7484). **Refuses** to disable the current default: `if(gw.isDefault&&!cb.checked){cb.checked=true; toast('⚠ Set a different default gateway first before turning this one off','warn'); return;}` (L7479) | `DB.paymentGateways[i].enabled` | `requirePerm('manage_settings')` L7476 — on denial reverts the checkbox (`cb.checked=!cb.checked`) | `logAction('config_updated','settings','gateways','Enabled\|Disabled payment gateway: <name>',{enabled:before},{enabled:after})` L7482 | **No** — not in `GATE_SWEEP`, fires on a single click |
| **Set default** | `setDefaultGateway(id)` L7486–7494 | Guard: `if(!gw||!gw.enabled){toast('⚠ Enable this gateway first','warn');return;}` (L7489). Then `forEach(g => g.isDefault = (g.id===id))` — exclusive, single-default invariant enforced by construction (L7490). Re-renders; toast `✅ <name> is now the default gateway` | `DB.paymentGateways[*].isDefault` | `requirePerm('manage_settings')` L7487 | `logAction('config_updated','settings','gateways','<name> set as default payment gateway',{},{defaultGateway:id})` L7491 | **Yes** — `GATE_SWEEP.setDefaultGateway` (L20830–20832): title "Change the default payment gateway", `danger:true`, `irr:false`, summary "All new charges route through the gateway you select.", consequences `['In-flight charges continue on the old gateway.','Settlement reconciliation must be checked on both for the changeover day.']`, button "Make default" |
| **+ Add gateway** (L1661) | `addCustomGateway()` L7495–7506 | Validates name; pushes `{id:'custom_'+Date.now(), name, type, matchPrefix:name, enabled:false, isDefault:false, custom:true}`; clears the name input (**not** the type select, L7503); re-renders; toast `✅ <name> added — currently off until you enable it` | `DB.paymentGateways` | `requirePerm('manage_settings')` L7496 | `logAction('config_updated','settings','gateways','Added payment gateway: <name>',{},{id,name})` L7502 | **Yes** — `GATE_SWEEP.addCustomGateway` (L20828–20829): title "Add a payment gateway", `danger:true`, consequences `['Money will route through it once it is made default.','Credentials are handled outside this panel.']`, button "Add gateway" |
| **Remove** | `removeGateway(id)` L7507–7513 | `DB.paymentGateways = filter(g => g.id!==id)`; re-renders; toast `Gateway removed` (info) | `DB.paymentGateways` | `requirePerm('manage_settings')` L7508 | `logAction('config_updated','settings','gateways','Removed payment gateway',{},{})` L7510 — **does not record which gateway** | **No confirmation** |

## 6. Modals opened

**No bespoke modals.** The only dialogs are the generic `confirmAction()` gates injected by `guardAction()` (L17819–17840) for `addCustomGateway` and `setDefaultGateway`, built from the `GATE_SWEEP` specs quoted in §5. Their shape is `{title, danger, irreversible, summary, consequences[], confirmLabel}` (L20762–20764), and confirming re-invokes the original function through the `__guardToken` bypass (L17832–17836).

## 7. Rules / policy logic — written out exactly

1. **Single default invariant** — `setDefaultGateway` reassigns `isDefault` across the whole array in one pass (L7490), so exactly one gateway can hold it. No code path can create two defaults.
2. **Default must be enabled** — `if(!gw||!gw.enabled)` blocks promotion of a disabled gateway (L7489).
3. **Default cannot be disabled** — `if(gw.isDefault&&!cb.checked)` reverts the toggle (L7479). Together with rule 2 this guarantees the default is always an enabled gateway *for as long as the default exists*.
4. **New gateways start off** — `enabled:false, isDefault:false` (L7501).
5. **Stats matching** — a payment belongs to a gateway iff `payment.method.indexOf(gw.matchPrefix)===0`, i.e. **prefix match at position 0**, case-sensitive (L7457). `'Mada ···2210'` matches prefix `'Mada'`; `'Visa ···7766'` matches `'Visa'`.
6. **Volume includes every status** — `gatewayStats` does not filter on `p.status`, so `'Refunded'` payments (PAY-5988, PAY-5977) and `'Pending'` payouts (PAY-W640) are counted as volume. There is no directional sign: an outbound driver payout adds to "volume" exactly like an inbound charge.

## 8. Full enumeration — every gateway

### 8a. Seeded gateways — `DB.paymentGateways`, L13913–13920 (6 rows)

| # | id | name | type | matchPrefix | enabled | isDefault | custom |
|---|---|---|---|---|---|---|---|
| 1 | `mada` | Mada | Card | `Mada` | ✅ true | ✅ **true** | false |
| 2 | `visa` | Visa / Mastercard | Card | `Visa` | ✅ true | false | false |
| 3 | `apple_pay` | Apple Pay | Wallet | `Apple Pay` | ✅ true | false | false |
| 4 | `bank_transfer` | Bank transfer | Bank | `Bank transfer` | ✅ true | false | false |
| 5 | `stc_pay` | STC Pay | Wallet | `STC Pay` | ❌ false | false | false |
| 6 | `tabby` | Tabby (Buy now, pay later) | BNPL | `Tabby` | ❌ false | false | false |

### 8b. Computed stats against the seeded `DB.payments` (L2694–2706, 10 records)

| Gateway | Matching payments | Transactions | Volume |
|---|---|---|---|
| **Mada** | PAY-5491 (412.00, Mada ···2210, Paid) · PAY-5475 (29.40, Mada ···5540, Paid) · PAY-6008 (38.00, Mada ···2210, Paid) · PAY-5977 (122.50, Mada ···5540, **Refunded**) · PAY-6010 (15.75, Mada ···9013, Paid) | **5** | **617.65 SAR** |
| **Visa / Mastercard** | PAY-5510 (86.50, Visa ···4821, Paid) · PAY-6001 (24.50, Visa ···7766, Paid) · PAY-5988 (86.50, Visa ···7766, **Refunded**) | **3** | **197.50 SAR** |
| **Apple Pay** | PAY-5480 (41.22, Apple Pay, Paid) | **1** | **41.22 SAR** |
| **Bank transfer** | PAY-W640 (640 SAR, Bank transfer, **Pending**, type `Driver payout`) | **1** | **640.00 SAR** |
| **STC Pay** | — | **0** | **0.00 SAR** |
| **Tabby (BNPL)** | — | **0** | **0.00 SAR** |

These are the values on first load; the numbers move as the ride engine appends payments at runtime.

### 8c. Credentials handling

**None.** There is no credential storage, entry, masking, rotation, or reference in this file. `grep` for gateway-related terms across all 21857 lines produces only: the tab/pane markup (L1427, 1655, 1657, 1661), the render/mutate functions (L7456–7513), the seed array (L13913–13920), the permission label (L3257), the Arabic tab string (L7918), the two confirm specs (L20828–20832), an unrelated ledger account `'cash.gateway'` (L19866, 19972, 20041, 20133–20136), an unrelated SMS-gateway "Tracked" badge on the Notifications tab (L1915), and a placeholder ticket title (L16101).

### 8d. Real integration?

**No.** Display-and-registry only. Specifically:
- No `fetch`, `XMLHttpRequest`, SDK include, or redirect targeting any PSP.
- The double-entry ledger account `'cash.gateway'` (`{label:'Cash at payment gateway', type:'asset'}`, L19866) is posted to by `DB.paymentGateways`-independent code (L19972, L20041, L20133–20136) — it is a *single* aggregate account and has no link to which gateway row is enabled or default.
- Enabling/disabling and setting the default change nothing outside this tab (§9).

## 9. Consumption check

| Setting | Read by | Dead? |
|---|---|---|
| `gw.enabled` | `renderPaymentGateways()` L7470 (toggle state); `setDefaultGateway()` L7489 (promotion guard) | **DEAD outside Settings.** No charge, checkout, refund, payout, invoice or ledger path reads it. The panel's own claim "Turning a gateway off stops new charges through it" (L1655) and the toast "riders can no longer pay with it" (L7484) are **not backed by any code** |
| `gw.isDefault` | `renderPaymentGateways()` L7466/L7471 (badge + column); `toggleGatewayEnabled()` L7479 (disable guard); `setDefaultGateway()` L7490 | **DEAD outside Settings.** Nothing routes a charge by default gateway. The `setDefaultGateway` confirm claims "All new charges route through the gateway you select" (L20831) — untrue in this build |
| `gw.matchPrefix` | `gatewayStats()` L7457 | **Live** (report only) |
| `gw.type` | `renderPaymentGateways()` L7467 badge | **DEAD** — pure decoration; `Card`/`Wallet`/`Bank`/`BNPL` drive no logic |
| `gw.name` | render L7466, toasts L7484/7493/7504, audit summaries L7482/7491/7502, and as `matchPrefix` for custom rows L7501 | Live |
| `gw.custom` | render L7472 | UI-only |
| `gw.id` | lookups L7477/7488/7490/7509 | Live |
| `DB.payments[].method` | `gatewayStats()` L7457 — the **only** consumer of the method string for aggregation purposes | Live |

**Summary finding:** every write on this tab is display-only. The tab reports real money accurately and controls nothing.

## 10. Cross-module effects

1. **Finance page / `DB.payments`** — read-only dependency in one direction: gateway stats read `DB.payments`; nothing writes back. Adding, enabling or disabling a gateway does not change any Finance figure.
2. **Ledger (`cash.gateway`)** — L19866 defines the asset account; L19972 credits it on refund, L20041 debits it on a charge, L20133–20136 snapshot its balance before/after. Entirely independent of `DB.paymentGateways`.
3. **Permissions** — `manage_settings` label (L3257) names "payment gateways" as one of the things it governs. All four mutators call `requirePerm('manage_settings')`.
4. **Audit log** — all four mutators write `logAction('config_updated','settings','gateways',…)`, and `renderSettingsMeta()` (L7341–7344) maps `meta-gateways` → entity `'gateways'` to show "Last updated by … · …".
5. **Settings nav regrouping** — `SETTINGS_GROUPS` (L21272) places `gateways` in the **"Money"** group (`['pricing','ledger','gateways','integrity']`), not the "Operations" group the static HTML puts it in (L1425/L1427).
6. **Boot** — `renderPaymentGateways()` is called once, from the settings page render fan-out at L8819.

## 11. Hardcoded / mock / demo values

| Item | Line | Note |
|---|---|---|
| The six seeded gateways and their enabled/default states | L13913–13920 | Mada default + STC Pay and Tabby pre-disabled is demo staging, not configuration derived from anything |
| `matchPrefix` string-prefix matching | L7457 | A production system would key on a gateway id on the payment record, not a prefix of a human-readable label. A custom gateway named "Visa Checkout" would silently steal every `Visa ···` payment from the built-in Visa row, because both prefixes match at index 0 |
| Type option list `Card / Wallet / Bank / BNPL` | L1660 | Fixed literal list, no `value` attributes |
| Placeholder "e.g. PayPal" | L1659 | Suggests an integration that does not exist |
| Volume counts refunded and pending records, and mixes an outbound driver payout (PAY-W640, 640 SAR) into "Volume" | L7458 / L2705 | Bank transfer's 640 SAR "volume" is money leaving the platform, displayed identically to inbound charges |
| `'cash.gateway'` ledger account label "Cash at payment gateway" | L19866 | Single aggregate account, not per-gateway |

## 12. i18n keys

| Key | Element | EN | AR |
|---|---|---|---|
| `stab.gateways` | tab button label, L1427 | "Payment Gateways" | `بوابات الدفع` (L7918) |
| `stabgrp.operations` | static group header, L1425 | "Operations" | `العمليات` (L7913) — removed at boot by `reorderSettingsTabs()` (L21285) |
| `stabgrp.money` | runtime group header for this tab | "Money" | `المال` (L7914) |

**No `data-i18n` attribute exists anywhere inside `#stab-gateways` (L1651–1665).** Panel title, description, all seven column headers, both field labels, the four type options and the Add button are English-only literals. Every toast and audit string built in `renderPaymentGateways`/`toggleGatewayEnabled`/`setDefaultGateway`/`addCustomGateway`/`removeGateway` is likewise hardcoded English.

## 13. Gaps, dead code, UNVERIFIED items

1. **`enabled` and `isDefault` are write-only** (§9). This is the headline finding: the two controls the tab exists for have no enforcement point.
2. **`removeGateway` can delete the current default**, leaving the platform with zero defaults. `removeGateway` (L7507–7513) has no `isDefault` guard, unlike `toggleGatewayEnabled` (L7479). It is also un-confirmed and its audit entry (L7510) records neither the id nor the name of what was removed.
3. **No duplicate-name check** in `addCustomGateway` (contrast `addCity` L7880). Two gateways named "Mada" would double-count every Mada payment.
4. **`matchPrefix` collision risk** — because `matchPrefix = name` for custom gateways (L7501), any custom name that is a prefix of, or shares a prefix with, an existing method string silently reassigns transactions.
5. **Type select is not cleared** after adding (L7503 clears only `new-gateway-name`), so consecutive adds inherit the previous type.
6. **No empty state** on the table (L7464/L7474).
7. **`toggleGatewayEnabled` is un-gated** while the strictly-less-consequential `addCustomGateway` is `danger:true` gated — inconsistent risk weighting.
8. **Disable toast uses severity `'ok'`** for both directions (L7484), so turning a gateway off renders as a success toast despite the ⚠ glyph.
9. **`config_updated` is not in `ACTION_LABELS`** (L2898–2910) — gateway audit entries have no friendly label in the Activity-log action filter (L9238).
10. **Confirm-dialog copy is misleading**: `setDefaultGateway` promises charge routing and settlement-reconciliation consequences (L20831–20832) that do not occur; `addCustomGateway` promises "Money will route through it once it is made default" (L20829) which is likewise unimplemented.
11. **No fee/MDR, currency, or country restriction fields**, so gateway choice cannot affect pricing even in principle.
12. **UNVERIFIED** — whether the panel is intended to be backed by a server that reads `DB.paymentGateways`. Within this single file, nothing does.

## 14. Line-number index

| What | Lines |
|---|---|
| Tab button | 1427 |
| Pane `#stab-gateways` | 1651–1665 |
| Panel head / description | 1653–1656 |
| Table + `tbody#gateways-tbody` | 1657 |
| Add-gateway strip | 1658–1662 |
| `#new-gateway-name` | 1659 |
| `#new-gateway-type` (4 options) | 1660 |
| "+ Add gateway" button | 1661 |
| `#meta-gateways` | 1663 |
| `ACTION_LABELS` | 2898–2910 |
| `requirePerm()` | 3126–3132 |
| `manage_settings` permission label | 3257 |
| `renderSettingsMeta()` (incl. `meta-gateways`) | 7341–7344 |
| `gatewayStats()` | 7456–7460 |
| `renderPaymentGateways()` | 7461–7474 |
| `toggleGatewayEnabled()` | 7475–7485 |
| `setDefaultGateway()` | 7486–7494 |
| `addCustomGateway()` | 7495–7506 |
| `removeGateway()` | 7507–7513 |
| Arabic `stab.gateways` | 7918 |
| Settings page render fan-out | 8819 |
| Activity-log action filter | 9238 |
| `DB.payments` seed (10 records) | 2694–2706 |
| `DB.paymentGateways` seed (6 rows) | 13913–13920 |
| `guardAction()` | 17819–17840 |
| `'cash.gateway'` ledger account | 19866 |
| Ledger credit / debit / snapshot of `cash.gateway` | 19972 / 20041 / 20133–20136 |
| `gateAll()` | 20755–20767 |
| `GATE_SWEEP.addCustomGateway` | 20828–20829 |
| `GATE_SWEEP.setDefaultGateway` | 20830–20832 |
| `SETTINGS_GROUPS` ("Money" group) | 21272 |
| `reorderSettingsTabs()` | 21278 |
