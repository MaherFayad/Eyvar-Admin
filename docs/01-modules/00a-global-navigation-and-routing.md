# Global: Navigation & Routing (Sidebar, Topbar, `go()`)

> Source file: `eyvar_ops_panel_v40_fixed.html` (21,857 lines)
> Line ranges: Sidebar CSS `L24–54`, `L382–406`, `L409–466` · Sidebar HTML `L479–547` · Mobile backdrop `L548` · Topbar HTML `L550–580` · Titles/subs maps `L2168–2169` · Notification panel JS `L2170–2295` · Nav history `L2849–2850` · `resolveId`/`globalSearch` `L3266–3282` · Back-button plumbing `L7005–7021` · `go()` / `openProfile()` / `openApplicantDetail()` / `openTicketDetail()` `L8773–8892` · `refreshNavCounts()` `L9392–9409` · `go()` wrapper `L20724–20735`

---

## 1. Purpose

The global shell is the only persistent chrome in this single-file app. Everything else is a `<div class="page">` that is shown or hidden. The shell consists of:

1. A hover-expand / off-canvas **sidebar** (`<aside class="sb">`, `L480`) holding 9 sections and 31 nav items.
2. A fixed 50px **topbar** (`.topbar`, `L552`) holding back button, page title/subtitle, two status chips, global search, notification bell and the acting-user avatar.
3. A **router**, `window.go(id, el, isBack)` (`L8774`), which is a plain show/hide switch plus an `if(id==='…')` chain of render calls. There is no URL routing, no hash, no History API — navigation state lives entirely in two JS globals (`navStack`, `navCurrent`, `L2849–2850`).

---

## 2. Complete sidebar inventory

### 2.1 Sidebar shell elements

| Element | Line | Detail |
|---|---|---|
| `<aside class="sb">` | `L480` | Rail. 52px collapsed, 236px on `:hover` or `.pin` (`L30`); 268px when `body.lang-ar` (`L31`). |
| `.sb-logo` | `L481–483` | Clickable → `go('dashboard', findSbEl('dashboard'))`. `title="Go to dashboard"`. |
| `.sb-logo-img` | `L482` | Inline **base64 PNG data URI** of the Eyvar wordmark — no external asset. 20px tall / 36px max-width collapsed; 26px / 150px expanded (`L34–35`). |
| `.sb-logo-text` | CSS `L36–37` | Declared in CSS but **no `.sb-logo-text` element exists in the sidebar HTML** — dead rule. |
| `.sb-nav` | `L484–542` | Scroll container; custom 5px scrollbar (`L26–30`). |
| `.sb-ft` | `L543–546` | Footer. Person icon + `#sb-ft-name` (`Sarah Al-Rashid`) + `#sb-ft-role` (`Owner · settings ▾`), click → `go('my-account', null)`. |
| `#mob-sb-backdrop` | `L548` | Dimmed backdrop, `onclick="toggleMobileSidebar()"`. |

### 2.2 Complete nav-item table (all 9 sections, all 31 items)

| # | Section (`data-i18n`) | Sec. label line | Item line | Label (EN) | Item `data-i18n` | `go()` target id | Badge id | Badge class at rest | Seeded text |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `sec.executive` — Executive | `L486` | `L487` | Overview | `nav.exec-overview` | `exec-overview` | — | — | — |
| 2 | `sec.intelligence` — Intelligence | `L490` | `L491` | Predictive signals | `nav.predictive` | `predictive` | `sbb-predictive` | `sb-badge a` | `0` |
| 3 | `sec.intelligence` | `L490` | `L492` | Fraud & risk | `nav.fraud` | `fraud` | `sbb-fraud` | `sb-badge a` | `0` |
| 4 | `sec.overview` — Overview | `L495` | `L496` | Work inbox | `nav.inbox` | `inbox` | `sbb-inbox` | `sb-badge a` | `0` |
| 5 | `sec.overview` | `L495` | `L497` | Dashboard | `nav.dashboard` | `dashboard` | `sbb-dash` | `sb-badge a` | `4` |
| 6 | `sec.overview` | `L495` | `L498` | Live map | `nav.live` | `live` | — | — | — |
| 7 | `sec.operations` — Operations | `L501` | `L502` | Subscriptions | `nav.subscriptions` | `subscriptions` | `sbb-subs` | `sb-badge n` | `142` |
| 8 | `sec.operations` | `L501` | `L503` | Corporate accounts | `nav.corporate` | `corporate` | `sbb-corporate` | `sb-badge a` | `1` |
| 9 | `sec.operations` | `L501` | `L504` | Quick rides | `nav.quickrides` | `quickrides` | `sbb-qr` | `sb-badge n` | `63` |
| 10 | `sec.operations` | `L501` | `L505` | All trips | `nav.trips` | `trips` | — | — | — |
| 11 | `sec.operations` | `L501` | `L506` | Renewal pipeline | `nav.renewal` | `renewal` | `sbb-renew` | `sb-badge a` | `8` |
| 12 | `sec.operations` | `L501` | `L507` | Trip readiness | `nav.readiness` | `readiness` | **`sb-readiness-badge`** | `sb-badge a` | `5` |
| 13 | `sec.operations` | `L501` | `L508` | Requests | `nav.requests` | `requests` | `sbb-requests` | `sb-badge a` | `0` |
| 14 | `sec.fleet` — Fleet | `L511` | `L512` | Drivers | `nav.drivers` | `drivers` | — | — | — |
| 15 | `sec.fleet` | `L511` | `L513` | Riders | `nav.riders` | `riders` | — | — | — |
| 16 | `sec.fleet` | `L511` | `L514` | Captain fairness | `nav.fairness` | `fairness` | `sbb-fairness` | `sb-badge a` | `0` |
| 17 | `sec.fleet` | `L511` | `L515` | Plan commitment | `nav.commitment` | `commitment` | `sbb-commit` | `sb-badge a` | `0` |
| 18 | `sec.fleet` | `L511` | `L516` | Coverage & capacity | `nav.coverage` | `coverage` | `sbb-coverage` | `sb-badge a` | `0` |
| 19 | `sec.fleet` | `L511` | `L517` | Compliance | `nav.compliance` | `compliance` | `sbb-compliance` | `sb-badge a` | `0` |
| 20 | `sec.fleet` | `L511` | `L518` | Safety | `nav.safety` | `safety` | `sbb-safety` | `sb-badge a` | `0` |
| 21 | `sec.growth` — Growth | `L521` | `L522` | Promos & growth | `nav.growth` | `growth` | — | — | — |
| 22 | `sec.growth` | `L521` | `L523` | Zones | `nav.zones` | `zones` | `sbb-zones` | `sb-badge a` | `0` |
| 23 | `sec.finance` — Finance | `L526` | `L527` | Finance | `nav.finance` | `finance` | — | — | — |
| 24 | `sec.finance` | `L526` | `L528` | Driver wallets | `nav.wallets` | `wallets` | — | — | — |
| 25 | `sec.finance` | `L526` | `L529` | Rider wallets | `nav.rwallets` | `rwallets` | — | — | — |
| 26 | `sec.support` — Support | `L532` | `L533` | Support Center | `nav.support` | `support` | **`sb-ticket-badge`** | `sb-badge a` | `0` |
| 27 | `sec.support` | `L532` | `L534` | Contact drivers | `nav.contacts` | `contacts` | `sbb-contacts` | `sb-badge a` | `0` |
| 28 | `sec.config` — Config | `L537` | `L538` | Pricing Plan | `nav.plans` | `plans` | — | — | — |
| 29 | `sec.config` | `L537` | `L539` | Settings | `nav.settings` | `settings` | — | — | — |
| 30 | `sec.config` | `L537` | `L540` | Activity log | `nav.audit-log` | `audit-log` | — | — | — |
| — | (footer, not a `.sb-item`) | — | `L545` | `Sarah Al-Rashid` / `Owner · settings ▾` | — | `my-account` | — | — | — |
| — | (logo, not a `.sb-item`) | — | `L481` | Eyvar logo | — | `dashboard` | — | — | — |

