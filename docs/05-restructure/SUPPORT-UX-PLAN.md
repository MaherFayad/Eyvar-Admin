# Support UX plan — one desk, six sub-tabs

> **Owner:** product-owner (scope and the open questions in §12) → product-designer (§8 and §9)
> → frontend-engineer. **Consumers:** mock-data-engineer (the seam changes in §3),
> api-contract-steward (`docs/07-api/`), i18n-arabic-engineer (about 120 keys across phases),
> qa-engineer and visual-qa-engineer (three new harnesses, two new test files).
>
> **Inputs.** A full read of `src/screens/support/**` (31 files, 10 721 lines), the five
> support clients and types, the route table, the support metrics board, the four legacy module
> docs (`13a`, `13b`, `13c`, `10a`, `10e`), `specs/02-work-queues.md`, `DECISIONS.md` D19 and
> D22, `design/11-conversation-composer.md`, `design/14-system-wide-ux-plan.md` §B5 and the
> 1280px page sweep in `docs/audit/PAGE-SWEEP.md`. Every finding below cites a file and line
> that was read, or the sweep's measurement. Nothing is quoted from memory.
>
> **Precedence.** `docs/RULINGS.md` governs. §8.4 (work queues, R5a) and §8.6 (the composer)
> bind every surface here. The Amplitude override applies to `/support/overview` and the
> captain-economics board only.

---

## 0. What this plan decides, in one screen

| # | Decision | Where |
|---|---|---|
| **S-1** | **A ticket becomes a work-queue row.** `Support › Tickets` moves from the P9 index (`DataTable` + two row actions) to the P8 contract the other four support queues already use: `QueuePage`, `OwnerChip`, `BreachBanner`, the R5a marker, `Claim / Release / Take over`, a decided-row conversion. One ownership model across the whole workspace. | §5.1 |
| **S-2** | **A ticket has three clocks, and they come from the SLA policy.** First response, resolution and the per-code recurring update, stamped at creation from `rcTargets(reasonCode)` and the tier defaults Admin › Policy already edits. Today a created ticket has `slaDueAt: null` and no runtime path ever sets `slaBreached`. | §3.1, §5.2 |
| **S-3** | **One thread per customer, not two.** `TicketMessage` folds into `Message`; a ticket linked to a conversation reads and writes that conversation's thread. Today `replyTicket` appends to `ticket.messages` and the linked conversation never sees it. | §3.2, §5.4 |
| **S-4** | **The ticket lifecycle is complete on screen.** Reopen, release, transfer, `Waiting on customer`, change reason code, change priority, and `Create ticket` (from the queue, from a conversation, from a profile) all exist as controls, disabled in place with a reason where refused. | §5.3 |
| **S-5** | **Support › Overview becomes the shift board.** Ticket figures return (`ticketsBreaching`, `promiseKept` — the store they waited on exists), the roster with presence and load moves here from the contact centre, and the dead `/support/contacts` drilldown is repointed. | §6.1 |
| **S-6** | **Availability moves to the top bar**, as D19 rules, and the concurrent-chat cap becomes a policy field under Admin › Policy › Limits (D22), read by `usePresence` instead of a constant. | §6.2 |
| **S-7** | **Disputes get a detail route** and the index stops carrying the claim's full sentence in a cell. The resolve modal keeps its job; the evidence and the claim move to `/support/disputes/:disputeId`. Lost & Found gets a terminal `unrecoverable` state and timestamps. | §5.6, §8.4 |
| **S-8** | **Safety and Fairness get a detail route each** (`F-2` in the spec, never landed), so the four-step protocol and the rationale stop living in a 168px lane and a `title` attribute. | §8.5, §8.6 |
| **S-9** | **Canned responses ship** (P5-T8) as one object with three uses: a chat reply, a ticket reply, an email body. Store: Admin › Communications › Templates, which already exists. | §7.3 |
| **S-10** | **Every refusal that is a `title=` today becomes text.** Fairness `Uphold / Overturn`, Safety `Close` and the protocol checkboxes carry their reason in a tooltip, which §11.2 and D17 clause 3 forbid. | §4 |
| **S-11** | **Phase 0 fixes seven defects first**, in one small change, before any of the above. | §4 |
| **S-12** | **Bulk disposition does not ship.** Bulk *claim* and bulk *reason-code* on tickets do, because §8.4 licenses a selection column only when every bulk action is a claim or assign act, and re-coding is assignment of a code, not a decision. The mass-event feature is an owner question (§12). | §5.5 |

---

## 1. What is there today — the inventory

Six sub-tabs under `/support`, declared at `src/data/fixtures/routeTable.ts:745-857`.

| Sub-tab | Pattern | Screen | Lines | Client | Tests | Harness |
|---|---|---|---|---|---|---|
| Overview | P5 metric board | `MetricBoardScreen` (shared) | — | `metrics.ts` | `metrics.test.ts` | `amp-dash.mjs` covers boards generally |
| Tickets | **P9 index** + P2 detail | `TicketsScreen` 397, `TicketDetailScreen` 672, `LogCallModal` 202 | 1 271 | `tickets.ts` | `tickets.test.tsx` (36) | none |
| Disputes | **P9 index** | `DisputesScreen` 610, `ResolveDisputeModal` 350 | 960 | `disputes.ts` | `disputes.test.tsx` (38) | none |
| Fairness | P5 + P8 | `FairnessScreen` 1 052 | 1 052 | `fairness.ts` | **none on the screen** (`workQueues.test.ts` covers the client) | none |
| Safety | P8 | `SafetyScreen` 901 | 901 | `safety.ts` | **none on the screen** | none |
| Contact centre | P8 + P2 | `ConversationConsoleScreen` 1 056, `ConversationPane` 1 071, `MessageComposer` 401, `PresenceBar` 277, `presence.ts` 250, `sla.ts` 284, `drafts.ts` 64 | 3 403 | `conversations.ts`, `realtime.ts` | `conversations.test.tsx` (~40) | none |

Three facts about the inventory decide the shape of this plan.

1. **Two ownership models coexist inside one workspace.** Fairness, Safety and Conversations
   carry the shared `Claim` contract (`WorkQueueRow.claim`, `liveClaim`, the 30-minute expiry at
   `src/screens/queues/queue.tsx:98`). Tickets and Disputes carry `ownerId / ownerName` with no
   expiry, no take-over, no release control on screen (`src/screens/support/tickets/TicketsScreen.tsx:236-270`,
   `src/screens/support/disputes/DisputesScreen.tsx:381-404`). §8.4's first rule — *exactly one
   ownership model MUST exist* — is broken across the support workspace.
2. **Two thread models coexist for one customer.** `TicketMessage` (`src/data/types/ticket.ts:7-14`)
   has no `visibility`, no `delivery`, no `channel`. `Message` (`src/data/types/conversation.ts:304-388`)
   has all three. `TKT-501 ⇄ CNV-104` are linked by id in both fixtures, and a reply on either
   side never reaches the other (`src/data/clients/tickets.ts:293-320` appends to `messages` only).
   The follow-up note at `types/ticket.ts:85-101` already says this must fold.
3. **The two biggest queues have no visual proof and one has no behavioural proof.** No harness
   under `scripts/harness/` targets a support route. Safety and Fairness have no screen test.
   A green suite proves nothing about a 168px lane holding four checkboxes and a button.

---

## 2. Findings, by the eight lenses the owner asked for

Each row is a defect or a gap. `Sev` is what it costs an operator on a shift: **A** loses work
or lies to a customer, **B** costs a click or a minute on every ticket, **C** is polish.

### 2.1 Ticket management

