# 07 — The support desk: tickets, disputes, the shift and the six sub-tabs

> **Reads:** `specs/02-work-queues.md` §4 (the shared work-queue contract, which governs every
> queue named here) · `design/12-inbox.md` (the contact centre) · `DECISIONS.md` **D19**, **D22**,
> **D17** · `DESIGN.md` §8.4 (work queues), §8.6 (the composer), §11.2 (refusals) ·
> `docs/01-modules/13a`, `13b`, `13c`, `10a`, `10e` · `eyvar_ops_panel_v40_fixed.html`.
>
> **Numbering:** acceptance criteria run `AC-S-01` … `AC-S-46`. They are independent of the
> `AC-nnn` series; a criterion marked **H** is checked by a harness capture, not by a jsdom test,
> because jsdom does no table layout and renders no SVG.
>
> **Behaviour only.** Every state below is defined by what it *is* and what the operator can do
> in it, never by how it looks. Where this spec says "tone" it means the semantic token name.
> The look is `design/03-visual-language.md` and `design/12-inbox.md`.

---

## 1. Problem

A support operator works one customer across six sub-tabs that disagree about who owns a piece
of work and about what was said to that customer. Three of the six queues carry the shared
`Claim` contract with its thirty-minute expiry, take-over and release; tickets and disputes
carry a bare `ownerId` with no expiry, no take-over and no release control, so a ticket claimed
by someone who went home is claimed forever and §8.4's first rule — *exactly one ownership model
MUST exist* — is broken inside one workspace. Worse, a customer has two threads: a reply typed
on a ticket never reaches the linked conversation and a reply typed on the conversation never
reaches the ticket, so the operator who picks up the second surface cannot see what the first
one promised. On top of that the operator cannot say whether a promise was kept, because a
ticket is created with no deadline at all and nothing in the product ever marks one breached.
The desk therefore runs on memory and on asking the person at the next desk.

## 2. Scope

### 2.1 In

1. **A ticket is a work-queue row.** Support › Tickets carries the same P8 contract as the other
   four support queues: `QueuePage`, `OwnerChip`, the breach banner, the R5a leading-edge marker,
   `Claim` / `Release` / `Take over`, and a decided-row conversion. One ownership model across
   the workspace.
2. **A ticket has three clocks, stamped from policy at creation** — first response, resolution,
   and the per-code recurring update — derived from the reason code and the tier defaults Admin ›
   Policy already edits.
3. **One thread per customer.** A ticket linked to a conversation reads and writes that
   conversation's thread. A call logged on a ticket is one record, read from both surfaces.
4. **The ticket lifecycle is complete on screen:** reopen, release, transfer, `Waiting on
   customer`, change reason code, change priority, and `Create ticket` from the queue, from a
   conversation and from a profile — each disabled in place with its reason where refused.
5. **Support › Overview is the shift board.** Ticket figures, and the roster with presence and
   load.
6. **Availability lives in the top bar** on every route, and the concurrent-chat cap is a policy
   field, not a constant.
7. **Disputes, Safety and Fairness each have a detail route**, so a claim, a four-step protocol
   and a rationale stop living in a table cell.
8. **Lost & Found reaches a terminal `unrecoverable` state**, with a timestamp per transition.
9. **Canned responses** — one template object with three uses: a chat reply, a ticket reply, an
   email body. Stored under Admin › Communications › Templates.
10. **Every refusal is text.** A `title=` attribute is not a refusal; §11.2 and D17 clause 3
    forbid it.

### 2.2 Out

| Not in scope | Why |
|---|---|
| **Bulk disposition on any support queue** | §8.4 licenses a selection column only when every bulk action is a claim or an assign act. Deciding a case in bulk is deciding without reading it. Bulk *claim* and bulk *change reason code* are in, because re-coding assigns a code rather than making a decision. |
| **Auto-assignment / routing rules** | **D19**: the desk is a pull queue. `Take next` is a pull. Reopen only if the owner reverses D19. |
| **Mass events** — one master ticket, one message to all its children | It is bulk *messaging*, not bulk disposition, and it is a real incident-communications tool. It is Q-S1, an owner question, not an omission. |
| **A confirmation or a toast on send** | §8.6.3–8.6.4. The message in the thread is the confirmation. |
| **A composer for WhatsApp; a composer for phone** | **D19**. WhatsApp is modelled read-only until a vendor is signed; a call has no message to send, only a note to log. |
| **A red tone for Critical** | R7 has five tones and no critical one; R5a enumerates four uses of red and a badge is not among them. `Critical` and `High` share `warning`; the word, the marker and the clock carry the difference. |
| **A business-hours calendar** | No calendar is specified anywhere in the product. Every tier's clock runs 24/7 until one is. This is Q-S5. |
| **Making `Overturn` a failure tone** | Fairness exists to be lost. `Overturn` is neutral. |
| **Turning the conversation pane into a drawer** | It is a page (delta D-4), and `design/12-inbox.md` is its design. |