**Counts:** 9 sections, 30 `.sb-item` entries, 2 additional shell click targets (logo → `dashboard`, footer → `my-account`), 15 badge elements.

**Icons:** every item uses an inline `<svg viewBox="0 0 24 24">` with `fill:none;stroke:currentColor;stroke-width:1.7` (`L45`). Icons are drawn inline in the HTML — no icon font, no sprite sheet, no external file.

### 2.3 Naming inconsistency (verified)

13 badges use the `sbb-*` prefix; **2 use a different scheme**: `sb-readiness-badge` (`L507`) and `sb-ticket-badge` (`L533`). Any code that iterates badges by prefix will miss those two.

---

## 3. Badge formulas — every badge, exactly

`refreshNavCounts()` (`L9392–9409`) updates only **5** of the 15 badges. The other 10 are updated by their own page's render function, meaning **they are stale until that page has been rendered at least once**. The one-shot init block (`L14556–14600`) renders most pages once at boot, which is what makes the badges non-zero on first paint.

| Badge id | Owner function | Line | Exact formula |
|---|---|---|---|
| `sbb-dash` | `refreshNavCounts()` | `L9396–9400` | `interv` = `(DB.rideRequests \|\| []).length` **plus** one for each `DB.upcomingSubTrips` entry whose `tripScenario(t).key` is `'unavailable'`, `'unassigned'` or `'late'`. |
| `sbb-subs` | `refreshNavCounts()` | `L9394`, `L9400` | `activeSubs` = count of `DB.subscriptions` keys where `status !== 'Cancelled'`. |
| `sbb-qr` | `refreshNavCounts()` | `L9393`, `L9400` | `qr` = count of `DB.trips` values where `(t.date\|\|'').indexOf('25 Jun') === 0` **and** `t.kind !== 'Subscription'`. |
| `sbb-renew` | `refreshNavCounts()` | `L9395`, `L9400` | `expSoon` = count of `DB.subscriptions` values where `status !== 'Cancelled'` **and** `(parseInt(x.ends,10) - 25) <= 3`. |
| `sbb-requests` | `refreshNavCounts()` | `L9401` | `(DB.rideRequests\|\|[]).filter(r => r.status !== 'assigned').length + (DB.subscriptionRequests\|\|[]).filter(r => r.status === 'pending').length`. Also re-set identically by `renderRequestsPage()` at `L10119`. |
| `sbb-predictive` | `renderPredictivePage()` | `L14382` | `redSubs + atRiskDrivers`, where `redSubs` = non-cancelled subscriptions with `subHealthScore(s).score < 50` (`L14369`) and `atRiskDrivers` = `Object.keys(DB.drivers).map(driverRiskScore).filter(r => r.score < 80).length` (`L14370`). |
| `sbb-fraud` | `renderFraudPage()` | `L5645` | `totalFlags = sharedGroups.length + refFlags.length + pairFlags.length` (`L5639`). Written as `totalFlags \|\| ''` — **a zero renders as an empty badge**, not `0`. |
| `sbb-inbox` | `updateInboxBadge()` | `L19312–19319` | `n = all.filter(i => i.breached).length \|\| all.filter(i => !whoHolds(i.type, i.id)).length` over `inboxItems()`. Class flips to `a` if any item is breached, else `n`. |
| `sbb-corporate` | `renderCorporateList()` | `L6496` | Count of `DB.corporateAccounts` with `status === 'Pending'`, written as `… \|\| ''` (zero → empty badge). |
| `sb-readiness-badge` | `window.renderReadiness()` | `L13013–13014` | `(unconf + notMoving + unavail) \|\| ''` where, over `DB.upcomingSubTrips`: `unconf` = `minutesUntil <= 60 && !riderConfirmed`; `notMoving` = `minutesUntil <= 30 && driverStatus === 'not_started'`; `unavail` = `driverStatus === 'unavailable'` (`L13009–13011`). Note these three sets **overlap** — a trip can be counted twice. |
| `sbb-coverage` | `renderCoveragePage()` | `L13159` | `exposed.length` = active subscriptions where `!subIsCovered(s.id)` (`L13151`). |
| `sbb-compliance` | `renderCompliancePage()` | `L13331` | `expired + week` where `expired` = `complianceScan()` rows with `worst === 0` and `week` = rows with `worst === 1` (`L13324–13325`). Rows with `worst === 2` (≤30 days) are excluded. |
| `sbb-safety` | `renderSafetyPage()` | `L13406` | `DB.incidents.filter(i => i.status === 'open').length`. |
| `sbb-zones` | `renderZonesPage()` | `L14140` | `starved` = `DB.zones.filter(z => z.supply > 0 && z.demand / z.supply >= 3).length` (`L14133`). |
| `sb-ticket-badge` | `updateContactsBadge()` | `L14963–14964` | `open.length` where `open = (DB.tickets\|\|[]).filter(t => !t.resolvedAtMs)`. Class = `a` if non-zero else `n`. |
| `sbb-contacts` | `updateContactsBadge()` | `L14959–14968` | `br \|\| ar \|\| 0`, where `br` = open tickets whose `slaState(t)` has `frBreached\|\|resBreached\|\|updBreached`; `ar` = open tickets not breached but with `resPct >= DB.slaPolicy.atRiskPct`. Class = `a` if `br`, else `n`. Deliberately "breaching first, at-risk only if nothing is breaching". |
| `sbb-commit` | `updateContactsBadge()` | `L14969–14973` | `pendingConfirmations().filter(x => !x.confirmed && !x.autoHandedOff).length`. Guarded by `typeof pendingConfirmations === 'function' && DB.commitPolicy`. |
| `sbb-fairness` | `updateContactsBadge()` | `L14974–14978` | `(DB.fairnessCases\|\|[]).filter(c => c.status === 'Open').length`. |