| # | Sev | Finding | Evidence |
|---|---|---|---|
| T1 | A | **A created ticket has no SLA.** `mintTicket` writes `slaDueAt: null, slaBreached: false` and nothing computes a due time from the reason code or the tier. Every ticket raised through `createTicket` or `createTicketForConversation` renders `No clock` forever. | `src/data/clients/tickets.ts:445-447` |
| T2 | A | **No ticket ever breaches at runtime.** `slaBreached` is a stamp (`§9.3`, correct) but no sweep, no client mutation and no realtime event writes it. Only `TKT-505` carries `true`, from the fixture. The queue's `Breached` reading is reachable only through seeded data. | `src/data/clients/tickets.ts` (no writer); `src/data/fixtures/tickets.ts:247` |
| T3 | A | **One clock where the policy defines three.** The rail card is titled *First reply* and reads `slaDueAt` only. Legacy stamped first-response, resolution and a per-code recurring update (`13a` §5.3); D22 says a ticket-backed conversation inherits `rcTargets(code).fr` **and** `.res`. There is no resolution clock on a ticket anywhere. | `src/screens/support/tickets/TicketDetailScreen.tsx:373-410`, `copy.ts:88-94` |
| T4 | A | **`Waiting on customer` has no setter, again.** Legacy gap `13a` §18.1 is reproduced: the status is in the union and the filter (`TicketsScreen.tsx:264`), and the only writer is a logged call with outcome `waiting-on-customer` (`tickets.ts:535`). An operator who has emailed and is waiting cannot say so. | as cited |
| T5 | A | **No `Reopen`, `Release`, `Transfer`, change-reason or change-priority on either ticket surface.** `reopenTicket` and `releaseTicket` exist in the client (`tickets.ts:257-275, 347-365`); `Reopen` is reachable only as the undo on a `Resolve` toast and from the ⌘K palette (`src/commands/tickets.ts`). A claimed ticket cannot be handed to a colleague. A mis-coded ticket keeps its wrong SLA for life. | `TicketsScreen.tsx:236-270`, `TicketDetailScreen.tsx:250-262` |
| T6 | A | **`Create ticket` exists nowhere on screen.** `createTicket` and `createTicketForConversation` are built and tested (`conversations.test.ts:88`); the conversation pane renders the button permanently disabled because no form collects category, reason code and priority. AC-947 is unmet. Legacy had `+ New ticket` in the page header (`13a` §3). | `ConversationPane.tsx:401-416`, `copy.ts:170-171` |
| T7 | B | **The `By reason code` view is the `all` view.** `views['by-reason-code'] = () => true`. It groups nothing and sorts nothing. | `src/data/clients/tickets.ts:157` |
| T8 | B | **No `Mine` view on Tickets** while Conversations, My Work and every other queue have one. An agent finds their own tickets by scrolling for their name in a secondary line. | `routeTable.ts:770-776` |
| T9 | B | **Reason codes on tickets are a second vocabulary.** Fixtures mint `fare_dispute`, `lost_item`, `captain_absence`, `app_issue`, `payout_blocked`; the registry and every other queue use `CAP_LATE`-style codes. `VOCABULARY_EN` special-cases the five (`copy.ts:178-182`) so they render, but `Ticket.category` is a free string (`Billing`, `Operations`, `Assurance`, `Technical`) with no relation to the registry's eleven categories or its `owner` team. Nothing can roll a ticket up to a root-cause owner. | `src/data/fixtures/tickets.ts:29-30, 65-66, 128-129, 165-166, 239-240` |
| T10 | B | **Claim on a ticket has no expiry and no take-over.** An agent who claims at 02:00 and leaves holds the ticket until somebody resolves it. Every other support queue frees a stale claim at 30 minutes. | `tickets.ts:226-250` vs `queue.tsx:98` |
| T11 | B | **No audit line for claim, reply, resolve.** Legacy gap `13a` §18.10 is reproduced; only Disputes writes a ledger posting. Admin › Activity cannot show who resolved what. | `tickets.ts` (no audit call) |
| T12 | C | **The ticket fixture contradicts the rider fixture.** `TKT-501` names `RDR-1041` *Mohammed Al-Ghamdi*; `riders.ts:53` names the same id *Nora Al-Harbi*. Flagged in D19 and in `11-conversation-composer.md` F-8; still present. Two support screens disagree in front of a customer. | `src/data/fixtures/tickets.ts:26-27`, `src/data/fixtures/riders.ts:53-54` |

### 2.2 Team management

| # | Sev | Finding | Evidence |
|---|---|---|---|
| M1 | B | **Availability lives on the contact-centre page, not the top bar.** D19: *"set by the operator from the top bar"*. An agent working tickets all morning is `online` to nobody and auto-away never fires (`useAutoAway` runs only while the console is mounted). | `PresenceBar.tsx:18-24`, `presence.ts:104-108` |
| M2 | B | **The roster is only visible inside the contact centre**, and shows `activeCount` across all channels, which is not the cap's predicate. A supervisor looking at Support › Overview cannot see who is on, who is at cap, who holds what. | `PresenceBar.tsx:224-277`, `presence.ts:21-41` |
| M3 | B | **The chat cap is a constant.** D22 puts it in Admin › Policy › Limits, default 3, range 1–8 per role. `SafetyLimits` has no such field. `CONCURRENT_CHAT_CAP_DEFAULT = 3` is read directly. AC-969 is unverifiable. | `presence.ts:56-72`, `src/data/types/policy.ts:329` |
| M4 | B | **Admin › Team knows nothing support-specific.** Roster, invite, suspend, sessions, security policy, on-call rota — all present (`AdminTeamScreen.tsx`) — but no per-operator load, no cap, no view of what a support operator holds, no shift. The on-call rota exists and nothing in Support reads it; legacy breach notifications named `onCallName('primary')` (`13a` §5.6). | `src/screens/admin/team/AdminTeamScreen.tsx:60-80` |
| M5 | C | **Two support operators in the fixture, one of them never signed in.** `USR-3` active, `USR-4` invited. Any roster, transfer target list or load view is exercised against one real peer. | `src/data/fixtures/teamUsers.ts:66-100` |

### 2.3 Everyday operations (the shift)

| # | Sev | Finding | Evidence |
|---|---|---|---|
| O1 | A | **A breach notifies nobody.** Legacy's `slaSweep` pushed one ops notification per breach kind, naming the on-call primary (`13a` §5.6). The rebuild has a breach *stamp* on Safety, Fairness and Conversations (from fixtures) and a page banner, but no sweep, no notification and no audit entry at the crossing. §8.4.3's *"a breach MUST fire its escalation exactly once, at the crossing"* has no implementation. | `src/data/fixtures/notifications.ts:38-46` is a seeded ticket notification, not a breach |
| O2 | B | **Nothing says "next".** Every queue lands on its default view sorted by deadline, which is right, but an agent finishing a chat has to go back to a list and read it. There is no `Take next` control on any queue and no palette command for it. | `src/commands/tickets.ts:281-293` lists three commands, none of them `next` |
| O3 | B | **Support › Overview shows nothing about tickets or chats.** Eight metrics: two safety, two contact-log (both empty), two fairness, a safety first-response median and a repeat-contact rate whose drilldown is `/support/contacts`, a route that does not exist. The header comment says the two ticket metrics were withheld because *"there is no `fixtures/tickets.ts`, no `types/ticket.ts` and no ticket client"* — all three exist now. | `src/data/fixtures/metrics.ts:2299-2305, 2326-2600, 2595` |
| O4 | B | **A logged call is on the ticket and nowhere else.** `phone` conversations are real rows (`CNV-106`) and call logs are `TicketCallLog[]`. A call logged on a ticket does not become a message on its phone conversation; a phone conversation's notes do not appear on the ticket timeline. Two records of one call. | `tickets.ts:495-530`, `ConversationPane.tsx` (no call log read) |
| O5 | B | **No handover.** Transfer on a conversation posts an internal note (good, AC-941). Tickets have no transfer at all, and nothing at shift end lists what an operator still holds. `Going offline does not release the conversations you hold` is stated (`copy.ts:150`) and then nothing helps the operator act on it. | as cited |
| O6 | C | **Snooze is a view with no verb.** `snoozed` is a status, a view and a rail line; no control snoozes a conversation and the client has no `snoozeConversation`. | `conversations.ts:282`, `ConversationConsoleScreen.tsx:481-505` |

