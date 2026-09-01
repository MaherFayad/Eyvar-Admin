# Operator experience plan — throughput, command centre, conversations, admin

> **Companion to** [`REMEDIATION-PLAN.md`](REMEDIATION-PLAN.md). That document asks
> *"is it correct?"*. This one asks *"how fast can one operator work in it, how much
> do they have to hold in their head, and what can they not do at all?"*
> **Grounded in** D9, `design/05-command-centre.md`, §4.3.4, the 21-pane settings
> mapping, and the traceability matrix.

---

## 0. Findings

### 0.1 The four things costing the most time

**1. The operator loses their place on every navigation.** All index-table state —
search text, filters, sort, page, selection — lives in `useState` inside
`useIndexTable` (`hooks/useIndexTable.ts:189–193`). Only `?view=` is in the URL. So
opening a captain from a filtered, sorted, page-3 list and pressing Back returns an
unfiltered page 1. Column visibility, pinning and language go through
`lib/persistence.ts`, which is **in-memory by decision** pending Q1 — so a refresh
loses those too. A filtered view cannot be bookmarked, shared, or put in a runbook.

**2. ⌘K cannot do anything.** D9 is decided — *"a command center so the user can type
commands … not just search but making actions also"* — and
`design/05-command-centre.md` is 231 lines of finished spec. **`src/commands/` does
not exist.** `search()` returns only `entity` and `destination` kinds; the
`kind: 'action'` branch in `GlobalSearch.tsx` is dead. The palette at rest shows one
prompt sentence.

**3. Search does not tolerate a typo, and looks in the wrong field.** Matching is
`String.prototype.includes()` (`clients/profile.ts:139–147`). `cmdk`'s own fuzzy
matcher is explicitly switched off (`shouldFilter={false}`, `GlobalSearch.tsx:189`).
Worse, destinations are matched against the **i18n key**, not the translated title:
`row.titleKey.toLowerCase().includes(needle)` at `profile.ts:170`. Typing `captains`
finds nothing, because the key reads `subtab.operations.people`. Entity search covers
**6 of the 11** declared `ProfileEntityType`s — `payment`, `complaint`, `new-rider`,
`ticket` and `plan` are unsearchable, reproducing the exact defect
`UNRESOLVED_IN_LEGACY` exists to record.

**4. Nothing is reversible and little is bulk.** There is no undo anywhere — every
`action:` on a toast is an empty-state link. Selection and a bulk bar exist on
**three** screens (`PeopleTable`, `ApplicationsView`, `WalletsScreen`); Trips,
Subscriptions, Tickets, Requests, Safety, Disputes, Assurance, My Work, Payouts and
Activity make the operator act one row at a time.

### 0.2 Three capabilities that are absent, not thin

**5. There is no support conversation centre.** A ticket has a message thread and
`replyTicket()` works — but:

- `Ticket` has **no channel**. There is no email, chat, WhatsApp or phone
  distinction, so a reply is composed with no idea where it goes.
- **No live chat.** Zero realtime anywhere in the codebase — no websocket, no polling
  subscription, no presence, no typing state, no unassigned-chat queue to grab from.
  `ContactCentreScreen` models phone agents and a CPT table and nothing else.
- **No outbound email.** The `emails` settings pane maps to Admin › Communications
  and that screen has **zero** email content — no template, no sender identity, no
  delivery state on a message.
- No canned responses or macros, which is the single largest throughput lever in any
  support console.

**6. Admin is a mock-up of settings, not settings.** All six screens hold module
constants, call no client, and discard every write on refresh — legacy finding F-001
reproduced. Beyond that:

| Claimed | Reality |
|---|---|
| `AC-15` asserts all 21 legacy settings panes are reachable | It walks the **route table**, not the screens. Three panes have **no built UI at all**: `emails` (0 references), `reasons` — reason codes & SLA (1), `integrity` — data integrity (0) |
| Admin › Team owns `team · permissions · security · rota` | Invite and a status toggle. **No offboarding** (legacy F-016 verbatim), no resend or revoke of an invite, no role-change audit, no admin-side session revocation — although `session.devices` and `revokeDevice` already exist in `clients/auth.ts` |
| Role permission matrix | A hardcoded `ROLE_PERMISSIONS` literal at `AdminTeamScreen.tsx:36`. Not editable, no custom roles, no per-user override, no effective-permission preview. It is also an engineer's guess at **Q4**, which is still open |
| Internal system settings | No API keys, no webhooks, no integrations, no feature flags, no SLA policy editor anywhere in the product |

**7. There are two report editors, and the ungoverned one is the default.**

> **Corrected 2026-09-01.** This finding first read *"`ReportStudio` is mounted
> nowhere"*. That was wrong, and the truth is worse.

`ReportBuilder.tsx` (397 lines) is the governed editor: semantic layer, plan
legality, URL-as-storage (AC-853/854/855), `Run` discipline (AC-809/810), saves to
the library, feeds alerts. `ReportStudio.tsx` (**1 489 lines**) is the second
editor, holding the five analysis modes the governed one lacks — trend and
segmentation, conversion funnel, granular data table, cohort retention with a day
0–30 heat matrix, and user journeys. It imports fixtures directly, carries 24
palette classes and 20 raw hex values, and has no i18n and no URL state.

**They are wired as a fallback, and the fallback is the front door:**

```ts
// ReportBuilder.tsx:326
if (!isDirectSerializedQuery) {
  return <ReportStudio … />
}
```

`ReportBuilder` renders its own panel **only when the URL already carries the
serialised-query parameter**. Open `/management/reports/:reportId` normally and you
get the Studio. The governed builder — whose entire purpose is that its output can
be sent to someone — **is only reachable from a link the governed builder made**.
The shareable half can only be entered by someone who already has a share.

Two consequences for Phase 7: the merge is more urgent than a duplication cleanup,
and it **cannot start with a deletion** — removing `ReportStudio` today breaks
`/management/reports/*`.

### 0.3 The rest, in one table