### 3.1 Subtitle side effects of `refreshNavCounts()`

`refreshNavCounts()` also **mutates the `subs` map in place** (`L9402–9407`) and then repaints `#tb-sub` if the current page has an entry:

| `subs` key | Recomputed value | Line |
|---|---|---|
| `subscriptions` | `activeSubs + ' active subscriptions · ' + expSoon + ' expiring soon'` | `L9402` |
| `quickrides` | `qr + ' on-demand rides today'` | `L9403` |
| `trips` | `all.length + ' trips today (25 Jun)'` | `L9404` |
| `drivers` | `Object.keys(DB.drivers).length + ' active drivers'` | `L9405` |
| `riders` | `Object.keys(DB.riders).length + ' registered riders'` | `L9406` |
| `renewal` | `expSoon + ' expiring within 3 days'` | `L9407` |

Then: `if (navCurrent.type === 'page' && subs[navCurrent.id]) #tb-sub.textContent = subs[navCurrent.id]` (`L9408`).

---

## 4. Sidebar expand / pin / mobile behaviour

### 4.1 Hover expand (desktop)

Pure CSS, no JS (`L30`, `L34–35`, `L37`, `L40`, `L47`, `L49`, `L54`):

```
.sb{width:52px; transition:width .18s ease}
.sb:hover,.sb.pin{width:236px}
body.lang-ar .sb:hover, body.lang-ar .sb.pin{width:268px}
```
On expand, `opacity` goes 0→1 for `.sb-lbl` (`.1s` delay `.04s`), `.sb-sec-lbl` (`.1s`), `.sb-badge` (`.1s` delay `.04s`), `.sb-ft-txt` (`.1s` delay `.04s`), and `.sb-logo-img` grows to `150px × 26px`.

### 4.2 Pin — NOT IMPLEMENTED

`.sb.pin` is styled in 6 CSS rules (`L30`, `L31`, `L35`, `L37`, `L40`, `L47`, `L49`, `L54`) but **no JavaScript anywhere in the file adds, removes, or toggles the `pin` class**, and no HTML element carries it. There is no pin button in the sidebar markup. The pin feature is styled-but-unwired. See §10.

### 4.3 Mobile drawer (≤768px)

CSS `L425–465`:
- `.sb` becomes `position:fixed; width:236px!important; transform:translateX(-100%); z-index:600`.
- `.sb.mob-open` → `translateX(0)` plus `box-shadow:8px 0 28px rgba(0,0,0,.18)`.
- `.sb .sb-lbl, .sb .sb-logo-text { opacity:1!important }` — labels always visible once open.
- `.mob-sb-backdrop.open` → `display:block; inset:0; background:rgba(11,43,74,.4); z-index:590`.
- RTL variant: `.sb[dir="rtl"]` anchors right, `translateX(100%)`, `width:268px!important` (`L435–436`).

`toggleMobileSidebar()` (`L2210–2213`):
```js
document.querySelector('.sb').classList.toggle('mob-open');
document.getElementById('mob-sb-backdrop').classList.toggle('open');
```
Called from `#mob-menu-btn` (`L554`) and from the backdrop itself (`L548`).

`window.go()` force-closes the drawer on every navigation (`L8775–8776`) by removing `mob-open` and `open`.

**Note on `#mob-menu-btn`:** it carries an inline `style="display:none"` (`L554`) which is overridden only by the `@media (max-width:768px){ .mob-only{display:flex!important} }` rule at `L426`. It is therefore invisible above 768px and visible at/below — correct, but dependent on `!important`.

---

## 5. Topbar — complete control inventory

| Control | Element / id | Line | Handler | Behaviour |
|---|---|---|---|---|
| Mobile menu | `#mob-menu-btn` `.ic-btn.mob-only` | `L554–556` | `toggleMobileSidebar()` | Hamburger; visible ≤768px only. |
| Back | `#tb-back` `.ic-btn` | `L557–559` | `goBack()` | `display:none` by default; shown by `updateBackBtn()` when `navStack.length`. |
| Page title | `#tb-title` `.tb-title` | `L560` | set by `go()` `L8785` | `titles[id] \|\| id`. |
| Separator | `.tb-sep` | `L561` | — | Literal `/`. |
| Page subtitle | `#tb-sub` `.tb-sub` | `L562` | set by `go()` `L8786`, re-set by `refreshNavCounts()` `L9408` | `subs[id] \|\| ''`. Hidden entirely at ≤768px (`L446`). |
| My-work chip | `#my-work-chip` `.b.b-grey` | `L567` | `onclick="go('support',null)"`; text by `updateMyWorkChip()` `L19038–19043` | `'✋ ' + myOpenClaims().length + ' mine'`; class `b b-green` when non-zero else `b b-grey`. |
| On-call chip | `#oncall-chip` `.b.b-grey` | `L568` | `onclick="go('settings',null)"`; text by `updateOnCallChip()` `L19813–19821` | `'📟 ' + firstName` when covered, else `'📟 nobody on call'` with class `b b-red`. `title` explains the current shift or the gap. |
| Global search | `#global-search` inside `.tb-search` | `L569–572` | `onkeydown` → `if(event.key==='Enter') globalSearch(this.value)` | 230px box; placeholder `Search any ID: RDR / DRV / TRP / SUB…`. Shrinks to 150px ≤768px (`L445`), hidden entirely ≤480px (`L470`). |
| Notification bell | `#bell-btn` `.ic-btn` | `L573–577` | `toggleNotifPanel(event)` | Contains `#bell-count` and `#notif-panel`. |
| Unread count | `#bell-count` | `L575` | `updateBellBadge()` `L2259–2266` | Red pill, top-right; `99+` cap; `display:none` when `unread === 0`. |
| Notification panel | `#notif-panel` `.notif-panel` | `L576` | `renderNotifPanel()` `L2229–2251` | 400px wide, `max-height:560px`. 360px at ≤1024px (`L422`); `92vw` and `right:-8px` at ≤768px (`L448`). |
| Acting-user avatar | `#tb-avatar` `.avatar` | `L578` | `openUserSwitch()` | Blue 30px rounded square; seeded text `SA`. Replaced by an `<img>` if a profile photo is uploaded (`L2960–2961`). |
| Impersonation bar | `#impersonation-bar` | `L564` | `renderImpersonationBar()` `L21035–21047` | `position:fixed; top:0; left:0; right:0; z-index:80`; amber. Physically nested inside `.topbar` but positioned fixed. |
| Active-call bar | `#call-bar` | `L565` | `screenPop()` region `L20266` | `position:fixed; bottom:16px; right:16px; z-index:70`; blue. Also nested inside `.topbar`. |

