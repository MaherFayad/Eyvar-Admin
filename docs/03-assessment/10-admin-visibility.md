# 10 · Admin & Settings — Visibility

**The owner's question, verbatim:** *"is the adming, and settings giving me enough visibility"*

**Method.** `npx vite --port 5317` (serves 200). Seven Admin sub-tabs read as built code, not as
described: `/admin/overview`, `/admin/workspace`, `/admin/team`, `/admin/policy`,
`/admin/communications`, `/admin/data`, `/admin/activity` — all seven wired in `src/routes.tsx:490`–`501`.
Every claim below is traced to a line in `src/` or in `eyvar_ops_panel_v40_fixed.html`. Where the
current behaviour looks wrong it is recorded as *current behaviour, suspected defect* with the line,
not silently accepted and not silently fixed.

**Tests.** `npx vitest run --maxWorkers=4` — **not green**. 3,083 tests, 12 failed across 8 files
(a second run failed 6 across 5, so at least some are flaky). **None of the failures is in
`src/screens/admin/`**: the admin-scoped run (`src/screens/admin` + `src/shell/permissions.test.ts`
+ `src/data/clients/team.test.ts`) is 217/217 green. The failures sit in `commands`, `hooks/requestCache`,
`shell/qa.shell`, `lib/i18n/inventory`, `operations/corporate`, `operations/trips`, `support/tickets`,
`support/disputes`. Reported because the brief said the tree was green and it is not.

---

## Verdict, up front

**Admin is a settings screen. It is a good settings screen. It is not an oversight screen, and the
owner asked for an oversight screen.**

Six of the seven sub-tabs answer *"what is this set to, and can I change it?"* — competently, with
four states, refusals stated in place, and real round-trips where the legacy app had `setTimeout` and
a toast. The seventh, Activity, is the one that would make it oversight, and it is the weakest surface
in the section:

- **The audit log has no `before` and no `after`.** `AuditEntry`
  (`src/data/types/audit.ts:105`) carries `id · at · action · actorId · actorName · subjectType ·
  subjectId · amountHalalas · reasonCode · note · detail`. There is no prior-value field of any kind.
  The **legacy app had one** — `logAction(action, entityType, entityId, summary, before, after)`
  (`eyvar_ops_panel_v40_fixed.html:3133`) plus `auditDiffHTML()` (`:3156`), which rendered
  `key: <s>old</s> → new`. That capability was dropped in the rebuild and nothing replaced it. By the
  brief's own standard — *"an audit log that says a policy changed without saying what it changed from
  is not an audit log"* — this is not an audit log. It is an activity feed.
- **The log is empty.** `src/data/clients/audit.ts:42` — `let entries: AuditEntry[] = []`, seeded with
  nothing, session-only, cleared on reload. The Activity screen's normal state on a fresh load is the
  first-run empty. The legacy shipped 8 seeded rows (`:2863`).
- **Every entry has the same timestamp.** `src/data/clients/audit.ts:67` — `at: EYVAR_NOW`, the fixed
  clock constant `2026-06-25T09:14:00+03:00`. Every row in the log reads *25 Jun 09:14*, whatever the
  order they were written in.
- **There are no filters.** The screen passes `tabs`, `searchPlaceholder` and `bulkActions` to
  `DataTable` (`AdminActivityScreen.tsx:379`–`383`) and no filter set. No actor filter, no action
  filter, no date range. The three tabs are *orderings*, not filters — the file says so at line 33.
- **Search is page-local.** `AdminActivityScreen.tsx:106` filters `data.data.items` — the fetched
  page — not the log. The client *can* filter server-side (`listAuditEntries` accepts `subjectType`,
  `subjectId`, `action` — `clients/audit.ts:88`) and the screen passes only `page` and `pageSize`.

The legacy audit-log page had an actor dropdown, an action-type dropdown, a page-size control, a
diff column and a per-actor drill-down modal (`showActorHistory`, `:9271`). The rebuild has none of
those five. It gained bulk CSV export and a permission refusal on financial rows. That is a net loss
of oversight.

---

