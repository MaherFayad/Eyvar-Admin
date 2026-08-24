# Corrections Applied (Pass 2 remediation)

> Input: `docs/02-verification/pass-2-accuracy-review.md` (§3 WRONG, §4 STALE, §5 OVERSTATED, §6 contradictions, §11 P1–P5)
> Target: `docs/01-modules/*.md` · Source of truth: `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> Method: **every** pass-2 finding was re-verified against the source with `awk`/`grep` before being applied. Nothing was applied on pass 2's authority alone. Five pass-2 findings were found to be partly or wholly wrong and are recorded in §6 below with evidence.

---

## 1. Summary

**24 of 61 module documents edited. ~118 individual citation/claim corrections applied. 5 pass-2 findings rejected or amended. 4 items deferred.**

| Document | WRONG fixed | STALE fixed | Overstated qualified | Notes |
|---|---:|---:|---:|---|
| `00b-global-ui-systems.md` | — | — | 1 | O2 — "~120 lines dead" |
| `00c-identity-permissions-and-audit.md` | 1 (C2) | 6 | — | incl. 2 extra `AV_COLORS` drifts I found |
| `02a-predictive-signals.md` | 2 (W7, W8) | 7 | — | |
| `02b-fraud-and-risk.md` | 1 (W9) | 6 | 1 (O4) | |
| `03a-dashboard.md` | 2 (W10, W11) | 14 | — | |
| `03b-work-inbox.md` | — | 8 | — | |
| `03c-notifications.md` | 1 (W12) | 24 | — | incl. the §5-vs-§6 internal contradiction |
| `04-live-map.md` | 1 (W5) | 29 | 1 (O1) | full `drawMap` + `updateMapStats` re-anchor |
| `08a-drivers.md` | — | 6 | — | rating-threshold topic |
| `09a-riders.md` | — | 1 | — | |
| `10d-compliance.md` | — | 4 | — | incl. 2 extra I found |
| `10e-safety.md` | 1 (W6) | 4 | — | incl. 2 extra I found |
| `11b-zones.md` | — | 2 | — | |
| `12a-finance.md` | 1 (W4) | 7 | — | |
| `12b-driver-wallets.md` | 1 (W1/C1, 2 occurrences) | 21 | 1 (O3) | |
| `12c-rider-wallets.md` | — | 8 | — | |
| `13a-support-center-tickets.md` | — | 1 | — | |
| `13b-disputes-and-lost-found.md` | — | 1 | — | |
| `13d-interventions.md` | — | 1 | — | extra, found by me |
| `15b-settings-team-roles.md` | 1 (W2/C2, 2 occurrences) | — | — | |
| `15d-settings-notifications.md` | 1 (W3) | 6 | — | |
| `15g-settings-cities.md` | — | 5 | — | |
| `15i-settings-limits.md` | — | 3 | — | range-endpoint |
| `16h-settings-ledger.md` | — | 2 | — | range-endpoint |

**Rejected / amended:** 5 (§6). **Deferred:** 4 (§7).

All 252 pre-existing `UNVERIFIED` markers are intact. One (`03b` item 20) was annotated with the now-verified line number **without removing the marker**. No section was renumbered, no analysis deleted.

---

## 2. WRONG claims corrected

| # | Doc | Claim was | Now reads | Source evidence |
|---|---|---|---|---|
| W1 / C1 | `12b` L529, L1202 | Audit-label map named **`AUDIT_LABELS`** | **`ACTION_LABELS`** | `grep -c AUDIT_LABELS` → **0**. L2898 = `var ACTION_LABELS={`; L2904–L2905 hold the four wallet keys, so the *line* cite was already right |
| W2 / C2 | `15b` L305, L356 | `avatarHTML()` at **L10824**, range L10824–L10836 | **L10836**, range **L10836–L10845** | L10824 = `Object.keys(PAGE_PERMISSIONS).forEach(function(pageKey){`; L10836 = `function avatarHTML(name,size,hasPhoto){`; L10845 = initials `return` |
| C2 | `00c` L825 | `avatarHTML(...)` at **L10838** | **L10836–L10845** | same read |
| W3 | `15d` L155 | "`2.5` … **four** separate times … L8013 **twice**" | "**five** separate times, on five lines … L8013 — the `parseFloat` fallback; the clamp bounds on that line are `5` and `1`" | L8013 = `Math.min(5,Math.max(1,parseFloat(val('cfg-notif-rating'))\|\|2.5))` — one `2.5`. Threshold-fallback occurrences: L8006, L8013, L12452, L12453, L15245 = **5** |
| W4 | `12a` L581 | `wallet-reason` required guard at **L3987** | **L3982** | L3982 = `if(!reason){toast('⚠ Pick a reason','warn');return;}`; L3987 = `if(!chk.ok){` (compCheck blocked branch) |
| W5 | `04` L573 | "`L.*` is only referenced from never-executed functions" | "not by this page; every `L.*` reference reachable from `p-live` sits inside `initLeafletMap`/`updateLiveMarkers`/`showHistoryRoute`, which never execute or no-op on a `null` `_lmap`. The one *live* Leaflet consumer in the file is the Settings → Cities preview (L7872–L7874)." | `showCityMapPreview()` L7865–L7875 calls `L.map` L7872, `L.tileLayer` L7873, `L.marker` L7874 and **is** called from L7862 |
| W6 | `10e` L528 | `safety.view` declared at **L10610** | **L10609** | L10609 = `{key:'view',label:'View incidents'}`; L10610 = `{key:'update_steps',…}`. Substance (never enforced) confirmed unchanged |
| W7 | `02a` L232 | max `subHealthScore` deduction **115** | **125 (25 + 15 + 25 + 10 + 20 + 30)** | L14219 −25, L14221 −15, L14224 −25, L14226 −10, L14227 −20, L14228 −30 |
| W8 | `02a` L247, L415 | "`subHealthScore` runs **three** full passes in `renderPredictivePage`" | "**two**" | Only L14368 (`.map(subHealthScore)`) and L14372 (`.filter(…subHealthScore(s).score<50)`) inside L14367–L14384 |
| W9 | `02b` L90, L161 | collision members "joined with `&nbsp;·&nbsp;`" | "joined with `'  ·  '` — two **plain** U+0020 spaces either side of U+00B7 (bytes `20 20 C2 B7 20 20`), not `&nbsp;`, so each pair collapses to a single space" | `cat -A` on L16508 → `.join('  M-BM-7  ')` = `20 20 C2 B7 20 20` |
| W10 | `03a` L83, L365 | `openHealthBreakdown`/`subHealthScore` "**only** invoked from the Renewal Pipeline page" | "not reachable from the dashboard itself … neither is exclusive to Renewal Pipeline" + full call-site lists | `subHealthScore(` at L3319, L14240, L14259, L14372, L20570, L20597, L21117 (+ `.map` ref L14368); `openHealthBreakdown` at L3368, L3372, L3373, L20601, L21139 (decl L20567) |
| W11 | `03a` L364 | `kpiScrollTo()` "its **22** call sites" | "its **42** call sites … 43 occurrences = 1 declaration + 42 calls" | `grep -o 'kpiScrollTo('` → 43; declaration L14535 |
| W12 | `03c` L37, L423, L560, L579 | `gateAll` registry at **L3138+**, header comment **L3123–L3136** | `gateAll()` **L20756**; header comment **L20740–L20755** | L3118–L3142 is the RBAC block (`can()` L3122, `requirePerm()` L3126, `logAction()` L3133). `grep -n gateAll` → L20756 (decl), L20899 (call) |
| O4 | `02b` L383, L425–426 | Heading "**Dead / unused** helpers adjacent to this module" | "Helpers adjacent to this module **that the fraud page does not use** … **None of the three is dead code, however**" + call sites | `hasOpenComplaint` L3530, L4288, L5690; `priorTripsWithRider` L5694; `openComplaintFor` L5761 |

---

## 3. STALE citations corrected

All verified by direct `awk 'NR==n'` reads of `eyvar_ops_panel_v40_fixed.html` unless noted. **Bold** entries in the "Claim" column are additional drifts I found and verified that pass 2 did not name.

### `12b-driver-wallets.md`
| Claim | Old | New |
|---|---|---|
| `p.pending += e.amount` (escrow release) — doc L92, L271, L432, L433 | L7065 | **L7066** |
| `p.earned += e.amount` — doc L90, L272, L1151 | L7066 | **L7067** |
| Escrow release range (doc L442) | L7065–L7066 | L7066–L7067 |
| `#payouts-pending-badge` sum — doc L202, L579, L933 | L8769 | **L8768** |
| `#avail-now-kpi` — doc L203, L557 | L8770 | **L8769** |
| `#avail-now-sub` — doc L204, L557 | L8771 | **L8770** |
| "Balance after deduction" — doc L292, L893, L1076 | L8982 | **L8981** |
| Per-row cells (doc L206) | L8761–L8763 | earned **L8762**, paidOut **L8763**, `<td>` pending **L8764** (from `pendingHTML` at L8757) |
| `status` set at creation — doc L167, L458, L459 | L12130 | **L12129** (L12130 is `createdAt:`) |
| Escalate-modal consequence copy — doc L460, L525 | L12162 | **L12165** |
| **Approve-modal consequence copy — doc L459** | L12163 | **L12166** |
| Repayment consequence copy (doc L922) | L12197 | **L12198** |

*Re-verified and left alone: `ensurePayoutEntry(e.driver)` at L7065 (doc L270, L431) is **correct** — the doc was internally inconsistent only because two different statements shared one line number.*

### `PAGE_PERMISSIONS` range-endpoint errors
| Doc | Claim | Old | New |
|---|---|---|---|
| `10d` L327, L582 | `PAGE_PERMISSIONS.compliance` | L10604–L10608 | **L10604–L10607** (L10608 opens `safety`) |
| `10e` L321, L574 | `PAGE_PERMISSIONS.safety` | L10609–L10614 | **L10608–L10613** (L10614 opens `growth`) |
| **`10d` / `10e`** | `defaultPagePerms()` | L10665–L10675 | **L10658–L10667** (decl `function defaultPagePerms(broadPerms){` at L10658) |
| **`10d` / `10e`** | `requirePagePerm()` | L10680–L10689 | **L10680–L10688** (L10689 is `togglePagePermission`) |

### `08a-drivers.md` (rating thresholds — `15i` used as reference, per C4)
| Claim | Old | New |
|---|---|---|
| `driver_min_rating_for_dispatch` seed — doc L171, L676 | L2584 | **L2585** (L2584 = `driver_max_consecutive_declines`) |
| `driverAutoRestricted()` rating exclusion — doc L171, L210 | L4507 | **L4506** (L4507 = `return null;`) |
| "Limited" bucket `d.rating>0 && d.rating<3.5` — doc L170, L682 | L6349 | **L6350** (L6349 = `var d=DB.drivers[id];`) |

### `00c-identity-permissions-and-audit.md`
| Claim | Old | New |
|---|---|---|
| Audit log 500 cap — doc L622, L669, L763 | L3151 | **L3148** |
| Free-text search haystack — doc L574, L671 | L9330 | **L9332** (L9330 is the `AUDIT_FILTER_ACTION` filter; L9332 is `var hay=(e.summary+' '+e.actorName+' '+(e.entityId\|\|'')+' '+e.id)`) |
| **`AV_COLORS` / `PHOTO_GRADS` — doc L625, L824** | L10836–L10837 | **L10834–L10835** |

### `12c-rider-wallets.md`
| Claim | Old | New |
|---|---|---|
| `window.__compApproved=false` reset (doc L362) | L3995 | **L3997** |
| `__compApproved` block (doc L769, L805) | L3991–L3995 | **L3992–L3997** |
| `DB.reasonCodes` taxonomy (doc L403, L854) | L14667–L14713 | **L14667–L14715** (closing `]` L14716). Count "40" and "all `active:true`" kept — both verified correct |
| `#comp-preview` red/blocked background (doc L682) | L15455 | **L15459** |
| **`compPreview()` range (doc L659)** | L15455–L15463 | **L15447–L15462** |

### `12a-finance.md`
| Claim | Old | New |
|---|---|---|
| `wallet-reason` custom-select markup (doc L581) | L3973 | **L3972** |
| `creditNote.reason` (doc L92, L387) | L15875 | **L15877** (L15875 = `againstPayment:`) |
| "Rider request" default selection (doc L387, L715) | L5544 | **L5542** (third argument of `customSelectHTML`) |
| **`csn-reason` select markup (doc L383, L578)** | L5541/L5542–L5544 | **L5540–L5542** |
| **`csn-reason` missing-element fallback (doc L578)** | L5551 | **L5554** |

### `15g-settings-cities.md`
| Claim | Old | New |
|---|---|---|
| `#city-map-preview` element | L1637 | **L1639** |
| `showCityMapPreview()` | L7864–L7874 | **L7865–L7875** |
| `typeof L==='undefined'` guard | L7869 | **L7871** |
| OSM tile request | L7871 | **L7873** |

### `15d-settings-notifications.md`
| Claim | Old | New |
|---|---|---|
| Low-rating rule block (doc L85, L218) | L12451–L12456 | **L12451–L12455** |
| **`sendSystemEmail` call (doc L142, L157, L186)** | L12455 | **L12454** (L12455 is `}`) |

### `16h-settings-ledger.md`
| Claim | Old | New |
|---|---|---|
| `#p-settings` page range | L1416–L2050 | **L1416–L2048** |
| Settings tab group "Operations" | L1425 | **L1424** (L1425 is the *dispatch* tab button) |

### `15i-settings-limits.md`
| Claim | Old | New |
|---|---|---|
| `DB.opsLimits` (doc L3, L115, L170) | L2584–L2593 | **L2584–L2591** rows (array **L2583–L2592**). Count "8 rows" and values `3, 3.5, 10, 1, 3, 30, 5, 3.5` kept — verified correct |

### `02a` / `02b` — shared seed and i18n drift
| Claim | Old | New |
|---|---|---|
| `sec.intelligence` Arabic (`02a` L392/L449, `02b` L359/L428) | L7913 | **L7912** (L7913 holds `sec.growth`/`finance`/`support`/`config`) |
| `DB.drivers` seed (`02a` L414/L439, `02b` L164/L346/L405) | L2632–L2669 / L2632–L2663 | **L2632–L2668** (record literals; `},` closes at L2669) |
| `DB.incidents` seed (`02a` L99, L380, L473) | L13389–L13394 | **L13389–L13393** (L13394 = `var INC_STEPS=`) |
| DRV-0101 trip list (`02b` L190) | L2632 | **L2636** (`trips:['TRP-7741','TRP-9005','TRP-7720']`) |

### `03a-dashboard.md`
| Claim | Old | New |
|---|---|---|
| `navCurrent` initialisation | L2852 | **L2850** |
| Tick-engine `renderDashboard()` | L12613 | **L12614** |
| Tick-engine `minutesUntil` decrement | L12611 | **L12612** |
| Synthetic ticket ages `[190,26,1500,55,8]` | L15226 | **L15191** |
| `backfillReasonCodes()` | "L15221-region" | **L15187** |
| `reqClearLocks()` | L5227 | **L5229** (call site L5218) |
| `confirmModal()` | L5232 | **L5233** |
| `applyLanguage()` | L7907–L7924 / L7907 | **L7939–L7953** |
| `sec.overview` Arabic | L7910 | **L7912** |
| `#dash-qr-count` | L693 | **L692** |
| `#dash-alerts-count` | L702 | **L701** |
| Intervention `Open ticket` button | L9467 | **L9468** |
| Intervention `Assign now` button | L9484 | **L9485** |
| Intervention `Find driver` button | L9515 | **L9514** |

### `03b-work-inbox.md`
| Claim | Old | New |
|---|---|---|
| `dueMs = -1` sentinels (doc L314, L340) | L19155, L19169, L19192 | **L19154, L19168, L19191** |
| `backfillReasonCodes` ages (doc L316) | L15226 | **L15191** |
| `backfillReasonCodes()` (doc L389) | "L15221-region" | **L15187** |
| `nav.inbox` Arabic | L7910 | **L7911** |
| `sec.overview` Arabic | L7910 | **L7912** |
| `TEAM_ROLES` (doc L145) | "L10480-region" | **L10501** |
| `#sbb-inbox` (doc L279) | L19311–L19319 | L19311–L19319 ✓ kept + formula anchor **L19315–L19316** added |

### `03c-notifications.md`
| Claim | Old | New |
|---|---|---|
| `handleNotifClick` `ticket→go('support')` (doc L157, L489) | L2272 | **L2273** |
| `approval→go('drivers')` (doc L159, L490) | L2273 | **L2274** |
| `renewal→go('renewal')` (doc L158, L491) | L2274 | **L2275** |
| `payout→go('wallets')` (doc L160, L492) | L2275 | **L2276** |
| Destination range (doc L126, L154, L424) | L2272–L2275 | **L2273–L2276**. L2272 = `if(typeof n.action==='function')n.action();` — that citation was already correct where used for `n.action` and was left alone |
| `error` → `critical` (doc L164) | L2191 | **L2192** — resolves the §5-vs-§6 internal contradiction; §6's annotated block already said L2192 |
| `alert` branch (doc L156) | L2192–L2195 | **L2193–L2196** |
| Toast bridge (doc L352, L654) | L5292–L5297 | **L5294–L5296** |
| `toastTypeToNotif` (doc L170, L355, L356, L557, L654) | L5292 / L5293 | **L5294** (`if(notify!==false…)`) / **L5295** |
| Outside-click listener (doc L31, L421, L628) | L2223–L2226 | **L2224–L2227** |
| `#p-notifications-all` block (doc L11, L74, L399, L539, L608) | L1171–L1189 | **L1171–L1187** (L1189 is the Predictive-Signals banner) |
| Deliberate no-op comment (doc L431) | L2276–L2279 | **L2277–L2279** |
| Type-support routing (doc L572) | L2273–L2274 | **L2274–L2275** |

### `04-live-map.md` — `drawMap` layer re-anchor (§4 table)
| Layer | Old | New |
|---|---|---|
| 8 Planned route | L12859–L12861 | **L12860–L12863** |
| 9 Route shadow | L12869–L12879 | **L12872–L12884** |
| 10 Main line | L12881–L12891 | **L12885–L12897** |
| 11 Start marker | L12894–L12897 | **L12899–L12903** |
| 12 End marker | L12900–L12902 | **L12905–L12908** |
| 13 Car glow | L12915–L12917 | **L12923–L12926** |
| 14 Car dot | L12919–L12921 | **L12927–L12930** |
| 15 Flight-tracker | L12926–L12941 | **L12932–L12950** |
| 16 Start/end labels | L12944–L12948 | **L12952–L12957** |
| Car position | L12905–L12913 | **L12910–L12921** |
| Early return | L12852–L12855 | **L12853–L12855** |
| Canvas palette span | L12819–L12941 | **L12820–L12957** |

*Layers 1–7 (L12819–L12850) re-verified **correct** and left untouched, as pass 2 said.*

### `04-live-map.md` — `updateMapStats` and single-line drifts
| Claim | Old | New |
|---|---|---|
| `updateMapStats()` range (doc L155, L166) | L12745–L12775 | **L12745–L12771** |
| Driver cell (doc L172, L553) | L12761 | **L12758** |
| Separator cell (doc L173) | L12762 | **L12759** |
| Rider cell (doc L174, L553) | L12763 | **L12760** |
| From cell (doc L175) | L12766 | **L12762** |
| Distance cell (doc L177) | L12768 | **L12765** |
| Duration cell (doc L178) | L12769 | **L12766** |
| On-time colour (doc L179) | L12757–L12758 | **L12755–L12756** (+ cell at L12767) |
| Driver★ cell (doc L180) | L12770 | **L12768** |
| Replay-label reset (doc L156) | L12773–L12774 | **L12769–L12770** |
| Replay clock writer (doc L156) | L12977 | **L12975** |
| `#rp-fill` width (doc L157) | L12975 | **L12974** |
| Replay duration `3000` ms (doc L600) | L12971 | **L12973** |
| `startReplay()` range (doc L467) | L12962–L12980 | **L12962–L12981** |
| Hit-test `bd=18` (doc L126) | L12633 | **L12632** |
| `selectTrip(best)` + toast (doc L126) | L12640 | **L12639** |
| `#active-trips-count` write (doc L152) | L11660 | **L11661** |
| Chat `Math.random()<0.02` (doc L483, L605) | L12594 | **L12593** |
| `showNearbyDriversMap` footer (doc L29, L561) | L8452 | **L8451** |
| `%5` tick block (doc L485) | L12602–L12613 | **L12601–L12610** |
| `%60` tick block (doc L486) | L12614–L12626 | **L12611–L12624** *(see §6 R4 — pass 2 said L12621)* |
| 15/20/30/45-tick calls (doc L487) | L12511–L12516 | **L12512–L12516**, with the added note that L12514 inside that span is a separate `%60` `updateOnCallChip()` |

### Element-id citations
| Doc | Element | Old | New |
|---|---|---|---|
| `13a` L730 | `#dispute-count` | L1369 | **L1370** |
| `13b` L493 | `#dispute-count` | L1369 | **L1370** |
| `11b` L533 | `#zones-table` | L14147 | **L14149** |
| `11b` L628 | `#exec-expansion-list` | L617 | **L618** |
| `09a` L323 | `avatarHTML(r.name,38,r.hasPhoto)` | L11142 | **L11143** |
| **`13d` L167** | `{html,sort}` pushes | L9473, L9487, L9515 | **L9470–L9471, L9487–L9488, L9516–L9517** |

---

## 4. Contradictions resolved

| # | Topic | Docs affected | Resolution | Evidence |
|---|---|---|---|---|
| C1 | Name of the audit-action label map | `12b` (wrong) vs `00c` (right) | `12b` changed to **`ACTION_LABELS`** in both places | `grep -c AUDIT_LABELS` → 0; `grep -c 'DB.actionLabels'` → 0; L2898 `var ACTION_LABELS={`, consumed L9238 |
| C2 | `avatarHTML()` declaration line | `15b` (L10824), `00c` (L10838) vs `08a`/`08b`/`09a`/`09b` (L10836) | Both minority docs changed to **L10836–L10845**; the four-doc majority was already right and was left untouched | L10836 `function avatarHTML(name,size,hasPhoto){` … L10845 initials `return`. Bonus: `00c`'s adjacent `AV_COLORS`/`PHOTO_GRADS` cite also corrected to L10834–L10835 |
| C3 | `avatarOrInitials()` vs `avatarHTML()` | — | **No contradiction — no edit.** Re-confirmed: two distinct functions with distinct signatures and call sets | `avatarOrInitials(u,size)` L2915–L2919 reads `u.photo`; `avatarHTML(name,size,hasPhoto)` L10836 reads `hasPhoto` |
| C4 | "Low rating" 3.5 vs 2.5 | `08a`, `15i`, `03c`, `06a`, `10a`, `15d` | **No contradiction — no prose changed.** Two genuinely different thresholds. Only `08a`'s stale line numbers on the topic were corrected, using `15i` as the reference | `lowRatingThreshold = 2.5` seed L2571, read L15245, compared L15247; `driver_min_rating_for_dispatch = 3.5` seed L2585, read L4506; hardcoded `<3.5` tier bucket L6350/L6372/L6373 |
| C5 | Duplicate `support` router branch | `00a`, `13a` | **No contradiction — no edit.** Both cite L8789 and L8806 identically | verified as pass 2 states |
| C6 | Page-container line-range convention | all page-owning docs; `16h` the exception | Convention confirmed consistent; **`16h`'s overshoot fixed** (`#p-settings` L1416–**L2048**) | L2048 `</div>`; L2050 `<!-- ═══ ACTIVITY LOG PAGE ═══ -->`; L2051 `p-audit-log` |
| C7 | Document-*approve* permission | `10d`, `08b` | **Resolved: no document asserts one.** `grep` for `approve_document` / `compliance.approve` / "document-approve" across all 61 docs → **0 hits**. `08b` correctly names `reject_document` only and gates on the legacy `approve_drivers`. No edit needed | `PAGE_PERMISSIONS.compliance` L10604–L10607 has only `view` + `edit_dates`; `ACTION_LABELS` L2905 has `reject_document`, no `approve_document`. `08b`'s own `L2903–L2905` cite verified exact |

---

## 5. OVERSTATED claims qualified

| # | Doc | Was | Now |
|---|---|---|---|
| O1 | `04` §4.5 heading (L128), body (L142), §18.3 (L651) | "**entirely dead code**"; "`renderLiveMap()` and `initLeafletMap()` are **never called** from anywhere (grep confirms definitions only)" | Heading → "**inert: nothing it draws ever reaches the screen**". Body now states precisely: `renderLiveMap()` has no caller at all (1 grep hit, its own declaration L11632); `initLeafletMap()` has exactly one call site — **L11633, inside `renderLiveMap()`** — so it too never runs; `updateLiveMarkers()` and `showHistoryRoute()` **do** have live call sites (L12598, L12688) and no-op on `_lmap === null`. Added: "dead" means *produces no output*, not *costs nothing* — Leaflet CSS+JS still load from unpkg on every page load (L469–L470) |
| O2 | `00b` L1134 | "**~120 lines** of dead Leaflet code" | "A **~110-line** Leaflet region (**L11526–L11635**) whose output never reaches the screen … Strictly, only `renderLiveMap()`/`initLeafletMap()` are unreachable; `updateLiveMarkers()` and `showHistoryRoute()` *are* called (L12598, L12688) but return immediately because `_lmap` is permanently `null`." |
| O3 | `12b` L58 | "Only **two** of these six are actually enforced anywhere" | "Only **two of these six page-permission keys** are enforced through the page-permission layer … **but that is not the same as 'only two actions are protected'**" — the legacy gates `requirePerm('process_payouts')` L7024, `requirePerm('release_escrow')` L7059, `requirePerm('apply_deductions')` L7073 are now named in the *same sentence*, plus the note that `defaultPagePerms` (L10664) grants every page `view` to everyone, so an unenforced `view` key is inert by construction |
| O4 | `02b` §15.15 (L383) + reference table (L425–426) | Heading "**Dead / unused** helpers adjacent to this module" | "Helpers adjacent to this module **that the fraud page does not use**" + explicit "**None of the three is dead code, however**" with all six live call sites. Reference-table labels changed from "(unused here)" to "(not used by this page; live callers at …)" |
| O1-adjacent | `04` L572, §15 dependency table | "the Leaflet layer is dead code (§4.5)" | "the Leaflet layer is inert — see §4.5" (wording aligned with the corrected §4.5) |

---

## 6. Pass-2 findings I REJECTED or AMENDED

| # | Pass-2 said | My finding | Evidence | What I did |
|---|---|---|---|---|
| R1 | §4 `02a`/`02b`: "`DB.drivers` seed block L2632–L2669 → Block closes **L2668**; **L2669 is `trips:{`**" | The *conclusion* is right (record literals end at L2668) but the *stated evidence is wrong*: **L2669 is `},`** — the closing brace of the `drivers:` object. `trips:{` is **L2670** | `awk 'NR==2669'` → `  },` ; `awk 'NR==2670'` → `  trips:{` | Applied the conclusion (docs now cite **L2632–L2668**), rejected the stated evidence |
| R2 | §4 `03b`: "`Open ticket` / `Assign now` / `Find driver` buttons — L9467 / L9484 / L9515", filed under **`03b-work-inbox.md`** | Those three citations do **not exist in `03b`**. They are in **`03a-dashboard.md`** L154–L156 (the intervention feed). `03b`'s own `Open ticket` cite is `L19123`–`L19131`, which is correct | `grep -n 'L9467\|L9484\|L9515' 03b-work-inbox.md` → no matches; same grep on `03a` → L154, L155, L156 | Applied the corrections to **`03a`** instead. `03b` needed no change here |
| R3 | §4 `03b`: "`#sbb-inbox` badge formula — cited **L19319** → actual L19315–L19316; L19319 is `}`" | `03b` L279 does **not** cite a bare L19319 as the formula; it cites the range **`L19311`–`L19319`**, which is the exact extent of `updateInboxBadge()` and is **correct** | L19311 `function updateInboxBadge(){` … L19319 `}` | Did **not** treat the range as an error. Added the precise formula anchor `L19315`–`L19316` as a parenthetical, leaving the correct range in place |
| R4 | §11 P3b item 23 / §4 `04`: "`%60` tick block … L12614–L12626 → **L12611–L12621**" | Start is right (**L12611**); the **end is wrong**. L12621 only closes the inner `if(typeof complianceScan==='function'){`. The `%60` block continues with `recalcDriverTiers()` L12622 and `recalcRiderTiers()` L12623 — both of which the doc's own cell enumerates — and closes at **L12624** | `awk 'NR==12622,NR==12624'` → `recalcDriverTiers`, `recalcRiderTiers`, `}` | Applied **L12611–L12624**, not pass 2's L12611–L12621 |
| R5 | §4 `12b`: per-row cells → "pending **L8757**" | L8757 is where the `pendingHTML` *fragment* is built (`var pendingHTML='<span …`); the actual `<td>` that emits it is **L8764**. Citing L8757 alone as "the pending cell" is as imprecise as the original L8763 | `awk 'NR==8757'` and `awk 'NR==8764'` | Documented **both**: "earned `L8762`, paidOut `L8763`; the pending cell is emitted at `L8764` from the `pendingHTML` fragment built at `L8757`" |

*Additionally, pass 2's §5 O1 writes "`showHistoryRoute()` from `selectTrip` (L12688)". `selectTrip` is declared at L12687; L12688 is the call site inside it. Not an error — recorded only so the distinction is on file.*

---

## 7. Deferred / could not verify

| # | Item | Reason |
|---|---|---|
| D1 | **3 of the 15 WRONG findings** in the §2 scorecard | §3 itemises only **12** (W1–W12). The scorecard totals 15 across the mechanical and hand-verified rows, but the remaining 3 are not named anywhere in the report. There is nothing actionable without re-running the sweep |
| D2 | **~14 of the ~99 STALE citations** | §4 names roughly 85 explicitly; the remainder is described only statistically ("the automated matcher's raw mismatch buckets … the ~28 figure is the residue that survived that review"). I corrected every named one **plus ~20 additional drifts I found and verified myself**, but the unnamed remainder cannot be located without re-running the mechanical matcher |
| D3 | **P5 item 28** — re-audit `00d`, `13c`, `13d`, `15k`, `16i`, `16j`, `16k`, revised `16h` | Out of scope for a remediation pass. These eight documents were written *during* pass 2 and their accuracy is **unassessed**, not clean. (`13d` and `16h` did receive the specific corrections pass 2 named.) They need a pass-2-equivalent audit of their own |
| D4 | **P5 item 29** — mechanical citation check in CI | Tooling/process recommendation, not a documentation correction |

---

## 8. Residual accuracy position

**What is now true of the corpus:**

- **All 12 itemised WRONG claims are corrected**, each re-verified against source before editing. The two findings pass 2 called "genuinely misleading" — `12b`'s invented `AUDIT_LABELS` identifier and `15b`'s L10824 `avatarHTML()` — are gone, and the documents that were already right (`00c` on the identifier; `08a`/`08b`/`09a`/`09b` on the line) were left untouched, so the corpus is now internally consistent on both.
- **All 5 OVERSTATED claims are qualified**, in each case by *adding* the missing scope rather than deleting the underlying observation. The Leaflet "dead code" framing now distinguishes *unreachable* (`renderLiveMap`, `initLeafletMap`) from *reachable-but-inert* (`updateLiveMarkers`, `showHistoryRoute`) from *still costs a network round-trip* (L469–L470), consistently across both `04` and `00b`.
- **All 7 §6 contradictions are settled.** Three (C3, C4, C5) were false alarms and are recorded as such rather than "fixed"; C1, C2 and C6 were resolved in favour of the source; C7 was resolved by grep — no document in the set ever asserted a document-approve permission, so the flag closes clean.
- **`03c`'s internal §5-vs-§6 contradiction is gone** — both sections now say L2192 for `error → critical`.
- **All range-endpoint spills identified in P2 are fixed**, plus two more (`defaultPagePerms`, `requirePagePerm`) that pass 2 missed and that appeared identically in both `10d` and `10e`.

**What is still weak:**

- **Citation drift remains the corpus's dominant defect class**, and this pass did not eliminate it. I corrected every citation pass 2 named plus ~20 more found while verifying, but the ±1–3 drift into HTML-template interiors and multi-line object literals is a *systematic* property of how the docs were written, not a finite list of typos. Pass 2's own estimate — 54% exact, 74% within ±3 — remains the right prior for any citation this pass did not touch. **Treat any un-audited `L####` that points into a template string as approximate.**
- **Eight documents remain unassessed** (D3). They are not known-bad; they are unknown.
- **The money is still the strongest part of the set.** Nothing in this remediation touched a financial formula, because pass 2 re-derived all 28 and all 28 matched. Every edit made to `12a`/`12b`/`12c` was a line number or a scope qualifier — no arithmetic changed.
- **The `UNVERIFIED` discipline held.** 252 markers survive intact. The one marker annotated (`03b` item 20, `TEAM_ROLES`) retains its "UNVERIFIED" label with the resolution appended, rather than being silently deleted — the epistemic record is preserved.

**Bottom line:** the substantive claims in this documentation set were already sound, and are now sounder. The remaining risk is navigational (a citation lands a line or two off), not semantic (a claim is false). A reader who treats line numbers as ±3 anchors and identifier names as exact will not be misled by anything remaining in `docs/01-modules/`.

---

# Part 2 — Pass 2b remediation

> Input: `docs/02-verification/pass-2b-supplementary-audit.md` (§4 WRONG, §5 STALE, §6 OVERSTATED, §7 contradictions, §8 negative claims, §10/§11 enumerations, §12 P1–P6)
> Target: `docs/01-modules/*.md` — the eight documents pass 2 left unassessed (`00d`, `13c`, `13d`, `15k`, `16h`, `16i`, `16j`, `16k`), plus `16a`–`16g` for one replicated header error
> Source of truth: `eyvar_ops_panel_v40_fixed.html` (21,857 lines — re-confirmed)
> Method: same as Part 1. **Every** pass-2b finding was re-derived from source with `awk`/`grep` before being applied. Nothing was applied on pass 2b's authority alone. Four pass-2b findings were found wrong or mis-scoped and are recorded in §9 with evidence.

---

## 1. Summary (applied / rejected / deferred, by document)

**15 module documents edited · 333 distinct text replacements (several covering 2–3 occurrences each) · 4 pass-2b findings rejected or re-scoped · 3 items deferred.**

| Document | False negatives fixed | WRONG fixed | STALE fixed | Overstated qualified | Edits |
|---|---:|---:|---:|---:|---:|
| `16h-settings-ledger.md` | — | 6 (H1–H6) | 11 | 1 (O14) | 43 |
| `13c-contact-drivers.md` | 1 (N9/G12) | 10 (C1–C10) | ~28 | 2 (O7, O8) | 43 |
| `15k-settings-reason-codes-sla.md` | 2 (N7 `owner`, `commitPolicy`) | 15 (K1–K15) | ~14 | 2 (O9, O10) | 45 |
| `16i-settings-rota-oncall.md` | 1 (frozen-clock) | 2 (R1, R2) | 28 | 1 (R1) | 49 |
| `13d-interventions.md` | — | 5 (V1–V5) | 22 | 3 (O11–O13) | 44 |
| `00d-i18n-and-localisation.md` | 2 (`data-i18n` L1992, `.timezone` L19760) | 11 (D1–D11) | 8 | 4 (O1–O4) | 32 |
| `16k-audit-log.md` | — | 6 (A1–A6) | 18 | — | 37 |
| `16j-settings-activity.md` | 1 (`stabgrp` orphans) | 8 (J1–J8) | 13 | 1 (O6) | 33 |
| `16a`–`16g` (7 docs) | — | — | 1 each | — | 7 |

**Rejected / re-scoped:** 4 (§9). **Deferred:** 3 (§10).

All pre-existing `UNVERIFIED` markers are intact except one, which was **deleted because the claim it guarded was proved mathematically impossible** (`16h` §7.9 / H3 — see §4). One marker (`13c` G22) was converted to **RESOLVED** with the resolving evidence written in, because its premise has now been read; the row was kept in place rather than removed. One new `UNVERIFIED` was **added** (`00d` F2, per O4). No section was renumbered, no analysis deleted.

---

## 2. False negative claims corrected (the highest-value fixes)

Pass 2b was the first pass to find false negatives in this corpus — 7 of 107. A false "this is dead / never called" claim is actively dangerous because it invites deletion of live code. **All seven re-verified independently, all seven confirmed false, all seven corrected.**

| # | Doc | The negative as written | My grep | Verdict | What it now says |
|---|---|---|---|---|---|
| N7 | `15k` §9, §13.1 | "**`owner` is DEAD** — `renderReasonCodesTable()` L15085 only. Grep for `.owner` outside the registry finds no reader… nothing routes, filters, reports or escalates by owner" | `grep -n "\.owner"` → **L14831**, **L15001**, **L15035**, L15086, L15104 (+ header L15041, panel copy L15044) | ❌ **FALSE** | §9's row reads **Live**, listing the ticket SLA detail chip (L14831) and the Contact-drivers CPT report column (L15001 → L15035, header L15041, reading instruction L15044). §13.1 rewritten: what is missing is an owner *filter*, *routing* and *escalation*; the reporting half of L14666's promise **is** implemented. `13a` and `13c` were right (X1). |
| — | `15k` §9 | "**Every one of the 20 keys** [of `DB.commitPolicy`] has at least one reader outside Settings" | `riderWaitMin` → L16545, L17087 only · `riderNoShowPayPct` → L16546, L17088 · `payoutDays` → L16547, L17089 | ❌ **FALSE** | Now: "**17 of the 20**… Three do not — `riderWaitMin`, `riderNoShowPayPct`, `payoutDays` are editable, saved and never read." Each returns exactly two hits, both the seed and its own settings row. |
| N9 | `13c` §17 G12 (+§10.1, §10.2, §11 A12, §13.2, §13.3) | "**`gvRC()` reads the wrong element** … every wrap-up and every logged contact is coded `OTHER_UNCODED`" | **L14761** `return customSelectHTML(cselId,'nt-reason',…)` · **L5352** `+'<input type="hidden" id="'+fieldId+'"…'` · `grep -on "nt-reason"` → L2423, L2546, **L14751**, **L14761** | ❌ **FALSE, and inverted** | See §5 — this is the single most consequential fix in the pass. |
| N14 | `00d` §4.2B/F5, `16j` §10/§13/§14.11 | "**7 orphan `stabgrp.*` keys** … dead data … evidence of an abandoned refactor" | `SETTINGS_GROUPS` **L21270–L21277** → `h.setAttribute('data-i18n',g.i18nKey)` **L21296**; `reorderSettingsTabs()` **L21278–L21314** called from `presenceBoot()` **L21393**, booted **L21825** | ❌ **FALSE** | Six of seven are consumed at runtime. True orphan count is **1** (`stabgrp.other`, L21307). See §6. |
| — | `00d` §8.2/§11/F14 | "`.timezone` is read … **at L19760** where it is concatenated into a static sentence" | L19760 reads **`DB.onCallSchedule.timezone`** (own seed L19599), not `DB.opsConfig.general.timezone` | ❌ **FALSE** (misattribution) | Corrected — and the write-only verdict is now **stronger**: the General timezone has **no** reader outside its own form at all. |
| — | `16i` §7.2/§11/§13 item 4 | "the rest of the panel runs on **the frozen demo clock `REQ_NOW_REF`**" | **L14627** `function nowMs(){return Date.now();}` · `REQ_NOW_REF` advanced every tick at **L9680**, and L9574's own comment says so | ❌ **FALSE** on both halves | See §9 R-2 — applied with a corrected scope, because pass 2b's replacement scoping was also wrong. |
| — | `00d` §2.1(3)/§5.1/§5.5/§11/F1 | "the **last `data-i18n` in the file is at L1992**"; "generated content is structurally unreachable" | `grep -n data-i18n \| tail` → **L21307**; hits past L2100 = L7947, L7948, **L21296**, **L21307** | ❌ **FALSE** | Corrected. The *string-literal* form of the claim survives (no `innerHTML` builder emits it); the emitter is `setAttribute`, once, at boot. See §6. |

---

## 3. Fabricated identifiers removed

Five identifiers were named as source symbols and do not exist. Each confirmed at **0 occurrences** before editing. This is pass 2's `AUDIT_LABELS` failure mode, five more times.

| Identifier | `grep -c` | Doc / places | Real symbol | Now reads |
|---|---:|---|---|---|
| **`slaOpen()`** | **0** | `13c` §4.7, §6.5, §7.2 (channel table), §18 index — 4 places; plus one inherited mention in `13d` §15.3 | `slaStampNewTicket(id,code,channel)` **L14839–L14852** | Renamed in all 5 places. `t.openedAtMs=nowMs()` is L14843 (the doc's single-line cite was right; only the *name* and the *range start* were wrong). `13a` had it right (X3). |
| **`commitSurgeSchedule`** | **0** | `16k` §7.2 | `saveRideTypes()` declared **L12375**, logs at **L12385** | Renamed, with the zero-grep recorded inline so the claim cannot silently regress. |
| **`commitSearchPhases`** | **0** | `16k` §14 item 9 | `saveSearchPhases()` declared **L8115**, logs at **L8117** | Renamed. Also fixed the sibling error in the same sentence: `saveSurgeSchedule` **does** exist but at **L12321**, not L12385 (A4). |
| **`#wrap-reason`** | **0** | `13c` §10.2, §13.2 | wrapper is `csel-wrap-reason`; the value-bearing field is **`#nt-reason`** | Replaced; the sentence now names the wrapper and the hidden field separately and states explicitly that no `#wrap-reason` element exists. |
| **`#lc-reason`** | **0** | `13c` §10.1, §13.3 | wrapper is `csel-lc-reason`; value field is **`#nt-reason`** | Same treatment. |

---

## 4. `16h` gate-ordering analysis — rewritten sections

**Independently verified before rewriting.** The chain, read line by line:

| Step | Line | What |
|---|---|---|
| 1 | **L17853** | `function installActionGates(){` |
| 2 | **L17901–L17907** | `n+=guardAction('recordRefund', function(riderId,amount,reason){ … danger:true, irreversible:true … })` |
| 3 | **L18089** | `installActionGates();` — **top-level call** |
| 4 | **L18260** | `GATE_SPECS.acceptEmergency` |
| 5 | **L18383** | `installUniversalGates();` — **top-level call**; `acceptEmergency` is a hoisted declaration at L17315, so `guardAction` finds it |
| 6 | **L19961** | `var __origRecordRefund=recordRefund;` — captures the **guarded** function, not the raw one |
| 7 | **L20007** | `var __origAcceptEmergency=acceptEmergency;` — same |

`guardAction`'s wrapper (L17822–L17837) ends with `confirmAction(spec);` at L17836 and has **no `return`**, so it evaluates to `undefined`. Therefore `entry` at L19965 is `undefined`, `if(entry)` (L19966) is false, and no `refund` posting is made; `d.status==='Accepted'` (L20013) is false, and neither `emergency_cover` nor `emergency_recovery` is made. On confirm, `orig.apply(null,args)` (L17834) calls the **raw pre-guard** function, bypassing the ledger wrapper entirely.

**Four sections rewritten:**

| Section | Was | Now |
|---|---|---|
| **§10 ⚠ ordering row** | "`commitWalletAdjust` is guarded (L17886) but **`recordRefund`/`creditRiderWallet` are not, so no conflict is observable** — `UNVERIFIED: ordering has no observed effect`" | ⛔ row: full install-order table (17819 / **17853→18089** / 18372→**18383**), the `undefined`-return mechanism, and the consequence: **the `refund`, `emergency_cover` and `emergency_recovery` entry types cannot be produced through any UI path in this build.** `commitWalletAdjust`'s guard re-cited **L17889** (L17886 is `};`). Notes that `creditRiderWallet`/`debitRiderWallet` are patched but *not* guarded, so they post normally. |
| **§5 ⚠ + the actions table** | "**`demoDoubleRefund()` is a destructive demo button with no confirmation** and no permission gate" | "no **permission** gate, and it cannot do what it claims". States that the "Issue refund" gate modal **does** open (L17901–L17907 → L17836), that both calls therefore return `undefined`, and that the button **always** toasts `⚠ Duplicate was NOT suppressed` (L20140) — the exact opposite of "Proof, not decoration" (L20129–L20130). Confirms? column changed **no → yes**. |
| **§6 "Modals opened"** | "**None.**" | "**One** — and it is raised by a wrapper installed outside this module, which is why an earlier revision missed it." Names `confirmAction` at L17836 with the spec built at L17902–L17907. |
| **§13 item 1** | "issues a real SAR 25 refund with **no confirmation**, no permission gate" | Rewritten: there *is* a confirmation; what is broken is that the demo can never demonstrate suppression, and that on confirm a real refund + credit note are issued **with no ledger posting** against an already-burnt idempotency key. Permission-gate criticism retained (it is true). |

**Two further §1/§9 corrections following from the same chain:** §1's "Five real money paths … are monkey-patched" (H6) now reads four patches + one new function, with only two of the four actually reaching `postLedger`; §9.1/§9.2 restated to match, and the §9.2 table now flags `recordRefund` and `acceptEmergency` ⛔ with the mechanism.

**Also in `16h`, verified and applied:**

- **H3 — the rounding warning deleted (§7.9 and its UNVERIFIED item).** L20038 is `var net=r2(gross/(1+rate)), vat=r2(gross-net);` — `vat` is the **residual**. `gross` is already 2-dp (`r2` at L20033), so `gross-net` is exactly 2-dp and the outer `r2()` is a no-op; `net+vat === gross` by construction, and the same holds for the refund patch at L19968. The warning described a mathematically impossible event, so the ⚠ and its `UNVERIFIED` marker were **removed** rather than qualified. The separate, correct observation (§13 items 8/9: `withIdempotency` records the key regardless of `postLedger`'s return, L20049 `return true;` unconditional) is retained and re-anchored.
- **H4 — §8.2 "one of the 8 entry types" → 7.** `grep -on postLedger` → 8 hits = 1 declaration (L19917) + **7** call sites (L19969, L19985, L19997, L20014, L20018, L20040, L20045). §8.3's 8th row is a `*(none)*` placeholder.
- **H5 — §7.6 walk decomposition, which contradicted §7.8 of the same document.** Correct: 12 (`trialBalance` rows, L19950) + 1 (`trialBalance` own totals, L19953–L19955) + 4 (`ledgerReconcile` L20063/L20064/**L20065**/L20066 — the `*0` term still costs a walk) = **17 per render**. `demoDoubleRefund`'s two (L20133, L20136) are **per click**. The total was right by coincidence; every term was wrong.
- **O14 — §8.3 "the regex on `goodwill|apolog` is redundant" → precedence.** A reason matching *both* regexes (e.g. "Goodwill compensation") books to `expense.goodwill` **because** the first test runs first; delete it and the same reason books to `expense.compensation`.

---

## 5. `13c` `gvRC` claim — corrected (propagated from the task brief, not invented)

**This is a propagated error, not an invention by the document's author.** The claim that `gvRC()` reads the wrong element was stated as established fact in the brief that commissioned the `13c` analysis; pass 2b records the same thing (X2: *"The pass-2b brief itself inherited `13c`'s error"*), and the document's own §17 G22 flagged the premise as unread rather than asserting it silently. The author reasoned correctly from a premise handed to them. That is worth stating precisely, because the remedy is different: the fix is upstream in how negatives are commissioned, not in the author's method.

**Independently re-derived:**

```
L14755  function reasonSelectHTML(cselId,selected,onChangeExpr){
L14761    return customSelectHTML(cselId,'nt-reason',opts,selected||'',      ← fieldId hard-coded
L14762      'Search 38 reason codes…',onChangeExpr||null,null);

L5336   function customSelectHTML(cselId,fieldId,options,selectedValue,…){
L5352     +'<input type="hidden" id="'+fieldId+'" value="'+(selectedValue||'')+'">'   ← id = fieldId

L14749  /* Reads the reason picker in whichever ticket modal is open. */
L14750  function gvRC(){
L14751    var el=document.getElementById('nt-reason');
```

All **eight** `reasonSelectHTML` call sites — L2423, L2546 (new ticket), L14894 (change reason), L15314 (low rating), L16188 (bulk), L16223 (log contact), L16448 (desync), L20286 (wrap-up) — pass only a *wrapper* id and therefore all emit `#nt-reason`. `gvRC()` reads exactly the open picker. Wrap-up and log-contact code **correctly**.

**Six assertions corrected:**

| Place | Was | Now |
|---|---|---|
| §10.1 `lc-reason` row | "**None** — `gvRC()` (L14748) reads `#nt-reason`, **not `#lc-reason`**, and falls back to `'OTHER_UNCODED'`" | Row relabelled to the real element (`#nt-reason` inside wrapper `csel-lc-reason`); validation now reads "nothing rejects an unpicked code; `gvRC()` (L14750–L14752) falls back to `'OTHER_UNCODED'`. It **does** read the right element (L14761)." |
| §10.2 `wrap-reason` row | "**None** — same `gvRC()` issue" | Same treatment. |
| §11 A12-detail step 2 | "`code = gvRC()` — reads `#nt-reason` (§17 G12)" | "reads `#nt-reason`, which is the hidden field the wrap-up picker itself emits" |
| §13.2 Field 1 | "`csel-wrap-reason` / `#wrap-reason`" | "wrapper `csel-wrap-reason`, hidden value field **`#nt-reason`** (there is no `#wrap-reason` element)" |
| §13.3 Field 3 | "`csel-lc-reason` / `#lc-reason`" | Same treatment. |
| §17 **G12** | "**`gvRC()` reads the wrong element** … every wrap-up and every logged contact is coded `OTHER_UNCODED`" | Replaced with the **real** defect, which is `13a`'s framing: *every picker shares one hidden-field id*, so `getElementById` would silently take the first if two were ever mounted together. Latent, not live — `#modal-content` holds one modal at a time. Full evidence chain (L14761, L5352, L14749, all eight call sites) written in, plus a correction note pointing here. |

**§17 G22** was `UNVERIFIED — customSelectHTML internals … This is the crux of G12`. The body has now been read, so the row is marked **RESOLVED (was UNVERIFIED)** with L5352 quoted and the `options.length>6` search-box rule (L5343) noted. The row was kept in place rather than deleted, preserving the epistemic record.

---

## 6. Shared blind spots reconciled across documents

### 6.1 `L21270–L21313` — `SETTINGS_GROUPS` / `reorderSettingsTabs()`

Two documents ended their analysis before this region and inverted the same three conclusions. `03c` (L546, L669) and the newer `15-settings-shell.md` (§4, §5) already had it right and were used as the reference; **both were re-checked and needed no edit.** All four documents now agree.

| Conclusion | `00d` / `16j` said | Source | Both now say |
|---|---|---|---|
| Last `data-i18n` in file | L1992; JS never emits the attribute | **L21307** (`grep -n data-i18n \| tail`); 4 hits past L2100 | L21307. No `innerHTML` **string builder** emits it; `setAttribute` does, once, at boot (L21296 / L21307). |
| The 7 `stabgrp.*` dictionary keys | 7 orphans, "abandoned refactor" / "7 dead i18n keys" | `SETTINGS_GROUPS` L21270–L21277 → L21296; called L21393, booted L21825 | **6 alive, 1 orphan** (`stabgrp.other`, L21307 — unreachable because 5+4+3+3+4+2 = 21 covers every tab). The refactor was **completed in JS**. |
| Which keys never render | `stabgrp.daily_ops` … `records` | **L21288** `nav.querySelectorAll('.settings-tab-group-lbl').forEach(e=>e.remove())` | The **three static** keys — `workspace` L1420, `operations` L1424, `system` L1436 — are removed at boot. Exactly inverted. |
| Nav group count | `16j` ⚠ flagged the source's "21-tab/6-group" comment as wrong | 3 static → 6 rendered | The **source comment is correct**; `16j`'s ⚠ is now a ✓ with the mechanism. |
| Static-shell id denominator (`00d` D4) | 621 | `awk 'NR<=2165' \| grep -o 'id="[^"]*"' \| sort -u \| wc -l` → **485**; 621 is the **file-wide** figure | 485; ceiling **86/485 = 17.7%**, not 13.8%. Runtime `data-i18n` element count noted as **89** (86 − 3 + 6). |
| Script boundary (`00d` D5) | "everything from L2051 onward is JavaScript" | `grep -n '<script'` → **L2166**; L2051–L2165 is static markup | L2166. |

`16j` §8.2's nav table was additionally **+1 across L1420–L1432** (J6) and carried a fabricated `(sic)` footnote claiming `integrity` and `branding` shared a line (J7). Every one of the 21 buttons occupies its own line — branding L1431, integrity L1432, rota L1433. Table re-anchored, footnote replaced, and the whole table now carries a ⚠ saying it describes the **parse-time** DOM only (O6).

### 6.2 Two uncorrected pass-2 items, replicated

| Item | Where it was still wrong | Now |
|---|---|---|
| `#p-settings` range **L1416–L2048** (L2049 blank, L2050 the `ACTIVITY LOG PAGE` banner) | **Not** `16h` — its header was already corrected in Part 1 §3 and reads L1416–L2048 (see §9 R-1). Still wrong in `16i`, `16j`, **and seven further settings docs** (`16a`–`16g`) that Part 1 and pass 2b both missed | Fixed in all **9** documents |
| "Operations" tab-group label **L1424** (L1425 is the *dispatch* tab button) | `16h` header was already right, but §12 and §14 still said L1425. `16i` header and §12 said L1425. `16j` §8.2 said L1425 | Fixed in all 5 places |

---

## 7. Enumerations and seed counts corrected

Re-derived mechanically from source before editing; the underlying per-item tables were correct in every case, which is why only the *summary* figures moved.

| Doc | Claim | Derivation | Corrected to |
|---|---|---|---|
| `15k` §8b | tier split T1 4 / **T2 14 / T3 14 / T4 8** | `awk 'NR>=14669&&NR<=14715' \| grep -oE "tier:'T[0-9]'" \| sort \| uniq -c` | **4 / 12 / 15 / 9** |
| `15k` §8b | target split **rider 28 / driver 10** / corp 2 | same method on `target:'…'` | **rider 29 / driver 9 / corp 2** |
| `15k` §8b | `comp>0`: **9** · `comp:0`: **31** | `comp:0` ×30, `comp:100` ×2, `comp:15` ×1, `comp:20` ×2, `comp:25` ×3, `comp:50` ×2 | **comp>0: 10 · comp:0: 30**, with the missing `comp:25` restored to the list |
| `15k` §13.11 | `compCheck` blocks **31 of 40** | 30 carry `comp:0`; L15415 exempts `OTHER_UNCODED` (which is itself `comp:0`) by name | **29 of 40** |
| `15k` §3b | "Not exposed in the UI at all: `ref`, `cat`, `target`, `comp`, `labelEn`, `labelAr`" — contradicted its own table 3 rows above | L15076 renders `§ref labelEn`; L15078 `labelAr`; L15079 `cat` | Only **`target` and `comp`** |
| `00d` §8.3C/D, F12 | **47** seeded reason codes | `grep -c "{code:'"` over L14669–L14715 → **40** (`12c`, `13a`, `13c`, `13d`, `15k` all say 40) | **40** |
| `00d` §8.3 | `labelAr` definition/write sites **48** | 44 occurrences over 43 lines (L14759 carries two) | **41** = 40 seed + 1 runtime write (L15121) |
| `00d` §8.2 | `toFixed` 248 occurrences across **219** lines | `grep -c toFixed` → **227** | **227** |
| `00d` §8.2 | `fmtSAR` — "**93 occurrences**, so 92 call sites" | `grep -o fmtSAR \| wc -l` → **110**; `grep -c` → **93** | **110 occurrences over 93 lines**; 109 call-site occurrences over the 92 listed lines (93 was the *line* count). The 92-line list itself was exact and is unchanged. |
| `00d` §5.1/F1 | static-shell unique ids **621** → ceiling 13.8% | 485 static-shell / 621 file-wide | **86/485 = 17.7%** (§6.1) |
| `13d` M16 | `DB.upcomingSubTrips` seed `UST-1`…**`UST-4`**, L6177–**L6242** | `grep -n "id:'UST-"` → L6179 … **L6235**; array closes **L6241** | **8 records, L6177–L6241**, each with its own `SCENARIO n` comment. *(The separate dead seed at L6243–L6248 genuinely holds 4 — that part was already right and is unchanged.)* |
| `13d` §7.4 | 5 `slaBadge` states reachable on this page | L14799 returns on `s.resPct>=atRiskPct` — the very condition that creates the T2 row — **before** L14800 | **4**; the `↩ respond within` badge (L14800) and L14801's `<fmtAge> left` are both unreachable here |
| `13d` §2.1 | "**Exhaustive** grep … returns these hits **and no others**" (14 rows) | case-sensitive `grep -c intervention` → **15** (omits L19054, which G2 discusses); case-insensitive → **24** | Claim of exhaustiveness withdrawn, both counts stated, table re-scoped to "hits that route to or render this page" |
| `16j` §8.1 | "**11 of 21** tabs show a 'last updated by' line; **10** do not"; `dispatch` listed as uncovered | 12 `meta-*` ids mapped to their panels; `#stab-dispatch` (L1552–L1621) holds **four** — L1578, L1590, L1600, L1617 | **8 of 21** show it, **13** do not, uncovered list **12**. The 11 is the *map-entry* count; four entries live inside one tab. |
| `16j` §7.3 | "**Six** group keys exist in the Arabic dictionary" then lists **seven** | seven | Resolved by the §7.3 rewrite (§6.1) |
| `16h` §8.2 | "one of the **8** entry types" | 7 `postLedger` call sites | **7** (§4) |
| `16k` §9.4 | "**Money (11):**" then lists 13 | 13 distinct keys | **13** |
| `13c` §15.3 | "`openLogContact()` call sites — **6**"; own table lists 7 | L16253, 16865, 16882, 16887, 16895, 16990, 20602 | **7** |
| `13c` §15.4 | "`logContact()` writers outside this module — **10**"; own table lists 11 | L5836, 14849, 14860, 15202, 15210, 15516, 16008, 16599, 16802, 17343, 18230 | **11** |
| `16i` §3.2 | "**6 users → the search box appears** (`options.length>6` is false at 5 users, so **no** search box)" — self-contradictory | `DB.teamUsers` = 5 (L2831–L2840); `openHandover`'s list has no "unassigned" prefix | Lead clause deleted; the correct parenthetical kept and the §3.1 contrast (6 options, still no box) added |

---

## 8. STALE citations corrected

Every one re-read with `awk 'NR==n'` before editing, and the surrounding prose re-checked against the new line. The drift signature pass 2 identified is confirmed again: declarations, constants, seed literals, `logAction`/`toast`/`requirePerm` calls and router branches are reliably exact; citations *into* template-string interiors and multi-line object literals drift ±1–3; block ranges over-run into the next sibling.

**`16h` — 11, all in the L19882–L19928 band, plus 5 ranges**
`r2()` 19882→**19883** · `logAction('duplicate_suppressed')` 19899→**19898** · `DB.moneyRejects.unshift` 19926→**19924** (3 places) · `logAction('ledger_rejected')` 19927→**19925** · `toast('⛔ Ledger rejected…')` 19928→**19926** · debit-normal comment 19944–45→**19943–44** · `trialBalance()` …19956→**…19958** · `postFareCapture()` …20052→**…20051** · wrapper starts 19979/19993/20008→**19978/19992/20007** · original `recordRefund()` 3176–3210→**3176–3202** · `commitWalletAdjust` guard 17886→**17889**. Also added four new index rows for the gate-install chain (17853/18089, 17901–17907, 18260/18372/18383).

**`16k` — 18**
500-cap 3146→**3148** (5 places) · forced re-render 3147→**3149** (4 places) · `auditDiffHTML()` …3172→**…3171** · `resolveId` fallback 3272→**3273** · `ACTION_LABELS` …2911→**…2909** (3 places) · actor/action/page-size selects 9235/9240/9245→**9234/9239/9244** · page-size array 9244→**9243** (2) · "returns to page 1" comment 9252→**9251** · `showActorHistory` click 9302→**9300** · pager style literal 9316→**9314** · filter predicate 9326–34→**9328–36** · `e.actorId`/`e.action`/`e.id` 9327/9329/9331→**9329/9330/9332** · `#audit-count` 9336–37→**9337–38** · pagination 9338–44→**9339–45** · `auditEmptyHTML` in modal 9275→**9277** · `initCardToggles()` 9364→**9368** (3) · `DB.auditLog` reader 9327→**9328**.

**`16i` — 28**
`renderOnCall()` …15799→**…15798** (4) · `saveOnCall()` 15800–→**15799–** (2) · head strip 19749–57→**19751–58** (2) · timezone prose 19758–60→**19759–61**, display 19759→**19760** (4) · uncovered-slots 19785–97→**19785–96** (2) · recent-handovers 19799–→**19798–** (2) · weekend colour 19764→**19765** · shift-hours `padStart` 19771→**19770** · gap cap `20` 19790→**19789** (2) · `rotaBoot` 19832/19829/19830→**19833/19831/19832** · `ho-to` default 19696→**19697**, labels 19694–95→**19695–96** · `ho-transfer` 19699→**19701** · `Complete handover` button 19706→**19705** · `commitHandover()` …19730→**…19732** (2) · its guard 19731–42→**19733–41** (2) · guard staleness text 19741→**19739** (2) · modal intro 19685–87→**19686–88** · override `.pop()` 19637→**19635** · `assign` reads 19638/19654/19774→**19636/19655/19773** · `slaSweep`/`fire`/`sla_breach` 14936/14941/14946→**14937/14942/14947** · `whoHolds()` 18864–74→**18865–75**, `staleMin` read 18866→**18868** · `myOpenClaims()` …18917→**…18916** · `refreshOwnershipSurfaces()` …19056→**…19057** · `cselPick` `new Function` 5410→**5411** (2) · `#F2F1EE` 19688→**19690** · options list 19746→**19748–49**, Noura's record L2838–39→**L2837** · `claim_expired` 18868→**18870** · module header 19569–→**19570–**.

**`13c` — ~28** (of the ~45 pass 2b estimated; I corrected every one it named plus the two it named only by pattern)
Router branches **+5**: contacts L8825→**L8820** (2 places), settings L8824→**L8819** · digit transposition L15954→**L14955** · `#contacts-extra` L1414→**L1413** (2) · `exportContacts()` 15058–67→**15056–64** (2) · `logContact` 2000-cap 14932→**14933** · `reasonSelectHTML()` 14755–65→**14755–63** (2) · `slaBadge()` …14803→**…14802** (2) · `slaUrgency()` …14812→**…14810** (2) · `rcTargets()` …14740→**…14739** · `answerCall` fields 20245–49→**20246–50**, `endAtMs` 20302→**20303**, `commitWrapUp` fields 20302–09→**20303–08** · `logPriorityCall` 9162→**9163** (3) · `DB.commLogs` seed 2749–64→**2749–62** (3) · `gvRC()` 14748→**14750–52** · `DB.reasonCodes` 14667–14713→**14667–14716** (2) · `commitBulkReason` 16188→**16201** (`gvRC()` at 16194).

**`13d` — 22**
`renderInterventionsPage()` …10344→**…10345** (2) · empty state 10343→**10344** (3) · `#dash-alerts-count` 10380→**10412** · `.al-row` 10386→**10414** · sidebar "L520–L540"→**L487–L540**, `inbox` at **L496** · `riderConfirmed` 8305/8315→**8309/8319** · G6 evidence 8303/8309→**8304/8314** · `showNearbyDriversMap` ctx 9508→**9514** · `mins` fallback 9503→**9501** (2) · splices 11894/12484→**11897/12482** (2) · `pickNearbyDriver` comment 11913–17→**11910–14** · `refreshOwnershipSurfaces` range added **19045–19057** · `scenarioBannerHTML` …8353→**…8347** · `tripScenario` …8327→**…8328** (3) · `DB.reasonCodes` …14713→**…14716** · paused skip 9455→**9457** (2) · breached border 9457→**9461** (2) · `rcLabel` 9462→**9464** · `scCfg` 9491–95→**9492–96** (4) · watch separator 9525→**9528** · `slaBadge()` …14803→**…14802** · radius notice 8375→**8374** (3) · watch sort key 9473→**9471**.

**`15k` — ~14**
`renderReasonCodesTable` template cites **+1** across ten rows (15074/15075/15077/15078/15079/15081/15082/15083/15084/15085/15086 → 15075/15076/15077/15078/15079/15082/15083/15084/15085/15086/15087) · `saveReasonCodes` body cites **+1** (15098–99/15102/15103/15104 → 15099–100/15103/15104/15105) · pane L1771–1823→**L1771–1822** (2) · `DB.commitPolicy` 16541–62→**16541–61** · `slaBadge()` …14805→**…14802** · `compPreview()` 15448–61→**15447–62** (2) · `ACTION_LABELS` 2898–2910→**2898–2909** (2) · `DB.compPolicy` scalars 15385–87→**15387–89** (2) · `GATE_SPECS.saveOnCall` 18334–38→**18332–36** (2) · `installUniversalGates()` 18376–84→**18372–83** · `renderSettingsMeta()` 7341–44→**7339–42**, map 7342→**7340** · `appealResponseHours` 18345→**18356** · i18n `stab.reasons` 7912→**7911**, `stabgrp.operations` 7913→**7914**, `stabgrp.daily_ops` 7914→**7915**, removal 21285→**21288** · **reorder rationale comment L20795–20801 → L21258–L21269** (quoted text L21262–L21263) — a ~460-line miss, the largest single drift in the eight documents.

**`16j` — 13** · **`00d` — 8** (`savePlan()` 6118–6150→**6117–6149**; `validatePlanFeatures()` 6050–58→**6050–56**; `rcById` declaration **L14721** distinguished from its two render sites; timezone options 1485–1493→**1486–1492** in 3 places; plus the §6.1 structural re-anchors).

**Not attempted:** the 1,343 mechanically-flagged `(citation, quoted-token)` pairs. Pass 2b states those were reviewed and are dominated by false positives from prose inside backticks; the 178 hand-verified residue is what §5 itemises and what is corrected above.

---

## 9. Pass-2b findings I REJECTED (with evidence)

| # | Pass 2b said | My finding | Evidence | What I did |
|---|---|---|---|---|
| **R-1** | §5 / P3 #28: "`#p-settings` is L1416–**L2048**… **Pass 2 already raised this for `16h` (P2 #16); it is still uncorrected there** and has since been replicated." Same for the "Operations" L1425 label. | **`16h`'s header was already corrected.** Part 1 §3 of this log fixed both, and `16h` line 4 reads `L1416–L2048` and line 6 reads `group "Operations" (L1424)`. Pass 2b did not check whether the remediation had already landed. | `sed -n '1,8p' 16h-settings-ledger.md` | **Rejected as stated; applied where it was actually true.** `16h` §12 and §14 *did* still say L1425 (pass 2b did not identify those) — fixed. `16i`, `16j` fixed. And pass 2b under-counted the replication: the L1416–2050 error is also in **`16a`–`16g`**, seven further documents neither pass flagged — all seven fixed. |
| **R-2** | §4.8 R1: "`REQ_NOW_REF` is used at **22 sites, all in the subscription-request / renewal subsystem**." | **Both figures wrong.** `grep -c REQ_NOW_REF` → **16**, and they are **not** confined to that subsystem: L4709, L4726, L4746, L4859 are schedule/day arithmetic; L11109, L13376 are renewal-date maths; L12392 is a surge-window lookup; L13288, L13590 are tenure/day-delta helpers; L14215 is sub-health elapsed-days. | `grep -n REQ_NOW_REF eyvar_ops_panel_v40_fixed.html` | **Conclusion applied, scoping rewritten.** The core finding is right and important — `nowMs()` **is** `Date.now()` (L14627), `REQ_NOW_REF` **is** advanced each tick (L9680, with L9574's comment saying so), and `16i`'s "two clocks" claim was wrong on both halves. But I wrote the corrected scope from my own grep, enumerating the actual 12 dependent line numbers, rather than repeating "all in the subscription-request subsystem". |
| **R-3** | P5 #42 files the `.al-row{cursor:pointer}` finding under **`13c` §12.1**; §6 O13 files the same finding under **`13d` §12.1**. | The two are inconsistent, and **`13d` is the correct target.** `13d` §12.1 documents `#iv-page-list`, whose rows *are* `.al-row` (L158–L160: `cursor:pointer` + `:hover{background:var(--bg2)}`). `13c` §12.1 documents the contact-drivers `.dt` table, whose `<tr>` rows carry no cursor rule — its "Row click: None — rows are inert" is **correct as written**. | `awk 'NR>=156&&NR<=160'`; `13c` §12.1 vs `13d` §12.1 | **Applied to `13d` only.** `13c` §12.1 left untouched. |
| **R-4** | §7 X4: "the audit-log 500-entry cap … `16j` and `16k`: L3146; **`00c`: L3151**. All three docs are wrong, in three different ways." | **`00c` was already correct.** Part 1 §3 corrected it from L3151 to **L3148**; `00c` now cites L3148 at lines 622, 669 and 763. Only two documents were wrong, not three. | `grep -n "3148\|3151" 00c-identity-permissions-and-audit.md` | **Rejected as to `00c`; applied to `16j` and `16k`.** Both now cite L3148 (cap) and L3149 (forced re-render), with the note that L3146 is `};` and L3147 the `unshift`. |

*Additionally, two pass-2b statements are correct but worth putting on file as imprecise:* §4.1 H1 says `installActionGates` "is at L17853 (called L18089), not L17832 (which is `window.__confirmValues=values;`)" — the document actually cited **L17832 and L17819** in a `guardAction`/`installActionGates` pair, so only half the citation was wrong; L17819 was right. And §5's `16k` entry gives `initCardToggles()` as "L9364(–L9385) → **L9368**" without re-checking the range end; I corrected the start and left the end, which I did not independently verify.

---

## 10. Residual accuracy position

**What is now true of the eight.**

- **All 7 false negatives are corrected**, each re-greped from scratch. The two that would have caused real damage — `15k`'s "`owner` is DEAD" (which would have licensed deleting a rendered report column) and `13c`'s `gvRC` inversion (which would have sent an engineer to "fix" working code and to distrust every CPT number) — are gone, and the documents that were already right (`13a` on both; `03c` and `15-settings-shell` on `SETTINGS_GROUPS`) were left untouched, so the corpus is now internally consistent on all four contradictions.
- **All 5 fabricated identifiers are gone**, each with its zero-grep recorded inline so the claim cannot silently regress. Combined with Part 1's `AUDIT_LABELS`, that is six invented symbols removed from this corpus. Every one would have been caught by the single CI rule pass 2b recommends (P6 #43): flag any backticked identifier with zero occurrences in source.
- **The `16h` gate-ordering inversion is fully rewritten** across §1, §5, §6, §9 and §13, and the consequence is now stated plainly: three of the seven ledger entry types are unreachable through any UI path in this build. This was the deepest error in the pass and it came from analysing a module's own line range without asking what had already run at top level above it.
- **No money formula was touched.** Pass 2b re-derived all 20 in `16h` and all 20 matched; combined with pass 2's 28, **48 money formulas have been re-derived across this corpus and 48 match.** Every `16h` edit was a line number, a count, or an assertion *about* a formula — never the arithmetic.
- **Every large enumeration checked mechanically was already correct in its membership.** `16k`'s 161 audit keys with ~220 line numbers, `00d`'s 88 dictionary keys / 86 markup keys / 92 `fmtSAR` lines / 86 Arabic-script lines, the 40-row reason-code registry reproduced twice (~880 cells), the 12-account chart, the 42 rota slots — all exact. Only *derived summary counts* moved, in every single case.
- **`UNVERIFIED` discipline held.** One marker was deleted, and only because its claim was proved impossible rather than merely unchecked (§4, H3). One was promoted to RESOLVED with its evidence written in rather than being silently dropped. One was added.

**What is still weak.**

- **Citation drift remains the dominant defect class and this pass did not eliminate it.** I corrected every citation pass 2b named plus roughly a dozen more found while verifying, but ±1–3 drift into template-string interiors and multi-line object literals is a systematic property of how these documents were written, not a finite list of typos. Treat any un-audited `L####` pointing into a template string as a ±3 anchor.
- **The 1,343 mechanically-flagged pairs were not worked** (§8) — by instruction, and because pass 2b reports them as dominated by false positives. They are a lead list for the CI rule, not a defect list.
- **Three items deferred:**
  1. **`13a`'s `DB.reasonCodes` range (L14667–L14722)** and `03a`/`03b`'s `refreshOwnershipSurfaces` ranges (X9, X13). Out of scope here — `13a`, `03a`, `03b` were not in this pass's target set. The corpus-wide reconciliation to **L14667–L14716** now holds in `12c`, `13c`, `13d` and `15k`; `13a` remains the outlier.
  2. **The wider `intervention`-style sweep** pass 2b recommends (§13: "where three documents cite one fact and none agrees, the fact has never been read"). That is a new mechanical pass, not a remediation.
  3. **`05a`–`10e`, `13a`–`14b` and the rest of `15*`/`16*`** — roughly 40 of 61 documents still rest on parallel-agent verification that no consolidated pass has re-checked. Unchanged by this pass, and unchanged by pass 2b, which drew on several of them for cross-checks and found them broadly reliable but did not audit them.

**Bottom line.** The eight late arrivals are now assessed and corrected to the same depth as the 24 documents Part 1 touched. Their analytical core survived hostile checking almost entirely intact — every formula, every enumeration's membership, every structural finding about what the panel actually does. What failed was at the edges: symbols that were named without being greped, negatives that were reasoned to rather than tested, and analysis that stopped at the bottom of a module's own line range instead of asking what ran after it. All three failure modes are mechanically detectable, and all three now have a worked example in this log.