**Language switcher — NOT in the topbar.** The only interface-language control is `<select id="cfg-gen-lang">` at `L1495–1499` on the Settings → General panel (`English` / `العربية (Arabic)`). See `00d-i18n-and-localisation.md`.

**User menu — there is no dropdown.** Clicking `#tb-avatar` goes straight to the `openUserSwitch()` modal (`L3088`). The sidebar footer (`L545`) is the only route to `my-account`, and it is labelled `Owner · settings ▾` — the `▾` implies a menu that does not exist.

---

## 6. Notification bell subsystem

| Function | Line | Behaviour |
|---|---|---|
| `notifIcon(t)` | `L2171–2174` | Map: `alert:⚠️, ticket:🎧, renewal:↻, approval:🕓, payout:💳, complaint:🚩, success:✅, warning:⚠️, error:⛔, info:ℹ️`; fallback `🔔`. |
| `notifPriority(n)` | `L2192–2203` | `error`→`critical`; `alert`→`critical` if title matches `/sos\|suspend\|breach\|safety\|incident\|overdue\|closed —\|auto-closed/i` else `high`; `warning`/`complaint`/`payout`→`high`; `ticket`/`approval`/`renewal`→`medium`; everything else→`low`. |
| `NOTIF_PRIORITY_RANK` | `L2189` | `{critical:0, high:1, medium:2, low:3}` |
| `NOTIF_PRIORITY_LABEL` | `L2190` | `{critical:'🔴 Critical', high:'🟠 High', medium:'🔵 Medium', low:'⚪ Low'}` |
| `sortNotifsByPriority(list)` | `L2204–2209` | Sort by rank, then unread-first, then existing recency order. |
| `toggleNotifPanel(e)` | `L2214–2222` | `stopPropagation`; flips `display` between `block`/`none`; sets `left:0/right:auto` when `body.lang-ar` else `left:auto/right:0`; calls `renderNotifPanel()` on open. |
| Outside-click close | `L2223–2226` | `document.addEventListener('click', …)` — closes the panel if the click target is not inside `#bell-btn`. |
| `NOTIF_PANEL_PREVIEW` | `L2227` | `8` — the dropdown shows the top 8 by priority. |
| `renderNotifPanel()` | `L2229–2251` | Header (title → `openAllNotifications()`, conditional `Mark all read`, `See all →`); empty state `No notifications yet.`; top-8 rows; a `See all N notifications →` button when more than 8 exist. |
| `notifRowHtml(n)` | `L2252–2258` | 3px left border colour by priority (`critical`→`--red`, `high`→`--amber`, `medium`→`--blue`, `low`→`--border2`); unread rows get `background:var(--blue-lt)` and `font-weight:600`. |
| `markAllRead()` | `L2259` | Sets `read=true` on all; re-renders panel, bell badge, and the full page if it is on. |
| `updateBellBadge()` | `L2259–2266` | `unread > 99 ? '99+' : unread`; `display:none` at 0. |
| `handleNotifClick(id)` | `L2267–2280` | Marks read; closes panel; if `n.action` is a function, calls it; else routes by type — `ticket`→`support`, `approval`→`drivers`, `renewal`→`renewal`, `payout`→`wallets`; anything else is only marked read. |
| `openAllNotifications()` | `L2281–2284` | Closes panel, `go('notifications-all', null)`. |
| `pushOpsNotification(type,title,desc,action)` | `L9661–9666` | `id = 'N-AUTO-' + (++window.__notifSeq)`; unshifts `{id,type,title,desc,time:'Just now',read:false,action}`; refreshes badge and, if open, the panel. |

**Seeded notifications** (`DB.notifications`, `L2773–2780`): 6 entries — `N1 alert`, `N2 ticket`, `N3 renewal`, `N4 approval` (read), `N5 payout` (read), `N6 complaint` (read). Unread at boot = 3.

---

## 7. Back button & navigation history

```js
var navStack   = [];                              // L2849
var navCurrent = {type:'page', id:'dashboard'};   // L2850
```

| Function | Line | Behaviour |
|---|---|---|
| `updateBackBtn()` | `L7005` | `#tb-back.style.display = navStack.length ? 'flex' : 'none'`. |
| `pushHistory()` | `L7006` | `navStack.push(navCurrent)`; **caps at 40** — `if(navStack.length>40) navStack.shift()`; then `updateBackBtn()`. |
| `findSbEl(id)` | `L7007–7011` | Scans all `.sb-item` and returns the one whose `onclick` attribute contains `"'"+id+"'"`. Returns the **last** match, not the first. |
| `goBack()` | `L7012–7021` | Pops; `updateBackBtn()`; dispatches by `prev.type`: `page`→`go(prev.id, findSbEl(prev.id), true)`, `profile`→`openProfile(prev.id, true)`, `applicant`→`openApplicantDetail(prev.id, true)`, `ticket`→`openTicketDetail(prev.id, true)`. |

The `isBack` third argument exists purely to suppress `pushHistory()` so that going back does not re-push the page you just left.