## 1. The four audit-log questions, with the exact failure point

### "What did this operator do yesterday?" — **fails twice**

| Step | Result |
|---|---|
| Open `/admin/activity` | First-run empty. `entries = []` (`clients/audit.ts:42`); the log holds only what this browser session has written. |
| Filter to the operator | **No actor filter exists.** `by-actor` is a sort key (`AdminActivityScreen.tsx:79`), not a filter. Every other actor's rows stay on screen. |
| Filter to yesterday | **No date control of any kind.** And it would not help: every entry is stamped `EYVAR_NOW` (`clients/audit.ts:67`), so the whole log is one instant. |
| Fall back to search | `q` matches `id · actorName · actorId · action · subjectId · subjectType · reasonCode · note` over **the current page only** (`AdminActivityScreen.tsx:106`–`116`). Typing "Lina" on page 1 of 4 misses pages 2–4. |

**Exact failure point:** `AdminActivityScreen.tsx:102` — `listAuditEntries({ page, pageSize, signal })`.
The three filter parameters the client already accepts are never passed.

**Regression named:** legacy `showActorHistory(actorId)` (`:9271`) opened *"everything Noura has done"*
from a click on her name in any row, and it was reachable from the four-row Settings preview too. There
is no equivalent anywhere in the rebuild.

### "Who touched this payout?" — **fails at the entry point**

`listAuditEntries` supports exactly this: `subjectType: 'payout', subjectId: 'PAY-…'`
(`clients/audit.ts:90`–`91`). Nothing in the product calls it that way. The Activity screen does not,
and no payout, wallet, escrow or ledger detail surface renders an audit strip. The legacy had
`auditForEntity(entityId, limit)` (`:9292`) — *"used by other pages"* — and the rebuild's equivalent
plumbing exists and is unused.

**Exact failure point:** zero call sites of `listAuditEntries` with a subject. Grep returns one
consumer, `AdminActivityScreen.tsx:102`, which passes no subject.

Secondary: the Activity table renders `subjectId` as plain mono text (`AdminActivityScreen.tsx:213`) —
it is not a link. Even a row you find by eye does not take you to the record.

### "Who changed this policy, and what was it before?" — **fails on the second half, absolutely**

The *who* half works if you happen to be in the same browser session as the change: `policy.save`
is audited (`clients/policy.ts:192`) and the entry names the actor.

The *what was it before* half cannot be answered at all. The detail payload is:

```ts
detail: { key: 'policy.audit.saved',
          params: { count: changedFields.length, fields: changedFields.join(', ') } }
```
`src/data/clients/policy.ts:199`–`202`

It carries the **names of the fields that changed** and neither value. `dispatch.searchRadiusKm`
appears in the string; `3 → 12` does not. The type comment at `types/policy.ts:363` even describes
the intent — *"every flattened cell appears here as `null → 60`"* — and the implementation does not do it.

Three more instances of the same shape, each worse than the last:

| Act | Line | What the audit line says | What it cannot say |
|---|---|---|---|
| `workspace.update` | `clients/workspace.ts:174` | `fields: 'supportPhone, timezone'` | any old or new value |
| `team.securityPolicy` | `clients/securityPolicy.ts:137`–`142` | `idleMinutes`, `expiryHours`, and `twoFactor: String(changed)` — a **boolean saying only that the second-factor mandate moved** | *which way it moved.* Turning the 2FA mandate **off** logs `twoFactor: "true"`. |
| `team.permissions` | `clients/team.ts:634`–`639` | `added: 2, removed: 5` | **which permissions.** This is legacy defect F19 (`edit_user_permissions` logged `13 permissions → 0 permissions` and nothing else) reproduced exactly. |

**Suspected defect, separate:** the stored provenance is wrong. `clients/workspace.ts:164`, `:224`,
`:256` and `clients/securityPolicy.ts:128` all write **`updatedBy: 'USR-1'` as a literal**. Whoever
saves, the record says Sarah Al-Rashid did it. `clients/retention.ts:109` does it correctly —
`updatedByUserId: currentMockUserId()` — so the correct pattern exists in the same directory.