### 2.4 Ease of use

| # | Sev | Finding | Evidence |
|---|---|---|---|
| E1 | B | **Three refusal carriers are tooltips.** Fairness `Uphold / Overturn` (`FairnessScreen.tsx:942-955`), Safety `Close` (`SafetyScreen.tsx:839-849`) and the protocol checkboxes (`:818-824`) put their reason in `title=`. §11.2, D17 clause 3 and `MessageComposer.tsx:365-367` all say *never a tooltip*. Keyboard and touch users never see why. |
| E2 | B | **The ticket detail's primary cannot state its refusal.** `PageAction` carries `disabled` and not `reason` (`components/PageHeader.tsx:67`); the screen reports it in a comment and works around nothing. Every detail page in Support is affected once S-4 adds more header actions. | `TicketDetailScreen.tsx:225-238` |
| E3 | B | **No canned responses.** P5-T8 is the plan's own *"largest single throughput lever in the phase"*. The template store exists (`src/screens/admin/communications/MessagingTemplatesCard.tsx`, `clients/index.ts:848-870`) and no composer reads it. | `OPERATOR-EXPERIENCE-PLAN.md:231` |
| E4 | B | **The requester's other records are one overlay away.** The ticket rail shows name, id and `Open 360° profile`. `RiderSupportPresenceCard` (seven counts) and `DriverSupportPresenceCard` (nine) exist on the profile and are not on the ticket, the conversation pane or the dispute. An agent deciding a fare dispute cannot see the rider has two open tickets and a lost-item report without leaving. | `TicketDetailScreen.tsx:484-509`, `src/screens/entity/RiderSupportPresence.tsx` |
| E5 | C | **Two detail idioms in one workspace.** Tickets and Conversations are full pages; Disputes is a modal; Safety and Fairness have no detail at all and open the *party's profile overlay* from the identity cell (`SafetyScreen.tsx:548-557`). `14-system-wide-ux-plan.md` C3 names this: *the operator cannot predict what clicking a row does*. |
| E6 | C | **A fourth navigation level on Fairness.** In-page `<Tabs>` for the economics view (`FairnessScreen.tsx:428-440`), which C10 in the same plan says to convert. |

### 2.5 Data hierarchy

| # | Sev | Finding | Evidence |
|---|---|---|---|
| H1 | B | **The ticket row is 77–93px against 49–53 on a single-line index.** Subject wraps, the category cell carries the reason sentence, the status cell carries the owner. Three secondary lines per row; `19-execution-log.md` calls it *"a hierarchy decision, not a width tweak"* and leaves it. Three rows fill 221px of a 606px box: **385px of white, the worst in the app** (sweep 3.9). | `TicketsScreen.tsx:196-210`, `PAGE-SWEEP.md` 3.9 |
| H2 | B | **Fairness carries 336px of em dashes.** `Deadline` and `Owner` are `Absent` on every decided row — 16 of 17 in the sweep — while the banner counts two breaches the columns cannot show. 32% of the table width carries one value. | `FairnessScreen.tsx:856-889`, sweep 3.4 |
| H3 | B | **Disputes is the densest page in the product** (6 631 characters, 17 type ranks): `What is claimed` renders the claimant's full sentence at 12px grey in a cell. The table is doing the detail's job because there is no detail. | `DisputesScreen.tsx:224-227`, sweep 3.27 |
| H4 | B | **Safety's working cell is 168px** holding four checkboxes and a `Close` button, with the summary floored at 152px to pay for it. The comment says so. A protocol step's name is reachable only by hovering a box. | `SafetyScreen.tsx:502-515, 716-856` |
| H5 | C | **The conversation queue's `Owner` column is `Unclaimed / Claim` on every row of the default view** — by construction, since the default view is Unassigned. 176px restating the tab. | sweep 3.28, `ConversationConsoleScreen.tsx:927-999` |
| H6 | C | **Support › Overview headlines an em dash.** Two of eight tiles have `—` as the 28px value; five of eight show no number. The board's most prominent element says nothing. | sweep 3.22, `metrics.ts:2379-2457` |

### 2.6 Visual design

| # | Sev | Finding | Evidence |
|---|---|---|---|
| V1 | B | **Tab strips clip at 1280.** Tickets 34px (five tabs), Fairness 64px (*"…sion appeals"*). The first tab's label is cut at its leading edge. | sweep 3.9, 3.4, `docs/audit/shots/support-fairness-top.png` |
| V2 | B | **Horizontal clip on Tickets: 140px** (`clientW 1038 / scrollW 1178`). The body scrolls sideways, which the harness rule forbids. | sweep 3.9 |
| V3 | C | **Critical and High share one tone** on tickets and safety (`tone.ts:28-29`, `SafetyScreen.tsx:460-466`). Deliberate under R7/R4-10 and recorded; the top triage distinction is carried by the word alone. The sweep's audit C calls this a loss; `17-reconciled-findings.md:107` upholds the rule. Kept, and §8 adds the second carrier R4-10 permits: the clock's order and the marker. |
| V4 | C | **Two safety chips read amber on an unanswered SOS** (severity + status). Intended under R17 (`SafetyScreen.tsx:631-648`). Kept. |
| V5 | C | **Empty white under short tables** — Tickets 385px, Safety 166px. The box is sized to a page, the data to a fixture. A density problem the harness must measure, not a fixture problem to paper over. | sweep 3.9, 3.12 |
| V6 | C | **Decision meta truncates** (`Yousef Al-Balawi · 18 M…`) and `Suspension reason` truncates identically on every row, so four distinct values read as one. | sweep 3.4 |

### 2.7 Business

| # | Sev | Finding | Evidence |
|---|---|---|---|
| B1 | A | **The SLA policy Admin edits reaches no ticket.** `SlaTierDefaultsCard` and `SlaQueueGridCard` edit tier defaults and per-queue overrides; `ReasonCodesCard` edits the registry with per-code targets. `tickets.ts` reads none of it. The product's promise to customers is configurable and unenforced. | `src/screens/admin/policy/SlaPolicyCards.tsx:1-33`, `tickets.ts:445` |
| B2 | A | **The compensation ceiling is not on the surfaces that spend money.** `TeamUser.compensationCapHalalas` exists (100 SAR for Support, `teamUsers.ts:79`) and legacy's reason codes carried a per-scenario `comp` cap (`13a` §4.4). `ResolveDisputeModal` caps at the claim amount only (`:151-156`); a goodwill credit has no ceiling but the claim. | as cited |
| B3 | B | **Contacts per 1 000 trips and the uncoded share are `awaitingStore: 'contact-log'`.** Legacy's whole CPT page (`13c` §1) — *"support volume is a product signal, not a staffing input"* — has no store behind it. The reason-code registry carries `owner` per code and nothing rolls contacts up to it. | `metrics.ts:3185-3193`, `13c` §5 F1 |
| B4 | B | **CSAT does not exist.** Legacy sent a survey on close (`13a` §7.2). No field, no metric, no email template. The overview cannot answer *"are customers satisfied"*. | `13a` §7.2; `src/data/types/ticket.ts` (no field) |
| B5 | B | **Repeat-contact rate has a tile and no definition in the data.** Its drilldown is a dead route. | `metrics.ts:2572-2595` |
| B6 | C | **Dispute outcomes reach the ledger; ticket resolutions reach nothing.** Fine for money, but *"resolved on the call"* versus *"escalated"* is the cheapest quality signal the desk has and it is written to `callLogs` only. | `tickets.ts:524-541` |

### 2.8 Experience (operator and customer)