**Historical note in the source** (`L2843–2848`): `navStack`/`navCurrent` "were referenced throughout the app but never actually declared anywhere, so every Back button silently no-opped". The `typeof` guards in `updateBackBtn`/`pushHistory` are the residue of that bug.

---

## 8. `window.go(id, el, isBack)` — the complete route map

Definition: `L8774–8828`. Preamble (`L8775–8786`), executed on **every** navigation:

1. `document.querySelector('.sb').classList.remove('mob-open')` — `L8775`
2. `#mob-sb-backdrop.classList.remove('open')` — `L8776`
3. `refreshNavCounts()` if defined — `L8777`
4. `setTimeout(initCardToggles, 60)` if defined — `L8778`
5. `if(!isBack) pushHistory()` — `L8779`
6. `navCurrent = {type:'page', id:id}` — `L8780`
7. Remove `.on` from every `.page` — `L8781`
8. Add `.on` to `#p-<id>` **if it exists** — `L8782–8783` (silently no-ops for an unknown id)
9. If `el` passed: clear `.on` from every `.sb-item`, set it on `el` — `L8784`
10. `#tb-title = titles[id] || id` — `L8785`
11. `#tb-sub = subs[id] || ''` — `L8786`

Epilogue: `updateBackBtn()` — `L8827`.

### 8.1 Every `if(id===…)` render dispatch — all 39 lines, in source order

| # | Line | `id` | Render calls made |
|---|---|---|---|
| 1 | `L8787` | `dashboard` | `renderDashboard()` |
| 2 | `L8788` | `interventions` | `renderInterventionsPage()` |
| 3 | `L8789` | `support` | `renderSupportTeam()` |
| 4 | `L8790` | `live` | `renderMapFilterSelects()`, `renderMapTripsTable()`, `setTimeout(()=>setMapMode(MAP_MODE\|\|'live'),50)`, `renderLiveOps()` |
| 5 | `L8791` | `drivers` | `renderSupplyKpis()`, `renderDriversTable()`, `renderPendingDrivers()`, `renderFleetCounts()` (guarded) |
| 6 | `L8792` | `riders` | `renderSupplyKpis()`, `renderRidersTable()`, `renderNewRiders()` |
| 7 | `L8793` | `all-pending` | `renderAllPending('')` |
| 8 | `L8794` | `requests` | `renderRequestsPage()` |
| 9 | `L8795` | `plan-edit` | `loadPlanEditForm()`, `renderPlanFeatures()` |
| 10 | `L8796` | `coverage` | `renderCoveragePage()` |
| 11 | `L8797` | `compliance` | `renderCompliancePage()` |
| 12 | `L8798` | `safety` | `renderSafetyPage()` |
| 13 | `L8799` | `growth` | `renderGrowthPage()`, `renderReferralProgram()` |
| 14 | `L8800` | `zones` | `renderZonesPage()` |
| 15 | `L8801` | `predictive` | `renderPredictivePage()` |
| 16 | `L8802` | `notifications-all` | `renderAllNotificationsPage()` |
| 17 | `L8803` | `my-account` | `renderMyAccountPage()` |
| 18 | `L8804` | `requests-sub-all` | `renderRequestsSubAll(<value of #requests-sub-all-search or ''>)` |
| 19 | `L8805` | `requests-instant-all` | `renderRequestsInstantAll(<value of #requests-instant-all-search or ''>)` |
| 20 | `L8806` | `support` *(second block)* | `renderTkFilterSelect()`, `renderTickets()`, `renderDisputes()`, `renderLostFound()` |
| 21 | `L8807` | `plans` | `renderPlansFormSelects()`, `renderPlansTable()`, `renderRideTypesTable()`, `renderSurgeSchedule()`, `switchPricingSubTab('plans')` |
| 22 | `L8808` | `quickrides` | `renderQuickRidesTable()` |
| 23 | `L8809` | `trips` | `renderTripsTable()` |
| 24 | `L8810` | `renewal` | `renderRenewalPipeline()` |
| 25 | `L8811` | `exec-overview` | `renderExecOverview()`, `renderExecTrendChart()` |
| 26 | `L8812` | `corporate` | `renderCorporateList()` |
| 27 | `L8813` | `fraud` | `renderFraudPage()`, `renderIdentityCollisions()` |
| 28 | `L8814` | `rwallets` | `renderRiderWalletsList()` |
| 29 | `L8815` | `finance` | `renderRefundsTable()`, `renderContributionCard()`, `renderCreditNotes()` |
| 30 | `L8816` | `wallets` | `renderPayoutsTable()`, `renderEscrow()`, `renderDeductions()`, `renderCashReconciliation()` |
| 31 | `L8817` | `readiness` | `renderReadiness()` |
| 32 | `L8818` | `subscriptions` | `renderSubscriptionsTable()` |
| 33 | `L8819` | `settings` | 39 calls: `renderTeamTable()`, `renderAuditLog()`, `renderOpsRadiusConfig()`, `renderGeneralConfig()`, `renderNotificationConfig()`, `renderSecurityConfig()`, `renderCitiesTable()`, `renderOpsLimitsTable()`, `renderCancellationPolicy()`, `renderEmailOutbox()`, `renderLeadInbox()`, `renderPaymentGateways()`, `renderSearchPhasesTable()`, `renderPlanVisibility()`, `renderExportCounts()`, `renderSnapshotsTable()`, `renderPushOutbox()`, `renderLegalConsent()`, `renderReasonCodesTable()`, `renderSlaPolicyForm()`, `renderCompPolicyTable()`, `renderOnCall()`, `renderCommitSettings()`, `renderDispatchSettings()`, `renderBrandingSettings()`, `renderIntegrity()`, `renderRota()`, `renderLedger()`, `renderWindowSettings()`, `renderPricing()`, `updateBroadcastAudienceCount()`, `updatePushAudienceCount()`, `renderSettingsMeta()`, `switchSettingsTab('general')`, `fitSettingsNavHeight()` |
| 34 | `L8820` | `contacts` | `renderContactsPage()`, `renderContactsExtra()`, `renderQueueMetrics()` |
| 35 | `L8821` | `fairness` | `renderFairnessPage()`, `renderCaptainEconomics()` |
| 36 | `L8822` | `inbox` | `renderInbox()` |
| 37 | `L8823` | `commitment` | `renderCommitmentPage()` |
| 38 | `L8824` | `audit-log` | `renderAuditLog()` |