**And the policy screen itself shows no provenance.** `OperationalPolicy` (`types/policy.ts:335`) has
five fields — `dispatch`, `cities`, `limits`, `reasonCodes`, `sla` — and no `updatedAt`, no `updatedBy`,
no version. Legacy had `settingsLastUpdated()` (`:7335`), which filtered the audit log on
`entityType === 'settings'` to put a *last changed* stamp on the Settings page. The rebuild dropped it.

### "Has anyone bulk-exported customer data this month?" — **fails completely; there is no such event**

`AuditAction` (`types/audit.ts:24`–`103`) is a closed union of 45 members. **None of them is an export.**
The legacy had `export_data` (`ACTION_LABELS`, `:2913`) and fired it from `downloadCSV()` (`:7604`)
and `doExport()` (`:9215`).

Meanwhile the console has at least three unaudited export paths:

1. **`exportReport()`** — `clients/reports.ts:392`. Its own doc-comment at `:387` says *"an export of
   operational data that leaves no trace is a compliance problem, not a feature… the audit entry names
   the actor, the report and the window (AC-864)"*. **The function body contains no `appendAudit` call.**
   The comment describes an entry that is not written. This is the path Admin › Data's own
   `ExportCard` uses — the compliance page's export is not logged.
2. **`DataTable`'s export button** — `components/DataTable.tsx:1209`–`1225`. Builds a CSV of the
   current view and downloads it. Present on every index in the product, including Riders, Drivers and
   360°-adjacent tables. No audit call.
3. **The Activity screen's own bulk export** — `AdminActivityScreen.tsx:333` `downloadAuditCsv(...)`.
   Taking the tamper record off-platform is itself unrecorded. This is legacy finding F10 carried
   forward unchanged.

**Exact failure point:** `types/audit.ts` has no export member, so the event is not representable, so
no call site could write it even if one wanted to.

### Also never emitted

Comparing the 45 declared `AuditAction` members against every `appendAudit` call site in
`src/data/clients/`, four are declared and never written by anything:

| Member | Consequence |
|---|---|
| `permission.denied` | **A refused action leaves no trace.** Legacy audited every denial (`requirePerm` `:3129`, `requirePagePerm` `:10685`) on the explicit reasoning that *"a denial is itself a real security event"* (`:3120`). The rebuild refuses in the UI, correctly and in place, and records nothing. Somebody probing for authority they do not have is invisible. |
| `retention.save` | `clients/retention.ts` imports no audit module. Changing how long the audit log itself is kept is not in the audit log. |
| `senderIdentity.setDefault` | `types/audit.ts:78` names this as the one that *"matters most… its blast radius is every transactional email the system sends afterwards"* — and then it is never called. |
| `emailTemplate.save` | Editing what the product says to a rider in its own name is unrecorded. |

The type file itself documents the last three as *"currently unaudited at the call site… a gap, not a
completed handoff"* (`types/audit.ts:71`–`75`). That is honest and it is still a hole.

---

## 2. Permission visibility — the verdict in both directions

**The counts in the brief are slightly off and the shape of the answer does not change.** The matrix
renders **21** permissions (`PERMISSION_SET`, `shell/permissions.ts:229`–`251` — twenty live keys plus
the retired `manage_settings` alias) against **6** roles (`ROLE_NAMES`, `types/session.ts:34`).
21 × 6 = 126 cells, `AdminTeamScreen.tsx:664`–`700`.

### permission → people: **NO.** The matrix answers *permission → role*, and stops.

Reading *"who can pay a payout?"* today takes three steps and gives an unsafe answer:

1. Team & Access → scroll past the roster to the matrix → find the `process_payouts` row → `Owner ✓`,
   `Finance ✓`, four roles `✕`.
2. Scroll **back up** to the roster and read the Role column of every row to find who holds those two.
3. Answer: Sarah Al-Rashid, Fahad Al-Dosari.

Three things are wrong with that:

- **It is a manual join the owner performs by eye.** There is no column, no filter and no view that
  goes from a permission to a list of people. At five operators this is a scroll; at fifty it is
  unusable, and the roster is a hand-rolled `<table>` (`AdminTeamScreen.tsx:518`–`628`) with **no
  search, no sort and no filter** — not a `DataTable` — reading `listOperators({ pageSize: 100 })`
  (`:196`), so operator 101 is not on the page at all.
- **It silently includes people who cannot sign in.** Noura Al-Fahad (`USR-4`) is `Invited` and
  `lastLoginAt: null` (`fixtures/teamUsers.ts:92`). She would appear in a hand-rolled "who holds
  `manage_tickets`" answer with no signal that she has never had an account.
- **It is blind to exceptions.** The matrix reads `ROLE_PERMISSIONS[role]` — the *baseline*
  (`AdminTeamScreen.tsx:679`). D17's model is *baseline plus a signed per-user delta*
  (`types/session.ts:56`–`68`), and the delta is what `Session.permissions` is actually built from
  (`clients/auth.ts:283`). Today no seeded operator carries one (`grep -c permissionDelta
  fixtures/teamUsers.ts` → 0), so the matrix happens to be correct — **by accident, not by
  construction**. The first `Support + release_escrow` exception in this product will not appear on
  this screen, and the screen will keep saying Support cannot release escrow.

### person → permissions: **partially, for yourself only.**

- **For yourself:** yes, and it is good. The account layer's permissions section
  (`shell/layers/AccountLayer.tsx:517`–`540`) lists all 21 keys against `session.permissions` with a
  granted/withheld word beside each, using the capability sentences from
  `account.permission.<key>`. This is the surface the brief's *"what exactly can Nora do?"* wants —
  it just is not reachable for Nora.
- **For anyone else:** no. The roster row shows name, role, second factor, status, last seen and
  compensation cap. There is no per-operator permission view, no drill-down, no dialog. To answer
  *"what exactly can Noura do?"* the owner reads `Support` off her row, scrolls to the matrix, and
  reads down one of six columns across 21 rows — then holds 21 booleans in their head. And, again,
  that reading is the baseline, not her effective set.

### Should a matrix exist? Yes — but not the one that exists.

The role × permission grid is the right artifact for **designing** authority and the wrong artifact
for **auditing** it. The owner's two questions are both about *people*. What is missing is:

- a **permission → holders** view (click `process_payouts`, get the named list of active operators who
  hold it, deltas included, invited/suspended flagged);