| # | Sev | Finding | Evidence |
|---|---|---|---|
| X1 | A | **A customer with a ticket and a chat gets two conversations.** See §1 item 2. The operator answering on the ticket does not see the chat reply their colleague sent four minutes ago. |
| X2 | B | **A phone conversation cannot be worked.** `phone` is read-only in v1 by D19; the composer offers a note register only. Correct — but there is no `Log a call` on the conversation pane, so the honest path (log it on the ticket) requires a ticket to exist, and T6 says one cannot be created. |
| X3 | B | **Delivery honesty stops at the conversation.** A ticket reply has no delivery state, so *"Sent to Email"* toasts on a reply that may bounce (`TicketDetailScreen.tsx:197-199`). The conversation thread already renders `Not delivered — no email address on file`. |
| X4 | C | **The operator is told the 30-minute claim expiry in a `title`** on the owner chip (`queue.tsx:243`, AC-207). Same carrier problem as E1, in the shared layer. |
| X5 | C | **Arabic is complete on every support dictionary** (`tickets` 114/110, `conversations` 164/164, `disputes` 112/104, `fairness` 63/63, `safety` 56/56 — the surplus is the six CLDR plural forms). No gap; every new key in this plan needs its Arabic in the same commit. |

---

## 3. What the data layer cannot say today, and what it must

Seam changes are listed first because every phase below reads them. All are additive and
nullable; `docs/07-api/` is regenerated once per phase.

### 3.1 Ticket SLA, stamped from policy

`Ticket` gains the `SlaTracked` block the other queues already carry (`types/workQueue.ts`):
`slaStartedAt`, `slaDueAt`, `slaTargetMinutes`, `slaBreachedAt`, `firstResponseDueAt`,
`firstResponseAt`, `firstResponseBreachedAt`, `slaSource`, plus `updateDueAt: IsoDateTime | null`
and `pausedSinceMs`-shaped fields as `pausedAt: IsoDateTime | null`, `pausedMinutes: number`.

`mintTicket` computes all three from `resolveReasonCode(code)` and the tier defaults
`clients/policy.ts` serves; `slaSource: 'legacy-reason-code'`. `slaBreached: boolean` stays as
a derived alias for one release so the two screens keep rendering, then goes.

A **breach sweep** in the data layer: mock mode advances it from `useTick` exactly as
`advanceRealtime` does (`ConversationPane.tsx:237-240`); http mode is a server property. It
stamps `firstResponseBreachedAt` / `slaBreachedAt` once, writes one audit entry and one
notification per crossing, batched per tick (§8.4.3). Notification `route` is the ticket's
detail path; `title` names the on-call primary from `getOnCallRota`.

### 3.2 One thread

`TicketMessage` is removed. `Ticket.messages` becomes a read-only projection of the linked
conversation's customer-visible messages plus call logs, or `[]` when `conversationId` is null.
`replyTicket(id, body)` becomes `replyConversation(ticket.conversationId, …)` and is refused with
`no_channel` when there is none — which is the refusal the composer already renders in words.
`conversationId: string | null` and `channel: ConversationChannel | null` become **required**,
closing the follow-up at `types/ticket.ts:85-101`.

Call logs fold the other way: `logTicketCall` posts an `internal` message carrying a typed
`callOutcome` onto the phone conversation (creating one when the ticket has none), so a call is
one record read from both surfaces (O4).

### 3.3 Ticket lifecycle operations

New or surfaced: `setTicketStatus(id, 'waiting' | 'in-progress')` (pause bookkeeping for
`waiting` when the tier's `pauseOnCustomer` is true, and never for `DRV_SUSPENSION_APPEAL`
codes per Q-81), `transferTicket(id, toUserId, { note })` mirroring `transferConversation`,
`recodeTicket(id, reasonCode)` re-deriving category, priority and the three clocks and clearing
breach stamps as legacy did (`13a` §5.1), `setTicketPriority(id, priority)`. `claimTicket` moves
onto the shared `Claim` contract with the 30-minute expiry; `ownerId/ownerName` become a
projection of `liveClaim(claim)`.

### 3.4 Presence and the cap