## 3. The screens

Six sub-tabs under `/support`, declared in `src/data/fixtures/routeTable.ts`.

| Sub-tab | Route | §6.4 pattern row | Screen |
|---|---|---|---|
| Overview | `/support/overview` | **P5 metric board** | `MetricBoardScreen`, plus `src/screens/support/desk/SupportDesk.tsx` for the roster |
| Tickets | `/support/tickets`, `/support/tickets/:ticketId` | **P8 work queue** + **P2 detail** | `TicketsScreen`, `TicketDetailScreen`, `NewTicketModal`, `LogCallModal` |
| Disputes | `/support/disputes`, `/support/disputes/:disputeId` | **P8** + **P2** | `DisputesScreen`, `DisputeDetailScreen`, `ResolveDisputeModal`, `NewRecordModals` |
| Fairness | `/support/fairness`, `/support/fairness/:caseId` | **P5** + **P8** + **P2** | `FairnessScreen`, `CaseDetailScreen` |
| Safety | `/support/safety`, `/support/safety/:incidentId` | **P8** + **P2** | `SafetyScreen`, `IncidentDetailScreen` |
| Contact centre | `/support/contact-centre`, `/support/contact-centre/:conversationId` | **no §6.4 row** — a three-track full-height grid | `src/screens/support/inbox/` |

**The contact centre maps to no §6.4 row.** That is a finding, not an invitation to improvise:
it is recorded as F-12-1 in `design/12-inbox.md` §1, which cites the nearest row for every rule
it states. §6.4 needs a *three-pane inbox* row before a second inbox is drawn.

Shared across the six: `src/screens/support/shared/` — `ElsewhereCard` (the requester's other
open work), `RequesterPicker`, `TemplatePicker`.

## 4. Data

Every field is additive and nullable at the seam unless marked **required**. `docs/07-api/` is
regenerated whenever one of these changes.

### 4.1 Ticket — the SLA block

| Field | Type | Source | Derived? |
|---|---|---|---|
| `slaStartedAt`, `slaDueAt`, `slaTargetMinutes`, `slaBreachedAt` | `IsoDateTime \| null`, `number` | stamped by `mintTicket` from the reason code and the tier defaults | no — stamped once, then read |
| `firstResponseDueAt`, `firstResponseAt`, `firstResponseBreachedAt` | `IsoDateTime \| null` | same | no |
| `updateDueAt` | `IsoDateTime \| null` | the per-code recurring update target | no |
| `slaSource` | `'legacy-reason-code'` and successors | `mintTicket` | no |
| `pausedAt` | `IsoDateTime \| null` | set by `setTicketStatus(id,'waiting')` when the tier's `pauseOnCustomer` is true | no |
| `pausedMinutes` | `number` | accumulated across pauses | no |
| `slaBreached` | `boolean` | **derived** alias of `slaBreachedAt !== null` | **yes — §8.2** |
| `conversationId` | `string \| null` → **required** | the linked conversation | no |
| `channel` | `ConversationChannel \| null` → **required** | the linked conversation | no |
| `messages` | `Message[]` | **derived**: the linked conversation's customer-visible messages plus call logs, or `[]` when `conversationId` is null | **yes — §8.2** |
| `ownerId` / `ownerName` | `string \| null` | **derived** projection of `liveClaim(claim)` | **yes — §8.2** |

**The breach sweep.** In mock mode it advances from `useTick`, exactly as the realtime advance
does; in http mode it is a server property. It stamps `firstResponseBreachedAt` and
`slaBreachedAt` **once**, writes one audit entry and one notification per crossing, batched per
tick (§8.4.3). The notification's route is the ticket's detail path; its title names the on-call
primary from `getOnCallRota`.

