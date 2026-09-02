# 11 — The 360° profile, and the shell defects around it

Build note, frontend-engineer. Covers the twelve profile section renderers, the
full page's right rail, and seven defects in `src/shell/**` that were all the
same shape: **a surface that rendered, and lied about what it had done.**

---

## 1. The defect this closes

`ProfileSectionKey` has twelve members. **None of them had a renderer.**

`ProfileLayer` declared `sectionRenderers?: Partial<Record<ProfileSectionKey, …>>`
defaulting to `{}`, and `AppLayout` never passed it. `EntityPageScreen` had no
such prop and hardcoded the same fallback. Every section therefore fell to the
`??` branch and rendered `t('state.cardError.message')` —

> **Couldn't load identity. The filters are unchanged.**

`SECTIONS` in `clients/profile.ts` gives a captain nine sections and a rider
eight, so **a healthy profile showed eight or nine cards each claiming to have
failed**, on a load where nothing had failed and no filter existed. An operator
could not distinguish that from an outage. Loading, error and empty were all
correctly implemented; content was simply not built.

It also masked a second defect: `resolveLocally` was reading the **seed** fixture
arrays while every other client serves the `all*` arrays, so most rows 404'd on
click. That is fixed separately (mock-data-engineer) and could not have been
seen from here, because a 404 and a success rendered the same nine sentences.

---

## 2. The twelve renderers

`src/components/profile/sections.tsx`. Each is a component (a section that
fetches uses hooks), each carries its own four states through `SectionStates`,
and each decides its own query from `entity.entityType`.

| # | Section | What it shows | Client operation |
|---|---|---|---|
| 1 | `identity` | the record's own identifying facts, per kind — phone, status badge, tier, vehicle, plan, subject, counterparties | the shared record read (§3) |
| 2 | `trips` | six most recent trips, newest first: route, id, when, status, fare. For a **trip**, the journey itself — pickup, destination, distance, duration, rating given, lateness | `listTrips({riderId\|driverId\|subscriptionId})` |
| 3 | `subscriptions` | plan, cycle dates, legs used, status. For a **subscription**, the cycle detail; for a **corporate account**, its employees' plans (`riderId in […]`, waiting on the record) | `listSubscriptions` |
| 4 | `compliance` | worst document state + every document with its expiry. For an **applicant**, the docs on the application | `getDriverCompliance` · the applicant record |
| 5 | `commitment` | counting strikes, total forfeited, and six absences with tier and disposition | `listAbsences({driverId})` |
| 6 | `wallet` | §6.2's money card — closing balance, pending on its own line, **six postings newest-first with the balance column omitted**, truncation stated | `getWalletLedger` (rider) · `getCaptainPayableLedger` (captain) |
| 7 | `payments` | six payments, newest first: kind, settlement, amount. For a **corporate account**, billing — type, spend, invoice day, next invoice | `listPaymentsForEntity` · the corporate record |
| 8 | `tickets` | six tickets naming this record. For a **ticket**, its message thread. For a **complaint**, the ticket it was raised from | `listTickets` |
| 9 | `disputes` | money claims: kind, status, amount. Related by `tripId`, by the complaint's `disputeId`, or by the ticket's subject | `listDisputes` |
| 10 | `fairness` | every fairness case naming this captain — appeal, rating dispute, rider report | `listFairnessCases({driverId})` |
| 11 | `movement` | `movementLog`, newest first — what happened to this record and where | the shared record read |
| 12 | `devices` | the customer's device, app language, last IP and IP location — two of which are the fraud signals `riderShape` exposes as filters | the shared record read |

### Client operations adopted (each had **zero** callers)

`getWalletLedger` · `getCaptainPayableLedger` · `getDriverCompliance` ·
`listAbsences` · `listPaymentsForEntity` · `listDisputes` ·
`markNotificationRead` · `switchMockUser` · `requestPasswordReset` ·
`getTeamUser` · `getOnCallRota` · `getSecurityPolicy`.

`listPaymentsForEntity`'s own header says *"a profile section is a history"* —
that is the section it was written for, and it is now the section that calls it.

