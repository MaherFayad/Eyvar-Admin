# Verification Pass 2b — Supplementary Accuracy Audit

> Scope: the 8 documents pass 2 could not assess | Claims sampled: **9,079**
>
> Breakdown: 7,625 mechanically resolved `(citation, quoted-token)` pairs across all 2,583 `L####` citations in the eight documents · 935 hand-verified `sed` reads · 322 audit-key row assertions re-derived by script · 117 enumerations claimed exhaustive (≈2,300 member cells) · 102 formulas re-derived operator-for-operator · 107 negative claims falsified-or-confirmed by grep.
>
> Source of truth: `eyvar_ops_panel_v40_fixed.html` (21,857 lines — count re-confirmed). Every finding below was checked by reading the cited source line directly, never by trusting the document's own reasoning.

---

## 1. Why this pass exists (the coverage gap in pass 2, quoted)

Pass 2's own header states the gap:

> **Directory state.** At audit start `docs/01-modules/` held **53** files. At audit end it held **61**. Eight documents were written *during* this pass: `00d-i18n-and-localisation.md`, `13c-contact-drivers.md`, `13d-interventions.md`, `15k-settings-reason-codes-sla.md`, `16i-settings-rota-oncall.md`, `16j-settings-activity.md`, `16k-audit-log.md` (and `16h` was still being revised). The eight late arrivals received **shallow sampling only** — treat their accuracy as *unassessed*, not as *clean*.

Its confidence table repeats the point:

> | `00d`, `13c`, `13d`, `15k`, `16i`, `16j`, `16k` | **Unassessed** | Written during this pass; sampled only incidentally. |

And its process backlog item P5 #34 commissions exactly this pass:

> 34. **Re-run this pass against the eight documents written during the audit** — `00d`, `13c`, `13d`, `15k`, `16i`, `16j`, `16k`, and revised `16h`. They were sampled only incidentally and their accuracy is **unassessed**, not clean.

A second, wider caveat sits under pass 2's scorecard and is *not* closed by this pass:

> *Coverage caveat: `05a`–`10e`, `13a`–`14b` and most of `15*`/`16*` were still under audit by parallel agents when this report was finalised; the totals above cover `00a`–`04`, `11a`–`12c`, `15b`/`15d`/`15g`/`15i`/`16h` in depth plus the whole-corpus mechanical sweeps.*

See §13 for what that leaves outstanding after 2b.

---

## 2. Verdict + confidence rating per document