**Current behaviour, suspected defect.** `Ticket` still declares its own `TicketMessage` type
(`src/data/types/ticket.ts:12`) alongside `Message`. `TicketMessage` has no `delivery` and no
`channel`, so a ticket reply cannot say whether it arrived. The fold in §2.1 item 3 is what
closes it; until it does, a ticket's thread is a weaker record than the conversation's.

### 4.2 Ticket lifecycle operations

| Operation | Signature | Notes |
|---|---|---|
| `setTicketStatus` | `(id, 'waiting' \| 'in-progress')` | pauses the resolution clock for `waiting` when the tier's `pauseOnCustomer` is true; **never** for a suspension-appeal code |
| `transferTicket` | `(id, toUserId, { note })` | mirrors `transferConversation`; no undo |
| `recodeTicket` | `(id, reasonCode)` | re-derives category, priority and all three clocks, and clears breach stamps, as the legacy app did (`13a` §5.1) |
| `setTicketPriority` | `(id, priority)` | |
| `claimTicket` | shared `Claim` contract | thirty-minute expiry, take-over, release |
| `logTicketCall` | posts an `internal` message carrying a typed `callOutcome` onto the phone conversation, creating one when the ticket has none | one record, two surfaces |

### 4.3 Presence and the cap

| Field | Type | Source | Derived? |
|---|---|---|---|
| `limits.maxConcurrentChatsPerOperator` | `number`, range 1–8, default 3 | Admin › Policy › Limits (`src/data/types/policy.ts:344`) | no |
| `AgentPresence.liveChatCount` | `number` | D22's predicate | **yes** — counted, not stored |
| `AgentPresence.activeCount` | `number` | all held work | **yes** |
| availability word | `'available' \| 'busy' \| 'away' \| 'offline'` | `setMyPresence`, callable from the shell | no |

**Deviation from the original ask, recorded.** The cap is a single number per workspace
(`maxConcurrentChatsPerOperator`), not a map keyed by role. A per-role cap needs an owner
decision and a policy migration; nothing in the product needs one yet.

### 4.4 Disputes, Lost & Found, Safety

`createDispute` and `createLostFoundItem` exist, closing legacy gaps `13b` §18.1–2 — in the
legacy app a rider's claim could not enter the system at all. `LostFoundItem.status` carries
`unrecoverable` as a terminal state, and the item carries `transitions: { to, at, byUserName }[]`.
`createSafetyIncident` takes `source: 'escalated-ticket' | 'sos' | 'report'`.

### 4.5 Metrics

| Metric | Definition |
|---|---|
| `support.overview.ticketsBreaching` | tickets whose `slaDueAt` has passed with no `resolvedAt` |
| `support.overview.promiseKept` | resolved tickets with no breach stamp ÷ resolved tickets |
| `repeatContactRate` | conversations opened by an entity that already had a conversation closed in the prior 7 days ÷ conversations opened. Drilldown: `/support/contact-centre` |
| `contactsPerThousandTrips`, `uncodedContactShare` | read the conversation store keyed by `ticketId → reasonCode` |
| `firstContactResolution` | tickets resolved with exactly one outbound message, or one `resolved-on-call` log, and no other shape |

## 5. States

The four that always exist, on every queue and every detail: **content**, **empty**, **loading**,
**error**. `specs/02-work-queues.md` §4.7 governs the two kinds of empty and they both apply
here: a queue an operator has cleared is not a queue that has never had a row, and they do not
share a sentence.

Domain states, and what the operator sees in each:

| State | What the operator sees |
|---|---|
| **Unclaimed** | the row's owner cell is empty; `Claim` is live |
| **Claimed by another operator** | `OwnerChip` names them; `Take over` is live and confirms, naming the holder |
| **Claim gone stale** (idle 30 min) | the row renders unclaimed and claims without a take-over |
| **At the concurrent-chat cap** | `Claim` is disabled and the sentence carries the number from policy |
| **Waiting on customer** | the resolution clock is paused and says so; the first-response clock is never paused |
| **Snoozed** | both clocks paused; the row leaves every open view until the wake time |
| **First-response breached** | R5a leading-edge marker on the row, breach banner on the queue |
| **Resolution breached** | `Create ticket` becomes the first visible ghost on a conversation; on a ticket the row keeps its marker and the clock reads overdue |
| **Resolved** | `Reopen` is live, `Resolve` is disabled with its reason; a live ticket shows the reverse |
| **Reply with no channel address** | the message renders `Not delivered — no email address on file` and no success toast is raised |
| **No write permission** | every write control is present, disabled, and describes the **one** missing permission by its name (D17's template) |
| **Lost item unrecoverable** | terminal; the row shows when each transition happened |

## 6. Acceptance criteria

Criteria marked **H** need a harness capture.

### 6.1 Correctness and refusal

- **AC-S-01** `TKT-501` and `RDR-1041` render the same name on the ticket, the queue and the profile.
- **AC-S-02** The repeat-contact tile's drilldown opens `/support/contact-centre`.
- **AC-S-03** On Fairness, an operator without the deciding permission sees `Uphold` disabled with its reason as text reachable by keyboard; no `title` is the only carrier. The same holds for Safety `Close` and for each protocol step.
- **AC-S-04** A ticket detail's header primary, when disabled, renders its reason beneath it.
- **AC-S-05** **H** At 1280px in both languages the first view tab on Tickets and on Fairness is fully visible and the page body does not scroll horizontally.

### 6.2 Tickets

- **AC-S-06** A ticket created with reason code `CAP_LATE` carries a first-response deadline 15 minutes after creation, a resolution deadline 240 minutes after creation, and a next-update deadline of 15 minutes.
- **AC-S-07** A ticket whose first-response deadline passes unanswered gains `firstResponseBreachedAt` once, one audit entry and one notification naming the on-call primary; a second sweep adds nothing.
- **AC-S-08** The ticket queue opens on `Unassigned`, breached rows first, then by the running deadline, with `No clock` last.
- **AC-S-09** A claimed ticket idle 30 minutes renders as unclaimed and can be claimed without a take-over.
- **AC-S-10** Claiming a ticket another operator holds shows a confirmation naming them.
- **AC-S-11** `Waiting on customer` pauses the resolution clock and never the first-response clock; `Resume` restarts it from the paused remaining time.
- **AC-S-12** Changing a ticket's reason code re-derives its priority and all three clocks, and states the new deadlines in the dialog before the operator confirms.
- **AC-S-13** Transferring a ticket names both operators in an internal message on its thread, and offers no undo.
- **AC-S-14** `Create ticket` on a conversation produces a ticket linked in both directions, and the conversation row renders the ticket link.
- **AC-S-15** `New ticket` on the queue refuses to create a ticket with no channel and says so; it never defaults one.
- **AC-S-16** A reply sent on a ticket appears on its linked conversation and a reply sent on the conversation appears on the ticket; an internal note on either is not customer-visible on the other.
- **AC-S-17** A reply on a ticket whose channel address is missing renders `Not delivered — no email address on file` on the message, and raises no success toast.
- **AC-S-18** A call logged on a ticket renders once on the ticket timeline and once on the phone conversation, from one record.
- **AC-S-19** A dispute opens at `/support/disputes/:disputeId` with the claim in full; the index row carries the kind and a truncated first line only.
- **AC-S-20** A lost-item report can be marked `unrecoverable` after a confirmation, and the row shows when each transition happened.
- **AC-S-21** A resolved ticket's row shows `Reopen` live and `Resolve` disabled with its reason; a live ticket's row shows the reverse.
- **AC-S-22** Bulk on Tickets offers `Claim selected` and `Change reason code…` and nothing else; no view offers a bulk resolve.
- **AC-S-23** **H** A ticket row is at most 56px at 1280px, and the table box ends at its pagination row rather than at the viewport.
- **AC-S-24** Every string on the four ticket surfaces resolves through a key with an Arabic entry; no `defaultValue` call exists.

### 6.3 The shift

- **AC-S-25** Availability is set from the top bar on any route, and auto-away fires after 10 idle minutes on any route.
- **AC-S-26** The cap is read from policy; with the policy set to 2, a third chat is refused with the number 2 in the sentence.
- **AC-S-27** The desk lists every operator with the support view permission, their presence word, live chats over cap, tickets held and soonest deadline; `Transfer to…` from the desk lands the record on the chosen operator.
- **AC-S-28** Going offline while holding work lists the held items with `Release` and `Transfer` per row; `Go offline anyway` leaves them held.
- **AC-S-29** `Take next` claims and opens the first unassigned row under the default sort; at cap it refuses with the number; on an empty view it refuses with the cleared-queue sentence.
- **AC-S-30** Support › Overview renders `ticketsBreaching` and `promiseKept` from the ticket store, with values, on a fixture carrying one breached and four kept.

### 6.4 Working speed

- **AC-S-31** The ticket, conversation and dispute rails show the requester's *Elsewhere in the console* lines, each linking to the filtered queue.
- **AC-S-32** `Insert template…` fills the composer with the rendered template and sends nothing.
- **AC-S-33** `j`, `k`, `c`, `Enter` and `Esc` operate every support queue without a mouse.
- **AC-S-34** Searching a phone number on Tickets finds that requester's tickets.

### 6.5 Hierarchy and legibility

- **AC-S-35** **H** No support queue row carries more than one tone-filled badge plus the SLA pill.
- **AC-S-36** **H** On Fairness, no decided row renders an em dash in `Deadline` or in `Owner`.
- **AC-S-37** An incident opens at `/support/safety/:incidentId`; the four protocol steps carry their names as text, and `Close incident` states the outstanding count as text.
- **AC-S-38** **H** An unanswered `Critical` SOS is the first row of Safety › Open.
- **AC-S-39** The Fairness economics view is reached from the sub-tab's view control; no in-page tab strip remains.
- **AC-S-40** `Snooze until…` pauses both clocks, and the row leaves every open view until the time passes.
- **AC-S-41** **H** No metric tile on Support › Overview renders `—` as its headline; an absent value renders its reason sentence.
- **AC-S-42** **H** In Arabic the breach marker sits on the inline-start edge of the row, and every id and handle on the ticket detail is bidi-isolated.

### 6.6 The business the desk runs

- **AC-S-43** A goodwill credit above the operator's cap is refused with the cap named, and offers `Request approval`.
- **AC-S-44** The contact-reasons list ranks reason codes by contacts per 1 000 trips and names each code's owner team.
- **AC-S-45** Closing a ticket sends the CSAT template to the channel's address, or refuses in place with the missing-address reason.
- **AC-S-46** `firstContactResolution` counts a ticket resolved with one outbound message or one `resolved-on-call` log, and no other.

## 7. Permissions

Cross-reference `docs/01-modules/00c-identity-permissions-and-audit.md` and D17.

| Act | Key |
|---|---|
| See any support sub-tab | `view_support` (the `viewPermission` on all six route rows) |
| Reply on a conversation or a ticket | `contact_users` |
| Decide a fairness case, close a safety incident | `approve_drivers` — **the nearest gate the fixture carries**, not the right one. See Q-S4 |
| Issue a goodwill credit | the finance gate, capped per role; above the cap it is `Request approval` |
| Edit the SLA tiers or the chat cap | `manage_settings`, under Admin › Policy |

Every refusal renders **as text**, names the **one** missing permission, and says who can grant
it. A `title` attribute is not a refusal (§11.2, D17 clause 3).

## 8. Open questions

| # | Question | Who answers | Blocked until then |
|---|---|---|---|
| **Q-S1** | **Mass events.** The legacy app grouped tickets under a master and sent one message to all (`13a` §4.5, `13c` F14). Ship it as a `Linked tickets` group with one composer, or leave it out? | business owner | the incident-communications tool. Nothing else. |
| **Q-S2** | **Does reopening a conversation claim it?** The reopen path leaves ownership untouched. The ticket's `Reopen` follows whichever answer. | business owner | the second half of AC-S-21 |
| **Q-S3** | **Lost & Found promise.** Legacy's `TRP_LOST_ITEM` carried a 30-minute update clock on the ticket and none on the item. Does a report get a clock, and from where? | business owner | whether the Lost & Found row shows an SLA pill |
| **Q-S4** | **The real permission keys.** Safety and Fairness gate on `approve_drivers` because it is the nearest gate the fixture carries. Is there a `manage_safety` / `manage_fairness`, and does a `Trust & Safety` role exist? | business owner | every refusal sentence's permission name. Nothing in code. |
| **Q-S5** | **Business hours.** Tier T4 promises `business` hours and no calendar exists (`13a` §18.6). Run 24/7 for every tier until a calendar is specified, or hold T4's clock outside 08:00–18:00? | business owner | the sweep's treatment of T4 |
| **Q-S6** | **Is a rationale required on Fairness?** The screen takes the mock's position; the detail route carries whichever answer. | business owner | nothing |
| **Q-S7** | **Who may create a safety incident from the console?** Ops Manager only, or Support too for `escalated-ticket`? | business owner | the `New incident` primary on Safety |