`SafetyLimits` (or a new `SupportLimits` on the same policy document) gains
`maxConcurrentChatsByRole: Record<RoleName, number>` default 3, range 1–8. `usePresence` reads
it. `AgentPresence` gains `liveChatCount` (D22's predicate) beside `activeCount` so the roster
and the cap read one number each. `setMyPresence` is callable from the shell.

### 3.5 Disputes, Lost & Found, Safety, Fairness

`createDispute`, `createLostFoundItem` (legacy gaps `13b` §18.1-2 — a rider claim cannot enter
the system today), `LostFoundItem.status` gains `unrecoverable` and the item gains
`transitions: { to, at, byUserName }[]` (the client already records when a transition happened,
`disputes.test.tsx:429`). `createSafetyIncident` with `source: 'escalated-ticket' | 'sos' |
'report'` (spec §8.3 carries the enum). Fairness needs nothing new for §8.

### 3.6 Metrics

`support.overview.ticketsBreaching` and `support.overview.promiseKept` are computed from the
ticket store that now exists (`metrics.ts:2299` is stale). `repeatContactRate` is defined as
*conversations opened by an entity with a conversation closed in the prior 7 days ÷ conversations
opened*, and its drilldown becomes `/support/contact-centre`. `contactsPerThousandTrips` and
`uncodedContactShare` read the conversation store keyed by `ticketId → reasonCode`, so they stop
being `awaitingStore` the moment tickets are created from conversations.

---

## 4. Phase 0 — seven defects, one change, before anything else

Small change, one agent, no spec. Typecheck, `test:changed`, and a Playwright capture of
`/support/tickets`, `/support/fairness` and `/support/safety` at 1280 before and after.

| # | Fix | Files |
|---|---|---|
| 0.1 | `TKT-501` requester name matches `RDR-1041` (T12). | `src/data/fixtures/tickets.ts:26-27` |
| 0.2 | `repeatContactRate.drilldownRoute` → `/support/contact-centre` (O3). | `src/data/fixtures/metrics.ts:2595` |
| 0.3 | The three `title=` refusals become rendered text with `aria-describedby`, using the `rowActions.tsx` construction already in the product (E1, S-10). On Safety the reason renders once beneath the lane, not once per checkbox (§8.6.8). | `FairnessScreen.tsx:936-960`, `SafetyScreen.tsx:806-852` |
| 0.4 | `PageAction` gains `reason?: string \| null`, rendered beneath the header primary exactly as `RowAction` renders it (E2). Shell-owned file; one field, one construction. | `src/components/PageHeader.tsx:67` |
| 0.5 | Tab strips stop clipping: the `IndexToolbar` view list gets `min-w-0` and overflow scrolling with the first tab never cut, and Tickets' five tabs become four (`by-reason-code` goes — T7; it returns as a *group-by* in §5.1, not a tab). | `src/components/table/IndexToolbar.tsx`, `routeTable.ts:770-776` |
| 0.6 | Tickets stops scrolling sideways at 1280: `subject.minWidth` 240 → 200, `rowActionsWidth` 200 → 176 and the row actions become two labelled controls at `xs` (V2). Measured with `table-density.mjs`. | `TicketsScreen.tsx:180, 462` |
| 0.7 | Fairness decided rows stop drawing two `Absent` cells: `Deadline` shows the decided-late word or the date decided, `Owner` shows who decided (the `DecisionBadge` already has both) — or the two columns move behind the column control on the three case views and `Decision` widens to 336px (H2). Designer's call in §8.6; the interim is the first. | `FairnessScreen.tsx:849-890` |

---

## 5. Phase 1 — Ticket management

The largest phase and the one every other depends on. Product-owner spec → product-designer →
frontend-engineer → qa and visual-qa in parallel. Worktree `support/tickets`.

### 5.1 The queue (S-1)

`TicketsScreen` is rebuilt on `QueuePage` + `QueueTable`, the same composition Safety uses.

**Views**, in the route table (`views()` at `routeTable.ts:770`): `Unassigned` (default — §4.6
Q-32, the open work nobody holds) · `Mine` · `Open` (all live, any holder) · `Waiting` · `Done`
(resolved ∪ closed). Default sort `slaDueAt asc`, breached first, `No clock` last (AC-217).

**Columns at 1280**, in this order, and the budget:

| Column | Width | Content | Notes |
|---|---|---|---|
| Ticket | `minWidth 200` | `SubjectIdentity`: subject as the title, second line `{requester} · {reason label}` — ONE key | The id moves behind the column control; a `TKT-505` in a 104px mono cell is what H1 spends its first column on |
| Priority | 96 | word badge, `Critical/High` warning, `Medium` info, `Low` plain text (D-21: a resting value is text) | unchanged tones (V3) |
| Status | 120 | `Open · In progress · Waiting on customer · Resolved · Closed` | the owner leaves this cell |
| Clock | 136 | `SlaCell` — the *running* promise, chosen by `runningClock` exactly as Conversations does (`sla.ts:230-253`): first response until answered, then resolution; the status badge says which | AC-211, AC-303 |
| Owner | 176 | `OwnerChip` — Claim / yours · release / theirs · take over, 30-minute expiry | S-1 |
| Actions | 176 | `Resolve` (D18: no confirm, undo on the toast — kept from today), `Open` as the row click | `Reopen` renders on a done row in place of `Resolve`, disabled with its reason on a live one |

Sum: `200 + 96 + 120 + 136 + 176 + 176 = 904`, inside the 1038 the sweep measured for the
table. Behind the column control: `Ticket id`, `Category`, `Channel`, `Opened`, `Reason code`
(the raw code, for the engineering handoff, `font-mono`).

**Row pitch returns to one line plus one secondary** (49–53px, R20), because the subject is the
title and the reason sentence is its second line; nothing else on the row carries a second line.

**Banner**: `BreachBanner` counting live tickets with either stamp, with the `Show only breached`
scope (R5a a). **Row marker**: `RowCriticalMarker` on either breach (R5a b). **Pill** reads
`overdue 14m` in words (R5a c).

**Group by reason code** replaces the dead view: a `DataTable` group-by on `reasonCode` under
the `Filter` control, rendering a sticky group header `{reason label} · {count}` (the table
layer needs a `groupBy` prop; table-density-engineer owns it — see §11).

**Bulk (S-12)**: a selection column appears only on the `Unassigned` and `Open` views and offers
exactly `Claim selected` and `Change reason code…`. No bulk resolve.

### 5.2 Three clocks (S-2)

The rail's SLA card becomes *Promises*: three rows — `First reply`, `Resolution`, `Next update`
(only when the code sets `upd`) — each a `SlaCell` with its due date, and one sentence beneath
per §9.3's three readings (running · breached-with-date · stopped-with-status). `Waiting on
customer` renders `Paused since {date}` on the resolution row and the pill reads `paused`, with
the first-reply row never pausing (`13a` §5.3, `pauseOnCustomer` applies to resolution only).

### 5.3 The complete lifecycle on screen (S-4)

On the detail page header: primary by precedence, exactly as the conversation pane does it
(`ConversationPane.tsx:368-418`):

1. not held by me → `Claim` / `Take over`
2. held by me, live → `Resolve`
3. done → `Reopen` (header primary, §3.5's rule for a closed record)

Secondaries: `Transfer…` (choice of online/away operators, required note posted as an internal
message — the conversation's dialog reused verbatim, AC-941/942), `Waiting on customer` /
`Resume` (toggle, no confirm, reversible), `Change reason code…` (a `ConfirmDialog` with one
`choice` from `listReasonCodeOptions('ticket')`, body stating the new clocks in words before
commit — §8's derived-value rule), `Change priority` (segmented, no confirm), `Log a call`.
Every one renders for every operator and every status, disabled in place with its reason.

`Create ticket`:

- A page-header primary on the queue: `New ticket` → a modal collecting requester (typeahead over
  riders and captains, `SubjectIdentity` result rows), reason code (the registry picker with
  search — legacy's `reasonSelectHTML`, one picker, no shared hidden id), priority (pre-filled
  from the code's tier, editable), subject, first message (optional), channel (`chat · email ·
  whatsapp · phone`, required — `types/ticket.ts:59` says never default it, so the field is
  required rather than guessed).
- On the conversation pane, the same modal with requester and channel pre-filled and locked,
  calling `createTicketForConversation` (AC-947, T6).
- On the 360° profile's support presence card, `Raise a ticket` with the requester locked.

### 5.4 One thread (S-3)

The ticket detail's *Conversation* card is replaced by the conversation pane's thread and
composer (`MessageRow`, `MessageComposer`) reading the linked conversation. A ticket with no
conversation renders the first-run empty (`ticket.thread.empty.*`, kept) and a composer whose
refusal is `ticket.reply.blocked.noChannel` (kept). `Reply by email`, internal notes, delivery
words and `Send again` arrive on tickets for free (X3). The call-guide card and the rail stay.

### 5.5 Audit and notifications

Every lifecycle operation writes an `AuditEntry` (`clients/audit.ts`) with actor, ticket id and
the change. The sweep in §3.1 writes `sla_breach` and one notification per crossing. Admin ›
Activity gains a `Support` filter for free because the entry carries `entityType: 'ticket'`.

### 5.6 Disputes and Lost & Found (S-7)

- Route `/support/disputes/:disputeId` (`DetailRoute`, kind `dispute`): `DetailPage` with the
  claim in the claimant's words, the evidence list, the trip link and the linked ticket in
  `main`; verdict, amount and note in the rail's *Decide* card — the modal's form, in place. The
  modal stays for the queue's `Resolve` row action.
- The index's `What is claimed` cell becomes `{kind}` title + a *truncated* first line with the
  full sentence on the detail (H3). Row pitch returns to two lines.
- Ownership moves onto `Claim` (S-1). `Take claim` becomes `OwnerChip`.
- Lost & Found: `unrecoverable` terminal state with its own row action and confirm (an item nobody
  will find is a decision, so it confirms); `transitions[]` rendered as the row's history line;
  `reportedAt` drives a `No clock` pill until the owner sets a promise (§12 Q-S3).
- `New claim` and `New report` page-header primaries with the requester typeahead from §5.3.

### 5.7 Tests and proof

- `tickets.test.tsx` grows one test per criterion in §11 (AC-S-01 … AC-S-24).
- New harness `scripts/harness/support-tickets.mjs`: captures `/support/tickets` at 1280 in
  both languages, asserts no horizontal scroll, row pitch ≤ 56px, the first tab label fully
  visible, and the breach marker present on `TKT-505`.
- `table-density.mjs` run against the new columns.

---

## 6. Phase 2 — Team management and the shift

Worktree `support/desk`. Depends on §3.4 and on Phase 1's queue for the ticket counts.

### 6.1 Support › Overview becomes the shift board (S-5)

The board keeps its metric-board idiom (Amplitude outranks `DESIGN.md` here) and gains one
component above the chapters: **the desk**.

```
┌ Your availability  [Online ▾]   2 of 3 live chats   Auto-away after 10 min ────────────┐
│ On shift now                                                                             │
│  Lina Al-Otaibi   Online  · 2 chats · 4 tickets · next due 12m        Transfer to…      │
│  Noura Al-Fahad   Offline · has not signed in                                            │
│ On call: Yousef Al-Balawi (primary) · until 18:00                                        │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- One row per operator with `view_support`: presence word + tone (R7's three), live chats
  against the cap, tickets held, the soonest deadline they hold, and a `Transfer to…` that opens
  the transfer dialog with the target pre-chosen — so a supervisor redistributes from here.
- The on-call primary from `getOnCallRota`, which nothing in Support read (M4).
- Lead figures, in this order: `ticketsBreaching` (safety outranks load, so
  `unacknowledgedCriticalIncidents` stays first if non-zero), `promiseKept`,
  `medianTimeToFirstResponse` **across tickets and chats**, `openIncidents`. Chapters:
  *Answering* (tickets, chats, first response), *Deciding* (disputes, fairness, overturn),
  *Why they call* (contact reasons, uncoded share, repeat contact) — the last chapter now has a
  store once §3.6 lands.
- `drilldownRoute` on every tile lands on the view that explains it.

### 6.2 Presence in the top bar (S-6, M1)

`TopBar` (shell-owned) gets the availability control: a `Select` with the three words, the cap
counter beside it, the same `usePresence` hook lifted to `src/hooks/usePresence.ts` with
utilities-engineer. `useAutoAway` runs at the shell so it fires on any page. `PresenceBar` on
the contact centre shrinks to the roster only (M2), and the roster also renders on the desk.

### 6.3 The cap as policy (M3)

`Admin › Policy › Limits` gains *Concurrent chats per operator* as one number field per role
(`Support`, `Ops Manager`; Owner exempt and stated as such), bounds 1–8, on the same draft and
save bar as the SLA grid. `usePresence` reads it; AC-969 becomes verifiable.

### 6.4 Handover (O5)

- Going `offline` from the top bar lists what the operator still holds — chats and tickets —
  with one control per row (`Release` / `Transfer to…`) and a `Go offline anyway` secondary. Not a
  confirm on presence (D18 has nothing to say; it is a form): a dialog whose primary is the
  transfer, whose secondary is the exit.
- `My Work` already projects tickets; it gains `Handed to me` as a scope (items whose latest
  `ClaimTakeover.toUserId` is me, unread), so a transferred ticket is found without a search.

### 6.5 Next (O2)

`Take next` as a page-header secondary on Tickets, Conversations and Disputes, and as a palette
command `ticket.next` / `conversation.next`: claims the first row of the `Unassigned` view under
the default sort and opens it. Refused at the cap with the number; refused when the view is empty
with the cleared sentence.

### 6.6 Tests and proof

- `desk.test.tsx`: the roster reads the seam, the transfer from the desk lands on the record,
  the cap comes from policy, the on-call primary renders.
- `presence.test.tsx` moves with the hook.
- Harness `support-desk.mjs`: the desk at 1280, both languages, both themes.

---

## 7. Phase 3 — Ease of use

Worktree `support/ease`. Independent of Phase 2; depends on Phase 1's thread (S-3) for 7.3.

### 7.1 Context in the rail (E4)

`RiderSupportPresenceCard` / `DriverSupportPresenceCard` render in the rail of the ticket, the
conversation and the dispute detail as *Elsewhere in the console*, each line a link to that
queue filtered to the entity. Read-only, §7.2.

### 7.2 One detail idiom (E5)

Every support record opens as a page with a back arrow and the queue's search string carried
(AC-10, as Conversations does at `ConversationConsoleScreen.tsx:360-371`). Rows: click opens;
`Claim` is a separate control (AC-200). The profile overlay is reached from the rail, never from
the row's identity. Safety and Fairness detail routes are §8.5–8.6.

### 7.3 Canned responses (S-9, E3)

- `MessagingTemplatesCard` (Admin › Communications) is the store; a template gains
  `surfaces: ('chat' | 'ticket' | 'email')[]` and a `reasonCode | null` hint.
- The composer gains `Insert template…` as a third control on its row: a `Command`-style list
  filtered by the conversation's reason code first, then all, with variable preview
  (`renderEmailPreview` already exists). Inserting fills the field; nothing sends. §8.6.4 holds.
- ⌘K: `template.insert` when a composer is focused.

### 7.4 Keyboard

`j / k` move the focused row on every support queue (the `DataTable` already owns the roving
focus), `c` claims, `Enter` opens, `Esc` back to the queue. Stated once in a `?` sheet the
shell already has. Accessibility-auditor signs it.

### 7.5 Search

The queue search on Tickets already matches id, subject, requester, reason code
(`tickets.ts:114`). It gains the requester's phone and the linked conversation id, because a
caller reads their number and the agent types it.

---

## 8. Phase 4 — Data hierarchy and visual design, per screen

Product-designer writes `docs/05-restructure/design/22-support-hierarchy.md` from these moves;
visual-qa-engineer verifies against the three harnesses. Every move is measured before and
after at 1280; the numbers here are the sweep's.

### 8.1 The three constants

1. **One tone-filled badge per row, in the status column**, plus the SLA pill as the licensed
   extra (H7 in `queue.tsx:243-270`). Priority `Low`, severity `Normal`, presence `Offline` and
   owner `Unclaimed` are words, not chips.
2. **A row is one title and one secondary line**, 49–53px. Anything third goes behind the
   column control or to the detail.
3. **An absence is a word, once.** `No clock`, `Nobody has taken this`, `No reason on record`.
   Two `—` cells in one row is a column that should not be on the view.

### 8.2 Tickets

Described in §5.1. Visual deltas: the id leaves the first column; category and channel leave the
row; the row marker and the pill arrive; the tab strip fits. Target: 3 rows fill 160px, not 221;
the empty white beneath is the fixture's, and the harness asserts the *box* shrinks to content
plus the pagination row rather than to a viewport (V5 — a `DataTable` change, table-density
engineer).

### 8.3 Ticket detail

Two columns, `DetailPage`. Main: the call guide (kept, muted ground), then the thread with the
composer at the foot (§8.6.1). Rail order: *Promises* (three clocks), *Ticket* (status,
priority, reason label over code, channel, opened, owner + Claim), *Requester* (name, id,
`Elsewhere in the console`, `Open 360° profile`). The header carries subject as title, meta
`{id} · {requester} · {reason label}` — the category word goes, it never meant anything the
reason did not.

### 8.4 Disputes

Index: `Claim` (id + kind) · `Parties` · `Claimed (SAR)` · `Status` (+ verdict line on decided)
· `Verdict due` · `Owner` · actions. The claimant's sentence leaves the row (H3). Detail route
per §5.6. The `Verdict` extra filter stays.

### 8.5 Safety

- Route `/support/safety/:incidentId` (`F-2`, S-8). Main: the summary, the party, the trip (or
  *not on record*), the four-step protocol as a checklist with each step's name, notes and who
  ticked it, and `Close incident` beneath it with the count of outstanding steps as text (0.3).
  Rail: *Promises* (acknowledge, resolve — both, with the running one first), *Owner*, *Party*.
- The queue's `Protocol` lane becomes a `2 of 4` word plus the marker, 96px; `Close` leaves the
  row for the detail. Summary regains its 176px floor (H4).
- `critical-sos` view renamed `critical`, `all` view added (spec §8.9, never landed).
- Severity: `Critical` and `High` stay one tone with the word as the carrier (V3, R4-10). The
  second carrier R4-10 permits is the clock's order — a critical incident's acknowledge window is
  shorter, so it sorts first by construction — and the harness proves an unanswered `Critical`
  SOS is the first row.
- Precautionary suspension ships only with its lift (`liftPrecautionarySuspension`) in the same
  change, per the screen's own refusal to recreate F-19.

### 8.6 Fairness

- Route `/support/fairness/:caseId`. Main: what is contested (the rating with its recompute
  sentence, the suspension reason in full — V6), the captain's timeline excerpt, the rationale
  once decided. Rail: *Promise*, *Owner*, *Captain*.
- The economics view leaves the in-page `<Tabs>` (E6): it becomes the fourth view in the
  `IndexToolbar` segmented control like every other sub-tab, with `QueueTable` unmounted.
- Decided rows: `Deadline` reads `Decided {date}` / `Decided late`, `Owner` reads who decided.
  No `Absent` on a decided row (H2).
- The rationale is text on the detail and the first 60 characters on the row's `DecisionBadge`
  meta with `title` for the rest only as a *supplement* (X4's rule: the tooltip never the sole
  carrier).

### 8.7 Contact centre

> **Superseded by the three-pane inbox, `design/12-inbox.md`** (CONTACT-CENTRE-REDESIGN-PLAN.md,
> Phase D). The queue table, its `Owner` column and the pane are gone; snooze, log a call, the
> typing line and templates live in design 12 §4.1, §4.2 and §5. Kept for the record.

- Default view stays `Unassigned`; the `Owner` column moves behind the column control **on that
  view only** (H5) and returns on `Mine` and `Active`, where it carries information. `QueueTable`
  needs per-view `defaultHidden` — table-density engineer.
- `Snooze until…` as a row action and pane secondary (O6): a `ConfirmDialog` with a `choice` of
  `30 min · 2 h · tomorrow 09:00`; both clocks pause (D22). `snoozeConversation(id, until)` on
  the seam.
- `Log a call` on a phone conversation's pane (X2), posting the typed internal message from
  §3.2.
- Typing indicator: `TypingState` exists (`types/conversation.ts:563-579`); the pane renders
  `{name} is typing…` beneath the thread as one muted line, and the composer sends
  `sendTypingIndicator` on a 1s debounce. Mock driver emits it.

### 8.8 Overview

Described in §6.1. Visual: the desk is a `BoardBand shape="inset"` above the hero row; tiles
with `absenceReason` render the reason sentence at body size, never `—` at 28px (H6) — a
`MetricTile` change, shared with the other boards.

### 8.9 Arabic

Every harness captures `ar`. Three things to check by eye on each: the row marker is on the
inline-start edge, the composer's `Send` is at inline-end, and every `TKT-` / `CNV-` /
handle is `<bdi>`-isolated (the conversation pane does this; the ticket detail's requester id
at `TicketDetailScreen.tsx:489` does not).

---

## 9. Phase 5 — Business and experience

Worktree `support/business`. Depends on Phases 1 and 2.

### 9.1 The SLA policy reaches every ticket (B1)

Done by §3.1. What this phase adds: Admin › Policy's queue × tier grid gains a `Tickets` row so
the per-queue override the grid already draws applies to the ticket store, and the reason-code
table's per-code `fr / res / upd` columns are what `mintTicket` reads. A change to policy
re-derives clocks on **open** tickets only, with an audit entry naming the count.

### 9.2 Compensation ceiling (B2)

`ResolveDisputeModal` and the goodwill-credit path read
`min(claimAmount, operator.compensationCapHalalas, reasonCode.compCapHalalas)` and state the
binding ceiling in the derived line (*"Up to 100 SAR — your cap"*). Above it the primary is
disabled with the reason and a `Request approval` secondary that transfers the dispute to an
operator whose cap suffices. `ReasonCode` gains `compCapHalalas` in the registry card.

### 9.3 Contact reasons (B3)

Once §5.3 stamps a reason code on every ticket and §3.6 keys conversations to them, the
*Why they call* chapter renders: contacts per 1 000 trips by reason with the code's `owner` team
in the row, sorted by volume — legacy's CPT table (`13c` §5 F1), as a `DecisionList` on the
board with a drilldown to the reason-code group-by on Tickets. `uncodedContactShare` renders
against the 3% ceiling the tile already declares (`caption.uncodedCeiling`).

### 9.4 CSAT (B4)

- `Ticket.csat: { score: 1..5, comment: string | null, at } | null`.
- Closing a ticket sends the `csat_request` email template (Admin › Communications already has
  templates per event per locale) to the channel's address; refused in place when there is none.
- `support.overview.csat` lead figure, 7-day, with `absenceReason: 'no-responses'` until one
  arrives.
- The score renders on the decided row's meta and on the requester's profile support card.

### 9.5 Repeat contact and first-contact resolution (B5, B6)

- `repeatContactRate` defined per §3.6.
- `firstContactResolution`: tickets resolved with exactly one outbound customer-visible message or
  one `resolved-on-call` log ÷ tickets resolved. A tile in *Answering* with a caption stating
  the definition.

### 9.6 Customer-facing honesty (X3)

Every outbound message on a ticket now carries delivery (S-3). The `Sent to {channel}` toast on
the ticket is removed; the thread's delivery word is the confirmation (§8.6.3 / R10).

---

## 10. Sequencing

| Lane | Phase | Depends on | Owner | Worktree | Size |
|---|---|---|---|---|---|
| L0 | Phase 0 (§4) | — | one frontend-engineer | branch only | 1 day |
| L1 | §3.1–3.3 seam | L0 | mock-data-engineer, then api-contract-steward | `support/seam` | 3 days |
| L2 | Phase 1 queue + detail (§5.1–5.5) | L1 | product-owner → product-designer → frontend-engineer | `support/tickets` | 6 days |
| L3 | Phase 1 disputes (§5.6) | L1 | frontend-engineer | `support/disputes` | 3 days |
| L4 | §3.4 + Phase 2 (§6) | L1 | utilities-engineer (hook), frontend-engineer, shell owner for TopBar | `support/desk` | 5 days |
| L5 | Phase 3 (§7) | L2 | frontend-engineer | `support/ease` | 4 days |
| L6 | Phase 4 (§8) | L2, L3 | product-designer → frontend-engineer, table-density-engineer for §8.2/§8.7 | `support/hierarchy` | 6 days |
| L7 | §3.5–3.6 + Phase 5 (§9) | L2, L4 | mock-data-engineer, frontend-engineer | `support/business` | 5 days |
| QA | tests + three harnesses | each lane | qa-engineer, visual-qa-engineer, accessibility-auditor for §7.4 | in-lane | continuous |

L2, L3 and L4 run in parallel after L1. L5, L6, L7 run in parallel after L2. Merge conventions
from `FINANCIALS-UX-PLAN.md` §10.3 apply: both copy blocks kept, `npm run i18n:keys` and
`npm run api:contract` regenerated at each merge, one writer per tree.

Sizes are working days for one agent and are estimates, not commitments.

---

## 11. Acceptance criteria

Numbered `AC-S-nn`. One test per criterion, named after it. Criteria marked **H** need a
harness capture, not a jsdom test.

**Phase 0**
- AC-S-01 `TKT-501` and `RDR-1041` render the same name on the ticket, the queue and the profile.
- AC-S-02 The repeat-contact tile's drilldown opens `/support/contact-centre`.
- AC-S-03 On Fairness, an operator without `approve_drivers` sees `Uphold` disabled with its reason as text reachable by keyboard; no `title` is the only carrier. Same for Safety `Close` and each protocol step.
- AC-S-04 A ticket detail's header primary, when disabled, renders its reason beneath it.
- AC-S-05 **H** At 1280 in both languages the first view tab on Tickets and Fairness is fully visible and the page body does not scroll horizontally.

**Phase 1**
- AC-S-06 A ticket created with reason code `CAP_LATE` carries a first-response deadline 15 minutes and a resolution deadline 240 minutes after creation, and a next-update deadline of 15 minutes.
- AC-S-07 A ticket whose first-response deadline passes unanswered gains `firstResponseBreachedAt` once, one audit entry and one notification naming the on-call primary; a second sweep adds nothing.
- AC-S-08 The ticket queue opens on `Unassigned`, breached first, then by the running deadline, `No clock` last.
- AC-S-09 A claimed ticket idle 30 minutes renders as unclaimed and can be claimed without a take-over.
- AC-S-10 Claiming a ticket another operator holds shows a confirmation naming them.
- AC-S-11 `Waiting on customer` pauses the resolution clock and never the first-response clock; `Resume` restarts it from the paused remaining time.
- AC-S-12 Changing a ticket's reason code re-derives its priority and three clocks and states the new deadlines in the dialog before confirming.
- AC-S-13 Transferring a ticket names both operators in an internal message on its thread and offers no undo.
- AC-S-14 `Create ticket` on a conversation produces a ticket linked in both directions; the conversation row renders the ticket link (AC-947).
- AC-S-15 `New ticket` on the queue refuses to create a ticket with no channel and says so; it never defaults one.
- AC-S-16 A reply sent on a ticket appears on its linked conversation and vice versa; an internal note on either is not customer-visible on the other.
- AC-S-17 A reply on a ticket whose channel address is missing renders `Not delivered — no email address on file` on the message and no success toast.
- AC-S-18 A call logged on a ticket renders once on the ticket timeline and once on the phone conversation, from one record.
- AC-S-19 A dispute opens at `/support/disputes/:id` with the claim in full; the index row carries the kind and a truncated first line only.
- AC-S-20 A lost-item report can be marked `unrecoverable` after a confirmation, and the row shows when each transition happened.
- AC-S-21 A resolved ticket's row shows `Reopen` live and `Resolve` disabled with its reason; a live ticket's row shows the reverse.
- AC-S-22 Bulk on Tickets offers `Claim selected` and `Change reason code…` and nothing else; no view offers a bulk resolve.
- AC-S-23 **H** A ticket row is at most 56px at 1280; the table box ends at its pagination row, not at the viewport.
- AC-S-24 Every string on the four ticket surfaces resolves through a key with an Arabic entry; no `defaultValue` call exists.

**Phase 2**
- AC-S-25 Availability is set from the top bar on any route and auto-away fires after 10 idle minutes on any route.
- AC-S-26 The cap is read from policy; a role set to 2 refuses a third chat with the number 2 in the sentence.
- AC-S-27 The desk lists every operator with `view_support`, their presence word, live chats over cap, tickets held and soonest deadline; `Transfer to…` from the desk lands the record on the chosen operator.
- AC-S-28 Going offline while holding work lists the held items with `Release` and `Transfer` per row; `Go offline anyway` leaves them held.
- AC-S-29 `Take next` claims and opens the first unassigned row under the default sort; at cap it refuses with the number; on an empty view it refuses with the cleared sentence.
- AC-S-30 Support › Overview renders `ticketsBreaching` and `promiseKept` from the ticket store, with values, on a fixture that carries one breached and four kept.

**Phase 3**
- AC-S-31 The ticket, conversation and dispute rails show the requester's *Elsewhere in the console* lines, each linking to the filtered queue.
- AC-S-32 `Insert template…` fills the composer with the rendered template and sends nothing.
- AC-S-33 `j`, `k`, `c`, `Enter`, `Esc` operate every support queue without a mouse; accessibility-auditor's verdict is recorded.
- AC-S-34 Searching a phone number on Tickets finds the requester's tickets.

**Phase 4**
- AC-S-35 **H** No support queue row carries more than one tone-filled badge plus the SLA pill.
- AC-S-36 **H** On Fairness, no decided row renders an em dash in `Deadline` or `Owner`.
- AC-S-37 An incident opens at `/support/safety/:id`; the four steps carry their names as text; `Close incident` states the outstanding count as text.
- AC-S-38 **H** An unanswered `Critical` SOS is the first row of Safety › Open.
- AC-S-39 The Fairness economics view is reached from the sub-tab's view control; no in-page `Tabs` remains.
- AC-S-40 `Snooze until…` pauses both clocks and the row leaves every open view until the time passes.
- AC-S-41 **H** No metric tile on Support › Overview renders `—` as its headline; an absent value renders its reason sentence.
- AC-S-42 **H** In Arabic the breach marker sits on the inline-start edge of the row and every id and handle on the ticket detail is bidi-isolated.

**Phase 5**
- AC-S-43 A goodwill credit above the operator's cap is refused with the cap named and offers `Request approval`.
- AC-S-44 The contact-reasons list ranks reason codes by contacts per 1 000 trips and names each code's owner team.
- AC-S-45 Closing a ticket sends the CSAT template to the channel's address, or refuses in place with the missing-address reason.
- AC-S-46 `firstContactResolution` counts a ticket resolved with one outbound message or one `resolved-on-call` log, and no other.

---

## 12. What this plan refuses to decide

Owner questions. Each blocks one item and nothing else.

| # | Question | Blocks |
|---|---|---|
| Q-S1 | **Mass events.** Legacy grouped tickets under a master and sent one message to all (`13a` §4.5, `13c` F14). It is bulk *messaging*, not bulk disposition, and it is the incident-communications tool the desk will ask for on the first outage. Ship it as a `Linked tickets` group with one composer, or leave it out? | a Phase 5 item |
| Q-S2 | **Does reopening a conversation claim it?** `ConversationPane.tsx:381-386` leaves ownership untouched and says the question is open. The ticket's `Reopen` will follow whichever answer. | AC-S-21's second half |
| Q-S3 | **Lost & Found promise.** Legacy's `TRP_LOST_ITEM` carried a 30-minute update clock on the ticket and none on the item. Does a report get a clock, and from where? | §5.6's pill |
| Q-S4 | **The real permission keys.** Safety and Fairness gate on `approve_drivers` as *the nearest gate the fixture carries* (`SafetyScreen.tsx:287-295`, Q-84). Conversations gate on `contact_users`. Is there a `manage_safety` / `manage_fairness`, and does `Trust & Safety` exist (Q3)? | nothing in code; every refusal sentence's permission name |
| Q-S5 | **Business hours.** Tier T4 promises `business` hours and no calendar exists (`13a` §18.6). Enforce 24/7 for every tier until a calendar is specified, or hold T4's clock outside 08:00–18:00? | §3.1's sweep for T4 |
| Q-S6 | **Rationale required on Fairness** (D-1, open). The screen takes the mock's position; the detail route will carry whichever. | nothing |
| Q-S7 | **Who may create a safety incident from the console** (spec §8.3 `source`). Ops Manager only, or Support too for `escalated-ticket`? | §8.5's `New incident` primary |

---

## 13. Files

| Change | Path |
|---|---|
| Ticket type, SLA block, thread fold | `src/data/types/ticket.ts`, `src/data/types/conversation.ts` |
| Ticket client: lifecycle ops, sweep, audit | `src/data/clients/tickets.ts`, `src/data/clients/audit.ts`, `src/data/clients/notifications.ts` |
| Policy: chat cap, ticket queue row, comp cap | `src/data/types/policy.ts`, `src/data/clients/policy.ts`, `src/screens/admin/policy/*` |
| Presence hook to shared layer, top bar control | `src/hooks/usePresence.ts` (new), `src/shell/TopBar.tsx` |
| Ticket screens on the queue contract | `src/screens/support/tickets/*` (rebuild), `src/screens/queues/*` (per-view hidden columns, group-by) |
| Detail routes | `src/data/fixtures/routeTable.ts` (three `DetailRoute`s), `src/routes.tsx` |
| Disputes detail, Safety detail, Fairness detail | `src/screens/support/disputes/DisputeDetailScreen.tsx`, `src/screens/support/safety/IncidentDetailScreen.tsx`, `src/screens/support/fairness/CaseDetailScreen.tsx` (new) |
| The desk | `src/screens/support/desk/*` (new), `src/data/fixtures/metrics.ts` |
| Templates in the composer | `src/screens/support/conversations/MessageComposer.tsx`, `src/data/clients/emails.ts` |
| Copy and Arabic | each module's `copy.ts` and `src/i18n/ar/<module>.ts`, `docs/08-i18n/` regenerated |
| API | `docs/07-api/` regenerated per lane |
| Proof | `scripts/harness/support-tickets.mjs`, `support-desk.mjs`, `support-queues.mjs` (new); `src/screens/support/safety/safety.test.tsx`, `src/screens/support/fairness/fairness.test.tsx` (new) |

---

## 14. What does not change

Stated so nobody re-litigates it in a handoff.

- **R7's five tones and R5a's four uses of red.** Critical and High share `warning`; the word,
  the marker and the clock carry the difference.
- **No confirmation on send, no toast on send** (§8.6.3–8.6.4, F-1's narrow reading).
- **Pull queue, no auto-assignment** (D19). `Take next` is a pull.
- **No bulk disposition** (§8.4).
- **Chat 45 s / 20 min, email 4 h / 24 h, cap 3 by default** (D22).
- **Phone read-only, WhatsApp modelled with no composer** (D19) until a vendor is signed.
- **Overturn is neutral** (Q-28). Fairness exists to be lost.
- **The conversation pane is a page, not a drawer** (delta D-4).