**Headline: the eight are *not* worse than the assessed 53 — but they are not clean either.** Their formula work is excellent (102 formulas re-derived, 96 exact), their large enumerations are frequently flawless (16k's 135-key cross-check and 15k's/13c's 40-row reason-code registry are the best enumeration work in the entire corpus), and 100 of 107 strong negatives hold. The defects cluster in three places pass 2 did not have to consider:

1. **Fabricated and mis-attributed identifiers** — `slaOpen`, `commitSurgeSchedule`, `commitSearchPhases`, `#wrap-reason`, `#lc-reason` are named as source symbols and **do not exist** (grep returns 0). This is pass 2's W1/`AUDIT_LABELS` failure mode, five more times.
2. **A shared structural blind spot at `L21270–L21313`.** Two documents (`00d`, `16j`) end their analysis before `SETTINGS_GROUPS` / `reorderSettingsTabs()` and therefore invert the same three conclusions. `03c` — an already-audited document — got it right.
3. **Boot-order blindness.** `16h`'s analysis of the ledger's monkey-patches assumes the ledger wrapper is outermost. It is not: `installActionGates()` (L18089) and `installUniversalGates()` (L18383) both run **before** the ledger module (L19841+), which inverts the doc's most consequential claims.

| Doc | Verdict | Confidence |
|---|---|---|
| `16i-settings-rota-oncall.md` | **Best of the eight.** All ten negative claims TRUE, the 13-of-42 seeded-gap derivation correct, the 42-slot / 3-block / 2-tier / 7-day enumerations exact, every function-declaration and constant citation exact. Drift confined to block-range *endpoints* and template interiors. Two defects: one overstated clock claim, one self-contradictory sentence. Carries two **uncorrected pass-2 findings** (§5). | **High** |
| `16k-audit-log.md` | 135 unlabelled action keys, their 189 call-site line numbers and all 26 labelled keys re-derived by script: **100% exact, set-identical, zero errors.** All headline counts (220/161/26/135/189/40) exact. The whole `#p-audit-log` markup region cited exactly. Defects: three non-existent/mis-attributed identifiers, one wrong button line repeated four times, −2 drift into the `logAction` object literal. | **Medium-high** |
| `00d-i18n-and-localisation.md` | Extraordinary citation hygiene — **zero** falsifiable citations in L1–L8002, and four full enumerations (88 dict keys, 86 markup keys, 92 `fmtSAR` lines, 86 Arabic-script lines) reproduced exactly. But the analysis stops before L21270 and the omission invalidates §1, §2.1(3), §3.2, §4.2B, §5.1, §5.5, F1 and F5. Six arithmetic/denominator slips. | **Medium-high** |
| `13d-interventions.md` | The reachability finding, all three counting defects, both state-machine enumerations and all eleven formulas survive hostile checking intact. `G2` is correctly scoped, not overstated. Four substantive errors; ~30 of ~120 citations drift 1–6 lines low into template interiors. | **Medium-high** |
| `16h-settings-ledger.md` | **All 20 money formulas and all 7 posting specifications exact**, 12-account chart exact, all 5 idempotency-key formulas exact, the ~13% VAT-reconciliation derivation correct. But the wrapper-ordering analysis is **inverted**, and that inversion propagates into §1, §5, §6, §9.2 and §13 — including a "no confirmation" warning on a path that *does* confirm. Two uncorrected pass-2 findings. | **Medium** |
| `15k-settings-reason-codes-sla.md` | 40-row registry member-for-member exact, 28 of 30 formulas exact, all 5 permission claims, all 5 audit claims and all 5 gate specs exact, 5 of 6 pre-flagged negatives TRUE. But `owner`-is-dead is **false** and contradicted by two sibling docs; three "every key is read" claims are false; four derived counts are wrong and inconsistent with the doc's own correct table; one citation is ~460 lines off. | **Medium** |
| `16j-settings-activity.md` | Mechanism understanding essentially flawless — the preview-branch code block is character-identical to source and the headline "the pane description lies" finding is real. But the `stabgrp` dead-key claim is falsified, the settings-meta coverage count conflates map entries with tabs, and markup citations drift +1 across a 13-line span. | **Medium** |
| `13c-contact-drivers.md` | **Analytically the strongest and citationally the weakest.** All 17 formulas match operator-for-operator including every divide-guard and rounding position; the 40-row × 10-column reason-code table is 100% correct; 25 of 28 negatives TRUE. But its headline finding `G12` is **false and inverted**, asserted in bold in six places on a premise the doc itself flags as unread; `slaOpen()` does not exist; two element ids do not exist; ~45 of ~200 citations drift. | **Medium** |

---

## 3. Accuracy scorecard (same categories as pass 2 §2)

| Category | Claims checked | Confirmed | WRONG | STALE | OVERSTATED | UNSUPPORTED |
|---|---:|---:|---:|---:|---:|---:|
| Line citations — mechanical `(cite, token)` pairs | 7,625 | 6,282 | — | 1,343 flagged → hand-reviewed | — | — |
| Line citations — hand-verified (`sed`) | 935 | 703 | 47 | 178 | 7 | 0 |
| Audit-key rows re-derived by script (`16k` §8.1 + §9.3) | 322 | 322 | 0 | 0 | 0 | 0 |
| **Financial formulas re-derived (`16h`)** | **20** | **20** | **0** | **0** | **0** | **0** |
| Non-money formulas re-derived (`13c`, `15k`, `13d`, `16i`, `16k`) | 82 | 76 | 2 | 0 | 4 | 0 |
| Negative claims | 107 | 100 | 7 | 0 | 2 | 0 |
| Enumerations claimed exhaustive | 117 | 103 | 14 | 0 | 0 | 0 |
| Seed data / record counts | 44 | 39 | 4 | 1 | 0 | 0 |
| Named-identifier existence | 31 | 26 | 5 | 0 | 0 | 0 |
| **Total (assessed)** | **9,079** | **7,671** | **79** | **1,522** | **13** | **0** |

*The mechanical STALE bucket is a flag count, not a defect count — as in pass 2, the majority are false positives from prose descriptions inside backticks that were never meant to quote source text. Every flag was reviewed; the hand-verified row is the residue that survived review.*

*Money-formula note: pass 2 re-derived 28 money formulas and found 28 correct. Pass 2b re-derived 20 more (the entire `16h` ledger module) and found **20 correct**. **No money formula in this documentation set is wrong.** The two `16h` errors in §4 are wrong* assertions about *those formulas, not errors in the transcriptions themselves.*

*UNSUPPORTED: none found. All eight documents carry an explicit `UNVERIFIED items` section and use it correctly. Two documents flag a premise as unread and then assert the conclusion built on it anyway (`13c` §17 G22 → G12; `16h` §10 → §1/§5/§6) — those are logged as WRONG, not UNSUPPORTED, because the conclusions are falsifiable and false.*

---

## 4. WRONG claims

### 4.1 `16h-settings-ledger.md` — the gate-ordering inversion (highest severity in this pass)

| # | Claim | Cited line | Actual source content | Correction |
|---|---|---|---|---|
| **H1** | §10 ⚠ ordering row: "`commitWalletAdjust` is guarded (L17886) but **`recordRefund`/`creditRiderWallet` are not, so no conflict is observable** — `UNVERIFIED: ordering has no observed effect`" | L17886 | L17889 is `n+=guardAction('commitWalletAdjust',…)`. **L17901 is `n+=guardAction('recordRefund',function(riderId,amount,reason){`** — inside `installActionGates()`, invoked at top level at **L18089**. Separately, **`GATE_SPECS.acceptEmergency` L18260** is installed by `installUniversalGates()` at top level **L18383**. Both run *before* the ledger module's `var __origRecordRefund=recordRefund;` at **L19961** and `var __origAcceptEmergency=acceptEmergency;` at **L20007**. | **`recordRefund` and `acceptEmergency` are both already guarded when the ledger patches them.** The ledger wrapper is therefore the *outer* layer and its inner call reaches `guardAction`'s wrapper (L17822–L17837), which opens a `confirmAction` modal (L17836) and **returns `undefined`**. In `recordRefund`'s wrapper, `if(entry)` (L19966) is then false → `postLedger` never runs. In `acceptEmergency`'s wrapper, `d.status==='Accepted'` (L20013) is false → neither posting runs. On confirm, `runConfirm()` → `o.onConfirm` → `orig.apply` (L17834) calls the **raw** function captured at guard time, bypassing the ledger wrapper entirely. **The `refund`, `emergency_cover` and `emergency_recovery` entry types cannot be produced through any UI path in this build.** `installActionGates` is at L17853 (called L18089), not L17832 (which is `window.__confirmValues=values;` inside `guardAction`). |
| **H2** | §5 ⚠ and §13 item 1: "**`demoDoubleRefund()` is a destructive demo button with no confirmation** and no permission gate. It issues a genuine SAR 25 refund…"; §6: "**Modals opened: None.**" | L20104, L20131 | Same chain as H1. The first `recordRefund(rid,25,…)` at L20134 reaches the guard, which opens the "Issue refund" modal built at L17902–L17907 (`danger:true, irreversible:true`) and returns `undefined`. The second call at L20135 is suppressed by `withIdempotency` before reaching the guard. `a` and `b` are both `undefined`, so `a&&b&&a.id===b.id` is false and the button **always toasts `⚠ Duplicate was NOT suppressed`** (L20140). | Three errors: (a) there **is** a confirmation; (b) §6 "Modals opened: None" is false — one `confirmAction` modal opens; (c) the demo's stated purpose ("Proof, not decoration", source comment L20129–L20130) is broken — it can never demonstrate suppression, and if confirmed it issues a real refund with **no** ledger posting and a burnt idempotency key. |
| **H3** | §7.9 ⚠: "`net+vat` **may differ from `gross` by 1 halala after independent rounding**… When it does, `postLedger` **rejects** the entry and the trip is silently skipped while the idempotency key is still recorded" | L20030–L20052 | L20038: `var net=r2(gross/(1+rate)), vat=r2(gross-net);`. `vat` is the **residual**, not an independent computation. `gross` is already 2-dp (`r2` at L20033), so `gross-net` is exactly 2-dp and `r2()` is a no-op on it; `net+vat === gross` by construction. The same holds for the `refund` patch (L19968): `net + r2(amount-net) === r2(amount)` for any `amount`, because `net` is a multiple of 0.01. | **The warning is mathematically impossible.** `postFareCapture` and the refund patch can never be rejected on rounding. Delete the ⚠ and the matching UNVERIFIED item. (The *separate* observation that `withIdempotency` records the key regardless of whether `postLedger` returned `null` — §13 items 8/9 — **is correct**: L20049 `return true;` runs unconditionally.) |
| **H4** | §8.2: "`type` \| string \| **one of the 8 entry types in §8.3**" | §8.3 | `grep -on postLedger` → 8 hits: the declaration L19917 plus **7** call sites (L19969, L19985, L19997, L20014, L20018, L20040, L20045). §8.3's 8th row is a `*(none)*` placeholder for two never-posted accounts. | **7 entry types**, not 8. §8.3's table is correct; the §8.2 cross-reference miscounts its rows. |
| **H5** | §7.6: "called **12× per render** from `trialBalance` plus **3× from `ledgerReconcile`** plus **2× in `demoDoubleRefund`** → **17 full ledger walks per `renderLedger()`**" | L19934–L19947 | `accountBalance` call sites: L19950 (×12 via `Object.keys(ACCOUNTS)`), **L20063, L20064, L20065, L20066 — four, not three** (the `*0` term at L20065 is the fourth, which §7.8 itself flags as "costs a full ledger walk"), plus L20133/L20136 which are in `demoDoubleRefund` and fire **on click, not on render**. `trialBalance` also performs its own full walk at L19953–L19955. | The decomposition is wrong and **contradicts §7.8 of the same document**. Correct: 12 (`trialBalance` rows) + 1 (`trialBalance` totals) + 4 (`ledgerReconcile`) = **17 per render**. The total is right by coincidence; every term is wrong. |
| **H6** | §1: "Five real money paths **in other modules are monkey-patched** to post through it" | §9.2 | §9.2 of the same document says "The module replaces **four** existing global functions at load time" and marks `postFareCapture` as `(new)`. | Internal inconsistency. Four patches (`recordRefund` L19961, `creditRiderWallet` L19978, `debitRiderWallet` L19992, `acceptEmergency` L20007) + one new function. And per H1, only **two** of the four patches (`creditRiderWallet`, `debitRiderWallet`) actually reach `postLedger`. |

### 4.2 `13c-contact-drivers.md`

| # | Claim | Cited | Actual | Correction |
|---|---|---|---|---|
| **C1** | §17 G12 (repeated §10.1, §10.2, §11 A12, bolded in six places): "`gvRC()` reads `#nt-reason` (the *new-ticket* modal's picker), yet it is the reader for the wrap-up picker… **every wrap-up and every logged contact is coded `OTHER_UNCODED`**" | L14748–L14752, L5336 | **L14761: `return customSelectHTML(cselId,'nt-reason',opts,selected\|\|'',`** — `reasonSelectHTML()` hard-codes `fieldId='nt-reason'` for **every** picker it builds. **L5352: `+'<input type="hidden" id="'+fieldId+'" value="'+(selectedValue\|\|'')+'">'`** — `customSelectHTML` emits the hidden input under `id=fieldId`. `grep -on "nt-reason"` → 4 hits: L2423, L2546 (new-ticket markup), **L14751** (`gvRC`), **L14761** (`reasonSelectHTML`). The source's own comment at L14749 reads *"Reads the reason picker in whichever ticket modal is open."* | **False, and inverted.** Every picker built by `reasonSelectHTML` — new-ticket, change-reason, bulk, wrap-up, log-contact, low-rating, desync — emits `#nt-reason`, so `gvRC()` reads exactly the open picker. Wrap-up and log-contact code **correctly**. The real issue (documented correctly in `13a`) is a hidden-field **id collision** if two pickers were ever in the DOM at once. The doc's own §17 G22 admits `customSelectHTML`'s body "was not read. This is the crux of G12" — the conclusion was asserted anyway. **This is the single most consequential error found in this pass**: believed, it would send an engineer to "fix" working code and to distrust the CPT numbers. |
| **C2** | §4.7 header, §6.5, §7.2, §15.4, §18 index: function **`slaOpen()`** at L14843 / L14849 / range L14843–L14852 | L14843–L14852 | `grep -ni "slaopen"` → **0 hits**. L14839 is `function slaStampNewTicket(id,code,channel){`. | **The identifier does not exist.** Rename all five references to `slaStampNewTicket()`, **L14839–L14852**. Same failure mode as pass 2's W1 (`AUDIT_LABELS`). |
| **C3** | §10.2 / §13.2: element `#wrap-reason`; §10.1 / §13.3: element `#lc-reason` | — | `grep -c "'wrap-reason'\|id=\"wrap-reason\|'lc-reason'\|id=\"lc-reason"` → **0** | Neither id exists. The **wrapper** ids are `csel-wrap-reason` / `csel-lc-reason`; the value-bearing field in both is `nt-reason` (see C1). |
| **C4** | §2 row 5: "Live re-render from the SLA sweep \| **L15954**" | L15954 | `L15954:    7) PDPL ERASURE` — a comment banner in an unrelated module | Digit transposition. The statement is at **L14955**. |
| **C5** | §17 G6: "**`DB.slaPolicy.tiers[*].hours` is never read.**" | L14655 vs L14766–L14790 | **L15136: `+'<td …>'+(t.hours==='24/7'?'24/7':'Business hours')+'</td>'`** in `renderSlaPolicyForm()` | It **is** read — for display. The correct claim (which the doc makes correctly in §4.8) is "never used by `slaState`". |
| **C6** | §6.5 "`commitBulkReason` (L16188)"; §17 G12 "the bulk-reason picker (L16182)" | L16188 / L16182 | L16188 is picker markup inside `bulkReason()`; L16182 is a closing brace of `bulkAssignMe()` | `t.slaBreaches=[]` is at **L16201**; `gvRC()` in `commitBulkReason` is at **L16194**. |
| **C7** | §15.3 heading: "`openLogContact()` call sites — **6**" | — | 16253, 16865, 16882, 16887, 16895, 16990, 20602 = **7** | The doc's own table lists 7 rows. Heading miscount. |
| **C8** | §15.4 heading: "`logContact()` writers outside this module — **10**" | — | 5836, 14849, 14860, 15202, 15210, 15516, 16008, 16599, 16802, 17343, 18230 = **11** | The doc's own table lists 11 rows. Heading miscount. |
| **C9** | §3: "`#contacts-extra` \| **L1414**" | L1414 | `L1414: </div>` | **L1413** — which is what the doc's own front matter says. Self-contradiction. |
| **C10** | §2 row 2 / §18: "Router branch \| **L8825**"; §15.5 "Settings … L8824" | L8825 / L8824 | `L8825: updateBackBtn();` | Contacts branch is **L8820**; settings branch is **L8819**. Uniform **+5** offset — the only place in the eight docs where drift runs positive by that magnitude. |

### 4.3 `15k-settings-reason-codes-sla.md`

| # | Claim | Cited | Actual | Correction |
|---|---|---|---|---|
| **K1** | §9 / §13.1: "**`owner` is DEAD** — `renderReasonCodesTable()` L15085 only. Grep for `.owner` outside the registry finds no reader… nothing routes, filters, reports or escalates by owner" | L15085 | **L14831**: `if(rc.owner)chips+='<span …>· root-cause owner: '+rc.owner+'</span>';` · **L15001**: `r.owner=rc.owner\|\|'— unassigned —';` · **L15035**: `+'<td>'+r.owner+'</td></tr>';` · **L15041** header `<th>Root-cause owner</th>` · **L15044** panel copy: *"the owner column says whose backlog that fix belongs in"* | **`owner` is live in three places** — the ticket SLA detail chip and the Contact-drivers CPT report column. It **is** a report. Delete §13.1; §9's row must read **Live**. Two sibling docs (`13a`, `13c`) already say so — see §7 X1. |
| **K2** | §9: "**Every one of the 20 keys** [of `DB.commitPolicy`] has at least one reader outside Settings" | §9 | `riderWaitMin` → only L16545 (seed), L17087 (settings field). `riderNoShowPayPct` → only L16546, L17088. `payoutDays` → only L16547, L17089. | **3 of 20 keys are dead** — editable, saved, never read. The doc found five dead things, missed three real ones, and invented a sixth (K1). |
| **K3** | §8b: "by tier: T1 4, **T2 14, T3 14, T4 8**" | §8b | `awk 'NR>=14669&&NR<=14715' \| grep -oE "tier:'T[0-9]'" \| sort \| uniq -c` → **4 / 12 / 15 / 9** | T1 4, **T2 12, T3 15, T4 9** |
| **K4** | §8b: "by target: **rider 28, driver 10**, corp 2" | §8b | same method on `target:'…'` → **rider 29, driver 9, corp 2** | rider **29**, driver **9** |
| **K5** | §8b: "codes with `comp>0`: **9**… codes with `comp:0`: **31**" | §8b | `comp:0` ×30, `comp:100` ×2, `comp:15` ×1, `comp:20` ×2, `comp:25` ×3, `comp:50` ×2 | **comp>0: 10** (the list omits `SUB_SAME_CAPTAIN_BROKEN` = 25) · **comp:0: 30** |
| **K6** | §13.11: "`compCheck` blocks goodwill on **31 of 40** codes" | L15415 | 30 codes carry `comp:0`; L15415 exempts `OTHER_UNCODED` by name | **29 of 40** |
| **K7** | §10.12 / §14: reorder rationale comment at "**L20795–20801**" | L20795–L20801 | L20792–L20804 is `GATE_SWEEP` (`saveSurgeConfig`, `saveSurgeSchedule`, `saveRideTypes`, `saveSearchPhases`) | The quoted text is at **L21262–L21263**, in the comment block **L21258–L21269** — ~460 lines off. |
| **K8** | §12: `stab.reasons` AR at L7912; `stabgrp.operations` AR at L7913; `stabgrp.daily_ops` AR at L7914 | — | L7911 / L7914 / L7915 | All three shifted. |
| **K9** | §12: `stabgrp.operations` "removed at boot (**L21285**)" | L21285 | L21285 is a comment line | Removal is **L21288**. |
| **K10** | §3d / §8c: `DB.compPolicy` non-role scalars at **L15385–15387** | L15385–L15387 | L15385 is the `'default'` role row | **L15387–L15389** |
| **K11** | §14: `GATE_SPECS.saveOnCall` **L18334–18338** | — | `saveOnCall:function(){` is L18332, closes L18336 | **L18332–L18336** |
| **K12** | §14: `installUniversalGates()` **L18376–18384** | — | declared L18372, closes L18382, invoked L18383 | **L18372–L18383** |
| **K13** | §13.7 / §14: `renderSettingsMeta()` at L7341–7344, map at L7342 | — | declared **L7339**, `var map={…}` **L7340**, closes L7342 | **L7339–L7342**, map at **L7340**. *(The substantive `#meta-reasons` negative is still TRUE — §8.)* |
| **K14** | §9: `appealResponseHours` read at **L18345** | L18345 | L18345 is a `consequences:[…]` line in `commitReportRider` | **L18356** |
| **K15** | §3b: "**Not exposed in the UI at all**: `ref`, `cat`, `target`, `comp`, `labelEn`, `labelAr`" | §3b | L15076 renders `'§'+r.ref+' '+r.labelEn`; L15078 renders `r.labelAr`; L15079 renders `r.cat` | Only **`target` and `comp`** are unexposed. Contradicts the doc's own table three rows above. |

### 4.4 `00d-i18n-and-localisation.md`

| # | Claim | Cited | Actual | Correction |
|---|---|---|---|---|
| **D1** | §2.1 prop. 3 / §11: "grep proves **no JS string literal anywhere in the file emits a `data-i18n` attribute** — the **last `data-i18n` in the file is at L1992**" | L1992 | `7948: var key=el.getAttribute('data-i18n');` · **`21296: h.setAttribute('data-i18n',g.i18nKey);`** · **`21307: h.setAttribute('data-i18n','stabgrp.other');`** | Last `data-i18n` is **L21307**. JS *does* emit the attribute, via `setAttribute` inside `reorderSettingsTabs()` (L21278–L21313). Generated content is **not** structurally unreachable by `applyLanguage`'s loop. |
| **D2** | §4.2B / F5: "**7 orphan keys** … Dead data that will mislead the next translator … evidence of an **abandoned refactor**" | L7915–L7916 | `var SETTINGS_GROUPS=[…]` **L21270–L21277** attaches six of the seven (`daily_ops`, `money`, `people`, `comms`, `platform`, `records`) to runtime-created group headers at L21296. `reorderSettingsTabs()` is called from `presenceBoot()` **L21393**, registered in `bootModules()` at **L21825**. | The refactor was **completed in JS, not abandoned**. **True orphan count: 1** (`stabgrp.other`, L21307 — unreachable because `SETTINGS_GROUPS` covers all 21 rail tabs: 5+4+3+3+4+2 = 21). |
| **D3** | §3.2 / §5.4 / §11 present `stabgrp.workspace` / `.operations` / `.system` (L1420/1424/1436) as the live group keys | — | **`21288: nav.querySelectorAll('.settings-tab-group-lbl').forEach(function(e){e.remove();});`** (and again at L21311) | Those three static headers are **removed from the DOM at boot**. At runtime *they* are the keys that never render — the exact inverse of what the doc says. |
| **D4** | §5.1 / F1 / §10: "Unique element ids **in the static shell** \| **621**"; "Static-markup translation ceiling \| **86 / 621 = 13.8%**" | §5.1 | 629 raw `id="` occurrences file-wide, **621 unique file-wide**, **485 unique in the static shell (L1–L2165)**; 144 come from JS builders | Wrong denominator. The real ceiling is **86/485 = 17.7%**. |
| **D5** | §5.1 / §5.5: "everything from **L2051** onward is JavaScript; `grep data-i18n` returns **zero hits past L2100**" | L2051 / L2100 | `grep -n '<script'` → **L2166** opens the inline script. L2051–L2165 is static markup containing 5 page shells the doc's own §5.3 lists. **4** `data-i18n` hits sit past L2100 (7947, 7948, 21296, 21307). | The script opens at **L2166**, and the "zero past L2100" claim is false. |
| **D6** | §8.3C / §8.3D: "**47 seeded reason codes** at L14669–L14715" | L14669–L14715 | `awk 'NR>=14669&&NR<=14715' \| grep -c "{code:'"` → **40** | **40** codes. (`15k`, `13c`, `12c` all say 40 and are right.) |
| **D7** | §8.3: `reasonCode.labelAr` — "Definition / write sites **48**" | §8.3 | 44 total occurrences over 43 lines (L14759 carries two) | 40 seed + 1 write (L15121) = **41** definition/write sites. |
| **D8** | §8.2 / §11: "`.timezone` is read … **at L19760** where it is concatenated into a static sentence" | L19760 | L19760 reads **`DB.onCallSchedule.timezone`** (its own hardcoded seed at L19599), not `DB.opsConfig.general.timezone` | Misattributed. *(This makes the write-only verdict **stronger**, not weaker.)* |
| **D9** | §8.2: "`toFixed` … **248 occurrences across 219 lines**" | §8.2 | 248 occurrences across **227** lines | 227. |
| **D10** | §8.2: "`fmtSAR` — **93 occurrences**: L4394 is the definition, so 92 call sites" | L4394 | 110 occurrences over **93 lines** | 93 is the *line* count. 109 call-site occurrences over **92 lines**. *(The 92-line list itself is exactly correct.)* |
| **D11** | §1: "The entire i18n surface of this 21,857-line file is **three identifiers**" | §1 | `SETTINGS_GROUPS[].i18nKey` (L21271–L21276) and `reorderSettingsTabs()` (L21278) also participate | **Five**, not three. |

### 4.5 `16j-settings-activity.md`

| # | Claim | Cited | Actual | Correction |
|---|---|---|---|---|
| **J1** | §10 / §13 / §14.11: "**7 dead i18n keys** … Arabic values with no markup" | L7915–L7916 | Same evidence as D2 — `SETTINGS_GROUPS` L21270–L21277, `setAttribute` L21296/L21307, `reorderSettingsTabs()` called at L21393 | **All 7 are consumed at runtime.** Not dead. |
| **J2** | §7.3 ⚠ / §8.2 / §12 / §14.11: "the actual nav has **21 tabs in 3 groups**"; the source's "21-tab/6-group" comment is flagged as wrong | L7323 / L1421,1425,1436 | L21288 removes the 3 static headers and 6 new ones are appended; 5+4+3+3+4+2 = 21 | Static markup is 3 groups; the **rendered** nav is **6**. The source comment is correct and the doc's ⚠ against it is **inverted**. §8.2's whole table describes a nav the user never sees. |
| **J3** | §8.1: "Not covered at all (no `meta-*` element and no map entry): … **dispatch** …" | — | `#stab-dispatch` L1552–L1619 holds `meta-ops-radius` L1578, `meta-multi-sub` L1590, `meta-phases` L1600, `meta-plan-visibility` L1617 | `dispatch` holds **4** populated meta elements. Remove it from the list (13 → 12). |
| **J4** | §8.1: "**11 of 21** settings tabs show a 'last updated by' line; **10** do not" | — | Panel boundaries mapped against the 12 `meta-*` ids | **8 of 21** show it; **13** do not. "11" is the *map-entry* count — four entries live inside one tab. |
| **J5** | §9 / §11 / §15: "`exportAuditLog()` button (Data Export tab) **L2027**" | L2027 | `2027: …onclick="exportRiders()">👤 Riders…` | **L2031**. *(Shared verbatim with `16k` — see §7 X6.)* |
| **J6** | §8.2 nav table, rows 1–11 + two group labels | L1421–L1433 | L1420 `stabgrp.workspace`, L1421 general, L1422 team, L1423 permissions, L1424 `stabgrp.operations`, L1425 dispatch … L1432 integrity | Every line from L1420 to L1432 cited **+1**. `stabgrp.system` L1436 and L1433–L1443 are correct. |
| **J7** | §8.2 footnote: "`integrity` sits at L1432/**1433** … both on adjacent lines" + a `(sic)` marker | L1432/L1433 | L1431 branding, L1432 integrity, L1433 rota — three distinct lines, one button each | Fabricated ambiguity. Delete the footnote. |
| **J8** | §7.3 ⚠: "**Six** group keys exist in the Arabic dictionary" then lists **seven** | L7915–L7916 | seven keys listed | Internal count error; the doc says 7 everywhere else. |

### 4.6 `13d-interventions.md`

| # | Claim | Cited | Actual | Correction |
|---|---|---|---|---|
| **V1** | §7.4: the `↩ respond within` badge is "reachable only on an at-risk row" | L14791–L14803 | **L14799** returns on `s.resPct>=atRiskPct` — exactly the condition that creates a T2 row — **before** L14800 is reached | **Unreachable on this page.** Only **4** of the 5 listed badges can appear. L14801's `<fmtAge> left` is likewise unreachable and is omitted from the doc entirely. |
| **V2** | §11 / G14: "**The only gated function downstream of this page is `commitRequestAssign`**"; "the first `requirePerm` is … two clicks away" | L11884 | `10246: if(c.kind==='ust')return assignNearestDriver(drvId,c.riderId,c.id);` → **`8482: window.assignNearestDriver=…` / `8483: if(!requirePerm('live_ops'))return;`** | The page's **primary** action (T5–T8 `Find driver`) commits through a gated function. **Two** gated commits exist. |
| **V3** | M16: `DB.upcomingSubTrips` seed — "**`UST-1`…`UST-4`**", L6177–L6242 | L6177–L6242 | `id:'UST-1'` … `id:'UST-8'` — **8** records with 8 `SCENARIO n` comments; array closes **L6241** | **8 records, L6177–L6241.** *(The separate dead seed at L6243–L6248 genuinely holds 4 — that part is correct.)* |
| **V4** | M6: "`mins` fallback `999` … **silently dropping** the row" | — | `unassigned` carries `alwaysCritical:true`, so `isCritical` is true regardless of `mins` (L9503) and the row is **kept** | Holds only for `unavailable`; `late` cannot reach `mins>30` at all. |
| **V5** | §2.1: "**Exhaustive** grep of `intervention` … returns these hits **and no others**" (14 rows) | — | case-sensitive `grep -c "intervention"` → **15** (the table omits L19054, which the doc itself discusses in G2); case-insensitive → **24** | Not exhaustive under either reading. |
| **V6** | Range/target errors: `renderInterventionsPage()` L10338–**10344** → **L10345** · empty state L10343 → **L10344** · `DB.reasonCodes` L14667–**14713** → **L14667–L14716** · `#dash-alerts-count` L10380 → **L10412** · `.al-row` in alerts L10386 → **L10414** · sidebar "L520–L540" for `inbox` → **L496** (sidebar is L487–L540) · `riderConfirmed` L8305/L8315 → **L8309/L8319** · G6 evidence L8303/L8309 → **L8304/L8314** · `showNearbyDriversMap` ctx L9508 → **L9514** · sort push L9473/L9515 → **L9470/L9516** · splices L11894/L12484 → **L11897/L12482** · `pickNearbyDriver` comment L11913–17 → **L11910–L11914** · `refreshOwnershipSurfaces` L19048–56 → **L19045–L19057** · `scenarioBannerHTML` L8329–53 → **L8329–L8347** · `commitRequestAssign` L11884–912 → **L11884–L11909** | — | verified individually | 16 corrections. |

### 4.7 `16k-audit-log.md`

| # | Claim | Cited | Actual | Correction |
|---|---|---|---|---|
| **A1** | §5 / §10 / §11 / §15 (four places): "`exportAuditLog()` … reachable only from **Settings → Data Export (L2027)**" | L2027 | `2027: …onclick="exportRiders()">👤 Riders…` | **L2031** — `onclick="exportAuditLog()">🕵️ Activity log`. |
| **A2** | §7.2: "Callers that pass whole arrays (e.g. … **`commitSurgeSchedule` L12385**)" | L12385 | `grep -c commitSurgeSchedule` → **0**. L12385 sits inside `function saveRideTypes(){` (L12375) and logs `'Ride type pricing updated'` | **The identifier does not exist.** The function at L12385 is `saveRideTypes()`. |
| **A3** | §14 item 9: "**`commitSearchPhases` L8117**" | L8117 | `grep -c commitSearchPhases` → **0**. L8117 sits inside `function saveSearchPhases(){` (L8115) | **The identifier does not exist.** |
| **A4** | §14 item 9: "**`saveSurgeSchedule` L12385**" | L12385 | `saveSurgeSchedule` exists — at **L12321**, not L12385 | Right name, wrong line — and it contradicts §7.2, which names a different (non-existent) function for the same line. |
| **A5** | §9.4: "**Money (11):**" then lists 13 distinct keys | §9.4 | wallet_credit, wallet_debit, payment_captured, payment_hold_released, credit_note_issued, settle_subscription, cash_approved, cash_debt_repaid, cash_escalated, duplicate_suppressed, ledger_rejected, comp_blocked, driver_bonus_awarded = **13** | **13**, not 11. *(Security/identity "7" and Privacy "3" are both correct.)* |
| **A6** | §12: "`'AUD-'` pad width 4 \| **3137**"; §14 item 5: "`ts` has no date (**L3136**)" | L3136/L3137 | `3136: id:'AUD-'+String(DB.auditLog.length+1).padStart(4,'0'),` · `3137: ts:new Date().toLocaleTimeString(…)` | **The two are swapped.** *(§14's dead-code table has them right: `entry.id` 3136, `entry.action` 3140, `entry.entityType` 3141 — all exact.)* |

### 4.8 `16i-settings-rota-oncall.md`

| # | Claim | Cited | Actual | Correction |
|---|---|---|---|---|
| **R1** | §7.2 ⚠ / §11 / §13 item 4: "`currentBlock()` uses the **real wall clock** while **the rest of the panel runs on the frozen demo clock `REQ_NOW_REF`** (L9555) … The rota's 'now' and the panel's 'now' are different times" | L9555 | **`14627: function nowMs(){return Date.now();}`** — `nowMs()`, which drives `slaState`, `myOpenClaims`, `logAction`, the ledger and every staleness rule, **is the same real clock**. `REQ_NOW_REF` is used at 22 sites, all in the subscription-request / renewal subsystem, and it is **not frozen** — L9680 advances it each tick. | **Overstated to the point of being wrong as written.** The rota agrees with the panel's dominant clock. The real observation — that `REQ_NOW_REF`'s *labelled* demo date (25 Jun 2026) differs from `Date.now()` — is narrower and should be scoped to the request subsystem. |
| **R2** | §3.2 `ho-to` options cell: "**6 users → the search box appears** (`options.length>6` is false at 5 users, so **no** search box with the seeded data)" | L5343 | `DB.teamUsers` holds **5** users (USR-1…USR-5, L2831–L2840); `openHandover`'s option list is `DB.teamUsers.map(…)` with **no** "unassigned" prefix = 5 options; `options.length>6` (L5343) is false | Self-contradictory sentence. Delete the lead clause; the parenthetical is correct. *(§3.1's grid picker genuinely has 6 options — 1 + 5 — and correctly gets no search box.)* |

---

## 5. STALE citations

Claim is sound; the line number is wrong. **The pass-2 drift signature is confirmed in all eight documents**: citations to function declarations, constant definitions, seed literals, `logAction`/`toast`/`requirePerm` calls and router branches are **reliably exact**; citations *into* long HTML template-string interiors and multi-line object literals drift **±1 to ±3**, and block ranges over-run into the next sibling.

### Uncorrected pass-2 findings still present

| Doc | Claim | Cited | Actual | Note |
|---|---|---|---|---|
| `16h` (header, §12, §14), `16i` (header, §12, §14), `16j` | Settings tab group "Operations" | **L1425** | **L1424** (L1425 is the *dispatch* tab button) | Pass 2 P2 #16 flagged this for `16h`; it is still wrong there and is replicated in `16i`. |
| `16h` (header), `16i` (header), `16j` | `#p-settings` page range | L1416–**L2050** | **L1416–L2048** (L2049 blank, L2050 is the `ACTIVITY LOG PAGE` comment banner) | Pass 2 P2 #16. Still uncorrected in `16h`; replicated in `16i` and `16j`. |

### `16h-settings-ledger.md` — the cleanest of the eight for single-line citations

| Claim | Cited | Actual |
|---|---|---|
| `r2()` (§7.1, §14) | L19882 | **L19883** |
| `logAction('duplicate_suppressed',…)` (§5, §8.7, §10) | L19899 | **L19898** |
| `DB.moneyRejects.unshift(…)` (§4.5, §8.6, §13) | L19926 | **L19924** |
| `logAction('ledger_rejected',…)` (§8.7, §10) | L19927 | **L19925** |
| `toast('⛔ Ledger rejected…')` (§10) | L19928 | **L19926** |
| `accountBalance` debit-normal comment (§7.6) | L19944–L19945 | **L19943–L19944** |
| `trialBalance()` range (§7.7, §14) | L19948–**L19956** | **L19948–L19958** |
| `postFareCapture()` range (§7.9, §14) | L20030–**L20052** | **L20030–L20051** |
| Wrapper block starts (§9.2, §14) | 19979 / 19993 / 20008 | **19978 / 19992 / 20007** |
| original `recordRefund()` range (§14) | L3176–**L3210** | **L3176–L3202** |
| `commitWalletAdjust` guard (§10) | L17886 | **L17889** |

*Everything else in `16h` that I checked is exact* — including all seven `postLedger` posting blocks, all five idempotency-key lines, the whole `renderLedger` layout map (L20073–L20118), both button lines, `backfillFareLedger` L20120–L20128, `demoDoubleRefund` L20131–L20141, `ledgerBoot` L20145–L20151, the boot registration L21822, `DB.vatConfig` L13971, and all four `#stab-ledger` markup lines.

### `16k-audit-log.md` — exact in markup, −1/−2 in code interiors

| Claim | Cited | Actual |
|---|---|---|
| 500-entry cap (§7.1 prose, §12, §14 item 4, §15) | **L3146** | **L3148** |
| Forced re-render `renderAuditLog()` (§14 item 17, §15) | **L3147** | **L3149** |
| `auditDiffHTML()` range (§7.2, §15) | L3156–**L3172** | **L3156–L3171** |
| `resolveId` name-substring fallback (§14 item 16) | L3272 | **L3273** (L3272 is the comment) |
| `ACTION_LABELS` range (§8.1, §12, §15) | L2898–**L2911** | **L2898–L2909** |
| Actor / action / page-size selects `sm` (§3) | L9235 / L9240 / L9245 | **L9234 / L9239 / L9244** |
| Page-size option array (§3, §8.5, §12) | L9244 | **L9243** |
| "returns to page 1" comment (§3) | L9252 | **L9251** |
| `showActorHistory` click argument (§10) | L9302 | **L9300** |
| Pager button style literal (§12) | L9316 | **L9314** |
| Filter predicate range (§7.3) | L9326–L9334 | **L9328–L9336** |
| `e.actorId` / `e.action` / `e.id` in predicate (§10) | L9327 / L9329 / L9331 | **L9329 / L9330 / L9332** |
| `#audit-count` (§4.4) | L9336–L9337 | **L9337–L9338** |
| Pagination block (§7.4) | L9338–L9344 | **L9339–L9345** |
| `auditEmptyHTML` in the modal (§10) | L9275 | **L9277** |
| `initCardToggles()` (§2, §5, §15) | L9364(–L9385) | **L9368** |

*Exact in `16k`:* the entire `#p-audit-log` markup map (L2051–L2066, twelve element citations, **all correct** — note `16j` gets the same two ids wrong), `logAction` L3133–L3151, `resolveId` L3266–L3275, `rowLink` L3283, `auditEntityLink` L9281–L9285, `auditForEntity` L9292–L9295 + comment L9286–L9291, `auditRowsHTML` L9296–L9305, `auditEmptyHTML` L9306–L9308, `auditPagerHTML` L9309–L9321, `renderAuditLog` L9322–L9353, `exportAuditLog` L7623–L7626, `PAGE_PERMISSIONS['audit-log']` L10650, seeds L2863–L2872, CSS L324–L325, and the `.aud-diff` limitation call sites (L7383 `saveCancellationPolicy`, L7441 `saveOpsLimits` — both verified in the right functions).

### `16i-settings-rota-oncall.md` — drift is at block-range endpoints, not inside lines

| Claim | Cited | Actual |
|---|---|---|
| `renderOnCall()` range (header, §1.1, §13, §15) | L15789–**L15799** | **L15789–L15798** (L15799 opens `saveOnCall`) |
| `saveOnCall()` range (§1.1, §13, §15) | **L15800**–L15805 | **L15799–L15805** |
| Head strip (§2, §4.1) | L19749–L19757 | **L19751–L19758** |
| Timezone prose (§2) / timezone display (§3.3, §8.1, §9) | L19758–L19760 / L19759 | **L19759–L19761** / **L19760** |
| Uncovered-slots block (§2) | L19785–**L19797** | **L19785–L19796** |
| Recent-handovers block (§2, §4.4) | **L19799**–L19809 | **L19798–L19809** |
| Weekend header colour (§4.2) | L19764 | **L19765** |
| Shift-hours `padStart` (§4.2) | L19771 | **L19770** |
| Gap-list cap `20` (§3.3, §11) | L19790 | **L19789** |
| `rotaBoot` seeding formula / night rule / weekend rule (§11) | 19832 / 19829 / 19830 | **19833 / 19831 / 19832** |
| `ho-to` default / option labels (§3.2) | L19696 / L19694–L19695 | **L19697** / **L19695–L19696** |
| `ho-transfer` checked (§3.2) | L19699 | **L19701** |
| `Complete handover` button (§5) | L19706 | **L19705** |
| `commitHandover()` range (§5, §7.8, §15) | L19708–**L19730** | **L19708–L19732** |
| `guardAction('commitHandover')` (§5, §5a, §15) | L19731–L19742 | **L19733–L19741** |
| Handover guard staleness text (§3.3, §9) | L19741 | **L19739** |
| Modal intro prose (§6) | L19685–L19687 | **L19686–L19688** |
| Override `.pop()` (§8.7) | L19637 | **L19635** |
| `assign` reads (§9) | 19638 / 19654 / 19774 | **19636 / 19655 / 19773** |
| `slaSweep()` / `fire()` / `logAction('sla_breach')` (§7.12, §15) | 14936 / 14941 / 14946 | **14937 / 14942 / 14947** |
| `whoHolds()` (§9, §15) | L18864–L18874 | **L18865–…** |
| `myOpenClaims()` range (§7.9, §15) | L18912–**L18917** | **L18912–L18916** (L18917 opens `ownershipStats`) |
| `refreshOwnershipSurfaces()` (§10, §15) | L19045–**L19056** | **L19045–L19057** |
| `cselPick` `new Function` (§3.1, §15) | L5410 | **L5411** |
| `#F2F1EE` in the modal (§11) | 19688 | **19690** |
| Options list / `Invited` user (§13 item 7) | L19746, L2838–L2839 | opts built **L19748–L19749**; Noura's record **L2837** |
| `claim_expired` audit line (§8.8) | 18868 | **18870** |
| Module header comment (§15) | L19569–L19591 | **L19570–L19591** |

### `13c`, `13d`, `15k`, `16j`, `00d` — summary

- **`13c`** — ~45 of ~200 checked citations drift. Uniform **−1 to −3** into `screenPop`, `answerCall`, `commitWrapUp`, `renderContactsPage`, `renderContactsExtra`, `renderQueueMetrics` and the `ev` object literal; **+5** on both router branches; one digit transposition (C4). Representative: `exportContacts()` L15058–67 → **L15056–64**; `logContact` 2000-row cap L14932 → **L14933**; `reasonSelectHTML()` L14755–65 → **L14755–63**; `slaBadge()`/`slaUrgency()` ends L14803/L14812 → **L14802/L14810**; `rcTargets()` end L14740 → **L14739**; `answerCall` session fields L20245–49 → **L20246–50**; `commitWrapUp` fields L20302–09 → **L20303–08**; `logPriorityCall` L9162 → **L9163**; `DB.commLogs` seed L2749–64 → **L2749–62**; `gvRC()` L14748 → **L14750**.
- **`13d`** — ~30 of ~120 drift, consistently **low by 1–6** into `buildInterventionItems` (L9455–L9518), `tripScenario` (L8291–L8328) and `showNearbyDriversMap` (L8354–L8400). Representative: paused-ticket skip L9455 → **L9457**; breached border L9457 → **L9461**; `rcLabel` L9462 → **L9464**; `scCfg` L9491–95 → **L9492–96**; watch separator L9525 → **L9528**; `slaBadge()` end L14803 → **L14802**; `tripScenario()` end L8327 → **L8328**; radius notice L8375 → **L8374**.
- **`15k`** — drift is **uniformly −1** and confined to template strings and object literals; the exception is `renderSlaPolicyForm()`'s template cites (L15134–L15137), which are exact. Representative: pane L1771–1823 → **L1771–1822**; all ten `renderReasonCodesTable` template cites **+1**; all four `saveReasonCodes` body cites **+1**; all five `rcTargets` field cites **+1**; all four `renderCompPolicyTable` cites **+1**; `DB.commitPolicy` L16541–62 → **L16541–61**; `slaBadge()` L14791–805 → **L14791–802**; `compPreview()` L15448–61 → **L15447–62**; `ACTION_LABELS` L2898–2910 → **L2898–2909**.
- **`16j`** — `fitSettingsNavHeight()` L7297–7311 → **L7297–7310**; its rationale L7299–7306 → **L7300–7306**; `window.resize` L7312–14 → **L7311–13**; `auditDiffHTML()` L3156–72 → **L3156–71**; nav "L1422–1443" → **L1421–1443**; bottom-gap `12` L7302 → **L7308**; `stabgrp.system` AR L7915 → **L7914**; `#audit-count` L2058 → **L2057**; search input L2059 → **L2058**; page-size array L9245 → **L9243**; filter predicate L9326–34 → **L9328–36**; `showActorHistory` click L9302 → **L9300**.
- **`00d`** — **only four stale citations in a 943-line document carrying 678 citations.** `savePlan()` L6118–6150 → **L6117–6149**; `validatePlanFeatures()` L6050–6058 → **L6050–6056**; `rcById` attributed to L14759/L15078 (its declaration is **L14721**; those two are correct *render* sites); timezone options L1485–1493 → **L1486–1492** (§11 states this one correctly).

---

## 6. OVERSTATED / UNSUPPORTED

| # | Doc | Claim | Assessment |
|---|---|---|---|
| O1 | `00d` §2.1 prop. 3 | "no JS **string literal** anywhere emits a `data-i18n` attribute" | **OVERSTATED.** Literally true — the emission is `setAttribute`, not a template literal — but it is deployed to support the false conclusion that generated content is unreachable by `applyLanguage`'s loop (D1). Technically-true wording, materially misleading. |
| O2 | `00d` §8.1 | "There is **no `--sb` / `--sidebar` CSS custom property**" | **OVERSTATED.** `--sb-bg` exists at L12. The intended claim (no *width* token; all four sidebar widths hardcoded) is correct. |
| O3 | `00d` F18 | "L396 **and L400** set `direction:ltr;text-align:right` on **inputs and selects**" | **OVERSTATED.** L396 covers `input,select`; **L400 covers `input` only**, and `#stab-security` contains no `select`. Half-scoped. |
| O4 | `00d` F2 | "all five label settings panels added **after the original translation pass**" | **UNSUPPORTED.** Chronology is not recoverable from a single-file snapshot; no VCS or dated comment supports it. *(The doc's UNVERIFIED discipline is otherwise excellent.)* |
| O5 | `00d` F1 / §5.1 | "Elements carrying a `data-i18n` key: **86**" | **OVERSTATED as a runtime figure.** Static-DOM-true; at runtime it is **89** (86 − 3 removed at L21288 + 6 injected at L21296). |
| O6 | `16j` §8.2 | "the ordering above follows the DOM order" | **OVERSTATED.** True of the *parse-time* DOM only. After `reorderSettingsTabs()` the live order is Daily ops → Money → People → Comms → Platform → Records. The whole table describes a nav the user never sees. |
| O7 | `13c` §17 G6 | "`hours` never read" | **OVERSTATED → WRONG.** See C5. Scoped to `slaState` it is true. |
| O8 | `13c` §5 F12 | `pushOpsNotification(…)` "written out **exactly**" | **OVERSTATED.** Source L14945–L14946 carries a `typeof onCallName==='function'` guard with an `'unassigned'` fallback and an IIFE-bound closure over `t.id`; the doc's transcription drops both. Semantically close, textually not exact. |
| O9 | `15k` §7.2 | §7 promises formulas "written out **exactly**" | **OVERSTATED (×2).** `updBreached` is given as `updDue<0`; source L14785 is `updDue!==null&&updDue<0`. `resPct` is given as `elapsedRes/resMs*100`; source L14786 is `resMs?(elapsedRes/resMs)*100:0`. Behaviourally identical, textually not exact; `frMissed` (L14783) is omitted without note. |
| O10 | `15k` §7.4 / §10.5 | The compensation-authority model's coverage | **OVERSTATED by omission.** `compCheck` only ever runs inside `if(reason.indexOf('Goodwill')>=0)` (L3985), and `compPreview` returns early on the same test (L15453). A "Trip cancellation refund" or "Manual top-up" credit **bypasses the entire authority model**. The doc never says this. |
| O11 | `13d` M6 | `999` fallback "silently dropping" the row | **OVERSTATED.** See V4. |
| O12 | `13d` §2.1 | "**Exhaustive** … and no others" | **OVERSTATED.** See V5. |
| O13 | `13d` §12.1 | "Row click \| No whole-row handler" | **Technically true, presented as design.** `.al-row{…cursor:pointer…}` (L158) means the row *presents* as clickable and does nothing — that is a defect, not a layout fact. |
| O14 | `16h` §8.3 | "The default and the first branch are identical, so the regex on `goodwill\|apolog` is **redundant**" | **OVERSTATED.** L19983–L19984 is a **precedence** rule, not a redundancy: a reason matching *both* regexes (e.g. "Goodwill compensation") books to `expense.goodwill` **because** of the first branch. The doc's second clause ("any reason that is not `/compensat/i` books to goodwill") is correct. |
| O15 | `16i` §7.2 / §13 item 4 | The two-clocks claim | **See R1.** Logged as WRONG because the stated fact ("the rest of the panel runs on `REQ_NOW_REF`") is false, not merely broad. |

**UNSUPPORTED: none found.** All eight documents carry an explicit `UNVERIFIED items` section and use it honestly — `13d` flags `pickNearbyDriver`'s branches, `13c` flags ten helper bodies and `QUEUE_LABEL`, `16h` flags the backend's existence, `16k` flags whether the 500 cap is ever reached. **Two documents flag a premise as unread and then assert the conclusion built on it** (`13c` G22→G12; `16h` §10→§1/§5/§6); those are classified WRONG in §4, because the conclusion is falsifiable and false — but the flagging itself is correct practice and is what made both errors findable.

---

## 7. Cross-document contradictions

| # | Topic | Doc A says | Doc B says | Source verdict | Correct answer |
|---|---|---|---|---|---|
| **X1** | Is reason-code `owner` dead? | `15k` §9/§13.1: **DEAD** — "no owner filter, owner report, or owner routing anywhere" | `13a` L154/L481 and `13c` L19/L564/L746/L900: `owner` is a rendered CPT column with reading instructions | **L14831** (SLA detail chip), **L15001 → L15035**, header **L15041**, panel copy **L15044** | **`13a` and `13c` are correct. `15k` is WRONG.** |
| **X2** | `gvRC()` behaviour | `13c` §17 G12: reads the **wrong** element; wrap-up/log-contact always code `OTHER_UNCODED` | `13a` L508/L764: "`reasonSelectHTML` always emits the hidden field id **`nt-reason`** regardless of the wrapper id, and `gvRC()` reads that one id… every call site works only because exactly one modal is open at a time" | **L14761** + **L5352** | **`13a` is correct. `13c` is WRONG.** The pass-2b brief itself inherited `13c`'s error. |
| **X3** | Name of the SLA stamping function | `13c` (5 places): **`slaOpen()`** L14843 | `13a` L103/L838: `slaStampNewTicket()` L14839–L14851 | `grep -ni slaopen` → **0** | **`13a` is correct.** |
| **X4** | The audit log's 500-entry cap line | `16j` and `16k`: **L3146** | `00c`: **L3151** | L3148 is `if(DB.auditLog.length>500)DB.auditLog.length=500;` | **All three docs are wrong, in three different ways.** L3146 is `};`, L3151 is the function's closing brace. |
| **X5** | The forced re-render line | `16j` and `16k`: **L3147** | — | **L3149** (L3147 is `DB.auditLog.unshift(entry);`) | Both wrong; shared upstream error. |
| **X6** | `exportAuditLog()` button line | `16j` **L2027** | `16k` **L2027** (×4) | **L2031**; L2027 is `exportRiders()` | Consistent-but-wrong across both. |
| **X7** | Are the 7 `stabgrp.*` keys dead? | `00d` §4.2B/F5 and `16j` §10/§13/§14.11: **dead / abandoned refactor** | `03c` L546: "`stabgrp.comms` … — **L21274**" | `SETTINGS_GROUPS` L21270–L21277 → `setAttribute` L21296 / L21307 → `reorderSettingsTabs()` L21278, called from `presenceBoot()` L21393, booted at L21825 | **`03c` — an already-audited document — is right; `00d` and `16j` are both wrong.** True orphan count is **1**. |
| **X8** | Nav group label lines | `16j` §8.2: **1421 / 1425 / 1436** | `00d`: **1420 / 1424 / 1436** | L1420 `stabgrp.workspace`, L1424 `stabgrp.operations`, L1436 `stabgrp.system` | **`00d` is correct.** Note `16h` and `16i` also use the wrong **L1425**. |
| **X9** | `DB.reasonCodes` array bounds | `13c` L14667–**L14713**; `13a` L14667–**L14722**; `13d` L14667–**L14713** | `15k` and `12c`: **L14667–L14716** (last entry L14715) | L14667 opens the array; L14715 is `OTHER_UNCODED`; L14716 closes it | **`15k` / `12c` are correct.** Four other documents are wrong in three different ways. *Every doc's **count** of 40 is right.* |
| **X10** | Number of seeded reason codes | `00d` §8.3C: **47** | `12c`, `13a`, `13c`, `13d`, `15k`: **40** | `grep -c "{code:'"` over L14669–L14715 → **40** | **The 40-consensus is correct; `00d` is the outlier.** |
| **X11** | Reason-code distribution counts | `15k` §8b: T2 14 / T3 14 / T4 8; rider 28 / driver 10; comp>0 9 / comp:0 31 | `12c`: 30 `comp:0`, 10 `comp>0` | T1 4 / **T2 12** / **T3 15** / **T4 9**; rider **29** / driver **9** / corp 2; comp>0 **10** / comp:0 **30** | **`12c` is correct on comp; `15k` is wrong on all three splits** — while its own per-code table is flawless. |
| **X12** | `renderInterventionsPage()` range | `13d`: L10338–**L10344** | `03a` L427: L10338–**L10345** | L10345 is the closing brace | **`03a` is correct.** |
| **X13** | `refreshOwnershipSurfaces()` range | `13d`: L19048–L19056; `03a`: L19048–L19057; `03b`: L19045–L19058; `16i`: L19045–L19056 | — | **L19045–L19057** | **No document has it exactly right.** `03b`/`16i` have the right start, `03a` the right end. |
| **X14** | `buildInterventionItems()` range | `13d`: L9450–**L9533** | `03a`/`03b`: L9450–**L9532** | L9533 is the closing brace | **`13d` is correct.** |
| **X15** | `#dash-intervene-count` / `Open ticket` button | `13d`: L10442 / L9469 | `03a`: **L10443** / **L9468** | — | **`03a` is correct on both.** |
| **X16** | `applyLanguage()` location | `03a` L353/L414: **L7907–L7924** | `00d`, `00b`: **L7939–L7953** | L7939 declares `applyLanguage` | **`00d` / `00b` are correct; `03a` is stale.** *(Pass 2 already logged this for `03a`.)* |
| **X17** | `ACTION_LABELS` name and shape | `16k` §8.1: `ACTION_LABELS`, L2898, 26 keys, sole consumer L9238 | `00c`: same name, same line, 26 keys | `grep -on ACTION_LABELS` → L2898 (decl), L9238 (×2); 26 keys counted mechanically | **No contradiction — both correct.** `16j` never names the map and defers to `16k`. `grep -c AUDIT_LABELS` → **0**, so pass 2's C1 stands. Only the *ranges* differ: `16k` says L2898–**L2911**, `00c` says L2898–**L2913**; actual is **L2898–L2909**. |

---

## 8. Negative-claim verification results

**107 strong negatives tested. 100 hold. 7 are false.** Pass 2 tested 30 and found 30 true; this pass is the first to find false negatives in the corpus — all seven come from four documents.

### The claims flagged in the brief

| # | Claim | Grep | Hits | Verdict |
|---|---|---|---:|---|
| N1 | `renderOnCall()` targets `#oncall-body`, which does not exist → `DB.onCall`, `saveOnCall()`, `onCallNameSimple()` all dead (`16i`) | `grep -on "oncall-body"` | **1** — L15790, the `getElementById` itself | ✅ **TRUE.** `renderOnCall()` *is* called (L8819, settings router) and returns at L15791. `saveOnCall`'s only other reference is a `GATE_SPECS` entry (L18332), not a call. `onCallNameSimple` is referenced only from L15803/L15804 inside `saveOnCall`. `DB.onCall` (L15776) is written only by `saveOnCall`, read only by `onCallNameSimple`. **Fully dead.** |
| N2 | `onCallName('secondary')` has zero call sites (`16i`) | `grep -on "onCallName(['\"]secondary"` | **0** | ✅ **TRUE.** `onCallName(` has exactly two occurrences: the declaration L19645 and **one** call at L14945, which passes `'primary'`. The escalation tier never auto-fires. |
| N3 | `#meta-reasons` (L1796) is never populated by `renderSettingsMeta()` (`15k`, `16j`) | `grep -n "meta-reasons"` | **1** — L1796 only | ✅ **TRUE.** `renderSettingsMeta()` (L7339–L7342) writes exactly 11 ids from its map at L7340; `meta-reasons` is not among them, and no other writer exists. *(Both docs cite the function's own line wrong — `15k` L7342 — but the negative holds.)* |
| N4 | `rcCompCap()` is dead (`15k`) | `grep -n rcCompCap` | **1** — L14742, the definition | ✅ **TRUE.** |
| N5 | `breachEscalateTo` is dead (`15k`) | `grep -n breachEscalateTo` | **1** — L14658, the definition | ✅ **TRUE.** Escalation uses `onCallName('primary')` at L14945 instead. |
| N6 | `target` is dead in the reason-codes tab (`15k`) | `grep -n "rc\.target\|\.target===\|r\.target"` | **0** outside the seed and the `addReasonCode` push (L15120) | ✅ **TRUE.** |
| N7 | **`owner` is dead** (`15k`) | `grep -n "\.owner\b"` | **5** outside the seed: L14831, L15001, L15035, L15086, L15104 | ❌ **FALSE.** See §4.3 K1 and §7 X1. |
| N8 | `hours:'business'` is dead (`15k`) | `grep -n "\.hours\b\|'business'"` | L14655 (seed), **L15136** (display only) | ✅ **TRUE as scoped** — declared, displayed, never acted on. `slaState()` (L14766–L14790) has no calendar term. *(`13c` states the same claim without the display qualifier and is therefore wrong — C5.)* |
| N9 | **`gvRC()` reads `#nt-reason`, the wrong element, for two pickers** (`13c`) | `grep -on "nt-reason"` + read L5336–L5353, L14750–L14762 | 4 — L2423, L2546, **L14751**, **L14761** | ❌ **FALSE.** `reasonSelectHTML` hard-codes `fieldId='nt-reason'` (L14761) for every picker; `customSelectHTML` emits the hidden input as `id=fieldId` (L5352). `gvRC()` reads the open picker correctly. |
| N10 | No `go('interventions')` call site exists (`13d`) | `grep -nE "go\(\s*['\"]interventions['\"]"` | **0** | ✅ **TRUE**, re-confirmed. Also 0 sidebar entries (29 `.sb-item` rows, L487–L540) and 0 hash-router hits (`location.hash`, `hashchange`, `pushState`, `URLSearchParams`, `popstate` → 0 each). **The page is reachable only from the console or via `goBack()`** — the reachability claim survives end-to-end. |
| N11 | `refreshOwnershipSurfaces` calls a non-existent `renderInterventions` (`13d`) | `grep -nE "renderInterventions\b"` | **1** — L19054, the call site itself | ✅ **TRUE.** `renderInterventionsPage` is a different symbol (4 hits: L8788, L10338, L10447, L14587). The call at L19054 is guarded by `typeof renderInterventions==='function'` and is a **silent no-op** — and the doc says exactly that, so it is **not overstated**. |
| N12 | `LANG_STRINGS` has 88 Arabic keys and no `en` branch (`00d`) | key extraction over L7904–L7937 | **88** unique; **1** branch (`ar:{` L7904 … closes L7937) | ✅ **TRUE.** |
| N13 | 5 markup keys missing from the dict (`00d`) | set difference, markup keys minus dict keys | **5** | ✅ **TRUE** — `stab.branding` (L1431), `stab.integrity` (L1432), `stab.rota` (L1433), `stab.ledger` (L1434), `stab.pricing` (L1435). Each appears exactly once, in markup only. *(`16h` and `16i` independently assert their own key is missing — both correct.)* |
| N14 | **7 orphan `stabgrp.*` keys** (`00d`, `16j`) | static set difference, then `grep -n "stabgrp\."` file-wide | **7 statically**, but 6 are consumed at L21271–L21276 and the 7th at L21307 | ❌ **FALSE as stated.** True orphan count is **1** (`stabgrp.other` — its `leftovers` branch is unreachable because `SETTINGS_GROUPS` covers all 21 tabs). |
| N15 | Zero `Intl` usage anywhere (`00d`) | `grep -cE 'Intl'` / `NumberFormat` / `DateTimeFormat` / `RelativeTimeFormat` / `PluralRules` | **0 / 0 / 0 / 0 / 0** | ✅ **TRUE.** Also 0 Arabic-Indic digits and 0 riyal glyphs. |
| N16 | Currency and timezone settings are write-only (`00d`) | `grep -nE '\.currency\|currency:'` / `'\.timezone\|timezone:\|cfg-gen-tz'` | reads at 7982/7989/7994–5 only (the settings form itself) | ✅ **TRUE** for both. *(One citation is misattributed — D8 — and there is an unmentioned second hardcoded `currency:'SAR'` on `DB.rateCard` L21435.)* |
| N17 | `applyLanguage` uses `textContent`, destroying inline markup (`00d`) | read L7949, L7951 + victims | L7949 caches `el.textContent`; L7951 assigns it; L1502 and L1992 both contain inline markup | ✅ **TRUE**, both victims confirmed. |
| N18 | `audit.summary` injected as raw unescaped HTML (`16k`) | read L9296–L9305 | L9301 concatenates `e.summary` straight into a `<td>` | ✅ **TRUE.** No escaping in `auditRowsHTML`, `auditDiffHTML` or `auditEntityLink`. |
| N19 | `AUD-####` ids collide past the 500 cap (`16k`) | L3136 + L3148 | `id:'AUD-'+String(DB.auditLog.length+1).padStart(4,'0')` with `length` pinned at 500 | ✅ **TRUE.** Every entry past the 500th is `AUD-0501`. Matches `00c`'s derivation, which pass 2 verified. |
| N20 | ~160 distinct `logAction` keys vs 26 in `ACTION_LABELS` → ~84% unfilterable (`16k`) | full extraction + set diff (see §10) | 220 sites / **161** keys / **26** labelled / **135** unlabelled / **189** unlabelled sites | ✅ **TRUE, and the doc is more precise than the brief.** 189/220 = **85.9% → "86%"**, which is what `16k` says. The brief's "~160 / ~84%" is the looser figure. |
| N21 | Five money paths monkey-patched to post while payouts/escrow/deductions/tips do not (`16h`) | `grep -on postLedger` + call-site audit | 7 `postLedger` call sites, all inside L19961–L20048; **0** near L7034/L7055/L7069/L7082/L12450 | ✅ **TRUE that the four legacy paths do not post** (verified at L7034 `pay_driver`, L7055 `process_all_payouts`, L7069 `release_escrow`, L7082 `apply_deduction`, L12450 `trip_tip` — all exact). ⚠ **but "five paths post" is wrong**: only `creditRiderWallet` and `debitRiderWallet` reach `postLedger` in practice, plus `postFareCapture` at boot. See H1. |

### Further negatives verified in this pass

| Claim | Doc | Grep | Hits | Verdict |
|---|---|---|---:|---|
| `DB.onCallSchedule.overrides` is read but never written | `16i` | `grep -on "onCallSchedule.overrides"` | **1** — L19634, the read | ✅ TRUE — the `' (cover)'` suffix (L19648) and `onCallNow().override` are permanently unreachable |
| `var me` in `openHandover` is unused | `16i` | read L19680–L19707 | 0 uses | ✅ TRUE |
| No readers of `DB.ledger` / `accountBalance` / `trialBalance` / `idemStats` outside the ledger module | `16h` | `grep -on` each | all hits within L19879–L20136 | ✅ TRUE |
| `ar.rider` and `liability.escrow` are never posted to | `16h` | posting-block inspection | 0 | ✅ TRUE |
| `withIdempotency`'s `seen.lastAttemptMs` is written and never read | `16h` | `grep -on lastAttemptMs` | **1** — L19897 | ✅ TRUE |
| `⛔ OUT OF BALANCE` (L20077–L20078) is unreachable | `16h` | derivation from `postLedger` | — | ✅ TRUE |
| `postFareCapture` returns `true` even when both postings were refused | `16h` | L20049 `return true;` | — | ✅ TRUE |
| `requirePagePerm('audit-log','view')` has zero call sites | `16k`, `16j` | `grep -n "requirePagePerm(['\"]audit-log\|canPage(['\"]audit-log"` | **0** | ✅ TRUE — declared L10650, defaulted, shown in the matrix, never enforced |
| `ACTION_LABELS` is consumed in exactly one place | `16k` | `grep -on ACTION_LABELS` | L2898 (decl), **L9238 only** | ✅ TRUE |
| No label is orphaned | `16k` | set difference | **0** | ✅ TRUE |
| No non-literal `logAction` key exists | `16k` | `grep -oE "logAction\([^'\"]"` | 2 — the declaration L3133 and a comment L2855 | ✅ TRUE |
| `exportAuditLog()` is not itself audited | `16k` | read L7623–L7626 | no `logAction` | ✅ TRUE — unlike `doExport()` (L9215) |
| `DB.telephony.wrapUpSec` never read | `13c` | `grep -n wrapUpSec` | **1** (L20174) | ✅ TRUE |
| `sess.note` stored, never displayed | `13c` | grep + read L20350–L20359 | written L20306 only | ✅ TRUE |
| `ev.status:'Open'` write-only | `13c` | grep + read L16259–L16266 | written L16119 only | ✅ TRUE |
| `_pendingRing` orphaned by `✕` / `Open 360°` | `13c` | `grep -n _pendingRing` | 4; `closeModal` (L5216) does not clear it | ✅ TRUE |
| Nothing on `p-contacts` reads/writes `DB.commLogs` | `13c` | `grep -n commLogs` | 6, none on this page | ✅ TRUE |
| `logDriverCall` has no audit and no permission check | `13c` | read L8559–L8571 | 0 / 0 | ✅ TRUE |
| A T1 code can never register `frBreached` | `13c` | L14782 `frMs>0` + T1 `firstResponseMin:0` | — | ✅ TRUE |
| `handledMin` is patched by array position (`DB.contacts[0]`) | `13c` | L20313 + L16238 | — | ✅ TRUE |
| No page-level permission gate on `go('interventions')` / `go('contacts')` / `go('audit-log')` | `13d`, `13c`, `16j` | read `window.go` L8774–L8828 | **0** `requirePerm` | ✅ TRUE in all three |
| No dismiss/snooze/claim/bulk on Interventions; no i18n | `13d` | read L2068–L2076 | 0 | ✅ TRUE |
| Dead second `DB.upcomingSubTrips` seed (L6243–L6248) can never run | `13d` | guarded re-assignment after a non-empty seed | — | ✅ TRUE |
| `assignManually` never refreshes the Interventions page | `13d` | read L11871–L11879 | `renderRequestsPage();renderRideRequests();` only | ✅ TRUE |
| Zero `data-i18n` inside `#stab-ledger` / `#stab-rota` / `#stab-activity` / `#stab-reasons` / `#p-audit-log` | `16h`, `16i`, `16j`, `15k`, `16k` | pane reads | **0** each | ✅ TRUE (5 claims) |
| No `localStorage` / `sessionStorage` / `indexedDB` / `document.cookie` anywhere | `00d`, `13c` | `grep -c` each | **0** each | ✅ TRUE — consistent with pass 2 N11/N12 |
| `auditForEntity()` is not used by the Settings activity pane | `16j` | `grep -n "auditForEntity("` | 2 — def L9292, call L4297 | ✅ TRUE |
| `settingsLastUpdated` is read only by `renderSettingsMeta` | `16j` | `grep -n settingsLastUpdated` | 2 — def L7335, call L7341 | ✅ TRUE |
| `saveDataWindow` does not call `renderSettingsMeta` | `16j` | grep over L20505–L20530 | **0** | ✅ TRUE |
| `'Search 38 reason codes…'` placeholder (L14762) is stale against 40 active codes | `13a`, `13c`, `15k` | L14762 vs 40 | — | ✅ TRUE — three docs agree, source confirms |
| **`DB.commitPolicy` — "every one of the 20 keys has a reader outside Settings"** | `15k` | `grep -n riderWaitMin` / `riderNoShowPayPct` / `payoutDays` | 2 each (seed + settings field) | ❌ **FALSE** — 3 keys are dead |
| **`.timezone` read at L19760 is the General setting** | `00d` | read L19760 | reads `DB.onCallSchedule.timezone` | ❌ **FALSE** (misattribution; the write-only verdict survives) |
| **The panel runs on a frozen `REQ_NOW_REF` clock** | `16i` | `grep -n "function nowMs"` | L14627 `function nowMs(){return Date.now();}` | ❌ **FALSE** — see R1 |
| **The last `data-i18n` in the file is L1992** | `00d` | `grep -n data-i18n \| tail` | L21307 | ❌ **FALSE** — see D1 |

---

## 9. Formula audit

### 9.1 `16h` — ledger and idempotency (money-critical). **20 formulas re-derived. 20 match.**

| # | Formula | Doc says | Source | Verdict |
|---|---|---|---|---|
| 1 | `r2(n)` | `Math.round((n\|\|0)*100)/100` | L19883, identical | ✅ **MATCH** |
| 2 | `idemKey(...)` | `slice(arguments).map(p => String(p==null?'':p)).join('\|')` | L19889–L19892, identical | ✅ **MATCH** |
| 3 | `withIdempotency` | replay-first-result; `attempts+1`; `lastAttemptMs`; `fn()` **before** the register write | L19893–L19908, identical, including the ordering the doc calls out as correct-for-retry | ✅ **MATCH** |
| 4 | `idemStats()` | `operations/duplicated/suppressed` with `reduce(s + attempts-1)` | L19909–L19914, identical | ✅ **MATCH** |
| 5 | `postLedger` balance check | reject if `unknown.length \|\| r2(dr)!==r2(cr)` — **exactly two rules** | L19921, identical; no third rule exists | ✅ **MATCH** |
| 6 | Journal id | `'JE-'+String(DB.ledger.length+1).padStart(5,'0')` | L19929, identical | ✅ **MATCH** |
| 7 | `accountBalance` | `debitNormal=(asset\|\|expense\|\|contra)`; `r2(debitNormal?dr-cr:cr-dr)` | L19945–L19946, identical | ✅ **MATCH** |
| 8 | `trialBalance` | rows over `Object.keys(ACCOUNTS)`; `balanced: r2(dr)===r2(cr)` | L19948–L19957, identical | ✅ **MATCH** |
| 9 | `ledgerReconcile` — wallet row | sum of `rider.wallet.balance` vs `accountBalance('liability.wallet')` | L20058–L20063, identical | ✅ **MATCH** |
| 10 | — refunds row | sum of `r.amount` vs `accountBalance('contra.refunds') + accountBalance('tax.vat_output')*0` | L20064–L20065, identical, `*0` and all | ✅ **MATCH** |
| 11 | — goodwill row | sum of `g.amount` vs `accountBalance('expense.goodwill')` | L20066, identical | ✅ **MATCH** |
| 12 | — diff | `r2(ops - ledger)` | L20067, identical | ✅ **MATCH** |
| 13 | **The ~13% permanent refund gap** | ledger books net-of-VAT while `DB.refunds[].amount` is gross → permanent ~13% difference | `net = amount/1.15` → gap `= amount·(0.15/1.15) = 13.04%` of gross | ✅ **MATCH** — derivation independently reproduced |
| 14 | `postFareCapture` VAT split | `rate = ratePct/100`; `net = r2(gross/(1+rate))`; `vat = r2(gross-net)` | L20037–L20038, identical | ✅ **MATCH** |
| 15–20 | The seven posting specifications (`fare_capture`, `driver_accrual`, `refund`, `wallet_credit`, `wallet_debit`, `emergency_cover`, `emergency_recovery`) — every Dr/Cr account, every amount expression, every `meta` payload | §8.3 table | L20040–L20044, L20045–L20048, L19969–L19973, L19985–L19988, L19997–L20000, L20014–L20017, L20018–L20021 | ✅ **MATCH, all seven, and every one of those line citations is EXACT** |
| — | The five idempotency-key formulas | §8.5 table, incl. the 1-second `Math.floor(nowMs()/1000)` bucket on both wallet paths | L19963, L19980, L19994, L20009, L20035 | ✅ **MATCH, all five, all citations exact.** The 1-second-window vulnerability is real. |

**Two *derived assertions about* these formulas are wrong** — H3 (the impossible rounding rejection) and H5 (the walk decomposition). The formulas themselves are perfect. See §4.1.

### 9.2 `13c` — queue metrics, SLA and CPT. **17 formulas re-derived. 17 match.**

| Formula | Source | Verdict |
|---|---|---|
| `cptStats` — trips `\|\|1`; inbound-only; `cpt=(n/trips)*1000`; `breachPct = linked?Math.round(breached/linked*100):0`; sort `b.n-a.n`; `uncodedPct = total?(uncoded/total)*100:0` | L14984–L15009 | ✅ **MATCH** operator-for-operator, incl. rounding order and both guards |
| Per-row share `st.total?Math.round(r.n/st.total*100):0` | L15033 | ✅ MATCH |
| `slaState` — all 13 returned fields, incl. `frMs>0` guards, `resMs?…:0`, `updDue!==null&&updDue<0`, pause accumulation | L14766–L14790 | ✅ **MATCH, character-for-character** |
| `rcTargets` — `fr`/`res` override-else-tier; `upd` with **no** tier fallback; tier default `'T3'`; `pause:t.pauseOnCustomer` | L14730–L14739 | ✅ MATCH |
| `queueStats` — `answered = !abandoned && handledSec!=null`; `aht`/`asa` over answered only; `withinTarget = (waitSec\|\|0)<=targetAnswerSec`; `abandonRate` guard→0; `serviceLevel` guard→**100**; rounding after averaging | L20322–L20334 | ✅ **MATCH**, incl. both divide guards, both fallbacks and the rounding position |
| AHT display `Math.floor(ahtSec/60)+'m '+(ahtSec%60)+'s'` | L20341 | ✅ MATCH |
| Live call timer `Math.round((nowMs()-answerAtMs)/1000)` + `padStart(2,'0')` ×2 | L20269–L20270 | ✅ MATCH |
| Wrap-up header seconds/minutes | L20279, L20281 | ✅ MATCH |
| `handledMin = Math.round(sess.handledSec/60)` | L20313 | ✅ MATCH |
| Channel-strip AHT — filter `handledMin>0`, mean, `aht?aht.toFixed(1)+' min':'—'` | L16249–L16250, L16258 | ✅ MATCH |
| Contacts badge `br\|\|ar\|\|0`, class `(br?'a':'n')` | L14962–L14968 | ✅ MATCH |
| `slaSweep` fire-once-per-kind + three messages incl. `Math.round(resTargetMin/60)+'h'` | L14937–L14953 | ✅ MATCH on all arithmetic *(transcription lossy — O8)* |
| `backfillReasonCodes` — `ages=[190,26,1500,55,8]`; `agoMs(ages[i%len])`; `12*60000`; `40*60000`; `agoMs(360)` | L15191–L15212 | ✅ MATCH |
| Mass-event match — `since=nowMs()-windowMin*60000`; `openedAtMs>=since && !resolvedAtMs`; grouping `i>0`; `pausedSinceMs\|\|nowMs()`; notify dedupe **with** `v&&` | L16084–L16131 | ✅ MATCH |
| Phone normalise `replace(/[^\d]/g,'').slice(-9)`; riders-then-drivers | L20178–L20189 | ✅ MATCH |
| Card dedupe `filter((v,i,a)=>a.indexOf(v)===i).length` — correctly **without** `v&&`, unlike the notify dedupe | L16264 | ✅ MATCH — a genuinely subtle distinction, correctly drawn |
| "Promise kept" `resolved.length?Math.round(kept/resolved.length*100):100` | L15024 | ✅ MATCH |

**Zero mismatches.** Every clamp, guard (`\|\|1`, `total?`, `resMs?`, `answered.length?`, `s.length?`), rounding position and division order is reproduced correctly. This is the strongest section of any of the eight documents.

### 9.3 Other formula sets

- **`15k`** — 30 formulas re-derived: `rcTargets` tier lookup and all four field rules, the pause accumulator, `elapsedFr` (never pauses) vs `elapsedRes` (pausable), `frBreached`/`resBreached`/`updBreached`, the 75% at-risk threshold, the 5-step `compCheck` order, both goodwill windows (24 h agent, 30 d rider), `compLimitsFor`, the `__compApproved` second-approval flag, `logGoodwill`'s id/unshift, the commit-policy save coercion, the `regulatorCancelLimit*0` dead sub-expression, and `saveReasonCodes`' numeric coercion. **28 exact, 2 lossy transcriptions (O9).** Its most consequential finding — that `saveReasonCodes` pre-fills inputs with **resolved** values (`tg.*` at L15083–L15084) and writes them back as per-code overrides (L15105), destroying tier inheritance on the first save — is **verified and correct**.
- **`13d`** — 11 formulas (`ivUrgencyLabel` bands 15/30/60, SLA classification with `atRiskPct=75` at L14657, request classification L9476–L9488, sub-trip classification, sort assembly with the sort-key scale mismatch, the off-by-one badge count from counting the separator string, `#dash-intervene-count`, `#sbb-dash`, `'pickup in '+fmtCountdown`, the `.js-wait` patch, the 1-min-per-min `minutesUntil` decrement) — **all 11 correct**, several with exact line ranges.
- **`16i`** — 12 checked. `slotKey`, `currentBlock` (including the wrap-midnight branch), `currentDayKey` (including the night-rollback `(idx+6)%7`), `onCallNow` (including `.pop()` last-override-wins and the `covered=!!u` vs `rotaGaps` `!assign[key]` disagreement), `rotaGaps` severity rule, `rotaStats`, `setRotaSlot`, `commitHandover`, `myOpenClaims`, `rotaBoot` — **all exact.** The **13-of-42 seeded-gap derivation is independently reproduced**: `night && di%2===0` → 4 days × 2 tiers = 8; `WEEKEND && escalation` → 2 days × 3 blocks = 6; minus 1 overlap (sat night escalation) = **13**; coverage 29/42 → `Math.round(69.05)` = **69%**; all 13 are `severity:'high'`. ✅
- **`16k`** — 9 checked (`logAction` record construction, `auditDiffHTML`'s four rules including the invisible-deletion consequence, the three-predicate filter, pagination clamps, `auditPagerHTML`, `#audit-count`, `exportAuditLog`'s 7-of-10 projection, `auditForEntity`, `auditEntityLink`) — **all exact.** The 86%/14% arithmetic checks out (189/220 and 31/220). The `saveCancellationPolicy` identity-comparison analysis is verified: L7371 takes a deep clone as `before` while L7383 passes the **live** array as `after`, so `before[k]!==after[k]` compares distinct objects and every index renders as changed. ✅

---

## 10. Enumeration completeness checks

**117 enumerations claimed exhaustive. 103 verified complete and correct. 14 wrong.**

### The standout: `16k` §8.1 + §9.3 — 100% exact

I extracted every `logAction('<key>'` occurrence from all 21,857 lines by script and diffed against `Object.keys(ACTION_LABELS)`:

| Measure | `16k` claims | Independently derived | Verdict |
|---|---:|---:|---|
| `logAction(` call sites with a literal key | 220 | **220** | ✅ |
| Distinct action keys | 161 | **161** | ✅ |
| Keys in `ACTION_LABELS` | 26 | **26** | ✅ |
| Keys with no label | 135 | **135** | ✅ |
| Call sites using an unlabelled key | 189 (86%) | **189** (85.9%) | ✅ |
| Labels defined but never used | 0 | **0** | ✅ |
| `config_updated` call sites | 40 | **40** | ✅ |
| Labelled call sites | 31 of 220 | **31** | ✅ |
| **§9.3's 135-row table** — key, site count, **and every line number** | 135 rows | script-compared row by row: **135 OK, 0 mismatches**; set difference empty in both directions | ✅ **flawless** |
| **§8.1's 26-row table** — key, label, site count, line numbers, source order | 26 rows | script-compared: **0 mismatches**; order matches L2899–L2908 exactly | ✅ **flawless** |

That is 161 rows carrying ~322 independently checkable assertions and roughly 220 line numbers, with **zero** errors. Nothing else in the 61-document corpus matches it.

### The rest

| Enumeration | Doc | Claimed | Derived | Verdict |
|---|---|---:|---:|---|
| `ACCOUNTS` chart of accounts — key, label, type, order | `16h` | 12 | **12**, all three columns exact, in declaration order | ✅ |
| Ledger entry types | `16h` | "8" in §8.2 | **7** (7 `postLedger` call sites) | ❌ H4 |
| Idempotency-key formulas | `16h` | 5 | **5**, all exact | ✅ |
| Reconciliation rows · summary stats · journal fields · register fields · reject fields | `16h` | 3 · 6 · 7 · 6 · 5 | all match | ✅ ×5 |
| Money paths that do NOT post | `16h` | 8 | all 8 verified (L7034, L7055, L7069, L7082, L12450, L15436, L15862, corporate) | ✅ |
| Rota slots · blocks · tiers · days | `16i` | 42 · 3 · 2 · 7 | **42 = 7×3×2**; blocks L19600–L19602 exact; tiers L19603 exact; `DAY_KEYS`/`DAY_LABEL`/`WEEKEND` L19594–L19596 exact | ✅ ×4 |
| Handover record fields · override shape · audit keys · grid options · grid rows/cols | `16i` | 11 · 6 · 4 · 6 · 6×8 | all match | ✅ ×5 |
| `DB.reasonCodes` — 40 codes, member-for-member (code/ref/cat/target/tier/fr/res/upd/comp/owner/labelEn/labelAr) | `15k` §8b | 40 | **40**, all 40 rows correct on all columns, in source order — **~480 cells, zero errors** | ✅ |
| Same 40-row table, 10 columns | `13c` §7.1 | 40 | **40**, ~400 cells, **100% correct** | ✅ |
| Reason-code splits by tier / target / comp | `15k` | T2 14, T3 14, T4 8 · rider 28, driver 10 · 9/31 | **4/12/15/9 · 29/9/2 · 10/30** | ❌ ×3 (K3–K5) |
| Reason-code count | `00d` | 47 | **40** | ❌ D6 |
| `DB.reasonCodes` categories · owners · `upd` clocks · `active` | `13c`, `15k` | 11 · 9+null · 2 · all 40 | all match | ✅ ×4 |
| SLA tiers · non-tier scalars · comp roles · comp scalars · commit fields · dispatch fields | `15k` | 4 · 3 · 5 · 3 · 14 · 6 | all match | ✅ ×6 |
| `LANG_STRINGS.ar` keys · prefix split · markup `data-i18n` · markup prefix split · intersection · markup∖dict | `00d` | 88 · 30/16/16/16/10 · 86 · 30/16/16/21/3 · 81 · 5 | **all exact** | ✅ ×6 |
| Page shells · `stab-*` panels · sidebar keys · `p-settings` keys · `toLocale*` sites (with arguments) · `fmtSAR` line list · Arabic-script lines | `00d` | 41 · 21 · 39 · 47 · 19 · 92 · 86 | **all exact, every line number included** | ✅ ×7 |
| Dict∖markup ("orphans") | `00d`, `16j` | 7 | **1** at runtime | ❌ D2/J1 |
| Unique element ids | `00d` | 621 static-shell | **485** static shell / 621 file-wide | ❌ D4 |
| `tripScenario` states · intervention row variants · excluded scenarios · sources · `scCfg` · constants · urgency bands · `DB.rideRequests` seed · sidebar entries · page buttons | `13d` | 7 · 8 · 4 · 3 · 3 · 2 · 4 · 3 · 29 · 3+1 | **all exact** | ✅ ×10 |
| `DB.upcomingSubTrips` live seed | `13d` | UST-1…UST-4 | **UST-1…UST-8**, L6177–L6241 | ❌ V3 |
| `slaBadge` states reachable on this page | `13d` | 5 | **4** | ❌ V1 |
| `chLabel` channels · picker channels · direction · outcome · breach kinds · window options · driver-response options · badge order · `priorityCall` sites · `callDriverUrgent` sites · `DB.commLogs` seed · queue figures · table columns · CSV columns | `13c` | 6 · 5 · 2 · 3 · 3 · 4 · 3 · B0–B8 · 13 · 4 · 6 · 6 · 8 · 9 | **all exact**, including the 13-item `priorityCall` line list and "only 3 of 13 pass an entityId" | ✅ ×14 |
| `openLogContact` sites · external `logContact` writers | `13c` | 6 · 10 | **7 · 11** (the doc's own tables list 7 and 11) | ❌ ×2 (C7, C8) |
| `renderSettingsMeta` map entries · `meta-*` elements (ids **and** lines) · orphan meta elements · settings tab buttons · static nav groups · `.settings-panel` panes · preview columns · full-page columns · audit-entry fields · preview-rendered fields · seeded audit rows · pane affordances | `16j` | 11 · 12 · 1 · 21 · 3 · 21 · 3 · 4 · 10 · 3+diff · 8 · 2 | **all exact** | ✅ ×12 |
| Tabs showing a "last updated" line | `16j` | 11 of 21 | **8 of 21** | ❌ J4 |
| Runtime nav groups | `16j` | 3 | **6** | ❌ J2 |
| Audit record fields · seeded rows · page sizes · actor options · columns · CSV fields | `16k` | 10 · 8 · 4 · 6 · 4 · 7 | **all exact** (5 `DB.teamUsers`, so 6 actor options; seeds L2864–L2871) | ✅ ×6 |
| `16k` §9.4 "Money" cluster | `16k` | 11 | **13** listed | ❌ A5 |

---

## 11. Confirmed-correct highlights — what survived hostile checking

Knowing what to trust matters as much as knowing what not to.

1. **Every money formula in `16h` — all 20 — matched operator-for-operator**, including rounding order, the two-rule rejection test, debit-normal classification, the `*0` dead term reproduced verbatim, all five idempotency-key compositions, and all seven Dr/Cr posting specifications with their `meta` payloads. Combined with pass 2's 28, **48 money formulas have now been re-derived across this corpus and 48 match.** The 1-second idempotency window on both wallet paths, the permanent ~13% refund reconciliation gap, and the never-clearing `liability.driver` accrual are all real and correctly derived.
2. **`16k`'s 161-key audit cross-check is the best enumeration work in the corpus** — 135 unlabelled keys, 26 labelled keys, every site count and every one of ~220 line numbers, verified by script with **zero** errors and set-identical membership. Its headline "86% of audited activity is unfilterable" is more precise than the brief that commissioned this audit.
3. **The 40-row reason-code registry is reproduced flawlessly, twice** — `15k` §8b (12 columns) and `13c` §7.1 (10 columns), ~880 cells between them, zero errors. Only the *derived summary counts* in `15k` are wrong.
4. **`13c`'s 17 queue/SLA/CPT formulas match without exception**, including every divide-by-zero guard, both fallback constants (`serviceLevel`→100, `abandonRate`→0), the `||1` trips guard, and — most impressively — the distinction between the notify dedupe at L16130 (which carries `v&&`) and the card dedupe at L16264 (which does not).
5. **`00d`'s citation discipline is the highest measured in the corpus**: 678 citations, and I could falsify **four**. Four separate full enumerations (88 dictionary keys with their lines, 86 markup keys with their lines and element types, 92 `fmtSAR` lines, 86 Arabic-script lines) reproduce exactly, and the `applyLanguage` code block at L7939–L7953 is byte-accurate including both inline comments. **The predicted template-interior drift does not occur in this document at all.**
6. **`13d`'s reachability finding survives end-to-end.** Zero `go('interventions')` call sites, zero sidebar entries, zero hash routing — and the page nonetheless renders perpetually (boot L14587, every `renderDashboard()` via L10447, the 60-tick at L12614, plus L12471, L12486, L11900, L8496 — all exact). Its `G2` (`renderInterventions` undefined, guarded, dead) is correctly scoped and **not** overstated.
7. **`16i`'s negatives are 10 for 10**, including the non-obvious ones: `#oncall-body` genuinely absent so an entire settings feature is orphaned while its renderer is still called on every settings open; `DB.onCallSchedule.overrides` read at exactly one line and written at none, making the `' (cover)'` suffix permanently unreachable; `onCallName('secondary')` with zero call sites so the escalation tier never auto-fires; and `var me` unused in `openHandover`. Its 13-of-42 / 69% seeded-gap derivation reproduces exactly.
8. **`16j`'s headline is real**: the Settings→Activity pane describes itself as "Every configuration change made in Settings" (L2012) while rendering `DB.auditLog.slice(0,4)` unfiltered (L9350). Its `renderSettingsMeta` map (11 entries), its 12 `meta-*` element ids **and their 12 line numbers**, and its preview-branch code block (character-identical to L9347–L9352) are all exact.
9. **`15k`'s most consequential finding is correct and important**: `saveReasonCodes` pre-fills every SLA input with the **resolved** value (`tg.fr`/`tg.res` at L15083–L15084) and writes it back as a per-code override (L15105) — so the first Save on that tab silently destroys tier inheritance for all 40 codes. Its `regulatorCancelLimit*0` dead-sub-expression finding and its role-key mismatch finding (`'Operations'` matches no user; `'Ops Manager'` falls through to 50/300, *below* Support's 75/600) are both verified.
10. **`16h`'s structural findings survive**, notwithstanding H1–H6: the ledger genuinely is written (by `creditRiderWallet`, `debitRiderWallet` and boot-time fare capture); `⛔ OUT OF BALANCE` genuinely is unreachable; `postFareCapture` genuinely returns `true` even when both postings were refused, so `backfillFareLedger`'s success count is wrong; `backfillFareLedger` genuinely is a post-boot no-op that floods the audit log and toast queue; and payouts, escrow, deductions and tips genuinely do not post (verified at L7034/L7055/L7069/L7082/L12450, all exact).
11. **Pass 2's own findings held up under re-examination.** `ACTION_LABELS` is at L2898 with exactly 26 keys and one consumer at L9238; `AUDIT_LABELS` returns 0; the `AUD-0501` collision derivation is right; the 500-entry cap is real; `DB.ownershipConfig.warnTakeover` at L18853 is still declaration-only.

---

## 12. Required corrections, prioritised

### P1 — Wrong, will mislead a reader (fix first)

1. **`13c` §17 G12 (and §10.1, §10.2, §11 A12, §13.2, §13.7)** — **delete the claim entirely.** `reasonSelectHTML` hard-codes `fieldId='nt-reason'` (L14761) and `customSelectHTML` emits the hidden input under that id (L5352), so `gvRC()` reads the open picker correctly. Replace with `13a`'s correct framing (an id **collision** risk, not a mis-read). Also remove `#wrap-reason` and `#lc-reason`, which do not exist. *(C1, C3, X2, N9)*
2. **`13c` (5 places)** — rename **`slaOpen()` → `slaStampNewTicket()`, L14839–L14852.** `slaOpen` does not exist. *(C2, X3)*
3. **`16h` §10 ⚠ ordering row** — rewrite. `recordRefund` **is** guarded at L17901 (`installActionGates()`, invoked L18089) and `acceptEmergency` **is** guarded at L18260 (`installUniversalGates()`, invoked L18383); both run **before** the ledger patches at L19961/L20007. Consequence to state: the `refund`, `emergency_cover` and `emergency_recovery` entry types cannot be produced through any UI path. Fix `installActionGates` → **L17853**; `commitWalletAdjust` guard → **L17889**. *(H1)*
4. **`16h` §5 ⚠, §6 and §13 item 1** — `demoDoubleRefund()` **does** raise a confirmation (the "Issue refund" gate, L17902–L17907) and **does** open a modal, so "Modals opened: None" is false; and the button can never demonstrate suppression — it always toasts `⚠ Duplicate was NOT suppressed`. *(H2)*
5. **`16h` §7.9 ⚠ and its UNVERIFIED item** — delete. `vat` is the residual (`r2(gross-net)`, L20038), so `net+vat === gross` by construction and `postLedger` can never reject a fare capture or a refund on rounding. *(H3)*
6. **`15k` §9 and §13.1** — `owner` is **live**: L14831 (SLA detail chip), L15001 → L15035, header L15041, panel copy L15044. Delete §13.1; change §9's row to **Live**. `13a` and `13c` already say so. *(K1, X1, N7)*
7. **`15k` §9** — "every one of the 20 `DB.commitPolicy` keys has a reader outside Settings" is false: **`riderWaitMin`, `riderNoShowPayPct`, `payoutDays` are dead.** *(K2)*
8. **`00d` §1, §2.1(3), §3.2, §4.2B, §5.1, §5.5, §11 and F1/F5** and **`16j` §7.3, §8.2, §10, §12, §13, §14.11** — both documents must incorporate `SETTINGS_GROUPS` (L21270–L21277) and `reorderSettingsTabs()` (L21278–L21313, called from `presenceBoot()` L21393, booted L21825). Corrections: the last `data-i18n` in the file is **L21307**, not L1992; JS **does** emit the attribute; **6 of 7** "orphan" keys are consumed at runtime and the true orphan count is **1** (`stabgrp.other`); the **three static** keys (`workspace`/`operations`/`system`) are the ones removed at boot (L21288); the rendered nav has **6** groups, so the source's "21-tab/6-group" comment is correct and `16j`'s ⚠ against it is inverted. `03c` L546 already has this right. *(D1, D2, D3, J1, J2, X7, N14)*
9. **`13d` §11 and G14** — delete "the only gated function downstream of this page". The primary action path (`Find driver` → `assignNearestDriver`, L8482) is gated by `requirePerm('live_ops')` at **L8483**. *(V2)*
10. **`13d` §7.4** — the `↩ respond within` badge is **unreachable on this page** (L14799 returns first); **4** of the 5 listed badges can appear, and L14801 is likewise unreachable. *(V1)*
11. **`16k` §7.2 and §14 item 9** — `commitSurgeSchedule` and `commitSearchPhases` **do not exist** (grep → 0). L12385 is `saveRideTypes()` (declared L12375); L8117 is `saveSearchPhases()` (declared L8115); `saveSurgeSchedule` is at **L12321**. *(A2, A3, A4)*
12. **`16k` / `16j` / `00c`** — the audit-log 500-entry cap is at **L3148** and the forced re-render at **L3149**. `16j` and `16k` say L3146/L3147; `00c` says L3151. **All three are wrong, in three different ways.** *(X4, X5)*
13. **`16k` / `16j` (5 places)** — the `exportAuditLog()` button is at **L2031**; **L2027 is `exportRiders()`**. *(A1, J5, X6)*
14. **`16i` §7.2, §11 and §13 item 4** — `nowMs()` is `Date.now()` (**L14627**), the same real clock `currentBlock()` uses. `REQ_NOW_REF` governs only the subscription-request subsystem and is advanced each tick (L9680), not frozen. Rewrite or delete the two-clocks claim. *(R1)*

### P2 — Wrong counts and enumerations

15. **`15k` §8b** — recount from the doc's own (correct) table: tier **T1 4 / T2 12 / T3 15 / T4 9**; target **rider 29 / driver 9 / corp 2**; **comp>0: 10** (add `SUB_SAME_CAPTAIN_BROKEN` = 25) **/ comp:0: 30**; §13.11 blocked count **29 of 40**. *(K3–K6, X11)*
16. **`00d` §8.3C/D** — **40** seeded reason codes, not 47; `labelAr` definition/write sites **41**, not 48. *(D6, D7)*
17. **`00d` §5.1 / F1 / §10** — static-shell unique ids are **485**, not 621; the translation ceiling is **86/485 = 17.7%**. *(D4)*
18. **`00d` §8.2** — `toFixed`: 248 occurrences across **227** lines. `fmtSAR`: **110 occurrences over 92 call-site lines** (93 is the line count). *(D9, D10)*
19. **`13d` M16 / §18** — the live `DB.upcomingSubTrips` seed holds **8** records (`UST-1`…`UST-8`), **L6177–L6241**. *(V3)*
20. **`16j` §8.1** — **8 of 21** tabs show a "last updated" line, not 11; `dispatch` **is** covered (4 meta elements: L1578, L1590, L1600, L1617), so the not-covered list is 12, not 13. *(J3, J4)*
21. **`13c` §15.3 / §15.4 headings** — **7** `openLogContact()` call sites and **11** external `logContact()` writers; both headings already disagree with their own tables. *(C7, C8)*
22. **`16h` §8.2** — "one of the **7** entry types", not 8. *(H4)*
23. **`16k` §9.4** — the Money cluster lists **13** keys, not 11. *(A5)*
24. **`16h` §7.6** — the walk decomposition is 12 (`trialBalance` rows) + 1 (`trialBalance` totals) + **4** (`ledgerReconcile`) = 17 per render; `demoDoubleRefund`'s two are per click. Fix the internal contradiction with §7.8. *(H5)*
25. **`16h` §1 vs §9.2** — four patches plus one new function; and per P1 #3, only two of the four actually post. *(H6)*
26. **`16j` §7.3 ⚠** — "Six group keys" should be seven, as the doc says everywhere else. *(J8)*
27. **`16i` §3.2** — delete "6 users → the search box appears"; there are 5 options and no search box. *(R2)*

### P3 — Range-endpoint errors that spill into adjacent blocks

28. **`16h`, `16i`, `16j` headers** — `#p-settings` is **L1416–L2048** (L2050 is the next page's comment banner) and the "Operations" tab-group label is **L1424** (L1425 is the *dispatch* tab button). **Pass 2 already raised both for `16h` (P2 #16); they are still uncorrected and have since been replicated.**
29. **`16i`** — `renderOnCall()` **L15789–L15798** (L15799 opens `saveOnCall`); `saveOnCall()` **L15799–L15805**; `myOpenClaims()` **L18912–L18916** (L18917 opens `ownershipStats`); `commitHandover()` **L19708–L19732**; `guardAction('commitHandover')` **L19733–L19741**; `refreshOwnershipSurfaces()` **L19045–L19057**.
30. **`16h`** — `trialBalance()` **L19948–L19958**; `postFareCapture()` **L20030–L20051**; original `recordRefund()` **L3176–L3202**; wrapper block starts **19978 / 19992 / 20007**.
31. **`16k`** — `auditDiffHTML()` **L3156–L3171**; `ACTION_LABELS` **L2898–L2909**; the filter predicate **L9328–L9336**; pagination **L9339–L9345**.
32. **`13d`, `13c`, `15k`, `16j`** — `renderInterventionsPage()` **L10338–L10345**; `refreshOwnershipSurfaces()` **L19045–L19057**; `scenarioBannerHTML()` **L8329–L8347**; `commitRequestAssign()` **L11884–L11909**; `DB.reasonCodes` **L14667–L14716**; `reasonSelectHTML()` **L14755–L14763**; `slaBadge()` **L14791–L14802**; `slaUrgency()` **L14804–L14810**; `rcTargets()` **L14730–L14739**; `DB.commitPolicy` **L16541–L16561**; `compPreview()` **L15447–L15462**; `fitSettingsNavHeight()` **L7297–L7310**; the settings nav buttons **L1421–L1443**.

### P4 — Single-line stale citations

33. Apply the tables in §5 wholesale. The highest-value clusters: `16h`'s eleven (all in the L19882–L19928 band), `16k`'s sixteen, `16i`'s twenty-eight, `15k`'s uniform +1 across four template blocks, `13c`'s ~45, `13d`'s ~30, `16j`'s twelve, and `00d`'s four.
34. **`13c` §2 row 2, §15.5, §18** — the router branches are **L8820** (contacts) and **L8819** (settings), not L8825/L8824. This is the only **+5** drift in the corpus and is worth a separate look for a shared upstream cause.
35. **`13c` §2 row 5** — **L14955**, not L15954 (digit transposition).
36. **`15k` §10.12 / §14** — the reorder rationale comment is at **L21258–L21269** (quoted text L21262–L21263), ~460 lines from the cited L20795–L20801.

### P5 — Wording and scope

37. **`13c` §5 F12** and **`15k` §7.2** — both sections promise formulas "written out exactly" and then paraphrase. Either restore the exact text (`typeof onCallName==='function'` guard and IIFE closure in F12; `updDue!==null&&`, `resMs?…:0` and `frMissed` in §7.2) or soften the promise.
38. **`15k` §7.4 / §10.5** — state that `compCheck` runs only inside `if(reason.indexOf('Goodwill')>=0)` (L3985) and that `compPreview` returns early on the same test (L15453), so non-goodwill credits bypass the authority model entirely.
39. **`16h` §8.3** — the `/goodwill|apolog/i` branch is a **precedence** rule, not a redundancy: a reason matching both regexes books to goodwill *because* of it.
40. **`13d` §2.1** — delete "exhaustive … and no others" (the grep is case-scoped and still misses L19054), and add the `renderDashboard()` call site at L12591 to §15.2.
41. **`00d` F2** — "added after the original translation pass" is unrecoverable from a single-file snapshot; drop or mark UNVERIFIED. **§8.1** — `--sb-bg` exists (L12); rescope to "no *width* token". **F18** — L400 covers `input` only.
42. **`13c` §12.1** — `.al-row{cursor:pointer}` (L158) makes the row *present* as clickable while doing nothing; report it as a defect, not as layout.

### P6 — Process

43. **Adopt the `(citation, quoted-token)` resolver used in this pass as a CI check.** It resolved 7,625 pairs across the eight documents in seconds and surfaced every finding in §5 as a lead. Add a second rule that flags any backticked identifier with **zero** occurrences in source — that alone would have caught `slaOpen`, `commitSurgeSchedule`, `commitSearchPhases`, `#wrap-reason`, `#lc-reason` and (in pass 2) `AUDIT_LABELS`.
44. **Add a "boot-order" checklist item to the module-doc template.** Two of this pass's three deepest errors (`16h`'s gate ordering, `00d`/`16j`'s `reorderSettingsTabs` blindness) come from analysing a module's source region without checking what runs *after* it at top level or at boot. Any document describing a monkey-patch, a wrapper, or static markup that JS mutates must state its position relative to `installActionGates()` (L18089), `installUniversalGates()` (L18383), `installGateSweep()` (L20903) and `bootModules()` (L21807).
45. **Require every strong negative to name its grep.** The documents that did this (`16i`, `13d`, `16k`) scored 100% on negatives; the ones that reasoned to a negative from a partial read (`15k`'s `owner`, `13c`'s `G12`) produced this pass's most damaging errors.
46. **Reconcile the `DB.reasonCodes` range across six documents** to **L14667–L14716** (last entry L14715) and the count to **40**.

---

## 13. Residual accuracy position for the full 61-document set

**What is now assessed.** Pass 2 assessed `00a`–`04`, `11a`–`12c`, `15b`/`15d`/`15g`/`15i` in depth, plus whole-corpus mechanical sweeps. Pass 2b closes P5 #34: all eight late arrivals — `00d`, `13c`, `13d`, `15k`, `16h`, `16i`, `16j`, `16k` — are now assessed to the same depth or deeper. Combined, **21 documents have had every formula, every strong negative, every claimed-exhaustive enumeration and a large citation sample checked against source.**

**What remains open.** Pass 2's §2 coverage caveat is *not* closed by this pass:

> `05a`–`10e`, `13a`–`14b` and most of `15*`/`16*` were still under audit by parallel agents when this report was finalised.

Those parallel audits produced findings that were **never consolidated into pass 2's scorecard**. This pass drew on `13a`, `03a`, `03b`, `03c`, `12c`, `00b`, `00c` for cross-checks and found them broadly reliable — `13a` in particular won every head-to-head contest against `13c` (X1, X2, X3) and `03a` won four of seven against `13d` — but **their own accuracy has not been independently audited in this lineage.** The honest position: roughly **40 of 61 documents** rest on parallel-agent verification that no consolidated pass has re-checked.

**What this pass changes about the corpus-level verdict.**

- **Pass 2's headline holds and is strengthened where it matters most.** "The documentation set is substantially accurate" survives. **Zero money formulas are wrong** across 48 now re-derived. Every large enumeration checked mechanically (161 audit keys, 88 i18n keys, 86 markup keys, 40 reason codes ×2, 12 accounts, 42 rota slots) is either exactly right or wrong only in a *derived summary count*, never in its membership.
- **Pass 2's "all negatives hold" no longer generalises.** It tested 30 and found 30 true. Pass 2b tested 107 and found **7 false**. Strong negatives are now the corpus's second-most-dangerous claim class after fabricated identifiers, and they should not be inherited without a fresh grep. Notably, **the brief for this pass repeated one of them** (`gvRC` reads the wrong element) as established fact.
- **Fabricated identifiers are a recurring, systematic defect, not a one-off.** Pass 2 found one (`AUDIT_LABELS`). Pass 2b found five more. All six would be caught by a single CI rule.
- **Three documents now disagree about the same line in three different ways** (the 500-entry audit cap: L3146 / L3146 / L3151, actual **L3148**). Where three documents cite one fact and none agrees, the fact has never been read — that pattern is worth sweeping for corpus-wide.
- **Line-citation drift is confirmed as the dominant defect class in all eight late arrivals, with the same signature pass 2 identified**: declarations, constants, seeds, `logAction`/`toast`/`requirePerm` calls and router branches are reliably exact; template-string interiors and multi-line object literals drift ±1–3; block ranges over-run into the next sibling. Two new variants appeared: a uniform **+5** in `13c`'s router citations and a single **~460-line** miss in `15k`.
- **`00d` demonstrates that near-perfect citation hygiene is achievable in this corpus** (678 citations, 4 falsifiable) — and simultaneously that citation hygiene and analytical correctness are independent axes: it is the best-cited and one of the more wrong-in-conclusion documents in the set.

**Recommended next pass.** Consolidate the parallel-agent findings for `05a`–`10e` and `13a`–`14b` into a single scorecard, and re-run this pass's three mechanical instruments across the whole corpus: the `(citation, token)` resolver, the zero-occurrence identifier check, and a negative-claim grep sweep. Between them they found, or would have found, every one of this pass's 79 WRONG classifications.