| # | Finding | Evidence |
|---|---|---|
| 8 | **The 360° profile drawer is nearly unreachable.** Legacy `openProfile` had 100 call sites; the traceability matrix (#31) requires it *"reachable identically from all five tabs"*. The rebuild wires it from **three** files | `people/cells.tsx`, `CaptainsView.tsx`, `LedgerCard.tsx` |
| 9 | **Nav badges never refresh.** Fetched once with `deps: []`. Legacy F-054 reproduced | `shell/ShellContext.tsx:201` |
| 10 | **The live dispatch board does not tick.** `monitor` shape, no poll, no refetch | `operations/dispatch/DispatchScreen.tsx` |
| 11 | **No request cache.** Every mount refetches. Pricing and Ledger each fire 9 concurrent reads at 320 ms mock latency | `hooks/useAsync.ts` |
| 12 | **One 2.19 MB JS chunk, zero code splitting.** No `React.lazy` anywhere | `dist/assets/index-*.js` |
| 13 | Page size fixed at 25, no density control | `types/common.ts:149` |
| 14 | **One keyboard shortcut in the whole product** — ⌘K. No `g`-jump, no `j`/`k`, no `.` for row actions | one `keydown` listener, `GlobalSearch.tsx:91` |

---

## 1. Phases

**Phase 0 is decisions, not work.** It runs from day one; only the tasks marked ⛔
actually wait on it.

### Phase 0 — Unblock (owner)

| Task | Ask | Gates |
|---|---|---|
| **P0-T1** | **Q1 — where does UI state persist?** `localStorage`, `sessionStorage`, or server-backed per operator | P1-T4, P3-T8, page-size preference |
| **P0-T2** | **D4 / Q4 — the role model and the 35 permissions** | Every role-based `unavailable` predicate (CQ-7), and all of Phase 6b |
| **P0-T3** | **CQ-5 — must a destructive command be undoable to skip the confirm step?** Designer proposes yes | P4-T2 |
| **P0-T4** | **Chat scope.** Which channels ship: web chat only, or WhatsApp and email too? Is there a vendor (Twilio, Intercom, in-house) or does the console own the transport? | Phase 5 sizing — **not** its data model, which is channel-agnostic either way |
| **P0-T5** | **Admin scope.** Are API keys, webhooks and feature flags in scope? They are in no spec today and I am not assuming them | Phase 6c |

---

### Phase 1 — Stop losing the operator's place

Highest leverage in the plan: one hook change reaches all twenty index screens.

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P1-T1** | Lift `useIndexTable` state into the URL — `?q=`, `?sort=`, `?page=`, `?filter=`. `routeState.ts` already proves the URL-as-state pattern; extend it rather than inventing a second one. Serialise to match `clients/http.ts:toSearchParams`, so the address bar and the wire format are one grammar | — | **A** |
| **P1-T2** | Restore scroll position and selection on back-navigation | P1-T1 | — |
| **P1-T3** | Keyed request cache in `useAsync` — operation id + params, short TTL, revalidate in background. `useAsync` already separates *refetch with data on screen* from *first load*, so the loading contract is unchanged | — | **A** |
| **P1-T4** ⛔ | Replace `lib/persistence.ts`'s null store with the adapter Q1 names. Column visibility, pinning, language and page size become durable with no call-site change | P0-T1 | **A** |
| **P1-T5** | Per-operator page-size and density control in `IndexToolbar` | P1-T4 | — |

**Parallel:** T1, T3 and T4 are three separate files. T2 follows T1; T5 follows T4.

---

### Phase 2 — The command registry (C-1)

The spec's own note: *"C-1 is worth doing whether or not the palette is ever built."*
`Suspend captain` is declared in four places today and the declarations already
disagree — the row action carries a `disabled` predicate, the bulk action does not.

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P2-T1** | `src/commands/registry.ts` — the `Command<T>` shape from the spec (`id`, `titleKey`, `section`, `keywords`, `scope`, `unavailable`, `affordance`, `arity`, `run`), the resolver, and `CommandOutcome` | — | — |
| **P2-T2** | `commands/captains.ts` | P2-T1 | **B** |
| **P2-T3** | `commands/applications.ts` | P2-T1 | **B** |
| **P2-T4** | `commands/compliance.ts` | P2-T1 | **B** |
| **P2-T5** | `commands/finance.ts` | P2-T1 | **B** |
| **P2-T6** | `commands/support.ts` — claim, reply, resolve, escalate, refund | P2-T1 | **B** |
| **P2-T7** | `commands/shell.ts` — language, theme, sign out, go to… | P2-T1 | **B** |
| **P2-T8** | `CaptainsView` declares no inline action; it names command ids. Acceptance CM-1…CM-4 | P2-T2 | — |
| **P2-T9** | Roll the swap through the other 18 screens that declare row or bulk actions | P2-T2…T7 | **B′** per screen |

**Parallel:** the six domain registries (**B**) are independent once T1 lands — six
files, no shared edits. T9 then fans out per screen (**B′**).

**Write the Arabic synonyms into `keywords` now**, even though Arabic is unreachable.
Retrofitting them across six registries later is strictly worse.

---

### Phase 3 — The command centre

#### 3a — Make search find things (data layer, all parallel, can start day one)

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P3-T1** | **Fuzzy matching with typo tolerance.** New `lib/search/fuzzy.ts`: bounded Damerau–Levenshtein so a transposition (`csptain` → `captain`) costs one, prefix and word-boundary boosts, out-of-order token match, and a normaliser folding Arabic diacritics and `ة/ه`, `ى/ي`, `أإآ/ا`. Returns a **score, not a boolean**, so ranking is one comparable number. **Keep `shouldFilter={false}`** — ranking belongs in the data layer so the real API inherits the contract instead of the client re-ranking what the server sent | — | **C** |
| **P3-T2** | **Match the right field.** Replace `row.titleKey` matching with the **translated title**, the command `keywords`, and the legacy names. Keep `matchedLegacyName` so a row can say *"was: Renewal pipeline"* | P3-T1 | **C** |
| **P3-T3** | **6 → 11 entity types.** Add `payment`, `complaint`, `new-rider`, `ticket`, `plan`. `UNRESOLVED_IN_LEGACY` is already the fixture that asserts the fix | — | **C** |
| **P3-T4** | One comparable score across kinds. Section order derived from query shape per **CQ-2** — a leading verb puts `Do` first | P3-T1 | — |

#### 3b — Make it a console, not a search box *(one chain, one owner)*

| Task | Work | Depends on |
|---|---|---|
| **P3-T5** | **The `Do` section executes** (C-2). Immediate and `needs-target` commands. The palette mutates only through `command.run`, never a client (**CQ-4**) | P2-T1, P3-T4 |
| **P3-T6** | **Three states, one field** (C-3): root → target → confirm, each adding a removable chip. Backspace on empty ascends; Escape ascends and closes only from root | P3-T5 |
| **P3-T7** | **Pre-seeded targets.** Rows selected when ⌘K opens *are* the target — chip reads `[2 captains]` and the target step is skipped. An open 360° profile pre-seeds that entity. This is what makes the palette faster than the bulk bar rather than a second route to it | P3-T6, P4-T1 |
| **P3-T8** ⛔ | **The palette populated before a key is pressed** (C-4, §4). Four blocks in this order: ① commands for what is on screen — selection, then open profile, then route; ② **live queue counts** from the same `navCounts` the rail badges read, each row a one-key jump into the queue; ③ **Resume** — the last three destinations, which is also the cheapest fix for the seven moved pages §4.3.4 worries about; ④ recent commands, most-used first, per operator | P0-T1, P3-T5 |
| **P3-T9** | **Undo on the outcome toast.** `CommandOutcome` carries the undo handle, so D8's *"a one-click approve is a one-click irreversible act"* is answered once instead of per screen | P3-T5, P0-T3 |

---

### Phase 4 — Bulk work and reversibility

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P4-T1** | Selection + bulk bar on the ten screens without one: Trips, Subscriptions, Tickets, Requests, Safety, Disputes, Assurance, My Work, Payouts, Activity. `useIndexTable` already gates the checkbox column on mode and `bulkClaim`, so each screen is a props change plus its bulk command ids | P2-T9 | **D** per screen |
| **P4-T2** | Wire the undo handle into the toast for every reversible command, and make `affordance: 'destructive'` without one require the confirm step (**CQ-5**) | P3-T9 | — |

---

### Phase 5 — The support conversation centre

Nothing here exists today. Build the **model channel-agnostic** so P0-T4's answer
changes the transport and the sizing, not the schema.

#### 5a — Model and transport

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P5-T1** | **`Conversation` model.** `data/types/conversation.ts`: a conversation belongs to an entity (rider, captain, corporate contact), carries `channel: 'chat' \| 'email' \| 'whatsapp' \| 'phone'`, a participant list, an assignee, a status, and an ordered message list. `Ticket` gains `conversationId` and `channel`; `TicketMessage` folds into `Message` with a delivery state (`queued · sent · delivered · read · failed`) | — | **F** |
| **P5-T2** | **A subscription seam.** `clients/realtime.ts` exposing `subscribe(topic, handler)` beside the existing request seam, with a **mock driven by `useTick`** and an HTTP/WS implementation behind `DATA_SOURCE`. Build the UI against the contract now; swap the transport when P0-T4 lands. This is the same discipline `clients/http.ts` already applies to reads | — | **F** |
| **P5-T3** | **`clients/conversations.ts`** — list, get, claim, release, reply, transfer, close, plus `typing` and `presence` events over T2 | P5-T1, P5-T2 | — |

#### 5b — The console

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P5-T4** | **Live chat queue with grab.** An unassigned-conversation queue, oldest-waiting first, with claim / release / take-over. **Reuse `screens/queues/`** — the claim contract, the confirm dialog and the SLA countdown already exist and are tested; a chat queue is a queue | P5-T3 | — |
| **P5-T5** | **The conversation pane.** Threaded, channel-badged, with typing indicator, presence, delivery state per message, and internal notes that are visibly not sent to the customer | P5-T3 | **G** |
| **P5-T6** | **Agent availability.** Online / away / offline, a concurrent-chat cap per agent, and routing that respects both. Replaces `ContactCentreScreen`'s hardcoded `INITIAL_AGENTS` | P5-T3 | **G** |
| **P5-T7** | **Outbound email from a ticket.** Compose, send, and record delivery on the thread. Sender identity and templates come from Admin › Communications, which is why P6-T2 is its precondition | P5-T3, P6-T2 | — |
| **P5-T8** | **Canned responses and macros.** One object, three uses: a chat reply, an email body, and a bulk action over a selected set. The largest single throughput lever in the phase | P5-T3, P6-T2 | — |
| **P5-T9** | Conversation history on the 360° profile — every channel, one timeline | P5-T3, P8-T1 | **G** |

**Parallel:** **F** (T1, T2) at the start; **G** (T5, T6, T9) after T3.

---

### Phase 6 — Admin, completed

#### 6a — Make the existing six real

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P6-T1** | Wire all six admin screens to clients and persist their writes. This is Remediation Waves 2–4 for the `admin/` directory — do it there, not twice | Remediation W2–W4 | — |
| **P6-T2** | **Build the `emails` pane** (zero coverage today): sender identities, transactional templates with preview, delivery log. Precondition for P5-T7 and P5-T8 | P6-T1 | **H** |
| **P6-T3** | **Build the `reasons` pane** — reason codes and SLA policy. `lib/sla.ts` already computes against a policy; today nothing edits one. Legacy F-014 (saving destroys tier inheritance for all 40 codes) is the trap to avoid | P6-T1 | **H** |
| **P6-T4** | **Build the `integrity` pane** (zero coverage today): orphan and reconciliation checks, with the check that found each row named | P6-T1 | **H** |

#### 6b — Users, roles and permissions ⛔ *gated on P0-T2*

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P6-T5** | **Full operator lifecycle.** Invite, resend, revoke, suspend, reinstate, **offboard** — with the F-016 guard, which is a real invariant: the last holder of `manage_team` cannot be stripped or removed. Every transition writes an audit entry | P0-T2, P6-T1 | — |
| **P6-T6** | **Editable role matrix.** Custom roles, per-permission grant, and an **effective-permission preview** — *"what can this person actually do"* — computed from the same `forbiddenReason` the router uses, so the preview cannot drift from enforcement | P0-T2, P6-T5 | — |
| **P6-T7** | **Per-user override** on top of a role, always additive-or-subtractive against a named role and never a free-floating permission set | P6-T6 | — |
| **P6-T8** | **Sessions and devices, admin-side.** List and revoke another operator's sessions. `session.devices` and `revokeDevice` already exist in `clients/auth.ts` and are unused by any admin surface | P6-T5 | **H** |
| **P6-T9** | **Turn on the 35 route permissions.** A data change in `routeTable.ts`; `forbiddenReason` and the whole guard are already wired and exercised on every navigation | P0-T2 | — |

#### 6c — Internal system settings ⛔ *scope question P0-T5*

| Task | Work |
|---|---|
| **P6-T10** | API keys and webhooks — issue, scope, rotate, revoke, with a delivery log |
| **P6-T11** | Feature flags, per environment and per role |

#### The impersonation rule, recorded before anyone builds it

Legacy F-002 and F-003 are *"`commitUserSwitch()` is a total RBAC bypass with no
indicator and no way back"* and *"`impersonate()` is not permission-gated and its
audit promise is inverted"*. If impersonation is wanted, it ships permission-gated,
time-boxed, with a persistent banner and an audit entry on entry **and** exit. If it
is not asked for, it is not built.

---

### Phase 7 — One report builder

**Keep `ReportBuilder`'s spine and absorb `ReportStudio`'s modes into it.** The spine
is the half that is governed — semantic layer, plan legality, URL-as-storage, `Run`
discipline, save to library, feed an alert. The modes are the half that is useful.
Neither survives alone.

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P7-T1** | Add `mode` to the report query — `trend · funnel · table · cohort · journey` — as a first-class field that serialises through `serialiseReportQuery`, so **every mode is shareable, bookmarkable and alertable** the way only trend is today | — | — |
| **P7-T2** | Extend `data/reporting/plan.ts` so legality is per mode: a funnel needs ordered steps, a cohort needs an anchor event and a window, a journey needs a root. Illegal combinations disable in place with the reason, exactly as `LegalityOptions` already does | P7-T1 | — |
| **P7-T3** | Port the five renderers onto the shared result surfaces. `data/reporting/cohorts.ts` and `distribution.ts` already exist and are tested — the maths does not move, only the chrome | P7-T2 | **I** per mode |
| **P7-T4** | Retire `ReportStudio.tsx` — and with it 24 palette classes, 20 hex values and two direct fixture imports. **Delete the `isDirectSerializedQuery` fallback at `ReportBuilder.tsx:326` in the same commit**: it is the only thing routing operators to the Studio, and until every mode has landed on the merged builder, removing the file without it breaks `/management/reports/*` | P7-T3 | — |
| **P7-T5** | **Build the Dashboards view** — declared in the route table, client and `DashboardTile` already built, screen dropped it. Pinning a saved report to a dashboard is what makes the merged builder worth using twice. Also closes Remediation failing test #5 | P7-T1 | **I** |
| **P7-T6** | Scheduled delivery — a saved report emailed on a cadence. Reuses P6-T2's sender identity and templates | P7-T5, P6-T2 | — |

**The one thing the merge must not lose:** `ReportStudio`'s five modes are its whole
value, and `ReportBuilder`'s URL-as-storage is its whole value. A merge that keeps the
modes but drops `serialiseReportQuery` recreates a builder whose output nobody can
send to anyone — which is AC-853/854/855 and the reason those criteria exist.

---

### Phase 8 — Reach and freshness

| Task | Work | Depends on | ∥ |
|---|---|---|---|
| **P8-T1** | Open the 360° profile from **every** cell that names an entity — captain, rider, trip, subscription, corporate account, ticket. Twelve screens; `cells.tsx` has the pattern already | — | **E** per screen |
| **P8-T2** | Revalidate nav counts on route change plus a slow background poll | P1-T3 | **E** |
| **P8-T3** | Give the dispatch monitor a tick, over P5-T2's subscription seam once it exists | P5-T2 | **E** |
| **P8-T4** | `g`-prefix jump, `j`/`k` row movement, `.` for the focused row's actions. Every binding resolves through the command registry, so the shortcut list is derived rather than maintained | P2-T1 | **E** |

---

### Phase 9 — Speed

| Task | Work | Depends on |
|---|---|---|
| **P9-T1** | Route-level code splitting — `React.lazy` per workspace, auth in its own entry. The router already reads the route table, so the split is data-driven | — |
| **P9-T2** | Move `recharts`, `@tanstack/react-table` and `cmdk` into async chunks. Measure against the 2.19 MB baseline and record the number | P9-T1 |
| **P9-T3** | Prefetch the sub-tab under the cursor on hover | P1-T3, P9-T1 |

---

## 2. What can run at the same time

Nine lanes. Letters match the **∥** column.

| Lane | Tasks | Why it is safe |
|---|---|---|
| **A — state** | P1-T1 · P1-T3 · P1-T4 | Three separate files: `useIndexTable`, `useAsync`, `persistence` |
| **B — registries** | P2-T2 … P2-T7, then **B′** P2-T9 per screen | Six domain files after P2-T1, then one screen each |
| **C — search** | P3-T1 · P3-T2 · P3-T3 | Pure data layer. Starts day one, before Phase 2 |
| **D — bulk** | P4-T1 × 10 screens | One screen each, no shared files |
| **E — reach** | P8-T1 × 12 · P8-T2 · P8-T3 · P8-T4 | Independent |
| **F — chat foundation** | P5-T1 · P5-T2 | Types and transport, different files |
| **G — chat console** | P5-T5 · P5-T6 · P5-T9 | Independent after P5-T3 |
| **H — admin panes** | P6-T2 · P6-T3 · P6-T4 · P6-T8 | Four separate panes, four separate files |
| **I — report modes** | P7-T3 × 5 modes · P7-T5 | One renderer each after the plan layer lands |

**Cross-phase parallelism that is safe:** lane **C** runs against Phases 1 and 2 at
once — different directories. Lane **F** is independent of everything before it and
can start immediately if chat is a priority. Phase 9 is independent throughout.

**The real serialisations, each needing one owner:**
- **3b** — P3-T5 → T6 → T7 → T8. Each palette state depends on the one below it.
- **6b** — P6-T5 → T6 → T7. A permission model cannot be built out of order.
- **7** — P7-T1 → T2 → T3 → T4. The query field must exist before legality, which must
  exist before the renderers, which must all land before the old file is deleted.

---

## 3. Collisions with the remediation plan

Both plans touch the same screens. Sequence deliberately or the merges will fight.

| Collision | Resolution |
|---|---|
| Remediation Wave 4 (four states) and **P1-T1** both edit every index screen | **P1-T1 first.** It changes one hook; Wave 4 then lands on the final signature |
| Remediation Wave 5 (copy extraction) and **P2-T9** both rewrite action declarations | **P2-T9 first.** Moving a label into a command registry *is* the copy extraction for that label — CM-2 requires exactly one home for it |
| Remediation Wave 2 (seam wiring) and **P4-T1** both touch Dispatch, Trips, Subscriptions | Wave 2 first. A bulk bar over fixture data is not worth building twice |
| Remediation Waves 2–4 for `admin/` and **P6-T1** | **They are the same work.** Do it once, in the remediation waves, and treat P6-T1 as satisfied |
| Remediation §3.1 Dashboards view and **P7-T5** | Same task. Do it in Phase 7, where the merged builder gives it something worth pinning |
| Remediation Wave 6 Arabic and **P3-T1**'s Arabic normaliser | Independent. Write the normaliser now; it is dictionary-free |

---

## 4. Suggested order

1. **Week 1** — Phase 0 to the owner. Start lanes **A**, **C** and **F**, plus P2-T1.
   Remediation Waves 1–2 run alongside on different files.
2. **Week 2** — Lane **B** fans out. Finish lane **A**. Chat model and transport land.
3. **Week 3** — **B′** per screen, the 3b chain starts under one owner, lane **E**
   picked up, Phase 7 begins with P7-T1.
4. **Week 4** — Lane **D**, lane **G**, lane **I**. P3-T8 if Q1 has landed.
5. **Week 5+** — Phase 6b once the role model lands; Phase 9 whenever there is a spare
   engineer.

**If the plan is cut, cut from the bottom of each phase** — the spec's own rule. Four
tasks pay for themselves regardless of what else ships:

- **P1-T1** — the operator stops losing their place.
- **P2-T1** — one action stops being declared four different ways.
- **P5-T1/T2** — the conversation model and the subscription seam, because every later
  chat decision is cheap once the schema is channel-agnostic and expensive after.
- **P7-T1** — `mode` in the query, because it is what makes one builder possible
  instead of two.