### Operations wanted that do not exist

| Signature | Why | Owner |
|---|---|---|
| `getNewRider(id: string): Promise<NewRider>` | `record.ts` reads the single row as `listNewRiders({ filters: [{ id eq }], pageSize: 1 })`. A list endpoint answering a record question. | mock-data-engineer |
| `changePassword({ currentPassword, newPassword })` | `AccountLayer`'s password section commits `requestPasswordReset` instead — a real route, but §6.4 designed an in-place form and the form has no commit. | mock-data-engineer |
| `reEnrolSecondFactor(): Promise<TotpEnrolment \| SignInOutcome>` for a **signed-in** operator | `enrollSecondFactor` and `beginTotpEnrolment` both take an `enrolmentToken` that §4.4 issues during *sign-in*. There is no signed-in re-enrolment path, so the control is refused in place with the reason (§11.2). | mock-data-engineer |
| `getCaptainPayableLedger(id, period?)` defaulting to **all time** | `getWalletLedger` defaults to the whole of time and says why: *"a wallet ledger opened from an identity link should show the wallet, not the current month"*. The captain equivalent defaults to `FINANCIALS_PERIOD`, so a captain paid last month reads as empty. | mock-data-engineer |

### One `null` that is a value, not a gap

`SETTLEMENT_BADGE_TONE` returns `null` for `failed` and `escalated`, and §7.2
means it: R5a spends red on four things and a returned payment is not one of
them, and there is no fifth tone. The profile renders those two as **plain
text**, not as a badge, in both the card and the rail. Minting a tone locally
would have quietly reversed a decision the data layer's own test asserts.

---

## 3. How the two presentations are kept from drifting

**Neither presentation indexes the registry.** Both render one component.

```
components/profile/sections.tsx     PROFILE_SECTION_RENDERERS — Record<ProfileSectionKey, …>
components/profile/ProfileSections  the ONLY consumer of it
  ├── shell/layers/ProfileLayer     the drawer, ?entity=
  └── screens/EntityPageScreen      the full page, /entity/:entityId
```

- **`sectionRenderers` is deleted, not re-plumbed.** Re-adding it as a *required*
  prop would move the same drift one level up: `AppLayout` would hand the drawer
  a registry, and `EntityPageScreen` — which has no `AppLayout` above it — would
  still need its own. That is the current bug with a longer wire.
- The registry is `Record<ProfileSectionKey, …>`, **not `Partial<>`**. A
  thirteenth section key without a renderer is a compile error. A runtime test
  asserts the same thing, because widening the type to `Partial<>` is exactly
  what someone would do to make an addition build.
- §6.2's *"contributed by workspaces as a declared contract"* is intact and is
  where it always was: the contract is `ProfileRef.sections`, **data**, from
  `clients/profile.ts`. A workspace adds a section by adding a renderer to the
  registry, not by editing either presentation.
- The record behind the ref is read **once** per presentation
  (`useProfileRecord`) and shared by `identity`, `movement`, `devices` and the
  whole rail — one request instead of five, and a failed record read fails only
  those cards.

**Entity kinds differ by data.** `ProfileSections` maps over `entity.sections`
and has no list, no count and no `entityType` branch. A captain gets nine and a
rider eight because `SECTIONS` says so.

---

## 4. What went in the rail, and why

`EntityPageScreen` shipped `rail={[]}`, so §7.2's *"main plus right rail"*
collapsed to a single column and the full-page escape was a wider drawer with a
back arrow.

§7.2 does not leave this open: *"the rail holds **only** status, publishing,
summary and metadata"*. A profile is a read of a record, not a resource with a
draft, so there is nothing to publish and the rail is the other three:

| Card | Contents |
|---|---|
| **Status** | the standing badge **and every flag that produces it** — suspension reason, decline flag, manual flag, multi-sub exception, open complaints, plan access, churn risk, SLA breach, invoice overdue, unclaimed. In words (§7.5), never colour alone. |
| **Summary** | the figures an operator opens a profile to check — trips, lifetime value, wallet balance, renewal rate, month earnings, on-time, subscription slots, fare split, escrow, spend. **Every one a server field** (§8.2). |
| **Metadata** | identity code first (it is the same field on all eleven kinds), record type, then the facts that do not change — phone, email, city, joined, vehicle, national id, gateway, invoice. |