**`support` is dispatched twice** (`L8789` and `L8806`) — both blocks fire on the same navigation. That is 5 render calls for one page, `renderSupportTeam()` first, then the ticket/dispute/lost-found set.

### 8.2 Page ids reachable by `go()` that have NO render branch

These have a `<div class="page">` and a `titles` entry, but `go()` performs no render for them — they show whatever the DOM last contained:

`corp-detail` (`L?` page div present), `profile`, `applicant-detail`, `ticket-detail` (all three are normally reached via their own `open*` functions, not `go()`).

### 8.3 The `titles` map — all 41 entries (`L2168`)

| id | Title |
|---|---|
| `exec-overview` | Executive Overview |
| `corporate` | Corporate Accounts |
| `corp-detail` | Corporate Account |
| `rwallets` | Rider Wallets |
| `dashboard` | Dashboard |
| `subscriptions` | Subscriptions |
| `quickrides` | Quick Rides |
| `trips` | All Trips |
| `renewal` | Renewal Pipeline |
| `live` | Live Map & Route History |
| `drivers` | Drivers |
| `riders` | Riders |
| `finance` | Finance |
| `wallets` | Driver Wallets |
| `plans` | Pricing Plan |
| `plan-edit` | Edit Plan |
| `settings` | Settings |
| `audit-log` | Activity log |
| `interventions` | Interventions |
| `requests` | Requests |
| `requests-sub-all` | All Subscription Requests |
| `requests-instant-all` | All Instant Ride Requests |
| `coverage` | Coverage & Capacity |
| `compliance` | Fleet Compliance |
| `safety` | Safety & Incidents |
| `growth` | Promos & Growth |
| `zones` | Zones |
| `predictive` | Predictive Signals |
| `fraud` | Fraud & Risk |
| `notifications-all` | Notifications |
| `my-account` | My Account |
| `profile` | 360° Profile |
| `all-pending` | All Pending Applications |
| `applicant-detail` | Applicant Detail |
| `support` | Support Center |
| `inbox` | Work Inbox |
| `readiness` | Trip Readiness |
| `ticket-detail` | Ticket Detail |
| `fairness` | Captain Fairness |
| `commitment` | Plan Commitment |
| `contacts` | Contact Drivers & SLA |

### 8.4 The `subs` map — all 38 entries (`L2169`)

| id | Subtitle (seeded) |
|---|---|
| `dashboard` | `Thursday 25 Jun 2026 · 09:14 AM` |
| `subscriptions` | `142 active subscriptions` *(overwritten by `refreshNavCounts`)* |
| `quickrides` | `63 on-demand rides today` *(overwritten)* |
| `trips` | `1,882 trips in June` *(overwritten)* |
| `renewal` | `8 expiring in 3 days` *(overwritten)* |
| `live` | `Track active trips and replay historical routes` |
| `drivers` | `24 active drivers` *(overwritten)* |
| `riders` | `284 registered riders` *(overwritten)* |
| `finance` | `June 2026` |
| `wallets` | `Driver payout management` |
| `plans` | `3 plan templates` |
| `plan-edit` | `Weekly plan · plan_id: 1` |
| `settings` | `System configuration` |
| `audit-log` | `Every action taken in this dashboard, newest first` |
| `interventions` | `Live requests + red-readiness upcoming trips` |
| `requests` | `Instant ride requests + subscription requests — all statuses` |
| `requests-sub-all` | `Full list — search across all subscription requests` |
| `requests-instant-all` | `Full list — search across all instant ride requests` |
| `coverage` | `Backup captains + driver slot capacity` |
| `compliance` | `Documents, expiries, and regulatory sync` |
| `safety` | `SOS alerts and incident protocol` |
| `growth` | `Promo codes, incentives, messaging, retention` |
| `zones` | `Demand vs supply by district` |
| `predictive` | `Early-warning signals across the whole system` |
| `notifications-all` | `Every alert, sorted by priority` |
| `my-account` | `Profile, security, and permissions` |
| `profile` | `Unified entity view` |
| `all-pending` | `5 applications` |
| `applicant-detail` | `KYC review` |
| `support` | `Internal team assistance for drivers & riders` |
| `inbox` | `Every task across every queue, in one place` |
| `readiness` | `Upcoming subscription trips in the next 24 hours` |
| `contacts` | `Why people contact us, and whether we kept our promise` |
| `fairness` | `Appeals, rating disputes and captain-reported rider issues` |
| `commitment` | `Who is holding to their plan, and who is drifting` |

Ids present in `titles` but **absent from `subs`** (subtitle renders as empty string): `exec-overview`, `corporate`, `corp-detail`, `rwallets`, `fraud`, `ticket-detail`.

---

## 9. The other three navigators

### 9.1 `window.openProfile(id, isBack)` — `L8829–8867`

1. `hit = resolveId(id)`. If null → `toast('No record for ' + id, 'err')` and return (`L8831`).
2. `if(!isBack) pushHistory()`; `navCurrent = {type:'profile', id:hit.data.id}`.
3. Hides all pages, shows `#p-profile`.
4. `#tb-title = '360° Profile'`, `#tb-sub = d.id`.
5. `updateBackBtn()`.
6. Fills `#prof-name`, `#prof-meta`, `#prof-body` by entity type:

| `hit.type` | Line | Name line | Body builder |
|---|---|---|---|
| `riders` / `drivers` | `L8839–8846` | avatar + name + `lvlBadge(d.lvl)` + `rstar(d.rating)` gold badge | `buildEntityProfile(d, isDrv)`, then `initCardToggles()` |
| `trips` | `L8847–8850` | `⚡`/`📋` + `Trip ` + id | `buildTripProfile(d)` |
| `subscriptions` | `L8851–8854` | `📦 ` + id + ` · ` + plan | `buildSubProfile(d)` |
| `payments` | `L8855–8858` | `💳 ` + id | `buildPayProfile(d)` |
| `complaints` | `L8859–8862` | `⚠️ ` + id | `buildComplaintProfile(d)` |

7. `document.querySelector('.main').scrollTo(0,0)` (`L8866`).

### 9.2 `window.openApplicantDetail(id, isBack)` — `L8868–8881`

Looks up `DB.pendingDrivers`; if the applicant is `approved` with an `approvedAs`, also loads `DB.drivers[a.approvedAs]`; if no applicant record at all, falls back to a direct `DB.drivers` search. Sets `navCurrent={type:'applicant',id}`, shows `#p-applicant-detail`, title `Applicant Detail`, subtitle = id, then `buildApplicantDetailBody(a, approved)`.

