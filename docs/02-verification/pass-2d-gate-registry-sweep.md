# Verification Pass 2d — Gate Registry Sweep

> A corpus-level blind spot: gates live in two registries; most documents checked one.

**Source:** `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
**Scope:** all 61 documents in `docs/01-modules/`
**Status:** complete — 49 corrections applied across 20 module documents

---

## 1. Why this pass exists

Verification pass 2c, auditing the pricing and settings modules, found the same
mistake four times over and traced it to a single structural cause: **confirmation
gates in this codebase are registered in four separate places, and most analysis
agents only ever looked at one of them.**

The four mechanisms, in source order:

| # | Mechanism | Declared | Installed | Entries |
|---|-----------|----------|-----------|---------|
| 1 | `installActionGates()` — inline `guardAction(...)` calls with rich, data-derived specs | `L17853`–`L18087` | `L18089` | 17 |
| 2 | `GATE_SPECS` — builder-function registry, installed by `installUniversalGates()` | `L18245`–`L18371` | `L18383` | 18 keys / **17 active** (`openLowRatingTicket` is `null`) |
| 3 | Standalone `guardAction(...)` calls scattered through the body | `L18460`–`L21603` | at their own line | 9 |
| 4 | `GATE_SWEEP` — flat object-literal registry, installed by `installGateSweep()` | `L20769`–`L20885` | `L20903` | 47 keys / **45 active** (`assignBackup` and `autoHandoff` are `delete`d at `L20886`–`L20887`) |

**17 + 17 + 9 + 45 = 88 gated actions.** This matches the count in
`docs/01-modules/00b-global-ui-systems.md` §4, which is confirmed accurate.

The blind spot: `GATE_SPECS` sits at `L18245`, near the top of the gate section and
immediately under a large `GATE REGISTRY` comment block that reads like the
authoritative list ("*Registered here rather than edited into each function, so the
list of what is gated is readable in one place*"). Agents reading that comment
reasonably concluded they had found the registry. But `GATE_SWEEP` — declared
**2,524 lines later**, with more than twice as many entries — carries the bulk of
the settings, configuration, and outbound-communication gates. It exists precisely
*because* the earlier rounds missed things; its own header comment says so:

> *"Previous rounds gated actions I identified by reading the code. That was the
> wrong method and it kept missing things."*

The documentation then repeated the identical error the code comment warns about.

**Two failure modes were found:**

- **False negative** — the document asserts an action is "ungated" / "no
  confirmation" when it is in fact gated via `GATE_SWEEP`.
- **Wrong attribution** — the document correctly reports that a gate exists and
  even quotes the confirmation copy, but attributes it to `GATE_SPECS`, often with a
  line number in the `L182xx` range instead of the true `L207xx`/`L208xx`.

Pass 2c confirmed this in 8 documents (`14b`, `15a`, `15e`, `15f` false negatives;
`16a`, `16c`, `16d`, `16e` wrong registry). Three of pass 2c's four false-negative
findings trace to this single gap. Pass 2 cleared 41 other documents **without ever
checking this axis**, which is why this pass sweeps all 61.

### What this pass does NOT do

A confirmation gate is a **UX control** — a modal that asks "are you sure". A
permission gate (`requirePerm` / `requirePagePerm` / `can`) is an **authorization
control**. They are independent: an action can have both, either, or neither.

Several of the corpus's most serious findings rest on actions that are
**confirm-gated but permission-ungated** — the modal appears, but any operator who
can reach the button can complete the action. Discovering a `GATE_SWEEP` entry for
such an action does **not** soften that finding. §7 enumerates these explicitly so
that no future pass mistakes a confirmation gate for authorization.

---

## 2. The authoritative gate map

Every gated action in the source, by mechanism. Extracted mechanically from
`eyvar_ops_panel_v40_fixed.html`, not from any prior document.

### 2.1 `installActionGates()` — 17 entries

Declared `L17853`, installed `L18089`. Specs are builder functions that read live
`DB` state, so the confirmation copy is data-derived (names, amounts, IDs
interpolated at call time).

| Action | Line | Confirmation title |
|---|---|---|
| `resolveDispute` | L17857 | `'Resolve dispute '+dspId` |
| `commitWalletAdjust` | L17889 | `(kind==='credit'?'Credit':'Debit')+' rider wallet'` |
| `recordRefund` | L17901 | `'Issue refund'` |
| `recordAbsence` | L17911 | `'Record an absence against '+nm2(driverId)` |
| `decideEmergency` | L17932 | `(uphold?'Uphold':'Reject')+' emergency claim '+claimId` |
| `decideFairness` | L17950 | `(uphold?'Uphold':'Overturn')+' — '+c.kind` |
| `autoHandoff` | L17969 | Hand tomorrow's leg to a backup |
| `commitBackup` | L17981 | Register standing backup |
| `promoteBackup` | L17990 | Promote backup to primary captain |
| `executeErasure` | L18002 | Execute PDPL erasure |
| `rejectErasure` | L18014 | Reject erasure request |
| `bulkStatus` | L18024 | `'Change '+ids.length+' tickets to ...'` |
| `forceResync` | L18036 | Force state resync to the rider |
| `commitMassEvent` | L18045 | Declare a mass event |
| `advanceLF` | L18054 | `next[1]` (lost-and-found stage label) |
| `saveCommitPolicy` | L18068 | Save commitment policy |
| `saveCompPolicy` | L18077 | Save compensation authority |

### 2.2 `GATE_SPECS` — 18 keys, 17 active

Declared `L18245`, installed by `installUniversalGates()` at `L18383`.
`installUniversalGates` skips any name already carrying `__guarded`, so an
`installActionGates` entry always wins over a `GATE_SPECS` entry of the same name.

| Action | Line | Confirmation title |
|---|---|---|
| `confirmPlanLeg` | L18246 | Record confirmation for tomorrow's leg |
| `acceptEmergency` | L18260 | Record acceptance — {captain} |
| `declineEmergency` | L18270 | Record decline — {captain} |
| `respondBackupOffer` | L18280 | Backup accepted / Backup declined — {subId} |
| `setTicketStatus` | L18292 | Mark ticket resolved/closed — **only** when status is `Resolved` or `Closed`; returns `null` otherwise, so other transitions are ungated |
| `bulkAssignMe` | L18300 | Assign {n} tickets to yourself |
| `commitBulkReason` | L18307 | Re-code {n} tickets |
| `commitChangeReason` | L18315 | Change reason code |
| `saveReasonCodes` | L18320 | Save reason codes (danger) |
| `saveSlaPolicy` | L18326 | Save SLA tiers (danger) |
| `saveOnCall` | L18332 | Change the on-call roster |
| `commitRatingDispute` | L18337 | Open a rating dispute |
| `commitReportRider` | L18342 | File a report against the rider |
| `commitDriverAppeal` | L18348 | File a suspension appeal |
| `commitEmergencyClaim` | L18353 | File an emergency claim |
| `commitErasureRequest` | L18358 | Log a PDPL erasure request |
| `commitLogContact` | L18364 | Log this contact |
| `openLowRatingTicket` | L18370 | **`null` — deliberately not gated** (opens a modal; the modal is the deliberate step) |

### 2.3 Standalone `guardAction(...)` calls — 9 entries

Registered at their own line, outside any installer function.

| Action | Line | Confirmation title |
|---|---|---|
| `saveBranding` | L18460 | Save branding |
| `rebuildAllHistory` | L18607 | Rebuild missing trip history |
| `reinstateProbationary` | L19490 | `'Reinstate '+nm2(driverId)+' on probation'` |
| `commitHandover` | L19733 | Complete shift handover |
| `fetchFullHistory` | L20483 | Fetch full history from billing |
| `saveDataWindow` | L20522 | Change the operational data window |
| `impersonate` | L21090 | `'View the panel as '+{name}` |
| `suspendSurge` | L21544 | `'Suspend surge in '+zoneId` |
| `approveRateCard` | L21603 | `'Approve rate card '+version` |

### 2.4 `GATE_SWEEP` — 47 keys, 45 active — **the blind spot**

Declared `L20769`, installed by `installGateSweep()` at `L20903` via `gateAll()`
(`L20756`). Entries are plain objects (`t` title, `d` danger, `irr` irreversible,
`s` summary, `c` consequences, `btn` confirm label), not builder functions — which
is why they are shorter, denser, and easy to skim past.

| Action | Line | Flags | Confirmation title |
|---|---|---|---|
| `saveGeneralConfig` | L20771 | danger | Save platform settings |
| `saveOpsLimits` | L20774 | danger | Save operational limits |
| `saveOpsRadiusConfig` | L20777 | danger | Save search radius |
| `saveSecurityConfig` | L20780 | danger | Save security settings |
| `saveNotificationConfig` | L20783 | — | Save alert thresholds |
| `saveCancellationPolicy` | L20786 | danger | Save cancellation policy |
| `saveReferralConfig` | L20789 | danger | Save referral rewards |
| `saveSurgeConfig` | L20792 | danger | Save surge settings |
| `saveSurgeSchedule` | L20795 | danger | Save the surge schedule |
| `saveRideTypes` | L20798 | danger | Save ride types |
| `saveSearchPhases` | L20801 | danger | Save dispatch search phases |
| `savePlan` | L20804 | danger | Save the plan |
| `savePlanVisibility` | L20807 | — | Change plan visibility |
| `saveMaProfile` | L20810 | — | Save your profile |
| `changeMaPassword` | L20812 | danger | Change your password |
| `addCity` | L20817 | — | Add a city |
| `addRideType` | L20819 | — | Add a ride type |
| `addSearchPhase` | L20820 | — | Add a search phase |
| `removeSearchPhase` | L20821 | danger | Remove a search phase |
| `addSurgeWindow` | L20823 | danger | Add a surge window |
| `removeSurgeWindow` | L20825 | danger | Remove a surge window |
| `addCustomLimit` | L20827 | — | Add an operational limit |
| `addCustomGateway` | L20828 | danger | Add a payment gateway |
| `setDefaultGateway` | L20830 | danger | Change the default payment gateway |
| `addIncentiveRule` | L20833 | danger | Add an incentive rule |
| `removeIncentiveRule` | L20836 | danger | Remove an incentive rule |
| `addPlanFeature` | L20838 | — | Add a feature bullet |
| `removePlanFeature` | L20839 | — | Remove a feature bullet |
| `addReasonCode` | L20841 | — | Add a reason code |
| `setRotaSlot` | L20843 | — | Change the on-call rota |
| `resetBranding` | L20846 | danger | Reset branding to default |
| `sendBroadcast` | L20850 | danger, irreversible | Send a broadcast |
| `sendPushNotification` | L20853 | danger, irreversible | Send a push notification |
| `sendBulkMsg` | L20855 | danger, irreversible | Send a bulk message |
| `sendReconsentReminder` | L20857 | danger | Send re-consent reminders |
| `sendRetentionOfferToRider` | L20859 | danger | Send a retention offer |
| `commitRetentionAction` | L20862 | danger | Apply the retention action |
| `precautionSuspend` | L20866 | danger | Precautionary suspension |
| `closeIncident` | L20869 | danger | Close the incident |
| `cancelRequest` | L20871 | danger | Cancel this request |
| `reopenSubReq` | L20873 | — | Reopen the request |
| `queueRecruitment` | L20875 | — | Queue for recruitment |
| `pausePromo` | L20877 | danger | Pause the promotion |
| `logOutSession` | L20879 | danger | Sign out this session |
| `captureDailySnapshot` | L20881 | — | Capture a daily snapshot |
| `assignBackup` | L20883 | **`null`, `delete`d L20886** | not gated — opens a picker; `commitBackup` is gated |
| `autoHandoff` | L20884 | **`null`, `delete`d L20887** | not gated *here* — already gated at L17969 |

### 2.5 Deliberately ungated, per the source comment at `L20889`–`L20896`

`claimItem`, `releaseItem` (reversible in one tap) · `commitMenu`, `renewalMenu`
(open a menu, change nothing) · `openNewRiderProfile` (opens a form; the save is
gated) · `exportIntegrity` (reads data out, changes nothing) · `assignBackup`
(opens a picker; `commitBackup` is gated).

Plus `openLowRatingTicket` (`GATE_SPECS`, `L18370`, explicitly `null`).

### 2.6 Guard mechanics worth knowing when checking a claim

- `guardAction` (`L17819`) **wraps** `window[name]`. It returns `false` and installs
  nothing if `window[name]` is not a function at that point — so a registry entry
  alone is not proof of a gate if the function is defined later in the file.
- A guard is bypassed when `window.__skipGuards` is set or when the re-entrant
  `__guardToken` matches — the latter is how the confirm callback re-invokes the
  original. Neither is an authorization escape reachable from the UI.
- If the builder returns `null`, the original runs **unguarded**. This is why
  `setTicketStatus` is gated only for `Resolved`/`Closed`, and why several
  `installActionGates` entries silently no-op when the referenced record is missing.

---

## 3. Documents claiming "ungated" where a gate exists

30 false-negative claims across **13 documents**. Method: every `Confirms?` /
`Gated?` column value of `no` / `none` / `✗`, plus every prose match for
`ungated | no confirm | not gated | no gate | fires immediately | single click`,
cross-referenced against the §2 gate map by function name.

| # | Doc | Line | Action | Claim as written | Real registry | Line | Corrected to |
|---|---|---|---|---|---|---|---|
| 1 | `00c-identity-permissions-and-audit` | 468 | `removePlanFeature` | "Deletes a plan feature bullet with no confirm and no audit" | `GATE_SWEEP` | L20839 | confirm-gated; the **audit** half of the claim stands |
| 2 | `00c-identity-permissions-and-audit` | 685 | `removePlanFeature` | F25 "…with no confirmation dialog on removal" | `GATE_SWEEP` | L20839 | confirmation exists; F25's audit finding stands |
| 3 | `04-live-map` | 296 | `cancelRequest` | Confirms? = "no confirmation — immediate destructive delete" | `GATE_SWEEP` | L20871 | yes — danger gate |
| 4 | `04-live-map` | 373 | `cancelRequest` | "**No confirmation dialog.**" | `GATE_SWEEP` | L20871 | gate raised before the splice |
| 5 | `04-live-map` | 661 | `cancelRequest` | Finding 8 "deletes without confirmation" | `GATE_SWEEP` | L20871 | finding withdrawn |
| 6 | `06a-all-trips` | 377 | `forceResync` | Confirms? = "no" | `installActionGates` | L18036 | yes — rich gate |
| 7 | `09a-riders` | 371 | `sendRetentionOfferToRider` | Confirms? = "no confirmation — fires on one click" | `GATE_SWEEP` | L20859 | yes — danger gate; **permission still none** |
| 8 | `09a-riders` | 570 | `sendRetentionOfferToRider` | Finding 19 "no confirmation and no permission gate" | `GATE_SWEEP` | L20859 | confirmation half withdrawn; **permission half preserved** |
| 9 | `13a-support-center-tickets` | 521 | `setTicketStatus(id,'Resolved')` | Confirms? = "no" | `GATE_SPECS` | L18292 | yes — gated for `Resolved`/`Closed` only |
| 10 | `13b-disputes-and-lost-found` | 376 | `advanceLF` | Confirms? = "**no**" | `installActionGates` | L18054 | yes — rich gate, title from `LF_FLOW` |
| 11 | `13b-disputes-and-lost-found` | 447 | `advanceLF` | "acts immediately with no confirmation" | `installActionGates` | L18054 | no *bespoke* modal, but a generic gate fires |
| 12 | `13b-disputes-and-lost-found` | 526 | `advanceLF` | Finding 11 "no confirmation and no reversal" | `installActionGates` | L18054 | confirmation half withdrawn; **no-reversal half stands** |
| 13 | `14b-plan-editor` | 290 | `removePlanFeature` | "No confirmation, no permission check, no audit entry" | `GATE_SWEEP` | L20839 | confirmation exists; permission + audit halves stand |
| 14 | `14b-plan-editor` | 394 | `addPlanFeature` | Confirms? = "No" | `GATE_SWEEP` | L20838 | yes |
| 15 | `14b-plan-editor` | 395 | `removePlanFeature` | Confirms? = "**No**" | `GATE_SWEEP` | L20839 | yes |
| 16 | `14b-plan-editor` | 549 | `addPlanFeature` / `removePlanFeature` | Finding 9 "add / remove / reorder are entirely ungated … no confirmation" | `GATE_SWEEP` | L20838, L20839 | add + remove are confirm-gated; **reorder (`pfDrop`) is genuinely ungated** |
| 17 | `15a-settings-general` | 64 | `saveGeneralConfig` | Confirms? = "no" | `GATE_SWEEP` | L20771 | yes — `d:true` |
| 18 | `15d-settings-notifications` | 71 | `saveNotificationConfig` | Confirms? = "no" | `GATE_SWEEP` | L20783 | yes |
| 19 | `15e-settings-security` | 61 | `saveSecurityConfig` | Confirms? = "no" | `GATE_SWEEP` | L20780 | yes — `d:true` |
| 20 | `15e-settings-security` | 165 | `saveSecurityConfig` | Finding 9 "**No `guardAction` confirmation**" | `GATE_SWEEP` | L20780 | finding withdrawn — it *is* `guardAction`-wrapped via `gateAll` |
| 21 | `15f-settings-dispatch` | 110 | `removeSearchPhase` | "**No confirmation.**" | `GATE_SWEEP` | L20821 | yes — `d:true` |
| 22 | `15f-settings-dispatch` | 130 | `saveOpsRadiusConfig` | Confirms? = "no" | `GATE_SWEEP` | L20777 | yes — `d:true` |
| 23 | `15f-settings-dispatch` | 131 | `saveOpsRadiusConfig` | Confirms? = "no" | `GATE_SWEEP` | L20777 | yes |
| 24 | `15f-settings-dispatch` | 132 | `addSearchPhase` | Confirms? = "no" | `GATE_SWEEP` | L20820 | yes |
| 25 | `15f-settings-dispatch` | 133 | `removeSearchPhase` | Confirms? = "**no**" | `GATE_SWEEP` | L20821 | yes — `d:true` |
| 26 | `15f-settings-dispatch` | 134 | `saveSearchPhases` | Confirms? = "no" | `GATE_SWEEP` | L20801 | yes — `d:true` |
| 27 | `15f-settings-dispatch` | 137 | `savePlanVisibility` | Confirms? = "no" | `GATE_SWEEP` | L20807 | yes |
| 28 | `15f-settings-dispatch` | 314 | `removeSearchPhase` | Finding 7 "Deleting a phase has no confirmation" | `GATE_SWEEP` | L20821 | finding withdrawn |
| 29 | `16i-settings-rota-oncall` | 172 | `setRotaSlot` | Confirms? = "no" | `GATE_SWEEP` | L20843 | yes |
| 30 | `12a-finance` | 848 | `demoDoubleRefund` → `recordRefund` | R15 "no confirmation of its own" | `installActionGates` (on the callee) | L17901 | literally correct but misleading — clarified inline that each inner `recordRefund` raises its own gate |

**Pattern.** 22 of the 30 sit in the `15x`/`16x` settings family or in feature-list
editing — exactly the surfaces `GATE_SWEEP` was written to cover. Every one of them
would have been caught by grepping `GATE_SWEEP` alongside `GATE_SPECS`.

---

## 4. Documents citing the wrong registry

The inverse error: the gate is real and the copy is quoted accurately, but the
registry name — and usually the installer and the line number — are wrong.

| # | Doc | Line | Cited as | Actually is | Note |
|---|---|---|---|---|---|
| 1 | `16a-settings-branding` | 109 | `GATE_SPECS.resetBranding` **L20797–20799** | `GATE_SWEEP.resetBranding` **L20846–L20849** | registry wrong; line off by **−49** |
| 2 | `16a-settings-branding` | 226 | anchor `GATE_SPECS.resetBranding` L20797–20799 | `GATE_SWEEP.resetBranding` L20846–L20849 | anchor table |
| 3 | `16a-settings-branding` | 217–218 | anchors `GATE_SPECS` L18245 / `installUniversalGates()` L18372–18383 | neither installs `resetBranding`; the installer is `installGateSweep()` **L20898–L20903** | anchors replaced |
| 4 | `16c-settings-legal-consent` | 117 | `GATE_SPECS.sendReconsentReminder` **L20807–20809** | `GATE_SWEEP.sendReconsentReminder` **L20857–L20858** | line off by **−50** |
| 5 | `16c-settings-legal-consent` | 122 | "Installed by `installUniversalGates()` (L18372–18383)" | `installGateSweep()` → `gateAll(GATE_SWEEP)` **L20898–L20903** | wrong installer |
| 6 | `16c-settings-legal-consent` | 363 | anchor `GATE_SPECS.sendReconsentReminder` L20807–20809 | `GATE_SWEEP.sendReconsentReminder` L20857–L20858 | anchor table |
| 7 | `16d-settings-emails` | 521 | anchor `GATE_SPECS.sendBroadcast` **L20800–20802** | `GATE_SWEEP.sendBroadcast` **L20850–L20852** | line off by **−50** |
| 8 | `16e-settings-push` | 122 | "Installed via `installUniversalGates()` (L18372–18383) reading `GATE_SPECS` (L18245)" | `installGateSweep()` → `gateAll(GATE_SWEEP)` **L20898–L20903**, reading `GATE_SWEEP` **L20769** | wrong installer *and* registry |
| 9 | `16e-settings-push` | 404–406 | anchors `GATE_SPECS` L18245 / `.sendPushNotification` L20803–20805 / `.sendBroadcast` L20800–20802 | `GATE_SWEEP` L20769 / L20853–L20854 / L20850–L20852 | anchors replaced |
| 10 | `16f-settings-export` | 305 | `GATE_SPECS.captureDailySnapshot` (L20882) | `GATE_SWEEP.captureDailySnapshot` L20881–L20882 | **line correct, registry wrong** — the giveaway that this is a naming slip, not a lookup error |
| 11 | `16f-settings-export` | 368 | anchor `GATE_SPECS.captureDailySnapshot` L20881–20882 | `GATE_SWEEP.captureDailySnapshot` | anchor table |
| 12 | `00c-identity-permissions-and-audit` | 914 | flow diagram `[ GATE_SWEEP.commitErasureRequest ] L18358` | `GATE_SPECS.commitErasureRequest` L18358 | **inverse direction** — line right, registry wrong |
| 13 | `00c-identity-permissions-and-audit` | 979 | `GATE_SWEEP.commitErasureRequest` (L18358–L18363) | `GATE_SPECS.commitErasureRequest` | same |
| 14 | `00c-identity-permissions-and-audit` | 987 | "Both gates are among the **49** `GATE_SWEEP` entries" | `executeErasure` / `rejectErasure` are **`installActionGates`** entries (L18002, L18014); `GATE_SWEEP` holds **45 active / 47 declared**, not 49 | wrong registry *and* wrong count |
| 15 | `00c-identity-permissions-and-audit` | 1087 | anchor `GATE_SWEEP.commitErasureRequest` 18358–18363 | `GATE_SPECS.commitErasureRequest` | anchor table |
| 16 | `03c-notifications` | 37 | "the registries it sweeps are `GATE_SPECS` and `GATE_SWEEP`" | `gateAll` is called **once**, with `GATE_SWEEP` only (L20899); `GATE_SPECS` is installed by `installUniversalGates` (L18383) | mechanism conflated |
| 17 | `03c-notifications` | 560 | same sentence in Finding 4 | same | mechanism conflated |

**The −48 to −50 offset.** Rows 1, 4, 7 and 9 all cite a line roughly 49 below the
true one, and all four of those lines sit inside `L207xx` — the `GATE_SWEEP` block.
So the agents *did* read the right object and then labelled it `GATE_SPECS`. The
registry name is the error that propagated; the line drift is a symptom of the same
lookup, not an independent mistake.

---

## 5. Corrections applied

**49 surgical edits across 20 documents.** Every edit replaced exactly one string;
none renumbered a finding, restructured a section, or removed an `UNVERIFIED`
marker. Findings whose confirmation half was withdrawn were rewritten to keep their
permission, audit, or reversibility half intact rather than deleted.

| Document | Edits | What changed |
|---|---|---|
| `00b-global-ui-systems.md` | 1 | "across the three registries" → names the two bulk registries + `installActionGates()` + the 9 standalone calls (the 88/90 counts were already correct) |
| `00c-identity-permissions-and-audit.md` | 6 | `removePlanFeature` confirm claim (×2); `commitErasureRequest` re-attributed `GATE_SWEEP` → `GATE_SPECS` (×3, incl. the flow diagram and the anchor table); the "49 `GATE_SWEEP` entries" sentence rewritten to name `installActionGates()` and the true 47/45 counts |
| `03c-notifications.md` | 2 | `gateAll` sweeps `GATE_SWEEP` only; `GATE_SPECS` has its own installer. Finding 4's conclusion (`markAllRead` is ungated) **stands** and is now stated against all four mechanisms |
| `04-live-map.md` | 3 | `cancelRequest` — Confirms? column, §10.2 prose, Finding 8 recast as an irreversibility finding |
| `06a-all-trips.md` | 1 | `forceResync` Confirms? → `guardAction` L18036 |
| `09a-riders.md` | 2 | `sendRetentionOfferToRider` Confirms? column and Finding 19 — **permission half explicitly preserved and reinforced** |
| `12a-finance.md` | 1 | R15 clarified: no gate on `demoDoubleRefund` itself, but each inner `recordRefund` raises one |
| `13a-support-center-tickets.md` | 1 | `setTicketStatus(id,'Resolved')` Confirms? → `GATE_SPECS` L18292, with the `Resolved`/`Closed`-only condition stated |
| `13b-disputes-and-lost-found.md` | 3 | `advanceLF` — Confirms? column, §13.4 prose, Finding 11 recast as a no-reversal finding |
| `14b-plan-editor.md` | 4 | `addPlanFeature` / `removePlanFeature` Confirms? columns, §-detail prose, Finding 9 — reorder (`pfDrop`) correctly isolated as the genuinely ungated one |
| `15a-settings-general.md` | 1 | `saveGeneralConfig` Confirms? → `GATE_SWEEP` L20771 |
| `15d-settings-notifications.md` | 1 | `saveNotificationConfig` Confirms? → `GATE_SWEEP` L20783 |
| `15e-settings-security.md` | 2 | `saveSecurityConfig` Confirms? column; Finding 9 rewritten — the gate exists, but its consequence copy never mentions `require2FA` |
| `15f-settings-dispatch.md` | 8 | six Confirms? columns, the delete-flow prose, and Finding 7 rewritten as an audit-detail finding |
| `16a-settings-branding.md` | 3 | `resetBranding` re-attributed `GATE_SPECS` L20797–20799 → `GATE_SWEEP` L20846–20849; anchors corrected to `GATE_SWEEP` / `installGateSweep()` |
| `16c-settings-legal-consent.md` | 3 | `sendReconsentReminder` re-attributed to `GATE_SWEEP` L20857–20858; installer corrected to `installGateSweep()`; anchor fixed |
| `16d-settings-emails.md` | 1 | anchor `GATE_SPECS.sendBroadcast` L20800–20802 → `GATE_SWEEP.sendBroadcast` L20850–20852 |
| `16e-settings-push.md` | 3 | installer + registry sentence; four anchors; the cross-reference to the broadcast gate's "Check the count" line corrected L20802 → L20852 |
| `16f-settings-export.md` | 2 | `captureDailySnapshot` re-attributed to `GATE_SWEEP` (line was already right); anchor fixed |
| `16i-settings-rota-oncall.md` | 1 | `setRotaSlot` Confirms? → `GATE_SWEEP` L20843 |

**Verification after the edits.** Both automated sweeps were re-run against the
corrected corpus. Zero `Confirms?`-column negatives and zero prose "ungated" claims
now name an action that appears in the §2 gate map, with two intentional exceptions:

- `13a` line 522 — `setTicketStatus(id,'In progress')` is correctly marked "no": the
  `GATE_SPECS` builder returns `null` for every status except `Resolved`/`Closed`.
- `00b` line 202 — already carries the correct annotation that `openSuspendSurge` is
  not gated but the underlying `suspendSurge()` is (L21544).

---

## 6. Claims that SURVIVED — genuinely unconfirmed actions

This is the payoff. After removing 30 false positives, these are the mutating
actions that fire on a single click with **no confirmation gate of any kind** — not
`GATE_SPECS`, not `GATE_SWEEP`, not `installActionGates()`, not a standalone
`guardAction`, and not a bespoke modal. Each was checked by name against all 88
entries in §2 and by reading its call site in the source.

### 6.1 Destructive — deletes a record with no undo (7)

Reproduced from `00b` §4.8, independently re-verified against the §2 map.

| Action | Defined | Called from | Consequence | Asymmetry |
|---|---|---|---|---|
| `removeCity(name)` | L7890 | `onclick` L7778 | Deletes an operating city row | `addCity` **is** gated (L20817) |
| `removeRideType(id)` | L12368 | `onclick` L12353 | Deletes a ride type | `addRideType` **is** gated (L20819); the gated `saveRideTypes` even warns removal "can orphan trips" |
| `removeGateway(id)` | L7507 | `onclick` L7472 | Deletes a payment gateway; no guard against deleting the current default | `addCustomGateway` **is** gated (L20828) |
| `removeCustomLimit(id)` | L7421 | `onclick` L7396 | Deletes an operational limit | `addCustomLimit` **is** gated (L20827) |
| `removeEmployeeFromCorp(corpId,rid)` | L6751 | `onclick` L6585 | Unlinks an employee from a corporate account | — |
| `removeAvatar()` | L2963 | `onclick` L2932 | Discards the uploaded profile photo | — |
| `pfDrop(e,i)` | L6042 | `ondrop` on each feature row L6007 | Silently reorders plan feature bullets; no audit entry either | `addPlanFeature` / `removePlanFeature` **are** gated (L20838, L20839) |

**The add-is-gated / remove-is-not asymmetry is real and now provably the sharpest
finding in the corpus.** Four of the seven are the exact inverse of a `GATE_SWEEP`
entry that sits a line or two away in the same object.

### 6.2 Account-state changes with no confirmation (4)

| Action | Defined | Effect | Permission |
|---|---|---|---|
| `commitSuspendAccount(entityId,isDrvStr)` | L9082 | Sets `d.suspended`, cuts a captain out of dispatch, logs, notifies, navigates | `approve_drivers` (L9083) |
| `reinstateAccount(id,isDrvStr)` | L9099 | `delete d.suspended` | `approve_drivers` (L9100) |
| `commitUnflagAccount(entityId,isDrvStr)` | L9042 | Clears a fraud/risk flag in one click — **flagging** goes through a modal | `contact_users` (L9043) |
| `waiveDeduction(id)` | L8986 | Permanently sets a deduction `status='waived'` | **none** — and no `logAction` either |

`commitSuspendAccount` is the sharpest of these: `precautionSuspend` — the *lesser*,
explicitly reversible suspension — carries a `danger:true` `GATE_SWEEP` gate at
L20866 with three consequence bullets, while the permanent one has nothing.
`waiveDeduction` is the only status-changing money action in the panel with no
permission check, no confirmation **and** no audit entry.

### 6.3 Configuration and policy writes with no confirmation (6)

| Action | Defined | Effect |
|---|---|---|
| `commitPublishVersion(docKey)` | L3833 | Publishes site-wide legal policy and invalidates every user's consent. The *lesser* action — `sendReconsentReminder` — **is** gated (L20857) |
| `newPlan()` | L6098 | Inserts a full default plan into `DB.plans`; also the only unlogged `DB` write in `14a` |
| `toggleGatewayEnabled(id,cb)` | L7475 | Enables/disables a payment gateway; `addCustomGateway` and `setDefaultGateway` are both `danger:true` gated |
| `toggleCityActive` / `applyCityToggle` | L7781 / L7804 | **Activating** a city (which unblocks matching platform-wide) fires on one click; only deactivation of a city *with activity* raises a bespoke modal |
| `commitMultiSubChange(true)` | L8064 | The **enable** path applies immediately by design (source comment L8046–L8048); the disable path has a bespoke modal |
| incentive `active` toggle | inline `onchange`, L13674 | Writes `DB.incentives[i].active` straight from the attribute — no function, no permission check, no audit entry, no gate |

### 6.4 Permission-matrix writes with no confirmation (3)

| Action | Defined |
|---|---|
| `togglePagePermission(...)` | L10689 |
| `toggleRolePermission(...)` | L10776 |
| `saveUserPermissions(...)` | L10813 |

A single mis-click on a role cell rewrites every holder of that role at once, with
only a toast. `15c` Finding 7 is confirmed correct and untouched.

### 6.5 Outbound and notification actions with no confirmation (3)

| Action | Defined | Note |
|---|---|---|
| `replyToInbound(id)` | L7549 | Unshifts a `MAIL-nnnn` record straight onto `DB.emailOutbox`, bypassing `sendSystemEmail` |
| `sendRiderChangeNotif(ustId)` | L8590 | Reassigns the driver on a second, ungated path to the write `confirmReassign` gates |
| `markAllRead()` | L2258 | Mutates every `DB.notifications` row; low consequence, but genuinely in no registry |

### 6.6 Deliberately ungated — the source says so (7 + 1)

`claimItem`, `releaseItem`, `commitMenu`, `renewalMenu`, `openNewRiderProfile`,
`exportIntegrity`, `assignBackup` (source comment L20889–L20896), plus
`openLowRatingTicket` (`GATE_SPECS` entry explicitly `null`, L18370). These are
**not** findings — they are documented decisions, and the source states a reason for
each.

### 6.7 Summary count

| Bucket | Count |
|---|---|
| Destructive, no undo (§6.1) | 7 |
| Account-state changes (§6.2) | 4 |
| Configuration / policy writes (§6.3) | 6 |
| Permission-matrix writes (§6.4) | 3 |
| Outbound / notification (§6.5) | 3 |
| **Genuinely unconfirmed mutating actions** | **23** |
| Deliberately ungated, documented (§6.6) | 8 (excluded from the count above) |

23 — down from the 53 that the corpus asserted before this pass. The remaining 23
are each traceable to a source line and a call site, and none of them appears in any
of the four registries in §2.

---

## 7. Permission-gate findings explicitly preserved

A confirmation gate is a modal that asks "are you sure". A permission gate
(`requirePerm` / `requirePagePerm` / `can`) decides whether you are allowed at all.
**Finding a `GATE_SWEEP` entry for an action says nothing about its authorization.**

Several of this corpus's most serious findings concern actions that are
confirm-gated *and* permission-ungated. Every one was re-verified against the source
during this pass and **none was weakened**. They are restated here so that a future
reader who sees "gated: yes" in §2 does not mistake it for an authorization control.

| Action | Confirmation gate | `requirePerm` at its definition | Why it matters |
|---|---|---|---|
| `resetBranding` | **yes** — `GATE_SWEEP` L20846, `d:true` | **none** (L18454) | Wipes `DB.branding` for every operator, and drops `maxUploadMB` in the process. `saveBranding` — the *lesser* action — requires `manage_settings` (L18445) |
| `rebuildAllHistory` | **yes** — standalone `guardAction` L18607 | **none** (L18600) | Rewrites trip history wholesale |
| `approveRateCard` | **yes** — standalone `guardAction` L21603 | **none** (L21582) | Puts a new rate card live for every rider. Its only control is the self-approval check (`draft.proposedBy===CURRENT_USER_ID`), which is a separation-of-duties rule, not a permission |
| `commitUserSwitch` | bespoke modal only (`openUserSwitch` L3088) — **in no registry** | **none** (L3098) | Changes `CURRENT_USER_ID`, i.e. re-derives every subsequent permission check from a different identity. The one action where confusing a modal for an authorization control is most dangerous |
| `sendRetentionOfferToRider` | **yes** — `GATE_SWEEP` L20859, `d:true` | **none** (L6999) | Commits a discount to a real customer. `09a` Finding 19 was rewritten in §5 to *strengthen* this half, not soften it |
| `commitHandover` | **yes** — standalone `guardAction` L19733 | **none** (L19708) | `16i` Finding 6 stands |
| `reinstateProbationary` | **yes** — standalone `guardAction` L19490 | **none** (L19478) | Returns a suspended captain to work |
| `impersonate` | **yes** — standalone `guardAction` L21090 | **none** (L21067) | View-as another user |
| `fetchFullHistory` | **yes** — standalone `guardAction` L20483 | **none** (L20472) | Pulls full billing history |
| `suspendSurge` | **yes** — standalone `guardAction` L21544 | **none** (L21534) | Suspends surge pricing in a zone |
| `commitRateCardChange` | **none** | **none** (L21562 area) | Proposes a rate card with neither control — see `16g` |

Also preserved unchanged, because they are permission or audit findings that this
pass never touched: `06a` #8 (no page permission on Trips), `12a` R17 (`view_finance`
never enforced), `12b` R1 (`waiveDeduction` ungoverned), `15-settings-shell` G5 (no
permission gate on the settings shell), `16f` #1 (no permission check on any
export), `15c` #5–#9, `00c` F25's audit half, `14b` #9's permission and audit halves,
`13b` #11's no-reversal half.

**Rule for future passes:** when you discover a confirmation gate on an action a
document called "ungated", correct only the confirmation clause. Read the function
definition for `requirePerm` / `requirePagePerm` before touching anything else in the
sentence.

---

## 8. Residual — still unverifiable

| Item | Why it cannot be settled from the source |
|---|---|
| Runtime `window.__gateCount` | `installActionGates()` **assigns** `window.__gateCount = n` (L18085) while `installUniversalGates()` (L18381) and `installGateSweep()` (L20901) **add** to it. Because `installActionGates` runs first, the total should be 88 — but this is a static reading; the file was not executed. (`00b` already flags this; unchanged.) |
| Whether every `GATE_SWEEP` name resolves to a live function at L20903 | `gateAll` silently skips a name whose global is not yet a function. All 45 active names were confirmed to have a `function <name>(` definition **before** L20769, so all 45 should install — but again, static only. |
| Whether `guardAction`'s wrapper survives later reassignment | Nothing in the file reassigns a guarded global after its installer runs, by grep. A dynamic overwrite would be invisible to static reading. |
| Double-dialog interactions | `07c` notes that `cancelRequest` may raise both a native `confirm()` (L9973, on a different path) and the `GATE_SWEEP` gate (L20871). Which the operator actually sees was not observed. `16i` #11 reports the same for `commitHandover`. Both left as `UNVERIFIED`. |
| `audit_mut.js` | `L20751` names it as "the deliverable" that "will fail the moment somebody adds an ungated action". **No such file exists in this repository**, so the invariant that would have prevented this entire class of drift is unenforced. `00b` #14 and `11a` already record this; unchanged. |
| Completeness of §6 | §6 is bounded by the same method `00b` §4.8 used — pattern-matching mutating function names, then confirming an `onclick` call site. An action named outside the `remove/delete/commit/apply/toggle/send/save` prefix families, or invoked only from a dynamically-built handler string, could still be missing. The 23 in §6 are confirmed present; they are not proven exhaustive. |