All three are built from the **same record read** the identity section uses, so
the page **omits the identity card from the main column** (`RAIL_SECTIONS`)
rather than printing the same facts twice on one screen. That is the one
deliberate difference between the drawer and the page, it is named in one
constant, and a test asserts the two section lists differ by exactly it.

The three pre-content states (loading, `no-match`, error) render with an empty
rail deliberately: a rail of three skeletons beside *"No record found for X"*
would claim something was still arriving when the id does not resolve.

---

## 5. `resolveProfiles` — the batch resolve

`clients/profile.ts`, requested for P8-T1, which had two call sites each
resolving one id at a time (~40 sequential calls on a full index page).

```ts
resolveProfiles(ids: readonly string[], signal?): Promise<Record<string, ProfileRef | null>>
```

Three properties, stated in the source because the callers depend on them:

1. **`null` means resolved-and-absent, never "the request failed."** Callers cache
   a 404 permanently and deliberately do not cache a transport failure.
2. **There is no partial failure.** The whole call succeeds or throws, like
   `resolveProfile`. A `{ ok, value }` envelope was considered and rejected: it
   would make every caller handle a third outcome the mock cannot produce. If a
   server ever needs partial failure it needs a **different return type and a
   different name** — widening `ProfileRef | null` in place is the change that
   would look compatible and would not be.
3. **A non-entity id costs nothing and throws nothing.** It is a lookup, not a
   validator; an exception on one bad key would take down the other thirty-nine.

`PAY-` is ambiguous — `payablePrefix()` mints ledger posting ids as
`PAY-<captain number>` — and nothing here relaxes the match to make a posting
resolve. Keys are the ids **as given**, so a caller finds back what it passed.

---

## 6. The shell defects

| # | Defect | Fix |
|---|---|---|
| 1 | `AccountLayer` rendered **2 of 5** sections; `password` and `twoFactor` showed the permanent *"Couldn't load…"* placeholder | both built |
| 2 | `profile` showed `session.name` only — email, role, avatar and permission detail dropped | avatar, name, email, role, permission count, last sign-in |
| 3 | `permissions` printed raw `PermissionKey` strings, held ones only | **all of them**, held or not, with `Granted` / `Not granted` in words. A list of the held ones answers *"what can I do"* and not *"why can I not do this"*, and the second is the question that brings an operator to that card |
| 4 | the footer's `Save` was `<Button variant="default" disabled>` with **no reason** — §11.2 in its plainest form | driven by the section's own `{ label, commit, blockedReason }`. `password` commits `requestPasswordReset` for real; `twoFactor` is refused **in place with the reason as text**, referenced by `aria-describedby`, never a tooltip |
| 5 | `GlobalSearch` had **no error state** — a failed read fell to `all.length === 0` and said *"No matches for X"* | separate branches. `isEmpty` is now explicit on the `useAsync`, so `empty` and `error` are two statuses instead of one length check that swallowed both. The failure carries a retry and `role="alert"` |
| 6 | the escape hatch navigated to `/operations/overview?q=…` — a **metric board**, which reads no `q` | `/operations/people?q=…`, an index route, which reads it through `useIndexTable` → `useUrlTableState` |
| 7 | opening a notification never marked it read, so **the badge never decremented** | `markNotificationRead` on open, at the one handler both the bell and the layer route through. Navigation does not wait for the write; the summary refreshes either way, so a failed write leaves a count that is high — the safe direction |
| 8 | `Switch user` called `navigate('/admin/team')` | a submenu of the seeded operators; choosing one calls `switchMockUser`, re-reads the session and lands on the new role's workspace. **Mock-only by contract**, so under `http` the item is disabled in place with the reason on a second line (§11.2) |
| 9 | `onCallName={null}` hardcoded | `getOnCallRota()` → `getTeamUser(primaryUserId)`. `null` still renders `On call: unassigned`, which covers all three of "nobody rostered", "not yet read" and "read failed" |
| 10 | the idle window came from a module constant, so the Team screen's setting saved and nothing read it | `getSecurityPolicy().idleTimeoutMinutes`, seeded to the same 30. `useSessionLifecycle` now **returns** the resolved value, so `session-ended-idle` quotes the window that actually expired instead of telling an admin who set 60 that it had been 30 |
| 11 | `holdsPermission` threw on a row with no `permission` field, white-screening every route | `== null`, not `=== null`. An absent requirement and a `null` one are the same visibility answer. (Superseded in place by D17's migration; the guard's reasoning is recorded here because the failure mode was a white screen from one malformed data row) |