### 9.3 `window.openTicketDetail(id, isBack)` — `L8882–8892`

Looks up `DB.tickets`; returns silently if not found. `navCurrent={type:'ticket',id}`, shows `#p-ticket-detail`, title `Ticket <id>`, subtitle `t.subject`, then `buildTicketDetailBody(t)`.

---

## 10. Global search

### `resolveId(raw)` — `L3266–3275`

```js
q = (raw||'').trim().toUpperCase();
if(!q) return null;
buckets = ['riders','drivers','trips','subscriptions','payments','complaints'];
// 1. exact key hit in each bucket, in that order
// 2. fallback: substring match on .name, ONLY in buckets[0] (riders) and buckets[1] (drivers)
return null;
```

Rules, exactly as written:
- Input is uppercased, so lookup is **case-insensitive only because DB keys are uppercase**. A lowercase rider name will still match at step 2 because the stored `name` is also uppercased before `indexOf`.
- Bucket order fixes precedence: a `riders` key always wins over a same-named `drivers` key.
- Only the **first** match is returned; there is no disambiguation UI.
- Step 2 name search covers riders and drivers **only** — you cannot search a trip, subscription, payment or complaint by anything but its exact id.

### `globalSearch(raw)` — `L3277–3281`

```js
hit = resolveId(raw);
if(!hit){ toast('No record found for "'+raw+'"','err'); return; }
openProfile(hit.data.id);
```

Triggered only by `Enter` in `#global-search` (`L571`). There is no live/typeahead search and no results list.

---

## 11. The `go()` wrapper (`L20724–20735`)

`auditFixBoot()` monkey-patches the router once, guarded by `window.__goWrapped`:

```js
var origGo = window.go;
if(typeof origGo==='function' && !window.__goWrapped){
  window.__goWrapped = true;
  window.go = function(){
    var r = origGo.apply(null, arguments);
    setTimeout(function(){ markExplainables(document); }, 30);
    return r;
  };
}
```

Purpose: after each navigation the DOM is rebuilt, so the "explain" affordance layer (`explainSweep()` / `installExplainLayer()` / `markExplainables()`, `L20700`) must be re-applied. `auditFixBoot` is registered as boot step `audit fixes` (`L21823`, needs `DB.reasonCodes`) and therefore runs *after* the authoritative `window.go` at `L8774` is defined — the ordering is deliberate and load-bearing.

Also in that same block: `cselToggle` is replaced with a null-safe version (`L20704–20722`) that silently ignores a stale element id.

**Note:** `L3115` contains the no-op statement `window.go = window.go;` — a leftover, harmless.

---

## 12. Actions table

| Label / trigger | Handler | Effect | Permission | Audit |
|---|---|---|---|---|
| Any sidebar item | `go(id, this)` | Show page, set active item, run render chain | none | no |
| Sidebar logo | `go('dashboard', findSbEl('dashboard'))` | Navigate to dashboard | none | no |
| Sidebar footer | `go('my-account', null)` | Navigate to My Account | none | no |
| ☰ mobile menu | `toggleMobileSidebar()` | Toggle drawer + backdrop | none | no |
| Backdrop tap | `toggleMobileSidebar()` | Close drawer | none | no |
| ← Back | `goBack()` | Pop `navStack`, re-dispatch | none | no |
| Global search ⏎ | `globalSearch(value)` | Open matching 360° profile, or error toast | none | no |
| 🔔 bell | `toggleNotifPanel(event)` | Open/close panel | none | no |
| Notification row | `handleNotifClick(id)` | Mark read + run action or type route | none | no |
| `Mark all read` | `markAllRead()` | Set `read=true` on all notifications | none | no |
| `See all →` | `openAllNotifications()` | `go('notifications-all')` | none | no |
| ✋ my-work chip | `go('support', null)` | Navigate to Support Center | none | no |
| 📟 on-call chip | `go('settings', null)` | Navigate to Settings | none | no |
| Avatar | `openUserSwitch()` | Open acting-user modal | none | **yes** — the commit logs `switch_user` |

No navigation action in the shell is permission-gated. Pages are hidden/shown freely; enforcement happens only inside commit functions (see `00c-identity-permissions-and-audit.md`).

---

## 13. Cross-module dependencies

`go()` hard-references **77 distinct render functions** across every business module. It is the single largest coupling point in the file: adding a page means editing `titles`, `subs`, the page `<div>`, the sidebar item, and the `go()` chain — five separate places.

`refreshNavCounts()` reads `DB.trips`, `DB.subscriptions`, `DB.rideRequests`, `DB.subscriptionRequests`, `DB.upcomingSubTrips`, `DB.drivers`, `DB.riders`, and calls `tripScenario()`.

The badge functions collectively read `DB.corporateAccounts`, `DB.incidents`, `DB.zones`, `DB.tickets`, `DB.fairnessCases`, `DB.slaPolicy`, `DB.commitPolicy`, `DB.paymentRisk`, `DB.referralLog`, `DB.steerOffers`, `DB.complianceSuspensions`, `DB.disputes`.

---

## 14. Hardcoded / mock / demo values

| Value | Line | Note |
|---|---|---|
| Seeded badge numbers `4`, `142`, `63`, `8`, `5`, `1` | `L497,502,504,506,507,503` | Static HTML; replaced on first `refreshNavCounts()` / page render. |
| `subs.dashboard = 'Thursday 25 Jun 2026 · 09:14 AM'` | `L2169` | A fixed date string. Never recomputed — the dashboard subtitle is permanently 25 Jun 2026. |
| `'25 Jun'` date filter | `L9393` | `refreshNavCounts()` counts "today's" trips by string-matching the literal `25 Jun`. |
| `parseInt(x.ends,10) - 25 <= 3` | `L9395` | "Today" is hardcoded as day-of-month 25. |
| `subs.trips = '1,882 trips in June'` | `L2169` | Overwritten on first refresh. |
| `subs.all-pending = '5 applications'` | `L2169` | Never recomputed. |
| `subs.plans = '3 plan templates'` | `L2169` | Never recomputed; `DB.plans` does contain exactly 3. |
| `subs['plan-edit'] = 'Weekly plan · plan_id: 1'` | `L2169` | Never recomputed regardless of which plan is being edited. |
| `subs.finance = 'June 2026'` | `L2169` | Static. |
| `#sb-ft-name` = `Sarah Al-Rashid`, `#sb-ft-role` = `Owner · settings ▾` | `L545` | Overwritten by `commitUserSwitch()` (`L3106–3107`). |
| `#tb-avatar` = `SA` | `L578` | Overwritten by `commitUserSwitch()` (`L3108`). |
| `selectTrip('TRP-7741')` at boot | `L14562` | Live map opens on a fixed demo trip. |
| `navStack` cap `40` | `L7006` | |
| `NOTIF_PANEL_PREVIEW = 8` | `L2227` | |