- a **person → effective permissions** panel on the roster row, rendering the delta **as a delta** —
  `Support + release_escrow − contact_users` — which D17 requires (AC-921: *"a flattened list makes an
  exception look like a role, and nobody ever audits it back"*) and which nothing implements.

The matrix is also **read-only** and says so (`AdminTeamScreen.tsx:704`–`707`). `setOperatorPermissions`
exists and is enforced (`clients/team.ts:618`), including the last-`manage_team`-holder invariant, and
**no screen calls it**. So there is currently no way to grant or revoke a permission from inside the
console — which is a gap in control, and also why the audit hole at `clients/team.ts:638` has not bitten
yet.

---

## 3. What is configured — Operational Policy

**One screen, six cards, one save bar. This is the best-executed sub-tab in the section.**
`AdminPolicyScreen.tsx:173`–`186` renders `DispatchCard`, `CitiesCard`, `LimitsCard`,
`SlaTierDefaultsCard`, `SlaQueueGridCard`, `ReasonCodesCard` in one column with one dirty state and
one commit. Dispatch radius, cities, limits, the SLA tier defaults, the SLA queue grid and the reason-code
registry are all on one screen and all round-trip through `clients/policy.ts`. The legacy's separate
panes (`15f`, `15g`, `15i`, `15k`) collapse correctly.

Three gaps:

**(a) The chat cap is not on this screen, and is not configurable at all.** `PermissionKey`'s own
comment (`types/navigation.ts:150`) scopes `manage_ops_policy` as *"Dispatch radius, cities, limits,
reason codes, SLA policy, the D22 chat cap"*. The cap is a hard-coded constant in a Support screen —
`CONCURRENT_CHAT_CAP_DEFAULT = 3` (`screens/support/conversations/presence.ts:70`, with `MIN 1 / MAX 8`
at `:71`–`72`) — read at `presence.ts:227`. It is not in `OperationalPolicy`, not on the Admin screen,
and cannot be changed by an owner.

**(b) There is no "last changed, by whom" on the screen.** Covered in §1: `OperationalPolicy`
(`types/policy.ts:335`) carries no provenance, and the legacy `settingsLastUpdated()` (`:7335`) stamp
was not carried across. The owner looking at a dispatch radius of 12 km cannot tell whether it has been
12 km for a year or since this morning.

**(c) Retention is the counter-example, and it is on a different tab.** `RetentionCard` renders
`Last saved` with the server stamp *and the actor* (`clients/retention.ts:106`–`112`,
`RetentionCard.tsx` header note). It is the one place in Admin that does this. The pattern exists; it
is applied once.

---

## 4. What is failing quietly

**Yes, silently, in every case below. The console tells the owner nothing until they navigate to the
specific card and read it.**

| Failure | Where the fact lives | Where the owner is told | Verdict |
|---|---|---|---|
| A webhook endpoint failing repeatedly | `consecutiveFailures: 3` on `WH-…` (`fixtures/integrations.ts:165`), rendered as a `warning` badge in `WebhooksCard` | Nowhere above that card. `admin-workspace` badge is `count: null` (`fixtures/navCounts.ts:345`); no Admin › Overview tile; no shell banner | **Silent.** The one seeded failing endpoint is invisible until you open Workspace and scroll past General, Branding, Legal and API keys. |
| A second endpoint failing | `consecutiveFailures: 1` (`fixtures/integrations.ts:181`) | same | **Silent.** |
| Email bounces and hard failures | 8 seeded bounced/failed deliveries (`fixtures/emails.ts:483`–`491`) | `EmailLogCard` renders the state per row, and reports a count up to the page header | **Partly surfaced, and the number is wrong** — see below. |
| A sender identity whose DKIM never verified | `verification: 'failed'`, `canSend: false` (`fixtures/emails.ts:106`–`131`) — this domain **cannot send** | `SenderIdentitiesCard` only | **Silent above the card.** A send-blocking condition with no badge, no notice, no tile. |
| A push broadcast that failed | `state: 'failed'` → `warning` badge (`PushBroadcastsCard.tsx:45`) | Last 10 broadcasts, no count, no filter, no header meta | **Silent.** |
| An API key never used since issue | `lastUsedAt: null` (`fixtures/integrations.ts:112`) — rendered as *Never used* | `ApiKeysCard` only | **Silent**, and there is no expiry concept at all: `ApiKey` (`types/integrations.ts:191`–`205`) has `scopes` and `revokedAt` and **no `expiresAt`**. Nothing can be "expiring soon". |
| Data-integrity findings | 15 checks compiled in; findings exist | **Nothing scans on mount** (`IntegrityPane.tsx:38` — deliberate, and the reasoning is sound). `admin-data`'s badge counts the erasure request only | **Silent by design.** A finding does not exist until an operator presses `Run all checks`. Defensible; still means nobody is told. |
| A PDPL erasure request past its statutory deadline | `admin.overview.erasureOverdue: 1` (`fixtures/metrics.ts:2058`) | **This one works** — an `attention` nav badge (`navCounts.ts:369`), an Overview tile, and a notice (`metrics.ts:3409`) | **Surfaced.** The only console-health condition in the product that is. |
| 42 of 42 on-call rota slots unassigned | `admin.overview.rotaGaps: 42` (`fixtures/metrics.ts:2086`) | An Overview tile, tone-less, `admin-team` badge is `neutral` count `1` (the invited operator) | **Under-surfaced.** *Nobody is on call at any hour* renders as a grey number. |
| 3 of 5 operators without a second factor, one of them Finance | `admin.overview.operatorsWithoutTwoFactor`, target `0` (`fixtures/metrics.ts:2113`) | An Overview tile against a target; a per-row word in the roster | **Surfaced, weakly.** No filter, no list, no alert when it moves. |

**Two specific defects found while checking this.**

**(a) The email failure count under-reports, and the header says it does not.**
`EmailLogCard.tsx:143` — `const attention = rows.filter(d => d.failure !== null).length` — counts the
**current page**, while `total` on the next line is the **server total**. Both are handed to the page
header, which renders `comms.meta` with `{ total, attention }`
(`AdminCommunicationsScreen.tsx:99`–`101`). So the header reads e.g. *"1,024 deliveries · 3 need
attention"* where 1,024 is the log and 3 is page one. The code comment two lines above says *"Reported
up rather than recounted there: the header's meta must agree with the table beneath it"* — the two
numbers have different scopes, which is exactly the disagreement the comment set out to prevent.
**Current behaviour, suspected defect.**

**(b) There is no alerting that could catch any of this.** `clients/alerts.ts` exists and
`screens/reports/AlertsView.tsx` renders it, but `AlertRule` targets a **saved report series**
(`types/report.ts:674`–`681`) — business metrics, not console health. There is no rule shape that could
watch a webhook, a bounce rate or an admin action. And **every seeded rule has `cadence: null`**
(5 of 5, `fixtures/reports.ts:433`, `:467`, `:496`, `:526`, `:555`), which the type documents as
*"a rule with `cadence: null` does not evaluate"* (`types/report.ts:665`). Nothing evaluates today.

---

## 5. What is missing that an operations owner needs

| # | Need | State today |
|---|---|---|
| 1 | **Before-and-after values in the audit log** | Absent from the type. See §1. The single largest gap in the section. |
| 2 | **An export of the audit trail** | Exists, sort of: bulk CSV of **selected rows on the current page** (`AdminActivityScreen.tsx:333`–`360`), gated on `view_finance` for money-moving rows. There is no *export the whole log*, and the export itself is unaudited. |
| 3 | **Usage and adoption per operator** | Two tiles exist and **both are fabricated constants**: `'admin.overview.itemsResolvedPerOperatorHour': () => 4.8` and `'admin.overview.workloadBalance': () => 1.4` (`clients/metrics.ts:431`–`432`). They are single aggregate numbers with no per-operator breakdown, derived from nothing. A number an owner would act on that no data produced. |
| 4 | **Seat and licence state** | Does not exist. No seat, licence, plan or entitlement concept anywhere in `src/data/types/`. `listOperators` has a `pageSize: 100` ceiling and nothing else. |
| 5 | **Data-retention state** | **Present and good.** `RetentionCard` reads and writes real policy with `Last saved` + actor. The gap is that changing it writes no audit entry (`retention.save` never emitted). |
| 6 | **Who has 2FA** | Per-row word in the roster + an Overview tile against a target of 0. No filter, no list, no "enforce" action. Adequate at 5 operators, not at 50. |
| 7 | **Stale sessions** | Per-operator, behind a kebab (`OperatorSessionsDialog`), with `Trusted until` correctly gated on `isDeviceTrusted` rather than on a non-null date. There is **no roster-level view** — no "sessions older than 30 days", no count. And revoking another operator's session is refused in place (`clients/auth.ts:959` resolves against the signed-in user only), so the control the owner most wants is present and disabled. |
| 8 | **Admin actions out of hours** | Impossible. No date, no time-of-day, no clock in the log — every entry is `EYVAR_NOW`. |
| 9 | **An impersonation trail** | Absent. The legacy logged `impersonation_started` / `impersonation_ended` (`:21073`, `:21084`) and showed an amber banner. `AuditAction` has no impersonation member. `switchMockUser` (`clients/session.ts:152`) is a dev affordance behind `DATA_SOURCE === 'mock'`, writes no audit entry, and shows no banner. The account-menu item that triggers it (`shell/AccountMenu.tsx:206`) is a full identity swap with no record. |
| 10 | **A permission-denial trail** | `permission.denied` declared, never emitted. §1. |
| 11 | **Provenance on the settings themselves** | Only Retention has it. Policy, Workspace and Security Policy have none — and Workspace/Security write a hard-coded `updatedBy: 'USR-1'`. |
| 12 | **`manage_settings` migration finished** | Three screens still gate on the retired key: `AdminCommunicationsScreen.tsx:76`, `IntegrityPane.tsx:149`, `RetentionCard.tsx:78`. Only the Owner holds it (`types/session.ts:93`), so Communications, the integrity run and retention are Owner-only when D17 assigns them to `manage_workspace` and `manage_data_governance`. `types/navigation.ts:174` lists five screens to migrate; two have landed. |

---

## 6. Is Admin a settings screen or an oversight screen?

**A settings screen, with one oversight tile board bolted to the front of it.**

The evidence, plainly:

- **Six of seven sub-tabs are forms.** Workspace, Team, Policy, Communications and Data are edit
  surfaces with a save bar; Activity is a table. That is the shape of Settings, and §2.4's own framing
  calls it *"a pane list by construction"*.
- **`/admin/overview` is the oversight attempt.** Four real tiles (erasure overdue, rota gaps,
  operators without 2FA, active operators) and two fabricated ones. It is the right idea and it watches
  the **workforce and the regulator** — not the **machinery**. There is no tile for a failing webhook,
  a blocked sender domain, a failed push, an unrotated key or an unrun integrity scan.
- **Nothing escalates.** `admin-workspace` and `admin-policy` carry `count: null`
  (`fixtures/navCounts.ts:345`, `:348`) — they can never badge. `admin-communications` is `0`, which by
  the fixture's own rule renders no badge. Exactly one Admin condition in the whole product can raise
  an `attention` badge: the PDPL erasure request.
- **The one surface that would make it oversight — the audit log — cannot answer any of the four
  questions an owner would bring to it.**

The owner's question suggests they want the second. To become the second, Admin needs the audit log to
be a record rather than a feed, and it needs the console's own failures to reach the front page.

---

## 7. Ranked — what would most increase the owner's visibility

Ranked by *visibility gained per unit of work*, not by size.

1. **Add `before` / `after` to `AuditEntry` and render a diff.** `types/audit.ts:105`. Everything
   downstream depends on it and nothing else in this list substitutes for it. The legacy's
   `auditDiffHTML` rules (`:3156`–`3172`) are a working spec, including the one it got wrong —
   it iterated `Object.keys(after)` only, so a **removed** field produced no line (legacy F19). Fix that
   on the way past. Start with the four acts whose values are the point: `policy.save`,
   `team.securityPolicy`, `team.permissions`, `workspace.update`.
2. **Wire the Activity screen's filters to the client that already accepts them.**
   `AdminActivityScreen.tsx:102`. `subjectType` / `subjectId` / `action` exist server-side today
   (`clients/audit.ts:88`–`91`). Add an actor filter and a date range alongside. This alone turns three
   of the four questions from *impossible* to *possible*.
3. **Give the audit log real timestamps.** `clients/audit.ts:67` writes the fixed clock constant to every
   entry. Until an entry knows when it happened, no date filter, no ordering and no "out of hours"
   question can work — and *"what did this operator do yesterday"* is unanswerable in principle.
4. **Seed the audit log.** `clients/audit.ts:42`. The current empty-at-boot is defended by AC-437
   (*"one new entry per action"* is a delta, not a subtraction) — that is a **test** requirement and
   `resetAudit()` already serves it. An owner opening Activity should not be shown a first-run empty
   state on a product that has been running.
5. **Add an `export` member to `AuditAction` and emit it from all three export paths.**
   `exportReport` (`clients/reports.ts:392`), `DataTable`'s export (`DataTable.tsx:1209`) and the
   Activity CSV (`AdminActivityScreen.tsx:333`). The comment at `reports.ts:387` already argues the
   case; only the call is missing. This is question 4 in its entirety.
6. **Emit `permission.denied`.** Declared at `types/audit.ts:102`, written by nothing. The refusals are
   already computed and rendered in place, so the data exists at the moment of refusal — this is
   plumbing, and it restores the legacy's stated principle that *"a denial is itself a real security
   event"* (`:3120`).
7. **Put an audit strip on the records that matter.** Payout, escrow, deduction, wallet, plan, operator.
   `listAuditEntries({ subjectType, subjectId })` needs no new backend. This is where *"who touched this
   payout?"* actually gets answered — an owner investigating a payout is on the payout, not in a log.
8. **A permission → holders view, and a person → effective permissions panel.** The two directions the
   matrix does not serve. The delta must render **as a delta** (D17 AC-921), not flattened. Needs a
   design decision on shape before it can be specced — flagged, not assumed.
9. **Console-health tiles on Admin › Overview, and a badge that can fire.** Failing webhook endpoints,
   blocked sender domains, failed push broadcasts, keys never used, integrity last-run age. Give
   `admin-workspace` a badgeable count — it is `null` today and structurally cannot warn. Apply
   R4-10b's two clauses honestly: a webhook failing for three days is our own deadline, so `neutral` is
   probably right and the **count** is what has to exist.
10. **Fix the email `attention` count.** `EmailLogCard.tsx:143` counts a page and the header presents it
    against a total. One-line scope error; visible on the screen today.
11. **Fix `updatedBy: 'USR-1'`.** Four literals — `workspace.ts:164`, `:224`, `:256`,
    `securityPolicy.ts:128`. `retention.ts:109` shows the correct call. Provenance that names the wrong
    person is worse than no provenance.
12. **Put a `last changed · by whom` line on Admin › Policy.** Needs `updatedAt` / `updatedBy` on
    `OperationalPolicy` (`types/policy.ts:335`), which the legacy served from the audit log via
    `settingsLastUpdated()` (`:7335`).
13. **Delete or derive the two fabricated operator tiles.** `clients/metrics.ts:431`–`432` return `4.8`
    and `1.4`. A made-up productivity number on an oversight board is worse than an absent one — the
    same argument `AdminDataScreen.tsx:26` already makes about the removed backup card.
14. **Finish the `manage_settings` migration.** Three screens (`AdminCommunicationsScreen.tsx:76`,
    `IntegrityPane.tsx:149`, `RetentionCard.tsx:78`). Owner-only today by accident of a retired key.
15. **Bring the chat cap onto Operational Policy, or state that it is not configurable.**
    `presence.ts:70`. Today the permission key claims it and the screen does not carry it.

---

## Open questions

| # | Question | Who answers | What is blocked |
|---|---|---|---|
| Q1 | Does `before`/`after` go on `AuditEntry` as two opaque records, or as a typed `changes: FieldChange[]`? The second is diffable and translatable; the first matches the legacy. | mock-data-engineer, with product-designer on how a diff renders in a dense table | Ranked items 1 and 12. |
| Q2 | Is the audit log seeded, and how far back? Conflicts with AC-437's delta assertion unless the test resets. | mock-data-engineer | Ranked item 4. |
| Q3 | Does redacting values in the diff matter? `workspace.update` can carry a support phone number, and `clients/workspace.ts:170` deliberately logs field names only for that reason. If values are added, which fields are withheld and does the log say *"withheld"* rather than showing nothing? | product-designer + whoever owns PDPL posture | Ranked item 1 for `workspace.update` specifically. |
| Q4 | Should a permission-denial entry be visible to the operator who was denied, or only to `manage_team`? The Activity row is currently ungated (`routeTable.ts:930` — the only row with `viewPermission: null`). | product-designer | Ranked item 6. |
| Q5 | Is the concurrent-chat cap a policy field or a constant? D22 is cited by both `presence.ts:70` and `types/navigation.ts:150`, and they disagree. | product owner of D22 | Ranked item 15. |
| Q6 | What shape does a per-user permission delta take on screen? D17 AC-921 forbids flattening and does not name the control. | product-designer | Ranked item 8. |

**Handing off, not building.** This is an assessment; nothing in `src/` was changed. The write-ups in
§7 are ranked findings, not specs — items 1–7 each need a feature spec at
`docs/05-restructure/specs/admin-*.md` before anyone builds them, and items 1, 3 and 8 need the design
decisions in Q1, Q3 and Q6 settled first.