### `Actions` in global search — judgement, and why I did not build it

`search()` returns `searchEntities ∪ searchDestinations` and never mints a
`kind: 'action'` result, so the third group was unreachable markup. The command
registry at `src/commands` is the right source for it, **and every command in it
today is `scope: { kind: 'entity' }` with `arity: 'needs-target'` or
`'needs-input'`.** Running one from a search field needs the palette's
target-collection step (`design/05-command-centre.md` §3): a record has to be
resolved, and `captain.suspend` needs a reason collected through
`CommandHost.confirm`. That is the palette (C-2 / P3-T5…T8), which has its own
owner.

Offering a row that cannot run would be a §11.2 breach in a new place. So the
group is **removed** rather than left dead, and this is the note that says where
it goes.

---

## 7. Files

```
src/components/profile/
  copy.ts                one dictionary, both presentations
  domain.ts              tone + key per enum; the People maps are IMPORTED, not restated
  record.ts              useProfileRecord — one read, eleven kinds
  fields.tsx             FieldList · RowList · MiniLedger (§6.2's six rows) · FlagList
  SectionCard.tsx        the card, and the ONE place the four states are decided
  sections.tsx           the twelve renderers + PROFILE_SECTION_RENDERERS
  rail.tsx               profileRail() — status · summary · metadata
  ProfileSections.tsx    the stack; the only consumer of the registry
  index.ts
  profile.test.tsx       12 tests

src/shell/AppLayout.tsx           registry wiring, mark-read, switch-user, on-call
src/shell/AccountMenu.tsx         the switch-user submenu
src/shell/GlobalSearch.tsx        error state, escape hatch, dead group removed
src/shell/ShellContext.tsx        security policy → idle window
src/shell/TopBar.tsx              onSwitchUser takes an id
src/shell/session.ts              returns the resolved idleTimeoutMinutes
src/shell/permissions.ts          PERMISSION_KEYS, as a value
src/shell/layers/AccountLayer.tsx five sections, a real commit, a stated refusal
src/shell/layers/ProfileLayer.tsx renders ProfileSections
src/shell/qa.remediation.test.tsx 10 tests
src/screens/EntityPageScreen.tsx  ProfileSections + the rail
src/data/clients/profile.ts       resolveProfiles
src/i18n/dictionaries.ts          + PROFILE_EN, + account.*, + shell.search.*, + state.userSwitched.*
```

---

## 8. Open, and reported rather than solved

- **`DeviceList` renders its own `Card` and its own `Active sessions` heading.**
  `AccountLayer` used to wrap it in a second card with a second identical
  heading. It now renders it bare — but the component owning its own frame means
  the `sessions` section is the one that does not look like the other four. It
  is `src/components/auth`'s to decide, not mine.
- **The on-call chip does not revalidate** when an admin edits the rota on
  another route. That is P8-T2 (revalidate on route change plus a slow poll) and
  it applies to every shell read at once, not to this one specially.
- **`ProfileLayer`'s header still promises AC-60** (`view_profiles`) and the
  layer still enforces it at zero call sites. Untouched — it is a permission
  decision, not a rendering one, and D17 has just moved the model underneath it.
- **§6.2's *"inline status badges after the name on the same baseline"*** is not
  built: `ShellLayer` takes `title` and `subtitle` as strings. The status is in
  the identity card and in the rail's Status card instead. A `badge` slot on
  `ShellLayer` would close it.