---

## 15. Risks & gaps

1. **No URL state.** Refresh always returns to `dashboard`. Deep links, browser Back/Forward, and bookmarking are impossible. `goBack()` is an app-internal stack that the browser's own Back button does not touch — pressing browser Back leaves the app entirely.
2. **Unknown page ids fail silently.** `go('typo')` clears every page, adds `.on` to nothing (`L8782–8783`), and leaves a blank white screen with the title set to the raw id.
3. **`support` is dispatched twice** (`L8789`, `L8806`), doubling work on every visit.
4. **Ten of fifteen badges are owned by page renderers,** so they only update when that page is visited (or during the one-shot boot render at `L14556`). A subscription cancelled from the Subscriptions page will not change `sbb-coverage` until Coverage is opened.
5. **Three badges write `|| ''` on zero** (`sbb-fraud` `L5645`, `sbb-corporate` `L6496`, `sb-readiness-badge` `L13014`) while the others write a literal `0`. Inconsistent empty state.
6. **Badge class is only maintained for five badges** (`sbb-contacts`, `sb-ticket-badge`, `sbb-commit`, `sbb-fairness`, `sbb-inbox`). The rest keep the class they were born with — `sbb-subs` and `sbb-qr` are permanently grey `n` and every other badge is permanently red `a` even at zero.
7. **`.sb.pin` is styled but unwired** — 8 CSS rules with no JS or markup to activate them.
8. **`.sb-logo-text` is styled but has no element.**
9. **`findSbEl()` matches on the raw `onclick` attribute string**, so any future id that is a substring of another quoted token inside an `onclick` will mis-resolve. It also returns the last match rather than the first.
10. **`resolveId()` returns only the first hit** across 6 buckets with no ambiguity handling, and name search covers only riders and drivers.
11. **The topbar `▾` on `Owner · settings ▾`** advertises a dropdown that does not exist.
12. **The `titles` fallback is the raw id** (`titles[id] || id`) — a routing typo surfaces to the user as a lowercase slug in the title bar.
13. **`refreshNavCounts()` mutates the shared `subs` object,** so the "seeded" values in `L2169` are permanently destroyed after the first navigation — they are not a fallback.
14. **`#impersonation-bar` and `#call-bar` are `position:fixed` children of `.topbar`** (`L564–565`). The impersonation bar covers the topbar itself (`top:0`), obscuring the title, back button and search while impersonating.

---

## 16. UNVERIFIED items

| Item | Why unverified |
|---|---|
| Actual runtime badge values | Requires executing the page; all figures here are formulas read from source, not observed output. |
| Whether `tripScenario()`, `subIsCovered()`, `slaState()`, `pendingConfirmations()`, `driverRiskScore()`, `subHealthScore()`, `inboxItems()`, `whoHolds()`, `myOpenClaims()`, `onCallNow()`, `complianceScan()` are defined before first use | Each is invoked inside a badge formula; several are called through `typeof` guards, implying the author was unsure too. Their definitions are outside this document's scope (business modules). |
| Whether `#p-corp-detail`, `#p-profile`, `#p-applicant-detail`, `#p-ticket-detail` render correctly when reached via `go()` rather than their `open*` helpers | No render branch exists in `go()` for these ids; behaviour depends on stale DOM. Not testable by reading alone. |
| Whether the 40-entry `navStack` cap ever trips in practice | Depends on session length. |
| The pin feature's intended trigger | No code exists; intent cannot be recovered from the file. |

---

## 17. Line-number index

| Item | Lines |
|---|---|
| Sidebar CSS (rail, items, badges, footer) | `L24–54` |
| RTL sidebar CSS | `L382–406` |
| Responsive / mobile drawer CSS | `L409–466` |
| Topbar CSS | `L60–71` |
| Sidebar HTML | `L479–547` |
| — logo | `L481–483` |
| — `sec.executive` | `L485–488` |
| — `sec.intelligence` | `L489–493` |
| — `sec.overview` | `L494–499` |
| — `sec.operations` | `L500–509` |
| — `sec.fleet` | `L510–519` |
| — `sec.growth` | `L520–524` |
| — `sec.finance` | `L525–530` |
| — `sec.support` | `L531–535` |
| — `sec.config` | `L536–541` |
| — footer | `L543–546` |
| `#mob-sb-backdrop` | `L548` |
| Topbar HTML | `L552–580` |
| `titles` map | `L2168` |
| `subs` map | `L2169` |
| Notification helpers (`notifIcon` … `sortNotifsByPriority`) | `L2171–2209` |
| `toggleMobileSidebar()` | `L2210–2213` |
| `toggleNotifPanel()` | `L2214–2222` |
| Outside-click panel close | `L2223–2226` |
| `renderNotifPanel()` / `notifRowHtml()` / `markAllRead()` | `L2229–2259` |
| `updateBellBadge()` | `L2259–2266` |
| `handleNotifClick()` / `openAllNotifications()` | `L2267–2284` |
| `navStack` / `navCurrent` | `L2849–2850` |
| `resolveId()` | `L3266–3275` |
| `globalSearch()` | `L3277–3281` |
| `updateBackBtn()` / `pushHistory()` / `findSbEl()` / `goBack()` | `L7005–7021` |
| `window.go()` | `L8774–8828` |
| `window.openProfile()` | `L8829–8867` |
| `window.openApplicantDetail()` | `L8868–8881` |
| `window.openTicketDetail()` | `L8882–8892` |
| `refreshNavCounts()` | `L9392–9409` |
| `pushOpsNotification()` | `L9661–9666` |
| `updateMyWorkChip()` | `L19038–19043` |
| `updateInboxBadge()` | `L19312–19319` |
| `updateOnCallChip()` | `L19813–19821` |
| `go()` wrapper (`auditFixBoot`) | `L20724–20735` |
